# F04-03. 클럽 생성/수정/삭제/소유권 이전 PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/04_club/F04-03_club-crud-transfer -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-03_club-crud-transfer`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽 메타정보(이름·카테고리·소개·규칙·가입방식·커버 이미지)를 OWNER가 만들고 관리한다. 생성 시 OWNER 멤버 자동 등록 + 기본 게시판 3개(공지/자유/가입인사) + ClubFund가 자동 생성된다. 삭제는 단순 행 제거가 아니라 활성 구독 일할 환불, 진행 중 이벤트 취소, 멤버 가입비 환불, 기금 잔여분 일괄 환불, 알림 발송까지 묶이는 복합 처리다. 소유권 이전은 두 멤버의 역할을 OWNER↔ADMIN으로 swap한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 생성: 클럽 목록 (`/clubs`) FAB(+) — F04-01에서 push.
- 수정: 클럽 상세(`/clubs/:id`) > 설정 톱니 > "클럽 정보 수정" — OWNER만.
- 삭제: 클럽 수정 화면 하단 위험 영역 → 다이얼로그 → 호출.
- 소유권 이전: 클럽 설정 메뉴 (별도 화면 — 본 단위 명시 컴포넌트 없음. 멤버 목록 길게 누르기 등에서 진입 가능).

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-03_club-crud-transfer/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-03_club-crud-transfer/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-03_club-crud-transfer/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-03_club-crud-transfer/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:163` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:56` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:85` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:94` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **생성**:
   - 진입: `clubFormNotifierProvider.build()` → 빈 폼.
   - 사용자 입력 → notifier 업데이트.
   - 제출: `validate()` → 통과 시 (썸네일 파일이면 `fileRepository.generatePresignedUrl` → `uploadFile`) → `clubRepository.createClub(ClubAddParam)` → `POST /api/v1/clubs` → `Result<ClubDetail>`.
   - 성공: `context.go('/clubs/${club.id}')` + `clubListNotifier` invalidate.
2. **수정**:
   - 진입: `clubFormNotifier.initFromClub(detail)` 호출.
   - 제출: `updateClub(clubId)` → `PATCH /api/v1/clubs/:id` → 성공 시 `clubDetailNotifier.refresh()` + pop.
3. **삭제**:
   - 다이얼로그 → `clubDetailNotifier.deleteClub()` → `DELETE /api/v1/clubs/:id` → 성공 시 `context.go('/clubs')` + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate.
4. **소유권 이전** (스펙 SCR-CL-004 위험영역 또는 별도 메뉴):
   - `clubRepository.transferOwnership(id, TransferOwnershipParam(newOwnerId))` → `POST /api/v1/clubs/:id/transfer-ownership` → 성공 시 detail/myClubs 모두 invalidate.

## 4. 서버 계약

### 개요

클럽 메타정보(이름·카테고리·소개·규칙·가입방식·커버 이미지)를 OWNER가 만들고 관리한다. 생성 시 OWNER 멤버 자동 등록 + 기본 게시판 3개(공지/자유/가입인사) + ClubFund가 자동 생성된다. 삭제는 단순 행 제거가 아니라 활성 구독 일할 환불, 진행 중 이벤트 취소, 멤버 가입비 환불, 기금 잔여분 일괄 환불, 알림 발송까지 묶이는 복합 처리다. 소유권 이전은 두 멤버의 역할을 OWNER↔ADMIN으로 swap한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/clubs | ClubController#createClub | required | 클럽 생성 (max-owned-clubs 제한) |
| PATCH | /api/v1/clubs/{id} | ClubController#updateClub | required (OWNER) | 메타 부분 수정 |
| DELETE | /api/v1/clubs/{id} | ClubController#deleteClub | required (OWNER) | 클럽 폐쇄 + 환불 + 알림 |
| POST | /api/v1/clubs/{id}/transfer-ownership | ClubController#transferOwnership | required (OWNER) | 소유권 이전 + **구 오너 구독 즉시 해지** |

### 소유권 이전 사이드이펙트 (5f70d1b, 2026-06-04)

소스: `ClubService.java:354-408`

1. 기존 OWNER → ADMIN 역할 변경
2. 신규 OWNER 설정 + `club.ownerId` 갱신
3. **구 오너 활성 구독 즉시 해지**: `findActiveSubscription(currentOwnerId, clubId)` → `sub.cancel()` + `sub.setAutoRenew(false)`
   - 환불 없음 (정책: "이전 시 환불 없음")
   - 신 오너 구독 자동 생성 없음
4. **신 오너 구독 폴백**: `club.subscriptionExpiresAt` 유지 → 신 오너는 구독 화면에 진입하기 전까지 기간 내 혜택을 자동 수혜 (소스: `ClubService.java:385-396`)
5. `CLUB_OWNER_CHANGED` FCM 알림

### deleteClub 구독 환불 기준

소스: `ClubService.java:261-347`

- 활성 구독 전체 cancel
- **잔여 기간 일할 환불 대상**: `subscription.userId == club.ownerId` 인 경우만 — 즉 현재 ownerId와 일치하는 구독
- 소유권 이전으로 넘어온 구 오너의 CANCELLED 구독은 환불 제외 (이미 이전 시 해지됨)

### 도메인 모델 / Enum (이 기능 관련)

- `JoinType`: `APPROVAL`, `FREE`.
- `ClubStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- `ClubType`: `FREE`, `BUSINESS`.
- `MemberRole`: `MEMBER`, `ADMIN`, `OWNER`.
- BoardType (생성 시 기본 게시판): `NOTICE`, `FREE`, `INTRODUCTION`.

### 의존 단위 / 외부 시스템

- **Unit 03 (event)**: `EventRepository.findByClubId`, `event.transitionTo(CANCELED)` — 폐쇄 시 진행 이벤트 정리.
- **Unit 06 (payment/wallet)**: `WalletService.refundToWallet`, `AccountingLedgerService.recordSubscriptionRefund` — 구독 일할 환불.
- **F04-13~14 (이 단위 후반)**: `ClubFundService.getOrCreateFund`, `ClubDonationService.refundDonationsOnClosure` — 기금 자동 생성/잔액 환불.
- **F04-08**: `ClubBoardService.createDefaultBoards` — 기본 게시판 3개 자동 생성.
- **Unit 11 (notification)**: `NotificationService` — `CLUB_CLOSED`, `CLUB_OWNER_CHANGED` FCM.
- **외부**: 썸네일 업로드는 별도 `POST /api/v1/files/presigned-url` (file 도메인) → S3 직접 PUT.

## 5. 프론트 계약

### 진입 경로

- 생성: 클럽 목록 (`/clubs`) FAB(+) — F04-01에서 push.
- 수정: 클럽 상세(`/clubs/:id`) > 설정 톱니 > "클럽 정보 수정" — OWNER만.
- 삭제: 클럽 수정 화면 하단 위험 영역 → 다이얼로그 → 호출.
- 소유권 이전: 클럽 설정 메뉴 (별도 화면 — 본 단위 명시 컴포넌트 없음. 멤버 목록 길게 누르기 등에서 진입 가능).

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/clubs/create` | `screens/club_create_screen.dart` | 신규 생성 |
| `/clubs/:id/settings` (또는 edit) | `screens/club_edit_screen.dart` | 수정 + 위험 영역 |
| `widgets/club_form.dart` | `widgets/club_form.dart` | 생성/수정 공용 폼 |
| `widgets/club_delete_dialog.dart` | `widgets/club_delete_dialog.dart` | 삭제 확인 다이얼로그 (클럽명 입력형) |

### 화면별 구성 요소 & 액션

### 클럽 생성 (`club_create_screen.dart` + `club_form.dart`)

- **사용자가 보는 것**:
  - AppBar "클럽 만들기"
  - 커버 이미지 선택 (180dp ImagePicker, 5MB↓ JPG/PNG)
  - 클럽 이름 TextField (2~30자, 0/30 카운터)
  - 카테고리 Dropdown (서버 Category enum 기반)
  - 지역 Dropdown (선택 사항 — 현 구현은 클럽 모델에 직접 저장 없이 description에 포함되거나 미사용)
  - 클럽 소개 TextArea (10~500자, 0/500 카운터)
  - 가입 방식 RadioGroup (자유/승인, 기본 FREE)
  - 최대 멤버 수 Dropdown (스펙 명시이지만 서버 ClubAddParam에는 maxMember 필드 없음 → UI만 표시 가능, 또는 서버 미지원 안내)
  - 하단 BottomCTA "클럽 만들기"
- **사용자가 할 수 있는 액션**:
  - 입력 변경 ▶ `clubFormNotifier.update*` 메서드들 → state 업데이트
  - 이미지 선택 ▶ `image_picker` → `updateThumbnailFile`
  - "클럽 만들기" ▶ `createClub` ▶ 1) 썸네일이 파일이면 `presigned-url` + S3 PUT 후 fileKey, 2) `POST /api/v1/clubs` ▶ 성공 시 `context.go('/clubs/{newId}')`
- **상태 분기**:
  - validation 실패 (`name`/`category`/`description`) → 필드별 에러 메시지
  - submit 중 → `isSubmitting` → 버튼 비활성 + 스피너
  - 서버 에러 → `errors['submit']` (resolveApiErrorMessage)
- **모달/시트/네비게이션**: 이미지 picker 시트, 카테고리/지역 Dropdown.

### 클럽 수정 (`club_edit_screen.dart`)

- **사용자가 보는 것**:
  - 동일 폼 (`club_form.dart`) — `initFromClub(club)`로 프리필
  - 위험 영역: "🔴 클럽 삭제" 카드, 텍스트 빨강.
- **사용자가 할 수 있는 액션**:
  - "저장" ▶ `clubFormNotifier.updateClub(clubId)` ▶ `PATCH /api/v1/clubs/:id`
  - "클럽 삭제" 탭 ▶ `ClubDeleteDialog` 노출 → 클럽명 정확 입력 → `clubDetailNotifier.deleteClub` ▶ `DELETE /api/v1/clubs/:id` ▶ 성공 시 `context.go('/clubs')` + 토스트
- **상태 분기**:
  - hasChanges 없으면 저장 비활성 (스펙 SCR-CL-004)
  - 삭제 다이얼로그에서 클럽명 미일치 → 확인 버튼 비활성
- **모달/시트/네비게이션**:
  - 삭제 확인 다이얼로그 (입력형 가드)

### API 호출 순서 (Provider/Repository 관점)

1. **생성**:
   - 진입: `clubFormNotifierProvider.build()` → 빈 폼.
   - 사용자 입력 → notifier 업데이트.
   - 제출: `validate()` → 통과 시 (썸네일 파일이면 `fileRepository.generatePresignedUrl` → `uploadFile`) → `clubRepository.createClub(ClubAddParam)` → `POST /api/v1/clubs` → `Result<ClubDetail>`.
   - 성공: `context.go('/clubs/${club.id}')` + `clubListNotifier` invalidate.
2. **수정**:
   - 진입: `clubFormNotifier.initFromClub(detail)` 호출.
   - 제출: `updateClub(clubId)` → `PATCH /api/v1/clubs/:id` → 성공 시 `clubDetailNotifier.refresh()` + pop.
3. **삭제**:
   - 다이얼로그 → `clubDetailNotifier.deleteClub()` → `DELETE /api/v1/clubs/:id` → 성공 시 `context.go('/clubs')` + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate.
4. **소유권 이전** (스펙 SCR-CL-004 위험영역 또는 별도 메뉴):
   - `clubRepository.transferOwnership(id, TransferOwnershipParam(newOwnerId))` → `POST /api/v1/clubs/:id/transfer-ownership` → 성공 시 detail/myClubs 모두 invalidate.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **글자수 제약**: 이름 2~30, 소개 10~500 (스펙 SCR-CL-003 + form provider validate 로직)
- **이미지 5MB 제한**: 클라이언트가 사전 검사 + 알림
- **MIME 매핑**: 확장자→`image/jpeg|png|gif|webp`
- **Presigned URL 업로드 흐름**: 1) `generatePresignedUrl(purpose=CLUB_PHOTO)` 2) S3 PUT 3) fileKey 반환 후 본 API 호출
- **카테고리 Dropdown 항목**: 서버 Category enum 한글 매핑 (`ClubCategoryMapper`)
- **삭제 다이얼로그 가드**: 클럽명 정확 입력 시에만 활성화
- **위험 영역 색상**: 빨강 텍스트, 경고 카드
- **서버에 없는 항목**: 최대 멤버 수 Dropdown은 스펙에 있으나 `ClubAddParam`에 해당 필드가 없다 — UI만 두거나 적용하지 않거나 둘 중 선택 (현 구현은 미적용, 차후 서버 추가 시 연결)
- **소유권 이전 진입 UX**: 멤버 목록에서 멤버 선택 후 "OWNER로 변경" 흐름은 현 화면 명세 외 → 향후 통합 시 멤버 목록(F04-04) 액션 시트에 노출 가능

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 클럽 신규 생성 (Happy Path) | 운영 클럽 0개. | 본인 OWNER. 기본 게시판 3개 자동 생성. ClubFund 0원으로 시작. |
| S2 | 이름 중복 / 운영 클럽 한도 초과 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 클럽 정보 수정 (Happy Path) | OWNER. | 변경 반영, ownerId 불변. |
| S4 | OWNER 아닌 사용자가 수정 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 클럽 삭제 (Happy Path, 활성 클럽 정리) | OWNER, 활성 멤버 18명, 활성 구독자 3명, 진행 OPEN 이벤트 2개, 기금 잔액 50,000원. | 클럽은 INACTIVE(레코드는 남음). 멤버 모두 빠짐. 진행 이벤트 모두 취소. |
| S6 | 소유권 이전 | OWNER가 직장 사정으로 ADMIN 박민수에게 이전. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 자기 자신에게 이전 시도 / 비멤버 이전 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 비활성 클럽 이전 시도 | 시드 클럽(`Seoul Weekend Boardgamers`, clubId=1201). | 사용자는 클럽 상세에 머무르며 OWNER/ADMIN 전용 surface(`screen.club.settings`)에 접근할 수 없다. |

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
| 후보 | frontend.md:7 | - 삭제: 클럽 수정 화면 하단 위험 영역 → 다이얼로그 → 호출. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:15 | \| `/clubs/:id/settings` (또는 edit) \| `screens/club_edit_screen.dart` \| 수정 + 위험 영역 \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:47 | - 위험 영역: "🔴 클럽 삭제" 카드, 텍스트 빨강. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:69 | 4. **소유권 이전** (스펙 SCR-CL-004 위험영역 또는 별도 메뉴): | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:80 | - **위험 영역 색상**: 빨강 텍스트, 경고 카드 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:40 | 1. 수정 화면 위험 영역 → "클럽 삭제" → 다이얼로그 → 클럽명 정확 입력 → "삭제하기". | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:80 | ### S1 보강 — 생성 폼 라벨 / 가입 방식 옵션 / 검증 카피 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:93 | ### S3 보강 — 설정 화면 필드 라벨 + 위험 영역 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:101 | - 위험 영역에 `'🔴 클럽 삭제'` 텍스트 1개 + `'삭제 시 모든 데이터가 복구 불가능합니다'` 안내 1개. (이모지 `🔴` 포함 — 디자인 토큰화 시 동기 갱신 필요) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:104 | ### S5 보강 — 삭제 확인 다이얼로그 카피 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:15 | Edit -->\|위험영역\| DelDialog[🔵 클럽 삭제 다이얼로그<br/>클럽명 입력 가드] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 클럽 신규 생성 (Happy Path)**: Given 운영 클럽 0개. When 사용자가 해당 흐름을 실행하면 Then 본인 OWNER. 기본 게시판 3개 자동 생성. ClubFund 0원으로 시작.
- **AC-02. 이름 중복 / 운영 클럽 한도 초과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 클럽 정보 수정 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 반영, ownerId 불변.
- **AC-04. OWNER 아닌 사용자가 수정 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 클럽 삭제 (Happy Path, 활성 클럽 정리)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 클럽은 INACTIVE(레코드는 남음). 멤버 모두 빠짐. 진행 이벤트 모두 취소.
- **AC-06. 소유권 이전**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 자기 자신에게 이전 시도 / 비멤버 이전**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 비활성 클럽 이전 시도**: Given 시드 클럽(`Seoul Weekend Boardgamers`, clubId=1201). When 사용자가 해당 흐름을 실행하면 Then 사용자는 클럽 상세에 머무르며 OWNER/ADMIN 전용 surface(`screen.club.settings`)에 접근할 수 없다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
