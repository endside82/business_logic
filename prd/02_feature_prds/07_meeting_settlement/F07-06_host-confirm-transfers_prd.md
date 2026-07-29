# F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29 (혼합결제 은행분 확인 source-of-truth 재실측); unit: business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

현재 Flutter에서 일반 계좌이체 단건·일괄 확인은 정산 생성자가 수행하고, POINT+계좌이체 혼합 결제의 은행분은 수취자 또는 정산 생성자가 `받았어요`로 확인한다. 혼합결제 송금자는 정산 생성자이기도 해도 self-confirm할 수 없다. 다건 일괄 확인, 만료 transfer 재발행(reissue), 회수 불가 transfer 상각(writeoff)을 처리하며, 취소·대체 원본을 제외한 모든 transfer가 `COMPLETED`이고 모든 share도 완료될 때 settlement가 자동 `COMPLETED`로 전이된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 현황 화면(SCR-MS-002) → "이체 내역" 진입 → `transfer_list_screen`
- 외부 송금 또는 혼합결제 은행분을 확인해야 하는 사용자가 정산 이체 내역으로 진입
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

### 2026-07-29 직접 재실측 trace

| 계층 | 실제 소스 |
|---|---|
| 서버 endpoint | `MeetingSettlementController.confirmTransferBankPortion` |
| 서버 상태·권한·완료 | `MeetingSettlementTransferService.confirmBankPortion`, `isSettlementCreator`, `validateNoPendingAppeal`, `checkAndCompleteSettlement` |
| DTO/enum | `MeetingSettlementTransferVo`, `MeetingSettlementVo.creatorUserId`, `TransferStatus`, `MeetingPaymentMethod`, `MeetingSettlementStatus` |
| 서버 회귀 테스트 | `MeetingSettlementTransferServiceTest.ConfirmBankPortionTest`, `MeetingSettlementServiceTest.confirmBankPortion_rejectedWhenDraft`, `MeetingSettlementControllerTest.confirmTransferBankPortion_success` |
| Flutter CTA/caller | `transfer_list_screen.dart:_confirmBankPortion/canConfirmBankPortion`, `transfer_card_widget.dart`, `transfer_list_provider.dart`, Repository, Retrofit API |
| Flutter 테스트 | `transfer_actions_provider_test.dart`, `transfer_card_widget_test.dart`, `settlement_transfer_guidance_card_test.dart` |
| 일괄 처리/표시 Gap | `MeetingSettlementTransferService.bulkConfirmBankTransfers`; `transfer_list_screen.dart:_notifyUnpaid/_TransferSummaryStats` |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

화면 진입 시:
1. `transferListProvider(eventId)` — 탭 인덱스에 따라 `getTransfers` 또는 `getMyTransfers`
2. `settlementDetailProvider(eventId)`의 `creatorUserId`와 로그인 사용자 ID를 비교해 정산 생성자(`isHost`) 판정
3. `appealsProvider(eventId)` ▶ PENDING appeal 표시

혼합결제 은행분 확인 액션:
1. 화면이 `status == bankAwaitingConfirm && !isSender && (isRecipient || isHost)`를 계산
2. 조건이 참일 때만 카드에 callback을 넘겨 `받았어요` 노출
3. 되돌릴 수 없는 확인 다이얼로그에서 실제 입금 비검증 경고 확인
4. `transferListProvider.confirmBankPortion(transferId)` ▶ `POST .../transfers/{id}/confirm-bank-portion`
5. 현재 탭 목록 재조회 + `settlementDetailProvider` invalidate; 서버는 transfer 완료 및 settlement 완료 조건 재평가

이체 확인 액션:
1. `transferListProvider(eventId).confirmBankTransfer(transferId)` ▶ `PATCH .../transfers/{id}/confirm`
2. 현재 탭 목록 재조회 + `settlementDetailProvider` invalidate
3. 토스트

일괄 확인 액션:
1. 현재 탭 목록에서 `pendingTransfers = transfers.where(status==PENDING)`
2. 확인 다이얼로그
3. `settlementBulkActionProvider(eventId).bulkConfirmTransfers(ids)` ▶ `PATCH .../bulk-confirm`
4. 결과 카운팅 토스트

미납자 알림 버튼:
1. 현재 탭의 PENDING transfer로 안내 문자열을 만들지만 그 문자열은 사용하지 않는다.
2. 서버/알림 API 호출 없이 “미납자 N명에게 알림을 보냈습니다” 토스트만 표시한다.

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

현재 Flutter의 일반 계좌이체 확인/일괄 처리 CTA는 정산 생성자에게 노출되고, 혼합결제 은행분 확인 CTA는 송금자를 제외한 수취자 또는 정산 생성자에게 노출된다. 확인은 은행 API나 영수증 검증 결과가 아니라 사람이 실제 입금 내역을 보고 누르는 신뢰 선언이다.

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

### 혼합결제 은행분 확인 계약 (Fact, 2026-07-29)

**HTTP**

- `POST /api/v1/events/{eventId}/settlement/transfers/{transferId}/confirm-bank-portion`
- 요청 body/query 없음, 인증 사용자 필요, 성공 응답 `200` + body 없음
- Controller는 `transferService.confirmBankPortion(transferId, userId)`를 호출한다.

**서버 가드 순서**

1. transfer 존재 — 없으면 `MEETING_TRANSFER_NOT_FOUND`(404)
2. `status == BANK_AWAITING_CONFIRM` — 아니면 `MEETING_SETTLEMENT_TRANSFER_NOT_AWAITING_CONFIRM`(400)
3. `fromUserId != confirmerId` — 송금자는 `MEETING_SETTLEMENT_TRANSFER_SELF_CONFIRM`(403). **송금자이면서 정산 생성자여도 이 선행 가드에 차단**
4. `toUserId == confirmerId || settlement.creatorUserId == confirmerId` — 둘 다 아니면 `MEETING_TRANSFER_NOT_AUTHORIZED`(403)
5. settlement `ACTIVE` — DRAFT/COMPLETED/CANCELLED이면 `MEETING_SETTLEMENT_NOT_ACTIVE`(400)
6. transfer 대상 PENDING appeal 없음 — 있으면 `MEETING_SETTLEMENT_SUBJECT_UNDER_APPEAL`(409)

**성공 side effect**

- transfer: `BANK_AWAITING_CONFIRM → COMPLETED`, `completedAt=now`; `paymentMethod=MIXED`와 앞서 처리된 POINT 거래는 유지
- 감사로그: `TRANSFER_BANK_PORTION_CONFIRMED`; actorRole은 수취자가 누르면 `USER`, 정산 생성자 대리 확인이면 `HOST`
- 알림: 송금자에게 `MEETING_SETTLEMENT_PAID` / “계좌이체 부분 확인”
- 완료 재평가: `CANCELLED`/`SUPERSEDED`를 제외한 transfer가 모두 `COMPLETED`이고 모든 item share가 완료됐을 때, 현재 ACTIVE인 settlement만 `COMPLETED`로 바꾸고 시스템 감사로그·정산 생성자 완료 알림 발행

> **수기 확인 신뢰 경계:** endpoint에는 영수증·입금증·은행 조회 결과를 전달할 request DTO 자체가 없다. Flutter 안내 카드와 확인 다이얼로그도 “시스템은 실제 입금을 검증하지 않는다”고 명시한다. CTA를 누르는 사람은 외부 입금 내역을 직접 확인해야 한다.

### 일괄 확인 트랜잭션 경계 (Risk, 2026-07-29)

- `bulkConfirmBankTransfers`는 transfer ID를 순회하며 같은 service bean의 `confirmTransferBankTransfer`를 직접 호출하고 예외를 건별 `FailureDetail`로 수집한다.
- bulk method 자체에는 `@Transactional`이 없다. 내부 호출 대상의 `@Transactional`은 self-invocation 때문에 Spring proxy를 통과하지 않으므로, 코드 주석의 “각 건은 독립된 내부 트랜잭션”은 실제 경계와 일치하지 않는다.
- 응답 수준의 부분 성공은 구현돼 있지만, 한 건의 후반 알림·감사 처리에서 실패할 때 그 건의 앞선 지갑/상태 변경까지 원자적으로 롤백된다고 보장할 수 없다. 건별 별도 bean 호출, `TransactionTemplate`, 또는 명시적 `REQUIRES_NEW` 경계가 필요하다.

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
- 외부 송금 또는 혼합결제 은행분 확인 대상이 이체 내역으로 진입
- 만료 transfer 알림 → reissue/writeoff 진입

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement/transfers` | `transfer_list_screen.dart` | 호스트 이체 확인/관리 + 참가자 결제 (단일 화면) |
| (위젯) | `widgets/transfer_card_widget.dart` | 이체 카드 (호스트/참가자 분기 액션) |
| (위젯) | `widgets/transfer_status_badge_widget.dart` | 상태 배지 |
| (화면 내부 위젯) | `transfer_list_screen.dart`의 `_TransferBottomActions` | 정산 생성자용 하단 이체 일괄 확인 / 미납자 알림 |

### 화면별 구성 요소 & 액션

### 이체 내역 화면 — 정산 생성자 + 혼합 이체 수취자
- **사용자가 보는 것 (전체 탭)**:
  - `TabBar` 표시 문구 "참여자"/"최근 이체" — 내부적으로 각각 전체 transfer/내 transfer를 로드
  - 카드 정보: 송금자→수취자 아바타·이름, 금액, status 배지(`PENDING/BANK_AWAITING_CONFIRM/COMPLETED/CANCELLED/EXPIRED/SUPERSEDED/REVERSAL_FAILED/PENDING_MANUAL_REFUND`), `paymentMethod`
  - `SettlementTransferGuidanceCard`: POINT 즉시 완료, 일반/혼합 은행분 수동 확인, 실제 입금 비검증 경고
  - 하단 `_TransferBottomActions` — 정산 생성자이면 "이체 확인"(누르면 일괄 확인 다이얼로그) / "미납자 알림" 노출
- **호스트가 할 수 있는 액션**:
  - 카드 PENDING → "이체 확인" 탭 ▶ `PATCH .../transfers/{id}/confirm` ▶ 토스트 "이체가 확인되었습니다"
  - 하단 "이체 확인" 탭 ▶ “이체 일괄 확인” 다이얼로그 ▶ `PATCH .../transfers/bulk-confirm` body `{transferIds:[...]}`
    - 응답 `{success, failed, failures}` 받아 토스트
    - failed=0: "X건 확인 완료" (success 톤)
    - failed>0: "X건 성공, Y건 실패" (error 톤)
  - 카드 BANK_AWAITING_CONFIRM + 본인이 송금자가 아니며 수취자 또는 정산 생성자 → "받았어요" 탭 ▶ `POST .../confirm-bank-portion`
  - 카드 EXPIRED + 본인이 정산 생성자 → "재요청" 탭 ▶ 확인 다이얼로그 ("재요청 횟수: X/2") ▶ `POST .../transfers/{id}/reissue`
  - 카드 EXPIRED + 정산 생성자 → "송금 포기(상각)" 탭 ▶ 다이얼로그 (사유 입력 maxLength 500, 옵션) ▶ `POST .../transfers/{id}/writeoff` body `{reason?}`

### 혼합결제 `받았어요` CTA — 역할별 표시 매트릭스

| viewer | `BANK_AWAITING_CONFIRM` | CTA | 서버 결과 |
|---|---:|---|---|
| 송금자(`fromUserId`) | 예 | 숨김. 정산 생성자/수취자를 겸해도 숨김 | 우회 호출 시 SELF_CONFIRM 403 |
| 수취자(`toUserId`), 송금자 아님 | 예 | `받았어요` | 허용 |
| 정산 생성자(`creatorUserId`), 송금자 아님 | 예 | `받았어요` | 수취자 대신 허용 |
| 무관 사용자 | 예 | 숨김 | 우회 호출 시 NOT_AUTHORIZED 403 |
| 위 역할 중 누구든 다른 status | 아니오 | 숨김 | 우회 호출 시 NOT_AWAITING_CONFIRM 400 |

`TransferListScreen`이 위 권한식을 계산해 callback을 주고, `TransferCardWidget`은 status가 `bankAwaitingConfirm`이면서 callback이 있을 때만 버튼을 렌더링한다. 확인 다이얼로그 제목은 “계좌이체 입금을 확인할까요?”, CTA는 “받았어요”, `reversible=false`다. 성공 후 현재 탭을 다시 조회하고 정산 상세를 무효화하며, 실패하면 이전 목록 상태를 유지하고 오류 토스트를 보여 준다.

> **현재 금액 표시 한계:** `MeetingSettlementTransferVo`는 총액 `amount`만 내려주고 혼합 결제의 `pointAmount`/`bankTransferAmount`를 내려주지 않는다. 따라서 확인 다이얼로그의 “계좌이체 부분 N원”은 현재 총 transfer 금액을 표시한다. 실제 은행분 금액을 정확히 표시하려면 서버 VO 계약 보강이 필요하다.

### 일괄 확인 다이얼로그
- 대상은 **현재 선택된 탭 목록**의 `PENDING` transfer다.
- 메시지: `${pendingCount}건 (총 ${formatter.format(totalAmount)}원)의\n외부 송금을 확인 처리합니다.` + “실제 입금 여부는 시스템이 검증하지 않습니다. 입금 내역을 확인한 건만 처리해 주세요.”
- pending이 0건이면 "확인할 이체가 없습니다" 토스트만

### 화면 실측 Gap

- `_notifyUnpaid`는 PENDING transfer로 `StringBuffer`를 만들고 성공 토스트만 띄운다. Repository/API/알림 service 호출이 없어 실제 미납자 알림은 발송되지 않는다.
- `_TransferSummaryStats`의 “대기 금액”은 `PENDING`만 합산하고 `BANK_AWAITING_CONFIRM`을 제외한다.
- 서버의 일반 BANK 확인 endpoint는 수취자 또는 정산 생성자를 허용하지만 Flutter의 `canConfirmBank`는 정산 생성자에게만 CTA를 준다.
- 하단 `_TransferBottomActions`는 settlement status를 확인하지 않아 완료된 정산에서도 정산 생성자에게 남을 수 있다.

### 재요청 / 상각 다이얼로그
- **재요청**: `AppDialog.confirm` "만료된 송금을 재요청합니다.\n새로운 PENDING 이체가 생성되고 송금자에게 알림이 전송됩니다.\n\n금액: N원\n재요청 횟수: X/2", confirmLabel "재요청"
- **상각**: AlertDialog
  - 메시지: "만료된 송금을 포기합니다.\n이체가 취소 처리되며 되돌릴 수 없습니다.\n\n금액: N원"
  - 사유 입력 (선택, maxLength 500)
  - "포기" 버튼은 `AppColors.error500`

### API 호출 순서 (Provider/Repository 관점)

화면 진입 시:
1. `transferListProvider(eventId)` — 탭 인덱스에 따라 `getTransfers` 또는 `getMyTransfers`
2. `settlementDetailProvider(eventId).creatorUserId` ▶ 정산 생성자 판정
3. `appealsProvider(eventId)` ▶ PENDING appeal 표시

혼합결제 은행분 확인 액션:
1. `canConfirmBankPortion = bankAwaitingConfirm && !isMyTransfer && (toUserId == currentUserId || isHost)`
2. `받았어요` 확인 다이얼로그 + 실제 입금 비검증 경고
3. `transferListProvider(eventId).confirmBankPortion(transferId)` ▶ `POST .../confirm-bank-portion`
4. 현재 탭 reload + `settlementDetailProvider` invalidate

이체 확인 액션:
1. `transferListProvider(eventId).confirmBankTransfer(transferId)` ▶ `PATCH .../transfers/{id}/confirm`
2. 현재 탭 목록 재조회 + `settlementDetailProvider` invalidate
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
| S9 | (혼합결제 · 수취자 확인) 은행분 입금을 받고 `받았어요` | ACTIVE, `BANK_AWAITING_CONFIRM`, 확인자=`toUserId`, PENDING appeal 없음 | transfer `COMPLETED` + `completedAt`, 송금자 알림, 감사로그, 정산 완료 재평가 |
| S10 | (혼합결제 · 정산 생성자 대리 확인) 수취자 대신 확인 | ACTIVE, `BANK_AWAITING_CONFIRM`, 확인자=`creatorUserId`, 확인자는 송금자가 아님 | S9와 동일, 감사 actorRole=`HOST` |
| S11 | (차단 · 송금자/제3자) 확인 우회 호출 | 송금자 또는 transfer 무관 사용자 | SELF_CONFIRM 403 또는 NOT_AUTHORIZED 403, transfer 상태 불변 |
| S12 | (차단 · wrong status/비ACTIVE/PENDING appeal) | 다른 transfer status, DRAFT·COMPLETED·CANCELLED settlement, 또는 PENDING appeal | 각각 NOT_AWAITING_CONFIRM 400 / NOT_ACTIVE 400 / UNDER_APPEAL 409, 상태 불변 |
| S13 | (표시만 성공 · 미납자 알림) | 현재 탭에 PENDING transfer 존재 | API 호출/실제 발송 없이 성공 토스트만 표시 |

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
| 해소 (2026-07-29 재확인) | `community_app/.../transfer_status.dart` | 서버 `BANK_AWAITING_CONFIRM`·`SUPERSEDED`를 Flutter enum과 badge/switch가 소비 | 현 enum 동기화 유지 |
| Risk (2026-07-29 실측) | Controller `confirmTransferBankPortion` | URL의 `eventId`는 Controller가 받지만 service 호출에는 전달하지 않는다. 실제 대상·권한은 `transferId → settlementId`로만 결정되어 URL event context 불일치를 검증하지 않음 | service에 eventId를 전달해 transfer의 settlement event와 일치 검증하거나 공통 scope validator 적용 |
| Risk (2026-07-29 실측) | `MeetingSettlementTransferVo`, `_confirmBankPortion` | 혼합 분할 금액이 VO에 없어 확인 다이얼로그가 transfer 총액을 은행분 확인 금액으로 표시 | VO에 `pointAmount`/`bankTransferAmount` 추가 또는 금액 단정 문구 제거 |
| Fact (2026-07-29 실측) | `confirmBankPortion`, `canConfirmBankPortion` | 수취자/정산 생성자 허용, 송금자 self-confirm/제3자/wrong status 차단, 수기 입금 비검증 경고가 서버·Flutter에 반영됨 | 회귀 테스트와 경고 유지 |
| Risk (2026-07-29 실측) | `bulkConfirmBankTransfers` self-invocation | 응답은 건별 성공/실패를 집계하지만 주석과 달리 건별 service transaction이 생성되지 않아 한 건 내부 원자성이 불명확 | 명시적 건별 transaction 경계 도입 + 후반 side-effect 실패 회귀 테스트 |
| Gap (2026-07-29 실측) | `_notifyUnpaid` | 실제 알림 호출 없이 성공 토스트만 표시 | 실제 remind API에 연결하거나 버튼/성공 문구 제거 |
| Gap (2026-07-29 실측) | `_TransferSummaryStats`, `canConfirmBank`, `_TransferBottomActions` | 대기 합계가 BANK_AWAITING_CONFIRM 제외, 일반 BANK 수취자 CTA 누락, 완료 후 하단 액션 잔존 가능 | 서버 권한·상태와 표시식을 동기화 |
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
- **AC-09. (혼합결제 은행분 수취자/정산 생성자 확인)**: Given ACTIVE 정산의 `BANK_AWAITING_CONFIRM` transfer이고 PENDING appeal이 없을 때 When 송금자가 아닌 수취자 또는 정산 생성자가 `받았어요`를 확정하면 Then transfer가 `COMPLETED`가 되고 `completedAt`, 감사로그, 송금자 알림, 정산 완료 재평가가 기록된다.
- **AC-10. (혼합결제 은행분 self-confirm/제3자 차단)**: Given `BANK_AWAITING_CONFIRM` When 송금자 또는 무관 사용자가 endpoint를 우회 호출하면 Then 403으로 거절되고 transfer는 대기 상태를 유지한다.
- **AC-11. (혼합결제 은행분 wrong status/비ACTIVE/appeal 차단)**: Given 상태·정산·분쟁 조건이 맞지 않을 때 When 확인을 호출하면 Then 대응 error code로 거절되고 어떤 완료 side effect도 생기지 않는다.
- **AC-12. (완료 전이)**: Given 마지막 미완료 transfer가 해당 은행분 확인 건이고 모든 share가 완료됐을 때 When 확인에 성공하면 Then transfer와 ACTIVE settlement가 함께 `COMPLETED`가 되고 정산 생성자에게 완료 알림이 간다.
- **AC-13. (일괄 확인 원자성)**: Given 일괄 확인 중 한 transfer의 감사/알림 같은 후반 side effect가 실패할 때 When 해당 건을 처리하면 Then 그 transfer의 앞선 상태·지갑·원장 변경이 모두 롤백되거나, 문서화된 복구 상태로 일관되게 남아야 한다.
- **AC-14. (미납자 알림 진실성)**: Given PENDING transfer가 있을 때 When “미납자 알림” 성공을 표시하면 Then 실제 서버 알림 요청과 수신 근거가 있어야 한다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
