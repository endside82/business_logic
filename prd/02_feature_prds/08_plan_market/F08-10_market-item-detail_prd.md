# F08-10. 마켓 아이템 상세 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-10_market-item-detail -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-10_market-item-detail`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

마켓 아이템 한 건의 상세 정보, 리뷰 목록, 연계 번들 옵션을 한 번에 노출하기 위한 다중 GET 엔드포인트 묶음. 사용자는 아이템 정보·리뷰·번들 할인까지 모두 비교한 뒤 구매 결정을 내린다 (구매 자체는 F08-11에서 처리).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- F08-08 마켓 메인의 인기 카드 / 최신 grid 카드 탭 → `context.push('/market/items/${itemId}')`
- F08-09 마켓 검색 결과 카드 탭
- F08-12 내 컬렉션 카드 탭 (구매한 아이템 다시 보기)
- F08-07 크리에이터 프로필의 판매 아이템 카드 탭
- 푸시 알림 / 딥링크 (`/market/items/:itemId`)
- 라우터 경로: `Routes.planMarketItems = 'items/:itemId'` (planMarket prefix `/market` 하위)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-10_market-item-detail/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-10_market-item-detail/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-10_market-item-detail/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-10_market-item-detail/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/BundleController.java:22` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/BundleController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/BundleController.java:32` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java:34` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/MarketItemReviewController.java:36` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시:
   - `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{itemId}`
   - `bundlesForItemNotifierProvider(itemId)` ▶ `MarketRepository.listBundlesForItem(itemId)` ▶ `GET /api/v1/market/items/{itemId}/bundles`
   - `marketItemReviewsNotifierProvider(itemId)` ▶ `MarketRepository.getItemReviews(itemId, page:0, size:20)` ▶ `GET /api/v1/market/items/{itemId}/reviews?page=0&size=20`
   - `recentlyViewedIdsProvider.notifier.record(itemId)` (로컬 저장)
2. 구매하기 액션 시: F08-11 참조 (`POST /api/v1/market/items/{itemId}/purchase`)
3. 번들 구매 시: F08-11 참조 (`POST /api/v1/market/bundles/{bundleId}/purchase`)
4. 리뷰 작성/수정/삭제 시: F08-13 참조

## 4. 서버 계약

### 개요

마켓 아이템 한 건의 상세 정보, 리뷰 목록, 연계 번들 옵션을 한 번에 노출하기 위한 다중 GET 엔드포인트 묶음. 사용자는 아이템 정보·리뷰·번들 할인까지 모두 비교한 뒤 구매 결정을 내린다 (구매 자체는 F08-11에서 처리).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/market/items/{itemId} | MarketItemController#getMarketItem | unauthenticated 가능 | 단건 아이템 상세 조회 |
| GET | /api/v1/market/items/{itemId}/reviews | MarketItemReviewController#getReviews | unauthenticated 가능 | 아이템 리뷰 페이지 조회 |
| GET | /api/v1/market/items/{itemId}/bundles | BundleController#listBundlesForItem | unauthenticated 가능 | 아이템 포함 번들 목록 |
| GET | /api/v1/market/bundles/{bundleId} | BundleController#getBundleDetail | unauthenticated 가능 | 번들 단건 상세 |
| GET | /api/v1/market/bundles | BundleController#listActiveBundles | unauthenticated 가능 | 활성 번들 전체 목록 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `ItemStatus`: `READY`, `ON_SALE`, `STOP_SELLING`, `REMOVED`
- **VO** `MarketItemVo`: F08-08 참조. 무료 포인트 관련 필드 (`plan/vo/MarketItemVo.java`):
  - `currencyType` (String): `PAID_POINT`(유료만) / `FREE_POINT`(무료만) / `ANY_POINT`(둘 다). 구매 시 사용 가능한 통화 종류를 콘텐츠 생산자가 결정
  - `freePointPrice` (BigDecimal, nullable): 무료 포인트 결제 시 적용할 차등 금액. `ANY_POINT`인데 미설정이면 유료우선 혼합(PAID_FIRST), 설정되면 통화별 단일가
  - 구매 시 결제 통화 선택은 `PaymentFundingMode`(`PAID`/`FREE`)로 전달 — `FREE`는 무료가 허용되고 차등가가 설정된 경우에만 가능
- **VO** `ItemReviewVo`: 위 응답 섹션 참조 — `boolean isEdited` Jackson 직렬화 시 JSON 키 `edited`
- **VO** `BundleVo` / `BundleItemVo`: 위 응답 섹션 참조. `BundleVo` (`plan/vo/BundleVo.java`)도 `currencyType`(String)·`freePointPrice`(BigDecimal, nullable)를 **조회 응답으로 노출**한다. 단, 번들의 차등가(`freePointPrice`) **설정**은 `community_admin_api`에서 관리하며 admin 빌더 배선은 followup이다(community_api에는 VO/param 노출만 있음).
- 유료/무료 분리정산(Point Split Flow-Through): 무료 포인트로 구매하면 수취자에게 무료로 전파되어 현금화되지 않는다. 상세 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

### 의존 단위 / 외부 시스템

- 외부 호출 없음
- 다른 Unit 의존:
  - **F08-11 (구매)**: 본 화면의 "구매하기" / "이 번들로 구매하기" 버튼이 진입점
  - **F08-13 (리뷰 작성)**: 본 화면 리뷰 섹션의 "리뷰 작성" / "수정" / "삭제"
  - **F08-07 (크리에이터 프로필)**: 크리에이터 정보 바 탭 시 진입
  - **Unit 06 결제**: 잔액 부족 시 충전 화면 이동 (F08-11에서 처리)
- 카테고리/번들 가격 표시는 BigDecimal 그대로 사용 (Java BigDecimal → Dart double 매핑 필수)

## 5. 프론트 계약

### 진입 경로

- F08-08 마켓 메인의 인기 카드 / 최신 grid 카드 탭 → `context.push('/market/items/${itemId}')`
- F08-09 마켓 검색 결과 카드 탭
- F08-12 내 컬렉션 카드 탭 (구매한 아이템 다시 보기)
- F08-07 크리에이터 프로필의 판매 아이템 카드 탭
- 푸시 알림 / 딥링크 (`/market/items/:itemId`)
- 라우터 경로: `Routes.planMarketItems = 'items/:itemId'` (planMarket prefix `/market` 하위)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/market/items/:itemId` | `presentation/market/screens/market_item_detail_screen.dart` | 마켓 아이템 상세 (커버 + 정보 + 번들 + 리뷰 + 구매 버튼) |

### 화면별 구성 요소 & 액션

### 마켓 아이템 상세 (`market_item_detail_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '')` — 투명 처리, 뒤로 버튼만
  - 커버 이미지 영역 (높이 240, `_coverColor(item.itemType)` fallback)
    - `PLAN`: 베이지/오렌지 (`Color(0xFFD89575).withOpacity(0.3)`)
    - `EVENT_PACKAGE`: `AppColors.linkBlue.withOpacity(0.3)`
    - 기타: `AppColors.gray100`
  - 본문 padding `AppSpacing.screenPadding` (16)
    - 제목 (Pretendard 22, weight 700)
    - `PriceTag(price: item.amount)` — 0이면 "무료" (linkBlue), 양수면 `₩N,NNN` (primary500)
    - 크리에이터 바 (회색 박스 0xFFF0F0ED, padding 10) — `CircleAvatar` + "크리에이터" 라벨 + 우측 `chevron_right`
    - 디바이더
    - "플랜 소개" 섹션 (description 있을 때만)
    - 번들 섹션 (`_buildBundleSection`) — 번들이 0개면 SizedBox.shrink
      - 각 번들 카드: 제목 + (할인 시) "N% OFF" 배지 + 할인가/원가 + 포함 아이템 체크리스트 + "이 번들로 구매하기" 버튼
    - 리뷰 섹션 (`_buildReviewSection`) — "리뷰" 헤더 + (로그인 시) "리뷰 작성" 텍스트 버튼
      - 리뷰 카드: 별점 5개 (warning500), 작성일 (`yyyy.MM.dd`), `(수정됨)` 배지, 본문, 본인이면 `PopupMenuButton` (수정/삭제)
      - 빈 리뷰: "아직 리뷰가 없습니다" (textTertiary)
  - 하단 고정 영역 (`bottomNavigationBar`) — `status == 'ON_SALE'`일 때만
    - `AppButton(label: '구매하기', variant: ButtonVariant.primary, size: ButtonSize.lg, fullWidth: true)`
- **사용자가 할 수 있는 액션**:
  - 진입 직후: `recentlyViewedIdsProvider.notifier.record(itemId)` (실패 무시) — F08-08 "최근 본 플랜" 갱신
  - 크리에이터 바 탭 ▶ `context.push('/market/creators/${item.creatorId}')`
  - "구매하기" 버튼 탭 ▶ `_handlePurchase(itemId)` ▶ F08-11 흐름 (`POST /api/v1/market/items/{itemId}/purchase`)
  - "이 번들로 구매하기" 탭 ▶ `_handleBundlePurchase(bundleId)` ▶ F08-11 흐름
  - "리뷰 작성" 텍스트 버튼 탭 (로그인 사용자) ▶ `showMarketReviewWriteDialog` → 평점 + 본문 입력 → 등록 (F08-13)
  - 본인 리뷰의 PopupMenuButton "수정"/"삭제" ▶ F08-13 흐름
- **상태 분기**:
  - 로딩: `Center(CircularProgressIndicator)`
  - 에러: `AppErrorState.fromError(error, onRetry: () => ref.invalidate(marketItemDetailNotifierProvider(itemId)))`
  - 번들 0개: silent (섹션 자체 안 보임)
  - 리뷰 0개: "아직 리뷰가 없습니다" 안내 텍스트
  - `status != 'ON_SALE'`: 하단 구매 버튼 미표시
- **모달/시트/네비게이션**:
  - 리뷰 작성 다이얼로그: `showMarketReviewWriteDialog` (`AlertDialog`, 평점 별 5개 + 500자 textarea)
  - 잔액 부족 시: `AppDialog.confirm("포인트 부족", "포인트가 부족합니다. 충전하시겠습니까?", confirm:"충전하기")` → 확인 시 `/profile/wallet/charge` 이동
  - 구매 완료: `AppDialog.alert("구매 완료", "구매가 완료되었습니다", "확인")` → 확인 시 `/market/collection`으로 push
  - 리뷰 삭제: `AppDialog.confirm("리뷰 삭제", "이 리뷰를 삭제하시겠습니까?", confirm:"삭제")`

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시:
   - `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{itemId}`
   - `bundlesForItemNotifierProvider(itemId)` ▶ `MarketRepository.listBundlesForItem(itemId)` ▶ `GET /api/v1/market/items/{itemId}/bundles`
   - `marketItemReviewsNotifierProvider(itemId)` ▶ `MarketRepository.getItemReviews(itemId, page:0, size:20)` ▶ `GET /api/v1/market/items/{itemId}/reviews?page=0&size=20`
   - `recentlyViewedIdsProvider.notifier.record(itemId)` (로컬 저장)
2. 구매하기 액션 시: F08-11 참조 (`POST /api/v1/market/items/{itemId}/purchase`)
3. 번들 구매 시: F08-11 참조 (`POST /api/v1/market/bundles/{bundleId}/purchase`)
4. 리뷰 작성/수정/삭제 시: F08-13 참조

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 일반 사용자의 아이템 상세 → 구매 결정 (Happy Path 진입) | 마켓 메인에서 인기 카드를 탭한 직후. | 사용자가 충분한 정보를 본 뒤 구매 흐름으로 넘어감 (또는 뒤로 나감). |
| S2 | 번들 옵션 보기 | 묶음 할인을 노리는 사용자. | 번들 단위 구매 흐름 진입. |
| S3 | 리뷰 보기 + 작성 | F08-12 컬렉션에서 본 아이템 카드 탭하여 진입. | 사용자 리뷰가 추가되어 다른 사용자에게도 보임. |
| S4 | 본인 리뷰 수정/삭제 | 시나리오 본문 참조 | 본인 리뷰가 수정 또는 삭제되고 즉시 갱신됨. |
| S5 | status != ON_SALE / 비로그인 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 404 / 네트워크 에러 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 크리에이터 프로필 이동 | 홈 추천/딥링크 등으로 `/home/market/1001` 진입 | 크리에이터의 다른 판매 아이템 탐색 가능. |

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
| 후보 | backend.md:28 | - **비즈니스 로직**: `MarketItemService.getMarketItem(itemId)` — 단순 조회 + reviewCount/avgRating 집계 (서비스 구현 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:86 | - **비즈니스 로직**: `BundleService.listBundlesForItem(itemId)` — 해당 아이템을 포함하는 활성 번들만 반환 (서비스 구현 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:99 | - **비즈니스 로직**: `BundleService.getBundleDetail(bundleId)` (구현 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:109 | - **비즈니스 로직**: `BundleService.listActiveBundles()` — `ItemStatus.ON_SALE` + 판매기간 내 번들 (구현 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 일반 사용자의 아이템 상세 → 구매 결정 (Happy Path 진입)**: Given 마켓 메인에서 인기 카드를 탭한 직후. When 사용자가 해당 흐름을 실행하면 Then 사용자가 충분한 정보를 본 뒤 구매 흐름으로 넘어감 (또는 뒤로 나감).
- **AC-02. 번들 옵션 보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 번들 단위 구매 흐름 진입.
- **AC-03. 리뷰 보기 + 작성**: Given F08-12 컬렉션에서 본 아이템 카드 탭하여 진입. When 사용자가 해당 흐름을 실행하면 Then 사용자 리뷰가 추가되어 다른 사용자에게도 보임.
- **AC-04. 본인 리뷰 수정/삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본인 리뷰가 수정 또는 삭제되고 즉시 갱신됨.
- **AC-05. status != ON_SALE / 비로그인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 404 / 네트워크 에러**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 크리에이터 프로필 이동**: Given 홈 추천/딥링크 등으로 `/home/market/1001` 진입 When 사용자가 해당 흐름을 실행하면 Then 크리에이터의 다른 판매 아이템 탐색 가능.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- 아이템/번들 상세가 `currencyType`/`freePointPrice`를 응답에 포함하므로, 구매 화면에서 결제 통화(유료/무료)를 어떻게 선택·노출할지(차등가 표시 포함)는 화면에서 결정한다. **번들 차등가 설정은 admin(`community_admin_api`) 배선 followup**이므로 번들 `freePointPrice`는 당분간 조회 노출 위주로 본다. 정책 자체는 `03_policy_prds/payment_settlement_policy_prd.md` §2.5를 따른다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
