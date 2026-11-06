# F11-03. 리뷰 수정 & 삭제 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

본인이 작성한 단일 리뷰를 수정(PATCH)하거나 삭제(DELETE, soft delete)하는 두 엔드포인트다. 두 작업 모두 호출자(`@AuthenticationPrincipal`)와 `Review.reviewerId` 일치 검증, 삭제는 `deletedAt`을 현재 시각으로 채우는 soft delete이며, 수정은 변경 직전 값을 `ReviewEditHistory`에 보관하고 5회를 초과해 수정할 수 없다. 두 작업 모두 끝나면 `TrustScoreService.recalculate(revieweeId)`를 호출해 평가 대상자의 신뢰점수가 다시 산정된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- F11-02 리뷰 목록(`review_list_screen.dart`)에서 본인이 작성한 리뷰 카드의 우상단 더보기(`more_vert`) 메뉴를 통해 트리거된다.
- 마이페이지의 "내 리뷰" 영역(`/profile/my-reviews` → 동일 `ReviewListScreen`을 `userId`로 진입)에서도 동일 메뉴가 노출된다 — `_resolveCurrentUserId(ref)`로 `authNotifierProvider`의 사용자 id를 읽어 `review.reviewerId`와 일치할 때만 `onEdit`/`onDelete` 콜백을 전달.
- 수정 흐름은 F11-01의 `ReviewWriteScreen`을 재사용하며, `editReviewId`/`initialReview`가 주어지면 PATCH 모드로 분기된다(앱바 타이틀 "리뷰 수정", 버튼 라벨 "수정", 폼 prefill).
- 삭제는 `AppDialog.confirm("리뷰를 삭제할까요?")` → 확인 시 `ReviewDeleteNotifier`로 DELETE 호출.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ReviewController`, `ReviewEditHistory`, `TrustScoreService`, `ScoreHistoryService`. 앱: `review_list_screen.dart`, `review_write_screen.dart`, `review_card.dart`.

<!-- source-references:start -->
서버 창구: `ReviewController#updateReview`, `ReviewController#deleteReview`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **수정 트리거**: 본인 카드의 더보기 → 시트 → "수정" 탭 → `Routes.reviewEditPath(review.id)` push (`extra: review`) → `ReviewWriteScreen` (edit 모드) → `ReviewEditNotifier(reviewId).updateReview(rating, content)` → `ReviewRepository.updateReview(id, ReviewParam)` → `PATCH /api/v1/reviews/:id`.
2. **삭제 트리거**: 본인 카드의 더보기 → 시트 → "삭제" 탭 → `AppDialog.confirm` → 확인 시 `ReviewDeleteNotifier.deleteReview(id)` → `ReviewRepository.deleteReview(id)` → `DELETE /api/v1/reviews/:reviewId`.
3. **목록 invalidate**: 두 작업 모두 성공 후 호출자(`_EventReviewList` / `_UserReviewList`)에서 `ref.invalidate(eventReviewListNotifierProvider(eventId))` 또는 `ref.invalidate(userReviewListNotifierProvider(userId))`로 새로 fetch.
4. 수정 결과 응답에서 `isEdited`(JSON `edited`)가 true이면 `ReviewCard`가 `(수정됨)` 라벨을 노출.

## 4. 제품 규칙

- 수정과 삭제는 쓴 사람 본인만 할 수 있다. 남의 후기는 거절된다.
- 수정은 한 후기당 최대 5번이다. 수정 전 값은 이력으로 남고, 수정한 후기에는 닉네임 옆에 `(수정됨)` 이 붙는다. 남은 횟수는 수정 화면에 보인다.
- 삭제하면 목록에서 사라지고 복구되지 않는다(삭제 전 확인 창에 같은 안내). 삭제 뒤 같은 모임에 다시 쓸 수 없다.
- 수정과 삭제 모두 호스트의 신뢰점수를 다시 계산한다. 클럽 마일리지가 켜진 클럽 모임의 후기라면 삭제 때 그 적립이 회수된다.
- 본인 후기 카드에는 신고 대신 더보기(수정, 삭제)가 보인다. 마이페이지의 내 후기 목록에서도 같다.
- 한도를 넘기면 수정할 수 없다는 안내가 나오고, 후기가 이미 없으면 목록에서 제거한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 본인 리뷰 수정 (Happy Path) | `Review` 존재(`reviewerId == 본인`), `deleted_at IS NULL`, 수정 이력 0회. | review.rating=5, is_edited=true, review_edit_history 1건, 점수 변동 시 score_snapshot 추가. |
| S2 | 5회 한도 도달 | `review_edit_history` 5건 존재. | review/이력 변동 없음. |
| S3 | 타인의 리뷰를 수정하려 함 | 호출 사용자 ≠ `review.reviewerId`. | 변동 없음. |
| S4 | 본인 리뷰 삭제 (Happy Path) | 본인 리뷰 존재. | review.deleted_at 채움, 조회에서 제외, 신뢰점수 재계산. |
| S5 | 타인 리뷰 삭제 시도 | 권한 없는 호출. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 이미 삭제된 리뷰 재호출 | `/reviews?eventId=1301` 진입 직후 본인 리뷰 카드 노출, `is_edited=false`. | 변동 없음. 목록이 갱신되며 사라진 카드가 화면에서도 제거. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:81 | - 삭제 후 옵티미스틱 제거는 미구현(서버 invalidate 후 재로드 정책). 큰 목록에서 깜빡임이 보이면 `OptimisticUpdate` 유틸리티로 보강 가능. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 본인 리뷰 수정 (Happy Path)**: Given `Review` 존재(`reviewerId == 본인`), `deleted_at IS NULL`, 수정 이력 0회. When 사용자가 해당 흐름을 실행하면 Then review.rating=5, is_edited=true, review_edit_history 1건, 점수 변동 시 score_snapshot 추가.
- **AC-02. 5회 한도 도달**: Given `review_edit_history` 5건 존재. When 사용자가 해당 흐름을 실행하면 Then review/이력 변동 없음.
- **AC-03. 타인의 리뷰를 수정하려 함**: Given 호출 사용자 ≠ `review.reviewerId`. When 사용자가 해당 흐름을 실행하면 Then 변동 없음.
- **AC-04. 본인 리뷰 삭제 (Happy Path)**: Given 본인 리뷰 존재. When 사용자가 해당 흐름을 실행하면 Then review.deleted_at 채움, 조회에서 제외, 신뢰점수 재계산.
- **AC-05. 타인 리뷰 삭제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 이미 삭제된 리뷰 재호출**: Given `/reviews?eventId=1301` 진입 직후 본인 리뷰 카드 노출, `is_edited=false`. When 사용자가 해당 흐름을 실행하면 Then 변동 없음. 목록이 갱신되며 사라진 카드가 화면에서도 제거.
