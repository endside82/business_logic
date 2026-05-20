# F03-01. 이벤트 발견 & 탐색 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-01_event-discovery -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-01_event-discovery`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

비로그인/로그인 사용자 모두에게 공개된 이벤트(`status=OPEN`) 목록을 검색·필터·정렬해 보여준다. 키워드/카테고리/지역/날짜/가격/거리 조건과 정렬(최신/인기/거리)을 한 엔드포인트로 받고, 상세 페이지에서 호출되는 유사 이벤트 추천과 로그인 사용자 전용 개인화 추천 피드를 별도 엔드포인트로 노출한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 홈 피드 ▶ "이벤트" 탭 또는 5탭 바텀 네비게이션
- 검색 결과 화면에서 이벤트 카테고리 결과
- 클럽 상세 ▶ 이벤트 섹션 (해당 클럽 이벤트 한정)
- 알림 (모임 추천 푸시) ▶ 이벤트 목록 딥링크
- 상세 화면에서 "유사 이벤트" 더보기 ▶ `SimilarEventsScreen`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-01_event-discovery/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-01_event-discovery/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-01_event-discovery/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-01_event-discovery/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:215` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:73` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:92` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시 (`EventListScreen`):
   - `eventListNotifierProvider.build()` ▶ `EventRepository.searchEvents(_filter)` ▶ `GET /api/v1/events`
2. 사용자가 키워드/카테고리/정렬 변경:
   - `EventListNotifier.setKeyword|setCategories|setSortType` ▶ `_filter` 업데이트 + `_reset()` ▶ `ref.invalidateSelf()` ▶ build 재호출 ▶ page=0 재조회
3. 무한 스크롤:
   - `loadMore()` ▶ `_fetchPage(_currentPage + 1)` ▶ `state = AsyncValue.data([..._items, ...newPage])`
4. 유사 이벤트 진입:
   - `similarEventsProvider(eventId).build()` ▶ `EventRepository.getSimilarEvents(id, limit: 5)` ▶ `GET /api/v1/events/{id}/similar`
5. 위시리스트 토글:
   - `WishlistToggle.add(eventId)` ▶ optimistic detail/list patch ▶ `WishlistRepository.add` ▶ `POST /api/v1/events/{id}/wishlist` ▶ 성공 시 `myWishlistNotifier`/`eventDetailNotifier` invalidate.

## 4. 서버 계약

### 개요

비로그인/로그인 사용자 모두에게 공개된 이벤트(`status=OPEN`) 목록을 검색·필터·정렬해 보여준다. 키워드/카테고리/지역/날짜/가격/거리 조건과 정렬(최신/인기/거리)을 한 엔드포인트로 받고, 상세 페이지에서 호출되는 유사 이벤트 추천과 로그인 사용자 전용 개인화 추천 피드를 별도 엔드포인트로 노출한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events | EventController#listOpenEvents | optional | 검색/필터/정렬된 OPEN 이벤트 페이지 |
| GET | /api/v1/events/recommend | EventController#getRecommendations | required | 로그인 사용자 개인화 추천 |
| GET | /api/v1/events/{eventId}/similar | EventController#getSimilarEvents | optional | 상세 화면에서 유사 이벤트 N개 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `EventStatus`: `DRAFT`, `OPEN`, `CLOSED`, `CANCELED`, `HIDDEN` — 목록은 `OPEN` (또는 search service 정책상 OPEN+근접 종료) 위주로 노출.
- **Enum** `Category` (`event/constants/Category.java`): 코드+한글 라벨. `BOARD_GAME(0)`, `HIKING(1)`, `COOKING(2)`, `BOOK_CLUB(3)`, `SPORTS(4)`, `MUSIC(5)`, `ART(6)`, `LANGUAGE(7)`, `TECH(8)`, `SOCIAL(9)`, `TRAVEL(10)`, `PHOTOGRAPHY(11)`, `FOOD(12)`, `FITNESS(13)`, `OTHER(99)`.
- **Enum** `LocationType`: `OFFLINE(0)`, `ONLINE(1)`.
- **Enum** `EventVisibility`: `PUBLIC`, `LINK`, `APPROVAL`, `PRIVATE` — 목록 노출은 `PUBLIC` 위주.
- **Sort 키** (`EventSearchParam.sortType`): `latest`, `popular`, `nearest` — 서버에서 QueryDSL 정렬 분기.

### 의존 단위 / 외부 시스템

- **Unit 05 검색 (search)** — `EventSearchRepository`, `RecommendationService`, `SimilarEventService`, `TrendingService` 모두 search 패키지 자산. 본 단위는 진입점만 노출.
- **Unit 04 클럽** — `clubId`가 있으면 `EventViewerContextService.applyClubEventVisibilityGuard`로 비공개 클럽 이벤트 가림.
- **Unit 11 리뷰** — viewer context에 `myMembershipStatus`/`myRole` 주입 시 클럽/계정 도메인과 교차.
- **Redis** — `TrendingService`가 정렬/추천에 사용 (이 기능은 read-only).
- **외부**: 없음 (목록 조회만).

## 5. 프론트 계약

### 진입 경로

- 홈 피드 ▶ "이벤트" 탭 또는 5탭 바텀 네비게이션
- 검색 결과 화면에서 이벤트 카테고리 결과
- 클럽 상세 ▶ 이벤트 섹션 (해당 클럽 이벤트 한정)
- 알림 (모임 추천 푸시) ▶ 이벤트 목록 딥링크
- 상세 화면에서 "유사 이벤트" 더보기 ▶ `SimilarEventsScreen`

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/event/screens/) | 역할 |
|---|---|---|
| `/home/events` (탭 인덱스 유지) | `event_list_screen.dart` | 이벤트 검색·필터·정렬 목록 |
| `/home/events/:eventId/similar` | `similar_events_screen.dart` | 특정 이벤트의 유사 이벤트 더보기 |

> 이벤트 카드 탭은 모두 `/home/events/:eventId` (F03-02)로 이동. 위시리스트 하트 토글은 F03-11의 provider 호출.

### 화면별 구성 요소 & 액션

### 이벤트 목록 (`event_list_screen.dart`)

- **사용자가 보는 것**:
  - 상단 `AppSearchBar` (키워드 입력)
  - 카테고리 필터 칩 그룹 (전체/SOCIAL/SPORTS/ART/FOOD/TRAVEL/LANGUAGE/TECH/OTHER) — h=32, gap=8, r=100
  - 정렬 행: "총 N개 이벤트" + "최신순/인기순/가까운순 ▾" 드롭다운
  - 이벤트 카드 리스트 (썸네일, 제목, 시작시각, 주소, 인원, 가격, 상태 라벨, 위시리스트 하트, 뷰어 배지)
  - 우하단 FAB (`+` 아이콘) — 로그인 사용자만, primary500 색
  - 빈 상태: "조건에 맞는 이벤트가 없습니다" + 일러스트
  - 무한 스크롤 하단 로더 (페이지 끝 200px 전 prefetch)
- **사용자가 할 수 있는 액션**:
  - 키워드 입력 후 제출 ▶ `setKeyword()` ▶ `EventListNotifier._reset()` ▶ `GET /api/v1/events?keyword=...&page=0`
  - 카테고리 칩 탭 ▶ `setCategories([code])` ▶ 단일 선택 토글 (다시 탭하면 null로 전체 복원)
  - 정렬 드롭다운 탭 ▶ ModalBottomSheet ▶ `setSortType('latest'|'popular'|'nearest')`
  - 이벤트 카드 탭 ▶ `context.go('/home/events/${id}')` (F03-02 진입)
  - 위시리스트 하트 탭 ▶ `WishlistToggle.add/remove` (F03-11) ▶ optimistic update + 토스트 "찜했어요" / "찜 해제했어요"
  - 풀투리프레시 ▶ `ref.refresh(eventListNotifierProvider.future)` ▶ 0페이지부터 재조회
  - 하단 스크롤 ▶ `loadMore()` ▶ `_currentPage + 1` 페이지 추가 append
  - FAB 탭 ▶ `context.push('/create-event')` (F03-03 진입)
- **상태 분기**: 로딩 (`CircularProgressIndicator`) / 에러 (재시도 버튼) / 비로그인 → FAB 숨김 / `EventStatus.canceled|closed` → 카드 disabled variant + 상태 라벨 오버레이.
- **모달/시트/네비게이션**: 정렬 옵션은 `ModalBottomSheet`. 카드 → `context.go` (push 대신 go — 홈 탭 stack 유지).

### 유사 이벤트 (`similar_events_screen.dart`)

- **사용자가 보는 것**:
  - 헤더 "이런 이벤트는 어떠세요?"
  - 세로 카드 리스트 (최대 5개)
  - 빈 상태 "유사한 이벤트가 없습니다"
- **사용자가 할 수 있는 액션**:
  - 진입 시 `GET /api/v1/events/{eventId}/similar?limit=5`
  - 카드 탭 ▶ `/home/events/${id}` (다시 F03-02)
- **상태 분기**: 비어있으면 빈 상태, 5개 미만이면 그대로 표시.
- **모달/시트/네비게이션**: `Routes.eventSimilar` (= `'similar'`) 서브 라우트로 push.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시 (`EventListScreen`):
   - `eventListNotifierProvider.build()` ▶ `EventRepository.searchEvents(_filter)` ▶ `GET /api/v1/events`
2. 사용자가 키워드/카테고리/정렬 변경:
   - `EventListNotifier.setKeyword|setCategories|setSortType` ▶ `_filter` 업데이트 + `_reset()` ▶ `ref.invalidateSelf()` ▶ build 재호출 ▶ page=0 재조회
3. 무한 스크롤:
   - `loadMore()` ▶ `_fetchPage(_currentPage + 1)` ▶ `state = AsyncValue.data([..._items, ...newPage])`
4. 유사 이벤트 진입:
   - `similarEventsProvider(eventId).build()` ▶ `EventRepository.getSimilarEvents(id, limit: 5)` ▶ `GET /api/v1/events/{id}/similar`
5. 위시리스트 토글:
   - `WishlistToggle.add(eventId)` ▶ optimistic detail/list patch ▶ `WishlistRepository.add` ▶ `POST /api/v1/events/{id}/wishlist` ▶ 성공 시 `myWishlistNotifier`/`eventDetailNotifier` invalidate.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **무한 스크롤 정책**: page size 20. 스크롤 위치가 `maxScrollExtent - 200px` 도달 시 prefetch.
- **풀투리프레시**: `RefreshIndicator` 표준 — 0페이지 강제 재조회 + 로컬 `_items` 비우기.
- **카테고리 필터 칩**: 9개 노출 (전체 + 8개) — 서버 `Category` enum 15개 중 자주 쓰는 것 위주 화면 결정. 칩 라벨은 `ClubCategoryMapper.toLabel(code)` 변환.
- **정렬 드롭다운 항목**: 최신순/인기순/가까운순 3가지 — 한글 라벨은 화면 결정.
- **빈 상태 문구**: "조건에 맞는 이벤트가 없습니다" + 작은 아이콘.
- **로딩**: full-screen `CircularProgressIndicator`. 추가 페이지는 리스트 하단 스피너.
- **위시리스트 토스트**: "찜했어요" / "찜 해제했어요" / 실패 시 "잠시 후 다시 시도해주세요".
- **FAB 표시 조건**: `isAuthenticatedProvider == true`만 노출.
- **Disabled 카드**: `EventStatus.closed | canceled` → 흐릿한 오버레이 + 상태 라벨.
- **검색바 디바운스**: 현재 `onSubmitted` 기반 (제출 시점에만 호출) — 입력 중 자동 호출 없음.
- **위치 권한 미허용**: 거리순/거리 필터 비활성화 정책은 미구현 (현재 단순히 위/경도 null).

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 키워드로 주말 모임 찾기 (Happy Path) | 홈 탭 진입, 위치 권한 허용됨. | 사용자가 이벤트 상세 진입. 위시리스트에 1건 추가됨. |
| S2 | 비로그인 사용자가 둘러보기 | 비로그인. | 비로그인으로 둘러보기 가능. 액션 시점에 로그인 유도. |
| S3 | 무한 스크롤 + 풀투리프레시 | 활성 사용자. | 최신 데이터로 갱신됨. |
| S4 | 검색 결과 0건 | 사용자. | 빈 결과 후 필터 해제로 복귀. |
| S5 | 유사 이벤트 둘러보기 | 이미 한 이벤트를 본 사용자. | 추천 이벤트 탐색 후 상세 진입. |
| S6 | 에러: 네트워크 끊김 | 지하철 사용자. | 사용자가 재시도하면 정상화. |
| S7 | 유사 이벤트 빈 결과 surface | `GET /api/v1/events/{id}/similar?limit=5` → `[]`. | 사용자가 다른 탐색 경로로 이동. |

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
| 후보 | frontend.md:81 | - **위치 권한 미허용**: 거리순/거리 필터 비활성화 정책은 미구현 (현재 단순히 위/경도 null). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:81 | [E2E 보강: seed_event_list_badge_matrix_test.dart::event_list_surface — `/home/events` 진입 후 "전체" 칩 + "총 N건" + "최신순" + 대표 이벤트 타이틀이 동시 노출되는지 surface 검증] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 키워드로 주말 모임 찾기 (Happy Path)**: Given 홈 탭 진입, 위치 권한 허용됨. When 사용자가 해당 흐름을 실행하면 Then 사용자가 이벤트 상세 진입. 위시리스트에 1건 추가됨.
- **AC-02. 비로그인 사용자가 둘러보기**: Given 비로그인. When 사용자가 해당 흐름을 실행하면 Then 비로그인으로 둘러보기 가능. 액션 시점에 로그인 유도.
- **AC-03. 무한 스크롤 + 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 최신 데이터로 갱신됨.
- **AC-04. 검색 결과 0건**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 결과 후 필터 해제로 복귀.
- **AC-05. 유사 이벤트 둘러보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 추천 이벤트 탐색 후 상세 진입.
- **AC-06. 에러: 네트워크 끊김**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 재시도하면 정상화.
- **AC-07. 유사 이벤트 빈 결과 surface**: Given `GET /api/v1/events/{id}/similar?limit=5` → `[]`. When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 탐색 경로로 이동.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
