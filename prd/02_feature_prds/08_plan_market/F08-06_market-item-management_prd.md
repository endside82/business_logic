# F08-06. 마켓 아이템 관리 (등록/수정/판매중지) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-06_market-item-management -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-06_market-item-management`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

크리에이터가 자신의 상품(MarketItem)을 별도 도메인 객체로 관리한다. PlanStatus와 별개로 ItemStatus(READY/ON_SALE/STOP_SELLING/REMOVED)로 라이프사이클을 가진다. ItemType(PLAN, EVENT_PACKAGE, VIRTUAL_ITEM, SUBSCRIPTION)에 따라 다양한 상품을 다룰 수 있다.

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
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:39` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:46` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:54` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:62` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:69` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:76` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 진입 시: `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{id}`
2. 저장: `itemManagementNotifierProvider.updateItem(itemId, MarketItemModParam)` ▶ `PUT /market/items/{id}`
3. 발행: `notifier.publishItem(itemId)` ▶ `POST /market/items/{id}/publish`
4. 판매 중지: `notifier.stopSelling(itemId)` ▶ `POST /market/items/{id}/stop`
5. 삭제: `notifier.removeItem(itemId)` ▶ `DELETE /market/items/{id}`
6. 모든 변경 후 `ref.invalidate(marketItemDetailNotifierProvider(itemId))` + 호출자에게 `pop(true)` 전달

## 4. 서버 계약

### 개요

크리에이터가 자신의 상품(MarketItem)을 별도 도메인 객체로 관리한다. PlanStatus와 별개로 ItemStatus(READY/ON_SALE/STOP_SELLING/REMOVED)로 라이프사이클을 가진다. ItemType(PLAN, EVENT_PACKAGE, VIRTUAL_ITEM, SUBSCRIPTION)에 따라 다양한 상품을 다룰 수 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/market/items | `MarketItemController#createItem` | required | 새 마켓 아이템 (status=READY) |
| PUT | /api/v1/market/items/{itemId} | `MarketItemController#updateItem` | required | 아이템 메타 수정 |
| POST | /api/v1/market/items/{itemId}/publish | `MarketItemController#publishItem` | required | READY/STOP_SELLING → ON_SALE |
| POST | /api/v1/market/items/{itemId}/stop` | `MarketItemController#stopSelling` | required | ON_SALE → STOP_SELLING |
| DELETE | /api/v1/market/items/{itemId} | `MarketItemController#removeItem` | required | status=REMOVED soft remove |
| GET | /api/v1/market/items/my | `MarketItemController#getMyItems` | required | 내 아이템 페이지 |

### 도메인 모델 / Enum (이 기능 관련)

- **ItemType**: `PLAN`, `EVENT_PACKAGE`, `VIRTUAL_ITEM`, `SUBSCRIPTION`
- **CurrencyType**: `PAID_POINT(0)`, `FREE_POINT(1)`, `ANY_POINT(2)`
- **ItemStatus**: `READY`, `ON_SALE`, `STOP_SELLING`, `REMOVED`
- **PeriodType**: `NONE`, `DAY`, `MONTH`, `YEAR`, `EXPIRATION`
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

### 의존 단위 / 외부 시스템

- **Account (Unit 01)**: `UserService.getUserBasicInfoMap` — 닉네임 enrich
- **F08-10 (마켓 아이템 상세)**: 상세 화면이 본 데이터를 조회 + 리뷰/번들과 결합
- **F08-11 (구매)**: 구매 시 `purchaseCount` 증가 (다른 단위/agent)
- **F08-08, F08-09 (마켓 탐색/검색)**: 본 아이템들이 마켓 노출 대상
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
  - 상단 `_ItemStatusBadge` — ON_SALE → "판매중" 초록, READY → "판매대기" 회색, STOP_SELLING → "판매중지" 빨강, REMOVED → "삭제됨" 회색
  - ItemType 칩 (`gray100` 배경): "플랜" 또는 "이벤트 패키지" (`PLAN` / `EVENT_PACKAGE`)
  - 폼 (모두 `AppTextInput`/`AppTextArea`):
    - 아이템 이름 (200자, showCharCount)
    - 설명 (2000자, showCharCount, 3~6 lines)
    - 가격 (P 단위, 정수만 keyboardType.number)
    - 안내 "0으로 설정하면 무료로 등록됩니다"
    - 재고 수량 / 표시 순서 (가로 2열)
  - "아이템 관리" 섹션:
    - READY/STOP_SELLING → "발행하기" `ButtonVariant.outline`
    - ON_SALE → "판매 중지" `ButtonVariant.outline`
    - 항상 "아이템 삭제" `ButtonVariant.danger`
  - 하단 SafeArea + "저장" `ButtonVariant.primary, lg, fullWidth`
- **사용자가 할 수 있는 액션**:
  - 폼 입력 → 컨트롤러
  - "저장" 탭 → `_save()`:
    1. 간단 클라이언트 검증 (`_isFormValid` = title 비어있지 않음)
    2. `MarketItemModParam(title, description, amount, stockQuantity, displayOrder)` 생성
    3. `itemManagementNotifierProvider.updateItem(itemId, param)` ▶ `PUT /api/v1/market/items/{id}`
    4. 토스트 "아이템이 수정되었습니다" + `ref.invalidate(marketItemDetailNotifierProvider(itemId))` + `context.pop(true)`
  - "발행하기" → `AppDialog.confirm("아이템 발행 / 아이템을 발행하시겠습니까?")` → `notifier.publishItem(itemId)` ▶ `POST /api/v1/market/items/{id}/publish`
  - "판매 중지" → `AppDialog.confirm("판매 중지")` → `notifier.stopSelling(itemId)` ▶ `POST /api/v1/market/items/{id}/stop`
  - "아이템 삭제" → `AppDialog.confirm("아이템 삭제 / 이 작업은 되돌릴 수 없습니다.")` → `notifier.removeItem(itemId)` ▶ `DELETE /api/v1/market/items/{id}`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError`
  - 제출 중: `_isSubmitting=true`로 모든 버튼 disable, "저장"은 loading 상태
- **모달/시트/네비게이션**:
  - 모든 위험 액션: `AppDialog.confirm` 사용 (raw AlertDialog 아님)
  - 성공 시 `context.pop(true)` (호출자에게 갱신 신호)

### API 호출 순서 (Provider/Repository 관점)

1. 진입 시: `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{id}`
2. 저장: `itemManagementNotifierProvider.updateItem(itemId, MarketItemModParam)` ▶ `PUT /market/items/{id}`
3. 발행: `notifier.publishItem(itemId)` ▶ `POST /market/items/{id}/publish`
4. 판매 중지: `notifier.stopSelling(itemId)` ▶ `POST /market/items/{id}/stop`
5. 삭제: `notifier.removeItem(itemId)` ▶ `DELETE /market/items/{id}`
6. 모든 변경 후 `ref.invalidate(marketItemDetailNotifierProvider(itemId))` + 호출자에게 `pop(true)` 전달

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **status 라벨 매핑** (`_ItemStatusBadge`) — 서버 `ItemStatus`에 정렬:
  - `ON_SALE` → "판매중" (primary500 10% 배경, primary500 텍스트)
  - `READY` → "판매대기" (gray100, textSecondary)
  - `STOP_SELLING` → "판매중지" (error50, error500)
  - `REMOVED` → "삭제됨" (gray100, textTertiary)
  - 그 외 → 원문 또는 "알 수 없음"
- **ItemType 라벨** (`_itemTypeLabel`):
  - `PLAN` → "플랜"
  - `EVENT_PACKAGE` → "이벤트 패키지"
  - 그 외 → 원문
- **버튼 분기** — 서버 `ItemStatus` 기준:
  - READY/STOP_SELLING → "발행하기" 노출
  - ON_SALE → "판매 중지" 노출
  - "아이템 삭제"는 항상 노출
- **입력 검증**:
  - title trim 후 비어있지 않으면 통과 (`_isFormValid`)
  - 그 외 필드 클라이언트 검증 없음 (서버 검증에 위임)
  - title `maxLength: 200`, description `maxLength: 2000` (UI 제약)
- **수정 가능 필드**: 서버는 itemType/currencyType 변경 불가. 화면도 이 두 필드는 폼에 포함하지 않음 (생성 시점에만 결정)
- **재고 수량 빈 입력**: `int.tryParse` → null → 무제한 의미
- **표시 순서**: 0이 기본값 (서버 builder default)
- **확인 다이얼로그**:
  - 발행 "아이템을 발행하시겠습니까?" / 확인 "발행" / 취소
  - 판매 중지 "아이템 판매를 중지하시겠습니까?" / "중지" / "취소"
  - 삭제 "아이템을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다." / "삭제" / "취소"
- **토스트 메시지**:
  - 수정 성공/실패: "아이템이 수정되었습니다" / "아이템 수정에 실패했습니다"
  - 발행/중지/삭제도 동일 패턴

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 새 마켓 아이템 등록 (Happy Path) | 플랜이 PUBLISHED, 마켓 아이템 없음 | status=READY 아이템 생성 |
| S2 | READY → ON_SALE 발행 | status=READY 아이템 | status=ON_SALE, 마켓에 노출 시작 |
| S3 | ON_SALE → STOP_SELLING (판매 중지) | 시나리오 본문 참조 | 마켓에서 비노출. 다시 publish하면 ON_SALE로 복구 |
| S4 | 메타 수정 (가격/설명/재고) | 시나리오 본문 참조 | 가격/설명 갱신. 마켓 노출 정보 변경 |
| S5 | 비소유자 수정 시도 | 다른 사용자 | 차단 |
| S6 | REMOVED 아이템 수정 시도 | 시나리오 본문 참조 | 차단. 편집 화면은 사라짐 처리해야 함 |
| S7 | 아이템 삭제 (Soft Remove) | 시나리오 본문 참조 | 마켓 비노출. 같은 itemId 재진입 시도하면 REMOVED 상태로 응답 |
| S8 | 발행 시 잘못된 상태 (REMOVED에서 publish) | 시나리오 본문 참조 | 차단 |
| S9 | 무료 상품 등록 | 시나리오 본문 참조 | 무료 아이템 등록 성공 |

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
| 후보 | frontend.md:46 | - 모든 위험 액션: `AppDialog.confirm` 사용 (raw AlertDialog 아님) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:74 | - 그 외 필드 클라이언트 검증 없음 (서버 검증에 위임) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 새 마켓 아이템 등록 (Happy Path)**: Given 플랜이 PUBLISHED, 마켓 아이템 없음 When 사용자가 해당 흐름을 실행하면 Then status=READY 아이템 생성
- **AC-02. READY → ON_SALE 발행**: Given status=READY 아이템 When 사용자가 해당 흐름을 실행하면 Then status=ON_SALE, 마켓에 노출 시작
- **AC-03. ON_SALE → STOP_SELLING (판매 중지)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 마켓에서 비노출. 다시 publish하면 ON_SALE로 복구
- **AC-04. 메타 수정 (가격/설명/재고)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가격/설명 갱신. 마켓 노출 정보 변경
- **AC-05. 비소유자 수정 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단
- **AC-06. REMOVED 아이템 수정 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단. 편집 화면은 사라짐 처리해야 함
- **AC-07. 아이템 삭제 (Soft Remove)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 마켓 비노출. 같은 itemId 재진입 시도하면 REMOVED 상태로 응답
- **AC-08. 발행 시 잘못된 상태 (REMOVED에서 publish)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단
- **AC-09. 무료 상품 등록**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무료 아이템 등록 성공

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
