# F04-04. 회원 목록·역할·권한 위임과 강퇴 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다. 2026-11-22 서버·앱 소스와 선택한 기존 시험 단언을 대조했다. 새 앱·이미지·돈 이동·알림 수신 시험 결과가 아니다.

## 결론

현재 회원 목록은 검색·역할 필터·페이지를 제공하며 각 행의 서버 actions로 역할 변경·강퇴·차단을 구성한다. 전체 관리 권한을 OWNER/ADMIN 이름만으로 판단하지 않는다. 소유자만 역할을 바꾸고 세부 권한을 위임할 수 있으며, 강퇴와 [차단 관리](F04-06_ban-management_prd.md)는 재가입 차단 여부가 다른 명령이다.

일반 회원으로 강등하면 저장된 위임 비트도 회수한다. 위임 가능한 항목은 모든 비트가 아니며 POLICY_OWNER와 STAMP_ISSUER는 위임에서 제외한다. 강퇴는 필수 명령 키와 사유·증빙을 사용하고, 참가 정리·가입비 반환·운영 기록·분쟁 연결을 함께 처리한다.

## 코드 위치

서버: ClubController#getMembers·changeRole·kickMember, ClubMembershipService#getMembers·changeRole·requirePickPurpose, ClubMemberQueryRepository, ClubMemberSearchParam·ClubMemberVo·RoleChangeParam·MemberRole. 권한은 ClubAbilityPolicy·ClubRowActions·ClubMemberPermissionChecker·ClubMemberPermissionController/Service/Flag와 요청/응답 모델. 강퇴는 ClubMemberExitCommandService·ClubMemberExitSupport·ClubExitParticipationReleaser·EvidenceFileValidator·ClubFundMoneyCommand·ClubFundPlan·ClubFundService다.

앱: club_member_list_screen.dart·member_action_sheet.dart·role_change_sheet.dart·club_membership_action_sheet.dart, club_member_provider.dart·club_member_api.dart·club_member_repository.dart·club_member.dart, club_management_screen.dart·club_branch_routes.dart. 위임은 club_member_permission_screen.dart·club_member_permission_provider.dart·club_member_permission_api.dart·club_member_permission_flag.dart. 강퇴의 동일 의도는 공통 member_money_command.dart를 사용한다.

<!-- source-references:start -->
서버 창구: `ClubController#getMembers`, `ClubController#changeRole`, `ClubController#kickMember`, `ClubMemberPermissionController#listAdmins`, `ClubMemberPermissionController#getPermissionFlags`, `ClubMemberPermissionController#updatePermissionFlags`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
- 옛 DELETE 강퇴는 제거됐다. 현재 POST 명령과 요청 고유키를 사용한다.
<!-- source-references:end -->

## 목록 입구와 검색·페이지

모임 관리의 회원·가입 구역에서 구성원 관리로 들어간다. 회원 라우트는 회원 접근 조건을 검사한다. 화면이 권한을 아직 읽지 못하면 읽기 상태를 보이고, 화면 안에서 비회원으로 확인되면 공개 사람 미리보기를 사용한다. 공개 사람 미리보기와 이 회원 전용 API는 별개다.

GET /api/v1/clubs/{id}/members는 현재 클럽 회원이어야 하며 Page<ClubMemberVo>를 반환한다. 응답에는 회원 행 번호·클럽/사용자 번호·닉네임·역할·가입 시각과 kick·ban·promoteToAdmin·changeRole 허용값이 있다. role은 정확히 일치하는 역할로 거르고 keyword는 닉네임의 대소문자 구분 없는 부분 일치다. 가입 시각·회원 행 번호 오름차순으로 읽는다.

일반 탐색은 본인과 차단 관계인 사용자를 제외한다. purpose를 쓰는 운영 대상 선택은 별도 권한을 확인한 뒤 이 차단 제외를 적용하지 않는다. STAMP·MILEAGE·BADGE는 해당 기능 권한을, HOST_PROPOSAL은 eventId와 그 이벤트의 주최 권한을 요구한다. 목적만 추가하면 누구나 전체 명단을 볼 수 있는 계약이 아니다. 일반 회원 목록은 사람 차단 성공 시 해당 회원을 현재 목록에서 먼저 빼고 첫 쪽부터 다시 조회한다. 재조회 중에는 예전 쪽 번호로 추가 조회하지 않는다. 운영 대상 선택 명단에 이 즉시 숨김을 일괄 적용하지 않으며, 차단 해제는 새 조회 결과로 반영한다.

앱은 20개씩 읽고 300ms 입력 지연 뒤 검색어를 적용한다. 검색어는 trim하고 빈 값은 해제한다. 전체·운영진·일반 탭 중 운영진은 ADMIN 필터이므로 OWNER를 합산한 모든 운영 역할 필터라고 설명하지 않는다. 권한이 있으면 승인 대기·초대 입구를 추가하며, 승인 대기는 별도 목록으로 이동한다. 검색어·선택 탭은 클럽 탐색 상태에 보관한다.

회원 상단 숫자는 현재 읽은 목록 길이다. 서버 총원·필터 전 인원으로 단정하지 않는다. 다음 페이지의 일반 실패는 받은 회원을 남기고 아래 재시도 줄로 표시하지만 인증·권한·없음 오류에서는 기존 행을 지우고 오류로 전환한다. 검색·필터 변경은 첫 페이지부터 다시 읽는다.

## 사람 정보와 행동 입구

회원 카드를 누르면 PersonSheet를 연다. 이를 누구에게나 전체 프로필 상세를 바로 여는 링크로 설명하지 않는다. 관리 행동은 카드의 더보기로 제공하며 본인 행에는 이 행동을 숨긴다. 현재 목록 구현에서 길게 누르기를 별도 입구로 안내하지 않는다.

역할 변경 선택지는 행의 promoteToAdmin·changeRole과 현재 역할에 따라 구성하고, 강퇴·차단은 각각 행의 kick·ban 허용값을 따른다. 마일리지·경고 상세도 해당 기능의 범위·권한이 있을 때 추가될 수 있으므로 행동 시트가 언제나 세 항목이라는 설명은 현재와 다르다.

역할 변경 시트에서 고른 뒤 API 결과를 받고, 강퇴는 사유·증빙 시트의 제출 결과가 성공일 때 닫는다. 권한 거절은 목록을 다시 읽게 하는 오류 처리로 연결한다. 시트에 남은 예전 권한이 서버의 현재 명령 허가를 대체하지 않는다.

## 역할 변경과 강등

POST /api/v1/clubs/{id}/members/{userId}/role은 RoleChangeParam의 role을 받고 성공 시 200, 응답 본문 없음이다. 현재 소유자만 호출할 수 있고 대상은 현재 회원이어야 한다. OWNER 대상이나 새 OWNER 역할은 이 API로 바꿀 수 없다. 소유권 이전은 [클럽 생성·수정·폐쇄와 소유권 이전](F04-03_club-crud-transfer_prd.md)의 제안·수락 절차다.

ADMIN 승격은 대상의 역할 제한이 있으면 거절한다. MEMBER로 내릴 때 남아 있는 위임 비트는 0으로 만들고 회수 감사 기록을 남긴다. 역할이 실제 달라지면 MemberRoleChanged 이벤트를 발행한다. 이벤트 발행과 대상 기기의 알림 수신 성공은 다른 증거다.

강퇴·차단을 실행하는 운영진도 현재 유효한 권한이어야 한다. OWNER는 대상이 될 수 없고 ADMIN 대상은 소유자만 처리할 수 있다. 역할 제한된 ADMIN을 정상 운영진으로 간주하지 않는다. 일반 강퇴는 회원을 제거하며 영구 BAN을 자동으로 만드는 명령은 아니다. 제재에 의한 재가입 제한은 별도 제재 경로다.

## 세부 권한 위임

모임 관리의 ‘권한 맡기기’ 입구는 delegatePermissions 허용 조건을 사용한다. API 경로는 /api/v1/admin/clubs/{clubId}/members/permissions이며, /admins 목록·/{memberUserId} 단건 GET·같은 단건 PUT이 있다. 경로에 admin이 있어도 이 창구는 API 앱의 클럽 소유자용 권한 콘솔이다. 목록은 Page가 아닌 List다.

콘솔은 OWNER·ADMIN뿐 아니라 잔여 flags가 있는 일반 회원도 포함한다. 소유자 행은 전체 효과를 표시하지만 편집 대상은 아니다. 현재 flags를 주고받으며 PUT은 음수가 아닌 flags를 요구하고 서버의 위임 가능 마스크 밖 비트는 거절한다.

| 구분 | 현재 규칙 |
| --- | --- |
| 위임 가능한 9개 | 마일리지 관리, 경고 검토, 이벤트 출석, 보상, 제재 제안, 배지 수여, 이벤트 메시지 관리, 이벤트 환불, 이벤트 분쟁 처리 |
| POLICY_OWNER | 소유자 전용 효과이며 위임할 수 없음 |
| STAMP_ISSUER | 위임할 수 없음. 역할 제한이 없는 ADMIN의 기본 효과에 포함 |
| OWNER | 전체 효과. 소유자 본인 행의 비트를 직접 고치는 방식이 아님 |
| ADMIN | 저장된 위임 가능 비트와 기본 도장판 효과. 역할 제한 중이면 효과 0 |
| MEMBER | 저장된 잔재가 있어도 실제 효과 0. 새 비트를 남길 수 없고 전체 회수는 가능 |

역할 제한 대상에게 새 비트를 추가할 수 없지만 회수는 별도로 허용한다. 서버는 grant·revoke·revokeAll을 각 행에 내려 주며 앱은 변경에 해당하는 허용값을 다시 확인한다. 저장된 역할 이름과 실제 권한 효과를 혼동하지 않는다.

앱은 알고 있는 위임 가능 항목만 선택지로 만들고 POLICY_OWNER·STAMP_ISSUER를 저장 선택에서 제외한다. 앱이 모르는 비트는 현재 행에서 보존하지만, 이것이 현재 서버의 위임 불가 비트까지 승인한다는 뜻은 아니다. 저장 중 계정·세션·현재 권한·최신 행 상태를 검사하고 성공 후 콘솔을 다시 읽는다.

## 강퇴 사유·증빙·명령

POST /api/v1/clubs/{id}/members/{userId}/kick은 인증 사용자, 필수 Idempotency-Key, ClubKickParam을 받고 성공 시 204다. 옛 DELETE 회원 경로를 현재 강퇴 API나 호환 입구로 쓰지 않는다.

reasonCode는 HARASSMENT·RULES_VIOLATION·INACTIVITY·MEMBER_COMPLAINTS·OTHER 중 하나로 필수다. reasonText는 선택·최대 500자, evidenceFileIds는 최대 5개이며 null 요소를 거절한다. 증빙은 실제 파일·작성자 소유·업로드 완료·허용 증빙 용도를 확인해 참조를 연결한다. 중복·양수가 아닌 번호의 정규화와 사전 요청 길이 검사를 같은 규칙이라고 설명하지 않는다.

앱은 기타 사유의 trim한 설명을 5자 이상 요구하고 업로드 중·전송 중에는 다시 보내지 못하게 한다. 이 최소 5자 조건은 현재 강퇴 서비스 검증에는 없다. 실패한 시트는 입력과 첨부를 유지하고 다시 제출할 수 있다.

공통 회원 돈 명령에 종류·클럽/대상·사유/증빙 본문과 키를 넘긴다. 결과가 불명확한 반복을 임의의 새 의도로 바꾸지 않는다. 성공 또는 반영됐을 수 있는 오류 뒤 회원 상태·기금 자료를 갱신한다. 역할 변경에는 같은 필수 명령 키 계약이 없다.

## 강퇴 후 참가·가입비·운영 기록

강퇴는 참가 해제 서비스에서 범위 안의 돈이 묶이지 않은 후보를 처리한다. 운영진 강제 처리이므로 본인 취소 허용 조건과 다르지만 체크인된 동행 행 등 제외 조건은 남는다. 강퇴 성공이 모든 이벤트 참가·정산의 소멸을 뜻하지 않는다.

가입비를 실제 낸 회원은 자발 탈퇴의 7일 조건 없이 반환 대상이다. 반환은 원거래의 아직 남은 유료·무료 몫을 기준으로 하며 이미 반환된 금액을 다시 주지 않는다. 같은 통화의 기금에서 가능한 만큼 차감하고 부족분은 선지급 몫·클럽 미수금으로 기록한다. 단순 총잔액 하나만으로 반환액이나 부족분을 계산하지 않는다.

회원 제거·인원 감소 뒤 사유코드·설명·증빙·행위자를 ClubMembershipAction에 기록하고, KICK 불리 조치의 분쟁 연결을 발행하며 대상에게 강퇴 알림을 요청한다. 분쟁 연결 발행을 실제 이의신청 제출이나 알림 수신 완료로 바꾸어 쓰지 않는다. 현재 회원 목록은 전체 불리 조치 이력 조회 화면이 아니다.

## 현재 제한과 확인 범위

| 판정 | 항목 | 근거·사용자 영향 | 남은 확인 |
| --- | --- | --- | --- |
| Risk | 목록 숫자·운영진 필터 | 상단은 현재 받은 행 수, 운영진 탭은 ADMIN 정확 일치 | 전체 총원·OWNER 포함 운영진 수로 오해하지 않도록 설명 |
| Risk | 기타 사유 검증 차이 | 앱은 5자 이상을 요구하지만 서버는 사유코드·최대길이 중심 | 다른 호출 경로의 최소 설명 기준 정렬 |
| Risk | 목록에서 사라진 대상 | 행동 시작 시 firstWhere로 대상 행을 찾으며 없는 행의 별도 fallback은 없음 | 회원 변경과 더보기 실행이 겹칠 때 복구 동작 확인 |
| 미검증 | 실제 강제 처리 | 소스와 선택한 시험 단언만 읽음 | 실제 참가·지갑·분쟁·알림 완료는 실행 증거로 분리 |

## 수용 기준과 검증 근거

- **AC-01 목록 접근:** 현재 회원 API와 비회원 공개 미리보기를 구분한다.
- **AC-02 검색과 정렬:** 닉네임 부분 일치·정확 역할 필터·가입 시각/번호 순서로 20개씩 읽는다.
- **AC-03 목적별 선택:** 일반 탐색의 차단 제외와 별도 권한을 요구하는 운영 대상 선택을 구분한다.
- **AC-04 페이지 실패:** 일반 추가 실패에는 기존 행·재시도를 남기고 접근 권한 상실에는 행을 지운다.
- **AC-05 사람과 더보기:** 카드는 PersonSheet, 관리 행동은 현재 행의 actions로 제공하고 본인 행을 구분한다.
- **AC-06 역할 변경:** 소유자만 ADMIN/MEMBER를 바꾸고 OWNER 변경은 별도 승계 절차로 보낸다.
- **AC-07 역할 제한:** 제한 대상 승격을 막고 MEMBER 강등 때 위임 비트·감사 기록을 처리한다.
- **AC-08 콘솔 범위:** 소유자용 List 응답과 ADMIN/OWNER·잔여비트 회원을 구분하며 소유자 행 편집을 막는다.
- **AC-09 위임 마스크:** 위임 가능 9개와 소유자 정책·ADMIN 기본 도장판 효과를 구분한다.
- **AC-10 비트 회수:** 역할 제한 중 추가 금지·회수 허용, MEMBER 효과0·전체 회수를 구분한다.
- **AC-11 최신 위임 상태:** 계정·권한·현재 행을 다시 확인하고 선택 외의 알려진 위임 불가 비트를 보내지 않는다.
- **AC-12 강퇴 계약:** POST·필수 키·사유·증빙으로 204를 처리하고 옛 DELETE를 사용하지 않는다.
- **AC-13 사유 실패:** 기타 최소길이·최대길이·파일/업로드 조건을 구분하고 실패 입력을 보존한다.
- **AC-14 대상 권한:** OWNER 강퇴 금지·ADMIN 대상 소유자 한정·유효 운영진 조건을 서버에서 검사한다.
- **AC-15 참가와 반환:** 참가 해제 제외 조건과 원거래 남은 가입비·같은 통화 기금·미수금을 구분한다.
- **AC-16 결과 갱신:** 동일 명령 재확인과 성공/반영 가능 오류 뒤 회원·기금 갱신을 처리한다.
- **AC-17 기록과 실제 완료:** 불리 조치 기록·분쟁 연결·알림 요청을 각각 실제 접수·수신 증거와 구분한다.

검증 근거: club_permission_delegation_screen_test.dart의 잔재 POLICY_OWNER 비트를 전송에서 제외하고 마일리지·보상 비트를 유지하는 단언을 읽었다. 새 시험은 실행하지 않았다. 공통 돈 명령과 참가 해제의 앞선 동일 소스 근거를 재사용했다. 과거 E2E 추출 원문은 로컬 시나리오 문서에 인용으로 보존하며 현행 계약·현재 통과 수에 합산하지 않는다.
