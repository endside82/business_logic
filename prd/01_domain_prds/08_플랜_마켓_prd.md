# 08. 플랜 마켓 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/08_plan_market -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/08_plan_market/00_overview.md`와 117개 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

데이트/모임 코스를 "플랜"이라는 상품으로 만들어 마켓에 판매하고, 다른 사용자가 구매·활용·리뷰까지 완수하는 단위.
사용자는 두 종류로 갈린다 — **크리에이터**(플랜 작성·발행·판매)와 **구매자**(탐색·구매·활용·리뷰).

이 도메인은 기능 PRD 13개로 구성된다. 현재 기능별 trace source는 총 45개이고, risk 후보는 총 39개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F08-01 | F08-01. 내 플랜 목록 관리 | [F08-01_my-plan-list_prd.md](../02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | [F08-01_my-plan-list](../../units/08_plan_market/F08-01_my-plan-list) | 전환 완료 | 3 | 1 |
| F08-02 | F08-02. 플랜 상세 / 작성자용 미리보기 | [F08-02_plan-detail_prd.md](../02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md) | [F08-02_plan-detail](../../units/08_plan_market/F08-02_plan-detail) | 전환 완료 | 6 | 0 |
| F08-03 | F08-03. 블록 에디터 (블록 CRUD) | [F08-03_block-editor_prd.md](../02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | [F08-03_block-editor](../../units/08_plan_market/F08-03_block-editor) | 전환 완료 | 5 | 4 |
| F08-04 | F08-04. 블록 드래그 재정렬 / 계층 이동 | [F08-04_block-reorder_prd.md](../02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | [F08-04_block-reorder](../../units/08_plan_market/F08-04_block-reorder) | 전환 완료 | 2 | 2 |
| F08-05 | F08-05. 플랜 발행 | [F08-05_plan-publish_prd.md](../02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | [F08-05_plan-publish](../../units/08_plan_market/F08-05_plan-publish) | 전환 완료 | 1 | 3 |
| F08-06 | F08-06. 마켓 아이템 관리 (등록/수정/판매중지) | [F08-06_market-item-management_prd.md](../02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | [F08-06_market-item-management](../../units/08_plan_market/F08-06_market-item-management) | 전환 완료 | 6 | 2 |
| F08-07 | F08-07. 크리에이터 프로필 / 내 통계 | [F08-07_creator-profile-stats_prd.md](../02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | [F08-07_creator-profile-stats](../../units/08_plan_market/F08-07_creator-profile-stats) | 전환 완료 | 2 | 7 |
| F08-08 | F08-08. 마켓 메인 탐색 | [F08-08_market-main-browse_prd.md](../02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | [F08-08_market-main-browse](../../units/08_plan_market/F08-08_market-main-browse) | 전환 완료 | 3 | 2 |
| F08-09 | F08-09. 마켓 검색 | [F08-09_market-search_prd.md](../02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | [F08-09_market-search](../../units/08_plan_market/F08-09_market-search) | 전환 완료 | 1 | 4 |
| F08-10 | F08-10. 마켓 아이템 상세 | [F08-10_market-item-detail_prd.md](../02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | [F08-10_market-item-detail](../../units/08_plan_market/F08-10_market-item-detail) | 전환 완료 | 5 | 4 |
| F08-11 | F08-11. 아이템·번들·플랜 구매 | [F08-11_purchase_prd.md](../02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | [F08-11_purchase](../../units/08_plan_market/F08-11_purchase) | 전환 완료 | 3 | 4 |
| F08-12 | F08-12. 내 컬렉션 | [F08-12_my-collection_prd.md](../02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | [F08-12_my-collection](../../units/08_plan_market/F08-12_my-collection) | 전환 완료 | 4 | 4 |
| F08-13 | F08-13. 구매 플랜 이벤트 생성 / 리뷰 작성 | [F08-13_plan-event-and-review_prd.md](../02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | [F08-13_plan-event-and-review](../../units/08_plan_market/F08-13_plan-event-and-review) | 전환 완료 | 4 | 2 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F08-07](../02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | F08-07. 크리에이터 프로필 / 내 통계 | Risk 후보 7 |
| [F08-09](../02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | F08-09. 마켓 검색 | Risk 후보 4 |
| [F08-11](../02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | F08-11. 아이템·번들·플랜 구매 | Risk 후보 4 |
| [F08-12](../02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | F08-12. 내 컬렉션 | Risk 후보 4 |
| [F08-03](../02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | F08-03. 블록 에디터 (블록 CRUD) | Risk 후보 4 |
| [F08-10](../02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | F08-10. 마켓 아이템 상세 | Risk 후보 4 |
| [F08-05](../02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | F08-05. 플랜 발행 | Risk 후보 3 |
| [F08-04](../02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | F08-04. 블록 드래그 재정렬 / 계층 이동 | Risk 후보 2 |
| [F08-08](../02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | F08-08. 마켓 메인 탐색 | Risk 후보 2 |
| [F08-13](../02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | F08-13. 구매 플랜 이벤트 생성 / 리뷰 작성 | Risk 후보 2 |
| [F08-06](../02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | F08-06. 마켓 아이템 관리 (등록/수정/판매중지) | Risk 후보 2 |
| [F08-01](../02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | F08-01. 내 플랜 목록 관리 | Risk 후보 1 |

## 4. 도메인 기능 목록

### 사용자 관점 분할

이 단위는 **두 페르소나가 한 도메인에서 정반대 행동을 한다**.

| 페르소나 | 주요 목적 | 다루는 화면 |
|---|---|---|
| 크리에이터 (Plan Author) | 플랜을 작성하고 발행/판매하여 수익화 | SCR-PE-001~005, SCR-MK-002 (자기 아이템 보기), SCR-MK-004 (내 통계) |
| 구매자 (Buyer / Collector) | 마음에 드는 플랜을 발견·구매·내 컬렉션에 보관·활용 | SCR-MK-001~003, SCR-PE-002 (구매 후 미리보기) |
| 공통 / 양방향 | 리뷰, 크리에이터 프로필 탐색 | SCR-MK-002 리뷰 섹션, SCR-MK-004 |

따라서 핵심 기능은 **크리에이터 7개 + 구매자 6개 = 총 13개**로 도출했다.

---

### 핵심 기능 목록 (M = 13)

### A. 크리에이터 (플랜 작성·판매)

#### F08-01. 내 플랜 목록 관리 (탭: 내가 만든 플랜 / 구매한 플랜)
- **사용자 가치**: 작성 중인 플랜과 보유 중인 플랜을 한 화면에서 빠르게 찾고 새 플랜 작성으로 진입
- **화면**: SCR-PE-001 / `plan_list_screen.dart`
- **API**:
  - `GET /api/v1/plans/my/created` (PageResponse, 내가 만든 플랜)
  - `GET /api/v1/plans/my/purchased` (PageResponse, 구매한 플랜)
  - `POST /api/v1/plans` (PlanController.createPlan, DRAFT 생성)
- **컨트롤러**: PlanController

#### F08-02. 플랜 상세 보기 / 작성자용 미리보기
- **사용자 가치**: 작성한 플랜의 블록 구성, 상태(DRAFT/PUBLISHED), 메타데이터를 검토하고 편집·발행·복사 진입점 제공
- **화면**: SCR-PE-002 / `plan_detail_screen.dart`, `plan_preview_screen.dart`
- **API**:
  - `GET /api/v1/plans/{planId}` (PlanController.getPlan)
  - `PATCH /api/v1/plans/{planId}` (PlanController.updatePlan, 메타 수정)
  - `DELETE /api/v1/plans/{planId}` (PlanController.deletePlan)
  - `POST /api/v1/plans/{planId}/copy` (PlanController.copyPlan, 복사본 DRAFT 생성)
  - `POST /api/v1/plans/{planId}/hide` (PlanController.hidePlan, 발행 취소/숨김)
- **컨트롤러**: PlanController

#### F08-03. 블록 에디터 (블록 CRUD + 인라인 편집)
- **사용자 가치**: 텍스트/이미지/장소/시간/체크리스트 등 다양한 타입의 블록을 트리 구조로 추가·편집·삭제하여 플랜 내용을 구성
- **화면**: SCR-PE-003 / `block_editor_screen.dart` + `widgets/block_edit_dialogs/*` (callout, image, link, list, location, timetable, todo) + `block_renderer.dart`, `block_type_sheet.dart`
- **API**:
  - `GET /api/v1/plans/{planId}/blocks` (PlanBlockController.getBlockTree, 트리 반환)
  - `POST /api/v1/plans/{planId}/blocks` (PlanBlockController.addBlock)
  - `PATCH /api/v1/plans/{planId}/blocks/{blockId}` (PlanBlockController.updateBlock)
  - `DELETE /api/v1/plans/{planId}/blocks/{blockId}` (PlanBlockController.deleteBlock)
  - `POST /api/v1/plans/{planId}/blocks/{blockId}/restore` (PlanBlockController.restoreBlock)
- **컨트롤러**: PlanBlockController

#### F08-04. 블록 드래그 재정렬 / 계층 이동
- **사용자 가치**: 블록 순서를 한 번에 재배열하거나 다른 부모 블록 아래로 이동시켜 플랜 구조를 자연스럽게 조정
- **화면**: SCR-PE-004 / `block_reorder_screen.dart`, `block_reorder_model.dart`
- **API**:
  - `PUT /api/v1/plans/{planId}/blocks/reorder` (PlanBlockController.reorderBlocks, 일괄 순서)
  - `PATCH /api/v1/plans/{planId}/blocks/{blockId}/move` (PlanBlockController.moveBlock, 계층 변경)
- **컨트롤러**: PlanBlockController

#### F08-05. 플랜 발행 (체크리스트 검증 → 마켓 등록)
- **사용자 가치**: 제목·설명·블록·가격·커버이미지 등 발행 요건을 충족시킨 후 마켓에 등록하여 판매 시작
- **화면**: SCR-PE-005 / `plan_publish_screen.dart`
- **API**:
  - `POST /api/v1/plans/{planId}/publish` (PlanController.publishPlan)
- **에러 분기**: 400 PUBLISH_REQUIREMENTS_NOT_MET, 409 ALREADY_PUBLISHED
- **컨트롤러**: PlanController

#### F08-06. 마켓 아이템 관리 (등록·수정·판매중지)
- **사용자 가치**: 발행된 플랜을 상품(아이템) 단위로 노출 제어, 가격/설명/이미지 수정, 판매 중지/재개
- **화면**: `market_item_edit_screen.dart` + `MarketItemController.getMyItems` 기반 내 아이템 관리
- **API**:
  - `POST /api/v1/market/items` (MarketItemController.createItem)
  - `PUT /api/v1/market/items/{itemId}` (MarketItemController.updateItem)
  - `POST /api/v1/market/items/{itemId}/publish` (MarketItemController.publishItem)
  - `POST /api/v1/market/items/{itemId}/stop` (MarketItemController.stopSelling)
  - `DELETE /api/v1/market/items/{itemId}` (MarketItemController.removeItem)
  - `GET /api/v1/market/items/my` (MarketItemController.getMyItems)
- **컨트롤러**: MarketItemController

#### F08-07. 크리에이터 프로필 / 내 통계
- **사용자 가치**: 크리에이터로서 등록 플랜 수, 평균 별점, 총 판매·매출 등 자신의 활동 성과를 확인 (본인 프로필이면 통계 섹션 추가)
- **화면**: SCR-MK-004 / `creator_profile_screen.dart`, `creator_stats_screen.dart`
- **API**:
  - `GET /api/v1/creators/{creatorId}` (CreatorController.getCreatorProfile, 공개 프로필 + 판매 아이템)
  - `GET /api/v1/creators/me/stats` (CreatorController.getMyStats, 본인만)
- **컨트롤러**: CreatorController

---

### B. 구매자 (탐색·구매·활용·리뷰)

#### F08-08. 마켓 메인 탐색 (카테고리 / 인기 / 최신)
- **사용자 가치**: 마켓 진입 시 카테고리 필터, 인기 플랜 가로 스크롤, 최신 플랜 무한 스크롤로 새 플랜을 발견
- **화면**: SCR-MK-001 / `market_main_screen.dart`, `popular_plans_screen.dart`, `widgets/market_item_card.dart`, `widgets/price_tag.dart`
- **API**:
  - `GET /api/v1/market/categories` (MarketCategoryController.getCategories, 트리)
  - `GET /api/v1/market/items/popular?limit=` (MarketSearchController.getPopularItems, 최대 50)
  - `GET /api/v1/market/items` (MarketItemController.getMarketItems, 카테고리 필터 등 PageResponse)
- **컨트롤러**: MarketCategoryController, MarketSearchController, MarketItemController

#### F08-09. 마켓 검색
- **사용자 가치**: 키워드/정렬로 플랜을 검색해 원하는 콘셉트의 코스를 빠르게 찾기
- **화면**: `market_search_screen.dart`
- **API**:
  - `GET /api/v1/market/search` (MarketSearchController.searchItems, MarketSearchParam)
- **컨트롤러**: MarketSearchController

#### F08-10. 마켓 아이템 상세 (커버 / 설명 / 크리에이터 / 리뷰 / 번들)
- **사용자 가치**: 구매 결정에 필요한 모든 정보(이미지, 설명, 크리에이터, 평점, 리뷰, 번들 옵션)를 한 화면에서 확인
- **화면**: SCR-MK-002 / `market_item_detail_screen.dart`
- **API**:
  - `GET /api/v1/market/items/{itemId}` (MarketItemController.getMarketItem)
  - `GET /api/v1/market/items/{itemId}/reviews` (MarketItemReviewController.getReviews, PageResponse)
  - `GET /api/v1/market/items/{itemId}/bundles` (BundleController.listBundlesForItem)
  - `GET /api/v1/market/bundles/{bundleId}` (BundleController.getBundleDetail)
  - `GET /api/v1/market/bundles` (BundleController.listActiveBundles)
- **컨트롤러**: MarketItemController, MarketItemReviewController, BundleController

#### F08-11. 아이템·번들·플랜 구매 (포인트 결제)
- **사용자 가치**: 단일 아이템 / 묶음 번들 / 플랜 단위로 포인트로 즉시 결제하여 보유함에 추가
- **화면**: SCR-MK-002 구매 바텀시트 (`market_item_detail_screen.dart` 내), SCR-PE-005 플랜 구매
- **API**:
  - `POST /api/v1/market/items/{itemId}/purchase` (MarketPurchaseController.purchaseItem)
  - `POST /api/v1/market/bundles/{bundleId}/purchase` (MarketPurchaseController.purchaseBundle)
  - `POST /api/v1/plans/{planId}/purchase` (PlanController.purchasePlan, 플랜 직접 구매)
- **에러 분기**: 400 INSUFFICIENT_BALANCE, 409 ALREADY_PURCHASED, 409 PARTIAL_ALREADY_PURCHASED
- **컨트롤러**: MarketPurchaseController, PlanController

#### F08-12. 내 컬렉션 (보유함 / 활성화 / 만료 관리)
- **사용자 가치**: 구매한 모든 플랜을 보관·필터링(전체/활성/비활성)하고, 비활성 아이템을 활성화하거나 만료 임박 알림으로 갱신을 챙김
- **화면**: SCR-MK-003 / `my_collection_screen.dart`
- **API**:
  - `GET /api/v1/market/collection?active=` (CollectionController.getMyCollection / getActiveCollection)
  - `POST /api/v1/market/collection/{id}/activate` (CollectionController.activateItem)
  - `GET /api/v1/market/collection/expiring` (CollectionController.getExpiringItems)
- **연결 화면**: SCR-PE-002 미리보기, `plan_preview_screen.dart` (구매한 플랜 열람)
- **API (연결)**: `GET /api/v1/plans/{planId}/preview` (PlanController.getPreview)
- **컨트롤러**: CollectionController, PlanController

#### F08-13. 구매 플랜 → 이벤트 생성 / 리뷰 작성
- **사용자 가치**: 구매한 플랜을 실제 모임으로 옮겨(이벤트 자동 생성) 활용하고, 사용 후 별점·리뷰를 남겨 다른 사용자에게 도움 제공
- **화면**:
  - 이벤트 생성: `plan_event_create_screen.dart` + SCR-PE-002 "이 플랜으로 이벤트 만들기" 버튼
  - 리뷰 작성: SCR-MK-002 리뷰 섹션 + `widgets/market_review_write_dialog.dart`
- **API**:
  - `POST /api/v1/plans/{planId}/create-event` (PlanController.createEventFromPlan, PlanEventAddParam)
  - `POST /api/v1/market/items/{itemId}/reviews` (MarketItemReviewController.createReview)
  - `PUT /api/v1/market/items/{itemId}/reviews/{reviewId}` (MarketItemReviewController.updateReview)
  - `DELETE /api/v1/market/items/{itemId}/reviews/{reviewId}` (MarketItemReviewController.deleteReview)
- **에러 분기**: 403 PLAN_NOT_OWNED (이벤트 생성)
- **컨트롤러**: PlanController, MarketItemReviewController

---

## 5. 상태/권한/의존성

### 외부 단위 의존

- **06 결제 & 지갑**: 포인트 결제 (잔액 부족 시 충전 화면 이동), `INSUFFICIENT_BALANCE` 처리
- **03 이벤트**: F08-13의 "이 플랜으로 이벤트 만들기" → 이벤트 편집 화면 진입
- **11 리뷰 & 신고**: F08-13의 마켓 아이템 리뷰는 본 단위(`MarketItemReview`)에서 직접 관리하지만, 신고 흐름은 11 단위 호출
- **횡단 인프라**: 파일 업로드(커버 이미지/블록 이미지), DioClient 인터셉터, GoRouter

## 6. 화면/API 매핑

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F08-07](../02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | F08-07. 크리에이터 프로필 / 내 통계 | 7 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-03](../02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | F08-03. 블록 에디터 (블록 CRUD) | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-09](../02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | F08-09. 마켓 검색 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-10](../02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | F08-10. 마켓 아이템 상세 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-11](../02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | F08-11. 아이템·번들·플랜 구매 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-12](../02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | F08-12. 내 컬렉션 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-05](../02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | F08-05. 플랜 발행 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-04](../02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | F08-04. 블록 드래그 재정렬 / 계층 이동 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-06](../02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | F08-06. 마켓 아이템 관리 (등록/수정/판매중지) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-08](../02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | F08-08. 마켓 메인 탐색 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-13](../02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | F08-13. 구매 플랜 이벤트 생성 / 리뷰 작성 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F08-01](../02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | F08-01. 내 플랜 목록 관리 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
