# F04-12. 클럽 이벤트 & 캘린더 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

클럽 멤버 전용 이벤트(`EventType.CLUB_MEETING`)를 OWNER/ADMIN이 만들고, DRAFT → OPEN → (CLOSED|CANCELED)로 운영한다. 게시 시 클럽원이 정원만큼 자동 참가되며, 이후 멤버가 자유 참석/취소할 수 있다. 월별 캘린더 뷰, 통계, 반복 이벤트 템플릿을 함께 제공.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ "캘린더" 탭 (SCR-CC-012)
- 클럽 상세 ▶ "이벤트" 탭 또는 (재정 영역) 이벤트 목록 (SCR-CF-007)
- 푸시 "새 클럽 모임 등록 / '러닝크루': '한강 러닝' 모임이 등록되었습니다" 탭 ▶ 이벤트 상세
- 캘린더의 날짜 셀 탭 ▶ 그 날 이벤트 리스트

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubEventController`, `WalletService`, `EventViewerContextService`, `NotificationService`. 앱: `club_calendar_screen.dart`, `club_event_list_screen.dart`, `club_event_stats_screen.dart`, `club_recurring_event_screen.dart`, `event_detail_screen.dart`, `calendar_month_view.dart`, `calendar_day_events.dart`, `event_status_tabs.dart`, `club_event_card.dart`, `event_attendance_button.dart`.

<!-- source-references:start -->
서버 창구: `ClubEventController#createClubEvent`, `ClubEventController#publishClubEvent`, `ClubEventController#cancelClubEvent`, `ClubEventController#updateClubEvent`, `ClubEventController#deleteClubEvent`, `ClubEventController#getClubEvents`, `ClubEventController#getUpcomingClubEvents`, `ClubEventController#getClubEvent`, `ClubEventController#joinClubEvent`, `ClubEventController#leaveClubEvent`, `ClubEventController#getClubEventAttendees`, `ClubEventController#getClubEventCalendar`, `ClubEventController#getClubEventStatistics`, `ClubEventController#createRecurringEvent`, `ClubEventController#getRecurringEventTemplates`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **캘린더 진입**: `clubCalendarNotifierProvider(clubId, year, month)` ▶ `ClubCalendarRepository.getCalendar(year, month)` ▶ `GET /events/calendar`
2. **월 변경**: 새 (year, month)로 provider family 호출 → 자동 fetch
3. **이벤트 목록**: `clubEventListNotifierProvider(clubId, status)` ▶ `ClubEventManageRepository.getEvents(...)` ▶ `GET /events?status=...`
4. **참석**: `clubEventAttendanceNotifier.attend(eventId)` ▶ `POST /attendees` ▶ optimistic 또는 invalidate `clubEventListProvider`
5. **참석 취소**: `cancelAttendance(eventId)` ▶ `DELETE /attendees/me` ▶ invalidate
6. **통계**: `clubEventStatsNotifierProvider(clubId)` ▶ `GET /events/statistics`
7. **반복 이벤트**: `clubRecurringEventNotifier` ▶ `POST/GET /events/recurring`

## 4. 제품 규칙

- 반복 일정은 매주, 격주, 매월이다. 회차는 1~52회, 한 번에 만드는 일정은 100개까지다.
- 게시, 취소, 대기 승격은 알림을 보낸다.
- 종료되거나 취소된 일정의 참석 버튼은 눌리지 않는다.

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
