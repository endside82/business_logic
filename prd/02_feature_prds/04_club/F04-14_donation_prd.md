# F04-14. 기부하기 & 기부 내역 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

클럽 멤버가 자기 지갑 잔액을 차감해 클럽 기금에 기부한다. 기부는 ACTIVE 상태로 시작하고, 본인이 7일 이내 취소하면 클럽 기금에서 차감 후 지갑에 환불된다(REFUNDED). 클럽 폐쇄 시에는 LIFO 환불 알고리즘으로 별도 처리(`F04-03`). 회계 분개는 `AccountingLedgerService`에 위임.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ "재정" 탭 (SCR-CF-001) ▶ 일반 멤버 [기부하기] 또는 OWNER [기부 내역] → 기부 내역 화면 → [기부하기]
- 알림(자기 기부 영수증/취소 등 — 현재 미구현) 탭 ▶ 화면 진입

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `ClubDonationService`, `AccountingLedgerService`, `WalletService`, `WalletSpendService`, `ClubFundService`. 앱: `donation_screen.dart`, `donation_list_screen.dart`, `amount_input.dart`, `quick_amount_chips.dart`, `donation_confirm_dialog.dart`, `donation_summary_card.dart`, `donation_month_header.dart`, `donation_card.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#donate`, `ClubController#getDonations`, `ClubController#getDonationSummary`, `ClubController#cancelDonation`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **기부하기 화면 진입**: `donationFormProvider(clubId)` 초기화 + `walletBalanceProvider`(별 Unit)로 잔액 표시
2. **기부 제출**: `donationFormNotifier.submit()` ▶ `ClubDonationRepository.donate(clubId, DonationAddParam{amount, message})` ▶ `POST /donations` ▶ 성공 시 `invalidate(clubFundProvider, donationListProvider, walletBalanceProvider)` + pop + 토스트
3. **기부 내역 진입**: `donationListNotifierProvider(clubId)` ▶ `ClubDonationRepository.getDonations(clubId, page, size)` ▶ `GET /donations`
4. **요약 카드**: `donationSummaryProvider(clubId)` ▶ `GET /donations/summary`
5. **취소**: `cancelDonation(donationId)` ▶ `POST /donations/{donationId}/cancel` ▶ 응답으로 받은 REFUNDED VO를 리스트 in-place 갱신 + invalidate fund/wallet

## 4. 제품 규칙

- 무료 포인트로 기부하면 기금의 무료 몫으로 쌓여 인출할 수 없고, 유료분만 인출 대상이 된다. 취소·폐쇄 환불은 원결제의 유료·무료 몫대로 되돌린다.
- 폐쇄 때 유료분은 기간과 상관없이, 무료분은 기부한 지 7일 안의 것만 돌려준다. 통화마다 남은 기금까지 최근 기부부터 돌려주고 모자란 몫은 돌려주지 않으며, 그래도 폐쇄는 막히지 않는다.
- 금액: 서버 최소 100원, 화면 최소 1,000원·1회 최대 1,000,000원(최대는 화면만 막는다). 화면의 빠른 금액은 5,000~100,000원이다.
- 실결제가 닫혀 있는 동안 기부는 무료 포인트로만 나가고 화면 단위도 P 다. 열리면 유료분부터 쓴다.
- 잔액이 모자라면 금액을 잔액 이하로 줄이라고 안내한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 멤버가 기금에 기부한다 (Happy Path) | FREE 클럽 ACTIVE 멤버, 지갑 잔액 150,000원. | club_donation 1행(ACTIVE), club_fund 갱신, wallet 차감, 분개 기록. |
| S2 | 잔액 부족 | 잔액 30,000원, 50,000원 기부 시도. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | BUSINESS 클럽에 기부 시도 → 차단 | BUSINESS 클럽 멤버. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 비활성 클럽에 기부 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 7일 이내 본인 기부 취소 | S1 시나리오의 사용자, 다음 날 사정상 취소. | ClubDonation REFUNDED, 잔액 원복. |
| S6 | 7일 초과 후 취소 시도 | 기부 후 8일 경과. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 다른 사람 기부 취소 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 기금 잔액 부족 시 취소 (인출 PENDING로 인한 부족) | 기금 100,000 보유, OWNER가 인출 100,000 PENDING 등록 → effectiveBalance = 0 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 동시성 (두 명 동시에 기부) | 시나리오 본문 참조 | 둘 다 ACTIVE 기부 INSERT, balance 정확히 합산. |
| S10 | 비멤버가 기부 시도 | `screen.club.donation` 노출, 입력 필드 빈 상태. | 사용자가 검증 실패를 인지하고 금액을 수정해야 한다. 제출 버튼 비활성 상태(BottomCTA — S2와 동일 가드). |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 기부 알림 | 기부하면 기부한 사람에게 「기부 완료」, 클럽장에게 「클럽 기부」 알림이 가고, 7일 안에 본인이 취소하거나 운영자가 환불하면 두 사람에게 「기부 취소」 가 간다(결정 78-1, 2026-11-08 서버·앱). 알림을 누르면 그 클럽의 기부 내역으로 간다. 클럽장 본인의 기부·취소면 한 통이다 | 없음 |
| 해소됨 | 기부 메시지 | 서버가 기부 메시지(100자)를 저장해 기부 내역 카드, 앞의 두 기부 알림, 관리자 기부 목록에 보인다(결정 79-1, 2026-11-08). 회원이 쓴 글이라 내 정보 내보내기에 싣는다. 계정을 파기하면 기부 행의 메시지는 비우고(예약 파기 때), 클럽장 알림 글에 든 사본은 다른 알림 글처럼 두고 닉네임만 가린다 | 없음 |
| 해소됨 | 캐시 메모 | 캐시 적용 여부는 개발 메모라 제품 판정 대상이 아니다 | 없음 |
| 해소됨 | 기부 내역 일시 | 기부 내역의 기부 줄이 처음부터 월.일만 보였다. 결정 87-1(2026-11-08)로 명세(SCR-CF-002)대로 날짜와 시각(「2025.02.10 14:30」 꼴)을 보인다. 기금 현황의 최근 거래는 이미 그 꼴이었다 | 없음 |
| 해소됨 | 1회 기부 금액 | 한 번에 1,000원부터 1,000,000원까지다(결정 74-1, 최소는 명세대로). 서버가 벗어난 금액을 400 `INVALID_PAYMENT_AMOUNT` 로 거절하고 앱이 같은 범위를 안내한다(2026-11-08) | 없음 |
| 해소됨 | 시험 보강 기록 | 기부 화면 문구와 비회원 기부 진입(클럽 상세로 돌려보내고 가입 안내)의 시험 보강 기록이다. 결함이 아니다 | 없음 |

## 9. 수용 기준

- **AC-01. 멤버가 기금에 기부한다 (Happy Path)**: Given FREE 클럽 ACTIVE 멤버, 지갑 잔액 150,000원. When 사용자가 해당 흐름을 실행하면 Then club_donation 1행(ACTIVE), club_fund 갱신, wallet 차감, 분개 기록.
- **AC-02. 잔액 부족**: Given 잔액 30,000원, 50,000원 기부 시도. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. BUSINESS 클럽에 기부 시도 → 차단**: Given BUSINESS 클럽 멤버. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 비활성 클럽에 기부 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 7일 이내 본인 기부 취소**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then ClubDonation REFUNDED, 잔액 원복.
- **AC-06. 7일 초과 후 취소 시도**: Given 기부 후 8일 경과. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 다른 사람 기부 취소 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 기금 잔액 부족 시 취소 (인출 PENDING로 인한 부족)**: Given 기금 100,000 보유, OWNER가 인출 100,000 PENDING 등록 → effectiveBalance = 0 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 동시성 (두 명 동시에 기부)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 둘 다 ACTIVE 기부 INSERT, balance 정확히 합산.
- **AC-10. 비멤버가 기부 시도**: Given `screen.club.donation` 노출, 입력 필드 빈 상태. When 사용자가 해당 흐름을 실행하면 Then 사용자가 검증 실패를 인지하고 금액을 수정해야 한다. 제출 버튼 비활성 상태(BottomCTA — S2와 동일 가드).
