# F09-01. 본인 인증 (Toss) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/09_private_date/F09-01_verification -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-01_verification`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

데이팅 진입의 게이트. 사용자는 Toss 본인인증 SDK를 통해 실명·생년월일·성별·CI를 검증받아야 데이팅 프로필 작성·후보자 노출·매칭 액션 등 모든 후속 기능에 접근할 수 있다. 서버는 Toss 인증 URL과 txId를 발급하고, 사용자가 Toss에서 인증을 마친 뒤 txId로 결과를 회신받아 개인정보를 AES 암호화해 저장한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **데이팅 탭 최초 진입** — 데이팅 프로필이 없거나 미인증 상태에서 후보자 카드 진입 시 `/dating/verification`으로 가드 이동 (`candidate_card_screen.dart`의 `'프로필 만들기'` 버튼이 본 라우트로 push)
- **마이페이지 ▶ 데이팅 ▶ 본인 인증** 항목 (간접)
- **에러 다이얼로그** — `DATE_VERIFICATION_REQUIRED`(403) 응답을 받은 화면이 안내 후 `/dating/verification`으로 push (스펙)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-01_verification/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-01_verification/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-01_verification/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-01_verification/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateVerificationController.java:30` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateVerificationController.java:41` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateVerificationController.java:52` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시: `dateVerificationNotifierProvider` ▶ `DateVerificationRepository.getStatus()` ▶ `GET /api/v1/date/verification/status`
2. "본인 인증하기" 탭 시: `notifier.requestVerification()` ▶ `Repository.requestVerification()` ▶ `POST /api/v1/date/verification/request` ▶ `TossIdentificationVo {txId, authUrl}` 수신 ▶ WebView 호스팅
3. WebView `onSuccess(txId)` 시: `notifier.verify(txId)` ▶ `Repository.verify(TossVerifyParam(txId))` ▶ `POST /api/v1/date/verification/verify` ▶ `VerificationVo` 갱신 ▶ Provider state 갱신

## 4. 서버 계약

### 개요

데이팅 진입의 게이트. 사용자는 Toss 본인인증 SDK를 통해 실명·생년월일·성별·CI를 검증받아야 데이팅 프로필 작성·후보자 노출·매칭 액션 등 모든 후속 기능에 접근할 수 있다. 서버는 Toss 인증 URL과 txId를 발급하고, 사용자가 Toss에서 인증을 마친 뒤 txId로 결과를 회신받아 개인정보를 AES 암호화해 저장한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/date/verification/request | DateVerificationController#requestVerification | required | Toss 인증 URL+txId 발급, IdentityVerification PENDING 저장 |
| POST | /api/v1/date/verification/verify | DateVerificationController#verify | required | txId로 인증 결과 조회·복호화·암호화 저장, VERIFIED 전이 |
| GET | /api/v1/date/verification/status | DateVerificationController#getStatus | required | 본인인증 단건 상태 조회 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum `VerificationStatus`** (`constants/VerificationStatus.java`): `PENDING`, `VERIFIED`, `FAILED`, `EXPIRED`
- **Enum `VerificationType`** (`constants/VerificationType.java`, int 코드): `PHONE(0)`, `ID_CARD(1)`, `TOSS_CERT(2)` — 데이팅에서 사용하는 값은 `TOSS_CERT`
- **Entity `IdentityVerification`** 핵심 필드:
  - `id, userId, verificationType(int), status(VerificationStatus), verificationProvider(String "toss-cert")`
  - `verifiedName: byte[]`, `verifiedBirthDate: byte[]`, `verifiedGender: Integer (0/1/2)`, `ci: byte[]` — 모두 AES 암호화
  - `verifiedAt, expiresAt(verifiedAt + 1년), createdAt`
- **VO `TossIdentificationVo`**: `txId, authUrl`
- **VO `VerificationVo`**: 응답 모델 (위 응답 필드 참조). 평문 개인정보는 절대 응답에 포함하지 않는다.

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-02 ~ F09-08 모두 본 기능 통과를 전제로 함** — `VerificationService#isVerified(userId)`가 `DateProfileService#createProfile`, `DateMatchingService#findCandidates`, `performAction`에서 가드로 호출됨
- 외부:
  - **Toss Cert SDK / OAuth2** (`https://oauth2.cert.toss.im/token`, `https://cert.toss.im/api/v2/sign/user/auth/{request,result}`) — `TossVerificationService` 가 access token 캐시(만료 10초 전 갱신) + 최대 3회 지수 backoff 재시도
  - **AES 키** (`AesEncryptionService`) — 개인정보 영구저장 시 암호화

## 5. 프론트 계약

### 진입 경로

- **데이팅 탭 최초 진입** — 데이팅 프로필이 없거나 미인증 상태에서 후보자 카드 진입 시 `/dating/verification`으로 가드 이동 (`candidate_card_screen.dart`의 `'프로필 만들기'` 버튼이 본 라우트로 push)
- **마이페이지 ▶ 데이팅 ▶ 본인 인증** 항목 (간접)
- **에러 다이얼로그** — `DATE_VERIFICATION_REQUIRED`(403) 응답을 받은 화면이 안내 후 `/dating/verification`으로 push (스펙)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/dating/verification` (`Routes.datingVerification` = `'verification'` under `/dating`) | `presentation/date/screens/verification_screen.dart` | 인증 안내, Toss WebView 호스트, 결과 안내 |
| (내부 위젯) | `presentation/date/widgets/toss_verification_webview.dart` | Toss 인증 페이지를 WebView로 렌더 + txId 콜백 |

### 화면별 구성 요소 & 액션

### 본인 인증 (`verification_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('본인 인증')`
  - 안내 헤더 (이모지 🛡️ + "안전한 데이팅을 위해 본인 인증이 필요합니다" + 보조문)
  - 흰 카드 안의 체크리스트 3개 (실명 인증, 나이/성별 자동 확인, 개인정보 보호)
  - 하단 고정 CTA `_VerifyButton` ("본인 인증하기" / 로딩 시 "인증 요청 중...")
  - 상태별 화면 분기:
    - `null` 또는 `PENDING` → `_VerifyPrompt`
    - `VERIFIED` (만료 전) → `_VerifiedState` (✅ "본인 인증 완료")
    - `VERIFIED` (만료 후 클라이언트 검사) → `_ExpiredState` (⏰ + 만료일 표시 + "다시 인증하기")
    - `FAILED` → `_FailedState` (⚠️ + 실패 사유 카드 + "다시 시도하기")
    - `EXPIRED` (서버 상태) → `_ExpiredState`
- **사용자가 할 수 있는 액션**:
  - "본인 인증하기" 탭 ▶ `dateVerificationNotifier.requestVerification()` ▶ `POST /api/v1/date/verification/request` ▶ 성공 시 `_authUrl, _txId` 보관 후 `_showWebView=true` 토글
  - Toss WebView 내부 인증 완료 ▶ `onSuccess(txId)` 콜백 ▶ `notifier.verify(txId)` ▶ `POST /api/v1/date/verification/verify` ▶ 성공 토스트 "본인인증이 완료되었습니다"
  - WebView 내부 실패/취소 ▶ `onFailure(code, message)` / `onClose()` ▶ WebView 닫고 에러 토스트 표시
  - 만료/실패 상태에서 "다시 시도하기" / "다시 인증하기" 탭 ▶ 재요청 흐름 (request → WebView → verify)
- **상태 분기**:
  - 로딩: 화면 진입 시 `CircularProgressIndicator` (status fetch 중)
  - 에러: status 조회 실패 시 그대로 `_VerifyPrompt`로 폴백 (사용자가 다시 시도하면 됨)
- **모달/시트/네비게이션**: WebView는 모달이 아니라 화면 본문 자리에 inline 교체. 인증 성공 시 화면을 떠나지 않고 토스트만 띄워 호출자가 후속 화면(프로필 작성 등)으로 이동.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시: `dateVerificationNotifierProvider` ▶ `DateVerificationRepository.getStatus()` ▶ `GET /api/v1/date/verification/status`
2. "본인 인증하기" 탭 시: `notifier.requestVerification()` ▶ `Repository.requestVerification()` ▶ `POST /api/v1/date/verification/request` ▶ `TossIdentificationVo {txId, authUrl}` 수신 ▶ WebView 호스팅
3. WebView `onSuccess(txId)` 시: `notifier.verify(txId)` ▶ `Repository.verify(TossVerifyParam(txId))` ▶ `POST /api/v1/date/verification/verify` ▶ `VerificationVo` 갱신 ▶ Provider state 갱신

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **클라이언트 만료 검사**: `verifiedAt`이 있어도 `expiresAt < now`이면 UI에서 강제 `_ExpiredState`로 분기 (서버는 status 그대로 `VERIFIED`인 상황 대응)
- **WebView 호스팅 방식**: 풀스크린 화면 내 inline 영역 교체. 푸시/모달이 아님.
- **CTA 색상**: `AppColors.datingPink`. 만료/실패 카드 배경: `AppColors.warning50` / `AppColors.error50`
- **체크리스트 문구** (스펙에는 없음): "실명 인증으로 안전한 매칭", "나이 · 성별 자동 확인", "개인정보는 인증 목적으로만 사용"
- **토스트 메시지**:
  - 성공: "본인인증이 완료되었습니다" (`ToastType.success`)
  - request 실패: "본인인증 요청에 실패했습니다" (`ToastType.error`)
  - WebView 실패: "본인인증 실패: {errorMessage}" (`ToastType.error`)
  - verify 실패: "인증 확인에 실패했습니다. 다시 시도해주세요." (`ToastType.error`)
- **실패 사유 안내문구** (정적 텍스트): "입력한 정보가 일치하지 않을 수 있습니다 / 일시적인 서비스 장애일 수 있습니다 / 일일 인증 시도 횟수를 초과했을 수 있습니다"
- **고객센터 안내**: `help@community.local` (재시도 후에도 실패 시 노출)
- **로딩 토글**: request 중 `'인증 요청 중...'`, verify 중 동일 버튼 비활성화
- **TestId**:
  - `TestIds.screenDatingVerification` (전체)
  - `TestIds.screenDatingVerificationFailedRetry` (FAILED 화면)
  - `TestIds.screenDatingVerificationExpiredRetry` (EXPIRED 화면)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 데이팅 첫 진입 → 본인 인증 → 프로필 작성 (Happy Path) | 로그인 완료, IdentityVerification row 없음. | `IdentityVerification.status = VERIFIED`, 데이팅 모든 기능 사용 가능. |
| S2 | 일일 5회 한도 초과 | 오늘 `IdentityVerification` 생성/갱신 5회 누적. | `verification.status` 변하지 않음. |
| S3 | Toss 인증 중도 취소 | `requestVerification` 성공, `IdentityVerification.status = PENDING`. | `status=PENDING` 유지, 데이팅 진입 차단 유지. |
| S4 | 인증 실패 (Toss 결과 조회 실패) | WebView까지 통과했으나 Toss 서버 일시 장애. | `status=PENDING`. 사용자는 추후 재시도. |
| S5 | 1년 후 만료 → 재인증 | `status=VERIFIED, verifiedAt=2025-05-08, expiresAt=2026-05-08, 오늘=2026-05-09`. | 신규 `verifiedAt, expiresAt`으로 갱신 (서버 측 만료 처리 전제). |
| S6 | 이미 인증된 사용자가 강제 재요청 | 호기심에 다시 "본인 인증하기" 탭. | 변동 없음. |
| S7 | 차단·신고와의 관계 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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

- **AC-01. 데이팅 첫 진입 → 본인 인증 → 프로필 작성 (Happy Path)**: Given 로그인 완료, IdentityVerification row 없음. When 사용자가 해당 흐름을 실행하면 Then `IdentityVerification.status = VERIFIED`, 데이팅 모든 기능 사용 가능.
- **AC-02. 일일 5회 한도 초과**: Given 오늘 `IdentityVerification` 생성/갱신 5회 누적. When 사용자가 해당 흐름을 실행하면 Then `verification.status` 변하지 않음.
- **AC-03. Toss 인증 중도 취소**: Given `requestVerification` 성공, `IdentityVerification.status = PENDING`. When 사용자가 해당 흐름을 실행하면 Then `status=PENDING` 유지, 데이팅 진입 차단 유지.
- **AC-04. 인증 실패 (Toss 결과 조회 실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then `status=PENDING`. 사용자는 추후 재시도.
- **AC-05. 1년 후 만료 → 재인증**: Given `status=VERIFIED, verifiedAt=2025-05-08, expiresAt=2026-05-08, 오늘=2026-05-09`. When 사용자가 해당 흐름을 실행하면 Then 신규 `verifiedAt, expiresAt`으로 갱신 (서버 측 만료 처리 전제).
- **AC-06. 이미 인증된 사용자가 강제 재요청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변동 없음.
- **AC-07. 차단·신고와의 관계**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
