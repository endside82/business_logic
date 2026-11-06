# F02-04. 추천 이벤트 더보기·필터·무한스크롤 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

홈 피드의 추천 이벤트 가로 스크롤 섹션에서 "더보기"를 누르면 진입하는 SCR-HF-002 추천 이벤트 리스트 화면을 위한 API 묶음이다. 사용자가 화면을 끝까지 스크롤할수록 다음 페이지를 추가로 받아 누적 표시한다(무한 스크롤). 필터/정렬은 현재 클라이언트 사이드에서만 처리하며(서버는 별도 필터 파라미터를 받지 않음), 본 유닛에서는 페이지네이션과 트렌딩 보강에 사용 가능한 서버 엔드포인트만 다룬다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 메인 피드(SCR-HF-001) 추천 이벤트 섹션의 "더보기" 탭 → `/home/recommend`
- 추천 상세(SCR-HF-003) 화면에서 백버튼으로 복귀 시 같은 라우트로 복귀

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `TrendingController`. 앱: `recommend_events_screen.dart`, `recommend_detail_screen.dart`.

<!-- source-references:start -->
서버 창구: `EventController#getRecommendations`, `TrendingController#getTrending`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### SCR-HF-002 진입

1. 라우트 `/home/recommend` → `RecommendEventsScreen` 빌드.
2. `recommendEventsNotifierProvider.build()` 호출 → `_fetchPage(0)` 즉시 실행.
3. `_fetchPage(0)` 내에서:
   - 위치 권한 확인: `locationPermissionNotifierProvider.notifier.getCurrentPosition()` 호출 (실패 무시)
   - `eventRepositoryProvider`(`EventRepository`).`getRecommendEvents(page: 0, size: 20, latitude?, longitude?)` (▶ Unit 03)
4. 응답 `PageResponse<RecommendEvent>` 받으면:
   - `_currentPage = 0`, `_hasMore = !pageResponse.last`
   - `_applyClientFilters(pageResponse.content)` 적용 → `_items` 갱신
   - `state = AsyncValue.data(_items)`

### 무한 스크롤

1. `ScrollController`가 `maxScrollExtent - 200 <= pixels` 도달 → `_onScroll` 콜백.
2. `recommendEventsNotifierProvider.notifier.loadMore()` 호출.
3. `_isLoadingMore || !_hasMore`이면 즉시 리턴.
4. 그렇지 않으면 `_fetchPage(_currentPage + 1)` 실행 → 누적된 `_items`로 `state` 갱신.

### 필터/정렬 변경

1. 사용자가 칩/드롭다운 변경 → `setDateRange/setPriceType/setSort`.
2. 내부 변수 갱신 → `_reset()` 호출:
   - `_items = []`, `_currentPage = 0`, `_hasMore = true`
   - `ref.invalidateSelf()` → `build()` 재실행 → 페이지 0부터 다시 로드.

### SCR-HF-003 진입

1. 라우트 `/home/recommend/:eventId` → `RecommendDetailScreen(eventId)` 빌드.
2. `recommendDetailNotifierProvider(eventId).build(eventId)` 호출 → 두 호출 병렬:
   - `eventRepositoryProvider.getEventDetail(eventId)` (▶ Unit 03)
   - `eventRepositoryProvider.getRecommendEvents(size: 6)` (▶ Unit 03, 유사 이벤트 후보군)
3. 유사 이벤트 결과는 `eventId` 자기 자신을 제외하고 `take(5)`만 노출.
4. `RecommendDetailState(eventDetail: ..., similarEvents: AsyncValue.data(...))` 반환.

## 4. 제품 규칙

- 추천 이벤트 목록은 20개씩 끝까지 이어서 불러오고(스크롤 하단 200px 전에 다음 쪽), 마지막이면 `더 이상 추천 이벤트가 없습니다` 를 보인다. 다음 쪽 불러오기가 실패하면 안내 없이 지금까지 목록을 유지한다. 처음 불러오기가 실패하면 `추천 이벤트를 불러올 수 없습니다` 와 다시 시도가 뜬다.
- 필터와 정렬은 서버가 아니라 앱이 이미 받은 목록에서 처리한다. 날짜는 이번 주(오늘부터 7일), 이번 달, 가격은 무료(0원), 유료(0원 초과)다. 그래서 받아 온 쪽에 조건에 맞는 것이 적으면 목록이 비어 보일 수 있다. 필터를 바꾸면 첫 쪽부터 다시 받고, 활성 필터 개수 옆 X로 한 번에 해제한다.
- 정렬은 추천순(서버 순서 그대로), 시작 시각순(시작 시각 없는 것은 뒤), 인기순(참석자 많은 순), 가까운 순(거리 점수 높은 순)이다. 가까운 순은 위치 권한이 허용된 때만 고를 수 있고, 정렬은 받아 온 목록 안에서만 의미가 있다.
- 추천을 부를 때는 현재 위치를 가져와 보내고, 못 가져오면 좌표 없이 부른다. 추천이 없으면 `맞춤 추천 이벤트가 없습니다` / `관심사 태그를 추가해보세요` 가 뜬다.
- 카드의 추천 이유 배지는 점수가 가장 높은 한 가지만 보인다. 거리는 근처, 인기는 인기, 최신성은 새 이벤트, 시간은 마감 임박, 후기는 관심사 배지다.
- 추천 상세는 사진, 제목, 시간, 주소, 참석 현황(80% 이상이면 강조), 가격을 보이고 잔여석 같은 추천 이유는 앱이 계산해 보인다. `이벤트 상세 보기` 로 이벤트 상세에 가고, 비슷한 이벤트는 자기 자신을 뺀 최대 5개이며 누르면 또 추천 상세로 쌓인다. 이벤트 정보가 없으면 `이벤트 정보가 없습니다` 가 뜬다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 더보기 → 무한 스크롤 → 추천 상세 진입 | SCR-HF-001 진입 후 추천 섹션 카드 10개를 봤음. | 사용자가 추천 이벤트를 깊게 탐색 후 이벤트 상세로 넘어감. |
| S2 | (필터 변경) 무료만 보고 싶다 | SCR-HF-002에서 page=0,1,2까지 60건 누적 표시 중. | 클라이언트 사이드 필터 결과 사용자에게 노출. 서버 필터 미지원으로 인한 한계 존재. |
| S3 | (정렬 변경) 가까운 순으로 본다 | 위치 권한 허용, SCR-HF-002 진입 완료. | 거리 기준 표시. 단, 정렬은 클라이언트 메모리 한정이므로 page들 간 정렬은 페이지별로만 의미가 있다(전체 카탈로그 거리 정렬이 아님). |
| S4 | (마지막 페이지) 무한 스크롤 종료 | 추천 콘텐츠가 30건만 있는 신규 가입자. | 사용자가 추천 카탈로그 끝에 도달했음을 인지. |
| S5 | (빈 상태) 맞춤 추천 0건 | 신규 가입자, 관심사 태그 미설정. | 사용자가 빈 상태를 확인하고 별도 경로(프로필 → 관심사)로 이동. |
| S6 | (네트워크 실패 — 초기) 진입 즉시 5xx | 서버 일시 장애 시점에 진입한 사용자. | 사용자 액션으로 복구. |
| S7 | (추가 페이지 실패) 무한 스크롤 중 일부 페이지 실패 | 모바일 네트워크가 불안정한 환경의 사용자. | 사용자는 추가 페이지 실패를 명확히 인지하지 못할 수 있음. (UI 보강 여지 — 향후 토스트나 footer 메시지 검토.) |
| S8 | (필터 reset) 필터 카운터 X 탭 | 필터를 잘못 걸어놓은 사용자. | 모든 필터 해제, 추천순으로 첫 페이지부터 다시 표시. |
| S9 | (SCR-HF-003 유사 이벤트 깊이 탐색) | `RecommendEventsNotifier._fetchPage(0)` 가 정상 응답을 반환할 수 있는 데이터 시드 환경. 시드 데이터에는 최소 1개의 추천 이벤트(예: `Open Club Strategy Session`)가 포함되어 있음. | 유사 이벤트 체인 탐색 가능. (메모리 측면에서는 라우터가 stack을 보유하므로 과한 깊이 시 사용자가 헤맬 수 있음 — UX 관찰 포인트.) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:5 | 홈 피드의 추천 이벤트 가로 스크롤 섹션에서 "더보기"를 누르면 진입하는 SCR-HF-002 추천 이벤트 리스트 화면을 위한 API 묶음이다. 사용자가 화면을 끝까지 스크롤할수록 다음 페이지를 추가로 받아 누적 표시한다(무한 스크롤). 필터/정렬은 현재 클라이언트 사이드에서만 처리하며(서버는 별도 필터 파라미터를 받지 않음), 본 유닛에서는 페이지네이션과 트렌딩 보강에 사용 가능한 서버 엔드포인트만 다룬다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:12 | \| GET \| `/api/v1/search/trending` \| `TrendingController#getTrending` \| 공개 \| 트렌딩 점수 ZSET 상위 N개 (인기/추천 시그널 보강용) \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:40 | - **비즈니스 로직**: ▶ Unit 03 책임. 본 유닛 범위에서는 미확인 (관심사 기반 점수 계산, 거리 점수, 최근성 등). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:43 | ### `GET /api/v1/search/trending` — 트렌딩 시그널 (보강) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:61 | > 현재 클라이언트(`RecommendEventsNotifier`)는 SCR-HF-002 화면에서 `/api/v1/search/trending`을 직접 호출하지 않는다. 인기 정렬은 `currentAttendees` desc로 클라이언트 정렬한다. 트렌딩 엔드포인트는 추후 보강용으로 준비되어 있으나 본 유닛 화면에서는 사용 미확인. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:78 | ## 클라이언트 사이드 보완 (백엔드와의 갭) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:130 | - **에러/추가 로딩 실패 처리**: 추가 페이지 호출 실패 시 토스트나 배너 없이 기존 데이터 유지(사용자에게 명시적 안내 없음 — 추후 보강 여지). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:32 | 6. 결과적으로 한 페이지에 무료가 적으면 빈 리스트로 보일 수 있음(클라이언트-서버 갭 한계). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:98 | **종료 상태**: 사용자는 추가 페이지 실패를 명확히 인지하지 못할 수 있음. (UI 보강 여지 — 향후 토스트나 footer 메시지 검토.) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 더보기 → 무한 스크롤 → 추천 상세 진입**: Given SCR-HF-001 진입 후 추천 섹션 카드 10개를 봤음. When 사용자가 해당 흐름을 실행하면 Then 사용자가 추천 이벤트를 깊게 탐색 후 이벤트 상세로 넘어감.
- **AC-02. (필터 변경) 무료만 보고 싶다**: Given SCR-HF-002에서 page=0,1,2까지 60건 누적 표시 중. When 사용자가 해당 흐름을 실행하면 Then 클라이언트 사이드 필터 결과 사용자에게 노출. 서버 필터 미지원으로 인한 한계 존재.
- **AC-03. (정렬 변경) 가까운 순으로 본다**: Given 위치 권한 허용, SCR-HF-002 진입 완료. When 사용자가 해당 흐름을 실행하면 Then 거리 기준 표시. 단, 정렬은 클라이언트 메모리 한정이므로 page들 간 정렬은 페이지별로만 의미가 있다(전체 카탈로그 거리 정렬이 아님).
- **AC-04. (마지막 페이지) 무한 스크롤 종료**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 추천 카탈로그 끝에 도달했음을 인지.
- **AC-05. (빈 상태) 맞춤 추천 0건**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 빈 상태를 확인하고 별도 경로(프로필 → 관심사)로 이동.
- **AC-06. (네트워크 실패 — 초기) 진입 즉시 5xx**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 액션으로 복구.
- **AC-07. (추가 페이지 실패) 무한 스크롤 중 일부 페이지 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자는 추가 페이지 실패를 명확히 인지하지 못할 수 있음. (UI 보강 여지 — 향후 토스트나 footer 메시지 검토.)
- **AC-08. (필터 reset) 필터 카운터 X 탭**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 모든 필터 해제, 추천순으로 첫 페이지부터 다시 표시.
- **AC-09. (SCR-HF-003 유사 이벤트 깊이 탐색)**: Given `RecommendEventsNotifier._fetchPage(0)` 가 정상 응답을 반환할 수 있는 데이터 시드 환경. 시드 데이터에는 최소 1개의 추천 이벤트(예: `Open Club Strategy Session`)가 포함되어 있음. When 사용자가 해당 흐름을 실행하면 Then 유사 이벤트 체인 탐색 가능. (메모리 측면에서는 라우터가 stack을 보유하므로 과한 깊이 시 사용자가 헤맬 수 있음 — UX 관찰 포인트.)
