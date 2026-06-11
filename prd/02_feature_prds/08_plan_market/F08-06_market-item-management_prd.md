# F08-06. 마켓 아이템 관리 (등록/수정/판매중지/심사/예약) PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-10; unit: business_logic/units/08_plan_market/F08-06_market-item-management -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-06_market-item-management`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

크리에이터가 자신의 상품(MarketItem)을 별도 도메인 객체로 관리한다. AUTH-05(운영자 심사 moderation, Option B)로 ItemStatus가 9개 상태로 확장되었다: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `SUSPENDED`, `READY`, `ON_SALE`, `STOP_SELLING`, `REMOVED`. 기존의 "publish = ON_SALE 직진" 흐름은 deprecated되어 **크리에이터는 심사를 거쳐야 판매할 수 있다** (DRAFT/READY/REJECTED → SUBMITTED → APPROVED → ON_SALE). 운영자 심사 엔드포인트는 `community_admin_api`에 위치하며(`/admin/v1/manage/marketplace/items/{itemId}/{approve|reject|suspend}`), 상태 전이 경합(크리에이터 activate vs 운영자 suspend)은 비관적 행 락(`findForUpdateByItemId`)으로 직렬화된다.

AUTH-06(예약 판매시작)으로 크리에이터는 APPROVED/STOP_SELLING 상태의 아이템에 대해 미래 시각 자동 ON_SALE 전환을 예약할 수 있다. 예약 API 코어(`/api/v1/authoring/schedules`, targetType=`MARKET_ITEM`)는 플랜/클럽 글 예약과 공유된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 크리에이터 본인의 마켓 아이템 상세(F08-10)에서 "수정" 액션 ▶ `/market/items/:itemId/edit`
- 크리에이터 통계 화면 또는 내 아이템 목록(별도 진입점, 현재 화면에서는 직접 라우팅 가능)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-06_market-item-management/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-06_market-item-management/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-06_market-item-management/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-06_market-item-management/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:30` | 확인됨 (GET 목록) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:36` | 확인됨 (GET 상세) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:44` | 확인됨 (GET 내 아이템) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:51` | 확인됨 (POST 생성) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:59` | 확인됨 (PUT 수정) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:67` | 확인됨 (POST publish — @Deprecated) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:74` | 확인됨 (POST /on-sale, AUTH-05 신규) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:81` | 확인됨 (POST /stop) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:88` | 확인됨 (GET /review-history, AUTH-05 신규) |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:95` | 확인됨 (DELETE) |
| `community_api/src/main/java/com/endside/community/plan/constants/ItemStatus.java:1` | 확인됨 (9개 enum 상태) |
| `community_api/src/main/java/com/endside/community/plan/service/MarketItemService.java:296` | 확인됨 (retrieveItemForUpdate 비관적 락) |
| `community_api/src/main/java/com/endside/community/plan/service/MarketItemModerationService.java:1` | 확인됨 (AUTH-05 심사 서비스) |
| `community_admin_api/src/main/java/com/endside/community/plan/controller/ManageMarketItemModerationController.java:1` | 확인됨 (운영자 approve/reject/suspend) |
| `community_api/src/main/java/com/endside/community/authoring/controller/ScheduledPublishController.java:1` | 확인됨 (AUTH-06 예약 발행) |
| `community_api/src/main/java/com/endside/community/authoring/constants/ScheduledPublishTargetType.java:1` | 확인됨 (MARKET_ITEM 포함) |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 진입 시: `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{id}`
2. 저장: `itemManagementNotifierProvider.updateItem(itemId, MarketItemModParam)` ▶ `PUT /api/v1/market/items/{id}`
3. 심사 제출(AUTH-05): `notifier.submitForReview(itemId)` ▶ `POST /api/v1/market/items/{id}/publish` (`@Deprecated` — 내부적으로 `MarketItemModerationService.submitForReview` 위임: DRAFT/READY/REJECTED → SUBMITTED)
4. 판매 시작/재개(AUTH-05): `notifier.activateSale(itemId)` ▶ `POST /api/v1/market/items/{id}/on-sale` (APPROVED/STOP_SELLING → ON_SALE)
5. 판매 중지: `notifier.stopSelling(itemId)` ▶ `POST /api/v1/market/items/{id}/stop` (ON_SALE → STOP_SELLING)
6. 삭제: `notifier.removeItem(itemId)` ▶ `DELETE /api/v1/market/items/{id}`
7. 심사 이력 조회(AUTH-05): `marketItemReviewHistoryNotifierProvider(itemId)` ▶ `GET /api/v1/market/items/{id}/review-history`
8. 예약 판매시작(AUTH-06): `SchedulePublishSheet.show(targetType:'MARKET_ITEM', targetId:itemId)` ▶ `POST /api/v1/authoring/schedules` (APPROVED/STOP_SELLING 상태에서만 허용)
9. 모든 변경 후 `ref.invalidate(marketItemDetailNotifierProvider(itemId))` + 호출자에게 `pop(true)` 전달

## 4. 서버 계약

### 개요

크리에이터가 자신의 상품(MarketItem)을 별도 도메인 객체로 관리한다. PlanStatus와 별개로 ItemStatus(READY/ON_SALE/STOP_SELLING/REMOVED)로 라이프사이클을 가진다. ItemType(PLAN, EVENT_PACKAGE, VIRTUAL_ITEM, SUBSCRIPTION)에 따라 다양한 상품을 다룰 수 있다.

### 엔드포인트 요약 (community_api)

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/market/items | `MarketItemController#getMarketItems` | optional | 마켓 아이템 목록 (ON_SALE 필터링은 searchParam) |
| GET | /api/v1/market/items/{itemId} | `MarketItemController#getMarketItem` | optional | 아이템 상세 (비소유자 인증 조회 시 viewCount 증가) |
| GET | /api/v1/market/items/my | `MarketItemController#getMyItems` | required | 내 아이템 페이지 |
| POST | /api/v1/market/items | `MarketItemController#createItem` | required | 새 마켓 아이템 (status=READY) |
| PUT | /api/v1/market/items/{itemId} | `MarketItemController#updateItem` | required | 아이템 메타 수정 |
| POST | /api/v1/market/items/{itemId}/publish | `MarketItemController#publishItem` | required | **@Deprecated** — 내부적으로 submitForReview 위임: DRAFT/READY/REJECTED → SUBMITTED |
| POST | /api/v1/market/items/{itemId}/on-sale | `MarketItemController#activateSale` | required | **AUTH-05 신규** — APPROVED/STOP_SELLING → ON_SALE (비관적 락) |
| POST | /api/v1/market/items/{itemId}/stop | `MarketItemController#stopSelling` | required | ON_SALE → STOP_SELLING (비관적 락) |
| GET | /api/v1/market/items/{itemId}/review-history | `MarketItemController#getReviewHistory` | required | **AUTH-05 신규** — 심사 이력 목록 (creatAt ASC, operatorId 미노출) |
| DELETE | /api/v1/market/items/{itemId} | `MarketItemController#removeItem` | required | status=REMOVED soft remove (비관적 락) |
| POST | /api/v1/authoring/schedules | `ScheduledPublishController#schedule` | required | **AUTH-06 신규** — 예약 발행 (targetType=MARKET_ITEM, actionType=PUBLISH) |
| GET | /api/v1/authoring/schedules | `ScheduledPublishController#list` | required | **AUTH-06 신규** — 내 예약 목록 |
| DELETE | /api/v1/authoring/schedules/{scheduleId} | `ScheduledPublishController#cancel` | required | **AUTH-06 신규** — 예약 취소 (SCHEDULED 상태에서만) |

### 엔드포인트 요약 (community_admin_api — 운영자 심사, AUTH-05)

| Method | Path | Controller#Method | 권한 | 핵심 동작 |
|---|---|---|---|---|
| POST | /admin/v1/manage/marketplace/items/{itemId}/approve | `ManageMarketItemModerationController#approveItem` | MANAGE_MARKETPLACE | SUBMITTED → APPROVED, 크리에이터 알림 발송 |
| POST | /admin/v1/manage/marketplace/items/{itemId}/reject | `ManageMarketItemModerationController#rejectItem` | MANAGE_MARKETPLACE | SUBMITTED → REJECTED, reason 필수, 크리에이터 알림 발송 |
| POST | /admin/v1/manage/marketplace/items/{itemId}/suspend | `ManageMarketItemModerationController#suspendItem` | MANAGE_MARKETPLACE | APPROVED/ON_SALE/STOP_SELLING → SUSPENDED, reason 필수, 크리에이터 알림 발송 |

### 도메인 모델 / Enum (이 기능 관련)

- **ItemType**: `PLAN`, `EVENT_PACKAGE`, `VIRTUAL_ITEM`, `SUBSCRIPTION`
- **CurrencyType**: `PAID_POINT(0)`, `FREE_POINT(1)`, `ANY_POINT(2)`
- **ItemStatus** (AUTH-05로 9개로 확장): `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `SUSPENDED`, `READY`, `ON_SALE`, `STOP_SELLING`, `REMOVED` — `community_api/.../plan/constants/ItemStatus.java:1` 실측
- **PeriodType**: `NONE`, `DAY`, `MONTH`, `YEAR`, `EXPIRATION`
- **MarketReviewAction**: `SUBMIT`, `APPROVE`, `REJECT`, `SUSPEND` (심사 이력 기록용)
- **MarketReviewActorType**: `USER`, `PLATFORM_ADMIN`
- **MarketItem 핵심 필드** (`model/MarketItem.java`):
  - `itemId: Long`, `creatorId: Long`, `title (200)`, `description (TEXT)`
  - `itemType: ItemType (NOT NULL)`, `currencyType: CurrencyType (NOT NULL)`
  - `amount: BigDecimal(12,2) NOT NULL`, `originalPrice: Long?`, `discountRate: Integer?`
  - `stockQuantity: Integer?` (null이면 무제한)
  - `periodType: PeriodType (NOT NULL, default NONE)`, `periodValue: Integer?`
  - `status: ItemStatus (NOT NULL, default READY)`
  - `thumbnailUrl (500)`, `displayOrder: Integer? (default 0)`
  - `purchaseCount: int NOT NULL` (default 0)
  - `createdAt/updatedAt: LocalDateTime`
- **무료 포인트 관련 Param 필드**:
  - 생성 (`MarketItemAddParam`, `POST /api/v1/market/items`): `currencyType`(String — PAID_POINT/FREE_POINT/ANY_POINT)와 `freePointPrice`(BigDecimal, nullable)를 함께 받는다. 즉 사용 가능 통화 종류(`currencyType`)는 **생성 시점에만 결정**된다.
  - 수정 (`MarketItemModParam`, `PUT /api/v1/market/items/{itemId}`): `freePointPrice`(BigDecimal, nullable)만 수정 가능하다. `currencyType`은 `MarketItemModParam`에 **없으므로 수정 불가**(아래 "수정 가능 필드" 항목과 일치).
  - 유료/무료 분리정산(Point Split Flow-Through): 무료 포인트 결제분은 수취자에게 무료로 전파되어 현금화되지 않는다. 상세 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

### 상태 전이 다이어그램 (AUTH-05 이후 전체 플로우)

```
생성  ─→  READY/DRAFT
           │
           ▼ 심사 제출 (POST /publish 또는 submitForReview)
         SUBMITTED
           │
     ┌─────┴───────┐
     ▼             ▼
  APPROVED      REJECTED ─→ (수정 후 재제출 가능)
     │
     ▼ 판매 시작 (POST /on-sale)
   ON_SALE ◄────────────────────┐
     │                          │
     ▼ 판매 중지 (POST /stop)   │  판매 재개 (POST /on-sale)
  STOP_SELLING ─────────────────┘
     │
     ▼ 삭제 (DELETE)
   REMOVED

APPROVED/ON_SALE/STOP_SELLING ─→ SUSPENDED (운영자 비공개)
```

비관적 행 락(`findForUpdateByItemId`): `activateSale`, `stopSelling`, `removeItem`, `submitForReview`, `approveItem`, `rejectItem`, `suspendItem` 모두 적용. 크리에이터 activate vs 운영자 suspend 경합을 직렬화한다. (`community_api/.../plan/service/MarketItemService.java:296`, `MarketItemModerationService.java:187`)

### 의존 단위 / 외부 시스템

- **Account (Unit 01)**: `UserService.getUserBasicInfoMap` — 닉네임 enrich
- **Notification**: 심사 승인/반려/비공개 시 크리에이터에게 `NotificationType.PROMOTION` 알림 발송 (`MarketItemModerationService.java:72`)
- **F08-10 (마켓 아이템 상세)**: 상세 화면이 본 데이터를 조회 + 리뷰/번들과 결합
- **F08-11 (구매)**: 구매 시 `purchaseCount` 증가 (다른 단위/agent)
- **F08-08, F08-09 (마켓 탐색/검색)**: 본 아이템들이 마켓 노출 대상
- **community_admin_api**: 운영자 심사(approve/reject/suspend) 엔드포인트 위치
- 외부 시스템 호출 없음

## 5. 프론트 계약

### 진입 경로

- 크리에이터 본인의 마켓 아이템 상세(F08-10)에서 "수정" 액션 ▶ `/market/items/:itemId/edit`
- 크리에이터 통계 화면 또는 내 아이템 목록(별도 진입점, 현재 화면에서는 직접 라우팅 가능)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/market/items/:itemId/edit` | `market/screens/market_item_edit_screen.dart` | 수정/발행/판매중지/삭제 |
| `/market/items/:itemId` | `market/screens/market_item_detail_screen.dart` | 상세 (F08-10 / 다른 agent) |

### 화면별 구성 요소 & 액션

### 마켓 아이템 수정 (`market_item_edit_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '아이템 수정')`
  - 상단 `_ItemStatusBadge` — 서버 9개 상태 전부 매핑 (`market_item_moderation_status.dart`): ON_SALE→"판매 중"(primary500), APPROVED→"승인됨"(primary50), SUBMITTED→"심사 중"(linkBlue), REJECTED→"반려됨"(error), SUSPENDED→"정책 비공개"(warning500), STOP_SELLING→"판매 중지"(error), DRAFT/READY→"작성 중"(gray100), REMOVED→"삭제됨"(gray100)
  - **반려 사유 배너** (`_RejectionReasonBanner`): `REJECTED` 상태에서만 노출 — 심사 이력에서 최근 REJECT 사유 표시 (`market_item_edit_screen.dart:315`)
  - ItemType 칩 (`gray100` 배경): "플랜" 또는 "이벤트 패키지" (`PLAN` / `EVENT_PACKAGE`)
  - 폼 (모두 `AppTextInput`/`AppTextArea`):
    - 아이템 이름 (200자, showCharCount)
    - 설명 (2000자, showCharCount, 3~6 lines)
    - 가격 (P 단위, 정수만 keyboardType.number)
    - 안내 "0으로 설정하면 무료로 등록됩니다"
    - 재고 수량 / 표시 순서 (가로 2열)
  - **심사 이력 섹션** (`_ReviewHistorySection`): 타임라인(`market_review_history_timeline.dart`) — action/actorType/reason/createdAt 렌더링 (`market_item_edit_screen.dart:448`)
  - "아이템 관리" 섹션 (`_buildActionButtons`, `market_item_moderation_status.dart`로 상태 주도):
    - SUBMITTED → 심사 중 안내 배너 (액션 없음)
    - SUSPENDED → 정책 비공개 안내 배너 (액션 없음)
    - DRAFT/READY → "심사 제출" `ButtonVariant.primary`
    - REJECTED → "심사 제출" (재제출, 저장 후 제출) `ButtonVariant.primary`
    - APPROVED → "판매 시작" `ButtonVariant.primary`
    - STOP_SELLING → "판매 재개" `ButtonVariant.primary`
    - ON_SALE → "판매 중지" `ButtonVariant.outline`
    - APPROVED/STOP_SELLING → **"예약 판매시작"/"예약 판매재개"** `ButtonVariant.outline` (AUTH-06) (`market_item_edit_screen.dart:550`)
    - 항상 "아이템 삭제" `ButtonVariant.danger`
  - 하단 SafeArea + "저장" `ButtonVariant.primary, lg, fullWidth`
- **사용자가 할 수 있는 액션**:
  - 폼 입력 → 컨트롤러
  - "저장" → `_save()`: title 검증 → `MarketItemModParam(title, description, amount, stockQuantity, displayOrder)` → `PUT /api/v1/market/items/{id}` → 토스트/invalidate/pop
  - "심사 제출" → `AppDialog.confirm` → `notifier.submitForReview(itemId)` ▶ `POST /api/v1/market/items/{id}/publish` (내부적으로 submitForReview 위임). 재제출(REJECTED 상태)은 updateItem 먼저 호출 후 submitForReview
  - "판매 시작/재개" → `AppDialog.confirm` → `notifier.activateSale(itemId)` ▶ `POST /api/v1/market/items/{id}/on-sale`
  - "판매 중지" → `AppDialog.confirm` → `notifier.stopSelling(itemId)` ▶ `POST /api/v1/market/items/{id}/stop`
  - "예약 판매시작/재개"(AUTH-06) → `SchedulePublishSheet.show(targetType:'MARKET_ITEM', targetId:itemId)` → `POST /api/v1/authoring/schedules` (`market_item_edit_screen.dart:574`)
  - "아이템 삭제" → `AppDialog.confirm` → `notifier.removeItem(itemId)` ▶ `DELETE /api/v1/market/items/{id}`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError`
  - 제출 중: `_isSubmitting=true`로 모든 버튼 disable, "저장"은 loading 상태
- **모달/시트/네비게이션**:
  - 모든 위험 액션: `AppDialog.confirm` 사용 (raw AlertDialog 아님)
  - 예약: `SchedulePublishSheet` (바텀시트)
  - 성공 시 `context.pop(true)` (호출자에게 갱신 신호)

### API 호출 순서 (Provider/Repository 관점)

1. 진입 시: `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{id}`
2. 심사 이력: `marketItemReviewHistoryNotifierProvider(itemId)` ▶ `GET /api/v1/market/items/{id}/review-history`
3. 저장: `itemManagementNotifierProvider.updateItem(itemId, MarketItemModParam)` ▶ `PUT /api/v1/market/items/{id}`
4. 심사 제출: `notifier.submitForReview(itemId)` ▶ `POST /api/v1/market/items/{id}/publish`
5. 판매 시작/재개: `notifier.activateSale(itemId)` ▶ `POST /api/v1/market/items/{id}/on-sale`
6. 판매 중지: `notifier.stopSelling(itemId)` ▶ `POST /api/v1/market/items/{id}/stop`
7. 삭제: `notifier.removeItem(itemId)` ▶ `DELETE /api/v1/market/items/{id}`
8. 예약 판매시작: `SchedulePublishSheet` ▶ `POST /api/v1/authoring/schedules`
9. 모든 변경 후 `ref.invalidate(marketItemDetailNotifierProvider(itemId))` + 심사 관련은 `ref.invalidate(marketItemReviewHistoryNotifierProvider(itemId))` 추가 + 호출자에게 `pop(true)` 전달

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **상태 분기 로직**: `MarketItemModerationStatus.fromStatus(status)` (`market_item_moderation_status.dart:72`) — 서버 문자열 → Flutter 액션 enum(`submit`/`activateSale`/`stop`) 매핑. 9개 서버 상태 전부 처리됨
- **status 라벨 / 색 매핑** (`_ItemStatusBadge`, `market_item_edit_screen.dart:612`):
  - `ON_SALE` → "판매 중" (primary500 10% 배경, primary500 텍스트)
  - `APPROVED` → "승인됨" (primary50, primary500)
  - `SUBMITTED` → "심사 중" (linkBlue 10%, linkBlue)
  - `REJECTED` → "반려됨" (error50, error500)
  - `SUSPENDED` → "정책 비공개" (warning50, warning500)
  - `STOP_SELLING` → "판매 중지" (error50, error500)
  - `DRAFT`/`READY` → "작성 중" (gray100, textSecondary)
  - `REMOVED` → "삭제됨" (gray100, textTertiary)
- **ItemType 라벨** (`_itemTypeLabel`):
  - `PLAN` → "플랜"
  - `EVENT_PACKAGE` → "이벤트 패키지"
  - 그 외 → 원문
- **버튼 분기** — `MarketItemModerationStatus` 객체가 결정:
  - SUBMITTED → 심사 안내 배너만 (액션 없음)
  - SUSPENDED → 정책 비공개 안내 배너만 (액션 없음)
  - DRAFT/READY → "심사 제출" primary
  - REJECTED → "심사 제출" primary (resubmit=true: 저장 후 제출)
  - APPROVED → "판매 시작" primary + "예약 판매시작" outline
  - STOP_SELLING → "판매 재개" primary + "예약 판매재개" outline
  - ON_SALE → "판매 중지" outline
  - "아이템 삭제"는 항상 노출 (danger)
- **입력 검증**:
  - title trim 후 비어있지 않으면 통과 (`_isFormValid`)
  - 심사 제출은 폼 유효성 게이트 적용 (유효하지 않으면 제출 차단)
  - 판매 시작/재개/중지는 폼 유효성과 무관
  - title `maxLength: 200`, description `maxLength: 2000` (UI 제약)
- **수정 가능 필드**: 서버는 itemType/currencyType 변경 불가(`MarketItemModParam`에 두 필드 없음). 화면도 이 두 필드는 폼에 포함하지 않음. 무료 결제 차등가(`freePointPrice`)는 수정 가능하나, 현재 편집 폼은 포함하지 않음 → 차등가 입력 UI 추가 여부는 화면 결정 사항
- **재고 수량 빈 입력**: `int.tryParse` → null → 무제한 의미
- **표시 순서**: 0이 기본값 (서버 builder default)
- **확인 다이얼로그 카피**:
  - 심사 제출: "아이템을 심사에 제출하시겠습니까? 승인 후 판매를 시작할 수 있습니다." / "제출" / "취소"
  - 재제출: "수정한 내용을 저장하고 다시 심사에 제출하시겠습니까?" / "재제출" / "취소"
  - 판매 시작: "판매를 시작하시겠습니까? 구매자에게 노출됩니다." / "시작" / "취소"
  - 판매 재개: "판매를 다시 시작하시겠습니까?" / "재개" / "취소"
  - 판매 중지: "아이템 판매를 중지하시겠습니까?" / "중지" / "취소"
  - 삭제: "아이템을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다." / "삭제" / "취소"
- **토스트 메시지**:
  - 수정: "아이템이 수정되었습니다" / "아이템 수정에 실패했습니다"
  - 심사 제출: "심사에 제출되었습니다" / "심사 제출에 실패했습니다"
  - 판매 시작/재개: "판매가 시작되었습니다"/"판매가 재개되었습니다" / "판매 시작에 실패했습니다"
  - 판매 중지: "아이템 판매가 중지되었습니다" / "판매 중지에 실패했습니다"
  - 삭제: "아이템이 삭제되었습니다" / "아이템 삭제에 실패했습니다"

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

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 확정-OK | `market_item_edit_screen.dart:128` | 모든 위험 액션 `AppDialog.confirm` 사용 확인 — raw AlertDialog 없음 | 해소됨 |
| 확정-OK | `market_item_edit_screen.dart:68` | 그 외 필드 클라이언트 검증 없음 (서버 검증에 위임) 확인 | 설계 의도 |
| 확정-OK | `MarketItemService.java:150` | `publishItem` @Deprecated — submitForReview로 위임되어 기존 Flutter 호출 경로 유지되나 서버는 심사 플로우로 리다이렉트됨 | 양쪽 코드 일치, 이슈 없음 |
| 확정-OK | `ScheduledPublishScheduler.java:376` | MARKET_ITEM 예약 판매시작 실행 구현됨 — 폴러가 `SUPPORTED_TARGET_TYPES`(PLAN/MARKET_ITEM/CLUB_POST/CLUB_ANNOUNCEMENT, `:92`)로 due 예약을 잡아 `case MARKET_ITEM -> processMarketItem`(상태 재검증 후 `marketItemService.activateSale`) 디스패치, 고착(EXECUTING) 복구도 `recoverMarketItem`(`:201`) 처리. (※ Repository 메서드 주석의 "PLAN/MARKET_ITEM 제한"은 Slice 1 시절 stale — 실제 인자는 4종 집합) | 해소됨 |
| 확정-OK | `market_item_moderation_status.dart:131` | SUSPENDED 상태 — 크리에이터 화면에서 액션 없음 처리, 서버 `isSuspendable` 반환 범위에 ON_SALE/STOP_SELLING 포함 확인 | 일치 |

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
