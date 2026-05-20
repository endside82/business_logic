# F04-12. 클럽 이벤트 & 캘린더 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-12_club-events-calendar -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-12_club-events-calendar`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽 멤버 전용 이벤트(`EventType.CLUB_MEETING`)를 OWNER/ADMIN이 만들고, DRAFT → OPEN → (CLOSED|CANCELED)로 운영한다. 게시 시 클럽원이 정원만큼 자동 참가되며, 이후 멤버가 자유 참석/취소할 수 있다. 월별 캘린더 뷰, 통계, 반복 이벤트 템플릿을 함께 제공.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ "캘린더" 탭 (SCR-CC-012)
- 클럽 상세 ▶ "이벤트" 탭 또는 (재정 영역) 이벤트 목록 (SCR-CF-007)
- 푸시 "새 클럽 모임 등록 / '러닝크루': '한강 러닝' 모임이 등록되었습니다" 탭 ▶ 이벤트 상세
- 캘린더의 날짜 셀 탭 ▶ 그 날 이벤트 리스트

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-12_club-events-calendar/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-12_club-events-calendar/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-12_club-events-calendar/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-12_club-events-calendar/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:106` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:120` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:136` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:150` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:165` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:177` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:189` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:205` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:220` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:235` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:249` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:52` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:66` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:80` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java:93` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **캘린더 진입**: `clubCalendarNotifierProvider(clubId, year, month)` ▶ `ClubCalendarRepository.getCalendar(year, month)` ▶ `GET /events/calendar`
2. **월 변경**: 새 (year, month)로 provider family 호출 → 자동 fetch
3. **이벤트 목록**: `clubEventListNotifierProvider(clubId, status)` ▶ `ClubEventManageRepository.getEvents(...)` ▶ `GET /events?status=...`
4. **참석**: `clubEventAttendanceNotifier.attend(eventId)` ▶ `POST /attendees` ▶ optimistic 또는 invalidate `clubEventListProvider`
5. **참석 취소**: `cancelAttendance(eventId)` ▶ `DELETE /attendees/me` ▶ invalidate
6. **통계**: `clubEventStatsNotifierProvider(clubId)` ▶ `GET /events/statistics`
7. **반복 이벤트**: `clubRecurringEventNotifier` ▶ `POST/GET /events/recurring`

## 4. 서버 계약

### 개요

클럽 멤버 전용 이벤트(`EventType.CLUB_MEETING`)를 OWNER/ADMIN이 만들고, DRAFT → OPEN → (CLOSED|CANCELED)로 운영한다. 게시 시 클럽원이 정원만큼 자동 참가되며, 이후 멤버가 자유 참석/취소할 수 있다. 월별 캘린더 뷰, 통계, 반복 이벤트 템플릿을 함께 제공.

> 일반 이벤트(Unit 03)와 다른 점: 클럽 멤버십 검증, 게시 시 자동 enroll, 캘린더/통계/반복 일정 추가, BUSINESS 클럽은 구독 만료 시 차단.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/clubs/{clubId}/events` | `ClubEventController#createClubEvent` | ADMIN/OWNER | DRAFT 생성 |
| GET | `/api/v1/clubs/{clubId}/events` | `#getClubEvents` | 멤버 | 목록 (status 필터) |
| GET | `/api/v1/clubs/{clubId}/events/upcoming` | `#getUpcomingClubEvents` | 멤버 | 예정 이벤트 |
| GET | `/api/v1/clubs/{clubId}/events/{eventId}` | `#getClubEvent` | 멤버 | 상세 |
| PATCH | `/api/v1/clubs/{clubId}/events/{eventId}` | `#updateClubEvent` | ADMIN/OWNER, DRAFT만 | 수정 |
| DELETE | `/api/v1/clubs/{clubId}/events/{eventId}` | `#deleteClubEvent` | ADMIN/OWNER, DRAFT만 | 삭제 |
| POST | `/api/v1/clubs/{clubId}/events/{eventId}/publish` | `#publishClubEvent` | ADMIN/OWNER | DRAFT → OPEN, 자동 참가 |
| POST | `/api/v1/clubs/{clubId}/events/{eventId}/cancel` | `#cancelClubEvent` | ADMIN/OWNER | OPEN → CANCELED, 환불 |
| POST | `/api/v1/clubs/{clubId}/events/{eventId}/attendees` | `#joinClubEvent` | 멤버 | 참가 등록(또는 대기열) |
| DELETE | `/api/v1/clubs/{clubId}/events/{eventId}/attendees/me` | `#leaveClubEvent` | 멤버 | 참가 취소 + 대기 승격 |
| GET | `/api/v1/clubs/{clubId}/events/{eventId}/attendees` | `#getClubEventAttendees` | 멤버 | 참가자 목록 (List) |
| GET | `/api/v1/clubs/{clubId}/events/calendar` | `#getClubEventCalendar` | 멤버 | 월별 캘린더 |
| GET | `/api/v1/clubs/{clubId}/events/statistics` | `#getClubEventStatistics` | ADMIN/OWNER | 이벤트 통계 |
| POST | `/api/v1/clubs/{clubId}/events/recurring` | `#createRecurringEvent` | ADMIN/OWNER | 반복 이벤트 일괄 생성 |
| GET | `/api/v1/clubs/{clubId}/events/recurring` | `#getRecurringEventTemplates` | 멤버 | 반복 이벤트 템플릿 목록 |

> **결제·정산 연계**: 유료 이벤트 취소 시 환불은 `WalletService.refundByHostCancel` (Unit 결제/지갑에 위임).

### 의존 단위 / 외부 시스템

- **Unit 03 (Event)**: `Event`, `EventAttendance`, `EventRepository`, `EventQueryRepository`, `EventViewerContextService`, `EventSimpleVo` 재사용. 이벤트 핵심 도메인은 Unit 03이며 본 Unit은 클럽 컨텍스트 래핑.
- **Unit 결제/지갑**: `WalletService.refundByHostCancel` (취소 환불). 본 Unit에서는 호출만, 회계 처리는 위임.
- **Unit 알림**: `NotificationService.createNotification`(`CLUB_EVENT_PUBLISHED`, `EVENT_CANCELLED`, `WAITLIST_PROMOTED`).
- **F04-16 (구독)**: BUSINESS 클럽은 구독 만료 시 생성/게시/참가 차단.
- **외부**: FCM (알림 발송), DB(events / event_attendance / notification 테이블).

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ "캘린더" 탭 (SCR-CC-012)
- 클럽 상세 ▶ "이벤트" 탭 또는 (재정 영역) 이벤트 목록 (SCR-CF-007)
- 푸시 "새 클럽 모임 등록 / '러닝크루': '한강 러닝' 모임이 등록되었습니다" 탭 ▶ 이벤트 상세
- 캘린더의 날짜 셀 탭 ▶ 그 날 이벤트 리스트

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/clubs/:clubId/community/calendar` | `community/screens/club_calendar_screen.dart` | 월별 캘린더 + 일별 리스트 (SCR-CC-012) |
| `/clubs/:clubId/events` | `finance/screens/club_event_list_screen.dart` | 이벤트 목록 (SCR-CF-007) |
| `/clubs/:clubId/events/stats` | `finance/screens/club_event_stats_screen.dart` | 통계 (SCR-CF-008) |
| `/clubs/:clubId/events/recurring` | `finance/screens/club_recurring_event_screen.dart` | 반복 이벤트 |

라우트 상수: `Routes.clubCalendar`(`...:61`), `clubEvents`/`clubEventStats`/`clubRecurringEvents`(`...:71-73`).

> 이벤트 상세 화면 자체는 Unit 03(Event)의 `event_detail_screen.dart` 재사용 (클럽 컨텍스트 배지만 추가).

### 화면별 구성 요소 & 액션

### 캘린더 (`club_calendar_screen.dart`)
- **사용자가 보는 것** (SCR-CC-012):
  - 월 네비게이션 헤더: `[<]` 2025년 2월 `[>]`
  - 요일 헤더 (일~토, 일=빨강 / 토=파랑)
  - 날짜 셀: 숫자 + 이벤트 도트(Primary) — 위젯 `widgets/calendar_month_view.dart`
  - 오늘 표시 (Primary outline), 선택된 날짜 (Primary fill)
  - 하단 일별 이벤트 리스트 (`calendar_day_events.dart`): 이벤트명, 시간, 장소, 참석 현황
- **액션**:
  - 좌/우 화살표 ▶ `clubCalendarNotifier.changeMonth(±1)` ▶ `GET /events/calendar?year=&month=`
  - 날짜 셀 탭 ▶ 선택 날짜 갱신, 그 날 이벤트만 하단에 표시
  - 이벤트 카드 탭 ▶ 이벤트 상세로 (Unit 03 화면 사용)
- **상태 분기**: 빈 날짜 "이 날에는 예정된 이벤트가 없습니다", 로딩 시 캘린더 회색 처리.

### 이벤트 목록 (`club_event_list_screen.dart`)
- **사용자가 보는 것** (SCR-CF-007):
  - 우상단 📊 아이콘 (OWNER/ADMIN만)
  - 상태 필터 탭 (`event_status_tabs.dart`): 예정 / 진행중 / 종료
  - 이벤트 카드 (`finance/widgets/club_event_card.dart`): 이미지, 제목, 날짜, 장소, 참석 현황, 참석 버튼
  - FAB(+) (OWNER/ADMIN만) → 이벤트 생성 (Unit 03 생성 화면 + clubId 컨텍스트)
- **액션**:
  - 탭 전환 ▶ `GET /events?status=OPEN|CLOSED|...`
  - 카드 탭 ▶ 이벤트 상세
  - 참석 버튼 (`event_attendance_button.dart`): 상태별 분기
    - 미참석 → "참석하기" → `POST /attendees`
    - 참석 완료 → "참석 완료" → 탭 시 취소 확인 → `DELETE /attendees/me`
    - 정원 초과 → "대기 등록" → 동일 POST (서버에서 WAITING으로 INSERT)
    - 종료/취소됨 → 비활성
  - 📊 ▶ 통계 화면

### 이벤트 통계 (`club_event_stats_screen.dart`)
- **사용자가 보는 것** (SCR-CF-008):
  - 기간 필터 (1/3/6/12개월) — SegmentedControl
  - 개요 4개 카드: 전체 이벤트 / 평균 참석률 / 총 참석자 / 이벤트당 평균 (`event_stats_overview.dart`)
  - 월별 추이 LineChart (`event_trend_chart.dart`)
  - 참석률 분포 Histogram (`attendance_histogram.dart`)
  - 인기 이벤트 TOP 5 (`popular_events_list.dart`)
  - 요일별 분포 BarChart (`weekday_distribution_chart.dart`)
- **데이터**: `GET /events/statistics` → `ClubEventStats`
- **권한**: OWNER/ADMIN만 진입 (UI 가드)

### 반복 이벤트 (`club_recurring_event_screen.dart`)
- 반복 템플릿 생성/조회. 위젯·필드는 `RecurringEventParam` 매핑:
  - 반복 유형 칩(WEEKLY/BIWEEKLY/MONTHLY)
  - 요일 선택 (WEEKLY/BIWEEKLY) 또는 일자 선택 (MONTHLY)
  - 시간(LocalTime), 시작일/종료일 또는 횟수
  - 위치/정원/가격
- **액션**: 생성 → `POST /events/recurring`, 목록 ▶ `GET /events/recurring`

### API 호출 순서 (Provider/Repository 관점)

1. **캘린더 진입**: `clubCalendarNotifierProvider(clubId, year, month)` ▶ `ClubCalendarRepository.getCalendar(year, month)` ▶ `GET /events/calendar`
2. **월 변경**: 새 (year, month)로 provider family 호출 → 자동 fetch
3. **이벤트 목록**: `clubEventListNotifierProvider(clubId, status)` ▶ `ClubEventManageRepository.getEvents(...)` ▶ `GET /events?status=...`
4. **참석**: `clubEventAttendanceNotifier.attend(eventId)` ▶ `POST /attendees` ▶ optimistic 또는 invalidate `clubEventListProvider`
5. **참석 취소**: `cancelAttendance(eventId)` ▶ `DELETE /attendees/me` ▶ invalidate
6. **통계**: `clubEventStatsNotifierProvider(clubId)` ▶ `GET /events/statistics`
7. **반복 이벤트**: `clubRecurringEventNotifier` ▶ `POST/GET /events/recurring`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | ADMIN이 정기 모임을 만들어 게시 → 클럽원 자동 참가 | 클럽 ADMIN, "한강 러닝 2/15"을 멤버 20명에게 알리고자 함. | events 1행, event_attendance 20행, notification × (memberCount-1)행, FCM. |
| S2 | 일반 멤버가 캘린더로 이벤트를 보고 참석 | 일반 MEMBER, 푸시 받고 캘린더로 이동. | event_attendance 1행 추가. |
| S3 | 정원 초과 → 대기 등록 | currentCapacity == baseCapacity (정원 가득), `waitlistEnabled=true`. | WAITING 1행. |
| S4 | 누군가 참가 취소 → 대기열 1번 자동 승격 | 정원 가득 + WAITING 3명. | A 행 삭제, B 행 ATTENDING로 갱신. |
| S5 | ADMIN이 OPEN 이벤트 취소 → 유료 이벤트 환불 | 유료 이벤트(price=10,000) 참가자 10명 결제 완료. | events.status=CANCELED, 지갑/회계는 결제·정산 Unit이 처리. |
| S6 | DRAFT 상태에서만 수정/삭제 가능 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | BUSINESS 클럽 구독 만료 시 게시/참가 차단 | BUSINESS 클럽, `subscriptionExpiresAt < now`. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 반복 이벤트 일괄 생성 | ADMIN, 매주 토요일 정기 러닝을 12주간 일괄 생성. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | ADMIN이 이벤트 통계 확인 | 시드 클럽에 다양한 상태의 이벤트(현재월 + 다음달) 존재. | 사용자는 status 탭으로 이벤트를 필터링하거나 FAB로 새 이벤트 생성 화면에 진입할 수 있다. |

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
| 후보 | backend.md:232 | - **권한**: 멤버 (스펙상 ADMIN/OWNER 화면이지만 서버 측 추가 차단 코드는 `(미확인)` — `validateMembership`만 호출) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:254 | - **로직**: 위임 `ClubRecurringEventService#createRecurringEvent` (서비스 구현 미확인 — 본 문서는 컨트롤러 시그니처 기반) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:81 | 2. `POST /events/recurring` → 서비스가 12개 Event 인스턴스 생성 (서비스 구현 미확인 — 컨트롤러 시그니처 기반) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:89 | 4. 기간 필터 변경 시 재호출 (현재 서버는 기간 파라미터 미지원 — 클라이언트 표시 결정) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:99 | ### S2 보강 — 캘린더 다음달 chevron 네비게이션 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:110 | ### S9 보강 — 이벤트 통계 화면 헤더 라벨 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:118 | - S9에서 명시한 4개 개요 카드 / 참석률 / TOP 5 / 요일별 차트는 surface 단계에서 본 E2E가 직접 검증하지 않으나, 화면 진입 자체와 핵심 헤더 노출은 본 보강이 보장한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. ADMIN이 정기 모임을 만들어 게시 → 클럽원 자동 참가**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then events 1행, event_attendance 20행, notification × (memberCount-1)행, FCM.
- **AC-02. 일반 멤버가 캘린더로 이벤트를 보고 참석**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then event_attendance 1행 추가.
- **AC-03. 정원 초과 → 대기 등록**: Given currentCapacity == baseCapacity (정원 가득), `waitlistEnabled=true`. When 사용자가 해당 흐름을 실행하면 Then WAITING 1행.
- **AC-04. 누군가 참가 취소 → 대기열 1번 자동 승격**: Given 정원 가득 + WAITING 3명. When 사용자가 해당 흐름을 실행하면 Then A 행 삭제, B 행 ATTENDING로 갱신.
- **AC-05. ADMIN이 OPEN 이벤트 취소 → 유료 이벤트 환불**: Given 유료 이벤트(price=10,000) 참가자 10명 결제 완료. When 사용자가 해당 흐름을 실행하면 Then events.status=CANCELED, 지갑/회계는 결제·정산 Unit이 처리.
- **AC-06. DRAFT 상태에서만 수정/삭제 가능**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. BUSINESS 클럽 구독 만료 시 게시/참가 차단**: Given BUSINESS 클럽, `subscriptionExpiresAt < now`. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 반복 이벤트 일괄 생성**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. ADMIN이 이벤트 통계 확인**: Given 시드 클럽에 다양한 상태의 이벤트(현재월 + 다음달) 존재. When 사용자가 해당 흐름을 실행하면 Then 사용자는 status 탭으로 이벤트를 필터링하거나 FAB로 새 이벤트 생성 화면에 진입할 수 있다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
