# F12-06. 알림 권한 인라인 안내 배너 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/12_notification/F12-06_permission-banner -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/12_notification/F12-06_permission-banner`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이 기능은 **백엔드 엔드포인트가 없다**. OS 알림 권한이 거부된 사용자가 알림 화면 진입 시점에 비침습적 인라인 배너로 권한 허용을 유도하는 클라이언트 전용 흐름이며, 권한 상태는 OS API(`FirebaseMessaging.getNotificationSettings()`)와 클라이언트 상태(`fcmPermissionNotifierProvider`)로만 관리된다. 권한이 `granted`로 전환되면 후속 단계에서 F12-05의 토큰 등록 흐름이 자연스럽게 이어져 푸시 수신이 활성화된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 알림 화면(`/notifications`) 진입 시 자동 평가 → `FcmPermissionStatus.denied`인 경우에만 상단 배너 노출
- 별도 라우트 없음. 사용자 액션은 배너의 "허용" 텍스트 버튼만

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/12_notification/F12-06_permission-banner/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/12_notification/F12-06_permission-banner/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/12_notification/F12-06_permission-banner/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/12_notification/F12-06_permission-banner/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

이 기능은 **백엔드 엔드포인트가 없다**. OS 알림 권한이 거부된 사용자가 알림 화면 진입 시점에 비침습적 인라인 배너로 권한 허용을 유도하는 클라이언트 전용 흐름이며, 권한 상태는 OS API(`FirebaseMessaging.getNotificationSettings()`)와 클라이언트 상태(`fcmPermissionNotifierProvider`)로만 관리된다. 권한이 `granted`로 전환되면 후속 단계에서 F12-05의 토큰 등록 흐름이 자연스럽게 이어져 푸시 수신이 활성화된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| (없음) | (없음) | (없음) | (없음) | 본 기능은 클라이언트 전용 — OS 권한 API와 FCM SDK만 사용 |

### 도메인 모델 / Enum (이 기능 관련)

백엔드 엔드포인트/모델은 본 기능에 직접 관여하지 않는다. 단, 클라이언트가 권한 상태 변화에 따라 후속으로 호출하는 엔드포인트는 다음과 같다 (본 단위 외부 흐름에 위임):

- `POST /api/v1/device-tokens` (F12-05) — 권한이 `granted`로 전환된 후 FCM 토큰 발급되면 자동 등록

### 의존 단위 / 외부 시스템

- **외부 (모두 클라이언트 측 호출, 본 단위 백엔드 호출 없음)**:
  - 🟠 **OS 알림 권한 API**:
    - iOS: APNs 권한 (UIApplication notification authorization)
    - Android 13+ (API 33+): `POST_NOTIFICATIONS` runtime permission
  - 🟠 **Firebase Messaging SDK**:
    - `FirebaseMessaging.instance.getNotificationSettings()` — 현재 권한 상태 폴링
    - `FirebaseMessaging.instance.requestPermission(alert, badge, sound)` — 권한 요청 다이얼로그
  - 🟠 **앱 설정 진입**: `Geolocator.openAppSettings()` (`permission_handler` 미포함이므로 Geolocator 패키지 utility 사용 — 앱 공통 설정 화면 오픈, OS가 권한 카테고리 분리해 노출)

- **이 기능이 영향을 미치는 흐름**:
  - 권한 granted 전환 시 F12-05 자동 흐름 (토큰 발급 → POST 등록) 활성화
  - 권한 denied 유지 시 푸시 수신 불가 상태가 지속됨 (서버는 정상 발송, OS가 단말 표시 차단)
- **본 단위 자체의 백엔드 사이드 이펙트**: 없음

## 5. 프론트 계약

### 진입 경로

- 알림 화면(`/notifications`) 진입 시 자동 평가 → `FcmPermissionStatus.denied`인 경우에만 상단 배너 노출
- 별도 라우트 없음. 사용자 액션은 배너의 "허용" 텍스트 버튼만

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| (라우트 없음 — 위젯) | `presentation/notification/widgets/fcm_permission_banner.dart` | 배너 위젯 |
| `/notifications` | `presentation/notification/screens/notification_list_screen.dart` (호스트) | 배너 mount 위치 + lifecycle resumed 시 권한 폴링 |
| (Provider) | `domain/providers/notification/fcm_permission_provider.dart` | 권한 상태 keepAlive notifier |

### 화면별 구성 요소 & 액션

### `FcmPermissionBanner` 위젯
- **사용자가 보는 것** (`denied`일 때만 마운트):
  - 컨테이너:
    - margin: `EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding, vertical: AppSpacing.space2)`
    - padding: `AppSpacing.space4`
    - 배경: `AppColors.primary50`, 테두리: `AppColors.primary100`, 라운드 12px
  - 좌측: `Icons.notifications_off_outlined` 24px, color `AppColors.primary500`
  - 중앙: 2줄
    - 제목 "알림이 꺼져 있습니다" (`body2Medium`, primary)
    - 본문 "신청 승인·결제·정산 등 중요 알림을 받으려면 권한을 허용해주세요." (caption, secondary)
  - 우측: `TextButton('허용')` (body2Medium, primary500)
- **사용자가 할 수 있는 액션**:
  - "허용" 탭 ▶ `ref.read(fcmPermissionNotifierProvider.notifier).requestOrOpenSettings()`
    - 현 상태 polling: `notDetermined`이면 `FirebaseMessaging.requestPermission()` 다이얼로그
    - `denied`이면 `Geolocator.openAppSettings()` (앱 공통 설정 화면)
- **상태 분기**:
  - `granted` / `notDetermined` / `unsupported` → 배너 미노출 (`SizedBox.shrink()`)
  - `denied` → 배너 노출
- **모달/시트/네비게이션**: OS가 다이얼로그 또는 설정 화면을 그림 (앱 내 화면 push 없음)

### 호스트 화면 (`NotificationListScreen`)
- `WidgetsBindingObserver` mixin으로 `didChangeAppLifecycleState` 구현
- `initState` 시: `addPostFrameCallback`에서 `ref.read(fcmPermissionNotifierProvider.notifier).refresh()` 호출
- `AppLifecycleState.resumed` 시: `refresh()` 다시 호출 (사용자가 OS 설정 화면 다녀온 직후 자동 갱신)

### `FcmPermissionNotifier` 상태
- `enum FcmPermissionStatus { granted, denied, notDetermined, unsupported }`
- `build()` default: `notDetermined`
- `refresh()`:
  - `kIsWeb` → `unsupported`
  - `FirebaseMessaging.instance.getNotificationSettings()` → `_toStatus(authorizationStatus)`
  - 예외 발생 시 (Firebase 미설정 dev 환경 등) → `unsupported`
- `requestOrOpenSettings()`:
  - 현 상태 refresh 후
  - `notDetermined` → `requestPermission(alert, badge, sound)` → 결과로 state 갱신
  - `denied` → `Geolocator.openAppSettings()` (Settings 앱 진입)

### API 호출 순서 (Provider/Repository 관점)

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

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 권한 미요청(notDetermined) 사용자 — 첫 다이얼로그 노출 (Happy Path) | `FcmPermissionStatus.notDetermined`이지만 알림 화면에서는 처음 평가됨 | 사용자는 푸시를 받지 않으면서도 배너 안내는 못 받음 (디자인 의도: notDetermined는 PushNotificationService.initialize의 requestPermission이 책임) |
| S2 | OS에서 권한 거부한 사용자가 알림 화면 진입 → 배너 노출 → 설정 진입 → granted 복귀 | `FcmPermissionStatus.denied` | 푸시 수신 활성화, 배너 미노출 |
| S3 | 권한 거부 → 사용자가 다시 거부하고 복귀 | `denied` | 배너 계속 노출. 사용자가 다시 닫을 수 없음(dismiss 미연결) |
| S4 | 웹(`kIsWeb`) 또는 Firebase 미설정 dev 환경 | 개발자/QA, FCM 미설정 빌드 | 배너 무시, 다른 UI는 정상 |
| S5 | 백그라운드 푸시 수신 후 사용자가 권한을 끔 | granted, 토큰 등록 완료 | 권한 OFF 상태에서도 배너로 회복 경로 안내 |
| S6 | 동시 lifecycle 이벤트 (다중 resumed) | 화면 빠르게 백그라운드/포그라운드 전환하는 사용자 | 정상 처리, 무한루프 없음 (notifier 단순 polling) |

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

- **AC-01. 권한 미요청(notDetermined) 사용자 — 첫 다이얼로그 노출 (Happy Path)**: Given `FcmPermissionStatus.notDetermined`이지만 알림 화면에서는 처음 평가됨 When 사용자가 해당 흐름을 실행하면 Then 사용자는 푸시를 받지 않으면서도 배너 안내는 못 받음 (디자인 의도: notDetermined는 PushNotificationService.initialize의 requestPermission이 책임)
- **AC-02. OS에서 권한 거부한 사용자가 알림 화면 진입 → 배너 노출 → 설정 진입 → granted 복귀**: Given `FcmPermissionStatus.denied` When 사용자가 해당 흐름을 실행하면 Then 푸시 수신 활성화, 배너 미노출
- **AC-03. 권한 거부 → 사용자가 다시 거부하고 복귀**: Given `denied` When 사용자가 해당 흐름을 실행하면 Then 배너 계속 노출. 사용자가 다시 닫을 수 없음(dismiss 미연결)
- **AC-04. 웹(`kIsWeb`) 또는 Firebase 미설정 dev 환경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 배너 무시, 다른 UI는 정상
- **AC-05. 백그라운드 푸시 수신 후 사용자가 권한을 끔**: Given granted, 토큰 등록 완료 When 사용자가 해당 흐름을 실행하면 Then 권한 OFF 상태에서도 배너로 회복 경로 안내
- **AC-06. 동시 lifecycle 이벤트 (다중 resumed)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 처리, 무한루프 없음 (notifier 단순 polling)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
