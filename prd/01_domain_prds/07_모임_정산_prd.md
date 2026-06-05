# 07. 모임 정산 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-06-05 (DRAFT 미리보기 정식화 D-OPEN-2); unit: business_logic/units/07_meeting_settlement -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/07_meeting_settlement/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

> **2026-06-05 DRAFT 미리보기 정식화(D-OPEN-2 해소).** 준비 중(DRAFT) 정산의 참가자 노출이 "설계되지 않은 노출"에서 **공식 미리보기 기능**으로 확정됐다 (결정 DEC-V1~V9, canonical: `community_api/docs/plan/DRAFT_SETTLEMENT_VISIBILITY_PLAN.md`, 서버 426c26d·94c4869 + 앱 7ba69c0). 핵심: ① **차등 노출(서버 강제)** — DRAFT && 비호스트는 총액·상태·내 분담금만(note 마스킹/summary 본인 행만/items 빈 목록/영수증 URL 거부), ② **DRAFT 이의제기 차단** — 유일하게 잠기지 않았던 문을 닫아 "확정 전 무행동" 완성, ③ **열람 자격 확장** — ATTENDING ∪ 해당 정산 share/transfer 당사자 ∪ 호스트(`validateSettlementReadAccess` 신설, 기존 술어 보존), ④ **호스트 평판 집계에서 DRAFT 제외**, ⑤ **지갑 모임정산 목록 DRAFT 포함+마스킹** — 같은 날 후속 슬라이스(api c8977c5/app 8c60999)로 지갑 모임정산 목록 화면(SCR-PA-005)까지 완성, ⑥ **이벤트 상세 "모임 정산" 입구 신설**(호스트‖ATTENDING 항상 노출, 정산 없으면 빈 상태/생성 CTA — 발견 경로는 이 입구와 지갑 목록 둘). 알림은 현행대로 "정산 신청" 시점에만(준비 중 알림 신설 없음). 상세: [F07-04 §7-A](../02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md), [F07-08 §7-A](../02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md), [F07-10 §7-A](../02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md).

> **2026-05-28 RM 도메인 신설 영향(cross-ref).** `Settlement` 엔티티 확장: `event_id` `long`→`Long` nullable + `regular_meeting_id` Long + `reserved_refund` BigDecimal 신규. DDL `uk_settlement_rm(regular_meeting_id)` UNIQUE + `CHECK ((event_id IS NULL) <> (regular_meeting_id IS NULL))`로 양립 불가. `failed_refund.event_id` nullable + `regular_meeting_id` 추가(결정 K). **flow-through 정산 모델**: RM은 `retainedPaid`만 호스트 수익(gross), `retainedFree`는 `freePointSubsidy`로 분리(플랫폼 보조, payout 비대상). close→**afterCommit**→`tryCreateSettlement(REQUIRES_NEW)` 다층 방어 + 1h failsafe 스케줄러. `SettlementService.completeSettlement` 재사용 + `reservedRefund.signum() > 0` 게이트 추가. 자세한 내용은 [17 정기모임 F17-10](../02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md).

## 1. 결론

호스트가 종료된 오프라인 모임의 회비/비용을 참가자들에게 분담시키고, 참가자가 포인트(지갑) 또는 계좌이체로 납부하여 정산을 완료하는 사용자 흐름.
정산 상태 모델: **DRAFT(생성) → ACTIVE(활성/PAYING) → COMPLETED(PAID)** 또는 **CANCELLED**.
Settlement 도메인의 정산 단계와 별개로, 정산은 항목/이체/선입금/이의제기/감사로그/리마인드 등 다층 흐름을 가진다.
종료된 이벤트에 대해 호스트가 균등 분할 / 항목별 분할 / 비율 분할 등 정산 모드를 선택하고 메모를 작성해 정산을 **DRAFT 상태로 생성**한다.
항목별 분할 모드일 때 항목명·금액·카테고리·참여자를 추가/수정/삭제하여 분담금을 산출한다. 호스트는 본인이 과거 입력한 최근 항목을 칩(chip)으로 빠르게 재사용할 수 있다.
호스트가 DRAFT 정산을 **ACTIVE**로 활성화하면 모든 참가자에게 납부 알림이 발송되고, 분담금 결제가 가능해진다. 활성화된 정산은 호스트 권한으로 취소(CANCEL)할 수 있다.
정산 본체·요약(총액/1인당/납부진척률)·참여자 상태 리스트·항목별 영수증 이미지를 조회한다. 열람 자격은 ATTENDING 참가자 ∪ 해당 정산 share/transfer 당사자 ∪ 호스트(2026-06-05 확장). DRAFT 단계는 참가자에게 미리보기 수위(총액·상태·내 분담금만)로 차등 노출된다.
참가자가 본인에게 할당된 분담금을 **포인트(지갑) 또는 계좌이체**로 납부한다. 포인트는 즉시 차감 처리되고, 계좌이체는 호스트의 수동 확인이 필요하다. 포인트+계좌이체 혼합 결제 및 자기환불·재발행도 지원.
참가자가 계좌이체로 납부한 건을 호스트가 수동 확인하여 완료 처리한다. 다건 일괄 확인과, 회수 불가 분담금의 상각(write-off) 처리 가능. 모든 이체 확인이 완료되면 정산 상태가 자동 **COMPLETED**로 전이.
호스트가 미납 참가자에게 푸시 리마인드를 발송하거나, 정산 마감 기한을 연장한다. 리마인드 이력도 조회 가능 (E-02 푸시 리마인드 기능).
참가자는 자신의 분담금 산정에 이의를 제기할 수 있고, 호스트는 이의를 검토해 수락/기각 처리한다. 정산 변경 내역은 감사 로그(audit log)로 페이지네이션 조회된다.
이벤트 시작 전 참가확정의 조건으로 선입금을 받는다. 참가자는 포인트/계좌이체로 선입금하고, 호스트는 계좌이체 입금을 수동 확인 또는 환불 처리한다. 호스트는 이벤트 시점 기준 N일 전 환불률을 정의하는 환불 규칙을 설정한다.
정산 수령용 계좌 등록·기본계좌 설정, 본인의 정산 참여 이력 및 월별 요약 조회, 다른 호스트의 정산 신뢰도(완료율·평균 완료시간·취소율·이의율) 조회를 위한 개인 영역 기능들.
백엔드 Settlement 도메인의 `PENDING → APPROVED → PAYING → PAID/FAILED/REJECTED` 5단계와는 별개로,
Meeting Settlement(모임 정산)은 사용자에게 노출되는 **DRAFT/ACTIVE/COMPLETED/CANCELLED** 4단계 모델을 따른다 (UI/UX 21번 문서 기준).

이 도메인은 기능 PRD 10개로 구성된다. 현재 기능별 trace source는 총 39개이고, risk 후보는 총 24개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F07-01 | F07-01. 모임 정산 생성 (Create Settlement) | [F07-01_create-settlement_prd.md](../02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | [F07-01_create-settlement](../../units/07_meeting_settlement/F07-01_create-settlement) | 전환 완료 | 3 | 2 |
| F07-02 | F07-02. 정산 항목 관리 (Settlement Items CRUD) | [F07-02_settlement-items_prd.md](../02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | [F07-02_settlement-items](../../units/07_meeting_settlement/F07-02_settlement-items) | 전환 완료 | 4 | 2 |
| F07-03 | F07-03. 정산 활성화/취소 (Activate / Cancel) | [F07-03_activate-cancel_prd.md](../02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | [F07-03_activate-cancel](../../units/07_meeting_settlement/F07-03_activate-cancel) | 전환 완료 | 2 | 1 |
| F07-04 | F07-04. 정산 현황 / 요약 / 영수증 (Status & Summary & Receipt) | [F07-04_status-summary-receipt_prd.md](../02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | [F07-04_status-summary-receipt](../../units/07_meeting_settlement/F07-04_status-summary-receipt) | 전환 완료 | 3 | 2 |
| F07-05 | F07-05. 분담금 납부 (Pay Share / Transfer) | [F07-05_pay-share_prd.md](../02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | [F07-05_pay-share](../../units/07_meeting_settlement/F07-05_pay-share) | 전환 완료 | 7 | 2 |
| F07-06 | F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) | [F07-06_host-confirm-transfers_prd.md](../02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | [F07-06_host-confirm-transfers](../../units/07_meeting_settlement/F07-06_host-confirm-transfers) | 전환 완료 | 6 | 2 |
| F07-07 | F07-07. 미납자 리마인드 / 마감 연장 (Remind Unpaid & Extend Deadline) | [F07-07_remind-extend_prd.md](../02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | [F07-07_remind-extend](../../units/07_meeting_settlement/F07-07_remind-extend) | 전환 완료 | 3 | 3 |
| F07-08 | F07-08. 정산 이의제기 / 처리 / 감사로그 (Appeal & Audit Log) | [F07-08_appeal-audit_prd.md](../02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md) | [F07-08_appeal-audit](../../units/07_meeting_settlement/F07-08_appeal-audit) | 전환 완료 | 4 | 0 |
| F07-09 | F07-09. 선입금 결제 / 확인 / 환불 / 환불규정 (Prepayment & Refund Rules) | [F07-09_prepayment-refund_prd.md](../02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | [F07-09_prepayment-refund](../../units/07_meeting_settlement/F07-09_prepayment-refund) | 전환 완료 | 7 | 7 |
| F07-10 | F07-10. 정산 계좌 / 내 정산 이력 / 호스트 신뢰도 (Account, History, Reputation) | [F07-10_account-history-reputation_prd.md](../02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | [F07-10_account-history-reputation](../../units/07_meeting_settlement/F07-10_account-history-reputation) | 전환 완료 | 0 | 3 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F07-09](../02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | F07-09. 선입금 결제 / 확인 / 환불 / 환불규정 (Prepayment & Refund Rules) | Risk 후보 7 |
| [F07-10](../02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | F07-10. 정산 계좌 / 내 정산 이력 / 호스트 신뢰도 (Account, History, Reputation) | Risk 후보 3, trace 없음 |
| [F07-07](../02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | F07-07. 미납자 리마인드 / 마감 연장 (Remind Unpaid & Extend Deadline) | Risk 후보 3 |
| [F07-01](../02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | F07-01. 모임 정산 생성 (Create Settlement) | Risk 후보 2 |
| [F07-04](../02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | F07-04. 정산 현황 / 요약 / 영수증 (Status & Summary & Receipt) | Risk 후보 2 |
| [F07-02](../02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | F07-02. 정산 항목 관리 (Settlement Items CRUD) | Risk 후보 2 |
| [F07-06](../02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) | Risk 후보 2 |
| [F07-05](../02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | F07-05. 분담금 납부 (Pay Share / Transfer) | Risk 후보 2 |
| [F07-03](../02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | F07-03. 정산 활성화/취소 (Activate / Cancel) | Risk 후보 1 |

## 4. 도메인 기능 목록

### 관점별 기능 분리

이 단위는 두 사용자 관점을 명확히 분리한다.

- **호스트(Host) 관점**: 정산 생성·항목 관리·활성화·독촉·확인·취소·환불 규정 운영
- **참가자(Participant) 관점**: 분담금 확인·납부·이의제기·이력 조회

정산 상태(DRAFT/ACTIVE/COMPLETED/CANCELLED)에 따라 노출/허용 액션이 달라지는 부분은 각 기능 설명에 명시한다.

---

### 핵심 기능 목록 (M=10)

### F07-01. 모임 정산 생성 (Create Settlement) — 호스트
> 종료된 이벤트에 대해 호스트가 균등 분할 / 항목별 분할 / 비율 분할 등 정산 모드를 선택하고 메모를 작성해 정산을 **DRAFT 상태로 생성**한다.

- **관점**: 호스트
- **상태**: 신규 → **DRAFT (PENDING)**
- **UI/UX**: SCR-MS-001 (모임 정산 생성), Quick-add (settlement_quick_add_screen)
- **API**:
  - `POST /api/v1/events/{eventId}/settlement` — `MeetingSettlementAddParam(note, settlementMode)`로 정산 본체 생성
  - `POST /api/v1/events/{eventId}/settlement/clone` — `MeetingSettlementCloneParam(sourceSettlementId, copyNote)` 기존 정산 복제
  - `GET /api/v1/events/{eventId}/settlement/participant-suggestions` — 이벤트 참석자 기반 참여자 추천
- **Frontend**: `screens/settlement_create_screen.dart`, `screens/settlement_quick_add_screen.dart`, `widgets/settlement_mode_selector_widget.dart`, `widgets/equal_split_form_widget.dart`, `widgets/custom_split_form_widget.dart`, `widgets/ratio_split_form_widget.dart`, `widgets/split_type_selector_widget.dart`, `widgets/clone_settlement_sheet.dart`, `widgets/participant_selector_widget.dart`

---

### F07-02. 정산 항목 관리 (Settlement Items CRUD) — 호스트
> 항목별 분할 모드일 때 항목명·금액·카테고리·참여자를 추가/수정/삭제하여 분담금을 산출한다. 호스트는 본인이 과거 입력한 최근 항목을 칩(chip)으로 빠르게 재사용할 수 있다.

- **관점**: 호스트
- **상태**: DRAFT 상태에서만 자유 편집 (활성화 후엔 감사로그가 변경 추적)
- **UI/UX**: SCR-MS-003 (정산 항목 관리)
- **API**:
  - `POST /api/v1/events/{eventId}/settlement/items` — `MeetingSettlementItemParam` 항목 추가
  - `PUT /api/v1/events/{eventId}/settlement/items/{itemId}` — 항목 수정
  - `DELETE /api/v1/events/{eventId}/settlement/items/{itemId}` — 항목 삭제
  - `GET /api/v1/users/me/settlement-items/recent?limit=&category=` — 호스트 본인 최근 항목 자동완성 (E-01 옵션 D)
- **Frontend**: `screens/settlement_items_screen.dart`, `widgets/settlement_item_card_widget.dart`, `widgets/settlement_item_form_dialog.dart`, `widgets/item_type_selector_widget.dart`

---

### F07-03. 정산 활성화/취소 (Activate / Cancel) — 호스트
> 호스트가 DRAFT 정산을 **ACTIVE**로 활성화하면 모든 참가자에게 납부 알림이 발송되고, 분담금 결제가 가능해진다. 활성화된 정산은 호스트 권한으로 취소(CANCEL)할 수 있다.

- **관점**: 호스트
- **상태 전이**: DRAFT → **ACTIVE** / ACTIVE → **CANCELLED** (이미 납부된 금액은 환불 처리)
- **UI/UX**: SCR-MS-002 (정산 현황) 액션 영역
- **API**:
  - `PATCH /api/v1/events/{eventId}/settlement/activate` — `MeetingSettlementActivateParam` (옵션, `required=false`)
  - `PATCH /api/v1/events/{eventId}/settlement/cancel` — 정산 취소
  - 권한: `validateSettlementCreatorOrHost` (정산 생성자 또는 이벤트 호스트)
- **Frontend**: `screens/settlement_status_screen.dart`, `widgets/settlement_action_bar_widget.dart`, `widgets/settlement_summary_card_widget.dart`

---

### F07-04. 정산 현황 / 요약 / 영수증 조회 (Status & Summary & Receipt) — 호스트 + 참가자
> 정산 본체·요약(총액/1인당/납부진척률)·참여자 상태 리스트·항목별 영수증 이미지를 조회한다. 열람 자격은 `validateSettlementReadAccess`(ATTENDING ∪ 해당 정산 share/transfer 당사자 ∪ 호스트, 2026-06-05).

- **관점**: 호스트 + 참가자 (공통 조회)
- **상태**: 모든 상태 (DRAFT/ACTIVE/COMPLETED/CANCELLED) — 단 DRAFT && 비호스트는 차등 노출(note 마스킹·summary 본인 행만·items 빈 목록·영수증 URL 거부, DEC-V6)
- **UI/UX**: SCR-MS-002 (정산 현황) — DRAFT 참가자는 "정산자가 작성 중이에요" 미리보기 배너, 정산 부재 시 빈 상태/생성 CTA. 이벤트 상세 "모임 정산" 입구로 진입(2026-06-05 신설)
- **API**:
  - `GET /api/v1/events/{eventId}/settlement` — 정산 본체 조회 (`validateSettlementReadAccess`)
  - `GET /api/v1/events/{eventId}/settlement/summary` — 정산 요약 (총액·납부 현황)
  - `GET /api/v1/events/{eventId}/settlement/receipts/{fileId}/download-url` — 영수증 presigned URL
- **Frontend**: `screens/settlement_status_screen.dart`, `screens/settlement_receipt_viewer_screen.dart`, `widgets/settlement_summary_card_widget.dart`, `widgets/participant_status_list_widget.dart`, `widgets/participant_share_card_widget.dart`, `widgets/settlement_receipt_gallery_widget.dart`

---

### F07-05. 분담금 납부 (Pay Share / Transfer) — 참가자
> 참가자가 본인에게 할당된 분담금을 **포인트(지갑) 또는 계좌이체**로 납부한다. 포인트는 즉시 차감 처리되고, 계좌이체는 호스트의 수동 확인이 필요하다. 포인트+계좌이체 혼합 결제 및 자기환불·재발행도 지원.

- **관점**: 참가자
- **상태**: ACTIVE 정산에서만 동작
- **UI/UX**: SCR-MS-005 (이체 내역) 참가자 뷰
- **API** (Share 단위):
  - `POST /api/v1/events/{eventId}/settlement/shares/{shareId}/pay` — 포인트로 분담금 결제
  - `PATCH /api/v1/events/{eventId}/settlement/shares/{shareId}/confirm` — 계좌이체 후 확인 요청
  - `GET /api/v1/events/{eventId}/settlement/my-shares` — 내 분담금 리스트
- **API** (Transfer 단위):
  - `GET /api/v1/events/{eventId}/settlement/transfers/me` — 내 이체 리스트
  - `POST /api/v1/events/{eventId}/settlement/transfers/{transferId}/pay` — 포인트 결제
  - `POST /api/v1/events/{eventId}/settlement/transfers/{transferId}/pay-mixed` — 포인트+계좌이체 혼합 (`MeetingSettlementMixedPayParam(pointAmount, bankTransferAmount)`)
  - `POST /api/v1/events/{eventId}/settlement/transfers/{transferId}/self-refund` — 본인 결제 자체 환불
  - `POST /api/v1/events/{eventId}/settlement/transfers/{transferId}/reissue` — 이체 재발행
- **Frontend**: `screens/my_settlement_shares_screen.dart`, `screens/transfer_list_screen.dart`, `widgets/my_share_row_card.dart`, `widgets/transfer_card_widget.dart`, `widgets/transfer_status_badge_widget.dart`, `utils/remit_url_builder.dart`

---

### F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) — 호스트
> 참가자가 계좌이체로 납부한 건을 호스트가 수동 확인하여 완료 처리한다. 다건 일괄 확인과, 회수 불가 분담금의 상각(write-off) 처리 가능. 모든 이체 확인이 완료되면 정산 상태가 자동 **COMPLETED**로 전이.

- **관점**: 호스트
- **상태 전이**: ACTIVE → (모든 transfer 확인 시) **COMPLETED**
- **UI/UX**: SCR-MS-005 (이체 내역) 호스트 뷰
- **API**:
  - `GET /api/v1/events/{eventId}/settlement/transfers` — 전체 이체 리스트 (호스트/참가자 공통)
  - `PATCH /api/v1/events/{eventId}/settlement/shares/{shareId}/confirm` — 분담금 단위 계좌이체 확인 (호스트가 클릭)
  - `PATCH /api/v1/events/{eventId}/settlement/transfers/{transferId}/confirm` — 이체 단위 확인
  - `PATCH /api/v1/events/{eventId}/settlement/transfers/bulk-confirm` — `MeetingSettlementBulkConfirmParam(transferIds[])` 일괄 확인 (호스트 권한)
  - `POST /api/v1/events/{eventId}/settlement/transfers/{transferId}/writeoff` — `MeetingSettlementTransferWriteoffParam(reason)` 회수 불가 상각
- **Frontend**: `screens/transfer_list_screen.dart`, `widgets/transfer_card_widget.dart`, `widgets/settlement_action_bar_widget.dart`

---

### F07-07. 미납자 리마인드 / 마감 연장 (Remind Unpaid & Extend Deadline) — 호스트
> 호스트가 미납 참가자에게 푸시 리마인드를 발송하거나, 정산 마감 기한을 연장한다. 리마인드 이력도 조회 가능 (E-02 푸시 리마인드 기능).

- **관점**: 호스트
- **상태**: ACTIVE 상태에서 사용
- **UI/UX**: SCR-MS-002 "독촉" 버튼
- **API**:
  - `POST /api/v1/events/{eventId}/settlement/remind` — `MeetingSettlementRemindParam` (옵션, `required=false`) 미납자 리마인드 발송
  - `PATCH /api/v1/events/{eventId}/settlement/extend-deadline` — `MeetingSettlementExtendDeadlineParam` 마감 연장
  - `GET /api/v1/events/{eventId}/settlement/remind-history` — `List<MeetingSettlementRemindLogVo>` 리마인드 이력
- **Frontend**: `screens/settlement_status_screen.dart`, `widgets/settlement_action_bar_widget.dart`

---

### F07-08. 정산 이의제기 / 처리 / 감사로그 (Appeal & Audit Log) — 참가자 + 호스트
> 참가자는 자신의 분담금 산정에 이의를 제기할 수 있고, 호스트는 이의를 검토해 수락/기각 처리한다. 정산 변경 내역은 감사 로그(audit log)로 페이지네이션 조회된다.

- **관점**: 참가자(생성), 호스트(처리), 양쪽(조회)
- **상태**: ACTIVE/COMPLETED에서만 생성 가능 — **DRAFT는 서버가 거부**(2026-06-05, DEC-V4. 그 전까지는 유일하게 잠기지 않은 문이었다)
- **UI/UX**: SCR-MS-002 보조 (이의제기 버튼) — `settlement_appeals_screen`, `settlement_audit_log_screen`
- **API**:
  - `POST /api/v1/events/{eventId}/settlement/appeals` — `MeetingSettlementAppealCreateParam` 이의 생성 (참가자/호스트)
  - `GET /api/v1/events/{eventId}/settlement/appeals` — 이의 리스트
  - `PATCH /api/v1/events/{eventId}/settlement/appeals/{appealId}/resolve` — `MeetingSettlementAppealResolveParam` 이의 처리 (호스트)
  - `GET /api/v1/events/{eventId}/settlement/audit-log?page=&size=` — `Page<MeetingSettlementAuditLogVo>` 감사 로그
- **Frontend**: `screens/settlement_appeals_screen.dart`, `screens/settlement_audit_log_screen.dart`

---

### F07-09. 선입금 결제 / 확인 / 환불 / 환불규정 (Prepayment & Refund Rules) — 호스트 + 참가자
> 이벤트 시작 전 참가확정의 조건으로 선입금을 받는다. 참가자는 포인트/계좌이체로 선입금하고, 호스트는 계좌이체 입금을 수동 확인 또는 환불 처리한다. 호스트는 이벤트 시점 기준 N일 전 환불률을 정의하는 환불 규칙을 설정한다.

- **관점**: 호스트(규정 설정/확인/환불), 참가자(결제/조회)
- **상태**: 정산 본체와 독립된 prepayment 흐름 (이벤트 사전 단계)
- **UI/UX**: SCR-MS-004 (선입금 관리), SCR-MS-006 (환불 규정)
- **API** (선입금):
  - `GET /api/v1/events/{eventId}/prepayments` — 선입금 리스트 (이벤트 참가자/호스트)
  - `POST /api/v1/events/{eventId}/prepayments/pay` — `MeetingPrepaymentPayParam` 선입금 결제 (참가자)
  - `PATCH /api/v1/events/{eventId}/prepayments/{id}/confirm` — 호스트 수동 확인 (계좌이체)
  - `POST /api/v1/events/{eventId}/prepayments/{id}/refund` — 환불 처리
- **API** (환불 규칙):
  - `GET /api/v1/events/{eventId}/prepayments/refund-rules` — 환불 규칙 조회
  - `POST /api/v1/events/{eventId}/prepayments/refund-rules` — `List<MeetingRefundRuleParam>` 환불 규칙 저장 (호스트 권한)
- **외부 시스템 (참고)**: 가상계좌 입금은 PG 측 webhook을 통해 인입되어 prepayment 상태를 자동 업데이트 (사용자 직접 호출 아님)
- **Frontend**: `screens/prepayment_screen.dart`, `screens/refund_rules_screen.dart`, `widgets/prepayment_card_widget.dart`, `widgets/prepayment_pay_dialog.dart`, `widgets/refund_rule_card_widget.dart`, `widgets/refund_timeline_widget.dart`, `widgets/refund_confirm_dialog.dart`

---

### F07-10. 정산 계좌 / 내 정산 이력 / 호스트 신뢰도 (Account, History, Reputation) — 횡단(개인 영역)
> 정산 수령용 계좌 등록·기본계좌 설정, 본인의 정산 참여 이력 및 월별 요약 조회, 다른 호스트의 정산 신뢰도(완료율·평균 완료시간·취소율·이의율) 조회를 위한 개인 영역 기능들.

- **관점**: 호스트(계좌 등록/이력) + 참가자(이력) + 모두(타 호스트 신뢰도)
- **상태**: 정산 상태와 무관 (개인/메타데이터)
- **UI/UX**: 프로필/세팅 영역에서 진입 (SCR-MS 본 화면 외 보조 화면)
- **API** (정산 계좌):
  - `GET /api/v1/users/me/bank-accounts` — 내 정산 계좌 리스트
  - `POST /api/v1/users/me/bank-accounts` — `SettlementBankAccountParam` 계좌 등록
  - `PUT /api/v1/users/me/bank-accounts/{id}` — 계좌 수정
  - `DELETE /api/v1/users/me/bank-accounts/{id}` — 계좌 삭제
  - `PATCH /api/v1/users/me/bank-accounts/{id}/default` — 기본 계좌 설정
- **API** (내 정산 이력):
  - `GET /api/v1/users/me/meeting-settlements` — 내 정산 참여 이력 (transfer 기반 집계 — DRAFT 미유입)
  - `GET /api/v1/users/me/meeting-settlements/monthly-summary?months=` — 월별 요약 (최대 24개월)
  - `GET /api/v1/wallet/meeting-settlements` — 내가 참여한 모임 정산 목록. 2026-06-05부터 "DRAFT && 본인 share" 포함 + 비생성자 DRAFT 행 마스킹(DEC-V9) + 행 `eventTitle` enrich. 소비처: 지갑 모임정산 목록 화면(SCR-PA-005, 같은 날 후속 완료 — [F07-10 §7-A](../02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md))
- **API** (호스트 신뢰도):
  - `GET /api/v1/users/{userId}/meeting-settlement-reputation` — `HostSettlementReputationVo` (완료율·평균 완료시간·취소율·이의율). "진행 중 건수"는 ACTIVE만 집계 — DRAFT 제외(2026-06-05, DEC-V5)
- **Frontend**: `screens/bank_account_screen.dart`, `screens/my_settlement_history_screen.dart`, `widgets/bank_account_card_widget.dart`, `widgets/bank_account_form_dialog.dart`, `widgets/host_reputation_badge.dart`

---

## 4-A. TransferStatus 전체값 및 limbo SLA 운영 정책 (2026-06-05 추가)

### TransferStatus 전체값 (Fact)

> 소스: `payment/meeting/constants/TransferStatus.java` (커밋 985f586, 2026-06-04). 상세 계약은 [F07-06](../02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) §4 참조.

| 값 | 의미 |
|---|---|
| `PENDING` | 결제/이체 대기 |
| `BANK_AWAITING_CONFIRM` | 혼합결제 은행 확인 대기 (limbo 대상) |
| `COMPLETED` | 완료 |
| `CANCELLED` | 취소됨 |
| `EXPIRED` | 만료 |
| `SUPERSEDED` | 재발급으로 대체된 원본 — 정산 완료 판정 제외 |
| `REVERSAL_FAILED` | 역분개 실패 |
| `PENDING_MANUAL_REFUND` | 역분개 실패 후 수동 환불 대기 (limbo 대상) |

> **DDL 정정 (해소 — 985f586)**: `status` 컬럼 varchar(20) → varchar(32). `BANK_AWAITING_CONFIRM`/`PENDING_MANUAL_REFUND` 모두 21자라 구 스키마에서 strict mode 영속 실패 잠재 버그 → 정정 완료.

### limbo SLA 운영 정책 요약

`BANK_AWAITING_CONFIRM` / `PENDING_MANUAL_REFUND` 상태가 **3일(기본값, `meeting-settlement.limbo-escalation-days`)** 이상 지속되면:

1. 관련 행위자(수취자/호스트)에게 자동 재알림 발화 (`MeetingSettlementExpirationScheduler`, 05:10 cron)
2. 2회 이상 미해소 시 `OperatorAlertType.SETTLEMENT_TRANSFER_LIMBO HIGH` 운영알림 자동 승급
3. 자동 만료(EXPIRED 전이) **없음** — 실제 돈이 움직였을 수 있어 자동 상태 전이 위험

상세: [F07-06 §4 limbo SLA 정책](../02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md), [F07-07 §8 limbo 재알림](../02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md).

## 5. 상태/권한/의존성

### 정산 상태 전이 요약 (참고)

```
DRAFT (생성 직후)
  │  POST /settlement                — 호스트 정산 생성
  │  POST /settlement/items          — 항목 추가/수정/삭제
  │  (참가자: 미리보기 read만 — 총액·상태·내 분담금.
  │   결제·이의 등 모든 행동 차단, 알림 0건)
  │
  ▼  PATCH /settlement/activate
ACTIVE (=PAYING, 납부 진행)
  │  POST /transfers/{id}/pay        — 참가자 포인트 결제
  │  PATCH /shares/{id}/confirm      — 호스트 계좌이체 확인
  │  PATCH /transfers/bulk-confirm   — 호스트 일괄 확인
  │  POST /remind                    — 호스트 미납 리마인드
  │  POST /appeals                   — 참가자 이의제기
  │
  ├──── 모든 transfer 확인 완료 ────▶  COMPLETED (=PAID)
  │
  └──── PATCH /settlement/cancel ───▶  CANCELLED
                                       (납부분 자동 환불)
```

> 백엔드 Settlement 도메인의 `PENDING → APPROVED → PAYING → PAID/FAILED/REJECTED` 5단계와는 별개로,
> Meeting Settlement(모임 정산)은 사용자에게 노출되는 **DRAFT/ACTIVE/COMPLETED/CANCELLED** 4단계 모델을 따른다 (UI/UX 21번 문서 기준).

### 유료/무료 포인트 분리정산 — 모임 정산은 PAID_ONLY

> 2026-05-24: 포인트 분리정산 반영. 정본은 `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

모임 정산 송금·회수·선입금은 참가자→호스트로 흐르는 **순수 P2P 채무 정산**이므로 사용처 분류상 **PAID_ONLY**다. 분담금·선입금 결제는 **유료(paid) 잔액만** 차감되고 무료 포인트로는 납부할 수 없다(실제 채무를 프로모션 포인트로 갚게 두지 않는다). 호스트에게 흘러간 정산금도 유료/무료 split이 보존되며, 호스트 외부 출금은 유료분만 현금화된다. flow-through/free-burn 등 다른 사용처는 06/08/04 도메인 PRD 참조.

### 외부 의존 (Cross-cutting / 단위 외)

- **Wallet (Unit 06)**: 포인트 결제 시 잔액 차감/충전 흐름 의존 (모임 정산은 PAID_ONLY — 유료 잔액만 차감)
- **Notification (Unit 12)**: 활성화·납부완료·확인·이의·리마인드 푸시 발송
- **Event (Unit 03)**: 정산 대상 이벤트와 참석자 목록 (참여자 추천에 사용)
- **File (인프라)**: 영수증 이미지 업로드 / presigned URL
- **외부 PG (가상계좌 webhook)**: prepayment 자동 입금 인입 — 사용자 직접 호출 아님 (별도 webhook controller)

## 6. 화면/API 매핑

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F07-09](../02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | F07-09. 선입금 결제 / 확인 / 환불 / 환불규정 (Prepayment & Refund Rules) | 7 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-07](../02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | F07-07. 미납자 리마인드 / 마감 연장 (Remind Unpaid & Extend Deadline) | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-10](../02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | F07-10. 정산 계좌 / 내 정산 이력 / 호스트 신뢰도 (Account, History, Reputation) | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-01](../02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | F07-01. 모임 정산 생성 (Create Settlement) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-02](../02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | F07-02. 정산 항목 관리 (Settlement Items CRUD) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-04](../02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | F07-04. 정산 현황 / 요약 / 영수증 (Status & Summary & Receipt) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-05](../02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | F07-05. 분담금 납부 (Pay Share / Transfer) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-06](../02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F07-03](../02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | F07-03. 정산 활성화/취소 (Activate / Cancel) | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
