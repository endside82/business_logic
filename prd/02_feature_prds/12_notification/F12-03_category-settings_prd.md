# F12-03. 카테고리별 알림 설정 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/12_notification/F12-03_category-settings -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/12_notification/F12-03_category-settings`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 알림 type 단위로 푸시 수신 여부(`pushEnabled`)와 이메일 수신 여부(`emailEnabled`)를 토글할 수 있게 하는 두 개의 엔드포인트다. 서버는 `notification_setting` 테이블에 (userId, notificationType) 단위 레코드로 저장하며, 설정이 없는 type은 모두 ON(true)으로 간주하는 "기본 ON, 명시적 OFF" 정책을 따른다. 클라이언트는 5개 카테고리(이벤트/클럽/결제/데이팅/마케팅)로 type을 묶어 한 번의 토글로 다수의 type을 일괄 PATCH 한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 알림 목록(`/notifications`) 우측 상단 설정 아이콘 → `context.push('/notifications/settings')`
- 프로필 > 설정 > 알림 설정 (별도 진입점, UI/UX 스펙 SCR-NT-002 명시. 현재 구현 검토에서 라우트는 `/notifications/settings` 단일 사용)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/12_notification/F12-03_category-settings/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/12_notification/F12-03_category-settings/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/12_notification/F12-03_category-settings/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/12_notification/F12-03_category-settings/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:82` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:89` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **화면 진입 시**:
   - `notificationSettingsNotifierProvider.build()` ▶ `NotificationRepository.getSettings()` ▶ `GET /api/v1/notifications/settings`
   - 응답: `List<NotificationSettingVo>` (61개 type, 미저장은 모두 true)

2. **카테고리 토글 시**:
   - `_CategoryToggle`의 `onChanged(value)` → 카테고리 매핑 type 리스트 순회 → 각 type에 대해 `_updateSetting(type, value)`
   - `_updateSetting`:
     - `NotificationSettingParam(notificationType: type, pushEnabled: value)` 생성
     - Provider의 `updateSetting(param)` 호출
       - Optimistic: state의 해당 type 항목 즉시 갱신 + state 알림
       - `NotificationRepository.updateSetting(param)` ▶ `PATCH /api/v1/notifications/settings`
       - 성공: 응답 VO로 state의 해당 항목 확정 갱신
       - 실패: `ref.invalidateSelf()` (전체 다시 fetch) + return false → 화면이 토스트 노출
   - 카테고리 내 N개 type이면 N개 PATCH가 동시 발생

3. **카테고리 ON 판정**:
   - 클라이언트 결정: 카테고리 내 매핑된 type들의 `pushEnabled`가 **모두 true**일 때만 카테고리 토글 ON
   - 일부만 false면 카테고리 토글은 OFF로 표기 (mixed 상태 노출 안 함)
   - `categorySettings.every((s) => s.pushEnabled) && categorySettings.isNotEmpty`

## 4. 서버 계약

### 개요

사용자가 알림 type 단위로 푸시 수신 여부(`pushEnabled`)와 이메일 수신 여부(`emailEnabled`)를 토글할 수 있게 하는 두 개의 엔드포인트다. 서버는 `notification_setting` 테이블에 (userId, notificationType) 단위 레코드로 저장하며, 설정이 없는 type은 모두 ON(true)으로 간주하는 "기본 ON, 명시적 OFF" 정책을 따른다. 클라이언트는 5개 카테고리(이벤트/클럽/결제/데이팅/마케팅)로 type을 묶어 한 번의 토글로 다수의 type을 일괄 PATCH 한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/notifications/settings | NotificationController#getSettings | required | 전체 NotificationType의 현재 설정값을 (없는 type은 true 기본) 리스트로 반환 |
| PATCH | /api/v1/notifications/settings | NotificationController#updateSettings | required | 특정 notificationType의 push/email 토글 변경 |

### 도메인 모델 / Enum (이 기능 관련)

### `NotificationSetting` 엔티티 (`notification_setting` 테이블)
- 핵심 필드 (서비스 코드 기준):
  - `userId: long`
  - `notificationType: String` (`NotificationType.name()` 저장)
  - `pushEnabled: boolean` — push 발송 여부
  - `emailEnabled: boolean` — email 발송 여부
  - `inAppEnabled: boolean` — 인박스 적재 여부 (서비스 코드 `setting.isInAppEnabled()` 사용 — 본 단위에서는 toggle UI 미제공, 서버 default true)
- (userId, notificationType) 복합 unique

### Enum
- `NotificationType` (61종, F12-01과 동일) — 클라이언트가 5개 카테고리로 묶음
- `NotificationChannel` — `IN_APP`, `PUSH`, `EMAIL`, `SMS` (본 단위는 `pushEnabled` boolean 토글만)

### 클라이언트 카테고리 매핑 (참고, `notification_settings_screen.dart`)
- **이벤트 알림**: `EVENT_REMINDER`, `EVENT_CANCELED`, `EVENT_UPDATED`, `EVENT_ANNOUNCE`, `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `NEW_APPLICATION`, `WAITLIST_PROMOTED`, `LOCATION_SHARE_EXPIRING`, `REVIEW_NUDGE`
- **클럽 알림**: `CLUB_EVENT_PUBLISHED`, `CLUB_EVENT_REMINDER`, `CLUB_EVENT_UPDATED`
- **결제 알림**: `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `CHARGE_FAILED`, `REFUND_COMPLETED`, `REFUND_PG_COMPLETED`, `REFUND_PG_FAILED`, `SETTLEMENT_COMPLETED`, `SETTLEMENT_APPROVED`, `SETTLEMENT_REJECTED`, `SETTLEMENT_FAILED`, `MEETING_SETTLEMENT_REMIND`, `WITHDRAWAL_PAID`, `POINT_EXPIRATION`
- **데이팅 알림**: `CHAT_MESSAGE`
- **마케팅 알림**: `REVIEW_RECEIVED`, `NEW_REVIEW`, `REPORT_RESOLVED`, `PROMOTION`, `LOCATION_SHARED`, `EVENT_PHOTO_EXPIRY`

### 의존 단위 / 외부 시스템

- **이 API를 호출하는 다른 단위**: 본 단위 외 클라이언트만
- **본 단위가 영향을 미치는 흐름**: 모든 도메인의 `notificationService.createNotification` 호출 시점에 `notification_setting` 조회 → 적재/발송 분기. 즉 알림 적재(타 단위) → push 분기에 본 설정이 강하게 작용
- **외부**: 없음 (본 단위 자체는 FCM 호출 없음)

## 5. 프론트 계약

### 진입 경로

- 알림 목록(`/notifications`) 우측 상단 설정 아이콘 → `context.push('/notifications/settings')`
- 프로필 > 설정 > 알림 설정 (별도 진입점, UI/UX 스펙 SCR-NT-002 명시. 현재 구현 검토에서 라우트는 `/notifications/settings` 단일 사용)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/notifications/settings` | `presentation/notification/screens/notification_settings_screen.dart` | 카테고리 토글 — SCR-NT-002 |

### 화면별 구성 요소 & 액션

### 알림 설정 (`notification_settings_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '알림 설정', showBackButton: true)`
  - `ListView`(padding `AppSpacing.space5`)에 5개 `_CategoryToggle` + 사이 Divider
  - 각 `_CategoryToggle` 행:
    - 좌측: 카테고리명 (body2Medium primary), 그 아래 description (caption tertiary, 12px)
    - 우측: `Switch(value: allEnabled, onChanged, activeTrackColor: AppColors.primary500)`
  - 5개 카테고리:
    - "이벤트 알림" — "참석 확정, 일정 리마인더, 이벤트 변경"
    - "클럽 알림" — "새 공지, 멤버 가입/탈퇴, 기금 변동"
    - "결제 알림" — "결제 완료, 환불 처리, 정산 완료"
    - "데이팅 알림" — "매칭 결과, 새 메시지"
    - "마케팅 알림" — "이벤트 추천, 프로모션, 뉴스레터"
  - 하단 Divider 후 "방해금지 시간" 링크 카드:
    - `Icons.do_not_disturb_on_outlined` + "방해금지 시간" + "설정한 시간에는 푸시 알림이 발송되지 않습니다" + `Icons.chevron_right`
    - 둥근 12px 컨테이너, `AppSemanticColors.borderDefault` 테두리
- **사용자가 할 수 있는 액션**:
  - 카테고리 토글 ▶ `_updateSetting`을 카테고리 내 모든 type에 대해 반복 호출
    - 한 카테고리당 type N개 → N번의 PATCH 요청 (병렬 await)
    - Optimistic 즉시 반영 (provider 내부)
    - 실패 시 토스트 + 자동 rollback (provider invalidate)
  - 방해금지 링크 탭 ▶ `context.push('/notifications/settings/quiet-hours')` (F12-04 진입)
- **상태 분기**:
  - 로딩: `CircularProgressIndicator()`
  - 에러: `AppErrorState.fromError(error: ..., onRetry: () => ref.invalidate(notificationSettingsNotifierProvider))`
  - 성공: 5개 카테고리 토글 목록
- **모달/시트/네비게이션**:
  - 방해금지 → push (F12-04)
  - 토스트: 변경 실패 시 `AppToast.show('설정 변경에 실패했습니다', type: ToastType.error)`

### API 호출 순서 (Provider/Repository 관점)

1. **화면 진입 시**:
   - `notificationSettingsNotifierProvider.build()` ▶ `NotificationRepository.getSettings()` ▶ `GET /api/v1/notifications/settings`
   - 응답: `List<NotificationSettingVo>` (61개 type, 미저장은 모두 true)

2. **카테고리 토글 시**:
   - `_CategoryToggle`의 `onChanged(value)` → 카테고리 매핑 type 리스트 순회 → 각 type에 대해 `_updateSetting(type, value)`
   - `_updateSetting`:
     - `NotificationSettingParam(notificationType: type, pushEnabled: value)` 생성
     - Provider의 `updateSetting(param)` 호출
       - Optimistic: state의 해당 type 항목 즉시 갱신 + state 알림
       - `NotificationRepository.updateSetting(param)` ▶ `PATCH /api/v1/notifications/settings`
       - 성공: 응답 VO로 state의 해당 항목 확정 갱신
       - 실패: `ref.invalidateSelf()` (전체 다시 fetch) + return false → 화면이 토스트 노출
   - 카테고리 내 N개 type이면 N개 PATCH가 동시 발생

3. **카테고리 ON 판정**:
   - 클라이언트 결정: 카테고리 내 매핑된 type들의 `pushEnabled`가 **모두 true**일 때만 카테고리 토글 ON
   - 일부만 false면 카테고리 토글은 OFF로 표기 (mixed 상태 노출 안 함)
   - `categorySettings.every((s) => s.pushEnabled) && categorySettings.isNotEmpty`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 마케팅 알림만 끄기 (Happy Path) | 5개 카테고리 모두 ON (서버 미저장 상태이므로 기본 true) | 6개 type의 push가 false. 이후 PROMOTION 등의 알림 발생 시 인박스 INSERT는 정상이나(inAppEnabled는 true), FCM 발송은 skip |
| S2 | 데이팅 알림 ON으로 다시 켜기 | 데이팅 알림 OFF (`CHAT_MESSAGE` pushEnabled=false 저장됨) | 채팅 메시지 알림이 다시 푸시 발송됨 |
| S3 | 한 카테고리 내 부분 토글 시 카테고리 표기 | 13개 결제 type 중 12개 ON, `PROMOTION`이 OFF로 가정 (다른 경로/관리자/이전 클라 버전에서 변경된 케이스 — 마케팅과 카테고리 분리되어 있어 결제와는 무관, 결제 카테고리 내부에서는 모두 같은 카테고리) | 13개 모두 ON 동기화 |
| S4 | 카테고리 내 일부 PATCH 실패 (네트워크 끊김) | 이벤트 카테고리 ON, 10개 type 모두 true | 부분 부정합 → 사용자가 재시도. 최종 일관성 회복 |
| S5 | 알림 설정에서 방해금지 진입 | 야간 푸시 차단을 원하는 사용자 | F12-04로 흐름 위임 |
| S6 | 잘못된 notificationType 전달 (방어 케이스) | alice 로그인 후 `/notifications/settings` 진입. `notificationSettingsNotifierProvider.build()` → `GET /api/v1/notifications/settings` → 기존 row 들 + 서버 default(true) 가 머지된 list 가 state 에 채워짐. 화면에 "데이팅 알림" 카테고리 row + Switch(value=true) 노출 | 서버 상태 변경 없음 |

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
| 후보 | frontend.md:74 | - **디바운스 500ms**: SCR-NT-002 스펙은 디바운스 명시. 현 구현은 즉시 PATCH (Switch onChanged → 바로 호출). 디바운스 미구현 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 마케팅 알림만 끄기 (Happy Path)**: Given 5개 카테고리 모두 ON (서버 미저장 상태이므로 기본 true) When 사용자가 해당 흐름을 실행하면 Then 6개 type의 push가 false. 이후 PROMOTION 등의 알림 발생 시 인박스 INSERT는 정상이나(inAppEnabled는 true), FCM 발송은 skip
- **AC-02. 데이팅 알림 ON으로 다시 켜기**: Given 데이팅 알림 OFF (`CHAT_MESSAGE` pushEnabled=false 저장됨) When 사용자가 해당 흐름을 실행하면 Then 채팅 메시지 알림이 다시 푸시 발송됨
- **AC-03. 한 카테고리 내 부분 토글 시 카테고리 표기**: Given 13개 결제 type 중 12개 ON, `PROMOTION`이 OFF로 가정 (다른 경로/관리자/이전 클라 버전에서 변경된 케이스 — 마케팅과 카테고리 분리되어 있어 결제와는 무관, 결제 카테고리 내부에서는 모두 같은 카테고리) When 사용자가 해당 흐름을 실행하면 Then 13개 모두 ON 동기화
- **AC-04. 카테고리 내 일부 PATCH 실패 (네트워크 끊김)**: Given 이벤트 카테고리 ON, 10개 type 모두 true When 사용자가 해당 흐름을 실행하면 Then 부분 부정합 → 사용자가 재시도. 최종 일관성 회복
- **AC-05. 알림 설정에서 방해금지 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then F12-04로 흐름 위임
- **AC-06. 잘못된 notificationType 전달 (방어 케이스)**: Given alice 로그인 후 `/notifications/settings` 진입. `notificationSettingsNotifierProvider.build()` → `GET /api/v1/notifications/settings` → 기존 row 들 + 서버 default(true) 가 머지된 list 가 state 에 채워짐. 화면에 "데이팅 알림" 카테고리 row + Switch(value=true) 노출 When 사용자가 해당 흐름을 실행하면 Then 서버 상태 변경 없음

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
