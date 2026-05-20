# F10-01. 월간/일간 통합 캘린더 조회 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/10_calendar/F10-01_unified-calendar-view -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/10_calendar/F10-01_unified-calendar-view`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 캘린더 화면에 진입했을 때 본인이 주최하는 이벤트, 참여 승인된 이벤트, 등록한 가용 시간(Availability), 데이팅 만남을 단일 시간 축 위로 합쳐서 보여주기 위한 조회 전용 API다. 월간(1개월), 일간(1일), 임의 기간 세 가지 진입 경로가 있고, 모두 동일한 `CalendarEventVo` 리스트로 정규화되어 반환된다. 즉 프론트는 `itemType` 필드 하나로 4종(HOSTING/HOSTING_PRIVATE/ATTENDING/AVAILABILITY)을 분기 표시하면 된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **하단 탭 또는 프로필 메뉴 → "캘린더"**: 라우트 `/profile/calendar` (`profileCalendar`).
- **이벤트 상세에서 캘린더 아이콘 탭** (UI/UX 스펙 25.2의 진입 경로). 코드상 별도 진입점 위젯은 본 유닛 범위 외.
- **딥링크 / 알림**: 본 유닛에서는 직접적인 딥링크 매핑 미확인. (NotificationRouter 흐름은 다른 유닛 책임)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/10_calendar/F10-01_unified-calendar-view/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/10_calendar/F10-01_unified-calendar-view/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/10_calendar/F10-01_unified-calendar-view/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/10_calendar/F10-01_unified-calendar-view/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/calendar/controller/CalendarIntegrationController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/CalendarIntegrationController.java:36` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/CalendarIntegrationController.java:44` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

사용자가 캘린더 화면에 진입했을 때 본인이 주최하는 이벤트, 참여 승인된 이벤트, 등록한 가용 시간(Availability), 데이팅 만남을 단일 시간 축 위로 합쳐서 보여주기 위한 조회 전용 API다. 월간(1개월), 일간(1일), 임의 기간 세 가지 진입 경로가 있고, 모두 동일한 `CalendarEventVo` 리스트로 정규화되어 반환된다. 즉 프론트는 `itemType` 필드 하나로 4종(HOSTING/HOSTING_PRIVATE/ATTENDING/AVAILABILITY)을 분기 표시하면 된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/calendar/monthly | `CalendarIntegrationController#getMonthlyCalendar` | required | 본인 주최/참석 이벤트 + 가용성을 월(1개월) 범위로 통합 |
| GET | /api/v1/calendar/daily | `CalendarIntegrationController#getDailyCalendar` | required | 동일 데이터 소스를 1일 범위로 통합 |
| GET | /api/v1/calendar/range | `CalendarIntegrationController#getRangeCalendar` | required | 임의의 LocalDateTime 범위로 통합 (위젯/통계 등 다용도) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `CalendarItemType` (`...calendar/constants/CalendarItemType.java`): `HOSTING, HOSTING_PRIVATE, ATTENDING, AVAILABILITY` (4종 외 값 없음)
- **VO** `CalendarEventVo`: 위 응답 스키마 그대로. `isPast`는 Jackson 직렬화 시 `@JsonProperty("isPast")` 명시되어 있어 JSON 키도 `isPast`로 유지됨.
- **연관 Enum**: `EventStatus`, `EventType` (이벤트 도메인 소속). `eventStatus.ne(CANCELED)` 필터로 취소된 이벤트는 캘린더에서 제외.

### 의존 단위 / 외부 시스템

- **Unit 03 이벤트 도메인**: `Event`, `Application` 엔티티/Q클래스 직접 조회 (`CalendarQueryRepository`).
- **Unit 09 프라이빗 데이팅**: `EventType.PRIVATE`인 이벤트가 `HOSTING_PRIVATE`로 매핑되어 데이팅 만남으로 표현됨. 별도 PrivateDate 엔티티 조회는 없음 (이벤트 테이블에 모두 저장).
- **자기 도메인**: `AvailabilityService#getAvailabilities` 호출 → Availability 엔티티 직접 조회.
- 외부 시스템(PG/FCM/S3/소셜) 호출 없음.

## 5. 프론트 계약

### 진입 경로

- **하단 탭 또는 프로필 메뉴 → "캘린더"**: 라우트 `/profile/calendar` (`profileCalendar`).
- **이벤트 상세에서 캘린더 아이콘 탭** (UI/UX 스펙 25.2의 진입 경로). 코드상 별도 진입점 위젯은 본 유닛 범위 외.
- **딥링크 / 알림**: 본 유닛에서는 직접적인 딥링크 매핑 미확인. (NotificationRouter 흐름은 다른 유닛 책임)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (`lib/presentation/calendar/...`) | 역할 |
|---|---|---|
| `/profile/calendar` | `screens/monthly_calendar_screen.dart` | 월간 그리드 + 선택일 일정 카드 |
| `/profile/calendar/day?date=YYYY-MM-DD` | `screens/daily_calendar_screen.dart` | 시간 타임라인 뷰 |

### 화면별 구성 요소 & 액션

### 월간 캘린더 (`monthly_calendar_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` 타이틀 `"{year}년 {month}월"`, 우측 상단 `+` 아이콘 (가용성 추가 진입점).
  - `_MonthNavigator` — 좌/우 화살표(`chevron_left/right`)와 "오늘" 버튼(둥근 primary500 배경).
  - 6주 × 7일 그리드. 일자 셀(`_buildDateCell`) 하단에 점 마커 3종:
    - `linkBlue` (이벤트: `HOSTING` / `ATTENDING`)
    - `primary500` (가용성: `AVAILABILITY`)
    - `datingPink` (만남: `HOSTING_PRIVATE`)
  - 선택된 날짜는 primary500 원형 배경, 오늘은 primary500 테두리 1.5dp.
  - 선택일 일정 카드 리스트(`_EventCard`) — 색 막대 + 제목 + `HH:mm - HH:mm` + location.
  - 하단 마커 범례(`_buildMarkerLegend`).
- **사용자가 할 수 있는 액션**:
  - 좌/우 화살표 ▶ `_prevMonth` / `_nextMonth` ▶ `(year, month)` 갱신 → `monthlyCalendarNotifierProvider(year, month)` 자동 재조회.
  - "오늘" 버튼 ▶ `_goToday` ▶ `(now.year, now.month)`로 점프, `selectedDate = now`.
  - 일자 셀 탭 ▶ `_onDateSelected(date)` ▶ `setState(selectedDate = date)` + `context.push('/profile/calendar/day?date=YYYY-MM-DD')`.
  - 우상단 `+` ▶ `context.push('/profile/calendar/availability')` (F10-03 진입).
- **상태 분기**: 
  - 로딩: `CircularProgressIndicator` 중앙 표시.
  - 에러: `AppErrorState.fromError(error, onRetry: ...)`로 재시도 버튼. UI/UX 스펙의 토스트("캘린더를 불러오지 못했습니다")는 화면 자체 에러 위젯으로 대체.
  - 빈 상태: 그리드는 항상 그려지고, 선택일에 일정이 없으면 "이 날은 일정이 없습니다" 텍스트.
- **모달/시트/네비게이션**: 모달 없음. 일자 셀 탭은 `context.push`(스택 push), `+` 탭도 push.

### 일간 캘린더 (`daily_calendar_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` 타이틀 `"{month}월 {day}일 {요일}"` (한글 요일).
  - `_DateNavigator` — 좌/우 화살표 + "오늘" 버튼.
  - `_DailyTimeline` — 1시간 단위 그리드 (높이 60dp/시간), 좌측 시간 레이블 폭 48dp.
    - 표시 범위: 일정의 가장 이른 시작 시간 vs 08:00 중 작은 값 ~ 가장 늦은 종료 시간 vs 18:00 중 큰 값 + 1.
  - 일정 블록(`Positioned`로 시간 위치 계산):
    - 색상: `HOSTING/ATTENDING` → linkBlue 0.85, `AVAILABILITY` → primary500 0.30, `HOSTING_PRIVATE` → datingPink 0.85.
    - 최소 높이 30dp, 36dp 초과 시 시간 텍스트, 50dp 초과 시 location 추가.
  - FAB(`primary500` 원형, plus 아이콘).
- **사용자가 할 수 있는 액션**:
  - 좌/우 화살표 ▶ `_prevDay` / `_nextDay` (1일 ± 이동).
  - "오늘" 버튼 ▶ `_goToday` (DateTime.now()로 점프).
  - 일정 블록 탭 ▶ `_onTap(event)` (F10-02 라우팅 책임).
  - FAB 탭 ▶ `context.push('/profile/calendar/availability?date={dateStr}')` (해당 일자 가용성 신규 등록).
- **상태 분기**: 로딩(`CircularProgressIndicator`), 에러(`AppErrorState.fromError`), 빈 상태(`Icon(event_busy) + "이 날은 일정이 없습니다"` 중앙 표시).
- **모달/시트/네비게이션**: 모달 없음. 모든 전이가 `context.push`.

### API 호출 순서 (Provider/Repository 관점)

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

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **6주 × 7일 그리드 고정**: 월의 일수와 시작 요일에 맞춰 빈 셀 채움. 일/토 컬러(일=error500, 토=linkBlue) 강조.
- **마커 색상 매핑**: itemType → AppColors. (`HOSTING`/`ATTENDING`은 같이 linkBlue로 묶임)
- **타임라인 시간 범위 자동 조정**: 일정이 있으면 그 범위 + 여유, 없으면 기본 08:00~18:00.
- **블록 높이별 표시 조건**: 30dp 최소, 36dp 초과 시간 표시, 50dp 초과 location.
- **AVAILABILITY 블록 텍스트 색**: textPrimary (배경 투명도 30%이므로). 그 외 블록은 흰색.
- **무한스크롤/페이지네이션 없음**: 월/일 단위 단발 호출. 풀투리프레시도 별도 구현 없음 (재시도 버튼이 대체).
- **선택된 날짜 동기화**: 월간 화면에서 일자 탭 시 일간 화면이 push되며, 일간에서 뒤로 돌아오면 selectedDate 그대로 보존.
- **요일 라벨**: 월간 그리드 헤더는 `[일,월,화,수,목,금,토]` (일요일 시작), 일간 헤더는 `[월,화,수,목,금,토,일]` (월요일 시작 — Dart의 `DateTime.weekday`가 월=1 기반).
- **빈 상태 안내 문구**: 월간 = "이 날은 일정이 없습니다", 일간도 동일.
- **오늘 버튼 시각**: primary500 배경 + 흰색 텍스트, height 28~32dp 정도, 라운드 14dp.

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
| 후보 | frontend.md:6 | - **딥링크 / 알림**: 본 유닛에서는 직접적인 딥링크 매핑 미확인. (NotificationRouter 흐름은 다른 유닛 책임) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 이번 달 일정 한눈에 보기**: Given 로그인됨, 프로필 탭 진입. When 사용자가 해당 흐름을 실행하면 Then 사용자가 5월 일정의 분포를 시각적으로 파악, 특정 날짜 카드를 통해 "어떤 일정이 있는지" 텍스트 확인.
- **AC-02. 월 이동 시 자동 재조회**: Given 위 S1 종료 직후. When 사용자가 해당 흐름을 실행하면 Then 화살표 탭 횟수만큼 GET 호출이 누적되며, Provider 캐시(autoDispose)는 화면 이탈 시 해제.
- **AC-03. 오늘로 즉시 점프**: Given 월간 뷰가 "2026년 8월"을 표시 중. When 사용자가 해당 흐름을 실행하면 Then 캘린더가 "오늘" 컨텍스트로 정렬됨.
- **AC-04. 일자 셀 탭 → 일간 뷰**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 일자 단위 시간대별 일정을 시각적으로 확인.
- **AC-05. 빈 일자 / 일정 없는 날**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 일자에서 자연스럽게 가용성 등록 진입점이 노출.
- **AC-06. (에러) 네트워크 끊김 / 서버 오류**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 일시적 장애가 사용자 액션으로 회복 가능.
- **AC-07. (권한) 비로그인 사용자**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 로그인 화면. 캘린더 데이터 노출 없음.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
