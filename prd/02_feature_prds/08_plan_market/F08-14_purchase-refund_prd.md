# F08-14. 마켓 구매 환불·부분 환불·분쟁 PRD

<!-- release-document: reference -->
> 2026-11-22 서버·앱 소스 대조. 신청·심사·포인트 반환·권리 회수의 현재 계약이다. 제품 시험이나 실제 환불을 새로 실행한 기록이 아니다. 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 적용 범위와 실제 입구

MARKET_ITEM·MARKET_BUNDLE·PLAN_DIRECT 구매를 다룬다. 구매 ID를 상품 ID와 구분한다. [내 보관함](F08-12_my-collection_prd.md)의 환불 입구와 [플랜 상세](F08-02_plan-detail_prd.md)의 직접 구매 환불 입구에서 신청한다. 내 환불 목록과 받은 환불 목록은 각각 구매자·판매자 상세로 연결된다. 판매 제한 중에도 기존 구매를 처리할 수 있도록 회원 환불 컨트롤러는 MARKET 안전 출구로 선언되어 있다.

신청 화면은 사유 QUALITY·NOT_AS_DESCRIBED·MISTAKE·FILE_DEFECT·OTHER 중 하나와 선택 메모를 받는다. 메모를 trim하고 빈 값은 null로 보낸다. 성공하면 신청 화면을 닫아 진입 화면으로 돌아가며, 기간권의 운영팀 검토 안내는 서버 응답의 deciderType을 따른다. 실패하면 입력을 유지한다. 버튼이 보인다는 사실만으로 서버 환불 자격이 충족됐다고 판단하지 않는다.

## 코드 위치

서버 창구는 `PurchaseRefundController`, `SellerRefundController`, 운영자 앱 모듈의 `ManageMarketRefundEscalationController`다. `PurchaseRefundService`는 응답·알림을 조정하고 `MarketRefundCommand`가 잠금·자격·금액·권리·회계를 처리한다. `RefundPlan`, `PeriodPassRefundCalculator`, `RefundDisputeService`, `PurchaseRefundAutoProcessWorker`와 스케줄러를 함께 대조했다.

앱은 `refund_request_screen.dart`, `refund_partial_select_screen.dart`, `refund_detail_screen.dart`, `purchase_refund_provider.dart`를 대조했다. 구매 원천과 매출 행·환불 종결·미수금은 [크리에이터 매출 귀속·정산](F08-15_creator-earning-coverage_prd.md)의 검토 근거를 재사용한다.

## 신청 자격과 판매자·운영자 구분

서버는 본인 구매, ACTIVE, 진행 중 환불로 잠기지 않은 상태, 양수 결제와 대상 매출 행을 확인한다. 유료 구매에 매출 귀속이 없으면 MARKET_REFUND_EARNING_MISSING으로 거절한다. 회원 소유 대상의 일반 신청은 구매 후 14일 이내·미사용이어야 하며, FILE_DEFECT·NOT_AS_DESCRIBED는 기간·사용 제한의 예외 사유다. 플랫폼 기간권만 있는 대상은 회원 상품의 14일·미사용 규칙 대신 기간권 계산을 따른다.

구매 당시 ownerMix=USER는 SELLER, 플랫폼 소유가 포함되면 PLATFORM_QUEUE다. 플랫폼 큐는 sellerUserId가 null일 수 있고 처음부터 ESCALATED, 자동 처리 기한은 null이다. 앱은 플랫폼 큐에 판매자 승인·자료 요청·구매자 분쟁 버튼을 열지 않는다. 기간권 포함 여부와 판매자 ID 하나로 결정권을 추정하지 않는다.

회원 번들의 결정권은 저장된 판매자와 해당 번들 큐레이터에게 있다. 대상 매출의 소유자별 배분과 결정권은 별개다. 판매자 탈퇴와 지급 완료가 겹친 대상은 MARKET_REFUND_SELLER_CLOSED로 차단될 수 있으며, 남은 대상 상태를 확인하지 않고 운영자가 항상 강제 환불할 수 있다고 안내하지 않는다.

최근 30일 신청이 이미 5건 이상이면 다음 회원 상품 신청도 ESCALATED로 시작한다. 구매자별 신청은 직렬화하며 MySQL 교착 희생으로 롤백된 요청에 한해 최대 3회 시도한다. 이 내부 복구는 HTTP 응답 유실에 대한 영수증 재생이 아니다.

## 재신청과 부분 환불

같은 구매의 진행 중 신청과 전액 환불 완료는 재신청을 막는다. 완료된 PARTIAL_ITEM 환불은 남은 대상의 신청을 허용하는 예외다. 일반 시도 한도는 구매·구매자별 2회이며 현재 집계에는 CANCELED도 포함된다. 따라서 기존의 ‘취소하면 횟수를 소모하지 않는다’는 안내는 현재 구현과 맞지 않는다. 판매자 탈퇴로 분쟁만 막힌 거절의 제한적 횟수 구제는 대상 온전성·분쟁 가능 상태 등 별도 조건을 만족해야 한다.

최근 거절 뒤에는 24시간 대기한다. 명시된 reapplyUnlockedAt이 없으면 decidedAt+24시간을 사용한다. 현재 신청 DTO·서비스·화면은 두 번째 신청에 새 사유나 새 증빙을 강제하지 않는다. 이를 구현된 조건으로 기재하지 않는다.

부분 환불은 MARKET_BUNDLE의 구매 시점 bundleItemId 목록을 선택한다. 빈 목록·null·중복·존재하지 않는 대상·이미 종결된 매출 행은 거절한다. 열려 있는 구성품을 모두 고르면 서버는 FULL로 합친다. 임의 금액 입력은 없다. 선택한 회원 상품의 사용 흔적만 자격 판정에 쓰지만 신청 중에는 구매 전체를 잠근다. 승인 후에는 실제 환불된 구성품의 매출·권리만 회수한다.

앱 선택기는 현재 보관함에서 같은 purchaseId의 행을 읽는다. bundleItemId 없는 옛 구매 행이 있으면 전체 환불만 안내한다. 현재 상품의 최신 구성 목록으로 구매 당시 구성을 대체하지 않는다. 사유·메모는 전체 신청 → 항목 선택 → 부분 신청에 전달되며 성공하면 처음 진입한 화면까지 돌아간다.

## 환불액과 포인트·권리 반영

회원 상품의 열려 있는 매출 행은 grossPaid·grossFree를 반환한다. 플랫폼 기간권은 미활성 또는 시작 전이면 해당 유료·무료 몫 전액, 활성 기간 중이면 남은 일수 비율로 각각 내림 계산한다. 사용 일수는 시작부터 지난 24시간 단위에 현재 시작한 하루를 포함한다. 종료 시각에 도달했거나 권리/선납 구간을 찾지 못하면 환불액이 0일 수 있다.

금액은 신청 때 견적을 기록하고 **승인 시점에 다시 계산**한다. 운영자 승인 기대 금액과 현재 계산이 다르면 MARKET_REFUND_AMOUNT_CHANGED로 거절한다. 총액 0은 MARKET_REFUND_NOTHING_REFUNDABLE이다. 신청액을 고정 지급 약속으로 표시하지 않는다.

실행은 원결제 transactionId를 찾아 `WalletRefundCommand`에 유료·무료 분할을 전달한다. 포인트 반환·대상 매출 종결·원장·권리 회수·환불 결과 저장이 같은 명령의 트랜잭션에 들어간다. 실제 반환 대상에서 제외된 매출은 환불 보류만 해제한다. 전액 구매는 환불 상태로, 부분 구매는 해당 구성품 접근 회수로 처리한다. 활성 기간권의 선납 기간도 회수 정책을 적용한다.

정산 전 매출의 환불 종결, 지급 후 미수금 및 후속 상계는 매출 귀속·정산 문서를 따른다. 판매자 지갑에서 즉시 돈을 빼서 구매자에게 보내는 것으로 설명하지 않는다. 이 기능은 포인트 환불이며 앱의 결제 회사 환불 언급만으로 외부 PG 환불 실행까지 증명할 수 없다.

## 상태와 구매자·판매자 행동

| 상태·경로 | 현재 행동과 결과 |
| --- | --- |
| SELLER의 REQUESTED | 구매자 취소, 결정권자 승인·거절·자료 요청. 앱 판매자 버튼도 이 상태에서 표시 |
| AWAITING_BUYER | 구매자 취소·추가 메모 제출. 서버 판매자 거절은 허용하지만 앱 판매자 조작부는 표시하지 않음 |
| PLATFORM_QUEUE의 ESCALATED | 운영자 검토, 구매자 신청 취소 가능. 자동 승인·회원 판매자 판정·구매자 분쟁 없음 |
| SELLER의 ESCALATED | 운영자 검토 대상. 서버는 결정권자의 승인도 허용하지만 현재 앱 승인 버튼은 REQUESTED에만 표시 |
| REJECTED·CANCELED·EXPIRED | 구매 잠금과 대상 REFUND_HELD를 해제. 거절은 재신청 시각·분쟁 가능 여부를 별도로 확인 |
| DISPUTED | 구매와 대상 매출을 다시 잠그고 운영자 판정 대기 |
| REFUNDED | 판매자 승인으로 반환 완료 |
| REFUNDED_BY_OPERATOR | 운영자·분쟁 강제 승인뿐 아니라 현재 AUTO 승인 결과도 이 상태. decisionSource로 AUTO/OPERATOR를 구분 |
| APPROVED·FAILED | enum·잠금 모델에는 존재하지만 현재 승인 명령은 반환과 결과를 한 트랜잭션으로 완료. 모든 승인에서 반드시 거치는 저장 단계로 그리지 않음 |

## 자료 보완과 자동 처리

판매자의 자료 요청은 REQUESTED이며 awaitingBuyerAt이 없는 때 한 번 허용한다. AWAITING_BUYER로 바꾸고 자동 처리 기한을 비운다. 구매자 응답은 메모를 덧붙여 REQUESTED와 새 7일 기한을 설정하며 awaitingBuyerAt은 두 번째 요청을 막는 기록으로 남는다.

자동 처리 작업은 매시 정각, 보완 무응답 만료 작업은 매시 30분에 실행하도록 선언되어 있다. 스케줄러 시간대를 별도로 지정하지 않아 정시의 실제 운영 시간대는 배포 설정 확인 대상이다. 판매자 신청의 7일 기한 경과 후 신청 시점 사용 흔적이 없으면 승인, 있으면 ESCALATED다. 플랫폼 큐는 이 자동 승인 경로에 들어가지 않는다. 보완 대기 7일 초과는 EXPIRED 처리한다. 각 건은 다시 상태·기한을 확인하며 한 건 실패가 나머지를 중단하지 않는다.

## 분쟁과 운영자 처리

구매자 분쟁은 SELLER의 REJECTED에 한한다. 기본 기한은 거절 결정+7일이며 별도 redisputeDeadlineAt이 있으면 그 기한을 쓴다. 같은 신청의 최종 거절 유지 UPHELD 또는 판정 되돌림 DECISION_REVERSED가 있으면 새 분쟁을 막고, OPEN 중복도 거절한다. 앱은 서버 canDispute와 disputeDeadlineAt을 사용한다.

분쟁 입력은 reasonCategory·선택 reasonMemo·선택 evidenceFileIds다. 서버가 증빙 파일을 검증하고 참조를 연결한 뒤 환불 대상을 다시 잠근다. 이미 환불 종결된 대상이나 탈퇴 판매자의 지급 완료 대상은 분쟁 진입에서도 재검사한다. 상세의 통합 분쟁 이동은 REFUND_DISPUTE:{id}를 사용한다. 운영 판정·판정 되돌림의 전체 수명주기는 분쟁 도메인과 함께 관리한다.

관리자 서버는 현재 `community_api/admin-app` 모듈이다. `/admin/v1/manage/market-refund-escalations`에서 목록·상세·승인·거절을 제공한다. 조회는 MANAGE_DISPUTE 읽기, 승인은 MANAGE_DISPUTE와 MANAGE_PAYMENT, 거절은 MANAGE_DISPUTE 권한을 확인한다. 쓰기는 필수 멱등 키를 래퍼에서 검사한다. 운영자 대기열과 구매자가 제기한 분쟁을 같은 목록·상태 모델로 합치지 않는다.

## 재시도와 화면 갱신

판매자 승인만 회원 명령 MARKET_REFUND_SELLER_APPROVE와 필수 Idempotency-Key로 결박한다. 앱은 계정별 영속 의도 보관을 통해 같은 신청·빈 본문을 같은 키로 재시도한다. 성공·커밋된 결과를 다시 읽을 수 없음·서버 반영 가능 오류에는 받은 환불 목록과 상세를 갱신한다. 판매자 지갑 변경 알림은 발생시키지 않는다.

구매자 신청·취소·보완 및 판매자 거절·자료 요청은 이 승인 영수증 계약과 다르다. 신청 실패 뒤 무조건 같은 성공 응답을 돌려준다고 보장하지 않는다. 신청 성공은 내 환불 목록, 취소는 목록과 상세를 갱신한다. 보관함·지갑·만료 배너까지 모든 화면이 즉시 갱신된다고 확대하지 않는다. 알림은 영속 outbox 예약과 실제 단말 수신을 구분한다.

## 요청과 응답

기본 경로는 `/api/v1/market/refunds`다. 회원 창구의 현재 계약은 다음과 같다.

| 요청 | 본문·응답 |
| --- | --- |
| POST 기본 경로 | purchaseId·purchaseSource·reasonCategory·선택 reasonMemo → 201 PurchaseRefundRequestVo |
| POST /partial | purchaseId·selectedBundleItemIds·reasonCategory·선택 reasonMemo → 201 PurchaseRefundRequestVo |
| GET /me 또는 /incoming | PagingParam 기반 page/size → Page<PurchaseRefundRequestVo>; 앱은 페이지 크기 20 |
| GET /{refundId} | PurchaseRefundRequestVo |
| DELETE /{refundId} | 취소 결과 PurchaseRefundRequestVo, 200 |
| POST /{refundId}/respond | memo → PurchaseRefundRequestVo |
| POST /{refundId}/approve | 필수 Idempotency-Key, 본문 없음 → PurchaseRefundRequestVo |
| POST /{refundId}/reject | rejectionReason → PurchaseRefundRequestVo |
| POST /{refundId}/request-evidence | 본문 없음 → PurchaseRefundRequestVo |
| POST /{refundId}/dispute | reasonCategory·reasonMemo·evidenceFileIds → 201 PurchaseRefundDisputeVo |

응답의 핵심은 refundId·purchaseId·purchaseSource·buyerUserId·nullable sellerUserId·deciderType·periodPassIncluded·refundScope·requestedAmount·nullable approvedAmount·status·attemptNo·각 처리 시각·canDispute·disputeDeadlineAt·activeDisputeId·disputeStatus·operatorDecision·decisionReversed·viewerIsDecider다. 앱은 저장된 판매자 번호만 비교하지 않고 viewerIsDecider로 결정권자를 표시한다.

## 현재 제한과 확인 범위

| 구분 | 현재 경계 |
| --- | --- |
| Gap | 서버의 판매자 ESCALATED 승인·AWAITING_BUYER 거절과 앱 버튼 노출 범위가 다르다 |
| Gap | 일반 환불 신청에는 승인과 같은 영수증 키가 없고, 취소도 신청 횟수에 포함된다. 새 증빙 필수·취소 횟수 면제는 현재 기능이 아니다 |
| 정책 보류 | 과거 문서의 자동 판매자 패널티 임계값·신뢰점수 가중치·장기 미수금 처리 시점·타 도메인 환불 통일은 이 코드 대조로 확정하지 않았다. 구현된 자동 제재나 실행할 신규 SQL로 취급하지 않는다 |
| 검증 범위 | 소스와 기존 플랫폼 큐·부분 환불 복귀 시험 단언을 열람했다. 새 DB 환불·외부 결제·푸시 수신·스케줄러 실행·앱-서버 통합 시험은 수행하지 않았다 |

## 수용 기준과 검증 근거

- **AC-01 입구·반환:** 보관함/플랜 구매에서 신청하고 성공 시 원래 화면으로 돌아간다. 부분 선택을 거쳐도 사유·메모와 복귀 결과를 보존한다.
- **AC-02 자격:** 본인 ACTIVE·잠금·매출·회원 대상 14일/사용 조건을 서버에서 검사하며 하자·설명 불일치 예외를 구분한다.
- **AC-03 결정권:** ownerMix에 따른 SELLER/PLATFORM_QUEUE와 nullable 판매자·viewerIsDecider를 사용한다. 플랫폼 큐에 판매자·분쟁 버튼을 열지 않는 기존 시험 단언을 읽었다.
- **AC-04 재신청:** 횟수 집계·취소 포함·24시간·판매자 탈퇴의 제한적 구제를 코드와 일치시킨다. 미구현 새 증빙 강제를 제거한다.
- **AC-05 부분 대상:** 구매 당시 구성품과 미종결 매출을 확인하고 전체 선택은 FULL로 합친다. 사용 흔적 범위와 구매 전체 잠금을 구분한다.
- **AC-06 금액:** 기간권의 일수별 유료/무료 내림과 승인 시 재계산을 반영한다. 신청액과 실제 승인액을 구분하는 기존 시험 단언을 읽었다.
- **AC-07 원자 반영:** 원결제 기반 포인트 반환·매출 종결·원장·권리 회수·결과 저장을 같은 명령에서 처리한다. 실제 실행 통과는 주장하지 않는다.
- **AC-08 상태:** 판매자·자동·운영자 완료 상태와 decisionSource를 구분한다. APPROVED/FAILED를 필수 중간 저장 단계로 그리지 않는다.
- **AC-09 보완·자동:** 보완 한 번, 새 7일 기한, 무응답 만료, 사용 흔적별 승인/에스컬레이션과 플랫폼 큐 제외를 대조한다.
- **AC-10 분쟁:** 서버 기한·최종 판정·재검토 차단·대상 재검사를 따른다. canDispute를 클라이언트의 날짜 추측으로 대체하지 않는다.
- **AC-11 승인 복구:** 영속 승인 키와 결과 불명 뒤 목록·상세 갱신을 구분하고 다른 환불 명령에 같은 보장을 확대하지 않는다.
- **AC-12 운영 경계:** 관리자 모듈·권한·멱등 키와 outbox 예약을 기록하며 실제 돈 이동·단말 전달·법적 검토 완료로 표시하지 않는다.

위 12개는 문서 수용 항목이며 새 시험 통과 수가 아니다.
