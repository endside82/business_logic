# F02-01. 홈 피드 메인 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

홈 피드 메인 화면(SCR-HF-001)은 추천 이벤트 / 예정 이벤트 / 인기 클럽 / 최신 플랜과, 로그인 사용자 전용 **다시 만나면 좋을 사람** 섹션을 조립한다. 홈 라우트와 세 `/api/v1/home/**` 목록은 비로그인 진입을 허용하지만 추천 이벤트 `/api/v1/events/recommend`는 인증 필수라서 앱은 로그인 사용자에게만 추천 이벤트 섹션을 보이고 호출한다. 사람 추천은 로그인 여부를 먼저 확인해 비로그인에는 호출하지 않는다.

### 2026-07-29 소스 재실측 — 사람 추천 섹션

- `GET /api/v1/users/me/people-recommendations`는 페이징 없이 최대 10개의 `PersonRecommendationVo { userId, nickname, avatarUrl, reasonCodes, coAttendedCount }`를 반환한다.
- 후보 풀은 증거등급 공동참석자다. 체크인 데이터가 있는 이벤트는 양쪽 체크인, 체크인 데이터가 없는 이벤트는 양쪽 `ATTENDING`이면서 확정/이의중 노쇼가 아닌 경우만 인정한다. 탈퇴·정지 사용자, 양방향 차단, `hideFromSearch=true` 사용자는 매 조회 시 제외한다.
- 정렬 신호는 내가 남긴 다시 만나기 선택(+4), 공동참석 횟수(+1, 최대 5), 같은 클럽(+1.5), 공통 관심/취향(+0.5, 최대 4), 최근 90일 만남(+1)이다. 상대가 나를 선택했는지는 읽지 않는다.
- 사용자에게는 점수나 순위를 노출하지 않고 `CHOSE_AGAIN`, `CO_ATTENDED`, `SAME_CLUB`, `COMMON_GROUND` 순으로 최대 2개 이유만 표시한다. 동점은 최근 만남 내림차순, 사용자 ID 오름차순으로 안정 정렬한다.
- Flutter `PeopleRecommendSection`은 비로그인·빈 결과·로딩·오류에서 섹션과 여백을 모두 조용히 숨기며, 카드 탭은 `PersonSheet`로 연결한다. v1에는 더보기 CTA가 없다.

실측 근거: `PersonRecommendationController/Service`, `EventAttendanceQueryRepository`, `connectivity_api.dart`, `people_recommendation_provider.dart`, `people_recommend_section.dart` 및 `people_recommend_section_test.dart`.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 앱 실행 직후 splash → 인증 상태에 따라 redirect 후 첫 진입 화면 (`Routes.home = '/home'`은 publicRoutes에 포함되어 비로그인 진입 가능)
- Bottom Tab Branch 0 ("홈") 탭 → `StatefulShellRoute`의 첫 번째 브랜치 루트로 복귀
- 백버튼 / pop으로 자식 라우트(`/home/recommend`, `/home/events/:id`, `/home/clubs/:id`, `/home/market/:id`)에서 복귀

## 2. 코드 위치

계약의 정본은 코드다. 서버: `HomeController`, `TrendingController`, `EventController`, `HomeService`. 앱: `home_feed_screen.dart`.

## 3. 전체 동작 흐름

1. 화면 진입 → `homeFeedNotifierProvider.build()`
2. `HomeFeedNotifier._loadFeed(forceRefresh: false)` → `homeRepositoryProvider`(`HomeRepository`).`fetchHomeFeed()`
3. 캐시 체크 (`_lastFetchTime`이 5분 이내이고 `forceRefresh=false`이면 캐시 반환)
4. 캐시 미스 시 `Future.wait`로 4개 호출 병렬 실행:
   - `_fetchRecommendEvents()` → `EventApi.getRecommendEvents(latitude?, longitude?, size: 10)` ▶ Unit 03 영역 (`/api/v1/events/recommend`)
   - `_fetchNearbyEvents()` → `HomeApi.getUpcomingEvents(sort: 'startTime,asc', size: 10)` → `GET /api/v1/home/events`
   - `_fetchPopularClubs()` → `HomeApi.getPopularClubs(sort: 'memberCount,desc', size: 5)` → `GET /api/v1/home/clubs`
   - `_fetchNewPlans()` → `HomeApi.getNewPlans(sort: 'createdAt,desc', size: 5)` → `GET /api/v1/home/plans`
5. 각 결과(`Result<T>`)를 `AsyncValue.data` / `AsyncValue.error`로 매핑 → `state = state.copyWith(...)`
6. 4개 중 하나라도 success면 `_lastFetchTime = DateTime.now()` (5분 캐시 시작)

## 4. 제품 규칙

- 홈은 로그인 없이 열린다. 비로그인이면 곧 열리는 이벤트, 인기 클럽, 새 플랜만 보이고 추천 이벤트, 다가오는 내 이벤트, 다시 만나면 좋을 사람, 찜, 최근 본 이벤트는 보이지 않는다. 새 플랜 섹션은 마켓이 열려 있는 출시 범위에서만 보인다.
- 섹션 순서는 다가오는 내 이벤트, 추천 이벤트, 곧 열리는 이벤트, 다시 만나면 좋을 사람, 인기 클럽, 찜한 이벤트, 최근 본 이벤트, 새 플랜이다.
- 서버 목록의 기준: 곧 열리는 이벤트는 모집 중이고 아직 시작 전인 것을 시작 시각 순으로, 인기 클럽은 활성 클럽을 멤버 수 많은 순으로, 새 플랜은 공개 중인 것을 최신 순으로 준다. 앱은 이벤트 10개, 클럽 5개, 플랜 5개씩 요청하고 추천 이벤트는 10개다. 곧 열리는 이벤트는 위치와 상관없이 같은 목록이다(거리 정렬 없음).
- 로그인 사용자에게는 클럽 목록에 내 가입, 대기, 제재 상태가, 플랜 목록에 내 구매, 제작 여부가 함께 채워진다.
- 홈 내용은 앱 안에 5분 캐시한다. 5분 안에 다시 들어오면 서버를 부르지 않고 바로 보인다.
- 섹션 하나가 실패해도 나머지는 그대로 보이고 실패한 섹션에만 다시 시도가 뜬다. 네 섹션이 모두 로딩 중일 때만 전체 스켈레톤을, 모두 실패했을 때만 `피드를 불러올 수 없습니다` 전체 오류를 보인다. 자동 재시도는 없다.
- 첫 진입에서 위치 권한을 아직 묻지 않았으면 시스템 권한을 요청한다. 거부되면 위쪽에 배너가 뜨고 `설정` 에서 다시 요청할 수 있다. 위치는 추천 이벤트 계산에만 쓰인다.
- 다시 만나면 좋을 사람은 비로그인, 결과 없음, 로딩, 오류에서는 섹션과 여백까지 조용히 숨는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 첫 로그인 사용자가 홈 피드를 본다 | `AuthState.authenticated`, 5분 콘텐츠 캐시 비어있음 | 기존 콘텐츠 섹션을 표시하고 추천 사람이 있으면 사람 섹션도 표시한다. |
| S2 | (캐시 hit) 화면 재진입 시 캐시로 즉시 표시 | `_lastFetchTime`이 30초 전, `keepAlive: true`인 `homeRepositoryProvider`가 살아있음. | 네트워크 호출 0건, 화면 즉시 렌더. |
| S3 | (부분 실패) 인기 클럽 섹션만 500을 받는다 | `AuthState.unauthenticated`, 캐시 만료. | 부분 실패가 사용자 흐름을 막지 않고, 명시적 재시도로 복구됨. |
| S4 | (전체 실패) 비행기 모드에서 홈 진입 | 네트워크 차단, 캐시 만료. | 네트워크 복구 후 사용자 액션으로 정상화. (자동 재시도는 본 유닛에서 수행하지 않는다.) |
| S5 | (비로그인 진입) 게스트가 홈을 본다 | `AuthState.unauthenticated`. `Routes.publicRoutes`에 `/home`이 포함되어 있어 진입 허용. | 예정 이벤트·인기 클럽·최신 플랜은 조회된다. 추천 이벤트 섹션은 보이지 않고, 사람 추천·내 일정·찜은 숨겨진다. |
| S6 | (잘못된 카테고리 필터) 클럽/플랜 카테고리 파라미터 검증 | 일반 사용자 흐름에서는 발생하지 않음(현재 홈 화면은 `category` 파라미터를 보내지 않는다). | 본 화면에서 자체적으로 카테고리 파라미터를 송신하지 않으므로 사용자 시나리오에서는 발생 가능성 낮음. 향후 카테고리 칩 추가 시 클라이언트 측 화이트리스트 검증 필요. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:97 | - `latitude: Double?`, `longitude: Double?` — **현재 서버 코드(HomeService#getUpcomingEvents)에서는 사용하지 않음.** 파라미터는 받지만 거리 정렬/필터에 반영하지 않는다(미확인 — 확장 슬롯). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:118 | ### `GET /api/v1/search/trending` — 트렌딩 이벤트(보강용) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:69 | - **디자인 토큰**: 섹션 간격 `AppSpacing.sectionGap`, 카드 패딩 `AppSpacing.screenPadding`, 메인 컬러 `AppColors.primary500`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 첫 로그인 사용자가 홈 피드를 본다**: Given 인증 사용자와 콘텐츠 캐시 없음 When 홈 진입 Then 기존 콘텐츠를 표시하고 추천 사람이 있으면 이유 최대 2개의 사람 섹션을 추가한다.
- **AC-02. (캐시 hit) 화면 재진입 시 캐시로 즉시 표시**: Given `_lastFetchTime`이 30초 전, `keepAlive: true`인 `homeRepositoryProvider`가 살아있음. When 사용자가 해당 흐름을 실행하면 Then 네트워크 호출 0건, 화면 즉시 렌더.
- **AC-03. (부분 실패) 인기 클럽 섹션만 500을 받는다**: Given `AuthState.unauthenticated`, 캐시 만료. When 사용자가 해당 흐름을 실행하면 Then 부분 실패가 사용자 흐름을 막지 않고, 명시적 재시도로 복구됨.
- **AC-04. (전체 실패) 비행기 모드에서 홈 진입**: Given 네트워크 차단, 캐시 만료. When 사용자가 해당 흐름을 실행하면 Then 네트워크 복구 후 사용자 액션으로 정상화. (자동 재시도는 본 유닛에서 수행하지 않는다.)
- **AC-05. (비로그인 진입) 게스트가 홈을 본다**: Given `AuthState.unauthenticated`이고 `/home` 진입이 허용됨 When 홈 fan-out이 실행되면 Then 예정 이벤트·인기 클럽·최신 플랜은 보이고, 추천 이벤트 섹션은 보이지 않으며 사람 추천·내 일정·찜은 숨겨진다.
- **AC-06. (잘못된 카테고리 필터) 클럽/플랜 카테고리 파라미터 검증**: Given 일반 사용자 흐름에서는 발생하지 않음(현재 홈 화면은 `category` 파라미터를 보내지 않는다). When 사용자가 해당 흐름을 실행하면 Then 본 화면에서 자체적으로 카테고리 파라미터를 송신하지 않으므로 사용자 시나리오에서는 발생 가능성 낮음. 향후 카테고리 칩 추가 시 클라이언트 측 화이트리스트 검증 필요.
