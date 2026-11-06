# F01-05. 토큰 갱신 & 로그아웃 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

JWT Access Token이 만료(1시간)되어 401을 받으면 클라이언트가 백그라운드에서 Refresh Token으로 새 토큰을 발급받고, 큐에 대기 중인 모든 요청을 새 토큰으로 재시도한다. 로그아웃은 명시적으로 RefreshToken을 폐기하고 Access Token을 Redis 블랙리스트에 등록하여 즉시 무효화한다. 동시 갱신 요청은 Redisson 분산 락으로 직렬화된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **토큰 갱신 (자동)**: 모든 API 호출에서 401 응답 수신 시 — `RefreshInterceptor`(QueuedInterceptor)가 자동 처리 (SCR-AU-007: 화면 없음)
- **로그아웃 (사용자 액션)**: 프로필/설정 화면(외부 단위)에서 "로그아웃" 탭 → `AuthNotifier.logout()`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `AuthController`, `TokenService`. 앱: `refresh_interceptor.dart`, `auth_provider.dart`, `auth_repository.dart`, `app_router.dart`.

<!-- source-references:start -->
서버 창구: `AuthController#refreshToken`, `AuthController#logout`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 로그인 유지 기간: 접근 토큰 1시간, 갱신 토큰 30일이다. 새로 로그인하면 그 계정의 다른 기기 갱신 토큰은 모두 무효가 되어 한 기기만 유지된다.
- 자동 갱신은 요청 하나당 한 번만 시도한다. 로그인·갱신 요청 자체가 401이면 갱신하지 않고 그대로 오류를 보여 준다. 갱신하는 동안 들어온 다른 요청은 기다렸다가 새 토큰으로 다시 보낸다.
- 갱신에 실패하면 저장된 토큰을 지우고 로그인 화면으로 보낸다.
- 로그아웃은 서버 호출이 실패해도 기기의 토큰과 온보딩 진행 기록을 지우고 로그인 화면으로 간다. 로그인 화면에 돌아오면 "로그아웃되었습니다" 안내를 한 번만 보여 준다.

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
