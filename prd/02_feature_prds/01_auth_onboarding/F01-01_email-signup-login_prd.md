# F01-01. 이메일 회원가입 & 로그인 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-01_email-signup-login -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-01_email-signup-login`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이메일/비밀번호 기반의 신규 가입과 로그인을 처리한다. 가입 시 사용자 본인 정보·약관 동의·생년월일을 받아 `Users`/`Member`/`Agreement`/`SocialLogin(EMAIL)` 4개 테이블에 동시 INSERT하고, 즉시 JWT Access/Refresh 토큰을 발급한다. 로그인은 자격 증명 검증 후 토큰을 재발급한다. 두 엔드포인트 모두 동일한 `LoginVo`를 반환하므로 클라이언트는 같은 후속 처리를 한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 앱 첫 실행 시 토큰 미보유 → `splash_screen.dart` → 로그인 화면
- 로그아웃 후 자동 이동
- 회원가입 완료 후 토스트 + 로그인 화면 복귀
- 라우터 가드: `AuthState.unauthenticated`이면 `/auth/login`로 강제 이동

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-01_email-signup-login/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-01_email-signup-login/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-01_email-signup-login/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-01_email-signup-login/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:36` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:42` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 로그인
1. 사용자 "로그인" 탭
2. `LoginScreen._handleLogin()` → `ref.read(authNotifierProvider.notifier).login(LoginRequest)`
3. `AuthNotifier.login` → `_repo.login(request)` (`AuthRepository.login`)
4. `AuthRepository.login` → `_authApi.login(request)` (`POST /api/v1/auth/login`)
5. 응답 수신: `_tokenStorage.saveTokens(accessToken, refreshToken)` (Secure Storage)
6. `_syncOnboardingStateAfterLogin(response.isNewUser)` — `isNewUser=true`면 onboarding storage clear, false면 markOnboardingDone
7. `_fetchAndSetUser(requireOnboarding: response.isNewUser)` → `GET /api/v1/users/me`
8. 응답에 따라 `AuthState.authenticated(user)` 또는 `AuthState.onboarding(user)` 전이
9. 라우터 redirect가 자동으로 화면 전환

### 회원가입
1. 사용자 "가입하기" 탭
2. `SignupScreen._handleSignup()` → `ref.read(authNotifierProvider.notifier).signup(SignupRequest)`
3. `AuthNotifier.signup` → `_repo.signup(request)` (`AuthRepository.signup`)
4. `AuthRepository.signup` → `_authApi.signup(request)` (`POST /api/v1/auth/signup`)
5. 성공 시: 토큰 저장 (자동 로그인 됨) — 그러나 현재 구현은 토스트 후 `context.pop()`으로 로그인 화면 복귀 (사용자가 명시적으로 다시 로그인하도록 유도)

## 4. 서버 계약

### 개요

이메일/비밀번호 기반의 신규 가입과 로그인을 처리한다. 가입 시 사용자 본인 정보·약관 동의·생년월일을 받아 `Users`/`Member`/`Agreement`/`SocialLogin(EMAIL)` 4개 테이블에 동시 INSERT하고, 즉시 JWT Access/Refresh 토큰을 발급한다. 로그인은 자격 증명 검증 후 토큰을 재발급한다. 두 엔드포인트 모두 동일한 `LoginVo`를 반환하므로 클라이언트는 같은 후속 처리를 한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/auth/signup | `AuthController#signup` | 불필요 | 신규 회원 생성 + 토큰 발급 (201 Created) |
| POST | /api/v1/auth/login | `AuthController#login` | 불필요 | 자격 증명 검증 + 토큰 재발급 (200 OK) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `UserStatus`: `NORMAL`, `LOGOUT`, `STOP`, `BAN`, `TRYEXIT`, `EXIT`
- **Enum** `UserRole`: `USER(0)`, `HOST(1)`, `ADMIN(2)`
- **Enum** `LoginType`: `EMAIL("email")`, `SOCIAL("social")`
- **Enum** `ProviderType`: `EMAIL(0)`, `KAKAO(1)`, `NAVER(2)`, `GOOGLE(3)`, `APPLE(4)` — 가입 시 `EMAIL` 사용
- **Entity 요약**:
  - `Users`: userId, status, password (BCrypt), email, emailVerified, mobile, nickname, userRole, identityStatus, banReason, banUntil, deletedAt, createdAt, updatedAt, loginAt, logoutAt
  - `Member`: userId, birthDate, gender, locale (1:1 with Users)
  - `Agreement`: userId, agreeTerm/agreePrivacy/agreeMarketing (Integer 0/1)
  - `SocialLogin`: userId, providerType (int), socialId — 이메일 가입 시 providerType=0(EMAIL), socialId=이메일
  - `RefreshToken`: id, userId, refreshToken (UUID), expireDatetime
- **VO** `LoginVo`: accessToken, refreshToken, userId, email, nickname, tokenType, expiresIn, role, isNewUser

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 없음 — 이 단위가 시발점
- 후속 호출: F01-03 (이메일 인증), F01-06 (온보딩 진입)
- 외부 시스템: 없음 — 모든 처리가 자체 DB

## 5. 프론트 계약

### 진입 경로

- 앱 첫 실행 시 토큰 미보유 → `splash_screen.dart` → 로그인 화면
- 로그아웃 후 자동 이동
- 회원가입 완료 후 토스트 + 로그인 화면 복귀
- 라우터 가드: `AuthState.unauthenticated`이면 `/auth/login`로 강제 이동

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/auth/login` | `lib/presentation/auth/screens/login_screen.dart` | 이메일/비밀번호 로그인 (SCR-AU-001) |
| `/auth/signup` | `lib/presentation/auth/screens/signup_screen.dart` | 신규 회원가입 (SCR-AU-002) |
| `/` (splash) | `lib/presentation/auth/screens/splash_screen.dart` | 토큰 검사 + 분기 |

### 화면별 구성 요소 & 액션

### 로그인 (`login_screen.dart`)
- **사용자가 보는 것**:
  - 상단: 64×64 그린 정사각형 로고 + "Community" 28pt + 태그라인 "함께하는 즐거움을 발견하세요"
  - 이메일 입력 (`AppTextInput`, keyboardType=email)
  - 비밀번호 입력 (`AppTextInput`, obscureText 토글 가능)
  - "로그인" 기본 버튼 (`AppButton`, `ButtonVariant.primary`)
  - "비밀번호 찾기" 우측 정렬 텍스트 링크
  - "또는" 디바이더 + 4종 소셜 버튼 (`SocialLoginButtons`) — F01-02 진입점
  - "계정이 없으신가요? 회원가입" 링크
  - DEV 환경에서는 "DEV 바이패스 로그인" 버튼 추가
- **사용자가 할 수 있는 액션**:
  - 이메일 입력 → 정규식 `^[^@]+@[^@]+\.[^@]+`로 즉시 검증, 실패 시 인라인 에러
  - 비밀번호 입력 → 8자 미만이면 인라인 에러 "비밀번호는 최소 8자 이상이어야 합니다"
  - "로그인" 탭 → `authNotifierProvider.notifier.login(LoginRequest)` ▶ `POST /api/v1/auth/login`
  - 성공 시: 라우터 가드가 자동으로 `/home` 또는 온보딩 분기로 이동
  - 실패 시: `ApiError` 매핑하여 `AppToast.show()`로 에러 메시지
    - `unauthorized` → "이메일 또는 비밀번호가 올바르지 않습니다"
    - `rateLimited` → "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요"
- **상태 분기**:
  - 로딩: `_isLoading` 상태로 버튼 spinner
  - 폼 유효성: `_isFormValid`가 false면 버튼 disabled
- **모달/시트/네비게이션**:
  - "회원가입" 탭 → `context.push('/auth/signup')` (push, 뒤로 가능)
  - "비밀번호 찾기" 탭 → `context.push('/auth/password-reset')` (F01-04)

### 회원가입 (`signup_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '회원가입')` 뒤로 버튼 포함
  - 이메일 입력
  - 비밀번호 입력 + 강도 인디케이터 (3-bar: 약함/보통/강함, 색상: error500/주황/success500)
  - 비밀번호 확인 입력 + 일치 여부
  - 닉네임 입력 (maxLength=16, 카운터 표시)
  - 생년월일 picker (showDatePicker)
  - 휴대폰 번호 입력 (선택)
  - 성별 선택 (남성/여성/선택안함 — 3분할 토글 카드)
  - 약관 동의 카드 (white card, r=12, p=16)
    - "전체 동의" (bold)
    - "이용약관 동의 (필수)" + chevron
    - "개인정보 처리방침 동의 (필수)" + chevron
    - "마케팅 수신 동의 (선택)"
  - "가입하기" 기본 버튼
  - "이미 계정이 있으신가요? 로그인" 링크
- **사용자가 할 수 있는 액션**:
  - 각 필드 실시간 검증:
    - 이메일 정규식
    - 비밀번호 8자 이상 + 영문/숫자 포함
    - 비밀번호 확인 일치
    - 닉네임 2~16자
  - "가입하기" 탭 → `authNotifierProvider.notifier.signup(SignupRequest)` ▶ `POST /api/v1/auth/signup`
  - 성공 시: `AppToast.show(context, message: '회원가입이 완료되었습니다. 로그인해주세요.', type: ToastType.success)` + `context.pop()`로 로그인 화면 복귀
  - 실패 시: `showApiErrorToast(context, e)` (409 EMAIL/NICKNAME 중복 메시지 포함)
- **상태 분기**:
  - `_isFormValid`가 false면 "가입하기" 버튼 disabled (이메일 + 8자+ 비밀번호 + 일치 + 닉네임 2자+ + 생년월일 + 필수 약관 2개 모두)
  - `_isLoading` 시 버튼 spinner
- **모달/시트/네비게이션**:
  - 생년월일: `showDatePicker` 모달 (locale='ko', 기본 2000-01-01)
  - 약관 chevron 탭: 약관 상세 (별도 단위, 본 단위 외부)

### 스플래시 (`splash_screen.dart`)
- **사용자가 보는 것**: 64×64 그린 아이콘 + "Community" + spinner
- **사용자가 할 수 있는 액션**: 없음 (수동적)
- **자동 처리**: `AuthNotifier.checkAuthStatus()` 실행 → 토큰 검증 → 라우터 redirect

### API 호출 순서 (Provider/Repository 관점)

### 로그인
1. 사용자 "로그인" 탭
2. `LoginScreen._handleLogin()` → `ref.read(authNotifierProvider.notifier).login(LoginRequest)`
3. `AuthNotifier.login` → `_repo.login(request)` (`AuthRepository.login`)
4. `AuthRepository.login` → `_authApi.login(request)` (`POST /api/v1/auth/login`)
5. 응답 수신: `_tokenStorage.saveTokens(accessToken, refreshToken)` (Secure Storage)
6. `_syncOnboardingStateAfterLogin(response.isNewUser)` — `isNewUser=true`면 onboarding storage clear, false면 markOnboardingDone
7. `_fetchAndSetUser(requireOnboarding: response.isNewUser)` → `GET /api/v1/users/me`
8. 응답에 따라 `AuthState.authenticated(user)` 또는 `AuthState.onboarding(user)` 전이
9. 라우터 redirect가 자동으로 화면 전환

### 회원가입
1. 사용자 "가입하기" 탭
2. `SignupScreen._handleSignup()` → `ref.read(authNotifierProvider.notifier).signup(SignupRequest)`
3. `AuthNotifier.signup` → `_repo.signup(request)` (`AuthRepository.signup`)
4. `AuthRepository.signup` → `_authApi.signup(request)` (`POST /api/v1/auth/signup`)
5. 성공 시: 토큰 저장 (자동 로그인 됨) — 그러나 현재 구현은 토스트 후 `context.pop()`으로 로그인 화면 복귀 (사용자가 명시적으로 다시 로그인하도록 유도)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 비밀번호 강도 인디케이터 3단계 색상 (error500/주황 #D8A85B/success500)
- 비밀번호 강도 측정 규칙: 8자+ → 1, 영문+숫자 조합 → +1, 특수문자 → +1
- 회원가입 후 동작: 토큰을 저장했음에도 `context.pop()`으로 로그인 화면 복귀 (UX 결정)
- 검증 토스트 메시지: 한국어 직접 작성
- DEV 환경 바이패스 로그인 버튼 노출 (production 미노출)
- 소셜 로그인 버튼 4개 표시 순서: 카카오 → 네이버 → 구글 → 애플
- "Community" 로고 텍스트, "함께하는 즐거움을 발견하세요" 카피
- `AppToast` 사용 (SnackBar 직접 사용 금지)
- Padding: 본 화면은 `EdgeInsets.all(24)` 사용 (.pen 디자인 따름) — 일반 `AppSpacing.screenPadding`(16)이 아님
- 입력 필드 사이 간격 12~20px
- 약관 동의 카드 라운드 12, 패딩 16
- 체크박스 크기 22×22, 라운드 6

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 신규 회원이 이메일로 가입한다 (Happy Path) | 앱 첫 실행, 토큰 없음, 로그인 화면(SCR-AU-001) | User 레코드 생성 (status=NORMAL, emailVerified=false), Refresh/Access 토큰 저장, 로그인 화면 표시 |
| S2 | 가입 직후 로그인하여 이메일 인증 화면으로 진입한다 | 로그인 화면, 토큰은 있으나 이메일 미인증 | `loginAt` 설정, `status=NORMAL`, 온보딩 또는 이메일 인증 화면 진입 |
| S3 | 잘못된 비밀번호로 로그인 실패 | 로그인 화면, 정상 이메일 + 잘못된 비밀번호 입력 | 로그인 화면 유지, 토큰 미발급 |
| S4 | 이메일 중복 가입 시도 | 회원가입 화면 | 회원가입 화면 유지 |
| S5 | 미성년자(만 19세 미만) 가입 차단 | 회원가입 화면, 모든 필드 입력 완료 | User 레코드 생성 안 됨, 화면 유지 |
| S6 | 잠금/탈퇴 상태 사용자의 로그인 시도 | 로그인 화면 | 로그인 거부, 화면 유지 |
| S7 | 닉네임 중복으로 가입 실패 | 이미 사용 중인 닉네임을 선택한 신규 회원 | 가입 실패, 사용자가 닉네임 변경하여 재시도 |
| S8 | 비밀번호 검증 정책 위반 (8자 미만 또는 조합 부족) | 앱 콜드 스타트, 토큰/저장소 비어있음, splash → 로그인 화면 도달 직후 | 가입 차단 |

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

- **AC-01. 신규 회원이 이메일로 가입한다 (Happy Path)**: Given 앱 첫 실행, 토큰 없음, 로그인 화면(SCR-AU-001) When 사용자가 해당 흐름을 실행하면 Then User 레코드 생성 (status=NORMAL, emailVerified=false), Refresh/Access 토큰 저장, 로그인 화면 표시
- **AC-02. 가입 직후 로그인하여 이메일 인증 화면으로 진입한다**: Given 로그인 화면, 토큰은 있으나 이메일 미인증 When 사용자가 해당 흐름을 실행하면 Then `loginAt` 설정, `status=NORMAL`, 온보딩 또는 이메일 인증 화면 진입
- **AC-03. 잘못된 비밀번호로 로그인 실패**: Given 로그인 화면, 정상 이메일 + 잘못된 비밀번호 입력 When 사용자가 해당 흐름을 실행하면 Then 로그인 화면 유지, 토큰 미발급
- **AC-04. 이메일 중복 가입 시도**: Given 회원가입 화면 When 사용자가 해당 흐름을 실행하면 Then 회원가입 화면 유지
- **AC-05. 미성년자(만 19세 미만) 가입 차단**: Given 회원가입 화면, 모든 필드 입력 완료 When 사용자가 해당 흐름을 실행하면 Then User 레코드 생성 안 됨, 화면 유지
- **AC-06. 잠금/탈퇴 상태 사용자의 로그인 시도**: Given 로그인 화면 When 사용자가 해당 흐름을 실행하면 Then 로그인 거부, 화면 유지
- **AC-07. 닉네임 중복으로 가입 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가입 실패, 사용자가 닉네임 변경하여 재시도
- **AC-08. 비밀번호 검증 정책 위반 (8자 미만 또는 조합 부족)**: Given 앱 콜드 스타트, 토큰/저장소 비어있음, splash → 로그인 화면 도달 직후 When 사용자가 해당 흐름을 실행하면 Then 가입 차단

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
