# F08-13. 구매 플랜 이벤트 생성 / 리뷰 작성 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-13_plan-event-and-review -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-13_plan-event-and-review`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

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

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-13_plan-event-and-review/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-13_plan-event-and-review/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-13_plan-event-and-review/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-13_plan-event-and-review/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemReviewController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemReviewController.java:42` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemReviewController.java:51` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:129` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

구매 후 활용을 도와주는 두 갈래의 흐름:
1. **이벤트 생성**: 구매한 플랜을 토대로 실제 모임 이벤트(`Event`)를 생성하여 다른 사용자를 모집할 수 있게 한다 (Unit 03 이벤트로 제어 위임).
2. **리뷰 작성/수정/삭제**: 사용한 플랜에 대해 1~5점 평점과 본문을 남겨 마켓 정보 품질을 높인다.

본 단위는 두 흐름의 진입 컨트롤러까지만 정의하고, 이벤트 도메인 처리는 Unit 03에 위임한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/plans/{planId}/create-event | PlanController#createEventFromPlan | required | 구매한 플랜으로 이벤트 생성 (Unit 03 위임) |
| POST | /api/v1/market/items/{itemId}/reviews | MarketItemReviewController#createReview | required | 마켓 아이템 리뷰 작성 |
| PUT | /api/v1/market/items/{itemId}/reviews/{reviewId} | MarketItemReviewController#updateReview | required | 본인 리뷰 수정 |
| DELETE | /api/v1/market/items/{itemId}/reviews/{reviewId} | MarketItemReviewController#deleteReview | required | 본인 리뷰 삭제 (soft delete) |

### 도메인 모델 / Enum (이 기능 관련)

- **VO** `PlanEventResponseVo`: `eventId`, `planId`, `title`, `startTime`, `status`
- **Param** `PlanEventAddParam`: 위 요청 섹션 참조
- **Param** `ItemReviewParam`: `rating: Integer (1~5)`, `content: String? (max 500)`
- **VO** `ItemReviewVo`: F08-10 참조
- **Unit 03 Enum 위임**: `EventStatus`, `EventVisibility`, `LocationType`, `Category`, `EventType` — 본 단위에서 정의하지 않음

### 의존 단위 / 외부 시스템

- **Unit 03 이벤트** (필수):
  - `EventRepository`, `EventRecurrenceRepository`로 Event/EventRecurrence 저장
  - 생성된 `eventId`는 Unit 03 화면에서 후속 처리 (모집 공개, QR, 정산 등)
  - `EnumUtils.parseEnum`으로 visibility/locationType 매핑
- **Unit 01 인증**: `@AuthenticationPrincipal UserPrincipal` 필수
- **F08-12 (컬렉션)**: 리뷰 작성 권한 체크는 `Collection` 존재 여부로 결정 (구매한 사용자만 리뷰 가능)
- **Unit 11 리뷰·신고** (간접): 마켓 아이템 리뷰 자체는 본 단위(`item_review`)에서 처리하지만, 리뷰 신고 흐름은 Unit 11 호출
- 외부 PG/FCM 호출 없음

## 5. 프론트 계약

### 진입 경로

### 이벤트 생성
- 구매한 플랜의 상세/미리보기(`plan_detail_screen.dart` / `plan_preview_screen.dart`) "이 플랜으로 이벤트 만들기" 버튼
- 라우터: `Routes.planList` 하위의 `:planId/create-event` (modal `fullscreenDialog: true`)
- 진입 시 자동 prefill (플랜 정보로 기본값 채움)

### 리뷰 작성/수정/삭제
- F08-10 마켓 아이템 상세 (`market_item_detail_screen.dart`) 리뷰 섹션 "리뷰 작성" 텍스트 버튼
- 본인 리뷰 카드의 PopupMenuButton "수정"/"삭제"

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/plan/:planId/create-event` (fullscreen modal) | `presentation/plan/screens/plan_event_create_screen.dart` | 플랜 기반 이벤트 생성 |
| `/market/items/:itemId` | `presentation/market/screens/market_item_detail_screen.dart` 의 리뷰 섹션 | 리뷰 작성/수정/삭제 진입점 |
| (다이얼로그) | `presentation/market/widgets/market_review_write_dialog.dart` | 리뷰 평점/본문 입력 다이얼로그 |

### 화면별 구성 요소 & 액션

### 플랜 이벤트 생성 (`plan_event_create_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '이벤트 만들기')` (모달 풀스크린)
  - 기반 플랜 카드 (background `AppColors.primary50`):
    - "기반 플랜" 라벨 (primary600)
    - 플랜 제목 (body1Medium)
    - 플랜 설명 max 2 lines ellipsis
  - "일시 *" 필드 — `InkWell` → `showDatePicker` + `showTimePicker`
    - 표시 포맷: `yyyy.MM.dd (E) HH:mm` (한국어)
  - "모집 인원" `AppTextInput` (numeric, default "10", plan.maxParticipants 있으면 prefill)
  - "참가비 (원)" `AppTextInput` (numeric, default "0", plan.price 있으면 prefill)
  - "반복 이벤트" `SwitchListTile.adaptive`
    - 활성 시 표시되는 항목들:
      - 반복 주기 `SegmentedButton` (`WEEKLY`/`BIWEEKLY`/`MONTHLY`)
      - 반복 종료일 (선택) — `showDatePicker` (firstDate=startDate, lastDate=+3년)
  - "공개 범위" `SegmentedButton` (`PUBLIC | PRIVATE`)
  - "장소 유형" `SegmentedButton` (`OFFLINE | ONLINE`)
  - 오프라인 시: 주소 + 상세 주소 입력 (plan.address가 있으면 prefill)
  - 온라인 시: 온라인 링크 (`TextInputType.url`) 입력
  - 하단 고정 `AppButton(label: '이벤트 생성', variant: primary, size: lg, fullWidth: true, loading: _isSaving)`
- **사용자가 할 수 있는 액션**:
  - 일시 탭 ▶ 날짜 → 시간 picker 순차 → `_startDate`, `_startTime` set
  - 반복 토글 ▶ `_isRecurring = true` 시 자동으로 `_recurrenceType = 'WEEKLY'` 기본
  - 반복 종료일 탭 ▶ datePicker → `_recurrenceEndDate` set, X 버튼으로 해제
  - "이벤트 생성" 탭 ▶ `_submit()` ▶ `PlanRepository.createEventFromPlan(planId, param)` ▶ `POST /api/v1/plans/{planId}/create-event`
    - `recurrenceRule`은 `_buildRrule(type, endDate)` 헬퍼로 RFC 5545 형식 생성 (예: `FREQ=WEEKLY;INTERVAL=1;UNTIL=20250601T000000Z`)
- **상태 분기**:
  - 플랜 로딩: `Center(CircularProgressIndicator)`
  - 플랜 에러: "플랜 정보를 불러올 수 없습니다" (단순 텍스트)
  - 일시 미선택 후 제출: `AppToast.show('일시를 선택해주세요', error)` + 제출 차단
  - 생성 성공: `AppToast.show('이벤트가 생성되었습니다')` + `context.go('/home/events/${response.eventId}')` (Unit 03 이벤트 상세로 이동)
  - 생성 실패: `AppToast.show('이벤트 생성에 실패했습니다', error)`
- **Prefill 정책** (`_applyPrefill`, `_prefilled` 가드로 1회만):
  - `plan.maxParticipants` → 모집 인원 (capacity controller 기본값 "10"인 경우만)
  - `plan.price > 0` → 참가비 (기본값 "0"인 경우만)
  - `plan.address` → 주소 (빈 컨트롤러일 때만)
  - `plan.planType == 'ONLINE'` → `_locationType = 'ONLINE'`

### 리뷰 작성 다이얼로그 (`market_review_write_dialog.dart`)

- **사용자가 보는 것**:
  - `AlertDialog` 제목: "리뷰 작성" 또는 "리뷰 수정"
  - "평점" 라벨 + 별 5개 (`Icons.star`/`Icons.star_border`, color `AppColors.warning500`, size 28)
  - "내용 (선택)" 라벨 + `TextField` (4 lines, maxLength 500, hintText "플랜에 대한 솔직한 평가를 남겨주세요")
  - 버튼: "취소", "등록" (또는 "수정")
- **사용자가 할 수 있는 액션**:
  - 별 i번째 탭 ▶ `_rating = i` (1~5)
  - 본문 입력 ▶ `_contentController` 업데이트
  - "취소" ▶ pop with null
  - "등록"/"수정" ▶ `pop((_rating, content.trim() empty면 null))`

### 리뷰 작성/수정/삭제 흐름 (F08-10 화면 내부)

- **작성**: `_writeReview()` ▶ 다이얼로그 → `(rating, content)` 받음 → `MarketItemReviewsNotifier.createReview(rating, content)` ▶ `POST /api/v1/market/items/{itemId}/reviews`
  - 성공: `AppToast.show('리뷰가 등록되었습니다', success)` + `ref.invalidateSelf()` 리뷰 리스트 재로드
  - 409 conflict: `AppToast.show('이미 리뷰를 작성했습니다', error)`
  - 403 forbidden: `AppToast.show('구매한 후에만 리뷰를 작성할 수 있습니다', error)`
- **수정**: `_writeReview(existing: review)` ▶ 다이얼로그(prefill rating/content) → `updateReview(reviewId, rating, content)` ▶ `PUT /api/v1/market/items/{itemId}/reviews/{reviewId}`
  - 성공: 토스트 "리뷰가 수정되었습니다" + invalidateSelf
- **삭제**: 본인 리뷰 PopupMenu "삭제" → `AppDialog.confirm("리뷰 삭제", "이 리뷰를 삭제하시겠습니까?", "취소", "삭제")` → 확인 시 `deleteReview(reviewId)` ▶ `DELETE /api/v1/market/items/{itemId}/reviews/{reviewId}`
  - 성공: 토스트 "리뷰가 삭제되었습니다" + 리스트 갱신

### API 호출 순서 (Provider/Repository 관점)

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

## 6. 상태/권한/시나리오 매트릭스

> `scenarios.md`에서 `S1` 형식의 시나리오를 찾지 못했다. QA 수용 기준을 별도 작성해야 한다.

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
| 후보 | backend.md:63 | - 잘못된 enum 값 → 400 (EnumUtils.parseEnum 동작 — 구체 분기 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:95 | - **사이드 이펙트**: 없음 (avgRating 캐시 무효화 등은 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- 시나리오 원천 문서가 비어 있으므로 수용 기준을 확정할 수 없다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
