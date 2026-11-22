# F17-02. 정기모임 상세·참여 상태·회차 정보 PRD

<!-- release-document: reference -->
2026-11-22 서버·앱 소스 대조 문서다. 새 제품 실행·브라우저·실기기 검수 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 서버 계약

상세와 회차·공개 콘텐츠는 비로그인 GET을 허용한다. 개인 등록, 결제, 호스트 카드, 후기, 참가자 준비 자료는 인증이 필요하다. Controller의 nullable principal뿐 아니라 SecurityConfiguration의 실제 경로 규칙을 기준으로 구분한다.

| 요청 | 응답·경계 |
|---|---|
| GET /api/v1/regular-meetings/{id} | RegularMeetingVo: 본체·host·등록 수·sessions |
| GET /api/v1/regular-meetings/{id}/events | List<RegularMeetingEventVo>; includeHistory 기본 false |
| GET /api/v1/regular-meetings/{id}/members/me | 본인의 RegularMeetingMemberVo; 미등록은 ENROLLMENT_INVALID_STATUS |
| GET /api/v1/regular-meetings/{id}/host-card | EventHostCardVo; 모임 가시성 확인 후 기존 호스트 카드 서비스 호출 |
| GET /api/v1/regular-meetings/{id}/content | RegularMeetingContentVo: 소개와 공개 회차 준비 요약 |
| GET /api/v1/regular-meetings/{id}/events/{eventId}/preparation | 참가 자격을 확인한 준비 안내·자료 URL·중요 변경 이력 |
| GET /api/v1/regular-meetings/{id}/reviews | RegularMeetingReviewPageVo: scope·summary·reviews Page |

DRAFT, 발행한 적 없는 CANCELED, 숨김 모임은 현재 호스트만 조회할 수 있다. 다른 이용자는 `REGULAR_MEETING_NOT_FOUND`를 받는다. 발행 뒤 CLOSED/CANCELED가 된 모임은 이 가시성 규칙만으로 차단하지 않는다.

상세의 `host` JSON 필드는 앱 `@JsonKey(name: 'host') bool isHost`로 받는다. 금액은 서버 BigDecimal, 앱 double 변환이다. 본인의 등록 상태는 본체에 합쳐 있지 않으며 별도 조회한다. 해당 조회의 BadRequest와 정확한 `ENROLLMENT_INVALID_STATUS`만 앱에서 null로 바꾸고, 인증·권한·통신 오류는 그대로 실패로 처리한다.

## 장소와 익명 정보 가림

익명 상세는 본체 `addressDetail`, `onlineUrl`, 회차 `onlineUrl`을 null로 만들고 `hostBankAccountBound`를 false로 가린다. 기본 주소·지역까지 모두 감추는 정책은 아니다. 공개 콘텐츠에서는 익명에게 `preparationText`를 가린다.

앱은 오프라인 주소가 없으면 장소 미정, 비로그인 이용자에게는 상세 주소·온라인 주소의 로그인 안내를 표시한다. 로그인 상태의 일반 상세 열람과 참가 자격이 필요한 준비 자료 열람을 구분한다.

## 참가자가 판단하고 다음 행동으로 이동하는 화면

상단은 제목·모집 상태, 요약과 내 참여 상태를 제공하고 소개·전체 일정·호스트·후기·정책으로 이어진다. 비호스트의 주 행동은 하단 고정 영역에 한 번 배치한다. 본문의 참여 카드는 상태 설명과 취소 입구를 표시하며 같은 주 행동 단추를 반복하지 않는다. 호스트 상단에는 참가자 미리보기 전환이 있다. 이 기능은 본체의 isHost 표시를 바꾸는 미리보기이며 새 익명 HTTP 세션 검증을 뜻하지 않는다.

| 조회 상태 | 앱의 다음 행동 |
|---|---|
| OPEN 이외 | 상태·종료/취소 안내, 새 신청 없음 |
| VARIABLE OPEN | 가능한 일정이 있으면 일정 목록으로 이동 |
| FIXED 미등록 | 예정 일정이 있으면 전체 과정 신청; 인증 실패는 로그인 안내 |
| PENDING / WAITING | 승인 대기 / 순번을 포함한 정원 대기, 본문에서 취소 |
| APPROVED_PENDING_PAYMENT | 납부 안내·기한 또는 입금 신고 후 호스트 확인 대기 |
| ENROLLED | 가장 이른 유효 OPEN 일정의 준비 안내, 본문에서 등록 취소·환불 요청 |
| CANCELED / PAYMENT_EXPIRED / REJECTED | 가능한 일정이 있으면 다시 신청 |
| FORFEITED | 참여 제한 안내, 재신청 없음 |
| 조회 실패 | 재시도 또는 로그인 안내; 미신청으로 바꾸지 않음 |

다음 행동에 쓰는 회차는 활성 OPEN이며 종료 시각(없으면 시작 시각)이 아직 지나지 않은 회차 중 시작 시각이 가장 이른 항목이다. 이미 시작했지만 끝나지 않은 회차도 포함할 수 있어 ‘시작 전 회차만’으로 설명하지 않는다. 납부 내역이 PAID/REFUND_REQUESTED인데 등록 상태가 아직 결제 대기라면 최신 상태를 재조회한다. 기한 경과도 서버 상태 재조회를 제공한다.

신청·납부·준비 안내에서 돌아오면 참여/납부/상세 정보를 갱신한다. 당겨 새로고침은 상세와 콘텐츠·준비·호스트·후기를 함께 갱신한다. 호스트는 상태에 따라 기본 수정, 공개, 일정 추가, 장소 변경, 모집 종료, 취소, VARIABLE 다시 열기를 제공하며 멤버 관리와 FIXED 정산 상태로 연결된다. 상세 동작의 실제 명령 조건은 [모집 상태 관리](F17-04_regular-meeting-lifecycle_prd.md), [회차 관리](F17-05_regular-meeting-sessions_prd.md), [등록](F17-06_regular-meeting-enrollment_prd.md), [납부](F17-07_regular-meeting-payment_prd.md), [환불](F17-08_regular-meeting-refund_prd.md)을 따른다.

## 회차 활동과 진행 경험으로 판단하기

상세 sessions는 ‘상위 N개’가 아니다. 현재 구현은 조건에 맞는 연결 회차 목록을 순번순으로 구성하며 별도 페이지 제한이 없다. 호스트 상세는 취소 이력까지 포함한다. 비호스트 상세는 PUBLIC·비DRAFT 회차 중 취소되지 않은 회차를 포함한다. 별도 `/events?includeHistory=true`를 요청하면 비호스트도 발행 뒤 취소된 공개 회차 이력을 받을 수 있다. 비공개·발행 전 취소 회차는 이 옵션으로 열리지 않는다.

전체 일정에서 가장 가까운 시작 전 OPEN 회차 설명을 먼저 펼친다. 활성 회차 카드는 일반 이벤트 상세를 열고, 취소 회차는 같은 순번의 활성 대체 회차가 있으면 그 회차로 연결한다. 내부 생성·출석 확정 배지는 모임 호스트 또는 해당 회차 호스트에게만 표시한다. 후자는 모임 호스트와 다를 수 있다.

호스트 카드의 allowedActions에 OPEN_PROFILE이 있을 때 프로필 입구·공개 진행 완료 횟수·신뢰점수를 표시한다. 축소 응답에서는 이름·사진만 안내한다. 프로필에서 돌아오면 카드와 후기를 다시 읽는다. 신뢰점수와 후기 평점은 서로 다른 지표다.

## 소개 재사용·본인용 선호·준비 안내 자동화

공개 소개는 짧은 소개·대상·활동·경험 수준·기대 경험·호스트 경험·포함/별도 비용을 표시한다. 예상 추가 비용과 아직 미정인 비용을 구분한다. 공개 회차 준비 요약과 참가자 전용 자료 URL은 다른 조회다. 준비 자료는 모임 호스트 또는 서버의 참여 확정·회차 열람 조건을 통과한 이용자에게만 반환한다. 중요한 변경 이력은 최근 20개다.

로그인한 비호스트에게 본인 선호 비교 영역을 제공한다. 비교 계산은 관심 분야와 가장 가까운 시작 전 회차의 시간·모집 정원을 사용한다. 실제 참석 인원이나 공개 성향 점수로 설명하지 않는다. 소개·준비 작성 입구는 DRAFT/OPEN 호스트에게 보인다. 콘텐츠 쓰기와 자동 안내의 상세 정책·과거 실행 결과는 기존 개선 계획 및 아래 과거 기록의 범위이며, 이번 조회 대조로 전송 성공을 재확인한 것은 아니다.

## 회차 후기와 다른 모임 후기를 구별하기

`THIS_MEETING`은 이 정기모임 회차의 후기, `HOST_OTHER_EVENTS`는 현재 호스트가 다른 모임에서 받은 후기다. summary는 후기 건수·서로 다른 작성자 수·평균이다. 회차 호스트 평가를 과정 전체 수료 평가로 안내하지 않는다. 목록은 작성일·id 내림차순이다.

서버 목록·집계에는 삭제·비활성·임시 숨김 후기, 비공개·숨김·OPEN/CLOSED 이외 이벤트, 숨김·미발행 부모, 차단한 작성자·평가 대상·회차 호스트와 평가 대상 열람 권한을 반영한다. 다른 모임 범위의 대상 호스트를 볼 수 없으면 USER_NOT_FOUND로 거절한다.

앱은 같은 과정 요약과 본문 최신 3건, 다른 모임 최신 3건을 분리한다. 각 카드에서 해당 scope의 전체 후기 화면으로 이동한다. 로그인 필요·조회 실패·빈 후기를 구분하고 다른 모임 평점으로 빈 과정을 대체하지 않는다. 프로필 또는 전체 후기에서 돌아오면 관련 후기를 갱신한다.

## 코드 위치

서버: RegularMeetingController, RegularMeetingService, RegularMeetingReadPolicy/ReadSupport, RegularMeetingQueryRepository, RegularMeetingEnrollmentService#getMyMembership, RegularMeetingContentController/Service, RegularMeetingReviewController/Service/QueryRepository, SecurityConfiguration. 앱: regular_meeting_api.dart, regular_meeting_vo.dart, regular_meeting_detail_provider.dart, regular_meeting_reviews_provider.dart, regular_meeting_detail_screen.dart 및 regular_meeting_participation/content/host/reviews/preferences.dart, regular_meeting_routes.dart.

<!-- source-references:start -->
서버 창구: `RegularMeetingController#get`, `RegularMeetingController#sessions`, `RegularMeetingController#myMembership`, `RegularMeetingController#hostCard`, `RegularMeetingContentController#content`, `RegularMeetingContentController#preparation`, `RegularMeetingReviewController#reviews`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 상세 회차 목록에 페이지 제한이 없다. | 상위 N개 요약이라고 설명하지 않는다. |
| Risk | 참가자 미리보기는 호스트가 받은 응답의 표시 전환이다. | 비로그인 권한·자료 가림 검증을 대신하지 않는다. |
| Risk | 회차 설명 자동 펼침은 시작 전 기준, 다음 행동은 종료 전 기준이다. | 진행 중 회차의 행동을 잘못 숨기거나 문서에서 배제하지 않는다. |
| 미검증 | 이번에는 실제 로그인 복귀·신청/납부 왕복·자료 접근·화면 배치를 실행하지 않았다. | 소스 연결과 실행 통과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 공개와 인증:** 공개 상세·회차·콘텐츠와 인증이 필요한 개인/호스트/후기/자료 조회를 구분한다.
- **AC-02 가시성과 가림:** 초안·미발행 취소·숨김의 호스트 예외와 익명 필드 가림을 적용한다.
- **AC-03 회차 이력:** 호스트 전체 이력, 비호스트 공개 이력과 includeHistory의 범위를 설명한다.
- **AC-04 참여 분기:** 승인 대기·정원 대기·납부·입금 확인·등록 완료·재신청·참여 제한을 구분한다.
- **AC-05 오류 분리:** 정확한 미등록 오류만 null로 처리하고 인증·통신 오류에는 재시도/로그인 안내를 제공한다.
- **AC-06 행동과 복귀:** 하단 주 행동과 본문 취소 입구를 구분하고 왕복 후 관련 조회 갱신을 연결한다.
- **AC-07 준비 자료:** 공개 요약과 참여 자격이 필요한 자료·중요 변경 20개를 분리한다.
- **AC-08 후기 범위:** 같은 과정과 다른 모임, 후기 수와 작성자 수, 공개/차단 조건을 각각 설명한다.
- **AC-09 호스트와 미리보기:** allowedActions 기반 프로필 표시와 표시 전환인 미리보기의 한계를 구분한다.

현재 근거는 서버·앱 소스다. 기존 실행 기록은 아래에 보존하며 새 시험 통과 수에 합산하지 않는다.

## 과거 실행 기록의 보존

아래는 이전 문서의 당시 기록이다. 이번 소스 대조의 실행 근거로 합산하지 않으며 현재 계약은 위 본문을 따른다.

> 2026-10-01 `RM-UX-04~06` 구현·로컬 검증을 마쳤고, 2026-10-02 현재 API·앱·관리자 API main에 반영했다. 저장소별 커밋과 검증 소스 대조 기록 (Git 이력)에 병합 시 재검증 결과를, 실제 연동·기존 데이터 보존·화면 점검 결과 (Git 이력)에 기존 검증 범위·한계를 남긴다.
>
> - 직원 인터뷰·대표 후기 선정·준비 검수·개별 독촉을 추가하지 않는다. 실제 앱/HTTP 자동 왕복과 기존 데이터 보존형 적용을 통과했다. 수동 브라우저 접근 제한, 렌더링 시각 점검과 출시 검증의 구분은 전체 완료 점검 (Git 이력)을 따른다.
