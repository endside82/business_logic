# F12-02. 알림 그룹 보기 & 미읽음 배지 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/12_notification/F12-02_notification-grouped-badge -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/12_notification/F12-02_notification-grouped-badge`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

알림 인박스가 누적되면 같은 유형(`groupKey` = `NotificationType.name()`)으로 묶어 카드 한 줄에 요약하는 그룹 뷰 데이터를 서버가 제공한다. F12-01의 페이지 조회와 동일한 데이터원을 쓰되 클라이언트가 type별로 그룹핑하기 쉽게 `NotificationGroupVo` 리스트로 가공해 내려준다. 미읽음 배지 데이터원(`/unread-count`)은 F12-01과 공유되지만, 본 단위에서는 하단 탭 4번 알림 아이콘 위에 노출되는 사용 맥락이 핵심이다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 본 기능은 F12-01과 같은 화면 안에서 토글로 활성화된다 — 별도 라우트 없음
- 진입 자체는 F12-01과 동일 (`/notifications` 탭 또는 `context.go('/notifications')`)
- 미읽음 배지는 하단 5탭 중 4번째(`알림`) 아이콘 위에 위치 — 본 단위는 데이터원(`unreadCountNotifierProvider`) 제공만 담당, 실제 배지 위젯은 라우터/탭 컴포넌트(외부 단위)가 그림

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/12_notification/F12-02_notification-grouped-badge/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/12_notification/F12-02_notification-grouped-badge/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/12_notification/F12-02_notification-grouped-badge/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/12_notification/F12-02_notification-grouped-badge/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:43` | 확인됨 |
| `community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java:52` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **그룹 뷰 진입(토글) 시**:
   - `groupedNotificationsProvider` (FutureProvider) ▶ `NotificationRepository.getGroupedNotifications(page=0, size=20)` ▶ `GET /api/v1/notifications/grouped?page=0&size=20`
   - 토글 자체로는 호출하지 않음 — provider 첫 watch 시 자동 build

2. **그룹 카드 탭 시**:
   - `_onNotificationTap(group.latestNotification!)` ▶ F12-01의 markAsRead 흐름 + Optimistic + 딥링크 이동
   - `_items` 리스트(flat 뷰)는 갱신되지 않음 — 그룹 데이터원은 별도 provider이므로 다음 invalidate까지 stale

3. **풀투리프레시 시**:
   - `ref.invalidate(groupedNotificationsProvider)` → `getGroupedNotifications` 재호출
   - `ref.invalidate(unreadCountNotifierProvider)` 동시에

4. **하단 탭 배지**:
   - 앱 시작 시 `unreadCountNotifierProvider` 자동 build → `getUnreadCount`
   - F12-01의 markAsRead/markAllAsRead 시 클라이언트가 `decrement()`/`reset()` 호출 — 서버 재호출 없이 즉시 반영
   - 포그라운드 FCM 수신 시 `ref.invalidate(unreadCountNotifierProvider)` → 서버 재호출

## 4. 서버 계약

### 개요

알림 인박스가 누적되면 같은 유형(`groupKey` = `NotificationType.name()`)으로 묶어 카드 한 줄에 요약하는 그룹 뷰 데이터를 서버가 제공한다. F12-01의 페이지 조회와 동일한 데이터원을 쓰되 클라이언트가 type별로 그룹핑하기 쉽게 `NotificationGroupVo` 리스트로 가공해 내려준다. 미읽음 배지 데이터원(`/unread-count`)은 F12-01과 공유되지만, 본 단위에서는 하단 탭 4번 알림 아이콘 위에 노출되는 사용 맥락이 핵심이다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/notifications/grouped | NotificationController#getGroupedNotifications | required | 알림을 groupKey 단위로 묶은 카드 리스트 반환 |
| GET | /api/v1/notifications/unread-count | NotificationController#getUnreadCount | required | 하단 탭 배지에 쓰일 미읽음 수 반환 (F12-01과 공유) |

### 도메인 모델 / Enum (이 기능 관련)

- `Notification.groupKey` (`varchar(100)`) — 알림 적재 시 `notification.setGroupKey(type.name())`로 자동 채워짐 (`NotificationService#createNotification`/`createBatchNotifications` 양쪽). 그룹키 기준 = 알림 타입(EVENT_REMINDER 등)
- `NotificationGroupVo` (`vo/NotificationGroupVo.java`):
  - `String groupKey`
  - `NotificationVo latestNotification`
  - `int totalCount`
  - `int unreadCount`
- 동일한 `NotificationVo` 스펙은 F12-01 참조

### 의존 단위 / 외부 시스템

- **이 API를 호출하는 다른 단위**: 없음 (클라이언트만)
- **본 단위가 의존**: F12-01과 동일한 `notification` 테이블/`Notification` 엔티티/`groupKey` 채우기는 알림 적재 시점(다른 도메인 호출)에 결정됨
- **외부**: 없음 (서버는 FCM 등 외부 호출 없이 DB 조회만)

## 5. 프론트 계약

### 진입 경로

- 본 기능은 F12-01과 같은 화면 안에서 토글로 활성화된다 — 별도 라우트 없음
- 진입 자체는 F12-01과 동일 (`/notifications` 탭 또는 `context.go('/notifications')`)
- 미읽음 배지는 하단 5탭 중 4번째(`알림`) 아이콘 위에 위치 — 본 단위는 데이터원(`unreadCountNotifierProvider`) 제공만 담당, 실제 배지 위젯은 라우터/탭 컴포넌트(외부 단위)가 그림

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/notifications` | `presentation/notification/screens/notification_list_screen.dart` (F12-01과 공유) | `_isGrouped=true`일 때 그룹 카드 뷰 노출 |

### 화면별 구성 요소 & 액션

### 알림 목록 — 그룹 뷰 (`notification_list_screen.dart`의 `_buildGroupedView`)
- **사용자가 보는 것**:
  - 앱바 우측 토글 아이콘: `_isGrouped == false` → `Icons.workspaces_outline`(그룹 진입), `_isGrouped == true` → `Icons.view_list`(리스트 복귀). `TestId(id: TestIds.screenNotificationsToggleGrouped)`
  - 본문: `ListView.separated`(`AppSpacing.screenPadding` 모두 적용) — 그룹 카드 리스트
  - 그룹 카드 한 장 구성:
    - 36x36 원형 타입 아이콘 (`_resolveNotificationIcon(group.groupKey)` — F12-01의 매핑 재사용)
    - `_groupLabel(groupKey)` — type을 한국어 라벨로 변환 (예: `EVENT_REMINDER` → "이벤트 알림", `PAYMENT_FAILED` → "결제 실패", 50종 매핑은 `_notificationTypeLabel` static 메서드)
    - 우측 미읽음 카운트 칩 (`unreadCount > 0`일 때만, `AppColors.primary500` 배경 + 흰 텍스트)
    - 최신 알림 제목 또는 message (1줄 ellipsis, secondary 색)
    - "총 N개" 텍스트 (overline, tertiary)
  - 미읽음 ≥1: 카드 배경 `Color(0xFFF0F4FF)`, 미읽음 0: 카드 배경 `AppSemanticColors.surfaceCard` (흰색)
  - 카드 테두리: `AppSemanticColors.borderDefault`, 라운드 12px
- **사용자가 할 수 있는 액션**:
  - 그룹/리스트 토글 ▶ `setState(() => _isGrouped = !_isGrouped)` (서버 호출 없음, 보유 데이터로 즉시 전환)
  - 그룹 카드 탭 ▶ `_onNotificationTap(group.latestNotification)` ▶ F12-01과 동일하게 markAsRead + 딥링크 이동 (가장 최신 알림 기준)
  - 풀투리프레시 ▶ `ref.invalidate(groupedNotificationsProvider)` + `ref.invalidate(unreadCountNotifierProvider)`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator()`
  - 에러: `AppErrorState.fromError(error: ..., onRetry: () => ref.invalidate(groupedNotificationsProvider))`
  - 빈 상태: F12-01과 동일한 인라인 `Icons.notifications_none` + "알림이 없습니다"
- **모달/시트/네비게이션**: F12-01과 동일 (그룹 탭 → markAsRead → NotificationRouter)

### 하단 탭 4번 미읽음 배지
- 라우터/탭 컴포넌트는 본 단위 외부 (presentation/common/navigation 또는 router에서 처리). 단, 데이터원은 `unreadCountNotifierProvider`로 본 단위에서 제공
- 시각화: 0이면 미노출, ≥1이면 빨간 동그라미 + 숫자(외부 단위 책임)

### API 호출 순서 (Provider/Repository 관점)

1. **그룹 뷰 진입(토글) 시**:
   - `groupedNotificationsProvider` (FutureProvider) ▶ `NotificationRepository.getGroupedNotifications(page=0, size=20)` ▶ `GET /api/v1/notifications/grouped?page=0&size=20`
   - 토글 자체로는 호출하지 않음 — provider 첫 watch 시 자동 build

2. **그룹 카드 탭 시**:
   - `_onNotificationTap(group.latestNotification!)` ▶ F12-01의 markAsRead 흐름 + Optimistic + 딥링크 이동
   - `_items` 리스트(flat 뷰)는 갱신되지 않음 — 그룹 데이터원은 별도 provider이므로 다음 invalidate까지 stale

3. **풀투리프레시 시**:
   - `ref.invalidate(groupedNotificationsProvider)` → `getGroupedNotifications` 재호출
   - `ref.invalidate(unreadCountNotifierProvider)` 동시에

4. **하단 탭 배지**:
   - 앱 시작 시 `unreadCountNotifierProvider` 자동 build → `getUnreadCount`
   - F12-01의 markAsRead/markAllAsRead 시 클라이언트가 `decrement()`/`reset()` 호출 — 서버 재호출 없이 즉시 반영
   - 포그라운드 FCM 수신 시 `ref.invalidate(unreadCountNotifierProvider)` → 서버 재호출

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 같은 클럽 공지가 5개 누적되어 그룹 뷰로 한눈에 정리 | 일주일 동안 클럽 공지(CLUB_ANNOUNCEMENT) 5건, 클럽 가입 요청(CLUB_JOIN_REQUEST) 2건, 결제 완료 1건이 인박스에 누적 | 가장 최근 공지 1건 읽음, 나머지 4건은 그대로. 하단 탭 배지 7 |
| S2 | 미읽음 배지 자동 갱신 (포그라운드 FCM 수신) | 알림 화면 외부(예: 홈), 하단 탭 알림 배지 "0" | 사용자가 배지 변화로 새 알림을 인지, 인앱 배너 또는 알림 탭 진입으로 처리 가능 |
| S3 | 미읽음 배지 즉시 감소 (Optimistic, 서버 재호출 없음) | 알림 5건, 모두 미읽음, 배지 "5" | 일관성 유지, 네트워크 비용 절약 |
| S4 | 그룹 뷰에서 무한 스크롤 한계 | grouped 뷰 활성화 | 사용자가 페이지 1 안의 그룹만 본 상태 |
| S5 | 빈 인박스 상태 | 알림 0건, 배지 미노출 | 사용자가 인박스가 비어있음을 인지 |
| S6 | 그룹 카드 탭 후 전체가 읽음 처리되지 않음 (현 구현 한계) | bora 로그인 직후 메인 셸. `unreadCountNotifierProvider` / `notificationListNotifierProvider` 모두 미초기화 | 그룹 단위 일괄 읽음을 원한다면 사용자가 별도로 "모두 읽음"(F12-01) 사용해야 함 |

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
| 후보 | backend.md:40 | - **주의**: 페이지 단위 그룹핑이므로 `page=0,size=20` 안의 알림 20건만 그룹핑됨. 21번째 이후 알림은 같은 type이어도 별 그룹으로 잡히지 않음(클라가 무한스크롤로 추가 호출하면 매 호출마다 별도 그룹 리스트가 반환됨) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:71 | - **그룹 단위**: 페이지 단위(20건) 그룹핑 — 무한스크롤 미구현(현재). 그룹 카드 갯수는 페이지당 1~20개 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:51 | 3. 현재 구현은 grouped 뷰에 무한 스크롤 미구현 — `ListView.separated`만 그림, page 추가 호출 없음 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 같은 클럽 공지가 5개 누적되어 그룹 뷰로 한눈에 정리**: Given 일주일 동안 클럽 공지(CLUB_ANNOUNCEMENT) 5건, 클럽 가입 요청(CLUB_JOIN_REQUEST) 2건, 결제 완료 1건이 인박스에 누적 When 사용자가 해당 흐름을 실행하면 Then 가장 최근 공지 1건 읽음, 나머지 4건은 그대로. 하단 탭 배지 7
- **AC-02. 미읽음 배지 자동 갱신 (포그라운드 FCM 수신)**: Given 알림 화면 외부(예: 홈), 하단 탭 알림 배지 "0" When 사용자가 해당 흐름을 실행하면 Then 사용자가 배지 변화로 새 알림을 인지, 인앱 배너 또는 알림 탭 진입으로 처리 가능
- **AC-03. 미읽음 배지 즉시 감소 (Optimistic, 서버 재호출 없음)**: Given 알림 5건, 모두 미읽음, 배지 "5" When 사용자가 해당 흐름을 실행하면 Then 일관성 유지, 네트워크 비용 절약
- **AC-04. 그룹 뷰에서 무한 스크롤 한계**: Given grouped 뷰 활성화 When 사용자가 해당 흐름을 실행하면 Then 사용자가 페이지 1 안의 그룹만 본 상태
- **AC-05. 빈 인박스 상태**: Given 알림 0건, 배지 미노출 When 사용자가 해당 흐름을 실행하면 Then 사용자가 인박스가 비어있음을 인지
- **AC-06. 그룹 카드 탭 후 전체가 읽음 처리되지 않음 (현 구현 한계)**: Given bora 로그인 직후 메인 셸. `unreadCountNotifierProvider` / `notificationListNotifierProvider` 모두 미초기화 When 사용자가 해당 흐름을 실행하면 Then 그룹 단위 일괄 읽음을 원한다면 사용자가 별도로 "모두 읽음"(F12-01) 사용해야 함

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
