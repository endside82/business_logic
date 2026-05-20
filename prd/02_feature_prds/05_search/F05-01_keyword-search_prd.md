# F05-01. 키워드 검색 (이벤트/클럽/플랜) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/05_search/F05-01_keyword-search -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/05_search/F05-01_keyword-search`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 입력한 키워드와 정렬·페이징 파라미터로 **이벤트**, **클럽**, **플랜** 세 도메인을 각각 무한 스크롤(20건) 단위로 검색한다. 인증 사용자가 키워드를 동반하여 검색하면 컨트롤러가 `SearchHistoryService.record`를 호출해 Redis 검색 기록(F05-04)에 자동 저장한다. 결과 카드의 클릭 후 진입 동작(이벤트 상세, 클럽 상세, 플랜 상세)은 본 Unit 범위 밖이며 각각의 도메인 Unit에서 다룬다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 2번째 "검색" → `/search`
- 알림 → 트렌딩 키워드 칩 탭(F05-02)
- 최근 검색어 항목 탭(F05-04)
- 저장된 검색 실행(F05-05) → 키워드 + 필터 프리셋으로 자동 검색
- 검색 결과 화면 내 자동완성 항목 탭(F05-02)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/05_search/F05-01_keyword-search/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/05_search/F05-01_keyword-search/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/05_search/F05-01_keyword-search/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/05_search/F05-01_keyword-search/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:40` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:53` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:64` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### Provider 체인
- `searchApiProvider` (`@Riverpod(keepAlive: true)`) → `Retrofit SearchApi`
- `savedSearchApiProvider` → `Retrofit SavedSearchApi` (F05-05 사용)
- `searchRepositoryProvider` → 두 API 모두 주입한 `SearchRepository` (`Result<T>` 래핑)
- `searchNotifierProvider` (`@Riverpod(keepAlive: true)`, `class SearchNotifier extends _$SearchNotifier`) — 이벤트 검색 상태 + 무한 스크롤
- `searchClubsNotifierProvider` / `searchPlansNotifierProvider` (`@riverpod`, auto-dispose) — 각 도메인 보조 검색
- `searchHistoryNotifierProvider` — 검색 직후 invalidate (F05-04)

### 검색 실행 시
1. `_onSearch(keyword)` → `searchNotifierProvider.search(keyword)`
   - 내부: `_filter.radiusKm != null` + lat/lng 비어 있으면 `locationPermissionNotifierProvider.getCurrentPosition()` 보충 (5분 캐시)
   - `repo.searchEvents(...)` → `GET /api/v1/search?keyword=&categories=&...&page=0&size=20`
   - `success` → `_items = pageResponse.content`, `_totalElements = pageResponse.totalElements`, `_hasMore = !pageResponse.last`
2. `searchClubsNotifierProvider.search(keyword)` → `GET /api/v1/search/clubs?keyword=&page=0&size=20`
3. `searchPlansNotifierProvider.search(keyword)` → `GET /api/v1/search/plans?keyword=&page=0&size=20`
4. `searchHistoryNotifierProvider.refresh()` → `GET /api/v1/search/history` 재조회

### 정렬 변경 / 필터 변경 시
- `setSortType(sortType)` 또는 `setFilter(filter)` → `_reSearch()` (page=0부터 재호출). 키워드가 비어 있으면 호출하지 않는다.

### 무한 스크롤
- `loadMore()` → `_isLoadingMore` 가드 + `_hasMore` 체크 후 `_fetchPage(_currentPage + 1)` → `_items = [..._items, ...newPage.content]`
- 클럽/플랜 탭은 화면 단에서 `loadMore()` 호출이 연결되어 있지 않으나(이벤트 `_scrollController`만 등록), Provider에는 구현되어 있다.

## 4. 서버 계약

### 개요

사용자가 입력한 키워드와 정렬·페이징 파라미터로 **이벤트**, **클럽**, **플랜** 세 도메인을 각각 무한 스크롤(20건) 단위로 검색한다. 인증 사용자가 키워드를 동반하여 검색하면 컨트롤러가 `SearchHistoryService.record`를 호출해 Redis 검색 기록(F05-04)에 자동 저장한다. 결과 카드의 클릭 후 진입 동작(이벤트 상세, 클럽 상세, 플랜 상세)은 본 Unit 범위 밖이며 각각의 도메인 Unit에서 다룬다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/search` | `SearchController#searchEvents` | optional | 이벤트 검색 + 키워드 자동 기록 |
| GET | `/api/v1/search/clubs` | `SearchController#searchClubs` | optional | 클럽 검색 (ACTIVE 한정) + 키워드 자동 기록 |
| GET | `/api/v1/search/plans` | `SearchController#searchPlans` | optional | 플랜 마켓 published 상품 검색 + 키워드 자동 기록 |

> 동일 컨트롤러의 `/suggest`, `/history`, `/filter-hints`는 다른 기능에서 다룬다 (F05-02, F05-03, F05-04). `/trending`은 Unit 02 소관.

### 도메인 모델 / Enum (이 기능 관련)

- **`SearchVo`** (`vo/SearchVo.java`) — 위 `GET /api/v1/search` 응답 참조
- **`SortType`** (`constants/SortType.java`):
  - `LATEST(0)` — `event.startTime DESC` (기본값)
  - `POPULAR(1)` — `event.currentCapacity DESC`
  - `PRICE_ASC(2)` — `event.price ASC`
  - `PRICE_DESC(3)` — `event.price DESC`
  - `RECOMMEND(4)` — 미래 이벤트만 + (시간근접성 → 인기도 → 최신순) 다중 정렬
- **`Category`** enum (Unit 03 / `event.constants.Category`): `BOARD_GAME, HIKING, COOKING, BOOK_CLUB, SPORTS, MUSIC, ART, LANGUAGE, TECH, SOCIAL, TRAVEL, PHOTOGRAPHY, FOOD, FITNESS, OTHER` (코드 정수 0~13, 99)
- **`EventStatus`** (Unit 03): 검색은 `OPEN` 상태만 노출
- **뷰어 컨텍스트 enum 문자열** (`ViewerContextService`):
  - `membershipStatus`: `ACTIVE` / `BANNED` / `PENDING` / `NONE` / null(클럽 없는 이벤트)
  - `myAttendanceStatus`: 실제 attendance status, 또는 `ATTENDING` (APPROVED 신청), `PENDING_APPLICATION`, `ENDED`, `NOT_ATTENDING`

### 의존 단위 / 외부 시스템

- **다른 Unit 의존**:
  - Unit 03 (Event): `Event` 엔티티, `Category`, `EventStatus`, `Application`, `EventAttendance`
  - Unit 04 (Club): `ClubSearchParam`, `ClubSimpleVo`, `ClubQueryRepository`, `ClubMember`, `ClubMemberWait`
  - Unit 08 (Plan): `PlanService`, `PlanSimpleVo`
  - Unit 11 (Review): `ReviewQueryRepository.findAverageRatingsByHostUserIds`
  - Unit 12 (Notification): 본 기능 자체에서는 호출 없음 (저장검색 스케줄러 F05-05에서만)
- **외부 시스템**: Redis (캐시 `eventSearch` + 검색기록 list)
- **호출됨**: F05-05 저장 검색 실행 → 동일 `EventSearchParam`을 역직렬화하여 본 검색 호출

## 5. 프론트 계약

### 진입 경로

- 하단 탭 2번째 "검색" → `/search`
- 알림 → 트렌딩 키워드 칩 탭(F05-02)
- 최근 검색어 항목 탭(F05-04)
- 저장된 검색 실행(F05-05) → 키워드 + 필터 프리셋으로 자동 검색
- 검색 결과 화면 내 자동완성 항목 탭(F05-02)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/search` | `lib/presentation/search/screens/search_screen.dart` | 검색 메인. 입력/제안/결과/탭 전환 |
| `/search/results?q=...` | (redirect) | `/search`로 리다이렉트하면서 쿼리 유지 |
| `/search/categories?q=...` | (redirect) | 동일 |

> 결과 카드 클릭 후 진입은 다른 Unit이다:
> - 이벤트 카드: `/home/events/:id` (Unit 03)
> - 클럽 카드: `/clubs/:id` (Unit 04)
> - 플랜 카드: `/home/market/plan-detail/:id` (Unit 08)

### 화면별 구성 요소 & 액션

### `SearchScreen` (`search_screen.dart`)
- **사용자가 보는 것**:
  1. 상단 `SearchAppBar` — 텍스트 입력, X(클리어), 필터 아이콘(`Icons.tune`, 활성 필터 시 primary500 + 점 표시), 북마크(검색했을 때만), 취소 텍스트 버튼
  2. 활성 필터가 있으면 `ActiveFilterChipBar` (검색바 하단, 가로 스크롤, 초기화 + 개별 칩)
  3. **Idle 상태** (검색 안 했을 때): "저장된 검색 보기" 단축 → `/search/saved`, "최근 검색어" 섹션(`SearchHistoryItem` × N + "전체 삭제"), `TrendingKeywordChips` (Unit 02)
  4. **검색 후**:
     - 결과 타입 탭 (`이벤트 N` / `클럽 N` / `플랜 N`) — primary500 chip 강조
     - 이벤트 탭: `SearchResultSummary` (총 N건 + 정렬 드롭다운) + `EventCard` 리스트 + `EventViewerBadge`
     - 클럽 탭: `_ClubResultCard` (썸네일 + 이름 + 카테고리 + 멤버 수)
     - 플랜 탭: `_PlanResultCard` (썸네일 + 제목 + 크리에이터 + 가격/구매수)
  5. 자동완성 활성 시 `SuggestDropdown` 오버레이 (F05-02)
- **사용자가 할 수 있는 액션**:
  - 키워드 입력 + 엔터 / 제안 항목 탭 / 트렌딩 키워드 탭 / 최근 검색어 탭
    → `_onSearch(keyword)`: 동시에 3개 검색 호출 (`searchNotifierProvider.search`, `searchClubsNotifierProvider.search`, `searchPlansNotifierProvider.search`) + 검색 기록 새로고침
  - 정렬 드롭다운 변경 → `searchNotifierProvider.setSortType(sortType)` → 0페이지부터 재호출
  - 결과 카드 탭 → 각 도메인 상세 라우트로 push/go
  - 무한 스크롤: `_scrollController` 가 maxScroll-200 이하에서 `searchNotifierProvider.loadMore()` 호출 (이벤트 탭 한정)
  - 풀투리프레시 → `notifier.search(keyword)` 재호출 (이벤트 탭 한정)
  - 취소 버튼 → 입력/제안 클리어 + unfocus
  - 필터 아이콘 → `SearchFilterSheet.show` (F05-03)
  - 북마크 아이콘 → `SaveSearchDialog` (F05-05)
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.card, count: 4)` (이벤트/클럽/플랜 탭 모두)
  - 에러 (이벤트 탭): 아이콘 + "오류가 발생했습니다" + "다시 시도" `TextButton` → `notifier.search(keyword)` 재호출
  - 에러 (클럽/플랜 탭): `SearchEmptyState`로 동일 표시 (분리된 에러 UI 없음)
  - 빈 결과: `SearchEmptyState` ("검색 결과가 없습니다" + "다른 키워드로 검색해보세요" 안내, `Icons.search_off_outlined` × 64)
- **모달/시트/네비게이션**:
  - 필터 시트 (`showModalBottomSheet`, `DraggableScrollableSheet 0.85`)
  - 저장 다이얼로그 (`showDialog`)
  - 결과 카드는 `context.go` (이벤트), `context.go` (클럽), `context.push` (플랜) — 플랜만 push로 스택 유지

### API 호출 순서 (Provider/Repository 관점)

### Provider 체인
- `searchApiProvider` (`@Riverpod(keepAlive: true)`) → `Retrofit SearchApi`
- `savedSearchApiProvider` → `Retrofit SavedSearchApi` (F05-05 사용)
- `searchRepositoryProvider` → 두 API 모두 주입한 `SearchRepository` (`Result<T>` 래핑)
- `searchNotifierProvider` (`@Riverpod(keepAlive: true)`, `class SearchNotifier extends _$SearchNotifier`) — 이벤트 검색 상태 + 무한 스크롤
- `searchClubsNotifierProvider` / `searchPlansNotifierProvider` (`@riverpod`, auto-dispose) — 각 도메인 보조 검색
- `searchHistoryNotifierProvider` — 검색 직후 invalidate (F05-04)

### 검색 실행 시
1. `_onSearch(keyword)` → `searchNotifierProvider.search(keyword)`
   - 내부: `_filter.radiusKm != null` + lat/lng 비어 있으면 `locationPermissionNotifierProvider.getCurrentPosition()` 보충 (5분 캐시)
   - `repo.searchEvents(...)` → `GET /api/v1/search?keyword=&categories=&...&page=0&size=20`
   - `success` → `_items = pageResponse.content`, `_totalElements = pageResponse.totalElements`, `_hasMore = !pageResponse.last`
2. `searchClubsNotifierProvider.search(keyword)` → `GET /api/v1/search/clubs?keyword=&page=0&size=20`
3. `searchPlansNotifierProvider.search(keyword)` → `GET /api/v1/search/plans?keyword=&page=0&size=20`
4. `searchHistoryNotifierProvider.refresh()` → `GET /api/v1/search/history` 재조회

### 정렬 변경 / 필터 변경 시
- `setSortType(sortType)` 또는 `setFilter(filter)` → `_reSearch()` (page=0부터 재호출). 키워드가 비어 있으면 호출하지 않는다.

### 무한 스크롤
- `loadMore()` → `_isLoadingMore` 가드 + `_hasMore` 체크 후 `_fetchPage(_currentPage + 1)` → `_items = [..._items, ...newPage.content]`
- 클럽/플랜 탭은 화면 단에서 `loadMore()` 호출이 연결되어 있지 않으나(이벤트 `_scrollController`만 등록), Provider에는 구현되어 있다.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **페이지 사이즈**: 이벤트/클럽/플랜 모두 `_pageSize = 20` (Provider 상수)
- **기본 정렬**: 프론트는 `RECOMMEND`로 시작 (`SearchNotifier._defaultSortType`). 서버 디폴트는 `LATEST`이지만 Notifier가 전송 전에 `RECOMMEND`로 강제. 잘못된 sortType은 `RECOMMEND`로 정규화
- **유효 sortType 화이트리스트**: `LATEST, POPULAR, PRICE_ASC, PRICE_DESC, RECOMMEND` (Notifier에서 한 번 더 검증)
- **카테고리 정규화**: 사용자 입력 라벨/value/code를 `ClubCategoryMapper.toApiCode`로 서버 enum 이름으로 변환
- **거리 필터 GPS 보충**: `radiusKm` 만 설정되고 lat/lng가 비어 있으면 `locationPermissionNotifierProvider.getCurrentPosition()` 호출. 5분 캐시. 권한 거부 시 lat/lng null → 서버가 위치 조건 무시(사일런트 무효)
- **결과 타입 탭**: 이벤트/클럽/플랜 3탭은 프론트에서만 분리된 UX. 서버는 별도 엔드포인트로 처리하지만 동일 검색바에서 동시 호출됨
- **카드 갯수 표시**: 이벤트는 서버 `totalElements`, 클럽/플랜은 현재 로드된 길이만 (페이징 무한스크롤 미연결)
- **검색 결과 카드 라우팅**:
  - 이벤트 → `context.go('/home/events/${id}')` (탭 전환됨, 본 Unit 범위 밖)
  - 클럽 → `context.go('/clubs/${id}')` (탭 전환됨)
  - 플랜 → `context.push('/home/market/plan-detail/${id}')` (스택 유지)
- **빈 상태 메시지**: "검색 결과가 없습니다" + "다른 키워드로 검색해보세요" (`SearchEmptyState`)
- **에러 상태**: 이벤트 탭만 명시적 재시도 버튼. 클럽/플랜은 빈 상태로 폴백
- **테스트 식별자**: `TestIds.screenSearch`, `TestIds.screenSearchQueryInput`, `TestIds.screenSearchFilterAction`
- **활성 필터 점 표시**: 필터 아이콘 우상단에 8px 원 (primary500)
- **최근 검색어 노출 갯수**: idle 상태에서 `keywords.take(10)` (서버는 최대 20건 보관)
- **저장된 검색 단축 행**: 항상 idle 화면 최상단에 표시 (저장 0건이어도 비어있지 않음)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 키워드로 이벤트 발견 | 로그인 완료, 홈 탭에 있음 | 이벤트 상세 화면으로 이동. `searchNotifierProvider`는 keepAlive로 결과 유지, 뒤로가기 시 동일한 결과 화면으로 복귀 |
| S2 | 클럽/플랜 탭 전환 | "독서" 검색 직후 이벤트 탭 노출 | 클럽 상세 진입. (탭 전환 자체는 추가 네트워크 비용 없음) |
| S3 | 무한 스크롤 (이벤트 탭만) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 정렬 변경 | 시나리오 본문 참조 | 동일 키워드 + 새 정렬 결과. `_currentPage` = 0으로 리셋 |
| S5 | 빈 결과 | 시나리오 본문 참조 | 사용자가 다른 키워드로 재시도 가능 |
| S6 | 비로그인 검색 | 비로그인. `Routes.publicRoutes`에 `/search` 포함되어 접근 가능 | 비로그인이라 최근 검색어 영역만 비어있고 트렌딩/검색 결과는 정상 |
| S7 | 네트워크 오류 — 이벤트 탭 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 권한별 분기 — 거리 필터 + 위치 권한 거부 | 시나리오 본문 참조 | 사용자에게 별도 안내 없음 — UX 개선 여지 |

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
| 후보 | backend.md:44 | - `distance: Double?` (현재 코드상 매퍼에서 `ignore` — 항상 null) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:86 | - **에러 분기**: (서비스 구현 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. Happy Path — 키워드로 이벤트 발견**: Given 로그인 완료, 홈 탭에 있음 When 사용자가 해당 흐름을 실행하면 Then 이벤트 상세 화면으로 이동. `searchNotifierProvider`는 keepAlive로 결과 유지, 뒤로가기 시 동일한 결과 화면으로 복귀
- **AC-02. 클럽/플랜 탭 전환**: Given "독서" 검색 직후 이벤트 탭 노출 When 사용자가 해당 흐름을 실행하면 Then 클럽 상세 진입. (탭 전환 자체는 추가 네트워크 비용 없음)
- **AC-03. 무한 스크롤 (이벤트 탭만)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 정렬 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 동일 키워드 + 새 정렬 결과. `_currentPage` = 0으로 리셋
- **AC-05. 빈 결과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 키워드로 재시도 가능
- **AC-06. 비로그인 검색**: Given 비로그인. `Routes.publicRoutes`에 `/search` 포함되어 접근 가능 When 사용자가 해당 흐름을 실행하면 Then 비로그인이라 최근 검색어 영역만 비어있고 트렌딩/검색 결과는 정상
- **AC-07. 네트워크 오류 — 이벤트 탭**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 권한별 분기 — 거리 필터 + 위치 권한 거부**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 별도 안내 없음 — UX 개선 여지

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
