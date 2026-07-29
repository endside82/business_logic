# F03-14. 이동수단 공통 베이스 (Transport Mode) PRD

<!-- source-measured: 2026-07-29; authority: community_api/community_app current source -->

> 문서 상태: **현재 소스 실측본**. 과거 `docs/plan/event-extensions/*` 문서는 저장소에서 삭제되었으며 현재 계약의 근거로 사용하지 않는다. 카풀은 [F03-15](F03-15_event-carpool_prd.md), 버스는 [F03-16](F03-16_event-bus-charter_prd.md), 차량 레이아웃은 [F03-17](F03-17_vehicle-layout-catalog_prd.md)을 함께 본다.

## 1. 결론

서버에는 이벤트별 이동수단 모드를 `NONE`, `CARPOOL`, `BUS` 중 하나로 보관하는 공통 설정이 구현되어 있다. 설정이 아직 없으면 조회 시 DB row를 만들지 않고 `mode=NONE`, `allowsSelfTransport=true`를 반환한다. 모드 변경은 이벤트가 `DRAFT`일 때만 가능하며, `CARPOOL` 또는 `BUS`에서 다른 모드로 바꾸면 해당 운영 데이터를 hard delete한다.

Flutter 앱에는 이 설정을 조회·수정하는 모델, API, Repository, Provider, 화면이 없다. 따라서 현재 사용자 제품에서 이동수단 모드를 설정하는 완성된 수직 슬라이스는 아니다.

## 2. 실측 근거

| 계층 | 현재 소스 |
|---|---|
| Controller | `community_api/src/main/java/com/endside/community/event/transport/controller/EventTransportController.java` |
| Service | `community_api/src/main/java/com/endside/community/event/transport/service/EventTransportService.java` |
| Model/Repository | `event/transport/model/EventTransportConfig.java`, `event/transport/repository/EventTransportConfigRepository.java` |
| Param/VO | `TransportConfigParam.java`, `EventTransportConfigVo.java` |
| Enum | `TransportMode.java` |
| 공통 권한 | `community_api/src/main/java/com/endside/community/event/service/EventAuthorizationService.java` |
| DDL | `community_api/src/main/resources/db/migration/V1__init.sql` |

전용 `EventTransportServiceTest` 또는 Controller 테스트는 현재 소스에서 찾지 못했다.

## 3. 서버 계약

| Method | Path | 요청/응답 | 실제 권한과 동작 |
|---|---|---|---|
| GET | `/api/v1/events/{eventId}/transport` | `EventTransportConfigVo` | 로그인 필요. 별도 host/attendee 검사와 이벤트 존재 검증 없이 설정을 조회하며, row가 없으면 기본값을 반환 |
| PUT | `/api/v1/events/{eventId}/transport/config` | `TransportConfigParam` → `EventTransportConfigVo` | 로그인 + Host/CoHost. 이벤트 row를 비관적 잠금으로 읽고 설정을 갱신 |

`TransportConfigParam`:

- `mode: TransportMode?`
- `allowsSelfTransport: Boolean?`

`EventTransportConfigVo`:

- `eventId: long`
- `mode: TransportMode`
- `allowsSelfTransport: boolean`

`TransportMode = NONE | CARPOOL | BUS`.

## 4. 상태 전이와 삭제 규칙

| 입력 | 실제 결과 |
|---|---|
| 기존 row 없음 + GET | 저장 없이 `NONE`, `true` 반환 |
| `mode`가 null이거나 현재 값과 같음 | mode 전이 없음 |
| `mode`가 달라짐 + 이벤트 `DRAFT` | 새 mode 저장 |
| `mode`가 달라짐 + 이벤트가 `DRAFT` 아님 | `INVALID_EVENT_STATUS` |
| `CARPOOL → NONE/BUS` | 해당 이벤트의 passenger를 먼저, offer를 다음에 hard delete |
| `BUS → NONE/CARPOOL` | 각 bus의 seat를 먼저, bus를 다음에 hard delete |
| `allowsSelfTransport`만 변경 | 현재 서비스에는 이벤트 상태 가드가 없어 `OPEN`, `CLOSED`, `CANCELED`, `HIDDEN`에서도 변경 가능 |

모드 변경은 event row 잠금 아래 수행되어 같은 이벤트의 동시 변경을 직렬화한다. 다만 설정 변경 audit log와 알림 발행은 구현되어 있지 않다.

`allowsSelfTransport`는 현재 이 서비스의 저장·응답 외 production consumer가 없다. `EventCarpoolService.registerPassenger`도 이 값이 false인지 확인하지 않고 `SELF`/`DRIVER`를 저장하므로, 현재는 이동 정책을 실제로 집행하지 않는 inert flag다.

## 5. 권한과 경계

- `EventAuthorizationService`의 실제 위치는 `event/service`이며 공개 메서드는 `assertHost(Event, userId)`, `assertHostOrCoHost(Event, userId)` 두 개다.
- PUT은 `assertHostOrCoHost`를 사용한다.
- GET은 전역 Security 설정상 인증이 필요하지만 서비스 수준 참가자/호스트 검증은 없다.
- mode가 `CARPOOL` 또는 `BUS`라는 사실만으로 참가자 API가 자동 노출되는 것은 아니다. 각 하위 서비스의 별도 검사를 따라야 한다.

## 6. 프론트 및 알림 실측

- Flutter에 transport config 전용 API·Repository·Provider·화면·라우트가 없다.
- `NotificationType`에 교통 관련 값이 존재하는 것과 별개로, mode 변경을 발행하거나 전송하는 생산 코드가 없다.
- `NotificationRouter`에도 관련 deep link가 없다.

## 7. 검증 기준

1. 설정 없는 이벤트 GET은 `NONE/true`를 반환해야 한다.
2. Host/CoHost가 아닌 사용자의 PUT은 거부되어야 한다.
3. mode 변경은 `DRAFT`에서만 성공해야 한다.
4. CARPOOL 또는 BUS에서 이탈하면 해당 모드의 운영 row가 삭제되어야 한다.
5. `allowsSelfTransport` 단독 변경의 상태 제한 여부는 현 서비스 동작을 기준으로 판단해야 한다.

## 8. 현재 Gap / Risk

| 우선순위 | 실측 Gap |
|---|---|
| 높음 | Flutter 수직 슬라이스가 없어 사용자가 이동수단 모드를 조회·설정할 수 없음 |
| 높음 | `allowsSelfTransport` 단독 변경에는 이벤트 상태 제한이 없어 terminal event도 수정 가능 |
| 높음 | `allowsSelfTransport=false`를 소비해 SELF/DRIVER 선택을 막는 서비스가 없어 정책 토글이 실제 동작을 바꾸지 않음 |
| 중간 | GET이 event 존재·참가 자격을 검증하지 않음 |
| 중간 | mode 전환이 hard delete이며 audit/history 복구 수단이 없음 |
| 중간 | 전용 서비스/Controller 회귀 테스트를 찾지 못함 |
| 낮음 | 설정 변경 알림·감사 로그 없음 |

## 9. 변경 이력

| 날짜 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 삭제된 event-extensions 계획 문서를 바탕으로 초안 작성 |
| 2026-07-29 | v1.0 | 현재 Controller/Service/DTO/Enum/보안/Flutter를 재실측하고 삭제된 계획 참조와 미구현 동작을 제거 |
