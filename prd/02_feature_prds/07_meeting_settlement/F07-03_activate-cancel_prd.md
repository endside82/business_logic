# F07-03. 정산 활성화/취소 (Activate / Cancel) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-03_activate-cancel -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-03_activate-cancel`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트가 DRAFT 상태의 정산을 **ACTIVE**로 활성화해 모든 참가자에게 납부 알림을 발송한다. 활성화 시점에 마감일과 자동 리마인드 옵션을 함께 지정할 수 있다. 활성화된 정산은 정산 생성자/이벤트 호스트가 **CANCEL**할 수 있으며, 취소 시 이미 결제된 POINT 이체는 자동 역분개 환불, 계좌이체 분담은 `PENDING_MANUAL_REFUND` 상태로 전이된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 현황 화면(SCR-MS-002) 하단 액션 바 (`SettlementActionBarWidget`)
- DRAFT 상태에서는 "정산 신청(활성화)" 버튼, ACTIVE 상태에서는 "정산 취소" 버튼

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-03_activate-cancel/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-03_activate-cancel/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-03_activate-cancel/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-03_activate-cancel/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:107` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:97` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

화면 진입 시:
1. `settlementDetailProvider(eventId)` ▶ `GET .../settlement`
2. `settlementSummaryProvider(eventId)` ▶ `GET .../summary`
3. (manager일 때) `eventDetailNotifierProvider(eventId)` ▶ host/staff 권한 확인

활성화 시:
1. `AppDialog.confirm` 호출 → 확인
2. `meetingSettlementRepository.activateSettlement(eventId)` ▶ `PATCH .../settlement/activate` (body 없음 — 옵션 필드는 현재 미사용)
3. invalidate `settlementDetailProvider`, `settlementSummaryProvider`, `transferListProvider`, `settlementItemsProvider`
4. 토스트 + 화면 갱신

취소 시:
1. `AppDialog.confirm` "정산을 취소하시겠습니까? 이미 결제된 금액은 자동 환불됩니다."
2. `meetingSettlementRepository.cancelSettlement(eventId)` ▶ `PATCH .../settlement/cancel`
3. invalidate 모든 관련 provider
4. 토스트 "정산이 취소되었습니다"

## 4. 서버 계약

### 개요

호스트가 DRAFT 상태의 정산을 **ACTIVE**로 활성화해 모든 참가자에게 납부 알림을 발송한다. 활성화 시점에 마감일과 자동 리마인드 옵션을 함께 지정할 수 있다. 활성화된 정산은 정산 생성자/이벤트 호스트가 **CANCEL**할 수 있으며, 취소 시 이미 결제된 POINT 이체는 자동 역분개 환불, 계좌이체 분담은 `PENDING_MANUAL_REFUND` 상태로 전이된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| PATCH | /api/v1/events/{eventId}/settlement/activate | MeetingSettlementController#activateSettlement | required | DRAFT → ACTIVE + **대상자 검증(W14-S7)** + transfer 자동 생성 + 알림 |
| PATCH | /api/v1/events/{eventId}/settlement/cancel | MeetingSettlementController#cancelSettlement | required | DRAFT/ACTIVE → CANCELLED + 환불 처리 |

**활성화 시점 대상자 검증 (W14-S7, 커밋 `c7fd7e4`, D-4=활성화 시점 일괄 검증)**: `activateSettlement`는 transfer 생성 직전, 분담 당사자 집합 `holder ∪ share ∪ 수동 transfer 당사자`가 `실참석자(FIXED=체크인) ∪ host` 부분집합인지 일괄 검증한다. 위반 시 `MEETING_SETTLEMENT_SUBJECT_NOT_IN_SETTLEMENT`(400, 2000025) + 위반자 payload를 반환한다(작성 중에는 자유, 활성화 시점에만 차단). 비참석자에게 송금 라인이 생성되는 것을 차단한다.

**작성 중(DRAFT) 정산 30일 자동 정리 (W14-S7, 신규 `MeetingSettlementDraftCleanupScheduler`, D-3=30일)**: DRAFT 상태로 30일 방치된 정산은 `CANCELLED`로 전이된다(삭제 금지 — 복구 여지 보존, audit + 호스트 알림). DRAFT에도 존재할 수 있는 PENDING 수동 transfer는 동반 취소된다. ShedLock·`REQUIRES_NEW`·멱등 fresh 재검 적용. 기존 `MeetingSettlementExpirationScheduler`(Transfer 전용)와 별도 클래스로 분리.

### 도메인 모델 / Enum (이 기능 관련)

- `MeetingSettlementStatus`: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- `TransferStatus`: `PENDING`, `COMPLETED`, `CANCELLED`, `EXPIRED`, `REVERSAL_FAILED`, `PENDING_MANUAL_REFUND`
- `MeetingPaymentMethod`: `POINT`, `BANK_TRANSFER`, `MIXED`
- `SettlementMode`: `HOST_COLLECT`, `DIRECT`

### 의존 단위 / 외부 시스템

- Unit 06 (Wallet): `WalletRefundService.refundByTransaction`(취소 역분개 환불 — 원결제 split 복원, `refundToWallet`는 2026-06-06 해소·본체 차단), `WalletService.deductPaidOnly`, `WalletService.creditMeetingSettlement` 호출 (POINT 환불/차감)
- Unit 06 (Accounting): `AccountingLedgerService.recordMeetingSettlementReversal` (복식부기 역분개)
- Unit 12 (Notification): `NotificationService.createNotification` — 종류 `MEETING_SETTLEMENT_ACTIVATED`, `MEETING_SETTLEMENT_CANCELLED`, `MEETING_SETTLEMENT_REFUND_REQUIRED` (알림 데이터: `MeetingSettlementNotificationData{eventId, settlementId, transferId?}`)
- Unit 03 (Event): 호스트 ID 검증
- 외부 시스템: FCM (푸시 발송)

## 5. 프론트 계약

### 진입 경로

- 정산 현황 화면(SCR-MS-002) 하단 액션 바 (`SettlementActionBarWidget`)
- DRAFT 상태에서는 "정산 신청(활성화)" 버튼, ACTIVE 상태에서는 "정산 취소" 버튼

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement` | `settlement_status_screen.dart` | 정산 현황 + 활성화/취소 진입점 |
| (위젯) | `widgets/settlement_action_bar_widget.dart` | 상태별 CTA 액션 바 |
| (위젯) | `widgets/settlement_summary_card_widget.dart` | 총액/납부 진척률 카드 |

### 화면별 구성 요소 & 액션

### 정산 현황 화면 (`settlement_status_screen.dart`)
- **사용자가 보는 것 (호스트, DRAFT)**:
  - 상단 안내 배너:
    - 항목 있음: `AppColors.primary50` 배경, "정산 항목이 준비되었습니다. 정산을 신청하면 참여자에게 알림이 발송됩니다."
    - 항목 없음: `AppColors.warning50` 배경, "정산 항목을 먼저 추가해주세요."
  - 요약 카드 (`SettlementSummaryCardWidget`) — 총액, 1인당 평균
  - 참가자 리스트 (`ParticipantStatusListWidget`) — DRAFT에서는 status 회색 표시
  - 영수증 갤러리 (`SettlementReceiptGalleryWidget`)
  - 하단 `SettlementActionBarWidget` — DRAFT: "정산 신청" CTA (항목 0건이면 비활성), ACTIVE: "독촉" + "취소", COMPLETED/CANCELLED: 라벨
- **사용자가 할 수 있는 액션 (DRAFT)**:
  - "정산 신청" 탭 ▶ 확인 다이얼로그 ("참여자에게 알림이 발송됩니다") ▶ `PATCH .../settlement/activate` ▶ 토스트 "정산이 활성화되었습니다" + invalidate
  - 항목 편집 아이콘 ▶ `context.push('.../settlement/items')`
- **사용자가 할 수 있는 액션 (ACTIVE)**:
  - "취소" 탭 ▶ 확인 다이얼로그 (".. 결제분은 환불됩니다") ▶ `PATCH .../settlement/cancel` ▶ 토스트
  - "독촉" 탭 ▶ F07-07 리마인드
- **상태 분기**:
  - `detailAsync` 로딩: SkeletonLoader / 에러: `AppErrorState(title:)`
  - `summaryAsync`도 동일
  - DRAFT/ACTIVE/COMPLETED/CANCELLED 분기 → 안내 배너/액션 바 다르게 표시
- **모달**: 활성화/취소 모두 `AppDialog.confirm` 사용 (확인/취소)

### 활성화 옵션 (선택적 — 마감/자동 리마인드 입력)
- `MeetingSettlementActivateParam`에 `deadlineAt`, `autoRemindAfterHours` 두 필드가 있으나, 현재 기본 액션 바는 옵션 입력 UI 없이 `null`로 호출 (옵션은 추후 확장 — `required=false` 백엔드 호환).

### API 호출 순서 (Provider/Repository 관점)

화면 진입 시:
1. `settlementDetailProvider(eventId)` ▶ `GET .../settlement`
2. `settlementSummaryProvider(eventId)` ▶ `GET .../summary`
3. (manager일 때) `eventDetailNotifierProvider(eventId)` ▶ host/staff 권한 확인

활성화 시:
1. `AppDialog.confirm` 호출 → 확인
2. `meetingSettlementRepository.activateSettlement(eventId)` ▶ `PATCH .../settlement/activate` (body 없음 — 옵션 필드는 현재 미사용)
3. invalidate `settlementDetailProvider`, `settlementSummaryProvider`, `transferListProvider`, `settlementItemsProvider`
4. 토스트 + 화면 갱신

취소 시:
1. `AppDialog.confirm` "정산을 취소하시겠습니까? 이미 결제된 금액은 자동 환불됩니다."
2. `meetingSettlementRepository.cancelSettlement(eventId)` ▶ `PATCH .../settlement/cancel`
3. invalidate 모든 관련 provider
4. 토스트 "정산이 취소되었습니다"

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트 활성화) DRAFT 정산을 활성화해 6명에게 알림 발송 | settlement DRAFT, 항목 1건 + share 6건, totalAmount 96,000 | settlement ACTIVE, transfer 5건 PENDING, 푸시 5건 발송, audit 2건 추가. |
| S2 | (호스트 · 활성화 옵션 deadline + autoRemind) 마감 + 자동 리마인드 함께 설정 | 호스트가 정산을 활성화하면서 "1주일 후 마감 + 마감 12시간 후 자동 리마인드"를 같이 설정 (E-02) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (엣지 · 항목 없음) 항목이 0개인 채로 활성화 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (엣지 · 비호스트 차단) 참석자가 활성화 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (Happy Path · 호스트 취소 / POINT 자동 환불) ACTIVE 정산을 취소 | settlement ACTIVE, transfer 5건(2건 COMPLETED POINT, 3건 PENDING) | 2명 사용자 지갑에서 16,000원 환원, 호스트 지갑에서 32,000원 차감 (합계 0), 5명 푸시 수신. |
| S6 | (엣지 · 계좌이체로 결제된 transfer 취소) PENDING_MANUAL_REFUND 분기 | 호스트 정산 취소 시 일부 transfer가 BANK_TRANSFER로 COMPLETED 상태 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (엣지 · POINT 역분개 실패) 송금자 지갑 잠금/예외 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · 이미 COMPLETED) 완료된 정산을 취소 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | scenarios.md:31 | **현재 UI 상태**: body는 `null` (옵션 입력 UI 미구현). 옵션 추가가 필요할 때 활성화 다이얼로그를 확장. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 해소 (2026-06-06) | MeetingSettlementCalculator (커밋 46b54b9) | **EQUAL 분배 음수 share 방지(MED)** — EQUAL 분배 계산에서 음수 share가 산출돼 정산이 deadlock되던 경로를 가드. 정산 활성화/계산 시 음수 분담금이 생기지 않는다. | 없음 |
| 해소 (2026-06-06) | MeetingSettlementTransferService.java:97-111, WalletRefundService.java:45-126 | **취소 역분개 회수 재설계 + split 보존(C2/H1)** — 취소 시 reversal 환불이 원결제 split을 복원하며(`refundByTransaction`, refundToWallet 차단), 수취 분개가 RECEIVABLE clearing으로 소거된다. 상세는 F07-05 §4 회계 무결성 노트. | 없음 |
| 해소 (2026-06-06, W14-S7 `c7fd7e4`) | MeetingSettlementService#activateSettlement | **분담 대상자 검증 부재(D-4)** — `holder ∪ share ∪ 수동 transfer 당사자 ⊆ 실참석자(FIXED=체크인) ∪ host`를 활성화 시점에 일괄 검증, 위반 시 `MEETING_SETTLEMENT_SUBJECT_NOT_IN_SETTLEMENT`(2000025) + 위반자 payload. 비참석자에게 임의로 송금 라인이 생성되던 경로를 차단. | 없음 |
| 해소 (2026-06-06, W14-S7 `c7fd7e4`) | MeetingSettlementDraftCleanupScheduler (신규) | **작성 중 정산 영구 잔존(D-3)** — DRAFT 30일 방치 시 `CANCELLED` 전이(삭제 아님, audit+호스트 알림)+PENDING 수동 transfer 동반 취소. ShedLock·REQUIRES_NEW·멱등 재검. Transfer 전용 만료 스케줄러와 별도 클래스. | 없음 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 활성화) DRAFT 정산을 활성화해 6명에게 알림 발송**: Given settlement DRAFT, 항목 1건 + share 6건, totalAmount 96,000 When 사용자가 해당 흐름을 실행하면 Then settlement ACTIVE, transfer 5건 PENDING, 푸시 5건 발송, audit 2건 추가.
- **AC-02. (호스트 · 활성화 옵션 deadline + autoRemind) 마감 + 자동 리마인드 함께 설정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 항목 없음) 항목이 0개인 채로 활성화 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (엣지 · 비호스트 차단) 참석자가 활성화 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (Happy Path · 호스트 취소 / POINT 자동 환불) ACTIVE 정산을 취소**: Given settlement ACTIVE, transfer 5건(2건 COMPLETED POINT, 3건 PENDING) When 사용자가 해당 흐름을 실행하면 Then 2명 사용자 지갑에서 16,000원 환원, 호스트 지갑에서 32,000원 차감 (합계 0), 5명 푸시 수신.
- **AC-06. (엣지 · 계좌이체로 결제된 transfer 취소) PENDING_MANUAL_REFUND 분기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (엣지 · POINT 역분개 실패) 송금자 지갑 잠금/예외**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · 이미 COMPLETED) 완료된 정산을 취소 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
