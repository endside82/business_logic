# F03-15. 이벤트 카풀 (CARPOOL) PRD

<!-- source-measured: 2026-07-29; authority: community_api/community_app current source -->

> 문서 상태: **현재 소스 실측본**. 삭제된 `docs/plan/event-extensions/*`는 역사적 계획일 뿐 현재 계약이 아니다. 공통 mode 계약은 [F03-14](F03-14_event-transport-mode_prd.md)을 따른다.

## 1. 결론

서버에는 운전자 offer, 참가자 이동 선택, 호스트 승인·배정, 운전자 신고까지 7개 카풀 API가 구현되어 있다. Flutter에는 신고 API·화면·route 정의가 있지만 `eventCarpoolReportPath(...)`를 호출하는 presentation 코드가 없어 **인앱 진입 CTA가 없는 고아 route**다. offer 등록·조회·승인·탑승 희망·배정 UI는 없다. 알림 enum 77~80은 존재하지만 실제 발행·전송 코드는 없고, `event_carpool_assignment_log` 테이블도 현재 서비스에서 쓰지 않는다.

## 2. 실측 근거

| 계층 | 현재 소스 |
|---|---|
| Controller/Service | `event/transport/controller/EventCarpoolController.java`, `event/transport/service/EventCarpoolService.java` |
| Model | `EventCarpoolOffer.java`, `EventCarpoolPassenger.java` |
| Param | `CarpoolOfferParam.java`, `CarpoolPassengerParam.java`, `CarpoolReportParam.java` |
| VO | `EventCarpoolOfferVo.java`, `EventCarpoolPassengerVo.java` |
| Enum | `CarpoolStatus.java`, `TransportChoice.java` |
| Test | `community_api/src/test/java/com/endside/community/event/transport/service/EventCarpoolServiceTest.java` |
| Flutter | `event_carpool_api.dart`, `event_carpool_repository.dart`, `event_carpool_provider.dart`, `carpool_report_screen.dart`, `Routes.eventCarpoolReport` |

## 3. 서버 API

| Method | Path | 요청/응답 | 실제 동작 |
|---|---|---|---|
| GET | `/api/v1/events/{eventId}/carpool/offers` | `List<EventCarpoolOfferVo>` | Host/CoHost 또는 `ATTENDING`만 전체 조회 |
| GET | `/api/v1/events/{eventId}/carpool/passengers` | `List<EventCarpoolPassengerVo>` | Host/CoHost는 전체, 그 외 인증 사용자는 자기 row만 또는 빈 목록 |
| POST | `/api/v1/events/{eventId}/carpool/offer` | `CarpoolOfferParam` → `EventCarpoolOfferVo` | `OPEN`, `CARPOOL`, `ATTENDING`, 이벤트당 운전자 1건 |
| POST | `/api/v1/events/{eventId}/carpool/offers/{offerId}/decision?decision=...` | `EventCarpoolOfferVo` | Host/CoHost, `CARPOOL`; decision은 `CONFIRMED` 또는 `REJECTED`만 허용 |
| POST | `/api/v1/events/{eventId}/carpool/offers/{offerId}/report` | `CarpoolReportParam` → `ReportVo` (201) | 운전자 본인은 불가, 신고자는 `ATTENDING`, offer의 eventId 일치 필수 |
| PUT | `/api/v1/events/{eventId}/carpool/passenger` | `CarpoolPassengerParam` → `EventCarpoolPassengerVo` | `CARPOOL`, `ATTENDING`; 사용자별 upsert |
| PUT | `/api/v1/events/{eventId}/carpool/passengers/{passengerId}/assignment?offerId=...` | `EventCarpoolPassengerVo` | Host/CoHost. `offerId` 생략 시 배정 해제 |

API는 8개가 아니라 **7개**다.

## 4. 데이터와 Enum

`CarpoolOfferParam`:

- `pickupCapacity: int` — 1 이상
- `pickupLocations: String`
- `notes: String`

`CarpoolPassengerParam`:

- `transportChoice: TransportChoice?`
- `boardingLocation: String`

`CarpoolReportParam`:

- `reason: String` — blank 불가
- `description: String` — 최대 500자

Enum:

- `CarpoolStatus = OFFERED | CONFIRMED | REJECTED | CANCELED`
- `TransportChoice = CARPOOL_REQUESTED | CARPOOL_ASSIGNED | SELF | DRIVER`

offer 응답에는 `driverUserId`, 위치, 정원, 상태, host 결정 정보가 포함된다. passenger 응답에는 사용자와 offer 배정 ID·시각·배정자가 포함된다.

## 5. 상태·권한·동시성

- offer 생성은 이벤트 `OPEN`, mode `CARPOOL`, 운전자 `ATTENDING`을 모두 요구한다.
- host decision은 `CONFIRMED`/`REJECTED`만 받지만 현재 상태 선행조건을 검사하지 않아 이미 결정된 offer를 다시 결정할 수 있다.
- `CarpoolStatus.CANCELED`는 enum/DDL 값일 뿐 service 전이가 없다. mode 이탈 시에는 상태 전이 대신 row를 hard delete한다.
- passenger 등록은 입력 enum 전체를 허용한다. 서버가 참가자의 `SELF`/`DRIVER` 선택을 실제 역할이나 `allowsSelfTransport`와 대조하지 않는다. 이미 배정된 사용자가 SELF/DRIVER를 보내도 `assignedOfferId`가 남는다.
- passenger 등록은 event/application row lock이나 entity version 없이 save하므로 호스트 배정과 경쟁하면 lost update 가능성이 있다.
- 배정 시 event row를 잠그므로 같은 이벤트의 호스트 배정은 직렬화된다.
- 배정 대상 offer는 같은 event이고 `CONFIRMED`여야 하며, 현재 배정 수가 `pickupCapacity`보다 작아야 한다.
- 이미 같은 offer에 배정된 passenger를 다시 같은 꽉 찬 offer로 배정하면 자기 row까지 count한 뒤 capacity 초과로 거부한다.
- `offerId`가 null이면 passenger를 `CARPOOL_REQUESTED`, 미배정 상태로 되돌린다.
- 조회 권한은 비대칭이다. offer 목록은 참석 자격을 검사하지만 passenger 목록의 일반 사용자는 별도 참석 검증 없이 자기 row만 조회한다.
- 신고는 현재 mode나 offer status를 검사하지 않는다. reporter가 참석자이고 offer가 해당 event 소속이며 driver 본인이 아니면 된다.
- offer 생성만 event `OPEN`을 요구한다. decide/register/assign/report는 event status를 검사하지 않아 mode가 유지된 CLOSED/CANCELED 이벤트에서도 mutation/report가 가능하다. 이 상태에서는 mode 변경이 DRAFT-only라 host가 transport data를 정상 정리할 수도 없다.

## 6. 로그·알림·Flutter

- DDL에 `event_carpool_assignment_log`가 있지만 현재 `EventCarpoolService`는 insert하지 않는다.
- `CARPOOL_OFFER_CONFIRMED(77)` 등 77~80 enum은 예약되어 있으나 producer/listener/send 호출이 없다.
- Flutter `NotificationRouter`에도 77~80 라우팅이 없다.
- Flutter에는 신고 data layer·화면·route가 있다.
  - `POST .../offers/{offerId}/report`
  - `/events/:eventId/carpool/offers/:offerId/report`
  - `CarpoolReportParam` → `ReportVo`
- 하지만 `eventCarpoolReportPath(...)` 사용처가 routes 정의 외에 없어서 인앱 CTA로 진입할 수 없다. direct route/deep-link 수준의 고아 화면이다.
- offer 목록·등록·승인·passenger 등록·배정 API의 Flutter 모델과 UI는 없다.

## 7. 테스트로 확인된 범위

`EventCarpoolServiceTest`는 다음을 검증한다.

- 운전자·탑승자 등록 시 참석 자격
- offer 조회 권한
- 신고자 본인 신고 금지, 비참석자 금지, eventId scoping
- 공통 신고 서비스 위임

다음은 전용 회귀 테스트에서 확인되지 않았다.

- decision 상태 전이 반복 호출
- 배정 정원 경계와 해제
- 동시 배정 경쟁
- passenger register와 host assign 경쟁/lost update
- 동일 full offer 재배정
- CLOSED/CANCELED mutation
- assignment log
- 알림 발행

## 8. 현재 Gap / Risk

| 우선순위 | 실측 Gap |
|---|---|
| 높음 | Flutter 신고 route조차 인앱 navigation caller가 없고, 나머지 카풀 운영 수직 슬라이스도 없음 |
| 높음 | 77~80 알림은 enum만 있고 생산 배선·Flutter 라우팅이 없음 |
| 높음 | assignment log 테이블은 있으나 기록하지 않음 |
| 중간 | host decision의 현재 상태 가드가 없어 재결정 가능 |
| 중간 | passenger 입력의 `SELF`/`DRIVER`를 실제 역할과 대조하지 않음 |
| 높음 | register가 assignedOfferId를 정리하지 않고 assign과의 lost-update 보호가 없음 |
| 높음 | decide/register/assign/report에 event status 가드가 없어 terminal event mutation 가능 |
| 중간 | 같은 full offer 재배정이 자기 배정까지 count해 거부됨 |
| 중간 | GET passengers와 report의 mode/참석 검사가 다른 API와 비대칭 |
| 중간 | 배정·정원·동시성 핵심 경로 테스트가 부족 |

## 9. 변경 이력

| 날짜 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 삭제된 event-extensions 계획을 기준으로 초안 작성 |
| 2026-06-05 | v0.2 | 카풀 신고 경로 반영 |
| 2026-07-29 | v1.0 | 7개 실제 API, 권한, eventId scoping, Flutter 신고 전용 범위, 미배선 알림·로그를 소스 기준으로 교정 |
