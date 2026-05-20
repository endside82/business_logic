# F01-04. 비밀번호 재설정 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-04_password-reset -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-04_password-reset`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

비밀번호를 분실한 사용자가 이메일로 발송된 30분 만료 토큰을 통해 새 비밀번호를 설정한다. 비로그인 상태에서 호출하며, 보안상 "이메일 존재 여부"를 절대 노출하지 않기 위해 미가입 이메일에도 200 OK를 반환한다. 토큰은 Redis에 TTL 30분으로 저장되어 재사용 시 자동 폐기된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 로그인 화면(SCR-AU-001) "비밀번호 찾기" 텍스트 링크 → `context.push('/auth/password-reset')`
- 메일 링크(Deep Link)로 앱 진입 → `/auth/password-reset/confirm?token=...&email=...` (확인 화면)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-04_password-reset/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-04_password-reset/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-04_password-reset/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-04_password-reset/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:75` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:82` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 요청 (모드 A → B)
1. 사용자 이메일 입력 + "재설정 링크 발송" 탭
2. `ref.read(authRepositoryProvider).requestPasswordReset(email)`
3. `_authApi.requestPasswordReset(PasswordResetRequestParam(email))` → `POST /api/v1/auth/password-reset/request`
4. 항상 200 응답 (보안: 미가입 이메일도 동일) → `_emailSent = true`
5. 성공 화면 표시

### 확인 (Deep Link → 변경)
1. 사용자가 메일 링크 탭 → `community://...?token=xxx&email=yyy`
2. `DeepLinkService` → `GoRouter` → `/auth/password-reset/confirm` (token, email query)
3. 사용자 새 비밀번호 입력 + "비밀번호 변경" 탭
4. `authRepository.confirmPasswordReset(email, token, newPassword)`
5. `_authApi.confirmPasswordReset(PasswordResetConfirmRequest)` → `POST /api/v1/auth/password-reset/confirm`
6. 성공 → 변경 완료 화면 → "로그인으로 이동" 탭 → `/auth/login`

## 4. 서버 계약

### 개요

비밀번호를 분실한 사용자가 이메일로 발송된 30분 만료 토큰을 통해 새 비밀번호를 설정한다. 비로그인 상태에서 호출하며, 보안상 "이메일 존재 여부"를 절대 노출하지 않기 위해 미가입 이메일에도 200 OK를 반환한다. 토큰은 Redis에 TTL 30분으로 저장되어 재사용 시 자동 폐기된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/auth/password-reset/request | `AuthController#requestPasswordReset` | 불필요 | 재설정 메일 발송 (토큰 30분) |
| POST | /api/v1/auth/password-reset/confirm | `AuthController#confirmPasswordReset` | 불필요 | 토큰 + 새 비밀번호로 변경 |

### 도메인 모델 / Enum (이 기능 관련)

- **Param** `PasswordResetParam`: `email`, `token`, `newPassword`
- **Redis Key**: `password_reset:{uuid}` → `userId` (String), TTL 30분 (`PasswordResetService.TOKEN_EXPIRY_MINUTES = 30`)
- **사용 RedisTemplate**: `@Qualifier("authRedisTemplate") RedisTemplate<String, Object>` (인증 전용 Redis 인스턴스)

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - `notification.service.EmailService` (SMTP)
- 외부 시스템:
  - SMTP (Spring Mail)
  - Redis (토큰 저장)
- 환경 변수: `app.base-url`

## 5. 프론트 계약

### 진입 경로

- 로그인 화면(SCR-AU-001) "비밀번호 찾기" 텍스트 링크 → `context.push('/auth/password-reset')`
- 메일 링크(Deep Link)로 앱 진입 → `/auth/password-reset/confirm?token=...&email=...` (확인 화면)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/auth/password-reset` | `lib/presentation/auth/screens/password_reset_screen.dart` | SCR-AU-004 요청 |
| `/auth/password-reset/confirm` | `lib/presentation/auth/screens/password_reset_confirm_screen.dart` | SCR-AU-005 확인 (Deep Link 진입) |

생성자 파라미터 (확인): `token: String` (required), `email: String` (required)

### 화면별 구성 요소 & 액션

### 비밀번호 재설정 요청 (`password_reset_screen.dart`)
2가지 모드: 폼 입력 / 발송 성공 안내

#### 모드 A — 폼 입력
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '비밀번호 찾기')` 뒤로 버튼 포함
  - 80×80 원형 (`AppColors.secondary100`) + `lock_outline_rounded` 아이콘 (36px, primary500)
  - 안내 본문 "가입 시 사용한 이메일을 입력하면\n비밀번호 재설정 링크를 보내드립니다." (body2, textSecondary)
  - 이메일 `AppTextInput(label: '이메일', placeholder: 'email@example.com')`
  - "재설정 링크 발송" 기본 버튼 (`ButtonVariant.primary`, `lg`, fullWidth)
  - "로그인으로 돌아가기" 텍스트 링크
- **사용자가 할 수 있는 액션**:
  - 이메일 입력 → 정규식 검증
  - "재설정 링크 발송" 탭 → `authRepository.requestPasswordReset(email)` ▶ `POST /api/v1/auth/password-reset/request`
  - 성공 시 `_emailSent = true` → 모드 B로 전환

#### 모드 B — 발송 성공
- **사용자가 보는 것**:
  - `mark_email_read_outlined` (64px)
  - "이메일을 확인해주세요" 헤딩
  - "{email}로\n비밀번호 재설정 링크를 보냈습니다."
  - "로그인으로 돌아가기" outline 버튼 (`Navigator.pop`)

### 비밀번호 재설정 확인 (`password_reset_confirm_screen.dart`)
2가지 모드: 폼 입력 / 변경 성공

#### 모드 A — 폼 입력
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '비밀번호 재설정')`
  - 안내 텍스트 "새로운 비밀번호를 입력해주세요.\n영문, 숫자, 특수문자를 포함한 8~20자"
  - 새 비밀번호 입력 (`AppTextInput`, obscureText 토글)
  - 비밀번호 강도 인디케이터 (3-bar, F01-01 회원가입과 동일)
  - 새 비밀번호 확인 입력
  - 일치 시 success500 색상 "비밀번호가 일치합니다" 캡션
  - "비밀번호 변경" 기본 버튼 (`ButtonVariant.primary`, fullWidth)
- **사용자가 할 수 있는 액션**:
  - 비밀번호 입력 → 8자/영문+숫자 검증
  - 비밀번호 확인 → 실시간 일치 검증
  - "비밀번호 변경" 탭 → `authRepository.confirmPasswordReset(email, token, newPassword)` ▶ `POST /api/v1/auth/password-reset/confirm`
  - 성공 시 `_success = true` → 모드 B로 전환

#### 모드 B — 변경 성공
- **사용자가 보는 것**:
  - `check_circle_outline` (64px, success500)
  - "비밀번호가 변경되었습니다" 헤딩
  - "새 비밀번호로 로그인해주세요." 본문
  - "로그인으로 이동" 기본 버튼 → `context.go('/auth/login')`

### API 호출 순서 (Provider/Repository 관점)

### 요청 (모드 A → B)
1. 사용자 이메일 입력 + "재설정 링크 발송" 탭
2. `ref.read(authRepositoryProvider).requestPasswordReset(email)`
3. `_authApi.requestPasswordReset(PasswordResetRequestParam(email))` → `POST /api/v1/auth/password-reset/request`
4. 항상 200 응답 (보안: 미가입 이메일도 동일) → `_emailSent = true`
5. 성공 화면 표시

### 확인 (Deep Link → 변경)
1. 사용자가 메일 링크 탭 → `community://...?token=xxx&email=yyy`
2. `DeepLinkService` → `GoRouter` → `/auth/password-reset/confirm` (token, email query)
3. 사용자 새 비밀번호 입력 + "비밀번호 변경" 탭
4. `authRepository.confirmPasswordReset(email, token, newPassword)`
5. `_authApi.confirmPasswordReset(PasswordResetConfirmRequest)` → `POST /api/v1/auth/password-reset/confirm`
6. 성공 → 변경 완료 화면 → "로그인으로 이동" 탭 → `/auth/login`

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 클라이언트 측 비밀번호 검증: 8자+ 영문+숫자 (서버는 추가로 대문자/소문자/특수문자도 강제)
- 비밀번호 강도 인디케이터 3단계 색상
- "비밀번호가 일치합니다" 실시간 캡션 (success500)
- 80×80 / 64px 아이콘 사이즈와 secondary100 원형 배경
- "재설정 링크 발송" 버튼은 발송 성공 후에도 별도 토스트 미표시 — 화면 자체가 성공 안내로 전환
- 모드 B 화면에서 재발송 정책 미구현 (60초 쿨다운은 회원가입 인증 메일에만 존재)
- Deep Link URL 스킴은 `community://...?token=...&email=...` 형태 (`DeepLinkService` 외부 단위에서 정의)
- 본 단위 화면에서 토큰/이메일 query parsing은 `GoRouter`의 path/query parameter로 자동 — `PasswordResetConfirmScreen({required this.token, required this.email})`
- 변경 성공 후 자동 로그인을 시키지 않음 (사용자가 명시적으로 다시 로그인하도록 유도)
- 422 VALIDATION_ERROR 매핑은 `showApiErrorToast` 기본 매핑에 위임

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 정상 사용자가 비밀번호 분실 후 재설정 (Happy Path) | 로그인 화면, 비밀번호 기억 안 남 | 비밀번호 변경, 토큰 폐기 |
| S2 | 미가입 이메일로 재설정 요청 (보안 정책 검증) | 가입한 적 없는 사용자 또는 오타 | 사용자는 메일이 안 와도 화면상 동일한 안내 — 이메일 존재 여부 노출 방지(A-H-03 보안) |
| S3 | 만료된 토큰 (30분 경과) | 시나리오 본문 참조 | 변경 실패, 재요청 필요 |
| S4 | 토큰 탈취 시도 (다른 이메일로 변경) | 공격자가 사용자 A의 토큰을 가로채 본인 이메일로 변경 시도 | 공격 차단 |
| S5 | 같은 토큰 두 번 사용 (재사용 차단) | 시나리오 본문 참조 | 재사용 차단 |
| S6 | 약한 비밀번호로 변경 시도 (서버 검증) | 시나리오 본문 참조 | 변경 실패, 사용자가 더 강한 비밀번호로 재시도 |
| S7 | 메일 발송 도중 SMTP 실패 | 시나리오 본문 참조 | 메일 미수신, 재시도로 복구 가능 |
| S8 | 비밀번호 변경 후에도 다른 기기 세션 유지 | 비로그인, 로그인 화면 도달 직후 | S1 "재설정 링크 발송" 직후의 모드 B 안내 surface (S2 "미가입 이메일도 동일 surface 노출" 보안 정책의 사용자 측 검증) |

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
| 후보 | frontend.md:88 | - 모드 B 화면에서 재발송 정책 미구현 (60초 쿨다운은 회원가입 인증 메일에만 존재) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 정상 사용자가 비밀번호 분실 후 재설정 (Happy Path)**: Given 로그인 화면, 비밀번호 기억 안 남 When 사용자가 해당 흐름을 실행하면 Then 비밀번호 변경, 토큰 폐기
- **AC-02. 미가입 이메일로 재설정 요청 (보안 정책 검증)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자는 메일이 안 와도 화면상 동일한 안내 — 이메일 존재 여부 노출 방지(A-H-03 보안)
- **AC-03. 만료된 토큰 (30분 경과)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 실패, 재요청 필요
- **AC-04. 토큰 탈취 시도 (다른 이메일로 변경)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 공격 차단
- **AC-05. 같은 토큰 두 번 사용 (재사용 차단)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 재사용 차단
- **AC-06. 약한 비밀번호로 변경 시도 (서버 검증)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 실패, 사용자가 더 강한 비밀번호로 재시도
- **AC-07. 메일 발송 도중 SMTP 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 메일 미수신, 재시도로 복구 가능
- **AC-08. 비밀번호 변경 후에도 다른 기기 세션 유지**: Given 비로그인, 로그인 화면 도달 직후 When 사용자가 해당 흐름을 실행하면 Then S1 "재설정 링크 발송" 직후의 모드 B 안내 surface (S2 "미가입 이메일도 동일 surface 노출" 보안 정책의 사용자 측 검증)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
