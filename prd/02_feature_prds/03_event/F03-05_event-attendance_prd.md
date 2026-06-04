# F03-05. 이벤트 신청 & 참석 (참가자) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-22; unit: business_logic/units/03_event/F03-05_event-attendance -->

> 문서 상태: **실사 기반 전환본 + W1/W2/W3 신규 분기 통합 (2026-05-22)**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-05_event-attendance`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-05-22 W2/W3 추가: 선입금 활성 이벤트의 `APPROVED_PENDING_PAYMENT`/`PAYMENT_EXPIRED` 분기와 `EventParticipationCancellationService.cancelMyParticipation` facade가 `apply`/`approveApplication`/`DELETE .../apply` 흐름에 통합되었다. 선입금 결제·환불 자체의 facade·회계·환불 매트릭스는 **F03-13 (이벤트 참가 선입금)** 으로 분리. 본 PRD는 신청·취소 사용자 액션과 상태 전이까지만 다룬다.

## 1. 결론

참가자가 OPEN 이벤트에 참석/대기열 등록/취소하거나, 승인 필요(`approvalRequired` 또는 `visibility=APPROVAL`) 이벤트에 신청서를 제출한다. 두 경로(`capacity` / `apply`)가 있고 `EventAttendance` (참석 row)와 `Application` (신청 row)는 분리되어 저장된다. 정원 초과 + 대기열 활성 시 `WAITING` 상태로 들어가고 호스트가 ATTENDING을 취소하면 `WaitlistService`가 다음 대기자를 자동 승급시킨다. 본 단위는 참가자의 직접 액션만 다룬다 (호스트의 승인/거절은 F03-06, 정원 설정은 F03-07).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 하단 액션바 "참석 신청" / "대기열 등록" / "참석 취소"
- 마이 이벤트(F03-12) "참석 예정" 카드 ▶ 상세 진입 후 액션바
- 알림(F12) 승인/거절/자동 승급 푸시 ▶ 상세

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-05_event-attendance/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-05_event-attendance/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-05_event-attendance/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-05_event-attendance/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:107` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:32` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:40` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:156` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:165` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:181` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 액션바 상태: `eventDetailNotifierProvider(eventId).valueOrNull?.myAttendanceStatus` 기반 분기
2. 결제 필요 여부: `event.price > 0 && event.prepaymentRequired` (UI 결정)
3. 일반 신청 (승인 불필요):
   - `AttendanceActionNotifier.attend()` ▶ `_directAttend`
   - `AttendanceRepository.attend(eventId)` ▶ `POST /api/v1/events/{id}/capacity`
   - 응답 200/201 → `eventDetailNotifierProvider.invalidate()` (currentCapacity 갱신, viewer status 갱신)
4. 신청서 (승인 필요):
   - `AttendanceActionNotifier._apply()`
   - `ApplicationRepository.apply(eventId, ApplicationParam)` ▶ `POST /api/v1/events/{id}/apply`
   - 응답 → status=PENDING으로 표기, viewer 갱신
5. 유료 + 승인제:
   - 신청 시점에는 결제 API를 호출하지 않는다.
   - 호스트 승인 후 사용자는 `approvedApplication` 또는 `approvedPendingPayment` 상태를 보고 결제 CTA를 누른다.
   - 결제 성공 후에만 `event_attendance=ATTENDING`으로 확정되어 체크인/위치/리뷰 자격이 열린다.
   - **`APPROVED_PENDING_PAYMENT` + `paymentDueAt` 구현 완료** (해소 2026-06-05): 선입금 활성 이벤트에서 승인 즉시 해당 상태로 진입하고, `confirmPaymentAndAttend`에서 결제 확정 시 `APPROVED + ATTENDING`으로 전이한다 (`ApplicationService.java:150-165`).
6. 취소:
   - approvalRequired → `ApplicationRepository.cancelApplication` ▶ `DELETE .../apply`
   - 일반 → `AttendanceRepository.cancel` ▶ `DELETE .../capacity`
   - `eventDetailNotifierProvider.invalidate()`
7. 내 신청 목록(F03-12 위임): `myApplicationsProvider` ▶ `GET /api/v1/events/users/me/applications` (List 반환, Page 아님!)

## 4. 서버 계약

### 개요

참가자가 OPEN 이벤트에 참석/대기열 등록/취소하거나, 승인 필요(`approvalRequired` 또는 `visibility=APPROVAL`) 이벤트에 신청서를 제출한다. 두 경로(`capacity` / `apply`)가 있고 `EventAttendance` (참석 row)와 `Application` (신청 row)는 분리되어 저장된다. 정원 초과 + 대기열 활성 시 `WAITING` 상태로 들어가고 호스트가 ATTENDING을 취소하면 `WaitlistService`가 다음 대기자를 자동 승급시킨다. 본 단위는 참가자의 직접 액션만 다룬다 (호스트의 승인/거절은 F03-06, 정원 설정은 F03-07).

### 유료 + 승인제 조합 정책

유료 이벤트(`event.price > 0`)와 승인제(`approvalRequired=true` 또는 `visibility=APPROVAL`)는 제품상 동시에 허용해야 한다. 단, 신청 시점 결제는 금지한다. 권장 상태 흐름은 다음과 같다.

1. 참가자 신청: `POST /apply` → `Application=PENDING`, 결제 없음.
2. 호스트 승인: `Application=APPROVED_PENDING_PAYMENT` 또는 별도 payment hold 상태로 전환하고 결제 요청 알림 발송.
3. 참가자 결제: `POST /wallet/pay` 성공 후 `EventAttendance=ATTENDING`, `currentCapacity++`, 체크인/위치/리뷰 자격 오픈.
4. 호스트 거절: `Application=REJECTED`, 결제 없음, 환불 없음.
5. 결제 기한 만료/사용자 취소: 결제 대기 상태 해제, 예약 정원 반환, 재신청 가능 여부 표시.

현재 서버 코드는 이 목표 흐름을 완성하지 못한다. `ApplicationService.approveApplication`은 승인 즉시 `capacityService.createAttendanceFromApplication`을 호출해 ATTENDING을 만든다. `WalletService.pay`는 가격과 중복 결제만 검증하고 신청/승인 상태를 확인하지 않는다. 따라서 유료 승인제는 문서상 정책과 구현 보강 대상이 함께 추적되어야 한다.

> **2026-05-22 W2 갱신**: 위 "현재 코드 미완" 문구는 선입금 활성 이벤트(`EventPrepayment.prepaymentRequired=true`)에 한해서 해결됨. `ApplicationService.apply`/`approveApplication`이 선입금 활성을 감지하면 즉시 `APPROVED_PENDING_PAYMENT + paymentDueAt` 상태로 진입하고 capacity는 점유하지 않는다(D4). 결제 facade(F03-13)가 결제 완료 시 `confirmPaymentAndAttend`를 통해 `APPROVED + ATTENDING + capacity++`로 전이한다. 선입금 미활성 유료 이벤트의 미해결 흐름은 별도 후속 슬라이스로 추적.

### 2.0 W2 선입금 분기 (자동 승인 + 승인 필요 두 경로)

PLAN.md §1.4.1과 §2.10·§2.14를 본 단위 흐름에 반영하면 다음과 같다.

**`apply` (자동 승인 + 선입금 활성)** — `ApplicationService.apply`가 `EventPrepayment.prepaymentRequired=true`를 감지하면:
- `Application.status = APPROVED_PENDING_PAYMENT`
- `Application.paymentDueAt = now() + (policy.paymentDeadlineHours || 24h)`
- capacity 변화 없음 (D4 — 결제 완료 전까지 좌석 미점유)
- `ApplicationPendingPaymentEvent` 발행 (after-commit) → 알림 `EVENT_PREPAYMENT_REQUIRED(71)`
- 자동 승인 무료 이벤트만 기존 `APPROVED + createAttendanceFromApplication` 흐름

**`approveApplication` (승인 필요 + 선입금 활성)** — 호스트 승인 시:
- `Application.status = APPROVED_PENDING_PAYMENT + paymentDueAt`로 전이 (capacity 미점유)
- `ApplicationApprovedEvent` 미발행 — 캘린더 sync 등은 `confirmPaymentAndAttend`(`:437`)에서 1회만 발행
- 알림 71 발송 (after-commit)

**중복 차단 강화** — `apply`의 재신청 케이스에서 다음 상태는 active로 간주해 `APPLICATION_ALREADY_EXISTS` 차단:
- `PENDING, APPROVED, APPROVED_PENDING_PAYMENT`

`PAYMENT_EXPIRED` 재신청은 active `event_payment` row가 없을 때만 허용. 있으면 `PAYMENT_PENDING` 에러.

### 2.6 사용자 자가 취소 facade (`DELETE /api/v1/events/{eventId}/apply`) — W2 변경

기존 `EventController.cancelApplication`이 직접 호출하던 `ApplicationService.cancelApplication`은 **`EventParticipationCancellationService.cancelMyParticipation`** 으로 라우팅 변경 (PLAN.md §2.14, 위치 `community_api/src/main/java/com/endside/community/event/prepayment/service/EventParticipationCancellationService.java:44`).

facade 동작:
1. lock 순서 `event → application → event_payment` 준수 (§0.4)
2. active `event_payment` 조회 후 상태별 분기:
   - `event_payment.PENDING` → `event_payment(CANCELED)` + 내부 `cancelApplication` 호출 → `Application=CANCELED`
   - `event_payment.PAID + WALLET` → `EventPaymentRefundService.refundByWallet`(100% 환불, 분개 1건) → 내부 cancelApplication → `Application=CANCELED + capacity--`
   - `event_payment.PAID + BANK_TRANSFER` → `event_payment(REFUND_REQUESTED)` + 호스트 알림 `EVENT_PREPAYMENT_REFUND_REQUESTED(83)`. **Application은 유지** — 호스트가 별도 환불 후 `refundByBankConfirm` 호출해야 `Application=CANCELED` 전이
   - `event_payment.REFUND_REQUESTED` → `REFUND_ALREADY_REQUESTED` 에러
   - active 결제 없음 → 기존 cancelApplication 흐름 그대로
3. 응답: `ApplicationVo` (status는 위 분기에 따라 `CANCELED` 또는 미변경)

> `ApplicationService.cancelApplication`은 그대로 두되 public API 라우팅에서 제거. 내부 호출자(환불 facade, AccountDeactivation 등)만 사용.

### 2.7 결제 만료 스케줄러

`EventPrepaymentExpiryScheduler`가 60s 주기로 `Application.paymentDueAt < now()`인 row를 `PAYMENT_EXPIRED`로 일괄 전이. 동일 application의 active `event_payment(PENDING)`도 `CANCELED`로 정리. capacity 변화 없음(D4). 알림 `EVENT_PREPAYMENT_EXPIRED(75)` after-commit.

### 2.1 정원 판정 흐름 (v4.5 W1 — CapacityPolicy 매트릭스 위임)

`apply`(직접 참석) 경로는 더 이상 사전 정원 체크를 단순 `currentCapacity >= baseCapacity`로 하지 않는다. 사전 체크는 **명백한 FULL만** 차단(`hardCapacityLimit` 도달 또는 `baseCapacity` 도달 + `!waitlistEnabled` + `!overcapacityAllowed`)하고, 나머지 분기는 `CapacityService.createAttendanceFromApplication`이 호출하는 `CapacityPolicy.decide(event, attendingCount)` 5-룰 매트릭스에 위임된다(F03-07 §3-1 참조).

- 매트릭스가 `OVERCAPACITY` 분기로 결정하면 `apply` 또는 `attend`로 들어온 직접 참석자도 즉시 `ATTENDING`으로 진입한다 (자동 승인 이벤트 + `overcapacityAllowed=true` 조합, Q6). `event_attendance_log`에는 `ChangeType.OVERCAPACITY_APPROVED(9)`가 기록된다.
- 매트릭스가 `WAITING`을 반환하면 기존 대기열 흐름 그대로(`AttendanceStatus.WAITING`).
- 매트릭스가 `FULL`을 반환하면 `ErrorCode.CAPACITY_FULL`을 던진다.

신규 ErrorCode:
- `INVALID_HARD_CAPACITY_LIMIT(400013)` — F03-07의 capacity-settings 엔드포인트에서 invariant 위반 시 (apply 경로 자체는 던지지 않음).
- `CAPACITY_FULL_AT_CONFIRMATION(400012)` — W2와 공유. 결제 확정 시점 race에서만 사용.

### 2.2 결제 확정 race (v4.5 W1 + W2 공유)

선입금 흐름에서 사용자가 결제(`POST /events/{id}/prepayment/wallet` 또는 BANK_TRANSFER `bank-confirm`)를 호출한 시점에 이미 다른 사용자가 정원을 채워버린 race가 발생할 수 있다. `CapacityService.confirmAttendanceFromPayment`는 W1 이후 동일 매트릭스를 적용하며, `WAITING/FULL`이면 `ErrorCode.CAPACITY_FULL_AT_CONFIRMATION(400012)`을 던진다.

- WALLET 경로: 결제 facade(`EventPrepaymentService.payByWallet`) 트랜잭션 안에서 catch되어 **전체 롤백** — 지갑 차감/`event_payment` insert 모두 되돌려짐. 사용자에게 "정원 초과로 결제 실패" 응답.
- BANK_TRANSFER 경로: 호스트의 `bank-confirm` 시점에 fail. `event_payment.status=REFUND_REQUESTED` 전환 + 호스트에게 수동 환불 알림.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/capacity | CapacityController#attend | required | 즉시 참석 등록 (또는 대기열) |
| POST | /api/v1/events/{eventId}/attend | AttendanceController#attend | required | 위와 동일 (플랜 호환 경로) |
| DELETE | /api/v1/events/{eventId}/capacity | CapacityController#cancel | required | 참석/대기 취소 |
| DELETE | /api/v1/events/{eventId}/attend | AttendanceController#cancel | required | 위와 동일 |
| GET | /api/v1/events/{eventId}/capacity/me | CapacityController#getMyAttendance | required | 내 참석 상태 조회 |
| GET | /api/v1/events/{eventId}/attendance/me | AttendanceController#getMyAttendance | required | 위와 동일 |
| POST | /api/v1/events/{eventId}/apply | EventController#applyToEvent | required | 신청서 제출 (승인 필요 이벤트) |
| DELETE | /api/v1/events/{eventId}/apply | EventController#cancelApplication | required | 신청 취소 |
| GET | /api/v1/events/users/me/applications | EventController#getMyApplications | required | 내 신청 목록 |

> Capacity / Attendance 경로는 동일한 `CapacityService`를 호출하는 alias. 클라이언트는 Capacity 경로를 사용한다.

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `AttendanceStatus`: `ATTENDING(0)`, `WAITING(1)`, `CANCELLED(2)`, `REJECTED(3)`
  - 클라이언트 enum 생성 시 서버 그대로 사용 (`WAITLISTED`가 아닌 `WAITING`임에 주의)
- **Enum** `ApplicationStatus` (전체 7값, `ApplicationStatus.java:24-36`):
  - `PENDING` — 호스트 심사 대기
  - `APPROVED` — 승인 완료 (정원 점유)
  - `APPROVED_PENDING_PAYMENT` — 승인됐으나 선입금 결제 대기
  - `PAYMENT_EXPIRED` — 결제 기한 만료 (터미널)
  - `REJECTED` — 호스트 거절 (터미널)
  - `CANCELED` — 정상 취소 완료 (터미널, L 한 개 — `CANCELLED` 아님)
  - `CANCEL_PENDING_REFUND` — 계좌이체 취소 후 호스트 환불 확인 대기 (정원 hold 유지, 노쇼 제외)
  - `occupiesCapacity()`: APPROVED \| APPROVED_PENDING_PAYMENT \| CANCEL_PENDING_REFUND
  - `isTerminated()`: CANCELED \| REJECTED \| PAYMENT_EXPIRED
- **Enum** `ChangeType` (event_attendance_log): `APPLIED_ATTENDING`, `APPLIED_WAITING`, `CANCELLED_BY_USER`, `REMOVED_BY_HOST`, `PROMOTED_AUTO`, `PROMOTED_MANUAL`, ... (전체 목록은 `capacity/constants/ChangeType.java` 참조)
- **Enum** `EventVisibility`: `APPROVAL`이면 신청서 필요
- 도메인 객체:
  - `Event#approvalRequired: boolean`
  - `Event#waitlistEnabled: boolean`
  - `Event#maxWaitlist: int` (0이면 baseCapacity * 2)
  - `Event#currentCapacity: int`
  - **v4.5 W1**: `Event#overcapacityAllowed: boolean`, `Event#hardCapacityLimit: Integer (nullable)`
  - `EventAttendance` 필드: `id, eventId, userId, status, waitlistOrder, promotedFromWaitlist, manuallyPromoted, createdAt`

#### EventVo 노출 필드 (v4.5 W1)

`community_api/src/main/java/com/endside/community/event/vo/EventVo.java`는 다음 정원 관련 필드를 노출한다(`EventVoAssembler.assemble`이 채움).

| 필드 | 타입 | 조회 위치 |
|---|---|---|
| `overcapacityAllowed` | `boolean` | 단건/목록 모두 |
| `hardCapacityLimit` | `Integer` (nullable) | 단건/목록 모두 |
| `exceedingAttendees` | `int` | 단건/목록 모두 — `max(0, currentCapacity - baseCapacity)` |
| `reservedPaymentPendingCount` | `int` | **단건 응답에만 lazy 조회**, EventSimpleVo와 목록에서는 항상 0 (D16, N+1 회피) |

참가자 시점 UI(상세 액션바, 참석자 카운트)는 `exceedingAttendees`로 "+N명 초과" 뱃지를 표시한다. `reservedPaymentPendingCount`는 호스트 시점 결제 대기 인원 추적용.

### 제재 가드 (EventApplyRestrictionGuard)

> **갱신일**: 2026-06-05. 소스: `EventApplyRestrictionGuard.java:32-63`, `ApplicationService.java:83-93`.

신청(`apply`) 및 참석 확정(`attend`, `confirmAttendanceFromPayment`) 진입점에서 `EventApplyRestrictionGuard.assertNotRestricted(userId, clubId)` 를 호출하여 참가자 제재 여부를 검사한다.

| 검사 축 | 서비스 | 에러 코드 |
|---|---|---|
| 클럽 스코프 제재 | `WarningSanctionService.isApplyRestricted(userId, clubId)` | `USER_RESTRICTED_FROM_EVENT_APPLY(403, 2900001)` |
| 플랫폼 전역 제재 | `PlatformSanctionService.isRestricted(userId, EVENT_APPLY_RESTRICT)` | 동일 |

- 신청 경로(`apply`): Guard throw — 즉시 403 반환 (`ApplicationService.java:87-93`)
- 참석 경로(`attend`, `createAttendanceFromApplication`, `confirmAttendanceFromPayment`): Guard throw — 트랜잭션 롤백
- 제재 사용자에 대한 **대기열 자동 승급 skip** 정책은 F03-07 §제재 우회 차단 절 참조

### CANCEL_PENDING_REFUND 상태 정책

`CANCEL_PENDING_REFUND`(계좌이체 취소 후 호스트 환불 확인 대기) 상태는 다음 특징을 가진다:

- 정원(capacity)을 **hold 상태로 유지** — 환불 확인 전까지 다른 참가자가 해당 자리를 점유하지 못함
- **노쇼 통계 제외** — `CheckInService.getCheckInStats()`에서 `pendingRefundUserIds` 필터로 분모·분자 모두에서 제외 (`CheckInService.java:237-255`)
- 호스트가 환불을 확인하면 `CANCELED` 전이 + `capacity--`

### 의존 단위 / 외부 시스템

- **Unit 06 결제 & 지갑** — 유료 이벤트 참가비/사전결제 차감은 `WalletService` 위임. 본 엔드포인트는 결제 처리를 하지 않음. 승인 불필요 유료 이벤트는 신청/참석 전 결제 확인 다이얼로그 후 별도 API 호출이 필요하고, 승인제 유료 이벤트는 승인 후 결제 확정 흐름을 사용해야 한다. 자가 취소 시 환불 정책은 F03-13의 `event_refund_policy` 카탈로그 기반으로 산출 (2026-06-05 카탈로그 일원화 이후, 상세는 F03-13).
- **유료 승인제** — `APPROVED_PENDING_PAYMENT` 상태 및 결제 확정 흐름은 구현 완료 (2026-06-05 해소). 선입금 활성 이벤트는 F03-13의 선입금 facade를 사용한다.
- **Unit 07 모임 정산** — 사전결제 항목은 정산 흐름과 연결 (참가자 신청 시점에 settlement_item 등록).
- **Unit 12 알림** — `NEW_APPLICATION` (호스트), `APPLICATION_APPROVED/REJECTED` (참가자, F03-06), 자동 승급 알림 (`WaitlistService` 발송).
- **Unit 04 클럽** — `clubMemberRepository.existsByClubIdAndUserId` 멤버십 검증.
- **Redis** — `TrendingService.recordRegistration` (인기순 정렬용 카운트).
- **외부**: FCM (Unit 12 위임).
- **노쇼 관리** — 이벤트 노쇼 확정·소명·뒤집기·사후 환불의 상세 계약은 F03-20 (이벤트 노쇼 관리) 참조 (F03-20은 병렬 작성 중 — `./F03-20_event-no-show_prd.md`).

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세(F03-02) ▶ 하단 액션바 "참석 신청" / "대기열 등록" / "참석 취소"
- 마이 이벤트(F03-12) "참석 예정" 카드 ▶ 상세 진입 후 액션바
- 알림(F12) 승인/거절/자동 승급 푸시 ▶ 상세

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/event/) | 역할 |
|---|---|---|
| `/home/events/:eventId` | `screens/event_detail_screen.dart` | 액션바 + 신청 시트 진입점 |
| (모달) | `widgets/attendance_apply_sheet.dart` | 참석 신청 시트 |
| (모달) | `widgets/event_apply_confirm_sheet.dart` | 결제 확인 시트 (유료 이벤트) |
| (모달) | `widgets/cancel_attendance_sheet.dart` | 참석 취소 시트 |
| `/home/my-events` | `screens/my_events_screen.dart` (F03-12) | 내 신청/참석 목록 |

본 단위는 화면 파일이 거의 없고 액션바 + 모달 시트로 구성된다.

### 화면별 구성 요소 & 액션

### 액션바 (`event_action_bar.dart`)

- **사용자가 보는 것**:
  - viewer 상태에 따라 버튼 라벨/색상 변경:
    - null + OPEN + 정원 미달 → "참석 신청" (primary500)
    - null + OPEN + 정원 초과 + waitlistEnabled → "대기열 등록" (warning500)
    - null + OPEN + 정원 초과 + !waitlistEnabled → "마감" disabled
    - null + approvalRequired → "신청서 작성"
    - ATTENDING → "참석 취소" (gray-outlined)
    - WAITING → "대기 취소 (N번째)"
    - PENDING → "심사 중" disabled + "신청 취소"
    - APPROVED → "참석 확정" (회색 disabled, 취소는 가능)
    - REJECTED/CANCELED → "다시 신청"
- **사용자가 할 수 있는 액션**:
  - "참석 신청" 탭 → `AttendanceActionNotifier.attend()`:
    1. `event.approvalRequired || visibility == APPROVAL` 체크
    2. true → `_apply` (신청서 시트 + `POST .../apply`)
    3. false → `_directAttend` (`POST .../capacity`)
  - 유료 + 승인 불필요 이벤트 → `EventApplyConfirmSheet` (결제 확인 시트, Unit 06 위임) 선행 후 직접 참석
  - 유료 + 승인제 이벤트 → 결제 선행 금지. 먼저 신청서를 제출하고, 호스트 승인 후 "결제하고 참석 확정" CTA로 전환
  - "참석 취소" 탭 → `CancelAttendanceSheet` 확인 → `AttendanceActionNotifier.cancel()`
  - 비로그인 → 로그인 화면 redirect

### 신청 시트 (`attendance_apply_sheet.dart`)

- 신청 메시지 입력 (`AppTextArea`, optional)
- 본인 정보 표시 (자동입력)
- "제출" 탭 → `ApplicationParam(message: ...)` ▶ `POST .../apply` ▶ status=PENDING
- 성공 → 토스트 "신청이 접수되었습니다. 호스트 승인을 기다려주세요" + 시트 dismiss + 액션바 갱신

### 결제/신청 확인 시트 (`event_apply_confirm_sheet.dart`)

- 가격, 환불 정책 미리보기, 잔액 표시
- 승인 불필요 유료 이벤트: "결제 후 신청" → Wallet 차감 (Unit 06) → 참석 확정
- 승인제 유료 이벤트: "신청하기" → 결제 없이 `Application=PENDING` 생성. 승인 전 결제받지 않음
- 승인제 유료 이벤트에서 승인 알림을 받은 뒤: "결제하고 참석 확정" → Wallet 차감 → 참석 확정
- 잔액 부족 → 충전 화면(Unit 06)으로 이동 (PaymentShortfall)

### 취소 시트 (`cancel_attendance_sheet.dart`)

- 환불 정책 안내 (유료 이벤트의 경우)
- "취소 확인" → `DELETE .../capacity` 또는 `DELETE .../apply`
- 환불 실제 처리는 서버의 `event_prepayment.refundPolicyType` 기반 (Unit 06 위임)

### API 호출 순서 (Provider/Repository 관점)

1. 액션바 상태: `eventDetailNotifierProvider(eventId).valueOrNull?.myAttendanceStatus` 기반 분기
2. 결제 필요 여부: `event.price > 0 && event.prepaymentRequired` (UI 결정)
3. 일반 신청 (승인 불필요):
   - `AttendanceActionNotifier.attend()` ▶ `_directAttend`
   - `AttendanceRepository.attend(eventId)` ▶ `POST /api/v1/events/{id}/capacity`
   - 응답 200/201 → `eventDetailNotifierProvider.invalidate()` (currentCapacity 갱신, viewer status 갱신)
4. 신청서 (승인 필요):
   - `AttendanceActionNotifier._apply()`
   - `ApplicationRepository.apply(eventId, ApplicationParam)` ▶ `POST /api/v1/events/{id}/apply`
   - 응답 → status=PENDING으로 표기, viewer 갱신
5. 유료 + 승인제:
   - 신청 시점에는 결제 API를 호출하지 않는다.
   - 호스트 승인 후 사용자는 `approvedApplication` 또는 `approvedPendingPayment` 상태를 보고 결제 CTA를 누른다.
   - 결제 성공 후에만 `event_attendance=ATTENDING`으로 확정되어 체크인/위치/리뷰 자격이 열린다.
   - **`APPROVED_PENDING_PAYMENT` + `paymentDueAt` 구현 완료** (해소 2026-06-05): `confirmPaymentAndAttend`에서 결제 확정 시 `APPROVED + ATTENDING`으로 전이 (`ApplicationService.java:150-165`).
6. 취소:
   - approvalRequired → `ApplicationRepository.cancelApplication` ▶ `DELETE .../apply`
   - 일반 → `AttendanceRepository.cancel` ▶ `DELETE .../capacity`
   - `eventDetailNotifierProvider.invalidate()`
7. 내 신청 목록(F03-12 위임): `myApplicationsProvider` ▶ `GET /api/v1/events/users/me/applications` (List 반환, Page 아님!)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **버튼 라벨 한글**: "참석 신청" / "대기열 등록" / "신청서 작성" / "심사 중" / "참석 취소" / "대기 취소 (N번째)"
- **viewer 상태 → UI 매핑** (`event_viewer_status.dart` enum, 클라이언트 정의):
  - `attending`, `waitlisted`, `pendingApplication`, `approvedApplication`, `rejectedApplication`, `notAttending`
  - 서버 `myAttendanceStatus`/`myApplicationStatus` 두 필드를 합쳐 결정
- **유료 이벤트 결제 확인 시트**: 결제 흐름은 Unit 06 위임이지만, "신청 전 결제 확인" 다이얼로그 노출 정책은 화면 결정
- **취소 환불 정책 표시**: `event.prepaymentRefundPolicyType`/`refundDeadlineHours`에 따른 안내 문구
- **자동 승급 강조**: `event.myPromotedFromWaitlist == true && !promotedSeenProvider.contains(eventId)` 조건에서 1회성 강조 표시 → dismiss 후 `promotedSeenProvider.add(eventId)`
- **에러 메시지 매핑**:
  - `EVENT_CANNOT_APPLY` → "신청할 수 없는 모임입니다"
  - `EVENT_ALREADY_CLOSED` → "모집이 마감되었습니다"
  - `CAPACITY_FULL` → "정원이 가득 찼습니다"
  - `WAITLIST_FULL` → "대기열이 가득 찼습니다"
  - `ALREADY_ATTENDING` → "이미 신청한 모임입니다"
  - `APPROVAL_REQUIRED` → "이 모임은 호스트 승인이 필요합니다"
  - `CLUB_MEMBERSHIP_REQUIRED` → "클럽 멤버만 참석할 수 있습니다" + 클럽 가입 CTA
  - `APPLICATION_ALREADY_EXISTS` → "이미 신청한 모임입니다"
  - `CAPACITY_FULL_AT_CONFIRMATION` (400012, v4.5 W1) → "결제 처리 중 정원이 초과되어 참석 확정에 실패했습니다. 결제가 되돌려졌습니다" + 환불 안내
  - `PaymentShortfall` (Unit 06) → "잔액이 부족합니다" + 충전 CTA
- **신청 메시지 글자수**: 서버 제한 미확인 (DB column 길이 기준, 화면에서 500자 권장)
- **AttendanceStatus enum 매핑** (서버 그대로): `ATTENDING`, `WAITING`, `CANCELLED`, `REJECTED` — `WAITLISTED` 아님!
- **ApplicationStatus enum 매핑** (전체 7값): `PENDING`, `APPROVED`, `APPROVED_PENDING_PAYMENT`, `PAYMENT_EXPIRED`, `REJECTED`, `CANCELED` (L 한 개), `CANCEL_PENDING_REFUND` — 서버 `ApplicationStatus.java:24-36` mirror. Flutter: `application_card.dart:1-93`에서 `cancelPendingRefund` 포함 확인됨
- **결제 확인 시트 디자인**: 잔액·금액·환불 정책을 한 화면에 표시
- **취소 확인 시트**: "정말 취소하시겠습니까?" + 환불 안내
- **`EventViewerBadge`**: 카드/상세에 viewer 상태 라벨 (참석 중/대기 N번째/심사 중)
- **유료 승인제 상태 라벨**: 승인 전 "심사 중", 승인 후 결제 전 "결제 필요", 결제 후 "참석 확정"을 구분해야 한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 무료 + 승인 불필요 + 정원 여유 (Happy Path) | 로그인됨, 이벤트 status=OPEN, currentCapacity=8/12, approvalRequired=false. | 사용자 ATTENDING, 호스트에게 알림 없음 (자동 신청은 알림 트리거 없음 — 코드 확인 결과 NEW_APPLICATION은 apply 경로에서만 발생). |
| S2 | 정원 초과 + 대기열 등록 | status=OPEN, currentCapacity=12/12, waitlistEnabled=true, 대기열 2명. | 사용자 WAITING. |
| S3 | 자동 승급 (다른 사용자 취소 시) | S2의 사용자, 대기 3번째. | 순번 갱신. |
| S4 | 자동 승급된 사용자가 ATTENDING으로 전환 | 1번째 대기자. | 정상 ATTENDING. |
| S5 | 승인 필요 이벤트 신청 → 호스트 승인 | status=OPEN, approvalRequired=true. | ATTENDING. |
| S6 | 자가 취소 (ATTENDING) | 참석 확정 사용자. | 사용자 CANCELLED, 다음 대기자 ATTENDING. |
| S7 | 호스트 본인이 신청 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 클럽 비멤버가 클럽 이벤트 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 중복 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 정원 + 대기열 모두 가득 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S11 | 유료 이벤트 신청 시 잔액 부족 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S12 | 모집 마감(`isClosed=true`) 후 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S13 | 유료 + 승인제 이벤트 신청 → 승인 후 결제 필요 | 로그인됨, 이벤트 status=OPEN, price=20,000, approvalRequired=true 또는 visibility=APPROVAL, currentCapacity=8/10. | 결제 성공 전까지 정식 참석자가 아니며, 결제 성공 후에만 참석 확정. |
| S2-2 (W2) | 선입금 + 승인 필요 + 호스트 승인 → APPROVED_PENDING_PAYMENT | `EventPrepayment.prepaymentRequired=true`, `approvalRequired=true`. 호스트가 승인 호출 | `Application=APPROVED_PENDING_PAYMENT + paymentDueAt`. capacity 미점유. 알림 71 (after-commit). 참가자 결제 화면 진입 가능 (F03-13). |
| S2-2b (W2) | 선입금 + 자동 승인 → 즉시 APPROVED_PENDING_PAYMENT | `prepaymentRequired=true`, `approvalRequired=false`. 참가자가 `POST .../apply` | `Application=APPROVED_PENDING_PAYMENT + paymentDueAt`. capacity 미점유. 결제 facade 진입 (F03-13). |
| S2-5 (W2) | 결제 기한 만료 | `APPROVED_PENDING_PAYMENT + paymentDueAt < now()` | `EventPrepaymentExpiryScheduler` → `Application=PAYMENT_EXPIRED`. `event_payment(PENDING→CANCELED)` 동시 처리. capacity 변화 없음. 알림 75. 사용자는 재신청 가능. |
| S2-6 (W3) | 사용자 자가 취소 — `cancelMyParticipation` (WALLET PAID) | `event_payment.PAID(WALLET)`, deadline 통과 전 | `DELETE /api/v1/events/{eventId}/apply` → facade가 `refundByWallet` 100% 위임 → `Application=CANCELED + capacity-- + event_payment.REFUNDED`. 알림 76. |
| S2-7 (W3) | 사용자 자가 취소 — BANK_TRANSFER PAID | `event_payment.PAID(BANK_TRANSFER)` | `event_payment.REFUND_REQUESTED + Application 유지`. 호스트 알림 83. 환불 정리는 호스트 책임. |
| S2-11 (W3) | 탈퇴 차단 | active `event_payment` 보유 | 400 `DEACTIVATION_BLOCKED_BY_PAYMENT` + BlockingItem `ACTIVE_EVENT_PAYMENT`. |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:17 | 현재 서버 코드는 이 목표 흐름을 완성하지 못한다. `ApplicationService.approveApplication`은 승인 즉시 `capacityService.createAttendanceFromApplication`을 호출해 ATTENDING을 만든다. `WalletService.pay`는 가격과 중복 결제만 검증하고 신청/승인 상태를 확인하지 않는다. 따라서 유료 승인제는 문서상 정책과 구현 보강 대상이 함께 추적되어야 한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:85 | - **체크인 기록 삭제**: `eventCheckInRepository.deleteByEventIdAndUserId` (MEDIUM #10) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:87 | - 이벤트가 CLOSED/CANCELED면 대기열 승급 스킵 (MEDIUM #9) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:117 | - `event.isClosed()` → `EVENT_ALREADY_CLOSED` (HIGH #6) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:121 | - 승인 필요 결정 (HIGH #7): `event.approvalRequired \|\| visibility == APPROVAL` → 초기 status=PENDING. 아니면 자동 APPROVED + `capacityService.createAttendanceFromApplication` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:122 | - 재신청 처리 (HIGH #8): 기존 row가 PENDING/APPROVED면 `APPLICATION_ALREADY_EXISTS`. CANCELED/REJECTED면 status 재설정해서 재사용. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:153 | - 클라이언트 enum 생성 시 서버 그대로 사용 (`WAITLISTED`가 아닌 `WAITING`임에 주의) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:167 | - **유료 승인제 주의** — 승인제 이벤트에서는 신청 전 결제가 아니라 승인 후 결제 확정이 되어야 한다. 현재 `ApplicationStatus`에는 결제 대기 상태가 없고 `WalletService.pay`도 신청 상태를 검증하지 않으므로, `APPROVED_PENDING_PAYMENT`/결제기한/정원 예약 중 하나의 서버 source-of-truth를 추가해야 한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 해소 | frontend.md:83 | ~~현재 코드에는 `APPROVED_PENDING_PAYMENT` 또는 결제 대기 전용 필드가 없으므로 구현 보강이 필요하다.~~ → `APPROVED_PENDING_PAYMENT` + `paymentDueAt` + `confirmPaymentAndAttend` 구현 완료 | 해소 2026-06-05, `ApplicationService.java:150-165` |
| 후보 | frontend.md:109 | - **신청 메시지 글자수**: 서버 제한 미확인 (DB column 길이 기준, 화면에서 500자 권장) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:39 | [E2E 보강: seed_event_list_badge_matrix_test.dart::waitlist_detail_cancel_surface — 본인이 WAITING 인 클럽 이벤트 상세 진입 시 액션바/배지 영역에 "현재 대기열에 등록되어 있습니다" + "클럽 가입 후 참석 가능"(클럽 멤버십 게이트 안내, S8 cross-ref) 라벨이 동시 노출됨. 즉 waitlist 상태와 클럽 가드는 시각적으로 결합되어 표시.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:119 | [E2E 보강 (cross-ref S2): seed_event_list_badge_matrix_test.dart::waitlist_detail_cancel_surface — 클럽 이벤트 상세에서 "클럽 가입 후 참석 가능" 라벨 노출. WAITING 상태와 동시 노출 가능.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:177 | **현재 구현 갭**: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:184 | - 승인 전 결제 거래가 생성되면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:185 | - 거절된 신청자에게 결제 CTA가 노출되면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:186 | - 승인 후 결제 전 사용자가 체크인/리뷰/위치공유 대상자로 보이면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:122 | Apply --> P1[⚪ INSERT applications PENDING] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:123 | P1 --> P2[🟠 FCM → 호스트/coHost] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:124 | P2 --> Hold[🔵 심사 중 표시<br/>승인 후 결제 CTA 대기] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:142 | class P1,F1,F2 storage | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:143 | class P2 external | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 무료 + 승인 불필요 + 정원 여유 (Happy Path)**: Given 로그인됨, 이벤트 status=OPEN, currentCapacity=8/12, approvalRequired=false. When 사용자가 해당 흐름을 실행하면 Then 사용자 ATTENDING, 호스트에게 알림 없음 (자동 신청은 알림 트리거 없음 — 코드 확인 결과 NEW_APPLICATION은 apply 경로에서만 발생).
- **AC-02. 정원 초과 + 대기열 등록**: Given status=OPEN, currentCapacity=12/12, waitlistEnabled=true, 대기열 2명. When 사용자가 해당 흐름을 실행하면 Then 사용자 WAITING.
- **AC-03. 자동 승급 (다른 사용자 취소 시)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 순번 갱신.
- **AC-04. 자동 승급된 사용자가 ATTENDING으로 전환**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 ATTENDING.
- **AC-05. 승인 필요 이벤트 신청 → 호스트 승인**: Given status=OPEN, approvalRequired=true. When 사용자가 해당 흐름을 실행하면 Then ATTENDING.
- **AC-06. 자가 취소 (ATTENDING)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 CANCELLED, 다음 대기자 ATTENDING.
- **AC-07. 호스트 본인이 신청 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 클럽 비멤버가 클럽 이벤트 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 중복 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 정원 + 대기열 모두 가득**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-11. 유료 이벤트 신청 시 잔액 부족**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-12. 모집 마감(`isClosed=true`) 후 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-13. 유료 + 승인제 이벤트 신청 → 승인 후 결제 필요**: Given 로그인됨, 이벤트 status=OPEN, price=20,000, approvalRequired=true 또는 visibility=APPROVAL, currentCapacity=8/10. When 사용자가 해당 흐름을 실행하면 Then 결제 성공 전까지 정식 참석자가 아니며, 결제 성공 후에만 참석 확정.
- **AC-W2-1 (S2-2). 선입금 + 승인 필요 + 호스트 승인**: Given `prepaymentRequired=true`, `approvalRequired=true`. When 호스트가 승인 호출. Then `Application=APPROVED_PENDING_PAYMENT + paymentDueAt` 설정, capacity 미점유. 알림 71 발송(after-commit). 결제 facade 진입은 F03-13.
- **AC-W2-2 (S2-2b). 선입금 + 자동 승인**: Given `prepaymentRequired=true`, `approvalRequired=false`. When 참가자가 `POST .../apply`. Then 즉시 `Application=APPROVED_PENDING_PAYMENT + paymentDueAt`, capacity 미점유. 결제 후에만 ATTENDING.
- **AC-W2-3 (S2-5). 결제 기한 만료**: Given `APPROVED_PENDING_PAYMENT + paymentDueAt < now()`. When `EventPrepaymentExpiryScheduler` 실행. Then `Application=PAYMENT_EXPIRED + event_payment(PENDING→CANCELED)`. capacity 변화 없음. 알림 75.
- **AC-W2-4 (S2-6). 사용자 자가 취소 (WALLET PAID) — `cancelMyParticipation`**: Given `event_payment.PAID(WALLET)`. When `DELETE /api/v1/events/{eventId}/apply`. Then facade가 `refundByWallet` 호출 → `Application=CANCELED + capacity-- + event_payment.REFUNDED + 분개 1건`. 알림 76. (환불 facade 자체는 F03-13에서 검증)
- **AC-W2-5 (S2-7). 사용자 자가 취소 (BANK PAID)**: Given `event_payment.PAID(BANK_TRANSFER)`. When 동일 호출. Then `event_payment.REFUND_REQUESTED + Application 유지`. 알림 83.
- **AC-W2-6 (S2-11). 탈퇴 차단**: Given active `event_payment` 보유. When 탈퇴 요청. Then 400 `DEACTIVATION_BLOCKED_BY_PAYMENT` + `ACTIVE_EVENT_PAYMENT` BlockingItem.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.

## 11. 변경 이력

- **2026-05-22 (v4.5 W1 — 정원 초과 허용)**: `apply` 사전 정원 체크를 명백한 FULL만 차단하도록 완화하고, 분기 결정은 `CapacityService.createAttendanceFromApplication`(및 결제 확정 경로 `confirmAttendanceFromPayment`)이 호출하는 `CapacityPolicy.decide` 5-룰 매트릭스에 위임(§2.1). 자동 승인 이벤트 + `overcapacityAllowed=true` 조합에서는 `attend/apply`가 즉시 `ATTENDING + OVERCAPACITY_APPROVED(9)` 분기로 진입(Q6). 결제 확정 시점 race에는 `CAPACITY_FULL_AT_CONFIRMATION(400012)` ErrorCode 도입 — WALLET은 전체 롤백, BANK는 `REFUND_REQUESTED` 전환(§2.2). EventVo에 `overcapacityAllowed / hardCapacityLimit / exceedingAttendees / reservedPaymentPendingCount` 4개 필드 노출(`reservedPaymentPendingCount`는 단건 lazy 조회, 목록은 0).
- **2026-06-05 (D-20 / v3 — ApplicationStatus 전체 7값 + 제재 가드 + CANCEL_PENDING_REFUND)**: `ApplicationStatus` enum 7값 전체 명시 — `CANCEL_PENDING_REFUND` 추가(`ApplicationStatus.java:24-36`). stale "APPROVED_PENDING_PAYMENT 미구현" 문구 제거 (이미 구현됨). `EventApplyRestrictionGuard` 신규 컴포넌트 — 클럽-스코프+플랫폼 전역 2축 제재 검사, `apply`/`attend`/`createAttendanceFromApplication`/`confirmAttendanceFromPayment` 진입점 적용. `CANCEL_PENDING_REFUND` 노쇼 통계 제외 정책 (`CheckInService.java:237-255`). 노쇼 관리 상세는 F03-20 링크 추가.
