# F11-03. 리뷰 수정 & 삭제 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/11_review_report/F11-03_review-edit-delete -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/11_review_report/F11-03_review-edit-delete`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

본인이 작성한 단일 리뷰를 수정(PATCH)하거나 삭제(DELETE, soft delete)하는 두 엔드포인트다. 두 작업 모두 호출자(`@AuthenticationPrincipal`)와 `Review.reviewerId` 일치 검증, 삭제는 `deletedAt`을 현재 시각으로 채우는 soft delete이며, 수정은 변경 직전 값을 `ReviewEditHistory`에 보관하고 5회를 초과해 수정할 수 없다. 두 작업 모두 끝나면 `TrustScoreService.recalculate(revieweeId)`를 호출해 평가 대상자의 신뢰점수가 다시 산정된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- F11-02 리뷰 목록(`review_list_screen.dart`)에서 본인이 작성한 리뷰 카드의 우상단 더보기(`more_vert`) 메뉴를 통해 트리거된다.
- 마이페이지의 "내 리뷰" 영역(`/profile/my-reviews` → 동일 `ReviewListScreen`을 `userId`로 진입)에서도 동일 메뉴가 노출된다 — `_resolveCurrentUserId(ref)`로 `authNotifierProvider`의 사용자 id를 읽어 `review.reviewerId`와 일치할 때만 `onEdit`/`onDelete` 콜백을 전달.
- 수정 흐름은 F11-01의 `ReviewWriteScreen`을 재사용하며, `editReviewId`/`initialReview`가 주어지면 PATCH 모드로 분기된다(앱바 타이틀 "리뷰 수정", 버튼 라벨 "수정", 폼 prefill).
- 삭제는 `AppDialog.confirm("리뷰를 삭제할까요?")` → 확인 시 `ReviewDeleteNotifier`로 DELETE 호출.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/11_review_report/F11-03_review-edit-delete/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/11_review_report/F11-03_review-edit-delete/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/11_review_report/F11-03_review-edit-delete/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/11_review_report/F11-03_review-edit-delete/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/review/controller/ReviewController.java:51` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/ReviewController.java:60` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **수정 트리거**: 본인 카드의 더보기 → 시트 → "수정" 탭 → `Routes.reviewEditPath(review.id)` push (`extra: review`) → `ReviewWriteScreen` (edit 모드) → `ReviewEditNotifier(reviewId).updateReview(rating, content)` → `ReviewRepository.updateReview(id, ReviewParam)` → `PATCH /api/v1/reviews/:id`.
2. **삭제 트리거**: 본인 카드의 더보기 → 시트 → "삭제" 탭 → `AppDialog.confirm` → 확인 시 `ReviewDeleteNotifier.deleteReview(id)` → `ReviewRepository.deleteReview(id)` → `DELETE /api/v1/reviews/:reviewId`.
3. **목록 invalidate**: 두 작업 모두 성공 후 호출자(`_EventReviewList` / `_UserReviewList`)에서 `ref.invalidate(eventReviewListNotifierProvider(eventId))` 또는 `ref.invalidate(userReviewListNotifierProvider(userId))`로 새로 fetch.
4. 수정 결과 응답에서 `isEdited`(JSON `edited`)가 true이면 `ReviewCard`가 `(수정됨)` 라벨을 노출.

## 4. 서버 계약

### 개요

본인이 작성한 단일 리뷰를 수정(PATCH)하거나 삭제(DELETE, soft delete)하는 두 엔드포인트다. 두 작업 모두 호출자(`@AuthenticationPrincipal`)와 `Review.reviewerId` 일치 검증, 삭제는 `deletedAt`을 현재 시각으로 채우는 soft delete이며, 수정은 변경 직전 값을 `ReviewEditHistory`에 보관하고 5회를 초과해 수정할 수 없다. 두 작업 모두 끝나면 `TrustScoreService.recalculate(revieweeId)`를 호출해 평가 대상자의 신뢰점수가 다시 산정된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| PATCH | `/api/v1/reviews/{id}` | `ReviewController#updateReview` | required | 수정 이력 기록 + rating/content 갱신 + 신뢰점수 재계산 |
| DELETE | `/api/v1/reviews/{reviewId}` | `ReviewController#deleteReview` | required | soft delete + 신뢰점수 재계산 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `Review` (재사용): `deletedAt` 필드로 soft delete 표현, `isEdited` 플래그.
- **Entity** `ReviewEditHistory` (`review/model/ReviewEditHistory.java`): 수정 이력 보관용.
  - 핵심 필드: `id`, `reviewId`, `previousRating`, `previousContent`, `createdAt`
  - 한 리뷰당 최대 5개. 한도 초과 시 더 이상 수정 불가.
- 본 기능 전용 enum 없음.

### 의존 단위 / 외부 시스템

- **F11-01**: 같은 `Review` 엔티티 라이프사이클 일부.
- **F11-05**: 두 작업 모두 `TrustScoreService.recalculate`를 통해 점수에 영향. 점수 변동이 ≥ 1.0이면 `ScoreHistoryService`가 스냅샷을 추가.
- 본 단위 안에서 클라이언트 화면은 별도 전용 화면 없이 리뷰 목록(F11-02) 또는 마이페이지 리뷰 영역에서 트리거된다. 현재 Flutter 코드에는 PATCH/DELETE 호출 경로(Repository 메서드)는 존재하나 화면 전용 UI는 미구현 상태.

## 5. 프론트 계약

### 진입 경로

- F11-02 리뷰 목록(`review_list_screen.dart`)에서 본인이 작성한 리뷰 카드의 우상단 더보기(`more_vert`) 메뉴를 통해 트리거된다.
- 마이페이지의 "내 리뷰" 영역(`/profile/my-reviews` → 동일 `ReviewListScreen`을 `userId`로 진입)에서도 동일 메뉴가 노출된다 — `_resolveCurrentUserId(ref)`로 `authNotifierProvider`의 사용자 id를 읽어 `review.reviewerId`와 일치할 때만 `onEdit`/`onDelete` 콜백을 전달.
- 수정 흐름은 F11-01의 `ReviewWriteScreen`을 재사용하며, `editReviewId`/`initialReview`가 주어지면 PATCH 모드로 분기된다(앱바 타이틀 "리뷰 수정", 버튼 라벨 "수정", 폼 prefill).
- 삭제는 `AppDialog.confirm("리뷰를 삭제할까요?")` → 확인 시 `ReviewDeleteNotifier`로 DELETE 호출.

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/reviews/:reviewId/edit` | `presentation/review/screens/review_write_screen.dart` (재사용, edit 모드) | 본인 리뷰 수정 폼 |
| (라우트 없음, 인라인 처리) | `presentation/review/screens/review_list_screen.dart`의 `_confirmAndDeleteReview` | 삭제 확인 다이얼로그 + DELETE 호출 |
| (트리거) | `presentation/review/widgets/review_card.dart` (`onEdit`/`onDelete` 콜백) | 본인 리뷰 카드의 더보기 → 바텀시트(수정/삭제) |

`Routes.reviewEdit = '/reviews/:reviewId/edit'`, 헬퍼 `Routes.reviewEditPath(reviewId)` 추가됨.
`AppRouter`의 `reviewEdit` GoRoute는 `state.extra`로 `ReviewVo`를 받아 `ReviewWriteScreen.initialReview`로 prefill한다.

### 화면별 구성 요소 & 액션

### 본인 리뷰 카드 (`ReviewCard`)

- **사용자가 보는 것**: 본인이 작성한 리뷰의 카드 우상단에 `more_vert`(케밥) 아이콘 버튼.
  - 본인이 아닌 리뷰: 기존대로 깃발(`flag_outlined`) — 신고(F11-04) 트리거.
  - `isEdited`가 true이면 닉네임 옆에 `(수정됨)` 라벨이 caption 스타일로 표시됨.
- **사용자가 할 수 있는 액션**:
  - 더보기 → `showModalBottomSheet`로 시트 노출 → `수정` / `삭제` 항목 (각각 `onEdit`/`onDelete`가 주어진 경우에만 노출).
  - `수정` 탭 → `Routes.reviewEditPath(review.id)`로 push, `extra`에 `ReviewVo` 전달.
  - `삭제` 탭 → `_confirmAndDeleteReview` (확인 다이얼로그 → `ReviewDeleteNotifier.deleteReview` → 토스트 + 목록 invalidate).

### 리뷰 수정 화면 (`ReviewWriteScreen`, edit 모드)

- `editReviewId`/`initialReview`가 주어진 경우 다음과 같이 분기:
  - 앱바 타이틀: `리뷰 수정`
  - 버튼 라벨: `수정`
  - 별점/내용 폼이 `initialReview` 값으로 prefill
  - 제출 시 `ReviewEditNotifier(reviewId).updateReview(rating, content)` 호출 → PATCH `/api/v1/reviews/{id}`
  - 성공 토스트 `리뷰가 수정되었습니다` → `context.pop(true)` (목록은 호출자에서 invalidate)
- 에러 분기 (`ApiError.when`):

  | 케이스 | 처리 |
  |---|---|
  | 200 (수정 성공) | "리뷰가 수정되었습니다" 토스트 → `context.pop(true)` → 목록 invalidate |
  | 204 (삭제 성공) | "리뷰가 삭제되었습니다" 토스트 → 목록 invalidate |
  | 401 unauthorized | "권한이 없습니다" |
  | 403 forbidden (`REVIEW_NOT_OWNER`) | "본인 리뷰만 수정/삭제할 수 있습니다" |
  | 404 notFound | "리뷰를 찾을 수 없습니다" + `pop` 또는 invalidate (목록에서 제거) |
  | 400 badRequest (`REVIEW_EDIT_LIMIT_EXCEEDED` / 700013) | "리뷰 수정 한도(5회)를 초과했습니다" |
  | 그 외 | 표준 에러 토스트 (network/server/unknown) |

### API 호출 순서 (Provider/Repository 관점)

1. **수정 트리거**: 본인 카드의 더보기 → 시트 → "수정" 탭 → `Routes.reviewEditPath(review.id)` push (`extra: review`) → `ReviewWriteScreen` (edit 모드) → `ReviewEditNotifier(reviewId).updateReview(rating, content)` → `ReviewRepository.updateReview(id, ReviewParam)` → `PATCH /api/v1/reviews/:id`.
2. **삭제 트리거**: 본인 카드의 더보기 → 시트 → "삭제" 탭 → `AppDialog.confirm` → 확인 시 `ReviewDeleteNotifier.deleteReview(id)` → `ReviewRepository.deleteReview(id)` → `DELETE /api/v1/reviews/:reviewId`.
3. **목록 invalidate**: 두 작업 모두 성공 후 호출자(`_EventReviewList` / `_UserReviewList`)에서 `ref.invalidate(eventReviewListNotifierProvider(eventId))` 또는 `ref.invalidate(userReviewListNotifierProvider(userId))`로 새로 fetch.
4. 수정 결과 응답에서 `isEdited`(JSON `edited`)가 true이면 `ReviewCard`가 `(수정됨)` 라벨을 노출.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 수정 화면의 "수정" 버튼 라벨 vs F11-01의 "제출" — `widget.isEditMode`로 분기.
- 삭제 시 확인 다이얼로그 카피: 제목 `리뷰를 삭제할까요?`, 메시지 `삭제된 리뷰는 복구할 수 없습니다.`, 확인 `삭제`(danger), 취소 `취소`.
- 본인 카드 식별: 클라이언트에서 `authNotifierProvider`의 user id와 `review.reviewerId` 비교.
- `(수정됨)` 라벨: `ReviewVo.isEdited`(JSON `edited`)가 true일 때 닉네임 옆에 caption으로 노출.
- 삭제 후 정책: invalidate 후 재로드 (옵티미스틱 미적용).

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 본인 리뷰 수정 (Happy Path) | `Review` 존재(`reviewerId == 본인`), `deleted_at IS NULL`, 수정 이력 0회. | review.rating=5, is_edited=true, review_edit_history 1건, 점수 변동 시 score_snapshot 추가. |
| S2 | 5회 한도 도달 | `review_edit_history` 5건 존재. | review/이력 변동 없음. |
| S3 | 타인의 리뷰를 수정하려 함 | 호출 사용자 ≠ `review.reviewerId`. | 변동 없음. |
| S4 | 본인 리뷰 삭제 (Happy Path) | 본인 리뷰 존재. | review.deleted_at 채움, 조회에서 제외, 신뢰점수 재계산. |
| S5 | 타인 리뷰 삭제 시도 | 권한 없는 호출. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 이미 삭제된 리뷰 재호출 | `/reviews?eventId=1301` 진입 직후 본인 리뷰 카드 노출, `is_edited=false`. | 변동 없음. 목록이 갱신되며 사라진 카드가 화면에서도 제거. |

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
| 후보 | backend.md:86 | - 본 단위 안에서 클라이언트 화면은 별도 전용 화면 없이 리뷰 목록(F11-02) 또는 마이페이지 리뷰 영역에서 트리거된다. 현재 Flutter 코드에는 PATCH/DELETE 호출 경로(Repository 메서드)는 존재하나 화면 전용 UI는 미구현 상태. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:81 | - 삭제 후 옵티미스틱 제거는 미구현(서버 invalidate 후 재로드 정책). 큰 목록에서 깜빡임이 보이면 `OptimisticUpdate` 유틸리티로 보강 가능. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:9 | 1. F11-02 리뷰 목록에서 본인 카드의 "수정" 액션 (UI 미구현, 흐름 가정) 탭 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 본인 리뷰 수정 (Happy Path)**: Given `Review` 존재(`reviewerId == 본인`), `deleted_at IS NULL`, 수정 이력 0회. When 사용자가 해당 흐름을 실행하면 Then review.rating=5, is_edited=true, review_edit_history 1건, 점수 변동 시 score_snapshot 추가.
- **AC-02. 5회 한도 도달**: Given `review_edit_history` 5건 존재. When 사용자가 해당 흐름을 실행하면 Then review/이력 변동 없음.
- **AC-03. 타인의 리뷰를 수정하려 함**: Given 호출 사용자 ≠ `review.reviewerId`. When 사용자가 해당 흐름을 실행하면 Then 변동 없음.
- **AC-04. 본인 리뷰 삭제 (Happy Path)**: Given 본인 리뷰 존재. When 사용자가 해당 흐름을 실행하면 Then review.deleted_at 채움, 조회에서 제외, 신뢰점수 재계산.
- **AC-05. 타인 리뷰 삭제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 이미 삭제된 리뷰 재호출**: Given `/reviews?eventId=1301` 진입 직후 본인 리뷰 카드 노출, `is_edited=false`. When 사용자가 해당 흐름을 실행하면 Then 변동 없음. 목록이 갱신되며 사라진 카드가 화면에서도 제거.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
