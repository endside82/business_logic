# F14-01. 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회) PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/14_location_directions/F14-01_event-location-share -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-01_event-location-share`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-07-29 현재 소스 갱신: 신규 opt-in 성공 또는 앱 resume 경로는 위치 목록을 30초마다 `GET`하고, 공유 중인 내 GPS는 별도 60초 타이머로 다시 취득해 `POST /update`한다. 기존 활성 share로 화면에 재진입한 직후에는 GPS 타이머만 시작하고 목록 타이머는 시작하지 않는 lifecycle Gap이 있다. GPS 갱신이 2회 연속 실패하면 GPS 타이머만 멈추고 한 번 안내한다. dispose·앱 paused·위치 화면에서 성공한 opt-out은 두 주기 모두 멈추지만, 만료는 GPS 타이머만 멈추고 30초 목록 타이머는 계속될 수 있다. privacy route push도 기존 위치 화면을 dispose하지 않는다. 서버는 아직 활성인 공유에 대해 **요청의** `expiryMode`가 null인 좌표 갱신에서 기존 `expiresAt`/`expiryMode`를 보존한다.

## 1. 결론

참석 확정한 이벤트에서 참석자가 자신의 위치 공유를 켜고(`opt-in`), 공유 중에는 60초 GPS 전송과 30초 목록 조회 주기를 운용한다. 단 목록 타이머는 신규 opt-in/resume에서만 명시적으로 시작되고 기존 활성 share 재진입 경로에서는 빠진다. 호스트·공동호스트·클럽의 이벤트 생성 권한 보유자는 opt-in/시간창 제한 없이 조회할 수 있고, 일반 참석자는 ATTENDING이면서 본인이 opt-in해야 한다. 응답으로 실제 노출된 타인의 좌표는 GET마다 대상별 `location_access_log` 한 행으로 기록되므로 F14-04 수치는 고유 열람자가 아니라 30초 polling hit를 포함한다.

현재 Flutter 진입 순서에는 중대한 교착이 있다. `EventLocationNotifier.build()`가 화면 content보다 먼저 `GET /location`을 호출하므로, 아직 opt-in하지 않은 일반 ATTENDING 사용자는 이벤트 단위 `locationShareEnabled=true`일 때 서버의 `LOCATION_OPT_IN_REQUIRED`를 받아 전체 `AppErrorState`에 머문다. 토글은 data content 안에 있어 이 화면에서 Off→On으로 전환할 수 없다. 반대로 이벤트 단위 공유가 false면 서버가 opt-in 검사보다 먼저 빈 목록을 반환해 content와 토글은 보이지만, 토글 후 좌표 update는 `LOCATION_SHARE_DISABLED`로 실패한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 화면 → "참석자 위치" 액션 → `/home/events/:eventId/location` 푸시
- (간접) 푸시 알림 `LOCATION_SHARE_EXPIRING` 탭 → notification router가 같은 라우트로 인계 (F14-03에서 다룸)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/14_location_directions/F14-01_event-location-share/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/14_location_directions/F14-01_event-location-share/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/14_location_directions/F14-01_event-location-share/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/14_location_directions/F14-01_event-location-share/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/location/controller/LocationController.java:29` | 확인됨 |
| `community_api/src/main/java/com/endside/community/location/controller/LocationController.java:45` | 확인됨 |
| `community_api/src/main/java/com/endside/community/location/controller/LocationController.java:54` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 `initState()`가 즉시 `_checkLocationPermission()`을 실행해 OS 권한을 확인/요청하고, 허용되면 `_getCurrentPosition`으로 로컬 `_myPosition`을 채운다. 토글 조작 시 권한을 다시 확인하지 않는다.
2. 동시에 `eventLocationNotifierProvider(eventId)` 자동 빌드 → `GET /api/v1/events/{eventId}/location`. 공유가 활성화된 이벤트의 미opt-in 일반 참석자는 여기서 `LOCATION_OPT_IN_REQUIRED`가 발생해 토글이 포함된 content가 렌더되지 않는다. 이벤트 단위 공유가 꺼져 있으면 opt-in 여부와 무관하게 빈 data를 받는다.
3. data 상태에 도달하면 `eventDetailNotifierProvider(eventId)`가 venue 좌표를 제공한다. `attendeeDistancesNotifierProvider(eventId)`의 닉네임/프로필/거리 응답은 호스트·공동호스트·클럽 `canCreateEvent` 운영자만 받을 수 있고, 일반 참석자는 403을 빈 `distanceMap`으로 축약해 `"참석자 #id"`와 마지막 갱신 시각만 본다.
4. 렌더된 토글 On 시:
   `EventLocationNotifier.optIn()` → `Repository.optIn(eventId)` → POST `/opt-in`
   → 즉시 `_updateMyLocation` 시도 → 좌표가 있으면 POST `/update`
   → `startAutoRefresh()` 로 30s 목록 조회 타이머 시작 (`GET /location`)
   → `_startGpsRefreshTimer()` 로 60s GPS 재취득·`POST /update` 타이머 시작
   이때 update 실패/좌표 없음은 호출자가 성공 여부를 확인하지 않으므로 opt-in=true, 타이머 시작, 성공 토스트까지 진행될 수 있다.
5. FAB(내 위치 버튼) 탭 → 위 4의 update 흐름만 호출
6. 토글 Off 시: F14-02 (확인 다이얼로그 → POST `/opt-out` → `stopAutoRefresh`)
7. 화면 dispose / 앱 paused 시 목록 조회와 GPS 갱신 타이머를 모두 중지하고, resume 시 로컬 opt-in 상태라면 즉시 한 번 갱신한 뒤 재시작한다. 톱니바퀴로 privacy route를 push하는 것만으로는 기존 화면이 dispose되지 않아 두 타이머가 계속될 수 있다.
8. `expiresAt` 도달은 60초 GPS tick 또는 목록 재조회에서 감지되어 GPS 타이머를 멈추지만 목록 타이머는 명시적으로 멈추지 않는다.
9. 기존 활성 share가 있는 상태로 화면에 재진입하면 `myLocation != null` 분기가 60초 GPS 타이머만 시작한다. 30초 목록 타이머는 새 opt-in이나 앱 resume 전까지 시작되지 않아 타 참석자 위치가 자동 갱신되지 않을 수 있다.

상태 동기화: 빌드 중 `myLocation != null` 이면 화면 로컬 `_isOptedIn` 을 true로 인퍼 (재진입 시 토글이 자동으로 On으로 보임).

## 4. 서버 계약

### 개요

참석 확정 사용자는 opt-in 후 좌표를 갱신하고 같은 이벤트의 공유 위치를 조회한다. 조회 권한의 상위 집합은 호스트·공동호스트·클럽 `canCreateEvent()` 역할이며, 일반 참석자에게는 시작 24시간 전~종료 2시간 후 시간창과 본인 opt-in을 요구한다. 반환 대상은 현재 ATTENDING·호스트·공동호스트 중 opt-in 상태이고, 만료되지 않았으며, 조회자와 양방향 차단 관계가 아닌 계정 사용자로 제한한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/location/opt-in | LocationController#optIn | required | LocationOptIn upsert (optedIn=true) |
| POST | /api/v1/events/{eventId}/location/update | LocationController#updateLocation | required | LocationShare upsert + sharedAt 갱신; 활성 공유에서 만료 모드 미지정 시 기존 expiresAt 보존 |
| GET | /api/v1/events/{eventId}/location | LocationController#getEventLocations | required | opt-in 참석자 좌표 목록 + 접근 로그 INSERT |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `LocationShare` (`location_share` 테이블)
  - `id, eventId, userId, latitude, longitude, accuracy?, sharedAt, expiresAt?, createdAt, updatedAt`
  - 새 공유 또는 이미 만료된 행은 요청 만료 모드로 `expiresAt`을 계산한다. 아직 활성인 행에 대해 **요청의 `expiryMode`가 null이면** 기존 `expiresAt`과 저장된 `expiryMode`를 보존한다.
- **Entity** `LocationOptIn` (`location_opt_in` 테이블)
  - `id, eventId, userId, optedIn(boolean), createdAt, updatedAt`
  - opt-in/opt-out 모두 같은 행을 토글. 첫 호출 시 INSERT.
- **Entity** `LocationAccessLog` (`location_access_log` 테이블)
  - `id, accessorId, targetUserId, eventId, createdAt`
  - GET 응답에 포함된 타인 사용자 1건당 매 호출 1행 기록 → F14-04 대시보드 데이터 원천. 30초 polling도 중복 행을 만든다.
- **Param** `LocationModParam`: `Double latitude`, `Double longitude`, `Double accuracy`, `LocationShareExpiryMode expiryMode`, `Integer customHours`. 서비스가 latitude/longitude null, 범위 밖, `(0,0)`, customHours 1~24 밖을 거부한다.
- **Enum** `LocationShareExpiryMode`: `FIXED_TWO_HOURS`, `UNTIL_EVENT_END_PLUS_30M`, `CUSTOM_HOURS`
- **VO** `LocationVo`: `long userId, double latitude, double longitude, Double accuracy, LocalDateTime sharedAt, LocalDateTime expiresAt`
- **권한 차이**: opt-in/opt-out/extend는 host·임의 cohost·ATTENDING을 인정한다. update는 host 또는 ATTENDING만 인정해 비참석 cohost가 제외된다. GET은 host/cohost/클럽 `canCreateEvent` 보유자가 privileged bypass하며, 그 외에는 ATTENDING+본인 opt-in을 요구한다.

### 의존 단위 / 외부 시스템

- **Unit 03 (event)**: `EventRepository`, `EventCoHostRepository`, `Event.locationShareEnabled`/`startTime`/`endTime`/`hostUserId` 사용.
- **Unit 03 capacity**: `EventAttendanceRepository`, `AttendanceStatus.ATTENDING` 로 참가 자격 검증.
- **Unit 12 notification**: 같은 도메인 `LocationShareExpiringScheduler` 가 `expiresAt - 30m` 시 `NotificationType.LOCATION_SHARE_EXPIRING` 푸시 발송 (별도 컴포넌트, 본 기능의 직접 호출은 아님).
- **외부**: 없음. 외부 지오코딩/지도 API는 F14-05/F14-06 만 사용.

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 화면 → "참석자 위치" 액션 → `/home/events/:eventId/location` 푸시
- (간접) 푸시 알림 `LOCATION_SHARE_EXPIRING` 탭 → notification router가 같은 라우트로 인계 (F14-03에서 다룸)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/home/events/:eventId/location` | `location/screens/event_location_screen.dart` | SCR-LD-001 — 지도 + 토글 + 참석자 리스트 |
| (위젯) | `location/widgets/event_map_widget.dart` | Google Maps 지도 + 마커 (장소/나/참석자) |

라우트 상수: `Routes.eventLocation = 'location'` (이벤트 상세 하위 중첩 라우트, `routes.dart:25`).

### 화면별 구성 요소 & 액션

### 이벤트 위치 지도 (`event_location_screen.dart`)

- **사용자가 보는 것**:
  - 상단 `CommunityAppBar` 제목 "참석자 위치" + 우측 톱니바퀴(설정) 버튼 → `eventLocationPrivacy` 라우트로 push
  - 풀스크린 `GoogleMap` (`EventMapWidget`)
    - 빨간 마커 = 이벤트 장소 (`Event.latitude/longitude` from `eventDetailNotifierProvider`)
    - 파란 마커 = 나 (`AppColors.linkBlue` 계열, `BitmapDescriptor.hueAzure`)
    - 초록 마커 = 다른 참석자 (`BitmapDescriptor.hueGreen`)
    - 지도 상단에 색상 범례(장소/나/참석자) 캡슐
  - 우측 하단 `FloatingActionButton.small`: 내 위치 갱신 버튼 (`Icons.my_location`)
  - `DraggableScrollableSheet` (initial 0.35, min 0.15, max 0.75)
    - 토글 행: "위치 공유 중" / "위치 비공개" 라벨 + Switch
    - 카운트다운 행 (옵트인 + `expiresAt` 있을 때만): 남은 시간 텍스트 + "+ 30분 연장" 버튼 (F14-03)
    - 참석자 카운트 ("N명의 참석자 위치 표시 중")
    - 참석자 리스트 (`_ParticipantTile`) — 모든 viewer에게 위치 userId와 마지막 갱신 시각. 관리자급 viewer만 `AttendeeDistanceVo`를 받아 닉네임/프로필이미지/거리/소요시간을 보며, 일반 참석자는 `"참석자 #id"` fallback만 본다.
- **사용자가 할 수 있는 액션**:
  - OS 권한 확인/요청은 토글이 아니라 `initState()`에서 즉시 실행
  - 렌더된 "위치 공유" 토글 On → POST `/opt-in` → 가능한 경우 POST `/update` → 30s 목록 조회와 60s GPS 갱신 타이머 시작
  - 토글 Off → 확인 다이얼로그 → POST `/opt-out` (F14-02)
  - 내 위치 갱신 FAB 탭 → `Geolocator.getCurrentPosition` → POST `/update`
  - 톱니바퀴 → `LocationPrivacyScreen` 으로 push (F14-04)
  - 30초 목록 새로고침: `EventLocationNotifier.startAutoRefresh()`가 `GET /location`을 재호출해 마커를 갱신. 신규 opt-in/resume에서는 시작하지만 기존 활성 share 재진입 분기에서는 호출되지 않는다.
  - 60초 내 위치 갱신: 화면 `_gpsRefreshTimer`가 GPS를 다시 취득하고 `POST /update`; 2회 연속 실패 시 중지 + 단일 에러 토스트
- **상태 분기**:
  - 로딩: `CircularProgressIndicator` (지도 화면 전체)
  - 에러: `AppErrorState.fromError(error: ..., onRetry: ref.invalidate(eventLocationNotifierProvider(eventId)))`
  - 권한 거부: `AppToast.show("위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.", type: error)` + (영구 거부 시) `Geolocator.openAppSettings()`
  - 빈 리스트: 참석자 카운트만 "0명의 참석자..." 로 표시 (별도 EmptyState 미사용 — 지도는 항상 렌더)
  - 웹 환경: Google Maps JS API 미로딩 시 `_WebMapErrorBoundary` → `_MapUnavailablePlaceholder` (지도 미표시, 텍스트 안내)
- **모달/시트/네비게이션**:
  - 옵트아웃 확인 → `AlertDialog` (F14-02 에서 다룸)
  - 톱니바퀴 → `context.push('/home/events/$eventId/location/privacy')`
  - 카운트다운 1초 단위 rebuild는 `ValueNotifier<DateTime>` + `ValueListenableBuilder` 로 분리하여 화면 전체 리빌드 방지 (G01-D1)

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시 `initState()`가 OS 위치 권한 확인/요청과 GPS 취득을 시작한다.
2. 동시에 provider build가 `GET /location`을 호출한다. 이벤트 단위 공유가 켜진 경우 일반 미opt-in 참석자는 `AsyncError`가 되어 토글을 볼 수 없다. 공유가 꺼진 경우에는 빈 data를 받아 토글이 보인다.
3. GET data 상태에서만 상세·거리 provider와 지도/토글 content가 렌더된다.
4. 렌더된 토글 On 시:
   `EventLocationNotifier.optIn()` → `Repository.optIn(eventId)` → POST `/opt-in`
   → 즉시 `_updateMyLocation` → `Repository.updateLocation(...)` → POST `/update`
   → `startAutoRefresh()` 로 30s 목록 조회 타이머 시작
   → `_startGpsRefreshTimer()` 로 60s GPS 재취득·POST 타이머 시작
5. FAB(내 위치 버튼) 탭 → 위 4의 update 흐름만 호출
6. 토글 Off 시: F14-02 (확인 다이얼로그 → POST `/opt-out` → `stopAutoRefresh`)
7. 화면 dispose / 앱 paused 시 목록·GPS 타이머 정지. privacy 화면 push는 dispose가 아니므로 계속될 수 있다.

상태 동기화: 빌드 중 `myLocation != null` 이면 화면 로컬 `_isOptedIn` 을 true로 인퍼한다. 재진입 시 토글과 GPS 타이머는 복원하지만 목록 타이머는 복원하지 않는다.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 다른 공유 위치 목록 조회: **30초** (`EventLocationNotifier.startAutoRefresh`)
- 내 GPS 재취득·서버 갱신: **60초** (`_gpsRefreshInterval`), 2회 연속 실패 시 중단
- 카운트다운 tick 주기: **1초** (`Timer.periodic(Duration(seconds: 1))` + `ValueNotifier<DateTime>`)
- 지도 마커 색상 매핑: 장소=Red(`hueRed`) / 나=Azure(`hueAzure`, AppColors.linkBlue) / 다른 참석자=Green(`hueGreen`, AppColors.primary500)
- 초기 카메라 우선순위: 내 위치 → 이벤트 장소 → 첫 번째 참석자 → 서울 시청 (`37.5665, 126.9780`)
- `fitBounds` 호출은 위치 개수가 변할 때만 (`didUpdateWidget`)
- 토스트 메시지:
  - opt-in 성공: "위치 공유를 시작합니다"
  - 권한 미부여: "위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요."
  - 영구 거부: "위치 권한이 영구 거부되었습니다. 설정에서 변경해주세요."
- DraggableSheet 비율: `initialChildSize: 0.35`, `minChildSize: 0.15`, `maxChildSize: 0.75`
- 마지막 갱신 시각 포맷: `< 1분: "방금 전"`, `< 60분: "N분 전"`, `≥ 60분: "N시간 전"`
- 관리자급 viewer의 거리 표시 포맷: `${distanceKm} km · 약 ${estimatedMinutes}분`. 일반 참석자는 거리 API 403을 빈 map으로 처리해 이 정보가 없다.
- AppBar 우측 톱니바퀴 → 프라이버시 화면 진입점 (스펙은 SCR-LD-003 진입경로로 명시)
- 백그라운드 진입 시 자동 갱신 중지, 재개 시 즉시 1회 update + auto-refresh 재시작

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 미opt-in 일반 참석자가 공유 활성 이벤트에 처음 진입 | ATTENDING, location_opt_in 없음/false, `locationShareEnabled=true` | 초기 GET이 `LOCATION_OPT_IN_REQUIRED`로 실패해 `AppErrorState`만 보이고 토글 Off→On 경로에 도달하지 못함 |
| S1-A | 미opt-in 일반 참석자가 공유 비활성 이벤트에 진입 | ATTENDING, location_opt_in 없음/false, `locationShareEnabled=false` | 초기 GET은 빈 data라 토글이 보이지만, On 후 좌표 update가 `LOCATION_SHARE_DISABLED`로 실패해 opt-in만 true가 될 수 있음 |
| S2 | 신규 opt-in 뒤 자동 갱신 중 마커가 이동한다 | 화면에서 opt-in 성공 후 5분간 유지 | 앱은 60초마다 GPS를 재취득해 update하고 30초마다 목록을 조회한다. 활성 공유의 만료는 자동 갱신만으로 연장되지 않는다. |
| S3 | 관리자급 조회자는 opt-in 없이 모든 허용 좌표를 본다 (권한 분기) | 호스트/공동호스트/클럽 이벤트 생성 권한 보유자, opt-in Off | 조회자는 시작 24시간 전 제한과 본인 opt-in 없이도 접근하되 차단·현재 자격·만료 필터는 그대로 적용된다. |
| S4 | 시작 24시간보다 일찍 진입한 참석자는 차단된다 (시간 게이트) | 모임 시작 30시간 전인데 위치 화면을 미리 열어본 일반 참석자 | 서버 상태 변화 없음. 사용자는 24시간 전 이후 다시 진입해야 함 |
| S5 | 위치 권한 영구 거부 (디바이스 OS 분기) | 과거에 권한 거부 후 "다시 묻지 않기" 선택한 사용자 | 서버 변화 없음, 토글 Off 유지 |
| S6 | 호스트가 이벤트 단위로 위치 공유를 비활성화 (S-LD-003 호스트 흐름과의 결합) | 일반 참석자, 호스트가 `Event.locationShareEnabled=false` 로 설정 | 사용자에게는 "위치 공유 가능 시간이 아닙니다" 류 안내가 필요. 본 흐름에서는 토스트 미발생 — 서버 에러 코드 → ApiError 매핑 후 별도 화면 안내로 대응 (현 구현은 silent fail) |
| S7 | opt-out한 참석자는 다른 사람 응답에서 사라진다 (비공개 마킹) | 같은 모임의 두 사용자 A(opt-in), B(opt-out) | 서버는 access_log에 B를 기록하지 않음 (응답에 포함되지 않으므로) |
| S8 | data 상태에서 토글 On 뒤 첫 update 실패 | 관리자급 viewer 또는 이미 GET data에 도달 가능한 상태, GPS 없음/서버 update 실패 | opt-in은 저장되고 로컬 On·두 타이머·성공 토스트가 진행될 수 있으나 location_share는 생성되지 않을 수 있음 |
| S9 | 기존 활성 share로 화면 재진입 | 서버 GET에 본인 LocationVo가 포함되며 앱은 계속 foreground | 화면은 `_isOptedIn=true`와 60초 GPS 타이머를 복원하지만 30초 목록 timer를 시작하지 않아 다른 참석자 목록은 자동 갱신되지 않을 수 있음 |
| S10 | 일반 참석자가 일행 리스트를 본다 | ATTENDING+opt-in 일반 사용자 | 위치 목록은 보지만 거리 API는 `EVENT_NOT_OWNER`; 화면이 오류를 빈 map으로 바꿔 `"참석자 #id"`·마지막 갱신만 표시하고 닉네임/프로필/거리/예상시간은 표시하지 않음 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | scenarios.md:77 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P64 매트릭스 mode=opt_in/update 모음) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:104 | ### update mode 결정적 분기 보강 (silent → 명확 분기) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| Gap | `LocationService#validateEventParticipant` / `updateLocation` | 공동호스트는 opt-in 자격에는 포함되지만, 좌표 update 쓰기 권한은 호스트 또는 ATTENDING만 검사한다. 공동호스트가 ATTENDING 행이 없으면 opt-in 뒤 update가 `UNAUTHORIZED`로 거절될 수 있다. | 권한 기준 통일 여부 결정 및 회귀 테스트 추가 |
| P0 Gap | `EventLocationNotifier.build` + `LocationService#getEventLocations` | 공유 활성 이벤트에서 일반 참석자는 GET 전에 opt-in해야 하지만 opt-in 토글은 GET 성공 content 안에 있다. 공유 비활성 이벤트만 빈 data로 우연히 content에 도달하며 update는 다시 차단된다. | GET을 미opt-in viewer에게 empty+상태로 허용하거나 opt-in CTA를 AsyncError/data 밖으로 분리 |
| P1 Gap | `_toggleOptIn` / `_updateMyLocation` | OS 권한은 initState에서만 확인하고, 토글은 opt-in 저장 후 update 결과를 확인하지 않은 채 로컬 On·타이머·성공 토스트를 진행한다. | 토글 시 권한 재검증, opt-in+첫 update 결과 분리 UX 및 실패 rollback/명시 안내 결정 |
| P2 Gap | `_gpsRefreshTick` / `EventLocationNotifier.startAutoRefresh` | 만료 시 GPS 타이머만 멈추고 30초 GET 타이머는 계속될 수 있다. privacy route push에서도 기존 화면 타이머가 유지될 수 있다. | 만료·하위 route 진입 시 두 타이머 lifecycle을 함께 정리 |
| P1 Gap | `_buildContent` 활성 share 재진입 분기 | 본인 LocationVo로 opt-in을 복원할 때 GPS timer만 시작하고 `startAutoRefresh()`를 호출하지 않는다. 새 opt-in/resume 전까지 타 참석자 목록이 자동 갱신되지 않는다. | 활성 share 복원 시 두 timer를 함께 시작하는 lifecycle test 추가 |
| 권한 UX | `attendeeDistancesNotifierProvider` | 거리 endpoint는 관리자급 전용인데 같은 화면의 일반 참석자도 provider를 호출한다. 403을 빈 map으로 축약해 원인을 숨기고 ID/갱신시각만 보여 준다. | 일반 viewer는 호출 생략하고 역할별 표시 계약을 문서/UI에 명시 |

## 9. 수용 기준

- **AC-01. 미opt-in 일반 참석자 최초 진입의 현재 결과**: Given ATTENDING이지만 location_opt_in이 없고 이벤트 단위 공유가 켜져 있을 때 When provider build가 GET `/location`을 호출하면 Then `LOCATION_OPT_IN_REQUIRED`가 `AppErrorState`로 렌더되고 토글은 노출되지 않는다. 이벤트 단위 공유가 꺼져 있으면 빈 data와 토글은 보이지만 update가 `LOCATION_SHARE_DISABLED`로 실패한다
- **AC-02. 신규 opt-in 뒤 자동 갱신**: Given 화면에서 opt-in에 성공한 사용자가 화면을 유지할 때 When 시간이 흐르면 Then 60초 GPS update와 30초 목록 GET이 실행되며 자동 갱신만으로 기존 만료 시각은 연장되지 않는다. 기존 활성 share 재진입은 목록 timer가 빠지는 현재 Gap으로 별도 검증한다
- **AC-03. 관리자급 조회자는 opt-in 없이 모든 허용 좌표를 본다 (권한 분기)**: Given 호스트·공동호스트·클럽 이벤트 생성 권한 보유자가 위치 화면에 진입할 때 When 목록을 조회하면 Then 시간창과 본인 opt-in을 우회하되 차단·현재 자격·만료 필터가 적용된 좌표만 본다
- **AC-04. 시작 24시간보다 일찍 진입한 참석자는 차단된다 (시간 게이트)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 상태 변화 없음. 사용자는 24시간 전 이후 다시 진입해야 함
- **AC-05. 위치 권한 영구 거부 (디바이스 OS 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음, 토글 Off 유지
- **AC-06. 호스트가 이벤트 단위로 위치 공유를 비활성화 (S-LD-003 호스트 흐름과의 결합)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게는 "위치 공유 가능 시간이 아닙니다" 류 안내가 필요. 본 흐름에서는 토스트 미발생 — 서버 에러 코드 → ApiError 매핑 후 별도 화면 안내로 대응 (현 구현은 silent fail)
- **AC-07. opt-out한 참석자는 다른 사람 응답에서 사라진다 (비공개 마킹)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버는 access_log에 B를 기록하지 않음 (응답에 포함되지 않으므로)
- **AC-09. 기존 활성 share 재진입**: Given 초기 GET에 본인 share가 있을 때 When 화면이 data content를 빌드하면 Then opt-in과 GPS 60초 timer는 복원하지만 현재 구현은 목록 30초 timer를 시작하지 않는다
- **AC-10. 일반 참석자의 일행 정보 범위**: Given 운영 권한 없는 ATTENDING viewer When 위치 화면을 보면 Then LocationVo 기반 userId·마지막 갱신은 보지만 거리 API 403이 빈 map으로 처리되어 닉네임·프로필·거리·예상시간은 보이지 않는다

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
