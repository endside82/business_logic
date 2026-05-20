# F14-01. 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/14_location_directions/F14-01_event-location-share -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-01_event-location-share`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

참석 확정한 이벤트에서 참석자가 자신의 위치 공유를 켜고(`opt-in`), 30초 단위로 좌표를 서버에 갱신하며(`update`), 같은 이벤트의 다른 참석자 위치 목록을 조회(`GET`)하는 API. 호스트는 opt-in 없이도 모든 참석자 위치를 조회할 수 있고, 일반 참석자는 본인이 opt-in 해야만 다른 참석자의 좌표가 응답에 노출된다. 모든 좌표 노출은 `location_access_log`에 기록되어 F14-04 프라이버시 대시보드의 입력이 된다.

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

1. 화면 진입 → `eventLocationNotifierProvider(eventId)` 자동 빌드 → `EventLocationRepository.getEventLocations(eventId)` → `GET /api/v1/events/{eventId}/location`
2. (병렬) `eventDetailNotifierProvider(eventId)` 가 venue 좌표 제공, `attendeeDistancesNotifierProvider(eventId)` 가 닉네임/프로필/거리 제공
3. 권한 확인 후 `_getCurrentPosition` (Geolocator) → 로컬 `_myPosition` 보관
4. 토글 On 시:
   `EventLocationNotifier.optIn()` → `Repository.optIn(eventId)` → POST `/opt-in`
   → 즉시 `_updateMyLocation` → `Repository.updateLocation(...)` → POST `/update`
   → `startAutoRefresh()` 로 30s `Timer.periodic` 시작 (각 tick은 `refresh()` → `GET /location`)
5. FAB(내 위치 버튼) 탭 → 위 4의 update 흐름만 호출
6. 토글 Off 시: F14-02 (확인 다이얼로그 → POST `/opt-out` → `stopAutoRefresh`)
7. 화면 dispose / 앱 background 진입 시 `stopAutoRefresh` 호출 (`didChangeAppLifecycleState`)

상태 동기화: 빌드 중 `myLocation != null` 이면 화면 로컬 `_isOptedIn` 을 true로 인퍼 (재진입 시 토글이 자동으로 On으로 보임).

## 4. 서버 계약

### 개요

참석 확정한 이벤트에서 참석자가 자신의 위치 공유를 켜고(`opt-in`), 30초 단위로 좌표를 서버에 갱신하며(`update`), 같은 이벤트의 다른 참석자 위치 목록을 조회(`GET`)하는 API. 호스트는 opt-in 없이도 모든 참석자 위치를 조회할 수 있고, 일반 참석자는 본인이 opt-in 해야만 다른 참석자의 좌표가 응답에 노출된다. 모든 좌표 노출은 `location_access_log`에 기록되어 F14-04 프라이버시 대시보드의 입력이 된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/location/opt-in | LocationController#optIn | required | LocationOptIn upsert (optedIn=true) |
| POST | /api/v1/events/{eventId}/location/update | LocationController#updateLocation | required | LocationShare upsert + sharedAt/expiresAt 갱신 |
| GET | /api/v1/events/{eventId}/location | LocationController#getEventLocations | required | opt-in 참석자 좌표 목록 + 접근 로그 INSERT |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `LocationShare` (`location_share` 테이블)
  - `id, eventId, userId, latitude, longitude, accuracy?, sharedAt, expiresAt?, createdAt, updatedAt`
  - `expiresAt` 은 update 시 항상 `now + 2h` 로 재설정. 만료 정책의 단일 출처.
- **Entity** `LocationOptIn` (`location_opt_in` 테이블)
  - `id, eventId, userId, optedIn(boolean), createdAt, updatedAt`
  - opt-in/opt-out 모두 같은 행을 토글. 첫 호출 시 INSERT.
- **Entity** `LocationAccessLog` (`location_access_log` 테이블)
  - `id, accessorId, targetUserId, eventId, createdAt`
  - GET 응답에 포함된 사용자 1건당 1행 기록 → F14-04 대시보드 데이터 원천.
- **Param** `LocationModParam`: `Double latitude` (NotNull), `Double longitude` (NotNull), `Double accuracy` (nullable)
- **VO** `LocationVo`: `long userId, double latitude, double longitude, Double accuracy, LocalDateTime sharedAt, LocalDateTime expiresAt`
- **Enum** (도메인 외): `AttendanceStatus.ATTENDING` (capacity 도메인) — opt-in/update/get 모두 `ATTENDING` 만 인정.

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
    - 참석자 리스트 (`_ParticipantTile`) — 닉네임/프로필이미지(있으면 `AttendeeDistanceVo` 에서) + 거리/소요시간 + 마지막 갱신 시각
- **사용자가 할 수 있는 액션**:
  - "위치 공유" 토글 On → OS 권한 확인 → POST `/opt-in` → POST `/update` → 30s 자동 폴링 시작
  - 토글 Off → 확인 다이얼로그 → POST `/opt-out` (F14-02)
  - 내 위치 갱신 FAB 탭 → `Geolocator.getCurrentPosition` → POST `/update`
  - 톱니바퀴 → `LocationPrivacyScreen` 으로 push (F14-04)
  - 30초 주기 자동 갱신: `EventLocationNotifier.startAutoRefresh()` 가 `Timer.periodic` 으로 `GET /location` 재호출 + 마커 위치 갱신
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

1. 화면 진입 → `eventLocationNotifierProvider(eventId)` 자동 빌드 → `EventLocationRepository.getEventLocations(eventId)` → `GET /api/v1/events/{eventId}/location`
2. (병렬) `eventDetailNotifierProvider(eventId)` 가 venue 좌표 제공, `attendeeDistancesNotifierProvider(eventId)` 가 닉네임/프로필/거리 제공
3. 권한 확인 후 `_getCurrentPosition` (Geolocator) → 로컬 `_myPosition` 보관
4. 토글 On 시:
   `EventLocationNotifier.optIn()` → `Repository.optIn(eventId)` → POST `/opt-in`
   → 즉시 `_updateMyLocation` → `Repository.updateLocation(...)` → POST `/update`
   → `startAutoRefresh()` 로 30s `Timer.periodic` 시작 (각 tick은 `refresh()` → `GET /location`)
5. FAB(내 위치 버튼) 탭 → 위 4의 update 흐름만 호출
6. 토글 Off 시: F14-02 (확인 다이얼로그 → POST `/opt-out` → `stopAutoRefresh`)
7. 화면 dispose / 앱 background 진입 시 `stopAutoRefresh` 호출 (`didChangeAppLifecycleState`)

상태 동기화: 빌드 중 `myLocation != null` 이면 화면 로컬 `_isOptedIn` 을 true로 인퍼 (재진입 시 토글이 자동으로 On으로 보임).

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 자동 갱신 주기: **30초** (`EventLocationNotifier.startAutoRefresh` 의 `Duration(seconds: 30)`)
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
- 거리 표시 포맷: `${distanceKm} km · 약 ${estimatedMinutes}분`
- AppBar 우측 톱니바퀴 → 프라이버시 화면 진입점 (스펙은 SCR-LD-003 진입경로로 명시)
- 백그라운드 진입 시 자동 갱신 중지, 재개 시 즉시 1회 update + auto-refresh 재시작

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 모임 30분 전, 위치 공유를 켜고 일행 위치를 확인한다 (Happy Path) | 로그인됨, 이벤트 시작 30분 전, OS 위치 권한 미부여, 토글 Off | - 서버: `location_opt_in.optedIn=true`, `location_share` 1행 (expiresAt = now+2h), 본인 응답 노출 시점에 `location_access_log` 기록(타 참석자 → 본인) |
| S2 | 자동 갱신 중 마커가 부드럽게 이동한다 | 같은 사용자, 5분간 화면 유지하며 이동 중 | 서버에 30초마다 `update` 호출, 다른 사용자 GET 응답에서 본인 좌표가 최신화 |
| S3 | 호스트는 opt-in 없이 모든 좌표를 본다 (권한 분기) | 모임 호스트 본인, opt-in 토글 미작동 상태 | 호스트는 토글이 Off 상태여도 다른 참석자 위치를 볼 수 있고, 시작 24h 전이라도 조회 가능 |
| S4 | 시작 24시간보다 일찍 진입한 참석자는 차단된다 (시간 게이트) | 모임 시작 30시간 전인데 위치 화면을 미리 열어본 일반 참석자 | 서버 상태 변화 없음. 사용자는 24시간 전 이후 다시 진입해야 함 |
| S5 | 위치 권한 영구 거부 (디바이스 OS 분기) | 과거에 권한 거부 후 "다시 묻지 않기" 선택한 사용자 | 서버 변화 없음, 토글 Off 유지 |
| S6 | 호스트가 이벤트 단위로 위치 공유를 비활성화 (S-LD-003 호스트 흐름과의 결합) | 일반 참석자, 호스트가 `Event.locationShareEnabled=false` 로 설정 | 사용자에게는 "위치 공유 가능 시간이 아닙니다" 류 안내가 필요. 본 흐름에서는 토스트 미발생 — 서버 에러 코드 → ApiError 매핑 후 별도 화면 안내로 대응 (현 구현은 silent fail) |
| S7 | opt-out한 참석자는 다른 사람 응답에서 사라진다 (비공개 마킹) | 같은 모임의 두 사용자 A(opt-in), B(opt-out) | 서버는 access_log에 B를 기록하지 않음 (응답에 포함되지 않으므로) |

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

## 9. 수용 기준

- **AC-01. 모임 30분 전, 위치 공유를 켜고 일행 위치를 확인한다 (Happy Path)**: Given 로그인됨, 이벤트 시작 30분 전, OS 위치 권한 미부여, 토글 Off When 사용자가 해당 흐름을 실행하면 Then - 서버: `location_opt_in.optedIn=true`, `location_share` 1행 (expiresAt = now+2h), 본인 응답 노출 시점에 `location_access_log` 기록(타 참석자 → 본인)
- **AC-02. 자동 갱신 중 마커가 부드럽게 이동한다**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버에 30초마다 `update` 호출, 다른 사용자 GET 응답에서 본인 좌표가 최신화
- **AC-03. 호스트는 opt-in 없이 모든 좌표를 본다 (권한 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 호스트는 토글이 Off 상태여도 다른 참석자 위치를 볼 수 있고, 시작 24h 전이라도 조회 가능
- **AC-04. 시작 24시간보다 일찍 진입한 참석자는 차단된다 (시간 게이트)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 상태 변화 없음. 사용자는 24시간 전 이후 다시 진입해야 함
- **AC-05. 위치 권한 영구 거부 (디바이스 OS 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음, 토글 Off 유지
- **AC-06. 호스트가 이벤트 단위로 위치 공유를 비활성화 (S-LD-003 호스트 흐름과의 결합)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게는 "위치 공유 가능 시간이 아닙니다" 류 안내가 필요. 본 흐름에서는 토스트 미발생 — 서버 에러 코드 → ApiError 매핑 후 별도 화면 안내로 대응 (현 구현은 silent fail)
- **AC-07. opt-out한 참석자는 다른 사람 응답에서 사라진다 (비공개 마킹)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버는 access_log에 B를 기록하지 않음 (응답에 포함되지 않으므로)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
