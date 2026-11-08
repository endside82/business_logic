# F08-13. 구매 플랜 이벤트 생성 / 리뷰 작성 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

구매 후 활용을 도와주는 두 갈래의 흐름:
1. **이벤트 생성**: 구매한 플랜을 토대로 실제 모임 이벤트(`Event`)를 생성하여 다른 사용자를 모집할 수 있게 한다 (Unit 03 이벤트로 제어 위임).
2. **리뷰 작성/수정/삭제**: 사용한 플랜에 대해 1~5점 평점과 본문을 남겨 마켓 정보 품질을 높인다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

### 이벤트 생성
- 구매한 플랜의 상세/미리보기(`plan_detail_screen.dart` / `plan_preview_screen.dart`) "이 플랜으로 이벤트 만들기" 버튼
- 라우터: `Routes.planList` 하위의 `:planId/create-event` (modal `fullscreenDialog: true`)
- 진입 시 자동 prefill (플랜 정보로 기본값 채움)

### 리뷰 작성/수정/삭제
- F08-10 마켓 아이템 상세 (`market_item_detail_screen.dart`) 리뷰 섹션 "리뷰 작성" 텍스트 버튼
- 본인 리뷰 카드의 PopupMenuButton "수정"/"삭제"

## 2. 코드 위치

계약의 정본은 코드다. 서버: `PlanController`, `MarketItemReviewController`. 앱: `plan_detail_screen.dart`, `plan_preview_screen.dart`, `market_item_detail_screen.dart`, `plan_event_create_screen.dart`, `market_review_write_dialog.dart`.

<!-- source-references:start -->
서버 창구: `PlanController#createEventFromPlan`, `MarketItemReviewController#createReview`, `MarketItemReviewController#updateReview`, `MarketItemReviewController#deleteReview`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 이벤트 생성
1. 화면 진입 시: `planDetailNotifierProvider(planId)` ▶ `GET /api/v1/plans/{planId}` (구매 여부 등 메타 포함)
2. 응답 후 `_applyPrefill(plan)` 1회 실행
3. 사용자 "이벤트 생성" 탭: `PlanRepository.createEventFromPlan(planId, PlanEventAddParam)` ▶ `POST /api/v1/plans/{planId}/create-event`
4. 성공 시 `context.go('/home/events/${eventId}')` — Unit 03 이벤트 상세로 navigate (이벤트는 `DRAFT` 상태로 생성됨, Unit 03에서 모집 공개 등 이어서 처리)

### 리뷰 작성/수정/삭제
1. 다이얼로그 → `MarketItemReviewsNotifier.createReview/updateReview/deleteReview` 호출
2. Repository → Retrofit `POST/PUT/DELETE`
3. 성공 시 `ref.invalidateSelf()` 또는 `state = AsyncData([...])` 갱신
4. 후기를 쓰거나 지우면 상세를 다시 읽어 평균 평점과 쓰기 단추가 바로 바뀐다. 고친 뒤에는 다시 읽지 않는다

## 4. 제품 규칙

- 리뷰는 구매한 사람만 쓸 수 있고(MARKET_REVIEW_PURCHASE_REQUIRED) 아이템당 1개다(MARKET_REVIEW_ALREADY_EXISTS). 평점 1~5 는 필수, 내용은 선택이며 500자까지다. 수정과 삭제는 쓴 사람만 된다.
- 앱 문구: 중복은 "이미 리뷰를 작성했습니다", 미구매는 "구매한 후에만 리뷰를 작성할 수 있습니다". 고친 리뷰에는 "(수정됨)"을 붙인다. 평균 평점은 다음 진입 때 갱신된다.
- 플랜으로 만든 이벤트는 DRAFT 로 시작하고 상세 화면에서 이어 간다. 모임을 여는 다른 경로와 같은 호스트 심사 통과를 요구한다. 일시는 필수다.
- 플랜 값으로 처음 한 번 채운다: 모집 인원(없으면 10)과 주소. 참가비는 받지 않는다(앱은 보내지 않고, 참가비가 있으면 서버가 거절한다). 사용자가 고친 값은 덮어쓰지 않는다.
- 플랜으로 만드는 모임은 한 번짜리다. 반복 일정은 만든 모임 상세의 반복 일정 만들기에서 따로 만든다. 공개 범위는 PUBLIC 또는 PRIVATE, 장소는 OFFLINE 또는 ONLINE 이다.

## 6. 상태/권한/시나리오 매트릭스

> `scenarios.md`에서 `S1` 형식의 시나리오를 찾지 못했다. QA 수용 기준을 별도 작성해야 한다.

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 모임 만들기 값 검사 | 플랜으로 모임을 만들 때 공개 범위와 장소 종류가 비었거나 정해진 값이 아니면 잘못된 입력(400)으로 거절한다. 대소문자와 앞뒤 공백은 가리지 않는다 | 없음 |
| 해소됨 | 후기 뒤 평균 평점 | 서버는 후기를 쓰고 고치고 지울 때 다른 일을 하지 않고, 평균 평점과 후기 수는 상세를 읽을 때마다 지워지지 않은 후기로 새로 센다. 앱은 후기를 쓰거나 지운 뒤 상세를 다시 읽는다. 고친 뒤에는 다시 읽지 않아 평균이 다음 진입 때 바뀐다 | 없음 |

## 9. 수용 기준

- 시나리오 원천 문서가 비어 있으므로 수용 기준을 확정할 수 없다.
