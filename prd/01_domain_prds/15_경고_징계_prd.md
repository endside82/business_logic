<!-- domain-source-first; updated: 2026-06-05; unit: warning -->

# 15. 경고 & 징계 PRD

> 문서 상태: **소스 우선 신규 작성본**. 이 문서는 `community_api/src/main/java/com/endside/community/warning/` 의 실제 컨트롤러 5개·서비스 11개·VO/Param·enum과 `community_app/lib/.../warning/` 의 API/Repository/Provider/Screen을 직접 대조해, 경고 도메인의 9개 기능 PRD를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

경고 & 징계는 **클럽 단위로 동작하는 자율 운영 신뢰 점수 시스템**이다. 멤버가 다른 멤버를 제보하거나(또는 이벤트 호스트가 출결 기반으로 제보), 운영진이 직접 점수를 부여하면 **append-only 원장(`warning_ledger`)** 에 GRANT row가 쌓이고, `warning_member_summary` 캐시가 `effective_score`/`review_level`을 재계산한다. 점수가 임계치를 넘으면 멤버는 검토 대상(`ATTENTION → MONITOR → RESTRICTION_CANDIDATE → SEVERE_SANCTION_CANDIDATE`)으로 분류되고, 운영진은 공지·이벤트 신청 제한·역할 제한·강제 탈퇴·수동 잠금의 6가지 제재를 집행한다. 멤버는 부여된 경고에 이의(`warning_appeal`)를 제기하고, 운영진은 인용(REVERSE)/부분 인용(MITIGATE)/기각으로 판정한다.

서버는 권한을 **클럽 permission flag** 로 격리한다. 멤버 화면은 `requireClubMember`, 정책 설정은 `POLICY_OWNER`, 검토/액션/큐는 `WARNING_REVIEWER`(OWNER 자동 통과), `FORCED_REMOVE`는 서비스 레이어에서 OWNER 단독으로 다시 검증한다. 모든 쓰기는 `warning_audit_log`(5년 보존)와 `domain_outbox`(WARNING 도메인 이벤트)를 같은 트랜잭션에 묶어 감사·알림 일관성을 보장한다. 원장은 `UNIQUE(club_id, member_id, source_type, source_id)`로 멱등이고, grant/forced-remove/bulk-expire는 `Idempotency-Key` 헤더를 추가 지원한다.

Flutter는 멤버용 7화면(메인/원장/제보 제출/내 제보/이의 제출/내 이의/호스트 출결 제보)과 운영진용 10화면(콘솔/정책/제보 검토함/제보 상세/이의 검토함/멤버 상세/제재/검토 대상/큐/감사 로그)을 모두 구현했고, enum 미러(`warning_enums.dart`)가 서버 enum과 1:1로 일치한다. 따라서 **조회·제출·운영진 워크플로의 화면-API 정합은 대체로 닫혀 있다**. 다만 (a) 정책 임계치 기본값이 Java 코드(3/6/10/15)와 DDL(1/3/5/7)에서 불일치, **(b) `FORCED_REMOVE` 제재의 실제 클럽 멤버십 제거 연결이 `WarningForcedRemoveEventListener` AFTER_COMMIT `kickMember`로 해소됨(커밋 `0eae1ed`, 2026-05-29)**, **(c) 만료 스케줄러 및 read-time 만료 필터가 활성화되어 해소됨(커밋 `9ba7cd8`, 2026-06-04)**, (d) 통계 화면이 서버의 `period` 파라미터를 전달하지 않음 등 **운영 신뢰성·정산성 Gap 일부가 남아 있다**. 추가로 플랫폼 전역 제재(`PlatformSanction`, 3종)가 신규 도입되어 클럽-스코프 제재를 보완한다(커밋 `0eae1ed`).

이 도메인은 기능 PRD 9개로 구성된다. 도메인 수준 판단은 아래 기능 PRD와 source trace를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | 상태 | Trace | Risk 후보 |
|---|---|---|---|---:|---:|
| F15-01 | F15-01. 내 경고 현황 & 원장 | [F15-01_warning-overview-ledger_prd.md](../02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md) | 소스 대조 완료 | 2 | 3 |
| F15-02 | F15-02. 신고 제출 & 내 신고 관리 | [F15-02_report-submit-manage_prd.md](../02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md) | 소스 대조 완료 | 3 | 5 |
| F15-03 | F15-03. 이의제기 (Appeal) | [F15-03_appeal_prd.md](../02_feature_prds/15_warning/F15-03_appeal_prd.md) | 소스 대조 완료 | 3 | 3 |
| F15-04 | F15-04. 경고 정책 & 패널티 유형 설정 | [F15-04_policy-penalty-types_prd.md](../02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md) | 소스 대조 완료 | 4 | 4 |
| F15-05 | F15-05. 신고 심사 | [F15-05_report-review_prd.md](../02_feature_prds/15_warning/F15-05_report-review_prd.md) | 소스 대조 완료 | 3 | 3 |
| F15-06 | F15-06. 경고 부여 & 원장 조정 | [F15-06_grant-ledger-adjust_prd.md](../02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md) | 소스 대조 완료 | 5 | 4 |
| F15-07 | F15-07. 이의제기 처리 | [F15-07_appeal-resolve_prd.md](../02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md) | 소스 대조 완료 | 3 | 3 |
| F15-08 | F15-08. 제재 집행 | [F15-08_sanction-enforcement_prd.md](../02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md) | 소스 대조 완료 | 4 | 5 |
| F15-09 | F15-09. 검토 큐 & 대시보드/통계/감사로그 | [F15-09_queue-dashboard-audit_prd.md](../02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md) | 소스 대조 완료 | 4 | 5 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F15-08](../02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md) | F15-08. 제재 집행 | ~~`FORCED_REMOVE`가 실제 멤버십 제거로 닫히지 않음~~ **해소됨(커밋 `0eae1ed`)**. ~~만료 스케줄러 미활성~~ **해소됨(커밋 `9ba7cd8`)**. 잔여: PlatformSanction listActiveByUser 미배선 / EVENT_HOST_RESTRICT 가드 미배선 / 구독 정리 미확인 |
| [F15-09](../02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md) | F15-09. 검토 큐 & 대시보드/통계 | 스케줄러 placeholder, 통계 period 미전달, 전체 ledger 메모리 집계 |
| [F15-02](../02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md) | F15-02. 신고 제출 & 내 신고 관리 | ~~익명 제보 차단 로직이 익명 reporter_user_id NULL 설계와 부분 충돌~~ **해소됨(커밋 `99b755e`)**. 잔여: 자가 제보 에러코드 모호 |
| [F15-06](../02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md) | F15-06. 경고 부여 & 원장 조정 | grant 일괄 처리 부분 성공 의미, 멱등 키와 원장 멱등 키 이중 구조 |
| [F15-04](../02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md) | F15-04. 경고 정책 & 패널티 유형 설정 | 임계치 기본값 Java/DDL 불일치, 대규모 클럽 분포 스킵 |
| [F15-01](../02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md) | F15-01. 내 경고 현황 & 원장 | 정책 비활성 클럽의 본인 화면 진입 시 자동 row 생성 |
| [F15-03](../02_feature_prds/15_warning/F15-03_appeal_prd.md) | F15-03. 이의제기 | 진행 중 1건 제한, 재제기 허용 추적 |
| [F15-05](../02_feature_prds/15_warning/F15-05_report-review_prd.md) | F15-05. 신고 심사 | claim → approve 2단계 호출, NEEDS_MORE_INFO 재검토 흐름 |
| [F15-07](../02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md) | F15-07. 이의제기 처리 | 인용=REVERSE/부분=MITIGATE 원장 연동, allow-resubmit 추적 |

## 4. 도메인 기능 목록

### 멤버 (본인 화면 / 제보 / 이의)

#### F15-01. 내 경고 현황 & 원장
> 멤버가 본인의 경고 점수·검토 등급·활성 제재·최근 원장을 보고, 원장 페이지로 전체 이력을 본다.
- **사용자**: 클럽 멤버 (본인)
- **API**: `GET /api/v1/clubs/{clubId}/warnings/me` → `WarningMemberOverviewVo`, `GET /api/v1/clubs/{clubId}/warnings/me/ledger` → `Page<WarningLedgerVo>`
- **권한**: `permissionChecker.requireClubMember`
- **프론트**: `warning/screens/warning_main_screen.dart`, `warning_ledger_screen.dart`, `warningMemberOverviewProvider`, `warningMyLedgerProvider`

#### F15-02. 신고 제출 & 내 신고 관리
> 멤버가 다른 멤버를 제보하고, 이벤트 호스트가 출결 연계 제보를 하며, 본인 제보 목록을 보고 미처리 제보를 철회한다.
- **사용자**: 클럽 멤버, 이벤트 호스트
- **API (멤버)**: `POST /warnings/reports`, `GET /warnings/me/reports`(List), `POST /warnings/reports/{reportId}/withdraw`
- **API (호스트)**: `POST /api/v1/clubs/{clubId}/events/{eventId}/warning-reports`, `GET .../warning-reports`(List) — `attendance_linkable=true` 유형만
- **권한**: 멤버=`requireClubMember`, 호스트=`isEventHost`
- **프론트**: `report_submit_screen.dart`, `host_report_submit_screen.dart`, `my_reports_screen.dart`

#### F15-03. 이의제기 (Appeal)
> 멤버가 본인에게 부여된 활성 GRANT에 대해 이의를 제기하고, 내 이의 목록을 보며, 진행 중 이의를 철회한다.
- **사용자**: 클럽 멤버 (본인 GRANT만)
- **API**: `POST /warnings/appeals`, `GET /warnings/me/appeals`(List), `POST /warnings/appeals/{appealId}/withdraw`
- **권한**: `requireClubMember` + 대상 GRANT 본인 소유 검증
- **프론트**: `appeal_submit_screen.dart`, `my_appeals_screen.dart`, `warning_appeal_dialog.dart`

### 운영진 (정책 / 심사 / 부여 / 이의 처리 / 제재 / 큐)

#### F15-04. 경고 정책 & 패널티 유형 설정
> POLICY_OWNER가 경고 제도 활성화, 익명 제보 허용, 검토 임계치 4단계, 패널티 유형 ON/OFF·점수를 설정하고 변경 영향을 미리 본다.
- **사용자**: `POLICY_OWNER` (OWNER 자동 통과)
- **API**: `GET/PUT /admin/clubs/{clubId}/warnings/config`, `GET /config/preview`, `GET/PUT /penalty-types`, `GET /penalty-type-catalog`
- **프론트**: `admin/warning_policy_screen.dart`

#### F15-05. 신고 심사
> WARNING_REVIEWER가 제보 검토함을 검색하고 승인(GRANT 부여)/반려/추가정보 요청을 한다.
- **사용자**: `WARNING_REVIEWER`
- **API**: `GET /reports`(Page), `POST /reports/{reportId}/approve|reject|request-more-info`
- **프론트**: `admin/warning_report_inbox_screen.dart`, `warning_report_detail_screen.dart`

#### F15-06. 경고 부여 & 원장 조정
> WARNING_REVIEWER가 점수를 직접 부여(단일/일괄)하고, 원장 항목을 경감/취소/만료하며, 일괄 만료(AMNESTY)를 집행한다.
- **사용자**: `WARNING_REVIEWER`
- **API**: `POST /grants`(Idempotency-Key, Map 응답), `POST /ledger/{ledgerId}/mitigate|reverse|expire`, `POST /ledger/bulk-expire`(Idempotency-Key, Map 응답)
- **프론트**: `admin/warning_member_detail_screen.dart`, `widgets/warning_reason_dialog.dart`

#### F15-07. 이의제기 처리
> WARNING_REVIEWER가 이의를 검색하고 인용(REVERSE)/부분 인용(MITIGATE)/기각으로 판정하며, 종결 이의의 재제기를 허용한다.
- **사용자**: `WARNING_REVIEWER`
- **API**: `GET /appeals`(Page), `POST /appeals/{appealId}/resolve`, `POST /appeals/{appealId}/allow-resubmit`
- **프론트**: `admin/warning_appeal_inbox_screen.dart`

#### F15-08. 제재 집행
> WARNING_REVIEWER(FORCED_REMOVE는 OWNER 단독)가 공지·이벤트 신청 제한·역할 제한·강제 탈퇴·수동 잠금/해제를 집행하고 제재를 철회한다.
- **사용자**: `WARNING_REVIEWER`, OWNER(FORCED_REMOVE)
- **API**: `POST /sanctions/notice|event-apply-restrict|role-restrict|forced-remove(Idempotency-Key)`, `POST /sanctions/{sanctionId}/revoke`, `POST /members/{memberId}/manual-lock|manual-unlock`
- **프론트**: `admin/warning_sanction_screen.dart`, `widgets/warning_forced_remove_dialog.dart`, `warning_sanction_action_row.dart`

#### F15-09. 검토 큐 & 대시보드/통계/감사로그
> WARNING_REVIEWER가 검토 큐를 처리하고, 대시보드/통계/검토 대상/멤버 상세/감사 로그를 본다.
- **사용자**: `WARNING_REVIEWER`
- **API**: `GET /queue`(Page), `GET /queue/{queueId}`, `POST /queue/{queueId}/process`, `GET /dashboard`, `GET /members/{memberId}`, `GET /review-targets`(Page), `GET /audit-logs`(Page), `GET /statistics`
- **프론트**: `admin/warning_console_screen.dart`, `warning_queue_screen.dart`, `warning_review_targets_screen.dart`, `warning_audit_log_screen.dart`

## 5. 상태/권한/의존성

### 권한 모델 (서버 확인됨)

- **멤버 (본인)**: `requireClubMember(clubId, userId)` — 본인 경고/원장 조회, 제보 제출/철회, 이의 제출/철회.
- **이벤트 호스트**: `isEventHost(eventId, userId)` — 출결 연계 제보만. `attendance_linkable=true` 패널티 유형으로 제한.
- **POLICY_OWNER**: `@RequiresClubPermission(POLICY_OWNER)` — 정책/패널티 유형 설정 (`WarningAdminPolicyController`). OWNER 자동 통과.
- **WARNING_REVIEWER**: `@RequiresClubPermission(WARNING_REVIEWER)` — 제보 심사/원장 조정/이의 처리/제재/큐 (`WarningAdminActionController`, `WarningAdminQueueController`). OWNER 자동 통과.
- **OWNER 단독**: `FORCED_REMOVE` 적용·철회는 `WarningSanctionService`가 actorRole==OWNER를 다시 검증 (`WARNING_SANCTION_OWNER_ONLY`).
- **SYSTEM**: 출결 자동 GRANT, 자동 종료/만료 (actor_id=0, actorRole=SYSTEM).

### 핵심 enum (서버 인용)

| enum | 값 |
|---|---|
| `WarningLedgerType` | `GRANT`, `MITIGATE`, `REVERSE`, `EXPIRE` |
| `WarningReportStatus` | `SUBMITTED`, `IN_REVIEW`, `NEEDS_MORE_INFO`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `WarningAppealStatus` | `SUBMITTED`, `IN_REVIEW`, `ACCEPTED`, `PARTIALLY_ACCEPTED`, `REJECTED`, `WITHDRAWN` |
| `WarningSanctionType` | `NOTICE`, `EVENT_APPLY_RESTRICT`, `ROLE_RESTRICT`, `FORCED_REMOVE`, `MANUAL_LOCK`, `MANUAL_UNLOCK` |
| `WarningSanctionStatus` | `ACTIVE`, `ENDED`, `REVOKED` |
| `WarningReviewLevel` | `NONE`, `ATTENTION`, `MONITOR`, `RESTRICTION_CANDIDATE`, `SEVERE_SANCTION_CANDIDATE` |
| `WarningReviewQueueType` | `HOST_PROPOSAL_REPORT`, `AUTO_REVERT_REVIEW`, `REPEATED_REPORT`, `BULK_POST_REVIEW`, `REVIEW_LEVEL_ABNORMAL`, `SANCTION_PROPOSAL`, `APPEAL_OVERDUE` |
| `WarningReviewQueueStatus` | `OPEN`, `PROCESSED`, `IGNORED` |
| `WarningActorRole` | `OWNER`, `ADMIN`, `EVENT_HOST`, `MEMBER`, `SYSTEM`, `PLATFORM_ADMIN` |
| `PenaltySeverity` | `LIGHT`, `MODERATE`, `SEVERE` |
| `PenaltyApprover` | `ADMIN`, `OWNER` |

### 점수 산정 (서버 `WarningMemberSummaryService` 확인)

- `raw_score` = 모든 GRANT points 합.
- `qualified_score` = REVERSE/EXPIRE 제외한 GRANT points 합.
- `effective_score` = qualified − 활성 MITIGATE 합 (음수면 0).
- `effective_count` = REVERSE/EXPIRE 제외 GRANT 개수.
- 무력화 우선순위: REVERSE/EXPIRE는 GRANT를 완전 제외, MITIGATE는 effective에서만 차감.
- `review_level` 평가: 활성 SEVERE GRANT가 있으면 무조건 `SEVERE_SANCTION_CANDIDATE`. 아니면 정책 임계치(`severe_min ≥ restriction_min ≥ monitor_min ≥ attention_min`) 기준 effective_score로 단계 결정. `manual_lock`이면 자동 등급 재평가를 건너뛴다(잠금 유지).

### 횡단 의존

- **클럽 권한**: `ClubMemberPermissionChecker` (`isOwner`/`isAdmin`/`isEventHost`/`getPermissionFlags`/`requireClubMember`).
- **이벤트 도메인**: 이벤트 신청 시 `EventApplyRestrictionGuard`(클럽-스코프 `WarningSanctionService.isApplyRestricted` + 플랫폼 전역 `PlatformSanctionService.isRestricted(EVENT_APPLY_RESTRICT)`) 2축 동시 검사. 17개 진입점에 적용(커밋 `c3f95a1`). 출결 이벤트(`LATE`/`SAME_DAY_CANCEL`/`NO_SHOW`/`REPEATED_CANCEL`)가 `autoGrantFromAttendance` 자동 GRANT 트리거.
- **플랫폼 전역 제재**: `PlatformSanction`(3종: `EVENT_APPLY_RESTRICT`/`EVENT_HOST_RESTRICT`/`DATE_PROFILE_BLOCK`) — 클럽 외부(개인 호스트 이벤트, 데이팅) 포함 플랫폼 전체에 적용. CS_ADMIN/SYSTEM 부과, 04:10 KST 만료 스케줄러(`PlatformSanctionExpiryScheduler`).
- **알림/통합**: 모든 쓰기가 `domain_outbox`(DomainType.WARNING)로 이벤트 발행 — 실제 FCM/알림 전환은 outbox consumer 책임(이 도메인 밖).
- **감사**: 모든 쓰기가 `warning_audit_log`(5년 보존, before/after JSON)에 기록.
- **멱등**: 원장 `UNIQUE(club_id, member_id, source_type, source_id)`; grant/forced-remove/bulk-expire는 `Idempotency-Key` 헤더(`ApiIdempotencyKeyService`).

## 6. Gap / Risk Rollup

| 기능 | 후보 수 | 대표 항목 |
|---|---:|---|
| [F15-08](../02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md) | 5 (P0·P1 해소, 잔여 P1×3+P2×3+P3×1) | ~~`FORCED_REMOVE` 멤버십 미연결~~ **해소**. ~~만료 스케줄러 미활성~~ **해소**. 잔여: `listActiveByUser` 공개 API 미배선, EVENT_HOST_RESTRICT 가드 미배선, PlatformSanction admin API 미확인 |
| [F15-09](../02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md) | 5 | 통계 `period` 미전달, 대시보드/통계 `findAll()` 전체 메모리 집계, 큐 enqueue 호출처 부재 가능성 |
| [F15-02](../02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md) | 5 (P1 해소, 잔여 P2×2+P3×2) | ~~익명 누적 반려율 익명 row 미탐지~~ **해소(커밋 `99b755e`)**. 잔여: 자가 제보/중복 에러코드 모호 |
| [F15-04](../02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md) | 4 | 임계치 기본값 Java(3/6/10/15) vs DDL(1/3/5/7) 불일치, 단조성 강제 안 함 |
| [F15-06](../02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md) | 4 | grant 일괄 부분 성공이 단일 트랜잭션 안 — 부분 성공 의미 모호 |
| [F15-01](../02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md) | 3 | 정책 비활성 클럽도 본인 화면 진입 시 summary row 생성 |
| [F15-03](../02_feature_prds/15_warning/F15-03_appeal_prd.md) | 3 | reason blank가 APPEAL_NOT_FOUND로 매핑 (오해 소지) |
| [F15-05](../02_feature_prds/15_warning/F15-05_report-review_prd.md) | 3 | claim/approve 2회 호출 사이 동시성, reason blank가 REPORT_NOT_FOUND로 매핑 |
| [F15-07](../02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md) | 3 | allow-resubmit가 DB 컬럼만 기록, 재제기 강제 가드 없음 |

## 7. 운영 방법

1. 새 구현/QA 착수 전 해당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한 매트릭스`, `Gap / Risk`를 먼저 읽는다.
2. PRD가 인용한 서버 source(controller/service/vo/enum/V1__init.sql)와 Flutter source(api/repository/provider/screen)를 열어 현재 코드와 일치하는지 확인한다.
3. `FORCED_REMOVE`의 멤버십 제거 연결, 스케줄러 전체 클럽 순회, 통계 period 전달은 도메인 차원의 결정 항목이므로, 구현 전 `05_planning_artifacts/decision_register.md`에 올린다.
4. 경고 점수는 돈이 아니지만 강제 탈퇴(유료 클럽 환불 연계 가능)·이벤트 신청 차단으로 사용자 피해가 크다. F15-08을 가장 먼저 닫는다.
