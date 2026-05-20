# F12-05. FCM 디바이스 토큰 등록 & 기기 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/12_notification/F12-05_device-token-management -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/12_notification/F12-05_device-token-management`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 다수의 단말(폰/태블릿)에서 동일 계정으로 푸시를 받을 수 있도록 FCM 디바이스 토큰의 등록·갱신·해제·조회 라이프사이클을 관리한다. 클라이언트는 앱 실행 시 `getToken()`으로 받은 FCM 토큰을 서버에 POST 등록하고, 토큰 갱신 콜백 발생 시 PUT으로 atomic 교체하며, 로그아웃 시 token 문자열로 DELETE한다. 사용자는 별도 "기기 관리" 화면에서 등록된 단말 목록을 조회하고 deviceId로 개별 단말을 삭제할 수 있다. 실제 FCM HTTP API 호출은 본 단위 도메인의 `FcmService`가 수행하며, 본 단위는 토큰 자체의 라이프사이클만 책임진다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

본 단위는 두 가지 흐름이 공존한다:
1. **자동 흐름 (UI 없음)**: `PushNotificationService.initialize`가 앱 시작 시 자동 실행. 권한 요청 → 토큰 획득 → 서버 POST. 토큰 갱신 콜백도 자동.
2. **사용자 흐름**: 프로필 > 기기 관리 → `/profile/devices` (`Routes.profileDeviceManagement = 'devices'`) — `DeviceManagementScreen`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/12_notification/F12-05_device-token-management/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/12_notification/F12-05_device-token-management/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/12_notification/F12-05_device-token-management/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/12_notification/F12-05_device-token-management/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java:33` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java:41` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java:49` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java:57` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **앱 시작 시 (자동)**:
   - `pushNotificationServiceProvider` 초기화 → `initialize()`
   - `FirebaseMessaging.requestPermission` → 권한 다이얼로그 (OS)
   - `getToken()` → 토큰 문자열
   - `_sendTokenToServer(token)` → `notificationRepository.registerDeviceToken(DeviceTokenParam(token, deviceType))` ▶ `POST /api/v1/device-tokens`
   - 결과는 logger 출력 (UI 변화 없음)

2. **토큰 갱신 시 (자동)**:
   - `onTokenRefresh.listen(_onTokenRefresh)` 콜백 발생
   - 이전 토큰이 있으면: `notificationRepository.refreshDeviceToken(DeviceTokenRefreshParam(oldToken, newToken))` ▶ `PUT /api/v1/device-tokens/token`
   - 실패 시 fallback: `_sendTokenToServer(newToken)` → POST 재시도
   - 이전 토큰이 없으면: 바로 POST

3. **로그아웃 시 (자동)**:
   - `unregisterToken()` → `notificationRepository.removeDeviceToken(token)` ▶ `DELETE /api/v1/device-tokens?token=...`

4. **기기 관리 화면 진입 시**:
   - `deviceManagementNotifierProvider.build()` ▶ `NotificationRepository.getMyDevices()` ▶ `GET /api/v1/device-tokens`
   - 응답 `List<DeviceTokenVo>` (id, deviceType, active, createdAt) 노출

5. **기기 삭제 시**:
   - 다이얼로그 확인 → `deviceManagementNotifierProvider.notifier.removeDevice(deviceId)` ▶ `NotificationRepository.removeDevice(deviceId)` ▶ `DELETE /api/v1/device-tokens/{deviceId}`
   - 성공: state에서 해당 device 제거(client-side filter), 토스트
   - 실패: state 유지, 에러 토스트

## 4. 서버 계약

### 개요

사용자가 다수의 단말(폰/태블릿)에서 동일 계정으로 푸시를 받을 수 있도록 FCM 디바이스 토큰의 등록·갱신·해제·조회 라이프사이클을 관리한다. 클라이언트는 앱 실행 시 `getToken()`으로 받은 FCM 토큰을 서버에 POST 등록하고, 토큰 갱신 콜백 발생 시 PUT으로 atomic 교체하며, 로그아웃 시 token 문자열로 DELETE한다. 사용자는 별도 "기기 관리" 화면에서 등록된 단말 목록을 조회하고 deviceId로 개별 단말을 삭제할 수 있다. 실제 FCM HTTP API 호출은 본 단위 도메인의 `FcmService`가 수행하며, 본 단위는 토큰 자체의 라이프사이클만 책임진다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/device-tokens | DeviceTokenController#getMyDevices | required | 내 활성 기기 목록 조회 |
| POST | /api/v1/device-tokens | DeviceTokenController#registerToken | required | 신규 FCM 토큰 등록 |
| PUT | /api/v1/device-tokens/token | DeviceTokenController#refreshToken | required | onTokenRefresh 시 기존→새 토큰 atomic 교체 |
| DELETE | /api/v1/device-tokens/{deviceId} | DeviceTokenController#removeDevice | required | 특정 deviceId 비활성화 (기기 관리 화면) |
| DELETE | /api/v1/device-tokens?token=xxx | DeviceTokenController#removeToken | required | 토큰 문자열로 비활성화 (로그아웃 시) |

### 도메인 모델 / Enum (이 기능 관련)

### `DeviceToken` 엔티티 (`device_token` 테이블)
- 핵심 필드:
  - `id: Long` PK
  - `userId: Long` (소유자)
  - `token: String` (FCM token, unique)
  - `deviceType: String` ("IOS"/"ANDROID"/"WEB"/"UNKNOWN")
  - `isActive: boolean` (deactivate 시 false)
  - `lastUsedAt: LocalDateTime` (`FcmService` 발송 성공 시 갱신)
  - `createdAt`/`updatedAt` (auditing)
- 메서드 `deactivate()`: `isActive=false` 단축

### deviceType 값 (서버는 String으로 받지만 클라가 보내는 정해진 값)
- 클라 `_resolveDeviceType()`: `kIsWeb`→`WEB`, `Platform.isIOS`→`IOS`, `Platform.isAndroid`→`ANDROID`, 그 외 `UNKNOWN`

### 의존 단위 / 외부 시스템

- **이 토큰을 사용하는 흐름**: `notification.service.FcmService#sendToUser`가 `deviceTokenRepository.findByUserIdAndIsActiveTrue(userId)`로 활성 토큰 다건을 조회 → 각 토큰에 대해 FCM HTTP API 호출
- **외부**:
  - 🟠 **Firebase Cloud Messaging** (`FirebaseMessaging.send`/`sendEachForMulticast`) — 본 단위 자체는 직접 호출 안 함. 발급된 토큰은 `FcmService`가 사용
  - 🟠 **Firebase SDK (클라)** — 클라이언트가 `getToken`/`onTokenRefresh`로 토큰 발급. 본 단위 백엔드 외부 의존
- **이 단위가 호출되는 흐름**:
  - 앱 시작 시 `PushNotificationService.initialize` → 권한 요청 → `getToken` → POST 등록
  - `onTokenRefresh` 콜백 → PUT 갱신
  - 로그아웃 → DELETE token=
  - 기기 관리 화면에서 사용자 액션 → DELETE {deviceId}

## 5. 프론트 계약

### 진입 경로

본 단위는 두 가지 흐름이 공존한다:
1. **자동 흐름 (UI 없음)**: `PushNotificationService.initialize`가 앱 시작 시 자동 실행. 권한 요청 → 토큰 획득 → 서버 POST. 토큰 갱신 콜백도 자동.
2. **사용자 흐름**: 프로필 > 기기 관리 → `/profile/devices` (`Routes.profileDeviceManagement = 'devices'`) — `DeviceManagementScreen`

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/profile/.../devices` | `presentation/notification/screens/device_management_screen.dart` | 등록된 기기 카드 목록 + 개별 삭제 |
| (라우트 없음) | `core/services/push_notification_service.dart` | 토큰 자동 등록/갱신/해제 |

### 화면별 구성 요소 & 액션

### 기기 관리 (`device_management_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '기기 관리 (N)' or '기기 관리', showBackButton: true)` — 카운트가 있으면 제목에 N 노출
  - `ListView.separated`(`AppSpacing.screenPadding`) 안 `_DeviceCard` 리스트
  - 각 카드:
    - 좌측 44x44 둥근 박스 안 아이콘 (`Icons.phone_iphone` 또는 `Icons.phone_android`, deviceType 기반)
    - "iOS 기기" / "Android 기기" 텍스트 (body1Medium primary)
    - 등록일 caption ("등록일: YYYY.MM.DD")
    - 우측 `AppButton(label: '삭제', variant: ButtonVariant.ghost, size: ButtonSize.sm)`
  - 카드 사이 간격 `AppSpacing.space3`
- **사용자가 할 수 있는 액션**:
  - "삭제" 버튼 ▶ `_confirmRemove`:
    - `AppDialog.confirm(title: '기기 삭제', message: '이 기기를 알림 수신 목록에서 삭제하시겠습니까?\n해당 기기에서는 더 이상 푸시 알림을 받지 않습니다.', confirmLabel: '삭제', cancelLabel: '취소', isDangerous: true)`
    - 확인 시 ▶ `removeDevice(device.id)` ▶ `DELETE /api/v1/device-tokens/{deviceId}`
    - 성공: `AppToast.show('기기가 삭제되었습니다')`
    - 실패: `AppToast.show('삭제에 실패했습니다', type: ToastType.error)`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator()`
  - 에러: `AppErrorState(title: '기기 목록을 불러올 수 없습니다', onRetry: ...)`
  - 빈 상태: `AppEmptyState(title: '등록된 기기가 없습니다', description: '여기에 나타나는 기기들에서만 푸시 알림을 받을 수 있습니다.')`
- **모달/시트/네비게이션**: 삭제 확인 다이얼로그(`AppDialog.confirm`, danger 빨강 강조)

### 자동 토큰 라이프사이클 (`PushNotificationService`)
- 화면 없음. 앱 시작 시 (예: `app.dart` 초기화 단계 또는 인증 후) `PushNotificationService.initialize()` 호출
- 단계:
  1. `Firebase.initializeApp()` (이미 init 시 skip)
  2. `FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler)` 등록
  3. `requestPermission(alert, badge, sound, provisional: false)` — 사용자 권한 요청 다이얼로그
  4. `FirebaseMessaging.instance.getToken()` → 서버 POST `/api/v1/device-tokens` (`DeviceTokenParam(token, deviceType)`)
  5. `onTokenRefresh.listen` → PUT `/api/v1/device-tokens/token` (`oldToken, newToken`)
  6. `onMessage.listen` → 포그라운드 메시지 → 인앱 배너
  7. `getInitialMessage` (terminated→오픈) + `onMessageOpenedApp` (background→오픈) → 알림 탭 시 데이터 콜백 → `NotificationRouter.resolve(...)` → `router.go(path)`
  8. **로그아웃 시**: `unregisterToken()` → `DELETE /api/v1/device-tokens?token=xxx`
- 권한 거부 / Firebase 미설정 / 토큰 null인 경우는 `logger.w`로 경고만 출력하고 silent fail (앱 동작은 유지)

### API 호출 순서 (Provider/Repository 관점)

1. **앱 시작 시 (자동)**:
   - `pushNotificationServiceProvider` 초기화 → `initialize()`
   - `FirebaseMessaging.requestPermission` → 권한 다이얼로그 (OS)
   - `getToken()` → 토큰 문자열
   - `_sendTokenToServer(token)` → `notificationRepository.registerDeviceToken(DeviceTokenParam(token, deviceType))` ▶ `POST /api/v1/device-tokens`
   - 결과는 logger 출력 (UI 변화 없음)

2. **토큰 갱신 시 (자동)**:
   - `onTokenRefresh.listen(_onTokenRefresh)` 콜백 발생
   - 이전 토큰이 있으면: `notificationRepository.refreshDeviceToken(DeviceTokenRefreshParam(oldToken, newToken))` ▶ `PUT /api/v1/device-tokens/token`
   - 실패 시 fallback: `_sendTokenToServer(newToken)` → POST 재시도
   - 이전 토큰이 없으면: 바로 POST

3. **로그아웃 시 (자동)**:
   - `unregisterToken()` → `notificationRepository.removeDeviceToken(token)` ▶ `DELETE /api/v1/device-tokens?token=...`

4. **기기 관리 화면 진입 시**:
   - `deviceManagementNotifierProvider.build()` ▶ `NotificationRepository.getMyDevices()` ▶ `GET /api/v1/device-tokens`
   - 응답 `List<DeviceTokenVo>` (id, deviceType, active, createdAt) 노출

5. **기기 삭제 시**:
   - 다이얼로그 확인 → `deviceManagementNotifierProvider.notifier.removeDevice(deviceId)` ▶ `NotificationRepository.removeDevice(deviceId)` ▶ `DELETE /api/v1/device-tokens/{deviceId}`
   - 성공: state에서 해당 device 제거(client-side filter), 토스트
   - 실패: state 유지, 에러 토스트

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 앱 설치 후 토큰 자동 등록 (Happy Path) | 앱 첫 실행, 로그인 완료 직후 | 단말기로 푸시 수신 가능. 기기 관리 화면 진입 시 1개 기기 노출 |
| S2 | 동일 사용자가 두 단말기 사용 (다중 기기) | 폰에서 이미 토큰 등록된 상태(IOS, deviceId=1) | 두 단말 모두 활성, 양쪽 모두 푸시 수신 |
| S3 | 토큰 갱신 (FCM SDK가 토큰 교체 발급) | 기존 토큰 "fcm_old"로 등록되어 있음 | 토큰 무중단 교체. 기기 목록은 동일하게 1개로 보임 (구 토큰은 isActive=false로 숨겨짐) |
| S4 | 사용자가 기기 관리 화면에서 폰 단말 삭제 | 2개 기기 (구 폰 IOS, 새 폰 IOS) | 구 폰은 푸시 수신 안 함. 새 폰만 1개 활성 |
| S5 | 로그아웃 시 토큰 자동 해제 | 일반 사용자 | 해당 단말은 비활성 — 다음 로그인 시 새로 등록 |
| S6 | 권한 거부 상태에서 initialize | 첫 다이얼로그에서 "허용 안 함" 누른 사용자 | 기기 등록 자체는 완료, OS가 단말로 푸시 차단. 사용자가 시스템 설정에서 권한 다시 켜면 즉시 수신 가능 |
| S7 | 동일 토큰을 다른 사용자가 등록 (드물지만 가능) | userId=A로 등록된 토큰 "fcm_dev"가 있음 | 토큰이 B로 재할당, A로 발송될 일 없음 (서버는 isActive=true만 발송 대상으로 조회) |
| S8 | PUT refreshToken에서 oldToken 소유자 mismatch (방어 케이스) | 클라 변조 / 데이터 손상 | 다른 user의 토큰은 그대로, 요청자에게는 새 토큰 1건 등록됨 (deviceType 보존 못 함) |

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

- **AC-01. 첫 앱 설치 후 토큰 자동 등록 (Happy Path)**: Given 앱 첫 실행, 로그인 완료 직후 When 사용자가 해당 흐름을 실행하면 Then 단말기로 푸시 수신 가능. 기기 관리 화면 진입 시 1개 기기 노출
- **AC-02. 동일 사용자가 두 단말기 사용 (다중 기기)**: Given 폰에서 이미 토큰 등록된 상태(IOS, deviceId=1) When 사용자가 해당 흐름을 실행하면 Then 두 단말 모두 활성, 양쪽 모두 푸시 수신
- **AC-03. 토큰 갱신 (FCM SDK가 토큰 교체 발급)**: Given 기존 토큰 "fcm_old"로 등록되어 있음 When 사용자가 해당 흐름을 실행하면 Then 토큰 무중단 교체. 기기 목록은 동일하게 1개로 보임 (구 토큰은 isActive=false로 숨겨짐)
- **AC-04. 사용자가 기기 관리 화면에서 폰 단말 삭제**: Given 2개 기기 (구 폰 IOS, 새 폰 IOS) When 사용자가 해당 흐름을 실행하면 Then 구 폰은 푸시 수신 안 함. 새 폰만 1개 활성
- **AC-05. 로그아웃 시 토큰 자동 해제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 해당 단말은 비활성 — 다음 로그인 시 새로 등록
- **AC-06. 권한 거부 상태에서 initialize**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 기기 등록 자체는 완료, OS가 단말로 푸시 차단. 사용자가 시스템 설정에서 권한 다시 켜면 즉시 수신 가능
- **AC-07. 동일 토큰을 다른 사용자가 등록 (드물지만 가능)**: Given userId=A로 등록된 토큰 "fcm_dev"가 있음 When 사용자가 해당 흐름을 실행하면 Then 토큰이 B로 재할당, A로 발송될 일 없음 (서버는 isActive=true만 발송 대상으로 조회)
- **AC-08. PUT refreshToken에서 oldToken 소유자 mismatch (방어 케이스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 다른 user의 토큰은 그대로, 요청자에게는 새 토큰 1건 등록됨 (deviceType 보존 못 함)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
