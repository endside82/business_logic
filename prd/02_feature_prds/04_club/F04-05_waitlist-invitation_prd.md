# F04-05. 가입 대기열 승인/거절 & 초대 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

승인가입(JOIN_APPROVAL) 클럽에서 OWNER/ADMIN이 가입 신청을 승인하거나 거절한다. 동시에 ADMIN+가 다른 사용자를 직접 초대해 `INVITE` 대기 레코드를 만들고, 피초대자가 수락/거절한다. 모든 동작은 `club_member_wait` 테이블의 `waitType` 분기(APPLY / INVITE)로 작동하며, 단계마다 양 당사자에게 FCM이 발송된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 멤버 목록(F04-04) > "대기열" 탭 (또는 별도 진입 메뉴)
- 알림 클릭 → `CLUB_JOIN_REQUEST` 푸시 → DeepLink → `/clubs/:id/waitlist`
- 멤버 목록 우상단 "초대" 버튼 → 초대 화면
- 알림 클릭 → `CLUB_INVITATION` 푸시 → 사용자 알림함에서 수락/거절 액션

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`. 앱: `club_waitlist_screen.dart`, `waitlist_card.dart`, `reject_dialog.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#getWaitlist`, `ClubController#approveApplication`, `ClubController#rejectApplication`, `ClubController#inviteMember`, `ClubController#acceptInvite`, `ClubController#declineInvite`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 가입 대기열 (`club_waitlist_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "가입 대기열 (5)"
  - WaitlistCard 리스트 (스크롤):
    - 프로필 + 이름 + "신청일: YYYY.MM.DD"
    - 가입 메시지 (Body2, 2줄 제한)
    - 우하단 [거절] [승인] OutlinedButton 한 쌍
  - 빈 상태: "대기 중인 가입 신청이 없습니다"
- **사용자가 할 수 있는 액션**:
  - "승인" 탭 ▶ `clubWaitlistNotifier.approve(waitId)` ▶ `POST .../waitlist/:waitId/approve` ▶ 성공 시 카드 슬라이드아웃 (state에서 제거)
  - "거절" 탭 ▶ `RejectDialog` (사유 선택 입력) ▶ `reject(waitId, reason)` ▶ `POST .../waitlist/:waitId/reject` body `{reason}` ▶ 카드 제거
  - 풀투리프레시 ▶ `refresh()`
- **상태 분기**: 로딩/에러/빈상태 표준
- **모달/시트/네비게이션**: 거절 사유 다이얼로그 (사유 입력은 선택)

### 초대 (멤버 액션 시트 / 검색 화면)

- **구성**:
  - 사용자 검색 (Unit 01 account `/api/v1/users/search` 활용) → `userId` 선택
  - 초대 메시지 입력 (선택)
- **액션**:
  - "초대" ▶ `clubMemberRepository.inviteMember(clubId, userId, message)` ▶ `POST /api/v1/clubs/:id/invitations`
  - 성공 시 토스트 "초대를 보냈습니다"
- **에러 매핑**:
  - `CLUB_ALREADY_MEMBER`: "이미 클럽 멤버입니다"
  - `CLUB_ALREADY_INVITED`: "이미 초대 중입니다"
  - `CLUB_BANNED`: "차단된 사용자에게는 초대할 수 없습니다"
  - `CLUB_SUBSCRIPTION_EXPIRED`: "구독이 만료된 클럽입니다 — 구독을 갱신해 주세요" (BUSINESS만)

### 초대 수락/거절 (피초대자, 알림 → 내 알림함)

- 알림함의 `CLUB_INVITATION` 항목에서 [수락]/[거절] 액션:
  - 수락 ▶ `POST /api/v1/clubs/:id/invitations/:invitationId/accept` ▶ 성공 시 `context.go('/clubs/:id')` (클럽 상세 진입)
  - 거절 ▶ `POST .../decline` ▶ 토스트 "초대를 거절했습니다"

## 4. 제품 규칙

- 초대는 7일 동안 유효하다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 신청자 → 승인 흐름 (Happy Path) | ADMIN. 박지수가 어제 신청. | 박지수 ACTIVE 멤버. 박지수는 알림 받고 클럽 홈 진입 가능. |
| S2 | 거절 + 사유 입력 | ADMIN. | 신청자는 거절 알림만 받음. 사유는 노출되지 않음. |
| S3 | BUSINESS 클럽 승인 시점 가입비 결제 | ADMIN. 신청자 김철수, 클럽 가입비 5,000원. | 김철수 멤버 + 가입비 5,000원 납부됨. |
| S4 | ADMIN이 다른 사용자 초대 (Happy Path) | ADMIN. 친구 이영희를 초대. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 초대 수락 (피초대자) | 이영희. | 이영희 ACTIVE MEMBER. 초대자도 알림 받음. |
| S6 | 초대 거절 | 시나리오 본문 참조 | wait 삭제. 초대자에게는 별도 알림 없음. |
| S7 | 만료된 초대 수락 시도 (8일 후) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | BUSINESS 클럽 구독 만료 상태 초대 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 차단된 사용자 초대 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 비멤버가 대기열 조회 시도 | 시드 클럽에 PENDING(APPLY) 신청자 존재. | 스태프는 멤버 목록 화면 내부에서 대기열을 조회할 수 있다. (S1 시나리오는 `/clubs/{id}/waitlist` 전용 라우트 진입을 가정 — 본 S11은 멤버 목록 화면 내부의 통합 탭 surface를 검증한다.) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 시험 보강 기록 | 운영진이 대기열 화면에서 대기 회원을 보는 시험 보강 기록이다. 결함이 아니다 | 없음 |

## 9. 수용 기준

- **AC-01. 신청자 → 승인 흐름 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 박지수 ACTIVE 멤버. 박지수는 알림 받고 클럽 홈 진입 가능.
- **AC-02. 거절 + 사유 입력**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 신청자는 거절 알림만 받음. 사유는 노출되지 않음.
- **AC-03. BUSINESS 클럽 승인 시점 가입비 결제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 김철수 멤버 + 가입비 5,000원 납부됨.
- **AC-04. ADMIN이 다른 사용자 초대 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 초대 수락 (피초대자)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이영희 ACTIVE MEMBER. 초대자도 알림 받음.
- **AC-06. 초대 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then wait 삭제. 초대자에게는 별도 알림 없음.
- **AC-07. 만료된 초대 수락 시도 (8일 후)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. BUSINESS 클럽 구독 만료 상태 초대 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 차단된 사용자 초대 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 비멤버가 대기열 조회 시도**: Given 시드 클럽에 PENDING(APPLY) 신청자 존재. When 사용자가 해당 흐름을 실행하면 Then 스태프는 멤버 목록 화면 내부에서 대기열을 조회할 수 있다. (S1 시나리오는 `/clubs/{id}/waitlist` 전용 라우트 진입을 가정 — 본 S11은 멤버 목록 화면 내부의 통합 탭 surface를 검증한다.)
