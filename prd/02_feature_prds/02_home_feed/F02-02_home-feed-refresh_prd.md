# F02-02. 홈 피드 새로고침 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/02_home_feed/F02-02_home-feed-refresh -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/02_home_feed/F02-02_home-feed-refresh`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

홈 피드 메인 화면(SCR-HF-001)에서 사용자가 화면을 아래로 당겨 명시적으로 갱신을 요청할 때 호출되는 API 묶음이다. 백엔드 관점에서는 F02-01과 **완전히 동일한 4개 엔드포인트를 그대로 재호출**하므로 서버 로직에 변화가 없다. 차이는 클라이언트가 자체 캐시를 무시하고 강제로 새 응답을 받아온다는 점뿐이다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 메인 피드(SCR-HF-001) 화면에 진입한 상태에서, 화면을 아래로 당기는 제스처(Pull-to-refresh) 사용
- 프로그래밍적 호출: `homeFeedNotifierProvider.notifier.refresh()` (재시도 버튼, 일부 에러 화면의 onRetry)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/02_home_feed/F02-02_home-feed-refresh/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/02_home_feed/F02-02_home-feed-refresh/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/02_home_feed/F02-02_home-feed-refresh/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/02_home_feed/F02-02_home-feed-refresh/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 사용자가 풀투리프레시 → `RefreshIndicator.onRefresh` 콜백 실행
2. `HomeFeedNotifier.refresh()`:
   - `state = const HomeFeedState();` (4개 섹션 모두 `AsyncValue.loading`으로 리셋)
   - `await _loadFeed(forceRefresh: true)`
3. `HomeRepository.fetchHomeFeed(forceRefresh: true)`:
   - `_isCacheValid && !forceRefresh` 분기 통과 → 캐시 무시
   - `Future.wait`로 4개 호출 병렬 실행
4. 각 호출은 F02-01과 동일:
   - `EventApi.getRecommendEvents(...)` ▶ Unit 03 영역
   - `HomeApi.getUpcomingEvents(sort: 'startTime,asc', size: 10)`
   - `HomeApi.getPopularClubs(sort: 'memberCount,desc', size: 5)`
   - `HomeApi.getNewPlans(sort: 'createdAt,desc', size: 5)`
5. 4개 결과를 `Result<T>`로 받아 캐시(`_cachedXxx`) 갱신, 하나라도 success면 `_lastFetchTime = now()` 재설정
6. `HomeFeedNotifier`가 `state.copyWith(...)`로 4개 `AsyncValue` 동시 갱신 → 화면 자동 rebuild

## 4. 서버 계약

### 개요

홈 피드 메인 화면(SCR-HF-001)에서 사용자가 화면을 아래로 당겨 명시적으로 갱신을 요청할 때 호출되는 API 묶음이다. 백엔드 관점에서는 F02-01과 **완전히 동일한 4개 엔드포인트를 그대로 재호출**하므로 서버 로직에 변화가 없다. 차이는 클라이언트가 자체 캐시를 무시하고 강제로 새 응답을 받아온다는 점뿐이다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/home/clubs` | `HomeController#getPopularClubs` | optional | F02-01과 동일 — ACTIVE 클럽 페이지, 기본 `memberCount,desc` |
| GET | `/api/v1/home/plans` | `HomeController#getNewPlans` | optional | F02-01과 동일 — PUBLISHED 플랜 페이지, 기본 `createdAt,desc` |
| GET | `/api/v1/home/events` | `HomeController#getUpcomingEvents` | (없음) | F02-01과 동일 — OPEN + `startTime > now` 페이지 |
| GET | `/api/v1/events/recommend` | (▶ Unit 03로 위임) | required | 추천 이벤트 페이지 (홈 화면이 위치 좌표 없이 호출) |

> 트렌딩 엔드포인트(`/api/v1/search/trending`)는 본 화면에서 직접 호출하지 않는다 — 클라이언트의 `HomeRepository.fetchHomeFeed()`는 위 4개만 fan-out한다.

### 의존 단위 / 외부 시스템

- F02-01과 동일 의존 (Club / Event / Plan / Account 도메인 + MySQL).
- 새로고침 자체는 추가적인 외부 시스템 호출(FCM/PG/Redis 쓰기 등)을 트리거하지 않는다.

## 5. 프론트 계약

### 진입 경로

- 메인 피드(SCR-HF-001) 화면에 진입한 상태에서, 화면을 아래로 당기는 제스처(Pull-to-refresh) 사용
- 프로그래밍적 호출: `homeFeedNotifierProvider.notifier.refresh()` (재시도 버튼, 일부 에러 화면의 onRetry)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home` | `lib/presentation/home/screens/home_feed_screen.dart` | F02-01과 동일 — `RefreshIndicator`로 새로고침 트리거 |

### 화면별 구성 요소 & 액션

### 메인 피드 (`home_feed_screen.dart`) — 새로고침 관점

- **사용자가 보는 것**:
  - 화면 상단에 회전하는 `RefreshIndicator` (색상 `AppColors.primary500`, Material 기본 디자인)
  - 새로고침 중에도 기존 카드 데이터는 유지(스켈레톤이 다시 뜨지 않음 — `state = const HomeFeedState()`로 초기화하지만 `_loadFeed()`는 즉시 await되어 빠르게 새 데이터로 덮어씀)
- **사용자가 할 수 있는 액션**:
  - 화면 아래로 당기기(>40px 정도) → `RefreshIndicator.onRefresh: () => ref.read(homeFeedNotifierProvider.notifier).refresh()`
  - "재시도" 버튼 탭 (전체 에러 / 섹션별 에러) → 동일하게 `refresh()` 호출
- **상태 분기**:
  - `RefreshIndicator`가 spinner를 표시하는 동안 백엔드 호출 진행
  - `HomeFeedNotifier.refresh()`가 먼저 `state = const HomeFeedState()` (4개 모두 `AsyncValue.loading`)로 리셋 → 즉시 `_loadFeed(forceRefresh: true)` 호출
  - 응답 도착 시 4개 섹션 각각 `AsyncValue.data` / `AsyncValue.error`로 갱신
- **모달/시트/네비게이션**: 없음. 새로고침 동작은 화면 내부에서 완결된다.

### API 호출 순서 (Provider/Repository 관점)

1. 사용자가 풀투리프레시 → `RefreshIndicator.onRefresh` 콜백 실행
2. `HomeFeedNotifier.refresh()`:
   - `state = const HomeFeedState();` (4개 섹션 모두 `AsyncValue.loading`으로 리셋)
   - `await _loadFeed(forceRefresh: true)`
3. `HomeRepository.fetchHomeFeed(forceRefresh: true)`:
   - `_isCacheValid && !forceRefresh` 분기 통과 → 캐시 무시
   - `Future.wait`로 4개 호출 병렬 실행
4. 각 호출은 F02-01과 동일:
   - `EventApi.getRecommendEvents(...)` ▶ Unit 03 영역
   - `HomeApi.getUpcomingEvents(sort: 'startTime,asc', size: 10)`
   - `HomeApi.getPopularClubs(sort: 'memberCount,desc', size: 5)`
   - `HomeApi.getNewPlans(sort: 'createdAt,desc', size: 5)`
5. 4개 결과를 `Result<T>`로 받아 캐시(`_cachedXxx`) 갱신, 하나라도 success면 `_lastFetchTime = now()` 재설정
6. `HomeFeedNotifier`가 `state.copyWith(...)`로 4개 `AsyncValue` 동시 갱신 → 화면 자동 rebuild

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **캐시 무효화 정책**: `forceRefresh: true`로 클라이언트 캐시(`_cachedRecommendEvents`, `_cachedNearbyEvents`, `_cachedPopularClubs`, `_cachedNewPlans`)를 우회. 호출 성공 시 캐시는 새 데이터로 덮어쓴다.
- **시각적 트랜지션**: `state = const HomeFeedState()` 리셋이 일어나도 `CustomScrollView`의 sliver 안에서 각 섹션 위젯이 `AsyncValue.loading` 처리(예: `RecommendEventSection(events: [], isLoading: true)`)를 통해 부드럽게 처리. `HomeSkeleton` 풀 스켈레톤은 4개 모두 로딩일 때만 잠깐 노출.
- **부분 실패 처리**: 새로고침이라도 4개 중 일부만 실패하면 F02-01과 동일하게 섹션별 "다시 시도" UI 노출(다른 섹션은 새 데이터로 갱신).
- **연속 새로고침 throttle**: 클라이언트에서 별도의 디바운스/쓰로틀을 두지 않음. `RefreshIndicator`가 자체적으로 진행 중 추가 트리거를 막는다.
- **풀투리프레시 거리/속도**: Material 기본값 사용(코드에서 `displacement` 등 별도 지정 없음).
- **Refresh indicator 색상**: `AppColors.primary500` (#3D8A5A 그린).
- **위치 좌표는 새로고침에 영향 없음**: `HomeRepository._fetchNearbyEvents()`는 `latitude/longitude`를 보내지 않음. 추천 이벤트 호출만 위치 권한 결과에 따라 좌표 포함 여부 결정.
- **사용자 인지 피드백**: 토스트 등 별도 메시지를 띄우지 않는다(스피너만으로 진행 상태 표시).
- **에러 토스트**: 새로고침 실패 시 별도 토스트 노출하지 않고, 섹션별 / 전체 `AppErrorState(title:)` UI로 처리.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 사용자가 새 콘텐츠를 보려 풀투리프레시한다 | 홈 피드 진입 후 7분 경과 (캐시 만료 직후), `_lastFetchTime`이 7분 전이지만 마지막 데이터는 화면에 그대로 떠 있음. | 사용자가 명시적으로 갱신해 최신 데이터 확인 완료. |
| S2 | (캐시 hit이지만 강제 새로고침) 1분 전 진입 후 즉시 풀투리프레시 | `_lastFetchTime`이 1분 전 (5분 이내 → 캐시 유효). 화면에는 1분 전 데이터. | 사용자가 "최신 상태"임을 시각적으로 확인. 데이터 변화는 없음. |
| S3 | (네트워크 끊김 중 새로고침) 풀투리프레시 후 전체 실패 | 정상 진입 → 잠시 후 모바일 데이터 끊김. | 사용자가 명시적 재시도로 복구. |
| S4 | (부분 실패) 풀투리프레시 후 인기 클럽만 실패 | 정상 운영. | 다른 섹션은 새로고침 효과를 받고, 실패 섹션만 사용자 액션으로 복구. |
| S5 | (스크롤 위치 보존) 새로고침 후 스크롤 위치 | `CustomScrollView`가 4번째 섹션(최신 플랜)까지 내려간 상태. | 새 데이터 적용 후 화면 위치 유지. |
| S6 | (반복 풀투리프레시) 짧은 시간 내 반복 트리거 | 정상 운영. | 동일 데이터를 반복 가져오지만 사용자 흐름은 막히지 않음. (필요 시 향후 클라이언트 측 minimum-interval 추가 검토 사항.) |

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
| 후보 | backend.md:39 | - **부하**: 같은 사용자가 짧은 시간 내 여러 번 풀투리프레시 → 동일 4개 쿼리 반복. 현재 서버는 이를 throttle하지 않는다(별도 rate limit 미확인). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 사용자가 새 콘텐츠를 보려 풀투리프레시한다**: Given 홈 피드 진입 후 7분 경과 (캐시 만료 직후), `_lastFetchTime`이 7분 전이지만 마지막 데이터는 화면에 그대로 떠 있음. When 사용자가 해당 흐름을 실행하면 Then 사용자가 명시적으로 갱신해 최신 데이터 확인 완료.
- **AC-02. (캐시 hit이지만 강제 새로고침) 1분 전 진입 후 즉시 풀투리프레시**: Given `_lastFetchTime`이 1분 전 (5분 이내 → 캐시 유효). 화면에는 1분 전 데이터. When 사용자가 해당 흐름을 실행하면 Then 사용자가 "최신 상태"임을 시각적으로 확인. 데이터 변화는 없음.
- **AC-03. (네트워크 끊김 중 새로고침) 풀투리프레시 후 전체 실패**: Given 정상 진입 → 잠시 후 모바일 데이터 끊김. When 사용자가 해당 흐름을 실행하면 Then 사용자가 명시적 재시도로 복구.
- **AC-04. (부분 실패) 풀투리프레시 후 인기 클럽만 실패**: Given 정상 운영. When 사용자가 해당 흐름을 실행하면 Then 다른 섹션은 새로고침 효과를 받고, 실패 섹션만 사용자 액션으로 복구.
- **AC-05. (스크롤 위치 보존) 새로고침 후 스크롤 위치**: Given `CustomScrollView`가 4번째 섹션(최신 플랜)까지 내려간 상태. When 사용자가 해당 흐름을 실행하면 Then 새 데이터 적용 후 화면 위치 유지.
- **AC-06. (반복 풀투리프레시) 짧은 시간 내 반복 트리거**: Given 정상 운영. When 사용자가 해당 흐름을 실행하면 Then 동일 데이터를 반복 가져오지만 사용자 흐름은 막히지 않음. (필요 시 향후 클라이언트 측 minimum-interval 추가 검토 사항.)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
