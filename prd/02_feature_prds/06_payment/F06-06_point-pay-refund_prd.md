# F06-06. 포인트 결제·환불 PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/06_payment/F06-06_point-pay-refund -->

> 문서 상태: **실사 기반 전환본 + W2/W3 신규 결제 경로 통합 (2026-05-22)**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-06_point-pay-refund`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-05-22 W2/W3 추가: 기존 `WalletService.pay`(referenceType=`EVENT_PAYMENT`)에 더해 신규 결제 경로 `WalletService.payForApplication`(referenceType=`EVENT_PREPAYMENT`)이 도입되었다. 기존 경로는 변경 없이 유지하고(D8), 신규 경로만 본 PRD §4.2 W2에 명세한다. 환불 측 신규 `TransactionType.EVENT_PREPAYMENT_REFUND(26)`도 함께 추가. 신규 환불 흐름의 facade는 F03-13에서 다루고 본 PRD에서는 분개·중복차단·자동충전 호환성만 다룬다.
>
> ⛔ **2026-06-06 EVENT spend 이관 (api `7d9f2cf`)**: 위 두 직접 결제 경로(`pay`/`payForApplication`)는 **진입 즉시 차단**으로 전환됐다(D8 폐기). 현행 이벤트 결제는 **선입금 facade 단일 경로**(표준 차감 진입점 spend 경유 — 유료/무료 split 기록·충전 단위 추적·부족 시 롤백)이며, 환불 지갑 복원도 표준 환불 경로(split 보존+충전 단위 복원+통화별 누적 한도)로 수렴됐다. **본문 §1·§3·§4의 `POST /api/v1/wallet/pay` 직접 결제 서술은 이관 전 이력으로 읽을 것** — 현행 계약은 §9 AC-W2-1~4 참조. 과거 E2E 라운드 기록(P70 매트릭스의 pay 직접호출 모드)은 재실행 불가.

## 1. 결론

이벤트 참여비 등을 보유 포인트(유료 우선 차감)로 즉시 결제하고, 환불 정책에 따라 결제를 취소·환불받는다. 결제는 중복 차단(`existsByUserIdAndReferenceTypeAndReferenceId`) + 서버 가격 검증(클라 amount vs `event.price`) 후 잔액 차감 → `point_transactions(type=PAY)` + `payment_records(COMPLETED)` + FIFO `charge_lots` 차감 + 회계 분개. 환불은 `payment/refundpolicy/service/RefundPolicyService`가 `event_refund_policy` 카탈로그(by_time 다단계 비율)로 산출 후 진행 — 과거 하드코딩된 24h=100%/12h=50%/0% 표현은 레거시 `GET /api/v1/wallet/refund/policy` 안내 응답에만 남아 있고, 실제 환불 계산은 D-1 커밋(419e050) 이후 카탈로그 기반으로 전환 완료. 결제 흐름에서 잔액 부족 시 자동 충전(F06-05) 트리거. 본 단위에 포함된 추가 엔드포인트로 `GET /api/v1/wallet/refund/policy`(하위 호환 안내, 레거시 고정값)와 신규 `GET /api/v1/refund-policy-templates`(카탈로그 6종 목록).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

본 기능은 자체 화면이 없다. 결제·환불 호출은 다른 도메인 화면에서 일어나고, 본 단위 화면은 **거래 상세(F06-03 SCR-PM-004)** + **환불 정책 안내 모달**만을 다룬다.

- 결제 호출 진입점:
  - 이벤트 상세(Unit 03) ▶ "참여하기" CTA → 결제 확인 모달 → `POST /api/v1/wallet/pay`
  - 유료 승인제 이벤트(Unit 03) ▶ 호스트 승인 알림/상세 CTA "결제하고 참석 확정" → `POST /api/v1/wallet/pay`
  - 호스팅 티켓(F06-07) ▶ 구매 다이얼로그 → 내부적으로 `walletSpendService.spend(HOSTING_TICKET_PURCHASE, ...)` 호출(별도 엔드포인트 `/hosting-tickets/purchase`)
  - 개인 구독(F06-08) ▶ 구독 시작 → 내부 `walletSpendService.spend(SUBSCRIPTION, ...)`
- 환불 호출 진입점:
  - 이벤트 상세(Unit 03)/내 신청 화면 ▶ "참여 취소" → 환불 정책 안내 모달 → `POST /api/v1/wallet/refund`
- 환불 정책 안내(`GET /refund/policy`) 모달:
  - 결제 직전 "환불 규정 보기" 링크
  - 거래 상세에서 환불 거래 진입 시 PG sub-status 카드 보강 (F06-03)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-06_point-pay-refund/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-06_point-pay-refund/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-06_point-pay-refund/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-06_point-pay-refund/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:142` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:154` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:190` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 결제: 도메인별 화면 ▶ `WalletRepository.pay(PaymentParam)` ▶ `POST /api/v1/wallet/pay`
2. 환불: `WalletRepository.refund(RefundParam)` ▶ `POST /api/v1/wallet/refund`
3. 정책 조회: `refundPolicyNotifierProvider` ▶ `WalletRepository.getRefundPolicy()` ▶ `GET /api/v1/wallet/refund/policy` (레거시 안내용). 신규 카탈로그 조회는 `GET /api/v1/refund-policy-templates`
4. 결제/환불 후 `walletNotifierProvider`, `transactionListNotifierProvider` invalidate로 잔액·내역 갱신
5. 잔액 부족 응답 처리: `ApiError`에 `PaymentFailureVo` payload가 들어오면 충전 화면 prefill 라우팅
6. 유료 승인제 결제 후에는 `eventDetailNotifierProvider`, `applicationListNotifierProvider`, `walletNotifierProvider`, `transactionListNotifierProvider`를 모두 invalidate해 신청 상태/참석 상태/잔액/거래 내역을 동기화

## 4. 서버 계약

### 개요

이벤트 참여비 등을 보유 포인트(유료 우선 차감)로 즉시 결제하고, 환불 정책에 따라 결제를 취소·환불받는다. 결제는 중복 차단(`existsByUserIdAndReferenceTypeAndReferenceId`) + 서버 가격 검증(클라 amount vs `event.price`) 후 잔액 차감 → `point_transactions(type=PAY)` + `payment_records(COMPLETED)` + FIFO `charge_lots` 차감 + 회계 분개. 환불은 `payment/refundpolicy/service/RefundPolicyService`가 `event_refund_policy` 카탈로그(by_time 다단계 비율)로 산출 후 진행 — 과거 하드코딩된 24h=100%/12h=50%/0% 표현은 레거시 `GET /api/v1/wallet/refund/policy` 안내 응답에만 남아 있고, 실제 환불 계산은 D-1 커밋(419e050) 이후 카탈로그 기반으로 전환 완료. 결제 흐름에서 잔액 부족 시 자동 충전(F06-05) 트리거. 본 단위에 포함된 추가 엔드포인트로 `GET /api/v1/wallet/refund/policy`(하위 호환 안내, 레거시 고정값)와 신규 `GET /api/v1/refund-policy-templates`(카탈로그 6종 목록).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/wallet/pay | WalletController#pay | required | ⛔ **차단됨(2026-06-06)** — 진입 즉시 거부(deprecate-not-delete). 현행 결제는 선입금 facade 단일 경로 |
| POST | /api/v1/wallet/refund | WalletController#refund | required | 이벤트 환불 (정책 기반 부분/전액) |
| GET | /api/v1/wallet/refund/policy | WalletController#getRefundPolicy | required | 레거시 환불 안내 고정값 응답 (24h=100%/12h=50%/0% 하드코딩). 실 계산에는 미사용. |
| GET | /api/v1/refund-policy-templates | RefundPolicyController#listTemplates | 불필요(public) | 이벤트 환불 정책 카탈로그 6종 목록 (STANDARD/STRICT/FLEXIBLE/FULL/NON_REFUNDABLE/CUSTOM). 소스: `RefundPolicyController.java:36`. |

> **Fact**: `GET /api/v1/wallet/refund/policy` 는 `WalletController.java:190-203` 에 존재하며, `Map<String, Object>` 에 `hoursBeforeEvent`/`refundPercent` 하드코딩 값을 반환한다. 신규 카탈로그 기반 계산(`payment/refundpolicy/service/RefundPolicyService`)과는 무관하게 레거시 안내 목적으로만 살아 있다. Deprecation 계획은 미결정 (§8 Gap 참조).

### 환불 귀책(Fault) 분기 매트릭스

> **Fact (D-1, 커밋 419e050 + c7b4315)**: 실제 환불 계산은 `RefundFaultCategory` 7종 귀책에 따라 분기된다. 소스: `payment/refundpolicy/service/RefundPolicyService.java:132-198`, `payment/refundpolicy/constants/RefundFaultCategory.java`.

| faultCategory | 환불율 | fixed_fee | 비고 |
|---|---|---|---|
| HOST_FAULT | 100% | 강제 0 | 호스트 취소 계열 |
| FORCE_MAJEURE | 100% | 강제 0 | 불가항력 |
| MUTUAL | 100% | 강제 0 | 합의 취소 |
| RESCHEDULE_DECLINED | 100% | 강제 0 | 일정변경 거절 |
| NO_SHOW | 0% (allowed=false) | — | 노쇼 자동 거절 |
| PARTICIPANT_FAULT | by_time 비율 % | policy.fixedFeeAmount 유료분 cap | 표준 취소 |
| NO_SHOW_POST_ADJUSTMENT | 호스트 입력 manual | 0 | 노쇼 사후 조정 |

host-fault 계열 4종(HOST_FAULT/FORCE_MAJEURE/MUTUAL/RESCHEDULE_DECLINED)은 `hostFaultWaiveFixedFee` 필드값과 무관하게 수수료 강제 0.

### 환불 동시성 exact-once 보장

> **Fact (D-1, 커밋 419e050)**: TOCTOU 이중 환불 차단 및 PAYING 상태 경합 방어가 구현됨. 소스: `RefundService.java`, `EventPaymentRefundService.java`, `EventRefundSettlementService.java`.

| 보호 포인트 | 구현 방식 |
|---|---|
| 참가자 이중 환불 | `doRefund`: wallet FOR UPDATE 후 EVENT_REFUND 존재 확인 (lock-then-check). `RefundService.java:157-167` |
| `refundByWallet` 이중 진입 | event/application/eventPayment 순차 FOR UPDATE lock. `EventPaymentRefundService.java:123-133` |
| `forceRefundByAdmin` stale-read | eventPaymentRef로 IDs 추출 → 동일 락 순서 재획득 → active+paymentId 일치 확인. `EventPaymentRefundService.java:467-481` |
| PAID claw-back 멱등 | refundTxId로 carrier 이미 존재하면 전체 no-op. `EventRefundSettlementService.java:155-162` |
| PAYING 경합 | `SETTLEMENT_IN_PROGRESS_RETRY(409)` 반환 → 재시도 유도. `EventRefundSettlementService.java:103-107` |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `TransactionType`: `PAY`(1), `REFUND`(2) (referenceType=`EVENT_PAYMENT` / `EVENT_REFUND`; referenceId=eventId)
- **Enum** `PointTransactionStatus`: `COMPLETED`(결제/환불 즉시 완료), `FAILED` 가능
- **Enum** `RefundPgStatus` (응답 보강용): `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED`, `MANUAL_REQUIRED` (정확 값은 `payment/constants/RefundPgStatus.java` 참조)
- 핵심 도메인 객체:
  - `PaymentRecord` — userId, amount, status, pointTransactionId, pgPaymentKey?, pgOrderId?
  - `RefundRequest` — refundPointTransactionId, pgStatus, processedAt, retry 정보
  - `ChargeLot` — FIFO 환불 단위
  - `AccountingLedger` — `USER_WALLET`, `CREATOR_PAYABLE`, `PLATFORM_FEE_REVENUE`, `PG_RECEIVABLE` 등 (account codes는 `payment/constants/AccountCode.java`)

### 의존 단위 / 외부 시스템

- **외부 PG (🟠 Toss)**: 환불 시 비동기 `cancelPayment` 호출 (RefundRequestWorker)
- 다른 Unit:
  - **Event Unit (03)**: `event.price`로 가격 검증 + `event.hostUserId`로 호스트 식별. 결제 후 이벤트 신청 확정은 Event Unit에서 처리.
  - **F03-05/F03-06 유료 승인제**: 승인 후 결제 대기 상태에서만 결제를 허용해야 한다. (2026-05-22 W2 갱신: 선입금 활성 이벤트에 한해 `APPROVED_PENDING_PAYMENT` 상태가 도입되어 본 단위 신규 경로 `payForApplication`이 사용된다. F03-13 참조.)
  - **F03-13 이벤트 참가 선입금** (신규): 신규 결제 경로 `WalletService.payForApplication`의 호출자. `EventPrepaymentService.payByWallet` facade가 본 메서드를 호출. 신규 `event_payment` 테이블 기반.
  - **F06-05 자동 충전**: 잔액 부족 시 즉시 트리거 (기존 `pay`와 신규 `payForApplication` 둘 다 호환).
  - **F06-09 수익 대시보드**, **F06-10 정산**: 결제가 호스트의 정산/수익에 누적 (별도 SettlementBatchService가 주기적 집계)
- 알림: `PAYMENT_COMPLETED`, `REFUND_COMPLETED` (NotificationType + `PaymentNotificationData(eventId, amount)`). 선입금 알림(`EVENT_PREPAYMENT_*` 71~76, 83)은 본 단위가 아닌 F03-13에서 발행.

### 4.2 W2 신규 결제 경로 — `WalletService.payForApplication` (D8)

위치: `community_api/src/main/java/com/endside/community/payment/service/WalletService.java:189`

#### 4.2.1 시그니처와 인자

```
TransactionVo payForApplication(
    long userId,
    long applicationId,
    long eventPaymentId,
    long eventId,
    long hostId,
    long amount)
```

#### 4.2.2 기존 `WalletService.pay`와의 분리 원칙 (D8)

기존 `WalletService.pay`(`:73-178`)는 그대로 유지(referenceType=`EVENT_PAYMENT`, referenceId=`eventId`). 신규 메서드는 다음 점만 다르다:
- **referenceType**: `EVENT_PREPAYMENT` (기존 `EVENT_PAYMENT`와 분리 — 동일 사용자가 동일 이벤트에 환불 후 재신청하는 케이스에서 중복 차단 false-positive 방지)
- **referenceId**: `eventPaymentId` (기존은 `eventId`). 신규 `event_payment` row 단위로 1건 결제 → application당 active 1건(D6, STORED + UNIQUE)
- **중복 차단**: `pointTransactionRepository.existsByUserIdAndReferenceTypeAndReferenceId(userId, "EVENT_PREPAYMENT", eventPaymentId)` → 동일 `eventPaymentId`로 두 번째 호출 시 `DUPLICATE_PAYMENT`
- **트랜잭션 경계**: facade(`EventPrepaymentService.payByWallet`)의 트랜잭션 안에서 호출됨. controller에서 직접 노출하지 않음 — 본 메서드는 controller 노출 없음.

#### 4.2.3 14단계 흐름 (기존 `pay`와 동일 패턴, referenceType만 다름)

1. 금액 검증(`amount <= 0` → `INVALID_PAYMENT_AMOUNT`)
2. 중복 결제 차단 (위 §4.2.2 referenceType/referenceId 기준)
3. Wallet 잠금 (`walletQueryRepository.findByUserIdForUpdate`)
4. 잔액 부족 시 자동충전 시도 (F06-05 `ChargeService.tryAutoCharge`) — 실패 시 `INSUFFICIENT_BALANCE + PaymentFailureVo`
5. 유료 우선 차감(`wallet.deductAmount(amount)`)
6. `PointTransaction(type=PAY, referenceType="EVENT_PREPAYMENT", referenceId=eventPaymentId)` insert
7. `PaymentRecord(COMPLETED, pointTransactionId=tx.id)` insert
8. FIFO `ChargeLot` 소진(`chargeLotConsumptionService.consumeFifo`)
9. 회계 분개 (`AccountingLedgerService.recordPayment(txId, userId, eventId, hostId, amount)` — 기존 메서드 재사용)
10. Metric (`wallet.pay` counter, label `ref_type=EVENT_PREPAYMENT`)
11. Log
12. **알림 미발행** — 도메인 이벤트 발행은 facade(`EventPrepaymentService.payByWallet`) 책임. `@TransactionalEventListener(AFTER_COMMIT)`이 알림(`EVENT_PREPAYMENT_BANK_CONFIRMED(73)` 또는 결제 완료 알림) 호출 (D15)
13. `TransactionVo` 반환
14. (호출 측) facade가 `event_payment(PAID)` 전이 + `confirmPaymentAndAttend`

#### 4.2.4 환불 측 신규 경로

신규 `TransactionType.EVENT_PREPAYMENT_REFUND(26)` 도입. 환불은 본 PRD §4.2.5 분개 표만 다루고, facade(`EventPaymentRefundService.refundByWallet/refundByHostCancel`)는 F03-13에서 다룬다.

- referenceType: `EVENT_PREPAYMENT_REFUND`
- referenceId: `eventPaymentId`
- description: "이벤트 참가 선입금 환불 — eventPayment {id}"

> WalletRefundExecutor 공통 헬퍼는 본 슬라이스에서는 미완. 기존 `RefundService.doRefund`와 신규 `EventPaymentRefundService.refundByWallet`은 별도 구현(회귀 방지). 후속 슬라이스에서 추출 예정.

#### 4.2.5 회계 분개 (신규 경로) — D8 + 기존 분개 메서드 재사용

| 트리거 | 분개 호출 | 비고 |
|---|---|---|
| `payForApplication` 성공 | `AccountingLedgerService.recordPayment(txId, userId, eventId, hostId, amount)` | 기존 메서드와 동일. AccountCode 신규 없음 |
| `EventPaymentRefundService.refundByWallet/refundByHostCancel` (F03-13) | `AccountingLedgerService.recordRefund(refundTxId, userId, eventId, hostId, walletRefundedAmount)` — `recordRefund`만 호출, PG queue 없음 (선입금 경로 pgQueuedPaid=0 고정) | 일반 `RefundService` 경로와 달리 PG queue 분기 없음 |
| BANK_TRANSFER 결제·환불 (F03-13 `bankConfirm/bankReject/refundByBankConfirm`) | **분개 없음** (D5 — 호스트 직접 수취) | 호스트 정산 보고서 별도 6 섹션에만 노출 |

### 4.3 유료/무료 분리정산 — 결제 split + 환불 split 보존

> 2026-05-24: 포인트 분리정산 반영. 정본은 정책 PRD `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

- **결제 split**: 결제는 유료(paid) 우선 차감이 기본이며, 표준 차감 경로(`spend()`)로 이관된 opt-in 사용처(마켓/플랜/프라이빗 미팅비/클럽 기부·가입비 + **이벤트 참가비**)에서는 유료/무료 split이 발생해 무료 결제분이 수취자(창작자/기금/호스트)에게 free로 전파되어 현금화되지 않는다. **이벤트 참가비는 2026-06-06 이관으로 flow-through가 완성됐다 — `EventPrepaymentService.payByWallet`가 `spend(EVENT_PREPAYMENT, PAID_FIRST)`를 직접 호출하고, 충전 단위(lot)를 필수 추적해 잔액-추적 정합이 깨지면 결제를 롤백한다(이전 legacy 경로는 경고만 남기고 진행). 멱등 가드·결제 기록·회계 분개는 wrapper가 같은 트랜잭션에서 처리.**
- **환불 split 보존**: `refundByTransaction` 경로의 환불은 원결제의 유료/무료 split을 그대로 복원한다(유료분 → paid, 무료분 → free로 환원). 거래 상세는 무료 환불분(`freeAmount > 0`)을 별도 카드로 표시. 이벤트 선입금 환불도 2026-06-06 이관으로 이 경로(명시 split 오버로드 — 환불 정책 산식 보존 + 충전 단위 복원 + 유료/무료 각각의 통화별 누적 환불 한도 강제)에 수렴했다.

> **Fact (2026-06-06 돈 흐름 무결성 — H1/H2/H7 해소)**: 과거 followup으로 남아 있던 "클럽 기부·가입비·구독·마켓·모임정산 역분개 환불의 `refundToWallet` 계열이 원결제 split을 보존하지 못한다"가 **해소**되었다. 7개 호출처가 split-보존 헬퍼 `WalletRefundService.refundByTransaction`(소스: `payment/service/WalletRefundService.java:45-126` — 원결제 PointTransaction의 paid/free 비율 복원 + `chargeLotConsumptionService.restoreByTransaction`로 lot 복원)으로 전환되었고(커밋 2494654·c539cfe·251c460·b635078·f46b929 등), 원결제 미해석이 불가피한 폐쇄 환불은 row별 split을 독립 보존하도록 재설계되었다. 분해 컬럼 신설 대신 환불 PointTransaction에 `original_point_transaction_id` 역참조를 두어 split을 복원한다. `WalletService.refundToWallet`(`payment/service/WalletService.java:684-692`) 본체는 **`@Deprecated` + 진입 즉시 `RestException(INVALID_INPUT)` throw**로 차단되어 재호출 시 split 세탁이 재발하지 않는다. (커밋 a7876aa..2e0ba2a 범위, 감사 리포트 §6 H1/H2/H7.)
> **Fact (2026-06-06 EVENT 결제 표준화 — flow-through 완성)**: 과거 followup이던 "이벤트 참가비 결제·환불의 `spend()` 이관(flow-through화)"이 **해소**됐다. `EventPrepaymentService.payByWallet`가 `WalletSpendService.spend(EVENT_PREPAYMENT, PAID_FIRST)`를 직접 호출(소스: `event/prepayment/service/EventPrepaymentService.java`)하고 충전 단위 추적은 필수(부족 시 결제 롤백)다. 환불 지갑 복원은 `WalletRefundService.refundByTransaction`(명시 split 오버로드, 통화별 누적 가드 — `payment/service/WalletRefundService.java`)로 수렴했고, 구식 결제 메서드 `WalletService.pay`/`payForApplication`은 본체가 차단(`@Deprecated` + 즉시 throw)됐다. 정산 측은 무료 매출을 호스트에게 무료 포인트로 전달(`recordEventFreeSettlement`)하고 무료만 모인 이벤트도 수수료·세금 0의 정산을 생성한다. (커밋 api `7d9f2cf` / admin `270b1f9`, 정책 PRD §2.6.)
- **followup (잔여, 비-blocker)**: 미사용 legacy 차감 메서드 4종 cleanup, 외부 출금 시 충전 단위 소비 추적, free-burn 결제 시점 PROMOTION_EXPENSE 분개는 별개 followup으로 남는다(이번 EVENT 이관과 무관).

## 5. 프론트 계약

### 진입 경로

본 기능은 자체 화면이 없다. 결제·환불 호출은 다른 도메인 화면에서 일어나고, 본 단위 화면은 **거래 상세(F06-03 SCR-PM-004)** + **환불 정책 안내 모달**만을 다룬다.

- 결제 호출 진입점:
  - 이벤트 상세(Unit 03) ▶ "참여하기" CTA → 결제 확인 모달 → `POST /api/v1/wallet/pay`
  - 유료 승인제 이벤트(Unit 03) ▶ 호스트 승인 알림/상세 CTA "결제하고 참석 확정" → `POST /api/v1/wallet/pay`
  - 호스팅 티켓(F06-07) ▶ 구매 다이얼로그 → 내부적으로 `walletSpendService.spend(HOSTING_TICKET_PURCHASE, ...)` 호출(별도 엔드포인트 `/hosting-tickets/purchase`)
  - 개인 구독(F06-08) ▶ 구독 시작 → 내부 `walletSpendService.spend(SUBSCRIPTION, ...)`
- 환불 호출 진입점:
  - 이벤트 상세(Unit 03)/내 신청 화면 ▶ "참여 취소" → 환불 정책 안내 모달 → `POST /api/v1/wallet/refund`
- 환불 정책 안내(`GET /refund/policy`) 모달:
  - 결제 직전 "환불 규정 보기" 링크
  - 거래 상세에서 환불 거래 진입 시 PG sub-status 카드 보강 (F06-03)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/transactions/:transactionId` | `payment/screens/transaction_detail_screen.dart` | (F06-03과 공유) 결제·환불 거래의 결과 표시. 환불 거래에서 PG sub-status 카드 노출 |
| (모달) | 이벤트/티켓/구독 화면이 띄우는 결제 확인 모달 | 결제 직전 잔액 비교 + 정책 안내 + 확인 |

### 화면별 구성 요소 & 액션

### 결제 확인 모달 (Event/Plan/Hosting Ticket 화면 내부)

- **사용자가 보는 것**: 이벤트명/플랜명, 결제 금액 (예: "8,000P"), 현재 잔액, 결제 후 잔액, "환불 규정 보기" 링크, "결제 확인 / 취소" 버튼
- **사용자가 할 수 있는 액션**:
  - "결제 확인" ▶ `POST /wallet/pay { eventId, amount }` (이벤트 결제) 또는 도메인별 전용 엔드포인트
  - 승인제 유료 이벤트에서는 승인 전 결제 버튼을 노출하지 않고, 승인 후 결제 대기 상태에서만 결제 버튼을 노출
  - 잔액 부족 응답 → 자동 충전 OFF면 충전 화면으로 prefill 분기
  - "환불 규정 보기" ▶ `GET /wallet/refund/policy` 응답을 별도 BottomSheet로 표시
- **상태 분기**: 결제 중 로딩 / 성공 토스트 + 갱신 / 실패 → ErrorDialog or Toast

### 환불 정책 안내 (`GET /wallet/refund/policy`)

- 본 응답을 클라가 단순 표 형태(시간 / 환불률)로 노출. 별도 화면 없음. 모달 또는 BottomSheet.

### 거래 상세 — 환불 거래 (F06-03와 공유)

- `pgStatus`가 채워진 환불 거래는 `PgSubStatusRowWidget`로 6개 sub-status 분기 표기 (예: "환불 진행 중", "환불 완료", "관리자 확인 중")
- 무료 포인트 환불 부분(`freeAmount > 0`)은 즉시 wallet에 복원되었음을 별도 카드로 보여줌

### API 호출 순서 (Provider/Repository 관점)

1. 결제: 도메인별 화면 ▶ `WalletRepository.pay(PaymentParam)` ▶ `POST /api/v1/wallet/pay`
2. 환불: `WalletRepository.refund(RefundParam)` ▶ `POST /api/v1/wallet/refund`
3. 정책 조회: `refundPolicyNotifierProvider` ▶ `WalletRepository.getRefundPolicy()` ▶ `GET /api/v1/wallet/refund/policy` (레거시 안내용). 신규 카탈로그 조회는 `refundPolicyTemplatesProvider` ▶ `RefundPolicyApi.getTemplates()` ▶ `GET /api/v1/refund-policy-templates`
4. 결제/환불 후 `walletNotifierProvider`, `transactionListNotifierProvider` invalidate로 잔액·내역 갱신
5. 잔액 부족 응답 처리: `ApiError`에 `PaymentFailureVo` payload가 들어오면 충전 화면 prefill 라우팅
6. 유료 승인제 결제 후에는 `eventDetailNotifierProvider`, `applicationListNotifierProvider`, `walletNotifierProvider`, `transactionListNotifierProvider`를 모두 invalidate해 신청 상태/참석 상태/잔액/거래 내역을 동기화

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 이벤트 참여비 결제 (Happy Path) | 이벤트 상세 화면, 잔액 충분 | 잔액 42,000P, 거래 내역 1행 추가, 호스트는 정산 대상으로 `Settlement.grossAmount`에 누적될 예정. |
| S2 | 잔액 부족 + 자동 충전 ON → 자동 충전 후 결제 성공 | 잔액 4,500P, 8,000원 결제, 자동충전 활성(임계 5,000 / 충전 30,000) | 사용자가 충전 화면을 거치지 않고 결제 성공. 거래 내역에 `자동 충전 +30,000P` + `결제 -8,000P` 두 행. |
| S3 | 잔액 부족 + 자동 충전 OFF → 충전 화면 prefill 분기 | 잔액 4,500P, 8,000원 결제, 자동 충전 OFF | 충전 1건 + 결제 1건. 사용자 명시적 결정으로 진행. |
| S4 | 24시간 전 환불 (전액) | 결제 거래 1건 존재 | 사용자 잔액 즉시 복구. PG 환불 가능 lot + paymentKey 보유 + `refund.pg-queue.enabled`(기본 false) 모두 충족 시에만 원수단(카드) 환불 큐 대기; 그 외에는 paidRefund도 지갑으로 즉시 복원. |
| S5 | 12시간 전 환불 (50%) | 모임 시작 18시간 전 취소 | 부분 환불 완료. 거래 내역에 환불 1건 + 잔액 부분 복구. |
| S6 | 12시간 미만 환불 시도 → 거절 | 모임 1시간 전 취소 | 잔액 변동 없음. 사용자가 모임 참여 또는 노쇼 결정. |
| S7 | 이중 결제 시도 (이미 결제한 이벤트 재결제) | 결제 직후 푸시 지연으로 다시 탭한 사용자 | 이중 차감 없음. 사용자 화면이 정확한 상태로 정렬. |
| S8 | 가격 조작 시도 (클라 amount=1) | 비정상 클라이언트가 8,000원 이벤트를 1원으로 결제 시도 | 가격 조작 차단. 이벤트는 결제되지 않음. |
| S9 | PG 측 카드 환불 실패 → 수동 대사 | PG 환불 가능 lot + paymentKey 보유 + `refund.pg-queue.enabled` 활성 조건 충족 후 PG 환불 큐 진입 시 PG 측에서 실패 | 사용자 잔액은 영향 없이 환불 완료, PG 측 카드 환불만 비동기로 보정. 거래 상세에서 진행 상황 표시. (조건 미충족이면 paidRefund도 지갑 즉시 복원이므로 본 시나리오는 PG queue 활성화 운영 환경에서만 발생.) |
| S10 | 유료 승인제(선입금) 이벤트 — 승인 후 결제 확정 | `EventPrepayment.prepaymentRequired=true`, `Application=APPROVED_PENDING_PAYMENT` 또는 동등한 결제 대기 상태, `paymentDueAt` 미만료, 사용자는 아직 `EventAttendance=ATTENDING` 아님. | alice 잔액 12,200P, totalSpent 37,800P, point_transaction 신규 행 1건 (`type=PAY`, referenceType=`EVENT_PREPAYMENT`, referenceId=`eventPaymentId`). payment_record 신규 행 1건. **mutation 발생** — 매트릭스 재실행 전 sample_data.sql 재초기화 필요(재실행 시 중복 가드 `existsByUserIdAndReferenceTypeAndReferenceId(userId, "EVENT_PREPAYMENT", eventPaymentId)`로 DUPLICATE_PAYMENT 409). |

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
| 해소 (2026-06-06) | WalletService.java:684-692, WalletRefundService.java:45-126 | **환불 split 미보존 영구 Gap 해소** — `refundToWallet` 7개 호출처를 split-보존 `refundByTransaction`으로 전환, 본체는 `@Deprecated`+즉시 throw로 차단. 무료→유료 현금화 세탁 경로 제거. | 없음 |
| 해소 (2026-06-06) | EventPrepaymentService.java, EventPaymentRefundService.java, WalletService.java | **EVENT 결제 측 `spend()` 이관(flow-through화) 완료** — 이벤트 선입금 결제가 `spend(EVENT_PREPAYMENT)`를 직접 호출(충전 단위 필수 추적·부족 시 롤백), 환불은 `refundByTransaction`(명시 split·통화별 누적 가드)로 수렴, 구식 메서드 2개(`pay`/`payForApplication`) 본체 차단. 무료 매출이 호스트에게 무료 포인트로 전달되고 free-only 정산도 생성됨. | 없음 — flow-through 완성. 정책 PRD §2.6 |
| Risk (PG 게이트) | ChargeService.java:347-463 | **충전취소(cancelCharge) 응답유실 엣지** — DB-first→PG cancel 순서에서 PG 성공+응답유실 시 DB 롤백으로 지갑 미환불+PG 환불됨 불일치 가능. 실 PG(Toss) 연동 전까지 잠재. release-gate `05_pg.md`에 등재됨(코드 무변경, PG 계약 시 일괄 검증). | PG 계약 시 webhook TODO와 함께 검증 |
| Risk | WalletController.java:190 | `GET /api/v1/wallet/refund/policy`는 24h=100%/12h=50%/0% 하드코딩 값을 반환. 실제 환불 계산과 무관하지만 클라이언트가 이 값을 정책 기준으로 표시하면 실제 카탈로그와 불일치. Deprecation 계획 미결정. | 신규 환불 UI는 `GET /api/v1/refund-policy-templates` 카탈로그 응답 기반으로 전환 검토 |
| 후보 | backend.md:48 | #### 유료 승인제 결제 검증 보강 필요 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:117 | - **Enum** `RefundPgStatus` (응답 보강용): `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED`, `MANUAL_REQUIRED` (정확 값은 `payment/constants/RefundPgStatus.java` 참조) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:129 | - **F03-05/F03-06 유료 승인제**: 승인 후 결제 대기 상태에서만 결제를 허용해야 한다. 현재 서버에는 이 상태가 없어 보강 필요. | 2026-06-06 확정: 인용 속 `WalletService.pay` 직접 결제 경로는 EVENT spend 이관으로 **차단됨** — 과거 E2E 라운드 기록으로는 유효하나, P70 매트릭스의 pay 직접호출 모드는 재실행 불가(매트릭스 재설계 필요). 현행 결제는 선입금 facade 경유 |
| 후보 | frontend.md:16 | - 거래 상세에서 환불 거래 진입 시 PG sub-status 카드 보강 (F06-03) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:136 | **현재 구현 갭**: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:143 | - 결제 실패 시 `EventAttendance`가 생성되면 실패로 본다. | 2026-06-06 확정: 인용 속 `WalletService.pay` 직접 결제 경로는 EVENT spend 이관으로 **차단됨** — 과거 E2E 라운드 기록으로는 유효하나, P70 매트릭스의 pay 직접호출 모드는 재실행 불가(매트릭스 재설계 필요). 현행 결제는 선입금 facade 경유 |
| 후보 | scenarios.md:149 | 12차-A 라운드에서 PG WebView mock 패턴 평가 후 일단 미작성으로 보류했던 P70 매트릭스를, 15차-B `PG_WEBVIEW_MOCK_PATTERN.md` §5 가 권장한 1단계(§4-1/§4-2 무관 — F06-06 의 잔액 결제·환불 5 모드) 로 도입. 15차-B 라운드에서 `integration_test/seed_payment_refund_test.dart` + `scripts/e2e/run_p70_payment_refund_matrix.sh` 신설. 17차-A 라운드에서 happy refund 3 모드(`refund_full_happy` / `refund_partial_happy` / `refund_partial_30_happy`) 보강. 17차-C 라운드에서 S2 자동충전 happy path 1 모드(`auto_charge_success`) 보강 — 별도 P71 분리 대신 P70 확장 (단일 mode 추가이므로 매트릭스 분할 비용 과함). 18차-B 라운드에서 S7 이중 결제 가드 1 모드(`duplicate_payment_guard`) 보강 — `WalletService.pay` 의 중복 가드(`existsByUserIdAndReferenceTypeAndReferenceId`)가 가격 검증/wallet row lock 이전에 DUPLICATE_PAYMENT 409 throw → 클라 ErrorInterceptor 가 ApiError.conflict 로 매핑하는 end-to-end 경로 검증 (멱등 — 시드 EVENT_PAYMENT 9003 잔존 의존, 재실행 안전). | 2026-06-06 확정: 인용 속 `WalletService.pay` 직접 결제 경로는 EVENT spend 이관으로 **차단됨** — 과거 E2E 라운드 기록으로는 유효하나, P70 매트릭스의 pay 직접호출 모드는 재실행 불가(매트릭스 재설계 필요). 현행 결제는 선입금 facade 경유 |
| 후보 | scenarios.md:252 | 4. 만약 시드 보강으로 startTime 이 미래로 조정된 경우엔: RefundPolicyService 통과 → alreadyRefunded false → `findByUserIdAndReferenceTypeAndReferenceId(3, EVENT_PAYMENT, 1303)` Optional.empty() → throw RestException(TRANSACTION_NOT_FOUND) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:272 | **감사 / 검증 시 가정**: 본 정책은 **현재 코드의 사실** 명시 — 본 라운드(19차-B) 에서는 정책 변경/추가 검증 도입 없음. Codex 외부 감사 등이 "host/co-host 결제 시 차단되어야 함" 으로 가정하는 경우 본 절을 근거로 가정 오류로 분류. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:276 | - ~~**happy refund mutation**(100% / 50% / 30% / 환불 후 잔액 복구)~~ — **17차-A 라운드에서 해소.** sample_data.sql 에 미래 이벤트 1304/1305/1306 + alice EVENT_PAYMENT 시드(9016/9018/9020) 추가 + seed_local.sh 에 NOW() 기반 동적 startTime 갱신 도입. P70 매트릭스에 `refund_full_happy` / `refund_partial_happy` / `refund_partial_30_happy` 3 modes 보강 — RefundPolicyService 의 STANDARD 100%(≥24h) / STANDARD 50%(12-24h) / STRICT 30%(24-48h) happy 분기를 실서버 round-trip 으로 검증. 환불 후 wallet.balance 복구액 (paidAmount × refundPercent/100) 도 함께 확정. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:277 | - ~~**자동 충전 happy path**(S2)~~ — **17차-C 라운드에서 해소.** alice auto_charge_config 활성 상태(enabled=1, chargeAmount=50,000, paymentMethodId=901)를 활용해 P70 에 `auto_charge_success` mode 보강. setup 단계에서 event 1303 (price 8,000P) 결제로 alice 잔액을 17,200→9,200P 로 사전 소진한 뒤, event 1312 (price 12,000P) 결제 시도 → `ChargeService.tryAutoCharge` 의 non-prod 분기(`pgPaymentKey="SIM_AUTO_..."`)가 발동하여 wallet 에 50,000P 충전 + 12,000P 차감 → 최종 47,200P. PAY TransactionVo 의 `balanceBefore=59,200` 검증으로 auto-charge 발동을 결정적으로 확인. (한계: 시드 한계로 Repository.refund 자동 cleanup 불가 — 모든 시드 event startTime 과거이므로 REFUND_NOT_ALLOWED 거절. 재실행 전 sample_data.sql 재초기화 필요. 서버 dev/staging profile 필수 — prod profile 기동 시 tossPaymentService.billingPayment 실제 호출.) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:278 | - ~~**이중 결제 가드**(S7 — 본 매트릭스의 pay_with_balance 재실행 시 DUPLICATE_PAYMENT 로 자연 검증되지만 명시적 모드 미정의)~~ — **18차-B 라운드에서 해소.** alice 가 시드 결제 EVENT_PAYMENT 9003 을 이미 보유한 event 1301 (price 15,000P) 에 동일 가격으로 재결제 시도 → 서버 `WalletService.pay` 진입 직후의 중복 가드(`existsByUserIdAndReferenceTypeAndReferenceId(userId, EVENT_PAYMENT, eventId)`) 가 가격 검증/wallet row lock 이전에 throw `DUPLICATE_PAYMENT` (ErrorCode.java:109 — 409 / 600014). 클라 dio ErrorInterceptor(`error_interceptor.dart:39`) 가 409 → `ApiError.conflict(errorCode='DUPLICATE_PAYMENT')` 로 매핑. P70 매트릭스에 `duplicate_payment_guard` 1 mode 보강 — errorCode 추출 + ApiError union conflict 분기 + wallet 잔액/totalSpent 무변동(가드는 wallet lock 이전 throw)을 end-to-end 검증. (멱등 — 시드 9003 은 어떤 매트릭스 mutation 도 삭제하지 않으므로 재실행 안전.) | 2026-06-06 확정: 인용 속 `WalletService.pay` 직접 결제 경로는 EVENT spend 이관으로 **차단됨** — 과거 E2E 라운드 기록으로는 유효하나, P70 매트릭스의 pay 직접호출 모드는 재실행 불가(매트릭스 재설계 필요). 현행 결제는 선입금 facade 경유 |
| 후보 | scenarios.md:291 | - **C 확정**: 본 흐름은 D-02 v2 dormant infra ("v3에서 paid 환불 정책 결정 후 실제 가동", `RefundRequestWorker.java:31`) 로 명시된 **architectural placeholder** 영역. 현재 코드 사실 상 E2E mutation 으로 도달 불가능한 dead branch 검증을 매트릭스에 강제하면 false-green 위험만 도입. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:294 | 2. (1) 충족 후 P70 매트릭스에 `refund_async_worker_success` / `refund_pg_failure_retry` 2 mode 보강 — 단, mutation 전제이므로 `pg_payment_key` / `charge_lot.pg_refundable=true` 시드 보강 + sample_data 재초기화 의존성 명시 필요. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:301 | > 17차-A 라운드 보강 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:304 | **시작 상태**: 로그인 완료(seed alice). walletRepository.getWallet() → balance=17,200, totalSpent=48,300 (17차-A 보강 후). PointTransaction 9016 (EVENT_PAYMENT, 1304, 5000) 존재. EVENT_REFUND 거래 부재. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:322 | 출처: `community_api/src/main/java/com/endside/community/payment/service/RefundService.java:60-87,99-180` (refund + doRefund), `community_api/src/main/java/com/endside/community/payment/service/RefundPolicyService.java:48-71,157-167` (STANDARD ≥24h → 100%), `community_api/docs/sql/sample_data.sql` (17차-A 보강 event 1304 + PointTransaction 9016), `community_api/docs/sql/seed_local.sh` (NOW()+35d 동적 startTime 갱신). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:366 | > 17차-C 라운드 보강 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:369 | **시작 상태**: 로그인 완료(seed `alice@community.local`). walletRepository.getWallet() → `balance=17,200, totalCharged=65,500, totalSpent=48,300` (17차-A 보강 후 합계 — 9015~9020 충전/결제 시드로 17,200 그대로 유지). event 1303 (host=user 6, price 8,000P, alice 미결제) + event 1312 (host=user 2, price 12,000P, club 1201 co-host 3331 — co-host 라도 결제 허용, alice 미결제) 시드 상태. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:399 | > 18차-B 라운드 보강 — F06-06 S7 해소 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:402 | **시작 상태**: 로그인 완료(seed `alice@community.local`). walletRepository.getWallet() → balance=17,200, totalSpent=48,300 (17차-A 보강 후 — 9015~9020 충전/결제 시드 누적 반영). PointTransaction 9003 (EVENT_PAYMENT, referenceId=1301, amount=15,000, COMPLETED) 존재. 매트릭스 사이클 동안 어떤 mutation 도 9003 을 삭제하지 않음 (refund_full 은 startTime 과거로 REFUND_NOT_ALLOWED 거절 → EVENT_REFUND 행조차 추가 없음 → 결과적으로 9003 잔존). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 이벤트 참여비 결제 (Happy Path)**: Given 이벤트 상세 화면, 잔액 충분 When 사용자가 해당 흐름을 실행하면 Then 잔액 42,000P, 거래 내역 1행 추가, 호스트는 정산 대상으로 `Settlement.grossAmount`에 누적될 예정.
- **AC-02. 잔액 부족 + 자동 충전 ON → 자동 충전 후 결제 성공**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 충전 화면을 거치지 않고 결제 성공. 거래 내역에 `자동 충전 +30,000P` + `결제 -8,000P` 두 행.
- **AC-03. 잔액 부족 + 자동 충전 OFF → 충전 화면 prefill 분기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 충전 1건 + 결제 1건. 사용자 명시적 결정으로 진행.
- **AC-04. 24시간 전 환불 (전액)**: Given 결제 거래 1건 존재 When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 즉시 복구. PG 환불 가능 lot + paymentKey 보유 + `refund.pg-queue.enabled`(기본 false) 모두 충족 시에만 원수단(카드) 환불 큐 대기; 그 외에는 paidRefund도 지갑으로 즉시 복원.
- **AC-05. 12시간 전 환불 (50%)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 부분 환불 완료. 거래 내역에 환불 1건 + 잔액 부분 복구.
- **AC-06. 12시간 미만 환불 시도 → 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 잔액 변동 없음. 사용자가 모임 참여 또는 노쇼 결정.
- **AC-07. 이중 결제 시도 (이미 결제한 이벤트 재결제)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이중 차감 없음. 사용자 화면이 정확한 상태로 정렬.
- **AC-08. 가격 조작 시도 (클라 amount=1)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가격 조작 차단. 이벤트는 결제되지 않음.
- **AC-09. PG 측 카드 환불 실패 → 수동 대사**: Given PG 환불 가능 lot + paymentKey 보유 + `refund.pg-queue.enabled` 활성 조건 모두 충족 When PG 측에서 환불 실패 Then 사용자 잔액은 영향 없이 환불 완료, PG 측 카드 환불만 비동기로 보정. 거래 상세에서 진행 상황 표시. (조건 미충족이면 paidRefund도 지갑 즉시 복원이므로 본 시나리오는 PG queue 활성화 환경에서만 발생.)
- **AC-10. 유료 승인제(선입금) 이벤트 — 승인 후 결제 확정**: Given `EventPrepayment.prepaymentRequired=true`, `Application=APPROVED_PENDING_PAYMENT` 또는 동등한 결제 대기 상태, `paymentDueAt` 미만료, 사용자는 아직 `EventAttendance=ATTENDING` 아님. When 사용자가 해당 흐름을 실행하면 Then alice 잔액 12,200P, totalSpent 37,800P, point_transaction 신규 행 1건 (`type=PAY`, referenceType=`EVENT_PREPAYMENT`, referenceId=`eventPaymentId`). payment_record 신규 행 1건. **mutation 발생** — 매트릭스 재실행 전 sample_data.sql 재초기화 필요(재실행 시 중복 가드로 DUPLICATE_PAYMENT 409). (선입금 경로 검증 세부는 AC-W2-1 참조)
- **AC-W2-1 (S2-1). 결제 경로 happy path (2026-06-06 spend 이관 갱신)**: Given `EventPrepayment.prepaymentRequired=true`, `Application=APPROVED_PENDING_PAYMENT`, 잔액 충분. When facade(`EventPrepaymentService.payByWallet`)가 표준 차감 진입점 `WalletSpendService.spend(EVENT_PREPAYMENT, PAID_FIRST)` 호출(구 `WalletService.payForApplication`은 진입 즉시 차단됨 — deprecate+throw). Then `PointTransaction(type=PAY, referenceType=EVENT_PREPAYMENT, referenceId=eventPaymentId, paid/free split 기록)` 신규 1건 + charge lot 소비(`point_transaction_id` 키, 부족 시 전체 롤백) + `PaymentRecord` 신규 1건 + `AccountingLedger.recordPayment` 분개 1건. 잔액 = before - amount.
- **AC-W2-2. 중복 차단 (유지)**: Given 동일 `eventPaymentId`로 이미 PAY 트랜잭션 존재. When `payByWallet` 재호출. Then 즉시 `DUPLICATE_PAYMENT` 409 (wrapper 멱등 가드 — spend 미호출). wallet 변동 없음.
- **AC-W2-3. 자동충전 호환성 (유지 — 2026-06-06 이관 시 wrapper 레벨로 이동)**: Given 잔액 부족 + 자동충전 활성. When `payByWallet` 호출. Then spend 전에 `ChargeService.tryAutoCharge` 발동(충전 lot까지 생성) → 충전 후 차감. 거래 내역에 충전·결제 두 행. ※ 이관 직후 이 동작이 유실됐다가 본 AC 대조 검증에서 발견·복원됨(2026-06-06).
- **AC-W2-4. 환불 측 TransactionType (유지, 지갑 복원은 표준 환불 경로)**: Given facade `refundByWallet` 호출. When 환불 생성. Then `PointTransaction(type=EVENT_PREPAYMENT_REFUND(26), referenceType=EVENT_PREPAYMENT_REFUND)` — 2026-06-06부터 지갑 복원은 `WalletRefundService.refundByTransaction`(원결제 split 보존+lot 복원+통화별 누적 한도) 경유. 환불 정책(티어·수수료) 검증은 F03-13에서.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
