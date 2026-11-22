# F17-07. 정기모임 회비 납부·입금 확인 PRD

<!-- release-document: reference -->
2026-11-22 서버·앱 소스 대조 문서다. 새 실행·브라우저·실기기 검수 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

전체 과정의 APPROVED_PENDING_PAYMENT 등록자가 결제 화면에서 회비를 낸다. 앱은 현재 공개된 결제 기능과 과정의 prepaymentType의 교집합만 선택 가능하게 한다. POINT는 WALLET, CASH는 BANK_TRANSFER, MIXED는 둘을 허용한다. 2026-08-18의 계좌이체만 공개된 설정을 모든 환경의 영구 계약으로 사용하지 않는다.

WALLET은 서버 moneyLiveGate, BANK_TRANSFER는 hostDirectCashReady 판정을 통과해야 한다. 출시 설정을 확인하지 않고 코드에 두 수단이 있다는 이유로 둘 다 판매 중이라고 설명하지 않는다. 은행 입금 신고와 호스트 실제 입금 확인은 서로 다른 단계다.

## 현재 서버 계약

기본 경로는 `/api/v1/regular-meetings`다.

| 요청 | 입력·권한 | 결과 |
|---|---|---|
| POST /{id}/payment/pay | 본인, RegularMeetingPayParam.method, Idempotency-Key 필수 | RegularMeetingPaymentVo |
| GET /{id}/payment/bank-instructions | 납부 의무 또는 진행 중 은행 결제를 가진 본인 | RegularMeetingBankInstructionsVo |
| POST /{id}/payment/bind-account | 현재 호스트 | RegularMeetingBankBindingVo |
| GET /{id}/payment/queue | 현재 호스트 | List<RegularMeetingPaymentVo> |
| GET /{id}/payment/me | 본인의 가장 최근 결제 | RegularMeetingPaymentVo |
| GET /{id}/payment/{paymentId} | 결제 본인 또는 현재 호스트 | RegularMeetingPaymentVo |
| POST /{id}/payment/{paymentId}/confirm | 현재 호스트 | RegularMeetingPaymentVo |
| POST /{id}/payment/{paymentId}/reject | 현재 호스트, reason query | RegularMeetingPaymentVo |

pay는 판매 조건을 적용하고 기존 결제 조회·확인·거절 등은 CASH_EVENT의 safetyExit로 선언돼 있다. 신규 결제가 막혔다는 이유로 기존 금전 처리를 함께 막는 것으로 설명하지 않는다. 계좌 보완은 현재 호스트의 FIXED·유료·은행 수납·OPEN 모임만 허용한다. 본체 계좌가 없을 때 연결하고, 계좌가 없는 납부 대기 등록에만 전파한다. 이미 계좌가 있거나 살아 있는 은행 결제가 있는 등록은 덮어쓰지 않으며 처리 내역을 감사 기록으로 남긴다. 기존 등록·결제의 계좌를 최신 기본 계좌로 임의 치환하지 않는다.

## 납부 검사와 두 결제 수단

모임을 잠그고 FIXED·OPEN, 본인 등록의 납부 대기 상태, paymentDueAt 경과 여부, 신청 제재, 닫힌 계정, 같은 회원의 활성 결제 유무를 검사한다. CANCELED/REFUNDED 외 기존 결제가 있으면 DUPLICATE_PAYMENT다. 금액은 서버의 본체 가격이며 양수여야 한다. 클라이언트가 제출한 임의 금액으로 결제하지 않는다.

| 수단 | 서버 처리 | 등록 결과 |
|---|---|---|
| WALLET | 지갑 차감, pointTxId·paidAt 기록, PAID | ENROLLED, 회차 참석 동기화 |
| BANK_TRANSFER | 등록에 저장된 hostBankAccountId 필수, hostDirect=true의 PENDING 신고 생성 | 납부 대기 유지, 호스트 확인 필요 |

은행 신고 시 confirmDueAt을 현재부터 설정된 hostConfirmSlaDays 뒤로 정하며 기본값은 5일이다. 등록의 paymentDueAt은 납부 의무를 만들 때의 72시간 기한이고 신고 때 다시 72시간으로 연장하지 않는다. 신고된 결제가 살아 있는 동안 납부 만료 작업은 그 회원을 제외한다.

## 계좌 안내의 접근 범위

미등록 회원에게 계좌를 공개하지 않는다. 납부 대기 또는 PENDING·PAID·REFUND_REQUESTED인 본인 은행 결제가 있으면 안내를 조회할 수 있다. 진행 중 은행 결제에는 결제에 저장된 계좌를, 결제가 아직 없으면 등록에 저장된 계좌를 사용한다. 진행 중 결제가 없을 때만 현재 현금 기능·과정 결제 정책을 다시 검사한다.

안내에는 은행·계좌번호·예금주·검증 표시, 금액, 입금자명 안내, 회원/결제 ID·상태가 포함된다. 살아 있는 은행 결제가 있으면 납부 dueAt은 null이며 PENDING 신고의 confirmDueAt을 구분해 표시한다. 이 응답은 은행의 실제 이체를 자동 검증했다는 증거가 아니다.

## 호스트 확인·거절과 지연

확인 대상은 BANK_TRANSFER·PENDING이며 모임 CANCELED는 거절한다. 등록이 APPROVED_PENDING_PAYMENT인지 재확인한다. 정상 확인은 PAID·ENROLLED로 바꾸고 참석을 동기화한다. 확인 순간 회원이 탈퇴했거나 신청 제재를 받았으면 전액 REFUND_REQUESTED·CANCELED로 바꾸고 환불 안내와 호스트 조치 알림, 커밋 뒤 대기 승격을 요청한다. 따라서 confirm의 성공 응답이 언제나 등록 완료라는 뜻은 아니다.

거절은 PENDING 신고 또는 아직 confirmedAt이 없는 REFUND_REQUESTED만 허용한다. reason은 API 선언상 선택 query지만 서비스는 trim 뒤 1~200자를 요구한다. 거절은 결제를 CANCELED로 바꾼다. OPEN의 일반 신고 거절은 회원을 즉시 PAYMENT_EXPIRED로 바꾸지 않으며 재납부 가능 여부는 원래 납부 기한과 상태로 판단한다. CLOSED의 남은 납부 의무는 종결한다. 취소 모임에 갇힌 PENDING 신고·CANCELED 회원 조합은 별도 복구가 필요하다는 오류로 막는다.

호스트 목록은 BANK_TRANSFER의 PENDING·REFUND_REQUESTED를 생성순으로 반환한다. 신고 후 기본 48시간의 확인 독촉과 confirmDueAt 경과 시 에스컬레이션을 매일 서버 05:45 작업이 조회한다. 시간 경과를 입금 완료나 자동 승인으로 해석하지 않는다.

## 앱 재시도와 복귀

결제 화면은 본체 OPEN·등록 상태·납부 기한을 확인하고 계좌 안내가 준비되지 않으면 신고를 막는다. 사용 불가능한 수단 응답을 받으면 그 수단을 현재 화면에서 제외하고 공개 기능·모임을 다시 조회한다. 전송은 회원 금전 명령의 본문·대상에 묶인 요청키를 사용한다. 결과 불명확 응답 뒤 등록·결제·계좌를 다시 읽고 WALLET이면 지갑·목록도 갱신한다. 성공은 모임 상세로 복귀하며 은행 신고는 ‘호스트 확인 후 등록’으로 안내한다.

멤버·결제 관리 화면에는 계좌 연결 카드, 입금/환불 처리 목록, 환불 이력이 있다. ‘입금 목록 API 없음’·‘별도 채널로만 계좌 전달’은 현재 사실이 아니다.

## 과거 시나리오 원문 보존

> 정기모임 계좌이체 회비는 코스를 공개할 때 결박한 호스트의 받을 계좌로 받는다. 회원은 결제 화면의 납부 안내(`GET /payment/bank-instructions`)에서 계좌를 보고, 등록하지 않은 회원에게는 계좌를 보이지 않는다(400 `ENROLLMENT_INVALID_STATUS`, 2026-11-08 현금 정기모임 여정으로 확인).

위 인용은 해당 날짜의 과거 기록이며 이번 소스 검토의 새 실행 결과가 아니다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `RegularMeetingController#pay`, `RegularMeetingController#bankInstructions`, `RegularMeetingController#bindHostBankAccount`, `RegularMeetingController#paymentQueue`, `RegularMeetingController#myPayment`, `RegularMeetingController#payment`, `RegularMeetingController#confirmPayment`, `RegularMeetingController#rejectPayment`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | confirm 성공이 탈퇴·제재 회원의 환불 대기로 갈 수 있으나 앱 성공 토스트는 결제 완료 문구다. | 실제 응답 상태와 재조회 결과를 기준으로 판단하며 문구 정합성 후속을 남긴다. |
| Risk | 은행 신고·확인은 외부 계좌 확인을 전제로 한다. | 신고/호스트 확인/환불 완료를 분리한다. |
| Gap | 과정 회비는 한 번의 전체 금액이며 분할 납부 계약이 없다. | 분할 납부를 현재 기능으로 설명하지 않는다. |
| 미검증 | 현재 환경별 공개 설정·실제 송금·지갑 차감을 실행하지 않았다. | 코드 지원과 운영 활성화를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 납부 가능 조건:** FIXED·OPEN·납부 대기·유효 기한·계정·제재·중복 결제를 검사한다.
- **AC-02 수단 공개:** 과정 정책과 실행 환경의 공개 기능을 교차 적용한다.
- **AC-03 지갑 완료:** 지갑 차감과 등록 완료·회차 동기화를 연결한다.
- **AC-04 은행 신고:** 등록별 계좌를 사용하고 신고와 실제 확인을 나눈다.
- **AC-05 두 기한:** 등록 납부 72시간과 은행 확인 기본 5일을 구분한다.
- **AC-06 확인 예외:** 탈퇴·제재 시 전액 환불 대기로 전환하는 성공 결과를 보존한다.
- **AC-07 거절 조건:** 미확인 상태·필수 사유·종료 모임의 등록 종결을 설명한다.
- **AC-08 기존 결제 출구:** 판매 중단 뒤에도 기존 조회·처리를 지원하는 선언을 구분한다.
- **AC-09 앱 처리:** 요청키·불명확 결과 재조회·실제 호스트 처리 목록을 연결한다.
