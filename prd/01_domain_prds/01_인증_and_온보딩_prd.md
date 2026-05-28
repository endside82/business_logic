# 01. 인증 & 온보딩 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/01_auth_onboarding/00_overview.md`와 153개 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

이 단위는 사용자가 community 플랫폼에 처음 발을 들이는 진입 지점을 담당한다. 이메일/비밀번호 또는 소셜(Apple/Google/Kakao/Naver) 로그인으로 신원을 증명하고, 회원가입 → 이메일 인증 → 온보딩(웰컴 캐러셀, 프로필 초기 설정, 관심사 태그, 위치)으로 이어지는 첫 사용자 경험(FUE)을 제공한다. 또한 비밀번호 재설정, JWT Access/Refresh 토큰 자동 갱신, 소셜 계정 연결 해제 등 인증 라이프사이클 전반을 책임진다. 이 단위가 끝나면 사용자는 토큰을 보유하고, 프로필·관심사·위치가 채워진 "추천 가능한" 상태로 메인 피드에 진입한다.

이 도메인은 기능 PRD 8개로 구성된다. 현재 기능별 trace source는 총 16개이고, risk 후보는 총 6개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F01-01 | F01-01. 이메일 회원가입 & 로그인 | [F01-01_email-signup-login_prd.md](../02_feature_prds/01_auth_onboarding/F01-01_email-signup-login_prd.md) | [F01-01_email-signup-login](../../units/01_auth_onboarding/F01-01_email-signup-login) | 전환 완료 | 2 | 0 |
| F01-02 | F01-02. 소셜 로그인 (Apple/Google/Kakao/Naver) | [F01-02_social-login_prd.md](../02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | [F01-02_social-login](../../units/01_auth_onboarding/F01-02_social-login) | 전환 완료 | 1 | 1 |
| F01-03 | F01-03. 이메일 인증 | [F01-03_email-verification_prd.md](../02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | [F01-03_email-verification](../../units/01_auth_onboarding/F01-03_email-verification) | 전환 완료 | 4 | 1 |
| F01-04 | F01-04. 비밀번호 재설정 | [F01-04_password-reset_prd.md](../02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | [F01-04_password-reset](../../units/01_auth_onboarding/F01-04_password-reset) | 전환 완료 | 2 | 1 |
| F01-05 | F01-05. 토큰 갱신 & 로그아웃 | [F01-05_token-refresh-logout_prd.md](../02_feature_prds/01_auth_onboarding/F01-05_token-refresh-logout_prd.md) | [F01-05_token-refresh-logout](../../units/01_auth_onboarding/F01-05_token-refresh-logout) | 전환 완료 | 2 | 0 |
| F01-06 | F01-06. 온보딩 (웰컴 → 프로필 → 관심사 → 위치) | [F01-06_onboarding_prd.md](../02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | [F01-06_onboarding](../../units/01_auth_onboarding/F01-06_onboarding) | 전환 완료 | 0 | 1 |
| F01-07 | F01-07. 관심사 태그 관리 | [F01-07_preference-tags_prd.md](../02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | [F01-07_preference-tags](../../units/01_auth_onboarding/F01-07_preference-tags) | 전환 완료 | 4 | 1 |
| F01-08 | F01-08. 소셜 계정 연결 해제 | [F01-08_social-unlink_prd.md](../02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | [F01-08_social-unlink](../../units/01_auth_onboarding/F01-08_social-unlink) | 전환 완료 | 1 | 1 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F01-06](../02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | F01-06. 온보딩 (웰컴 → 프로필 → 관심사 → 위치) | Risk 후보 1, trace 없음 |
| [F01-02](../02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | F01-02. 소셜 로그인 (Apple/Google/Kakao/Naver) | Risk 후보 1 |
| [F01-08](../02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | F01-08. 소셜 계정 연결 해제 | Risk 후보 1 |
| [F01-04](../02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | F01-04. 비밀번호 재설정 | Risk 후보 1 |
| [F01-03](../02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | F01-03. 이메일 인증 | Risk 후보 1 |
| [F01-07](../02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | F01-07. 관심사 태그 관리 | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (7개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F01-01 | 이메일 회원가입 & 로그인 | 이메일/비밀번호로 계정을 만들고 로그인하여 토큰을 발급받는다 | 이메일·비밀번호 입력, 약관 동의, "가입하기"/"로그인" 탭 |
| F01-02 | 소셜 로그인 (Apple/Google/Kakao/Naver) | 외부 OAuth로 즉시 로그인하거나 신규 회원이면 추가 정보를 입력한다 | 소셜 버튼 탭, SDK 인증, (신규 시) 닉네임·약관 입력 |
| F01-03 | 이메일 인증 | 가입 후 발송된 인증 메일의 링크로 이메일 소유를 검증한다 | 인증 메일 발송/재발송 요청, 메일 링크 클릭 (Deep Link) |
| F01-04 | 비밀번호 재설정 | 이메일로 받은 토큰 링크를 통해 새 비밀번호를 설정한다 | 이메일 입력 → 메일 수신 → 링크 클릭 → 새 비밀번호 입력 |
| F01-05 | 토큰 갱신 & 로그아웃 | Access Token 만료 시 Refresh Token으로 자동 재발급하고, 명시적 로그아웃으로 세션을 종료한다 | (자동) 401 응답 시 백그라운드 갱신, 명시적 로그아웃 액션 |
| F01-06 | 온보딩 (웰컴 → 프로필 → 관심사 → 위치) | 첫 로그인 후 4단계 온보딩으로 프로필·태그·위치를 채워 추천 가능한 상태로 만든다 | 캐러셀 스와이프, 프로필 사진/닉네임 입력, 태그 3개 이상 선택, 위치 권한 허용 또는 주소 검색 |
| F01-07 | 관심사 태그 관리 | 온보딩 후에도 선호 태그를 조회·추가·수정·삭제하여 추천 품질을 갱신한다 | 태그 추가/수정/삭제 |
| F01-08 | 소셜 계정 연결 해제 | 연결된 소셜 제공자(Apple/Google/Kakao/Naver)를 개별 해제한다 | 설정 화면에서 특정 소셜 제공자 "연결 해제" 탭 |

> M = 8 기능. F01-01 ~ F01-05는 인증 라이프사이클, F01-06은 첫 사용자 경험, F01-07은 인증 후에도 지속되는 선호 태그 관리, F01-08은 소셜 라이프사이클 종료(연결 해제)이다. 회원 탈퇴(Account 비활성화)는 `AccountController`에 메서드가 정의되어 있지 않으므로 본 단위에 포함하지 않는다 — `AccountController`는 이메일 인증 send/confirm 두 엔드포인트만 노출한다.

---

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 상세

### F01-01 이메일 회원가입 & 로그인

- **사용자 가치**: 이메일·비밀번호만으로 별도 외부 의존 없이 즉시 계정을 만들고 플랫폼에 진입할 수 있다.
- **주요 화면**:
  - `community_app/lib/presentation/auth/screens/signup_screen.dart` (SCR-AU-002)
  - `community_app/lib/presentation/auth/screens/login_screen.dart` (SCR-AU-001)
  - `community_app/lib/presentation/auth/screens/splash_screen.dart` (앱 실행 → 토큰 검사 → 로그인 또는 메인 분기)
- **백엔드 엔드포인트**:
  - `POST /api/v1/auth/signup` (`AuthController#signup`) — 201 Created + `LoginVo`
  - `POST /api/v1/auth/login` (`AuthController#login`) — 200 + `LoginVo` (`accessToken`, `refreshToken`, user)
- **선결 조건/상태**: 비로그인 상태(저장된 토큰 없음 또는 무효).
- **결과 상태 변화**:
  - 가입 성공: 신규 User 레코드 생성, `EMAIL_NOT_VERIFIED` 상태로 SCR-AU-006 이메일 인증 화면 진입
  - 로그인 성공: Access/Refresh 토큰을 Secure Storage에 저장, 메인 피드(SCR-HF-001) 또는 미인증 시 SCR-AU-006으로 분기
  - 실패: 인라인 에러(401 INVALID_CREDENTIALS, 409 EMAIL/NICKNAME_ALREADY_EXISTS, 423 ACCOUNT_LOCKED, 429 TOO_MANY_REQUESTS)

### F01-02 소셜 로그인 (Apple/Google/Kakao/Naver)

- **사용자 가치**: 비밀번호 입력 없이 기존 소셜 계정으로 즉시 로그인하고, 신규 회원은 추가 정보 입력 한 번으로 가입까지 완료한다.
- **주요 화면**:
  - `community_app/lib/presentation/auth/screens/login_screen.dart` (소셜 버튼)
  - `community_app/lib/presentation/auth/widgets/social_login_buttons.dart`
  - `community_app/lib/presentation/auth/widgets/social_login_info_sheet.dart` (신규 회원 추가 정보 바텀시트)
- **백엔드 엔드포인트**:
  - `POST /api/v1/auth/social` (`AuthController#socialLogin`) — 200 + `LoginVo` (응답에 `isNewUser` 플래그)
- **선결 조건/상태**: 비로그인 상태. 소셜 SDK(Apple/Google/Kakao/Naver) 인증 코드 또는 토큰 보유.
- **결과 상태 변화**:
  - 기존 회원: 토큰 저장 → 메인 피드
  - 신규 회원: 토큰 저장 → 닉네임·약관 추가 정보 입력 바텀시트 → (프로필 업데이트 후) 온보딩 진입
  - 실패: 401 SOCIAL_AUTH_FAILED, 409 EMAIL/NICKNAME_ALREADY_EXISTS

### F01-03 이메일 인증

- **사용자 가치**: 이메일 소유를 증명함으로써 계정 신뢰도를 확보하고, 비밀번호 재설정·알림 수신 채널을 활성화한다.
- **주요 화면**:
  - `community_app/lib/presentation/auth/screens/email_verification_screen.dart` (SCR-AU-006)
- **백엔드 엔드포인트**:
  - `POST /api/v1/auth/send-verification-email` (`AuthController#sendVerificationEmail`) — 인증 메일 발송 (인증 사용자)
  - `GET /api/v1/auth/verify-email?token={token}` (`AuthController#verifyEmail`) — 토큰으로 인증 완료
  - `POST /api/v1/users/me/email/verify/send` (`AccountController#sendVerificationEmail`) — 동일 발송(계정 설정 경로)
  - `POST /api/v1/users/me/email/verify/confirm?token=xxx` (`AccountController#confirmEmailVerification`) — 동일 확인
- **선결 조건/상태**: 회원가입 직후 또는 미인증 이메일로 로그인 시도 시(403 EMAIL_NOT_VERIFIED). 인증 메일 발송에는 로그인된 토큰 필요.
- **결과 상태 변화**:
  - 성공: User의 `emailVerified=true` 플래그 설정, 메인 피드 또는 첫 사용자라면 온보딩(SCR-OB-001)으로 진입
  - 실패: 400 TOKEN_EXPIRED → 재발송 버튼 표출, 400 INVALID_TOKEN → 안내 후 로그인 복귀

### F01-04 비밀번호 재설정

- **사용자 가치**: 비밀번호 분실 시 이메일을 통해 계정 통제권을 안전하게 회복한다.
- **주요 화면**:
  - `community_app/lib/presentation/auth/screens/password_reset_screen.dart` (SCR-AU-004 요청)
  - `community_app/lib/presentation/auth/screens/password_reset_confirm_screen.dart` (SCR-AU-005 확인, Deep Link 진입)
- **백엔드 엔드포인트**:
  - `POST /api/v1/auth/password-reset/request` (`AuthController#requestPasswordReset`) — body `{email}`, 보안상 항상 200 (이메일 존재 여부 노출 방지)
  - `POST /api/v1/auth/password-reset/confirm` (`AuthController#confirmPasswordReset`) — `PasswordResetParam` (토큰 + 새 비밀번호)
- **선결 조건/상태**: 비로그인 상태(SCR-AU-001 → "비밀번호 찾기" 진입). 확인 단계는 이메일 링크 Deep Link 진입.
- **결과 상태 변화**:
  - 요청 성공: 메일 발송 안내 화면 표시, 60초 쿨다운 후 재발송 가능
  - 확인 성공: 비밀번호 변경 → 다이얼로그 → SCR-AU-001 로그인 화면
  - 실패: 400 TOKEN_EXPIRED / INVALID_TOKEN, 422 VALIDATION_ERROR, 429 TOO_MANY_REQUESTS

### F01-05 토큰 갱신 & 로그아웃

- **사용자 가치**: 사용자가 의식하지 못하는 사이 세션을 갱신해 끊김 없는 사용 경험을 제공하고, 로그아웃으로 디바이스 세션을 명시적으로 종료한다.
- **주요 화면**:
  - 갱신: 화면 없음 — HTTP Interceptor가 자동 처리 (SCR-AU-007)
  - 로그아웃: 프로필/설정 화면(이 단위 외부)에서 트리거되지만 인증 라이프사이클이므로 본 단위에 포함
- **백엔드 엔드포인트**:
  - `POST /api/v1/auth/refresh` (`AuthController#refreshToken`) — `TokenRefreshParam`, 200 + `LoginVo`
  - `POST /api/v1/auth/logout` (`AuthController#logout`) — `@AuthenticationPrincipal`의 `userId` + `jwtId`로 RefreshToken 무효화, 204
- **선결 조건/상태**:
  - 갱신: 만료된 Access Token + 유효한 Refresh Token 보유
  - 로그아웃: 로그인 상태
- **결과 상태 변화**:
  - 갱신 성공: 새 토큰 저장, 큐잉된 401 요청 모두 새 토큰으로 재시도
  - 갱신 실패: 모든 토큰 삭제 + SCR-AU-001 강제 이동 ("세션이 만료되었습니다" 토스트)
  - 로그아웃: 서버에서 RefreshToken 폐기, 클라이언트 토큰 삭제, SCR-AU-001 진입

### F01-06 온보딩 (웰컴 → 프로필 → 관심사 → 위치)

- **사용자 가치**: 첫 로그인 사용자가 4단계 흐름으로 자기소개·관심사·생활권을 채워 즉시 맞춤 추천을 받을 수 있는 상태가 된다.
- **주요 화면** (모두 `community_app/lib/presentation/auth/screens/`):
  - `onboarding_welcome_screen.dart` (SCR-OB-001 — 4페이지 캐러셀, 로컬 화면)
  - `onboarding_profile_screen.dart` (SCR-OB-002 — 프로필 사진/닉네임/자기소개)
  - `onboarding_interests_screen.dart` (SCR-OB-003 — 카테고리별 태그 그리드, 최소 3개)
  - `onboarding_location_screen.dart` (SCR-OB-004 — 위치 권한 + 지도 또는 주소 검색)
- **백엔드 엔드포인트**:
  - 프로필 사진 업로드: `POST /api/v1/files/presigned-url` → S3 PUT → `POST /api/v1/files/upload/complete` (file 도메인, 본 단위 외부 의존)
  - 프로필 갱신: `PATCH /api/v1/users/me` (사용자 도메인, 본 단위 외부 의존)
  - 관심사 태그 등록: `POST /api/v1/users/me/preference-tags` (`UserPreferenceTagController#addTag`) — 태그 1건씩 등록(루프). UI 스펙은 `tagIds: [...]` 일괄 전송을 가정하나 실제 컨트롤러는 단건 `UserPreferenceTagParam` 추가만 제공 — 클라이언트는 다건을 순차 호출해야 함.
  - 위치 등록: `POST /api/v1/users/me/addresses` (location/account 외부 도메인, 본 단위 외부 의존)
- **선결 조건/상태**: 로그인 + 이메일 인증 완료 + `onboardingCompleted=false` 상태(서버 User 프로필).
- **결과 상태 변화**:
  - 각 단계 완료 또는 건너뛰기 시 다음 단계로 이동, 마지막 위치 단계 완료 시 메인 피드(SCR-HF-001)로 진입
  - 서버 측: `profileSetup`, `tagsSelected`, `locationSet`, `onboardingCompleted` 플래그 갱신
  - 로컬 측: `welcomeShown=true` (기기별 1회)

### F01-07 관심사 태그 관리

- **사용자 가치**: 온보딩 이후에도 사용자의 흥미 변화를 반영해 추천 품질을 지속적으로 조정한다.
- **주요 화면**: 본 단위에는 전용 화면 없음. `community_app/lib/presentation/auth/screens/onboarding_interests_screen.dart`가 신규 등록 진입점이며, 수정/삭제는 프로필/설정 영역(외부 단위)에서 호출. 본 기능은 백엔드 라이프사이클이 인증 도메인(`account/`)에 속하므로 본 단위에 포함.
- **백엔드 엔드포인트** (모두 `UserPreferenceTagController`):
  - `GET /api/v1/users/me/preference-tags` — 내 태그 전체 조회 (List<UserPreferenceTagVo>)
  - `POST /api/v1/users/me/preference-tags` — 태그 추가
  - `PUT /api/v1/users/me/preference-tags/{tagId}` — 태그 수정
  - `DELETE /api/v1/users/me/preference-tags/{tagId}` — 태그 삭제 (204)
- **선결 조건/상태**: 로그인 상태(`@AuthenticationPrincipal UserPrincipal` 필요).
- **결과 상태 변화**: `user_preference_tag` 테이블에 신규/수정/삭제 반영 → 추천/검색 도메인의 입력값 변동.

### F01-08 소셜 계정 연결 해제

- **사용자 가치**: 더 이상 사용하지 않는 소셜 제공자를 계정에서 분리하여 보안 표면을 축소한다.
- **주요 화면**: 본 단위에는 전용 화면 없음. 일반적으로 설정 화면(외부 단위)에서 트리거되지만 인증 라이프사이클이므로 본 단위에 포함.
- **백엔드 엔드포인트**:
  - `DELETE /api/v1/auth/social/{providerType}` (`AuthController#unlinkSocial`) — `providerType` path는 `ProviderType` enum 값(대문자 정규화), 204
- **선결 조건/상태**: 로그인 상태 + 해당 `providerType`으로 연결된 `SocialLogin` 레코드 존재.
- **결과 상태 변화**: 해당 SocialLogin 레코드 삭제 또는 비활성화. 동일 제공자로 다시 로그인 시 신규 회원 플로우 또는 재연결 플로우 진입.

---

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F01-02](../02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | F01-02. 소셜 로그인 (Apple/Google/Kakao/Naver) | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F01-03](../02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | F01-03. 이메일 인증 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F01-04](../02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | F01-04. 비밀번호 재설정 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F01-06](../02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | F01-06. 온보딩 (웰컴 → 프로필 → 관심사 → 위치) | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F01-07](../02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | F01-07. 관심사 태그 관리 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F01-08](../02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | F01-08. 소셜 계정 연결 해제 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
