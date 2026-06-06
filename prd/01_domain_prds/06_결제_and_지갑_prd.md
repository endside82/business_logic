# 06. 결제 & 지갑 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-22; unit: business_logic/units/06_payment -->

> 문서 상태: **도메인 전환본 + W2 신규 결제 경로 통합 (2026-05-22)**. 이 문서는 `business_logic/units/06_payment/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.
>
> 2026-05-22 변경 이력:
> - **F06-06 갱신** — 신규 결제 경로 `WalletService.payForApplication`(referenceType=`EVENT_PREPAYMENT`) 추가. 기존 `WalletService.pay`(referenceType=`EVENT_PAYMENT`)는 변경 없음 (D8). 신규 `TransactionType.EVENT_PREPAYMENT_REFUND(26)` 도입. 자세한 내용은 F06-06 §4.2 W2 절 참조.
> - **F06-10 갱신** — BANK_TRANSFER 선입금은 호스트 직접 수취(D5)로 회계 분개 발생 없음. 호스트 정산 보고서에 6 섹션 별도 노출 (§5.1 W2 추가).
> - **F03-13 신설** (이벤트 도메인) — `WalletService.payForApplication`의 facade 호출자. 결제·환불 흐름은 03_이벤트_prd 도메인 rollup 참조.
>
> **2026-05-28 RM 도메인 신설 영향(cross-ref).** `WalletService.payForRegularMeeting(userId, paymentId, meetingId, hostUserId, amount)` 신규 — WALLET 결제 시 `USER_WALLET → CREATOR_PAYABLE` 분개 + `PointTransaction(referenceType="REGULAR_MEETING_PAYMENT", referenceId=paymentId)` 1건. 멱등 보장 `existsByReferenceTypeAndReferenceId(...)`. BANK_TRANSFER는 호스트 직접입금(off-ledger, `isHostDirect=true`)로 분개 발생 없음. 코스 단위 일괄 결제이며 세션 단위 결제는 별도 없음. 자세한 내용은 [17 정기모임 F17-07](../02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md).

## 1. 결론

결제 & 지갑 단위는 사용자가 서비스 내 모든 유료 행위(이벤트 참가비, 호스팅 티켓 구매, 개인 구독 등)를 단일 포인트(P) 기반 지갑으로 처리하도록 일원화한다. 외부 PG(Toss 위주)는 "지갑 충전" 시점에만 호출되며, 실제 서비스 결제·환불·정산 수령은 모두 내부 포인트 잔액 조작으로 이루어진다. 이 구조 덕분에 사용자는 충전·결제 수단 관리·환불·자동 충전·이벤트 수익 확인·정산 이의 제기까지를 하나의 "지갑" 메뉴 안에서 완결한다.

이 도메인은 기능 PRD 10개로 구성된다. 현재 기능별 trace source는 총 33개이고, risk 후보는 총 39개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F06-01 | F06-01. 지갑 메인 조회 | [F06-01_wallet-main_prd.md](../02_feature_prds/06_payment/F06-01_wallet-main_prd.md) | [F06-01_wallet-main](../../units/06_payment/F06-01_wallet-main) | 전환 완료 | 1 | 0 |
| F06-02 | F06-02. 포인트 충전 (PG 결제) | [F06-02_point-charge_prd.md](../02_feature_prds/06_payment/F06-02_point-charge_prd.md) | [F06-02_point-charge](../../units/06_payment/F06-02_point-charge) | 전환 완료 | 5 | 0 |
| F06-03 | F06-03. 거래 내역 조회·필터·내보내기 | [F06-03_transaction-history_prd.md](../02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | [F06-03_transaction-history](../../units/06_payment/F06-03_transaction-history) | 전환 완료 | 3 | 4 |
| F06-04 | F06-04. 결제 수단 관리 | [F06-04_payment-method_prd.md](../02_feature_prds/06_payment/F06-04_payment-method_prd.md) | [F06-04_payment-method](../../units/06_payment/F06-04_payment-method) | 전환 완료 | 4 | 1 |
| F06-05 | F06-05. 자동 충전 설정 | [F06-05_auto-charge_prd.md](../02_feature_prds/06_payment/F06-05_auto-charge_prd.md) | [F06-05_auto-charge](../../units/06_payment/F06-05_auto-charge) | 전환 완료 | 4 | 0 |
| F06-06 | F06-06. 포인트 결제·환불 | [F06-06_point-pay-refund_prd.md](../02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | [F06-06_point-pay-refund](../../units/06_payment/F06-06_point-pay-refund) | 전환 완료 | 3 | 21 |
| F06-07 | F06-07. 호스팅 티켓 구매 | [F06-07_hosting-ticket_prd.md](../02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | [F06-07_hosting-ticket](../../units/06_payment/F06-07_hosting-ticket) | 전환 완료 | 2 | 3 |
| F06-08 | F06-08. 개인 구독 관리 | [F06-08_personal-subscription_prd.md](../02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | [F06-08_personal-subscription](../../units/06_payment/F06-08_personal-subscription) | 전환 완료 | 5 | 3 |
| F06-09 | F06-09. 수익 대시보드 조회 | [F06-09_earnings-dashboard_prd.md](../02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | [F06-09_earnings-dashboard](../../units/06_payment/F06-09_earnings-dashboard) | 전환 완료 | 1 | 3 |
| F06-10 | F06-10. 정산 조회·요약·이의 제기 | [F06-10_settlement-appeal_prd.md](../02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | [F06-10_settlement-appeal](../../units/06_payment/F06-10_settlement-appeal) | 전환 완료 | 5 | 4 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F06-06](../02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | F06-06. 포인트 결제·환불 | Risk 후보 21 |
| [F06-03](../02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | F06-03. 거래 내역 조회·필터·내보내기 | Risk 후보 4 |
| [F06-10](../02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | F06-10. 정산 조회·요약·이의 제기 | Risk 후보 4 |
| [F06-09](../02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | F06-09. 수익 대시보드 조회 | Risk 후보 3 |
| [F06-07](../02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | F06-07. 호스팅 티켓 구매 | Risk 후보 3 |
| [F06-08](../02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | F06-08. 개인 구독 관리 | Risk 후보 3 |
| [F06-04](../02_feature_prds/06_payment/F06-04_payment-method_prd.md) | F06-04. 결제 수단 관리 | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (10개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F06-01 | 지갑 메인 조회 | 잔액·숨김 토글·바로가기·최근 거래 3건을 단일 화면으로 제공한다 | 지갑 진입, 잔액 숨김 토글 |
| F06-02 | 포인트 충전 (PG 결제) | 프리셋/직접입력 금액과 결제수단을 선택해 PG WebView로 충전을 완료한다 | "충전하기" 탭, 금액 선택, PG 결제, 클라이언트 승인, 미사용 건 취소 |
| F06-03 | 거래 내역 조회·필터·내보내기 | 유형/기간 필터로 거래를 탐색하고 상세 진입 및 CSV/TXT 다운로드를 지원한다 | 필터 탭, 기간 변경, 무한 스크롤, 거래 카드 탭, 내보내기 |
| F06-04 | 결제 수단 관리 | 카드/계좌 결제수단을 등록·삭제·기본 설정한다(최대 5개) | "+ 추가", 스와이프 삭제, 기본 설정 |
| F06-05 | 자동 충전 설정 | 잔액 임계값과 충전 금액·결제수단을 설정해 자동 충전을 활성/해제한다 | 토글 ON/OFF, 임계값/금액 입력, 저장, 해제 |
| F06-06 | 포인트 결제·환불 | 이벤트 참여비 등을 포인트로 차감하고, 정책에 따라 환불 받는다 | 결제 확인 모달, 참여 취소 → 환불, 환불 정책 확인 |
| F06-07 | 호스팅 티켓 구매 | 보유 티켓을 확인하고 포인트로 호스팅 티켓을 구매한다 | 티켓 카드 선택, "구매하기", 잔액 부족 시 충전 분기 |
| F06-08 | 개인 구독 관리 | 구독 플랜을 가입·자동갱신 해지·재활성한다 | 플랜 비교, "구독", "자동갱신 해지", "재활성" |
| F06-09 | 수익 대시보드 조회 | 호스트로서 발생한 수익을 기간별 차트와 이벤트별 Top10으로 본다 | 기간 탭 변경, 이벤트 항목 탭, 정산 내역으로 이동 |
| F06-10 | 정산 조회·요약·이의 제기 | 내 정산을 상태별로 조회하고 총/대기 요약을 보고, REJECTED 정산에 이의 제기한다 | 상태 필터, 상세 진입, "이의 제기" 제출, 이의 내역 조회 |

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

### 5.1 유료/무료 포인트 분리정산 (도메인 횡단 정책)

> 2026-05-24: 포인트 분리정산 반영. 전체 정본은 정책 PRD `03_policy_prds/payment_settlement_policy_prd.md` §2.5 참조(여기서는 결제·지갑 관점 요약).

- **유료/무료 분리**: 지갑 잔액을 유료(paid = 충전·현금환불 = 인출 가능) / 무료(free = 프로모션 지급 = 사용 가능·인출 불가)로 분리 관리한다. 결제 시 유료/무료 split이 발생하고, 수취자(창작자/호스트/기금)까지 그대로 전파된다.
- **사용처 3분류**:
  - flow-through(무료 수취자 존재): 마켓 구매, 플랜 직접 구매, 프라이빗 미팅비, 클럽 기부·가입비, **이벤트 참가비**(2026-06-06 이관 완료) → opt-in 시 무료 허용, split이 수취자/기금/호스트에 free 적립. 이벤트도 무료 매출이 호스트에게 전달되며(flow-through 완성), 무료 결제만 모인 이벤트도 수수료·세금 0의 정산이 생성된다.
  - free-burn(플랫폼 매출): 개인 구독(F06-08), 호스팅 티켓(F06-07), 클럽 구독, 프라이빗 호스팅비 → opt-in 시 무료 허용, 무료분은 지갑에서 차감(소각). 결제(spend) 시점의 프로모션 비용(PROMOTION_EXPENSE) 분개는 여전히 미구현(followup) — 이벤트의 정산·환불 흡수 경로와는 별개.
  - PAID_ONLY: 모임 정산 송금·회수·선입금, 충전 취소 → 무료 불가.
- **인출 paid-only**: 사용자 외부 출금·탈퇴 환불은 유료 잔액만 대상. 무료는 현금 인출 불가, 탈퇴 시 무료는 소멸(forfeit).
- **해소 (2026-06-06)**: `refundToWallet` 계열(클럽 기부·가입비·구독·마켓·모임정산 역분개 환불)의 원결제 split 보존은 전부 해소됐다 — 모든 호출처가 원결제 PointTransaction을 역참조하는 `WalletRefundService.refundByTransaction`로 전환됐고, `WalletService.refundToWallet`(`WalletService.java:684-692`) 본체는 진입 즉시 throw로 차단된다.
- **해소 (2026-06-06)**: EVENT 결제·환불의 표준 결제·환불 경로 이관이 완료됐다 — 이벤트 선입금 결제는 표준 차감 경로(`WalletSpendService.spend`)를 직접 호출(충전 단위 추적 필수, 부족 시 결제 롤백)하고, 환불은 표준 환불 경로(`WalletRefundService.refundByTransaction` 명시 split 오버로드)로 수렴했다. 구식 결제 메서드 2개(`WalletService.pay`/`payForApplication`)는 본체가 차단됐다.

## 6. 화면/API 매핑

### 기능별 상세

### F06-01 지갑 메인 조회
- **사용자 가치**: 앱 어디서든 "내가 지금 얼마를 쓸 수 있는지"와 "방금 어떤 거래가 있었는지"를 두 번 탭하지 않고 확인한다.
- **주요 화면**: `SCR-PM-001 지갑 메인` (`wallet_screen.dart` + `balance_card_widget`, `shortcut_grid_widget`, `recent_transaction_widget`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/wallet` → `WalletVo`(잔액 + 최근 거래 3건 포함).
- **선결 조건/상태**: 인증 필요(`@AuthenticationPrincipal`). 화면 진입 시 자동 갱신.
- **결과 상태 변화**: 잔액 숨김 토글은 클라이언트 상태로만 마스킹("****** P"). 바로가기 탭은 거래내역(SCR-PM-003) / 결제수단(SCR-PM-005) / 수익(SCR-PA-003) / 정산(SCR-PA-004)으로 라우팅. 별도 진입 카드: 모임 정산(SCR-PA-005, 2026-06-05 신설) / 멤버십(F06-08). 최근 거래 항목 탭은 `SCR-PM-004` 거래 상세로 이동.

### F06-02 포인트 충전 (PG 결제)
- **사용자 가치**: 잔액을 즉시 보충하면서 결제수단을 한 화면 안에서 선택·전환하고, PG 실패 시 재시도 또는 이미 발행된 충전 건을 취소할 수 있다.
- **주요 화면**: `SCR-PM-002 포인트 충전` (`charge_screen.dart` + `amount_preset`, `amount_input`, `payment_method_selector`, `pg_webview_widget`, `pg_sub_status_row_widget`, `charge_success_dialog`, `charge_error_dialog`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/wallet/charge/presets` → `ChargePresetVo` (프리셋 금액 목록).
  - `POST /api/v1/wallet/charge` (`ChargeParam`) — 충전 요청 생성, PG WebView 호출 컨텍스트 발급.
  - `POST /api/v1/wallet/charge/client-confirm` (`PgConfirmParam: paymentKey/orderId/amount`) — 클라이언트가 PG 성공 콜백을 받아 직접 승인.
  - `POST /api/v1/wallet/charge/confirm` — Toss webhook(서명 헤더 `X-Toss-Signature` + raw body). 서버 측 멱등성·서명 검증으로 이중 확정 방지.
  - `POST /api/v1/wallet/charge/cancel` (`ChargeCancelParam.transactionId`) — 미사용 상태의 충전 건 PG 취소.
- **선결 조건/상태**: 결제수단 1개 이상 등록 필요 (없으면 "결제수단을 등록해주세요" → SCR-PM-005로 분기). 금액 범위: UI 1,000~500,000원.
- **결과 상태 변화**: 성공 시 잔액 증가 + 거래 내역에 충전 행 생성 + 성공 모달 후 지갑 메인 복귀(잔액 갱신). 실패 시 에러 모달 + 재시도. webhook과 client-confirm 중 어느 쪽이 먼저 도달해도 결과 일관(서버 멱등성 보장).

### F06-03 거래 내역 조회·필터·내보내기
- **사용자 가치**: 충전/결제/환불/정산이 섞인 흐름에서 원하는 유형·기간만 골라 보고, 회계용으로 파일을 내려받는다.
- **주요 화면**: `SCR-PM-003 거래 내역` (`transaction_list_screen` + `transaction_filter_widget`, `transaction_item_widget`), `SCR-PM-004 거래 상세` (`transaction_detail_screen` + `transaction_detail_row_widget`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/wallet/transactions` (`@ModelAttribute WalletSearchParam`: type, dateFrom, dateTo, page, size) → `Page<TransactionVo>`.
  - `GET /api/v1/wallet/transactions/{id}` → `TransactionVo` 상세.
  - `GET /api/v1/wallet/transactions/export` (`TransactionExportParam`: fromDate, toDate, format=csv|txt) — 서버에서 from≤to, 최대 90일 검증. CSV는 `application/octet-stream`, TXT는 `text/plain`. 파일명 `transactions-YYYYMMDD-YYYYMMDD.{csv|txt}`.
- **선결 조건/상태**: 인증 필요. 내보내기는 fromDate/toDate 필수, 90일 초과 시 `INVALID_INPUT`.
- **결과 상태 변화**: 필터/기간 변경 시 page=0부터 재로드, 무한 스크롤로 누적. 빈 결과는 "해당 기간에 거래 내역이 없습니다" 표시. 거래 상세에서 거래번호 탭 시 클립보드 복사 + 토스트, 관련 이벤트/클럽/원거래 링크로 점프.

### F06-04 결제 수단 관리
- **사용자 가치**: 자주 쓰는 카드/계좌를 등록해 충전 시마다 다시 입력하지 않고, 기본 결제수단을 설정해 자동 충전과 빠른 충전에 재사용한다.
- **주요 화면**: `SCR-PM-005 결제 수단 관리` (`payment_method_screen` + `payment_method_card_widget`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/wallet/payment-methods` → `List<PaymentMethodVo>`.
  - `POST /api/v1/wallet/payment-methods` (`PaymentMethodParam`) — PG에서 발급된 토큰/식별자로 등록, 201 Created + `PaymentMethodVo`.
  - `DELETE /api/v1/wallet/payment-methods/{id}` → 204 No Content.
  - `PATCH /api/v1/wallet/payment-methods/{id}/default` → 기본 결제수단 전환.
- **선결 조건/상태**: 인증 필요. 등록은 PG WebView 흐름 후 토큰 콜백 필요. UI 스펙상 최대 5개.
- **결과 상태 변화**: 등록/삭제 즉시 리스트 갱신. 기본 결제수단이 삭제되면 다른 수단을 자동으로 기본 지정하거나 미설정 상태가 된다(서버 정책). 자동충전이 해당 수단에 묶여 있을 경우 영향(자동충전 화면에서 재선택 필요).

### F06-05 자동 충전 설정
- **사용자 가치**: 사용자가 결제 직전에 잔액 부족으로 막히지 않도록, 임계값 이하가 되면 미리 등록한 결제수단으로 자동 충전된다.
- **주요 화면**: `SCR-PA-002 자동 충전 설정` (`auto_charge_screen.dart`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/wallet/auto-charge` → `AutoChargeConfigVo`.
  - `PUT /api/v1/wallet/auto-charge` (`AutoChargeParam`: enabled, thresholdAmount, chargeAmount, paymentMethodId).
  - `DELETE /api/v1/wallet/auto-charge` → 204 No Content (해제).
  - 보조: `GET /api/v1/wallet/charge/presets` (충전 금액 프리셋 표시용).
- **선결 조건/상태**: 결제수단 1개 이상 등록(없으면 SCR-PM-005로 분기). UI 범위 — 임계값 1,000~100,000원, 충전 금액 5,000~500,000원.
- **결과 상태 변화**: 활성 시 결제 시점 잔액 체크 → 임계값 이하면 자동 충전 트리거 → 잔액 부족이면 자동 충전 우선 실행 후 원래 결제 재시도. 자동 충전 결과는 거래 내역에 기록되고 알림 발송.

### F06-06 포인트 결제·환불
- **사용자 가치**: 이벤트 참여비를 별도 카드 입력 없이 보유 포인트로 즉시 지불하고, `event_refund_policy` 카탈로그(6종 템플릿)에 따라 취소·환불을 받는다.
- **주요 화면**: 결제는 이벤트/플랜/호스팅 티켓 등 호출 화면(상세는 각 유닛). 본 유닛에서는 환불 정책 안내(거래 상세·환불 미리보기 모달)와 거래 기록을 노출.
- **백엔드 엔드포인트**:
  - `POST /api/v1/wallet/pay` (`PaymentParam`: eventId 등) → **차단됨 (2026-06-06)**. 구식 이벤트 결제 통로로, 본체가 차단되어 호출 시 거부된다(하위호환 endpoint만 보존). 유료 이벤트 결제는 아래 선입금 경로로 일원화됨.
  - `POST /api/v1/wallet/refund` (`RefundParam.eventId`) → `TransactionVo` (환불 거래 생성).
  - `GET /api/v1/wallet/refund/policy` → 레거시 안내 고정값(24h=100%/12h=50%/0%) 응답. 실제 환불 계산에는 미사용(하위 호환 유지).
  - `GET /api/v1/refund-policy-templates` → `List<RefundPolicyTemplateVo>`. 카탈로그 6종(STANDARD/STRICT/FLEXIBLE/FULL/NON_REFUNDABLE/CUSTOM). 소스: `RefundPolicyController.java:36` (D-1, 2026-06-04).
  - 이벤트 선입금 결제(live 경로): `EventPrepaymentService.payByWallet`가 표준 차감 경로(`WalletSpendService.spend`, SpendingPurpose=`EVENT_PREPAYMENT`, 유료우선)를 직접 호출. 충전 단위(lot)를 필수 추적해 잔액-추적 정합이 깨지면 결제를 롤백한다. 멱등 가드·결제 기록·회계 분개(`recordPayment`)는 wrapper가 같은 트랜잭션에서 처리. (2026-06-06 이관 — 이전 내부 메서드 `payForApplication`도 차단됨.)
- **선결 조건/상태**: 인증 필요. 잔액 부족 시 자동충전(설정 ON) 또는 충전 화면 분기. 환불은 정책 조건과 결제 거래 존재가 전제. 선입금 경로는 `Application=APPROVED_PENDING_PAYMENT` 상태에서만 진입 가능 (facade 가드).
- **결과 상태 변화**: 결제 시 잔액 차감(충전 단위 소비) + 거래 내역에 결제 행 + 이벤트 참여 확정(`event_payment(PAID)` 전이 + facade `confirmPaymentAndAttend`로 ATTENDING 확정). 환불 시 잔액 복구(충전 단위 복원) + 환불 거래(원거래 링크 포함) + 알림. 실패 시 재시도 또는 고객센터 안내.

### F06-07 호스팅 티켓 구매
- **사용자 가치**: 프라이빗 모임을 개최하기 위한 권리(티켓)를 보유 포인트로 즉시 구매해 호스팅 권한을 확보한다.
- **주요 화면**: `SCR-PA-001 호스팅 티켓` (`hosting_ticket_screen.dart` + `hosting_ticket_card_widget`, `ticket_purchase_dialog`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/hosting-tickets` → `List<HostingTicketVo>` (보유/구매 가능 티켓 정보).
  - `POST /api/v1/hosting-tickets/purchase` (`TicketPurchaseParam.count`) → 201 Created + `HostingTicketVo`.
- **선결 조건/상태**: 인증 필요. 잔액 부족 시 SCR-PM-002 충전 분기. 활성 티켓 보유 중인 경우 만료 후 자동 적용 안내.
- **결과 상태 변화**: 포인트 차감 + 보유 티켓 수 갱신 + 거래 내역에 결제 행 기록. 실패 시 에러 모달 후 SCR-PA-001 복귀.

### F06-08 개인 구독 관리
- **사용자 가치**: 정기 구독 플랜에 가입해 혜택을 누리고, 자동갱신만 끄거나 다시 켜는 식으로 부담 없이 컨트롤한다.
- **주요 화면**: `personal_subscription_screen.dart` (UI/UX 19~20 문서에는 별도 SCR 번호 없음 — 화면 스펙은 향후 보완 예정, 본 유닛에서는 서버 API 기능만 정의).
- **백엔드 엔드포인트**:
  - `GET /api/v1/subscriptions/plans` → `List<SubscriptionPlanVo>`.
  - `GET /api/v1/subscriptions/me` → `SubscriptionVo` 현재 구독 상태.
  - `POST /api/v1/subscriptions/subscribe` (`SubscriptionParam.planType`) → 201 Created + `SubscriptionVo` (포인트 차감 또는 결제수단 청구).
  - `POST /api/v1/subscriptions/cancel` → 자동갱신만 해지(현재 주기 끝까지 유지).
  - `POST /api/v1/subscriptions/reactivate` → 만료 전 자동갱신 재활성.
- **선결 조건/상태**: 인증 필요. 가입은 잔액/결제수단 충족 필요. 해지는 활성 구독 존재 시.
- **결과 상태 변화**: 구독 상태 전이(가입→활성, 해지→자동갱신 OFF, 재활성→자동갱신 ON). 차감/결제는 거래 내역에 반영.

### F06-09 수익 대시보드 조회
- **사용자 가치**: 이벤트 호스트로서 "내가 얼마를 벌었고 어떤 이벤트가 효자인지"를 차트와 Top 리스트로 즉시 파악한다.
- **주요 화면**: `SCR-PA-003 수익 대시보드` (`earnings_dashboard_screen.dart` + `period_tab_widget`, `earnings_chart_widget`, `earnings_summary_card_widget`, `earnings_event_list_widget`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/wallet/earnings/dashboard` → `EarningsDashboardVo` (총 수익 + 기간별 데이터 + 이벤트별 수익).
  - 기간 파라미터(WEEK/MONTH/QUARTER/HALF_YEAR/YEAR)는 UI 스펙에 명시. 서버 컨트롤러 시그니처에는 별도 `period` 파라미터가 보이지 않으므로 실제 파라미터 형태/기본값은 `EarningsDashboardService` 구현에 따른다(향후 `backend.md`에서 확인).
- **선결 조건/상태**: 인증 필요. 호스트 활동 이력이 없으면 빈 상태("아직 수익이 없습니다") + 이벤트 생성 CTA.
- **결과 상태 변화**: 기간 탭 전환 시 차트·요약·Top10이 즉시 갱신. Top10 항목 탭은 이벤트 상세(SCR-EV-002)로 이동. "전체 수익 내역 보기"는 정산 내역(SCR-PA-004)으로 이동.

### F06-10 정산 조회·요약·이의 제기
- **사용자 가치**: 호스트가 수령할 정산을 상태별로 추적하고, 잘못 거절된 건에 대해 사유와 첨부로 이의 제기해 재심사를 받는다.
- **주요 화면**: `SCR-PA-004 정산 내역` (`settlement_list_screen.dart` + `settlement_item_widget`, `settlement_status_badge_widget`), 정산 상세(`settlement_detail_screen.dart` + `settlement_detail_breakdown_widget`, `settlement_timeline_widget`, `settlement_appeal_dialog`).
- **백엔드 엔드포인트**:
  - `GET /api/v1/wallet/settlements` (`@ModelAttribute SettlementSearchParam`: status + paging) → `Page<SettlementDetailVo>`.
  - `GET /api/v1/wallet/settlements/summary` → `SettlementSummaryVo` (총 정산/대기 금액/건수 — 서버 집계).
  - `GET /api/v1/wallet/settlements/{id}` → `SettlementDetailVo` (수수료/세금/순정산액 + 상태 이력).
  - `POST /api/v1/wallet/settlements/{settlementId}/appeal` (`SettlementAppealParam`: reason, attachments?) → 201 Created + `SettlementAppealVo`.
  - `GET /api/v1/wallet/settlements/{settlementId}/appeal` → `SettlementAppealVo` 이의 내역.
- **선결 조건/상태**: 인증 필요. 이의 제기는 `REJECTED` 상태의 정산만 대상.
- **결과 상태 변화**: 상태 전이 모델 — `PENDING → APPROVED → PAYING → PAID`, 또는 `→ FAILED`(재시도 시 `FAILED → PAYING`), `PENDING/APPROVED → REJECTED`. 이의 제출 성공 시 `REJECTED → PENDING`(재심사 대기), 알림 발송. 요약 카드 수치는 서버 집계로 페이지 데이터와 무관하게 일관 유지.

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F06-06](../02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | F06-06. 포인트 결제·환불 | 21 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F06-03](../02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | F06-03. 거래 내역 조회·필터·내보내기 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F06-10](../02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | F06-10. 정산 조회·요약·이의 제기 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F06-07](../02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | F06-07. 호스팅 티켓 구매 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F06-08](../02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | F06-08. 개인 구독 관리 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F06-09](../02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | F06-09. 수익 대시보드 조회 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F06-04](../02_feature_prds/06_payment/F06-04_payment-method_prd.md) | F06-04. 결제 수단 관리 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.

## 9. 변경 이력

- **2026-05-22 (v4.5 W2/W3 — 이벤트 참가 선입금 결제·환불 신규 경로)**: 기존 `WalletService.pay`(referenceType=`EVENT_PAYMENT`, `:73-178`) 변경 없음. 신규 `WalletService.payForApplication(:189)` 추가 — referenceType=`EVENT_PREPAYMENT`, referenceId=`eventPaymentId`. 환불 측 신규 `TransactionType.EVENT_PREPAYMENT_REFUND(26)` (`docs/plan/event-extensions/ENUM_RESERVATIONS.md`). 회계 분개는 `AccountingLedgerService.recordPayment/recordRefund` 기존 메서드 재사용 — AccountCode 신규 없음. BANK_TRANSFER 선입금은 **분개 없음**(D5 — 호스트 직접 수취), 호스트 정산 보고서 6 섹션(F06-10 §5.1)에 별도 노출. `WalletRefundExecutor` 공통 헬퍼 추출 및 PG queue 통합 환불은 후속 슬라이스로 분리. 영향 받는 기능: F06-06(신규 경로 명세), F06-10(BANK 6 섹션), F03-13(facade 호출자). 결제 facade·환불 facade·이벤트 취소 환불 coordinator·탈퇴 차단 통합은 03_이벤트_prd.md 도메인 rollup §9 참조.
- **2026-06-06 (EVENT 결제 표준화·무료 포인트 호스트 전달 — flow-through 완성)**: 이벤트 참가비 결제·환불을 표준 결제·환불 경로로 통합. `EventPrepaymentService.payByWallet`가 표준 차감 경로(`WalletSpendService.spend`, SpendingPurpose=`EVENT_PREPAYMENT`, 유료우선)를 직접 호출 — 충전 단위(lot) 필수 추적(부족 시 결제 롤백, 이전엔 경고만 남기고 진행), 멱등 가드·결제 기록·회계 분개는 wrapper가 같은 트랜잭션에서 처리. 환불은 `WalletRefundService.refundByTransaction`(명시 split 오버로드)로 수렴 — 충전 단위 복원 + 유료/무료 각각의 통화별 누적 환불 한도 강제. 구식 결제 메서드 2개(`WalletService.pay`/`payForApplication`)는 본체 차단(호출 시 거부). 정산: 무료 매출이 호스트에게 무료 포인트(현금화 불가)로 전달되고(`recordEventFreeSettlement`), 무료만 모인 이벤트도 수수료·세금 0의 정산이 생성된다(`SettlementBatchService` free-only 정산 + `grossPaid/grossFree` 분리 적재). 정산 완료 후 무료분 환불은 호스트 회수 없이 플랫폼 비용(`PROMOTION_EXPENSE`)으로 흡수. 운영(admin) 정산 완료도 동일 규칙 미러(무료분 지급 + SETTLEMENT 충전 단위 생성, free-only 허용·음수 net 거부). 영향: F03-13/F06-06(결제·환불 경로), F06-10(free-only 정산·무료 분개). 정본: 정책 PRD §2.6. 커밋 api `7d9f2cf`/admin `270b1f9`.
