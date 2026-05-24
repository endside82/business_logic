# F15-09. 검토 큐 & 대시보드/통계/감사로그 PRD

## 1. 결론

운영진 콘솔의 모니터링·검토 레이어는 `WARNING_REVIEWER` 권한으로 `WarningAdminQueueController`가 제공한다. `GET /queue`(`Page<WarningReviewQueueVo>`)·`GET /queue/{queueId}`·`POST /queue/{queueId}/process`(OPEN→PROCESSED/IGNORED)로 검토 큐 inbox를 처리하고, `GET /dashboard`(`WarningDashboardVo`)로 등급별 인원·이번달 신규·대기 제보/이의·큐 OPEN·outbox 헬스를, `GET /statistics`(`WarningStatisticsVo`)로 부여/감경/정정/만료 수·코드별 분포·이의 평균 처리시간을, `GET /members/{memberId}`(`WarningAdminMemberDetailVo`)로 멤버 상세를, `GET /review-targets`(`Page<WarningReviewTargetVo>`)로 검토 대상(`is_under_review=true`)을, `GET /audit-logs`(`Page<WarningAuditLogVo>`)로 감사 로그를 본다. Flutter `warning_console_screen.dart`/`warning_queue_screen.dart`/`warning_review_targets_screen.dart`/`warning_audit_log_screen.dart`가 구현했다.

판정: **조회·큐 처리의 화면-API 정합은 닫혀 있다**. 그러나 운영 신뢰성 Risk가 크다: (a) 통계 화면(`getStatistics`)이 서버가 지원하는 `period` 쿼리 파라미터를 **전달하지 않아** 항상 전체 기간만 본다, (b) 대시보드 `newThisMonthCount`/통계가 `warningLedgerRepository.findAll()` 전체를 메모리로 가져와 클럽 필터링 — 대규모 데이터에서 성능/메모리 위험, (c) `severe30dCount`가 "최근 30일"이 아니라 현재 SEVERE 등급 인원으로 근사(주석도 인정), (d) 큐 enqueue 호출처가 도메인 내부 서비스에 한정되어 실제로 어떤 흐름이 큐를 채우는지 검증 필요, (e) `processQueueItem`의 APPROVE/REJECT가 상태만 바꾸고 별도 액션을 트리거하지 않는 점이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningAdminQueueController.java#searchQueue/getQueueItem/processQueueItem/getDashboard/getAdminMemberDetail/getReviewTargets/searchAuditLogs/getStatistics` | 8엔드포인트, `period` 쿼리 |
| Backend Service | `WarningReviewQueueService.java#search/findById/enqueue/process/markProcessed/buildDashboard/buildStatistics/searchReviewTargets` | 큐 멱등 enqueue, OPEN→PROCESSED/IGNORED, findAll 집계 |
| Backend Service | `WarningQueryService.java#getAdminMemberDetail/searchLedger/searchAuditLogs` | 멤버 상세 합성, 감사 로그 페이징 |
| Backend Param | `WarningReviewQueueProcessParam`(Decision APPROVE/REJECT/IGNORE), `WarningReviewQueueSearchParam`, `WarningReviewTargetSearchParam`, `WarningAuditLogSearchParam` | 처리/검색 파라미터 |
| Backend VO | `WarningReviewQueueVo`, `WarningDashboardVo`, `WarningStatisticsVo`, `WarningAdminMemberDetailVo`, `WarningReviewTargetVo`, `WarningAuditLogVo` | 응답 필드 |
| Backend Enum | `WarningReviewQueueType`(7값), `WarningReviewQueueStatus`(OPEN/PROCESSED/IGNORED), `WarningReviewLevel`(5값) | 큐/등급 |
| Backend Error | `ErrorCode.java` | `WARNING_QUEUE_ITEM_NOT_FOUND` |
| Backend DDL | `V1__init.sql` `warning_review_queue`, `warning_audit_log`(5년 보존), `domain_outbox` | 컬럼/인덱스 |
| Frontend API | `warning_admin_queue_api.dart` | 8엔드포인트, `getStatistics`는 **period 미전달** |
| Frontend Screen | `admin/warning_console_screen.dart`, `warning_queue_screen.dart`, `warning_review_targets_screen.dart`, `warning_audit_log_screen.dart`, `warning_member_detail_screen.dart` | 콘솔/큐/대상/로그/멤버 상세 |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

1. WARNING_REVIEWER가 운영 콘솔 진입 → `WarningConsoleScreen(clubId, role)` → `GET /dashboard`로 요약 카드(등급별 인원/대기/큐/outbox 헬스).
2. **큐**: `queue`(`Routes.adminWarningQueue`) → `WarningQueueScreen` → `GET /queue`(`Page<WarningReviewQueueVo>`). 항목 처리 → `POST /queue/{queueId}/process`(`{decision: APPROVE|REJECT|IGNORE, note?}`) → OPEN이 아니면 멱등 무시, IGNORE면 IGNORED, 그 외 PROCESSED. audit `REVIEW_QUEUE_PROCESSED` + outbox `WarningReviewQueueProcessed`.
3. **검토 대상**: `review-targets`(`Routes.adminWarningReviewTargets`) → `GET /review-targets` → `Page<WarningReviewTargetVo>`(is_under_review=true 멤버).
4. **멤버 상세**: `GET /members/{memberId}` → `WarningAdminMemberDetailVo`(summary + 최근 20건 원장 + 활성 제재). F15-06 조정 진입점.
5. **통계**: `GET /statistics?period=...`(서버 지원) → `WarningStatisticsVo`. **현재 Flutter는 period 미전달 → 항상 "ALL"**.
6. **감사 로그**: `audit-logs`(`Routes.adminWarningAuditLogs`) → `GET /audit-logs` → `Page<WarningAuditLogVo>`(before/after JSON, actor/role/flags).
7. 큐는 다른 경고 서비스(`enqueue`)가 채우거나, `markProcessed`로 비즈니스 트랜잭션 안에서 자동 처리된다.

## 4. 서버 계약

### `GET /queue` / `GET /queue/{queueId}` / `POST /queue/{queueId}/process`
| 항목 | 실제 계약 |
|---|---|
| 권한 | `WARNING_REVIEWER` |
| search 응답 | `Page<WarningReviewQueueVo>` |
| 단건 | clubId 불일치/없음 → `WARNING_QUEUE_ITEM_NOT_FOUND` |
| process Body | `WarningReviewQueueProcessParam{decision@NotNull(APPROVE/REJECT/IGNORE), note?}` |
| process 동작 | OPEN 아니면 멱등 반환, IGNORE→IGNORED 그 외→PROCESSED, outbox `WarningReviewQueueProcessed` |

`WarningReviewQueueVo`: `id`, `clubId`, `queueType:WarningReviewQueueType`, `targetType`, `targetId`, `summary`, `status:WarningReviewQueueStatus`, `assignedTo`, `processedBy`, `processedAt`, `processedNote`, `createdAt`.

### `GET /dashboard`
`WarningDashboardVo`: `clubId`, `reviewTargetsByLevel:Map<String,Long>`(ATTENTION/MONITOR/RESTRICTION_CANDIDATE/SEVERE_SANCTION_CANDIDATE), `newThisMonthCount`(findAll 집계), `severe30dCount`(현재 SEVERE 인원 근사), `pendingReports`(SUBMITTED+IN_REVIEW+NEEDS_MORE_INFO), `pendingAppeals`(SUBMITTED+IN_REVIEW), `queueOpenCount`, `outboxMetric:Map`(pending/failed/skipped).

### `GET /statistics`
| 항목 | 실제 계약 |
|---|---|
| Query | `period`(선택, ALL/7D/30D/90D/MONTH/YEAR) — `@RequestParam(required=false)` |
| 응답 | `WarningStatisticsVo{period, grantCount, mitigateCount, reverseCount, expireCount, grantsByPenaltyCode:Map, appealAverageHandlingHours, appealResolvedCount, reviewTargetTotal}` |
| 집계 | `warningLedgerRepository.findAll()` 전체 → clubId/기간 필터 (메모리) |

### `GET /members/{memberId}` / `GET /review-targets` / `GET /audit-logs`
| 항목 | 실제 계약 |
|---|---|
| 멤버 상세 | `WarningAdminMemberDetailVo`(summary + 최근 20 ledger + 활성 제재) |
| 검토 대상 | `Page<WarningReviewTargetVo>{clubId, memberId, reviewLevel, effectiveScore, effectiveCount, lastGrantAt, reviewTriggeredAt, manualLock}` |
| 감사 로그 | `Page<WarningAuditLogVo>{id, clubId, actorId, actorRole, actorPermissionFlags, actionType, targetType, targetId, beforeData, afterData, reason, reasonCode, batchId, requestIp, userAgent, createdAt}` |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `queue`/`review-targets`/`audit-logs`/`members/:memberId` (운영 콘솔 하위) |
| Screen | `WarningConsoleScreen`, `WarningQueueScreen`, `WarningReviewTargetsScreen`, `WarningAuditLogScreen`, `WarningMemberDetailScreen` |
| Repository | `WarningAdminQueueRepository` |
| Retrofit | `WarningAdminQueueApi.searchQueue/getQueueItem/processQueueItem/getDashboard/getAdminMemberDetail/getReviewTargets/searchAuditLogs/getStatistics` |
| 누락 | `getStatistics(clubId)` — **period 파라미터 없음** |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| WARNING_REVIEWER | 클래스 권한 | 콘솔 진입 | 모니터링/큐 처리 | 일치 |
| 권한 없는 멤버 | 403 | 차단 | 접근 불가 | 일치 |
| OPEN 큐 처리 | OPEN→PROCESSED/IGNORED | 처리 액션 | 상태 변경 | 일치 |
| 이미 처리된 큐 재처리 | 멱등 반환(OPEN 아니면 무시) | 변경 없음 | 멱등 | 일치 |
| 다른 클럽 queueId | `WARNING_QUEUE_ITEM_NOT_FOUND` | 차단 | cross-club 격리 | 일치 |
| 통계 기간 선택 | 서버 period 지원 | Flutter 미전달 | 항상 전체 기간 | Gap(아래) |
| 검토 대상 조회 | is_under_review 필터 | 목록 | 등급별 대상 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 큐 응답 형태 | `Page<WarningReviewQueueVo>` | `PageResponse` | 일치 |
| `WarningReviewQueueType` | 7값 | enum 동일 | 일치 |
| `WarningReviewQueueStatus` | OPEN/PROCESSED/IGNORED | enum 동일 | 일치 |
| Decision | APPROVE/REJECT/IGNORE | `WarningReviewQueueDecision` 동일 | 일치 |
| 대시보드/통계 형태 | VO + Map | VO + Map(JSON) | 일치 |
| 통계 period | 서버 `@RequestParam period` | Flutter 미전달 | **불일치** |
| 감사 로그 형태 | `Page<WarningAuditLogVo>` | `PageResponse` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 통계 `period` 미전달 | `WarningAdminQueueApi.getStatistics(clubId)`에 period 파라미터 없음, 서버는 지원 | 운영진이 7D/30D/MONTH 등 기간별 통계를 못 봄(항상 ALL) | Flutter API에 `@Query('period')` 추가 + 화면 기간 선택 UI |
| P1 | 대시보드/통계 `findAll()` 전체 메모리 집계 | `buildDashboard`/`buildStatistics`가 `warningLedgerRepository.findAll()` 후 클럽 필터 | 원장 누적 시 메모리/성능 급격 악화 | clubId+기간 QueryRepository 집계로 전환 |
| P2 | `severe30dCount` 근사 | "최근 30일"이 아니라 현재 SEVERE 등급 인원(주석 인정) | 대시보드 지표 의미 오해 | review_triggered_at 기준 30일 집계로 정확화 |
| P2 | 큐 enqueue 호출처 검증 필요 | `enqueue`는 도메인 내부 서비스용, 실제 어떤 흐름이 채우는지 본 PRD 미확정 | 큐가 비어 있어 검토 대상이 inbox에 안 뜰 수 있음 | enqueue 호출 흐름(HOST_PROPOSAL/AUTO_REVERT 등) 전수 확인 |
| P2 | `processQueueItem` APPROVE/REJECT가 상태만 변경 | process는 status 전이 + outbox만, 별도 후속 액션 트리거 없음 | "검토 처리"가 실제 제재/부여로 자동 연결되지 않음 | 큐 처리 후속 액션 정책 결정 |

## 9. 수용 기준

### AC-01. 큐 처리 멱등
Given OPEN 큐 항목을 IGNORE로 처리한다.
When `POST /queue/{queueId}/process`가 두 번 호출된다.
Then 첫 호출에 IGNORED가 되고, 두 번째는 멱등하게 현재 상태를 반환한다.

### AC-02. 대시보드 집계
Given WARNING_REVIEWER가 콘솔에 진입한다.
When `GET /dashboard`가 호출된다.
Then `reviewTargetsByLevel`/`pendingReports`/`pendingAppeals`/`queueOpenCount`/`outboxMetric`이 반환된다.

### AC-03. 기간별 통계 (목표)
Given 운영진이 "최근 30일" 통계를 선택한다.
When 통계 조회가 `period=30D`로 호출된다.
Then 서버는 30일 범위로 grant/mitigate/reverse/expire를 집계해야 한다.
현재 Flutter가 period를 전달하지 않으므로 이 기준을 충족하지 못한다.

### AC-04. 검토 대상 목록
Given 멤버 다수가 검토 등급에 진입했다.
When `GET /review-targets`가 호출된다.
Then `is_under_review=true` 멤버가 등급/점수와 함께 페이지네이션된다.

### AC-05. 감사 로그 추적
Given 경고 도메인에서 어떤 쓰기가 일어났다.
When `GET /audit-logs`가 호출된다.
Then 해당 action_type/before/after/actorRole이 시간 역순으로 조회된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현(P1) | 통계 period | Flutter `getStatistics`에 `@Query('period')` 추가 + 기간 선택 UI |
| 구현(P1) | 집계 성능 | 대시보드/통계 `findAll()` → QueryRepository 집계 전환 |
| 구현 | severe30d 정확화 | review_triggered_at 30일 집계 |
| 구현 | 큐 enqueue 흐름 | 어떤 서비스가 큐를 채우는지 전수 확인 + 검토 처리 후속 액션 정책 |
| 테스트 | 콘솔/큐 | 큐 멱등 처리/대시보드 집계/검토 대상/감사 로그 E2E |
