# F08-11. 아이템·번들·플랜 구매 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

포인트(지갑)로 마켓 아이템 단건 / 번들 묶음 / 플랜 단건을 구매하는 3개 엔드포인트. 결제 자체는 Unit 06 결제·지갑(`WalletService`)으로 위임하고, 본 단위는 결제 결과를 받아 보유함(`Collection`) / 플랜 구매 기록(`PlanPurchase`) / 크리에이터 수익(`CreatorEarning`) 적재까지 책임진다. 한 트랜잭션 내에서 잔액 차감 + 보유함 적재 + 수익 분배가 일어난다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **아이템 단건 구매**: F08-10 마켓 아이템 상세 화면 하단 "구매하기" 버튼
- **번들 구매**: F08-10 화면 번들 카드 내 "이 번들로 구매하기" 버튼
- **플랜 직접 구매**: 플랜 상세/미리보기 화면(F08-02 또는 마켓 미리보기) 의 "구매하기" 버튼 (`plan_preview_screen.dart` / `market_plan_detail_screen.dart`)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MarketPurchaseController`, `PlanController`, `WalletService`, `MarketPurchaseService`, `PlanPurchaseService`, `WalletSpendService`, `AccountingLedgerService`. 앱: `plan_preview_screen.dart`, `market_plan_detail_screen.dart`, `market_item_detail_screen.dart`, `my_collection_screen.dart`.

## 3. 전체 동작 흐름

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
1. `allowFreePoints && price > 0 && (freePointPrice ?? price) >= 1`이면 결제 수단 시트에서 `PAID` 또는 `FREE`를 선택한다. 그 외에는 query를 생략해 서버 기본값 `PAID`를 사용한다.
2. `planPurchaseNotifierProvider.notifier.purchasePlan(planId, fundingMode)` ▶ `PlanRepository.purchasePlan` ▶ `POST /api/v1/plans/{planId}/purchase?fundingMode=...`
3. 성공 시 plan 관련 Provider invalidate → 본인 플랜 화면이 새로고침되며 "구매한 플랜" 탭에 표시

## 4. 제품 규칙

- 수익 계산: 수수료 = 유료 결제액 x 10%, 원천징수 = (유료 결제액 - 수수료) x 3.3%, 각각 원 단위 반올림. 실수령액 = 유료 결제액 - 수수료 - 원천징수. 무료 결제분에는 수수료와 세금이 없고 무료로 전달된다(F08-15). 구매 경로는 운영이 고친 요율을 쓰지 않는 고정 요율이다.
- 무료 결제 허용 여부는 아이템과 번들은 통화 종류(F08-10)로, 플랜은 작성자 허용 여부로 정한다. 허용하지 않는 상품에 무료 결제를 요청하면 INVALID_REQUEST 다.
- 플랜 구매액은 구매 기록에 그대로 남는다. 값이 0 이면 지갑 차감과 수익 없이 구매 기록과 구매 수만 늘어난다.
- 월 구매 한도 50건은 아이템과 번들에만 걸린다. 플랜 직접 구매에는 한도와 재고 검사가 없다.
- 같은 사람의 동시 구매는 차례로 처리해 재고와 월 한도를 넘지 못한다.
- 실패 때 보이는 것: 잔액 부족은 충전 안내(부족액을 알면 금액을 채움), 401 "로그인이 필요합니다", 404 "존재하지 않는 아이템입니다" 뒤 뒤로 감, 409 "이미 구매한 아이템입니다", 429 "잠시 후 다시 시도해주세요". 플랜은 자기 플랜이면 "본인 플랜은 구매할 수 없습니다", 미발행이면 "발행된 플랜만 구매할 수 있습니다".

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 아이템 단건 구매 — 잔액 충분 (Happy Path) | F08-10 마켓 아이템 상세 화면, `status="ON_SALE"`. | 사용자 잔액 -30,000P, `MarketPurchase` 1건, `Collection` 1건 추가, 크리에이터 수익 PENDING 26,109P. |
| S2 | 잔액 부족 → 충전 분기 | 잔액 5,000P 사용자, 30,000P 아이템 구매 시도. | 결제는 일어나지 않음, `_isPurchasing = false`로 복귀, 사용자가 충전 화면으로 이동. |
| S3 | 번들 구매 — 결제액만 차감 | 3개 아이템을 묶은 번들 구매. | 사용자 컬렉션 +3개, 잔액은 결제액만큼 줄고 덤(보너스) 포인트 적립 없음(차수 10 에서 걷음). |
| S4 | 같은 마켓 아이템 재구매 | 같은 사용자가 이미 한 번 산 ON_SALE 아이템, 재고·월 한도·잔액 충족 | 새 구매/컬렉션/수익 기록이 한 건 더 생성된다. 플랜 직접 구매의 중복 차단과 다르다. |
| S5 | 재고 소진 | 시나리오 본문 참조 | 한 명만 구매 성공. |
| S6 | 월 50건 한도 초과 | 시나리오 본문 참조 | 익월까지 마켓 구매 차단. |
| S7 | 플랜 직접 구매 — 본인 플랜 차단 | 시나리오 본문 참조 | 결제 미발생. |
| S8 | 무료 플랜 (price=0) 구매 | 시나리오 본문 참조 | 무료 플랜 보유함 추가, 지갑 변동 없음. |
| S9 | 플랜 FREE 차등가 구매 | `PUBLISHED`, `allowFreePoints=true`, `freePointPrice>=1`, 무료 잔액 충분 | `freePointPrice`만 FREE_ONLY로 차감하고 그 금액을 `pricePaid`에 저장 |
| S10 | 플랜 FREE 기본가 폴백 | `allowFreePoints=true`, `freePointPrice=null` | 기본 `price`를 FREE_ONLY로 차감 |
| S11 | 무료 결제 미허용 플랜에 FREE 직접 호출 | `allowFreePoints=false` | `INVALID_REQUEST`, 구매·지갑·수익 변동 없음 |
| S12 | HIDDEN 플랜 신규 구매 | 과거 구매 이력이 없는 사용자 | `PLAN_NOT_PUBLISHED`, 결제 없음. 기존 구매자의 읽기 권한과 구분 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:83 | - **확인 다이얼로그 노출 여부**: 현재 구현은 별도 사전 확인 시트 없이 즉시 API 호출 (스펙 문서의 "구매 확인 바텀시트"는 미구현 — 향후 일관성 확보 필요) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:94 | - **충전 후 복귀 정책**: 현 구현은 단순 push (충전 화면에서 뒤로 가면 상세로 복귀). 자동 재시도는 미구현. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:72 | 4. 클라이언트: 일반 400 핸들러로 폴백 (현 구현은 INSUFFICIENT_BALANCE와 동일하게 다이얼로그를 띄울 가능성 — `_handlePurchaseError`의 badRequest 분기) — 명시적 라벨 미구현 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| Gap(아이템/번들 Flutter) | `market_api.dart:82`, `market_repository.dart:213` | 서버는 아이템/번들의 fundingMode를 받지만 앱 API/repository/provider는 이를 노출하지 않아 기본 `PAID`만 호출한다. | `currencyType/freePointPrice` 표시·선택·query 배선 필요 |
| Gap(오류 카피) | `market_item_detail_screen.dart#_handlePurchaseError` | 앱의 일반 409 문구는 “이미 구매한 아이템입니다”지만 서버의 아이템 단건 정책은 재구매를 허용한다. 다른 409가 생기면 잘못된 이유로 안내할 수 있다. | errorCode별 문구로 분기하거나 현재 중복 정책에 맞게 일반 충돌 문구로 교체 |

## 9. 수용 기준

- **AC-01. 아이템 단건 구매 — 잔액 충분 (Happy Path)**: Given F08-10 마켓 아이템 상세 화면, `status="ON_SALE"`. When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 -30,000P, `MarketPurchase` 1건, `Collection` 1건 추가, 크리에이터 수익 PENDING 26,109P.
- **AC-02. 잔액 부족 → 충전 분기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제는 일어나지 않음, `_isPurchasing = false`로 복귀, 사용자가 충전 화면으로 이동.
- **AC-03. 번들 구매 — 결제액만 차감**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 컬렉션 +3개, 잔액은 결제액만큼 줄고 덤(보너스) 포인트 적립 없음.
- **AC-04. 같은 마켓 아이템 재구매**: Given 같은 사용자가 이미 구매한 ON_SALE 아이템이고 재고·월 한도·잔액이 충분 When 다시 구매하면 Then 새 구매·컬렉션·수익 기록이 한 건 더 생성되어야 한다. 플랜 직접 구매는 별도로 중복 차단한다.
- **AC-05. 재고 소진**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 한 명만 구매 성공.
- **AC-06. 월 50건 한도 초과**: Given 아이템·번들 구매가 월 50건에 도달 When 추가 마켓 구매 Then 익월까지 해당 구매 차단. 플랜 직접 구매에는 이 한도를 적용하지 않음.
- **AC-07. 플랜 직접 구매 — 본인 플랜 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제 미발생.
- **AC-08. 무료 플랜 (price=0) 구매**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무료 플랜 보유함 추가, 지갑 변동 없음.
- **AC-09. 플랜 차등가 스냅샷**: Given FREE 선택과 유효한 차등가 When 구매 성공 Then 실제 차감액과 `PlanPurchase.pricePaid`가 같아야 한다.
- **AC-10. 플랜 기본가 FREE 폴백**: Given 무료 포인트 허용, `freePointPrice=null` When FREE 구매 Then 기본 `price`를 FREE_ONLY로 차감해야 한다.
- **AC-11. HIDDEN 신규 구매 차단**: Given HIDDEN 플랜 When 미구매자가 구매 호출 Then `PLAN_NOT_PUBLISHED`이고 어떤 금전·구매 기록도 남지 않아야 한다.
