# 21. 제공자 배정·정산 PRD

<!-- source-first; updated: 2026-06-24; source: community_api/src/main/java/com/endside/community/curated/ + community_app/lib/…/curated/ -->

> 문서 상태: **신규 도메인 신설본**. 1차 자료는 `community_api/src/main/java/com/endside/community/curated/` 패키지
> (모델 5종 · enum 11종 · 서비스 6종 · 컨트롤러 1종 · 엔드포인트 25개 · 배치 1종),
> `community_app/lib/data/models/curated/`, `lib/data/api/service_assignment_api.dart`,
> `lib/domain/providers/curated/service_assignment_provider.dart`,
> `lib/presentation/curated/` 직접 확인 결과다.
>
> **상태 확인(2026-06-24)**: 3레포 모두 `origin/main` 반영 완료. per-slice Codex 합의 PASS.

## 1. 결론

제공자 배정·정산 도메인은 호스트가 이벤트(또는 정기모임)에 **서비스 제공자(강사 등 인력)를 배정**하고,
참가자가 **서비스비를 분담 결제**하며, 회차 종료 후 **제공자에게 정산 지급**하는 신규 위성(satellite) 도메인이다.

결합 설계 핵심은 **payment 도메인 내부를 직접 건드리지 않고 3개 검증형 포트(port/adapter)로만 통신**하는 단방향
부패방지경계(anti-corruption layer)다. 수수료는 0%(원천징수 3.3%만). 돈은 기존 WalletLedgerFacade·
CreatorEarning·AccountingLedger 인프라를 재사용한다.

7개 기능 PRD(F21-01~07)가 이 도메인을 커버한다: [F21-01 제공자 배정](../02_feature_prds/21_curated/F21-01_provider-assignment_prd.md), [F21-02 참가자 서비스비 분담 결제](../02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md), [F21-03 제공자 정산](../02_feature_prds/21_curated/F21-03_provider-settlement_prd.md), [F21-04 무료초대·호스트 대납](../02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md), [F21-05 환불·회수](../02_feature_prds/21_curated/F21-05_refund-clawback_prd.md), [F21-06 계약금 선납](../02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md), [F21-07 정기모임 묶음 배정·정산](../02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md).

## 2. 실사 근거 맵

| ID | 기능 | PRD | 핵심 소스 | 상태 | Codex |
|---|---|---|---|---|---|
| F21-01 | 제공자 배정 | [F21-01_provider-assignment_prd.md](../02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | `ServiceAssignmentController#{create,listByEvent,confirm,cancel,accept,reject}`, `ServiceAssignmentService`, `ServiceAssignment`, `AssignmentStatus(7)` | 구현됨 | ✅ PASS |
| F21-02 | 참가자 서비스비 분담 결제 | [F21-02_participant-fee-charge_prd.md](../02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | `ServiceAssignmentController#{charge,topup,chargeMyShare,myChargeStatus,setServiceFee}`, `ServiceAssignmentChargeService`, `WalletLedgerFacade`, `CoverageType(4)` | 구현됨 | ✅ PASS |
| F21-03 | 제공자 정산 | [F21-03_provider-settlement_prd.md](../02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | `ServiceAssignmentController#{settle,settlementReadiness}`, `ServiceAssignmentSettlementService`, `CuratedProviderSettlementPort`, `CuratedSettlementBatchService` | 구현됨 | ✅ PASS |
| F21-04 | 무료초대·호스트 대납 | [F21-04_free-invite-host-subsidy_prd.md](../02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md) | `ServiceAssignmentController#{freeExclude,subsidize}`, `CoverageType.FREE_EXCLUDED/HOST_SUBSIDIZED`, `ASSIGNMENT_FREE_NOT_ALLOWED` | 구현됨 | ✅ PASS |
| F21-05 | 환불·회수 | [F21-05_refund-clawback_prd.md](../02_feature_prds/21_curated/F21-05_refund-clawback_prd.md) | `ServiceAssignmentController#{refund,partialRefund,clawback,noshowForfeit}`, `ServiceAssignmentRefund`, `AssignmentRefundType(2)` | 구현됨 | ✅ PASS |
| F21-06 | 계약금 선납(engagement) | [F21-06_engagement-prepayment_prd.md](../02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md) | `ServiceAssignmentController#{payPrepaymentByWallet,cancelPrepayment}`, `ServiceEngagement`, `ServiceAssignmentPrepaymentService`, `PrepaymentApplicationType(2)` | 구현됨 | ✅ PASS |
| F21-07 | 정기모임 묶음 배정·정산 | [F21-07_regular-meeting-bulk_prd.md](../02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md) | `ServiceAssignmentController#{bulkAssignToRegularMeeting,bulkSettleRegularMeeting}`, `BulkSettleStatus(6)`, `CuratedEventAccessPort#{assertRegularMeetingHost,getRegularMeetingSessionEventIds}` | 구현됨 | ✅ PASS |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F21-03](../02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | 제공자 정산 | 완납 게이트(집합 동일성) 설계가 도메인 전체 돈 흐름의 핵심 안전장치. 검증형 포트와 주간 배치 구조 이해 필수 |
| [F21-02](../02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | 참가자 서비스비 분담 결제 | per-charge earning 즉시적립 + PAID_ONLY + 멱등 설계가 F21-03 정산 진실(charge 합계)의 재료 |
| [F21-01](../02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | 제공자 배정 | 상태머신(7값) 이해 없이 나머지 기능 진입 불가. IDOR 경계와 owner=event 단독 설계 파악 기반 |

## 4. 도메인 책임 한도

curated 도메인은 배정 생애주기(계약축 AssignmentStatus)·과금 집계(coverage 신원)·정산 승인을 소유한다.
**돈의 실행(지갑 차감·적립·지급)은 payment 도메인 포트에 위임**하며 직접 처리하지 않는다.

- 이벤트 출석자 권위: `CuratedEventAccessPort`가 event 도메인에 위임 (curated 직접 EventRepository 접근 금지)
- 제공자 earning 기록/환불: `CuratedProviderEarningPort`가 payment 도메인에 위임
- 검증형 정산 지급 승인: `CuratedProviderSettlementPort`가 payment 도메인에 위임 (마켓 `processCreatorSettlement` 신뢰형 직접호출 금지)

admin 전용 curated 화면은 없으며, `ManageCreatorEarning`에서 `SERVICE_ASSIGNMENT` 소스타입으로 노출되고 머니플로우 트레이스로 관리된다(의도된 공유 설계).

## 5. 핵심 데이터·인프라

### 5.1 신규 테이블 5종 (V1__init.sql 통합, V2+ 금지)

| 테이블 | 책임 | 핵심 제약 |
|---|---|---|
| `service_assignment` | 배정 계약 생애주기 | `UNIQUE(event_id, provider_user_id)`, `@Version` 낙관락, owner=event_id 단독 |
| `service_assignment_charge` | 참가자 분담 coverage 행 | `UNIQUE(assignment_id, beneficiary_user_id, charge_order)`, `creator_earning_id` 1:1 FK |
| `service_assignment_prepayment` | 계약금/선납 | `engagement_id` FK, `status`(ServicePrepaymentStatus), `application_type`(PrepaymentApplicationType) |
| `service_assignment_refund` | 환불 audit | `UNIQUE(refund_transaction_id)`, `refund_type`(AssignmentRefundType) |
| `service_engagement` | 제공자 계약(약정) | `agreed_provider_fee`, `status`(ServiceEngagementStatus) |

### 5.2 enum 11종

| Enum | 값 | 위치 |
|---|---|---|
| `AssignmentStatus` | DRAFT·ASSIGNED·ACCEPTED·DECLINED·CONFIRMED·SETTLEMENT_LOCKED·CANCELED (7) | `curated/constants/AssignmentStatus.java` |
| `AssignmentSource` | HOST_MANUAL·HOST_INVITE_ACCEPTED·PROVIDER_APPLY·ADMIN_ASSIGNED (4) | `curated/constants/AssignmentSource.java` |
| `FulfillmentStatus` | PENDING·IN_PROGRESS·FULFILLED·PARTIALLY_FULFILLED·NO_SHOW·DISPUTED (6) | `curated/constants/FulfillmentStatus.java` |
| `CoverageType` | SELF_PAID·FREE_EXCLUDED·HOST_SUBSIDIZED·NOSHOW_FORFEIT (4) | `curated/constants/CoverageType.java` |
| `ChargeOrigin` | PREPAID·POSTPAID (2) | `curated/constants/ChargeOrigin.java` |
| `AssignmentRefundType` | PARTIAL_HOST_ABSORBED·CLAWBACK (2) | `curated/constants/AssignmentRefundType.java` |
| `PrepaymentApplicationType` | APPLIED_TO_PROVIDER·FORFEIT_TO_PROVIDER (2) | `curated/constants/PrepaymentApplicationType.java` |
| `BulkSettleStatus` | SETTLED·ALREADY_SETTLED·NO_ASSIGNMENT·SKIPPED_NOT_READY·BLOCKED·FAILED (6) | `curated/constants/BulkSettleStatus.java` |
| `ServicePrepaymentMethod` | (소스 확인됨) | `curated/constants/ServicePrepaymentMethod.java` |
| `ServicePrepaymentStatus` | (소스 확인됨) | `curated/constants/ServicePrepaymentStatus.java` |
| `ServiceEngagementStatus` | (소스 확인됨) | `curated/constants/ServiceEngagementStatus.java` |

### 5.3 포트(port) 3종

| 포트 | 방향 | 책임 |
|---|---|---|
| `CuratedEventAccessPort` | curated → event | 호스트/co-host 권한 검증, 실제 출석자 집합 조회, 회차 종료 확인, 참가자 자격 검증, 정기모임 세션 조회 |
| `CuratedProviderEarningPort` | curated → payment | per-charge earning 기록, 계약금 earning leg 적용, earning 환불/회수 |
| `CuratedProviderSettlementPort` | curated → payment | earning 검증형 승인(PENDING→APPROVED), 주간 배치 대상 조회, 실지급(REQUIRES_NEW 격리) |

### 5.4 배치 1종

| 배치 | 일정 | 책임 |
|---|---|---|
| `CuratedSettlementBatchService` | 매주 월요일 03:00 스케줄러/JVM 기본 시간대 (`0 0 3 * * MON`, zone 미지정 — cron 설정 override 가능) | APPROVED·SERVICE_ASSIGNMENT earning을 provider 단위로 모아 실지급. Redisson 분산락(`curated:settlement:weekly:lock`) + 개별 provider REQUIRES_NEW 격리(부분 성공 허용) |

## 6. 도메인 외부 영향

| 도메인 | 영향 |
|---|---|
| 03 이벤트 | 배정 owner·실제 출석자 권위. `CuratedEventAccessPort`를 통해 단방향 접근 |
| 06 결제/지갑 | `WalletLedgerFacade.spendAndJournal`로 PAID_ONLY 차감+분개. `CreatorEarning` 적립/환불/회수. `SERVICE_ASSIGNMENT` SpendingPurpose 소스 |
| 07 모임정산 | `MarketplaceSettlementService.processCreatorSettlement` 검증 포트 위임(직접 호출 금지). CreatorEarning·payout 인프라 공유 |
| 17 정기모임 | F21-07: 다회차 일괄 배정·정산. `CuratedEventAccessPort#{assertRegularMeetingHost,getRegularMeetingSessionEventIds}` 경유 |
| admin | `ManageCreatorEarning`(SERVICE_ASSIGNMENT 소스타입 가시화) + 머니플로우 트레이스. 전용 admin curated 화면 없음(의도된 설계) |

## 7. 진행 상태 (2026-06-24 기준)

| Phase | 범위 | 상태 | Codex |
|---|---|---|---|
| P0 | 3개 포트/어댑터 설계 + 부패방지경계 | 완료 | ✅ PASS |
| F21-01 | 배정 상태머신(7값) + IDOR + owner=event | 완료 | ✅ PASS |
| F21-02 | 참가자 과금(PAID_ONLY + 멱등 + per-charge earning) + my-share N분의1 | 완료 | ✅ PASS |
| F21-03 | 완납 게이트(집합 동일성) + 보장모드 Σ검증 + 검증형 포트 승인 + 주간 배치 | 완료 | ✅ PASS |
| F21-04 | 무료초대(FREE_EXCLUDED) + 호스트 대납(HOST_SUBSIDIZED) | 완료 | ✅ PASS |
| F21-05 | 환불(전액/부분/clawback) + 멱등키 + 노쇼 forfeit | 완료 | ✅ PASS |
| F21-06 | 계약금 선납(engagement) + applyDepositIfPresent + forfeitOnCancel | 완료 | ✅ PASS |
| F21-07 | 정기모임 일괄 배정·묶음 정산(BulkSettleStatus 6값) | 완료 | ✅ PASS |
| Flutter | 호스트/제공자/참가자 7개 화면 + 모델 + API + Repository + Providers | 완료 | — UI |
| 3레포 origin/main | api `21c0bb5` · admin `e4c93d5` · app `1d2e094` | 완료 | — |

## 8. 잔여 후속

| 항목 | 차단 사유 |
|---|---|
| F7 용역 세무 — 지급명세서 산출·사업자/개인 세율 구분 | **외부 차단**: PG·세무 계약 대기. 원천징수 3.3%·자료적재는 구현 완료 |
| ProviderRole taxonomy 확정 | product 결정 대기(현재 varchar(30) 자유 입력) |
| admin curated 전용 화면 | 의도적 미구현(머니플로우·ManageCreatorEarning 공유로 충분). 향후 운영 판단 |

## 9. 관련 문서

- 델타 실사: `.delta_2026-06-24_curated/00_dossier.md`
- F21-01 제공자 배정: `prd/02_feature_prds/21_curated/F21-01_provider-assignment_prd.md`
- F21-02 참가자 서비스비 분담 결제: `prd/02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md`
- F21-03 제공자 정산: `prd/02_feature_prds/21_curated/F21-03_provider-settlement_prd.md`
- 도메인 06 결제/지갑: `prd/01_domain_prds/06_결제_and_지갑_prd.md`
- 도메인 07 모임정산: `prd/01_domain_prds/07_모임_정산_prd.md`
- 도메인 17 정기모임: `prd/01_domain_prds/17_정기모임_prd.md`
- 머니플로우 감사: `docs/audit/money-flow-2026-06-12/REMEDIATION_STATUS.md`
- 로드맵 계획서: `docs/plan/curated/PAYMENT_COUPLING_ADVANCEMENT_PLAN.md`
