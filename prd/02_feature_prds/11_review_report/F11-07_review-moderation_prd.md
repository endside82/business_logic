# F11-07. 호스트 리뷰 모더레이션 (답변 · 임시 숨김) PRD

<!-- created: 2026-06-05; source: 2026-06-04 dossier 04 §2 실사 기반 신규 작성 -->

> 문서 상태: **실사 기반 신규 작성**. community_api HEAD(88feb72) / community_app HEAD(b0dc370) 소스를 직접 확인한 후 작성했다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 호스트가 본인 이벤트에 달린 리뷰에 대해 두 가지 모더레이션 권한을 갖는다: **답변**과 **임시 숨김**.

답변은 리뷰 1건당 1개로 제한(1:1 관계)되며, 작성 후 24h 이내에만 수정 가능하다. 삭제 엔드포인트는 없다(소프트 딜리트 경로가 컨트롤러에 미노출). 임시 숨김은 6가지 사유코드 중 하나를 필수 선택하며, `autoEscalate=true` 전송 시 `ReportType.REVIEW` 신고가 서버에서 자동 생성된다(F11-04 연동). 숨김 해제(unhide)로 언제든 취소할 수 있다.

서버 계약은 닫혀 있으나, 클라이언트 쪽에 두 개의 실행 가능한 잠재 버그와 두 개의 미구현이 있다:
- 답변 수정 UI 미배선 — `reply != null`인 리뷰에서 더보기를 눌러도 createReply 경로가 호출되어 서버에서 409 발생
- `ReviewHideParam.autoEscalate` 기본값 불일치 — 앱은 `@Default(true)`, 서버는 false가 기본
- 답변 알림 미구현 — 호스트 답변 작성 시 리뷰 작성자에게 NotificationType 미정의
- `hide`/`unhide` 반환 타입이 VO가 아닌 `Review` 엔티티 직접 반환 (아키텍처 규칙 위반, 런타임 영향 없음)

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend | `review/controller/ReviewController.java:89-127` | endpoint, request body, response, 에러코드 |
| Backend | `review/service/ReviewService.java:300-460` | 비즈니스 규칙, autoEscalate 흐름, unhide 초기화 |
| Backend | `review/model/ReviewReply.java`, `review/model/Review.java` | 엔티티/컬럼 정의 |
| Backend | `review/param/ReviewReplyParam.java`, `review/param/ReviewHideParam.java` | 요청 필드 |
| Backend | `review/vo/ReviewReplyVo.java` | 응답 필드 |
| Backend | `review/constants/ReviewHideReasonCode.java:11-24` | 숨김 사유 enum |
| Backend | `config/error/ErrorCode.java:178-184` | 에러코드 |
| Backend | `notification/constants/NotificationType.java` | 답변 알림 미존재 확인 |
| Frontend | `community_app/lib/data/api/review_api.dart:40-62` | 엔드포인트 배선 |
| Frontend | `review_reply_vo.dart`, `review_reply_param.dart`, `review_hide_param.dart`, `review_hide_reason_code.dart` | Freezed 모델 |
| Frontend | `presentation/review/widgets/review_card.dart:44-48, 189-196` | 카드 분기 |
| Frontend | `review_reply_sheet.dart`, `review_hide_sheet.dart` | 바텀시트 |
| Frontend | `domain/providers/review/review_write_provider.dart:91-175` | ReviewReplyNotifier / ReviewHideNotifier |
| Frontend | `review_list_screen.dart:157-260, 262-264` | 호스트 모더레이션 흐름 |
| Verification | 검증 없음 — 답변/숨김 흐름에 대한 유닛/통합 테스트 미발견 | |

### 확인된 소스 trace

| 소스 | 파일 존재 |
|---|---|
| `community_api/src/.../review/controller/ReviewController.java:89-127` | 확인됨 |
| `community_api/src/.../review/service/ReviewService.java:300-460` | 확인됨 |
| `community_api/src/.../review/constants/ReviewHideReasonCode.java:11-24` | 확인됨 |
| `community_app/lib/data/api/review_api.dart:40-62` | 확인됨 |
| `community_app/lib/presentation/review/widgets/review_card.dart:44-48` | 확인됨 |

## 3. 전체 동작 흐름

### 답변 작성 흐름

1. 이벤트 리뷰 목록(F11-02)에서 `review.revieweeId == currentUserId` → 더보기 메뉴 활성화
2. "답변하기" 탭 → `showReviewReplySheet(context, review)` (바텀시트)
3. 호스트가 content 입력 → Navigator.pop(content)
4. `ReviewReplyNotifier(reviewId).createReply(content)` → `POST /api/v1/reviews/{reviewId}/reply`
5. 서버: `existsByReviewIdAndDeletedAtIsNull` 체크 → 이미 존재하면 409 `REVIEW_REPLY_ALREADY_EXISTS`
6. 성공: `ReviewReplyVo` 반환 → 리뷰 카드에 `_HostReply` 녹색 카드 표시

### 답변 수정 흐름

1. `review.reply != null` 상태에서 더보기 → "답변 수정" 탭
   - **현재 미배선**: review_list_screen에서 reply 존재 시 updateReply 분기 없음 → createReply 호출 → 서버 409 발생 (Gap)
2. 정상 경로: `ReviewReplyNotifier(reviewId).updateReply(content)` → `PUT /api/v1/reviews/{reviewId}/reply`
3. 서버: `allowEdit=false`이면 즉시 `REVIEW_REPLY_EDIT_WINDOW_EXPIRED` (400)

### 임시 숨김 흐름

1. 더보기 → "임시 숨김" → `showReviewHideSheet(context)` (바텀시트)
2. 사유코드 6개 중 선택. OTHER 선택 시 reasonText는 선택(서버 nullable ≤500자) — 자유 기재 권장이지만 필수 검증 없음(필요 시 Gap). `FAKE_REVIEW` 선택 시 `_autoEscalate=true`로 초기화되지만 비활성화되지 않아 사용자가 체크박스로 해제 가능 (`review_hide_sheet.dart:131-134, 201-203`). 기본값은 true(`_autoEscalate = true` 초기값). 사용자가 직접 체크박스 해제 시 false 전송 가능.
3. `ReviewHideNotifier(reviewId).hide(ReviewHideParam(reasonCode, reasonText, autoEscalate))` → `POST /api/v1/reviews/{reviewId}/hide`
4. `autoEscalate=true`이면 서버가 `Report(reporter=hostUserId, targetType=REVIEW, targetId=reviewId, reason=INAPPROPRIATE, status=PENDING, priority=reasonCode==FAKE_REVIEW)` 자동 생성 (`ReviewService.java:415-427`)
5. 성공: `review.temporarilyHidden=true` → 리뷰 카드에 `_HiddenReviewNotice` + `_HiddenBadge` 표시

### 숨김 해제 흐름

1. 숨김 상태 리뷰 더보기 → "숨김 해제" → `ReviewHideNotifier(reviewId).unhide()` → `POST /api/v1/reviews/{reviewId}/unhide`
2. 서버: `temporarily_hidden/hidden_reason_code/hidden_reason_text/hidden_by_user_id/hidden_at` 전부 null 초기화 (`ReviewService.java:454-459`). **별도 unhide audit 로그 없음.** autoEscalate로 생성된 Report row는 그대로 남음(Report 자체의 처리는 별도 운영 경로).
3. 성공: `review.temporarilyHidden=false` → 정상 리뷰 카드 표시

## 4. 서버 계약

### 엔드포인트 요약

| Method | Path | 인증 | 권한 | Request Body | Response | 주요 에러 |
|---|---|---|---|---|---|---|
| POST | `/api/v1/reviews/{reviewId}/reply` | required | 이벤트 호스트 (`event.hostUserId == caller`) | `ReviewReplyParam` | `ReviewReplyVo` (201) | REVIEW_NOT_FOUND, REVIEW_REPLY_NOT_HOST(403), REVIEW_REPLY_ALREADY_EXISTS(409) |
| PUT | `/api/v1/reviews/{reviewId}/reply` | required | 답변 작성자(호스트) | `ReviewReplyParam` | `ReviewReplyVo` (200) | REVIEW_REPLY_NOT_FOUND, REVIEW_REPLY_NOT_HOST(403), REVIEW_REPLY_EDIT_WINDOW_EXPIRED(400) |
| GET | `/api/v1/reviews/{reviewId}/reply` | 미강제 | 없음 | — | `ReviewReplyVo` (200) | REVIEW_REPLY_NOT_FOUND |
| POST | `/api/v1/reviews/{reviewId}/hide` | required | 이벤트 호스트 | `ReviewHideParam` | `Review` 엔티티 직접 반환 (**Gap: 엔티티 반환 규칙 위반**) (200) | REVIEW_NOT_FOUND, REVIEW_HIDE_NOT_HOST(403), REVIEW_ALREADY_HIDDEN(409) |
| POST | `/api/v1/reviews/{reviewId}/unhide` | required | 이벤트 호스트 | — | `Review` 엔티티 직접 반환 (**Gap: 엔티티 반환 규칙 위반**) (200) | REVIEW_NOT_FOUND, REVIEW_HIDE_NOT_HOST(403), REVIEW_NOT_HIDDEN(409) |

소스: `ReviewController.java:89-127`

### ReviewReplyParam (요청)

| 필드 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `content` | `String` | `@NotBlank`, `@Size(max=1000)` | 답변 내용 |

소스: `review/param/ReviewReplyParam.java`

### ReviewHideParam (요청)

| 필드 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `reasonCode` | `ReviewHideReasonCode` | `@NotNull` | 숨김 사유 enum |
| `reasonText` | `String?` | `@Size(max=500)` | nullable, 호스트 자유 기재 |
| `autoEscalate` | `boolean` | 기본 **false** | true → `ReportType.REVIEW` 신고 자동 생성 |

소스: `review/param/ReviewHideParam.java`

### ReviewHideReasonCode enum (전체 6값)

| 값 | 설명 |
|---|---|
| `HARASSMENT` | 욕설/괴롭힘 |
| `DEFAMATION` | 명예훼손/허위 사실 적시 |
| `SPAM` | 광고/스팸 |
| `OFF_TOPIC` | 모임/이벤트와 무관한 내용 |
| `FAKE_REVIEW` | 허위 리뷰 (dispute escalation 우선 대상) |
| `OTHER` | 기타 (호스트 자유 기재) |

코드값(int): 없음 — name() String 그대로 DB 저장 (`review.hidden_reason_code varchar(40)`).

소스: `review/constants/ReviewHideReasonCode.java:11-24`

### ReviewReplyVo (응답)

| 필드 | 타입 | nullable | 비고 |
|---|---|---|---|
| `id` | long | N | |
| `reviewId` | long | N | |
| `hostUserId` | long | N | |
| `hostNickname` | String | Y | 서비스에서 배치 조회 후 주입 |
| `content` | String | N | |
| `allowEdit` | boolean | N | 작성 후 24h 경과 시 false 고정 |
| `createdAt` | LocalDateTime | Y | |
| `updatedAt` | LocalDateTime | Y | |

소스: `review/vo/ReviewReplyVo.java:16-25`

### ReviewReply 엔티티 (테이블: review_reply)

| 컬럼 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `id` | bigint | PK auto | |
| `review_id` | bigint | NOT NULL, UNIQUE | FK → review.id (1:1 관계) |
| `host_user_id` | bigint | NOT NULL | FK → users.user_id |
| `content` | varchar(1000) | NOT NULL | |
| `allow_edit` | tinyint(1) | NOT NULL DEFAULT 1 | 24h 수정 윈도우 플래그 |
| `created_at` | datetime | NOT NULL | @CreatedDate |
| `updated_at` | datetime | NOT NULL | @LastModifiedDate |
| `deleted_at` | datetime | NULL | soft delete (컨트롤러 미노출) |

소스: `review/model/ReviewReply.java:24-62`, `V1__init.sql:1483-1498`

### Review 엔티티 추가 컬럼 (hide 관련)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `temporarily_hidden` | tinyint(1) NOT NULL DEFAULT 0 | 호스트 임시 숨김 |
| `hidden_reason_code` | varchar(40) DEFAULT NULL | ReviewHideReasonCode.name() |
| `hidden_reason_text` | varchar(500) DEFAULT NULL | 호스트 자유 기재 |
| `hidden_by_user_id` | bigint DEFAULT NULL | 실행 호스트 userId |
| `hidden_at` | datetime DEFAULT NULL | 숨김 시각 |

인덱스: `idx_review_hidden(temporarily_hidden)` — `V1__init.sql:1474`

소스: `review/model/Review.java:51-65`, `V1__init.sql:1460-1464`

### 비즈니스 규칙 (서비스 레이어)

- **답변 1회 제한**: `reviewReplyRepository.existsByReviewIdAndDeletedAtIsNull` 체크 → 이미 존재하면 REVIEW_REPLY_ALREADY_EXISTS (409). (`ReviewService.java:300`)
- **수정 24h 윈도우**: `REPLY_EDIT_WINDOW_HOURS = 24L`. `allowEdit=false`이면 PUT 즉시 거부. `createdAt + 24h` 경과 시 `REVIEW_REPLY_EDIT_WINDOW_EXPIRED` (400). (`ReviewService.java:301`)
- **답변 DELETE 엔드포인트 없음**: soft delete 경로가 컨트롤러에 미노출.
- **숨김 시 별점 신뢰점수 제외 안 됨**: 별점은 trust score에서 제외하지 않음(별도 결정). (`ReviewService.java:386` 주석)
- **autoEscalate 연동**: `ReviewHideParam.autoEscalate=true` → `Report(reporter=hostUserId, targetType=REVIEW, targetId=reviewId, reason=INAPPROPRIATE, status=PENDING, priority=reasonCode==FAKE_REVIEW)` 자동 생성. (`ReviewService.java:415-427`)
- **unhide 초기화**: `hidden_reason_code/hidden_reason_text/hidden_by_user_id/hidden_at` 전부 null. (`ReviewService.java:454-458`)

### 에러코드 (신규 추가분)

| 코드 | HTTP | 코드값 | 설명 |
|---|---|---|---|
| `REVIEW_REPLY_NOT_FOUND` | 404 | 700014 | 활성 답변 없음 |
| `REVIEW_REPLY_ALREADY_EXISTS` | 409 | 700015 | 답변 이미 존재 |
| `REVIEW_REPLY_NOT_HOST` | 403 | 700016 | 호스트가 아님 |
| `REVIEW_REPLY_EDIT_WINDOW_EXPIRED` | 400 | 700017 | 24h 수정 윈도우 만료 |
| `REVIEW_HIDE_NOT_HOST` | 403 | 700018 | 숨김 권한 없음 |
| `REVIEW_ALREADY_HIDDEN` | 409 | 700019 | 이미 숨김 처리됨 |
| `REVIEW_NOT_HIDDEN` | 409 | 700020 | 숨김 상태가 아님 |

소스: `config/error/ErrorCode.java:178-184`

### 의존 단위 / 외부 시스템

- **F11-04**: `autoEscalate=true` 시 `ReportService.createReport` 경로를 타서 Report 레코드 생성. 자동 생성된 신고도 dedup/도배 기각/우선검토 플래그 공통 경로를 탄다.
- **F11-02**: `ReviewVo.reply`(ReviewReplyVo) / `ReviewVo.temporarilyHidden` 등 5개 신규 필드로 리뷰 목록 응답에 포함됨.
- Notification 도메인: **미연결** — `ReviewService.reply()` 내 NotificationService 호출 없음. `HOST_REPLY_TO_REVIEW` 유형 미존재.
- 외부 시스템: 없음.

## 5. 프론트 계약

### 진입 경로 (호스트 전용)

- `review_list_screen.dart` 내 이벤트별 리뷰 목록 → `_canModerateReview(review, currentUserId)`: `review.revieweeId == currentUserId` 조건
- 답변 없는 리뷰: 더보기 → "답변하기" → `review_reply_sheet`
- 답변 있는 리뷰: 더보기 → "답변 수정" → (**현재 미배선**, Gap 참조)
- 숨김 안 된 리뷰: 더보기 → "임시 숨김" → `review_hide_sheet`
- 숨김 상태 리뷰: 더보기 → "숨김 해제" → 확인 → unhide 호출

### 사용 라우트 & 화면 파일

별도 라우트 없음. `review_list_screen.dart`에서 바텀시트로 처리.

| 파일 | 역할 |
|---|---|
| `presentation/review/screens/review_list_screen.dart` | 호스트 모더레이션 흐름 진입점 |
| `presentation/review/widgets/review_card.dart` | 숨김 상태/답변 표시 분기 |
| `review_reply_sheet.dart` | 답변 작성 바텀시트 |
| `review_hide_sheet.dart` | 숨김 사유 선택 바텀시트 |
| `domain/providers/review/review_write_provider.dart:91-175` | ReviewReplyNotifier / ReviewHideNotifier |

### 모델 (Freezed)

| 파일 | 서버 대응 | 주요 필드 |
|---|---|---|
| `review_reply_vo.dart` | `ReviewReplyVo` | `id, reviewId, hostUserId, hostNickname, content, allowEdit, createdAt, updatedAt` |
| `review_reply_param.dart` | `ReviewReplyParam` | `content` (required) |
| `review_hide_param.dart` | `ReviewHideParam` | `reasonCode`(ReviewHideReasonCode), `reasonText`, `autoEscalate` (**@Default(true)** — 서버 기본 false와 불일치) |
| `review_hide_reason_code.dart` | `ReviewHideReasonCode` | 6개 값, @JsonValue로 대문자 매핑 |

### Retrofit API

| 메서드 | 경로 | 서버 일치 여부 |
|---|---|---|
| `createReply(reviewId, ReviewReplyParam)` | `POST /api/v1/reviews/{reviewId}/reply` | 일치 |
| `updateReply(reviewId, ReviewReplyParam)` | `PUT /api/v1/reviews/{reviewId}/reply` | 일치 |
| `getReply(reviewId)` | `GET /api/v1/reviews/{reviewId}/reply` | 일치 (미배선 — 단독 호출 사용 안 함) |
| `hideReview(reviewId, ReviewHideParam)` | `POST /api/v1/reviews/{reviewId}/hide` | 일치. 반환 `void` (서버는 Review 반환이나 클라 무시) |
| `unhideReview(reviewId)` | `POST /api/v1/reviews/{reviewId}/unhide` | 일치. 반환 `void` |

소스: `community_app/lib/data/api/review_api.dart:40-62`

### ReviewCard 분기 (review_card.dart:44-48, 189-196)

- `_hasHostActions = onReply != null || onHide != null || onUnhide != null` → 더보기 메뉴 노출 분기
- `review.temporarilyHidden=true` → `_HiddenReviewNotice(reasonText)` + `_HiddenBadge(reasonCode)` 표시 (본문 대체)
- `review.reply != null && reply.content.isNotEmpty` → `_HostReply(reply)` 녹색 카드 표시

### review_hide_sheet 특이사항

- `_autoEscalate` 초기값 true(`review_hide_sheet.dart:34`). 사용자가 **CheckboxListTile로 해제 가능** (`review_hide_sheet.dart:131-134`).
- `FAKE_REVIEW` 선택 시 `_autoEscalate=true`로 **초기화**되지만 비활성화되지 않음 — 사용자가 체크박스로 여전히 해제 가능 (`review_hide_sheet.dart:201-203`).
- `_canSubmit = _reasonCode != null` — reasonText 입력 여부와 무관하게 사유코드 선택만으로 제출 활성화. OTHER 포함 모든 사유에서 reasonText 필수 아님.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트(revieweeId==currentUserId), 답변 없음 | ReviewService: REVIEW_REPLY_ALREADY_EXISTS 없음 | onReply 콜백 활성 | 더보기 → "답변하기" 가능 | 정상 |
| 호스트, 이미 답변 있음(allowEdit=true 24h 이내) | PUT /reply 허용 | **미배선**: review_list_screen에서 분기 없음 → createReply 호출 → 서버 409 | 호스트가 답변 수정 시도 시 "이미 답변이 있습니다" 에러 발생 | Gap — 수정 필요 |
| 호스트, 이미 답변 있음(allowEdit=false 24h 경과) | PUT /reply → REVIEW_REPLY_EDIT_WINDOW_EXPIRED (400) | 미배선 | 에러 발생 | Gap |
| 비호스트 | ReviewService: REVIEW_REPLY_NOT_HOST (403) | `_canModerateReview` false → 더보기 버튼 자체 미노출 | 더보기 없음 | 정상 |
| 호스트, 리뷰 숨김 안 됨 | POST /hide 허용 | onHide 콜백 활성 | 더보기 → "임시 숨김" 가능 | 정상 |
| 호스트, 이미 숨김 상태 | POST /hide → REVIEW_ALREADY_HIDDEN (409) | onHide → onUnhide로 전환 | 더보기 → "숨김 해제"만 노출 | 정상 |
| autoEscalate(앱 기본 ON, 시트에서 해제 가능) | ReviewService: Report 자동 생성 | `_autoEscalate=true` 기본값, CheckboxListTile으로 사용자가 해제 가능(해제 시 false 전송). FAKE_REVIEW 선택 시 true 초기화(해제 여전히 가능). 서버 기본값은 false. | autoEscalate=true이면 숨김과 함께 REVIEW 신고 자동 생성 | Gap — 사용자가 체크박스 해제를 인지하지 못하면 의도치 않게 true 전송 가능. 운영 정책 명확화 필요. |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| POST /reply 경로 | ReviewController:89 — 호스트 검증, 1회 제한, ReviewReplyVo 반환 | review_api.dart createReply → ReviewReplyNotifier | 정합 |
| PUT /reply 경로 | ReviewController:100 — 24h 윈도우 검증 | review_api.dart updateReply → ReviewReplyNotifier.updateReply 존재 | 서버 OK, 앱 화면 미배선(Gap) |
| ReviewHideParam.autoEscalate | 서버 기본 false | 앱 기본 true, 사용자가 체크박스로 해제 가능(해제 시 false 전송) | 앱 초기값 true이나 사용자가 명시적으로 해제 가능. 서버 기본값은 false. |
| hide/unhide 반환 타입 | Review 엔티티 직접 반환 (아키텍처 규칙 위반) | Future<void> — 반환 무시 | 런타임 영향 없음. 서버 리팩터링 필요 |
| 답변 알림 | NotificationType에 `HOST_REPLY_TO_REVIEW` 없음, ReviewService에 알림 호출 없음 | 없음 | 리뷰 작성자에게 답변 알림 없음. 미구현 |
| ReviewHideReasonCode 6값 | 서버 6값 (HARASSMENT/DEFAMATION/SPAM/OFF_TOPIC/FAKE_REVIEW/OTHER) | review_hide_reason_code.dart 6값 | 정합 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| Risk-H | 답변 수정 UI 미배선 → 서버 409 잠재 | `review_list_screen.dart` — `review.reply != null`일 때 createReply 호출. 서버 `REVIEW_REPLY_ALREADY_EXISTS(409)` | 호스트가 답변 수정을 시도하면 409 에러. 사용자 혼란. | `review_list_screen.dart`에서 `review.reply != null` 조건으로 updateReply 경로 분기 추가 |
| Risk-M | `autoEscalate` 기본값 동작 | `review_hide_param.dart:12` `@Default(true)` vs 서버 `ReviewHideParam.autoEscalate = false`. 앱 초기값은 true이나 사용자가 체크박스로 해제 가능(해제 시 false 전송). 서버 기본값은 false. | 체크박스 해제를 인지하지 못한 사용자는 의도치 않게 autoEscalate=true 전송 가능 → FAKE_REVIEW 외 숨김에도 신고 자동 생성 위험 | 체크박스 UI 가시성 검토. 의도적 기본값이면 서버 기본값 통일 검토. |
| Risk-M | 답변 알림 미구현 | `ReviewService.java:310-330` — NotificationService 호출 없음. `NotificationType.java`에 `HOST_REPLY_TO_REVIEW` 미존재 | 호스트가 답변을 달아도 리뷰 작성자에게 알림 없음 | `NotificationType` 추가 + `ReviewService.reply()`에서 알림 발송 추가 여부 결정 |
| Gap | hide/unhide 엔티티 직접 반환 | `ReviewController.java:113,123` — `Review` 엔티티 직접 반환 (VO 반환 규칙 위반) | 클라이언트가 `Future<void>`로 받아 무시하므로 런타임 오류 없음. 아키텍처 규칙 위반. | 서버 `hide`/`unhide` 반환 타입을 `ReviewVo`로 리팩터링 검토 |

## 9. 수용 기준

- **AC-01. 호스트 답변 작성**: Given 이벤트 리뷰 목록, 호스트 본인. When 더보기 → "답변하기" → content 입력 → 제출. Then `POST /reply` 성공(201), 리뷰 카드에 `_HostReply` 녹색 카드 표시.
- **AC-02. 답변 중복 방지**: Given 이미 답변 있는 리뷰에 다시 createReply 호출. When 제출. Then 서버 `REVIEW_REPLY_ALREADY_EXISTS(409)`. 앱에서 에러 토스트.
- **AC-03. 답변 수정 (24h 이내)**: Given `allowEdit=true`. When updateReply 호출. Then 200 성공, 답변 내용 갱신.
- **AC-04. 답변 수정 윈도우 만료**: Given `allowEdit=false`. When updateReply 호출. Then 400 `REVIEW_REPLY_EDIT_WINDOW_EXPIRED`.
- **AC-05. 임시 숨김**: Given 호스트 본인, 숨김 안 된 리뷰. When 사유코드 선택 → hide 제출. Then 리뷰 카드에 `_HiddenReviewNotice` 표시.
- **AC-06. FAKE_REVIEW 숨김 → 신고 자동 생성**: Given `reasonCode=FAKE_REVIEW`. When hide 제출. Then `autoEscalate=true` 전송 → 서버에서 `ReportType.REVIEW` 신고 레코드 자동 생성(PENDING, priority=true).
- **AC-07. 숨김 해제**: Given 숨김 상태 리뷰. When "숨김 해제" → unhide 제출. Then `temporarily_hidden` 등 5컬럼 null 초기화, 정상 리뷰 카드 표시.
- **AC-08. 비호스트 모더레이션 시도**: Given `revieweeId != currentUserId`. When hide/reply 호출. Then 서버 403, 앱 더보기 메뉴 미노출.
- **AC-09. 이미 숨김 상태 재숨김**: Given `temporarily_hidden=true`. When hide 제출. Then 409 `REVIEW_ALREADY_HIDDEN`.

## 10. 미결정 / 후속

- **答변 수정 UI 미배선 수정**: `review_list_screen.dart`에서 `review.reply != null` 조건 분기 추가 필요. 우선순위 높음(사용자 409 노출 가능).
- **autoEscalate 기본값 정책 결정**: 앱 `@Default(true)` vs 서버 기본 false — "항상 신고와 함께 숨김"이 의도된 정책인지 확인 후 통일.
- **답변 알림 추가 여부 결정**: `HOST_REPLY_TO_REVIEW` NotificationType 추가 + ReviewService 알림 호출 추가. 사용자 경험 개선.
- **hide/unhide VO 반환 리팩터링**: 서버 아키텍처 규칙 위반(엔티티 직접 반환). 클라이언트 영향 없으나 서버 코드 품질 문제.
- **숨김된 리뷰의 별점 신뢰점수 처리**: `ReviewService.java:386` 주석 — "별점은 trust score에서 제외하지 않음(별도 결정)". 정책 결정 필요.
