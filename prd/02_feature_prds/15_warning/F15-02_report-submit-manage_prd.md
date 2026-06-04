# F15-02. 신고 제출 & 내 신고 관리 PRD

> 최종 갱신: 2026-06-05 (커밋 `99b755e` 반영 — 익명 표적 제보 방어, dedup_key, 신규 ErrorCode 3종)

## 1. 결론

경고 제보는 **멤버 제보**(`POST /api/v1/clubs/{clubId}/warnings/reports`)와 **이벤트 호스트 출결 연계 제보**(`POST /api/v1/clubs/{clubId}/events/{eventId}/warning-reports`) 두 경로로 들어온다. 두 경로 모두 `WarningReportService.submit`을 호출하지만 호스트 경로는 `requireAttendanceLinkableActive`로 `attendance_linkable=true` 패널티 유형만 허용하고 `eventId`를 강제한다. 제출 전 검증은 (1) 정책 활성 → (2) 익명 허용 여부 → (3) 자가 제보 차단 → (4) **대상 클럽 멤버 검증** → (5) **eventId 클럽 정합 검증** → (6) **신고자 일일 캡(멤버 20/호스트 100)** → (7) **5분 dedup(실명·익명 분리)** → (8) **dedup_key DB unique race 방어** → (9) 익명 남용 차단(24h/반려율) 순으로 진행되며 통과 시 `SUBMITTED`로 저장된다. 첨부 파일은 `EvidenceFileValidator.validateAndNormalize`로 소유권 검증(최대 5개)한다. 본인 제보 목록은 `List<WarningReportVo>`(Page 아님)로 내려오고, 미처리 제보는 철회(`WITHDRAWN`)할 수 있다. Flutter는 `report_submit_screen.dart`/`host_report_submit_screen.dart`/`my_reports_screen.dart`로 이를 구현했고 응답 VO 필드가 일치한다.

판정: **제출/조회/철회의 화면-API 정합은 닫혀 있다**. (a) 익명 반려율 남용 차단이 익명 row를 못 잡던 구조적 결함은 `anonymous_reporter_id` 기반 count 쿼리로 **해소됨(커밋 `99b755e`, 2026-06-03)**. 잔여 Risk는 (b) 자가 제보가 `WARNING_REPORT_NOT_FOUND`로 매핑되어 사용자가 원인을 분간하기 어려운 점, (c) 호스트 제보 목록이 전체 본인 제보를 메모리 필터하는 점이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningMemberController.java#submitReport/getMyReports/withdrawReport` | 멤버 제보 3엔드포인트 |
| Backend Controller | `WarningHostController.java#submitAttendanceReport/getMyAttendanceReports` | 호스트 경로 base `/clubs/{clubId}/events/{eventId}/warning-reports`, `isEventHost`, `requireAttendanceLinkableActive` |
| Backend Service | `WarningReportService.java#submit/getMyReports/withdraw/isAnonymousBlocked` | 정책 활성·익명·자가·중복·남용 차단, SUBMITTED 저장, outbox `WarningReportSubmitted` |
| Backend Param | `WarningReportAddParam.java` | `targetMemberId`(필수), `penaltyTypeCode`(필수 ≤40), `eventId?`, `attachmentIds?`, `description?(≤4000)`, `anonymous` |
| Backend VO | `WarningReportVo.java` | 응답 필드, 익명 마스킹 주석 |
| Backend Enum | `WarningReportStatus.java` | SUBMITTED/IN_REVIEW/NEEDS_MORE_INFO/APPROVED/REJECTED/WITHDRAWN |
| Backend Error | `ErrorCode.java` | `WARNING_NOT_ACTIVATED`, `WARNING_REPORT_ANONYMOUS_LIMIT`, `WARNING_REPORT_ALREADY_PROCESSED`, `WARNING_REPORT_NOT_FOUND`, `PENALTY_TYPE_NOT_FOUND/INACTIVE`, `CLUB_PERMISSION_DENIED`, **`WARNING_REPORT_RATE_LIMIT`(429, 2500220)**, **`WARNING_REPORT_TARGET_NOT_MEMBER`(400, 2500221)**, **`WARNING_REPORT_EVENT_CLUB_MISMATCH`(400, 2500222)** |
| Backend DDL | `V1__init.sql` `warning_report` | `reporter_user_id`/`anonymous_reporter_id`/`is_anonymous`, **`dedup_key char(64) DEFAULT NULL`**, **UNIQUE KEY `uk_warning_report_dedup`**, **CHECK `ck_warning_report_anon_columns`**, **인덱스 6종 신규**(list·target·reporter·anon_reporter·anon_global·event) |
| Frontend API | `warning_member_api.dart`, `warning_host_api.dart` | 경로/메서드/List 반환 |
| Frontend Screen | `report_submit_screen.dart`, `host_report_submit_screen.dart`, `my_reports_screen.dart` | 제출/목록/철회 |
| Frontend Provider | `warning_member_providers.dart#warningMyReports` | List 구독 |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

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

## 4. 서버 계약

### `POST /api/v1/clubs/{clubId}/warnings/reports`
| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningMemberController#submitReport` |
| 권한 | `requireClubMember` |
| Body | `WarningReportAddParam` |
| 응답 | `WarningReportVo`, 201 CREATED |
| 검증 순서 | ①정책 활성 → ②익명 허용 → ③자가 제보 → ④**대상 클럽 멤버 검증** → ⑤**eventId 클럽 정합** → ⑥**첨부 소유권** → ⑦**일일 캡** → ⑧**5분 dedup(실명·익명 분리)** → ⑨**DB race 방어** → ⑩익명 남용 차단 |
| 실패 코드 | `WARNING_NOT_ACTIVATED`(정책 비활성), `WARNING_REPORT_ANONYMOUS_LIMIT`(익명 불허/남용), `WARNING_REPORT_NOT_FOUND`(자가 제보), **`WARNING_REPORT_TARGET_NOT_MEMBER`(400, 2500221)**, **`WARNING_REPORT_EVENT_CLUB_MISMATCH`(400, 2500222)**, **`WARNING_REPORT_RATE_LIMIT`(429, 2500220)**, `WARNING_REPORT_ALREADY_PROCESSED`(5분 dedup/race), `PENALTY_TYPE_NOT_FOUND/INACTIVE` |

#### dedup_key 생성 규칙 (`WarningReportService.java:186-188`)
```
raw = clubId + ":" + reporterUserId + ":" + targetMemberId + ":" + penaltyTypeCode + ":" + (epochSeconds/300)
dedup_key = sha256hex(raw, UTF-8)
```
- `eventId`를 의도적으로 미포함 — eventId만 바꿔 DB unique를 우회하는 공격 차단
- `reporterUserId == null`이면 `dedup_key = null` (NULL 다건 허용, 시스템 경로)

#### DDL 변경 (`V1__init.sql:3924-3942`)
```sql
`dedup_key` char(64) DEFAULT NULL,
UNIQUE KEY `uk_warning_report_dedup` (`dedup_key`),
CONSTRAINT `ck_warning_report_anon_columns` CHECK (
  (`is_anonymous`=0 AND `reporter_user_id` IS NOT NULL AND `anonymous_reporter_id` IS NULL)
  OR (`is_anonymous`=1 AND `anonymous_reporter_id` IS NOT NULL AND `reporter_user_id` IS NULL)
),
INDEX `idx_warning_report_list`          (`club_id`, `status`, `created_at`),
INDEX `idx_warning_report_target`        (`club_id`, `target_member_id`, `created_at`),
INDEX `idx_warning_report_reporter`      (`reporter_user_id`, `created_at`),
INDEX `idx_warning_report_anon_reporter` (`club_id`, `anonymous_reporter_id`, `target_member_id`, `created_at`),
INDEX `idx_warning_report_anon_global`   (`anonymous_reporter_id`, `created_at`),
INDEX `idx_warning_report_event`         (`event_id`)
```

#### 방어 규칙 전체 표
| 규칙 | 조건 | 상수 | 에러코드 | 소스 |
|---|---|---|---|---|
| 자가 제보 차단 | `reporterUserId == targetMemberId` | — | `WARNING_REPORT_NOT_FOUND` | `java:121` |
| 대상 클럽 멤버 검증 | `isClubMember(clubId, targetMemberId)` 실패 | — | `WARNING_REPORT_TARGET_NOT_MEMBER`(400, 2500221) | `java:126` |
| eventId 클럽 정합 검증 | `event.clubId != clubId` | — | `WARNING_REPORT_EVENT_CLUB_MISMATCH`(400, 2500222) | `java:133-139` |
| 일일 캡 (멤버) | 실명+익명 합산 24h ≥ 20 | `MAX_REPORTS_PER_DAY_MEMBER=20` | `WARNING_REPORT_RATE_LIMIT`(429, 2500220) | `java:71,150-153` |
| 일일 캡 (호스트) | 실명+익명 합산 24h ≥ 100 | `MAX_REPORTS_PER_DAY_HOST=100` | `WARNING_REPORT_RATE_LIMIT` | `java:73,150-153` |
| 5분 dedup (실명) | `reporter_user_id` 기준 5분창 동일 | `DUP_REPORT_MINUTES=5` | `WARNING_REPORT_ALREADY_PROCESSED` | `java:67,161-168` |
| 5분 dedup (익명) | `anonymous_reporter_id` 기준 5분창 동일 | `DUP_REPORT_MINUTES=5` | `WARNING_REPORT_ALREADY_PROCESSED` | `java:67,159-168` |
| dedup_key DB race 방어 | `uk_warning_report_dedup` 위반 | 버킷 5분 | `WARNING_REPORT_ALREADY_PROCESSED` | `java:206-218` |
| 익명 24h 동일 대상 3건 | `club+target+anonymousReporter` 24h ≥ 3 | `ANON_TARGET_24H_THRESHOLD=3` | `WARNING_REPORT_ANONYMOUS_LIMIT` | `java:59,531-534` |
| 익명 누적 반려율 70% | 총 ≥ 5건 + rejected/total ≥ 0.70 | `ANON_REJECT_MIN_SAMPLE=5`, `ANON_REJECT_RATIO_THRESHOLD=0.70` | `WARNING_REPORT_ANONYMOUS_LIMIT` | `java:61-62,539-545` |

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
| ~~P1~~ **해소** | ~~익명 누적 반려율 남용 차단이 익명 row를 못 잡음~~ | 커밋 `99b755e` (2026-06-03): `anonymous_reporter_id` 기반 count 쿼리로 교체 (`WarningReportRepository.java:82-95`) | 해소됨 | — |
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
| ~~구현~~ **완료** | ~~익명 남용 차단 정확화~~ | 커밋 `99b755e` (2026-06-03) 해소. `anonymous_reporter_id` 기반 count. |
| UX/정책 | 차단 사유 식별성 | self-report 에러를 사용자가 분간하도록 전용 에러코드/메시지 분리 검토 |
| 구현 | 내 제보/호스트 제보 목록 | 페이징·event 범위 쿼리 도입 |
| 구현 | dedup_key unique 판정 | MySQL 벤더 메시지 의존 → 제약명 기반 판정 방식 강화 |
| Flutter | 신규 ErrorCode 3종 처리 | `WARNING_REPORT_RATE_LIMIT`(429) / `TARGET_NOT_MEMBER`(400) / `EVENT_CLUB_MISMATCH`(400) — Flutter 에러 핸들러 추가 여부 검토 |
| 테스트 | 제출 분기 | 정책 비활성/익명/자가/비멤버 대상/eventId 불일치/일일 캡/중복/유형 거절 + 철회 종결 가드 E2E |
