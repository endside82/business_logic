# F14-05. 이벤트 길찾기 (경로 + 참석자 거리) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-08 현재 소스 갱신: 길찾기는 현재 위치와 저장 주소 출발지를 모두 앱에서 선택할 수 있고, 서버는 좌표가 없는 도착지/출발지 조합을 null guard로 막는다. 외부 지도 URL 생성도 Kakao/Naver/Google/Apple 인계 기준으로 정리됐다. 주소 선택에서 좌표가 `0.0,0.0`으로 저장되는 위험은 F14-06의 주소→좌표 geocode 추가와 함께 본다.
>
> 2026-07-29 현재 소스 갱신: 오프라인 이벤트 상세의 장소 행에 `"길찾기"` CTA가 연결되어 실제 진입 경로가 생겼다. 결과 화면은 서버의 Haversine 근사치를 `"예상 이동 안내"`와 `"직선거리 기준 추정이에요. 정확한 경로는 지도 앱에서 확인하세요."`로 명확히 표시하고, 도보/대중교통/자동차/자전거 중 응답에 존재하는 이동수단을 사용자가 고른 뒤 provider별 외부 링크를 연다.

## 1. 결론

오프라인 이벤트의 도착지(이벤트 좌표)까지 출발지(현재 위치 / 등록 주소 / 기본 주소)로부터의 거리·예상 소요시간·간단 3단계 안내, 그리고 카카오/네이버/구글/애플 4종 지도 앱으로 인계할 수 있는 딥링크/외부 URL 묶음을 한 번에 돌려주는 API. 추가로 호스트/공동호스트/클럽 관리자가 참석자별 도착지까지의 거리 리스트를 조회하는 별도 엔드포인트가 있다. 실제 라우팅 엔진은 외부 호출 없이 Haversine 거리 + 모드별 평균 속도로 클라이언트가 빠르게 안내받을 수 있는 근사값을 계산한다 (외부 지도 앱은 클라이언트 딥링크 단계에서만 사용).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 오프라인 이벤트 상세의 장소 행 → "길찾기" 액션 → `/home/events/:eventId/directions`
- (간접) `EventLocationScreen` 참석자 리스트의 거리/소요시간 데이터는 본 단위의 `attendees/distances` API 를 호출하여 결합 — 단, 화면 자체는 F14-01

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DirectionsController`, `UserService`. 앱: `directions_screen.dart`, `event_location_screen.dart`, `event_info_section.dart`, `routes.dart`.

<!-- source-references:start -->
서버 창구: `DirectionsController#getDirections`, `DirectionsController#getAttendeeDistances`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 → `addressListNotifierProvider` (Unit 13) 빌드 → 등록 주소 목록
2. 화면 빌드 직후 (`addPostFrameCallback`) → `_fetchWithCurrentLocation()` 자동 1회 호출
3. `Geolocator.getCurrentPosition` → 좌표 취득 → `DirectionsNotifier.fetchWithCoordinates(lat, lng)` → `DirectionsRepository.getDirections(eventId, originLatitude, originLongitude)` → GET `/api/v1/events/{eventId}/directions?originLatitude=&originLongitude=`
4. (사용자가 다른 칩 탭) `DirectionsNotifier.fetchWithAddress(addressId)` → GET `/directions?userAddressId=`
5. (사용자가 외부 지도 버튼 탭) `launchUrl(...)` — 서버 호출 없음

> 화면이 SCR-LD-001 의 참석자 거리 데이터를 결합하는 흐름은 별개: F14-01 의 `attendeeDistancesNotifierProvider(eventId)` 가 본 단위 `GET /attendees/distances` 를 호출 (호스트/co-host/club admin 권한 필요 — 일반 참석자가 호출하면 `EVENT_NOT_OWNER` 403).

## 4. 제품 규칙

- 길찾기는 오프라인 모임에만 되고, 볼 수 있는 모임이어야 한다. 온라인 모임이면 거절된다(`EVENT_NOT_OFFLINE`).
- 출발지 우선순위는 고른 저장 주소, 현재 좌표, 기본 주소 순이다. 저장 주소는 본인 것만 쓸 수 있고(남의 주소는 거절), 아무것도 없고 기본 주소도 없으면 출발지를 정할 수 없다. 현재 위치 라벨은 `현재 위치`, 저장 주소는 라벨(집, 회사 등)로 보인다.
- 거리와 시간은 직선거리 근사값이다. 거리 2km 이하는 도보 시속 5km, 20km 이하는 대중교통 시속 30km, 그 이상은 자동차 시속 50km로 소요 분을 올림해 계산하고, 안내는 3단계 간단 안내다. 화면에는 `직선거리 기준 추정이에요. 정확한 경로는 지도 앱에서 확인하세요.` 라는 면책을 함께 보인다. 서버는 외부 경로 서비스를 부르지 않는다.
- 외부 지도는 카카오맵, 네이버지도, 구글맵, 애플맵 4종이고 이동수단(도보, 대중교통, 자동차, 자전거)별로 링크가 있다. 응답에 있는 이동수단만 칩으로 보이고 고른 수단의 링크만 연다.
- 화면에 들어오면 현재 위치로 자동 한 번 길찾기를 한다. 출발지 칩은 현재 위치가 첫째이고 저장 주소는 3개까지만 보인다. 위치를 10초 안에 못 얻거나 권한이 거부되면 `현재 위치를 가져올 수 없습니다` 가 뜨고, 현재 위치 칩은 다시 누를 수 있다.
- 거리는 1km 미만 `N m`, 이상 `N.N km`, 시간은 60분 미만 `N분`, 이상 `N시간 M분`(분이 0이면 `N시간`)으로 보인다. 링크가 하나도 없으면 `이용 가능한 지도 앱이 없습니다`, 출발지 선택 전에는 `출발지를 선택해주세요` 가 뜬다.
- 참석자별 거리 목록은 호스트, 공동호스트, 클럽 운영진만 받는다. 일반 참석자는 거절되고 거리 정보 없이 위치만 본다.

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
