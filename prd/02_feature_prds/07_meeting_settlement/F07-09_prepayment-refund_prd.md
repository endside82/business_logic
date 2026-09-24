# F07-09. 선입금 결제 / 확인 / 환불 / 환불규정 (Prepayment & Refund Rules) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.


<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/07_meeting_settlement/F07-09_prepayment-refund -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-09_prepayment-refund`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 시작 전 호스트가 참가확정 조건으로 선입금을 받는다. 참가자는 POINT 또는 BANK_TRANSFER로 선입금하고, BANK는 호스트가 수동 확인한다. 환불 규칙은 **별도 `meeting_refund_rule` 테이블**에 저장(이벤트 시작 N시간 전 환불률 %)되며, 카탈로그 저장 범위 외로 관리된다. 단 계산 엔진은 MeetingRefundRule→transient EventRefundPolicy 변환으로 공통 `RefundPolicyService.computeRefund`를 재사용한다(저장하지 않음). **가상계좌 입금 통지의 수신·검증·정산 이체 확인 코드는 존재한다.** 처리 함수가 없다는 옛 설명은 잘못이다. 실제 결제사 연결과 운영 입금 통과는 이번 코드 위치 교정에서 확인하지 않았다.

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

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-09-24에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `GET /api/v1/events/{eventId}/prepayments` | `MeetingPrepaymentController#getPrepayments` | [MeetingPrepaymentController.java:44](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java#L44) |
| `POST /api/v1/events/{eventId}/prepayments/pay` | `MeetingPrepaymentController#payPrepayment` | [MeetingPrepaymentController.java:61](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java#L61) |
| `PATCH /api/v1/events/{eventId}/prepayments/{id}/confirm` | `MeetingPrepaymentController#confirmBankPrepayment` | [MeetingPrepaymentController.java:71](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java#L71) |
| `POST /api/v1/events/{eventId}/prepayments/{id}/refund` | `MeetingPrepaymentController#refundPrepayment` | [MeetingPrepaymentController.java:79](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java#L79) |
| `GET /api/v1/events/{eventId}/prepayments/refund-rules` | `MeetingPrepaymentController#getRefundRules` | [MeetingPrepaymentController.java:92](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java#L92) |
| `POST /api/v1/events/{eventId}/prepayments/refund-rules` | `MeetingPrepaymentController#saveRefundRules` | [MeetingPrepaymentController.java:100](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java#L100) |
| `POST /webhooks/meeting-settlement/{providerCode}/virtual-account/deposit` | `VirtualAccountWebhookController#onDeposit` | [VirtualAccountWebhookController.java:52](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/virtualaccount/VirtualAccountWebhookController.java#L52) |
| `POST /webhooks/meeting-settlement/virtual-account/deposit` | `VirtualAccountWebhookController#onDepositLegacy` | [VirtualAccountWebhookController.java:70](https://github.com/endside82/community_api/blob/19e968a1aa128d3cf8b980413e87c397fffe91b3/src/main/java/com/endside/community/payment/meeting/virtualaccount/VirtualAccountWebhookController.java#L70) |

- 공급자 코드가 있는 경로는 onDeposit, 옛 고정 주소는 onDepositLegacy가 처리한다. 처리 함수가 없다는 옛 설명도 정정했다.
<!-- source-references:end -->

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

이벤트 시작 전 호스트가 참가확정 조건으로 선입금을 받는다. 참가자는 POINT 또는 BANK_TRANSFER로 선입금하고, BANK는 호스트가 수동 확인한다. 환불 규칙은 **별도 `meeting_refund_rule` 테이블**에 저장(카탈로그 저장 범위 외)되며, 계산 엔진은 MeetingRefundRule→transient EventRefundPolicy 변환으로 공통 `RefundPolicyService.computeRefund`를 재사용한다(저장하지 않음). 가상계좌 입금 통지는 공급자 확인·서명 검증·전달 이력 저장 뒤 `MeetingSettlementTransferService#confirmVirtualAccountDeposit`으로 연결된다. 기본 모의 공급자의 서명 검증 실패와 실제 공급자의 동작은 구분한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/prepayments | MeetingPrepaymentController#getPrepayments | required | 선입금 리스트 |
| POST | /api/v1/events/{eventId}/prepayments/pay | MeetingPrepaymentController#payPrepayment | required | 선입금 결제 |
| PATCH | /api/v1/events/{eventId}/prepayments/{id}/confirm | MeetingPrepaymentController#confirmBankPrepayment | required | BANK 선입금 수동 확인 (호스트) |
| POST | /api/v1/events/{eventId}/prepayments/{id}/refund | MeetingPrepaymentController#refundPrepayment | required | 선입금 환불 (참가자 본인) |
| GET | /api/v1/events/{eventId}/prepayments/refund-rules | MeetingPrepaymentController#getRefundRules | required | 환불 규정 조회 |
| POST | /api/v1/events/{eventId}/prepayments/refund-rules | MeetingPrepaymentController#saveRefundRules | required | 환불 규정 저장 (호스트) |
| POST | /webhooks/meeting-settlement/{providerCode}/virtual-account/deposit | VirtualAccountWebhookController#onDeposit | 외부 PG 서명 검증 | 공급자 코드에 해당하는 결제사로 검증·처리 |
| POST | /webhooks/meeting-settlement/virtual-account/deposit | VirtualAccountWebhookController#onDepositLegacy | 외부 PG 서명 검증 | 기존 주소의 호환 처리. 발급 공급자를 선택해 동일 처리로 위임 |

### 의존 단위 / 외부 시스템

- Unit 06 (Wallet): `WalletService.deductPaidOnly`, `creditMeetingSettlement` (POINT 결제/환불)
- Unit 06 (Accounting): `AccountingLedgerService.recordMeetingPrepayment`, `recordMeetingPrepaymentRefund`
- Unit 03 (Event): `Event.startTime` (환불률 계산용), 호스트 검증
- 외부 PG (가상계좌): 위 두 수신 주소와 입금 확인 처리 함수가 있다. 실제 공급자 설정·계약·입금 왕복과 공개 여부는 [첫 출시 현황](../../../docs/qa/launch-status.html)을 따른다. 소스 위치 확인만으로 실거래 완료로 세지 않는다.

### EVENT_PREPAYMENT 정산 집계 계약 (Fact)

> **Fact (2026-06-04, 커밋 6c5988e)**: 결제 CTA가 `WalletService.pay`(referenceType=`EVENT_PAYMENT`)에서 `EventPrepaymentService.payByWallet`(referenceType=`EVENT_PREPAYMENT`)로 이관된 이후, 정산 집계가 `EVENT_PREPAYMENT` 거래를 포함하도록 4종 메서드가 업데이트되었다. 소스: `PointTransactionQueryRepositoryDataJpaTest.java:41-185` (배포 게이트 테스트).

| 메서드 | 계약 |
|---|---|
| `calculateNetPaymentByEventId(eventId)` | `EVENT_PAYMENT`(레거시, referenceId=eventId) + `EVENT_PREPAYMENT`(referenceId=event_payment.id, 서브쿼리로 eventId 복원) 중복없이 합산. COMPLETED인 row만 포함. |
| `calculateNetPaymentByEventIdAndPeriod(eventId, start, end)` | 위와 동일 + [start, end) 경계 필터. start 포함, end 배제. |
| `calculatePaidNetPaymentByEventIdAndPeriod(...)` | paid 분리 합산 (`EVENT_PREPAYMENT.paidAmount` 포함) |
| `calculateFreeNetPaymentByEventIdAndPeriod(...)` | free 분리 합산 (`EVENT_PREPAYMENT.freeAmount` 포함) |

referenceType 2종 통합 의미: 동일 이벤트에 대해 `EVENT_PAYMENT` 레거시 거래와 `EVENT_PREPAYMENT` 신규 거래가 공존할 수 있으며, 두 유형을 합산해야 정확한 정산 금액이 산출된다.

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
