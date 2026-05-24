<!-- domain-source-first; updated: 2026-05-24; unit: mileage -->

# 16. 마일리지 PRD

> 문서 상태: **신규 도메인 source-first 작성본**. 이 문서는 `community_api/src/main/java/com/endside/community/mileage/` 전체(컨트롤러 6, 서비스 16, VO 18, param 19, enum 9, model 14)와 `community_app/lib/.../mileage/`(API 6, repository 6, provider 7, screen 22) 실제 소스를 대조해 작성했다. 기능 단위 판단은 아래 F16-01~08 기능 PRD에서 source 대조로 확정한다.

## 1. 결론

마일리지는 **클럽 단위의 비현금 포인트 프로그램**이다. 지갑(payment)과 분리된 별도 원장(`mileage_ledger`, append-only)에서 적립(EARN)·차감(REDEEM)·정정(REVERSE)·만료(EXPIRE)를 정수 포인트(`int`)로 기록한다. 현금화·환불 경로가 없으므로 등급 이름에 "원/캐시/포인트" 같은 금전성 단어를 서버가 차단한다(`MileageGradeService.FORBIDDEN_KEYWORDS`).

소비는 **FEFO(만료 임박분 우선)** 로 `mileage_ledger_consumption` 매핑을 만들고, 멤버별 집계는 `mileage_member_summary` 캐시(비관적 락 갱신)에 유지한다. 등급은 `qualifiedLifetimeEarned`(적립 누적 − REVERSE/EXPIRE된 EARN)가 등급 `threshold` 이상일 때 자동 산정되며, 등급 변경은 `mileage_audit_log`의 `MILEAGE_MEMBER_GRADE_CHANGED` 행으로만 추적된다(별도 grade_history 테이블 없음).

운영 권한은 클럽 권한 플래그로 분리된다 — 정책/메타 정의는 `POLICY_OWNER`, 적립/차감/정정·검토 큐·호스트 제안 처리는 `MILEAGE_MANAGER`. 적립/차감 action은 `Idempotency-Key` 헤더로 멱등 처리한다. 모든 쓰기 액션은 audit log + outbox(`DomainType.MILEAGE`) 이벤트를 남긴다.

서버는 6개 컨트롤러로 멤버 조회(8) · 시즌 조회(3) · 호스트 제안(2) · 운영 정책 CRUD(다수) · 운영 액션(8) · 운영 큐/대시보드/감사(다수)를 제공하고, Flutter는 멤버 화면 10여 개 + 운영 콘솔 11개 화면이 모두 라우터(`app_router.dart`)에 연결되어 있다. 다만 **운영 대시보드/멤버 상세/일괄 결과는 서버가 `Map<String,Object>`로 내려주는데 Flutter가 일부를 typed VO로 받아 파싱이 깨질 수 있는 정합성 Gap**이 있다(F16-08, F16-06). 시즌 랭킹 `basis` 파라미터도 문서/Flutter와 서버 enum 값이 불일치한다(F16-03).

이 도메인은 기능 PRD 8개로 구성된다. 결제·정산 도메인의 현금 흐름과 직접 연결되지 않는 독립 원장이지만, 적립 트리거는 이벤트(체크인/후기/사진 승인) 도메인과 호스트 제안 흐름은 이벤트 호스트 권한과 맞물린다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Backend 핵심 source | Frontend 핵심 source | 상태 | Risk 후보 |
|---|---|---|---|---|---|---:|
| F16-01 | 내 마일리지 메인 & 월간 영수증 & 원장 | [F16-01_my-mileage-main_prd.md](../02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md) | `MileageMemberController`, `MileageQueryService`, `MileageLedgerService` | `mileage_main_screen.dart`, `mileage_ledger_screen.dart`, `mileage_monthly_receipt_screen.dart` | 구현됨 | 3 |
| F16-02 | 등급·배지·랭킹·프로필 카드 | [F16-02_grade-badge-ranking_prd.md](../02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md) | `MileageMemberController`, `MileageGradeService`, `MileageBadgeService`, `MileageRankingQueryRepository` | `mileage_grade_list_screen.dart`, `mileage_badge_list_screen.dart`, `mileage_ranking_screen.dart`, `mileage_grade_history_screen.dart` | 구현됨 | 3 |
| F16-03 | 시즌 (목록·과거 랭킹·내 스냅샷) | [F16-03_season_prd.md](../02_feature_prds/16_mileage/F16-03_season_prd.md) | `MileageSeasonController`, `MileageSeasonService`, `MileageSeasonSnapshotQueryRepository` | `mileage_seasons_screen.dart`, `mileage_season_ranking_screen.dart` | 구현됨 (Gap: basis) | 4 |
| F16-04 | 마일리지 정책 설정 | [F16-04_policy-config_prd.md](../02_feature_prds/16_mileage/F16-04_policy-config_prd.md) | `MileageAdminPolicyController` (config), `MileageProgramConfigService` | `mileage_policy_screen.dart`, `mileage_config_preview_dialog.dart` | 구현됨 | 2 |
| F16-05 | 적립규칙·등급·배지·교환 프리셋 관리 | [F16-05_policy-presets_prd.md](../02_feature_prds/16_mileage/F16-05_policy-presets_prd.md) | `MileageAdminPolicyController` (CRUD), `MileageEarningRuleService`, `MileageGradeService`, `MileageBadgeService`, `MileageRedemptionPresetService` | `mileage_grade_crud_screen.dart`, `mileage_badge_crud_screen.dart`, `mileage_redemption_preset_crud_screen.dart` | 구현됨 | 3 |
| F16-06 | 적립/차감/정정 집행 | [F16-06_grant-redeem-reverse_prd.md](../02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md) | `MileageAdminActionController`, `MileageEarningService`, `MileageRedemptionService`, `MileageLedgerService`, `MileageBadgeService` | `mileage_action_screen.dart`, `mileage_batch_result_screen.dart`, `mileage_bulk_confirm_dialog.dart` | 구현됨 (Gap: batch type) | 5 |
| F16-07 | 호스트 제안 | [F16-07_host-proposal_prd.md](../02_feature_prds/16_mileage/F16-07_host-proposal_prd.md) | `MileageHostController`, `MileageAdminQueueController` (proposals), `MileageEarningService` | `mileage_host_proposal_screen.dart` | 구현됨 | 3 |
| F16-08 | 검토 큐 & 대시보드/감사로그 | [F16-08_review-queue-dashboard_prd.md](../02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md) | `MileageAdminQueueController`, `MileageReviewQueueService`, `MileageQueryService`, `MileageAuditService` | `mileage_console_screen.dart`, `mileage_queue_screen.dart`, `mileage_audit_log_screen.dart`, `mileage_member_detail_screen.dart` | 구현됨 (Gap: dashboard/detail type) | 5 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F16-06](../02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md) | 적립/차감/정정 집행 | 돈은 아니지만 원장·잔액·등급을 직접 바꾸는 핵심 쓰기 경로. 멱등성·부분 성공·일괄 결과 type Gap. Risk 5 |
| [F16-08](../02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md) | 검토 큐 & 대시보드/감사로그 | 대시보드/멤버 상세가 서버 `Map`인데 Flutter는 typed VO 수신 — 파싱 Gap. Risk 5 |
| [F16-03](../02_feature_prds/16_mileage/F16-03_season_prd.md) | 시즌 | `basis` 쿼리값(`BY_EARNED/BY_BALANCE` vs enum `BALANCE/LIFETIME_EARNED/SEASON_EARNED`) 불일치. Risk 4 |
| [F16-02](../02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md) | 등급·배지·랭킹 | 등급 이력이 audit log 파싱 의존, 랭킹 in-memory 집계 부분 존재. Risk 3 |
| [F16-05](../02_feature_prds/16_mileage/F16-05_policy-presets_prd.md) | 메타 정의 관리 | 등급 threshold 단조/중복·금전성 단어 차단이 단일 ErrorCode로 묶여 사용자 메시지 모호. Risk 3 |
| [F16-07](../02_feature_prds/16_mileage/F16-07_host-proposal_prd.md) | 호스트 제안 | 제안 경로(클럽+이벤트)와 처리 경로(admin queue)가 다른 권한·컨트롤러. Risk 3 |
| [F16-01](../02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md) | 내 마일리지 메인 | 메인/대시보드 일부가 `ledgerRepository.findAll()` in-memory 집계. Risk 3 |
| [F16-04](../02_feature_prds/16_mileage/F16-04_policy-config_prd.md) | 정책 설정 | 정책 OFF 시 적립/차감 전면 차단(`requireActive`). config preview dynamic 응답. Risk 2 |

## 4. 도메인 기능 목록

### 멤버 (클럽 멤버 본인 — `requireClubMember`)

#### F16-01. 내 마일리지 메인 & 월간 영수증 & 원장
> 멤버가 본인 현재 잔액·등급·최근 거래(메인), 월별 적립/차감/만료 요약(영수증), 필터 가능한 원장 페이지를 본다.
- **API**: `GET /api/v1/clubs/{clubId}/mileage/me` (`MemberMileageMainVo`), `GET /me/receipts/{year}/{month}` (`MileageMonthlyReceiptVo`), `GET /me/ledger` (`Page<MileageLedgerVo>`, `MileageLedgerSearchParam`)
- **핵심 enum**: `LedgerType{EARN,REDEEM,REVERSE,EXPIRE}`
- **포인트 타입**: 모든 잔액/적립/차감 필드는 `int` (BigDecimal 아님)

#### F16-02. 등급·배지·랭킹·프로필 카드
> 멤버가 등급 정의/본인 등급 변경 이력, 활성 배지 정의, 클럽 랭킹, 다른 멤버 프로필 카드를 본다.
- **API**: `GET /me/grade-history` (`List<MileageGradeChangeVo>`), `GET /ranking` (`Page<MileageRankingEntryVo>`, `MileageRankingSearchParam`), `GET /members/{memberId}/profile-card` (`MemberProfileCardVo`), `GET /grades` (`List<MileageGradeVo>`), `GET /badges` (`List<MileageBadgeDefinitionVo>`, active=true만)
- **핵심 enum**: `RankingBasis{BALANCE,LIFETIME_EARNED,SEASON_EARNED}`, `GradeChangeDirection{INITIAL,UP,DOWN}`

#### F16-03. 시즌 (목록·과거 랭킹·내 스냅샷)
> 멤버가 시즌 목록(상태 필터), 종료 시즌 스냅샷 기반 랭킹, 본인 시즌 스냅샷을 본다.
- **API**: `GET /mileage/seasons` (`List<MileageSeasonVo>`, `?status=`), `GET /seasons/{seasonId}/ranking` (`Page<MileageSeasonSnapshotVo>`), `GET /seasons/{seasonId}/me` (`MileageSeasonSnapshotVo` 또는 204)
- **핵심 enum**: `SeasonStatus{SCHEDULED,ACTIVE,CLOSED}`

### 호스트 (이벤트 호스트 — `isEventHost`)

#### F16-07. 호스트 제안 (제출/조회 + 운영 승인/반려)
> 이벤트 호스트가 자기 이벤트 참여 멤버에게 줄 적립 점수를 제안하고, 운영진이 검토 큐에서 승인(적립 실행)/반려한다.
- **호스트 API**: `POST /api/v1/clubs/{clubId}/events/{eventId}/mileage-proposals` (`MileageHostProposalVo`, 201), `GET` 동일 경로 (`List<MileageHostProposalVo>`)
- **운영 API**: `GET /admin/.../host-proposals` (`Page`), `POST /host-proposals/{id}/approve`, `/reject` (`MileageHostProposalProcessParam`)
- **핵심 enum**: `HostProposalStatus{SUBMITTED,APPROVED,REJECTED,NEEDS_MORE_INFO,WITHDRAWN}`

### 운영진 — 정책 (`POLICY_OWNER`)

#### F16-04. 마일리지 정책 설정
> 운영진이 프로그램 활성화·만료일·랭킹 기준·시즌 사용을 설정하고, 변경 영향을 미리 본다.
- **API**: `GET/PUT /admin/clubs/{clubId}/mileage/config` (`MileageProgramConfigVo` / `MileageProgramConfigModParam`), `GET /config/preview?changeType=&value=` (`Map<String,Object>`)
- **changeType**: `EXPIRY_DAYS`, `TRIGGER_OFF`, `GRADE_THRESHOLD`, `BIG_BATCH_BULK`

#### F16-05. 적립규칙·등급·배지·교환 프리셋 관리
> 운영진이 자동 적립 규칙, 등급(최대 10), 배지 정의(최대 50), 차감 프리셋을 CRUD 한다.
- **API**: `earning-rules`(GET/POST upsert/PUT), `grades`(GET/POST/PUT/DELETE), `badges`(GET/POST/PUT), `redemption-presets`(GET/POST/PUT/DELETE=비활성화), `seasons`(GET/POST/PUT/`/close`)
- **핵심 enum**: `EarningTriggerType{EVENT_CHECKIN,EVENT_REVIEW,EVENT_PHOTO_APPROVED}`
- **제약**: 등급 ≤10, threshold 단조·중복 금지·금전성 단어 차단(모두 `MILEAGE_GRADE_LIMIT_EXCEEDED`), 배지 ≤50, 프리셋 삭제 불가(비활성화만)

### 운영진 — 액션/큐 (`MILEAGE_MANAGER`)

#### F16-06. 적립/차감/정정 집행
> 운영진이 멤버에게 수동/일괄 적립, 차감, 원장 정정(reverse), 배지 부여/회수를 집행한다. `Idempotency-Key` 멱등 처리.
- **API**: `grants`, `grants/bulk`, `redemptions`, `redemptions/bulk` (모두 `GrantResultVo`), `ledger/{ledgerId}/reverse` (`MileageLedgerVo`), `badges/{badgeDefId}/awards` (`List<MileageBadgeAwardVo>`), `badge-awards/{awardId}` DELETE, `batches/{batchId}` GET (서버 `Map`)
- **핵심 enum**: `LedgerType`, `ActorRole{OWNER,ADMIN,EVENT_HOST,MEMBER,SYSTEM,PLATFORM_ADMIN}`
- **부분 성공**: 일괄 처리는 멤버별 row 단위 성공/실패(`GrantResultVo.Row.success/errorReason`)

#### F16-08. 검토 큐 & 대시보드/감사로그
> 운영진이 검토 큐 조회/처리, 운영 대시보드, 멤버 운영 상세, 멤버 등급 이력, 감사 로그를 본다.
- **API**: `queue`(GET 목록/`{id}` GET/`{id}/process` POST), `dashboard` GET(`Map`), `members/{memberId}` GET(`Map`), `members/{memberId}/grade-history` GET(`List`), `audit-logs` GET(`Page<MileageAuditLogVo>`)
- **핵심 enum**: `ReviewQueueType`(7값), `ReviewQueueStatus{OPEN,PROCESSED,IGNORED}`, `Decision{APPROVE,REJECT,IGNORE}`

## 5. 상태/권한/의존성

### 권한 모델 (서버 확인됨)

- **클럽 멤버 (member)**: 본인 마일리지/원장/영수증/등급/배지/랭킹/시즌 조회. `ClubMemberPermissionChecker.requireClubMember`로 검증. (F16-01~03)
- **이벤트 호스트 (EVENT_HOST)**: 자기 이벤트에 마일리지 적립 제안 제출/조회. `permissionChecker.isEventHost`. (F16-07 제출)
- **POLICY_OWNER**: 프로그램 설정·적립규칙·등급·배지정의·프리셋·시즌 CRUD. `@RequiresClubPermission(POLICY_OWNER)`. (F16-04, F16-05)
- **MILEAGE_MANAGER**: 적립/차감/정정/배지 부여·회수, 검토 큐 처리, 호스트 제안 승인/반려, 대시보드/감사 조회. `@RequiresClubPermission(MILEAGE_MANAGER)`. (F16-06, F16-07 처리, F16-08)
- **ActorRole 결정**: 운영 액션 컨트롤러는 `permissionChecker.isOwner(...) ? OWNER : ADMIN`으로 actorRole을 정해 audit log에 기록. 자동 적립은 `SYSTEM`, 호스트 제안 제출은 `EVENT_HOST`.

### 핵심 상태 모델

- **LedgerType**: `EARN(+)` / `REDEEM(-)` / `REVERSE(원 row 부호 반대)` / `EXPIRE(-)` — append-only, UNIQUE(club, member, sourceType, sourceId)로 멱등.
- **HostProposalStatus**: `SUBMITTED → APPROVED`(적립 실행) / `REJECTED`(사유 필수). `NEEDS_MORE_INFO`/`WITHDRAWN`은 enum에 존재하나 현재 전환 경로 미구현(Gap, F16-07).
- **SeasonStatus**: `SCHEDULED → ACTIVE → CLOSED`. close 시 다음 SCHEDULED(시작시각 도래)를 자동 ACTIVE 전환.
- **ReviewQueueStatus**: `OPEN → PROCESSED`(APPROVE/REJECT) / `IGNORED`(IGNORE).
- **GradeChangeDirection**: `INITIAL`(첫 도달) / `UP`(승급) / `DOWN`(REVERSE·EXPIRE로 강등).

### 횡단 의존

- **이벤트 도메인**: `EarningTriggerType`(체크인/후기/사진 승인) 자동 적립 트리거 — `triggerAutoEarn`. 단, **현재 mileage 패키지 내부에는 이 메서드를 호출하는 호출처가 없다**(이벤트 도메인 연동 여부는 F16-06 Gap에서 추적).
- **클럽 권한 시스템**: `ClubMemberPermissionChecker`, `ClubMemberPermissionFlag.{POLICY_OWNER,MILEAGE_MANAGER}`.
- **공통 인프라**: `ApiIdempotencyKeyService`(멱등), `DomainOutboxService`(`DomainType.MILEAGE` 이벤트), `MileageAuditService`(감사 로그), ShedLock 스케줄러(만료 배치).
- **결제/지갑 비연동**: 마일리지는 지갑·정산·AccountingLedger와 **연결되지 않는다**. 현금화/환불 경로 없음.

## 6. 화면/API 매핑

> 세부 판단은 위 실사 근거 맵의 8개 기능 PRD를 기준으로 확인한다. 멤버 화면(`presentation/mileage/screens/`)과 운영 콘솔(`presentation/mileage/admin/screens/`)은 모두 `core/router/app_router.dart`에 연결되어 있다(라우트 상수 `routes.dart` L64~103).

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F16-06](../02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md) | 적립/차감/정정 집행 | 5 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |
| [F16-08](../02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md) | 검토 큐 & 대시보드/감사로그 | 5 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |
| [F16-03](../02_feature_prds/16_mileage/F16-03_season_prd.md) | 시즌 | 4 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |
| [F16-02](../02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md) | 등급·배지·랭킹·프로필 카드 | 3 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |
| [F16-05](../02_feature_prds/16_mileage/F16-05_policy-presets_prd.md) | 메타 정의 관리 | 3 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |
| [F16-07](../02_feature_prds/16_mileage/F16-07_host-proposal_prd.md) | 호스트 제안 | 3 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |
| [F16-01](../02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md) | 내 마일리지 메인 & 영수증 & 원장 | 3 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |
| [F16-04](../02_feature_prds/16_mileage/F16-04_policy-config_prd.md) | 정책 설정 | 2 | 기능 PRD `Gap / Risk`에서 source 대조로 확정 |

## 8. 운영 방법

1. 마일리지 기능 착수 전 해당 기능 PRD의 `서버 계약`/`프론트 계약`/`정합성 판단`/`Gap / Risk`를 먼저 읽는다.
2. 포인트 필드는 모두 `int`다. Java `BigDecimal`이 아니므로 소수점 매핑 가드는 불필요하나, 절대 `double`로 만들지 않는다(서버와 type 불일치).
3. 운영 콘솔에서 서버가 `Map<String,Object>`로 내려주는 응답(dashboard, member detail, batch result, config preview)은 typed VO와 정합성 충돌이 있으므로 F16-06/F16-08의 Gap을 먼저 확인한다.
4. 도메인 정책(만료일·등급 임계·랭킹 기준·금전성 단어 정책)은 이 문서에서 확정하지 않는다. 기능 PRD의 Gap/Risk가 충돌하면 결정 항목으로 올린다.
