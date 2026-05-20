# F05-05. 저장된 검색 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/05_search/F05-05_saved-search -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/05_search/F05-05_saved-search`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 자주 쓰는 검색 조건을 이름과 함께 저장하고, 목록에서 실행/수정/삭제한다. **MySQL** `saved_search` 테이블 (entity `SavedSearch`)에 저장되며, `searchParams`는 keyword + 필터 전체를 JSON 문자열로 직렬화한 값이다. `notifyOnNew=true` 옵션을 주면 30분 주기 스케줄러가 새 결과 발생 시 푸시 알림을 보낸다(F05-05의 부수 기능). 사용자당 최대 **10개** (서버 상수 `MAX_SAVED_SEARCHES = 10` — UI 스펙 20개와 불일치).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 검색 메인(`/search`) idle 상태 상단 "저장된 검색 보기" 단축 → `/search/saved`
- 검색 결과 화면에서 북마크 아이콘(`SearchAppBar.showBookmark`) 탭 → `SaveSearchDialog` (생성 플로우)
- 푸시 알림 (`SAVED_SEARCH_NEW_RESULTS`, Unit 12) → 딥링크 (현 코드 기준 별도 라우트는 미확인) → `/search/saved`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/05_search/F05-05_saved-search/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/05_search/F05-05_saved-search/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/05_search/F05-05_saved-search/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/05_search/F05-05_saved-search/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java:33` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java:41` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java:49` | 확인됨 |
| `community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java:57` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### Provider
- `savedSearchNotifierProvider` (`@riverpod`, auto-dispose, `class SavedSearchNotifier`):
  - `build` → `repo.getSavedSearches()` → `success → searches / failure → throw error`
  - `create(param)` → `POST` → 성공 시 state head에 prepend `[saved, ...currentList]`
  - `updateSavedSearch(id, param)` → `PUT` → state에서 `id` 일치 항목 교체
  - `delete(id)` — Optimistic remove + 실패 시 롤백 + throw
  - `execute(id)` → `POST /execute` → state에서 해당 항목을 응답 객체로 교체 → 응답 객체 반환

### 주요 호출 흐름
- 화면 진입 → `GET /api/v1/search/saved`
- 생성 → `POST /api/v1/search/saved` (검색 결과 화면에서 다이얼로그 거쳐)
- 알림 토글 → `PUT /api/v1/search/saved/{id}`
- 실행 → `POST /api/v1/search/saved/{id}/execute` → 응답 받아 `SearchNotifier`로 검색 실행
- 수정 → `PUT /api/v1/search/saved/{id}` (서버 코드상 `searchParams` 갱신 안 됨 — 잠재 결함)
- 삭제 → `DELETE /api/v1/search/saved/{id}` (Optimistic)

## 4. 서버 계약

### 개요

사용자가 자주 쓰는 검색 조건을 이름과 함께 저장하고, 목록에서 실행/수정/삭제한다. **MySQL** `saved_search` 테이블 (entity `SavedSearch`)에 저장되며, `searchParams`는 keyword + 필터 전체를 JSON 문자열로 직렬화한 값이다. `notifyOnNew=true` 옵션을 주면 30분 주기 스케줄러가 새 결과 발생 시 푸시 알림을 보낸다(F05-05의 부수 기능). 사용자당 최대 **10개** (서버 상수 `MAX_SAVED_SEARCHES = 10` — UI 스펙 20개와 불일치).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/search/saved` | `SavedSearchController#getSavedSearches` | required | 본인 저장 검색 목록 (`lastUsedAt DESC`) |
| POST | `/api/v1/search/saved` | `SavedSearchController#createSavedSearch` | required | 저장 검색 생성 |
| PUT | `/api/v1/search/saved/{id}` | `SavedSearchController#updateSavedSearch` | required | 이름 / 알림 여부 수정 |
| DELETE | `/api/v1/search/saved/{id}` | `SavedSearchController#deleteSavedSearch` | required | 삭제 |
| POST | `/api/v1/search/saved/{id}/execute` | `SavedSearchController#executeSavedSearch` | required | 실행 카운터 증가 + lastUsedAt 갱신 |

### 의존 단위 / 외부 시스템

- **다른 Unit 의존**:
  - Unit 12 (Notification): `NotificationService.createNotification`, `NotificationType.SAVED_SEARCH_NEW_RESULTS`, `SearchNotificationData` (스케줄러)
- **외부 시스템**: Jackson `ObjectMapper` (스케줄러), FCM (Notification Unit 위임)
- **호출됨**: F05-03 (필터 시트가 저장 검색 수정 모드에서 진입), F05-01 (실행 시 검색 자체는 F05-01 엔드포인트 사용)

## 5. 프론트 계약

### 진입 경로

- 검색 메인(`/search`) idle 상태 상단 "저장된 검색 보기" 단축 → `/search/saved`
- 검색 결과 화면에서 북마크 아이콘(`SearchAppBar.showBookmark`) 탭 → `SaveSearchDialog` (생성 플로우)
- 푸시 알림 (`SAVED_SEARCH_NEW_RESULTS`, Unit 12) → 딥링크 (현 코드 기준 별도 라우트는 미확인) → `/search/saved`

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/search/saved` | `lib/presentation/search/screens/saved_search_screen.dart` | 저장 검색 목록 + 실행/수정/삭제 |
| `/search` (modal) | `lib/presentation/search/widgets/save_search_dialog.dart` | 생성 다이얼로그 |
| `/search` (modal) | `lib/presentation/search/widgets/search_filter_sheet.dart` | 수정 모드 필터 시트 |

위젯
| 파일 | 역할 |
|---|---|
| `widgets/saved_search_card.dart` | 카드 — 이름/필터 칩/메타/실행/수정/삭제/알림 토글 |
| `widgets/save_search_dialog.dart` | 생성 다이얼로그 — 이름 입력 + 알림 토글 |

### 화면별 구성 요소 & 액션

### `SavedSearchScreen` (`/search/saved`)

- **사용자가 보는 것**:
  - AppBar `"저장된 검색"`
  - `searches.isEmpty` → 빈 상태: 북마크 아이콘 64 gray300 + "저장된 검색이 없습니다" + "자주 사용하는 검색을 저장해보세요"
  - 데이터: `ListView.separated` 의 `SavedSearchCard` (screenPadding=16, separator=space3)
- **사용자가 할 수 있는 액션**:
  - 알림 토글 → `savedSearchNotifier.updateSavedSearch(id, SavedSearchParam(name, searchParams, notifyOnNew))` → `PUT /api/v1/search/saved/{id}` → 실패 시 토스트
  - 실행(검색 아이콘) → `savedSearchNotifier.execute(id)` → `POST /execute` → 응답 `searchParams` 파싱 → `SearchFilter` 빌드 → `searchNotifierProvider.setFilter(filter)` + `search(keyword)` → `context.go('/search')`
  - 수정(편집 아이콘) → `_decodeSearchParams(saved.searchParams)` → `_buildFilter(params)` → `SearchFilterSheet.show(initialFilter, onApply)` → 적용 시 새 searchParams JSON 만들고 `updateSavedSearch` 호출 → 실패 시 토스트
  - 삭제(휴지통 아이콘) → `AppDialog.confirm(title:"삭제", message:'"$name" 저장된 검색을 삭제하시겠습니까?', confirmLabel:"삭제", isDangerous:true)` → 확인 시 `delete(id)` → `DELETE /api/v1/search/saved/{id}` (Optimistic 제거 + 실패 시 롤백)
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.card, count: 3)`
  - 에러: `AppErrorState(title:"오류가 발생했습니다", onRetry:() => ref.invalidate(savedSearchNotifierProvider))`
  - 빈: 위 빈 상태 UI

### `SavedSearchCard` (`saved_search_card.dart`)

- **사용자가 보는 것**:
  - Title row: 이름 (body1Medium) + (newResultCount > 0이면) 빨간 배지 (error500) + (notifyOnNew면) 알림 아이콘 (primary500)
  - 필터 칩 Wrap — `searchParams` JSON에서 keyword (인용부호 표시) + categories(라벨 변환) + freeOnly("무료") 추출. 미실행 카테고리 매퍼 또는 파싱 실패 시 무시
  - "새 결과 알림" 토글 행 — 아이콘 + "새 결과 알림" + Switch (Optimistic — 토글 직후 PUT 호출)
  - 메타: "마지막 실행: M/d HH:mm" + "$N회 사용" + 액션 버튼 3개 (실행/수정/삭제, 32x32)
- **상호작용 위임**: 모든 액션은 화면이 콜백으로 처리. 카드는 표시 전용

### `SaveSearchDialog` (`save_search_dialog.dart`)

- **사용자가 보는 것**:
  - "검색 저장" heading3 + "이 검색 조건에 이름을 지정하세요" 안내
  - TextField (`maxLength: 50`, `autofocus: true`, hint "검색 이름 입력")
  - 알림 토글 행 + "새로운 검색 결과가 있으면 알림을 받습니다" 캡션
  - 취소 / 저장 버튼 (둘 다 fullWidth, button radius)
- **사용자가 할 수 있는 액션**:
  - 이름 입력 후 엔터 또는 "저장" 탭 → name이 비어있지 않으면 `Navigator.pop(SaveSearchResult(name, notifyOnNew))`
  - 취소 → `Navigator.pop()` (null 반환)
- **호출처 흐름** (search_screen.dart `_saveSearch`):
  1. `SavedSearch.notifier.hasSearched` 가드
  2. dialog 결과 받기
  3. `searchParams = jsonEncode({'keyword': notifier.keyword, ...notifier.filter.toJson()})`
  4. `SavedSearchParam(name, searchParams, notifyOnNew)` 생성
  5. `savedSearchNotifier.create(param)` → `POST /api/v1/search/saved`
  6. 성공 → `AppToast.show(message: '검색이 저장되었습니다', type: ToastType.success)`
  7. 실패 → `showApiErrorToast(fallback: '저장에 실패했습니다')`

### API 호출 순서 (Provider/Repository 관점)

### Provider
- `savedSearchNotifierProvider` (`@riverpod`, auto-dispose, `class SavedSearchNotifier`):
  - `build` → `repo.getSavedSearches()` → `success → searches / failure → throw error`
  - `create(param)` → `POST` → 성공 시 state head에 prepend `[saved, ...currentList]`
  - `updateSavedSearch(id, param)` → `PUT` → state에서 `id` 일치 항목 교체
  - `delete(id)` — Optimistic remove + 실패 시 롤백 + throw
  - `execute(id)` → `POST /execute` → state에서 해당 항목을 응답 객체로 교체 → 응답 객체 반환

### 주요 호출 흐름
- 화면 진입 → `GET /api/v1/search/saved`
- 생성 → `POST /api/v1/search/saved` (검색 결과 화면에서 다이얼로그 거쳐)
- 알림 토글 → `PUT /api/v1/search/saved/{id}`
- 실행 → `POST /api/v1/search/saved/{id}/execute` → 응답 받아 `SearchNotifier`로 검색 실행
- 수정 → `PUT /api/v1/search/saved/{id}` (서버 코드상 `searchParams` 갱신 안 됨 — 잠재 결함)
- 삭제 → `DELETE /api/v1/search/saved/{id}` (Optimistic)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 저장 → 실행 | 검색 결과 화면, "등산" + 거리 50km + freeOnly true 적용 상태 | 검색 메인으로 전환, "등산" 키워드 + 동일 필터로 결과 표시. 카드의 "마지막 실행" / 사용횟수 갱신 |
| S2 | 갯수 초과 (10개 한계) | 이미 10개 저장 사용자 | 저장 안 됨. 사용자는 이유를 알기 어려움 — 서버 ErrorCode와 매핑된 안내 메시지 또는 갯수 표시 필요 |
| S3 | 알림 토글 | 시나리오 본문 참조 | 알림 ON 상태. 새 결과 시 푸시 |
| S4 | 수정 (필터 변경) — 서버 결함 시나리오 | 시나리오 본문 참조 | **잠재 결함** — 서버 update 로직이 `param.getSearchParams()`도 반영해야 함 |
| S5 | 삭제 | 시나리오 본문 참조 | 카드 사라짐. 실패 시 원본 복원 + throw → `showApiErrorToast` "삭제에 실패했습니다" |
| S6 | 다른 사용자의 저장 검색 ID로 시도 (보안) | 시나리오 본문 참조 | 본인이 아닌 항목은 수정/삭제/실행 모두 401 |
| S7 | 알림 푸시 수신 (스케줄러 → 사용자) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 빈 상태 | 저장 검색 0건 | 사용자 안내. 검색 결과 화면에서 저장하라는 유도 텍스트만 노출 |
| S9 | 정렬 — 최신 실행순 (서버 자동) | A(lastUsedAt: 어제), B(lastUsedAt: 1주전), C(lastUsedAt: null) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:70 | - 현재 코드: `name`, `notifyOnNew`만 갱신. **`searchParams`는 갱신하지 않음** (빠진 것으로 보임) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:145 | \| 정렬 \| 최신순/이름순 \| `lastUsedAt DESC` 만 \| 이름순 옵션 미구현 \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:6 | - 푸시 알림 (`SAVED_SEARCH_NEW_RESULTS`, Unit 12) → 딥링크 (현 코드 기준 별도 라우트는 미확인) → `/search/saved` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:102 | > UI/UX 스펙은 "최신순/이름순" 옵션을 명시하지만 현재 서버는 lastUsedAt DESC만 지원. 이름순 정렬은 미구현. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. Happy Path — 저장 → 실행**: Given 검색 결과 화면, "등산" + 거리 50km + freeOnly true 적용 상태 When 사용자가 해당 흐름을 실행하면 Then 검색 메인으로 전환, "등산" 키워드 + 동일 필터로 결과 표시. 카드의 "마지막 실행" / 사용횟수 갱신
- **AC-02. 갯수 초과 (10개 한계)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 저장 안 됨. 사용자는 이유를 알기 어려움 — 서버 ErrorCode와 매핑된 안내 메시지 또는 갯수 표시 필요
- **AC-03. 알림 토글**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 알림 ON 상태. 새 결과 시 푸시
- **AC-04. 수정 (필터 변경) — 서버 결함 시나리오**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then **잠재 결함** — 서버 update 로직이 `param.getSearchParams()`도 반영해야 함
- **AC-05. 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 카드 사라짐. 실패 시 원본 복원 + throw → `showApiErrorToast` "삭제에 실패했습니다"
- **AC-06. 다른 사용자의 저장 검색 ID로 시도 (보안)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본인이 아닌 항목은 수정/삭제/실행 모두 401
- **AC-07. 알림 푸시 수신 (스케줄러 → 사용자)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 빈 상태**: Given 저장 검색 0건 When 사용자가 해당 흐름을 실행하면 Then 사용자 안내. 검색 결과 화면에서 저장하라는 유도 텍스트만 노출
- **AC-09. 정렬 — 최신 실행순 (서버 자동)**: Given A(lastUsedAt: 어제), B(lastUsedAt: 1주전), C(lastUsedAt: null) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
