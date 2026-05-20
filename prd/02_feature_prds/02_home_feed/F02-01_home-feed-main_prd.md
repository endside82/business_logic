# F02-01. 홈 피드 메인 조회 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/02_home_feed/F02-01_home-feed-main -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/02_home_feed/F02-01_home-feed-main`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

홈 피드 메인 화면(SCR-HF-001) 진입 시 4개 섹션(추천 이벤트 / 예정 이벤트 / 인기 클럽 / 최신 플랜)에 표시할 카드 데이터를 한 번에 만들어내기 위한 읽기 전용 API 묶음이다. 비로그인 상태도 진입 가능하도록 인증을 선택적으로 허용하며, 각 섹션은 클라이언트가 병렬로 호출한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 앱 실행 직후 splash → 인증 상태에 따라 redirect 후 첫 진입 화면 (`Routes.home = '/home'`은 publicRoutes에 포함되어 비로그인 진입 가능)
- Bottom Tab Branch 0 ("홈") 탭 → `StatefulShellRoute`의 첫 번째 브랜치 루트로 복귀
- 백버튼 / pop으로 자식 라우트(`/home/recommend`, `/home/events/:id`, `/home/clubs/:id`, `/home/market/:id`)에서 복귀

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/02_home_feed/F02-01_home-feed-main/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/02_home_feed/F02-01_home-feed-main/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/02_home_feed/F02-01_home-feed-main/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/02_home_feed/F02-01_home-feed-main/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/main/controller/HomeController.java:47` | 확인됨 |
| `community_api/src/main/java/com/endside/community/main/controller/HomeController.java:70` | 확인됨 |
| `community_api/src/main/java/com/endside/community/main/controller/HomeController.java:93` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/TrendingController.java:22` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

홈 피드 메인 화면(SCR-HF-001) 진입 시 4개 섹션(추천 이벤트 / 예정 이벤트 / 인기 클럽 / 최신 플랜)에 표시할 카드 데이터를 한 번에 만들어내기 위한 읽기 전용 API 묶음이다. 비로그인 상태도 진입 가능하도록 인증을 선택적으로 허용하며, 각 섹션은 클라이언트가 병렬로 호출한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/home/clubs` | `HomeController#getPopularClubs` | optional (`errorOnInvalidType=false`) | ACTIVE 클럽 페이지, 기본 정렬 `memberCount,desc`, 로그인 시 본인의 멤버십/대기/제재 컨텍스트 함께 채움 |
| GET | `/api/v1/home/plans` | `HomeController#getNewPlans` | optional | PUBLISHED 플랜 페이지, 기본 정렬 `createdAt,desc`, 로그인 시 본인 구매·제작 여부 채움 |
| GET | `/api/v1/home/events` | `HomeController#getUpcomingEvents` | (없음) | OPEN 상태 + `startTime > now` 이벤트 페이지, 기본 정렬 `startTime,asc` |
| GET | `/api/v1/search/trending` | `TrendingController#getTrending` | (없음) | Redis ZSET 기반 트렌딩 이벤트 상위 N건, OPEN + 종료시간 미경과만 |

> 위 4개가 본 유닛에서 확인된 모든 홈 피드용 서버 엔드포인트다. UI/UX 문서에 등장하는 `/api/v1/events/recommend`는 본 유닛 코드 탐색 범위(`main/`)에 없으며, 홈 피드 클라이언트는 별도 도메인의 `EventApi.getRecommendEvents`를 호출한다(이벤트 유닛 영역).

---

### 도메인 모델 / Enum (이 기능 관련)

- **`ClubStatus`** (서버 분기에서 사용): `ACTIVE` (이 외 값은 본 유닛에서 직접 사용 안 함)
- **`PlanStatus`**: `PUBLISHED` (이 외 값은 본 유닛에서 직접 사용 안 함)
- **`EventStatus`**: `OPEN` (이 외 값은 본 유닛에서 직접 사용 안 함)
- **`Category`** (event/club 공용): `HomeService#normalizeCategoryIfPresent`가 `Category.valueOf(toUpper)`로 검증. 미상의 값은 `CLUB_INVALID_CATEGORY` 예외.
- **`WaitType`**: `APPLY`, `BAN` 두 종류만 본 유닛에서 사용 (가입 대기 / 차단 표시).
- **`JoinType`** (ClubSimpleVo 필드): 값은 본 유닛에서 분기에 쓰이지 않음.
- **`LocationType`** (EventSimpleVo 필드): 값은 본 유닛에서 분기에 쓰이지 않음.

### 의존 단위 / 외부 시스템

- **다른 Unit 의존(호출)**:
  - 클럽 도메인 → `ClubRepository`, `ClubMemberRepository`, `ClubMemberWaitRepository`, `ClubMapper` ▶ Unit 04로 위임
  - 이벤트 도메인 → `EventRepository`, `EventMapper` ▶ Unit 03으로 위임
  - 플랜 도메인 → `PlanRepository`, `PlanPurchaseRepository`, `PlanMapper` ▶ Unit 08로 위임
  - 계정 도메인 → `UserQueryRepository.findNicknamesByUserIds` ▶ Unit 01로 위임
- **다른 Unit으로의 호출**: 본 유닛 자체는 다른 도메인의 변경 API를 호출하지 않는다(읽기 전용).
- **외부 시스템**:
  - **Redis (Redisson)**: 트렌딩 ZSET 키 `trending:views`, `trending:regs`, `trending:scores` 읽기.
  - **MySQL**: `clubs`, `plans`, `events`, `users` 등 읽기 트랜잭션.

## 5. 프론트 계약

### 진입 경로

- 앱 실행 직후 splash → 인증 상태에 따라 redirect 후 첫 진입 화면 (`Routes.home = '/home'`은 publicRoutes에 포함되어 비로그인 진입 가능)
- Bottom Tab Branch 0 ("홈") 탭 → `StatefulShellRoute`의 첫 번째 브랜치 루트로 복귀
- 백버튼 / pop으로 자식 라우트(`/home/recommend`, `/home/events/:id`, `/home/clubs/:id`, `/home/market/:id`)에서 복귀

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home` | `lib/presentation/home/screens/home_feed_screen.dart` | SCR-HF-001 메인 피드 (4개 섹션 + 부가 섹션) |

> 이 기능에서 표시되는 카드의 클릭 후 진입(이벤트 상세 / 클럽 상세 / 플랜 상세 / 추천 더보기)은 F02-03·F02-04에서 다룬다.

### 화면별 구성 요소 & 액션

### 메인 피드 (`home_feed_screen.dart`)

- **사용자가 보는 것** (스크롤 순서):
  1. `CommunityAppBar` — 좌측 "Community" 로고 텍스트(`AppTypography.heading2`, `AppColors.primary500`), 우측 검색·알림 `IconButton` (F02-05에서 다룸)
  2. `LocationPermissionBanner` — `LocationPermissionStatus.denied`일 때만 노출, "설정" 탭으로 재요청
  3. `MyUpcomingSection` — 로그인 사용자의 다가오는 본인 이벤트 (별도 도메인, 본 기능에서는 placeholder)
  4. `WishlistSection` — 본인 찜 이벤트 (없으면 자동 숨김)
  5. `RecentlyViewedEventSection` — 로컬에 저장된 최근 본 이벤트 (없으면 자동 숨김)
  6. `RecommendEventSection` — 가로 스크롤 추천 이벤트 카드 + "더보기"
  7. `NearbyEventSection` — 세로 리스트 예정/인근 이벤트
  8. `PopularClubSection` — 가로 스크롤 인기 클럽 카드
  9. `NewPlanSection` — 세로 리스트 최신 플랜
  10. `RefreshIndicator` — 전 영역 Pull-to-refresh
- **사용자가 할 수 있는 액션**:
  - 화면 진입 ▶ `homeFeedNotifierProvider.build()` ▶ `HomeRepository.fetchHomeFeed()` ▶ 4개 엔드포인트 병렬 호출
  - 풀투리프레시 ▶ `HomeFeedNotifier.refresh()` ▶ `forceRefresh: true`로 캐시 무시 재호출 (F02-02에서 다룸)
  - 위치 권한 미확정 시 첫 진입에서 자동으로 `locationPermissionNotifierProvider.checkAndRequest()` 호출 (Future.microtask)
- **상태 분기**:
  - 모든 섹션 `isLoading`이면 전체 `HomeSkeleton` 표시
  - 모든 섹션 `hasError`이면 `AppErrorState(title: '피드를 불러올 수 없습니다', onRetry: refresh)` 전체 화면 노출
  - 그 외에는 섹션별 개별 상태 분기:
    - `data` → 섹션 위젯에 데이터 전달
    - `loading` → 섹션 위젯에 `isLoading: true` 전달 (skeleton)
    - `error` → 섹션 위젯에 `error`/`onRetry` 전달 (해당 섹션만 "다시 시도" UI)
- **모달/시트/네비게이션**: 본 기능 자체는 화면을 push하지 않는다(카드 탭은 F02-03, 더보기는 F02-04, 검색·알림은 F02-05).

### API 호출 순서 (Provider/Repository 관점)

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

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **클라이언트 캐시 정책**: `HomeRepository._cacheDuration = 5분`. 5분 이내 재진입 시 4개 섹션 모두 캐시 반환, 네트워크 호출 없음.
- **호출 size**: 추천/예정 이벤트 `size=10`, 인기 클럽 `size=5`, 최신 플랜 `size=5` (서버 기본값 20을 클라이언트가 덮어씀).
- **위치 파라미터 사용**: `_fetchNearbyEvents`는 `latitude/longitude`를 보내지 않고 `sort/size`만 전달. 위치 권한 결과는 추천 이벤트 호출(`EventApi.getRecommendEvents`)에만 영향.
- **부분 실패 정책**: 4개 섹션 중 일부만 실패해도 화면은 그대로 렌더링하고 실패 섹션만 "재시도" 버튼 표시. 전체 실패일 때만 풀스크린 에러.
- **빈 상태 문구**: 섹션별 위젯이 정의(예: 추천 이벤트 0건이면 섹션 자체를 비표시 또는 EmptySection). 본 화면에서는 "아직 등록된 이벤트가 없습니다" 등의 문구를 섹션 위젯에 위임.
- **로딩 UI**: 4개 모두 로딩이면 `HomeSkeleton`(전체 스켈레톤), 아니면 섹션 단위 skeleton.
- **위치 권한 자동 요청**: 첫 진입에서 `LocationPermissionStatus.notAsked`이면 자동으로 시스템 권한 요청. 거부되면 상단 배너로 알리고 사용자가 "설정" 탭으로 재요청 가능.
- **Pull-to-refresh 동작**: `RefreshIndicator(color: AppColors.primary500)` — 캐시를 비우고 4개 동시 재호출 (F02-02 참조).
- **테스트 ID**: `TestIds.screenHome`을 `RefreshIndicator` 자식에 부여 (테스트 자동화용).
- **디자인 토큰**: 섹션 간격 `AppSpacing.sectionGap`, 카드 패딩 `AppSpacing.screenPadding`, 메인 컬러 `AppColors.primary500`.
- **Public 라우트**: `Routes.publicRoutes`에 `/home`이 포함되어 비로그인 사용자도 진입 가능. 단 `MyUpcomingSection`/`WishlistSection`은 인증 상태를 내부적으로 확인해 비로그인 시 미노출.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 첫 로그인 사용자가 홈 피드를 본다 | `AuthState.authenticated`, `LocationPermissionStatus.notAsked`, 5분 캐시 비어있음. | 4개 섹션 모두 표시, 클라이언트 캐시 `_lastFetchTime = now()` 기록(5분 유효). |
| S2 | (캐시 hit) 화면 재진입 시 캐시로 즉시 표시 | `_lastFetchTime`이 30초 전, `keepAlive: true`인 `homeRepositoryProvider`가 살아있음. | 네트워크 호출 0건, 화면 즉시 렌더. |
| S3 | (부분 실패) 인기 클럽 섹션만 500을 받는다 | `AuthState.unauthenticated`, 캐시 만료. | 부분 실패가 사용자 흐름을 막지 않고, 명시적 재시도로 복구됨. |
| S4 | (전체 실패) 비행기 모드에서 홈 진입 | 네트워크 차단, 캐시 만료. | 네트워크 복구 후 사용자 액션으로 정상화. (자동 재시도는 본 유닛에서 수행하지 않는다.) |
| S5 | (비로그인 진입) 게스트가 홈을 본다 | `AuthState.unauthenticated`. `Routes.publicRoutes`에 `/home`이 포함되어 있어 진입 허용. | 게스트 사용자가 추천/예정/인기/신상품 탐색 가능. 카드 탭으로 상세 진입 시 인증 가드는 각 도메인 유닛이 처리. |
| S6 | (잘못된 카테고리 필터) 클럽/플랜 카테고리 파라미터 검증 | 일반 사용자 흐름에서는 발생하지 않음(현재 홈 화면은 `category` 파라미터를 보내지 않는다). | 본 화면에서 자체적으로 카테고리 파라미터를 송신하지 않으므로 사용자 시나리오에서는 발생 가능성 낮음. 향후 카테고리 칩 추가 시 클라이언트 측 화이트리스트 검증 필요. |

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
| 후보 | backend.md:97 | - `latitude: Double?`, `longitude: Double?` — **현재 서버 코드(HomeService#getUpcomingEvents)에서는 사용하지 않음.** 파라미터는 받지만 거리 정렬/필터에 반영하지 않는다(미확인 — 확장 슬롯). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:118 | ### `GET /api/v1/search/trending` — 트렌딩 이벤트(보강용) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:69 | - **디자인 토큰**: 섹션 간격 `AppSpacing.sectionGap`, 카드 패딩 `AppSpacing.screenPadding`, 메인 컬러 `AppColors.primary500`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 첫 로그인 사용자가 홈 피드를 본다**: Given `AuthState.authenticated`, `LocationPermissionStatus.notAsked`, 5분 캐시 비어있음. When 사용자가 해당 흐름을 실행하면 Then 4개 섹션 모두 표시, 클라이언트 캐시 `_lastFetchTime = now()` 기록(5분 유효).
- **AC-02. (캐시 hit) 화면 재진입 시 캐시로 즉시 표시**: Given `_lastFetchTime`이 30초 전, `keepAlive: true`인 `homeRepositoryProvider`가 살아있음. When 사용자가 해당 흐름을 실행하면 Then 네트워크 호출 0건, 화면 즉시 렌더.
- **AC-03. (부분 실패) 인기 클럽 섹션만 500을 받는다**: Given `AuthState.unauthenticated`, 캐시 만료. When 사용자가 해당 흐름을 실행하면 Then 부분 실패가 사용자 흐름을 막지 않고, 명시적 재시도로 복구됨.
- **AC-04. (전체 실패) 비행기 모드에서 홈 진입**: Given 네트워크 차단, 캐시 만료. When 사용자가 해당 흐름을 실행하면 Then 네트워크 복구 후 사용자 액션으로 정상화. (자동 재시도는 본 유닛에서 수행하지 않는다.)
- **AC-05. (비로그인 진입) 게스트가 홈을 본다**: Given `AuthState.unauthenticated`. `Routes.publicRoutes`에 `/home`이 포함되어 있어 진입 허용. When 사용자가 해당 흐름을 실행하면 Then 게스트 사용자가 추천/예정/인기/신상품 탐색 가능. 카드 탭으로 상세 진입 시 인증 가드는 각 도메인 유닛이 처리.
- **AC-06. (잘못된 카테고리 필터) 클럽/플랜 카테고리 파라미터 검증**: Given 일반 사용자 흐름에서는 발생하지 않음(현재 홈 화면은 `category` 파라미터를 보내지 않는다). When 사용자가 해당 흐름을 실행하면 Then 본 화면에서 자체적으로 카테고리 파라미터를 송신하지 않으므로 사용자 시나리오에서는 발생 가능성 낮음. 향후 카테고리 칩 추가 시 클라이언트 측 화이트리스트 검증 필요.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
