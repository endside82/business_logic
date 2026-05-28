# F17-05. 세션 관리 (add / bulk / replace / cancel) PRD

## 1. 결론

정기모임의 회차(세션)는 모두 `event` 테이블 위 별개 row 로 만들어진다(`eventType=REGULAR_MEETING(3)`). 모임과 세션을 잇는 정션 `regular_meeting_event` 가 순번(`sequenceNo`)·출처(`ORIGINAL/REPLACEMENT`)·materialize·finalization 상태를 잡는다.

호스트는 4개 액션을 가진다:
- **add** — 세션 1개 추가 (`POST /events`). 다음 순번 자동 할당.
- **bulk** — 여러 세션 일괄 추가 (`POST /events/bulk`).
- **replace** — 취소된 세션의 대체본을 같은 순번으로 추가 (`POST /events/{eventId}/replace`).
- **cancel** — 세션 취소 (`DELETE /events/{eventId}`).

**핵심 가드**: RM 세션은 일반 `EventService.publishEvent/cancelEvent`/`EventCapacitySettingsService`/`CapacitySettingsService`/`RecurringEventCreateService` 6개 경로에서 직접 mutation 차단(통합 가드). 세션 상태 전이는 모임 본체에 종속되며 `event.*()` 엔티티 메서드를 직접 호출(도메인이벤트 팬아웃 방지).

`(meeting_id, sequence_no)` 중복은 허용(원본 취소본 + 대체본). 단 "순번당 활성 세션 1개"는 서비스가 보장한다. `event_id` 는 UNIQUE (한 이벤트 = 최대 1모임).

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#addSession,addSessionsBulk,sessions,cancelSession,replaceSession` | 5 endpoint |
| Backend Service | `RegularMeetingService#addSession,addSessionsBulk,replaceSession,cancelSession,getSessions` | factory + 가드 |
| Backend Factory | `RegularMeetingEventFactory` | event row + 정션 row 동시 생성 |
| Backend Guard | `RegularMeetingSessionGuard` | EventService 등에서 RM 세션 직접 mutation 차단 |
| Backend Entity | `RegularMeetingEvent` | `event_id` UNIQUE, sequenceNo 정책 |
| Backend Param | `RegularMeetingSessionAddParam`, `RegularMeetingSessionBulkParam`, `RegularMeetingSessionReplaceParam` | 시각, 장소, capacity |
| Flutter Screen | `regular_meeting_session_add_screen.dart` | VARIABLE baseCapacity 분기 + 시각 picker |

## 3. 전체 동작 흐름

### 3.1 add (`POST /events`)
1. `assertHost`. DRAFT/OPEN 만.
2. `RegularMeetingEventFactory.create(meeting, param, origin=ORIGINAL)` → `event` row + 정션 row.
3. VARIABLE 면 param 의 `baseCapacity/price` 가 세션 row 에 그대로. FIXED 면 모임 본체 값 상속.
4. 순번 자동 할당: 기존 max(sequenceNo) + 1. FIXED 는 publish 시 정확히 `totalSessionCount` 와 일치해야 함.
5. `meeting.lastEventCreatedAt = now()` (VARIABLE auto-close 기준).
6. 응답: `EventVo` (일반 EventVo, RM 컨텍스트 5필드 오버레이).

### 3.2 bulk (`POST /events/bulk`)
- N 개 세션을 한 트랜잭션에 추가. 시각 충돌 검증.
- FIXED 모임 일괄 setup 에 사용 (e.g. 8회 모임 8개 동시 등록).

### 3.3 replace (`POST /events/{eventId}/replace`)
1. 원본 세션이 정션상 `active=false` (status=CANCELED) 여야 함.
2. 대체본 정션 row 의 `sequenceNo` 는 원본과 동일. `origin=REPLACEMENT`. `replacedEventId` = 원본 eventId.
3. `(meeting_id, sequence_no)` 는 중복 가능 (원본 취소 + 대체본 둘 다 row 보존).
4. FIXED 의 materialize 가 대체본에도 적용됨.

### 3.4 cancel (`DELETE /events/{eventId}`)
1. `assertHost`.
2. 세션 직접 `event.cancel()` 호출 (`EventService.cancelEvent` 우회 — 도메인이벤트 fanout 방지).
3. 정션 row 의 `active` 는 query 시점에 계산(`event.status != CANCELED`).
4. **참가자 환불 책임**: RM 세션은 일반 신청 가드 때문에 직접 신청자 없음. FIXED 의 ATTENDING 자동 등록자(materialize) 는 데이터만 demote, 멤버 본체는 그대로(다른 세션 참가).

### 3.5 sessions list (`GET /events?includeHistory={bool}`)
- 기본은 active session 만, `includeHistory=true` 면 CANCELED 포함.
- 정렬: `sequenceNo ASC`, 같은 순번 안에서 active 가 먼저.

## 4. 서버 계약

| 엔드포인트 | Method | Body / Param | 응답 |
|---|---|---|---|
| `/api/v1/regular-meetings/{id}/events` | POST | `RegularMeetingSessionAddParam` | 201 `EventVo` |
| `/api/v1/regular-meetings/{id}/events/bulk` | POST | `RegularMeetingSessionBulkParam` (N 개) | 201 `List<Long>` (eventIds) |
| `/api/v1/regular-meetings/{id}/events` | GET | `includeHistory: bool` | `List<RegularMeetingEventVo>` |
| `/api/v1/regular-meetings/{id}/events/{eventId}` | DELETE | — | 204 |
| `/api/v1/regular-meetings/{id}/events/{eventId}/replace` | POST | `RegularMeetingSessionReplaceParam` | 200 `EventVo` (대체본) |

권한: 전 endpoint host 만.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.regularMeetingSessionAdd` |
| Screen | `RegularMeetingSessionAddScreen` |
| Provider | `regularMeetingSessionsProvider(meetingId)` invalidate 후 갱신 |
| 입력 | startTime/endTime, locationType, address, onlineUrl, baseCapacity (VARIABLE 만), price (VARIABLE 만) |
| 호스트 대체본 UI | MVP 우선순위 낮음 — API 는 준비됨, UX 점진 추가 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S5-1 | add (FIXED) | DRAFT FIXED, sessionCount=8 목표, 현재 7 | 201, sequenceNo=8, baseCapacity=모임본체값 |
| S5-2 | add (VARIABLE) | OPEN VARIABLE, param 에 baseCapacity=10, price=5000 | 201, 세션 row 가 자체 값 보유 |
| S5-3 | bulk add 8 sessions | DRAFT FIXED | 201, 8개 ids 반환 |
| S5-4 | cancel session | OPEN, 세션 1개 cancel | 204. `event.status=CANCELED`. FIXED materialize 자동 demote |
| S5-5 | replace session | 취소된 세션의 대체본 | 200, 정션 row 신규 (origin=REPLACEMENT, sequenceNo=원본과 동일) |
| S5-6 | sessions list active | `includeHistory=false` | CANCELED 제외, 정렬 sequenceNo ASC |
| S5-7 | sessions list history | `includeHistory=true` | CANCELED + REPLACEMENT 포함. 같은 sequenceNo 가 2개 row (원본 active=false + 대체본) |
| S5-8 | RM 세션 직접 mutation 시도 | `EventService.publishEvent(eventId)` 직접 호출 | `RegularMeetingSessionGuard` 가 거절 |
| S5-9 | RM 세션 직접 신청 시도 | `directApplyBlocked=true`인 RM 세션에 일반 apply | 신청 가드(EventScope) 가 거절 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| event_id UNIQUE | DDL UNIQUE 제약 | 한 이벤트가 두 모임에 속할 수 없음 |
| `(meeting_id, sequence_no)` 중복 허용 | DDL 비 UNIQUE | 원본 취소+대체본 패턴 보존 |
| 활성 세션 1개 보장 | 서비스 레벨 (`activeSessions` 필터 후 같은 sequenceNo 중 active=true 가 1개) | 데이터로 검증 |
| 통합 가드 6개 경로 | `RegularMeetingSessionGuard` 가 EventService 6 + EventCapacitySettingsService + CapacitySettingsService + RecurringEventCreateService 모두에서 호출 | 통합됨 |
| RM 세션 신청 가드 | `EventScope` 거름망의 `directApplyBlocked` 분기 | OPEN RM 세션에 일반 신청 차단 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 잔여 | 구현 리포트 §9 | bulk/replace 세션 호스트 UI 미신설 — API 는 준비됨 | UX 우선순위 낮음, 후속 |
| 위험 | OPEN 상태에서 세션 추가 | OPEN 모임에 세션 추가 시 인덱싱·노출 갱신 필요 — `EventScope#publiclyDiscoverable` 즉시 반영 | 검증됨 |
| 위험 | 세션 cancel 후 FIXED roster | FIXED ATTENDING materialize 자동 demote — 멤버 본체는 영향 없음 | F17-09 참조 |

## 9. 수용 기준

- **AC-01 (S5-1). FIXED 세션 add**: Given DRAFT FIXED + 현재 7세션. When `POST /events`. Then 201, sequenceNo=8, baseCapacity=모임본체.
- **AC-02 (S5-4). cancel 후 active=false**: Given 활성 세션. When `DELETE`. Then `event.status=CANCELED`. 다음 sessions list 에 `active=false`.
- **AC-03 (S5-5). replace 같은 순번**: Given 취소된 세션(seq=3). When replace. Then 새 정션 row 의 sequenceNo=3, origin=REPLACEMENT, replacedEventId=원본.
- **AC-04 (S5-8). 직접 mutation 차단**: Given RM 세션 eventId. When 일반 `EventService.publishEvent` 호출. Then `RegularMeetingSessionGuard` 가 거절.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| 호스트 bulk/replace UI | UX 우선순위 낮음 | API 는 준비됨, 후속 슬라이스 |
| 세션 시각 충돌 자동 검출 | MVP 는 호스트 자율 | 후속에 conflict warning |
