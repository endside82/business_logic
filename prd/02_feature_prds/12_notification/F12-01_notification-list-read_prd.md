# F12-01. 알림 목록 조회 & 읽음 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/12_notification/F12-01_notification-list-read -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/12_notification/F12-01_notification-list-read`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 자신에게 적재된 모든 인박스 알림을 시간 역순으로 페이지네이션 조회하고, 미읽음 수를 별도 가벼운 호출로 받아 하단 탭 배지에 노출하며, 개별/일괄 읽음 처리와 개별 삭제로 인박스를 정리할 수 있게 하는 다섯 개의 엔드포인트 묶음이다. 모든 처리는 `userId` 단일 소유자 조건을 강제하며, 새 알림 발송 자체는 다른 도메인이 트리거하므로 본 단위는 "수신부 인박스" 역할만 수행한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 4번 "알림" 탭 (`Routes.notifications` = `/notifications`) — `StatefulShellRoute` 5개 탭 중 4번째
- 다른 화면(예: 홈 앱바의 알림 아이콘 등)에서 `context.go('/notifications')` 직접 이동 가능
- 푸시 알림 탭(터미네이트→오픈 / 백그라운드→오픈) 흐름은 `PushNotificationService.onNotificationTapped` → `NotificationRouter.resolve(notification)` 결과 경로로 직접 이동(이 화면을 거치지 않음). 다만 인앱 배너의 ‘알림함 보기' 등 fallback 진입은 본 화면

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/12_notification/F12-01_notification-list-read/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/12_notification/F12-01_notification-list-read/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/12_notification/F12-01_notification-list-read/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/12_notification/F12-01_notification-list-read/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:35` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:52` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:59` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:67` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:74` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **화면 진입 시**:
   - `notificationListNotifierProvider` ▶ `NotificationRepository.getNotifications(page=0, size=20)` ▶ `GET /api/v1/notifications`
   - `unreadCountNotifierProvider` ▶ `NotificationRepository.getUnreadCount()` ▶ `GET /api/v1/notifications/unread-count` (응답 `UnreadCountVo` → `int`로 매핑)
   - `fcmPermissionNotifierProvider.refresh()` ▶ FCM SDK `getNotificationSettings()` (서버 호출 없음)

2. **알림 아이템 탭 시**:
   - Optimistic UI: `_items[index] = _items[index].copyWith(isRead: true)` 즉시 반영
   - `NotificationRepository.markAsRead(id)` ▶ `PATCH /api/v1/notifications/{id}/read`
   - 실패 시 rollback (`isRead: false` 복구)
   - `unreadCountNotifierProvider.decrement()` (count - 1)
   - `NotificationRouter.navigate(router, notification)` ▶ 라우터 `go(path)`

3. **"모두 읽음" 탭 시**:
   - Optimistic: 모든 `_items`의 `isRead`를 true로 변경 + state 업데이트
   - `NotificationRepository.markAllAsRead()` ▶ `PATCH /api/v1/notifications/read-all`
   - 실패 시 원본 리스트로 rollback
   - `unreadCountNotifierProvider.reset()` (0)

4. **스와이프 삭제 시**:
   - `NotificationRepository.deleteNotification(id)` ▶ `DELETE /api/v1/notifications/{id}`
   - 성공 시 `_items.removeWhere(...)` + AsyncData 갱신, `AppToast` 노출
   - 실패 시 토스트 미노출(현 구현은 false 반환만)

5. **무한 스크롤**:
   - `loadMore()` ▶ 다음 페이지 `getNotifications(page=N+1)` ▶ `_items.addAll(data.content)` ▶ AsyncData 갱신
   - `data.last == true`이면 `_hasMore=false`로 추가 호출 중단

6. **풀투리프레시**:
   - `ref.invalidate(notificationListNotifierProvider)` → `build()`가 다시 실행되어 `_currentPage=0`, `_items.clear()` 후 page=0 재호출
   - `ref.invalidate(unreadCountNotifierProvider)` 도 동시에

## 4. 서버 계약

### 개요

사용자가 자신에게 적재된 모든 인박스 알림을 시간 역순으로 페이지네이션 조회하고, 미읽음 수를 별도 가벼운 호출로 받아 하단 탭 배지에 노출하며, 개별/일괄 읽음 처리와 개별 삭제로 인박스를 정리할 수 있게 하는 다섯 개의 엔드포인트 묶음이다. 모든 처리는 `userId` 단일 소유자 조건을 강제하며, 새 알림 발송 자체는 다른 도메인이 트리거하므로 본 단위는 "수신부 인박스" 역할만 수행한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/notifications | NotificationController#getNotifications | required | 내 알림 목록 페이지 조회 (createdAt DESC) |
| GET | /api/v1/notifications/unread-count | NotificationController#getUnreadCount | required | 내 미읽음 알림 수 조회 |
| PATCH | /api/v1/notifications/{notificationId}/read | NotificationController#markAsRead | required | 개별 알림 읽음 처리 |
| PATCH | /api/v1/notifications/read-all | NotificationController#markAllAsRead | required | 내 모든 알림 일괄 읽음 처리 |
| DELETE | /api/v1/notifications/{notificationId} | NotificationController#deleteNotification | required | 개별 알림 영구 삭제 |

### 도메인 모델 / Enum (이 기능 관련)

### `Notification` 엔티티 (`notification` 테이블)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | identity |
| user_id | bigint | 수신자 (이 단위 모든 쿼리의 인덱스 키) |
| type | int | `NotificationType.getType()` (정수 코드) |
| channel | varchar(20) | `IN_APP` 기본값 |
| title | varchar(200) | |
| message | TEXT | |
| is_read | bool | 본 단위 핵심 상태 |
| data_json | TEXT | 도메인 페이로드 (eventId 등 추출용) |
| reference_type | varchar(50) | `EVENT`/`CLUB`/`SETTLEMENT`/... |
| reference_id | bigint | `referenceType` 대상 PK |
| group_key | varchar(100) | F12-02에서 사용 |
| status | varchar(20) | `NotificationStatusType` enum |
| sent_at, read_at | datetime | |
| created_at, updated_at | datetime | `@CreatedDate`/`@LastModifiedDate` |

### Enum
- `NotificationType` (61종, `NotificationType.java`) — `getType()`이 정수 코드(0~60)이며 DB에 정수로 저장. VO에서는 `name()` 문자열로 직렬화
- `NotificationChannel` — `IN_APP`, `PUSH`, `EMAIL`, `SMS`
- `NotificationStatusType` — `PENDING`, ... (자세한 값은 본 단위 외부에서 전이)

### ErrorCode (notification 도메인)
- `NOTIFICATION_NOT_FOUND` (404, 800001)
- `NOTIFICATION_NOT_OWNER` (403, 800002)
- `NOTIFICATION_SETTING_NOT_FOUND` (404, 800003) — F12-03에서 사용

### 의존 단위 / 외부 시스템

- **이 API를 호출하는 다른 단위**: 없음(공용 인박스). 클라이언트만 호출
- **이 API가 의존**: `Notification` 엔티티에 적재되는 알림은 다른 모든 도메인(이벤트/클럽/결제/정산 등)이 `NotificationService#createNotification`을 통해 생성. 본 단위는 "이미 적재된 인박스 조회/조작"만 담당
- **외부**: 없음 (FCM 발송은 적재 시점, 본 단위 5개 엔드포인트는 외부 호출 없음)

## 5. 프론트 계약

### 진입 경로

- 하단 탭 4번 "알림" 탭 (`Routes.notifications` = `/notifications`) — `StatefulShellRoute` 5개 탭 중 4번째
- 다른 화면(예: 홈 앱바의 알림 아이콘 등)에서 `context.go('/notifications')` 직접 이동 가능
- 푸시 알림 탭(터미네이트→오픈 / 백그라운드→오픈) 흐름은 `PushNotificationService.onNotificationTapped` → `NotificationRouter.resolve(notification)` 결과 경로로 직접 이동(이 화면을 거치지 않음). 다만 인앱 배너의 ‘알림함 보기' 등 fallback 진입은 본 화면

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/notifications` | `presentation/notification/screens/notification_list_screen.dart` | 알림 목록 (flat 뷰 / grouped 뷰 토글) — SCR-NT-001 |

### 화면별 구성 요소 & 액션

### 알림 목록 (`notification_list_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '알림')` + 우측 액션 3개:
    - 그룹/리스트 뷰 토글 아이콘 (`Icons.workspaces_outline` ↔ `Icons.view_list`) — F12-02 동작
    - "모두 읽음" 텍스트 버튼 (`AppColors.primary500`)
    - 설정 아이콘 (`Icons.settings_outlined`) — `/notifications/settings`로 이동(F12-03 진입점)
  - 상단 인라인 권한 배너 (`FcmPermissionBanner`) — F12-06이 담당. `denied`일 때만 노출
  - 본문: 날짜 그룹 헤더 (`오늘` / `어제` / `이번 주` / `이전`)와 알림 아이템 리스트
  - 알림 아이템 한 줄 구성:
    - 좌측 4px 우선순위 컬러 바 (p1=`AppColors.warning500`, p2=transparent)
    - 40x40 원형 타입 아이콘 (`_resolveNotificationIcon` — 17 카테고리 매핑)
    - 우선순위 칩 ("주의" — p1만), 제목, 메시지(2줄 ellipsis), 상대 시간 ("방금"/"N분 전"/"N시간 전"/"N일 전"/"M/D")
    - 미읽음 우측 8px 점 (`AppColors.primary500`), 미읽음 시 배경 `#F0F4FF`, 읽음 시 흰색
- **사용자가 할 수 있는 액션**:
  - 알림 아이템 탭 ▶ `markAsRead(notification.id)` (Optimistic) ▶ `unreadCountNotifierProvider.decrement()` ▶ `NotificationRouter.navigate(...)` 딥링크 이동. 이동 불가 타입은 fallback 바텀시트(`_showDeeplinkFallback`) 노출
  - 좌측 스와이프 (`Dismissible` `endToStart`) ▶ `deleteNotification(id)` ▶ 성공 시 `AppToast.show('알림이 삭제되었습니다')`
  - "모두 읽음" 탭 ▶ `markAllAsRead()` (Optimistic) ▶ `unreadCountNotifierProvider.reset()`
  - 풀투리프레시 (`RefreshIndicator`) ▶ `ref.invalidate(notificationListNotifierProvider)` + `ref.invalidate(unreadCountNotifierProvider)`
  - 무한 스크롤 ▶ 마지막 인덱스 도달 시 `addPostFrameCallback`에서 `loadMore()` 호출, page+1
  - 설정 아이콘 ▶ `context.push('/notifications/settings')`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator()` (스켈레톤 아님)
  - 에러: `AppErrorState.fromError(error: ..., onRetry: ...)`
  - 빈 상태: `Icons.notifications_none` 48px + "알림이 없습니다" (커스텀 인라인, `AppEmptyState` 사용 안 함)
  - 딥링크 실패: 모달 바텀시트 — `Icons.link_off` + "알림을 열 수 없습니다" + "해당 콘텐츠가 삭제되었거나 접근 권한이 없을 수 있습니다." + "확인" 버튼
- **모달/시트/네비게이션**:
  - 알림 탭 → `NotificationRouter.navigate` → `router.go(path)` (path는 알림 type별 결정)
  - 딥링크 실패 → `showModalBottomSheet`
  - 설정 → `context.push` (스택 push, 뒤로가기로 돌아옴)

### API 호출 순서 (Provider/Repository 관점)

1. **화면 진입 시**:
   - `notificationListNotifierProvider` ▶ `NotificationRepository.getNotifications(page=0, size=20)` ▶ `GET /api/v1/notifications`
   - `unreadCountNotifierProvider` ▶ `NotificationRepository.getUnreadCount()` ▶ `GET /api/v1/notifications/unread-count` (응답 `UnreadCountVo` → `int`로 매핑)
   - `fcmPermissionNotifierProvider.refresh()` ▶ FCM SDK `getNotificationSettings()` (서버 호출 없음)

2. **알림 아이템 탭 시**:
   - Optimistic UI: `_items[index] = _items[index].copyWith(isRead: true)` 즉시 반영
   - `NotificationRepository.markAsRead(id)` ▶ `PATCH /api/v1/notifications/{id}/read`
   - 실패 시 rollback (`isRead: false` 복구)
   - `unreadCountNotifierProvider.decrement()` (count - 1)
   - `NotificationRouter.navigate(router, notification)` ▶ 라우터 `go(path)`

3. **"모두 읽음" 탭 시**:
   - Optimistic: 모든 `_items`의 `isRead`를 true로 변경 + state 업데이트
   - `NotificationRepository.markAllAsRead()` ▶ `PATCH /api/v1/notifications/read-all`
   - 실패 시 원본 리스트로 rollback
   - `unreadCountNotifierProvider.reset()` (0)

4. **스와이프 삭제 시**:
   - `NotificationRepository.deleteNotification(id)` ▶ `DELETE /api/v1/notifications/{id}`
   - 성공 시 `_items.removeWhere(...)` + AsyncData 갱신, `AppToast` 노출
   - 실패 시 토스트 미노출(현 구현은 false 반환만)

5. **무한 스크롤**:
   - `loadMore()` ▶ 다음 페이지 `getNotifications(page=N+1)` ▶ `_items.addAll(data.content)` ▶ AsyncData 갱신
   - `data.last == true`이면 `_hasMore=false`로 추가 호출 중단

6. **풀투리프레시**:
   - `ref.invalidate(notificationListNotifierProvider)` → `build()`가 다시 실행되어 `_currentPage=0`, `_items.clear()` 후 page=0 재호출
   - `ref.invalidate(unreadCountNotifierProvider)` 도 동시에

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 누적된 알림 일괄 정리 후 한 건 딥링크 진입 (Happy Path) | 로그인됨, 하단 탭 알림 배지 "12" | 모든 알림 읽음 처리됨, 사용자는 이벤트 상세에 위치, 하단 탭 알림 배지 0 |
| S2 | 푸시 알림 수신 직후 인앱 인박스에서 진입 (Foreground) | 알림 화면을 보고 있는 중 (포그라운드) | 해당 알림 읽음, 호스트는 신청자 관리 화면 |
| S3 | 좌측 스와이프 삭제 + Undo 부재 | 정리 강박 사용자 | 알림 영구 삭제, 복구 불가 |
| S4 | 다른 사용자의 알림에 접근 시도 (방어 케이스) | 클라이언트 변조 / API 디버깅 도중 | 알림 변경 없음, 클라 UI 원복 |
| S5 | 무한 스크롤 끝 도달 | 알림 100개 누적된 헤비 유저 | 모든 알림 로드 완료 |
| S6 | 딥링크 실패 — referenceId 없는 알림 탭 | REVIEW_NUDGE 알림인데 dataJson에 eventId 누락 (서버 버그 또는 데이터 손상) | 알림 읽음, 사용자는 알림 화면에 머무름 |

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
| 후보 | frontend.md:26 | - 우선순위 칩 ("주의" — p1만), 제목, 메시지(2줄 ellipsis), 상대 시간 ("방금"/"N분 전"/"N시간 전"/"N일 전"/"M/D") | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:85 | - p1 (좌측 노란 바 + "주의" 칩): `PAYMENT_FAILED`, `CHARGE_FAILED`, `SETTLEMENT_FAILED`, `SETTLEMENT_REJECTED`, `WITHDRAWAL_REJECTED`, `MEETING_SETTLEMENT_EXPIRED`, `MEETING_SETTLEMENT_CANCELLED`, `SETTLEMENT_CORRECTION_PENDING`, `REFUND_PG_FAILED` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:89 | - **토스트 메시지**: "알림이 삭제되었습니다" (성공 시), 삭제 실패 메시지 미정 (현재 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:46 | 5. 실수로 삭제했음 — 현재 구현은 Undo 액션 미제공 (스펙 27-notification.md는 Undo 언급하나 코드 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 누적된 알림 일괄 정리 후 한 건 딥링크 진입 (Happy Path)**: Given 로그인됨, 하단 탭 알림 배지 "12" When 사용자가 해당 흐름을 실행하면 Then 모든 알림 읽음 처리됨, 사용자는 이벤트 상세에 위치, 하단 탭 알림 배지 0
- **AC-02. 푸시 알림 수신 직후 인앱 인박스에서 진입 (Foreground)**: Given 알림 화면을 보고 있는 중 (포그라운드) When 사용자가 해당 흐름을 실행하면 Then 해당 알림 읽음, 호스트는 신청자 관리 화면
- **AC-03. 좌측 스와이프 삭제 + Undo 부재**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 알림 영구 삭제, 복구 불가
- **AC-04. 다른 사용자의 알림에 접근 시도 (방어 케이스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 알림 변경 없음, 클라 UI 원복
- **AC-05. 무한 스크롤 끝 도달**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 모든 알림 로드 완료
- **AC-06. 딥링크 실패 — referenceId 없는 알림 탭**: Given REVIEW_NUDGE 알림인데 dataJson에 eventId 누락 (서버 버그 또는 데이터 손상) When 사용자가 해당 흐름을 실행하면 Then 알림 읽음, 사용자는 알림 화면에 머무름

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
