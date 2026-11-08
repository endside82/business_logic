# F11-07. 호스트 리뷰 모더레이션 (답변 · 임시 숨김) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- created: 2026-06-05; source: 2026-06-04 dossier 04 §2 실사 기반 신규 작성 -->

> 문서 상태: **실사 기반 신규 작성**. community_api HEAD / community_app HEAD 소스를 직접 확인한 후 작성했다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 호스트가 본인 이벤트에 달린 리뷰에 대해 두 가지 모더레이션 권한을 갖는다: **답변**과 **임시 숨김**.

답변은 리뷰 1건당 1개로 제한(1:1 관계)되며, 작성 후 24h 이내에만 수정 가능하다. 삭제 엔드포인트는 없다(소프트 딜리트 경로가 컨트롤러에 미노출). 임시 숨김은 6가지 사유코드 중 하나를 필수 선택하며, `autoEscalate=true` 전송 시 `ReportType.REVIEW` 신고가 서버에서 자동 생성된다(F11-04 연동). 숨김 해제(unhide)로 언제든 취소할 수 있다.

호스트 답변 수정은 앱에서 연결되어 있고, 서버가 수정을 받는 동안(24시간 이내)만 수정 메뉴가 보인다.
- 숨김 시 검토 요청 칸의 앱 기본값(켜짐)과 서버 기본값(꺼짐)이 다르다. 의도된 정책인지 확인이 필요하다(아래 Gap, 미결정 참조).

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ReviewController`, `ReviewService`, `ReviewReply`, `Review`, `ReviewReplyParam`, `ReviewHideParam`, `ReviewReplyVo`, `ReviewHideReasonCode`, `ErrorCode`, `NotificationType`. 앱: `review_list_screen.dart`, `review_api.dart`, `review_reply_vo.dart`, `review_reply_param.dart`, `review_hide_param.dart`, `review_hide_reason_code.dart`, `review_card.dart`, `review_reply_sheet.dart`, `review_hide_sheet.dart`, `review_write_provider.dart`.

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
   - 답변이 이미 있으면 같은 메뉴가 「답변 수정」으로 바뀌고 수정 시트가 열린다.
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

## 4. 제품 규칙

- 답변과 숨김은 해당 이벤트의 호스트만 할 수 있다. 호스트가 아니면 거절되고 앱에서는 더보기 메뉴 자체가 보이지 않는다.
- 답변은 후기당 하나이며 최대 1000자다. 작성한 뒤 24시간 안에만 고칠 수 있고, 지나면 거절된다. 답변을 지우는 기능은 없다.
- 답변을 달면 후기 작성자에게 「후기 답변」 알림이 간다(답변마다 한 통, 차단 관계면 억제).
- 숨김은 사유 6가지 중 하나가 필수다: 욕설/괴롭힘(HARASSMENT), 명예훼손(DEFAMATION), 광고/스팸(SPAM), 모임과 무관(OFF_TOPIC), 허위 후기(FAKE_REVIEW), 기타(OTHER). 자유 기재는 500자까지이고 어떤 사유에서도 필수가 아니다.
- 이미 숨긴 후기를 다시 숨기거나 숨기지 않은 후기를 해제하면 거절된다. 해제하면 숨김 사유와 시각이 모두 지워진다. 이미 만들어진 자동 신고는 그대로 남는다.
- 검토 요청을 켜면 호스트 이름의 후기 신고가 만들어진다(사유는 부적절한 콘텐츠). 허위 후기 사유면 우선 검토다. 호스트가 같은 후기를 이미 신고했다면 새로 만들지 않고, 종결된 신고만 있으면 숨김은 되되 검토 요청은 접수되지 않았다고 알린다.
- 후기를 숨기면 그 후기로 적립된 클럽 마일리지가 회수되고, 숨김을 해제해도 되살리지 않는다.
- 별점은 숨겨도 신뢰점수에서 빠지지 않는다. 숨김 사유 글(호스트 메모)은 후기 작성자 본인의 수정 응답에는 싣지 않는다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트(revieweeId==currentUserId), 답변 없음 | ReviewService: REVIEW_REPLY_ALREADY_EXISTS 없음 | onReply 콜백 활성 | 더보기 → "답변하기" 가능 | 정상 |
| 비호스트 | ReviewService: REVIEW_REPLY_NOT_HOST (403) | `_canModerateReview` false → 더보기 버튼 자체 미노출 | 더보기 없음 | 정상 |
| 호스트, 리뷰 숨김 안 됨 | POST /hide 허용 | onHide 콜백 활성 | 더보기 → "임시 숨김" 가능 | 정상 |
| 호스트, 이미 숨김 상태 | POST /hide → REVIEW_ALREADY_HIDDEN (409) | onHide → onUnhide로 전환 | 더보기 → "숨김 해제"만 노출 | 정상 |
| autoEscalate(앱 기본 ON, 시트에서 해제 가능) | ReviewService: Report 자동 생성 | `_autoEscalate=true` 기본값, CheckboxListTile으로 사용자가 해제 가능(해제 시 false 전송). FAKE_REVIEW 선택 시 true 초기화(해제 여전히 가능). 서버 기본값은 false. | autoEscalate=true이면 숨김과 함께 REVIEW 신고 자동 생성 | Gap — 사용자가 체크박스 해제를 인지하지 못하면 의도치 않게 true 전송 가능. 운영 정책 명확화 필요. |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| POST /reply 경로 | ReviewController:89 — 호스트 검증, 1회 제한, ReviewReplyVo 반환 | review_api.dart createReply → ReviewReplyNotifier | 정합 |
| PUT /reply 경로 | 24h 윈도우 검증, 지나면 `REVIEW_REPLY_EDIT_WINDOW_EXPIRED` | 답변이 있고 수정 가능 시각 안일 때만 카드 더보기에 「답변 수정」 이 보이고, 수정 시트(「답변 수정하기」)가 `updateReply` 를 부른다 | 정합 |
| ReviewHideParam.autoEscalate | 서버 기본 false | 앱 기본 true, 사용자가 체크박스로 해제 가능(해제 시 false 전송) | 앱 초기값 true이나 사용자가 명시적으로 해제 가능. 서버 기본값은 false. |
| 답변 알림 | 답변 저장 시 후기 작성자에게 후기 답변 알림 발송 | 없음 | 구현됨 |
| ReviewHideReasonCode 6값 | 서버 6값 (HARASSMENT/DEFAMATION/SPAM/OFF_TOPIC/FAKE_REVIEW/OTHER) | review_hide_reason_code.dart 6값 | 정합 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| Risk-M | `autoEscalate` 기본값 동작 | `review_hide_param.dart:12` `@Default(true)` vs 서버 `ReviewHideParam.autoEscalate = false`. 앱 초기값은 true이나 사용자가 체크박스로 해제 가능(해제 시 false 전송). 서버 기본값은 false. | 체크박스 해제를 인지하지 못한 사용자는 의도치 않게 autoEscalate=true 전송 가능 → FAKE_REVIEW 외 숨김에도 신고 자동 생성 위험 | 체크박스 UI 가시성 검토. 의도적 기본값이면 서버 기본값 통일 검토. |

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

- **autoEscalate 기본값 정책 결정**: 앱 `@Default(true)` vs 서버 기본 false — "항상 신고와 함께 숨김"이 의도된 정책인지 확인 후 통일.
- **숨김된 리뷰의 별점 신뢰점수 처리**: `ReviewService.java:386` 주석 — "별점은 trust score에서 제외하지 않음(별도 결정)". 정책 결정 필요.
