# F03-04. 이벤트 수정/생명주기 관리 (호스트) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트/공동호스트가 이벤트의 메타데이터를 수정하거나 상태를 전이시킨다. 상태 전이는 `DRAFT → OPEN → CLOSED|CANCELED`만 합법이며 엔티티의 `Event#publish()/close()/cancel()` 메서드가 검증한다. 일정 변경은 OPEN 상태에서만 가능하고 변경 즉시 참석자/대기자에게 FCM 알림을 발송한다. 취소 시 유료 이벤트는 ATTENDING 사용자에게 100% 환불(Unit 06 위임)을 시도하고 실패한 건은 `failed_refund` 테이블에 기록한다. 호스트는 참석자 전체에게 공지(`announce`)를 일괄 발송할 수 있다 (throttle 적용).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 호스트 액션바 또는 더보기 메뉴
- 마이 이벤트(F03-12) "주최 중" 탭 ▶ 카드 ▶ 상세 ▶ 호스트 액션바
- 알림(F12) "환불 실패" 또는 "변경 알림" 탭 ▶ 상세

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `RescheduleProposalController`, `EventService`, `EventCapacitySettingsService`, `EventAnnounceThrottleService`, `NotificationService`. 앱: `event_edit_screen.dart`, `event_detail_screen.dart`, `recurring_event_group_screen.dart`, `event_action_bar.dart`, `event_announce_dialog.dart`.

<!-- source-references:start -->
서버 창구: `EventController#updateEvent`, `EventController#deleteEvent`, `EventController#publishEvent`, `EventController#closeEvent`, `EventController#cancelEvent`, `RescheduleProposalController#createProposal`, `EventController#announceToAttendees`, `EventController#updateFutureEvents`, `EventController#cancelAllFutureEvents`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
- 옛 reschedule PATCH는 제거됐으며 일정 변경 제안 생성으로 연결한다.
- 같은 절에 함께 적힌 수정·취소 위치를 각각 연결했다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 권한 확인: `eventPermissionProvider(eventId)` — host/coHost/staff 여부
2. 발행: `eventLifecycleNotifierProvider.publishEvent(id)`
   - `EventRepository.publishEvent` ▶ `POST .../publish`
   - 성공 → `eventDetailNotifier(id).invalidate()` + `eventListNotifier.invalidate()`
3. 종료: `eventLifecycleNotifierProvider.closeEvent(id)` ▶ `POST .../close`
4. 취소: `eventLifecycleNotifierProvider.cancelEvent(id)` ▶ `POST .../cancel` (백엔드에서 환불 + 알림 일괄 처리, 클라는 결과만 반영)
5. 삭제: `eventLifecycleNotifierProvider.deleteEvent(id)` ▶ `DELETE /api/v1/events/{id}`
6. 메타 수정 (DRAFT): `eventEditNotifierProvider(id).submit()` ▶ `PATCH /api/v1/events/{id}`
7. 일정 변경: `EventRepository.rescheduleEvent(id, EventRescheduleParam)` ▶ `PATCH .../reschedule`
8. 공지 발송: `eventAnnounceNotifierProvider.announce(id, EventAnnounceParam)` ▶ `POST .../announce`
9. 반복 일괄 수정/취소: `recurringEventProvider`(가정) ▶ `PATCH /DELETE .../recurring`

## 4. 제품 규칙

- 상태 전이는 DRAFT→OPEN·CANCELED, OPEN→CLOSED·CANCELED 뿐이다. CLOSED·CANCELED 는 끝이고 되돌리지 못한다. 숨김은 상태가 아니라 운영자 표지다.
- 공개 뒤에도 소개(제목·설명·카테고리·대표 사진·본문 사진)는 고칠 수 있다. 일정·장소·가격 등 참가 조건은 전용 절차(F03-19)로만, 정원은 정원 설정(F03-07)으로만 바꾼다.
- 정원·정원 설정은 DRAFT·OPEN 에서만 바꾼다. 종료·취소 모임은 `INVALID_EVENT_STATUS` 다.
- 정원 축소로 기존 참석자가 빠지지 않는다. 올리면 빈자리만큼 대기자가 승격한다. 참석이 정원보다 많은 모임도 지금 정원보다 크게 올리는 것은 받는다(2026-10-31 사용자 결정).
- 정원 변경 자체의 알림은 없다. 승격이 일어나면 승격 알림이 따로 간다.
- 공지는 제목 100자, 본문 500자까지이고 둘 다 필수다. 외부 링크 개수를 제한해 광고·스팸 발송을 막는다.
- 공지 한도는 호스트마다 1분 3회, 하루 20회가 기본이다. 넘으면 `RATE_LIMIT_EXCEEDED`(공지 발송 한도 초과)다. 호스트 본인은 수신에서 빠진다.
- 모임 취소에서 일부 환불이 실패하면 호스트에게 별도 알림이 가고, 화면은 고객센터에서 처리한다고 안내한다.
- 오류의 뜻: `INVALID_EVENT_STATUS` 는 지금 상태에서 할 수 없음, `EVENT_NOT_OWNER` 는 권한 없음이다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | DRAFT 이벤트 수정 후 발행 (Happy Path) | 마이 이벤트 "주최 중" 탭에서 DRAFT 카드 확인. | 이벤트 OPEN, 목록(F03-01) 노출 시작. |
| S2 | OPEN 이벤트 일정 변경 + 참석자 알림 | 이벤트 OPEN, ATTENDING 6명 + WAITING 2명. | 일정 변경 + 8명 알림 발송. |
| S3 | 유료 이벤트 취소 + 자동 환불 | ATTENDING 4명, WAITING 1명. | 이벤트 CANCELED, 3건 환불 완료, 1건 failed_refund 등록. |
| S4 | 호스트가 참석자 전체 공지 발송 (C-03) | OPEN 이벤트, ATTENDING 10명. | 9명 푸시 수신. |
| S5 | 공지 발송 throttle 초과 | 동일 호스트, 1분 내에 여러 번 공지 시도. | 발송 차단. |
| S6 | DRAFT 이벤트 삭제 | 호스트. | 이벤트 삭제, 마이 이벤트 목록 갱신. |
| S7 | 발행된 이벤트를 삭제 시도 | 호스트. | 액션 차단. |
| S8 | 비호스트의 권한 위반 | 일반 사용자. | 차단. |
| S9 | 일정 변경 시 시간 검증 실패 | 호스트. | 사용자가 시각 재입력. |
| S10 | CLOSED/CANCELED 이벤트 수정 진입 차단 | `event.status ∈ {CLOSED, CANCELED}`. | 수정 진입 차단, 호스트가 다른 흐름으로 이동. |
| S11 | 호스트 위치 공유 안내 화면 | `event.status=OPEN`, 위치 공유 토글 ON 상태. | 호스트가 위치 공유 정책을 명시적으로 확인. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:152 | - **비즈니스 로직**: `RecurringEventUpdateService#updateFutureEvents` / `RecurringEventCreateService#cancelAllFutureEvents` (서비스 구현 미확인 — 본 단위에서는 진입점만) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:22 | [E2E 보강: seed_event_authoring_surface_test.dart::event_edit_host_surface / ::event_edit_open_lock_notice — 수정 화면 진입 시 "이벤트 수정" 헤더 + 안내 배너 두 줄("수정 시 참여자에게 알림이 발송됩니다", "모집이 시작된 이벤트는 일정과 정원을 변경할 수 없습니다") + "이벤트 제목 *", "카테고리 *" 라벨 노출. 즉 OPEN 상태에서는 일정/정원 필드가 lock 안내와 함께 readonly로 표시.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. DRAFT 이벤트 수정 후 발행 (Happy Path)**: Given 마이 이벤트 "주최 중" 탭에서 DRAFT 카드 확인. When 사용자가 해당 흐름을 실행하면 Then 이벤트 OPEN, 목록(F03-01) 노출 시작.
- **AC-02. OPEN 이벤트 일정 변경 + 참석자 알림**: Given 이벤트 OPEN, ATTENDING 6명 + WAITING 2명. When 사용자가 해당 흐름을 실행하면 Then 일정 변경 + 8명 알림 발송.
- **AC-03. 유료 이벤트 취소 + 자동 환불**: Given ATTENDING 4명, WAITING 1명. When 사용자가 해당 흐름을 실행하면 Then 이벤트 CANCELED, 3건 환불 완료, 1건 failed_refund 등록.
- **AC-04. 호스트가 참석자 전체 공지 발송 (C-03)**: Given OPEN 이벤트, ATTENDING 10명. When 사용자가 해당 흐름을 실행하면 Then 9명 푸시 수신.
- **AC-05. 공지 발송 throttle 초과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 발송 차단.
- **AC-06. DRAFT 이벤트 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이벤트 삭제, 마이 이벤트 목록 갱신.
- **AC-07. 발행된 이벤트를 삭제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 액션 차단.
- **AC-08. 비호스트의 권한 위반**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단.
- **AC-09. 일정 변경 시 시간 검증 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 시각 재입력.
- **AC-10. CLOSED/CANCELED 이벤트 수정 진입 차단**: Given `event.status ∈ {CLOSED, CANCELED}`. When 사용자가 해당 흐름을 실행하면 Then 수정 진입 차단, 호스트가 다른 흐름으로 이동.
- **AC-11. 호스트 위치 공유 안내 화면**: Given `event.status=OPEN`, 위치 공유 토글 ON 상태. When 사용자가 해당 흐름을 실행하면 Then 호스트가 위치 공유 정책을 명시적으로 확인.
