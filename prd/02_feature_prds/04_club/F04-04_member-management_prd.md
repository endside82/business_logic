# F04-04. 멤버 관리 (목록 / 역할 변경 / 추방) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

멤버 목록을 역할별로 필터링해 페이징 조회하고, OWNER가 역할을 변경하거나 OWNER/ADMIN이 멤버를 추방한다. 차단(BAN)은 별도 기능으로 F04-06 참조. 권한 매트릭스가 핵심: ADMIN은 다른 ADMIN을 추방·차단·역할변경할 수 없으며, OWNER만 ADMIN을 다룰 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 멤버 섹션 "멤버 전체 보기 →" (F04-02)
- 클럽 상세 헤더 → 멤버 카운트 탭

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `ClubKickReasonCode`, `ClubKickParam`, `ClubMembershipService`, `AccountingLedgerService`, `NotificationService`, `ClubFundService`. 앱: `club_member_list_screen.dart`, `member_card.dart`, `role_badge.dart`, `member_action_sheet.dart`, `role_change_sheet.dart`, `club_membership_action_sheet.dart`, `club_kick_param.dart`, `club_member_api.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#getMembers`, `ClubController#changeRole`, `ClubController#kickMember`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
- 옛 DELETE 강퇴는 제거됐다. 현재 POST 명령과 요청 고유키를 사용한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 멤버 목록 (`club_member_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "멤버 (24)" + 우상단 "초대" 버튼 (OWNER/ADMIN만, F04-05 트리거)
  - 역할 필터 TabBar: 전체(N) / 관리자(N) / 일반(N)
  - 멤버 ListTile (48dp 아바타, 이름, 역할 배지, 가입일 캡션, 더보기 ⋮)
  - 무한 스크롤
- **사용자가 할 수 있는 액션**:
  - 탭 선택 ▶ `clubMemberListNotifier.setRoleFilter('ADMIN' / null)` ▶ `GET .../members?role=ADMIN&page=0`
  - 카드 탭 ▶ 사용자 프로필 화면 (Unit 02)
  - 더보기 ⋮ / 롱프레스 ▶ `MemberActionSheet`:
    - "역할 변경" (OWNER일 때만 ADMIN 대상 표시) ▶ `RoleChangeSheet` (RadioGroup ADMIN/MEMBER) ▶ `changeRole(userId, role)` ▶ `POST .../members/:userId/role`
    - "추방" ▶ `ClubMembershipActionSheet(kind: kick)` (사유코드 Radio + reasonText + 증빙 업로드) ▶ `kickMember(userId, reasonCode, reasonText, evidenceFileIds)` ▶ `POST .../members/:userId/kick`
    - "차단" ▶ `ClubMembershipActionSheet(kind: ban)` → F04-06
  - 무한 스크롤 끝 ▶ `loadMore()`
  - 풀투리프레시 ▶ refresh
- **상태 분기**:
  - 본인이 MEMBER → ⋮ 자체 미표시 (액션 권한 없음)
  - 본인 ADMIN 대상이 ADMIN → "역할 변경" 항목 미표시 + "추방"/"차단" 미표시 (서버에서도 막음)
  - 본인 ADMIN 대상이 OWNER → 액션 미표시
  - 본인 OWNER → 모든 액션 가능 (단 OWNER는 자기 자신 대상으로 추방/역할변경 막힘)
  - 로딩/에러/빈 상태 표준
- **모달/시트/네비게이션**:
  - 액션 시트 (Bottom Sheet)
  - 역할 변경 Bottom Sheet (SCR-CL-008)
  - 추방 확인 다이얼로그
  - 차단 사유 입력 다이얼로그 (F04-06)

## 4. 제품 규칙

- 강퇴 사유 코드는 필수다: 괴롭힘, 규칙 위반, 장기 미활동, 민원 누적, 기타. 보충 설명은 500자, 증빙은 5개까지다. 기타의 5자 이상은 화면이 막고 서버는 보지 않는다.
- 강퇴하면 가입비를 7일 기간과 상관없이 전액 환불하고 그만큼 기금에서 뺀다. 강퇴당한 사람에게 알림이 가고, 그 사람은 이의를 제기할 수 있다.
- 권한 비트: ADMIN 의 세부 권한은 회원마다 비트로 위임한다(마일리지, 경고 검토, 출석, 보상, 제재 제안, 정책, 배지, 메시지 관리, 환불 처리, 분쟁 해결, 도장판 발행). 앱은 저장할 때 자기가 모르는 비트를 지우지 않고 보존한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | OWNER가 일반 멤버를 ADMIN으로 승격 | OWNER. 박민수(MEMBER)를 ADMIN으로. | 박민수 ADMIN. 게시판/멤버/이벤트 관리 권한 부여. |
| S2 | ADMIN이 역할 변경 시도 (실패) | ADMIN. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | OWNER 역할 변경 시도 (방지) | OWNER가 다른 ADMIN을 OWNER로 바꾸려 함. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | ADMIN이 MEMBER를 추방 (Happy Path) | ADMIN. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | ADMIN이 다른 ADMIN을 추방 시도 (실패) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | OWNER가 ADMIN을 추방 (가능) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | OWNER가 자기 자신 대상 추방 시도 (방지) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 역할 필터로 ADMIN만 보기 | 시나리오 본문 참조 | 필터된 목록. |
| S9 | 비멤버가 멤버 목록 진입 시도 (에러) | 시드 클럽(clubId=1201)에 멤버 다수(`alice`, `bora` 등) 존재. | 시트 노출. 사용자는 3개 액션 중 하나를 선택하거나 시트를 닫는다. |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | ClubMembershipAction 조회 API 미노출 | 서버 `ClubMembershipActionRepository`에 `findByUserId/findByClubId` 있으나 Controller endpoint 없음 | 피강퇴 사용자가 자신의 강퇴 이력을 직접 조회할 방법 없음 (dispute 화면 경유가 유일) | 조회 endpoint 추가 필요 여부 결정 |
| P2 | `ClubMemberWait.message`와 `ClubMembershipAction.reasonText` 이중 저장 | `banMember`가 두 필드 모두 기록. UNBAN 후 `ClubMemberWait` 행 삭제 시 `ClubMembershipAction`에만 이력 남음 | 차단 목록 화면(`club_ban_list_screen.dart`)의 "사유" 표시가 어떤 소스를 쓰는지 불명 | 차단 목록 화면 BanCard의 사유 표시 소스 확인 |

## 9. 수용 기준

- **AC-01. OWNER가 일반 멤버를 ADMIN으로 승격**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 박민수 ADMIN. 게시판/멤버/이벤트 관리 권한 부여.
- **AC-02. ADMIN이 역할 변경 시도 (실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. OWNER 역할 변경 시도 (방지)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. ADMIN이 MEMBER를 추방 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. ADMIN이 다른 ADMIN을 추방 시도 (실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. OWNER가 ADMIN을 추방 (가능)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. OWNER가 자기 자신 대상 추방 시도 (방지)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 역할 필터로 ADMIN만 보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 필터된 목록.
- **AC-09. 비멤버가 멤버 목록 진입 시도 (에러)**: Given 시드 클럽(clubId=1201)에 멤버 다수(`alice`, `bora` 등) 존재. When 사용자가 해당 흐름을 실행하면 Then 시트 노출. 사용자는 3개 액션 중 하나를 선택하거나 시트를 닫는다.
