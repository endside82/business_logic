# F21-04. 무료초대·호스트 대납 PRD

<!-- source-first; updated: 2026-07-29; source: community_api curated/ + provider/ + community_app curated/ -->

## 1. 결론

무료초대(free-exclude)와 호스트 대납(subsidize)의 생성 경로는 서버와 Flutter에 구현돼 있다. 호스트/co-host가 참가자를 돈 없이 커버됨으로 표시하거나(free-exclude), 직접 지갑에서 대납하는(subsidize) 두 경로 모두 `service_assignment_charge` 행 생성과 F3 완납 게이트 인정까지 연결되어 있다. 보장수수료 모드(serviceFeeGross > 0)에서 무료 제외를 시도하면 서버가 `ASSIGNMENT_FREE_NOT_ALLOWED`로 거부하고, Flutter도 `hasServiceFee` 가드로 버튼을 숨긴다. 그러나 offering이 있고 아직 serviceFeeGross=0인 카탈로그 배정에서는 앱이 버튼을 노출한 뒤 서버가 거부한다. 자전거래 가드는 서버에서 강제되지만 두 서비스 모두 beneficiary가 실제 이벤트 참가자인지는 직접 검증하지 않는다. FREE_EXCLUDED 전용 취소 API는 현재 없다.

### 2026-07-29 현재 소스 델타

- offering/terms가 붙은 카탈로그 배정은 X 권위를 보존하기 위해 `FREE_EXCLUDED`를 항상 금지한다.
  아직 terms를 제안하지 않은 offering 배정도 동일하다. 무료로 초대하려면 호스트 대납(subsidize)을 쓴다.
- subsidize는 최신 terms 수락 게이트와 참가자 cap(X 또는 X-D)을 따르며 호스트 지갑에서 실제 돈을
  차감해 earning을 만든다. 신규 카탈로그 계약이면 charge 단위 5% 플랫폼 수수료와 3.3% 원천징수를
  적용한다.
- direct/legacy 수금액 모드(`serviceFeeGross=0`, offering/terms 없음)만 돈 없는 FREE_EXCLUDED가
  가능하다. direct 보장총액 X>0은 종전과 같이 금지된다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/src/main/java/com/endside/community/curated/controller/ServiceAssignmentController.java` | `POST .../free-exclude`, `POST .../subsidize` |
| Backend Service (free-exclude) | `ServiceAssignmentService.java` → `markFreeExcluded` | 권한·보장모드 가드·coverage 행 INSERT |
| Backend Service (subsidize) | `ServiceAssignmentChargeService.java` → `markHostSubsidized` | 호스트 지갑 차감·제공자 earning·자전거래 가드 |
| Backend Enum | `CoverageType.java` | `FREE_EXCLUDED`, `HOST_SUBSIDIZED`, `SELF_PAID`, `NOSHOW_FORFEIT` |
| Backend Model | `ServiceAssignment.java`, `ServiceAssignmentCharge.java` | `serviceFeeGross`, `engagementId`, `coverageType`, `payerUserId` |
| Frontend API | `service_assignment_api.dart` | `freeExclude`, `subsidize` |
| Frontend Repository | `service_assignment_repository.dart` | `Result<void>` 래핑 |
| Frontend Screen | `event_assignments_screen.dart` | `_freeExclude`, `_subsidize`, `canFreeExclude`, `canPrepay` 분기 |
| Frontend Provider | `service_assignment_provider.dart` | `freeExclude`, `subsidize` 메서드 |
| Verification | 서버 유닛 테스트 + 서버/Flutter 소스 실측 | 생성 경로 구현, undo·participant 검증·catalog CTA Gap |

## 3. 전체 동작 흐름

### 3-A. 무료 제외(free-exclude)

1. 호스트가 `EventAssignmentsScreen`에서 배정 카드의 "무료 제외" 버튼을 누른다. 버튼은 `canFreeExclude = !hasServiceFee`가 true일 때만 노출된다.
2. `ParticipantPickerSheet.show`로 이벤트 참가자 중 대상을 선택한다.
3. 사유(선택) 입력 후 `ServiceAssignmentRepository.freeExclude(eventId, assignmentId, ServiceAssignmentFreeExcludeParam(beneficiaryUserId, reason))`를 호출한다.
4. 서버 `ServiceAssignmentService.markFreeExcluded`는 다음을 검증한다.
   - `assertHostOrCoHost(eventId, hostUserId)` 권한
   - 배정 상태 `CONFIRMED`
   - 보장수수료 모드(`serviceFeeGross > 0`)이면 `ASSIGNMENT_FREE_NOT_ALLOWED` 거부
   - offering 또는 terms가 붙은 배정이면 금액과 무관하게 `ASSIGNMENT_FREE_NOT_ALLOWED` 거부
   - beneficiary 중복 커버 여부(`ASSIGNMENT_ALREADY_CHARGED`)
   - **검증하지 않음**: beneficiary의 이벤트 참가자 자격
5. 통과하면 `ServiceAssignmentCharge`를 `CoverageType.FREE_EXCLUDED`, `payer=null`, `amount=0`으로 INSERT한다.
6. F3 완납 게이트는 FREE_EXCLUDED 행을 `coveredBeneficiaries`에 포함시켜 "커버됨"으로 인정한다.
7. Flutter는 성공 토스트를 표시하고 배정 목록을 refresh한다.

### 3-B. 호스트 대납(subsidize)

1. 호스트가 배정 카드의 "대납" 버튼을 누른다(보장수수료 모드에서도 노출됨).
2. `ParticipantPickerSheet.show`로 대납 대상 선택, 금액 입력 후 `ServiceAssignmentRepository.subsidize(eventId, assignmentId, ServiceAssignmentSubsidizeParam(beneficiaryUserId, amount))`를 호출한다.
3. 서버 `ServiceAssignmentChargeService.markHostSubsidized`는 다음을 검증한다.
   - `assertHostOrCoHost(eventId, hostUserId)` 권한
   - 배정 상태 `CONFIRMED`
   - 자전거래 차단: `provider == hostUserId` 또는 `provider == beneficiaryUserId`이면 `ASSIGNMENT_SELF_CHARGE`
   - beneficiary 중복 커버(`ASSIGNMENT_ALREADY_CHARGED`)
   - 최신 terms 및 participant cap 검증
   - **검증하지 않음**: beneficiary의 이벤트 참가자 자격
4. `ServiceAssignmentCharge`를 `CoverageType.HOST_SUBSIDIZED`, `payer=hostUserId`, `beneficiary=beneficiaryUserId`로 INSERT(예약).
5. `WalletLedgerFacade.spendAndJournal`로 호스트 지갑에서 PAID_ONLY 차감, 제공자 earning 즉시 생성·적립.
6. charge에 `transactionId`, `creatorEarningId` 갱신.
7. F3 정산 시 HOST_SUBSIDIZED charge도 `moneyRows`에 포함되어 제공자 지급 대상이 된다. 환불 시에는 `payer=호스트`에게 복원된다.

## 4. 서버 계약

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/free-exclude`

| 항목 | 값 |
|---|---|
| Controller | `ServiceAssignmentController#freeExclude` |
| 인증 | 필수(`@AuthenticationPrincipal`) |
| 권한 | 호스트 또는 co-host(`assertHostOrCoHost`) |
| Request Body | `ServiceAssignmentFreeExcludeParam` — `beneficiaryUserId: long`, `reason: String?` |
| 응답 | `void` (HTTP 200) |
| 핵심 가드 | CONFIRMED 상태·중복 커버 불가·serviceFeeGross>0 또는 offering/terms 배정 불가(`ASSIGNMENT_FREE_NOT_ALLOWED`). beneficiary 참가자 자격은 미검증 |
| Side effect | `service_assignment_charge` 행 INSERT(`FREE_EXCLUDED`, amount=0, payer=null) |

### `POST /api/v1/events/{eventId}/assignments/{assignmentId}/subsidize`

| 항목 | 값 |
|---|---|
| Controller | `ServiceAssignmentController#subsidize` |
| 인증 | 필수 |
| 권한 | 호스트 또는 co-host |
| Request Body | `ServiceAssignmentSubsidizeParam` — `beneficiaryUserId: long`, `amount: long` |
| 응답 | `void` (HTTP 200) |
| 핵심 가드 | CONFIRMED·최신 terms·participant cap·자전거래 차단·중복 커버 불가. beneficiary 참가자 자격은 미검증 |
| Side effect | 호스트 지갑 차감(PAID_ONLY) + 제공자 `CreatorEarning` 적립 + `service_assignment_charge` INSERT(`HOST_SUBSIDIZED`) |

### CoverageType 4종 의미(소스: `CoverageType.java`)

| 값 | payer | amount | earning | F3 완납게이트 |
|---|---|---|---|---|
| `SELF_PAID` | beneficiary(참가자) | > 0 | 있음 | money-backed 커버 |
| `FREE_EXCLUDED` | null | 0 | 없음 | "커버됨"으로 인정(돈 無 audit) |
| `HOST_SUBSIDIZED` | hostUserId | > 0 | 있음(제공자 수령) | money-backed 커버 |
| `NOSHOW_FORFEIT` | 원 납부자 | > 0 | 있음(기존 유지) | 출석 면제 + 커버됨 인정 |

## 5. 프론트 계약

| 항목 | 구현 |
|---|---|
| Screen | `EventAssignmentsScreen` |
| 무료 제외 노출 조건 | `canFreeExclude = !hasServiceFee` — 보장수수료 모드에서 숨김 |
| 대납 노출 조건 | 배정 상태 `CONFIRMED`, 보장수수료 모드에서도 노출 |
| 대상 선택 | `ParticipantPickerSheet.show(context, eventId)` |
| Repository 메서드 | `ServiceAssignmentRepository.freeExclude`, `.subsidize` |
| Provider 메서드 | `EventAssignmentsNotifier.freeExclude`, `.subsidize` |
| 성공 토스트 | `AppToast.show(context, message: '무료 제외 처리되었습니다')` / `'대납 처리되었습니다'` |
| 실패 | `AppToast.show(type: ToastType.error, message: error.displayMessage)` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + CONFIRMED + 수금액 모드(X=0) | `markFreeExcluded` 통과 | `canFreeExclude=true`, 버튼 노출 | 무료 제외 가능 | 일치 |
| 호스트 + CONFIRMED + direct 보장수수료 모드(X>0) | `ASSIGNMENT_FREE_NOT_ALLOWED` | `canFreeExclude=false`, 버튼 숨김 | 버튼 미노출 | 일치(이중 가드) |
| 호스트 + CONFIRMED + catalog preterms(serviceFeeGross=0) | offering 존재로 `ASSIGNMENT_FREE_NOT_ALLOWED` | `canFreeExclude=true`라 버튼 노출 | 제출 후 서버 에러 | UI Gap |
| 호스트 + CONFIRMED + 대납 | `markHostSubsidized` 통과 | "대납" 버튼 노출(모드 무관) | 대납 가능 | 일치 |
| 호스트 = 제공자 (자전거래) | `ASSIGNMENT_SELF_CHARGE` | 서버 에러 토스트 | 거부 | 일치(서버 백스톱) |
| 제공자 = beneficiary (자전거래) | `ASSIGNMENT_SELF_CHARGE` | 서버 에러 토스트 | 거부 | 일치(서버 백스톱) |
| 비호스트 | `assertHostOrCoHost` 실패 | — | 403 에러 | 일치 |
| 중복 커버(beneficiary 기존 coverage) | `ASSIGNMENT_ALREADY_CHARGED` | 서버 에러 토스트 | 거부 | 일치 |
| LOCKED/CANCELED 배정 | `ASSIGNMENT_NOT_CONFIRMED` | — | 거부 | 일치 |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `CoverageType.FREE_EXCLUDED` | `ServiceAssignmentChargeService`, `CoverageType.java` | `service_assignment_coverage_vo.dart`에서 string으로 수신 | 일치 |
| `CoverageType.HOST_SUBSIDIZED` | `CoverageType.java` | 동일 | 일치 |
| direct 보장모드 게이팅 | `serviceFeeGross > 0` 체크 후 `ASSIGNMENT_FREE_NOT_ALLOWED` | `hasServiceFee = (item.serviceFeeGross ?? 0) > 0` → `canFreeExclude = !hasServiceFee` | 일치 |
| catalog 무료제외 | offering/terms 존재만으로 금지 | offering/currentTerms를 보지 않음 | **불일치** |
| 대납 환불 귀속 | `refundParticipantCharge`에서 `payer=hostUserId`에게 복원 | 환불 화면(F21-05)에서 동일 | 일치 |
| 자전거래 가드 | 서버 서비스 계층 | 프론트에 별도 사전 차단 없음(서버 백스톱에 의존) | 서버 단독 — Gap 아님(의도됨) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | free-exclude 후 coverage 제거 경로 없음 | `markFreeExcluded`는 DELETE/undo API 없음. 전액환불(`refund`)은 FREE_EXCLUDED를 money row 없음으로 거부 | 잘못 무료 처리한 경우 배정 취소만 가능(전체 reversal) | 운영 정책 결정: "무료 제외 취소" 엔드포인트 필요 여부 |
| P2 | `ParticipantPickerSheet`에서 이미 커버된 참가자를 걸러내지 않음 | 서버가 `ASSIGNMENT_ALREADY_CHARGED`로 거부하지만 UX가 선 에러를 유도 | 이중 시도 후 에러 토스트 | 프론트에서 coverage 목록을 먼저 조회해 선택지에서 제외 |
| P3 | HOST_SUBSIDIZED 환불 수령자가 coverage picker에 명시되지 않음 | `refundParticipantCharge`는 payer(호스트)에게 복원하지만 앱 UI에서 "누가 환불받는지" 표시 없음 | 호스트가 의도를 오해할 수 있음 | 환불 picker에 payer 정보 표시 보강 |
| **P1** | beneficiary 이벤트 참가자 자격 미검증 | free-exclude/subsidize 서비스가 assignment·권한·중복만 검사하고 `assertEventParticipant`를 호출하지 않음 | 직접 API로 비참가자 coverage를 만들어 readiness/settle을 과커버로 막을 수 있음 | 두 mutation에 event participant 검증 추가 |
| **P1** | catalog preterms 무료제외 버튼 오노출 | Flutter는 `!hasServiceFee`만 보지만 서버는 offering/terms 존재만으로 거부 | 실패할 CTA와 에러 후 재시도 UX | `offeringId/currentTermsVersion`까지 보고 버튼 숨김 |

## 9. 수용 기준

### AC-01. 수금액 모드에서 무료 제외

Given 호스트가 CONFIRMED 배정(serviceFeeGross=0)의 이벤트에서 무료 제외 버튼을 누른다.  
When 이벤트 참가자 중 대상을 선택하고 사유를 입력해 제출한다.  
Then `POST .../free-exclude`가 200을 반환하고, F3 완납 게이트에서 해당 beneficiary가 "커버됨"으로 인정된다. Flutter는 성공 토스트를 표시한다.

### AC-02. 보장수수료 모드에서 무료 제외 시도 차단

Given 호스트가 CONFIRMED 배정(serviceFeeGross > 0)의 이벤트를 본다.  
When 배정 카드를 렌더링한다.  
Then Flutter는 "무료 제외" 버튼을 `canFreeExclude=false`로 숨긴다. 서버도 `ASSIGNMENT_FREE_NOT_ALLOWED`로 거부한다(이중 가드).

### AC-03. 호스트 대납 정상 흐름

Given 호스트가 CONFIRMED 배정의 이벤트에서 대납 버튼을 누른다.  
When 참가자를 선택하고 금액(예: 30000원)을 입력해 제출한다.  
Then 호스트 지갑에서 30000원이 차감되고, 제공자에게 CreatorEarning이 적립된다. `service_assignment_charge`에 HOST_SUBSIDIZED, payer=hostUserId 행이 생긴다. Flutter는 "대납 처리되었습니다" 토스트를 표시한다.

### AC-04. 자전거래 차단

Given 호스트와 제공자가 동일한 사용자다.  
When 호스트가 대납을 시도한다.  
Then 서버가 `ASSIGNMENT_SELF_CHARGE`를 반환하고 Flutter는 에러 토스트를 표시한다.

### AC-05. 대납 beneficiary를 F3 완납 게이트가 커버됨으로 인정

Given HOST_SUBSIDIZED coverage가 있는 beneficiary가 실제 출석자다.  
When 호스트가 settle을 트리거한다.  
Then F3 완납 게이트의 `coveredBeneficiaries`에 해당 beneficiary가 포함되어 게이트를 통과한다.

### AC-06. FREE_EXCLUDED 행은 earning 없이 완납 게이트 통과

Given beneficiary가 FREE_EXCLUDED coverage를 갖고 있다.  
When F3 settle을 트리거한다.  
Then FREE_EXCLUDED 행은 `moneyRows`에서 제외되어 지급 대상이 아니지만, `coveredBeneficiaries`에는 포함되어 완납 게이트를 통과한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 정책 | 무료 제외 취소(undo) 경로 필요 여부 | 잘못 무료 처리 시 배정 전체 취소 외 대안 없음. "free-exclude 취소" 엔드포인트 추가 여부 운영 결정 필요 |
| 구현 | 참가자 picker에서 이미 커버된 참가자 사전 필터링 | `GET .../coverages` 조회 결과로 선택지 제외 |
| 구현 | 환불 picker에 payer 정보 표시 | HOST_SUBSIDIZED 환불 시 "호스트에게 환불됨" 명시 |
