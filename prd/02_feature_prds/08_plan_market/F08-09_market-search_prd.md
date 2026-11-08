# F08-09. 마켓 검색 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

키워드/카테고리/통화/타입/가격/정렬 옵션으로 마켓 아이템을 검색하여 페이지 단위로 반환한다. 마켓 메인 탐색(F08-08)이 발견 중심이라면, 본 기능은 사용자 의도(키워드)에 정확히 매칭되는 결과를 빠르게 보여주는 데 초점이 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마켓 메인(F08-08) 상단 검색 바에 키워드 입력 후 엔터 → `context.push('/market/search?keyword=$query')`
- AppBar 검색 버튼이 있는 다른 화면에서 직접 진입 (구현 시점)
- `Routes.planMarketSearch` (`/market/search`) 직접 진입 (initialKeyword 빈 문자열)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MarketSearchController`. 앱: `market_search_screen.dart`.

<!-- source-references:start -->
서버 창구: `MarketSearchController#searchItems`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 시 (initialKeyword 비어있지 않으면): `addPostFrameCallback`에서 `_runSearch(initialKeyword)` 호출
2. 사용자 키워드 엔터: `marketSearchNotifierProvider.notifier.search(keyword)` ▶ `MarketRepository.searchItems(keyword, page:0, size:20)` ▶ `GET /api/v1/market/search?keyword=...&page=0&size=20`
3. 무한 스크롤: `loadMore()` ▶ `_currentPage++`로 동일 API 호출 → 결과 누적, `_hasMore = !page.last`
4. 결과 카드 탭: 라우터 push만

## 4. 제품 규칙

- 마켓 검색은 통합 검색과 별개다. 결과 카드는 아이템 상세로 간다.
- 검색어가 없으면 "검색어를 입력해 주세요"를 보여 주고, 앞뒤 공백을 지운 값이 비면 검색하지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 키워드 검색 → 결과 발견 → 상세 진입 (Happy Path) | 마켓 메인에 있음. | 사용자가 검색 결과 카드 1개를 선택하여 상세 화면 진입. |
| S2 | 무한 스크롤 결과 추가 로드 | 검색 결과를 끝까지 살펴보는 사용자. | 32개 검색 결과 모두 화면에 누적됨. |
| S3 | 빈 결과 | 잘못된 키워드 입력. | 사용자가 다른 키워드로 재검색하거나 뒤로 가기. |
| S4 | 빈 키워드 / 첫 진입 (initialKeyword 빈 문자열) | 빈 검색 화면으로 직접 진입한 사용자. | 사용자가 키워드 입력 후 검색 결과 화면으로 이동. |
| S5 | 네트워크 에러 / 재시도 | 시나리오 본문 참조 | 네트워크 복구 시 검색 결과 정상 표시. |
| S6 | 트림 / 공백만 입력 | 로그인 상태, `/market/search?keyword=Boardgame` 직접 진입 | 공백 검색은 안전하게 무시됨. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 검색어 다듬기 | 앱은 앞뒤 공백을 지운 검색어만 보내고, 지운 값이 비면 보내지 않는다. 서버는 공백뿐인 검색어를 조건 없이 다루고, 제목이나 설명에 대소문자 구분 없이 들어 있는 상품을 찾는다 | 없음 |
| 해소됨 | 정렬과 잘못된 값 | 정렬은 최신, 인기(구매 수), 낮은 가격, 높은 가격 넷이고 대소문자를 가리지 않는다. 정렬 값이 없거나 모르는 값이면 최신순으로 돌린다. 통화나 상품 종류에 모르는 값을 넣으면 잘못된 입력(400)으로 거절한다 | 없음 |
| 해소됨 | 검색 조건 | 검색은 판매 중이고 판매가 닫히지 않은 종류의 상품만 찾는다. 검색어, 통화, 상품 종류, 분류, 가격 범위로 거르고 쪽으로 나눠 준다. 뿌리 분류를 고르면 보이는 바로 아래 분류까지 함께 거르고, 고른 분류가 없거나 숨었으면 빈 결과를 준다 | 없음 |

## 9. 수용 기준

- **AC-01. 키워드 검색 → 결과 발견 → 상세 진입 (Happy Path)**: Given 마켓 메인에 있음. When 사용자가 해당 흐름을 실행하면 Then 사용자가 검색 결과 카드 1개를 선택하여 상세 화면 진입.
- **AC-02. 무한 스크롤 결과 추가 로드**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 32개 검색 결과 모두 화면에 누적됨.
- **AC-03. 빈 결과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 키워드로 재검색하거나 뒤로 가기.
- **AC-04. 빈 키워드 / 첫 진입 (initialKeyword 빈 문자열)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 키워드 입력 후 검색 결과 화면으로 이동.
- **AC-05. 네트워크 에러 / 재시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 네트워크 복구 시 검색 결과 정상 표시.
- **AC-06. 트림 / 공백만 입력**: Given 로그인 상태, `/market/search?keyword=Boardgame` 직접 진입 When 사용자가 해당 흐름을 실행하면 Then 공백 검색은 안전하게 무시됨.
