# F01-06. 온보딩 (웰컴 → 프로필 → 관심사 → 위치) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-06_onboarding -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-06_onboarding`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

첫 로그인 사용자가 4단계 온보딩(웰컴 캐러셀 → 프로필 사진/닉네임/자기소개 → 관심사 태그 → 위치)을 거쳐 추천 가능한 상태로 메인 피드에 진입한다. 본 단위(account 도메인)는 관심사 태그 등록(F01-07) API만 직접 제공하며, 프로필 갱신·파일 업로드·주소 등록은 모두 외부 단위(file/account profile/location 등)에 위임한다. 웰컴 단계는 로컬 화면이라 서버 호출 없음.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 신규 회원의 첫 로그인 또는 소셜 가입 직후 — `AuthNotifier.checkAuthStatus()` 또는 `_fetchAndSetUser`가 `AuthState.onboarding(user)`로 전이 → 라우터 redirect로 `/onboarding/welcome`
- 라우터의 `OnboardingRoute` 캐시로 다음 incomplete step 재진입 가능 (앱 재시작 시 중간부터)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-06_onboarding/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-06_onboarding/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-06_onboarding/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-06_onboarding/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

첫 로그인 사용자가 4단계 온보딩(웰컴 캐러셀 → 프로필 사진/닉네임/자기소개 → 관심사 태그 → 위치)을 거쳐 추천 가능한 상태로 메인 피드에 진입한다. 본 단위(account 도메인)는 관심사 태그 등록(F01-07) API만 직접 제공하며, 프로필 갱신·파일 업로드·주소 등록은 모두 외부 단위(file/account profile/location 등)에 위임한다. 웰컴 단계는 로컬 화면이라 서버 호출 없음.

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **file 도메인** (S3 presigned URL) — 프로필 사진 업로드
  - **account profile** (`PATCH /api/v1/users/me`) — Unit 13 영역
  - **location/account** (`POST /api/v1/users/me/addresses`) — Unit 14 영역
- 본 단위 직접 호출: F01-07의 `POST /api/v1/users/me/preference-tags` (단건 루프)
- 외부 시스템: AWS S3 (프로필 이미지)

## 5. 프론트 계약

### 진입 경로

- 신규 회원의 첫 로그인 또는 소셜 가입 직후 — `AuthNotifier.checkAuthStatus()` 또는 `_fetchAndSetUser`가 `AuthState.onboarding(user)`로 전이 → 라우터 redirect로 `/onboarding/welcome`
- 라우터의 `OnboardingRoute` 캐시로 다음 incomplete step 재진입 가능 (앱 재시작 시 중간부터)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/onboarding/welcome` | `lib/presentation/auth/screens/onboarding_welcome_screen.dart` | SCR-OB-001 4페이지 캐러셀 |
| `/onboarding/profile` | `lib/presentation/auth/screens/onboarding_profile_screen.dart` | SCR-OB-002 사진/닉네임/자기소개 |
| `/onboarding/interests` | `lib/presentation/auth/screens/onboarding_interests_screen.dart` | SCR-OB-003 관심사 태그 |
| `/onboarding/location` | `lib/presentation/auth/screens/onboarding_location_screen.dart` | SCR-OB-004 위치 |

### 화면별 구성 요소 & 액션

### Step 1 — 웰컴 캐러셀 (`onboarding_welcome_screen.dart`)
- **사용자가 보는 것**:
  - `PageView.builder` 4페이지, 각 페이지: 240×240 원형 (#E8F0EB 배경) + 80px 아이콘 + heading2 제목 + body1 설명
  - 4페이지 콘텐츠 (코드 하드코딩):
    1. people_alt — "새로운 만남을 시작하세요"
    2. event_available — "다양한 이벤트를 탐색하고 참여하세요"
    3. groups — "클럽을 만들어 커뮤니티를 키워보세요"
    4. location_on — "내 주변의 모임을 찾아보세요"
  - 페이지 인디케이터 (활성 24×8px, 비활성 8×8px, primary500/gray300)
  - 하단 버튼: 마지막 페이지면 "시작하기", 그 외 "다음" (`ButtonVariant.primary`, fullWidth)
  - "건너뛰기" 텍스트 링크 (`AppSemanticColors.textTertiary`)
- **사용자가 할 수 있는 액션**:
  - 좌우 스와이프 또는 "다음" 탭 → 페이지 전환
  - 마지막 페이지 "시작하기" 탭 → `_markWelcomeAndProceed()` → `OnboardingStorage.markWelcomeShown()` → `context.go('/onboarding/profile')`
  - "건너뛰기" 탭 → 동일 처리

### Step 2 — 프로필 (`onboarding_profile_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '프로필 설정', showBackButton: false)` — 뒤로 차단
  - 3-bar 단계 인디케이터 (1번째 활성, primary500)
  - 텍스트 "1/3 프로필 사진과 닉네임을 설정해주세요"
  - 100×100 원형 아바타 (#F0EFEC 배경) — 카메라 아이콘 또는 선택한 이미지
    - 우하단 28×28 primary500 원형 + 카메라 아이콘 (편집 배지)
    - 업로드 중에는 검정 반투명 오버레이 + spinner
  - 닉네임 `AppTextInput` (maxLength=16, 글자수 카운터)
  - 자기소개 `AppTextArea` (maxLength=200, minLines=3, maxLines=5, 카운터)
  - 하단 "다음" 버튼 (fullWidth)
  - "건너뛰기" 링크
- **사용자가 할 수 있는 액션**:
  - 아바타 탭 → `ImagePicker.pickImage(source: gallery, max 512px)` → 선택 시 `_uploadProfileImage(file)`
    - `fileRepository.generatePresignedUrl(...)` → S3 PUT → fileKey 획득 → `_uploadedImageUrl` 갱신
  - 닉네임 입력 (서버에 검증은 다음 단계)
  - 자기소개 입력 (선택)
  - "다음" 탭 → `authRepository.updateProfile(UserModParam(nickname, bio, profileImageUrl))` ▶ `PATCH /api/v1/users/me` (외부 단위)
  - 성공: `OnboardingStorage.markProfileSetup()` → `context.go('/onboarding/interests')`
  - "건너뛰기" 탭: API 호출 없이 markProfileSetup → 다음 단계
- **상태 분기**:
  - `_isUploading` 시 아바타 오버레이 + "다음" 버튼 disabled
  - `_isLoading` 시 버튼 spinner

### Step 3 — 관심사 태그 (`onboarding_interests_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '관심사 선택')` (뒤로 가능)
  - 3-bar 단계 인디케이터 (2번째까지 활성)
  - 안내 "관심있는 태그를 3개 이상 선택해주세요" + 우측 선택 카운트 배지 (primary500 pill, 28h)
  - 카테고리별 태그 그리드 (Wrap, 8px 간격):
    - 스포츠/운동: 러닝, 등산, 테니스, 수영, 요가, 자전거
    - 음식/맛집: 카페탐방, 맛집투어, 와인, 요리
    - 문화/예술: 영화, 전시, 독서
  - 태그 칩: 36px 높이, r=18, 선택 시 primary500/white, 미선택 시 white/textPrimary + border
  - 하단 "다음 (N개 선택)" 버튼 + "건너뛰기"
- **사용자가 할 수 있는 액션**:
  - 태그 탭 → 토글 (Set 자료구조)
  - "다음" 탭 (3개 이상 선택 시만 활성):
    - `authRepository.addPreferenceTags(_selected.toList())` — **순차 단건 호출**
    - 각 태그마다 `POST /api/v1/users/me/preference-tags`
    - 모두 성공 시 `OnboardingStorage.markTagsSelected()` → `context.go('/onboarding/location')`
  - "건너뛰기" 탭: API 호출 없이 다음 단계로
- **상태 분기**:
  - 3개 미만 시 버튼 disabled
  - `_isLoading` 시 spinner

### Step 4 — 위치 (`onboarding_location_screen.dart`)
- **사용자가 보는 것** (초기):
  - `CommunityAppBar(title: '위치 설정')` (뒤로 가능)
  - 3-bar 단계 인디케이터 (3개 모두 활성)
  - 안내 "주변 이벤트와 클럽을 추천받으려면\n위치를 설정해주세요"
  - 96×96 원형 (#E8F0EB) + 48px 위치 아이콘 (primary500)
  - "현재 위치 자동 감지" primary 버튼
- **사용자가 보는 것** (감지 후):
  - 200×200 회색 카드 (지도 placeholder, gray400 map 아이콘)
  - 흰색 카드 (r=12, border): 위치 핀 아이콘 + 주소 텍스트
  - "이 위치로 설정" primary 버튼
  - "다른 주소 검색" 텍스트 링크
- **사용자가 할 수 있는 액션**:
  - "현재 위치 자동 감지" 탭 → `_detectLocation()`
    - `Geolocator.checkPermission` → `requestPermission`
    - 권한 거부/영구 거부 → 토스트 "위치 권한이 필요합니다" 등
    - 권한 획득 → `Geolocator.getCurrentPosition` (high accuracy)
    - 좌표를 `reverseGeocodeProvider(lat, lng)`로 역지오코딩 → 주소 표시
  - "이 위치로 설정" 탭:
    - `authRepository.addAddress(UserAddressAddRequest(addressType=home, address, lat, lng, isDefault=true))` ▶ `POST /api/v1/users/me/addresses`
    - 성공 → `OnboardingStorage.markLocationSet()` → `AuthNotifier.completeOnboarding()` → `context.go('/home')`
  - "다른 주소 검색" 탭 → `DaumPostcodeSearch.show(context)` 모달 → 주소 결과 → 화면 갱신
  - "건너뛰기" 탭 → API 호출 없이 markLocationSet + completeOnboarding → /home

### `AuthNotifier.completeOnboarding()` 동작
1. 현재 user 가져오기 (`onboarding`/`authenticated` state에서)
2. `_onboarding.markOnboardingDone()` (로컬)
3. `state = AuthState.authenticated(user.copyWith(onboardingCompleted: true))`

### API 호출 순서 (Provider/Repository 관점)

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

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 4단계 흐름 결정: welcome → profile → interests → location
- 각 단계에서 "건너뛰기" 허용 정책 (서버 강제 안 함)
- 진행 상태 저장 위치: 로컬 (`OnboardingStorage`) — 서버에 단계별 플래그 별도 저장 안 함
- 프로필 사진 업로드 최대 크기 (`max 512px`, ImagePicker 옵션)
- 카테고리별 태그 목록은 **클라이언트 하드코딩** — 서버에 카테고리 API 없음 (`onboarding_interests_screen.dart` `_categories` 상수)
- 최소 3개 태그 정책 (UI 측 강제, 서버 검증 없음)
- 다건 태그 등록 시 순차 호출 정책 (서버는 단건만 받음)
- 역지오코딩 실패 시 좌표 문자열 fallback
- 다음 주소 검색은 카카오/네이버 가 아닌 `DaumPostcodeSearch` (다음 우편번호 웹뷰)
- 위치 권한 거부 시에도 주소 직접 검색으로 진행 가능
- "건너뛰기" 시에도 onboarding 완료 처리 (사용자가 빈 프로필로 진입 가능)
- AppBar 뒤로 버튼: profile 단계만 차단 (`showBackButton: false`)
- 각 화면 padding: `EdgeInsets.all(24)` (.pen 기준)
- 단계 진행률 인디케이터: 3-bar (welcome 단계는 별도 dot indicator 사용)

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
| 후보 | frontend.md:133 | - 최소 3개 태그 정책 (UI 측 강제, 서버 검증 없음) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
