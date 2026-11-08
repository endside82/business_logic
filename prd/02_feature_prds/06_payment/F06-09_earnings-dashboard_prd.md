# F06-09. 수익 대시보드 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트로 활동한 사용자의 누적 수익을 단일 응답 객체(`EarningsDashboardVo`)로 반환한다. 응답 구성: 총 수익 / 이번 달 수익 / 정산 대기 건수+금액 / 최근 5건 정산 요약 / 12개월 월별 수익 시리즈. 모든 집계는 `EarningsDashboardQueryRepository` (QueryDSL)에서 DB로 수행.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "수익" 바로가기
- 정산 완료/거절 알림 → 사용자가 흐름상 본 화면을 확인
- 호스트 활동 가이드/온보딩 카드의 "내 수익 보기" 액션

## 2. 코드 위치

계약의 정본은 코드다. 서버: `WalletController`. 앱: `earnings_dashboard_screen.dart`.

<!-- source-references:start -->
서버 창구: `WalletController#getEarningsDashboard`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 수익 대시보드 (`earnings_dashboard_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `수익 대시보드`
  - `EarningsSummaryCardWidget` — 이번 달 수익 카드 (.pen primary500, r=16, h=100)
  - `EarningsChartWidget` — `monthlyChart` 시리즈 기반 라인/바 차트 (white r=12 h=180)
  - 요약 카드: 누적 실수령액과 누적 수익. 지난달 대비 증감 표시는 없다
  - `EarningsEventListWidget` — `recentSettlements` 리스트 (이벤트별 행, 상단 "전체 수익 내역 보기 →" 액션)
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `ref.refresh(earningsDashboardNotifierProvider.future)` ▶ `GET /api/v1/wallet/earnings/dashboard`
  - 차트 바/포인트 탭 ▶ 해당 일자/월 상세 팝오버 (UI 위젯 책임)
  - "전체 수익 내역 보기 →" 탭 ▶ `/profile/wallet/settlements` (F06-10)
  - 정산 항목 탭 ▶ `eventId`로 `/home/events/${eventId}` (UI/UX 20)
  - 빈 상태 CTA "이벤트를 만들어보세요" ▶ 이벤트 생성 화면(Unit 03)
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.detail)`
  - 에러: `AppErrorState(title: '수익 정보를 불러올 수 없습니다', onRetry: ...)`
  - 빈 상태: `dashboard.totalEarnings == 0 && dashboard.recentSettlements.isEmpty` ▶ `AppEmptyState(icon: Icons.account_balance_wallet_outlined, title: '아직 수익이 없습니다', description: '이벤트를 주최하면 수익이 여기에 표시됩니다')`
- **모달/시트/네비게이션**: 차트 일자별 상세는 위젯 내부 팝오버 또는 BottomSheet (위젯 구현 책임)

## 4. 제품 규칙

- 총 수익, 이번 달 수익, 월별 수익은 PAID 정산의 실수령액 합계다. 월별은 이번 달을 포함한 12개월이다.
- 정산 대기 건수와 금액은 PENDING 과 APPROVED 를 합한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 활동 중인 호스트가 누적 수익 확인 (Happy Path) | `Settlement` 행 다수, 일부 PAID | 사용자 인지 + 정산 상세나 이벤트 상세로 분기 |
| S2 | 처음 활동을 시작한 사용자 (빈 상태) | 호스트로 활동한 적 없는 사용자 | 빈 상태 + 활동 유도 |
| S3 | 정산 1건이 PAID로 막 전환 → 풀투리프레시 | 정산 PAYING → PAID 알림 받은 호스트 | 사용자가 정산 완료를 즉시 인지 |
| S4 | 차트의 특정 월 탭 → 상세 팝오버 | "지난 4월에 얼마나 벌었지?" 확인하려는 호스트 | 화면 변동 없이 인지 보강 |
| S5 | 최근 정산 항목 탭 → 이벤트 상세 | 정산 1건의 출처 확인 | 이벤트 상세 진입 |
| S6 | 전체 수익 내역 보기 → 정산 화면 이동 | 시나리오 본문 참조 | 정산 목록 화면으로 자연스러운 이동 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 지난달 대비 | 수익 화면 요약 카드는 누적 실수령액과 누적 수익을 보인다. 지난달 대비 증감 표시는 없다 | 없음 |
| 해소됨 | 시나리오 조각 | 시나리오 종료 상태 문장 조각이라 판정할 내용이 없다 | 없음 |

## 9. 수용 기준

- **AC-01. 활동 중인 호스트가 누적 수익 확인 (Happy Path)**: Given `Settlement` 행 다수, 일부 PAID When 사용자가 해당 흐름을 실행하면 Then 사용자 인지 + 정산 상세나 이벤트 상세로 분기
- **AC-02. 처음 활동을 시작한 사용자 (빈 상태)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 상태 + 활동 유도
- **AC-03. 정산 1건이 PAID로 막 전환 → 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 정산 완료를 즉시 인지
- **AC-04. 차트의 특정 월 탭 → 상세 팝오버**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 화면 변동 없이 인지 보강
- **AC-05. 최근 정산 항목 탭 → 이벤트 상세**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이벤트 상세 진입
- **AC-06. 전체 수익 내역 보기 → 정산 화면 이동**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정산 목록 화면으로 자연스러운 이동
