# F10-04. 반복 가용 시간 규칙 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

"매주 월/수/금 점심시간"처럼 주기성을 가진 가용 시간을 한 번의 규칙으로 묶어 관리한다. `RecurrenceRule` 엔티티가 빈도(WEEKLY/BIWEEKLY/MONTHLY) + 요일(WEEKLY/BIWEEKLY) + 시작/종료 시간 + 유효 기간을 보유하며, 생성/수정 시 서버가 즉시 인스턴스를 펼쳐(expand) `availability` 테이블에 `isRecurring=true, recurrenceRuleId=ruleId`로 INSERT한다. 사용자에겐 단일 가용성과 동일하게 캘린더에서 보이지만, 삭제·수정은 규칙 단위로 일괄 적용된다. `effectiveUntil`이 null인 무기한 반복은 매일 02:00 스케줄러(`RecurringAvailabilityExtensionScheduler`)가 3개월씩 연장 생성한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **F10-03 가용성 화면(신규 모드)에서 "반복 설정" 토글 ON** + 저장: `availability_screen.dart`가 직접 `RecurringParam`을 만들어 `recurringRuleNotifierProvider.createRule`을 호출 (전용 화면으로 이동하지 않음).
- 달력 위쪽 반복 아이콘이 반복 일정 목록을 열고, 목록의 「반복 일정 만들기」 단추와 각 줄이 반복 일정 화면(만들기 `/profile/calendar/recurring`, 고치기 `?ruleId=`)을 연다.
- 새 가능 시간의 반복 스위치는 같은 화면에서 매주 요일을 고른다. 반복으로 만든 가능 시간을 고칠 때는 「반복 설정」 단추가 그 규칙 화면을 연다. 화면 명세 SCR-CA-003·004 도 같다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `AvailabilityController`, `RecurrenceRule`, `AvailabilityService`. 앱: `availability_screen.dart`, `recurring_rule_screen.dart`.

<!-- source-references:start -->
서버 창구: `AvailabilityController#createRecurringAvailability`, `AvailabilityController#getRecurrenceRule`, `AvailabilityController#updateRecurrenceRule`, `AvailabilityController#deleteRecurrenceRule`, `AvailabilityController#expandRecurrence`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 반복 주기는 매주, 격주, 매월이다. 매주와 격주는 고른 요일에, 매월은 같은 날짜에 생기고 그 달에 그 날짜가 없으면 달의 마지막 날로 맞춘다.
- 규칙을 만들거나 고치면 서버가 바로 가용 시간들을 펼쳐 저장한다. 내 다른 가용 시간과 겹치는 날은 알리지 않고 건너뛴다(앱은 건너뛴 사실을 안내한다). 수정은 기존에 펼친 것을 모두 지우고 다시 펼친다.
- 시작일은 오늘 이후여야 하고 종료일은 시작일 이전일 수 없으며 시작일부터 1,095일을 넘길 수 없다. 요일이 하나도 없으면 거절된다. 시간대는 서울 기준이다.
- 종료일이 없는 규칙은 처음에 3개월치만 펼치고, 매일 새벽 2시에 3개월씩 더 만들어 이어 간다.
- 삭제는 규칙과 펼쳐진 가용 시간을 모두 지운다. `이 일정만`, `이후 일정`을 고르는 단계는 없다.
- 전용 화면의 미리보기는 서버와 같은 펼침 규칙으로 앱이 센 예상 개수를 `총 N개의 가능한 시간이 만들어집니다` 로 보인다. 종료일 없음이 기본이다. 요일이 비어 있으면 `반복할 요일을 선택해주세요` 가 보이고 저장이 꺼진다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) "매주 평일 점심" 반복 등록 (편집 화면) | 반복 일정 목록의 「반복 일정 만들기」 단추로 들어온다(새로 만들기). | 캘린더가 다음 빌드부터 평일 12-13시에 가용성 마커 표시(F10-01에서 `AVAILABILITY` itemType으로 합산). |
| S2 | (Happy Path) 인라인 반복 등록 (F10-03 화면) | 사용자가 `availability_screen` 신규 모드에서 "반복 설정" 토글 ON. | 인라인 화면도 요일을 약어(`MON`~`SUN`)로 보내므로 전용 화면과 같이 등록된다. |
| S3 | (정상 흐름) 격주 반복 등록 | 사용자가 격주 토요일 오전 10-12시 가용을 등록. | 캘린더에 격주 토요일에만 가용성 마커. |
| S4 | 매월 반복 등록 | 매월 마지막 평일에 점심 가용. (단순화하여 매월 25일 사용.) | 매월 1건씩 가용성. 28~31일 사이 month length가 짧은 달은 lastDay로 보정(예: 2/28). |
| S5 | 반복 규칙 수정 — 시간 변경 | 본인 ruleId=10, 매주 평일 12:00~13:00을 11:30~13:00으로 변경. | 캘린더에 11:30~13:00이 새로 표시. 단일 가용성과 겹치는 인스턴스는 skip되어 빈 칸. |
| S6 | 반복 규칙 삭제 | 본인 ruleId=10 삭제. | 규칙 + 펼쳐진 인스턴스 모두 사라짐. UI/UX 스펙의 scope("이 일정만/이후/전체")는 본 흐름에서 제공되지 않음 — 사실상 항상 "전체 삭제". |
| S7 | (서버 정책) 인스턴스 펼치는 도중 단일 가용성과 충돌 | 사용자가 5/12 단일 가용성 12:00~13:30을 미리 등록한 상태에서, 매주 월/수/금 12:00~13:00 반복을 등록. | 사용자에겐 "성공" 토스트만 보임. 5/12에는 단일 가용성만 살아있음. 부분 충돌의 사용자 피드백은 현재 없음(개선 여지). |
| S8 | (스케줄러) 무기한 반복 자동 연장 | ruleId=10이 effectiveUntil=null로 등록되어 3개월치 인스턴스만 있음. | 사용자가 인지하지 못한 채 미래 슬롯이 자동 연장. F10-01이 미래 월 캘린더 조회 시 자연스럽게 노출. |
| S9 | (에러) 잘못된 시간/요일 | 사용자가 종료 시간을 시작 이전으로 설정 (예: 14:00→13:00). | 등록 실패. UI/UX 검증으로 막아야 하는 케이스가 미구현. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 반복 일정 입구 | 달력 위쪽 반복 아이콘이 반복 일정 목록을 열고, 목록의 만들기 단추와 각 줄이 반복 일정 만들기·고치기 화면을 연다. 반복으로 만든 가능 시간을 고칠 때는 「반복 설정」 단추가 그 규칙 화면을 연다. 새 가능 시간의 반복 스위치는 같은 화면에서 매주 요일만 고르며, 화면 명세도 지금 이대로다 | 없음 |
| 해소됨 | 반복 일정 시간 검사와 실패 안내 | 반복 일정과 단건 화면이 같은 시간 규칙(30분 단위, 30분~8시간, 끝이 시작보다 늦음)으로 저장 전에 막고, 반복 규칙 만들기·고치기·지우기가 실패하면 안내한다(2026-11-08 앱) | 없음 |
| 해소됨 | 시험 보강 기록 | 화면 문구·입구를 적은 시험 보강 기록이다. 결함이 아니다 | 없음 |
| 해소됨 | 원문 조각 | 원문 표·그림의 줄바꿈 조각이라 판정할 내용이 없다 | 없음 |

## 9. 수용 기준

- **AC-01. (Happy Path) "매주 평일 점심" 반복 등록 (편집 화면)**: Given 반복 일정 목록의 「반복 일정 만들기」 단추로 들어온다(새로 만들기). When 사용자가 해당 흐름을 실행하면 Then 캘린더가 다음 빌드부터 평일 12-13시에 가용성 마커 표시(F10-01에서 `AVAILABILITY` itemType으로 합산).
- **AC-02. (Happy Path) 인라인 반복 등록 (F10-03 화면)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 인라인 화면도 요일을 약어(`MON`~`SUN`)로 보내므로 전용 화면과 같이 등록된다.
- **AC-03. (정상 흐름) 격주 반복 등록**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 캘린더에 격주 토요일에만 가용성 마커.
- **AC-04. 매월 반복 등록**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 매월 1건씩 가용성. 28~31일 사이 month length가 짧은 달은 lastDay로 보정(예: 2/28).
- **AC-05. 반복 규칙 수정 — 시간 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 캘린더에 11:30~13:00이 새로 표시. 단일 가용성과 겹치는 인스턴스는 skip되어 빈 칸.
- **AC-06. 반복 규칙 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 규칙 + 펼쳐진 인스턴스 모두 사라짐. UI/UX 스펙의 scope("이 일정만/이후/전체")는 본 흐름에서 제공되지 않음 — 사실상 항상 "전체 삭제".
- **AC-07. (서버 정책) 인스턴스 펼치는 도중 단일 가용성과 충돌**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에겐 "성공" 토스트만 보임. 5/12에는 단일 가용성만 살아있음. 부분 충돌의 사용자 피드백은 현재 없음(개선 여지).
- **AC-08. (스케줄러) 무기한 반복 자동 연장**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 인지하지 못한 채 미래 슬롯이 자동 연장. F10-01이 미래 월 캘린더 조회 시 자연스럽게 노출.
- **AC-09. (에러) 잘못된 시간/요일**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 등록 실패. UI/UX 검증으로 막아야 하는 케이스가 미구현.
