# F21-03. 제공자 정산 PRD

<!-- source-first; updated: 2026-06-24; source: community_api curated/ + community_app lib/…/curated/ -->

## 1. 결론

제공자 정산은 회차 종료 후 호스트가 배정에 대해 정산 잠금(SETTLEMENT_LOCKED)을 트리거하고, 검증형 포트를 통해 제공자 earning을 승인(APPROVED)하면, 주간 배치(`CuratedSettlementBatchService`)가 실지급하는 두 단계 구조다.

핵심 안전장치는 **완납 게이트(집합 동일성)**: 과금된 payer 집합(beneficiary 신원) == 실제 출석자 집합 − provider. 스칼라 카운트 비교가 아니라 집합 동일성 비교라서 과수금(커버리지 오기재)과 미수금(미납 참가자 방치) 모두 차단한다. NOSHOW_FORFEIT는 출석 면제하고 expected에 추가해 "커버됨"으로 인정한다.

보장수수료 모드(`serviceFeeGross>0`, non-engagement)에서는 추가로 Σ(money charge) == X 금액 검증을 통과해야 한다.

`/settlement-readiness`는 호스트가 `/settle` 트리거 전에 게이트 통과 여부와 미커버/과커버 신원을 미리 확인할 수 있는 읽기 전용 사전점검 엔드포인트다. `lockAndSettle`과 동일한 집합 계산 로직을 사용하므로 readiness=true이면 실제 settle도 통과할 것을 미리 알 수 있다(단 다른 게이트 — earning 링크 완결·회차 종료·CONFIRMED 상태 — 는 별도).

검증형 정산 포트(`CuratedProviderSettlementPort.approveAssignmentEarnings`)는 earning이 전부 SERVICE_ASSIGNMENT·PENDING·동일 provider이고 `validSourceIds`(chargeId ∪ prepaymentId)에 속함을 확인한 후에만 APPROVED로 승인한다. 직접 `processCreatorSettlement` 호출은 금지(신뢰형 = 안전하지 않음).

실지급은 매주 월요일 03:00 스케줄러/JVM 기본 시간대(`0 0 3 * * MON`, zone 미지정 — UTC/KST 단정 금지) 주간 배치에서 APPROVED·SERVICE_ASSIGNMENT earning을 provider 단위로 모아 처리한다. Redisson 분산락 + 개별 provider REQUIRES_NEW로 부분 성공 허용.

per-slice Codex 합의 PASS.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `curated/controller/ServiceAssignmentController.java` | `settle`, `settlementReadiness` 메서드 |
| Backend Service | `curated/service/ServiceAssignmentSettlementService.java` | `lockAndSettle`, `getSettlementReadiness`, `forfeitOnAssignmentCancel`, `applyDepositIfPresent` |
| Backend Batch | `curated/service/CuratedSettlementBatchService.java` | `processWeeklySettlements`, cron `0 0 3 * * MON`, Redisson lock `curated:settlement:weekly:lock` |
| Backend Port | `curated/port/CuratedProviderSettlementPort.java` | `approveAssignmentEarnings(providerUserId, earningIds, validSourceIds)`, `findProvidersWithApprovedServiceEarnings`, `payApprovedServiceEarnings(providerUserId)` |
| Backend Port | `curated/port/CuratedEventAccessPort.java` | `assertHostOrCoHost`, `assertEventEnded`, `getActualAttendeeIds`, `isEventEnded` |
| Backend Port | `curated/port/CuratedProviderEarningPort.java` | `applyPrepaymentEarning` (F21-06 계약금 leg) |
| Backend Entity | `curated/model/ServiceAssignment.java` | `serviceFeeGross`, `engagementId`, `requiresDeposit`, `@Version` 낙관락 |
| Backend Entity | `curated/model/ServiceAssignmentCharge.java` | `coverageType`, `creatorEarningId`, `transactionId` — earning 링크 완결 검증 기준 |
| Backend Enum | `curated/constants/AssignmentStatus.java` | CONFIRMED→SETTLEMENT_LOCKED 전이, isTerminal() |
| Backend Enum | `curated/constants/CoverageType.java` | FREE_EXCLUDED(money 없음), NOSHOW_FORFEIT(출석 면제+커버됨) |
| Backend VO | `curated/vo/ServiceAssignmentSettlementReadinessVo.java` | `ready/notReadyReason/missingBeneficiaryIds/unexpectedBeneficiaryIds` record |
| Frontend API | `data/api/service_assignment_api.dart` | `settle`, `settlementReadiness` Retrofit 계약 |
| Frontend Model | `data/models/curated/service_assignment_settlement_readiness_vo.dart` | `ServiceAssignmentSettlementReadinessVo` Freezed |
| Frontend Screen | `presentation/curated/screens/event_assignments_screen.dart` | 호스트 정산 CTA |
| Frontend Screen | `presentation/curated/screens/regular_meeting_bulk_settle_screen.dart` | 정기모임 묶음 정산 화면 |
| Frontend Provider | `domain/providers/curated/service_assignment_provider.dart` | `SettlementReadinessNotifier`, settle action |
| Verification | `ServiceAssignmentSettlementServiceTest` 계열 | 집합 동일성 게이트, 보장모드 금액 검증 |

## 3. 전체 동작 흐름

### 시나리오 A: 정상 정산 흐름 (보장수수료 모드)

1. 회차 종료(이벤트 CLOSED) 후 호스트가 `EventAssignmentsScreen`에서 "정산 준비 확인" CTA를 탭한다.
2. `GET /api/v1/events/{eventId}/assignments/{assignmentId}/settlement-readiness` 호출.
3. 서버 `getSettlementReadiness(hostUserId, eventId, assignmentId)`:
   - `assertHostOrCoHost` 권한 검증
   - `getActualAttendeeIds(eventId)` 실제 출석자 집합 조회 (no-show 제외)
   - expected = 출석자 − provider + NOSHOW_FORFEIT beneficiary
   - covered = 모든 coverage 행의 beneficiaryUserId 집합
   - `missing = expected − covered`, `unexpected = covered − expected`
   - 보장모드이면 Σ(money) vs serviceFeeGross 비교
   - `ServiceAssignmentSettlementReadinessVo(ready, notReadyReason, missing, unexpected)` 반환
4. `ready=true`면 Flutter가 "정산 시작" 버튼을 활성화한다. `ready=false`면 `missingBeneficiaryIds`(추가 과금 필요)·`unexpectedBeneficiaryIds`(커버 오기재) 신원을 표시한다.
5. 호스트가 "정산 시작" → `POST /api/v1/events/{eventId}/assignments/{assignmentId}/settle`.
6. 서버 `lockAndSettle(hostUserId, eventId, assignmentId)`:
   - `assertHostOrCoHost` 재검증
   - `assertEventEnded(eventId)` — 회차 미종료 시 차단
   - `status == CONFIRMED` 검증 — CONFIRMED 아니면 `ASSIGNMENT_NOT_CONFIRMED`
   - 완납 게이트(집합 동일성): `coveredBeneficiaries.equals(expectedBeneficiaries)` — 불일치 시 `ASSIGNMENT_NOT_FULLY_COLLECTED`
   - money 행(FREE_EXCLUDED 제외) earning 링크 완결: `creatorEarningId!=null && transactionId!=null` — 미완 시 `ASSIGNMENT_SETTLEMENT_INVALID_EARNING`
   - 보장모드: `Σmoney == serviceFeeGross` — 불일치 시 `ASSIGNMENT_FEE_MISMATCH`
   - `transitionTo(SETTLEMENT_LOCKED)` + save
   - `CuratedProviderSettlementPort.approveAssignmentEarnings(providerUserId, earningIds, validSourceIds)` — 검증 후 PENDING→APPROVED
   - 계약금 있으면 `applyDepositIfPresent` → 계약금 earning leg 생성 + earningIds에 추가
7. 서버 `Void` 200 반환. Flutter 배정 목록 갱신(status=SETTLEMENT_LOCKED).
8. 이후 `CuratedSettlementBatchService.processWeeklySettlements()` (매주 월요일 03:00):
   - `findProvidersWithApprovedServiceEarnings()` → 지급 대상 provider 목록
   - 각 provider: `payApprovedServiceEarnings(providerUserId)` (REQUIRES_NEW) → 지갑 credit + payout 분개 + PAID 마킹
   - 1건 실패해도 다른 provider 지급은 계속(부분 성공 허용)

### 시나리오 B: readiness 불통과 — 미커버 참가자 있음

1. 호스트가 `/settlement-readiness`를 조회한다.
2. 서버가 `ready=false, notReadyReason="ASSIGNMENT_NOT_FULLY_COLLECTED", missingBeneficiaryIds=[userId_A, userId_B]`를 반환한다.
3. Flutter가 "A님, B님의 서비스비가 미납됐습니다" 안내와 "과금", "무료처리", "대납" CTA를 표시한다.
4. 호스트가 각 참가자를 처리(과금/무료/대납/노쇼forfeit)한 후 다시 readiness를 확인하고 settle을 트리거한다.

### 시나리오 C: 보장모드 금액 불일치

1. `serviceFeeGross=100,000원`이고 Σ수금=90,000원인 상태에서 호스트가 `/settle`을 호출한다.
2. 서버가 집합 게이트는 통과하지만 `collected(90000) != serviceFeeGross(100000)` → `ASSIGNMENT_FEE_MISMATCH`.
3. Flutter가 에러를 표시. 호스트가 잔액 10,000원을 과금(topup) 후 재시도한다.

### 시나리오 D: 정기모임 묶음 정산 (F21-07)

1. 호스트가 `RegularMeetingBulkSettleScreen`에서 묶음 정산을 트리거한다.
2. `POST /api/v1/regular-meetings/{meetingId}/settlements` + `ServiceAssignmentBulkSettleParam(providerUserId)`.
3. 서버가 각 회차에 대해 독립 tx로 `lockAndSettle` 호출. 회차별 `BulkSettleStatus` 반환:
   - `SETTLED`: 정산 완료
   - `ALREADY_SETTLED`: 이미 SETTLEMENT_LOCKED (멱등 재호출)
   - `NO_ASSIGNMENT`: 해당 회차에 배정 없음
   - `SKIPPED_NOT_READY`: 회차 미종료 또는 CONFIRMED 아님
   - `BLOCKED`: 완납 게이트 미충족 — 호스트 조치 필요
   - `FAILED`: 경합/인프라 오류 — 재시도 대상

## 4. 서버 계약

### `GET /api/v1/events/{eventId}/assignments/{assignmentId}/settlement-readiness`

| 항목 | 계약 |
|---|---|
| 인증 | 필수 |
| 권한 | `assertHostOrCoHost(eventId, userId)` |
| 응답 | `ServiceAssignmentSettlementReadinessVo` 200 |
| 돈/상태 | 변경 없음(읽기 전용) |
| `ready=false` 사유 | `ASSIGNMENT_BENEFICIARY_ATTENDED` · `ASSIGNMENT_NOT_FULLY_COLLECTED` · `ASSIGNMENT_FEE_MISMATCH` (우선순위 순) |
| `missingBeneficiaryIds` | expected − covered, 정렬됨 |
| `unexpectedBeneficiaryIds` | covered − expected, 정렬됨 |

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/settle`

| 항목 | 계약 |
|---|---|
| 인증 | 필수 |
| 권한 | `assertHostOrCoHost(eventId, userId)` |
| 게이트 1 | `assertEventEnded(eventId)` — 회차 미종료 차단 |
| 게이트 2 | `status == CONFIRMED` — 아니면 `ASSIGNMENT_NOT_CONFIRMED` |
| 게이트 3 | 완납 게이트: `coveredBeneficiaries.equals(expectedBeneficiaries)` |
| 게이트 4 | earning 링크 완결: 모든 money 행의 `creatorEarningId != null && transactionId != null` |
| 게이트 5 | 보장모드(non-engagement, serviceFeeGross>0): `Σmoney == serviceFeeGross` |
| 부수 효과 | `transitionTo(SETTLEMENT_LOCKED)` + `approveAssignmentEarnings(...)` (검증형 포트) |
| 응답 | `Void` 200 |
| 실패 | `ASSIGNMENT_NOT_CONFIRMED`, `ASSIGNMENT_NOT_FULLY_COLLECTED`, `ASSIGNMENT_BENEFICIARY_ATTENDED`, `ASSIGNMENT_SETTLEMENT_INVALID_EARNING`, `ASSIGNMENT_FEE_MISMATCH`, `ASSIGNMENT_PREPAYMENT_REQUIRED` |

### `ServiceAssignmentSettlementReadinessVo` 필드

| 필드 | Java 타입 | Dart 타입 | 비고 |
|---|---|---|---|
| `ready` | `boolean` | `bool` | true=집합 동일+보장모드 정합 |
| `notReadyReason` | `String?` | `String?` | `ErrorCode` name. ready=true면 null |
| `missingBeneficiaryIds` | `List<Long>` | `List<int>` | 추가 과금/무료 필요 출석자 |
| `unexpectedBeneficiaryIds` | `List<Long>` | `List<int>` | 환불/노쇼처리 필요 과커버 |

### `CuratedProviderSettlementPort.approveAssignmentEarnings` 검증 계약

| 검증 항목 | 규칙 |
|---|---|
| earning source 타입 | 전부 `SERVICE_ASSIGNMENT` |
| earning 상태 | 전부 `PENDING` |
| earning provider | 전부 동일 `providerUserId` |
| sourceId 링크 | 각 earning의 sourceId ∈ `validSourceIds`(chargeId ∪ prepaymentId) |
| 위반 시 | 부분 지급·오지급 방지로 전체 거부 |

### `CuratedSettlementBatchService` 계약

| 항목 | 값 |
|---|---|
| 기본 cron | `0 0 3 * * MON` (매주 월요일 03:00 스케줄러/JVM 기본 시간대 — zone 미지정, UTC/KST 단정 금지, 설정 override 가능) |
| 분산락 | Redisson key `curated:settlement:weekly:lock`, tryLock 5초, watchdog 자동 갱신 |
| 지급 격리 | `payApprovedServiceEarnings(providerUserId)` REQUIRES_NEW — 1건 실패가 전체 배치 롤백 안 함 |
| 대상 | APPROVED + SERVICE_ASSIGNMENT earning을 가진 provider(distinct) |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| readiness 화면 | `EventAssignmentsScreen` 내 "정산 준비 확인" + 미커버/과커버 표시 |
| 묶음 정산 화면 | `RegularMeetingBulkSettleScreen` |
| Readiness Provider | `SettlementReadinessNotifier(eventId, assignmentId)` — `@riverpod` |
| Settle Action | `EventAssignmentsNotifier.settle(assignmentId)` |
| Retrofit | `ServiceAssignmentApi.settlementReadiness`, `settle` |
| 성공 후 | 배정 목록 갱신 (status = SETTLEMENT_LOCKED) |
| 에러 | `ASSIGNMENT_NOT_FULLY_COLLECTED` → 미커버 목록 + 조치 CTA 표시 |

readiness 화면 분기:

| `ready` | `missingBeneficiaryIds` | `unexpectedBeneficiaryIds` | 표시 |
|---|---|---|---|
| true | 빈 배열 | 빈 배열 | "정산 가능" + "정산 시작" 버튼 활성 |
| false | 비어있지 않음 | (무관) | "X명 미납" + 과금/무료/대납 CTA |
| false | 빈 배열 | 비어있지 않음 | "과커버" + 환불/노쇼처리 CTA |
| false | (보장모드 금액 불일치) | — | `ASSIGNMENT_FEE_MISMATCH` 안내 |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + CONFIRMED + 회차 종료 + 완납 | 게이트 5개 통과 | `settle` 성공 | SETTLEMENT_LOCKED + 배치 지급 대기 | 일치 |
| 호스트 + CONFIRMED + 회차 미종료 | `assertEventEnded` 실패 | API 에러 | 회차 종료 후 가능 안내 | 일치 |
| 호스트 + ACCEPTED(미확정) + settle 시도 | `status != CONFIRMED` → `ASSIGNMENT_NOT_CONFIRMED` | API 에러 | 확정(confirm) 먼저 안내 | 일치 |
| 호스트 + 미수금 있음 | 집합 불일치 → `ASSIGNMENT_NOT_FULLY_COLLECTED` | `missingBeneficiaryIds` 표시 | 미납자 과금/무료처리 유도 | 일치 |
| 호스트 + 보장모드 금액 미달 | `Σmoney != serviceFeeGross` → `ASSIGNMENT_FEE_MISMATCH` | API 에러 | 잔액 추가 과금 유도 | 일치 |
| 호스트 + earning 링크 미완 | `creatorEarningId == null` → `ASSIGNMENT_SETTLEMENT_INVALID_EARNING` | API 에러 | 운영 에러(정상 과금 흐름이면 발생 안 함) | 일치 |
| 호스트 + SETTLEMENT_LOCKED + settle 재호출 | `status != CONFIRMED` → `ASSIGNMENT_NOT_CONFIRMED`(직접 `/settle` 재호출); 묶음 정산은 이미 LOCKED를 `ALREADY_SETTLED`로 매핑 | API 에러 | 이미 정산됨 표시 | 일치 |
| 배치 + provider earning APPROVED | `payApprovedServiceEarnings` REQUIRES_NEW | — | 지갑 credit + PAID 마킹 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `settle` 응답 타입 | `Void` (ResponseEntity) | `Future<void>` Retrofit | 일치 |
| `settlementReadiness` 응답 | `ServiceAssignmentSettlementReadinessVo` record | `ServiceAssignmentSettlementReadinessVo` Freezed | 일치 |
| `missingBeneficiaryIds` 타입 | `List<Long>` | `List<int>` | 일치 |
| `ready` Jackson key | `boolean ready` | `bool ready` (is-prefix 없음) | 일치 |
| `notReadyReason` nullable | `String?` (null if ready) | `String?` Freezed | 일치 |
| 배치 주기 | 매주 월요일 03:00 (설정 가능) | 클라이언트 미관여 | 서버 단독, 정합 |
| NOSHOW_FORFEIT expected 포함 | `c.getCoverageType()==NOSHOW_FORFEIT → expectedBeneficiaries.add` | readiness VO의 missing/unexpected 소비 | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| Risk | readiness=true → settle 사이 출석자 변경 | readiness 조회와 settle 호출 사이에 출석자 추가/취소 가능 | readiness는 통과했으나 settle에서 집합 불일치로 실패 | 사용자 경험상 혼란. settle 직전 UI에서 "이 화면에서 정산하는 동안 출석 변경 금지" 안내 |
| Risk | 주간 배치 지급 전 earning 상태 표시 | SETTLEMENT_LOCKED 이후 앱에서 "정산 완료"처럼 표시되지만 실제 지급은 다음 월요일 배치까지 지연 | 제공자가 지갑 입금 전 "지급 완료"로 오해 가능 | 앱에서 "정산 잠금됨, 지급 예정" vs "지급 완료" 상태 분리 표시 |
| Gap | 배치 실패 provider 재처리 경로 | `processWeeklySettlements`에서 `fail++` 로깅만 하고 재처리 알림/재시도 경로 없음 | 지급 실패 provider가 다음 주 배치까지 지급 누락 | 배치 실패 provider 운영 알림 또는 수동 재처리 엔드포인트 필요 여부 운영 판단 |
| Gap | 계약금(engagement) 정산 X 검증 | `applyDepositIfPresent`가 `Σ참가자charge + D == agreedFee` 검증 — 계약금 모드에서 `serviceFeeGross`가 아닌 `agreed_provider_fee` 기준 | 두 금액이 다른 경우 프론트 UI 혼동 가능 | `ServiceAssignmentVo.engagementId!=null` 분기에서 UI를 `agreedProviderFee` 기준으로 표시 필요 |

## 9. 수용 기준

### AC-01. readiness 통과 확인

Given 배정 CONFIRMED, 회차 종료, 실출석자 3명(provider 제외), 3명 모두 coverage 있음, 보장모드 Σ==X.
When `GET .../settlement-readiness`를 호출한다.
Then `ready=true, missingBeneficiaryIds=[], unexpectedBeneficiaryIds=[]`를 반환한다.

### AC-02. readiness 미커버 신원 표시

Given 실출석자 3명 중 1명(userId=42)이 coverage가 없다.
When `GET .../settlement-readiness`를 호출한다.
Then `ready=false, notReadyReason="ASSIGNMENT_NOT_FULLY_COLLECTED", missingBeneficiaryIds=[42]`를 반환한다.

### AC-03. settle 완납 게이트 통과

Given 모든 게이트(회차 종료, CONFIRMED, 집합 동일, earning 링크 완결, 보장모드 금액 일치) 통과.
When `POST .../settle`을 호출한다.
Then `200 OK`, 배정 status=SETTLEMENT_LOCKED, earning들이 PENDING→APPROVED로 전이된다.

### AC-04. settle 회차 미종료 차단

Given 이벤트가 아직 CLOSED가 아니다.
When `POST .../settle`을 호출한다.
Then 서버가 회차 종료 조건 미충족 에러를 반환한다. status는 변경되지 않는다.

### AC-05. settle CONFIRMED 아닌 상태 차단

Given 배정 status=ACCEPTED(확정 전).
When 호스트가 `POST .../settle`을 호출한다.
Then `ASSIGNMENT_NOT_CONFIRMED` 에러를 반환한다.

### AC-06. settle 미수금 차단

Given 실출석자 3명 중 1명이 coverage가 없다.
When `POST .../settle`을 호출한다.
Then `ASSIGNMENT_NOT_FULLY_COLLECTED` 에러를 반환한다. SETTLEMENT_LOCKED 전이가 일어나지 않는다.

### AC-07. 보장모드 금액 불일치 차단

Given `serviceFeeGross=100000`, Σmoney=95000.
When `POST .../settle`을 호출한다.
Then `ASSIGNMENT_FEE_MISMATCH` 에러를 반환한다.

### AC-08. NOSHOW_FORFEIT 커버됨 인정

Given 노쇼 참가자 userId=99가 NOSHOW_FORFEIT coverage를 가지고, 실출석자 집합에는 없다.
When `getSettlementReadiness` 또는 `lockAndSettle`에서 expected 집합을 계산한다.
Then userId=99가 expected에 추가되어 missing 목록에 나타나지 않는다.

### AC-09. 검증형 포트 오지급 차단

Given earning 목록에 다른 배정의 earning이 섞여 있다(validSourceIds 불일치).
When `approveAssignmentEarnings`가 호출된다.
Then 포트가 sourceId 불일치를 탐지해 전체 승인을 거부한다.

### AC-10. 주간 배치 부분 성공

Given 10명의 provider 중 1명이 지급 실패한다.
When `processWeeklySettlements` 배치가 실행된다.
Then 실패한 1명은 로깅되고, 나머지 9명은 정상 지급된다(REQUIRES_NEW 격리).

### AC-11. 중복 settle(SETTLEMENT_LOCKED) 차단

Given 배정 status=SETTLEMENT_LOCKED(terminal).
When 호스트가 `POST .../settle`을 재호출한다.
Then 서버가 `ASSIGNMENT_NOT_CONFIRMED` 에러를 반환한다(`status != CONFIRMED` 검사 선행).

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 운영 | 배치 실패 재처리 | fail provider 자동 알림/수동 재처리 엔드포인트 필요 여부 운영 결정 |
| UX | SETTLEMENT_LOCKED 상태 표시 | "정산 잠금됨, 월요일 배치 지급 예정" vs "정산 완료" 두 상태를 Flutter에서 명시 분리 |
| 외부 차단 | F7 용역 세무 | 지급명세서 산출·사업자/개인 세율 구분 = PG·세무 계약 대기. 원천징수 3.3%·자료적재는 구현 완료 |
| 테스트 | readiness-settle 사이 출석자 변경 | 두 호출 사이 출석자 추가/취소 시나리오 통합 테스트 |
| 테스트 | 배치 분산락 동시 실행 방지 | 두 인스턴스가 동시에 배치 실행 시 Redisson lock 동작 검증 |
| 테스트 | NOSHOW_FORFEIT + 실출석자 충돌 | forfeit beneficiary가 실제 출석자 집합에 포함된 경우 `ASSIGNMENT_BENEFICIARY_ATTENDED` 에러 단위 테스트 |
