# F12-02. 알림 그룹 보기 & 미읽음 배지 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

알림 인박스가 누적되면 같은 유형(`groupKey` = `NotificationType.name()`)으로 묶어 카드 한 줄에 요약하는 그룹 뷰 데이터를 서버가 제공한다. F12-01의 페이지 조회와 동일한 데이터원을 쓰되 클라이언트가 type별로 그룹핑하기 쉽게 `NotificationGroupVo` 리스트로 가공해 내려준다. 미읽음 배지 데이터원(`/unread-count`)은 F12-01과 공유되지만, 본 단위에서는 하단 탭 4번 알림 아이콘 위에 노출되는 사용 맥락이 핵심이다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 본 기능은 F12-01과 같은 화면 안에서 토글로 활성화된다 — 별도 라우트 없음
- 진입 자체는 F12-01과 동일 (`/notifications` 탭 또는 `context.go('/notifications')`)
- 미읽음 배지는 하단 5탭 중 4번째(`알림`) 아이콘 위에 위치 — 본 단위는 데이터원(`unreadCountNotifierProvider`) 제공만 담당, 실제 배지 위젯은 라우터/탭 컴포넌트(외부 단위)가 그림

## 2. 코드 위치

계약의 정본은 코드다. 서버: `NotificationController`, `NotificationGroupVo`, `NotificationService`. 앱: `notification_list_screen.dart`.

<!-- source-references:start -->
서버 창구: `NotificationController#getGroupedNotifications`, `NotificationController#getUnreadCount`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 그룹 보기는 같은 종류의 알림을 한 카드로 묶는다. 카드에는 종류 이름, 가장 최근 알림의 제목, 총 개수, 읽지 않은 수(1 이상일 때만 칩)가 보이고, 읽지 않은 것이 있으면 카드 배경이 달라진다.
- 그룹 카드를 누르면 가장 최근 알림 하나만 읽음 처리되어 이동한다. 그룹 전체가 읽음이 되지는 않는다.
- 묶는 범위는 한 번에 받은 쪽(20건) 안이라, 더 오래된 같은 종류는 다른 카드가 될 수 있다.
- 그룹 보기와 목록 보기의 전환은 알림 화면 상단 아이콘으로 한다.
- 하단 탭의 알림 배지는 읽지 않은 수가 0이면 보이지 않고, 앱을 열 때 서버에서 받는다. 알림을 읽거나 모두 읽음 하면 서버 재조회 없이 바로 줄고, 앱이 열려 있는 중 푸시가 오면 서버에서 다시 받는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 같은 클럽 공지가 5개 누적되어 그룹 뷰로 한눈에 정리 | 일주일 동안 클럽 공지(CLUB_ANNOUNCEMENT) 5건, 클럽 가입 요청(CLUB_JOIN_REQUEST) 2건, 결제 완료 1건이 인박스에 누적 | 가장 최근 공지 1건 읽음, 나머지 4건은 그대로. 하단 탭 배지 7 |
| S2 | 미읽음 배지 자동 갱신 (포그라운드 FCM 수신) | 알림 화면 외부(예: 홈), 하단 탭 알림 배지 "0" | 사용자가 배지 변화로 새 알림을 인지, 인앱 배너 또는 알림 탭 진입으로 처리 가능 |
| S3 | 미읽음 배지 즉시 감소 (Optimistic, 서버 재호출 없음) | 알림 5건, 모두 미읽음, 배지 "5" | 일관성 유지, 네트워크 비용 절약 |
| S4 | 그룹 뷰에서 무한 스크롤 한계 | grouped 뷰 활성화 | 사용자가 페이지 1 안의 그룹만 본 상태 |
| S5 | 빈 인박스 상태 | 알림 0건, 배지 미노출 | 사용자가 인박스가 비어있음을 인지 |
| S6 | 그룹 카드 탭 후 전체가 읽음 처리되지 않음 (현 구현 한계) | bora 로그인 직후 메인 셸. `unreadCountNotifierProvider` / `notificationListNotifierProvider` 모두 미초기화 | 그룹 단위 일괄 읽음을 원한다면 사용자가 별도로 "모두 읽음"(F12-01) 사용해야 함 |

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
