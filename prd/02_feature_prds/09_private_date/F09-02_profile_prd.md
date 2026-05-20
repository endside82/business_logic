# F09-02. 데이팅 프로필 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/09_private_date/F09-02_profile -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-02_profile`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

본인 인증을 통과한 사용자가 매칭 풀에 노출되기 위한 자기 표현 단위. 프로필 본문(표시이름·생년·성별·자기소개·키·직업·지역·선호 성별/연령), 사진(최대 6장), 노출 ON/OFF 토글, 공개 범위(`PUBLIC/MATCHED_ONLY/HIDDEN`)를 관리한다. 프로필이 없으면 후보자 노출도, LIKE 액션도 불가능하다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **데이팅 탭 진입** — 프로필이 있으면 `/dating/profile`로 진입
- **마이페이지 ▶ 데이팅 프로필** 메뉴
- **편집 진입**: 프로필 화면 우상단 "편집" 텍스트 → `/dating/profile/edit`
- **프로필 방문자 진입**: 우상단 👁 아이콘 → `/dating/profile/viewers` (F09-08 진입점)
- **차단 목록 진입**: 본문 하단 "차단 목록" ListTile → `datingBlocks` 라우트 (F09-07 진입점)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-02_profile/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-02_profile/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-02_profile/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-02_profile/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:37` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:45` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:52` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:60` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:68` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:76` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 프로필 화면 진입: `dateProfileNotifierProvider` ▶ `DateProfileRepository.getProfile()` ▶ `GET /api/v1/date/profile`
2. 활성 토글: `notifier.toggleActive(active)` ▶ `Repository.toggleActive(DateProfileActiveParam(active))` ▶ `PATCH /api/v1/date/profile/active`
3. 프로필 편집 저장: `notifier.updateProfile(DateProfileModParam(...))` ▶ `Repository.updateProfile(...)` ▶ `PATCH /api/v1/date/profile` ▶ Provider 상태 invalidate/replace
4. 사진 추가/삭제 (현 구현 화면 미연결): `Repository.addPhoto / deletePhoto` ▶ `POST/DELETE /api/v1/date/profile/photos[/{photoId}]`
5. 프로필 신규 생성 (최초 진입 시): `Repository.createProfile(DateProfileAddParam)` ▶ `POST /api/v1/date/profile`

## 4. 서버 계약

### 개요

본인 인증을 통과한 사용자가 매칭 풀에 노출되기 위한 자기 표현 단위. 프로필 본문(표시이름·생년·성별·자기소개·키·직업·지역·선호 성별/연령), 사진(최대 6장), 노출 ON/OFF 토글, 공개 범위(`PUBLIC/MATCHED_ONLY/HIDDEN`)를 관리한다. 프로필이 없으면 후보자 노출도, LIKE 액션도 불가능하다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/date/profile | DateProfileController#createProfile | required | 프로필 신규 생성 (사진 ≥3장 검증) |
| GET | /api/v1/date/profile | DateProfileController#getMyProfile | required | 내 프로필 + 사진 조회 |
| PATCH | /api/v1/date/profile | DateProfileController#updateProfile | required | 본문/선호조건/공개범위 부분 수정 |
| PATCH | /api/v1/date/profile/active | DateProfileController#toggleActive | required | active(노출 on/off) 토글 |
| POST | /api/v1/date/profile/photos | DateProfileController#addPhoto | required | 사진 1장 추가 (≤ 6장) |
| DELETE | /api/v1/date/profile/photos/{photoId} | DateProfileController#deletePhoto | required | 본인 사진 삭제 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum `DateGender`** (int code): `MALE(0), FEMALE(1)`
- **Enum `ProfileVisibility`** (int type): `PUBLIC(0), MATCHED_ONLY(1), HIDDEN(2)`
- **Entity `DateProfile`** 핵심:
  - `id, userId, displayName, birthYear, gender(int), introduction, height?, occupation?, locationCity?`
  - `preferredGender(int), preferredAgeMin?, preferredAgeMax?`
  - `isActive(boolean), visibility(int), lastActiveAt, createdAt, updatedAt`
- **Entity `DateProfilePhoto`**: `id, profileId, photoUrl, isPrimary, isVerified, displayOrder, createdAt`
- **VO `DateProfileVo`**: gender/preferredGender/visibility를 **String enum 이름으로 직렬화** (서버 코드의 mapper가 변환).

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-01** — `verificationService.isVerified` 가드 (createProfile에서만 검사. update/photo는 자체 검사 없음)
  - **F09-03 (후보자)** — `findCandidates`가 `DateProfile.isActive=true`인 row만 노출 대상으로 본다(QueryRepository에서 필터)
- 외부:
  - 사진 URL은 외부에서 업로드된 결과(`POST /api/v1/files/...` 등 별도 도메인)를 받아 저장만 한다 — 본 컨트롤러는 S3 직접 호출 없음

## 5. 프론트 계약

### 진입 경로

- **데이팅 탭 진입** — 프로필이 있으면 `/dating/profile`로 진입
- **마이페이지 ▶ 데이팅 프로필** 메뉴
- **편집 진입**: 프로필 화면 우상단 "편집" 텍스트 → `/dating/profile/edit`
- **프로필 방문자 진입**: 우상단 👁 아이콘 → `/dating/profile/viewers` (F09-08 진입점)
- **차단 목록 진입**: 본문 하단 "차단 목록" ListTile → `datingBlocks` 라우트 (F09-07 진입점)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/dating/profile` (`Routes.dating + Routes.datingProfile`) | `presentation/date/screens/date_profile_screen.dart` | 프로필 뷰모드 + 활성 토글 + 입구 |
| `/dating/profile/edit` (`Routes.datingProfileEdit`) | `presentation/date/screens/date_profile_edit_screen.dart` | 본문/선호조건/공개범위 편집 폼 |

### 화면별 구성 요소 & 액션

### 데이팅 프로필 뷰 (`date_profile_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('데이팅 프로필')` + 우측 액션 (👁 viewers, "편집")
  - `_ProfileToggle` — `isActive` 색상이 다른 카드 + Switch (활성: `AppColors.primary50/primary500`, 비활성: `AppColors.warning50/warning600`) + 보조문 ("매칭 추천에 노출됩니다" / "매칭을 받으려면 활성화하세요")
  - 사진 그리드 `사진 (n/6)` — 2x3 정사각 슬롯, 비어있으면 + 아이콘
  - 기본 정보 카드 — 나이(birthYear → "{year}년생"), 성별(MALE→"남성", FEMALE→"여성"), 키(cm), 직업
  - 자기소개 본문 + `{n} / 300` 카운터
  - 관심사 칩들 — `preferenceTagListNotifierProvider`로 별도 도메인에서 가져옴(태그 도메인은 본 작업 범위 밖)
  - 하단 "차단 목록" 진입 ListTile
- **사용자가 할 수 있는 액션**:
  - 활성 Switch 탭 ▶ `notifier.toggleActive(!isActive)` ▶ `PATCH /api/v1/date/profile/active` ▶ 토스트 "프로필이 (비)활성화되었습니다"
  - "편집" 탭 ▶ `context.push('/dating/profile/edit')`
  - 👁 아이콘 ▶ `context.push('/dating/profile/viewers')` (F09-08)
  - "차단 목록" 탭 ▶ `context.pushNamed('datingBlocks')` (F09-07)
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(error: ..., onRetry: invalidate)`
  - 프로필 없음: 현 구현은 에러로 처리 — onRetry 또는 외부 흐름이 createProfile 실행
- **모달/시트/네비게이션**: 모달 없음. 액션 모두 push.

### 프로필 편집 (`date_profile_edit_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('프로필 편집')` + 우상단 "저장" (변경 시 `datingPink`, 미변경 시 `gray300`)
  - 폼 필드: 표시 이름(20자), 자기소개(`AppTextArea`, 300자), 키(숫자), 직업, 지역, 선호 성별(MALE/FEMALE 칩 토글), 선호 나이 min/max, 프로필 공개 범위 (`_VisibilityOption` 3개: PUBLIC/MATCHED_ONLY/HIDDEN — 라디오 카드)
- **사용자가 할 수 있는 액션**:
  - 필드 입력 시 `_hasChanges` 갱신 → "저장" 활성화
  - "저장" 탭 ▶ `notifier.updateProfile(DateProfileModParam(...))` ▶ `PATCH /api/v1/date/profile` ▶ 토스트 "프로필이 수정되었습니다" + `context.pop()`
  - 변경 후 뒤로가기 시 `PopScope`가 `_showDiscardDialog` 표시 ("변경 사항을 저장하지 않고 나가시겠습니까?")
- **상태 분기**:
  - displayName 비어있으면 토스트 "표시 이름을 입력하세요" (`ToastType.error`) → 저장 중단
- **모달/시트**: 변경 사항 저장 다이얼로그.

### API 호출 순서 (Provider/Repository 관점)

1. 프로필 화면 진입: `dateProfileNotifierProvider` ▶ `DateProfileRepository.getProfile()` ▶ `GET /api/v1/date/profile`
2. 활성 토글: `notifier.toggleActive(active)` ▶ `Repository.toggleActive(DateProfileActiveParam(active))` ▶ `PATCH /api/v1/date/profile/active`
3. 프로필 편집 저장: `notifier.updateProfile(DateProfileModParam(...))` ▶ `Repository.updateProfile(...)` ▶ `PATCH /api/v1/date/profile` ▶ Provider 상태 invalidate/replace
4. 사진 추가/삭제 (현 구현 화면 미연결): `Repository.addPhoto / deletePhoto` ▶ `POST/DELETE /api/v1/date/profile/photos[/{photoId}]`
5. 프로필 신규 생성 (최초 진입 시): `Repository.createProfile(DateProfileAddParam)` ▶ `POST /api/v1/date/profile`

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **사진 슬롯 그리드**: 2x3, 빈 슬롯에는 + 아이콘 (편집 모드 미구현 — 현재 코드에서는 사진 추가 UI 미연결)
- **나이 표기 형식**: `birthYear`는 표시할 때 "{birthYear}년생"으로 보임. 후보자 카드(F09-03)에서는 `DateTime.now().year - birthYear`로 만 나이 노출
- **자기소개 카운터**: `{length} / 300` 우측 정렬, 11pt
- **활성 토글 색상**: 활성=`primary500`(#3D8A5A), 비활성=`warning600`. 토글 중 `CircularProgressIndicator(strokeWidth: 2)` 노출
- **공개 범위 라벨**:
  - PUBLIC = "전체 공개 / 모든 사용자에게 프로필이 노출됩니다"
  - MATCHED_ONLY = "매칭된 상대만 / 매칭된 상대에게만 프로필이 노출됩니다"
  - HIDDEN = "비공개 / 프로필이 누구에게도 노출되지 않습니다"
- **편집 입력 검증** (클라이언트 측): displayName 비어있으면 저장 중단. height는 `int.tryParse`. 빈 문자열은 null로 보냄.
- **Discard 다이얼로그**: `_hasChanges=true`에서만 노출. "취소" / "나가기".
- **TestId**: `screenDatingProfile`, `screenDatingProfileEdit`
- **사진 URL fallback**: 로드 실패 시 `AppColors.datingPink.withValues(alpha: 0.3)` 배경
- **관심사 칩**: 본 도메인 외(`preferenceTagListNotifierProvider`) 데이터를 가져와 핑크 배경(#FCE4EC) 칩으로 노출

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 본인인증 통과 후 프로필 신규 작성 (Happy Path) | `IdentityVerification.status=VERIFIED`. `DateProfile` row 없음. S3에 사진 3장 업로드 완료(URL 보유). | `DateProfile.isActive=true`, 후보자 풀 노출 가능. |
| S2 | 활성/비활성 토글로 매칭 잠시 중단 | 출장 가는 사용자. 일주일간 매칭 알림 받기 싫음. | `isActive=false`. 데이터는 보존, 노출만 중단. |
| S3 | 프로필 편집 — 변경 사항 폐기 | 시나리오 본문 참조 | 서버 상태 변동 없음. |
| S4 | 사진 6장 초과 시도 | 이미 6장 사진을 올린 사용자. | 사진 미추가. |
| S5 | 다른 사용자의 사진 삭제 시도 (권한 위반) | 악의적 호출 — 본인 프로필이 아닌 photoId로 DELETE. | 사진 그대로. |
| S6 | 미인증 상태에서 프로필 생성 시도 | 시나리오 본문 참조 | 프로필 생성 차단. |
| S7 | 차단된 사용자가 내 프로필을 보는 경우 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 신고로 인한 프로필 영향 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | frontend.md:64 | - **사진 슬롯 그리드**: 2x3, 빈 슬롯에는 + 아이콘 (편집 모드 미구현 — 현재 코드에서는 사진 추가 UI 미연결) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:45 | 3. 클라이언트는 `Result.failure`로 받아 토스트 ("사진은 최대 6장까지 등록 가능합니다" — 스펙 텍스트, 실 화면 미구현 시 일반 에러로 표시) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 본인인증 통과 후 프로필 신규 작성 (Happy Path)**: Given `IdentityVerification.status=VERIFIED`. `DateProfile` row 없음. S3에 사진 3장 업로드 완료(URL 보유). When 사용자가 해당 흐름을 실행하면 Then `DateProfile.isActive=true`, 후보자 풀 노출 가능.
- **AC-02. 활성/비활성 토글로 매칭 잠시 중단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then `isActive=false`. 데이터는 보존, 노출만 중단.
- **AC-03. 프로필 편집 — 변경 사항 폐기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 상태 변동 없음.
- **AC-04. 사진 6장 초과 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사진 미추가.
- **AC-05. 다른 사용자의 사진 삭제 시도 (권한 위반)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사진 그대로.
- **AC-06. 미인증 상태에서 프로필 생성 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 프로필 생성 차단.
- **AC-07. 차단된 사용자가 내 프로필을 보는 경우 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 신고로 인한 프로필 영향 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
