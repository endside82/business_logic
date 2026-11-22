# F17-05. 정기모임 회차 생성·반복·대체·취소 PRD

<!-- release-document: reference -->
2026-11-22 서버·앱 소스 대조 문서다. 새 실행·브라우저·실기기 검수 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 구조

각 회차는 독립 이벤트이며 정기모임 연결 행이 순번·원본/대체 관계와 생성·출석 확정 상태를 보유한다. 생성 이벤트는 REGULAR_MEETING, PUBLIC, Asia/Seoul을 사용하고 모임의 호스트·카테고리·장소·썸네일·환불 정책을 물려받는다. 모임이 DRAFT이면 회차도 DRAFT, OPEN이면 새 회차도 OPEN이다.

FIXED는 본체 단위 등록·결제이며 회차 가격은 0이고 단독 신청 차단 컨텍스트를 반환한다. VARIABLE은 본체 가격·정원이 0이며 회차에서 정원·가격을 정한다. 회차의 일반 이벤트 상세 연결과 공개 이력은 [정기모임 상세](F17-02_regular-meeting-detail_prd.md#회차-활동과-진행-경험으로-판단하기)를 따른다.

## 현재 서버 계약

| 요청 | 입력·키 | 결과 |
|---|---|---|
| POST /api/v1/regular-meetings/{id}/events | RegularMeetingSessionAddParam, Idempotency-Key 필수 | 201 EventVo |
| POST /api/v1/regular-meetings/{id}/events/generate | RegularMeetingSessionGenerateParam, Idempotency-Key 필수 | 201 List<Long> |
| POST /api/v1/regular-meetings/{id}/events/{eventId}/replace | RegularMeetingSessionReplaceParam, Idempotency-Key 필수 | 200 EventVo |
| DELETE /api/v1/regular-meetings/{id}/events/{eventId} | 모임·회차 ID, 키 없음 | 204 |
| GET /api/v1/regular-meetings/{id}/events | includeHistory 기본 false | List<RegularMeetingEventVo> |

`addSessionsBulk`는 반복 생성에서 쓰는 서비스 내부 함수다. 현재 회원 Controller에는 임의 목록을 받는 `/events/bulk`가 없다. 내부 함수의 존재를 회원 API 지원으로 설명하지 않는다. 앱에도 임의 목록 bulk 입구가 없다.

단건·대체 입력은 title, description, startTime, endTime, baseCapacity, price, refundPolicyCode, refundDeadlineHours다. 반복은 시작/종료 대신 firstStartTime/firstEndTime, cadence, count를 받는다. 금액은 서버 BigDecimal, 앱 double?이며 원화 입력은 정수로 검증한다. 앱의 대체 요청은 전용 ReplaceParam을 사용한다.

제목은 공백 아닌 최대 200자, 시작은 현재 이후, 종료는 시작보다 뒤여야 한다. 정원 override를 보냈다면 1 이상이어야 한다. FIXED는 override 자체를 거절하고 본체 정원을 사용한다. VARIABLE은 본체 정원이 0이므로 양수 회차 정원을 제공해야 한다. 생성·대체는 현재 모임 호스트, DRAFT/OPEN 상태, 호스팅 제재 없음이 필요하다.

## 반복 생성의 현재 범위

count는 1~26, cadence는 DAILY/WEEKLY/BIWEEKLY/MONTHLY다. 첫 시작에 일·주·2주·월 간격을 더하고, 종료는 첫 회차의 시작~종료 길이를 그대로 더해 계산한다. 각 회차는 같은 제목·설명·정원·가격·결제 기한·환불 템플릿을 사용한다. 전체를 한 트랜잭션의 일괄 생성으로 수행한다.

개인 반복·클럽 반복 기능의 별도 시작일/요일 규칙을 이 정기모임 API에 섞지 않는다. 현재 서비스는 회차별 시작·종료 순서를 검사하지만 서로 다른 회차 사이의 시간 겹침을 검사하지 않는다.

## 총 회차와 순번 한도

취소되지 않은 연결 회차 수에 새로 추가할 수를 더해 검사한다. FIXED는 totalSessionCount, VARIABLE은 200회가 한도다. 한 번의 반복 생성 26회와 모임 전체 200회는 서로 다른 제한이다. 취소 이력은 활성 수에서 제외하고, 초안의 총 회차를 이미 살아 있는 회차 수 아래로 줄이지 못한다.

단건·반복은 다음 순번을 배정한다. 취소 원본의 대체는 같은 순번을 사용하며 같은 순번에 다른 활성 회차가 있으면 EVENT_ALREADY_IN_MEETING으로 거절한다. 새 연결 행은 REPLACEMENT와 replacedEventId를 보관한다.

## 가격과 유료 회차

FIXED 회차 가격은 요청값과 관계없이 0이다. VARIABLE은 음수를 거절하고 100원 미만 자릿수를 버린다. 1~99원은 0원이 되어 선결제·환불 템플릿 행을 만들지 않는다.

양수 회차는 현재 공개된 결제 기능으로 암묵적 정책과 수납 계좌를 결정하고 선결제를 구성한다. 요청의 refundDeadlineHours는 현재 구현에서 결제 기한 정규화로 전달되며 paymentWindowHours에도 저장한다. 지정한 refundPolicyCode 또는 기본 템플릿을 회차 가격에 적용한다. 특정 날짜의 CASH-only 설정을 영구 계약으로 쓰지 않는다.

일반 이벤트의 신청·결제·취소·환불 처리를 사용하는 VARIABLE과, 본체 등록을 유지하는 FIXED를 구분한다. 회차 하나 취소를 모임 본체 취소나 전체 회원 등록 취소로 설명하지 않는다. 상세 금전 규칙은 [납부](F17-07_regular-meeting-payment_prd.md)와 [환불](F17-08_regular-meeting-refund_prd.md)을 함께 본다.

## 취소·대체와 남은 회차의 소유권

회차 취소는 모임 소속을 확인하고 회차를 잠근 뒤 실제 회차 호스트인지 재검사한다. 모임 호스트라는 이유만으로 다른 호스트가 맡은 회차를 취소할 수 없다. 모임은 DRAFT/OPEN이어야 하며 일반 회차 취소 경로로 위임한다.

대체는 모임 호스트가 취소된 원본에 대해 수행한다. 같은 순번의 활성 회차가 없어야 하고 전체 한도·입력 검사를 다시 통과해야 한다. 대체 전/후 도메인 사건을 발행하며 원본 회차의 ATTENDING/WAITING 이용자에게 대체 안내를 요청한다. 이 호출만으로 출석·결제 전체 이관이나 알림 수신 완료를 보장한다고 쓰지 않는다.

모집 중 단건/반복 회차 추가는 주최자를 제외한 관련 참가자에게 추가 알림을 요청한다. 기존 문서의 ‘추가 알림 미배선’은 현재 코드와 다르다. 생성 응답 EventVo에는 regularMeetingId/Title/Type, sequenceNo, directApplyBlocked를 채운다.

## 앱 입구·재시도·복귀

호스트 상세의 일정 추가 화면에서 단건 또는 반복 생성을 선택한다. 취소 회차의 관리 메뉴는 같은 순번의 활성 회차가 없을 때 대체 입구를 제공한다. 대체 화면은 includeHistory=true로 원본을 읽고 이미 대체됐거나 원본이 활성 상태이면 작성을 막는다. 제목·정원·가격과 아직 미래인 시각을 미리 채우며 전용 대체 Param으로 제출한다.

회차 카드는 일반 이벤트 상세로 이동한다. 실제 회차 호스트에게 취소/출석 확정 입구를, 모임 호스트에게 대체 입구를 제공한다. 따라서 ‘대체 UI 없음’, ‘회차 카드 읽기 전용’, ‘대체가 AddParam 재사용’은 현재 미구현 항목에서 제외한다.

같은 화면의 동일 대상·본문 재시도는 untimed 키 보관함에서 같은 키를 사용한다. 성공하면 키를 정리하고 원래 상세로 돌아간다. 실패는 입력과 키를 유지하고 오류를 보여 준다. 성공 또는 저장됐을 가능성이 있는 오류는 회차/모임/이벤트 목록을 다시 읽는다. 화면 키는 메모리 보관이며 본체 생성의 계정별 영속 초안과 동일한 복원 보장이 아니다. 본문을 바꾸면 새 키가 되므로 결과 미확정 상태에서 새 내용으로 무조건 다시 생성하는 것으로 안내하지 않는다.

## 코드 위치

서버: RegularMeetingController, RegularMeetingSessionCommandService, RegularMeetingEventFactory, RegularMeetingSessionEventAdapter, RegularMeetingCourseRules, RegularMeetingAccessService, SessionCadence 및 SessionAdd/Generate/ReplaceParam. 앱: regular_meeting_session_add_screen.dart, regular_meeting_detail_screen.dart, regular_meeting_detail_provider.dart, regular_meeting_api.dart, 전용 회차 Param 모델, idempotency_key_holder.dart.

<!-- source-references:start -->
서버 창구: `RegularMeetingController#addSession`, `RegularMeetingController#generateSessions`, `RegularMeetingController#cancelSession`, `RegularMeetingController#replaceSession`, `RegularMeetingController#sessions`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 회차 간 시간 겹침을 검사하지 않는다. | 개별 시간 검사와 중복 일정 방지를 구분한다. |
| Gap | 앱은 1~99원 입력을 허용하지만 서버는 0원으로 저장한다. | 유료로 오인할 수 있는 실제 경계로 남긴다. |
| Risk | 회차 작성의 요청키는 화면 메모리이며 본문 변경 시 새 키다. | 화면 재진입·본문 변경까지 중복 생성 방지가 보장된다고 확대하지 않는다. |
| 미검증 | 동시 추가/대체·응답 유실·실제 취소 환불·알림 수신을 실행하지 않았다. | 소스 연결과 완료 실행을 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 공개 명령:** 단건·반복·대체·취소의 실제 REST와 키·응답을 사용하고 내부 bulk를 공개 API로 쓰지 않는다.
- **AC-02 타입별 정원과 금액:** FIXED override 거절·가격 0, VARIABLE 양수 정원·100원 절삭을 적용한다.
- **AC-03 반복 생성:** 네 cadence·1~26회와 첫 회차 길이 유지, 개별 미래 시각 검사를 설명한다.
- **AC-04 전체 한도:** 취소 제외 활성 수를 FIXED 총 회차 또는 VARIABLE 200회 한도와 비교한다.
- **AC-05 같은 순번 대체:** 취소 원본·활성 대체 없음·원본 참조와 같은 순번을 유지한다.
- **AC-06 회차 소유권:** 모임 소속 확인 후 실제 회차 호스트의 취소 권한을 재검사한다.
- **AC-07 유료 정책:** 현재 공개 결제 기능·계좌 연결·결제 기한·환불 템플릿을 사용하고 소액 0원 처리를 구분한다.
- **AC-08 화면 연결:** 상세 탭 이동·관리 메뉴·전용 대체 모델·원본 상태 재확인을 실제 앱 기준으로 설명한다.
- **AC-09 요청과 갱신:** 동일 화면 본문 키 유지·실패 입력 보존·관련 조회 갱신과 영속 복원 한계를 나눈다.
- **AC-10 알림 범위:** OPEN 추가 및 대체 알림 요청 연결과 실제 전송/수신 완료를 구분한다.

현재 근거는 서버·앱 소스다. 새 제품 시험·브라우저·실기기 통과 기록은 없다.
