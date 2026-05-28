# F17-04. 정기모임 생명주기 (publish / close / cancel / reopen) PRD

## 1. 결론

`RegularMeetingStatus` 4 상태 머신:

```
DRAFT → OPEN | CANCELED
OPEN  → CLOSED | CANCELED
CLOSED → OPEN          (VARIABLE 자동종료 재개 reopen)
CANCELED → (종료)
```

전이는 `RegularMeeting.transitionTo(target)` 도메인 메서드 — 허용되지 않은 전이는 `REGULAR_MEETING_INVALID_STATUS`. 각 전이 시점에 `publishedAt/closedAt/canceledAt` 타임스탬프가 자동 채워진다(`canceledAt` 은 reopen 시 null 로 복귀하지 않으며 `closedAt` 만 reopen 에서 nullify 된다).

**머니 안전 핵심**: close 는 `findByIdForUpdate` 잠금 + FIXED 가드(미래 OPEN 세션 무 + `activeSessionCount == totalSessionCount` + 모든 정션 FINALIZED) + 정산 생성을 **afterCommit REQUIRES_NEW** 로 분리한다. cancel 역시 `findByIdForUpdate` 잠금 후 호스트 일괄 환불을 트리거(pro-rata HOST_CANCEL, F17-08).

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#publish,close,cancel,reopen,update,delete` | 4 endpoint |
| Backend Service | `RegularMeetingService#publish,close,cancel,reopen,updateMeeting,deleteMeeting` | 락 + 가드 + afterCommit |
| Backend Entity | `RegularMeeting#transitionTo,publish,close,cancel,reopen` | 도메인 머신 |
| Backend Constants | `RegularMeetingStatus#getAllowedTransitions,canTransitionTo` | 머신 정의 |
| Backend Query | `RegularMeetingQueryRepository#findByIdForUpdate` | 비관적 잠금 |
| Settlement 후크 | `RegularMeetingService#close → afterCommit → RegularMeetingSettlementService.tryCreateSettlement(REQUIRES_NEW)` + failsafe 스케줄러 | F17-10 트리거 |
| Refund 후크 | `RegularMeetingService#cancel → RegularMeetingRefundService.refundAllForHostCancel` | F17-08 트리거 |

## 3. 전체 동작 흐름

### 3.1 publish (DRAFT → OPEN)
1. 호스트만 호출 가능 (`assertHost`).
2. FIXED: `totalSessionCount` 와 동수의 활성 세션이 등록되어 있어야 함. 미충족 → `REGULAR_MEETING_INVALID_STATUS`.
3. `transitionTo(OPEN)` → `publishedAt = now()` 자동 설정. 검색 노출 시작.

### 3.2 close (OPEN → CLOSED)
1. `findByIdForUpdate` 락.
2. FIXED 가드: 미래 OPEN 세션 무 + `activeSessionCount == totalSessionCount` + 모든 정션 `attendanceFinalizationStatus == FINALIZED` (출석 확정 모두 끝남).
3. 만족 시 `transitionTo(CLOSED)` → `closedAt = now()`.
4. **afterCommit** 동기화 (`TransactionSynchronization`) → 별도 트랜잭션(REQUIRES_NEW) 으로 `RegularMeetingSettlementService.tryCreateSettlement(meetingId)` 호출. 실패해도 close 자체는 롤백 안 됨 (1h failsafe 스케줄러가 재시도).

### 3.3 cancel (DRAFT|OPEN → CANCELED)
1. `findByIdForUpdate` 락 (close 정산 스냅샷과 cancel 환불 REQUIRES_NEW 경합 차단).
2. `transitionTo(CANCELED)` → `canceledAt = now()`.
3. ACTIVE 멤버(`PENDING/APPROVED_PENDING_PAYMENT/ENROLLED`) 전원에게 HOST_CANCEL pro-rata 환불 (F17-08).
4. 미래 활성 세션(`event.status != CANCELED`) 도 일괄 CANCELED 처리.
5. CANCELED 는 terminal — 재개 불가.

### 3.4 reopen (CLOSED → OPEN)
1. VARIABLE 자동종료(`lastEventCreatedAt + 90일` 등) 또는 수동 종료한 모임을 다시 OPEN.
2. `closedAt = null` 복귀. 기존 세션은 되살리지 않음(취소된 세션은 그대로).
3. FIXED 도 호출은 가능하나 close 가드 때문에 다시 close 하려면 세션 finalize 재확정 필요.

### 3.5 update (DRAFT only)
- `PATCH /api/v1/regular-meetings/{id}` 는 DRAFT 만. OPEN/CLOSED/CANCELED 는 `REGULAR_MEETING_INVALID_STATUS`.

### 3.6 delete (DRAFT only)
- `DELETE /api/v1/regular-meetings/{id}` 는 DRAFT 만. 데이터 hard delete.

## 4. 서버 계약

| 엔드포인트 | Method | 응답 | 상태 가드 |
|---|---|---|---|
| `/api/v1/regular-meetings/{id}/publish` | POST | `RegularMeetingVo` (status=OPEN) | DRAFT 만 |
| `/api/v1/regular-meetings/{id}/close` | POST | `RegularMeetingVo` (status=CLOSED) | OPEN 만 + FIXED 가드 |
| `/api/v1/regular-meetings/{id}/cancel` | POST | `RegularMeetingVo` (status=CANCELED) | DRAFT/OPEN |
| `/api/v1/regular-meetings/{id}/reopen` | POST | `RegularMeetingVo` (status=OPEN) | CLOSED 만 |
| `/api/v1/regular-meetings/{id}` | PATCH | `RegularMeetingVo` | DRAFT 만 |
| `/api/v1/regular-meetings/{id}` | DELETE | 204 | DRAFT 만 |

권한: 위 모두 `accessService.assertHost(meeting, principal.userId)` → 비호스트는 `REGULAR_MEETING_FORBIDDEN`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | 상세에서 호출 |
| Provider | `regularMeetingDetailProvider` invalidate 후 새 상태 노출 |
| 발행 CTA | DRAFT + 세션 추가 완료 후 노출 |
| 종료 CTA | OPEN + 호스트, FIXED 의 경우 finalize 안내 modal 동반 |
| 취소 CTA | DRAFT/OPEN + 호스트 + 확인 dialog ("멤버에게 전액 환불됩니다") |
| 재개 CTA | CLOSED + 호스트 + VARIABLE 만 표시 |
| 수정 화면 | `RegularMeetingEditScreen` — DRAFT 만 진입 가능. 5 필드 수정 (title/description/category/price/baseCapacity 등) |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S4-1 | DRAFT → publish 정상 | FIXED, 세션 8/8, DRAFT | 200, status=OPEN, publishedAt 설정 |
| S4-2 | publish 시 세션 부족 | FIXED, totalSessionCount=8, 활성 세션 5 | 400 `REGULAR_MEETING_INVALID_STATUS` |
| S4-3 | OPEN → close 정상 | FIXED, 모든 세션 FINALIZED | 200, status=CLOSED, **afterCommit** 정산 생성 |
| S4-4 | close 시 finalize 미완 | 마지막 세션 FINALIZATION_PENDING | 400 `REGULAR_MEETING_INVALID_STATUS` |
| S4-5 | OPEN → cancel | ACTIVE 멤버 3명 보유 | status=CANCELED. 멤버 전원 HOST_CANCEL pro-rata 환불 trigger |
| S4-6 | reopen | VARIABLE 자동종료 후 호스트가 재개 | status=OPEN, closedAt=null. 기존 세션 그대로 |
| S4-7 | 비호스트 publish 시도 | 다른 사용자 | 403 `REGULAR_MEETING_FORBIDDEN` |
| S4-8 | OPEN PATCH 시도 | OPEN 상태에서 수정 | 400 `REGULAR_MEETING_INVALID_STATUS` |
| S4-9 | DRAFT → DELETE | DRAFT | 204. hard delete |
| S4-10 | OPEN DELETE 시도 | OPEN | 400 `REGULAR_MEETING_INVALID_STATUS` |
| S4-11 | CANCELED 재개 시도 | CANCELED 모임 reopen | 400 — CANCELED 는 terminal |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 락 순서 | meeting → member → payment → wallet (RegularMeetingPaymentService 주석 C9/C10) | 일관 |
| close afterCommit | `TransactionSynchronizationManager.registerSynchronization(...)` + `tryCreateSettlement` REQUIRES_NEW | orphan 차단 확인됨 |
| failsafe 스케줄러 | `RegularMeetingSettlementScheduler` 1h 간격, CLOSED 모임 중 정산 미생성 재시도 | 백업 경로 |
| cancel 락 | `findByIdForUpdate` (Codex BLOCKING 6 해소) | close 정산 스냅샷과 경합 차단 |
| close FIXED 가드 일관성 | `activeSessionCount == totalSessionCount` + 모든 정션 FINALIZED | finalize 안 끝나면 close 불가 → 정산 후 환불 위험 0 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 잔여 | 구현 리포트 §9 | `retained ≤ 0` 종료 코스 failsafe 영구 재검사 (settlement-skipped 마커 누락) | non-blocking 백로그 |
| 위험 | reopen 환불 정책 | reopen 후 추가 세션을 더하고 다시 close 할 경우 정산 멱등 — `existsByRegularMeetingId` 가 막아줌 | 멱등 보장 확인됨 |
| 위험 | cancel 동시 호출 | 호스트가 cancel 직후 다른 디바이스에서 다시 cancel → 락 직렬화 + 두 번째는 INVALID_STATUS | 안전 |

## 9. 수용 기준

- **AC-01 (S4-1). publish 정상**: Given DRAFT + FIXED + 세션 충족. When `POST /publish`. Then status=OPEN + publishedAt 설정.
- **AC-02 (S4-3). close + 정산 생성**: Given FIXED + 모든 세션 finalize. When `POST /close`. Then 200 + CLOSED + afterCommit `Settlement(regularMeetingId=...)` 1건.
- **AC-03 (S4-5). cancel + 환불 trigger**: Given OPEN + ENROLLED 멤버 3. When `POST /cancel`. Then CANCELED + 3건 HOST_CANCEL refund record (pro-rata, F17-08).
- **AC-04 (S4-7). 비호스트 차단**: Given 다른 user. When publish 호출. Then 403 `REGULAR_MEETING_FORBIDDEN`.
- **AC-05 (S4-4). finalize 미완 close 차단**: Given 마지막 세션 미확정. Then 400.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| VARIABLE 자동종료 정책 | 1차는 수동 reopen 만 | 후속에 lastEventCreatedAt 기준 N일 후 auto-close 스케줄러 검토 |
| close 후 환불 약관 노출 | UI 미정 | F17-08 환불 정책 안내와 묶어 통합 modal |
