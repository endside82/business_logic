# F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers -->

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

### TransferStatus 전체값 (Fact)

> 소스: `payment/meeting/constants/TransferStatus.java` (커밋 985f586, 2026-06-04)

| 값 | 의미 |
|---|---|
| `PENDING` | 결제/이체 대기 |
| `BANK_AWAITING_CONFIRM` | 혼합결제의 은행 부분 확인 대기 (21자 — 구 varchar(20) 영속 실패 잠재버그, varchar(32) 정정 완료) |
| `COMPLETED` | 완료 |
| `CANCELLED` | 취소됨 |
| `EXPIRED` | 만료 |
| `SUPERSEDED` | 재발급(reissue)으로 대체된 원본 — 정산 완료 판정에서 제외 |
| `REVERSAL_FAILED` | 역분개 실패 |
| `PENDING_MANUAL_REFUND` | 역분개 실패 후 수동 환불 대기 (21자 — 동일 varchar(32) 정정 완료) |

> **DDL 정정 (해소 — 985f586, 2026-06-04)**: `meeting_settlement_transfer.status` varchar(20) → varchar(32). `BANK_AWAITING_CONFIRM`/`PENDING_MANUAL_REFUND` 모두 21자로 구 스키마에서 strict mode 영속 실패 잠재 버그 해소.

### limbo SLA 정책 (Fact)

> 소스: `MeetingSettlementExpirationScheduler.java:139-275` (커밋 985f586, 2026-06-04). 이 스케줄러는 05:00 만료 스캔과 별도로 동작한다.

**대상 상태**: `BANK_AWAITING_CONFIRM`, `PENDING_MANUAL_REFUND` — 실제 돈이 움직였을 수 있는 중간 상태(limbo). 자동 만료 전이 금지(코드 주석 라인 112-122: "자동 EXPIRED 전이는 위험").

| 항목 | 값 |
|---|---|
| cron | `0 10 5 * * *` (매일 05:10) |
| SLA 간격 설정 키 | `meeting-settlement.limbo-escalation-days` (기본값 **3일**) |
| ShedLock 이름 | `meetingSettlementLimboEscalation`, lockAtMostFor=PT20M |
| 에스컬레이션 카운트 임계값 | `OPERATOR_ALERT_THRESHOLD = 2` (2회 이상이면 운영알림) |

**재알림 수신자 및 NotificationType**:

| limbo 상태 | 수신자 | NotificationType |
|---|---|---|
| `BANK_AWAITING_CONFIRM` | `toUserId`(수취자) + `creatorUserId`(호스트, 다를 경우) | `MEETING_SETTLEMENT_REMIND` |
| `PENDING_MANUAL_REFUND` | `toUserId`(수취자) | `MEETING_SETTLEMENT_REFUND_REQUIRED` |

**2회 이상 미해소 → 운영알림 승급**:
- `OperatorAlertType.SETTLEMENT_TRANSFER_LIMBO`, severity=`HIGH`
- idempotencyKey: `"SETTLEMENT_TRANSFER_LIMBO:{transferId}:{escalationCount}"`
- orphan 케이스(BANK_AWAITING_CONFIRM이지만 settlement가 비ACTIVE): 즉시 운영알림, idempotencyKey: `"SETTLEMENT_TRANSFER_LIMBO_ORPHAN:{transferId}"`

**DB 변경 (해소 — 985f586)**:
- 신규 컬럼: `limbo_escalated_at DATETIME DEFAULT NULL`, `limbo_escalation_count INT NOT NULL DEFAULT 0`
- 신규 인덱스: `idx_mst_limbo (status, limbo_escalated_at)`
- 상태 전이 없음: `limboEscalatedAt`/`limboEscalationCount` 갱신만 수행

### 송금 제안 반올림 + 운영 수동 처리 (2026-06-06 돈 흐름 무결성)

> **Fact (H19 해소 — 커밋 0bfe19e)**: 호스트 일괄 수금 송금 제안(`MeetingSettlementCalculator.suggestHostCollectTransfers`)이 10원 단위로 독립 반올림하면서 송금 채무 합 ≠ share 합이 되던 결함이 수정되어, 제안 송금액 합이 보존된다.

> **Fact (운영 수동 처리 — admin)**: limbo/실패 상태의 운영 복구 경로가 배선되었다. 소스: `community_admin_api ManageMeetingSettlementService.java:53-187`, `ManageMeetingSettlementController`.
> - **POINT_COMPENSATION 실입금(H12)**: 과거 "보상" 라벨인데 실 입금이 0이던 결함을 정정 — admin `resolveManualRefund(method=POINT_COMPENSATION)`이 수취자에게 실제 포인트를 입금(referenceType `MEETING_SETTLEMENT_POINT_COMPENSATION`, 멱등키 `MEETING_SETTLEMENT_POINT_COMPENSATION:{transferId}`).
> - **BANK_AWAITING_CONFIRM admin 전이(H13)**: 정산이 비ACTIVE여도 admin이 BANK_VERIFIED/POINT_COMPENSATION/WRITE_OFF로 상태를 전이할 수 있는 endpoint 배선(`resolveBankAwaitingConfirm`). 자동 만료는 limbo 원칙에 따라 비자동(수동 전이+에스컬레이션).
> - **REVERSAL_FAILED 회수실패 재처리(MED)**: retry 3회 소진 transfer에 admin `RESET_REVERSAL` 수동 재시도 경로 + 소진 시 1회성 멱등 운영자 경보(`OperatorAlertType.REVERSAL_EXHAUSTED`, 키 `REVERSAL_EXHAUSTED:{transferId}` — 상태 전이 없이 경보만). 과거 무로그·무알림 영구 제외 사각지대 해소.

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
  - 카드 정보: 송금자→수취자 아바타·이름, 금액, status 배지(`PENDING/BANK_AWAITING_CONFIRM/COMPLETED/CANCELLED/EXPIRED/SUPERSEDED/REVERSAL_FAILED/PENDING_MANUAL_REFUND`), `paymentMethod`
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
| 해소 | V1__init.sql:3002 | `meeting_settlement_transfer.status` varchar(20) — `BANK_AWAITING_CONFIRM`(21자)/`PENDING_MANUAL_REFUND`(21자) strict mode 영속 실패 잠재 버그 | **해소** — 985f586 (2026-06-04): varchar(32) 정정 완료 |
| 해소 | MeetingSettlementExpirationScheduler 없음 | limbo 상태(BANK_AWAITING_CONFIRM/PENDING_MANUAL_REFUND) 장기 방치 시 자동 알림·운영 에스컬레이션 없음 | **해소** — 985f586 (2026-06-04): 05:10 cron + ShedLock + 3일 SLA + 2회 이상 미해소 시 SETTLEMENT_TRANSFER_LIMBO HIGH 운영알림 구현 |
| Risk | `MeetingSettlementExpirationScheduler.java:120-122` | `BANK_AWAITING_CONFIRM` 첫 발송 앵커가 전용 진입 컬럼 없이 `createdAt` 폴백 사용. 결제가 transfer 생성보다 늦으면 첫 알림이 다소 이르게 발화 가능 (무해하나 인지 필요) | 인지 필요 — 영향 없음 |
| Risk | community_app | 서버 TransferStatus에 `SUPERSEDED`(재발급 대체) 추가됨. 앱 Flutter 모델 베이스라인 이후 변경 없어 미반영 가능성 있음 | Flutter `TransferStatus` enum에 `SUPERSEDED` 추가 여부 확인 필요 |
| 후보 | frontend.md:83 | - **포기 버튼 색상**: `AppColors.error500` 강조 (위험 액션) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:86 | - **호스트가 자기 share를 직접 confirm할 수 없는 가드**: UI에서 호스트 본인 share 카드의 confirm 버튼 숨김 (백엔드 403 가드 보강) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 해소 (2026-06-06) | MeetingSettlementCalculator.suggestHostCollectTransfers (0bfe19e), ManageMeetingSettlementService.java:53-187 | **송금 제안 반올림 합 보존(H19)·POINT_COMPENSATION 실입금(H12)·BANK_AWAITING admin 전이(H13)·REVERSAL 소진 재처리+경보(MED) 해소** — §4 "송금 제안 반올림 + 운영 수동 처리" 참조. | 없음 |

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
