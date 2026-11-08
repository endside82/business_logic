# F12-05. FCM 디바이스 토큰 등록 & 기기 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 다수의 단말(폰/태블릿)에서 동일 계정으로 푸시를 받을 수 있도록 FCM 디바이스 토큰의 등록·갱신·해제·조회 라이프사이클을 관리한다. 클라이언트는 앱 실행 시 `getToken()`으로 받은 FCM 토큰을 서버에 POST 등록하고, 토큰 갱신 콜백 발생 시 PUT으로 atomic 교체하며, 로그아웃 시 token 문자열로 DELETE한다. 사용자는 별도 "기기 관리" 화면에서 등록된 단말 목록을 조회하고 deviceId로 개별 단말을 삭제할 수 있다. 실제 FCM HTTP API 호출은 본 단위 도메인의 `FcmService`가 수행하며, 본 단위는 토큰 자체의 라이프사이클만 책임진다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

본 단위는 두 가지 흐름이 공존한다:
1. **자동 흐름 (UI 없음)**: `PushNotificationService.initialize`가 앱 시작 시 자동 실행. 권한 요청 → 토큰 획득 → 서버 POST. 토큰 갱신 콜백도 자동.
2. **사용자 흐름**: 프로필 > 기기 관리 → `/profile/devices` (`Routes.profileDeviceManagement = 'devices'`) — `DeviceManagementScreen`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DeviceTokenController`, `FcmService`. 앱: `device_management_screen.dart`, `push_notification_service.dart`, `app.dart`.

<!-- source-references:start -->
서버 창구: `DeviceTokenController#getMyDevices`, `DeviceTokenController#registerToken`, `DeviceTokenController#refreshToken`, `DeviceTokenController#removeDevice`, `DeviceTokenController#removeToken`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 한 계정으로 여러 기기에서 푸시를 받는다. 앱이 열릴 때마다 현재 기기의 토큰을 서버에 등록하고, 토큰이 갱신되면 새 토큰으로 바꾼다. 로그아웃하면 그 기기 토큰을 해제한다.
- 토큰은 로그인 세션에 묶인다. 다른 회원이 이미 등록한 토큰을 등록하거나 갱신 대상으로 삼으면 거절되고 그 토큰은 이전 주인 것으로 남는다. 탈퇴 진행 중인 계정은 등록할 수 없다.
- 한 번에 푸시를 보내는 기기는 최대 10대이고, 90일 동안 쓰이지 않은 토큰은 정리된다.
- 알림 권한 요청, 토큰 발급이 실패해도 앱은 조용히 계속 동작한다(푸시만 못 받는다).
- 기기 관리 화면은 프로필에서 들어가고, 기기 종류(iOS 기기 / Android 기기)와 등록일을 보여 준다. 「삭제」 를 누르면 「이 기기를 알림 수신 목록에서 삭제하시겠습니까? 해당 기기에서는 더 이상 푸시 알림을 받지 않습니다.」 확인을 거친다. 남의 기기를 지우려 하면 아무 일도 일어나지 않는다.
- 등록된 기기가 없으면 「등록된 기기가 없습니다 / 여기에 나타나는 기기들에서만 푸시 알림을 받을 수 있습니다」 안내가 나온다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 앱 설치 후 토큰 자동 등록 (Happy Path) | 앱 첫 실행, 로그인 완료 직후 | 단말기로 푸시 수신 가능. 기기 관리 화면 진입 시 1개 기기 노출 |
| S2 | 동일 사용자가 두 단말기 사용 (다중 기기) | 폰에서 이미 토큰 등록된 상태(IOS, deviceId=1) | 두 단말 모두 활성, 양쪽 모두 푸시 수신 |
| S3 | 토큰 갱신 (FCM SDK가 토큰 교체 발급) | 기존 토큰 "fcm_old"로 등록되어 있음 | 토큰 무중단 교체. 기기 목록은 동일하게 1개로 보임 (구 토큰은 isActive=false로 숨겨짐) |
| S4 | 사용자가 기기 관리 화면에서 폰 단말 삭제 | 2개 기기 (구 폰 IOS, 새 폰 IOS) | 구 폰은 푸시 수신 안 함. 새 폰만 1개 활성 |
| S5 | 로그아웃 시 토큰 자동 해제 | 일반 사용자 | 해당 단말은 비활성 — 다음 로그인 시 새로 등록 |
| S6 | 권한 거부 상태에서 initialize | 첫 다이얼로그에서 "허용 안 함" 누른 사용자 | 기기 등록 자체는 완료, OS가 단말로 푸시 차단. 사용자가 시스템 설정에서 권한 다시 켜면 즉시 수신 가능 |
| S7 | 동일 토큰을 다른 사용자가 등록 (드물지만 가능) | userId=A로 등록된 토큰 "fcm_dev"가 있음 | B의 등록은 거절되고 토큰은 A의 것으로 남는다. B의 기기로는 발송되지 않는다 |
| S8 | PUT refreshToken에서 oldToken 소유자 mismatch (방어 케이스) | 클라 변조 / 데이터 손상 | 다른 user의 토큰은 그대로, 요청자에게는 새 토큰 1건 등록됨 (deviceType 보존 못 함) |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 확인 | 발송 실패 운영 복구 여정(서버 몫) | 등록된 토큰으로 간 첫 발송이 영구 실패(`SENDER_ID_MISMATCH`)여도 토큰을 끄지 않고 발송 기록이 실패로 남으며, 운영자가 관리자 화면에서 다시 보내면 수락으로 바뀌는 것을 격리 여정 서버와 관리자 서버를 함께 띄워 확인했다(2026-11-08 밤, 시험용 FCM 대역) | 앱 장면도 만들어(2026-11-08 밤 늦게) 알림함 표시·종류·안 읽음, 누르면 그 모임 상세로 가는 경로, 읽음 저장과 안 읽은 수 감소까지 통과했다. 마지막 확인(상세의 모임 제목)은 장면 쪽을 고쳐 다시 돌린다. 그 과정에서 찾은 웹의 먼 모임 상세 반복 조회는 F03-02 에서 고쳤다(문서 저장소 앞으로 할 일 H-592·H-658) |

## 9. 수용 기준

- **AC-01. 첫 앱 설치 후 토큰 자동 등록 (Happy Path)**: Given 앱 첫 실행, 로그인 완료 직후 When 사용자가 해당 흐름을 실행하면 Then 단말기로 푸시 수신 가능. 기기 관리 화면 진입 시 1개 기기 노출
- **AC-02. 동일 사용자가 두 단말기 사용 (다중 기기)**: Given 폰에서 이미 토큰 등록된 상태(IOS, deviceId=1) When 사용자가 해당 흐름을 실행하면 Then 두 단말 모두 활성, 양쪽 모두 푸시 수신
- **AC-03. 토큰 갱신 (FCM SDK가 토큰 교체 발급)**: Given 기존 토큰 "fcm_old"로 등록되어 있음 When 사용자가 해당 흐름을 실행하면 Then 토큰 무중단 교체. 기기 목록은 동일하게 1개로 보임 (구 토큰은 isActive=false로 숨겨짐)
- **AC-04. 사용자가 기기 관리 화면에서 폰 단말 삭제**: Given 2개 기기 (구 폰 IOS, 새 폰 IOS) When 사용자가 해당 흐름을 실행하면 Then 구 폰은 푸시 수신 안 함. 새 폰만 1개 활성
- **AC-05. 로그아웃 시 토큰 자동 해제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 해당 단말은 비활성 — 다음 로그인 시 새로 등록
- **AC-06. 권한 거부 상태에서 initialize**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 기기 등록 자체는 완료, OS가 단말로 푸시 차단. 사용자가 시스템 설정에서 권한 다시 켜면 즉시 수신 가능
- **AC-07. 동일 토큰을 다른 사용자가 등록 (드물지만 가능)**: Given userId=A로 등록된 토큰 "fcm_dev"가 있음 When 사용자가 해당 흐름을 실행하면 Then B의 등록은 거절되고 토큰은 A의 것으로 남는다. B의 기기로는 발송되지 않는다
- **AC-08. PUT refreshToken에서 oldToken 소유자 mismatch (방어 케이스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 다른 user의 토큰은 그대로, 요청자에게는 새 토큰 1건 등록됨 (deviceType 보존 못 함)
