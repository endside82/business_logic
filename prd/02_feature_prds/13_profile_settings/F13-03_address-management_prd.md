# F13-03. 다중 주소 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/13_profile_settings/F13-03_address-management -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/13_profile_settings/F13-03_address-management`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

다중 주소 관리는 로그인 사용자가 집/회사/기타 생활권 주소를 등록하고 기본 주소를 지정하는 기능이다. 서버는 사용자별 최대 10개 주소를 허용하며, `HOME`과 `WORK`는 사용자별 중복을 막고 `CUSTOM`은 여러 건 등록할 수 있게 처리한다. 주소 검색이나 지오코딩은 서버 컨트롤러에 없고, 클라이언트가 주소 문자열과 좌표 값을 전달한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `주소 관리` 메뉴를 탭해 주소 목록 화면으로 진입한다.
- 목록의 `+` 버튼은 주소 추가 화면으로 이동한다.
- 주소 카드의 `수정` 버튼은 같은 폼 화면을 수정 모드로 연다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/13_profile_settings/F13-03_address-management/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/13_profile_settings/F13-03_address-management/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/13_profile_settings/F13-03_address-management/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/13_profile_settings/F13-03_address-management/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java:28` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java:34` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java:41` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java:49` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java:57` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 목록 진입: `addressListNotifierProvider` ▶ 주소 목록 조회 ▶ `GET /api/v1/users/me/addresses`.
2. 기본 주소 설정: `addressListNotifierProvider.notifier.updateAddress(id, UserAddressModParam(isDefault: true))` ▶ `PUT /api/v1/users/me/addresses/{id}`.
3. 삭제: 삭제 다이얼로그 확인 ▶ `addressListNotifierProvider.notifier.deleteAddress(id)` ▶ `DELETE /api/v1/users/me/addresses/{id}`.
4. 추가 화면 저장: `createAddress(UserAddressAddRequest(...))` ▶ `POST /api/v1/users/me/addresses`.
5. 수정 화면 저장: `updateAddress(addressId, UserAddressModParam(...))` ▶ `PUT /api/v1/users/me/addresses/{id}`.
6. provider 내부 repository/Retrofit 파일은 허용 탐색 범위 밖이라 정확한 repository 메서드명은 `(미확인)`.

## 4. 서버 계약

### 개요

다중 주소 관리는 로그인 사용자가 집/회사/기타 생활권 주소를 등록하고 기본 주소를 지정하는 기능이다. 서버는 사용자별 최대 10개 주소를 허용하며, `HOME`과 `WORK`는 사용자별 중복을 막고 `CUSTOM`은 여러 건 등록할 수 있게 처리한다. 주소 검색이나 지오코딩은 서버 컨트롤러에 없고, 클라이언트가 주소 문자열과 좌표 값을 전달한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/users/me/addresses` | `UserAddressController#getAddresses` | required | 내 주소 목록 조회 |
| GET | `/api/v1/users/me/addresses/{addressId}` | `UserAddressController#getAddress` | required | 내 주소 단건 조회 |
| POST | `/api/v1/users/me/addresses` | `UserAddressController#createAddress` | required | 주소 추가 |
| PUT | `/api/v1/users/me/addresses/{addressId}` | `UserAddressController#updateAddress` | required | 주소 수정 및 기본 주소 변경 |
| DELETE | `/api/v1/users/me/addresses/{addressId}` | `UserAddressController#deleteAddress` | required | 주소 삭제 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `AddressType`: `HOME`, `WORK`, `CUSTOM`
- **Entity** `UserAddress`: 테이블 `user_address`
  - `id: Long`
  - `userId: Long`
  - `addressType: AddressType`
  - `label: String`
  - `address: String`
  - `addressDetail: String`
  - `latitude: Double`
  - `longitude: Double`
  - `isDefault: boolean`
  - `createdAt`, `updatedAt`
- **한도**: `MAX_ADDRESS_COUNT = 10`

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 위치 추천이나 배송/정산에서 기본 주소를 사용할 수 있으나 account 코드 내 직접 호출은 없음.
- 외부:
  - 다음 우편번호 검색은 Flutter UI helper에서 사용. 서버에는 우편번호 검색/지오코딩 endpoint가 없음.
  - 좌표 산출 방식은 현재 서버에서 확인되지 않음. 클라이언트는 좌표가 없으면 `0.0`을 전달할 수 있다.

## 5. 프론트 계약

### 진입 경로

- 마이페이지 허브에서 `주소 관리` 메뉴를 탭해 주소 목록 화면으로 진입한다.
- 목록의 `+` 버튼은 주소 추가 화면으로 이동한다.
- 주소 카드의 `수정` 버튼은 같은 폼 화면을 수정 모드로 연다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/profile/addresses` | `profile/screens/address_list_screen.dart` | 주소 목록, 기본 설정, 삭제 |
| `/profile/addresses/add` | `profile/screens/address_form_screen.dart` | 주소 추가 |
| `/profile/addresses/edit?id={id}` | `profile/screens/address_form_screen.dart` | 주소 수정 |

### 화면별 구성 요소 & 액션

### 주소 관리 (`address_list_screen.dart`)
- **사용자가 보는 것**:
  - 앱바 제목 `주소 관리`
  - 주소 개수가 10개 미만일 때 앱바 `+` 아이콘
  - 등록 주소가 없을 때 `AppEmptyState`
  - 주소 카드별 라벨 아이콘, 라벨명, `기본` 배지, 기본 주소, 상세 주소
  - 기본 주소가 아닌 카드의 `기본설정` 버튼
  - `수정`, `삭제` 버튼
  - `주소는 최대 10개까지 등록할 수 있습니다.` 안내 문구
- **사용자가 할 수 있는 액션**:
  - `+` 탭 ▶ `/profile/addresses/add`
  - `수정` 탭 ▶ `/profile/addresses/edit?id={address.id}`
  - `기본설정` 탭 ▶ `addressListNotifierProvider.notifier.updateAddress(id, UserAddressModParam(isDefault: true))`
  - `삭제` 탭 ▶ 기본 주소면 클라 차단 토스트, 일반 주소면 확인 다이얼로그 후 delete
  - 에러 상태의 재시도 ▶ `ref.invalidate(addressListNotifierProvider)`
- **상태 분기**:
  - 로딩: 중앙 `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError`
  - 빈 목록: `AppEmptyState(title: '등록된 주소가 없습니다')`
  - 10개 도달: 앱바 추가 버튼 숨김
- **모달/시트/네비게이션**:
  - 삭제 확인 `AlertDialog`
  - 삭제 성공 토스트 `주소가 삭제되었습니다`
  - 기본 설정 성공 토스트 `기본 주소로 설정되었습니다`

### 주소 추가/수정 (`address_form_screen.dart`)
- **사용자가 보는 것**:
  - 앱바 제목 `주소 추가` 또는 `주소 수정`
  - 앱바 우측 `저장` 텍스트 액션
  - 하단 고정 `저장` primary 버튼
  - 라벨 칩 `집`, `회사`, `기타`
  - 기타 선택 시 라벨명 입력
  - 주소 읽기 전용 입력과 `검색` 버튼
  - 상세 주소 입력
  - 기본 주소 설정 `Switch`
- **사용자가 할 수 있는 액션**:
  - 라벨 칩 선택 ▶ `AddressType.home/work/custom` 변경
  - 검색 탭 ▶ `DaumPostcodeSearch.show(context)`
  - 주소 선택 ▶ 주소 문자열 입력, 좌표가 없으면 `0.0` 기본값 설정
  - 저장 탭(추가) ▶ `createAddress(UserAddressAddRequest)`
  - 저장 탭(수정) ▶ `updateAddress(addressId, UserAddressModParam)`
- **상태 분기**:
  - `_isValid`: 주소 문자열과 latitude/longitude가 있어야 저장 가능
  - `_isSaving`: 버튼 로딩 및 저장 중 상태
  - 저장 성공: `주소가 추가되었습니다` 또는 `주소가 수정되었습니다` 토스트 후 pop
  - 저장 실패: `저장에 실패했습니다` 오류 토스트
- **모달/시트/네비게이션**:
  - 다음 우편번호 검색 WebView/위젯은 `DaumPostcodeSearch.show` 내부 동작. 상세 구현은 profile 범위 밖.
  - 수정 모드 기존 값은 `addressListNotifierProvider`의 현재 목록에서 찾아 prefill한다.

### API 호출 순서 (Provider/Repository 관점)

1. 목록 진입: `addressListNotifierProvider` ▶ 주소 목록 조회 ▶ `GET /api/v1/users/me/addresses`.
2. 기본 주소 설정: `addressListNotifierProvider.notifier.updateAddress(id, UserAddressModParam(isDefault: true))` ▶ `PUT /api/v1/users/me/addresses/{id}`.
3. 삭제: 삭제 다이얼로그 확인 ▶ `addressListNotifierProvider.notifier.deleteAddress(id)` ▶ `DELETE /api/v1/users/me/addresses/{id}`.
4. 추가 화면 저장: `createAddress(UserAddressAddRequest(...))` ▶ `POST /api/v1/users/me/addresses`.
5. 수정 화면 저장: `updateAddress(addressId, UserAddressModParam(...))` ▶ `PUT /api/v1/users/me/addresses/{id}`.
6. provider 내부 repository/Retrofit 파일은 허용 탐색 범위 밖이라 정확한 repository 메서드명은 `(미확인)`.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 주소 한도는 현재 클라이언트와 서버 모두 10개다. UI 스펙의 5개 안내는 현재 코드와 불일치한다.
- 기본 주소 삭제 차단은 프론트에서만 확인된다. 서버 delete는 기본 주소 여부를 검사하지 않는다.
- 다음 우편번호 검색은 주소 문자열만 채우고 좌표는 반환하지 않는다고 주석에 명시되어 있다.
- 좌표가 없으면 클라이언트가 `0.0`을 넣어 서버로 보낸다.
- 주소 폼은 zipCode 입력을 제공하지 않고, 서버 Param에도 zipCode가 없다.
- 추가/수정 화면은 앱바 저장과 하단 저장 버튼을 모두 제공한다.
- 수정 화면은 단건 API를 새로 호출하지 않고 목록 provider의 기존 데이터를 사용해 prefill한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 집 주소를 추가하고 기본 주소로 지정한다 | 로그인됨, 등록 주소 10개 미만 | 새 `user_address`가 생성되고, 해당 주소가 기본 주소로 표시된다. |
| S2 | 회사 주소를 기본 주소로 바꾼다 | 집 주소가 기본, 회사 주소가 일반 주소로 등록됨 | 회사 주소가 기본 배지를 갖고 목록 상단에 표시된다. |
| S3 | 기본 주소 삭제를 시도한다 | 삭제하려는 주소가 기본 주소 | 기본 주소는 삭제되지 않는다. |
| S4 | HOME 주소를 중복 추가하려다 실패한다 | 이미 `HOME` 타입 주소가 존재함 | 중복 HOME 주소는 생성되지 않는다. `CUSTOM` 주소 중복 허용 여부는 서버 로직상 허용된다. |
| S5 | 주소 10개에 도달한 사용자가 추가 버튼을 보지 못한다 | 주소 목록 개수 10개 | 사용자는 기존 주소를 수정/삭제해야 새 주소를 추가할 수 있다. |

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
| 후보 | backend.md:35 | - **에러 분기**: 코드상 명시적 주소 없음 에러 없음. 인증 실패는 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:90 | - Bean Validation 실패 응답 형식은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:174 | - 좌표 산출 방식은 현재 서버에서 확인되지 않음. 클라이언트는 좌표가 없으면 `0.0`을 전달할 수 있다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:73 | 6. provider 내부 repository/Retrofit 파일은 허용 탐색 범위 밖이라 정확한 repository 메서드명은 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:76 | - 주소 한도는 현재 클라이언트와 서버 모두 10개다. UI 스펙의 5개 안내는 현재 코드와 불일치한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 집 주소를 추가하고 기본 주소로 지정한다**: Given 로그인됨, 등록 주소 10개 미만 When 사용자가 해당 흐름을 실행하면 Then 새 `user_address`가 생성되고, 해당 주소가 기본 주소로 표시된다.
- **AC-02. 회사 주소를 기본 주소로 바꾼다**: Given 집 주소가 기본, 회사 주소가 일반 주소로 등록됨 When 사용자가 해당 흐름을 실행하면 Then 회사 주소가 기본 배지를 갖고 목록 상단에 표시된다.
- **AC-03. 기본 주소 삭제를 시도한다**: Given 삭제하려는 주소가 기본 주소 When 사용자가 해당 흐름을 실행하면 Then 기본 주소는 삭제되지 않는다.
- **AC-04. HOME 주소를 중복 추가하려다 실패한다**: Given 이미 `HOME` 타입 주소가 존재함 When 사용자가 해당 흐름을 실행하면 Then 중복 HOME 주소는 생성되지 않는다. `CUSTOM` 주소 중복 허용 여부는 서버 로직상 허용된다.
- **AC-05. 주소 10개에 도달한 사용자가 추가 버튼을 보지 못한다**: Given 주소 목록 개수 10개 When 사용자가 해당 흐름을 실행하면 Then 사용자는 기존 주소를 수정/삭제해야 새 주소를 추가할 수 있다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
