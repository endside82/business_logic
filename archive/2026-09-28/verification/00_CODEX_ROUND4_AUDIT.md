# Codex 4차 라운드 감사 보고서

## 임무 1: check_format
- 실행: `cd /Users/kyle/source/09.community/business_logic && bash verification/check_format.sh`
- exit code: 0
- 결과: `OK — 위반 없음`
- 출처 적절성: sample 5건 모두 실제 `community_app/integration_test/` 파일을 가리키며, 시나리오 내용과 테스트 mode/route가 맞았다.

| sample | 문서 출처 | 실제 테스트 확인 |
|---|---|---|
| F03-11 wishlist | `integration_test/seed_event_wishlist_toggle_test.dart` | `E2E_SCENARIO_MODE=add/remove/list_view` 3분기 존재, `/home/events/1312`, `/profile/wishlist` 흐름과 일치 |
| F04-14 donation | `seed_club_subscription_donation_test.dart`, `seed_club_finance_route_test.dart` | `member_donation_surface`, finance route surface가 실제 파일에 존재 |
| F01-04 password-reset | `seed_auth_recovery_onboarding_test.dart` | `password_reset_request_success`, `password_reset_confirm_validation` 분기 존재 |
| F08-10 market item detail | `seed_market_plan_state_test.dart`, `seed_market_discovery_funnel_test.dart` | `/home/market/$planId`, `market_creator_plan_handoff` 흐름 존재 |
| F02-01 home feed | `seed_home_club_empty_state_test.dart` | `popular_club_section_empty_surface` 빈 상태 surface 검증 존재 |

## 임무 2: F11-03 UI 실 코드
- 더보기 메뉴: ✅ `review_card.dart`에서 owner action이 있을 때 `Icons.more_vert`를 노출하고 `showModalBottomSheet`로 `수정`/`삭제` 액션을 제공한다.
- delete UI: ✅ `review_list_screen.dart`가 owner 리뷰에 `onDelete`를 주입하고 삭제 확인/삭제 notifier/list invalidate 흐름을 갖는다.
- edit 모드 PATCH: ✅ `review_write_screen.dart`가 `editReviewId != null`이면 `reviewEditNotifierProvider(...).updateReview(...)`를 호출하고, `ReviewApi.updateReview`는 서버 `PATCH /api/v1/reviews/{id}`와 일치한다.
- 라우터: ✅ `Routes.reviewEdit = '/reviews/:reviewId/edit'`, `app_router.dart`에 standalone route 등록. 카드 액션은 `Routes.reviewEditPath(review.id)` + `extra: review`로 진입한다.
- analyze: ✅ `flutter analyze lib/presentation/review/` exit code 0, `No issues found!`
- 잔여 리스크: 직접 URL로 `/reviews/:reviewId/edit`에 들어가 `extra`가 없으면 event summary는 `eventId=0` fetch 후 fallback이 없어서 비어 보일 수 있다. 카드에서 진입하는 정상 경로는 문제 없다.

## 임무 3: F03-11 E2E
- 3 modes 분기: ✅ `seed_event_wishlist_toggle_test.dart`의 `switch (scenarioMode)`가 `add`, `remove`, `list_view`를 분기한다.
- 실서버: ✅ test header에 `localhost:38082, ENV=dev, mock 없음`이 명시되어 있고, `pumpCommunityApp()`은 override 없이 실제 `CommunityApp`을 부팅한다. `loginWithSeed`도 실제 auth provider 경유.
- 멱등성: ✅ `add`는 시작 전 ON이면 DELETE로 OFF 정리, `remove`는 OFF면 POST로 ON 준비, `list_view`는 먼저 detail에서 add 보장 후 `/profile/wishlist` 진입.
- 서버 계약: ✅ `WishlistController`에 `POST /api/v1/events/{eventId}/wishlist`, `DELETE /api/v1/events/{eventId}/wishlist`, `GET /api/v1/users/me/wishlist`가 실제 존재한다.
- analyze: ✅ `flutter analyze integration_test/seed_event_wishlist_toggle_test.dart` exit code 0, `No issues found!`

## 임무 4: enum_sync 45건 분류 (CRITICAL)
- 요청 명령: `bash .../check_enum_sync.sh 2>&1 | head -50`는 pipe 특성상 exit code 0으로 끝난다.
- 전체 명령: `bash business_logic/verification/check_enum_sync.sh`는 exit code 1, `FAIL -- 45 violation(s) found`.
- 집계 기준: 스크립트의 45개 token group 기준. 한 token group 안에 정상 사용처와 버그 사용처가 섞이면, 수정 필요한 위치가 있으므로 `YES/PARTIAL`로 계산했다.

| 카테고리 | 위치 | 진짜 버그인가? | 권장 수정 |
|---|---:|---|---|
| ACCEPTED | 1건 | YES | 서버 `ApplicationStatus`는 `APPROVED`; `application_status.dart`의 `ACCEPTED` alias 제거 |
| ALREADY | 1건 | NO | `api_error.dart` 메시지 substring classifier. whitelist |
| APPEAL_ | 1건 | NO | audit action prefix. whitelist |
| BRONZE | 3건 | NO | `TrustScoreService.determineGrade()`가 반환하는 string grade. enum 아님 |
| CANNOT | 1건 | NO | `api_error.dart` classifier. whitelist |
| CLOSE | 2건 | NO | Daum postcode JS bridge message. 서버 enum 아님 |
| CREDIT_CARD | 2건 | NO | club finance payment sheet local UI string. 현재 서버로 전송되지 않음 |
| ENDED | 6건 | YES/PARTIAL | `event_viewer_status`의 `ENDED`는 서버 derived string이라 정상. 그러나 `club_event_list_status_filter.dart`/`event_status_tabs.dart`의 `status=ENDED`는 서버 `EventStatus.valueOf`에 실패하므로 수정 |
| EXHAUSTED | 1건 | NO | `api_error.dart` classifier. whitelist |
| FORCE_CLOSE | 1건 | NO | Daum postcode JS callback. whitelist |
| INTERNAL | 1건 | NO | `api_error.dart` classifier. whitelist |
| INVALID_ACK | 15건 | NO | socket client synthetic error. 서버 enum 아님 |
| INVALID_STATUS | 1건 | NO | `api_error.dart` classifier. whitelist |
| ITEM_ | 1건 | NO | audit action prefix. whitelist |
| LIMIT_EXCEEDED | 1건 | NO | `api_error.dart` classifier. whitelist |
| NEGATIVE_ | 3건 | NO | taste tag label prefix 제거용 string. whitelist |
| NOT_ACTIVE | 1건 | NO | `api_error.dart` classifier. whitelist |
| NOT_ALLOWED | 1건 | NO | `api_error.dart` classifier. whitelist |
| NOT_ATTENDING | 1건 | NO | `EventViewerContextService`가 반환하는 derived string. enum 아님 |
| NOT_AUTHORIZED | 1건 | NO | 서버 HTTP/auth code는 `UNAUTHORIZED`; 이 값은 `api_error.dart` classifier substring일 뿐 |
| NOT_DRAFT | 1건 | NO | `api_error.dart` classifier. whitelist |
| NOT_OPEN | 1건 | NO | `api_error.dart` classifier. whitelist |
| NOT_OWNER | 1건 | NO | `api_error.dart` classifier. whitelist |
| NOT_PUBLISHED | 1건 | NO | `api_error.dart` classifier. whitelist |
| NO_PERMISSION | 1건 | NO | `api_error.dart` classifier. whitelist |
| ONGOING | 2건 | YES | club event list가 `status=ONGOING`을 서버에 전송하지만 서버는 `EventStatus.valueOf(status)`만 지원 |
| PLATINUM | 3건 | NO | trust score grade string. enum 아님 |
| PREPAYMENT_ | 1건 | NO | audit action prefix. whitelist |
| PUBLIC | 15건 | NO | 서버 `EventVisibility.PUBLIC`, `Visibility.PUBLIC`가 실제 존재. 스크립트 extractor가 `PUBLIC`/`PRIVATE`를 Java modifier로 무조건 제외하는 FP |
| QUARTER | 1건 | NO | `EarningsPeriod` UI tab 값. 현재 서버 요청에 쓰이지 않음 |
| ROOM_FORBIDDEN | 1건 | NO | `community-realtime` `DateChatErrorCode` 및 socket contract 값. 스크립트 범위 밖 |
| SETTLEMENT_ | 1건 | NO | audit action prefix. whitelist |
| SHARE_ | 1건 | NO | audit action prefix. whitelist |
| SILVER | 3건 | NO | trust score grade string. enum 아님 |
| STOPPED | 2건 | YES | 서버 `ItemStatus`는 `STOP_SELLING`; `market_item_edit_screen.dart`의 `STOPPED` badge/action 조건 수정 필요 |
| THIS_MONTH | 1건 | NO | recommend events client-side date filter. 서버 요청에 쓰이지 않음 |
| TIMEOUT | 2건 | NO | socket synthetic + `api_error.dart` classifier. 서버 enum 아님 |
| TOO_MANY | 1건 | NO | `api_error.dart` classifier. whitelist |
| TRANSFER_ | 1건 | NO | audit action prefix. whitelist |
| UPCOMING | 2건 | YES | club event list가 `status=UPCOMING`을 서버에 전송하지만 서버 `EventStatus`에 없음 |
| USER_CANCEL | 1건 | NO | PG webview local failure code. 서버 enum 아님 |
| VALIDATION | 1건 | NO | `api_error.dart` classifier. whitelist |
| WAITLIST | 5건 | YES/PARTIAL | `ClubJoinResultVo.resultType="WAITLIST"`는 정상. 하지만 attendance/status mapper 쪽은 서버 실제 값 `WAITING` 기준으로 정리해야 함 |
| WAITLISTED | 4건 | YES/PARTIAL | 서버 `AttendanceStatus`는 `WAITING`; `ClubEventAttendanceStatus.fromString`이 `WAITING`을 받지 않아 대기열 상태가 `notAttending`으로 떨어질 수 있음 |
| WALLET | 2건 | NO | club finance payment sheet local UI string. 현재 서버로 전송되지 않음 |

진짜 버그 7건 / False positive 38건

### enum_sync 핵심 판정
- **WAITLIST / WAITLISTED**: 9개 위치 전부를 기계적으로 `WAITING`으로 바꾸면 안 된다. `ClubJoinResultType.waitlist('WAITLIST')`는 서버 `JoinResultVo`가 실제로 반환하는 정상 string이다. 다만 event attendance/viewer 계열은 서버 attendance enum `WAITING`을 기준으로 정렬해야 하며, 특히 `ClubEventAttendanceStatus.fromString`은 현재 `WAITING`을 인식하지 못한다.
- **CLOSE vs CLOSED**: false positive. `CLOSE`/`FORCE_CLOSE`는 Daum postcode WebView bridge용 client message다. 서버 `EventStatus.CLOSED`와 무관하다.
- **STOPPED vs STOP**: true bug. closest `STOP`은 `UserStatus.STOP`이라 무관하고, 실제 비교 대상은 `ItemStatus.STOP_SELLING`이다.
- **NOT_AUTHORIZED vs UNAUTHORIZED**: false positive. 서버 `ErrorCode.UNAUTHORIZED`는 HTTP/auth 코드이고, `NOT_AUTHORIZED`는 fallback classifier substring이다.
- **ENDED / ONGOING / UPCOMING**: mixed. `ENDED` 자체는 서버 viewer context derived string으로 정상 사용처가 있다. 그러나 club event list filter의 `UPCOMING/ONGOING/ENDED`는 query param으로 서버에 전달되고 서버는 `EventStatus.valueOf`를 호출하므로 실제 버그다.

### enum_sync 스크립트 개선 권장
- Java enum extractor에서 `PUBLIC`/`PRIVATE`를 항상 제외하지 말 것. 현재 이 로직 때문에 실제 서버 enum 값 `EventVisibility.PUBLIC`, `Visibility.PUBLIC`, `...PRIVATE`가 Java known set에서 빠진다.
- whitelist를 한 덩어리로 늘리기보다 카테고리별 allowlist를 분리할 것: `api_error.dart` classifier fragments, audit prefixes, socket/realtime error codes, external WebView messages, UI-only filter labels.
- 서버 enum 외에도 서버가 string contract로 반환하는 값(`TrustScore.grade`, `EventViewerContextService.resolveMyAttendanceStatus`, `JoinResultVo.resultType`)은 별도 known-contract set으로 관리해야 한다.
- `market_item_edit_screen.dart`는 enum_sync가 잡은 `STOPPED` 외에도 `DRAFT`/`PUBLISHED` alias가 섞여 있다. 서버 `ItemStatus` 기준 `READY/ON_SALE/STOP_SELLING/REMOVED`로 별도 정렬 필요.

## 임무 5: location_privacy
- 분기 B 적절성: ✅
- 코드 상태: ✅ `LocationPrivacyScreen`은 `app_router.dart`의 `Routes.eventLocationPrivacy = 'privacy'` 자식 라우트로 등록되어 있고, `event_location_screen.dart` AppBar 톱니바퀴에서 `/home/events/{eventId}/location/privacy`로 실제 진입한다.
- 서버 상태: ✅ `LocationController#getPrivacyDashboard`가 `GET /api/v1/events/{eventId}/location/privacy`를 제공하고 `LocationPrivacyVo`도 존재한다.
- F14-04 frontend.md 정정: ✅ 보존 결정과 stale generated artifact 설명은 맞다. 현재 `event_location_api.dart`와 `event_location_api.g.dart`에는 `getPrivacyDashboard` 잔여가 없어서 stale `.g.dart` 문제는 이미 해소된 상태다.

## 종합
- 신뢰도: 높음
- 다른 임무 상태: check_format, F11-03 UI, F03-11 E2E, location_privacy는 독립 검증 기준 통과.
- 추가 발견: enum_sync의 45건 중 대부분은 false positive지만, club event list filter와 market item status는 실제 user-facing 동작 오류 가능성이 높다.
- 즉시 수정 권장:
  1. `ClubEventListStatusFilter`/`event_status_tabs`의 `UPCOMING/ONGOING/ENDED`를 서버 지원 값 또는 client-side filter로 재설계.
  2. `ClubEventAttendanceStatus`가 서버 실제 `WAITING`을 인식하도록 수정하고 `WAITLISTED` alias 정리.
  3. `market_item_edit_screen.dart`의 item status 조건/라벨을 `READY/ON_SALE/STOP_SELLING/REMOVED`로 정렬.
  4. `application_status.dart`의 `ACCEPTED` alias 제거.
  5. `check_enum_sync.sh` extractor/whitelist를 위 분류 기준으로 보정.
