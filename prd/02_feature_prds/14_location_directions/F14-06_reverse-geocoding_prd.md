# F14-06. 지오코딩 (좌표 ↔ 주소) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-08 현재 소스 갱신: 본 단위는 좌표→주소(reverse geocode)뿐 아니라 주소→좌표 geocode도 함께 제공한다. 서버 `GeocodingController`는 `GET /api/v1/location/geocode?address=...`를 추가했고 Kakao Local address search 결과의 `x/y`를 `longitude/latitude`로 매핑한다. Flutter `geocoding_api.dart`/provider는 주소 검색 결과를 좌표로 확정한다.
>
> 2026-07-29 현재 소스 갱신: 이벤트 생성뿐 아니라 이벤트 편집·일정변경도 주소가 바뀌면 저장 전에 주소→좌표를 호출하고 실패 시 저장을 막는다. 일정변경 요청은 `newLatitude/newLongitude`를 함께 보내 AUTO 즉시 반영과 MAJOR 제안 snapshot/apply 모두 주소·좌표를 같이 이동시킨다. 운영의 빈 `KAKAO_MAPS_API_KEY`는 기동 실패가 아니라 `SecurityConfigValidator` 경고이며, 실제 지오코딩 호출은 계속 실패한다.

## 1. 결론

좌표를 한국식 주소(`AddressVo`)로, 주소 문자열을 좌표(`AddressCoordinateVo`)로 변환하는 양방향 보조 API다. 전용 화면은 없다. 2026-07-29 Flutter 호출부를 전수 검색한 결과, 좌표→주소는 온보딩에서 현재 GPS 위치를 주소로 채우는 한 곳만 사용한다. 주소→좌표는 온보딩 주소 검색, 프로필 주소 폼, 이벤트 생성, 이벤트 편집·일정변경이 사용한다. 두 방향 모두 카카오 로컬 API와 최대 10,000키·24시간 Caffeine 캐시를 각각 사용한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

본 단위에는 전용 화면이 없다. 실제 Flutter 호출부는 다음과 같다.

- 온보딩 위치 (Unit 01) — 현재 GPS 좌표를 `reverseGeocodeProvider`로 주소화하고, 주소 검색 결과는 `geocodeAddressProvider`로 좌표화
- 프로필 주소 등록/편집 (Unit 13) — 검색한 주소 문자열을 `geocodeAddressProvider`로 좌표화
- 이벤트 생성 (Unit 03) — 입력한 장소 주소를 repository의 `geocodeAddress`로 좌표화
- 이벤트 편집/일정변경 (Unit 03) — 주소가 바뀌면 repository의 `geocodeAddress`로 좌표를 먼저 확정하고 실패 시 저장/제안 생성을 중단
- 길찾기(F14-05)는 서버가 준 `event.address/latitude/longitude`를 사용하며 본 API를 직접 호출하지 않는다.
- 지도 핀 이동·long-press·이벤트 핀을 좌표→주소로 바꾸는 Flutter 호출부는 현재 없다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `GeocodingController`. 앱: `geocoding_api.dart`, `geocoding_repository.dart`, `geocoding_provider.dart`, `address_vo.dart`.

<!-- source-references:start -->
서버 창구: `GeocodingController#reverseGeocode`, `GeocodingController#geocode`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 호출자 화면이 `reverseGeocodeProvider(lat: x, lng: y)` watch
2. Provider 내부에서 `GeocodingRepository.reverseGeocode(lat: x, lng: y)` → `GeocodingApi.reverseGeocode(x, y)` → GET `/api/v1/location/reverse-geocode?lat=x&lng=y`
3. `Result.success(AddressVo)` 또는 `Result.failure(ApiError)` → Provider 가 unwrap 하여 AsyncValue 로 노출
4. 주소→좌표 호출자는 `geocodeAddressProvider(address:)` 또는 repository를 통해 `GET /api/v1/location/geocode?address=`를 호출하고 `AddressCoordinateVo`를 받는다.

호출자가 같은 좌표로 여러 번 호출해도 클라이언트 단에서는 **별도 캐시 없음** — 매번 서버 호출. 서버는 Caffeine 24h 캐시로 흡수.

## 4. 제품 규칙

- 좌표를 주소로 바꾸면 전체 주소와 시/도, 구/군, 동 단위가 나온다(없는 단위는 비어 있을 수 있다). 주소를 좌표로 바꾸면 좌표와 지번, 도로명 주소가 나온다.
- 서버 캐시는 최대 1만 건, 24시간이다. 좌표 키는 소수점 6자리, 주소 키는 앞뒤 공백을 뺀 문자열이다. 외부 장애 응답은 저장하지 않는다. 캐시는 서버마다 따로라 재기동이나 인스턴스가 바뀌면 사라진다.
- 앱은 따로 캐시하지 않는다. 실패 때 보일 문구와 대체 표시(좌표 그대로, 빈 칸, 직접 입력)는 부르는 화면이 정한다. 주소를 고른 뒤 좌표를 못 얻으면 저장하지 못한다(예: 주소 관리).

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 온보딩에서 현재 위치 주소 자동 채움 (현재 연결된 좌표→주소 Happy Path) | 사용자가 위치 권한을 허용하고 현재 GPS 위치를 불러옴 | `reverseGeocodeProvider` 응답 주소가 선택 위치로 반영됨 |
| S1-A | 검색 주소를 좌표로 확정 | 온보딩·프로필 주소 검색 또는 이벤트 장소 주소 입력 | `geocodeAddressProvider`/repository 응답 좌표를 저장·이벤트 파라미터에 사용 |
| S2 | 같은 좌표 재호출 — 캐시 hit (성능 분기) | 시나리오 본문 참조 | 외부 카카오 API 호출 절감 |
| S3 | 좌표 응답 없음 (네거티브, 무인도/바다 등) | 사용자가 좌표를 손으로 입력하거나 바다 위 좌표를 잡음 | 사용자가 다른 위치 선택해야 함 |
| S4 | 카카오 API 장애 (외부 시스템 분기) | 시나리오 본문 참조 | 캐시 미저장. 다음 재시도 시 다시 외부 호출. |
| S5 | 카카오 API 키 미설정 (운영 구성 분기) | 운영에서 `KAKAO_MAPS_API_KEY`가 비어 있음 | 서버는 경고를 남기고 기동은 계속하지만 주소↔좌표 변환 호출은 실패하므로 운영자가 즉시 키를 보충해야 함 |
| S6 | 좌표 소수점 자릿수 차이 (캐시 키 정규화) | 호출자가 다른 자릿수로 호출 | 미세한 좌표 차이는 같은 응답을 사용 (~10cm 정도 단위에서 캐시 공유) |

## 8. Gap / Risk

- **호출 설명 과장 교정**: 기존 문서는 프로필 주소 지도 핀, 이벤트 장소 핀, 지도 long-press가 좌표→주소 API를 호출한다고 기술했지만 현재 Flutter에서 확인되는 reverse-geocode 호출은 온보딩 현재 GPS 한 곳뿐이다.
- **운영 키 fail-open**: `KAKAO_MAPS_API_KEY`가 비어도 서버는 기동한다. 주소 등록과 이벤트 장소 저장은 런타임 지오코딩 실패로 막힐 수 있으므로 배포 전 키 검증과 호출 모니터링이 필요하다.
- **외부 API/인메모리 캐시 의존**: 캐시는 서버 인스턴스별이며 카카오 장애나 재기동 시 보호 범위가 사라진다. 호출 화면별 실패 UX를 별도로 검증해야 한다.

## 9. 수용 기준

- **AC-01. 온보딩 현재 위치 주소 자동 채움**: Given 사용자가 위치 권한을 허용하고 현재 GPS 위치를 얻었을 때 When 온보딩 화면이 reverse geocode를 호출하면 Then 응답 주소와 좌표가 선택 위치에 반영된다
- **AC-01-A. 검색 주소 좌표 확정**: Given 온보딩·프로필·이벤트 화면에서 주소를 선택하거나 입력했을 때 When 주소→좌표 호출이 성공하면 Then 해당 좌표가 저장 또는 이벤트 요청에 사용되고, 실패하면 호출 화면이 저장을 중단한다
- **AC-02. 같은 좌표 재호출 — 캐시 hit (성능 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 외부 카카오 API 호출 절감
- **AC-03. 좌표 응답 없음 (네거티브, 무인도/바다 등)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 위치 선택해야 함
- **AC-04. 카카오 API 장애 (외부 시스템 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 캐시 미저장. 다음 재시도 시 다시 외부 호출.
- **AC-05. 카카오 API 키 미설정 (운영 구성 분기)**: Given 운영에서 `KAKAO_MAPS_API_KEY`가 비어 있을 때 When 서버가 기동하면 Then 보안 설정 경고를 기록하되 기동은 계속하며, 주소↔좌표 호출 실패가 예상되므로 운영자가 키를 보충한다
- **AC-06. 좌표 소수점 자릿수 차이 (캐시 키 정규화)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 미세한 좌표 차이는 같은 응답을 사용 (~10cm 정도 단위에서 캐시 공유)
