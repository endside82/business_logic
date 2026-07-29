# F21-05. 환불·회수 PRD

<!-- source-first; updated: 2026-07-29; source: community_api curated/ + payment/ + community_app curated/ -->

## 1. 결론

정산 전 전액환불(refund), 정산 전 부분환불(partial-refund), 정산 잠금 후 회수(clawback), 노쇼 forfeit(noshow-forfeit) 네 경로 모두 서버와 Flutter 양쪽에서 구현돼 있다. 서버는 각 경로별로 다른 규칙을 적용한다: refund는 coverage 행을 삭제해 재커버를 허용하고, partial-refund는 coverage/earning을 유지한 채 **참가자에게 돌려준 금액과 같은 금액**을 호스트 지갑에서 부담하며, clawback은 아직 미지급인 APPROVED/PENDING earning이면 지급 없이 취소하고 이미 PAID면 제공자 지갑에서 원 net을 회수(부족분 미수금 처리), noshow-forfeit은 SELF_PAID coverage를 NOSHOW_FORFEIT으로 전환한다. partial-refund와 clawback만 Idempotency-Key 헤더가 필수이며, Flutter 앱은 Repository에서 자동 발급한다. refund와 noshow-forfeit에는 해당 헤더가 없다. 분할납부(top-up 다중행) beneficiary에 대한 partial-refund/clawback은 `ASSIGNMENT_REFUND_AMBIGUOUS`로 서버가 거부한다.

### 2026-07-29 현재 소스 델타

- 전액환불은 원 charge의 플랫폼 수수료·원천징수·net 스냅샷을 함께 역분개하고 payer에게 gross를
  복원한다. 따라서 신규 5% 계약도 환불 시 원래 수수료/세금 다리가 보존된다.
- 부분환불(호스트 흡수)은 원 earning과 그 fee/tax/net을 바꾸지 않는다. 참가자 복원액만큼 호스트가
  부담하므로 제공자 수령액은 유지된다.
- clawback 시 earning이 APPROVED/PENDING이면 제공자에게 아직 준 돈이 없으므로 wallet 회수 없이
  참가자 gross 복원·fee/tax 역분개·earning REFUNDED로 끝난다. PAID일 때만 원 provider net을 회수하고
  잔액 부족분을 CREATOR_RECEIVABLE로 기록한다. 반환액을 임의 재계산하지 않고 원 스냅샷을 기준으로 한다.
- 환불·취소·clawback은 조건이 stale이어도 열어 두는 unwind 경로다. 반대로 noshow-forfeit은 돈
  진입 성격이어서 terms-managed 배정의 최신 수락을 요구한다.
- 배정 취소는 별도 수동 호출 없이 기존 charge들을 `reverseChargesOnTermination`으로 자동 되감는다.
  PAID 미적용 계약금만 제공자 귀속 예외다.
- NOSHOW_FORFEIT은 irreversible 상태가 아니다. 정산 전 CONFIRMED 동안 전액환불 경로가 money-backed
  row를 환불·삭제할 수 있다. noshow-forfeit 자체는 헤더 없이 같은 상태 재호출을 성공 no-op으로 끝낸다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `ServiceAssignmentController.java` | `refund`, `partial-refund`, `clawback`, `noshow-forfeit` 엔드포인트 |
| Backend Service | `ServiceAssignmentChargeService.java` | `refundParticipantCharge`, `partialRefundHostAbsorbed`, `clawbackAfterSettlement`, `markNoShowForfeit`, `reverseChargesOnTermination` |
| Backend Model | `ServiceAssignmentRefund.java`, `ServiceAssignmentCharge.java` | `refundType`, `amount`, `originalNet`, `recoveredAmount`, `refundTransactionId` |
| Backend Enum | `AssignmentRefundType.java` | `PARTIAL_HOST_ABSORBED`, `CLAWBACK` (2값) — `NOSHOW_FORFEIT`은 `CoverageType` 값(별개 enum) |
| Backend Port | `CuratedProviderEarningPort.java` | `refundServiceChargeEarning`, `partialHostAbsorbedRefund`, `clawbackFromProvider` |
| Frontend API | `service_assignment_api.dart` | `refund`, `partialRefund`, `clawback`, `noshowForfeit` |
| Frontend Repository | `service_assignment_repository.dart` | partial-refund/clawback에만 `ClientMessageId.generate()` 자동 멱등키 |
| Frontend Screen | `event_assignments_screen.dart` | `_refund`, `_partialRefund`, `_clawback`, `_noshowForfeit`, `CoverageBeneficiaryPickerSheet` |
| Verification | 서버 유닛 테스트 + 서버/Flutter 소스 실측 | 경로별 멱등 범위·분기별 earning·현재 앱 액션 |

## 3. 전체 동작 흐름

### 3-A. 정산 전 전액환불(refund)

1. 호스트가 배정 카드 "환불" 버튼 → `CoverageBeneficiaryPickerSheet.show`에서 coverage 목록 조회 후 beneficiary 선택.
2. `ServiceAssignmentRepository.refund(eventId, assignmentId, ServiceAssignmentRefundParam(beneficiaryUserId))`를 호출한다.
3. 서버 `refundParticipantCharge`:
   - 배정 `CONFIRMED`(LOCKED 아님) 검증
   - money rows(FREE_EXCLUDED·미완 제외) 조회 — 없으면 `ASSIGNMENT_SETTLEMENT_INVALID_EARNING`
   - 이미 부분환불 이력이 있는 charge면 `ASSIGNMENT_REFUND_AMBIGUOUS` (전액환불은 모호)
   - clean 행마다: `providerEarningPort.refundServiceChargeEarning`(payer에게 복원 + earning REFUNDED) → coverage 행 `DELETE`
4. 성공 시 coverage 행이 삭제되어 beneficiary는 재커버 가능 상태가 된다(F3 게이트 미통과 상태로 복귀).

### 3-B. 정산 전 부분환불(partial-refund, 호스트 부담)

1. 호스트가 "부분환불" 버튼 → `CoverageBeneficiaryPickerSheet.show(filter: selfPaidOnly)`로 SELF_PAID 대상만 선택, 금액 입력.
2. `ServiceAssignmentRepository.partialRefund(eventId, assignmentId, param, idempotencyKey: ClientMessageId.generate())`
3. 서버 `partialRefundHostAbsorbed`:
   - CONFIRMED 배정·SELF_PAID coverage·분할납부(top-up 다중행) beneficiary면 `ASSIGNMENT_REFUND_AMBIGUOUS`
   - over-refund 가드: 기존 부분환불 누적 + 이번 금액 ≤ charge.amount
   - `providerEarningPort.partialHostAbsorbedRefund`: 참가자에게 partialAmount 복원, 호스트 지갑에서 partialAmount 차감
   - `service_assignment_refund` 행 INSERT(`PARTIAL_HOST_ABSORBED`, `hostRecoveryTransactionId` 포함)
4. coverage/earning은 불변 — 제공자 전액 수령 유지. 배정 취소 시 `reverseChargesOnTermination`이 `hostAbsorbed` 역환불로 분할 처리.

### 3-C. 정산 잠금 후 회수(clawback)

1. 배정이 `SETTLEMENT_LOCKED`. 호스트가 "정산후 환불" 버튼 → coverage picker → confirm dialog.
2. `ServiceAssignmentRepository.clawback(eventId, assignmentId, ServiceAssignmentClawbackParam(beneficiaryUserId), idempotencyKey: auto)`
3. 서버 `clawbackAfterSettlement`:
   - `SETTLEMENT_LOCKED` 검증 (정산 전이면 일반 환불 경로)
   - 분할납부 beneficiary면 `ASSIGNMENT_REFUND_AMBIGUOUS`
   - 기존 CLAWBACK audit 행 있으면 `ASSIGNMENT_REFUND_ALREADY_PROCESSED` (멱등)
   - earning APPROVED/PENDING(주간 지급 전): 원 납부자에게 gross 복원, fee/tax 역분개,
     earning REFUNDED, provider 회수액 0
   - earning PAID(주간 지급 후): 원 납부자에게 gross 복원 + 제공자 지갑에서 원 net 회수
     (가능분 clamp, 부족분 = 제공자 CREATOR_RECEIVABLE 미수금)
   - `service_assignment_refund` 행 INSERT(`CLAWBACK`, `originalNet`, `recoveredAmount`, `refundTransactionId`)
4. coverage는 보존(LOCKED terminal이라 재커버 불가), audit 행이 이력 증거.

### 3-D. 노쇼 forfeit(noshow-forfeit)

1. 회차 종료 후 호스트가 "노쇼 귀속" 버튼 → SELF_PAID picker → confirm dialog.
2. `ServiceAssignmentRepository.noshowForfeit(eventId, assignmentId, ServiceAssignmentRefundParam(beneficiaryUserId))`
3. 서버 `markNoShowForfeit`:
   - CONFIRMED·회차 종료(`assertEventEnded`) 검증
   - beneficiary가 실제 출석자면 `ASSIGNMENT_BENEFICIARY_ATTENDED` 거부
   - SELF_PAID rows를 `NOSHOW_FORFEIT`으로 전환 (돈/earning 불변)
4. F3 완납 게이트가 NOSHOW_FORFEIT beneficiary를 `expectedBeneficiaries`에 더해 "출석 면제·커버됨"으로 인정 → 정산 통과, 제공자 수령.

## 4. 서버 계약

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/refund`

| 항목 | 값 |
|---|---|
| 인증/권한 | 필수, 호스트/co-host |
| Request Body | `ServiceAssignmentRefundParam` — `beneficiaryUserId: long` |
| 응답 | `void` (200) |
| Idempotency-Key | 없음. 성공 뒤 coverage가 삭제되어 같은 대상 재호출은 동일 결과 재생이 아니라 도메인 에러 |
| 가드 | CONFIRMED·money rows 존재·부분환불 이력 없는 행만·FREE_EXCLUDED 대상 아님 |
| Side effect | 납부자(payer)에게 전액 복원 + earning REFUNDED + coverage 행 DELETE |
| 에러 | `ASSIGNMENT_NOT_CONFIRMED`, `ASSIGNMENT_SETTLEMENT_INVALID_EARNING`, `ASSIGNMENT_REFUND_AMBIGUOUS` |

### `POST .../partial-refund` (Idempotency-Key 필수)

| 항목 | 값 |
|---|---|
| Request Header | `Idempotency-Key: String` (필수, Reserve-Before-Execute) |
| Request Body | `ServiceAssignmentPartialRefundParam` — `beneficiaryUserId: long`, `partialAmount: long` |
| 응답 | `ServiceAssignmentRefundVo` — `refundType`, `recoveredAmount`, `refundTransactionId` (`hostRecoveryTransactionId`는 엔티티에만 존재, VO 미노출) |
| 가드 | CONFIRMED·SELF_PAID·단일 money row·over-refund 불가 |
| Side effect | 참가자 partialAmount 복원 + 호스트 지갑 partialAmount 차감 + `service_assignment_refund` INSERT |
| 에러 | `ASSIGNMENT_NOT_CONFIRMED`, `ASSIGNMENT_REFUND_AMBIGUOUS`, `ASSIGNMENT_REFUND_EXCEEDS_CHARGE`, `ASSIGNMENT_SETTLEMENT_INVALID_EARNING` |

### `POST .../clawback` (Idempotency-Key 필수)

| 항목 | 값 |
|---|---|
| Request Header | `Idempotency-Key: String` (필수) |
| Request Body | `ServiceAssignmentClawbackParam` — `beneficiaryUserId: long` |
| 응답 | `ServiceAssignmentRefundVo` — `refundType=CLAWBACK`, `originalGross`, `originalNet`, `recoveredAmount`, `refundTransactionId` |
| 가드 | SETTLEMENT_LOCKED·money-backed coverage·earning PENDING/APPROVED/PAID·CLAWBACK audit 행 부재·단일 money row |
| Side effect | 납부자 gross 복원. 미지급 earning은 REFUNDED/회수 0, PAID는 provider net 회수(clamp)+부족분 미수금. `service_assignment_refund` INSERT |
| 에러 | `ASSIGNMENT_NOT_SETTLED`, `ASSIGNMENT_REFUND_AMBIGUOUS`, `ASSIGNMENT_REFUND_ALREADY_PROCESSED`, `ASSIGNMENT_SETTLEMENT_INVALID_EARNING` |

### `POST .../noshow-forfeit`

| 항목 | 값 |
|---|---|
| Request Body | `ServiceAssignmentRefundParam` — `beneficiaryUserId: long` |
| 응답 | `void` (200) |
| Idempotency-Key | 없음. 이미 모든 money row가 NOSHOW_FORFEIT이면 성공 no-op |
| 가드 | CONFIRMED·회차 종료·SELF_PAID rows 존재·실제 노쇼(출석자면 거부) |
| Side effect | coverage_type SELF_PAID → NOSHOW_FORFEIT 전환 (돈/earning 불변) |
| 에러 | `ASSIGNMENT_NOT_CONFIRMED`, `ASSIGNMENT_EVENT_NOT_ENDED`, `ASSIGNMENT_BENEFICIARY_ATTENDED`, `ASSIGNMENT_SETTLEMENT_INVALID_EARNING` |

### AssignmentRefundType enum(소스: `AssignmentRefundType.java`)

| 값 | 의미 |
|---|---|
| `PARTIAL_HOST_ABSORBED` | 정산 전 부분환불. 제공자 전액 유지, 호스트가 참가자 복원액과 같은 금액 부담 |
| `CLAWBACK` | 정산 잠금 후 환불. 미지급은 earning 취소, PAID는 provider net 회수(clamp)·부족분 미수금 |

## 5. 프론트 계약

| 항목 | 구현 |
|---|---|
| Screen | `EventAssignmentsScreen` |
| 환불 대상 선택 | `CoverageBeneficiaryPickerSheet.show(eventId, assignmentId)` — 기본: 전체 coverage |
| 부분환불/노쇼 대상 선택 | `CoverageBeneficiaryPickerSheet.show(filter: CoveragePickerFilter.selfPaidOnly)` |
| 멱등키 | `ServiceAssignmentRepository.partialRefund/clawback`에서만 `ClientMessageId.generate()` 자동 발급. refund/noshow-forfeit에는 키 없음 |
| refund Repository | `Result<void>` |
| partial-refund Repository | `Result<ServiceAssignmentRefundVo>` |
| clawback Repository | `Result<ServiceAssignmentRefundVo>` |
| noshow-forfeit Repository | `Result<void>` |
| 노출 조건 | 환불·부분환불·노쇼귀속: 배정 `CONFIRMED`만 / 정산후환불: `settlementLocked`만 |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + CONFIRMED + 전액환불 | `refundParticipantCharge` | "환불" 버튼 노출 | coverage 삭제·재커버 가능 | 일치 |
| 호스트 + CONFIRMED + 부분환불(단일 row) | `partialRefundHostAbsorbed` | "부분환불" 버튼, SELF_PAID picker | 참가자 복원·호스트 차감·제공자 전액 유지 | 일치 |
| 호스트 + CONFIRMED + 부분환불(분할납부 다중row) | `ASSIGNMENT_REFUND_AMBIGUOUS` | 서버 에러 | 거부 | 일치(서버 백스톱) |
| 호스트 + SETTLEMENT_LOCKED + clawback | `clawbackAfterSettlement` | "정산후 환불" 버튼 노출 | 참가자 복원. 미지급은 earning 취소, PAID는 provider net 회수 | 일치 |
| 호스트 + CONFIRMED + 노쇼 forfeit(출석자 대상) | `ASSIGNMENT_BENEFICIARY_ATTENDED` | 서버 에러 | 거부 | 일치 |
| 호스트 + CONFIRMED + 노쇼 forfeit(회차 미종료) | `ASSIGNMENT_EVENT_NOT_ENDED` | 서버 에러 | 거부 | 일치 |
| 재시도(이미 CLAWBACK된 coverage) | `ASSIGNMENT_REFUND_ALREADY_PROCESSED` | 서버 에러 | 거부 | 일치(멱등 가드) |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| Idempotency-Key 범위 | partial-refund/clawback controller만 `@RequestHeader(required=true)` | 두 repository 메서드만 자동 생성 | 일치 |
| `AssignmentRefundType` | `PARTIAL_HOST_ABSORBED`, `CLAWBACK` | `service_assignment_refund_vo.dart`에서 string 수신 | 일치 |
| 분할납부 Ambiguous | `assertSingleMoneyRow` | 서버 에러 토스트 | 일치(프론트 사전 필터링 없음) |
| noshow-forfeit 회차 종료 강제 | `assertEventEnded` | 서버 에러 토스트 | 일치(프론트 종료 여부 사전 체크 없음) |
| clawback LOCKED 강제 | `SETTLEMENT_LOCKED` 상태 체크 | 버튼 `settlementLocked`일 때만 노출 | 일치 |
| 부족분 미수금(shortfall) | `CREATOR_RECEIVABLE` 기록 | `ServiceAssignmentRefundVo`의 `recoveredAmount`만 노출 | Derived: shortfall 표시 없음 — UI 정보 제한 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 분할납부 beneficiary에 대한 clawback/partial-refund UI 사전 필터링 없음 | picker는 cover 목록을 그대로 노출, 서버가 `ASSIGNMENT_REFUND_AMBIGUOUS`로 거부 | 에러 후 재시도 UX | picker에 `charge_order > 1` 행 존재 시 경고 표시 |
| P1 | noshow-forfeit 회차 종료 전 버튼 노출 | 서버가 `ASSIGNMENT_EVENT_NOT_ENDED`로 거부하지만 프론트는 별도 체크 없음 | 에러 후 재시도 UX | `isEventEnded` 조건으로 버튼 비활성화 |
| P2 | clawback 부족분(shortfall) 표시 부재 | `ServiceAssignmentRefundVo`에 `recoveredAmount` 있으나 shortfall 계산값을 UI에 노출하지 않음 | 제공자 미수금 규모를 호스트가 파악 불가 | refund VO에 `shortfall` 필드 추가 + UI 표시 |
| P3 | 배정 취소 시 `reverseChargesOnTermination`의 `hostRecoveryTransactionId` 누락 데이터 처리 | V1 DDL 기준이라 없는 데이터는 없어야 하지만, 방어 코드가 `ASSIGNMENT_SETTLEMENT_INVALID_EARNING`으로 차단 | 구버전 데이터 없음(V1 단일파일 정책) | 모니터링만 — 신규 데이터에서 발생 불가 |
| Risk | refund/noshow-forfeit는 Idempotency-Key 계약이 아님 | refund는 성공 후 행 삭제, noshow는 상태 no-op으로 중복 돈 이동을 막지만 동일 응답 replay는 아님 | 모든 환불 API가 같은 멱등 의미라고 오해할 수 있음 | API 문서/클라이언트 재시도 정책을 경로별로 구분 |

## 9. 수용 기준

### AC-01. 정산 전 전액환불 정상 흐름

Given 호스트가 CONFIRMED 배정, SELF_PAID coverage 보유 beneficiary를 선택한다.  
When `POST .../refund`를 호출한다.  
Then payer(참가자)에게 전액 복원, earning REFUNDED, coverage 행 삭제. Flutter는 "환불 처리되었습니다" 토스트를 표시한다.

### AC-02. 부분환불 호스트 부담

Given CONFIRMED 배정, 단일 SELF_PAID charge(10000원) 보유 beneficiary에게 3000원 부분환불.  
When `POST .../partial-refund`(Idempotency-Key 포함)을 호출한다.  
Then 참가자에게 3000원 복원, 호스트 지갑 3000원 차감, 제공자 earning 10000원 유지. `service_assignment_refund`에 `PARTIAL_HOST_ABSORBED` 행 INSERT.

### AC-03. 부분환불 멱등키 재시도 차단

Given 동일한 Idempotency-Key로 부분환불 요청이 재시도된다.  
When `ApiIdempotencyExecutor`가 same key를 수신한다.  
Then 첫 결과를 그대로 반환(이중환불 없음).

### AC-04. 분할납부 beneficiary 부분환불 거부

Given 동일 beneficiary에 SELF_PAID charge가 order=1, order=2 두 행 있다.  
When `POST .../partial-refund`를 호출한다.  
Then 서버가 `ASSIGNMENT_REFUND_AMBIGUOUS`를 반환. Flutter는 에러 토스트.

### AC-05. 정산 후 clawback — 제공자 net 회수

Given 신규 5% 카탈로그 배정이 SETTLEMENT_LOCKED이고 주간 지급까지 끝났으며, 참가자가 10000원
납부했다(fee 500원, withholding 314원, provider net 9186원).
When `POST .../clawback`(Idempotency-Key 포함)을 호출한다.
Then 참가자에게 10000원 복원, 제공자 지갑에서 원 스냅샷 net 9186원 회수(충분할 때). 부족 시 부족분
CREATOR_RECEIVABLE. `service_assignment_refund` CLAWBACK 행 INSERT.

### AC-05-A. 정산 잠금 후·주간 지급 전 clawback

Given 배정은 SETTLEMENT_LOCKED지만 원 earning이 APPROVED다.
When 같은 clawback을 호출한다.
Then 참가자에게 gross를 복원하고 fee/tax를 역분개하며 earning을 REFUNDED로 바꾼다.
제공자 지갑 회수액과 미수금은 0이다.

### AC-06. 동일 coverage 중복 clawback 차단

Given 이미 CLAWBACK된 coverage에 대해 재clawback 시도.  
When `POST .../clawback`을 재호출한다.  
Then 서버가 `ASSIGNMENT_REFUND_ALREADY_PROCESSED`를 반환.

### AC-07. 노쇼 forfeit — 제공자 귀속

Given 회차 종료 후 SELF_PAID 예약금 납부 beneficiary가 실제 노쇼다.  
When `POST .../noshow-forfeit`을 호출한다.  
Then coverage_type이 NOSHOW_FORFEIT으로 전환(돈/earning 불변). F3 완납 게이트가 해당 beneficiary를 커버됨으로 인정.

### AC-08. 노쇼 forfeit 실출석자 차단

Given beneficiary가 실제 출석자다.  
When `POST .../noshow-forfeit`을 호출한다.  
Then `ASSIGNMENT_BENEFICIARY_ATTENDED` 반환. Flutter 에러 토스트.

### AC-09. 노쇼 귀속 후 정산 전 전액환불

Given CONFIRMED 배정의 money-backed coverage가 NOSHOW_FORFEIT으로 바뀌었지만 아직 정산 전이다.
When 호스트가 같은 beneficiary에 `POST .../refund`를 호출한다.
Then payer에게 gross를 복원하고 earning을 REFUNDED로 바꾼 뒤 coverage 행을 삭제한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 분할납부 beneficiary picker 경고 | picker에서 `charge_order > 1` 행 존재 여부 확인 후 경고 배너 |
| 구현 | noshow-forfeit 버튼 회차 종료 조건부 활성 | `isEventEnded` 플래그 Flutter 노출 필요 |
| 구현 | clawback shortfall 표시 | `ServiceAssignmentRefundVo`에 `shortfall` 추가 + UI |
| 정책 | 분할납부 partial-refund 지원 여부 | multi-row refund는 복잡도 높음 — 정책 결정 필요 |
