# F04-01. 클럽 발견 & 탐색 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

비로그인 사용자도 키워드/카테고리 필터로 클럽 목록을 페이지 단위로 탐색할 수 있다. 인증된 사용자에게는 각 카드의 `myRole`/`myMembershipStatus` 필드가 추가로 채워져 "이미 가입한 클럽인지"를 한 번의 호출로 알 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 홈 하단 탭 바 ▶ "클럽" 탭 (StatefulShellRoute index 2 → `/clubs`)
- 마이페이지 > "클럽 둘러보기" 빈 상태 버튼
- 딥링크 `community://clubs` (DeepLinkService 경로)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `JoinType`, `ClubStatus`, `MemberRole`, `WaitType`, `Category`. 앱: `club_list_screen.dart`, `club_create_screen.dart`, `club_list_provider.dart`, `club_category_mapper.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#getClubs`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 / `setKeyword` / `setCategory` / 풀투리프레시 시:
   - `clubListNotifierProvider` (`@riverpod` auto-dispose, `domain/providers/club/club_list_provider.dart`)
   - `_fetchPage(0)` ▶ `clubRepositoryProvider.getClubs(keyword, category, status, page=0, size=20)`
   - Retrofit `ClubApi.getClubs` ▶ `GET /api/v1/clubs`
   - `Result<PageResponse<ClubSimpleVo>>` 반환 → `_items` 갱신, `_hasMore = !last`
2. 스크롤 끝 도달 시: `loadMore()` ▶ `_fetchPage(_currentPage + 1)` ▶ 누적
3. 카테고리/키워드 변경 시: `_reset()` ▶ `ref.invalidateSelf()` ▶ build에서 page 0 재호출

## 4. 제품 규칙

- 검색은 입력을 끝냈을 때 한 번 보낸다. 입력 중 자동 검색은 하지 않는다.
- 필터를 건 채 결과가 없으면 「검색 결과가 없습니다」를 보이고, 필터 없이 클럽이 하나도 없으면 빈 상태 안내를 보인다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 비로그인 사용자가 카테고리로 둘러본다 (Happy Path) | 비로그인. 홈에서 "클럽" 탭 진입. | 클럽 상세 화면, 가입 시도 시 로그인 게이트로 이동. |
| S2 | 로그인 사용자가 검색해서 자기 클럽을 찾는다 | 로그인됨. 토큰 유효. | 클럽 상세에서 즉시 커뮤니티 진입 가능. |
| S3 | 무한 스크롤 + 풀투리프레시 | 로그인 사용자. | 첫 페이지 갱신, 새로 추가된 클럽 보임. |
| S4 | 잘못된 카테고리 문자열로 진입 (에지) | 외부 딥링크에서 잘못 인코딩된 카테고리로 들어옴. | 정상 카테고리로 복귀해 목록 재진입. |
| S5 | 네트워크 오프라인 | 지하 진입. | 정상 데이터 표시. |
| S6 | FAB 가입 진입 (권한별 분기) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | scenarios.md:61 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, 인라인 검증 포인트 모음) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:65 | ### S2 보강 — OWNER 배지 텍스트 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:74 | > 본 surface 검증은 별도 새 시나리오를 만들 정도가 아니므로 S2의 종료 상태 보강으로 둔다. 라벨 변경 시 `ClubMembershipBadge` 코드와 본 시나리오/E2E 모두 동기화해야 한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 비로그인 사용자가 카테고리로 둘러본다 (Happy Path)**: Given 비로그인. 홈에서 "클럽" 탭 진입. When 사용자가 해당 흐름을 실행하면 Then 클럽 상세 화면, 가입 시도 시 로그인 게이트로 이동.
- **AC-02. 로그인 사용자가 검색해서 자기 클럽을 찾는다**: Given 로그인됨. 토큰 유효. When 사용자가 해당 흐름을 실행하면 Then 클럽 상세에서 즉시 커뮤니티 진입 가능.
- **AC-03. 무한 스크롤 + 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 첫 페이지 갱신, 새로 추가된 클럽 보임.
- **AC-04. 잘못된 카테고리 문자열로 진입 (에지)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 카테고리로 복귀해 목록 재진입.
- **AC-05. 네트워크 오프라인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 데이터 표시.
- **AC-06. FAB 가입 진입 (권한별 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
