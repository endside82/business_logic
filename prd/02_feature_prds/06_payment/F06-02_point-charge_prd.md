# F06-02. 포인트 충전 (PG 결제) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 외부 PG(Toss)를 거쳐 자기 지갑에 유료 포인트를 충전한다. 흐름은 (1) `POST /charge`로 PENDING 트랜잭션 + `orderId` 발급 → (2) 클라가 PG WebView로 결제 완료 → (3) `POST /charge/client-confirm`(클라이언트) 또는 `POST /charge/confirm`(PG webhook) 중 한쪽이 PG 승인 검증 후 잔액 반영. (4) 미사용 충전 건은 `POST /charge/cancel`로 PG 취소 가능. 충전 금액 프리셋·자주 쓴 금액은 `GET /charge/presets`로 화면 진입 직전에 받는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인 ▶ "충전하기" CTA
- 결제(F06-06) / 호스팅 티켓 구매(F06-07) / 멤버십 구독(F06-08)에서 잔액 부족(`ApiError.unprocessable` + `PaymentFailureVo`) → "충전" 분기 ▶ `prefillAmount`/`prefillReason`이 채워진 채 진입 (B-01a)
- 거래 상세(F06-03)에서 미사용 충전을 취소한 직후 다시 충전 시작
- 결제수단 화면(F06-04)에서 빈 상태일 때 충전 시도 후 결제수단 미등록 분기 → 결제수단 등록 후 다시 충전 화면 복귀
- 자동충전 설정(F06-05)에서 "지금 한 번 충전" 같은 액션은 없음 → 항상 본 화면을 거친다

## 2. 코드 위치

계약의 정본은 코드다. 서버: `AutoChargeController`, `WalletController`, `PointTransactionStatus`, `PaymentStatus`, `FailedRefundStatus`. 앱: `charge_screen.dart`.

<!-- source-references:start -->
서버 창구: `AutoChargeController#getChargePresets`, `WalletController#charge`, `WalletController#clientConfirmCharge`, `WalletController#confirmCharge`, `WalletController#cancelCharge`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입: `chargePresetsNotifierProvider` ▶ `WalletRepository.getChargePresets()` ▶ `GET /api/v1/wallet/charge/presets`
2. 화면 진입: `paymentMethodListNotifierProvider` ▶ `PaymentMethodRepository.list()` ▶ `GET /api/v1/wallet/payment-methods` (결제수단 셀렉터용)
3. "충전하기" 탭 (Step1): `chargeNotifierProvider.initiateCharge(amount)` ▶ `WalletRepository.charge(ChargeRequest(amount))` ▶ `POST /api/v1/wallet/charge` ▶ 응답 `PointTransaction` (status=PENDING, orderId 포함)
4. PG WebView 성공 (Step3): `chargeNotifierProvider.confirmCharge(paymentKey, orderId, amount)` ▶ `WalletRepository.confirmCharge(ChargeConfirm)` ▶ `POST /api/v1/wallet/charge/client-confirm` ▶ `PointTransaction` (COMPLETED)
5. 성공 후: `ref.invalidate(walletNotifierProvider)`로 지갑 메인 잔액 갱신 트리거 (notifier 내부 또는 화면 pop 후 자동 reload)
6. PG webhook(서버 ↔ Toss)이 client-confirm보다 먼저 도착할 수도 있지만, 서버가 멱등 보장 (트랜잭션 status 확인) → 클라는 항상 `client-confirm` 호출, 응답이 이미 COMPLETED여도 동일 결과 받음
7. 충전 취소(거래 상세에서 진입): `chargeCancelNotifierProvider.cancelCharge(transactionId)` ▶ `POST /api/v1/wallet/charge/cancel` ▶ `PointTransaction` (취소 거래 또는 PENDING→CANCELLED)

## 4. 제품 규칙

- 충전 금액은 앱에서 1,000원 이상 500,000원 이하, 서버에서 1,000원 이상 1,000,000원 이하다. 충전 뒤 잔액이 50,000,000원을 넘으면 서버가 거절한다.
- 금액 제안은 서버가 주는 프리셋 10,000, 30,000, 50,000, 100,000원과 최근 충전 금액 3개다. 프리셋이 비어 오면 앱은 5,000, 10,000, 30,000, 50,000원을 쓴다.
- 프리셋을 고르면 직접 입력이 지워지고, 직접 입력하면 프리셋 선택이 풀린다.
- 잔액 부족으로 들어오면 부족 금액을 채운 채 그 까닭을 배너로 보여 준다.
- 결제 창이 열린 동안에는 뒤로 가기를 막고 취소로 처리한다. 창을 닫으면 서버 거래는 PENDING 으로 남고 잔액은 변하지 않는다.
- 결제 창 실패는 코드와 메시지를 대화상자로 보여 주고, 성공은 충전 금액과 새 잔액을 보여 준 뒤 지갑으로 돌아간다.
- 결제수단이 없으면 "결제 수단을 등록해주세요" 안내 뒤 결제수단 화면으로 보낸다.
- 충전 취소 때 PG 취소가 실패하면 전체를 되돌린다. 포인트와 카드 금액을 함께 잃는 일을 막기 위해서다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 일반 충전 Happy Path (지갑 메인 → 50,000원 충전) | `/profile/wallet`에서 "충전하기" 탭 | `wallets.balance += 50,000`, `point_transactions` 1행(COMPLETED), `payment_records` 1행(COMPLETED), `charge_lots` 1행, accounting_ledger 분개 다수 |
| S2 | 잔액 부족 → 자동 prefill 진입 후 결제 재시도 | 호스팅 티켓 화면에서 구매 → `INSUFFICIENT_BALANCE` + `PaymentFailureVo { shortfall: 3000 }` | 충전 1건 + 다음 단계에서 결제 재시도 가능 |
| S3 | PG 결제 실패 (카드 한도/잔액) | 100,000원 충전 시작 | 첫 PENDING은 후속 스케줄러에서 FAILED, 두 번째 충전은 성공 시 정상 완료. 사용자는 잔액 변동 없음 (실패 케이스). |
| S4 | webhook과 client-confirm 동시 도달 (멱등성) | PG WebView 결제 완료 | 잔액 +100,000 단 한 번만 반영. 이중 적립 없음. |
| S5 | 미사용 충전 건 취소 (거래 상세 → 충전 취소) | 거래내역에서 해당 CHARGE 거래 탭 → 거래 상세 | 사용자 잔액 0. 거래내역에 환불 1행 추가. PG 측 카드 환불은 스케줄러가 큐에서 재시도. |
| S6 | 부분 사용한 충전을 취소 시도 → 거절 | 거래 상세에서 "충전 취소" 시도 | DB 변경 없음. 사용자는 부분 사용한 충전은 취소할 수 없음을 인지. |
| S7 | PENDING 충전이 webhook도 client-confirm도 받지 못함 | PENDING transaction만 존재 | 잔액 영향 없음. PG 측에서도 미승인 → 결제수단 청구 없음. |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Risk (PG 게이트) | ChargeService.java:347-463 | **응답유실 엣지** — DB-first→PG cancel 순서에서 PG 성공+응답유실 시 DB 롤백 = 지갑 미환불+PG 환불됨 불일치 가능. 실 PG(Toss) 연동 전까지 잠재. release-gate `05_pg.md`에 cancelCharge 응답유실 재검 항목으로 등재(코드 무변경, PG 계약 시 일괄). | PG 계약 시 webhook TODO와 함께 검증 |

## 9. 수용 기준

- **AC-01. 일반 충전 Happy Path (지갑 메인 → 50,000원 충전)**: Given `/profile/wallet`에서 "충전하기" 탭 When 사용자가 해당 흐름을 실행하면 Then `wallets.balance += 50,000`, `point_transactions` 1행(COMPLETED), `payment_records` 1행(COMPLETED), `charge_lots` 1행, accounting_ledger 분개 다수
- **AC-02. 잔액 부족 → 자동 prefill 진입 후 결제 재시도**: Given 호스팅 티켓 화면에서 구매 → `INSUFFICIENT_BALANCE` + `PaymentFailureVo { shortfall: 3000 }` When 사용자가 해당 흐름을 실행하면 Then 충전 1건 + 다음 단계에서 결제 재시도 가능
- **AC-03. PG 결제 실패 (카드 한도/잔액)**: Given 100,000원 충전 시작 When 사용자가 해당 흐름을 실행하면 Then 첫 PENDING은 후속 스케줄러에서 FAILED, 두 번째 충전은 성공 시 정상 완료. 사용자는 잔액 변동 없음 (실패 케이스).
- **AC-04. webhook과 client-confirm 동시 도달 (멱등성)**: Given PG WebView 결제 완료 When 사용자가 해당 흐름을 실행하면 Then 잔액 +100,000 단 한 번만 반영. 이중 적립 없음.
- **AC-05. 미사용 충전 건 취소 (거래 상세 → 충전 취소)**: Given 거래내역에서 해당 CHARGE 거래 탭 → 거래 상세 When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 0. 거래내역에 환불 1행 추가. PG 측 카드 환불은 스케줄러가 큐에서 재시도.
- **AC-06. 부분 사용한 충전을 취소 시도 → 거절**: Given 거래 상세에서 "충전 취소" 시도 When 사용자가 해당 흐름을 실행하면 Then DB 변경 없음. 사용자는 부분 사용한 충전은 취소할 수 없음을 인지.
- **AC-07. PENDING 충전이 webhook도 client-confirm도 받지 못함**: Given PENDING transaction만 존재 When 사용자가 해당 흐름을 실행하면 Then 잔액 영향 없음. PG 측에서도 미승인 → 결제수단 청구 없음.
