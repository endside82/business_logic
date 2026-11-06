# F11-04. 신고 (이벤트/사용자/리뷰/클럽) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- updated: 2026-06-05; delta: 2026-06-04 dossier 04 §4-1 + 03 §4-D 반영 -->

> 문서 상태: **실사 기반 갱신본**. 2026-06-04 리뷰·클럽 신고 델타 실사([원문의 보관 위치](../../../../docs/development/DOCUMENTATION_GUIDE.md#2026-09-28-문서-정리))를 반영해 ReportType 전체 8값, Report 엔티티 신규 컬럼 3개, ReportParam/ReportVo 신규 필드, 증빙 첨부 및 자동 플래그 절을 추가했다. 코드 수정이나 QA 착수 전에는 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

부적절한 콘텐츠를 운영자에게 접수하는 신고 도메인. 한 개의 POST로 신고 레코드를 만들고(상태 PENDING으로 시작), 본인이 접수한 신고 이력을 조회하는 GET 하나로 구성된다. 자기-자신 신고(USER 타입 한정)와 동일 대상 중복 신고는 거부되며, `targetType`/`reason` 둘 다 enum 검증을 통과해야 한다. 운영자가 처리(`resolveReport`)하면 신고자에게 결과 알림이 푸시된다(서비스 메서드만 존재 — 컨트롤러에 사용자 입력 노출 없음).

2026-06-04 기준 서버 ReportType은 8종(USER/EVENT/REVIEW/EVENT_PHOTO/EVENT_MESSAGE/DATE_USER/CARPOOL/CLUB)이다. CLUB(7) 신고가 서버에서 지원되며 앱 배선도 완료됐다. v1에서 CLUB 대상 자동 제재는 없고 운영자 수동 집행만 동작한다. 자동 제재(계정 처리 등)는 USER 타입 전용으로 유지된다. 증빙 파일 첨부(최대 5개)와 자동 플래그(우선검토) 로직이 서비스 레이어에 추가됐다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 → 우상단 메뉴 "신고" → `context.push('/report', extra: {'targetType': 'EVENT', 'targetId': eventId})`
- 사용자 프로필 → "신고" 메뉴 → `targetType: 'USER'`
- 리뷰 카드(F11-02 이벤트별 모드)의 신고 아이콘 → `targetType: 'REVIEW', targetId: review.id`
- 클럽 상세 → "신고" 메뉴 → `targetType: 'CLUB', targetId: clubId` —(2026-06-04)에서 실배선 완료. 오너 본인 클럽은 메뉴 숨김.
- 카풀 오퍼 → `POST /api/v1/events/{eventId}/carpool/offers/{offerId}/report` — 전용 `CarpoolReportParam`(reason, description) 사용, `contextId=offerId`는 서버 자동 배선.

`ReportScreen`은 `targetType: String`, `targetId: int`, 선택적 `targetTitle`을 받는다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ReportController`, `Report`, `ReportParam`, `ReportVo`, `ReportType`, `ReportReason`, `ReportStatus`, `EvidenceFileValidator`, `ReportService`. 앱: `club_detail_screen.dart`, `report_screen.dart`, `routes.dart`, `evidence_image_picker.dart`.

<!-- source-references:start -->
서버 창구: `ReportController#createReport`, `ReportController#getMyReports`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 시: 별도 API 호출 없음. 입력 폼만 노출.
2. "신고" 탭 시: `reportNotifierProvider.notifier.submitReport(ReportParam(targetType, targetId, reason: enum.value, description))` (`presentation/review/screens/report_screen.dart:76-86`)
   → `ReviewRepository.createReport(ReportParam)`
   → `ReviewApi.createReport` (`POST /api/v1/reports`)
   → 성공: `Result.success(ReportVo)` → state = `AsyncData(reportVo)` → 알럿 + 닫기
   → 실패: `Result.failure(ApiError)` → `_handleError` 분기

> 본인 신고 이력 조회(`GET /api/v1/reports/my`)는 Repository에 `getMyReports()` 메서드로 구현되어 있으나 본 단위 화면에서 직접 호출하지 않음. 마이페이지/설정 화면 등에서 활용 가능.

## 4. 제품 규칙

- 신고 대상은 사용자, 이벤트, 후기, 클럽, 이벤트 메시지, 데이트 사용자 등이다. 자동 제재는 사용자 신고에만 있고 클럽 등 나머지는 운영자가 수동으로 처리한다.
- 카풀·버스 같은 이동수단 안전신고와 이벤트 사진 신고는 이 일반 신고로 받지 않고 각자 전용 신고 경로로만 받는다.
- 사유 7가지: 괴롭힘, 부적절한 콘텐츠, 노쇼, 사기, 기타, 지각, 나쁜 매너. 설명은 500자까지다. 「기타」를 고르면 설명이 필수이고 10자 이상이어야 제출할 수 있다(앱에서만 확인한다).
- 증빙 사진은 5장까지이며 본인이 올린 업로드 완료 파일이어야 한다. 업로드 중에는 제출할 수 없다.
- 자기 자신은 신고할 수 없다. 같은 대상은 한 번만 신고할 수 있다. 카풀은 운전 건(오퍼)마다 따로 신고할 수 있다.
- 접수된 신고는 처리 대기로 시작한다. 한 사람이 일주일에 5건 이상 접수하거나, 같은 대상을 한 달 안에 서로 다른 3명 이상이 신고하면 우선 검토 대상으로 올라간다. 건수만으로 자동 기각하지 않는다.
- 접수가 끝나면 「검토 후 적절한 조치를 취하겠습니다」 안내 창이 뜨고 화면이 닫힌다. 접수만으로는 신뢰점수에 영향이 없고, 운영자가 확정 또는 상위 이관한 신고만 패널티로 반영된다.
- 운영자가 처리하면 신고자에게 결과 알림이 간다.
- 호스트가 후기를 숨기면서 검토 요청을 켜면 후기 신고가 자동으로 만들어진다(F11-07).
- 오류의 사용자 뜻: 자기 신고, 대상이 올바르지 않음, 이미 신고한 대상(이 셋은 안내 후 화면 닫힘), 신고 대상 없음. 그 밖의 입력 오류는 화면에 남아 다시 시도한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 리뷰 신고 (Happy Path · `targetType=REVIEW`) | 로그인됨, F11-02 이벤트 리뷰 목록에서 카드를 발견. | `report` 1건 PENDING, 운영자 큐에 적재. |
| S2 | 본인 신고 시도 (`targetType=USER && targetId=내 userId`) | 진입 시 `targetType="USER"`, `targetId=loginUser.userId`. | INSERT 없음. |
| S3 | 동일 대상 중복 신고 | `report` 테이블에 `(reporterId, targetType, targetId)` 동일 행 존재. | INSERT 없음. |
| S4 | "기타" 사유 선택 + 짧은 설명 | 입력 단계. | 충분한 설명 입력 후 정상 흐름(S1)으로 진행. 그 전에는 제출 차단. |
| S5 | 클럽 신고 (서버 지원 v1) | `targetType="CLUB"`로 화면 진입. 클럽 상세에서 "신고" 진입 (오너 본인은 메뉴 숨김). | INSERT 1건 PENDING. 운영자 수동 처리. 자동 제재 없음. |
| S6 | 대상 없음 (이미 삭제된 리뷰 신고 시도) | 해당 리뷰가 다른 경로로 soft delete됨. | 일반적으로 INSERT 성공. (운영자 검토 시 무효 처리될 수 있음.) |
| S7 | 고빈도 신고자 | 신고자가 1주 내 5건 이상 신고 시도. | 자동 기각 없이 접수되고 `priority=true` 로 우선 검토 표시. |
| S8 | 우선검토 플래그 | 동일 피신고 대상에 1개월 내 3명 이상 별도 신고자가 누적됨. | `priority=true`. 운영자 큐에서 상단 노출. |
| S9 | 증빙 파일 소유권 불일치 | 다른 사용자가 업로드한 fileId를 evidenceFileIds에 포함. | `EVIDENCE_FILE_NOT_OWNED` (403, 1100007). |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| CLOSED | CLUB 신고 서버 미지원 | (2026-06-04) `ReportType.CLUB(7)` 서버 추가, 앱 실배선 완료 | 해소됨 — v1 운영자 수동 집행. 자동 제재 없음. | — |
| Gap | `ReportParam.contextId` 앱 미배선 | `report_param.dart`에 `contextId` 필드 없음. 서버 `ReportParam.contextId(Long?)` 존재. | CARPOOL 신고는 전용 `CarpoolReportParam`(carpool_report_param.dart)으로 처리하므로 report_screen 경로에서는 contextId 불필요. 단, 다른 신고 경로에서 contextId가 필요한 경우 Flutter 모델 추가 필요. | 현재는 영향 없음. carpool_report_screen이 별도 전용 경로를 타므로 누락 없음. |
| Gap | DDL 주석 불일치 | `V1__init.sql:1505` target_type COMMENT에 CLUB(7) 누락 | enum 소스 기준이 정답이므로 런타임 영향 없으나 DB 문서 정합성 훼손 | V1__init.sql COMMENT 갱신 |
| Risk | `OTHER` description 클라이언트 10자 강제 — 서버 미검증 | `report_screen.dart` `_selectedReason == OTHER → description.trim().length >= 10` | 클라이언트 우회 시 서버는 빈 description으로 저장. 운영자 처리 시 사유 파악 불가. | 서버에서 `OTHER` 선택 시 description 최소 길이 검증 추가 검토 |
| Info | CLUB 신고 v1 운영자 수동 처리 안내 미노출 | `report_screen.dart`에 "v1 운영자 검토 안내" 문구 없음 | 사용자가 신고 결과를 언제 받을지 예측 불가 | 앱 ReportScreen에 CLUB 대상 시 "v1 운영자 검토" 안내 추가 여부 결정 |

## 9. 수용 기준

- **AC-01. 리뷰 신고 (Happy Path · `targetType=REVIEW`)**: Given 로그인됨, F11-02 이벤트 리뷰 목록에서 카드를 발견. When 사용자가 해당 흐름을 실행하면 Then `report` 1건 PENDING, 운영자 큐에 적재.
- **AC-02. 본인 신고 시도 (`targetType=USER && targetId=내 userId`)**: Given `targetType="USER"`, `targetId=loginUser.userId`. When 제출하면 Then INSERT 없음.
- **AC-03. 동일 대상 중복 신고**: Given `report` 테이블에 `(reporterId, targetType, targetId)` 동일 행 존재. When 제출하면 Then INSERT 없음.
- **AC-04. "기타" 사유 선택 + 짧은 설명**: Given 입력 단계. When description 10자 미만이면 Then 제출 버튼 비활성. description 10자 이상 입력 후 정상 제출.
- **AC-05. 클럽 신고 (서버 지원 v1)**: Given 클럽 상세에서 신고 진입(오너 본인 제외). When 사유 선택 후 제출하면 Then `report` 1건 PENDING INSERT. 운영자 수동 처리 대기.
- **AC-06. 대상 없음 (이미 삭제된 리뷰 신고)**: Given 해당 리뷰 soft delete됨. When 제출하면 Then INSERT 성공 (운영자 검토 시 무효 처리).
- **AC-07. 고빈도 신고자**: Given 신고자가 1주 내 5번째 신고 시도. When 제출하면 Then PENDING 으로 저장되고 우선 검토로 표시된다. 자동 기각은 없다.
- **AC-08. 증빙 파일 소유권 불일치**: Given 다른 사용자 업로드 fileId 포함. When 제출하면 Then 403 `EVIDENCE_FILE_NOT_OWNED` 반환.
- **AC-09. 증빙 파일 5개 초과**: Given 6개 이상 fileId. When 제출하면 Then 400 `EVIDENCE_FILE_TOO_MANY` 반환.
