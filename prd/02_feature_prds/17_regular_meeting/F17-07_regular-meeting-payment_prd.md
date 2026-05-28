# F17-07. 고정형 결제 (WALLET / BANK_TRANSFER) PRD

## 1. 결론

FIXED 모임에서 멤버가 `APPROVED_PENDING_PAYMENT` 상태일 때 코스 전체 금액을 한 번에 납부한다. 두 가지 방식:

- **WALLET** (포인트 지갑) — `WalletService.payForRegularMeeting` 호출. 즉시 차감 → `PointTransaction(referenceType="REGULAR_MEETING_PAYMENT", referenceId=paymentId)` + 분개(`AccountingLedgerService.recordRegularMeetingPayment`: `USER_WALLET → CREATOR_PAYABLE`). 결제 row `PAID` → 멤버 `ENROLLED` → materialize.
- **BANK_TRANSFER** (호스트 직접입금, off-ledger) — `isHostDirect=true`. PENDING 으로 만들고 paymentDueAt=now+72h. 회계 분개 없음(payout 비대상). 호스트가 입금 확인 후 `POST /payment/{paymentId}/confirm` → PAID → ENROLLED. 거부 시 `reject(reason)` → 결제 CANCELED + 멤버 APPROVED_PENDING_PAYMENT 유지(재결제 허용).

`regular_meeting_payment` 테이블의 `active_member_id` STORED 생성컬럼 (`status IN PENDING/PAID/REFUND_REQUESTED 일 때만 member_id, 그 외 NULL`) + `uk_payment_active(member_id, active_member_id)` UNIQUE 로 멤버당 동시 활성 결제 1건 보장 (CANCELED/REFUNDED 후 재결제 허용).

PG queue/외부 결제는 본 도메인에서 사용 안 함 — WALLET 의 lot 처리는 inline(F17-08 환불 facade 가 wallet 만 다룸). BigDecimal 금액은 `EventPayment.amount` 미러 — long(KRW) 정수.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#pay,confirmPayment,rejectPayment,confirmRefund` | 4 endpoint |
| Backend Service | `RegularMeetingPaymentService#pay,confirm,reject,confirmRefund` | 분기 + lock 순서 |
| Backend Wallet | `WalletService#payForRegularMeeting` | 멱등 + 분개 |
| Backend Entity | `RegularMeetingPayment` — `active_member_id` STORED + uk | 활성 1건 보장 |
| Backend Enum | `EventPaymentMethod`, `EventPaymentStatus` 재사용 | WALLET, BANK_TRANSFER, PENDING/PAID/CANCELED/REFUND_REQUESTED/REFUNDED |
| Expiry 스케줄러 | `RegularMeetingPaymentExpiryScheduler` | paymentDueAt 만료 처리 |
| Flutter API | `regular_meeting_api.dart` | Retrofit pay/confirm/reject |
| Flutter Param | `regular_meeting_pay_param.dart` (method) | WALLET / BANK_TRANSFER radio |
| Flutter Screen | `regular_meeting_payment_screen.dart` | WALLET/BANK_TRANSFER 라디오 |

## 3. 전체 동작 흐름

### 3.1 WALLET pay
1. `lockPayableMeeting(meetingId)` — FIXED + OPEN.
2. member 조회 → status 가 `APPROVED_PENDING_PAYMENT` 가 아니면 `ENROLLMENT_INVALID_STATUS`.
3. `assertNoActivePayment(memberId)` — UNIQUE 가 막지만 명시 가드.
4. amount = `meeting.price.longValue()`. 0 이하 → `INVALID_PAYMENT_AMOUNT`.
5. payment row PENDING(WALLET, isHostDirect=false) 저장.
6. `WalletService.payForRegularMeeting(userId, paymentId, meetingId, hostUserId, amount)` 호출:
   - `USER_WALLET → CREATOR_PAYABLE` 분개.
   - `PointTransaction(type=PAY, referenceType="REGULAR_MEETING_PAYMENT", referenceId=paymentId)`.
   - 멱등: `existsByReferenceTypeAndReferenceId(...)` 으로 중복 차단.
   - 잔액 부족 → `INSUFFICIENT_POINT` ApiError.
7. payment row → PAID, paidAt=now, pointTxId = tx.id.
8. member.markEnrolled() — status=ENROLLED, enrolledAt=now, waitlistOrder=null.
9. `materializationService.syncMemberAdded` — 미래 세션 ATTENDING catch-up.
10. 응답: `RegularMeetingPaymentVo`.

### 3.2 BANK_TRANSFER pay (declare)
1. 위 1~5 동일하나 method=BANK_TRANSFER, isHostDirect=true, paymentDueAt=now+72h.
2. 회계 분개 없음 (off-ledger). 좌석은 멤버 APPROVED_PENDING_PAYMENT 로 유지 (예약).
3. 응답: paymentId. 사용자는 호스트가 별도 알려준 계좌로 직접 입금.

### 3.3 confirm (`POST /payment/{paymentId}/confirm`)
1. `findByIdForUpdate(meetingId)` + `assertHost`.
2. payment 조회 → BANK_TRANSFER + PENDING 이어야 함. 아니면 `REGULAR_MEETING_INVALID_STATUS`.
3. payment.status=PAID, confirmedAt=now, paidAt=now.
4. member.markEnrolled.
5. materialize sync.
6. 분개 없음(off-ledger).

### 3.4 reject (`POST /payment/{paymentId}/reject?reason=...`)
1. `assertHost`.
2. BANK_TRANSFER + PENDING 만.
3. payment.status=CANCELED, rejectReason=reason.
4. **member 는 APPROVED_PENDING_PAYMENT 유지** — 재결제(다시 declare) 허용.

### 3.5 paymentDueAt expiry (스케줄러)
1. `RegularMeetingPaymentExpiryScheduler` 가 BANK_TRANSFER PENDING 중 `paymentDueAt < now` 검색.
2. payment.status=CANCELED + member.status=PAYMENT_EXPIRED.
3. 좌석 비움 → `promoteWaitlist` 호출.

### 3.6 confirmRefund (BANK 환불 호스트 확정, `POST /payment/{paymentId}/refund-confirm`)
- F17-08 환불 흐름 참조 (REFUND_REQUESTED → REFUNDED).

## 4. 서버 계약

| 엔드포인트 | Method | Body | 응답 | 가드 |
|---|---|---|---|---|
| `/payment/pay` | POST | `RegularMeetingPayParam(method)` | 200 `RegularMeetingPaymentVo` | FIXED+OPEN+member.APPROVED_PENDING_PAYMENT |
| `/payment/{paymentId}/confirm` | POST | — | 200 `RegularMeetingPaymentVo` (PAID) | host + BANK_TRANSFER+PENDING |
| `/payment/{paymentId}/reject` | POST | `?reason=...` | 200 `RegularMeetingPaymentVo` (CANCELED) | host + BANK_TRANSFER+PENDING |
| `/payment/{paymentId}/refund-confirm` | POST | — | 200 `RegularMeetingPaymentVo` (REFUNDED) | host + REFUND_REQUESTED |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.regularMeetingPayment(:id)` |
| Screen | `RegularMeetingPaymentScreen` — WALLET/BANK_TRANSFER 라디오 |
| Provider | `myRegularMeetingMembershipProvider` invalidate + walletNotifier invalidate |
| BANK 안내 | 호스트가 별도로 알려준 계좌 + 입금자명 가이드 |
| 잔액 부족 | `INSUFFICIENT_POINT` 에러 → 충전 화면 prefill (F06-02 와 동일 패턴) |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S7-1 | WALLET 정상 결제 | APPROVED_PENDING_PAYMENT, 잔액 ≥ price | payment=PAID, member=ENROLLED, PointTransaction(REGULAR_MEETING_PAYMENT) 1건, 분개 1건 |
| S7-2 | WALLET 잔액 부족 | 잔액 < price | 400 `INSUFFICIENT_POINT`. payment row 는 PENDING 으로 일부 생성됐을 수 있으므로 트랜잭션 롤백 보장 |
| S7-3 | BANK declare | APPROVED_PENDING_PAYMENT | payment=PENDING(BANK_TRANSFER, isHostDirect=true), paymentDueAt=now+72h. 분개 없음 |
| S7-4 | BANK host confirm | payment=PENDING(BANK) | payment=PAID, member=ENROLLED. 분개 없음 |
| S7-5 | BANK host reject | payment=PENDING(BANK), reason="입금 확인 안됨" | payment=CANCELED, member 유지 APPROVED_PENDING_PAYMENT |
| S7-6 | BANK paymentDueAt 만료 | paymentDueAt < now, status=PENDING | scheduler: payment=CANCELED, member=PAYMENT_EXPIRED, WAITING 승격 |
| S7-7 | 활성 결제 중복 시도 | 이미 PENDING payment 보유 | 400 — `assertNoActivePayment` + uk_payment_active 가 차단 |
| S7-8 | price=0 결제 시도 | 모임 price=0 | 400 `INVALID_PAYMENT_AMOUNT` (price>0 모임만 결제 단계) |
| S7-9 | VARIABLE 모임 결제 시도 | meetingType=VARIABLE | 400 — `lockPayableMeeting` 가 `REGULAR_MEETING_NOT_FIXED` |
| S7-10 | CANCELED 후 재결제 | 이전 payment CANCELED | 신규 payment row 생성 가능 (active_member_id NULL → UNIQUE 우회) |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 활성 1건 UNIQUE | `regular_meeting_payment.active_member_id` STORED + `uk_payment_active` | 동시 활성 1건 보장. CANCELED/REFUNDED 후 재시도 가능 |
| 멱등 결제 | `WalletService.payForRegularMeeting` 의 `existsByReferenceTypeAndReferenceId("REGULAR_MEETING_PAYMENT", paymentId)` | 중복 호출 차단 |
| 회계 분개 | WALLET=`USER_WALLET → CREATOR_PAYABLE`. BANK=분개 없음(isHostDirect=true) | flow-through 정책과 일치 |
| 락 순서 | meeting → member → payment → wallet | service 주석 C9/C10 일관 |
| `regular_meeting_payment.fk_rmp_member ON DELETE CASCADE` 제거 | 사전존재 버그 1 수정 — generated col base 컬럼 CASCADE 가 MySQL ERROR 1215 유발 | CASCADE 제거(모임 cascade 로 결제 정리 충분) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 잔여 | §9 도메인 | 호스트 결제 list endpoint 부재 → 호스트가 BANK PENDING 묶음 확인 불가(상세에서 카운트만) | endpoint 추가 후 호스트 화면 |
| 위험 | BANK declare 후 사용자가 계좌 모름 | 호스트가 별도 채널로 알려야 함 | UX 안내 + 호스트 입력 계좌 영구 저장 후속 |
| 위험 | confirm 후 demote 시 환불 책임 | confirm 직후 다시 reject 가능 → reject 는 PENDING 만이라 confirm 뒤로는 불가 (PAID 는 정상 환불 흐름 F17-08) | safe |

## 9. 수용 기준

- **AC-01 (S7-1). WALLET pay**: Given member APPROVED_PENDING_PAYMENT, 잔액 ≥ price. When `POST /payment/pay {method=WALLET}`. Then payment=PAID + member=ENROLLED + PointTransaction(REGULAR_MEETING_PAYMENT, referenceId=paymentId) + 분개 1건.
- **AC-02 (S7-3). BANK declare**: Given 동일 조건. When `{method=BANK_TRANSFER}`. Then payment=PENDING + paymentDueAt=now+72h + 분개 없음.
- **AC-03 (S7-4). BANK confirm**: Given BANK PENDING. When `POST /confirm`. Then PAID + ENROLLED + 분개 없음.
- **AC-04 (S7-5). BANK reject**: Given BANK PENDING. When `POST /reject?reason=`. Then payment=CANCELED + member 유지.
- **AC-05 (S7-7). 동시 활성 차단**: Given member 가 PENDING 결제 보유. When 두 번째 pay. Then 400 / DataIntegrityViolation → `DUPLICATE_PAYMENT` 변환.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| 호스트 BANK 입금 계좌 영구 저장 | MVP 는 별도 채널 안내 | 호스트 정산 계좌(F07-10) 와 통합 |
| 결제 list endpoint | MVP 부재 | NotificationType + 호스트 화면 |
| 분할 결제(코스 분할) | 1차는 일괄 결제만 | 후속 |
