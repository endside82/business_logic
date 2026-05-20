# F02-04. 추천 이벤트 더보기·필터·무한스크롤 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/02_home_feed/F02-04_recommend-events-more -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/02_home_feed/F02-04_recommend-events-more`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

홈 피드의 추천 이벤트 가로 스크롤 섹션에서 "더보기"를 누르면 진입하는 SCR-HF-002 추천 이벤트 리스트 화면을 위한 API 묶음이다. 사용자가 화면을 끝까지 스크롤할수록 다음 페이지를 추가로 받아 누적 표시한다(무한 스크롤). 필터/정렬은 현재 클라이언트 사이드에서만 처리하며(서버는 별도 필터 파라미터를 받지 않음), 본 유닛에서는 페이지네이션과 트렌딩 보강에 사용 가능한 서버 엔드포인트만 다룬다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 메인 피드(SCR-HF-001) 추천 이벤트 섹션의 "더보기" 탭 → `/home/recommend`
- 추천 상세(SCR-HF-003) 화면에서 백버튼으로 복귀 시 같은 라우트로 복귀

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/02_home_feed/F02-04_recommend-events-more/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/02_home_feed/F02-04_recommend-events-more/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/02_home_feed/F02-04_recommend-events-more/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/02_home_feed/F02-04_recommend-events-more/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:92` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/TrendingController.java:22` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

홈 피드의 추천 이벤트 가로 스크롤 섹션에서 "더보기"를 누르면 진입하는 SCR-HF-002 추천 이벤트 리스트 화면을 위한 API 묶음이다. 사용자가 화면을 끝까지 스크롤할수록 다음 페이지를 추가로 받아 누적 표시한다(무한 스크롤). 필터/정렬은 현재 클라이언트 사이드에서만 처리하며(서버는 별도 필터 파라미터를 받지 않음), 본 유닛에서는 페이지네이션과 트렌딩 보강에 사용 가능한 서버 엔드포인트만 다룬다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/recommend` | (▶ Unit 03 위임) | (Unit 03 정책) | 추천 이벤트 페이지 — 클라이언트가 page/size로 무한스크롤 |
| GET | `/api/v1/search/trending` | `TrendingController#getTrending` | 공개 | 트렌딩 점수 ZSET 상위 N개 (인기/추천 시그널 보강용) |

> **본 유닛 범위 안에서 직접 정의된 서버 코드는 트렌딩(`/api/v1/search/trending`) 뿐이다.** 추천 이벤트의 실제 서버 구현(컨트롤러/서비스/스코어링)은 `event` 도메인에 있어 ▶ Unit 03로 위임한다. 본 문서는 SCR-HF-002 화면이 호출하는 패턴만 정리한다.

### 도메인 모델 / Enum (이 기능 관련)

- **`RecommendEvent`**: 본 유닛 코드 탐색 범위 밖에서 정의됨 (이벤트 도메인 / 클라이언트 측 freezed 모델).
- **트렌딩 응답**: 정형 VO 없이 `Map<String, Object>` — 클라이언트가 임의 키에 의존.
- **EventStatus** (참조만): 트렌딩 필터에서 `OPEN`만 통과.

### 의존 단위 / 외부 시스템

- **다른 Unit 의존**:
  - 추천 이벤트 페이지네이션 → ▶ Unit 03
  - 추천 상세 진입 후 `GET /api/v1/events/{eventId}` → ▶ Unit 03
- **외부 시스템**:
  - **Redis (Redisson)**: 트렌딩 ZSET `trending:scores` (사용 시).
  - **MySQL**: 트렌딩 결과의 이벤트 메타 조회.

## 5. 프론트 계약

### 진입 경로

- 메인 피드(SCR-HF-001) 추천 이벤트 섹션의 "더보기" 탭 → `/home/recommend`
- 추천 상세(SCR-HF-003) 화면에서 백버튼으로 복귀 시 같은 라우트로 복귀

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/recommend` | `lib/presentation/home/screens/recommend_events_screen.dart` | SCR-HF-002 추천 이벤트 리스트 (필터·정렬·무한스크롤) |
| `/home/recommend/:eventId` | `lib/presentation/home/screens/recommend_detail_screen.dart` | SCR-HF-003 추천 상세 (추천 이유 + 유사 이벤트 + "이벤트 상세 보기" CTA) |

### 화면별 구성 요소 & 액션

### SCR-HF-002 추천 이벤트 리스트 (`recommend_events_screen.dart`)

- **사용자가 보는 것**:
  1. `CommunityAppBar(title: '추천 이벤트', showBackButton: true)`
  2. 상단 필터 바 (`_buildFilterBar`):
     - 가로 스크롤 `FilterChip` 묶음 (날짜 범위 칩 3개 + 가격 타입 칩 2개)
     - 활성 필터 N개일 때 우측에 N개 표시 + X 아이콘 (탭 시 모두 해제)
     - 우측 끝 `DropdownButton<RecommendSort>` (정렬 4개)
  3. `Divider(height: 1)`
  4. 본문 — `ListView.separated`
     - 각 `EventCard(variant: EventCardVariant.normal, ...)` (썸네일/제목/시작·종료/주소/참석/가격)
     - 카드 우상단 추천 이유 배지(`RecommendBadge`)와 `EventViewerBadge`(본인 attend status가 있는 경우) 결합
     - `LoadingFooter` (무한스크롤 진행 중 spinner) 또는 종료 안내("더 이상 추천 이벤트가 없습니다")
- **사용자가 할 수 있는 액션**:
  - 카드 탭 ▶ `context.go('/home/recommend/${event.eventId}')` → SCR-HF-003 진입
  - 날짜 칩 탭 ▶ `notifier.setDateRange(...)` ▶ 페이지 0부터 재로드
  - 가격 칩 탭 ▶ `notifier.setPriceType(...)` ▶ 페이지 0부터 재로드
  - 정렬 드롭다운 변경 ▶ `notifier.setSort(...)` ▶ 페이지 0부터 재로드
  - 활성 필터 카운터의 X 탭 ▶ 모든 필터를 기본값으로 reset
  - 스크롤 하단 도달 (200px 이내) ▶ `notifier.loadMore()` ▶ 다음 페이지 호출
- **상태 분기**:
  - 초기 로딩: `SkeletonLoader(preset: SkeletonPreset.card, count: 3)` (전체 컨테이너 padding `screenPadding`)
  - 0건 데이터: `AppEmptyState(icon: Icons.event_outlined, title: '맞춤 추천 이벤트가 없습니다', description: '관심사 태그를 추가해보세요')`
  - 에러: `AppErrorState(title: '추천 이벤트를 불러올 수 없습니다', onRetry: invalidate)`
  - 마지막 페이지: 리스트 마지막에 `Text('더 이상 추천 이벤트가 없습니다')`
  - 추가 로딩 실패: `state = AsyncValue.data(_items)` (기존 데이터 유지). 별도 토스트 노출 안 함.
- **모달/시트/네비게이션**: 본 화면은 모달을 띄우지 않음. 카드 탭은 자식 라우트로 push.

### SCR-HF-003 추천 상세 (`recommend_detail_screen.dart`)

- **사용자가 보는 것**:
  1. `CommunityAppBar(title: '추천 상세', showBackButton: true)`
  2. 16:9 썸네일 (`AspectRatio` + `CachedNetworkImage`, 폴백: `gray100` + 이미지 아이콘)
  3. 제목 (`AppTypography.heading2`, 최대 2줄, ellipsis)
  4. 정보 4행 (`_buildInfoRow`):
     - 시작/종료 시간 (`M월 d일 (E) HH:mm ~ HH:mm`)
     - 주소
     - 참석 `${current}/${total}명` + 우측 `LinearProgressIndicator` (≥0.8이면 `AppColors.error500`)
     - 가격 (`무료` 또는 `15,000원`)
  5. 추천 이유 카드 (`RecommendReasonList.buildReasons(remainingSlots: ...)` 결과가 있을 때만)
  6. CTA `AppButton(label: '이벤트 상세 보기', variant: ButtonVariant.primary)` → `/home/events/${event.id}` (▶ Unit 03 위임)
  7. 유사 이벤트 가로 스크롤 섹션 (`SimilarEventSection`) — 카드 탭 시 `/home/recommend/${event.eventId}`로 또 push (스택 누적)
- **사용자가 할 수 있는 액션**:
  - "이벤트 상세 보기" ▶ Unit 03 이벤트 상세로 진입
  - 유사 이벤트 카드 탭 ▶ 같은 SCR-HF-003 다른 eventId로 push (depth 추적은 라우터 책임)
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.detail)`
  - 에러: `AppErrorState(title: '상세 정보를 불러올 수 없습니다', onRetry: invalidate)`
  - `state.eventDetail == null` (성공했으나 데이터 없음): `AppErrorState(title: '이벤트 정보가 없습니다')`
- **모달/시트/네비게이션**: 별도 모달 없음.

### API 호출 순서 (Provider/Repository 관점)

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

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **무한 스크롤 트리거 거리**: `maxScrollExtent - 200`px 도달 시 `loadMore()`.
- **페이지 사이즈**: `RecommendEventsNotifier._pageSize = 20`.
- **클라이언트 사이드 필터/정렬** (서버 미지원):
  - `RecommendDateRange.thisWeek` → `now ~ now+7d` 범위로 `startTime` 필터
  - `RecommendDateRange.thisMonth` → `now ~ DateTime(year, month+1, day)` 범위로 필터
  - `RecommendPriceType.free` → `price == 0`만, `paid` → `price > 0`만
  - `RecommendSort.recommend` → 서버 기본 순서 유지 (별도 정렬 안 함)
  - `RecommendSort.startTime` → `startTime` ASC, null은 뒤
  - `RecommendSort.popularity` → `currentAttendees` DESC
  - `RecommendSort.distance` → `matchScores['distance']` DESC (점수 높을수록 가까움)
- **거리 정렬 비활성화 조건**: `LocationPermissionStatus.granted`가 아니면 정렬 드롭다운에서 "가까운 순"을 disabled.
- **위치 좌표 전달 시점**: 호출 직전에 `getCurrentPosition()`을 시도. 실패 시 좌표 없이 호출(서버가 거리 점수를 제외하도록).
- **빈 상태 문구**: "맞춤 추천 이벤트가 없습니다" + 부설명 "관심사 태그를 추가해보세요".
- **마지막 페이지 안내 문구**: "더 이상 추천 이벤트가 없습니다" (`AppTypography.body2`, `textTertiary` 색).
- **추천 이유 배지 매핑** (`_buildRecommendationBadge`): 가장 높은 score 키를 기준으로 한 종류만 노출.
  - `'distance'` → `RecommendBadgeType.nearby`
  - `'popularity'` → `RecommendBadgeType.popular`
  - `'recency'` → `RecommendBadgeType.newEvent`
  - `'time'` → `RecommendBadgeType.urgency`
  - `'review'` → `RecommendBadgeType.interest`
- **상세 화면 추천 이유 결정**: `RecommendReasonList.buildReasons(remainingSlots: ...)` (잔여석 기반 마감 임박 등)는 클라이언트 정의이며 서버 score를 직접 사용하지 않는다.
- **유사 이벤트 갯수**: 서버에서 `excludeId`를 지원하지 않으므로 size=6으로 받아 자기 자신 제외 + 최대 5개로 클립.
- **테스트 ID**: `TestIds.screenHomeRecommend` (목록), `TestIds.screenHomeRecommendDetail` (상세).
- **에러/추가 로딩 실패 처리**: 추가 페이지 호출 실패 시 토스트나 배너 없이 기존 데이터 유지(사용자에게 명시적 안내 없음 — 추후 보강 여지).
- **디자인 토큰**: `AppSpacing.screenPadding` (16) 일관 적용. 칩 높이/패딩은 `MaterialTapTargetSize.shrinkWrap`, `VisualDensity.compact`로 조밀하게.

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
