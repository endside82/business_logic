# F03-01. 이벤트 발견 & 탐색 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

비로그인/로그인 사용자 모두에게 공개된 이벤트(`status=OPEN`) 목록을 검색·필터·정렬해 보여준다. 키워드/카테고리/지역/날짜/가격/거리 조건과 정렬(최신/인기/거리)을 한 엔드포인트로 받고, 상세 페이지에서 호출되는 유사 이벤트 추천과 로그인 사용자 전용 개인화 추천 피드를 별도 엔드포인트로 노출한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 홈 피드 ▶ "이벤트" 탭 또는 5탭 바텀 네비게이션
- 검색 결과 화면에서 이벤트 카테고리 결과
- 클럽 상세 ▶ 이벤트 섹션 (해당 클럽 이벤트 한정)
- 알림 (모임 추천 푸시) ▶ 이벤트 목록 딥링크
- 상세 화면에서 "유사 이벤트" 더보기 ▶ `SimilarEventsScreen`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `Category`, `RecommendationService`, `SimilarEventService`, `TrendingService`, `EventViewerContextService`. 앱: `event_list_screen.dart`, `similar_events_screen.dart`.

<!-- source-references:start -->
서버 창구: `EventController#listOpenEvents`, `EventController#getRecommendations`, `EventController#getSimilarEvents`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 정렬은 최신순·인기순·가까운순 셋이다. 카테고리 칩은 하나만 고르고, 다시 누르면 전체로 돌아간다.
- 검색은 입력을 제출할 때만 돈다. 입력 중 자동 조회는 없다.
- 목록은 20개씩 불러오고 끝에 닿기 전에 다음 쪽을 미리 부른다. 아래로 당기면 첫 쪽부터 다시 읽는다.
- 모임 만들기 버튼은 로그인 사용자에게만 보인다.
- 종료·취소 모임 카드는 흐리게, 상태 라벨과 함께 보인다.
- 결과가 없으면 "조건에 맞는 이벤트가 없습니다" 를 보인다.
- 유사 이벤트는 최대 5개다. 없으면 "유사한 이벤트가 없습니다" 를 보이고, 상세에서 불러오지 못하면 조용히 숨긴다.
- 찜은 화면에 먼저 반영하고, 실패하면 "잠시 후 다시 시도해주세요" 를 보인다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 위치 권한과 거리순 | 모임 목록 정렬은 서버가 받는 두 가지뿐이고 거리순은 없다. 위치 권한이 없어도 목록 동작은 같다 | 없음 |
| 해소됨 | 시험 보강 기록 | 모임 목록 첫 화면 문구(전체 칩·총 건수·최신순)의 시험 보강 기록이다. 결함이 아니다 | 없음 |

## 9. 수용 기준

- **AC-01. 키워드로 주말 모임 찾기 (Happy Path)**: Given 홈 탭 진입, 위치 권한 허용됨. When 사용자가 해당 흐름을 실행하면 Then 사용자가 이벤트 상세 진입. 위시리스트에 1건 추가됨.
- **AC-02. 비로그인 사용자가 둘러보기**: Given 비로그인. When 사용자가 해당 흐름을 실행하면 Then 비로그인으로 둘러보기 가능. 액션 시점에 로그인 유도.
- **AC-03. 무한 스크롤 + 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 최신 데이터로 갱신됨.
- **AC-04. 검색 결과 0건**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 결과 후 필터 해제로 복귀.
- **AC-05. 유사 이벤트 둘러보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 추천 이벤트 탐색 후 상세 진입.
- **AC-06. 에러: 네트워크 끊김**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 재시도하면 정상화.
- **AC-07. 유사 이벤트 빈 결과 surface**: Given `GET /api/v1/events/{id}/similar?limit=5` → `[]`. When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 탐색 경로로 이동.
