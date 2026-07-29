# F03-07. 정원 & 대기열 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-22; unit: business_logic/units/03_event/F03-07_capacity-and-waitlist -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-07_capacity-and-waitlist`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 정원/대기열 정책과 이미 들어와 있는 사람들의 흐름을 운영하는 기능이다. 현재 Flutter 화면에서 직접 수행할 수 있는 범위는 기본 정원·대기열·승인제·게스트 설정, 수동 승격, 강제 제거다. 모집 마감/재개는 서버 API부터 Repository·Provider까지 존재하지만 **호출하는 화면 CTA가 없고**, 초과정원/하드 상한 `PATCH /capacity-settings`도 API·Repository까지만 있어 앱에서 조작할 수 없다. 참석자 자동 승격(다른 사용자 취소 또는 정원 증가 시 WAITING → ATTENDING)은 서버에서 일어난다. 이벤트 신청 행위 자체는 F03-05 범위다.

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

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-07_capacity-and-waitlist/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-07_capacity-and-waitlist/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-07_capacity-and-waitlist/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-07_capacity-and-waitlist/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/capacity/controller/AttendanceController.java:108` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/AttendanceController.java:120` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/AttendanceController.java:131` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/AttendanceController.java:142` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/AttendanceController.java:153` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/AttendanceController.java:74` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/AttendanceController.java:85` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:107` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:115` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:124` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:48` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:64` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:73` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:82` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:91` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:99` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/service/CapacitySettingsService.java` | 기본 설정 GET/PUT 권한: host ∪ any co-host ∪ 클럽 ADMIN/OWNER |
| `community_api/src/main/java/com/endside/community/event/service/EventViewerContextService.java` | `canManageCapacity`를 위 기본 설정 권한과 같은 식으로 계산 |
| `community_app/lib/core/router/app_router.dart`, `event_detail_screen.dart` | route guard와 `수용인원 설정` 행이 `canManageCapacity` 직접 소비 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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
   - 위 Provider 메서드를 호출하는 Flutter screen/widget은 현재 없다. 따라서 앱의 정상 UI만으로는 마감/재개할 수 없다.

## 3-1. 정원 초과 허용 정책 (v4.5 W1 신설)

기존 baseCapacity + waitlist 2축 정책 위에 **정원 초과 허용(overcapacity)** 과 **하드 상한(hardCapacityLimit)** 두 축을 더해 호스트가 운영 중인 이벤트의 정원 운영 폭을 직접 조절한다. 본 정책은 W1 슬라이스에서 도입되었고, 정원 판정은 신청 시점이 아니라 **최종 ATTENDING 확정 시점**(`CapacityService.createAttendanceFromApplication` / `attend` / `confirmAttendanceFromPayment`)의 단일 헬퍼 `CapacityPolicy.decide(event, attendingCount)`가 책임진다.

### 핵심 컬럼 (event 테이블)

| 컬럼 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `overcapacity_allowed` | TINYINT(1) NOT NULL | 0 | true면 호스트가 baseCapacity 이상으로도 참석을 받을 수 있다 |
| `hard_capacity_limit` | INT NULL | NULL | `CapacityPolicy`를 거치는 신규 참석 확정 경로의 상한. NULL이면 해당 정책 경로에서 무한 |
| `base_capacity` (기존) | INT NOT NULL | — | 명목 정원. 축소 가능, 단 기존 ATTENDING은 유지 |

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

> 정책상 경고가 필요한 조합: `overcapacityAllowed=true && hardCapacityLimit=null && waitlistEnabled=true`이면 waitlist가 무의미해진다. 그러나 현재 Flutter `CapacitySettingsScreen`에는 `overcapacityAllowed`/`hardCapacityLimit` 입력이나 이 경고가 없고, 고급 PATCH 호출자도 없다.

### 자동 승인 이벤트의 즉시 ATTENDING 분기 (Q6)

`approvalRequired=false` + `prepaymentRequired=false` 자동 승인 이벤트에서 `apply`가 호출되면 `CapacityService.createAttendanceFromApplication`이 위 매트릭스를 평가하여 `ATTENDING` 또는 `OVERCAPACITY` 분기에서 즉시 ATTENDING으로 진입한다. `OVERCAPACITY` 분기는 `ChangeType.OVERCAPACITY_APPROVED(9)`로 `event_attendance_log`에 기록된다.

### 호스트 정원 조정 엔드포인트 (별도 신설)

기존 `EventService.updateEvent`는 DRAFT만 허용하므로, OPEN 운영 중 정원 토글에는 **별도 서비스**가 필요하다. 신규 서비스는 `community_api/src/main/java/com/endside/community/event/service/EventCapacitySettingsService.java`로 분리됨 (D9).

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| PATCH | `/api/v1/events/{eventId}/capacity-settings` | `EventController#updateCapacitySettings` (위임 → `EventCapacitySettingsService.updateCapacitySettings`) | 호스트/공동호스트 | DRAFT/OPEN 상태에서만 `baseCapacity / overcapacityAllowed / hardCapacityLimit` 변경 (Q7: CLOSED 불가) |

요청 바디(`EventCapacitySettingsParam`, `community_api/src/main/java/com/endside/community/event/param/EventCapacitySettingsParam.java`):

```json
{
  "baseCapacity": 5,                  // service validation: 1 이상, null이면 변경 안 함
  "overcapacityAllowed": true,        // null이면 변경 안 함
  "hardCapacityLimit": 10,            // service validation: 1 이상, null이면 변경 안 함
  "clearHardCapacityLimit": false     // true면 hardCapacityLimit을 NULL로 set
}
```

검증 순서:

1. `EventAuthorizationService.assertHostOrCoHost(event, userId)` — host/cohost 외 403.
2. `event.status ∈ {DRAFT, OPEN}` 검증 — 아니면 `INVALID_EVENT_STATUS` (Q7).
3. hardLimit invariant — `hardCapacityLimit < baseCapacity`이면 `INVALID_HARD_CAPACITY_LIMIT(400013)`.
4. 변경 적용 후 `EventVoAssembler.assemble(event, hostUserId)`로 응답.

Flutter에는 `EventApi.updateCapacitySettings`와 `EventRepository.updateCapacitySettings` 및 요청 model은 있으나 이를 호출하는 Riverpod provider/screen/widget이 없다. `CapacitySettingsScreen`은 다른 계약인 `CapacitySettingsVo`를 구성해 `PUT /capacity/settings`만 호출하며 초과정원 세 필드를 렌더링하지 않는다. `EventVo.exceedingAttendees` 역시 현재 presentation 소비처가 없어 초과 인원 badge는 표시되지 않는다.

### 정원 축소 시 기존 ATTENDING 유지

`baseCapacity`를 현재 `currentCapacity` 아래로 축소해도 **기존 ATTENDING은 강제 취소되지 않는다**. 이 결과로 `exceedingAttendees = max(0, currentCapacity - baseCapacity)`가 양수가 되며, EventVo에 노출된다. 동시에 `event_attendance_log`에 `ChangeType.CAPACITY_REDUCED(10)` 1행이 호스트 user_id로 기록된다. metadata 예시:

```json
{"reason":"CAPACITY_REDUCED","prevBase":10,"newBase":5,"exceeding":3}
```

오버캡 신규 ATTENDING도 동일하게 audit log에 기록된다:

```json
{"reason":"OVERCAPACITY","baseCapacity":5,"newCount":6}
```

`ChangeType`은 `community_api/src/main/java/com/endside/community/capacity/constants/ChangeType.java`에 9/10번으로 등록됨.

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

## 4. 서버 계약

### 개요

서버 계약은 기본 설정·초과정원 설정·모집 마감/재개·승격·제거까지 제공한다. 현재 Flutter 사용자 표면은 기본 설정·승격·제거만 연결되어 있고, 초과정원 PATCH와 마감/재개는 앱 UI에 연결되지 않았다. 참석자 자동 승격(다른 사용자 취소 또는 정원 증가 시 1번 대기자가 ATTENDING)은 서버 side effect다.

v4.5 W1 도입 이후, 정원 정책은 위 §3-1에서 정의한 `CapacityPolicy.decide` 매트릭스로 단일화되었다. baseCapacity·waitlist 외에 `overcapacityAllowed`/`hardCapacityLimit` 두 축이 추가되어 호스트가 운영 중에도 정원 운영 폭을 조절할 수 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/capacity/settings` | `CapacityController#getSettings` | host/공동호스트/클럽 ADMIN·OWNER | 정원/대기열 정책 조회. 임의 로그인 사용자 조회는 차단 |
| PUT | `/api/v1/events/{eventId}/capacity/settings` | `CapacityController#updateSettings` | host/공동호스트/클럽 ADMIN·OWNER | 정원·대기열·승인제 설정 변경 (정원 증가 시 대기열 자동 승격) |
| PATCH | `/api/v1/events/{eventId}/capacity` | `AttendanceController#updateCapacity` | host/공동호스트/클럽 ADMIN·OWNER | 같은 `CapacitySettingsService`를 쓰는 플랜 호환 경로 |
| GET | `/api/v1/events/{eventId}/capacity/attendees` | `CapacityController#getAttendees` | host/공동호스트/클럽 출석관리자/attendance 행 보유자 | ATTENDING 참석자 목록 (닉네임 N+1 최적화) |
| GET | `/api/v1/events/{eventId}/attendees` | `AttendanceController#getAttendees` | 같음 | 동일 (플랜 호환 경로) |
| GET | `/api/v1/events/{eventId}/capacity/waitlist` | `CapacityController#getWaitlist` | host/공동호스트/클럽 출석관리자/attendance 행 보유자 | WAITING 대기자 목록 (waitlistOrder 정렬) |
| GET | `/api/v1/events/{eventId}/waitlist` | `AttendanceController#getWaitlist` | 같음 | 동일 (플랜 호환 경로) |
| POST | `/api/v1/events/{eventId}/capacity/{userId}/promote` | `CapacityController#promoteManual` | host/co-host(`canManageAttendance`)/클럽 출석관리자 | 대기자 → ATTENDING 수동 승격. base/hard 상한을 검사하지 않고 알림 생성을 요청 |
| POST | `/api/v1/events/{eventId}/attendees/{userId}/promote` | `AttendanceController#promoteManual` | 같음 | 동일 (플랜 호환 경로) |
| DELETE | `/api/v1/events/{eventId}/capacity/{userId}` | `CapacityController#removeByHost` | host/co-host(`canManageAttendance`)/클럽 출석관리자 | 참석자/대기자 강제 제거. 활성 결제·환불 대기자는 money guard가 별도 차단 |
| GET | `/api/v1/events/{eventId}/capacity/logs` | `CapacityController#getLogs` | host/co-host(`canManageAttendance`)/클럽 출석관리자 | 참석 변경 로그 페이지네이션 |
| GET | `/api/v1/events/{eventId}/attendance/logs` | `AttendanceController#getLogs` | 같음 | 동일 (플랜 호환 경로) |
| POST | `/api/v1/events/{eventId}/capacity/close` | `CapacityController#closeEvent` | 호스트 | 모집 마감 (`isClosed=true`), Flutter API 없음 |
| POST | `/api/v1/events/{eventId}/capacity/reopen` | `CapacityController#reopenEvent` | 호스트 | 모집 재개 (`isClosed=false`), Flutter API 없음 |
| POST | `/api/v1/events/{eventId}/registration/close` | `AttendanceController#closeEvent` | 호스트 | 동일 (Flutter API/Repository/Provider는 있으나 화면 caller 없음) |
| POST | `/api/v1/events/{eventId}/registration/reopen` | `AttendanceController#reopenEvent` | 호스트 | 동일 (Flutter API/Repository/Provider는 있으나 화면 caller 없음) |
| GET | `/api/v1/events/{eventId}/capacity/me` | `CapacityController#getMyAttendance` | 인증 | 본인 참석 상태 (ATTENDING/WAITING/CANCELLED) |
| GET | `/api/v1/events/{eventId}/attendance/me` | `AttendanceController#getMyAttendance` | 같음 | 동일 (플랜 호환 경로) |
| PATCH | `/api/v1/events/{eventId}/capacity-settings` | `EventController#updateCapacitySettings` → `EventCapacitySettingsService#updateCapacitySettings` | host/공동호스트만 | **v4.5 W1 신설**: DRAFT/OPEN에서만 `baseCapacity / overcapacityAllowed / hardCapacityLimit` 조정. 클럽 운영진은 기본 설정 GET/PUT과 달리 이 endpoint에는 허용되지 않는다. invariant 위반 시 `INVALID_HARD_CAPACITY_LIMIT(400013)`, CLOSED 호출 시 `INVALID_EVENT_STATUS`. 자세한 정책은 §3-1 참조 |

### 대기열 자동 승급 시 제재 사용자 skip 필터 (갱신 2026-06-05)

> 소스: `WaitlistService.java:161, 230`.

대기열 자동 승급(`autoPromoteNextWaiting`, `autoPromoteAll`) 시 `EventApplyRestrictionGuard.isRestricted(userId, clubId)` 를 호출하여 제재 사용자는 자동 승급 대상에서 건너뛴다(skip). 제재 상태가 해제되면 다음 승급 주기에 정상 포함된다.

- `assertNotRestricted` (throw): `promoteToAttending` (수동 승격 경로) — `WaitlistService.java:101`
- `isRestricted` (skip): `autoPromoteNextWaiting` — `WaitlistService.java:161`
- `isRestricted` (skip): `autoPromoteAll` — `WaitlistService.java:230`

### 의존 단위 / 외부 시스템

- **F03-05 신청 & 참석** — `attend`/`cancel` 흐름 자체는 F03-05 (신청). 본 단위는 그 결과에 대한 호스트 측 관리 + 자동 승격 트리거.
- **Unit 12 알림** — 자동·수동·정원 증가 승격 모두 `NotificationService.createNotification(WAITLIST_PROMOTED)`을 호출한다. 실제 in-app 저장과 비동기 FCM 발송은 사용자 채널 설정에 따라 생략될 수 있으므로 도달을 보장하지 않는다.
- **F03-08 QR 체크인** — 강제 제거 시 `event_check_in` 행 삭제 (잠재적 잘못된 체크인 데이터 방지)
- 외부: 없음 (Redis는 F03-08 만 사용)

## 5. 프론트 계약

### 진입 경로

- 호스트 관점:
  - 이벤트 상세(`SCR-EV-002`) 의 호스트 액션바 / 더보기 메뉴 → "참석자 관리"
  - 동일 화면 → "대기열" 탭
  - 동일 화면 → "정원 설정"
  - 동일 화면 → "참석 로그" (F03-12 와 같은 화면 사용 — 호스트는 변경 로그 전체, 일반은 본인 관련만)
- 참가자 관점:
  - 이벤트 상세 → 참석자 프리뷰 → "참석자 목록" (참가자도 ATTENDING 만 조회)
  - 본인이 대기열인 경우 상단에 "대기 N번째" 카드 노출

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (`lib/presentation/event/screens/`) | 역할 |
|---|---|---|
| `/home/events/:eventId/attendees` | `attendee_list_screen.dart` | 참석자 목록 + 호스트 액션 (승격/제거) |
| `/home/events/:eventId/waitlist` | `waitlist_screen.dart` | 대기자 목록 + 수동 승격 |
| `/home/events/:eventId/capacity-settings` | `capacity_settings_screen.dart` | 정원·대기열·승인제 설정 폼 |

정원 설정 route는 `_redirectEventAccess`의 `_EventRequiredAccess.manageCapacity`가 `EventVo.canManageCapacity`를 직접 검사한다. 참석자·대기열 route는 각각 서버 capability/참가 상태에 맞는 별도 access mode를 사용한다.

모집 마감/재개는 `CapacitySettingsNotifier`에 메서드만 있고 위 화면을 포함한 presentation caller가 없다. 초과정원 PATCH는 API/Repository까지만 구현되어 provider·화면·CTA가 없다.

### 화면별 구성 요소 & 액션

### 참석자 목록 (`attendee_list_screen.dart`)

- **사용자가 보는 것**:
  - 상단 헤더: "참석자 N / M명" — 현재 참석자 수 / `event.baseCapacity`
  - 본인 상태 카드 (`_buildMyStatusCard`): 본인이 attendees 목록에 있을 때 — 아이콘 + "내 상태: 참석 중/대기 중/취소" + 상태색
  - 닉네임 검색 텍스트필드 (클라이언트 사이드, 디바운스 없음)
  - 상태 필터 ChoiceChip 행: 전체 / 참석 / 대기 / 취소 / 거절 (서버는 ATTENDING 만 반환하지만 추후 확장 대비)
  - 참석자 카드 리스트 (`AttendeeCard`) — 아바타, 닉네임, 호스트/공동호스트 뱃지, 신청 일시
  - `permission.canManageAttendance`일 때 각 카드에 "승격" / "제거" 버튼
  - 우상단 "로그 >"도 `canManageAttendance` 기준 → `/home/events/:eventId/log`
- **사용자가 할 수 있는 액션**:
  - 검색어 입력 → 클라이언트 필터링 (`a.userNickname.contains(query)`)
  - 상태 칩 탭 → 클라이언트 필터링
  - "승격" 탭 → `attendeeListNotifier.promote(userId)` → `POST /api/v1/events/{id}/capacity/{userId}/promote` → 성공 시 `AppToast.show("참석자를 승격했습니다", success)`
  - "제거" 탭 → `AppDialog.confirm(title: '참석자 제거', isDangerous: true)` → 확인 시 `attendeeListNotifier.remove(userId)` → `DELETE /api/v1/events/{id}/capacity/{userId}` → 토스트 "참석자를 제거했습니다"
  - 풀투리프레시 → `attendeeListNotifier.refresh()`
- **상태 분기**: 로딩 (CircularProgressIndicator) / 에러 (`AppErrorState(title: '참석자 목록을 불러올 수 없습니다', onRetry: invalidate)`) / 빈 상태 (`AppEmptyState(title: '아직 참석자가 없습니다')`) / 검색 결과 0 (`AppEmptyState(icon: search_off_outlined, title: '검색 결과가 없습니다')`)
- **행 액션/로그 가드**: 서버 `canManageAttendance`를 그대로 소비한다. host ∪ flag 보유 cohost ∪ 클럽 출석관리자에게 열리고 그 외에는 숨긴다.
- **실패 피드백**: `showApiErrorToast(context, error, fallback: '참석자 승격에 실패했습니다')`

### 대기열 (`waitlist_screen.dart`)

- **사용자가 보는 것**:
  - 상단 warning 색 배너 — "대기열 (N명)" with hourglass 아이콘
  - 본인이 대기열일 때 상단 카드: "내 대기 순번: N번"
  - `WaitlistItem` 리스트 — 순번 NumberBadge + 아바타 + 닉네임 + 대기 시작일시
  - `permission.canManageAttendance`일 때 각 아이템 우측 "승격" 버튼
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 → `waitlistNotifier.refresh()`
  - "승격" 탭 → `waitlistNotifier.promote(userId)` → `POST .../capacity/{userId}/promote` → 성공 시 `waitlistNotifierProvider` + `eventDetailNotifierProvider` 둘 다 invalidate (현재 인원 갱신) → 토스트 "대기열 사용자를 승격했습니다"
- **상태 분기**: 로딩 / 에러(`AppErrorState(title:'대기열을 불러올 수 없습니다')`) / 빈 상태 (`AppEmptyState(title: '대기열이 비어있습니다')`)

### 정원 설정 (`capacity_settings_screen.dart`)

- **사용자가 보는 것**:
  - "기본 수용인원" NumberInput — placeholder "최소 1명"
  - 안내 캡션 "서버는 1명 이상만 허용합니다. 정원을 늘리면 대기자가 자동 승격될 수 있습니다."
  - "대기열 활성화" SwitchListTile + 부연 설명
  - (대기열 ON 일 때만 노출) "최대 대기인원" NumberInput
  - "승인제 참석" SwitchListTile + "호스트가 참석 신청을 승인해야 참석이 확정됩니다"
  - "게스트 동반 허용" SwitchListTile
  - (게스트 ON일 때만) "예매당 최대 게스트 수" NumberInput(1~9)
  - 하단 "저장" `AppButton(fullWidth: true)`
- **사용자가 할 수 있는 액션**:
  - 폼 작성 → "저장" → `CapacitySettingsVo(baseCapacity, waitlistEnabled, maxWaitlist, approvalRequired, allowGuests, maxGuestsPerBooking)` → `PUT .../capacity/settings`
  - 성공 시 `AppToast.show("설정이 저장되었습니다", success)` + `Navigator.pop`
  - 정원이 늘어났다면 서버에서 자동 승격 트리거 (사용자에게는 별도 표시 없음 — invalidate 시 detail 갱신으로 currentCapacity 변동 노출)
- **상태 분기**: 로딩 / 에러 / 데이터 (`_initialized` 플래그로 controller 초기화 1회만)
- **검증**: Flutter는 숫자 파싱 실패를 0으로 보내고 서버 `CapacitySettingsService.validateCapacitySettingsParam`이 baseCapacity<1, maxWaitlist<0을 런타임 검증한다(annotation 아님). `GuestPolicy`는 allowGuests=true일 때 maxGuestsPerBooking 1~9를 강제한다.

### 참석 로그 (F03-12 와 화면 공유 — `attendance_log_screen.dart`)

본 단위에서는 **호스트 시점** 의 변경 로그 통계로 사용. 화면 자체 분석은 F03-12 frontend.md 참조.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시:
   - `attendeeListNotifierProvider(eventId)` ▶ `AttendanceRepository.getAttendees(eventId)` ▶ `GET /api/v1/events/{id}/capacity/attendees` (Flutter 의 `attendance_api.dart` 는 `getHostAttendees` / `getAttendees` 두 메서드를 두지만 둘 다 같은 List<AttendanceVo> 응답)
   - `waitlistNotifierProvider(eventId)` ▶ `AttendanceRepository.getWaitlist(eventId)` ▶ `GET /api/v1/events/{id}/waitlist`
   - `capacitySettingsNotifierProvider(eventId)` ▶ `AttendanceRepository.getCapacitySettings(eventId)` ▶ `GET /api/v1/events/{id}/capacity/settings`
2. 승격 (`canManageAttendance` 운영자):
   - `attendeeListNotifier.promote(userId)` ▶ `POST /api/v1/events/{id}/capacity/{userId}/promote` ▶ 응답으로 attendee 목록 invalidate, eventDetail invalidate
3. 제거 (`canManageAttendance` 운영자):
   - `attendeeListNotifier.remove(userId)` ▶ `DELETE /api/v1/events/{id}/capacity/{userId}` ▶ list invalidate
4. 정원 설정 변경:
   - `capacitySettingsNotifier.updateSettings(vo)` ▶ `PUT /api/v1/events/{id}/capacity/settings` ▶ 결과 state 갱신 + `eventDetailNotifierProvider(eventId)` invalidate
5. 모집 마감/재개:
   - `capacitySettingsNotifier.closeRegistration() / reopenRegistration()` ▶ `POST /api/v1/events/{id}/registration/close|reopen` ▶ eventDetail invalidate
   - presentation caller가 없으므로 이 순서는 직접 Provider 메서드를 호출할 때만 성립한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (호스트) 정원이 차서 대기열이 쌓인 후, 한 명을 수동 승격 | - 이벤트 status=OPEN, baseCapacity=10, currentCapacity=10 | 단골 사용자 ATTENDING + manuallyPromoted, 대기열 2명 남음, 호스트 화면 갱신 |
| S2 | (호스트) 정원을 늘려서 대기자 자동 승격 | - baseCapacity=10, ATTENDING=10, 대기열 8명 | 5명 자동 승격, 대기열 3명 남음, 5명 각각에 `WAITLIST_PROMOTED` 알림 생성 요청. 저장/비동기 push는 채널 설정에 따름 |
| S3 | (호스트) 노쇼 우려 사용자를 강제 제거 | - baseCapacity=10, ATTENDING=10 (그 중 노쇼 사용자 포함) | 노쇼 사용자 CANCELLED, 1번 대기자가 ATTENDING + promotedFromWaitlist=true |
| S4 | (서버/Provider 직접 호출) 모집 조기 마감 후 재개 | host가 close/reopen endpoint 또는 Provider 메서드를 직접 호출 | `isClosed` 전환과 eventDetail invalidate. 현재 Flutter 화면에는 실행 CTA가 없음 |
| S5 | (참가자) 자동 승격 | 본인이 대기열 1번 | 참가자 ATTENDING. `WAITLIST_PROMOTED` 생성 요청은 일어나지만 in-app/push 도달은 설정 및 비동기 발송 결과에 따름 |
| S6 | (호스트) 대기 중이 아닌 사용자를 승격 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (에러) 권한 없는 일반 사용자 정원 설정 접근 | event 1312 isClosed=false (sample_data.sql:1190 시드값) | event 1312 isClosed=false 복귀, 다른 메타 무변동, **mutation but self-rollback**. **출처: CapacitySettingsService.java:84-104** |
| S1-1 | (API 직접 호출) 정원 5명 이벤트에서 overcap을 켜 7명까지 승인 (v4.5 W1) | baseCapacity=5, approvalRequired=true, OPEN. 참가자 7명 PENDING | `PATCH /capacity-settings`로 `overcapacityAllowed=true, hardCapacityLimit=10` → U6/U7 승인 시 ATTENDING, `currentCapacity=7, exceedingAttendees=2`, U6/U7 row `change_type=9 (OVERCAPACITY_APPROVED)` 기록. Flutter 설정 화면에서는 이 PATCH를 실행하거나 초과 badge를 볼 수 없음 |
| S1-2 | (호스트) 정원 축소로 초과 상태 발생 (v4.5 W1) | baseCapacity=10, currentCapacity=8, OPEN | `PATCH /capacity-settings` baseCapacity=5 → `currentCapacity=8` 유지, `exceedingAttendees=3`, `event_attendance_log`에 `change_type=10 (CAPACITY_REDUCED)` + metadata `{"prevBase":10,"newBase":5,"exceeding":3}` |
| S1-3 | (호스트) hardCapacityLimit invariant + 도달 차단 (v4.5 W1) | baseCapacity=10, currentCapacity=15 | (a) `hardCapacityLimit=3` 시도 → 400 `INVALID_HARD_CAPACITY_LIMIT(400013)`. (b) `hardCapacityLimit=15` 정상 200. (c) 추가 apply → 400 `CAPACITY_FULL` |
| S1-4 | (호스트) CLOSED 이벤트 정원 조정 차단 (v4.5 W1, Q7) | event.status=CLOSED | `PATCH /capacity-settings` → 400 `INVALID_EVENT_STATUS` |

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
| 사실 교정 | 서버 enum / Flutter parser | 서버 상태는 `WAITING`이며 Flutter parser는 호환 입력 `WAITLISTED`도 `waiting`으로 매핑한다. | 신규 계약/fixture는 서버 canonical 값 `WAITING` 사용 |
| 사실 교정 | `CapacitySettingsService` / Flutter 폼 | baseCapacity 최소값은 annotation이 아니라 service runtime validation이다. Flutter는 parse 실패 시 0을 전송하고 API 오류 toast를 표시한다. | 문서/테스트에서 `@Min` 근거 제거 |
| 사실 교정 | `capacity_settings_screen.dart` / `CapacitySettingsParam` | 폼은 기본 정원·대기열·조건부 최대 대기·승인제뿐 아니라 게스트 허용과 조건부 최대 게스트(1~9)도 관리한다. baseCapacity는 0 무제한이 아니라 최소 1이다. | UI surface/E2E 기대 라벨에 게스트 설정과 최소값 포함 |
| Risk | `CapacitySettingsService` vs `EventCapacitySettingsService` 권한 가드 | 기본 설정 GET/PUT/PATCH 호환 경로는 클럽 ADMIN/OWNER를 허용하지만 고급 `PATCH /capacity-settings`는 host/co-host만 허용 | 클럽 운영진이 기본 설정 화면은 열 수 있지만 별도 고급 초과정원 API는 호출할 수 없다. 제품 의도인지 권한 통일 대상인지 결정 필요 |
| Gap | Flutter presentation caller 검색 | 모집 close/reopen은 Provider까지만, 고급 초과정원 PATCH는 Repository까지만 연결되어 있다. `overcapacityAllowed`/`hardCapacityLimit`/`exceedingAttendees`의 presentation 소비처도 없다. | CTA와 상태 표시를 구현하기 전까지 서버 전용 기능으로 취급 |
| Risk | `WaitlistService.promoteRowManual` | 수동 승급은 `CapacityPolicy`, baseCapacity, hardCapacityLimit을 모두 검사하지 않고 currentCapacity를 증가시킨다. | hard limit을 진짜 절대 상한으로 둘지, 운영자 override로 명시할지 결정 |
| Risk | `NotificationService.createNotification` | 승급 서비스는 알림 생성을 호출하지만 in-app/push 설정으로 생략될 수 있고 push는 비동기다. | 수용 기준을 “도달”이 아닌 생성 요청/설정별 결과로 검증 |

## 9. 수용 기준

- **AC-01. (호스트) 정원이 차서 대기열이 쌓인 후, 한 명을 수동 승격**: Given - 이벤트 status=OPEN, baseCapacity=10, currentCapacity=10 When 사용자가 해당 흐름을 실행하면 Then 단골 사용자 ATTENDING + manuallyPromoted, 대기열 2명 남음, 호스트 화면 갱신
- **AC-02. (호스트) 정원을 늘려서 대기자 자동 승격**: Given - baseCapacity=10, ATTENDING=10, 대기열 8명 When 사용자가 해당 흐름을 실행하면 Then 5명 자동 승격, 대기열 3명 남음, 5명 각각에 `WAITLIST_PROMOTED` 생성 요청. 실제 in-app/push 결과는 알림 설정에 따름
- **AC-03. (호스트) 노쇼 우려 사용자를 강제 제거**: Given - baseCapacity=10, ATTENDING=10 (그 중 노쇼 사용자 포함) When 사용자가 해당 흐름을 실행하면 Then 노쇼 사용자 CANCELLED, 1번 대기자가 ATTENDING + promotedFromWaitlist=true
- **AC-04. (서버/Provider 직접 호출) 모집 조기 마감 후 재개**: Given host 인증 When close 후 reopen endpoint/Provider를 직접 호출하면 Then `isClosed`가 true 후 false로 복귀하고 eventDetail이 invalidate된다. Flutter 화면 CTA는 없음을 별도로 검증한다.
- **AC-05. (참가자) 자동 승격**: Given 본인이 대기열 1번 When 빈자리가 생기면 Then 참가자 ATTENDING, `WAITLIST_PROMOTED` 생성 요청. 채널 비활성 시 저장/푸시 생략 가능
- **AC-06. (호스트) 대기 중이 아닌 사용자를 승격 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (에러) 권한 없는 일반 사용자 정원 설정 접근**: Given event 1312 isClosed=false (sample_data.sql:1190 시드값) When 사용자가 해당 흐름을 실행하면 Then event 1312 isClosed=false 복귀, 다른 메타 무변동, **mutation but self-rollback**. **출처: CapacitySettingsService.java:84-104**
- **AC-S1-1. 정원 초과 API 직접 호출 (v4.5 W1)**: Given baseCapacity=5, approvalRequired=true, OPEN, 참가자 7명 PENDING When host가 API로 `PATCH /capacity-settings`에 `overcapacityAllowed=true, hardCapacityLimit=10`을 적용 후 7명 모두 승인 Then `currentCapacity=7, baseCapacity=5, exceedingAttendees=2, overcapacityAllowed=true`, U6/U7 `event_attendance_log.change_type=9 (OVERCAPACITY_APPROVED)`. Flutter presentation에는 PATCH caller와 "+2명 초과" badge가 모두 없음을 확인.
- **AC-S1-2. 정원 축소로 초과 상태 발생 (v4.5 W1)**: Given baseCapacity=10, currentCapacity=8, OPEN When 호스트가 `PATCH /capacity-settings`로 `baseCapacity=5` 적용 Then `baseCapacity=5, currentCapacity=8, exceedingAttendees=3` 유지 (기존 ATTENDING 강제 취소 없음), `event_attendance_log`에 `change_type=10 (CAPACITY_REDUCED)` + metadata `{"prevBase":10,"newBase":5,"exceeding":3}` 1행 기록. overcap=false 사용자의 새 apply는 `CAPACITY_FULL` 400.
- **AC-S1-3. Hard limit 도달 시 차단 + invariant (v4.5 W1)**: Given baseCapacity=10 When `hardCapacityLimit=3` 설정 시도 Then `INVALID_HARD_CAPACITY_LIMIT(400013)` 400. When `hardCapacityLimit=15`로 정상 설정 후 currentCapacity=15 도달 Then 신규 apply는 `CAPACITY_FULL` 400.
- **AC-S1-4. CLOSED 이벤트 정원 조정 차단 (v4.5 W1, Q7)**: Given event.status=CLOSED When 호스트가 `PATCH /capacity-settings` 호출 Then 400 `INVALID_EVENT_STATUS` (DRAFT/OPEN만 허용).

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.

## 11. 변경 이력

- **2026-05-22 (v4.5 W1 — 정원 초과 허용)**: `overcapacity_allowed`/`hard_capacity_limit` 두 컬럼을 `event` 테이블에 추가하고, `CapacityPolicy.decide` 5-룰 매트릭스(§3-1)를 도입. 별도 서비스 `EventCapacitySettingsService`(`community_api/src/main/java/com/endside/community/event/service/EventCapacitySettingsService.java`)와 `PATCH /events/{id}/capacity-settings` 엔드포인트로 DRAFT/OPEN 운영 중 정원 토글이 가능하도록 분리(Q7: CLOSED 차단). `ChangeType.OVERCAPACITY_APPROVED(9)`/`CAPACITY_REDUCED(10)` 추가, `ErrorCode.INVALID_HARD_CAPACITY_LIMIT(400013)` + `CAPACITY_FULL_AT_CONFIRMATION(400012)` 신설. EventVo에 `overcapacityAllowed / hardCapacityLimit / exceedingAttendees / reservedPaymentPendingCount` 4개 필드 노출. 자동 승인 이벤트에서 `overcap=true`이면 `apply` 시점에 즉시 ATTENDING으로 진입(Q6). 정원 축소 시 기존 ATTENDING은 유지. 시나리오 S1-1~S1-4 추가.
- **2026-06-05 (D-20 / v3 — 대기열 자동 승급 제재 skip)**: `WaitlistService.autoPromoteNextWaiting`(`:161`), `autoPromoteAll`(`:230`)에 `EventApplyRestrictionGuard.isRestricted` skip 로직 추가. 제재 사용자는 자동 승급에서 건너뛰어 다음 비제재 사용자가 승급됨. 수동 승격(`promoteToAttending`)은 `assertNotRestricted` — 제재 사용자 시도 시 throw. 상세는 §대기열 자동 승급 시 제재 사용자 skip 필터 절 참조.
- **2026-07-29 (current source 재실측)**: `canManageCapacity` capability를 서버 `EventVo`→Flutter model/provider/detail/route 전 구간에서 확인했다. 기본 설정 GET/PUT의 실제 권한을 host·공동호스트·클럽 ADMIN/OWNER로 교정하고, 출석 운영(`canManageAttendance`) 및 고급 `PATCH /capacity-settings` 권한과의 차이를 명시했다. 참석자/대기열 행 액션·로그의 실제 `canManageAttendance` 게이트, baseCapacity 최소 1 service validation, 게스트 허용/최대 게스트 폼을 추가 교정했다. 또한 close/reopen 및 고급 PATCH의 presentation caller 부재, 초과 상태 UI 미소비, 수동 승급의 hard limit 우회, 알림 설정/비동기 발송 조건을 확정했다.
