# F08-10. 마켓 아이템 상세 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

마켓 아이템 한 건의 상세 정보, 리뷰 목록, 연계 번들 옵션을 한 번에 노출하기 위한 다중 GET 엔드포인트 묶음. 사용자는 아이템 정보·리뷰·번들 할인까지 모두 비교한 뒤 구매 결정을 내린다 (구매 자체는 F08-11에서 처리).

**AUTH-08(2026-06-09)**: 마켓 아이템 상세 조회 시 **인증된 비소유자(non-owner)** 조회에 한해 `market_item.view_count` 원자 증가. 소유자(크리에이터) 본인 조회와 익명 조회는 카운트 제외. 집계 합산은 크리에이터 대시보드(F08-07 `marketItemViewTotal`)로 환류.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- F08-08 마켓 메인의 인기 카드 / 최신 grid 카드 탭 → `context.push('/market/items/${itemId}')`
- F08-09 마켓 검색 결과 카드 탭
- F08-12 내 컬렉션 카드 탭 (구매한 아이템 다시 보기)
- F08-07 크리에이터 프로필의 판매 아이템 카드 탭
- 푸시 알림 / 딥링크 (`/market/items/:itemId`)
- 라우터 경로: `Routes.planMarketItems = 'items/:itemId'` (planMarket prefix `/market` 하위)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `BundleController`, `MarketItemController`, `MarketItemReviewController`, `MarketItem`, `MarketItemService`, `ViewCountIncrementService`, `MarketItemQueryRepository`, `SecurityConfiguration`, `MarketItemVo`, `BundleVo`. 앱: `market_item_detail_screen.dart`.

## 3. 전체 동작 흐름

1. 화면 진입 시:
   - `marketItemDetailNotifierProvider(itemId)` ▶ `MarketRepository.getMarketItem(itemId)` ▶ `GET /api/v1/market/items/{itemId}`
   - `bundlesForItemNotifierProvider(itemId)` ▶ `MarketRepository.listBundlesForItem(itemId)` ▶ `GET /api/v1/market/items/{itemId}/bundles`
   - `marketItemReviewsNotifierProvider(itemId)` ▶ `MarketRepository.getItemReviews(itemId, page:0, size:20)` ▶ `GET /api/v1/market/items/{itemId}/reviews?page=0&size=20`
   - `recentlyViewedIdsProvider.notifier.record(itemId)` (로컬 저장)
2. 구매하기 액션 시: F08-11 참조 (`POST /api/v1/market/items/{itemId}/purchase`)
3. 번들 구매 시: F08-11 참조 (`POST /api/v1/market/bundles/{bundleId}/purchase`)
4. 리뷰 작성/수정/삭제 시: F08-13 참조

### 플랜 직접 상세/미리보기의 결제 수단 선택(인접 구현 실측)

F08-10의 마켓 아이템 화면과 별개로, 플랜 직접 구매 화면에는 무료 포인트 선택 UX가 구현되어 있다.

- `home/screens/market_plan_detail_screen.dart`는 `PlanVo.allowFreePoints/freePointPrice`를 사용한다.
- `plan/screens/plan_preview_screen.dart`는 별도 상세 조회 없이 `PlanPreviewVo`의 같은 필드를 사용한다.
- `freePointPrice`가 `null`이면 플랜 기본가로 폴백한다.
- `allowFreePoints && price > 0 && (freePointPrice ?? price) >= 1`일 때 `PlanFundingChoiceSheet`를 연다.
- 시트는 `PAID` “일반 결제”와 `FREE` “무료 포인트로 구매”를 반환한다.
- 무료 잔액은 `walletNotifierProvider.freeBalance`로 표시하며, 부족해도 옵션을 비활성화하지 않는다. 최종 잔액 판정은 서버다.

반면 **현재 마켓 아이템/번들 Flutter 경로는 결제 수단 선택이 없다**. `market_api.dart`, repository, provider의 `purchaseItem/purchaseBundle`은 `fundingMode`를 받지 않아 서버의 기본값 `PAID`로만 호출한다. 응답의 `currencyType/freePointPrice`도 구매 CTA에서 소비하지 않는다.

## 4. 제품 규칙

- 구매 통화는 만든 사람이 정한다: PAID_POINT 유료만, FREE_POINT 무료만, ANY_POINT 둘 다.
- ANY_POINT 에 무료 가격이 없으면 유료 우선 혼합(PAID_FIRST)이고 무료 결제 요청은 거절한다. 무료 가격이 있으면 무료는 그 값, 유료는 기본 가격이다.
- 번들 목록은 ON_SALE 번들만 보여 준다. 번들이 없으면 섹션 자체가 없다.
- 아이템을 열면 최근 본 플랜에 기록한다. 기록이 실패해도 무시한다.
- 조회수는 작성자가 아닌 로그인 사용자의 상세 조회만 센다. 세는 일이 실패해도 상세는 정상으로 보인다.

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
| S8 (AUTH-08) | 인증된 비소유자 상세 조회 → view_count 증가 | 타 사용자가 GET /api/v1/market/items/{itemId} 호출 | view_count +1 원자 증가. 조회 응답 정상 반환(증가 실패 시에도 warn 로그만, 응답 무중단) |
| S9 (AUTH-08) | 크리에이터 본인 상세 조회 → view_count 불변 | 아이템 소유 크리에이터가 자기 아이템 조회 | view_count 변화 없음. 통계 부풀리기 방지 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Gap (설계 vs 배선) | `SecurityConfiguration.java:97` | **비로그인 열람 가능 여부**: 컨트롤러 시그니처는 `optional`이나 전역 `anyRequest().authenticated()` 하에 `/api/v1/market/**` 가 permitAll 목록에 없어 비인증 접근이 필터에서 차단됨. 상세·리뷰·번들 GET 모두 실질 인증 필수. 비로그인 조회가 의도면 SecurityConfiguration 정비 필요. | SecurityConfiguration에 market 조회 GET 경로 permitAll 추가 여부 결정 |
| Gap(Flutter) | `market_api.dart:82`, `market_repository.dart:213`, `market_item_detail_screen.dart:647` | 서버는 아이템/번들 구매의 `fundingMode`와 VO의 `currencyType/freePointPrice`를 제공하지만 앱은 query를 전송하지 않아 항상 기본 `PAID`로 구매한다. 플랜 직접 구매만 선택 시트가 구현됐다. | 아이템/번들의 FREE/ANY_POINT 노출·선택 UX 및 API 배선 필요 |
| 구현됨 (AUTH-08) | `MarketItemService.java:67`, `ViewCountIncrementService.java:43` | view_count 비소유자 조회 시 원자 증가. REQUIRES_NEW 격리. 실패 무중단. | QA: 소유자/비소유자/증가실패 시나리오 E2E 확인 |
| 주의 (AUTH-08) | `MarketItemVo.java` | view_count는 MarketItemVo 응답 필드에 노출되지 않음. 상세 화면에서 직접 조회수 표시 불가 — 크리에이터 대시보드(F08-07)에서만 집계 확인. | 현재 정책 유지: 상세 화면 미표시, 대시보드 집계만 제공. |

## 9. 수용 기준

- **AC-01. 일반 사용자의 아이템 상세 → 구매 결정 (Happy Path 진입)**: Given 마켓 메인에서 인기 카드를 탭한 직후. When 사용자가 해당 흐름을 실행하면 Then 사용자가 충분한 정보를 본 뒤 구매 흐름으로 넘어감 (또는 뒤로 나감).
- **AC-02. 번들 옵션 보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 번들 단위 구매 흐름 진입.
- **AC-03. 리뷰 보기 + 작성**: Given F08-12 컬렉션에서 본 아이템 카드 탭하여 진입. When 사용자가 해당 흐름을 실행하면 Then 사용자 리뷰가 추가되어 다른 사용자에게도 보임.
- **AC-04. 본인 리뷰 수정/삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본인 리뷰가 수정 또는 삭제되고 즉시 갱신됨.
- **AC-05. status != ON_SALE / 비로그인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 404 / 네트워크 에러**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 크리에이터 프로필 이동**: Given 홈 추천/딥링크 등으로 `/home/market/1001` 진입 When 사용자가 해당 흐름을 실행하면 Then 크리에이터의 다른 판매 아이템 탐색 가능.
- **AC-08 (AUTH-08). 인증된 비소유자 상세 조회 → view_count 증가**: Given 타 사용자가 GET /api/v1/market/items/{itemId} 호출 When 조회 완료 Then view_count +1 원자 증가. 조회 응답 정상 반환. 증가 실패 시에도 응답 무중단.
- **AC-09 (AUTH-08). 크리에이터 본인 조회 → view_count 불변**: Given 아이템 소유 크리에이터가 자기 아이템 조회 When 조회 완료 Then view_count 변화 없음.

## 10. 미결정 / 후속

- 플랜 직접 상세/미리보기의 유료/무료 선택은 구현됐다. 남은 결정은 마켓 아이템/번들 화면에서 `currencyType`/`freePointPrice`를 어떻게 표시하고 `fundingMode`를 전송할지다. **번들 차등가 설정은 admin(`community_admin_api`) 배선 followup**이므로 번들 `freePointPrice`는 당분간 조회 노출 위주로 본다. 정책 자체는 `03_policy_prds/payment_settlement_policy_prd.md` §2.5를 따른다.
