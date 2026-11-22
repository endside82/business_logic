# F08-07. 크리에이터 프로필·판매 현황 PRD

<!-- release-document: reference -->
> 2026-11-22 소스 대조. 기능 계약을 설명하며 실제 서비스·기기 검수나 새 시험 통과 기록이 아니다. 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 실제 입구와 화면의 역할

- 상품 상세에서 `creatorId`가 있는 크리에이터 정보를 누르면 `/market/creators/{creatorId}`로 이동한다. 프로필과 해당 창작자의 대표 플랜을 보는 화면이다.
- 본인 통계는 전체 메뉴의 **판매 현황**(`hosting.creatorStats`)에서 `/market/creators/me/stats`로 연다. 메뉴 노출 조건은 MARKET 공개와 본인 상품 기록이며 메뉴 전용 배치다. 예전 플랜 목록의 차트 아이콘을 현재 입구로 설명하지 않는다.
- 두 화면은 분리되어 있다. 본인 ID로 프로필을 열어도 판매 현황으로 자동 전환되지 않는다. 메뉴 노출 조건은 통계 API의 권한 조건과 동일하지 않다.
- 대표 플랜 카드는 `/home/market/{planId}`의 `MarketPlanDetailScreen`으로 이동한다. 상품 ID를 받는 `/market/items/{itemId}`와 바꿔 쓰지 않는다.

## 코드 위치

서버는 `CreatorController`, `CreatorService`, `CreatorProfileAccountAdapter`, `CreatorStatsPaymentAdapter`, `PlanPurchaseQueryRepository`, `CreatorStatsQueryRepository`, `CreatorRefundStatsQueryRepository`, `CreatorEarningQueryRepository`, `ItemReviewQueryRepository`가 근거다. 앱은 `app_menu.dart`, `creator_profile_screen.dart`, `creator_stats_screen.dart`, `creator_provider.dart`, `market_api.dart`, `market_repository.dart`, 두 기능 라우트 파일을 대조했다.

<!-- source-references:start -->
서버 창구: `CreatorController#getCreatorProfile`, `CreatorController#getMyStats`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 프로필 접근과 대표 플랜

두 API 모두 로그인 principal이 필수이고 컨트롤러는 MARKET 공개 범위를 적용한다. 프로필을 비로그인 공개 API로 기록하거나 익명 허용 변경을 현재 필수 작업으로 추가하지 않는다. 프로필 조회 시 타인과 상호 차단 관계면 `USER_NOT_FOUND`이며 본인 조회는 차단 검사를 생략한다. 계정 조회 결과가 없을 때도 `USER_NOT_FOUND`다.

프로필 응답은 `userId`, `nickname`, `profileImageUrl`, `planCount`, `totalSales`, nullable `averageRating`, `joinedAt`이다. 이미지는 저장 키에서 표시 URL로 변환한다. 평균별점은 해당 창작자 소유 상품의 삭제되지 않은 후기 평균이다.

현재 화면은 프로필 이미지·닉네임과 **판매 플랜**, **판매 실적** 두 수치를 보여 준다. `averageRating`과 `joinedAt`은 별도 표시하지 않는다. 소개 문구 **카페/데이트 플랜 전문**은 서버의 개인 소개가 아니라 화면에 고정된 문구다.

`planCount`는 상태 조건 없는 전체 플랜 수로 DELETED도 제외하지 않는다. 따라서 화면의 판매 플랜 수를 판매 중 상품 수나 공개 플랜 수로 해석하면 안 된다. `totalSales`는 창작자의 플랜 구매 기록 건수다.

대표 목록은 `GET /api/v1/plans?creatorId=…&size=20`의 PUBLISHED 첫 페이지다. 전체 플랜 수와 일치할 필요가 없고, 현재 화면에 추가 페이지 요청은 없다. 대표 목록 요청 실패는 로딩을 끝내고 빈 목록 문구로 이어지므로 **상품이 실제로 0개라는 증거가 아니다**. 프로필 본체 조회 실패의 오류·재시도와 구분한다.

## 판매 수와 금액의 집계

판매 현황은 로그인 본인 ID로 계산하며 조회 기간·다른 판매자 ID를 받지 않는다. 응답은 17개 필드다.

| 필드 | 현재 집계 의미 |
| --- | --- |
| `totalPlanCount` | 상태를 제외하지 않은 본인 전체 플랜 수 |
| `publishedPlanCount` | 본인 PUBLISHED 플랜 수 |
| `totalSalesCount` | 본인 플랜에 연결된 `PlanPurchase` 행 수 |
| `totalSalesAmount` | 같은 구매 기록의 `pricePaid` 합계 |

판매 건수와 금액 쿼리에는 별도의 환불 상태 제외나 환불액 차감이 없다. 누적 판매 금액을 정산 가능 금액·순수익·모든 상품 유형의 매출 합계로 설명하지 않는다. 앱은 금액을 쉼표와 **P** 단위로 표시한다. 환불 집계는 아래와 같이 원천이 별도다.

## 환불·분쟁의 수익 귀속

| 필드 | 현재 집계 의미 |
| --- | --- |
| `refundedCount` | 귀속되는 REFUNDED·REFUNDED_BY_OPERATOR 환불 건수 |
| `refundedAmount` | 같은 확정 환불에 귀속되는 금액 합계 |
| `refundHeldAmount` | 본인 `ownerUserId`의 REFUND_HELD 수익 `grossAmount` 합계 |
| `disputeCount` | 본인에게 귀속되는 환불의 분쟁 건수 |
| `disputeLostCount` | 그중 OVERTURNED 분쟁 건수 |

상품 판매자 ID를 일괄 기준으로 삼지 않는다. FULL 환불은 구매 원천과 연결된 수익의 `ownerUserId`로 귀속을 판정하고 귀속 수익 금액을 합한다. PARTIAL_ITEM은 환불 항목의 `ownerUserId`와 `requestedAmount`를 사용한다. 따라서 번들 판매자와 원작자가 다를 때도 수익 귀속을 기준으로 계산한다. 확정 환불 금액 쿼리는 현재 수익 상태로 재차 필터링하지 않으며, 보류 금액은 현재 REFUND_HELD 상태를 사용한다.

## 전환·커뮤니티·상세 조회 집계

| 필드 | 현재 집계 의미 |
| --- | --- |
| `planPurchaseTotalCount` | 본인 플랜 구매 기록 전체 건수 |
| `planToEventConvertedCount` | 이벤트에 연결된 서로 다른 `planPurchaseId` 수 |
| `planToEventConversionRate` | 위 전환 구매 수 ÷ 구매 수. 분모가 0이면 0.0 |
| `clubPostViewTotal` | 본인이 작성한 ACTIVE 클럽 글의 저장된 조회 수 합 |
| `clubPostCommentTotal` | 같은 글의 저장된 댓글 수 합 |
| `clubPostLikeTotal` | 같은 ACTIVE 글에 연결된 좋아요 행 수 |
| `planViewTotal` | 본인 플랜의 저장된 조회 수 합, 별도 상태 제외 없음 |
| `marketItemViewTotal` | 본인 `ownerUserId` 상품의 저장된 조회 수 합, 별도 상태 제외 없음 |

하나의 구매로 이벤트 여러 개를 만들어도 전환 분자는 구매 한 건으로 센다. 전환율 표시는 백분율에 소수 최대 한 자리로, 0은 **0%**, 0.225는 **22.5%**다. 조회 수는 현재 저장된 카운터 합이며 고유 방문자 수나 실시간 반영 보장을 뜻하지 않는다.

## 조회·갱신·복귀

프로필은 ID별 provider, 판매 현황은 본인 통계 provider로 조회한다. 판매 현황의 데이터 상태에서는 당겨서 갱신하면 provider를 무효화해 다시 요청한다. 오류 상태는 다시 시도를 제공한다. 현재 provider에는 판매·환불 변경 신호 구독이 없어 같은 화면을 보고 있는 동안 수치가 자동으로 최신화된다고 보장하지 않는다.

판매 현황은 요약·플랜과 판매 건수·환불과 분쟁·이벤트 전환·커뮤니티·상세 조회 영역을 보여 준다. 값이 모두 0이어도 각 영역을 유지한다. 프로필이나 통계 자체에서 구매·수정·정산 명령을 수행하는 흐름은 아니다. 상세로 이동한 경우 뒤로 가기는 기존 탐색 경로를 따른다.

## 요청과 응답

| 요청 | 응답·권한 |
| --- | --- |
| `GET /api/v1/creators/{creatorId}` | `CreatorProfileVo`; 로그인·MARKET·타인 상호 차단 확인 |
| `GET /api/v1/creators/me/stats` | `CreatorStatsVo`; 로그인 본인·MARKET |
| `GET /api/v1/plans?creatorId=…&size=20` | 공개 플랜 페이지; 프로필 대표 목록에서 첫 페이지 사용 |

## 현재 제한과 확인 범위

| 분류 | 현재 관찰 | 처리 |
| --- | --- | --- |
| Gap | 대표 플랜 조회 실패가 빈 목록처럼 보이고 재시도·추가 페이지 입구가 없음 | 빈 결과와 장애를 동등한 성공으로 검수하지 않음 |
| Gap | 판매 플랜 라벨과 전체 상태를 포함하는 집계 범위가 다름 | 현재 계산 의미를 명시; 판매 중 수로 바꾸어 기술하지 않음 |
| Gap | 소개는 고정 문구이고 평균별점·가입일은 응답에만 있음 | 사용자 입력 소개나 별점 표시가 구현됐다고 기록하지 않음 |
| 미검증 | 실제 계정·상품·환불·분쟁 데이터와 앱 간 결과 대조 | 이번 작업은 소스·기존 단언 검토이며 새 실행 결과 없음 |

운영자 정지·탈퇴 시 계정 노출 정책 전부를 이번 조회 코드만으로 검증했다고 확대하지 않는다. 과거 시나리오의 상품 상세 핸드오프 설명은 원문으로 보존하되, 현재 라우트는 플랜 ID 상세임을 우선한다.

## 수용 기준과 검증 근거

- **AC-01 실제 입구:** 상품 상세의 창작자 정보를 누르면 해당 creatorId 프로필을 연다. 판매 현황은 MARKET 공개·상품 기록 조건을 충족한 전체 메뉴에서 별도로 연다.
- **AC-02 접근 제한:** 두 API는 로그인 본인 principal을 요구한다. 타인과 상호 차단이거나 계정을 찾을 수 없으면 프로필 조회가 USER_NOT_FOUND로 끝나고, 본인 조회에는 차단 검사를 적용하지 않는다.
- **AC-03 프로필 표시:** 닉네임·이미지·전체 플랜 수·판매 실적을 표시하고 nullable 별점을 표시 중이라고 주장하지 않는다. 고정 소개를 개인 작성 정보로 취급하지 않는다.
- **AC-04 대표 플랜:** PUBLISHED 첫 20개를 표시하고 카드의 planId를 그대로 MarketPlanDetailScreen 경로에 전달한다. 전체 플랜 수와 대표 목록 수가 같아야 한다고 요구하지 않는다.
- **AC-05 조회 실패 구분:** 프로필 본체 오류는 재시도 대상이다. 대표 목록 오류는 현재 빈 목록으로 보이는 제한을 기록하고 성공 조회로 판정하지 않는다.
- **AC-06 판매 집계:** 전체 플랜·PUBLISHED 플랜·플랜 구매 건수·pricePaid 합계를 구분한다. 환불 차감 후 순수익이나 모든 상품 매출이라는 해석을 배제한다.
- **AC-07 환불 귀속:** FULL의 수익 ownerUserId와 PARTIAL_ITEM의 환불항목 ownerUserId로 귀속을 판정한다. 확정 환불 두 상태와 현재 REFUND_HELD 보류액을 구분한다.
- **AC-08 분쟁 집계:** 귀속 분쟁 전체와 OVERTURNED 건수를 구분하여 표시한다. 판매자 ID와 수익 귀속자가 다를 수 있는 조건을 포함한다.
- **AC-09 전환율:** 이벤트로 이어진 서로 다른 구매 수를 분자로 삼는다. 동일 구매 재사용은 중복 전환으로 세지 않고 0분모는 0%, 27/120은 22.5%로 표시한다.
- **AC-10 활동 집계:** ACTIVE 글의 조회·댓글·좋아요와 별도 상태 필터 없는 플랜·상품 조회 합을 구분한다. 고유 방문자 수로 해석하지 않는다.
- **AC-11 갱신과 0 값:** 판매 현황의 당겨서 갱신·오류 재시도를 통해 다시 조회하며 0 값에서도 각 영역을 유지한다. 판매나 환불 직후 자동 갱신을 보장하지 않는다.

`CreatorServiceTest`의 차단·본인 예외·집계 매핑·0분모 단언과 `creator_stats_screen_test.dart`의 P 금액·환불·전환·활동·0%·재시도 단언을 읽었다. 저장소 집계 쿼리와 실제 데이터 결과의 일치까지 이 mock 기반 단언만으로 증명하지 않는다. 이번에는 제품 시험·브라우저·이미지 검수를 실행하지 않았다.
