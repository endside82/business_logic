# F14-05. 이벤트 길찾기 (경로 + 참석자 거리) PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/14_location_directions/F14-05_event-directions -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-05_event-directions`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-07-08 현재 소스 갱신: 길찾기는 현재 위치와 저장 주소 출발지를 모두 앱에서 선택할 수 있고, 서버는 좌표가 없는 도착지/출발지 조합을 null guard로 막는다. 외부 지도 URL 생성도 Kakao/Naver/Google/Apple 인계 기준으로 정리됐다. 주소 선택에서 좌표가 `0.0,0.0`으로 저장되는 위험은 F14-06의 주소→좌표 geocode 추가와 함께 본다.
>
> 2026-07-29 현재 소스 갱신: 오프라인 이벤트 상세의 장소 행에 `"길찾기"` CTA가 연결되어 실제 진입 경로가 생겼다. 결과 화면은 서버의 Haversine 근사치를 `"예상 이동 안내"`와 `"직선거리 기준 추정이에요. 정확한 경로는 지도 앱에서 확인하세요."`로 명확히 표시하고, 도보/대중교통/자동차/자전거 중 응답에 존재하는 이동수단을 사용자가 고른 뒤 provider별 외부 링크를 연다.

## 1. 결론

오프라인 이벤트의 도착지(이벤트 좌표)까지 출발지(현재 위치 / 등록 주소 / 기본 주소)로부터의 거리·예상 소요시간·간단 3단계 안내, 그리고 카카오/네이버/구글/애플 4종 지도 앱으로 인계할 수 있는 딥링크/외부 URL 묶음을 한 번에 돌려주는 API. 추가로 호스트/공동호스트/클럽 관리자가 참석자별 도착지까지의 거리 리스트를 조회하는 별도 엔드포인트가 있다. 실제 라우팅 엔진은 외부 호출 없이 Haversine 거리 + 모드별 평균 속도로 클라이언트가 빠르게 안내받을 수 있는 근사값을 계산한다 (외부 지도 앱은 클라이언트 딥링크 단계에서만 사용).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 오프라인 이벤트 상세의 장소 행 → "길찾기" 액션 → `/home/events/:eventId/directions`
- (간접) `EventLocationScreen` 참석자 리스트의 거리/소요시간 데이터는 본 단위의 `attendees/distances` API 를 호출하여 결합 — 단, 화면 자체는 F14-01

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/14_location_directions/F14-05_event-directions/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/14_location_directions/F14-05_event-directions/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/14_location_directions/F14-05_event-directions/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/14_location_directions/F14-05_event-directions/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/directions/controller/DirectionsController.java:26` | 확인됨 |
| `community_api/src/main/java/com/endside/community/directions/controller/DirectionsController.java:37` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 → `addressListNotifierProvider` (Unit 13) 빌드 → 등록 주소 목록
2. 화면 빌드 직후 (`addPostFrameCallback`) → `_fetchWithCurrentLocation()` 자동 1회 호출
3. `Geolocator.getCurrentPosition` → 좌표 취득 → `DirectionsNotifier.fetchWithCoordinates(lat, lng)` → `DirectionsRepository.getDirections(eventId, originLatitude, originLongitude)` → GET `/api/v1/events/{eventId}/directions?originLatitude=&originLongitude=`
4. (사용자가 다른 칩 탭) `DirectionsNotifier.fetchWithAddress(addressId)` → GET `/directions?userAddressId=`
5. (사용자가 외부 지도 버튼 탭) `launchUrl(...)` — 서버 호출 없음

> 화면이 SCR-LD-001 의 참석자 거리 데이터를 결합하는 흐름은 별개: F14-01 의 `attendeeDistancesNotifierProvider(eventId)` 가 본 단위 `GET /attendees/distances` 를 호출 (호스트/co-host/club admin 권한 필요 — 일반 참석자가 호출하면 `EVENT_NOT_OWNER` 403).

## 4. 서버 계약

### 개요

오프라인 이벤트의 도착지(이벤트 좌표)까지 출발지(현재 위치 / 등록 주소 / 기본 주소)로부터의 거리·예상 소요시간·간단 3단계 안내, 그리고 카카오/네이버/구글/애플 4종 지도 앱으로 인계할 수 있는 딥링크/외부 URL 묶음을 한 번에 돌려주는 API. 추가로 호스트/공동호스트/클럽 관리자가 참석자별 도착지까지의 거리 리스트를 조회하는 별도 엔드포인트가 있다. 실제 라우팅 엔진은 외부 호출 없이 Haversine 거리 + 모드별 평균 속도로 클라이언트가 빠르게 안내받을 수 있는 근사값을 계산한다 (외부 지도 앱은 클라이언트 딥링크 단계에서만 사용).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/directions | DirectionsController#getDirections | required | 출발지→도착지 경로 정보 + 외부 지도 딥링크 묶음 반환 |
| GET | /api/v1/events/{eventId}/attendees/distances | DirectionsController#getAttendeeDistances | required (host/co-host/club admin) | 참석자별 이벤트 장소까지의 거리 리스트 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `MapProvider`: `KAKAO("카카오맵"), NAVER("네이버지도"), GOOGLE("구글맵"), APPLE("애플맵")`
- **Enum** `TravelMode`: `CAR, TRANSIT, WALK, BIKE`
- **Param** `DirectionsParam`: `Long userAddressId, Double originLatitude, Double originLongitude` (모두 nullable)
- **VO**:
  - `DirectionsVo` (전체 응답)
  - `MapLinkVo`(provider, displayName, travelMode, url)
  - `DistanceInfoVo`(distanceKm, estimatedMinutes, travelMode String)
  - `DirectionStepVo`(instruction, distanceMeters, durationSeconds)
  - `AttendeeDistanceVo`(userId, nickname, profileImageUrl, distanceInfo)

> 주의: `DistanceInfoVo.travelMode` 는 String("WALKING"/"TRANSIT"/"DRIVING") 이고, `MapLinkVo.travelMode` 는 enum `TravelMode` (CAR/TRANSIT/WALK/BIKE) — 두 개념이 다른 분류 체계.

### 의존 단위 / 외부 시스템

- **Unit 03 (event)**: `EventRepository`, `Event.locationType/latitude/longitude/title/address/clubId/hostUserId`
- **Unit 03 capacity**: `EventAttendanceRepository`, `EventCoHostRepository`, `AttendanceStatus.ATTENDING`
- **Unit 04 (club)**: `ClubMemberRepository`, `ClubMember.role.canCreateEvent()` 클럽 관리자 권한 분기
- **Unit 13 (account)**: `UserAddressRepository`, `UserAddress.label/addressType/isDefault/userId`, `UserService.getUserBasicInfoMap`
- **F14-01**: `LocationOptInRepository`, `LocationShareRepository` — 참석자 거리 fallback 시 최신 좌표 사용
- **External (🟠)**: 외부 지도 앱 (카카오맵/네이버지도/구글맵/애플맵) 의 URL 스킴/Universal Link만 사용. **서버에서 외부 API 호출은 없음** — 본 단위 내에서 외부 지오/라우팅 호출은 F14-06 (Kakao reverse-geocode) 만 발생.

## 5. 프론트 계약

### 진입 경로

- 오프라인 이벤트 상세의 장소 행(`event_info_section.dart`) → "길찾기" 액션 → named route `eventDirections`
- (간접) `EventLocationScreen` 참석자 리스트의 거리/소요시간 데이터는 본 단위의 `attendees/distances` API 를 호출하여 결합 — 단, 화면 자체는 F14-01

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/home/events/:eventId/directions` | `location/screens/directions_screen.dart` | SCR-LD-002 — 출발지 선택 + 경로 + 외부 지도 인계 |
| (위젯 외) `event_location_screen.dart` | F14-01 | 시트 안 참석자 리스트의 거리 표시 |

라우트 상수: `Routes.eventDirections = 'directions'` (`routes.dart:27`).

### 화면별 구성 요소 & 액션

### 길찾기 (`directions_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar` 제목 "길찾기", 뒤로가기
  - 출발지 섹션 라벨 + 출발지 칩 그룹 (`Wrap`)
    - "현재 위치" 칩 (`Icons.my_location`)
    - 등록된 주소 최대 3개 (`addressListNotifierProvider` 응답에서 `take(3)`) — `UserAddressVo.displayLabel`
    - 선택 칩: 배경 `AppColors.primary500.withValues(alpha: 0.1)`, 테두리/텍스트 `AppColors.primary500`
  - 경로 결과 카드:
    - 도착지 카드: 이벤트 제목 + `destinationAddress` 작은 글씨
    - 출발지 회색 박스: `Icons.trip_origin` + "출발: {originLabel}" (HOME→집, WORK→회사 한국어 매핑)
    - 거리 카드 (`AppColors.primary50` 배경): 좌측 `Icons.straighten` + "{distanceKm} km / 거리" / 우측 `Icons.schedule` + "약 {estimatedMinutes}분 / 소요시간"
    - 경로 안내: 제목 `"예상 이동 안내"` + 직선거리 추정 면책 문구 + 타임라인 아이콘/step
    - 이동수단 칩: 응답 링크에 존재하는 `WALK`, `TRANSIT`, `CAR`, `BIKE`를 도보/대중교통/자동차/자전거로 표시
    - 외부 지도 앱 섹션: 선택 이동수단으로 provider별 링크를 필터링해 `_MapLinkButton` 표시
- **사용자가 할 수 있는 액션**:
  - "현재 위치" 칩 탭 → `_fetchWithCurrentLocation()`:
    1. `Geolocator.checkPermission` / `requestPermission`
    2. `Geolocator.getCurrentPosition(timeout: 10s)`
    3. `DirectionsNotifier.fetchWithCoordinates(lat, lng)` → GET `/directions?originLatitude=&originLongitude=`
  - 등록된 주소 칩 탭 → `_selectOrigin('address:42')` → `DirectionsNotifier.fetchWithAddress(42)` → GET `/directions?userAddressId=42`
  - 이동수단 칩 탭 → `_selectedTravelMode` 로컬 상태 변경 → 해당 모드의 외부 지도 링크 목록 표시
  - 외부 지도 버튼 탭 → `launchUrl(uri, mode: LaunchMode.externalApplication)` (`url_launcher`)
- **상태 분기**:
  - 위치 가져오는 중: `_isLoadingPosition=true` → 중앙 `CircularProgressIndicator` 32px padding
  - 초기 상태(`directions == null`): `"출발지를 선택해주세요"` + `"현재 위치나 저장된 주소를 기준으로 길찾기를 시작합니다."`
  - 로딩(`AsyncLoading`): 중앙 `CircularProgressIndicator`
  - 에러(`AsyncError`): `AppErrorState.fromError(error: ..., onRetry: () => _selectOrigin(_selectedOrigin))`
  - 좌표 미취득: 토스트 "현재 위치를 가져올 수 없습니다"
  - 카카오/네이버/애플 앱 URL 실행 실패: 같은 이동수단의 Google 링크가 있으면 "{providerName} 앱을 열 수 없어 구글맵으로 엽니다" 토스트 후 자동 fallback
  - Google 링크 자체 또는 fallback도 실행 불가: 토스트 "{providerName} 앱을 열 수 없습니다"
  - links 비어있음: "이용 가능한 지도 앱이 없습니다"
- **모달/시트/네비게이션**: 화면 내부에서 모달/시트 없음. 외부 앱 인계는 OS-level transition.
- **버튼 배치**: `_groupedLinks(...)` 결과를 `Column` 안에서 spread하고 각 항목에 하단 8px padding을 주므로 provider 버튼은 한 줄 가로 배열이 아니라 세로 목록이다.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 → `addressListNotifierProvider` (Unit 13) 빌드 → 등록 주소 목록
2. 화면 빌드 직후 (`addPostFrameCallback`) → `_fetchWithCurrentLocation()` 자동 1회 호출
3. `Geolocator.getCurrentPosition` → 좌표 취득 → `DirectionsNotifier.fetchWithCoordinates(lat, lng)` → `DirectionsRepository.getDirections(eventId, originLatitude, originLongitude)` → GET `/api/v1/events/{eventId}/directions?originLatitude=&originLongitude=`
4. (사용자가 다른 칩 탭) `DirectionsNotifier.fetchWithAddress(addressId)` → GET `/directions?userAddressId=`
5. (사용자가 외부 지도 버튼 탭) `launchUrl(...)` — 서버 호출 없음

> 화면이 SCR-LD-001 의 참석자 거리 데이터를 결합하는 흐름은 별개: F14-01 의 `attendeeDistancesNotifierProvider(eventId)` 가 본 단위 `GET /attendees/distances` 를 호출 (호스트/co-host/club admin 권한 필요 — 일반 참석자가 호출하면 `EVENT_NOT_OWNER` 403).

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 출발지 칩 라벨 매핑: `HOME` → "집", `WORK` → "회사", 그 외엔 그대로 (`_localizeOriginLabel`)
- 등록 주소 최대 3개만 칩 노출 (`addresses.take(3)`)
- "현재 위치" 칩은 항상 첫 번째 + 자동 선택 (디폴트 origin)
- 이동수단 우선순위: `WALK`, `TRANSIT`, `CAR`, `BIKE`; 응답에 존재하는 모드만 칩 노출
- 외부 지도 버튼: 현재 선택한 이동수단으로 링크를 거른 뒤 provider별 표시
- 외부 지도 launch 모드: `LaunchMode.externalApplication`
- 거리 단위 포맷: `1000m 미만` → "Nm", `≥ 1000m` → "N.N km"
- 소요 시간 포맷: `< 60분` → "N분", `≥ 60분` → "N시간 M분" (m=0 면 "N시간")
- 전체 소요/거리 카드 색상: 배경 `AppColors.primary50`, 텍스트 `AppColors.primary700`, 분리선 `AppColors.primary200`
- 경로 안내 타임라인 분리선 색상: `AppColors.gray200`, 두께 1.5px
- 외부 앱 미설치/실패 토스트: 비-Google provider는 같은 이동수단 Google 링크로 자동 fallback하며 안내 토스트, Google/fallback도 실패하면 오류 토스트
- 위치 권한 거부 시: 별도 다이얼로그 없이 `Geolocator.requestPermission()` 만 호출 → 거부 시 좌표 미취득 → 토스트 "현재 위치를 가져올 수 없습니다"
- 위치 timeout: **10초** (`Duration(seconds: 10)`)
- 화면 좌우/상단 padding: `AppSpacing.screenPadding`(16), 하단 `AppSpacing.space8`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 현재 위치에서 모임 장소 길찾기 (Happy Path) | 로그인됨, 이벤트 ATTENDING (단, 본 API는 인증만 요구), OS 위치 권한 미부여 | 외부 카카오맵 앱에서 상세 경로 안내. 서버 상태 변화 없음. |
| S2 | 등록된 "집" 주소로 길찾기 (저장 주소 분기) | 매번 "집" 출발지를 사용하는 사용자 | 같음. 외부 앱 호출만 사용자 선택에 따름. |
| S3 | 다른 사람의 주소 ID 시도 (네거티브, 권한 분기) | 디버그/오용 케이스 | 서버 변화 없음 |
| S4 | 온라인 이벤트에 길찾기 시도 (도메인 분기) | `LocationType.ONLINE` 이벤트 | 정상 이벤트 상세에서는 길찾기 CTA가 숨는다. 직접 route를 열면 서버 `EVENT_NOT_OFFLINE`이 일반 `AppErrorState.fromError`로 표시되며 온라인 전용 안내 문구는 없다 |
| S5 | 위치 권한 거부 + 등록 주소 없음 (사용 불가 분기) | 권한 거부 + 미등록 사용자 | 자동 좌표 호출은 토스트와 함께 실패하지만 "현재 위치" 칩은 계속 보이고 다시 누를 수 있다. 저장 주소 칩만 0개이며 서버 호출은 일어나지 않는다 |
| S6 | 운영자가 참석자 거리 리스트를 본다 (서브 엔드포인트) | 호스트/cohost/클럽 canCreateEvent 운영자 | ATTENDING 계정 회원 중 opt-in=true·활성 share 존재·미차단인 subset만 거리순으로 노출. 비공개 사용자의 placeholder row는 없음 |
| S7 | 일반 참석자가 참석자 거리 리스트를 호출 (권한 분기) | 호스트 아닌 참석자 | 서버가 `EVENT_NOT_OWNER`로 거부하므로 참석자 거리 row 자체를 받지 못한다 |
| S8 | 외부 지도 앱 미설치 (자동 fallback) | 카카오·네이버·애플 URL을 열 수 없는 사용자 | 같은 이동수단의 Google 링크가 있으면 안내 토스트 후 자동 실행한다. Google 링크도 열 수 없으면 오류 토스트 |
| S9 | 1.2km 이동에서 외부 지도 이동수단 선택 | 경로 응답에 WALK/TRANSIT/CAR/BIKE 링크가 존재 | 서버의 근사 거리·시간은 안내로 표시되고, 사용자는 이동수단 칩을 바꿔 해당 모드의 외부 지도 링크를 연다. |

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
| UX gap | `event_detail_screen.dart`, `directions_screen.dart` | ONLINE 이벤트의 정상 CTA는 숨지만 direct route에서는 전용 설명 없이 일반 서버 오류만 보인다. | direct-route guard 또는 `EVENT_NOT_OFFLINE` 전용 문구를 둘지 결정 |
| 문서 교정 | `directions_screen.dart:_groupedLinks` | 외부 지도 4종은 세로 목록이다. 기존 "한 줄" 기술은 현재 widget tree와 불일치했다. | 화면 변경 시 golden/widget test로 배치 재확인 |
| 타입 위험 | `DistanceInfoVo`, `MapLinkVo` | 거리 카드의 `travelMode` 문자열 분류와 링크의 `TravelMode` enum(`CAR/TRANSIT/WALK/BIKE`)은 서로 다른 체계다. | 클라이언트 매핑 회귀 테스트 유지 |

## 9. 수용 기준

- **AC-01. 현재 위치에서 모임 장소 길찾기 (Happy Path)**: Given 로그인됨, 이벤트 ATTENDING (단, 본 API는 인증만 요구), OS 위치 권한 미부여 When 사용자가 해당 흐름을 실행하면 Then 외부 카카오맵 앱에서 상세 경로 안내. 서버 상태 변화 없음.
- **AC-02. 등록된 "집" 주소로 길찾기 (저장 주소 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 같음. 외부 앱 호출만 사용자 선택에 따름.
- **AC-03. 다른 사람의 주소 ID 시도 (네거티브, 권한 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음
- **AC-04. 온라인 이벤트에 길찾기 시도 (도메인 분기)**: Given `LocationType.ONLINE` 이벤트 When 정상 이벤트 상세를 보면 Then 길찾기 CTA가 숨고, direct route로 호출하면 `EVENT_NOT_OFFLINE`이 일반 오류 화면으로 표시된다. 서버 `LocationType`에는 `HYBRID` 값이 없다
- **AC-05. 위치 권한 거부 + 등록 주소 없음 (사용 불가 분기)**: Given 위치 권한 거부와 저장 주소 0개 When 화면의 자동 현재 위치 조회가 실패하면 Then 실패 토스트 후 서버 호출 없이 초기 상태가 남고, "현재 위치" 칩은 재시도를 위해 계속 보인다
- **AC-06. 운영자가 참석자 거리 리스트를 본다 (서브 엔드포인트)**: Given host/cohost/club canCreateEvent 운영자가 호출할 때 When ATTENDING 명단을 계산하면 Then 계정 회원∩opt-in∩활성 share∩미차단 subset만 거리순으로 반환하고 나머지는 row 자체가 없다
- **AC-07. 일반 참석자가 참석자 거리 리스트를 호출 (권한 분기)**: Given 운영 권한이 없는 참석자 When 참석자 거리 API를 호출하면 Then `EVENT_NOT_OWNER`로 거부되고 거리 row를 받지 못한다
- **AC-08. 외부 지도 앱 미설치 (자동 fallback)**: Given 카카오·네이버·애플 provider URL을 열 수 없고 같은 이동수단 Google 링크가 있을 때 When 사용자가 provider 버튼을 누르면 Then fallback 안내 토스트 후 Google 링크를 자동 실행하고, fallback도 불가능할 때만 오류 토스트를 표시한다
- **AC-09. 외부 지도 이동수단 선택**: Given 응답에 여러 이동수단 링크가 있을 때 When 사용자가 도보/대중교통/자동차/자전거 칩 중 하나를 선택하면 Then 해당 모드의 provider 링크만 표시하며, 앱 내부 거리·시간은 직선거리 기반 추정임을 안내한다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
