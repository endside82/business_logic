# F08-07. 크리에이터 프로필 / 내 통계 PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-10; unit: business_logic/units/08_plan_market/F08-07_creator-profile-stats -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-07_creator-profile-stats`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

공개 프로필(설계상 공개이나 현재 전역 보안(인증 필수)상 인증 사용자 한정 — 진짜 비로그인 공개가 의도면 SecurityConfiguration permitAll + 앱 publicRoutes 추가 필요)과 본인 전용 판매 통계(`/me/stats`)를 분리한 두 엔드포인트. 프로필은 닉네임/플랜수/총판매수/평균별점을 보여주고, 본인 통계(AUTH-08 크리에이터 성과 대시보드)는 기존 4개 필드에서 **17개 필드**로 대폭 확장되었다.

**AUTH-08 확장 내용**: `totalPlanCount`, `publishedPlanCount`, `totalSalesCount`, `totalSalesAmount`(기존 4개) + 환불·분쟁 5개(`refundedCount`, `refundedAmount`, `disputeCount`, `disputeLostCount`, `refundHeldAmount`) + 플랜→이벤트 전환 3개(`planToEventConvertedCount`, `planPurchaseTotalCount`, `planToEventConversionRate`) + 클럽 커뮤니티 3개(`clubPostViewTotal`, `clubPostCommentTotal`, `clubPostLikeTotal`) + 상세 조회수 2개(`planViewTotal`, `marketItemViewTotal`). 환불/분쟁 건수·금액은 **seller_user_id가 아니라 수익 귀속(creator_user_id) 기준**으로 집계해 번들 큐레이터/원작자 불일치를 해소한다. 본인 콘텐츠 절대수치라 k-익명성 게이트 없음. 플랜 리뷰 지표는 포함하지 않는다(결정됨).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마켓 아이템 상세(F08-10)에서 크리에이터 정보 탭 ▶ `/market/creators/:creatorId`
- 마켓 메인 / 검색 결과의 크리에이터 카드 ▶ `/market/creators/:creatorId`
- 본인 통계: 플랜 목록(F08-01) 우측 상단 차트 아이콘 ▶ `/market/creators/me/stats`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-07_creator-profile-stats/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-07_creator-profile-stats/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-07_creator-profile-stats/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-07_creator-profile-stats/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/CreatorController.java:23` | 확인됨 (getCreatorProfile) |
| `community_api/src/main/java/com/endside/community/plan/controller/CreatorController.java:28` | 확인됨 (getMyStats) |
| `community_api/src/main/java/com/endside/community/plan/vo/CreatorStatsVo.java:1` | 확인됨 (17개 필드 전체) |
| `community_api/src/main/java/com/endside/community/plan/service/CreatorService.java:67` | 확인됨 (getMyStats 구현) |
| `community_app/lib/data/models/market/creator_profile_vo.dart:23` | 확인됨 (CreatorStatsVo Freezed) |
| `community_app/lib/presentation/market/screens/creator_stats_screen.dart:1` | 확인됨 (AUTH-08 확장 화면) |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 공개 프로필
1. 진입 시: `creatorProfileNotifierProvider(creatorId)` ▶ `MarketRepository.getCreatorProfile(creatorId)` ▶ `GET /api/v1/creators/{creatorId}`
2. `_CreatorPlanList.initState` → `planRepositoryProvider.getPlans(creatorId, size:20)` ▶ `GET /api/v1/plans?creatorId=...`
   - **주의**: PlanController.listPlans는 status=PUBLISHED 필터링 (creatorId 옵션과 함께 PUBLISHED 한정)

### 내 통계
1. 진입 시: `myCreatorStatsNotifierProvider` ▶ `MarketRepository.getMyStats()` ▶ `GET /api/v1/creators/me/stats`

## 4. 서버 계약

### 개요

공개 프로필(설계상 공개이나 현재 전역 보안상 인증 사용자 한정)과 본인 전용 판매 통계(`/me/stats`)를 분리한 두 엔드포인트. 프로필은 닉네임/플랜수/총판매수/평균별점을 보여주고, 본인 통계는 발행 중인 플랜 수와 누적 매출을 추가로 노출한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/creators/{creatorId} | `CreatorController#getCreatorProfile` | optional (컨트롤러) — `anyRequest().authenticated()` 전역 규칙 하에 `/api/v1/creators/**`는 별도 permitAll 없음 → **실질 인증 필수**. 비로그인 공개가 의도라면 `SecurityConfiguration` permitAll + 앱 publicRoutes 추가 필요. | 공개 프로필 (닉네임, 플랜 수, 총판매, 평균별점) |
| GET | /api/v1/creators/me/stats | `CreatorController#getMyStats` | required | 본인 통계 (발행 중, 매출 합계 포함) |

### 도메인 모델 / Enum (이 기능 관련)

- **CreatorProfileVo** (`community_api/.../plan/vo/CreatorProfileVo.java`):
  - `userId`, `nickname`, `profileImageUrl?`, `planCount`, `totalSales`, `averageRating?`, `joinedAt`
- **CreatorStatsVo** (AUTH-08으로 17개 필드, `community_api/.../plan/vo/CreatorStatsVo.java:1`):
  - **기존 4개**: `totalPlanCount` (int), `publishedPlanCount` (int), `totalSalesCount` (int), `totalSalesAmount` (long)
  - **환불·분쟁 5개** (Slice 1 — 기존 데이터 집계):
    - `refundedCount` (long) — creator_earning 귀속 기준 환불 완료 건수 (REFUNDED + REFUNDED_BY_OPERATOR)
    - `refundedAmount` (BigDecimal) — 동일 귀속 기준 환불 완료 금액 합계; earning status(REVERSED→PAID 회수)에 면역
    - `disputeCount` (long) — 매출 귀속 기준 분쟁 총 건수
    - `disputeLostCount` (long) — 패소(OVERTURNED) 분쟁 건수
    - `refundHeldAmount` (BigDecimal) — creator_earning.REFUND_HELD 상태 수익 보류 합계
  - **플랜→이벤트 전환 3개** (Slice 1):
    - `planToEventConvertedCount` (long) — 플랜 구매 중 이벤트로 전환된 건수
    - `planPurchaseTotalCount` (long) — 플랜 총 구매 건수(분모)
    - `planToEventConversionRate` (double, 0.0~1.0) — 전환율; 분모 0이면 0.0
  - **클럽 커뮤니티 3개** (Slice 1 + Slice 2b):
    - `clubPostViewTotal` (long) — 본인 ACTIVE 클럽 게시글 조회수 합계
    - `clubPostCommentTotal` (long) — 본인 ACTIVE 클럽 게시글 댓글수 합계
    - `clubPostLikeTotal` (long) — 본인 ACTIVE 클럽 게시글 좋아요 합계 (Slice 2b)
  - **상세 조회수 2개** (Slice 2a — 신규 수집):
    - `planViewTotal` (long) — 전체 플랜 상세 조회수 합계 (plan.view_count)
    - `marketItemViewTotal` (long) — 전체 마켓 아이템 상세 조회수 합계 (market_item.view_count); 비소유자 인증 조회 시만 카운트
- **집계 귀속 정합성**: 환불/분쟁은 `seller_user_id`(번들 큐레이터) 아닌 `creator_user_id`(수익 귀속자) 기준. `CreatorRefundStatsQueryRepository`가 이 구분을 담당 (`CreatorService.java:77`)
- **계산 기준**:
  - `planCount`: 모든 status의 플랜 (DELETED 포함). 공개 프로필 표시는 단순 카운트
  - `totalSales`: 본인이 만든 플랜이 다른 사용자에게 구매된 총 횟수
  - `averageRating`: 본인 아이템에 달린 ItemReview의 rating 평균 (deleted 제외)
- **에러 코드**:
  - 404 USER_NOT_FOUND (1100xxx) — Account 도메인 코드

### 의존 단위 / 외부 시스템

- **Account (Unit 01)**: `UserRepository`, `MemberRepository` (profileImageUrl)
- **Plan (본 단위)**: `PlanRepository`로 플랜 카운트/PUBLISHED 필터
- **Plan Purchase (본 단위)**: `PlanPurchaseQueryRepository`로 판매수/매출 합계
- **Item Review (본 단위, F08-13)**: `ItemReviewQueryRepository.getAverageRatingByCreatorId`로 평균별점
- **Payment (AUTH-08 신규)**: `CreatorRefundStatsQueryRepository` — 환불건수/금액/분쟁건수/패소/보류금액 집계 (귀속 기준)
- **Payment (AUTH-08 신규)**: `CreatorEarningQueryRepository` — refundHeldAmount (EarningStatus.REFUND_HELD 합계)
- **Plan/Club (AUTH-08 신규)**: `CreatorStatsQueryRepository` — 전환율, 클럽 게시글 통계, 상세 조회수 집계
- 외부 시스템 호출 없음

## 5. 프론트 계약

### 진입 경로

- 마켓 아이템 상세(F08-10)에서 크리에이터 정보 탭 ▶ `/market/creators/:creatorId`
- 마켓 메인 / 검색 결과의 크리에이터 카드 ▶ `/market/creators/:creatorId`
- 본인 통계: 플랜 목록(F08-01) 우측 상단 차트 아이콘 ▶ `/market/creators/me/stats`

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/market/creators/:creatorId` | `market/screens/creator_profile_screen.dart` | 공개 프로필 |
| `/market/creators/me/stats` | `market/screens/creator_stats_screen.dart` | 본인 통계 대시보드 |

### 화면별 구성 요소 & 액션

### 크리에이터 프로필 (`creator_profile_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '크리에이터 프로필')`
  - 중앙 `CircleAvatar(radius: 40)` (프로필 이미지 또는 사람 아이콘)
  - 닉네임 + " 크리에이터" (heading 22, w700)
  - 부제 "카페/데이트 플랜 전문" (현재 하드코딩 — 서버에 bio 필드 없음)
  - 통계 행: "판매 플랜" + "판매 실적" 두 칸 (`_StatItem` value/label)
  - Divider
  - "대표 플랜" 섹션 헤더
  - `_CreatorPlanList` — 페이지 1 한정, 최대 20개의 `MarketItemListCard` (썸네일 + 제목 + 가격)
- **사용자가 할 수 있는 액션**:
  - 플랜 카드 탭 ▶ `context.push('/home/market/${plan.id}')` (마켓 플랜 상세, F08-10의 일부)
  - 풀투리프레시 없음 (현재 화면은 ListView 미사용)
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`
  - 플랜 비어있음: "아직 등록된 플랜이 없습니다" 텍스트
- **모달/시트/네비게이션**: 별도 모달 없음

### 내 성과/통계 (`creator_stats_screen.dart`, AUTH-08 대폭 확장)
- **AppBar 타이틀**: `'성과 / 통계'` (이전 `'내 판매 현황'`에서 변경됨 — stale 정정) `creator_stats_screen.dart:27`
- **사용자가 보는 것**:
  - **`_SummaryCard`** (primary500 그라디언트 배경, `creator_stats_screen.dart:80`):
    - "누적 판매 금액" 라벨 (이전 "누적 판매 수익" — stale 정정) (caption white 85%)
    - 큰 금액 `_formatPoint(stats.totalSalesAmount)` (heading1 white w800)
    - 부제: "${totalSalesCount}건 판매 · ${publishedPlanCount}개 플랜 발행 중"
  - **`_StatGrid`** (3열, `creator_stats_screen.dart:131`):
    - "전체 플랜" `Icons.folder_copy_outlined`
    - "발행 중" `Icons.campaign_outlined`
    - "판매 건수" `Icons.shopping_bag_outlined`
  - **`_RefundDisputeSection`** (AUTH-08 신규, `creator_stats_screen.dart:168`):
    - "환불 · 분쟁" 섹션 (warning500 accent)
    - 환불 건수, 환불 금액, 환불 보류 금액(hint), 분쟁 건수, 분쟁 패소(>0이면 error500 빨강)
  - **`_ConversionSection`** (AUTH-08 신규, `creator_stats_screen.dart:208`):
    - "플랜 → 이벤트 전환" 섹션 (linkBlue accent)
    - 전환율(`planToEventConversionRate * 100`%, NumberFormat('0.#')), 전환/총구매 수
  - **`_CommunitySection`** (AUTH-08 신규, `creator_stats_screen.dart:238`):
    - "커뮤니티" 섹션 (primary500 accent)
    - 클럽 글 조회수, 클럽 글 댓글수, 클럽 글 좋아요
  - **`_DetailViewsSection`** (AUTH-08 신규, `creator_stats_screen.dart:267`):
    - "상세 조회수" 섹션 (linkBlue accent)
    - 플랜 상세 조회수, 마켓 상세 조회수
  - **`_HintCard`** (`creator_stats_screen.dart:439`):
    - "발행 중인 플랜이 많고 전환율이 높을수록 노출 우선도가 올라갑니다." (이전 "리뷰 평점" → "전환율"로 변경 — stale 정정)
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `ref.invalidate(myCreatorStatsNotifierProvider)`
- **상태 분기**: 로딩(`AppLoadingState(label: '성과 통계를 불러오는 중입니다')`) / 에러(`AppErrorState.fromError`) / 데이터 직접 표시
- **모달/시트/네비게이션**: 별도 모달 없음

### API 호출 순서 (Provider/Repository 관점)

### 공개 프로필
1. 진입 시: `creatorProfileNotifierProvider(creatorId)` ▶ `MarketRepository.getCreatorProfile(creatorId)` ▶ `GET /api/v1/creators/{creatorId}`
2. `_CreatorPlanList.initState` → `planRepositoryProvider.getPlans(creatorId, size:20)` ▶ `GET /api/v1/plans?creatorId=...`
   - **주의**: PlanController.listPlans는 status=PUBLISHED 필터링 (creatorId 옵션과 함께 PUBLISHED 한정)

### 내 통계
1. 진입 시: `myCreatorStatsNotifierProvider` ▶ `MarketRepository.getMyStats()` ▶ `GET /api/v1/creators/me/stats`

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **공개 프로필 부제 "카페/데이트 플랜 전문"**: 서버에 `bio` 필드가 없어 현재 하드코딩됨. 추후 Member 또는 별도 CreatorBio 테이블 도입 시 교체 필요
- **`_StatItem` 라벨 매핑**:
  - `planCount` → "판매 플랜" (실제 서버는 status 무관 전체 플랜 카운트)
  - `totalSales` → "판매 실적" (구매 횟수 합계)
- **대표 플랜 정렬**: 서버는 단순 `findByCreatorId(..., PUBLISHED)` page=0 size=20. 정렬 키 미지정 (DB 디폴트: id asc 추정)
- **카드 디자인**:
  - 썸네일: `AppColors.primary500.withValues(alpha: 0.3)` 단색 박스 (실제 thumbnail 미사용)
  - 카드는 `MarketItemListCard` (price, title 표시)
- **통계 화면 - SummaryCard 그라디언트**: `LinearGradient(primary500 → primary500 85% alpha)`, `topLeft → bottomRight` (`creator_stats_screen.dart:90`)
- **금액 포맷**: `_formatPoint(amount)` = `NumberFormat('#,###').format(amount) + 'P'`; 환불금액/보류금액 포함 모두 이 포맷 (`creator_stats_screen.dart:75`)
- **카운트 포맷**: `_formatCount(value)` = `NumberFormat('#,###').format(value)` (단위 없음, "건" 라벨은 위젯에서 추가)
- **stat 타일 아이콘** (`_StatGrid`):
  - 전체 플랜: `folder_copy_outlined`
  - 발행 중: `campaign_outlined`
  - 판매 건수: `shopping_bag_outlined`
- **환불 보류 금액 hint**: "환불 신청 접수로 정산에서 보류된 수익" (`creator_stats_screen.dart:191`)
- **분쟁 패소 색**: `disputeLostCount > 0`이면 `AppColors.error500`, 그 외 기본색 (`creator_stats_screen.dart:199`)
- **전환율 포맷**: `NumberFormat('0.#').format(planToEventConversionRate * 100)` + '%' (`creator_stats_screen.dart:215`)
- **풀투리프레시**: `RefreshIndicator` + `ref.invalidate(myCreatorStatsNotifierProvider)`
- **본인 통계 진입 가드**: 라우터에서 `/market/creators/me/stats`가 `creators/:creatorId`보다 먼저 매칭되도록 정의 (app_router.dart에 명시 주석)
- **리뷰 평점 표시 위치**: 통계 화면에서는 표시 안 함 (`CreatorStatsVo`에 averageRating 없음). 공개 프로필에는 있지만 현재 화면 UI에 직접 표시 안 됨 — 추후 개선 여지
- **빈 상태 카피**: "아직 등록된 플랜이 없습니다" (공개 프로필 플랜 목록에만 적용)
- **서버 타입 → Dart 매핑**: 서버 `long` → Dart `int`, 서버 `BigDecimal` → Dart `double` (`creator_profile_vo.dart:28~50`)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 마켓 상세에서 크리에이터 탐방 (Happy Path - 구매자) | 마켓 아이템 상세에서 크리에이터 정보 보기 탭 | 다른 플랜 탐색 시작 |
| S2 | 본인 통계 진입 (AUTH-08 대시보드) | 본인 플랜 5개 (3개 PUBLISHED), 누적 판매 12건, 환불 2건, 분쟁 1건 | 성과 섹션 4개 + SummaryCard + StatGrid 렌더 |
| S3 | 풀투리프레시 후 데이터 갱신 | 통계 화면 진입 후 새 판매 발생 | 최신 17개 필드 갱신 표시 |
| S4 | 존재하지 않는 creatorId 조회 (404) | 삭제된 크리에이터 | 에러 화면. 사용자가 뒤로 이동하거나 재시도 |
| S5 | 비로그인 사용자가 공개 프로필 진입 | 미인증 요청 | 전역 보안 필터에 의해 차단(401) — 컨트롤러는 optional 처리하나 `/api/v1/creators/**` 가 permitAll 목록에 없어 인증 필수. 비로그인 공개가 의도라면 SecurityConfiguration 및 publicRoutes 정비 필요. |
| S6 | 본인 통계를 비로그인이 시도 (직접 URL) | 미인증 요청 | 차단 (CreatorController#getMyStats required) |
| S7 | 본인이 자기 프로필 vs 통계 구분 | 본인 creatorId로 공개 프로필 진입 | 공개 프로필 화면. 통계는 별도 진입점(플랜 목록 차트 아이콘) |
| S8 | 평균별점 없는 신규 크리에이터 | averageRating=null | null 무시되고 정상 표시 |
| S9 | 환불/분쟁 0건인 크리에이터 (AUTH-08) | refundedCount=0, disputeCount=0 | 환불·분쟁 섹션 0 값으로 정상 표시 |
| S10 | 분쟁 패소 있는 크리에이터 (AUTH-08) | disputeLostCount > 0 | 분쟁 패소 수치 error500 빨강으로 강조 |
| S11 | 플랜→이벤트 전환 분모=0 (AUTH-08) | planPurchaseTotalCount=0 | planToEventConversionRate=0.0 (서버에서 보정), "0.0%" 표시 |

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
| Gap (설계 vs 배선) | `SecurityConfiguration.java:97` / `CreatorController.java:24` | **공개 프로필 설계 의도 vs 현재 보안 배선 불일치**: 컨트롤러는 principal 없이 optional 처리하나 전역 `anyRequest().authenticated()`에 의해 비인증 요청이 필터에서 차단됨(`/api/v1/creators/**` permitAll 미선언). 진짜 비로그인 공개가 의도면 SecurityConfiguration permitAll + 앱 publicRoutes 추가 필요. | SecurityConfiguration에 `/api/v1/creators/{creatorId}` GET permitAll 추가 |
| 확정-OK | `CreatorController.java:24` | 공개 프로필 권한: `@AuthenticationPrincipal(errorOnInvalidType = false)` 없이 optional 파라미터가 없음 — 현재 코드는 `@PathVariable long creatorId`만 받고 principal 없음 → 비인증 접근 허용 (단, 위 보안 배선 Gap 해소 후에만 실효) | 보안 배선 Gap 해소 후 확인 |
| 확정-OK | `CreatorController.java:28` | 본인 통계: `@AuthenticationPrincipal UserPrincipal principal` — 미인증 시 차단 | 정상 |
| 확정-OK | `CreatorService.java:67` | PlanController.listPlans 공개 프로필에서 PUBLISHED 필터링 | 정상 (creatorId+PUBLISHED 조합 확인) |
| 확정-OK | `CreatorService.java:44` | getCreatorProfile USER_NOT_FOUND 404 발생 경로 — `userRepository.findById` orElseThrow | 정상 |
| stale 정정 | `creator_stats_screen.dart:27` | 화면 타이틀 변경: "내 판매 현황" → "성과 / 통계" | 반영됨 |
| stale 정정 | `creator_stats_screen.dart:104` | SummaryCard 라벨 변경: "누적 판매 수익" → "누적 판매 금액" | 반영됨 |
| stale 정정 | `creator_stats_screen.dart:470` | HintCard 카피 변경: "리뷰 평점이 높을수록" → "전환율이 높을수록" | 반영됨 |
| stale 정정 | 기존 §1/§4 | "통계=발행중 플랜수+누적매출" → AUTH-08로 17개 필드로 확장 | 전체 §1/§4 정정 완료 |

## 9. 수용 기준

- **AC-01. 마켓 상세에서 크리에이터 탐방 (구매자)**: Given 마켓 아이템 상세에서 크리에이터 정보 보기 탭 When 진입 Then 닉네임/플랜수/판매실적/대표플랜 목록 표시, 플랜 카드 탭 시 마켓 상세 이동
- **AC-02. 본인 통계 진입 (AUTH-08 대시보드)**: Given 본인 플랜 5개(3개 PUBLISHED), 판매 12건, 환불 2건, 분쟁 1건 When `/market/creators/me/stats` 진입 Then SummaryCard + StatGrid + RefundDisputeSection + ConversionSection + CommunitySection + DetailViewsSection 전부 표시
- **AC-03. 풀투리프레시**: Given 통계 화면 When 아래로 당김 Then `myCreatorStatsNotifierProvider` 재요청, 최신 17개 필드 갱신
- **AC-04. 존재하지 않는 creatorId 조회 (404)**: Given 삭제된 크리에이터 ID When 공개 프로필 요청 Then USER_NOT_FOUND 404, 앱 에러 화면
- **AC-05. 비로그인 공개 프로필 열람**: Given 미인증 When `/api/v1/creators/{id}` 요청 Then **현재 배선상 401 차단** (전역 보안 anyRequest().authenticated(), permitAll 미선언). 비로그인 허용이 의도면 SecurityConfiguration + 앱 publicRoutes 추가 필요.
- **AC-06. 비로그인 본인 통계 차단**: Given 미인증 When `/api/v1/creators/me/stats` 요청 Then 401 차단
- **AC-07. 공개 프로필 vs 본인 통계 구분**: Given 본인이 자기 creatorId로 공개 프로필 접근 When 진입 Then 공개 프로필 화면. 통계 대시보드는 별도 차트 아이콘 진입점 유지
- **AC-08. averageRating null 처리**: Given 신규 크리에이터, 리뷰 0건 When 공개 프로필 조회 Then null로 응답되고 화면에서 안전하게 무시
- **AC-09. 분쟁 패소 강조 표시 (AUTH-08)**: Given disputeLostCount > 0 When 통계 화면 렌더 Then 해당 수치 `AppColors.error500` 적용
- **AC-10. 전환율 분모 0 처리 (AUTH-08)**: Given planPurchaseTotalCount=0 When 통계 화면 렌더 Then planToEventConversionRate=0.0, "0.0%" 표시
- **AC-11. 집계 귀속 기준 (AUTH-08)**: Given 번들 아이템으로 원작자와 큐레이터가 다름 When refundedCount/refundedAmount 집계 Then seller_user_id가 아닌 creator_user_id(수익 귀속자) 기준으로 집계됨

## 10. 미결정 / 후속

- **공개 프로필 bio 필드**: 현재 "카페/데이트 플랜 전문" 하드코딩. 서버에 `bio` 필드가 없어 화면 결정 사항. Member 테이블 확장 또는 CreatorBio 별도 테이블 도입 필요.
- **공개 프로필 averageRating UI 표시**: `CreatorProfileVo`에 `averageRating`이 있으나 현재 화면에서 `_StatItem`이 `planCount`/"판매 플랜"과 `totalSales`/"판매 실적" 두 개만 노출. 평균별점 타일 추가 여부는 화면 결정 사항.
- **AUTH-08 집계 스냅샷 지연**: `ClubPostViewTotal`/`PlanViewTotal`/`MarketItemViewTotal` 등 조회수 필드는 `ViewCountIncrementService(REQUIRES_NEW)` 비동기 업데이트 경로를 사용. 풀투리프레시 시 아주 최근 데이터가 반영 안 될 수 있음 (정책: 수용됨).
- QA는 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
