# F05-02. 자동완성 서제스트 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/05_search/F05-02_autocomplete-suggest -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/05_search/F05-02_autocomplete-suggest`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 검색바에 2글자 이상 입력하면 카테고리 라벨과 미래 이벤트 제목을 후보로 제공한다. 단일 엔드포인트(`GET /api/v1/search/suggest`)이며, 카테고리 매칭 → 이벤트 제목 매칭 순으로 합쳐 최대 `limit` 개를 반환한다. 인증 불필요.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 검색 화면(`/search`) 검색바에 키 입력 시 자동 트리거. 별도 라우트 없음.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/05_search/F05-02_autocomplete-suggest/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/05_search/F05-02_autocomplete-suggest/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/05_search/F05-02_autocomplete-suggest/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/05_search/F05-02_autocomplete-suggest/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:83` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### Provider
- `searchSuggestNotifierProvider` (`@riverpod` auto-dispose, `class SearchSuggestNotifier`):
  - `state: List<SearchSuggestResponse>`
  - `_debounceTimer: Timer?` — Notifier 자체 내부에도 디바운스 보유 (화면 디바운스와 중복)
  - `onQueryChanged(query)`: `query.length < 2`면 즉시 `[]`. 2 이상이면 300ms 후 `_fetchSuggestions(query)` 호출
  - `_fetchSuggestions(query)` → `repo.suggest(query: query, limit: 8)` → `state = result success ? suggestions : []`
  - `clear()` — 타이머 취소 + `state = []`
  - `ref.onDispose`로 타이머 정리

### 호출 흐름
1. 사용자 입력 → `_onQueryChanged` (화면 300ms 디바운스)
2. `searchSuggestNotifierProvider.notifier.onQueryChanged(query)` (notifier 300ms 디바운스 추가)
3. `searchRepositoryProvider.suggest(query, limit: 8)` → `GET /api/v1/search/suggest?q=...&limit=8`
4. `state = suggestions` → `ref.watch(searchSuggestNotifierProvider)`이 변경 → `SuggestDropdown` 리빌드

### 항목 선택 시
- `SuggestDropdown.onSelect(text)` → `_searchController.text = text` + `_onSearch(text)` (F05-01 검색)
- `_onSearch` 내부에서 `searchSuggestNotifierProvider.notifier.clear()` 호출 → 드롭다운 닫힘

## 4. 서버 계약

### 개요

사용자가 검색바에 2글자 이상 입력하면 카테고리 라벨과 미래 이벤트 제목을 후보로 제공한다. 단일 엔드포인트(`GET /api/v1/search/suggest`)이며, 카테고리 매칭 → 이벤트 제목 매칭 순으로 합쳐 최대 `limit` 개를 반환한다. 인증 불필요.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/search/suggest` | `SearchController#suggest` | optional | `q`로 카테고리 + 이벤트 제목 추천 |

### 도메인 모델 / Enum (이 기능 관련)

- **`SuggestionVo`** (`vo/SuggestionVo.java`): `type`, `text`, `eventId`, `score`
- **`Category`** (Unit 03): suggest 대상 라벨/name 매칭 — `보드게임/등산/요리/독서/스포츠/음악/미술/언어교환/기술/IT/소셜/네트워킹/여행/사진/맛집탐방/피트니스/기타`
- **이벤트 제목 후보 (`EventSearchRepository.suggestEventTitles`)**:
  - `event.status = OPEN` AND `event.title.containsIgnoreCase(keyword)` AND `event.startTime > now`
  - 정렬: `event.currentCapacity DESC`
  - `limit` 적용 후 `.distinct()`로 중복 제목 제거

### 의존 단위 / 외부 시스템

- **다른 Unit 의존**: Unit 03 (Event) — `Category` enum, `Event` 엔티티
- **외부 시스템**: 없음
- **호출 빈도**: 사용자 키 입력마다(프론트 디바운스 300ms로 완화)

## 5. 프론트 계약

### 진입 경로

- 검색 화면(`/search`) 검색바에 키 입력 시 자동 트리거. 별도 라우트 없음.

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/search` | `lib/presentation/search/screens/search_screen.dart` | 검색바 입력 처리 |

관련 위젯
| 파일 | 역할 |
|---|---|
| `widgets/suggest_dropdown.dart` | 검색바 아래 떠 있는 추천 드롭다운 (오버레이) |
| `widgets/trending_keyword_chips.dart` | (Unit 02 트렌딩 데이터 사용) idle 상태에서 트렌딩 키워드 노출 — 자동완성과 동일 흐름의 idle 상태 입력 보조 |

### 화면별 구성 요소 & 액션

### 검색바 입력 + `SuggestDropdown` (`search_screen.dart` + `suggest_dropdown.dart`)

- **사용자가 보는 것**:
  - `SuggestDropdown` 카드 (rounded 12, shadow blur 16) — `_showSuggestions == true` 이고 `suggestions.isNotEmpty` 일 때만 표시
  - 각 `ListTile` (dense): 좌측 아이콘 (`Icons.event_outlined` for `type=='event'` / 그 외 `Icons.search`) + 텍스트 1줄 (ellipsis)
  - 항목 사이 `Divider(height:1, indent:16, endIndent:16)`
- **사용자가 할 수 있는 액션**:
  - 키 입력 → `_onQueryChanged(query)`:
    - 기존 `_debounce` Timer 취소
    - 300ms `Timer` 시작 → `searchSuggestNotifierProvider.onQueryChanged(query)` 호출 + `setState(_showSuggestions = query.length >= 2)`
  - 추천 항목 탭 → `onSelect(text)` → 검색바 텍스트를 해당 텍스트로 교체 + `_onSearch(text)` (F05-01 검색 실행)
  - 입력 비움 → `_onClear()`: 디바운스 취소 + `searchSuggestNotifierProvider.clear()` + `_showSuggestions = false`
  - 검색 실행 후 → `_showSuggestions = false`로 드롭다운 숨김
- **상태 분기**:
  - `query.length < 2` → 추천 빈 배열로 즉시 reset (`SearchSuggestNotifier.onQueryChanged` 내부에서 `state = []`)
  - 빈 응답 → `SuggestDropdown`이 `SizedBox.shrink()` 반환 (드롭다운 미노출)
  - 에러 → notifier가 빈 배열로 폴백 (`failure: (_) => state = []`) → 드롭다운 미노출
- **모달/시트/네비게이션**: 드롭다운은 `Stack` 위 `Positioned(top:0, left:0, right:0)` 오버레이. 항목 선택 시 화면 전환 없음 (검색 결과로 갱신).

### 트렌딩 키워드 (idle 상태 입력 보조)

- 입력이 없는 포커스 상태에서는 `TrendingKeywordChips`가 별도로 표시되어 자동완성을 대체하는 빠른 입력 보조 역할.
- 트렌딩 데이터 자체는 Unit 02 `trendingKeywordsProvider` (이 Unit에서는 사용만 한다).
- 칩 탭 → `_onSearch(keyword)` 직접 호출 (F05-01).

### API 호출 순서 (Provider/Repository 관점)

### Provider
- `searchSuggestNotifierProvider` (`@riverpod` auto-dispose, `class SearchSuggestNotifier`):
  - `state: List<SearchSuggestResponse>`
  - `_debounceTimer: Timer?` — Notifier 자체 내부에도 디바운스 보유 (화면 디바운스와 중복)
  - `onQueryChanged(query)`: `query.length < 2`면 즉시 `[]`. 2 이상이면 300ms 후 `_fetchSuggestions(query)` 호출
  - `_fetchSuggestions(query)` → `repo.suggest(query: query, limit: 8)` → `state = result success ? suggestions : []`
  - `clear()` — 타이머 취소 + `state = []`
  - `ref.onDispose`로 타이머 정리

### 호출 흐름
1. 사용자 입력 → `_onQueryChanged` (화면 300ms 디바운스)
2. `searchSuggestNotifierProvider.notifier.onQueryChanged(query)` (notifier 300ms 디바운스 추가)
3. `searchRepositoryProvider.suggest(query, limit: 8)` → `GET /api/v1/search/suggest?q=...&limit=8`
4. `state = suggestions` → `ref.watch(searchSuggestNotifierProvider)`이 변경 → `SuggestDropdown` 리빌드

### 항목 선택 시
- `SuggestDropdown.onSelect(text)` → `_searchController.text = text` + `_onSearch(text)` (F05-01 검색)
- `_onSearch` 내부에서 `searchSuggestNotifierProvider.notifier.clear()` 호출 → 드롭다운 닫힘

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 카테고리 + 이벤트 제목 추천 | `/search` 화면, 검색바 포커스됨 | "주말 등산 클럽" 키워드로 이벤트/클럽/플랜 검색 결과 화면 |
| S2 | 빠른 타이핑 (디바운스) | 시나리오 본문 참조 | 1번의 `GET /api/v1/search/suggest` 호출 |
| S3 | 입력 클리어 | 시나리오 본문 참조 | idle 상태로 복귀 (최근 검색어 + 트렌딩 키워드 표시) |
| S4 | 빈 결과 (서버 매칭 없음) | 시나리오 본문 참조 | 사용자가 다른 입력 시도 |
| S5 | 에러 시나리오 (네트워크 끊김) | 시나리오 본문 참조 | 자동완성은 무시되고 일반 검색 흐름으로 진행 가능 |
| S6 | 추천 항목으로 트렌딩과 동일 키워드 발견 | 시나리오 본문 참조 | 트렌딩 칩과 자동완성 첫 항목은 동일한 액션을 실행 (둘 다 `_onSearch` 호출). 이중 진입점. |
| S7 | 다국어/대소문자 매칭 | `/search` 화면에 진입한 상태. 검색바 자동 포커스(`autofocus: true`). 시드 데이터의 모든 OPEN 이벤트 `start_time` 이 2026-03/04 → 오늘(2026-05-09) 기준 과거이므로 서버 `suggestEventTitles` 의 `startTime > now` 가드로 `type=event` 매칭은 0건. 따라서 시드 환경에서 매칭 가능한 통로는 `Category` enum 라벨 매칭(label="등산", HIKING) 뿐. | 입력 언어와 무관하게 카테고리 라벨 매칭 가능 |

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
| 후보 | backend.md:26 | - `eventId`: `Long?` — 현재 코드에서는 항상 null (Builder에서 미설정) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:82 | - **자동완성 항목 클릭 시 동작**: 항상 키워드를 그대로 검색 실행 (eventId가 있어도 직접 이벤트 상세로 이동하지 않음 — 현재 코드 기준) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. Happy Path — 카테고리 + 이벤트 제목 추천**: Given `/search` 화면, 검색바 포커스됨 When 사용자가 해당 흐름을 실행하면 Then "주말 등산 클럽" 키워드로 이벤트/클럽/플랜 검색 결과 화면
- **AC-02. 빠른 타이핑 (디바운스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 1번의 `GET /api/v1/search/suggest` 호출
- **AC-03. 입력 클리어**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then idle 상태로 복귀 (최근 검색어 + 트렌딩 키워드 표시)
- **AC-04. 빈 결과 (서버 매칭 없음)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 입력 시도
- **AC-05. 에러 시나리오 (네트워크 끊김)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 자동완성은 무시되고 일반 검색 흐름으로 진행 가능
- **AC-06. 추천 항목으로 트렌딩과 동일 키워드 발견**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 트렌딩 칩과 자동완성 첫 항목은 동일한 액션을 실행 (둘 다 `_onSearch` 호출). 이중 진입점.
- **AC-07. 다국어/대소문자 매칭**: Given `/search` 화면에 진입한 상태. 검색바 자동 포커스(`autofocus: true`). 시드 데이터의 모든 OPEN 이벤트 `start_time` 이 2026-03/04 → 오늘(2026-05-09) 기준 과거이므로 서버 `suggestEventTitles` 의 `startTime > now` 가드로 `type=event` 매칭은 0건. 따라서 시드 환경에서 매칭 가능한 통로는 `Category` enum 라벨 매칭(label="등산", HIKING) 뿐. When 사용자가 해당 흐름을 실행하면 Then 입력 언어와 무관하게 카테고리 라벨 매칭 가능

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
