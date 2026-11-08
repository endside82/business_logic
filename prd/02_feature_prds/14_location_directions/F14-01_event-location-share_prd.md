# F14-01. 이벤트 참석자 위치 공유 (opt-in / 위치 갱신 / 조회) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-29 현재 소스 갱신: 신규 opt-in 성공 또는 앱 resume 경로는 위치 목록을 30초마다 `GET`하고, 공유 중인 내 GPS는 별도 60초 타이머로 다시 취득해 `POST /update`한다. 기존 활성 share로 화면에 재진입한 직후에는 GPS 타이머만 시작하고 목록 타이머는 시작하지 않는 lifecycle Gap이 있다. GPS 갱신이 2회 연속 실패하면 GPS 타이머만 멈추고 한 번 안내한다. dispose·앱 paused·위치 화면에서 성공한 opt-out은 두 주기 모두 멈추지만, 만료는 GPS 타이머만 멈추고 30초 목록 타이머는 계속될 수 있다. privacy route push도 기존 위치 화면을 dispose하지 않는다. 서버는 아직 활성인 공유에 대해 **요청의** `expiryMode`가 null인 좌표 갱신에서 기존 `expiresAt`/`expiryMode`를 보존한다.

## 1. 결론

참석 확정한 이벤트에서 참석자가 자신의 위치 공유를 켜고(`opt-in`), 공유 중에는 60초 GPS 전송과 30초 목록 조회 주기를 운용한다. 단 목록 타이머는 신규 opt-in/resume에서만 명시적으로 시작되고 기존 활성 share 재진입 경로에서는 빠진다. 호스트·공동호스트·클럽의 이벤트 생성 권한 보유자는 opt-in/시간창 제한 없이 조회할 수 있고, 일반 참석자는 ATTENDING이면서 본인이 opt-in해야 한다. 응답으로 실제 노출된 타인의 좌표는 GET마다 대상별 `location_access_log` 한 행으로 기록되므로 F14-04 수치는 고유 열람자가 아니라 30초 polling hit를 포함한다.

현재 Flutter 진입 순서에는 중대한 교착이 있다. `EventLocationNotifier.build()`가 화면 content보다 먼저 `GET /location`을 호출하므로, 아직 opt-in하지 않은 일반 ATTENDING 사용자는 이벤트 단위 `locationShareEnabled=true`일 때 서버의 `LOCATION_OPT_IN_REQUIRED`를 받아 전체 `AppErrorState`에 머문다. 토글은 data content 안에 있어 이 화면에서 Off→On으로 전환할 수 없다. 반대로 이벤트 단위 공유가 false면 서버가 opt-in 검사보다 먼저 빈 목록을 반환해 content와 토글은 보이지만, 토글 후 좌표 update는 `LOCATION_SHARE_DISABLED`로 실패한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 화면 → "참석자 위치" 액션 → `/home/events/:eventId/location` 푸시
- (간접) 푸시 알림 `LOCATION_SHARE_EXPIRING` 탭 → notification router가 같은 라우트로 인계 (F14-03에서 다룸)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `LocationController`. 앱: `event_location_screen.dart`, `event_map_widget.dart`, `routes.dart`.

<!-- source-references:start -->
서버 창구: `LocationController#optIn`, `LocationController#updateLocation`, `LocationController#getEventLocations`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 공유 만료 시각: 기본은 공유 시점부터 2시간이다. 앱이 모드를 정하면 `UNTIL_EVENT_END_PLUS_30M`(모임 종료 쪽에 맞춤) 또는 `CUSTOM_HOURS`(1~24시간, 시간 수가 없으면 거절)도 쓸 수 있다. 어느 모드든 만료는 모임 종료 시각을 넘지 못한다.
- 이미 공유 중인 사람이 모드 없이 좌표만 다시 보내면(주기 GPS 갱신) 기존 만료는 그대로다. 모드를 새로 주거나 이미 만료된 뒤에만 만료가 다시 계산된다.
- 좌표는 위도 -90~90, 경도 -180~180 안이어야 하고 (0, 0)은 거절한다. 위치 공유가 꺼진 이벤트에는 좌표를 올릴 수 없다.
- 목록에 나오는 사람은 지금도 모임에 속한 사람(참석 확정, 호스트, 공동호스트) 중 opt-in 한 사람이다. 만료된 좌표와 조회자와 서로 차단한 사람은 빠지고, 참석을 취소한 사람의 남은 좌표도 보이지 않는다. 호스트, 공동호스트, 클럽 이벤트 생성 권한자는 본인 opt-in 없이도 보지만 이 필터는 같다.
- 목록을 한 번 받을 때마다 목록에 든 타인 한 명당 접근 기록이 한 줄 생긴다(본인 제외). 30초 자동 조회도 매번 쌓이므로 접근 기록 건수는 고유 열람자 수가 아니다. 접근 기록은 30일 뒤 삭제된다.
- 일반 참석자 목록에는 사용자 번호와 마지막 갱신 시각만 있어 `참석자 #번호` 로 보이고, 닉네임, 사진, 거리는 관리자급 조회자만 본다. 마지막 갱신은 1분 미만 `방금 전`, 1시간 미만 `N분 전`, 그 이상 `N시간 전` 이다.
- 지도 마커는 이벤트 장소(빨강), 나(파랑), 다른 참석자(초록)이고 범례가 위에 있다. 처음 카메라는 내 위치, 이벤트 장소, 첫 참석자, 서울 시청 순으로 잡는다.
- 화면에 들어오면 위치 권한을 바로 요청한다. 거부되면 `위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.`, 영구 거부면 `위치 권한이 영구 거부되었습니다. 설정에서 변경해주세요.` 가 뜨고 설정 화면으로 보낸다. 공유를 켜면 `위치 공유를 시작합니다` 가 뜬다.
- 내 위치 자동 갱신이 2번 연속 실패하면 갱신을 멈추고 오류 안내를 한 번 보인다. 앱이 백그라운드로 가면 자동 갱신을 멈추고, 돌아오면 즉시 한 번 올리고 다시 시작한다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 시험 보강 기록 | 위치 공유 켜기와 좌표 올리기의 시험 보강 기록이다. 결함이 아니다 | 없음 |
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
