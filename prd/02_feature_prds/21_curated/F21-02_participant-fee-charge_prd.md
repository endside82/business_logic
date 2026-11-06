# F21-02. 참가자 서비스비 분담 결제 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first; updated: 2026-07-29; source: community_api curated/ + provider/ + community_app curated/ -->

## 1. 결론

참가자 서비스비 분담 결제는 direct 배정에서는 호스트가 총 서비스비(X)를 설정하고, 카탈로그 배정에서는 상대방이 수락한 최신 terms의 X 또는 X-D를 권위로 삼아 확정 참가자들이 자신의 몫을 지갑으로 납부하는 기능이다.

세 가지 과금 경로가 있다. (1) `/charge`: 참가자가 분담액을 직접 입력해 납부하는 예약금/첫 과금. (2) `/charge/topup`: 첫 과금 후 잔액을 추가 납부. (3) `/charge/my-share`: 회차 종료 후 서버가 (실출석−provider) 인원수로 균등 분할한 금액을 자동 납부(클라이언트 금액 입력 금지). 모든 과금은 `Idempotency-Key` 헤더가 필수이며 `ApiIdempotencyExecutor`로 이중 차감을 차단한다.

돈은 PAID_ONLY(유료 포인트 전용 — 무료 포인트·보조금 차단). 각 과금마다 제공자 CreatorEarning이 즉시 적립되어 정산 시 payable↔earning drift가 0이다. 자전거래(payer==provider) 서버에서 차단.

참가자는 `GET /api/v1/events/{eventId}/assignments/my-charge-status`로 자신의 coverage 현황과 서버 산정 `suggestedShare`를 읽는다(읽기 전용 — 다른 참가자 coverage 미노출 IDOR-safe).

서버 핵심 과금 게이트는 테스트가 있지만, 현재 Flutter 모델·화면의 계약 축약은 아래 Gap에 별도로 남는다.

### 2026-07-29 현재 소스 델타

- 카탈로그 배정은 최신 계약조건이 수락된 상태(`acceptedTermsVersion == currentTermsVersion`)에서만
  charge/top-up/my-share/subsidize 등 돈 진입이 가능하다. direct/legacy 배정만 이 terms 검사를 건너뛴다.
- 참가자 상태 VO는 `serviceFeeGross`뿐 아니라 계약 총액 `agreedGross`와 참가자 수금 상한
  `participantCap`을 별도 제공한다. 계약금 D가 있으면 총액은 X, 참가자 상한은 X-D다.
- 카탈로그 계약의 각 실제 charge/deposit에는 수락 시 스냅샷된 플랫폼 수수료율을 적용한다.
  현재 `FEE_V2_5PCT`는 gross의 5.00%, 원천징수는 `(gross-platformFee)`의 3.3%이며 각각
  원 단위 HALF_UP이다. net = gross - fee - tax다. direct/legacy는 fee 0% 스냅샷이다.
- `/charge`와 `/topup` 서버는 ACCEPTED 선납과 CONFIRMED 사후수금을 허용하지만, 목록의
  `chargeable` 표시는 실제 참가자 CTA 오제안을 막기 위해 CONFIRMED에서만 true다.
- 조건 미합의 카탈로그 배정은 `service-fee` 구 API로 X를 덮어쓸 수 없다. 금액 변경은 새 terms 버전
  제안과 재수락으로만 한다.
- 서버 VO에는 `agreedGross`와 `participantCap`이 추가됐지만 현재 Flutter Freezed 모델은 두 필드를
  받지 않는다. 화면은 engagement에서 0인 `serviceFeeGross`를 `"약정 총 서비스비"`로 표시한다.
  또한 직접 route로 진입하면 `chargeable`, 기존 coverage, cap 잔여와 무관하게 결제/my-share 버튼을
  렌더링하므로 서버 거부가 최종 방어선이다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ServiceAssignmentController`, `ServiceAssignmentChargeService`, `CuratedChargeSplitCalculator`, `ServiceAssignmentCharge`, `CoverageType`, `ChargeOrigin`, `WalletLedgerFacade`, `CuratedProviderEarningPort`, `CuratedEventAccessPort`, `ParticipantAssignmentChargeStatusVo`. 앱: `participant_service_fee_charge_screen.dart`, `service_assignment_api.dart`, `participant_assignment_charge_status_vo.dart`, `service_assignment_charge_result_vo.dart`, `service_assignment_provider.dart`.

## 3. 전체 동작 흐름

### 시나리오 A: direct 배정에서 호스트가 서비스비 총액을 설정하고 참가자가 예약금을 납부

1. 호스트가 direct 배정 CONFIRMED 후 "서비스비 설정" CTA로 `POST /api/v1/events/{eventId}/assignments/{assignmentId}/service-fee` + `ServiceAssignmentServiceFeeParam(serviceFeeGross: X)` 호출. offering/terms 배정은 이 구 API를 거부한다.
2. 서버가 `serviceFeeGross=X`를 `ServiceAssignment`에 기록 — `X>0`이면 보장수수료 모드(완납게이트 Σ==X 강제), `X=0`이면 수금액 모드.
3. 이벤트 상세 화면에서 확정 참가자(ATTENDING+APPROVED 조건)는 `GET /api/v1/events/{eventId}/assignments/my-charge-status`를 조회한다.
4. 서버가 `ParticipantAssignmentChargeStatusVo` 목록을 반환한다. `chargeable=true` 조건은 status=CONFIRMED, 권위 cap(X 또는 X-D) 존재, money-backed coverage 없음, caller≠provider, aggregate cap 잔여다.
5. 이벤트 상세의 진입 CTA는 `chargeable`을 사용하지만, `ParticipantServiceFeeChargeScreen` 자체는 이 값을 소비하지 않고 직접 진입 시에도 결제 버튼을 그린다. 참가자가 분담액을 입력해 제출하면 서버가 최종 게이트를 강제한다.
6. `POST /api/v1/events/{eventId}/assignments/{assignmentId}/charge` + `Idempotency-Key` 헤더 + `ServiceAssignmentChargeParam(amount: A)`.
7. 서버 `ServiceAssignmentChargeService.chargeParticipant(assignmentId, payerUserId=caller, A)`:
   - status ∈ {ACCEPTED, CONFIRMED} 검증(ACCEPTED=선납 가능, CONFIRMED=사후수금)
   - `payer ≠ provider` 검증(자전거래 차단)
   - `existsByAssignmentIdAndBeneficiaryUserId` → 이미 첫 과금 있으면 `ASSIGNMENT_ALREADY_CHARGED`
   - `ServiceAssignmentCharge(order=1, SELF_PAID)` INSERT(예약-before-spend)
   - `WalletLedgerFacade.spendAndJournal(PAID_ONLY, amount, SERVICE_ASSIGNMENT_CHARGE)` → 지갑 차감
   - 차감 callback: `CuratedProviderEarningPort.recordServiceChargeEarning` → CreatorEarning 즉시 적립
   - `charge.transactionId`, `charge.creatorEarningId` 업데이트
8. 서버가 `ServiceAssignmentChargeResultVo(transactionId)` 반환. Flutter 화면 갱신.

### 시나리오 B: 회차 종료 후 my-share N분의1 자동 납부

1. 이벤트 종료(CLOSED) 후 참가자가 `my-charge-status` 조회.
2. 서버가 `isEventEnded=true` + 권위 participant cap(X 또는 X-D) 존재 + caller∈(실출석−provider)이면 `suggestedShare`(서버 산정 1/N)를 반환.
3. 참가자 화면에서 `suggestedShare` 금액만 표시(클라이언트 금액 입력 UI 미제공).
4. 참가자가 "분담액 납부" 버튼 → `POST .../charge/my-share` + `Idempotency-Key` 헤더(body 없음).
5. 서버 `chargeMyShareOnEvent`: `CuratedChargeSplitCalculator`가 participant cap을 (실출석−provider)로 균등분할한 **전체 1인 몫**을 계산해 첫 과금 코어를 호출한다. 기존 first charge가 있으면 부족분만 추가하는 대신 `ASSIGNMENT_ALREADY_CHARGED`로 거부한다. 추가 납부는 별도 `/topup`이다.
6. 동일 멱등키 재시도: `ApiIdempotencyExecutor`가 기존 결과를 반환하고 중복 차감하지 않는다.

### 시나리오 C: aggregate-cap 초과 차단(보장모드)

1. 참가자가 `serviceFeeGross=100,000원`인 보장모드 배정에서 본인 과금 시 `Σ기존 수금+amount > 100,000원`인 경우.
2. 서버가 추가 payload 없는 `ASSIGNMENT_CHARGE_EXCEEDS_FEE` 에러를 반환한다. Flutter는 공통 에러 메시지를 토스트로 표시하며 실제 잔여액을 계산해 보여 주지 않는다.
3. 참가자는 cap 잔여액 이하로만 납부할 수 있지만 현재 화면에서 그 잔여액을 직접 확인할 수 없다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 이벤트 상세의 확정 참가자 + chargeable=true | `assertEventParticipant` 통과 + status=CONFIRMED | 이벤트 상세 진입 CTA | 납부 화면 진입 | 일치 |
| 참가자 + payer==provider | `ASSIGNMENT_SELF_CHARGE` 서버 차단 | API 에러 | 자전거래 에러 표시 | 일치 |
| 참가자 + 첫 과금 중복 시도 | `ASSIGNMENT_ALREADY_CHARGED` | API 에러 | 중복 납부 에러 | 일치 |
| 보장모드 + cap 초과 금액 | `ASSIGNMENT_CHARGE_EXCEEDS_FEE` | API 에러 | 초과 에러 표시 | 일치 |
| 회차 미종료 + my-share 시도 | `isEventEnded=false` → 서버 차단 | API 에러 | 회차 종료 후 가능 안내 | 일치 |
| 무료초대/대납 참가자가 direct route 진입 | `myCoverageType=FREE_EXCLUDED/HOST_SUBSIDIZED`, 서버 재과금 거부 | 화면 자체는 결제 버튼 표시 | 제출 뒤 서버 에러 | UI Gap |
| 동일 멱등키 재시도 | `ApiIdempotencyExecutor` 기존 결과 반환 | 동일 `transactionId` | 중복 차감 없음 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `charge` 요청 타입 | `ServiceAssignmentChargeParam(amount: long)` | `ServiceAssignmentChargeParam` Freezed param | 일치 |
| `chargeMyShare` body | body 없음(서버 산정) | `@POST`에 body 파라미터 없음 | 일치 |
| `suggestedShare` nullable | `BigDecimal?` (null=조건 미충족) | `double?` Freezed | 일치 |
| 권위 총액/상한 | `agreedGross`, `participantCap` additive 필드 | Flutter 모델에 없음 | **불일치** |
| `chargeable` Jackson key | `boolean chargeable` → JSON key `chargeable` | `bool chargeable` (is-prefix 없음) | 일치 |
| 응답 타입 `myChargeStatus` | `List<ParticipantAssignmentChargeStatusVo>` | `Future<List<ParticipantAssignmentChargeStatusVo>>` | 일치 |
| PAID_ONLY 정책 | `WalletLedgerFacade.spendAndJournal(PAID_ONLY)` | 클라이언트 무료포인트 사용 UI 미제공 | 일치(의도된 동작) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| 확인됨 | ACCEPTED 상태 선납금 취소 시 역분개 | `chargeParticipant`는 ACCEPTED 상태도 허용(선납 PREPAID). CANCELED 전이 시 `cancel → reverseChargesOnTermination`으로 PREPAID charge 자동 reversal 실행됨. ACCEPTED→DECLINED 전이는 서버가 허용하지 않는 전이(결함 아님). | — | 조치 불필요 |
| 확인됨 | topup 후 부분환불 ambiguous 거부 | top-up(order≥2) charge 행이 있는 beneficiary에 대한 partial-refund/clawback은 `assertSingleMoneyRow`로 `ASSIGNMENT_REFUND_AMBIGUOUS` 에러 반환(미확인 경로 아님). 다중 money row에 대한 partial-refund 지원은 정책 결정 사항 — F21-05 §10 참조. | — | 조치 불필요 |
| Risk | `suggestedShare` 클라이언트 표시 vs 실서버 산정 drift | 클라이언트가 `suggestedShare`를 표시 후 사용자가 `/charge/my-share`를 호출하면 서버가 재산정(출석자 수 변경 가능) | 표시 금액과 실제 청구 금액이 다를 수 있음 — 서버 산정값이 최종 진실 | 납부 후 실제 청구 금액 확인 UI 제공 또는 `/charge/my-share` 응답의 `transactionId`로 추적 |
| Risk | `Idempotency-Key` 생성 책임 | 클라이언트가 매 요청마다 새 UUID를 생성해야 함. 재시도 시 동일 키 재사용해야 하지만 탭 새로고침 시 키 소실 가능 | 재시도 시 새 키 생성 → 이중 차감 발생 | Provider에서 멱등키를 상태로 관리하거나 재시도 전 동일 키 재사용 보장 |
| **P1** | 서버 `agreedGross`·`participantCap`이 Flutter에서 유실 | Freezed 모델이 두 additive 필드를 선언하지 않고 화면은 engagement에서 0인 `serviceFeeGross`를 총액으로 표시 | 계약금 배정의 총액/상한을 0 또는 미표시로 오인 | 모델 필드 추가 후 X·X-D를 분리 표시 |
| **P1** | direct-route 화면이 `chargeable`과 coverage를 무시 | 화면 action은 `suggestedShare` 유무만 보고 `/charge`·`topup`·`my-share`를 노출 | 무료/대납/완납/비과금 상태도 실패할 결제 CTA 노출 | `chargeable`, `myCoverageType`, cap 잔여로 완료·불가·결제 상태 분기 |
| **P1** | my-share를 선납 부족분 보충으로 사용할 수 없음 | 서버는 전체 share를 첫 과금으로 호출하고 기존 coverage면 거부 | 선납 뒤에는 `/topup` 금액을 사용자가 직접 알아야 함 | remaining-share 서버 필드/전용 top-up 산정 API 여부 결정 |
| **P2** | cap 초과 에러에 잔여액 payload 없음 | ErrorCode만 반환하고 화면은 generic toast | 사용자가 재입력 가능한 최대 금액을 모름 | remaining amount 응답 또는 status의 cap/collected 표시 |
| **P2** | 납부 완료 알림 없음 | 이벤트 상세 CTA는 상태 조회로만 열리고 완료 시 참가자 알림 발행 경로가 없음 | 사용자가 재방문하지 않으면 결제 필요를 모를 수 있음 | 알림 정책/API 신설 여부 결정 |

## 9. 수용 기준

### AC-01. 보장모드 설정

Given 호스트가 CONFIRMED 배정에 `serviceFeeGross=100000`을 설정한다.
When `POST .../service-fee`에 `serviceFeeGross=100000`을 전송한다.
Then 서버는 `ServiceAssignmentVo(serviceFeeGross=100000)`을 반환하고, 이후 참가자 과금에 aggregate-cap 100,000원이 적용된다.

### AC-02. 참가자 예약금 납부

Given 확정 참가자가 `chargeable=true`인 배정을 조회했다.
When `POST .../charge`에 `amount=30000` + `Idempotency-Key`를 전송한다.
Then 서버가 참가자 지갑에서 30,000원(PAID_ONLY) 차감 + 제공자 CreatorEarning 30,000원 즉시 적립 + `ServiceAssignmentChargeResultVo(transactionId)`를 반환한다.

### AC-03. 자전거래 차단

Given 인증된 사용자가 해당 배정의 providerUserId와 동일하다.
When `POST .../charge`를 호출한다.
Then 서버가 `ASSIGNMENT_SELF_CHARGE` 에러를 반환한다.

### AC-04. 중복 과금 차단(DB 멱등)

Given 이미 `(assignmentId, beneficiaryUserId, order=1)` charge 행이 존재한다.
When 동일 참가자가 `/charge`를 다시 호출한다.
Then 서버가 `ASSIGNMENT_ALREADY_CHARGED` 에러를 반환한다.

### AC-05. 멱등키 재시도 이중 차감 방지

Given 동일 `Idempotency-Key`로 동일 `/charge` 요청을 두 번 전송한다.
When `ApiIdempotencyExecutor`가 중복 키를 탐지한다.
Then 두 번째 요청은 지갑 차감 없이 첫 번째 응답과 동일한 `ServiceAssignmentChargeResultVo`를 반환한다.

### AC-06. my-share 회차 미종료 차단

Given 이벤트가 아직 CLOSED가 아니다.
When `POST .../charge/my-share`를 호출한다.
Then 서버가 회차 종료 조건 미충족 에러를 반환한다.

### AC-07. my-share 금액 클라이언트 입력 금지 확인

Given 회차 종료 + 보장모드 + caller∈(실출석−provider).
When `POST .../charge/my-share`를 호출한다(body 없음).
Then 서버가 `CuratedChargeSplitCalculator`로 산정한 금액으로 과금하고 `ServiceAssignmentChargeResultVo`를 반환한다. 클라이언트가 금액을 지정할 수 없다.

### AC-08. aggregate-cap 초과 차단(보장모드)

Given `serviceFeeGross=100000`이고 기존 Σ수금=80,000원이다.
When 참가자가 `amount=30000`으로 `/charge`를 시도한다.
Then 서버가 `ASSIGNMENT_CHARGE_EXCEEDS_FEE` 에러를 반환한다.

### AC-09. my-charge-status 다른 참가자 coverage 미노출(IDOR)

Given 이벤트에 참가자 A와 B가 있고 두 coverage 행이 있다.
When 참가자 A가 `GET .../my-charge-status`를 호출한다.
Then 응답에 A의 coverage만 포함되고 B의 금액/coverage_type이 노출되지 않는다.

### AC-10. suggestedShare 표시

Given 회차가 종료됐고 보장모드이며 실출석자가 4명(제공자 포함), 서비스비=100,000원.
When 참가자가 `GET .../my-charge-status`를 조회한다.
Then `suggestedShare=33333`(또는 서버 균등분할 결과) + `chargeable=true`가 반환되고, Flutter는 해당 금액을 표시하되 입력 필드를 제공하지 않는다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 확인됨 | ACCEPTED 상태 선납금 배정 취소 시 자동 역분개 | CANCELED 전이 시 `reverseChargesOnTermination` 실행 확인됨. ACCEPTED→DECLINED 전이는 허용되지 않음. |
| 확인됨 | topup 행 부분환불 | `assertSingleMoneyRow`로 다중 row beneficiary에게 `ASSIGNMENT_REFUND_AMBIGUOUS` 반환 확인됨. 지원 여부는 정책 결정 — F21-05 §10 참조. |
| UX | 납부 후 실제 청구 금액 확인 | `suggestedShare` 표시 후 `my-share` 납부 완료 시 실제 청구 금액을 화면에 표시할지 결정 |
| 테스트 | `suggestedShare` N 경계 케이스 | 실출석자=provider만인 경우(N=0), 제공자가 출석자 목록에 포함되는 경우 처리 확인 |
| 테스트 | 동시 `my-share` 두 참가자 | 두 참가자가 동시에 `/charge/my-share` 호출 시 cap 총합 정확성 검증 |
