# F17-04. 정기모임 공개·종료·취소·호스트 변경 PRD

<!-- release-document: reference -->
2026-11-22 서버·앱 소스 대조 문서다. 새 실행·브라우저·실기기 검수 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 상태와 실행 단위

상태는 DRAFT, OPEN, CLOSED, CANCELED다. DRAFT에서 OPEN 또는 CANCELED, OPEN에서 CLOSED 또는 CANCELED로 전이한다. CLOSED에서 OPEN으로의 재개는 서비스가 VARIABLE에만 허용하며 CANCELED는 끝 상태다. 상태 변경은 모임 잠금과 소유자 확인 뒤 수행한다.

최초 공개 때만 publishedAt을 설정하고 다시 열면 closedAt을 비운다. 종료·취소 시각은 초 단위로 저장한다. FIXED 취소는 cancelRefundPendingAt도 남겨 후속 환불 처리를 추적한다. 공개/재개 시 마지막 회차 생성 기준 시각도 현재로 갱신한다.

## 현재 서버 계약

| 요청 | 요청키·입력 | 응답 |
|---|---|---|
| POST /api/v1/regular-meetings/{id}/publish | Idempotency-Key 선택 | 200 RegularMeetingVo |
| POST /api/v1/regular-meetings/{id}/close | Idempotency-Key 선택 | 200 RegularMeetingVo |
| POST /api/v1/regular-meetings/{id}/reopen | Idempotency-Key 선택 | 200 RegularMeetingVo |
| POST /api/v1/regular-meetings/{id}/cancel | Idempotency-Key 필수, force query 기본 false | 200 RegularMeetingVo |
| PUT /api/v1/regular-meetings/{id}/place | RegularMeetingPlaceParam | 200 RegularMeetingVo |

비호스트는 REGULAR_MEETING_NOT_OWNER로 거절한다. 허용되지 않은 상태는 REGULAR_MEETING_INVALID_STATUS다. 공개/종료/재개에 키를 보내면 명령 기록을 재사용하며 재조회한 현재 상태가 해당 결과 OPEN/CLOSED와 다르면 MEMBER_COMMAND_RESULT_UNAVAILABLE을 반환한다. 취소는 force 값까지 요청 식별에 포함한다. 키 없이 호출하는 선택형 명령과 앱의 키 포함 호출을 구분한다.

## 공개와 다시 열기

모임과 연결 회차를 잠그고 본체 및 이번에 공개할 DRAFT 회차의 온라인 URL을 검사한다. FIXED 유료 과정은 현재 공개 가능한 결제 정책을 검사하고 계좌이체를 받는 경우 호스트 계좌를 연결한다. 기존 호스트에게 남겨 둔 회차를 제외한 관리 대상 DRAFT 회차는 결제 공개 조건을 검사한 후 함께 공개한다.

공개 서비스에는 FIXED의 모든 계획 회차를 먼저 만들어야 한다는 개수 검사가 없다. ‘총 회차와 생성 회차 일치’는 종료 조건이다. 공개와 재개가 같은 내부 함수를 사용하므로 현재 API 구현은 DRAFT의 reopen도 공개로 처리하고 VARIABLE CLOSED의 publish도 재개로 처리한다. 앱은 상태에 따라 공개/다시 열기 입구를 나누지만 서버가 두 이름을 완전히 다른 선행 상태로 제한한다고 설명하지 않는다.

## 종료와 자동 종료

FIXED 종료는 취소되지 않은 회차 전체의 종료 시각이 존재하고 현재 이하인지, 활성 회차 수가 totalSessionCount와 같은지, 그 활성 회차의 출석 확정이 전부 FINALIZED인지 검사한다. 취소 이력까지 모두 확정해야 한다는 조건은 아니다. 이전 호스트에게 남은 운영 중 회차나 FIXED의 미확정 회차가 있으면 먼저 처리해야 한다.

VARIABLE 종료는 아직 끝나지 않은 OPEN 회차를 일반 회차 취소·환불 경로로 넘긴다. DRAFT 회차는 취소하고 끝난 OPEN 회차는 종료한다. FIXED에서는 미확정 등록 중 활성 결제가 없는 대상을 별도로 종결하며, 커밋 뒤 정산 생성을 넘긴다. 모임 CLOSED 응답은 정산 행 생성·지급까지 동시에 끝났다는 뜻이 아니다. 상세 금전 처리는 [정기모임 정산](F17-10_regular-meeting-settlement_prd.md)을 따른다.

VARIABLE 자동 종료는 OPEN이고 lastEventCreatedAt이 두 달 이상 전이며 앞으로 열릴 회차와 이전 호스트가 운영 중인 남은 회차가 없을 때 가능하다. 매일 서버 기준 04:40 스케줄이 500개씩 후보를 읽고 모임별 잠금 안에서 다시 판정한다. 한 건의 실패는 집계·로그로 남기고 다음 후보를 계속 처리한다. 자동 종료는 호스트에게, 수동 종료는 해당 참가자들에게 알림을 요청한다.

## 취소와 강제 취소

현재 호스트는 DRAFT/OPEN만 취소할 수 있다. 다른 호스트에게 남은 DRAFT/OPEN 회차가 있으면 REGULAR_MEETING_HAS_RETAINED_SESSIONS와 대상 ID를 반환한다. force는 이 소유권 제한을 무시하지 않는다.

force=false에서는 시작 시각이 지났지만 OPEN인 회차가 있으면 REGULAR_MEETING_HAS_STARTED_UNCLOSED_SESSIONS와 ID 목록으로 거절한다. 앱은 이 정확한 오류에만 추가 확인을 표시하고, 먼저 출석을 확정할지 강제 취소할지 안내한다. force=true를 확인하면 미마감 회차도 취소 대상으로 넘긴다. 다른 오류를 강제 취소 사유로 바꾸지 않는다.

취소 대상은 DRAFT/OPEN 회차다. 참가자 알림을 요청하고 회차별 취소를 수행한다. FIXED는 모임 커밋 뒤 회원 환불 작업으로 넘기고 등록 상태를 종결한다. 이 응답만으로 모든 환불이 완료됐다고 표시하지 않는다. 계산·실패 복구·증빙은 [정기모임 환불](F17-08_regular-meeting-refund_prd.md)의 범위다. CLOSED와 CANCELED는 일반 취소 경로로 다시 취소할 수 없다.

## 공개 뒤 장소 변경

숨김이 아닌 OPEN 오프라인 모임만 별도 장소 변경을 허용한다. 주소 필수, 주소 500자·상세 200자, 위경도는 함께 제공하며 유한값·범위를 검사한다. 현재와 동일하면 변경 없이 반환한다.

본체와 미래 DRAFT/OPEN 회차 중 현재 모임 호스트가 관리하는 회차만 장소를 바꾼다. 시작된 회차와 이전 호스트 소유로 남겨진 회차는 제외한다. 모임을 저장하고 호스트를 제외한 관련 참가자에게 장소 확정/변경 알림을 요청하며 검색 캐시를 갱신한다.

## 호스트 변경과 남은 회차

관리자 호스트 변경은 모임과 각 회차의 소유자를 별도로 다룬다. CANCELED 또는 이미 공개된 유료 FIXED는 이 변경 경로에서 거절한다. 새 호스트가 해당 과정의 PENDING/APPROVED_PENDING_PAYMENT/ENROLLED/WAITING 회원이거나 계정이 CLOSED/INACTIVE이면 거절한다.

현재 호스트 소유의 DRAFT/OPEN 회차를 검사하여 이전 제약이 없는 회차만 계좌·호스트를 바꾼다. 제약이 있는 회차는 이전 호스트 소유로 남기고 사유와 계좌 재연결 목록을 응답한다. 이미 다른 호스트 소유로 남아 있던 회차를 추가로 가져오지 않는다. 남은 회차가 있으면 이전 호스트에게 알림을 요청한다.

모임 호스트가 바뀌어도 회차의 취소·출석 확정 권한은 실제 회차 호스트를 기준으로 한다. 현재 모임 호스트가 다른 사람 소유의 회차를 임의로 취소하는 것으로 설명하지 않는다. 종료/취소가 남은 회차 때문에 막히는 이유도 이 경계다.

## 앱 확인·재시도·복귀

상세에서 DRAFT 공개, OPEN 종료/취소/일정 추가, CLOSED VARIABLE 다시 열기를 제공한다. 각 명령 전 타입별 영향과 되돌릴 수 있는지를 설명한다. FIXED 종료 안내는 회차 종료·출석 확정을 먼저 요구하며, 강제 취소 확인은 미마감 회차의 환불 영향을 별도로 보여 준다.

공개·종료·재개는 세션별 명령 키를 같은 대상에 유지하고 결과가 확정되면 정리한다. 전체 취소는 force를 포함하는 회원 금전 명령 보관 경로를 사용한다. 성공 또는 저장됐을 가능성이 있는 오류는 상세·목록·영향받은 회차를 재조회한다. 상세의 상태 표시와 실제 환불/정산 완료를 분리한다.

## 코드 위치

서버: RegularMeetingController, RegularMeetingPublishCommandService, RegularMeetingEndCommandService, RegularMeetingCourseCommandService, RegularMeetingCourseTransitions, RegularMeetingStatus, RegularMeeting, RegularMeetingVariableAutoCloseScheduler. 앱: regular_meeting_detail_screen.dart, regular_meeting_detail_provider.dart, regular_meeting_api.dart, idempotency_key_holder.dart.

<!-- source-references:start -->
서버 창구: `RegularMeetingController#publish`, `RegularMeetingController#close`, `RegularMeetingController#cancel`, `RegularMeetingController#reopen`, `RegularMeetingController#changePlace`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 공개/재개는 내부 구현을 공유하여 경로 이름과 선행 상태가 엄격한 일대일 관계가 아니다. | 실제 서비스 동작과 앱 입구를 구분한다. |
| Risk | FIXED 종료·취소 뒤 금전 처리는 커밋 이후 작업이다. | 응답 성공을 정산 생성·환불 지급 완료로 확대하지 않는다. |
| Risk | 호스트 변경 뒤 남은 회차는 이전 호스트의 권한을 유지한다. | force로 소유권 제한을 우회할 수 있다고 안내하지 않는다. |
| 미검증 | 동시 명령·스케줄러·알림 수신·환불/정산 복구를 이번에 실행하지 않았다. | 연결된 호출과 실제 완료 증거를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 상태와 시간:** 네 상태, VARIABLE 재개 제한과 최초 공개·종료·취소·환불 대기 시각을 구분한다.
- **AC-02 공개 검사:** 위치·결제 공개 조건과 관리 대상 DRAFT 회차를 검사하되 미구현된 공개 회차 수 검사를 만들어 쓰지 않는다.
- **AC-03 FIXED 종료:** 취소되지 않은 회차의 종료·계획 수 충족·출석 확정을 함께 검사한다.
- **AC-04 VARIABLE 종료:** 미래/미완료 회차 취소·끝난 회차 종료·두 달 무활동 자동 종료를 구분한다.
- **AC-05 취소 확인:** 시작 후 미마감 오류에만 force 확인을 제공하고 남은 타 호스트 회차는 계속 차단한다.
- **AC-06 장소 변경:** 공개 오프라인 본체와 미래 관리 회차에만 변경을 적용한다.
- **AC-07 소유권 이전:** 이전 제약·회원/계정 상태를 검사하고 남은 회차와 회차별 권한을 보존한다.
- **AC-08 금전 후속:** 모임 상태 응답과 커밋 이후 환불/정산 작업의 완료를 분리한다.
- **AC-09 재확인:** 선택/필수 요청키와 결과 미확정 후 관련 조회 갱신을 설명한다.

현재 근거는 서버·앱 소스다. 새 제품 시험·스케줄 실행·브라우저 통과 기록은 없다.
