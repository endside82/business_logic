# F21-02. 참가자 서비스 이용료 첫 납부·추가 납부·자동 분담 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

참가자가 제공자 배정의 서비스 이용료를 유상 지갑에서 납부한다. 이벤트 자체 참가비나 계약금 결제와 다르다. 금액 직접 입력의 첫 납부, 기존 본인 납부에 더하는 추가 납부, 종료 후 서버가 계산하는 1/N 첫 납부 세 경로를 구분한다.

앱 이벤트 상세는 참가 출석 행이 있을 때 본인 납부 상태를 조회하고 chargeable=true 또는 nextAction=TOP_UP인 배정을 ‘서비스 이용료 분담 결제’ 입구로 보낸다. 한 건은 바로 열고 여러 건은 제공자 역할과 제안 금액을 보여주는 선택 시트를 연다. 결제 경로에도 참가자 접근 redirect가 있으며 화면은 최신 상태를 다시 읽는다.

현재 앱은 agreedGross·participantCap·remainingAmount·nextAction을 모두 받는다. 금액 필드가 유실되거나 직접 경로로 열면 무조건 결제 버튼을 표시한다는 과거 결함 설명은 현재 코드와 다르다.

## 현재 서버 계약

| 요청 | 입력 | 반환 |
|---|---|---|
| GET /api/v1/events/{eventId}/assignments/my-charge-status | 로그인 호출자, eventId | List<ParticipantAssignmentChargeStatusVo> |
| POST /api/v1/events/{eventId}/assignments/{assignmentId}/charge | long amount, 필수 Idempotency-Key | 200 ServiceAssignmentChargeResultVo(transactionId) |
| POST /api/v1/events/{eventId}/assignments/{assignmentId}/charge/topup | long amount, 필수 Idempotency-Key | 같은 거래 ID 응답 |
| POST /api/v1/events/{eventId}/assignments/{assignmentId}/charge/my-share | 본문 없음, 필수 Idempotency-Key | 같은 거래 ID 응답 |
| POST /api/v1/events/{eventId}/assignments/{assignmentId}/service-fee | long serviceFeeGross, 호스트/공동 주최자 | 200 ServiceAssignmentVo |

조회·세 납부는 PROVIDER safetyExit이며 실제 돈 진입은 서비스의 잔여 거래 봉인 조건도 검사한다. service-fee 설정에는 별도 요청키가 없고 신규 거래 범위의 Controller 게이트를 따른다. 서버 요청에서 payer나 다른 참가자 ID를 받지 않으며, 납부자는 인증된 호출자다.

## 금액 정본과 수금 상한

| 배정의 금액 방식 | 계약 총액과 참가자 전체 수금 상한 |
|---|---|
| 수락 terms·engagement 있음 | 총액 X, 상한 X−계약금 D |
| engagement 없이 양수 serviceFeeGross | 총액과 상한 모두 serviceFeeGross |
| 최신 terms 미수락, engagement의 terms 없음, 양수 금액 권위 없음 | 현황의 총액/상한은 null, 납부 요청은 조건/금액 권위 오류 |

직접 배정의 service-fee는 ACCEPTED/CONFIRMED에서 호스트/공동 주최자가 0 이상으로 설정한다. offering 또는 terms, engagement가 있으면 이 API로 덮어쓸 수 없다. 양수 설정은 제공자의 지급 가능 상태를 요구하고 활성 무료 제외가 있으면 거절한다. serviceFeeGross=0은 양수 참가자 과금 상한이 있는 상태가 아니다. 공개 첫 납부/추가 납부 함수는 상한을 요구하므로 0이라는 이유로 무제한 수금하지 않는다.

상한은 배정 전체의 취소되지 않은 금전 coverage 합계에 적용하며 FREE_EXCLUDED는 제외한다. 납부 금액을 더한 합계가 상한을 넘으면 ASSIGNMENT_CHARGE_EXCEEDS_FEE다. 호스트 대납도 이미 걷은 금액에 포함한다. participantCap과 remainingAmount를 개인 몫이나 개인별 잔액이라고 해석하지 않는다.

직접 배정 총액 설정 함수에는 기존 수금 합계보다 작게 바꾸는 것을 막는 검사가 없다. 설정 뒤 남은 금액은 0으로 표시되고 새 과금은 막힐 수 있으며, 최종 정산은 실제 합계와 총액을 다시 검사한다. 총액 설정과 기존 납부 금액의 자동 조정은 별개다.

## 첫 납부와 추가 납부

두 요청은 배정 행을 잠그고 URL eventId 일치, 봉인 중 기존 돈 연결, 최신 조건 수락, 참가자 자격, 배정 전체 상한을 검사한다. 참가자 자격은 ATTENDING 출석 행과, 신청 행이 있다면 APPROVED다. 봉인 예외는 PAID 계약금 또는 취소되지 않은 실제 금전 과금 행이며 단순 engagement나 무료 표시로는 새 돈을 받지 않는다.

과금 코어는 ACCEPTED/CONFIRMED만 허용한다. ACCEPTED면 ChargeOrigin.PREPAID, CONFIRMED면 POSTPAID다. 제공자 자신은 낼 수 없고 제공자는 지급 가능한 상태여야 한다. 유상 지갑 전용 SERVICE_ASSIGNMENT_CHARGE 정책으로 양수 금액을 지출하며 moneyLiveGate가 실제 지출을 허용해야 한다. 문서는 현재 운영 게이트가 켜져 있다는 증거가 아니다.

첫 납부는 해당 참가자에게 취소되지 않은 어떤 coverage라도 있으면 ASSIGNMENT_ALREADY_CHARGED다. 무료 처리·대납·노쇼 상태도 첫 과금을 막는다. 추가 납부는 기존 SELF_PAID 행이 필요하고 없으면 ASSIGNMENT_NOT_CHARGED다. 추가 납부는 기존 금액을 수정하지 않고 별도 SELF_PAID 행·거래·수익을 만든다. chargeOrder는 남아 있는 해당 사용자 행의 최대값+1이다.

실제 payer와 beneficiary는 모두 호출자다. 지갑 차감·원장·charge의 transactionId·creatorEarningId를 한 트랜잭션으로 저장하고 제공자 수익은 PENDING으로 생성한다. 총 gross가 제공자의 최종 순수령액은 아니다. 저장된 수수료율을 과금 행별로 적용하며 feeRateSnapshot이 null이면 현재 계산 함수는 수수료율 0을 사용한다. 현재 신규 계약 정책과 계산은 [계약금의 정산 적용과 수수료](F21-06_engagement-prepayment_prd.md#정산-적용과-수수료)를 따른다.

수락 terms가 있는 금전 활동은 시작 시각을 고정해 뒤 조건 변경을 막는다. 첫 납부와 추가 납부는 돈을 더하는 명령이며 [환불·정산 후 회수·배정 종료](F21-05_refund-clawback_prd.md)의 반환 명령과 구분한다. 추가 납부로 여러 금전 행이 되면 전액환불은 여러 행을 처리하지만 부분환불과 정산 후 회수는 모호성 오류로 거절한다.

## 종료 후 자동 1/N 납부

my-share는 CONFIRMED와 이벤트 CLOSED를 요구하고, 실제 출석자에서 제공자를 제외한 집합을 사용한다. FIXED 정기모임 회차의 실제 출석은 체크인, 일반 이벤트/VARIABLE 회차는 ATTENDING 기준이다. 첫 납부의 참가 자격 검사와 실제 출석 분할 기준을 같은 것으로 쓰지 않는다.

상한을 사용자 ID 오름차순으로 균등 분할한다. 몫은 정수 나눗셈 기본값이며 나머지 원은 앞 ID부터 1원씩 더한다. 상한 100,000원에 대상 3명이면 33,334·33,333·33,333원이다. 호출자가 대상 집합에 없으면 ASSIGNMENT_NOT_ATTENDEE, 계산 몫이 0 이하면 ASSIGNMENT_SHARE_TOO_SMALL이다.

서버는 요청 시 다시 산정한 전체 1인 몫으로 첫 과금 코어를 호출한다. 기존 납부를 뺀 부족액을 계산하는 함수가 아니다. 이미 납부/무료/대납 coverage가 있으면 첫 납부가 거절되며 부족액은 별도 topup 금액으로 보내야 한다. 현재 API에는 ‘남은 내 1/N 몫 자동 추가’ 요청이 없다.

기존 납부자나 무료/대납자를 분할 인원에서 자동 제외하거나 남은 수금액만 나누지 않는다. 실제 출석·총액이 조회 뒤 바뀌면 표시 suggestedShare와 실제 요청 시 몫이 달라질 수 있다. 응답은 transactionId만 있고 실제 계산 금액을 따로 포함하지 않는다.

## 본인 납부 현황과 다음 행동

현황 API도 참가자 자격을 검사한다. 각 배정의 assignmentId, providerRole, status, serviceFeeGross와 본인 myCoverageType·myPaidAmount, chargeable, suggestedShare, agreedGross, participantCap, remainingAmount, nextAction, blockedReasonCode를 준다. 개인 금전 행은 호출자를 beneficiary로 조회하며 다른 사람별 납부 내역을 노출하지 않는다. 전체 수금 상한과 잔액 집계는 제공한다.

myPaidAmount는 무료가 아닌 본인 coverage 중 payer가 본인인 금액의 합이다. 호스트가 대신 낸 돈은 본인 납부액에 합치지 않는다. 취소되지 않은 행만 계산하고 myCoverageType은 그 목록의 첫 타입이다. 부분환불은 coverage 금액을 바꾸지 않으므로 이 합계가 부분환불을 뺀 실부담 잔액은 아니다.

| nextAction | 서버 판정 |
|---|---|
| PAY | ACCEPTED/CONFIRMED, 유효 상한·잔액, 활성 coverage 없음, 본인이 제공자 아님, 지급 가능한 제공자, 봉인 예외 충족 |
| TOP_UP | 위 납부 가능 상태에서 본인의 거래 연결된 SELF_PAID가 있고 전체 잔액이 남음. chargeable은 false |
| NONE | 새 첫 납부/추가 납부 조건 미충족 |

현재 chargeable은 ACCEPTED도 허용한다. CONFIRMED에서만 true라는 과거 설명을 수정한다. 무료/대납 coverage는 hasActiveCoverage로 첫 납부를 막고 TOP_UP도 본인 SELF_PAID에 한정한다.

remainingAmount는 max(0, 상한−전체 금전 수금)이고 상한이 없으면 null이다. blockedReasonCode는 봉인, stale terms, 금액 권위 없음, 상한 소진, 배정 상태, 자기 거래, 제공자 지급 불가, 기존 coverage 순으로 결정한다. TOP_UP은 chargeable=false이므로 이 필드가 ALREADY_CHARGED여도 다음 행동은 추가 납부일 수 있다.

suggestedShare는 종료·상한·실제 출석 집합으로 산정하며 납부 가능 여부와 별개다. 작은 상한을 많은 인원으로 나누면 일부 사용자에게 0이 나올 수 있고, 남은 전체 금액보다 제안 몫이 클 수도 있다. 유효한 제안 숫자 하나만으로 결제 가능을 판정하지 않는다.

## 앱 화면과 직접 접근

경로 guard는 출석 행과, 신청 상태가 있으면 APPROVED를 요구한다. 결제 화면은 eventId의 현황에서 assignmentId를 찾고, 없으면 결제 대상 아님을 표시한다. 조회 오류는 다시 읽기 버튼을 제공하며 로딩/오류에는 결제 행동을 만들지 않는다.

화면 판단은 TOP_UP을 먼저 보고, 그다음 기존 coverage, chargeable=false, PAY 여부 순이다. 그래서 SELF_PAID가 있어도 TOP_UP이면 ‘잔액 추가’로 진행하고, FREE_EXCLUDED/HOST_SUBSIDIZED는 처리된 상태 안내를 보여주며 추가 결제 버튼을 숨긴다. PAY에서 suggestedShare가 있으면 입력 없는 자동 납부, 없으면 금액 직접 입력이다. 알 수 없는 nextAction은 차단한다.

총 서비스 이용료 X, 참가자 전체 한도, 남은 전체 납부액, 본인이 낸 금액, 제안 1/N을 구분해 표시하고 null 금액은 ‘미정’이다. 추가 납부에 전체 1/N을 자동 입력하지 않는다. 입력은 양수 정수와 participantCap 초과를 검사하지만 remainingAmount 초과는 사전 검사하지 않는다. 예를 들어 상한 100,000원·잔액 20,000원에 30,000원을 입력하면 앱의 한도 검사는 통과하고 서버 합계 검사에서 거절한다.

자동 납부 화면의 ‘아래 금액 그대로’ 안내와 달리 서버는 요청 시 다시 계산한다. 또한 0원 suggestedShare를 별도로 배제하지 않아 0원 버튼이 만들어질 수 있지만 서버가 거절한다. 이 경계는 확인한 제한으로 남긴다.

## 영속 요청키·결과·복귀

세 과금은 서로 다른 회원 명령 종류로 배정 대상과 본문을 영구 기록한다. my-share는 본문 없는 명령이다. 앱은 계정·명령·배정·직렬화 본문별로 키를 저장하며 같은 의도 재시도는 같은 키를 사용한다. 보관 실패 시 전송하지 않고 같은 세션 동시 요청은 Future를 공유한다. 상세 동작은 [계약금 요청키와 앱 결과 처리](F21-06_engagement-prepayment_prd.md#요청키와-앱의-결과-처리)를 따른다.

성공, 커밋 가능 실패, MEMBER_COMMAND_RESULT_UNAVAILABLE이면 본인 납부 현황 provider를 무효화하고 지갑 변경 신호를 발행한다. 성공 화면은 토스트 후 이전 경로로 pop하며 transactionId나 요청 시 재산정된 실제 금액을 별도 영수증으로 표시하지 않는다. 호스트 배정 목록과 모든 coverage 목록을 이 함수가 함께 무효화한다고 확대하지 않는다.

일반 실패는 오류 토스트와 필요한 조치 경로를 제공한다. 지갑 부족 응답은 부족액 확인 뒤 그 금액을 query로 넣어 지갑 충전 화면으로 이동한다. 충전 후 자동 재결제 코드는 이 흐름에 없으므로 돌아와 다시 실행한다. 입력은 실패 시 화면에 남고, 중복 실행은 _loading으로 막는다. 검토한 과금 함수에는 별도의 참가자 결제 필요/완료 outbox 발행 호출이 없으며 이를 다른 공통 지갑 알림 전체의 부재로 확장하지 않는다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `ServiceAssignmentController#myChargeStatus`, `ServiceAssignmentController#charge`, `ServiceAssignmentController#topup`, `ServiceAssignmentController#chargeMyShare`, `ServiceAssignmentController#setServiceFee`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 추가 납부는 직접 금액이며 개인 1/N 부족분 자동 계산 API가 없다. | 전체 잔액과 내 남은 몫을 구분한다. |
| Risk | 입력은 전체 cap만 검사하고 remainingAmount 초과는 서버에서 거절한다. | 현재 잔액 표시와 사전 검증 범위를 구분한다. |
| Risk | suggestedShare는 재산정되며 0원·잔액 초과도 제안될 수 있다. | 화면의 고정 금액 안내를 실제 청구 보장으로 쓰지 않는다. |
| Risk | 직접 총액 변경은 기존 수금 이하 설정을 막지 않고 부분환불 후 myPaidAmount도 원 coverage 합계다. | 총액/기납부/실부담·정산 게이트를 분리한다. |
| Gap | 성공은 토스트/복귀이고 실제 계산 금액 영수증이나 과금 전용 알림 호출은 검토한 흐름에 없다. | 반환 거래 ID·현황 갱신과 실시간 안내를 구분한다. |
| 미검증 | 동시 납부·원 단위 분할·응답 단절·실제 지갑 충전 복귀를 이번에 실행하지 않았다. | 소스 대조와 제품 시험 통과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 계약과 권한:** 첫/추가/my-share의 필수 키·본문 차이와 실제 호출자 납부, 이벤트 범위·자격을 따른다.
- **AC-02 금액 권위:** X와 X−D, 전체 상한/잔액·null 권위와 직접 총액 설정의 제한을 구분한다.
- **AC-03 첫 납부:** ACCEPTED/CONFIRMED의 origin, 활성 coverage 중복·자기 거래·지급 자격·유상 정책·원장/PENDING 수익을 확인한다.
- **AC-04 추가 납부:** SELF_PAID가 있어야 별도 금전 행을 만들며 분할 납부 환불 제한을 함께 안내한다.
- **AC-05 자동 분담:** CLOSED·CONFIRMED, FIXED 체크인과 일반 ATTENDING, 제공자 제외·ID 순 잔여 원 배분을 따른다.
- **AC-06 본인 현황:** 본인 payer 합계와 개인별 비공개, 전체 집계·PAY/TOP_UP/NONE·사유 우선순위를 구분한다.
- **AC-07 직접 접근:** route guard·배정 미존재·로딩/오류·기처리/차단·TOP_UP 우선순위에 따라 버튼을 결정한다.
- **AC-08 금액 경계:** cap 사전 검사/잔액 서버 검사·0원 제안·조회 후 재산정·개인 부족분 미지원의 차이를 명시한다.
- **AC-09 재시도:** 계정별 영속 키·동일 의도 공유·저장 실패 차단과 성공/커밋 가능 실패의 현황·지갑 갱신을 따른다.
- **AC-10 복귀:** 성공 pop, 오류 입력 유지, 부족액 충전 경로와 수동 재시도를 구분한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
