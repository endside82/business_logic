# F01-03. 이메일 인증 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-03_email-verification -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-03_email-verification`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

회원이 본인 이메일 주소를 실제로 소유하고 있는지 검증한다. 로그인된 사용자가 인증 메일 발송을 요청하면 24시간 만료 토큰이 DB에 저장되고 메일이 발송된다. 메일의 Deep Link로 앱이 토큰을 받으면 confirm 호출로 `users.email_verified=true`가 갱신된다. 동일 기능이 `/api/v1/auth/*`(AuthController)와 `/api/v1/users/me/email/verify/*`(AccountController) 두 경로에 미러링되어 있다 — 클라이언트는 발송에 `auth/send-verification-email`, 인증에 `auth/verify-email`을 사용한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 회원가입 직후 자동 이동 (현재 구현은 가입 → 토스트 후 로그인 화면, 사용자가 다시 로그인하면 이메일 인증 화면 분기 가능)
- 미인증 사용자가 로그인 시도 (서버는 별도 분기를 강제하지 않으나 클라이언트가 SCR-AU-006으로 라우팅 가능)
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
1. 화면 진입 시: 별도 자동 호출 없음 (가입/로그인 흐름에서 이미 발송된 가정)
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

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - `notification.service.EmailService` (SMTP 발송)
- 외부 시스템: SMTP 서버 (Spring Mail)
- 환경 변수: `app.base-url` (Deep Link 기본 URL, 기본값 `https://community.endside.com`)
- 후속 흐름: 인증 완료 후 클라이언트가 `/onboarding/welcome` 또는 `/home`으로 분기 (백엔드는 분기 결정 안 함)

## 5. 프론트 계약

### 진입 경로

- 회원가입 직후 자동 이동 (현재 구현은 가입 → 토스트 후 로그인 화면, 사용자가 다시 로그인하면 이메일 인증 화면 분기 가능)
- 미인증 사용자가 로그인 시도 (서버는 별도 분기를 강제하지 않으나 클라이언트가 SCR-AU-006으로 라우팅 가능)
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
1. 화면 진입 시: 별도 자동 호출 없음 (가입/로그인 흐름에서 이미 발송된 가정)
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
- 만약 token 인증이 성공해도 토큰은 갱신 안 함 — 사용자는 다음 로그인 시 본인 토큰을 다시 발급받아야 (현재 흐름)

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
| 후보 | frontend.md:71 | - 성공 후 분기: 본 단위 화면은 "로그인으로 이동" 버튼만 제공 (이미 로그인된 상태여도 재로그인 유도) — 다른 흐름(세션 유지 + `/home`로 직접 이동)은 미구현 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 가입 직후 메일 발송 + 링크 클릭으로 인증 완료 (Happy Path)**: Given 회원가입 완료, 토큰 보유, 이메일 미인증 When 사용자가 해당 흐름을 실행하면 Then `users.email_verified = true`, 메인 진입 가능
- **AC-02. 메일 미수신, 60초 후 재발송 요청**: Given 모드 A 화면 표시 중 When 사용자가 해당 흐름을 실행하면 Then 새 토큰 발급, 메일 재발송, 카운트다운 진행
- **AC-03. 만료된 토큰 링크 클릭**: Given 만료된 인증 메일 When 사용자가 해당 흐름을 실행하면 Then 만료 안내, 재발송 가능
- **AC-04. 이미 인증된 사용자가 토큰 재사용 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변화 없음
- **AC-05. 잘못된/위조된 토큰**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 인증 실패
- **AC-06. 로그인 직후 미인증 상태에서 자동 발송 (사용자 컨텍스트 필요)**: Given 로그인 됨, `emailVerified=false` When 사용자가 해당 흐름을 실행하면 Then 새 토큰 발급, 메일 발송
- **AC-07. 이미 인증된 사용자가 발송 요청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 발송 안 됨
- **AC-08. SMTP 발송 실패 (외부 메일 서버 장애)**: Given 비로그인 상태, 로그인 화면 도달 후 deep link 진입 시뮬레이션 When 사용자가 해당 흐름을 실행하면 Then 사용자가 메일 앱 진입 / 재발송 / 로그인 복귀 중 하나의 행동을 선택할 수 있는 안정적 surface

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
