# F11-01. 이벤트 리뷰 작성 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

참석이 확정되고 종료된 이벤트에 대해 사용자가 별점(1~5)과 텍스트 후기를 남기는 단일 엔드포인트다. 사전 조건(참석 확정 / 종료 시각 경과 / 7일 이내 / 자기-자신 아님 / 중복 없음)을 모두 통과해야 INSERT가 일어나고, 성공 시 호스트 신뢰점수 재계산과 호스트에게 NEW_REVIEW 푸시 알림, `UserInteraction`(EVENT/REVIEW) 누적이 부수적으로 실행된다.

### 2026-07-29 소스 재실측 — 선택형 이벤트 피드백과 분위기 태그

별점/텍스트 `Review`와 별도로, 현재 앱에는 `EventFeedbackController`의 **또 함께하고 싶은 사람 선택** 흐름이 있다. 이 흐름의 제출 계약은 다음과 같다.

- `GET /api/v1/events/{eventId}/feedback/candidates`로 서버가 확정한 후보와 제출 가능 상태를 받고, `POST /api/v1/events/{eventId}/feedback`에 `{ clientRequestId, displayedUserIds, choices, vibeTags }`를 보낸다.
- 이벤트 종료 후 7일 이내이며 호출자가 증거등급 참석자여야 한다. 체크인이 하나라도 있는 이벤트는 체크인 사용자만, 체크인이 전혀 없으면 `ATTENDING` 중 확정/이의중 노쇼가 아닌 사용자만 인정한다.
- 차단·본인·게스트를 제외한 후보가 2명 이상이어야 한다. 제출 때 `displayedUserIds`는 직전 후보 응답의 집합과 순서까지 정확히 같아야 한다. 선택은 0명도 가능하고 최대 `min(5, ceil(candidateCount / 2))`명이다.
- `vibeTags`는 선택 사항이며 최대 3개다. 허용 Enum은 `LIVELY`, `CALM`, `TALKATIVE`, `FOCUSED`, `WELCOMING`, `ORGANIZED`, `FREE_FLOWING`, `DRINKS_CENTERED` 8종이다. null/빈 목록은 허용하고 중복·null 원소·카탈로그 밖 값·4개 이상은 `INVALID_INPUT`이다.
- `EventFeedbackVo`에는 **내가 제출한** `vibeTags`만 포함된다. 받은 선택, 상대 제출 여부, 상호 선택 여부, 선택받은 횟수는 어떤 조회에도 노출하지 않는다.
- Flutter `event_feedback_screen.dart`는 8개 한국어 chip을 최대 3개까지 선택하게 하고, 네 번째 선택에서는 현재 상한을 토스트로 알린다.

현재 구현은 분위기 태그를 수집·본인 이력 반환까지만 한다. 집계나 이벤트 상세의 분위기 표시 API는 없다. 또한 `DataExportAsyncWorker.toEventFeedbackMap`은 `impressionTags`까지 내보내지만 `vibeTags`를 누락하므로 사용자 작성 원본의 export 범위 Gap이다.

실측 근거: `EventFeedbackController/Service`, `EventFeedbackSubmitParam`, `EventFeedbackVo`, `VibeTag`, Flutter `event_feedback_api.dart`, `event_feedback_screen.dart` 및 focused tests.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 화면(F03 도메인)에서 "리뷰 작성" 액션 → `context.push('/review-write/$eventId', extra: {'eventTitle': ...})`
- 이벤트 종료 푸시 알림(`EVENT_ENDED` 등) 탭 → 딥링크 라우팅으로 `Routes.reviewWrite` 진입
- 알림 센터(F-알림 도메인)에서 "리뷰 작성" CTA 탭

진입 시 `eventId`는 path parameter로, `eventTitle`은 `extra`로 전달되어 헤더 카드 폴백에 쓰인다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ReviewController`, `Review`, `NotificationService`, `TrustScoreService`, `ScoreHistoryService`. 앱: `review_write_screen.dart`, `routes.dart`.

## 3. 전체 동작 흐름

1. 화면 진입 시: `_EventSummaryCard`가 `eventDetailNotifierProvider(eventId)`를 watch → 캐시된 이벤트 상세를 그대로 사용 (네트워크 요청 없음 또는 1회). 폴백은 `eventTitle`.
2. "제출" 탭 시: `reviewWriteNotifierProvider(eventId).notifier.submitReview(rating, content)` (`presentation/review/screens/review_write_screen.dart:50-58`)
   → `ReviewRepository.createReview(eventId, ReviewParam(rating, content))`
   → Retrofit `ReviewApi.createReview` (`POST /api/v1/events/{eventId}/reviews`, body `ReviewParam`)
   → 성공: `Result.success(ReviewVo)` → state = `AsyncData(reviewVo)` 후 화면이 `context.pop(true)`로 종료, 호출자(이벤트 상세/리뷰 목록)는 `ref.invalidate`로 새로고침 가능.
   → 실패: `Result.failure(ApiError)` → 화면이 `_handleError(error)`에서 case별 토스트/다이얼로그 + 필요 시 `pop`.

## 4. 제품 규칙

- 작성 자격: 참석이 확정된 사람만, 모임이 끝난 뒤 7일 안에, 모임당 한 번, 호스트 본인은 제외한다. 삭제한 후기도 한 번 쓴 것으로 센다.
- 입력: 별점 1~5는 필수, 글은 선택이며 1000자까지다. 제출 버튼은 별점을 고르면 켜진다.
- 작성하면 호스트의 신뢰점수가 다시 계산되고, 호스트에게 새 후기 알림이 가며, 작성자의 활동 기록(추천 입력)이 쌓인다.
- 참석자가 아니거나, 이미 썼거나, 모임을 찾을 수 없으면 안내 후 화면을 닫는다. 그 밖의 오류는 화면에 남아 다시 시도할 수 있다.
- 쓰다가 나가려 하면 확인 창이 뜨고, 나가면 입력은 사라진다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | Happy Path — 참석자가 종료된 이벤트에 리뷰 작성 | - 로그인됨 (JWT 유효) | `Review` 1건 생성, 호스트 신뢰점수 갱신, `score_snapshot` 1건 추가(점수 변동 ≥ 1.0인 경우), 호스트 알림 1건. |
| S2 | 중복 작성 시도 — 같은 이벤트에 이미 리뷰가 있는 경우 | 같은 사용자/이벤트 조합의 리뷰가 있음(삭제한 리뷰도 포함). | 변화 없음. 사용자는 이전 화면으로 자동 복귀. |
| S3 | 미참석자 시도 — 이벤트에 참석하지 않은 사용자 | `EventAttendance` 없음 또는 status가 `ATTENDING` 아님. | INSERT 없음. |
| S4 | 7일 경과 — 작성 기간 만료 | `event.endTime + 7일 < now()`. | INSERT 없음. 사용자는 화면에 머무르며 다시 시도해도 같은 에러. |
| S5 | 호스트 본인이 자신의 이벤트에 리뷰 시도 | `event.hostUserId == loginUser.userId`. 참석 기록은 호스트 본인 참석 옵션에 따라 다양. | INSERT 없음. |
| S6 | 미저장 이탈 — 입력 후 뒤로가기 | 별점 또는 텍스트 변경됨 → `_hasChanges = true`. | INSERT 없음, 입력 내용은 휘발. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Gap | `DataExportAsyncWorker#toEventFeedbackMap` | 본인이 EventFeedback에 작성한 `vibeTags`는 조회 응답에 보존되지만 데이터 export map에서 누락된다. | event feedback export schema에 `vibeTags`를 추가하고 내보내기 회귀 테스트 보강 |

## 9. 수용 기준

- **AC-01. Happy Path — 참석자가 종료된 이벤트에 리뷰 작성**: Given - 로그인됨 (JWT 유효) When 사용자가 해당 흐름을 실행하면 Then `Review` 1건 생성, 호스트 신뢰점수 갱신, `score_snapshot` 1건 추가(점수 변동 ≥ 1.0인 경우), 호스트 알림 1건.
- **AC-02. 중복 작성 시도 — 같은 이벤트에 이미 리뷰가 있는 경우**: Given 같은 사용자/이벤트 조합의 리뷰가 있음(삭제한 리뷰도 포함). When 사용자가 해당 흐름을 실행하면 Then 변화 없음. 사용자는 이전 화면으로 자동 복귀.
- **AC-03. 미참석자 시도 — 이벤트에 참석하지 않은 사용자**: Given `EventAttendance` 없음 또는 status가 `ATTENDING` 아님. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-04. 7일 경과 — 작성 기간 만료**: Given `event.endTime + 7일 < now()`. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음. 사용자는 화면에 머무르며 다시 시도해도 같은 에러.
- **AC-05. 호스트 본인이 자신의 이벤트에 리뷰 시도**: Given `event.hostUserId == loginUser.userId`. 참석 기록은 호스트 본인 참석 옵션에 따라 다양. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-06. 미저장 이탈 — 입력 후 뒤로가기**: Given 별점 또는 텍스트 변경됨 → `_hasChanges = true`. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음, 입력 내용은 휘발.
