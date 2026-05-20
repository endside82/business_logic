# F03-11. 위시리스트 (관심 이벤트) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-11_wishlist -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-11_wishlist`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 관심 있는 이벤트에 하트 토글로 찜을 추가/해제하고, 프로필 → "찜한 이벤트" 에서 모아 볼 수 있는 기능. add/remove 모두 idempotent — 같은 호출 반복해도 에러 없음. 단 OPEN 이외 상태(취소/종료/DRAFT/HIDDEN) 또는 PRIVATE visibility 의 비-멤버 이벤트는 찜 차단.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **하트 토글 진입점** (Add/Remove):
  - 이벤트 카드 (`EventCard.showWishlist=true, isWishlisted, onWishlistTap`) 가 표시되는 모든 화면 — 홈 피드, 검색 결과, 위시리스트 자체, 추천 등
  - 이벤트 상세 화면 우상단 하트 (event_detail_screen 의 `_toggleWishlist` 콜백)
- **목록 진입점**:
  - 프로필 탭 → "찜한 이벤트" → `/profile/wishlist` (`Routes.profileWishlist`)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-11_wishlist/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-11_wishlist/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-11_wishlist/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-11_wishlist/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/WishlistController.java:31` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/WishlistController.java:39` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/WishlistController.java:47` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

사용자가 관심 있는 이벤트에 하트 토글로 찜을 추가/해제하고, 프로필 → "찜한 이벤트" 에서 모아 볼 수 있는 기능. add/remove 모두 idempotent — 같은 호출 반복해도 에러 없음. 단 OPEN 이외 상태(취소/종료/DRAFT/HIDDEN) 또는 PRIVATE visibility 의 비-멤버 이벤트는 찜 차단.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/events/{eventId}/wishlist` | `WishlistController#add` | 인증 | 위시리스트 추가 (idempotent) |
| DELETE | `/api/v1/events/{eventId}/wishlist` | `WishlistController#remove` | 인증 | 위시리스트 제거 (idempotent) |
| GET | `/api/v1/users/me/wishlist` | `WishlistController#getMyWishlist` | 인증 | 내 찜 목록 페이지 (`Page<EventSimpleVo>`) |

### 의존 단위 / 외부 시스템

- **F03-01 발견 & 탐색** — 이벤트 카드의 하트 토글에서 호출. `EventSimpleVo.isWishlisted` 가 viewer context 단계에서 채워짐.
- **F03-02 이벤트 상세** — `EventVo.isWishlisted` + 위시리스트 카운트(`wishlistCount`) 표시. Toggle 후 detail invalidate 로 동기화.
- **EventViewerContextService** — wishlist 응답에 viewer 별 컨텍스트 (참석여부/역할/멤버십) 일괄 부여. 본 단위 자체 로직은 아니지만 응답 형태에 영향.
- 외부: 없음

## 5. 프론트 계약

### 진입 경로

- **하트 토글 진입점** (Add/Remove):
  - 이벤트 카드 (`EventCard.showWishlist=true, isWishlisted, onWishlistTap`) 가 표시되는 모든 화면 — 홈 피드, 검색 결과, 위시리스트 자체, 추천 등
  - 이벤트 상세 화면 우상단 하트 (event_detail_screen 의 `_toggleWishlist` 콜백)
- **목록 진입점**:
  - 프로필 탭 → "찜한 이벤트" → `/profile/wishlist` (`Routes.profileWishlist`)

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/profile/wishlist` | `presentation/profile/screens/profile_wishlist_screen.dart` | 내 찜 이벤트 목록 (페이지네이션, 토글, 카드 탭 진입) |

위젯:
- `presentation/event/widgets/wishlist_heart_button.dart` — 하트 IconButton (`isWishlisted` ? 빨간 favorite : 회색 favorite_border)
- `presentation/common/widgets/event_card.dart` — `showWishlist` prop 으로 우상단 하트 노출

### 화면별 구성 요소 & 액션

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
