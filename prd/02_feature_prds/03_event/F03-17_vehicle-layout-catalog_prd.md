# F03-17. 차량 레이아웃 카탈로그 (Vehicle Layout Catalog) PRD

<!-- generated: source-first-event-extensions; updated: 2026-05-22; plan: docs/plan/event-extensions/PLAN.md v4.5 §4.1~§4.3 / W6 슬라이스 -->

> 문서 상태: **신규 PRD**. mode 베이스는 [F03-14](F03-14_event-transport-mode_prd.md), 이벤트 측 버스 운영은 [F03-16](F03-16_event-bus-charter_prd.md)을 함께 본다. 본 슬라이스는 호스트용 **read-only API + 시드 4종**만 1차 출시 범위에 포함한다. **관리자 차량 카탈로그 CRUD UI(SPA)는 후속 슬라이스** — Q5 사용자 확정에 따라 `community_admin_api`에서 분리해 다룬다.

## 1. 결론

[F03-16 버스대절](F03-16_event-bus-charter_prd.md)에서 호스트가 버스를 추가하려면 사전에 정의된 **차량 레이아웃(좌석 그림)** 을 선택해야 한다. 이 카탈로그는 운영자가 관리하는 마스터 데이터이며, 본 슬라이스에서는:

1. `vehicle_layout` + `vehicle_layout_seat` 테이블 신설
2. **시드 4종** INSERT: 28인승 A타입, 45인승, 20인승, 8인승(운전자 제외)
3. 호스트용 read-only endpoint 2개 신설 — `GET /api/v1/vehicle-layouts/active`, `GET /api/v1/vehicle-layouts/{id}/seats`

관리자 CRUD(엔드포인트 + SPA UI)는 본 슬라이스 범위 외다. PLAN.md §4.3에 따라 1차 운영은 직접 INSERT 또는 admin API 호출(community_admin_api)로 처리하고, SPA UI는 후속 슬라이스에서 추가한다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Plan | [PLAN.md v4.5 §4.1~§4.3](../../../../docs/plan/event-extensions/PLAN.md) | 있음 | 데이터 모델 + Q5 사용자 확정(1차 SPA UI 제외) |
| Enum | [ENUM_RESERVATIONS.md VehicleSeatType](../../../../docs/plan/event-extensions/ENUM_RESERVATIONS.md) | 있음 | `VehicleSeatType` 예약 |
| E2E | [E2E_SCENARIOS.md S4-1](../../../../docs/plan/event-extensions/E2E_SCENARIOS.md) | 있음 | 시드 4종 + read-only 동작 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/transport/controller/VehicleLayoutController.java:27` (GET active) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/VehicleLayoutController.java:32` (GET {id}/seats) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/model/VehicleLayout.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/model/VehicleLayoutSeat.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/repository/VehicleLayoutRepository.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/repository/VehicleLayoutSeatRepository.java` | 확인됨 |

## 3. 전체 동작 흐름

1. **호스트가 버스 추가 화면 진입** (F03-16의 후속 Flutter 화면): `GET /api/v1/vehicle-layouts/active` 호출.
2. **선택지 노출**: `is_active=1` row만 반환 (시드 4종 + 운영자가 admin API로 추가한 row).
3. **선택된 layout의 좌석 그림 미리보기**: `GET /api/v1/vehicle-layouts/{id}/seats` → 좌석 목록(`row_index, col_index, seat_type, seat_no, is_selectable`)을 그리드 렌더링 (Flutter는 후속).
4. **버스 추가**: 호스트가 `POST /api/v1/events/{eventId}/buses`에 `vehicleLayoutId` 전달 ([F03-16](F03-16_event-bus-charter_prd.md)). 본 PRD 범위 밖.

## 4. 서버 계약

### 엔드포인트 요약 (호스트용 read-only 2개)

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/vehicle-layouts/active` | `VehicleLayoutController#getActive` | 인증 | `is_active=1` layout 목록 반환 |
| GET | `/api/v1/vehicle-layouts/{id}/seats` | `VehicleLayoutController#getSeats` | 인증 | 해당 layout의 좌석 row 목록 반환 |

### 데이터 모델 (W6 신규 2개 테이블)

```sql
CREATE TABLE vehicle_layout (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  seat_count INT NOT NULL,
  description VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE vehicle_layout_seat (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vehicle_layout_id BIGINT NOT NULL,
  seat_no VARCHAR(10) NOT NULL,
  row_index INT NOT NULL,
  col_index INT NOT NULL,
  seat_type ENUM('NORMAL','DRIVER','GUIDE','FOLDABLE','DISABLED','AISLE') NOT NULL DEFAULT 'NORMAL',
  is_selectable TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_vehicle_layout_seat (vehicle_layout_id, seat_no),
  KEY idx_vehicle_layout_seat_layout (vehicle_layout_id),
  CONSTRAINT fk_vehicle_layout_seat_layout FOREIGN KEY (vehicle_layout_id) REFERENCES vehicle_layout(id)
);
```

### Enum

`VehicleSeatType = {NORMAL, DRIVER, GUIDE, FOLDABLE, DISABLED, AISLE}` — Flutter 좌석 위젯에서 색상/터치 가능 여부 분기. `DRIVER`, `GUIDE`, `AISLE`는 `is_selectable=false`가 일반적.

### 시드 4종 (1차 출시 포함)

`docs/sql/repair_local_schema_2026-05-22.sql` 또는 V1__init.sql 이벤트 도메인 섹션에 INSERT.

| name | seat_count | 특징 |
|---|---|---|
| 28인승 A타입 | 28 | 일반 관광버스 표준 레이아웃 |
| 45인승 | 45 | 대형버스 표준 |
| 20인승 | 20 | 미니버스 |
| 8인승 | 8 | 운전자 제외 — 카니발/스타리아 |

좌석 row는 layout별로 vehicle_layout_seat에 미리 INSERT (`seat_no` = "1A", "1B" 등). E2E S4-1에서 `GET /active`가 4건을 반환하는지 검증한다.

### 관리자 측 (후속 슬라이스)

PLAN.md §4.2에 따른 admin endpoint는 `community_admin_api`에 후속으로 추가한다. 본 슬라이스에서는 신설하지 않으며, 1차 운영은 DB INSERT 또는 운영자 매뉴얼로 처리한다.

| Method | Path | 비고 |
|---|---|---|
| GET | `/admin/v1/manage/vehicle-layouts` | 후속 슬라이스 (community_admin_api) |
| POST | `/admin/v1/manage/vehicle-layouts` | 후속 |
| PUT | `/admin/v1/manage/vehicle-layouts/{id}` | 후속 |
| DELETE | `/admin/v1/manage/vehicle-layouts/{id}` | 후속 (soft delete, `is_active=0`) |
| GET | `/admin/v1/manage/vehicle-layouts/{id}/seats` | 후속 |

### 의존 단위

- **F03-16 버스대절** — `event_bus.vehicle_layout_id`가 `vehicle_layout.id`를 참조. 좌석 prepopulate 시 `vehicle_layout_seat.is_selectable=true`만 사용.
- **community_admin_api** — 관리자 CRUD endpoint + SPA UI 후속 슬라이스.

## 5. 프론트 계약

본 슬라이스는 **호스트용 read-only API 노출까지**. Flutter 클라이언트는 [F03-16](F03-16_event-bus-charter_prd.md)의 후속 슬라이스에서 다룬다(버스 추가 화면이 이 카탈로그를 소비).

후속 작업 단위(PLAN.md §4.10):

| 단위 | 작업 |
|---|---|
| 모델 | `vehicle_layout_vo.dart`, `vehicle_layout_seat_vo.dart` (Freezed) |
| API | `vehicle_layout_api.dart` (Retrofit, read-only 2개 메서드) |
| Repository | `vehicle_layout_repository.dart` |
| Provider | `domain/providers/event/vehicle_layout_provider.dart` |
| Widget | F03-16 `BusSeatLayoutWidget`이 본 데이터 소비 |

관리자 SPA(community_admin_api 측 별도 Flutter Web 또는 React)는 본 슬라이스 범위 외.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| AC-01 | 시드 4종 read-only 노출 (**E2E S4-1**) | 시드 적용된 DB | `GET /vehicle-layouts/active` → 28인승 A타입/45인승/20인승/8인승 4건 |
| AC-02 | 좌석 그림 조회 | layout id 선택 | `GET /vehicle-layouts/{id}/seats` → 좌석 row 목록 (`row_index, col_index, seat_type, is_selectable`) |
| AC-03 | 비활성 layout 제외 | 운영자가 `is_active=0` 설정 | `GET /active` 응답에 미노출. `GET /{id}/seats`는 직접 조회 시 가능 |
| AC-04 | 비인증 접근 | 토큰 없음 | 401 (인증 필수) |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | `VehicleLayoutController` read-only 2개 | W6에서 구현 완료 |
| 시드 4종 | DB INSERT로 28/45/20/8인승 등록 | W6에서 시드 INSERT 포함 (E2E S4-1로 검증) |
| 관리자 CRUD endpoint | `/admin/v1/manage/vehicle-layouts/*` | **후속 슬라이스(community_admin_api)** — Q5 사용자 확정 |
| 관리자 SPA UI | community_admin_api 프론트엔드 | **본 슬라이스 범위 외** — 운영은 직접 INSERT/admin API 호출 |
| Flutter 호스트용 모델/API | `vehicle_layout_api.dart` 등 | **후속 슬라이스** — F03-16 클라이언트와 함께 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후속 | PLAN.md §4.2 / §4.3 | 관리자 CRUD endpoint(`/admin/v1/manage/vehicle-layouts/*`)와 SPA UI 미구현 | `community_admin_api` 후속 슬라이스에서 진행 (Q5 사용자 확정) |
| 후속 | E2E S9-* | 관리자 CRUD UI 시나리오 미작성 | community_admin_api SPA 슬라이스에서 추가 |
| Risk | PLAN.md 회귀 위험 7 | `vehicle_layout` 공유 DB 가정 — `community_admin_api`가 동일 MySQL 인스턴스를 사용해야 함. 인스턴스 분리 시 별도 plan 필요 | 인프라 검토 필요. 분리 결정 시 admin이 community_api endpoint를 호출하는 형태로 재설계 |
| Risk | 운영 | 1차 출시는 운영자가 직접 SQL INSERT — 좌석 데이터 작성 오류 가능 | 시드 INSERT 검수 + 향후 SPA UI 도입 시 검증 폼 |

## 9. 변경 이력

| 일자 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 신규 — W6 차량 카탈로그 슬라이스 반영 (PLAN.md v4.5 §4.1~§4.3 + E2E S4-1). 호스트용 read-only API + 시드 4종까지 1차. 관리자 CRUD SPA는 후속 |
