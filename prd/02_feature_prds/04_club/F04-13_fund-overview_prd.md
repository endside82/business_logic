# F04-13. 클럽 기금 잔액·월별 기부 차트·거래 내역 PRD

<!-- release-document: reference -->
> 2026-11-22 서버·앱 소스 대조. 실제 송금이나 화면 실행 결과가 아니다. 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 실제 입구

클럽 재정 화면에서 기금 잔액, 최근 6개월 기부 입출금, 최근 거래 5개를 각각 서버에서 조회한다. 앱이 기부·출금 목록을 합쳐 전체 거래를 만드는 구조가 아니다. 현재 회원만 기금을 읽을 수 있으며, 출금·출금 이력·기부 입구는 클럽의 동작 권한 응답에 따라 표시한다. 권한 조회 중에는 대기하고 실패하면 재시도하며, 비회원에게 잔액을 보여 주지 않는다.

출금 권한이 있으면 하단 출금과 기부 내역, 상단 출금 이력으로 이동할 수 있다. 그 밖의 회원은 본인 기부 내역과 허용된 기부하기를 이용한다. 클럽장도 기부 내역의 기부하기로 들어갈 수 있다. 정책 안내와 전체 거래 내역은 별도 화면이다. 미납금 상환 입구는 아래의 클럽 넘기기 상세에 있으며 재정 화면의 일반 버튼으로 설명하지 않는다.

## 잔액과 조회 권한

`GET /api/v1/clubs/{id}/fund`는 `clubId`, `balance`, `paidBalance`, `freeBalance`, `totalDonated`, `totalSpent`, `totalRefunded`를 반환한다. 기금 행이 아직 없으면 조회만으로 만들지 않고 0을 반환한다. 서버의 기금 조회 조건은 현재 회원 여부이며 이 함수에서 클럽의 ACTIVE 상태를 별도로 요구하지 않는다.

`balance`는 유료·무료 합계다. 무료 몫은 현금 출금 대상이 아니며 유료 잔액도 그대로 신청 가능한 금액은 아니다. 출금 신청에서는 미승인 예약·환불 보호액·미납금을 추가로 차감한다. 정확한 계산과 승인 시 차감 시점은 [클럽 기금 출금의 가용액과 신청 제한](F04-15_fund-withdrawal_prd.md#가용액과-신청-제한)을 따른다.

## 월별 기부 차트와 거래 원장

| 조회 | 서버 집계와 앱 표시 |
| --- | --- |
| 월별 기부 입출금 | `GET /fund/monthly-summary`, `List<ClubFundMonthlySummaryVo>`. `months` 기본 6, 서버는 1~24로 제한한다. 현재 월을 포함해 오래된 월부터 반환하고 없는 월은 0으로 채운다. 앱은 6개월을 요청한다. |
| 월별 수입 | 기부 생성 월의 원래 기부 금액 합계다. 취소된 기부를 원래 수입에서 지우지 않는다. |
| 월별 지출 | 환불된 월의 실제 `refundAmount` 합계다. 구독료·가입비·출금 등 기금 전체 지출 차트가 아니다. |
| 거래 내역 | `GET /fund/transactions`, `PageResponse<ClubFundTransactionVo>`. 회계 원장의 클럽 기금 계정을 거래별로 합쳐 차변−대변 금액과 최근 기록 시각·ID 순으로 반환한다. 앱 최근 목록은 5개, 전체 목록은 20개씩 읽는다. |
| 거래자 정보 | 정본 클럽장이면서 출금 이력 열람 권한이 있는 경우에만 `userId`를 내려준다. 다른 회원에게는 null이다. |

월별 응답은 `yearMonth`(YYYYMM), `income`, `expense` 정수 금액이다. 거래 응답은 `id`, `type`, 부호 있는 `amount`, nullable `userId`, `createdAt`을 사용한다. 거래 종류는 `DONATION`, `MEMBER_FEE`, `DONATION_REFUND`, `MEMBER_FEE_REFUND`, `SUBSCRIPTION`, `SUBSCRIPTION_REFUND`, `WITHDRAWAL`, `WITHDRAWAL_CANCEL`, `DEBT_OFFSET`, `FORFEIT`이다. 특히 출금 예약과 예약 해제를 완료 송금·신규 기부로 읽지 않는다.

## 미납금 조회와 상환의 별도 입구

클럽 넘기기 상세에서 보내는 클럽장에게 미납금 보류 사유가 있을 때 상환 영역을 표시한다. `GET /fund/debt`는 클럽장 권한으로 유료·무료 미납금, 기금 상계액, 넘기기에 부족한 금액, 폐쇄 계산 정보와 기금 버전을 읽는다.

`POST /fund/debt-repayment`는 필수 요청 키와 `currency`, `payWith`, `amount`, `expectedFundVersion`을 받는다. 현재 정본 클럽장이며 ACTIVE 클럽이어야 한다. 잠근 기금 버전이 조회 때와 같아야 하고, 같은 통화의 기금으로 먼저 상계한 뒤 선택한 미납 통화의 부족액 전액과 요청 금액이 일치해야 한다. 임의 부분 상환이나 낡은 금액을 자동 수락하지 않는다.

유료 미납금은 유료로, 무료 미납금은 무료 또는 유료로 갚을 수 있다. 유료 지갑 지출에는 서버 금전 기능 허용 조건이 적용된다. 앱은 무료 미납금의 유료 상환 선택지를 해당 기능이 열렸을 때 표시한다. 결과 이후 기금·지갑·미납금·클럽 넘기기 자료를 다시 읽는다. 넘기기 전체 조건은 [클럽 관리와 생명주기](F04-03_club-crud-transfer_prd.md)를 함께 본다.

## 실패와 복귀

잔액·차트·최근 거래는 별도로 조회한다. 차트가 전부 0인 경우와 조회 실패를 구분하고 거래가 없는 경우도 빈 상태를 표시한다. 전체 거래 목록에는 첫 조회 재시도와 추가 페이지 실패 재시도가 있다. 앱 복귀와 재정 화면 재활성화 때 기금 자료를 다시 읽으며, 기부·취소·상환 결과에서도 관련 자료를 무효화한다. 출금 신청은 잔액과 거래를 다시 읽되 기부 월별 차트까지 바꾸는 사건으로 취급하지 않는다.

## 코드 위치

서버: `ClubController`, `ClubFundService`, `ClubDonationQueryRepository`, `AccountingLedgerQueryRepository`, `ClubFundTransactionType`, `ClubDebtRepaymentService`, `ClubFundObligationService`, `ClubFundMoneyCommand`. 앱: `club_fund_api.dart`, `club_fund_repository.dart`, `club_fund_provider.dart`, `club_fund_transaction_provider.dart`, `club_fund_refresh.dart`, `club_fund_screen.dart`, `fund_balance_card.dart`, `club_fund_transaction_list_screen.dart`, `club_debt_provider.dart`, `club_debt_repayment_section.dart`, `club_ownership_transfer_detail_screen.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#getFund`, `ClubController#getFundMonthlySummary`, `ClubController#getFundTransactions`, `ClubController#getFundDebt`, `ClubController#repayFundDebt`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 근거 | 내용 | 다음 확인 |
| --- | --- | --- | --- |
| Risk | `fund_balance_card.dart` | 무료 잔액이 있을 때 유료 잔액을 그대로 “출금 가능”이라고 표시한다. 서버의 실제 신청 가용액과 다르다. | 유료 잔액과 신청 가능액을 구별하는 표시 결정. |
| Risk | `club_fund_policy_screen.dart` | 정책 화면의 “7일 내 전액 환불” 안내는 원거래 잔여 몫·기금 가용액·현재 회원 조건을 모두 설명하지 않는다. | 현재 취소 계약과 안내 문구 정합성 확인. |
| 미검증 | 소스 대조 범위 | 브라우저·실기기·운영 원장·금전 기능 설정은 이번에 실행하거나 조회하지 않았다. | 실제 환경 확인이 필요한 경우 별도 근거로 판정. |

## 수용 기준과 검증 근거

- **AC-01 회원 조회:** 현재 회원은 잔액을 읽고 비회원은 거절되며, 기금 행이 없을 때 0 응답만으로 행이 생성되지 않는다.
- **AC-02 잔액 구별:** 총액·유료·무료를 구별하고 유료 잔액을 예약금 차감 후 신청 가능액으로 해석하지 않는다.
- **AC-03 권한 입구:** 출금·이력·기부는 동작 권한을 따르고 권한 미확정 상태에서 버튼을 확정하지 않는다.
- **AC-04 월별 범위:** 앱의 최근 6개월은 서버 월별 응답이며 없는 월은 0이고 기부·기부 환불만 집계한다.
- **AC-05 취소 시계열:** 기부 원금은 기부한 월에 남고 환불액은 실제 환불한 월의 지출에 들어간다.
- **AC-06 원장 내역:** 최근 5개와 전체 20개 페이지는 서버 원장 조회를 사용하며 거래자 ID의 권한 차이를 지킨다.
- **AC-07 조회 실패:** 빈 결과·첫 조회 오류·추가 페이지 오류를 구분하고 해당 자료를 재시도한다.
- **AC-08 재진입 갱신:** 앱 복귀·재정 화면 재활성화·관련 금전 명령 결과에서 잔액과 필요한 내역을 다시 읽는다.
- **AC-09 상환 입구:** 미납금 상환은 넘기기 상세의 보내는 클럽장·미납금 보류 조건에서 제공한다.
- **AC-10 상환 계약:** 기금 버전·통화·부족액 전액 조건과 필수 요청 키를 적용하고 결과 이후 관련 자료를 갱신한다.

근거는 현재 소스와 `ClubFundPlanTest`의 신청·승인 가용액 단언이다. 현재 수용 기준 10개는 새 제품 시험 10개 통과를 뜻하지 않는다.
