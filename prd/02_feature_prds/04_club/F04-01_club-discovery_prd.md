# F04-01. 클럽 발견 & 탐색 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-01_club-discovery -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-01_club-discovery`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

비로그인 사용자도 키워드/카테고리 필터로 클럽 목록을 페이지 단위로 탐색할 수 있다. 인증된 사용자에게는 각 카드의 `myRole`/`myMembershipStatus` 필드가 추가로 채워져 "이미 가입한 클럽인지"를 한 번의 호출로 알 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 홈 하단 탭 바 ▶ "클럽" 탭 (StatefulShellRoute index 2 → `/clubs`)
- 마이페이지 > "클럽 둘러보기" 빈 상태 버튼
- 딥링크 `community://clubs` (DeepLinkService 경로)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-01_club-discovery/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-01_club-discovery/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-01_club-discovery/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-01_club-discovery/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:68` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 / `setKeyword` / `setCategory` / 풀투리프레시 시:
   - `clubListNotifierProvider` (`@riverpod` auto-dispose, `domain/providers/club/club_list_provider.dart`)
   - `_fetchPage(0)` ▶ `clubRepositoryProvider.getClubs(keyword, category, status, page=0, size=20)`
   - Retrofit `ClubApi.getClubs` ▶ `GET /api/v1/clubs`
   - `Result<PageResponse<ClubSimpleVo>>` 반환 → `_items` 갱신, `_hasMore = !last`
2. 스크롤 끝 도달 시: `loadMore()` ▶ `_fetchPage(_currentPage + 1)` ▶ 누적
3. 카테고리/키워드 변경 시: `_reset()` ▶ `ref.invalidateSelf()` ▶ build에서 page 0 재호출

## 4. 서버 계약

### 개요

비로그인 사용자도 키워드/카테고리 필터로 클럽 목록을 페이지 단위로 탐색할 수 있다. 인증된 사용자에게는 각 카드의 `myRole`/`myMembershipStatus` 필드가 추가로 채워져 "이미 가입한 클럽인지"를 한 번의 호출로 알 수 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/clubs | ClubController#getClubs | optional (`errorOnInvalidType=false`) | 키워드/카테고리/상태 필터 + 페이징 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `JoinType` (`constants/JoinType.java`): `APPROVAL(0)`, `FREE(1)` — 직렬화 시 문자열명.
- **Enum** `ClubStatus` (`constants/ClubStatus.java`): `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- **Enum** `MemberRole` (`constants/MemberRole.java`): `MEMBER(0)`, `ADMIN(1)`, `OWNER(2)`.
- **Enum** `WaitType` (`constants/WaitType.java`): `APPLY(0)`, `INVITE(1)`, `BAN(2)` — 멤버십 상태 판정에 사용.
- **Enum** `Category`: `event/constants/Category.java` (다른 도메인) — 서버 정의 카테고리 목록을 그대로 사용.

### 의존 단위 / 외부 시스템

- **Unit 01 (account)**: `ownerNickname`을 위해 `Users` 정보가 N+1 회피되어 함께 조회됨.
- **Unit 03 (event)**: `Category` enum을 공유.
- 외부 시스템 호출 없음 (Toss/FCM/S3 무관).

## 5. 프론트 계약

### 진입 경로

- 홈 하단 탭 바 ▶ "클럽" 탭 (StatefulShellRoute index 2 → `/clubs`)
- 마이페이지 > "클럽 둘러보기" 빈 상태 버튼
- 딥링크 `community://clubs` (DeepLinkService 경로)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/clubs` | `club/screens/club_list_screen.dart` | 클럽 그리드 목록 |
| `/clubs/create` (FAB) | `club/screens/club_create_screen.dart` (F04-03) | FAB로 진입 |

### 화면별 구성 요소 & 액션

### 클럽 목록 (`club_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar 타이틀 "클럽"
  - `AppSearchBar` — 클럽명/키워드 검색 입력 (`AppSpacing.screenPadding` 16dp)
  - `ClubCategoryTabs` — 가로 스크롤 카테고리 칩 (전체/스포츠/독서/음악/여행 등 `ClubCategoryMapper`)
  - 2열 그리드 `ClubGridCard`:
    - 커버 이미지 (120dp 높이, 라운드 12dp) — 없으면 `SeededFallbackImage` (id 시드)
    - 클럽명 (1~2줄)
    - 카테고리 라벨 (Category enum → 한글)
    - "멤버 N명" 캡션
    - 가입 상태 배지 (`ClubMembershipBadge` — ACTIVE/PENDING 시 표시)
  - 무한 스크롤 진행 인디케이터
  - FAB(+) — 로그인 사용자만 표시 (`isAuthenticatedProvider`)
- **사용자가 할 수 있는 액션**:
  - 검색바 onSubmitted ▶ `clubListNotifier.setKeyword(value)` → state 리셋 + `GET /api/v1/clubs?keyword=...`
  - 카테고리 칩 탭 ▶ `setCategory(category)` (전체 선택 시 null) → 재조회
  - 카드 탭 ▶ `context.go('/clubs/{id}')` → 클럽 상세 (F04-02)
  - 풀투리프레시 ▶ `ref.refresh(clubListNotifierProvider.future)` → page 0 재조회
  - 스크롤 끝 200px 도달 ▶ `loadMore()` → 다음 page 호출, `pageResponse.last`로 종료 판정
  - FAB 탭 ▶ `context.push('/clubs/create')` (F04-03), 액션 추적 키 `club.list.create`
- **상태 분기**:
  - 로딩: 중앙 `CircularProgressIndicator` (스켈레톤은 그리드 셀로는 미적용)
  - 에러: `AppErrorState(onRetry: () => ref.invalidate(clubListNotifierProvider))`
  - 빈 (필터 있음): "검색 결과가 없습니다"
  - 빈 (필터 없음): "아직 클럽이 없어요" + "첫 클럽을 만들어 보세요" 버튼 (로그인 분기는 FAB로 처리)
- **모달/시트/네비게이션**: 없음. 이 화면 자체는 push만 발생.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 / `setKeyword` / `setCategory` / 풀투리프레시 시:
   - `clubListNotifierProvider` (`@riverpod` auto-dispose, `domain/providers/club/club_list_provider.dart`)
   - `_fetchPage(0)` ▶ `clubRepositoryProvider.getClubs(keyword, category, status, page=0, size=20)`
   - Retrofit `ClubApi.getClubs` ▶ `GET /api/v1/clubs`
   - `Result<PageResponse<ClubSimpleVo>>` 반환 → `_items` 갱신, `_hasMore = !last`
2. 스크롤 끝 도달 시: `loadMore()` ▶ `_fetchPage(_currentPage + 1)` ▶ 누적
3. 카테고리/키워드 변경 시: `_reset()` ▶ `ref.invalidateSelf()` ▶ build에서 page 0 재호출

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **페이지 사이즈**: `_pageSize = 20` (프론트 상수)
- **무한 스크롤 트리거**: 스크롤 끝 200px 직전
- **검색 디바운스**: AppSearchBar `onSubmitted` 사용 — IME 완료 시점에만 호출 (별도 디바운스 ms 없음)
- **카테고리 매핑**: 서버 enum → 한글 라벨은 `core/utils/club_category_mapper.dart`
- **레이아웃**: 2열 그리드, `crossAxisSpacing/mainAxisSpacing = 12dp`, `childAspectRatio = 0.78`
- **그리드 패딩**: `EdgeInsets.all(AppSpacing.screenPadding)` (16dp)
- **FAB 가시성**: 비로그인은 FAB 미표시 (`isAuthenticatedProvider` 분기)
- **빈 상태 문구**: "아직 클럽이 없어요" / "검색 결과가 없습니다" — UI/UX 스펙 SCR-CL-001과 동일
- **FAB 진입 인증 가드**: 라우터 단의 `_authGuard`에 의해 비로그인이 `/clubs/create`로 가면 로그인으로 redirect

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 비로그인 사용자가 카테고리로 둘러본다 (Happy Path) | 비로그인. 홈에서 "클럽" 탭 진입. | 클럽 상세 화면, 가입 시도 시 로그인 게이트로 이동. |
| S2 | 로그인 사용자가 검색해서 자기 클럽을 찾는다 | 로그인됨. 토큰 유효. | 클럽 상세에서 즉시 커뮤니티 진입 가능. |
| S3 | 무한 스크롤 + 풀투리프레시 | 로그인 사용자. | 첫 페이지 갱신, 새로 추가된 클럽 보임. |
| S4 | 잘못된 카테고리 문자열로 진입 (에지) | 외부 딥링크에서 잘못 인코딩된 카테고리로 들어옴. | 정상 카테고리로 복귀해 목록 재진입. |
| S5 | 네트워크 오프라인 | 지하 진입. | 정상 데이터 표시. |
| S6 | FAB 가입 진입 (권한별 분기) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
