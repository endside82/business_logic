# F13-05. 데이터 내보내기 (Export) PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/13_profile_settings/F13-05_data-export -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/13_profile_settings/F13-05_data-export`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

데이터 내보내기는 로그인 사용자가 자기 데이터 사본을 JSON 파일로 생성하도록 요청하고, 최신 요청 상태를 조회하는 기능이다. 서버는 요청을 `PROCESSING`으로 저장한 뒤 비동기 worker로 사용자 데이터를 수집해 파일을 만들고 완료 상태와 다운로드 위치를 기록한다. UI 스펙은 "최대 48시간"을 안내하지만, account 코드 안에서 48시간 제한을 강제하는 로직은 확인되지 않는다.

**2026-05-27 변경**: `DataExportAsyncWorker.toMemberMap`이 `mbti` 필드를 export에 포함한다(기존 name/birthDate/gender/bio/profileImageUrl/locale + mbti). [[F13-02]] / [[F09-01]]의 데이터가 모두 사용자에게 내보내져야 한다는 GDPR-style 원칙에 따른다.

### 2026-07-29 소스 재실측 — 저장·다운로드·스키마

- `POST /api/v1/users/me/data-export`는 202를 반환하고 `PROCESSING`, `expiresAt=now+30일` 요청을 만든다. `GET /api/v1/users/me/data-export/status`는 최신 요청을 반환한다.
- worker는 JSON을 `FileStorageService`로 `exports/{userId}/{requestId}_{yyyyMMdd_HHmmss}.json` 키에 업로드하고 `fileKey`만 저장한다. 완료 시 DB `downloadUrl`은 null이다.
- 상태 조회 시 `COMPLETED + fileKey + 미만료`일 때만 `my-data-export.json` 파일명의 presigned GET URL을 동적으로 발급한다. 과거 문서의 로컬 절대경로 설명은 현재 소스와 다르다.
- 최상위 `metadata.schemaVersion`은 `2026-04-23`이고 포함 섹션은 `profile`, `events`, `trust`, `financial`, `notifications`, `dating`, `feedback`, `traits`, `taste` 9개다.
- `notifications.devices[].token`과 신원인증 `verifiedName`, `verifiedBirthDate`, `ci`, `di`는 redacted 목록에 명시되고 export하지 않는다. 인증 type/status/gender/provider/시각은 포함한다.
- `dating.profile`은 흡연·음주·만남 목적·종교/동의시각·네 결격 토글·`communityDataOptIn/At`를 포함한다.
- `feedback`은 내가 작성한 이벤트 선택/인상 태그와 데이트 만남 피드백만 포함한다. 받은 선택/피드백은 포함하지 않는다.
- `traits` schema v1은 본인의 모든 세션(`IN_PROGRESS` 포함), 응답과 해석용 문항/축 메타, 점수를 포함한다. 전역 축·문항을 독립 데이터로 덤프하지 않는다.
- `taste` schema v1은 선언 선호와 `behaviorStyleEstimate`를 포함한다. `positiveTagWeights`는 원본 이벤트 선택 피드백에서 재생성 가능한 중복 파생 캐시라 의도적으로 제외한다.

확정 Gap:

1. `EventFeedbackVo`가 보존하는 사용자 작성 `vibeTags`를 `toEventFeedbackMap`이 export하지 않는다.
2. community_api에는 시간 경과만으로 status를 `EXPIRED`로 바꾸는 자동 전이와 artifact 정리 scheduler가 없다. 자연 만료 조회는 `COMPLETED + downloadUrl=null`이다. 다만 community_admin_api의 `expire` 액션은 수동으로 `EXPIRED` 전이할 수 있다.
3. Flutter에는 `COMPLETED`인데 URL이 없는 만료 케이스를 명시적으로 재요청 상태로 바꾸는 계약이 없고, 화면의 "최대 48시간" 문구도 서버 SLA로 강제되지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `데이터 프라이버시` 메뉴를 탭한다.
- 데이터 프라이버시 화면의 첫 번째 섹션 `데이터 내보내기`에서 요청과 다운로드를 수행한다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/13_profile_settings/F13-05_data-export/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/13_profile_settings/F13-05_data-export/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/13_profile_settings/F13-05_data-export/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/13_profile_settings/F13-05_data-export/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/DataPrivacyController.java:26` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/DataPrivacyController.java:33` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입: `exportStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-export/status`.
2. status 조회가 NOT_FOUND 등 실패일 때 화면은 오류 자체보다 요청 버튼을 보여준다.
3. 요청 버튼: `requestExport()` ▶ `POST /api/v1/users/me/data-export`.
4. 요청 성공: `데이터 내보내기를 요청했습니다` 토스트.
5. 처리 중 새로고침: provider invalidate ▶ status 재조회.
6. 완료 후 다운로드: `canLaunchUrl(Uri.parse(downloadUrl))` 확인 ▶ 외부 앱 열기.
7. `ExportStatusNotifier` → `ProfileRepository` → `DataPrivacyApi` 체인이 상태 조회와 요청을 수행한다.

## 4. 서버 계약

### 개요

데이터 내보내기는 로그인 사용자가 자기 데이터 사본을 JSON 파일로 생성하도록 요청하고, 최신 요청 상태를 조회하는 기능이다. 서버는 요청을 `PROCESSING`으로 저장한 뒤 비동기 worker로 사용자 데이터를 수집해 파일을 만들고 완료 상태와 다운로드 위치를 기록한다. UI 스펙은 "최대 48시간"을 안내하지만, account 코드 안에서 48시간 제한을 강제하는 로직은 확인되지 않는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/users/me/data-export` | `DataPrivacyController#requestExport` | required | 데이터 내보내기 비동기 작업 요청 |
| GET | `/api/v1/users/me/data-export/status` | `DataPrivacyController#getExportStatus` | required | 최신 내보내기 요청 상태 조회 |

관리자 `MANAGE_PRIVACY` 경로는 `/admin/v1/manage/privacy/export-requests/{id}/process|expire|reissue`를 제공한다. `expire`는 수동으로 `EXPIRED`를 기록하고, `reissue`는 `COMPLETED`와 미래 `expiresAt`을 기록한다. 이는 시간 기반 자동 만료가 아니다.

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `DataExportStatus`: `PROCESSING`, `COMPLETED`, `FAILED`, `EXPIRED`
- **Entity** `DataExportRequest`: 테이블 `data_export_request`
  - `id`, `userId`, `status`, `downloadUrl`, `fileKey`, `expiresAt`, `createdAt`
- **VO** `DataExportRequestVo`: Entity와 같은 응답 필드 구조

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - event applications, review trust score, payment wallet/point transactions, notification settings/devices, privatedate identity verification 데이터를 export에 포함한다.
  - 해당 도메인의 상세 필드 의미와 repository 내부 동작은 본 탐색 범위 밖.
- 외부:
  - `FileStorageService`에 JSON을 업로드하고 조회 시점에 presigned GET URL을 생성한다.
  - 파일 key는 `exports/{userId}/{requestId}_{timestamp}.json` 형식이다.

## 5. 프론트 계약

### 진입 경로

- 마이페이지 허브에서 `데이터 프라이버시` 메뉴를 탭한다.
- 데이터 프라이버시 화면의 첫 번째 섹션 `데이터 내보내기`에서 요청과 다운로드를 수행한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/profile/privacy` | `profile/screens/data_privacy_screen.dart` | 데이터 내보내기 상태 조회, 요청, 다운로드 |

### 화면별 구성 요소 & 액션

### 데이터 프라이버시 - 데이터 내보내기 섹션 (`data_privacy_screen.dart`)
- **사용자가 보는 것**:
  - 섹션 제목 `데이터 내보내기`
  - 설명 `내 데이터를 JSON 파일로 다운로드할 수 있습니다. 처리에 최대 48시간이 소요됩니다.`
  - 초기/오류 상태의 `데이터 내보내기 요청` 버튼
  - `PROCESSING` 상태의 비활성 요청 버튼
  - 선형 진행 인디케이터
  - 요청 후 경과 시간과 최대 48시간 안내
  - 새로고침 아이콘
  - `COMPLETED` 상태의 상태 행, 만료일 행, 다운로드 버튼
  - `EXPIRED`/`FAILED` 상태의 다시 요청 버튼
- **사용자가 할 수 있는 액션**:
  - 내보내기 요청 탭 ▶ `exportStatusNotifierProvider.notifier.requestExport()` ▶ `POST /api/v1/users/me/data-export`
  - 처리 중 새로고침 아이콘 탭 ▶ `ref.invalidate(exportStatusNotifierProvider)` ▶ 상태 재조회
  - 다운로드 탭 ▶ `url_launcher`로 `downloadUrl` 외부 앱 열기
  - 만료/실패/알 수 없는 상태에서 다시 요청 ▶ POST 재호출
- **상태 분기**:
  - provider data null: 요청 버튼 표시
  - loading: 중앙 `CircularProgressIndicator`
  - error: 요청 버튼 표시
  - `PROCESSING`: disabled 버튼 + progress + 경과 시간 + refresh
  - `COMPLETED`: 완료 상태 + 만료일 + downloadUrl이 있을 때 다운로드 버튼
  - `EXPIRED`: 만료됨 + 다시 요청
  - `FAILED`: 실패 + 다시 요청
  - fallback: 서버 status 문자열 표시 + 다시 요청
- **모달/시트/네비게이션**:
  - 요청 전 확인 다이얼로그 없음
  - 다운로드는 `LaunchMode.externalApplication`

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입: `exportStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-export/status`.
2. status 조회가 NOT_FOUND 등 실패일 때 화면은 오류 자체보다 요청 버튼을 보여준다.
3. 요청 버튼: `requestExport()` ▶ `POST /api/v1/users/me/data-export`.
4. 요청 성공: `데이터 내보내기를 요청했습니다` 토스트.
5. 처리 중 새로고침: provider invalidate ▶ status 재조회.
6. 완료 후 다운로드: `canLaunchUrl(Uri.parse(downloadUrl))` 확인 ▶ 외부 앱 열기.
7. `ExportStatusNotifier` → `ProfileRepository` → `DataPrivacyApi` 체인이 상태 조회와 요청을 수행한다.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 사용자는 별도 확인 없이 바로 데이터 내보내기 요청을 만든다.
- 처리 중 상태에는 경과 시간 라벨을 표시한다: 방금 전, N분 전, N시간 전, N일 전.
- 만료일은 `yyyy.MM.dd (D-N)` 또는 `오늘 만료`/`만료됨` 형식으로 표시한다.
- 서버 `downloadUrl`은 상태 조회 시점에 발급한 presigned GET URL이며 Flutter는 `url_launcher`로 외부 앱에 위임한다.
- `COMPLETED`라도 downloadUrl이 없으면 다운로드 버튼은 표시되지 않는다.
- UI 안내의 "최대 48시간"은 클라이언트 문구이며 서버 제한 코드는 확인되지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 처음으로 데이터 내보내기를 요청한다 | 로그인됨, 기존 export 요청 없음 또는 status 조회 실패 | 최신 export 요청이 `PROCESSING` 상태로 존재한다. |
| S2 | 처리 중 상태를 확인한다 | 최신 요청 status가 `PROCESSING` | 사용자는 요청이 아직 처리 중임을 확인한다. |
| S3 | 완료된 JSON 파일을 다운로드한다 | 최신 요청 status가 `COMPLETED`, `fileKey` 존재, 미만료 | 상태 조회가 presigned `downloadUrl`을 발급하고 사용자는 외부 앱으로 JSON을 연다. |
| S4 | 내보내기 작업이 실패한다 | worker가 예외를 만나 status를 `FAILED`로 변경 | 다시 요청하면 새 `PROCESSING` row가 생기고 기존 FAILED row는 보존된다. 화면은 최신 row 하나만 표시한다. |
| S5 | 완료 파일이 자연 만료된다 | 최신 요청 status가 `COMPLETED`, `expiresAt <= now`, 관리자 expire 미실행 | community_api는 status를 바꾸지 않고 `downloadUrl=null`을 반환한다. 관리자 expire를 실행한 경우에만 `EXPIRED` UI로 도달한다. |

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
| 후보 | backend.md:43 | - 요청 생성 중 repository 저장 실패 등 일반 예외 응답은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:44 | - 인증 실패 응답은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 해소 | 현재 `DataExportService`/`DataExportAsyncWorker` | 로컬 절대경로가 아니라 FileStorage key 저장 + 상태 조회 시 presigned GET URL 발급으로 확인됐다. | 과거 후보 제거 |
| Gap | `DataExportAsyncWorker#toEventFeedbackMap` | 본인이 작성한 `vibeTags`가 export에서 빠진다. | feedback schema에 vibeTags 추가 및 테스트 보강 |
| Gap | `DataExportService#getExportStatus`, admin `expire` | 자연 만료는 자동 EXPIRED 전이/파일 정리 없이 `COMPLETED + downloadUrl=null`이 되고, 관리자 수동 expire만 EXPIRED를 만든다. | 자동 만료·관리자 전이·artifact retention·Flutter 재요청 UX를 한 계약으로 정렬 |
| 해소 | 현재 status/download source | 완료·미만료 상태는 presigned GET URL로 확인됐다. | URL launcher 실패만 일반 외부 앱 오류 처리 |
| 확정 | request repository/status 조회 | 재요청은 새 row를 만들고 기존 FAILED row를 보존하며, public status는 `createdAt DESC` 최신 row 하나를 반환한다. | 문서 계약으로 유지 |

## 9. 수용 기준

- **AC-01. 처음으로 데이터 내보내기를 요청한다**: Given 로그인됨, 기존 export 요청 없음 또는 status 조회 실패 When 사용자가 해당 흐름을 실행하면 Then 최신 export 요청이 `PROCESSING` 상태로 존재한다.
- **AC-02. 처리 중 상태를 확인한다**: Given 최신 요청 status가 `PROCESSING` When 사용자가 해당 흐름을 실행하면 Then 사용자는 요청이 아직 처리 중임을 확인한다.
- **AC-03. 완료된 JSON 파일을 다운로드한다**: Given 최신 요청 status가 `COMPLETED`, `fileKey` 존재, 미만료 When 사용자가 상태를 조회하면 Then 서버가 `my-data-export.json`용 presigned GET URL을 발급하고 사용자는 외부 앱으로 연다.
- **AC-04. 내보내기 작업이 실패한다**: Given worker가 최신 요청을 FAILED로 변경 When 사용자가 다시 요청하면 Then 새 PROCESSING row가 생기고 기존 FAILED row는 보존되며 화면은 최신 row를 표시한다.
- **AC-05. 완료 파일이 자연 만료된다**: Given 최신 요청이 COMPLETED이고 `expiresAt <= now`, 관리자 expire 미실행 When public status를 조회하면 Then `downloadUrl=null`이고 status는 COMPLETED다. 관리자 expire를 실행한 경우에만 EXPIRED다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
