# F15-08. 클럽·플랫폼 제재와 계정 제한 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다. 현재 할 일은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)에 있다.

## 현재 제재와 실행 권한

클럽 제재는 NOTICE·EVENT_APPLY_RESTRICT·ROLE_RESTRICT·FORCED_REMOVE·MANUAL_LOCK·MANUAL_UNLOCK이다. 메서드의 SANCTION_PROPOSER가 컨트롤러 기본 WARNING_REVIEWER를 대체하므로 검토 권한만으로 집행할 수 없다. 강제 탈퇴와 재시도·철회는 서비스에서 OWNER를 다시 요구한다. 역할 제한과 강제 탈퇴의 대상이 소유자면 거절한다.

회원 상세 읽기는 WARNING_REVIEWER 또는 SANCTION_PROPOSER를 허용한다. 화면은 서버 abilities와 개별 actions를 기준으로 최신 권한·현재 행을 확인한다. 권한이 아직 확정되지 않았거나 읽기 오류가 있으면 명령을 진행하지 않는다.

## 부과·수동 잠금·철회의 계약

POST /api/v1/admin/clubs/{clubId}/warnings/sanctions/notice·event-apply-restrict·role-restrict는 필수 Idempotency-Key와 경로에 맞는 type을 요구한다. manual-lock·manual-unlock은 /members/{memberId} 아래에 있으며 URL의 대상과 명령 type을 강제하고 필수 키로 처리한다. forced-remove와 forced-remove/retry의 키는 선택이다. 부과 성공은 제재 행 생성과 실제 강제 탈퇴 실행 완료를 구분해야 한다.

사유는 공백 불가·최대 4000자다. 일반 제재의 종료는 적용 시작보다 뒤여야 한다. 강제 탈퇴에는 startAt·endAt을 지정하지 않으며 재가입 제한은 NONE·DAYS(1~365일)·PERMANENT다. 다른 제재에는 재가입 제한을 넘기지 않는다. 진행 중 강퇴가 있으면 직접 부과 경로는 기존 행을 반환하고 제보 연결 경로는 중복을 거절한다.

수동 잠금은 경고 요약의 등급 재평가를 잠그는 기능이다. MANUAL_UNLOCK은 이를 해제한다. 이벤트 신청·역할 권한의 직접 차단과 같은 기능으로 설명하지 않는다. 철회는 ACTIVE이며 종료되지 않은 제재가 대상이다. 성공한 강제 탈퇴는 제재 철회로 멤버십을 복원하지 않는다. 처리 전 강퇴 철회는 CANCELLED로 바꾸고 실행 임대를 지운다.

## 강제 탈퇴 실행과 재시도

강퇴는 ACTIVE/PENDING으로 등록한 뒤 별도 집행기가 처리한다. 행 잠금과 실행 토큰·120초 임대를 사용하며 최대 시도는 5회다. 분쟁 보류 여부를 시도 증가 전에 검사한다. 실행은 기존 클럽 탈퇴 명령에 연결하고 원천 제보를 마무리하며 결과를 SUCCEEDED와 REMOVED 또는 ALREADY_ABSENT로 남긴다. 유료 참여·멤버십 정리는 [클럽 회원 관리](../04_club/F04-04_member-management_prd.md)의 공통 탈퇴 계약을 따른다.

실패 결과는 별도 트랜잭션으로 기록하며 재시도 가능한 경우 지연 후 RETRYABLE, 한도에 도달하면 FAILED다. OWNER의 명시적 재시도는 ACTIVE/FAILED를 PENDING·시도 0으로 되돌린다. 이미 PENDING·PROCESSING·RETRYABLE이면 같은 행을 돌려준다. DAYS 재가입 제한은 실제 집행 시점부터 계산한다. 경고 알림을 발행한 것과 운영자의 실제 수신 확인은 별개다.

## 발효 시각과 실제 제한

ACTIVE 목록은 종료 시각을 검사하지만 시작 시각이 미래인 행도 포함한다. 실제 EVENT_APPLY_RESTRICT 가드는 시작과 종료 시각을 적용한다. 이벤트 신청에는 클럽 제한과 플랫폼 전역 신청 제한을 함께 검사한다. ROLE_RESTRICT는 운영진의 유효 권한 계산에 직접 연결돼 제한된 ADMIN의 권한을 0으로 만든다. 과거의 모든 효력이 outbox consumer에만 의존한다는 설명은 현재 코드와 다르다.

클럽 만료 스케줄러는 매일 04:00 Asia/Seoul에 종료 대상 ACTIVE 행을 개별 처리한다. 정리 작업이 아직 돌지 않았더라도 조회·집행 시각 검사를 별도로 적용한다. NOTICE 등 알림 outbox 기록은 실제 푸시 수신까지 보장하지 않는다.

## 플랫폼 전역 제재와 본인 조회

PlatformSanctionType은 EVENT_APPLY_RESTRICT·EVENT_HOST_RESTRICT·DATE_PROFILE_BLOCK·ACCOUNT_SUSPENSION·ACCOUNT_BAN의 5종이다. 전역 제한은 클럽 밖의 개인 이벤트와 데이트에도 쓰인다. 일반 부여와 계정 정지·차단 명령은 별도 서비스이며 계정 유형을 일반 부여에 넘기면 ACCOUNT_SANCTION_COMMAND_REQUIRED로 거절한다. 내부 관리 명령을 일반 회원의 공개 쓰기 API로 소개하지 않는다.

GET /api/v1/users/me/sanctions는 List<UserPlatformSanctionVo>를 반환한다. 본인 목록은 위임된 DATE_PROFILE_BLOCK을 걸러낼 수 있으며 종료 전 ACTIVE 행에는 예약 시작 행도 포함될 수 있다. 앱에는 본인 목록·새로고침·빈 목록·오류 표시가 연결돼 있다.

데이트 프로필 생성과 활성 전환에는 DATE_PROFILE_BLOCK 검사, 이벤트 주최 경로에는 EVENT_HOST_RESTRICT 검사가 있다. 전역 제재 부여 서비스에서 이미 활성인 데이트 프로필을 즉시 끄는 호출은 확인되지 않았다. 매칭 전체의 노출 차단 여부는 별도 데이트 기능 대조 범위이며 이 문서만으로 전부 차단됐다고 단정하지 않는다.

## 계정 정지·차단과 제한 세션의 권리 경로

AccountSanctionService는 사용자 잠금 아래 STOP/BAN 상태와 계정 제재 원장을 함께 변경한다. 해제 시 계정 제재를 철회하고 해당 상태를 NORMAL로 복원하며 정지 사유·기한을 비운다. 제재 시 에이전트 권한 회수와 커밋 뒤 토큰 차단 연계가 있지만 외부 반영 실패까지 모든 기기의 즉시 로그아웃을 보장하는 것은 아니다.

로그인은 비밀번호 확인 뒤 정지·차단 상태에 제한 토큰을 발급하며 갱신도 현재 상태를 따른다. 서버 AccountLockInterceptor는 AccountLockPolicy의 HTTP method·경로 허용 목록을 적용한다. 본인 정보·제재, 기존 본인 분쟁의 조회·이의·메시지·증빙·동의/확인 등 허용된 절차, 고객지원 접수와 후속 메시지, 기존 문의, 개인정보 삭제 요청·상태·취소·사전 확인, 내보내기 요청·상태, 로그아웃·갱신이 포함된다. 첨부 업로드는 EVIDENCE 목적만 허용한다. 허용 경로여도 각 서비스의 본인·사건 자격 검사는 유지된다.

앱은 제한 안내·내 제재·개인정보·본인 분쟁·고객지원·기존 문의·가이드 경로를 허용하고 새 분쟁과 새 일반 문의 입구는 막는다. 개인정보 삭제 요청을 금지하거나 즉시 탈퇴를 허용한다고 일괄 설명하지 않는다. 자세한 구분은 [계정 탈퇴와 개인정보 삭제](../13_profile_settings/F13-06_account-deletion_prd.md)를 따른다.

## 코드 위치

서버: WarningAdminActionController, WarningAdminQueueController, RequiresClubPermissionAspect, ClubMemberPermissionChecker, ClubMemberPermissionFlag, WarningSanctionService, WarningForcedRemoveExecutionService, WarningForcedRemoveCoordinator, WarningForcedRemoveRetryScheduler, WarningSanctionExpiryScheduler, EventApplyRestrictionGuard, PlatformSanctionType, PlatformSanctionService, AccountSanctionService, UserSanctionController, AuthService, JwtAuthorizationFilter, AccountLockPolicy, AccountLockInterceptor. 앱: warning_sanction_screen.dart, warning_forced_remove_dialog.dart, warning_sanction_action_row.dart, warning_admin_access.dart, my_sanctions_screen.dart, account_lock_routes.dart.

<!-- source-references:start -->
서버 창구: `WarningAdminActionController#applyNotice`, `WarningAdminActionController#applyEventRestrict`, `WarningAdminActionController#applyRoleRestrict`, `WarningAdminActionController#applyForcedRemove`, `WarningAdminActionController#retryForcedRemove`, `WarningAdminActionController#revokeSanction`, `WarningAdminActionController#manualLock`, `WarningAdminActionController#manualUnlock`, `UserSanctionController#getMySanctions`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | ACTIVE 목록에는 예약 제재가 있고 강퇴 등록과 집행도 분리돼 있다. | 목록·현재 효력·집행 결과를 나눠 표시한다. |
| Risk | 기활성 데이트 프로필의 즉시 비활성화 호출은 전역 부여 경로에 없다. | 매칭 노출 전부가 검증됐다고 단정하지 않는다. |
| 미검증 | 실제 강퇴·재가입·유료 정리·분쟁 보류·제한 계정·기기 토큰 반영은 실행하지 않았다. | 소스 계약을 실운영·기기 통과로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 직무 분리:** 검토·제재·소유자 권한과 서버 개별 actions를 구분한다.
- **AC-02 부과 계약:** 경로별 type·키·시각·재가입 제한을 검증한다.
- **AC-03 집행 상태:** 강퇴 등록·임대·분쟁 보류·실행 결과·재시도 한도를 구분한다.
- **AC-04 철회 경계:** 성공한 강퇴는 철회로 되돌리지 않고 수동 잠금은 등급 재평가에 적용한다.
- **AC-05 현재 효력:** 예약 목록과 실제 시각 가드, 역할 제한의 권한 반영을 구분한다.
- **AC-06 전역 계약:** 5종과 계정 전용 명령·본인 조회·데이트/주최 가드를 구분한다.
- **AC-07 제한 세션:** 정지·차단 계정의 허용 권리 경로와 증빙 목적을 서버·앱에 맞춘다.
