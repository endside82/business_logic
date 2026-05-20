# F05-03. 검색 필터 적용 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/05_search/F05-03_search-filter -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/05_search/F05-03_search-filter`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

필터는 별도 엔드포인트가 아니라 **F05-01의 `GET /api/v1/search` 엔드포인트의 query 파라미터로 통합**된다. 즉 `EventSearchParam`의 카테고리/날짜/거리/가격/지역/시간 등 필드가 필터 역할을 한다. 추가로 지역 기반 추천 태그/통계를 제공하는 `GET /api/v1/search/filter-hints` 가 별도로 존재한다. UI/UX 스펙의 인원수(`minCapacity`) 필터는 **현재 서버 `EventSearchParam`에 없다** (프론트는 SearchFilter에 보유하고 전송하지만 서버에서 무시).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 검색 결과 화면(`/search`) 검색바 우측 `Icons.tune` 아이콘 탭 → `SearchFilterSheet.show`
- 저장된 검색 카드의 "수정" 액션 → 동일 시트가 기존 필터 프리셋과 함께 열림 (F05-05 참조)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/05_search/F05-03_search-filter/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/05_search/F05-03_search-filter/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/05_search/F05-03_search-filter/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/05_search/F05-03_search-filter/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:40` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:77` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

필터는 별도 엔드포인트가 아니라 **F05-01의 `GET /api/v1/search` 엔드포인트의 query 파라미터로 통합**된다. 즉 `EventSearchParam`의 카테고리/날짜/거리/가격/지역/시간 등 필드가 필터 역할을 한다. 추가로 지역 기반 추천 태그/통계를 제공하는 `GET /api/v1/search/filter-hints` 가 별도로 존재한다. UI/UX 스펙의 인원수(`minCapacity`) 필터는 **현재 서버 `EventSearchParam`에 없다** (프론트는 SearchFilter에 보유하고 전송하지만 서버에서 무시).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/search` | `SearchController#searchEvents` | optional | 필터 조건 통합 처리 (F05-01 참조) |
| GET | `/api/v1/search/filter-hints` | `SearchController#getFilterHints` | optional | 지역 기반 카테고리/가격/날짜 통계 |

### 도메인 모델 / Enum (이 기능 관련)

- **`FilterHintsVo`** (위 참조)
- **`Category`** (Unit 03): code 정수가 응답의 `categories[].code` 문자열로 노출됨 (예: `"4"` = SPORTS). **프론트는 enum 이름 (예: `"SPORTS"`)을 보내고 받기를 기대하므로 미스매치 가능성** — 프론트 `ClubCategoryMapper.toApiCode`가 코드 정수와 enum 이름 둘 다 처리

### 의존 단위 / 외부 시스템

- **다른 Unit 의존**:
  - Unit 03 (Event) — `Event` 엔티티, `Category`, `EventStatus`, `LocationType`
- **외부 시스템**: 없음
- **호출 빈도**: 필터 힌트는 필터 시트가 열릴 때마다 (지역 변경 시 재조회)

## 5. 프론트 계약

### 진입 경로

- 검색 결과 화면(`/search`) 검색바 우측 `Icons.tune` 아이콘 탭 → `SearchFilterSheet.show`
- 저장된 검색 카드의 "수정" 액션 → 동일 시트가 기존 필터 프리셋과 함께 열림 (F05-05 참조)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/search` (modal) | `lib/presentation/search/widgets/search_filter_sheet.dart` | Bottom sheet 모달 |

관련 위젯 (모두 `lib/presentation/search/widgets/`):
| 파일 | 역할 |
|---|---|
| `search_filter_sheet.dart` | DraggableScrollableSheet 컨테이너 + 적용 버튼 |
| `filter_category_chips.dart` | 카테고리 다중 선택 (15개 + "기타", `ClubCategoryMapper.options`) |
| `filter_date_range_picker.dart` | 날짜 범위 (`showDateRangePicker`, 오늘 ~ +365일) |
| `filter_distance_slider.dart` | 거리 슬라이더 0~50km |
| `filter_price_range_slider.dart` | 가격 듀얼 슬라이더 |
| `filter_capacity_stepper.dart` | 최소 인원 stepper (서버 미반영) |
| `filter_region_selector.dart` | 지역 선택 |
| `filter_hint_chips.dart` | 지역 기반 추천 카테고리 (`/filter-hints`) |
| `active_filter_chip_bar.dart` | 검색바 하단 활성 필터 칩 행 |

### 화면별 구성 요소 & 액션

### `SearchFilterSheet` (`search_filter_sheet.dart`)

- **사용자가 보는 것** (스크롤 가능):
  1. 핸들 (gray300, w40 h4)
  2. 헤더 — "필터" 타이틀(heading3) / "초기화" TextButton / X 버튼
  3. `FilterCategoryChips` — `ClubCategoryMapper.options` 15개 칩, 선택 시 primary500 채움
  4. `FilterDateRangePicker` — 캘린더 아이콘 + "M/d(E)" 포맷, primary500 색상 테마 적용
  5. `FilterDistanceSlider` — 0~50km
  6. `FilterPriceRangeSlider` — 듀얼 슬라이더
  7. "무료 이벤트만" 토글 스위치 (primary500)
  8. `FilterCapacityStepper` — 최소 인원 (서버 미반영, **사일런트 무효**)
  9. `FilterRegionSelector` — 지역
  10. `FilterHintChips` — 지역 기반 인기 카테고리 (`hints.categories[name] (count)`)
  11. 하단 sticky 버튼 — `AppButton(label: "$N개 결과 보기")`. `searchFilterCountProvider` 의 실시간 결과
- **사용자가 할 수 있는 액션**:
  - 카테고리 칩 탭 → `_normalizeCategories`로 ClubCategoryMapper.toApiCode 통과 → `_filter.copyWith(categories: ...)`
  - 날짜 범위 선택 → `showDateRangePicker` → `dateFormat.format(range.start/end)` 으로 yyyy-MM-dd 문자열 저장
  - 거리 슬라이더 → `radiusKm` 갱신
  - 가격 듀얼 슬라이더 → `priceMin/priceMax` 갱신
  - 무료 토글 → `freeOnly: true/false` (스위치)
  - 인원 stepper → `minCapacity` 갱신 (서버 미반영)
  - 지역 선택 → `region` 갱신 + `FilterHintChips` provider 키 변경 → `/filter-hints?region=...` 재호출
  - "초기화" → `_filter = const SearchFilter()` (모든 값 reset)
  - X 닫기 → 변경 사항 버림
  - 추천 카테고리 칩 탭 → 해당 코드를 categories에 추가
  - "N개 결과 보기" → `widget.onApply(_filter)` 호출 + `Navigator.pop(_filter)`
- **상태 분기**:
  - `searchFilterCountProvider`: `loading: '결과 조회 중...'`, `error: '결과 보기'`, `data: '$count개 결과 보기'`
  - 필터 힌트 로딩/에러 → `SizedBox.shrink()` (조용히 숨김)
- **모달/시트/네비게이션**:
  - `showModalBottomSheet` + `DraggableScrollableSheet(initial 0.85, min 0.5, max 0.95, isScrollControlled: true)`
  - 적용 버튼 → 시트 닫고 검색 결과 화면 갱신

### `ActiveFilterChipBar` (`active_filter_chip_bar.dart`) — 검색바 하단

- **사용자가 보는 것**:
  - "초기화" 칩 (error50 배경 + error500 텍스트, X 아이콘)
  - 필터 별 칩 (primary50 배경 + primary700 텍스트):
    - `category:CODE` — 라벨 (`ClubCategoryMapper.toLabel`)
    - `date` — `start ~ end`
    - `distance` — `Nkm 이내`
    - `price` — `min원 ~ max원`
    - `freeOnly` — "무료만"
    - `capacity` — `N명 이상` (서버 미반영)
    - `region` — region 값
- **사용자가 할 수 있는 액션**:
  - "초기화" 칩 탭 → `searchNotifierProvider.clearFilter()` → `_filter = SearchFilter()` + 키워드가 있으면 자동 재검색
  - 개별 칩 X 탭 → `_onRemoveFilter(filterKey)` (search_screen.dart) → 해당 필드만 null로 → setFilter → 자동 재검색

### API 호출 순서 (Provider/Repository 관점)

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

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 카테고리 + 가격 필터로 좁히기 | `/search`에서 "음식" 검색 후 24건 결과 표시 중 | 8건의 음식 카테고리 + 3만원 이하 이벤트 카드 노출 |
| S2 | 거리 필터 + GPS 권한 | 권한 미부여, "운동" 검색 결과 화면 | 5km 이내 운동 이벤트 결과 + 활성 필터 칩 "5km 이내" |
| S3 | 무료 토글 | 시나리오 본문 참조 | 무료 음식 이벤트 3건 |
| S4 | 지역 기반 필터 힌트 | 시나리오 본문 참조 | 강남 지역 + FOOD 카테고리 결과 |
| S5 | 인원수 필터 — 사일런트 무효 (버그 시나리오) | 시나리오 본문 참조 | 사용자는 필터가 적용된 줄 알지만 실제로는 무시됨. UX 결함 (서버 필드 추가 또는 프론트 제거 필요) |
| S6 | 초기화 — 모든 필터 제거 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 개별 필터 칩 제거 | 시나리오 본문 참조 | FOOD 칩만 사라지고 나머지 필터는 유지 |
| S8 | 저장된 검색에서 수정 | `/search/saved` 화면 | 저장 검색 갱신. 즉시 검색 실행은 하지 않음. |

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
| 후보 | backend.md:4 | 필터는 별도 엔드포인트가 아니라 **F05-01의 `GET /api/v1/search` 엔드포인트의 query 파라미터로 통합**된다. 즉 `EventSearchParam`의 카테고리/날짜/거리/가격/지역/시간 등 필드가 필터 역할을 한다. 추가로 지역 기반 추천 태그/통계를 제공하는 `GET /api/v1/search/filter-hints` 가 별도로 존재한다. UI/UX 스펙의 인원수(`minCapacity`) 필터는 **현재 서버 `EventSearchParam`에 없다** (프론트는 SearchFilter에 보유하고 전송하지만 서버에서 무시). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:40 | **키워드 sanitize**: `EventSearchParam.getSanitizedKeyword()` 가 HTML/script 태그를 strip 한다 (S-M-01). 단 `EventSearchRepository.searchEvents`는 raw `keyword`를 사용하고 sanitize는 호출되지 않는다 (현재 코드 기준). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. Happy Path — 카테고리 + 가격 필터로 좁히기**: Given `/search`에서 "음식" 검색 후 24건 결과 표시 중 When 사용자가 해당 흐름을 실행하면 Then 8건의 음식 카테고리 + 3만원 이하 이벤트 카드 노출
- **AC-02. 거리 필터 + GPS 권한**: Given 권한 미부여, "운동" 검색 결과 화면 When 사용자가 해당 흐름을 실행하면 Then 5km 이내 운동 이벤트 결과 + 활성 필터 칩 "5km 이내"
- **AC-03. 무료 토글**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무료 음식 이벤트 3건
- **AC-04. 지역 기반 필터 힌트**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 강남 지역 + FOOD 카테고리 결과
- **AC-05. 인원수 필터 — 사일런트 무효 (버그 시나리오)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자는 필터가 적용된 줄 알지만 실제로는 무시됨. UX 결함 (서버 필드 추가 또는 프론트 제거 필요)
- **AC-06. 초기화 — 모든 필터 제거**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 개별 필터 칩 제거**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then FOOD 칩만 사라지고 나머지 필터는 유지
- **AC-08. 저장된 검색에서 수정**: Given `/search/saved` 화면 When 사용자가 해당 흐름을 실행하면 Then 저장 검색 갱신. 즉시 검색 실행은 하지 않음.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
