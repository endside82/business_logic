# 14. 위치 & 길찾기 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/14_location_directions -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/14_location_directions/00_overview.md`와 117개 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

이 단위는 community 플랫폼에서 "내 모임 장소까지 안전하고 정확하게 도착하는 경험"을 책임진다. 이벤트에 참석 확정된 사용자들끼리 한정된 시간 동안 서로의 위치를 지도 위에서 공유하고(opt-in / opt-out), 자신의 위치를 30초 단위로 갱신하여 일행이 어디쯤 오고 있는지를 확인한다. 동시에 출발지(현재 위치 또는 등록된 주소)에서 이벤트 장소까지의 경로·소요 시간·턴바이턴 안내를 서버에서 받아오고, 필요 시 네이버 지도/카카오맵/Google Maps 같은 외부 지도 앱으로 인계한다. 또한 좌표를 한국식 주소 문자열로 변환하는 역지오코딩과, 사용자가 어떤 이벤트에 위치를 공유하고 있는지 한눈에 확인·제어하는 위치 프라이버시 대시보드, 그리고 모임이 길어질 때 공유 만료를 연장하는 기능까지 포함한다. 본 단위가 끝나면 사용자는 "지금 어디쯤?"이라는 질문에 더 이상 채팅으로 답하지 않아도 되며, 위치 공유의 시작·중지·연장·삭제까지 자기 손으로 통제할 수 있다.

이 도메인은 기능 PRD 6개로 구성된다. 현재 기능별 trace source는 총 9개이고, risk 후보는 총 13개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F14-01 | F14-01. 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회) | [F14-01_event-location-share_prd.md](../02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | [F14-01_event-location-share](../../units/14_location_directions/F14-01_event-location-share) | 전환 완료 | 3 | 2 |
| F14-02 | F14-02. 위치 공유 중지 (opt-out) | [F14-02_location-opt-out_prd.md](../02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | [F14-02_location-opt-out](../../units/14_location_directions/F14-02_location-opt-out) | 전환 완료 | 1 | 2 |
| F14-03 | F14-03. 위치 공유 만료 연장 | [F14-03_location-extend_prd.md](../02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | [F14-03_location-extend](../../units/14_location_directions/F14-03_location-extend) | 전환 완료 | 1 | 3 |
| F14-04 | F14-04. 위치 프라이버시 대시보드 | [F14-04_location-privacy-dashboard_prd.md](../02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | [F14-04_location-privacy-dashboard](../../units/14_location_directions/F14-04_location-privacy-dashboard) | 전환 완료 | 1 | 4 |
| F14-05 | F14-05. 이벤트 길찾기 (경로 + 참석자 거리) | [F14-05_event-directions_prd.md](../02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | [F14-05_event-directions](../../units/14_location_directions/F14-05_event-directions) | 전환 완료 | 2 | 2 |
| F14-06 | F14-06. 역지오코딩 (좌표 → 주소) | [F14-06_reverse-geocoding_prd.md](../02_feature_prds/14_location_directions/F14-06_reverse-geocoding_prd.md) | [F14-06_reverse-geocoding](../../units/14_location_directions/F14-06_reverse-geocoding) | 전환 완료 | 1 | 0 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F14-04](../02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | F14-04. 위치 프라이버시 대시보드 | Risk 후보 4 |
| [F14-03](../02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | F14-03. 위치 공유 만료 연장 | Risk 후보 3 |
| [F14-02](../02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | F14-02. 위치 공유 중지 (opt-out) | Risk 후보 2 |
| [F14-05](../02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | F14-05. 이벤트 길찾기 (경로 + 참석자 거리) | Risk 후보 2 |
| [F14-01](../02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | F14-01. 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회) | Risk 후보 2 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (6개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F14-01 | 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회) | 참석 확정한 이벤트에서 내 위치 공유를 켜고, 30초 간격으로 좌표를 갱신하며, 다른 참석자 위치를 지도에서 본다 | "위치 공유" 토글 On, 내 위치 갱신 버튼 탭, 참석자 마커/리스트 확인 |
| F14-02 | 위치 공유 중지 (opt-out) | 공유 중인 이벤트에서 토글을 내려 내 위치를 즉시 숨기고 서버에 보관된 위치 데이터를 제거한다 | "위치 공유" 토글 Off, 확인 다이얼로그에서 "중지" 탭 |
| F14-03 | 위치 공유 만료 연장 | 모임이 길어질 때 위치 공유 종료 시각을 분 단위로 연장한다(기본 30분, 최대 120분) | 연장 버튼/액션 트리거 |
| F14-04 | 위치 프라이버시 대시보드 | 현재 내가 위치 공유 가능한 모든 이벤트와 각 이벤트의 공유 상태를 한 화면에서 조회·일괄 제어한다 | 설정(톱니바퀴) 진입 → 이벤트별 토글 On/Off |
| F14-05 | 이벤트 길찾기 (경로 + 참석자 거리) | 출발지(현재 위치 또는 등록된 주소)에서 이벤트 장소까지의 경로·소요 시간·턴바이턴 안내를 받아 보고, 외부 지도 앱으로 인계한다. 추가로 다른 참석자들이 이벤트 장소에서 얼마나 떨어져 있는지 거리 리스트를 본다 | 출발지 선택(현재 위치/집/회사), 경로 확인, [외부 지도 앱으로 열기] 탭 |
| F14-06 | 역지오코딩 (좌표 → 주소) | 위도/경도 좌표를 사람이 읽을 수 있는 한국식 주소 문자열로 변환한다 | (자동) 지도 길게 탭 또는 현재 위치 좌표 확보 시 호출 |

> M = 6 기능. F14-01 ~ F14-04는 위치 공유 라이프사이클(켜기 → 갱신 → 중지 → 연장 → 대시보드 일괄 제어), F14-05는 출발지에서 도착지까지 도달을 위한 길찾기 + 다른 참석자와의 상대 거리, F14-06은 좌표↔주소 변환 인프라 기능이다. UI/UX 스펙(SCR-LD-001 ~ SCR-LD-003)과 실제 컨트롤러(`LocationController`, `GeocodingController`, `DirectionsController`)에 정의된 모든 엔드포인트가 본 6개 기능에 매핑되며, 외부에 정의되지 않은 기능을 임의로 추가하지 않았다.

---

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 상세

### F14-01 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회)

- **사용자 가치**: 참석 확정한 일행이 지금 어디쯤 오고 있는지 지도에서 실시간으로 확인할 수 있어, 약속 장소 도착 직전의 불확실성과 채팅으로 위치를 묻고 답하는 마찰을 제거한다.
- **주요 화면**:
  - `community_app/lib/presentation/location/screens/event_location_screen.dart` (SCR-LD-001 이벤트 위치 지도)
  - `community_app/lib/presentation/location/widgets/event_map_widget.dart` (지도 뷰 + 이벤트 장소/내/참석자 마커)
- **백엔드 엔드포인트** (모두 `LocationController`, base `/api/v1/events/{eventId}/location`):
  - `POST /api/v1/events/{eventId}/location/opt-in` — 위치 공유 시작 (200, body 없음)
  - `POST /api/v1/events/{eventId}/location/update` — 내 위치 좌표 갱신 (`@RequestBody LocationModParam`, 200)
  - `GET /api/v1/events/{eventId}/location` — 이벤트 참석자들의 위치 목록 조회 (`List<LocationVo>`)
- **선결 조건/상태**: 로그인 상태 + 해당 이벤트에 참석 확정된 사용자(스펙: "이벤트 참석 확정 사용자"). 디바이스 OS 위치 권한 부여 필요.
- **결과 상태 변화**:
  - opt-in 성공: 서버에 해당 사용자의 공유 활성 상태 등록 → 이후 update 호출이 유효해지며 다른 참석자의 GET 응답에 본인 위치가 포함되기 시작
  - update 성공: 서버 보관 좌표가 최신으로 교체, 30초 간격 자동 폴링 루프 유지
  - GET 성공: opt-in 한 참석자만 좌표 노출, opt-out 사용자는 "비공개"로 마킹되어 리스트에 이름만 노출
  - 실패: 권한 미부여(OS) → 권한 요청 다이얼로그 + 설정 이동, 참석 미확정 등 서버 거부 시 에러 토스트

### F14-02 위치 공유 중지 (opt-out)

- **사용자 가치**: 약속 장소에 도착했거나 더 이상 위치를 노출하고 싶지 않을 때 한 번의 토글로 즉시 공유를 멈추고, 서버에 남아 있는 위치 데이터를 제거하여 프라이버시 통제권을 확보한다.
- **주요 화면**:
  - `community_app/lib/presentation/location/screens/event_location_screen.dart` (SCR-LD-001 — 위치 공유 토글 Off)
  - `community_app/lib/presentation/location/screens/location_privacy_screen.dart` (SCR-LD-003 — 이벤트별 토글 Off도 동일 엔드포인트)
- **백엔드 엔드포인트**:
  - `POST /api/v1/events/{eventId}/location/opt-out` (`LocationController#optOut`) — 200, body 없음
- **선결 조건/상태**: 로그인 상태 + 해당 이벤트에 대해 현재 opt-in 상태인 사용자. 클라이언트 측에서 확인 다이얼로그("위치 공유를 중지하시겠습니까?") 후 호출.
- **결과 상태 변화**:
  - 성공: 서버에서 해당 사용자의 공유 상태 비활성화 + 보관 좌표 삭제 (스펙: "이벤트 종료 후 위치 데이터는 즉시 삭제됩니다" — opt-out 시에도 동일 정책 적용), 다른 참석자의 GET 응답에서 본인 좌표 사라짐, 클라이언트 지도에서 내 마커 제거
  - 자동 발생: 이벤트 종료 시점 도달 시 위치 공유 자동 비활성화(스펙)
  - 실패: 네트워크 오류 시 토글을 이전 상태로 롤백 + 토스트

### F14-03 위치 공유 만료 연장

- **사용자 가치**: 모임이 예상보다 길어지거나 이동 시간이 늘어났을 때, 위치 공유를 다시 켜는 번거로움 없이 만료 시각을 분 단위로 늘려 공유의 연속성을 유지한다.
- **주요 화면**: 본 단위 화면 디렉터리(`community_app/lib/presentation/location/`)에 별도 전용 화면은 없음 — 위치 공유 라이프사이클의 연장 액션이므로 SCR-LD-001 또는 SCR-LD-003 진입점에서 호출되도록 설계됨. (UI/UX 스펙에는 명시적 연장 토글이 SCR-LD-001/003에 표기되어 있지 않으나, 컨트롤러에 G-01 코멘트와 함께 정식 노출되어 있어 본 단위에 포함)
- **백엔드 엔드포인트**:
  - `POST /api/v1/events/{eventId}/location/extend?extendMinutes=30` (`LocationController#extendShare`) — 200, body 없음. `extendMinutes`는 `@RequestParam(defaultValue = "30") int`, 컨트롤러 주석에 따라 최대 120분.
- **선결 조건/상태**: 로그인 상태 + 해당 이벤트에 대해 위치 공유 활성(또는 활성 가능) 상태. 연장값은 1 ~ 120 사이의 정수.
- **결과 상태 변화**:
  - 성공: 서버 측 위치 공유 만료 시각이 지정된 분만큼 연장됨 → 이벤트 종료 또는 새 만료 시각 도달 시까지 update/get 호출이 계속 허용
  - 실패: 잘못된 `extendMinutes` 값(범위 초과 등)이거나 이미 종료된 이벤트인 경우 4xx → 에러 토스트

### F14-04 위치 프라이버시 대시보드

- **사용자 가치**: 내가 어떤 이벤트들에 위치를 공유하고 있는지 흩어진 화면을 돌아다니지 않고 한 곳에서 보고, 이벤트별로 즉시 켜고 끌 수 있어 사용자가 언제든 자신의 위치 노출 범위를 통제할 수 있다.
- **주요 화면**:
  - `community_app/lib/presentation/location/screens/location_privacy_screen.dart` (SCR-LD-003 위치 프라이버시)
- **백엔드 엔드포인트**:
  - `GET /api/v1/events/{eventId}/location/privacy` (`LocationController#getPrivacyDashboard`) — `LocationPrivacyVo` 반환. 컨트롤러 시그니처상 `eventId`는 path에 존재하지만 서비스 호출은 `principal.getUserId()`만 사용 — 사용자 단위의 프라이버시 대시보드를 반환하는 엔드포인트로 동작.
  - 토글 On/Off: F14-01의 opt-in / F14-02의 opt-out 엔드포인트를 그대로 재사용
- **선결 조건/상태**: 로그인 상태. 화면 진입 시 SCR-LD-001의 설정(톱니바퀴) 또는 별도 진입점에서 호출.
- **결과 상태 변화**:
  - 조회 성공: 위치 공유 가능한 이벤트 목록 + 각 이벤트의 공유 상태가 카드 리스트로 렌더링
  - 토글 변경: 즉시 서버 반영(opt-in/opt-out 호출), opt-out 시 확인 다이얼로그
  - 활성 시간 외(이벤트 시작 1시간 전 ~ 종료 시간 외)에는 토글 비활성화 + "위치 공유 가능 시간이 아닙니다" 안내 (스펙)
  - 이벤트 종료 시 목록에서 자동 제거(스펙)

### F14-05 이벤트 길찾기 (경로 + 참석자 거리)

- **사용자 가치**: 출발지에서 이벤트 장소까지의 거리·소요 시간·턴바이턴 안내를 별도 지도 앱을 열기 전에 앱 안에서 즉시 확인하고, 필요할 때만 네이버/카카오/Google Maps로 인계할 수 있다. 더불어 다른 참석자들이 이벤트 장소에서 얼마나 떨어져 있는지를 보고 합류 시점을 가늠한다.
- **주요 화면**:
  - `community_app/lib/presentation/location/screens/directions_screen.dart` (SCR-LD-002 길찾기)
- **백엔드 엔드포인트** (모두 `DirectionsController`):
  - `GET /api/v1/events/{eventId}/directions` — `@ModelAttribute DirectionsParam` (`userAddressId` 또는 `originLatitude`+`originLongitude`), `DirectionsVo` 반환
  - `GET /api/v1/events/{eventId}/attendees/distances` — `List<AttendeeDistanceVo>` 반환 (참석자별 이벤트 장소 거리)
- **선결 조건/상태**: 로그인 상태(스펙 권한: 로그인 사용자). "현재 위치" 출발지 선택 시 OS 위치 권한 필요. "집/회사" 선택 시 사전 등록된 `userAddressId` 보유.
- **결과 상태 변화**:
  - 조회 성공: 지도에 출발지~도착지 폴리라인 렌더링, 소요 시간/거리/턴바이턴 안내 텍스트 표시
  - 외부 지도 앱 인계: 바텀시트(설치된 지도 앱 목록)에서 선택 → 딥링크로 외부 앱 호출 (외부 앱 호출은 클라이언트 측 동작이며 서버 상태 변화 없음)
  - 참석자 거리 조회 성공: 참석자별 거리(예: 2km, 800m, "비공개") 리스트 표시
  - 실패: 경로 미존재 → "경로를 찾을 수 없습니다" 에러 + 외부 앱 열기 유도, 좌표/주소 누락 시 4xx

### F14-06 역지오코딩 (좌표 → 주소)

- **사용자 가치**: 위·경도 좌표 자체는 사용자에게 의미가 없으므로, 현재 위치나 지도에서 선택한 지점을 한국식 주소 문자열로 변환해 사람이 즉시 이해하고 공유할 수 있게 한다. 길찾기/위치 공유의 보조 인프라 기능.
- **주요 화면**: 본 단위에는 전용 화면 없음. 다른 화면(주소 검색/등록, 길찾기 출발지 선택 등)에서 좌표를 주소로 표기할 때 호출되는 보조 API. UI/UX 스펙(`29-location-directions.md`)에 직접 매핑된 화면은 없으나 같은 도메인(`location/`) 패키지 내 컨트롤러로 정식 노출되어 본 단위에 포함.
- **백엔드 엔드포인트**:
  - `GET /api/v1/location/reverse-geocode?lat={lat}&lng={lng}` (`GeocodingController#reverseGeocode`) — `AddressVo` 반환. `lat`, `lng`는 `@RequestParam double` 필수.
- **선결 조건/상태**: 유효한 위/경도 좌표(범위 검증은 서비스 단). 인증 요구 사항은 컨트롤러에 `@AuthenticationPrincipal`이 없어 본 컨트롤러 메서드 단에서는 명시적 사용자 식별 없이 호출 가능한 구조.
- **결과 상태 변화**:
  - 성공: 좌표 → 주소 문자열 변환 결과(`AddressVo`) 반환, 클라이언트는 이를 입력 필드/마커 라벨에 채움
  - 실패: 좌표 범위 외/외부 지오코딩 서비스 오류 시 4xx/5xx → 호출자 화면에서 "주소를 찾을 수 없습니다" 등 안내

---

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F14-04](../02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | F14-04. 위치 프라이버시 대시보드 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F14-03](../02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | F14-03. 위치 공유 만료 연장 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F14-01](../02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | F14-01. 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F14-02](../02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | F14-02. 위치 공유 중지 (opt-out) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F14-05](../02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | F14-05. 이벤트 길찾기 (경로 + 참석자 거리) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
