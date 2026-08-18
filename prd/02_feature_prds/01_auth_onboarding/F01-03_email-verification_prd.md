# F01-03. 이메일 인증 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-03_email-verification -->

> 문서 상태: **실사 기반 전환본 + 2026-08-18 개정**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-03_email-verification`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> **2026-08-18 개정(P0-E2E-02 결정 A — 미인증 = 제한 세션)**. 2026-05-18 전환본이 "서버는 별도 분기를 강제하지 않는다"고 적었던 것은 당시 사실이었고, 실계정 E2E가 그 결과(미인증 계정이 호스트 승인·이벤트/클럽/정기모임 운영까지 도달)를 적발했다. 해당 서술은 **폐기**되며, 아래 §4.1 제한 세션 계약이 현재 정본이다. 근거 소스: `community_api/src/main/java/com/endside/community/config/security/EmailVerificationPolicy.java`·`EmailVerificationInterceptor.java`·`account/service/AuthService.java`·`account/service/SocialLoginService.java`(api HEAD `d5de51c0`, 집행 커밋 `7fb4eb7d`), `community_app`(HEAD `b513b006`).

## 1. 결론

회원이 본인 이메일 주소를 실제로 소유하고 있는지 검증한다. **회원가입이 완료되면 서버가 첫 인증 메일을 스스로 보낸다**(가입 트랜잭션 커밋 후 격리 실행 — 발송 실패가 가입을 되돌리지 않는다). 로그인된 사용자가 인증 메일 발송을 요청하면 24시간 만료 토큰이 DB에 저장되고 메일이 발송된다. 메일의 Deep Link로 앱이 토큰을 받으면 confirm 호출로 `users.email_verified=true`가 갱신된다. 동일 기능이 `/api/v1/auth/*`(AuthController)와 `/api/v1/users/me/email/verify/*`(AccountController) 두 경로에 미러링되어 있다 — 클라이언트는 발송에 `auth/send-verification-email`, 인증에 `auth/verify-email`을 사용한다.

**인증 여부는 이제 권한 경계다.** 미인증 계정도 로그인은 성공하지만(토큰 발급됨), 그 세션은 §4.1 허용 목록 15행 밖의 모든 요청에서 `403 EMAIL_NOT_VERIFIED(100020)`을 받는다. 인증 링크를 누르면 **다음 요청부터** 즉시 정상 세션으로 승격된다 — 판정 근거가 토큰이 아니라 매 요청 조회하는 `users.email_verified` 이므로 재로그인도 토큰 갱신도 필요 없다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 회원가입 직후 (가입 → 토스트 후 로그인 화면. 서버는 이 시점에 이미 첫 인증 메일을 보냈다 — 사용자가 아무것도 누르지 않아도 메일이 도착한다)
- 미인증 사용자가 로그인 (**서버가 제한 세션으로 경계를 강제하고**, 앱 라우터가 그 상태를 읽어 SCR-AU-006으로 보낸다 — 종전의 "서버는 강제하지 않고 클라이언트만 라우팅 가능"은 2026-08-18 결정으로 대체됨)
- **Deep Link**: 사용자가 메일 내 링크 탭 → `community://auth/email-verification?token=<uuid>` 또는 유사 형태로 앱 진입 → 화면 빌드 시 `widget.token` 채워져 자동 인증

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-03_email-verification/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-03_email-verification/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-03_email-verification/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-03_email-verification/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/AccountController.java:25` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/AccountController.java:35` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:88` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:94` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 모드 A (안내 + 재발송)
1. 화면 진입 시: 별도 자동 호출 없음 (2026-08-18 정정 — 종전에는 "이미 발송된 **가정**"이었으나, 이제 가입이 커밋되면 서버가 첫 메일을 실제로 발송한다)
2. 사용자 "재발송" 탭:
   - `ref.read(authRepositoryProvider).resendVerification()`
   - `_authApi.resendVerification()` → `POST /api/v1/auth/send-verification-email`
   - 성공 → 토스트 + 쿨다운 타이머 시작

### 모드 B (Deep Link 자동 인증)
1. Deep Link 수신: `DeepLinkService`(외부 단위)가 `community://...?token=xxx` 파싱
2. `GoRouter`로 `/auth/email-verification?token=xxx` push (token이 query parameter로 들어감)
3. `EmailVerificationScreen.initState` → `_autoVerify(token)`
4. `authRepository.verifyEmail(token)` → `_authApi.verifyEmail(token)` → `GET /api/v1/auth/verify-email?token={token}`
5. 성공: `_verifySuccess = true` → 성공 화면 → 사용자가 "로그인으로 이동" 탭하면 `/auth/login`
6. 실패: `resolveApiErrorMessage(error)` 메시지 표시 → 재전송 또는 복귀

## 4. 서버 계약

### 개요

회원이 본인 이메일 주소를 실제로 소유하고 있는지 검증한다. 로그인된 사용자가 인증 메일 발송을 요청하면 24시간 만료 토큰이 DB에 저장되고 메일이 발송된다. 메일의 Deep Link로 앱이 토큰을 받으면 confirm 호출로 `users.email_verified=true`가 갱신된다. 동일 기능이 `/api/v1/auth/*`(AuthController)와 `/api/v1/users/me/email/verify/*`(AccountController) 두 경로에 미러링되어 있다 — 클라이언트는 발송에 `auth/send-verification-email`, 인증에 `auth/verify-email`을 사용한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/auth/send-verification-email | `AuthController#sendVerificationEmail` | required | 인증 메일 발송 (24h 토큰) |
| GET | /api/v1/auth/verify-email | `AuthController#verifyEmail` | 불필요 | 토큰으로 인증 완료 |
| POST | /api/v1/users/me/email/verify/send | `AccountController#sendVerificationEmail` | required | 동일 발송 (계정 설정 경로) |
| POST | /api/v1/users/me/email/verify/confirm | `AccountController#confirmEmailVerification` | required | 토큰으로 인증 완료 (POST 버전) |

### 4.1 제한 세션 계약 (2026-08-18 신설 — P0-E2E-02 결정 A)

`EmailVerificationInterceptor`가 인증된 요청마다 `UserPrincipal.emailVerified`를 보고, `false`이면 `EmailVerificationPolicy.ALLOWED_ROUTES`(HTTP 메서드 + 경로 패턴 쌍, fail-closed)에 없는 모든 요청을 `403` + `ErrorCode.EMAIL_NOT_VERIFIED`(errorCode `100020`, **신설 아님 — 기존 예약 코드 재사용**)로 거부한다.

| 열려 있는 것 | 메서드/경로 | 열어 둔 이유 |
|---|---|---|
| 자기 상태 조회 | `GET /api/v1/users/me` | 앱은 부팅 시 이 응답으로 세션을 확인하고 실패하면 토큰을 지운다 — 막으면 로그아웃 → 재로그인 → 재차단의 무한 루프가 되어 안내 화면에 도달조차 못 한다. 응답의 `emailVerified`가 앱이 콜드 스타트에서 관문을 세우는 유일한 근거이기도 하다. **`PATCH`(프로필 수정)는 닫혀 있다.** |
| 출시 범위 조회 | `GET /api/v1/app/release-scope` | 앱이 메뉴·라우트를 그리기 전에 읽는다(P0-SCOPE-01 DEC-S6). |
| 절차를 끝내는 창구 4행 | `POST /api/v1/auth/send-verification-email`, `GET /api/v1/auth/verify-email`, `POST /api/v1/users/me/email/verify/send`, `POST /api/v1/users/me/email/verify/confirm` | 인증하려면 이 API를 불러야 한다 — 막으면 데드락. 미러 경로 두 개를 함께 여는 이유는 한쪽만 열면 클라이언트가 문을 바꿔 부르는 순간 사용자가 갇히기 때문이다. |
| 정보주체 권리 7행 | `GET /users/me/deactivation-check`, `DELETE /users/me`, `POST·GET /users/me/data-export(/status)`, `POST·GET·DELETE /users/me/data-deletion(/status)` | 미인증은 제재가 아니라 미완의 절차다. 절차를 끝내지 않기로 한 사용자가 계정을 정리하고 나가는 길과 자기 데이터에 대한 권리는 주소 증명과 무관하게 성립한다. **오타 주소로 가입해 메일을 영영 받을 수 없는 계정의 유일한 정상 종료 경로**이기도 하다(탈퇴 후 올바른 주소로 재가입). |
| 탈출 | `POST /api/v1/auth/logout`, `POST /api/v1/auth/refresh` | 로그아웃을 막으면 기기에서 내려올 방법이 없고, 갱신을 막으면 제한 세션이 만료된 뒤 아무 창구도 열 수 없다. |

- **승격 시점**: 판정 근거는 매 요청 DB의 `users.email_verified` 다(JWT에 상태를 심지 않는다 — 계정 잠금 DEC-A2와 의도적으로 다르다). 인증 링크를 누른 직후 **다음 요청부터** 정상 통과하며 재로그인·토큰 갱신이 필요 없다.
- **관문 사슬 순서**: 계정 잠금 → **이메일 인증** → 재동의 → 출시 범위. 제재된 계정에게는 "이메일을 인증하라"가 아니라 "정지된 계정"이라고 답해야 하므로 계정 잠금이 앞이다. 그 결과 정지·차단 계정에게는 위 정보주체 권리 7행이 **열리지 않는다**(`AccountLockPolicy`가 같은 경로를 일부러 닫아 둔다 — 탈퇴로 제재를 지울 수 없게).
- **소셜 가입은 인증 완료 상태로 태어난다**: `SocialLoginService`가 신규 소셜 계정 생성 시 `emailVerified=true`로 저장한다. 소셜 계정의 `email` 값은 제공자가 준 주소가 아니라 `socialId`로 합성한 내부 식별자(`{socialId}@{provider}`)라 메일이 영원히 닿지 않기 때문이다 — 그대로 두면 빠져나올 수 없는 제한 세션에 갇힌다. 신원은 제공자 토큰 검증으로 이미 증명된다. ⛔ **기존 이메일 계정에 소셜을 연결(link)하는 경로에서는 세우지 않는다** — 그 계정의 주소는 사용자가 입력한 실제 주소이고 제공자가 그것을 증명하지 않았으므로, 연결로 세우면 타인 주소 인증 우회가 된다.
- **응답 필드**: `LoginVo.emailVerified`·`UserProfileVo.emailVerified`가 상시 내려간다(2026-08-18 추가).

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - `notification.service.EmailService` (SMTP 발송)
  - `account.service.AuthService#signup` — 가입 커밋 후 첫 인증 메일을 격리 발송한다(`AfterCommitExecutor.runSafely`). 인라인 호출이면 발송 서비스의 쓰기 트랜잭션이 가입 트랜잭션에 합류해 발송 실패가 가입을 되돌린다. 발송 실패 시 사용자는 앱의 재전송으로 복구한다.
- 외부 시스템: SMTP 서버 (Spring Mail)
- 환경 변수: `app.base-url` (Deep Link 기본 URL, 기본값 `https://community.endside.com`)
- 후속 흐름: 인증 완료 후 클라이언트가 `/onboarding/welcome` 또는 `/home`으로 분기 (백엔드는 분기 결정 안 함)

## 5. 프론트 계약

### 진입 경로

- 회원가입 직후 (가입 → 토스트 후 로그인 화면. 서버가 이미 첫 인증 메일을 보낸 상태다)
- 미인증 사용자가 로그인 (2026-08-18 개정 — 앱은 `emailVerificationProvider` 단일 상태로 판정하고 라우터 사슬 **계정 잠금 → 이메일 → 재동의 → 출시 범위**에서 이 화면으로 보낸다. 상태의 근거는 로그인/가입/갱신 응답의 `emailVerified`, 콜드 스타트의 `GET /users/me`, 그리고 `403 EMAIL_NOT_VERIFIED(100020)` 감지 세 가지다. ⛔ 403을 받아도 **토큰을 폐기하지 않는다** — 이것은 인증 실패가 아니라 관문 진입이다)
- 미인증 세션에서 앱이 허용하는 화면은 3개다: 이 인증 화면, 로그인 화면, 개인정보/탈퇴 화면(서버 정보주체 권리 7행의 거울). 인증 화면의 출구는 실제 로그아웃이다.
- **Deep Link**: 사용자가 메일 내 링크 탭 → `community://auth/email-verification?token=<uuid>` 또는 유사 형태로 앱 진입 → 화면 빌드 시 `widget.token` 채워져 자동 인증

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/auth/email-verification` | `lib/presentation/auth/screens/email_verification_screen.dart` | SCR-AU-006 이메일 인증 |

생성자 파라미터: `email: String?`, `token: String?`

### 화면별 구성 요소 & 액션

### 이메일 인증 화면 (`email_verification_screen.dart`)
화면은 두 가지 모드로 분기된다:

#### 모드 A — 메일 발송 안내 (`widget.token == null`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '이메일 인증')`
  - 96×96 원형 배경 (`AppColors.secondary100`) + `mark_email_unread_outlined` 아이콘 (44px, primary500)
  - 헤딩 "인증 이메일을 보냈습니다" (heading3)
  - 본문 "{email}로 인증 메일을 보냈습니다.\n메일함을 확인해주세요." (body2, textSecondary)
  - "이메일 앱 열기" outline 버튼 (`ButtonVariant.outline`, fullWidth, lg)
  - "인증 이메일 재발송" 텍스트 링크 (60초 쿨다운, 카운트다운 표시)
  - "로그인으로 돌아가기" 텍스트 링크
- **사용자가 할 수 있는 액션**:
  - "이메일 앱 열기" 탭 → `launchUrl(Uri(scheme: 'mailto'))` (디바이스 메일 앱 실행)
  - "인증 이메일 재발송" 탭 → `authRepository.resendVerification()` ▶ `POST /api/v1/auth/send-verification-email`
    - 성공: `AppToast.show("인증 메일을 다시 보냈습니다", type: success)` + 60초 쿨다운 시작
    - 쿨다운 중에는 클릭 무효, "인증 이메일 재발송 (45초)" 식 표시
  - "로그인으로 돌아가기" 탭 → `context.go('/auth/login')`

#### 모드 B — 토큰 자동 인증 (`widget.token != null`)
- **사용자가 보는 것**: 위 AppBar + 다음 3가지 상태 중 하나
  - 진행: `CircularProgressIndicator` + "이메일 인증 중..." (heading3)
  - 성공: `check_circle_outline` (64px, success500) + "이메일 인증이 완료되었습니다" + "이제 모든 기능을 사용할 수 있습니다." + "로그인으로 이동" 버튼
  - 실패: `error_outline` (64px, error500) + "이메일 인증에 실패했습니다" + 에러 메시지 + "인증 메일 재전송" outline + "로그인으로 돌아가기" ghost
- **자동 처리**:
  - `initState`에서 `_autoVerify(widget.token!)` 호출
  - `authRepository.verifyEmail(token)` → `GET /api/v1/auth/verify-email?token={token}`
  - 결과에 따라 `_verifySuccess` 또는 `_verifyError` 설정
- **사용자가 할 수 있는 액션** (실패 시):
  - "인증 메일 재전송" 탭 → `_handleResend()` 호출 (재발송)
  - "로그인으로 돌아가기" 탭 → `/auth/login`

### API 호출 순서 (Provider/Repository 관점)

### 모드 A (안내 + 재발송)
1. 화면 진입 시: 별도 자동 호출 없음 (2026-08-18 정정 — 종전에는 "이미 발송된 **가정**"이었으나, 이제 가입이 커밋되면 서버가 첫 메일을 실제로 발송한다)
2. 사용자 "재발송" 탭:
   - `ref.read(authRepositoryProvider).resendVerification()`
   - `_authApi.resendVerification()` → `POST /api/v1/auth/send-verification-email`
   - 성공 → 토스트 + 쿨다운 타이머 시작

### 모드 B (Deep Link 자동 인증)
1. Deep Link 수신: `DeepLinkService`(외부 단위)가 `community://...?token=xxx` 파싱
2. `GoRouter`로 `/auth/email-verification?token=xxx` push (token이 query parameter로 들어감)
3. `EmailVerificationScreen.initState` → `_autoVerify(token)`
4. `authRepository.verifyEmail(token)` → `_authApi.verifyEmail(token)` → `GET /api/v1/auth/verify-email?token={token}`
5. 성공: `_verifySuccess = true` → 성공 화면 → 사용자가 "로그인으로 이동" 탭하면 `/auth/login`
6. 실패: `resolveApiErrorMessage(error)` 메시지 표시 → 재전송 또는 복귀

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 60초 재발송 쿨다운 정책 (`_cooldownSeconds = 60`)
- 카운트다운을 1초 단위 `Timer.periodic`로 표시
- "이메일 앱 열기" → `mailto:` 스킴 사용 (다른 옵션: 이메일 도메인별 직접 URL 분기)
- 토큰 자동 인증 시 화면 내 3가지 시각 상태 (loading/success/error)
- 성공 후 분기: 본 단위 화면은 "로그인으로 이동" 버튼만 제공 (이미 로그인된 상태여도 재로그인 유도) — 다른 흐름(세션 유지 + `/home`로 직접 이동)은 미구현
- 메일 도착 안내 본문 카피 한글 번역
- 96×96 원형 + 44px 아이콘 비주얼 (.pen 디자인)
- 라우트는 `/auth/email-verification`이며 token/email은 query parameter로 전달
- 인증이 성공해도 토큰은 갱신되지 않는다. ⛔ 2026-08-18 정정: 종전 서술("사용자는 다음 로그인 시 본인 토큰을 다시 발급받아야")은 **폐기**한다 — 서버 판정 근거가 토큰이 아니라 매 요청 DB 조회이므로, 갱신되지 않은 같은 토큰이 다음 요청부터 그대로 정상 통과한다. 재로그인은 UI 동선일 뿐 권한상 필요하지 않다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 가입 직후 메일 발송 + 링크 클릭으로 인증 완료 (Happy Path) | 회원가입 완료, 토큰 보유, 이메일 미인증 | `users.email_verified = true`, 메인 진입 가능 |
| S2 | 메일 미수신, 60초 후 재발송 요청 | 모드 A 화면 표시 중 | 새 토큰 발급, 메일 재발송, 카운트다운 진행 |
| S3 | 만료된 토큰 링크 클릭 | 만료된 인증 메일 | 만료 안내, 재발송 가능 |
| S4 | 이미 인증된 사용자가 토큰 재사용 시도 | 시나리오 본문 참조 | 변화 없음 |
| S5 | 잘못된/위조된 토큰 | 시나리오 본문 참조 | 인증 실패 |
| S6 | 로그인 직후 미인증 상태에서 자동 발송 (사용자 컨텍스트 필요) | 로그인 됨, `emailVerified=false` | 새 토큰 발급, 메일 발송 |
| S7 | 이미 인증된 사용자가 발송 요청 | 시나리오 본문 참조 | 발송 안 됨 |
| S8 | SMTP 발송 실패 (외부 메일 서버 장애) | 비로그인 상태, 로그인 화면 도달 후 deep link 진입 시뮬레이션 | 사용자가 메일 앱 진입 / 재발송 / 로그인 복귀 중 하나의 행동을 선택할 수 있는 안정적 surface |
| S9 (2026-08-18 신설) | 미인증 계정이 일반 기능을 시도 | 로그인 성공, `emailVerified=false` | 허용 목록 밖 모든 요청이 `403 EMAIL_NOT_VERIFIED(100020)`. 앱은 토큰을 유지한 채 인증 화면으로 보낸다. 종전에는 호스트 승인·이벤트/클럽/정기모임 운영까지 통과했다(폐기) |
| S10 (2026-08-18 신설) | 인증 직후 같은 토큰으로 재시도 | S9 상태에서 인증 링크 클릭 성공 | 재로그인·토큰 갱신 없이 **같은 토큰**으로 다음 요청부터 정상 통과 |
| S11 (2026-08-18 신설) | 가입 직후 아무것도 누르지 않음 | 이메일 가입 완료 | 서버가 보낸 첫 인증 메일이 도착해 있다. SMTP 실패 시에도 가입은 유지되고 재전송으로 복구 |
| S12 (2026-08-18 신설) | 오타 주소로 가입해 메일을 받을 수 없음 | `emailVerified=false`, 도달 불가 주소 | 제한 세션에서도 탈퇴·데이터 내보내기/삭제가 열려 있어 계정을 정리하고 올바른 주소로 재가입할 수 있다 |
| S13 (2026-08-18 신설) | 소셜 신규 가입 | 제공자 토큰 검증 성공, 신규 사용자 | `emailVerified=true`로 생성되어 제한 세션에 들어가지 않는다. 기존 이메일 계정에 소셜을 **연결**하는 경로는 이 승격을 하지 않는다 |

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
| 후보 | frontend.md:71 | - 성공 후 분기: 본 단위 화면은 "로그인으로 이동" 버튼만 제공 (이미 로그인된 상태여도 재로그인 유도) — 다른 흐름(세션 유지 + `/home`로 직접 이동)은 미구현 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정. 2026-08-18 기준 **권한상으로는 재로그인이 불필요**하므로 UX 개선 후보로만 남는다 |
| Gap (2026-08-18) | `EmailVerificationPolicy.ALLOWED_ROUTES` | 미인증 상태로 방치된 계정을 정리하는 스케줄러가 없다. 제한 세션은 무기한 유지된다 | 보관 기간 정책 확정 후 정리 배치 신설 (P1) |
| Gap (2026-08-18) | 신규 환경 배포 | 관문 도입 이전에 만들어진 `email_verified=0` 계정은 배포 즉시 제한 세션이 된다. 신규 환경에 기존 데이터를 옮길 때 1회 보수가 필요하다 | 배포 런북에 1회 보수 절차 등재 |
| Risk (2026-08-18) | 허용 목록이 단일 소유 지점 | 새 화면이 늘어날 때 허용 목록을 넓히면 경계가 조용히 사라진다. 특히 `GET /users/me`는 열려 있고 `PATCH`는 닫혀 있는 **메서드 구분**이 무너지기 쉽다 | 목록 변경은 이 PRD §4.1 표와 1:1로 갱신 |
| 파급 (미반영) | 관련 화면 | 제한 세션이 화면 단위로 무엇을 어떻게 안내하는지는 각 도메인 PRD에 아직 반영되지 않았다(이번 개정은 F01-03 한정) | `PRD_MIGRATION_STATUS.md` 2026-08 미반영 백로그 참조 |

## 9. 수용 기준

- **AC-01. 가입 직후 메일 발송 + 링크 클릭으로 인증 완료 (Happy Path)**: Given 회원가입 완료, 토큰 보유, 이메일 미인증 When 사용자가 해당 흐름을 실행하면 Then `users.email_verified = true`, 메인 진입 가능
- **AC-02. 메일 미수신, 60초 후 재발송 요청**: Given 모드 A 화면 표시 중 When 사용자가 해당 흐름을 실행하면 Then 새 토큰 발급, 메일 재발송, 카운트다운 진행
- **AC-03. 만료된 토큰 링크 클릭**: Given 만료된 인증 메일 When 사용자가 해당 흐름을 실행하면 Then 만료 안내, 재발송 가능
- **AC-04. 이미 인증된 사용자가 토큰 재사용 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변화 없음
- **AC-05. 잘못된/위조된 토큰**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 인증 실패
- **AC-06. 로그인 직후 미인증 상태에서 자동 발송 (사용자 컨텍스트 필요)**: Given 로그인 됨, `emailVerified=false` When 사용자가 해당 흐름을 실행하면 Then 새 토큰 발급, 메일 발송
- **AC-07. 이미 인증된 사용자가 발송 요청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 발송 안 됨
- **AC-08. SMTP 발송 실패 (외부 메일 서버 장애)**: Given 비로그인 상태, 로그인 화면 도달 후 deep link 진입 시뮬레이션 When 사용자가 해당 흐름을 실행하면 Then 사용자가 메일 앱 진입 / 재발송 / 로그인 복귀 중 하나의 행동을 선택할 수 있는 안정적 surface
- **AC-09 (2026-08-18). 미인증 제한 세션**: Given 이메일 가입 후 인증하지 않은 계정으로 로그인 성공 When §4.1 허용 목록 밖의 요청을 보내면 Then `403` + `EMAIL_NOT_VERIFIED(100020)`이 내려오고, 앱은 토큰을 지우지 않은 채 인증 화면으로 이동한다
- **AC-10 (2026-08-18). 즉시 승격**: Given AC-09 상태 When 인증 링크를 눌러 검증이 성공하면 Then **같은 access token으로** 보낸 다음 요청이 정상 처리된다(재로그인·갱신 없이)
- **AC-11 (2026-08-18). 가입 시 첫 메일**: Given 이메일 회원가입 요청이 성공(201) When 사용자가 아무 버튼도 누르지 않으면 Then 인증 메일이 이미 발송되어 있다. 발송이 실패해도 가입 결과(사용자·동의·토큰)는 그대로 유지된다
- **AC-12 (2026-08-18). 미인증 계정의 정상 종료**: Given 도달 불가 주소로 가입한 미인증 계정 When 탈퇴 또는 데이터 내보내기/삭제를 요청하면 Then 차단되지 않고 처리된다(정지·차단 계정에는 적용되지 않는다 — 관문 사슬상 계정 잠금이 먼저다)
- **AC-13 (2026-08-18). 소셜 신규 가입**: Given 제공자 토큰 검증에 성공한 신규 소셜 가입 When 가입이 완료되면 Then `emailVerified=true`로 생성되어 제한 세션에 들어가지 않는다

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- **(2026-08-18) 후속 3건**: ① 미인증 방치 계정 정리 스케줄러(보관 기간 정책 선행) ② 신규 환경 배포 시 기존 `email_verified=0` 행 1회 보수 ③ 제한 세션의 화면별 안내 문구를 각 도메인 PRD에 파급 반영.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
