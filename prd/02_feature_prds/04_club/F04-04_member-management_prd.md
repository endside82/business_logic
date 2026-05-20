# F04-04. 멤버 관리 (목록 / 역할 변경 / 추방) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-04_member-management -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-04_member-management`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

멤버 목록을 역할별로 필터링해 페이징 조회하고, OWNER가 역할을 변경하거나 OWNER/ADMIN이 멤버를 추방한다. 차단(BAN)은 별도 기능으로 F04-06 참조. 권한 매트릭스가 핵심: ADMIN은 다른 ADMIN을 추방·차단·역할변경할 수 없으며, OWNER만 ADMIN을 다룰 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 멤버 섹션 "멤버 전체 보기 →" (F04-02)
- 클럽 상세 헤더 → 멤버 카운트 탭

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-04_member-management/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-04_member-management/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-04_member-management/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-04_member-management/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:136` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:144` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:154` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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
    - "추방" ▶ 확인 다이얼로그 ▶ `kickMember(userId)` ▶ `DELETE .../members/:userId`
    - "차단" ▶ F04-06 (BanParam 사유 입력)
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

## 4. 서버 계약

### 개요

멤버 목록을 역할별로 필터링해 페이징 조회하고, OWNER가 역할을 변경하거나 OWNER/ADMIN이 멤버를 추방한다. 차단(BAN)은 별도 기능으로 F04-06 참조. 권한 매트릭스가 핵심: ADMIN은 다른 ADMIN을 추방·차단·역할변경할 수 없으며, OWNER만 ADMIN을 다룰 수 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/clubs/{id}/members | ClubController#getMembers | required (멤버) | 역할 필터 + 페이징 |
| POST | /api/v1/clubs/{id}/members/{userId}/role | ClubController#changeRole | required (OWNER) | 역할 변경 |
| DELETE | /api/v1/clubs/{id}/members/{userId} | ClubController#kickMember | required (OWNER/ADMIN) | 추방 |

### 의존 단위 / 외부 시스템

- **Unit 06 (payment/wallet)**: `WalletService.refundToWallet`, `AccountingLedgerService.recordMemberFeeRefund` — BUSINESS 클럽 강퇴 시 가입비 환불.
- **Unit 11 (notification)**: `NotificationService` — `CLUB_MEMBER_KICKED` FCM.
- **F04-13~14 (이 단위 후반)**: `ClubFundService.deductFromFund` — 환불 시 기금 차감.

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 멤버 섹션 "멤버 전체 보기 →" (F04-02)
- 클럽 상세 헤더 → 멤버 카운트 탭

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/clubs/:id/members` | `screens/club_member_list_screen.dart` | 멤버 목록 + 역할 필터 |
| `widgets/member_card.dart` | 멤버 카드 (아바타, 이름, 역할 배지, 가입일) |
| `widgets/role_badge.dart` | OWNER(금색)/ADMIN(파랑) 배지 |
| `widgets/member_action_sheet.dart` | 더보기 ⋮/롱프레스 액션 시트 |
| `widgets/role_change_sheet.dart` | 역할 변경 Bottom Sheet (SCR-CL-008) |

### 화면별 구성 요소 & 액션

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
    - "추방" ▶ 확인 다이얼로그 ▶ `kickMember(userId)` ▶ `DELETE .../members/:userId`
    - "차단" ▶ F04-06 (BanParam 사유 입력)
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

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
