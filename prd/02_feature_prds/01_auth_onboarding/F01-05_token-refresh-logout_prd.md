# F01-05. 토큰 갱신 & 로그아웃 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-05_token-refresh-logout -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-05_token-refresh-logout`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

JWT Access Token이 만료(1시간)되어 401을 받으면 클라이언트가 백그라운드에서 Refresh Token으로 새 토큰을 발급받고, 큐에 대기 중인 모든 요청을 새 토큰으로 재시도한다. 로그아웃은 명시적으로 RefreshToken을 폐기하고 Access Token을 Redis 블랙리스트에 등록하여 즉시 무효화한다. 동시 갱신 요청은 Redisson 분산 락으로 직렬화된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **토큰 갱신 (자동)**: 모든 API 호출에서 401 응답 수신 시 — `RefreshInterceptor`(QueuedInterceptor)가 자동 처리 (SCR-AU-007: 화면 없음)
- **로그아웃 (사용자 액션)**: 프로필/설정 화면(외부 단위)에서 "로그아웃" 탭 → `AuthNotifier.logout()`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-05_token-refresh-logout/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-05_token-refresh-logout/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-05_token-refresh-logout/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-05_token-refresh-logout/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:48` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:54` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 토큰 갱신 (자동)
1. 사용자가 임의 API 호출 (`GET /api/v1/users/me` 등)
2. 401 수신 → `RefreshInterceptor.onError`
3. `_refreshDio.post('/api/v1/auth/refresh', {refreshToken})`
4. 성공 시: `tokenStorage.saveTokens(...)` → 원래 요청 재시도 → 사용자에게는 정상 응답
5. 실패 시: `_handleRefreshFailure` → `AuthNotifier.handleSessionExpired` → 로그인 화면으로 리다이렉트

### 로그아웃
1. 사용자 "로그아웃" 탭 (외부 단위)
2. `ref.read(authNotifierProvider.notifier).logout()`
3. `_repo.logout()` → `_authApi.logout()` → `POST /api/v1/auth/logout`
4. 토큰 storage clear → 온보딩 storage clear → 토스트 플래그 set → state 전이
5. 라우터 redirect로 `/auth/login`
6. 로그인 화면이 토스트 "로그아웃되었습니다" 표시

## 4. 서버 계약

### 개요

JWT Access Token이 만료(1시간)되어 401을 받으면 클라이언트가 백그라운드에서 Refresh Token으로 새 토큰을 발급받고, 큐에 대기 중인 모든 요청을 새 토큰으로 재시도한다. 로그아웃은 명시적으로 RefreshToken을 폐기하고 Access Token을 Redis 블랙리스트에 등록하여 즉시 무효화한다. 동시 갱신 요청은 Redisson 분산 락으로 직렬화된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/auth/refresh | `AuthController#refreshToken` | 불필요 (RefreshToken 검증) | 새 Access/Refresh 토큰 발급 |
| POST | /api/v1/auth/logout | `AuthController#logout` | required | RefreshToken 삭제 + 블랙리스트 등록 (204) |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `RefreshToken`: `id` (Long, PK — JWT의 jti로도 사용됨), `userId`, `refreshToken` (UUID), `expireDatetime`
- **JWT 클레임**:
  - `subject`: 암호화된 userId (`JwtSubjectEncoder` 사용)
  - `jwtId` (jti): RefreshToken의 ID (String 변환)
  - `loginType`: `email` / `social`
  - `role`: `UserRole.role` (Integer)
  - `subjectVersion`: `SUBJECT_VERSION_ENCRYPTED`
  - `expiresAt`: 발급 시각 + 1시간
- **TTL**:
  - Access Token: 1시간 (`TokenService.ACCESS_TOKEN_EXPIRY_HOURS = 1`)
  - Refresh Token: 30일 (`TokenService.REFRESH_TOKEN_EXPIRY_DAYS = 30`)
- **단일 기기 정책**: `issueTokens` 호출 시 항상 `deleteAllByUserId(userId)` 먼저 실행 — 다른 기기의 RefreshToken을 무효화

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 없음 (자체 Auth 도메인)
- 사용 인프라:
  - Redis (Redisson 분산 락 + 블랙리스트)
  - MySQL (`refresh_token`, `users`)
- 환경 변수: `jwt.secret` (HMAC512 시크릿)
- 호출자: 모든 도메인의 인증 필요 API 호출 시 — 401 응답을 받은 클라이언트 인터셉터가 자동 호출

## 5. 프론트 계약

### 진입 경로

- **토큰 갱신 (자동)**: 모든 API 호출에서 401 응답 수신 시 — `RefreshInterceptor`(QueuedInterceptor)가 자동 처리 (SCR-AU-007: 화면 없음)
- **로그아웃 (사용자 액션)**: 프로필/설정 화면(외부 단위)에서 "로그아웃" 탭 → `AuthNotifier.logout()`

### 사용 라우트 & 화면 파일

| 라우트 / 컴포넌트 | 파일 | 역할 |
|---|---|---|
| (백그라운드) | `lib/core/network/refresh_interceptor.dart` | Dio QueuedInterceptor — 401 자동 갱신 |
| (Provider) | `lib/domain/providers/auth_provider.dart` | `AuthNotifier.logout()`, `handleSessionExpired()` |
| (Repository) | `lib/data/repositories/auth_repository.dart` | `logout()`, `verifyEmail` 등 위임 |

### 화면별 구성 요소 & 액션

### 토큰 갱신 (백그라운드)
- **사용자가 보는 것**: 없음 — 사용자 입장에서는 일반 API 호출이 잠시 지연되었다가 정상 응답으로 보임
- **자동 처리** (`RefreshInterceptor.onError`):
  1. 401 응답 수신 시
  2. `requestOptions.extra['refreshAttempted']`가 true면 무한 루프 방지 → `_handleRefreshFailure()`
  3. `path`가 `/auth/refresh` 또는 `/auth/login`이면 그대로 통과 (이미 갱신/로그인 시도 중)
  4. `tokenStorage.refreshToken` 조회 — null이면 `_handleRefreshFailure()`
  5. **별도 Dio 인스턴스** `_refreshDio`로 `POST /api/v1/auth/refresh` 호출 (인터셉터 체인을 안 타게 분리)
  6. 새 `accessToken`/`refreshToken` 저장 → 원래 요청에 새 Authorization 헤더 + `refreshAttempted=true` 마킹 → `_dio.fetch(opts)` 재시도
  7. 성공 시 `handler.resolve(retryResponse)` — 호출자는 원래 응답을 받음
- **동시 요청 처리**: `QueuedInterceptor`의 큐잉 동작으로 갱신 중인 동안 다른 401 요청은 자동 대기 → 갱신 완료 후 순차 재시도
- **갱신 실패 시** `_handleRefreshFailure()`:
  1. `onRefreshFailed` 콜백 호출 (DI에서 `authNotifierProvider.notifier.handleSessionExpired()` 매핑됨)
  2. `tokenStorage.clearTokens()` (timeout 2초)
  3. `AuthNotifier.handleSessionExpired()` → `state = AuthState.unauthenticated()` → 라우터가 자동으로 `/auth/login`로 redirect

### 로그아웃 (사용자 액션)
- **호출 위치**: 본 단위 외부 (프로필/설정 화면)
- **호출 흐름**: `ref.read(authNotifierProvider.notifier).logout()`
- **`AuthNotifier.logout()` 동작**:
  1. `_repo.logout()` — `_authApi.logout()` → `POST /api/v1/auth/logout` (Bearer)
  2. 응답 무시 (예외 catch 후 무시) — 서버 호출 실패해도 클라이언트 토큰은 삭제
  3. `_tokenStorage.clearTokens()` (try-finally로 보장)
  4. `_onboarding.clear()` — 온보딩 storage 초기화
  5. `logoutToastFlagProvider.set()` — 다음 로그인 화면 진입 시 "로그아웃되었습니다" 토스트 표시 플래그
  6. `state = AuthState.unauthenticated()` → 라우터 redirect로 `/auth/login`

### 로그인 화면의 로그아웃 토스트 처리
- `LoginScreen.initState`에서 `SchedulerBinding.addPostFrameCallback`로 `logoutToastFlagProvider.notifier.consume()` 호출
- 플래그가 true면 `AppToast.show("로그아웃되었습니다")` 후 자동으로 false로 reset (consume-once 패턴)

### API 호출 순서 (Provider/Repository 관점)

### 토큰 갱신 (자동)
1. 사용자가 임의 API 호출 (`GET /api/v1/users/me` 등)
2. 401 수신 → `RefreshInterceptor.onError`
3. `_refreshDio.post('/api/v1/auth/refresh', {refreshToken})`
4. 성공 시: `tokenStorage.saveTokens(...)` → 원래 요청 재시도 → 사용자에게는 정상 응답
5. 실패 시: `_handleRefreshFailure` → `AuthNotifier.handleSessionExpired` → 로그인 화면으로 리다이렉트

### 로그아웃
1. 사용자 "로그아웃" 탭 (외부 단위)
2. `ref.read(authNotifierProvider.notifier).logout()`
3. `_repo.logout()` → `_authApi.logout()` → `POST /api/v1/auth/logout`
4. 토큰 storage clear → 온보딩 storage clear → 토스트 플래그 set → state 전이
5. 라우터 redirect로 `/auth/login`
6. 로그인 화면이 토스트 "로그아웃되었습니다" 표시

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- `RefreshInterceptor`가 별도 `_refreshDio` 인스턴스를 사용하여 인터셉터 무한 루프 방지
- `requestOptions.extra['refreshAttempted']` 플래그로 1회 재시도 제한
- `/auth/refresh`, `/auth/login` path는 인터셉터 우회 (이미 인증 흐름 내부)
- `QueuedInterceptor` 사용으로 동시 401 큐잉이 자동 처리됨 (Dio 라이브러리 의존)
- `tokenStorage.clearTokens()`에 2초 timeout (Web Secure Storage 지연 대비)
- 로그아웃 후 토스트 메시지 "로그아웃되었습니다" — `LogoutToastFlagProvider`로 한 번만 표시
- 로그아웃 API 실패는 무시 — UX상 사용자가 이미 로그아웃 의도를 가졌으므로 서버 실패와 무관하게 클라이언트 정리 진행
- AuthState 변화에 따른 라우터 redirect 정책 (`/auth/login`로 강제 이동) — `core/router/app_router.dart` 외부 단위
- DEV 바이패스 로그인은 `tokenStorage`에 가짜 토큰 저장 후 `state = AuthState.authenticated(fakeUser)` — 서버 호출 없음 (개발 편의)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 백그라운드에서 토큰 자동 갱신 후 정상 응답 (Happy Path) | 로그인 됨, Access Token 만료, Refresh Token 유효 | 사용자 입장에서는 짧은 지연 후 정상 동작, 토큰 갱신됨 |
| S2 | Refresh Token도 만료 (30일 경과) | 30일 이상 앱 미사용 | 모든 토큰 삭제, 로그인 화면 |
| S3 | 동시 다발적 401 → 갱신은 단 한 번 | 홈 피드 진입 시 여러 위젯이 병렬로 API 호출 | 토큰 1회 갱신, 5개 모두 정상 응답 — 동시성 제어 성공 |
| S4 | 갱신 중 사용자가 BAN 되었을 때 | 시나리오 본문 참조 | 강제 로그아웃 |
| S5 | 명시적 로그아웃 (Happy Path) | 로그인 됨, 프로필 화면 | 토큰 폐기, 다른 기기에서도 같은 사용자라면 다음 요청 401 |
| S6 | 로그아웃 API 실패해도 클라이언트는 정상 처리 | 시나리오 본문 참조 | 클라이언트는 로그아웃됨, 서버는 토큰 유효 (다음 호출 시점에 401로 자연 만료 또는 expire까지 유지) |
| S7 | /auth/login 호출이 401일 때 (잘못된 비밀번호) — 갱신 시도 안 함 | 시나리오 본문 참조 | 갱신 미시도, 사용자가 직접 재시도 |
| S8 | 만료 직전 새 토큰 발급으로 다른 기기 자동 로그아웃 (단일 기기 정책) | 폰 + 태블릿 동시 사용자 | 단일 기기 로그인 정책 (A-H-01)에 따라 두 기기를 동시에 유지할 수 없음 |
| S9 | 분산 락 획득 실패 (멀티 인스턴스 동시 갱신) | 앱 콜드 스타트 직후 (토큰 저장소 비어있음) | 로그인 화면 단일 노출, splash는 더 이상 화면에 없음 |

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

- **AC-01. 백그라운드에서 토큰 자동 갱신 후 정상 응답 (Happy Path)**: Given 로그인 됨, Access Token 만료, Refresh Token 유효 When 사용자가 해당 흐름을 실행하면 Then 사용자 입장에서는 짧은 지연 후 정상 동작, 토큰 갱신됨
- **AC-02. Refresh Token도 만료 (30일 경과)**: Given 30일 이상 앱 미사용 When 사용자가 해당 흐름을 실행하면 Then 모든 토큰 삭제, 로그인 화면
- **AC-03. 동시 다발적 401 → 갱신은 단 한 번**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 토큰 1회 갱신, 5개 모두 정상 응답 — 동시성 제어 성공
- **AC-04. 갱신 중 사용자가 BAN 되었을 때**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 강제 로그아웃
- **AC-05. 명시적 로그아웃 (Happy Path)**: Given 로그인 됨, 프로필 화면 When 사용자가 해당 흐름을 실행하면 Then 토큰 폐기, 다른 기기에서도 같은 사용자라면 다음 요청 401
- **AC-06. 로그아웃 API 실패해도 클라이언트는 정상 처리**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 클라이언트는 로그아웃됨, 서버는 토큰 유효 (다음 호출 시점에 401로 자연 만료 또는 expire까지 유지)
- **AC-07. /auth/login 호출이 401일 때 (잘못된 비밀번호) — 갱신 시도 안 함**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 갱신 미시도, 사용자가 직접 재시도
- **AC-08. 만료 직전 새 토큰 발급으로 다른 기기 자동 로그아웃 (단일 기기 정책)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 단일 기기 로그인 정책 (A-H-01)에 따라 두 기기를 동시에 유지할 수 없음
- **AC-09. 분산 락 획득 실패 (멀티 인스턴스 동시 갱신)**: Given 앱 콜드 스타트 직후 (토큰 저장소 비어있음) When 사용자가 해당 흐름을 실행하면 Then 로그인 화면 단일 노출, splash는 더 이상 화면에 없음

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
