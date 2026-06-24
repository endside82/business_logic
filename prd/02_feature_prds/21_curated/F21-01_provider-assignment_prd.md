# F21-01. 제공자 배정 PRD

<!-- source-first; updated: 2026-06-24; source: community_api curated/ + community_app lib/…/curated/ -->

## 1. 결론

서비스 제공자 배정은 호스트가 이벤트에 인력(강사 등)을 배정하고, 외부 제공자가 수락/거절하며, 호스트가 확정(CONFIRMED)하거나 취소하는 계약 관리 기능이다.

상태머신 7값(`AssignmentStatus`: DRAFT·ASSIGNED·ACCEPTED·DECLINED·CONFIRMED·SETTLEMENT_LOCKED·CANCELED)은 enum이 전이 허용집합을 소유하고 엔티티 `transitionTo()`가 위반 시 `ASSIGNMENT_INVALID_STATE`를 던지는 설계로 완전히 서버에서 시행된다. 불법 전이는 서버에서 차단되며 클라이언트 CTA는 현재 상태에 맞는 동작만 허용한다.

IDOR는 `/api/v1/events/{eventId}/assignments`(호스트/co-host 전용)와 `/api/v1/me/assignments`(제공자 본인 IDOR-safe)를 분리해 시행한다. 배정 owner는 `event_id` 단독(정기모임 회차도 event로 귀결 — `regular_meeting_id` XOR 없음).

자기 배정(호스트=제공자)은 `AssignmentSource.HOST_MANUAL`로 허용되며, 이 경우 배정 생성 즉시 ASSIGNED가 아닌 ACCEPTED로 자동 전이된다(서버 소스: `ServiceAssignmentService`).

Flutter 앱은 `EventAssignmentsNotifier`(호스트 시점), `MyAssignmentsNotifier`(제공자 시점) 두 notifier로 분리해 배정 목록과 액션을 관리한다. per-slice Codex 합의 PASS.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `curated/controller/ServiceAssignmentController.java` | POST `/events/{eventId}/assignments`, GET 목록, `/confirm`, `/cancel`, GET `/me/assignments`, POST `/me/assignments/{id}/accept`, POST `/me/assignments/{id}/reject` |
| Backend Service | `curated/service/ServiceAssignmentService.java` | `createAssignment`, `confirm`, `cancel`, `accept`, `decline`, `getEventAssignments`, `getProviderAssignments` |
| Backend Entity | `curated/model/ServiceAssignment.java` | 7 필드: hostUserId/providerUserId/eventId/assignmentSource/status/fulfillmentStatus/providerRole + engagementId + @Version 낙관락 |
| Backend Enum | `curated/constants/AssignmentStatus.java` | 7값 + `getAllowedTransitions()` 소유, `transitionTo()` ASSIGNMENT_INVALID_STATE |
| Backend Enum | `curated/constants/AssignmentSource.java` | HOST_MANUAL·HOST_INVITE_ACCEPTED·PROVIDER_APPLY·ADMIN_ASSIGNED (4값) |
| Backend Enum | `curated/constants/FulfillmentStatus.java` | PENDING·IN_PROGRESS·FULFILLED·PARTIALLY_FULFILLED·NO_SHOW·DISPUTED (6값) |
| Backend Port | `curated/port/CuratedEventAccessPort.java` | `assertHostOrCoHost`, `eventExists`, `assertRegularMeetingHost` |
| Backend VO | `curated/vo/ServiceAssignmentVo.java` | id/hostUserId/providerUserId/eventId/assignmentSource/status/fulfillmentStatus/providerRole/serviceFeeGross/platformFee/withholdingTax/netAmount/engagementId/timestamps |
| Frontend API | `data/api/service_assignment_api.dart` | Retrofit 엔드포인트 전 목록, `ServiceAssignmentCreateParam`, `ServiceAssignmentCancelParam` |
| Frontend Model | `data/models/curated/service_assignment_vo.dart` | `AssignmentStatus`(7값) · `AssignmentSource`(4값) · `FulfillmentStatus`(6값) Dart enum — 서버 verbatim |
| Frontend Providers | `domain/providers/curated/service_assignment_provider.dart` | `EventAssignmentsNotifier`, `MyAssignmentsNotifier`, keepAlive: true API/Repository 체인 |
| Frontend Screens | `presentation/curated/screens/assignment_create_screen.dart`, `event_assignments_screen.dart`, `my_assignments_screen.dart` | 화면 진입·CTA |
| Verification | `community_api` 테스트 `ServiceAssignmentServiceTest` 계열 | 상태 전이·IDOR·자기배정 동작 확인 |

## 3. 전체 동작 흐름

### 시나리오 A: 호스트가 외부 제공자를 배정하고 수락 후 확정

1. 호스트가 이벤트 상세 화면의 "제공자 배정" CTA를 통해 `AssignmentCreateScreen`으로 진입한다.
2. 호스트가 제공자 userId, providerRole(강사 종류), assignmentSource를 입력하고 제출한다.
3. `EventAssignmentsNotifier.create(param)`가 `ServiceAssignmentRepository.create(eventId, param)`를 호출한다.
4. 서버 `POST /api/v1/events/{eventId}/assignments` → `ServiceAssignmentService.createAssignment(hostUserId, eventId, providerUserId, source, role)`.
5. 서버가 `CuratedEventAccessPort.assertHostOrCoHost(eventId, hostUserId)`로 권한 검증, `eventExists(eventId)` 확인, `UNIQUE(event_id, provider_user_id)` 충돌 여부 확인.
6. source=HOST_MANUAL이고 providerUserId≠hostUserId이면 status=ASSIGNED(외부 제공자 수락 대기). providerUserId==hostUserId면 status=ACCEPTED(자기 배정 즉시 수락).
7. 서버가 `ServiceAssignmentVo`를 201로 반환. Flutter가 목록을 갱신한다.
8. 외부 제공자는 `MyAssignmentsNotifier` → `GET /api/v1/me/assignments`로 자신에게 온 배정을 본다.
9. 제공자가 `수락` CTA → `POST /api/v1/me/assignments/{assignmentId}/accept` → ASSIGNED→ACCEPTED.
10. 호스트가 ACCEPTED 배정을 `EventAssignmentsScreen`에서 확인하고 "확정" CTA → `POST /api/v1/events/{eventId}/assignments/{assignmentId}/confirm` → ACCEPTED→CONFIRMED.
11. CONFIRMED 이후 서비스비 과금(F21-02)·정산(F21-03)이 가능해진다.

### 시나리오 B: 제공자가 배정을 거절

1. 외부 제공자가 `MyAssignmentsScreen`에서 배정 카드를 확인한다.
2. "거절" CTA → `POST /api/v1/me/assignments/{assignmentId}/reject` → ASSIGNED→DECLINED(terminal).
3. 서버가 `ServiceAssignmentVo`(status=DECLINED)를 반환. 호스트는 목록 재조회 시 DECLINED 상태를 확인하고 새 제공자를 배정할 수 있다.

### 시나리오 C: 배정 취소

1. 호스트가 DRAFT·ASSIGNED·ACCEPTED·CONFIRMED 상태의 배정을 취소한다.
2. `POST /api/v1/events/{eventId}/assignments/{assignmentId}/cancel` + `ServiceAssignmentCancelParam(reason)`.
3. 서버가 상태 전이 검증 후 →CANCELED(terminal). SETTLEMENT_LOCKED 이후는 취소 불가.
4. 계약금(engagement)이 있는 배정을 취소하면 `ServiceAssignmentSettlementService.forfeitOnAssignmentCancel()`이 호출되어 PAID 계약금을 제공자 forfeit(비환불)한다.

## 4. 서버 계약

### `POST /api/v1/events/{eventId}/assignments`

| 항목 | 계약 |
|---|---|
| 인증 | 필수 (`@AuthenticationPrincipal UserPrincipal`) |
| 권한 | `CuratedEventAccessPort.assertHostOrCoHost(eventId, userId)` |
| Request body | `ServiceAssignmentCreateParam` — `providerUserId: long`, `assignmentSource: AssignmentSource`, `providerRole: String?` |
| 응답 | `ServiceAssignmentVo` 201 |
| 멱등 제약 | `UNIQUE(event_id, provider_user_id)` — 이미 배정된 제공자 재배정 시 DB constraint 위반 |
| 자기 배정 | providerUserId==caller → status=ACCEPTED (자동 수락) |
| 외부 배정 | providerUserId≠caller → status=ASSIGNED (수락 대기) |

### `GET /api/v1/events/{eventId}/assignments`

| 항목 | 계약 |
|---|---|
| 권한 | `CuratedEventAccessPort.assertHostOrCoHost(eventId, userId)` |
| 응답 | `List<ServiceAssignmentVo>` (PageResponse 아님) |

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/confirm`

| 항목 | 계약 |
|---|---|
| 권한 | `assertHostOrCoHost` |
| 전이 | ACCEPTED → CONFIRMED (`AssignmentStatus.getAllowedTransitions()`) |
| 실패 | ACCEPTED 아닌 상태에서 호출 시 `ASSIGNMENT_INVALID_STATE` |
| 응답 | `ServiceAssignmentVo` 200 |

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/cancel`

| 항목 | 계약 |
|---|---|
| 권한 | `assertHostOrCoHost` |
| 전이 | DRAFT·ASSIGNED·ACCEPTED·CONFIRMED → CANCELED. SETTLEMENT_LOCKED·DECLINED·CANCELED → 불가 |
| 부수 효과 | 계약금 PAID 배정: `forfeitOnAssignmentCancel` 호출(계약금 제공자 귀속) |
| Request body | `ServiceAssignmentCancelParam(reason: String?)` |
| 응답 | `ServiceAssignmentVo` 200 |

### `GET /api/v1/me/assignments`

| 항목 | 계약 |
|---|---|
| 접근 | 인증된 사용자 본인만. IDOR-safe: principal 고정 |
| 응답 | `List<ServiceAssignmentVo>` (나에게 온 배정만) |

### `POST /api/v1/me/assignments/{assignmentId}/accept`

| 항목 | 계약 |
|---|---|
| 권한 | `assignmentId`의 `providerUserId == principal.userId` (서버 검증) |
| 전이 | ASSIGNED → ACCEPTED |
| 응답 | `ServiceAssignmentVo` 200 |

### `POST /api/v1/me/assignments/{assignmentId}/reject`

| 항목 | 계약 |
|---|---|
| 권한 | `assignmentId`의 `providerUserId == principal.userId` |
| 전이 | ASSIGNED → DECLINED (terminal) |
| 응답 | `ServiceAssignmentVo` 200 |

### `ServiceAssignmentVo` 핵심 필드

| 필드 | Java 타입 | Dart 타입 | 비고 |
|---|---|---|---|
| `id` | `Long` | `int?` | 생성 전 null |
| `hostUserId` | `long` | `int` | |
| `providerUserId` | `long` | `int` | |
| `eventId` | `long` | `int` | owner 단일 grain |
| `assignmentSource` | `AssignmentSource` | `AssignmentSource` enum | 4값 verbatim |
| `status` | `AssignmentStatus` | `AssignmentStatus` enum | 7값 verbatim |
| `fulfillmentStatus` | `FulfillmentStatus` | `FulfillmentStatus` enum | 6값 verbatim |
| `providerRole` | `String?` | `String?` | taxonomy 미확정 |
| `serviceFeeGross` | `BigDecimal` | `double?` | 과금 전 null |
| `engagementId` | `Long?` | `int?` | 계약금 모드 식별자 |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| 호스트 목록 Provider | `EventAssignmentsNotifier(eventId)` — `@riverpod` auto-dispose |
| 제공자 목록 Provider | `MyAssignmentsNotifier` — `@riverpod` |
| API 체인 | `serviceAssignmentApiProvider`(keepAlive) → `serviceAssignmentRepositoryProvider`(keepAlive) → Notifier |
| 배정 생성 화면 | `AssignmentCreateScreen` |
| 호스트 배정 목록 화면 | `EventAssignmentsScreen` |
| 제공자 배정 목록 화면 | `MyAssignmentsScreen` |
| 디자인 | `presentation/curated/widgets/assignment_design.dart` |
| 피커 | `presentation/curated/widgets/assignment_pickers.dart` |
| 에러 | `Result.failure(ApiError)` → `AppErrorState(title:)` |

CTA 분기:

| 사용자/상태 | 표시 CTA |
|---|---|
| 호스트 + ASSIGNED | 취소(cancel) |
| 호스트 + ACCEPTED | 확정(confirm) / 취소(cancel) |
| 호스트 + CONFIRMED | 서비스비 설정(service-fee) / 과금(charge) / 정산(settle) / 취소(cancel) |
| 호스트 + SETTLEMENT_LOCKED | (터미널, 액션 없음) |
| 제공자 + ASSIGNED | 수락(accept) / 거절(reject) |
| 제공자 + ACCEPTED | (확정 대기) |
| 제공자 + CONFIRMED | (정산 대기) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + 신규 배정 | `assertHostOrCoHost` 통과 + UNIQUE 제약 | `EventAssignmentsNotifier.create()` | 배정 생성 201, 목록 갱신 | 일치 |
| 호스트 + 자기 배정 | providerUserId==caller → status=ACCEPTED 즉시 | 동일 create 흐름 | 수락 단계 없이 바로 ACCEPTED | 일치 |
| 호스트 + 중복 배정 | `UNIQUE(event_id, provider_user_id)` constraint | `ApiError.conflict` | 에러 표시 | 일치 |
| 제공자 + ASSIGNED 배정 수신 | `providerUserId` 일치 검증 | `MyAssignmentsNotifier` GET | 수락/거절 CTA | 일치 |
| 제공자 + 타인 배정 accept 시도 | 서버가 `providerUserId` 불일치 → 예외 | API 에러 | 권한 에러 | 일치 |
| 비호스트 + 목록 조회 | `assertHostOrCoHost` 실패 → 예외 | API 403 → `ApiError.forbidden` | 접근 차단 | 일치 |
| SETTLEMENT_LOCKED 취소 시도 | `isTerminal()=true` → `ASSIGNMENT_INVALID_STATE` | API 에러 | 상태 전이 불가 에러 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `AssignmentStatus` enum 7값 | DRAFT·ASSIGNED·ACCEPTED·DECLINED·CONFIRMED·SETTLEMENT_LOCKED·CANCELED | Dart `AssignmentStatus` 7값 verbatim | 일치 |
| `AssignmentSource` enum 4값 | HOST_MANUAL·HOST_INVITE_ACCEPTED·PROVIDER_APPLY·ADMIN_ASSIGNED | Dart `AssignmentSource` 4값 verbatim | 일치 |
| `FulfillmentStatus` enum 6값 | PENDING·IN_PROGRESS·FULFILLED·PARTIALLY_FULFILLED·NO_SHOW·DISPUTED | Dart `FulfillmentStatus` 6값 verbatim | 일치 |
| `ServiceAssignmentVo` 필드 | Java BigDecimal serviceFeeGross | Dart double? serviceFeeGross | 일치 (BigDecimal→double) |
| 응답 타입 | `List<ServiceAssignmentVo>` (비페이지네이션) | `Future<List<ServiceAssignmentVo>>` Retrofit | 일치 |
| 낙관락 | `@Version Long version` on ServiceAssignment | 클라이언트 미노출 | 서버 단독 처리, 정합 |
| owner grain | `event_id` 단독 | `ServiceAssignmentVo.eventId` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| Gap | `providerRole` taxonomy 미확정 | `ServiceAssignment.providerRole`은 varchar(30) 자유 입력. 서버/앱 모두 enum 없음 | 강사 종류 분류 불가, 운영 데이터 비정형 | product 결정 후 enum 확정 |
| Gap | 정기모임 일괄 배정(F21-07) — 배정 후 회차별 화면 진입 방법 | 앱 라우트가 정기모임 배정 전용 화면 없이 인라인 CTA로 처리 | 다회차 배정 상태 추적이 단건 화면에서 어려울 수 있음 | F21-07 PRD 작성 시 상세 확인 |
| Risk | ACCEPTED 배정이 서비스비 설정 전에 확정(CONFIRMED) 가능 | `confirm` 엔드포인트가 `serviceFeeGross` 설정 여부를 검증하지 않음 | 과금 없이 정산 흐름 진입 가능 — 완납 게이트(F21-03)가 Σ==0이면 수금액 모드로 처리 | 수금액 모드(serviceFeeGross=0) 정산은 정책상 허용. 별도 차단 불필요 |

## 9. 수용 기준

### AC-01. 외부 제공자 배정 생성

Given 호스트가 이벤트의 호스트/co-host이고 해당 이벤트에 이 제공자를 처음 배정한다.
When `POST /api/v1/events/{eventId}/assignments`에 `providerUserId`, `assignmentSource=HOST_MANUAL`, `providerRole`을 전송한다.
Then 서버는 201과 `ServiceAssignmentVo(status=ASSIGNED)`를 반환하고, 제공자의 `/me/assignments` 목록에 해당 배정이 나타난다.

### AC-02. 자기 배정 즉시 수락

Given 호스트가 자신을 providerUserId로 지정해 배정한다.
When `POST /api/v1/events/{eventId}/assignments`를 호출한다.
Then 서버는 `ServiceAssignmentVo(status=ACCEPTED)`를 반환한다(ASSIGNED 단계 없음).

### AC-03. 중복 배정 차단

Given 동일 이벤트에 동일 제공자가 이미 배정됐다.
When 호스트가 같은 `(eventId, providerUserId)` 조합으로 재배정을 시도한다.
Then 서버는 DB `UNIQUE(event_id, provider_user_id)` 제약으로 요청을 거부하고 Flutter는 에러를 표시한다.

### AC-04. 제공자 수락

Given 배정 status=ASSIGNED이고 인증된 사용자가 해당 배정의 providerUserId다.
When `POST /api/v1/me/assignments/{assignmentId}/accept`를 호출한다.
Then 서버는 `ServiceAssignmentVo(status=ACCEPTED)`를 반환한다.

### AC-05. 제공자 거절

Given 배정 status=ASSIGNED이고 인증된 사용자가 해당 배정의 providerUserId다.
When `POST /api/v1/me/assignments/{assignmentId}/reject`를 호출한다.
Then 서버는 `ServiceAssignmentVo(status=DECLINED)`를 반환하고 이후 어떤 전이도 불가하다(terminal).

### AC-06. 호스트 확정

Given 배정 status=ACCEPTED다.
When 호스트가 `POST /api/v1/events/{eventId}/assignments/{assignmentId}/confirm`을 호출한다.
Then 서버는 `ServiceAssignmentVo(status=CONFIRMED)`를 반환한다. 이제 서비스비 설정과 과금이 가능해진다.

### AC-07. CONFIRMED 이후 취소 불가 사례(SETTLEMENT_LOCKED)

Given 배정 status=SETTLEMENT_LOCKED(terminal)다.
When 호스트가 cancel을 시도한다.
Then 서버는 `ASSIGNMENT_INVALID_STATE` 에러를 반환하고 Flutter는 에러를 표시한다.

### AC-08. 비호스트 배정 목록 접근 차단

Given 인증된 사용자가 해당 이벤트의 호스트/co-host가 아니다.
When `GET /api/v1/events/{eventId}/assignments`를 호출한다.
Then 서버는 `ASSIGNMENT_NOT_FOUND` 또는 권한 에러를 반환한다.

### AC-09. 제공자 타인 배정 수락 시도 차단

Given 인증된 사용자의 userId가 해당 assignmentId의 providerUserId와 다르다.
When `POST /api/v1/me/assignments/{assignmentId}/accept`를 호출한다.
Then 서버가 예외를 반환하고 Flutter는 에러를 표시한다(IDOR 차단).

### AC-10. 취소 시 계약금 forfeit

Given 배정에 engagement가 있고 계약금 status=PAID(미적용)인 상태에서 배정을 취소한다.
When `POST .../cancel`이 성공한다.
Then `ServiceAssignmentSettlementService.forfeitOnAssignmentCancel`이 호출되어 계약금이 제공자 earning으로 귀속된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| Product | `providerRole` taxonomy | 강사/MC/진행자 등 종류 확정 후 enum 또는 선택지 목록 배포. 현재 자유 입력 varchar(30) |
| 테스트 | IDOR 크로스 제공자 accept | 타인 배정 수락 시도를 서버 단위 테스트로 확인. 현재 명시적 테스트 케이스 미확인 |
| 테스트 | 낙관락 동시 확정 경합 | 동일 배정에 두 호스트가 동시 confirm 시 @Version 낙관락 동작 검증 미확인 |
| UX | 정기모임 다회차 배정 진입 경로 | F21-07 PRD에서 라우트 설계 확인 필요 |
