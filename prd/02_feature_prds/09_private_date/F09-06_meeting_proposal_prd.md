# F09-06. 만남 제안·상태 변경·본인 피드백 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험이나 실제 기기·외부 서비스 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 결론과 입구

매칭 당사자가 날짜·시간·장소를 제안하고 상대가 수락하거나 거절한다. 확정 후에는 취소 또는 완료할 수 있고, 완료된 만남에 각자 비공개 피드백을 한 번 제출한다. 서버 상태 변경 API와 앱 단추가 연결돼 있다.

채팅 상단의 만남 제안은 방의 actions.proposeMeeting이 허용하고 matchId가 확인될 때 `/dating/meeting/{matchId}`를 연다. 완료 피드백 알림도 matchId로 이 화면에 들어온다. 알림의 meetingId로 특정 완료 건을 선택하는 기능은 없고 화면은 가장 큰 ID의 완료 건을 선택한다.

## 코드 위치

서버 정본은 DateMeetingController/Service, DateMeetingFeedbackController/Service, DateAbilityPolicy와 DateMeeting·DateMeetingFeedback이다. 앱은 date_meeting_api/repository/provider, meeting_proposal_screen, date_meeting_feedback_sheet, notification_router와 dating_routes를 따른다.

<!-- source-references:start -->
서버 창구: `DateMeetingController#proposeMeeting`, `DateMeetingController#updateMeetingStatus`, `DateMeetingController#getMeetings`, `DateMeetingFeedbackController#submitFeedback`, `DateMeetingFeedbackController#getMyFeedbackStatus`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 공개 API와 자료

모든 창구는 DATING 공개 범위를 적용한다. 공통 경로는 `/api/v1/date/meetings`다.

| 메서드·경로 | 요청 | 응답 |
|---|---|---|
| POST 기본 경로 | matchId, meetingDate, meetingTime, locationName?, locationAddress?, locationLat?, locationLng?, note? | 201 DateMeetingVo |
| PATCH /{meetingId} | status 문자열 | 200 DateMeetingVo |
| GET /match/{matchId} | 없음 | List<DateMeetingVo> |
| POST /{meetingId}/feedback | 필수 Boolean meetAgain, 선택 Integer satisfaction 1~5 | 201 DateMeetingFeedbackVo |
| GET /{meetingId}/feedback/me | 없음 | 200 본인 제출 상태 |

DateMeetingVo는 id, matchId, proposedBy, 날짜·시간·장소 정보, status, note, createdAt/updatedAt와 actions.accept/cancel/complete를 담는다. DateMeetingFeedbackVo는 meetingId, submitted, meetAgain?, satisfaction?, createdAt?이며 상대 응답 여부·내용·상호 성사 결과는 없다.

## 제안 저장과 입력 범위

서버는 매치를 잠그고 존재·당사자·MATCHED 여부를 확인하며, 연결된 방이 있으면 ACTIVE여야 새 제안을 허용한다. 방 행 자체가 없을 때도 거절하는 조건은 아니다. 제안 시점의 별도 양방향 차단 검사는 저장 전 호출하지 않는다. 정상 차단 흐름은 매치를 BLOCKED로 바꾸므로 MATCHED 조건에서 막힌다.

날짜·시간은 DB 필수 열이다. 서비스의 명시적 입력 길이 검사는 장소 이름 200자·주소 500자다. 미래 시각·90일 한도·장소 비어 있음·메모 200자는 이 서비스의 공통 유효성 검사로 구현돼 있지 않다. 과거 문서의 앱 입력 제한을 서버 보장으로 확대하지 않는다.

제안은 매번 새 PROPOSED 행을 저장한다. 기존 제안이 있어도 24시간 대기나 단일 활성 제안 제한을 검사하지 않고, 제안 요청의 멱등 키도 없다. 응답을 잃은 뒤 새 요청하면 중복 제안이 생길 수 있다.

## 상태 변경과 닫힌 방

목록·상태 변경은 당사자·MATCHED·양방향 비차단을 확인한다. 변경은 만남 행을 잠그고 아래 전이를 판정한다.

| 현재 상태 | 허용 목표 | 추가 조건 |
|---|---|---|
| PROPOSED | CONFIRMED | 받은 사람만; 연결 방이 비활성이면 거절 |
| PROPOSED | CANCELLED | 양쪽 가능 |
| CONFIRMED | CANCELLED 또는 COMPLETED | 양쪽 가능 |
| CANCELLED 또는 COMPLETED | 없음 | 종료 후 재전이 불가 |

방이 비활성이어도 살아 있는 MATCHED·비차단 매치의 취소/완료까지 금지하지 않는다. 미래 약속을 완료할 수 없도록 날짜를 검사하거나 상대의 완료 동의를 추가로 받는 조건은 없다. CONFIRMED에서 COMPLETED로 바뀔 때 양쪽에 DATE_MEETING_FEEDBACK_REQUEST outbox를 만남 ID 기준으로 등록한다. 푸시 도착이나 상대의 응답 완료를 뜻하지 않는다.

## 앱 입력·결과·복귀

앱은 서울 날짜 기준 오늘부터 90일까지 날짜를 고르고 시간 기본값은 14:00이다. 일시 미선택·빈 장소는 제출 전에 막고 메모 입력은 200자다. 날짜는 날짜 문자열, 시간은 HH:mm:ss로 보내며 사용자가 고른 오늘의 과거 시각을 별도로 거절하지 않는다.

새 제안 단추는 방 목록의 actions.proposeMeeting에서 결정한다. 로딩/오류 때는 이전 허용 값으로 재전송하지 않으며 목록 조회 실패에는 재시도를 제공한다. 작성 변경과 제출/전이 중 상태는 UnsavedLeaveGuard가 관리한다. 성공하면 만남 목록을 갱신하고 완료된 제출로 화면을 닫는다. 실패하면 내용을 유지하고 거절 사유에 따라 방 목록을 다시 읽는다.

화면의 상태 카드는 PROPOSED/CONFIRMED 중 ID가 가장 큰 한 건이다. 단추는 서버 actions로 결정하고, 수락은 바로 요청하며 거절·취소·완료에는 확인 창을 먼저 연다. 변경 성공은 목록 재조회와 결과 안내, 권한 거절은 만남 목록 재판정으로 이어진다. 화면 복귀·차단/해제 신호도 만남 자료를 갱신한다.

확정 카드에는 “서로 약속을 확정했어요.”가 표시된다. 자동 위치 공유 안내와 단추는 제거돼 있다. 다만 “매칭한 지 3일”은 정적 문구이고 보낸 제안의 “24시간 내 응답이 없으면 새로 제안” 문구도 서버 시간 규칙을 나타내지 않는다.

## 완료 후 본인 피드백

제출은 해당 만남/매치의 당사자, COMPLETED, 아직 제출하지 않음, 양방향 비차단이 조건이다. 만남 ID·응답자 ID 고유 키가 중복 저장을 막는다. 비당사자는 DATE_MEETING_NOT_FOUND, 기존 응답은 DUPLICATE_RESOURCE, 차단은 DATE_USER_BLOCKED다. 신원 유효기간·프로필 활성·방 ACTIVE·매치 MATCHED를 제출 서비스가 추가로 요구하지 않는다.

본인 상태 GET은 당사자를 확인한 뒤 자신의 응답 또는 submitted=false를 돌려준다. GET 자체는 COMPLETED나 현재 차단 여부를 요구하지 않는다. 제출과 조회의 범위를 구분한다.

화면은 가장 큰 ID의 COMPLETED 건을 골라 본인 상태가 미제출일 때만 배너를 보여 준다. 피드백 시트는 meetAgain 선택이 필수이고 만족도 1~5는 선택이다. 시트가 입력값을 반환하며 먼저 닫힌 뒤 실제 제출을 수행한다. 따라서 전송 실패 후 이전 선택을 유지한 열린 시트가 남는 구조는 아니다. 성공과 모든 conflict 오류는 상태를 재조회하며 conflict는 “이미 응답한 만남”으로 안내한다. 최초 상태 조회 실패는 배너를 숨긴다.

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 서버는 미래/90일·필수 장소·메모 200자 검사를 앱과 동일하게 적용하지 않는다. | DB 필수 열·앱 입력 제한·서비스 검사를 분리한다. |
| Gap | 정적 “3일”·“24시간” 설명과 실제 재제안 조건이 다르다. | 시간 정책 완료로 판정하지 않는다. |
| Risk | 제안의 멱등 키·단일 활성 제안 제한이 없고 완료 시각 조건도 없다. | 재전송 중복과 일찍 완료 가능한 범위를 남긴다. |
| Gap | 피드백 알림은 meetingId를 선택하지 않고 최신 완료 한 건만 보여 준다. | 이전 완료 건의 미응답 접근이 보장되지 않는다. |
| Gap | 피드백 시트가 전송 전에 닫히고 조회 오류는 배너를 숨긴다. | 실패 입력 보존·오류 재시도 입구가 완료됐다고 쓰지 않는다. |
| Risk | 닫힌 방 전용 문구는 목록에 비활성 방 행이 있어야 보이나 실제 목록 API는 ACTIVE만 반환한다. | 방 누락 시에도 전용 문구가 반드시 보인다고 쓰지 않는다. |
| 미검증 | 실제 두 계정 전이·경쟁 요청·푸시·차단 후 접근은 실행하지 않았다. | 소스 계약과 실행 결과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 입구:** 채팅 actions와 완료 알림의 matchId 진입, 최신 완료 건 선택을 구분한다.
- **AC-02 제안:** 당사자/MATCHED/연결 방 조건과 앱·서비스·DB 입력 제한의 차이를 명시한다.
- **AC-03 전이:** 받은 사람 수락, 취소/완료 권한, 종료 후 재전이 금지와 닫힌 방 예외를 설명한다.
- **AC-04 복귀:** 작성 보호·성공 후 목록 갱신/닫기·거절 후 현재 actions 재판정을 기록한다.
- **AC-05 시간:** 서울 날짜 입력, 정적 시간 문구, 재제안/완료 시각 검사 부재를 구분한다.
- **AC-06 피드백:** 본인 전용 자료·제출과 조회 권한 차이·선택 만족도·고유 키를 확인한다.
- **AC-07 실패:** 전송 전 시트 닫기·conflict 재조회·조회 실패 배너 숨김·이전 완료 건 접근 한계를 명시한다.

위 기준은 소스 대조와 후속 검증 항목이며 새 제품 실행 통과 수가 아니다.
