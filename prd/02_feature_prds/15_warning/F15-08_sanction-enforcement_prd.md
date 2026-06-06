# F15-08. 제재 집행 PRD

> 최종 갱신: 2026-06-06 (W14-S6 커밋 `6faa833` 반영 — EVENT_HOST_RESTRICT 가드 6경로 확장·DATE_PROFILE_BLOCK 실집행·`GET /api/v1/users/me/sanctions` 신설·PlatformSanction admin grant/revoke 배선 확인(R-8)·D-6 강퇴 구독 정리는 무코드 처분(통념 정정)). 이전: 2026-06-05 (`0eae1ed`/`9ba7cd8`/`c3f95a1` — FORCED_REMOVE 실효 해소, 만료 스케줄러 활성, read-time 필터, PlatformSanction 신규, EventApplyRestrictionGuard 신규)

## 1. 결론

제재 집행은 **클럽-스코프 제재**(`WarningSanction`, 6유형)와 **플랫폼 전역 제재**(`PlatformSanction`, 3유형) 두 축으로 구성된다. 클럽-스코프 제재는 `WARNING_REVIEWER` 권한으로 `WarningAdminActionController`가 `POST /sanctions/notice|event-apply-restrict|role-restrict|forced-remove`와 `POST /members/{memberId}/manual-lock|manual-unlock`으로 제공한다. 모두 `WarningSanctionService.apply`를 호출하며 reason 필수, `WarningSanction` row를 `ACTIVE`로 생성한다. `FORCED_REMOVE`는 서비스에서 actorRole==OWNER를 재검증하고, **`WarningForcedRemoveEventListener`(AFTER_COMMIT)가 `ClubMembershipService.kickMember`를 호출해 멤버십 제거+유료 가입비 환불+강퇴 알림까지 일괄 처리한다(P0 Gap 해소, 커밋 `0eae1ed`).** 제재 철회는 `POST /sanctions/{sanctionId}/revoke`. 만료 스케줄러는 매일 04:00 KST(`WarningSanctionExpiryScheduler`)에 활성 동작하며, `listActive`/`listActiveByMember`에 read-time 만료 필터가 추가되어 스케줄러 실행 전 ~24h 갭도 해소됐다(P1 Gap 해소, 커밋 `9ba7cd8`). 이벤트 신청 차단은 클럽-스코프와 플랫폼 전역 제재 2축 동시 검사가 17개 진입점에 적용된다(커밋 `c3f95a1`) — 16곳은 공통 `EventApplyRestrictionGuard` 경유, `ApplicationService.apply` 1곳은 동일 검사를 직접 호출. Flutter `warning_sanction_screen.dart`/`warning_forced_remove_dialog.dart`/`warning_sanction_action_row.dart`가 구현했다.

판정: **클럽-스코프 제재 생성·철회·잠금 토글·이벤트 신청 차단 연동의 정합은 닫혀 있다**. 2026-06-06(W14-S6)에 플랫폼 전역 제재의 집행 사각 3건이 추가로 닫혔다: (1) `EVENT_HOST_RESTRICT`가 일반 이벤트 생성에만 적용되던 것을 이벤트 생성 전 경로 6곳(클럽 이벤트·클럽 레거시 반복·정기모임 생성·정기모임 세션 3경로 단일관문·플랜 기반·일반 반복 자식)으로 확장(Codex가 우회 5경로 적발·전부 차단), (2) `DATE_PROFILE_BLOCK`을 데이팅 프로필 생성·활성 전환에서 실집행(`DATE_PROFILE_BLOCKED_BY_SANCTION` 403, 1600028 — 비활성화는 허용), (3) `GET /api/v1/users/me/sanctions`(`UserSanctionController`) 신설로 사용자가 본인 활성 전역 제재를 확인할 수 있다(축약 VO `UserPlatformSanctionVo` — 내부 처리자/철회 필드 미노출). 잔여 Risk는 (a) NOTICE/ROLE_RESTRICT의 실효(역할 변경/공지 발송)가 outbox consumer 위임이고, (b) **기활성 데이팅 프로필의 매칭 노출** — DATE_PROFILE_BLOCK 부여 시 프로필 신규 생성·활성 전환은 막지만 이미 활성인 프로필의 즉시 비활성화는 수행하지 않는다(W14-S6 신규 후속 — 후속 결정 대상). **(과거 Risk였던 "강퇴 후 유료 클럽 구독 정리 미확인"은 D-6 조사에서 허구로 정정됐다 — ClubSubscription은 오너 전용이라 멤버가 구독을 보유하는 구조 자체가 없고, 멤버 금전 결속(가입비)은 기존 전액 환불로 이미 완결. §8·§10 참조.)**

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningAdminActionController.java#applyNotice/applyEventRestrict/applyRoleRestrict/applyForcedRemove/revokeSanction/manualLock/manualUnlock` | 6유형, OWNER 전용 forced-remove, Idempotency-Key |
| Backend Service | `WarningSanctionService.java#apply/revoke/isApplyRestricted/listActive/listActiveByMember/closeExpiredSanctions` | OWNER 검증, manual_lock 토글, 만료 종료, 신청 차단 |
| Backend Service | `WarningMemberSummaryService#setManualLock` | manual_lock 즉시 반영 |
| Backend Param | `WarningSanctionAddParam`, `WarningSanctionRevokeParam` | `memberId@NotNull`, `sanctionType@NotNull`, `reason@NotBlank`, `startAt?`, `endAt?`, `relatedGrantLedgerIds?` |
| Backend VO | `WarningSanctionVo.java` | 응답 필드, status/actorRole |
| Backend Enum | `WarningSanctionType`(6값), `WarningSanctionStatus`(ACTIVE/ENDED/REVOKED), `WarningActorRole` | 유형/상태/역할 |
| Backend Error | `ErrorCode.java` | `WARNING_SANCTION_OWNER_ONLY`, `WARNING_SANCTION_NOT_FOUND`, `WARNING_REASON_REQUIRED` |
| Backend DDL | `V1__init.sql` `warning_sanction` | `start_at`/`end_at`/`status`/`related_grant_ledger_ids`, 인덱스 |
| Backend Scheduler | `warning/scheduler/WarningSanctionExpiryScheduler.java` | 만료 종료 스케줄러 04:00 KST 활성, ShedLock PT20M |
| Backend Scheduler | `warning/scheduler/PlatformSanctionExpiryScheduler.java` | 플랫폼 제재 만료 스케줄러 04:10 KST 활성, ShedLock PT20M |
| Backend Event Listener | `warning/event/WarningForcedRemoveEventListener.java` | AFTER_COMMIT 강퇴 집행, 실패 시 audit+WARN+OperatorAlert |
| Backend Service | `warning/service/EventApplyRestrictionGuard.java` | 클럽-스코프+플랫폼 전역 2축 통합 가드, 17개 진입점 (EVENT_APPLY 전용) |
| Backend Service | `warning/service/PlatformSanctionService.java` | 플랫폼 전역 제재 CRUD, `isRestricted`/`listActiveByUser`/`listActiveSelfByUser`(W14-S6)/`grant`/`revoke`/`closeExpiredSanctions` |
| Backend Controller (신규, W14-S6) | `warning/controller/UserSanctionController.java` | `GET /api/v1/users/me/sanctions` — 본인 활성 전역 제재 조회 |
| Backend VO (신규, W14-S6) | `warning/vo/UserPlatformSanctionVo.java` | 축약 VO (내부 처리자/철회 필드 미노출) |
| Backend (EVENT_HOST_RESTRICT 6경로, W14-S6) | `ClubEventService.java`·`ClubRecurringEventService.java`·`RecurringEventCreateService.java`·`PlanService.java`·`RegularMeetingService.java`(생성+세션 단일관문) | 이벤트 생성 전 경로 호스트 제한 가드 |
| Backend (DATE_PROFILE_BLOCK 집행, W14-S6) | `privatedate/service/DateProfileService.java` | 프로필 생성·활성 전환 차단 (`DATE_PROFILE_BLOCKED_BY_SANCTION` 1600028) |
| Frontend API | `warning_admin_action_api.dart#applyNotice/applyEventRestrict/applyRoleRestrict/applyForcedRemove/revokeSanction/manualLock/manualUnlock` | 경로/메서드/Idempotency-Key |
| Frontend Screen | `admin/warning_sanction_screen.dart`, `widgets/warning_forced_remove_dialog.dart`, `warning_sanction_action_row.dart` | 제재 집행 UI |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

1. WARNING_REVIEWER가 `sanction`(`Routes.adminWarningSanction`) → `WarningSanctionScreen` 또는 멤버 상세에서 제재 액션 행(`warning_sanction_action_row`) 진입.
2. 유형별 호출:
   - 공지: `POST /sanctions/notice`(`WarningSanctionAddParam`) → `apply` → NOTICE ACTIVE row.
   - 이벤트 신청 제한: `POST /sanctions/event-apply-restrict` → EVENT_APPLY_RESTRICT row(start/end).
   - 역할 제한: `POST /sanctions/role-restrict` → ROLE_RESTRICT row.
   - 강제 탈퇴: `POST /sanctions/forced-remove`(Idempotency-Key) → 서비스가 actorRole==OWNER 검증(`WARNING_SANCTION_OWNER_ONLY`) 후 FORCED_REMOVE row. **이후 `WarningForcedRemoveEvent` 발행 → AFTER_COMMIT 단계에서 `WarningForcedRemoveEventListener.on`이 `ClubMembershipService.kickMember(clubId, actorUserId, memberId, MEMBER_COMPLAINTS)`를 호출해 멤버 삭제+카운트 감소+유료 가입비 환불(RefundReason.KICKED)+강퇴 알림을 일괄 처리. 실패 시 audit `SANCTION_FORCED_REMOVE_FAILED` + WARN 로그 + OperatorAlert(LOG 채널).**
   - 수동 잠금: `POST /members/{memberId}/manual-lock` → 서버가 `sanctionType=MANUAL_LOCK` 강제 + `setManualLock(true)`.
   - 수동 해제: `POST /members/{memberId}/manual-unlock` → `sanctionType=MANUAL_UNLOCK` + `setManualLock(false)`.
3. `apply`: reason 필수(`WARNING_REASON_REQUIRED`), `startAt` 미지정 시 now, `relatedGrantLedgerIds` JSON 직렬화, ACTIVE 저장 → audit `SANCTION_APPLIED_{type}` + outbox `WarningSanctionApplied`.
4. 철회: `POST /sanctions/{sanctionId}/revoke`(`WarningSanctionRevokeParam`) → ACTIVE만(`WARNING_SANCTION_NOT_FOUND`), FORCED_REMOVE는 OWNER만 → `status=REVOKED`, MANUAL_LOCK 철회 시 unlock + outbox `WarningSanctionRevoked`.
5. **이벤트 신청 차단**: 클럽-스코프(`WarningSanctionService.isApplyRestricted`) + 플랫폼 전역(`PlatformSanctionService.isRestricted(EVENT_APPLY_RESTRICT)`) 2축 동시 검사가 17개 진입점에 적용 — 16곳은 `EventApplyRestrictionGuard` 경유, `ApplicationService.apply`는 직접 호출(상세는 §4-B 참조).
6. **만료 자동 종료**: `WarningSanctionExpiryScheduler` 매일 04:00 KST가 `closeExpiredSanctions(now)`를 호출해 `end_at ≤ now`인 ACTIVE 제재를 ENDED로 전이. `listActive`/`listActiveByMember`에도 read-time 필터 적용(스케줄러 실행 전 ~24h 갭 해소).

## 4. 서버 계약

### `POST /sanctions/notice|event-apply-restrict|role-restrict`
| 항목 | 실제 계약 |
|---|---|
| 권한 | `WARNING_REVIEWER` |
| Body | `WarningSanctionAddParam{memberId@NotNull, sanctionType@NotNull, reason@NotBlank@Size(4000), startAt?, endAt?, relatedGrantLedgerIds?}` |
| 처리 | `apply` → ACTIVE row, audit + outbox `WarningSanctionApplied` |
| 응답 | `WarningSanctionVo`, 201 CREATED |
| 실패 | reason blank → `WARNING_REASON_REQUIRED` |

### `POST /sanctions/forced-remove`
| 항목 | 실제 계약 |
|---|---|
| Header | `Idempotency-Key`(선택) |
| 권한 재검증 | 서비스가 actorRole==OWNER 아니면 `WARNING_SANCTION_OWNER_ONLY` |
| 후속 **(해소됨, 커밋 `0eae1ed`)** | `WarningForcedRemoveEventListener`(AFTER_COMMIT) → `ClubMembershipService.kickMember` → 멤버 삭제+카운트 감소+유료 가입비 환불(RefundReason.KICKED)+강퇴 알림. 실패 시 audit `SANCTION_FORCED_REMOVE_FAILED` + WARN 로그 + OperatorAlert(LOG 채널, idempotencyKey=`SANCTION_FORCED_REMOVE_FAILED:{sanctionId}`) |

### `POST /members/{memberId}/manual-lock` / `manual-unlock`
| 항목 | 실제 계약 |
|---|---|
| 강제 | 컨트롤러가 `sanctionType=MANUAL_LOCK`/`MANUAL_UNLOCK` 설정 |
| 부수 | `setManualLock(true/false)` → `warning_member_summary.manual_lock` 즉시 토글 |

### `POST /sanctions/{sanctionId}/revoke`
| 항목 | 실제 계약 |
|---|---|
| 조건 | ACTIVE만(아니면 `WARNING_SANCTION_NOT_FOUND`), FORCED_REMOVE 철회는 OWNER |
| 부수 | `status=REVOKED`, MANUAL_LOCK이면 unlock, outbox `WarningSanctionRevoked` |

### 내부: `closeExpiredSanctions(cutoff)` **(해소됨, 커밋 `9ba7cd8`)**
| 항목 | 실제 계약 |
|---|---|
| 동작 | `status=ACTIVE && end_at ≤ cutoff`를 ENDED로, audit `SANCTION_ENDED`(SYSTEM) |
| 호출처 | `WarningSanctionExpiryScheduler` — 매일 04:00 KST, ShedLock `lockAtMostFor=PT20M` 활성 동작 |

### 내부: `listActive(clubId)` / `listActiveByMember(clubId, memberId)` **(read-time 만료 필터 추가, 커밋 `9ba7cd8`)**
| 항목 | 실제 계약 |
|---|---|
| 필터 | `.filter(s -> s.getEndAt() == null \|\| s.getEndAt().isAfter(now))` |
| 경계 | `endAt == now`는 만료 처리 (가드 `isApplyRestricted`와 동일 경계) |
| 예약 제재 | `startAt > now`인 예약 제재는 필터하지 않음 — 운영진이 예약 제재 확인 가능 |

`WarningSanctionVo`: `id`, `clubId`, `memberId`, `sanctionType`, `actorId`, `actorRole`, `reason`, `startAt`, `endAt`, `status`, `revokedBy`, `revokedReason`, `revokedAt`, `relatedGrantLedgerIds`, `createdAt`.

---

## 4-A. PlatformSanction — 플랫폼 전역 제재 (신규, 커밋 `0eae1ed`)

### 개요
`WarningSanction`이 클럽-스코프(`club_id NOT NULL`)인 것과 달리, `PlatformSanction`은 `user_id` 단위의 플랫폼 전역 제재다. 클럽이 없는 개인 호스트 이벤트·데이팅 프로필 차단 등 클럽 외부에서도 작동한다.

| 항목 | WarningSanction | PlatformSanction |
|---|---|---|
| 스코프 | 클럽-스코프 (`club_id NOT NULL`) | 플랫폼 전역 (`user_id`만) |
| 유형 수 | 6종 | 3종 |
| 상태명 | ACTIVE / ENDED / REVOKED | ACTIVE / EXPIRED / REVOKED |
| 부과 주체 | OWNER/ADMIN/WARNING_REVIEWER | CS_ADMIN / SYSTEM |
| 만료 스케줄러 | `WarningSanctionExpiryScheduler` 04:00 KST | `PlatformSanctionExpiryScheduler` 04:10 KST |

### `platform_sanction` 테이블 (`V1__init.sql:4387-4408`)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | bigint PK AI | |
| `user_id` | bigint NOT NULL | FK→users |
| `sanction_type` | varchar(40) NOT NULL | PlatformSanctionType |
| `status` | varchar(20) NOT NULL | PlatformSanctionStatus |
| `granted_by_actor_id` | bigint NOT NULL | CS_ADMIN userId 또는 SYSTEM=0 |
| `granted_by_role` | varchar(20) NOT NULL | CS_ADMIN / SYSTEM |
| `reason_code` | varchar(40) NULL | |
| `reason` | text | 서비스에서 blank check |
| `effective_from` | datetime NOT NULL | 미래 예약 가능 |
| `expires_at` | datetime NULL | NULL = 영구 |
| `revoked_at` | datetime NULL | |
| `revoked_by_actor_id` | bigint NULL | |
| `revoked_reason` | text NULL | |
| `created_at`, `updated_at` | datetime NOT NULL | |

인덱스: `idx_platform_sanction_user_status(user_id, status, sanction_type)`, `idx_platform_sanction_expires(expires_at)`.

### Enum 전체값

**PlatformSanctionType** (`constants/PlatformSanctionType.java:20-23`)
| 값 | 설명 |
|---|---|
| `EVENT_APPLY_RESTRICT` | 모든 이벤트(클럽/비-클럽) 신청·참석 차단 (`EventApplyRestrictionGuard` 17 진입점) |
| `EVENT_HOST_RESTRICT` | 이벤트 생성(호스트 권한) 차단 — 일반 생성 + 클럽 이벤트·클럽 레거시 반복·정기모임 생성·정기모임 세션 3경로·플랜 기반·일반 반복 자식 6경로 집행(W14-S6) |
| `DATE_PROFILE_BLOCK` | 데이팅 프로필 게이팅 — 프로필 생성·활성 전환 차단(W14-S6, 1600028). 기활성 프로필 매칭 노출 비활성화는 후속 |

**PlatformSanctionStatus** (`constants/PlatformSanctionStatus.java:12-14`)
`ACTIVE` / `REVOKED` / `EXPIRED`

**PlatformSanctionActorRole** (`constants/PlatformSanctionActorRole.java:15-16`)
`CS_ADMIN` / `SYSTEM`

### `PlatformSanctionService` 주요 메서드 (`service/PlatformSanctionService.java:51-174`)
| 메서드 | 호출처 | 동작 |
|---|---|---|
| `isRestricted(userId, type, when)` | `EventApplyRestrictionGuard` (EVENT_APPLY) + `ClubEventService`/`ClubRecurringEventService`/`RecurringEventCreateService`/`PlanService`/`RegularMeetingService` (EVENT_HOST_RESTRICT, W14-S6) + `DateProfileService` (DATE_PROFILE_BLOCK, W14-S6) | ACTIVE & effectiveFrom ≤ when & (expiresAt IS NULL OR > when) → true |
| `listActiveByUser(userId)` | (full VO) | read-time 만료 필터 적용 (expiresAt IS NULL OR > now), 예약 제재 포함 |
| `listActiveSelfByUser(userId)` (신규, W14-S6) | `UserSanctionController` → `GET /api/v1/users/me/sanctions` | 본인 활성 전역 제재를 축약 VO(`UserPlatformSanctionVo`)로 반환 |
| `grant(actorUserId, actorRole, param)` | CS_ADMIN — **community_admin_api `PlatformSanctionAdminController` 배선됨(R-8): `POST /admin/v1/platform-sanctions`** | reason 필수, effectiveFrom 기본=now, ACTIVE 생성 |
| `revoke(sanctionId, actorUserId, param)` | CS_ADMIN — **community_admin_api `PlatformSanctionAdminController` 배선됨(R-8): `DELETE /admin/v1/platform-sanctions`** | ACTIVE만 REVOKED 전이. 비-ACTIVE → `PLATFORM_SANCTION_ALREADY_REVOKED` |
| `closeExpiredSanctions(cutoff)` | `PlatformSanctionExpiryScheduler` 04:10 KST | expiresAt ≤ cutoff ACTIVE → EXPIRED 일괄 전이 |

**listActiveByUser read-time 만료 필터 (`PlatformSanctionService.java:73-79`)**
```
.filter(s -> s.getExpiresAt() == null || s.getExpiresAt().isAfter(now))
```
- 경계: `expiresAt == now`는 만료 (가드 `isRestricted`와 동일)
- 예약 제재(`effectiveFrom > now`)는 필터하지 않음

`PlatformSanctionVo` 필드: `id, userId, sanctionType, status, grantedByActorId, grantedByRole, reasonCode, reason, effectiveFrom, expiresAt, revokedAt, revokedByActorId, revokedReason, createdAt, updatedAt`

---

## 4-B. EventApplyRestrictionGuard — 통합 제재 가드 (신규, 커밋 `c3f95a1`)

### 개요
`service/EventApplyRestrictionGuard.java`는 "신청·참석 전이가 일어나는 모든 진입점"에서 클럽-스코프 제재와 플랫폼 전역 제재를 동시에 검사하는 단일 컴포넌트다. **단, 이 가드는 `EVENT_APPLY_RESTRICT` 전용이다** — `EVENT_HOST_RESTRICT`(이벤트 생성 6경로)와 `DATE_PROFILE_BLOCK`(데이팅 프로필 생성·활성)은 이 가드가 아니라 각 생성 서비스에서 `PlatformSanctionService.isRestricted`를 직접 호출해 집행한다(W14-S6, §4-A 메서드표 참조).

```java
public void assertNotRestricted(Long clubId, long userId)  // throw 경로
public boolean isRestricted(Long clubId, long userId)      // boolean 경로(자동 skip 등)
```

**가드 로직** (`EventApplyRestrictionGuard.java:56-62`):
1. `clubId != null` → `WarningSanctionService.isApplyRestricted(clubId, userId, ref)` (클럽-스코프)
2. 항상 → `PlatformSanctionService.isRestricted(userId, EVENT_APPLY_RESTRICT, ref)` (플랫폼 전역)
3. 둘 중 하나라도 true → `assertNotRestricted`는 `USER_RESTRICTED_FROM_EVENT_APPLY`(403, 2900001) throw

### 진입점 17곳 전수 목록 (`dossier 02 §2-M`)

> 17곳 중 16곳은 `EventApplyRestrictionGuard`를 경유하고, `ApplicationService.apply` 1곳은 동일한 2축 검사를 두 서비스 직접 호출로 수행한다(검사 경계는 동일).
| 호출 위치 | 메서드 | 방식 | 소스:라인 |
|---|---|---|---|
| `ApplicationService.apply` | (Guard 미경유) `warningSanctionService.isApplyRestricted` + `platformSanctionService.isRestricted` 직접 인라인 호출 — 가드와 동일 2축·동일 경계 | throw | `ApplicationService.java:85-93` |
| `CapacityService.attend` | `assertNotRestricted` | throw | `CapacityService.java:93` |
| `CapacityService.createAttendanceFromApplication` | `assertNotRestricted` | throw | `CapacityService.java:380` |
| `CapacityService.confirmAttendanceFromPayment` | `assertNotRestricted` | throw | `CapacityService.java:479` |
| `WaitlistService.promoteToAttending` | `assertNotRestricted` | throw | `WaitlistService.java:101` |
| `WaitlistService.autoPromoteNextWaiting` | `isRestricted` | skip | `WaitlistService.java:161` |
| `WaitlistService.autoPromoteAll` | `isRestricted` | skip | `WaitlistService.java:230` |
| `ClubEventService.joinMember` | `assertNotRestricted` | throw | `ClubEventService.java:285` |
| `ClubEventService.autoEnrollAllMembers` | `isRestricted` | skip | `ClubEventService.java:572` |
| `ClubEventService.promoteWaitlist` | `isRestricted` | skip | `ClubEventService.java:662` |
| `EventPrepaymentService.pay` | `assertNotRestricted` | throw | `EventPrepaymentService.java:89` |
| `EventPrepaymentService.confirmFromExternalPay` | `isRestricted` | 분기 | `EventPrepaymentService.java:193` |
| `RegularMeetingEnrollmentService.enroll` | `assertNotRestricted` | throw | `RegularMeetingEnrollmentService.java:69` |
| `RegularMeetingEnrollmentService.approveEnrollment` | `assertNotRestricted` | throw | `RegularMeetingEnrollmentService.java:161` |
| `RegularMeetingEnrollmentService.autoPromoteNext` | `isRestricted` | skip | `RegularMeetingEnrollmentService.java:395` |
| `RegularMeetingPaymentService.pay` | `assertNotRestricted` | throw | `RegularMeetingPaymentService.java:65` |
| `RegularMeetingPaymentService.confirmFromExternal` | `isRestricted` | 분기 | `RegularMeetingPaymentService.java:122` |

※ `ApplicationService.approveApplication`은 Guard 미사용 — 호스트가 승인하는 경로. 참가자 제재 재검사는 `createAttendanceFromApplication`에서 수행.

---

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `sanction`(`Routes.adminWarningSanction`) + 멤버 상세 액션 |
| Screen | `WarningSanctionScreen`, `widgets/warning_forced_remove_dialog.dart`, `warning_sanction_action_row.dart` |
| Repository | `WarningAdminActionRepository` |
| Retrofit | `WarningAdminActionApi.applyNotice/applyEventRestrict/applyRoleRestrict/applyForcedRemove/revokeSanction/manualLock/manualUnlock` |
| 멱등 | forced-remove `@Header('Idempotency-Key')` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| WARNING_REVIEWER notice/restrict | `apply` | 제재 액션 | ACTIVE row | 일치 |
| ADMIN forced-remove | `WARNING_SANCTION_OWNER_ONLY` | 차단 | 권한 없음 | 일치 |
| OWNER forced-remove | actorRole==OWNER 통과 → AFTER_COMMIT kickMember | 다이얼로그 확정 | **FORCED_REMOVE row + 멤버십 제거 + 환불 (해소됨)** | **일치** |
| manual-lock | `setManualLock(true)` | 잠금 액션 | summary lock=true | 일치 |
| manual-unlock | `setManualLock(false)` | 해제 | lock=false | 일치 |
| ACTIVE 제재 철회 | `revoke` | 철회 | REVOKED | 일치 |
| ENDED/REVOKED 재철회 | `WARNING_SANCTION_NOT_FOUND` | 에러 | 차단 | 일치 |
| 이벤트 신청 시 클럽 EVENT_APPLY_RESTRICT | `isApplyRestricted=true` | (이벤트 도메인) | 신청 차단 | 일치 |
| 이벤트 신청 시 플랫폼 전역 EVENT_APPLY_RESTRICT | `PlatformSanctionService.isRestricted=true` | (EventApplyRestrictionGuard) | 신청 차단 | 일치 |
| 만료(end_at 지남) 제재 | `closeExpiredSanctions` + read-time 필터 | 양쪽 모두 만료 처리 | **만료 즉시 신청 차단 해제 (해소됨)** | **일치** |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `WarningSanctionType` | 6값 | enum 동일 | 일치 |
| `WarningSanctionStatus` | ACTIVE/ENDED/REVOKED | enum 동일 | 일치 |
| 제재 응답 형태 | `WarningSanctionVo` | VO | 일치 |
| forced-remove 권한 | 서비스 OWNER 재검증 | 다이얼로그는 UI 가드 | 일치(서버가 최종 가드) |
| manual-lock sanctionType | 컨트롤러 강제 설정 | Flutter param 전송 | 일치(서버가 덮어씀) |
| ~~forced-remove 실효 불일치~~ | **AFTER_COMMIT 리스너로 해소됨** (`0eae1ed`) | 화면은 성공 처리 | **일치** |
| ~~PlatformSanction 본인 조회 public controller~~ | **`UserSanctionController` 신설**(W14-S6) | endpoint 제공·앱 화면 후속 | **해소(endpoint)** |
| ~~PlatformSanction admin grant/revoke~~ | **community_admin_api `PlatformSanctionAdminController` 배선됨**(R-8) | admin SPA | **일치** |
| EVENT_HOST_RESTRICT/DATE_PROFILE_BLOCK 집행 | 6경로 + 데이팅 생성·활성 집행(W14-S6) | (서버 가드) | **일치** |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| ~~P0~~ **해소** | ~~`FORCED_REMOVE`가 멤버십 제거/환불로 연결 안 됨~~ | 커밋 `0eae1ed` (2026-05-29): `WarningForcedRemoveEventListener` AFTER_COMMIT `kickMember` 연동. 실패 시 audit+OperatorAlert | 해소됨 | — |
| ~~P1~~ **해소** | ~~만료 제재 자동 종료 스케줄러 미활성~~ | 커밋 `9ba7cd8` (2026-06-04): `WarningSanctionExpiryScheduler` 04:00 KST 활성 + read-time 만료 필터로 ~24h 갭도 해소 | 해소됨 | — |
| ~~P1~~ **해소(W14-S6, `6faa833`)** | ~~`listActiveByUser` 공개 API 컨트롤러 없음~~ | `UserSanctionController` → `GET /api/v1/users/me/sanctions`가 `listActiveSelfByUser`를 노출(축약 VO `UserPlatformSanctionVo`). | 사용자가 본인 활성 전역 제재를 앱에서 조회 가능(endpoint 제공, 앱 화면은 후속). | 완료(endpoint) |
| ~~P1~~ **해소(R-8)** | ~~`grant`/`revoke` 공개 API 없음~~ | community_admin_api `PlatformSanctionAdminController`(`POST`/`DELETE`/`GET /admin/v1/platform-sanctions`)에 배선됨 — 2026-06-06 실측 확인. | CS가 admin SPA로 플랫폼 제재 부과/철회 가능. | 완료 |
| ~~P1~~ **해소(W14-S6, `6faa833`)** | ~~`EVENT_HOST_RESTRICT`/`DATE_PROFILE_BLOCK` 가드 미배선~~ | `EVENT_HOST_RESTRICT`를 이벤트 생성 6경로(클럽 이벤트·클럽 레거시 반복·정기모임 생성·정기모임 세션 3경로 단일관문·플랜 기반·일반 반복 자식)에, `DATE_PROFILE_BLOCK`을 데이팅 프로필 생성·활성 전환(1600028)에 집행. | 부과 시 실집행. | 완료 |
| P1 | NOTICE/ROLE_RESTRICT 실효가 outbox consumer 위임 | `apply`는 row만, 실제 공지 발송/역할 변경은 이 도메인 밖 | outbox consumer 미동작 시 제재가 "기록만 되고 효력 없음" | consumer 동작 보장 + ROLE_RESTRICT 권한 flag 반영 검증 |
| P2 (신규, W14-S6) | **기활성 데이팅 프로필의 매칭 노출** | `DATE_PROFILE_BLOCK` 부여 시 `DateProfileService`는 프로필 신규 생성·활성 전환만 차단하고, 이미 활성인 프로필의 즉시 비활성화는 수행하지 않는다. | 제재 부여 시점에 이미 활성이던 프로필이 계속 매칭에 노출될 수 있음. | 후속 결정 — 제재 부여 시 활성 프로필 비활성화 여부·매칭 필터 지점 결정. |
| P2 | `autoCloseStaleReports` 더미 쿼리 잔존 | `autoCloseStaleReports()` 내 `findByClubIdAndStatus(0L, pending)` — clubId=0L 더미. 주석 "실제 QueryRepository 확장 필요" | 14일 미응답 자동 종료 스케줄러 실질 미작동 | 전체 클럽 순회 QueryRepository 구현 |
| ~~P2~~ **허구로 정정(D-6, W14-S6)** | ~~`FORCED_REMOVE` 강퇴 후 유료 클럽 구독 정리 미확인~~ | D-6 조사: `ClubSubscription`은 **오너 전용**(전 writer가 ownerId 기준, 오너는 강퇴 원천 차단)이라 멤버가 구독을 보유하는 구조 자체가 없다. 멤버 금전 결속(가입비)은 `kickMember`의 기존 전액 환불(`RefundReason.KICKED`)로 이미 완결. "강퇴 시 구독 정리" 통념은 대상 부재. | 정리할 멤버 구독이 존재하지 않음. | 무코드 처분 — 통념 폐기 |
| P2 | `relatedGrantLedgerIds` 수동 직렬화 | `serializeIdList`가 문자열 JSON 빌드 | 잘못된 입력 시 깨진 JSON 가능성 | Jackson 직렬화로 통일 검토 |
| P3 | `listActive`/`listActiveByMember`가 예약 제재 포함 | read-time 필터에서 `endAt` 만료는 걸러내지만 `startAt > now`인 예약 제재는 의도적으로 유지 | 앱에서 예약 제재를 "활성"으로 표시할 수 있음 | 운영진 화면에서 예약/현재 구분 UI 필요 |

## 9. 수용 기준

### AC-01. 이벤트 신청 제한 적용 + 차단 연동
Given WARNING_REVIEWER가 멤버에게 EVENT_APPLY_RESTRICT를 적용한다.
When 그 멤버가 이벤트 신청을 시도한다.
Then `isApplyRestricted`가 true를 반환해 신청이 차단된다.

### AC-02. 강제 탈퇴 OWNER 전용
Given ADMIN(비OWNER)이 `forced-remove`를 호출한다.
When 요청이 도착한다.
Then 서버는 `WARNING_SANCTION_OWNER_ONLY`로 거절한다.

### AC-03. 강제 탈퇴 멤버십 제거 **(해소됨, 커밋 `0eae1ed`)**
Given OWNER가 멤버를 강제 탈퇴시킨다.
When `forced-remove`가 성공(FORCED_REMOVE row 커밋 완료)한다.
Then `WarningForcedRemoveEventListener`(AFTER_COMMIT)가 `ClubMembershipService.kickMember`를 호출해 멤버십 제거+유료 가입비 환불(`RefundReason.KICKED`)+강퇴 알림이 일어난다.
실패 시 audit `SANCTION_FORCED_REMOVE_FAILED` + WARN 로그 + OperatorAlert(LOG 채널)가 발화되며 제재 row는 유지된다.

### AC-03-B. 플랫폼 전역 EVENT_APPLY_RESTRICT 차단
Given CS_ADMIN이 특정 사용자에게 PlatformSanction EVENT_APPLY_RESTRICT를 부과한다.
When 그 사용자가 클럽/비-클럽 이벤트를 신청한다.
Then `EventApplyRestrictionGuard.assertNotRestricted`가 `USER_RESTRICTED_FROM_EVENT_APPLY`(403)를 throw해 신청이 차단된다.

### AC-03-C. EVENT_HOST_RESTRICT 6경로 차단 **(W14-S6)**
Given 사용자에게 `EVENT_HOST_RESTRICT`가 부과돼 있다.
When 그 사용자가 클럽 이벤트·클럽 레거시 반복·정기모임 생성/세션·플랜 기반·일반 반복 자식 중 어느 경로로든 이벤트를 생성하려 한다.
Then 각 생성 서비스가 `PlatformSanctionService.isRestricted(...EVENT_HOST_RESTRICT...)`로 차단한다(일반 생성 가드와 동일 동작).

### AC-03-D. DATE_PROFILE_BLOCK 생성·활성 차단 **(W14-S6)**
Given 사용자에게 `DATE_PROFILE_BLOCK`이 부과돼 있다.
When 그 사용자가 데이팅 프로필을 생성하거나 비활성 프로필을 활성으로 전환하려 한다.
Then `DateProfileService`가 `DATE_PROFILE_BLOCKED_BY_SANCTION`(403, 1600028)으로 거부한다. (단, 프로필 비활성화는 허용. 이미 활성인 프로필의 즉시 비활성화는 미수행 — §8 P2 후속.)

### AC-03-E. 본인 전역 제재 조회 **(W14-S6)**
Given 사용자에게 활성 PlatformSanction이 1건 이상 있다.
When `GET /api/v1/users/me/sanctions`를 호출한다.
Then 본인 활성 전역 제재가 축약 VO(`UserPlatformSanctionVo` — 내부 처리자/철회 필드 미노출)로 반환된다.

### AC-04. 수동 잠금 토글
Given WARNING_REVIEWER가 멤버를 manual-lock한다.
When `POST /members/{memberId}/manual-lock`이 호출된다.
Then `warning_member_summary.manual_lock=true`가 되고 자동 등급 재평가가 잠긴다.

### AC-05. 제재 철회
Given ACTIVE 제재를 철회한다.
When `POST /sanctions/{sanctionId}/revoke`가 호출된다.
Then `status=REVOKED`가 되고 MANUAL_LOCK이면 잠금이 해제된다.

### AC-06. 만료 제재 자동 종료 **(해소됨, 커밋 `9ba7cd8`)**
Given 기한부 제재의 `end_at`이 지났다.
When `WarningSanctionExpiryScheduler`(04:00 KST)가 실행되거나 `listActive`가 호출된다.
Then read-time 필터(`endAt.isAfter(now)` 실패)로 만료 제재가 목록에서 제외되고, 스케줄러 실행 후 ENDED 상태로 전이된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| ~~구현(P0)~~ **완료** | ~~강제 탈퇴 실효~~ | 커밋 `0eae1ed` 해소. `WarningForcedRemoveEventListener` AFTER_COMMIT `kickMember`. |
| ~~구현~~ **완료** | ~~만료 자동 종료 스케줄러~~ | 커밋 `9ba7cd8` 해소. `WarningSanctionExpiryScheduler` 04:00 KST 활성 + read-time 필터. |
| ~~구현(P1)~~ **완료(W14-S6)** | ~~`listActiveByUser` 공개 API 배선~~ | `GET /api/v1/users/me/sanctions`(`UserSanctionController`) 신설. 앱 화면(내 이용 제한 내역)은 후속. |
| ~~구현(P1)~~ **완료(W14-S6)** | ~~`EVENT_HOST_RESTRICT`/`DATE_PROFILE_BLOCK` 가드~~ | EVENT_HOST_RESTRICT 6경로 + DATE_PROFILE_BLOCK 생성·활성 집행. |
| ~~구현(P1)~~ **완료(R-8)** | ~~community_admin_api PlatformSanction 배선~~ | `PlatformSanctionAdminController` 배선 확인(2026-06-06 실측). |
| ~~구현~~ **무코드 처분(D-6)** | ~~FORCED_REMOVE 구독 정리~~ | ClubSubscription 오너 전용 → 멤버 구독 부재. 가입비는 기존 전액 환불로 완결. 통념 폐기. |
| 후속(P2, W14-S6 신규) | 기활성 데이팅 프로필 매칭 노출 | DATE_PROFILE_BLOCK 부여 시 이미 활성인 프로필 비활성화 여부·매칭 필터 지점 결정. |
| 후속(P2) | 내 이용 제한 내역 앱 화면 | `me/sanctions` endpoint 소비 화면 구현(`15-warning.html` 조회 경로 문구 갱신 대상). |
| 구현 | NOTICE/ROLE_RESTRICT 실효 | outbox consumer 동작 + 권한 flag 반영 검증 |
| 테스트 | 제재 | EVENT_APPLY_RESTRICT 클럽/전역 신청 차단 / EVENT_HOST_RESTRICT 6경로 / DATE_PROFILE_BLOCK 생성·활성 / forced-remove OWNER 가드 + AFTER_COMMIT kickMember / 만료 read-time 필터 / 철회 E2E |
