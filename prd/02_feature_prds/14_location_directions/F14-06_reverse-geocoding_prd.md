# F14-06. 역지오코딩 (좌표 → 주소) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/14_location_directions/F14-06_reverse-geocoding -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-06_reverse-geocoding`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

위/경도 좌표 페어를 한국식 주소 문자열(`fullAddress`, `city/district/neighborhood`)로 변환하는 보조 인프라 API. 본 단위에서 화면을 직접 갖지 않으며, 다른 화면(주소 검색/등록, 길찾기 출발지 선택 등) 이 좌표를 표시할 때 호출하는 lookup 용도. 외부 지오코딩은 카카오 로컬 API(`https://dapi.kakao.com/v2/local/geo/coord2address.json`)를 호출하며, Caffeine 인-메모리 캐시(최대 10,000 키, 24h TTL) 로 같은 좌표 재호출을 흡수한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

본 단위에는 전용 화면이 없다. 다른 단위 화면이 좌표를 사용자에게 보여줄 때 호출하는 보조 API:

- 주소 등록/편집 (Unit 13) — 사용자가 지도에서 위치 선택 후 좌표 → 주소 변환
- 이벤트 생성/편집 (Unit 03) — 모임 장소 좌표 → 주소 자동 입력
- 길찾기 (F14-05) 의 도착지 표시 — 백엔드는 이미 `event.address` 를 주는 구조라 본 API 직접 호출은 불필요
- 지도 long-press 시점에 라벨 lookup

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
| `community_api/src/main/java/com/endside/community/location/controller/GeocodingController.java:23` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 호출자 화면이 `reverseGeocodeProvider(lat: x, lng: y)` watch
2. Provider 내부에서 `GeocodingRepository.reverseGeocode(lat: x, lng: y)` → `GeocodingApi.reverseGeocode(x, y)` → GET `/api/v1/location/reverse-geocode?lat=x&lng=y`
3. `Result.success(AddressVo)` 또는 `Result.failure(ApiError)` → Provider 가 unwrap 하여 AsyncValue 로 노출

호출자가 같은 좌표로 여러 번 호출해도 클라이언트 단에서는 **별도 캐시 없음** — 매번 서버 호출. 서버는 Caffeine 24h 캐시로 흡수.

## 4. 서버 계약

### 개요

위/경도 좌표 페어를 한국식 주소 문자열(`fullAddress`, `city/district/neighborhood`)로 변환하는 보조 인프라 API. 본 단위에서 화면을 직접 갖지 않으며, 다른 화면(주소 검색/등록, 길찾기 출발지 선택 등) 이 좌표를 표시할 때 호출하는 lookup 용도. 외부 지오코딩은 카카오 로컬 API(`https://dapi.kakao.com/v2/local/geo/coord2address.json`)를 호출하며, Caffeine 인-메모리 캐시(최대 10,000 키, 24h TTL) 로 같은 좌표 재호출을 흡수한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/location/reverse-geocode | GeocodingController#reverseGeocode | (컨트롤러 단계 인증 검사 없음) | 카카오 로컬 API 호출 + Caffeine 캐시 |

### 도메인 모델 / Enum (이 기능 관련)

- **VO** `AddressVo`: `fullAddress, city, district, neighborhood` (모두 nullable String)
- **External 응답 매핑** (Kakao):
  - `documents[0].address.region_1depth_name` → `city`
  - `documents[0].address.region_2depth_name` → `district`
  - `documents[0].address.region_3depth_name` → `neighborhood`
  - `documents[0].address.address_name` → `fullAddress`
- **Enum**: 본 기능 전용 enum 없음

### 의존 단위 / 외부 시스템

- **External (🟠 카카오 로컬 API)**:
  - URL 템플릿: `https://dapi.kakao.com/v2/local/geo/coord2address.json?x={lng}&y={lat}`
  - 키: `${kakao.maps.api-key}` (Spring `@Value`)
  - 인증: `Authorization: KakaoAK {key}` 헤더
- **External (🟠 Caffeine 캐시)**: 인-메모리, 프로세스 단위 (멀티 인스턴스 환경에서는 인스턴스마다 별도 캐시)
- **다른 단위**: 본 단위 내 다른 기능에서는 직접 호출하지 않으나, 일반적으로 주소 등록(Unit 13 account UserAddress) / 위치 선택 화면(Unit 03 event 생성) 등에서 좌표 → 주소 라벨 표시 보조 호출

## 5. 프론트 계약

### 진입 경로

본 단위에는 전용 화면이 없다. 다른 단위 화면이 좌표를 사용자에게 보여줄 때 호출하는 보조 API:

- 주소 등록/편집 (Unit 13) — 사용자가 지도에서 위치 선택 후 좌표 → 주소 변환
- 이벤트 생성/편집 (Unit 03) — 모임 장소 좌표 → 주소 자동 입력
- 길찾기 (F14-05) 의 도착지 표시 — 백엔드는 이미 `event.address` 를 주는 구조라 본 API 직접 호출은 불필요
- 지도 long-press 시점에 라벨 lookup

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
- **응답 표시**: 호출자 화면이 `fullAddress` 또는 `city/district/neighborhood` 결합으로 표시
- **상태 분기 (호출자 책임)**:
  - 로딩: `SkeletonLoader` 또는 `CircularProgressIndicator`
  - 에러: 호출자가 토스트/대체 텍스트 처리. 본 단위 자체는 토스트 없음.
  - 좌표 입력 무효: 호출자가 lat/lng 유효성 검사

### API 호출 순서 (Provider/Repository 관점)

1. 호출자 화면이 `reverseGeocodeProvider(lat: x, lng: y)` watch
2. Provider 내부에서 `GeocodingRepository.reverseGeocode(lat: x, lng: y)` → `GeocodingApi.reverseGeocode(x, y)` → GET `/api/v1/location/reverse-geocode?lat=x&lng=y`
3. `Result.success(AddressVo)` 또는 `Result.failure(ApiError)` → Provider 가 unwrap 하여 AsyncValue 로 노출

호출자가 같은 좌표로 여러 번 호출해도 클라이언트 단에서는 **별도 캐시 없음** — 매번 서버 호출. 서버는 Caffeine 24h 캐시로 흡수.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 클라이언트 단 캐시 정책: **없음** (호출자가 필요 시 직접 캐시)
- 좌표 정밀도: 호출자가 결정 (서버는 소수점 6자리로 캐시 키 정규화)
- 디바운스: 호출자가 결정 (예: 지도 long-press 후 300~500ms 디바운스 권장)
- 에러 표기 문구: 호출자 책임 (스펙 추천: "주소를 찾을 수 없습니다")
- 부분 응답 처리: `fullAddress` 만 표시할지, `city/district/neighborhood` 결합 표시할지는 호출자 결정
- 호출자가 결정해야 할 fallback: 응답 실패 시 좌표 텍스트("37.5012, 127.0396") 그대로 노출 vs 빈 라벨 vs 사용자에게 직접 입력 유도
- 본 단위에는 GoRouter 라우트, 화면 위젯, 토스트, 다이얼로그가 모두 없음

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 주소 등록 화면에서 지도 마커 이동 후 라벨 자동 채움 (Happy Path 호출자) | 지도에 핀이 표시된 주소 등록 화면 | 입력 필드에 한국식 주소 노출, 사용자는 그대로 저장하거나 수정 |
| S2 | 같은 좌표 재호출 — 캐시 hit (성능 분기) | 시나리오 본문 참조 | 외부 카카오 API 호출 절감 |
| S3 | 좌표 응답 없음 (네거티브, 무인도/바다 등) | 사용자가 좌표를 손으로 입력하거나 바다 위 좌표를 잡음 | 사용자가 다른 위치 선택해야 함 |
| S4 | 카카오 API 장애 (외부 시스템 분기) | 시나리오 본문 참조 | 캐시 미저장. 다음 재시도 시 다시 외부 호출. |
| S5 | 카카오 API 키 미설정 (개발/스테이징 분기) | 환경 변수 `kakao.maps.api-key` 가 빈 문자열인 환경 | 운영자가 환경변수 보충 필요 |
| S6 | 좌표 소수점 자릿수 차이 (캐시 키 정규화) | 호출자가 다른 자릿수로 호출 | 미세한 좌표 차이는 같은 응답을 사용 (~10cm 정도 단위에서 캐시 공유) |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. 주소 등록 화면에서 지도 마커 이동 후 라벨 자동 채움 (Happy Path 호출자)**: Given 지도에 핀이 표시된 주소 등록 화면 When 사용자가 해당 흐름을 실행하면 Then 입력 필드에 한국식 주소 노출, 사용자는 그대로 저장하거나 수정
- **AC-02. 같은 좌표 재호출 — 캐시 hit (성능 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 외부 카카오 API 호출 절감
- **AC-03. 좌표 응답 없음 (네거티브, 무인도/바다 등)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 다른 위치 선택해야 함
- **AC-04. 카카오 API 장애 (외부 시스템 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 캐시 미저장. 다음 재시도 시 다시 외부 호출.
- **AC-05. 카카오 API 키 미설정 (개발/스테이징 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 운영자가 환경변수 보충 필요
- **AC-06. 좌표 소수점 자릿수 차이 (캐시 키 정규화)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 미세한 좌표 차이는 같은 응답을 사용 (~10cm 정도 단위에서 캐시 공유)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
