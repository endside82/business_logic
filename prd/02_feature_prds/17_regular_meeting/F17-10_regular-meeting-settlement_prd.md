# F17-10. 호스트 정산 (flow-through) PRD

## 1. 결론

FIXED 모임 종료(`CLOSED`) 시 코스당 1건의 `Settlement(regular_meeting_id=...)` 가 생성된다. **flow-through** 모델: WALLET 결제의 retained 유료 포인트 합계만 호스트 수익으로 잡고, retained 무료 포인트 합계는 `freePointSubsidy`(플랫폼 보조, payout 비대상)로 분리한다. BANK_TRANSFER 는 호스트 직접입금(`isHostDirect=true`, off-ledger)이라 payout 대상 아님.

산식:
```
retainedPaid = Σ (origTx.paidAmount − refundTx.paidAmount)  for each PAID|REFUNDED WALLET payment with pointTxId, !hostDirect
retainedFree = Σ (origTx.freeAmount − refundTx.freeAmount)  for each PAID|REFUNDED WALLET payment with pointTxId, !hostDirect
gross = retainedPaid
freePointSubsidy = retainedFree
platformFee = gross × 10%
withholdingTax = gross × 3.3%
netAmount = gross − platformFee − withholdingTax
```

**머니 안전 다층 방어**:
1. `close()` `findByIdForUpdate` 잠금 (pay 와 직렬화)
2. close FIXED 가드: 미래 OPEN 세션 무 + `activeSessionCount == totalSessionCount` + 모든 정션 FINALIZED
3. 정산 생성은 **afterCommit** REQUIRES_NEW (close 커밋 후 → orphan 차단)
4. `tryCreateSettlement` 에 CLOSED 가드 (scheduler 우회 방지)
5. `cancelEnrollment` CLOSED/CANCELED 거절
6. `cancel()` `findByIdForUpdate` 잠금
7. `finalizeSession` endTime≤now 강제
8. FORFEIT 환불은 finalize 시점(=close 전) 에만 발생 → settlement gross 의 retained paid 에 자연 반영

이중지급 차단:
- `uk_settlement_rm(regular_meeting_id)` UNIQUE — 코스당 1정산
- `SettlementService.doCreditAndRecord` 의 `existsByReferenceTypeAndReferenceId("SETTLEMENT", id)` 멱등
- `reservedRefund > 0` 게이트 (`completeSettlement` 내부, retry scheduler 우회 불가)

`fail-closed`: 참조 결제/환불 PointTransaction 이 없으면 `TRANSACTION_NOT_FOUND` 던지고 중단 → 다음 failsafe 주기에 데이터 보정 후 재시도.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#settlement` | `GET /regular-meetings/{id}/settlement` (204 if not yet) |
| Backend Service | `RegularMeetingSettlementService#tryCreateSettlement,getSettlement` | flow-through 산식 + afterCommit + scheduler |
| Backend Trigger | `RegularMeetingService#close → TransactionSynchronization` 등록 → `tryCreateSettlement(REQUIRES_NEW)` | 1h failsafe 스케줄러 동반 |
| Backend Scheduler | `RegularMeetingSettlementScheduler` | CLOSED 모임 중 정산 미생성 재시도 |
| Backend Entity | `Settlement.event_id` `Long` nullable + `regular_meeting_id` + `reserved_refund` BigDecimal | DDL 확장 |
| Settlement DDL | `uk_settlement_rm(regular_meeting_id)` + `CHECK ((event_id IS NULL) <> (regular_meeting_id IS NULL))` | 양립 불가 |
| Backend VO | `RegularMeetingSettlementVo` | 호스트 응답 필드 |
| Complete 경로 | `SettlementService.completeSettlement` 재사용 (codex B안) + `reservedRefund > 0` 게이트 추가 | 멱등 + retry 보류 |

## 3. 전체 동작 흐름

### 3.1 트리거 (close → afterCommit)
1. F17-04 §3.2 close 가 통과하면 `TransactionSynchronizationManager.registerSynchronization` 으로 afterCommit 등록.
2. 커밋 후 별도 트랜잭션 (`REQUIRES_NEW`) 으로 `tryCreateSettlement(meetingId)` 호출.
3. 실패 시 close 자체는 롤백 안 됨 — `RegularMeetingSettlementScheduler` 가 1h 마다 재시도.

### 3.2 tryCreateSettlement 산식
1. 멱등 — `settlementRepository.existsByRegularMeetingId(meetingId)` true → null 반환.
2. meeting null 또는 not FIXED → null.
3. `meeting.status != CLOSED` → null (scheduler 우회 방지).
4. payment row 순회 — WALLET + !isHostDirect + pointTxId != null + status ∈ {PAID, REFUNDED}:
   - 결제 tx: `paid, free` (paidAmount, freeAmount).
   - 환불 tx (refundPointTxId != null): `paid -= refundTx.paidAmount`, `free -= refundTx.freeAmount`.
   - fail-closed: tx 못 찾으면 `TRANSACTION_NOT_FOUND`.
   - `retainedPaid += max(0, paid)`, `retainedFree += max(0, free)`.
5. `retainedPaid <= 0` → skip (settlement-skipped 마커 영구 재검사 잔여, §9 도메인).
6. 정산 기간 (periodStart, periodEnd) — 코스 startDate/endDate 또는 publishedAt~closedAt 기반.
7. `gross = retainedPaid`, `freeSubsidy = retainedFree`, `platformFee=gross×0.10`, `withholdingTax=gross×0.033`, `netAmount=gross−fee−tax`.
8. `Settlement(regular_meeting_id, status=PENDING, gross, fee, tax, net, freeSubsidy, periodStart, periodEnd)` insert.
9. `recordRegularMeetingPayment` 이미 적립한 CREATOR_PAYABLE 을 `recordSettlementComplete`(gross 분) 로 소거.

### 3.3 호스트 조회 (`GET /settlement`)
1. host + meeting CLOSED 일 때만 의미.
2. 미생성 → 204 No Content.
3. 생성됐으면 `RegularMeetingSettlementVo` 응답:
   - `settlementId, regularMeetingId, status, grossAmount, platformFee, withholdingTax, netAmount, freePointSubsidy, reservedRefund, periodStart, periodEnd, settledAt, createdAt`.

### 3.4 후속 approve → completeSettlement (기존 파이프라인)
- 이벤트 정산과 동일 — `SettlementService.completeSettlement` 재사용.
- `reservedRefund > 0` 게이트 — 미정리 환불(예: FORFEIT 환불 실패) 있을 때 retry 보류.

## 4. 서버 계약

| 엔드포인트 | Method | 응답 | 가드 |
|---|---|---|---|
| `/regular-meetings/{id}/settlement` | GET | `RegularMeetingSettlementVo` 또는 204 | host. CLOSED 이고 정산 생성됨 |

내부 호출 (no endpoint):
- `RegularMeetingSettlementService.tryCreateSettlement(meetingId)` — `@Transactional(REQUIRES_NEW)`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.regularMeetingSettlement(:id)` |
| Screen | `RegularMeetingSettlementScreen` |
| Provider | `regularMeetingSettlementProvider(id)` |
| 표시 | retained paid / fee / tax / net / freeSubsidy / reservedRefund breakdown |
| 미생성 (204) | "정산 준비중입니다" + 새로고침 안내 (scheduler 가 1h 재시도) |
| 진입 가드 | host 만, CLOSED 후 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S10-1 | close 직후 정산 생성 (정상) | FIXED CLOSED, 모든 세션 FINALIZED, 8 멤버 WALLET PAID 평균 80000 | Settlement(regular_meeting_id=X, status=PENDING, gross=640000, fee=64000, tax=21120, net=554880) |
| S10-2 | 환불 후 재계산 | 멤버 1명 MEMBER_CANCEL 4세션 환불 (refund=40000) | retainedPaid = 640000 - 40000 = 600000. gross=600000 |
| S10-3 | BANK PAID 멤버 1명 | payment.isHostDirect=true 1명, 나머지 WALLET | BANK 결제 가산 안 됨 — gross 는 WALLET 만 |
| S10-4 | 무료 포인트만 결제 | retainedPaid=0, retainedFree=80000 | settlement skip (null 반환). freeSubsidy 만 있는 케이스는 settlement-skipped 마커 잔여 |
| S10-5 | 정산 멱등 호출 | 이미 생성된 Settlement 있음 | tryCreateSettlement 가 null 반환. 중복 생성 안 됨 (`uk_settlement_rm`) |
| S10-6 | scheduler 우회 (`status != CLOSED`) | 어떤 사유로 OPEN 상태에서 scheduler 가 호출 | null 반환 — CLOSED 가드 |
| S10-7 | fail-closed tx 누락 | pointTxId 가 가리키는 tx 없음 | `TRANSACTION_NOT_FOUND` → 트랜잭션 롤백 → failsafe 재시도 |
| S10-8 | FORFEIT 환불 후 close | finalize 중 FORFEIT 발생 → close 진행 | 환불은 finalize 시점에 끝나 settlement gross 에 자연 반영. reservedRefund 는 일반 환불 예약분 |
| S10-9 | host 가 비호스트 모임 settlement 조회 | 다른 user | 403 `REGULAR_MEETING_FORBIDDEN` (`accessService.assertHost`) |
| S10-10 | 정산 미생성 GET | 정산 row 없음 | 204 No Content |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 산식 flow-through | retained = orig.paid - refund.paid (PAID + REFUNDED 둘 다 순회) | 확정 |
| `freePointSubsidy` 분리 | retainedFree 가 별도 컬럼 | 호스트 payout 비대상 |
| 멱등 보장 | `uk_settlement_rm` + `existsByRegularMeetingId` + `existsByReferenceTypeAndReferenceId("SETTLEMENT", id)` | 3중 보장 |
| afterCommit 분리 | `TransactionSynchronization` + REQUIRES_NEW | orphan 차단 (Codex BLOCKING 1) |
| fail-closed | tx 누락시 throw → failsafe 재시도 | 데이터 무결성 보호 |
| CLOSED 가드 | scheduler 진입 시 `meeting.status != CLOSED` → skip | scheduler 우회 방지 |
| reservedRefund 게이트 | `completeSettlement` 내부에 `reservedRefund.signum() > 0` → `return false` retry 보류 | 미정리 환불 있을 때 지급 안 됨 |
| Settlement 단일 컬럼 either-or | DDL `CHECK ((event_id IS NULL) <> (regular_meeting_id IS NULL))` | event Settlement vs RM Settlement 양립 불가 |
| `WalletQueryService.toSettlementDetailVo` + `AccountDeactivationService.loadEventTitles` | RM 행 이벤트뷰 NPE 방지 — null 필터 + RM 분기 (Codex BLOCKING 3) | 안전 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 잔여 | §9 도메인 | `retained ≤ 0` 종료 코스 failsafe 영구 재검사 (settlement-skipped 마커 누락) | 후속 — 무료 포인트만 있는 코스 정산 정책 결정 |
| 위험 | failsafe 1h 주기 | 호스트가 close 직후 정산을 보려고 하면 최대 1h 대기 — afterCommit 성공시 즉시 보임 | UI "준비중" 메시지로 안내 |
| 위험 | FORFEIT 가 close 후 발생 | C5/C8 가드로 close 전에만 FORFEIT 가능. close 후 환불은 차단 (cancelEnrollment CLOSED 거절) | 검증됨 |

## 9. 수용 기준

- **AC-01 (S10-1). 정산 생성 happy path**: Given FIXED CLOSED + 8 WALLET PAID. When close. Then afterCommit `Settlement(regular_meeting_id, status=PENDING)` 1건 생성 + gross=Σretained, fee=10%, tax=3.3%, net=gross-fee-tax.
- **AC-02 (S10-5). 멱등**: Given 이미 정산 존재. When tryCreateSettlement. Then null + 중복 row 안 만들어짐.
- **AC-03 (S10-3). BANK 제외**: Given 1 BANK + 7 WALLET. Then gross = Σ7 WALLET retained.
- **AC-04 (S10-7). fail-closed**: Given pointTxId 가 가리키는 tx 없음. Then `TRANSACTION_NOT_FOUND` + 트랜잭션 롤백 + scheduler 재시도.
- **AC-05 (S10-6). scheduler 우회 방지**: Given meeting.status != CLOSED. When scheduler 호출. Then null (skip).
- **AC-06 (S10-9). 호스트 권한**: Given 비호스트. When GET. Then 403.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| settlement-skipped 마커 | `retainedPaid ≤ 0` 코스 영구 재시도 회피 | 마커 row + 재시도 차단 정책 결정 |
| FORFEIT 환불 reservedRefund 반영 | 1차는 finalize 시점에 자연 환불 — close 후 추가 reserve 는 아직 없음 | 정산 후 잔존 환불 정책 결정 |
| 호스트 정산 이의제기 | 일반 Settlement 의 dispute 흐름 (F06-10) 재사용 | 통합 검토 |
