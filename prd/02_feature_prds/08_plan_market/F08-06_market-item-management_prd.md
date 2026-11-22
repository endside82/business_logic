# F08-06. 내 상품 등록·심사·판매 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

> 2026-11-22 현재 서버와 앱 소스 대조. 상품 등록, 후보 버전 심사, 판매 상태와 편집·실패·복귀를 구분한다. 실제 기기·파일 업로드·운영자 심사·예약 실행을 새로 수행한 기록은 아니다.

## 실제 입구와 공개 범위

전체 메뉴의 **내 상품**은 MARKET 범위가 열려 있고 상품 기록이 있을 때 표시한다. `CreatorMarketItemsScreen`은 본인 상품을 100개씩 추가 조회하며 새 상품, 받은 환불 요청, 각 카드의 미리보기와 **편집·판매 관리**를 제공한다. 빈 목록도 당겨 새로고침과 상품 만들기를 제공하며 목록 오류와 추가 조회 실패를 각각 재시도한다.

편집·판매 관리는 `planMarketItemEdit` 경로로 들어간다. 상품 상세의 후기 더보기 안에 있는 수정은 후기 수정이므로 이 상품 편집 입구와 혼동하지 않는다. 화면 진입 자체를 쓰기 권한의 승인으로 보지 않으며 서버는 회원 소유자를 확인한다. 플랫폼 소유 상품은 회원 소유 판정에 포함하지 않는다.

공개 API의 상품 등록·수정·심사 제출·판매 시작/중지·삭제는 MARKET 범위에 속한다. 본인 상품 목록과 본인 심사 이력에는 `safetyExit` 선언이 있다. MARKET이 닫히면 앱 편집 화면은 수정 폼 대신 심사 결과와 제한 안내를 보여준다. 후속 기능의 소스 존재와 실제 출시 활성화를 구분한다.

## 새 상품과 판매할 콘텐츠

앱의 새 상품 유형은 `PLAN`, `EVENT_PACKAGE`, `VIRTUAL_ITEM`이다. 판매할 실제 콘텐츠를 선택하고 제목·가격을 입력한 뒤 등록한다. 공개한 플랜은 [플랜 공개와 예약 공개](F08-05_plan-publish_prd.md) 과정에서 상품 READY가 이미 생성될 수 있으므로 같은 유형·콘텐츠를 다시 연결하지 않는다. 서버도 같은 `itemType/resourceId` 연결을 거절한다. 앱이 현재 읽은 내 상품 목록으로 제외한 후보만을 최종 중복 판정으로 삼지 않는다.

| 콘텐츠 | 현재 준비 조건과 연결 |
| --- | --- |
| 플랜 | 본인 소유 PUBLISHED 플랜. 플랜 생성은 플랜 목록으로 이동한다. |
| 이벤트 패키지 | 본인 공개 플랜에 연결한 패키지. 생성 시 모임 개설권 1~100개, 유효 일수 1~365일을 검사하며 버전 발급에서도 소유·공개 상태와 양수 조건을 확인한다. |
| 디지털 파일 | 본인 파일을 MARKET_DIGITAL_GOOD 용도로 업로드하고 파일 자원을 생성한다. 자원 생성·상품 버전 발급에서 소유와 준비 상태를 검사한다. 상품 설명 사진과는 별도 원본이다. |

콘텐츠 준비와 상품 등록은 별도 요청이다. 콘텐츠 준비가 성공하면 선택값과 빈 제목에 반영하지만 아직 상품이 생긴 것은 아니다. 앱의 현재 상품 생성 요청은 `PAID_POINT`, `periodType=NONE`을 사용하며 준비한 `resourceId`, 분류, 제목·설명·가격·설명 사진을 보낸다. 제목은 서버에서 비어 있지 않고 200자 이하여야 하며, 가격은 0 이상의 정수 값이어야 한다. 성공은 `201 MarketItemVo`, 상태는 **READY**이며 생성한 상품의 편집 화면으로 전환한다.

회원 소유자, 상품 유형, 결제 수단은 생성 때 정한다. 수정 요청에 `itemType`·`currencyType` 필드는 없으며 동일 유형 내 콘텐츠 연결 변경은 서버에서 소유·준비 상태·중복을 다시 검사한다.

## 편집과 최신 내용 유지

현재 편집 폼은 연결 콘텐츠·이름·서식 있는 설명/사진·가격·재고·분류를 다룬다. 원래 서버값과 비교하여 **바꾼 필드만** 전송한다. 서버에 존재하는 무료 포인트 가격·할인·기간·대표 이미지 필드를 이 폼에서 모두 편집할 수 있는 것으로 설명하지 않는다.

설명을 모두 지우면 빈 설명을, 가격을 비우거나 0으로 바꾸면 0을 명시적으로 보내 삭제·무료 전환이 서버에 도달하게 한다. 반대로 **기존 재고를 비우면 현재 재고 유지**이며 앱도 지울 수 없다고 안내한다. 이미 지정된 분류를 null로 해제하는 조작도 제공하지 않는다. API의 nullable 필드는 기본적으로 기존값 유지다.

새 서버값이 들어오면 고친 칸과 비교한다. 충돌하는 입력이 있으면 최신 내용으로 다시 채울지 묻고, 고친 내용 유지를 고르면 편집한 칸만 보존하며 나머지는 새 값으로 채운다. 이 동작을 서버 개정 번호에 의한 낙관적 잠금이나 다른 기기 변경의 완전한 병합 보장으로 확대하지 않는다.

설명 사진 작업과 상품 명령은 진행 상태를 공유한다. 상품별 `commandInFlightProvider`로 명령 중복을 막고 화면 재진입에서도 진행 상태를 읽는다. 이탈 가드는 미저장 내용과 진행 중 명령을 확인한다. 성공하면 상세·내 상품 자료를 갱신하고 해당 편집 경로를 `true` 결과로 닫는다. 실패하면 화면과 입력을 유지하며 원인에 맞는 안내 또는 서버 권한 자료 재조회를 수행한다. 서버 반영 가능성이 있는 응답 실패도 목록 갱신 대상으로 처리한다.

## 심사 상태와 승인 버전

| 현재 상태 | 주요 행동과 결과 |
| --- | --- |
| DRAFT·READY | 내용 저장 후 심사 제출 → SUBMITTED |
| REJECTED | 수정값 저장 후 다시 제출 → SUBMITTED |
| SUBMITTED | 심사 중 안내. 주요 상태 전환 버튼은 없지만 메타 저장까지 금지된 상태는 아니다. 심사 대상 값을 바꾸면 후보 버전을 교체한다. |
| APPROVED | 승인된 활성 버전과 판매 가능 조건을 확인한 뒤 판매 시작 → ON_SALE |
| ON_SALE | 판매 중지 → STOP_SELLING |
| STOP_SELLING | 조건 재확인 후 판매 다시 시작 → ON_SALE |
| SUSPENDED | 정책 비공개 안내와 이력 확인. 회원의 직접 판매 재개·심사 재제출 경로가 없다. 메타 수정과 재공개 허용을 혼동하지 않는다. |
| REMOVED | 삭제됨. 서버 메타 수정 불가. |

앱 심사 제출은 `POST /api/v1/market/items/{itemId}/submit`이며 성공은 **204**다. 이전 `/publish`도 남아 있지만 내부 동작은 심사 제출 위임이며 판매 시작 API가 아니다. 변경된 내용이 있거나 반려 후 재제출이면 먼저 PUT 저장 후 제출한다. 저장 실패는 제출을 막고, 저장 성공 뒤 제출 실패는 저장된 내용까지 롤백하지 않는다.

심사 제출에서 상품과 실제 콘텐츠의 후보 계약 버전을 만든다. 운영자 승인 시 그 후보를 활성 버전으로 지정하고 APPROVED로 바꾸며, 승인만으로 ON_SALE이 되지 않는다. 심사 중 계약 필드를 변경하면 새 후보를 만들고 이력에 남겨 옛 후보를 그대로 승인하지 않도록 한다.

운영자 경로는 현재 `community_api/admin-app`의 `/admin/v1/manage/marketplace/items/{itemId}/{approve|reject|suspend}`다. `MANAGE_MARKETPLACE` 권한과 필수 멱등 키를 확인한다. 승인·반려는 SUBMITTED에서만 가능하고, 정책 비공개는 APPROVED·ON_SALE·STOP_SELLING에서 가능하다. 반려·비공개 사유는 필수이며 500자 이하다. 상품 행 잠금으로 상태 전이를 직렬화하고 이력·관리 기록·알림 의도를 남긴다. 실제 알림 수신 확인과는 별개다.

## 재심사 대상과 판매 중단

APPROVED·ON_SALE·STOP_SELLING 상품에서 연결 콘텐츠·제목·설명/서식·설명 사진·가격·무료 포인트 가격·원가·할인·기간·대표 이미지 중 심사 대상 값이 달라지면 새 후보를 만들고 SUBMITTED로 돌아간다. 재고와 분류 변경은 이 심사 변경 플래그에 포함하지 않는다. 현재 수정 DTO에는 과거 문서가 언급한 표시 순서 필드가 없다.

앱은 승인 이후 심사 대상 칸을 고쳐 저장할 때 재심사 동안 판매가 멈춘다는 확인을 먼저 받는다. 재고만 변경하면 이 확인을 요구하지 않는다. 서버가 최종 변경 여부와 상태를 판정하므로 화면의 안내만으로 재심사 여부를 확정하지 않는다.

상품이 판매 상태를 벗어나면 포함된 판매 중 번들도 중단한다. 상품 재판매를 시작한다고 포함 번들을 자동 재판매하는 것은 아니다. 구매자에게 이미 전달된 권리의 처리와 상품 판매 상태는 별도 계약이며 구매·환불 기능에서 다룬다.

## 설명 사진과 파일 용도

상품 설명 사진은 `MARKET_DESCRIPTION_IMAGE`이며 최대 10장이다. 대표 이미지 `MARKET_THUMBNAIL`, 구매자에게 제공할 디지털 원본 `MARKET_DIGITAL_GOOD`와 구분한다. 서버는 사진 키의 중복·빈 값·장수, 파일 용도·소유 또는 기존 연결 권한·업로드 완료·CLEAN 검사 상태·이미지 MIME·삭제 예정 여부를 확인한다.

요청 목록의 순서대로 연결 순서를 저장하고 빠진 사진 연결을 제거한다. 상품 수정과 사진 연결은 같은 요청의 트랜잭션에 속한다. 사진 목록 변경은 재심사 판단에 포함한다. 기기에서 업로드됐다는 사실만으로 상품 설명에 저장됐다고 기록하지 않는다.

## 판매 시작·중지·삭제와 예약

판매 시작/재개는 상태뿐 아니라 소유자·상품 접근 가능 범위·승인된 활성 버전·연결 플랜의 판매 가능 상태를 확인한다. 연결된 플랜을 판매할 수 없으면 APPROVED여도 시작할 수 없다. 앱은 응답의 `actions.startSale`·`actions.delete`를 사용하며 값이 없으면 임의로 허용하지 않는다.

미저장 입력이 있는 상태에서 판매 시작·중지·예약을 선택하면 먼저 고친 내용을 버리고 진행할지 묻는다. 여기서는 변경 메타를 자동 저장하여 재심사를 유발하지 않는다. 취소하면 입력을 유지한다. 심사 제출의 선저장 흐름과 명확히 구분한다.

삭제는 REMOVED로 바꾸는 동작이며 판매 이력이 있는 상품은 `MARKET_ITEM_SOLD_NOT_DELETABLE`로 거절한다. 서버는 상품을 잠근 뒤 현재 커밋된 소장품 행의 존재를 다시 확인하므로 환불되었다는 이유만으로 삭제를 허용하지 않는다. 판매 중지나 삭제 시 포함 번들도 중단한다.

예약은 APPROVED·STOP_SELLING에서 `targetType=MARKET_ITEM`으로 생성한다. 앱 예약 버튼은 상태를 기준으로 표시하며 즉시 판매 버튼의 `actions.startSale`과 완전히 같은 조건은 아니다. 서버 예약 생성도 작성자와 대상 상태를 확인하고, 실행 때 `activateSale`의 최종 조건을 다시 검사한다. 따라서 예약 성공은 판매 시작의 보장이 아니다. MARKET이 봉인된 동안 폴러는 MARKET_ITEM 실행을 건너뛴다. 공통 시각·목록·취소·실패 알림·실행 차수는 [플랜 공개와 예약 공개의 예약 생성과 내 예약 관리](F08-05_plan-publish_prd.md#예약-생성과-내-예약-관리) 및 [예약 실행과 복구](F08-05_plan-publish_prd.md#예약-실행과-복구)를 함께 따른다.

## 회원 상품과 플랫폼 기간권

`ItemType`의 SUBSCRIPTION을 회원의 새 상품 유형으로 제공하지 않는다. 회원 콘텐츠 조회도 기간권에는 빈 목록을 반환한다. 기간권은 플랫폼 상품과 회원 상품의 소유를 구분하여 다루며, 현재 자원 계약은 공개된 PREMIUM 1·3·6개월 조건을 확인한다. MARKET과 별도의 MARKET_PERIOD_PASS 판매 범위가 있다.

개인 구독과 이미 받은 기간의 설명은 [개인 구독](../06_payment/F06-08_personal-subscription_prd.md)을 따른다. 이 회원 관리 기능의 검토만으로 플랫폼 편성·환불·매출 집계·운영 전체가 완료됐다고 기록하지 않는다. 과거 날짜의 추가 개발 목록은 현재 구현의 부재를 증명하는 자료로 재사용하지 않는다.

## 요청과 응답

| 동작 | 공개 API | 응답 |
| --- | --- | --- |
| 내 상품 | `GET /api/v1/market/items/my` | 본인 소유의 `Page<MarketItemVo>`; 생성 시각·ID 내림차순 |
| 생성 | `POST /api/v1/market/items` | 201 MarketItemVo |
| 부분 필드 수정 | `PUT /api/v1/market/items/{itemId}` | MarketItemVo |
| 심사 제출 | `POST /api/v1/market/items/{itemId}/submit` | 204, 본문 없음 |
| 이전 제출 호환 | `POST /api/v1/market/items/{itemId}/publish` | MarketItemVo; 판매 시작 아님 |
| 판매 시작/재개 | `POST /api/v1/market/items/{itemId}/on-sale` | MarketItemVo |
| 판매 중지 | `POST /api/v1/market/items/{itemId}/stop` | MarketItemVo |
| 본인 심사 이력 | `GET /api/v1/market/items/{itemId}/review-history` | 생성 시각 오름차순 `List<MarketItemReviewHistoryVo>` |
| 삭제 | `DELETE /api/v1/market/items/{itemId}` | 204, 본문 없음 |

`MarketItemVo`는 소유 유형·회원 판매자 ID, 콘텐츠·활성/후보 버전, 가격·재고·상태·설명 사진과 행동 권한을 포함한다. 상품·심사 이력 목록의 Page와 List를 혼동하지 않는다. `amount/freePointPrice`의 서버 BigDecimal은 이 API에서 음수와 소수 금액을 거절하며, 유료 상품의 FREE_POINT/ANY_POINT 지정 무료 가격은 1 이상이어야 한다. null을 기본 가격으로 처리하는 분기는 별도다.

## 현재 제한과 확인 범위

| 구분 | 현재 판단 | 문서 처리 |
| --- | --- | --- |
| Gap | 현재 운영자 approve도 SUBMITTED만 받는다. SUSPENDED를 직접 승인해 재공개한다는 이전 설명은 맞지 않는다. | 복구/재심사 정책을 별도로 정해야 하며 구현된 해제 경로로 기록하지 않는다. |
| 제한 | 폼에서 무료 포인트 가격·할인·기간 등 모든 서버 필드를 편집하지 않으며 기존 재고·분류를 비워 해제할 수도 없다. | 서버 계약과 현재 앱 조작 범위를 구분한다. |
| Risk | 콘텐츠 준비·상품 등록·수정 후 심사 제출·예약 실행은 여러 요청이다. 실패 응답만으로 서버 미반영을 보장하지 않는다. | 이미 저장된 값과 최신 상태를 확인하고 재시도한다. |
| Risk | 새 서버값과 입력을 비교하는 앱 동작은 존재하지만 서버 수정 요청에는 개정 번호 조건이 없다. | 다른 기기와의 동시 수정 완전 보호나 무조건 최종 쓰기 성공을 약속하지 않는다. |
| 미검증 | 파일 업로드·운영자 조작·예약 실행·실제 판매/환불·기기 화면은 이번에 실행하지 않았다. | 소스와 선택한 기존 단언을 읽은 기록만 남긴다. |

## 수용 기준과 검증 근거

- **AC-01 입구와 범위:** 내 상품 카드의 편집·판매 관리와 후기 수정 입구를 구분하고, MARKET 봉인 시 결과 확인과 수정 가능 여부를 구분한다.
- **AC-02 콘텐츠 연결:** 본인 준비된 실제 콘텐츠를 연결하고 같은 유형·자원 중복을 서버에서 검사한다. 콘텐츠 준비와 상품 등록을 별도 결과로 처리한다.
- **AC-03 생성 결과:** 앱의 지원 유형·PAID_POINT/NONE 요청, 서버 제목·정수 금액 검증, READY 생성과 편집 화면 전환을 확인한다.
- **AC-04 변경 필드:** 바꾼 필드만 전송하고 빈 설명/가격은 명시적으로 지우되, 빈 재고와 분류는 기존값을 유지한다.
- **AC-05 새 서버값:** 편집한 칸의 충돌을 묻고 유지 또는 다시 채우기를 선택한다. 서버 개정 번호 잠금과 동일시하지 않는다.
- **AC-06 심사 제출:** 실제 `/submit` 204 응답을 사용하며 필요한 선저장 실패는 제출을 막고 후속 제출 실패는 선저장을 롤백하지 않는다.
- **AC-07 후보와 승인:** 후보 버전 심사·승인된 활성 버전·별도 판매 시작을 구분하고 심사 중 변경은 후보를 교체한다.
- **AC-08 재심사:** 승인 이후 계약 필드 변경 시 재심사를 안내하고 SUBMITTED로 전환한다. 재고·분류만 변경하는 경우와 구분한다.
- **AC-09 설명 사진:** 최대 10장과 파일 용도·상태·연결 권한을 검증하고 사진 순서·제거를 상품 변경과 함께 반영한다.
- **AC-10 판매 명령:** 서버 행동 권한·승인 버전·플랜 상태를 확인하며 미저장 입력을 버릴지 확인한 뒤 판매 상태를 바꾼다.
- **AC-11 삭제와 번들:** 판매 이력이 있으면 삭제를 거절하고 판매 중지·삭제·정책 비공개·재심사 시 포함 번들의 판매 중단을 구분한다.
- **AC-12 예약 판매:** 생성 성공과 실제 실행을 구분하고 실행 때 현재 조건을 검사한다. 봉인된 MARKET_ITEM 실행은 건너뛴다.
- **AC-13 운영자 경계:** admin-app의 권한·멱등 키·허용 상태를 확인하고 SUSPENDED 해제 기능을 추정하지 않는다.
- **AC-14 실패와 복귀:** 상품별 명령 중복 방지, 실패 입력 보존·결과 불명 갱신, 성공 후 해당 경로 닫기와 목록 갱신을 구분한다.
- **AC-15 플랫폼 기간권:** 회원 상품 생성과 플랫폼 기간권·별도 판매 범위를 분리한다.

이번에는 공개/관리자 Controller, 상품·심사·콘텐츠·사진·권한 서비스, 앱의 목록/생성/수정·명령·상태·API·Repository를 대조했다. 기존 `market_item_edit_screen_test.dart`에서 재고만 저장 시 재심사 안내 없음, 수정 후 제출 순서, 빈 설명·가격 전송, 재고 삭제 불가 안내 단언을 읽었다. 해당 제품 시험은 새로 실행하지 않았다.

## 코드 위치

- 공개 서버: `MarketItemController`, `MarketItemModerationController`, `MarketItemService`, `MarketItemModerationService`, `MarketProductVersionService`, `ProductResourceService`, 유형별 `ProductResourceAdapter`, `MarketAbilityPolicy`, `ContentPhotoService`.
- 운영자 서버: `community_api/admin-app`의 `ManageMarketItemModerationController`, `ManageMarketItemModerationService`.
- 앱: `app_menu.dart`, `plan_market_routes.dart`, `creator_market_items_screen.dart`, `market_item_create_screen.dart`, `market_item_edit_screen.dart`, `market_item_moderation_status.dart`, `market_item_provider.dart`, `creator_catalog_provider.dart`, `market_api.dart`, `market_repository.dart`.

<!-- source-references:start -->
서버 창구: `MarketItemController#createItem`, `MarketItemController#updateItem`, `MarketItemController#publishItem`, `MarketItemController#stopSelling`, `MarketItemController#removeItem`, `MarketItemController#getMyItems`, `MarketItemController#activateSale`, `MarketItemController#getReviewHistory`, `MarketItemModerationController#submitForReview`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->
