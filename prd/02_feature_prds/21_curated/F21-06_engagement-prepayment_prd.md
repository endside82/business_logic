# F21-06. 수락 조건의 계약금 선납·적용·취소 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

호스트 또는 권한 있는 공동 주최자가 수락된 제공자 계약의 계약금 D를 자신의 지갑으로 결제한다. 총 보수 X와 계약금 D는 수락 조건과 연결된 engagement에서 읽는다. 현재 결제 본문은 method 하나이며 사용자가 이 요청에서 X/D를 직접 입력하지 않는다. terms 없는 직접 배정에서 금액을 입력해 새 engagement를 만드는 옛 흐름은 현재 결제 API가 제공하지 않는다.

앱 배정 화면은 서버 actions의 PAY_DEPOSIT 허용 여부로 ‘계약금’ 버튼을 표시한다. engagement가 있다는 이유만으로 숨기는 옛 canPrepay 조건은 없다. 확인 대화상자에 조회한 총 보수와 계약금을 보여주고 WALLET 요청을 보낸다. PENDING 취소 버튼과 계약금 금액·처리 상태 표시도 현재 구현에 존재한다.

## 현재 서버 계약

| 요청 | 입력 | 반환 |
|---|---|---|
| POST /api/v1/events/{eventId}/assignments/{assignmentId}/prepayment/wallet | ServiceAssignmentPrepaymentCreateParam(method), 필수 Idempotency-Key | 201 ServiceAssignmentPrepaymentVo |
| POST /api/v1/events/{eventId}/assignments/{assignmentId}/prepayment/{prepaymentId}/cancel | 본문·요청키 헤더 없음 | 200, 본문 없음 |
| GET /api/v1/events/{eventId}/assignments | eventId | List<ServiceAssignmentVo>, 계약금 요약과 행동 목록 포함 |

WALLET/BANK_TRANSFER가 method enum에 있지만 현재 이 결제 함수는 WALLET만 허용한다. null이나 다른 method는 ASSIGNMENT_PREPAYMENT_METHOD_UNSUPPORTED다. Flutter 기본 method는 WALLET이며 서버 enum의 존재를 계좌이체 계약금 기능의 구현으로 설명하지 않는다.

결제 응답은 id, engagementId, payerUserId, amount, method, status, pointTxId, paidAt, canceledAt, applicationType, appliedAmount, creatorEarningId, appliedAt, createdAt이다. 결제와 적용 시점이 다르므로 적용 필드와 취소·납부 시각은 비어 있을 수 있다. Java BigDecimal 금액은 앱 double로 매핑한다.

## 금액의 근거와 수락

조건 변경은 offeringId가 있고 알려진 상품 분류인 배정에서 허용한다. 과금 기록·PAID/PENDING 계약금 또는 financialActivityStartedAt이 있으면 변경을 막는다. 제공자 견적은 미래 expiresAt이 필요하고, 수락은 만료·현재 조건 버전·수락 주체를 검사한다. 호스트 제안은 수락 순간 현재 수수료 정책 버전을 확인하며, 제공자 견적은 견적에 저장된 정책을 사용한다.

| 수락 조건 | 배정 금액 상태 |
|---|---|
| D=0 | serviceFeeGross=X, 기존 engagement가 있으면 취소 처리 후 연결 해제 |
| 0<D<X | engagement의 agreedProviderFee=X, requiresDeposit=true, serviceFeeGross=0 |

자기 배정의 양수 계약금은 수락 단계에서 거절한다. 수락된 버전은 acceptedTermsVersion에 기록한다. 계약금 결제는 현재 조건과 수락 버전이 일치하고 engagement가 있어야 하며, X는 engagement, D는 수락된 terms에서 읽는다. 결제 본문에는 agreedProviderFee·amount·expectedTermsVersion이 없다. 앱 확인 문구의 금액은 직전 조회값이고 실제 결제 금액의 권위는 요청 처리 시 읽는 수락 조건이다.

## 결제 권한과 처리 순서

배정 행을 잠근 뒤 URL의 eventId와 실제 배정 eventId가 다르면 NOT_FOUND로 거절한다. PROVIDER 봉인 중에는 기존 돈이 붙은 배정인지 검사한 뒤 이벤트 호스트/공동 주최자 권한을 검사한다. 봉인 예외는 PAID 계약금 또는 취소되지 않은 실제 금전 과금 행이 있을 때다. FREE_EXCLUDED 표시나 engagement 존재만으로 새 결제를 허용하지 않는다.

ACCEPTED/CONFIRMED만 결제할 수 있다. 호출자 자신이 제공자이면 ASSIGNMENT_SELF_CHARGE, 제공자가 지급 가능한 상태가 아니면 ASSIGNMENT_PROVIDER_NOT_PAYABLE이다. 최신 조건 수락과 engagement 존재, 0<D<X, serviceFeeGross=0을 검사한다. 같은 engagement에 CANCELED 이외 계약금이 하나라도 있으면 중복을 거절한다.

호출자 지갑의 활성 지급자 잠금을 확보하고 PENDING 계약금을 만든 뒤, SERVICE_ASSIGNMENT_PREPAYMENT 정책으로 실제 유상 포인트만 지출한다. 납부자 payerUserId는 호출자다. 무료 포인트를 섞는 정책은 아니다. 지갑 거래와 청산 원장을 기록한 뒤 pointTxId·PAID·paidAt을 같은 트랜잭션에서 저장한다. 성공 시 금전 활동 시작 시각도 고정한다.

결제 시점에는 계약금을 보관하는 원장을 만들며 제공자 수익 적용·승인은 이후 정산 또는 배정 취소에서 한다. 정상 WALLET 요청은 같은 트랜잭션에서 PAID가 되어 지속적인 PENDING 단계를 일반 사용자 흐름으로 노출하지 않는다. 잔액 부족 등 실패는 업무와 명령 기록의 트랜잭션 규칙을 따른다.

## 요청키와 앱의 결과 처리

서버는 ASSIGNMENT_PREPAY 영구 명령 기록에 행위자·종류·키와 이벤트/배정 대상·본문 해시를 결박한다. 업무와 결과를 함께 커밋하고 같은 명령은 최초 201 응답을 재생한다. 같은 키를 다른 대상/본문에 쓰면 충돌한다. 이 명령은 앱이 키를 정리하는 확정 거절을 별도 기록하는 집합에 포함되며, 불명확한 오류와 저장된 결과를 읽을 수 없는 경우를 구분한다.

앱은 계정·명령 종류·배정 ID·직렬화 본문별 의도를 로컬 보관함에 저장하고 같은 의도는 같은 키를 사용한다. SharedPreferences 쓰기가 실패하거나 저장 형식이 잘못되면 요청을 보내지 않는다. 같은 세션의 동일 의도 동시 호출은 진행 중 Future를 공유한다. 보관 중 계정이 바뀌면 전송하지 않고 이전 세션 결과를 새 화면에 적용하지 않도록 공통 계정·세션 경로를 사용한다.

성공 또는 공통 처리기가 확정으로 판단한 거절은 보관함 settle 경로로 넘기고, 불명확한 실패는 키를 유지한다. HTTP 403/404는 명령 내부 거절로 표시된 경우에만 확정으로 판단한다. 모든 오류에서 키를 새로 만든다고 설명하지 않는다. 이 영속 보관 흐름은 [묶음 정산](F21-07_regular-meeting-bulk_prd.md)의 화면 메모리 키와 다르다.

결제 성공, 커밋 가능 실패 또는 MEMBER_COMMAND_RESULT_UNAVAILABLE이면 배정 목록과 지갑 변경 신호를 발행한다. 서버에서 성공했는데 후속 목록 재조회가 실패한 것을 결제 재실행으로 바꾸는 구조가 아니다. 화면의 결제 확인·실행은 세션 범위에서 수행하고 성공/오류 토스트를 표시한다.

## 계약금 조회와 행동 목록

배정 조회는 agreedGross, requiresDeposit, depositAmount, prepaymentId, prepaymentStatus, prepaymentPaidAt, prepaymentApplicationType, prepaymentAppliedAt을 제공한다. depositAmount는 수락 조건에서 가져온다. 계약금 행을 고를 때 CANCELED가 아닌 행을 우선하고 같은 우선순위에서는 큰 ID를 선택한다.

PAY_DEPOSIT 행동은 봉인·상태·최신 수락·engagement·자기 거래·제공자 지급 가능·미적용 PAID/PENDING 존재를 검사한다. CANCEL_DEPOSIT 행동은 호스트 시점에서 PENDING일 때 허용한다. 실제 명령은 다시 eventId·권한·계약금 연결·상태를 검사한다. 앱은 서버 허용 행동에 대응하는 버튼을 만들며 호출자의 추측으로 행동을 생성하지 않는다.

requiresDeposit=true이고 depositAmount가 있으면 카드에 계약금 요약을 표시한다. 결제 전, 처리 중, 결제 완료·정산 대기, 제공자 정산 반영, 배정 취소로 제공자 귀속, 취소됨·다시 결제 가능, 알 수 없음 상태를 구분한다. PAID라는 결제 상태만으로 이미 제공자에게 정산 적용되었다고 판단하지 않고 applicationType을 함께 읽는다.

## 정산 적용과 수수료

정산은 종료·CONFIRMED·최신 조건 수락·이행·참가자별 수금·제공자 지급 가능·유효 수익 연결 등 전체 게이트를 통과해야 한다. 계약금 합계만 일치하면 항상 정산되는 것은 아니다. 정산에 포함되는 취소되지 않은 금전 과금 행의 합계 C에는 호스트 대납 등도 포함하며 FREE_EXCLUDED는 제외한다.

engagement가 있으면 PAID이고 아직 applicationType이 없는 계약금을 찾는다. 필수 계약금이 없으면 ASSIGNMENT_PREPAYMENT_REQUIRED이고 C+D가 engagement의 X와 다르면 ASSIGNMENT_FEE_MISMATCH다. 예를 들어 X=100,000원, D=30,000원일 때 금전 과금 합계 C=70,000원이어야 이 금액 검사를 통과한다.

통과하면 계약금의 별도 CreatorEarning을 만들고 참가자 과금 수익과 함께 승인한다. 배정은 SETTLEMENT_LOCKED, 계약금 applicationType은 APPLIED_TO_PROVIDER, appliedAmount와 appliedAt은 적용액·시각으로 기록한다. 계약금 status 자체는 PAID를 유지한다. 수익 승인과 실제 제공자 지급 완료는 다르다.

계약금 수익은 배정 feeRateSnapshot을 사용한다. 현재 신규 정책은 5%이고, 계약금 단위로 수수료= D×rate를 원 단위 HALF_UP, 원천징수=(D−수수료)×3.3%를 다시 HALF_UP 처리한다. 순액은 D−수수료−원천징수다. 과거 계약의 저장 rate와 현재 신규 rate를 같다고 가정하거나, 참가자 과금과 계약금을 합친 X에 단 한 번 계산한 값으로 대체하지 않는다. 이는 현재 코드 계산 설명이며 세무 승인이나 실지급 검증 기록이 아니다.

## 처리 중 취소와 배정 취소

처리 중 취소 API는 배정을 잠그고 URL eventId·호스트 권한·prepaymentId의 engagement 연결을 검사한 뒤 PENDING만 CANCELED·canceledAt으로 바꾼다. PAID를 이 API로 환불할 수 없다. 앱에 확인 대화상자와 버튼이 있으며 성공 후 배정 목록을 다시 읽는다. 이 명령에는 결제 요청키 헤더가 없고, 일반 WALLET 납부는 즉시 PAID이므로 이 버튼이 나타나는 실제 중간 상태와 정상 결제 완료를 구분한다.

배정 취소는 별도 업무다. 실제 배정 eventId·호스트 권한·열린 분쟁 없음·허용 상태 전이를 검사하고 CANCELED로 바꾼다. 금전 종료 범위를 잠근 뒤 PAID·미적용 계약금이 있으면 제공자 수익으로 적용·승인하고 applicationType=FORFEIT_TO_PROVIDER로 기록한다. 계약금을 납부자에게 반환하는 함수가 아니다. 이어 참가자 과금 종료 처리를 실행한다. 참가자 납부 반환과 제공자 계약금 귀속을 하나의 환불로 합치지 않는다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `ServiceAssignmentController#payPrepaymentByWallet`, `ServiceAssignmentController#cancelPrepayment`, `ServiceAssignmentController#listByEvent`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | method enum의 BANK_TRANSFER는 현재 계약금 지갑 함수가 지원하지 않는다. | 지갑 경로만 현재 실행 계약으로 적는다. |
| Risk | PAID 계약금은 PENDING 취소로 환불되지 않고 배정 취소 시 제공자에게 적용한다. | 결제 취소·배정 취소·참가자 반환을 분리한다. |
| Risk | 결제 요청은 method만 받으며 확인 화면의 금액과 요청 시 수락 조건 사이에 버전 입력이 없다. | 서버 수락 조건이 결제 금액의 정본임을 밝힌다. |
| 미검증 | 디스크 실패 복구·잔액 차감·동시 재전송·실제 수익 지급·실기기 표시를 이번에 실행하지 않았다. | 소스 근거와 제품 실행 결과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 금액 권위:** 결제 본문은 method뿐이고 현재 수락 terms·engagement에서 X/D를 읽는다.
- **AC-02 결제 권한:** URL 범위·호스트/공동 주최자·상태·지급 자격·자기 거래·잔여 거래 봉인을 검사한다.
- **AC-03 금액과 중복:** 0<D<X, serviceFeeGross=0과 활성 계약금 중복 거절을 따른다.
- **AC-04 돈 기록:** 유상 지갑 차감·청산 원장·PAID·금전 활동 시각을 한 업무로 저장한다.
- **AC-05 키와 복구:** 서버 최초 결과 재생과 앱 계정별 영속 키·저장 실패 전송 금지·동시 의도 공유를 구분한다.
- **AC-06 조회와 입구:** 수락 금액·계약금 상태/적용 타입·서버 행동으로 현재 결제/처리 중 취소 버튼을 제공한다.
- **AC-07 갱신:** 성공·커밋 가능 실패·저장 결과 불명에서 배정/지갑 신호를 보내고 계정·세션 경계를 지킨다.
- **AC-08 정산:** 전체 게이트와 C+D=X를 통과한 뒤 수익 승인·APPLIED_TO_PROVIDER를 기록한다.
- **AC-09 취소:** PENDING만 단독 취소하며 배정 취소의 PAID 계약금은 FORFEIT_TO_PROVIDER로 적용한다.
- **AC-10 계산 경계:** 저장 수수료율·계약금별 원 단위 계산과 신규 정책·실지급/세무 승인을 구분한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
