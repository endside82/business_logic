# F04-02. 클럽 상세 보기 & 가입/탈퇴 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-02_club-detail-join -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-02_club-detail-join`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽의 메타정보(이름/카테고리/소개/멤버수/소유자)를 조회하면서 동시에 현재 사용자의 멤버십 컨텍스트(`myRole`, `myMembershipStatus`)를 함께 내려준다. 가입은 자유가입(즉시 멤버)/승인가입(대기열) 두 결과 타입(`MEMBER`/`WAITLIST`)을 같은 엔드포인트(`POST .../join`)로 분기 처리한다. 탈퇴는 `DELETE .../leave`로 OWNER만 제외하고 가능하다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 목록 카드 탭 (F04-01)
- 내 클럽 카드 탭 (F04-07)
- 알림 클릭 (가입 승인/거절/초대 등 → DeepLink → `/clubs/:id`)
- 딥링크 `community://clubs/{id}`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-02_club-detail-join/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-02_club-detail-join/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-02_club-detail-join/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-02_club-detail-join/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:115` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:124` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:76` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입: `clubDetailNotifierProvider(clubId).build()` ▶ `clubRepository.getClubDetail` ▶ `GET /api/v1/clubs/:id`
2. 가입 액션: `clubJoinNotifierProvider.joinClub(clubId, message)` ▶ `clubRepository.joinClub` ▶ `POST /api/v1/clubs/:id/join`
   - 성공: `clubDetailNotifier.refresh()`로 상세 재조회 + `clubListNotifier` invalidate (목록 카드 상태 동기화)
3. 탈퇴 액션: `leaveClub` ▶ `DELETE /api/v1/clubs/:id/leave` ▶ pop + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate
4. 권한 정보: `clubPermissionProvider(clubId)` (별도 provider) — myRole 기준 staff 메뉴 가시성 결정
5. 예정 이벤트 미리보기: `clubUpcomingEventsProvider(clubId)` (Unit 04 F04-12로 분리)

## 4. 서버 계약

### 개요

클럽의 메타정보(이름/카테고리/소개/멤버수/소유자)를 조회하면서 동시에 현재 사용자의 멤버십 컨텍스트(`myRole`, `myMembershipStatus`)를 함께 내려준다. 가입은 자유가입(즉시 멤버)/승인가입(대기열) 두 결과 타입(`MEMBER`/`WAITLIST`)을 같은 엔드포인트(`POST .../join`)로 분기 처리한다. 탈퇴는 `DELETE .../leave`로 OWNER만 제외하고 가능하다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/clubs/{id} | ClubController#getClub | optional | 상세 + myRole/myMembershipStatus |
| POST | /api/v1/clubs/{id}/join | ClubController#joinClub | required | FREE→즉시 멤버 / APPROVAL→대기열 |
| DELETE | /api/v1/clubs/{id}/leave | ClubController#leaveClub | required | 멤버 탈퇴 (OWNER 제외) |

### 도메인 모델 / Enum (이 기능 관련)

- **`JoinType`**: `APPROVAL(0)`, `FREE(1)`.
- **`ClubStatus`**: `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- **`MemberRole`**: `MEMBER(0)`, `ADMIN(1)`, `OWNER(2)`.
- **`WaitType`**: `APPLY`, `INVITE`, `BAN` — 가입 시 APPLY/BAN 검사에 사용.
- **`ClubType`**: `FREE(0)`, `BUSINESS(1)` — BUSINESS면 가입비 결제.
- **`JoinResultVo.resultType`**: 문자열 "MEMBER" / "WAITLIST" (Java enum 아님, factory `ofMember`/`ofWaitlist`).

### 의존 단위 / 외부 시스템

- **Unit 06 (payment)**: `WalletService.deductFromWallet`, `WalletRefundService.refundByTransaction`(원결제 split 복원 — `refundToWallet`는 2026-06-06 해소·본체 차단), `AccountingLedgerService.recordMemberFee`/`recordMemberFeeRefund` — BUSINESS 가입비 결제/환불.
- **Unit 11 (notification)**: `NotificationService.createNotification` (`CLUB_JOIN_REQUEST`, `CLUB_MEMBER_LEFT`) → 내부적으로 FCM 발송.
- **Unit 01 (account)**: `Users` (nickname 표시).

## 5. 프론트 계약

### 진입 경로

- 클럽 목록 카드 탭 (F04-01)
- 내 클럽 카드 탭 (F04-07)
- 알림 클릭 (가입 승인/거절/초대 등 → DeepLink → `/clubs/:id`)
- 딥링크 `community://clubs/{id}`

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/clubs/:clubId` | `club/screens/club_detail_screen.dart` | 클럽 상세 + 가입/탈퇴 CTA |

### 화면별 구성 요소 & 액션

### 클럽 상세 (`club_detail_screen.dart`)

- **사용자가 보는 것**:
  - `ClubDetailHeader` — 240dp 커버 이미지(Parallax), 좌상단 뒤로가기 반투명 원형, 우상단 설정 톱니(OWNER/ADMIN), 더보기 ⋮
  - `ClubInfoSection` — 클럽명(H5 Bold), 카테고리 + 위치 라벨, "멤버 N명 · 이벤트 N개"
  - `ClubDescription` — `ExpandableText` (3줄 이상 시 "더보기")
  - `ClubEventPreview` — 예정 이벤트 최대 3개 카드 + "전체 이벤트 보기 →" (F04-12로 이동)
  - `ClubMemberPreview` — 5개 아바타 + "멤버 전체 보기 →" (F04-04로 이동)
  - `ClubJoinButton` — 화면 하단 고정 BottomCTA (권한별 분기)
- **사용자가 할 수 있는 액션**:
  - "가입하기" (비멤버) ▶ `clubJoinNotifier.joinClub(clubId, message?)` ▶ `POST /api/v1/clubs/:id/join`
    - 서버 응답 `JoinResult.resultType="MEMBER"` → `AppToast.show("가입 완료")` + 화면 갱신, "클럽 홈" CTA로 전환
    - `resultType="WAITLIST"` → `AppToast.show("가입 신청 완료, 승인 대기 중")` + "승인 대기 중" 비활성 버튼
    - APPROVAL 클럽이면 가입 메시지 입력 다이얼로그(`AppDialog`) 선표시
  - "승인 대기 중" — 비활성, tap 불가
  - "클럽 홈" (멤버) ▶ `context.push('/clubs/:id/community')` (커뮤니티 진입, F04-08~)
  - 설정 톱니 (OWNER/ADMIN) ▶ `/clubs/:id/settings`
  - 더보기 ⋮ ▶ 바텀시트: 공유 / 신고 / 탈퇴 (멤버일 때만)
  - "탈퇴" 선택 ▶ 확인 다이얼로그 → `clubJoinNotifier.leaveClub` ▶ `DELETE /api/v1/clubs/:id/leave` ▶ 성공 시 `context.pop()` + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate
  - "가입할 수 없습니다" (BANNED) — 비활성
- **상태 분기**:
  - 로딩: `SkeletonLoader` (헤더/정보/이벤트/멤버 영역)
  - 에러: `AppErrorState(title:)` + 재시도
  - SUSPENDED 클럽 진입: `AppErrorState(title: '이 클럽은 운영이 중지되었습니다')` 노출 (전체 차단)
  - OWNER: 가입 버튼 자체 미렌더 (설정 진입으로 유도)
- **모달/시트/네비게이션**:
  - 더보기 ⋮ → 바텀시트
  - 가입(APPROVAL) → 가입 메시지 다이얼로그 (`AppDialog`)
  - 탈퇴 → 확인 다이얼로그
  - 상세 → 멤버목록/이벤트목록/커뮤니티/설정으로 push

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입: `clubDetailNotifierProvider(clubId).build()` ▶ `clubRepository.getClubDetail` ▶ `GET /api/v1/clubs/:id`
2. 가입 액션: `clubJoinNotifierProvider.joinClub(clubId, message)` ▶ `clubRepository.joinClub` ▶ `POST /api/v1/clubs/:id/join`
   - 성공: `clubDetailNotifier.refresh()`로 상세 재조회 + `clubListNotifier` invalidate (목록 카드 상태 동기화)
3. 탈퇴 액션: `leaveClub` ▶ `DELETE /api/v1/clubs/:id/leave` ▶ pop + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate
4. 권한 정보: `clubPermissionProvider(clubId)` (별도 provider) — myRole 기준 staff 메뉴 가시성 결정
5. 예정 이벤트 미리보기: `clubUpcomingEventsProvider(clubId)` (Unit 04 F04-12로 분리)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **CTA 라벨 분기**: "가입하기" / "승인 대기 중" / "클럽 홈" / "가입할 수 없습니다" — myMembershipStatus + myRole로 클라이언트 결정
- **가입 메시지 입력**: APPROVAL 클럽일 때만 다이얼로그 노출 (FREE는 즉시 호출)
- **OWNER 탈퇴 가드**: 클라이언트는 더보기 메뉴에서 "탈퇴" 항목을 OWNER에게는 미표시 (서버는 별도로 `CLUB_CANNOT_LEAVE_AS_OWNER`로 막음)
- **SUSPENDED 차단**: 서버는 SUSPENDED 클럽 자체를 응답하나, 프론트가 화면 진입 시점에 전체 컨텐츠를 차단하고 안내문 노출
- **이벤트 프리뷰 갯수**: 최대 3개 (`ClubEventPreview`가 자체적으로 가용성 판단)
- **멤버 프리뷰**: 5개 아바타 + 잔여 카운트
- **토스트 문구**: "가입 완료" / "가입 신청 완료, 승인 대기 중" / "탈퇴 완료" — UI/UX 스펙 SCR-CL-002와 일치
- **딥링크 진입 시 인증 가드**: 비로그인이 가입 액션 누르면 라우터가 로그인으로 redirect

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 자유가입 클럽 즉시 가입 (Happy Path) | `joinType=FREE`, `clubType=FREE` (가입비 없음). | ACTIVE 멤버, OWNER에게는 알림 미발송 (FREE 가입은 알림 분기 없음). |
| S2 | 승인가입 클럽 신청 → 대기열 | `joinType=APPROVAL`. | `myMembershipStatus=PENDING`. 추후 승인은 F04-05. |
| S3 | 중복 가입 시도 / 이미 신청 중 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 비멤버 탈퇴 (멤버 → 탈퇴) | ACTIVE MEMBER, 가입 30일 경과. | ACTIVE 멤버 아님. |
| S5 | OWNER 탈퇴 시도 (실패 시나리오) | 클럽 OWNER. | 여전히 OWNER. F04-03의 소유권 이전을 안내. |
| S6 | BUSINESS 클럽 자유가입 (가입비 결제, FREE join) | `clubType=BUSINESS`, `memberFee=10000`, `joinType=FREE`. | 멤버. 7일 내 탈퇴 시 가입비 환불 가능. |
| S7 | SUSPENDED 클럽 진입 (에러 시나리오) | alice 가 이미 club 1201 의 ADMIN. 시드 club_member 1222 ACTIVE. | 가입 시도 불가. |

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

- **AC-01. 자유가입 클럽 즉시 가입 (Happy Path)**: Given `joinType=FREE`, `clubType=FREE` (가입비 없음). When 사용자가 해당 흐름을 실행하면 Then ACTIVE 멤버, OWNER에게는 알림 미발송 (FREE 가입은 알림 분기 없음).
- **AC-02. 승인가입 클럽 신청 → 대기열**: Given `joinType=APPROVAL`. When 사용자가 해당 흐름을 실행하면 Then `myMembershipStatus=PENDING`. 추후 승인은 F04-05.
- **AC-03. 중복 가입 시도 / 이미 신청 중**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 비멤버 탈퇴 (멤버 → 탈퇴)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then ACTIVE 멤버 아님.
- **AC-05. OWNER 탈퇴 시도 (실패 시나리오)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 여전히 OWNER. F04-03의 소유권 이전을 안내.
- **AC-06. BUSINESS 클럽 자유가입 (가입비 결제, FREE join)**: Given `clubType=BUSINESS`, `memberFee=10000`, `joinType=FREE`. When 사용자가 해당 흐름을 실행하면 Then 멤버. 7일 내 탈퇴 시 가입비 환불 가능.
- **AC-07. SUSPENDED 클럽 진입 (에러 시나리오)**: Given alice 가 이미 club 1201 의 ADMIN. 시드 club_member 1222 ACTIVE. When 사용자가 해당 흐름을 실행하면 Then 가입 시도 불가.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
