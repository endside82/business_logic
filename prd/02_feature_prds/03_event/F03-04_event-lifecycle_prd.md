# F03-04. 이벤트 수정/생명주기 관리 (호스트) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-04_event-lifecycle -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-04_event-lifecycle`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트/공동호스트가 이벤트의 메타데이터를 수정하거나 상태를 전이시킨다. 상태 전이는 `DRAFT → OPEN → CLOSED|CANCELED`만 합법이며 엔티티의 `Event#publish()/close()/cancel()` 메서드가 검증한다. 일정 변경은 OPEN 상태에서만 가능하고 변경 즉시 참석자/대기자에게 FCM 알림을 발송한다. 취소 시 유료 이벤트는 ATTENDING 사용자에게 100% 환불(Unit 06 위임)을 시도하고 실패한 건은 `failed_refund` 테이블에 기록한다. 호스트는 참석자 전체에게 공지(`announce`)를 일괄 발송할 수 있다 (throttle 적용).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 호스트 액션바 또는 더보기 메뉴
- 마이 이벤트(F03-12) "주최 중" 탭 ▶ 카드 ▶ 상세 ▶ 호스트 액션바
- 알림(F12) "환불 실패" 또는 "변경 알림" 탭 ▶ 상세

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-04_event-lifecycle/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-04_event-lifecycle/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-04_event-lifecycle/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-04_event-lifecycle/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:103` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:112` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:122` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:130` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:138` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:146` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:236` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:248` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:283` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 권한 확인: `eventPermissionProvider(eventId)` — host/coHost/staff 여부
2. 발행: `eventLifecycleNotifierProvider.publishEvent(id)`
   - `EventRepository.publishEvent` ▶ `POST .../publish`
   - 성공 → `eventDetailNotifier(id).invalidate()` + `eventListNotifier.invalidate()`
3. 종료: `eventLifecycleNotifierProvider.closeEvent(id)` ▶ `POST .../close`
4. 취소: `eventLifecycleNotifierProvider.cancelEvent(id)` ▶ `POST .../cancel` (백엔드에서 환불 + 알림 일괄 처리, 클라는 결과만 반영)
5. 삭제: `eventLifecycleNotifierProvider.deleteEvent(id)` ▶ `DELETE /api/v1/events/{id}`
6. 메타 수정 (DRAFT): `eventEditNotifierProvider(id).submit()` ▶ `PATCH /api/v1/events/{id}`
7. 일정 변경: `EventRepository.rescheduleEvent(id, EventRescheduleParam)` ▶ `PATCH .../reschedule`
8. 공지 발송: `eventAnnounceNotifierProvider.announce(id, EventAnnounceParam)` ▶ `POST .../announce`
9. 반복 일괄 수정/취소: `recurringEventProvider`(가정) ▶ `PATCH /DELETE .../recurring`

## 4. 서버 계약

### 개요

호스트/공동호스트가 이벤트의 메타데이터를 수정하거나 상태를 전이시킨다. 상태 전이는 `DRAFT → OPEN → CLOSED|CANCELED`만 합법이며 엔티티의 `Event#publish()/close()/cancel()` 메서드가 검증한다. 일정 변경은 OPEN 상태에서만 가능하고 변경 즉시 참석자/대기자에게 FCM 알림을 발송한다. 취소 시 유료 이벤트는 ATTENDING 사용자에게 100% 환불(Unit 06 위임)을 시도하고 실패한 건은 `failed_refund` 테이블에 기록한다. 호스트는 참석자 전체에게 공지(`announce`)를 일괄 발송할 수 있다 (throttle 적용).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| PATCH | /api/v1/events/{eventId} | EventController#updateEvent | required | DRAFT 메타 수정 |
| DELETE | /api/v1/events/{eventId} | EventController#deleteEvent | required | DRAFT 삭제 |
| POST | /api/v1/events/{eventId}/publish | EventController#publishEvent | required | DRAFT → OPEN |
| POST | /api/v1/events/{eventId}/close | EventController#closeEvent | required | OPEN → CLOSED |
| POST | /api/v1/events/{eventId}/cancel | EventController#cancelEvent | required | OPEN/DRAFT → CANCELED + 환불 + 알림 |
| PATCH | /api/v1/events/{eventId}/reschedule | EventController#rescheduleEvent | required | 일정 변경 (OPEN만) + 참석자 알림 |
| POST | /api/v1/events/{eventId}/announce | EventController#announceToAttendees | required | 참석자 전체 공지 fanout |
| PATCH | /api/v1/events/{eventId}/recurring | EventController#updateFutureEvents | required | 반복 자식 일괄 수정 |
| DELETE | /api/v1/events/{eventId}/recurring | EventController#cancelAllFutureEvents | required | 반복 자식 일괄 취소 |

> **publish는 F03-03에서도 다루지만 호스트 lifecycle의 첫 단계**이므로 본 단위에도 명시. F03-05의 신청 취소는 참가자 시점이라 별도 단위.

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `EventStatus` 전이 (`getAllowedTransitions`):
  - `DRAFT → {OPEN, CANCELED}`
  - `OPEN → {CLOSED, CANCELED}`
  - `CLOSED, CANCELED, HIDDEN → {}` (terminal)
- **Enum** `NotificationType` (Unit 12): `EVENT_UPDATED`, `EVENT_CANCELLED`, `EVENT_ANNOUNCE`, `PAYMENT_FAILED`
- **Enum** `FailedRefundStatus` (Unit 06): `PENDING`, `RETRY`, `RESOLVED`
- **검증**:
  - `EventModParam`: 모든 필드 nullable, `baseCapacity @Min(1)`
  - `EventRescheduleParam`: `newStartTime/newEndTime @NotNull`, `changeReason @NotBlank @Size(max=200)`
  - `EventAnnounceParam`: `title @NotBlank @Size(max=100)`, `message @NotBlank @Size(max=500) @SafeAnnounceContent(maxLinks=2)`

### 의존 단위 / 외부 시스템

- **Unit 06 결제 & 지갑** — `walletService.refundByHostCancel` (취소 시 ATTENDING 100% 환불). 실패 시 `failed_refund` 기록은 본 단위 책임.
- **Unit 12 알림** — `EVENT_UPDATED` (reschedule), `EVENT_CANCELLED` (cancel), `EVENT_ANNOUNCE` (호스트 공지), `PAYMENT_FAILED` (환불 실패 호스트 안내). 모두 FCM 푸시 fanout.
- **Unit 04 클럽** — 클럽 이벤트 수정 시 `clubMeetingValidationService` 권한 가드.
- **Throttle**: `EventAnnounceThrottleService` (Redis Redisson) — 호스트 발신자 1분/일일 카운터.
- **외부**: Firebase FCM (NotificationService 통해), Redis (`eventSearch` 캐시 + announce throttle).

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세(F03-02) ▶ 호스트 액션바 또는 더보기 메뉴
- 마이 이벤트(F03-12) "주최 중" 탭 ▶ 카드 ▶ 상세 ▶ 호스트 액션바
- 알림(F12) "환불 실패" 또는 "변경 알림" 탭 ▶ 상세

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/event/) | 역할 |
|---|---|---|
| `/edit-event/:eventId` | `screens/event_edit_screen.dart` | DRAFT 메타 수정 폼 |
| `/home/events/:eventId` | `screens/event_detail_screen.dart` | 호스트 액션바 + 더보기 + 공지 다이얼로그 |
| `/home/events/:eventId/recurring` | `screens/recurring_event_group_screen.dart` | 반복 자식 일괄 수정/취소 |

호스트 lifecycle 액션은 대부분 **상세 화면의 액션바/더보기/모달**에서 트리거된다. 별도 화면이 거의 없다.

### 화면별 구성 요소 & 액션

### 이벤트 수정 (`event_edit_screen.dart`)

- **사용자가 보는 것**:
  - F03-03 step 폼과 유사한 단일 화면 (펼친 폼)
  - 변경 사항 배지(`DiffBadge`) — 각 필드 옆 "변경됨" 표시
  - 변경 사항 요약(`DiffSummary`) — 하단에 변경 항목 하이라이트
  - 일정 변경 안내 배너 (시작/종료 변경 시 "참석자에게 알림이 발송됩니다")
  - 환불 정책 폼(`RefundPolicyForm`)
  - 저장 버튼 — 변경 사항 있을 때만 활성
- **사용자가 할 수 있는 액션**:
  - 진입 시 `eventEditNotifierProvider(eventId).build()` ▶ `GET /api/v1/events/{id}` (기존값 prefill)
  - `eventPermissionProvider(eventId)` 권한 체크 → 비호스트면 `AppErrorState`
  - 필드 수정 → `EventEditNotifier.update*` → `changedFields` 추적
  - 저장 ▶ `EventEditNotifier.submit()` ▶ `EventRepository.updateEvent` ▶ `PATCH /api/v1/events/{id}` ▶ 성공 시 토스트 + `context.pop()`
- **상태 분기**:
  - 비호스트 진입 → "이벤트 주최자만 수정할 수 있습니다" + "돌아가기"
  - DRAFT만 수정 가능 (서버 기준). OPEN/CLOSED/CANCELED 진입 시 → 백엔드 `INVALID_EVENT_STATUS` (400) → 토스트 + 뒤로가기
  - 변경 사항 없음 → 저장 버튼 비활성

### 이벤트 상세 (`event_detail_screen.dart`) — 호스트 액션 (F03-02 위임 + 본 단위 액션)

- **호스트 액션바** (`event_action_bar.dart`):
  - status=DRAFT → "발행" + "수정" + "삭제"
  - status=OPEN → "수정 안내" + "종료" + "취소" (수정은 reschedule만, 메타 수정은 비활성)
  - status=CLOSED|CANCELED → 모든 액션 비활성, "리뷰 작성" 가능
- **확인 다이얼로그**:
  - 발행: "이벤트를 공개하시겠습니까?" → `EventLifecycleNotifier.publishEvent`
  - 종료: "이벤트를 종료하시겠습니까? 종료 후 변경할 수 없습니다." → `closeEvent`
  - 취소: "이벤트를 취소하시겠습니까? 유료 이벤트는 참가자에게 자동 환불됩니다." → `cancelEvent`
  - 삭제: "임시 저장된 이벤트를 삭제하시겠습니까?" → `deleteEvent`
- **공지 발송 (`event_announce_dialog.dart`)** — 더보기 메뉴 → "공지 보내기":
  - 제목 입력 (≤100), 본문 입력 (≤500, 링크 ≤2개)
  - 발송 ▶ `EventAnnounceNotifier.announce` ▶ `POST .../announce`
  - 성공 → 토스트 "공지가 발송되었습니다" + `notificationListNotifier.invalidate()`
  - 실패 (RATE_LIMIT_EXCEEDED) → "잠시 후 다시 시도해주세요"
- **일정 변경 (reschedule)**:
  - 별도 진입점 (호스트 액션바 또는 수정 화면 내 "일정 변경" 버튼)
  - 다이얼로그: 새 시작/종료 시각, 새 주소(선택), 변경 사유 (필수)
  - ▶ `EventRepository.rescheduleEvent` (Repository 메서드 추가 필요 — 현재 `event_repository.dart`에 정의됨 가정)

### API 호출 순서 (Provider/Repository 관점)

1. 권한 확인: `eventPermissionProvider(eventId)` — host/coHost/staff 여부
2. 발행: `eventLifecycleNotifierProvider.publishEvent(id)`
   - `EventRepository.publishEvent` ▶ `POST .../publish`
   - 성공 → `eventDetailNotifier(id).invalidate()` + `eventListNotifier.invalidate()`
3. 종료: `eventLifecycleNotifierProvider.closeEvent(id)` ▶ `POST .../close`
4. 취소: `eventLifecycleNotifierProvider.cancelEvent(id)` ▶ `POST .../cancel` (백엔드에서 환불 + 알림 일괄 처리, 클라는 결과만 반영)
5. 삭제: `eventLifecycleNotifierProvider.deleteEvent(id)` ▶ `DELETE /api/v1/events/{id}`
6. 메타 수정 (DRAFT): `eventEditNotifierProvider(id).submit()` ▶ `PATCH /api/v1/events/{id}`
7. 일정 변경: `EventRepository.rescheduleEvent(id, EventRescheduleParam)` ▶ `PATCH .../reschedule`
8. 공지 발송: `eventAnnounceNotifierProvider.announce(id, EventAnnounceParam)` ▶ `POST .../announce`
9. 반복 일괄 수정/취소: `recurringEventProvider`(가정) ▶ `PATCH /DELETE .../recurring`

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **확인 다이얼로그 문구**: "취소 시 유료 이벤트는 환불됩니다", "종료된 이벤트는 변경할 수 없습니다" 등 안내 문구는 화면 결정.
- **DiffBadge / DiffSummary**: 어떤 필드가 변경되었는지 시각화 — 화면 결정 (`changedFields` set 추적).
- **호스트 액션바 버튼 조합**:
  - DRAFT: 발행/수정/삭제
  - OPEN: 일정 변경/종료/취소
  - CLOSED: 리뷰 작성/사진첩
  - CANCELED: 비활성
- **공지 다이얼로그 UX**:
  - 본문 글자수 카운터 (500자)
  - 외부 링크 카운터 (≤2개) — 클라이언트 검증 + 서버 `@SafeAnnounceContent`
  - 발송 후 호스트 본인에게는 fanout에서 제외됨을 안내 ("참석자에게 발송됩니다")
- **Reschedule 다이얼로그**:
  - 변경 사유 입력 필수 (200자)
  - 변경 전/후 비교 미리보기
  - "참석자 N명에게 알림이 발송됩니다" 안내
- **취소 확인 추가 안내**: 유료 이벤트면 "참가자 N명에게 X원이 자동 환불됩니다" (참가자 수는 서버에서 currentCapacity로 계산 가능)
- **에러 토스트 매핑**:
  - `RATE_LIMIT_EXCEEDED` (429) → "공지 발송 한도를 초과했습니다"
  - `INVALID_EVENT_STATUS` (400) → "현재 상태에서 수정할 수 없습니다"
  - `EVENT_NOT_OWNER` (403) → "권한이 없습니다"
  - 환불 실패 → 호스트에게 별도 알림 (Unit 12)으로 안내, 화면에서는 단순 "처리 중 일부 환불에 문제가 있어 고객센터에서 처리합니다" 안내
- **권한 가드 화면**: `eventPermissionProvider`로 비호스트 진입 시 `AppErrorState(icon: Icons.block_outlined, title: '접근 권한이 없습니다', description: '이벤트 주최자만 수정할 수 있습니다.', retryLabel: '돌아가기')`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | DRAFT 이벤트 수정 후 발행 (Happy Path) | 마이 이벤트 "주최 중" 탭에서 DRAFT 카드 확인. | 이벤트 OPEN, 목록(F03-01) 노출 시작. |
| S2 | OPEN 이벤트 일정 변경 + 참석자 알림 | 이벤트 OPEN, ATTENDING 6명 + WAITING 2명. | 일정 변경 + 8명 알림 발송. |
| S3 | 유료 이벤트 취소 + 자동 환불 | ATTENDING 4명, WAITING 1명. | 이벤트 CANCELED, 3건 환불 완료, 1건 failed_refund 등록. |
| S4 | 호스트가 참석자 전체 공지 발송 (C-03) | OPEN 이벤트, ATTENDING 10명. | 9명 푸시 수신. |
| S5 | 공지 발송 throttle 초과 | 동일 호스트, 1분 내에 여러 번 공지 시도. | 발송 차단. |
| S6 | DRAFT 이벤트 삭제 | 호스트. | 이벤트 삭제, 마이 이벤트 목록 갱신. |
| S7 | 발행된 이벤트를 삭제 시도 | 호스트. | 액션 차단. |
| S8 | 비호스트의 권한 위반 | 일반 사용자. | 차단. |
| S9 | 일정 변경 시 시간 검증 실패 | 호스트. | 사용자가 시각 재입력. |
| S10 | CLOSED/CANCELED 이벤트 수정 진입 차단 | `event.status ∈ {CLOSED, CANCELED}`. | 수정 진입 차단, 호스트가 다른 흐름으로 이동. |
| S11 | 호스트 위치 공유 안내 화면 | `event.status=OPEN`, 위치 공유 토글 ON 상태. | 호스트가 위치 공유 정책을 명시적으로 확인. |

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
| 후보 | backend.md:152 | - **비즈니스 로직**: `RecurringEventUpdateService#updateFutureEvents` / `RecurringEventCreateService#cancelAllFutureEvents` (서비스 구현 미확인 — 본 단위에서는 진입점만) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:22 | [E2E 보강: seed_event_authoring_surface_test.dart::event_edit_host_surface / ::event_edit_open_lock_notice — 수정 화면 진입 시 "이벤트 수정" 헤더 + 안내 배너 두 줄("수정 시 참여자에게 알림이 발송됩니다", "모집이 시작된 이벤트는 일정과 정원을 변경할 수 없습니다") + "이벤트 제목 *", "카테고리 *" 라벨 노출. 즉 OPEN 상태에서는 일정/정원 필드가 lock 안내와 함께 readonly로 표시.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:172 | > 21차-C P72 가 "F03-04 publish 는 시드 라이프사이클 결정성 약화 위험" 으로 후속 라운드 후보로 명시했던 영역을 22차-B 에서 idempotent via state branching 패턴으로 흡수. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. DRAFT 이벤트 수정 후 발행 (Happy Path)**: Given 마이 이벤트 "주최 중" 탭에서 DRAFT 카드 확인. When 사용자가 해당 흐름을 실행하면 Then 이벤트 OPEN, 목록(F03-01) 노출 시작.
- **AC-02. OPEN 이벤트 일정 변경 + 참석자 알림**: Given 이벤트 OPEN, ATTENDING 6명 + WAITING 2명. When 사용자가 해당 흐름을 실행하면 Then 일정 변경 + 8명 알림 발송.
- **AC-03. 유료 이벤트 취소 + 자동 환불**: Given ATTENDING 4명, WAITING 1명. When 사용자가 해당 흐름을 실행하면 Then 이벤트 CANCELED, 3건 환불 완료, 1건 failed_refund 등록.
- **AC-04. 호스트가 참석자 전체 공지 발송 (C-03)**: Given OPEN 이벤트, ATTENDING 10명. When 사용자가 해당 흐름을 실행하면 Then 9명 푸시 수신.
- **AC-05. 공지 발송 throttle 초과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 발송 차단.
- **AC-06. DRAFT 이벤트 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이벤트 삭제, 마이 이벤트 목록 갱신.
- **AC-07. 발행된 이벤트를 삭제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 액션 차단.
- **AC-08. 비호스트의 권한 위반**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단.
- **AC-09. 일정 변경 시 시간 검증 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 시각 재입력.
- **AC-10. CLOSED/CANCELED 이벤트 수정 진입 차단**: Given `event.status ∈ {CLOSED, CANCELED}`. When 사용자가 해당 흐름을 실행하면 Then 수정 진입 차단, 호스트가 다른 흐름으로 이동.
- **AC-11. 호스트 위치 공유 안내 화면**: Given `event.status=OPEN`, 위치 공유 토글 ON 상태. When 사용자가 해당 흐름을 실행하면 Then 호스트가 위치 공유 정책을 명시적으로 확인.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
