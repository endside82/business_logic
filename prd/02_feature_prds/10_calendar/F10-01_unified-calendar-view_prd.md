# F10-01. 월간·일간 통합 달력 PRD

<!-- release-document: reference -->
> 2026-11-22 소스 대조. 현재 계약과 검증 경계이며 새 제품 실행 기록이 아니다. 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 입구와 날짜 이동

프로필의 달력은 서울 기준 오늘의 월과 선택 날짜로 시작한다. 이전/다음 달은 연도를 넘겨 이동하고 선택 날짜를 비운다. 오늘은 서울의 오늘을 다시 고른다. 날짜를 누르면 선택을 저장한 뒤 `/profile/calendar/day?date=YYYY-MM-DD` 일간 화면을 연다. 일간은 이전/다음 날·오늘·가능 시간 추가를 제공한다. 날짜 이동은 기기의 DST 일수 덧셈에 기대지 않고 날짜 성분으로 계산한다.

월 화면에는 Google 동기화, 반복 일정 목록, 관심인 보기, 월 내보내기, 가능 시간 추가 입구가 있다. 이 문서의 중심은 통합 조회이며 외부 Google 연결·공유 실행 성공을 이 입구의 존재로 대신하지 않는다.

## 코드 위치

`CalendarIntegrationController`, `CalendarIntegrationService`, `CalendarQueryRepository`, `CalendarEventVo`, `EventScope`와 월·일 화면/공급자를 대조했다. 변경 신호의 기존 시험 단언을 읽었다.

<!-- source-references:start -->
서버 창구: `CalendarIntegrationController#getMonthlyCalendar`, `CalendarIntegrationController#getDailyCalendar`, `CalendarIntegrationController#getRangeCalendar`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 서버 조회와 포함 범위

로그인 본인의 주최 모임·참석 모임·가능 시간을 List로 합쳐 시작 시각 순으로 정렬한다. 모임과 가능 시간 모두 **시작 시각이 from 이상 to 미만**인 행을 읽는다. 기간 전에 시작해 현재까지 이어지는 모든 겹침 일정을 모으는 방식은 아니다. isPast는 종료가 아니라 시작 시각과 서버 현재 시각의 비교다.

주최는 hostUserId, 참석은 APPROVED 신청 또는 ATTENDING 참석 기록이다. 참석의 두 원천은 모임 ID로 중복을 제거하지만 주최 목록과 참석 목록 전체를 합친 뒤 별도 중복 제거를 하는 것은 아니다. CANCELED와 decisionPending은 제외한다. 개인 PRIVATE 모임은 위임 요청일 때 EventScope에서 제외되며 일반 회원 조회까지 언제나 제외되는 것은 아니다.

itemType은 HOSTING·HOSTING_PRIVATE·ATTENDING·AVAILABILITY 네 값이다. 가능 시간에는 본인 저장 행만 들어간다. 월·일 조회는 1000~9998년, 월은 1~12를 검사하며 월말/일말은 다음 월/일 시작의 배타 경계로 만든다. range에 같은 입력 제한과 역전/최대 범위 검증이 모두 있는 것으로 확대하지 않는다.

## 표시·관심인·오류와 갱신

월 화면은 날짜별 표시와 선택일 카드를, 일간은 시간대별 목록을 보여 준다. 월의 관심인 보기는 별도 favoriteCalendar 공급자를 선택적으로 조회하고 본인 결과와 합친다. ownerUserId가 있는 카드를 사람별로 묶는다. 이는 다른 사람의 가능 시간을 공개하는 기능이 아니다. 관심인 데이터가 없거나 실패하면 현재 병합은 빈 목록으로 대체할 수 있어 본인 조회 오류와 같은 별도 오류 상태를 보장하지 않는다.

본인 월·일 조회는 로딩·빈 상태·오류·재시도를 제공하며 갱신 중 이전 자료를 유지한다. 계정 범위와 calendar/eventCards 변경 신호를 구독한다. 가능 시간·반복 규칙 변경, 모임 카드 변경 뒤 재조회하며 화면 복귀/권한 원천 갱신 래퍼도 있다. ‘다음 화면 생성 때까지 캐시가 항상 그대로’라는 설명은 현재와 다르다.

## 요청과 응답

| 요청 | 응답·경계 |
| --- | --- |
| GET /api/v1/calendar/monthly?year=&month= | List<CalendarEventVo>, 월 시작~다음 월 시작 |
| GET /api/v1/calendar/daily?date= | List<CalendarEventVo>, 해당 일 시작~다음 일 시작 |
| GET /api/v1/calendar/range?from=&to= | LocalDateTime 범위의 List<CalendarEventVo> |

주요 필드는 referenceId·itemType·title·startTime·endTime·location·timezone·eventStatus·eventType·isPast다. ownerUserId/ownerNickname과 정기모임 관련 필드도 DTO에 있지만 본인 통합 조회가 항상 모두 채우는 것은 아니다. 항목별 이동은 [달력 항목과 상세 연결](F10-02_calendar-item-routing_prd.md)을 따른다.

## 현재 제한과 확인 범위

| 구분 | 현재 경계 |
| --- | --- |
| Gap | 조회는 시작 시각 기준이다. 기간을 가로지르는 모든 일정의 겹침 조회로 설명하지 않는다 |
| Gap | 관심인 조회 실패를 본인 조회와 같은 독립 오류 안내로 표시하지 않는다 |
| 미검증 | 서버 조회·공급자·날짜 이동과 기존 신호 시험을 읽었다. 새 실기기·외부 캘린더·앱-서버 실행은 하지 않았다 |

## 수용 기준과 검증 근거

- **AC-01 날짜:** 서울 오늘·월 경계·일 이동과 날짜 키를 구분한다.
- **AC-02 범위:** 시작 시각의 포함/제외 경계와 월·일 입력 제한을 소스와 일치시킨다.
- **AC-03 모집단:** 주최·승인 신청·참석 기록·본인 가능 시간의 포함/중복 범위를 구분한다.
- **AC-04 개인 모임:** 위임 필터와 일반 회원 조회를 구분한다.
- **AC-05 관심인:** 사람별 공개 모임 표시를 개인 가능 시간 공유로 오해하지 않는다.
- **AC-06 상태:** 로딩·빈 결과·오류·재시도와 갱신 중 이전 자료를 구별한다.
- **AC-07 갱신:** calendar/eventCards 신호와 계정 범위에 맞춰 재조회한다. 기존 calendar_signal_test 단언을 읽었다.
- **AC-08 DTO:** List와 referenceId/itemType/isPast의 실제 의미를 보존한다.

위 항목은 문서 수용 기준이며 새 시험 통과 수가 아니다.
