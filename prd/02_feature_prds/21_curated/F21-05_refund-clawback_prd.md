# F21-05. 제공자 이용료 환불·정산 후 회수·배정 종료 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

정산 전 전액환불, 호스트 부담 부분환불, 정산 후 회수, 노쇼 몫 귀속, 배정 취소 시 금전 종료를 다룬다. 각 경로의 수령자·부담자·수익 상태·분할납부 허용 범위가 다르다. 앱 이벤트 배정 카드에서 서버 actions가 허용한 행동을 선택하며, 대상 선택은 coverage 목록을 사용한다.

현재 아래 다섯 명령은 모두 Idempotency-Key가 필수다. 전액환불/노쇼에는 키가 없고 Repository가 매번 자동 생성한다는 옛 설명을 폐기한다. 현재 앱은 계정별 영속 의도 보관함을 거쳐 키를 Repository에 명시적으로 전달한다.

## 현재 서버 계약

경로의 공통 앞부분은 /api/v1/events/{eventId}/assignments/{assignmentId}다. 다섯 POST 모두 PROVIDER safetyExit 선언을 사용한다.

| 요청 | 본문 | 200 응답 |
|---|---|---|
| POST …/refund | beneficiaryUserId | 본문 없음 |
| POST …/partial-refund | beneficiaryUserId, long partialAmount | ServiceAssignmentRefundVo |
| POST …/clawback | beneficiaryUserId | ServiceAssignmentRefundVo |
| POST …/noshow-forfeit | beneficiaryUserId | 본문 없음 |
| POST …/cancel | 선택 reason | ServiceAssignmentVo |

모든 서비스는 실제 배정 eventId와 URL의 일치를 검사한 뒤 이벤트 호스트/공동 주최자 권한을 확인한다. 부분환불은 HANDLE_REFUND_ISSUE 위임을 추가 검사하고, 비용을 낼 현재 이벤트 호스트를 결정한 뒤 배정 상태를 확인한다. 일반 공동 주최자 자격만으로 호스트 지갑을 차감할 수 없다.

## 정산 전 전액환불

CONFIRMED 배정의 해당 beneficiary에 연결된 취소되지 않은 금전 행들을 조회한다. FREE_EXCLUDED, 거래/수익/실제 payer 연결이 없는 행은 제외하며 유효 행이 없으면 ASSIGNMENT_SETTLEMENT_INVALID_EARNING이다. 분할 추가 납부가 여러 행이어도 전액환불은 각 행을 처리한다. 그중 어떤 행에든 기존 refund 감사 기록이 있으면 ASSIGNMENT_REFUND_AMBIGUOUS로 거절한다.

실제 payer 계정과 지갑·수익 행을 잠그고, 각 수익이 같은 제공자의 SERVICE_ASSIGNMENT·해당 chargeId·PENDING인지 확인한다. 원 거래에서 gross를 payer에게 복원하고 수익을 REFUNDED로 전이한 뒤 charge 행을 삭제한다. 대납은 실제 납부한 호스트/공동 주최자가 반환받으며 beneficiary가 자동 수령자가 되는 것은 아니다.

원 수수료·세금 스냅샷은 정산 전 원장 함수에 전달한다. 현재 이 함수는 지갑 복구와 CREATOR_PAYABLE 감소를 합계 gross로 기록한다. 아직 인식하지 않은 플랫폼 수수료 수익·원천세 예수금을 정산 후 방식으로 되돌린다고 쓰지 않는다.

삭제한 사람은 수금 판정에서 빠지므로 필요하면 새로 납부/대납할 수 있다. NOSHOW_FORFEIT도 유효한 금전 행이고 아직 CONFIRMED이면 서버 전액환불 대상이 될 수 있다. 현재 앱 picker의 노출 범위는 아래와 다르다.

## 호스트가 부담하는 부분환불

CONFIRMED, 양수 partialAmount, 열린 배정 분쟁 없음이 필요하다. 동일 beneficiary의 취소되지 않은 금전 거래 행이 두 개 이상이면 ASSIGNMENT_REFUND_AMBIGUOUS다. 선택 행은 SELF_PAID이고 transactionId·payerUserId가 있어야 한다. 기존 refund 기록 금액 합계와 이번 금액이 charge.amount를 넘으면 ASSIGNMENT_REFUND_EXCEEDS_CHARGE다. 합계가 정확히 원금과 같아지는 것은 이 비교에서 허용한다.

원 납부자에게 partialAmount를 복원하고 현재 이벤트 호스트의 유상 지갑에서 같은 금액을 차감한다. 참가자 복원·호스트 지출·원장은 하나의 트랜잭션이며 호스트 잔액 부족 등 뒤 실패가 있으면 앞 복원도 롤백된다. 호출자가 위임받은 공동 주최자여도 부담자는 이벤트 호스트다.

coverage의 원금과 제공자 earning은 그대로 둔다. PARTIAL_HOST_ABSORBED 감사 행에는 수령자·환불액·환불 거래, 실제 부담자 hostRecoveryUserId와 지출 거래 hostRecoveryTransactionId를 남긴다. 제공자 수령 약정은 줄어들지 않는다. 이 감사 행의 originalGross/Fee/Tax/Net/recoveredAmount는 별도로 설정하지 않아 모델 기본값 0이며, 부분환불 영수증의 0을 원 제공자 수익이 없다는 의미로 읽지 않는다.

## 정산 후 회수

배정은 SETTLEMENT_LOCKED여야 하고 단일 금전 행만 허용한다. 무료 행·금전 연결 누락은 거절한다. 같은 charge에 CLAWBACK 감사 행이 있으면 ASSIGNMENT_REFUND_ALREADY_PROCESSED다. 새 키 재호출의 도메인 거절과 같은 키의 원 결과 재생은 다른 경로다.

| 실제 수익 상태 | 원 납부자 반환·제공자 처리 |
|---|---|
| PENDING 또는 APPROVED | gross 반환, 지급 전 원장 복구, 수익 REFUNDED. 제공자 지갑 회수 없음 |
| PAID, 제공자 계정 활성 | gross 반환 후 제공자 유상 잔액에서 원 net까지 회수. 부족분은 CREATOR_RECEIVABLE 원장, 수익 REVERSED·netAmount=부족분 |
| 그 밖의 수익 상태 또는 원 제공자/charge 연결 불일치 | ASSIGNMENT_SETTLEMENT_INVALID_EARNING |
| PAID, 제공자 계정 종료 | ASSIGNMENT_PROVIDER_CLOSED. 닫힌 지갑에서 회수하지 않음 |

회수액은 현재 수수료율로 다시 계산하지 않고 원 수익 gross/fee/tax/net을 사용한다. 회수 가능한 유상 잔액을 0과 원 net 사이로 제한하며, 지갑이 없거나 유상 잔액이 없으면 실제 회수 0으로 부족분을 기록한다. 지급 전 취소는 제공자가 종료한 계정이어도 회수 분기를 타지 않는다. 실제 환불 수령자는 활성 계정이어야 한다.

감사 행에는 원 금액 스냅샷, recoveredAmount, refundRecipientUserId, 환불 거래를 저장하고 charge 행은 보존한다. 응답에는 지급 전/후를 구분하는 필드나 확정 미수금 필드가 없다. 지급 전에도 originalNet은 양수이고 recoveredAmount는 0일 수 있으므로 두 값의 차이를 무조건 미수금이라고 표시해서는 안 된다. 내부 ClawbackResult.shortfall() 역시 단순 차이이므로 로그 값만으로 실제 미수금 발생을 판정하지 않는다.

원 거래 환불은 남은 환불 가능액을 잠그고 검사한다. 부분환불을 이미 받은 뒤에는 clawback이 전체 charge.amount를 다시 요청하므로 REFUND_EXCEEDS_ORIGINAL로 막힐 수 있다. 부분환불 잔액을 자동 계산해 정산 후 반환하거나 이전 호스트 부담을 함께 되돌리는 기능으로 설명하지 않는다.

## 노쇼 몫 귀속

CONFIRMED·최신 조건 수락·열린 분쟁 없음·이벤트 CLOSED가 필요하다. 대상 활성 행이 없으면 NOT_FOUND다. 모든 행이 이미 NOSHOW_FORFEIT이면 성공 no-op으로 반환한다. 그 외에는 대상이 실제 출석자이면 ASSIGNMENT_BENEFICIARY_ATTENDED로 거절하고, 금전/수익 연결을 가진 SELF_PAID 행을 NOSHOW_FORFEIT으로 바꾼다. 분할 납부 여러 행도 이 전환은 처리한다.

새 지갑 이동이나 수익 생성은 없다. 정산 때 노쇼 수혜자를 예상 수금 대상에 포함해 기존 돈을 유지한다. 이미 전환한 뒤 출석 상태가 바뀌면 재호출의 no-op과 별개로 정산 게이트가 노쇼/실출석 충돌을 다시 검사한다.

서버 actions는 종료 전 노쇼 버튼을 거절하므로 ‘앱에 종료 조건이 없어 항상 노출한다’는 과거 결함은 현재 설명에서 뺀다. 다만 actions의 노쇼 조건에는 최신 terms 수락 검사가 없고 실제 명령에는 있어, 오래된 조건에서는 버튼이 허용돼도 서버가 거절할 수 있다.

## 배정 종료와 부분환불 부담 되돌리기

배정 취소는 범위·권한·열린 분쟁 없음·상태 전이를 검사해 CANCELED로 바꾸고 금전 종료 범위를 잠근다. PAID·미적용 계약금의 제공자 귀속은 [계약금의 처리 중 취소와 배정 취소](F21-06_engagement-prepayment_prd.md#처리-중-취소와-배정-취소)를 따른다. 그다음 취소되지 않은 유효 금전 charge마다 참가자 과금을 되돌린다.

부분환불이 없으면 원 payer에게 charge 전액을 반환한다. 부분환불이 있으면 참가자에게는 charge.amount−누적 부분환불만 반환하고, 기록된 각 hostRecoveryUserId에게 해당 hostRecoveryTransactionId의 부담액을 되돌린다. 예를 들어 10,000원 중 3,000원을 먼저 부분환불했다면 종료 때 참가자는 7,000원, 당시 부담 호스트는 3,000원을 복원받는다. 제공자 수익은 REFUNDED로 바꾼다.

부담액 총합과 실제 부담자·지출 거래를 모두 가진 감사 기록 합계가 다르면 ASSIGNMENT_SETTLEMENT_INVALID_EARNING으로 차단한다. 원천이 부족한 데이터를 임의의 현재 호스트에게 돌려주지 않는다. 세금 분해는 참가자 잔액/호스트 부담액과 각 부담 기록의 가중치로 나누며 잔여 원은 큰 나머지·원래 순서로 배분한다.

이 종료 함수는 유효 금전 행을 되감지만 charge 행을 삭제하지 않는다. 개별 전액환불의 행 삭제와 다르다. 배정 취소 영수증에는 배정 ID를 저장하고, 응답은 커밋 뒤 현재 권한으로 배정을 다시 읽어 만든다. 응답 재조회가 실패해도 같은 키로 금전 종료를 다시 실행하지 않는 구조다.

## 호스트 이전 뒤 반환 책임

권한 판단은 현재 이벤트의 호스트/공동 주최자에 따르지만 돈의 원천은 기록된 실제 payer와 hostRecoveryUserId에 남는다. 새 호스트라는 이유로 과거 대납 반환이나 부분환불 부담 되돌리기를 새 호스트에게 바꾸지 않는다. 반대로 새로 실행하는 호스트 부담 부분환불은 실행 시점 이벤트 호스트 지갑을 사용한다.

정기모임에서 이전 호스트에게 남은 회차를 새 호스트의 묶음 명령에서 제외하는 기준은 [대상 회차와 호스트 이전](F21-07_regular-meeting-bulk_prd.md#대상-회차와-호스트-이전)을 따른다. 소유권 변경 자체가 미해결 환불/회수 책임을 일괄 이전했다는 뜻은 아니다.

## 앱의 선택·재시도·갱신

전액환불·정산 후 회수 picker는 SELF_PAID/HOST_SUBSIDIZED만 선택 가능하고 부분환불·노쇼는 SELF_PAID만 고른다. 서버가 전액환불/회수 가능한 NOSHOW_FORFEIT은 현재 기본 picker에서 선택할 수 없다. 같은 사용자의 분할 행을 사전 합치거나 부분환불/회수 불가를 미리 경고하는 분기도 없다. 취소 이력과 payer 표시 한계는 [무료 제외 이력 조회와 남은 선택 한계](F21-04_free-invite-host-subsidy_prd.md#이력-조회와-남은-선택-한계)를 따른다.

부분환불은 양수 금액 입력, 노쇼와 회수는 확인 대화상자를 거친다. 회수 안내는 현재 항상 제공자 지갑에서 지급액을 돌려받는다고 표현하지만 실제 지급 전 분기는 지갑 회수가 없다. 성공 시 _dispatch는 토스트만 표시하고 반환된 originalNet/recoveredAmount 등 상세 영수증을 화면에 펼치지 않는다. ‘회수액은 보이고 부족분만 없다’는 옛 설명과 다르다.

다섯 명령은 계정·명령·배정·본문별 영속 키와 동일 의도 동시 요청 공유를 사용한다. 서버는 각각 다른 명령 종류로 대상/본문을 결박하고 최초 결과 또는 확정 거절을 보관한다. 상세 규칙은 [계약금 요청키와 앱의 결과 처리](F21-06_engagement-prepayment_prd.md#요청키와-앱의-결과-처리)를 따른다. 저장 실패 때 새 키로 임의 전송하거나 네트워크 실패마다 키를 바꾸는 흐름이 아니다.

성공·커밋 가능 실패·저장 결과 불명에서는 배정 변경 신호를 보내고, 노쇼를 제외한 네 명령은 지갑 변경도 알린다. 화면 명령은 세션 범위에서 수행하며 입력 시트는 성공 후 닫고 실패 입력은 남긴다. 키와 서버 상태 방어가 실제 실기기 재시도 시험을 통과했다는 의미는 아니다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `ServiceAssignmentController#refund`, `ServiceAssignmentController#partialRefund`, `ServiceAssignmentController#clawback`, `ServiceAssignmentController#noShowForfeit`, `ServiceAssignmentController#cancel`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 부분환불/회수의 분할 행 거절을 picker가 사전 구분하지 않는다. | 전액·노쇼의 다중 행 지원과 분리한다. |
| Gap | 서버가 반환 가능한 NOSHOW_FORFEIT이 전액/회수 picker에서 제외된다. | API 가능과 앱 입구를 구분한다. |
| Gap | 회수 안내가 지급 전 분기를 설명하지 않고 결과 금액은 토스트 뒤 별도 표시하지 않는다. | 원 net−회수액을 항상 미수금으로 간주하지 않는다. |
| Risk | 부분환불 후 정산 잠금 회수는 원거래 남은 반환액을 넘겨 거절될 수 있다. | 자동 잔액 반환/부담자 복구를 보장하지 않는다. |
| Risk | 노쇼 행동 표지에는 최신 terms 수락 검사가 없지만 명령에는 있다. | 버튼 허용과 최종 명령 거절 가능성을 명시한다. |
| 미검증 | 실제 원장/잔액·닫힌 계정·부분환불 후 취소·동시 재시도·기기 복귀는 이번에 실행하지 않았다. | 소스 대조와 제품 실행을 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 요청키와 계약:** 다섯 POST의 필수 요청키·정확한 본문·무본문/영수증/배정 응답을 구분한다.
- **AC-02 전액:** CONFIRMED의 유효 PENDING 금전 행을 각 payer에게 반환하고 감사 이력 충돌을 거절한 뒤 행을 삭제한다.
- **AC-03 부분환불:** 위임·단일 SELF_PAID·누계/양수·분쟁을 검사하고 현재 이벤트 호스트가 부담하며 제공자 수익은 유지한다.
- **AC-04 회수 상태:** 지급 전 REFUNDED·지급 후 REVERSED와 실제 유상 회수/미수금·계정 종료 조건을 구분한다.
- **AC-05 반환 원천:** 원 거래 잔여 한도·원 스냅샷을 따르고 부분환불 후 잠금 회수를 자동 잔액 환불로 해석하지 않는다.
- **AC-06 노쇼:** 종료·terms·분쟁·출석 검사와 이미 전환된 행의 no-op·정산 재검사를 구분한다.
- **AC-07 배정 종료:** 계약금 귀속과 참가자/과거 부담 호스트 반환을 나누고 원천 누락은 차단하며 charge 행을 보존한다.
- **AC-08 소유권과 돈:** 현재 권한과 과거 실제 납부자/부담자 원천을 분리한다.
- **AC-09 앱 한계:** 타입별 picker·노쇼 환불 입구 누락·분할 경고 부재·회수 안내/결과 표시를 실제 구현대로 적는다.
- **AC-10 결과 복구:** 계정별 영속 키·세션·배정/지갑 갱신과 취소 커밋 후 응답 재조회를 구분한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
