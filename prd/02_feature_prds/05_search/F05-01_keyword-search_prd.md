# F05-01. 키워드 검색 (이벤트/클럽/플랜/사람) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 입력한 키워드와 페이징 파라미터로 **이벤트**, **클럽**, **플랜**, **사람** 네 탭을 검색한다. 사람 검색은 전역 사용자 디렉터리가 아니라 같은 클럽 또는 증거등급 공동참석이라는 공유 맥락 안의 사용자만 찾는 인증 전용 표면이다. 인증 사용자가 비어 있지 않은 키워드로 검색하면 Redis 검색 기록(F05-04)에도 저장된다.

### 2026-07-29 소스 재실측 — 사람 탭 계약

| 항목 | 현재 계약 |
|---|---|
| Endpoint | `GET /api/v1/search/people?keyword&page&size` |
| 인증 | 필수. `SearchController` 매핑이 public 경로에 걸려 있어도 principal이 null이면 명시적으로 401을 반환한다. |
| 응답 | Spring `Page<PersonSearchVo>` / Flutter `PageResponse<PersonSearchVo>` |
| 필드 | `userId`, `nickname`, `avatarUrl`, `sharedClub`, `coAttendedCount` |
| 후보 우주 | 내 클럽의 현재 멤버 ∪ 증거등급 공동참석자. 전체 회원 검색이 아니다. |
| DB 선필터 | 본인 제외, `UserStatus.NORMAL`, 양방향 차단 제외, `hideFromSearch=false` 또는 설정 row 없음 |
| 키워드/정렬 | nickname 대소문자 무시 포함 검색, `nickname ASC, userId ASC` 안정 정렬 |
| 공동참석 | 체크인 운영 이벤트는 양쪽 체크인, 무체크인 이벤트는 양쪽 `ATTENDING`이고 확정/이의중 노쇼가 아니어야 한다. |

`sharedClub`과 `coAttendedCount`는 page 후보를 정한 뒤 배치 조립하며, Flutter는 이를 `같은 클럽` / `함께한 모임 N회` 라벨로 렌더한다. 비로그인 사용자는 사람 탭에서 로그인 유도를 보고 API는 호출하지 않는다. `hideFromSearch`는 이 표면, 만난 사람, 사람 추천에 적용하지만 직접 프로필 URL까지 막지는 않는다.

별도 `GET /api/v1/users/search?nickname=`은 즐겨찾기 추가/운영 선택기용 최대 20건 전역 검색이다. 이 경로는 `hideFromSearch`와 `hideFromStrangers`를 모두 적용하며 F05 사람 탭과 후보·응답 계약이 다르다.

실측 근거: `SearchController`, `PersonSearchService`, `PersonSearchQueryRepository`, `PersonSearchVo`, Flutter `search_api.dart`, `search_repository.dart`, `search_provider.dart`, `search_screen.dart`.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 2번째 "검색" → `/search`
- 알림 → 트렌딩 키워드 칩 탭(F05-02)
- 최근 검색어 항목 탭(F05-04)
- 저장된 검색 실행(F05-05) → 키워드 + 필터 프리셋으로 자동 검색
- 검색 결과 화면 내 자동완성 항목 탭(F05-02)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `SearchController`, `SearchVo`, `SortType`, `ViewerContextService`, `PlanService`. 앱: `search_screen.dart`.

## 3. 전체 동작 흐름

### Provider 체인
- `searchApiProvider` (`@Riverpod(keepAlive: true)`) → `Retrofit SearchApi`
- `savedSearchApiProvider` → `Retrofit SavedSearchApi` (F05-05 사용)
- `searchRepositoryProvider` → 두 API 모두 주입한 `SearchRepository` (`Result<T>` 래핑)
- `searchNotifierProvider` (`@Riverpod(keepAlive: true)`, `class SearchNotifier extends _$SearchNotifier`) — 이벤트 검색 상태 + 무한 스크롤
- `searchClubsNotifierProvider` / `searchPlansNotifierProvider` (`@riverpod`, auto-dispose) — 각 도메인 보조 검색
- `searchHistoryNotifierProvider` — 검색 직후 invalidate (F05-04)

### 검색 실행 시
1. `_onSearch(keyword)` → `searchNotifierProvider.search(keyword)`
   - 내부: `_filter.radiusKm != null` + lat/lng 비어 있으면 `locationPermissionNotifierProvider.getCurrentPosition()` 보충 (5분 캐시)
   - `repo.searchEvents(...)` → `GET /api/v1/search?keyword=&categories=&...&page=0&size=20`
   - `success` → `_items = pageResponse.content`, `_totalElements = pageResponse.totalElements`, `_hasMore = !pageResponse.last`
2. `searchClubsNotifierProvider.search(keyword)` → `GET /api/v1/search/clubs?keyword=&page=0&size=20`
3. `searchPlansNotifierProvider.search(keyword)` → `GET /api/v1/search/plans?keyword=&page=0&size=20`
4. `searchHistoryNotifierProvider.refresh()` → `GET /api/v1/search/history` 재조회

### 정렬 변경 / 필터 변경 시
- `setSortType(sortType)` 또는 `setFilter(filter)` → `_reSearch()` (page=0부터 재호출). 키워드가 비어 있으면 호출하지 않는다.

### 무한 스크롤
- `loadMore()` → `_isLoadingMore` 가드 + `_hasMore` 체크 후 `_fetchPage(_currentPage + 1)` → `_items = [..._items, ...newPage.content]`
- 클럽/플랜 탭은 화면 단에서 `loadMore()` 호출이 연결되어 있지 않으나(이벤트 `_scrollController`만 등록), Provider에는 구현되어 있다.

## 4. 제품 규칙

- 노출 범위: 이벤트는 모집 중(OPEN)만, 클럽은 활동 중(ACTIVE)만, 플랜은 공개된 상품만 검색된다. 사람 탭은 로그인이 필요하고 같은 클럽 또는 함께 참석한 사람으로 한정한다.
- 정렬: 최신순(기본), 인기순(참가 인원 많은 순), 가격 낮은 순, 가격 높은 순, 추천순, 시작 빠른 순. 추천순은 아직 시작하지 않은 이벤트만 시간 근접, 인기, 최신 순으로 묶는다. 앱은 추천순으로 시작한다.
- 한 번에 20건씩 불러온다. 거리 필터를 쓰는데 위치 권한이 없으면 위치 조건 없이 검색되고 따로 안내하지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 키워드로 이벤트 발견 | 로그인 완료, 홈 탭에 있음 | 이벤트 상세 화면으로 이동. `searchNotifierProvider`는 keepAlive로 결과 유지, 뒤로가기 시 동일한 결과 화면으로 복귀 |
| S2 | 클럽/플랜 탭 전환 | "독서" 검색 직후 이벤트 탭 노출 | 클럽 상세 진입. (탭 전환 자체는 추가 네트워크 비용 없음) |
| S3 | 무한 스크롤 (이벤트 탭만) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 정렬 변경 | 시나리오 본문 참조 | 동일 키워드 + 새 정렬 결과. `_currentPage` = 0으로 리셋 |
| S5 | 빈 결과 | 시나리오 본문 참조 | 사용자가 다른 키워드로 재시도 가능 |
| S6 | 비로그인 검색 | 비로그인. `Routes.publicRoutes`에 `/search` 포함되어 접근 가능 | 비로그인이라 최근 검색어 영역만 비어있고 트렌딩/검색 결과는 정상 |
| S7 | 네트워크 오류 — 이벤트 탭 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 권한별 분기 — 거리 필터 + 위치 권한 거부 | 시나리오 본문 참조 | 사용자에게 별도 안내 없음 — UX 개선 여지 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:44 | - `distance: Double?` (현재 코드상 매퍼에서 `ignore` — 항상 null) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:86 | - **에러 분기**: (서비스 구현 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. Happy Path — 키워드로 이벤트 발견**: Given 로그인 완료, 홈 탭에 있음 When 사용자가 해당 흐름을 실행하면 Then 이벤트 상세 화면으로 이동. `searchNotifierProvider`는 keepAlive로 결과 유지, 뒤로가기 시 동일한 결과 화면으로 복귀
- **AC-02. 클럽/플랜 탭 전환**: Given "독서" 검색 직후 이벤트 탭 노출 When 사용자가 해당 흐름을 실행하면 Then 클럽 상세 진입. (탭 전환 자체는 추가 네트워크 비용 없음)
- **AC-03. 무한 스크롤 (이벤트 탭만)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 정렬 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 동일 키워드 + 새 정렬 결과. `_currentPage` = 0으로 리셋
- **AC-05. 빈 결과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 키워드로 재시도 가능
- **AC-06. 비로그인 검색**: Given 비로그인. `Routes.publicRoutes`에 `/search` 포함되어 접근 가능 When 사용자가 해당 흐름을 실행하면 Then 비로그인이라 최근 검색어 영역만 비어있고 트렌딩/검색 결과는 정상
- **AC-07. 네트워크 오류 — 이벤트 탭**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 권한별 분기 — 거리 필터 + 위치 권한 거부**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 별도 안내 없음 — UX 개선 여지
