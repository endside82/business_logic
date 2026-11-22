# F10-04. 반복 가능 시간 규칙 관리 PRD

<!-- release-document: reference -->
> 2026-11-22 소스 대조. 현재 계약과 검증 경계이며 새 제품 실행 기록이 아니다. 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 목록과 작성 입구

월 달력의 반복 일정에서 본인 규칙 목록을 연다. 20개씩 추가 조회하며 최신 id 순이고 종료된 규칙도 포함한다. 빈 목록도 당겨 새로고침하고 오류·다음 페이지 실패를 재시도한다. 목록에서 새 규칙 또는 ruleId 편집을 열며, 반복 인스턴스의 단일 편집 화면에서도 원래 규칙으로 이동할 수 있다.

새 가능 시간 화면의 반복 모드도 규칙 생성 입구다. 이 인라인 경로는 요일·시간·시작일·서울 timezone을 보내고 기본 WEEKLY·종료 없는 규칙을 만든다. 전용 화면의 격주/매월·종료일 선택과 구분한다.

## 코드 위치

`AvailabilityController`, `AvailabilityService`, `RecurringAvailabilityExtensionWorker/Scheduler`와 `recurring_rule_list_screen.dart`, `recurring_rule_screen.dart`, 가능 시간 공급자를 대조했다. 기존 적용 기간·변경 신호 단언을 읽었다.

<!-- source-references:start -->
서버 창구: `AvailabilityController#createRecurringAvailability`, `AvailabilityController#getRecurrenceRule`, `AvailabilityController#updateRecurrenceRule`, `AvailabilityController#deleteRecurrenceRule`, `AvailabilityController#expandRecurrence`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 서울 시간과 규칙 입력

frequency는 WEEKLY·BIWEEKLY·MONTHLY이고 생성에서 생략/빈 값은 WEEKLY다. 요일은 MON~SUN 약어이며 서버는 공백·대소문자를 정규화한다. 생성은 비어 있지 않은 요일, 시간, 오늘 이후 effectiveFrom, Asia/Seoul timezone이 필요하다. 종료일은 시작 이상이며 차이가 1095일을 넘으면 거절한다. 시간은 종료>시작, 길이 30~480분·30분 배수다.

전용 화면은 기존 규칙을 성공적으로 읽기 전 저장하지 않는다. 조회 실패에는 재시도가 있다. 지난 시작일이 그대로면 PATCH의 effectiveFrom을 null로 보내 유지하며 사용자가 바꾼 경우에만 새 날짜를 보낸다. effectiveUntil은 null이면 종료 없는 규칙으로 바뀐다. 월간 반복도 현재 입력 구조에는 요일 목록이 필요하지만 실제 날짜 계산은 시작일의 일자를 쓴다.

## 실제 펼침과 예상 개수

생성은 규칙을 저장하고 종료일까지, 무기한이면 시작일+3개월까지 인스턴스를 만든다. 범위 끝을 포함하며 펼침은 최대 1095일 구간으로 제한한다. 매주는 선택 요일, 격주는 effectiveFrom부터 7일 묶음의 짝수 주, 매월은 시작일의 일자를 사용하고 짧은 달은 마지막 날로 보정한다.

기존 본인 가능 시간과 겹치는 인스턴스는 건너뛴다. 생성 응답 expandedCount는 실제 저장한 수이며 목록/단건 응답의 expandedCount=0은 현재 인스턴스가 없다는 뜻이 아니다. 전용 화면의 미리보기는 로컬 예상 계산으로 겹침과 서버 저장 결과를 반영하지 않는다. 서버 expand도 규칙 날짜를 계산하는 읽기여서 물리 저장 건수나 겹침 제외 결과가 아니다.

## 수정·삭제·자동 연장

수정은 오늘 00시 이후 인스턴스를 지우고 수정 규칙으로 다시 만든다. 지난 기록은 유지하며 겹친 날짜는 건너뛴다. 이는 한 인스턴스 수정·‘이후만’ 삭제 선택과 다르다. 앱은 수정 전에 범위를 알리고 성공 후 겹친 날 제외를 안내한다.

규칙 삭제는 규칙과 모든 인스턴스를 지워 지난 기록도 제거한다. 앱도 이를 확인창에 명시한다. ‘이 일정만/이후/전체’ scope 선택은 규칙 삭제 API에 없다. 한 칸 삭제는 단일 가능 시간 삭제다.

자동 연장은 종료 없는 규칙 중 마지막 물리 인스턴스가 오늘+1개월 이내인 대상을 약 3개월 앞으로 펼친다. 물리 인스턴스가 하나도 없으면 현재 worker는 0건으로 끝내므로 항상 자동 복구된다고 보장하지 않는다. 지난 마지막 인스턴스는 오늘부터 확장하고 겹침은 건너뛴다. 매일 02시 cron·분산잠금·규칙별 트랜잭션이며 별도 timezone 지정은 없다. 배치 선언을 실제 정시 실행 확인으로 표시하지 않는다.

## 저장과 복귀

생성·수정·삭제 성공은 calendarChanged로 월·일·규칙 목록을 갱신하고 결과 안내 뒤 닫는다. 서버 반영 가능 오류도 조회를 갱신하되 실패 입력은 유지한다. 이전 계정 세션에서 늦게 끝난 명령이 새 세션의 자료를 다시 읽지 않도록 잡아 둔 신호 범위를 사용한다. 영속 요청 키 재생이 있는 생성 명령은 아니다.

## 요청과 응답

| 요청 | 현재 계약 |
| --- | --- |
| POST /api/v1/availability/recurring | frequency·daysOfWeek·startTime·endTime·timezone·effectiveFrom·effectiveUntil → 201 RecurrenceRuleVo |
| GET /api/v1/availability/recurring | page/size → Page<RecurrenceRuleVo>, 본인 id 내림차순 |
| GET /api/v1/availability/recurring/{ruleId} | 본인 RecurrenceRuleVo |
| PATCH /api/v1/availability/recurring/{ruleId} | 변경 RecurringParam → 200 빈 본문 |
| DELETE /api/v1/availability/recurring/{ruleId} | 본인 전체 규칙 삭제 → 204 |
| GET /api/v1/availability/expand?ruleId=&from=&to= | ruleId·instances(date/startTime/endTime)·count |

## 현재 제한과 확인 범위

| 구분 | 현재 경계 |
| --- | --- |
| Gap | 로컬 예상·서버 expand·실제 저장 건수가 다르며 겹침으로 생성 0건도 가능하다 |
| Gap | 무기한 규칙의 물리 인스턴스가 없으면 자동 연장 worker가 새로 채우지 않는다 |
| 미검증 | 소스·지난 시작일 PATCH와 신호의 기존 단언을 읽었다. 배치·경합·실기기 시험은 새로 실행하지 않았다 |

## 수용 기준과 검증 근거

- **AC-01 입구:** 본인 목록·새 규칙·규칙 편집·반복 인스턴스에서 원규칙 이동을 구분한다.
- **AC-02 목록:** 20개 페이지·최신 id·종료 규칙 포함·빈 상태 새로고침과 재시도를 보존한다.
- **AC-03 입력:** 서울 시간·길이·요일·시작/종료 범위를 서버와 일치시킨다.
- **AC-04 주기:** 매주·시작일 기준 격주·매월 마지막 날 보정을 구분한다.
- **AC-05 예상:** 로컬 예상/서버 expand/실제 expandedCount를 같은 값으로 설명하지 않는다.
- **AC-06 수정:** 지난 시작일 유지 PATCH와 오늘 이후 재생성을 구분한다. 기존 effectiveFrom 단언을 읽었다.
- **AC-07 삭제:** 전체 규칙 삭제는 과거 인스턴스도 제거하며 단일 삭제와 다르다.
- **AC-08 연장:** 무기한·남은 기간·물리 인스턴스 존재·겹침 조건을 확인한다.
- **AC-09 갱신:** 성공/결과 불명·계정 세션 범위로 월·일·목록을 갱신한다. 기존 단언을 읽었다.
- **AC-10 확인 경계:** 과거 E2E 인용·이번 소스 열람·미실행 배치를 별도로 표시한다.

위 항목은 문서 수용 기준이며 새 시험 통과 수가 아니다.
