# F21-04. 무료 제외·되돌리기·호스트 대납 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

무료 제외는 참가자에게 제공자 이용료를 받지 않았음을 금액 0의 FREE_EXCLUDED 행으로 남긴다. 호스트 대납은 호스트/공동 주최자 자신의 지갑에서 돈을 내고 참가자를 수혜자로 기록하는 HOST_SUBSIDIZED다. 두 행동은 참가자 수금 판정에 쓰이지만 돈·수익·취소 방식은 다르다. 이 무료 제외는 이벤트 전체 참가 신청·참가비 면제 기능을 대신하지 않는다.

앱의 이벤트 배정 카드에서 서버 actions가 허용한 ‘무료 제외’, ‘무료 제외 취소’, ‘대신 내기’를 제공한다. offering/terms가 붙은 배정에서 serviceFeeGross=0만 보고 무료 제외 버튼을 여는 과거 가드는 폐기됐다. 서버가 참가자 자격을 검사하지 않는다는 과거 결함도 현재 코드와 다르다.

## 현재 서버 계약

아래 경로의 공통 앞부분은 /api/v1/events/{eventId}/assignments/{assignmentId}다.

| 요청 | 정확한 입력 | 반환·요청키 |
|---|---|---|
| POST …/free-exclude | beneficiaryUserId, 선택 reason | 200, 본문 없음. 요청키 헤더 없음 |
| POST …/free-exclude/cancel | targetUserId, 선택 reason | 200, 본문 없음. Idempotency-Key 필수 |
| POST …/subsidize | beneficiaryUserId, long amount | 200, 본문 없음. Idempotency-Key 필수 |
| GET …/coverages | URL의 eventId/assignmentId | List<ServiceAssignmentCoverageVo> |

무료 제외 생성의 reason은 서비스에서 최대 500자, 취소 reason은 최대 200자를 검사한다. 취소 대상 필드명은 beneficiaryUserId가 아니라 targetUserId다. Controller에서 무료 제외 생성·취소·대납은 PROVIDER safetyExit로 선언되어 있지만, 대납 서비스는 별도로 봉인 중 잔여 거래 조건을 적용한다.

## 공통 권한과 참가자 자격

무료 제외·취소·대납은 실제 배정 eventId가 URL과 같은지 검사하고 이벤트 호스트/공동 주최자 권한을 확인한다. 무료 제외 생성과 대납은 CONFIRMED 배정만 허용한다. 단독 무료 제외 취소의 상태 조건은 SETTLEMENT_LOCKED 금지로 별도 정의되어 있다.

무료 제외 생성과 대납은 beneficiary의 ATTENDING 출석 행을 요구한다. 신청 행이 있으면 그 상태도 APPROVED여야 한다. 출석 행 없이 승인된 신청만 있거나, 출석 행은 있지만 신청이 다른 상태인 경우 허용하지 않는다. 신청 행이 없는 출석자는 이 함수의 추가 신청 상태 검사 대상이 아니다.

제공자 자신을 beneficiary로 무료 제외하거나 대납할 수 없다. 대납은 호출자 자신이 제공자인 경우도 거절한다. 기존 취소되지 않은 coverage가 있으면 ASSIGNMENT_ALREADY_CHARGED다. 앱 참가자 선택은 APPROVED 신청만 필터링하고 이미 coverage가 있는 사람이나 제공자를 사전에 제외하지 않는다. 서버의 출석·중복·자기 거래 검사가 최종 판단이다.

## 돈 없는 무료 제외

무료 제외 생성은 다음 연결이 모두 없어야 한다: currentTermsVersion, offeringId, engagementId, requiresDeposit, 양수 serviceFeeGross, 취소되지 않은 실제 금전 과금 행. 카탈로그 상품이 붙어 있지만 조건을 아직 제안하지 않았거나 총액이 0이어도 무료 제외를 허용하지 않는다.

통과하면 FREE_EXCLUDED, amount=0, freeReason, freeExcludedBy/At, beneficiary와 다음 chargeOrder를 저장한다. payer와 거래·수익 연결을 만들지 않는다. 서버 actions도 위 조건을 사용하므로 앱은 단순히 보장수수료 유무만 보고 버튼을 열지 않는다.

정산의 coveredBeneficiaries에는 포함되지만 moneyRows에서는 제외한다. 따라서 대상 사람이 실제 정산 대상 참가자이고 다른 게이트도 충족해야 정산이 된다. 무료 행 하나를 만들었다는 사실만으로 배정 전체 정산을 보장하지 않는다.

## 무료 제외만 되돌리기

현재 무료 제외 전용 취소 API와 앱 버튼이 있다. 배정 전체를 취소해야만 복구할 수 있다는 옛 설명을 폐기한다. 서버는 SETTLEMENT_LOCKED를 거절하고 대상 사용자의 취소되지 않은 FREE_EXCLUDED 행을 찾는다. 없거나 다른 종류만 있으면 ASSIGNMENT_FREE_EXCLUSION_NOT_CANCELABLE이다.

행을 삭제하지 않고 canceledAt, canceledBy, cancelReason을 남긴다. 이후 현재 coverage 조회·정산 계산은 취소 여부에 따라 다르므로 감사 이력과 활성 수금 판정을 구분한다. 무료 제외를 취소하면 현재 수금 판정에서 빠지며 다음 처리에서 새 chargeOrder로 납부/대납/무료 제외가 가능해진다. 취소가 곧 참가자 지갑 차감이라는 뜻은 아니다.

서버 ASSIGNMENT_FREE_EXCLUDE_CANCEL 영구 명령 기록과 앱 계정별 보관함을 통해 같은 키·대상·본문의 결과를 재생한다. 무료 제외 생성은 요청키가 없고 활성 행 중복 검사로 보호한다. 두 요청의 응답 단절 복구 보장을 동일하다고 쓰지 않는다.

## 실제 돈을 내는 대납

대납은 배정을 잠근 뒤 eventId·봉인 잔여 거래·권한·CONFIRMED·자기 거래·참가자·중복·제공자 지급 가능 상태·최신 조건 수락을 검사한다. 봉인 중에는 PAID 계약금 또는 취소되지 않은 실제 금전 과금의 증거가 있어야 한다. 무료 제외 기록만으로 새 대납을 허용하지 않는다.

currentTermsVersion이 있으면 기존 취소되지 않은 금전 과금 합계에 새 amount를 더해 상한을 검사한다. engagement 계약의 상한은 수락 조건 X−D, 그 밖은 양수 serviceFeeGross다. 이는 참가자 한 명의 한도가 아니라 배정 전체 금전 수금 합계 상한이다. terms 없는 기존 직접 배정에는 이 함수가 같은 cap 검사를 호출하지 않는다. 최종 정산의 금액 일치 검사는 별도로 남는다.

금전 활동 시각을 고정하고 실제 납부자를 잠근 뒤 HOST_SUBSIDIZED 행을 예약한다. payerUserId는 요청한 호스트/공동 주최자, beneficiaryUserId는 선택 참가자다. moneyLiveGate를 통과해야 실제 지출을 진행하며 유상 포인트 전용 SERVICE_ASSIGNMENT_CHARGE 정책을 사용한다. 이 문서는 운영 환경에서 해당 게이트가 켜져 있다고 확인한 기록이 아니다.

지갑 지출과 원장을 기록하는 동안 저장된 배정 feeRateSnapshot으로 CreatorEarning을 PENDING 생성하고 charge에 transactionId/creatorEarningId를 연결한다. 현재 신규 수수료 정책과 건별 계산은 [계약금 정산 적용과 수수료](F21-06_engagement-prepayment_prd.md#정산-적용과-수수료)의 같은 계산 함수를 사용한다. 대납 완료가 제공자 실지급 완료는 아니다. amount는 양수 정수이며 앱 입력과 서버 SpendCommand가 각각 이를 검사한다.

대납 취소·환불에서는 참가자 이름만 보고 반환 대상을 정하지 않는다. 현재 전액 환불 함수는 유효한 금전 행의 payerUserId로 원래 지출을 복원하고 행을 삭제한다. 따라서 대납자가 실제 호스트/공동 주최자였으면 그 납부자에게 반환된다. 부분 반환·정산 후 회수의 별도 조건은 [환불과 회수](F21-05_refund-clawback_prd.md)를 따른다.

## 앱 선택·입력·결과 갱신

무료 제외와 대납은 APPROVED 참가자 목록에서 대상을 고른다. 목록에 이미 처리한 사람을 제외하는 coverage 비교는 없다. 무료 제외는 선택 사유, 대납은 양수 정수 금액을 받는다. 입력 시트는 쓰기 성공 뒤 닫고 실패하면 입력을 남긴다. 현재 계정의 세션 범위에서 명령을 보내고 처리 중 상태와 성공/오류 토스트를 표시한다.

무료 제외 생성은 키 없는 Repository 명령이 성공하면 현재 배정 목록을 refresh한다. 무료 제외 취소와 대납은 공통 sendMemberMoneyCommand로 계정별 영속 키·동일 의도 동시 요청 공유를 사용한다. 성공·커밋 가능 실패·저장 결과 불명에서는 배정 변경 신호를 보내며, 대납은 지갑 변경도 알린다. 생성의 단순 성공 refresh와 두 명령의 불명확 실패 갱신을 구분한다. 영속 키와 확정 거절 규칙은 [계약금 요청키와 앱 결과 처리](F21-06_engagement-prepayment_prd.md#요청키와-앱의-결과-처리)를 함께 따른다.

무료 제외 취소는 coverage 목록에서 FREE_EXCLUDED 타입을 고르게 한다. 대상 이름·종류·금액을 표시하지만 현행 선택 행은 payerUserId를 표시하지 않는다. 앱 coverageType은 문자열이 아니라 SELF_PAID/FREE_EXCLUDED/HOST_SUBSIDIZED/NOSHOW_FORFEIT와 UNKNOWN fallback을 가진 enum이다.

## 이력 조회와 남은 선택 한계

서버 coverages 조회는 배정 권한을 확인한 뒤 취소 행을 포함한 모든 charge 행을 반환한다. 서버 VO에는 무료 처리자/시각과 취소자/시각/사유가 있지만 앱 VO에는 이 감사 필드들이 없다. provider는 응답을 필터링하지 않고, picker는 coverageType만으로 선택 가능 여부를 결정한다.

따라서 취소된 FREE_EXCLUDED 이력이 선택 가능한 행으로 다시 보일 수 있다. 요청은 chargeId가 아닌 targetUserId를 보내므로 서버는 그 사용자의 현재 활성 무료 행을 찾는다. 없으면 거절하고, 같은 사용자의 새 활성 무료 행이 있다면 그 현재 행을 처리한다. 과거 행과 현재 행을 앱에서 확실히 구분하는 기능은 아직 아니다. 이를 서버의 중복 취소 방어 부재로 확대하지 않는다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `ServiceAssignmentController#freeExclude`, `ServiceAssignmentController#cancelFreeExclude`, `ServiceAssignmentController#subsidize`, `ServiceAssignmentController#listCoverages`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 참가자 picker가 이미 coverage 있는 사람·제공자를 제외하지 않는다. | 승인 참가자 필터와 최종 서버 중복/자격 검사를 분리한다. |
| Gap | 서버 취소 이력이 앱 VO에 없고 coverage picker가 타입만 검사한다. | 취소 이력 재선택·같은 사용자의 현재 활성 행 처리를 명시한다. |
| Gap | coverage 행에 실제 납부자를 표시하지 않는다. | 대납 환불은 beneficiary가 아닌 payer에게 돌아감을 설명한다. |
| Risk | 무료 생성은 요청키가 없고 대납 cap 검사는 terms 관리 여부에 따라 다르다. | 생성/취소/대납의 복구·한도 보장을 섞지 않는다. |
| 미검증 | 실제 지갑 차감·동시 제출·취소 이력 선택·실기기 복귀를 이번에 실행하지 않았다. | 소스 대조와 실행 통과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 계약:** 무료 생성 beneficiaryUserId와 취소 targetUserId, 필수 요청키의 차이를 보존한다.
- **AC-02 자격:** ATTENDING과 존재하는 신청의 APPROVED, 이벤트 범위·호스트/공동 주최자·자기 거래·중복을 검사한다.
- **AC-03 무료 조건:** offering/terms/engagement/보장수수료/실제 금전 과금이 없는 CONFIRMED 배정에서만 생성한다.
- **AC-04 무료 취소:** 정산 잠금을 거절하고 활성 무료 행에 취소 감사 이력을 남기며 자동 과금하지 않는다.
- **AC-05 대납 돈:** 실제 호출자를 payer로 저장하고 봉인·지급 자격·terms cap·양수 유상 지출·수익 PENDING을 연결한다.
- **AC-06 정산과 반환:** 무료는 수금 판정만, 대납은 금전 행으로 포함하며 반환은 실제 payer에게 한다.
- **AC-07 앱 결과:** 서버 actions, 성공 뒤 입력 닫기, 실패 입력 유지와 생성/취소/대납의 갱신 차이를 따른다.
- **AC-08 이력 경계:** 서버 전체 coverage와 앱 감사 필드 누락·타입별 picker·현재 활성 행 처리를 구분한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
