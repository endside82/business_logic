# F07-07. 미납자 리마인드 / 마감 연장 (Remind Unpaid & Extend Deadline) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트가 ACTIVE 정산의 미납 참가자에게 푸시 리마인드를 발송하거나, 정산 마감 기한을 연장한다. 리마인드는 24시간 가드 + Redisson lock으로 중복 발송을 차단하며, 자동 리마인드(스케줄러)는 마감 후 N시간 경과 시 발동한다. 리마인드 이력 조회도 제공한다 (E-02).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 현황 화면(SCR-MS-002) ACTIVE 상태에서 액션 바의 "독촉" 버튼
- 이체 내역 화면 상단 "미납자 알림" CTA
- (자동 리마인드는 백엔드 스케줄러 — 프론트엔드 진입점 없음)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `NotificationService`. 앱: `settlement_status_screen.dart`, `transfer_list_screen.dart`, `settlement_action_bar_widget.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#remindUnpaid`, `MeetingSettlementController#extendDeadline`, `MeetingSettlementController#getRemindHistory`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

독촉 액션:
1. 현재 transfer/summary 데이터에서 미납자 수 확인
2. 0명이면 토스트만, 1명 이상이면 다이얼로그
3. `meetingSettlementRepository.remind(eventId, MeetingSettlementRemindParam(targetUserIds: null, customMessage: null))` ▶ `POST .../settlement/remind`
4. 성공 시 토스트 "리마인드를 발송했습니다"
5. 실패 (예: NOT_ACTIVE, 403): `showApiErrorToast`

마감 연장 액션:
1. 다이얼로그 입력 (시간 + alsoRemind 토글)
2. `extendDeadline(eventId, MeetingSettlementExtendDeadlineParam(hours, alsoRemind))` ▶ `PATCH .../extend-deadline`
3. invalidate `settlementDetailProvider`

(향후) 이력 조회:
1. `remindHistoryProvider(eventId)` ▶ `GET .../remind-history`
2. 리스트 표시 (kind 라벨 한국어)

## 4. 제품 규칙

- 마감 연장은 1~168시간이다.
- 자동 리마인드 판정은 30분마다 돈다.
- 미납자가 없으면 「미납자가 없습니다」만 보이고 보내지 않는다.
- 은행분 확인 대기·수동 환불 대기의 재알림은 F07-06 §4 limbo SLA 정책을 따른다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 알림 이력 | 정산 현황 카드가 마지막 알림 시각과 보낸 횟수를 정산 관리자에게 보인다. 따로 이력 목록 화면은 없다 | 없음 |
| Decision Needed | 알림 덧붙임 말 | 서버와 앱 모델은 알림에 덧붙일 말을 받지만 입력 칸이 없다 | 입력 칸(200자·미리보기)을 둘지 정한다 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 수동 리마인드) 미납자 3명에게 푸시 발송**: Given settlement ACTIVE, 5명 중 2명 결제 완료, 3명 미납 When 사용자가 해당 흐름을 실행하면 Then 3명 푸시 수신, log 3건 INSERT.
- **AC-02. (엣지 · 24h 가드) 1시간 뒤 같은 사용자에게 다시 발송 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 동시 호출) 호스트가 두 디바이스에서 동시 발송**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (Happy Path · 마감 연장 + alsoRemind) 마감을 24h 연장하면서 알림 발송**: Given settlement ACTIVE, deadlineAt = 2026-05-08T18:00, autoRemindAfterHours=12 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (엣지 · 1시간 단위 연쇄 연장) 호스트가 1h씩 여러 번 연장하며 alsoRemind=true**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (엣지 · ACTIVE 아님) DRAFT 상태에서 리마인드 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (자동 리마인드 · 스케줄러) 마감 12h 후 자동 발송**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (호스트 · 이력 조회) 누구에게 언제 보냈는지 확인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
