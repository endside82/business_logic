# F05-03. 검색 필터 적용 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

필터는 별도 엔드포인트가 아니라 **F05-01의 `GET /api/v1/search` 엔드포인트의 query 파라미터로 통합**된다. 즉 `EventSearchParam`의 카테고리/날짜/거리/가격/지역/시간 등 필드가 필터 역할을 한다. 추가로 지역 기반 추천 태그/통계를 제공하는 `GET /api/v1/search/filter-hints` 가 별도로 존재한다. 최소 정원(`minCapacity`) 필터는 서버가 이벤트 정원 기준으로 적용한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 검색 결과 화면(`/search`) 검색바 우측 `Icons.tune` 아이콘 탭 → `SearchFilterSheet.show`
- 저장된 검색 카드의 "수정" 액션 → 동일 시트가 기존 필터 프리셋과 함께 열림 (F05-05 참조)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `SearchController`. 앱: `search_screen.dart`, `search_filter_sheet.dart`, `filter_category_chips.dart`, `filter_date_range_picker.dart`, `filter_distance_slider.dart`, `filter_price_range_slider.dart`, `filter_capacity_stepper.dart`, `filter_region_selector.dart`, `filter_hint_chips.dart`, `active_filter_chip_bar.dart`.

<!-- source-references:start -->
서버 창구: `SearchController#searchEvents`, `SearchController#getFilterHints`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### Provider
- `filterHintsProvider(region: String?)` — `@riverpod FutureOr<FilterHint>` (auto-dispose). region 변경마다 새 요청
- `searchFilterCountProvider({keyword, filter})` — `@riverpod FutureOr<int>` (auto-dispose). 필터 변경 시 300ms 대기 → `searchEvents(..., size: 1)` 호출하여 `totalElements` 만 추출
- `SearchNotifier.setFilter(filter)` / `clearFilter()` — 정규화 후 키워드가 있으면 `_reSearch()` (page=0부터 다시)

### 호출 흐름
1. 검색 결과 화면에서 필터 아이콘 탭 → `SearchFilterSheet.show(initialFilter, keyword)`
2. 시트 안에서 필터 변경 → `_filter` setState
3. 필터 변경 시마다 `searchFilterCountProvider`가 자동 재호출 (디바운스 300ms) → `GET /api/v1/search?...&size=1` → `totalElements` 표시
4. 지역 변경 시 → `filterHintsProvider(region)` invalidate → `GET /api/v1/search/filter-hints?region=...` → 추천 카테고리 갱신
5. 적용 → `widget.onApply(_filter)` → `searchNotifierProvider.notifier.setFilter(_filter)` → 키워드 비어있지 않으면 즉시 `_reSearch()` → page=0 검색
6. 활성 필터 칩 X 탭 → `searchNotifierProvider.notifier.setFilter(filter.copyWith(...: null))` → 자동 재검색

### 거리 필터의 GPS 보충
- `_filter.radiusKm != null` + `latitude/longitude` null → `locationPermissionNotifierProvider.getCurrentPosition()` 호출
- 5분 캐시 (`SearchNotifier._cachedLatitude/_cachedLongitude/_cachedAt`)
- count provider도 동일하게 GPS 보충 (미리보기와 실제 결과 일치 보장)

## 4. 제품 규칙

- 필터 항목: 카테고리(여러 개), 날짜 범위(오늘부터 365일 안), 거리(0~50km), 가격 범위, 무료만, 최소 정원, 지역. "초기화"는 모두 비운다.
- 최소 정원은 이벤트의 정원 기준이며 현재 참가 인원이 아니다.
- 필터 시트의 "N개 결과 보기" 숫자는 필터를 바꾼 뒤 0.3초 후 실제 검색 건수로 갱신되고, 거리 조건 위치 보충도 실제 검색과 같다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 카테고리 + 가격 필터로 좁히기 | `/search`에서 "음식" 검색 후 24건 결과 표시 중 | 8건의 음식 카테고리 + 3만원 이하 이벤트 카드 노출 |
| S2 | 거리 필터 + GPS 권한 | 권한 미부여, "운동" 검색 결과 화면 | 5km 이내 운동 이벤트 결과 + 활성 필터 칩 "5km 이내" |
| S3 | 무료 토글 | 시나리오 본문 참조 | 무료 음식 이벤트 3건 |
| S4 | 지역 기반 필터 힌트 | 시나리오 본문 참조 | 강남 지역 + FOOD 카테고리 결과 |
| S5 | 최소 정원 필터 | 시나리오 본문 참조 | 이벤트 정원이 입력값 이상인 결과만 남음 (현재 참가 인원 기준이 아님) |
| S6 | 초기화 — 모든 필터 제거 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 개별 필터 칩 제거 | 시나리오 본문 참조 | FOOD 칩만 사라지고 나머지 필터는 유지 |
| S8 | 저장된 검색에서 수정 | `/search/saved` 화면 | 저장 검색 갱신. 즉시 검색 실행은 하지 않음. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:4 | 필터는 별도 엔드포인트가 아니라 **F05-01의 `GET /api/v1/search` 엔드포인트의 query 파라미터로 통합**된다. 즉 `EventSearchParam`의 카테고리/날짜/거리/가격/지역/시간 등 필드가 필터 역할을 한다. 추가로 지역 기반 추천 태그/통계를 제공하는 `GET /api/v1/search/filter-hints` 가 별도로 존재한다. 최소 정원(`minCapacity`) 필터는 서버가 이벤트 정원 기준으로 적용한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:40 | **키워드 sanitize**: `EventSearchParam.getSanitizedKeyword()` 가 HTML/script 태그를 strip 한다 (S-M-01). 단 `EventSearchRepository.searchEvents`는 raw `keyword`를 사용하고 sanitize는 호출되지 않는다 (현재 코드 기준). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. Happy Path — 카테고리 + 가격 필터로 좁히기**: Given `/search`에서 "음식" 검색 후 24건 결과 표시 중 When 사용자가 해당 흐름을 실행하면 Then 8건의 음식 카테고리 + 3만원 이하 이벤트 카드 노출
- **AC-02. 거리 필터 + GPS 권한**: Given 권한 미부여, "운동" 검색 결과 화면 When 사용자가 해당 흐름을 실행하면 Then 5km 이내 운동 이벤트 결과 + 활성 필터 칩 "5km 이내"
- **AC-03. 무료 토글**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무료 음식 이벤트 3건
- **AC-04. 지역 기반 필터 힌트**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 강남 지역 + FOOD 카테고리 결과
- **AC-05. 최소 정원 필터**: Given 최소 정원을 정한다 When 검색하면 Then 이벤트 정원이 그 값 이상인 결과만 나온다 (현재 참가 인원 기준이 아님)
- **AC-06. 초기화 — 모든 필터 제거**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 개별 필터 칩 제거**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then FOOD 칩만 사라지고 나머지 필터는 유지
- **AC-08. 저장된 검색에서 수정**: Given `/search/saved` 화면 When 사용자가 해당 흐름을 실행하면 Then 저장 검색 갱신. 즉시 검색 실행은 하지 않음.
