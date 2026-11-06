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
4. 클라이언트 별도 `marketItemDetailNotifierProvider` invalidate는 안 함 (avgRating은 다음 진입 시 갱신)

## 4. 제품 규칙

- 리뷰는 구매한 사람만 쓸 수 있고(MARKET_REVIEW_PURCHASE_REQUIRED) 아이템당 1개다(MARKET_REVIEW_ALREADY_EXISTS). 평점 1~5 는 필수, 내용은 선택이며 500자까지다. 수정과 삭제는 쓴 사람만 된다.
- 앱 문구: 중복은 "이미 리뷰를 작성했습니다", 미구매는 "구매한 후에만 리뷰를 작성할 수 있습니다". 고친 리뷰에는 "(수정됨)"을 붙인다. 평균 평점은 다음 진입 때 갱신된다.
- 플랜으로 만든 이벤트는 DRAFT 로 시작하고 상세 화면에서 이어 간다. 모임을 여는 다른 경로와 같은 호스트 심사 통과를 요구한다. 일시는 필수다.
- 플랜 값으로 처음 한 번 채운다: 모집 인원(없으면 10), 참가비(없으면 0), 주소. 사용자가 고친 값은 덮어쓰지 않는다.
- 반복은 매주, 격주, 매월이고 켜면 매주가 기본이다. 종료일은 선택이며 시작일부터 3년 안이다. 공개 범위는 PUBLIC 또는 PRIVATE, 장소는 OFFLINE 또는 ONLINE 이다.

## 6. 상태/권한/시나리오 매트릭스

> `scenarios.md`에서 `S1` 형식의 시나리오를 찾지 못했다. QA 수용 기준을 별도 작성해야 한다.

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:63 | - 잘못된 enum 값 → 400 (EnumUtils.parseEnum 동작 — 구체 분기 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:95 | - **사이드 이펙트**: 없음 (avgRating 캐시 무효화 등은 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- 시나리오 원천 문서가 비어 있으므로 수용 기준을 확정할 수 없다.
