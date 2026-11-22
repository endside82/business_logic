# F08-12. 내 보관함 PRD

<!-- release-document: reference -->
> 2026-11-22 소스 대조. 실제 입구·활성화·상품 전달·환불 연결·복귀를 기록한다. 새 제품 실행 통과 기록이 아니다. 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 진입과 화면의 역할

로그인 회원이 상품·번들 구매로 받은 보관함 항목을 켜고 이용하는 화면이다. 경로는 `/market/collection`, 이름은 `planMarketCollection`이다. [구매](F08-11_purchase_prd.md) 성공 뒤 이동하고, 마켓 상단의 **내 보관함**에서도 연다. 전체 메뉴의 `money.marketRefunds`는 **마켓 구매·환불**이라는 이름으로 구매 기록이 있는 회원에게 이 경로를 제공한다. 프로필에 언제나 같은 이름의 메뉴가 있다고 설명하지 않는다.

상단 **내 환불 내역**, 카드 본문 **상품 상세**, 행의 **켜기/상품 이용**, 행 더보기의 **환불 신청**은 목적과 결과가 다른 입구다. 카드 본문은 `/market/items/{itemId}`로 이동하며 상품 이용을 대신 실행하지 않는다. 플랜 직접 구매는 별도의 ACTIVE 권리·플랜 본문 경로이므로 모든 구매가 이 목록에 같은 모양으로 생긴다고 보장하지 않는다.

## 코드 위치

서버는 `CollectionController`, `CollectionService`, `PurchaseAccessService`, `MarketAbilityPolicy`, `MarketEntitlementService`, 자원별 전달 어댑터와 `CollectionVo`, `ProductDeliveryVo`가 근거다. 앱은 `plan_market_routes.dart`, `release_scope_routes.dart`, `app_menu.dart`, `market_main_screen.dart`, `my_collection_screen.dart`, `collection_provider.dart`, `market_api.dart`, `market_repository.dart`, 두 응답 모델을 대조했다.

<!-- source-references:start -->
서버 창구: `CollectionController#getMyCollection`, `CollectionController#activateItem`, `CollectionController#getExpiringItems`, `CollectionController#deliver`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 목록 조회와 표시

화면은 보관함 전체와 만료 예정 목록을 별도로 조회한다. 목록 응답은 `List<CollectionVo>`이며 페이지 응답이 아니다. 전체 조회는 생성 시각 역순의 회원 보관함에서 회수·만료 및 구매 접근 조건을 적용한다. `active=true`일 때만 활성 보관함 조회로 바뀌며, false나 생략을 미활성 전용 조회로 해석하지 않는다. 앱은 전체를 받아 필터링한다.

주요 필드는 collectionId·itemId·itemTitle, purchaseId·purchaseType·bundleId·bundleItemId, productVersionId·entitlementId·resourceType·resourceId·resourceVersion·entitlementStatus·deliveryAction, quantity·activated·activatedAt·expiredAt, 이용 횟수/시각, `actions.activate`다. 서버의 `activated`를 임의로 `isActivated` JSON 키로 바꾸지 않는다. 상품 제목은 현재 상품에서, 자원 유형·버전은 권리의 상품 버전에서 가져온다. 권리가 참조하는 버전이 없으면 버전 필요 오류로 조회가 실패할 수 있다.

| 화면 상태 | 현재 표시·행동 |
| --- | --- |
| 처음 읽는 중 | 내 보관함 로딩 안내 |
| 목록 오류 | 오류 화면과 다시 시도. 다시 시도는 보관함 목록 재조회 |
| 선택 필터가 비었음 | 구매한 플랜이 없다는 빈 안내. 자동 마켓 이동·빈 상태 전용 구매 버튼 없음 |
| 항목 미활성 | 꺼짐. 서버 activate.allowed가 true일 때 켜기 |
| 활성·기간 없음 | 사용 중 · 기한 없음 |
| 활성·기간 있음 | 사용 중 D-N. 남은 일수는 서울 벽시계 기준 정수 일수 |
| 만료 시각이 지남 | 만료 표시·주 행동 없음. 새 서버 조회에서는 만료 행이 제외됨 |

화면 필터는 **전체·사용 중·만료 예정**이다. 별도의 만료 이력 필터는 없다. 사용 중은 activated이면서 만료 시각이 없거나 현재보다 뒤인 행이다. 만료 예정은 activated이고 현재보다 뒤부터 7일 뒤까지인 행이다. 화면에 이미 있던 행의 만료 표시는 서버가 만료 이력을 계속 반환한다는 보장이 아니다.

## 판매 제한과 기존 구매권

서버 보관함 컨트롤러는 MARKET의 safetyExit이며 앱도 마켓이 닫혔을 때 `/market/collection`을 허용 경로로 둔다. 신규 판매 공개와 이미 산 권리의 조회·이용 입구를 구분한다. 다만 카드에서 이동한 상품 상세 등 다음 화면의 공개 조건까지 모두 우회하는 것은 아니다.

조회는 회수된 행·만료된 행을 제외하고, 연결 구매가 ACTIVE인지 확인한다. 환불 잠금 중에는 SUBSCRIPTION 유형만 계속 이용하도록 `RefundPendingUsePolicy`가 허용한다. 일반 상품의 환불 잠금은 조회·이용을 제한한다. 오래된 행의 purchaseId 또는 구매 행이 없을 때 조회가 허용되는 호환 동작과, 실제 이용 시 purchaseId가 있으면 구매 행이 필요하다는 조건도 구분한다.

미공개·판매 중지 상품과 기존 구매권은 별개다. 연결된 플랜의 가시성·발행 제한은 [플랜 상세](F08-02_plan-detail_prd.md)와 [플랜 발행](F08-05_plan-publish_prd.md)을 함께 적용한다. 이 화면에 행이 보인다는 이유만으로 모든 콘텐츠 접근이 허용된다고 판정하지 않는다.

## 켜기와 반복 요청

`POST /api/v1/market/collection/{id}/activate`는 응답 본문 없는 200이다. 서버는 보관함을 잠그고 본인 행인지, 이용 가능한 구매인지, 권리의 소유자와 유효 상태가 GRANTED 또는 ACTIVE인지 순서대로 확인한다.

- 없는 행·남의 보관함 행: NOT_FOUND.
- 회수·만료·구매 상태 등 이용 불가: MARKET_COLLECTION_NOT_USABLE.
- 권리 없음: MARKET_ENTITLEMENT_NOT_FOUND. 남의 권리: FORBIDDEN.
- 유효 권리 상태가 GRANTED/ACTIVE 아님: MARKET_ENTITLEMENT_INACTIVE.
- 이미 유효한 ACTIVE: 기존 권리를 반환하며 활성화 시각·기간을 새로 늘리지 않는다. 기존 문서의 무조건 400 이중 활성화 설명은 적용하지 않는다.

새 활성화는 권리의 승인 상품 버전으로 기간을 계산하고 어댑터 grant를 실행한 뒤 보관함에 활성화 시각·만료 시각을 반영한다. 일반 기간은 DAY/MONTH/YEAR에 따라 더하며 NONE 또는 기간 없음은 만료 시각 없음이다. EXPIRATION도 이 일반 계산 함수에서는 null이며 별도 자원 어댑터의 결과와 구분한다. 양수가 아닌 기간 값은 거절한다.

앱은 서버 `actions.activate.allowed`가 없거나 false이면 켜기를 제공하지 않는다. 요청 중 및 후속 목록 재조회 중 같은 행을 잠근다. 성공 후 재조회가 끝나면 켰다는 안내를 표시한다. 능력 거절은 원천 목록을 다시 읽는 공통 처리로 연결한다. 새 목록 읽기가 실패하면 이전 행을 성공 상태처럼 남기지 않고 오류·다시 시도를 표시한다.

## 상품 전달과 실제 결과 열기

활성 행은 deliveryAction이 있고 entitlementStatus가 ACTIVE일 때 이용 단추를 제공한다. 사용은 `POST /api/v1/market/collection/{id}/deliver`와 필수 `Idempotency-Key`를 사용한다. 서버는 소유·구매 이용권·실제 권리 상태·만료를 다시 확인하며 키는 공백 없이 최대 120자다.

| 전달 action | 단추 | 성공 응답 후 실제 행동 |
| --- | --- | --- |
| OPEN_PLAN | 플랜 열기 | deliveredPlanId의 planDetail 화면 |
| DOWNLOAD_FILE | 받기 | downloadUrl을 외부 앱으로 열기 |
| EVENT_PACKAGE_READY | 모임 만들기 | deliveredPlanId의 planCreateEvent 화면 |
| SUBSCRIPTION_EXTENDED | 혜택 확인 | 응답 만료 시각 또는 구독 연장 안내 |

응답에는 entitlementId·resourceType·resourceId·resourceVersion·status·action, 선택적 downloadUrl·deliveredPlanId·remainingQuantity·activatedAt·expiresAt와 replayed가 있다. 보관함의 `expiredAt`과 전달 응답의 `expiresAt` 이름을 혼동하지 않는다. 결과 ID/URL이 없거나 파일을 열지 못하면 전달됐지만 열 수 있는 결과가 없다는 안내를 한다. 서버 전달 성공과 외부 파일 열기 성공은 별도다.

동일 권리·동일 전달 키의 성공 기록이 있으면 어댑터로 결과를 다시 만들고 replayed=true를 반환한다. 이 경우 보관함 downloadCount·첫/마지막 이용 시각을 다시 늘리지 않는다. 새 전달 성공일 때는 파일 외 유형도 이 이용 횟수 필드에 기록된다. 재시도도 현재 ACTIVE·만료 조건을 먼저 통과해야 한다.

앱 키는 해당 공급자의 메모리 맵에 항목별로 보관하며 실패 시 유지, 서버 성공 시 제거한다. 구매 명령의 디스크 보관 키와 같은 재시작 보장을 제공한다고 쓰지 않는다. 이용 결과는 후속 목록 재조회를 기다리지 않고 즉시 열고, 같은 행의 잠금은 재조회 완료까지 유지한다. 결과 화면에서 돌아올 때 아직 읽는 중이면 이전 행이 잠긴 채 보이고, 재조회가 끝나면 새 목록을 표시한다. 서버 성공 뒤 외부 결과 열기에 실패한 경우에는 이미 키가 제거된 상태라는 경계도 있다.

옛 `/download` POST와 API 함수는 남아 있으나 현재 이용 단추는 호출하지 않는다. 서버는 해당 경로의 권한 검사 후 MARKET_PRODUCT_VERSION_REQUIRED를 반환한다. 단순 다운로드 기록 API를 현재 상품 전달 경로로 설명하지 않는다.

## 기간권의 구매 조건과 혜택 확인

기간권 활성화는 권리에 저장한 grantedTerms의 플랜 유형·개월 수로 `grantPrepaidDuration`을 호출하고, 실제 부여 결과의 시작·끝 시각을 권리에 보관한다. 현재 상품 설정을 다시 읽어 구매 당시 기간을 바꾸지 않는다. 저장 조건이 없으면 MARKET_PRODUCT_VERSION_INVALID다. 상세 판매 조건은 [회원 상품과 플랫폼 기간권](F08-06_market-item-management_prd.md#회원-상품과-플랫폼-기간권)을 따른다.

기간권의 혜택 확인 deliver는 저장된 권리 결과를 반환한다. 단추를 누를 때마다 구독 기간을 다시 적립하지 않는다. 환불 잠금 중 이용 예외는 이 유형에만 적용하며, 환불 시 권리 회수는 별도의 환불 경로가 수행한다.

## 만료 예정·갱신·새로고침

서버 만료 예정 조회는 한 현재 시각부터 정확히 7일 뒤까지 활성 항목을 조회한 뒤 본인·접근 조건을 적용한다. 배너 조회가 실패하거나 로딩 중이면 배너를 숨기며 별도 배너 오류를 표시하지 않는다. 만료 예정이 한 개이고 itemId가 있으면 **갱신하기**는 그 원상품 상세로 이동한다. 여러 개이거나 itemId가 없으면 현재 목록의 만료 예정 필터를 선택한다. 갱신하기 자체가 재구매·결제·기간 연장을 실행하지 않는다.

당겨서 새로고침은 보관함과 만료 예정 공급자를 둘 다 무효화한다. 켜기·이용 뒤의 공급자 refresh는 보관함을 다시 읽으며 만료 예정 공급자까지 자동 갱신하지 않는다. 자동 타이머로 매초 D-day·배너를 재계산한다는 계약은 없다.

카드의 만료 표시는 `현재 > 만료 시각`, 사용 중 필터는 `만료 시각 > 현재`, 서버 권리 판정은 `만료 시각 <= 현재`를 사용한다. 정확히 같은 시각의 화면 표기와 허용 동작을 하나의 동일한 비교식으로 문서화하지 않는다. 최종 이용 허용은 서버가 판정한다.

## 환불 연결과 복귀

행 더보기의 환불 신청은 purchaseId가 있을 때 신청 화면을 연다. purchaseType=BUNDLE이면 MARKET_BUNDLE, 그 외는 MARKET_ITEM으로 전달하며 bundleId·상품명·같은 구매의 기간권 포함 여부를 함께 넘긴다. 단추가 보인다는 사실만으로 기한·사용량·판매자 판단까지 환불 가능하다고 확정하지 않는다. 신청 조건과 후속 결정은 [구매 환불](F08-14_purchase-refund_prd.md)을 따른다.

보관함·이용 결과·상품 상세·환불 내역은 각 경로로 이동한다. 이용 성공의 목록 갱신은 공급자가 유지해서 처리하며 결과 화면에서 돌아왔을 때 새 상태 또는 재조회 오류를 보여 준다. 환불 화면 복귀만으로 목록·배너가 모두 자동 갱신된다는 별도 보장은 이 화면에 없다.

## 요청과 응답

| 요청 | 인자·응답 |
| --- | --- |
| GET /api/v1/market/collection | 선택 Boolean active. List<CollectionVo>, 페이지 없음 |
| GET /api/v1/market/collection/expiring | List<CollectionVo> |
| POST /api/v1/market/collection/{id}/activate | 보관함 ID. 200, 본문 없음 |
| POST /api/v1/market/collection/{id}/deliver | 보관함 ID와 필수 Idempotency-Key. ProductDeliveryVo |

네 요청은 회원 신원과 자신의 보유 항목을 기준으로 한다. 활성화와 전달의 권한 오류를 동일한 403으로 뭉뚱그리지 않는다.

## 현재 제한과 확인 범위

| 구분 | 경계와 후속 확인 |
| --- | --- |
| 미검증 | 소스·선택된 기존 단언을 읽었으며 실제 앱·외부 파일·구독 적립·환불 동시성 시험을 새로 실행하지 않았다 |
| Gap | 전달 키는 메모리에 보관한다. 앱 재시작을 포함한 장기 결과 불명 복구를 구매 영수증과 동일하게 보장하지 않는다 |
| Gap | 켜기·전달 후 만료 예정 배너는 별도 자동 갱신이 아니며, 빈 필터도 구매 없음 문구를 쓴다. 실제 UI와 문서를 일치시킨 내용이지 기능 수정 완료가 아니다 |
| Risk | 만료 경계의 표시·필터·서버 비교식이 다르며, 앱 표시는 서버의 최종 권리 판정을 대신하지 않는다 |
| 기준 | 플랫폼 기간권·마켓의 판매 공개와 기존 구매권 이용, 상품 상세 진입과 실제 전달을 각각 판정한다 |

## 수용 기준과 검증 근거

- **AC-01 실제 입구:** 구매 성공·마켓 보관함·구매 기록이 있는 회원의 전체 메뉴가 같은 보관함 경로를 연다. 상단 환불 내역·카드·이용·더보기를 목적별로 구분한다. 라우터·메뉴·화면을 대조했다.
- **AC-02 목록 계약:** 전체/active 조회는 List이며 서버 접근 필터를 적용한다. 앱의 전체·사용 중·만료 예정 필터와 만료 이력 미제공을 구분한다. 서비스·화면 필터가 근거다.
- **AC-03 켜기 권한:** 남의 행은 NOT_FOUND, 이용 불가는 전용 오류이며 actions.activate 허용일 때만 켜기를 제공한다. 서비스·정책과 회수 행 시험 단언을 읽었다.
- **AC-04 반복 활성화:** GRANTED를 ACTIVE로 만들고 유효한 ACTIVE 재요청은 기존 기간을 보존한다. 권리 서비스가 근거다.
- **AC-05 전달 목적지:** 네 action별 플랜·외부 파일·모임 작성·혜택 안내로 연결한다. 기존 전달 시험은 deliver 한 번과 legacy download 미호출, 실제 플랜 ID 이동을 단언한다.
- **AC-06 전달 재시도:** 같은 키 성공 재생은 이용 횟수를 늘리지 않으며, 앱은 실패 키를 메모리에서 유지한다. 서버·공급자를 대조했다. 재시작 지속성은 보장하지 않는다.
- **AC-07 결과와 목록 갱신:** 결과는 재조회보다 먼저 열고 같은 행은 재조회가 끝날 때까지 잠근다. 기존 잠금 시험의 복귀·중복 호출 방지 단언을 읽었다.
- **AC-08 재조회 실패:** 서버 성공 뒤 목록 갱신이 실패하면 결과를 취소하지 않고 보관함에 오류·다시 시도를 제공한다. 기존 잠금 시험의 해당 단언을 읽었다.
- **AC-09 만료와 갱신:** 7일 조회, 서울 벽시계 필터, 한 항목 상세 이동/여러 항목 필터 선택을 적용한다. 서비스 기간 인자와 벽시계 단언, 화면 갱신 분기를 대조했다.
- **AC-10 기간권:** 활성화는 저장된 구매 조건으로 기간을 부여하고 혜택 확인은 재적립하지 않는다. 기간권 어댑터의 grant/deliver를 대조했다.
- **AC-11 환불과 제한:** MARKET이 닫혀도 보관함 경로는 안전 출구로 두며, 환불 잠금 중 이용은 기간권만 예외다. 환불 입구가 최종 승인 보장이 아님을 표시한다. 라우팅·접근 정책·화면이 근거다.

위 11개는 문서 수용 항목이다. 기존 시험의 선택된 단언을 읽은 범위이며 이번 갱신에서 제품 시험은 실행하지 않았다.
