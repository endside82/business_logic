# F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트(또는 정산 생성자)가 참가자가 외부 계좌로 송금한 건에 대해 수동으로 "확인" 처리한다. 다건을 한번에 확인하는 일괄 확인, 만료된 transfer의 재발행(reissue), 회수 불가 transfer의 상각(writeoff)을 처리한다. 모든 transfer가 COMPLETED + 모든 share가 COMPLETED일 때 settlement가 자동 COMPLETED로 전이된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 현황 화면(SCR-MS-002) → "이체 내역" 진입 → `transfer_list_screen`
- 참가자가 외부 송금 후 "확인 요청" 알림 → 호스트 푸시 → 딥링크
- 만료 transfer 알림 → reissue/writeoff 진입

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-06_host-confirm-transfers/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-06_host-confirm-transfers/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-06_host-confirm-transfers/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-06_host-confirm-transfers/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:180` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:191` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:217` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:226` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:235` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:305` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

화면 진입 시:
1. `transferListProvider(eventId)` — 탭 인덱스에 따라 `getTransfers` 또는 `getMyTransfers`
2. `eventDetailNotifierProvider(eventId)` ▶ host/staff 판정
3. `appealsProvider(eventId)` ▶ PENDING appeal 표시

이체 확인 액션:
1. `transferListProvider(eventId).confirmTransfer(transferId)` ▶ `PATCH .../transfers/{id}/confirm`
2. invalidate `transferListProvider`, `summaryProvider`, `detailProvider`
3. 토스트

일괄 확인 액션:
1. `pendingTransfers = transfers.where(status==PENDING)`
2. 확인 다이얼로그
3. `settlementBulkActionProvider(eventId).bulkConfirmTransfers(ids)` ▶ `PATCH .../bulk-confirm`
4. 결과 카운팅 토스트

재요청 액션:
1. 확인 다이얼로그
2. `transferListProvider.reissueTransfer(transferId)` ▶ `POST .../transfers/{id}/reissue`
3. invalidate

상각 액션:
1. 사유 입력 다이얼로그
2. `transferListProvider.writeoffTransfer(transferId, reason)` ▶ `POST .../transfers/{id}/writeoff`
3. invalidate

## 4. 서버 계약

### 개요

호스트(또는 정산 생성자)가 참가자가 외부 계좌로 송금한 건에 대해 수동으로 "확인" 처리한다. 다건을 한번에 확인하는 일괄 확인, 만료된 transfer의 재발행(reissue), 회수 불가 transfer의 상각(writeoff)을 처리한다. 모든 transfer가 COMPLETED + 모든 share가 COMPLETED일 때 settlement가 자동 COMPLETED로 전이된다.

### 의존 단위 / 외부 시스템

- Unit 12 (Notification): `MEETING_SETTLEMENT_PAID`, `MEETING_SETTLEMENT_TRANSFER_REISSUED`, `MEETING_SETTLEMENT_COMPLETED`
- F07-08 (Appeal): `appealService.hasPendingAppeal` 차단
- 외부 시스템: FCM

## 5. 프론트 계약

### 진입 경로

- 정산 현황 화면(SCR-MS-002) → "이체 내역" 진입 → `transfer_list_screen`
- 참가자가 외부 송금 후 "확인 요청" 알림 → 호스트 푸시 → 딥링크
- 만료 transfer 알림 → reissue/writeoff 진입

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement/transfers` | `transfer_list_screen.dart` | 호스트 이체 확인/관리 + 참가자 결제 (단일 화면) |
| (위젯) | `widgets/transfer_card_widget.dart` | 이체 카드 (호스트/참가자 분기 액션) |
| (위젯) | `widgets/transfer_status_badge_widget.dart` | 상태 배지 |
| (위젯) | `widgets/settlement_action_bar_widget.dart` | 상단 일괄 확인 / 미납자 알림 |

### 화면별 구성 요소 & 액션

### 이체 내역 화면 — 호스트 뷰
- **사용자가 보는 것 (전체 탭)**:
  - `TabBar` "전체"/"내 이체" — 전체에서 호스트는 모든 transfer 카드 노출
  - 카드 정보: 송금자→수취자 아바타·이름, 금액, status 배지(`PENDING/COMPLETED/CANCELLED/EXPIRED/REVERSAL_FAILED/PENDING_MANUAL_REFUND`), `paymentMethod`
  - 상단 `SettlementActionBarWidget` 액션 — 호스트 권한이면 "일괄 확인" / "미납자 알림"(F07-07) 노출
- **호스트가 할 수 있는 액션**:
  - 카드 PENDING → "이체 확인" 탭 ▶ `PATCH .../transfers/{id}/confirm` ▶ 토스트 "이체가 확인되었습니다"
  - 상단 "일괄 확인" 탭 ▶ 확인 다이얼로그 ("X건 (총 Y원)의 이체를 확인하시겠습니까?") ▶ `PATCH .../transfers/bulk-confirm` body `{transferIds:[...]}`
    - 응답 `{success, failed, failures}` 받아 토스트
    - failed=0: "X건 확인 완료" (success 톤)
    - failed>0: "X건 성공, Y건 실패" (error 톤)
  - 카드 EXPIRED + 본인이 정산 생성자 → "재요청" 탭 ▶ 확인 다이얼로그 ("재요청 횟수: X/2") ▶ `POST .../transfers/{id}/reissue`
  - 카드 EXPIRED + 정산 생성자 → "송금 포기(상각)" 탭 ▶ 다이얼로그 (사유 입력 maxLength 500, 옵션) ▶ `POST .../transfers/{id}/writeoff` body `{reason?}`

### 일괄 확인 다이얼로그
- 메시지: `${pendingCount}건 (총 ${formatter.format(totalAmount)}원)의\n이체를 확인하시겠습니까?`
- pending이 0건이면 "확인할 이체가 없습니다" 토스트만

### 재요청 / 상각 다이얼로그
- **재요청**: `AppDialog.confirm` "만료된 송금을 재요청합니다.\n새로운 PENDING 이체가 생성되고 송금자에게 알림이 전송됩니다.\n\n금액: N원\n재요청 횟수: X/2", confirmLabel "재요청"
- **상각**: AlertDialog
  - 메시지: "만료된 송금을 포기합니다.\n이체가 취소 처리되며 되돌릴 수 없습니다.\n\n금액: N원"
  - 사유 입력 (선택, maxLength 500)
  - "포기" 버튼은 `AppColors.error500`

### API 호출 순서 (Provider/Repository 관점)

화면 진입 시:
1. `transferListProvider(eventId)` — 탭 인덱스에 따라 `getTransfers` 또는 `getMyTransfers`
2. `eventDetailNotifierProvider(eventId)` ▶ host/staff 판정
3. `appealsProvider(eventId)` ▶ PENDING appeal 표시

이체 확인 액션:
1. `transferListProvider(eventId).confirmTransfer(transferId)` ▶ `PATCH .../transfers/{id}/confirm`
2. invalidate `transferListProvider`, `summaryProvider`, `detailProvider`
3. 토스트

일괄 확인 액션:
1. `pendingTransfers = transfers.where(status==PENDING)`
2. 확인 다이얼로그
3. `settlementBulkActionProvider(eventId).bulkConfirmTransfers(ids)` ▶ `PATCH .../bulk-confirm`
4. 결과 카운팅 토스트

재요청 액션:
1. 확인 다이얼로그
2. `transferListProvider.reissueTransfer(transferId)` ▶ `POST .../transfers/{id}/reissue`
3. invalidate

상각 액션:
1. 사유 입력 다이얼로그
2. `transferListProvider.writeoffTransfer(transferId, reason)` ▶ `POST .../transfers/{id}/writeoff`
3. invalidate

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트 단건 확인) 참가자 1명의 계좌이체를 확인 | settlement ACTIVE, transfer 5건 (1건 PENDING 계좌이체 대기) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S2 | (Happy Path · 호스트 일괄 확인) 5건을 한 번에 확인 | 5건 PENDING (모두 계좌이체) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (엣지 · 일괄 확인 부분 실패) 일부 transfer가 이미 ALREADY_COMPLETED | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (호스트 · EXPIRED 재요청) 30일 경과한 transfer 재발행 | `MeetingSettlementExpirationScheduler`가 transfer 1건을 EXPIRED로 전이, reissueCount=0 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (호스트 · 상각/포기) 회수 불가능한 transfer 정리 | transfer EXPIRED, 사용자 연락 두절 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (참가자 · 자기 share 확인 시도) 본인이 자기 share confirm | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (엣지 · 자동 COMPLETED 트리거) 마지막 transfer confirm 시 정산 자동 완료 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · appeal 차단) PENDING appeal이 있는 transfer를 confirm 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | frontend.md:83 | - **포기 버튼 색상**: `AppColors.error500` 강조 (위험 액션) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:86 | - **호스트가 자기 share를 직접 confirm할 수 없는 가드**: UI에서 호스트 본인 share 카드의 confirm 버튼 숨김 (백엔드 403 가드 보강) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 단건 확인) 참가자 1명의 계좌이체를 확인**: Given settlement ACTIVE, transfer 5건 (1건 PENDING 계좌이체 대기) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. (Happy Path · 호스트 일괄 확인) 5건을 한 번에 확인**: Given 5건 PENDING (모두 계좌이체) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 일괄 확인 부분 실패) 일부 transfer가 이미 ALREADY_COMPLETED**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (호스트 · EXPIRED 재요청) 30일 경과한 transfer 재발행**: Given `MeetingSettlementExpirationScheduler`가 transfer 1건을 EXPIRED로 전이, reissueCount=0 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (호스트 · 상각/포기) 회수 불가능한 transfer 정리**: Given transfer EXPIRED, 사용자 연락 두절 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (참가자 · 자기 share 확인 시도) 본인이 자기 share confirm**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (엣지 · 자동 COMPLETED 트리거) 마지막 transfer confirm 시 정산 자동 완료**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · appeal 차단) PENDING appeal이 있는 transfer를 confirm 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
