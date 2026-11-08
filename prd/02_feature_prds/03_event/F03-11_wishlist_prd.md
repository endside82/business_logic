# F03-11. 위시리스트 (관심 이벤트) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 관심 있는 이벤트에 하트 토글로 찜을 추가/해제하고, 프로필 → "찜한 이벤트" 에서 모아 볼 수 있는 기능. add/remove 모두 idempotent — 같은 호출 반복해도 에러 없음. 단 상세를 읽을 수 없는 모임(`EVENT_NOT_FOUND`), 취소·종료·DRAFT 모임, 운영자가 숨긴 모임(숨김은 상태가 아니라 따로 둔 표지로 새 신청·참석·찜을 받지 않는다), PRIVATE visibility 에서 호스트도 그 클럽 회원도 아닌 사용자의 찜은 막는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **하트 토글 진입점** (Add/Remove):
  - 이벤트 카드 (`EventCard.showWishlist=true, isWishlisted, onWishlistTap`) 가 표시되는 모든 화면 — 홈 피드, 검색 결과, 위시리스트 자체, 추천 등
  - 이벤트 상세 화면 우상단 하트 (event_detail_screen 의 `_toggleWishlist` 콜백)
- **목록 진입점**:
  - 프로필 탭 → "찜한 이벤트" → `/profile/wishlist` (`Routes.profileWishlist`)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `WishlistController`, `EventViewerContextService`. 앱: `profile_wishlist_screen.dart`, `wishlist_heart_button.dart`, `event_card.dart`.

<!-- source-references:start -->
서버 창구: `WishlistController#add`, `WishlistController#remove`, `WishlistController#getMyWishlist`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 위시리스트 목록 (`profile_wishlist_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "찜한 이벤트"
  - 빈 상태 (`AppEmptyState(icon: favorite_border, title: '관심 이벤트가 여기 모입니다', description: '마음에 드는 이벤트를 찜하면 한 곳에서 볼 수 있어요')`)
  - 페이지네이션 카드 리스트 (`EventCard` 세로 배열)
  - 무한 스크롤 → 마지막 200px 도달 시 `loadMore()`
  - 다음 페이지 로딩 중 하단 `CircularProgressIndicator`
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 → `myWishlistNotifier.refresh()` (페이지 0부터 재시작)
  - 카드 탭 → `context.push('/home/events/${event.id}')`
  - 카드 하트 탭 → `_onToggle(event.id, event.isWishlisted)`
    - 현재 isWishlisted=true 이므로 항상 remove 액션
    - 성공: 토스트 "찜 해제했어요" (success)
    - 실패: 토스트 "잠시 후 다시 시도해주세요" (error)

### 하트 토글 (`WishlistHeartButton`)

- **isWishlisted=true** → `Icons.favorite` (빨강 `AppColors.error500`)
- **isWishlisted=false** → `Icons.favorite_border` (회색 `AppColors.gray400` 또는 outline 색상 prop)
- 카드 위에 올릴 때 `backgroundColor` prop 으로 화이트 배경 + outline 색상 흰색

## 4. 제품 규칙

- 찜 거절 차례: 상세를 읽지 못하면 `EVENT_NOT_FOUND`(공유 토큰 없는 링크 전용 포함), 취소, 마감, 새 참가를 받지 않음(DRAFT·운영자 숨김), 초대 전용은 호스트나 그 클럽 회원이 아니면 `FORBIDDEN`.
- 해제는 어떤 상태에서도 된다.
- 내 찜 목록은 지금 상세를 읽지 못하는 모임을 가린다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 검색 결과에서 하트 탭하여 찜 추가 (Happy path) | 로그인됨, wishlist 0건 | wishlist 1행, UI 하트 빨강 |
| S2 | 위시리스트 화면에서 해제 (낙관적 제거) | 위시리스트 정리 | wishlist 19건, UI 즉시 반영 |
| S3 | 종료된 이벤트 찜 시도 → 차단 | 사용자가 다른 화면의 stale 카드를 탭, 그 사이 이벤트는 CLOSED 됨 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | PRIVATE 이벤트 찜 시도 — 비-멤버 | 클럽 PRIVATE 이벤트, 사용자는 클럽 멤버 아님 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | PRIVATE 이벤트 찜 — 클럽 멤버 OK | 같은 PRIVATE 이벤트, 사용자는 해당 클럽 가입 상태 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 이미 찜한 이벤트 다시 찜 (idempotent) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 무한 스크롤로 다음 페이지 로드 | 위시리스트 100건 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 풀투리프레시 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 토글 도중 네트워크 단절 | 로그인 완료, `/home/events/1312` 진입, 사전 정리로 wishlist OFF 보장 | wishlist 1행, UI 하트 빨강, 성공 토스트 1회 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:80 | - **`wishlistRepository.add` 가 `EVENT_ALREADY_CANCELED\|CLOSED\|FORBIDDEN` 던질 때**: 토글 provider 가 `failure` 분기 → "잠시 후 다시 시도해주세요" 일반 메시지로 노출. 더 구체적인 메시지(예: "종료된 이벤트는 찜할 수 없습니다") 는 미구현 — 추후 audit 가능 항목. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 검색 결과에서 하트 탭하여 찜 추가 (Happy path)**: Given 로그인됨, wishlist 0건 When 사용자가 해당 흐름을 실행하면 Then wishlist 1행, UI 하트 빨강
- **AC-02. 위시리스트 화면에서 해제 (낙관적 제거)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then wishlist 19건, UI 즉시 반영
- **AC-03. 종료된 이벤트 찜 시도 → 차단**: Given 사용자가 다른 화면의 stale 카드를 탭, 그 사이 이벤트는 CLOSED 됨 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. PRIVATE 이벤트 찜 시도 — 비-멤버**: Given 클럽 PRIVATE 이벤트, 사용자는 클럽 멤버 아님 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. PRIVATE 이벤트 찜 — 클럽 멤버 OK**: Given 같은 PRIVATE 이벤트, 사용자는 해당 클럽 가입 상태 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 이미 찜한 이벤트 다시 찜 (idempotent)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 무한 스크롤로 다음 페이지 로드**: Given 위시리스트 100건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 토글 도중 네트워크 단절**: Given 로그인 완료, `/home/events/1312` 진입, 사전 정리로 wishlist OFF 보장 When 사용자가 해당 흐름을 실행하면 Then wishlist 1행, UI 하트 빨강, 성공 토스트 1회
