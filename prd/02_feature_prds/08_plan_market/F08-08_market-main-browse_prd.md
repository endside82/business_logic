# F08-08. 마켓 메인 탐색 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

마켓 메인 진입 시 카테고리 트리 / 인기 아이템 / 최신 아이템 페이지를 한 번에 노출하기 위한 3개의 GET 엔드포인트를 제공한다. 모두 비로그인 접근 가능하며, 카테고리·정렬·가격 필터를 통해 사용자가 다양한 관점에서 플랜을 발견하도록 돕는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 바의 "플래너/마켓" 진입 버튼 (홈 또는 별도 탭)
- 홈 메인 피드의 "마켓" 카드/배너 → `context.push('/market')`
- 다른 화면에서 `Routes.planMarket` (`/market`)로 진입
- 카테고리 정렬 후 카드 탭 → F08-10 아이템 상세
- "전체보기" → F08-08 인기 플랜 전체 화면

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MarketCategoryController`, `MarketSearchController`, `MarketItemController`, `ItemType`, `ItemStatus`, `CurrencyType`, `PeriodType`. 앱: `market_main_screen.dart`, `popular_plans_screen.dart`.

<!-- source-references:start -->
서버 창구: `MarketCategoryController#getCategories`, `MarketSearchController#getPopularItems`, `MarketItemController#getMarketItems`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 시:
   - `marketCategoriesNotifierProvider` ▶ `MarketRepository.getCategories()` ▶ `GET /api/v1/market/categories`
   - `popularItemsNotifierProvider` ▶ `MarketRepository.getPopularItems(limit: 10)` ▶ `GET /api/v1/market/items/popular?limit=10`
   - `_loadLatestItems()` ▶ `MarketRepository.getMarketItems(itemType, sort, minPrice, maxPrice, page, size)` ▶ `GET /api/v1/market/items?...`
2. 카테고리 변경 시: `_loadLatestItems()` 재호출 (page=0부터)
3. 정렬/필터 변경 시: 동일하게 `_loadLatestItems()` 재호출
4. 무한 스크롤: `_loadMoreLatest()` ▶ 같은 API에 `page++`로 호출 → 결과 누적
5. 카드 탭: 라우터 push만 (이 화면 내 추가 API 호출 없음)

## 4. 제품 규칙

- 정렬은 최신, 인기, 낮은 가격, 높은 가격 넷이다. 가격 필터는 0~100,000P 를 5,000P 단위로 고른다.
- 카테고리 칩의 맨 앞은 "추천"이다. 인기 플랜은 10개까지 가로로 보여 주고 "전체보기"로 넘어간다.
- 최근 본 플랜은 이 기기에만 저장한다.
- 카테고리와 인기 섹션은 실패해도 조용히 비우고, 최신 목록이 실패하면 "플랜을 불러오지 못했습니다"를 띄운다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 진입 — 인기 플랜을 둘러보고 카테고리로 좁혀 들어감 (Happy Path) | 로그인됨, 마켓 진입 이력 없음. | 사용자가 카테고리별 인기/최신 플랜 6~10개 카드를 둘러봄. 백엔드 변경 없음. |
| S2 | 정렬/가격 필터 조합 사용 | 마켓 메인 진입 완료. | 사용자 화면에 인기순 + 5만 원 이하 플랜만 표시됨. |
| S3 | 빈 결과 / 네트워크 에러 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 인기 플랜 전체보기 | 인기 가로 스크롤 6개 너머의 플랜도 보고 싶은 사용자. | 인기 플랜 N개 전체 리스트 확인. |
| S5 | 비로그인 사용자의 탐색 | 앱 설치 후 로그인하지 않은 사용자. | 비로그인 상태에서도 발견·탐색 흐름까지 도달. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:62 | - **비즈니스 로직**: `MarketItemService.getPopularItems(limit)` — 일반적으로 `purchaseCount` 기준 정렬, `ON_SALE` 상태만 노출 (서비스 구현 미확인 — 컨트롤러까지만 추적). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:83 | - **비즈니스 로직**: `MarketItemService.getMarketItems(searchParam)` — `ItemStatus.ON_SALE` 한정 + 필터/정렬 적용 후 페이지 반환 (서비스 구현 미확인). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 진입 — 인기 플랜을 둘러보고 카테고리로 좁혀 들어감 (Happy Path)**: Given 로그인됨, 마켓 진입 이력 없음. When 사용자가 해당 흐름을 실행하면 Then 사용자가 카테고리별 인기/최신 플랜 6~10개 카드를 둘러봄. 백엔드 변경 없음.
- **AC-02. 정렬/가격 필터 조합 사용**: Given 마켓 메인 진입 완료. When 사용자가 해당 흐름을 실행하면 Then 사용자 화면에 인기순 + 5만 원 이하 플랜만 표시됨.
- **AC-03. 빈 결과 / 네트워크 에러**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 인기 플랜 전체보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 인기 플랜 N개 전체 리스트 확인.
- **AC-05. 비로그인 사용자의 탐색**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 비로그인 상태에서도 발견·탐색 흐름까지 도달.
