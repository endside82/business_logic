# F08-09. 마켓 검색 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-09_market-search -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-09_market-search`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

키워드/카테고리/통화/타입/가격/정렬 옵션으로 마켓 아이템을 검색하여 페이지 단위로 반환한다. 마켓 메인 탐색(F08-08)이 발견 중심이라면, 본 기능은 사용자 의도(키워드)에 정확히 매칭되는 결과를 빠르게 보여주는 데 초점이 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마켓 메인(F08-08) 상단 검색 바에 키워드 입력 후 엔터 → `context.push('/market/search?keyword=$query')`
- AppBar 검색 버튼이 있는 다른 화면에서 직접 진입 (구현 시점)
- `Routes.planMarketSearch` (`/market/search`) 직접 진입 (initialKeyword 빈 문자열)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-09_market-search/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-09_market-search/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-09_market-search/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-09_market-search/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/MarketSearchController.java:24` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시 (initialKeyword 비어있지 않으면): `addPostFrameCallback`에서 `_runSearch(initialKeyword)` 호출
2. 사용자 키워드 엔터: `marketSearchNotifierProvider.notifier.search(keyword)` ▶ `MarketRepository.searchItems(keyword, page:0, size:20)` ▶ `GET /api/v1/market/search?keyword=...&page=0&size=20`
3. 무한 스크롤: `loadMore()` ▶ `_currentPage++`로 동일 API 호출 → 결과 누적, `_hasMore = !page.last`
4. 결과 카드 탭: 라우터 push만

## 4. 서버 계약

### 개요

키워드/카테고리/통화/타입/가격/정렬 옵션으로 마켓 아이템을 검색하여 페이지 단위로 반환한다. 마켓 메인 탐색(F08-08)이 발견 중심이라면, 본 기능은 사용자 의도(키워드)에 정확히 매칭되는 결과를 빠르게 보여주는 데 초점이 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/market/search | MarketSearchController#searchItems | unauthenticated 가능 | 마켓 아이템 검색 (페이지) |

### 도메인 모델 / Enum (이 기능 관련)

- 응답 VO: `MarketItemVo` (F08-08 backend.md와 동일)
- Enum: `ItemType`, `CurrencyType`, `ItemStatus` (F08-08 backend.md 참조)

### 의존 단위 / 외부 시스템

- 외부 호출 없음
- 다른 Unit 의존 없음
- 결과 카드 탭 시 F08-10 (아이템 상세) 진입
- 통합 검색 도메인(`search/`)과는 별개 — 마켓 전용 검색 엔드포인트

## 5. 프론트 계약

### 진입 경로

- 마켓 메인(F08-08) 상단 검색 바에 키워드 입력 후 엔터 → `context.push('/market/search?keyword=$query')`
- AppBar 검색 버튼이 있는 다른 화면에서 직접 진입 (구현 시점)
- `Routes.planMarketSearch` (`/market/search`) 직접 진입 (initialKeyword 빈 문자열)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/market/search?keyword=...` | `presentation/market/screens/market_search_screen.dart` | 마켓 검색 화면 (입력 + 결과 grid) |

### 화면별 구성 요소 & 액션

### 마켓 검색 (`market_search_screen.dart`)

- **사용자가 보는 것**:
  - AppBar
    - 뒤로 버튼 (`Icons.arrow_back`) → `Navigator.maybePop()`
    - `AppSearchBar(hint: '플랜 검색')` — initialKeyword 빈 문자열이면 `autofocus: true`
  - 검색 미실행 상태 (`_currentKeyword.isEmpty`):
    - 중앙 `_PromptState` — `Icons.search` 48 + "검색어를 입력해 주세요" + "플랜 제목, 설명, 태그에서 검색합니다."
  - 결과 있는 상태:
    - 상단 `"<keyword>" 검색 결과 N건` 카운트 텍스트 (caption, textTertiary)
    - 2-column grid (`MarketItemGridCard` 높이 200, 12px gap)
    - 무한 스크롤 추가 로딩 시 하단 `CircularProgressIndicator`
  - 결과 0건: `AppEmptyState(title: '"<keyword>"에 대한 결과가 없습니다', description: '다른 키워드로 검색해 보세요.')`
- **사용자가 할 수 있는 액션**:
  - 검색 바에 키워드 입력 + 엔터(`onSubmitted`) ▶ `_runSearch(query)` ▶ trim 후 빈값 아니면 `marketSearchNotifierProvider.notifier.search(keyword)` 호출
  - 검색 결과 카드 탭 ▶ `context.push('/market/items/${item.itemId}')` (F08-10)
  - 무한 스크롤 (200px 임계값) ▶ `marketSearchNotifierProvider.notifier.loadMore()` 호출
  - 뒤로 ▶ `Navigator.maybePop()`
  - 에러 상태에서 재시도 버튼 ▶ `_runSearch(_currentKeyword)`
- **상태 분기**:
  - 로딩 (initial 검색 후): `Center(CircularProgressIndicator)`
  - 에러: `AppErrorState.fromError(error: error, onRetry: ...)`
  - 빈 키워드: `_PromptState`
  - 빈 결과: `AppEmptyState`
- **모달/시트**: 없음
- **네비게이션**:
  - 카드 탭 → `/market/items/{itemId}` push
  - 뒤로 → 마켓 메인으로 복귀

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시 (initialKeyword 비어있지 않으면): `addPostFrameCallback`에서 `_runSearch(initialKeyword)` 호출
2. 사용자 키워드 엔터: `marketSearchNotifierProvider.notifier.search(keyword)` ▶ `MarketRepository.searchItems(keyword, page:0, size:20)` ▶ `GET /api/v1/market/search?keyword=...&page=0&size=20`
3. 무한 스크롤: `loadMore()` ▶ `_currentPage++`로 동일 API 호출 → 결과 누적, `_hasMore = !page.last`
4. 결과 카드 탭: 라우터 push만

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 키워드 검색 → 결과 발견 → 상세 진입 (Happy Path) | 마켓 메인에 있음. | 사용자가 검색 결과 카드 1개를 선택하여 상세 화면 진입. |
| S2 | 무한 스크롤 결과 추가 로드 | 검색 결과를 끝까지 살펴보는 사용자. | 32개 검색 결과 모두 화면에 누적됨. |
| S3 | 빈 결과 | 잘못된 키워드 입력. | 사용자가 다른 키워드로 재검색하거나 뒤로 가기. |
| S4 | 빈 키워드 / 첫 진입 (initialKeyword 빈 문자열) | 빈 검색 화면으로 직접 진입한 사용자. | 사용자가 키워드 입력 후 검색 결과 화면으로 이동. |
| S5 | 네트워크 에러 / 재시도 | 시나리오 본문 참조 | 네트워크 복구 시 검색 결과 정상 표시. |
| S6 | 트림 / 공백만 입력 | 로그인 상태, `/market/search?keyword=Boardgame` 직접 진입 | 공백 검색은 안전하게 무시됨. |

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
| 후보 | backend.md:22 | - `keyword: String?` — 제목/설명 검색 키워드 (서버에서 trim/공백 처리 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:27 | - `sortBy: String?` — 정렬 키 (서비스 구현 미확인 — `LATEST`, `POPULAR`, `PRICE_ASC`, `PRICE_DESC` 등 추정) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:31 | - **비즈니스 로직**: `MarketItemService.searchItems(searchParam)` — `ItemStatus.ON_SALE` 한정, 키워드/필터 적용 후 페이지 반환 (서비스 구현 미확인 — 컨트롤러까지만 추적). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:33 | - 잘못된 정렬값/타입은 서비스 내부에서 폴백 또는 무시 (구체 분기 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 키워드 검색 → 결과 발견 → 상세 진입 (Happy Path)**: Given 마켓 메인에 있음. When 사용자가 해당 흐름을 실행하면 Then 사용자가 검색 결과 카드 1개를 선택하여 상세 화면 진입.
- **AC-02. 무한 스크롤 결과 추가 로드**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 32개 검색 결과 모두 화면에 누적됨.
- **AC-03. 빈 결과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 키워드로 재검색하거나 뒤로 가기.
- **AC-04. 빈 키워드 / 첫 진입 (initialKeyword 빈 문자열)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 키워드 입력 후 검색 결과 화면으로 이동.
- **AC-05. 네트워크 에러 / 재시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 네트워크 복구 시 검색 결과 정상 표시.
- **AC-06. 트림 / 공백만 입력**: Given 로그인 상태, `/market/search?keyword=Boardgame` 직접 진입 When 사용자가 해당 흐름을 실행하면 Then 공백 검색은 안전하게 무시됨.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
