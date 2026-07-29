# 21. 제공자 배정·정산 PRD

<!-- source-first; updated: 2026-07-29; source: community_api curated/ + provider/ + community_admin_api provider/ + community_app curated/ + provider/ -->

> 문서 상태: **2026-07-29 소스 재실측본**. 공개 API의 `curated/`와 `provider/`, 관리자 API의
> `provider/`, Flutter의 curated/provider 전 레이어를 직접 대조했다.
>
> - 공개 API: curated 30개 + provider 19개 = **49개 엔드포인트**, 엔티티 **12종**
>   (curated 7 + provider 5), 관련 테스트 **34파일/334 `@Test`**
> - 관리자 API: 제공자 심사·문서·상품 제재 **8개 엔드포인트**, 관련 테스트 **4파일/16 `@Test`**
> - Flutter: curated 5화면 + provider 7화면, 관련 라우트 **13개**, UI·model 테스트
>   **10파일/63개** + 알림 라우터 테스트 **1파일/5개**
>
> 2026-07-08 이후 핵심 변화는 제공자 프로필·검증·상품 카탈로그, 카탈로그 기반 배정, 버전형 계약조건,
> 카테고리 공통 플랫폼 수수료 5%, 이행 통계, 관리자 심사 API의 추가다. 이 수치는 생성 파일을 제외한
> 실제 소스와 테스트 애노테이션/함수 수를 기준으로 한다.

## 1. 결론

제공자 배정·정산 도메인은 호스트가 이벤트(또는 정기모임)에 **서비스 제공자(강사 등 인력)를 배정**하고,
참가자가 **서비스비를 분담 결제**하며, 회차 종료 후 **제공자에게 정산 지급**하는 신규 위성(satellite) 도메인이다.

결합 설계 핵심은 **payment 도메인 내부를 직접 건드리지 않고 3개 검증형 포트(port/adapter)로만 통신**하는 단방향
부패방지경계(anti-corruption layer)다. 카탈로그 계약은 `FEE_V2_5PCT`에 따라 총액의 **5.00% 플랫폼
수수료**와 수수료 차감 후 금액의 **3.3% 원천징수**를 적용한다. 5% 정책 도입 전 수락된
`FEE_V1_PASSTHROUGH` 계약과 direct/legacy 배정(`feeRateSnapshot=null`)은 0% 스냅샷을 유지한다.
돈은 기존 WalletLedgerFacade·CreatorEarning·AccountingLedger 인프라를 재사용한다.

7개 기능 PRD(F21-01~07)가 이 도메인을 커버한다: [F21-01 제공자 배정](../02_feature_prds/21_curated/F21-01_provider-assignment_prd.md), [F21-02 참가자 서비스비 분담 결제](../02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md), [F21-03 제공자 정산](../02_feature_prds/21_curated/F21-03_provider-settlement_prd.md), [F21-04 무료초대·호스트 대납](../02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md), [F21-05 환불·회수](../02_feature_prds/21_curated/F21-05_refund-clawback_prd.md), [F21-06 계약금 선납](../02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md), [F21-07 정기모임 묶음 배정·정산](../02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md).

서버의 돈·상태 계약은 구현돼 있지만 Flutter 표면이 모든 계약을 완결하지는 않는다. 특히 참가자 과금
상세값·카탈로그 계약금 결제·정산 readiness 표시·무료처리 취소·제공자 지급내역·정기모임 DRAFT 재개는
현재 소스에서 명확한 공백이다. 아래 상태표의 “구현됨”은 서버 endpoint 존재와 동일한 의미가 아니며,
클라이언트 도달성은 §8의 잔여 후속을 함께 봐야 한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | 핵심 소스 | 상태 | Codex |
|---|---|---|---|---|---|
| F21-01 | 제공자 프로필·카탈로그·배정·계약조건 | [F21-01_provider-assignment_prd.md](../02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | `ProviderProfileController`, `OfferingController`, `OfferingCatalogController`, `CatalogAssignmentService`, `ServiceAssignmentTermsService`, `ServiceAssignmentController` | 구현됨 | ✅ 실측 |
| F21-02 | 참가자 서비스비 분담 결제 | [F21-02_participant-fee-charge_prd.md](../02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | `ServiceAssignmentController#{charge,topup,chargeMyShare,myChargeStatus,setServiceFee}`, `ServiceAssignmentChargeService`, `WalletLedgerFacade`, `CoverageType(4)` | 서버 구현·앱 정보 축약 | ⚠️ 실측 |
| F21-03 | 제공자 정산 | [F21-03_provider-settlement_prd.md](../02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | `ServiceAssignmentController#{settle,settlementReadiness}`, `ServiceAssignmentSettlementService`, `CuratedProviderSettlementPort`, `CuratedSettlementBatchService` | 서버 구현·앱 UX 공백 | ⚠️ 실측 |
| F21-04 | 무료초대·호스트 대납 | [F21-04_free-invite-host-subsidy_prd.md](../02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md) | `ServiceAssignmentController#{freeExclude,subsidize}`, `CoverageType.FREE_EXCLUDED/HOST_SUBSIDIZED`, `ASSIGNMENT_FREE_NOT_ALLOWED` | 생성 구현·undo 없음 | ⚠️ 실측 |
| F21-05 | 환불·회수 | [F21-05_refund-clawback_prd.md](../02_feature_prds/21_curated/F21-05_refund-clawback_prd.md) | `ServiceAssignmentController#{refund,partialRefund,clawback,noshowForfeit}`, `ServiceAssignmentRefund`, `AssignmentRefundType(2)` | 구현됨·경로별 멱등 상이 | ⚠️ 실측 |
| F21-06 | 계약금 선납(engagement) | [F21-06_engagement-prepayment_prd.md](../02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md) | `ServiceAssignmentController#{payPrepaymentByWallet,cancelPrepayment}`, `ServiceEngagement`, `ServiceAssignmentPrepaymentService`, `PrepaymentApplicationType(2)` | 직접 구현·카탈로그 앱 단절 | ⚠️ 실측 |
| F21-07 | 정기모임 묶음 배정·정산 | [F21-07_regular-meeting-bulk_prd.md](../02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md) | `ServiceAssignmentController#{bulkAssignToRegularMeeting,bulkSettleRegularMeeting}`, `BulkSettleStatus(6)`, `CuratedEventAccessPort#{assertRegularMeetingHost,getRegularMeetingSessionEventIds}` | 핵심 구현·DRAFT/bulk cancel 공백 | ⚠️ 실측 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F21-03](../02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | 제공자 정산 | 완납 게이트(집합 동일성) 설계가 도메인 전체 돈 흐름의 핵심 안전장치. 검증형 포트와 주간 배치 구조 이해 필수 |
| [F21-02](../02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | 참가자 서비스비 분담 결제 | per-charge earning 즉시적립 + PAID_ONLY + 멱등 설계가 F21-03 정산 진실(charge 합계)의 재료 |
| [F21-01](../02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | 제공자 배정 | 상태머신(7값) 이해 없이 나머지 기능 진입 불가. IDOR 경계와 owner=event 단독 설계 파악 기반 |

## 4. 도메인 책임 한도

curated 도메인은 배정 생애주기(계약축 AssignmentStatus)·과금 집계(coverage 신원)·정산 승인을 소유한다.
**돈의 실행(지갑 차감·적립·지급)은 payment 도메인 포트에 위임**하며 직접 처리하지 않는다.

provider 도메인은 공개 프로필, 검증문서, 상품과 사진, 상품 조회를 소유한다. 카탈로그 배정은 상품의 제공자·
카테고리·제목·버전을 서버가 스냅샷으로 복사하므로 클라이언트가 제공자나 출처를 위조할 수 없다.

- 이벤트 출석자 권위: `CuratedEventAccessPort`가 event 도메인에 위임 (curated 직접 EventRepository 접근 금지)
- 제공자 earning 기록/환불: `CuratedProviderEarningPort`가 payment 도메인에 위임
- 검증형 정산 지급 승인: `CuratedProviderSettlementPort`가 payment 도메인에 위임 (마켓 `processCreatorSettlement` 신뢰형 직접호출 금지)

admin에는 프런트 화면은 아직 없지만 관리자 API가 존재한다. `MANAGE_PROVIDER_VERIFICATION(NR)` 권한으로
심사 큐·승인·거절·추가자료요청·상품 정지/해제를 수행하고, 원문 다운로드 URL은 별도
`MANAGE_PROVIDER_DOC_VIEW(NS)` 권한을 요구한다. 정산은 기존 `ManageCreatorEarning`과 머니플로우
트레이스를 공유한다.

## 5. 핵심 데이터·인프라

### 5.1 신규 테이블 12종 (V1__init.sql 통합, V2+ 금지)

| 테이블 | 책임 | 핵심 제약 |
|---|---|---|
| `service_assignment` | 배정 계약 생애주기 | `UNIQUE(event_id, provider_user_id)`, `@Version` 낙관락, owner=event_id 단독 |
| `service_assignment_charge` | 참가자 분담 coverage 행 | `UNIQUE(assignment_id, beneficiary_user_id, charge_order)`, `creator_earning_id` 1:1 FK |
| `service_assignment_prepayment` | 계약금/선납 | `engagement_id` FK, `status`(ServicePrepaymentStatus), `application_type`(PrepaymentApplicationType) |
| `service_assignment_refund` | 환불 audit | `UNIQUE(refund_transaction_id)`, `refund_type`(AssignmentRefundType) |
| `service_engagement` | 제공자 계약(약정) | `agreed_provider_fee`, `status`(ServiceEngagementStatus) |
| `service_assignment_terms` | 카탈로그 계약조건의 불변 버전 | 배정별 단조 증가 `version`, X/D, 제안자·만료·정책 스냅샷 |
| `service_assignment_terms_acceptance` | 조건 수락 증거 | 배정/버전/수락자 유일성, payload hash, fee policy/rate 스냅샷 |
| `provider_profile` | 제공자 공개 프로필·가시성·검증 상태 | 사업자번호 AES 암호화+HMAC 유일성, selfHidden/adminSuspended 분리 |
| `provider_verification_document` | 검증 제출 문서 | `PROVIDER_DOC` 완료 파일만, ACTIVE/SUPERSEDED 생애주기 |
| `provider_verification_history` | 검증 상태 감사 이력 | 제출·재제출·관리자 판정 append-only |
| `provider_offering` | 제공 상품 | 카테고리/가격모델/지역/상태, 콘텐츠 변경 시 version 증가 |
| `provider_offering_photo` | 상품 사진 | `OFFERING_PHOTO` 완료 파일, 순서 전체순열 검증 |

### 5.2 핵심 enum 19종

| Enum | 값 | 위치 |
|---|---|---|
| `AssignmentStatus` | DRAFT·ASSIGNED·ACCEPTED·DECLINED·CONFIRMED·SETTLEMENT_LOCKED·CANCELED (7) | `curated/constants/AssignmentStatus.java` |
| `AssignmentSource` | HOST_MANUAL·HOST_INVITE_ACCEPTED·PROVIDER_APPLY·ADMIN_ASSIGNED·CATALOG (5) | `curated/constants/AssignmentSource.java` |
| `FulfillmentStatus` | PENDING·IN_PROGRESS·FULFILLED·PARTIALLY_FULFILLED·NO_SHOW·DISPUTED (6) | `curated/constants/FulfillmentStatus.java` |
| `CoverageType` | SELF_PAID·FREE_EXCLUDED·HOST_SUBSIDIZED·NOSHOW_FORFEIT (4) | `curated/constants/CoverageType.java` |
| `ChargeOrigin` | PREPAID·POSTPAID (2) | `curated/constants/ChargeOrigin.java` |
| `AssignmentRefundType` | PARTIAL_HOST_ABSORBED·CLAWBACK (2) | `curated/constants/AssignmentRefundType.java` |
| `PrepaymentApplicationType` | APPLIED_TO_PROVIDER·FORFEIT_TO_PROVIDER (2) | `curated/constants/PrepaymentApplicationType.java` |
| `BulkSettleStatus` | SETTLED·ALREADY_SETTLED·NO_ASSIGNMENT·SKIPPED_NOT_READY·BLOCKED·FAILED (6) | `curated/constants/BulkSettleStatus.java` |
| `ServicePrepaymentMethod` | WALLET·BANK_TRANSFER (2) | `curated/constants/ServicePrepaymentMethod.java` |
| `ServicePrepaymentStatus` | PENDING·PAID·CANCELED (3) | `curated/constants/ServicePrepaymentStatus.java` |
| `ServiceEngagementStatus` | DRAFT·ACTIVE·CLOSED·CANCELED (4) | `curated/constants/ServiceEngagementStatus.java` |
| `ProviderType` | INDIVIDUAL·BUSINESS (2) | `provider/constants/ProviderType.java` |
| `ProviderVerificationStatus` | NONE·PENDING·NEEDS_MORE_INFO·VERIFIED·REJECTED (5) | `provider/constants/ProviderVerificationStatus.java` |
| `ProviderDocumentType` | BUSINESS_REG·TRANSPORT_LICENSE·INSURANCE·VENUE_RIGHT·OTHER (5) | `provider/constants/ProviderDocumentType.java` |
| `OfferingCategory` | VEHICLE·VENUE·LABOR·OTHER (4) | `provider/constants/OfferingCategory.java` |
| `OfferingPriceModel` | FIXED·PER_PERSON·PER_HOUR·PER_DAY·QUOTE (5) | `provider/constants/OfferingPriceModel.java` |
| `OfferingStatus` | DRAFT·ACTIVE·PAUSED·SUSPENDED·ARCHIVED (5) | `provider/constants/OfferingStatus.java` |
| `Sido` | SEOUL 등 17개 시·도 코드 | `provider/constants/Sido.java` |
| `VerificationHistoryAction` | SUBMITTED·RESUBMITTED·APPROVED·REJECTED·NEEDS_MORE_INFO (5) | `provider/constants/VerificationHistoryAction.java` |

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
| admin | 제공자 검증 큐/상세/판정/문서 presign, 상품 정지·해제 API 8개 + `ManageCreatorEarning`/머니플로우. 관리자 프런트는 아직 없음 |

## 7. 진행 상태 (2026-07-29 기준)

| Phase | 범위 | 상태 | Codex |
|---|---|---|---|
| P0 | 3개 포트/어댑터 설계 + 부패방지경계 | 완료 | ✅ PASS |
| F21-01 | 프로필·검증·상품 카탈로그·카탈로그 배정·버전형 계약조건·이행통계 + 기존 배정 상태머신 | 완료 | ✅ 실측 |
| F21-02 | 참가자 과금(PAID_ONLY + 멱등 + per-charge earning) + my-share N분의1 | 서버 완료·앱 상세값 축약 | ⚠️ 실측 |
| F21-03 | 완납 게이트(집합 동일성) + 보장모드 Σ검증 + 검증형 포트 승인 + 주간 배치 | 서버 완료·readiness/provider UI 공백 | ⚠️ 실측 |
| F21-04 | 무료초대(FREE_EXCLUDED) + 호스트 대납(HOST_SUBSIDIZED) | 생성 완료·undo/participant 검증 공백 | ⚠️ 실측 |
| F21-05 | 환불(전액/부분/clawback) + 경로별 멱등 계약 + 노쇼 forfeit | 서버 완료·앱 액션 구현 | ⚠️ 실측 |
| F21-06 | 계약금 선납(engagement) + applyDepositIfPresent + forfeitOnCancel | 직접 배정 완료·카탈로그 결제 CTA 단절 | ⚠️ 실측 |
| F21-07 | 정기모임 direct 일괄 배정·묶음 정산(BulkSettleStatus 6값) | 핵심 완료·DRAFT resume/bulk cancel 없음 | ⚠️ 실측 |
| Flutter | curated 5화면 + provider 7화면, 관련 라우트 13개 + API/Repository/Providers | 구현됨(아래 도달성 Gap 존재) | ⚠️ 실측 |
| 실측 HEAD | api `be38d128` · admin `e507ab9` · app `cb21bce8` | 완료 | — |

## 7-A. 접근권한 감사 교정 (2026-07-02)

> 감사 원본: `docs/audit/access-control-2026-06-30/categories/F21_curated.md`

- **제공자 배정·정산 화면 — 라우트/서버 권한 재확인(F21-01)**: `eventAssignments`,
  `eventAssignmentCreate`는 호스트/공동호스트 라우트 가드, `eventServiceFeeCharge`는 참가자 가드가 있다.
  `regularMeetingBulkSettle` 경로에는 현재 동일한 클라이언트 redirect가 없고 서버
  `assertRegularMeetingHost`가 최종 권한을 강제한다. 공개 API 49개 엔드포인트는 각 controller/service의
  호스트·참가자·제공자 본인·공개조회 경계를 따른다.
- **서비스료 총액 노출 — 서버 계약과 현재 앱 축약(D-F21-1)**: 서버 my-charge-status는
  `serviceFeeGross` 외에 `agreedGross`, `participantCap`, `chargeable`을 반환한다. 카탈로그 D>0이면
  실제 참가자 부담 권위는 `X-D`가 될 수 있다. Flutter 모델은 `agreedGross`/`participantCap`을 버리고,
  화면도 `chargeable`을 사용하지 않은 채 aggregate `myPaidAmount`와 `suggestedShare` 위주로 보여 준다.
  따라서 서버의 투명성 필드는 존재하지만 현재 앱이 이를 완전히 노출한다는 서술은 맞지 않는다.

## 8. 잔여 후속

기능 PRD의 미해소 행을 기준으로 한 `features.js` Risk 후보는 F21-01 6개,
F21-02 7개, F21-03 7개, F21-04 5개, F21-05 5개, F21-06 5개,
F21-07 6개로 도메인 합계 **41개**다. 아래 표는 같은 후보를 운영 주제 13개로
묶은 것이므로 행 수를 기능별 후보 합계로 해석하지 않는다.

| 항목 | 차단 사유 |
|---|---|
| F7 용역 세무 — 지급명세서 산출·사업자/개인 세율 구분 | **외부 차단**: PG·세무 계약 대기. 원천징수 3.3%·자료적재는 구현 완료 |
| 제공 가능 일정/충돌 검증 | 카탈로그 상세와 배정 생성에 일정 충돌 검사가 없다. 앱도 “가능 여부를 직접 조율”한다고 고지한다 |
| 알림 완결 | `PROVIDER_VERIFICATION_RESULT` 라우팅은 현재 `null`이고 관리자 판정 서비스도 결과 알림을 발행하지 않는다 |
| 관리자 상품 해제 재검증 | admin `unsuspend`는 SUSPENDED→ACTIVE만 수행하고 프로필 가시성·검증·사진 활성화 조건을 다시 검사하지 않는다 |
| 정기모임 계약 승계 | 카탈로그 계약의 다음 회차는 조건 v1만 복제하고 재수락이 필요하다. direct/unaccepted는 DRAFT로 생기지만 DRAFT 재개 API가 없다 |
| ProviderRole taxonomy 확정 | direct 배정은 현재 varchar(30) 자유 입력. 카탈로그는 미입력 시 카테고리 한글 표시명을 서버가 사용 |
| admin 제공자 관리 프런트 | 관리자 API 8개는 구현됐으나 이 워크스페이스에 대응 프런트 화면은 없다 |
| 배정 route-owner 불변 | confirm/cancel controller의 path `eventId`가 assignment의 실제 event와 같은지 확인하지 않는다. 서비스 권한은 실제 assignment event로 검사해 권한 상승은 막지만 route invariant는 비어 있다 |
| 참가자 과금 UI/계약 | 서버는 `chargeable`, `agreedGross`, `participantCap`과 X-D cap을 계산하지만 앱은 두 필드를 모델에서 버리고 aggregate만 표시한다. 첫 `charge-my-share`도 잔액이 아니라 full share다. cap 에러 payload·완납 알림도 없다 |
| 정산 readiness와 실제 settle 게이트 | readiness는 coverage 집합/보장합계만 미리 본다. 실제 settle은 회차 종료·상태·최신 terms·이행·earning·계약금까지 추가 검증한다. 앱 경고는 미납자를 이름/금액이 아닌 raw userId로 표시하고 provider 지급내역 UI도 없다 |
| 무료 제외·대납 변경성/검증 | 생성 endpoint만 있고 undo가 없다. beneficiary가 실제 event participant인지 free/subsidize 서비스에서 검증하지 않는다. 카탈로그 사전 terms 단계에는 앱 무료 CTA가 보이지만 서버는 offering 배정을 거부한다 |
| 환불 경제·멱등 | 부분환불은 참가자 복원액과 같은 금액을 호스트가 부담한다. PAID clawback은 gross가 아니라 원 provider net을 회수한다. Idempotency-Key는 partial-refund/clawback만 필수이며 refund/noshow에는 없다. 노쇼 전환 뒤에도 정산 전 전액환불은 가능하다 |
| 카탈로그 계약금 Flutter 단절 | D>0 terms 수락이 결제 전에 engagement를 만들지만 앱은 engagement가 있으면 계약금 CTA를 숨긴다. cancel API/Repository는 있으나 화면 CTA가 없다 |
| 정기모임 묶음 경계 | bulk 배정은 direct만 지원한다. direct/미수락 다음 회차 DRAFT는 resume API가 없고 bulk cancel endpoint도 없다. 묶음 결과는 회차를 raw eventId로 표시하며 SKIPPED는 미종료/미확정, BLOCKED는 돈·terms·이행 조치 항목이다 |

## 9. 관련 문서

- 과거 기준선(참고용): `.delta_2026-06-24_curated/00_dossier.md`
- F21-01 제공자 배정: `prd/02_feature_prds/21_curated/F21-01_provider-assignment_prd.md`
- F21-02 참가자 서비스비 분담 결제: `prd/02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md`
- F21-03 제공자 정산: `prd/02_feature_prds/21_curated/F21-03_provider-settlement_prd.md`
- 도메인 06 결제/지갑: `prd/01_domain_prds/06_결제_and_지갑_prd.md`
- 도메인 07 모임정산: `prd/01_domain_prds/07_모임_정산_prd.md`
- 도메인 17 정기모임: `prd/01_domain_prds/17_정기모임_prd.md`
- 머니플로우 감사: `docs/audit/money-flow-2026-06-12/REMEDIATION_STATUS.md`
- 로드맵 계획서: `docs/plan/curated/PAYMENT_COUPLING_ADVANCEMENT_PLAN.md`
