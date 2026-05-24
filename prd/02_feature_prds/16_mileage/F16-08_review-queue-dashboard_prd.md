# F16-08. 검토 큐 & 대시보드/감사로그 PRD

## 1. 결론

`MILEAGE_MANAGER` 운영진의 마일리지 콘솔 기능이다 — 검토 큐 조회/단건/처리(`queue`), 운영 대시보드(`dashboard`), 멤버 운영 상세(`members/{memberId}`), 멤버 등급 이력(`members/{memberId}/grade-history`), 감사 로그(`audit-logs`). 서버 `MileageAdminQueueController`와 Flutter `mileage_console_screen.dart`·`mileage_queue_screen.dart`·`mileage_audit_log_screen.dart`·`mileage_member_detail_screen.dart`가 연결되어 있다.

검토 큐는 다른 서비스가 `enqueue`로 적재(`ReviewQueueType` 7종)하고, 운영진이 `process`(APPROVE/REJECT→PROCESSED, IGNORE→IGNORED)로 닫는다. 대시보드는 활성 멤버 수·이번달 적립/차감/만료·전월 대비·열린 큐 수·최근 audit 10건·현재 시즌·outbox 메트릭을 합성한다. 감사 로그는 `Page<MileageAuditLogVo>`로 정상 typed.

판정: **큐 처리·감사 로그는 사용 가능**. 그러나 ① **대시보드가 서버 `Map`인데 Flutter `getDashboard`는 Map으로 받지만 멤버 상세(`getMemberDetail`)는 서버 `Map`을 typed `MemberMileageMainVo`로 받아 파싱 깨짐** ② 대시보드/멤버 상세 집계가 `findAll()` in-memory가 핵심 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `MileageAdminQueueController.java` | `@RequiresClubPermission(MILEAGE_MANAGER)`, queue/dashboard/members/audit-logs |
| Backend Service | `MileageReviewQueueService.java` | `enqueue`(idempotent), `process`(APPROVE/REJECT/IGNORE), `markProcessed` |
| Backend Service | `MileageQueryService.java` | `buildDashboard`(Map), `buildAdminMemberDetail`(Map: main/ledger/auditTrail/openQueueItems), `findGradeChanges` |
| Backend Service | `MileageAuditService.java`(호출), `MileageAuditLogQueryRepository.searchAuditLogs`(호출) | audit 기록·검색 |
| Backend VO/Param/Enum | `MileageReviewQueueVo.java`, `MileageAuditLogVo.java`, `MileageGradeChangeVo.java`, `MileageReviewQueueSearchParam`/`...ProcessParam`, `MileageAuditLogSearchParam`, `constants/ReviewQueueType.java`, `ReviewQueueStatus.java` | 필드·enum·Decision |
| Frontend | `mileage_admin_queue_api.dart`, `mileage_admin_queue_repository.dart`, `mileage_admin_queue_providers.dart`, `presentation/mileage/admin/screens/mileage_console_screen.dart`, `mileage_queue_screen.dart`, `mileage_audit_log_screen.dart`, `mileage_member_detail_screen.dart`, `widgets/mileage_console_card.dart` | route·Map vs VO 수신 |
| DB | `V1__init.sql` `mileage_review_queue`, `mileage_audit_log` | 컬럼·상태·인덱스(5년 보존) |

## 3. 전체 동작 흐름

1. 운영진이 콘솔(`adminClubMileage`)에 진입 → `getDashboard(clubId)` → `GET /dashboard`. 서버 `buildDashboard`가 전체 ledger를 in-memory 집계해 `activeMembers`(30일 내 EARN distinct), `earnedThisMonth/redeemedThisMonth/expiredThisMonth`, `prevMonthDelta`, `pendingQueueCount`(OPEN 큐), `recentActions`(audit 10건), `currentSeason`, `outboxMetric`(MILEAGE pending/failed/skipped)을 `Map`으로 반환.
2. 검토 큐 화면 → `listQueue(clubId, queueType?, status?, ...)` → `GET /queue`(`MileageReviewQueueSearchParam`) → `Page<MileageReviewQueueVo>`.
3. 단건 → `getQueueItem` → `GET /queue/{queueId}`(클럽 불일치 시 `MILEAGE_QUEUE_ITEM_NOT_FOUND`).
4. 처리 → `processQueue` → `POST /queue/{queueId}/process`(`MileageReviewQueueProcessParam`: decision=APPROVE/REJECT/IGNORE, note?). OPEN이 아니면 no-op. IGNORE→IGNORED, 그 외→PROCESSED, audit + outbox(`ReviewQueueProcessed`).
5. 멤버 운영 상세 → `getMemberDetail` → `GET /members/{memberId}` → `buildAdminMemberDetail`가 `main`(buildMemberMain VO) + `ledger`(최근 50 Page) + `auditTrail`(멤버 관련 audit 20) + `openQueueItems`를 `Map`으로 반환.
6. 멤버 등급 이력 → `getMemberGradeHistory` → `GET /members/{memberId}/grade-history` → `List<MileageGradeChangeVo>`.
7. 감사 로그 → `listAuditLogs` → `GET /audit-logs`(`MileageAuditLogSearchParam`: actorId/actorRole/actionType/targetType/targetId/batchId/from/to) → `Page<MileageAuditLogVo>`.

## 4. 서버 계약

### `GET /queue`, `GET /queue/{queueId}`, `POST /queue/{queueId}/process`
- list Query `MileageReviewQueueSearchParam`(queueType, status, assignedTo). 응답 `Page<MileageReviewQueueVo>`(id/queueType/targetType/targetId/summary/status/assignedTo/processedBy/processedAt/processedNote/createdAt).
- process Body `MileageReviewQueueProcessParam`(decision NotNull: APPROVE/REJECT/IGNORE, note). 204. OPEN 아니면 no-op.
- 미존재 → `MILEAGE_QUEUE_ITEM_NOT_FOUND`.

### `GET /dashboard`
- 응답 **`Map<String,Object>`**: `clubId, activeMembers, earnedThisMonth, redeemedThisMonth, expiredThisMonth, prevMonthDelta, pendingQueueCount, recentActions[], currentSeason{name/start/end/daysRemaining}, outboxMetric{pending/failed/skipped}`.

### `GET /members/{memberId}`
- 응답 **`Map<String,Object>`**: `main`(MemberMileageMainVo), `ledger`(Page\<MileageLedgerVo\>), `auditTrail[]`, `openQueueItems[]`.

### `GET /members/{memberId}/grade-history`
- Query `limit`(default 50). 응답 `List<MileageGradeChangeVo>`.

### `GET /audit-logs`
- Query `MileageAuditLogSearchParam`. 응답 `Page<MileageAuditLogVo>`(id/actorId/actorRole/actorPermissionFlags/actionType/targetType/targetId/beforeJson/afterJson/reason/reasonCode/batchId/requestIp/userAgent/createdAt).

### enum
`ReviewQueueType{HOST_PROPOSAL, AUTO_REVERT_REVIEW, REPEATED_MANUAL, REPEATED_REDEMPTION, BULK_POST_REVIEW, GRADE_ABNORMAL, NEGATIVE_BALANCE_REVERSE_RISK}`, `ReviewQueueStatus{OPEN, PROCESSED, IGNORED}`, `Decision{APPROVE, REJECT, IGNORE}`, `ActorRole`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `adminClubMileage`(`mileage`, 콘솔), `adminMileageQueue`(`queue`), `adminMileageAuditLogs`(`audit-logs`), `adminMileageMemberDetail`(`members/:memberId`), `adminMileageMemberGradeHistory` |
| Screen/Widget | `MileageConsoleScreen`, `MileageQueueScreen`, `MileageAuditLogScreen`, `MileageMemberDetailScreen`, `MileageConsoleCard` |
| Repository/API | `MileageAdminQueueRepository.listQueue/getQueueItem/processQueue/getDashboard/getMemberDetail/getMemberGradeHistory/listAuditLogs` |
| Map 처리 | `getDashboard`는 `Future<dynamic>` → `asJsonMap`으로 Map 파싱(정합), `getMemberDetail`은 `MemberMileageMainVo` typed 수신(불일치) |
| Model | `MileageReviewQueueVo`, `MileageAuditLogVo`, `MileageGradeChangeVo`, `MileageReviewQueueProcessParam`, enum들 |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| MANAGER + 큐 목록 | OPEN/PROCESSED/IGNORED 필터 | 상태 탭 | 큐 페이지 표시 | 일치 |
| MANAGER + 큐 처리 (APPROVE) | PROCESSED 전환 | 처리 결과 | 큐 닫힘 + audit | 일치 |
| MANAGER + 이미 닫힌 큐 처리 | no-op(OPEN 아님) | 변화 없음 | 중복 처리 무시 | 일치 |
| MANAGER + 대시보드 | Map 집계 반환 | asJsonMap 파싱 | 통계 카드 표시 | 일치 |
| MANAGER + 멤버 상세 | Map(main/ledger/audit/queue) | `MemberMileageMainVo` typed 수신 | main 외 ledger/audit/queue 누락 | **불일치 (Gap)** |
| MANAGER + 감사 로그 | `Page<MileageAuditLogVo>` | PageResponse 수신 | 로그 페이지 표시 | 일치 |
| 비 MANAGER | `@RequiresClubPermission` 차단 | 접근 불가 | 권한 부족 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `ReviewQueueType`/`ReviewQueueStatus`/`Decision`/`ActorRole` | 서버 enum | 동일 enum | 일치 |
| 큐 목록/감사 로그 | `Page<...Vo>` | `PageResponse<...Vo>` | 일치 |
| 대시보드 | `Map<String,Object>` | `dynamic` → `asJsonMap` | 일치 (typed 모델 없음) |
| 멤버 상세 | `Map`(main/ledger/auditTrail/openQueueItems) | `MemberMileageMainVo` typed | **불일치** |
| audit 필드 | beforeJson/afterJson(JSON 문자열) | 동일 | 일치 |
| 큐 process decision | APPROVE/REJECT/IGNORE | 동일 enum | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | 멤버 상세 type 불일치 | 서버 `getMemberDetail`은 `Map`(main/ledger/auditTrail/openQueueItems) 반환, Flutter `getMemberDetail`은 `MemberMileageMainVo` typed 수신 | main 일부만 파싱되고 ledger·audit·열린 큐가 누락되거나 역직렬화 실패 | 멤버 상세 전용 VO 정의 또는 Flutter가 Map으로 받아 분해 |
| P1 | 대시보드/멤버 상세가 `findAll()` in-memory 집계 | `buildDashboard`·`buildAdminMemberDetail`이 전체 ledger/audit 로드 후 필터 | 대규모 클럽에서 콘솔 진입·멤버 상세 조회 지연 | 월별 집계·멤버 audit 전용 QueryDSL 이관 |
| P1 | 대시보드 outbox 메트릭이 글로벌 | `outboxMetric`이 `DomainType.MILEAGE` 전역 카운트(클럽 무관) | 특정 클럽 대시보드에 다른 클럽 outbox 수치가 섞임 | 클럽 단위 메트릭 필요 여부 결정 |
| P2 | 멤버 상세 audit 매칭이 문자열 포함 | `buildAdminMemberDetail`이 `body.contains("\"memberId\":"+id)`로 audit 필터 | memberId가 다른 필드에 우연히 포함되면 오탐 | targetId/구조화 필드 기반 필터로 변경 |
| P2 | 큐 적재 트리거 일부 미구현 | `ReviewQueueType`은 7종이나 enqueue 호출은 HOST_PROPOSAL만 확인됨(REPEATED_*, GRADE_ABNORMAL 등) | 남용 탐지 큐가 채워지지 않을 수 있음 | 각 큐 타입의 적재 트리거 구현 여부 점검 |

## 9. 수용 기준

### AC-01. 큐 목록 조회
Given MILEAGE_MANAGER가 OPEN 큐를 연다. When `GET /queue?status=OPEN`을 호출한다. Then 미처리 큐 항목이 페이지로 반환된다.

### AC-02. 큐 처리
Given 운영진이 큐 항목을 IGNORE로 처리한다. When `POST /queue/{id}/process`를 호출한다. Then 상태가 IGNORED로 전환되고 audit가 기록된다.

### AC-03. 대시보드
Given 운영진이 콘솔에 진입한다. When `GET /dashboard`가 성공한다. Then activeMembers·이번달 적립/차감/만료·pendingQueueCount·최근 audit·현재 시즌이 표시된다.

### AC-04. 감사 로그 필터
Given 운영진이 actionType=MILEAGE_MANUAL_GRANTED로 필터한다. When `GET /audit-logs`를 호출한다. Then 해당 액션 audit가 페이지로 반환된다.

### AC-05. 멤버 운영 상세 (현재 미충족)
Given 운영진이 멤버 운영 상세를 연다. When `GET /members/{memberId}`가 main/ledger/auditTrail/openQueueItems를 반환한다. Then 화면이 멤버 요약·원장·감사·열린 큐를 모두 표시해야 한다. 현재 Flutter가 `MemberMileageMainVo`로 받아 이 기준을 충족하지 못한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 멤버 상세 VO | `buildAdminMemberDetail` 응답 전용 모델 정의 + Flutter 매핑 수정 |
| 성능 | 대시보드/상세 집계 | in-memory → QueryDSL 집계 이관 |
| 구현 | outbox 메트릭 범위 | 클럽 단위 집계 필요 여부 결정 |
| 구현 | 큐 적재 트리거 | REPEATED_*/GRADE_ABNORMAL 등 enqueue 트리거 구현 점검 |
| 테스트 | 콘솔 | 큐 처리, 대시보드 집계, 감사 필터, 멤버 상세 E2E 추가 |
