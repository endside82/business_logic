# F04-15. 기금 인출 요청 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-15_fund-withdrawal -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-15_fund-withdrawal`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

OWNER만 클럽 기금을 외부(지갑) 계좌로 인출 신청할 수 있다. 인출 시 **수수료 5%** + **원천징수 3.3%**를 차감하고, 관리자 승인 후 OWNER 지갑에 net 입금된다. 회계는 4중 분개로 기록(`AccountingLedgerService`). 멤버 가입비 환불 가능 잔액·기부 취소 가능 잔액·플랫폼 미수금까지 차감해 가용 잔액(`availableBalance`)을 산출한다. 월 1회 제한.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ 재정 탭 (SCR-CF-001) ▶ OWNER에게만 노출되는 [인출 요청] 버튼

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-15_fund-withdrawal/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-15_fund-withdrawal/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-15_fund-withdrawal/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-15_fund-withdrawal/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:363` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:372` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **화면 진입**: `clubFundProvider(clubId)` ▶ `GET /fund` (잔액 표시) — F04-13과 동일 provider 재사용
2. **권한 가드**: `clubDetailNotifierProvider(clubId).myRole == 'OWNER'` 아니면 화면 진입 차단(라우터 redirect 또는 Forbidden 페이지)
3. **제출**: `withdrawalFormNotifier.submit()` ▶ `ClubFundRepository.requestWithdrawal(clubId, WithdrawalParam{amount, reason, bankCode, accountNumber, accountHolder})` ▶ `POST /fund/withdraw`
4. **성공 시 invalidate**: `clubFundProvider`, 인출 이력 provider (있다면)
5. **에러 매핑**:
   - `CLUB_NOT_OWNER` → "클럽 소유자만 인출을 요청할 수 있습니다"
   - `INVALID_PAYMENT_AMOUNT` → "최소 인출 금액은 10,000원입니다"
   - `INSUFFICIENT_BALANCE` (PaymentFailureVo) → 다이얼로그 "가용 잔액이 부족합니다 / 부족액 ₩{...}"
   - `DUPLICATE_TRANSACTION` → "이미 이번 달 인출 요청이 있습니다"
   - `CLUB_FUND_NOT_FOUND` → "기금 정보가 없습니다"

## 4. 서버 계약

### 개요

OWNER만 클럽 기금을 외부(지갑) 계좌로 인출 신청할 수 있다. 인출 시 **수수료 5%** + **원천징수 3.3%**를 차감하고, 관리자 승인 후 OWNER 지갑에 net 입금된다. 회계는 4중 분개로 기록(`AccountingLedgerService`). 멤버 가입비 환불 가능 잔액·기부 취소 가능 잔액·플랫폼 미수금까지 차감해 가용 잔액(`availableBalance`)을 산출한다. 월 1회 제한.

> **승인/거절은 관리자 API(별 Unit)에서 처리**. 본 Unit은 OWNER가 호출하는 인출 신청 + 이력 조회만.

> **인출 paid-only** (2026-05-24 포인트 분리정산 반영): 기금 인출은 **유료(paid) 잔액만** 현금화 대상이다. 가용 잔액(`availableBalance`) = paid 잔액 − 예비금/미수금(멤버 가입비 환불 가능액 + 기부 취소 가능액 + 플랫폼 미수금)이며, **무료(free) 기금은 인출 불가**다. 수수료(5%)·원천징수(3.3%)는 유료(현금)분에만 부과한다. 클럽 폐쇄 인출(`F04-03`)도 유료만 현금화하고 무료 기금은 소멸한다. 정본은 정책 PRD `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/clubs/{id}/fund/withdraw` | `ClubController#requestWithdrawal` | OWNER | 인출 신청 (PENDING) |
| GET | `/api/v1/clubs/{id}/fund/withdrawals` | `ClubController#getWithdrawalHistory` | 멤버 | 인출 이력 (Page) |

### 의존 단위 / 외부 시스템

- **Unit 결제/지갑 (별 Unit)**:
  - `WalletService.creditToWallet` (승인 시 OWNER 지갑 입금)
  - `AccountingLedgerService.recordClubFundWithdrawal` (4중 분개)
  - `PaymentFailureVo` — 부족액 페이로드
- **F04-13/14**: ClubFund 잔액 / 미수금 / 환불 예비금 계산을 함께 사용.
- **F04-04/05 (멤버 가입비)**: `clubMemberQueryRepository.sumRefundableMemberFees(clubId, cutoff)` — 7일 이내 멤버 가입비 합계.
- **알림**: 승인/거절 시 `NotificationService.createNotification(WITHDRAWAL_PAID|WITHDRAWAL_REJECTED)`.
- **외부**: 현재는 OWNER 지갑(가상 계좌) 입금만 지원. 실 은행 송금은 미연동 (`bankCode/accountNumber`는 Param에 받지만 사용 안 됨). `(서버 미연동)`

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ 재정 탭 (SCR-CF-001) ▶ OWNER에게만 노출되는 [인출 요청] 버튼

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/club/finance/...) | 역할 |
|---|---|---|
| `/clubs/:clubId/finance/withdraw` | `screens/withdrawal_screen.dart` | 인출 요청 (SCR-CF-004) |

라우트 상수: `Routes.clubWithdraw`(`...:67`).

> 인출 이력 전용 화면은 본 Flutter 코드에 별도 라우트가 없음 — 기금 현황 화면의 거래 카드/전체 내역에서 통합 표시(F04-13 클라이언트 조립).

### 화면별 구성 요소 & 액션

### 인출 요청 (`withdrawal_screen.dart`)
- **사용자가 보는 것** (SCR-CF-004):
  - 헤더 "기금 인출 요청"
  - 현재 기금 잔액 카드 (Light bg)
  - 인출 금액 입력 (숫자, "₩" prefix)
  - 수수료 안내 카드 (`finance/widgets/fee_breakdown_card.dart`, Warning bg #FFF3E0):
    - 인출 금액 ₩{gross}
    - 수수료(5%) -₩{fee} (Red)
    - 원천징수(3.3%) -₩{tax} (Red)
    - ─────
    - 실수령액 ₩{net} (Bold)
  - 인출 사유 TextArea (3줄, **클라이언트 가드 10~200자**)
  - 입금 계좌 입력 영역: 은행 Dropdown / 계좌번호 / 예금주명
    - **현재 서버는 실제 은행 송금 미연동**. UI는 받지만 결과적으로 OWNER 지갑(WALLET)으로 입금됨. 안내 문구 노출 권장: "현재는 본인 지갑으로 입금됩니다" (UI 가드)
  - BottomCTA "인출 요청하기"
- **사용자가 할 수 있는 액션**:
  - 금액 입력 시 수수료 안내 카드 실시간 갱신 (클라이언트 계산: gross × 5% / (gross - fee) × 3.3%)
  - "인출 요청하기" → 확인 다이얼로그 (금액/수수료/실수령액/입금 계좌/인출 후 잔액)
  - "확인" → `POST /clubs/{clubId}/fund/withdraw`
  - 성공 → "인출 요청 완료" 토스트 → pop → 기금 현황 invalidate
- **유효성 (스펙)**:
  - 인출 금액 빈 값 → "인출 금액을 입력해 주세요"
  - < 10,000 → "최소 인출 금액은 10,000원입니다"
  - > 가용 잔액 → "기금 잔액을 초과할 수 없습니다"
  - 사유 빈 값 → "인출 사유를 입력해 주세요"
  - 사유 < 10자 → "인출 사유는 10자 이상이어야 합니다"
  - 은행/계좌번호/예금주명 미입력 시 안내 (서버 미사용이지만 UI는 요구)

### API 호출 순서 (Provider/Repository 관점)

1. **화면 진입**: `clubFundProvider(clubId)` ▶ `GET /fund` (잔액 표시) — F04-13과 동일 provider 재사용
2. **권한 가드**: `clubDetailNotifierProvider(clubId).myRole == 'OWNER'` 아니면 화면 진입 차단(라우터 redirect 또는 Forbidden 페이지)
3. **제출**: `withdrawalFormNotifier.submit()` ▶ `ClubFundRepository.requestWithdrawal(clubId, WithdrawalParam{amount, reason, bankCode, accountNumber, accountHolder})` ▶ `POST /fund/withdraw`
4. **성공 시 invalidate**: `clubFundProvider`, 인출 이력 provider (있다면)
5. **에러 매핑**:
   - `CLUB_NOT_OWNER` → "클럽 소유자만 인출을 요청할 수 있습니다"
   - `INVALID_PAYMENT_AMOUNT` → "최소 인출 금액은 10,000원입니다"
   - `INSUFFICIENT_BALANCE` (PaymentFailureVo) → 다이얼로그 "가용 잔액이 부족합니다 / 부족액 ₩{...}"
   - `DUPLICATE_TRANSACTION` → "이미 이번 달 인출 요청이 있습니다"
   - `CLUB_FUND_NOT_FOUND` → "기금 정보가 없습니다"

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | OWNER가 100,000원 인출 신청 (Happy Path) | 기금 잔액 1,250,000, PENDING 인출 0, 환불 예비금 0, outstandingDebt 0. 이번 달 인출 이력 없음. | club_fund_withdrawal 1행 PENDING. ClubFund.balance는 아직 차감 안 됨(승인 시점에 차감). |
| S2 | OWNER 아닌 사용자가 시도 → 차단 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 가용 잔액 부족 (PENDING 인출 + 환불 예비금 차감 후) | balance 100,000, PENDING 인출 50,000, 7일 이내 ACTIVE 기부 60,000(환불 가능) → effective = 100k - 50k - 60k = -10k → max(0) = 0 | 변경 없음. |
| S4 | 월 1회 제한 | 이번 달 이미 PENDING 인출 1건 존재. | 변경 없음. (기존 PENDING이 REJECTED되면 그 달에 재신청 가능) |
| S5 | 최소 금액 미달 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 관리자 승인 → OWNER 지갑 입금 | PENDING 인출 100,000 (S1 결과). | ClubFund.balance -= 100,000, OWNER wallet += 91,865, 분개 4중 기록. |
| S7 | 관리자 거절 | 시나리오 본문 참조 | status=REJECTED. |
| S8 | 동시성 (OWNER가 인출 신청과 동시에 다른 멤버가 기부 취소) | `screen.club.finance` 노출, `'인출 신청'` 버튼 정확히 1회 노출. | 사용자는 금액과 사유만 입력하면 인출 신청을 제출할 수 있다(은행 정보 입력 없음). 서버는 `bankCode="WALLET"`, `accountNumber="WALLET"`, `accountHolder="지갑"`로 고정 INSERT (S1 시퀀스 8번과 일관). |

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
| 후보 | backend.md:29 | - `reason: String?` — UI는 10~200자 권장 (서버 검증 없음 — `(서버 미검증, 클라이언트 가드)`) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:32 | - **현재 서버는 실제 은행 송금 미연동**. UI는 받지만 결과적으로 OWNER 지갑(WALLET)으로 입금됨. 안내 문구 노출 권장: "현재는 본인 지갑으로 입금됩니다" (UI 가드) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 해소 (2026-06-06) | ClubSettlementService.java:160-182, ClubFundService.java:176, AccountingLedgerService.java (커밋 80641c7) | **미수금 상계 장부(H6) + 기금 drain 장부 대칭(H5) 해소** — 클럽 인출 정산 시 미수금 상계분(`settleOutstandingDebt`)을 Owner 지급이 아닌 `PLATFORM_RECEIVABLE` 소거로 분개해 미소거·netAmount 오기록 해소. 폐쇄 drain은 잔여 forfeit만 분개(상세 F04-14 §8). 원천세 분개: 클럽 은행출금 tax 슬라이스를 `CREATOR_SETTLEMENT` 차변+`PLATFORM_CASH`/`WITHHOLDING_TAX_PAYABLE` 정방향으로 기록(일일 출금 대사 오탐 제거). | 없음 |

## 9. 수용 기준

- **AC-01. OWNER가 100,000원 인출 신청 (Happy Path)**: Given 기금 잔액 1,250,000, PENDING 인출 0, 환불 예비금 0, outstandingDebt 0. 이번 달 인출 이력 없음. When 사용자가 해당 흐름을 실행하면 Then club_fund_withdrawal 1행 PENDING. ClubFund.balance는 아직 차감 안 됨(승인 시점에 차감).
- **AC-02. OWNER 아닌 사용자가 시도 → 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 가용 잔액 부족 (PENDING 인출 + 환불 예비금 차감 후)**: Given balance 100,000, PENDING 인출 50,000, 7일 이내 ACTIVE 기부 60,000(환불 가능) → effective = 100k - 50k - 60k = -10k → max(0) = 0 When 사용자가 해당 흐름을 실행하면 Then 변경 없음.
- **AC-04. 월 1회 제한**: Given 이번 달 이미 PENDING 인출 1건 존재. When 사용자가 해당 흐름을 실행하면 Then 변경 없음. (기존 PENDING이 REJECTED되면 그 달에 재신청 가능)
- **AC-05. 최소 금액 미달**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 관리자 승인 → OWNER 지갑 입금**: Given PENDING 인출 100,000 (S1 결과). When 사용자가 해당 흐름을 실행하면 Then ClubFund.balance -= 100,000, OWNER wallet += 91,865, 분개 4중 기록.
- **AC-07. 관리자 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then status=REJECTED.
- **AC-08. 동시성 (OWNER가 인출 신청과 동시에 다른 멤버가 기부 취소)**: Given `screen.club.finance` 노출, `'인출 신청'` 버튼 정확히 1회 노출. When 사용자가 해당 흐름을 실행하면 Then 사용자는 금액과 사유만 입력하면 인출 신청을 제출할 수 있다(은행 정보 입력 없음). 서버는 `bankCode="WALLET"`, `accountNumber="WALLET"`, `accountHolder="지갑"`로 고정 INSERT (S1 시퀀스 8번과 일관).

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
