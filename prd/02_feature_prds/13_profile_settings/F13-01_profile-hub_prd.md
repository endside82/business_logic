# F13-01. 내 프로필 조회 (마이페이지 허브) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/13_profile_settings/F13-01_profile-hub -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/13_profile_settings/F13-01_profile-hub`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

마이페이지 허브의 백엔드 핵심은 로그인 사용자의 기본 프로필을 조회하는 것이다. 사용자는 닉네임, 이름, 자기소개, 프로필 이미지, 언어, 역할, 가입일을 한 번에 받아 자기 프로필 카드의 기준 데이터를 확인한다. 지갑/이벤트/클럽/신뢰점수 요약은 이 컨트롤러가 제공하지 않으며 각 외부 도메인 의존으로 분리된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭의 마이페이지 진입점에서 `MyProfileScreen`을 표시한다.
- 삭제 요청이 진행 중이면 같은 화면 상단의 배너에서 데이터 프라이버시 화면으로 이동할 수 있다.
- 앱 설정, 고객센터, 찜 목록, 캘린더, 리뷰, 정산 계좌, 기기 관리 등은 허브의 하위 메뉴 진입점으로만 다룬다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/13_profile_settings/F13-01_profile-hub/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/13_profile_settings/F13-01_profile-hub/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/13_profile_settings/F13-01_profile-hub/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/13_profile_settings/F13-01_profile-hub/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/UserController.java:41` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 인증 상태: `authNotifierProvider`의 authenticated user를 화면에서 직접 사용한다. `GET /api/v1/users/me` 호출 자체는 인증 provider/repository 내부 구현으로 보이며 profile 화면 범위 밖이라 `(미확인)`.
2. 지갑 카드: `walletNotifierProvider` ▶ payment 도메인 API `(본 Unit 범위 밖)`.
3. 내 이벤트 카드: `upcomingEventsNotifierProvider` ▶ event 도메인 API `(본 Unit 범위 밖)`.
4. 내 클럽 카드: `myClubsNotifierProvider` ▶ club 도메인 API `(본 Unit 범위 밖)`.
5. 신뢰점수 카드: `myTrustScoreNotifierProvider` ▶ review 도메인 API `(본 Unit 범위 밖)`.
6. 삭제 배너: `deletionStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-deletion/status`.
7. 로그아웃: `authNotifierProvider.notifier.logout()` ▶ Unit 01 인증 흐름.

## 4. 서버 계약

### 개요

마이페이지 허브의 백엔드 핵심은 로그인 사용자의 기본 프로필을 조회하는 것이다. 사용자는 닉네임, 이름, 자기소개, 프로필 이미지, 언어, 역할, 가입일을 한 번에 받아 자기 프로필 카드의 기준 데이터를 확인한다. 지갑/이벤트/클럽/신뢰점수 요약은 이 컨트롤러가 제공하지 않으며 각 외부 도메인 의존으로 분리된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/users/me` | `UserController#getMyProfile` | required | 현재 로그인 사용자의 `UserProfileVo` 조회 |

### 도메인 모델 / Enum (이 기능 관련)

- **VO** `UserProfileVo`: `userId`, `email`, `nickname`, `name`, `birthDate`, `gender`, `bio`, `profileImageUrl`, `locale`, `role`, `createdAt`
- **Entity** `Users`: 테이블 `users`, 주요 필드 `user_id`, `email`, `nickname`, `status`, `user_role`, `created_at`
- **Entity** `Member`: 테이블 `member`, 주요 필드 `user_id`, `name`, `birth_date`, `gender`, `bio`, `profile_image_url`, `locale`
- **Enum** `UserStatus`: `NORMAL`, `LOGOUT`, `STOP`, `BAN`, `TRYEXIT`, `EXIT`
- 마이페이지의 지갑 잔액, 내 이벤트 수, 내 클럽 수, 신뢰점수는 `UserProfileVo`에 없음.

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - 지갑 요약: payment/wallet 도메인 provider와 API 의존, 본 account 컨트롤러에는 없음
  - 내 이벤트 수: event 도메인 provider 의존, 본 account 컨트롤러에는 없음
  - 내 클럽 수: club 도메인 provider 의존, 본 account 컨트롤러에는 없음
  - 신뢰점수: review 도메인 provider 의존, 본 account 컨트롤러에는 없음
  - 로그아웃: Unit 01 인증 흐름으로 위임
  - 연동 계정 소셜 unlink: Unit 01 `AuthController` 영역이므로 본 기능에서 제외
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- 하단 탭의 마이페이지 진입점에서 `MyProfileScreen`을 표시한다.
- 삭제 요청이 진행 중이면 같은 화면 상단의 배너에서 데이터 프라이버시 화면으로 이동할 수 있다.
- 앱 설정, 고객센터, 찜 목록, 캘린더, 리뷰, 정산 계좌, 기기 관리 등은 허브의 하위 메뉴 진입점으로만 다룬다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| 하단 탭 마이페이지 (`/profile` 추정, 실제 등록 미확인) | `profile/screens/my_profile_screen.dart` | 프로필 카드, 요약 그리드, 메뉴 허브 |
| `/profile/privacy` | `profile/screens/data_privacy_screen.dart` | 삭제 진행 배너의 관리 대상 화면 |
| `/profile/settings` | `profile/screens/app_settings_screen.dart` | 외부 설정 메뉴 허브 |
| `/profile/support` | `profile/screens/support_screen.dart` | 고객센터 URL/메일 진입 |
| `profileWishlist` named route | `profile/screens/profile_wishlist_screen.dart` | 찜 목록 외부 도메인 화면 |

### 화면별 구성 요소 & 액션

### 내 프로필 (`my_profile_screen.dart`)
- **사용자가 보는 것**:
  - 상단 앱바 `마이페이지`
  - 삭제 요청 진행 배너 `DeletionInProgressBanner`
  - 원형 프로필 이미지 또는 기본 사람 아이콘
  - 닉네임
  - 자기소개 2줄 말줄임 표시
  - 지갑, 내 이벤트, 내 클럽, 신뢰점수 2x2 빠른 접근 카드
  - 프로필 편집, 주소 관리, 선호 태그, 정산 계좌, 내 정산 히스토리, 기기 관리, 데이터 프라이버시 메뉴
  - 캘린더, 내 리뷰, 찜한 이벤트, 앱 설정, 고객센터 메뉴
  - 로그아웃 메뉴
- **사용자가 할 수 있는 액션**:
  - 프로필 편집 탭 ▶ `context.push('/profile/edit')`
  - 주소 관리 탭 ▶ `context.push('/profile/addresses')`
  - 선호 태그 탭 ▶ `context.push('/profile/tags')`
  - 데이터 프라이버시 탭 ▶ `context.push('/profile/privacy')`
  - 빠른 접근 지갑 탭 ▶ `context.push('/profile/wallet')`
  - 빠른 접근 내 이벤트 탭 ▶ `context.push('/profile/my-events')`
  - 빠른 접근 내 클럽 탭 ▶ `context.push('/my/clubs')`
  - 빠른 접근 신뢰점수 탭 ▶ `context.push('/profile/trust-score')`
  - 찜한 이벤트 탭 ▶ `context.pushNamed('profileWishlist')`
  - 로그아웃 탭 ▶ 확인 다이얼로그 ▶ `authNotifierProvider.notifier.logout()`
- **상태 분기**:
  - 인증 사용자 없음: 중앙 `CircularProgressIndicator`
  - 인증 사용자 있음: 스크롤 가능한 허브 표시
  - 요약 카드 값은 각 provider의 `whenOrNull(data:)` 값이 없으면 값 없이 라벨만 표시
  - 삭제 배너는 삭제 상태 provider가 null이거나 진행 상태가 아니면 `SizedBox.shrink`
- **모달/시트/네비게이션**:
  - 로그아웃 확인 `AlertDialog`
  - 삭제 진행 배너의 `관리` 버튼은 `/profile/privacy`로 이동

### 삭제 진행 배너 (`deletion_in_progress_banner.dart`)
- **사용자가 보는 것**:
  - `계정 삭제 요청 진행 중` 제목
  - `D-N 후 계정이 삭제됩니다...` 또는 일정 안내 문구
  - `관리` 텍스트 버튼
- **사용자가 할 수 있는 액션**:
  - `관리` 탭 ▶ `/profile/privacy`
- **상태 분기**:
  - `deletionStatusNotifierProvider` 데이터가 `PENDING` 또는 `APPROVED`일 때만 노출
  - `scheduledAt`이 없거나 과거면 D-day 텍스트는 fallback 문구로 표시

### API 호출 순서 (Provider/Repository 관점)

1. 인증 상태: `authNotifierProvider`의 authenticated user를 화면에서 직접 사용한다. `GET /api/v1/users/me` 호출 자체는 인증 provider/repository 내부 구현으로 보이며 profile 화면 범위 밖이라 `(미확인)`.
2. 지갑 카드: `walletNotifierProvider` ▶ payment 도메인 API `(본 Unit 범위 밖)`.
3. 내 이벤트 카드: `upcomingEventsNotifierProvider` ▶ event 도메인 API `(본 Unit 범위 밖)`.
4. 내 클럽 카드: `myClubsNotifierProvider` ▶ club 도메인 API `(본 Unit 범위 밖)`.
5. 신뢰점수 카드: `myTrustScoreNotifierProvider` ▶ review 도메인 API `(본 Unit 범위 밖)`.
6. 삭제 배너: `deletionStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-deletion/status`.
7. 로그아웃: `authNotifierProvider.notifier.logout()` ▶ Unit 01 인증 흐름.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 프로필 카드 bio는 2줄까지만 표시하고 overflow ellipsis 처리한다.
- 지갑/이벤트/클럽/신뢰점수는 한 화면에서 2x2 카드로 배치한다.
- 요약 provider 로딩 중에는 카드 전체 로딩 UI를 만들지 않고 값만 비워둔다.
- 삭제 요청 진행 배너는 화면 상단 카드 앞에 고정 노출한다.
- 로그아웃은 직접 실행하지 않고 확인 다이얼로그를 거친다.
- 메뉴 라벨과 라우트 문자열은 화면 파일에서 결정한다.
- 앱 설정, 고객센터, 찜 목록은 본 Unit 핵심 기능이 아니라 메뉴 허브의 외부 진입점이다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 마이페이지에서 내 정체성과 활동 요약을 확인한다 | 로그인됨, 인증 provider에 사용자 정보가 있음 | 사용자는 현재 프로필과 주요 활동 요약을 한 화면에서 확인하고 다음 설정 작업으로 이동할 수 있다. |
| S2 | 삭제 요청이 진행 중인 사용자가 배너를 보고 관리 화면으로 이동한다 | 로그인됨, 삭제 요청 상태가 `PENDING` 또는 `APPROVED` | 사용자는 데이터 프라이버시 화면에서 삭제 취소 또는 상태 확인을 이어갈 수 있다. |
| S3 | 로그아웃을 실수로 누른 사용자가 취소한다 | 로그인됨, 마이페이지 표시 중 | 인증 상태는 유지되고 마이페이지에 그대로 머문다. |
| S4 | 인증 사용자 정보가 아직 준비되지 않은 상태 | 인증 상태 확인 중이거나 authenticated user가 null | 사용자 정보가 준비되면 허브가 표시된다. 인증 실패 리다이렉트는 라우터/인증 가드 영역이라 `(미확인)`. |
| S5 | 외부 도메인 메뉴로 이동한다 | 로그인됨, 마이페이지 표시 중 | 본 기능은 메뉴 허브 역할을 완료하고, 이후 동작은 해당 Unit으로 위임된다. |

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
| 후보 | backend.md:46 | - 인증 principal이 없는 경우의 HTTP 응답은 보안 설정 영역이라 이 범위에서는 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:11 | \| 하단 탭 마이페이지 (`/profile` 추정, 실제 등록 미확인) \| `profile/screens/my_profile_screen.dart` \| 프로필 카드, 요약 그리드, 메뉴 허브 \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:62 | 1. 인증 상태: `authNotifierProvider`의 authenticated user를 화면에서 직접 사용한다. `GET /api/v1/users/me` 호출 자체는 인증 provider/repository 내부 구현으로 보이며 profile 화면 범위 밖이라 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:45 | **종료 상태**: 사용자 정보가 준비되면 허브가 표시된다. 인증 실패 리다이렉트는 라우터/인증 가드 영역이라 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 마이페이지에서 내 정체성과 활동 요약을 확인한다**: Given 로그인됨, 인증 provider에 사용자 정보가 있음 When 사용자가 해당 흐름을 실행하면 Then 사용자는 현재 프로필과 주요 활동 요약을 한 화면에서 확인하고 다음 설정 작업으로 이동할 수 있다.
- **AC-02. 삭제 요청이 진행 중인 사용자가 배너를 보고 관리 화면으로 이동한다**: Given 로그인됨, 삭제 요청 상태가 `PENDING` 또는 `APPROVED` When 사용자가 해당 흐름을 실행하면 Then 사용자는 데이터 프라이버시 화면에서 삭제 취소 또는 상태 확인을 이어갈 수 있다.
- **AC-03. 로그아웃을 실수로 누른 사용자가 취소한다**: Given 로그인됨, 마이페이지 표시 중 When 사용자가 해당 흐름을 실행하면 Then 인증 상태는 유지되고 마이페이지에 그대로 머문다.
- **AC-04. 인증 사용자 정보가 아직 준비되지 않은 상태**: Given 인증 상태 확인 중이거나 authenticated user가 null When 사용자가 해당 흐름을 실행하면 Then 사용자 정보가 준비되면 허브가 표시된다. 인증 실패 리다이렉트는 라우터/인증 가드 영역이라 `(미확인)`.
- **AC-05. 외부 도메인 메뉴로 이동한다**: Given 로그인됨, 마이페이지 표시 중 When 사용자가 해당 흐름을 실행하면 Then 본 기능은 메뉴 허브 역할을 완료하고, 이후 동작은 해당 Unit으로 위임된다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
