# F12-06. 알림 권한 인라인 안내 배너 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

이 기능은 **백엔드 엔드포인트가 없다**. OS 알림 권한이 거부된 사용자가 알림 화면 진입 시점에 비침습적 인라인 배너로 권한 허용을 유도하는 클라이언트 전용 흐름이며, 권한 상태는 OS API(`FirebaseMessaging.getNotificationSettings()`)와 클라이언트 상태(`fcmPermissionNotifierProvider`)로만 관리된다. 권한이 `granted`로 전환되면 후속 단계에서 F12-05의 토큰 등록 흐름이 자연스럽게 이어져 푸시 수신이 활성화된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 알림 화면(`/notifications`) 진입 시 자동 평가 → `FcmPermissionStatus.denied`인 경우에만 상단 배너 노출
- 별도 라우트 없음. 사용자 액션은 배너의 "허용" 텍스트 버튼만

## 2. 코드 위치

계약의 정본은 코드다. 앱: `notification_list_screen.dart`, `fcm_permission_banner.dart`, `fcm_permission_provider.dart`.

## 3. 전체 동작 흐름

본 단위는 자체 백엔드 호출이 없다. 흐름 정리:

1. **알림 화면 진입 시**:
   - `FcmPermissionNotifier.refresh()` ▶ `FirebaseMessaging.getNotificationSettings()` (FCM SDK 로컬 호출)
   - 결과를 `FcmPermissionStatus`로 변환 → state 갱신
   - `denied`일 때만 배너 마운트

2. **사용자가 "허용" 탭**:
   - `requestOrOpenSettings()` ▶ refresh 후 분기:
     - `notDetermined`: `requestPermission()` 다이얼로그 (OS) → 결과 state 갱신
     - `denied`: `Geolocator.openAppSettings()` (설정 화면 진입)

3. **OS 설정에서 권한 토글 후 앱 복귀**:
   - `AppLifecycleState.resumed` 감지 → `refresh()` 자동 호출
   - 권한이 granted로 바뀌었으면 `FcmPermissionStatus.granted`로 전환 → 배너 자동 사라짐
   - 후속: F12-05의 토큰 등록 흐름이 별도로 진행 (권한 granted + 토큰 보유 시 등록)

## 4. 제품 규칙

- 이 기능은 서버와 관계없이 기기의 알림 권한만 본다. 알림 화면에 들어올 때와 설정 화면에서 돌아올 때마다 권한을 다시 확인한다.
- 권한이 거부된 상태일 때만 상단에 「알림이 꺼져 있습니다 / 신청 승인·결제·정산 등 중요 알림을 받으려면 권한을 허용해주세요.」 배너가 보인다. 허용됨, 아직 묻지 않음, 지원하지 않는 환경(웹)에서는 보이지 않는다.
- 「허용」 을 누르면 아직 묻지 않은 상태에서는 시스템 권한 창을, 거부된 상태에서는 기기 설정 화면을 연다. 권한이 허용되면 기기 토큰이 자동으로 등록되어 푸시를 받기 시작한다.
- 권한이 거부된 동안에도 서버는 정상 발송하며 기기가 표시를 막을 뿐이고, 알림함에는 그대로 쌓인다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 권한 미요청(notDetermined) 사용자 — 첫 다이얼로그 노출 (Happy Path) | `FcmPermissionStatus.notDetermined`이지만 알림 화면에서는 처음 평가됨 | 사용자는 푸시를 받지 않으면서도 배너 안내는 못 받음 (디자인 의도: notDetermined는 PushNotificationService.initialize의 requestPermission이 책임) |
| S2 | OS에서 권한 거부한 사용자가 알림 화면 진입 → 배너 노출 → 설정 진입 → granted 복귀 | `FcmPermissionStatus.denied` | 푸시 수신 활성화, 배너 미노출 |
| S3 | 권한 거부 → 사용자가 다시 거부하고 복귀 | `denied` | 배너 계속 노출. 사용자가 다시 닫을 수 없음(dismiss 미연결) |
| S4 | 웹(`kIsWeb`) 또는 Firebase 미설정 dev 환경 | 개발자/QA, FCM 미설정 빌드 | 배너 무시, 다른 UI는 정상 |
| S5 | 백그라운드 푸시 수신 후 사용자가 권한을 끔 | granted, 토큰 등록 완료 | 권한 OFF 상태에서도 배너로 회복 경로 안내 |
| S6 | 동시 lifecycle 이벤트 (다중 resumed) | 화면 빠르게 백그라운드/포그라운드 전환하는 사용자 | 정상 처리, 무한루프 없음 (notifier 단순 polling) |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. 권한 미요청(notDetermined) 사용자 — 첫 다이얼로그 노출 (Happy Path)**: Given `FcmPermissionStatus.notDetermined`이지만 알림 화면에서는 처음 평가됨 When 사용자가 해당 흐름을 실행하면 Then 사용자는 푸시를 받지 않으면서도 배너 안내는 못 받음 (디자인 의도: notDetermined는 PushNotificationService.initialize의 requestPermission이 책임)
- **AC-02. OS에서 권한 거부한 사용자가 알림 화면 진입 → 배너 노출 → 설정 진입 → granted 복귀**: Given `FcmPermissionStatus.denied` When 사용자가 해당 흐름을 실행하면 Then 푸시 수신 활성화, 배너 미노출
- **AC-03. 권한 거부 → 사용자가 다시 거부하고 복귀**: Given `denied` When 사용자가 해당 흐름을 실행하면 Then 배너 계속 노출. 사용자가 다시 닫을 수 없음(dismiss 미연결)
- **AC-04. 웹(`kIsWeb`) 또는 Firebase 미설정 dev 환경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 배너 무시, 다른 UI는 정상
- **AC-05. 백그라운드 푸시 수신 후 사용자가 권한을 끔**: Given granted, 토큰 등록 완료 When 사용자가 해당 흐름을 실행하면 Then 권한 OFF 상태에서도 배너로 회복 경로 안내
- **AC-06. 동시 lifecycle 이벤트 (다중 resumed)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 처리, 무한루프 없음 (notifier 단순 polling)
