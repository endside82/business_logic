# F02-03. 섹션 카드 진입 (이벤트/클럽/플랜) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/02_home_feed/F02-03_section-card-entry -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/02_home_feed/F02-03_section-card-entry`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

홈 피드(SCR-HF-001)의 카드를 사용자가 탭했을 때 발생하는 동작은 본질적으로 **클라이언트 라우팅**이다. 카드 데이터는 이미 F02-01의 4개 엔드포인트 응답에 담겨 있으므로, 본 기능 자체는 카드 식별자(id)를 가지고 라우터 경로로 이동만 시키며 별도의 새로운 백엔드 호출을 발생시키지 않는다. 진입 후 상세 화면에서 호출되는 도메인 상세 API는 각 도메인 유닛의 책임이다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 메인 피드(SCR-HF-001)에서 4개 섹션 위젯 중 하나의 카드를 탭
- 본 기능은 라우팅을 통한 도메인 상세 화면 진입까지만 담당. 상세 화면에서의 동작은 각 도메인 유닛 책임.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/02_home_feed/F02-03_section-card-entry/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/02_home_feed/F02-03_section-card-entry/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/02_home_feed/F02-03_section-card-entry/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/02_home_feed/F02-03_section-card-entry/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 사용자가 카드 탭 → `onEventTap` / `onClubTap` / `onPlanTap` 콜백 실행
2. `context.go('/home/<segment>/<id>')` → GoRouter가 라우트 일치 → 대상 ScreenWidget 빌드
3. **여기까지가 본 유닛의 책임 끝.** 이후 상세 화면이 자체 Provider로 도메인 API 호출:
   - `/home/recommend/:eventId` → `recommendDetailNotifierProvider(eventId)` → `EventRepository.getEventDetail(eventId)` + `EventRepository.getRecommendEvents(size:6)` (▶ Unit 03)
   - `/home/events/:eventId` → 이벤트 상세 Provider (▶ Unit 03)
   - `/home/clubs/:clubId` → 클럽 상세 Provider (▶ Unit 04)
   - `/home/market/:planId` → `planDetailNotifierProvider(planId)` (▶ Unit 08)

## 4. 서버 계약

### 개요

홈 피드(SCR-HF-001)의 카드를 사용자가 탭했을 때 발생하는 동작은 본질적으로 **클라이언트 라우팅**이다. 카드 데이터는 이미 F02-01의 4개 엔드포인트 응답에 담겨 있으므로, 본 기능 자체는 카드 식별자(id)를 가지고 라우터 경로로 이동만 시키며 별도의 새로운 백엔드 호출을 발생시키지 않는다. 진입 후 상세 화면에서 호출되는 도메인 상세 API는 각 도메인 유닛의 책임이다.

### 엔드포인트 요약

본 기능 자체에서 직접 호출되는 백엔드 엔드포인트는 **없다**. 카드 탭으로 발생하는 백엔드 호출은 모두 다른 유닛에 위임된다.

| 카드 종류 | 라우팅 후 진입 화면 | 진입 후 호출되는 API (참고) | 위임 |
|---|---|---|---|
| 추천 이벤트 (`RecommendEvent`) | SCR-HF-003 추천 상세 (`/home/recommend/:eventId`) | `GET /api/v1/events/{eventId}` + 유사 추천 | ▶ Unit 03 (이벤트) |
| 인근/예정 이벤트 (`EventSimpleVo`) | SCR-EV-002 이벤트 상세 (`/home/events/:eventId`) | `GET /api/v1/events/{eventId}` 등 | ▶ Unit 03 (이벤트) |
| 인기 클럽 (`ClubSimpleVo`) | SCR-CL-002 클럽 상세 (`/home/clubs/:clubId`) | `GET /api/v1/clubs/{clubId}` 등 | ▶ Unit 04 (클럽) |
| 새 플랜 (`PlanSimpleVo`) | SCR-MK-002 플랜 상세 (`/home/market/:planId`) | `GET /api/v1/market/items/{planId}` 등 | ▶ Unit 08 (플랜 마켓) |

### 의존 단위 / 외부 시스템

- **다른 Unit으로 위임**:
  - 이벤트 상세 / 추천 상세 → ▶ Unit 03
  - 클럽 상세 → ▶ Unit 04
  - 플랜 상세 → ▶ Unit 08
- **외부 시스템**: 없음.

## 5. 프론트 계약

### 진입 경로

- 메인 피드(SCR-HF-001)에서 4개 섹션 위젯 중 하나의 카드를 탭
- 본 기능은 라우팅을 통한 도메인 상세 화면 진입까지만 담당. 상세 화면에서의 동작은 각 도메인 유닛 책임.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 | 위임 |
|---|---|---|---|
| `/home/recommend/:eventId` | `lib/presentation/home/screens/recommend_detail_screen.dart` | SCR-HF-003 추천 상세 | 본 유닛 (홈 피드의 일부지만 진입까지만 다룸) |
| `/home/events/:eventId` | (▶ Unit 03 이벤트 상세 화면) | SCR-EV-002 이벤트 상세 | ▶ Unit 03 |
| `/home/clubs/:clubId` | (▶ Unit 04 클럽 상세 화면) | SCR-CL-002 클럽 상세 | ▶ Unit 04 |
| `/home/market/:planId` | `lib/presentation/home/screens/market_plan_detail_screen.dart` | SCR-MK-002 플랜 상세 | ▶ Unit 08 (마켓) |

> 추천/인근/예정 이벤트 카드, 인기 클럽 카드, 새 플랜 카드의 탭 핸들러는 모두 `home_feed_screen.dart`에 정의되어 있고 `context.go(...)`로 라우팅한다.

### 화면별 구성 요소 & 액션

### 메인 피드 카드 탭 핸들러 (`home_feed_screen.dart`)

`HomeFeedScreen._buildBody()` 내부에서 각 섹션 위젯에 콜백을 주입한다.

- **추천 이벤트 섹션 카드 탭**:
  ```dart
  RecommendEventSection(
    events: events,
    onMoreTap: () => context.go('/home/recommend'),
    onEventTap: (event) => context.go('/home/recommend/${event.eventId}'),
  )
  ```
  - `RecommendEvent.eventId`를 path param으로 사용
  - 추천 카드 탭 → SCR-HF-003 (`recommend_detail_screen.dart`)
  - "더보기" 탭 → F02-04 (`/home/recommend`)

- **예정/인근 이벤트 섹션 카드 탭**:
  ```dart
  NearbyEventSection(
    events: events,
    onEventTap: (event) => context.go('/home/events/${event.id}'),
  )
  ```
  - `EventSimpleVo.id`를 path param으로 사용
  - 카드 탭 → SCR-EV-002 (Unit 03 이벤트 상세)

- **인기 클럽 섹션 카드 탭**:
  ```dart
  PopularClubSection(
    clubs: clubs,
    onClubTap: (club) => context.go('/home/clubs/${club.id}'),
  )
  ```
  - `ClubSimpleVo.id`를 path param으로 사용
  - 카드 탭 → SCR-CL-002 (Unit 04 클럽 상세)

- **새 플랜 섹션 카드 탭**:
  ```dart
  NewPlanSection(
    plans: plans,
    onPlanTap: (plan) => context.go('/home/market/${plan.id}'),
  )
  ```
  - `PlanSimpleVo.id`를 path param으로 사용
  - 카드 탭 → SCR-MK-002 (Unit 08 / `market_plan_detail_screen.dart`)

### 상태 분기 (탭 시점)

- 본 기능은 카드를 탭하는 즉시 라우팅하므로 별도의 로딩/에러 상태가 없다(상세 화면이 자체 로딩/에러 처리).
- 카드가 표시되어 있다 = 그 카드의 식별자가 유효하다 = 라우팅 가능. 빈 섹션(EmptySection)일 때는 카드 자체가 없으므로 진입할 수 없다.
- 카드 탭으로 인한 토스트/모달은 없음. 즉시 push 트랜지션으로 상세 화면 진입.

### 모달/시트/네비게이션

- 모두 `context.go(...)` (replace) 가 아닌 GoRouter의 push 의미로 동작 — 상세 화면에서 백버튼으로 홈으로 복귀 가능.
- `StatefulShellRoute.indexedStack` Branch 0 안에서의 네비게이션이므로 다른 탭(검색/클럽/알림/프로필)은 영향받지 않는다.
- 홈으로 복귀 시 `homeFeedNotifierProvider`는 `keepAlive=false`라 dispose될 수 있지만, 데이터 캐시는 `homeRepositoryProvider`(`keepAlive=true`)에 보관되므로 5분 이내 재진입은 즉시 복원.

### API 호출 순서 (Provider/Repository 관점)

1. 사용자가 카드 탭 → `onEventTap` / `onClubTap` / `onPlanTap` 콜백 실행
2. `context.go('/home/<segment>/<id>')` → GoRouter가 라우트 일치 → 대상 ScreenWidget 빌드
3. **여기까지가 본 유닛의 책임 끝.** 이후 상세 화면이 자체 Provider로 도메인 API 호출:
   - `/home/recommend/:eventId` → `recommendDetailNotifierProvider(eventId)` → `EventRepository.getEventDetail(eventId)` + `EventRepository.getRecommendEvents(size:6)` (▶ Unit 03)
   - `/home/events/:eventId` → 이벤트 상세 Provider (▶ Unit 03)
   - `/home/clubs/:clubId` → 클럽 상세 Provider (▶ Unit 04)
   - `/home/market/:planId` → `planDetailNotifierProvider(planId)` (▶ Unit 08)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **카드 ↔ 라우트 매핑 규칙**: 추천/예정/인근 이벤트 카드 모두 `EventSimpleVo` 또는 `RecommendEvent`이지만, 추천 섹션 카드만 `/home/recommend/:eventId` (SCR-HF-003)로, 예정/인근 카드는 직접 `/home/events/:eventId` (SCR-EV-002)로 진입한다. 즉 같은 이벤트라도 어느 섹션의 카드에서 들어왔는지에 따라 1단계 더 추천 상세를 거치는지가 달라진다.
- **path parameter 추출**: 클라이언트가 `event.id` / `club.id` / `plan.id` / `recommendEvent.eventId`를 직접 문자열 보간 → URL 조립.
- **트래킹**: 별도 트래킹 콜은 본 유닛 화면 코드에서 명시적으로 호출되지 않지만, AppBar 액션 등에는 `trackedAction`이 사용됨(카드 탭의 트래킹 여부는 미확인).
- **카드 가시 영역 트래킹**: 트렌딩 점수를 위한 `recordView(eventId)` 호출은 본 유닛에서 직접 하지 않는다 — 상세 화면 진입 또는 별도 도메인 로직에서 호출되며, 이 부분은 Unit 03/검색 도메인 영역.
- **공유 링크 진입**: `Routes.publicRoutes`에 `/home/events`, `/home/clubs`가 포함되어 있어 비로그인 사용자도 공유 링크로 카드 진입 후 상세를 일정 부분 볼 수 있도록 설계됨. `/home/recommend`나 `/home/market`은 publicRoutes에 명시되어 있지 않다.
- **돌아왔을 때 스크롤 위치 보존**: `StatefulShellRoute`의 indexedStack 동작과 `homeRepositoryProvider`의 keepAlive 캐시 덕에 동일 데이터 + 동일 스크롤 위치 유지 가능(다만 `homeFeedNotifierProvider`가 재 build되면 캐시 hit으로 즉시 복원).

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 추천 이벤트 카드 → 추천 상세 진입 | 4개 섹션 모두 정상 렌더, 추천 이벤트 카드 `eventId=123` 표시. | 사용자가 추천 이유와 함께 이벤트를 깊게 탐색한 후 상세로 이어짐. |
| S2 | (예정/인근 이벤트) 카드에서 바로 이벤트 상세 | 이번 주 가까운 모임을 찾는 사용자. | 사용자가 추천 상세를 우회하고 바로 이벤트 상세로 진입. |
| S3 | (인기 클럽) 클럽 카드 → 클럽 상세 | 자주 활동하는 클럽을 둘러보는 사용자. | 사용자가 클럽 상세에 진입. |
| S4 | (새 플랜) 플랜 카드 → 마켓 플랜 상세 | 새 플랜을 검색 없이 둘러보는 사용자. | 사용자가 플랜 상세에 진입. |
| S5 | (백버튼 복귀) 상세에서 홈으로 돌아왔을 때 캐시 복원 | 30초 전 홈 진입, `_lastFetchTime`이 30초 전, 카드 진입 후 즉시 복귀. | 사용자는 빠르게 홈으로 복귀해 다른 카드를 탐색. |
| S6 | (잘못된 식별자) 라우터에 도달하지 못한 ID | 일반 사용자 흐름에서는 발생 가능성 낮음(서버가 카드 데이터를 응답할 때만 카드가 그려짐). | 본 유닛은 라우팅까지만 보장하고, 잘못된 식별자 처리는 도메인 유닛에서 흡수. |
| S7 | (비로그인 진입) 게스트가 카드를 탭 | 비로그인 상태로 홈을 둘러보는 사용자. | 게스트가 가입 퍼널로 자연 진입. |

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
| 후보 | backend.md:42 | - `/home/market`은 `publicRoutes` 목록에 없다(현재 코드 기준). 비로그인 시 라우터 가드가 어떻게 동작하는지는 본 유닛 범위가 아니며 라우터/마켓 유닛 책임. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:93 | - **트래킹**: 별도 트래킹 콜은 본 유닛 화면 코드에서 명시적으로 호출되지 않지만, AppBar 액션 등에는 `trackedAction`이 사용됨(카드 탭의 트래킹 여부는 미확인). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 추천 이벤트 카드 → 추천 상세 진입**: Given 4개 섹션 모두 정상 렌더, 추천 이벤트 카드 `eventId=123` 표시. When 사용자가 해당 흐름을 실행하면 Then 사용자가 추천 이유와 함께 이벤트를 깊게 탐색한 후 상세로 이어짐.
- **AC-02. (예정/인근 이벤트) 카드에서 바로 이벤트 상세**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 추천 상세를 우회하고 바로 이벤트 상세로 진입.
- **AC-03. (인기 클럽) 클럽 카드 → 클럽 상세**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 클럽 상세에 진입.
- **AC-04. (새 플랜) 플랜 카드 → 마켓 플랜 상세**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 플랜 상세에 진입.
- **AC-05. (백버튼 복귀) 상세에서 홈으로 돌아왔을 때 캐시 복원**: Given 30초 전 홈 진입, `_lastFetchTime`이 30초 전, 카드 진입 후 즉시 복귀. When 사용자가 해당 흐름을 실행하면 Then 사용자는 빠르게 홈으로 복귀해 다른 카드를 탐색.
- **AC-06. (잘못된 식별자) 라우터에 도달하지 못한 ID**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본 유닛은 라우팅까지만 보장하고, 잘못된 식별자 처리는 도메인 유닛에서 흡수.
- **AC-07. (비로그인 진입) 게스트가 카드를 탭**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 게스트가 가입 퍼널로 자연 진입.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
