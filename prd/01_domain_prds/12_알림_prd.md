# 12. 알림 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/12_notification -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/12_notification/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

이 단위는 community 플랫폼이 사용자에게 변화를 전달하는 모든 통보 채널을 책임진다. 신청 승인·결제·정산·클럽·데이팅·검색 등 도메인 이벤트가 발생하면 서버는 `Notification` 레코드를 적재하고 FCM(Firebase Cloud Messaging)을 통해 푸시를 발송한다. 사용자는 알림 목록(SCR-NT-001)에서 시간/유형별로 모인 알림을 확인하고 탭으로 해당 화면으로 딥링크 이동하며, 알림 설정(SCR-NT-002)에서 카테고리별 푸시 수신 여부를 토글하고, 방해금지 시간(SCR-NT-003)에서 야간/특정 요일에는 푸시를 차단할 수 있다. 다중 디바이스 사용자를 위해 FCM 디바이스 토큰을 등록·갱신·삭제하는 라이프사이클을 별도 컨트롤러가 관리하며, OS 레벨에서 알림 권한이 거부된 경우 알림 화면 상단 인라인 배너로 권한 허용을 유도한다.

이 도메인은 기능 PRD 6개로 구성된다. 현재 기능별 trace source는 총 16개이고, risk 후보는 총 9개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F12-01 | F12-01. 알림 목록 조회 & 읽음 관리 | [F12-01_notification-list-read_prd.md](../02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | [F12-01_notification-list-read](../../units/12_notification/F12-01_notification-list-read) | 전환 완료 | 5 | 4 |
| F12-02 | F12-02. 알림 그룹 보기 & 미읽음 배지 | [F12-02_notification-grouped-badge_prd.md](../02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | [F12-02_notification-grouped-badge](../../units/12_notification/F12-02_notification-grouped-badge) | 전환 완료 | 2 | 3 |
| F12-03 | F12-03. 카테고리별 알림 설정 | [F12-03_category-settings_prd.md](../02_feature_prds/12_notification/F12-03_category-settings_prd.md) | [F12-03_category-settings](../../units/12_notification/F12-03_category-settings) | 전환 완료 | 2 | 1 |
| F12-04 | F12-04. 방해금지 시간 설정 | [F12-04_quiet-hours_prd.md](../02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | [F12-04_quiet-hours](../../units/12_notification/F12-04_quiet-hours) | 전환 완료 | 2 | 1 |
| F12-05 | F12-05. FCM 디바이스 토큰 등록 & 기기 관리 | [F12-05_device-token-management_prd.md](../02_feature_prds/12_notification/F12-05_device-token-management_prd.md) | [F12-05_device-token-management](../../units/12_notification/F12-05_device-token-management) | 전환 완료 | 5 | 0 |
| F12-06 | F12-06. 알림 권한 인라인 안내 배너 | [F12-06_permission-banner_prd.md](../02_feature_prds/12_notification/F12-06_permission-banner_prd.md) | [F12-06_permission-banner](../../units/12_notification/F12-06_permission-banner) | 전환 완료 | 0 | 0 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F12-01](../02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | F12-01. 알림 목록 조회 & 읽음 관리 | Risk 후보 4 |
| [F12-02](../02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | F12-02. 알림 그룹 보기 & 미읽음 배지 | Risk 후보 3 |
| [F12-03](../02_feature_prds/12_notification/F12-03_category-settings_prd.md) | F12-03. 카테고리별 알림 설정 | Risk 후보 1 |
| [F12-04](../02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | F12-04. 방해금지 시간 설정 | Risk 후보 1 |
| [F12-06](../02_feature_prds/12_notification/F12-06_permission-banner_prd.md) | F12-06. 알림 권한 인라인 안내 배너 | trace 없음 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (5개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F12-01 | 알림 목록 조회 & 읽음 관리 | 수신된 알림을 시간/유형별로 보고 개별·전체 읽음 처리 또는 삭제한다 | 알림 탭 진입, 풀다운 새로고침, 무한 스크롤, 아이템 탭(읽음+딥링크), "모두 읽음", 좌측 스와이프 삭제 |
| F12-02 | 알림 그룹 보기 & 미읽음 배지 | 동일 유형 알림을 묶어 그룹 카드로 보고 하단 탭 배지로 미읽음 수를 확인한다 | 우측 상단 그룹/리스트 토글, 그룹 카드 탭(최신 알림으로 이동), 하단 탭 배지 인지 |
| F12-03 | 카테고리별 알림 설정 | 이벤트/클럽/결제/데이팅/마케팅 카테고리 단위로 푸시 수신 ON/OFF를 즉시 반영한다 | 알림 설정 진입, 카테고리 토글, (실패 시) 자동 원복 |
| F12-04 | 방해금지 시간 설정 | 야간 등 지정 시간대 + 요일에 푸시 알림을 일괄 차단한다 (앱 내 알림은 정상 수신) | 방해금지 모드 토글, 시작/종료 TimePicker, 요일 칩 다중 선택, "저장" |
| F12-05 | FCM 디바이스 토큰 등록 & 기기 관리 | 앱 실행/토큰 갱신 시 FCM 토큰을 등록·교체하고, 사용 중인 기기 목록을 조회·삭제한다 | (자동) 앱 실행 시 토큰 등록/refresh, 기기 관리 화면에서 특정 기기 "삭제" |
| F12-06 | 알림 권한 인라인 안내 배너 | OS 알림 권한이 거부된 사용자에게 알림 화면 상단 배너로 권한 허용을 유도한다 | 배너의 "허용" 탭(권한 요청 또는 시스템 설정 진입), 화면 복귀 시 자동 재확인 |

> M = 6 기능. F12-01·F12-02는 알림 수신부(인박스)이고, F12-03·F12-04는 사용자가 푸시 수신 빈도를 통제하는 환경설정, F12-05는 FCM 채널 라이프사이클(다중 기기 포함), F12-06은 OS 권한 거부 상태에서 인앱으로 권한 회복을 유도하는 보조 흐름이다. 알림 자동 발송(서버→FCM) 자체는 도메인 이벤트(이벤트/결제/클럽/정산 등) 단위에서 트리거되며, 본 단위는 사용자가 인지·통제하는 클라이언트 노출면(`NotificationController` + `DeviceTokenController` + 4개 화면 + 권한 배너 위젯)에만 한정한다.

---

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 상세

### F12-01 알림 목록 조회 & 읽음 관리

- **사용자 가치**: 신청 승인·결제·정산 실패·클럽 공지 등 플랫폼에서 발생한 모든 변화를 한곳에서 시간순으로 확인하고, 해당 콘텐츠로 즉시 진입하거나 더 이상 필요 없는 알림을 정리할 수 있다.
- **주요 화면**:
  - `community_app/lib/presentation/notification/screens/notification_list_screen.dart` (SCR-NT-001 — flat 뷰: 오늘/어제/이번 주/이전 날짜 그룹 헤더)
- **백엔드 엔드포인트** (모두 `NotificationController`):
  - `GET /api/v1/notifications` — `NotificationSearchParam`(page/size 등 PagingParam 상속) → `Page<NotificationVo>`
  - `GET /api/v1/notifications/unread-count` — `Map<"unreadCount", Long>` 반환(하단 탭 배지 데이터원)
  - `PATCH /api/v1/notifications/{notificationId}/read` — 개별 읽음 처리, 200
  - `PATCH /api/v1/notifications/read-all` — 전체 읽음 처리, 200
  - `DELETE /api/v1/notifications/{notificationId}` — 개별 삭제, 204
- **선결 조건/상태**: 로그인 상태(`@AuthenticationPrincipal UserPrincipal`). FCM 또는 서버 인박스에 적재된 알림 존재 시 의미 있음(없으면 빈 상태 표시).
- **결과 상태 변화**:
  - 아이템 탭: `markAsRead` → `unreadCount` 1 감소 → `NotificationRouter`로 type/payload 기반 딥링크 이동(딥링크 해석 실패 시 fallback BottomSheet)
  - "모두 읽음": 모든 미읽음 → 읽음, 배지 0
  - 좌측 스와이프 삭제: 해당 알림 제거 + "알림이 삭제되었습니다" 토스트
  - 풀다운 새로고침/무한 스크롤로 페이지 갱신, p1 우선순위(결제·정산 실패 등)는 좌측 노란 바 + "주의" 칩으로 시각 강조

### F12-02 알림 그룹 보기 & 미읽음 배지

- **사용자 가치**: 같은 유형(예: 클럽 공지, 결제 실패 등)의 알림이 누적될 때 그룹 카드로 한 줄에 요약해 보여주어 인박스를 가볍게 유지하고, 하단 탭 알림 아이콘 위 숫자 배지로 처리해야 할 알림이 남아있음을 한눈에 인지한다.
- **주요 화면**:
  - `notification_list_screen.dart`의 우측 상단 그룹/리스트 토글 (`_isGrouped` 상태로 flat 뷰와 grouped 뷰 전환)
  - 하단 5탭 중 "알림" 탭의 미읽음 카운트 배지 (라우터/탭 컴포넌트는 외부 단위, 데이터원은 본 단위)
- **백엔드 엔드포인트** (`NotificationController`):
  - `GET /api/v1/notifications/grouped` — `NotificationSearchParam` → `List<NotificationGroupVo>`(groupKey, totalCount, unreadCount, latestNotification)
  - `GET /api/v1/notifications/unread-count` — F12-01과 동일 데이터원, 탭 배지에 사용
- **선결 조건/상태**: 로그인 상태. 동일 `groupKey`(서버에서 알림 type 기준으로 묶음)로 누적된 알림이 있을 때 의미 있음.
- **결과 상태 변화**:
  - 그룹 카드 탭 시 `latestNotification`을 기준으로 F12-01의 읽음 처리 + 딥링크 동일 흐름 진입
  - 미읽음 0 → 그룹 카드는 흰색 배경, 미읽음 ≥1 → 배경 `#F0F4FF` + 우측 카운트 칩
  - 탭 진입/뒤로가기/풀다운 새로고침/개별 읽음 처리 시 `unreadCount`도 동기화

### F12-03 카테고리별 알림 설정

- **사용자 가치**: 사용자가 받고 싶은 알림 종류(이벤트/클럽/결제/데이팅/마케팅)만 선택해 알림 피로도를 통제한다. 한 카테고리를 토글하면 내부에 묶인 다수의 세부 type이 일괄 ON/OFF된다.
- **주요 화면**:
  - `community_app/lib/presentation/notification/screens/notification_settings_screen.dart` (SCR-NT-002)
- **백엔드 엔드포인트** (`NotificationController`):
  - `GET /api/v1/notifications/settings` — `List<NotificationSettingVo>` (notification type별 pushEnabled/emailEnabled 등)
  - `PATCH /api/v1/notifications/settings` — `NotificationSettingParam`(notificationType + pushEnabled), 응답 `NotificationSettingVo`
- **선결 조건/상태**: 로그인 상태. 서버 측에는 type 단위로 설정값이 저장되어 있고 클라이언트가 5개 카테고리(이벤트/클럽/결제/데이팅/마케팅)로 그룹핑하여 표현. 한 카테고리 토글 = 내부 type들에 대해 PATCH를 반복 호출.
- **결과 상태 변화**:
  - 토글 변경 즉시 UI에 Optimistic 반영(카테고리 내 모든 type이 `pushEnabled=true`일 때만 ON 표기) → 서버 PATCH(디바운스 500ms)
  - 성공: 설정 캐시 갱신
  - 실패: 토글 원복 + "설정 변경에 실패했습니다" 에러 토스트
  - 카테고리 매핑은 `NotificationSettingsScreen._categoryMap`에 정의 (예: 결제 알림 = `PAYMENT_COMPLETED`/`PAYMENT_FAILED`/`CHARGE_FAILED`/`REFUND_COMPLETED`/`REFUND_PG_COMPLETED`/`REFUND_PG_FAILED`/`SETTLEMENT_*`/`MEETING_SETTLEMENT_REMIND`/`WITHDRAWAL_PAID`/`POINT_EXPIRATION`)

### F12-04 방해금지 시간 설정

- **사용자 가치**: 취침 시간 등 푸시를 받고 싶지 않은 시간대를 시작/종료 시간 + 요일 단위로 지정해 일관되게 차단한다. 앱 내 알림 인박스는 정상 적재되므로 정보 손실은 없다.
- **주요 화면**:
  - `community_app/lib/presentation/notification/screens/quiet_hours_screen.dart` (SCR-NT-003)
- **백엔드 엔드포인트** (`NotificationController`):
  - `GET /api/v1/notifications/settings/quiet-hours` — `QuietHoursVo`(enabled, startTime, endTime, daysOfWeek)
  - `PUT /api/v1/notifications/settings/quiet-hours` — `QuietHoursParam`(enabled + "HH:mm" 시간 + 1~7 요일 List)
- **선결 조건/상태**: 로그인 상태. 카테고리별 설정(F12-03)과 독립적으로 적용되는 상위 차단 규칙.
- **결과 상태 변화**:
  - 토글 OFF: TimePicker·요일 칩 dim + 입력 비활성, 저장 시 푸시 차단 해제
  - 토글 ON + 저장: 지정된 요일·시간대(자정 넘김 가능, 예 22:00~07:00)에 서버가 푸시 발송 보류(앱 내 알림은 저장)
  - 저장 성공: "저장되었습니다" 토스트 + 이전 화면 복귀
  - 저장 실패: "서버 오류가 발생했습니다" 에러 토스트(현재 화면 유지)

### F12-05 FCM 디바이스 토큰 등록 & 기기 관리

- **사용자 가치**: 사용자가 여러 단말(폰·태블릿)에서 동일 계정을 쓰더라도 모든 기기로 푸시가 도달하고, 더 이상 사용하지 않는 단말은 손쉽게 알림 수신 목록에서 제외해 의도치 않은 알림 노출을 막는다.
- **주요 화면**:
  - `community_app/lib/presentation/notification/screens/device_management_screen.dart` (등록된 기기 카드 목록 + 개별 삭제, 빈 상태 안내)
  - 토큰 등록/갱신 자체는 화면 없음 — 앱 실행/토큰 변경 시 백그라운드 자동 호출 (`PushNotificationService` 등 외부 단위)
- **백엔드 엔드포인트** (`DeviceTokenController`, prefix `/api/v1/device-tokens`):
  - `GET /api/v1/device-tokens` — 내 기기 목록 (`List<DeviceTokenVo>`)
  - `POST /api/v1/device-tokens` — `DeviceTokenParam`(token, deviceType)으로 신규 등록 — 실제 서버 필드는 2개 (Codex 감사 발견)
  - `PUT /api/v1/device-tokens/token` — `DeviceTokenRefreshParam`(oldToken, newToken)으로 토큰 교체
  - `DELETE /api/v1/device-tokens/{deviceId}` — 특정 기기 ID로 삭제 (기기 관리 화면에서 사용)
  - `DELETE /api/v1/device-tokens?token=xxx` — 토큰 문자열로 삭제 (로그아웃 시점에 사용)
- **선결 조건/상태**: 로그인 상태(`@AuthenticationPrincipal`). FCM SDK가 토큰을 발급한 상태.
- **결과 상태 변화**:
  - 신규 등록: 해당 기기로 푸시 도달 가능
  - 토큰 갱신: 기존 토큰을 새 토큰으로 교체(중복 디바이스 레코드 방지)
  - 기기 삭제: 확인 다이얼로그(`AppDialog.confirm`, isDangerous=true) → 성공 시 "기기가 삭제되었습니다" 토스트, 해당 단말 미수신
  - 빈 상태: "등록된 기기가 없습니다" 안내(푸시 미수신 상태)

### F12-06 알림 권한 인라인 안내 배너

- **사용자 가치**: OS에서 알림 권한이 거부된 사용자가 결제·정산 등 중요 알림을 놓치지 않도록, 알림 화면 진입 시점에 비침습적 인라인 배너로 권한 허용을 유도한다.
- **주요 화면**:
  - `community_app/lib/presentation/notification/widgets/fcm_permission_banner.dart` (인라인 배너)
  - 배너의 호스트는 `notification_list_screen.dart` 상단(권한 상태 = denied일 때만 노출)
- **백엔드 엔드포인트**: 없음 — OS 권한 API + 클라이언트 상태(`fcmPermissionNotifierProvider`)만 사용. 권한 결과는 후속 F12-05 토큰 등록 흐름에 영향.
- **선결 조건/상태**: 로그인 상태 + 알림 화면 진입 + `FcmPermissionStatus.denied`. `granted`/`notDetermined`/`unsupported`이면 배너 미노출.
- **결과 상태 변화**:
  - "허용" 탭: 권한 미요청 상태면 OS 권한 다이얼로그, 이미 거부 상태면 시스템 설정 화면으로 진입(`requestOrOpenSettings`)
  - 화면 복귀(`AppLifecycleState.resumed`) 시 권한 상태 자동 재확인 → 권한이 granted로 바뀌었으면 배너 자동 사라짐
  - granted 전환 후에는 외부 단위인 FCM 토큰 등록(F12-05) 흐름이 이어져 실제 푸시 수신이 활성화됨

---

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F12-01](../02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | F12-01. 알림 목록 조회 & 읽음 관리 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F12-02](../02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | F12-02. 알림 그룹 보기 & 미읽음 배지 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F12-03](../02_feature_prds/12_notification/F12-03_category-settings_prd.md) | F12-03. 카테고리별 알림 설정 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F12-04](../02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | F12-04. 방해금지 시간 설정 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
