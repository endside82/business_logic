# F05-05. 저장된 검색 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 자주 쓰는 검색 조건을 이름과 함께 저장하고, 목록에서 실행/수정/삭제한다. **MySQL** `saved_search` 테이블 (entity `SavedSearch`)에 저장되며, `searchParams`는 keyword + 필터 전체를 JSON 문자열로 직렬화한 값이다. `notifyOnNew=true` 옵션을 주면 30분 주기 스케줄러가 새 결과 발생 시 푸시 알림을 보낸다(F05-05의 부수 기능). 사용자당 최대 **10개** (서버 상수 `MAX_SAVED_SEARCHES = 10` — UI 스펙 20개와 불일치).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 검색 메인(`/search`) idle 상태 상단 "저장된 검색 보기" 단축 → `/search/saved`
- 검색 결과 화면에서 북마크 아이콘(`SearchAppBar.showBookmark`) 탭 → `SaveSearchDialog` (생성 플로우)
- 푸시 알림 (`SAVED_SEARCH_NEW_RESULTS`, Unit 12) → 딥링크 (현 코드 기준 별도 라우트는 미확인) → `/search/saved`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `SavedSearchController`, `NotificationService`. 앱: `saved_search_screen.dart`, `search_screen.dart`, `save_search_dialog.dart`, `search_filter_sheet.dart`, `saved_search_card.dart`.

<!-- source-references:start -->
서버 창구: `SavedSearchController#getSavedSearches`, `SavedSearchController#createSavedSearch`, `SavedSearchController#updateSavedSearch`, `SavedSearchController#deleteSavedSearch`, `SavedSearchController#executeSavedSearch`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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
- 수정 → `PUT /api/v1/search/saved/{id}` (이름, 검색 조건, 알림 여부를 모두 갱신)
- 삭제 → `DELETE /api/v1/search/saved/{id}` (Optimistic)

## 4. 제품 규칙

- 한 사람이 저장할 수 있는 검색은 최대 10개이다. 이름은 50자까지이고 비워 둘 수 없다. 목록은 최근 사용한 순이다.
- 수정하면 이름, 검색 조건, 알림 여부가 모두 바뀐다. 다른 사람의 저장 검색은 보거나 고치거나 지우거나 실행할 수 없다.
- 알림을 켠 검색은 30분마다 마지막 확인 이후 새로 공개된 이벤트가 있는지 보고, 있으면 "저장된 검색 새 결과" 알림과 새 결과 수 배지를 낸다. 없으면 배지는 0이 된다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 저장 → 실행 | 검색 결과 화면, "등산" + 거리 50km + freeOnly true 적용 상태 | 검색 메인으로 전환, "등산" 키워드 + 동일 필터로 결과 표시. 카드의 "마지막 실행" / 사용횟수 갱신 |
| S2 | 갯수 초과 (10개 한계) | 이미 10개 저장 사용자 | 저장 안 됨. 사용자는 이유를 알기 어려움 — 서버 ErrorCode와 매핑된 안내 메시지 또는 갯수 표시 필요 |
| S3 | 알림 토글 | 시나리오 본문 참조 | 알림 ON 상태. 새 결과 시 푸시 |
| S4 | 수정 (필터 변경) | 시나리오 본문 참조 | 이름, 검색 조건, 알림 여부가 모두 갱신됨 |
| S5 | 삭제 | 시나리오 본문 참조 | 카드 사라짐. 실패 시 원본 복원 + throw → `showApiErrorToast` "삭제에 실패했습니다" |
| S6 | 다른 사용자의 저장 검색 ID로 시도 (보안) | 시나리오 본문 참조 | 본인이 아닌 항목은 수정/삭제/실행 모두 거절(없는 항목은 찾을 수 없음, 남의 항목은 권한 없음) |
| S7 | 알림 푸시 수신 (스케줄러 → 사용자) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 빈 상태 | 저장 검색 0건 | 사용자 안내. 검색 결과 화면에서 저장하라는 유도 텍스트만 노출 |
| S9 | 정렬 — 최신 실행순 (서버 자동) | A(lastUsedAt: 어제), B(lastUsedAt: 1주전), C(lastUsedAt: null) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 원문 조각 | 원문 표·그림의 줄바꿈 조각이라 판정할 내용이 없다 | 없음 |
| 후보 | frontend.md:6 | - 푸시 알림 (`SAVED_SEARCH_NEW_RESULTS`, Unit 12) → 딥링크 (현 코드 기준 별도 라우트는 미확인) → `/search/saved` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:102 | > UI/UX 스펙은 "최신순/이름순" 옵션을 명시하지만 현재 서버는 lastUsedAt DESC만 지원. 이름순 정렬은 미구현. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. Happy Path — 저장 → 실행**: Given 검색 결과 화면, "등산" + 거리 50km + freeOnly true 적용 상태 When 사용자가 해당 흐름을 실행하면 Then 검색 메인으로 전환, "등산" 키워드 + 동일 필터로 결과 표시. 카드의 "마지막 실행" / 사용횟수 갱신
- **AC-02. 갯수 초과 (10개 한계)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 저장 안 됨. 사용자는 이유를 알기 어려움 — 서버 ErrorCode와 매핑된 안내 메시지 또는 갯수 표시 필요
- **AC-03. 알림 토글**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 알림 ON 상태. 새 결과 시 푸시
- **AC-04. 수정 (필터 변경)**: Given 저장된 검색이 있다 When 이름과 검색 조건을 바꿔 수정하면 Then 이름, 검색 조건, 알림 여부가 모두 갱신된다
- **AC-05. 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 카드 사라짐. 실패 시 원본 복원 + throw → `showApiErrorToast` "삭제에 실패했습니다"
- **AC-06. 다른 사용자의 저장 검색 ID로 시도 (보안)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본인이 아닌 항목은 수정/삭제/실행 모두 거절된다
- **AC-07. 알림 푸시 수신 (스케줄러 → 사용자)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 빈 상태**: Given 저장 검색 0건 When 사용자가 해당 흐름을 실행하면 Then 사용자 안내. 검색 결과 화면에서 저장하라는 유도 텍스트만 노출
- **AC-09. 정렬 — 최신 실행순 (서버 자동)**: Given A(lastUsedAt: 어제), B(lastUsedAt: 1주전), C(lastUsedAt: null) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
