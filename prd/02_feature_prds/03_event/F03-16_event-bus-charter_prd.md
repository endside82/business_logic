# F03-16. 이벤트 버스대절 (BUS) PRD

<!-- generated: source-first-event-extensions; updated: 2026-05-22; plan: docs/plan/event-extensions/PLAN.md v4.5 §4 / W7 슬라이스 -->

> 문서 상태: **신규 PRD**. mode 공통 베이스는 [F03-14](F03-14_event-transport-mode_prd.md), 차량 레이아웃 카탈로그(read-only)는 [F03-17](F03-17_vehicle-layout-catalog_prd.md)을 참조한다. 본 슬라이스는 **backend-only 1차 출시** — Flutter 좌석 위젯·모델·화면은 후속 슬라이스에서 진행한다. 관리자 차량 카탈로그 CRUD UI는 **본 슬라이스 범위 외**이며 `community_admin_api` 후속 슬라이스(Q5 사용자 확정)에서 다룬다.

## 1. 결론

이벤트 `mode=BUS` 일 때, 호스트가 차량 레이아웃 카탈로그([F03-17](F03-17_vehicle-layout-catalog_prd.md))에서 1대를 선택해 **버스를 추가하고**, 배정 모드(`FREE/FIXED_BY_HOST/FIRST_COME`) + `allow_self_swap` 플래그로 **좌석 운영 방식을 결정**한다. 한 이벤트에 최대 **3대**까지 추가할 수 있다.

요구사항 #4의 매핑:

| 요구 | 본 PRD에서 어디로 |
|---|---|
| 4종 차량 시드 (28/45/20/8인승) | [F03-17](F03-17_vehicle-layout-catalog_prd.md) 카탈로그가 제공, 본 PRD는 `vehicle_layout_id` 참조만 |
| 좌석 그림 | [F03-17](F03-17_vehicle-layout-catalog_prd.md) `vehicle_layout_seat` (`seat_type/row_index/col_index/is_selectable`). 본 PRD가 prepopulate 책임 |
| 3개 배정 모드 | `event_bus.assignment_mode` enum (`FREE/FIXED_BY_HOST/FIRST_COME`) |
| 최대 3대 | service-level `MAX_BUSES_PER_EVENT=3` 가드 |
| `allow_self_swap` | `event_bus.allow_self_swap` — `FIXED_BY_HOST` 모드에서 참가자 본인 좌석 swap 허용 여부 |

호스트의 진입 흐름은 다음을 기준으로 판단한다.

- 이벤트 상세(F03-02) 호스트 액션 → "버스 운영" 화면 (후속 슬라이스)
- 본 슬라이스는 backend-only이므로 운영은 Postman/curl로 endpoint 직접 호출

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Plan | [PLAN.md v4.5 §4.4~§4.11](../../../../docs/plan/event-extensions/PLAN.md) | 있음 | 데이터 모델, 모드별 동작, 동시성, 알림 |
| Enum | [ENUM_RESERVATIONS.md NotificationType 81~82 / BusAssignmentMode / VehicleSeatType](../../../../docs/plan/event-extensions/ENUM_RESERVATIONS.md) | 있음 | 알림 + enum 예약 |
| E2E | [E2E_SCENARIOS.md S4-1~S4-7](../../../../docs/plan/event-extensions/E2E_SCENARIOS.md) | 있음 | 모드별 동작 / 최대 3대 / eventId 검증 / 동시성 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventBusController.java:28` (GET buses) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventBusController.java:33` (GET bus seats) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventBusController.java:39` (POST buses) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventBusController.java:48` (PUT seat assignment) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/service/EventBusService.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/model/EventBus.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/model/EventBusSeat.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/vo/EventBusVo.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/vo/EventBusSeatVo.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/constants/BusAssignmentMode.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/param/BusSetupParam.java` | 확인됨 |

## 3. 전체 동작 흐름

1. **mode 가드 + 차량 카탈로그 조회**: 호스트가 `GET /api/v1/vehicle-layouts/active`(F03-17)로 4종 카탈로그를 받아 `vehicleLayoutId` 선택.
2. **버스 추가**: `POST /api/v1/events/{eventId}/buses` Body `{"busNo":1,"vehicleLayoutId":1,"assignmentMode":"FIRST_COME","allowSelfSwap":false}` → bus 가드 + 최대 3대 검증 + mode별 좌석 prepopulate.
3. **모드별 좌석 prepopulate**:
   - `FREE`: 좌석 row 생성 안 함 (인원 카운트만)
   - `FIXED_BY_HOST` / `FIRST_COME`: `vehicle_layout_seat` 중 `is_selectable=true`만 `event_bus_seat` row로 prepopulate (`user_id=NULL`)
4. **좌석 배정/swap**: `PUT /buses/{busId}/seats/{seatNo}?userId=` → bus row + seat row 잠금(`FOR UPDATE`) 후 모드별 권한 가드 → `UNIQUE(event_id, user_id)` 위반 시 `DataIntegrityViolationException` → service-level `USER_ALREADY_SEATED_IN_EVENT` 변환.
5. **모드별 권한**:
   - `FREE`: 호스트만 (좌석 row 없으므로 사실상 미사용)
   - `FIXED_BY_HOST`: 호스트 기본. `allow_self_swap=true`이면 참가자 본인 좌석만 swap 가능
   - `FIRST_COME`: 호스트는 항상 가능. 참가자는 `allow_self_swap=true`일 때 본인 좌석 자가 선택
6. **GET 응답**:
   - `GET /buses`: `EventBusVo` 목록 (배정 모드, 인원 수 등)
   - `GET /buses/{busId}/seats`: `FREE`는 빈 배열, 그 외는 좌석 + `user_id` 노출

## 4. 서버 계약

### 엔드포인트 요약 (4개 in controller; 본 PRD 범위 4개)

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/buses` | `EventBusController#getBuses` | 인증 | 이벤트의 버스 목록 + 모드별 인원 카운트 |
| GET | `/api/v1/events/{eventId}/buses/{busId}/seats` | `EventBusController#getSeats` | 인증 | bus의 좌석 목록. FREE는 빈 배열. eventId/busId 소속 검증 |
| POST | `/api/v1/events/{eventId}/buses` | `EventBusController#createBus` | 호스트/공동호스트 | bus 추가 + 좌석 prepopulate. 최대 3대 검증 |
| PUT | `/api/v1/events/{eventId}/buses/{busId}/seats/{seatNo}` | `EventBusController#assignSeat` | 모드별 권한 | `?userId=` 쿼리. 좌석 배정/swap. UNIQUE 충돌 → `USER_ALREADY_SEATED_IN_EVENT` |

> 본 슬라이스에는 bus 삭제·수정 endpoint는 포함되지 않는다. 후속 슬라이스에서 추가 가능(`BUS_NOT_EMPTY` 가드 적용).

`POST /buses` Body는 `BusSetupParam` (`event/transport/param/BusSetupParam.java`).

### 데이터 모델 (W7 신규 2개 테이블)

```sql
CREATE TABLE event_bus (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  bus_no INT NOT NULL,
  vehicle_layout_id BIGINT NOT NULL,
  assignment_mode ENUM('FREE','FIXED_BY_HOST','FIRST_COME') NOT NULL,
  allow_self_swap TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_event_bus (event_id, bus_no),
  CONSTRAINT fk_event_bus_event FOREIGN KEY (event_id) REFERENCES event(id),
  CONSTRAINT fk_event_bus_vehicle FOREIGN KEY (vehicle_layout_id) REFERENCES vehicle_layout(id)
);

CREATE TABLE event_bus_seat (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,            -- 비정규화 (event_bus.event_id와 동일)
  event_bus_id BIGINT NOT NULL,
  seat_no VARCHAR(10) NOT NULL,
  user_id BIGINT NULL,
  locked_by_host TINYINT(1) NOT NULL DEFAULT 0,
  assigned_at DATETIME NULL,
  assigned_by BIGINT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_event_bus_seat (event_bus_id, seat_no),
  UNIQUE KEY uk_event_bus_user_per_event (event_id, user_id),  -- user_id NULL 다중 허용
  KEY idx_event_bus_seat_user (user_id),
  CONSTRAINT fk_event_bus_seat_bus FOREIGN KEY (event_bus_id) REFERENCES event_bus(id),
  CONSTRAINT fk_event_bus_seat_event FOREIGN KEY (event_id) REFERENCES event(id),
  CONSTRAINT fk_event_bus_seat_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

`event_bus_seat.event_id`는 `event_bus.event_id`의 비정규화. UNIQUE `(event_id, user_id)`로 동일 사용자가 같은 이벤트의 두 버스에 동시에 배정되는 race를 DB 수준에서 차단.

### Enum

- `BusAssignmentMode = {FREE, FIXED_BY_HOST, FIRST_COME}` (`event_bus.assignment_mode`)
- `VehicleSeatType = {NORMAL, DRIVER, GUIDE, FOLDABLE, DISABLED, AISLE}` ([F03-17](F03-17_vehicle-layout-catalog_prd.md))

### 모드별 동작 표

| 모드 | 좌석 row 생성 | 좌석 배정 권한 | `allow_self_swap=true` 효과 | GET seats 응답 |
|---|---|---|---|---|
| `FREE` | 미생성 | (좌석 없음) | 무효 | 빈 배열 |
| `FIXED_BY_HOST` | prepopulate | 호스트만 | 참가자가 **본인 좌석만** swap 가능 (`userId == actorUserId`) | 좌석 + user_id 노출 |
| `FIRST_COME` | prepopulate | 호스트는 항상 가능. 참가자는 `allow_self_swap=true`일 때 본인 선택 가능. `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`로 자동 배정 가능 | 참가자 본인 좌석 선택 허용 | 좌석 + user_id 노출 |

### 최대 3대 제약

서비스 레이어에서 `event.id` 기준 `event_bus` 카운트가 3 이상이면 `POST /buses`는 400 (`MAX_BUSES_EXCEEDED` 예약, 현재는 `INVALID_REQUEST` 변환).

### 동시성 (PLAN.md §4.8)

1. `event_bus` parent row `FOR UPDATE` 잠금 후 seat row 잠금 (lock 순서 일관).
2. `event_bus.eventId != pathEventId` 시 400 (E2E S4-7 — eventId 소속 검증).
3. `UNIQUE(event_id, user_id)` 위반 → `DataIntegrityViolationException` catch → `USER_ALREADY_SEATED_IN_EVENT` 변환.
4. `FIRST_COME` 자동 배정은 `findFirstAvailableForUpdateSkipLocked` (MySQL 8.4 `SKIP LOCKED`).
5. `event_bus.allow_self_swap`/`assignment_mode` 변경은 좌석 배정자 0명일 때만 허용 (`BUS_NOT_EMPTY` 가드 — 본 슬라이스 endpoint 없음, 후속).

### 알림 (NotificationType 81~82, AFTER_COMMIT)

| number | name | 트리거 | 수신자 |
|---|---|---|---|
| 81 | `BUS_SEAT_ASSIGNED` | 호스트가 좌석 배정 또는 `FIRST_COME` 자동 배정 | 좌석 user |
| 82 | `BUS_SEAT_CHANGED` | 호스트가 사용자 좌석을 swap | 좌석 user (oldSeat → newSeat payload) |

### 의존 단위

- **F03-14 transport mode 베이스** — `mode=BUS` 가드의 진실의 원천.
- **F03-17 차량 레이아웃 카탈로그** — `vehicle_layout_id` 참조 + 좌석 prepopulate 소스.
- **F03-05 신청 & 참석** — `FIRST_COME` 자동 배정은 `ApplicationService.confirmPaymentAndAttend`/`approveApplication` 흐름에서 트리거(PLAN.md §4.7). 한 트랜잭션 안에서 `application → capacity → bus` 처리.
- **Unit 12 알림** — NotificationType 81~82 fanout.

## 5. 프론트 계약

본 슬라이스는 **backend-only**. Flutter 좌석 위젯/모델/화면은 후속 슬라이스에서 다룬다.

후속 작업 단위(PLAN.md §4.10):

| 단위 | 작업 |
|---|---|
| 모델 | `event_bus_vo.dart`, `event_bus_seat_vo.dart`, `bus_setup_param.dart`, `bus_seat_assignment_param.dart`, `bus_swap_param.dart` (Freezed) |
| API | `event_bus_api.dart` (Retrofit) — 4개 메서드 |
| Repository | `event_bus_repository.dart` |
| Provider | `domain/providers/event/event_bus_provider.dart` (Riverpod) |
| Widget | `BusSeatLayoutWidget` — GridView/Canvas 좌석 렌더 (seat_type 색상 분기) |
| Screen | 3개 — 버스 추가, 버스 운영(좌석 grid), 참가자 좌석 선택 |
| Router | 신규 라우트 상수 3개 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| AC-01 | 차량 카탈로그 read-only (**E2E S4-1**) | 시드 4종 존재 | `GET /vehicle-layouts/active`에서 28/45/20/8인승 4건 반환 |
| AC-02 | 버스 추가 + FIRST_COME 자동 배정 (**E2E S4-2**) | mode=BUS DRAFT, 28인승 카탈로그 | `POST /buses` 201, `event_bus_seat` 28 row 자동 생성 (user_id=NULL). 발행 후 자동 배정 동작 |
| AC-03 | FIXED_BY_HOST + allow_self_swap=false (**E2E S4-3**) | 호스트가 U1을 3B에 배정 | U1의 자가 swap 시도 403. 호스트의 3B→3C swap은 200 |
| AC-04 | FREE 모드 인원 카운트만 (**E2E S4-4**) | `assignmentMode=FREE` | seat row 0건, `GET seats` 빈 배열, `passengerCount`는 APPROVED 수 추정 |
| AC-05 | 최대 3대 제한 (**E2E S4-5**) | 이미 3대 등록 | 4번째 `POST /buses` 400 `MAX_BUSES_EXCEEDED` |
| AC-06 | bus mode 가드 (**E2E S4-6**) | mode=NONE 또는 mode=CARPOOL | `POST /buses` 400 (mode 가드 실패) |
| AC-07 | eventId 소속 검증 (**E2E S4-7**) | 이벤트 A의 busId=10, 이벤트 B에 busId=20 | `GET /events/A/buses/20/seats` 400 (INVALID_REQUEST) |
| AC-08 | 동일 사용자 두 버스 배정 race | 동시 2개 트랜잭션이 U1을 bus1, bus2에 배정 | 1건만 성공, 다른 건은 `USER_ALREADY_SEATED_IN_EVENT` (DataIntegrityViolation 변환) |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | `EventBusController` 4 endpoints + `EventBusService` mode 가드 + `MAX_BUSES_PER_EVENT=3` | W7에서 구현 완료 |
| VO 추출 | `EventBusVo`, `EventBusSeatVo` 분리 | W7에서 완료 |
| 동시성 | `event_bus` parent lock + seat `FOR UPDATE` + UNIQUE 변환 | PLAN.md §4.8 명세대로 구현. SKIP LOCKED는 MySQL 8.4 지원 |
| eventId 소속 검증 | `bus.eventId != pathEventId` 시 400 | E2E S4-7로 검증 |
| Flutter 좌석 위젯 | `BusSeatLayoutWidget` 등 미구현 | **후속 슬라이스** — backend-only 1차 |
| 관리자 차량 카탈로그 SPA | community_admin_api UI | **본 슬라이스 범위 외** (Q5 사용자 확정) — [F03-17](F03-17_vehicle-layout-catalog_prd.md) 참조 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후속 | PLAN.md §4.10 | Flutter 좌석 위젯/모델/Screen 전체 미구현 | 후속 슬라이스에서 진행. `BusSeatLayoutWidget` 디자인 + Provider/Repository |
| 후속 | PLAN.md §4.8 | bus 삭제·모드 변경 endpoint 미포함 (`BUS_NOT_EMPTY` 가드 포함) | 후속 슬라이스에서 추가 |
| 후속 | [F03-17 Gap](F03-17_vehicle-layout-catalog_prd.md) | 관리자 차량 카탈로그 CRUD SPA(community_admin_api) 미구현 — Q5 사용자 확정으로 1차 출시 범위 외 | community_admin_api 후속 슬라이스에서 진행. 1차는 admin API + 시드 4종 INSERT로 운영 |
| Risk | PLAN.md 회귀 위험 9 | `autoAssignOnApproval` 훅이 `ApplicationService` 흐름에 들어가야 함 — 한 트랜잭션 안에서 application → capacity → bus 처리 | W7 후속 가드 추가 (현 슬라이스는 endpoint만 노출) |
| Risk | E2E S5-3 / S5-4 | 호스트 이벤트 취소 시 좌석 배정자 알림 + 데이터 정리 정책 | 후속 슬라이스에서 정의 |

## 9. 변경 이력

| 일자 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 신규 — W7 버스대절 운영 슬라이스 반영 (PLAN.md v4.5 §4 + E2E S4-1~S4-7). backend-only 1차 출시. Flutter 좌석 위젯·관리자 CRUD SPA는 후속 |
