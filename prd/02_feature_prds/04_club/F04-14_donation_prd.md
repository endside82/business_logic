# F04-14. 기부하기 & 기부 내역 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-14_donation -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-14_donation`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽 멤버가 자기 지갑 잔액을 차감해 클럽 기금에 기부한다. 기부는 ACTIVE 상태로 시작하고, 본인이 7일 이내 취소하면 클럽 기금에서 차감 후 지갑에 환불된다(REFUNDED). 클럽 폐쇄 시에는 LIFO 환불 알고리즘으로 별도 처리(`F04-03`). 회계 분개는 `AccountingLedgerService`에 위임.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ "재정" 탭 (SCR-CF-001) ▶ 일반 멤버 [기부하기] 또는 OWNER [기부 내역] → 기부 내역 화면 → [기부하기]
- 알림(자기 기부 영수증/취소 등 — 현재 미구현) 탭 ▶ 화면 진입

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-14_donation/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-14_donation/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-14_donation/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-14_donation/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:320` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:329` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:336` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:344` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **기부하기 화면 진입**: `donationFormProvider(clubId)` 초기화 + `walletBalanceProvider`(별 Unit)로 잔액 표시
2. **기부 제출**: `donationFormNotifier.submit()` ▶ `ClubDonationRepository.donate(clubId, DonationAddParam{amount, message})` ▶ `POST /donations` ▶ 성공 시 `invalidate(clubFundProvider, donationListProvider, walletBalanceProvider)` + pop + 토스트
3. **기부 내역 진입**: `donationListNotifierProvider(clubId)` ▶ `ClubDonationRepository.getDonations(clubId, page, size)` ▶ `GET /donations`
4. **요약 카드**: `donationSummaryProvider(clubId)` ▶ `GET /donations/summary`
5. **취소**: `cancelDonation(donationId)` ▶ `POST /donations/{donationId}/cancel` ▶ 응답으로 받은 REFUNDED VO를 리스트 in-place 갱신 + invalidate fund/wallet

## 4. 서버 계약

### 개요

클럽 멤버가 자기 지갑 잔액을 차감해 클럽 기금에 기부한다. 기부는 ACTIVE 상태로 시작하고, 본인이 7일 이내 취소하면 클럽 기금에서 차감 후 지갑에 환불된다(REFUNDED). 클럽 폐쇄 시에는 LIFO 환불 알고리즘으로 별도 처리(`F04-03`). 회계 분개는 `AccountingLedgerService`에 위임.

> **결제·회계는 별 Unit 위임**: 지갑 차감/환불, AccountingLedger 분개는 모두 결제/지갑 Unit이 처리. 본 Unit은 `WalletService` / `AccountingLedgerService` 호출만 담당.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/clubs/{id}/donations` | `ClubController#donate` | 멤버 (FREE 클럽만) | 기부 |
| GET | `/api/v1/clubs/{id}/donations` | `ClubController#getDonations` | 멤버 | 기부 목록 (Page) |
| GET | `/api/v1/clubs/{id}/donations/summary` | `ClubController#getDonationSummary` | 멤버 | 합계 / 기부자 수 / 건수 |
| POST | `/api/v1/clubs/{id}/donations/{donationId}/cancel` | `ClubController#cancelDonation` | 본인만 | 7일 이내 본인 기부 취소 |

### 의존 단위 / 외부 시스템

- **Unit 결제/지갑 (별 Unit)**:
  - `WalletService.deductFromWallet`, `WalletService.refundToWallet` — 지갑 트랜잭션 처리
  - `AccountingLedgerService.recordDonation`, `recordDonationRefund` — 복식부기 분개 (`DR CLUB_FUND / CR USER_WALLET`)
  - `PointTransaction` (별 Unit Entity) — 거래 이력
- **Unit 04 자체**: `ClubFundService.addToFund / deductFromFund`, `ClubFundQueryRepository.findByClubIdForUpdate` (비관적 락).
- **F04-15 인출과의 동시성**: 취소 시 PENDING 인출 합계를 effectiveBalance에서 차감해 음수 잔액 방지.
- **외부 시스템**: 없음 (PG 직접 호출 없음 — 지갑 잔액 결제만)

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ "재정" 탭 (SCR-CF-001) ▶ 일반 멤버 [기부하기] 또는 OWNER [기부 내역] → 기부 내역 화면 → [기부하기]
- 알림(자기 기부 영수증/취소 등 — 현재 미구현) 탭 ▶ 화면 진입

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/club/finance/...) | 역할 |
|---|---|---|
| `/clubs/:clubId/finance/donate` | `screens/donation_screen.dart` | 기부하기 (SCR-CF-003) |
| `/clubs/:clubId/finance/donations` | `screens/donation_list_screen.dart` | 기부 내역 (SCR-CF-002) |

라우트 상수: `Routes.clubDonate`(`...:66`), `clubDonations`(`...:65`).

### 화면별 구성 요소 & 액션

### 기부하기 (`donation_screen.dart`)
- **사용자가 보는 것** (SCR-CF-003):
  - 헤더 "{클럽명}에 기부"
  - 내 지갑 잔액 카드 (`finance/widgets/...` — Wallet Unit에서 fetch한 잔액 표시)
  - 금액 입력 (`amount_input.dart`): 숫자, "₩" prefix
  - 빠른 금액 칩 (`quick_amount_chips.dart`): 5,000 / 10,000 / 30,000 / 50,000 / 100,000
  - 메시지 입력 (선택, 100자) — **참고: 서버는 message 필드를 저장하지 않음. UI 표시는 가능하나 영구화되지 않음.** `(서버 미반영)`
  - 결제 요약 (실시간): 기부 금액 / 기부 후 잔액
  - BottomCTA "기부하기"
- **사용자가 할 수 있는 액션**:
  - 칩 탭 ▶ 금액 자동 입력
  - 직접 입력 ▶ 잔액 초과 시 BottomCTA 비활성, "잔액이 부족합니다" 표시
  - "기부하기" 탭 ▶ `donation_confirm_dialog.dart` 표시
  - "확인" ▶ `POST /clubs/{clubId}/donations` (`{amount, message}`)
  - 성공 → "기부 완료! 감사합니다" 토스트 → pop → 기부 내역(또는 기금 현황) invalidate
- **유효성 (스펙 + 서버)**:
  - 빈 값: "금액을 입력해 주세요"
  - 서버 `@Min(100)`이지만 UI는 1,000원 이상 (스펙)
  - 잔액 초과: 클라이언트 가드 (`AppErrorState` 또는 disable)
  - 1회 1,000,000원 이하 (스펙) — 서버 검증 없음, 클라이언트 가드
- **에러 핸들링**:
  - `INSUFFICIENT_BALANCE` → 다이얼로그 "잔액이 부족합니다" + "충전하기" 버튼 → `Routes.walletCharge`
  - `CLUB_DONATION_NOT_ALLOWED` (BUSINESS) → "이 클럽은 기부를 받지 않습니다"
  - `CLUB_INACTIVE` → "비활성 클럽은 기부할 수 없습니다"

### 기부 내역 (`donation_list_screen.dart`)
- **사용자가 보는 것** (SCR-CF-002):
  - 요약 카드 (`donation_summary_card.dart`): 총 기부 금액(H3), 기부자 N명·총 M건
  - 월별 섹션 헤더 (`donation_month_header.dart`, sticky scroll)
  - 기부 카드 (`donation_card.dart`): 기부자 닉네임, 금액(우정렬, Primary, Bold), 일시
  - 무한 스크롤
  - 하단 BottomCTA [기부하기]
- **액션**:
  - "기부하기" → 기부 화면
  - 본인 카드 롱프레스 → "취소" (스펙 — UI 위치는 클라이언트 결정. 7일 이내 / ACTIVE만)
  - 카드 탭 ▶ 별 동작 없음 (또는 사용자 프로필) — 클라이언트 결정
- **상태 분기**:
  - 빈 상태: "아직 기부 내역이 없습니다"
  - 로딩: 카드 스켈레톤
  - 에러: `AppErrorState`

### API 호출 순서 (Provider/Repository 관점)

1. **기부하기 화면 진입**: `donationFormProvider(clubId)` 초기화 + `walletBalanceProvider`(별 Unit)로 잔액 표시
2. **기부 제출**: `donationFormNotifier.submit()` ▶ `ClubDonationRepository.donate(clubId, DonationAddParam{amount, message})` ▶ `POST /donations` ▶ 성공 시 `invalidate(clubFundProvider, donationListProvider, walletBalanceProvider)` + pop + 토스트
3. **기부 내역 진입**: `donationListNotifierProvider(clubId)` ▶ `ClubDonationRepository.getDonations(clubId, page, size)` ▶ `GET /donations`
4. **요약 카드**: `donationSummaryProvider(clubId)` ▶ `GET /donations/summary`
5. **취소**: `cancelDonation(donationId)` ▶ `POST /donations/{donationId}/cancel` ▶ 응답으로 받은 REFUNDED VO를 리스트 in-place 갱신 + invalidate fund/wallet

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
| 후보 | backend.md:45 | - **사이드 이펙트**: 결제 Unit의 트랜잭션 처리; 알림 발송은 현재 코드에 미구현 (스펙 명시 없음). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:64 | - **캐시**: 서비스에서 `@CacheEvict` 사용; 명시적 `@Cacheable`은 `(미확인)`이지만 `clubDonationSummary` 영역 사용 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:6 | - 알림(자기 기부 영수증/취소 등 — 현재 미구현) 탭 ▶ 화면 진입 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:38 | - 1회 1,000,000원 이하 (스펙) — 서버 검증 없음, 클라이언트 가드 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:97 | ### S1 보강 — 기부 화면 라벨 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:109 | ### S10 보강 — 비멤버 기부 라우트 진입 → 클럽 detail로 redirect + 가입 안내 카피 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
