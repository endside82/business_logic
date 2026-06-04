# F03-13. 이벤트 참가 선입금 (참가자·호스트) PRD

<!-- generated: source-first-event-extensions; updated: 2026-05-22; unit: business_logic/units/03_event/F03-13_event-prepayment -->

> 문서 상태: **신규 신설본 (W2/W3)**. 본 PRD는 `docs/plan/event-extensions/PLAN.md` v4.5 §2 / §0.2 / §0.4 / §2.14 / §2.15와 `ENUM_RESERVATIONS.md`, `E2E_SCENARIOS.md` S2-1 ~ S2-11을 근거로 신규 작성한다. F03-05(참가 신청), F06-06(포인트 결제·환불), F07-09(모임 정산 선입금)와 명확히 분리되는 별도 결제 객체(`event_payment` 테이블)를 다룬다.

## 1. 결론

선입금 활성 이벤트(`EventPrepayment.prepaymentRequired=true`)에서 참가자가 호스트 승인 또는 자동 승인 후 `APPROVED_PENDING_PAYMENT` 상태에 진입하면, 지정된 `paymentDueAt` 기한 내에 **WALLET(포인트 지갑)** 또는 **BANK_TRANSFER(계좌이체 신고)** 중 한 가지 방식으로 선입금을 납부해 참가를 확정한다. WALLET은 즉시 PAID + capacity++ + 참석 확정이 자동 발생하고, BANK_TRANSFER는 호스트가 입금 확인(`bankConfirm`) 또는 거부(`bankReject`)를 직접 수행해야 결정된다. 환불은 사용자 취소·이벤트 취소·호스트 거부 트리거 각각에 대해 정해진 경로(WALLET 자동 환불 / BANK 호스트 수동 환불 / `REFUND_REQUESTED` 큐)로 정리된다.

**환불 정책 (2026-06-05 카탈로그 기반 갱신)**: 환불율은 이벤트별 `event_refund_policy` 카탈로그(6종 템플릿 — STANDARD/STRICT/FLEXIBLE/FULL/NON_REFUNDABLE/CUSTOM)에 기반한 by_time 다단계 비율로 산출된다. 귀책(RefundFaultCategory)에 따라 최대 100% ~ 0% 범위에서 결정된다. 레거시 "단일 deadline 100%/마감 후 0%" 규칙은 Phase 4(커밋 c7b4315)에서 `event_refund_policy` 카탈로그 계산기로 전환되어 폐기됨 (상세는 §환불 정책 카탈로그 절 참조).

본 단위는 F03-05와 분리한다. F03-05는 신청·취소의 사용자 진입 흐름을 다루고, F03-13은 그 신청이 결제로 확정되는 별도 트랜잭션과 회계·환불 흐름을 다룬다. UX 측면에서는 두 흐름이 이벤트 상세 화면 하단 액션바에서 연속적으로 보이지만, 데이터 모델 측면에서는 `application` row(F03-05)와 `event_payment` row(F03-13)가 1:0..1로 분리되어 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 호스트 승인 후 액션바가 "결제하고 참석 확정"으로 전환 ▶ 결제 화면
- 마이 이벤트(F03-12) "결제 대기" 카드 ▶ 결제 화면 또는 BANK 신고 안내
- 알림(F12) `EVENT_PREPAYMENT_REQUIRED(71)` / `EVENT_PREPAYMENT_BANK_CONFIRMED(73)` / `EVENT_PREPAYMENT_BANK_REJECTED(74)` 등 ▶ 결제 화면

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Plan | `docs/plan/event-extensions/PLAN.md` (v4.5) | 있음 | §2.1 D1 동기화 / §2.2 DDL / §2.4 결제 facade / §2.6 환불 / §2.14 사용자 취소 / §2.15 이벤트 취소 |
| Enum 예약 | `docs/plan/event-extensions/ENUM_RESERVATIONS.md` | 있음 | TransactionType 26, NotificationType 71~76, 83 |
| E2E | `docs/plan/event-extensions/E2E_SCENARIOS.md` | 있음 | S2-1 ~ S2-11 |
| Backend | `community_api/src/main/java/com/endside/community/event/prepayment/...` | 구현됨 (W2a/W2b) | Controller, Service, VO, Enum, repository 근거 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/prepayment/controller/EventPrepaymentController.java:33` (POST `/api/v1/events/{eventId}/prepayment/wallet`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/controller/EventPrepaymentController.java:41` (POST `/api/v1/events/{eventId}/prepayment/bank-declare`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/controller/EventPrepaymentController.java:50` (POST `/api/v1/events/{eventId}/applications/{applicationId}/bank-confirm`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/controller/EventPrepaymentController.java:59` (POST `/api/v1/events/{eventId}/applications/{applicationId}/bank-reject`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/controller/EventPrepaymentController.java:71` (POST `/api/v1/events/{eventId}/applications/{applicationId}/refund-wallet`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/controller/EventPrepaymentController.java:81` (POST `/api/v1/events/{eventId}/applications/{applicationId}/refund-bank-confirm`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventPrepaymentService.java:68` (`payByWallet`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventPrepaymentService.java:124` (`bankDeclare`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventPrepaymentService.java:159` (`bankConfirm`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventPrepaymentService.java:211` (`bankReject`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventPaymentRefundService.java:68` (`refundByWallet`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventPaymentRefundService.java:153` (`refundByBankConfirm`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventPaymentRefundService.java:203` (`refundByHostCancel`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/prepayment/service/EventParticipationCancellationService.java:44` (`cancelMyParticipation`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/service/WalletService.java:189` (`payForApplication`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/service/EventService.java:631` (`tryRefundNewPrepayment`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/service/AccountDeactivationService.java:493` (`ACTIVE_EVENT_PAYMENT` BlockingItem) | 확인됨 |

## 3. 전체 동작 흐름

PLAN.md §2.4·§2.6·§2.14·§2.15의 facade 체계를 7단계로 압축한다.

1. **선입금 정책 활성화** (호스트, DRAFT 또는 OPEN 진입 직전 — F03-03/F03-04 흐름):
   - `EventPrepayment(prepaymentRequired=true, prepaymentAmount=A)` row 생성 + `Event.price = A` 단방향 동기화 (D1).
   - 활성 + `prepaymentAmount<=0` → 400 `INVALID_PREPAYMENT_AMOUNT`.
   - 활성 + `price != prepaymentAmount` → 400 `PRICE_PREPAYMENT_MISMATCH`.
   - OFF 전환 시 `event.price=0` 무료 이벤트로 자동 전환 (Q2 사용자 확정).
2. **참가자 신청** (F03-05 위임):
   - 자동 승인 + 선입금 활성 → `Application=APPROVED_PENDING_PAYMENT` + `paymentDueAt = now() + (policy.paymentDeadlineHours || 24h)`. capacity 미점유 (D4).
   - 승인 필요 + 선입금 활성 → `Application=PENDING` → 호스트 승인 후 `APPROVED_PENDING_PAYMENT` + `paymentDueAt` 설정. 동일하게 capacity 미점유 (D4).
   - 알림: `EVENT_PREPAYMENT_REQUIRED(71)` (after-commit, D15).
3. **참가자가 결제 수단 선택**:
   - WALLET: `POST /api/v1/events/{eventId}/prepayment/wallet` → `EventPrepaymentService.payByWallet`.
   - BANK_TRANSFER: `POST /api/v1/events/{eventId}/prepayment/bank-declare` → `EventPrepaymentService.bankDeclare`.
4. **결제 처리** (트랜잭션 단위, lock 순서 event → application → event_payment, §0.4):
   - WALLET: `event_payment(PENDING) → WalletService.payForApplication → event_payment(PAID) + Application(APPROVED) + capacity++ + EventAttendance(ATTENDING)`. 단일 트랜잭션. 실패 시 전체 롤백 (capacity 매트릭스가 `CAPACITY_FULL_AT_CONFIRMATION`을 던지면 wallet 차감/event_payment insert 모두 rollback).
   - BANK_TRANSFER: `event_payment(PENDING, method=BANK_TRANSFER, bankTransferMemo)` 생성 후 호스트 알림(`EVENT_PREPAYMENT_BANK_DECLARED(72)`). capacity 미점유.
5. **호스트 BANK 처리** (BANK_TRANSFER만):
   - 확인: `POST /api/v1/events/{eventId}/applications/{applicationId}/bank-confirm` → `bankConfirm`. capacity 매트릭스 통과 시 `event_payment(PAID) + Application(APPROVED) + capacity++ + EventAttendance(ATTENDING)`. 매트릭스 fail 시 rollback 없이 `event_payment(REFUND_REQUESTED)` + 호스트 수동 환불 대기 (PLAN.md §1.4.2, §2.4.3).
   - 거부: `POST /api/v1/events/{eventId}/applications/{applicationId}/bank-reject` → `bankReject`. `event_payment(CANCELED)`. `Application`은 `APPROVED_PENDING_PAYMENT` 유지 → 참가자 재신고 가능.
   - 알림: 각각 `EVENT_PREPAYMENT_BANK_CONFIRMED(73)` / `EVENT_PREPAYMENT_BANK_REJECTED(74)` (after-commit).
6. **환불 (사용자 취소 / 이벤트 취소 / 호스트 거부)**:
   - 사용자 자가 취소 → `EventParticipationCancellationService.cancelMyParticipation` (F03-05 `DELETE /api/v1/events/{eventId}/apply` 경로가 라우팅). 결제 상태별 분기:
     - `event_payment.PENDING` → `event_payment(CANCELED)` + `Application(CANCELED)`.
     - `event_payment.PAID + WALLET` → `EventPaymentRefundService.refundByWallet` (`event_refund_policy` 카탈로그 기반 환불율 적용 — 귀책 PARTICIPANT_FAULT 시 by_time 정책%, HOST_FAULT·FORCE_MAJEURE·MUTUAL·RESCHEDULE_DECLINED 시 100%, `Application(CANCELED)`, capacity 차감).
     - `event_payment.PAID + BANK_TRANSFER` → `event_payment(REFUND_REQUESTED)` + 호스트에게 `EVENT_PREPAYMENT_REFUND_REQUESTED(83)` 알림. `Application`은 유지 (호스트가 `refundByBankConfirm` 호출 시 함께 CANCELED).
   - 호스트가 이벤트 취소 → `EventService.cancelEvent` / `ClubEventService.cancelClubEvent` / `RecurringEventCreateService.cancelAllFutureEvents` 가 `tryRefundNewPrepayment` 우선 시도. 신규 `event_payment` 존재 → `refundByHostCancel`(WALLET 100%) 또는 `REFUND_REQUESTED`(BANK). 없으면 legacy `WalletService.refundByHostCancel`(referenceType=`EVENT_PAYMENT`) fallback.
   - 호스트 BANK 수동 환불 → `POST /api/v1/events/{eventId}/applications/{applicationId}/refund-bank-confirm` → `refundByBankConfirm(amount, memo)`. 회계 분개 없음 (D5).
7. **만료**:
   - `EventPrepaymentExpiryScheduler`가 `Application.paymentDueAt < now()` row를 `APPROVED_PENDING_PAYMENT → PAYMENT_EXPIRED`로 일괄 전이 + `event_payment` PENDING이 있으면 `CANCELED`. capacity 변화 없음 (D4). 알림 `EVENT_PREPAYMENT_EXPIRED(75)` (after-commit).

## 4. 서버 계약

### 개요

선입금이 활성화된 이벤트에 대해 `event_payment` row를 application당 활성 최대 1건(D6) 유지하면서 결제·환불 트랜잭션 전체를 facade로 통제한다. WALLET은 회계 분개를 동반(`AccountingLedgerService.recordPayment/recordRefund`, F06-06 기존 경로 재사용)하고, BANK_TRANSFER는 분개를 발생시키지 않고 audit만 남긴다(D5). 결제 진입점·환불 진입점·이벤트 단위 취소 진입점이 각각 분리되어 있으므로 `event_payment` 상태머신을 단일 source-of-truth로 두고 모든 진입점에서 일관 적용한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/events/{eventId}/prepayment/wallet` | EventPrepaymentController#payByWallet | required (본인) | WALLET 선입금 결제 facade |
| POST | `/api/v1/events/{eventId}/prepayment/bank-declare` | EventPrepaymentController#bankDeclare | required (본인) | BANK_TRANSFER 신고 |
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/bank-confirm` | EventPrepaymentController#bankConfirm | required (Host/CoHost) | 입금 확인 |
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/bank-reject` | EventPrepaymentController#bankReject | required (Host/CoHost) | 입금 미확인 거부 |
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/refund-wallet` | EventPrepaymentController#refundByWallet | required (본인 또는 Host/CoHost) | WALLET 환불 (카탈로그 기반 환불율 — PARTICIPANT_FAULT by_time%, HOST_FAULT 100%) |
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/refund-bank-confirm` | EventPrepaymentController#refundByBankConfirm | required (Host/CoHost) | BANK 수동 환불 완료 표시 |
| DELETE | `/api/v1/events/{eventId}/apply` | EventController#cancelApplication → `EventParticipationCancellationService.cancelMyParticipation` | required (본인) | 참가 취소 (결제 정리 선행) |

### 도메인 모델 / Enum

- **`event_payment` 테이블** (PLAN.md §2.2, 갱신 2026-06-05):
  - `id, event_id, user_id, application_id, amount, method, status, bank_transfer_memo, host_confirmed_at, host_confirmed_by, point_tx_id, refund_point_tx_id, paid_at, refunded_at, refund_amount, refund_reason, refund_failure_reason`
  - `refund_evidence_file_ids` json DEFAULT NULL — 호스트 수동 환불 증빙 fileId 배열 (이체증 등, 최대 5건) (`V1__init.sql:1163`)
  - `active_application_id` STORED generated column (status IN PENDING/PAID/REFUND_REQUESTED 일 때만 application_id, 그 외 NULL) + `UNIQUE KEY uk_event_payment_active` → application당 동시 활성 1건 보장 (D6).
- **Enum `EventPaymentMethod`** (신규): `WALLET, BANK_TRANSFER`
- **Enum `EventPaymentStatus`** (신규): `PENDING → PAID | CANCELED`, `PAID → REFUND_REQUESTED → REFUNDED`, `PENDING → CANCELED`.
- **Enum `ApplicationStatus`** (기존 + 본 W2 사용): `PENDING, APPROVED, APPROVED_PENDING_PAYMENT, PAYMENT_EXPIRED, REJECTED, CANCELED`.
- **Enum `TransactionType` 신규 26**: `EVENT_PREPAYMENT_REFUND` (ENUM_RESERVATIONS.md).
- **Enum `NotificationType` 신규**: 71 `EVENT_PREPAYMENT_REQUIRED`, 72 `EVENT_PREPAYMENT_BANK_DECLARED`, 73 `EVENT_PREPAYMENT_BANK_CONFIRMED`, 74 `EVENT_PREPAYMENT_BANK_REJECTED`, 75 `EVENT_PREPAYMENT_EXPIRED`, 76 `EVENT_PREPAYMENT_REFUNDED`, 83 `EVENT_PREPAYMENT_REFUND_REQUESTED`.
- **EventVo 신규 필드** (단건 응답): `myPaymentRequired, myPayableAmount, myPaymentDueAt, reservedPaymentPendingCount`. EventSimpleVo는 `reservedPaymentPendingCount` 제외(D16, 목록 응답은 항상 0).
- **`EventViewerContextService.ViewerContext` record 확장**: 6개 → 9개 필드 (`payableAmount, paymentDueAt, paymentRequired` 추가, PLAN.md §2.10.2).

### 회계 분개

| 트리거 | 결제 방식 | 분개 호출 | 사용 계정 |
|---|---|---|---|
| `payByWallet` | WALLET | `AccountingLedgerService.recordPayment(txId, userId, eventId, hostId, amount)` (F06-06 기존 경로) | `USER_WALLET → CREATOR_PAYABLE` 등 |
| `bankConfirm` | BANK_TRANSFER | **분개 없음** (D5 — 호스트 직접 수취) | 호스트 정산 보고서 별도 6 섹션에만 노출 (PLAN.md §2.8) |
| `refundByWallet`(사용자 자가 취소 / 호스트 이벤트 취소) | WALLET | 정산 후처리는 공통 `EventRefundSettlementService.applyRefundToSettlement(…, paidRefund, 0L, freeRefund)` — pgQueuedPaid=0 고정, PG queue 미경유. paid/free 모두 즉시 지갑 복원. PG queue 통합은 후속 슬라이스. | type=`EVENT_PREPAYMENT_REFUND(26)` |
| `refundByBankConfirm` | BANK_TRANSFER | **분개 없음** (D5) | audit log만 (`event_payment.refund_amount, refund_reason, refunded_at`) |
| `bankReject` | BANK_TRANSFER | 분개 없음 | `event_payment.status=CANCELED, refund_reason=<host_reason>` |

> Phase 3(커밋 419e050)에서 `EventRefundSettlementService`로 분개 + 정산 후처리 일원화 완료. 선입금 경로는 `pgQueuedPaid=0` 고정으로 PG queue를 사용하지 않으며, PG 분개(`recordPgRefundRequested`)는 `EventRefundSettlementService.java:127-134`에서 pgQueuedPaid>0일 때만 발생한다. 선입금 경로에서의 PG queue 통합은 후속 슬라이스(§10 참조). 문서 §8/§10의 "PG queue 후속" 서술과 일치.

### 의존 단위 / 외부 시스템

- **Unit 03 F03-05** — `Application` 상태머신을 공유. `APPROVED_PENDING_PAYMENT` 진입은 F03-05의 apply/approve 분기에서 이루어지고, 본 단위는 그 상태에서만 결제 진입 허용.
- **Unit 06 F06-06** — `WalletService.payForApplication` (`WalletService.java:189`)이 신규 결제 경로. referenceType=`EVENT_PREPAYMENT` / referenceId=`eventPaymentId` 기준 중복 차단. 기존 `WalletService.pay`는 변경 없음 (D8).
- **Unit 06 회계** — `AccountingLedgerService.recordPayment/recordRefund` 재사용. AccountCode 신규 추가 없음 (D5).
- **Unit 03 F03-04 이벤트 취소** — `EventService.cancelEvent` (`:631 tryRefundNewPrepayment`) 가 신규 `event_payment` 우선 환불 후 legacy fallback. ClubEventService / RecurringEventCreateService 동일 패턴.
- **Unit 12 알림** — 71~76, 83. 모두 `@TransactionalEventListener(AFTER_COMMIT)` 패턴 (D15).
- **Unit 13 계정 비활성화** — `AccountDeactivationService` (`:493`) `ACTIVE_EVENT_PAYMENT` BlockingItem. PENDING/PAID/REFUND_REQUESTED 상태 보유 시 탈퇴 차단 + `DEACTIVATION_BLOCKED_BY_PAYMENT` (`ErrorCode.java:96`).
- **외부 PG** — 본 단위에서 직접 호출 없음. WALLET 환불 lot이 PG 큐로 가는 경우 기존 `RefundRequestWorker` 경로 재사용 (후속 슬라이스).

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세(F03-02) ▶ 액션바 viewer 상태가 `approvedPendingPayment` ▶ "결제하고 참석 확정" CTA ▶ 결제 화면
- 마이 이벤트(F03-12) "결제 대기" 카드 ▶ 동일 결제 화면
- 알림 71/73/74/75 ▶ 결제 화면 또는 결과 화면 deep link

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (`lib/presentation/event/`) | 역할 |
|---|---|---|
| `/events/:eventId/participation-payment` | `screens/event_participation_payment_screen.dart` | 참가자 결제 진입 (WALLET / BANK 선택) |
| `/events/:eventId/participation-payment/bank-declare` | `screens/event_participation_payment_bank_declare_screen.dart` | BANK 신고 입력 (입금자명/메모) |
| `/events/:eventId/host/participation-payment/pending` | `screens/host_participation_payment_pending_screen.dart` | 호스트 입금 대기 목록 + 확인/거부 |
| (위젯) | `widgets/event_payment_status_section.dart` | 이벤트 상세에 임베드되는 결제 상태 섹션 |

> 1차 출시 W2/W3 백엔드 우선 슬라이스에서 Flutter 화면은 신설되지 않을 수 있다. 화면 구현은 후속 슬라이스에서 다룬다 (§10).

### 화면별 구성 요소 & 액션

#### 결제 화면 (`event_participation_payment_screen.dart`)

- **사용자가 보는 것**: 결제 금액(`myPayableAmount`), 결제 기한(`myPaymentDueAt`), WALLET/BANK 라디오, 잔액 표시, 환불 규정 안내.
- **사용자가 할 수 있는 액션**:
  - WALLET 선택 + "결제하기" ▶ `POST .../prepayment/wallet` ▶ 성공 시 `eventDetailNotifierProvider.invalidate()` + 토스트 "결제가 완료되었습니다".
  - 잔액 부족 → ApiError `PaymentFailureVo` payload 받아서 충전 화면 prefill (F06-06 동일).
  - BANK 선택 + "입금 신고하기" ▶ bank declare 화면으로 이동.

#### BANK 신고 화면 (`event_participation_payment_bank_declare_screen.dart`)

- 입금자명/메모 입력 ▶ `POST .../prepayment/bank-declare { memo }` ▶ 성공 시 "호스트 확인 대기 중" 안내 + 시트 dismiss.

#### 호스트 입금 대기 목록 (`host_participation_payment_pending_screen.dart`)

- 신청자 카드 (이름, 메모, 신고 시각) ▶ "확인" → `POST .../applications/{applicationId}/bank-confirm`, "거부" → `POST .../applications/{applicationId}/bank-reject { reason }`.
- 확인 후 응답이 `REFUND_REQUESTED`로 오면 "정원 초과로 환불 필요" 라벨 표시 → 호스트가 별도 계좌환불 후 `POST .../refund-bank-confirm` 호출.

### API 호출 순서

1. 이벤트 상세 진입 → `eventDetailNotifierProvider(eventId)` 응답에서 `myPaymentRequired=true && myPaymentDueAt`을 감지하여 액션바를 "결제하고 참석 확정"으로 전환.
2. 참가자 결제 화면 진입 → `eventPrepaymentPolicyProvider(eventId)` ▶ `GET /api/v1/events/{eventId}/prepayment/policy` 로 안내 문구·환불 정책 로드.
3. WALLET 결제 → `eventPrepaymentRepository.payByWallet(eventId)` 성공 후 `eventDetailNotifierProvider`, `walletNotifierProvider`, `transactionListNotifierProvider`, `myApplicationsProvider` invalidate.
4. BANK 신고 → `eventPrepaymentRepository.bankDeclare(eventId, BankDeclareParam(memo))` 성공 후 `myEventPaymentProvider(eventId)` invalidate.
5. 호스트 입금 대기 → `hostBankPendingProvider(eventId)` ▶ `GET /api/v1/events/{eventId}/prepayment/bank-pending` (호스트 전용).
6. 환불(사용자 자가 취소) → F03-05의 `DELETE /api/v1/events/{eventId}/apply` 호출 1회로 충분 — 결제 정리는 facade가 처리.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 결제 화면 라벨: "결제하고 참석 확정" / "입금 신고하기" / "입금 확인 대기 중" / "환불 요청됨"
- 환불 규정 안내 모달 문구: `GET /api/v1/events/{eventId}/applications/{applicationId}/refund-preview` (RefundPreviewVo) 기반으로 예상 환불액·적용 비율·귀책 카테고리를 표시. 레거시 "시작 전 100%/시작 후 0%" 문구는 더 이상 정확하지 않음 — 카탈로그 기반 by_time 비율로 갱신 필요. `RefundPreviewVo.appliedPercent`와 `allowed` 필드로 UI 분기
- 잔액 부족 분기 → 충전 화면 prefill (F06-06과 동일 패턴)
- 알림 라우팅 (`NotificationRouter`): 71~76, 83 케이스 각각 결제 화면 또는 결과 화면 deep link

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S2-1 | 자동 승인 + 선입금 활성 신청 → WALLET 결제 (Happy Path) | 로그인됨, 이벤트 OPEN, `approvalRequired=false`, `prepaymentRequired=true`, capacity 여유, 잔액 충분 | `Application=APPROVED + EventAttendance=ATTENDING + event_payment.PAID(WALLET) + capacity++`. `PointTransaction(type=PAY, referenceType=EVENT_PREPAYMENT)` 신규 1건. `AccountingLedger` 분개 1건. 알림 73 미발송(자동 승인 케이스), 결제 완료 알림은 `PAYMENT_COMPLETED` 등 기존 채널 재사용 검토. |
| S2-2 | 승인 필요 + 선입금 활성 신청 → 호스트 승인 후 WALLET 결제 | OPEN, `approvalRequired=true`, `prepaymentRequired=true` | `Application=PENDING → APPROVED_PENDING_PAYMENT(+paymentDueAt)`. 호스트 승인 시 알림 71 발송. 참가자 결제 후 `APPROVED + ATTENDING + event_payment.PAID(WALLET)`. |
| S2-3 | 선입금 활성 + BANK_TRANSFER 신고 → 호스트 확인 | `Application=APPROVED_PENDING_PAYMENT` | `bankDeclare` 후 `event_payment.PENDING(BANK_TRANSFER)`. 호스트 `bankConfirm` 후 `event_payment.PAID + Application=APPROVED + ATTENDING + capacity++`. 분개 없음(D5). 알림 72/73. |
| S2-4 | BANK 신고 → 호스트 거부 (`bankReject`) | `event_payment.PENDING(BANK_TRANSFER)` | `event_payment.CANCELED + refund_reason=<reason>`. `Application=APPROVED_PENDING_PAYMENT` 유지. 알림 74. 참가자 재신고 가능 (UNIQUE 제약은 active 상태에서만 적용). |
| S2-5 | `paymentDueAt` 만료 (WALLET·BANK 공통) | `Application=APPROVED_PENDING_PAYMENT, paymentDueAt < now()` | `EventPrepaymentExpiryScheduler` → `Application=PAYMENT_EXPIRED + event_payment(PENDING이 있으면 CANCELED)`. capacity 변화 없음. 알림 75. |
| S2-6 | 참가자 자가 취소 (WALLET PAID 상태) | `event_payment.PAID(WALLET)`, 취소 시점 | `DELETE /api/v1/events/{eventId}/apply` → `cancelMyParticipation` → `refundByWallet` (`event_refund_policy` 카탈로그 기반 환불율 — PARTICIPANT_FAULT by_time%, HOST_FAULT 100%) → `event_payment.REFUNDED + Application=CANCELED + capacity--`. `PointTransaction(type=EVENT_PREPAYMENT_REFUND)` 1건 + 분개 1건. 알림 76. |
| S2-7 | 참가자 자가 취소 (BANK_TRANSFER PAID 상태) | `event_payment.PAID(BANK_TRANSFER)` | `event_payment.REFUND_REQUESTED`. `Application` 유지 (호스트가 수동 환불 후 `refundByBankConfirm` 호출 시 `REFUNDED + Application=CANCELED + capacity--`). 알림 83 → 호스트, 환불 진행 안내는 호스트 책임. |
| S2-8 | 호스트가 이벤트 취소 (참가자가 WALLET PAID 보유) | `EventService.cancelEvent` 호출, 신규 `event_payment.PAID(WALLET)` 존재 | `EventCancellationRefundCoordinator` (또는 현재 구현의 `EventService.tryRefundNewPrepayment`) → `EventPaymentRefundService.refundByHostCancel` → `event_payment.REFUNDED + Application=CANCELED`. WALLET 100% 환불 + 분개 1건. `Event.status=CANCELED`. |
| S2-9 | 호스트가 이벤트 취소 (참가자가 BANK PAID 보유) | 동일 트리거, `event_payment.PAID(BANK_TRANSFER)` | `event_payment.REFUND_REQUESTED`. `Application` 유지 → 호스트 수동 환불 후 `refundByBankConfirm`. |
| S2-10 | 호스트가 이벤트 취소 (legacy `EVENT_PAYMENT` 결제만 존재) | 신규 `event_payment` row 없음, legacy `PointTransaction(referenceType=EVENT_PAYMENT)` 보유 | `tryRefundNewPrepayment` 0건 처리 → `WalletService.refundByHostCancel` legacy fallback 호출. F06-06 기존 환불 흐름 그대로. |
| S2-11 | 계정 비활성화 시도 (active event_payment 보유) | `event_payment.PENDING/PAID/REFUND_REQUESTED` 보유 사용자 | `AccountDeactivationService` BlockingItem `ACTIVE_EVENT_PAYMENT` 노출 + 400 `DEACTIVATION_BLOCKED_BY_PAYMENT`. WALLET PAID는 "참가 취소·환불 완료 후 탈퇴", BANK는 "호스트 환불 완료 후 탈퇴", PENDING은 "참가 취소 후 탈퇴" 안내. |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | `community_api/src/main/java/com/endside/community/event/prepayment/` 전체 (controller, service, repository, model, vo, param, event listener) | W2a/W2b/W3 슬라이스로 구현 완료. PLAN.md §2.4/§2.6/§2.14/§2.15와 일치. lock 순서 `event → application → event_payment` 준수(§0.4). |
| 회계 분개 | WALLET 결제·환불만 `AccountingLedgerService` 진입. BANK는 분개 없음 (D5). | F06-06 기존 분개 경로 재사용. 신규 AccountCode 추가 없음. |
| 중복 차단 | `event_payment.active_application_id` STORED + UNIQUE + `point_transaction.existsByUserIdAndReferenceTypeAndReferenceId(userId, "EVENT_PREPAYMENT", eventPaymentId)` 이중 보장 (D6, D8). | UNIQUE 제약 위반 시 `DataIntegrityViolationException` → `DUPLICATE_PAYMENT` 변환 |
| 환불 정책 | Phase 4(커밋 c7b4315)에서 `event_refund_policy` 카탈로그 기반 계산기로 전환 완료. D7 "단일 deadline 100%/마감 후 0%" 폐기. GRADUATED는 레거시 STANDARD 매핑. | `RefundPolicyService.computeRefund`(귀책 분기) + `EventPaymentRefundService.refundByWallet` (2026-06-05 해소). |
| 알림 | 71~76, 83 모두 `@TransactionalEventListener(AFTER_COMMIT)` (D15). | `EventExtensionNotificationListener` (`event/prepayment/event/`). 결제 트랜잭션 롤백 시 알림 미발송. |
| 탈퇴 통합 | `AccountDeactivationService` BlockingItem `ACTIVE_EVENT_PAYMENT` + `DEACTIVATION_BLOCKED_BY_PAYMENT` | 자동 cancel 허용 케이스(PENDING 결제 없음, APPROVED 무료, APPROVED_PENDING_PAYMENT + 결제 만료) 분기 명문화 |

## 7-A. 환불 정책 카탈로그 (갱신 2026-06-05)

> 소스: `RefundPolicyCatalogService.java:52-105`, `RefundPolicyService.java:132-268`, `RefundPolicyController.java:36-68`, `V1__init.sql:4481-4512`.

### 카탈로그 조회 및 미리보기 API

| HTTP | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/v1/refund-policy-templates` | 불필요(public) | 활성 템플릿 전체 목록 — `List<RefundPolicyTemplateVo>` |
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/refund-preview` | 필요 | 환불 예상액 미리보기 — `RefundPreviewParam` → `RefundPreviewVo` |

### 6종 템플릿 (RefundPolicyTemplateCode)

`STANDARD`, `STRICT`, `FLEXIBLE`, `FULL`, `NON_REFUNDABLE`, `CUSTOM`

| templateCode | by_time tier (시작 N시간 전 → 환불%) | fixed_fee | 비고 |
|---|---|---|---|
| STANDARD | 168h→100%, 72h→80%, 24h→50%, 12h→30%, 0h→0% | 1,000원 | 기본 템플릿 |
| STRICT | 168h→100%, 72h→50%, 24h→0% | 2,000원 | 엄격 |
| FLEXIBLE | 24h→100%, 0h→0% | 0원 | 유연 |
| FULL | 0h→100% | 0원 | 전액 환불 |
| NON_REFUNDABLE | 0h→0% (nonRefundable=true) | 0원 | 환불 불가 |
| CUSTOM | 호스트 직접 설정 (1~6 segments, hoursBeforeStart 내림차순 strict) | 0원 (조정 가능) | 커스텀 |

### 이벤트별 환불 정책 설정 (event_refund_policy)

`event_refund_policy` 테이블 (`V1__init.sql:4499-4512`):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `event_id` | bigint PK | FK → event.id |
| `template_code` | varchar(40) | RefundPolicyTemplateCode 참조 |
| `rules_snapshot_json` | json | 이벤트 생성 시 스냅샷 복사 |
| `fixed_fee_amount` | bigint | 고정 수수료(원) |
| `override_rules_json` | json NULL | CUSTOM/override rules |
| `host_fault_waive_fixed_fee` | tinyint(1) DEFAULT 1 | HOST_FAULT 시 fixed_fee 면제 |

호스트가 이벤트 생성 시 `EventAddParam.refundPolicyConfig` (`EventRefundPolicyParam`)로 정책을 설정한다. 레거시 필드 `refundPolicy/refundPolicyType/refundDeadlineHours`는 `@Deprecated` 처리되었으며, 서버의 `EventService.legacyRefundInputToParam` 어댑터가 레거시 입력을 STANDARD 등으로 변환한다.

### 귀책 분기 매트릭스 (RefundFaultCategory — 전체 7종)

소스: `RefundFaultCategory.java:16-38`, `RefundPolicyService.computeRefund:132-198`

| faultCategory | 환불율 | fixed_fee | hostingTicketAction |
|---|---|---|---|
| `HOST_FAULT` | 100% | 강제 0 | RELEASE |
| `FORCE_MAJEURE` | 100% | 강제 0 | RELEASE |
| `MUTUAL` | 100% | 강제 0 | RELEASE |
| `RESCHEDULE_DECLINED` | 100% | 강제 0 | RELEASE |
| `PARTICIPANT_FAULT` | by_time 매칭 % | policy.fixedFeeAmount (유료분 cap) | HOLD |
| `NO_SHOW` | 0% (allowed=false) | — | HOLD |
| `NO_SHOW_POST_ADJUSTMENT` | 호스트 입력 manual | 0 | OPTIONAL |

### 환불 예상액 미리보기 (refund-preview)

참가자가 취소 전 예상 환불액을 미리 확인한다.

`RefundPreviewParam`:
- `faultCategory` (RefundFaultCategory) — 귀책 카테고리. 참가자 자발 취소 시 `PARTICIPANT_FAULT`
- `requestTime` (DateTime, nullable) — 기준 시각 (null이면 now())
- `manualRefundAmount` (int, nullable) — `NO_SHOW_POST_ADJUSTMENT`시 수동 환불액

`RefundPreviewVo` 핵심 필드:
- `refundAmount`, `grossPaid`, `grossRefundBeforeFee`, `fixedFee`, `appliedPercent`
- `faultCategory`, `allowed` — 환불 가능 여부
- `appliedPolicyCode`, `hostingTicketAction`, `description`

Flutter: `cancel_attendance_sheet.dart`에서 `POST .../refund-preview` 호출 (faultCategory=PARTICIPANT_FAULT 고정), `preview.allowed == false`이면 취소 확정 버튼 비활성.

### BANK 환불 귀책 인지형 정책 상한 (갱신 2026-06-05)

소스: `EventPaymentRefundService.java:277-295, 377-403`, 에러코드: `BANK_REFUND_EXCEEDS_POLICY(400, 300014)`.

`refundByBankConfirm` (호스트 수동 BANK 환불) 시 `inferBankRefundFault` 로 귀책 자동 분류 후 `policyCeiling = policyComp.allowed() ? policyComp.refundAmount() : 0` 산출. `alreadyRefunded + requested > policyCeiling`이면 `BANK_REFUND_EXCEEDS_POLICY(400, 300014)` 반환.

귀책 판단 우선순위:
1. `refund_reason = "event_cancelled_by_host"` → HOST_FAULT (100%)
2. `refund_reason = "capacity_full_at_confirmation"` → FORCE_MAJEURE (100%)
3. `refund_reason = "user_restricted_from_event_apply"` → FORCE_MAJEURE (100%)
4. `refund_reason = "reschedule_declined_bank_pending"` → RESCHEDULE_DECLINED (100%)
5. `refund_reason.startsWith("user_cancellation")` → PARTICIPANT_FAULT (정책%)
6. 사유 없음 + event.status=CANCELED → HOST_FAULT
7. 나머지 → PARTICIPANT_FAULT (보수적 기본)

### EVENT_PREPAYMENT 정산 집계 계약 (갱신 2026-06-05)

소스: `PointTransactionQueryRepositoryDataJpaTest.java:41-185`, 커밋 6c5988e.

정산 집계 시 `EVENT_PREPAYMENT` referenceType(referenceId=event_payment.id)은 서브쿼리로 eventId를 복원하여 기존 `EVENT_PAYMENT` referenceType(referenceId=eventId)과 함께 합산된다.

| 집계 메서드 | 계약 |
|---|---|
| `calculateNetPaymentByEventId` | EVENT_PAYMENT(레거시) + EVENT_PREPAYMENT(서브쿼리 eventId 복원) 중복없이 합산. 타 이벤트 row·COMPLETED 아닌 row 배제 |
| `calculateNetPaymentByEventIdAndPeriod` | 위와 동일 + [start, end) 경계 필터 |
| `calculatePaidNetPaymentByEventIdAndPeriod` | paid 분리 합산 (EVENT_PREPAYMENT paidAmount 포함) |
| `calculateFreeNetPaymentByEventIdAndPeriod` | free 분리 합산 (EVENT_PREPAYMENT freeAmount 포함) |

> 회귀 배경: 결제 CTA가 `WalletService.pay`(referenceType=EVENT_PAYMENT)에서 `EventPrepaymentService.payByWallet`(referenceType=EVENT_PREPAYMENT)으로 이관되면서 집계 누락 시 정산 과소 계상 발생. 테스트 `PaidApprovalFlowE2ETest` 12 시나리오로 계약 확정.

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후속 | PLAN.md §0.2 | `WalletRefundExecutor` 추출 미완 — Phase 3에서 `EventRefundSettlementService`로 분개 공통화 완료, PG lot은 RefundService에만 적용(선결제 경로 pgQueuedPaid=0). PG queue 통합은 후속. | 후속 슬라이스 |
| 해소 | PLAN.md §2.6.1, D7 | ~~1차 환불 정책 단일 deadline 100%/마감 후 0%, GRADUATED 미구현~~ → Phase 4(c7b4315)에서 `event_refund_policy` 카탈로그 계산기로 전환 완료. GRADUATED는 레거시 STANDARD로 매핑. | 해소 2026-06-05 |
| 후속 | F03-13 §5 | 1차 Flutter 화면 미신설 가능 — W2/W3은 서버 facade 우선. 상세 화면 구현은 후속 슬라이스 | `lib/presentation/event/screens/event_participation_payment_*` 신설은 별도 슬라이스에서 처리 |
| 위험 | PLAN.md §1.4.2, S2-3 | `bankConfirm` 시 capacity 매트릭스 fail → `event_payment.REFUND_REQUESTED` 전이. 호스트가 별도 환불 후 `refundByBankConfirm` 호출해야 정리 | 호스트 화면 UI에서 "정원 초과 — 환불 필요" 라벨 강조. 미정리 row 모니터링 필요 (호스트 정산 보고서 §2.8 4번 섹션). |
| 위험 | PLAN.md §2.15, S2-9 | BANK PAID + 이벤트 취소 → `REFUND_REQUESTED`만 남고 자동 환불 불가. 호스트가 직접 계좌 환불 후 `refundByBankConfirm` 호출 필수 | 호스트 알림 + 정산 보고서에 미정리 행 노출. SLA 모니터링 후속 슬라이스 |
| Decision Needed | PLAN.md §2.16 | APPROVED_PENDING_PAYMENT + active event_payment 없음(PAYMENT_EXPIRED 직전 race) → 탈퇴 시 자동 `cancelApplication` 허용 케이스 | 운영 정책 추가 검증(QA 매트릭스에 포함) |

## 9. 수용 기준

- **AC-01 (S2-1). 자동 승인 + WALLET 결제 (Happy Path)**: Given 잔액≥`prepaymentAmount`, 자동 승인 + 선입금 활성, capacity 여유. When 참가자가 `POST /api/v1/events/{eventId}/prepayment/wallet` 호출. Then 단일 트랜잭션 안에서 `event_payment.PAID + Application=APPROVED + EventAttendance=ATTENDING + capacity++` + `PointTransaction(type=PAY, referenceType=EVENT_PREPAYMENT)` + 분개 1건. 잔액 = 잔액-`prepaymentAmount`.
- **AC-02 (S2-2). 승인 필요 + WALLET 결제**: Given 승인 필요 + 선입금 활성. When 호스트 승인 → 참가자 결제. Then 동일 종료 상태. `paymentDueAt`이 응답에 노출되며 알림 71 발송(after-commit).
- **AC-03 (S2-3). BANK 신고 → 호스트 확인**: Given `Application=APPROVED_PENDING_PAYMENT`. When `bankDeclare → bankConfirm`. Then `event_payment.PAID + ATTENDING + capacity++`, 분개 없음(D5), 알림 72/73.
- **AC-04 (S2-4). BANK 호스트 거부**: Given BANK_TRANSFER PENDING. When `bankReject(reason)`. Then `event_payment.CANCELED + Application 유지`. 알림 74. 참가자가 다시 신고 가능.
- **AC-05 (S2-5). 결제 기한 만료**: Given `Application=APPROVED_PENDING_PAYMENT, paymentDueAt < now()`. When `EventPrepaymentExpiryScheduler` 실행. Then `Application=PAYMENT_EXPIRED + event_payment(PENDING→CANCELED)`. capacity 변화 없음. 알림 75.
- **AC-06 (S2-6). 사용자 자가 취소 (WALLET PAID)**: Given `event_payment.PAID(WALLET)`. When `DELETE /api/v1/events/{eventId}/apply`. Then `cancelMyParticipation → refundByWallet` (카탈로그 기반 환불율 — PARTICIPANT_FAULT by_time%, HOST_FAULT 100%) + `Application=CANCELED + capacity--`. `PointTransaction(type=EVENT_PREPAYMENT_REFUND)` + 분개 1건. 알림 76.
- **AC-07 (S2-7). 사용자 자가 취소 (BANK_TRANSFER PAID)**: Given `event_payment.PAID(BANK_TRANSFER)`. When 동일 호출. Then `event_payment.REFUND_REQUESTED + Application 유지`. 호스트가 환불 후 `refundByBankConfirm` 호출 시 `REFUNDED + Application=CANCELED + capacity--`. 알림 83.
- **AC-08 (S2-8). 호스트 이벤트 취소 (WALLET PAID 참가자)**: Given 신규 `event_payment.PAID(WALLET)` 존재. When `EventService.cancelEvent`. Then `tryRefundNewPrepayment` → `refundByHostCancel` 100% + `event_payment.REFUNDED + Application=CANCELED`. `Event.status=CANCELED`.
- **AC-09 (S2-9). 호스트 이벤트 취소 (BANK PAID 참가자)**: Given `event_payment.PAID(BANK_TRANSFER)`. When 동일 호출. Then `event_payment.REFUND_REQUESTED + Application 유지`. 호스트가 직접 환불 후 `refundByBankConfirm` 1회 호출로 정리.
- **AC-10 (S2-10). legacy fallback**: Given 신규 `event_payment` 없음, legacy `PointTransaction(referenceType=EVENT_PAYMENT)` 존재. When 호스트가 이벤트 취소. Then `tryRefundNewPrepayment` 0건 → `WalletService.refundByHostCancel` legacy 경로로 환불.
- **AC-11 (S2-11). 탈퇴 차단**: Given `event_payment.PENDING/PAID/REFUND_REQUESTED` 보유. When 탈퇴 요청. Then 400 `DEACTIVATION_BLOCKED_BY_PAYMENT` + `AccountDeactivationCheckVo.blockingItems`에 `ACTIVE_EVENT_PAYMENT` 노출. WALLET 환불 / BANK 호스트 환불 / 참가 취소 완료 후 재시도.

## 10. 미결정 / 후속 슬라이스

| 항목 | 사유 | 후속 슬라이스 |
|---|---|---|
| WalletRefundExecutor 공통 헬퍼 추출 | Phase 3에서 `EventRefundSettlementService`로 분개 공통화 완료. PG lot은 RefundService만 적용(선결제 경로 pgQueuedPaid=0). PG queue 통합 후속. | EventExtensions W4 또는 별도 결제 리팩터링 슬라이스 |
| 호스트 환불 정책 설정 UI | `refund_policy_form.dart`가 레거시 5종 enumRadioGroup만 제공. 신규 6종 템플릿(STRICT/FLEXIBLE/NON_REFUNDABLE 직접 선택) 폼 미구현. 현재 레거시→신규 매핑으로만 간접 설정. | 레거시 폼 교체 슬라이스 |
| 환불 preview + 레거시 섹션 병렬 표시 모순 | `cancel_attendance_sheet.dart`에서 preview와 함께 레거시 `RefundPolicySection.forEvent(refundPolicy, refundDeadlineHours)` 병렬 표시 — 신규 preview와 레거시 섹션 내용이 모순될 수 있음 (`cancel_attendance_sheet.dart:97-101`). | 레거시 섹션 제거 또는 조건부 표시 슬라이스 |
| BANK_REFUND_EXCEEDS_POLICY(300014) 앱 에러 핸들링 | 에러 코드 신규 추가, 앱 측 에러 핸들러 매핑 미확인. | 에러 핸들러 매핑 확인/추가 |
| Flutter 결제 화면 신설 | 본 W2/W3는 서버 facade 우선. 화면은 서버 응답(`myPaymentRequired`, `myPayableAmount`, `myPaymentDueAt`)을 기반으로 후속에서 구현. | EventExtensions W6 (`event_participation_payment_screen.dart` 등 §5 라우트 신설) |
| PG queue refund 통합 | WALLET 환불 lot 일부가 PG queue로 가는 케이스의 본 facade 통합은 후속. | WalletRefundExecutor 슬라이스와 함께 |
| 호스트 정산 보고서 BANK 6 섹션 | PLAN.md §2.8 6 섹션은 W3에서 백엔드 audit 데이터만 확정. UI 노출은 후속. | F06-09/F06-10 후속 슬라이스 |

이 문서는 PLAN.md v4.5의 §2 / §0.2 / §0.4 / §2.14 / §2.15와 `ENUM_RESERVATIONS.md`, `E2E_SCENARIOS.md`를 1차 자료로 사용한다. 최종 구현 판단 전에는 trace source(`community_api/src/main/java/com/endside/community/event/prepayment/...`)를 직접 열어 contract를 재확인한다.

## 11. 변경 이력

- **2026-05-22 (v4.5 W2/W3 — 이벤트 참가 선입금 + 환불 + 호스트 cancel 통합)**: 최초 신설. WALLET/BANK_TRANSFER 결제 facade, 결제 상태기계, 회계 분개, 알림 71~76·83, 탈퇴 차단 BlockingItem 상세.
- **2026-06-05 (Phase 4/5 — 환불 정책 카탈로그 일원화)**: §1 "단일 deadline 100%/마감 후 0%" 표현을 `event_refund_policy` 카탈로그 기반 다단계 환불로 전면 교체. GRADUATED Gap 해소 표기. §7-A 신규 — 환불 정책 카탈로그(6종 템플릿), 귀책 매트릭스(7종), refund-preview API, BANK 귀책 인지형 상한(inferBankRefundFault + BANK_REFUND_EXCEEDS_POLICY 300014), EVENT_PREPAYMENT 정산 집계 계약. `event_payment.refund_evidence_file_ids` 컬럼 추가. S2-6 AC-06 환불율 표현 갱신. §10 호스트 UI Gap/레거시 섹션 병렬 모순 Gap 추가.
