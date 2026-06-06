# F06-02. 포인트 충전 (PG 결제) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-02_point-charge -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-02_point-charge`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 외부 PG(Toss)를 거쳐 자기 지갑에 유료 포인트를 충전한다. 흐름은 (1) `POST /charge`로 PENDING 트랜잭션 + `orderId` 발급 → (2) 클라가 PG WebView로 결제 완료 → (3) `POST /charge/client-confirm`(클라이언트) 또는 `POST /charge/confirm`(PG webhook) 중 한쪽이 PG 승인 검증 후 잔액 반영. (4) 미사용 충전 건은 `POST /charge/cancel`로 PG 취소 가능. 충전 금액 프리셋·자주 쓴 금액은 `GET /charge/presets`로 화면 진입 직전에 받는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인 ▶ "충전하기" CTA
- 결제(F06-06) / 호스팅 티켓 구매(F06-07) / 멤버십 구독(F06-08)에서 잔액 부족(`ApiError.unprocessable` + `PaymentFailureVo`) → "충전" 분기 ▶ `prefillAmount`/`prefillReason`이 채워진 채 진입 (B-01a)
- 거래 상세(F06-03)에서 미사용 충전을 취소한 직후 다시 충전 시작
- 결제수단 화면(F06-04)에서 빈 상태일 때 충전 시도 후 결제수단 미등록 분기 → 결제수단 등록 후 다시 충전 화면 복귀
- 자동충전 설정(F06-05)에서 "지금 한 번 충전" 같은 액션은 없음 → 항상 본 화면을 거친다

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-02_point-charge/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-02_point-charge/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-02_point-charge/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-02_point-charge/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java:25` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:116` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:129` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:79` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:91` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입: `chargePresetsNotifierProvider` ▶ `WalletRepository.getChargePresets()` ▶ `GET /api/v1/wallet/charge/presets`
2. 화면 진입: `paymentMethodListNotifierProvider` ▶ `PaymentMethodRepository.list()` ▶ `GET /api/v1/wallet/payment-methods` (결제수단 셀렉터용)
3. "충전하기" 탭 (Step1): `chargeNotifierProvider.initiateCharge(amount)` ▶ `WalletRepository.charge(ChargeRequest(amount))` ▶ `POST /api/v1/wallet/charge` ▶ 응답 `PointTransaction` (status=PENDING, orderId 포함)
4. PG WebView 성공 (Step3): `chargeNotifierProvider.confirmCharge(paymentKey, orderId, amount)` ▶ `WalletRepository.confirmCharge(ChargeConfirm)` ▶ `POST /api/v1/wallet/charge/client-confirm` ▶ `PointTransaction` (COMPLETED)
5. 성공 후: `ref.invalidate(walletNotifierProvider)`로 지갑 메인 잔액 갱신 트리거 (notifier 내부 또는 화면 pop 후 자동 reload)
6. PG webhook(서버 ↔ Toss)이 client-confirm보다 먼저 도착할 수도 있지만, 서버가 멱등 보장 (트랜잭션 status 확인) → 클라는 항상 `client-confirm` 호출, 응답이 이미 COMPLETED여도 동일 결과 받음
7. 충전 취소(거래 상세에서 진입): `chargeCancelNotifierProvider.cancelCharge(transactionId)` ▶ `POST /api/v1/wallet/charge/cancel` ▶ `PointTransaction` (취소 거래 또는 PENDING→CANCELLED)

## 4. 서버 계약

### 개요

사용자가 외부 PG(Toss)를 거쳐 자기 지갑에 유료 포인트를 충전한다. 흐름은 (1) `POST /charge`로 PENDING 트랜잭션 + `orderId` 발급 → (2) 클라가 PG WebView로 결제 완료 → (3) `POST /charge/client-confirm`(클라이언트) 또는 `POST /charge/confirm`(PG webhook) 중 한쪽이 PG 승인 검증 후 잔액 반영. (4) 미사용 충전 건은 `POST /charge/cancel`로 PG 취소 가능. 충전 금액 프리셋·자주 쓴 금액은 `GET /charge/presets`로 화면 진입 직전에 받는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/wallet/charge/presets | AutoChargeController#getChargePresets | required | 프리셋 4종 + 최근 충전 금액 3개 |
| POST | /api/v1/wallet/charge | WalletController#charge | required | PENDING 트랜잭션 생성, `orderId` 발급 |
| POST | /api/v1/wallet/charge/client-confirm | WalletController#clientConfirmCharge | required | 클라이언트가 PG 성공 콜백 받아 직접 승인 |
| POST | /api/v1/wallet/charge/confirm | WalletController#confirmCharge | webhook (서명) | PG webhook이 직접 호출 (멱등) |
| POST | /api/v1/wallet/charge/cancel | WalletController#cancelCharge | required | 미사용/PENDING 충전의 PG 취소 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `TransactionType`: 본 기능에서 사용 — `CHARGE`(0), `REFUND`(2, 충전 취소 시 referenceType=`CHARGE_CANCEL`), `CHARGE_CANCEL`(15) (이력성 코드)
- **Enum** `PointTransactionStatus` (`payment/constants/PointTransactionStatus.java`): `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED`
- **Enum** `PaymentStatus` (`payment/constants/PaymentStatus.java`): `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`
- **Enum** `FailedRefundStatus` (실패 보상 큐): `PENDING`, … (구현은 `payment/constants/FailedRefundStatus.java`; 본 단위에서는 `PENDING`만 직접 적재)
- 핵심 도메인 객체:
  - `PointTransaction` — userId, walletId, type, amount, paidAmount, freeAmount, balanceBefore/After, status, referenceType, pgTransactionId, orderId
  - `PaymentRecord` — userId, amount, status, pgPaymentKey, pgOrderId, pgTransactionId, pointTransactionId
  - `ChargeLot` (`charge_lots`) — D-02a FIFO 환불 가능 단위. 본 충전 성공 시 신규 생성, 사용/환불 시 lot 단위로 차감/무효화

### 의존 단위 / 외부 시스템

- **외부 PG (🟠 Toss)**: `tossPaymentService.confirmPayment`, `cancelPayment`, `verifyWebhookSignature` — 운영(prod) 환경에서만 실호출, 비운영은 시뮬레이션 키(`SIM_*`)
- 다른 Unit: 본 충전 성공 후 `TransactionType.CHARGE` 행이 생성되어 F06-03 거래 내역에 노출됨. F06-04 결제수단(`PaymentMethod`)은 자동 충전(F06-05) 흐름에서만 사용되며, 일반 단발 충전(`POST /charge`)은 클라가 PG WebView로 직접 결제수단을 선택한다.
- 알림: 결제 실패 시 `NotificationType.CHARGE_FAILED` (FCM/in-app)

## 5. 프론트 계약

### 진입 경로

- 지갑 메인 ▶ "충전하기" CTA
- 결제(F06-06) / 호스팅 티켓 구매(F06-07) / 멤버십 구독(F06-08)에서 잔액 부족(`ApiError.unprocessable` + `PaymentFailureVo`) → "충전" 분기 ▶ `prefillAmount`/`prefillReason`이 채워진 채 진입 (B-01a)
- 거래 상세(F06-03)에서 미사용 충전을 취소한 직후 다시 충전 시작
- 결제수단 화면(F06-04)에서 빈 상태일 때 충전 시도 후 결제수단 미등록 분기 → 결제수단 등록 후 다시 충전 화면 복귀
- 자동충전 설정(F06-05)에서 "지금 한 번 충전" 같은 액션은 없음 → 항상 본 화면을 거친다

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/charge` | `payment/screens/charge_screen.dart` | 포인트 충전 (프리셋/직접입력 + 결제수단 선택 + PG WebView) |

### 화면별 구성 요소 & 액션

### 포인트 충전 (`charge_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `포인트 충전`
  - 상단 prefill 안내 배너 (`prefillReason`이 있을 때만; primary500 8% 배경)
  - "현재 잔액 / N P" Row
  - "자주 쓴 금액" 칩 (서버 `recentAmounts` 또는 `frequentChargeAmountsProvider` 분석 결과)
  - `AmountPresetWidget` — 4개 프리셋 (`charge/presets` 응답 또는 fallback `[5000, 10000, 30000, 50000]`)
  - `AmountInputWidget` — 직접 입력 (천 단위 콤마 자동, `currentBalance` 표기)
  - 충전 후 잔액 미리보기 박스 (#F0F0ED, r=10, p=14): "충전 금액 / 충전 후 잔액"
  - `PaymentMethodSelectorWidget` — 기본 결제수단 또는 사용자가 선택한 결제수단 표기 + "변경" 링크
  - 결제수단 미등록 경고 텍스트 (탭 시 F06-04로 이동)
  - "자동충전 설정 →" 링크 (`AppColors.linkBlue`)
  - PG WebView (`PgPaymentFactory.create(...)`) — `_showPgWebView=true`일 때만 노출
  - 하단 CTA: `${amount}원 충전하기` (`AppButton` fullWidth, primary)
- **사용자가 할 수 있는 액션**:
  - 프리셋 탭 ▶ 직접입력 클리어 + 선택 표시
  - 직접입력 변경 ▶ 프리셋 선택 해제 + 인라인 검증 (1,000~500,000원 UI 가드)
  - 결제수단 셀렉터 탭 ▶ 결제수단 목록 시트 → 선택
  - "충전하기" 탭 ▶ Step1: `chargeNotifier.initiateCharge(amount)` ▶ `POST /api/v1/wallet/charge` ▶ 응답의 `orderId`를 보관 + `_showPgWebView=true`
  - PG WebView가 성공 콜백(`onSuccess(paymentKey)`) ▶ Step3: `chargeNotifier.confirmCharge(paymentKey, orderId, amount)` ▶ `POST /api/v1/wallet/charge/client-confirm` ▶ `ChargeSuccessDialog` 노출 → `context.pop()`로 지갑 메인 복귀
  - PG WebView 실패 콜백 ▶ `ChargeErrorDialog`로 `[코드] 메시지` 표기, WebView 닫기
  - WebView 중 "결제 취소" 버튼 ▶ `_cancelPgFlow()` (서버 transaction은 PENDING으로 남으나, 사용자 의지로 닫기)
  - 시스템 백버튼/`PopScope` ▶ WebView 노출 중에는 pop 차단 + 취소 처리
  - "자동충전 설정 →" 탭 ▶ `/profile/wallet/auto-charge` (F06-05)
- **상태 분기**:
  - `chargeNotifierProvider.isLoading`: CTA 로딩 표시
  - 결제수단 비어있을 때: 경고 텍스트 + CTA 누르면 토스트 "결제 수단을 등록해주세요" + 결제수단 화면 분기
  - PG WebView 표시 중: 하단 CTA `null`로 가려서 중복 호출 차단
- **모달/시트/네비게이션**:
  - `ChargeSuccessDialog.show(...)` — 충전 금액/새 잔액 표시 (성공)
  - `ChargeErrorDialog.show(...)` — 코드+메시지 표시 (실패)
  - 결제수단 선택은 `PaymentMethodSelectorWidget` 내부 시트
  - 성공 시 `context.pop()` 으로 지갑 메인 복귀

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입: `chargePresetsNotifierProvider` ▶ `WalletRepository.getChargePresets()` ▶ `GET /api/v1/wallet/charge/presets`
2. 화면 진입: `paymentMethodListNotifierProvider` ▶ `PaymentMethodRepository.list()` ▶ `GET /api/v1/wallet/payment-methods` (결제수단 셀렉터용)
3. "충전하기" 탭 (Step1): `chargeNotifierProvider.initiateCharge(amount)` ▶ `WalletRepository.charge(ChargeRequest(amount))` ▶ `POST /api/v1/wallet/charge` ▶ 응답 `PointTransaction` (status=PENDING, orderId 포함)
4. PG WebView 성공 (Step3): `chargeNotifierProvider.confirmCharge(paymentKey, orderId, amount)` ▶ `WalletRepository.confirmCharge(ChargeConfirm)` ▶ `POST /api/v1/wallet/charge/client-confirm` ▶ `PointTransaction` (COMPLETED)
5. 성공 후: `ref.invalidate(walletNotifierProvider)`로 지갑 메인 잔액 갱신 트리거 (notifier 내부 또는 화면 pop 후 자동 reload)
6. PG webhook(서버 ↔ Toss)이 client-confirm보다 먼저 도착할 수도 있지만, 서버가 멱등 보장 (트랜잭션 status 확인) → 클라는 항상 `client-confirm` 호출, 응답이 이미 COMPLETED여도 동일 결과 받음
7. 충전 취소(거래 상세에서 진입): `chargeCancelNotifierProvider.cancelCharge(transactionId)` ▶ `POST /api/v1/wallet/charge/cancel` ▶ `PointTransaction` (취소 거래 또는 PENDING→CANCELLED)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **UI 금액 한도**: 1,000원 ~ 500,000원 (서버 가드는 1,000,000원이지만 UI는 500k로 제한)
- 프리셋 fallback (서버 응답 비었을 때): `[5000, 10000, 30000, 50000]`
- 천 단위 콤마 포매팅(`ThousandsSeparatorInputFormatter`)
- 충전 후 잔액 미리보기 박스 색상 토큰: 배경 `#F0F0ED`, r=10, p=14
- "결제 취소" 버튼 위치(WebView 표시 중 우측 상단), 라벨, 동작
- 성공 모달 메시지("N원 충전 완료") / 실패 모달 메시지 포맷
- prefill 배너 디자인 (잔액 부족 자동 진입 시 사용자 인지)
- "자주 쓴 금액" 칩 — 서버 `recentAmounts` 외에 클라가 거래내역을 분석한 `frequentChargeAmountsProvider`도 함께 사용 (B-04 F-04)
- PG WebView vs 시뮬레이션 분기 (`PgPaymentFactory.create`)는 `appConfigProvider`의 환경값에 따라 결정
- 충전 시작 직전 결제수단 미등록 시 `AppToast.show(... ToastType.error)` 사용
- 백 버튼 차단 정책 (`PopScope`로 WebView 동안 pop 차단)

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

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소 (2026-06-06) | ChargeService.java:347-463 (커밋 36fb0a6) | **충전취소 PG 실패 처리(H14)** — `cancelCharge`가 PG 취소 실패 시 예외를 전파해 전체 롤백하도록 정정(과거: 예외 미전파 + FailedRefund 자동 worker 부재로 포인트·카드 이중손실 가능). | 잔여 응답유실 엣지는 PG 게이트 |
| Risk (PG 게이트) | ChargeService.java:347-463 | **응답유실 엣지** — DB-first→PG cancel 순서에서 PG 성공+응답유실 시 DB 롤백 = 지갑 미환불+PG 환불됨 불일치 가능. 실 PG(Toss) 연동 전까지 잠재. release-gate `05_pg.md`에 cancelCharge 응답유실 재검 항목으로 등재(코드 무변경, PG 계약 시 일괄). | PG 계약 시 webhook TODO와 함께 검증 |

## 9. 수용 기준

- **AC-01. 일반 충전 Happy Path (지갑 메인 → 50,000원 충전)**: Given `/profile/wallet`에서 "충전하기" 탭 When 사용자가 해당 흐름을 실행하면 Then `wallets.balance += 50,000`, `point_transactions` 1행(COMPLETED), `payment_records` 1행(COMPLETED), `charge_lots` 1행, accounting_ledger 분개 다수
- **AC-02. 잔액 부족 → 자동 prefill 진입 후 결제 재시도**: Given 호스팅 티켓 화면에서 구매 → `INSUFFICIENT_BALANCE` + `PaymentFailureVo { shortfall: 3000 }` When 사용자가 해당 흐름을 실행하면 Then 충전 1건 + 다음 단계에서 결제 재시도 가능
- **AC-03. PG 결제 실패 (카드 한도/잔액)**: Given 100,000원 충전 시작 When 사용자가 해당 흐름을 실행하면 Then 첫 PENDING은 후속 스케줄러에서 FAILED, 두 번째 충전은 성공 시 정상 완료. 사용자는 잔액 변동 없음 (실패 케이스).
- **AC-04. webhook과 client-confirm 동시 도달 (멱등성)**: Given PG WebView 결제 완료 When 사용자가 해당 흐름을 실행하면 Then 잔액 +100,000 단 한 번만 반영. 이중 적립 없음.
- **AC-05. 미사용 충전 건 취소 (거래 상세 → 충전 취소)**: Given 거래내역에서 해당 CHARGE 거래 탭 → 거래 상세 When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 0. 거래내역에 환불 1행 추가. PG 측 카드 환불은 스케줄러가 큐에서 재시도.
- **AC-06. 부분 사용한 충전을 취소 시도 → 거절**: Given 거래 상세에서 "충전 취소" 시도 When 사용자가 해당 흐름을 실행하면 Then DB 변경 없음. 사용자는 부분 사용한 충전은 취소할 수 없음을 인지.
- **AC-07. PENDING 충전이 webhook도 client-confirm도 받지 못함**: Given PENDING transaction만 존재 When 사용자가 해당 흐름을 실행하면 Then 잔액 영향 없음. PG 측에서도 미승인 → 결제수단 청구 없음.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
