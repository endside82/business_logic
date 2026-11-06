# F07-03. 정산 활성화/취소 (Activate / Cancel) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트가 DRAFT 상태의 정산을 **ACTIVE**로 활성화해 모든 참가자에게 납부 알림을 발송한다. 활성화 시점에 마감일과 자동 리마인드 옵션을 함께 지정할 수 있다. 활성화된 정산은 정산 생성자/이벤트 호스트가 **CANCEL**할 수 있으며, 취소 시 이미 결제된 POINT 이체는 자동 역분개 환불, 계좌이체 분담은 `PENDING_MANUAL_REFUND` 상태로 전이된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 현황 화면(SCR-MS-002) 하단 액션 바 (`SettlementActionBarWidget`)
- DRAFT 상태에서는 "정산 신청(활성화)" 버튼, ACTIVE 상태에서는 "정산 취소" 버튼

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `WalletService`, `AccountingLedgerService`, `NotificationService`. 앱: `settlement_status_screen.dart`, `settlement_action_bar_widget.dart`, `settlement_summary_card_widget.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#activateSettlement`, `MeetingSettlementController#cancelSettlement`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

화면 진입 시:
1. `settlementDetailProvider(eventId)` ▶ `GET .../settlement`
2. `settlementSummaryProvider(eventId)` ▶ `GET .../summary`
3. (manager일 때) `eventDetailNotifierProvider(eventId)` ▶ host/staff 권한 확인

활성화 시:
1. `AppDialog.confirm` 호출 → 확인
2. `meetingSettlementRepository.activateSettlement(eventId)` ▶ `PATCH .../settlement/activate` (body 없음 — 옵션 필드는 현재 미사용)
3. invalidate `settlementDetailProvider`, `settlementSummaryProvider`, `transferListProvider`, `settlementItemsProvider`
4. 토스트 + 화면 갱신

취소 시:
1. `AppDialog.confirm` "정산을 취소하시겠습니까? 이미 결제된 금액은 자동 환불됩니다."
2. `meetingSettlementRepository.cancelSettlement(eventId)` ▶ `PATCH .../settlement/cancel`
3. invalidate 모든 관련 provider
4. 토스트 "정산이 취소되었습니다"

## 4. 제품 규칙

- 활성화 대상자 검증: 작성 중에는 자유지만, 활성화 때 항목의 돈 낸 사람, 분담자, 수동 송금 당사자가 모두 실제 참석자(FIXED 정기모임 회차는 체크인한 사람, 그 외는 참석자)와 호스트 안에 있어야 한다. 어긋나면 어긋난 사람 목록과 함께 거절해, 안 온 사람에게 송금 줄이 생기지 않는다.
- 작성 중 정산 자동 정리: 마지막 편집 뒤 30일 방치한 DRAFT 는 지우지 않고 CANCELLED 로 바꾸며(복구 여지), 호스트에게 알리고 PENDING 수동 송금도 함께 취소한다.
- 활성화 때 마감일과 자동 리마인드(1~168시간)를 줄 수 있다. 지금 앱의 버튼은 입력 없이 활성화한다.
- 균등 분할에서 음수 분담금은 나오지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트 활성화) DRAFT 정산을 활성화해 6명에게 알림 발송 | settlement DRAFT, 항목 1건 + share 6건, totalAmount 96,000 | settlement ACTIVE, transfer 5건 PENDING, 푸시 5건 발송, audit 2건 추가. |
| S2 | (호스트 · 활성화 옵션 deadline + autoRemind) 마감 + 자동 리마인드 함께 설정 | 호스트가 정산을 활성화하면서 "1주일 후 마감 + 마감 12시간 후 자동 리마인드"를 같이 설정 (E-02) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (엣지 · 항목 없음) 항목이 0개인 채로 활성화 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (엣지 · 비호스트 차단) 참석자가 활성화 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (Happy Path · 호스트 취소 / POINT 자동 환불) ACTIVE 정산을 취소 | settlement ACTIVE, transfer 5건(2건 COMPLETED POINT, 3건 PENDING) | 2명 사용자 지갑에서 16,000원 환원, 호스트 지갑에서 32,000원 차감 (합계 0), 5명 푸시 수신. |
| S6 | (엣지 · 계좌이체로 결제된 transfer 취소) PENDING_MANUAL_REFUND 분기 | 호스트 정산 취소 시 일부 transfer가 BANK_TRANSFER로 COMPLETED 상태 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (엣지 · POINT 역분개 실패) 송금자 지갑 잠금/예외 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · 이미 COMPLETED) 완료된 정산을 취소 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | scenarios.md:31 | **현재 UI 상태**: body는 `null` (옵션 입력 UI 미구현). 옵션 추가가 필요할 때 활성화 다이얼로그를 확장. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 활성화) DRAFT 정산을 활성화해 6명에게 알림 발송**: Given settlement DRAFT, 항목 1건 + share 6건, totalAmount 96,000 When 사용자가 해당 흐름을 실행하면 Then settlement ACTIVE, transfer 5건 PENDING, 푸시 5건 발송, audit 2건 추가.
- **AC-02. (호스트 · 활성화 옵션 deadline + autoRemind) 마감 + 자동 리마인드 함께 설정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 항목 없음) 항목이 0개인 채로 활성화 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (엣지 · 비호스트 차단) 참석자가 활성화 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (Happy Path · 호스트 취소 / POINT 자동 환불) ACTIVE 정산을 취소**: Given settlement ACTIVE, transfer 5건(2건 COMPLETED POINT, 3건 PENDING) When 사용자가 해당 흐름을 실행하면 Then 2명 사용자 지갑에서 16,000원 환원, 호스트 지갑에서 32,000원 차감 (합계 0), 5명 푸시 수신.
- **AC-06. (엣지 · 계좌이체로 결제된 transfer 취소) PENDING_MANUAL_REFUND 분기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (엣지 · POINT 역분개 실패) 송금자 지갑 잠금/예외**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · 이미 COMPLETED) 완료된 정산을 취소 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
