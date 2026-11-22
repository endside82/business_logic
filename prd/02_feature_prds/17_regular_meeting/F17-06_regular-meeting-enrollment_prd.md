# F17-06. 정기모임 등록·승인·대기·취소 PRD

<!-- release-document: reference -->
2026-11-22 서버·앱 소스 대조 문서다. 새 실행·브라우저·실기기 검수 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

FIXED 전체 과정의 등록을 다룬다. VARIABLE은 [회차 관리](F17-05_regular-meeting-sessions_prd.md)에서 생성한 개별 이벤트에 신청한다. 모임 상세의 참여 행동에서 등록 화면으로 이동하며 승인제일 때 자기소개·지원 동기를 입력할 수 있다. 등록 결과가 APPROVED_PENDING_PAYMENT이면 결제 화면으로 이동하고, 나머지 결과는 상태를 알린 뒤 이전 화면으로 돌아간다.

현재 호스트는 상세의 멤버·결제 관리에서 신청 승인·거절, 탈퇴 회원 제거, 입금·환불 처리를 한다. 앱은 회원 목록을 100명씩 끝까지 읽어 ID로 중복을 제거하되 50페이지를 넘으면 불완전한 목록을 성공으로 보여주지 않고 오류로 처리한다.

## 현재 서버 계약

기본 경로는 `/api/v1/regular-meetings`다. 등록과 승인 판단은 모임 행 잠금 아래 수행한다.

| 요청 | 입력 | 결과 |
|---|---|---|
| POST /{id}/enroll | 선택 RegularMeetingEnrollParam.message, 최대 500자 | 201 RegularMeetingMemberVo |
| DELETE /{id}/enroll | Idempotency-Key 필수 | 200 RegularMeetingMemberVo |
| GET /{id}/members | 호스트, PagingParam | PageResponse<RegularMeetingMemberVo> |
| GET /{id}/members/me | 본인 | RegularMeetingMemberVo |
| POST /{id}/members/{memberId}/approve | 호스트, 선택 EnrollmentDecisionParam | RegularMeetingMemberVo |
| POST /{id}/members/{memberId}/reject | 호스트, 선택 EnrollmentDecisionParam | RegularMeetingMemberVo |
| POST /{id}/members/{memberId}/remove-withdrawn | 호스트 | RegularMeetingMemberVo |

회원 응답은 id, userId, nickname, profileUrl, status, enrolledAt, paymentDueAt, waitlistOrder, attendedCount, noShowCount, consecutiveNoShowCount, withdrawn을 포함한다. 회원 ID와 사용자 ID를 혼용하지 않는다. 본인 등록이 없는 경우 서버는 ENROLLMENT_INVALID_STATUS를 반환하며 앱이 이 오류만 미등록으로 해석한다.

## 상태·좌석·등록 조건

| 상태 | 좌석 점유 | 의미 |
|---|---|---|
| PENDING | 예 | 호스트 승인 대기 |
| APPROVED_PENDING_PAYMENT | 예 | 승인 후 또는 자동 승인된 유료 과정의 납부 대기 |
| ENROLLED | 예 | 등록 완료 |
| WAITING | 아니요 | 자리·차례 대기 |
| PAYMENT_EXPIRED | 아니요 | 납부 의무 만료 |
| CANCELED | 아니요 | 등록 취소 |
| REJECTED | 아니요 | 신청 거절 |
| FORFEITED | 아니요 | 노쇼 정책에 따른 자격 박탈 |

FIXED·OPEN만 등록할 수 있다. 본체 호스트는 HOST_CANNOT_ENROLL, 신청 제한 회원은 해당 제재 오류로 거절한다. 유료는 prepaymentRequired 또는 양수 가격으로 판정하고 현재 판매 가능한 결제 정책도 검사한다. FORFEITED는 일반 재등록을 거절한다. 다른 비종결 상태는 ALREADY_ENROLLED이며 CANCELED·REJECTED·PAYMENT_EXPIRED는 같은 회원 행을 재사용해 재등록할 수 있다.

기존 대기열을 먼저 승격한 뒤 신규 등록을 판정한다. 정원이 찼거나 남은 대기자가 있으면 WAITING이다. 자리가 있으면 승인제는 PENDING, 승인이 필요 없는 유료는 APPROVED_PENDING_PAYMENT, 무료는 ENROLLED다. 납부 대기 진입 때 현재로부터 72시간의 paymentDueAt과 본체에 연결된 hostBankAccountId를 회원에 저장한다. 기존 대기자가 있는데 새 신청자가 빈자리를 먼저 차지하는 규칙은 아니다.

## 승인·거절·대기자 승격

승인은 FIXED·OPEN과 현재 호스트, 해당 모임의 PENDING 회원을 확인한다. 대상 계정이 닫혔는지 재검사하고 유료는 결제 정책, 무료는 신청 제재를 검사한다. 승인 결과는 유료면 납부 대기, 무료면 등록 완료다. 무료 등록 완료 때 회차 참석 동기화를 수행한다. 승인·거절의 decisionMessage는 최대 500자이며 검토자·처리 시각을 기록한다. 현재 앱은 두 명령에 null 본문을 보내므로 운영 화면의 거절 사유 입력 지원과 혼동하지 않는다.

거절은 PENDING을 REJECTED로 바꾸며 서비스가 승인과 똑같이 OPEN을 별도 선행 검사하지는 않는다. 자리 반환 후 승격을 커밋 뒤 요청한다. 승격은 OPEN에서만, waitlistOrder 순서로 같은 승인·유료·무료 분기를 적용한다. 닫힌 계정은 건너뛰고 즉시 ENROLLED가 되는 무료 분기에서는 신청 제한도 확인한다. 유료 기능이 잠기면 대기열을 보존한다. ‘대기 승격=등록 완료’로 단정하지 않는다.

## 취소·탈퇴 회원 제거·재확인

본인은 CLOSED/CANCELED가 아닌 모임의 비종결 등록을 취소할 수 있다. ENROLLED의 향후 참석을 해제하고 [정기모임 환불](F17-08_regular-meeting-refund_prd.md)을 같은 명령 흐름에서 호출한다. 좌석 점유 회원이 빠지면 커밋 뒤 승격을 요청한다. 등록 취소 응답은 은행 송금까지 끝났다는 뜻이 아니다.

remove-withdrawn은 모임이 끝나지 않았고 대상 계정이 실제 탈퇴했으며 진행 중 결제가 없는 경우에만 동작한다. 임의 회원을 강퇴하는 API가 아니다. 앱은 영향을 확인한 뒤 이 명령을 전송한다.

앱 등록 취소는 회원 금전 명령의 요청키를 사용하고 성공 또는 커밋 여부가 불명확한 응답 뒤 본인 등록·결제·지갑·모임·이벤트 조회를 갱신한다. 신규 등록은 같은 요청키 계약이 없으며 성공한 재등록은 이전 취소 의도를 정리한다. 관리 화면은 명령 실패와 명령 성공 뒤 목록 재조회 실패를 구분한다.

## 알림과 만료

현재 서버에는 신청, 승인, 거절, 대기 승격, 납부 만료 알림 호출이 있다. ‘알림 미구현’으로 남기지 않는다. 실제 발송·수신 여부는 이번에 실행하지 않았다. 납부 만료 작업은 5분 주기로 후보를 읽고 모임 잠금 안에서 OPEN·납부 대기·기한 경과·진행 중 결제 없음 조건을 다시 검사한다. 은행 입금 신고가 살아 있으면 회원 납부 기한만으로 만료시키지 않는다. 같은 스케줄러가 대기열도 다시 점검한다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `RegularMeetingController#enroll`, `RegularMeetingController#cancelEnrollment`, `RegularMeetingController#members`, `RegularMeetingController#myMembership`, `RegularMeetingController#approveEnrollment`, `RegularMeetingController#rejectEnrollment`, `RegularMeetingController#removeWithdrawnMember`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 앱 승인·거절은 선택 사유를 보내지 않는다. | 서버의 사유 저장 지원과 앱 입력을 구분한다. |
| Risk | WAITING 승격은 승인·납부 대기로 갈 수 있다. | 좌석 확보와 최종 등록 완료를 나눠 안내한다. |
| Risk | 일시 오류의 결과가 이미 반영됐을 수 있다. | 새 등록·취소를 반복하기 전 현재 등록을 재조회한다. |
| 미검증 | 알림 수신·동시 등록·계정 전환을 새로 실행하지 않았다. | 소스 근거를 실행 통과로 바꾸지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 등록 대상:** FIXED·OPEN, 호스트 자기 등록 금지, 신청 제한과 유료 공개 조건을 설명한다.
- **AC-02 좌석 상태:** PENDING·APPROVED_PENDING_PAYMENT·ENROLLED만 좌석을 점유한다.
- **AC-03 승인과 납부:** 승인 여부를 먼저 판정하고 무료·유료 등록 완료 시점을 구분한다.
- **AC-04 대기 순서:** 기존 대기자를 우선하며 승격 결과도 승인·납부 규칙을 따른다.
- **AC-05 재등록:** 일반 재등록 가능 종결 상태와 FORFEITED의 거절을 구분한다.
- **AC-06 등록 취소:** 필수 요청키·참석 해제·환불·커밋 뒤 승격을 연결한다.
- **AC-07 호스트 관리:** 전체 회원 페이지·사유 입력 범위·탈퇴 계정 제거 조건을 설명한다.
- **AC-08 만료와 알림:** 신고된 결제의 만료 제외와 현재 알림 호출을 기록한다.

근거는 서버·앱 소스 대조이며 새 제품 시험 결과는 없다.
