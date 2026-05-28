# F17-08. 환불 (pro-rata · 트리거별 · FAILED_REFUND) PRD

## 1. 결론

FIXED 모임 환불은 **진행 세션 차감 pro-rata** 산식 + 3가지 트리거(MEMBER_CANCEL / HOST_CANCEL / FORFEIT)로 분기한다. 모든 트리거가 동일한 `amount × (N − consumed) / N` 골격을 쓰되 `consumed` 정의가 다르다.

- **MEMBER_CANCEL** — consumed = 활성 세션 중 `startTime ≤ now` (정각 포함, 노쇼 포함). 시작된 모든 세션은 사용한 것으로 본다.
- **HOST_CANCEL** — consumed = 활성 세션 중 `status == CLOSED`. 호스트가 미제공한 세션은 전액 환불.
- **FORFEIT** — MEMBER_CANCEL 과 동일 산식. 시작된 세션은 환불 대상 아님, 미래 미제공분만 환불.

100원 단위 floor, 0 clamp. WALLET 결제만 자동 환불. BANK_TRANSFER 는 `REFUND_REQUESTED` 큐로 보내고 호스트가 별도 계좌 환불 후 `POST /payment/{paymentId}/refund-confirm` 호출로 REFUNDED 마감.

환불 실패(예: PG 큐 실패, 사용자 잔액 음수 clawback) 시 `failed_refund` 테이블에 row 생성. `failed_refund.event_id` nullable + `failed_refund.regular_meeting_id` 추가 (결정 K) 라서 RM 환불 실패도 추적된다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Service | `RegularMeetingRefundService` | 트리거별 분기 + FAILED_REFUND 기록 |
| Backend Calculator | `RegularMeetingRefundCalculator` | pro-rata 산식. `RefundReason {MEMBER_CANCEL, HOST_CANCEL, FORFEIT}` |
| Backend Entity | `RegularMeetingPayment.refundAmount,refundPointTxId,refundReason,refundedAt` | 환불 결과 영속 |
| Backend Model | `FailedRefund` — `event_id` nullable + `regular_meeting_id` | RM 실패 추적 |
| Backend Refund 트리거 | `RegularMeetingEnrollmentService#cancelEnrollment` (MEMBER), `RegularMeetingService#cancel` (HOST), `RegularMeetingSessionAttendanceService#finalizeSession` FORFEIT_ON_LIMIT (FORFEIT) | 3 진입점 |
| Wallet | `WalletService` 의 `refundFromRegularMeeting...` 추정 (paid + free 분리) | 분개 + lot |
| ErrorCode | `REGULAR_MEETING_REFUND_*` 2700015~ | 실패 코드 |

## 3. 전체 동작 흐름

### 3.1 산식 정의

```
total = meeting.totalSessionCount
consumed = (트리거별)
remaining = total - consumed (clamp 0)
raw = paymentAmount × remaining / total (RoundingMode.DOWN)
refundAmount = floorToHundred(raw)  # 100원 단위 절삭, 0 clamp
```

`consumed` 정의:
- MEMBER_CANCEL / FORFEIT: 활성 세션(`event.status != CANCELED`) 중 `startTime != null && startTime ≤ now` count.
- HOST_CANCEL: 활성 세션 중 `event.status == CLOSED` count.

### 3.2 MEMBER_CANCEL 흐름 (F17-06 §3.2 에서 트리거)
1. `cancelEnrollment(userId, meetingId)` 진입 → meeting lock, member non-terminal 확인.
2. PaidPayment 검색: `status IN {PAID, REFUNDED}` AND `pointTxId != null` AND `!isHostDirect`.
3. WALLET 이면: `refundCalculator.calculate(meeting, paymentAmount, now, MEMBER_CANCEL)` → wallet refund 호출.
4. payment.status=REFUNDED, refundAmount=계산값, refundReason="member_cancel", refundPointTxId=tx.id, refundedAt=now.
5. BANK_TRANSFER 이면: payment.status=REFUND_REQUESTED. 호스트가 직접 계좌 환불 후 confirmRefund 로 마감.

### 3.3 HOST_CANCEL 흐름 (F17-04 §3.3 에서 트리거)
1. `cancel(meetingId)` 진입 → meeting lock, 상태=CANCELED.
2. ACTIVE 멤버 전원 순회. 각자에 대해:
   - WALLET: pro-rata HOST_CANCEL refund → REFUNDED.
   - BANK_TRANSFER: REFUND_REQUESTED 로 큐잉.
   - 실패 시 `FailedRefund(regularMeetingId=...)` 기록.
3. 모든 활성 세션도 CANCELED 처리.

### 3.4 FORFEIT 흐름 (F17-09 §3.5 에서 트리거)
1. finalizeSession 결과 멤버가 `reachesNoShowLimit(mode, limit)` + `noShowPolicy == FORFEIT_ON_LIMIT`.
2. `member.markForfeited()` → status=FORFEITED.
3. `RegularMeetingRefundService.refundForForfeit(meeting, member)` → pro-rata FORFEIT 산식으로 환불 (`reasonStr="forfeit"`).
4. 시작된 제공분 무환불, 미래 미제공분만 환불. 노쇼한 제공 세션은 환불 대상 아님 (consumed 에 포함됨).
5. WALLET: 즉시 환불. BANK: REFUND_REQUESTED.

### 3.5 BANK 환불 호스트 확정 (`POST /payment/{paymentId}/refund-confirm`)
1. payment.status == REFUND_REQUESTED.
2. host 가 별도 채널(계좌)로 입금 완료 후 호출.
3. payment.status=REFUNDED, refundedAt=now.

### 3.6 FailedRefund 재시도
- `FailedRefund(regular_meeting_id, user_id, amount, reason, attempt_count)` row.
- 별도 스케줄러가 재시도. 성공 시 마감.

## 4. 서버 계약

본 기능은 endpoint 가 cancel 흐름(F17-04/06) 안에 합쳐져 있음. 추가 endpoint:

| 엔드포인트 | Method | 응답 | 가드 |
|---|---|---|---|
| `/payment/{paymentId}/refund-confirm` | POST | `RegularMeetingPaymentVo` (REFUNDED) | host + REFUND_REQUESTED |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| MEMBER_CANCEL UX | F17-06 cancel CTA 안에 confirmation modal — "{remaining}/{total} 세션 환불됩니다. {refundAmount}원" |
| HOST_CANCEL UX | F17-04 cancel CTA — "전 멤버에게 미진행 세션 분 환불됩니다" |
| BANK REFUND_REQUESTED 표기 | 멤버 상세에 "환불 진행중 (호스트 계좌환불 대기)" 라벨 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S8-1 | MEMBER_CANCEL WALLET, 0/8 진행 | total=8, consumed=0, amount=80000 | refundAmount=80000 (전액). REFUNDED |
| S8-2 | MEMBER_CANCEL WALLET, 3/8 진행 | total=8, consumed=3, amount=80000 | raw = 80000 × 5/8 = 50000 → floorToHundred=50000. REFUNDED |
| S8-3 | MEMBER_CANCEL WALLET, 8/8 진행 | total=8, consumed=8 | refundAmount=0. REFUNDED with amount 0 (또는 payment 그대로) |
| S8-4 | HOST_CANCEL WALLET, 5 CLOSED + 3 미진행 | total=8, delivered=5, amount=80000 | refundAmount = 80000 × 3/8 = 30000. REFUNDED for each ACTIVE member |
| S8-5 | FORFEIT WALLET, 노쇼 3회 한도 도달 | total=8, consumed=4 (시작된 4세션), amount=80000 | raw = 80000 × 4/8 = 40000 → 40000. member=FORFEITED |
| S8-6 | BANK MEMBER_CANCEL | payment.PAID(BANK) | payment=REFUND_REQUESTED. 호스트 책임 |
| S8-7 | BANK refund-confirm | REFUND_REQUESTED | payment=REFUNDED, refundedAt 설정. 분개 없음 |
| S8-8 | refund 실패 (wallet 음수 잔액 등) | wallet 처리 실패 | FailedRefund row 신규. 스케줄러 재시도 |
| S8-9 | 100원 floor | raw=12345 | floorToHundred=12300 |
| S8-10 | 0 clamp | consumed >= total | remaining=0 → refundAmount=0 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| pro-rata 산식 일관성 | `RegularMeetingRefundCalculator.calculate` 단일 진입점 | MEMBER_CANCEL/HOST_CANCEL/FORFEIT 모두 동일 메서드 |
| `consumed` 분기 | reason 별 stream filter | HOST_CANCEL=CLOSED count, 외=startTime≤now |
| FORFEIT 환불 책임 | finalize 시점(=close 전) 발생 → settlement gross 의 retained paid 에 자연 반영 | 정산 후 환불 위험 0 |
| `failed_refund.regular_meeting_id` | 결정 K — schema 확장 | RM 환불 실패도 추적 가능 |
| `event_id` nullable | DDL — 단일 컬럼 either-or 보장 | OK |
| 멱등 환불 | `refundPointTxId` set 후 재시도 차단 | PointTransaction 단위 멱등 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 위험 | BANK refund-confirm 누락 | 호스트가 confirm 안 하면 REFUND_REQUESTED 영구 잔존 → 멤버는 환불 대기로 인지 | SLA 모니터링 + 호스트 알림 |
| 위험 | clawback (음수 잔액) | 사용자 잔액이 환불액보다 작아 마이너스 잔액 가능 | wallet 정책: 마이너스 허용 + 적립 시 우선 차감 |
| 잔여 | reservedRefund | FORFEIT 환불은 settlement reservedRefund 에 예약분 반영 (F17-10 §7) | 검증됨 |

## 9. 수용 기준

- **AC-01 (S8-1). 전액 환불**: Given consumed=0, total=8, amount=80000. Then refundAmount=80000.
- **AC-02 (S8-2). 비례 환불**: Given consumed=3, total=8, amount=80000. Then refundAmount=50000 (floorToHundred).
- **AC-03 (S8-4). HOST_CANCEL delivered 기준**: Given delivered=5, total=8. Then refundAmount = amount × 3/8.
- **AC-04 (S8-5). FORFEIT**: Given FORFEIT_ON_LIMIT 한도 도달. Then member=FORFEITED + refundAmount = amount × remaining/total + refundReason="forfeit".
- **AC-05 (S8-6,7). BANK 환불 양 단계**: Given BANK PAID member cancel. Then REFUND_REQUESTED. 호스트 refund-confirm 후 REFUNDED.
- **AC-06 (S8-8). FailedRefund**: Given wallet 처리 실패. Then `FailedRefund(regular_meeting_id, user_id)` row 생성.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| EXCUSED 환불 정책 | Phase 4 SHORTFALL/EXCUSED 미반영 — MEMBER_CANCEL 산식 그대로 | 약관 변경 시 sub-reason 추가 |
| GRADUATED refund 정책 | 1차는 진행 차감만 — 시간 비율(24h 전 100% 등) 미적용 | 후속 |
| BANK refund SLA 자동 알림 | MVP 부재 | NotificationType + 호스트 알림 |
