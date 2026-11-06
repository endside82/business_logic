# F12-01. 알림 목록 조회 & 읽음 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 자신에게 적재된 모든 인박스 알림을 시간 역순으로 페이지네이션 조회하고, 미읽음 수를 별도 가벼운 호출로 받아 하단 탭 배지에 노출하며, 개별/일괄 읽음 처리와 개별 삭제로 인박스를 정리할 수 있게 하는 다섯 개의 엔드포인트 묶음이다. 모든 처리는 `userId` 단일 소유자 조건을 강제하며, 새 알림 발송 자체는 다른 도메인이 트리거하므로 본 단위는 "수신부 인박스" 역할만 수행한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 4번 "알림" 탭 (`Routes.notifications` = `/notifications`) — `StatefulShellRoute` 5개 탭 중 4번째
- 다른 화면(예: 홈 앱바의 알림 아이콘 등)에서 `context.go('/notifications')` 직접 이동 가능
- 푸시 알림 탭(터미네이트→오픈 / 백그라운드→오픈) 흐름은 `PushNotificationService.onNotificationTapped` → `NotificationRouter.resolve(notification)` 결과 경로로 직접 이동(이 화면을 거치지 않음). 다만 인앱 배너의 ‘알림함 보기' 등 fallback 진입은 본 화면

## 2. 코드 위치

계약의 정본은 코드다. 서버: `NotificationController`, `NotificationType`, `NotificationService`. 앱: `notification_list_screen.dart`, `notification_router.dart`.

<!-- source-references:start -->
서버 창구: `NotificationController#getNotifications`, `NotificationController#getUnreadCount`, `NotificationController#markAsRead`, `NotificationController#markAllAsRead`, `NotificationController#deleteNotification`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 알림함은 내 알림만 최신순으로 20건씩 보여 주고 아래로 내리면 다음 쪽을 불러온다(마지막 쪽이면 멈춘다). 남의 알림을 읽음 처리하거나 지우려 하면 거절되고 화면은 원래대로 돌아간다.
- 알림을 누르면 읽음 처리와 함께 해당 화면으로 이동한다. 읽음 표시와 미읽음 수는 먼저 화면에 반영하고, 서버 요청이 실패하면 되돌린다. 「모두 읽음」 도 같고 미읽음 수는 0이 된다.
- 삭제는 알림을 왼쪽으로 밀어서 하고 영구 삭제이며 되돌리기는 없다. 삭제되면 「알림이 삭제되었습니다」 토스트가 나오고, 실패하면 별도 안내 없이 목록이 그대로다.
- 이동할 화면을 찾지 못한 알림은 읽음 처리한 뒤 「알림을 열 수 없습니다 / 해당 콘텐츠가 삭제되었거나 접근 권한이 없을 수 있습니다」 창을 보여 준다.
- 일정 변경 제안 알림(이벤트 변경 알림 중 제안 종류)은 참가자 응답 화면으로 바로 가고, 변경 확정이나 자동 변경 알림은 이벤트 상세로 간다.
- 푸시 알림을 누르면 알림함을 거치지 않고 해당 화면으로 바로 간다.
- 목록은 오늘, 어제, 이번 주, 이전으로 묶어 보이고, 미읽음은 점과 옅은 배경으로 구분한다. 결제 실패나 정산 거절처럼 사용자가 조치해야 하는 알림은 「주의」 표시와 강조 막대가 붙는다. 시각은 방금, N분 전, N시간 전, N일 전, 그 이상은 월/일이다.
- 알림이 없으면 「알림이 없습니다」 안내가 나온다. 아래로 당겨 목록과 미읽음 수를 새로 받는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 누적된 알림 일괄 정리 후 한 건 딥링크 진입 (Happy Path) | 로그인됨, 하단 탭 알림 배지 "12" | 모든 알림 읽음 처리됨, 사용자는 이벤트 상세에 위치, 하단 탭 알림 배지 0 |
| S2 | 푸시 알림 수신 직후 인앱 인박스에서 진입 (Foreground) | 알림 화면을 보고 있는 중 (포그라운드) | 해당 알림 읽음, 호스트는 신청자 관리 화면 |
| S3 | 좌측 스와이프 삭제 + Undo 부재 | 정리 강박 사용자 | 알림 영구 삭제, 복구 불가 |
| S4 | 다른 사용자의 알림에 접근 시도 (방어 케이스) | 클라이언트 변조 / API 디버깅 도중 | 알림 변경 없음, 클라 UI 원복 |
| S5 | 무한 스크롤 끝 도달 | 알림 100개 누적된 헤비 유저 | 모든 알림 로드 완료 |
| S6 | 딥링크 실패 — referenceId 없는 알림 탭 | REVIEW_NUDGE 알림인데 dataJson에 eventId 누락 (서버 버그 또는 데이터 손상) | 알림 읽음, 사용자는 알림 화면에 머무름 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Risk | frontend.md:26 | 우선순위 칩("주의" — p1만): `PAYMENT_FAILED`, `CHARGE_FAILED`, `SETTLEMENT_FAILED`, `SETTLEMENT_REJECTED`, `WITHDRAWAL_REJECTED`, `MEETING_SETTLEMENT_EXPIRED`, `MEETING_SETTLEMENT_CANCELLED`, `SETTLEMENT_CORRECTION_PENDING`, `REFUND_PG_FAILED` — 신규 타입(77~96)은 p1 분류 미확인 | 신규 알림 타입의 priority 분류 코드 확인 후 `_resolveNotificationIcon` 갱신 |
| Gap | frontend.md:89 | 삭제 실패 메시지 미정 — 현재 구현은 `false` 반환만, 토스트 없음 | 삭제 실패 토스트 문구 확정 후 구현 |
| Gap | scenarios.md:46 | Undo 미구현 — 스펙 27-notification.md는 Undo 언급하나 코드 미구현 | Decision Needed: Undo 제공 여부 결정 |
| Gap (P1) — 부분 해소(2026-06-06) | dossier 01 §3-E-4, dossier 09 §2-8 | **분쟁 딥링크**: `REFUND_DISPUTE_CREATED(92)`/`UPHELD(93)`/`OVERTURNED(94)`는 **배선 완료** — `data.disputeId`로 `REFUND_DISPUTE:{id}` caseId 조립 후 `/me/disputes/:caseId` 이동(앱 enum에도 3종 등재). **사실 정정**: `USER_DISPUTE`·`CLUB_MEMBERSHIP_ACTION`·`DATE_BLOCK`은 서버 분쟁 caseId prefix로만 존재하며 **사용자 알림 NotificationType(분쟁 계열은 92~94 REFUND_DISPUTE 3종뿐)·발송 경로 자체가 없다**(`DomainOutboxEventMapper`에서 `case DISPUTE -> unsupported()`, SLA 스캐너는 `OperatorAlertService`로 운영자 경보만 발행). 따라서 "잔존 미배선 딥링크"가 아니라, 라우팅에 앞서 **서버 사용자 알림 타입·발송 경로 신설이 선행돼야 하는 영역**이다 | (선행) 서버에 해당 분쟁 사용자 알림 타입·발송 경로 신설 → 이후 caseId prefix 조립·`/me/disputes/:caseId` 라우팅 추가 |
| Gap | dossier 09 §2-8 | 카풀(77~80)/버스(81~82) 알림 딥링크 미배선 — `isNavigable` 목록에 없음, `resolve()` switch에 없음 | 카풀/버스 화면 라우트 연결 |
| Gap | dossier 09 §2-8 | `SAFETY_CHECKIN_REMINDER(61)`, `EVENT_PREPAYMENT_*(71~76, 83)`, `REFUND_*(84~95)` 대부분 딥링크 미배선 | 각 도메인 화면 라우트 연결 또는 정보성 처리 확정 |

## 9. 수용 기준

- **AC-01. 누적된 알림 일괄 정리 후 한 건 딥링크 진입 (Happy Path)**: Given 로그인됨, 하단 탭 알림 배지 "12" When 사용자가 해당 흐름을 실행하면 Then 모든 알림 읽음 처리됨, 사용자는 이벤트 상세에 위치, 하단 탭 알림 배지 0
- **AC-02. 푸시 알림 수신 직후 인앱 인박스에서 진입 (Foreground)**: Given 알림 화면을 보고 있는 중 (포그라운드) When 사용자가 해당 흐름을 실행하면 Then 해당 알림 읽음, 호스트는 신청자 관리 화면
- **AC-03. 좌측 스와이프 삭제 + Undo 부재**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 알림 영구 삭제, 복구 불가
- **AC-04. 다른 사용자의 알림에 접근 시도 (방어 케이스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 알림 변경 없음, 클라 UI 원복
- **AC-05. 무한 스크롤 끝 도달**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 모든 알림 로드 완료
- **AC-06. 딥링크 실패 — referenceId 없는 알림 탭**: Given REVIEW_NUDGE 알림인데 dataJson에 eventId 누락 (서버 버그 또는 데이터 손상) When 사용자가 해당 흐름을 실행하면 Then 알림 읽음, 사용자는 알림 화면에 머무름
