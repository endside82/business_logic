# F15-05. 신고 심사 PRD

## 1. 결론

신고 심사는 `WARNING_REVIEWER` 권한(OWNER 자동 통과)으로 `WarningAdminActionController`가 제공한다. `GET /reports`(`Page<WarningReportVo>`)로 검토함을 검색하고, `POST /reports/{reportId}/approve`(GRANT 부여), `/reject`(반려), `/request-more-info`(보완 요청)으로 처리한다. approve/reject는 컨트롤러가 **먼저 `claimForReview`(SUBMITTED→IN_REVIEW)를 호출한 뒤** 본 처리를 실행하는 2단계 구조다. 승인 시 `WarningReportService.approve`가 `WarningLedgerService.insertGrant`를 호출해 원장 GRANT를 만들고 report에 `resultingLedgerId`를 연결한다. 보완 요청은 `NEEDS_MORE_INFO` + `more_info_request_count++`로, 종결되지 않은 상태에서 반복 가능하다. Flutter `warning_report_inbox_screen.dart`/`warning_report_detail_screen.dart`가 이를 구현했다.

판정: **검색·승인·반려·보완 요청의 정합은 닫혀 있다**. Gap은 (a) approve/reject가 `claimForReview` + 본처리 2회 트랜잭션이라 그 사이 동시성/부분 실패 여지, (b) approve/reject에서 reason이 blank면 `WARNING_REPORT_NOT_FOUND`로 던져 "찾을 수 없음"이라는 오해를 줌, (c) `searchAdmin`이 cross-club 필터를 `WarningReportSearchParam`에 의존하는데 본 PRD에서 필터 컬럼 전수 미확인인 점이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningAdminActionController.java#searchReports/approveReport/rejectReport/requestMoreInfo` | `@RequiresClubPermission(WARNING_REVIEWER)`, claim 선행 |
| Backend Service | `WarningReportService.java#searchAdmin/claimForReview/approve/reject/requestMoreInfo/ensurePending/retrieveScoped` | 상태 전이, cross-club 격리, reason 필수, GRANT 연동 |
| Backend Service | `WarningLedgerService.java#insertGrant`, `WarningPenaltyTypeConfigService#resolvePoints` | 승인 시 점수 결정 + 원장 GRANT |
| Backend Param | `WarningReportProcessParam.java` | `pointsOverride?`, `reasonCode?`, `reason?` |
| Backend Enum | `WarningReportStatus.java` | 6값 |
| Backend Error | `ErrorCode.java` | `WARNING_REPORT_NOT_FOUND`, `WARNING_REPORT_ALREADY_PROCESSED` |
| Frontend API | `warning_admin_action_api.dart#searchReports/approveReport/rejectReport/requestMoreInfo` | Page 응답, body=process param |
| Frontend Screen | `admin/warning_report_inbox_screen.dart`, `warning_report_detail_screen.dart` | 검토함/상세/처리 |
| Frontend Provider | `domain/providers/warning/warning_admin_providers.dart` | 검토 큐/처리 |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

1. WARNING_REVIEWER가 `reports`(`Routes.adminWarningReports`) → `WarningReportInboxScreen(clubId)` → `GET /reports`(`WarningReportSearchParam`) → `Page<WarningReportVo>`.
2. 항목 선택 → `:id`(`Routes.adminWarningReportDetail`) → `WarningReportDetailScreen` → 처리 액션(승인/반려/보완).
3. **승인**: `POST /reports/{reportId}/approve`(`WarningReportProcessParam`) → 컨트롤러가 `claimForReview`(SUBMITTED→IN_REVIEW)로 검토 착수 표시 후 `approve` 호출.
4. `approve`: `retrieveScoped`(클럽 일치) + `ensurePending` + reason 필수 → `resolvePoints`(pointsOverride 우선) → `insertGrant(sourceType="REPORT", sourceId=reportId, reportId=...)` → report `status=APPROVED`, `processedBy/At`, `processReason`, `resultingLedgerId` 설정 → audit `REPORT_APPROVED` + outbox `WarningReportApproved`.
5. **반려**: `POST /reports/{reportId}/reject` → claim 후 `reject` → `status=REJECTED` + audit/outbox `WarningReportRejected`(원장 변화 없음).
6. **보완 요청**: `POST /reports/{reportId}/request-more-info` → `requestMoreInfo`(claim 없음) → 종결 상태 아니면 `status=NEEDS_MORE_INFO`, `more_info_request_count++`, audit `REPORT_MORE_INFO`.

## 4. 서버 계약

### `GET /api/v1/admin/clubs/{clubId}/warnings/reports`
| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningAdminActionController#searchReports` |
| 권한 | `WARNING_REVIEWER` |
| Query | `WarningReportSearchParam`(`@ModelAttribute`) extends PagingParam |
| 응답 | `Page<WarningReportVo>` |

### `POST .../reports/{reportId}/approve`
| 항목 | 실제 계약 |
|---|---|
| 선행 | 컨트롤러가 `claimForReview(clubId, reportId, userId)` 호출 (SUBMITTED→IN_REVIEW) |
| 처리 | `approve(clubId, reportId, userId, role, param)` |
| 검증 | `retrieveScoped`(클럽 일치 아니면 NOT_FOUND), `ensurePending`(APPROVED/REJECTED/WITHDRAWN이면 ALREADY_PROCESSED), reason blank면 `WARNING_REPORT_NOT_FOUND` |
| 부수 | `insertGrant` → 원장 GRANT, report `resultingLedgerId` 연결, outbox `WarningReportApproved` |
| 응답 | `WarningReportVo` |

### `POST .../reports/{reportId}/reject`
| 항목 | 실제 계약 |
|---|---|
| 선행 | `claimForReview` |
| 검증 | `ensurePending`, reason blank면 `WARNING_REPORT_NOT_FOUND` |
| 부수 | `status=REJECTED`, outbox `WarningReportRejected`(원장 변화 없음) |

### `POST .../reports/{reportId}/request-more-info`
| 항목 | 실제 계약 |
|---|---|
| 선행 | 없음(claim 미호출) |
| 검증 | 종결(APPROVED/REJECTED/WITHDRAWN)이면 `WARNING_REPORT_ALREADY_PROCESSED`, reason blank면 `WARNING_REPORT_NOT_FOUND` |
| 부수 | `status=NEEDS_MORE_INFO`, `more_info_request_count++` |

`WarningReportProcessParam`: `pointsOverride:Integer?`, `reasonCode:String?@Size(40)`, `reason:String?@Size(4000)`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `reports`(`Routes.adminWarningReports`), `:id`(`Routes.adminWarningReportDetail`) |
| Screen | `WarningReportInboxScreen`, `WarningReportDetailScreen` |
| Repository | `WarningAdminActionRepository` |
| Retrofit | `WarningAdminActionApi.searchReports/approveReport/rejectReport/requestMoreInfo` |
| 응답 형태 | `searchReports` → `PageResponse<WarningReportVo>`, 처리 → `WarningReportVo` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| WARNING_REVIEWER | 클래스 권한 | 검토함 진입 | 심사 가능 | 일치 |
| 권한 없는 멤버 | 403 | 차단 | 접근 불가 | 일치 |
| SUBMITTED 승인 | claim→approve | 승인 액션 | APPROVED + 원장 GRANT | 일치 |
| 이미 APPROVED 재처리 | `ALREADY_PROCESSED` | 에러 | 차단 | 일치 |
| reason 없이 승인/반려 | `WARNING_REPORT_NOT_FOUND` | 에러 | 차단(원인 모호) | Risk(아래) |
| NEEDS_MORE_INFO 재보완 | 종결 아니면 허용 | 재요청 | count++ | 일치 |
| 다른 클럽 reportId | `retrieveScoped` → NOT_FOUND | 차단 | cross-club 격리 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 검토함 응답 형태 | `Page<WarningReportVo>` | `PageResponse<WarningReportVo>` | 일치 |
| 처리 응답 형태 | `WarningReportVo` | VO | 일치 |
| `WarningReportStatus` | 6값 | enum 동일 | 일치 |
| approve 원장 연동 | `insertGrant` → resultingLedgerId | VO `resultingLedgerId` | 일치 |
| claim 선행 | 컨트롤러가 명시 호출 | Flutter는 approve/reject만 호출(claim은 서버 내부) | 일치(클라이언트 의존 없음) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | approve/reject가 claim+본처리 2 트랜잭션 | 컨트롤러가 `claimForReview` 후 `approve`/`reject` 별도 호출 | 두 호출 사이 동시 처리/부분 실패 시 IN_REVIEW로 멈춘 잔여 상태 가능 | 단일 트랜잭션으로 합치거나 claim 멱등성 보장 검토 |
| P2 | reason blank가 `WARNING_REPORT_NOT_FOUND`로 매핑 | `approve`/`reject`가 reason 없으면 NOT_FOUND throw | 운영진이 "신고 없음"으로 오해 | `WARNING_REASON_REQUIRED` 코드로 통일 |
| P3 | 검토함 필터 컬럼 미확정 | 본 PRD에서 `WarningReportSearchParam` 전수 미확인 | 상태/대상/기간 필터 정합 미검증 | param/QueryRepository 대조 보강 |

## 9. 수용 기준

### AC-01. 제보 승인 → 원장 GRANT
Given WARNING_REVIEWER가 SUBMITTED 제보를 승인한다(reason 포함).
When `POST .../reports/{reportId}/approve`가 호출된다.
Then report는 `APPROVED`+`resultingLedgerId`가 채워지고, 원장에 GRANT row가 생성되며 outbox `WarningReportApproved`가 발행된다.

### AC-02. 제보 반려
Given WARNING_REVIEWER가 제보를 반려한다(reason 포함).
When `POST .../reports/{reportId}/reject`가 호출된다.
Then report는 `REJECTED`가 되고 원장 변화 없이 outbox `WarningReportRejected`가 발행된다.

### AC-03. 보완 요청 반복
Given 제보가 SUBMITTED 또는 NEEDS_MORE_INFO이다.
When `POST .../reports/{reportId}/request-more-info`가 호출된다.
Then `status=NEEDS_MORE_INFO`, `more_info_request_count`가 1 증가한다.

### AC-04. 종결 제보 재처리 차단
Given 제보가 이미 APPROVED이다.
When 승인/반려를 다시 시도한다.
Then 서버는 `WARNING_REPORT_ALREADY_PROCESSED`로 거절한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | claim+처리 트랜잭션 | 2단계를 단일 트랜잭션화 또는 claim 멱등 보강 |
| UX | 에러 매핑 | reason 누락을 `WARNING_REASON_REQUIRED`로 통일 |
| 테스트 | 심사 흐름 | 승인 원장 연동/반려/보완 반복/종결 재처리/cross-club E2E |
