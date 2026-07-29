# F04-02. 클럽 상세 보기 & 가입/탈퇴 PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/04_club/F04-02_club-detail-join -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-02_club-detail-join`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽의 메타정보(이름/카테고리/소개/멤버수/소유자)를 조회하면서 동시에 현재 사용자의 멤버십 컨텍스트(`myRole`, `myMembershipStatus`)를 함께 내려준다. 가입은 자유가입(즉시 멤버)/승인가입(대기열) 두 결과 타입(`MEMBER`/`WAITLIST`)을 같은 엔드포인트(`POST .../join`)로 분기 처리한다. 탈퇴는 `DELETE .../leave`로 OWNER만 제외하고 가능하다. 다만 현재 `/home/clubs/:id`는 Flutter public prefix인 반면 상세 GET은 JWT 필수이고, APPROVAL 가입 화면도 메시지를 받지 않은 채 `message=null`로 신청한다.

### 2026-07-29 소스 재실측 — 멤버 전용 핏 프리뷰

- 인증된 **현재 클럽 멤버만** `GET /api/v1/clubs/{clubId}/fit-preview`를 호출할 수 있다. 비멤버는 403이며 가입 전 전환 유도 정보로 쓰지 않는다.
- 응답은 `ClubFitPreviewVo { knownMembersBucket?, similarTraitBucket?, traitAxisDistribution }`다. 인원수는 `FEW`(1~2), `SEVERAL`(3 이상) 버킷만 노출하고 0명은 필드 자체를 생략한다.
- `knownMembersBucket`은 증거등급 공동참석 이력이 있는 현재 멤버 수다. 뷰어·차단 사용자는 후보에서 제외한다.
- `similarTraitBucket`은 양쪽의 최신 제출 trait 점수에서 공통 축이 4개 이상이고 평균 절대 차이가 20 이하인 멤버 수다. trait 점수가 있는 후보가 5명 미만이면 필드를 생략한다.
- `traitAxisDistribution`은 멤버 최신 trait 점수를 축별 `LOW(0~33) / MID(34~66) / HIGH(67~100)` 비율로만 제공한다. 축 표본 5명 이상이고 0이 아닌 각 밴드가 최소 5명일 때만 노출하며 원점수·원인원은 내려가지 않는다. 표시할 축이 없으면 빈 배열이다.
- Flutter `ClubFitPreviewSection`은 `clubFitPreviewProvider`를 통해 상세에 붙고, 데이터가 전부 억제되면 섹션을 숨긴다.

실측 근거: `ClubFitPreviewController/Service`, `TraitFitPreviewService`, `ClubFitPreviewVo`, Flutter `connectivity_api.dart`, `club_fit_preview_section.dart` 및 widget test.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 목록 카드 탭 (F04-01)
- 홈 클럽 카드·공유 링크 (`/home/clubs/:id`)
- 내 클럽 카드 탭 (F04-07)
- 알림 클릭 (가입 승인/거절/초대 등 → DeepLink → `/clubs/:id`)
- 딥링크 `community://clubs/{id}`

현재 `GET /api/v1/clubs/{id}`를 공개하는 Security matcher가 없어 상세 조회 자체가 JWT 인증 필수다. 반면 Flutter의 `/home/clubs` prefix는 public route라 비로그인 사용자가 라우터를 통과한 뒤 상세 GET에서 401을 받고, 화면은 이를 `"클럽을 찾을 수 없습니다"`로 축약한다. `/clubs/:id`는 public prefix가 아니므로 비로그인 진입 시 로그인으로 이동한다.

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
2. 가입 액션: `clubJoinNotifierProvider.joinClub(clubId)` ▶ `clubRepository.joinClub` ▶ `POST /api/v1/clubs/:id/join`
   - 현재 화면에는 가입 메시지 입력 UI가 없어 FREE/APPROVAL 모두 `message=null`로 호출한다.
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
| GET | /api/v1/clubs/{id} | ClubController#getClub | **required** | 상세 + myRole/myMembershipStatus. 익명 요청은 Security에서 401 |
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
- 홈 클럽 카드·공유 링크 (`/home/clubs/:id`)
- 내 클럽 카드 탭 (F04-07)
- 알림 클릭 (가입 승인/거절/초대 등 → DeepLink → `/clubs/:id`)
- 딥링크 `community://clubs/{id}`

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/clubs/:clubId` | `club/screens/club_detail_screen.dart` | 인증 경로의 클럽 상세 + 가입/탈퇴 CTA |
| `/home/clubs/:clubId` | `club/screens/club_detail_screen.dart` | public prefix지만 현재 상세 API가 JWT 필수라 게스트는 401 |

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
  - "가입하기"/"가입 신청" (비멤버) ▶ `clubJoinNotifier.joinClub(clubId)` ▶ `POST /api/v1/clubs/:id/join`
    - 서버 응답 `JoinResult.resultType="MEMBER"` → `AppToast.show("가입 완료")` + 화면 갱신, "클럽 홈" CTA로 전환
    - `resultType="WAITLIST"` → `AppToast.show("가입 신청 완료, 승인 대기 중")` + "승인 대기 중" 비활성 버튼
    - APPROVAL도 가입 메시지 입력 없이 `message=null`로 신청
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
  - 유료 BUSINESS 가입 → 가입비 안내 확인 다이얼로그
  - 탈퇴 → 확인 다이얼로그
  - 상세 → 멤버목록/이벤트목록/커뮤니티/설정으로 push

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입: `clubDetailNotifierProvider(clubId).build()` ▶ `clubRepository.getClubDetail` ▶ `GET /api/v1/clubs/:id`
2. 가입 액션: `clubJoinNotifierProvider.joinClub(clubId)` ▶ `clubRepository.joinClub` ▶ `POST /api/v1/clubs/:id/join`
   - 화면은 `message`를 수집하지 않아 Repository가 `ClubJoinParam(message: null)`을 보낸다.
   - 성공: `clubDetailNotifier.refresh()`로 상세 재조회 + `clubListNotifier` invalidate (목록 카드 상태 동기화)
3. 탈퇴 액션: `leaveClub` ▶ `DELETE /api/v1/clubs/:id/leave` ▶ pop + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate
4. 권한 정보: `clubPermissionProvider(clubId)` (별도 provider) — myRole 기준 staff 메뉴 가시성 결정
5. 예정 이벤트 미리보기: `clubUpcomingEventsProvider(clubId)` (Unit 04 F04-12로 분리)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **CTA 라벨 분기**: "가입하기" / "승인 대기 중" / "클럽 홈" / "가입할 수 없습니다" — myMembershipStatus + myRole로 클라이언트 결정
- **가입 메시지 입력 부재**: APPROVAL도 별도 입력 다이얼로그 없이 즉시 호출해 신청 body의 `message`가 null이다.
- **OWNER 탈퇴 가드**: 클라이언트는 더보기 메뉴에서 "탈퇴" 항목을 OWNER에게는 미표시 (서버는 별도로 `CLUB_CANNOT_LEAVE_AS_OWNER`로 막음)
- **SUSPENDED 차단**: 서버는 SUSPENDED 클럽 자체를 응답하나, 프론트가 화면 진입 시점에 전체 컨텐츠를 차단하고 안내문 노출
- **이벤트 프리뷰 갯수**: 최대 3개 (`ClubEventPreview`가 자체적으로 가용성 판단)
- **멤버 프리뷰**: 5개 아바타 + 잔여 카운트
- **토스트 문구**: "가입 완료" / "가입 신청 완료, 승인 대기 중" / "탈퇴 완료" — UI/UX 스펙 SCR-CL-002와 일치
- **경로별 인증 차이**: `/clubs/:id`는 비로그인을 로그인으로 보내지만 `/home/clubs/:id`는 public prefix라 라우터를 통과한다. 후자는 상세 GET 401 뒤 일반 `"클럽을 찾을 수 없습니다"` 상태가 된다.

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
| S8 | 비로그인 홈 상세 진입 | 인증 토큰 없이 `/home/clubs/{id}` 진입 | public route matcher는 통과하지만 상세 GET이 401이고 화면은 `"클럽을 찾을 수 없습니다"`를 표시한다. 로그인 CTA까지 도달하지 못한다. |
| S9 | APPROVAL 클럽 가입 신청 | 인증 비멤버, `joinType=APPROVAL` | 가입 메시지 입력 없이 `message=null`로 요청하고 `WAITLIST`/`PENDING` 상태가 된다. |

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
| Gap | `Routes.publicRoutes`, `SecurityConfiguration`, `club_detail_screen.dart` | Flutter `/home/clubs/:id`는 public prefix지만 상세 GET은 JWT 필수라 게스트가 401을 받고, 화면은 이를 일반 `"클럽을 찾을 수 없습니다"`로 축약한다. | 공개 상세 계약을 서버와 맞추거나 앱 public prefix/로그인 분기 및 오류 표현을 정렬 |
| Gap | `club_detail_screen.dart`, `club_join_provider.dart` | APPROVAL 가입도 메시지 입력 UI 없이 `joinClub(clubId)`를 호출해 신청 body의 `message`가 null이다. | 메시지가 제품상 필요하면 입력 UI와 검증을 연결하고, 선택 사항이면 승인 화면의 기대 계약을 명시 |

## 9. 수용 기준

- **AC-01. 자유가입 클럽 즉시 가입 (Happy Path)**: Given `joinType=FREE`, `clubType=FREE` (가입비 없음). When 사용자가 해당 흐름을 실행하면 Then ACTIVE 멤버, OWNER에게는 알림 미발송 (FREE 가입은 알림 분기 없음).
- **AC-02. 승인가입 클럽 신청 → 대기열**: Given `joinType=APPROVAL`. When 사용자가 해당 흐름을 실행하면 Then `myMembershipStatus=PENDING`. 추후 승인은 F04-05.
- **AC-03. 중복 가입 시도 / 이미 신청 중**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 비멤버 탈퇴 (멤버 → 탈퇴)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then ACTIVE 멤버 아님.
- **AC-05. OWNER 탈퇴 시도 (실패 시나리오)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 여전히 OWNER. F04-03의 소유권 이전을 안내.
- **AC-06. BUSINESS 클럽 자유가입 (가입비 결제, FREE join)**: Given `clubType=BUSINESS`, `memberFee=10000`, `joinType=FREE`. When 사용자가 해당 흐름을 실행하면 Then 멤버. 7일 내 탈퇴 시 가입비 환불 가능.
- **AC-07. SUSPENDED 클럽 진입 (에러 시나리오)**: Given alice 가 이미 club 1201 의 ADMIN. 시드 club_member 1222 ACTIVE. When 사용자가 해당 흐름을 실행하면 Then 가입 시도 불가.
- **AC-08. 비로그인 홈 상세 진입**: Given 인증 토큰이 없음 When `/home/clubs/{id}`로 진입하면 Then public route matcher는 통과하지만 상세 GET은 401이고 화면은 `"클럽을 찾을 수 없습니다"`를 표시한다.
- **AC-09. APPROVAL 클럽 가입 신청**: Given 인증 비멤버이고 `joinType=APPROVAL` When 가입 신청 CTA를 탭하면 Then 메시지 입력 없이 `message=null`로 요청하고 WAITLIST/PENDING 상태가 된다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
