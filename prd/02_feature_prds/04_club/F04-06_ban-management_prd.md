# F04-06. 차단 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/04_club/F04-06_ban-management -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-06_ban-management`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

OWNER/ADMIN이 멤버를 차단(BAN)하면 자동 추방되고 재가입이 불가해진다. 차단 시 가입비는 강제 환불(BANNED 사유 — 7일 가드 무관)되며, 동시에 진행 중이던 APPLY/INVITE 대기 레코드도 정리한다. 차단 목록 조회와 해제는 두 가지 경로(멤버 경로 / 전용 `/bans` 경로)가 모두 같은 동작을 한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 설정 > "차단 관리" — OWNER/ADMIN
- 멤버 목록(F04-04) 액션 시트의 "차단" 항목 → 차단 사유 다이얼로그 → 호출

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-06_ban-management/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-06_ban-management/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-06_ban-management/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-06_ban-management/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:233` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:243` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:258` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:271` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

OWNER/ADMIN이 멤버를 차단(BAN)하면 자동 추방되고 재가입이 불가해진다. 차단 시 가입비는 강제 환불(BANNED 사유 — 7일 가드 무관)되며, 동시에 진행 중이던 APPLY/INVITE 대기 레코드도 정리한다. 차단 목록 조회와 해제는 두 가지 경로(멤버 경로 / 전용 `/bans` 경로)가 모두 같은 동작을 한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/clubs/{id}/members/{userId}/ban | ClubController#banMember | required (OWNER/ADMIN) | 차단 (자동 추방 + 환불) — **reasonCode 필수** |
| DELETE | /api/v1/clubs/{id}/members/{userId}/ban | ClubController#unbanMember | required (OWNER/ADMIN) | 차단 해제 (멤버 경로) |
| GET | /api/v1/clubs/{id}/bans | ClubController#getBanList | required (OWNER/ADMIN) | 차단 목록 (waitType=BAN 고정) |
| DELETE | /api/v1/clubs/{id}/bans/{userId} | ClubController#unbanMemberByBanPath | required (OWNER/ADMIN) | 차단 해제 (전용 경로 — 동일 동작) |

### ClubBanReasonCode enum

소스: `club/constants/ClubBanReasonCode.java`

| 값 | 설명 |
|---|---|
| `HARASSMENT` | 괴롭힘/욕설 |
| `RULES_VIOLATION` | 클럽 규칙 위반 |
| `INACTIVITY` | 장기 비활동 |
| `MEMBER_COMPLAINTS` | 다른 멤버 민원 |
| `REPEAT_OFFENDER` | 반복 위반 (강퇴 이후 재가입 등) |
| `IRREVERSIBLE` | 돌이킬 수 없는 행위 |
| `OTHER` | 기타 (reasonText 5자 이상 필수) |

> `REPEAT_OFFENDER` / `IRREVERSIBLE`은 강퇴(`ClubKickReasonCode`)에 없는 차단 전용 값이다.

### ClubBanParam 계약

소스: `club/param/ClubBanParam.java`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `reasonCode` | `ClubBanReasonCode` | YES | `@NotNull` — 미제공 시 `CLUB_BAN_REASON_REQUIRED(1400034)` |
| `reasonText` | `String` | NO | 보충 설명 (max 500자) |
| `reason` | `String` | NO | **`@Deprecated(forRemoval=true)`** — 하위호환 alias, `reasonText` 우선 |
| `evidenceFileIds` | `List<Long>` | NO | 증빙 파일 ID (max 5개) |

### 차단/해제 처리 흐름

**banMember** (`ClubWaitlistService.banMember`):
1. `reasonCode == null` → `CLUB_BAN_REASON_REQUIRED`
2. ADMIN 권한 검증
3. 이미 BAN인 경우 → `INVALID_INPUT`
4. 대상 OWNER/ADMIN 처리 (ADMIN은 OWNER만 BAN 가능)
5. 가입비 환불 (`BANNED` — 7일 가드 무관)
6. 멤버 삭제 + 대기열(APPLY/INVITE) 레코드 정리
7. `club_member_wait` BAN row INSERT
8. **`recordMembershipAction(... "BAN" ...)` — appeal 진입로 + 감사 로그**
9. `CLUB_MEMBER_BANNED` FCM 알림

**unbanMember** (`ClubWaitlistService.unbanMember`):
- `club_member_wait` BAN row **하드 삭제** (차단 목록에서 사라짐)
- `recordMembershipAction(... "UNBAN", "UNBAN", null, null)` — `ClubMembershipAction` 이력 보존

### ClubMembershipAction 연계 (BAN/UNBAN)

- BAN/UNBAN 행 생성: `club_membership_action` 테이블 (소스: `V1__init.sql:700-719`)
- `DisputeSourceType.CLUB_MEMBERSHIP_ACTION`, `caseId = "CLUB_MEMBERSHIP_ACTION:{actionId}"`
- `DisputeCaseQueryRepository`에서 BAN → `HOST_ACTION_REVIEW` 케이스로 파생 (union 방식)
- `reporter = userId(피차단)`, `target = actorUserId(관리자/오너)`
- 피차단 사용자가 dispute 화면을 통해 이의제기 가능

### 에러 코드

| ErrorCode | HTTP | 내부코드 |
|---|---|---|
| `CLUB_BAN_REASON_REQUIRED` | 400 | 1400034 |
| `CLUB_NO_PERMISSION` | 403 | 1400009 |
| `CLUB_BANNED` | 403 | 1400006 |
| `INVALID_INPUT` | 400 | (기존) |

### 의존 단위 / 외부 시스템

- **Unit 06 (payment/wallet)**: 강제 환불 (`WalletRefundService.refundByTransaction` — 원결제 split 복원, `refundToWallet`는 2026-06-06 해소·본체 차단; `recordMemberFeeRefund`/`recordMemberFeeRefundWithShortfall`).
  - 기금 잔액 < 환불액이면 부족분은 플랫폼 선지급(`addOutstandingDebt`)으로 처리.
- **Unit 11 (notification)**: `CLUB_MEMBER_BANNED` FCM.
- **F04-13~14**: ClubFund 잔액 차감.
- **dispute (host/dispute)**: `ClubMembershipAction` 행이 `DisputeSourceType.CLUB_MEMBERSHIP_ACTION` union 소스로 피차단 사용자의 이의제기 진입로가 된다.

## 5. 프론트 계약

### 진입 경로

- 클럽 설정 > "차단 관리" — OWNER/ADMIN
- 멤버 목록(F04-04) 액션 시트의 "차단" 항목 → 차단 사유 다이얼로그 → 호출

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/clubs/:id/bans` | `screens/club_ban_list_screen.dart` | 차단 목록 + 해제 |
| `widgets/ban_card.dart` | 차단 카드 (이름, 차단일, 사유, 해제 버튼) |
| `widgets/unban_dialog.dart` | 차단 해제 확인 다이얼로그 |
| 차단 사유 입력 다이얼로그 | (멤버 액션 시트에서 호출, 본 단위 dedicated widget 외 일반 AppDialog) |

### 화면별 구성 요소 & 액션

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

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
