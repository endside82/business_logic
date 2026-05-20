# F06-09. 수익 대시보드 조회 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-09_earnings-dashboard -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-09_earnings-dashboard`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트로 활동한 사용자의 누적 수익을 단일 응답 객체(`EarningsDashboardVo`)로 반환한다. 응답 구성: 총 수익 / 이번 달 수익 / 정산 대기 건수+금액 / 최근 5건 정산 요약 / 12개월 월별 수익 시리즈. 모든 집계는 `EarningsDashboardQueryRepository` (QueryDSL)에서 DB로 수행.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "수익" 바로가기
- 정산 완료/거절 알림 → 사용자가 흐름상 본 화면을 확인
- 호스트 활동 가이드/온보딩 카드의 "내 수익 보기" 액션

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-09_earnings-dashboard/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-09_earnings-dashboard/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-09_earnings-dashboard/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-09_earnings-dashboard/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:206` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 수익 대시보드 (`earnings_dashboard_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `수익 대시보드`
  - `EarningsSummaryCardWidget` — 이번 달 수익 카드 (.pen primary500, r=16, h=100)
  - `EarningsChartWidget` — `monthlyChart` 시리즈 기반 라인/바 차트 (white r=12 h=180)
  - 평균 객단가 박스 (#F0F0ED, r=12, p=16) — "평균 객단가 / ₩{totalEarnings}" + "지난달 대비 +12%" (현재 +12% 문자열은 프로토타입 상수, 추후 서버 보강 영역)
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

## 4. 서버 계약

### 개요

호스트로 활동한 사용자의 누적 수익을 단일 응답 객체(`EarningsDashboardVo`)로 반환한다. 응답 구성: 총 수익 / 이번 달 수익 / 정산 대기 건수+금액 / 최근 5건 정산 요약 / 12개월 월별 수익 시리즈. 모든 집계는 `EarningsDashboardQueryRepository` (QueryDSL)에서 DB로 수행.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/wallet/earnings/dashboard | WalletController#getEarningsDashboard | required | 호스트 수익 대시보드 단일 조회 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `SettlementStatus`: `PENDING`, `APPROVED`, `PAYING`, `PAID`, `FAILED`, `REJECTED` (응답 `recentSettlements[i].status`)
- 핵심 도메인 객체:
  - `Settlement` — 호스트 정산 행. `EarningsDashboardQueryRepository`가 sum/count 등 집계.
  - `CreatorEarning` — 정산 자료 보조 (본 응답에는 직접 노출되지 않으나 집계 원천)

### 의존 단위 / 외부 시스템

- 다른 Unit:
  - **F06-10 정산 조회**: 본 화면의 "전체보기" 액션이 정산 내역으로 연결. `recentSettlements`의 각 항목은 `Settlement.id` 기반.
  - **Event Unit (03)**: `eventId`가 응답에 들어 있어 클라가 이벤트 상세로 라우팅.
- 외부: 없음. 캐시 사용 명시 없음.

## 5. 프론트 계약

### 진입 경로

- 지갑 메인(F06-01) ▶ "수익" 바로가기
- 정산 완료/거절 알림 → 사용자가 흐름상 본 화면을 확인
- 호스트 활동 가이드/온보딩 카드의 "내 수익 보기" 액션

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/earnings` | `payment/screens/earnings_dashboard_screen.dart` | 총 수익 + 차트 + 평균 객단가 카드 + 최근 정산 리스트 |

### 화면별 구성 요소 & 액션

### 수익 대시보드 (`earnings_dashboard_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `수익 대시보드`
  - `EarningsSummaryCardWidget` — 이번 달 수익 카드 (.pen primary500, r=16, h=100)
  - `EarningsChartWidget` — `monthlyChart` 시리즈 기반 라인/바 차트 (white r=12 h=180)
  - 평균 객단가 박스 (#F0F0ED, r=12, p=16) — "평균 객단가 / ₩{totalEarnings}" + "지난달 대비 +12%" (현재 +12% 문자열은 프로토타입 상수, 추후 서버 보강 영역)
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

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 활동 중인 호스트가 누적 수익 확인 (Happy Path) | `Settlement` 행 다수, 일부 PAID | 사용자 인지 + 정산 상세나 이벤트 상세로 분기 |
| S2 | 처음 활동을 시작한 사용자 (빈 상태) | 호스트로 활동한 적 없는 사용자 | 빈 상태 + 활동 유도 |
| S3 | 정산 1건이 PAID로 막 전환 → 풀투리프레시 | 정산 PAYING → PAID 알림 받은 호스트 | 사용자가 정산 완료를 즉시 인지 |
| S4 | 차트의 특정 월 탭 → 상세 팝오버 | "지난 4월에 얼마나 벌었지?" 확인하려는 호스트 | 화면 변동 없이 인지 보강 |
| S5 | 최근 정산 항목 탭 → 이벤트 상세 | 정산 1건의 출처 확인 | 이벤트 상세 진입 |
| S6 | 전체 수익 내역 보기 → 정산 화면 이동 | 시나리오 본문 참조 | 정산 목록 화면으로 자연스러운 이동 |

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
| 후보 | frontend.md:23 | - 평균 객단가 박스 (#F0F0ED, r=12, p=16) — "평균 객단가 / ₩{totalEarnings}" + "지난달 대비 +12%" (현재 +12% 문자열은 프로토타입 상수, 추후 서버 보강 영역) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:49 | - **"지난달 대비 +12%"**: 현재 코드에 하드코딩된 상수 (UI/UX 20의 증감률 정책. 서버는 제공하지 않음 — 추후 서버 보강 영역) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:44 | **종료 상태**: 화면 변동 없이 인지 보강 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 활동 중인 호스트가 누적 수익 확인 (Happy Path)**: Given `Settlement` 행 다수, 일부 PAID When 사용자가 해당 흐름을 실행하면 Then 사용자 인지 + 정산 상세나 이벤트 상세로 분기
- **AC-02. 처음 활동을 시작한 사용자 (빈 상태)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 상태 + 활동 유도
- **AC-03. 정산 1건이 PAID로 막 전환 → 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 정산 완료를 즉시 인지
- **AC-04. 차트의 특정 월 탭 → 상세 팝오버**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 화면 변동 없이 인지 보강
- **AC-05. 최근 정산 항목 탭 → 이벤트 상세**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이벤트 상세 진입
- **AC-06. 전체 수익 내역 보기 → 정산 화면 이동**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정산 목록 화면으로 자연스러운 이동

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
