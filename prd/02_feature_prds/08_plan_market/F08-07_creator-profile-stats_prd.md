# F08-07. 크리에이터 프로필 / 내 통계 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

공개 프로필(설계상 공개이나 현재 전역 보안(인증 필수)상 인증 사용자 한정 — 진짜 비로그인 공개가 의도면 SecurityConfiguration permitAll + 앱 publicRoutes 추가 필요)과 본인 전용 판매 통계(`/me/stats`)를 분리한 두 엔드포인트. 프로필은 닉네임/플랜수/총판매수/평균별점을 보여주고, 본인 통계(AUTH-08 크리에이터 성과 대시보드)는 기존 4개 필드에서 **17개 필드**로 대폭 확장되었다.

**AUTH-08 확장 내용**: `totalPlanCount`, `publishedPlanCount`, `totalSalesCount`, `totalSalesAmount`(기존 4개) + 환불·분쟁 5개(`refundedCount`, `refundedAmount`, `disputeCount`, `disputeLostCount`, `refundHeldAmount`) + 플랜→이벤트 전환 3개(`planToEventConvertedCount`, `planPurchaseTotalCount`, `planToEventConversionRate`) + 클럽 커뮤니티 3개(`clubPostViewTotal`, `clubPostCommentTotal`, `clubPostLikeTotal`) + 상세 조회수 2개(`planViewTotal`, `marketItemViewTotal`). 환불/분쟁 건수·금액은 **seller_user_id가 아니라 수익 귀속(creator_user_id) 기준**으로 집계해 번들 큐레이터/원작자 불일치를 해소한다. 본인 콘텐츠 절대수치라 k-익명성 게이트 없음. 플랜 리뷰 지표는 포함하지 않는다(결정됨).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마켓 아이템 상세(F08-10)에서 크리에이터 정보 탭 ▶ `/market/creators/:creatorId`
- 마켓 메인 / 검색 결과의 크리에이터 카드 ▶ `/market/creators/:creatorId`
- 본인 통계: 플랜 목록(F08-01) 우측 상단 차트 아이콘 ▶ `/market/creators/me/stats`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `CreatorController`, `PlanController`, `CreatorProfileVo`, `CreatorStatsVo`, `CreatorService`. 앱: `creator_profile_screen.dart`, `creator_stats_screen.dart`, `creator_profile_vo.dart`.

<!-- source-references:start -->
서버 창구: `CreatorController#getCreatorProfile`, `CreatorController#getMyStats`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 공개 프로필
1. 진입 시: `creatorProfileNotifierProvider(creatorId)` ▶ `MarketRepository.getCreatorProfile(creatorId)` ▶ `GET /api/v1/creators/{creatorId}`
2. `_CreatorPlanList.initState` → `planRepositoryProvider.getPlans(creatorId, size:20)` ▶ `GET /api/v1/plans?creatorId=...`
   - **주의**: PlanController.listPlans는 status=PUBLISHED 필터링 (creatorId 옵션과 함께 PUBLISHED 한정)

### 내 통계
1. 진입 시: `myCreatorStatsNotifierProvider` ▶ `MarketRepository.getMyStats()` ▶ `GET /api/v1/creators/me/stats`

## 4. 제품 규칙

- 공개 프로필의 "판매 플랜"은 상태와 상관없이 그 사람의 플랜 수 전체(DELETED 포함)이고, "판매 실적"은 구매된 횟수다. 대표 플랜은 PUBLISHED 첫 20개다.
- 환불 건수와 금액은 REFUNDED 와 REFUNDED_BY_OPERATOR 를 더한다. 수익 상태가 되돌려져도 환불 금액은 변하지 않는다. 환불 보류 금액은 REFUND_HELD 합계로, 환불 신청 접수로 정산에서 보류된 수익이다.
- 전환율은 이벤트로 이어진 구매 수 / 플랜 구매 수이고 분모가 0 이면 0 이다. 클럽 수치는 ACTIVE 클럽 글만 합한다.
- 분쟁 패소는 OVERTURNED 건수이고 1건 이상이면 빨갛게 표시한다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Gap (설계 vs 배선) | `SecurityConfiguration.java:97` / `CreatorController.java:24` | **공개 프로필 설계 의도 vs 현재 보안 배선 불일치**: 컨트롤러는 principal 없이 optional 처리하나 전역 `anyRequest().authenticated()`에 의해 비인증 요청이 필터에서 차단됨(`/api/v1/creators/**` permitAll 미선언). 진짜 비로그인 공개가 의도면 SecurityConfiguration permitAll + 앱 publicRoutes 추가 필요. | SecurityConfiguration에 `/api/v1/creators/{creatorId}` GET permitAll 추가 |
| stale 정정 | `creator_stats_screen.dart:27` | 화면 타이틀 변경: "내 판매 현황" → "성과 / 통계" | 반영됨 |
| stale 정정 | `creator_stats_screen.dart:104` | SummaryCard 라벨 변경: "누적 판매 수익" → "누적 판매 금액" | 반영됨 |
| stale 정정 | `creator_stats_screen.dart:470` | HintCard 카피 변경: "리뷰 평점이 높을수록" → "전환율이 높을수록" | 반영됨 |
| stale 정정 | 기존 §1 | "통계=발행중 플랜수+누적매출" → AUTH-08로 17개 필드로 확장 | §1 정정 완료 |

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
