# F03-15. 이벤트 카풀 (CARPOOL) PRD

<!-- generated: source-first-event-extensions; updated: 2026-05-22; plan: docs/plan/event-extensions/PLAN.md v4.5 §3 / W5 슬라이스 -->

> 문서 상태: **신규 PRD**. mode 공통 베이스는 [F03-14](F03-14_event-transport-mode_prd.md), 버스 운영은 [F03-16](F03-16_event-bus-charter_prd.md)을 참조한다. 본 슬라이스는 **backend-only 1차 출시** — Flutter 클라이언트(모델·API·Repository·Provider·Screen)는 후속 슬라이스 [F03-15 client]에서 진행한다. 카풀 swap 로그(`event_carpool_assignment_log`) 기록도 후속 슬라이스에서 다룬다.

## 1. 결론

이벤트 `mode=CARPOOL` 일 때, 호스트가 **운전자 지원(offer)** 을 받아 **확정(decideOffer)** 하고, 참가자가 본인의 **이동수단 선택(transport_choice)** 을 기록한 뒤, 호스트가 픽업 인원(`pickup_capacity`) 한도 안에서 탑승자를 **조 편성(assign)** 한다. 모든 endpoint는 `assertCarpoolMode`로 mode 가드되며, `mode=NONE` 또는 `mode=BUS` 이벤트에서는 400을 반환한다.

요구사항 #3의 매핑:

| 요구 | 본 PRD에서 어디로 |
|---|---|
| 운전자 지원 | `POST /carpool/offer` (driver 본인, OFFERED 상태로 생성) |
| 픽업 인원 / 픽업 가능지 | `event_carpool_offer.pickup_capacity, pickup_locations` |
| 탑승가능지 / 탑승자 본인 의사 | `event_carpool_passenger.transport_choice, boarding_location` (`PUT /carpool/passenger`) |
| 호스트 확정 | `POST /carpool/offers/{offerId}/decision` (CONFIRMED/REJECTED) |
| 조 편성 swap | `PUT /carpool/passengers/{passengerId}/assignment?offerId=` (배정/해제) |
| 개별이동 | `transport_choice=SELF` 또는 mode=CARPOOL의 `allowsSelfTransport=true` 토글 |

호스트의 진입 흐름은 다음을 기준으로 판단한다.

- 이벤트 상세(F03-02) 호스트 액션 → "카풀 운영" 화면 (후속 슬라이스)
- 본 슬라이스는 backend-only이므로 운영은 Postman/curl로 endpoint 직접 호출

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Plan | [PLAN.md v4.5 §3.1~§3.9](../../../../docs/plan/event-extensions/PLAN.md) | 있음 | 데이터 모델, 동시성, 알림 |
| Enum | [ENUM_RESERVATIONS.md NotificationType 77~80](../../../../docs/plan/event-extensions/ENUM_RESERVATIONS.md) | 있음 | 카풀 알림 4종 |
| E2E | [E2E_SCENARIOS.md S3-1~S3-5](../../../../docs/plan/event-extensions/E2E_SCENARIOS.md) | 있음 | 운영 흐름 / mode 가드 / 권한 보호 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventCarpoolController.java:29` (GET offers) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventCarpoolController.java:36` (GET passengers) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventCarpoolController.java:43` (POST offer) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventCarpoolController.java:52` (POST offer decision) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventCarpoolController.java:62` (PUT passenger) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/controller/EventCarpoolController.java:71` (PUT passenger assignment) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/service/EventCarpoolService.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/model/EventCarpoolOffer.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/model/EventCarpoolPassenger.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/constants/CarpoolStatus.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/transport/constants/TransportChoice.java` | 확인됨 |

## 3. 전체 동작 흐름

1. **mode 가드 진입**: 모든 carpool endpoint 첫 단계에서 `EventCarpoolService.assertCarpoolMode(eventId)` 호출 → `event_transport_config.mode=CARPOOL`이 아니면 400.
2. **참가자 → 운전자 자처**: 운전자 D1이 `PUT /carpool/passenger` Body `{"transportChoice":"DRIVER","boardingLocation":"강남역"}` 후 `POST /carpool/offer` Body `{"pickupCapacity":3,"pickupLocations":"강남역, 양재역","notes":"카니발"}` → `event_carpool_offer(status=OFFERED)` 생성.
3. **호스트 확정/거절**: `POST /carpool/offers/{offerId}/decision?decision=CONFIRMED|REJECTED` → 상태 전이 + 운전자 알림 (`CARPOOL_OFFER_CONFIRMED`/`CARPOOL_OFFER_REJECTED`).
4. **탑승자 등록**: 일반 참가자가 `PUT /carpool/passenger` Body `{"transportChoice":"CARPOOL_REQUESTED","boardingLocation":"양재역"}` → passenger row upsert (UNIQUE event_id+user_id).
5. **호스트 배정**: 호스트가 `PUT /carpool/passengers/{passengerId}/assignment?offerId=` 호출 → `assigned_offer_id, assigned_at, assigned_by` 기록 + `transport_choice=CARPOOL_ASSIGNED` 전이. `pickup_capacity` 초과 시 400 차단.
6. **권한 가드 조회**: `GET /carpool/passengers`는 host/coHost이면 전체 반환, 일반 사용자는 본인 row 1건만.

## 4. 서버 계약

### 엔드포인트 요약 (8개)

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/carpool/offers` | `EventCarpoolController#getOffers` | 인증 | offer 전체 목록 (mode 가드) |
| GET | `/api/v1/events/{eventId}/carpool/passengers` | `EventCarpoolController#getPassengers` | 인증 | host/coHost는 전체, 일반 사용자는 본인 row만 |
| POST | `/api/v1/events/{eventId}/carpool/offer` | `EventCarpoolController#registerOffer` | 운전자 본인 | `pickup_capacity`, `pickup_locations` 등 입력 → `status=OFFERED` |
| POST | `/api/v1/events/{eventId}/carpool/offers/{offerId}/decision` | `EventCarpoolController#decideOffer` | 호스트/공동호스트 | `decision=CONFIRMED\|REJECTED` 쿼리, status 전이 + 운전자 알림 |
| PUT | `/api/v1/events/{eventId}/carpool/passenger` | `EventCarpoolController#registerPassenger` | 본인 | `transport_choice`, `boarding_location` upsert |
| PUT | `/api/v1/events/{eventId}/carpool/passengers/{passengerId}/assignment` | `EventCarpoolController#assign` | 호스트/공동호스트 | `?offerId=` 쿼리. null이면 해제. `pickup_capacity` 초과 시 400 |
| POST | `/api/v1/events/{eventId}/carpool/offers/{offerId}/report` | `EventCarpoolController#reportDriver` | 인증 | 카풀 운전자 안전신고 (Wave RS-002 P3-B, 갱신 2026-06-05) |

### 카풀 운전자 안전신고 (Wave RS-002 P3-B, 갱신 2026-06-05)

> 소스: `EventCarpoolController.java:68-75`, `ReportType.java:7-24`.

`POST /api/v1/events/{eventId}/carpool/offers/{offerId}/report`

- **인증**: 인증된 사용자 (본인 또는 탑승자)
- **Body**: `CarpoolReportParam { reason: String @NotBlank (ReportReason.name()), description: String (max 500, nullable) }`
- **응답**: `ReportVo`
- **ReportType**: `CARPOOL(6)` — targetId=운전자 userId, contextId=offerId
- **Flutter 배선**: `carpool_report_param.dart` + `event_carpool_api.dart:13` + `carpool_report_screen.dart` (+180줄) + 라우트 `eventCarpoolReport = '/events/:eventId/carpool/offers/:offerId/report'`

**ReportType 전체 값** (`ReportType.java:7-24`): USER(0), EVENT(1), REVIEW(2), EVENT_PHOTO(3), EVENT_MESSAGE(4), DATE_USER(5), **CARPOOL(6)**, CLUB(7)

**ReportReason 전체 값** (`ReportReason.java:7-13`): HARASSMENT(1), INAPPROPRIATE(2), NO_SHOW(3), FRAUD(4), OTHER(5), LATE(6), BAD_MANNER(7)

`POST /events/{id}/carpool/offer` Body는 `CarpoolOfferParam` (Freezed-equivalent), `PUT /carpool/passenger` Body는 `CarpoolPassengerParam`. 두 param 클래스 모두 `event/transport/param/`에 정의.

### 데이터 모델 (W5 신규 3개 테이블)

```sql
CREATE TABLE event_carpool_offer (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  driver_user_id BIGINT NOT NULL,
  pickup_capacity INT NOT NULL,
  pickup_locations VARCHAR(1000) NULL,
  status ENUM('OFFERED','CONFIRMED','REJECTED','CANCELED') NOT NULL DEFAULT 'OFFERED',
  host_decided_at DATETIME NULL,
  host_decided_by BIGINT NULL,
  notes VARCHAR(500) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_carpool_offer_event_driver (event_id, driver_user_id),
  CONSTRAINT fk_carpool_offer_event FOREIGN KEY (event_id) REFERENCES event(id),
  CONSTRAINT fk_carpool_offer_driver FOREIGN KEY (driver_user_id) REFERENCES users(user_id)
);

CREATE TABLE event_carpool_passenger (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  transport_choice ENUM('CARPOOL_REQUESTED','CARPOOL_ASSIGNED','SELF','DRIVER') NOT NULL,
  boarding_location VARCHAR(500) NULL,
  assigned_offer_id BIGINT NULL,
  assigned_at DATETIME NULL,
  assigned_by BIGINT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_carpool_passenger_event_user (event_id, user_id),
  KEY idx_carpool_passenger_offer (assigned_offer_id),
  CONSTRAINT fk_carpool_passenger_event FOREIGN KEY (event_id) REFERENCES event(id),
  CONSTRAINT fk_carpool_passenger_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_carpool_passenger_offer FOREIGN KEY (assigned_offer_id) REFERENCES event_carpool_offer(id)
);

CREATE TABLE event_carpool_assignment_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  passenger_id BIGINT NOT NULL,
  offer_id BIGINT NULL,
  action ENUM('ASSIGN','UNASSIGN','SWAP') NOT NULL,
  actor_user_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_carpool_log_event (event_id)
);
```

> **swap 로그 미기록(후속)**: `event_carpool_assignment_log` 스키마는 W5에 포함되었으나, 현 슬라이스의 `assign` 서비스에서는 로그 INSERT를 수행하지 않는다. 후속 슬라이스에서 `EventCarpoolService.assign` 안에 INSERT를 추가한다.

### Enum

- `TransportMode = {NONE, CARPOOL, BUS}` (F03-14 공통)
- `CarpoolStatus = {OFFERED, CONFIRMED, REJECTED, CANCELED}` (`event_carpool_offer.status`)
- `TransportChoice = {CARPOOL_REQUESTED, CARPOOL_ASSIGNED, SELF, DRIVER}` (`event_carpool_passenger.transport_choice`)

### 권한 정책

| 액션 | 호출자 | 가드 |
|---|---|---|
| `POST /carpool/offer` | 운전자 본인 | mode 가드 + driver_user_id = principal.userId |
| `POST /carpool/offers/{offerId}/decision` | 호스트/공동호스트 | mode 가드 + assertHostOrCoHost |
| `PUT /carpool/passenger` | 본인 | mode 가드 + user_id = principal.userId |
| `PUT /carpool/passengers/{pid}/assignment` | 호스트/공동호스트 | mode 가드 + assertHostOrCoHost + `pickup_capacity` 초과 차단 |
| `GET /carpool/offers` | 인증된 사용자 | mode 가드 |
| `GET /carpool/passengers` | 인증된 사용자 | mode 가드. host/coHost면 전체, 그 외는 본인 row만 (E2E S3-4) |

### 동시성 (PLAN.md §3.6)

- offer/passenger row 잠금은 `id ASC` 정렬로 `FOR UPDATE` (parent row lock + unique 변환). 데드락 방지.
- `pickup_capacity` 초과 시 service-level 400 (`CARPOOL_OFFER_FULL` 예약, 현 ErrorCode는 `INVALID_REQUEST`로 매핑).

### 알림 (NotificationType 77~80, AFTER_COMMIT)

| number | name | 트리거 | 수신자 |
|---|---|---|---|
| 77 | `CARPOOL_OFFER_CONFIRMED` | `decideOffer(CONFIRMED)` | offer 운전자 |
| 78 | `CARPOOL_OFFER_REJECTED` | `decideOffer(REJECTED)` | offer 운전자 |
| 79 | `CARPOOL_PASSENGER_ASSIGNED` | `assign(offerId != null)` | passenger 본인 |
| 80 | `CARPOOL_PASSENGER_UNASSIGNED` | `assign(offerId = null)` | passenger 본인 |

### 의존 단위

- **F03-14 transport mode 베이스** — mode 가드의 진실의 원천(`event_transport_config.mode`).
- **F03-05 신청 & 참석** — passenger 등록·offer 등록은 `application.status=APPROVED` 전제(현 슬라이스는 검증 미적용 — Plan §3.5 "이벤트 시작 24시간 전 + APPROVED" 검증은 후속).
- **Unit 12 알림** — NotificationType 77~80 fanout.
- 외부: 없음.

## 5. 프론트 계약

본 슬라이스는 **backend-only**. Flutter 클라이언트는 후속 슬라이스에서 다룬다.

후속 작업 단위(PLAN.md §3.8):

| 단위 | 작업 |
|---|---|
| 모델 | `event_carpool_offer_vo.dart`, `event_carpool_passenger_vo.dart`, `carpool_offer_param.dart`, `carpool_passenger_param.dart`, `assignment_param.dart` (Freezed) |
| API | `event_transport_api.dart`에 6개 메서드 추가 (Retrofit) |
| Repository | `event_transport_repository.dart` |
| Provider | `domain/providers/event/event_carpool_provider.dart` (Riverpod) |
| Screen | "카풀 운영" 화면(호스트), "카풀 의사 등록" 바텀시트(참가자) |
| Router | 신규 라우트 2~3개 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| AC-01 | 운전자 지원 → 호스트 확정 → 탑승자 배정 (Happy Path, **E2E S3-2**) | mode=CARPOOL OPEN 이벤트, D1+U1~U3 모두 APPROVED | offer CONFIRMED, U1~U3 assigned_offer_id 기록, transport_choice=CARPOOL_ASSIGNED |
| AC-02 | 픽업 인원 초과 차단 (**E2E S3-2 Step 10**) | offer pickup_capacity=3 이미 3명 배정 | 4번째 배정 시도 400 (`INVALID_REQUEST`) |
| AC-03 | mode 가드 (**E2E S3-3**) | mode=NONE 또는 mode=BUS 이벤트 | 모든 carpool endpoint 400 (`assertCarpoolMode` 실패) |
| AC-04 | 호스트 offer 거절 | OFFERED 상태 offer | status=REJECTED, 운전자에게 `CARPOOL_OFFER_REJECTED` 알림 |
| AC-05 | passenger 권한 보호 (**E2E S3-4**) | 일반 사용자 U1 + 호스트 H | U1 GET passengers는 본인 row 1건만, H는 전체 row 반환 |
| AC-06 | DRAFT mode 전환 시 stale 데이터 hard delete (**E2E S3-5**) | DRAFT 이벤트 mode=CARPOOL, offer/passenger 존재 | mode=BUS 전환 후 `event_carpool_*` row 0건 |
| AC-07 | passenger SELF 선택 (개별이동) | `event_transport_config.allowsSelfTransport=true` | `transport_choice=SELF` upsert 성공, 호스트 배정 대상 아님 |
| AC-08 | 배정 해제 | passenger assigned 상태 | `?offerId=null`로 PUT → assigned_offer_id=NULL, `CARPOOL_PASSENGER_UNASSIGNED` 알림 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | `EventCarpoolController` 7 endpoints + `EventCarpoolService` mode 가드 | W5에서 구현 완료 |
| pickup_capacity 검증 | `assign` 서비스 안에서 사전 카운트 후 차단 | PLAN.md §3.6 parent lock으로 race 방지 |
| 권한 정책 | `GET /carpool/passengers` host/coHost vs 본인 row 분기 | W5에서 구현 완료 (E2E S3-4) |
| swap 로그 | `event_carpool_assignment_log` INSERT 기록 | **미구현(후속)** — 현 슬라이스는 스키마만 존재. assign 서비스에 INSERT 추가 필요 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후속 | E2E S8-* | 카풀 swap 로그(`event_carpool_assignment_log`) 미기록 | 후속 슬라이스에서 `EventCarpoolService.assign`에 INSERT 추가 |
| 후속 | E2E S3-2 Step 11 | 호스트가 다른 사용자 passenger를 SELF로 강제 변경할 endpoint 없음 | 별도 endpoint 또는 admin override 후속 |
| 후속 | PLAN.md §3.5 | `transport_choice` 변경 시점 검증(이벤트 시작 24h 전 + APPROVED) 미적용 | W5 후속 가드 추가 |
| 후속 | PLAN.md §3.8 | Flutter 클라이언트 전체 미구현 | 후속 슬라이스에서 모델/API/Provider/Screen 작업 |
| Risk | E2E S5-3 | 선입금 + 카풀 동시 이벤트에서 환불 시 carpool passenger row 잔존 | mode 데이터 정리 정책 후속 |

## 9. 변경 이력

| 일자 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 신규 — W5 카풀 운영 슬라이스 반영 (PLAN.md v4.5 §3 + E2E S3-1~S3-5). backend-only 1차 출시. swap 로그·Flutter UI는 후속 |
| 2026-06-05 | v0.2 | Wave RS-002 P3-B — 카풀 운전자 안전신고 엔드포인트 추가 (`POST .../carpool/offers/{offerId}/report`, ReportType.CARPOOL(6)). CarpoolReportParam·Flutter carpool_report_screen·Routes.eventCarpoolReport 배선 완료. ReportType 전체 8종 목록 갱신. |
