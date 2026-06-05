# F07-05. 분담금 납부 (Pay Share / Transfer) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-05_pay-share -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-05_pay-share`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

참가자가 본인에게 할당된 분담금(Share) 또는 이체(Transfer)를 **POINT(지갑)**, **계좌이체 확인 요청**, 또는 **POINT+계좌이체 혼합**으로 납부한다. 또한 PENDING_MANUAL_REFUND 상태의 transfer에 대해 본인 POINT로 자체 환불(self-refund)할 수 있고, EXPIRED 상태의 transfer를 호스트가 재발행(reissue)하기 직전에 참가자가 결제 흐름을 다시 시작할 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 활성화 푸시 알림 탭 → 정산 현황 화면 → "내 분담금 보기" → `MySettlementSharesScreen`
- 정산 현황 → 이체 내역 화면(`TransferListScreen`) "내 이체" 탭
- 환불 필요 알림(`MEETING_SETTLEMENT_REFUND_REQUIRED`) 탭 → transfer list로 이동

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-05_pay-share/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-05_pay-share/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-05_pay-share/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-05_pay-share/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:124` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:171` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:180` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:200` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:208` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:284` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:296` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

내 분담금 화면 진입 시:
1. `mySharesProvider(eventId)` ▶ `MeetingSettlementRepository.getMyShares` ▶ `GET .../my-shares`
2. `settlementDetailProvider(eventId)` ▶ host vs 일반사용자 분기

이체 내역 화면 진입 시:
1. `transferListProvider(eventId)` 초기 로드 — 탭 0 시 `getTransfers`, 탭 1 시 `getMyTransfers`
2. `appealsProvider(eventId)` ▶ PENDING appeal 표시

POINT 결제 액션:
1. `AppDialog.confirm` 확인
2. `transferListProvider.payTransfer(transferId)` ▶ `POST .../transfers/{id}/pay`
3. invalidate 모두 (`transferList`, `summary`, `detail`, `myShares`)

혼합 결제 액션 (별도 다이얼로그에서 입력 후):
1. `MeetingSettlementMixedPayParam(pointAmount, bankTransferAmount)`
2. `transferListProvider.payTransferMixed(transferId, param)` ▶ `POST .../transfers/{id}/pay-mixed`

self-refund 액션:
1. `AppDialog.confirm` ("환불 후 되돌릴 수 없습니다")
2. `transferListProvider.selfRefundTransfer(transferId)` ▶ `POST .../transfers/{id}/self-refund`

share 결제 액션 (my_shares에서):
1. `mySharesProvider.payShare(shareId)` ▶ `POST .../shares/{id}/pay`

## 4. 서버 계약

### 개요

참가자가 본인에게 할당된 분담금(Share) 또는 이체(Transfer)를 **POINT(지갑)**, **계좌이체 확인 요청**, 또는 **POINT+계좌이체 혼합**으로 납부한다. 또한 PENDING_MANUAL_REFUND 상태의 transfer에 대해 본인 POINT로 자체 환불(self-refund)할 수 있고, EXPIRED 상태의 transfer를 호스트가 재발행(reissue)하기 직전에 참가자가 결제 흐름을 다시 시작할 수 있다.

> 본 기능은 **참가자 관점**에서 본 결제 흐름. 호스트의 계좌이체 확인은 F07-06에서 다룬다. 단, `confirmBankTransfer` (Share)는 본인 결제 의사 표시(=확인 요청) 시 호출되며, 동일 엔드포인트가 호스트의 확인에도 쓰인다 (양쪽에서 모두 호출 가능, F07-06 참조).

> **2026-06-05 (D-OPEN-2 슬라이스)**: ① `GET .../transfers/me`에 인가 검증이 누락돼 있던 것을 수정 — 본인 것만 반환돼 정보 유출은 없었으나 다른 조회와 잠금 수준이 달랐다(DEC-V3). ② read 계열(`my-shares`, `transfers/me`)의 열람 자격이 `validateSettlementReadAccess`(ATTENDING ∪ 해당 정산 share/transfer 당사자 ∪ 호스트)로 확장 — 참석을 취소했어도 내 돈이 걸려 있으면 본인 분담금을 볼 수 있다. 결제(쓰기) 가드는 무변경 — DRAFT 결제·확정·재발행·상각 8경로 거부는 회귀 테스트로 고정. 상세는 [F07-04 §7-A](F07-04_status-summary-receipt_prd.md).

### 의존 단위 / 외부 시스템

- Unit 06 (Wallet): `WalletService.deductPaidOnly`, `creditMeetingSettlement`, `refundToWallet` (셀프 환불에서 reversal에서)
- Unit 06 (Accounting): `AccountingLedgerService.recordMeetingSettlementPayment`, `recordMeetingSettlementReversal`
- Unit 12 (Notification): `MEETING_SETTLEMENT_PAID`, `MEETING_SETTLEMENT_REFUND_COMPLETED`
- F07-08 (Appeal): `appealService.hasPendingAppeal(SHARE/ITEM/TRANSFER, id)` — PENDING appeal 있으면 결제 차단
- 외부 시스템: FCM (수취자 알림)

## 5. 프론트 계약

### 진입 경로

- 정산 활성화 푸시 알림 탭 → 정산 현황 화면 → "내 분담금 보기" → `MySettlementSharesScreen`
- 정산 현황 → 이체 내역 화면(`TransferListScreen`) "내 이체" 탭
- 환불 필요 알림(`MEETING_SETTLEMENT_REFUND_REQUIRED`) 탭 → transfer list로 이동

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement/my-shares` | `my_settlement_shares_screen.dart` | 본인 분담 리스트 (E-01c) |
| `/home/events/:eventId/settlement/transfers` | `transfer_list_screen.dart` | 이체 리스트 (전체/내 이체 탭) |
| (위젯) | `widgets/my_share_row_card.dart` | 분담 카드 (영수증/이의제기) |
| (위젯) | `widgets/transfer_card_widget.dart` | 이체 카드 (액션 버튼 분기) |
| (위젯) | `widgets/transfer_status_badge_widget.dart` | 상태 배지 (PENDING/COMPLETED/CANCELLED/EXPIRED 등) |
| (유틸) | `utils/remit_url_builder.dart` | 토스/카카오페이 송금 딥링크 빌더 |

### 화면별 구성 요소 & 액션

### 내 분담금 화면 (`my_settlement_shares_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` "내 분담금"
  - 분담금 카드 리스트 (`MyShareRowCard`)
    - itemTitle, shareAmount(천단위), 결제 상태(완료/대기), `paymentMethod`, 영수증 미리보기 아이콘
    - **DRAFT(준비 중) 정산이면**: '준비 중' 뱃지 + "준비 중 — 금액이 바뀔 수 있어요" 캡션 (`isDraft` 분기, 2026-06-05) — 비확정 금액임을 명시
  - 빈 상태 (`AppEmptyState(icon: receipt_long_outlined, title: '분담금이 없습니다')`)
- **사용자가 할 수 있는 액션**:
  - 영수증 보기 ▶ `context.push('/home/events/:eventId/settlement/receipts/$fileId')`
  - "이의제기" 탭 ▶ `SettlementAppealDialog` ▶ `appealsProvider.createAppeal(subjectType:'SHARE', subjectId, reason)` ▶ 토스트
  - 풀투리프레시 ▶ `invalidate(mySharesProvider(eventId))`
- **상태 분기**:
  - `mySharesProvider` 로딩/에러 분기
  - **호스트 본인은 자기 share 이의제기 불가** — 호스트 자기 appeal로 자동 완료 차단 방지
  - **이의제기 버튼 3상태 가드 (2026-06-05, DEC-V4 쌍)**: status 확정 + 비DRAFT + 비호스트일 때만 노출. status 미확정(로딩/에러) 동안은 안전 기본값으로 숨김 — shares가 정산 상세보다 먼저 로드될 때 DRAFT 정산에서 버튼이 잠깐 보이는 레이스 봉합. '준비 중' 뱃지는 status 확정된 DRAFT일 때만(버튼만 엄격, 뱃지는 관대)

### 이체 내역 화면 (`transfer_list_screen.dart`, SCR-MS-005)
- **사용자가 보는 것**:
  - `TabBar` "전체" / "내 이체" (탭 변경 시 `loadAllTransfers` / `loadMyTransfers` 호출)
  - 이체 카드 리스트 (`TransferCardWidget`):
    - 송금자→수취자 아바타·이름, 금액, `TransferStatusBadgeWidget`(PENDING/COMPLETED/CANCELLED/EXPIRED/REVERSAL_FAILED/PENDING_MANUAL_REFUND)
    - 송금자(`fromUserId == currentUser`)일 때:
      - PENDING: "포인트로 결제" / "송금 앱 열기"(토스/카카오) / "이체 확인 요청" / "이의제기"
    - 수취자(`toUserId == currentUser`)일 때:
      - PENDING: "이체 확인" (호스트 권한 — F07-06)
      - PENDING_MANUAL_REFUND: "포인트 환불(self-refund)"
      - EXPIRED: 호스트는 "재요청" / "포기(writeoff)"
- **사용자가 할 수 있는 액션 (참가자/송금자 관점)**:
  - "포인트로 결제" ▶ 확인 다이얼로그 ▶ `transferListProvider.payTransfer(transferId)` ▶ `POST .../transfers/{id}/pay` ▶ 토스트 "결제 완료"
  - "송금 앱 열기" ▶ 바텀시트 (토스/카카오 선택) ▶ `RemitUrlBuilder.tossRemit(amount, msg)` 또는 `kakaoPayRemit()` ▶ `launchUrl(externalApplication)` ▶ 사용자가 외부 앱에서 송금 후 돌아옴
  - "이의 제기" ▶ AlertDialog (사유 입력 maxLength 2000) ▶ `appealsProvider.createAppeal(subjectType:'TRANSFER', subjectId, reason)`
  - "포인트 환불(self-refund)" (수취자) ▶ `AppDialog.confirm("환불 후 되돌릴 수 없습니다")` ▶ `transferListProvider.selfRefundTransfer(transferId)` ▶ `POST .../transfers/{id}/self-refund`
- **상태 분기**:
  - 탭 인덱스 0 → loadAllTransfers, 1 → loadMyTransfers
  - 이체 0건 → AppEmptyState
  - PENDING_MANUAL_REFUND 별도 강조 색상

### API 호출 순서 (Provider/Repository 관점)

내 분담금 화면 진입 시:
1. `mySharesProvider(eventId)` ▶ `MeetingSettlementRepository.getMyShares` ▶ `GET .../my-shares`
2. `settlementDetailProvider(eventId)` ▶ host vs 일반사용자 분기

이체 내역 화면 진입 시:
1. `transferListProvider(eventId)` 초기 로드 — 탭 0 시 `getTransfers`, 탭 1 시 `getMyTransfers`
2. `appealsProvider(eventId)` ▶ PENDING appeal 표시

POINT 결제 액션:
1. `AppDialog.confirm` 확인
2. `transferListProvider.payTransfer(transferId)` ▶ `POST .../transfers/{id}/pay`
3. invalidate 모두 (`transferList`, `summary`, `detail`, `myShares`)

혼합 결제 액션 (별도 다이얼로그에서 입력 후):
1. `MeetingSettlementMixedPayParam(pointAmount, bankTransferAmount)`
2. `transferListProvider.payTransferMixed(transferId, param)` ▶ `POST .../transfers/{id}/pay-mixed`

self-refund 액션:
1. `AppDialog.confirm` ("환불 후 되돌릴 수 없습니다")
2. `transferListProvider.selfRefundTransfer(transferId)` ▶ `POST .../transfers/{id}/self-refund`

share 결제 액션 (my_shares에서):
1. `mySharesProvider.payShare(shareId)` ▶ `POST .../shares/{id}/pay`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 참가자 · POINT 결제) 분담금 16,000원을 포인트로 즉시 결제 | settlement ACTIVE, 본인 transfer 1건 PENDING (16,000원 → 호스트) | 사용자 지갑 -16,000, 호스트 지갑 +16,000, transfer COMPLETED, 호스트 푸시 1건. |
| S2 | (참가자 · 외부 송금 앱) 토스로 16,000원을 호스트에게 송금 | 토스 앱 사용자 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (참가자 · 혼합 결제 mixed) POINT 일부 + 계좌이체 일부 | 지갑 잔액 10,000원 보유, 분담금 16,000원 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (참가자 · share 직접 결제) my-shares에서 항목 단위로 결제 | HOST_COLLECT 모드가 아니라 항목 단위 share 결제 흐름 (현재는 transfer 단위 결제가 주류) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (수취자 · self-refund) 정산 취소로 PENDING_MANUAL_REFUND 된 BANK 입금분 환불 | 호스트가 정산 취소 → 자기 transfer가 BANK_TRANSFER COMPLETED였음 → PENDING_MANUAL_REFUND로 전이 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (엣지 · 잔액 부족) 결제 시도 시 지갑 잔액 부족 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (엣지 · 이미 완료된 transfer) 중복 결제 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · PENDING appeal 차단) 본인 transfer에 이의가 걸린 상태에서 결제 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | (엣지 · settlement 완료 트리거) 마지막 transfer 결제 시 정산 자동 COMPLETED | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:38 | - **권한**: `@AuthenticationPrincipal` 필수 (별도 검증 없음 — 본인 transfer만 조회 SQL 단에서 필터) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:62 | 1. my-shares 화면에서 share 카드 액션 (현재 코드에선 view만 노출, 결제 버튼 미노출 — `payShareByPoint`는 가능하지만 UI에서 기본은 transfer 결제 흐름) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 참가자 · POINT 결제) 분담금 16,000원을 포인트로 즉시 결제**: Given settlement ACTIVE, 본인 transfer 1건 PENDING (16,000원 → 호스트) When 사용자가 해당 흐름을 실행하면 Then 사용자 지갑 -16,000, 호스트 지갑 +16,000, transfer COMPLETED, 호스트 푸시 1건.
- **AC-02. (참가자 · 외부 송금 앱) 토스로 16,000원을 호스트에게 송금**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (참가자 · 혼합 결제 mixed) POINT 일부 + 계좌이체 일부**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (참가자 · share 직접 결제) my-shares에서 항목 단위로 결제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (수취자 · self-refund) 정산 취소로 PENDING_MANUAL_REFUND 된 BANK 입금분 환불**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (엣지 · 잔액 부족) 결제 시도 시 지갑 잔액 부족**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (엣지 · 이미 완료된 transfer) 중복 결제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · PENDING appeal 차단) 본인 transfer에 이의가 걸린 상태에서 결제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. (엣지 · settlement 완료 트리거) 마지막 transfer 결제 시 정산 자동 COMPLETED**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
