# F10-04. 반복 가용 시간 규칙 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/10_calendar/F10-04_recurring-availability-rule -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/10_calendar/F10-04_recurring-availability-rule`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

"매주 월/수/금 점심시간"처럼 주기성을 가진 가용 시간을 한 번의 규칙으로 묶어 관리한다. `RecurrenceRule` 엔티티가 빈도(WEEKLY/BIWEEKLY/MONTHLY) + 요일(WEEKLY/BIWEEKLY) + 시작/종료 시간 + 유효 기간을 보유하며, 생성/수정 시 서버가 즉시 인스턴스를 펼쳐(expand) `availability` 테이블에 `isRecurring=true, recurrenceRuleId=ruleId`로 INSERT한다. 사용자에겐 단일 가용성과 동일하게 캘린더에서 보이지만, 삭제·수정은 규칙 단위로 일괄 적용된다. `effectiveUntil`이 null인 무기한 반복은 매일 02:00 스케줄러(`RecurringAvailabilityExtensionScheduler`)가 3개월씩 연장 생성한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **F10-03 가용성 화면(신규 모드)에서 "반복 설정" 토글 ON** + 저장: `availability_screen.dart`가 직접 `RecurringParam`을 만들어 `recurringRuleNotifierProvider.createRule`을 호출 (전용 화면으로 이동하지 않음).
- **`/profile/calendar/recurring?ruleId={id}`** 라우트로 직접 진입 (편집/삭제용 전용 화면) — 사용자 진입점은 현재 코드상 명시적 진입 위젯이 없어 운영/테스트 용도로 보존.
- UI/UX 스펙(SCR-CA-004)의 "SCR-CA-003에서 반복 토글 → SCR-CA-004 진입"은 이 코드 구현과 다르다(현재 코드는 반복 토글이 인라인 폼). `recurring_rule_screen.dart`는 별도 화면으로 존재하지만 진입 트리거가 라우트로만 노출.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/10_calendar/F10-04_recurring-availability-rule/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/10_calendar/F10-04_recurring-availability-rule/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/10_calendar/F10-04_recurring-availability-rule/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/10_calendar/F10-04_recurring-availability-rule/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:101` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:110` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:119` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:85` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java:93` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **편집 모드 진입**:
   - `_loadExistingRule()` → `availabilityRepository.getRecurringRule(ruleId)` → `GET /api/v1/availability/recurring/{ruleId}`.
   - 응답을 받아 폼 사전 채움 (frequency, daysOfWeek, startTime/endTime "HH:mm", effectiveFrom/Until 날짜 문자열 → DateTime parse).
2. **미리보기 (편집)**:
   - `recurringRuleNotifierProvider.notifier.preview(ruleId, from, to)` → Repository.expandRecurringRule → `GET /api/v1/availability/expand?ruleId=&from=&to=`.
3. **저장 (신규)**:
   - `notifier.createRule(param)` → Repository.createRecurringRule → `POST /api/v1/availability/recurring`.
4. **저장 (편집)**:
   - `notifier.updateRule(ruleId, param)` → `PATCH /api/v1/availability/recurring/{ruleId}` (응답 void).
5. **삭제**:
   - `notifier.deleteRule(ruleId)` → `DELETE /api/v1/availability/recurring/{ruleId}` (응답 204).

## 4. 서버 계약

### 개요

"매주 월/수/금 점심시간"처럼 주기성을 가진 가용 시간을 한 번의 규칙으로 묶어 관리한다. `RecurrenceRule` 엔티티가 빈도(WEEKLY/BIWEEKLY/MONTHLY) + 요일(WEEKLY/BIWEEKLY) + 시작/종료 시간 + 유효 기간을 보유하며, 생성/수정 시 서버가 즉시 인스턴스를 펼쳐(expand) `availability` 테이블에 `isRecurring=true, recurrenceRuleId=ruleId`로 INSERT한다. 사용자에겐 단일 가용성과 동일하게 캘린더에서 보이지만, 삭제·수정은 규칙 단위로 일괄 적용된다. `effectiveUntil`이 null인 무기한 반복은 매일 02:00 스케줄러(`RecurringAvailabilityExtensionScheduler`)가 3개월씩 연장 생성한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/availability/recurring | `AvailabilityController#createRecurringAvailability` | required | 규칙 생성 + 인스턴스 즉시 펼침(겹치면 skip) |
| GET | /api/v1/availability/recurring/{ruleId} | `AvailabilityController#getRecurrenceRule` | required | 규칙 단건 조회 (본인 소유) |
| PATCH | /api/v1/availability/recurring/{ruleId} | `AvailabilityController#updateRecurrenceRule` | required | 규칙 수정 + 기존 인스턴스 전체 삭제 후 재생성 |
| DELETE | /api/v1/availability/recurring/{ruleId} | `AvailabilityController#deleteRecurrenceRule` | required | 규칙 + 인스턴스 일괄 삭제 (scope 미지원) |
| GET | /api/v1/availability/expand | `AvailabilityController#expandRecurrence` | required | 규칙을 from~to 범위로 펼친 인스턴스 미리보기 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `RecurrenceRule` (`...calendar/model/RecurrenceRule.java`):
  - `id, userId, frequency: Frequency, daysOfWeek: String (CSV), startTime: LocalTime, endTime: LocalTime, timezone, effectiveFrom: LocalDate, effectiveUntil: LocalDate?, createdAt, updatedAt`.
- **Enum** `Frequency`: `WEEKLY(0), BIWEEKLY(1), MONTHLY(2)`.
- **Day 약어** (서버 `parseDayOfWeek`): `MON, TUE, WED, THU, FRI, SAT, SUN`. 다른 표기는 `INVALID_RECURRENCE_RULE` (200003).
- 펼친 인스턴스는 `availability` 테이블에 `isRecurring=true, recurrence_rule_id=<ruleId>`로 저장 — F10-01의 통합 캘린더 응답에 자동 포함된다.

### 의존 단위 / 외부 시스템

- **Redisson (Redis)**: `RecurringAvailabilityExtensionScheduler`가 분산 락(`lock:calendar:recurring-extension`)을 사용해 매일 02:00에 무기한 규칙 인스턴스 3개월 연장. 자체 도메인이지만 외부 인프라 의존.
- **자기 도메인**: `AvailabilityService#hasOverlap`, `AvailabilityService#expandRecurrence`.
- 외부 시스템(PG/FCM/S3/소셜) 호출 없음.

## 5. 프론트 계약

### 진입 경로

- **F10-03 가용성 화면(신규 모드)에서 "반복 설정" 토글 ON** + 저장: `availability_screen.dart`가 직접 `RecurringParam`을 만들어 `recurringRuleNotifierProvider.createRule`을 호출 (전용 화면으로 이동하지 않음).
- **`/profile/calendar/recurring?ruleId={id}`** 라우트로 직접 진입 (편집/삭제용 전용 화면) — 사용자 진입점은 현재 코드상 명시적 진입 위젯이 없어 운영/테스트 용도로 보존.
- UI/UX 스펙(SCR-CA-004)의 "SCR-CA-003에서 반복 토글 → SCR-CA-004 진입"은 이 코드 구현과 다르다(현재 코드는 반복 토글이 인라인 폼). `recurring_rule_screen.dart`는 별도 화면으로 존재하지만 진입 트리거가 라우트로만 노출.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/profile/calendar/availability` (반복 토글 ON) | `screens/availability_screen.dart` | 신규 반복 규칙 인라인 등록 (요일 풀네임 사용) |
| `/profile/calendar/recurring?ruleId={id}` | `screens/recurring_rule_screen.dart` | 반복 규칙 전용 화면 (편집/삭제) |

### 화면별 구성 요소 & 액션

### 반복 일정 화면 (`recurring_rule_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` 타이틀 `"반복 일정"`. 편집 모드에서 우상단 `삭제` 텍스트 버튼.
  - **반복 주기**: `_FrequencyChip` 3개 (`매주/격주/매월`, 라운드 20dp, 선택=primary500/흰색, 미선택=secondary100/textSecondary).
  - **반복 요일**: 7개 원형 칩(`MON..SUN` 약어가 코드상 사용되며, 라벨은 `월,화,수,목,금,토,일`). 다중 선택. 토요일=linkBlue, 일요일=error500 컬러.
  - 요일 미선택 시 빨간 안내 `"반복할 요일을 선택해주세요"`.
  - **시간 범위**: 좌/우 `_TimePickerField`, 중앙 `~`. 하단 요약 칩 `🕐 HH:mm ~ HH:mm (Xh Ym)`.
  - **기간**: `effectiveFrom` DatePicker. 그 아래 `종료일 없음` Switch (`_noEndDate=true`가 기본). off일 때 `effectiveUntil` DatePicker가 노출(범위: effectiveFrom ~ +730일).
  - **공개 설정**: PUBLIC ↔ PRIVATE Switch (FRIENDS는 토글 미노출).
  - **미리보기 버튼** (`_preview`): 신규 모드면 클라이언트가 `weeks * |daysOfWeek|` 추정 카운트를 계산. 편집 모드면 `expandRecurringRule` API 호출.
  - 미리보기 결과 `_previewCount > 0`이면 primary50 배경 박스에 `"총 N개의 가용 시간이 생성됩니다"`.
  - 하단 sticky `AppButton "저장"`.
- **사용자가 할 수 있는 액션**:
  - 주기/요일/시간/기간/공개 설정 변경.
  - **미리보기** ▶ `_preview()`:
    - 신규 모드: ruleId가 없으므로 API 호출 불가. `(weeks * |daysOfWeek|)` 추정값을 표시. (`weeks = noEndDate ? 12 : ceil((effectiveUntil - effectiveFrom)/7)`)
    - 편집 모드: `recurringRuleNotifierProvider.notifier.preview(ruleId, fromStr, toStr)` → `GET /api/v1/availability/expand`. 응답 `count` 사용.
  - **저장** ▶ `_save()`:
    - 신규: `_buildParam()` → `RecurringParam(frequency, daysOfWeek=약어, startTime/endTime="HH:mm", timezone="Asia/Seoul", effectiveFrom="YYYY-MM-DD", effectiveUntil?, visibility)` → `notifier.createRule(param)` → `POST /api/v1/availability/recurring` → 토스트 `"반복 일정이 등록되었습니다"` + pop.
    - 편집: `notifier.updateRule(ruleId, param)` → `PATCH …/recurring/{ruleId}` → 토스트 `"반복 일정이 수정되었습니다"` + pop.
  - **삭제** (편집 모드만) ▶ `_confirmDelete`:
    - `AlertDialog`("이 반복 일정을 삭제하시겠습니까?") → 확인 시 `notifier.deleteRule(ruleId)` → `DELETE …/recurring/{ruleId}` → 토스트 `"반복 일정이 삭제되었습니다"` + pop.
    - 서버 미지원으로 인해 "이 일정만 / 이후 모든 일정 / 모든 반복 일정" scope 선택지는 화면에 없음.
- **상태 분기**:
  - 로딩: 저장 / 미리보기 시 `loading=true` 인디케이터.
  - 에러: notifier에서 `Result.failure → null/false` 반환. 이 화면은 별도 토스트를 띄우지 않음(잠재 개선 포인트 — 실패 시 사용자 피드백 없음).
- **모달/시트/네비게이션**: DatePicker / TimePicker / AlertDialog. 푸시 only, 결과는 pop으로 복귀.

### 인라인 반복 등록 (`availability_screen.dart` — 신규 모드)
- "반복 설정" Switch ON → 인라인 요일 셀렉터 노출.
- 요일 값은 `'MONDAY' .. 'SUNDAY'` 풀네임을 그대로 `daysOfWeek` 배열에 담아 `RecurringParam`으로 전송. **서버는 약어만 파싱**하므로 풀네임 그대로 보낼 경우 `INVALID_RECURRENCE_RULE` (200003)이 발생할 가능성이 높다. (실제 서버 호환 여부 점검 필요.)

### API 호출 순서 (Provider/Repository 관점)

1. **편집 모드 진입**:
   - `_loadExistingRule()` → `availabilityRepository.getRecurringRule(ruleId)` → `GET /api/v1/availability/recurring/{ruleId}`.
   - 응답을 받아 폼 사전 채움 (frequency, daysOfWeek, startTime/endTime "HH:mm", effectiveFrom/Until 날짜 문자열 → DateTime parse).
2. **미리보기 (편집)**:
   - `recurringRuleNotifierProvider.notifier.preview(ruleId, from, to)` → Repository.expandRecurringRule → `GET /api/v1/availability/expand?ruleId=&from=&to=`.
3. **저장 (신규)**:
   - `notifier.createRule(param)` → Repository.createRecurringRule → `POST /api/v1/availability/recurring`.
4. **저장 (편집)**:
   - `notifier.updateRule(ruleId, param)` → `PATCH /api/v1/availability/recurring/{ruleId}` (응답 void).
5. **삭제**:
   - `notifier.deleteRule(ruleId)` → `DELETE /api/v1/availability/recurring/{ruleId}` (응답 204).

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **요일 약어 매핑**: 본 화면은 `['MON','TUE',...,'SUN']` 약어를 사용하며 서버와 일치. 단 F10-03 인라인 토글은 풀네임을 사용해 호환성 이슈 잠재.
- **`timezone='Asia/Seoul'` 하드코딩**.
- **신규 모드의 미리보기 카운트는 클라이언트 추정**:
  - `weeks = noEndDate ? 12 : ceil(diffDays/7)`
  - `previewCount = weeks * selectedDays.length`
  - 매주/격주/매월 차이는 추정에 반영하지 않음 → 매월/격주에서는 실제 펼친 결과와 다를 수 있음(편집 모드에서만 정확).
- **편집 모드 미리보기 to 범위**: `effectiveUntil ?? effectiveFrom + 84일` 으로 클라이언트가 결정.
- **end-date toggle 기본값**: 신규=`종료일 없음=ON`(무기한). UI/UX 스펙 미명시.
- **공개 토글 2분기 노출** (PUBLIC/PRIVATE만).
- **삭제 다이얼로그**: 단일 `"이 반복 일정을 삭제하시겠습니까?"`. UI/UX 스펙의 BottomSheet 3분기는 서버 미지원으로 제거.
- **토스트 문구**:
  - 등록: `"반복 일정이 등록되었습니다"` (전용 화면), `"반복 가용 시간이 등록되었습니다"` (인라인 화면).
  - 수정: `"반복 일정이 수정되었습니다"`.
  - 삭제: `"반복 일정이 삭제되었습니다"`.
- **에러 시 토스트 부재**: notifier가 실패 시 `null/false`만 반환하고 화면에서 별도 표시 없음(개선 여지).
- **충돌 정책**: 서버가 401-PARTIAL_TIME_CONFLICT를 반환하지 않고 silently skip하므로, "X개 충돌 무시됨" 같은 후크 표시는 화면에 없음. `expandedCount`(응답 필드)도 화면에서 사용자에게 노출하지 않음.
- **요일 라벨 색상 (`recurring_rule_screen.dart`)**: 토(linkBlue), 일(error500). F10-03 인라인 토글에는 색상 구분 없음.
- **저장 버튼 disabled 조건**: `_selectedDays.isEmpty` 만 검사. (시간 30분 검증은 프론트 미구현 — 서버 검증 의존.)
- **입력 padding**: `AppSpacing.space5` (20).

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) "매주 평일 점심" 반복 등록 (편집 화면) | 본인이 `/profile/calendar/recurring`로 직접 진입(예: 운영자 안내 링크) — 신규 모드. | 캘린더가 다음 빌드부터 평일 12-13시에 가용성 마커 표시(F10-01에서 `AVAILABILITY` itemType으로 합산). |
| S2 | (Happy Path) 인라인 반복 등록 (F10-03 화면) | 사용자가 `availability_screen` 신규 모드에서 "반복 설정" 토글 ON. | 등록 실패. **(잠재 버그: 인라인 화면의 풀네임 vs 서버의 약어 불일치.)** |
| S3 | (정상 흐름) 격주 반복 등록 | 사용자가 격주 토요일 오전 10-12시 가용을 등록. | 캘린더에 격주 토요일에만 가용성 마커. |
| S4 | 매월 반복 등록 | 매월 마지막 평일에 점심 가용. (단순화하여 매월 25일 사용.) | 매월 1건씩 가용성. 28~31일 사이 month length가 짧은 달은 lastDay로 보정(예: 2/28). |
| S5 | 반복 규칙 수정 — 시간 변경 | 본인 ruleId=10, 매주 평일 12:00~13:00을 11:30~13:00으로 변경. | 캘린더에 11:30~13:00이 새로 표시. 단일 가용성과 겹치는 인스턴스는 skip되어 빈 칸. |
| S6 | 반복 규칙 삭제 | 본인 ruleId=10 삭제. | 규칙 + 펼쳐진 인스턴스 모두 사라짐. UI/UX 스펙의 scope("이 일정만/이후/전체")는 본 흐름에서 제공되지 않음 — 사실상 항상 "전체 삭제". |
| S7 | (서버 정책) 인스턴스 펼치는 도중 단일 가용성과 충돌 | 사용자가 5/12 단일 가용성 12:00~13:30을 미리 등록한 상태에서, 매주 월/수/금 12:00~13:00 반복을 등록. | 사용자에겐 "성공" 토스트만 보임. 5/12에는 단일 가용성만 살아있음. 부분 충돌의 사용자 피드백은 현재 없음(개선 여지). |
| S8 | (스케줄러) 무기한 반복 자동 연장 | ruleId=10이 effectiveUntil=null로 등록되어 3개월치 인스턴스만 있음. | 사용자가 인지하지 못한 채 미래 슬롯이 자동 연장. F10-01이 미래 월 캘린더 조회 시 자연스럽게 노출. |
| S9 | (에러) 잘못된 시간/요일 | 사용자가 종료 시간을 시작 이전으로 설정 (예: 14:00→13:00). | 등록 실패. UI/UX 검증으로 막아야 하는 케이스가 미구현. |

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
| 후보 | frontend.md:5 | - **`/profile/calendar/recurring?ruleId={id}`** 라우트로 직접 진입 (편집/삭제용 전용 화면) — 사용자 진입점은 현재 코드상 명시적 진입 위젯이 없어 운영/테스트 용도로 보존. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:6 | - UI/UX 스펙(SCR-CA-004)의 "SCR-CA-003에서 반복 토글 → SCR-CA-004 진입"은 이 코드 구현과 다르다(현재 코드는 반복 토글이 인라인 폼). `recurring_rule_screen.dart`는 별도 화면으로 존재하지만 진입 트리거가 라우트로만 노출. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:79 | - **저장 버튼 disabled 조건**: `_selectedDays.isEmpty` 만 검사. (시간 30분 검증은 프론트 미구현 — 서버 검증 의존.) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:85 | **종료 상태**: 등록 실패. UI/UX 검증으로 막아야 하는 케이스가 미구현. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:89 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P65 매트릭스 모드 모음 — `seed_calendar_availability_mutation_test.dart`) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:106 | **모드 변천 (8차 라운드 보강)**: 6차 라운드까지의 `recurring_scope_ui_absence` 는 ruleId 추적이 없어 실제 DELETE 호출을 하지 않았다. 8차에서 `AvailabilityRepository.createRecurringRule` 을 setup 단계에 직접 호출해 `ruleId` 를 확보하고, 편집 모드 진입 → "삭제" 액션 → 확인 다이얼로그 → DELETE 까지 완전 수행하도록 보강하여 mutation E2E 로 전환했다. 동시에 다이얼로그가 단일 "삭제/취소" 두 버튼만 노출하고 scope 분기 텍스트가 없음도 함께 검증한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:126 | \| `forward` (이후 전체) \| 미지원. `effectiveUntil` 패치로 부분 우회 가능 (코드 미구현) \| 본 단위 미커버, 향후 추가 \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:132 | - **잔여물 정리 (8차 보강)**: 모든 모드는 `testWidgets` `addTearDown` 에서 setup 으로 만든 availability/rule 을 `AvailabilityRepository` 로 직접 삭제하여 alice 계정 누적을 방지한다. `delete_recurring` 모드는 UI 가 이미 DELETE 했으므로 cleanup 추적에서 제외(`untrackRule`). `RecurringAvailabilityExtensionScheduler` 가 무기한 규칙을 3개월 단위로 연장하므로 setup 후 즉시 정리 필수. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) "매주 평일 점심" 반복 등록 (편집 화면)**: Given 본인이 `/profile/calendar/recurring`로 직접 진입(예: 운영자 안내 링크) — 신규 모드. When 사용자가 해당 흐름을 실행하면 Then 캘린더가 다음 빌드부터 평일 12-13시에 가용성 마커 표시(F10-01에서 `AVAILABILITY` itemType으로 합산).
- **AC-02. (Happy Path) 인라인 반복 등록 (F10-03 화면)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 등록 실패. **(잠재 버그: 인라인 화면의 풀네임 vs 서버의 약어 불일치.)**
- **AC-03. (정상 흐름) 격주 반복 등록**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 캘린더에 격주 토요일에만 가용성 마커.
- **AC-04. 매월 반복 등록**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 매월 1건씩 가용성. 28~31일 사이 month length가 짧은 달은 lastDay로 보정(예: 2/28).
- **AC-05. 반복 규칙 수정 — 시간 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 캘린더에 11:30~13:00이 새로 표시. 단일 가용성과 겹치는 인스턴스는 skip되어 빈 칸.
- **AC-06. 반복 규칙 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 규칙 + 펼쳐진 인스턴스 모두 사라짐. UI/UX 스펙의 scope("이 일정만/이후/전체")는 본 흐름에서 제공되지 않음 — 사실상 항상 "전체 삭제".
- **AC-07. (서버 정책) 인스턴스 펼치는 도중 단일 가용성과 충돌**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에겐 "성공" 토스트만 보임. 5/12에는 단일 가용성만 살아있음. 부분 충돌의 사용자 피드백은 현재 없음(개선 여지).
- **AC-08. (스케줄러) 무기한 반복 자동 연장**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 인지하지 못한 채 미래 슬롯이 자동 연장. F10-01이 미래 월 캘린더 조회 시 자연스럽게 노출.
- **AC-09. (에러) 잘못된 시간/요일**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 등록 실패. UI/UX 검증으로 막아야 하는 케이스가 미구현.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
