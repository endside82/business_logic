# F04-13. 기금 현황 & 거래 차트 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

클럽 멤버에게 기금 잔액과 누적 기부/지출/환불 합계를 보여주는 단일 조회 API. 잔액은 `ClubFund` 엔티티에 누적된 값으로, 기부(`F04-14`)·인출(`F04-15`)·구독 결제(`F04-16`) 처리 시점에 비관적 락으로 갱신된다. 거래 차트/리스트는 클라이언트가 별도 도메인(거래 내역) 데이터로 조립하지만, 본 화면 진입의 핵심 백엔드 호출은 `GET /clubs/{id}/fund` 하나.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ "재정" 탭 (SCR-CF-001)
- 알림 (인출 완료/거절 등) 탭 ▶ 재정 탭

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `ClubAccessService`, `AccountingLedgerService`. 앱: `club_fund_screen.dart`, `club_fund_policy_screen.dart`, `fund_balance_card.dart`, `fund_chart.dart`, `transaction_card.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#getFund`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **화면 진입**: `clubFundNotifierProvider(clubId)` ▶ `ClubFundRepository.getFund(clubId)` ▶ `GET /clubs/{clubId}/fund` ▶ `ClubFundVo`
2. **거래 차트/리스트** (조립):
   - `clubFundTransactionProvider(clubId, period)` (frontend-only 집계 provider)
   - 내부적으로 `GET /donations` (F04-14) + `GET /fund/withdrawals` (F04-15) 등을 모아 시계열 정렬
3. **권한 결정**: `clubDetailNotifierProvider(clubId)` ▶ `myRole == OWNER` 여부로 CTA 분기

## 4. 제품 규칙

- 잔액은 유료(현금 인출 가능)와 무료(클럽 안에서 운영비로만 사용, 인출 불가)로 나눠 내려온다. 합쳐 보이면 인출 가능액을 오인한다.
- 서버는 누적 합계만 준다. 이번 달 수입·지출은 앱이 거래 내역에서 계산한다.
- 버튼은 역할로 갈린다. OWNER 는 기부 내역과 인출 요청, 일반 멤버는 기부하기다.

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
