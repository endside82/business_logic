# F14-06. 지오코딩 (좌표 ↔ 주소) PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/14_location_directions/F14-06_reverse-geocoding -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-06_reverse-geocoding`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
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

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/14_location_directions/F14-06_reverse-geocoding/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/14_location_directions/F14-06_reverse-geocoding/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/14_location_directions/F14-06_reverse-geocoding/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/14_location_directions/F14-06_reverse-geocoding/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/location/controller/GeocodingController.java` | 확인됨 |
| `community_app/lib/presentation/auth/screens/onboarding_location_screen.dart` | 확인됨 — 좌표→주소와 주소→좌표 |
| `community_app/lib/presentation/profile/screens/address_form_screen.dart` | 확인됨 — 주소→좌표 |
| `community_app/lib/domain/providers/event/event_create_provider.dart` | 확인됨 — 주소→좌표 |
| `community_app/lib/domain/providers/event/event_edit_provider.dart` | 확인됨 — 주소→좌표 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 호출자 화면이 `reverseGeocodeProvider(lat: x, lng: y)` watch
2. Provider 내부에서 `GeocodingRepository.reverseGeocode(lat: x, lng: y)` → `GeocodingApi.reverseGeocode(x, y)` → GET `/api/v1/location/reverse-geocode?lat=x&lng=y`
3. `Result.success(AddressVo)` 또는 `Result.failure(ApiError)` → Provider 가 unwrap 하여 AsyncValue 로 노출
4. 주소→좌표 호출자는 `geocodeAddressProvider(address:)` 또는 repository를 통해 `GET /api/v1/location/geocode?address=`를 호출하고 `AddressCoordinateVo`를 받는다.

호출자가 같은 좌표로 여러 번 호출해도 클라이언트 단에서는 **별도 캐시 없음** — 매번 서버 호출. 서버는 Caffeine 24h 캐시로 흡수.

## 4. 서버 계약

### 개요

좌표→주소와 주소→좌표를 한 컨트롤러에서 제공한다. 좌표 캐시 키는 소수점 6자리, 주소 캐시 키는 trim한 문자열이며 각 캐시는 최대 10,000개·24시간이다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/location/reverse-geocode | GeocodingController#reverseGeocode | (컨트롤러 단계 인증 검사 없음) | 카카오 로컬 API 호출 + Caffeine 캐시 |
| GET | /api/v1/location/geocode | GeocodingController#geocode | (컨트롤러 단계 인증 검사 없음) | `address` 문자열을 카카오 주소검색으로 좌표화 + 별도 Caffeine 캐시 |

### 도메인 모델 / Enum (이 기능 관련)

- **VO** `AddressVo`: `fullAddress, city, district, neighborhood` (모두 nullable String)
- **VO** `AddressCoordinateVo`: `double latitude`, `double longitude`, `String addressName`, `String roadAddressName`
- **External 응답 매핑** (Kakao):
  - `documents[0].address.region_1depth_name` → `city`
  - `documents[0].address.region_2depth_name` → `district`
  - `documents[0].address.region_3depth_name` → `neighborhood`
  - `documents[0].address.address_name` → `fullAddress`
- **Enum**: 본 기능 전용 enum 없음

### 의존 단위 / 외부 시스템

- **External (🟠 카카오 로컬 API)**:
  - URL 템플릿: `https://dapi.kakao.com/v2/local/geo/coord2address.json?x={lng}&y={lat}`
  - 주소검색 URL: `https://dapi.kakao.com/v2/local/search/address.json?query={address}`
  - 키: `${kakao.maps.api-key}` (Spring `@Value`)
  - 인증: `Authorization: KakaoAK {key}` 헤더
- **External (🟠 Caffeine 캐시)**: 인-메모리, 프로세스 단위 (멀티 인스턴스 환경에서는 인스턴스마다 별도 캐시)
- **다른 단위**: 본 단위 내 다른 기능에서는 직접 호출하지 않으나, 일반적으로 주소 등록(Unit 13 account UserAddress) / 위치 선택 화면(Unit 03 event 생성) 등에서 좌표 → 주소 라벨 표시 보조 호출

## 5. 프론트 계약

### 진입 경로

본 단위에는 전용 화면이 없다. 현재 확인된 호출자는 다음뿐이다.

- 온보딩 위치 화면 — 현재 GPS 좌표→주소, 검색 주소→좌표
- 프로필 주소 폼 — 검색 주소→좌표
- 이벤트 생성 provider — 입력 주소→좌표
- 이벤트 편집 provider — 변경 주소→좌표 후 `newLatitude/newLongitude` 전송

길찾기는 본 API를 직접 호출하지 않으며, 지도 핀 이동·long-press·이벤트 핀의 좌표→주소 호출도 현재 연결되어 있지 않다.

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| (자기 도메인 라우트 없음) | — | 본 단위 전용 화면 없음 |

도메인 자산:
- API: `community_app/lib/data/api/geocoding_api.dart`
- Repository: `community_app/lib/data/repositories/geocoding_repository.dart`
- Provider: `community_app/lib/domain/providers/location/geocoding_provider.dart`
- Model: `community_app/lib/data/models/location/address_vo.dart`

### 화면별 구성 요소 & 액션

화면이 없으므로 본 단위는 **호출 인터페이스** 만 정의한다. 호출자(다른 화면) 가 다음 패턴으로 사용:

```dart
final addressAsync = ref.watch(reverseGeocodeProvider(lat: 37.5012, lng: 127.0396));
addressAsync.when(
  data: (addr) => Text(addr.fullAddress ?? '-'),
  loading: () => const SkeletonLoader(),
  error: (e, _) => Text('주소를 찾을 수 없습니다'),
);
```

- **Provider**: `reverseGeocodeProvider` (Family, lat/lng 명명 인자) → `GeocodingRepository.reverseGeocode(lat, lng)` → `GET /api/v1/location/reverse-geocode?lat=&lng=`
- **Provider**: `geocodeAddressProvider` (Family, address 명명 인자) → `GeocodingRepository.geocodeAddress(address)` → `GET /api/v1/location/geocode?address=`
- **응답 표시**: 호출자 화면이 `fullAddress` 또는 `city/district/neighborhood` 결합으로 표시
- **상태 분기 (호출자 책임)**:
  - 로딩: `SkeletonLoader` 또는 `CircularProgressIndicator`
  - 에러: 호출자가 토스트/대체 텍스트 처리. 본 단위 자체는 토스트 없음.
  - 좌표 입력 무효: 호출자가 lat/lng 유효성 검사

### API 호출 순서 (Provider/Repository 관점)

1. 호출자 화면이 `reverseGeocodeProvider(lat: x, lng: y)` watch
2. Provider 내부에서 `GeocodingRepository.reverseGeocode(lat: x, lng: y)` → `GeocodingApi.reverseGeocode(x, y)` → GET `/api/v1/location/reverse-geocode?lat=x&lng=y`
3. `Result.success(AddressVo)` 또는 `Result.failure(ApiError)` → Provider 가 unwrap 하여 AsyncValue 로 노출
4. 주소 입력 호출자는 `geocodeAddressProvider(address:)` 또는 repository로 주소를 좌표화하고 `AddressCoordinateVo`를 저장/일정변경 파라미터에 사용

호출자가 같은 좌표로 여러 번 호출해도 클라이언트 단에서는 **별도 캐시 없음** — 매번 서버 호출. 서버는 Caffeine 24h 캐시로 흡수.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 클라이언트 단 캐시 정책: **없음** (호출자가 필요 시 직접 캐시)
- 좌표 정밀도: 호출자가 결정 (서버는 소수점 6자리로 캐시 키 정규화)
- 디바운스: 호출자가 결정한다. 현재 확인된 호출부에는 지도 long-press 흐름이 없다.
- 에러 표기 문구: 호출자 책임 (스펙 추천: "주소를 찾을 수 없습니다")
- 부분 응답 처리: `fullAddress` 만 표시할지, `city/district/neighborhood` 결합 표시할지는 호출자 결정
- 호출자가 결정해야 할 fallback: 응답 실패 시 좌표 텍스트("37.5012, 127.0396") 그대로 노출 vs 빈 라벨 vs 사용자에게 직접 입력 유도
- 본 단위에는 GoRouter 라우트, 화면 위젯, 토스트, 다이얼로그가 모두 없음

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

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
