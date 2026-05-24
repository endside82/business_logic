# F15-02. 신고 제출 & 내 신고 관리 PRD

## 1. 결론

경고 제보는 **멤버 제보**(`POST /api/v1/clubs/{clubId}/warnings/reports`)와 **이벤트 호스트 출결 연계 제보**(`POST /api/v1/clubs/{clubId}/events/{eventId}/warning-reports`) 두 경로로 들어온다. 두 경로 모두 `WarningReportService.submit`을 호출하지만 호스트 경로는 `requireAttendanceLinkableActive`로 `attendance_linkable=true` 패널티 유형만 허용하고 `eventId`를 강제한다. 제출은 정책 활성(`requireActive`), 익명 허용 여부, 자가 제보 차단, 5분 중복 차단, 익명 남용 차단을 통과해야 하며 `SUBMITTED` 상태로 저장된다. 본인 제보 목록은 `List<WarningReportVo>`(Page 아님)로 내려오고, 미처리 제보는 철회(`WITHDRAWN`)할 수 있다. Flutter는 `report_submit_screen.dart`/`host_report_submit_screen.dart`/`my_reports_screen.dart`로 이를 구현했고 응답 VO 필드가 일치한다.

판정: **제출/조회/철회의 화면-API 정합은 닫혀 있다**. 그러나 (a) 익명 제보는 `reporter_user_id=NULL`로 저장되는데 누적 반려율 남용 차단이 실명 기준 `findByReporterUserId`를 쓰므로 익명 row를 못 잡는 구조적 결함, (b) 자가 제보·중복 차단·승인 reason 누락이 모두 `WARNING_REPORT_NOT_FOUND`/`ALREADY_PROCESSED`로 매핑되어 사용자가 원인을 분간하기 어려운 점, (c) 호스트 제보 목록이 서버에서 전체 본인 제보를 가져와 메모리 필터하는 점이 Gap/Risk다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningMemberController.java#submitReport/getMyReports/withdrawReport` | 멤버 제보 3엔드포인트 |
| Backend Controller | `WarningHostController.java#submitAttendanceReport/getMyAttendanceReports` | 호스트 경로 base `/clubs/{clubId}/events/{eventId}/warning-reports`, `isEventHost`, `requireAttendanceLinkableActive` |
| Backend Service | `WarningReportService.java#submit/getMyReports/withdraw/isAnonymousBlocked` | 정책 활성·익명·자가·중복·남용 차단, SUBMITTED 저장, outbox `WarningReportSubmitted` |
| Backend Param | `WarningReportAddParam.java` | `targetMemberId`(필수), `penaltyTypeCode`(필수 ≤40), `eventId?`, `attachmentIds?`, `description?(≤4000)`, `anonymous` |
| Backend VO | `WarningReportVo.java` | 응답 필드, 익명 마스킹 주석 |
| Backend Enum | `WarningReportStatus.java` | SUBMITTED/IN_REVIEW/NEEDS_MORE_INFO/APPROVED/REJECTED/WITHDRAWN |
| Backend Error | `ErrorCode.java` | `WARNING_NOT_ACTIVATED`, `WARNING_REPORT_ANONYMOUS_LIMIT`, `WARNING_REPORT_ALREADY_PROCESSED`, `WARNING_REPORT_NOT_FOUND`, `PENALTY_TYPE_NOT_FOUND/INACTIVE`, `CLUB_PERMISSION_DENIED` |
| Backend DDL | `V1__init.sql` `warning_report` | `reporter_user_id`/`anonymous_reporter_id`/`is_anonymous`, 인덱스, FK |
| Frontend API | `warning_member_api.dart`, `warning_host_api.dart` | 경로/메서드/List 반환 |
| Frontend Screen | `report_submit_screen.dart`, `host_report_submit_screen.dart`, `my_reports_screen.dart` | 제출/목록/철회 |
| Frontend Provider | `warning_member_providers.dart#warningMyReports` | List 구독 |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

### 멤버 제보
1. 멤버가 `reports/submit`(`Routes.clubWarningReportSubmit`) → `ReportSubmitScreen` 진입, 대상 멤버·패널티 유형·사유·익명 여부 입력.
2. `WarningMemberApi.submitReport` → `POST /warnings/reports`(`WarningReportAddParam`).
3. 서버 `submit`: `warningProgramConfigService.requireActive(clubId)` → 익명이면 `allowAnonymousReport` 검사 → 자가 제보(`reporterUserId == targetMemberId`) 차단 → `resolvePoints`로 패널티 유형 검증 → 실명이면 5분 중복 차단, 익명이면 24h/반려율 남용 차단.
4. 통과 시 익명이면 `reporter_user_id=NULL, anonymous_reporter_id=실제ID`, 아니면 반대로 저장하고 `status=SUBMITTED`.
5. audit log(익명은 actorId=0, role=SYSTEM) + outbox `WarningReportSubmitted` 발행. `WarningReportVo`(201 CREATED) 반환.

### 호스트 출결 연계 제보
1. 호스트가 이벤트 컨텍스트에서 `warning-reports/submit`(`Routes.eventWarningReportSubmit`) → `HostReportSubmitScreen`.
2. `WarningHostApi.submitAttendanceReport` → `POST /api/v1/clubs/{clubId}/events/{eventId}/warning-reports`.
3. 서버 `submitAttendanceReport`: `isEventHost(eventId, userId)` 아니면 `CLUB_PERMISSION_DENIED` → `requireAttendanceLinkableActive(clubId, penaltyTypeCode)` → `param.setEventId(eventId)` → `WarningReportService.submit` 동일 흐름.

### 내 제보 목록/철회
4. `my-reports`(`Routes.clubWarningMyReports`) → `MyReportsScreen` → `warningMyReportsProvider(clubId)` → `GET /warnings/me/reports` → `List<WarningReportVo>`(실명 본인 제보만).
5. 철회: `POST /warnings/reports/{reportId}/withdraw` → 제보자 본인(또는 익명 reporter) + 미종결(SUBMITTED/IN_REVIEW/NEEDS_MORE_INFO)일 때만 `WITHDRAWN`.

## 4. 서버 계약

### `POST /api/v1/clubs/{clubId}/warnings/reports`
| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningMemberController#submitReport` |
| 권한 | `requireClubMember` |
| Body | `WarningReportAddParam` |
| 응답 | `WarningReportVo`, 201 CREATED |
| 검증 순서 | 정책 활성 → 익명 허용 → 자가 제보 → 패널티 유형 → 중복/남용 |
| 실패 | `WARNING_NOT_ACTIVATED`, `WARNING_REPORT_ANONYMOUS_LIMIT`, `WARNING_REPORT_NOT_FOUND`(자가 제보), `WARNING_REPORT_ALREADY_PROCESSED`(5분 중복), `PENALTY_TYPE_NOT_FOUND/INACTIVE` |

### `POST /api/v1/clubs/{clubId}/events/{eventId}/warning-reports`
| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningHostController#submitAttendanceReport` |
| 권한 | `isEventHost` 아니면 `CLUB_PERMISSION_DENIED` |
| 추가 검증 | `requireAttendanceLinkableActive` (catalog `is_available` + `attendance_linkable` + 클럽 override active) → 아니면 `PENALTY_TYPE_INACTIVE` |
| 부수 | `param.setEventId(eventId)` 강제 |

### `GET /api/v1/clubs/{clubId}/warnings/me/reports`
| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningMemberController#getMyReports` |
| 응답 | `List<WarningReportVo>` (**Page 아님**) — `findByClubIdAndReporterUserId` (실명만) |
| 주의 | 익명 제보(`reporter_user_id=NULL`)는 이 목록에 안 나옴 |

### `GET .../events/{eventId}/warning-reports`
| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningHostController#getMyAttendanceReports` |
| 구현 | `getMyReports(clubId, userId)` 전체를 가져와 `eventId` 일치만 메모리 필터 → `List<WarningReportVo>` |

### `POST /api/v1/clubs/{clubId}/warnings/reports/{reportId}/withdraw`
| 항목 | 실제 계약 |
|---|---|
| 조건 | 제보자 본인 또는 익명 reporter, 상태 ∈ {SUBMITTED, IN_REVIEW, NEEDS_MORE_INFO} |
| 실패 | 비제보자 → `WARNING_REPORT_NOT_FOUND`, 종결 → `WARNING_REPORT_ALREADY_PROCESSED` |

`WarningReportAddParam`: `targetMemberId@NotNull`, `penaltyTypeCode@NotBlank@Size(40)`, `eventId?`, `attachmentIds?`, `description?@Size(4000)`, `anonymous:boolean`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route(멤버) | `reports/submit`, `my-reports` |
| Route(호스트) | `warning-reports/submit` (이벤트 하위) |
| Screen | `ReportSubmitScreen`, `HostReportSubmitScreen`, `MyReportsScreen` |
| Provider | `warningMyReportsProvider(clubId)` (List) |
| Repository | `WarningMemberRepository.submitReport/getMyReports/withdrawReport`, `WarningHostRepository.submitAttendanceReport/getMyAttendanceReports` |
| Retrofit | `WarningMemberApi`, `WarningHostApi` (모두 List 반환) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 멤버 + 정책 활성 | `requireActive` 통과 | 제출 폼 | 제보 SUBMITTED | 일치 |
| 멤버 + 정책 비활성 | `WARNING_NOT_ACTIVATED` | 에러 토스트 | "경고 제도 미운영" | 일치 |
| 익명 제보 + 허용 OFF | `WARNING_REPORT_ANONYMOUS_LIMIT` | 에러 | 차단 | 일치 |
| 자가 제보 | `WARNING_REPORT_NOT_FOUND` | 에러 | 차단(원인 모호) | Risk(아래) |
| 5분 내 동일 제보(실명) | `WARNING_REPORT_ALREADY_PROCESSED` | 에러 | 중복 차단 | 일치 |
| 익명 24h 동일 대상 3건 | `WARNING_REPORT_ANONYMOUS_LIMIT` | 에러 | 남용 차단 | 일치(부분 동작) |
| 호스트 비-attendance 유형 | `PENALTY_TYPE_INACTIVE` | 에러 | 차단 | 일치 |
| 비호스트 출결 제보 | `CLUB_PERMISSION_DENIED` | 차단 | 권한 없음 | 일치 |
| 종결 제보 철회 | `WARNING_REPORT_ALREADY_PROCESSED` | 에러 | 차단 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 제보 응답 형태 | `WarningReportVo` | VO | 일치 |
| 내 제보 목록 형태 | `List<WarningReportVo>` | `List<WarningReportVo>` | 일치(Page 아님 — 혼동 주의) |
| `WarningReportStatus` | 6값 | `warning_enums.dart` 동일 | 일치 |
| 호스트 base 경로 | `/api/v1/clubs/{clubId}/events/{eventId}/warning-reports` | Flutter 동일 | 일치 |
| anonymous 필드 | Java `anonymous`(boolean) | Dart `anonymous` | 일치 |
| 익명 reporter 노출 | `reporter_user_id=NULL`, anonymousReporterId 비공개 | VO `reporterUserId` 마스킹 | 일치(설계 의도) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 익명 누적 반려율 남용 차단이 익명 row를 못 잡음 | `isAnonymousBlocked`가 `findByReporterUserId(reporterUserId)`로 평가하나 익명 제보는 `reporter_user_id=NULL` (코드 주석도 인정) | 익명 반복 악성 제보자가 반려율 임계로 차단되지 않음 | `anonymous_reporter_id` 기반 조회 메서드 추가 후 반려율 평가 정확화 |
| P2 | 자가 제보가 `WARNING_REPORT_NOT_FOUND`로 매핑 | `submit`에서 self-report 시 NOT_FOUND throw | 사용자가 "왜 막혔는지" 알 수 없음 | 전용 에러코드(예: SELF_REPORT) 또는 메시지 분리 |
| P2 | 5분 중복 차단 윈도우가 사유 변경을 무시 | clubId+reporter+target+penaltyTypeCode+eventId 키 (description 무관) | 정당한 추가 제보가 5분 내 막힐 수 있음 | 윈도우/키 정책 검토 |
| P3 | 호스트 제보 목록 메모리 필터 | `getMyAttendanceReports`가 전체 본인 제보 후 eventId 필터 | 제보 많은 클럽서 비효율 | event 범위 쿼리 메서드 추가 |
| P3 | 내 제보 목록이 List라 페이지네이션 없음 | 서버 `findByClubIdAndReporterUserId` 전체 반환 | 제보 누적 시 응답 비대 | 페이징 전환 검토 |

## 9. 수용 기준

### AC-01. 멤버 제보 제출 성공
Given 정책 활성 클럽 멤버가 타인을 실명 제보한다.
When `POST /warnings/reports`가 유효한 `targetMemberId`/`penaltyTypeCode`로 호출된다.
Then 서버는 `status=SUBMITTED` row를 만들고 outbox `WarningReportSubmitted`를 발행하며 201로 `WarningReportVo`를 반환한다.

### AC-02. 익명 허용 OFF에서 익명 제보
Given 클럽 정책이 `allowAnonymousReport=false`이다.
When 멤버가 `anonymous=true`로 제보한다.
Then 서버는 `WARNING_REPORT_ANONYMOUS_LIMIT`로 거절한다.

### AC-03. 호스트 출결 제보 유형 제한
Given 이벤트 호스트가 `attendance_linkable=false`인 패널티 유형으로 출결 제보한다.
When `POST .../events/{eventId}/warning-reports`가 호출된다.
Then 서버는 `PENALTY_TYPE_INACTIVE`로 거절한다.

### AC-04. 미처리 제보 철회
Given 제보자가 SUBMITTED 상태 본인 제보를 철회한다.
When `POST .../reports/{reportId}/withdraw`가 호출된다.
Then 상태가 `WITHDRAWN`이 되고, 이미 APPROVED/REJECTED면 `WARNING_REPORT_ALREADY_PROCESSED`로 거절한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 익명 남용 차단 정확화 | `anonymous_reporter_id` 기준 조회 추가 |
| UX/정책 | 차단 사유 식별성 | self-report/중복/남용 에러를 사용자가 분간하도록 코드/메시지 분리 |
| 구현 | 내 제보/호스트 제보 목록 | 페이징·event 범위 쿼리 도입 |
| 테스트 | 제출 분기 | 정책 비활성/익명/자가/중복/유형 거절 + 철회 종결 가드 E2E |
