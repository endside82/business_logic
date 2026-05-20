# F11-01. 이벤트 리뷰 작성 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/11_review_report/F11-01_event-review-write -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/11_review_report/F11-01_event-review-write`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

참석이 확정되고 종료된 이벤트에 대해 사용자가 별점(1~5)과 텍스트 후기를 남기는 단일 엔드포인트다. 사전 조건(참석 확정 / 종료 시각 경과 / 7일 이내 / 자기-자신 아님 / 중복 없음)을 모두 통과해야 INSERT가 일어나고, 성공 시 호스트 신뢰점수 재계산과 호스트에게 NEW_REVIEW 푸시 알림, `UserInteraction`(EVENT/REVIEW) 누적이 부수적으로 실행된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 화면(F03 도메인)에서 "리뷰 작성" 액션 → `context.push('/review-write/$eventId', extra: {'eventTitle': ...})`
- 이벤트 종료 푸시 알림(`EVENT_ENDED` 등) 탭 → 딥링크 라우팅으로 `Routes.reviewWrite` 진입
- 알림 센터(F-알림 도메인)에서 "리뷰 작성" CTA 탭

진입 시 `eventId`는 path parameter로, `eventTitle`은 `extra`로 전달되어 헤더 카드 폴백에 쓰인다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/11_review_report/F11-01_event-review-write/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/11_review_report/F11-01_event-review-write/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/11_review_report/F11-01_event-review-write/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/11_review_report/F11-01_event-review-write/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/review/controller/ReviewController.java:30` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시: `_EventSummaryCard`가 `eventDetailNotifierProvider(eventId)`를 watch → 캐시된 이벤트 상세를 그대로 사용 (네트워크 요청 없음 또는 1회). 폴백은 `eventTitle`.
2. "제출" 탭 시: `reviewWriteNotifierProvider(eventId).notifier.submitReview(rating, content)` (`presentation/review/screens/review_write_screen.dart:50-58`)
   → `ReviewRepository.createReview(eventId, ReviewParam(rating, content))`
   → Retrofit `ReviewApi.createReview` (`POST /api/v1/events/{eventId}/reviews`, body `ReviewParam`)
   → 성공: `Result.success(ReviewVo)` → state = `AsyncData(reviewVo)` 후 화면이 `context.pop(true)`로 종료, 호출자(이벤트 상세/리뷰 목록)는 `ref.invalidate`로 새로고침 가능.
   → 실패: `Result.failure(ApiError)` → 화면이 `_handleError(error)`에서 case별 토스트/다이얼로그 + 필요 시 `pop`.

## 4. 서버 계약

### 개요

참석이 확정되고 종료된 이벤트에 대해 사용자가 별점(1~5)과 텍스트 후기를 남기는 단일 엔드포인트다. 사전 조건(참석 확정 / 종료 시각 경과 / 7일 이내 / 자기-자신 아님 / 중복 없음)을 모두 통과해야 INSERT가 일어나고, 성공 시 호스트 신뢰점수 재계산과 호스트에게 NEW_REVIEW 푸시 알림, `UserInteraction`(EVENT/REVIEW) 누적이 부수적으로 실행된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/events/{eventId}/reviews` | `ReviewController#createReview` | required (`@AuthenticationPrincipal`) | 참석/종료/7일 가드 통과 시 리뷰 INSERT + 호스트 신뢰점수 재계산 + 푸시 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `Review` (`review/model/Review.java`): `id`, `eventId`, `reviewerId`, `revieweeId`, `rating`, `content`, `helpfulCount`, `isEdited`, `deletedAt`(soft delete) + `@CreatedDate/@LastModifiedDate`. `@BatchSize(100)` 적용.
- **Enum** `AttendanceStatus` (`capacity/constants`): `ATTENDING`만 통과. (다른 값은 본 단위 외이므로 표기만)
- 본 기능에는 자체 enum 없음. 신뢰점수 등급은 F11-05에서 다룸.

### 의존 단위 / 외부 시스템

- **Unit 03 이벤트 / Unit 03 참석(capacity)**: `EventRepository.findById`, `EventAttendanceRepository.findByEventIdAndUserId`로 사전조건 검증 (호출만, 변경 없음)
- **Unit 12 알림**: `NotificationService.createNotification` 통해 `NEW_REVIEW` 푸시 (FCM은 알림 단위 책임)
- **F11-05 신뢰점수**: `TrustScoreService.recalculate(revieweeId)` 호출 → `ScoreHistoryService`가 1점 이상 변동 시 스냅샷 적재
- **추천(`UserInteraction`)**: 본 단위가 INSERT만 수행, 추천 알고리즘은 별 단위 책임
- 외부 시스템: 푸시 인프라(FCM, Notification 단위가 처리)

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 화면(F03 도메인)에서 "리뷰 작성" 액션 → `context.push('/review-write/$eventId', extra: {'eventTitle': ...})`
- 이벤트 종료 푸시 알림(`EVENT_ENDED` 등) 탭 → 딥링크 라우팅으로 `Routes.reviewWrite` 진입
- 알림 센터(F-알림 도메인)에서 "리뷰 작성" CTA 탭

진입 시 `eventId`는 path parameter로, `eventTitle`은 `extra`로 전달되어 헤더 카드 폴백에 쓰인다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | 라우트 상수 | Screen 파일 | 역할 |
|---|---|---|---|
| `/review-write/:eventId` | `Routes.reviewWrite` (`core/router/routes.dart:169`) | `presentation/review/screens/review_write_screen.dart` | 별점 + 후기 입력 후 제출 |

### 화면별 구성 요소 & 액션

### 리뷰 작성 (`review_write_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '리뷰 작성')`
  - `_EventSummaryCard` — 이벤트 썸네일/제목/시작일/주소/호스트 닉네임 (서버 `EventDetailVo` 사용, fallback은 `widget.eventTitle`만 표시)
  - "이 모임은 어떠셨나요?" 헤딩 (`AppTypography.heading3`)
  - `StarRatingWidget` (size 36, interactive=true) — 1~5 인터랙티브
  - 별점 라벨: `1: 별로예요 / 2: 그저 그래요 / 3: 보통이에요 / 4: 좋아요 / 5: 최고예요` (warning500 색상)
  - 구분선 → "리뷰를 남겨주세요" 라벨 + `AppTextArea` (`maxLength: 1000`, `showCharCount: true`, `minLines: 5`, `maxLines: 8`, placeholder "이벤트에 대한 솔직한 후기를 남겨주세요")
  - `bottomNavigationBar` — 고정 "제출" 버튼 (`AppButton(variant: ButtonVariant.primary, size: ButtonSize.lg, fullWidth: true)`)
- **사용자가 할 수 있는 액션**:
  - 별점 탭/스와이프 → 내부 state `_rating` 갱신 + `_hasChanges = true`
  - 텍스트 입력 → `_contentController` + `_hasChanges = true`
  - "제출" 탭 → `_submit()` → `reviewWriteNotifier.submitReview(rating, content)` → `POST /api/v1/events/:id/reviews`
  - 뒤로 가기 → `PopScope`가 `_hasChanges`이면 `AppDialog.confirm` (`title: '작성 중인 리뷰가 있습니다'`, `confirmLabel: '나가기'`, `cancelLabel: '계속 작성'`)
- **상태 분기 (제출 결과)**:
  | 케이스 | 처리 |
  |---|---|
  | 성공 | `AppToast.show('리뷰가 등록되었습니다', success)` + `context.pop(true)` (호출자에게 갱신 신호) |
  | 403 forbidden | 토스트 "이벤트에 참석한 사용자만 리뷰를 작성할 수 있습니다" + `context.pop()` |
  | 404 notFound | 토스트 "이벤트를 찾을 수 없습니다" + `context.pop()` |
  | 409 conflict | 토스트 "이미 리뷰를 작성하셨습니다" + `context.pop()` |
  | 422 unprocessable | `setState(() {})` (인라인 영역 갱신, 별도 메시지 미노출) |
  | 429 rateLimited | 토스트 "잠시 후 다시 시도해주세요" |
  | 500 serverError | 토스트 "서버 오류가 발생했습니다. 다시 시도해주세요" |
  | networkError | 토스트 "인터넷 연결을 확인해주세요" |
  | unauthorized | 토스트 "로그인이 필요합니다" |
- **로딩**: 제출 중 `_isSubmitting`이 true → 버튼 `loading: true`로 스피너 노출, 입력은 그대로 유지.
- **모달/시트/네비게이션**: 폼 자체는 풀스크린. 종료 시점은 항상 `context.pop`. 별도 모달 없음.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시: `_EventSummaryCard`가 `eventDetailNotifierProvider(eventId)`를 watch → 캐시된 이벤트 상세를 그대로 사용 (네트워크 요청 없음 또는 1회). 폴백은 `eventTitle`.
2. "제출" 탭 시: `reviewWriteNotifierProvider(eventId).notifier.submitReview(rating, content)` (`presentation/review/screens/review_write_screen.dart:50-58`)
   → `ReviewRepository.createReview(eventId, ReviewParam(rating, content))`
   → Retrofit `ReviewApi.createReview` (`POST /api/v1/events/{eventId}/reviews`, body `ReviewParam`)
   → 성공: `Result.success(ReviewVo)` → state = `AsyncData(reviewVo)` 후 화면이 `context.pop(true)`로 종료, 호출자(이벤트 상세/리뷰 목록)는 `ref.invalidate`로 새로고침 가능.
   → 실패: `Result.failure(ApiError)` → 화면이 `_handleError(error)`에서 case별 토스트/다이얼로그 + 필요 시 `pop`.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 별점 라벨 5종 (`별로예요`/`그저 그래요`/`보통이에요`/`좋아요`/`최고예요`) — 클라이언트 상수
- 텍스트 입력 maxLength 1000 (서버 `ReviewParam.content @Size(max=1000)` 와 일치 — 24차-A 적용)
- 리뷰 목록 카드(`ReviewCard`)는 25차-A에서 1000자 본문 표시 후속을 반영해 기본 5줄 `ellipsis` 로 접고, 실제 overflow 가 있을 때만 "더 보기" / "접기" 토글을 노출한다.
- "제출" 버튼 활성화 조건: 별점 ≥ 1 (텍스트는 옵션) — UI 스펙(SCR-RR-001)에서는 "10자 이상"이라 기재되어 있으나 실제 코드는 별점만 검증
- `_hasChanges` 추적 → 미저장 종료 시 `AppDialog.confirm` 노출
- 토스트 메시지 본문 한국어 ("리뷰가 등록되었습니다", "이미 리뷰를 작성하셨습니다", 등)
- `bottomNavigationBar` SafeArea + `screenPadding` 패딩
- 이벤트 요약 카드의 fallback 처리(상세 로딩 실패 시 `eventTitle`만으로 카드 구성)
- 별점 색상은 `AppColors.warning500`, 비활성 별은 `AppSemanticColors.borderDefault`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 참석자가 종료된 이벤트에 리뷰 작성 | - 로그인됨 (JWT 유효) | `Review` 1건 생성, 호스트 신뢰점수 갱신, `score_snapshot` 1건 추가(점수 변동 ≥ 1.0인 경우), 호스트 알림 1건. |
| S2 | 중복 작성 시도 — 같은 이벤트에 이미 리뷰가 있는 경우 | 같은 사용자/이벤트 조합으로 `review.deleted_at IS NULL` 레코드 존재. | 변화 없음. 사용자는 이전 화면으로 자동 복귀. |
| S3 | 미참석자 시도 — 이벤트에 참석하지 않은 사용자 | `EventAttendance` 없음 또는 status가 `ATTENDING` 아님. | INSERT 없음. |
| S4 | 7일 경과 — 작성 기간 만료 | `event.endTime + 7일 < now()`. | INSERT 없음. 사용자는 화면에 머무르며 다시 시도해도 같은 에러. |
| S5 | 호스트 본인이 자신의 이벤트에 리뷰 시도 | `event.hostUserId == loginUser.userId`. 참석 기록은 호스트 본인 참석 옵션에 따라 다양. | INSERT 없음. |
| S6 | 미저장 이탈 — 입력 후 뒤로가기 | 별점 또는 텍스트 변경됨 → `_hasChanges = true`. | INSERT 없음, 입력 내용은 휘발. |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. Happy Path — 참석자가 종료된 이벤트에 리뷰 작성**: Given - 로그인됨 (JWT 유효) When 사용자가 해당 흐름을 실행하면 Then `Review` 1건 생성, 호스트 신뢰점수 갱신, `score_snapshot` 1건 추가(점수 변동 ≥ 1.0인 경우), 호스트 알림 1건.
- **AC-02. 중복 작성 시도 — 같은 이벤트에 이미 리뷰가 있는 경우**: Given 같은 사용자/이벤트 조합으로 `review.deleted_at IS NULL` 레코드 존재. When 사용자가 해당 흐름을 실행하면 Then 변화 없음. 사용자는 이전 화면으로 자동 복귀.
- **AC-03. 미참석자 시도 — 이벤트에 참석하지 않은 사용자**: Given `EventAttendance` 없음 또는 status가 `ATTENDING` 아님. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-04. 7일 경과 — 작성 기간 만료**: Given `event.endTime + 7일 < now()`. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음. 사용자는 화면에 머무르며 다시 시도해도 같은 에러.
- **AC-05. 호스트 본인이 자신의 이벤트에 리뷰 시도**: Given `event.hostUserId == loginUser.userId`. 참석 기록은 호스트 본인 참석 옵션에 따라 다양. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-06. 미저장 이탈 — 입력 후 뒤로가기**: Given 별점 또는 텍스트 변경됨 → `_hasChanges = true`. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음, 입력 내용은 휘발.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
