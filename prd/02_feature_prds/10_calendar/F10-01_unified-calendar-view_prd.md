# F10-01. 월간/일간 통합 캘린더 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 캘린더 화면에 진입했을 때 본인이 주최하는 이벤트, 참여 승인된 이벤트, 등록한 가용 시간(Availability), 데이팅 만남을 단일 시간 축 위로 합쳐서 보여주기 위한 조회 전용 API다. 월간(1개월), 일간(1일), 임의 기간 세 가지 진입 경로가 있고, 모두 동일한 `CalendarEventVo` 리스트로 정규화되어 반환된다. 즉 프론트는 `itemType` 필드 하나로 4종(HOSTING/HOSTING_PRIVATE/ATTENDING/AVAILABILITY)을 분기 표시하면 된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **하단 탭 또는 프로필 메뉴 → "캘린더"**: 라우트 `/profile/calendar` (`profileCalendar`).
- **이벤트 상세에서 캘린더 아이콘 탭** (UI/UX 스펙 25.2의 진입 경로). 코드상 별도 진입점 위젯은 본 유닛 범위 외.
- **딥링크 / 알림**: 달력과 이어진 알림은 구글 달력 연결이 끊겼다는 알림 하나이고 구글 달력 연결 화면을 연다. 통합 달력을 여는 알림은 없다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `CalendarIntegrationController`, `CalendarItemType`, `AvailabilityService`. 앱: `monthly_calendar_screen.dart`, `daily_calendar_screen.dart`.

<!-- source-references:start -->
서버 창구: `CalendarIntegrationController#getMonthlyCalendar`, `CalendarIntegrationController#getDailyCalendar`, `CalendarIntegrationController#getRangeCalendar`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **월간 진입 시**:
   - `MonthlyCalendarScreen` → `ref.watch(monthlyCalendarNotifierProvider(year, month))`.
   - `MonthlyCalendarNotifier#build` → `calendarRepository.getMonthlyEvents(year, month)` → `CalendarApi.getMonthlyEvents` → `GET /api/v1/calendar/monthly?year=&month=`.
2. **월 이동 시**:
   - `setState(year, month)` → 새 family key로 Provider 재생성 → 위 호출 반복.
3. **일간 진입 시**:
   - `DailyCalendarScreen` → `ref.watch(dailyCalendarNotifierProvider(dateString))`.
   - `DailyCalendarNotifier#build` → `calendarRepository.getDailyEvents(date)` → `GET /api/v1/calendar/daily?date=YYYY-MM-DD`.
4. **에러 재시도**:
   - `AppErrorState.fromError(onRetry: () => ref.invalidate(<provider>))` ▶ Provider 재실행 ▶ 동일 GET 재호출.

`/api/v1/calendar/range`는 본 유닛 화면에서는 직접 호출하지 않는다 (`CalendarApi.getRangeEvents`는 정의만 되어 있고 사용처 없음 — 위젯/통계용 예약).

## 4. 제품 규칙

- 캘린더에는 내가 연 이벤트(`HOSTING`, 소개팅 이벤트는 `HOSTING_PRIVATE`), 참석이 확정된 이벤트(`ATTENDING`: 승인제는 승인됨, 직접 참석은 참석 확정), 내 가용 시간(`AVAILABILITY`)이 한 시간 축에 시작 시각순으로 모인다. 취소된 이벤트는 나오지 않는다. 이미 시작 시각이 지난 항목은 지난 일정으로 표시된다.
- 월간 점 색은 이벤트(주최, 참석) 파랑, 가용 시간 초록, 소개팅 만남 분홍이다. 월간 그리드는 일요일부터 시작하고 일자를 누르면 그 날 일간 화면으로 간다(일정이 없는 날도 가능). 일간 화면에서 플러스 버튼으로 그 날짜의 가용 시간을 등록할 수 있다.
- 일간 타임라인은 기본 08시~18시이고 일정이 그 밖에 있으면 넓어진다. 일정이 없는 날은 `이 날은 일정이 없습니다` 가 보인다. 가로 스와이프는 없고 화살표와 `오늘` 버튼으로 이동한다.
- 불러오기에 실패하면 재시도 버튼이 있는 오류 상태가 보이고(당겨서 새로고침은 없다), 로그인이 풀리면 일정 데이터 없이 로그인 화면으로 간다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 이번 달 일정 한눈에 보기 | 로그인됨, 프로필 탭 진입. | 사용자가 5월 일정의 분포를 시각적으로 파악, 특정 날짜 카드를 통해 "어떤 일정이 있는지" 텍스트 확인. |
| S2 | 월 이동 시 자동 재조회 | 위 S1 종료 직후. | 화살표 탭 횟수만큼 GET 호출이 누적되며, Provider 캐시(autoDispose)는 화면 이탈 시 해제. |
| S3 | 오늘로 즉시 점프 | 월간 뷰가 "2026년 8월"을 표시 중. | 캘린더가 "오늘" 컨텍스트로 정렬됨. |
| S4 | 일자 셀 탭 → 일간 뷰 | 동일 사용자, 5/12에 가용성 + 이벤트가 모두 있음. | 사용자가 일자 단위 시간대별 일정을 시각적으로 확인. |
| S5 | 빈 일자 / 일정 없는 날 | 사용자가 일정 없는 미래 날짜 클릭. | 빈 일자에서 자연스럽게 가용성 등록 진입점이 노출. |
| S6 | (에러) 네트워크 끊김 / 서버 오류 | 사용자. | 일시적 장애가 사용자 액션으로 회복 가능. |
| S7 | (권한) 비로그인 사용자 | 토큰이 만료되어 401 응답. | 로그인 화면. 캘린더 데이터 노출 없음. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 달력으로 오는 알림 | 달력과 이어진 알림은 구글 달력 연결이 끊겼다는 알림 하나이고, 누르면 구글 달력 연결 화면을 연다. 통합 달력 자체를 여는 알림은 없다. 로그인하지 않은 사람이 달력을 열면 로그인 화면으로 갔다가 로그인 뒤 돌아온다 | 없음 |

## 9. 수용 기준

- **AC-01. (Happy Path) 이번 달 일정 한눈에 보기**: Given 로그인됨, 프로필 탭 진입. When 사용자가 해당 흐름을 실행하면 Then 사용자가 5월 일정의 분포를 시각적으로 파악, 특정 날짜 카드를 통해 "어떤 일정이 있는지" 텍스트 확인.
- **AC-02. 월 이동 시 자동 재조회**: Given 위 S1 종료 직후. When 사용자가 해당 흐름을 실행하면 Then 화살표 탭 횟수만큼 GET 호출이 누적되며, Provider 캐시(autoDispose)는 화면 이탈 시 해제.
- **AC-03. 오늘로 즉시 점프**: Given 월간 뷰가 "2026년 8월"을 표시 중. When 사용자가 해당 흐름을 실행하면 Then 캘린더가 "오늘" 컨텍스트로 정렬됨.
- **AC-04. 일자 셀 탭 → 일간 뷰**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 일자 단위 시간대별 일정을 시각적으로 확인.
- **AC-05. 빈 일자 / 일정 없는 날**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 일자에서 자연스럽게 가용성 등록 진입점이 노출.
- **AC-06. (에러) 네트워크 끊김 / 서버 오류**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 일시적 장애가 사용자 액션으로 회복 가능.
- **AC-07. (권한) 비로그인 사용자**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 로그인 화면. 캘린더 데이터 노출 없음.
