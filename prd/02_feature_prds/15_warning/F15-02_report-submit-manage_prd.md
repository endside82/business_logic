# F15-02. 신고 제출 & 내 신고 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

> 최종 갱신: 2026-06-05 (반영 — 익명 표적 제보 방어, dedup_key, 신규 ErrorCode 3종)

## 1. 결론

경고 제보는 **멤버 제보**(`POST /api/v1/clubs/{clubId}/warnings/reports`)와 **이벤트 호스트 출결 연계 제보**(`POST /api/v1/clubs/{clubId}/events/{eventId}/warning-reports`) 두 경로로 들어온다. 두 경로 모두 `WarningReportService.submit`을 호출하지만 호스트 경로는 `requireAttendanceLinkableActive`로 `attendance_linkable=true` 패널티 유형만 허용하고 `eventId`를 강제한다. 제출 전 검증은 (1) 정책 활성 → (2) 익명 허용 여부 → (3) 자가 제보 차단 → (4) **대상 클럽 멤버 검증** → (5) **eventId 클럽 정합 검증** → (6) **신고자 일일 캡(멤버 20/호스트 100)** → (7) **5분 dedup(실명·익명 분리)** → (8) **dedup_key DB unique race 방어** → (9) 익명 남용 차단(24h/반려율) 순으로 진행되며 통과 시 `SUBMITTED`로 저장된다. 첨부 파일은 `EvidenceFileValidator.validateAndNormalize`로 소유권 검증(최대 5개)한다. 본인 제보 목록은 `List<WarningReportVo>`(Page 아님)로 내려오고, 미처리 제보는 철회(`WITHDRAWN`)할 수 있다. Flutter는 `report_submit_screen.dart`/`host_report_submit_screen.dart`/`my_reports_screen.dart`로 이를 구현했고 응답 VO 필드가 일치한다.

판정: **제출/조회/철회의 화면-API 정합은 닫혀 있다**. (a) 익명 반려율 남용 차단이 익명 row를 못 잡던 구조적 결함은 `anonymous_reporter_id` 기반 count 쿼리로 **해소됨(2026-06-03)**. 잔여 Risk는 (b) 자가 제보가 `WARNING_REPORT_NOT_FOUND`로 매핑되어 사용자가 원인을 분간하기 어려운 점, (c) 호스트 제보 목록이 전체 본인 제보를 메모리 필터하는 점이다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `WarningMemberController`, `WarningHostController`, `WarningReportService`, `WarningReportAddParam`, `WarningReportVo`, `WarningReportStatus`, `ErrorCode`. 앱: `report_submit_screen.dart`, `host_report_submit_screen.dart`, `my_reports_screen.dart`, `warning_member_api.dart`, `warning_host_api.dart`, `warning_member_providers.dart`.

## 3. 전체 동작 흐름

### 멤버 제보
1. 멤버가 `reports/submit`(`Routes.clubWarningReportSubmit`) → `ReportSubmitScreen` 진입, 대상 멤버·패널티 유형·사유·익명 여부 입력.
2. `WarningMemberApi.submitReport` → `POST /warnings/reports`(`WarningReportAddParam`).
3. 서버 `submit` 검증 순서 (`WarningReportService.java:108-218`):
   1. `warningProgramConfigService.requireActive(clubId)` — 정책 비활성 차단
   2. 익명이면 `config.isAllowAnonymousReport()` 검사
   3. **자가 제보** `reporterUserId == targetMemberId` → `WARNING_REPORT_NOT_FOUND`
   4. **대상 클럽 멤버 검증** `isClubMember(clubId, targetMemberId)` 실패 → `WARNING_REPORT_TARGET_NOT_MEMBER`(400, 2500221)
   5. **eventId 클럽 정합 검증** `event.clubId != clubId` → `WARNING_REPORT_EVENT_CLUB_MISMATCH`(400, 2500222)
   6. **첨부 파일 소유권** `EvidenceFileValidator.validateAndNormalize(owner, parsed, MAX_EVIDENCE_FILES=5)`
   7. **일일 총량 캡** 실명+익명 합산 24h ≥ 20(멤버)/100(호스트) → `WARNING_REPORT_RATE_LIMIT`(429, 2500220)
   8. **5분 dedup** 실명: `reporter_user_id` 기준 / 익명: `anonymous_reporter_id` 기준 5분창 → `WARNING_REPORT_ALREADY_PROCESSED`
   9. **dedup_key DB unique race 방어** `uk_warning_report_dedup` 위반 → `WARNING_REPORT_ALREADY_PROCESSED`(soft idempotency)
   10. 익명 남용 차단(24h 동일 대상 3건 / 누적 반려율 70% — 최소 5건 기준)
4. 통과 시 익명이면 `reporter_user_id=NULL, anonymous_reporter_id=실제ID`, 아니면 반대로 저장하고 `status=SUBMITTED`.
   - dedup_key = sha256hex(clubId + ":" + reporterUserId + ":" + targetMemberId + ":" + penaltyTypeCode + ":" + (epochSeconds/300))
   - `reporterUserId == null`(시스템 경로)이면 `dedup_key=null`(NULL 다건 허용)
5. audit log(익명은 actorId=0, role=SYSTEM) + outbox `WarningReportSubmitted` 발행. `WarningReportVo`(201 CREATED) 반환.

### 호스트 출결 연계 제보
1. 호스트가 이벤트 컨텍스트에서 `warning-reports/submit`(`Routes.eventWarningReportSubmit`) → `HostReportSubmitScreen`.
2. `WarningHostApi.submitAttendanceReport` → `POST /api/v1/clubs/{clubId}/events/{eventId}/warning-reports`.
3. 서버 `submitAttendanceReport`: `isEventHost(eventId, userId)` 아니면 `CLUB_PERMISSION_DENIED` → `requireAttendanceLinkableActive(clubId, penaltyTypeCode)` → `param.setEventId(eventId)` → `WarningReportService.submit` 동일 흐름.

### 내 제보 목록/철회
4. `my-reports`(`Routes.clubWarningMyReports`) → `MyReportsScreen` → `warningMyReportsProvider(clubId)` → `GET /warnings/me/reports` → `List<WarningReportVo>`(실명 본인 제보만).
5. 철회: `POST /warnings/reports/{reportId}/withdraw` → 제보자 본인(또는 익명 reporter) + 미종결(SUBMITTED/IN_REVIEW/NEEDS_MORE_INFO)일 때만 `WITHDRAWN`.

## 4. 제품 규칙

- 익명으로 낸 제보는 내 제보 목록에 나오지 않는다. 제보 설명은 4000자까지이다.
- 호스트의 출결 연계 제보는 출결과 연결할 수 있도록 켜 둔 유형만 쓸 수 있고, 해당 이벤트에 자동으로 묶인다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 멤버 + 정책 활성 | `requireActive` 통과 | 제출 폼 | 제보 SUBMITTED | 일치 |
| 멤버 + 정책 비활성 | `WARNING_NOT_ACTIVATED` | 에러 토스트 | "경고 제도 미운영" | 일치 |
| 익명 제보 + 허용 OFF | `WARNING_REPORT_ANONYMOUS_LIMIT` | 에러 | 차단 | 일치 |
| 자가 제보 | `WARNING_REPORT_NOT_FOUND` | 에러 | 차단(원인 모호) | Risk(아래) |
| **대상이 비멤버** | **`WARNING_REPORT_TARGET_NOT_MEMBER`(400)** | 에러 | "제보 대상이 클럽 멤버가 아닙니다" | **신규 해소** |
| **eventId 클럽 불일치** | **`WARNING_REPORT_EVENT_CLUB_MISMATCH`(400)** | 에러 | "해당 이벤트가 이 클럽에 속하지 않습니다" | **신규 해소** |
| **일일 캡 초과** | **`WARNING_REPORT_RATE_LIMIT`(429)** | 에러 | "오늘 제보 한도를 초과했습니다" | **신규 해소** |
| 5분 내 동일 제보(실명) | `WARNING_REPORT_ALREADY_PROCESSED` | 에러 | 중복 차단 | 일치 |
| 5분 내 동일 제보(익명) | `WARNING_REPORT_ALREADY_PROCESSED` | 에러 | 중복 차단 | 일치 |
| 익명 24h 동일 대상 3건 | `WARNING_REPORT_ANONYMOUS_LIMIT` | 에러 | 남용 차단 | 일치 |
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
| P2 | 자가 제보가 `WARNING_REPORT_NOT_FOUND`로 매핑 | `submit`에서 self-report 시 NOT_FOUND throw | 사용자가 "왜 막혔는지" 알 수 없음 | 전용 에러코드(예: SELF_REPORT) 또는 메시지 분리 |
| P2 | 5분 중복 차단 dedup_key에 eventId 미포함 | `raw` 키에 eventId를 의도적으로 제외 (우회 공격 차단 목적) — description도 무관 | 정당한 추가 제보가 5분 내 막힐 수 있으나 설계 의도임 | 정책 문서화 완료 |
| P2 | `saveAndFlush` unique 위반 판정이 문자열 매칭 의존 | `isDedupKeyViolation`이 MySQL 벤더 메시지 문자열로 `uk_warning_report_dedup` 판정 | MySQL 벤더 메시지 변경 시 다른 위반도 ALREADY_PROCESSED로 삼킬 위험 | 제약명 기반 판정 방식으로 강화 검토 |
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
| UX/정책 | 차단 사유 식별성 | self-report 에러를 사용자가 분간하도록 전용 에러코드/메시지 분리 검토 |
| 구현 | 내 제보/호스트 제보 목록 | 페이징·event 범위 쿼리 도입 |
| 구현 | dedup_key unique 판정 | MySQL 벤더 메시지 의존 → 제약명 기반 판정 방식 강화 |
| Flutter | 신규 ErrorCode 3종 처리 | `WARNING_REPORT_RATE_LIMIT`(429) / `TARGET_NOT_MEMBER`(400) / `EVENT_CLUB_MISMATCH`(400) — Flutter 에러 핸들러 추가 여부 검토 |
| 테스트 | 제출 분기 | 정책 비활성/익명/자가/비멤버 대상/eventId 불일치/일일 캡/중복/유형 거절 + 철회 종결 가드 E2E |
