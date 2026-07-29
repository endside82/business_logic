# F03-17. 차량 레이아웃 카탈로그 (Vehicle Layout Catalog) PRD

<!-- source-measured: 2026-07-29; authority: community_api/community_admin_api/community_app current source -->

> 문서 상태: **현재 소스 실측본**. 삭제된 `docs/plan/event-extensions/*`에 있던 “기본 시드 4종”과 `VehicleSeatType` enum은 현재 소스에 존재하지 않는다.

## 1. 결론

사용자 API에는 활성 레이아웃 목록과 특정 레이아웃 좌석 목록을 읽는 2개 endpoint가 있다. 관리자 API에는 목록·상세·생성·메타 수정·전체 좌석맵 교체·활성 토글이 구현되어 있다. 삭제 endpoint는 없다.

`seatType`은 Java enum이 아니라 **문자열**이며 관리자 서비스가 6개 허용값을 검증한다. 두 V1 migration과 seed SQL을 실측한 결과 28인승/45인승/20인승/8인승 기본 INSERT는 없다.

## 2. 실측 근거

| 범위 | 현재 소스 |
|---|---|
| 사용자 Controller | `community_api/src/main/java/com/endside/community/event/transport/controller/VehicleLayoutController.java` |
| 사용자 Model/VO | `VehicleLayout.java`, `VehicleLayoutSeat.java`, `VehicleLayoutVo.java`, `VehicleLayoutSeatVo.java` |
| 관리자 Controller/Service | `community_admin_api/src/main/java/com/endside/community/event/controller/ManageVehicleLayoutController.java`, `.../service/ManageVehicleLayoutService.java` |
| 관리자 Param/VO | `ManageVehicleLayoutCreateParam.java`, `ManageVehicleLayoutUpdateParam.java`, `ManageVehicleLayoutActiveParam.java`, `ManageVehicleLayoutVo.java`, `ManageVehicleLayoutDetailVo.java` |
| DDL | 양 서버의 `src/main/resources/db/migration/V1__init.sql` |

사용자·관리자 어느 쪽에서도 차량 레이아웃 전용 테스트는 찾지 못했다.

## 3. 사용자 API

Base path: `/api/v1/vehicle-layouts`. 전역 Security 설정상 두 endpoint 모두 로그인 필요다.

| Method | Path | 응답 | 실제 동작 |
|---|---|---|---|
| GET | `/active` | `List<VehicleLayoutVo>` | active row 전체 조회 |
| GET | `/{id}/seats` | `List<VehicleLayoutSeatVo>` | layout의 활성 여부를 검사하지 않고 해당 ID 좌석 조회. 없는 ID도 404가 아니라 빈 목록 |

`VehicleLayoutVo` Java 필드와 JSON wire key:

- Java: `id`, `name`, `seatCount`, `description`, `isActive`, `createdAt`, `updatedAt`
- JSON: `id`, `name`, `seatCount`, `description`, **`active`**, `createdAt`, `updatedAt`

`VehicleLayoutSeatVo` Java 필드와 JSON wire key:

- Java: `id`, `vehicleLayoutId`, `seatNo`, `rowIndex`, `colIndex`, `seatType: String`, `isSelectable`, `createdAt`, `updatedAt`
- JSON: `id`, `vehicleLayoutId`, `seatNo`, `rowIndex`, `colIndex`, `seatType`, **`selectable`**, `createdAt`, `updatedAt`

사용자 API는 “호스트 전용” 서비스 가드를 사용하지 않으며 인증 사용자 전체가 호출할 수 있다.

## 4. 관리자 API

Base path: `/admin/v1/manage/vehicle-layouts`. 모든 endpoint는 로그인 관리자에게 `AdminPrivilege.MANAGE_EVENT`를 요구한다.

| Method | Path | 동작 |
|---|---|---|
| GET | `/` | 레이아웃 목록. 각 항목에 등록 좌석 수 포함 |
| GET | `/{id}` | 메타와 좌석을 포함한 상세 |
| POST | `/` | 레이아웃 생성 (201) |
| PUT | `/{id}` | 이름·좌석 수·설명 수정 |
| POST | `/{id}/seats` | 기존 좌석 전체 삭제 후 요청 좌석맵으로 교체 |
| PATCH | `/{id}/active` | 활성 상태 토글 |

관리자 삭제 API는 없다.

## 5. 검증 규칙

레이아웃 생성·수정:

- 이름: blank 불가, 최대 100자, unique
- `seatCount >= 1`
- 설명: 최대 500자
- create body에 `active: boolean`이 있어 true로 즉시 생성할 수 있고, 생략 시 primitive 기본값 false
- 생성 후 메타 수정과 active 토글은 별도 endpoint지만 create에서 active 설정을 금지하지 않음

좌석맵 전체 교체:

- 요청 목록은 비어 있을 수 없음
- `seatNo`는 최대 10자이며 요청 내 unique
- `rowIndex`, `colIndex`는 0 이상
- `seatType`은 최대 20자, 대문자로 정규화
- null/blank `seatType`은 `NORMAL`
- 허용 문자열: `NORMAL`, `DRIVER`, `GUIDE`, `FOLDABLE`, `DISABLED`, `AISLE`

현재 서비스는 `seatCount`와 실제 좌석 row 수의 일치, active 전환 전 좌석맵 완성 여부를 검증하지 않는다. create body 자체가 `active=true`를 허용하므로 좌석 0건인 활성 레이아웃도 만들 수 있다.

## 6. 시드·Flutter 실측

- `community_api`와 `community_admin_api`의 단일 `V1__init.sql`에 차량 레이아웃 DDL은 있지만 기본 레이아웃 INSERT는 없다.
- 기타 SQL에서도 “28인승 A타입”, “45인승”, “20인승”, “8인승” seed를 찾지 못했다.
- Flutter에는 vehicle layout API·Repository·Provider·좌석 그리드가 없다.
- 따라서 빈 운영 DB에서는 관리자가 레이아웃을 생성·좌석 등록·활성화하기 전 사용자 `/active`가 빈 목록을 반환할 수 있다.

## 7. 버스 기능과의 경계

- 버스 생성은 `vehicleLayoutId`를 받는다.
- `FREE`를 제외한 버스는 layout의 `isSelectable=true` 좌석을 event bus seat로 복사한다.
- 현재 `EventBusService`는 layout 존재·활성 여부를 명시적으로 검증하지 않는다.
- layout을 나중에 수정해도 이미 복사된 event bus seat가 자동 동기화되지는 않는다.

## 8. 현재 Gap / Risk

| 우선순위 | 실측 Gap |
|---|---|
| 높음 | 기본 차량 레이아웃 seed가 없어 초기 `/active`가 빈 목록일 수 있음 |
| 높음 | Flutter 카탈로그 소비·좌석 렌더링 수직 슬라이스가 없음 |
| 중간 | public seat 조회가 inactive layout도 노출하고 없는 ID를 빈 목록으로 처리 |
| 중간 | 관리자 active 토글 전에 좌석맵 완성도·seatCount 일치를 검증하지 않음 |
| 중간 | create가 `active=true`를 허용해 별도 토글 전에 좌석맵 없는 active row 생성 가능 |
| 중간 | 버스 추가 서비스가 layout 존재·활성 여부를 명시적으로 검증하지 않음 |
| 중간 | 전용 사용자/관리자 회귀 테스트가 없음 |
| 낮음 | seatType이 문자열 whitelist라 양 서버·클라이언트 간 compile-time enum 보장이 없음 |

## 9. 변경 이력

| 날짜 | 버전 | 변경 |
|---|---|---|
| 2026-05-22 | v0.1 | 삭제된 event-extensions 계획을 기준으로 기본 4종 seed와 후속 관리자 구현을 기술 |
| 2026-07-29 | v1.0 | 현재 사용자·관리자 API, String seatType, 무시드 상태, Flutter 부재를 실측해 전면 교정 |
