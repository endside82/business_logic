# F06-06. 포인트 결제·환불 PRD

## 2026년 10월 현재 결제·취소 계약

2026-10-03 옛 `POST /api/v1/wallet/pay`와 `POST /api/v1/wallet/refund`를 서버·앱에서 제거했다.
현재 참가비 지갑 결제는 본문 없는 `POST /api/v1/events/{eventId}/prepayment/wallet`이며 `201 EventPaymentVo`를 반환한다.
본인 신청 취소는 본문 없는 `DELETE /api/v1/events/{eventId}/apply`이며 `200 ApplicationVo`를 반환하고 결제 정리를 연결한다.
은행분은 즉시 지갑 반환이 아니라 주최자의 계좌이체 반환 대기로 이어진다. 신규 포인트 결제의 첫 출시 제한은 유지한다.

이 절 뒤의 PaymentParam·WalletRepository.pay/refund와 옛 주소 상세는 이관 전 이력이며 현행 계약이 아니다.

현재 서버 위치는 [확인한 서버 코드 위치](#2-코드-위치), 이용 규칙은
[참가비 결제와 환불의 현재 진입](../../../docs/features/F06-06.html#current-payment-entry)을 따른다.

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

> 문서 상태: **실사 기반 전환본 + W2/W3 신규 결제 경로 통합 (2026-05-22)**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-06_point-pay-refund`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 §2 코드 위치의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-05-22 W2/W3 추가: 기존 `WalletService.pay`(referenceType=`EVENT_PAYMENT`)에 더해 신규 결제 경로 `WalletService.payForApplication`(referenceType=`EVENT_PREPAYMENT`)이 도입되었다. 기존 경로는 변경 없이 유지하고(D8), 신규 경로만 본 PRD §4.2 W2에 명세한다. 환불 측 신규 `TransactionType.EVENT_PREPAYMENT_REFUND(26)`도 함께 추가. 신규 환불 흐름의 facade는 F03-13에서 다루고 본 PRD에서는 분개·중복차단·자동충전 호환성만 다룬다.
>
> ⛔ **2026-06-06 EVENT spend 이관**: 위 두 직접 결제 경로(`pay`/`payForApplication`)는 **진입 즉시 차단**으로 전환됐다(D8 폐기). 현행 이벤트 결제는 **선입금 facade 단일 경로**(표준 차감 진입점 spend 경유 — 유료/무료 split 기록·충전 단위 추적·부족 시 롤백)이며, 환불 지갑 복원도 표준 환불 경로(split 보존+충전 단위 복원+통화별 누적 한도)로 수렴됐다. **본문 §1·§3의 `POST /api/v1/wallet/pay` 직접 결제 서술은 이관 전 이력으로 읽을 것** — 현행 계약은 §9 AC-W2-1~4 참조. 과거 E2E 라운드 기록(P70 매트릭스의 pay 직접호출 모드)은 재실행 불가.

>
> ⛔ **2026-08-18 P0 출시 태세(P0-PAID-01)**: 첫 유료 출시의 수단은 **호스트 계좌 직접 수납(계좌이체)** 하나로 결정됐다. 포인트(지갑) 결제는 실 PG 출시 전까지 **닫혀 있다** — 지갑 차감 창구가 `money.live` 판정으로 거부하고, 같은 술어가 **모임 생성 단계**에도 걸려 포인트 정책 모임은 애초에 만들어지지 않는다(F03-03·F03-13·F17-07 참조). 즉 아래 §1~§9의 포인트 결제 서술은 **설계 정본이자 현재 비활성**으로 읽는다. 별도 스위치는 없으며 실 PG가 열리는 순간 자동 재출시된다. ⛔ 환불·회수·역분개·정산 보정은 게이트가 닫혀 있어도 통과한다(막으면 돌려줄 돈이 묶인다).

## 1. 결론

이벤트 참여비 등을 보유 포인트(유료 우선 차감)로 즉시 결제하고, 환불 정책에 따라 결제를 취소·환불받는다. 결제는 중복 차단(`existsByUserIdAndReferenceTypeAndReferenceId`) + 서버 가격 검증(클라 amount vs `event.price`) 후 잔액 차감 → `point_transactions(type=PAY)` + `payment_records(COMPLETED)` + FIFO `charge_lots` 차감 + 회계 분개. 환불은 `payment/refundpolicy/service/RefundPolicyService`가 `event_refund_policy` 카탈로그(by_time 다단계 비율)로 산출 후 진행 — 과거 하드코딩된 24h=100%/12h=50%/0% 표현은 레거시 `GET /api/v1/wallet/refund/policy` 안내 응답에만 남아 있고, 실제 환불 계산은 D-1 커밋 이후 카탈로그 기반으로 전환 완료. 결제 흐름에서 잔액 부족 시 자동 충전(F06-05) 트리거. 본 단위에 포함된 추가 엔드포인트로 `GET /api/v1/wallet/refund/policy`(하위 호환 안내, 레거시 고정값)와 신규 `GET /api/v1/refund-policy-templates`(카탈로그 6종 목록).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

본 기능은 자체 화면이 없다. 결제·환불 호출은 다른 도메인 화면에서 일어나고, 본 단위 화면은 **거래 상세(F06-03 SCR-PM-004)** + **환불 정책 안내 모달**만을 다룬다.

- 결제 호출 진입점:
  - 이벤트 상세(Unit 03) ▶ "참여하기" CTA → 결제 확인 모달 → `POST /api/v1/wallet/pay`
  - 유료 승인제 이벤트(Unit 03) ▶ 호스트 승인 알림/상세 CTA "결제하고 참석 확정" → `POST /api/v1/wallet/pay`
  - 호스팅 티켓(F06-07) ▶ 구매 다이얼로그 → 내부적으로 `walletSpendService.spend(HOSTING_TICKET_PURCHASE, ...)` 호출(별도 엔드포인트 `/hosting-tickets/purchase`)
  - 개인 구독(F06-08) ▶ 구독 시작 → 내부 `walletSpendService.spend(SUBSCRIPTION, ...)`
- 환불 호출 진입점:
  - 이벤트 상세/내 신청 화면 ▶ "참여 취소" → 환불 정책 안내 → 모임 참여 취소 명령이 결제 건 환불을 함께 처리한다. 지갑에 따로 환불을 요청하는 창구는 없다.
- 환불 정책 안내(`GET /refund/policy`) 모달:
  - 결제 직전 "환불 규정 보기" 링크

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventPrepaymentController`, `EventController`, `WalletController`, `RefundPolicyController`, `RefundPolicyService`, `RefundFaultCategory`, `EventPaymentRefundService`, `EventRefundSettlementService`, `AccountCode`, `WalletService`. 앱: `transaction_detail_screen.dart`.

<!-- source-references:start -->
서버 창구: `EventPrepaymentController#payByWallet`, `EventController#cancelApplication`, `WalletController#getRefundPolicy`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
- 2026-10-03 옛 지갑 결제·환불 API 삭제 뒤의 현행 경로다. 지갑 신규 결제 제한은 유지하며 계좌이체 취소는 주최자 반환 대기로 구분한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 결제: 도메인별 화면 ▶ `WalletRepository.pay(PaymentParam)` ▶ `POST /api/v1/wallet/pay`
2. 환불: `WalletRepository.refund(RefundParam)` ▶ `POST /api/v1/wallet/refund`
3. 정책 조회: `refundPolicyNotifierProvider` ▶ `WalletRepository.getRefundPolicy()` ▶ `GET /api/v1/wallet/refund/policy` (레거시 안내용). 신규 카탈로그 조회는 `GET /api/v1/refund-policy-templates`
4. 결제/환불 후 `walletNotifierProvider`, `transactionListNotifierProvider` invalidate로 잔액·내역 갱신
5. 잔액 부족 응답 처리: `ApiError`에 `PaymentFailureVo` payload가 들어오면 충전 화면 prefill 라우팅
6. 유료 승인제 결제 후에는 `eventDetailNotifierProvider`, `applicationListNotifierProvider`, `walletNotifierProvider`, `transactionListNotifierProvider`를 모두 invalidate해 신청 상태/참석 상태/잔액/거래 내역을 동기화

## 4. 제품 규칙

### 4.1 환불 귀책과 계산

| 귀책 | 환불율 | 고정 수수료 | 개설권 |
|---|---|---|---|
| HOST_FAULT, FORCE_MAJEURE, MUTUAL, RESCHEDULE_DECLINED | 100% | 정책 값과 상관없이 0 | 되돌림 |
| PARTICIPANT_FAULT | 시간 구간 비율 | 정책 값, 유료분 안에서만 | 유지 |
| NO_SHOW | 0%, 거절 | 없음 | 유지 |
| NO_SHOW_POST_ADJUSTMENT | 호스트가 정함 | 0 | 선택 |

- 참가자 귀책 계산: 환불 전액 = 내림(결제액 x 비율), 유료분 = 내림(환불 전액 x 유료 결제액 / 결제액), 무료분 = 환불 전액 - 유료분, 실환불 유료분 = 유료분 - 고정 수수료(유료분을 넘지 못한다). 유료와 무료를 따로 내림하지 않아 1원이 새지 않는다.
- 다음은 환불 거절이다: 정책이 NON_REFUNDABLE, 맞는 시간 구간이 없거나 0%, 수수료를 뺀 환불액이 0 이하, 결제액이 0.
- 환불 정책은 STANDARD, STRICT, FLEXIBLE, FULL, NON_REFUNDABLE, CUSTOM 여섯이고 모임별로 정한다(F03-13).
- 같은 결제는 두 번 환불되지 않는다. 동시에 들어와도 잠근 뒤 판정한다.
- 호스트 정산 쪽 처리: 정산 전이면 음수 조정, 이미 지급했으면 호스트 몫 회수와 수수료·세금 되돌림이다. 지급 증거가 어긋나면 환불은 그대로 진행하고 정산은 건드리지 않은 채 운영 경고를 낸다. 돌려줄 돈을 묶지 않기 위해서다.

### 4.2 선입금 결제 경로

- 참가비 지갑 결제는 모임이 OPEN 이고 신청이 APPROVED_PENDING_PAYMENT 일 때만 된다. 승인제 유료 모임은 승인 전에 결제 버튼을 보이지 않는다.
- 결제는 신청당 활성 1건이고 거래는 EVENT_PREPAYMENT 와 결제 건 번호로 묶는다. 건 단위로 묶기 때문에 환불 뒤 같은 모임에 다시 신청해도 중복으로 막히지 않는다. 같은 건을 다시 부르면 DUPLICATE_PAYMENT 이고 잔액은 변하지 않는다.
- 잔액이 부족하면 자동 충전(F06-05)을 먼저 시도하고, 안 되면 INSUFFICIENT_BALANCE 와 부족액을 돌려줘 앱이 충전 화면을 미리 채운다.
- 유료를 먼저 쓴다. 충전 단위 추적이 잔액과 어긋나면 결제 전체를 되돌린다.
- 성공하면 결제 건이 PAID 가 되고 참석이 확정된다. 알림은 트랜잭션이 끝난 뒤 나간다.
- 환불 거래는 EVENT_PREPAYMENT_REFUND 이고 같은 결제 건 번호를 쓴다. 지갑 복원은 표준 환불 경로로 간다(4.3).

### 4.2.5 회계 분개

| 일 | 분개 | 비고 |
|---|---|---|
| 지갑 선입금 결제 성공 | 결제 분개(recordPayment) 1건 | 새 계정 없음 |
| 지갑 선입금 환불(본인 취소, 호스트 취소) | 환불 분개 | PG 대기 없음. 유료 환불 전액이 지갑으로 바로 돌아간다 |
| 계좌이체 결제·반환 | 분개 없음 | 호스트 직접 수취. 정산 보고서 별도 절에만 나온다(F06-10 5.1) |

### 4.3 유료/무료 분리

- 참가비의 무료 결제분은 호스트에게 무료 포인트로 전달되어 현금이 되지 않는다. 무료 매출만 있는 모임도 수수료·세금 0 으로 정산이 만들어진다.
- 환불은 원결제의 유료·무료를 그대로 복원하고 충전 단위도 되살린다. 유료와 무료 각각 누적 환불 한도를 넘지 못한다. 무료가 환불을 거쳐 유료가 되는 길은 없다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 이벤트 참여비 결제 (Happy Path) | 이벤트 상세 화면, 잔액 충분 | 잔액 42,000P, 거래 내역 1행 추가, 호스트는 정산 대상으로 `Settlement.grossAmount`에 누적될 예정. |
| S2 | 잔액 부족 + 자동 충전 ON → 자동 충전 후 결제 성공 | 잔액 4,500P, 8,000원 결제, 자동충전 활성(임계 5,000 / 충전 30,000) | 사용자가 충전 화면을 거치지 않고 결제 성공. 거래 내역에 `자동 충전 +30,000P` + `결제 -8,000P` 두 행. |
| S3 | 잔액 부족 + 자동 충전 OFF → 충전 화면 prefill 분기 | 잔액 4,500P, 8,000원 결제, 자동 충전 OFF | 충전 1건 + 결제 1건. 사용자 명시적 결정으로 진행. |
| S4 | 24시간 전 환불 (전액) | 결제 거래 1건 존재 | 사용자 잔액 즉시 복구. 유료·무료 환불분 모두 지갑으로 바로 돌아가고, 카드로 되돌리는 대기열은 없다. |
| S5 | 12시간 전 환불 (50%) | 모임 시작 18시간 전 취소 | 부분 환불 완료. 거래 내역에 환불 1건 + 잔액 부분 복구. |
| S6 | 12시간 미만 환불 시도 → 거절 | 모임 1시간 전 취소 | 잔액 변동 없음. 사용자가 모임 참여 또는 노쇼 결정. |
| S7 | 이중 결제 시도 (이미 결제한 이벤트 재결제) | 결제 직후 푸시 지연으로 다시 탭한 사용자 | 이중 차감 없음. 사용자 화면이 정확한 상태로 정렬. |
| S8 | 가격 조작 시도 (클라 amount=1) | 비정상 클라이언트가 8,000원 이벤트를 1원으로 결제 시도 | 지갑 결제 창구는 금액을 받지 않는다. 서버가 정한 금액으로만 결제되고 보낸 금액은 쓰이지 않는다. |
| S9 | 충전 취소의 결과를 모름 → 조회로 해소 | 사용자가 충전을 취소했는데 결제사 응답을 잃음 | 결제 건마다 결과 모름 사건 한 행이 남고, 결과가 확정될 때까지 결제사에 다시 묻는다. 같은 지갑의 둘째 충전 취소는 앞 취소가 닫힐 때까지 거절한다. 모임 참가비 환불은 지갑으로 바로 돌아가므로 이 흐름과 상관없다. |
| S10 | 유료 승인제(선입금) 이벤트 — 승인 후 결제 확정 | `EventPrepayment.prepaymentRequired=true`, `Application=APPROVED_PENDING_PAYMENT` 또는 동등한 결제 대기 상태, `paymentDueAt` 미만료, 사용자는 아직 `EventAttendance=ATTENDING` 아님. | alice 잔액 12,200P, totalSpent 37,800P, point_transaction 신규 행 1건 (`type=PAY`, referenceType=`EVENT_PREPAYMENT`, referenceId=`eventPaymentId`). payment_record 신규 행 1건. **mutation 발생** — 매트릭스 재실행 전 sample_data.sql 재초기화 필요(재실행 시 중복 가드 `existsByUserIdAndReferenceTypeAndReferenceId(userId, "EVENT_PREPAYMENT", eventPaymentId)`로 DUPLICATE_PAYMENT 409). |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 충전 취소 | **충전 취소 응답 유실** — 응답을 잃으면 결제 건마다 결과 모름 사건 한 행을 남기고 결과가 확정될 때까지 결제사에 다시 묻는다(연속 실패는 경보만 내고 계속 묻는다). 같은 지갑의 둘째 취소는 앞 취소가 닫힐 때까지 거절한다. | 실제 결제사 연동 때 실거래로 한 번 확인 |
| Risk | WalletController.java:190 | `GET /api/v1/wallet/refund/policy`는 24h=100%/12h=50%/0% 하드코딩 값을 반환. 실제 환불 계산과 무관하지만 클라이언트가 이 값을 정책 기준으로 표시하면 실제 카탈로그와 불일치. Deprecation 계획 미결정. | 신규 환불 UI는 `GET /api/v1/refund-policy-templates` 카탈로그 응답 기반으로 전환 검토 |
| 해소됨 | 유료 승인제 결제 | 승인 뒤 결제 대기(`APPROVED_PENDING_PAYMENT`) 상태가 생겼고 결제는 선입금 경로로만 한다 | 없음 |
| 해소됨 | 환불 PG 상태 | 카드 환불 대기열과 그 상태 열거를 걷었다. 환불은 지갑으로 바로 돌아간다 | 없음 |
| 후보 | backend.md:129 | - **F03-05/F03-06 유료 승인제**: 승인 후 결제 대기 상태에서만 결제를 허용해야 한다. 현재 서버에는 이 상태가 없어 보강 필요. | 2026-06-06 확정: 인용 속 `WalletService.pay` 직접 결제 경로는 EVENT spend 이관으로 **차단됨** — 과거 E2E 라운드 기록으로는 유효하나, P70 매트릭스의 pay 직접호출 모드는 재실행 불가(매트릭스 재설계 필요). 현행 결제는 선입금 facade 경유 |
| 해소됨 | 거래 상세 PG 진행 카드 | 카드 환불 대기열이 없어 보일 진행 상태가 없다 | 없음 |
| 해소됨 | 유료 승인제 구현 갭 | 가리키던 갭(승인 뒤 결제 대기 상태 없음)은 위 행처럼 닫혔다 | 없음 |
| 후보 | scenarios.md:143 | - 결제 실패 시 `EventAttendance`가 생성되면 실패로 본다. | 2026-06-06 확정: 인용 속 `WalletService.pay` 직접 결제 경로는 EVENT spend 이관으로 **차단됨** — 과거 E2E 라운드 기록으로는 유효하나, P70 매트릭스의 pay 직접호출 모드는 재실행 불가(매트릭스 재설계 필요). 현행 결제는 선입금 facade 경유 |
| 해소됨 | 옛 지갑 환불 창구의 시드 시나리오 | 지갑 환불 창구(`POST /api/v1/wallet/refund`)가 없어지고 환불은 참여 취소 명령이 한다 | 없음 |
| 해소됨 | 잠든 환불 요청 작업기 | 그 작업기를 걷었다. 도달할 수 없는 경로가 남지 않았다 | 없음 |
| 해소됨 | 비동기 환불·PG 재시도 시험 | 비동기 환불과 PG 환불 재시도를 걷어 시험할 경로가 없다 | 없음 |

## 9. 수용 기준

- **AC-01. 이벤트 참여비 결제 (Happy Path)**: Given 이벤트 상세 화면, 잔액 충분 When 사용자가 해당 흐름을 실행하면 Then 잔액 42,000P, 거래 내역 1행 추가, 호스트는 정산 대상으로 `Settlement.grossAmount`에 누적될 예정.
- **AC-02. 잔액 부족 + 자동 충전 ON → 자동 충전 후 결제 성공**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 충전 화면을 거치지 않고 결제 성공. 거래 내역에 `자동 충전 +30,000P` + `결제 -8,000P` 두 행.
- **AC-03. 잔액 부족 + 자동 충전 OFF → 충전 화면 prefill 분기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 충전 1건 + 결제 1건. 사용자 명시적 결정으로 진행.
- **AC-04. 24시간 전 환불 (전액)**: Given 결제 거래 1건 존재 When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 즉시 복구. 유료·무료 환불분 모두 지갑으로 바로 돌아간다.
- **AC-05. 12시간 전 환불 (50%)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 부분 환불 완료. 거래 내역에 환불 1건 + 잔액 부분 복구.
- **AC-06. 12시간 미만 환불 시도 → 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 잔액 변동 없음. 사용자가 모임 참여 또는 노쇼 결정.
- **AC-07. 이중 결제 시도 (이미 결제한 이벤트 재결제)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이중 차감 없음. 사용자 화면이 정확한 상태로 정렬.
- **AC-08. 가격 조작 시도 (클라 amount=1)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가격 조작 차단. 이벤트는 결제되지 않음.
- **AC-09. 충전 취소의 결과를 모름**: Given 충전 취소 중 결제사 응답을 잃음 When 사용자가 같은 지갑의 다른 충전을 취소하면 Then 앞 취소가 닫힐 때까지 거절되고, 결과 모름 사건은 결과가 확정될 때까지 결제사 조회로 해소된다.
- **AC-10. 유료 승인제(선입금) 이벤트 — 승인 후 결제 확정**: Given `EventPrepayment.prepaymentRequired=true`, `Application=APPROVED_PENDING_PAYMENT` 또는 동등한 결제 대기 상태, `paymentDueAt` 미만료, 사용자는 아직 `EventAttendance=ATTENDING` 아님. When 사용자가 해당 흐름을 실행하면 Then alice 잔액 12,200P, totalSpent 37,800P, point_transaction 신규 행 1건 (`type=PAY`, referenceType=`EVENT_PREPAYMENT`, referenceId=`eventPaymentId`). payment_record 신규 행 1건. **mutation 발생** — 매트릭스 재실행 전 sample_data.sql 재초기화 필요(재실행 시 중복 가드로 DUPLICATE_PAYMENT 409). (선입금 경로 검증 세부는 AC-W2-1 참조)
- **AC-W2-1 (S2-1). 결제 경로 happy path (2026-06-06 spend 이관 갱신)**: Given `EventPrepayment.prepaymentRequired=true`, `Application=APPROVED_PENDING_PAYMENT`, 잔액 충분. When facade(`EventPrepaymentService.payByWallet`)가 표준 차감 진입점 `WalletSpendService.spend(EVENT_PREPAYMENT, PAID_FIRST)` 호출(구 `WalletService.payForApplication`은 진입 즉시 차단됨 — deprecate+throw). Then `PointTransaction(type=PAY, referenceType=EVENT_PREPAYMENT, referenceId=eventPaymentId, paid/free split 기록)` 신규 1건 + charge lot 소비(`point_transaction_id` 키, 부족 시 전체 롤백) + `PaymentRecord` 신규 1건 + `AccountingLedger.recordPayment` 분개 1건. 잔액 = before - amount.
- **AC-W2-2. 중복 차단 (유지)**: Given 동일 `eventPaymentId`로 이미 PAY 트랜잭션 존재. When `payByWallet` 재호출. Then 즉시 `DUPLICATE_PAYMENT` 409 (wrapper 멱등 가드 — spend 미호출). wallet 변동 없음.
- **AC-W2-3. 자동충전 호환성 (유지 — 2026-06-06 이관 시 wrapper 레벨로 이동)**: Given 잔액 부족 + 자동충전 활성. When `payByWallet` 호출. Then spend 전에 `ChargeService.tryAutoCharge` 발동(충전 lot까지 생성) → 충전 후 차감. 거래 내역에 충전·결제 두 행. ※ 이관 직후 이 동작이 유실됐다가 본 AC 대조 검증에서 발견·복원됨(2026-06-06).
- **AC-W2-4. 환불 측 TransactionType (유지, 지갑 복원은 표준 환불 경로)**: Given facade `refundByWallet` 호출. When 환불 생성. Then `PointTransaction(type=EVENT_PREPAYMENT_REFUND(26), referenceType=EVENT_PREPAYMENT_REFUND)` — 2026-06-06부터 지갑 복원은 `WalletRefundService.refundByTransaction`(원결제 split 보존+lot 복원+통화별 누적 한도) 경유. 환불 정책(티어·수수료) 검증은 F03-13에서.
