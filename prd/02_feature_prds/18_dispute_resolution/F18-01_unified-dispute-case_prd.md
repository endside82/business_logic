# F18-01. 통합 분쟁 케이스 조회 PRD

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/dispute/ -->

## 1. 결론

`DisputeCaseQueryRepository`가 원천 도메인 테이블을 Java-side union으로 읽어 `caseId={prefix}:{sourceId}` 형태의 통합 식별자로 단일 뷰를 제공한다. 각 원천 도메인의 고유 상태를 `UnifiedDisputeStatus` 5값으로 매핑하는 변환 헬퍼는 서버 측에서만 수행하며 클라이언트는 결과만 수신한다.

`DisputeSourceType` enum 21값은 케이스의 **컨텍스트 분류(sourceType 필드)** 용도이며, caseId prefix 집합과 1:1 대응하지 않는다. 실제 emit 범위는 아래 §4 "조회 범위"를 참조한다. `EVENT_NO_SHOW`는 enum에 존재하지 않는 **appeal dispatcher 전용 prefix**다.

참가자 시점(`GET /api/v1/me/dispute-cases`)과 호스트 시점(`GET /api/v1/host/dispute-cases`) 두 뷰를 제공하며, 동일 케이스도 조회 주체에 따라 다른 timeline/evidence visibility 필터가 적용된다.

SLA 스케줄러는 8개 source를 매일 06:00 KST에 독립 격리 스캔하여 7일 초과 미해결 케이스를 운영자 알림으로 발행한다. 상세 조회(`DisputeCaseDetailVo`)에는 타임라인, 증빙, `ActorPermissionFlags`(7개 boolean), `evidenceFrozen`이 포함된다.

**주의**: `DisputeCaseQueryRepository`가 caseId를 emit할 때 `OPERATIONAL_ISSUE:`, `WARNING_REPORT:`, `WARNING_APPEAL:`, `SETTLEMENT_APPEAL:`, `REFUND_DISPUTE:`, `EVENT_NO_SHOW:` 등 `DisputeSourceType` enum값과 다른 prefix도 사용된다. enum `DisputeSourceType`과 실제 caseId prefix는 1:1 대응이 아니다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/.../host/dispute/controller/DisputeCaseController.java` | GET 4개 endpoint, `@ModelAttribute DisputeCaseSearchParam`, `@PathVariable String caseId` |
| Backend Service | `host/dispute/service/DisputeCaseService.java` | `getMyCases`, `getHostCases`, `getDetail` |
| Backend Query | `host/dispute/repository/query/DisputeCaseQueryRepository.java` | union adapter, caseId prefix 매핑 |
| Backend Enum | `DisputeSourceType.java`, `UnifiedDisputeStatus.java`, `DisputeCaseType.java` | DisputeSourceType enum 21값(컨텍스트 분류용), UnifiedDisputeStatus 5값 |
| Backend VO | `DisputeCaseVo.java`, `DisputeCaseDetailVo.java`, `ActorPermissionFlags.java` | 응답 필드 전체 |
| Backend Scheduler | `DisputeSlaExceededScheduler.java` | cron, SLA_DAYS=7, 8 source |
| Flutter API | `community_app/lib/data/api/dispute_case_api.dart` | Retrofit 4개 GET endpoint |
| Flutter Model | `lib/data/models/dispute/dispute_case_vo.dart`, `dispute_case_detail_vo.dart`, `dispute_enums.dart` | Dart enum mirror, JSON key 매핑 |
| Flutter Provider | `lib/domain/providers/dispute/my_dispute_cases_provider.dart`, `host_dispute_cases_provider.dart`, `dispute_case_detail_provider.dart` | 무한스크롤, 상세 조회 |
| Flutter Screen | `lib/presentation/dispute/screens/my_dispute_cases_screen.dart`, `dispute_case_detail_screen.dart` | 목록/상세 화면 |
| Verification | 검증 없음 (단위/통합 테스트 미확인) | — |

## 3. 전체 동작 흐름

1. 사용자가 `/me/disputes`(참가자) 또는 `/host/disputes`(호스트) 라우트로 진입한다.
2. `MyDisputeCasesScreen`(`asHost` flag로 분기)이 `myDisputeCasesProvider`(참가자) 또는 `hostDisputeCasesProvider`(호스트)를 구독한다.
3. Provider가 `DisputeCaseRepository.getMyCases(...)` 또는 `getHostCases(...)`를 호출하고 Retrofit이 `GET /api/v1/me/dispute-cases` 또는 `/host/dispute-cases`를 실행한다.
4. 서버 `DisputeCaseQueryRepository`가 대상 userId 기준으로 source row를 union하고, 각 row를 `DisputeCaseVo`로 변환한다. `caseId`는 `{prefix}:{sourceId}` 형태로 설정된다. 참가자 뷰는 7종 prefix + USER_DISPUTE 양측(reporter+target)을, 호스트 뷰는 SETTLEMENT_APPEAL + REFUND_DISPUTE 2종을 emit한다.
5. Flutter가 status 필터 칩(OPEN 그룹/종결 그룹) 또는 sourceType 필터로 표시 목록을 좁힌다. 무한 스크롤(`page` 증가).
6. 케이스 카드 탭 → `GET /api/v1/me(또는 host)/dispute-cases/{caseId}` → `DisputeCaseDetailVo` 수신.
7. 상세 화면이 `actorPermissions` flag를 기반으로 호스트/참가자 액션 패널을 분기하고, `evidenceFrozen=true`이면 증빙 삭제 버튼을 숨긴다. 타임라인 항목은 서버가 이미 visibility 필터링한 결과만 포함된다.

## 4. 서버 계약

### `GET /api/v1/me/dispute-cases`

| 항목 | 실제 계약 |
|---|---|
| Controller | `DisputeCaseController#getMyCases` |
| 인증 | JWT 필수 |
| Request | `@ModelAttribute DisputeCaseSearchParam` — `status?(UnifiedDisputeStatus)`, `caseType?(DisputeCaseType)`, `sourceType?(DisputeSourceType)`, `page/size(int, PagingParam 기본값)` |
| Response | `Page<DisputeCaseVo>` |
| 조회 범위 (source별 finder 기준) | ① OPERATIONAL_ISSUE: reporter, 최대 200건 ② WARNING_REPORT: reporter(target은 club 권한 필요로 미emit) ③ WARNING_APPEAL: member(작성자) ④ REPORT(공개): reporter, CARPOOL 제외 ⑤ DATE_BLOCK: blocker, reportId≠null인 안전신고 동반 차단만 ⑥ TRANSPORT: CARPOOL report, reporter ⑦ CLUB_MEMBERSHIP_ACTION: 영향받은 멤버(KICK/BAN만, UNBAN 제외) ⑧ USER_DISPUTE: reporter측+target측 양쪽. **미구현**: SETTLEMENT_APPEAL appealer 직접 finder 없음(호스트 경로만), PurchaseRefundDispute buyer finder 없음 |

### `GET /api/v1/host/dispute-cases`

| 항목 | 실제 계약 |
|---|---|
| Controller | `DisputeCaseController#getHostCases` |
| 인증 | JWT 필수 |
| Request | `@ModelAttribute DisputeCaseSearchParam` (동일) |
| Response | `Page<DisputeCaseVo>` |
| 조회 범위 | ① SETTLEMENT_APPEAL: creator의 settlement 산하 appeal 전체 ② REFUND_DISPUTE: seller, status OPEN/UPHELD/OVERTURNED/CLOSED. 공개 Report host 시점 out-of-scope(기존 HostInboxService 소관) |

### `GET /api/v1/me/dispute-cases/{caseId}` / `GET /api/v1/host/dispute-cases/{caseId}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `DisputeCaseController#getMyCaseDetail` / `#getHostCaseDetail` |
| 인증 | JWT 필수 |
| Path | `caseId`: String (`{prefix}:{id}` 형식, URL-encoded) |
| Response | `DisputeCaseDetailVo` |
| 에러 | caseId 형식 오류 또는 미존재 시 404, 비권한 접근 시 403 |

### `DisputeCaseVo` 필드

| 필드 | 타입 | nullable | 설명 |
|---|---|---|---|
| `caseId` | String | N | `{prefix}:{sourceId}` |
| `caseType` | DisputeCaseType | N | 9종 분류 |
| `sourceType` | DisputeSourceType | N | 케이스 컨텍스트 분류 (enum 21값) |
| `sourceId` | long | N | 원천 row PK |
| `eventId` | Long | Y | 관련 이벤트 |
| `clubId` | Long | Y | 관련 클럽 |
| `settlementId` | Long | Y | 관련 정산 |
| `paymentId` | Long | Y | 관련 결제 |
| `reporterUserId` | Long | Y | 신고자 |
| `targetUserId` | Long | Y | 피신고자 |
| `ownerHostUserId` | Long | Y | 책임 호스트 |
| `status` | UnifiedDisputeStatus | N | 통합 상태 5값 |
| `reasonCode` | String | Y | 분쟁 사유 코드 |
| `summary` | String | Y | 요약 |
| `createdAt` | LocalDateTime | N | |
| `updatedAt` | LocalDateTime | N | |
| `closedAt` | LocalDateTime | Y | 종결 시각 |

### `DisputeCaseDetailVo` 추가 필드

| 필드 | 타입 | nullable | 설명 |
|---|---|---|---|
| `responsibleActorId` | Long | Y | 처리 담당자 |
| `resolutionCode` | String | Y | 처리 결과 코드 |
| `resolutionNote` | String | Y | 처리 메모 |
| `timeline` | List\<DisputeTimelineEntryVo\> | Y | visibility 필터링 후 타임라인 |
| `evidence` | List\<DisputeEvidenceVo\> | Y | visibility 필터링 후 증빙 |
| `actorPermissions` | ActorPermissionFlags | N | 7개 boolean gating |
| `evidenceFrozen` | boolean | N | legal hold 중 여부 |

### `ActorPermissionFlags`

| 필드 | 설명 |
|---|---|
| `canResolveDispute` | 분쟁 해결(승인/거절) 가능 |
| `canEscalateToCs` | CS 에스컬레이션 가능 |
| `canSendNote` | 보완 요청 노트 전송 가능 (case participant 기본 true) |
| `canModerateMessages` | 메시지/사진 hide 등 콘텐츠 운영 |
| `canHandleRefundIssue` | 환불 분쟁 처리 |
| `canManageAttendance` | 출결/노쇼 관리 |
| `canApproveAppeal` | appeal 승인 (호스트/클럽 staff 한정) |

### `UnifiedDisputeStatus` 원천 매핑 규칙 (서버 `DisputeCaseQueryRepository`)

| 원천 도메인 | 원본 상태 → UnifiedDisputeStatus |
|---|---|
| OperationalIssue | OPEN→OPEN, IN_PROGRESS→IN_REVIEW, RESOLVED→RESOLVED, REJECTED→CLOSED |
| WarningReport | SUBMITTED→OPEN, IN_REVIEW/NEEDS_MORE_INFO→IN_REVIEW, APPROVED/REJECTED→RESOLVED, WITHDRAWN→CLOSED |
| WarningAppeal | SUBMITTED→OPEN, IN_REVIEW→IN_REVIEW, ACCEPTED/PARTIALLY_ACCEPTED/REJECTED→RESOLVED, WITHDRAWN→CLOSED |
| MeetingSettlementAppeal | PENDING→OPEN, APPROVED/REJECTED→RESOLVED, RESOLVED→CLOSED |
| Report(public) | PENDING→OPEN, IN_REVIEW→IN_REVIEW, RESOLVED/DISMISSED→RESOLVED, ESCALATED→ESCALATED |
| PurchaseRefundDispute | OPEN→OPEN, UPHELD/OVERTURNED→RESOLVED, CLOSED→CLOSED |
| DATE_BLOCK | 연결 report status로 파생 (reportId=null → hold 없음) |
| TRANSPORT(carpool) | source row = report, 동일 mapReport |
| CLUB_MEMBERSHIP_ACTION | DisputeAppeal 없으면 OPEN, PENDING→IN_REVIEW, UPHELD/REJECTED→RESOLVED, CLOSED→CLOSED |
| USER_DISPUTE | UnifiedDisputeStatus native (admin API가 전이 소유) |

### DisputeSlaExceededScheduler

| 항목 | 값 |
|---|---|
| cron | `0 0 6 * * *` (KST 06:00, `zone = "Asia/Seoul"` 명시) |
| ShedLock | 최대 20분 |
| SLA_DAYS | 7일 |
| scanOne 8회 호출 (source→active status set) | ① OPERATIONAL_ISSUE: OPEN+IN_PROGRESS ② WARNING_REPORT: SUBMITTED+IN_REVIEW (NEEDS_MORE_INFO 제외 — unified IN_REVIEW 매핑이지만 SLA set 미포함) ③ WARNING_APPEAL: SUBMITTED+IN_REVIEW ④ SETTLEMENT_APPEAL: PENDING(1개) ⑤ PUBLIC_REPORT: PENDING+IN_REVIEW (ESCALATED 제외) ⑥ REFUND_DISPUTE: OPEN(1개) ⑦ USER_DISPUTE: OPEN+IN_REVIEW+ESCALATED ⑧ DISPUTE_APPEAL: PENDING(1개, P3-C CLUB_MEMBERSHIP_ACTION 등 appeal-파생 source) |
| 알림 | `OperatorAlertType.DISPUTE_SLA_EXCEEDED`, severity=HIGH |
| idempotency_key | `DISPUTE_SLA_EXCEEDED:{SOURCE}:{id}` |
| 격리 | 각 source 독립 try/catch. 한 source 실패가 나머지 차단 않음. alert send도 case 단위 격리 |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| 라우트(참가자) | `/me/disputes` → `MyDisputeCasesScreen(asHost: false)` |
| 라우트(호스트) | `/host/disputes` → `MyDisputeCasesScreen(asHost: true)` |
| 라우트(상세) | `/me/disputes/:caseId` 또는 `/host/disputes/:caseId` → `DisputeCaseDetailScreen` |
| 목록 Provider | `myDisputeCasesProvider` (참가자, 무한스크롤), `hostDisputeCasesProvider` (호스트) |
| 상세 Provider | `disputeCaseDetailProvider(caseId, asHost)` |
| API | `DisputeCaseApi.getMyCases` / `getHostCases` / `getMyCaseDetail` / `getHostCaseDetail` |
| 필터 칩 | `UnifiedDisputeStatus.isOpen` / `isClosed` 그룹. `DisputeSourceType` 선택 필터 |
| 상세 분기 | `actorPermissions` flag로 호스트/참가자 액션 패널 분기 |
| evidenceFrozen | `true`이면 증빙 삭제 UI 숨김 |
| 타임라인 | 서버가 visibility 필터링한 결과만 `DisputeTimelineTile` 렌더링 |

### Dart enum 정합

| 서버 클래스 | Dart 클래스 | wire value | 판단 |
|---|---|---|---|
| `UnifiedDisputeStatus` | `UnifiedDisputeStatus` | `name()` | 일치 |
| `DisputeCaseType` | `DisputeCaseType` | `name()` | 일치 |
| `DisputeSourceType` | `DisputeSourceType` | `name()` | 일치 |
| `AuthorRole` | `AuthorRole` | `name()` | 일치 |
| `Visibility` | `DisputeVisibility` | `name()` (prefix 불일치, wire 일치) | 일치 |
| `DisputeAppealStatus` | `AppealStatus` | `name()` (클래스명 불일치, wire 일치) | 일치 |

## 6. 상태/권한 매트릭스

| 시나리오 | 서버 근거 | 프론트 분기 | 사용자 결과 |
|---|---|---|---|
| 참가자가 본인 케이스 목록 조회 | source별 finder 기준(§4 조회 범위 표) | `myDisputeCasesProvider` | source별 reporter/member/blocker/영향받은멤버/양측 기준으로 케이스 표시 |
| 호스트가 관련 케이스 목록 조회 | SETTLEMENT_APPEAL(creator) + REFUND_DISPUTE(seller) | `hostDisputeCasesProvider` | 자신이 creator 또는 seller인 케이스 표시 |
| `evidenceFrozen=true` 상세 | legal hold(OPEN/IN_REVIEW/ESCALATED) | 증빙 삭제 UI 숨김 | 증빙 파일 삭제 불가 |
| `canApproveAppeal=true` | 호스트/클럽 staff | 호스트 액션 패널 appeal 승인 버튼 | 서버 전이 endpoint 부재(Gap) — 버튼만 존재 |
| RESOLVED/CLOSED 케이스 | terminal status | 재접수 CTA 없음 | 조회만 가능 |
| 비권한 케이스 접근 | 서버 403 | `AppErrorState(title: '접근 권한이 없습니다')` | 차단됨 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| caseId 형식 | `{prefix}:{sourceId}` (prefix는 enum값과 다를 수 있음) | `String caseId` 그대로 사용 | 일치 |
| Page 반환 | Spring `Page<DisputeCaseVo>` | `PageResponse<DisputeCaseVo>` | 일치 |
| actorPermissions 7 boolean | `ActorPermissionFlags` Java class | `ActorPermissionFlags` Freezed | 일치 |
| sourceTypeCounts | `Map<HostInboxSourceType, Long>` (서버) | `Map<String, int>` (Dart) | String key 사용으로 wire 일치, 타입 안전성 낮음 |
| evidenceFrozen | Java `boolean` → JSON `evidenceFrozen` | Dart `@Default(false) bool evidenceFrozen` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | **dispute 딥링크 미배선**: `notification_router.dart`에 신규 dispute 알림 타입 처리 없음. 기존 REFUND_DISPUTE_CREATED(92)/UPHELD(93)/OVERTURNED(94) 3개만 처리. | `notification_router.dart` grep 0건 | USER_DISPUTE/CLUB_MEMBERSHIP_ACTION 관련 FCM 알림 클릭 시 홈으로 fall-through | NotificationRouter에 `myDisputeDetail` 라우트 연결 추가 필요 |
| P1 | **canApproveAppeal 공개 endpoint 부재**: `ActorPermissionFlags.canApproveAppeal=true`이지만 호스트/클럽 staff가 appeal을 UPHELD/REJECTED로 전이하는 공개 API 없음. admin API 소유만. | `DisputeAppealService.java`: `withdrawAppeal`만 구현. `approve/reject` 없음 | 호스트 앱에서 이의 승인/거절 액션 불가. UI 버튼만 존재 | appeal 공개 전이 endpoint 추가 또는 admin API 경로 UX 설계 |
| P2 | **sourceTypeCounts Dart 타입 안전성**: `HostInboxStats.sourceTypeCounts`가 `Map<String, int>`로 역직렬화되어 `HostInboxSourceType` enum key 보장 없음 | `host_inbox_stats.dart` | 잘못된 key 무시됨 | `Map<HostInboxSourceType, int>` 또는 parser 추가 |
| P2 | **caseId prefix와 DisputeSourceType 비대응**: `DisputeCaseQueryRepository`가 `OPERATIONAL_ISSUE:`, `SETTLEMENT_APPEAL:`, `EVENT_NO_SHOW:` 등 enum에 없는 prefix를 emit. Dart는 `DisputeSourceType.fromWire`로 파싱 실패 시 null | 소스 Javadoc + dossier §2-A | 신규 prefix 추가 시 Dart enum 갱신 필요. 현재는 알려진 21값만 처리 | Dart fallback 처리 또는 서버-클라 prefix 동기화 문서화 |
| P3 | **SLA 알림 운영자 처리 흐름 미명시**: `DisputeSlaExceededScheduler`가 `OperatorAlertType.DISPUTE_SLA_EXCEEDED`를 발행하지만 ops 대시보드 수신/처리 흐름이 PRD에 없음 | `DisputeSlaExceededScheduler.java:scanSlaExceeded` | 운영팀이 알림 수신 경로 인지 필요 | 운영자 알림 대시보드 문서화 |

## 9. 수용 기준

### AC-01. 참가자 케이스 목록 조회

Given 로그인 사용자가 `/me/disputes`에 진입한다.
When `GET /api/v1/me/dispute-cases?page=0&size=20`을 호출한다.
Then source별 finder 기준(OPERATIONAL_ISSUE reporter·WARNING_REPORT reporter·WARNING_APPEAL member·REPORT reporter(CARPOOL 제외)·DATE_BLOCK blocker·TRANSPORT reporter·CLUB_MEMBERSHIP_ACTION 영향받은 멤버·USER_DISPUTE 양측)에 해당하는 케이스가 `DisputeCaseVo` 목록으로 반환되고, Flutter가 caseId/status/caseType을 카드로 표시한다.

### AC-02. 호스트 케이스 목록 조회

Given 호스트가 `/host/disputes`에 진입한다.
When `GET /api/v1/host/dispute-cases`를 호출한다.
Then 자신이 settlement creator인 SETTLEMENT_APPEAL 케이스와 seller인 REFUND_DISPUTE 케이스만 반환된다.

### AC-03. 상세 조회 권한

Given 참가자가 자신이 관련된 케이스의 `/me/disputes/{caseId}`에 진입한다.
When `GET /api/v1/me/dispute-cases/{caseId}`를 호출한다.
Then `DisputeCaseDetailVo`가 반환되며 timeline은 PARTIES/PUBLIC_SUMMARY visibility 항목만 포함된다. CS_ONLY 항목은 포함되지 않는다.

### AC-04. evidenceFrozen 잠금

Given 케이스 status가 OPEN, IN_REVIEW, ESCALATED 중 하나다.
When 상세 조회 시 `evidenceFrozen=true`가 반환된다.
Then Flutter 상세 화면에서 증빙 삭제 버튼이 숨겨진다.

### AC-05. SLA 스케줄러

Given 케이스가 createdAt 기준 7일 이상 경과하고 active 상태다.
When `DisputeSlaExceededScheduler.scanSlaExceeded()`가 실행된다.
Then `OperatorAlertType.DISPUTE_SLA_EXCEEDED` 알림이 idempotency_key와 함께 발행된다. 같은 케이스는 중복 발행되지 않는다.

### AC-06. status 필터

Given 사용자가 목록 화면에서 "종결" 필터를 선택한다.
When `GET /api/v1/me/dispute-cases?status=CLOSED`를 호출한다.
Then CLOSED 케이스만 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | dispute 딥링크 | `NotificationRouter`에 USER_DISPUTE/CLUB_MEMBERSHIP_ACTION 케이스 라우팅 추가 |
| 구현 | appeal 승인/거절 공개 endpoint | 호스트용 `POST /host/dispute-cases/{caseId}/appeals/{appealId}/approve(reject)` 추가 여부 결정 |
| 운영 | SLA 알림 수신 경로 | 운영자 대시보드 또는 슬랙 등 알림 수신 채널 명시 필요 |
| 테스트 | union 정합성 검증 | 실제 emit source(사용자 7종+USER_DISPUTE / 호스트 2종) 각각에 대해 `caseId`, `status` 매핑, visibility 필터 시나리오 테스트 없음 |
