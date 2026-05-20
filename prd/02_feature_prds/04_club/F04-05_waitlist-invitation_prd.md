# F04-05. 가입 대기열 승인/거절 & 초대 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-05_waitlist-invitation -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-05_waitlist-invitation`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

승인가입(JOIN_APPROVAL) 클럽에서 OWNER/ADMIN이 가입 신청을 승인하거나 거절한다. 동시에 ADMIN+가 다른 사용자를 직접 초대해 `INVITE` 대기 레코드를 만들고, 피초대자가 수락/거절한다. 모든 동작은 `club_member_wait` 테이블의 `waitType` 분기(APPLY / INVITE)로 작동하며, 단계마다 양 당사자에게 FCM이 발송된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 멤버 목록(F04-04) > "대기열" 탭 (또는 별도 진입 메뉴)
- 알림 클릭 → `CLUB_JOIN_REQUEST` 푸시 → DeepLink → `/clubs/:id/waitlist`
- 멤버 목록 우상단 "초대" 버튼 → 초대 화면
- 알림 클릭 → `CLUB_INVITATION` 푸시 → 사용자 알림함에서 수락/거절 액션

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-05_waitlist-invitation/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-05_waitlist-invitation/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-05_waitlist-invitation/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-05_waitlist-invitation/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:178` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:186` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:195` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:206` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:215` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:224` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

승인가입(JOIN_APPROVAL) 클럽에서 OWNER/ADMIN이 가입 신청을 승인하거나 거절한다. 동시에 ADMIN+가 다른 사용자를 직접 초대해 `INVITE` 대기 레코드를 만들고, 피초대자가 수락/거절한다. 모든 동작은 `club_member_wait` 테이블의 `waitType` 분기(APPLY / INVITE)로 작동하며, 단계마다 양 당사자에게 FCM이 발송된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/clubs/{id}/waitlist | ClubController#getWaitlist | required (멤버) | 대기열 조회 (waitType 필터) |
| POST | /api/v1/clubs/{id}/waitlist/{waitId}/approve | ClubController#approveApplication | required (OWNER/ADMIN) | 승인 → 멤버 등록 |
| POST | /api/v1/clubs/{id}/waitlist/{waitId}/reject | ClubController#rejectApplication | required (OWNER/ADMIN) | 거절 |
| POST | /api/v1/clubs/{id}/invitations | ClubController#inviteMember | required (OWNER/ADMIN) | 초대 |
| POST | /api/v1/clubs/{id}/invitations/{invitationId}/accept | ClubController#acceptInvite | required (피초대자) | 초대 수락 |
| POST | /api/v1/clubs/{id}/invitations/{invitationId}/decline | ClubController#declineInvite | required (피초대자) | 초대 거절 |

### 의존 단위 / 외부 시스템

- **Unit 01 (account)**: `UserRepository.findByUserIdIn` (닉네임 enrich).
- **Unit 06 (payment)**: 승인 시 BUSINESS 가입비 결제 (지갑/회계).
- **F04-13~14**: ClubFund 잔액 변동.
- **Unit 11 (notification)**: FCM 5종.
- **외부**: FCM (Firebase Admin), 별도 외부 시스템 없음.

## 5. 프론트 계약

### 진입 경로

- 클럽 멤버 목록(F04-04) > "대기열" 탭 (또는 별도 진입 메뉴)
- 알림 클릭 → `CLUB_JOIN_REQUEST` 푸시 → DeepLink → `/clubs/:id/waitlist`
- 멤버 목록 우상단 "초대" 버튼 → 초대 화면
- 알림 클릭 → `CLUB_INVITATION` 푸시 → 사용자 알림함에서 수락/거절 액션

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/clubs/:id/waitlist` | `screens/club_waitlist_screen.dart` | 대기 신청자 목록 + 승인/거절 |
| `widgets/waitlist_card.dart` | 대기자 카드 (이름, 신청일, 메시지, 승인/거절 버튼) |
| `widgets/reject_dialog.dart` | 거절 사유 입력 다이얼로그 |
| 초대 화면 | (별도, 사용자 검색 후 `inviteMember` 호출) — 본 단위에서는 멤버 액션 시트의 "초대" 항목으로 가정 |

### 화면별 구성 요소 & 액션

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

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | scenarios.md:97 | ### S1 보강 — 대기열 화면 surface 검증 (운영진이 시드 대기 사용자 확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
