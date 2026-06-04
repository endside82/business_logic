# F18-05. 호스트 운영 인박스 PRD

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/ -->

## 1. 결론

호스트 운영 인박스는 주최자가 처리해야 할 문의·신청·정산 이의·신고·운영 이슈를 `HostInboxSourceType` 8종으로 통합하여 단일 화면에서 확인하는 기능이다. 서버는 `GET /api/v1/host/inbox`(페이지 목록)와 `GET /api/v1/host/inbox/stats`(집계) 두 endpoint를 제공한다.

`EVENT_MESSAGE` source는 스레드 단위 미응답 판정을 사용하여 `unansweredCount`를 계산한다. `DISPUTE_CASE` source 카드는 `disputeCaseId` 필드를 통해 `/host/disputes/{disputeCaseId}` 케이스 상세 화면으로 이동하는 딥링크를 제공한다.

`HostInboxService.collectAllItems`는 각 source를 최대 size=500으로 수집한 뒤 메모리 정렬 + `page()` 페이징을 수행한다(`HostInboxService.java:83,126,601`). 항목이 많을 경우 성능 위험이 있다.

`REPORT` source는 `ReportType.EVENT`(targetType=1) 타입만 조회한다(`HostInboxService.java:365-390`). EVENT_PHOTO 매칭은 소스 주석상 후속 wave 대상으로 현재 미구현이다.

실시간 업데이트(WebSocket/polling)는 미배선이다. Flutter `HostInboxScreen`의 `RefreshIndicator`는 `hostInboxNotifierProvider.refresh()`를 호출하며(`host_inbox_screen.dart:217`), pull-to-refresh만 지원한다. 화면 재진입 시 자동 invalidate 서술은 부정확하다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `host/controller/HostInboxController.java` | `GET /api/v1/host/inbox`, `GET /api/v1/host/inbox/stats` |
| Backend Service | `host/service/HostInboxService.java` | 8-source 통합, EVENT_MESSAGE 미응답 판정, DISPUTE_CASE 카드 |
| Backend Enum | `host/constants/HostInboxSourceType.java` | 8값 + 각 값 설명 |
| Backend Enum | `host/constants/HostInboxStatus.java` | NEEDS_RESPONSE/IN_PROGRESS/DONE |
| Backend Param | `host/param/HostInboxSearchParam.java` | 검색 파라미터 |
| Backend VO | `host/vo/HostInboxItemVo.java` | 필드 전체 |
| Backend VO | `host/vo/HostInboxStatsVo.java` | 필드 전체 |
| Flutter Screen | `lib/presentation/host/screens/host_inbox_screen.dart` | 3탭(NEEDS_RESPONSE/IN_PROGRESS/DONE), 카드 분기 |
| Flutter Model | `lib/data/models/host/host_inbox_item.dart` | `HostInboxItem` Freezed, `HostInboxSourceType` Dart enum |
| Flutter Model | `lib/data/models/host/host_inbox_stats.dart` | `HostInboxStats` Freezed |
| Flutter Provider | `lib/domain/providers/host/host_inbox_provider.dart` | 조회 Provider |
| Verification | 검증 없음 | — |

## 3. 전체 동작 흐름

1. 호스트가 `/host/inbox` 라우트로 진입한다.
2. `HostInboxScreen`이 `hostInboxProvider`를 구독하여 `GET /api/v1/host/inbox`를 호출한다.
3. 서버 `HostInboxService.getInbox(userId, param)`가 8개 source를 통합한 `Page<HostInboxItemVo>`를 반환한다. `EVENT_MESSAGE` source는 스레드 단위 미응답 수(`unansweredCount`)를 계산한다.
4. Flutter가 `HostInboxStatus` 3탭(NEEDS_RESPONSE/IN_PROGRESS/DONE)으로 항목을 분류하여 표시한다.
5. 각 카드에는 `sourceType.label`, `sourceType.icon`, `sourceType.accentColor`가 적용된다.
6. `EVENT_MESSAGE` 카드: `unansweredCount > 0`이면 "미응답 N" 배지를 표시한다.
7. `DISPUTE_CASE` 카드: 탭 시 `Routes.hostDisputeDetailFor(item.disputeCaseId ?? item.id)` → `/host/disputes/{caseId}` 상세 화면으로 이동.
8. 상단 헤더에서 `hostInboxStatsProvider` → `GET /api/v1/host/inbox/stats` 호출. `needsResponseCount`, `responseRatePercent`, `sourceTypeCounts` 등 표시.
9. 화면에서 pull-to-refresh 시 `refresh()`를 호출하여 최신 데이터를 재조회한다. 화면 재진입 시 자동 invalidate는 없다 (실시간 업데이트 미배선).

## 4. 서버 계약

### `GET /api/v1/host/inbox`

| 항목 | 실제 계약 |
|---|---|
| Controller | `HostInboxController#getInbox` |
| 인증 | JWT 필수 |
| Request | `@ModelAttribute HostInboxSearchParam` |
| Response | `Page<HostInboxItemVo>` |

### `GET /api/v1/host/inbox/stats`

| 항목 | 실제 계약 |
|---|---|
| Controller | `HostInboxController#getStats` |
| 인증 | JWT 필수 |
| Request | 없음 (인증 userId 기반) |
| Response | `HostInboxStatsVo` |

### `HostInboxSourceType` 8값

| 값 | 설명 | 미응답 판정 방식 |
|---|---|---|
| `EVENT_MESSAGE` | 이벤트 문의 스레드 (참가자→호스트) | 스레드 단위 미응답 판정 → `unansweredCount` |
| `APPLICATION` | 참가 신청 (PENDING / CANCEL_PENDING_REFUND) | status 기반 |
| `MEETING_SETTLEMENT_APPEAL` | 모임 정산 이의 제기 | status 기반 |
| `REPORT` | 호스트 이벤트(EVENT type만) target 공개 신고. EVENT_PHOTO 매칭은 후속 wave 미구현 | status 기반 |
| `PAYMENT_ISSUE` | OperationalIssue (PAYMENT/WALLET_TRANSACTION, relatedHostUserId=host) | status 기반 |
| `REFUND_ISSUE` | OperationalIssue (REFUND) + failed_refund 호스트 이벤트 entry | status 기반 |
| `OPERATIONAL_ISSUE` | OperationalIssue (SETTLEMENT/REGULAR_MEETING_SETTLEMENT, 호스트=정산 creator) | status 기반 |
| `DISPUTE_CASE` | Wave B-1 DisputeCaseQueryRepository#searchByHost 5개 도메인 통합 | `disputeCaseId` 경유 케이스 상세 이동 |

### `HostInboxItemVo` 필드

| 필드 | 타입 | nullable | 설명 |
|---|---|---|---|
| `id` | String | N | 인박스 항목 식별자 |
| `sourceType` | HostInboxSourceType | N | 8종 |
| `sourceId` | Long | N | 원천 row id |
| `eventId` | Long | Y | 관련 이벤트 |
| `clubId` | Long | Y | 관련 클럽 |
| `settlementId` | Long | Y | 관련 정산 |
| `transactionId` | Long | Y | 관련 트랜잭션 |
| `title` | String | N | 카드 제목 |
| `preview` | String | Y | 카드 미리보기 텍스트 |
| `actorUserId` | Long | Y | 액션 사용자 id |
| `actorNickname` | String | Y | 액션 사용자 닉네임 |
| `status` | HostInboxStatus | N | NEEDS_RESPONSE/IN_PROGRESS/DONE |
| `sensitive` | boolean | N | 민감 정보 마스킹 여부 |
| `createdAt` | LocalDateTime | Y | |
| `updatedAt` | LocalDateTime | Y | |
| `deepLinkType` | String | Y | 딥링크 타입 힌트 |
| `unansweredCount` | Integer | Y | EVENT_MESSAGE 전용: 미응답 메시지 수 |
| `disputeCaseId` | String | Y | DISPUTE_CASE 전용: 케이스 상세 이동용 caseId |

### `HostInboxStatsVo` 필드

| 필드 | 타입 | nullable | 설명 |
|---|---|---|---|
| `needsResponseCount` | int | N | NEEDS_RESPONSE 항목 수 |
| `inProgressCount` | int | N | IN_PROGRESS 항목 수 |
| `doneCount` | int | N | DONE 항목 수 |
| `totalCount` | long | N | 전체 항목 수 |
| `responseRatePercent` | int | N | 응답률 (%) |
| `averageResponseMinutes` | Long | Y | 평균 응답 시간 (분) |
| `sourceTypeCounts` | Map\<HostInboxSourceType, Long\> | N | source별 항목 수 |

### `HostInboxStatus` 3값

| 값 | 설명 |
|---|---|
| `NEEDS_RESPONSE` | 호스트 응답 필요 |
| `IN_PROGRESS` | 처리 중 |
| `DONE` | 완료 |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| 라우트 | `/host/inbox` (`Routes.hostInbox`) |
| Screen | `HostInboxScreen` |
| Provider(목록) | `hostInboxProvider` |
| Provider(통계) | `hostInboxStatsProvider` |
| API(목록) | `GET /api/v1/host/inbox` |
| API(통계) | `GET /api/v1/host/inbox/stats` |
| 탭 | NEEDS_RESPONSE / IN_PROGRESS / DONE (3탭) |
| EVENT_MESSAGE 카드 | `unansweredCount > 0`이면 "미응답 N" 배지 표시 |
| DISPUTE_CASE 카드 | `Routes.hostDisputeDetailFor(item.disputeCaseId ?? item.id)` → `/host/disputes/:caseId` |
| 통계 헤더 | `sourceTypeCounts` Map 기반 source별 카운트 배지 |
| 갱신 방법 | pull-to-refresh → `refresh()` 호출. 화면 재진입 시 자동 invalidate 없음 |

### Dart enum 정합 (`HostInboxSourceType`)

서버 `HostInboxSourceType`은 `SCREAMING_SNAKE_CASE`이며, Dart는 `@JsonEnum(valueField: 'value')`를 사용해 `camelCase` → `SCREAMING_SNAKE_CASE` wire 매핑한다.

| 서버 값 | Dart enum 값 | JSON wire | 판단 |
|---|---|---|---|
| `EVENT_MESSAGE` | `HostInboxSourceType.eventMessage` | `'EVENT_MESSAGE'` | 일치 |
| `APPLICATION` | `HostInboxSourceType.application` | `'APPLICATION'` | 일치 |
| `MEETING_SETTLEMENT_APPEAL` | `HostInboxSourceType.meetingSettlementAppeal` | `'MEETING_SETTLEMENT_APPEAL'` | 일치 |
| `REPORT` | `HostInboxSourceType.report` | `'REPORT'` | 일치 |
| `PAYMENT_ISSUE` | `HostInboxSourceType.paymentIssue` | `'PAYMENT_ISSUE'` | 일치 |
| `REFUND_ISSUE` | `HostInboxSourceType.refundIssue` | `'REFUND_ISSUE'` | 일치 |
| `OPERATIONAL_ISSUE` | `HostInboxSourceType.operationalIssue` | `'OPERATIONAL_ISSUE'` | 일치 |
| `DISPUTE_CASE` | `HostInboxSourceType.disputeCase` | `'DISPUTE_CASE'` | 일치 |

`HostInboxStatus`도 동일 패턴: `needsResponse`→`'NEEDS_RESPONSE'`, `inProgress`→`'IN_PROGRESS'`, `done`→`'DONE'`.

### `sourceTypeCounts` 타입 불일치

서버: `Map<HostInboxSourceType, Long>`. Dart: `Map<String, int>`. host_inbox_screen에서 `stats.sourceTypeCounts[sourceType.value]`로 String key 조회.

## 6. 상태/권한 매트릭스

| 시나리오 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 인박스 진입 | `getInbox(userId)` | `hostInboxProvider` | 8-source 통합 항목 목록 표시 | 일치 |
| EVENT_MESSAGE 미응답 존재 | `unansweredCount > 0` | "미응답 N" 배지 | 미응답 건수 배지 표시 | 일치 |
| DISPUTE_CASE 카드 탭 | `disputeCaseId` 있음 | `hostDisputeDetailFor(disputeCaseId)` | 케이스 상세 화면으로 이동 | 일치 |
| DISPUTE_CASE 카드 탭 (disputeCaseId null) | `disputeCaseId=null` | `hostDisputeDetailFor(item.id)` | item.id로 폴백 이동 | 일치(fallback) |
| NEEDS_RESPONSE 필터 탭 | 서버 `status=NEEDS_RESPONSE` | 탭별 필터링 | NEEDS_RESPONSE 항목만 표시 | 일치 |
| 통계 헤더 | `getStats(userId)` | `hostInboxStatsProvider` | 응답률, source별 카운트 | 일치 |
| 실시간 업데이트 | 미배선 | pull-to-refresh만 지원. 화면 재진입 자동 갱신 없음 | stale 가능 | Gap |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `HostInboxSourceType` 8값 | Java enum `SCREAMING_SNAKE_CASE` | Dart `@JsonEnum(valueField: 'value')` | 일치 |
| `HostInboxStatus` 3값 | Java enum | Dart `@JsonEnum(valueField: 'value')` | 일치 |
| `unansweredCount` | `Integer?` VO | `int? unansweredCount` Dart | 일치 |
| `disputeCaseId` | `String?` VO | `String? disputeCaseId` Dart | 일치 |
| `sensitive` | `boolean` | `@Default(false) bool sensitive` | 일치 |
| `sourceTypeCounts` | `Map<HostInboxSourceType, Long>` | `Map<String, int>` | 부분 불일치 (String key) |
| `Page<HostInboxItemVo>` | Spring Page | `PageResponse<HostInboxItem>` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | **dispute 딥링크 미배선**: FCM 알림에서 분쟁 관련 신규 알림 타입 클릭 시 `NotificationRouter`에 라우팅 없어 홈으로 fall-through. `REFUND_DISPUTE_CREATED`(92)/`UPHELD`(93)/`OVERTURNED`(94) 기존 3개만 처리. | `notification_router.dart` grep 0건 | 분쟁 알림 클릭 시 인박스 또는 케이스 상세로 이동 불가 | `NotificationRouter`에 분쟁 신규 타입 라우팅 추가 |
| P2 | **HostInboxService 성능**: 각 source를 size=500까지 수집 후 메모리 정렬/page() 페이징. 인박스 항목 많을 시 N+1 + 메모리 부하. | `HostInboxService.java:83,126,601` | 응답 지연, OOM 가능 | DB 집계 쿼리로 전환 또는 cursor-based pagination |
| P2 | **실시간 업데이트 미배선**: WebSocket/polling 없음. pull-to-refresh만 지원. | `host_inbox_screen.dart:217` — refresh()만 | 미응답 건수가 stale 가능. 새 문의 수신을 즉각 알 수 없음 | 주기적 polling 또는 FCM push → invalidate 연결 |
| P2 | **sourceTypeCounts 타입 안전성**: `Map<String, int>`로 역직렬화. 잘못된 key 무시됨. | `host_inbox_stats.dart` | 새 source type 추가 시 통계 카운트 누락 가능 | `Map<HostInboxSourceType, int>` 또는 extension parser 추가 |
| P3 | **NoShowRefundScreen 진입점**: `hostNoShowRefund` 라우트(`/host/disputes/:caseId/no-show-refund/:applicationId`)는 `app_router.dart:989-997`에서 `asHost:true` 케이스 상세에서만 연결됨. 인박스에서 직접 진입하는 경로 별도 없음. | `app_router.dart` | 노쇼 환불 화면으로의 경로가 한정적 | UX 검토 후 인박스 → 노쇼 환불 직접 진입 경로 추가 검토 |

## 9. 수용 기준

### AC-01. 호스트 인박스 목록 조회

Given 로그인 호스트가 `/host/inbox`에 진입한다.
When `GET /api/v1/host/inbox?page=0&size=20`을 호출한다.
Then 자신이 호스트인 이벤트/클럽 관련 8개 source 항목이 `HostInboxStatus` 탭별로 표시된다.

### AC-02. EVENT_MESSAGE 미응답 배지

Given 이벤트 문의 스레드에 호스트가 답변하지 않은 메시지가 2건 있다.
When 인박스 목록에서 해당 EVENT_MESSAGE 카드를 표시한다.
Then 카드에 "미응답 2" 배지가 표시된다.

### AC-03. DISPUTE_CASE 카드 이동

Given 인박스에 `sourceType=DISPUTE_CASE` 카드가 있고 `disputeCaseId="APPLICATION:12345"`다.
When 카드를 탭한다.
Then `Routes.hostDisputeDetailFor("APPLICATION:12345")` → `/host/disputes/APPLICATION:12345` 케이스 상세 화면으로 이동한다.

### AC-04. 통계 조회

Given 호스트가 `/host/inbox`에 진입한다.
When `GET /api/v1/host/inbox/stats`를 호출한다.
Then `HostInboxStats`에 `needsResponseCount`, `responseRatePercent`, `sourceTypeCounts` 등이 반환되고 헤더에 표시된다.

### AC-05. NEEDS_RESPONSE 탭 필터

Given 인박스에 NEEDS_RESPONSE 3건, IN_PROGRESS 2건, DONE 5건이 있다.
When NEEDS_RESPONSE 탭을 선택한다.
Then 3건의 NEEDS_RESPONSE 항목만 표시된다.

### AC-06. pull-to-refresh 재조회

Given 호스트가 인박스 화면에서 목록을 아래로 당긴다.
When pull-to-refresh 동작이 실행된다.
Then `hostInboxNotifierProvider.refresh()`가 호출되어 `GET /api/v1/host/inbox`를 재호출하고 최신 데이터를 표시한다. 화면 재진입 자동 invalidate는 없다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | dispute 딥링크 | `NotificationRouter`에 인박스/케이스 상세 라우팅 추가 |
| 구현 | HostInboxService 성능 | DB 집계 쿼리로 전환. size=500 전량 조회 제거 |
| 구현 | 실시간 업데이트 | FCM push → provider invalidate 연결 또는 polling 주기 설정 |
| 정책 | 인박스 항목 보존 기간 | DONE 항목을 언제까지 인박스에 유지할지 정책 결정 |
| 테스트 | 8-source 통합 정합성 | 각 source 항목이 올바른 탭·카드로 표시되는지 시나리오 테스트 없음 |
