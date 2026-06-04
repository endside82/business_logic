# F07-07. 미납자 리마인드 / 마감 연장 (Remind Unpaid & Extend Deadline) PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/07_meeting_settlement/F07-07_remind-extend -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-07_remind-extend`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트가 ACTIVE 정산의 미납 참가자에게 푸시 리마인드를 발송하거나, 정산 마감 기한을 연장한다. 리마인드는 24시간 가드 + Redisson lock으로 중복 발송을 차단하며, 자동 리마인드(스케줄러)는 마감 후 N시간 경과 시 발동한다. 리마인드 이력 조회도 제공한다 (E-02).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 현황 화면(SCR-MS-002) ACTIVE 상태에서 액션 바의 "독촉" 버튼
- 이체 내역 화면 상단 "미납자 알림" CTA
- (자동 리마인드는 백엔드 스케줄러 — 프론트엔드 진입점 없음)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-07_remind-extend/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-07_remind-extend/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-07_remind-extend/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-07_remind-extend/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:318` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:328` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:336` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

독촉 액션:
1. 현재 transfer/summary 데이터에서 미납자 수 확인
2. 0명이면 토스트만, 1명 이상이면 다이얼로그
3. `meetingSettlementRepository.remind(eventId, MeetingSettlementRemindParam(targetUserIds: null, customMessage: null))` ▶ `POST .../settlement/remind`
4. 성공 시 토스트 "리마인드를 발송했습니다"
5. 실패 (예: NOT_ACTIVE, 403): `showApiErrorToast`

(향후) 마감 연장 액션:
1. 다이얼로그 입력 (시간 + alsoRemind 토글)
2. `extendDeadline(eventId, MeetingSettlementExtendDeadlineParam(hours, alsoRemind))` ▶ `PATCH .../extend-deadline`
3. invalidate `settlementDetailProvider`

(향후) 이력 조회:
1. `remindHistoryProvider(eventId)` ▶ `GET .../remind-history`
2. 리스트 표시 (kind 라벨 한국어)

## 4. 서버 계약

### 개요

호스트가 ACTIVE 정산의 미납 참가자에게 푸시 리마인드를 발송하거나, 정산 마감 기한을 연장한다. 리마인드는 24시간 가드 + Redisson lock으로 중복 발송을 차단하며, 자동 리마인드(스케줄러)는 마감 후 N시간 경과 시 발동한다. 리마인드 이력 조회도 제공한다 (E-02).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/settlement/remind | MeetingSettlementController#remindUnpaid | required | 미납자 푸시 리마인드 발송 (수동) |
| PATCH | /api/v1/events/{eventId}/settlement/extend-deadline | MeetingSettlementController#extendDeadline | required | 마감 연장 (옵션 alsoRemind) |
| GET | /api/v1/events/{eventId}/settlement/remind-history | MeetingSettlementController#getRemindHistory | required | 리마인드 발송 이력 |

### 의존 단위 / 외부 시스템

- Unit 12 (Notification): `NotificationService.createNotificationFromTemplate(MEETING_SETTLEMENT_REMIND template, variables={eventTitle}, fallback...)` — 알림 데이터 `{eventId, settlementId}` JSON
- Unit 03 (Event): `EventRepository.findById` for eventTitle
- 외부 시스템: FCM (푸시), **Redis (Redisson)** — 동시 호출 직렬화 + 자동 리마인드 dedupe

## 5. 프론트 계약

### 진입 경로

- 정산 현황 화면(SCR-MS-002) ACTIVE 상태에서 액션 바의 "독촉" 버튼
- 이체 내역 화면 상단 "미납자 알림" CTA
- (자동 리마인드는 백엔드 스케줄러 — 프론트엔드 진입점 없음)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement` | `settlement_status_screen.dart` | 액션 바에서 "독촉" 진입 |
| `/home/events/:eventId/settlement/transfers` | `transfer_list_screen.dart` | "미납자 알림" 버튼 |
| (위젯) | `widgets/settlement_action_bar_widget.dart` | 액션 바 (DRAFT/ACTIVE 분기) |

### 화면별 구성 요소 & 액션

### 정산 현황 / 이체 내역 — "독촉/미납자 알림" 액션
- **사용자가 보는 것 (호스트, ACTIVE)**:
  - `SettlementActionBarWidget` 안에 "독촉" 버튼 (또는 transfer list 상단 "미납자 알림" CTA)
  - 미납 인원 카운트 표시 (`participants[].allCompleted == false && totalShare > 0`)
- **사용자가 할 수 있는 액션**:
  - "독촉" 탭 ▶ 확인 다이얼로그 ("미납자 N명에게 알림을 발송합니다") ▶ `POST .../settlement/remind` ▶ 토스트
  - 상세 입력 (옵션 — 현재 UI는 customMessage 미사용, body=null 또는 `{}` 전송)
- **상태 분기**:
  - 미납자 0명일 때: 토스트 "미납자가 없습니다", API 호출 안 함

### 마감 연장 진입 (현재 UI 미구현 — 백엔드 엔드포인트만 존재)
- 향후 확장: 다이얼로그에서 hours(1~168) + alsoRemind 토글 입력 후 `PATCH .../extend-deadline`

### 리마인드 이력 화면 (현재 UI 미구현)
- 향후 확장: `GET .../remind-history`로 이력 표시 (kind/sentAt/sender)

### API 호출 순서 (Provider/Repository 관점)

독촉 액션:
1. 현재 transfer/summary 데이터에서 미납자 수 확인
2. 0명이면 토스트만, 1명 이상이면 다이얼로그
3. `meetingSettlementRepository.remind(eventId, MeetingSettlementRemindParam(targetUserIds: null, customMessage: null))` ▶ `POST .../settlement/remind`
4. 성공 시 토스트 "리마인드를 발송했습니다"
5. 실패 (예: NOT_ACTIVE, 403): `showApiErrorToast`

(향후) 마감 연장 액션:
1. 다이얼로그 입력 (시간 + alsoRemind 토글)
2. `extendDeadline(eventId, MeetingSettlementExtendDeadlineParam(hours, alsoRemind))` ▶ `PATCH .../extend-deadline`
3. invalidate `settlementDetailProvider`

(향후) 이력 조회:
1. `remindHistoryProvider(eventId)` ▶ `GET .../remind-history`
2. 리스트 표시 (kind 라벨 한국어)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트 수동 리마인드) 미납자 3명에게 푸시 발송 | settlement ACTIVE, 5명 중 2명 결제 완료, 3명 미납 | 3명 푸시 수신, log 3건 INSERT. |
| S2 | (엣지 · 24h 가드) 1시간 뒤 같은 사용자에게 다시 발송 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (엣지 · 동시 호출) 호스트가 두 디바이스에서 동시 발송 | 폰 + PC에서 동시에 "독촉" 탭 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (Happy Path · 마감 연장 + alsoRemind) 마감을 24h 연장하면서 알림 발송 | settlement ACTIVE, deadlineAt = 2026-05-08T18:00, autoRemindAfterHours=12 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (엣지 · 1시간 단위 연쇄 연장) 호스트가 1h씩 여러 번 연장하며 alsoRemind=true | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (엣지 · ACTIVE 아님) DRAFT 상태에서 리마인드 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (자동 리마인드 · 스케줄러) 마감 12h 후 자동 발송 | 호스트가 활성화 시 deadlineAt=오늘 18:00, autoRemindAfterHours=12 설정 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (호스트 · 이력 조회) 누구에게 언제 보냈는지 확인 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

### limbo 상태 자동 재알림 정책 (기존 deadline 리마인드와 별도)

> **Fact (2026-06-04, 커밋 985f586)**. 이 정책은 본 기능의 호스트 수동 리마인드(§4)와 다른 별도 스케줄러 흐름이다.

`BANK_AWAITING_CONFIRM`/`PENDING_MANUAL_REFUND` 상태 transfer가 SLA(`meeting-settlement.limbo-escalation-days`, 기본 3일) 경과 시 자동 재알림이 발화된다. 호스트의 명시적 독촉 없이 백엔드가 자동으로 관련 행위자에게 알린다.

- **BANK_AWAITING_CONFIRM** 재알림: 수취자(toUserId) + 호스트(creatorUserId). `NotificationType.MEETING_SETTLEMENT_REMIND`
- **PENDING_MANUAL_REFUND** 재알림: 수취자(toUserId). `NotificationType.MEETING_SETTLEMENT_REFUND_REQUIRED`
- **2회 이상 미해소**: `OperatorAlertType.SETTLEMENT_TRANSFER_LIMBO HIGH` 운영알림 자동 승급
- 자동 만료(EXPIRED 전이) 없음 — 상태 변경 없이 알림만 발화
- 상세 계약은 F07-06 §4 "limbo SLA 정책" 참조

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소 | limbo 상태 장기 방치 | BANK_AWAITING_CONFIRM/PENDING_MANUAL_REFUND 상태 transfer에 자동 재알림 없었음 | **해소** — 985f586 (2026-06-04): limbo SLA 자동 재알림 + 운영알림 승급 구현 완료 (상세: F07-06 §4 limbo SLA) |
| 후보 | frontend.md:27 | ### 마감 연장 진입 (현재 UI 미구현 — 백엔드 엔드포인트만 존재) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:30 | ### 리마인드 이력 화면 (현재 UI 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:59 | - **customMessage 입력 UI** (옵션): 현재 미구현, 향후 200자 입력 + 미리보기 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 수동 리마인드) 미납자 3명에게 푸시 발송**: Given settlement ACTIVE, 5명 중 2명 결제 완료, 3명 미납 When 사용자가 해당 흐름을 실행하면 Then 3명 푸시 수신, log 3건 INSERT.
- **AC-02. (엣지 · 24h 가드) 1시간 뒤 같은 사용자에게 다시 발송 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 동시 호출) 호스트가 두 디바이스에서 동시 발송**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (Happy Path · 마감 연장 + alsoRemind) 마감을 24h 연장하면서 알림 발송**: Given settlement ACTIVE, deadlineAt = 2026-05-08T18:00, autoRemindAfterHours=12 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (엣지 · 1시간 단위 연쇄 연장) 호스트가 1h씩 여러 번 연장하며 alsoRemind=true**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (엣지 · ACTIVE 아님) DRAFT 상태에서 리마인드 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (자동 리마인드 · 스케줄러) 마감 12h 후 자동 발송**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (호스트 · 이력 조회) 누구에게 언제 보냈는지 확인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
