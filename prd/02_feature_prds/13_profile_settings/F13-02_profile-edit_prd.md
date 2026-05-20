# F13-02. 프로필 수정 (닉네임·자기소개·사진) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/13_profile_settings/F13-02_profile-edit -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/13_profile_settings/F13-02_profile-edit`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

프로필 수정 API는 사용자가 다른 사람에게 보이는 닉네임, 자기소개, 프로필 이미지를 갱신하는 기능이다. 닉네임 변경 시 중복 여부를 검사하고 변경 이력을 남기며, 자기소개와 이미지 URL은 멤버 상세 정보에 저장한다. 이미지 파일 업로드 자체는 file 도메인 의존이며 본 account 컨트롤러에는 포함되지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `프로필 편집` 메뉴를 탭해 진입한다.
- 화면은 현재 authenticated user 값을 초기 폼 값으로 사용한다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/13_profile_settings/F13-02_profile-edit/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/13_profile_settings/F13-02_profile-edit/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/13_profile_settings/F13-02_profile-edit/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/13_profile_settings/F13-02_profile-edit/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/UserController.java:56` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 초기화: `authNotifierProvider`의 authenticated user를 읽어 `_nicknameController`, `_bioController`, `_profileImageUrl`에 반영한다.
2. 사진 선택: `ImagePicker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 85)`.
3. 사진 업로드: `uploadImageFile(ref: ref, file: file, purpose: 'PROFILE')` ▶ file 도메인 API `(본 범위 밖)`.
4. 저장: `authRepositoryProvider.updateProfile(UserModParam(nickname, bio, profileImageUrl))` ▶ `PATCH /api/v1/users/me`.
5. 저장 성공: `authNotifierProvider.notifier.checkAuthStatus()`로 전역 인증 사용자 정보를 재조회/동기화한다.
6. 저장 성공 후 화면 종료: `AppToast.show(... '프로필이 수정되었습니다')` ▶ `context.pop()`.

## 4. 서버 계약

### 개요

프로필 수정 API는 사용자가 다른 사람에게 보이는 닉네임, 자기소개, 프로필 이미지를 갱신하는 기능이다. 닉네임 변경 시 중복 여부를 검사하고 변경 이력을 남기며, 자기소개와 이미지 URL은 멤버 상세 정보에 저장한다. 이미지 파일 업로드 자체는 file 도메인 의존이며 본 account 컨트롤러에는 포함되지 않는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| PATCH | `/api/v1/users/me` | `UserController#updateMyProfile` | required | 현재 사용자의 프로필 필드 부분 갱신 |

### 도메인 모델 / Enum (이 기능 관련)

- **Param** `UserModParam`: `nickname`, `bio`, `profileImageUrl`, `locale`
- **VO** `UserProfileVo`: 프로필 카드와 편집 완료 후 화면 동기화 기준
- **Entity** `Users`: `email`, `nickname`, `status`, `user_role`
- **Entity** `Member`: `name`, `birthDate`, `gender`, `bio`, `profileImageUrl`, `locale`
- **Entity** `NicknameHistory`: 닉네임 변경 이력 저장, 필드 상세는 본 기능의 필수 응답이 아니라 요약만 표기
- **Enum** `UserStatus`: `NORMAL`, `LOGOUT`, `STOP`, `BAN`, `TRYEXIT`, `EXIT`

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - 이미지 파일 업로드: file 도메인 `uploadImageFile` helper가 호출하는 API. Controller/Service 상세는 본 탐색 범위 밖이라 `(미확인)`.
  - 인증 상태 갱신: 프론트에서 저장 성공 후 `authNotifierProvider.checkAuthStatus()` 호출. Unit 01 인증 상태 동기화에 의존.
- 외부:
  - S3 또는 파일 저장소 사용 여부는 UI 스펙에는 언급되지만 account 코드에는 없음. 실제 업로드 외부 시스템은 `(미확인)`.

## 5. 프론트 계약

### 진입 경로

- 마이페이지 허브에서 `프로필 편집` 메뉴를 탭해 진입한다.
- 화면은 현재 authenticated user 값을 초기 폼 값으로 사용한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/profile/edit` | `profile/screens/profile_edit_screen.dart` | 닉네임, 자기소개, 프로필 사진 수정 |

### 화면별 구성 요소 & 액션

### 프로필 수정 (`profile_edit_screen.dart`)
- **사용자가 보는 것**:
  - 앱바 제목 `프로필 수정`
  - 앱바 우측 `저장` 텍스트 액션
  - 원형 프로필 사진 또는 기본 아이콘
  - 카메라 오버레이 아이콘
  - `사진 변경` 텍스트 버튼
  - 닉네임 입력 필드
  - 닉네임 안내 문구 `2~30자, 한글/영문/숫자` (서버 `UserModParam.nickname @Size(min=2, max=30)` 와 일치)
  - 자기소개 입력 영역
  - 자기소개 maxLength 200
- **사용자가 할 수 있는 액션**:
  - 사진 영역 또는 `사진 변경` 탭 ▶ 갤러리 picker 실행
  - 이미지 선택 ▶ `uploadImageFile(ref, file, purpose: 'PROFILE')`
  - 닉네임/자기소개 수정 ▶ `_hasChanges` 갱신
  - 저장 탭 ▶ `authRepositoryProvider.updateProfile(UserModParam)` ▶ `PATCH /api/v1/users/me`
  - 뒤로가기 ▶ 변경 사항이 있으면 폐기 확인 다이얼로그
- **상태 분기**:
  - `_hasChanges == false`: 저장 액션 비활성 색상
  - `_isSaving == true`: 저장 액션 비활성, 사진 업로드/저장 중 상태
  - 닉네임 trim 길이 2 미만: `AppToast` error `닉네임은 2자 이상이어야 합니다`
  - 사진 업로드 실패: `AppToast` error `사진 업로드에 실패했습니다`
  - 프로필 수정 실패: `AppToast` error `프로필 수정에 실패했습니다`
- **모달/시트/네비게이션**:
  - 코드상 카메라/앨범 바텀시트는 없음. 현재 구현은 갤러리 `ImagePicker.pickImage`만 사용한다.
  - 변경 사항이 있는 뒤로가기는 `AlertDialog`로 `취소`/`나가기`를 선택한다.
  - 저장 성공 시 `프로필이 수정되었습니다` 토스트 후 `context.pop()`.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 초기화: `authNotifierProvider`의 authenticated user를 읽어 `_nicknameController`, `_bioController`, `_profileImageUrl`에 반영한다.
2. 사진 선택: `ImagePicker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 85)`.
3. 사진 업로드: `uploadImageFile(ref: ref, file: file, purpose: 'PROFILE')` ▶ file 도메인 API `(본 범위 밖)`.
4. 저장: `authRepositoryProvider.updateProfile(UserModParam(nickname, bio, profileImageUrl))` ▶ `PATCH /api/v1/users/me`.
5. 저장 성공: `authNotifierProvider.notifier.checkAuthStatus()`로 전역 인증 사용자 정보를 재조회/동기화한다.
6. 저장 성공 후 화면 종료: `AppToast.show(... '프로필이 수정되었습니다')` ▶ `context.pop()`.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 프로필 사진은 갤러리에서만 선택한다. UI 스펙의 카메라 촬영/기본 이미지/크롭 화면은 현재 profile 화면 코드에서 확인되지 않는다.
- 이미지 picker는 512x512, quality 85로 제한한다.
- 저장 활성화는 서버 응답이 아니라 로컬 `_hasChanges` 비교로 결정한다.
- 닉네임 입력 UI는 maxLength 30 (서버 `UserModParam.nickname @Size(min=2, max=30)` 과 일치 — 6차 라운드 정정). 실제 저장 전 클라 가드는 최소 2자만 검사한다.
- 자기소개 입력 UI는 maxLength 200이지만 서버 Bean Validation은 확인되지 않는다.
- 성공/실패 메시지는 `AppToast`로 표시한다.
- `AppSpacing.screenPadding` 대신 이 화면 일부 padding은 `AppSpacing.space5`를 사용한다. 기존 구현 사실만 기록하며 수정 대상 아님.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 닉네임과 자기소개를 수정한다 | 로그인됨, 마이페이지에서 프로필 편집 진입 | `users.nickname`과 `member.bio`가 갱신되고 마이페이지의 표시 정보가 새 값으로 동기화된다. |
| S2 | 프로필 사진을 갤러리에서 바꾼다 | 로그인됨, 프로필 수정 화면 표시 중 | `member.profile_image_url`이 새 이미지 값으로 갱신된다. |
| S3 | 닉네임이 너무 짧아 저장되지 않는다 | 로그인됨, 프로필 수정 화면 표시 중 | 프로필은 변경되지 않고 사용자는 입력을 수정할 수 있다. |
| S4 | 중복 닉네임으로 서버 저장이 실패한다 | 로그인됨, 유효한 길이의 닉네임 입력 완료 | 기존 프로필 값이 유지된다. 사용자에게 구체적 중복 메시지를 매핑하는지는 `(미확인)`. |
| S5 | 변경 사항이 있는 상태로 나가기를 시도한다 | `_hasChanges == true` | 취소 시 변경 중 상태 유지, 나가기 시 저장하지 않은 값은 폐기된다. |

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
| 후보 | backend.md:41 | - Bean Validation 실패 응답 형식은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:60 | - 이미지 파일 업로드: file 도메인 `uploadImageFile` helper가 호출하는 API. Controller/Service 상세는 본 탐색 범위 밖이라 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:63 | - S3 또는 파일 저장소 사용 여부는 UI 스펙에는 언급되지만 account 코드에는 없음. 실제 업로드 외부 시스템은 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:53 | **종료 상태**: 기존 프로필 값이 유지된다. 사용자에게 구체적 중복 메시지를 매핑하는지는 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 닉네임과 자기소개를 수정한다**: Given 로그인됨, 마이페이지에서 프로필 편집 진입 When 사용자가 해당 흐름을 실행하면 Then `users.nickname`과 `member.bio`가 갱신되고 마이페이지의 표시 정보가 새 값으로 동기화된다.
- **AC-02. 프로필 사진을 갤러리에서 바꾼다**: Given 로그인됨, 프로필 수정 화면 표시 중 When 사용자가 해당 흐름을 실행하면 Then `member.profile_image_url`이 새 이미지 값으로 갱신된다.
- **AC-03. 닉네임이 너무 짧아 저장되지 않는다**: Given 로그인됨, 프로필 수정 화면 표시 중 When 사용자가 해당 흐름을 실행하면 Then 프로필은 변경되지 않고 사용자는 입력을 수정할 수 있다.
- **AC-04. 중복 닉네임으로 서버 저장이 실패한다**: Given 로그인됨, 유효한 길이의 닉네임 입력 완료 When 사용자가 해당 흐름을 실행하면 Then 기존 프로필 값이 유지된다. 사용자에게 구체적 중복 메시지를 매핑하는지는 `(미확인)`.
- **AC-05. 변경 사항이 있는 상태로 나가기를 시도한다**: Given `_hasChanges == true` When 사용자가 해당 흐름을 실행하면 Then 취소 시 변경 중 상태 유지, 나가기 시 저장하지 않은 값은 폐기된다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
