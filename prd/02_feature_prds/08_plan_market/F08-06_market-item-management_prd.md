# F08-06. 마켓 아이템 관리 (등록/수정/판매중지/심사/예약) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

크리에이터가 자신의 상품(MarketItem)을 별도 도메인 객체로 관리한다. AUTH-05(운영자 심사 moderation, Option B)로 ItemStatus가 9개 상태로 확장되었다: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `SUSPENDED`, `READY`, `ON_SALE`, `STOP_SELLING`, `REMOVED`. 기존의 "publish = ON_SALE 직진" 흐름은 deprecated되어 **크리에이터는 심사를 거쳐야 판매할 수 있다** (DRAFT/READY/REJECTED → SUBMITTED → APPROVED → ON_SALE). 운영자 심사 엔드포인트는 `community_admin_api`에 위치하며(`/admin/v1/manage/marketplace/items/{itemId}/{approve|reject|suspend}`), 상태 전이 경합(크리에이터 activate vs 운영자 suspend)은 비관적 행 락(`findForUpdateByItemId`)으로 직렬화된다.

AUTH-06(예약 판매시작)으로 크리에이터는 APPROVED/STOP_SELLING 상태의 아이템에 대해 미래 시각 자동 ON_SALE 전환을 예약할 수 있다. 예약 API 코어(`/api/v1/authoring/schedules`, targetType=`MARKET_ITEM`)는 플랜/클럽 글 예약과 공유된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 크리에이터 본인의 마켓 아이템 상세(F08-10)에서 "수정" 액션 ▶ `/market/items/:itemId/edit`
- 크리에이터 통계 화면 또는 내 아이템 목록(별도 진입점, 현재 화면에서는 직접 라우팅 가능)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MarketItemController`, `ScheduledPublishController`, `ManageMarketItemModerationController`, `ItemStatus`, `MarketItem`, `MarketItemService`, `MarketItemModerationService`, `UserService`. 앱: `market_item_edit_screen.dart`, `market_item_detail_screen.dart`, `market_item_moderation_status.dart`, `market_review_history_timeline.dart`.

<!-- source-references:start -->
서버 창구: `MarketItemController#createItem`, `MarketItemController#updateItem`, `MarketItemController#publishItem`, `MarketItemController#stopSelling`, `MarketItemController#removeItem`, `MarketItemController#getMyItems`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 진입 시: `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{id}`
2. 저장: `itemManagementNotifierProvider.updateItem(itemId, MarketItemModParam)` ▶ `PUT /api/v1/market/items/{id}`
3. 심사 제출(AUTH-05): `notifier.submitForReview(itemId)` ▶ `POST /api/v1/market/items/{id}/publish` (`@Deprecated` — 내부적으로 `MarketItemModerationService.submitForReview` 위임: DRAFT/READY/REJECTED → SUBMITTED)
4. 판매 시작/재개(AUTH-05): `notifier.activateSale(itemId)` ▶ `POST /api/v1/market/items/{id}/on-sale` (APPROVED/STOP_SELLING → ON_SALE)
5. 판매 중지: `notifier.stopSelling(itemId)` ▶ `POST /api/v1/market/items/{id}/stop` (ON_SALE → STOP_SELLING)
6. 삭제: `notifier.removeItem(itemId)` ▶ `DELETE /api/v1/market/items/{id}`
7. 심사 이력 조회(AUTH-05): `marketItemReviewHistoryNotifierProvider(itemId)` ▶ `GET /api/v1/market/items/{id}/review-history`
8. 예약 판매시작(AUTH-06): `SchedulePublishSheet.show(targetType:'MARKET_ITEM', targetId:itemId)` ▶ `POST /api/v1/authoring/schedules` (APPROVED/STOP_SELLING 상태에서만 허용)
9. 모든 변경 후 `ref.invalidate(marketItemDetailNotifierProvider(itemId))` + 호출자에게 `pop(true)` 전달

## 4. 제품 규칙

- 아이템 종류는 PLAN, EVENT_PACKAGE, VIRTUAL_ITEM, SUBSCRIPTION 이고 만든 뒤 바꿀 수 없다.
- 승인 뒤(APPROVED, ON_SALE, STOP_SELLING) 제목, 설명, 본문, 가격, 무료 가격, 할인, 기간, 썸네일을 바꾸면 SUBMITTED 로 돌아가 재심사를 받는다. 심사를 통과한 뒤 내용을 바꿔 파는 일을 막기 위해서다. 재고와 표시 순서만 바꾸면 재심사하지 않는다.
- 판매된 적 있는 아이템(환불, 번들 구매 포함)은 삭제할 수 없고 판매 중지만 된다(MARKET_ITEM_SOLD_NOT_DELETABLE). 산 사람이 계속 상세를 볼 수 있게 하기 위해서다.
- 재고를 비우면 무제한이고 표시 순서 기본값은 0 이다. 제목 200자, 설명 2,000자까지다.
- 심사 제출에는 제목이 필요하다. 판매 시작, 재개, 중지는 입력값과 상관없이 된다. 반려된 아이템은 저장한 뒤 다시 제출한다.
- 화면 상태 표기: ON_SALE 판매 중, APPROVED 승인됨, SUBMITTED 심사 중, REJECTED 반려됨, SUSPENDED 정책 비공개, STOP_SELLING 판매 중지, DRAFT·READY 작성 중, REMOVED 삭제됨. SUBMITTED 와 SUSPENDED 에서는 작성자가 할 일이 없다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 새 마켓 아이템 등록 (Happy Path) | 플랜이 PUBLISHED, 마켓 아이템 없음 | status=READY 아이템 생성 |
| S2 | READY → 심사 제출 (AUTH-05) | status=READY 또는 DRAFT 아이템 | status=SUBMITTED, 운영자 심사 큐 진입 |
| S3 | 심사 반려 후 재제출 (AUTH-05) | status=REJECTED, 반려 사유 확인됨 | 수정 저장 후 재제출 → status=SUBMITTED |
| S4 | APPROVED → ON_SALE 판매 시작 (AUTH-05) | 운영자 승인으로 status=APPROVED | 크리에이터 "판매 시작" → status=ON_SALE, 마켓 노출 |
| S5 | ON_SALE → STOP_SELLING (판매 중지) | status=ON_SALE | 마켓에서 비노출. 재개 시 /on-sale로 ON_SALE 복구 |
| S6 | STOP_SELLING → ON_SALE 예약 재개 (AUTH-06) | status=STOP_SELLING | ScheduledPublishAction 생성, 예약 시각 도달 시 ON_SALE |
| S7 | 메타 수정 (가격/설명/재고) | 임의 비-REMOVED 상태 | 가격/설명 갱신. 마켓 노출 정보 변경 |
| S8 | 비소유자 수정/상태전이 시도 | 다른 사용자 | 차단 (UNAUTHORIZED) |
| S9 | REMOVED 아이템 수정 시도 | status=REMOVED | 차단 (INVALID_REQUEST). 편집 화면은 삭제됨 처리해야 함 |
| S10 | 아이템 삭제 (Soft Remove) | 임의 소유 아이템 | 마켓 비노출. 같은 itemId 재진입 시도하면 REMOVED 상태로 응답 |
| S11 | 비공개 아이템 크리에이터 재판매 시도 (AUTH-05) | status=SUSPENDED | 화면에서 "정책 비공개" 배너 노출, 1차 액션 없음. 서버도 activateSale 차단 |
| S12 | 동시 activate vs suspend 경합 (AUTH-05) | 크리에이터 ON_SALE 시도 + 운영자 SUSPEND 동시 요청 | 비관적 락으로 직렬화 — 한 쪽만 성공 |
| S13 | 무료 상품 등록 | currencyType=ANY_POINT, amount=0 | 무료 아이템 등록 성공 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|

## 9. 수용 기준

- **AC-01. 새 마켓 아이템 등록 (Happy Path)**: Given 마켓 아이템 없음 When 크리에이터가 생성 요청 Then status=READY 아이템 생성
- **AC-02. 심사 제출 (AUTH-05)**: Given status=READY/DRAFT 아이템 When 크리에이터가 "심사 제출" Then status=SUBMITTED, 심사 이력 `SUBMIT` 항목 추가
- **AC-03. 운영자 심사 승인 (AUTH-05)**: Given status=SUBMITTED When 운영자가 approve Then status=APPROVED, 크리에이터에게 알림 발송
- **AC-04. 운영자 심사 반려 (AUTH-05)**: Given status=SUBMITTED When 운영자가 reject(reason 필수) Then status=REJECTED, 크리에이터에게 반려 사유 알림 발송
- **AC-05. 반려 후 재제출 (AUTH-05)**: Given status=REJECTED When 크리에이터가 수정 저장 후 재제출 Then status=SUBMITTED (수정+심사 원자적 순서: updateItem → submitForReview)
- **AC-06. APPROVED → ON_SALE 판매 시작 (AUTH-05)**: Given status=APPROVED When 크리에이터가 "판매 시작" Then status=ON_SALE, 마켓 노출
- **AC-07. ON_SALE → STOP_SELLING 판매 중지**: Given status=ON_SALE When 크리에이터가 "판매 중지" Then status=STOP_SELLING, 마켓 비노출
- **AC-08. STOP_SELLING → ON_SALE 판매 재개 (AUTH-05)**: Given status=STOP_SELLING When 크리에이터가 "판매 재개" Then status=ON_SALE
- **AC-09. 운영자 비공개 (AUTH-05)**: Given status=APPROVED/ON_SALE/STOP_SELLING When 운영자가 suspend(reason 필수) Then status=SUSPENDED, 크리에이터 화면에서 정책 비공개 배너 노출
- **AC-10. 예약 판매시작 등록 (AUTH-06)**: Given status=APPROVED/STOP_SELLING When 크리에이터가 예약 시각 설정 Then ScheduledPublishAction 생성(targetType=MARKET_ITEM, status=SCHEDULED)
- **AC-11. 예약 취소 (AUTH-06)**: Given 예약 status=SCHEDULED When 크리에이터가 취소 Then status=CANCELLED
- **AC-12. 메타 수정**: Given 임의 비-REMOVED 상태 When 크리에이터가 수정 저장 Then 가격/설명 갱신
- **AC-13. 비소유자 수정/상태전이 시도**: Given 타인 아이템 When 수정/상태전이 요청 Then 403 UNAUTHORIZED
- **AC-14. REMOVED 아이템 수정 시도**: Given status=REMOVED When 수정 요청 Then 400 INVALID_REQUEST
- **AC-15. 동시 경합 직렬화 (AUTH-05)**: Given 크리에이터 activateSale + 운영자 suspend 동시 요청 When 비관적 락 적용 Then 한 쪽만 성공, last-write-wins 없음
- **AC-16. 무료 상품 등록**: Given currencyType=ANY_POINT, amount=0 When 생성 요청 Then 무료 아이템 등록 성공

## 10. 미결정 / 후속

- **예약 실행 구현됨(AUTH-06)**: MARKET_ITEM 예약 등록/취소(`ScheduledPublishService.validateTargetSchedulable`)뿐 아니라 실제 발행 실행까지 구현됨 — `ScheduledPublishScheduler`가 예약 시각 도달 시 `case MARKET_ITEM -> processMarketItem`(상태 재검증 후 `marketItemService.activateSale`)로 판매시작을 실행한다(`ScheduledPublishScheduler.java:376`, 폴러 대상집합 `:92`, 고착 복구 `:201`). AC-10/AC-11 충족.
- **freePointPrice 편집 UI**: `currencyType`은 생성 시점에만 결정, 수정 단계에서 `freePointPrice`만 수정 가능(`MarketItemModParam`에 포함). 현재 편집 폼은 `freePointPrice`를 노출하지 않으므로, 차등가 입력 UI를 추가할지는 화면 결정 사항. 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.
- **SUSPENDED 재공개 경로**: 현재 서버/앱 모두 SUSPENDED → 크리에이터 직접 재공개 경로가 없음. 운영자가 approve 또는 별도 unsuspend를 해야 한다. 이 정책이 확정되면 AC-09에 반영.
- QA는 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
