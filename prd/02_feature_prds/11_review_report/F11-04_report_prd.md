# F11-04. 신고 (이벤트/사용자/리뷰/클럽) PRD

<!-- updated: 2026-06-05; delta: 2026-06-04 dossier 04 §4-1 + 03 §4-D 반영 -->

> 문서 상태: **실사 기반 갱신본**. 2026-06-04 델타 dossier(04_review_moderation.md §4-1, 03_club_moderation.md §4-D)를 반영해 ReportType 전체 8값, Report 엔티티 신규 컬럼 3개, ReportParam/ReportVo 신규 필드, 증빙 첨부 및 자동 플래그 절을 추가했다. 코드 수정이나 QA 착수 전에는 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

부적절한 콘텐츠를 운영자에게 접수하는 신고 도메인. 한 개의 POST로 신고 레코드를 만들고(상태 PENDING으로 시작), 본인이 접수한 신고 이력을 조회하는 GET 하나로 구성된다. 자기-자신 신고(USER 타입 한정)와 동일 대상 중복 신고는 거부되며, `targetType`/`reason` 둘 다 enum 검증을 통과해야 한다. 운영자가 처리(`resolveReport`)하면 신고자에게 결과 알림이 푸시된다(서비스 메서드만 존재 — 컨트롤러에 사용자 입력 노출 없음).

2026-06-04 기준 서버 ReportType은 8종(USER/EVENT/REVIEW/EVENT_PHOTO/EVENT_MESSAGE/DATE_USER/CARPOOL/CLUB)이다. CLUB(7) 신고가 서버에서 지원되며 앱 배선도 완료됐다. v1에서 CLUB 대상 자동 제재는 없고 운영자 수동 집행만 동작한다. 자동 제재(계정 처리 등)는 USER 타입 전용으로 유지된다. 증빙 파일 첨부(최대 5개)와 자동 플래그(도배 자동기각 / 우선검토) 로직이 서비스 레이어에 추가됐다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 → 우상단 메뉴 "신고" → `context.push('/report', extra: {'targetType': 'EVENT', 'targetId': eventId})`
- 사용자 프로필 → "신고" 메뉴 → `targetType: 'USER'`
- 리뷰 카드(F11-02 이벤트별 모드)의 신고 아이콘 → `targetType: 'REVIEW', targetId: review.id`
- 클럽 상세 → "신고" 메뉴 → `targetType: 'CLUB', targetId: clubId` — 커밋 527b6ec(2026-06-04)에서 실배선 완료. 오너 본인 클럽은 메뉴 숨김.
- 카풀 오퍼 → `POST /api/v1/events/{eventId}/carpool/offers/{offerId}/report` — 전용 `CarpoolReportParam`(reason, description) 사용, `contextId=offerId`는 서버 자동 배선.

`ReportScreen`은 `targetType: String`, `targetId: int`, 선택적 `targetTitle`을 받는다.

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

부적절한 콘텐츠를 운영자에게 접수하는 신고 도메인. 한 개의 POST로 신고 레코드를 만들고(상태 PENDING으로 시작), 본인이 접수한 신고 이력을 조회하는 GET 하나로 구성된다. 자기-자신 신고(USER 타입 한정)와 동일 대상 중복 신고는 거부되며, `targetType`/`reason` 둘 다 enum 검증을 통과해야 한다. 운영자가 처리(`resolveReport`)하면 신고자에게 결과 알림이 푸시된다(서비스 메서드만 존재 — 컨트롤러에 사용자 입력 노출 없음).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/reports` | `ReportController#createReport` | required | 신고 INSERT (PENDING) |
| GET | `/api/v1/reports/my` | `ReportController#getMyReports` | required | 내가 접수한 신고 리스트 |
| POST | `/api/v1/events/{eventId}/carpool/offers/{offerId}/report` | `EventCarpoolController#reportCarpool` | required | 카풀 운전자 안전신고 (ReportType.CARPOOL, targetId=운전자userId, contextId=offerId 서버 자동 배선) |

### 도메인 모델 / Enum (이 기능 관련)

**Entity `Report`** (`review/model/Report.java`):

| 필드 | 타입 | 비고 |
|---|---|---|
| `id` | bigint PK | |
| `reporterId` | bigint | 신고자 userId |
| `targetType` | int | ReportType.type 코드값 |
| `targetId` | bigint | 신고 대상 id |
| `reason` | int | ReportReason.type 코드값 |
| `description` | varchar(500) | 상세 설명, nullable |
| `evidenceUrls` | json | 레거시 dead 컬럼 (`Report.java:41` 주석) — 미사용 |
| `evidence_file_ids` | json | **신규** — `List<Long>` JSON, file_metadata.id 목록 (`V1__init.sql:1510`) |
| `context_id` | bigint | **신규** — CARPOOL 신고 시 offer id 역참조 (`V1__init.sql:1510`) |
| `priority` | tinyint(1) NOT NULL DEFAULT 0 | **신규** — 우선검토 플래그 (`V1__init.sql:1511`) |
| `status` | enum | PENDING 시작. RESOLVED/DISMISSED/IN_REVIEW/ESCALATED — admin 흐름 |
| `handlerId` / `handlerNote` / `processedAt` | — | admin 처리용 |

소스: `review/model/Report.java:41-59`, `V1__init.sql:1510-1511`

**Request Body: `ReportParam`** (`review/param/ReportParam.java`):

| 필드 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `targetType` | `String` (ReportType.name()) | `@NotBlank` | |
| `targetId` | `Long` | `@NotNull` | |
| `reason` | `String` (ReportReason.name()) | `@NotBlank` | |
| `description` | `String` | `@Size(max=500)` | nullable |
| `evidenceFileIds` | `List<Long>?` | `@Size(max=5)` | **신규** — file_metadata.id 목록 |
| `contextId` | `Long?` | — | **신규** — CARPOOL 신고 시 offer id (앱 미배선 — Gap 참조) |

소스: `review/param/ReportParam.java:20-32`

**Response: `ReportVo`** (`review/vo/ReportVo.java`):

| 필드 | 타입 | nullable | 비고 |
|---|---|---|---|
| `id` | long | N | |
| `reporterId` | long | N | |
| `targetType` | String | N | |
| `targetId` | long | N | |
| `reason` | String | N | |
| `description` | String | Y | |
| `evidenceFileIds` | `List<Long>` | Y | **신규** — evidence_file_ids JSON 역직렬화 |
| `status` | String | N | |
| `processedAt` | LocalDateTime | Y | |

소스: `review/vo/ReportVo.java:18-25`

**Enum `ReportType`** (`review/constants/ReportType.java`):

| 값 | 코드 | 비고 |
|---|---|---|
| `USER` | 0 | 자동 제재 대상 (계정 처리 등) |
| `EVENT` | 1 | |
| `REVIEW` | 2 | |
| `EVENT_PHOTO` | 3 | |
| `EVENT_MESSAGE` | 4 | legal hold 매칭용 |
| `DATE_USER` | 5 | 데이트 차단 시 동시 생성하는 안전신고 (RS-002 P3-A) |
| `CARPOOL` | 6 | 카풀 운전자 안전신고 (RS-002 P3-B). targetId=운전자userId, contextId=offerId |
| `CLUB` | 7 | 클럽 단위 신고. targetId=clubId. **v1 집행 = 운영자 수동, 자동 제재 없음** |

> DDL 불일치: `V1__init.sql:1505` target_type 컬럼 COMMENT가 `0:USER 1:EVENT 2:REVIEW 3:EVENT_PHOTO 4:EVENT_MESSAGE 5:DATE_USER 6:CARPOOL`로 CLUB(7) 누락. enum 소스(`ReportType.java`)가 정답.

소스: `review/constants/ReportType.java:6-38`

**Enum `ReportReason`** (`review/constants/ReportReason.java`):
- `HARASSMENT(1)`, `INAPPROPRIATE(2)`, `NO_SHOW(3)`, `FRAUD(4)`, `OTHER(5)`, `LATE(6)`, `BAD_MANNER(7)`
- 현재 Flutter `ReportReason` enum은 서버와 정확히 일치(7개).

**Enum `ReportStatus`** (`review/constants/ReportStatus.java`):
- `PENDING`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`, `ESCALATED` — 본 기능에서는 INSERT 시 `PENDING` 고정. 다른 상태는 admin 흐름.

### 증빙 파일 첨부 (EvidenceFileValidator)

소스: `file/service/EvidenceFileValidator.java:51-88`

신고 제출 시 `evidenceFileIds`가 비어 있지 않으면 `EvidenceFileValidator.validate(ids, ownerUserId)` 호출:

1. null/empty → `List.of()` 반환 (검증 없이 통과)
2. dedup + null/0이하 id 제거 (LinkedHashSet, 순서 보존)
3. dedup 크기 > max(5) → `EVIDENCE_FILE_TOO_MANY` (400, 에러코드 1100009)
4. id별 FileMetadata 조회 실패 → `FILE_NOT_FOUND` (404)
5. `FileMetadata.userId != ownerUserId` → `EVIDENCE_FILE_NOT_OWNED` (403, 1100007)
6. `FileMetadata.fileStatus != COMPLETED` → `EVIDENCE_FILE_INVALID` (400, 1100008)
7. `FilePurpose ∉ {EVIDENCE, REVIEW}` → `EVIDENCE_FILE_INVALID` (400, 1100008)

### 자동 플래그 로직

소스: `review/service/ReportService.java:42-55, 86-130`

**dedup 키:**
- `contextId` 있을 때(CARPOOL): `(reporterId, targetType, targetId, contextId)` 4-key dedup → 동일 카풀 오퍼 재신고 허용
- `contextId` 없을 때: `(reporterId, targetType, targetId)` 3-key dedup (기존 동작 하위호환)

**도배 자동기각:** `SPAM_THRESHOLD_PER_WEEK = 5` — 동일 신고자 1주 5건 이상이면 즉시 `status=DISMISSED`, `handlerNote="AUTO_DISMISSED: 신고자 1주 5건 초과 (도배 의심)"` 저장. 실제 운영자 큐에 적재되지 않음.

**우선검토 플래그:** `PRIORITY_DISTINCT_REPORTER_THRESHOLD = 3` — 동일 피신고 대상에 1개월 내 서로 다른 신고자 3명 이상이면 `priority=true` 자동 설정. 운영자 큐에서 우선 노출됨.

### 의존 단위 / 외부 시스템

- **F11-05**: `PenaltyScoreCalculator`가 `RESOLVED`/`ESCALATED` 상태의 신고 수로 패널티 점수를 산정. 본 기능의 INSERT 자체는 신뢰점수에 즉시 영향 없음(운영자 처리 후에만 영향).
- **F11-07**: 임시 숨김(`ReviewHideParam.autoEscalate=true`) 시 서버가 `ReportType.REVIEW` 신고를 자동 생성. 이 자동 생성 레코드도 동일 ReportService.createReport 경로를 탄다.
- **Notification 도메인**: `resolveReport` 시 `REPORT_RESOLVED` 알림 발송 (admin 흐름).
- **EvidenceFileValidator** (`file/service/EvidenceFileValidator.java`): 파일 소유권·상태·용도 공통 검증 서비스.
- 외부 시스템: 없음. (운영자 검토는 `community_admin_api`로 이관됨.)

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 → 우상단 메뉴 "신고" → `context.push('/report', extra: {'targetType': 'EVENT', 'targetId': eventId})`
- 사용자 프로필 → "신고" 메뉴 → `targetType: 'USER'`
- 리뷰 카드(F11-02 이벤트별 모드)의 신고 아이콘 → `targetType: 'REVIEW', targetId: review.id`
- 클럽 상세 → "신고" 메뉴 → `targetType: 'CLUB', targetId: clubId` — 커밋 527b6ec(2026-06-04) 실배선 완료. 오너 본인 클럽은 `myRole == ClubRole.owner` 조건으로 메뉴 숨김. (`club_detail_screen.dart:582-599`)
- 카풀 오퍼 → `Routes.eventCarpoolReport` → `carpool_report_screen.dart` → `CarpoolReportParam(reason, description)` → `EventCarpoolApi.reportCarpool(eventId, offerId, param)` (`event_carpool_api.dart:13`)

`ReportScreen`은 `targetType: String`, `targetId: int`, 선택적 `targetTitle`을 받는다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | 라우트 상수 | Screen 파일 | 역할 |
|---|---|---|---|
| `/report` (extra로 인자 전달) | `Routes.report` (`core/router/routes.dart:171`) | `presentation/review/screens/report_screen.dart` | 신고 유형 선택 + 상세 사유 입력 + 제출 |

### 증빙 첨부 UI (EvidenceImagePicker)

소스: `community_app/lib/presentation/common/media/evidence_image_picker.dart`

신고 화면 내에 증빙 이미지 첨부 영역:
- 갤러리 → `ImagePicker.pickImage` → `ImageUploadHelper.uploadImageFileWithId(purpose=EVIDENCE)` → S3 PUT + complete → fileId 수집
- `onChanged(List<int>)` 콜백으로 부모에 전달 → `ReportParam.evidenceFileIds` 바인딩
- 업로드 중 `onUploadingChanged(true)` → `_isUploadingEvidence=true` → 제출 버튼 비활성
- 최대 5개 (서버 `@Size(max=5)`와 동일)

소스: `report_screen.dart:45-48, 400-408` — `_evidenceFileIds: List<int>`, `_isUploadingEvidence: bool`

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

- `targetType` 라벨 매핑: `EVENT→"이벤트"`, `USER→"사용자"`, `REVIEW→"리뷰"`, `CLUB→"클럽"`, `CARPOOL→"카풀"`, 그 외 `"콘텐츠"` 폴백
- `ReportReason` 7개 한국어 라벨 (`Flutter ReportReason.label`) 매핑
- 라디오 UI(원형 보더 + 선택 시 흰 점) — Flutter에는 표준 `RadioGroup`이 없으므로 자체 위젯
- `OTHER` 선택 시 description 필수 + 10자 이상 정책 (서버는 별도 검증 없음 — 서버는 `description`을 옵션으로만 처리)
- 성공 시 풀스크린 알럿 → 단순 닫기로 이전 화면 복귀
- 신고 사유 7개 노출 순서(현재 enum 정의 순서: HARASSMENT/INAPPROPRIATE/NO_SHOW/FRAUD/OTHER/LATE/BAD_MANNER) — UI 스펙 표(SCR-RR-003)와 다름
- CLUB 신고 진입은 클럽 상세에서 실배선 완료(527b6ec, 2026-06-04). 오너 본인은 메뉴 숨김.
- description 최대 500자(클라/서버 일치) — `report_screen.dart` `maxLength: 500` ↔ 서버 `ReportParam.java` `@Size(max = 500)`
- 댄저 색상 버튼(`ButtonVariant.danger`)으로 행동 강조

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 리뷰 신고 (Happy Path · `targetType=REVIEW`) | 로그인됨, F11-02 이벤트 리뷰 목록에서 카드를 발견. | `report` 1건 PENDING, 운영자 큐에 적재. |
| S2 | 본인 신고 시도 (`targetType=USER && targetId=내 userId`) | 진입 시 `targetType="USER"`, `targetId=loginUser.userId`. | INSERT 없음. |
| S3 | 동일 대상 중복 신고 | `report` 테이블에 `(reporterId, targetType, targetId)` 동일 행 존재. | INSERT 없음. |
| S4 | "기타" 사유 선택 + 짧은 설명 | 입력 단계. | 충분한 설명 입력 후 정상 흐름(S1)으로 진행. 그 전에는 제출 차단. |
| S5 | 클럽 신고 (서버 지원 v1) | `targetType="CLUB"`로 화면 진입. 클럽 상세에서 "신고" 진입 (오너 본인은 메뉴 숨김). | INSERT 1건 PENDING. 운영자 수동 처리. 자동 제재 없음. |
| S6 | 대상 없음 (이미 삭제된 리뷰 신고 시도) | 해당 리뷰가 다른 경로로 soft delete됨. | 일반적으로 INSERT 성공. (운영자 검토 시 무효 처리될 수 있음.) |
| S7 | 도배 신고 자동기각 | 신고자가 1주 내 5건 이상 신고 시도. | `status=DISMISSED` 자동 저장. 운영자 큐 미적재. |
| S8 | 우선검토 플래그 | 동일 피신고 대상에 1개월 내 3명 이상 별도 신고자가 누적됨. | `priority=true`. 운영자 큐에서 상단 노출. |
| S9 | 증빙 파일 소유권 불일치 | 다른 사용자가 업로드한 fileId를 evidenceFileIds에 포함. | `EVIDENCE_FILE_NOT_OWNED` (403, 1100007). |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| CLOSED | CLUB 신고 서버 미지원 | 커밋 2d28572 (2026-06-04) `ReportType.CLUB(7)` 서버 추가, 527b6ec 앱 실배선 완료 | 해소됨 — v1 운영자 수동 집행. 자동 제재 없음. | — |
| Gap | `ReportParam.contextId` 앱 미배선 | `report_param.dart`에 `contextId` 필드 없음. 서버 `ReportParam.contextId(Long?)` 존재. | CARPOOL 신고는 전용 `CarpoolReportParam`(carpool_report_param.dart)으로 처리하므로 report_screen 경로에서는 contextId 불필요. 단, 다른 신고 경로에서 contextId가 필요한 경우 Flutter 모델 추가 필요. | 현재는 영향 없음. carpool_report_screen이 별도 전용 경로를 타므로 누락 없음. |
| Gap | DDL 주석 불일치 | `V1__init.sql:1505` target_type COMMENT에 CLUB(7) 누락 | enum 소스 기준이 정답이므로 런타임 영향 없으나 DB 문서 정합성 훼손 | V1__init.sql COMMENT 갱신 |
| Risk | `OTHER` description 클라이언트 10자 강제 — 서버 미검증 | `report_screen.dart` `_selectedReason == OTHER → description.trim().length >= 10` | 클라이언트 우회 시 서버는 빈 description으로 저장. 운영자 처리 시 사유 파악 불가. | 서버에서 `OTHER` 선택 시 description 최소 길이 검증 추가 검토 |
| Info | CLUB 신고 v1 운영자 수동 처리 안내 미노출 | `report_screen.dart`에 "v1 운영자 검토 안내" 문구 없음 | 사용자가 신고 결과를 언제 받을지 예측 불가 | 앱 ReportScreen에 CLUB 대상 시 "v1 운영자 검토" 안내 추가 여부 결정 |

## 9. 수용 기준

- **AC-01. 리뷰 신고 (Happy Path · `targetType=REVIEW`)**: Given 로그인됨, F11-02 이벤트 리뷰 목록에서 카드를 발견. When 사용자가 해당 흐름을 실행하면 Then `report` 1건 PENDING, 운영자 큐에 적재.
- **AC-02. 본인 신고 시도 (`targetType=USER && targetId=내 userId`)**: Given `targetType="USER"`, `targetId=loginUser.userId`. When 제출하면 Then INSERT 없음.
- **AC-03. 동일 대상 중복 신고**: Given `report` 테이블에 `(reporterId, targetType, targetId)` 동일 행 존재. When 제출하면 Then INSERT 없음.
- **AC-04. "기타" 사유 선택 + 짧은 설명**: Given 입력 단계. When description 10자 미만이면 Then 제출 버튼 비활성. description 10자 이상 입력 후 정상 제출.
- **AC-05. 클럽 신고 (서버 지원 v1)**: Given 클럽 상세에서 신고 진입(오너 본인 제외). When 사유 선택 후 제출하면 Then `report` 1건 PENDING INSERT. 운영자 수동 처리 대기.
- **AC-06. 대상 없음 (이미 삭제된 리뷰 신고)**: Given 해당 리뷰 soft delete됨. When 제출하면 Then INSERT 성공 (운영자 검토 시 무효 처리).
- **AC-07. 도배 자동기각**: Given 신고자가 1주 내 5번째 신고 시도. When 제출하면 Then `status=DISMISSED` 저장, 운영자 큐 미적재. 사용자에게는 성공 다이얼로그 표시(클라이언트는 서버 응답만 본다).
- **AC-08. 증빙 파일 소유권 불일치**: Given 다른 사용자 업로드 fileId 포함. When 제출하면 Then 403 `EVIDENCE_FILE_NOT_OWNED` 반환.
- **AC-09. 증빙 파일 5개 초과**: Given 6개 이상 fileId. When 제출하면 Then 400 `EVIDENCE_FILE_TOO_MANY` 반환.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
