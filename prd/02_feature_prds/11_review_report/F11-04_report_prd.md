# F11-04. 신고 (이벤트/사용자/리뷰/클럽) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/11_review_report/F11-04_report -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/11_review_report/F11-04_report`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

부적절한 콘텐츠를 운영자에게 접수하는 신고 도메인. 한 개의 POST로 신고 레코드를 만들고(상태 PENDING으로 시작), 본인이 접수한 신고 이력을 조회하는 GET 하나로 단순하게 구성된다. 자기-자신 신고(USER 타입 한정)와 동일 대상 중복 신고는 거부되며, `targetType`/`reason` 둘 다 enum 검증을 통과해야 한다. 운영자가 처리(`resolveReport`)하면 신고자에게 결과 알림이 푸시된다(서비스 메서드만 존재 — 컨트롤러에 사용자 입력 노출 없음).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 → 우상단 메뉴 "신고" → `context.push('/report', extra: {'targetType': 'EVENT', 'targetId': eventId})`
- 사용자 프로필 → "신고" 메뉴 → `targetType: 'USER'`
- 리뷰 카드(F11-02 이벤트별 모드)의 신고 아이콘 → `targetType: 'REVIEW', targetId: review.id`
- 클럽 상세 → "신고" 메뉴 → `targetType: 'CLUB'` (UI 라벨 "클럽"은 매핑되지만 서버 `ReportType` enum에 `CLUB`이 없으므로 제출 시 400 발생 — 현 시점 서버 미지원)

`ReportScreen`은 `targetType: String`, `targetId: int`, 선택적 `targetTitle`을 받는다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/11_review_report/F11-04_report/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/11_review_report/F11-04_report/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/11_review_report/F11-04_report/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/11_review_report/F11-04_report/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/review/controller/ReportController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/ReportController.java:35` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시: 별도 API 호출 없음. 입력 폼만 노출.
2. "신고" 탭 시: `reportNotifierProvider.notifier.submitReport(ReportParam(targetType, targetId, reason: enum.value, description))` (`presentation/review/screens/report_screen.dart:76-86`)
   → `ReviewRepository.createReport(ReportParam)`
   → `ReviewApi.createReport` (`POST /api/v1/reports`)
   → 성공: `Result.success(ReportVo)` → state = `AsyncData(reportVo)` → 알럿 + 닫기
   → 실패: `Result.failure(ApiError)` → `_handleError` 분기

> 본인 신고 이력 조회(`GET /api/v1/reports/my`)는 Repository에 `getMyReports()` 메서드로 구현되어 있으나 본 단위 화면에서 직접 호출하지 않음. 마이페이지/설정 화면 등에서 활용 가능.

## 4. 서버 계약

### 개요

부적절한 콘텐츠를 운영자에게 접수하는 신고 도메인. 한 개의 POST로 신고 레코드를 만들고(상태 PENDING으로 시작), 본인이 접수한 신고 이력을 조회하는 GET 하나로 단순하게 구성된다. 자기-자신 신고(USER 타입 한정)와 동일 대상 중복 신고는 거부되며, `targetType`/`reason` 둘 다 enum 검증을 통과해야 한다. 운영자가 처리(`resolveReport`)하면 신고자에게 결과 알림이 푸시된다(서비스 메서드만 존재 — 컨트롤러에 사용자 입력 노출 없음).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/reports` | `ReportController#createReport` | required | 신고 INSERT (PENDING) |
| GET | `/api/v1/reports/my` | `ReportController#getMyReports` | required | 내가 접수한 신고 리스트 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `Report` (`review/model/Report.java`): `id`, `reporterId`, `targetType:int`, `targetId`, `reason:int`, `description`, `evidenceUrls:JSON`(미사용), `status:enum`, `handlerId`, `handlerNote`, `processedAt`, audit timestamps.
- **Enum `ReportType`** (`review/constants/ReportType.java`):
  - `USER(0)`, `EVENT(1)`, `REVIEW(2)`
  - **주의**: 클라이언트 UI 스펙은 `CLUB`도 표기하지만 서버 enum에 `CLUB`은 없다. 즉 클럽 신고는 현재 서버에서 미지원이며 `targetType="CLUB"` 전송 시 `REPORT_INVALID_TARGET`.
- **Enum `ReportReason`** (`review/constants/ReportReason.java`):
  - `HARASSMENT(1)`, `INAPPROPRIATE(2)`, `NO_SHOW(3)`, `FRAUD(4)`, `OTHER(5)`, `LATE(6)`, `BAD_MANNER(7)`
  - **주의**: 클라이언트는 `INAPPROPRIATE_CONTENT`/`SPAM`/`FALSE_INFORMATION`도 노출(UI 스펙) 또는 사용 시도 가능하지만 서버 enum 기준은 위 7개만이다. 현재 Flutter `ReportReason` enum은 서버와 정확히 일치(7개).
- **Enum `ReportStatus`** (`review/constants/ReportStatus.java`):
  - `PENDING`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`, `ESCALATED` — 본 기능에서는 INSERT 시 `PENDING` 고정. 다른 상태는 admin 흐름.

### 의존 단위 / 외부 시스템

- **F11-05**: `PenaltyScoreCalculator`가 `RESOLVED`/`ESCALATED` 상태의 신고 수를 가지고 패널티 점수를 산정하므로 본 기능의 데이터가 신뢰점수에 간접적으로 영향. 단, 본 기능 자체의 INSERT는 신뢰점수에 즉시 영향 없음(처리 후에만 영향).
- **Notification 도메인**: `resolveReport` 시 `REPORT_RESOLVED` 알림 발송 (admin 흐름 — 본 단위 사용자용 컨트롤러에는 호출 경로 없음).
- 외부 시스템: 없음. (운영자 검토는 admin API 단위에서 별도 처리 → `community_admin_api`로 이관됨.)

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 → 우상단 메뉴 "신고" → `context.push('/report', extra: {'targetType': 'EVENT', 'targetId': eventId})`
- 사용자 프로필 → "신고" 메뉴 → `targetType: 'USER'`
- 리뷰 카드(F11-02 이벤트별 모드)의 신고 아이콘 → `targetType: 'REVIEW', targetId: review.id`
- 클럽 상세 → "신고" 메뉴 → `targetType: 'CLUB'` (UI 라벨 "클럽"은 매핑되지만 서버 `ReportType` enum에 `CLUB`이 없으므로 제출 시 400 발생 — 현 시점 서버 미지원)

`ReportScreen`은 `targetType: String`, `targetId: int`, 선택적 `targetTitle`을 받는다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | 라우트 상수 | Screen 파일 | 역할 |
|---|---|---|---|
| `/report` (extra로 인자 전달) | `Routes.report` (`core/router/routes.dart:171`) | `presentation/review/screens/report_screen.dart` | 신고 유형 선택 + 상세 사유 입력 + 제출 |

### 화면별 구성 요소 & 액션

### 신고하기 (`report_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '신고하기')`
  - 대상 정보 카드: 좌측 라벨 배지(`AppColors.primary500` 배경, 흰색 텍스트, "이벤트"/"사용자"/"리뷰"/"클럽"/"콘텐츠") + 우측 `targetTitle` 또는 "$_targetTypeLabel 신고"
  - "신고 유형" 섹션: `ReportReason.values` 7개를 라디오 리스트(원형 보더 + 선택 시 안에 작은 흰 점, primary500 배경)로 노출. 각 항목은 `reason.label`("괴롭힘/협박", "부적절한 콘텐츠", "노쇼", "사기/사칭", "기타", "지각", "나쁜 매너")
  - "상세 설명 ("기타" 선택 시 "필수", 외에는 "선택")" 라벨 + `AppTextArea(maxLength: 500, showCharCount: true, minLines: 3, maxLines: 6)` placeholder "상세한 신고 사유를 입력해주세요" (서버 `ReportParam.description @Size(max=500)` 와 일치 — 11차-B 적용)
  - 인라인 에러: `OTHER` 선택 + 입력 1자 이상 + 10자 미만일 때 "신고 사유를 10자 이상 입력해주세요" (error500)
  - `bottomNavigationBar`: `AppButton(label: '신고', variant: ButtonVariant.danger, size: ButtonSize.lg, fullWidth: true, disabled: !_isValid, loading: _isSubmitting)` (SafeArea + screenPadding)
- **사용자가 할 수 있는 액션**:
  - 라디오 항목 탭 → `_selectedReason = reason` (단일 선택)
  - 텍스트 입력
  - "신고" 탭 → `_submit()` → `reportNotifier.submitReport(ReportParam)` → `POST /api/v1/reports`
- **유효성**:
  - `_selectedReason == null` → 버튼 비활성
  - `_selectedReason == OTHER` → `description.trim().length >= 10` 필요
  - 그 외 → 사유 선택만으로 활성
- **상태 분기 (제출 결과)**:
  | 케이스 | 처리 |
  |---|---|
  | 성공(201) | `AppDialog.alert("신고 접수 완료", "검토 후 적절한 조치를 취하겠습니다.", "확인")` → `_closeScreen()`(canPop ? pop : `context.go('/')`) |
  | 400 badRequest (`INVALID_INPUT` — 자기 신고) | 토스트 "본인을 신고할 수 없습니다" + `_closeScreen()` (12차-A1) |
  | 400 badRequest (`REPORT_INVALID_TARGET` — 잘못된 targetType/reason enum) | 토스트 "신고 대상이 올바르지 않습니다" + `_closeScreen()` (12차-A1) |
  | 400 badRequest (default — Bean Validation 등) | 토스트 (서버 message 또는 "신고 처리에 실패했습니다") + 화면 유지 (사용자 재시도 가능) (12차-A1) |
  | 401 unauthorized | 토스트 "로그인이 필요합니다" |
  | 403 forbidden | 토스트 (서버 메시지 또는 "권한이 없습니다") |
  | 404 notFound (`REPORT_NOT_FOUND` — `resolveReport` 의 reportId 부재) | 토스트 "신고 대상을 찾을 수 없습니다" + `_closeScreen()` |
  | 409 conflict (`REPORT_ALREADY_EXISTS`) | 토스트 "이미 신고한 대상입니다" + `_closeScreen()` |
  | 422 unprocessable | 토스트 (서버 메시지 또는 "처리할 수 없는 요청입니다") |
  | 429 rateLimited | 토스트 "잠시 후 다시 시도해주세요" |
  | 500 serverError | 토스트 "서버 오류가 발생했습니다" |
  | networkError | 토스트 "인터넷 연결을 확인해주세요" |

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시: 별도 API 호출 없음. 입력 폼만 노출.
2. "신고" 탭 시: `reportNotifierProvider.notifier.submitReport(ReportParam(targetType, targetId, reason: enum.value, description))` (`presentation/review/screens/report_screen.dart:76-86`)
   → `ReviewRepository.createReport(ReportParam)`
   → `ReviewApi.createReport` (`POST /api/v1/reports`)
   → 성공: `Result.success(ReportVo)` → state = `AsyncData(reportVo)` → 알럿 + 닫기
   → 실패: `Result.failure(ApiError)` → `_handleError` 분기

> 본인 신고 이력 조회(`GET /api/v1/reports/my`)는 Repository에 `getMyReports()` 메서드로 구현되어 있으나 본 단위 화면에서 직접 호출하지 않음. 마이페이지/설정 화면 등에서 활용 가능.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- `targetType` 라벨 매핑: `EVENT→"이벤트"`, `USER→"사용자"`, `REVIEW→"리뷰"`, `CLUB→"클럽"`(UI 라벨만, 서버 미지원), 그 외 `"콘텐츠"` 폴백
- `ReportReason` 7개 한국어 라벨 (`Flutter ReportReason.label`) 매핑
- 라디오 UI(원형 보더 + 선택 시 흰 점) — Flutter에는 표준 `RadioGroup`이 없으므로 자체 위젯
- `OTHER` 선택 시 description 필수 + 10자 이상 정책 (서버는 별도 검증 없음 — 서버는 `description`을 옵션으로만 처리)
- 성공 시 풀스크린 알럿 → 단순 닫기로 이전 화면 복귀
- 신고 사유 7개 노출 순서(현재 enum 정의 순서: HARASSMENT/INAPPROPRIATE/NO_SHOW/FRAUD/OTHER/LATE/BAD_MANNER) — UI 스펙 표(SCR-RR-003)와 다름
- 클럽 신고는 서버 미지원이지만 UI 라벨 매핑은 존재 → 호출 시 400 발생 (현재 Flutter UI에서 클럽 진입 경로는 활성화되어야 함을 가정한 표시 — 실제 클럽 상세에서 호출 시 토스트로 노출)
- description 최대 500자(클라/서버 일치) — 11차-B 라운드에서 옵션 A 적용으로 클라 1000 → 500 정정 완료. `report_screen.dart:341` `maxLength: 500` ↔ 서버 `ReportParam.java:14` `@Size(max = 500)`. (11차-B 시점 라인은 320이었으나 12차-A1 의 `_handleError` errorCode 분기 추가로 라인이 이동됨.)
- 댄저 색상 버튼(`ButtonVariant.danger`)으로 행동 강조

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 리뷰 신고 (Happy Path · `targetType=REVIEW`) | 로그인됨, F11-02 이벤트 리뷰 목록에서 카드를 발견. | `report` 1건 PENDING, 운영자 큐에 적재. |
| S2 | 본인 신고 시도 (`targetType=USER && targetId=내 userId`) | 진입 시 `targetType="USER"`, `targetId=loginUser.userId`. | INSERT 없음. |
| S3 | 동일 대상 중복 신고 | `report` 테이블에 `(reporterId, targetType, targetId)` 동일 행 존재. | INSERT 없음. |
| S4 | "기타" 사유 선택 + 짧은 설명 | 입력 단계. | 충분한 설명 입력 후 정상 흐름(S1)으로 진행. 그 전에는 제출 차단. |
| S5 | 클럽 신고 시도 (서버 미지원) | `targetType="CLUB"`로 화면 진입. | INSERT 없음. (서버 정책상 CLUB 신고 미지원 — 클라이언트는 errorCode 기반으로 정확한 메시지 노출. 향후 서버에 `CLUB` 추가 또는 클라이언트 진입 봉쇄는 별개 작업.) |
| S6 | 대상 없음 (이미 삭제된 리뷰 신고 시도) | 해당 리뷰가 다른 경로로 soft delete됨. | 일반적으로 INSERT 성공. (운영자 검토 시 무효 처리될 수 있음.) |

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
| 후보 | backend.md:77 | - **주의**: 클라이언트 UI 스펙은 `CLUB`도 표기하지만 서버 enum에 `CLUB`은 없다. 즉 클럽 신고는 현재 서버에서 미지원이며 `targetType="CLUB"` 전송 시 `REPORT_INVALID_TARGET`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:80 | - **주의**: 클라이언트는 `INAPPROPRIATE_CONTENT`/`SPAM`/`FALSE_INFORMATION`도 노출(UI 스펙) 또는 사용 시도 가능하지만 서버 enum 기준은 위 7개만이다. 현재 Flutter `ReportReason` enum은 서버와 정확히 일치(7개). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:69 | - `OTHER` 선택 시 description 필수 + 10자 이상 정책 (서버는 별도 검증 없음 — 서버는 `description`을 옵션으로만 처리) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 리뷰 신고 (Happy Path · `targetType=REVIEW`)**: Given 로그인됨, F11-02 이벤트 리뷰 목록에서 카드를 발견. When 사용자가 해당 흐름을 실행하면 Then `report` 1건 PENDING, 운영자 큐에 적재.
- **AC-02. 본인 신고 시도 (`targetType=USER && targetId=내 userId`)**: Given 진입 시 `targetType="USER"`, `targetId=loginUser.userId`. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-03. 동일 대상 중복 신고**: Given `report` 테이블에 `(reporterId, targetType, targetId)` 동일 행 존재. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-04. "기타" 사유 선택 + 짧은 설명**: Given 입력 단계. When 사용자가 해당 흐름을 실행하면 Then 충분한 설명 입력 후 정상 흐름(S1)으로 진행. 그 전에는 제출 차단.
- **AC-05. 클럽 신고 시도 (서버 미지원)**: Given `targetType="CLUB"`로 화면 진입. When 사용자가 해당 흐름을 실행하면 Then INSERT 없음. (서버 정책상 CLUB 신고 미지원 — 클라이언트는 errorCode 기반으로 정확한 메시지 노출. 향후 서버에 `CLUB` 추가 또는 클라이언트 진입 봉쇄는 별개 작업.)
- **AC-06. 대상 없음 (이미 삭제된 리뷰 신고 시도)**: Given 해당 리뷰가 다른 경로로 soft delete됨. When 사용자가 해당 흐름을 실행하면 Then 일반적으로 INSERT 성공. (운영자 검토 시 무효 처리될 수 있음.)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
