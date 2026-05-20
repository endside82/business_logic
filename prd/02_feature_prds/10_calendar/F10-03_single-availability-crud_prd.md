# F10-03. 단일 가용 시간 등록·수정·삭제 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/10_calendar/F10-03_single-availability-crud -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/10_calendar/F10-03_single-availability-crud`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 비어 있는 시간 슬롯을 명시적으로 등록(POST)하고, 잘못 등록한 슬롯을 수정(PATCH)하거나 삭제(DELETE)할 수 있게 하는 단일 가용성 CRUD다. 등록·수정 시 같은 사용자 내 시간 겹침을 서버에서 검증하고, 삭제 시 해당 슬롯과 시간이 겹치는 OPEN/DRAFT 이벤트가 있으면 1차 호출에서는 미삭제 + 충돌 카운트만 반환해 사용자에게 강제 삭제 여부를 묻도록 설계됐다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **월간 캘린더 우상단 `+` 아이콘 탭** → `/profile/calendar/availability` (신규 등록 모드, 날짜 = 오늘 기본).
- **일간 캘린더 FAB 탭** → `/profile/calendar/availability?date=YYYY-MM-DD` (해당 일자 사전 채움).
- **일간 캘린더 가용성 블록 탭** (F10-02 라우팅) → `/profile/calendar/availability?id={id}` (편집 모드).

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/10_calendar/F10-03_single-availability-crud/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/10_calendar/F10-03_single-availability-crud/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/10_calendar/F10-03_single-availability-crud/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/10_calendar/F10-03_single-availability-crud/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:34` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:42` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:59` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:67` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:76` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **편집 모드 진입**:
   - `_loadExisting()` → `availabilityDetailNotifierProvider(id).future` → `AvailabilityRepository.getAvailability(id)` → `GET /api/v1/availability/{id}` → 폼 사전 채움.
2. **저장 (신규, 단일)**:
   - `availabilityDetailNotifierProvider(0).notifier.createAvailability(param)` → Repository → `POST /api/v1/availability`.
3. **저장 (편집)**:
   - `.notifier.updateAvailability(id, param)` → `PATCH /api/v1/availability/{id}`.
   - 성공 시 `state = AsyncData(data)`로 자체 갱신.
4. **삭제 (1차)**:
   - `.notifier.deleteAvailability(id, force: false)` → `DELETE /api/v1/availability/{id}?force=false`.
5. **삭제 (강제, 충돌 시)**:
   - `.notifier.deleteAvailability(id, force: true)` → `DELETE /api/v1/availability/{id}?force=true`.
6. **신규 + 반복 ON**:
   - F10-04의 `recurringRuleNotifierProvider.notifier.createRule(param)` → `POST /api/v1/availability/recurring`.

## 4. 서버 계약

### 개요

사용자가 비어 있는 시간 슬롯을 명시적으로 등록(POST)하고, 잘못 등록한 슬롯을 수정(PATCH)하거나 삭제(DELETE)할 수 있게 하는 단일 가용성 CRUD다. 등록·수정 시 같은 사용자 내 시간 겹침을 서버에서 검증하고, 삭제 시 해당 슬롯과 시간이 겹치는 OPEN/DRAFT 이벤트가 있으면 1차 호출에서는 미삭제 + 충돌 카운트만 반환해 사용자에게 강제 삭제 여부를 묻도록 설계됐다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/availability | `AvailabilityController#createAvailability` | required | 단일 슬롯 생성(겹침/지속시간/시간대 검증) |
| GET | /api/v1/availability | `AvailabilityController#getAvailabilities` | required | 본인 가용성 목록(기간 + includeRecurring 필터) |
| GET | /api/v1/availability/{id} | `AvailabilityController#getAvailability` | required | 단건 조회(본인 소유 검증) |
| PATCH | /api/v1/availability/{id} | `AvailabilityController#updateAvailability` | required | 단건 수정(겹침/지속시간/시간대 재검증) |
| DELETE | /api/v1/availability/{id}?force={bool} | `AvailabilityController#deleteAvailability` | required | 충돌 OPEN/DRAFT 이벤트 검사 후 (force) 삭제 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `Availability` (`...calendar/model/Availability.java`):
  - `id, userId, title, startTime: LocalDateTime, endTime: LocalDateTime, timezone, isRecurring: boolean, recurrenceRuleId: Long?, visibility: Visibility, createdAt, updatedAt`
  - `@Convert(VisibilityConverter)`로 INT 컬럼과 매핑 (PUBLIC=0, FRIENDS=1, PRIVATE=2).
- **Enum** `Visibility`: `PUBLIC(0), FRIENDS(1), PRIVATE(2)`.
- **Validator** `ValidDuration` — 30~480분, 30분 단위.
- 충돌 검사 대상 `EventStatus`: `OPEN`, `DRAFT` (Unit 03 enum).

### 의존 단위 / 외부 시스템

- **Unit 03 이벤트**: 삭제 시 충돌 검사를 위해 `EventRepository` 호출.
- **자기 도메인**: `AvailabilityQueryRepository.existsOverlap`.
- 외부 시스템(PG/FCM/S3/소셜) 호출 없음.
- F10-04(반복 규칙)와는 같은 `availability` 테이블을 공유하지만 단일 CRUD에서는 `isRecurring=false`만 다룸.

## 5. 프론트 계약

### 진입 경로

- **월간 캘린더 우상단 `+` 아이콘 탭** → `/profile/calendar/availability` (신규 등록 모드, 날짜 = 오늘 기본).
- **일간 캘린더 FAB 탭** → `/profile/calendar/availability?date=YYYY-MM-DD` (해당 일자 사전 채움).
- **일간 캘린더 가용성 블록 탭** (F10-02 라우팅) → `/profile/calendar/availability?id={id}` (편집 모드).

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/profile/calendar/availability` | `screens/availability_screen.dart` | 신규 등록 모드 |
| `/profile/calendar/availability?id={id}` | 동일 파일 | 편집 모드 (`availabilityId != null`) |
| `/profile/calendar/availability?date={YYYY-MM-DD}` | 동일 파일 | 신규 등록, 날짜 사전 채움 |

### 화면별 구성 요소 & 액션

### 가용 시간 설정 (`availability_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` 타이틀: 신규=`"가용 시간 설정"`, 편집=`"가용 시간 수정"`.
  - 편집 모드에서 우측 상단 `삭제` 텍스트 버튼(`AppColors.error500`).
  - 입력 폼 (`SingleChildScrollView`, padding `AppSpacing.space5`):
    - **제목 (선택)**: `TextField`, hint `"예: 점심시간 가용"`, 라운드 12dp.
    - **날짜**: 탭 시 `showDatePicker` (firstDate=today, lastDate=+365일). 표기 `YYYY년 M월 D일`.
    - **시간 범위**: 좌(시작)/우(종료) `_TimePickerField` 두 개, 중앙 `~`. `showTimePicker` 30분 단위 의도(서버 검증과 일치).
    - **지속시간 라벨** (`_buildDurationLabel`): 정상 시 primary500 알파 0.1 배경 + ⏱️ "X시간 Y분", 30분 미만/0 이하면 빨간 안내 텍스트.
    - **충돌 경고 배너** (`_showConflictWarning`): 노란 배경 + ⚠️ + "선택한 시간이 기존 가용 시간과 겹칩니다.\n시간을 조정해주세요." (서버 OVERLAP 응답 시 노출).
    - **공개 설정 Switch**: PUBLIC ↔ PRIVATE (UI는 2분기, 서버는 FRIENDS도 받지만 화면 토글로는 노출하지 않음).
    - **반복 설정 Switch** (신규 모드만): on이면 인라인 요일 선택(`MON…SUN` 풀네임) 노출. on + 요일 0개면 빨간 경고 텍스트.
  - 하단 sticky `AppButton` `"저장"` (primary, fullWidth, loading=`_isLoading`, disabled=`!_isValid`).
- **사용자가 할 수 있는 액션**:
  - 제목 입력 (선택).
  - 날짜/시작/종료 시간 선택.
  - 공개 토글, 반복 토글.
  - **저장** ▶ `_save()`:
    - 신규 + 반복 OFF: `AvailabilityParam(title, startDateTime, endDateTime, timezone='Asia/Seoul', visibility)` → `availabilityDetailNotifierProvider(0).notifier.createAvailability(param)` → `POST /api/v1/availability` → 성공 시 `AppToast.show(..., '가용 시간이 등록되었습니다')` + `context.pop()`.
    - 편집: `availabilityDetailNotifierProvider(id).notifier.updateAvailability(id, param)` → `PATCH /api/v1/availability/{id}` → 토스트 `"가용 시간이 수정되었습니다"` + pop.
    - 신규 + 반복 ON: `RecurringParam(daysOfWeek=[…풀네임], startTime="HH:mm", endTime="HH:mm", timezone, effectiveFrom=YYYY-MM-DD, visibility)` → `recurringRuleNotifierProvider.notifier.createRule(param)` → `POST /api/v1/availability/recurring` (F10-04 흐름) → 토스트 `"반복 가용 시간이 등록되었습니다"` + pop.
    - 에러 처리: `ApiError.badRequest`이고 `message?.contains('OVERLAP') == true`면 `_showConflictWarning = true` setState. 그 외 badRequest/일반 에러는 `AppToast(error)`로 표시.
  - **삭제** (편집 모드만) ▶ `_confirmDelete`:
    1. `AlertDialog`("이 가용 시간을 삭제하시겠습니까?") → 취소/삭제.
    2. 삭제 확인 시 `availabilityDetailNotifierProvider(id).notifier.deleteAvailability(id)` → `DELETE /api/v1/availability/{id}?force=false`.
    3. `result.deleted == true` → 토스트 `"가용 시간이 삭제되었습니다"` + pop.
    4. `result.deleted == false && conflictingEventCount > 0` → 2차 `AlertDialog`("이 가용 시간과 겹치는 이벤트가 N건 있습니다.\n그래도 삭제하시겠습니까?") → 확인 시 `force=true` 재호출 → 토스트 + pop.
    5. API 자체 실패 → 토스트 `"삭제에 실패했습니다"` (error).
- **상태 분기**:
  - 로딩: 저장 시 버튼 `loading=true` 회전 인디케이터.
  - 에러: 충돌 배너 또는 `AppToast(error)`.
  - 성공: 토스트 + `context.pop()`로 이전 화면 복귀.
- **모달/시트/네비게이션**:
  - `showDatePicker`, `showTimePicker` (Material 기본).
  - 삭제 확인 / 충돌 확인 `AlertDialog`.
  - 푸시 only, 결과 반환 후 pop.

### API 호출 순서 (Provider/Repository 관점)

1. **편집 모드 진입**:
   - `_loadExisting()` → `availabilityDetailNotifierProvider(id).future` → `AvailabilityRepository.getAvailability(id)` → `GET /api/v1/availability/{id}` → 폼 사전 채움.
2. **저장 (신규, 단일)**:
   - `availabilityDetailNotifierProvider(0).notifier.createAvailability(param)` → Repository → `POST /api/v1/availability`.
3. **저장 (편집)**:
   - `.notifier.updateAvailability(id, param)` → `PATCH /api/v1/availability/{id}`.
   - 성공 시 `state = AsyncData(data)`로 자체 갱신.
4. **삭제 (1차)**:
   - `.notifier.deleteAvailability(id, force: false)` → `DELETE /api/v1/availability/{id}?force=false`.
5. **삭제 (강제, 충돌 시)**:
   - `.notifier.deleteAvailability(id, force: true)` → `DELETE /api/v1/availability/{id}?force=true`.
6. **신규 + 반복 ON**:
   - F10-04의 `recurringRuleNotifierProvider.notifier.createRule(param)` → `POST /api/v1/availability/recurring`.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **`timezone='Asia/Seoul'` 하드코딩** — 사용자 디바이스 시간대 자동 감지 미적용.
- **요일 표기**: 신규 모드 인라인 반복 토글에서는 풀네임(`MONDAY…SUNDAY`), F10-04 화면에서는 약어(`MON…SUN`). 서버 `parseDayOfWeek`는 약어만 받기 때문에 이 화면에서 풀네임을 그대로 보내면 `INVALID_RECURRENCE_RULE` (200003)이 발생할 수 있다. **(잠재 버그 — 서버 측 미지원)**
- **유효성 규칙**:
  - `_isValid`: endTime - startTime ≥ 30분이면 OK. 30분 단위/480분 상한은 프론트에서 검증하지 않음(서버에서 검증).
  - 반복 ON + 요일 0 → 저장 disabled.
- **공개 토글 2분기 노출**: PUBLIC ↔ PRIVATE만 표시. FRIENDS는 화면에서 선택할 수 없음(F10-05 시나리오를 위해 직접 다른 채널로 설정 필요).
- **충돌 배너 트리거**: 서버 응답의 `message`에 `"OVERLAP"` 문자열이 포함된 경우만 배너 노출. 그 외 badRequest는 토스트.
- **삭제 충돌 다이얼로그 텍스트**: "이 가용 시간과 겹치는 이벤트가 N건 있습니다.\n그래도 삭제하시겠습니까?".
- **토스트 메시지** (정확히 사용되는 문자열):
  - 등록 성공: `"가용 시간이 등록되었습니다"`
  - 수정 성공: `"가용 시간이 수정되었습니다"`
  - 삭제 성공: `"가용 시간이 삭제되었습니다"`
  - 삭제 실패: `"삭제에 실패했습니다"` (error)
  - 반복 등록 성공: `"반복 가용 시간이 등록되었습니다"`
  - 일반 오류: `"오류가 발생했습니다"` (error)
- **저장 버튼 disabled 조건**: `!_isValid` (시간 규칙 + 반복 시 요일 1+).
- **초기값**: 시작 09:00, 종료 10:00, visibility=PUBLIC, 반복 OFF. initialDate는 query string으로 사전 주입.
- **편집 모드에서는 반복 토글 미노출** — 단일 가용성 → 반복 규칙 전환은 UI상 막혀 있음(서버에는 별도 API 없음).
- **input padding**: `AppSpacing.space5` (20). 화면 padding은 일반적으로 `AppSpacing.screenPadding` (16) 가이드라인이지만 본 화면은 폼 컨테이너로서 `space5`를 사용. (코드 현재 상태 그대로 기록.)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 신규 가용 시간 단일 등록 | 일간 캘린더 5/12 진입, FAB 탭으로 가용성 화면 진입. | DB에 `availability` 1건 INSERT, `visibility=0(PUBLIC)`, `is_recurring=false`. 다른 사용자가 F10-05의 public API로 이 슬롯을 조회 가능. |
| S2 | (엣지) 시간 겹침 — 충돌 경고 배너 | 동일 사용자, 이미 5/12 12:00~13:00 가용성을 등록한 상태. | 폼 그대로 유지, 사용자가 시간을 조정하면 배너는 다음 저장 시도 시 다시 평가. |
| S3 | (엣지) 30분 미만 시도 | 사용자가 14:00~14:15로 입력. | 서버 호출 발생하지 않음. 사용자가 시간을 조정해야 함. |
| S4 | (엣지) 과거 시각 시도 | 어제 날짜로 등록 시도. (DatePicker는 `firstDate=today`로 막혀 있어 정상 흐름에서는 발생 어려움.) | 등록 실패. (badRequest message가 OVERLAP을 포함하지 않으면 일반 토스트 처리.) |
| S5 | 단일 가용성 수정 | 본인 가용성 #77 (12:00~13:30)을 11:30~13:00으로 변경. | DB UPDATE. 다음에 캘린더가 새로 fetch되면 변경 사항 반영. |
| S6 | 삭제 — 충돌 없음 (Happy Path) | 본인 가용성 #77 삭제, 시간이 겹치는 OPEN/DRAFT 이벤트 없음. | DB 삭제. |
| S7 | 삭제 — 충돌 있음, 강제 삭제 흐름 | 본인 가용성 #77이 5/12 12:00~13:30, 동일 시간에 본인이 호스팅 중인 OPEN 이벤트 #500이 12:30~14:00으로 존재. | DB 삭제됨. 시간이 겹치던 이벤트 #500은 그대로 존재 (가용성과 이벤트는 별도 도메인). |
| S8 | (에러) 삭제 API 실패 | 네트워크 끊김 또는 5xx 응답. | 폼 유지, 사용자가 다시 시도 가능. |
| S9 | (권한) 다른 사람 가용성 직접 URL 입력 | 본인 토큰으로 다른 사용자의 availabilityId(예: 999)에 대한 편집 화면을 강제 진입 시도. | 사용자에게 보이는 메시지가 명확하지 않음. (운영 시 확인 필요.) |

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
| 후보 | scenarios.md:92 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P65 매트릭스 모드 모음 — `seed_calendar_availability_mutation_test.dart`) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:129 | - **잔여물 정리 (8차 보강)**: 모든 모드는 `testWidgets` `addTearDown` 에서 setup 단계의 슬롯/규칙을 `AvailabilityRepository.deleteAvailability(force=true)` 로 직접 정리한다. `delete_single` 처럼 UI 가 이미 삭제한 항목은 `untrackAvailability` 로 추적 해제하여 teardown 의 404 충돌을 막는다. `update` / `delete_single` 의 setup 도 UI POST 대신 Repository 직접 호출로 ID 를 정확히 확보한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:132 | `scripts/e2e/run_p65_calendar_availability_mutation_matrix.sh` — 5 modes 일괄 실행 (`create_single`, `update`, `delete_single`, `create_recurring`, `delete_recurring`). 단일 케이스만 실행하려면 인자로 모드명 전달. (8차 라운드 — `recurring_scope_ui_absence` → `delete_recurring` 으로 보강: ruleId 추적 + 실제 DELETE mutation 까지 수행, scope 분기 UI 부재 검증은 삭제 다이얼로그 단계로 이전.) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 신규 가용 시간 단일 등록**: Given 일간 캘린더 5/12 진입, FAB 탭으로 가용성 화면 진입. When 사용자가 해당 흐름을 실행하면 Then DB에 `availability` 1건 INSERT, `visibility=0(PUBLIC)`, `is_recurring=false`. 다른 사용자가 F10-05의 public API로 이 슬롯을 조회 가능.
- **AC-02. (엣지) 시간 겹침 — 충돌 경고 배너**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 폼 그대로 유지, 사용자가 시간을 조정하면 배너는 다음 저장 시도 시 다시 평가.
- **AC-03. (엣지) 30분 미만 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 호출 발생하지 않음. 사용자가 시간을 조정해야 함.
- **AC-04. (엣지) 과거 시각 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 등록 실패. (badRequest message가 OVERLAP을 포함하지 않으면 일반 토스트 처리.)
- **AC-05. 단일 가용성 수정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB UPDATE. 다음에 캘린더가 새로 fetch되면 변경 사항 반영.
- **AC-06. 삭제 — 충돌 없음 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB 삭제.
- **AC-07. 삭제 — 충돌 있음, 강제 삭제 흐름**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB 삭제됨. 시간이 겹치던 이벤트 #500은 그대로 존재 (가용성과 이벤트는 별도 도메인).
- **AC-08. (에러) 삭제 API 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 폼 유지, 사용자가 다시 시도 가능.
- **AC-09. (권한) 다른 사람 가용성 직접 URL 입력**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 보이는 메시지가 명확하지 않음. (운영 시 확인 필요.)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
