# F08-11. 아이템·번들·플랜 구매 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-11_purchase -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-11_purchase`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

포인트(지갑)로 마켓 아이템 단건 / 번들 묶음 / 플랜 단건을 구매하는 3개 엔드포인트. 결제 자체는 Unit 06 결제·지갑(`WalletService`)으로 위임하고, 본 단위는 결제 결과를 받아 보유함(`Collection`) / 플랜 구매 기록(`PlanPurchase`) / 크리에이터 수익(`CreatorEarning`) 적재까지 책임진다. 한 트랜잭션 내에서 잔액 차감 + 보유함 적재 + 수익 분배가 일어난다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **아이템 단건 구매**: F08-10 마켓 아이템 상세 화면 하단 "구매하기" 버튼
- **번들 구매**: F08-10 화면 번들 카드 내 "이 번들로 구매하기" 버튼
- **플랜 직접 구매**: 플랜 상세/미리보기 화면(F08-02 또는 마켓 미리보기) 의 "구매하기" 버튼 (`plan_preview_screen.dart` / `market_plan_detail_screen.dart`)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-11_purchase/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-11_purchase/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-11_purchase/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-11_purchase/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/MarketPurchaseController.java:23` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketPurchaseController.java:31` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:119` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 아이템 구매
1. 사용자 "구매하기" 탭 → `setState(_isPurchasing = true)`
2. `marketPurchaseNotifierProvider.notifier.purchaseItem(itemId)` ▶ `MarketRepository.purchaseItem(itemId)` ▶ `POST /api/v1/market/items/{itemId}/purchase`
3. 성공 응답 (`MarketPurchaseVo`): `purchaseId`, `purchaseType="ITEM"`, `paidAmount`, `collections=[CollectionVo]`
4. `AppDialog.alert` 표시 → 확인 → `context.push('/market/collection')`
5. 실패: `_handlePurchaseError(e)` 호출

### 번들 구매
1. 동일 패턴 — `purchaseBundle(bundleId)` ▶ `POST /api/v1/market/bundles/{bundleId}/purchase`
2. 응답 `MarketPurchaseVo` (`purchaseType="BUNDLE"`, `collections=[N개]`)

### 플랜 직접 구매
1. `planPurchaseNotifierProvider.notifier.purchasePlan(planId)` ▶ `PlanRepository.purchasePlan` ▶ `POST /api/v1/plans/{planId}/purchase`
2. 성공 시 plan 관련 Provider invalidate → 본인 플랜 화면이 새로고침되며 "구매한 플랜" 탭에 표시

## 4. 서버 계약

### 개요

포인트(지갑)로 마켓 아이템 단건 / 번들 묶음 / 플랜 단건을 구매하는 3개 엔드포인트. 결제 자체는 Unit 06 결제·지갑(`WalletService`)으로 위임하고, 본 단위는 결제 결과를 받아 보유함(`Collection`) / 플랜 구매 기록(`PlanPurchase`) / 크리에이터 수익(`CreatorEarning`) 적재까지 책임진다. 한 트랜잭션 내에서 잔액 차감 + 보유함 적재 + 수익 분배가 일어난다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/market/items/{itemId}/purchase | MarketPurchaseController#purchaseItem | required | 아이템 단건 구매 |
| POST | /api/v1/market/bundles/{bundleId}/purchase | MarketPurchaseController#purchaseBundle | required | 번들 일괄 구매 |
| POST | /api/v1/plans/{planId}/purchase | PlanController#purchasePlan | required | 플랜 직접 구매 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `TransactionType` (Unit 06): 결제 시 `PAY` 사용 (서버 enum 전체 정의는 Unit 06 참조)
- **Enum** `EarningStatus` (Unit 06): 마켓 구매 적재 시 `PENDING`으로 시작
- **Enum** `ItemStatus`: 아이템은 `ON_SALE`만 구매 가능
- **Enum** `PlanStatus`: 플랜은 `PUBLISHED`만 구매 가능
- **VO** `MarketPurchaseVo`, `PlanPurchaseVo`, `CollectionVo`: F08-08/F08-12 backend.md 참조
- **수수료/세금 정책** (`MarketPurchaseService`):
  - `PLATFORM_FEE_RATE = 0.10` (10%)
  - `WITHHOLDING_TAX_RATE = 0.033` (3.3%)
  - `gross = payAmount`, `fee = gross * 0.10`, `tax = (gross - fee) * 0.033`, `net = gross - fee - tax`
- **월 구매 한도**: `MONTHLY_PURCHASE_LIMIT = 50`

### 의존 단위 / 외부 시스템

- **Unit 06 결제·지갑** (필수):
  - `WalletService.deductByCurrencyType` / `deductFromWallet` — 잔액 차감 + 거래 기록
  - `WalletService.creditBonusToWallet` — 번들 보너스 적립
  - `AccountingLedgerService` — 회계 분개 (`USER_WALLET`, `CREATOR_PAYABLE`, `PLATFORM_FEE_REVENUE`, `WITHHOLDING_TAX_PAYABLE` 등)
  - 잔액 부족: `INSUFFICIENT_BALANCE` 에러를 본 단위가 그대로 클라이언트에 전달
- **Unit 01 인증**: `@AuthenticationPrincipal UserPrincipal` 필수
- 외부 PG 호출 없음 (포인트 결제 한정)

## 5. 프론트 계약

### 진입 경로

- **아이템 단건 구매**: F08-10 마켓 아이템 상세 화면 하단 "구매하기" 버튼
- **번들 구매**: F08-10 화면 번들 카드 내 "이 번들로 구매하기" 버튼
- **플랜 직접 구매**: 플랜 상세/미리보기 화면(F08-02 또는 마켓 미리보기) 의 "구매하기" 버튼 (`plan_preview_screen.dart` / `market_plan_detail_screen.dart`)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/market/items/:itemId` | `presentation/market/screens/market_item_detail_screen.dart` | 아이템·번들 구매 진입점 (`_handlePurchase`, `_handleBundlePurchase`) |
| `/profile/wallet/charge` | (Unit 06) wallet 충전 화면 | 잔액 부족 시 이동 |
| `/market/collection` | `presentation/market/screens/my_collection_screen.dart` | 구매 완료 후 이동 (F08-12) |

### 화면별 구성 요소 & 액션

### 아이템 구매 흐름 (`market_item_detail_screen.dart` 내 `_handlePurchase`)

- **사용자가 보는 것**:
  - 하단 고정 `AppButton(label:'구매하기', variant:ButtonVariant.primary, size:ButtonSize.lg, fullWidth:true)` — `status == 'ON_SALE'`일 때만
  - 진행 중에는 `loading: _isPurchasing` (스피너 회전)
- **사용자가 할 수 있는 액션**:
  - "구매하기" 탭 ▶ `_handlePurchase(itemId)` ▶ `marketPurchaseNotifierProvider.notifier.purchaseItem(itemId)` ▶ `POST /api/v1/market/items/{itemId}/purchase`
- **상태 분기 / 알림**:
  - 성공: `AppDialog.alert(title:'구매 완료', message:'구매가 완료되었습니다', okLabel:'확인')` 표시 → 확인 시 `context.push('/market/collection')` (F08-12로 이동)
  - 400 (INSUFFICIENT_BALANCE): `AppDialog.confirm(title:'포인트 부족', message:'포인트가 부족합니다. 충전하시겠습니까?', cancel:'취소', confirm:'충전하기')` → 확인 시 `context.push('/profile/wallet/charge')`
  - paymentShortfall (B-01a 페이로드): `AppDialog.confirm` → 확인 시 `/profile/wallet/charge?amount=<shortfall>` prefill 충전
  - 401: `AppToast.show('로그인이 필요합니다', error)`
  - 403: `AppToast.show(msg ?? '권한이 없습니다', error)`
  - 404: `AppToast.show('존재하지 않는 아이템입니다', error)` + `context.pop()`
  - 409: `AppToast.show('이미 구매한 아이템입니다', error)`
  - 422: `AppToast.show(msg ?? '처리할 수 없는 요청입니다', error)`
  - 429: `AppToast.show('잠시 후 다시 시도해주세요', error)`
  - 500: `AppToast.show('서버 오류가 발생했습니다', error)`
  - networkError: `AppToast.show('인터넷 연결을 확인해주세요', error)`
- **모달/시트**:
  - 성공 다이얼로그 (`AppDialog.alert`)
  - 잔액 부족 다이얼로그 (`AppDialog.confirm`)

### 번들 구매 흐름 (`market_item_detail_screen.dart` 내 `_handleBundlePurchase`)

- **사용자가 보는 것**: 번들 카드 내 "이 번들로 구매하기" `AppButton`
- **사용자가 할 수 있는 액션**:
  - 탭 ▶ `_handleBundlePurchase(bundleId)` ▶ `marketPurchaseNotifierProvider.notifier.purchaseBundle(bundleId)` ▶ `POST /api/v1/market/bundles/{bundleId}/purchase`
- **상태 분기**:
  - 성공: `AppDialog.alert(title:'구매 완료', message:'번들 구매가 완료되었습니다', okLabel:'확인')` → `/market/collection`
  - 동일한 `_handlePurchaseError` 핸들러로 분기 (위와 동일)

### 플랜 직접 구매 흐름 (Plan detail / preview)

- **사용자가 보는 것**: 플랜 상세/미리보기 화면의 "구매하기" 버튼
- **사용자가 할 수 있는 액션**:
  - 탭 ▶ `planPurchaseNotifierProvider.notifier.purchasePlan(planId)` ▶ `PlanRepository.purchasePlan(planId)` ▶ `POST /api/v1/plans/{planId}/purchase`
  - 성공 시 다음 Provider invalidate: `planDetailNotifierProvider(planId)`, `planPreviewNotifierProvider(planId)`, `myPurchasedPlansNotifierProvider`
- **상태 분기**:
  - 성공: 토스트 "플랜을 구매했습니다" + 내 플랜 구매 탭에 표시 (F08-01에서)
  - 400 INSUFFICIENT_BALANCE: 충전 안내
  - 409 PLAN_ALREADY_PURCHASED: "이미 구매한 플랜입니다" 토스트
  - 400 PLAN_CANNOT_PURCHASE_OWN: "본인 플랜은 구매할 수 없습니다"
  - 400 PLAN_NOT_PUBLISHED: "발행된 플랜만 구매할 수 있습니다"

### API 호출 순서 (Provider/Repository 관점)

### 아이템 구매
1. 사용자 "구매하기" 탭 → `setState(_isPurchasing = true)`
2. `marketPurchaseNotifierProvider.notifier.purchaseItem(itemId)` ▶ `MarketRepository.purchaseItem(itemId)` ▶ `POST /api/v1/market/items/{itemId}/purchase`
3. 성공 응답 (`MarketPurchaseVo`): `purchaseId`, `purchaseType="ITEM"`, `paidAmount`, `collections=[CollectionVo]`
4. `AppDialog.alert` 표시 → 확인 → `context.push('/market/collection')`
5. 실패: `_handlePurchaseError(e)` 호출

### 번들 구매
1. 동일 패턴 — `purchaseBundle(bundleId)` ▶ `POST /api/v1/market/bundles/{bundleId}/purchase`
2. 응답 `MarketPurchaseVo` (`purchaseType="BUNDLE"`, `collections=[N개]`)

### 플랜 직접 구매
1. `planPurchaseNotifierProvider.notifier.purchasePlan(planId)` ▶ `PlanRepository.purchasePlan` ▶ `POST /api/v1/plans/{planId}/purchase`
2. 성공 시 plan 관련 Provider invalidate → 본인 플랜 화면이 새로고침되며 "구매한 플랜" 탭에 표시

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 아이템 단건 구매 — 잔액 충분 (Happy Path) | F08-10 마켓 아이템 상세 화면, `status="ON_SALE"`. | 사용자 잔액 -30,000P, `MarketPurchase` 1건, `Collection` 1건 추가, 크리에이터 수익 PENDING 26,109P. |
| S2 | 잔액 부족 → 충전 분기 | 잔액 5,000P 사용자, 30,000P 아이템 구매 시도. | 결제는 일어나지 않음, `_isPurchasing = false`로 복귀, 사용자가 충전 화면으로 이동. |
| S3 | 번들 구매 — 보너스 통화 적립 | 3개 아이템 묶음 + 1,000P 보너스가 포함된 번들 구매. | 사용자 컬렉션 +3개, 보너스 포인트 +1,000 적립. |
| S4 | 이미 구매한 아이템 (409 conflict) | 시나리오 본문 참조 | 플랜 구매 차단, 마켓 아이템은 정책상 중복 가능. (UI 의도와 백엔드 정책 차이는 향후 정렬 필요) |
| S5 | 재고 소진 | 시나리오 본문 참조 | 한 명만 구매 성공. |
| S6 | 월 50건 한도 초과 | 시나리오 본문 참조 | 익월까지 마켓 구매 차단. |
| S7 | 플랜 직접 구매 — 본인 플랜 차단 | 시나리오 본문 참조 | 결제 미발생. |
| S8 | 무료 플랜 (price=0) 구매 | 시나리오 본문 참조 | 무료 플랜 보유함 추가, 지갑 변동 없음. |

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
| 후보 | backend.md:76 | - 주의: 번들 구매 시 개별 아이템의 creator earnings는 적재하지 않음 (현재 구현은 번들 전체 단위 — 향후 정책 변경 가능) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:83 | - **확인 다이얼로그 노출 여부**: 현재 구현은 별도 사전 확인 시트 없이 즉시 API 호출 (스펙 문서의 "구매 확인 바텀시트"는 미구현 — 향후 일관성 확보 필요) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:94 | - **충전 후 복귀 정책**: 현 구현은 단순 push (충전 화면에서 뒤로 가면 상세로 복귀). 자동 재시도는 미구현. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:72 | 4. 클라이언트: 일반 400 핸들러로 폴백 (현 구현은 INSUFFICIENT_BALANCE와 동일하게 다이얼로그를 띄울 가능성 — `_handlePurchaseError`의 badRequest 분기) — 명시적 라벨 미구현 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 아이템 단건 구매 — 잔액 충분 (Happy Path)**: Given F08-10 마켓 아이템 상세 화면, `status="ON_SALE"`. When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 -30,000P, `MarketPurchase` 1건, `Collection` 1건 추가, 크리에이터 수익 PENDING 26,109P.
- **AC-02. 잔액 부족 → 충전 분기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제는 일어나지 않음, `_isPurchasing = false`로 복귀, 사용자가 충전 화면으로 이동.
- **AC-03. 번들 구매 — 보너스 통화 적립**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 컬렉션 +3개, 보너스 포인트 +1,000 적립.
- **AC-04. 이미 구매한 아이템 (409 conflict)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 플랜 구매 차단, 마켓 아이템은 정책상 중복 가능. (UI 의도와 백엔드 정책 차이는 향후 정렬 필요)
- **AC-05. 재고 소진**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 한 명만 구매 성공.
- **AC-06. 월 50건 한도 초과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 익월까지 마켓 구매 차단.
- **AC-07. 플랜 직접 구매 — 본인 플랜 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제 미발생.
- **AC-08. 무료 플랜 (price=0) 구매**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무료 플랜 보유함 추가, 지갑 변동 없음.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
