# F01-02. 소셜 로그인 (Apple/Google/Kakao/Naver) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-02_social-login -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-02_social-login`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

외부 OAuth 제공자(Apple/Google/Kakao/Naver)로부터 받은 access token 또는 identity token을 검증하고, 해당 소셜 ID로 기존 사용자를 찾아 로그인하거나 신규 회원을 즉시 생성한다. 이메일 가입 절차 없이 단 한 번의 API 호출로 가입+로그인이 완료되며, 응답의 `isNewUser` 플래그로 신규 여부를 구분한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 로그인 화면(SCR-AU-001) 하단 4종 소셜 버튼 (`SocialLoginButtons`)
- 회원가입 화면 → "소셜로 시작하기" 흐름은 본 프로젝트에서 별도 화면 없음 (로그인 화면이 가입 진입점 역할)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-02_social-login/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-02_social-login/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-02_social-login/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-02_social-login/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:61` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 사용자 소셜 버튼 탭
2. `SocialLoginInfoSheet.show()` → 닉네임/생년월일/약관 수집
3. `SocialAuthFactory.create(provider).signIn()` → SDK 토큰 획득
4. `ref.read(authNotifierProvider.notifier).socialLogin(request)`
5. `AuthRepository.socialLogin(request)` → `_authApi.socialLogin(request)` → `POST /api/v1/auth/social`
6. 응답 `LoginResponse(isNewUser=true/false)` → `tokenStorage.saveTokens(...)`
7. `_syncOnboardingStateAfterLogin(isNewUser)`:
   - `isNewUser=true` → onboarding storage clear + onboardingRoute refresh (다음 단계 미리 캐싱)
   - `isNewUser=false` → markOnboardingDone + onboardingRoute = `/home`
8. `_fetchAndSetUser(requireOnboarding: isNewUser)` → `GET /api/v1/users/me`
9. `AuthState` 전이 → 라우터 redirect

## 4. 서버 계약

### 개요

외부 OAuth 제공자(Apple/Google/Kakao/Naver)로부터 받은 access token 또는 identity token을 검증하고, 해당 소셜 ID로 기존 사용자를 찾아 로그인하거나 신규 회원을 즉시 생성한다. 이메일 가입 절차 없이 단 한 번의 API 호출로 가입+로그인이 완료되며, 응답의 `isNewUser` 플래그로 신규 여부를 구분한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/auth/social | `AuthController#socialLogin` | 불필요 | 소셜 토큰 검증 + 자동 가입/로그인 (200) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `ProviderType`: `EMAIL(0)`, `KAKAO(1)`, `NAVER(2)`, `GOOGLE(3)`, `APPLE(4)` — 소셜은 1~4
- **Enum** `LoginType`: `EMAIL("email")`, `SOCIAL("social")` — 토큰 발급 시 SOCIAL 사용
- **Entity 요약**:
  - `SocialLogin`: userId, providerType (int), socialId (String, "google_xxx" 형식)
  - `Users`: 이메일 가입과 동일 — 단, 비밀번호 null로 생성됨 (소셜 단일 가입자)
- **VO** `LoginVo`: 동일 구조 (F01-01 참조)

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 없음 — 자체 진입 지점
- 후속 호출: F01-06 (신규 사용자 온보딩)
- 외부 시스템:
  - Google ID Token Verifier (`https://www.googleapis.com/oauth2/v3/certs` 키 캐싱)
  - Kakao API (`https://kapi.kakao.com/v2/user/me`)
  - Naver API (`https://openapi.naver.com/v1/nid/me`)
  - Apple JWKS (`https://appleid.apple.com/auth/keys`)
- 환경 변수: `social.google.client-id` (Google audience 검증용)

## 5. 프론트 계약

### 진입 경로

- 로그인 화면(SCR-AU-001) 하단 4종 소셜 버튼 (`SocialLoginButtons`)
- 회원가입 화면 → "소셜로 시작하기" 흐름은 본 프로젝트에서 별도 화면 없음 (로그인 화면이 가입 진입점 역할)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen / Widget 파일 | 역할 |
|---|---|---|
| `/auth/login` | `lib/presentation/auth/screens/login_screen.dart` | 소셜 버튼 호스트 |
| (모달) | `lib/presentation/auth/widgets/social_login_buttons.dart` | 4종 소셜 버튼 그룹 |
| (모달) | `lib/presentation/auth/widgets/social_login_info_sheet.dart` | 추가 정보 입력 바텀시트 (닉네임/생년월일/약관) |

### 화면별 구성 요소 & 액션

### `SocialLoginButtons`
- **사용자가 보는 것**: 4개의 52px 높이 버튼, 10px 간격으로 세로 배치
  - 카카오로 시작하기 (배경 #FEE500, 글자 #191919, 채팅 아이콘)
  - 네이버로 시작하기 (배경 #03C75A, 흰색)
  - Google로 시작하기 (배경 흰색, 보더 default, 검정 글자)
  - Apple로 시작하기 (배경 검정, 흰색)
- **사용자가 할 수 있는 액션**:
  - 버튼 탭 → 부모 위젯의 `onSocialLogin(String provider)` 콜백 (provider="kakao"/"naver"/"google"/"apple")

### `SocialLoginInfoSheet` (바텀시트)
- **사용자가 보는 것**:
  - 상단 핸들 (`#D0CFCC`, 40×4px, r=2)
  - 제목 "추가 정보 입력" (heading2)
  - 설명 "서비스 이용을 위해 추가 정보를 입력해주세요." (body2, textSecondary)
  - 닉네임 입력 (`AppTextInput`, maxLength=16, 인라인 에러)
  - 생년월일 picker (탭하여 `showDatePicker` 모달, 1950 ~ today)
  - 약관 동의 카드 (`#F5F4F1` 배경, r=12, p=16)
    - "전체 동의" (16px)
    - "이용약관 동의 (필수)" + chevron
    - "개인정보 처리방침 동의 (필수)" + chevron
    - "마케팅 수신 동의 (선택)" (textSecondary)
  - "시작하기" 기본 버튼 (`ButtonVariant.primary`)
- **사용자가 할 수 있는 액션**:
  - 닉네임 입력 → 2~16자 검증
  - 생년월일 선택
  - 약관 체크
  - "시작하기" 탭 → `Navigator.pop(SocialLoginInfo)` (닉네임/생년월일/약관 동의 결과 반환)
  - 시트 외부 탭 또는 드래그-다운 → `null` 반환 (취소)
- **상태 분기**: `_isFormValid`(닉네임 2~16자 + 생년월일 + 필수 약관 2개 모두) → "시작하기" 버튼 활성화

### 로그인 화면의 `_handleSocialLogin` 흐름
- **사용자가 할 수 있는 액션**:
  1. 소셜 버튼 탭 → `_handleSocialLogin(provider)` 호출
  2. **추가 정보 시트** 먼저 띄우기 — `SocialLoginInfoSheet.show(context, provider)` await
  3. 사용자가 시트 닫으면(취소) early return
  4. 시트 결과(`SocialLoginInfo`) 받으면 `_isLoading = true`로 전환 → `LoadingOverlay` 효과
  5. **소셜 SDK 인증** — `SocialAuthFactory.create(provider).signIn()`
     - Apple: `apple_auth_provider.dart` (sign_in_with_apple)
     - Google: `google_auth_provider.dart`
     - Kakao: `kakao_auth_provider.dart` (kakao_flutter_sdk)
     - Naver: `naver_auth_provider.dart` (flutter_naver_login)
  6. 사용자가 SDK 화면에서 취소 → `authResult == null` → 로딩 해제 후 종료
  7. **서버 호출** — `authNotifierProvider.notifier.socialLogin(SocialLoginRequest(...))`
  8. 성공 시: 토큰 저장, `AuthState.authenticated` 또는 `AuthState.onboarding` 전이, 라우터가 자동 화면 이동
  9. 실패 시:
     - `unauthorized` → "소셜 로그인에 실패했습니다"
     - `conflict` → "이미 가입된 계정입니다"
     - 그 외 → `resolveApiErrorMessage(e)` 일반 메시지

### API 호출 순서 (Provider/Repository 관점)

1. 사용자 소셜 버튼 탭
2. `SocialLoginInfoSheet.show()` → 닉네임/생년월일/약관 수집
3. `SocialAuthFactory.create(provider).signIn()` → SDK 토큰 획득
4. `ref.read(authNotifierProvider.notifier).socialLogin(request)`
5. `AuthRepository.socialLogin(request)` → `_authApi.socialLogin(request)` → `POST /api/v1/auth/social`
6. 응답 `LoginResponse(isNewUser=true/false)` → `tokenStorage.saveTokens(...)`
7. `_syncOnboardingStateAfterLogin(isNewUser)`:
   - `isNewUser=true` → onboarding storage clear + onboardingRoute refresh (다음 단계 미리 캐싱)
   - `isNewUser=false` → markOnboardingDone + onboardingRoute = `/home`
8. `_fetchAndSetUser(requireOnboarding: isNewUser)` → `GET /api/v1/users/me`
9. `AuthState` 전이 → 라우터 redirect

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 4종 소셜 버튼 시각 디자인 (배경색, 아이콘, 텍스트 색상)
- 시트의 약관 카드 배경색 `#F5F4F1` (`AppSemanticColors.surfaceBackground`)
- 닉네임을 시트에서 사전 수집 (서버는 nickname 옵션이지만 UX상 항상 받음)
- 시트 표시 → SDK 호출 → 서버 호출의 순서 결정 (다른 앱은 SDK 먼저, 신규 분기 후 시트 표시할 수도 있음. 본 프로젝트는 무조건 시트 먼저)
- 토스트 카피 "이미 가입된 계정입니다" (서버는 일반 conflict이지만 클라이언트가 사용자 친화 메시지 매핑)
- SDK 취소 vs 서버 실패의 구분 (`authResult == null`이면 토스트 미표시, 서버 실패만 토스트)
- 카카오 SDK iOS/Android 별 KAKAO_APP_KEY 등 빌드 설정 (빌드 시점에 dart-define으로 주입, 본 단위 외부)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 신규 회원이 카카오로 가입+로그인 완료 | 로그인 화면(SCR-AU-001) | 새 사용자 생성, 온보딩 진입 |
| S2 | 기존 카카오 사용자 재로그인 | 로그인 화면, 토큰 만료/없음 | 메인 피드 진입, 입력했던 닉네임/약관 정보는 무시됨 (기존 사용자라 변경 안 함) |
| S3 | 사용자가 SDK 인증 화면에서 취소 | 시트 작성 완료, SDK 인증 진행 중 | 변화 없음 |
| S4 | Apple 토큰 검증 실패 (개발자 설정 오류) | Apple Sign-In 완료, 서버 호출 직전 | 로그인 화면 유지 |
| S5 | 미성년자 신규 소셜 가입 차단 | 시트에서 2010년 입력 | 가입 차단 |
| S6 | 동일 카카오 ID이지만 socialId 형식 변경 이슈 | 과거 SHA-256 해시 방식으로 가입한 사용자 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 차단된(BAN) 기존 소셜 사용자 | 운영자가 차단한 사용자 | 로그인 거부 |
| S8 | 잘못된 provider 문자열 전송 (개발 실수) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:35 | - **Kakao**: `RestTemplate` GET `https://kapi.kakao.com/v2/user/me` Bearer → response body `id` (Long) → `"kakao_" + id`. 주의: 과거 SHA-256 해시 방식에서 변경됨, 기존 계정은 신규로 인식될 수 있음 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 신규 회원이 카카오로 가입+로그인 완료**: Given 로그인 화면(SCR-AU-001) When 사용자가 해당 흐름을 실행하면 Then 새 사용자 생성, 온보딩 진입
- **AC-02. 기존 카카오 사용자 재로그인**: Given 로그인 화면, 토큰 만료/없음 When 사용자가 해당 흐름을 실행하면 Then 메인 피드 진입, 입력했던 닉네임/약관 정보는 무시됨 (기존 사용자라 변경 안 함)
- **AC-03. 사용자가 SDK 인증 화면에서 취소**: Given 시트 작성 완료, SDK 인증 진행 중 When 사용자가 해당 흐름을 실행하면 Then 변화 없음
- **AC-04. Apple 토큰 검증 실패 (개발자 설정 오류)**: Given Apple Sign-In 완료, 서버 호출 직전 When 사용자가 해당 흐름을 실행하면 Then 로그인 화면 유지
- **AC-05. 미성년자 신규 소셜 가입 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가입 차단
- **AC-06. 동일 카카오 ID이지만 socialId 형식 변경 이슈**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 차단된(BAN) 기존 소셜 사용자**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 로그인 거부
- **AC-08. 잘못된 provider 문자열 전송 (개발 실수)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
