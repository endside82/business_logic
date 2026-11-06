# F04-15. 기금 인출 요청 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

OWNER만 클럽 기금을 등록한 정산 계좌로 인출 신청할 수 있다. 인출 시 **수수료 5%** + **원천징수 3.3%**를 차감하고, 관리자 승인 뒤 신청 때 복사해 둔 계좌로 net 금액을 보낸다. 회계는 4중 분개로 기록(`AccountingLedgerService`). 멤버 가입비 환불 가능 잔액·기부 취소 가능 잔액·플랫폼 미수금까지 차감해 가용 잔액(`availableBalance`)을 산출한다. 월 1회 제한.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ 재정 탭 (SCR-CF-001) ▶ OWNER에게만 노출되는 [인출 요청] 버튼

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `AccountingLedgerService`, `WalletService`, `NotificationService`. 앱: `withdrawal_screen.dart`, `fee_breakdown_card.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#requestWithdrawal`, `ClubController#getWithdrawalHistory`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 인출은 유료 잔액에서만 나가고 무료 기금은 현금이 되지 않는다. 수수료와 원천징수도 유료분에만 붙는다. 폐쇄 때도 무료 기금은 현금이 되지 않는다.
- 계산: 수수료는 금액의 5%, 원천징수는 수수료를 뺀 금액의 3.3%, 나머지가 실수령액이다.
- 받는 곳은 클럽장이 등록한 정산 계좌다. 기본 계좌를 자동으로 고르고, 계좌가 없으면 제출할 수 없다. 신청 때 출금 요청에 복사한 계좌로 보낸다.
- 미수금과 상계한 몫은 클럽장에게 지급한 돈이 아니라 플랫폼 미수금을 갚은 돈으로 기록한다.

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
| S8 | 동시성 (OWNER가 인출 신청과 동시에 다른 멤버가 기부 취소) | `screen.club.finance` 노출, `'인출 신청'` 버튼 정확히 1회 노출. | 사용자는 금액, 사유, 등록한 정산 계좌(기본 계좌 자동 선택)로 인출 신청을 제출한다. 계좌가 없으면 제출할 수 없다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:29 | - `reason: String?` — UI는 10~200자 권장 (서버 검증 없음 — `(서버 미검증, 클라이언트 가드)`) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. OWNER가 100,000원 인출 신청 (Happy Path)**: Given 기금 잔액 1,250,000, PENDING 인출 0, 환불 예비금 0, outstandingDebt 0. 이번 달 인출 이력 없음. When 사용자가 해당 흐름을 실행하면 Then club_fund_withdrawal 1행 PENDING. ClubFund.balance는 아직 차감 안 됨(승인 시점에 차감).
- **AC-02. OWNER 아닌 사용자가 시도 → 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 가용 잔액 부족 (PENDING 인출 + 환불 예비금 차감 후)**: Given balance 100,000, PENDING 인출 50,000, 7일 이내 ACTIVE 기부 60,000(환불 가능) → effective = 100k - 50k - 60k = -10k → max(0) = 0 When 사용자가 해당 흐름을 실행하면 Then 변경 없음.
- **AC-04. 월 1회 제한**: Given 이번 달 이미 PENDING 인출 1건 존재. When 사용자가 해당 흐름을 실행하면 Then 변경 없음. (기존 PENDING이 REJECTED되면 그 달에 재신청 가능)
- **AC-05. 최소 금액 미달**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 관리자 승인 → OWNER 지갑 입금**: Given PENDING 인출 100,000 (S1 결과). When 사용자가 해당 흐름을 실행하면 Then ClubFund.balance -= 100,000, OWNER wallet += 91,865, 분개 4중 기록.
- **AC-07. 관리자 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then status=REJECTED.
- **AC-08. 동시성 (OWNER가 인출 신청과 동시에 다른 멤버가 기부 취소)**: Given `screen.club.finance` 노출, `'인출 신청'` 버튼 정확히 1회 노출. When 사용자가 해당 흐름을 실행하면 Then 사용자는 금액, 사유, 등록한 정산 계좌(기본 계좌 자동 선택)로 인출 신청을 제출한다. 계좌가 없으면 제출할 수 없다.
