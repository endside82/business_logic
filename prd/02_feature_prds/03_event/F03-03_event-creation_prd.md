# F03-03. 이벤트 생성 (호스트) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-03_event-creation -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-03_event-creation`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트가 새 이벤트를 만든다. 생성 시 `status=DRAFT`로 저장되고, 별도 `publish` 호출 시 `OPEN`으로 전이한다. 일반/클럽/프라이빗 모임을 한 엔드포인트로 받으며, `hostingCostType`이 있으면 PRIVATE 타입이 된다. 반복 이벤트는 모(母) 이벤트 생성 후 `recurring` 엔드포인트로 자식 occurrence를 일괄 생성한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 목록(F03-01) ▶ 우하단 FAB(+) 탭 ▶ `/create-event`
- 이벤트 상세(F03-02) ▶ 더보기 ▶ "이 이벤트로 새로 만들기" ▶ `/create-event` + `extra=EventVo` (prefill)
- 클럽 상세(Unit 04) ▶ "이벤트 생성" ▶ `/create-event` (clubId 사전 설정)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-03_event-creation/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-03_event-creation/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-03_event-creation/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-03_event-creation/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:122` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:226` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:257` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:56` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 진입: `EventCreateNotifier.build()` → 빈 `EventCreateState`
2. (prefill 시) `applyPrefill(eventVoToCreateState(source, clearSchedule: true))`
3. 사용자 입력 → `update*` 메서드들 (각 필드별 setter)
4. Step 진행 → `validateStep1/2/3` → `nextStep`
5. 썸네일: `state.thumbnailFile` 있으면 `_uploadThumbnail`:
   - `FileRepository.generatePresignedUrl(fileName, mimeType, purpose: 'EVENT_THUMBNAIL', fileSize)` (Unit 05)
   - S3 PUT (presigned URL)
   - `state.thumbnailUrl = signed.fileKey`
6. 등록: `EventRepository.createEvent(_buildParam())` → `POST /api/v1/events`
7. 발행: `EventRepository.publishEvent(eventId)` → `POST .../publish` (선택적)
8. 성공 후 `eventListNotifier`/`myEventsNotifier` invalidate

## 4. 서버 계약

### 개요

호스트가 새 이벤트를 만든다. 생성 시 `status=DRAFT`로 저장되고, 별도 `publish` 호출 시 `OPEN`으로 전이한다. 일반/클럽/프라이빗 모임을 한 엔드포인트로 받으며, `hostingCostType`이 있으면 PRIVATE 타입이 된다. 반복 이벤트는 모(母) 이벤트 생성 후 `recurring` 엔드포인트로 자식 occurrence를 일괄 생성한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events | EventController#createEvent | required | DRAFT 이벤트 생성 |
| POST | /api/v1/events/{eventId}/publish | EventController#publishEvent | required | DRAFT → OPEN 전이 |
| POST | /api/v1/events/{eventId}/recurring | EventController#createRecurringEvents | required | 반복 자식 occurrence 일괄 생성 |
| GET | /api/v1/events/{eventId}/recurring | EventController#getRecurringGroup | optional | 반복 그룹 조회 |

> **전제**: 썸네일 업로드는 `POST /api/v1/files/presigned-url`(file 도메인) → S3 PUT → fileKey/URL을 `EventAddParam.thumbnailUrl`에 넣어 호출. 본 단위에서는 결과 URL만 받는다.

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `EventStatus`: `DRAFT → OPEN`이 publish의 유일한 합법 전이
- **Enum** `EventType`: `INDEPENDENT(0)`, `CLUB_MEETING(1)`, `PRIVATE(2)` — `hostingCostType`로 자동 결정
- **Enum** `PrepaymentType`: `POINT`, `CASH`, `MIXED` — Wallet 차감 정책 (Unit 06)
- **Enum** `HostingCostType` / `PrivateMeetingPhase`: 프라이빗 모임 전용 (PrivateMeetingPhase는 `WAITING_PAYMENT → RECRUITING → MATCHED → COMPLETED`)
- **Enum** `Category` (15개), `LocationType`, `EventVisibility`, `RefundPolicyType` — F03-02 backend 참고
- **Validation 규칙** (`EventAddParam`):
  - `@NotBlank @Size(max=200)` title
  - `@Future @NotNull` startTime
  - `@NotNull` endTime
  - `@Min(1)` baseCapacity
  - `@Min(0)` price
  - `@Pattern(regexp="^(https?://.*)?$")` thumbnailUrl, onlineUrl

### 의존 단위 / 외부 시스템

- **Unit 05 파일** — `POST /api/v1/files/presigned-url` → S3 PUT → fileKey
- **Unit 06 결제 & 지갑** — 사전결제(`prepaymentRequired`)와 프라이빗 모임 호스팅비는 Unit 06 차감. 본 단위는 메타데이터만 저장
- **Unit 07 모임 정산** — `prepaymentRequired`가 true이면 정산 항목/사전결제 거래로 연결됨 (Unit 07 위임)
- **Unit 04 클럽** — `clubId`가 있으면 `clubMeetingValidationService.validateClubMeetingCreation`로 클럽 멤버 권한 검증
- **외부**: AWS S3 (썸네일), Redis (캐시 invalidation)

## 5. 프론트 계약

### 진입 경로

- 이벤트 목록(F03-01) ▶ 우하단 FAB(+) 탭 ▶ `/create-event`
- 이벤트 상세(F03-02) ▶ 더보기 ▶ "이 이벤트로 새로 만들기" ▶ `/create-event` + `extra=EventVo` (prefill)
- 클럽 상세(Unit 04) ▶ "이벤트 생성" ▶ `/create-event` (clubId 사전 설정)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/event/screens/) | 역할 |
|---|---|---|
| `/create-event` | `event_create_screen.dart` | 4-step 생성 폼 |
| `/create-event` (with prefill) | 동일 | C-04 템플릿 복제 모드 |
| `/home/events/:eventId/recurring` | `recurring_event_group_screen.dart` | 반복 이벤트 그룹 보기 |

### 화면별 구성 요소 & 액션

### 이벤트 생성 (`event_create_screen.dart`)

`PageView` + `StepIndicator` (4단계)

#### Step 1 — 기본정보 (`event_create_step1.dart`)
- 제목 입력 (`AppTextInput`, max 200, 글자수 카운터)
- 카테고리 단일 선택 칩 그룹 (`ClubCategoryMapper.options`)
- 설명 입력 (`AppTextArea` 멀티라인)
- 썸네일 업로드 (`ImagePicker` + `ImageUploadHelper`) — 16:9 크롭, S3 presigned URL 업로드
- 임시저장 버튼 (우상단), 다음 버튼 (validateStep1 통과 시 활성)

#### Step 2 — 일시/장소 (`event_create_step2.dart`)
- 시작/종료 일시 `DateTimePicker` (미래만)
- 시간대 드롭다운 (기본: 기기 시간대)
- 위치 유형 `SegmentedControl` (오프라인/온라인)
- 오프라인 → 주소 검색(`DaumPostcodeSearch` 다음 우편번호 웹뷰), 상세주소, 지도 미니뷰
- 온라인 → URL 입력 (`https?://.*` 형식 검증)
- 이전/다음 버튼

#### Step 3 — 옵션 (`event_create_step3.dart`)
- 정원 `NumberInput` (스텝퍼, ≥1)
- 참가비 `CurrencyInput` (0이면 "무료" 표시)
- 대기열 `Switch` (default OFF)
- 위치 공유 `Switch` (오프라인일 때만 표시)
- 환불 정책 (`RefundPolicyForm`) — 유료 이벤트일 때만, RadioGroup 형태로 NONE/STANDARD/FULL/GRADUATED/CUSTOM
- CUSTOM 선택 시 환불 마감 시간 입력
- 사전결제 토글 + 금액/유형 (POINT/CASH/MIXED)
- 공동호스트 추가 (`UserSearchInput`)

#### Step 4 — 미리보기 (`event_create_step4.dart`)
- `event_preview_card.dart` — SCR-EV-002와 동일한 레이아웃 미리보기
- `event_summary_table.dart` — 입력값 요약 + 각 필드 "수정" 링크 → `_goToStep(n)`
- 이전 버튼, 임시저장 버튼, **등록 버튼** (DRAFT 생성), **등록 후 발행** 버튼 (DRAFT 생성 + 즉시 publish)

#### 액션
- 진입 시 prefill (C-04): `prefillFrom != null` → `eventVoToCreateState(source, clearSchedule: true)` 매핑 → `applyPrefill`
- "등록" 탭 ▶ `EventCreateNotifier.submit()`:
  1. 썸네일 파일 있으면 `_uploadThumbnail` (presigned URL → S3 PUT → fileKey)
  2. `EventRepository.createEvent(EventAddParam)` ▶ `POST /api/v1/events`
  3. 성공 → 토스트 "이벤트가 등록되었습니다" + `context.go('/home/events/${event.id}')`
  4. 실패 → `state.errors['submit']` (사용자 노출 메시지)
- "등록 후 발행" 탭 ▶ `submitAndPublish()`:
  1. `submit()`
  2. 성공하면 `EventRepository.publishEvent(id)` ▶ `POST .../publish`
  3. status=OPEN 응답 → 상세 화면 push

#### 상태 분기
- `state.isSubmitting=true` → 다음/등록 버튼 spinner overlay
- `state.errors[fieldName]` 있으면 해당 필드 하단 에러 텍스트
- 임시저장 데이터 (있다면) — 현재 코드에는 로컬 저장소 백업이 명시 미구현, 폼 state는 메모리 상에서만 유지
- 클럽 이벤트 생성 모드 (clubId 자동 설정) — 코드 상 별도 라우팅으로 진입한다고 가정

### 반복 이벤트 그룹 (`recurring_event_group_screen.dart`)

- 모 이벤트 + 자식 occurrence 목록 표시
- 진입 시: `GET /api/v1/events/{id}/recurring` ▶ `RecurringEventGroupVo`
- 호스트만: 미래 자식 이벤트 일괄 수정/취소 액션 (F03-04)

### API 호출 순서 (Provider/Repository 관점)

1. 진입: `EventCreateNotifier.build()` → 빈 `EventCreateState`
2. (prefill 시) `applyPrefill(eventVoToCreateState(source, clearSchedule: true))`
3. 사용자 입력 → `update*` 메서드들 (각 필드별 setter)
4. Step 진행 → `validateStep1/2/3` → `nextStep`
5. 썸네일: `state.thumbnailFile` 있으면 `_uploadThumbnail`:
   - `FileRepository.generatePresignedUrl(fileName, mimeType, purpose: 'EVENT_THUMBNAIL', fileSize)` (Unit 05)
   - S3 PUT (presigned URL)
   - `state.thumbnailUrl = signed.fileKey`
6. 등록: `EventRepository.createEvent(_buildParam())` → `POST /api/v1/events`
7. 발행: `EventRepository.publishEvent(eventId)` → `POST .../publish` (선택적)
8. 성공 후 `eventListNotifier`/`myEventsNotifier` invalidate

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **4-step 분리**: Step1(기본정보) / Step2(일시·장소) / Step3(옵션) / Step4(미리보기) — 화면 결정
- **카테고리 칩 라벨**: `ClubCategoryMapper.toLabel(code)` 한글 변환 — 화면 결정
- **위치 유형 SegmentedControl**: 오프라인/온라인 토글 라벨 — 화면 결정
- **유료 전환 시 환불정책 기본값**: `price > 0 && refundPolicyType == null` → `EventRefundPolicyType.none`으로 자동 채움
- **CUSTOM 환불 정책 변경 시**: 시간 입력 보이기/숨기기, 다른 정책 선택 시 `refundDeadlineHours` 자동 null 처리
- **검증 메시지** (한글, 화면에서 정의):
  - "제목을 입력해주세요"
  - "카테고리를 선택해주세요"
  - "시작 시각을 선택해주세요"
  - "시작 시각은 현재 이후여야 합니다"
  - "정원은 1명 이상이어야 합니다"
  - "환불 마감 시간을 입력해주세요"
- **에러 표시**: 필드별 `state.errors` 맵, 마지막에 "submit" 키로 전체 실패 메시지
- **API 에러 메시지**: `resolveApiErrorMessage(error, fallback: '이벤트 생성에 실패했습니다. 다시 시도해 주세요.')`
- **임시저장**: 현재 코드 기준 별도 로컬 저장 미구현 — 화면 이탈 시 state 초기화될 위험. 임시저장 버튼은 UI에 있으나 실제 동작은 미확인.
- **글자 수 카운터**: 제목 200자, 설명은 길이 제한 없이 자유 입력
- **썸네일 16:9 크롭**: 클라이언트에서 처리
- **시간대 드롭다운 옵션**: 기기 시간대 기본, 별도 선택 옵션 노출 정책 미확정

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 무료 일반 모임 생성 후 즉시 발행 (Happy Path) | 로그인됨, 마이 이벤트(주최 중) 0건. | status=OPEN 이벤트 생성. 목록/마이 이벤트 invalidate. |
| S2 | 임시저장 (DRAFT) 후 추후 발행 | 정보가 완전치 않은 호스트. | DRAFT → OPEN (별도 시점). |
| S3 | 시작 시각이 과거인 경우 | 호스트. | 사용자가 시각 수정 후 정상 진행. |
| S4 | 유료 이벤트 + 사전결제 설정 | 클래스 호스트. | 유료 이벤트 DRAFT 생성 완료. |
| S5 | 프라이빗 모임 생성 | 데이팅 매칭 호스트. | PRIVATE 모임 DRAFT, phase=WAITING_PAYMENT. |
| S6 | 공동호스트 추가 시 비존재 사용자 ID | 호스트. | 사용자 재선택. |
| S7 | 템플릿 복제 (C-04) | 정기 호스트, 지난 모임을 다시 만들고 싶음. | 같은 호스트가 새 일정으로 모임 재생성. |
| S8 | 반복 이벤트 (반복 occurrence 일괄 생성) | 매주 같은 시간 모임 호스트. | 반복 이벤트 그룹 생성 완료. |
| S9 | Step 1 필수 입력 미완 시 다음 차단 | 호스트 로그인됨, 모 이벤트(`templateEventId`) 생성됨 (S8 의 1단계와 동일 — DRAFT 또는 갓 발행된 OPEN). | 사용자가 필수값을 채운 뒤에만 다음 단계 진입 가능. |
| S10 | 반복 이벤트 그룹 관리 화면 surface | 부모 이벤트 + 자식 N건이 생성됨 (S8 결과). | 호스트가 반복 이벤트 운영 진입점을 한 화면에서 확인. |

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
| 후보 | frontend.md:68 | - 임시저장 데이터 (있다면) — 현재 코드에는 로컬 저장소 백업이 명시 미구현, 폼 state는 메모리 상에서만 유지 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:107 | - **임시저장**: 현재 코드 기준 별도 로컬 저장 미구현 — 화면 이탈 시 state 초기화될 위험. 임시저장 버튼은 UI에 있으나 실제 동작은 미확인. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:133 | - `calculateOccurrencesMultiDay(startTime, "WEEKLY", null, [MON,WED,FRI])` → 시작 주의 월·수·금(시작 시각 이후) + 다음 주 월·수·금 + ... `MAX_CHILD_EVENTS=52` 까지 펼침. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 무료 일반 모임 생성 후 즉시 발행 (Happy Path)**: Given 로그인됨, 마이 이벤트(주최 중) 0건. When 사용자가 해당 흐름을 실행하면 Then status=OPEN 이벤트 생성. 목록/마이 이벤트 invalidate.
- **AC-02. 임시저장 (DRAFT) 후 추후 발행**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DRAFT → OPEN (별도 시점).
- **AC-03. 시작 시각이 과거인 경우**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 시각 수정 후 정상 진행.
- **AC-04. 유료 이벤트 + 사전결제 설정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 유료 이벤트 DRAFT 생성 완료.
- **AC-05. 프라이빗 모임 생성**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then PRIVATE 모임 DRAFT, phase=WAITING_PAYMENT.
- **AC-06. 공동호스트 추가 시 비존재 사용자 ID**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 재선택.
- **AC-07. 템플릿 복제 (C-04)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 같은 호스트가 새 일정으로 모임 재생성.
- **AC-08. 반복 이벤트 (반복 occurrence 일괄 생성)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 반복 이벤트 그룹 생성 완료.
- **AC-09. Step 1 필수 입력 미완 시 다음 차단**: Given 호스트 로그인됨, 모 이벤트(`templateEventId`) 생성됨 (S8 의 1단계와 동일 — DRAFT 또는 갓 발행된 OPEN). When 사용자가 해당 흐름을 실행하면 Then 사용자가 필수값을 채운 뒤에만 다음 단계 진입 가능.
- **AC-10. 반복 이벤트 그룹 관리 화면 surface**: Given 부모 이벤트 + 자식 N건이 생성됨 (S8 결과). When 사용자가 해당 흐름을 실행하면 Then 호스트가 반복 이벤트 운영 진입점을 한 화면에서 확인.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
