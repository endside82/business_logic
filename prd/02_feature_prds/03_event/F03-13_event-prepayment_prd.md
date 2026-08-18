# F03-13. 이벤트 참가 선입금 (참가자·호스트) PRD

<!-- source-measured: 2026-07-29; authority: community_api/community_app current source -->

> 문서 상태: **현재 소스 실측본**. 삭제된 `docs/plan/event-extensions/*`와 존재하지 않는 `business_logic/units/...` 경로는 역사적 작성 배경일 뿐 현재 계약의 근거가 아니다. 현재 Controller·Service·DTO·DDL·테스트와 Flutter 호출부를 기준으로 판단한다. F03-05(참가 신청), F06-06(포인트 결제·환불), F07-09(모임 정산 선입금)와 분리되는 `event_payment` 결제 객체를 다룬다.
>
> 2026-07-29 현재 소스 갱신: 게스트 동반 예매는 같은 `event_payment` 결제 객체 위에서 party 단위 금액을 계산한다. 결제 후 게스트 추가는 `GUEST_INCREMENT` 증분 결제, 게스트 삭제는 line refund, 전체 취소는 잔여 party 기준 환불로 처리한다. BANK 경로의 line preview 제한, paid/free split 보존, host removal 강제환불, event-first lock order hardening을 F03-05와 함께 검토한다.

## 1. 결론

> **2026-08-18 P0 출시 태세(P0-PAID-01)**: 아래 계약은 **두 수단 전체**의 설계다. 지금 실제로 열려 있는 수단은 **BANK_TRANSFER(계좌이체 — 호스트 계좌로 직접 송금)** 하나이며, WALLET(포인트 지갑)은 실 PG 개통 전까지 닫혀 있다. WALLET 관련 서술(즉시 PAID·회계 분개·자동 환불)은 **설계 정본이자 현재 비활성**으로 읽는다. 상세는 §4 `EventPaymentMethod` 절.

선입금 활성 이벤트(`EventPrepayment.prepaymentRequired=true`)에서 참가자가 호스트 승인 또는 자동 승인 후 `APPROVED_PENDING_PAYMENT` 상태에 진입하면, 지정된 `paymentDueAt` 기한 내에 **WALLET(포인트 지갑)** 또는 **BANK_TRANSFER(계좌이체 신고)** 중 한 가지 방식으로 선입금을 납부해 참가를 확정한다. WALLET은 즉시 PAID + capacity++ + 참석 확정이 자동 발생하고, BANK_TRANSFER는 호스트가 입금 확인(`bankConfirm`) 또는 거부(`bankReject`)를 직접 수행해야 결정된다. 환불은 사용자 취소·이벤트 취소·호스트 거부 트리거 각각에 대해 정해진 경로(WALLET 자동 환불 / BANK 호스트 수동 환불 / `REFUND_REQUESTED` 큐)로 정리된다.

**환불 정책 (2026-06-05 카탈로그 기반 갱신)**: 환불율은 이벤트별 `event_refund_policy` 카탈로그(6종 템플릿 — STANDARD/STRICT/FLEXIBLE/FULL/NON_REFUNDABLE/CUSTOM)에 기반한 by_time 다단계 비율로 산출된다. 귀책(RefundFaultCategory)에 따라 최대 100% ~ 0% 범위에서 결정된다. 레거시 "단일 deadline 100%/마감 후 0%" 규칙은 Phase 4(커밋 c7b4315)에서 `event_refund_policy` 카탈로그 계산기로 전환되어 폐기됨 (상세는 §환불 정책 카탈로그 절 참조).

본 단위는 F03-05와 분리한다. F03-05는 신청·취소의 사용자 진입 흐름을 다루고, F03-13은 그 신청이 결제로 확정되는 별도 트랜잭션과 회계·환불 흐름을 다룬다. `INITIAL` 목적의 활성 결제는 application당 최대 1건이지만, 결제 후 게스트 추가는 같은 application에 여러 `GUEST_INCREMENT` 결제가 생길 수 있으므로 전체 관계를 단순한 1:0..1로 표현하면 안 된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 호스트 승인 후 액션바가 "결제하고 참석 확정"으로 전환 ▶ 현재는 별도 화면 없이 WALLET 결제를 즉시 호출
- 마이 이벤트(F03-12) "결제 대기" 표시 ▶ 이벤트 상세로 이동
- BANK 신고·호스트 확인·거부·BANK 환불 확인 API는 서버에 있으나 Flutter 호출 UI는 없다.
- 알림 enum 71~76·83은 존재하지만 생산 배선과 Flutter 라우팅 범위가 서로 다르므로 §7의 실측표를 따른다.

## 2. 실사 근거

| 구분 | 현재 원천 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | `community_api/src/main/java/com/endside/community/event/prepayment/...` | 구현됨 | Controller, Service, VO, Enum, repository, listener |
| 참가 취소/만료 | `community_api/src/main/java/com/endside/community/event/prepayment/service/EventParticipationCancellationService.java`, `event/service/ApplicationService.java`, `event/service/ApplicationPaymentExpiryScheduler.java` | 구현됨 | BANK 환불 대기와 만료의 실제 상태 전이 |
| DDL/Enum | `V1__init.sql`, `EventPayment*.java`, `ApplicationStatus.java`, `NotificationType.java` | 구현됨 | 제약과 값 목록 |
| Backend tests | `EventPrepaymentServiceTest`, `EventPaymentRefundServiceTest`, `EventParticipationCancellationServiceTest`, `EventPartyServiceTest`, `PaidApprovalFlowE2ETest` | 구현됨 | 결제·환불·게스트·통합 회귀 |
| Flutter | `event_prepayment_api.dart`, `event_prepayment_repository.dart`, `attendance_action_provider.dart`, 이벤트 상세/마이 이벤트 UI | WALLET만 사용자 연결 | 실제 호출 가능한 사용자 흐름 |
| 삭제된 계획 | `docs/plan/event-extensions/*` | 현재 저장소에 없음 | 역사적 배경으로만 취급 |

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
| `community_api/src/main/java/com/endside/community/event/service/EventService.java` (`tryRefundNewPrepayment`, 현재 line 1112 부근) | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/service/AccountDeactivationService.java:493` (`ACTIVE_EVENT_PAYMENT` BlockingItem) | 확인됨 |

## 3. 전체 동작 흐름

현재 서비스의 facade 체계를 7단계로 압축한다.

1. **선입금 정책 활성화** (호스트, DRAFT 또는 OPEN 진입 직전 — F03-03/F03-04 흐름):
   - `EventPrepayment(prepaymentRequired=true, prepaymentAmount=A)` row 생성 + `Event.price = A` 단방향 동기화 (D1).
   - 활성 + `prepaymentAmount<=0` → 400 `INVALID_PREPAYMENT_AMOUNT`.
   - 활성 + `price != prepaymentAmount` → 400 `PRICE_PREPAYMENT_MISMATCH`.
   - OFF 전환 시 `event.price=0` 무료 이벤트로 자동 전환 (Q2 사용자 확정).
2. **참가자 신청** (F03-05 위임):
   - 자동 승인 + 선입금 활성 → `Application=APPROVED_PENDING_PAYMENT` + `paymentDueAt = now() + (policy.paymentDeadlineHours || 24h)`. attendance/currentCapacity는 만들지 않지만 pending party size가 용량 판정의 논리 hold로 반영된다.
   - 승인 필요 + 선입금 활성 → `Application=PENDING` → 호스트 승인 후 동일한 `APPROVED_PENDING_PAYMENT`와 논리 hold.
   - `ApplicationPendingPaymentEvent`가 발행되는 경로에서는 after-commit으로 `EVENT_PREPAYMENT_REQUIRED(71)`을 사용자에게 보낸다.
3. **참가자가 결제 수단 선택**:
   - WALLET: `POST /api/v1/events/{eventId}/prepayment/wallet` → `EventPrepaymentService.payByWallet`.
   - BANK_TRANSFER: `POST /api/v1/events/{eventId}/prepayment/bank-declare` → `EventPrepaymentService.bankDeclare`.
4. **결제 처리** (트랜잭션 단위, lock 순서 event → application → event_payment, §0.4):
   - WALLET: `event_payment(PENDING) → WalletSpendService.spend(EVENT_PREPAYMENT, PAID_FIRST) → event_payment(PAID) + Application(APPROVED) + currentCapacity++ + EventAttendance(ATTENDING)`. 단일 트랜잭션. 충전 단위(lot)가 부족하면 전체 롤백된다. 중복은 application/event lock, active payment 선조회, DB generated unique로 차단하며 성공 응답을 재사용하는 idempotency가 아니라 `DUPLICATE_PAYMENT` 거부다. PointTransaction exists 검사는 새 eventPaymentId를 사용해 정상 최초 흐름에서는 항상 false다.
   - BANK_TRANSFER: `event_payment(PENDING, method=BANK_TRANSFER, bankTransferMemo)` 생성 후 이벤트의 주 호스트 한 명에게 `EVENT_PREPAYMENT_BANK_DECLARED(72)`을 보낸다. CoHost fanout은 없다. capacity는 점유하지 않는다.
5. **호스트 BANK 처리** (BANK_TRANSFER만):
   - 확인: `POST /api/v1/events/{eventId}/applications/{applicationId}/bank-confirm` → `bankConfirm`. capacity 매트릭스 통과 시 `event_payment(PAID) + Application(APPROVED) + capacity++ + EventAttendance(ATTENDING)`. 매트릭스 fail 시 rollback 없이 `event_payment(REFUND_REQUESTED)` + 호스트 수동 환불 대기.
   - 거부: `POST /api/v1/events/{eventId}/applications/{applicationId}/bank-reject` → `bankReject`. `event_payment(CANCELED)`. `Application`은 `APPROVED_PENDING_PAYMENT` 유지 → 참가자 재신고 가능.
   - 알림: 각각 `EVENT_PREPAYMENT_BANK_CONFIRMED(73)` / `EVENT_PREPAYMENT_BANK_REJECTED(74)` (after-commit).
6. **환불 (사용자 취소 / 이벤트 취소 / 호스트 거부)**:
   - 사용자 자가 취소 → `EventParticipationCancellationService.cancelMyParticipation` (F03-05 `DELETE /api/v1/events/{eventId}/apply` 경로가 라우팅). 결제 상태별 분기:
     - `event_payment.PENDING` → `event_payment(CANCELED)` + `Application(CANCELED)`.
     - `event_payment.PAID + WALLET` → `EventPaymentRefundService.refundByWallet` (`event_refund_policy` 카탈로그 기반 환불율 적용 — 귀책 PARTICIPANT_FAULT 시 by_time 정책%, HOST_FAULT·FORCE_MAJEURE·MUTUAL·RESCHEDULE_DECLINED 시 100%, `Application(CANCELED)`, capacity 차감).
     - `event_payment.PAID + BANK_TRANSFER` → `event_payment(REFUND_REQUESTED)` + `Application=CANCEL_PENDING_REFUND`. capacity는 호스트가 `refundByBankConfirm`을 완료할 때까지 유지된다. 83은 이 최초 전이에서 즉시 발송되지 않고, 기본 3일 경과 후 escalation scheduler가 주 호스트에게 보내는 재알림에 사용된다.
   - 호스트가 이벤트 취소 → 실제 진입점은 `EventService.tryRefundNewPrepayment`이며 존재하지 않는 별도 coordinator가 아니다. 현재 취소 loop가 ATTENDING/WAITING만 순회해 attendance 없는 `APPROVED_PENDING_PAYMENT`와 BANK PENDING payment는 정리에서 누락될 수 있다. BANK PAID는 `REFUND_REQUESTED`로만 전이하지만 caller가 refunded=true/완료 알림으로 오표시하는 Gap이 있고 Club/Recurring 취소도 같은 계열이다.
   - 호스트 BANK 수동 환불 → `POST /api/v1/events/{eventId}/applications/{applicationId}/refund-bank-confirm` → `refundByBankConfirm(amount, memo)`. Host/CoHost 외 club OWNER/`EVENT_REFUND_MANAGER`도 허용하며 회계 분개는 없다.
7. **만료**:
   - 실제 scheduler는 `event/service/ApplicationPaymentExpiryScheduler`이며 `ApplicationService.expirePendingPayments()`를 호출해 `APPROVED_PENDING_PAYMENT → PAYMENT_EXPIRED`를 bulk update한다. currentCapacity/attendance 변화는 없다.
   - 현재 bulk update는 연관된 `event_payment.PENDING`을 취소하지 않고 `ApplicationPaymentExpiredEvent`도 발행하지 않는다. listener와 enum 75는 존재하지만 생산 publisher가 없어 만료 알림 75는 실제 전송되지 않는다.

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
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/refund-bank-confirm` | EventPrepaymentController#refundByBankConfirm | required (Host/CoHost 또는 club OWNER/EVENT_REFUND_MANAGER) | BANK 수동 환불 완료 표시 |
| DELETE | `/api/v1/events/{eventId}/apply` | EventController#cancelApplication → `EventParticipationCancellationService.cancelMyParticipation` | required (본인) | 참가 취소 (결제 정리 선행) |

### 도메인 모델 / Enum

- **`event_payment` 테이블** (현재 `V1__init.sql`):
  - `id, event_id, user_id, application_id, amount, method, status, purpose, bank_transfer_memo, host_confirmed_at, host_confirmed_by, point_tx_id, refund_point_tx_id, paid_at, refunded_at, refund_amount, refund_reason, refund_failure_reason`
  - `refund_evidence_file_ids` json DEFAULT NULL — 호스트 수동 환불 증빙 fileId 배열 (이체증 등, 최대 5건) (`V1__init.sql:1163`)
  - `active_application_id` STORED generated column은 `purpose=INITIAL`이면서 status가 `PENDING/PAID/REFUND_REQUESTED`일 때만 application_id를 만든다. `UNIQUE KEY uk_event_payment_active`는 **초기 결제**의 동시 활성 1건만 보장하며 `GUEST_INCREMENT`는 다건을 허용한다.
- **Enum `EventPaymentMethod`** (신규): `WALLET, BANK_TRANSFER`
  - **2026-08-18 개정(P0-PAID-01) — 참가자에게 실제로 열리는 수단은 서버가 정한다.** `GET /api/v1/app/release-scope`의 `enabledPaymentMethods`가 단일 출처이며, 판정은 `WALLET → money.live`, `BANK_TRANSFER → 호스트 직접 수납 스위치 AND 출시 범위(CASH_EVENT)`다. **P0 출시 태세의 실제 값은 `BANK_TRANSFER` 하나**다 — 지갑(포인트) 결제는 실 PG 개통 전까지 닫혀 있고, 그 정책의 이벤트는 애초에 생성 단계에서 막힌다(F03-03 §4 `PrepaymentType` 참조). 앱은 목록에 없는 수단의 버튼을 그리지 않으며, 그래도 보내면 서버가 `400023`으로 거부한다.
  - ⛔ 이미 존재하는 결제 건의 확인·거절·취소·환불 경로는 이 판정을 타지 않는다(안전 출구 — 막으면 돈과 좌석이 함께 갇힌다).
- **Enum `EventPaymentPurpose`**: `INITIAL, GUEST_INCREMENT`
- **Enum `EventPaymentStatus`**: `PENDING, PAID, REFUND_REQUESTED, REFUNDED, CANCELED`
- **Enum `ApplicationStatus`**: `PENDING, APPROVED, APPROVED_PENDING_PAYMENT, PAYMENT_EXPIRED, REJECTED, CANCELED, CANCEL_PENDING_REFUND`
- **Enum `TransactionType` 26**: `EVENT_PREPAYMENT_REFUND`
- **Enum `NotificationType` 신규**: 71 `EVENT_PREPAYMENT_REQUIRED`, 72 `EVENT_PREPAYMENT_BANK_DECLARED`, 73 `EVENT_PREPAYMENT_BANK_CONFIRMED`, 74 `EVENT_PREPAYMENT_BANK_REJECTED`, 75 `EVENT_PREPAYMENT_EXPIRED`, 76 `EVENT_PREPAYMENT_REFUNDED`, 83 `EVENT_PREPAYMENT_REFUND_REQUESTED`.
- **EventVo 신규 필드** (단건 응답): `myPaymentRequired, myPayableAmount, myPaymentDueAt, reservedPaymentPendingCount`. EventSimpleVo는 `reservedPaymentPendingCount` 제외(D16, 목록 응답은 항상 0).
- **`EventViewerContextService.ViewerContext` 결제 필드**: `payableAmount, paymentDueAt, paymentRequired`

### 회계 분개

| 트리거 | 결제 방식 | 분개 호출 | 사용 계정 |
|---|---|---|---|
| `payByWallet` | WALLET | `WalletSpendService.spend(EVENT_PREPAYMENT, PAID_FIRST)`로 차감(유료우선·충전 단위 필수 추적·부족 시 롤백) 후 wrapper가 `AccountingLedgerService.recordPayment(txId, userId, eventId, hostId, amount)` 호출(gross 전액 CREATOR_PAYABLE 적립) | `USER_WALLET → CREATOR_PAYABLE` 등 |
| `bankConfirm` | BANK_TRANSFER | **분개 없음** (호스트 직접 수취) | off-ledger audit 데이터로만 기록 |
| `refundByWallet`(사용자 자가 취소 / 호스트 이벤트 취소) | WALLET | 지갑 복원은 표준 환불 헬퍼 `WalletRefundService.refundByTransaction`(명시 split 오버로드 — 환불 정책 산식 보존 + 원결제 충전 단위 복원 + 유료/무료 각각의 통화별 누적 환불 한도 강제)로 수렴(2026-06-06). 정산 후처리는 공통 `EventRefundSettlementService.applyRefundToSettlement(…, paidRefund, 0L, freeRefund)` — pgQueuedPaid=0 고정, PG queue 미경유. 정산 완료(PAID) 후 무료분 환불은 호스트 회수 없이 플랫폼 비용(`PROMOTION_EXPENSE`)으로 흡수. | type=`EVENT_PREPAYMENT_REFUND(26)` |
| `refundByBankConfirm` | BANK_TRANSFER | **분개 없음** (D5) | audit log만 (`event_payment.refund_amount, refund_reason, refunded_at`) |
| `bankReject` | BANK_TRANSFER | 분개 없음 | `event_payment.status=CANCELED, refund_reason=<host_reason>` |

> `EventRefundSettlementService`로 분개 + 정산 후처리가 일원화됐다. 선입금 경로는 `pgQueuedPaid=0` 고정이며 PG queue/PG-cancel worker를 사용하지 않는다.

### 의존 단위 / 외부 시스템

- **Unit 03 F03-05** — `Application` 상태머신을 공유. `APPROVED_PENDING_PAYMENT` 진입은 F03-05의 apply/approve 분기에서 이루어지고, 본 단위는 그 상태에서만 결제 진입 허용.
- **Unit 06 F06-06** — 결제는 표준 차감 경로 `WalletSpendService.spend(EVENT_PREPAYMENT, PAID_FIRST)`를 직접 호출한다. application/event lock + active payment 선조회 + DB unique로 중복을 거부하며, 재시도에 이전 성공을 반환하는 idempotency 계약은 아니다. 구식 `WalletService.pay`/`payForApplication` 본체는 차단됐다.
- **Unit 06 회계** — `AccountingLedgerService.recordPayment/recordRefund` 재사용. AccountCode 신규 추가 없음 (D5).
- **Unit 03 F03-04 이벤트 취소** — 실제 `EventService.tryRefundNewPrepayment`(현재 line 1112 부근)를 사용한다. ATTENDING/WAITING 순회 때문에 attendance 없는 결제가 누락되고 BANK `REFUND_REQUESTED`를 완료로 오표시할 수 있는 Gap이 있다. Club/Recurring 경로도 재검증 대상이다.
- **Unit 12 알림** — enum 71~76, 83이 모두 존재한다고 해서 모두 생산 연결된 것은 아니다. 71~74와 76은 `EventExtensionNotificationListener`의 after-commit handler가 있다. 75는 listener만 있고 production publisher가 없으며, 83은 최초 환불 요청이 아니라 `RefundRequestEscalationScheduler`의 지연 재알림에 사용된다.
- **Unit 13 계정 비활성화** — `AccountDeactivationService` (`:493`) `ACTIVE_EVENT_PAYMENT` BlockingItem. PENDING/PAID/REFUND_REQUESTED 상태 보유 시 탈퇴 차단 + `DEACTIVATION_BLOCKED_BY_PAYMENT` (`ErrorCode.java:96`).
- **외부 PG** — 본 선입금 환불은 paid 금액을 wallet로 복원하고 `pgQueuedPaid=0`으로 고정한다. txId 기반 PG-cancel worker는 구현되지 않았고 기본 비활성이다. PG queue를 현재 재사용한다고 기술하면 안 된다.

## 5. 프론트 계약

### 현재 구현된 사용자 흐름

1. 이벤트 상세의 viewer 상태가 결제 대기이면 하단 CTA를 **“결제하고 참석 확정”**으로 표시한다.
2. CTA는 별도 결제 화면으로 이동하지 않고 `AttendanceActionNotifier.payForApprovedApplication()`을 호출한다.
3. notifier는 `EventPrepaymentRepository.payByWallet(eventId)`만 호출한다.
4. 성공 시 토스트와 관련 provider 갱신을 수행하고, 잔액 부족이면 지갑 충전 흐름으로 연결한다.
5. 마이 이벤트의 결제 대기 항목은 이벤트 상세로 이동한다.

### Flutter API 구현 범위

`event_prepayment_api.dart`와 Repository에는 다음 5개 호출이 있다.

| 서버 API | Flutter 정의 | 실제 화면 호출 |
|---|---|---|
| `POST .../prepayment/wallet` | 있음 | **있음** — 이벤트 상세 CTA |
| `POST .../prepayment/bank-declare` | 있음 | 없음 |
| `POST .../applications/{applicationId}/bank-confirm` | 있음 | 없음 |
| `POST .../applications/{applicationId}/bank-reject` | 있음 | 없음 |
| `POST .../applications/{applicationId}/refund-wallet` | 있음 | 없음 |
| `POST .../applications/{applicationId}/refund-bank-confirm` | **없음** | 없음 |

다음 파일과 라우트는 현재 저장소에 없다.

- `event_participation_payment_screen.dart`
- `event_participation_payment_bank_declare_screen.dart`
- `host_participation_payment_pending_screen.dart`
- `event_payment_status_section.dart`
- `/events/:eventId/participation-payment` 계열 라우트

서버에도 `GET /prepayment/policy`, `GET /prepayment/bank-pending` endpoint는 없다. 환불 예상액은 별도 `POST /api/v1/events/{eventId}/applications/{applicationId}/refund-preview`로 조회하며 `cancel_attendance_sheet.dart`가 실제 사용한다.

### 알림 라우팅

Flutter `NotificationRouter`에는 71~76·83 case가 없다. 이 알림들은 현재 `_ => null`로 처리되어 deep link가 생성되지 않으며 navigable type 목록에도 포함되지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S2-1 | 자동 승인 + 선입금 활성 신청 → WALLET 결제 (Happy Path) | 로그인됨, 이벤트 OPEN, `approvalRequired=false`, `prepaymentRequired=true`, capacity 여유, 잔액 충분 | `Application=APPROVED + EventAttendance=ATTENDING + event_payment.PAID(WALLET) + capacity++`. `PointTransaction(type=PAY, referenceType=EVENT_PREPAYMENT)` 신규 1건. `AccountingLedger` 분개 1건. 알림 73 미발송(자동 승인 케이스), 결제 완료 알림은 `PAYMENT_COMPLETED` 등 기존 채널 재사용 검토. |
| S2-2 | 승인 필요 + 선입금 활성 신청 → 호스트 승인 후 WALLET 결제 | OPEN, `approvalRequired=true`, `prepaymentRequired=true` | `Application=PENDING → APPROVED_PENDING_PAYMENT(+paymentDueAt)`. 호스트 승인 시 알림 71 발송. 참가자 결제 후 `APPROVED + ATTENDING + event_payment.PAID(WALLET)`. |
| S2-3 | 선입금 활성 + BANK_TRANSFER 신고 → 호스트 확인 | `Application=APPROVED_PENDING_PAYMENT` | `bankDeclare` 후 `event_payment.PENDING(BANK_TRANSFER)`. 호스트 `bankConfirm` 후 `event_payment.PAID + Application=APPROVED + ATTENDING + capacity++`. 분개 없음(D5). 알림 72/73. |
| S2-4 | BANK 신고 → 호스트 거부 (`bankReject`) | `event_payment.PENDING(BANK_TRANSFER)` | `event_payment.CANCELED + refund_reason=<reason>`. `Application=APPROVED_PENDING_PAYMENT` 유지. 알림 74. 참가자 재신고 가능 (UNIQUE 제약은 active 상태에서만 적용). |
| S2-5 | `paymentDueAt` 만료 | `Application=APPROVED_PENDING_PAYMENT, paymentDueAt < now()` | `ApplicationPaymentExpiryScheduler` → bulk update로 `Application=PAYMENT_EXPIRED`. currentCapacity/attendance 변화 없음. 현재는 연관 `event_payment.PENDING` 취소와 만료 event 발행이 없어 75 알림이 전송되지 않는 갭이 있음. |
| S2-6 | 참가자 자가 취소 (WALLET PAID 상태) | `event_payment.PAID(WALLET)`, 취소 시점 | `DELETE /api/v1/events/{eventId}/apply` → `cancelMyParticipation` → `refundByWallet` (`event_refund_policy` 카탈로그 기반 환불율 — PARTICIPANT_FAULT by_time%, HOST_FAULT 100%) → `event_payment.REFUNDED + Application=CANCELED + capacity--`. `PointTransaction(type=EVENT_PREPAYMENT_REFUND)` 1건 + 분개 1건. 알림 76. |
| S2-7 | 참가자 자가 취소 (BANK_TRANSFER PAID 상태) | `event_payment.PAID(BANK_TRANSFER)` | `event_payment.REFUND_REQUESTED + Application=CANCEL_PENDING_REFUND`. capacity hold. 호스트가 수동 환불 후 `refundByBankConfirm`을 호출하면 `REFUNDED + Application=CANCELED + capacity--`. 83은 최초 요청 즉시가 아니라 기본 3일 후 escalation 재알림에 사용. |
| S2-8 | 호스트가 이벤트 취소 (ATTENDING WALLET PAID) | `EventService.cancelEvent`, attendance 존재 | `tryRefundNewPrepayment → refundByHostCancel → REFUNDED + CANCELED`. attendance 없는 payment는 loop에서 누락될 수 있음 |
| S2-9 | 호스트가 이벤트 취소 (ATTENDING BANK PAID) | 동일 트리거 | `event_payment.REFUND_REQUESTED`; caller가 refunded=true/완료 알림으로 오표시하는 Gap. 수동 환불 필요 |
| S2-10 | 호스트가 이벤트 취소 (legacy `EVENT_PAYMENT` 결제만 존재) | 신규 `event_payment` row 없음, legacy `PointTransaction(referenceType=EVENT_PAYMENT)` 보유 | `tryRefundNewPrepayment` 0건 처리 → `WalletService.refundByHostCancel` legacy fallback 호출. F06-06 기존 환불 흐름 그대로. |
| S2-11 | 계정 비활성화 시도 (active event_payment 보유) | `event_payment.PENDING/PAID/REFUND_REQUESTED` 보유 사용자 | `AccountDeactivationService` BlockingItem `ACTIVE_EVENT_PAYMENT` 노출 + 400 `DEACTIVATION_BLOCKED_BY_PAYMENT`. WALLET PAID는 "참가 취소·환불 완료 후 탈퇴", BANK는 "호스트 환불 완료 후 탈퇴", PENDING은 "참가 취소 후 탈퇴" 안내. |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | `community_api/src/main/java/com/endside/community/event/prepayment/` 전체 (controller, service, repository, model, vo, param, event listener) | 결제·환불 facade와 내부 강제환불 구현 확인. 삭제된 계획 문서가 아니라 현재 source/test가 권위다. |
| 회계 분개 | WALLET 결제·환불만 `AccountingLedgerService` 진입. BANK는 분개 없음 (D5). | 결제는 표준 차감 경로 `spend(EVENT_PREPAYMENT)`로 차감 후 wrapper가 `recordPayment`(gross 전액 CREATOR_PAYABLE 적립). 정산 완료 시 무료분은 호스트에 무료 포인트로 실지급(`recordEventFreeSettlement`, residue 0 수렴), 무료만 모인 이벤트도 fee/tax 0 정산 생성. 2026-06-06 이관(정책 PRD §2.6). |
| 중복 차단 | `INITIAL`에 한정된 generated unique + event/application lock + active payment 선조회 | 정상 순차 중복은 `DUPLICATE_PAYMENT`로 거부한다. 성공 결과를 재사용하는 idempotency가 아니며, 새 paymentId 기준 PointTransaction exists 검사는 정상 흐름에서 false다. DB unique 경쟁 예외의 전용 변환 catch도 없다. |
| 환불 정책 | Phase 4(커밋 c7b4315)에서 `event_refund_policy` 카탈로그 기반 계산기로 전환 완료. D7 "단일 deadline 100%/마감 후 0%" 폐기. GRADUATED는 레거시 STANDARD 매핑. | `RefundPolicyService.computeRefund`(귀책 분기) + `EventPaymentRefundService.refundByWallet` (2026-06-05 해소). |
| 알림 | enum 선언, publisher, after-commit listener, 실제 send, Flutter route를 각각 확인 | 71~74·76은 listener가 연결됨. 72는 주 호스트 한 명에게만 발송. 75는 publisher가 없어 미전송. 83은 기본 3일 후 escalation용. Flutter는 71~76·83 모두 deep link 미지원. |
| 탈퇴 통합 | `AccountDeactivationService` BlockingItem `ACTIVE_EVENT_PAYMENT` + `DEACTIVATION_BLOCKED_BY_PAYMENT` | 자동 cancel 허용 케이스(PENDING 결제 없음, APPROVED 무료, APPROVED_PENDING_PAYMENT + 결제 만료) 분기 명문화 |

## 7-A. 환불 정책 카탈로그 (갱신 2026-06-05)

> 소스: `RefundPolicyCatalogService.java:52-105`, `RefundPolicyService.java:132-268`, `RefundPolicyController.java:36-68`, `V1__init.sql:4481-4512`.

### 카탈로그 조회 및 미리보기 API

| HTTP | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/v1/refund-policy-templates` | **필요** (`anyRequest().authenticated()`) | 활성 템플릿 전체 목록 — `List<RefundPolicyTemplateVo>` |
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

권한 Gap:

- Controller는 principal을 받아 log에는 남기지만 `RefundPolicyService.calculatePreview(eventId, applicationId, param)`에 actor를 전달하지 않는다. applicationId를 아는 임의 인증 사용자가 타인의 gross/refund 정보를 조회할 수 있는 IDOR 후보다.
- `GET .../no-show-refund`도 principal이 없고 path `eventId`를 service에 전달하지 않아 applicationId만으로 조회한다. eventId scoping과 actor authorization이 모두 빠져 있다.

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
| 현재 계약 | `EventPaymentRefundService`, `WalletRefundService` | 선입금 환불은 wallet 복원 + `pgQueuedPaid=0`; txId 기반 PG-cancel worker와 별도 executor class는 없음 | PG 연계가 필요하면 신규 계약으로 설계 |
| 해소 | 현재 refund policy 서비스 | ~~단일 deadline 100%/마감 후 0%~~ → `event_refund_policy` 카탈로그 계산기로 전환 완료. GRADUATED는 레거시 STANDARD로 매핑. | 해소 2026-06-05 |
| 높음 | Flutter current source | 사용자 연결은 WALLET CTA 하나뿐. BANK 신고·호스트 확인/거부·BANK 환불 확인 화면이 없고 `refund-bank-confirm` API 정의도 없음 | 결제 수단·호스트 운영 수직 슬라이스 구현 |
| 높음 | `ApplicationPaymentExpiryScheduler`, `ApplicationService` | 만료 bulk update가 PENDING `event_payment`를 취소하지 않고 event도 발행하지 않아 75 알림이 dead wiring이며 active payment가 남을 수 있음 | application/payment를 같은 트랜잭션에서 정리하고 event 발행 테스트 추가 |
| 높음 | `NotificationRouter` | 71~76·83 전부 deep link가 없어 수신 알림에서 화면 이동 불가 | 실제 화면 범위와 함께 라우팅 추가 |
| 높음 | refund preview/no-show refund Controller | actor가 service에 전달되지 않거나 eventId가 무시되어 applicationId 기반 IDOR 후보 | 본인/host 권한 + eventId scoping 테스트 |
| 높음 | Event/Club/Recurring cancel | attendance 없는 pending payment 누락, BANK REFUND_REQUESTED 완료 오표시 | payment row 기준 순회와 상태별 결과/알림 분리 |
| 위험 | `EventPrepaymentService.bankConfirm` | capacity/restriction fail → `event_payment.REFUND_REQUESTED` 전이. 호스트가 별도 환불 후 `refundByBankConfirm` 호출해야 정리 | 호스트 UI와 미정리 row 모니터링 필요 |
| 해소 (2026-06-06) | EventPrepaymentService.java, EventPaymentRefundService.java, SettlementBatchService.java | **EVENT 결제·환불 표준 경로 이관 + flow-through 완성** — WALLET 선입금 결제가 표준 차감 경로 `spend(EVENT_PREPAYMENT, PAID_FIRST)`를 직접 호출(충전 단위 필수 추적·부족 시 결제 롤백, 이전엔 경고만 남기고 진행). 지갑 환불은 `refundByTransaction`(명시 split·충전 단위 복원·통화별 누적 한도)로 수렴. 구식 결제 메서드 2개(`pay`/`payForApplication`) 본체 차단. 정산: 무료 매출이 호스트에 무료 포인트로 실지급되고 무료만 모인 이벤트도 fee/tax 0 정산 생성, 정산 후 무료 환불은 `PROMOTION_EXPENSE` 흡수. admin 정산 미러(`270b1f9`). | 없음 — 정책 PRD §2.6 |
| 높음 | `RefundRequestEscalationScheduler`, `EventPayment`/DDL | 기본 3일 재알림은 구현됐지만 event payment 조회/저장이 non-locking이고 version이 없어 동시 REFUNDED를 stale REFUND_REQUESTED로 되살릴 경쟁 위험. 전용 경합 테스트 없음 | row lock/version/조건부 update와 race test |
| Decision Needed | 현재 account/application 서비스 | `APPROVED_PENDING_PAYMENT`와 active payment가 어긋난 상태의 탈퇴·만료 정리 정책 | 운영 정책과 회귀 매트릭스 확정 |

## 9. 수용 기준

- **AC-01 (S2-1). 자동 승인 + WALLET 결제 (Happy Path)**: Given 잔액≥`prepaymentAmount`, 자동 승인 + 선입금 활성, capacity 여유. When 참가자가 `POST /api/v1/events/{eventId}/prepayment/wallet` 호출. Then 단일 트랜잭션 안에서 `event_payment.PAID + Application=APPROVED + EventAttendance=ATTENDING + capacity++` + `PointTransaction(type=PAY, referenceType=EVENT_PREPAYMENT)` + 분개 1건. 잔액 = 잔액-`prepaymentAmount`.
- **AC-02 (S2-2). 승인 필요 + WALLET 결제**: Given 승인 필요 + 선입금 활성. When 호스트 승인 → 참가자 결제. Then 동일 종료 상태. `paymentDueAt`이 응답에 노출되며 알림 71 발송(after-commit).
- **AC-03 (S2-3). BANK 신고 → 호스트 확인**: Given `Application=APPROVED_PENDING_PAYMENT`. When `bankDeclare → bankConfirm`. Then `event_payment.PAID + ATTENDING + capacity++`, 분개 없음(D5), 알림 72/73.
- **AC-04 (S2-4). BANK 호스트 거부**: Given BANK_TRANSFER PENDING. When `bankReject(reason)`. Then `event_payment.CANCELED + Application 유지`. 알림 74. 참가자가 다시 신고 가능.
- **AC-05 (S2-5). 결제 기한 만료 — 현재 관찰값**: Given `Application=APPROVED_PENDING_PAYMENT, paymentDueAt < now()`. When `ApplicationPaymentExpiryScheduler` 실행. Then `Application=PAYMENT_EXPIRED`, currentCapacity/attendance 변화 없음. 현재 PENDING `event_payment` 취소와 75 알림은 발생하지 않으며 이는 Gap이다.
- **AC-06 (S2-6). 사용자 자가 취소 (WALLET PAID)**: Given `event_payment.PAID(WALLET)`. When `DELETE /api/v1/events/{eventId}/apply`. Then `cancelMyParticipation → refundByWallet` (카탈로그 기반 환불율 — PARTICIPANT_FAULT by_time%, HOST_FAULT 100%) + `Application=CANCELED + capacity--`. `PointTransaction(type=EVENT_PREPAYMENT_REFUND)` + 분개 1건. 알림 76.
- **AC-07 (S2-7). 사용자 자가 취소 (BANK_TRANSFER PAID)**: Given `event_payment.PAID(BANK_TRANSFER)`. When 동일 호출. Then `event_payment.REFUND_REQUESTED + Application=CANCEL_PENDING_REFUND`, capacity hold. 호스트가 환불 후 `refundByBankConfirm` 호출 시 `REFUNDED + Application=CANCELED + capacity--`. 83은 기본 3일 경과 후 escalation에서 사용.
- **AC-08 (S2-8). 호스트 이벤트 취소 (WALLET PAID 참가자)**: ATTENDING row가 있는 결제는 `tryRefundNewPrepayment → refundByHostCancel`로 환불된다. attendance 없는 pending 결제 누락은 현재 Gap이다.
- **AC-09 (S2-9). 호스트 이벤트 취소 (BANK PAID 참가자)**: 결제는 `REFUND_REQUESTED`가 되며 수동 환불이 필요하다. caller가 refunded=true/완료 알림으로 오표시하는 것은 현재 Gap이다.
- **AC-10 (S2-10). legacy fallback**: Given 신규 `event_payment` 없음, legacy `PointTransaction(referenceType=EVENT_PAYMENT)` 존재. When 호스트가 이벤트 취소. Then `tryRefundNewPrepayment` 0건 → `WalletService.refundByHostCancel` legacy 경로로 환불.
- **AC-11 (S2-11). 탈퇴 차단**: Given `event_payment.PENDING/PAID/REFUND_REQUESTED` 보유. When 탈퇴 요청. Then 400 `DEACTIVATION_BLOCKED_BY_PAYMENT` + `AccountDeactivationCheckVo.blockingItems`에 `ACTIVE_EVENT_PAYMENT` 노출. WALLET 환불 / BANK 호스트 환불 / 참가 취소 완료 후 재시도.

## 10. 미결정 / 후속 슬라이스

| 항목 | 사유 | 후속 슬라이스 |
|---|---|---|
| 외부 PG 환불 연계 | 현재 선입금 환불은 wallet 복원 + `pgQueuedPaid=0`. txId 기반 PG-cancel worker와 별도 executor는 없음. | 필요 시 현재 계약과 분리해 신규 설계 |
| ~~호스트 환불 정책 설정 UI~~ 해소(2026-06-06, W14 S5) | 호스트 폼이 카탈로그 6종(STANDARD/STRICT/FLEXIBLE/FULL/NON_REFUNDABLE/CUSTOM) picker로 교체 완료 — STRICT/FLEXIBLE 직접 선택 불가 해소. 전송 권위 = `refundPolicyConfig.templateCode`, 앱이 `EventVo.refundPolicyConfig` read-back 모델링(community_app `3cb12ac`). | 완료 |
| ~~환불 preview + 레거시 섹션 병렬 표시 모순~~ 해소(2026-06-06, W14 S5) | 취소 시트가 서버 preview **단일 출처**로 전환 — 레거시 `RefundPolicySection.forEvent(refundPolicy, refundDeadlineHours)` 병렬 표시 제거. preview/레거시 모순 해소(community_app `3cb12ac`). | 완료 |
| BANK_REFUND_EXCEEDS_POLICY(300014) 앱 에러 핸들링 | 에러 코드 신규 추가, 앱 측 에러 핸들러 매핑 미확인. | 에러 핸들러 매핑 확인/추가 |
| Flutter BANK·호스트 결제 운영 화면 | WALLET은 이벤트 상세 CTA에서 즉시 결제한다. BANK 신고·확인·거부·환불 확인과 상태 화면은 미구현. | 실제 서버 6개 endpoint와 일치하는 모델/API/Provider/화면 구현 |
| 이벤트 취소 결제 정리 | attendance 없는 pending 결제와 BANK 완료 오표시가 있음 | Event/Club/Recurring 공통 payment-row coordinator 또는 동등한 실제 구현 |
| 호스트 정산 보고서 BANK 운영 UI | 백엔드 audit 데이터와 별개로 Flutter 운영 화면은 확인되지 않음 | F06-09/F06-10과 실제 소스 재검증 |

현재 계약의 1차 자료는 `community_api/src/main/java/com/endside/community/event/prepayment/...`, 참가 신청·취소·만료 서비스, `V1__init.sql`, 관련 테스트와 `community_app` 호출부다. 삭제된 event-extensions 계획 문서는 현재 구현 판단에 사용하지 않는다.

## 11. 변경 이력

- **2026-05-22 (v4.5 W2/W3 — 이벤트 참가 선입금 + 환불 + 호스트 cancel 통합)**: 최초 신설. WALLET/BANK_TRANSFER 결제 facade, 결제 상태기계, 회계 분개, 알림 71~76·83, 탈퇴 차단 BlockingItem 상세.
- **2026-06-05 (Phase 4/5 — 환불 정책 카탈로그 일원화)**: §1 "단일 deadline 100%/마감 후 0%" 표현을 `event_refund_policy` 카탈로그 기반 다단계 환불로 전면 교체. GRADUATED Gap 해소 표기. §7-A 신규 — 환불 정책 카탈로그(6종 템플릿), 귀책 매트릭스(7종), refund-preview API, BANK 귀책 인지형 상한(inferBankRefundFault + BANK_REFUND_EXCEEDS_POLICY 300014), EVENT_PREPAYMENT 정산 집계 계약. `event_payment.refund_evidence_file_ids` 컬럼 추가. S2-6 AC-06 환불율 표현 갱신. §10 호스트 UI Gap/레거시 섹션 병렬 모순 Gap 추가.
- **2026-06-06 (W14 S5 — 환불 템플릿 호스트 폼 교체)**: §10 "호스트 환불 정책 설정 UI" Gap·"환불 preview + 레거시 섹션 병렬 표시 모순" Gap 해소. 호스트 폼이 카탈로그 6종 picker로 교체(STRICT/FLEXIBLE 선택 불가 해소), 전송 권위=`refundPolicyConfig.templateCode`, 상세·신청 확인 표시가 `effectiveRulesJson`(by_time)로 전환(§5 모달 문구 레거시 100/50/30 추정 제거), 취소 시트는 서버 preview 단일 출처, 앱이 `EventVo.refundPolicyConfig` read-back 모델링(community_app `3cb12ac`).
- **2026-06-06 (EVENT 결제 표준화 — flow-through 완성)**: WALLET 결제가 표준 차감 경로 `spend(EVENT_PREPAYMENT, PAID_FIRST)`를 직접 호출하도록 이관(충전 단위 필수 추적·부족 시 롤백, 중복 결제 차단·결제 기록·분개는 wrapper 처리). 성공 재사용형 idempotency가 아니라 active payment 중복 거부다. 지갑 환불은 split 보존 표준 경로로 수렴했고 구식 결제 메서드 본체는 차단됐다.
- **2026-07-29 (현재 소스 재실측)**: 삭제된 계획·존재하지 않는 unit/class 경로를 현재 근거에서 제거. `INITIAL`/`GUEST_INCREMENT` 관계, 논리 capacity hold, `CANCEL_PENDING_REFUND`, 실제 만료 scheduler의 미정리 payment/미발행 75, 83 escalation 경합, 주 호스트 단독 72 fanout, Flutter WALLET-only, refund preview IDOR 후보, 이벤트 취소 누락/오표시, PG queue 미연결을 교정.
