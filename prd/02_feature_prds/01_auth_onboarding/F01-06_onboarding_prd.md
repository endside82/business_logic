# F01-06. 온보딩 (웰컴 → 프로필 → 관심사 → 위치) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

첫 로그인 사용자가 4단계 온보딩(웰컴 캐러셀 → 프로필 사진/닉네임/자기소개 → 관심사 태그 → 위치)을 거쳐 추천 가능한 상태로 메인 피드에 진입한다. 본 단위(account 도메인)는 관심사 태그 등록(F01-07) API만 직접 제공하며, 프로필 갱신·파일 업로드·주소 등록은 모두 외부 단위(file/account profile/location 등)에 위임한다. 웰컴 단계는 로컬 화면이라 서버 호출 없음.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 신규 회원의 첫 로그인 또는 소셜 가입 직후 — `AuthNotifier.checkAuthStatus()` 또는 `_fetchAndSetUser`가 `AuthState.onboarding(user)`로 전이 → 라우터 redirect로 `/onboarding/welcome`
- 라우터의 `OnboardingRoute` 캐시로 다음 incomplete step 재진입 가능 (앱 재시작 시 중간부터)

## 2. 코드 위치

계약의 정본은 코드다. 앱: `onboarding_welcome_screen.dart`, `onboarding_profile_screen.dart`, `onboarding_interests_screen.dart`, `onboarding_location_screen.dart`.

## 3. 전체 동작 흐름

### 시퀀스 전체
1. 로그인 후 `AuthState.onboarding(user)` 전이 → 라우터 redirect → `/onboarding/welcome`
2. **Welcome**: 로컬 markWelcomeShown만 호출
3. **Profile**:
   - 이미지 선택 시 `fileRepo.generatePresignedUrl` → S3 PUT
   - 다음 시 `authRepo.updateProfile` ▶ `PATCH /api/v1/users/me`
4. **Interests**:
   - 다음 시 `authRepo.addPreferenceTags(['러닝', '등산', '요가'])`
   - 내부적으로 각 태그마다 `POST /api/v1/users/me/preference-tags` 순차 호출
5. **Location**:
   - 다음 시 `authRepo.addAddress` ▶ `POST /api/v1/users/me/addresses`
   - 성공 후 `AuthNotifier.completeOnboarding()` → 홈 이동

### 중간 종료 시 재개
- `OnboardingRoute` 프로바이더가 다음 미완료 단계 라우트를 캐시 (`onboardingStorage.nextOnboardingRoute`)
- 앱 재시작 시 `AuthNotifier.checkAuthStatus()`가 `state = AuthState.onboarding(user)` 설정 → `OnboardingRoute.refresh()`로 캐시 갱신 → 라우터가 `/onboarding/profile`(또는 그 다음)로 이동

## 4. 제품 규칙

- 4단계(웰컴, 프로필, 관심사, 위치)는 모두 건너뛸 수 있고 서버가 강제하지 않는다. 모두 건너뛰어도 온보딩은 완료로 처리되어 빈 프로필로 홈에 들어간다.
- 진행 상태는 서버가 아니라 기기에 저장한다. 중간에 앱을 닫으면 다음 미완료 단계부터 다시 시작한다.
- 프로필 단계는 뒤로 가기를 막는다. 닉네임은 16자, 자기소개는 200자까지이고 사진은 512px 이하로 줄여 올린다. 사진 업로드가 실패해도 다음 단계로 갈 수 있다.
- 관심사는 3개 이상 골라야 "다음"이 켜진다(앱 규칙, 서버 검증 없음). 선택지는 서버 카탈로그에서 받는다.
- 위치는 현재 위치 감지 또는 주소 검색으로 정하고, 위치 권한을 거부해도 주소 검색으로 진행할 수 있다. 정한 주소는 기본 주소로 저장된다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 신규 가입자가 4단계 모두 완료 (Happy Path) | 소셜 가입 직후, `AuthState.onboarding(user)` 진입 | 사용자 프로필/태그/주소 모두 설정, 메인 피드 진입 |
| S2 | 사용자가 모든 단계를 건너뛰기 | `/onboarding/welcome` | 사용자 정보 비어있는 상태 (서버에 닉네임은 가입 시 입력값만 존재), 추천 품질 저하, 메인 피드 진입 |
| S3 | 프로필 단계에서 사진 업로드 실패 | 시나리오 본문 참조 | 프로필 사진 미업로드 상태로 다음 단계 진행 |
| S4 | 관심사 태그 등록 중간 실패 (3개 중 2개째 실패) | 시나리오 본문 참조 | 부분 저장된 상태, 재시도 시 중복 에러 가능성 — 클라이언트 측 idempotent 처리 필요 |
| S5 | 위치 권한 거부 후 주소 직접 검색 | GPS 권한을 주기 싫은 사용자 | 주소 미설정으로 메인 진입 가능 |
| S6 | 앱 재시작 시 중간부터 재개 | `markProfileSetup` 완료, 앱 종료 | 중간 단계부터 정상 재개 |
| S7 | 위치 등록 실패 (서버 오류) | 시나리오 본문 참조 | 위치 미저장, 사용자가 재시도 또는 건너뛰기 |
| S8 | 닉네임 중복 (프로필 갱신 단계) | 가입 시 자동 생성된 닉네임을 변경하려는 소셜 가입자 | 변경 실패, 사용자가 다른 닉네임으로 재시도 |
| S9 | 태그 21개 시도 (서버 한도 초과) | 비로그인, 로그인 화면 도달 직후. 매번 고유한 nonce 기반 신규 이메일 사용 (`e2e_onboarding_<nonce>@community.local`) | 신규 가입 + 4단계 모두 건너뛴 상태로 메인 셸 진입 (S2 "모든 단계 건너뛰기" 시나리오의 E2E 버전 — 가입부터 홈까지 단일 세션 검증) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 관심 태그 개수 | 「다음」 단추는 태그를 3개 이상 골라야 켜진다. 「건너뛰기」 로 고르지 않고 넘어갈 수 있다. 서버는 최소 개수를 보지 않고 회원당 20개까지 받는다 | 없음 |

## 9. 수용 기준

- **AC-01. 신규 가입자가 4단계 모두 완료 (Happy Path)**: Given 소셜 가입 직후, `AuthState.onboarding(user)` 진입 When 사용자가 해당 흐름을 실행하면 Then 사용자 프로필/태그/주소 모두 설정, 메인 피드 진입
- **AC-02. 사용자가 모든 단계를 건너뛰기**: Given `/onboarding/welcome` When 사용자가 해당 흐름을 실행하면 Then 사용자 정보 비어있는 상태 (서버에 닉네임은 가입 시 입력값만 존재), 추천 품질 저하, 메인 피드 진입
- **AC-03. 프로필 단계에서 사진 업로드 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 프로필 사진 미업로드 상태로 다음 단계 진행
- **AC-04. 관심사 태그 등록 중간 실패 (3개 중 2개째 실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 부분 저장된 상태, 재시도 시 중복 에러 가능성 — 클라이언트 측 idempotent 처리 필요
- **AC-05. 위치 권한 거부 후 주소 직접 검색**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 주소 미설정으로 메인 진입 가능
- **AC-06. 앱 재시작 시 중간부터 재개**: Given `markProfileSetup` 완료, 앱 종료 When 사용자가 해당 흐름을 실행하면 Then 중간 단계부터 정상 재개
- **AC-07. 위치 등록 실패 (서버 오류)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 위치 미저장, 사용자가 재시도 또는 건너뛰기
- **AC-08. 닉네임 중복 (프로필 갱신 단계)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 실패, 사용자가 다른 닉네임으로 재시도
- **AC-09. 태그 21개 시도 (서버 한도 초과)**: Given 비로그인, 로그인 화면 도달 직후. 매번 고유한 nonce 기반 신규 이메일 사용 (`e2e_onboarding_<nonce>@community.local`) When 사용자가 해당 흐름을 실행하면 Then 신규 가입 + 4단계 모두 건너뛴 상태로 메인 셸 진입 (S2 "모든 단계 건너뛰기" 시나리오의 E2E 버전 — 가입부터 홈까지 단일 세션 검증)
