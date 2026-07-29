# F21-06. 계약금 선납(engagement) PRD

<!-- source-first; updated: 2026-07-29; source: community_api curated/ + provider/ + payment/ + community_app curated/ -->

## 1. 결론

계약금 선납(engagement)의 서버 계약은 직접 배정과 카탈로그 terms 배정 모두 존재하지만, Flutter의
end-to-end 경로는 직접 배정에만 닫혀 있다. 호스트가 제공자와 합의한 총 보수 X를
`service_engagement`에 기록하고, 그 일부 D(계약금)를 지갑으로 선납한다. 정산 시
Σ(참가자 charge) + D == X 검증을 통해 이중 재원화를 구조적으로 차단한다. 배정 취소 시 D는
제공자에게 forfeit(비환불)되고, service-fee(보장수수료 모드, `serviceFeeGross > 0`)와 engagement는
상호 배타적이다(`ASSIGNMENT_FEE_AUTHORITY_CONFLICT`). 다만 카탈로그 D>0 terms 수락은 결제 전에
`engagementId`를 만들고, Flutter는 `hasEngagement=true`이면 "계약금" 버튼을 숨긴다. 따라서 현재 앱에서는
수락된 카탈로그 계약금을 실제로 납부할 CTA가 없다.

### 2026-07-29 현재 소스 델타

- 카탈로그 계약에서는 terms의 `agreedGross=X`, `depositGross=D`가 engagement 권위다. D>0 조건을
  수락하면 engagement와 `requiresDeposit=true`가 생성되고 `serviceFeeGross=0`을 유지한다.
  D=0 조건은 반대로 `serviceFeeGross=X`, engagement 없음이다.
- 카탈로그 계약금 생성은 최신 terms 수락과 X/D 일치를 요구한다. 구 prepayment API로 다른 X/D를
  주입할 수 없다. 자기 카탈로그 배정은 D>0 제안 자체가 금지된다.
- 카탈로그 D>0 terms 수락 직후 engagement가 이미 존재한다. 서버 `payByWallet`은 이 engagement를
  재사용할 수 있지만 Flutter의 `canPrepay = !hasServiceFee && !hasEngagement`가 버튼을 숨겨 결제 호출에
  도달하지 못한다. 직접 배정의 engagement 생성 전 경로만 현재 앱에서 실행 가능하다.
- 신규 5% 계약에서 계약금도 별도 money leg로 플랫폼 수수료 5.00%와 원천징수 3.3%를 스냅샷한다.
  이후 참가자 charge마다 같은 정책을 개별 적용한다. 수수료는 각 leg마다 `HALF_UP` 원 단위 반올림하므로
  X 전체에 한 번 계산한 값과 항상 같다고 가정하면 안 된다.
- 제공자 견적은 미래 `expiresAt`이 필수다. 견적 제출 시 fee policy를 캡처하고, 호스트가 수락할 때
  만료와 terms 버전을 검증한다. 호스트 고정가 제안은 제공자 수락 순간 현재 fee policy/version을 검증한다.
- 계약금 취소 API/Repository는 존재하지만 Flutter 화면에서 호출하는 CTA는 없다. 또한 WALLET 결제는
  같은 트랜잭션에서 즉시 PAID가 되어 `cancelPending`의 PENDING 조건을 일반 사용자 흐름에서 충족하지 않는다.

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
| Frontend Screen | `event_assignments_screen.dart` | `canPrepay = !hasServiceFee && !hasEngagement`, `_createPrepayment` 바텀시트 |
| Verification | 서버 유닛 테스트 + 앱 소스 실측 | X 검증·forfeit·authority XOR, 카탈로그 결제 CTA 단절 |

## 3. 전체 동작 흐름

### 3-A. 직접 배정 계약금 선납(payByWallet)

1. 호스트가 배정 카드의 "계약금" 버튼을 누른다. 버튼은 `canPrepay = !hasServiceFee && !hasEngagement`가 true일 때만 노출된다(서비스비 보장모드 또는 이미 engagement면 숨김).
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

### 3-A-1. 카탈로그 D>0 terms 배정 — 서버 경로와 현재 앱 단절

1. 카탈로그 terms의 최종 수락 시 서버가 X로 engagement를 만들고 `requiresDeposit=true`를 설정한다.
2. 서버 `payByWallet`은 최신 수락 terms의 X/D와 요청 X/D가 같은지 검증한 뒤 기존 engagement를 재사용한다.
3. 그러나 Flutter는 `engagementId != null`을 `hasEngagement=true`로 해석하고 `canPrepay=false`로
   "계약금" 버튼을 숨긴다.
4. 따라서 현재 앱 UI에서는 카탈로그 D>0 계약을 수락한 뒤 지갑 결제 API를 호출할 수 없다.

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
| 계약금 버튼 노출 조건 | `canPrepay = !hasServiceFee && !hasEngagement` (보장모드/engagement 둘 다 숨김) |
| 클라 사전 검증 | `fee > 0 && deposit > 0 && deposit < fee` — 서버 게이트와 정확히 일치 |
| Repository 메서드 | `ServiceAssignmentRepository.createPrepayment(eventId, assignmentId, ServiceAssignmentPrepaymentCreateParam)` |
| 응답 VO | `ServiceAssignmentPrepaymentVo` — Freezed, 필드: `id`, `engagementId`, `amount`, `method`, `status`, `paidAt` |
| 취소 | API/Repository의 `cancelPrepayment(...)`만 존재. Screen 호출/CTA 없음 |
| 계약금 후 버튼 숨김 | `item.engagementId != null`이면 `hasEngagement=true` → `canPrepay=false`로 버튼 숨김(2026-06-24 해소) |
| 카탈로그 D>0 | terms 수락 단계에서 이미 `engagementId`가 생겨 같은 숨김 조건이 결제 전부터 적용됨 — 결제 CTA 없음 |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + ACCEPTED + direct 수금액 모드 | `payByWallet` 통과 | `canPrepay=true` | 계약금 선납 가능 | 일치 |
| 호스트 + 카탈로그 D>0 terms 수락 | 기존 engagement와 X/D 검증 후 `payByWallet` 가능 | `hasEngagement=true` → `canPrepay=false` | 앱에서 결제 API 호출 불가 | **불일치** |
| 호스트 + 보장수수료 모드(X>0) | `ASSIGNMENT_FEE_AUTHORITY_CONFLICT` | `canPrepay=false`, 버튼 숨김 | 버튼 미노출 | 일치(이중 가드) |
| 호스트 = 제공자(자전거래) | `ASSIGNMENT_SELF_CHARGE` | 서버 에러 토스트 | 거부 | 일치(서버 백스톱) |
| D >= X 또는 D <= 0 | `ASSIGNMENT_PREPAYMENT_INVALID_AMOUNT` | 클라 사전 검증 거부 | 바텀시트 에러 토스트 | 일치(이중 가드) |
| 동일 engagement 활성 계약금 존재 | `ASSIGNMENT_PREPAYMENT_ALREADY_EXISTS` | 서버 에러 토스트 | 거부 | 일치 |
| 정산 시 Σcharge + D ≠ X | `ASSIGNMENT_FEE_MISMATCH` | 서버 에러 토스트 | 정산 거부 | 일치 |
| PAID 계약금 취소 시도 | `ASSIGNMENT_PREPAYMENT_NOT_CANCELABLE` | 취소 CTA 없음 | 앱에서 시도 불가 | 서버 계약만 존재 |
| 배정 취소 시 PAID 계약금 | `forfeitOnAssignmentCancel` 자동 실행 | 배정 취소 결과 화면 | D 제공자 forfeit(비환불) | 일치 |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| direct authority XOR 게이팅 | `serviceFeeGross > 0` → `ASSIGNMENT_FEE_AUTHORITY_CONFLICT` | `canPrepay = !hasServiceFee && !hasEngagement` | 일치 |
| 카탈로그 engagement의 결제 전 상태 | D>0 terms 수락 시 engagement 생성, 이후 `payByWallet`이 재사용 | engagement가 있으면 결제 버튼 숨김 | **불일치 — 카탈로그 결제 단절** |
| X 불변 정책 | `agreedProviderFee` 재입력 시 기존과 일치 검증 | 클라는 매번 X 입력 — 두 번째 계약금 시도 시 다른 X 입력 가능(서버가 거부) | 서버 단독 보호 |
| direct 계약금 납부 후 버튼 재노출 | direct 결제 성공으로 engagement가 생기고 새 계약금은 중복 거부 | engagement 시 `hasEngagement=true`로 버튼 숨김 | 직접 배정의 납부 완료 상태에서는 일치 |
| 정산 연결(`engagementId↔serviceFeeGross`) | `applyDepositIfPresent`에서 engagement null/not-null 분기 | `ServiceAssignmentVo.engagementId` 필드로 판단 | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| ✅ 해소(직접) | 직접 계약금 납부 완료 뒤 "계약금" 버튼 재노출 | 과거 `canPrepay = !hasServiceFee`는 이미 납부해 engagement가 생긴 direct 배정에도 버튼을 다시 노출 | 서버 중복 거부 전 UX 혼란 | `canPrepay = !hasServiceFee && !hasEngagement`로 직접 납부 완료 재노출은 해소. 단 같은 조건이 카탈로그 결제 전 engagement도 숨기는 P0를 만듦 |
| P2 | 계약금 조회 GET 엔드포인트 없음 | 서버에 `GET .../prepayment` 없음. 앱에서 현재 계약금 상태·금액을 직접 표시 불가 | 호스트가 계약금 납부 여부·금액을 배정 목록에서 확인 불가 | `ServiceAssignmentVo`에 `depositAmount`, `depositStatus` 추가 또는 별도 GET 엔드포인트 |
| P2 | PAID 계약금 취소 경로 없음 | `cancelPending`은 PENDING만 허용. WALLET은 즉시 PAID라 취소 불가 | 호스트가 계약금 잘못 납부 시 배정 취소(forfeit)만 가능 | 운영 정책 결정: PAID 계약금 취소+환불 경로 추가 여부 |
| P0 | 카탈로그 D>0 terms 수락 후 계약금 결제 CTA 없음 | 수락이 engagement를 생성하지만 Flutter `canPrepay`는 engagement 존재 시 false | 카탈로그 계약금 필수 배정이 미납 상태로 남고 정산 게이트를 통과할 수 없음 | `requiresDeposit && prepayment 미납`을 표현하는 서버 VO 추가 후 결제 CTA 노출 |
| P2 | PENDING 계약금 취소 UI 없음 | API/Repository만 있고 `event_assignments_screen.dart` 호출부 없음 | 취소 가능한 중간 상태가 생겨도 앱에서 조작 불가 | 조회 VO/CTA와 함께 취소 액션 배선 |
| P3 | 자전거래(호스트=제공자) 프론트 사전 차단 없음 | 서버 `ASSIGNMENT_SELF_CHARGE`로 거부하지만 앱은 별도 체크 없음 | 에러 후 재시도 UX | 배정 생성 시점에 호스트=제공자 판단하여 계약금 버튼 비활성 |

## 9. 수용 기준

### AC-01. 계약금 선납 정상 흐름

Given 호스트가 ACCEPTED 직접 배정(terms 비관리, engagement 없음, serviceFeeGross=0)에서 계약금 버튼을 누른다.
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

### AC-08. 카탈로그 D>0 현재 앱 단절 확인

Given 카탈로그 배정에서 D>0 terms가 최종 수락되어 `engagementId`와 `requiresDeposit=true`가 설정됐다.
When Flutter가 배정 카드 액션을 렌더링한다.
Then `hasEngagement=true`, `canPrepay=false`여서 "계약금" 버튼이 보이지 않는다. 서버 결제 계약은
존재하지만 현재 앱 UI에서는 호출할 수 없음을 Gap으로 유지한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 배정 VO에 계약금 상태 필드 추가 | `ServiceAssignmentVo.depositAmount`, `depositStatus` |
| 정책 | PAID 계약금 취소+환불 경로 | 잘못된 계약금 납부 시 배정 취소 외 대안 없음 — 정책 결정 필요 |
| 구현 | 계약금 납부 후 배정 카드에서 계약금 정보 표시 | D, X 수치를 카드에 노출 |
