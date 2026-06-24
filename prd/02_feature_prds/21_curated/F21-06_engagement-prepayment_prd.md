# F21-06. 계약금 선납(engagement) PRD

## 1. 결론

계약금 선납(engagement)은 서버와 Flutter 양쪽에서 구현이 닫혀 있다. 호스트가 제공자와 합의한 총 보수 X를 `service_engagement`에 기록하고, 그 일부 D(계약금)를 지갑으로 선납한다. 정산 시 Σ(참가자 charge) + D == X 검증을 통해 이중 재원화를 구조적으로 차단한다. 배정 취소 시 D는 제공자에게 forfeit(비환불)되고, service-fee(보장수수료 모드, serviceFeeGross > 0)와 engagement는 상호 배타적이다(`ASSIGNMENT_FEE_AUTHORITY_CONFLICT`). Flutter는 `hasServiceFee`/`hasEngagement` 플래그로 UI 버튼을 사전 분기한다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `ServiceAssignmentController.java` | `POST .../prepayment/wallet`, `POST .../prepayment/{prepaymentId}/cancel` |
| Backend Service | `ServiceAssignmentPrepaymentService.java` | `payByWallet`, `cancelPending` |
| Backend Settlement | `ServiceAssignmentSettlementService.java` | `applyDepositIfPresent`, `forfeitOnAssignmentCancel` |
| Backend Model | `ServiceEngagement.java` | `agreedProviderFee`, `status(ServiceEngagementStatus)`, `hostUserId`, `providerUserId` |
| Backend Model | `ServiceAssignmentPrepayment.java` | `engagementId`, `amount`, `method`, `status`, `applicationType`, `pointTxId`, `creatorEarningId` |
| Backend Model | `ServiceAssignment.java` | `engagementId`, `requiresDeposit`, `serviceFeeGross` |
| Backend Enum | `ServicePrepaymentMethod.java`, `ServicePrepaymentStatus.java`, `PrepaymentApplicationType.java`, `ServiceEngagementStatus.java` | WALLET·PAID·CANCELED·APPLIED_TO_PROVIDER·FORFEIT_TO_PROVIDER·DRAFT |
| Frontend API | `service_assignment_api.dart` | `createPrepayment`, `cancelPrepayment` |
| Frontend Repository | `service_assignment_repository.dart` | `ServiceAssignmentPrepaymentCreateParam` |
| Frontend Screen | `event_assignments_screen.dart` | `canPrepay = !hasServiceFee`, `_createPrepayment` 바텀시트 |
| Verification | 서버 유닛 테스트 / codex 합의 PASS | X 검증·forfeit·authority XOR |

## 3. 전체 동작 흐름

### 3-A. 계약금 선납(payByWallet)

1. 호스트가 배정 카드의 "계약금" 버튼을 누른다. 버튼은 `canPrepay = !hasServiceFee`가 true일 때만 노출된다(서비스비 보장모드이면 engagement 금지 — authority XOR).
2. 바텀시트에서 약정 총 보수 X(`agreedProviderFee`)와 계약금 D(`depositAmount`)를 입력한다. 클라이언트에서 `0 < D < X` 범위를 사전 검증한다.
3. `ServiceAssignmentRepository.createPrepayment(eventId, assignmentId, ServiceAssignmentPrepaymentCreateParam(agreedProviderFee, depositAmount))`를 호출한다. `method`는 항상 `WALLET`(P1 범위).
4. 서버 `ServiceAssignmentPrepaymentService.payByWallet`:
   - `assertHostOrCoHost(eventId, hostUserId)` 권한
   - 배정 상태 `ACCEPTED` 또는 `CONFIRMED` (수락 후에만)
   - `method == WALLET` (P1: WALLET only, 그 외 `ASSIGNMENT_PREPAYMENT_METHOD_UNSUPPORTED`)
   - `0 < D < X` 검증 (`ASSIGNMENT_PREPAYMENT_INVALID_AMOUNT`)
   - 자전거래 차단: `provider == host` (`ASSIGNMENT_SELF_CHARGE`)
   - authority XOR: `serviceFeeGross > 0`이면 `ASSIGNMENT_FEE_AUTHORITY_CONFLICT`
   - `resolveOrCreateEngagement`: engagement 신규 생성 또는 기존 engagement의 `agreedProviderFee` 불변 검증 (`ASSIGNMENT_FEE_MISMATCH`)
   - 활성 계약금(PAID/미취소) 중복 방지 (`ASSIGNMENT_PREPAYMENT_ALREADY_EXISTS`)
   - `service_assignment_prepayment` INSERT(예약, UNIQUE `active_engagement_id` DB 중복 차단)
   - `WalletLedgerFacade.spendAndJournal`: 호스트 지갑 D 차감(PAID_ONLY) + `SERVICE_PREPAYMENT_CLEARING` 청산계정 분개
   - `prepayment.status = PAID`, `pointTxId` 갱신
   - `assignment.engagementId` 설정, `requiresDeposit = true`
5. Flutter는 성공 토스트 표시. 배정 카드에서 `engagementId != null`로 이후 "계약금" 버튼을 숨긴다.

### 3-B. 계약금 적용(정산 시, lockAndSettle 내부)

1. 호스트가 `POST .../settle`을 트리거한다.
2. `ServiceAssignmentSettlementService.applyDepositIfPresent`:
   - `engagement.agreedProviderFee = X` 조회
   - PAID·미적용(`applicationTye == null`) prepayment 확인
   - `participantCovered(Σ참가자 charge) + depositAmount == X` 검증 (`ASSIGNMENT_FEE_MISMATCH`)
   - `providerEarningPort.applyPrepaymentEarning`: 청산계정 → payable 분개 + 제공자 earning 생성
   - `earningIds` + `validSourceIds`에 prepayment id 추가
   - `prepayment.applicationType = APPLIED_TO_PROVIDER` 마킹
3. charge earning + 계약금 earning 합산하여 `settlementPort.approveAssignmentEarnings` 지급 대기.

### 3-C. 배정 취소 시 forfeit(forfeitOnAssignmentCancel)

1. 배정이 취소(`CANCELED`)되면 `ServiceAssignmentService.cancel`이 `settlementService.forfeitOnAssignmentCancel`을 호출한다.
2. PAID·미적용 prepayment가 있으면: `providerEarningPort.applyPrepaymentEarning`으로 청산→payable 분개 + earning 생성.
3. `settlementPort.approveAssignmentEarnings`로 APPROVED 마킹(실지급은 L4 주간 배치).
4. `prepayment.applicationType = FORFEIT_TO_PROVIDER` 마킹 (호스트 환불 없음).

### 3-D. PENDING 계약금 취소(cancelPending — 드묾)

WALLET 결제는 즉시 PAID라 이 경로는 거의 실행되지 않는다. PENDING 상태인 경우에만 취소 가능.

## 4. 서버 계약

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/prepayment/wallet`

| 항목 | 값 |
|---|---|
| Controller | `ServiceAssignmentController#payPrepaymentByWallet` |
| 인증/권한 | 필수, 호스트/co-host |
| Request Body | `ServiceAssignmentPrepaymentCreateParam` — `agreedProviderFee: long`, `depositAmount: long`, `method: ServicePrepaymentMethod` |
| 응답 | `ServiceAssignmentPrepaymentVo` (HTTP 201) |
| 가드 | ACCEPTED\|CONFIRMED · 0<D<X · WALLET only · 자전거래 차단 · authority XOR · 활성 계약금 1건 가드 |
| Side effect | `service_engagement` 생성(또는 확인) + `service_assignment_prepayment` INSERT + 호스트 지갑 차감 + 청산계정 분개 + `assignment.engagementId` 설정 |
| 에러 | `ASSIGNMENT_NOT_FOUND`, `ASSIGNMENT_INVALID_STATE`, `ASSIGNMENT_PREPAYMENT_METHOD_UNSUPPORTED`, `ASSIGNMENT_PREPAYMENT_INVALID_AMOUNT`, `ASSIGNMENT_SELF_CHARGE`, `ASSIGNMENT_FEE_AUTHORITY_CONFLICT`, `ASSIGNMENT_PREPAYMENT_ALREADY_EXISTS`, `ASSIGNMENT_FEE_MISMATCH`(X 불일치) |

### `POST .../prepayment/{prepaymentId}/cancel`

| 항목 | 값 |
|---|---|
| 응답 | `void` (200) |
| 가드 | PENDING 상태만(`ASSIGNMENT_PREPAYMENT_NOT_CANCELABLE` — PAID는 비환불) |
| Side effect | `prepayment.status = CANCELED` |

### service-fee와 engagement 상호배타(authority XOR)

| 모드 | `serviceFeeGross` | `engagementId` | 적용 게이트 |
|---|---|---|---|
| 수금액 모드 | 0 | null | 제한 없음 |
| 보장수수료 모드 | > 0 | null | F3 완납 게이트: Σcharge == X |
| 계약금 모드 | 0 (강제) | not null | F3 게이트: Σcharge + D == X |
| 충돌 | > 0 | not null | `ASSIGNMENT_FEE_AUTHORITY_CONFLICT` — 두 모드 동시 불가 |

### ServicePrepaymentStatus enum(소스: `ServicePrepaymentStatus.java`)

| 값 | 의미 |
|---|---|
| PENDING | 결제 대기(WALLET은 즉시 PAID) |
| PAID | 지갑 차감 완료, 청산계정 대기 |
| CANCELED | PENDING 취소(PAID는 취소 불가) |

### PrepaymentApplicationType enum(소스: `PrepaymentApplicationType.java`)

| 값 | 의미 |
|---|---|
| `APPLIED_TO_PROVIDER` | 정산 시 제공자 earning으로 적용됨 |
| `FORFEIT_TO_PROVIDER` | 배정 취소 시 제공자 forfeit 귀속 |

## 5. 프론트 계약

| 항목 | 구현 |
|---|---|
| Screen | `EventAssignmentsScreen._AssignmentCard._HostActions` |
| 계약금 버튼 노출 조건 | `canPrepay = !hasServiceFee` (보장수수료 모드이면 숨김) |
| 클라 사전 검증 | `fee > 0 && deposit > 0 && deposit < fee` — 서버 게이트와 정확히 일치 |
| Repository 메서드 | `ServiceAssignmentRepository.createPrepayment(eventId, assignmentId, ServiceAssignmentPrepaymentCreateParam)` |
| 응답 VO | `ServiceAssignmentPrepaymentVo` — Freezed, 필드: `id`, `engagementId`, `amount`, `method`, `status`, `paidAt` |
| 취소 | `ServiceAssignmentRepository.cancelPrepayment(eventId, assignmentId, prepaymentId)` |
| 계약금 후 버튼 숨김 | `item.engagementId != null` → `canPrepay = !hasServiceFee`(engagement 배정은 serviceFeeGross=0이므로 hasServiceFee=false → canPrepay=true가 되는 의도치 않은 동작 가능성 — Gap P2 참조) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + ACCEPTED + 수금액 모드 | `payByWallet` 통과 | `canPrepay=true` | 계약금 선납 가능 | 일치 |
| 호스트 + 보장수수료 모드(X>0) | `ASSIGNMENT_FEE_AUTHORITY_CONFLICT` | `canPrepay=false`, 버튼 숨김 | 버튼 미노출 | 일치(이중 가드) |
| 호스트 = 제공자(자전거래) | `ASSIGNMENT_SELF_CHARGE` | 서버 에러 토스트 | 거부 | 일치(서버 백스톱) |
| D >= X 또는 D <= 0 | `ASSIGNMENT_PREPAYMENT_INVALID_AMOUNT` | 클라 사전 검증 거부 | 바텀시트 에러 토스트 | 일치(이중 가드) |
| 동일 engagement 활성 계약금 존재 | `ASSIGNMENT_PREPAYMENT_ALREADY_EXISTS` | 서버 에러 토스트 | 거부 | 일치 |
| 정산 시 Σcharge + D ≠ X | `ASSIGNMENT_FEE_MISMATCH` | 서버 에러 토스트 | 정산 거부 | 일치 |
| PAID 계약금 취소 시도 | `ASSIGNMENT_PREPAYMENT_NOT_CANCELABLE` | 서버 에러 토스트 | 거부 | 일치 |
| 배정 취소 시 PAID 계약금 | `forfeitOnAssignmentCancel` 자동 실행 | 배정 취소 결과 화면 | D 제공자 forfeit(비환불) | 일치 |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| authority XOR 게이팅 | `serviceFeeGross > 0` → `ASSIGNMENT_FEE_AUTHORITY_CONFLICT` | `canPrepay = !hasServiceFee` | 일치 |
| X 불변 정책 | `agreedProviderFee` 재입력 시 기존과 일치 검증 | 클라는 매번 X 입력 — 두 번째 계약금 시도 시 다른 X 입력 가능(서버가 거부) | 서버 단독 보호 |
| 계약금 후 버튼 재노출 | `assignment.engagementId != null`이면 기존 engagement 재사용(새 계약금 중복 거부) | `canPrepay = !hasServiceFee` — engagement 배정은 `serviceFeeGross=0`이라 `hasServiceFee=false` → 버튼 재노출 | Gap: 이미 계약금 있는 배정에서 "계약금" 버튼이 다시 노출됨(서버가 `ALREADY_EXISTS`로 거부하지만 UX 혼란) |
| 정산 연결(`engagementId↔serviceFeeGross`) | `applyDepositIfPresent`에서 engagement null/not-null 분기 | `ServiceAssignmentVo.engagementId` 필드로 판단 | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 이미 계약금 있는 배정에서 "계약금" 버튼 재노출 | `canPrepay = !hasServiceFee`는 engagement 여부를 체크하지 않음. engagement 배정은 `serviceFeeGross=0`이라 `hasServiceFee=false` → 버튼 노출 | 서버가 `ASSIGNMENT_PREPAYMENT_ALREADY_EXISTS`로 거부하지만 사용자 UX 혼란 | `canPrepay = !hasServiceFee && item.engagementId == null`으로 수정 |
| P2 | 계약금 조회 GET 엔드포인트 없음 | 서버에 `GET .../prepayment` 없음. 앱에서 현재 계약금 상태·금액을 직접 표시 불가 | 호스트가 계약금 납부 여부·금액을 배정 목록에서 확인 불가 | `ServiceAssignmentVo`에 `depositAmount`, `depositStatus` 추가 또는 별도 GET 엔드포인트 |
| P2 | PAID 계약금 취소 경로 없음 | `cancelPending`은 PENDING만 허용. WALLET은 즉시 PAID라 취소 불가 | 호스트가 계약금 잘못 납부 시 배정 취소(forfeit)만 가능 | 운영 정책 결정: PAID 계약금 취소+환불 경로 추가 여부 |
| P3 | 자전거래(호스트=제공자) 프론트 사전 차단 없음 | 서버 `ASSIGNMENT_SELF_CHARGE`로 거부하지만 앱은 별도 체크 없음 | 에러 후 재시도 UX | 배정 생성 시점에 호스트=제공자 판단하여 계약금 버튼 비활성 |

## 9. 수용 기준

### AC-01. 계약금 선납 정상 흐름

Given 호스트가 ACCEPTED 배정(수금액 모드, serviceFeeGross=0)에서 계약금 버튼을 누른다.  
When X=100000, D=30000 입력 후 제출한다.  
Then `service_engagement.agreedProviderFee=100000`, `service_assignment_prepayment.status=PAID`, `assignment.engagementId` 설정. 호스트 지갑 30000원 차감. Flutter 성공 토스트.

### AC-02. authority XOR — 보장수수료 모드에서 계약금 버튼 숨김

Given 호스트가 serviceFeeGross=50000인 배정을 본다.  
When 배정 카드를 렌더링한다.  
Then `canPrepay=false`로 "계약금" 버튼이 숨겨진다. 서버도 `ASSIGNMENT_FEE_AUTHORITY_CONFLICT`로 거부한다.

### AC-03. 정산 시 Σcharge + D == X 검증

Given engagement 배정에서 D=30000, 참가자 Σcharge=70000, X=100000.  
When 호스트가 settle을 트리거한다.  
Then `applyDepositIfPresent` 통과(70000+30000==100000). earning APPROVED 상태로 전환.

### AC-04. 정산 시 X 불일치 거부

Given engagement 배정에서 D=30000, 참가자 Σcharge=50000, X=100000.  
When 호스트가 settle을 트리거한다.  
Then `ASSIGNMENT_FEE_MISMATCH`로 정산 거부. Flutter 에러 토스트.

### AC-05. 배정 취소 시 PAID 계약금 forfeit

Given PAID 계약금 D=30000이 있는 배정이 취소된다.  
When `ServiceAssignmentService.cancel`이 호출된다.  
Then `forfeitOnAssignmentCancel`이 자동 실행: 청산계정 → payable 분개, earning APPROVED. 호스트에게 환불 없음. `prepayment.applicationType=FORFEIT_TO_PROVIDER`.

### AC-06. D >= X 클라이언트 사전 검증

Given 바텀시트에서 X=100000, D=100000(D==X 시도).  
When 제출 버튼을 누른다.  
Then 클라이언트에서 `deposit >= fee` 조건으로 에러 토스트 표시. 서버 요청 안 함.

### AC-07. 중복 계약금 거부

Given PAID 계약금이 이미 있는 engagement에 두 번째 계약금 시도.  
When `POST .../prepayment/wallet`를 호출한다.  
Then `ASSIGNMENT_PREPAYMENT_ALREADY_EXISTS` 반환. Flutter 에러 토스트.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | `canPrepay` 조건 수정 | `!hasServiceFee && item.engagementId == null` |
| 구현 | 배정 VO에 계약금 상태 필드 추가 | `ServiceAssignmentVo.depositAmount`, `depositStatus` |
| 정책 | PAID 계약금 취소+환불 경로 | 잘못된 계약금 납부 시 배정 취소 외 대안 없음 — 정책 결정 필요 |
| 구현 | 계약금 납부 후 배정 카드에서 계약금 정보 표시 | D, X 수치를 카드에 노출 |
