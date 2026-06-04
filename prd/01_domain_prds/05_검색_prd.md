# 05. 검색 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/05_search -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/05_search/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

사용자가 이벤트/클럽/플랜을 키워드와 필터로 탐색하고, 자주 쓰는 검색 조건을 저장하여 재실행한다.

이 도메인은 기능 PRD 5개로 구성된다. 현재 기능별 trace source는 총 14개이고, risk 후보는 총 10개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F05-01 | F05-01. 키워드 검색 (이벤트/클럽/플랜) | [F05-01_keyword-search_prd.md](../02_feature_prds/05_search/F05-01_keyword-search_prd.md) | [F05-01_keyword-search](../../units/05_search/F05-01_keyword-search) | 전환 완료 | 3 | 2 |
| F05-02 | F05-02. 자동완성 서제스트 | [F05-02_autocomplete-suggest_prd.md](../02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | [F05-02_autocomplete-suggest](../../units/05_search/F05-02_autocomplete-suggest) | 전환 완료 | 1 | 2 |
| F05-03 | F05-03. 검색 필터 적용 | [F05-03_search-filter_prd.md](../02_feature_prds/05_search/F05-03_search-filter_prd.md) | [F05-03_search-filter](../../units/05_search/F05-03_search-filter) | 전환 완료 | 2 | 2 |
| F05-04 | F05-04. 최근 검색어 (검색 기록) | [F05-04_search-history_prd.md](../02_feature_prds/05_search/F05-04_search-history_prd.md) | [F05-04_search-history](../../units/05_search/F05-04_search-history) | 전환 완료 | 3 | 0 |
| F05-05 | F05-05. 저장된 검색 | [F05-05_saved-search_prd.md](../02_feature_prds/05_search/F05-05_saved-search_prd.md) | [F05-05_saved-search](../../units/05_search/F05-05_saved-search) | 전환 완료 | 5 | 4 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F05-05](../02_feature_prds/05_search/F05-05_saved-search_prd.md) | F05-05. 저장된 검색 | Risk 후보 4 |
| [F05-02](../02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | F05-02. 자동완성 서제스트 | Risk 후보 2 |
| [F05-03](../02_feature_prds/05_search/F05-03_search-filter_prd.md) | F05-03. 검색 필터 적용 | Risk 후보 2 |
| [F05-01](../02_feature_prds/05_search/F05-01_keyword-search_prd.md) | F05-01. 키워드 검색 (이벤트/클럽/플랜) | Risk 후보 2 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (M = 5)

각 기능은 "사용자가 무엇을 보고 무엇을 할 수 있는가"를 기준으로 도출했다.
prefix는 `F05-NN`. UI/UX 화면 ID(SCR-SR-NNN), 백엔드 엔드포인트, 프론트 화면/위젯이 1:N 으로 매핑된다.

| ID | 기능명 | UI/UX | 백엔드 엔드포인트 | 프론트 화면/위젯 |
|---|---|---|---|---|
| **F05-01** | 키워드 검색 (이벤트/클럽/플랜) | SCR-SR-001 | `GET /api/v1/search`<br>`GET /api/v1/search/clubs`<br>`GET /api/v1/search/plans` | `search_screen.dart`, `search_app_bar.dart`, `search_result_summary.dart`, `search_empty_state.dart` |
| **F05-02** | 자동완성 서제스트 | SCR-SR-001 | `GET /api/v1/search/suggest` (`q`, `limit` 기본 10) | `suggest_dropdown.dart`, `trending_keyword_chips.dart` (포커스 시 노출) |
| **F05-03** | 검색 필터 적용 | SCR-SR-002 | `GET /api/v1/search` (필터 파라미터 통합)<br>`GET /api/v1/search/filter-hints` (`region`) | `search_filter_sheet.dart`, `filter_category_chips`, `filter_date_range_picker`, `filter_distance_slider`, `filter_price_range_slider`, `filter_capacity_stepper`, `filter_region_selector`, `filter_hint_chips`, `active_filter_chip_bar` |
| **F05-04** | 최근 검색어 (검색 기록) | SCR-SR-003 | `GET /api/v1/search/history`<br>`DELETE /api/v1/search/history`<br>`DELETE /api/v1/search/history/{keyword}`<br>(검색 시 `SearchController`가 자동 기록) | `search_history_screen.dart`, `search_history_item.dart` |
| **F05-05** | 저장된 검색 | SCR-SR-004 | `GET /api/v1/search/saved`<br>`POST /api/v1/search/saved`<br>`PUT /api/v1/search/saved/{id}`<br>`DELETE /api/v1/search/saved/{id}`<br>`POST /api/v1/search/saved/{id}/execute` | `saved_search_screen.dart`, `saved_search_card.dart`, `save_search_dialog.dart` |

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 사용자 가치

### F05-01 키워드 검색 (이벤트/클럽/플랜)
사용자가 텍스트(또는 음성)로 입력한 키워드로 이벤트, 클럽, 플랜을 무한 스크롤(20건 단위)로 탐색한다.
정렬 옵션은 관련도/날짜/거리/가격(이벤트 기준)이다. 결과 카드는 이벤트 상세(SCR-EV-002) 등으로 전이된다.
- 서버: `EventSearchService.searchEvents` → `Page<SearchVo>`, `ClubSearchService.searchClubs` → `Page<ClubSimpleVo>`, `PlanService.searchPublishedPlans` → `Page<PlanSimpleVo>`.
- 인증 사용자가 검색하면 `SearchHistoryService.record`가 키워드를 자동 기록한다 (F05-04 연결).

### F05-02 자동완성 서제스트
검색바에 2글자 이상 입력 시 300ms 디바운스 후 추천 키워드 드롭다운(최대 8건, UI 스펙 기준)을 노출한다.
입력이 없는 포커스 상태에서는 최근 검색어(F05-04) + 트렌딩 키워드(Unit 02)가 함께 표시된다.
- 서버: `SearchSuggestionService.suggest(q, limit)` → `List<SuggestionVo>` (코드상 `limit` 기본값은 10).

### F05-03 검색 필터 적용
Bottom Sheet에서 카테고리(다중 칩), 날짜 범위, 거리(0~50km), 가격대(듀얼 슬라이더), 최소 인원수(스테퍼) 를 설정한다.
지역 기반 필터 힌트는 별도 API로 제공되어 추천 태그로 노출된다. 적용 후 활성 필터 칩이 검색바 하단에 표시되며 개별 제거 가능하다.
- 서버: `EventSearchParam` (keyword, category, dateFrom, dateTo, distanceKm, priceMin, priceMax, minCapacity, sortBy + 페이징) 통합 처리, `getFilterHints(region)` → `FilterHintsVo`.

### F05-04 최근 검색어 (검색 기록)
검색바 포커스 시(입력 없는 상태) 사용자의 최근 검색어 리스트를 표시한다. 항목 탭으로 즉시 재검색하고, X 버튼/스와이프로 개별 삭제, "전체 삭제" 버튼으로 일괄 삭제한다.
검색 실행 시 자동 기록되므로 별도 저장 API는 없다.
- 서버: `SearchHistoryService` (`getHistory`, `deleteAll`, `deleteKeyword`, 자동 `record`).

### F05-05 저장된 검색
검색 결과 화면에서 북마크 아이콘으로 현재 키워드 + 모든 필터 조건을 이름과 함께 저장한다(최대 20개).
저장 목록 화면에서 실행/수정/삭제 가능하며, 실행 시 저장 시점의 조건으로 즉시 검색이 수행된다.
- 서버: `SavedSearchService` 하위 5개 엔드포인트, `SavedSearchParam`(name, keyword, filters JSON), `SavedSearchVo` 반환.

### UI/UX 스펙 ↔ 서버 코드 정합성 메모

향후 Step 3 (backend.md) 작성 시 검증 대상:

| 항목 | UI/UX 스펙 (18-search.md) | 서버 코드 (SearchController) | 비고 |
|---|---|---|---|
| `/search/suggest` `limit` 기본값 | 8 | 10 (`@RequestParam(defaultValue = "10")`) | **불일치** — 스펙 또는 컨트롤러 중 한쪽 정정 필요 |
| `/search/clubs`, `/search/plans` | 스펙 미기재 (이벤트 중심) | 서버에 존재 | 스펙 보강 필요 (또는 의도적 비공개 검토) |
| `/search/trending` | 스펙에 기재됨 | `SearchController`에는 없음 (Unit 02 `TrendingController`) | 단위 분리 정책상 정상 — Unit 02에서 다룸 |
| 검색 시 키워드 자동 기록 | 스펙에 명시 없음 | `SearchController.searchEvents/searchClubs/searchPlans`가 `SearchHistoryService.record` 호출 | 스펙 보강 권장 |

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F05-05](../02_feature_prds/05_search/F05-05_saved-search_prd.md) | F05-05. 저장된 검색 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F05-01](../02_feature_prds/05_search/F05-01_keyword-search_prd.md) | F05-01. 키워드 검색 (이벤트/클럽/플랜) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F05-02](../02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | F05-02. 자동완성 서제스트 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F05-03](../02_feature_prds/05_search/F05-03_search-filter_prd.md) | F05-03. 검색 필터 적용 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
