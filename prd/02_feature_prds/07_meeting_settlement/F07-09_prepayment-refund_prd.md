# F07-09. 출시 제한 중인 정산 선입금·환불 규정 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 출시 관문·공개 계약·내부 정리 연결과 기존 관문 시험 단언을 대조했다. 새 제품 시험이나 현재 운영 설정을 실조회한 기록은 아니다. 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 결론

**정산 선입금은 MEETING_PREPAYMENT 출시 범위로 닫혀 있다.** 모임 참가 조건으로 미리 받는 돈은 별도 기능인 [참가비 선입금](../03_event/F03-13_event-prepayment_prd.md)이 맡는다. 참가비의 주최자 계좌 안내·입금 신고·환불 확인 기록을 이 기능의 공개·실사용 근거로 옮기지 않는다.

서버 창구 여덟과 앱의 선입금 관리·환불 규정 경로를 함께 제한한다. 코드를 보존한 상태이며, 설정 이름을 추가하는 기술적 개방과 별도 상품 채택·완성은 다르다. 호스트가 정산 전에 금액을 정해 걷고 정산 분담금에서 차감하는 상품은 아직 채택 전 후보다. 후보의 상세 조건은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)의 정산 선입금 상품 채택 항목을 따른다.

## 코드 위치

서버: MeetingPrepaymentController·ReleaseScopeDomain·ReleaseScopeGate·ReleaseScopeInterceptor, MeetingPrepaymentService·MeetingPrepaymentRelease, MeetingPrepaymentPayParam·MeetingPrepaymentReturnParam·MeetingRefundRuleParam. 내부 연결: EventCloseService·EventCancelRefundRunner·EventAccountClosure. 앱: release_scope_routes.dart·app_redirect.dart·event_detail_screen.dart·prepayment_provider.dart. 기존 관문 시험: MeetingPrepaymentSealedTest·release_scope_routes_test.dart.

<!-- source-references:start -->
서버 창구: `MeetingPrepaymentController#getPrepayments`, `MeetingPrepaymentController#payPrepayment`, `MeetingPrepaymentController#confirmBankPrepayment`, `MeetingPrepaymentController#refundPrepayment`, `MeetingPrepaymentController#getRefundRules`, `MeetingPrepaymentController#saveRefundRules`, `MeetingPrepaymentController#markBankRefundReturned`, `MeetingPrepaymentController#closeBankRefundNotReceived`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 서버 출시 관문

Controller 전체가 MEETING_PREPAYMENT로 분류되어 있으며 여덟 창구 모두 공개 경로의 예외를 두지 않는다. 이 범위가 닫혀 있으면 관문은 410 RELEASE_SCOPE_DISABLED를 반환한다. 결제뿐 아니라 목록·본인 환불·반환 표시·환불 규정 읽기도 같은 제한을 받는다.

운영 설정 파일의 기본 허용 목록에는 MEETING_PREPAYMENT가 없다. 개발·시험처럼 비운영 프로필에서도 설정을 생략하면 이 값은 기본적으로 제외한다. release.scope.enabled-domains에 명시하면 코드상 관문은 열리지만 이번 작업에서 설정을 변경하지 않았다. 설정 파일·관문 소스 대조를 현재 운영 인스턴스의 실조회 결과로 표시하지 않는다.

## 앱 입구와 직접 경로

모임 상세의 선입금 관리는 해당 출시 범위와 서버의 viewPrepayments 허용값이 모두 있을 때만 나타난다. 앱 경로 /home/events/{eventId}/prepayments 아래 전체를 동일 관문으로 묶으며 환불 규정 경로도 포함한다. 닫힌 경로 또는 같은 경로로 향하는 딥링크는 앱의 공통 이동 검사에서 홈으로 돌린다.

모임 상세, 참가비 결제·입금 확인 큐, 정산 현황은 별도 경로다. 정산 선입금 제한이 참가비 선입금이나 일반 정산 기능 전체를 함께 닫는 것은 아니다. 과거 문서의 참가자 결제·은행 확인·환불 예시를 현재 앱에서 수행할 수 있는 정상 경로로 제시하지 않는다.

## 보존된 공개 계약

아래는 관문 뒤에 남아 있는 코드 계약이다. 닫힌 상태에서는 해당 성공 응답 대신 관문 거절을 먼저 받는다. 기준 주소는 /api/v1/events/{eventId}/prepayments다.

| method·하위 주소 | 입력·응답 | 코드에 남은 업무 |
|---|---|---|
| GET 기준 주소 | List of MeetingPrepaymentVo | 모임 호스트/허용 담당자가 명단 조회 |
| POST /pay | Idempotency-Key 필수, amount·paymentMethod, 201 MeetingPrepaymentVo | 회원의 선입금 결제 명령 |
| PATCH /{id}/confirm | 200 MeetingPrepaymentVo | 계좌 입금 확인 |
| POST /{id}/refund | Idempotency-Key 필수, 200 MeetingPrepaymentVo | 본인 환불 명령 |
| PATCH /{id}/bank-refund/returned | refundAmount, 200 MeetingPrepaymentVo | 은행 반환 완료 표시 |
| PATCH /{id}/bank-refund/not-received | 200 MeetingPrepaymentVo | 미입금 반환 의무 종결 |
| GET /refund-rules | List of MeetingRefundRuleVo | 현재 참가자/호스트 자격으로 규정 읽기 |
| POST /refund-rules | List of MeetingRefundRuleParam, 201 List of MeetingRefundRuleVo | 모임 호스트가 규정 전체 교체 |

결제 입력은 amount가 1 이상이고 paymentMethod는 POINT 또는 BANK_TRANSFER다. 이 입력 계약이 호스트의 사전 요청·금액 고정·참가자의 자기 내역 조회까지 제공한다는 뜻은 아니다. 반환 완료 입력은 refundAmount이며 일반 참가비 반환 증빙 계약과 혼합하지 않는다.

## 돈 처리의 재시도와 환불 규정

보존된 결제·환불 Controller는 회원 명령 기록기를 사용하고 필수 명령 키로 최초 결과를 이어 확인한다. 앱 공급자도 결제와 환불에 각각 sendMemberMoneyCommand를 연결한다. 이 코드가 존재한다는 사실을 닫힌 화면의 현재 실사용·실결제 통과로 표시하지 않는다.

정산 선입금의 환불 규정은 hoursBeforeStart·refundPercentage 목록이다. 저장 시 빈 목록을 거절하며 시간은 0 이상, 비율은 0~100을 요구하고 모임의 기존 규정을 새 목록으로 교체한다. 읽기는 시작 전 시간 내림차순이다. 계산 시 공통 환불 엔진에 사용할 임시 정책으로 변환하며, 참가비 선입금의 저장 정책 자체를 바꾸는 작업이 아니다.

과거의 7일·3일·1일 예시는 고정 상품 정책이나 현재 실행 통과 기록이 아니다. 현재 닫힌 기능을 다시 채택한다면 환불 기준 시각·잔액·중복 결과·은행 반환 상태를 새 상품 계약과 함께 다시 검증한다.

## 남아 있는 내부 정리 경로

공개 Controller를 닫는 것과 이미 생긴 금전 의무를 없애는 것은 다르다. 모임 종료 처리는 MeetingPrepaymentRelease를 호출하고, 취소 반환 실행기는 미완료 정산 선입금을 조회하여 취소 환불을 시도한다. 계정 종료 확인에도 호스트의 미지급 포인트·참가자의 열린 포인트 선입금·호스트의 은행 반환 의무를 조회하는 연결이 남아 있다.

따라서 ‘닫혀 있으니 기존 데이터도 없고 내부 정리는 아무 일도 하지 않는다’고 단정하지 않는다. 이번 대조는 이 연결이 남아 있다는 확인이며 실제 남은 잔액·반환 건수·운영 정리 완료 여부를 확인한 것은 아니다. 공통 내부 정리와 관리 추적을 공개 경로의 410 제한 때문에 제거하지 않는다.

## 가상계좌 입금 통지와의 구분

가상계좌 webhook의 공급자별 주소와 기존 호환 주소는 존재한다. 그러나 해당 Controller는 공급자 서명·본문을 확인한 뒤 MeetingSettlementTransferService.confirmVirtualAccountDeposit으로 **정산 이체**를 처리한다. 정산 선입금을 자동 입금 완료로 만드는 접수 경로가 아니다.

기존 기능 표에 연결된 webhook 두 주소를 이 기능의 직접 창구 목록에서 제외한다. 관련 혼합 납부·은행분 확인은 [분담·이체 납부](F07-05_pay-share_prd.md)와 [이체 확인·후속 처리](F07-06_host-confirm-transfers_prd.md)의 범위다. 외부 결제사의 현재 연결이나 운영 입금 통과는 이번 문서 갱신에서 검증하지 않았다.

## 현재 제한과 확인 범위

| 판정 | 항목 | 현재 설명 |
|---|---|---|
| 채택 전 | 별도 정산 선입금 상품 | 호스트 요청·금액 고정·본인 조회·정산 차감·규칙 환불·알림·관리 가시성을 갖출지 먼저 결정. 현재 필수 개발 완료 목록에 합산하지 않음 |
| 제한 유지 | 신규 이용 | 공개 창구 여덟·앱 하위 경로 모두 MEETING_PREPAYMENT 제한. 문서 수정은 실제 설정 개방이 아님 |
| Risk | 참가비 기능과 근거 혼합 | 참가비 선입금의 일부 공개·은행 왕복 기록을 이 기능의 상태표에 연결하지 않음 |
| 미검증 | 실제 설정·기존 의무 | 소스 기본값·관문 단언과 실제 운영 허용 목록·잔액·반환 종료를 구분 |

현재 완결 조건은 출시 제한을 정확하게 설명하고 별도 참가비 기능과 분리하는 것이다. 닫힌 기능의 모든 납부·환불 분기를 새로 실행한 결과가 아니다. 재개 조건의 구현을 문서 최신화 작업에서 추가하거나 승인된 상품으로 바꾸지 않는다.

## 수용 기준과 검증 근거

- **AC-01 기능 경계:** 참가비 선입금과 정산 선입금을 문서·현황판·검증 기록에서 구분한다.
- **AC-02 서버 관문:** 여덟 공개 창구를 동일 범위로 묶고 닫혔을 때 410 RELEASE_SCOPE_DISABLED임을 확인한다.
- **AC-03 설정 기본값:** 운영 기본 목록과 비운영 설정 생략에서도 닫힘을 확인하며 실제 운영 조회로 과장하지 않는다.
- **AC-04 앱 관문:** 관리 입구·환불 규정 하위 경로·직접 링크 제한과 홈 복귀를 확인한다.
- **AC-05 형제 경로:** 참가비 결제·모임 상세·일반 정산은 별도 경로이며 이번 관문으로 일괄 차단되지 않는다.
- **AC-06 보존 계약:** 요청 필드·명령 키·List/VO/201 응답을 현재 닫힌 코드 계약으로 명시한다.
- **AC-07 환불 규정:** 비어 있지 않은 목록·시간/비율 범위·전체 교체·임시 공통 엔진 정책을 구분한다.
- **AC-08 내부 의무:** 종료 지급·취소 환불·계정 종료 확인 연결을 유지하며 기존 데이터가 없다고 가정하지 않는다.
- **AC-09 webhook:** 정산 이체의 입금 통지를 정산 선입금 자동 입금으로 연결하지 않는다.
- **AC-10 재개 조건:** 상품 채택·필요한 전체 업무·재검증 뒤 개방 조건을 유지하며 지금 사용 가능한 것으로 안내하지 않는다.

기존 MeetingPrepaymentSealedTest에서 창구 여덟의 분류·예외 없음·비운영/운영 기본 410·명시 허용 단언을 읽었다. release_scope_routes_test의 선입금/환불 규정 경로 제한·참가비 등 형제 경로 유지·예외 없음 단언을 읽었다. 새 제품 시험은 실행하지 않았으며 현재 운영 설정과 실결제 결과를 대신하지 않는다.
