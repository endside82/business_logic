# F05-02. 자동완성 서제스트 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 검색바에 2글자 이상 입력하면 카테고리 라벨과 미래 이벤트 제목을 후보로 제공한다. 단일 엔드포인트(`GET /api/v1/search/suggest`)이며, 카테고리 매칭 → 이벤트 제목 매칭 순으로 합쳐 최대 `limit` 개를 반환한다. 인증 불필요.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 검색 화면(`/search`) 검색바에 키 입력 시 자동 트리거. 별도 라우트 없음.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `SearchController`, `SuggestionVo`. 앱: `search_screen.dart`, `suggest_dropdown.dart`, `trending_keyword_chips.dart`.

<!-- source-references:start -->
서버 창구: `SearchController#suggest`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 두 글자 이상 입력해야 제안이 뜨고, 입력을 멈추고 0.3초 뒤 요청한다. 제안은 최대 8개이다.
- 구성: 카테고리 이름을 먼저, 그 뒤에 아직 시작하지 않은 모집 중 이벤트 제목(참가 인원 많은 순, 같은 제목은 하나)을 보여 준다. 오류가 나면 제안창만 숨기고 일반 검색은 그대로 쓴다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 자동완성 누름 | 자동완성은 검색어 제안이다. 누르면 그 글자로 검색하고 모임 상세로 바로 가지 않는다 | 없음 |

## 9. 수용 기준

- **AC-01. Happy Path — 카테고리 + 이벤트 제목 추천**: Given `/search` 화면, 검색바 포커스됨 When 사용자가 해당 흐름을 실행하면 Then "주말 등산 클럽" 키워드로 이벤트/클럽/플랜 검색 결과 화면
- **AC-02. 빠른 타이핑 (디바운스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 1번의 `GET /api/v1/search/suggest` 호출
- **AC-03. 입력 클리어**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then idle 상태로 복귀 (최근 검색어 + 트렌딩 키워드 표시)
- **AC-04. 빈 결과 (서버 매칭 없음)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 입력 시도
- **AC-05. 에러 시나리오 (네트워크 끊김)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 자동완성은 무시되고 일반 검색 흐름으로 진행 가능
- **AC-06. 추천 항목으로 트렌딩과 동일 키워드 발견**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 트렌딩 칩과 자동완성 첫 항목은 동일한 액션을 실행 (둘 다 `_onSearch` 호출). 이중 진입점.
- **AC-07. 다국어/대소문자 매칭**: Given `/search` 화면에 진입한 상태. 검색바 자동 포커스(`autofocus: true`). 시드 데이터의 모든 OPEN 이벤트 `start_time` 이 2026-03/04 → 오늘(2026-05-09) 기준 과거이므로 서버 `suggestEventTitles` 의 `startTime > now` 가드로 `type=event` 매칭은 0건. 따라서 시드 환경에서 매칭 가능한 통로는 `Category` enum 라벨 매칭(label="등산", HIKING) 뿐. When 사용자가 해당 흐름을 실행하면 Then 입력 언어와 무관하게 카테고리 라벨 매칭 가능
