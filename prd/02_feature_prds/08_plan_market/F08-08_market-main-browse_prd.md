# F08-08. 마켓 메인 탐색 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-08_market-main-browse -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-08_market-main-browse`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

마켓 메인 진입 시 카테고리 트리 / 인기 아이템 / 최신 아이템 페이지를 한 번에 노출하기 위한 3개의 GET 엔드포인트를 제공한다. 모두 비로그인 접근 가능하며, 카테고리·정렬·가격 필터를 통해 사용자가 다양한 관점에서 플랜을 발견하도록 돕는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 바의 "플래너/마켓" 진입 버튼 (홈 또는 별도 탭)
- 홈 메인 피드의 "마켓" 카드/배너 → `context.push('/market')`
- 다른 화면에서 `Routes.planMarket` (`/market`)로 진입
- 카테고리 정렬 후 카드 탭 → F08-10 아이템 상세
- "전체보기" → F08-08 인기 플랜 전체 화면

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-08_market-main-browse/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-08_market-main-browse/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-08_market-main-browse/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-08_market-main-browse/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/MarketCategoryController.java:22` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:28` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketSearchController.java:29` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시:
   - `marketCategoriesNotifierProvider` ▶ `MarketRepository.getCategories()` ▶ `GET /api/v1/market/categories`
   - `popularItemsNotifierProvider` ▶ `MarketRepository.getPopularItems(limit: 10)` ▶ `GET /api/v1/market/items/popular?limit=10`
   - `_loadLatestItems()` ▶ `MarketRepository.getMarketItems(itemType, sort, minPrice, maxPrice, page, size)` ▶ `GET /api/v1/market/items?...`
2. 카테고리 변경 시: `_loadLatestItems()` 재호출 (page=0부터)
3. 정렬/필터 변경 시: 동일하게 `_loadLatestItems()` 재호출
4. 무한 스크롤: `_loadMoreLatest()` ▶ 같은 API에 `page++`로 호출 → 결과 누적
5. 카드 탭: 라우터 push만 (이 화면 내 추가 API 호출 없음)

## 4. 서버 계약

### 개요

마켓 메인 진입 시 카테고리 트리 / 인기 아이템 / 최신 아이템 페이지를 한 번에 노출하기 위한 3개의 GET 엔드포인트를 제공한다. 모두 비로그인 접근 가능하며, 카테고리·정렬·가격 필터를 통해 사용자가 다양한 관점에서 플랜을 발견하도록 돕는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/market/categories | MarketCategoryController#getCategories | unauthenticated 가능 | 마켓 카테고리 트리 반환 |
| GET | /api/v1/market/items/popular | MarketSearchController#getPopularItems | unauthenticated 가능 | 인기 아이템 N개 반환 (가로 스크롤용) |
| GET | /api/v1/market/items | MarketItemController#getMarketItems | unauthenticated 가능 | 페이지 단위 마켓 아이템 목록 (필터·정렬) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `ItemType` (`constants/ItemType.java`): `PLAN`, `EVENT_PACKAGE`, `VIRTUAL_ITEM`, `SUBSCRIPTION`
- **Enum** `ItemStatus` (`constants/ItemStatus.java`): `READY`, `ON_SALE`, `STOP_SELLING`, `REMOVED`
- **Enum** `CurrencyType` (`constants/CurrencyType.java`): `PAID_POINT(0)`, `FREE_POINT(1)`, `ANY_POINT(2)`
- **Enum** `PeriodType` (`constants/PeriodType.java`): `NONE`, `DAY`, `MONTH`, `YEAR`, `EXPIRATION`
- **VO** `MarketItemVo`: 위 응답 섹션 참조
- **VO** `MarketCategoryVo`: 위 응답 섹션 참조

### 의존 단위 / 외부 시스템

- 외부 호출 없음 (PG / FCM / S3 미사용)
- 다른 Unit 의존 없음 — 마켓 도메인 내부만 사용
- 카드 탭 시 F08-10 (아이템 상세), 검색 진입 시 F08-09 (마켓 검색)으로 이동

## 5. 프론트 계약

### 진입 경로

- 하단 탭 바의 "플래너/마켓" 진입 버튼 (홈 또는 별도 탭)
- 홈 메인 피드의 "마켓" 카드/배너 → `context.push('/market')`
- 다른 화면에서 `Routes.planMarket` (`/market`)로 진입
- 카테고리 정렬 후 카드 탭 → F08-10 아이템 상세
- "전체보기" → F08-08 인기 플랜 전체 화면

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/market` | `presentation/market/screens/market_main_screen.dart` | 마켓 메인 탐색 (카테고리·인기·최신) |
| `/market/popular` | `presentation/market/screens/popular_plans_screen.dart` | 인기 플랜 전체보기 |

### 화면별 구성 요소 & 액션

### 마켓 메인 (`market_main_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '플랜 마켓')` — 상단 타이틀
  - `AppSearchBar(hint: '플랜 검색')` — 상단 검색 바 (탭/엔터 시 검색 화면으로 이동)
  - 가로 스크롤 카테고리 칩 row (`_CategoryChip`) — "추천" + 서버에서 받은 카테고리들
  - "인기 플랜" 섹션 — 가로 스크롤 (`PopularItemCard` 112×170, 최대 10개) + "전체보기" 액션
  - "최근 본 플랜" 섹션 — 로컬 저장된 최근 본 플랜 가로 스크롤 (`recentlyViewedItemsProvider`)
  - "최신 플랜" 헤더 + 정렬 드롭다운 (`최신/인기/낮은 가격/높은 가격`) + 가격 필터 버튼 (`Icons.tune`)
  - 2-column grid (`MarketItemGridCard` 175×200) — 무한 스크롤
  - 무한 스크롤 하단 로딩 인디케이터
- **사용자가 할 수 있는 액션**:
  - 검색 바 엔터 ▶ `context.push('/market/search?keyword=$query')`
  - 카테고리 칩 탭 ▶ `_selectedCategory` 변경 → `_loadLatestItems()` 재호출 → `GET /api/v1/market/items?itemType=...`
  - 정렬 드롭다운 변경 ▶ `_sort` 변경 → `_loadLatestItems()` 재호출 (서버 sort 키: `LATEST | POPULAR | PRICE_ASC | PRICE_DESC`)
  - 가격 필터 버튼 탭 ▶ `_PriceFilterSheet` 바텀시트 표시 → RangeSlider (0 ~ 100,000P, 20 divisions) → 적용/초기화
  - "인기 플랜 전체보기" 탭 ▶ `context.push('/market/popular')`
  - 카드 탭 ▶ `context.push('/market/items/${item.itemId}')` (F08-10)
  - 풀투리프레시 ▶ `popularItemsNotifierProvider`/`marketCategoriesNotifierProvider` invalidate + `_loadLatestItems()`
  - 무한 스크롤 (200px 임계값) ▶ `_loadMoreLatest()` → `page++` 호출
- **상태 분기**:
  - 로딩: 카테고리/인기 섹션은 빈 SizedBox (skeleton 없음), 최신 섹션은 무한 스크롤 추가 로딩만 `CircularProgressIndicator`
  - 에러: 카테고리/인기 섹션은 silent, 최신 섹션 실패 시 `AppToast.show('플랜을 불러오지 못했습니다', ToastType.error)`
  - 빈 상태 (최신 0건): `AppErrorState(title: '등록된 플랜이 없습니다')` (현 구현은 ErrorState로 표시)
- **모달/시트**:
  - `_PriceFilterSheet` — `showModalBottomSheet` (배경 `AppSemanticColors.surfaceCard`, 상단 16 둥근모서리)

### 인기 플랜 전체보기 (`popular_plans_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '인기 플랜')`
  - `MarketItemGridCard` 세로 리스트 (높이 200, 12px 간격)
- **사용자가 할 수 있는 액션**:
  - 카드 탭 ▶ `context.push('/market/items/${item.itemId}')`
  - 풀투리프레시 ▶ `popularItemsNotifierProvider` invalidate
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `AppErrorState.fromError(error: error, onRetry: ...)`
  - 빈 상태: `AppErrorState(title: '인기 플랜이 없습니다')`

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시:
   - `marketCategoriesNotifierProvider` ▶ `MarketRepository.getCategories()` ▶ `GET /api/v1/market/categories`
   - `popularItemsNotifierProvider` ▶ `MarketRepository.getPopularItems(limit: 10)` ▶ `GET /api/v1/market/items/popular?limit=10`
   - `_loadLatestItems()` ▶ `MarketRepository.getMarketItems(itemType, sort, minPrice, maxPrice, page, size)` ▶ `GET /api/v1/market/items?...`
2. 카테고리 변경 시: `_loadLatestItems()` 재호출 (page=0부터)
3. 정렬/필터 변경 시: 동일하게 `_loadLatestItems()` 재호출
4. 무한 스크롤: `_loadMoreLatest()` ▶ 같은 API에 `page++`로 호출 → 결과 누적
5. 카드 탭: 라우터 push만 (이 화면 내 추가 API 호출 없음)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 진입 — 인기 플랜을 둘러보고 카테고리로 좁혀 들어감 (Happy Path) | 로그인됨, 마켓 진입 이력 없음. | 사용자가 카테고리별 인기/최신 플랜 6~10개 카드를 둘러봄. 백엔드 변경 없음. |
| S2 | 정렬/가격 필터 조합 사용 | 마켓 메인 진입 완료. | 사용자 화면에 인기순 + 5만 원 이하 플랜만 표시됨. |
| S3 | 빈 결과 / 네트워크 에러 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 인기 플랜 전체보기 | 인기 가로 스크롤 6개 너머의 플랜도 보고 싶은 사용자. | 인기 플랜 N개 전체 리스트 확인. |
| S5 | 비로그인 사용자의 탐색 | 앱 설치 후 로그인하지 않은 사용자. | 비로그인 상태에서도 발견·탐색 흐름까지 도달. |

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
| 후보 | backend.md:62 | - **비즈니스 로직**: `MarketItemService.getPopularItems(limit)` — 일반적으로 `purchaseCount` 기준 정렬, `ON_SALE` 상태만 노출 (서비스 구현 미확인 — 컨트롤러까지만 추적). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:83 | - **비즈니스 로직**: `MarketItemService.getMarketItems(searchParam)` — `ItemStatus.ON_SALE` 한정 + 필터/정렬 적용 후 페이지 반환 (서비스 구현 미확인). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 진입 — 인기 플랜을 둘러보고 카테고리로 좁혀 들어감 (Happy Path)**: Given 로그인됨, 마켓 진입 이력 없음. When 사용자가 해당 흐름을 실행하면 Then 사용자가 카테고리별 인기/최신 플랜 6~10개 카드를 둘러봄. 백엔드 변경 없음.
- **AC-02. 정렬/가격 필터 조합 사용**: Given 마켓 메인 진입 완료. When 사용자가 해당 흐름을 실행하면 Then 사용자 화면에 인기순 + 5만 원 이하 플랜만 표시됨.
- **AC-03. 빈 결과 / 네트워크 에러**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 인기 플랜 전체보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 인기 플랜 N개 전체 리스트 확인.
- **AC-05. 비로그인 사용자의 탐색**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 비로그인 상태에서도 발견·탐색 흐름까지 도달.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
