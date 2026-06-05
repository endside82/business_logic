# 18. 분쟁 해결 PRD

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/ -->

> 문서 상태: **신규 도메인 신설본**. 1차 자료는 `community_api/src/main/java/com/endside/community/host/dispute/` 및 `host/` 패키지 실제 소스 (엔티티 2종 · enum 8종 · 서비스 5종 · 컨트롤러 2종 · 엔드포인트 9개 · 스케줄러 2종), `community_app/lib/presentation/dispute/`, `lib/domain/providers/dispute/`, `lib/data/models/dispute/` 직접 확인 결과다.
>
> **도메인 경계**: 이 도메인은 여러 원천 도메인이 생산하는 분쟁·이의·신고를 **단일 read 창구로 통합**하는 Union Adapter 역할을 한다. 각 원천 도메인의 해결 권위는 여전히 해당 도메인 PRD가 canonical이다.
> - **F15-03** (클럽 경고 이의 `WarningAppeal`) — 15번 경고·징계 도메인이 canonical. 본 도메인은 `WARNING_APPEAL:{id}` union source로만 참조.
> - **F07-08** (모임 정산 이의 `MeetingSettlementAppeal`) — 07번 모임 정산 도메인이 canonical. 본 도메인은 `SETTLEMENT_APPEAL:{id}` union source로만 참조.
> - **F08-14** (플랜 마켓 구매 환불 분쟁 `PurchaseRefundDispute`) — 08번 플랜 마켓 도메인이 canonical. 본 도메인은 `REFUND_DISPUTE:{id}` union source로만 참조.

## 1. 결론

분쟁 해결 도메인은 기존 16개 도메인에 **흩어진 신고·이의·운영 이슈를 단일 통합 케이스 뷰**로 묶는 신규 경량 어댑터 도메인이다. 서버 `DisputeCaseQueryRepository`는 원천 도메인 테이블을 Java-side union으로 읽어 `caseId={prefix}:{sourceId}` 형태의 통합 식별자로 노출한다.

`DisputeSourceType` enum 21값은 케이스의 **컨텍스트 분류(sourceType 필드)** 용도이며, 실제 emit되는 caseId prefix 집합과 1:1 대응하지 않는다. 예: caseId prefix가 `OPERATIONAL_ISSUE`인 케이스의 sourceType은 PAYMENT/REFUND/SETTLEMENT 등으로 매핑된다(`mapOperationalSourceType`). `WARNING_REPORT`/`WARNING_APPEAL`/`SETTLEMENT_APPEAL`/`REFUND_DISPUTE` 등은 enum 값이 아니라 **caseId prefix**다.

실제 emit prefix 범위: 사용자 뷰(`searchByUser`) 7종(OPERATIONAL_ISSUE · WARNING_REPORT · WARNING_APPEAL · REPORT(CARPOOL 제외) · DATE_BLOCK · TRANSPORT · CLUB_MEMBERSHIP_ACTION) + USER_DISPUTE 양측(reporter+target). 호스트 뷰(`searchByHost`) 2종(SETTLEMENT_APPEAL · REFUND_DISPUTE). 미구현(out-of-scope): SETTLEMENT_APPEAL appealer 직접 finder 없음(사용자 뷰에서 미emit), PurchaseRefundDispute buyer finder 없음.

사용자 본인이 직접 생성하는 `USER_DISPUTE` source만이 `user_dispute_case` 테이블에 persistent하게 저장되며, 나머지 source는 기존 도메인 테이블을 union-read한다.

이의제기(`DisputeAppeal`)는 별도 `dispute_appeal` 테이블에 저장되고, `(case_id, appellant_user_id)` UNIQUE 제약으로 케이스당 본인 1건이 보장된다. 이의 상태 전이(UPHELD/REJECTED)는 admin API가 소유하며, 공개 API에서는 PENDING→CLOSED(철회)만 가능하다. `EVENT_NO_SHOW` source에 한해서만 원본 도메인 appeal 메커니즘과 best-effort sync가 이루어지며, 나머지 source는 audit-only다.

legal hold는 `DisputeLegalHoldService`가 OPEN/IN_REVIEW/ESCALATED 상태 케이스를 기준으로 판정하고, 계정 삭제·데이터 익명화를 차단한다. evidence는 케이스 종결(RESOLVED/CLOSED) + 1년 후 `DisputeCaseRetentionScheduler`가 정리한다.

5개 기능 PRD (F18-01~F18-05) 전체는 백엔드 커밋 `0eae1ed`(2026-05-29)와 `86356e5`·`e148309`(2026-06-02)에서 구현됐다. Flutter는 `c3bfdc8`·`f4109a0`·`95e0c5f`(2026-05-29~06-02)에서 배선됐다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | 핵심 소스 | 상태 | Trace |
|---|---|---|---|---|---:|
| F18-01 | 통합 분쟁 케이스 조회 | [F18-01_unified-dispute-case_prd.md](../02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md) | `DisputeCaseController#getMyCases,getHostCases,getMyCaseDetail`, `DisputeCaseQueryRepository`, `DisputeSlaExceededScheduler` | 구현됨 | 8 |
| F18-02 | 분쟁 직접 접수 (USER_DISPUTE) | [F18-02_dispute-create_prd.md](../02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md) | `DisputeCaseController#createMyDispute`, `DisputeCaseService#createUserDispute`, `UserDisputeCase`, `DisputeCaseCreateScreen` | 구현됨 | 6 |
| F18-03 | 분쟁 이의제기 (DisputeAppeal) | [F18-03_dispute-appeal_prd.md](../02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md) | `#createAppeal,getMyAppeals,withdrawAppeal`, `DisputeAppealService`, `dispute_appeal` 테이블, `AppealFormScreen` | 구현됨 | 7 |
| F18-04 | 증빙·공개범위·보존 | [F18-04_evidence-visibility_prd.md](../02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md) | `EvidenceFileValidator`, `Visibility`, `DisputeLegalHoldService`, `DisputeCaseRetentionScheduler`, `evidenceFrozen` | 구현됨 | 5 |
| F18-05 | 호스트 운영 인박스 | [F18-05_host-inbox_prd.md](../02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md) | `HostInboxController#getInbox,getStats`, `HostInboxService`, `HostInboxSourceType` 8종, `HostInboxScreen` | 구현됨 | 6 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F18-04](../02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md) | 증빙·공개범위·보존 | legal hold = 계정 삭제·데이터 익명화 차단 핵심. `evidenceFrozen` 케이스 레벨 잠금, 1년 retention policy |
| [F18-03](../02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md) | 분쟁 이의제기 | `DisputeAppealStatus` 4값 전이, EVENT_NO_SHOW best-effort sync, audit-only dispatcher 구조 이해 필수 |
| [F18-01](../02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md) | 통합 케이스 조회 | source union(사용자 8종·호스트 2종), caseId prefix 계약, UnifiedDisputeStatus 매핑, SLA 스케줄러 이해 기반 |
| [F18-02](../02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md) | 분쟁 직접 접수 | rate-limit·dedup 정책, admin 전이 소유 구조 파악 |
| [F18-05](../02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md) | 호스트 운영 인박스 | 8-source 통합, EVENT_MESSAGE 미응답 판정, DISPUTE_CASE 카드 경로 |

## 4. 도메인 책임 한도

본 도메인은 **원천 도메인 status를 변경하지 않는다.** union 조회와 `USER_DISPUTE` 생성·`DisputeAppeal` insert·철회만이 공개 API 범위다. UPHELD/REJECTED 전이, 개별 원천 도메인의 해결 처리(WarningLedger 조정, Settlement 재계산, 환불 실행 등)는 각자 도메인 또는 admin API가 소유한다.

단 `EVENT_NO_SHOW` source에서 이의제기 시 `EventNoShowService#appeal` 호출이 best-effort로 연동된다. 실패해도 `dispute_appeal` insert는 롤백되지 않는다.

## 5. 핵심 데이터·인프라

### 5.1 신규 테이블 2종 (V1__init.sql 통합)

| 테이블 | 책임 | 핵심 제약 |
|---|---|---|
| `dispute_appeal` | 통합 이의제기 side-table | `UNIQUE(case_id, appellant_user_id)`, `status DEFAULT 'PENDING'` |
| `user_dispute_case` | 사용자 자발적 분쟁 (⑤) | `active_dedup_key` GENERATED STORED UNIQUE, `CHECK(target_user_id IS NULL OR target_user_id <> reporter_user_id)`, FK NO CASCADE |

### 5.2 enum 8종

| Enum | 값 수 | 용도 |
|---|---|---|
| `DisputeSourceType` | 21 | 케이스 컨텍스트 분류(sourceType 필드)용. caseId prefix 집합과 1:1 대응 아님 |
| `DisputeCaseType` | 9 | 분쟁 유형 분류 |
| `UnifiedDisputeStatus` | 5 | 통합 상태 (OPEN/IN_REVIEW/RESOLVED/CLOSED/ESCALATED) |
| `DisputeAppealStatus` | 4 | 이의제기 상태 (PENDING/UPHELD/REJECTED/CLOSED) |
| `AuthorRole` | 6 | 타임라인/증빙 작성자 역할 |
| `Visibility` | 4 | 증빙·타임라인 공개범위 |
| `HostInboxSourceType` | 8 | 호스트 인박스 source 분기 |
| `HostInboxStatus` | 3 | 인박스 항목 처리 상태 |

### 5.3 스케줄러 2종

| 스케줄러 | cron (KST) | 책임 |
|---|---|---|
| `DisputeSlaExceededScheduler` | 06:00 매일 (Asia/Seoul), ShedLock 20분 | 7일 이상 미해결 케이스 운영자 알림 (8개 scanOne 호출 — OPERATIONAL_ISSUE·WARNING_REPORT·WARNING_APPEAL·SETTLEMENT_APPEAL·PUBLIC_REPORT·REFUND_DISPUTE·USER_DISPUTE·DISPUTE_APPEAL(PENDING) — 독립 격리) |
| `DisputeCaseRetentionScheduler` | 05:00 매일 | 종결(RESOLVED/CLOSED) + 1년 경과 케이스 evidence file_metadata 삭제 (7개 source) |

### 5.4 legal hold 불변

legal hold(OPEN/IN_REVIEW/ESCALATED) 케이스에 연관된 사용자의 계정 삭제·데이터 익명화는 `DisputeLegalHoldService.hasActiveLegalHold(userId)`가 차단한다. `evidenceFrozen=true` 케이스의 증빙 파일은 삭제 불가.

## 6. 도메인 외부 영향

| 도메인 | 영향 |
|---|---|
| 03 이벤트 | EVENT_NO_SHOW(appeal prefix, enum 미존재), TRANSPORT(CARPOOL report) union 포함. 노쇼 appeal best-effort sync. APPLICATION·ATTENDANCE·CHECK_IN·EVENT_RESCHEDULE은 DisputeSourceType enum에만 있고 현재 emit 안 됨 |
| 04 클럽 | CLUB_MEMBERSHIP_ACTION source union(KICK/BAN만, UNBAN 제외). WARNING_REPORT/WARNING_APPEAL은 경고·징계 도메인 소관 |
| 07 모임 정산 | SETTLEMENT_APPEAL caseId prefix union(호스트 뷰만). MeetingSettlementAppeal은 원본 endpoint에서 처리. ACTIVE 이후 생성분만 유입 — DRAFT 이의는 생성 자체가 차단(2026-06-05, DEC-V4) |
| 08 플랜 마켓 | REFUND_DISPUTE caseId prefix union(호스트 뷰·legal hold). PurchaseRefundDispute는 원본 endpoint에서 처리 |
| 09 프라이빗 데이팅 | DATE_BLOCK(reportId≠null 안전신고 동반 차단만) · TRANSPORT(CARPOOL report) union. DATE_CHAT·DATE_PROFILE_PHOTO는 enum에만 있고 emit 안 됨. legal hold 적용 |
| 11 리뷰·신고 | REPORT(EVENT type만, reporter), OPERATIONAL_ISSUE union. REVIEW·POST·COMMENT·PHOTO_ALBUM은 enum에만 있고 emit 안 됨 |
| 15 경고·징계 | WARNING_REPORT(reporter), WARNING_APPEAL(member) source union. WarningAppeal은 F15-03 canonical |
| 13 프로필·설정 | `AccountDeactivationService`: legal hold 활성 시 계정 삭제 차단 |

## 7. 진행 상태 (2026-06-04 기준)

| Phase | 범위 | 상태 | Codex |
|---|---|---|---|
| Wave A | DisputeSourceType enum 21값(분류용) 설계, caseId prefix 계약 | 완료 | ✅ sign-off |
| Wave B-1 | DisputeCaseController 9 endpoint, DisputeCaseQueryRepository | 완료 | ✅ sign-off |
| Wave B-2 | DisputeLegalHoldService, evidenceFrozen | 완료 | ✅ sign-off |
| Wave C-1 | HostInboxController + HostInboxService 8-source | 완료 | ✅ sign-off |
| Wave D-3 | DisputeAppeal side-table, EVENT_NO_SHOW sync, withdraw | 완료 | ✅ sign-off |
| ⑤ | USER_DISPUTE persistent source, POST /me/dispute-cases, rate-limit/dedup | 완료 | ✅ sign-off |
| Flutter | 7 화면 + providers + 37 라우트 + 모델 전체 | 완료 | — UI 영역 |
| RS-002 P3 | DATE_BLOCK·TRANSPORT·CLUB_MEMBERSHIP_ACTION 확장 | 완료 | ✅ sign-off |

## 8. 잔여 후속

| 항목 | 차단 사유 |
|---|---|
| dispute 딥링크 (NotificationRouter) | `notification_router.dart`에 신규 dispute 알림 타입 미배선 |
| appeal 승인/거절 공개 endpoint | 공개 API 미구현. 현재 admin API 소유만. `canApproveAppeal` flag는 있음 |
| evidence 첨부 업로드 UI (v2) | `DisputeCaseCreateScreen` v1에서 의도적 제외 |
| purchase_refund_dispute evidence cleanup | `evidence_file_group_id` 구조 — 단일 file_metadata 매핑과 달라 별도 file group cleanup 필요 |
| HostInboxService 성능 | `collectAllItems` size=500 전량 메모리 조회 |

## 9. 관련 문서

- 델타 실사: `.delta_2026-06-04/01_dispute_core.md`
- F15-03 (클럽 경고 이의): `prd/02_feature_prds/15_warning/F15-03_appeal_prd.md`
- F07-08 (모임 정산 이의): `prd/02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md`
- F08-14 (플랜 마켓 환불 분쟁): `prd/02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md`
