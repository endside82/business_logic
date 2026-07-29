# F03-16. 이벤트 버스대절 (BUS) PRD

<!-- source-measured: 2026-07-29; authority: community_api/community_app current source -->

> 문서 상태: **현재 소스 실측본**. 삭제된 `docs/plan/event-extensions/*`의 자동 배정·`SKIP LOCKED` 설계는 현재 구현으로 간주하지 않는다. 차량 카탈로그는 [F03-17](F03-17_vehicle-layout-catalog_prd.md)을 함께 본다.

## 1. 결론

서버에는 버스 목록·좌석 조회·버스 추가·좌석 지정의 4개 API가 구현되어 있다. `FIXED_BY_HOST`와 `FIRST_COME`는 버스 생성 시 레이아웃의 선택 가능한 좌석을 복사하지만, 이름과 달리 `FIRST_COME` 자동 배정은 구현되어 있지 않다. 현재 좌석 변경 API는 target seat의 `userId`를 덮어쓰는 단일 동작이며, 이동·swap·명시적 unassign API가 아니다.

Flutter에는 버스 모델/API/Repository/Provider/좌석 화면이 없다. 알림 81~82도 enum만 있고 생산 배선과 앱 라우팅이 없다.

## 2. 실측 근거

| 계층 | 현재 소스 |
|---|---|
| Controller/Service | `event/transport/controller/EventBusController.java`, `event/transport/service/EventBusService.java` |
| Model | `EventBus.java`, `EventBusSeat.java`, `EventBusSeatLog.java` |
| Param/VO | `BusSetupParam.java`, `EventBusVo.java`, `EventBusSeatVo.java` |
| Enum | `BusAssignmentMode.java`, `BusSeatChangeType.java` |
| Repository | `EventBusRepository.java`, `EventBusSeatRepository.java`, `EventBusSeatLogRepository.java` |
| Test | `community_api/src/test/java/com/endside/community/event/transport/service/EventBusServiceTest.java` |
| DDL | `community_api/src/main/resources/db/migration/V1__init.sql` |

## 3. 서버 API

| Method | Path | 요청/응답 | 실제 동작 |
|---|---|---|---|
| GET | `/api/v1/events/{eventId}/buses` | `List<EventBusVo>` | 로그인 필요. 서비스 수준 event 존재·역할 검증 없이 eventId 목록 조회 |
| GET | `/api/v1/events/{eventId}/buses/{busId}/seats` | `List<EventBusSeatVo>` | Host/CoHost 또는 `ATTENDING`/`WAITING`. bus의 eventId 일치 필수 |
| POST | `/api/v1/events/{eventId}/buses` | `BusSetupParam` → `EventBusVo` (201) | Host/CoHost, mode `BUS`, 이벤트당 최대 3대 |
| PUT | `/api/v1/events/{eventId}/buses/{busId}/seats/{seatNo}?userId={id}` | `EventBusSeatVo` | Host/CoHost, 또는 `allowSelfSwap=true`이고 `userId=본인`인 인증 사용자 |

삭제, 버스 수정, 자동 배정, 명시적 좌석 해제 endpoint는 없다.

## 4. 데이터와 Enum

`BusSetupParam`:

- `busNo: int` — 1~3
- `vehicleLayoutId: long`
- `assignmentMode: BusAssignmentMode`
- `allowSelfSwap: boolean`
- `notes: String`

Enum:

- `BusAssignmentMode = FREE | FIXED_BY_HOST | FIRST_COME`
- `BusSeatChangeType = ASSIGN | REASSIGN | UNASSIGN | SELF_SWAP`

좌석에는 `eventId`, `eventBusId`, `seatNo`, nullable `userId`, `lockedByHost`, `assignedAt`, `assignedBy`가 있다. DB는 `(event_id, user_id)` unique로 한 이벤트에서 같은 사용자의 중복 좌석을 막고, bus와 seat entity는 version 컬럼을 가진다.

## 5. 생성과 좌석 변경의 실제 의미

| 모드 | 버스 생성 시 | 현재 배정 동작 |
|---|---|---|
| `FREE` | 좌석 row를 만들지 않음 | 좌석 지정 API가 찾을 row가 없어 사실상 사용할 수 없음 |
| `FIXED_BY_HOST` | 레이아웃의 `isSelectable=true` 좌석을 복사 | Host/CoHost가 target seat의 user를 지정 |
| `FIRST_COME` | `FIXED_BY_HOST`와 동일하게 빈 좌석 row 복사 | 자동 배정 없음. 같은 PUT API로 수동 지정 |

추가 확인 사항:

- 버스 추가는 event row 잠금과 host/cohost 검사를 사용한다.
- add/assign 모두 event status를 검사하지 않아 mode가 BUS로 남아 있는 CLOSED/CANCELED 이벤트에서도 mutation할 수 있다. mode 변경은 DRAFT-only라 이 상태를 transport config로 정리할 수도 없다.
- layout 존재·활성 여부를 명시적으로 검증하지 않고 repository 결과를 사용한다.
- non-host는 `allowSelfSwap=true`이고 query `userId`가 본인일 때만 통과하지만, 참석/대기 자격과 `assignmentMode`, `lockedByHost`는 검사하지 않는다.
- 좌석 PUT은 기존 사용자 좌석을 비우지 않는다. 이미 좌석이 있는 사용자가 다른 좌석으로 이동하면 DB unique 위반이 될 수 있다.
- API의 `userId`는 primitive `long`이라 null unassign이 불가능하며, `UNASSIGN` 로그 분기는 이 endpoint에서 도달할 수 없다.
- 다른 사람이 앉은 좌석을 self 요청으로 덮어쓸 수 있어 현재 `SELF_SWAP`은 두 좌석을 맞바꾸는 진짜 swap이 아니다.
- `DataIntegrityViolationException`은 구체 원인을 구분하지 않고 `INVALID_REQUEST`로 변환한다.

## 6. 조회 개인정보와 동시성

- Host/CoHost는 모든 seat의 `userId`를 본다.
- 일반 참가자는 자기 좌석의 `userId`만 보고, 다른 좌석의 `userId`는 null로 마스킹된다.
- `assignedBy`는 일반 참가자 응답에서도 마스킹되지 않는다.
- 버스 추가와 좌석 지정은 event row를 잠가 같은 이벤트의 write를 직렬화한다.
- seat row 전용 비관적 잠금이나 `SELECT ... FOR UPDATE SKIP LOCKED` 쿼리는 없다.
- `FIRST_COME` 자동 할당과 신청/결제 확정 흐름의 연계도 없다.

## 7. 로그·알림·Flutter

- 좌석 PUT은 `EventBusSeatLog`를 기록한다.
- 변경 타입은 기존/새 사용자와 self 여부로 계산하지만, null userId가 불가능해 `UNASSIGN`은 현재 API에서 생성되지 않는다.
- `BUS_SEAT_ASSIGNED(81)`, `BUS_SEAT_CHANGED(82)` enum은 있으나 발행·listener·send 코드가 없다.
- Flutter `NotificationRouter`에 81~82 deep link가 없다.
- Flutter에 버스 운영 기능 파일은 없다.

## 8. 테스트로 확인된 범위

`EventBusServiceTest` 11개는 좌석 조회 권한·타인 userId 마스킹과 좌석 변경 로그 타입을 검증한다. 특히 타인이 앉은 target 좌석을 self 요청으로 덮어쓰는 동작을 `SELF_SWAP` 성공으로 고정하지만, 두 좌석의 실제 swap·참석 자격·locked seat 검증을 의미하지 않는다. 다음 핵심 계약은 확인되지 않았다.

- 최대 3대와 중복 busNo
- mode·event status·layout 유효성
- FREE/FIRST_COME 실제 동작
- 중복 사용자·동시 좌석 경쟁
- self swap과 locked seat
- 알림 발행

## 9. 현재 Gap / Risk

| 우선순위 | 실측 Gap |
|---|---|
| 높음 | Flutter 버스 운영 수직 슬라이스가 전혀 없음 |
| 높음 | `FIRST_COME` 자동 배정과 `SKIP LOCKED`는 구현되지 않음 |
| 높음 | 좌석 PUT이 이동·swap·unassign을 올바르게 모델링하지 않음 |
| 높음 | self 변경이 참석 자격·assignment mode·lockedByHost를 검사하지 않음 |
| 높음 | add/assign에 event status 가드가 없어 CLOSED/CANCELED event도 mutation 가능 |
| 중간 | GET buses에 event 존재·역할 검증이 없음 |
| 중간 | bus 추가 시 event status 및 layout 존재/활성 검증이 없음 |
| 중간 | 81~82 알림은 enum만 있고 생산 배선·앱 라우팅이 없음 |
| 중간 | 핵심 제약과 동시성 회귀 테스트가 부족 |

## 10. 변경 이력

| 날짜 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 삭제된 event-extensions 계획을 기준으로 초안 작성 |
| 2026-07-29 | v1.0 | 실제 4개 API와 권한·좌석 변경·동시성·테스트를 실측하고 자동 배정/SKIP LOCKED/알림 오기 제거 |
