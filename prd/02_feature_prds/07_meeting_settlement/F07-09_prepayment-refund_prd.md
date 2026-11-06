# F07-09. 선입금 결제 / 확인 / 환불 / 환불규정 (Prepayment & Refund Rules) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

이벤트 시작 전 호스트가 참가확정 조건으로 선입금을 받는다. 참가자는 POINT 또는 BANK_TRANSFER로 선입금하고, BANK는 호스트가 수동 확인한다. 환불 규칙은 **별도 `meeting_refund_rule` 테이블**에 저장(이벤트 시작 N시간 전 환불률 %)되며, 카탈로그 저장 범위 외로 관리된다. 단 계산 엔진은 MeetingRefundRule→transient EventRefundPolicy 변환으로 공통 `RefundPolicyService.computeRefund`를 재사용한다(저장하지 않음). **가상계좌 입금 통지의 수신·검증·정산 이체 확인 코드는 존재한다.** 처리 함수가 없다는 옛 설명은 잘못이다. 실제 결제사 연결과 운영 입금 통과는 이번 코드 위치 교정에서 확인하지 않았다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 → "선입금" 메뉴 → `prepayment_screen`
- 선입금 결제 알림 → 딥링크
- 호스트가 환불 규정을 설정할 때 이벤트 생성/수정 화면에서 진입

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingPrepaymentController`, `VirtualAccountWebhookController`, `PointTransactionQueryRepositoryDataJpaTest`, `RefundPolicyService`, `MeetingSettlementTransferService`, `WalletService`, `AccountingLedgerService`, `EventPrepaymentService`. 앱: `prepayment_screen.dart`, `refund_rules_screen.dart`, `prepayment_card_widget.dart`, `prepayment_pay_dialog.dart`, `refund_confirm_dialog.dart`, `refund_rule_card_widget.dart`, `refund_timeline_widget.dart`.

<!-- source-references:start -->
서버 창구: `MeetingPrepaymentController#getPrepayments`, `MeetingPrepaymentController#payPrepayment`, `MeetingPrepaymentController#confirmBankPrepayment`, `MeetingPrepaymentController#refundPrepayment`, `MeetingPrepaymentController#getRefundRules`, `MeetingPrepaymentController#saveRefundRules`, `VirtualAccountWebhookController#onDeposit`, `VirtualAccountWebhookController#onDepositLegacy`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
- 공급자 코드가 있는 경로는 onDeposit, 옛 고정 주소는 onDepositLegacy가 처리한다. 처리 함수가 없다는 옛 설명도 정정했다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 규정이 비어 있으면 기본안을 채워 보인다: 시작 168시간 전 100%, 72시간 전 50%, 24시간 전 30%, 그 뒤 0%.
- 환불률이 0% 면 「환불 불가」로 안내한다.
- 계좌이체 선입금은 호스트 계좌로 간 돈이라 환불액이 생겨도 돈을 옮기지 않는다. 호스트의 반환 대기로 남기고 알린다. 호스트(또는 정산 생성자)는 반환 완료를 적거나, 입금을 확인한 적이 없으면 입금 안 됨으로 닫는다. 반환 대기는 호스트의 탈퇴를 막는다.
- 취소된 모임의 선입금은 호스트 귀책으로 전액 돌려준다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 구현 위치 확인 · 실제 환경은 별도 | [확인한 서버 코드 위치](#확인한-서버-코드-위치) | 공급자별·호환용 수신 함수가 공통 검증·전달 이력 저장과 `MeetingSettlementTransferService#confirmVirtualAccountDeposit`을 호출한다. 서비스가 없거나 호출이 주석 처리됐다는 옛 설명은 철회한다. | 실제 결제사 연결·입금·중복 통지·오류 복구의 실행 근거와 공개 여부는 [첫 출시 현황](../../../docs/qa/launch-status.html)에서 판단한다. 이번 위치 교정은 실거래 검증이 아니다. |
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
