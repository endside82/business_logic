# F04-13. 기금 현황 & 거래 차트 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-13_fund-overview -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-13_fund-overview`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽 멤버에게 기금 잔액과 누적 기부/지출/환불 합계를 보여주는 단일 조회 API. 잔액은 `ClubFund` 엔티티에 누적된 값으로, 기부(`F04-14`)·인출(`F04-15`)·구독 결제(`F04-16`) 처리 시점에 비관적 락으로 갱신된다. 거래 차트/리스트는 클라이언트가 별도 도메인(거래 내역) 데이터로 조립하지만, 본 화면 진입의 핵심 백엔드 호출은 `GET /clubs/{id}/fund` 하나.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ "재정" 탭 (SCR-CF-001)
- 알림 (인출 완료/거절 등) 탭 ▶ 재정 탭

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-13_fund-overview/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-13_fund-overview/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-13_fund-overview/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-13_fund-overview/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:354` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **화면 진입**: `clubFundNotifierProvider(clubId)` ▶ `ClubFundRepository.getFund(clubId)` ▶ `GET /clubs/{clubId}/fund` ▶ `ClubFundVo`
2. **거래 차트/리스트** (조립):
   - `clubFundTransactionProvider(clubId, period)` (frontend-only 집계 provider)
   - 내부적으로 `GET /donations` (F04-14) + `GET /fund/withdrawals` (F04-15) 등을 모아 시계열 정렬
3. **권한 결정**: `clubDetailNotifierProvider(clubId)` ▶ `myRole == OWNER` 여부로 CTA 분기

## 4. 서버 계약

### 개요

클럽 멤버에게 기금 잔액과 누적 기부/지출/환불 합계를 보여주는 단일 조회 API. 잔액은 `ClubFund` 엔티티에 누적된 값으로, 기부(`F04-14`)·인출(`F04-15`)·구독 결제(`F04-16`) 처리 시점에 비관적 락으로 갱신된다. 거래 차트/리스트는 클라이언트가 별도 도메인(거래 내역) 데이터로 조립하지만, 본 화면 진입의 핵심 백엔드 호출은 `GET /clubs/{id}/fund` 하나.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/clubs/{id}/fund` | `ClubController#getFund` | required (멤버) | 기금 요약 조회 |

> 거래 추이/최근 거래 세부 내역은 본 Unit에 별도 엔드포인트가 **없다** (`(서버 미제공)`). 클라이언트 표시는 기부 내역(`F04-14 GET /donations`) + 인출 이력(`F04-15 GET /fund/withdrawals`) 등을 조합해 구성.

### 의존 단위 / 외부 시스템

- **Unit 04 자체**: `ClubAccessService`(멤버십 검증), `ClubFundQueryRepository.findByClubIdForUpdate`(다른 기능에서 비관적 락 사용).
- **다른 F-기능 위임**:
  - 거래 내역/차트는 화면에서 `F04-14 GET /donations`, `F04-15 GET /fund/withdrawals` 호출로 조립.
  - 회계 분개는 `AccountingLedgerService` (Unit 결제/지갑) 위임 — 본 Unit에서는 호출만.
- **외부 시스템**: 없음 (DB 조회만)

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ "재정" 탭 (SCR-CF-001)
- 알림 (인출 완료/거절 등) 탭 ▶ 재정 탭

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/clubs/:clubId/finance` | `finance/screens/club_fund_screen.dart` | 클럽 기금 현황 (SCR-CF-001) |
| `/clubs/:clubId/finance/policy` | `finance/screens/club_fund_policy_screen.dart` | 기금 정책/안내 (스펙 문서) |

라우트 상수: `Routes.clubFinance` (`...:64`), `clubFundPolicy` (`...:68`).

### 화면별 구성 요소 & 액션

### 클럽 기금 현황 (`club_fund_screen.dart`)
- **사용자가 보는 것** (SCR-CF-001):
  - 잔액 카드 (Primary 배경, `widgets/fund_balance_card.dart`):
    - "현재 기금 잔액" + "₩ {balance}" (H3, Bold, White)
    - "이번 달 수입 ₩{...}" / "이번 달 지출 ₩{...}" (서브 메트릭, **클라이언트 측 계산** — 서버는 totalDonated/Spent 누적값만 제공하므로 월별 분리는 거래 내역에서 클라이언트가 집계)
  - 기간 필터 SegmentedControl (1/3/6/12개월)
  - 입출금 BarChart (`fund_chart.dart`): 월별 입금(녹색) / 출금(빨강)
  - 최근 거래 리스트 (`transaction_card.dart`, 최대 5개): 거래 유형 아이콘, 설명, 금액, 일시
  - "전체 내역 보기 →" 링크
  - **권한별 CTA**:
    - OWNER: [기부 내역] (Outlined) + [인출 요청] (Primary)
    - 일반 MEMBER: [기부하기] (Primary, full-width)
- **사용자가 할 수 있는 액션**:
  - 기간 필터 변경 ▶ 차트 리렌더 (서버 재호출은 거래 내역만, 본 API는 동일)
  - 차트 바 탭 ▶ 해당 월 상세 툴팁
  - 거래 카드 탭 ▶ 거래 상세 (이 Unit에는 미제공, 클라이언트 조립)
  - "전체 내역 보기" ▶ 거래 내역 화면 (스펙 - 별도 Unit 또는 클라이언트 조립)
  - "기부 내역" (OWNER) ▶ `Routes.clubDonations`
  - "인출 요청" (OWNER) ▶ `Routes.clubWithdraw`
  - "기부하기" (MEMBER) ▶ `Routes.clubDonate`
- **상태 분기**:
  - 로딩: 잔액/차트 스켈레톤
  - 에러: `AppErrorState(title: '기금 정보를 불러올 수 없습니다', onRetry: ...)`
  - 빈 상태: 거래 0건 시 차트 영역에 "거래 내역이 없습니다"

### API 호출 순서 (Provider/Repository 관점)

1. **화면 진입**: `clubFundNotifierProvider(clubId)` ▶ `ClubFundRepository.getFund(clubId)` ▶ `GET /clubs/{clubId}/fund` ▶ `ClubFundVo`
2. **거래 차트/리스트** (조립):
   - `clubFundTransactionProvider(clubId, period)` (frontend-only 집계 provider)
   - 내부적으로 `GET /donations` (F04-14) + `GET /fund/withdrawals` (F04-15) 등을 모아 시계열 정렬
3. **권한 결정**: `clubDetailNotifierProvider(clubId)` ▶ `myRole == OWNER` 여부로 CTA 분기

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 일반 멤버가 기금 현황을 본다 (Happy Path) | 클럽 ACTIVE, 기금 잔액 1,250,000원, 누적 기부 2,000,000, 누적 지출 750,000. | 화면 표시, 서버 변경 없음. |
| S2 | OWNER가 기금 현황 화면에서 인출 진입 | 클럽 OWNER. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | ADMIN이 기금 현황 화면 진입 | ADMIN. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 기간 필터 변경 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 빈 상태 (거래 0건) | 신규 클럽, 기부/지출 0건. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 비멤버 접근 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 인출 후 잔액 갱신 확인 | OWNER가 F04-15에서 인출 100,000원 PENDING 등록. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 풀투리프레시 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | scenarios.md:62 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, 인라인 검증 포인트 모음) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:66 | ### S2 보강 — OWNER 진입 시 잔액 substring + 인출/후원 내역 진입 CTA surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 일반 멤버가 기금 현황을 본다 (Happy Path)**: Given 클럽 ACTIVE, 기금 잔액 1,250,000원, 누적 기부 2,000,000, 누적 지출 750,000. When 사용자가 해당 흐름을 실행하면 Then 화면 표시, 서버 변경 없음.
- **AC-02. OWNER가 기금 현황 화면에서 인출 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. ADMIN이 기금 현황 화면 진입**: Given ADMIN. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 기간 필터 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 빈 상태 (거래 0건)**: Given 신규 클럽, 기부/지출 0건. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 비멤버 접근**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 인출 후 잔액 갱신 확인**: Given OWNER가 F04-15에서 인출 100,000원 PENDING 등록. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
