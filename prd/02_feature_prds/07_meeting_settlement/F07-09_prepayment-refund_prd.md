# F07-09. 선입금 결제 / 확인 / 환불 / 환불규정 (Prepayment & Refund Rules) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-09_prepayment-refund -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-09_prepayment-refund`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 시작 전 호스트가 참가확정 조건으로 선입금을 받는다. 참가자는 POINT 또는 BANK_TRANSFER로 선입금하고, BANK는 호스트가 수동 확인한다. 환불은 환불 규칙(이벤트 시작 N시간 전 환불률 %)에 따라 자동 계산된다. 가상계좌 입금은 PG의 webhook으로 인입되어 prepayment 상태를 자동 업데이트하도록 설계되어 있다 (현재 stub은 401 반환).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 → "선입금" 메뉴 → `prepayment_screen`
- 선입금 결제 알림 → 딥링크
- 호스트가 환불 규정을 설정할 때 이벤트 생성/수정 화면에서 진입

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-09_prepayment-refund/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-09_prepayment-refund/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-09_prepayment-refund/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-09_prepayment-refund/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java:31` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java:39` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java:48` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java:56` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java:64` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java:72` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/virtualaccount/VirtualAccountWebhookController.java:25` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

선입금 화면 진입:
1. `prepaymentListProvider(eventId)` ▶ `GET .../prepayments`
2. `settlementDetailProvider(eventId)` ▶ creatorUserId로 호스트 판정

선입금 결제 액션:
1. 다이얼로그 → POINT/BANK 선택 → amount 입력
2. `prepaymentListProvider.pay(MeetingPrepaymentPayParam)` ▶ `POST .../prepayments/pay`
3. invalidate

호스트 BANK 확인 액션:
1. `prepaymentListProvider.confirmBank(id)` ▶ `PATCH .../prepayments/{id}/confirm`

환불 액션:
1. (옵션) `GET .../refund-rules` 호출하여 환불률 미리보기
2. 환불 확인 다이얼로그
3. `prepaymentListProvider.refund(id)` ▶ `POST .../prepayments/{id}/refund`
4. invalidate

환불 규정 화면:
1. `refundRulesProvider(eventId)` ▶ `GET .../prepayments/refund-rules`
2. 저장 ▶ `saveRules(List<MeetingRefundRuleParam>)` ▶ `POST .../prepayments/refund-rules`

## 4. 서버 계약

### 개요

이벤트 시작 전 호스트가 참가확정 조건으로 선입금을 받는다. 참가자는 POINT 또는 BANK_TRANSFER로 선입금하고, BANK는 호스트가 수동 확인한다. 환불은 환불 규칙(이벤트 시작 N시간 전 환불률 %)에 따라 자동 계산된다. 가상계좌 입금은 PG의 webhook으로 인입되어 prepayment 상태를 자동 업데이트하도록 설계되어 있다 (현재 stub은 401 반환).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/prepayments | MeetingPrepaymentController#getPrepayments | required | 선입금 리스트 |
| POST | /api/v1/events/{eventId}/prepayments/pay | MeetingPrepaymentController#payPrepayment | required | 선입금 결제 |
| PATCH | /api/v1/events/{eventId}/prepayments/{id}/confirm | MeetingPrepaymentController#confirmBankPrepayment | required | BANK 선입금 수동 확인 (호스트) |
| POST | /api/v1/events/{eventId}/prepayments/{id}/refund | MeetingPrepaymentController#refundPrepayment | required | 선입금 환불 (참가자 본인) |
| GET | /api/v1/events/{eventId}/prepayments/refund-rules | MeetingPrepaymentController#getRefundRules | required | 환불 규정 조회 |
| POST | /api/v1/events/{eventId}/prepayments/refund-rules | MeetingPrepaymentController#saveRefundRules | required | 환불 규정 저장 (호스트) |
| POST | /webhooks/meeting-settlement/virtual-account/deposit | VirtualAccountWebhookController#onDeposit | 🟠 외부 PG 서명 검증 | 가상계좌 입금 webhook |

### 의존 단위 / 외부 시스템

- Unit 06 (Wallet): `WalletService.deductPaidOnly`, `creditMeetingSettlement` (POINT 결제/환불)
- Unit 06 (Accounting): `AccountingLedgerService.recordMeetingPrepayment`, `recordMeetingPrepaymentRefund`
- Unit 03 (Event): `Event.startTime` (환불률 계산용), 호스트 검증
- 외부 PG (가상계좌): `POST /webhooks/meeting-settlement/virtual-account/deposit` 인입 (실제 연동 시)

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 → "선입금" 메뉴 → `prepayment_screen`
- 선입금 결제 알림 → 딥링크
- 호스트가 환불 규정을 설정할 때 이벤트 생성/수정 화면에서 진입

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/prepayments` | `prepayment_screen.dart` | 선입금 리스트 (호스트/참가자 분기 액션) |
| `/home/events/:eventId/prepayments/refund-rules` | `refund_rules_screen.dart` | 환불 규정 설정 (호스트) |
| (위젯) | `widgets/prepayment_card_widget.dart` | 선입금 카드 |
| (위젯) | `widgets/prepayment_pay_dialog.dart` | 선입금 결제 다이얼로그 |
| (위젯) | `widgets/refund_confirm_dialog.dart` | 환불 확인 다이얼로그 |
| (위젯) | `widgets/refund_rule_card_widget.dart` | 환불 룰 입력 카드 |
| (위젯) | `widgets/refund_timeline_widget.dart` | 환불률 타임라인 시각화 |

### 화면별 구성 요소 & 액션

### 선입금 관리 화면 (`prepayment_screen.dart`, SCR-MS-004)
- **사용자가 보는 것**:
  - 상단 요약 카드 `_PrepaymentSummaryCard` — 총 선입금액 + 납부 현황 (N/M명)
  - 선입금 카드 리스트 (`PrepaymentCardWidget`)
    - 사용자 아바타·이름, amount, paymentMethod, status (결제완료/대기/환불)
    - 호스트 뷰 + BANK 미확인: "확인" / "환불" 버튼
    - 참여자 뷰 + 본인 미결제: "선입금 결제" CTA
  - 하단 "환불 규정 확인 >" 링크 → `/refund-rules` push
  - 빈 상태: `AppEmptyState(icon: payment, title: '선입금 내역이 없습니다')`
- **사용자가 할 수 있는 액션 (호스트)**:
  - "확인" 탭 ▶ `prepaymentListProvider.confirmBank(prepaymentId)` ▶ `PATCH .../prepayments/{id}/confirm` ▶ 토스트 "선입금이 확인되었습니다"
  - "환불" 탭 ▶ 확인 다이얼로그 ▶ `refund(prepaymentId)` ▶ `POST .../prepayments/{id}/refund` ▶ 토스트
- **사용자가 할 수 있는 액션 (참가자)**:
  - "선입금 결제" CTA ▶ `PrepaymentPayDialog` (POINT/BANK 선택 + amount 입력) ▶ `payPrepayment(MeetingPrepaymentPayParam)` ▶ `POST .../prepayments/pay`
- **상태 분기**:
  - `prepaymentListProvider` 로딩/에러
  - 본인 결제 이력 있으면 결제 CTA 숨김
  - BANK 미확인 / POINT 완료 / 환불 완료 각각 다른 배지 색

### 환불 규정 화면 (`refund_rules_screen.dart`, SCR-MS-006)
- **사용자가 보는 것**:
  - 룰 카드 리스트 (`RefundRuleCardWidget`) — `hoursBeforeStart` 입력 + `refundPercentage` 슬라이더 (0~100, 5% 단위 권장)
  - 하단 "+ 규정 추가" 버튼
  - 환불 타임라인 시각화 (`RefundTimelineWidget`) — 시간 흐름에 따른 환불률 그래프
  - 최하단 "규정 저장" CTA
- **사용자가 할 수 있는 액션 (호스트)**:
  - 룰 추가 ▶ `_editableRules.add(MeetingRefundRuleParam(hoursBeforeStart:48, refundPercentage:50))` 후 hoursBeforeStart desc 정렬
  - 룰 삭제 ▶ `_editableRules.removeAt(index)`
  - 슬라이더/입력 변경 ▶ setState
  - "규정 저장" 탭 ▶ `refundRulesProvider.saveRules(rules)` ▶ `POST .../prepayments/refund-rules`
- **상태 분기**:
  - 서버 룰 비어있으면 default `[(168,100),(72,50),(24,30),(0,0)]` prefill
  - `_isSaving` 동안 CTA 비활성

### 선입금 결제 다이얼로그 (`prepayment_pay_dialog.dart`)
- POINT/BANK 라디오 + amount 입력 (천단위 콤마)
- POINT 선택 시 잔액 표시
- 잔액 부족 → 안내 + "충전하러 가기" 링크 (Unit 06)

### 환불 확인 다이얼로그 (`refund_confirm_dialog.dart`)
- 현재 시점 환불률 계산 표시 ("이벤트 3일 전 / 환불률: 50% / 환불금액: 5,000원")
- 0% 환불률이면 "환불 불가" 안내

### API 호출 순서 (Provider/Repository 관점)

선입금 화면 진입:
1. `prepaymentListProvider(eventId)` ▶ `GET .../prepayments`
2. `settlementDetailProvider(eventId)` ▶ creatorUserId로 호스트 판정

선입금 결제 액션:
1. 다이얼로그 → POINT/BANK 선택 → amount 입력
2. `prepaymentListProvider.pay(MeetingPrepaymentPayParam)` ▶ `POST .../prepayments/pay`
3. invalidate

호스트 BANK 확인 액션:
1. `prepaymentListProvider.confirmBank(id)` ▶ `PATCH .../prepayments/{id}/confirm`

환불 액션:
1. (옵션) `GET .../refund-rules` 호출하여 환불률 미리보기
2. 환불 확인 다이얼로그
3. `prepaymentListProvider.refund(id)` ▶ `POST .../prepayments/{id}/refund`
4. invalidate

환불 규정 화면:
1. `refundRulesProvider(eventId)` ▶ `GET .../prepayments/refund-rules`
2. 저장 ▶ `saveRules(List<MeetingRefundRuleParam>)` ▶ `POST .../prepayments/refund-rules`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트 환불 규정 설정) 7일/3일/1일/당일 4단계 룰 저장 | 룰 0건 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S2 | (Happy Path · 참가자 POINT 선입금) 잔액 5만원으로 5천원 결제 | 지갑 잔액 50,000원, 동일 이벤트의 본인 prepayment 없음 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (참가자 BANK 선입금) 호스트 수동 확인 대기 | POINT 잔액 부족, BANK_TRANSFER로 결제 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (가상계좌 webhook · 외부 PG) 자동 입금 인입 (실제 연동 시) | 가상계좌 발급 후 사용자가 입금 → PG가 우리 서버에 webhook 통보 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (Happy Path · 참가자 환불 - 100%) 일주일 전 취소 | 본인 prepayment isCompleted=true POINT 5000원 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (참가자 환불 - 50%) 3일 전 취소 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (참가자 환불 - 0%) 이벤트 시작 후 환불 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · 중복 결제 차단) 이미 환불 안 된 prepayment가 있는데 또 결제 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | (엣지 · 비호스트가 BANK confirm 시도) 권한 차단 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | (엣지 · 본인 외 환불 시도) 다른 사용자 prepayment 환불 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S11 | (엣지 · 룰 0건) 환불 규정 미설정 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:82 | - **참고**: BANK_TRANSFER 환불은 환불 금액 계산만 하고 wallet credit은 호출하지 않음 (호스트가 수동으로 외부 환불해야 함 — 현재 코드는 POINT에 한해 자동 환불) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:26 | - 호스트 뷰 + BANK 미확인: "확인" / "환불" 버튼 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:38 | - BANK 미확인 / POINT 완료 / 환불 완료 각각 다른 배지 색 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:95 | - 결제대기(BANK 미확인) — 회색 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:155 | I -- 예 --> P0[🟡 percentage = 0] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:177 | class B,C,D,H,I,J,M,P100,P0,PM,PL,R,S,Skip logic | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:191 | Pending --> Refunded : POST /refund (BANK 미확인 환불 — 본인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 환불 규정 설정) 7일/3일/1일/당일 4단계 룰 저장**: Given 룰 0건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. (Happy Path · 참가자 POINT 선입금) 잔액 5만원으로 5천원 결제**: Given 지갑 잔액 50,000원, 동일 이벤트의 본인 prepayment 없음 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (참가자 BANK 선입금) 호스트 수동 확인 대기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (가상계좌 webhook · 외부 PG) 자동 입금 인입 (실제 연동 시)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (Happy Path · 참가자 환불 - 100%) 일주일 전 취소**: Given 본인 prepayment isCompleted=true POINT 5000원 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (참가자 환불 - 50%) 3일 전 취소**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (참가자 환불 - 0%) 이벤트 시작 후 환불 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · 중복 결제 차단) 이미 환불 안 된 prepayment가 있는데 또 결제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. (엣지 · 비호스트가 BANK confirm 시도) 권한 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. (엣지 · 본인 외 환불 시도) 다른 사용자 prepayment 환불**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-11. (엣지 · 룰 0건) 환불 규정 미설정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
