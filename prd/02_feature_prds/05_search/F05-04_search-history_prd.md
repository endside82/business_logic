# F05-04. 최근 검색어 (검색 기록) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/05_search/F05-04_search-history -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/05_search/F05-04_search-history`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자별 검색 기록을 **Redis LIST**에 보관한다 (`search:history:{userId}`). 검색 실행(F05-01)마다 `SearchHistoryService.record`가 자동 호출되어 LPUSH + 중복 제거 + trim(20)을 수행한다. 사용자는 이 기록을 조회·개별 삭제·전체 삭제할 수 있다. 별도의 "저장 API"는 없다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 검색 메인(`/search`) 검색바 포커스 + 입력 없는 idle 상태에서 인라인 노출 (이 화면이 주 진입점)
- `/search/history` 라우트 — 별도 검색 기록 화면 (인라인 노출과 같은 데이터를 풀스크린에서 관리)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/05_search/F05-04_search-history/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/05_search/F05-04_search-history/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/05_search/F05-04_search-history/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/05_search/F05-04_search-history/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:103` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:90` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SearchController.java:96` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### Provider
- `searchHistoryNotifierProvider` (`@riverpod`, auto-dispose, `class SearchHistoryNotifier extends _$SearchHistoryNotifier`):
  - `build()` → `_fetchHistory()` → `repo.getSearchHistory()` → `success → keywords / failure → []`
  - `deleteKeyword(keyword)` — Optimistic UI:
    - 즉시 state에서 제거
    - `repo.deleteHistoryKeyword(keyword)` 호출
    - 실패 시 원본 list로 롤백
  - `deleteAll()` — Optimistic:
    - state = `[]`
    - `repo.deleteAllHistory()` 호출
    - 실패 시 원본 list로 롤백 + `throw error` (호출자에게 토스트 표시 기회)
  - `refresh()` → `ref.invalidateSelf()` (검색 직후 호출됨)

### 호출 흐름

#### 화면 진입 시
1. `searchHistoryNotifierProvider` build → `GET /api/v1/search/history`
2. 401 → `failure` → 빈 리스트 폴백 (비로그인 화면도 깨지지 않음)

#### 검색 실행 후 자동 갱신 (F05-01)
- `_onSearch` 마지막에 `searchHistoryNotifier.refresh()` → `invalidateSelf()` → 새 요청 → 서버가 record 한 키워드 포함된 최신 LIST 반환

#### 항목 탭
- `_searchController.text = keyword` + `_onSearch(keyword)` → 검색 실행 → 서버 record → 클라이언트가 history refresh → 동일 키워드가 최상단으로 이동 (서버 LPUSH + 중복 제거)

#### 개별 삭제
- `deleteKeyword(keyword)`:
  1. local list에서 즉시 제거 (Optimistic)
  2. `DELETE /api/v1/search/history/{keyword}` (URL 인코딩 자동)
  3. 실패 시 원본 복원

#### 전체 삭제
- 풀스크린: 다이얼로그 확인 → `deleteAll()` → optimistic empty + `DELETE /api/v1/search/history` → 실패 시 원본 복원 + throw → 화면이 토스트
- 인라인 (검색 메인): 다이얼로그 없이 즉시 호출

## 4. 서버 계약

### 개요

사용자별 검색 기록을 **Redis LIST**에 보관한다 (`search:history:{userId}`). 검색 실행(F05-01)마다 `SearchHistoryService.record`가 자동 호출되어 LPUSH + 중복 제거 + trim(20)을 수행한다. 사용자는 이 기록을 조회·개별 삭제·전체 삭제할 수 있다. 별도의 "저장 API"는 없다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/search/history` | `SearchController#getSearchHistory` | required | 본인 최근 검색어 LIST 조회 |
| DELETE | `/api/v1/search/history` | `SearchController#deleteAllHistory` | required | 본인 LIST 전체 삭제 (Redis key 제거) |
| DELETE | `/api/v1/search/history/{keyword}` | `SearchController#deleteHistoryKeyword` | required | 특정 키워드 LIST에서 제거 |

### 의존 단위 / 외부 시스템

- **외부 시스템**: Redis (필수)
- **다른 Unit**: 없음 (자체 도메인). Unit 12 (Notification) 등 다른 도메인은 호출하지 않음
- **호출됨**: F05-01 검색 시 자동 record (사용자 인증된 경우만). F05-02 자동완성은 record 안 함. F05-05 저장 검색 실행은 별도 — `executeSavedSearch`는 검색 기록을 호출하지 않음 (서비스 메서드 자체에서 record 호출 없음)

## 5. 프론트 계약

### 진입 경로

- 검색 메인(`/search`) 검색바 포커스 + 입력 없는 idle 상태에서 인라인 노출 (이 화면이 주 진입점)
- `/search/history` 라우트 — 별도 검색 기록 화면 (인라인 노출과 같은 데이터를 풀스크린에서 관리)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/search` | `lib/presentation/search/screens/search_screen.dart` (`_buildHistorySection`) | idle 상태에서 최대 10건 표시 |
| `/search/history` | `lib/presentation/search/screens/search_history_screen.dart` | 전체 검색 기록 풀스크린 관리 |

위젯
| 파일 | 역할 |
|---|---|
| `widgets/search_history_item.dart` | Dismissible(스와이프 삭제) + 시계 아이콘 + 키워드 + X 버튼 |

### 화면별 구성 요소 & 액션

### `SearchScreen` 의 `_buildHistorySection` (인라인)

- **사용자가 보는 것**:
  - "최근 검색어" 헤더 (body2Medium) + "전체 삭제" 텍스트 버튼 (textTertiary, caption)
  - 최대 10개 (`keywords.take(10)`) `SearchHistoryItem` 리스트
  - 데이터 없으면 `SizedBox.shrink()` (섹션 자체 미노출)
- **사용자가 할 수 있는 액션**:
  - 항목 탭 → `_searchController.text = keyword` + `_onSearch(keyword)` (F05-01)
  - 항목 X 아이콘 또는 좌측 스와이프 → `searchHistoryNotifier.deleteKeyword(keyword)` (Optimistic 제거)
  - "전체 삭제" 텍스트 버튼 → 즉시 호출 (인라인은 다이얼로그 확인 없음 — 풀스크린 화면과 다름) `searchHistoryNotifier.deleteAll()` 후 실패 시 토스트

### `SearchHistoryScreen` (`/search/history` 풀스크린)

- **사용자가 보는 것**:
  - AppBar `"검색 기록"`
  - 헤더: "최근 검색어" (body1Medium) + "전체 삭제" (error500, body2)
  - `ListView.builder`의 `SearchHistoryItem` 전체
  - 데이터 없으면: 시계 아이콘 (gray300, 48) + "검색 기록이 없습니다" + 그 아래 `TrendingKeywordChips` (Unit 02)
- **사용자가 할 수 있는 액션**:
  - 항목 탭 → `onKeywordSelected?.call(keyword)` + `Navigator.pop` (호출자가 키워드를 받아 검색 실행하도록 위임)
  - 항목 X / 좌측 스와이프 → `searchHistoryNotifier.deleteKeyword`
  - "전체 삭제" → `AppDialog.confirm` 다이얼로그 → 확인 시 `deleteAll()` 호출, 실패 시 `showApiErrorToast`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState(title: '오류가 발생했습니다', onRetry: () => ref.invalidate(searchHistoryNotifierProvider))`
  - 빈: 위 빈 상태 UI + 트렌딩 노출

### `SearchHistoryItem` (`search_history_item.dart`)

- **사용자가 보는 것**:
  - `Dismissible(direction: endToStart, onDismissed: ...)`
  - 좌측 스와이프 시 background — error500 + `Icons.delete_outline` (white)
  - `ListTile dense=true`, leading `Icons.history` (textTertiary, 18), title `body2`, trailing X 아이콘 16
- **상호작용**: `onTap`, `onDelete`, 스와이프 모두 같은 콜백을 호출

### API 호출 순서 (Provider/Repository 관점)

### Provider
- `searchHistoryNotifierProvider` (`@riverpod`, auto-dispose, `class SearchHistoryNotifier extends _$SearchHistoryNotifier`):
  - `build()` → `_fetchHistory()` → `repo.getSearchHistory()` → `success → keywords / failure → []`
  - `deleteKeyword(keyword)` — Optimistic UI:
    - 즉시 state에서 제거
    - `repo.deleteHistoryKeyword(keyword)` 호출
    - 실패 시 원본 list로 롤백
  - `deleteAll()` — Optimistic:
    - state = `[]`
    - `repo.deleteAllHistory()` 호출
    - 실패 시 원본 list로 롤백 + `throw error` (호출자에게 토스트 표시 기회)
  - `refresh()` → `ref.invalidateSelf()` (검색 직후 호출됨)

### 호출 흐름

#### 화면 진입 시
1. `searchHistoryNotifierProvider` build → `GET /api/v1/search/history`
2. 401 → `failure` → 빈 리스트 폴백 (비로그인 화면도 깨지지 않음)

#### 검색 실행 후 자동 갱신 (F05-01)
- `_onSearch` 마지막에 `searchHistoryNotifier.refresh()` → `invalidateSelf()` → 새 요청 → 서버가 record 한 키워드 포함된 최신 LIST 반환

#### 항목 탭
- `_searchController.text = keyword` + `_onSearch(keyword)` → 검색 실행 → 서버 record → 클라이언트가 history refresh → 동일 키워드가 최상단으로 이동 (서버 LPUSH + 중복 제거)

#### 개별 삭제
- `deleteKeyword(keyword)`:
  1. local list에서 즉시 제거 (Optimistic)
  2. `DELETE /api/v1/search/history/{keyword}` (URL 인코딩 자동)
  3. 실패 시 원본 복원

#### 전체 삭제
- 풀스크린: 다이얼로그 확인 → `deleteAll()` → optimistic empty + `DELETE /api/v1/search/history` → 실패 시 원본 복원 + throw → 화면이 토스트
- 인라인 (검색 메인): 다이얼로그 없이 즉시 호출

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 자동 기록 후 재검색 | 로그인됨, Redis `search:history:{userId}` = `["등산", "독서", "요리"]` | 등산 검색 결과 + 최근 검색어 최상단이 "등산" |
| S2 | 처음 검색 — 빈 기록 | Redis 키 없음 | 첫 검색 후 검색 기록 시작 |
| S3 | 개별 삭제 — 스와이프 | `["이상한키워드", "등산", "독서"]` | `["등산", "독서"]` |
| S4 | 전체 삭제 (풀스크린, 다이얼로그 경로) | 시나리오 본문 참조 | Redis key 삭제됨 |
| S5 | 전체 삭제 (인라인, 다이얼로그 없음) | 시나리오 본문 참조 | 실수로 탭하면 곧바로 사라짐 (UX 차이 — 풀스크린 vs 인라인 일관성 없음) |
| S6 | 비로그인 — 빈 폴백 | 토큰 없음 | 사용자에게 에러 노출 없음, 트렌딩 키워드만 보임 |
| S7 | 삭제 실패 시 롤백 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 검색어 자동 정규화 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 90일 미사용 → 자동 만료 | 시나리오 본문 참조 | 검색 기록은 사용자가 활성 상태일 때만 유지됨 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. Happy Path — 자동 기록 후 재검색**: Given 로그인됨, Redis `search:history:{userId}` = `["등산", "독서", "요리"]` When 사용자가 해당 흐름을 실행하면 Then 등산 검색 결과 + 최근 검색어 최상단이 "등산"
- **AC-02. 처음 검색 — 빈 기록**: Given Redis 키 없음 When 사용자가 해당 흐름을 실행하면 Then 첫 검색 후 검색 기록 시작
- **AC-03. 개별 삭제 — 스와이프**: Given `["이상한키워드", "등산", "독서"]` When 사용자가 해당 흐름을 실행하면 Then `["등산", "독서"]`
- **AC-04. 전체 삭제 (풀스크린, 다이얼로그 경로)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then Redis key 삭제됨
- **AC-05. 전체 삭제 (인라인, 다이얼로그 없음)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 실수로 탭하면 곧바로 사라짐 (UX 차이 — 풀스크린 vs 인라인 일관성 없음)
- **AC-06. 비로그인 — 빈 폴백**: Given 토큰 없음 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 에러 노출 없음, 트렌딩 키워드만 보임
- **AC-07. 삭제 실패 시 롤백**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 검색어 자동 정규화**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 90일 미사용 → 자동 만료**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 검색 기록은 사용자가 활성 상태일 때만 유지됨

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
