# F03-13. 이벤트 참가 선입금 (참가자·호스트) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-measured: 2026-07-29; authority: community_api/community_app current source -->

> 문서 상태: **현재 소스 실측본**. 삭제된 `docs/plan/event-extensions/*`와 존재하지 않는 `business_logic/units/...` 경로는 역사적 작성 배경일 뿐 현재 계약의 근거가 아니다. 현재 Controller·Service·DTO·DDL·테스트와 Flutter 호출부를 기준으로 판단한다. F03-05(참가 신청), F06-06(포인트 결제·환불), F07-09(모임 정산 선입금)와 분리되는 `event_payment` 결제 객체를 다룬다.
>
> 2026-07-29 현재 소스 갱신: 게스트 동반 예매는 같은 `event_payment` 결제 객체 위에서 party 단위 금액을 계산한다. 결제 후 게스트 추가는 `GUEST_INCREMENT` 증분 결제, 게스트 삭제는 line refund, 전체 취소는 잔여 party 기준 환불로 처리한다. BANK 경로의 line preview 제한, paid/free split 보존, host removal 강제환불, event-first lock order hardening을 F03-05와 함께 검토한다.

## 1. 결론

> **2026-08-18 P0 출시 태세(P0-PAID-01)**: 아래 계약은 **두 수단 전체**의 설계다. 지금 실제로 열려 있는 수단은 **BANK_TRANSFER(계좌이체 — 호스트 계좌로 직접 송금)** 하나이며, WALLET(포인트 지갑)은 실 PG 출시 전까지 닫혀 있다. WALLET 관련 서술(즉시 PAID·회계 분개·자동 환불)은 **설계 정본이자 현재 비활성**으로 읽는다. 상세는 §4 결제 수단 절.

선입금 활성 이벤트(`EventPrepayment.prepaymentRequired=true`)에서 참가자가 호스트 승인 또는 자동 승인 후 `APPROVED_PENDING_PAYMENT` 상태에 진입하면, 지정된 `paymentDueAt` 기한 내에 **WALLET(포인트 지갑)** 또는 **BANK_TRANSFER(계좌이체 신고)** 중 한 가지 방식으로 선입금을 납부해 참가를 확정한다. WALLET은 즉시 PAID + capacity++ + 참석 확정이 자동 발생하고, BANK_TRANSFER는 호스트가 입금 확인(`bankConfirm`) 또는 거부(`bankReject`)를 직접 수행해야 결정된다. 환불은 사용자 취소·이벤트 취소·호스트 거부 트리거 각각에 대해 정해진 경로(WALLET 자동 환불 / BANK 호스트 수동 환불 / `REFUND_REQUESTED` 큐)로 정리된다.

**환불 정책 (2026-06-05 카탈로그 기반 갱신)**: 환불율은 이벤트별 `event_refund_policy` 카탈로그(6종 템플릿 — STANDARD/STRICT/FLEXIBLE/FULL/NON_REFUNDABLE/CUSTOM)에 기반한 by_time 다단계 비율로 산출된다. 귀책(RefundFaultCategory)에 따라 최대 100% ~ 0% 범위에서 결정된다. 레거시 "단일 deadline 100%/마감 후 0%" 규칙은 Phase 4에서 `event_refund_policy` 카탈로그 계산기로 전환되어 폐기됨 (상세는 §환불 정책 카탈로그 절 참조).

본 단위는 F03-05와 분리한다. F03-05는 신청·취소의 사용자 진입 흐름을 다루고, F03-13은 그 신청이 결제로 확정되는 별도 트랜잭션과 회계·환불 흐름을 다룬다. `INITIAL` 목적의 활성 결제는 application당 최대 1건이지만, 결제 후 게스트 추가는 같은 application에 여러 `GUEST_INCREMENT` 결제가 생길 수 있으므로 전체 관계를 단순한 1:0..1로 표현하면 안 된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 호스트 승인 후 액션바가 "결제하고 참석 확정"으로 전환 ▶ 현재는 별도 화면 없이 WALLET 결제를 즉시 호출
- 마이 이벤트(F03-12) "결제 대기" 표시 ▶ 이벤트 상세로 이동
- BANK 신고·호스트 확인·거부·BANK 환불 확인 API는 서버에 있으나 Flutter 호출 UI는 없다.
- 알림 enum 71~76·83은 존재하지만 생산 배선과 Flutter 라우팅 범위가 서로 다르므로 §7의 실측표를 따른다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventPrepaymentController`, `EventController`, `EventParticipationCancellationService`, `ApplicationService`, `ApplicationPaymentExpiryScheduler`, `ApplicationStatus`, `NotificationType`, `EventPrepaymentService`, `EventPaymentRefundService`, `WalletService`. 앱: `event_prepayment_api.dart`, `event_prepayment_repository.dart`, `attendance_action_provider.dart`, `cancel_attendance_sheet.dart`.

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

## 4. 제품 규칙

### 결제 수단
- 참가자에게 열리는 수단은 서버 목록이 정한다. `WALLET` 은 실결제 스위치, `BANK_TRANSFER` 는 호스트 직접 수납 스위치와 출시 범위(`CASH_EVENT`)를 본다. 첫 출시 태세의 실제 값은 `BANK_TRANSFER` 하나다.
- 앱은 목록에 없는 수단의 버튼을 그리지 않는다. 그래도 보내면 서버가 `EVENT_PREPAYMENT_TYPE_NOT_READY` 로 거절한다. 그런 정책의 모임은 만들 때부터 막힌다(F03-03 §4.1).
- 이미 있는 결제의 확인·거절·취소·환불은 이 판정을 지나지 않는다. 막으면 돈과 좌석이 함께 갇힌다.

### 결제 행
- 신청마다 첫 결제(`INITIAL`)의 살아 있는 행은 하나다. 살아 있는 상태는 `PENDING`·`PAID`·`REFUND_REQUESTED` 다. 일행 추가 결제(`GUEST_INCREMENT`)는 여러 건일 수 있다.
- 중복 결제는 거절한다. 다시 보내도 지난 성공을 돌려주는 방식이 아니다.

### 장부
| 일 | 수단 | 장부 |
|---|---|---|
| 결제 | 지갑 | 유료 포인트부터 차감, 충전 단위가 모자라면 전체 되돌림. 총액을 호스트 미지급금으로 적립 |
| 입금 확인·거부·환불 확인 | 계좌이체 | 분개 없음, 호스트가 직접 받으므로 기록만 남김. 거부는 결제 `CANCELED` + 호스트 사유 |
| 환불 | 지갑 | 원결제의 충전 단위로 복원, 유료·무료 각각 누적 한도를 지킴. 카드 취소 대기열을 쓰지 않고 지갑으로 돌림 |

- 정산 완료 뒤 무료 포인트분 환불은 호스트에게서 회수하지 않고 플랫폼 비용으로 처리한다.
- 호스트 수동 환불에는 이체증 같은 증빙을 5건까지 붙인다.
- 환불 예상액은 서버 미리보기를 따른다. 앱이 따로 계산하지 않는다.

### 권한
- 입금 확인·거부는 호스트·공동호스트다. 은행 환불 확인은 여기에 클럽 OWNER·환불 담당을 더한다. 지갑 환불은 본인 또는 환불 권한자다.

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
| S2-11 | 계정 비활성화 시도 (active event_payment 보유) | `event_payment.PENDING/REFUND_REQUESTED`, 또는 정상 종료 전 모임의 PAID 보유 사용자 | 점검 응답 `blockingItems` 에 `ACTIVE_EVENT_PAYMENT` 노출, 탈퇴 요청은 400 `DEACTIVATION_BLOCKED`. 정상 종료(CLOSED)한 모임의 PAID 는 수단과 상관없이 막지 않는다(U1 ①). |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | `community_api/src/main/java/com/endside/community/event/prepayment/` 전체 (controller, service, repository, model, vo, param, event listener) | 결제·환불 facade와 내부 강제환불 구현 확인. 삭제된 계획 문서가 아니라 현재 source/test가 권위다. |
| 회계 분개 | WALLET 결제·환불만 `AccountingLedgerService` 진입. BANK는 분개 없음 (D5). | 결제는 표준 차감 경로 `spend(EVENT_PREPAYMENT)`로 차감 후 wrapper가 `recordPayment`(gross 전액 CREATOR_PAYABLE 적립). 정산 완료 시 무료분은 호스트에 무료 포인트로 실지급(`recordEventFreeSettlement`, residue 0 수렴), 무료만 모인 이벤트도 fee/tax 0 정산 생성. 2026-06-06 이관(정책 PRD §2.6). |
| 중복 차단 | `INITIAL`에 한정된 generated unique + event/application lock + active payment 선조회 | 정상 순차 중복은 `DUPLICATE_PAYMENT`로 거부한다. 성공 결과를 재사용하는 idempotency가 아니며, 새 paymentId 기준 PointTransaction exists 검사는 정상 흐름에서 false다. DB unique 경쟁 예외의 전용 변환 catch도 없다. |
| 환불 정책 | Phase 4에서 `event_refund_policy` 카탈로그 기반 계산기로 전환 완료. D7 "단일 deadline 100%/마감 후 0%" 폐기. GRADUATED는 레거시 STANDARD 매핑. | `RefundPolicyService.computeRefund`(귀책 분기) + `EventPaymentRefundService.refundByWallet` (2026-06-05 해소). |
| 알림 | enum 선언, publisher, after-commit listener, 실제 send, Flutter route를 각각 확인 | 71~74·76은 listener가 연결됨. 72는 주 호스트 한 명에게만 발송. 75는 publisher가 없어 미전송. 83은 기본 3일 후 escalation용. Flutter는 71~76·83 모두 deep link 미지원. |
| 탈퇴 통합 | `AccountDeactivationService` BlockingItem `ACTIVE_EVENT_PAYMENT` + `DEACTIVATION_BLOCKED` | 자동 cancel 허용 케이스(PENDING 결제 없음, APPROVED 무료, APPROVED_PENDING_PAYMENT + 결제 만료) 분기 명문화 |

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

소스: `PointTransactionQueryRepositoryDataJpaTest.java:41-185`.

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
| 높음 | Flutter current source | 사용자 연결은 WALLET CTA 하나뿐. BANK 신고·호스트 확인/거부·BANK 환불 확인 화면이 없고 `refund-bank-confirm` API 정의도 없음 | 결제 수단·호스트 운영 수직 슬라이스 구현 |
| 높음 | `ApplicationPaymentExpiryScheduler`, `ApplicationService` | 만료 bulk update가 PENDING `event_payment`를 취소하지 않고 event도 발행하지 않아 75 알림이 dead wiring이며 active payment가 남을 수 있음 | application/payment를 같은 트랜잭션에서 정리하고 event 발행 테스트 추가 |
| 높음 | `NotificationRouter` | 71~76·83 전부 deep link가 없어 수신 알림에서 화면 이동 불가 | 실제 화면 범위와 함께 라우팅 추가 |
| 높음 | refund preview/no-show refund Controller | actor가 service에 전달되지 않거나 eventId가 무시되어 applicationId 기반 IDOR 후보 | 본인/host 권한 + eventId scoping 테스트 |
| 높음 | Event/Club/Recurring cancel | attendance 없는 pending payment 누락, BANK REFUND_REQUESTED 완료 오표시 | payment row 기준 순회와 상태별 결과/알림 분리 |
| 위험 | `EventPrepaymentService.bankConfirm` | capacity/restriction fail → `event_payment.REFUND_REQUESTED` 전이. 호스트가 별도 환불 후 `refundByBankConfirm` 호출해야 정리 | 호스트 UI와 미정리 row 모니터링 필요 |
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
- **AC-11 (S2-11). 탈퇴 차단**: Given `event_payment.PENDING/REFUND_REQUESTED` 또는 정상 종료 전 모임의 PAID 보유. When 탈퇴 요청. Then 400 `DEACTIVATION_BLOCKED` + 점검 응답 `blockingItems` 에 `ACTIVE_EVENT_PAYMENT` 노출. 정상 종료한 모임의 PAID(계좌이체·지갑)만 남았으면 탈퇴한다(U1 ①).

## 10. 미결정 / 후속 슬라이스

| 항목 | 사유 | 후속 슬라이스 |
|---|---|---|
| 외부 PG 환불 연계 | 현재 선입금 환불은 wallet 복원 + `pgQueuedPaid=0`. txId 기반 PG-cancel worker와 별도 executor는 없음. | 필요 시 현재 계약과 분리해 신규 설계 |
| ~~호스트 환불 정책 설정 UI~~ 해소(2026-06-06) | 호스트 폼이 카탈로그 6종(STANDARD/STRICT/FLEXIBLE/FULL/NON_REFUNDABLE/CUSTOM) picker로 교체 완료 — STRICT/FLEXIBLE 직접 선택 불가 해소. 전송 권위 = `refundPolicyConfig.templateCode`, 앱이 `EventVo.refundPolicyConfig` read-back 모델링. | 완료 |
| ~~환불 preview + 레거시 섹션 병렬 표시 모순~~ 해소(2026-06-06) | 취소 시트가 서버 preview **단일 출처**로 전환 — 레거시 `RefundPolicySection.forEvent(refundPolicy, refundDeadlineHours)` 병렬 표시 제거. preview/레거시 모순 해소. | 완료 |
| BANK_REFUND_EXCEEDS_POLICY(300014) 앱 에러 핸들링 | 에러 코드 신규 추가, 앱 측 에러 핸들러 매핑 미확인. | 에러 핸들러 매핑 확인/추가 |
| Flutter BANK·호스트 결제 운영 화면 | WALLET은 이벤트 상세 CTA에서 즉시 결제한다. BANK 신고·확인·거부·환불 확인과 상태 화면은 미구현. | 실제 서버 6개 endpoint와 일치하는 모델/API/Provider/화면 구현 |
| 이벤트 취소 결제 정리 | attendance 없는 pending 결제와 BANK 완료 오표시가 있음 | Event/Club/Recurring 공통 payment-row coordinator 또는 동등한 실제 구현 |
| 호스트 정산 보고서 BANK 운영 UI | 백엔드 audit 데이터와 별개로 Flutter 운영 화면은 확인되지 않음 | F06-09/F06-10과 실제 소스 재검증 |

현재 계약의 1차 자료는 `community_api/src/main/java/com/endside/community/event/prepayment/...`, 참가 신청·취소·만료 서비스, `V1__init.sql`, 관련 테스트와 `community_app` 호출부다. 삭제된 event-extensions 계획 문서는 현재 구현 판단에 사용하지 않는다.
