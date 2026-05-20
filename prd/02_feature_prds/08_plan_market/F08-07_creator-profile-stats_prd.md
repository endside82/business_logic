# F08-07. 크리에이터 프로필 / 내 통계 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-07_creator-profile-stats -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-07_creator-profile-stats`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

공개 프로필(누구나 조회 가능)과 본인 전용 판매 통계(`/me/stats`)를 분리한 두 엔드포인트. 프로필은 닉네임/플랜수/총판매수/평균별점을 보여주고, 본인 통계는 발행 중인 플랜 수와 누적 매출을 추가로 노출한다.

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
| `community_api/src/main/java/com/endside/community/plan/controller/CreatorController.java:23` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/CreatorController.java:28` | 확인됨 |

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

공개 프로필(누구나 조회 가능)과 본인 전용 판매 통계(`/me/stats`)를 분리한 두 엔드포인트. 프로필은 닉네임/플랜수/총판매수/평균별점을 보여주고, 본인 통계는 발행 중인 플랜 수와 누적 매출을 추가로 노출한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/creators/{creatorId} | `CreatorController#getCreatorProfile` | optional | 공개 프로필 (닉네임, 플랜 수, 총판매, 평균별점) |
| GET | /api/v1/creators/me/stats | `CreatorController#getMyStats` | required | 본인 통계 (발행 중, 매출 합계 포함) |

### 도메인 모델 / Enum (이 기능 관련)

- **CreatorProfileVo**:
  - `userId`, `nickname`, `profileImageUrl?`, `planCount`, `totalSales`, `averageRating?`, `joinedAt`
- **CreatorStatsVo**:
  - `totalPlanCount`, `publishedPlanCount`, `totalSalesCount`, `totalSalesAmount`
- **계산 기준**:
  - `planCount`: 모든 status의 플랜 (DELETED 포함). 공개 프로필 표시는 단순 카운트
  - `totalSales`: 본인이 만든 플랜이 다른 사용자에게 구매된 총 횟수
  - `averageRating`: 본인 아이템에 달린 ItemReview의 rating 평균 (deleted 제외)
- **에러 코드**:
  - 404 USER_NOT_FOUND (1100xxx) — Account 도메인 코드

### 의존 단위 / 외부 시스템

- **Account (Unit 01)**: `UserRepository`, `MemberRepository` (profileImageUrl)
- **Plan (본 단위)**: `PlanRepository`로 플랜 카운트
- **Plan Purchase (본 단위)**: `PlanPurchaseQueryRepository`로 판매수/매출 합계
- **Item Review (본 단위, F08-13에서 작성)**: `ItemReviewQueryRepository.getAverageRatingByCreatorId`로 평균별점
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

### 내 판매 현황 (`creator_stats_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '내 판매 현황')`
  - **`_SummaryCard`** (큰 카드, primary500 그라디언트 배경):
    - "누적 판매 수익" 라벨 (caption white 85%)
    - 큰 금액 "1,234,567 P" (heading1 white w800, NumberFormat('#,###'))
    - 부제: "12건 판매 · 5개 플랜 판매 중"
  - **`_StatGrid`** (3열):
    - "전체 플랜" `Icons.folder_copy_outlined`
    - "발행 중" `Icons.campaign_outlined`
    - "판매 건수" `Icons.shopping_bag_outlined`
  - **`_HintCard`**: 회색 박스 "💡 발행 중인 플랜이 많고 리뷰 평점이 높을수록 노출 우선도가 올라갑니다."
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `ref.invalidate(myCreatorStatsNotifierProvider)`
- **상태 분기**: 로딩 / 에러(`AppErrorState.fromError`) / 데이터 직접 표시
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
- **통계 화면 - SummaryCard 그라디언트**: `LinearGradient(primary500 → primary500 85% alpha)`, `topLeft → bottomRight`
- **금액 포맷**: `NumberFormat('#,###')` + " P" 단위 표시 (포인트). 서버는 long
- **stat 타일 아이콘**:
  - 전체 플랜: `folder_copy_outlined`
  - 발행 중: `campaign_outlined`
  - 판매 건수: `shopping_bag_outlined`
- **풀투리프레시**: `RefreshIndicator` 사용, ListView 안에 배치
- **본인 통계 진입 가드**: 라우터에서 `/market/creators/me/stats`가 `creators/:creatorId`보다 먼저 매칭되도록 정의 (app_router.dart에 명시 주석 있음)
- **리뷰 평점 표시 위치**: 통계 화면에서는 표시 안 함 (`CreatorStatsVo`에 averageRating 없음). 공개 프로필에는 있지만 현재 화면 UI에는 직접 표시되지 않음 — 추후 개선 여지
- **빈 상태 카피**: "아직 등록된 플랜이 없습니다" (공개 프로필 / 통계 모두 적용)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 마켓 상세에서 크리에이터 탐방 (Happy Path - 구매자) | 마켓 아이템 상세에서 크리에이터 정보 보기 탭 | 다른 플랜 탐색 시작 |
| S2 | 본인 통계 진입 (Creator) | 본인 플랜 5개 (3개 PUBLISHED), 누적 판매 12건 | 자기 활동 한눈에 파악 |
| S3 | 풀투리프레시 후 데이터 갱신 | 시나리오 본문 참조 | 최신 통계 표시 |
| S4 | 존재하지 않는 creatorId 조회 (404) | 시나리오 본문 참조 | 에러 화면. 사용자가 뒤로 이동하거나 재시도 |
| S5 | 비로그인 사용자가 공개 프로필 진입 | 시나리오 본문 참조 | 비로그인도 프로필 열람 가능 |
| S6 | 본인 통계를 비로그인이 시도 (직접 URL) | 시나리오 본문 참조 | 차단 |
| S7 | 본인이 자기 프로필을 보면? (CreatorProfile vs CreatorStats) | 시나리오 본문 참조 | 같은 공개 프로필 화면. 통계는 별도 진입점(차트 아이콘) 필요 |
| S8 | 평균별점이 없는 신규 크리에이터 | `/market/creators/2` 진입 후 `screenMarketCreator` 마운트, `판매 플랜` / `판매 실적` 헤더 + 발행된 카드 목록 노출 | 무시되고 정상 표시 |

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
| 후보 | backend.md:81 | ## 주의 — 본인 vs 공개 프로필 권한 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:56 | - **주의**: PlanController.listPlans는 status=PUBLISHED 필터링 (creatorId 옵션과 함께 PUBLISHED 한정) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:104 | Public --> P1{🟡 user 존재?} | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:105 | P1 -->\|예\| P2[🟡 plan/purchase/review 집계] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:106 | P1 -->\|아니오\| Err1[🔴 USER_NOT_FOUND 404] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:107 | P2 --> Resp1[🔵 CreatorProfileVo 200] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:118 | class B,P1,P2,P3,P4 logic | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 마켓 상세에서 크리에이터 탐방 (Happy Path - 구매자)**: Given 마켓 아이템 상세에서 크리에이터 정보 보기 탭 When 사용자가 해당 흐름을 실행하면 Then 다른 플랜 탐색 시작
- **AC-02. 본인 통계 진입 (Creator)**: Given 본인 플랜 5개 (3개 PUBLISHED), 누적 판매 12건 When 사용자가 해당 흐름을 실행하면 Then 자기 활동 한눈에 파악
- **AC-03. 풀투리프레시 후 데이터 갱신**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 최신 통계 표시
- **AC-04. 존재하지 않는 creatorId 조회 (404)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 에러 화면. 사용자가 뒤로 이동하거나 재시도
- **AC-05. 비로그인 사용자가 공개 프로필 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 비로그인도 프로필 열람 가능
- **AC-06. 본인 통계를 비로그인이 시도 (직접 URL)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단
- **AC-07. 본인이 자기 프로필을 보면? (CreatorProfile vs CreatorStats)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 같은 공개 프로필 화면. 통계는 별도 진입점(차트 아이콘) 필요
- **AC-08. 평균별점이 없는 신규 크리에이터**: Given `/market/creators/2` 진입 후 `screenMarketCreator` 마운트, `판매 플랜` / `판매 실적` 헤더 + 발행된 카드 목록 노출 When 사용자가 해당 흐름을 실행하면 Then 무시되고 정상 표시

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
