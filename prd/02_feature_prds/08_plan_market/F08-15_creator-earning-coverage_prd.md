# F08-15 — 크리에이터 매출 귀속 보정 (Creator Earning Coverage)

> 신규 PRD. 작성일: 2026-05-24
> 상태: **마켓/플랜 창작자 정산 split 구현됨**. 본 문서가 구현 계약(spec)이며, 아래는 현행 동작 기준으로 읽는다. (EVENT 정산의 earning split만 legacy/followup.)
> 출처: F08-14(플랜 마켓 환불) 합의 과정에서 codex 페어 리뷰가 짚은 선행 결손. 환불 PRD의 하드 의존 대상이다.

## 1. 결론

플랜 마켓의 세 가지 구매 소스(`MARKET_ITEM`, `MARKET_BUNDLE`, `PLAN_DIRECT`)는 **모두 크리에이터 매출 원장(`CreatorEarning`)에 잡힌다** — `MarketPurchaseService`가 MARKET_ITEM·MARKET_BUNDLE를, `PlanPurchaseService`가 PLAN_DIRECT를 `grossPaid/gross_free` 분리로 생성하고, `MarketplaceSettlementService`가 세 source type을 모두 정산 대상으로 집계한다(과거 `MARKET_ITEM`만 잡히던 결손은 해소됨). 수수료·원천징수는 유료분에만, 무료분은 무수수료 `free_credit`으로 적립된다. EVENT 정산의 earning split만 아직 legacy 경로로 미이관(followup)이다.

본 PRD는 F08-14(환불)의 **하드 의존**이다. 본 PRD가 닫히기 전에는 F08-14 백엔드 구현에 들어가지 않는다.

## 2. 현재 코드 결손 (근거)

| 항목 | 현황 | 근거 |
|---|---|---|
| `MARKET_ITEM` 수익 생성 | 있음. `sourceId`는 구매 ID(`marketPurchaseId`)로 정정됨 — 구매 단위로 식별되어 환불·정산 시 "이 구매의 수익 row"를 특정할 수 있다. | `MarketPurchaseService.createCreatorEarning(item.getCreatorId(), "MARKET_ITEM", saved.getPurchaseId(), ...)` |
| `MARKET_BUNDLE` 수익 생성 | 구현됨. 포함 아이템 원작자에게 정가 비례 배분으로 `CreatorEarning` 생성(`grossPaid/grossFree` 분리). | `MarketPurchaseService.createCreatorEarning(..., "MARKET_BUNDLE", ...)` |
| `MARKET_BUNDLE` 판매자 모델 | `Bundle`에 `curatorUserId` 존재(환불 권한자 결정에 사용). 매출 귀속은 포함 아이템 원작자 기준. | `Bundle.java`, `PurchaseRefundService.resolveSellerUserId` |
| `PLAN_DIRECT` 수익 생성 | 구현됨. `PlanPurchaseService`가 `CreatorEarning(sourceType=PLAN_DIRECT)`를 `grossPaid/grossFree` 분리로 생성. | `PlanPurchaseService.createCreatorEarning` |
| `PLAN_DIRECT` 정책 분류 | `SpendPolicy`에서 `PLAN_PURCHASE = FLOW_THROUGH`로 정정됨(플랜 직접 구매도 크리에이터 정산 대상). | `SpendPolicyRegistry.java:52` |
| 월간 정산 대상 | `MARKET_ITEM`·`MARKET_BUNDLE`·`PLAN_DIRECT`의 `PENDING` 수익을 모두 정산. | `MarketplaceSettlementService.java:36` |
| `CreatorEarning` 상태 | `PENDING`/`PAID` 외 `REFUND_HELD`/`REFUNDED`/`REVERSED` 추가됨(환불 대기·완료·역전). 정산 쿼리는 `PENDING`만 집계. | `EarningStatus`, 정산 쿼리 |

## 3. 결정 사항

### 3.1 매출 귀속 주체

| 구매 소스 | 판매자 | 수익 행 생성 | 정산 대상 |
|---|---|---|---|
| `MARKET_ITEM` | 아이템의 `creator_id` | 구매 시점에 1행 | 예 |
| `MARKET_BUNDLE` | 본 PRD에서 결정 (아래 3.3 참조) | 구매 시점에 1~N행 | 예 |
| `PLAN_DIRECT` | 플랜의 `creator_id` | 구매 시점에 1행 | 예 (본 PRD에서 변경) |

`PLAN_DIRECT`를 크리에이터 정산 대상으로 포함시킨다. 이는 `SpendPolicy.PLAN_PURCHASE`의 `FREE_BURN` 분류와 충돌한다. 분류를 `FLOW_THROUGH`로 변경하고, 회계 분개 경로를 마켓 아이템과 동일하게 처리한다.

### 3.2 `CreatorEarning` 모델 변경

#### 3.2.1 `sourceId` 의미 변경

현재 `sourceId`가 상품 ID(아이템 ID, 플랜 ID 등)인 것을, **구매 ID**로 변경한다. 즉:

- `MARKET_ITEM`: `sourceId = marketPurchaseId`
- `MARKET_BUNDLE`: `sourceId = marketPurchaseId` (번들 단위 1행 또는 포함 아이템별 N행 — 3.3에서 결정)
- `PLAN_DIRECT`: `sourceId = planPurchaseId`

이 변경 없이 환불을 도입하면 "이 구매가 만든 수익 행"을 정확히 잠그거나 역전시킬 수 없다.

#### 3.2.2 신규 상태

`CreatorEarning.status`에 다음 값을 추가한다.

- `PENDING` (기존)
- `PAID` (기존, 정산 완료)
- `REFUND_HELD` — 환불 신청이 열려 있어 정산에서 제외
- `REFUNDED` — 정산 전 환불 완료. 수익 행은 남기되 정산 대상 아님
- `REVERSED` — 정산 후 환불로 회수 진행 중 또는 완료. `CREATOR_RECEIVABLE` 회계와 연동

`MarketplaceSettlementService`의 정산 쿼리는 `PENDING`만 잡도록 유지하되, 본 PRD가 추가하는 상태들은 정의상 정산 대상이 아니다.

### 3.3 번들 판매자 모델

본 PRD의 핵심 결정이다. 현재 `Bundle`에는 판매자 정보가 없다. 세 가지 안 중 결정한다.

| 안 | 설명 | 채택 |
|---|---|---|
| A. 단일 큐레이터 번들 | 번들마다 단일 `creator_id`를 두고 그 사람이 매출 귀속자가 된다. 포함 아이템의 원작자와 무관. | 미채택 (원작자 권리 침해) |
| B. 다중 크리에이터 번들 (정가 비례 배분) | 포함된 각 아이템의 원작자에게 정가 비율로 매출 배분. 번들 1건 구매 시 `CreatorEarning`이 N행 생성. | **채택** |
| C. 플랫폼 매출 번들 | 번들은 플랫폼 큐레이션 수익으로 본다. 크리에이터에게 배분되지 않음. | 미채택 (마켓 인센티브 훼손) |

채택안 B의 세부:

- `Bundle`에 `curator_user_id` 컬럼 추가 (큐레이션 권한 추적용. 매출 귀속과는 별개)
- 번들 구매 시 포함 아이템별로 다음을 계산:
  - 아이템별 정가 합계 = `sum(item.price * bundleItem.quantity)`
  - 아이템별 비율 = `(item.price * quantity) / 정가 합계`
  - 아이템별 수익 = `bundle.payAmount * 아이템별 비율`
- 각 아이템 원작자에게 `CreatorEarning` 1행 생성. `sourceType = MARKET_BUNDLE`, `sourceId = marketPurchaseId`, 추가 컬럼으로 `bundleItemId` 또는 분배 메타를 남긴다.
- 정가 합계가 0이면 균등 배분 (안전망)
- 보너스 포인트는 플랫폼 비용. `PLATFORM_FEE_REVENUE`에서 차감 또는 별도 마케팅 비용 계정으로 분리. 회계 결정은 본 PRD 6절에서 다룬다.

### 3.4 `SpendPolicy` 정정

`SpendPolicy.PLAN_PURCHASE`를 `FREE_BURN`에서 `FLOW_THROUGH`로 변경한다. 회계 분개도 다음과 같이 변경:

- 현재: 구매자 지갑 차감, 플랫폼 매출만 인식 (또는 무분개)
- 변경: 구매자 지갑 차감 → `CREATOR_PAYABLE` 증가 + `PLATFORM_FEE_REVENUE` 증가 + `WITHHOLDING_TAX_PAYABLE` 증가

마켓 아이템과 동일 경로. `AccountingLedgerService`에 신규 메서드 또는 기존 마켓 분개 재사용.

### 3.4a 유료/무료 분리정산 — CreatorEarning split

> 2026-05-24: 포인트 분리정산 반영. 정본은 정책 PRD `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

마켓 구매는 flow-through 사용처이므로 결제 시 유료/무료 split이 창작자까지 전파된다. `CreatorEarning`은 유료/무료를 **분리 기록**한다.

- **유료 매출**: 수수료(10%)·원천징수(3.3%)를 차감한 net을 정산 대상(`PENDING`)으로 적재. 정산 시 창작자 paid로 지급.
- **무료 매출**: 수수료·원천징수를 **부과하지 않고** 무수수료 `free_credit`으로 적재. 창작자 free에 적립되어 **인출 불가**(무료→현금 전환 차단).
- 따라서 위 3.4의 분개(수수료/원천세 인식)는 **유료분에만** 적용된다. 무료 매출분은 정산 시 `MarketplaceSettlementService`가 `creditMarketplaceSettlement(creator, PointSplit(totalNet, totalFreeCredit))`로 창작자 지갑에 **free_credit 적립만** 한다(구현됨). spend/정산 시점의 프로모션 비용(`PROMOTION_EXPENSE`) 분개는 **미구현 — followup**.

> **Fact (2026-06-06 돈 흐름 무결성 — H3 해소, 커밋 b7e384b)**: 과거 무료 매출 정산(freeCredit 지급)이 **원장 분개 없이** 지갑에만 입금되어 USER_WALLET 차변 < 실지급으로 장부가 비대칭이던 결함이 해소됨. `MarketplaceSettlementService` 무료분 지급에 대응 원장 분개가 추가되어(`AccountingLedgerService` 확장), 무료 free_credit 지급도 차/대변이 대칭으로 기록된다.

`MarketplaceSettlementService`가 현재 `MARKET_ITEM`의 `PENDING`만 집계한다. 다음 두 source type까지 확장한다.

- `MARKET_BUNDLE` (다중 크리에이터별 행)
- `PLAN_DIRECT`

확장 쿼리는 source type을 IN 절로 받고, `status = PENDING`만 집계한다. F08-14가 추가할 `REFUND_HELD` / `REFUNDED` / `REVERSED`는 자연히 제외된다.

또한 정산 시점 조건을 추가한다. **환불 가능 기간이 끝난 수익만 정산**한다. F08-14의 정책에 따라 환불 가능 기간이 14일이 되면, 정산 쿼리는 `created_at <= now - 14일` 조건을 포함한다. 이 결정은 F08-14와 결합되므로 두 PRD의 정산 쿼리 변경을 함께 본다.

### 3.6 백필 정책

기존 구매 데이터에 대한 처리:

- **`MARKET_ITEM` 기존 데이터**: 이미 `CreatorEarning`이 있다. `sourceId`를 `itemId`에서 `marketPurchaseId`로 일괄 변경. 매핑은 `MarketPurchase.referenceId + purchaseType=MARKET_ITEM`으로 찾는다. 같은 아이템 다수 구매자 케이스에서 1:1 매핑이 모호하면, **가장 가까운 시점의 구매**와 매칭한다. 매칭 실패 행은 운영자 검토 큐로 보낸다.
- **`MARKET_BUNDLE` 기존 데이터**: `CreatorEarning`이 없다. 번들에 `curator_user_id`도 없다. 자동 백필 불가. 두 가지 옵션 중 결정:
  - (a) 백필 포기. 기존 번들 구매는 매출 귀속 없는 상태로 둠. 환불도 정상 처리되되 크리에이터 회수 분개는 없음.
  - (b) 운영자 수동 백필. 번들별 큐레이터·배분 비율을 운영자가 채운 뒤 일괄 분개 발행.
  - 권장: **(a)**. 과거 번들이 많지 않다면 (a)가 안전하다. 데이터 양이 많으면 (b).
- **`PLAN_DIRECT` 기존 데이터**: `CreatorEarning`이 없고 `SpendPolicy`도 다르다. 백필 옵션:
  - (a) 백필 포기. 과거 플랜 직접 구매는 매출 귀속 없음.
  - (b) 운영자 수동 백필.
  - 권장: **(a)**. PLAN_DIRECT 거래량은 적을 가능성이 높다.

(a)를 택한 경우, F08-14 환불이 백필 안 된 과거 구매에 들어오면 회계는 다음과 같이 처리:
- 구매자 지갑 환불은 정상 진행
- 크리에이터 회수 분개는 발생하지 않음 (애초에 잡힌 수익이 없음)
- 플랫폼이 손실 흡수
- 거래 메모에 "백필 이전 구매" 표시

## 4. 데이터 모델 변경

### 4.1 `bundle` 테이블

```sql
ALTER TABLE bundle
  ADD COLUMN curator_user_id BIGINT NULL AFTER title;
```

`curator_user_id`는 매출 귀속과 무관하다 (3.3 채택안 B). 큐레이션 책임자 추적용.

### 4.2 `creator_earning` 테이블

```sql
-- source_id 의미 변경: 상품 ID → 구매 ID
-- 상태 enum 확장
ALTER TABLE creator_earning
  MODIFY COLUMN status VARCHAR(20) NOT NULL;  -- PENDING/PAID/REFUND_HELD/REFUNDED/REVERSED

-- 번들 배분 추적용 (다중 크리에이터)
ALTER TABLE creator_earning
  ADD COLUMN bundle_item_id BIGINT NULL AFTER source_id,
  ADD COLUMN allocation_ratio DECIMAL(10,8) NULL AFTER bundle_item_id;
```

`source_id` 컬럼 타입은 그대로지만 의미가 바뀐다. 마이그레이션 시 일괄 UPDATE 필요.

### 4.3 마이그레이션 정책

CLAUDE.md 규칙대로 `V1__init.sql` 단일 파일에 직접 반영. V2 파일 만들지 않음. 기존 데이터에 대한 백필 UPDATE문도 같은 파일에 포함.

## 5. 백엔드 변경

### 5.1 `MarketPurchaseService.purchaseItem`

기존 호출:
```java
createCreatorEarning(item.getCreatorId(), "MARKET_ITEM", itemId, payAmount);
```

변경:
```java
createCreatorEarning(item.getCreatorId(), "MARKET_ITEM", marketPurchase.getPurchaseId(), payAmount);
```

### 5.2 `MarketPurchaseService.purchaseBundle`

신규 로직:

```java
@Transactional(rollbackFor = Exception.class)
public MarketPurchaseVo purchaseBundle(long userId, long bundleId) {
    // 기존 결제·구매 row·Collection 생성 유지
    // ...
    
    // 신규: 포함 아이템별 매출 배분
    List<BundleItem> items = bundleItemRepository.findByBundleId(bundleId);
    long totalRetailPrice = items.stream()
        .mapToLong(bi -> getItemPrice(bi.getItemId()) * bi.getQuantity())
        .sum();
    
    for (BundleItem bi : items) {
        MarketItem item = marketItemService.getItem(bi.getItemId());
        long retailPortion = item.getPrice() * bi.getQuantity();
        double ratio = totalRetailPrice == 0
            ? 1.0 / items.size()
            : (double) retailPortion / totalRetailPrice;
        long allocatedAmount = Math.round(bundle.getPayAmount() * ratio);
        
        creatorEarningService.create(
            item.getCreatorId(),
            "MARKET_BUNDLE",
            marketPurchase.getPurchaseId(),
            allocatedAmount,
            bi.getId(),
            BigDecimal.valueOf(ratio)
        );
    }
    
    // 회계 분개도 N행으로 분할
}
```

반올림 차이는 마지막 행에서 보정한다. 합계가 `payAmount`와 일치해야 한다.

### 5.3 `PlanPurchaseService.purchase`

신규:
```java
createCreatorEarning(plan.getCreatorId(), "PLAN_DIRECT", planPurchase.getPurchaseId(), payAmount);
```

회계 분개도 마켓 아이템과 동일 패턴으로 추가.

### 5.4 `SpendPolicyRegistry`

```java
register(SpendCategory.PLAN_PURCHASE, SpendPolicy.FLOW_THROUGH);
```

`FREE_BURN`에서 `FLOW_THROUGH`로 변경.

### 5.5 `MarketplaceSettlementService`

쿼리 확장:

```java
Page<CreatorEarning> earnings = creatorEarningRepository
    .findBySourceTypeInAndStatusAndCreatedAtBefore(
        List.of("MARKET_ITEM", "MARKET_BUNDLE", "PLAN_DIRECT"),
        EarningStatus.PENDING,
        now.minusDays(refundWindow),  // F08-14에서 결정한 환불 가능 기간
        pageable
    );
```

`refundWindow`는 설정값으로 빼고 기본 **14일**.

## 6. 회계 분개

### 6.1 `MARKET_ITEM` 구매 (변경 없음)

```
차변: USER_WALLET (구매자 지갑 차감)
대변: CREATOR_PAYABLE (크리에이터 미지급금)
대변: PLATFORM_FEE_REVENUE (수수료)
대변: WITHHOLDING_TAX_PAYABLE (원천징수)
```

### 6.2 `MARKET_BUNDLE` 구매 (신규)

번들 1건이 N행의 분개를 만든다.

```
차변: USER_WALLET = bundle.payAmount

For each item in bundle:
  대변: CREATOR_PAYABLE[creator_i] = allocatedAmount_i × (1 - feeRate - taxRate)
  대변: PLATFORM_FEE_REVENUE = allocatedAmount_i × feeRate
  대변: WITHHOLDING_TAX_PAYABLE = allocatedAmount_i × taxRate

대변: 보너스 포인트 차감 = bonusAmount (별도 처리 — 6.4 참조)
```

### 6.3 `PLAN_DIRECT` 구매 (신규)

```
차변: USER_WALLET
대변: CREATOR_PAYABLE
대변: PLATFORM_FEE_REVENUE
대변: WITHHOLDING_TAX_PAYABLE
```

마켓 아이템과 동일 패턴.

### 6.4 번들 보너스 포인트

번들 구매 시 구매자에게 즉시 지급되는 보너스 포인트(`MarketPurchaseService.java:165`)는 플랫폼 마케팅 비용이다.

**결정 (잠정, followup 회계 설계)**: 기존 `PROMOTION_EXPENSE` 계정 재사용을 후속 회계 설계로 검토한다. `AccountCode.PROMOTION_EXPENSE`가 이미 "프로모션 무료 포인트 비용"으로 정의되어 있어 번들 보너스도 동일 계열로 자연스럽다.

```
(후속 설계 목표 분개)
차변: PROMOTION_EXPENSE = bonusAmount
대변: USER_WALLET = bonusAmount (구매자 지갑 입금)
```

**현재 구현**: 번들 보너스는 `WalletService.creditBonusToWallet(userId, currencyType, amount, "BUNDLE_BONUS", ...)`(`WalletService.java:600`)로 지급되는데, 이 메서드는 지갑 잔액 입금 + `PointTransaction(type=FREE_POINT_GRANT)` 생성만 하고 **회계 분개(`AccountingLedger`)는 생성하지 않는다**. 위 `PROMOTION_EXPENSE` 분개는 **미구현 — followup**(신규 분개 배선 필요).

신규 계정 `PLATFORM_MARKETING_EXPENSE`로 분리할지는 재무팀이 ROI 분석 필요 시 후속 결정.

## 7. 환불과의 인터페이스 (F08-14 의존)

F08-14가 본 PRD에 의존하는 인터페이스:

- 환불 신청 시: `creatorEarning.status = REFUND_HELD`로 변경. 정산에서 제외.
- 정산 전 환불 승인: `creatorEarning.status = REFUNDED`. 분개 역전.
- 정산 후 환불 승인: `creatorEarning.status = REVERSED`. `CREATOR_RECEIVABLE` 신설 분개로 회수 시작.
- 환불 거절: `creatorEarning.status = PENDING`으로 복원.
- 운영자 강제 환불: 위와 동일 경로, `decision_source = OPERATOR` 메타.

### 7.1 정산 사이클 회수 흐름 (구현됨)

월간 정산 직전 `MarketplaceSettlementService.offsetCreatorReceivable(creatorId, totalNet)`이 호출되어 `REVERSED` 상태 earning을 가용 정산금으로 회수한다. 본 PRD는 **전액 회수만 지원**한다.

| 입력 | 처리 |
|---|---|
| `REVERSED` earning 없음 | 회수 0, 정산 그대로 |
| 가용 정산금 ≥ earning.netAmount | earning을 `PAID`로 전이, 가용금에서 차감, `recordCreatorReceivableOffset` 분개 발행 |
| 가용 정산금 < earning.netAmount | 회수 안 함 (다음 사이클로 이월) |

부분 회수는 본 라운드 미지원. 향후 결정 사항.

### 7.2 부분 환불 (F08-14 PARTIAL_ITEM)

F08-14 부분 환불의 경우 선택된 BundleItem의 earning만 상태 전이 + 분개. `PurchaseRefundService.earningsForRefund`가 `refundScope=PARTIAL_ITEM`이면 `purchase_refund_item` 행과 대조해 선택된 earning만 반환한다. 미선택 earning은 `PENDING` 유지되어 정상 정산 대상이 된다.

본 PRD는 위 상태와 회계 메서드 시그니처를 보장한다. 실제 환불 흐름은 F08-14가 정한다.

## 8. 클라이언트 영향

본 PRD는 백엔드 보정이 중심이다. 클라이언트는 다음만 영향받는다.

- 크리에이터 대시보드(`F06-09`) — 번들·플랜 직접 구매 수익이 새로 잡힘. 기존 가이드 본문 수정 필요.
- 거래 내역(`F06-06`) — 신규 분개로 거래 표시가 늘어남. 영문 enum 노출 금지(`MARKET_BUNDLE`, `PLAN_DIRECT`)는 기존 정책대로 한글 표기.

## 9. 권한·검증

- `CreatorEarning` 생성은 결제 트랜잭션 안에서만 실행. 외부 호출 금지.
- 정산 확장 쿼리는 운영자 권한으로만 실행 (`MarketplaceSettlementService` 스케줄러).
- 백필 SQL은 마이그레이션 시점 1회 실행. 운영 중 재실행 금지.

## 10. Gap / Risk

- **번들 정가 합계 0**: 무료 아이템 묶음 번들이 있으면 정가 비례 배분 불가. 균등 배분 fallback이 들어가지만, 운영 정책으로 무료 번들은 별도 처리할지 결정 필요.
- **반올림 누적 오차**: 다중 크리에이터 배분에서 1~2원 차이가 누적 가능. 마지막 행 보정으로 합계 일치 보장.
- **번들 큐레이터와 매출 귀속자 불일치**: 큐레이터가 자기 아이템 하나만 포함시켜 매출 100% 가져가는 케이스. 마켓 정책으로 별도 안내 필요.
- **`PLAN_DIRECT` 정책 변경의 사용자 영향**: 기존 `FREE_BURN`에서 `FLOW_THROUGH`로 바뀌면, 거래 내역 표시·환불 정책이 달라진다. 사용자 가이드(F08-11) 갱신 필수.
- **백필 미수행 데이터**: (a) 선택 시 과거 구매는 매출 귀속 없음. 운영 보고에서 "백필 이전 구매" 분리 표시 필요.
- **세무 보고**: 신규 매출 귀속에 따른 원천징수 신고 변경. 재무팀과 합의.

## 11. 구현 순서

1. **재무·운영 합의**: 6.4 보너스 포인트 회계, 3.6 백필 옵션 (a/b)
2. **데이터 모델 변경**: `V1__init.sql`에 `bundle.curator_user_id`, `creator_earning` 컬럼·status enum
3. **백엔드**:
   - `CreatorEarning` 신규 상태 처리
   - `MarketPurchaseService.purchaseItem` `sourceId` 변경
   - `MarketPurchaseService.purchaseBundle` 매출 배분 로직
   - `PlanPurchaseService.purchase` 매출 행 생성
   - `SpendPolicyRegistry` `PLAN_PURCHASE` 정정
   - `MarketplaceSettlementService` 쿼리 확장
   - `AccountingLedgerService` 신규 분개 메서드
4. **백엔드 테스트**: 번들 배분 계산, 반올림 정합성, 정산 쿼리 확장, `PLAN_DIRECT` 분개
5. **백필 마이그레이션**: 기존 `MARKET_ITEM` `sourceId` 일괄 UPDATE, 매칭 실패 검토
6. **사용자 가이드 갱신**: F08-11, F06-09, F06-06 본문 수정
7. **F08-14 진행 가능 상태로 전환**

## 12. 명시되지 않은 결정 사항 (재무팀 합의)

- 보너스 포인트 회계 계정 신설 (`PLATFORM_MARKETING_EXPENSE`)
- 백필 (a) vs (b)
- 무료 아이템 포함 번들의 배분 정책
- 큐레이션 수수료 도입 여부 (큐레이터에게 추가 보상)
