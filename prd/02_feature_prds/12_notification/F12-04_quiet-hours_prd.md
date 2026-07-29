# F12-04. 방해금지 시간 설정 PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/12_notification/F12-04_quiet-hours -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/12_notification/F12-04_quiet-hours`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-07-29 현재 소스 갱신: `PushService#isQuietHours`가 `daysOfWeek`를 실제 발송 차단에 적용한다. 같은 날 구간은 현재 요일, 자정을 넘는 구간의 새벽 부분은 방해금지가 시작된 전날 요일을 기준으로 판단하며, 시작·종료가 같으면 선택한 요일 전체를 방해금지로 처리한다. `PushServiceTest`의 요일 불일치 발송 및 금요일→토요일 자정 넘김 차단 테스트로 이 분기를 고정한다.

## 1. 결론

사용자가 지정한 시간대 + 요일에는 푸시 알림(FCM 발송)을 일괄 차단하는 상위 차단 규칙을 관리한다. 카테고리별 설정(F12-03)과 독립적으로 작동하며, 방해금지 시간대에 발생한 알림은 인박스(`notification` 테이블)에는 정상 적재되어 사용자가 나중에 인지할 수 있다 — push 채널만 skip된다. 시간대는 자정 넘김(예: 22:00~07:00)을 지원하며, 요일은 1=월요일~7=일요일의 정수 리스트로 저장한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 알림 설정 화면(`/notifications/settings`) 하단 "방해금지 시간" 카드 → `context.push('/notifications/settings/quiet-hours')`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/12_notification/F12-04_quiet-hours/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/12_notification/F12-04_quiet-hours/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/12_notification/F12-04_quiet-hours/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/12_notification/F12-04_quiet-hours/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:103` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:97` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **화면 진입 시**:
   - `_loadQuietHours()` ▶ `ref.read(quietHoursNotifierProvider.future)` ▶ `NotificationRepository.getQuietHours()` ▶ `GET /api/v1/notifications/settings/quiet-hours`
   - 응답을 받으면 setState로 `_enabled / _startTime / _endTime / _selectedDays` 채우고 `_isInitialized=true`

2. **저장 시**:
   - `QuietHoursParam(enabled, startTime: "HH:MM", endTime: "HH:MM", daysOfWeek: [...])` 빌드 (`_formatTime`으로 TimeOfDay → 문자열)
   - `quietHoursNotifierProvider.notifier.updateQuietHours(param)` 호출
     - Repository ▶ `PUT /api/v1/notifications/settings/quiet-hours`
     - 성공: 응답 VO로 state = AsyncData(updated), return VO
     - 실패: return null
   - 결과 null/non-null로 토스트 분기 + pop

## 4. 서버 계약

### 개요

사용자가 지정한 시간대 + 요일에는 푸시 알림(FCM 발송)을 일괄 차단하는 상위 차단 규칙을 관리한다. 카테고리별 설정(F12-03)과 독립적으로 작동하며, 방해금지 시간대에 발생한 알림은 인박스(`notification` 테이블)에는 정상 적재되어 사용자가 나중에 인지할 수 있다 — push 채널만 skip된다. 시간대는 자정 넘김(예: 22:00~07:00)을 지원하며, 요일은 1=월요일~7=일요일의 정수 리스트로 저장한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/notifications/settings/quiet-hours | NotificationController#getQuietHours | required | 사용자의 방해금지 설정 조회 (없으면 default 반환) |
| PUT | /api/v1/notifications/settings/quiet-hours | NotificationController#updateQuietHours | required | 방해금지 설정 전체 저장(upsert) |

### 도메인 모델 / Enum (이 기능 관련)

### `QuietHoursSetting` 엔티티 (`quiet_hours_setting` 테이블)
- `userId: long` (JPA `unique=true` + canonical V1의 `uk_quiet_hours_user`로 1:1 강제)
- `enabled: boolean`
- `startTime: LocalTime`
- `endTime: LocalTime`
- `daysOfWeekList: List<Integer>` (저장 형태는 join 테이블 또는 CSV — 코드가 helper를 통해 List 반환)

### `QuietHoursVo` (`vo/QuietHoursVo.java`)
- 위와 동일한 4개 필드

### 방해금지 매칭 로직 (`PushService#isQuietHours`)
- 한국 시간대(`ZoneId.of("Asia/Seoul")`)의 현재 LocalTime을 기준
- `enabled == true`이고 선택 요일·시간대가 모두 매칭되면 첫 발송 시도에서 push를 skip
- `start == end`: 현재 요일이 `daysOfWeek`에 포함되면 그 요일 전체를 방해금지로 처리
- 같은 날 구간(`start < end`, 예: 09:00~22:00): 현재 요일이 선택되어 있고 `now >= start && now < end`일 때 차단
- 자정 넘김 구간(`start > end`, 예: 금요일 22:00~토요일 08:00):
  - 시작 시각 이후 구간은 현재 요일을 기준으로 차단
  - 종료 시각 전 새벽 구간은 `now.minusDays(1)`의 요일, 즉 시작 요일을 기준으로 차단
- `QuietHoursSetting#setDaysOfWeekList`는 null/빈 목록을 월~일 전체(`1..7`)로 정규화한다. 서버는 그 밖의 정수 범위를 검증하지 않는다.
- 소스 검증: `PushServiceTest#sendPush_quietHoursDifferentDay_sendsPush`, `PushServiceTest#sendPush_overnightQuietHoursUsesStartDay_skipsPush`

### 의존 단위 / 외부 시스템

- **이 API를 호출하는 다른 단위**: 없음 (클라이언트만)
- **이 설정을 사용하는 흐름**: `notification.service.PushService#sendWithRetry` → 첫 시도(retryCount==0)에서 `isQuietHours(userId)` true면 push skip (인박스는 별도 단위에서 적재)
- **외부**: 없음 (본 단위 자체는 FCM 미호출. 효과는 미래 FCM 발송 차단)

## 5. 프론트 계약

### 진입 경로

- 알림 설정 화면(`/notifications/settings`) 하단 "방해금지 시간" 카드 → `context.push('/notifications/settings/quiet-hours')`

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/notifications/settings/quiet-hours` | `presentation/notification/screens/quiet_hours_screen.dart` | 방해금지 시간 설정 — SCR-NT-003 |

### 화면별 구성 요소 & 액션

### 방해금지 시간 (`quiet_hours_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '방해금지 시간', showBackButton: true)`
  - 본문 (좌·우·상단 `AppSpacing.screenPadding`, 하단 `AppSpacing.space8`, scrollable):
    - `QuietHoursOutcomeCard`: 요일 적용, 인박스 보존, 차단된 push 미재발송 안내
    - 상단: `_enabled` Switch + 좌측 "방해금지 모드" + "활성화됨"/"비활성화됨" caption
    - 활성화 시 요약 카드: `Icons.schedule` + "HH:mm ~ HH:mm · N일 적용" (primary50 배경, primary700 텍스트)
    - 안내 박스(gray50): 활성화 시 "설정된 시간대에는 푸시 알림이 발송되지 않습니다.\n앱 내 알림은 정상 수신됩니다.", 비활성 시 "방해금지 모드가 꺼져 있습니다..."
    - `AnimatedOpacity`(0.4 dim) + `IgnorePointer` (비활성 시 입력 차단):
      - 시작/종료 시간 picker 2개 (라벨 "시작 시간" / "종료 시간", 박스 안에 큰 24px Pretendard 700 글자 `HH : MM`)
      - 안내 caption "자정을 넘기는 설정이 가능합니다 (예: 22:00 ~ 07:00)"
      - "적용 요일" 라벨 + 7개 동그란 칩 (월/화/수/목/금/토/일, 38x38, 선택 시 primary500 배경 흰 텍스트, 미선택 시 transparent + borderDefault)
      - 선택이 있으면 "선택한 요일에만 방해금지 모드가 적용됩니다", 0개면 error 색 안내
  - 하단 `bottomNavigationBar`: `AppButton(label: '저장', variant: ButtonVariant.primary, fullWidth: true, loading: _isLoading)`
- **사용자가 할 수 있는 액션**:
  - 방해금지 모드 Switch ON/OFF (토글만 — 저장 시점은 [저장] 버튼)
  - 시작/종료 시간 박스 탭 ▶ `showTimePicker`(Material 기본) → 결과 setState
  - 요일 칩 탭 ▶ `_selectedDays` Set 토글
  - "저장" 탭 ▶ `_save()` ▶ `PUT /api/v1/notifications/settings/quiet-hours` → 성공 시 토스트 + `context.pop`
- **상태 분기**:
  - 진입 직후 로딩(`!_isInitialized`): `AppLoadingState(label: '방해금지 시간을 불러오는 중입니다')`
  - `_isLoading=true`: 저장 버튼 loading 상태 (다른 입력은 막지 않음)
  - 저장 성공: `AppToast.show('저장되었습니다')` + `context.pop`
  - 저장 실패: `AppToast.show('서버 오류가 발생했습니다', type: ToastType.error)` (현재 화면 유지, pop 안 함)
- **모달/시트/네비게이션**:
  - 시간 선택: Material `showTimePicker` 다이얼로그
  - 저장 후: `context.pop()`로 알림 설정 화면 복귀

### API 호출 순서 (Provider/Repository 관점)

1. **화면 진입 시**:
   - `_loadQuietHours()` ▶ `ref.read(quietHoursNotifierProvider.future)` ▶ `NotificationRepository.getQuietHours()` ▶ `GET /api/v1/notifications/settings/quiet-hours`
   - 응답을 받으면 setState로 `_enabled / _startTime / _endTime / _selectedDays` 채우고 `_isInitialized=true`

2. **저장 시**:
   - `QuietHoursParam(enabled, startTime: "HH:MM", endTime: "HH:MM", daysOfWeek: [...])` 빌드 (`_formatTime`으로 TimeOfDay → 문자열)
   - `quietHoursNotifierProvider.notifier.updateQuietHours(param)` 호출
     - Repository ▶ `PUT /api/v1/notifications/settings/quiet-hours`
     - 성공: 응답 VO로 state = AsyncData(updated), return VO
     - 실패: return null
   - 결과 null/non-null로 토스트 분기 + pop

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 야간 방해금지 22:00~07:00, 평일만 적용 (Happy Path) | 처음 방해금지 화면 진입(서버 미저장) | 알림 설정 화면 복귀. 월~금에 시작하는 22:00~다음 날 07:00 구간의 푸시는 차단되고 인박스는 정상 적재 |
| S2 | 방해금지 OFF로 일시 해제 | 야간 방해금지 활성화 상태 | 모든 시간대 푸시 정상 발송 |
| S3 | 자정 넘김 시간대 정상 동작 확인 (방해금지 시간대 수신) | 22:00~07:00 방해금지 활성화 사용자, 새벽 02:00에 다른 사용자가 채팅 발송 | 야간 푸시 차단, 인박스 데이터는 보존 |
| S4 | 저장 실패 (네트워크 끊김) | 지하철 사용자 | 서버 미반영, 클라 입력 보존 |
| S5 | 권한 카테고리(F12-03) OFF + 방해금지 모두 적용 | F12-03에서 PROMOTION pushEnabled=false, F12-04에서 22:00~07:00 ON | PROMOTION/EVENT_REMINDER 둘 다 인박스에 있고 푸시는 미발송. 두 차단은 독립적으로 작동 |
| S6 | ON 상태에서 요일을 모두 해제하고 저장 시도 | 호기심 사용자 | Flutter `_save()`가 안내 토스트 후 요청을 보내지 않는다. API를 직접 empty days로 호출해도 서버 entity setter가 1~7(전 요일)로 정규화한다. |

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
| 해소 | `PushService.java`, `PushServiceTest.java` | 과거 후보였던 요일 미적용은 해소됐다. 요일 불일치 시 발송하고 자정 넘김은 시작 요일 기준으로 다음 날 새벽까지 차단한다. | 회귀 테스트 유지 |
| Risk | `QuietHoursParam` / `setDaysOfWeekList` | 서버는 요일 정수 범위를 검증하지 않고 null/empty를 전 요일로 바꾼다. 앱은 ON+0요일 저장을 막지만 직접 API의 0·8 같은 값은 저장 가능하다. | service에서 1~7·중복 여부를 검증할지 결정 |
| Gap | `quiet_hours_screen.dart` AppBar | 현재 도움말 버튼이 본 기능이 아닌 `guideId: 'F15-01'`을 사용한다. | F12-04 가이드로 교정하거나 의도된 공용 가이드인지 확인 |

## 9. 수용 기준

- **AC-01. 야간 방해금지 22:00~07:00, 평일만 적용 (Happy Path)**: Given 처음 방해금지 화면 진입(서버 미저장) When 사용자가 월~금과 22:00~07:00을 저장하면 Then 월~금에 시작하는 야간 구간의 푸시는 다음 날 07:00 전까지 차단되고 인박스는 정상 적재
- **AC-02. 방해금지 OFF로 일시 해제**: Given 야간 방해금지 활성화 상태 When 사용자가 해당 흐름을 실행하면 Then 모든 시간대 푸시 정상 발송
- **AC-03. 자정 넘김 시간대 정상 동작 확인 (방해금지 시간대 수신)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 야간 푸시 차단, 인박스 데이터는 보존
- **AC-04. 저장 실패 (네트워크 끊김)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 미반영, 클라 입력 보존
- **AC-05. 권한 카테고리(F12-03) OFF + 방해금지 모두 적용**: Given F12-03에서 PROMOTION pushEnabled=false, F12-04에서 22:00~07:00 ON When 사용자가 해당 흐름을 실행하면 Then PROMOTION/EVENT_REMINDER 둘 다 인박스에 있고 푸시는 미발송. 두 차단은 독립적으로 작동
- **AC-06. ON 상태 0요일 저장 차단/정규화**: Given 방해금지가 ON이고 선택 요일이 0개일 때 When 앱에서 저장하면 Then 토스트 후 API를 호출하지 않는다. 직접 API로 empty를 보내면 서버는 전 요일(1~7)로 저장한다

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
