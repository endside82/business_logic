# F21-01. 제공자 배정 PRD

<!-- source-first; updated: 2026-07-29; source: community_api curated/ + provider/ + community_admin_api provider/ + community_app curated/ + provider/ -->

## 1. 결론

서비스 제공자 배정은 기존의 userId 직접 배정에 더해, 검증된 제공자 프로필과 공개 상품을 검색하고
상품 스냅샷으로 배정한 뒤 버전형 계약조건을 상호 수락하는 마켓플레이스 기능까지 포함한다.

상태머신 7값(`AssignmentStatus`: DRAFT·ASSIGNED·ACCEPTED·DECLINED·CONFIRMED·SETTLEMENT_LOCKED·CANCELED)은 enum이 전이 허용집합을 소유하고 엔티티 `transitionTo()`가 위반 시 `ASSIGNMENT_INVALID_STATE`를 던지는 설계로 완전히 서버에서 시행된다. 불법 전이는 서버에서 차단되며 클라이언트 CTA는 현재 상태에 맞는 동작만 허용한다.

IDOR는 `/api/v1/events/{eventId}/assignments`(호스트/co-host 전용)와 `/api/v1/me/assignments`(제공자 본인 IDOR-safe)를 분리해 시행한다. 배정 owner는 `event_id` 단독(정기모임 회차도 event로 귀결 — `regular_meeting_id` XOR 없음). 다만 현재 `confirm`과 `cancel` controller는 path의 `eventId`를 서비스에 전달하지 않고, 서비스가 assignment의 실제 `eventId`로 권한을 검사한다. 타 이벤트 권한 상승은 없지만 path와 실제 owner가 같다는 route invariant는 강제되지 않는다.

자기 direct 배정(호스트=제공자)은 `AssignmentSource.HOST_MANUAL`로 허용되며 생성 즉시 ACCEPTED다.
반면 카탈로그 자기 배정은 ASSIGNED로 생성되고 호스트의 조건 제안이 자동 수락된다. 카탈로그 배정은
일반 `/accept`가 금지되고 반드시 계약조건 수락 흐름을 거친다.

Flutter 앱은 `EventAssignmentsNotifier`(호스트 시점), `MyAssignmentsNotifier`(제공자 시점) 두 notifier로
분리해 배정 목록과 액션을 관리한다. 핵심 경로는 구현돼 있으나 confirm/cancel의 path `eventId` 소유
불변은 아래 Gap처럼 비어 있다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `curated/controller/ServiceAssignmentController.java` | POST `/events/{eventId}/assignments`, GET 목록, `/confirm`, `/cancel`, GET `/me/assignments`, POST `/me/assignments/{id}/accept`, POST `/me/assignments/{id}/reject` |
| Backend Service | `curated/service/ServiceAssignmentService.java` | `createAssignment`, `confirm`, `cancel`, `accept`, `decline`, `getEventAssignments`, `getProviderAssignments` |
| Backend Provider | `provider/controller/*`, `provider/service/*` | 프로필 8개, 상품 소유자 8개, 공개 카탈로그 2개 엔드포인트 |
| Backend Terms | `CatalogAssignmentService`, `ServiceAssignmentTermsService`, `PlatformFeePolicy` | 카탈로그 배정 1개 + 조건 제안/견적/수락/조회 4개, 버전·수수료 스냅샷 |
| Admin Provider | `community_admin_api/.../provider/` | 심사 큐·상세·판정·문서 URL·상품 정지/해제 8개 |
| Backend Entity | `curated/model/ServiceAssignment.java` | event/provider 유일성, 상품·조건 버전 포인터, 이행상태, @Version 낙관락 |
| Backend Enum | `curated/constants/AssignmentStatus.java` | 7값 + `getAllowedTransitions()` 소유, `transitionTo()` ASSIGNMENT_INVALID_STATE |
| Backend Enum | `curated/constants/AssignmentSource.java` | HOST_MANUAL·HOST_INVITE_ACCEPTED·PROVIDER_APPLY·ADMIN_ASSIGNED·CATALOG (5값) |
| Backend Enum | `curated/constants/FulfillmentStatus.java` | PENDING·IN_PROGRESS·FULFILLED·PARTIALLY_FULFILLED·NO_SHOW·DISPUTED (6값) |
| Backend Port | `curated/port/CuratedEventAccessPort.java` | `assertHostOrCoHost`, `eventExists`, `assertRegularMeetingHost` |
| Backend VO | `curated/vo/ServiceAssignmentVo.java` | 제공자 identity, source/status/fulfillment, role/fee/engagement, offering snapshot, current/accepted terms version |
| Frontend API | `data/api/service_assignment_api.dart` | Retrofit 엔드포인트 전 목록, `ServiceAssignmentCreateParam`, `ServiceAssignmentCancelParam` |
| Frontend Model | `data/models/curated/service_assignment_vo.dart` | 서버 enum 값 + 역호환용 client-only `unknown` sentinel |
| Frontend Providers | `domain/providers/curated/service_assignment_provider.dart` | `EventAssignmentsNotifier`, `MyAssignmentsNotifier`, keepAlive: true API/Repository 체인 |
| Frontend Screens | `presentation/curated/screens/assignment_create_screen.dart`, `event_assignments_screen.dart`, `my_assignments_screen.dart` | 화면 진입·CTA |
| Verification | `community_api` 테스트 `ServiceAssignmentServiceTest` 계열 | 상태 전이·IDOR·자기배정 동작 확인 |

## 2-A. 2026-07-29 제공자 마켓플레이스 실측

### 공개 프로필·검증

- `ProviderType`은 INDIVIDUAL/BUSINESS다. BUSINESS는 숫자 10자리 사업자번호가 필수이며 AES 암호문과
  HMAC 유일성 해시로 저장하고 응답은 끝 5자리만 마스킹한다.
- 검증 상태는 NONE → PENDING → VERIFIED/REJECTED/NEEDS_MORE_INFO다. 제출은 NONE·REJECTED·
  NEEDS_MORE_INFO에서만 가능하며, 소유자가 업로드 완료한 `FilePurpose.PROVIDER_DOC` 파일만 받는다.
- 공개 프로필은 self-hidden, admin-suspended, 차단 관계 중 하나라도 해당하면 404로 감춘다.

### 상품·카탈로그

| 항목 | 실제 계약 |
|---|---|
| 카테고리 | VEHICLE·VENUE·LABOR·OTHER |
| 가격모델 | FIXED·PER_PERSON·PER_HOUR·PER_DAY·QUOTE. QUOTE만 basePrice=null, 나머지는 양수 |
| 지역 | `Sido` 17개 시·도 코드 |
| 상태 | DRAFT·ACTIVE·PAUSED·SUSPENDED·ARCHIVED |
| 활성화 | 사진 1장 이상. VEHICLE/VENUE는 VERIFIED 필수, LABOR/OTHER는 미검증 경고 후 가능 |
| 공개조회 | ACTIVE이고 profile이 visible이며 양방향 차단이 없어야 함. category/region/price/range/sort/page/size 필터 |
| 사진 | 완료된 `OFFERING_PHOTO`만 허용, 순서 변경은 전체 사진의 완전한 순열이어야 함 |

### 카탈로그 배정·계약조건

`POST /api/v1/events/{eventId}/assignments/from-catalog`는 호스트/co-host 권한을 먼저 확인한 뒤 공개 가능한
상품을 조회한다. `providerUserId`, `assignmentSource=CATALOG`, offering 제목·카테고리·버전은 서버가
결정한다. 유일성은 **이벤트 전체 한 명**이 아니라 `(eventId, providerUserId)`라서 서로 다른 제공자는
같은 이벤트에 각각 배정할 수 있다.

조건은 배정별 불변 버전으로 누적된다. 호스트 고정가 제안과 제공자 견적 제출 모두 `X=agreedGross>0`,
`D=depositGross>=0`, D>0이면 D<X다. 견적은 미래의 `expiresAt`이 필수다. 상대방만 최신 버전을 수락할
수 있고, `expectedTermsVersion`은 항상 필수다. 호스트 제안 수락에는
`expectedFeePolicyVersion`도 필수이며 견적 수락은 제출 시 캡처한 정책을 쓴다.

| 표면 | 실제 엔드포인트 |
|---|---|
| 내 프로필 | `POST/GET/PUT /api/v1/providers/me`, `POST /me/visibility` |
| 검증 | `POST/GET /api/v1/providers/me/documents`, `GET /me/verification-history` |
| 공개 프로필 | `GET /api/v1/providers/{userId}` |
| 내 상품 | `POST/GET /api/v1/providers/me/offerings`, `GET/PUT /{offeringId}`, `POST /{offeringId}/status` |
| 상품 사진 | `POST /{offeringId}/photos`, `DELETE /{offeringId}/photos/{photoId}`, `PUT /{offeringId}/photos/order` |
| 공개 카탈로그 | `GET /api/v1/providers/offerings`, `GET /api/v1/providers/offerings/{offeringId}` |
| 카탈로그 배정 | `POST /api/v1/events/{eventId}/assignments/from-catalog` |
| 조건 | `POST .../{assignmentId}/terms`, `POST .../terms/quote`, `POST .../terms/accept`, `GET .../terms/current` |
| 이행 | `POST .../{assignmentId}/fulfillment` |

수락 시 `FEE_V2_5PCT`/5.00%가 불변 스냅샷으로 저장된다. D=0이면 `serviceFeeGross=X`, D>0이면
engagement X와 계약금 D를 만들며 두 권위는 XOR다. 금전 동작이 시작되면 새 조건을 제안할 수 없고,
confirm/charge/subsidize/prepayment/settle/noshow는 accepted version이 current와 같아야 한다.
환불·취소·clawback 같은 되감기 동작은 잠금 해제를 위해 계속 허용된다.

### 이행 통계와 운영

확정 뒤 이행 기록은 FULFILLED/PARTIALLY_FULFILLED/NO_SHOW 중 하나를 허용하지만, terms-managed
배정의 정산은 FULFILLED 또는 PARTIALLY_FULFILLED만 통과한다. NO_SHOW는 통계에는 반영되나 정산은 막힌다.
공개 프로필/상품 상세의 통계는 자기배정을 제외해 `fulfilledCount`와
`noShowRate = NO_SHOW / (FULFILLED + PARTIALLY_FULFILLED + NO_SHOW)`를 scale 4 비율로 보여 주며
분모 0이면 null이다.
일정 충돌 검증은 아직 없어서 앱은 제공 가능 여부를 당사자가 직접 조율하라고 고지한다.

관리자 API는 `MANAGE_PROVIDER_VERIFICATION(NR)`로 심사/상품 제재를, 별도
`MANAGE_PROVIDER_DOC_VIEW(NS)`로 문서 presign을 통제한다. 문서 URL 발급마다 감사 로그를 남긴다.
다만 관리자 프런트와 검증 결과 알림 발행/라우팅은 현재 비어 있다.

| 관리자 표면 | 실제 엔드포인트 |
|---|---|
| 심사 조회 | `GET /admin/v1/manage/providers`, `GET /admin/v1/manage/providers/{profileId}` |
| 판정 | `POST .../{profileId}/approve`, `POST .../reject`, `POST .../request-info` |
| 원문 열람 | `GET .../{profileId}/documents/{documentId}/download-url` |
| 상품 제재 | `POST /admin/v1/manage/providers/offerings/{offeringId}/suspend`, `POST .../unsuspend` |

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
9. direct 배정 제공자가 `수락` CTA → `POST /api/v1/me/assignments/{assignmentId}/accept` →
   ASSIGNED→ACCEPTED. 카탈로그 배정은 이 엔드포인트가 거부하며 terms 제안/견적과 수락을 거친다.
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
4. 취소는 기존 money charge를 자동 역분개한다. engagement의 PAID 미적용 계약금은
   `forfeitOnAssignmentCancel()`로 제공자에게 귀속한다.

## 4. 서버 계약

### `POST /api/v1/events/{eventId}/assignments`

| 항목 | 계약 |
|---|---|
| 인증 | 필수 (`@AuthenticationPrincipal UserPrincipal`) |
| 권한 | `CuratedEventAccessPort.assertHostOrCoHost(eventId, userId)` |
| Request body | `ServiceAssignmentCreateParam` — `providerUserId: long`, `assignmentSource: AssignmentSource`, `providerRole: String?` |
| 응답 | `ServiceAssignmentVo` 201 |
| 중복 제약 | 서비스가 `(eventId, providerUserId)` 기존 배정을 먼저 조회해 `ASSIGNMENT_ALREADY_EXISTS`(409)로 거부. DB `UNIQUE(event_id, provider_user_id)`는 동시성 방어선 |
| 자기 배정 | providerUserId==caller → status=ACCEPTED (자동 수락) |
| 외부 배정 | providerUserId≠caller → status=ASSIGNED (수락 대기) |
| 출처 제한 | 이 direct API에서 `CATALOG`를 보내면 거부. 카탈로그 전용 엔드포인트 사용 |

### `GET /api/v1/events/{eventId}/assignments`

| 항목 | 계약 |
|---|---|
| 권한 | `CuratedEventAccessPort.assertHostOrCoHost(eventId, userId)` |
| 응답 | `List<ServiceAssignmentVo>` (PageResponse 아님) |

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/confirm`

| 항목 | 계약 |
|---|---|
| 권한 | `assertHostOrCoHost` |
| path scope | controller가 path `eventId`를 서비스에 전달하지 않는다. 서비스는 assignment의 실제 eventId로 권한을 검사하므로 타 이벤트 권한 상승은 없지만 path-owner 일치 검증은 없음 |
| 전이 | ACCEPTED → CONFIRMED (`AssignmentStatus.getAllowedTransitions()`) |
| 실패 | ACCEPTED 아닌 상태에서 호출 시 `ASSIGNMENT_INVALID_STATE` |
| 응답 | `ServiceAssignmentVo` 200 |

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/cancel`

| 항목 | 계약 |
|---|---|
| 권한 | `assertHostOrCoHost` |
| path scope | confirm과 동일하게 path `eventId`는 무시되고 assignment 실제 eventId가 권한·처리 기준 |
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
| 전이 | direct 배정의 ASSIGNED → ACCEPTED. offeringId가 있는 카탈로그 배정은 거부 |
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
| `assignmentSource` | `AssignmentSource` | `AssignmentSource` enum | 서버 5값 + client unknown |
| `status` | `AssignmentStatus` | `AssignmentStatus` enum | 7값 verbatim |
| `fulfillmentStatus` | `FulfillmentStatus` | `FulfillmentStatus` enum | 6값 verbatim |
| `providerRole` | `String?` | `String?` | taxonomy 미확정 |
| `serviceFeeGross` | `BigDecimal` | `double?` | 과금 전 null |
| `engagementId` | `Long?` | `int?` | 계약금 모드 식별자 |
| `offeringId` / `offeringTitle` | `Long?` / `String?` | `int?` / `String?` | 카탈로그 상품 스냅샷 |
| `currentTermsVersion` / `acceptedTermsVersion` | `Integer?` | `int?` | `termsUpToDate`와 함께 금전 게이트 판단 |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| 호스트 목록 Provider | `EventAssignmentsNotifier(eventId)` — `@riverpod` auto-dispose |
| 제공자 목록 Provider | `MyAssignmentsNotifier` — `@riverpod` |
| API 체인 | `serviceAssignmentApiProvider`(keepAlive) → `serviceAssignmentRepositoryProvider`(keepAlive) → Notifier |
| 배정 생성 화면 | `AssignmentCreateScreen` |
| 호스트 배정 목록 화면 | `EventAssignmentsScreen` |
| 제공자 배정 목록 화면 | `MyAssignmentsScreen` |
| 제공자 센터/카탈로그 | profile 진입 `/me/provider`; 프로필·문서·상품목록·상품편집·카탈로그·상품상세 7화면 |
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
| 제공자 + direct ASSIGNED | 수락(accept) / 거절(reject) |
| 제공자 + catalog ASSIGNED | 조건 제안/견적 확인·terms 수락 / 거절 |
| 제공자 + ACCEPTED | (확정 대기) |
| 제공자 + CONFIRMED | (정산 대기) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + 신규 배정 | `assertHostOrCoHost` 통과 + 서비스 중복 선검사 | `EventAssignmentsNotifier.create()` | 배정 생성 201, 목록 갱신 | 일치 |
| 호스트 + 자기 배정 | providerUserId==caller → status=ACCEPTED 즉시 | 동일 create 흐름 | 수락 단계 없이 바로 ACCEPTED | 일치 |
| 호스트 + 중복 배정 | 서비스 선조회 → `ASSIGNMENT_ALREADY_EXISTS` 409, DB UNIQUE는 경합 backstop | `ApiError.conflict` | 에러 표시 | 일치 |
| 제공자 + ASSIGNED 배정 수신 | `providerUserId` 일치 검증 | `MyAssignmentsNotifier` GET | 수락/거절 CTA | 일치 |
| 제공자 + 타인 배정 accept 시도 | 서버가 `providerUserId` 불일치 → 예외 | API 에러 | 권한 에러 | 일치 |
| 비호스트 + 목록 조회 | `assertHostOrCoHost` 실패 → 예외 | API 403 → `ApiError.forbidden` | 접근 차단 | 일치 |
| SETTLEMENT_LOCKED 취소 시도 | `isTerminal()=true` → `ASSIGNMENT_INVALID_STATE` | API 에러 | 상태 전이 불가 에러 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `AssignmentStatus` enum 7값 | DRAFT·ASSIGNED·ACCEPTED·DECLINED·CONFIRMED·SETTLEMENT_LOCKED·CANCELED | Dart `AssignmentStatus` 7값 verbatim | 일치 |
| `AssignmentSource` enum 5값 | HOST_MANUAL·HOST_INVITE_ACCEPTED·PROVIDER_APPLY·ADMIN_ASSIGNED·CATALOG | Dart 동일 값 + `unknown` | JSON 호환 |
| `FulfillmentStatus` enum 6값 | PENDING·IN_PROGRESS·FULFILLED·PARTIALLY_FULFILLED·NO_SHOW·DISPUTED | Dart `FulfillmentStatus` 6값 verbatim | 일치 |
| `ServiceAssignmentVo` 금액 | Java BigDecimal serviceFeeGross | Dart double? serviceFeeGross | 일치 (BigDecimal→double) |
| 제거된 파생금액 | VO에 platformFee/withholdingTax/netAmount 없음 | 모델에서도 assignment-level 파생금액에 의존하지 않음 | 일치 |
| 응답 타입 | `List<ServiceAssignmentVo>` (비페이지네이션) | `Future<List<ServiceAssignmentVo>>` Retrofit | 일치 |
| 낙관락 | `@Version Long version` on ServiceAssignment | 클라이언트 미노출 | 서버 단독 처리, 정합 |
| owner grain | `event_id` 단독 | `ServiceAssignmentVo.eventId` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| Gap | 일정/충돌 검증 없음 | catalog assignment는 상품 가시성·검증만 확인하고 시간 가용성을 확인하지 않음 | 이중 예약 가능 | availability 모델/API 추가 전 직접 조율 고지 유지 |
| Gap | 관리자 프런트/검증 결과 알림 없음 | 관리자 API는 있으나 UI 없음. `PROVIDER_VERIFICATION_RESULT` 라우트와 서비스 발행도 비어 있음 | 운영 수동 호출, 제공자 결과 인지 지연 | admin UI와 알림 이벤트 연결 |
| Risk | 관리자 상품 정지 해제 시 활성화 조건 재검증 없음 | `unsuspend`가 SUSPENDED→ACTIVE만 수행 | 검증/사진/프로필 조건이 바뀐 상품이 다시 노출될 수 있음 | 공개 필터만 의존할지, unsuspend 시 활성화 gate 재검증할지 결정 |
| Gap | direct `providerRole` taxonomy 미확정 | direct는 varchar(30) 자유 입력, catalog는 카테고리 표시명 기본값 | direct 운영 데이터 비정형 | 선택지/enum 정책 확정 |
| Risk | ACCEPTED 배정이 서비스비 설정 전에 확정(CONFIRMED) 가능 | `confirm` 엔드포인트가 `serviceFeeGross` 설정 여부를 검증하지 않음 | 과금 없이 정산 흐름 진입 가능 — 완납 게이트(F21-03)가 Σ==0이면 수금액 모드로 처리 | 수금액 모드(serviceFeeGross=0) 정산은 정책상 허용. 별도 차단 불필요 |
| Risk | confirm/cancel path `eventId`와 assignment owner 일치 미검증 | controller가 `eventId`를 무시하고 service가 assignment 실제 eventId로 권한 검사 | 권한 상승은 없지만 잘못된 route도 실제 이벤트 호스트라면 성공해 API 경로 의미가 약해짐 | 서비스에 path eventId를 전달해 `assignment.eventId == eventId`를 검증 |

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
Then 서버는 서비스 선검사로 `ASSIGNMENT_ALREADY_EXISTS`(409)를 반환하고 Flutter는 에러를 표시한다. DB UNIQUE는 동시 요청 방어선으로 남는다.

### AC-04. direct 제공자 수락

Given offeringId가 없는 direct 배정의 status=ASSIGNED이고 인증된 사용자가 해당 배정의 providerUserId다.
When `POST /api/v1/me/assignments/{assignmentId}/accept`를 호출한다.
Then 서버는 `ServiceAssignmentVo(status=ACCEPTED)`를 반환한다.

카탈로그 배정이면 같은 호출은 거부되고 최신 terms를 버전·정책 기대값과 함께 수락해야 한다.

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

### AC-11. 카탈로그 상품 활성화 자격

Given 상품 사진이 없거나 VEHICLE/VENUE 제공자가 VERIFIED가 아니다.
When 제공자가 상품을 ACTIVE로 바꾸려 한다.
Then 서버가 활성화를 거부한다. LABOR/OTHER는 미검증 경고를 노출하되 ACTIVE를 허용한다.

### AC-12. 카탈로그 배정의 서버 스냅샷

Given 호스트가 공개 ACTIVE 상품을 선택한다.
When `POST /api/v1/events/{eventId}/assignments/from-catalog`를 호출한다.
Then providerUserId/source/offering title/category/version은 서버가 상품에서 파생하고 status=ASSIGNED로 저장한다.

### AC-13. 최신 계약조건 수락

Given 상대방이 제안한 최신 terms가 있고 돈 활동이 시작되지 않았다.
When 상대방이 `expectedTermsVersion`과 필요한 `expectedFeePolicyVersion`을 맞춰 수락한다.
Then acceptance hash와 fee policy/rate 스냅샷이 저장되고 acceptedTermsVersion이 currentTermsVersion과 같아진다.
stale 버전·정책·만료 견적·제안자 본인의 수락은 거부한다.

### AC-14. terms-managed 이행 정산

Given 카탈로그 계약이 CONFIRMED이고 최신 조건까지 수락됐다.
When 호스트가 FULFILLED 또는 PARTIALLY_FULFILLED를 기록한 뒤 나머지 완납 게이트를 충족해 정산한다.
Then earning은 APPROVED가 된다. NO_SHOW·DISPUTED·PENDING이면 정산을 거부한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| Product | `providerRole` taxonomy | 강사/MC/진행자 등 종류 확정 후 enum 또는 선택지 목록 배포. 현재 자유 입력 varchar(30) |
| Product | 제공 가능 일정 | 상품/배정 충돌 모델과 취소 정책을 정의 |
| UX/Admin | 검증 결과 알림·관리자 화면 | 현재 API만 있으므로 운영 화면과 provider 딥링크 연결 |
