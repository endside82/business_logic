# F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- updated: 2026-06-05; delta: 2026-06-04 dossier 04 §4-3 반영 (ReviewVo 5 신규 필드, 호스트 모더레이션 CTA, 숨김 표시) -->

## 1. 결론

이벤트 단위 또는 사용자 단위로 작성·수신된 리뷰 목록을 단일 리스트로 반환하는 두 개의 GET 엔드포인트다. 응답은 페이지 응답이 아닌 단순 `List<ReviewVo>`이며, 평균 별점·총 개수·별점 분포는 클라이언트가 응답으로부터 산출한다. N+1 방지를 위해 `Review.reviewerId` 집합에 대해 한 번에 사용자 기본정보를 조회(`UserService.getUserBasicInfoMap`)한 뒤 매퍼가 닉네임/이미지 필드를 채워준다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03 도메인)의 "리뷰" 탭/액션 → `context.push('/reviews?eventId=$id')`
- 사용자 프로필(F-프로필)의 "리뷰" 탭 → `context.push('/reviews?userId=$id')`
- F11-01 리뷰 작성 완료 후 호출자가 invalidate 또는 push로 이동

`ReviewListScreen`은 `eventId` 또는 `userId` 둘 중 하나만 받으며 둘 다 null이면 assert 실패.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ReviewController`, `ReviewVo`, `ReviewService`, `UserService`. 앱: `review_list_screen.dart`, `routes.dart`, `review_card.dart`.

<!-- source-references:start -->
서버 창구: `ReviewController#getReviewsByEvent`, `ReviewController#getReviewsByUser`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 2026-10-29 현재 계약 대조

### 삭제한 리뷰의 재작성은 허용하지 않습니다

삭제한 리뷰도 작성 여부 판정에 포함한다. 화면의 작성 입구와 서버의 중복 판정을 맞춰 같은 모임·대상에 다시 작성할 수 있다고 안내하지 않는다.

기존 설계 중 이 규칙과 다른 서술은 아래 현재 계약을 기준으로 정정한다. 운영·실기기 완료 판정은 [현재 출시 상태표](../../../docs/qa/launch-status.html)를 따른다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-11-01에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `GET /api/v1/events/{eventId}/reviews` | `ReviewController#getReviewsByEvent` | [ReviewController.java:44](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/review/controller/ReviewController.java#L44) |
| `GET /api/v1/users/{userId}/reviews` | `ReviewController#getReviewsByUser` | [ReviewController.java:52](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/review/controller/ReviewController.java#L52) |
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 이벤트별 진입: `eventReviewListNotifierProvider(eventId)` watch
   → `ReviewRepository.getReviewsByEvent(eventId)`
   → `ReviewApi.getReviewsByEvent` (`GET /api/v1/events/{eventId}/reviews`)
   → 성공: `List<ReviewVo>`. 클라이언트가 `totalCount`/`avgRating`/`distribution` 계산.
2. 사용자별 진입: `userReviewListNotifierProvider(userId)` watch
   → `ReviewRepository.getReviewsByUser(userId)`
   → `ReviewApi.getReviewsByUser` (`GET /api/v1/users/{userId}/reviews`)
   → 성공: `List<ReviewVo>`. `distribution` 미사용.
3. 풀투리프레시: 각 provider invalidate → 빌드 함수 재실행 → 동일 GET 재호출.
4. 신고 클릭: F11-04 라우트로 push (별도 API 호출은 신고 화면에서 발생).

## 4. 제품 규칙

- 이벤트별 목록은 누구나 볼 수 있고, 사용자별 목록은 그 사용자가 받은 후기만 보여 준다. 삭제된 후기는 나오지 않는다.
- 한 번에 전체를 받고 쪽 나누기는 없다. 평균 별점과 별점 분포는 앱이 받은 목록으로 계산하며, 분포 막대는 이벤트별 목록에만 있다.
- 정렬 선택은 아직 없고 서버가 주는 순서를 따른다.
- 임시 숨김된 후기는 본문 대신 숨김 안내와 사유 배지를 보여 준다. 호스트 답변이 있으면 후기 아래에 답변 카드가 붙는다.
- 신고 아이콘은 이벤트별 목록에서만 보인다. 후기를 받은 호스트에게만 답변·숨김 메뉴가 보인다.
- 목록은 아래로 당겨 새로 고친다. 후기가 없으면 빈 상태 안내가 나온다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 이벤트 상세에서 리뷰 탭 진입 (Happy Path · 이벤트별) | 이벤트에 작성된 리뷰가 N건 존재. | 화면이 데이터로 채워짐. 사용자는 스크롤하거나 신고/뒤로 액션 가능. |
| S2 | 풀투리프레시 | 리뷰 작성(F11-01) 직후 목록 화면에 복귀. | 리스트 갱신, 평균/분포 재계산. |
| S3 | 빈 상태 — 아직 리뷰가 없는 이벤트 | `review` 테이블에 해당 이벤트로 작성된 행 없음. | 화면에 빈 상태만 노출. 사용자는 뒤로가기. |
| S4 | 리뷰 카드의 신고 아이콘 탭 (이벤트별 모드 한정) | 이벤트별 모드에서 리뷰 카드가 보이는 상태. | 신고 화면으로 이동 (이 시나리오에서 신고 자체는 F11-04에서 다룸). |
| S5 | 사용자 프로필에서 받은 리뷰 보기 | 프로필의 "리뷰" 탭 진입. | 화면이 채워짐. |
| S6 | 에러 — 서버 500 | 진입. | 정상 응답이 오면 데이터 화면으로 전환, 실패 지속 시 에러 화면 유지. |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| Gap | 정렬 기능 미구현 | `review_list_screen.dart` — "최신순 ▼" 라벨은 있으나 동작 없음. 서버도 정렬 파라미터 미노출. | 사용자가 정렬 탭을 눌러도 아무 변화 없음. 서버 응답 순서에 의존. | 정렬 기능 추가 여부 결정 필요. 현재는 UX 불편 수준. |
| Gap | 호스트 답변 수정 UI 미배선 | `review_list_screen.dart:347` — `review.reply != null`일 때 더보기에서 수정(PUT /reply) 경로 없음. 항상 createReply 호출 → 서버에서 `REVIEW_REPLY_ALREADY_EXISTS(409)` 발생. | 호스트가 답변 수정을 시도하면 409 에러 발생. | F11-07 참조. review_list_screen에서 reply 존재 시 updateReply 분기 추가 필요. |

## 9. 수용 기준

- **AC-01. 이벤트 상세에서 리뷰 탭 진입 (Happy Path · 이벤트별)**: Given 이벤트에 작성된 리뷰가 N건 존재. When 사용자가 해당 흐름을 실행하면 Then 화면이 데이터로 채워짐. 사용자는 스크롤하거나 신고/뒤로 액션 가능.
- **AC-02. 풀투리프레시**: Given 리뷰 작성(F11-01) 직후 목록 화면에 복귀. When 사용자가 해당 흐름을 실행하면 Then 리스트 갱신, 평균/분포 재계산.
- **AC-03. 빈 상태 — 아직 리뷰가 없는 이벤트**: Given `review` 테이블에 해당 이벤트로 작성된 행 없음. When 사용자가 해당 흐름을 실행하면 Then 화면에 빈 상태만 노출. 사용자는 뒤로가기.
- **AC-04. 리뷰 카드의 신고 아이콘 탭 (이벤트별 모드 한정)**: Given 이벤트별 모드에서 리뷰 카드가 보이는 상태. When 사용자가 해당 흐름을 실행하면 Then 신고 화면으로 이동 (이 시나리오에서 신고 자체는 F11-04에서 다룸).
- **AC-05. 사용자 프로필에서 받은 리뷰 보기**: Given 프로필의 "리뷰" 탭 진입. When 사용자가 해당 흐름을 실행하면 Then 화면이 채워짐.
- **AC-06. 에러 — 서버 500**: Given 진입. When 사용자가 해당 흐름을 실행하면 Then 정상 응답이 오면 데이터 화면으로 전환, 실패 지속 시 에러 화면 유지.
