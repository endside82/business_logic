# F15-08. 제재 집행 PRD

## 1. 결론

제재 집행은 `WARNING_REVIEWER` 권한으로 `WarningAdminActionController`가 6가지 제재 유형을 제공한다: `POST /sanctions/notice`(공지/주의), `/event-apply-restrict`(이벤트 신청 제한), `/role-restrict`(역할 제한), `/forced-remove`(강제 탈퇴, **OWNER 단독**, Idempotency-Key 지원), 그리고 `POST /members/{memberId}/manual-lock`·`/manual-unlock`(수동 잠금/해제). 모두 `WarningSanctionService.apply`를 호출하며 reason 필수, `WarningSanction` row를 `ACTIVE`로 생성한다. `FORCED_REMOVE`는 서비스에서 actorRole==OWNER를 재검증하고(`WARNING_SANCTION_OWNER_ONLY`), `MANUAL_LOCK/UNLOCK`은 `warning_member_summary.manual_lock`을 즉시 토글한다. 제재 철회는 `POST /sanctions/{sanctionId}/revoke`(ACTIVE만, FORCED_REMOVE 철회도 OWNER). 이벤트 도메인은 `isApplyRestricted`로 활성 EVENT_APPLY_RESTRICT를 신청 차단에 사용한다. Flutter `warning_sanction_screen.dart`/`warning_forced_remove_dialog.dart`/`warning_sanction_action_row.dart`가 구현했다.

판정: **제재 생성·철회·잠금 토글·이벤트 신청 차단 연동의 정합은 닫혀 있다**. 그러나 이 기능의 핵심 Risk는 (a) `FORCED_REMOVE`가 `WarningSanction` row INSERT + outbox 발행만 하고 **실제 클럽 멤버십 제거·유료 클럽 환불·구독 정리로 연결되지 않음**(서비스 주석도 "별도 클럽 서비스 후속 처리 필요"라고 인정), (b) 만료된 제재를 ENDED로 닫는 `closeExpiredSanctions`가 스케줄러 활성화 없이 호출 메서드만 존재, (c) NOTICE/ROLE_RESTRICT의 실효(역할 변경/공지 발송)가 outbox consumer 책임으로 위임되어 이 도메인 안에서 닫히지 않는 점이다.

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
| Backend Scheduler | `warning/scheduler/` 디렉터리 | 만료 종료 스케줄러 존재 여부 |
| Frontend API | `warning_admin_action_api.dart#applyNotice/applyEventRestrict/applyRoleRestrict/applyForcedRemove/revokeSanction/manualLock/manualUnlock` | 경로/메서드/Idempotency-Key |
| Frontend Screen | `admin/warning_sanction_screen.dart`, `widgets/warning_forced_remove_dialog.dart`, `warning_sanction_action_row.dart` | 제재 집행 UI |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

1. WARNING_REVIEWER가 `sanction`(`Routes.adminWarningSanction`) → `WarningSanctionScreen` 또는 멤버 상세에서 제재 액션 행(`warning_sanction_action_row`) 진입.
2. 유형별 호출:
   - 공지: `POST /sanctions/notice`(`WarningSanctionAddParam`) → `apply` → NOTICE ACTIVE row.
   - 이벤트 신청 제한: `POST /sanctions/event-apply-restrict` → EVENT_APPLY_RESTRICT row(start/end).
   - 역할 제한: `POST /sanctions/role-restrict` → ROLE_RESTRICT row.
   - 강제 탈퇴: `POST /sanctions/forced-remove`(Idempotency-Key) → 서비스가 actorRole==OWNER 검증(`WARNING_SANCTION_OWNER_ONLY`) 후 FORCED_REMOVE row.
   - 수동 잠금: `POST /members/{memberId}/manual-lock` → 서버가 `sanctionType=MANUAL_LOCK` 강제 + `setManualLock(true)`.
   - 수동 해제: `POST /members/{memberId}/manual-unlock` → `sanctionType=MANUAL_UNLOCK` + `setManualLock(false)`.
3. `apply`: reason 필수(`WARNING_REASON_REQUIRED`), `startAt` 미지정 시 now, `relatedGrantLedgerIds` JSON 직렬화, ACTIVE 저장 → audit `SANCTION_APPLIED_{type}` + outbox `WarningSanctionApplied`.
4. 철회: `POST /sanctions/{sanctionId}/revoke`(`WarningSanctionRevokeParam`) → ACTIVE만(`WARNING_SANCTION_NOT_FOUND`), FORCED_REMOVE는 OWNER만 → `status=REVOKED`, MANUAL_LOCK 철회 시 unlock + outbox `WarningSanctionRevoked`.
5. 이벤트 도메인이 신청 시 `WarningSanctionService.isApplyRestricted(clubId, memberId, when)`로 활성 EVENT_APPLY_RESTRICT를 검사해 신청을 차단.

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
| 후속(미구현) | 실제 멤버십 제거/환불은 outbox consumer/클럽 서비스 책임(이 도메인 밖) |

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

### 내부: `closeExpiredSanctions(cutoff)`
| 항목 | 실제 계약 |
|---|---|
| 동작 | `status=ACTIVE && end_at ≤ cutoff`를 ENDED로, audit `SANCTION_ENDED`(SYSTEM) |
| 호출처 | "스케줄러에서 호출 예정" — 활성 스케줄 미확인 |

`WarningSanctionVo`: `id`, `clubId`, `memberId`, `sanctionType`, `actorId`, `actorRole`, `reason`, `startAt`, `endAt`, `status`, `revokedBy`, `revokedReason`, `revokedAt`, `relatedGrantLedgerIds`, `createdAt`.

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
| OWNER forced-remove | actorRole==OWNER 통과 | 다이얼로그 확정 | FORCED_REMOVE row(멤버십 제거는 후속) | Risk(아래) |
| manual-lock | `setManualLock(true)` | 잠금 액션 | summary lock=true | 일치 |
| manual-unlock | `setManualLock(false)` | 해제 | lock=false | 일치 |
| ACTIVE 제재 철회 | `revoke` | 철회 | REVOKED | 일치 |
| ENDED/REVOKED 재철회 | `WARNING_SANCTION_NOT_FOUND` | 에러 | 차단 | 일치 |
| 이벤트 신청 시 활성 EVENT_APPLY_RESTRICT | `isApplyRestricted=true` | (이벤트 도메인) | 신청 차단 | 일치 |
| 만료(end_at 지남) 제재 | `closeExpiredSanctions` 호출돼야 ENDED | 스케줄러 미활성이면 ACTIVE 잔존 | 만료 안 닫힘 | Gap(아래) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `WarningSanctionType` | 6값 | enum 동일 | 일치 |
| `WarningSanctionStatus` | ACTIVE/ENDED/REVOKED | enum 동일 | 일치 |
| 제재 응답 형태 | `WarningSanctionVo` | VO | 일치 |
| forced-remove 권한 | 서비스 OWNER 재검증 | 다이얼로그는 UI 가드 | 일치(서버가 최종 가드) |
| manual-lock sanctionType | 컨트롤러 강제 설정 | Flutter param 전송 | 일치(서버가 덮어씀) |
| forced-remove 실효 | row+outbox만 | 화면은 성공 처리 | **불일치(멤버십 제거 미연결)** |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | `FORCED_REMOVE`가 실제 멤버십 제거/환불/구독 정리로 연결 안 됨 | `WarningSanctionService.apply`가 row INSERT + outbox만, 주석이 "별도 클럽 서비스 후속 처리 필요"라고 명시 | 강제 탈퇴 처리했는데 사용자가 여전히 클럽 멤버로 남고, 유료 클럽이면 환불/구독 정리가 안 됨 — 돈·권한 불일치 | outbox consumer 또는 직접 호출로 클럽 멤버십 제거 + (유료 클럽) 환불/구독 정리 boundary 구현 |
| P1 | 만료 제재 자동 종료 스케줄러 미활성 | `closeExpiredSanctions`는 "스케줄러 호출 예정"만, end_at 지나도 ACTIVE 유지 | 기한부 제재가 만료 후에도 활성으로 남아 이벤트 신청 차단이 계속될 수 있음 | 만료 종료 스케줄러 활성화 + 전체 클럽 순회 |
| P1 | NOTICE/ROLE_RESTRICT 실효가 outbox consumer 위임 | `apply`는 row만, 실제 공지 발송/역할 변경은 이 도메인 밖 | outbox consumer 미동작 시 제재가 "기록만 되고 효력 없음" | consumer 동작 보장 + ROLE_RESTRICT가 실제 권한 flag에 반영되는지 검증 |
| P2 | revoke가 EVENT_APPLY_RESTRICT 철회 시 즉시 효력만 의존 | `isApplyRestricted`가 실시간 조회 | 캐시된 신청 화면이 잠시 차단 표시할 수 있음 | 재조회 안내 |
| P2 | `relatedGrantLedgerIds` 수동 직렬화 | `serializeIdList`가 문자열 JSON 빌드 | 잘못된 입력 시 깨진 JSON 가능성 | Jackson 직렬화로 통일 검토 |

## 9. 수용 기준

### AC-01. 이벤트 신청 제한 적용 + 차단 연동
Given WARNING_REVIEWER가 멤버에게 EVENT_APPLY_RESTRICT를 적용한다.
When 그 멤버가 이벤트 신청을 시도한다.
Then `isApplyRestricted`가 true를 반환해 신청이 차단된다.

### AC-02. 강제 탈퇴 OWNER 전용
Given ADMIN(비OWNER)이 `forced-remove`를 호출한다.
When 요청이 도착한다.
Then 서버는 `WARNING_SANCTION_OWNER_ONLY`로 거절한다.

### AC-03. 강제 탈퇴 멤버십 제거 (목표)
Given OWNER가 멤버를 강제 탈퇴시킨다.
When `forced-remove`가 성공한다.
Then FORCED_REMOVE row가 생성되고 **그 멤버가 실제로 클럽 멤버십에서 제거되며 유료 클럽이면 환불/구독 정리가 일어나야 한다**.
현재 구현은 row+outbox만 생성하므로 이 기준을 충족하지 못한다.

### AC-04. 수동 잠금 토글
Given WARNING_REVIEWER가 멤버를 manual-lock한다.
When `POST /members/{memberId}/manual-lock`이 호출된다.
Then `warning_member_summary.manual_lock=true`가 되고 자동 등급 재평가가 잠긴다.

### AC-05. 제재 철회
Given ACTIVE 제재를 철회한다.
When `POST /sanctions/{sanctionId}/revoke`가 호출된다.
Then `status=REVOKED`가 되고 MANUAL_LOCK이면 잠금이 해제된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현(P0) | 강제 탈퇴 실효 | FORCED_REMOVE → 클럽 멤버십 제거 + 환불/구독 정리 boundary 구현 |
| 구현 | 만료 자동 종료 | `closeExpiredSanctions` 스케줄러 활성화 |
| 구현 | NOTICE/ROLE_RESTRICT 실효 | outbox consumer 동작 + 권한 flag 반영 검증 |
| 정책 | 환불 연계 | 유료 클럽 강제 탈퇴 시 가입비/구독 환불 정책 결정 |
| 테스트 | 제재 | EVENT_APPLY_RESTRICT 신청 차단 / forced-remove OWNER 가드 + 멤버십 제거 / 철회 E2E |
