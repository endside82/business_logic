# F04-05. 가입 신청 처리·초대 발송과 받은 초대 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다. 2026-11-22 서버·앱 소스와 선택한 기존 시험 단언을 대조했다. 새 앱·이미지·지갑·알림·스케줄 실행 결과가 아니다.

## 결론

가입 신청과 초대는 APPLY/INVITE 사건을 만들고 PENDING에서 종결 상태로 전이한다. 승인·거절·수락·만료 때 행을 일괄 삭제하지 않는다. 운영진의 진행 중 목록과 수신자의 과거 이력 포함 초대함은 목적과 조회 조건이 다르다.

현재 실제 입구는 구성원 관리의 승인 대기·초대 탭, 멤버 초대 대화상자, 모임 탭의 받은 클럽 초대와 초대 상세다. 알림은 해당 화면으로 연결한다. 초대 수락·거절·취소는 누른 버튼이 아니라 서버가 반환한 최종 상태로 결과를 안내한다.

## 코드 위치

서버: ClubController의 가입 대기·초대·후보 창구, ClubWaitlistService, ClubWaitTransitions·ClubWaitStatus·ClubMemberWait, ClubAbilityPolicy·ClubRowActions·ClubSubscriptionGateService, ClubWaitlistVo·ClubInvitationVo·ClubInviteCandidateVo, InviteParam·InvitationAcceptParam·ApplicationRejectParam, ClubInvitationExpiryService·InviteExpiryCleanupScheduler. 가입비 처리는 ClubMembershipService의 앞선 동일 소스 근거를 재사용한다.

앱: club_waitlist_screen.dart·waitlist_card.dart·reject_dialog.dart, club_invite_dialog.dart·club_invite_candidates_provider.dart, club_pending_invitations_tab.dart, club_invitation_inbox_screen.dart·club_invitation_detail_screen.dart. 공급자는 club_waitlist_provider.dart·club_invitation_provider.dart·club_member_provider.dart, 데이터는 club_waitlist_api.dart·club_member_api.dart·club_member_repository.dart·club_waitlist_item.dart·club_invitation.dart다. 입구는 club_member_list_screen.dart·club_management_screen.dart·gathering_tab_sections.dart·club_branch_routes.dart·club_admin_routes.dart·notification_router.dart다.

<!-- source-references:start -->
서버 창구: `ClubController#getWaitlist`, `ClubController#approveApplication`, `ClubController#rejectApplication`, `ClubController#inviteMember`, `ClubController#acceptInvite`, `ClubController#declineInvite`, `ClubController#getInviteCandidates`, `ClubController#getMyInvitations`, `ClubController#getMyInvitation`, `ClubController#cancelInvitation`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 역할별 입구와 조회

| 사용자·목적 | 현재 입구와 자료 |
| --- | --- |
| 운영진의 가입 신청 처리 | 구성원 관리의 승인 대기 → 별도 /clubs/{clubId}/waitlist 화면. viewJoinRequests와 운영 권한 라우트 조건 |
| 운영진의 보낸 초대 관리 | 구성원 관리의 초대 탭. 모임 관리 초대 입구는 members?tab=invitations로 연결하며 viewInvitations 조건 적용 |
| 새 초대 발송 | 회원 목록의 초대 버튼 → 멤버 초대 대화상자. invite 능력과 현재 권한 읽기 완료 여부 확인 |
| 받은 초대 | 모임 탭의 받은 클럽 초대 → /club-invitations → /club-invitations/{invitationId} |
| 알림 | 가입 신청은 대기 명단, 초대는 waitId가 있으면 초대 상세·없으면 초대함. 가입 승인/거절은 클럽 상세 |

대기 GET /api/v1/clubs/{id}/waitlist는 Page<ClubWaitlistVo>다. waitType을 생략하면 APPLY/PENDING, INVITE를 지정하면 PENDING이며 expiresAt이 현재보다 뒤인 초대만 읽는다. APPLY를 명시하면 현재 서비스는 상태 없이 해당 종류를 조회한다. 앱의 가입 신청 목록은 waitType을 생략하므로 이 둘을 혼동하지 않는다. 기본 정렬은 번호 오름차순이다.

받은 초대 GET /api/v1/clubs/invitations/me는 본인 INVITE의 종결 이력도 포함한 Page<ClubInvitationVo>이며 생성 시각·번호 내림차순이다. 단건 /invitations/{invitationId}는 본인 수신 INVITE만 허용한다. 대기 행의 id와 수신 응답의 waitId는 이름이 다르다.

## 신청 목록·승인·거절

앱은 가입 신청을 20개씩 읽고 상단에 서버 총수, 없을 때만 현재 행 수를 쓴다. 사람 이름은 PersonLink, 생성일·신청 메시지를 표시한다. 승인·거절은 각각의 능력값을 사용하고 권한 갱신 중에는 실행 콜백을 막는다. 첫 실패는 본문 재시도, 추가 페이지 실패는 목록 아래 재시도, 자료가 있는 목록은 당겨 새로고침을 제공한다.

승인 POST /api/v1/clubs/{id}/waitlist/{waitId}/approve는 200 ClubMemberVo다. 클럽 잠금 뒤 유효 운영진·ACTIVE 클럽·정원·해당 클럽의 PENDING APPLY·현재 비회원·활동 가능한 신청자 계정을 확인한다. 회원을 추가하고 BUSINESS의 양수 가입비가 있으면 신청자 지갑에서 처리한 뒤 APPROVED로 기록한다. 비용 실패를 회원만 추가된 성공으로 설명하지 않는다.

거절 POST /api/v1/clubs/{id}/waitlist/{waitId}/reject는 선택 ApplicationRejectParam.reason을 받고 200, 본문 없음이다. 사유는 trim해 빈 값은 null, 최대 500자다. 현재 운영 권한과 대상 PENDING APPLY를 확인하고 REJECTED·처리자·decisionMessage·처리 시각을 보존한다. 거절은 승인과 달리 ACTIVE/정원 조건을 요구하지 않는다.

거절 대화상자는 전송 중 중복 제출을 막고 성공일 때 닫으며 실패하면 입력을 남긴다. 승인·거절 성공 또는 반영됐을 수 있는 오류 뒤 관련 회원/클럽 자료를 다시 읽고 승인에는 기금 갱신도 포함한다. 카드 슬라이드 애니메이션을 완료 계약으로 삼지 않는다.

승인/거절 알림은 신청자에게 요청한다. 거절 알림 본문에 사유를 붙이지 않지만 사유가 항상 비공개인 것은 아니다. 클럽 상세의 본인 최신 신청 처리 메시지에 나타날 수 있다. 이 노출 조건은 [클럽 상세와 가입·탈퇴](F04-02_club-detail-join_prd.md)를 따른다.

## 초대 후보와 발송

후보는 일반 사용자 검색 API를 앱이 직접 호출하는 방식이 아니라 GET /api/v1/clubs/{id}/invite-candidates?nickname=...의 List<ClubInviteCandidateVo>를 사용한다. 각 행의 userId·nickname·actions.invite를 받고 허용되지 않은 행은 선택하지 못하며 거절 설명을 표시한다. 서버는 운영 권한을 확인하고 사용자 검색 결과에 기존 회원·차단 관계·유효 초대·유효 BAN과 클럽의 초대 가능 조건을 결합한다.

대화상자는 검색 버튼 또는 제출로 조회한다. 검색어가 바뀌면 이전 선택과 결과를 지우고, 늦은 응답은 검색 세대·계정 범위·최신 권한을 확인한 뒤 반영한다. 선택할 때도 현재 결과·검색어와 행의 허용값을 확인한다. 선택 메시지는 trim해 빈 값은 null로 보낸다. 전송 중 재전송을 막고 실패 시 입력을 유지하며, 계정 또는 초대 권한을 잃으면 닫는다.

발송 POST /api/v1/clubs/{id}/invitations는 InviteParam(userId, message)을 받고 201 ClubWaitlistVo다. 현재 Flutter API는 반환 본문을 사용하지 않고 void로 처리한다. 서버는 양수 대상 번호·본인 초대 금지·메시지 최대 500자, ACTIVE 클럽·유효 운영진·정원·BUSINESS 구독의 MEMBER_INVITE 허용을 검사한다.

대상이 기존 회원이거나 존재하지 않거나 활동 불가이면 거절한다. 검색 숨김/낯선 사람 숨김 대상은 USER_NOT_FOUND, 개인 차단 관계는 CLUB_INVITATION_BLOCKED, 진행 중 유효 초대는 CLUB_ALREADY_INVITED, BAN 행은 CLUB_BANNED다. 구독 제한의 현재 오류는 CLUB_SUBSCRIPTION_FEATURE_BLOCKED이며 과거 CLUB_SUBSCRIPTION_EXPIRED로 대체해 적지 않는다.

만료된 기존 PENDING 초대는 EXPIRED로 보존한 뒤 새 초대를 만들고 새 기한은 현재+7일이다. 초대 생성 알림은 수신자에게 waitId와 클럽 번호를 담아 요청한다. 이 창구에는 가입·강퇴의 필수 Idempotency-Key 계약이 없으며, 기존 유효 초대 중복 거절을 같은 명령 영수증 재생이라고 설명하지 않는다.

## 운영진의 초대 취소

진행 중 초대 탭은 20개씩 읽고 수신자 PersonLink·초대자·응답 기한을 보여 준다. cancelInvitation 허용값이 있어야 취소 버튼을 제공한다. 확인 창 뒤에도 계정·현재 권한·해당 행의 PENDING 상태를 다시 확인하고 같은 초대 번호로 보낸다.

POST /api/v1/clubs/{id}/invitations/{invitationId}/cancel은 200 ClubWaitlistVo다. 보낸 사람에 한정하지 않고 현재 유효 운영진이 취소할 수 있다. PENDING이면 기한을 다시 검사해 EXPIRED 또는 CANCELLED/STAFF_CANCELLED로 종결하며, 이미 끝난 경우 실제 종결 상태를 반환한다. 행을 삭제하지 않는다.

앱은 반환된 종결 행을 진행 중 목록에서 빼고 클럽 자료를 갱신한다. CANCELLED/STAFF_CANCELLED일 때만 이번 취소 성공으로 알리고, 수락과 경합해 ACCEPTED가 왔다면 이미 수락됐다고 안내한다. 확인한 수동 취소 분기에는 별도의 취소 알림 발송이 없다.

## 받은 초대의 상태와 비용 확인

초대함은 50개씩 읽고 추가 페이지 실패에 재시도를 제공한다. 초대 상세는 클럽 소개·운영 규칙·메시지·가입비·기한·현재 상태를 표시한다. actionable이 참이고 자료가 로딩/오류 상태가 아닐 때만 수락·거절을 제공한다. status만으로 PENDING을 실행 가능하다고 단정하지 않는다.

서버 actionCode는 종결 상태/결정 사유, 만료, 클럽 운영 불가, 계정 제한, BAN, 이미 회원, 개인 차단, 정원 순으로 현재 가능 여부를 설명한다. 정원 초과 CLUB_FULL은 지금 수락할 수 없다는 뜻이며 자동 CANCELLED가 아니다. 기한이 지났다면 조회 응답에 EXPIRED를 표현할 수 있으나 조회만으로 저장 행을 종결한 것은 아니다.

수락 POST /api/v1/clubs/{id}/invitations/{invitationId}/accept는 선택 InvitationAcceptParam.expectedMemberFee를 받고 200 ClubInvitationVo다. 본인 수신 초대를 잠가 이미 끝났으면 해당 결과를 반환하고 만료면 EXPIRED로 종결한다. 비활성 클럽·BAN·초대자와 차단 관계·이미 회원이면 CANCELLED와 해당 사유로 닫는다. 계정 활동 가능·정원은 별도로 검사한다.

BUSINESS의 양수 가입비는 현재 금액과 expectedMemberFee가 정확히 같아야 한다. 누락/변경이면 CLUB_INVITATION_FEE_CONFIRMATION_REQUIRED다. 앱은 수락 전 금액 확인 창을 열고, 확인 뒤 계정·현재 화면·초대/클럽 번호·종류·금액·actionable을 다시 검사한다. 이전 확인으로 바뀐 금액을 보내지 않는다. 오류 뒤 상세를 다시 읽고 현재 금액으로 재확인한다.

승인된 수락은 회원 추가·가입비 처리·ACCEPTED 기록을 같은 트랜잭션에서 수행하고 초대자에게 수락 알림을 요청한다. 발송의 구독 검사와 수락 검사는 같지 않으며, 확인한 수락 서비스는 발송 때의 MEMBER_INVITE 구독 게이트를 다시 호출하지 않는다.

## 응답 결과·복귀·만료 기록

거절 POST /api/v1/clubs/{id}/invitations/{invitationId}/decline도 200 ClubInvitationVo다. 이미 끝난 초대는 실제 결과, 기한이 지나면 EXPIRED, 진행 중이면 DECLINED를 기록하고 초대자에게 거절 알림을 요청한다. 과거의 행 삭제·초대자 알림 없음 설명은 현재와 다르다.

앱은 수락·거절 어느 버튼을 눌렀든 반환 status/actionCode로 알린다. ACCEPTED이면 /clubs/{clubId}로 현재 상세 경로를 교체하며 나머지 종결 결과는 초대 상세에 남긴다. 회원 수락 결과에는 회원/기금/지갑/최근 거래·초대함 갱신을 요청하고, 반영됐을 수 있는 수락 오류에도 관련 자료를 재조회한다. 다른 계정이나 위에 열린 화면을 늦은 결과로 덮지 않도록 계정·세션·현재 경로 조건을 확인한다.

만료 기준은 expiresAt, 과거 행에 없으면 createdAt+7일이며 현재와 같거나 이전이면 만료다. 정리 스케줄은 매일 03:00 cron으로 설정되어 있고 annotation에 zone이 명시되어 있지는 않다. 대상 PENDING 초대를 각기 별도 트랜잭션에서 잠그고 기한을 재확인해 EXPIRED로 저장한다. 개별 실패 후 계속 처리하며 수신자·초대자에게 만료 알림을 요청한다. 만료 알림은 수신자면 초대 상세, 초대자면 클럽 상세로 연결한다.

## 현재 제한과 확인 범위

| 판정 | 항목 | 근거·사용자 영향 | 남은 확인 |
| --- | --- | --- | --- |
| Risk | 목록과 명령의 BAN 시점 | 후보는 유효 BAN을 따지고 발송·수락은 BAN 행 존재를 검사 | 만료 정리 전 후보 허용과 실제 발송 거절의 시간차 구분 |
| Risk | 과거 종료일 없는 초대 | 받은 초대/만료 서비스는 생성+7일을 보완하지만 운영 목록은 expiresAt > now 조건 | 과거 데이터의 운영 목록 누락 여부 확인 |
| Risk | 승인 연속 실행 | 확인한 승인 화면에는 초대/거절처럼 요청별 전송 잠금이 없고 서버는 PENDING을 재검사 | 연속 탭·다른 운영진 처리 뒤 오류/재조회 동작 확인 |
| 미검증 | 실제 실행 | 소스와 일부 기존 시험 단언만 읽음 | 실제 가입비 반영·기기 알림·03시 작업 성공 증거 별도 |

## 수용 기준과 검증 근거

- **AC-01 실제 입구:** 승인 대기 별도 화면·보낸 초대 탭·발송 대화상자·받은 초대 상세를 구분한다.
- **AC-02 대기 조건:** 기본 APPLY/PENDING과 명시 APPLY·진행 INVITE의 조회 차이, 운영 권한을 따른다.
- **AC-03 페이지 복구:** 운영 목록20·초대함50·서버 총수·추가 페이지 재시도를 구분한다.
- **AC-04 승인:** 현재 권한·클럽 상태·정원·신청/계정·기존 회원 조건을 잠금 뒤 확인한다.
- **AC-05 승인 비용:** BUSINESS 양수 가입비를 승인 때 처리하고 비용 실패를 가입 성공으로 표시하지 않는다.
- **AC-06 거절 이력:** 선택 사유500·REJECTED/처리자/시각을 보존하며 실패 입력을 유지한다.
- **AC-07 사유 공개:** 알림 본문과 본인 상세의 처리 메시지 노출을 구분한다.
- **AC-08 후보 검색:** 전용 List 응답의 행 invite 허용값·검색어/계정/늦은 응답을 확인한다.
- **AC-09 발송 조건:** 본인/기존회원/계정/비공개/개인차단/기존초대/BAN·클럽/정원/구독을 검사한다.
- **AC-10 새 초대:** 기존 만료 이력을 보존하고 새7일 기한·수신자 알림 요청을 처리한다.
- **AC-11 운영 취소:** 현재 운영진이 확인 후 같은 초대 번호로 보내고 실제 최종 상태로 알린다.
- **AC-12 받은 이력:** 본인 초대만 읽고 status와 actionCode/actionable을 구분한다.
- **AC-13 수락 종결:** 만료/불가클럽/BAN/차단/이미회원과 정원 보류를 구분한다.
- **AC-14 비용 재확인:** 양수 BUSINESS 가입비의 기대 금액을 검사하고 변경 뒤 새 확인을 요구한다.
- **AC-15 수락 처리:** 회원·비용·ACCEPTED와 초대자 알림 요청을 처리하고 실제 수신 증거와 구분한다.
- **AC-16 거절 결과:** DECLINED 이력·초대자 알림 요청을 남기며 기존 종결 결과를 그대로 처리한다.
- **AC-17 복귀와 갱신:** 실제 ACCEPTED에만 클럽 상세로 이동하고 회원/기금/지갑/초대함을 갱신한다.
- **AC-18 만료 보존:** 기한/과거 보완·조회상 만료·저장 종결·개별 정리 작업을 구분하고 이력을 지우지 않는다.

검증 근거: club_waitlist_paging_refusal_test.dart의 총수/다음 장·정원 거절 재조회, club_member_invitations_tab_test.dart의 취소-수락 경합, entry_paths_club_invitation_received_test.dart의 금액 변경 재확인·실제 종결/복귀·만료 결과, club_invitation_money_refresh_test.dart의 수락/응답 유실 뒤 지갑 재조회 단언을 읽었다. 새 시험·이미지 검수는 실행하지 않았다. 과거 E2E 추출 원문은 로컬 시나리오 문서에 인용 보존하며 현재 통과 수에 합산하지 않는다.
