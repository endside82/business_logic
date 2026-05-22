# F03-14. 이동수단 공통 베이스 (Transport Mode) PRD

<!-- generated: source-first-event-extensions; updated: 2026-05-22; plan: docs/plan/event-extensions/PLAN.md v4.5 §3, §4 / W4 슬라이스 -->

> 문서 상태: **신규 PRD**. 본 문서는 PLAN.md v4.5의 §3.2(mode 전이 정책)와 §4(이벤트 측 버스 운영)에서 정한 "이동수단 공통 베이스"를 PRD 구조로 정리한 것이다. 카풀 운영 세부는 [F03-15](F03-15_event-carpool_prd.md), 버스 운영 세부는 [F03-16](F03-16_event-bus-charter_prd.md), 차량 카탈로그는 [F03-17](F03-17_vehicle-layout-catalog_prd.md)을 함께 본다. 본 슬라이스는 backend-only 1차 출시이며, Flutter 클라이언트는 후속 슬라이스다.

## 1. 결론

이벤트 상세 운영의 새 차원으로 **이동수단 mode(NONE/CARPOOL/BUS)** 를 도입한다. 한 이벤트는 한 mode만 선택할 수 있고(**D2 — 택일**), mode 내부에서만 "개별이동 허용(`allows_self_transport`)" 토글을 둔다. mode는 **`DRAFT` 상태에서만 자유롭게 바꿀 수 있고**(이전 mode 데이터 hard delete), 발행(OPEN) 이후에는 immutable 이다. mode-internal 운영 설정(개별이동 허용 등)은 OPEN 상태에서도 계속 변경 가능하다.

호스트의 진입 흐름은 다음을 기준으로 판단한다.

- 이벤트 생성 또는 수정(F03-03/F03-04) ▶ 이동수단 섹션 ▶ mode 선택(NONE/CARPOOL/BUS)
- mode=CARPOOL 선택 ▶ [F03-15 카풀](F03-15_event-carpool_prd.md) 운영 화면으로 분기
- mode=BUS 선택 ▶ [F03-16 버스대절](F03-16_event-bus-charter_prd.md) 운영 화면으로 분기
- mode=NONE은 기본값 — 별도 이동수단 운영 없음 (전원 개별이동)

이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, `event_transport_config` 단일 row가 mode/개별이동 토글을 가지며 어떤 endpoint로 read·write 되는지다. 둘째, mode 변경이 언제 허용/거부되며 데이터 삭제 범위가 어디까지인지다. 셋째, mode immutability가 OPEN 후 어떻게 enforce 되고, mode-internal 토글이 어디서 변경 가능한지다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Plan | [PLAN.md v4.5 §3.2 / §4.4](../../../../docs/plan/event-extensions/PLAN.md) | 있음 | 데이터 모델, mode 전이 정책, immutable 원칙 |
| Enum | [ENUM_RESERVATIONS.md](../../../../docs/plan/event-extensions/ENUM_RESERVATIONS.md) | 있음 | `TransportMode/CarpoolStatus/TransportChoice/BusAssignmentMode` 예약 |
| E2E | [E2E_SCENARIOS.md S3-1, S3-5](../../../../docs/plan/event-extensions/E2E_SCENARIOS.md) | 있음 | mode 설정 + mode 변경 차단 + DRAFT 전환 시 hard delete |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventTransportController.java:22` (GET) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventTransportController.java:27` (PUT) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/service/EventTransportService.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/model/EventTransportConfig.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/vo/EventTransportConfigVo.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/param/TransportConfigParam.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/constants/TransportMode.java` | 확인됨 |

## 3. 전체 동작 흐름

1. **조회**: 호스트/공동호스트(또는 참가자)가 이벤트 상세 진입 시 `GET /api/v1/events/{eventId}/transport`로 현재 설정 확인. row 없으면 기본값(`{mode:NONE, allowsSelfTransport:true}`)을 가상 반환.
2. **DRAFT 상태에서 mode 선택**: 호스트가 `PUT /api/v1/events/{eventId}/transport/config` Body `{"mode":"CARPOOL","allowsSelfTransport":true}` 호출.
3. **DRAFT 상태에서 mode 변경**: 같은 endpoint로 다른 mode 지정 시 이전 mode 데이터(carpool offer/passenger, event_bus, event_bus_seat)는 **hard delete**. 알림·감사 없음(§3.2 PLAN.md).
4. **이벤트 발행**: `POST /events/{eventId}/publish` 호출 시점 이후 `event.status=OPEN, published_at != NULL` 로 전이되며 이후 mode 변경 불가.
5. **OPEN 상태에서 토글**: `allowsSelfTransport` 단일 토글만 같은 endpoint로 변경 가능. mode 필드를 보내면 400/409 (PLAN §3.2: `MODE_CHANGE_NOT_ALLOWED`).
6. **mode-internal 변경**: `event_bus.allow_self_swap`, `event_bus.assignment_mode`는 본 PRD 범위 밖. [F03-16](F03-16_event-bus-charter_prd.md) `§ 동시성`에서 좌석 배정자 0명 조건으로 변경 허용.

## 4. 서버 계약

### 개요

이동수단 도메인 신규 패키지 `event/transport/`. 단일 row PK = `event_id`인 `event_transport_config` 테이블을 통해 mode + 개별이동 허용 여부를 관리한다. mode 변경 시 carpool/bus 종속 데이터를 cascade-delete 하는 책임은 `EventTransportService.changeMode` (DRAFT 한정).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/transport` | `EventTransportController#getTransport` | 인증 | 현재 mode/`allowsSelfTransport` 조회. row 없으면 기본값 |
| PUT | `/api/v1/events/{eventId}/transport/config` | `EventTransportController#updateConfig` | 호스트/공동호스트 | DRAFT면 mode 변경 가능. OPEN이면 `allowsSelfTransport`만 변경 가능. mode 변경 시 이전 mode 데이터 hard delete |

### 데이터 모델 (W4 신규)

```sql
CREATE TABLE event_transport_config (
  event_id BIGINT NOT NULL PRIMARY KEY,
  mode ENUM('NONE','CARPOOL','BUS') NOT NULL DEFAULT 'NONE',
  allows_self_transport TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_event_transport_event FOREIGN KEY (event_id) REFERENCES event(id)
);
```

`TransportMode` enum (`event/transport/constants/TransportMode.java`): `NONE, CARPOOL, BUS`. PLAN.md `ENUM_RESERVATIONS.md`에 등록.

### 사용자 확정 결정 (관련)

| ID | 결정 |
|---|---|
| D2 | 이동수단 모드 **택일** — CARPOOL/BUS 동시 운영 불가. 한 이벤트는 한 mode만. |
| D10 | enum 번호 예약은 `docs/plan/event-extensions/ENUM_RESERVATIONS.md`에 명시 |

### mode 전이 정책 (PLAN.md §3.2)

| from \ to | NONE | CARPOOL | BUS |
|---|---|---|---|
| NONE (DRAFT) | — | 허용 | 허용 |
| CARPOOL (DRAFT) | 허용 + carpool 데이터 hard delete | — | 허용 + carpool hard delete |
| BUS (DRAFT) | 허용 + bus 데이터 hard delete | 허용 + bus hard delete | — |
| 모든 mode (OPEN 이후) | **차단** (`MODE_CHANGE_NOT_ALLOWED`) | 차단 | 차단 |

OPEN 이후에도 변경 가능:
- `allows_self_transport` 토글 (본 PRD)
- `event_bus.allow_self_swap`, `assignment_mode` (좌석 배정자 0명 조건, [F03-16](F03-16_event-bus-charter_prd.md))
- carpool offer 결정 / passenger 배정 / 좌석 배정 등 mode 내부 운영 ([F03-15](F03-15_event-carpool_prd.md), [F03-16](F03-16_event-bus-charter_prd.md))

### 의존 단위

- **F03-03 이벤트 생성**, **F03-04 이벤트 생명주기** — mode 선택 UI를 호스팅. 발행 시점이 mode immutable 경계.
- **F03-15 카풀** — mode=CARPOOL일 때만 모든 carpool endpoint 활성 (`assertCarpoolMode` 가드).
- **F03-16 버스대절** — mode=BUS일 때만 모든 bus endpoint 활성 (mode 가드).
- **F03-17 차량 레이아웃 카탈로그** — mode=BUS 진입 시 호스트가 read-only로 카탈로그 선택.
- 외부 시스템: 없음.

## 5. 프론트 계약

본 슬라이스는 **backend-only 1차 출시**. Flutter 클라이언트는 후속 슬라이스에서 다룬다.

후속에서 다룰 작업 단위(PLAN.md §3.8):

| 단위 | 작업 |
|---|---|
| 모델 | `event_transport_config_vo.dart`, `transport_config_param.dart` (Freezed) |
| API | `event_transport_api.dart` (Retrofit) — `getTransport`, `updateConfig` |
| Repository | `event_transport_repository.dart` |
| Provider | `domain/providers/event/event_transport_provider.dart` (Riverpod) |
| Screen | 이벤트 생성/수정 폼 내 "이동수단" 섹션 — mode 토글 + DRAFT 변경 안내 |
| Router | 별도 라우트 신설 불필요(생성·수정 폼 내 inline) |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| AC-01 | DRAFT에서 mode=CARPOOL 설정 | 이벤트 DRAFT, transport row 없음 | `event_transport_config(mode=CARPOOL, allowsSelfTransport=true)` row 생성, 호스트 후속 carpool 운영 가능 |
| AC-02 | DRAFT에서 mode=CARPOOL→BUS 전환 | 이벤트 DRAFT, carpool offer/passenger 존재 | `event_transport_config.mode=BUS`, `event_carpool_offer/passenger` row 0건 (hard delete) |
| AC-03 | OPEN에서 mode 변경 시도 차단 | 이벤트 OPEN, transport mode=CARPOOL | 400/409 `MODE_CHANGE_NOT_ALLOWED`, mode 변경 없음 |
| AC-04 | OPEN에서 `allowsSelfTransport` 토글 변경 | 이벤트 OPEN, mode=CARPOOL | 200, `allowsSelfTransport`만 변경됨 |
| AC-05 | 비호스트가 PUT 시도 | 일반 참가자, 이벤트 OPEN | 403/401 권한 거부, 변경 없음 |
| AC-06 | row 없는 상태에서 GET | 신규 이벤트, transport row 미생성 | 200, 기본값 `{mode:NONE, allowsSelfTransport:true}` 반환 |

근거: E2E S3-1 (mode 설정 + DRAFT/OPEN 전환 차단), S3-5 (DRAFT 전환 시 stale 데이터 hard delete).

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | `EventTransportController` + `EventTransportService.changeMode` 분기, `event_transport_config` 단일 row 보장 | W4에서 구현 완료. mode 변경 시 cascade-delete는 PLAN.md §3.2 정책 |
| Enum 예약 | `TransportMode` 등 4개 enum이 `ENUM_RESERVATIONS.md`와 일치 | W4에서 등록 완료. 검증 테스트(`EnumReservationTest`)로 enforce |
| Mode immutability | OPEN 이후 mode 변경 시 `event.status` 가드로 차단 | PLAN.md §3.2 원칙 — 컨트롤러/서비스 둘 다 가드 필요 |
| Cross-mode 데이터 격리 | mode=BUS일 때 carpool endpoint 차단, 반대도 동일 | [F03-15](F03-15_event-carpool_prd.md)/[F03-16](F03-16_event-bus-charter_prd.md)의 `assertXxxMode` 가드 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후속 | PLAN.md §3.8 | Flutter 클라이언트(모델/API/Provider/Screen) 미구현 — backend-only 1차 출시 | 후속 슬라이스에서 진행. 본 슬라이스 종료 후 화면 작업 단위 분리 |
| 후속 | PLAN.md §3.2 | mode 변경 시 cascade-delete 범위 확장 (예: bus 좌석 배정자 알림) — 현재 hard delete만 | 정책 필요 시 별도 슬라이스에서 정의 |
| Risk | PLAN.md 회귀 위험 6 | "이미 발행한 이벤트의 mode 변경 불가" 사용성 영향 가능. 운영 fallback은 admin API로 강제 reset | 운영 매뉴얼에 admin API 호출 절차 명시 필요 |

## 9. 변경 이력

| 일자 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 신규 — W4 transport baseline 슬라이스 반영 (PLAN.md v4.5 §3.2/§4 + E2E S3-1/S3-5) |
