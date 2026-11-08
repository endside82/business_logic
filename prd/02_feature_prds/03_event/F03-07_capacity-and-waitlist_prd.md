# F03-07. 정원 & 대기열 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

이벤트 정원/대기열 정책과 이미 들어와 있는 사람들의 흐름을 운영하는 기능이다. 현재 Flutter 화면에서 직접 수행할 수 있는 범위는 기본 정원·대기열·승인제·게스트 설정, 수동 승격, 강제 제거, 모집 마감·재개다. 모집 마감·재개는 정원 설정 화면 아래 「모집 상태」 구역에서 모임을 연 호스트에게만 보이고(정기모임 회차는 안 보임), 마감은 확인 창을 거친다. 정원 초과 허용·하드 상한은 바꾸는 입구가 없다(옛 `PATCH /capacity-settings` 는 서버·앱 모두 걷음). 참석자 자동 승격(다른 사용자 취소 또는 정원 증가 시 WAITING → ATTENDING)은 서버에서 일어난다. 이벤트 신청 행위 자체는 F03-05 범위다.

2026-07-29 현재 소스에서 기본 설정 화면(`GET/PUT /capacity/settings`)의 권한은 **host ∪ any co-host ∪ 클럽 ADMIN/OWNER**이고, 서버가 이를 `EventVo.canManageCapacity`로 계산해 Flutter 상세 행과 route guard에 그대로 내려준다. 이 권한은 출석 운영 권한(`canManageAttendance`)과 다르다. 수동 승격·강제 제거·참석 로그는 co-host의 `canManageAttendance`와 클럽 출석관리 권한을 요구한다. 또한 고급 초과정원 endpoint인 `PATCH /capacity-settings`는 여전히 host/co-host만 허용하므로 클럽 운영진 허용 범위가 기본 설정 endpoint와 다르다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 호스트 관점:
  - 이벤트 상세(`SCR-EV-002`) 의 호스트 액션바 / 더보기 메뉴 → "참석자 관리"
  - 동일 화면 → "대기열" 탭
  - 동일 화면 → "정원 설정"
  - 동일 화면 → "참석 로그" (F03-12 와 같은 화면 사용 — 호스트는 변경 로그 전체, 일반은 본인 관련만)
- 참가자 관점:
  - 이벤트 상세 → 참석자 프리뷰 → "참석자 목록" (참가자도 ATTENDING 만 조회)
  - 본인이 대기열인 경우 상단에 "대기 N번째" 카드 노출

## 2. 코드 위치

계약의 정본은 코드다. 서버: `AttendanceController`, `CapacityController`, `CapacitySettingsService`, `EventViewerContextService`, `WaitlistService`, `EventCapacitySettingsService`, `NotificationService`. 앱: `event_detail_screen.dart`, `attendee_list_screen.dart`, `waitlist_screen.dart`, `capacity_settings_screen.dart`, `attendance_log_screen.dart`, `app_router.dart`, `attendance_api.dart`.

## 3. 전체 동작 흐름

1. 화면 진입 시:
   - `attendeeListNotifierProvider(eventId)` ▶ `AttendanceRepository.getAttendees(eventId)` ▶ `GET /api/v1/events/{id}/capacity/attendees` (Flutter 의 `attendance_api.dart` 는 `getHostAttendees` / `getAttendees` 두 메서드를 두지만 둘 다 같은 List<AttendanceVo> 응답)
   - `waitlistNotifierProvider(eventId)` ▶ `AttendanceRepository.getWaitlist(eventId)` ▶ `GET /api/v1/events/{id}/waitlist`
   - `capacitySettingsNotifierProvider(eventId)` ▶ `AttendanceRepository.getCapacitySettings(eventId)` ▶ `GET /api/v1/events/{id}/capacity/settings`
2. 승격 (호스트):
   - `attendeeListNotifier.promote(userId)` ▶ `POST /api/v1/events/{id}/capacity/{userId}/promote` ▶ 응답으로 attendee 목록 invalidate, eventDetail invalidate
3. 제거 (호스트):
   - `attendeeListNotifier.remove(userId)` ▶ `DELETE /api/v1/events/{id}/capacity/{userId}` ▶ list invalidate
4. 정원 설정 변경:
   - `capacitySettingsNotifier.updateSettings(vo)` ▶ `PUT /api/v1/events/{id}/capacity/settings` ▶ 결과 state 갱신 + `eventDetailNotifierProvider(eventId)` invalidate
   - 화면 진입 행과 route redirect는 모두 서버 `EventVo.canManageCapacity`를 사용한다. host, 공동호스트, 클럽 ADMIN/OWNER가 통과한다.
5. 모집 마감/재개:
   - `capacitySettingsNotifier.closeRegistration() / reopenRegistration()` ▶ `POST /api/v1/events/{id}/registration/close|reopen` ▶ eventDetail invalidate
   - 정원 설정 화면의 「모집 상태」 구역이 이 명령을 부른다. 모집 중이면 「모집 마감」(확인 창 「모집을 마감할까요?」 뒤 전송), 마감했으면 「모집 다시 시작」 이다. 구역은 모임을 연 호스트이고 정기모임 회차가 아닐 때만 그린다. 공동 호스트·클럽 운영진도 정원 설정 화면은 열지만 이 구역은 보이지 않는다(서버도 `EVENT_NOT_OWNER`·`EVENT_IN_REGULAR_MEETING` 으로 거절).

## 3-1. 정원 초과 허용 정책 (v4.5 W1 신설)

기존 baseCapacity + waitlist 2축 정책 위에 **정원 초과 허용(overcapacity)** 과 **하드 상한(hardCapacityLimit)** 두 축을 더한 정책이다. 다만 두 칸을 바꾸는 입구는 없다. 호스트의 옛 `PATCH /capacity-settings` 창구는 차수 7 S22(C17)에서 걷었고, 두 칸은 기본값(허용 끔·상한 없음)으로 남는다. 그래서 아래 R2(`OVERCAPACITY`)는 지금 닿지 않는다. 본 정책은 W1 슬라이스에서 도입되었고, 정원 판정은 신청 시점이 아니라 **최종 ATTENDING 확정 시점**(`CapacityService.createAttendanceFromApplication` / `attend` / `confirmAttendanceFromPayment`)의 단일 헬퍼 `CapacityPolicy.decide(event, attendingCount)`가 책임진다.

### 핵심 컬럼 (event 테이블)

| 컬럼 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `overcapacity_allowed` | TINYINT(1) NOT NULL | 0 | true면 호스트가 baseCapacity 이상으로도 참석을 받을 수 있다 |
| `hard_capacity_limit` | INT NULL | NULL | `CapacityPolicy`를 거치는 신규 참석 확정 경로의 상한. NULL이면 해당 정책 경로에서 무한 |
| `base_capacity` (기존) | INT NOT NULL | — | 명목 정원. 참석 수 + 좌석 홀드(결제 대기 일행과 호스트가 확인하기 전의 계좌이체 일행 늘리기 신고 인원)보다 작게 줄이면 `CAPACITY_BELOW_ATTENDING`(409)로 거절 |

**Invariant**: `hard_capacity_limit IS NULL OR hard_capacity_limit >= base_capacity`. 위반 시 `ErrorCode.INVALID_HARD_CAPACITY_LIMIT(400013)` 반환. 다만 `WaitlistService.promoteRowManual`은 `CapacityPolicy`와 `hardCapacityLimit`을 검사하지 않고 `currentCapacity + 1`을 저장하므로, 수동 승격에서는 이 상한을 넘어갈 수 있다. 현재 이름과 달리 시스템 전체의 절대 상한은 아니다.

### CapacityPolicy 5-룰 매트릭스

`CapacityPolicy.decide(Event event, long attendingCount)`는 다음 5개 룰을 위에서 아래로 적용해 `CapacityDecision ∈ {ATTENDING, OVERCAPACITY, WAITING, FULL}` 한 값을 반환한다.

| # | 조건 | 결과 | 비고 |
|---|---|---|---|
| R1 | `attendingCount < baseCapacity` | `ATTENDING` | 정상 좌석 — capacity++ + `ChangeType.APPLIED_ATTENDING` |
| R2 | `attendingCount >= baseCapacity && overcapacityAllowed && (hardCapacityLimit == null OR attendingCount < hardCapacityLimit)` | `OVERCAPACITY` | 초과 좌석 — capacity++ + `ChangeType.OVERCAPACITY_APPROVED(9)` |
| R3 | `hardCapacityLimit != null && attendingCount >= hardCapacityLimit && waitlistEnabled` | `WAITING` | 결제 확정 경로에서는 호출되지 않는다 (`CAPACITY_FULL_AT_CONFIRMATION` 으로 fail) |
| R4 | `attendingCount >= baseCapacity && !overcapacityAllowed && waitlistEnabled` | `WAITING` | 결제 확정 경로에서는 호출되지 않는다 |
| R5 | 그 외 | `FULL` | `ErrorCode.CAPACITY_FULL` 또는 결제 확정 경로에서는 `CAPACITY_FULL_AT_CONFIRMATION(400012)` |

> 정원 초과 허용을 켜는 입구가 없어 `overcapacityAllowed=true` 조합은 생기지 않는다. 앱 `CapacitySettingsScreen` 에도 두 칸 입력이 없다.

### 자동 승인 이벤트의 즉시 ATTENDING 분기 (Q6)

`approvalRequired=false` + `prepaymentRequired=false` 자동 승인 이벤트에서 `apply`가 호출되면 `CapacityService.createAttendanceFromApplication`이 위 매트릭스를 평가하여 `ATTENDING` 또는 `OVERCAPACITY` 분기에서 즉시 ATTENDING으로 진입한다. `OVERCAPACITY` 분기는 `ChangeType.OVERCAPACITY_APPROVED(9)`로 기록하게 되어 있으나, 초과 허용을 켜는 입구가 없어 지금 닿지 않는다.

### 호스트 정원 변경 길

호스트의 옛 고급 창구 `PATCH /api/v1/events/{eventId}/capacity-settings`(정원 초과 허용·하드 상한까지 바꾸던 길)는 차수 7 S22(C17)에서 서버·앱 모두 걷었다. 운영자 정원 변경 창구도 차수 10 에서 걷었다.

호스트가 정원을 바꾸는 네 길(정원 설정 `PUT /capacity/settings`, 모임 수정, 클럽 모임 수정, 반복 일괄 수정)은 모두 정원 바꾸기 본체 `EventCapacitySettingsService.applyBaseCapacity` 하나를 지난다. 본체는 잠근 최신 행으로 판정한다.

1. 값이 같으면 아무것도 하지 않는다.
2. `event.status ∈ {DRAFT, OPEN}` 이 아니면 `INVALID_EVENT_STATUS` (Q7).
3. 하드 상한이 있으면 그보다 크게 두지 않는다(`INVALID_HARD_CAPACITY_LIMIT(400013)`).
4. 지금 참석 수(`current_capacity`)에 좌석 홀드(결제 대기 일행과 호스트가 확인하기 전의 계좌이체 일행 늘리기 신고 인원)를 더한 점유 좌석보다 작게 줄이면 `CAPACITY_BELOW_ATTENDING`(409)로 거절한다. 같으면 받는다.
5. 올렸으면 빈자리만큼 대기자를 승격한다(`PROMOTED_CAPACITY_INCREASE`).

### 정원 축소는 거절

정원을 참석 수 + 결제 대기 좌석 홀드 + 호스트가 확인하기 전의 계좌이체 일행 늘리기 신고 인원보다 작게 줄이는 요청은 거절한다(결정 Q2, 신고 인원은 2026-11-08 부터 센다). 이 좌석 홀드는 유료 잔여석, 정원 확대 자동 승격, 손 승격, 신청서 승인·신청 표지와 같은 한 셈이다. 모집 마감·재개는 호스트만 `POST registration/close`·`reopen` 으로 하고, `PUT capacity/settings` 에는 마감 칸이 없다. 기존 참석을 강제로 취소하지 않고, 감소로 초과 참석이 생기는 일도 없다. 옛 `ChangeType.CAPACITY_REDUCED(10)` 이력은 걷었고 번호는 비워 둔다.

### EventVo 노출 신규 필드 (D16)

`community_api/src/main/java/com/endside/community/event/vo/EventVo.java`에 다음 필드가 추가된다. 매핑은 `EventVoAssembler.assemble`이 책임진다.

| 필드 | 타입 | 비고 |
|---|---|---|
| `overcapacityAllowed` | `boolean` | 정책 그대로 노출 |
| `hardCapacityLimit` | `Integer` (nullable) | NULL = 무한 |
| `exceedingAttendees` | `int` | `max(0, currentCapacity - baseCapacity)` |
| `reservedPaymentPendingCount` | `int` | 단건 응답에만 lazy 조회. **EventSimpleVo와 목록 응답은 항상 0** (N+1 회피) |

### 결제 확정 race — CAPACITY_FULL_AT_CONFIRMATION

선입금 흐름(W2와 공유)에서 결제 확정 시점에 정원이 이미 가득 차 있을 race를 대비해, `CapacityService.confirmAttendanceFromPayment`도 동일 매트릭스를 적용한다. `WAITING/FULL` 결정이 떨어지면 `ErrorCode.CAPACITY_FULL_AT_CONFIRMATION(400012)`을 던지고, WALLET 경로는 트랜잭션 전체 롤백(지갑 차감 안 됨), BANK_TRANSFER 경로는 `event_payment.status=REFUND_REQUESTED` 전환 후 호스트 수동 환불을 유도한다. 자세한 결제 facade 동작은 F03-05의 `2.2 결제 확정 race` 참고.

## 4. 제품 규칙

### 권한
| 할 일 | 누가 |
|---|---|
| 정원 설정 보기·저장 | 호스트, 활성 공동호스트, 클럽 ADMIN·OWNER. 임의 로그인 사용자는 못 본다 |
| 참석자·대기 목록 | 위에 더해 클럽 출석 관리자, 참석 행이 있는 사람 |
| 승격·제거·참석 로그 | 호스트, 출석 권한이 있는 공동호스트, 클럽 출석 관리자 |
| 모집 마감·재개 | 모임을 연 호스트만. 공동호스트·클럽 운영진은 정원 설정을 열어도 못 한다. 정기모임 회차는 안 된다 |

### 정원 설정 저장
- DRAFT·OPEN 에서만 저장한다. 그 밖은 `INVALID_EVENT_STATUS` 다.
- 정원은 1 이상, 최대 대기 수는 0 이상이다.
- 대기를 끄거나 승인제를 꺼도 이미 있는 대기와 심사 대기 신청은 그대로다. 새 신청에만 적용한다.
- 모집 마감 여부는 이 저장으로 바꾸지 않고 마감·재개 명령으로만 바꾼다.
- 정원을 늘려 승격돼도 별도 안내는 없고, 현재 인원이 갱신되어 보인다.

### 수동 승격
- 정원 판정을 본다. 자리가 없으면 `CAPACITY_FULL` 이다. 승격도 상한을 넘기지 못한다.
- 제재 중인 회원은 거절한다. 게스트 행은 데려온 회원이 `ATTENDING` 일 때만 올린다(`GUEST_OWNER_NOT_ATTENDING`).
- 종료·취소 모임은 `EVENT_NOT_OPEN` 이고, 모집 마감한 OPEN 모임은 받는다. 다른 운영자가 먼저 올린 행은 `CONFLICT` 다.
- 유료 모임(참가비 > 0 이거나 선입금 정책이 켜짐)은 손 승격이 없다. 결제를 마친 사람은 대기에 두지 않으므로, 남은 대기 행을 손으로 올리면 결제 없는 참석이 된다. 409 `WAITLIST_PROMOTION_PAID_EVENT`(400043)로 거절하고 승격 표지도 거절이다. 무료 모임의 손 승격은 자리를 「참석 수 + 결제 대기로 잡아 둔 자리」 로 센다(2026-11-08). 잡아 둔 자리는 좌석 홀드(결제 대기 일행과 호스트가 확인하기 전의 계좌이체 일행 늘리기 신고 인원)다.
- 대기 명단에 사람이 있으면 모임을 유료로 바꿀 수 없다. 모임 수정·클럽 모임 수정의 선입금 정책 켜기, 포인트 결제 전환, 참가비를 적용하는 일정 변경(제안을 만들 때 포함)이 409 `EVENT_PAID_CONVERSION_WAITLIST_EXISTS`(400042)로 거절한다. 호스트가 대기자를 먼저 정리한다(2026-11-08).

### 자동 승격과 제재
- 유료 모임은 대기 없음이다. 결제한 사람은 대기에 두지 않고, 대기자가 있는 모임은 유료로 바꾸지 못한다. 그래서 결제 대기가 기한으로 끝나 풀린 자리는 대기자에게 넘기지 않고 다음 신청이 받는다(2026-11-08).
- 제재 대상은 건너뛰고 대기에 남긴다. 앞사람이 제재 중이어도 뒷사람은 승격한다. 제재가 풀리면 다음 승격 때 다시 후보가 된다.
- 종료·취소 모임에서는 승격하지 않는다.

### 호스트의 제거
- 결제가 살아 있거나(입금 신고·결제 완료·환불 대기) `CANCEL_PENDING_REFUND` 인 참가자와 일행은 제거하지 못한다(`EVENT_ATTENDEE_REMOVE_REQUIRES_REFUND`). 환불 경로로 먼저 정리한다. 보관금이 열린 비공개 선정자도 같다.
- 제거하면 그 참가자의 체크인 기록을 지우고, 그 체크인으로 나간 점수도 되돌린다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (호스트) 정원이 차서 대기열이 쌓인 후, 한 명을 수동 승격 | - 이벤트 status=OPEN, baseCapacity=10, currentCapacity=10 | 단골 사용자 ATTENDING + manuallyPromoted, 대기열 2명 남음, 호스트 화면 갱신 |
| S2 | (호스트) 정원을 늘려서 대기자 자동 승격 | - baseCapacity=10, ATTENDING=10, 대기열 8명 | 5명 자동 승격, 대기열 3명 남음, 5명 각각에 `WAITLIST_PROMOTED` 알림 생성 요청. 저장/비동기 push는 채널 설정에 따름 |
| S3 | (호스트) 노쇼 우려 사용자를 강제 제거 | - baseCapacity=10, ATTENDING=10 (그 중 노쇼 사용자 포함) | 노쇼 사용자 CANCELLED, 1번 대기자가 ATTENDING + promotedFromWaitlist=true |
| S4 | 모집 조기 마감 후 재개 | host가 정원 설정 화면의 「모집 마감」 을 확인 창에서 확정한 뒤 「모집 다시 시작」 을 누름 | `isClosed` 전환과 eventDetail invalidate. 공동 호스트·클럽 운영진과 정기모임 회차에는 구역이 보이지 않음 |
| S5 | (참가자) 자동 승격 | 본인이 대기열 1번 | 참가자 ATTENDING. `WAITLIST_PROMOTED` 생성 요청은 일어나지만 in-app/push 도달은 설정 및 비동기 발송 결과에 따름 |
| S6 | (호스트) 대기 중이 아닌 사용자를 승격 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (에러) 권한 없는 일반 사용자 정원 설정 접근 | event 1312 isClosed=false (sample_data.sql:1190 시드값) | event 1312 isClosed=false 복귀, 다른 메타 무변동, **mutation but self-rollback**. **출처: CapacitySettingsService.java:84-104** |
| S1-1 | (호스트) 정원 초과 허용을 켜는 길이 없다 | 옛 `PATCH /capacity-settings` 걷음(차수 7 S22) | 그 창구가 없고 `overcapacityAllowed` 는 기본값 false 로 남는다. 정원이 차면 새 신청은 대기 또는 `CAPACITY_FULL` |
| S1-2 | (호스트) 참석 수 + 좌석 홀드(결제 대기 일행·확인 전 계좌이체 일행 늘리기 신고)보다 작게 정원 축소 시도 | baseCapacity=10, currentCapacity=8, OPEN | `PUT /capacity/settings` baseCapacity=5 → 409 `CAPACITY_BELOW_ATTENDING`, 정원·참석 그대로. baseCapacity=8 은 받는다 |
| S1-3 | 하드 상한 | 상한을 두는 입구가 없어 늘 NULL | 정원 바꾸기 본체의 상한 검사(`INVALID_HARD_CAPACITY_LIMIT(400013)`)는 상한이 있을 때만 닿는다 |
| S1-4 | (호스트) CLOSED 이벤트 정원 조정 차단 (Q7) | event.status=CLOSED | `PUT /capacity/settings` 로 정원 값을 바꾸면 400 `INVALID_EVENT_STATUS` |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 사실 교정 | 서버 enum / Flutter parser | 서버 상태는 `WAITING`이며 Flutter parser는 호환 입력 `WAITLISTED`도 `waiting`으로 매핑한다. | 신규 계약/fixture는 서버 canonical 값 `WAITING` 사용 |
| 사실 교정 | `CapacitySettingsService` / Flutter 폼 | baseCapacity 최소값은 annotation이 아니라 service runtime validation이다. Flutter는 parse 실패 시 0을 전송하고 API 오류 toast를 표시한다. | 문서/테스트에서 `@Min` 근거 제거 |
| 사실 교정 | `capacity_settings_screen.dart` / `CapacitySettingsParam` | 폼은 기본 정원·대기열·조건부 최대 대기·승인제뿐 아니라 게스트 허용과 조건부 최대 게스트(1~9)도 관리한다. baseCapacity는 0 무제한이 아니라 최소 1이다. | UI surface/E2E 기대 라벨에 게스트 설정과 최소값 포함 |
| Gap | Flutter presentation caller 검색 | 모집 close/reopen은 Provider까지만 연결되어 있다. 초과정원 PATCH 는 서버·앱 모두 걷었다. `exceedingAttendees` 의 presentation 소비처는 없다. | CTA와 상태 표시를 구현하기 전까지 서버 전용 기능으로 취급 |
| Risk | `WaitlistService.promoteRowManual` | 수동 승급은 `CapacityPolicy`, baseCapacity, hardCapacityLimit을 모두 검사하지 않고 currentCapacity를 증가시킨다. | hard limit을 진짜 절대 상한으로 둘지, 운영자 override로 명시할지 결정 |
| Risk | `NotificationService.createNotification` | 승급 서비스는 알림 생성을 호출하지만 in-app/push 설정으로 생략될 수 있고 push는 비동기다. | 수용 기준을 “도달”이 아닌 생성 요청/설정별 결과로 검증 |

## 9. 수용 기준

- **AC-01. (호스트) 정원이 차서 대기열이 쌓인 후, 한 명을 수동 승격**: Given - 이벤트 status=OPEN, baseCapacity=10, currentCapacity=10 When 사용자가 해당 흐름을 실행하면 Then 단골 사용자 ATTENDING + manuallyPromoted, 대기열 2명 남음, 호스트 화면 갱신
- **AC-02. (호스트) 정원을 늘려서 대기자 자동 승격**: Given - baseCapacity=10, ATTENDING=10, 대기열 8명 When 사용자가 해당 흐름을 실행하면 Then 5명 자동 승격, 대기열 3명 남음, 5명 각각에 `WAITLIST_PROMOTED` 생성 요청. 실제 in-app/push 결과는 알림 설정에 따름
- **AC-03. (호스트) 노쇼 우려 사용자를 강제 제거**: Given - baseCapacity=10, ATTENDING=10 (그 중 노쇼 사용자 포함) When 사용자가 해당 흐름을 실행하면 Then 노쇼 사용자 CANCELLED, 1번 대기자가 ATTENDING + promotedFromWaitlist=true
- **AC-04. 모집 조기 마감 후 재개**: Given 모임을 연 host 인증 When 정원 설정 화면에서 「모집 마감」 을 확인 창에서 확정한 뒤 「모집 다시 시작」 을 누르면 Then `isClosed`가 true 후 false로 복귀하고 eventDetail이 invalidate된다. 공동 호스트·클럽 운영진·정기모임 회차에는 이 구역이 보이지 않는다.
- **AC-05. (참가자) 자동 승격**: Given 본인이 대기열 1번 When 빈자리가 생기면 Then 참가자 ATTENDING, `WAITLIST_PROMOTED` 생성 요청. 채널 비활성 시 저장/푸시 생략 가능
- **AC-06. (호스트) 대기 중이 아닌 사용자를 승격 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (에러) 권한 없는 일반 사용자 정원 설정 접근**: Given event 1312 isClosed=false (sample_data.sql:1190 시드값) When 사용자가 해당 흐름을 실행하면 Then event 1312 isClosed=false 복귀, 다른 메타 무변동, **mutation but self-rollback**. **출처: CapacitySettingsService.java:84-104**
- **AC-S1-1. 정원 초과 허용 입구 없음**: Given 옛 `PATCH /capacity-settings` 를 걷음 When 호스트가 정원 설정을 연다 Then 초과 허용·하드 상한 입력이 없고 `overcapacityAllowed=false` 로 남는다.
- **AC-S1-2. 정원 축소 거절**: Given baseCapacity=10, currentCapacity=8, OPEN When 호스트가 `PUT /capacity/settings` 로 `baseCapacity=5` 를 보낸다 Then 409 `CAPACITY_BELOW_ATTENDING`, 정원·참석은 그대로이고 참석 이력에 새 행이 없다. `baseCapacity=8` 은 받는다.
- **AC-S1-3. 하드 상한 검사**: Given 하드 상한이 있는 옛 행 When 상한보다 큰 정원을 보낸다 Then 400 `INVALID_HARD_CAPACITY_LIMIT(400013)`. 새 행은 상한이 NULL 이라 이 검사에 닿지 않는다.
- **AC-S1-4. CLOSED 이벤트 정원 조정 차단 (Q7)**: Given event.status=CLOSED When 호스트가 `PUT /capacity/settings` 로 정원 값을 바꾼다 Then 400 `INVALID_EVENT_STATUS` (DRAFT/OPEN만 허용).
