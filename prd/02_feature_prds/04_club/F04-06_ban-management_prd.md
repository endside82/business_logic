# F04-06. 차단 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

OWNER/ADMIN이 멤버를 차단(BAN)하면 자동 추방되고 재가입이 불가해진다. 차단 시 가입비는 강제 환불(BANNED 사유 — 7일 가드 무관)되며, 동시에 진행 중이던 APPLY/INVITE 대기 레코드도 정리한다. 차단 목록 조회와 해제는 두 가지 경로(멤버 경로 / 전용 `/bans` 경로)가 모두 같은 동작을 한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 설정 > "차단 관리" — OWNER/ADMIN
- 멤버 목록(F04-04) 액션 시트의 "차단" 항목 → 차단 사유 다이얼로그 → 호출

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `ClubBanReasonCode`, `ClubBanParam`, `ClubWaitlistService`. 앱: `club_ban_list_screen.dart`, `ban_card.dart`, `unban_dialog.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#banMember`, `ClubController#unbanMember`, `ClubController#getBanList`, `ClubController#unbanMemberByBanPath`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 차단 목록 (`club_ban_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "차단 목록 (3)"
  - BanCard 리스트:
    - 프로필 + 이름
    - "차단일: YYYY.MM.DD" Caption
    - "사유: {reason}" Body2 (없으면 "사유 미기재")
    - 우측 [차단 해제] OutlinedButton Small
  - 빈 상태: "차단된 멤버가 없습니다"
- **사용자가 할 수 있는 액션**:
  - 카드 탭 ▶ 사용자 프로필 진입 (선택적)
  - "차단 해제" ▶ `UnbanDialog` (확인 다이얼로그) ▶ `clubBanListNotifier.unban(userId)` ▶ `DELETE /api/v1/clubs/:id/bans/{userId}` ▶ 성공 시 카드 슬라이드아웃
  - 풀투리프레시 ▶ refresh
- **상태 분기**: 로딩/에러/빈상태 표준
- **모달**: 차단 해제 확인 다이얼로그

### 차단 (멤버 목록 → 액션 시트)

- 멤버 목록(F04-04) 카드 ⋮ → "차단" → **`ClubMembershipActionSheet(kind: ban)`** (사유코드 7개 Radio + reasonText 선택 + EvidencePickerField max 5) → "차단하기".
- ▶ `clubMemberRepository.banMember(clubId, userId, BanParam(reasonCode, reasonText, evidenceFileIds))` ▶ `POST /api/v1/clubs/:id/members/:userId/ban` body `{reasonCode, reasonText, evidenceFileIds}`
- 성공: 토스트 "차단되었습니다", 멤버 목록에서 사용자 제거(자동 추방됨), 차단 목록에 추가.
- 실패 매핑:
  - `CLUB_BAN_REASON_REQUIRED(1400034)`: 사유코드 미제공
  - `CLUB_NO_PERMISSION`: "권한이 없습니다 (OWNER만 ADMIN 차단 가능)"
  - `INVALID_INPUT`: "이미 차단된 사용자입니다"

## 4. 제품 규칙

- 차단 사유 코드는 필수다: 강퇴의 사유에 차단 전용인 반복 위반(REPEAT_OFFENDER)과 돌이킬 수 없는 행위(IRREVERSIBLE)를 더한 7개다. 보충 설명 500자, 증빙 5개까지, 기타의 5자 이상은 화면이 막는다.
- 회원이 아닌 사람도 차단할 수 있다(2026-10-23 사용자 결정).
- 가입비 환불에 기금이 모자라면 부족분은 플랫폼이 먼저 내고 클럽 미수금으로 남긴다.
- 차단당한 사람에게 알림이 가고, 그 사람은 이의를 제기할 수 있다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | ADMIN이 문제 멤버 차단 (Happy Path) | ADMIN. 부적절한 게시글 반복 작성하는 MEMBER 차단. | target은 클럽에서 자동 추방, 재가입 시도 시 `CLUB_BANNED` 응답. |
| S2 | ADMIN이 다른 ADMIN 차단 시도 (실패) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | OWNER가 ADMIN을 차단 (가능) | 시나리오 본문 참조 | 차단 효과는 동일. |
| S4 | 이미 차단된 사용자 재차단 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 차단된 사용자가 재가입 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 차단된 사용자에게 초대 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 차단 해제 (Happy Path) | 시나리오 본문 참조 | 차단 해제. target은 다시 가입 시도 가능. |
| S8 | 가입비 환불 잔액 부족 처리 (BUSINESS, 기금 부족) | 클럽 가입비 10,000원, ClubFund 잔액 3,000원, 차단 대상 BUSINESS 멤버. | 멤버 지갑 +10,000원 (전액). ClubFund 0원, 플랫폼 미수금 +7,000원. |
| S9 | 비멤버가 차단 목록 조회 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 차단 후 진행 중 APPLY/INVITE 정리 | 사용자가 APPLY 신청 중인 상태에서 ADMIN이 차단. | 대기열 화면에서 해당 신청자 카드도 사라짐. 다음 새로고침에 반영. |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | 차단 목록 화면 BanCard "사유" 표시 소스 불명 | `ClubWaitlistService.banMember`가 `ClubMemberWait.message`와 `ClubMembershipAction.reasonText` 두 곳에 모두 저장. 차단 해제(unban) 후에는 `ClubMemberWait` row 하드삭제로 `message`가 사라지고 `ClubMembershipAction`에만 이력 남음 | 차단 목록 화면의 "사유: {reason}" 표시가 어떤 소스를 쓰는지에 따라 차단 해제 후 이력 조회 불일치 가능성 | `club_ban_list_screen.dart` BanCard 사유 표시 소스 (`ClubMemberWait.message` vs `ClubMembershipAction.reasonText`) 확인 후 정합성 맞출 것 |
| P2 | ClubMembershipAction 조회 API 미노출 | 서버 `ClubMembershipActionRepository`에 `findByUserId/findByClubId` 있으나 Controller에 endpoint 없음 | 피차단 사용자가 자신의 차단 이력을 직접 조회할 방법 없음 (dispute 화면 경유가 유일) | 조회 endpoint 추가 필요 여부 결정 |

## 9. 수용 기준

- **AC-01. ADMIN이 문제 멤버 차단 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then target은 클럽에서 자동 추방, 재가입 시도 시 `CLUB_BANNED` 응답.
- **AC-02. ADMIN이 다른 ADMIN 차단 시도 (실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. OWNER가 ADMIN을 차단 (가능)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단 효과는 동일.
- **AC-04. 이미 차단된 사용자 재차단 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 차단된 사용자가 재가입 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 차단된 사용자에게 초대 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 차단 해제 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단 해제. target은 다시 가입 시도 가능.
- **AC-08. 가입비 환불 잔액 부족 처리 (BUSINESS, 기금 부족)**: Given 클럽 가입비 10,000원, ClubFund 잔액 3,000원, 차단 대상 BUSINESS 멤버. When 사용자가 해당 흐름을 실행하면 Then 멤버 지갑 +10,000원 (전액). ClubFund 0원, 플랫폼 미수금 +7,000원.
- **AC-09. 비멤버가 차단 목록 조회 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 차단 후 진행 중 APPLY/INVITE 정리**: Given 사용자가 APPLY 신청 중인 상태에서 ADMIN이 차단. When 사용자가 해당 흐름을 실행하면 Then 대기열 화면에서 해당 신청자 카드도 사라짐. 다음 새로고침에 반영.
