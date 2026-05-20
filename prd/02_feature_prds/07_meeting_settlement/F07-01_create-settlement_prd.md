# F07-01. 모임 정산 생성 (Create Settlement) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-01_create-settlement -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-01_create-settlement`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

종료된 이벤트에 대해 호스트가 정산 본체를 **DRAFT 상태로 생성**한다. 이벤트당 1개의 정산만 허용되며, 메모/정산 모드(HOST_COLLECT vs DIRECT)를 지정한다. 과거 이벤트의 정산 항목·분담 구조를 새 이벤트로 그대로 복제하는 보조 엔드포인트, 정산 생성 시 기본 참가자 후보를 제안하는 엔드포인트를 함께 제공한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 화면 → "모임 정산" 메뉴/카드 → 정산이 없으면 `Routes.eventSettlementCreate`로 이동
- 이벤트 종료 후 호스트에게 "정산을 진행해주세요" 푸시 → 딥링크
- 호스팅 이벤트 카드의 "정산 만들기" CTA

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-01_create-settlement/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-01_create-settlement/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-01_create-settlement/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-01_create-settlement/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:116` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:59` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:78` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

생성 화면 진입 시:
1. `eventDetailNotifierProvider(eventId)` ▶ `GET /api/v1/events/:id`
2. `attendeeListNotifierProvider(eventId)` ▶ `GET /api/v1/events/:id/attendees`

"정산 생성" 탭:
1. `settlementCreateProvider.createSettlement(param)` ▶ `MeetingSettlementRepository.createSettlement` ▶ `POST /api/v1/events/{eventId}/settlement` (MeetingSettlementAddParam)
2. 응답 settlement.id 확보 후 `settlementItemsProvider(eventId).addItem(itemParam)` ▶ `POST .../settlement/items` (총액 + EQUAL split + 선택 참여자)
3. `context.go('/home/events/${eventId}/settlement/items')`

"복제" 탭:
1. `CloneSettlementSheet`가 사용자 선택을 받아 `(sourceSettlementId, copyNote)` 반환
2. `settlementCreateProvider.cloneFrom(eventId, sourceSettlementId, copyNote)` ▶ `POST /api/v1/events/{eventId}/settlement/clone` (`MeetingSettlementCloneParam`)
3. 성공 시 items 화면 이동

## 4. 서버 계약

### 개요

종료된 이벤트에 대해 호스트가 정산 본체를 **DRAFT 상태로 생성**한다. 이벤트당 1개의 정산만 허용되며, 메모/정산 모드(HOST_COLLECT vs DIRECT)를 지정한다. 과거 이벤트의 정산 항목·분담 구조를 새 이벤트로 그대로 복제하는 보조 엔드포인트, 정산 생성 시 기본 참가자 후보를 제안하는 엔드포인트를 함께 제공한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/settlement | MeetingSettlementController#createSettlement | required | 정산 본체 DRAFT 생성 |
| POST | /api/v1/events/{eventId}/settlement/clone | MeetingSettlementController#cloneSettlement | required | 과거 정산의 항목/분담 구조 복제 |
| GET  | /api/v1/events/{eventId}/settlement/participant-suggestions | MeetingSettlementController#getParticipantSuggestions | required | 정산 참여자 추천 (호스트 + ATTENDING 참석자) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `MeetingSettlementStatus`: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- **Enum** `SettlementMode`: `HOST_COLLECT` (호스트 일괄 수금), `DIRECT` (참가자 간 직접 송금)
- **Entity** `MeetingSettlement`: `id`, `eventId`, `creatorUserId`, `totalAmount(long)`, `settlementMode`, `status`, `note`, `deadlineAt`, `autoRemindAfterHours`, `autoRemindSentAt`, `version (낙관적 잠금)`, `createdAt`, `updatedAt`

### 의존 단위 / 외부 시스템

- Unit 03 (Event): `EventRepository.findById` 호스트 ID 확인, `EventAttendanceRepository.findByEventIdAndStatus(ATTENDING)` 참석자 조회
- Unit 0 (Account): `UserService.getUserBasicInfoMap` 사용자 이름/사진
- Unit 12 (Notification): 미사용 (활성화 시점에 발송)
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 화면 → "모임 정산" 메뉴/카드 → 정산이 없으면 `Routes.eventSettlementCreate`로 이동
- 이벤트 종료 후 호스트에게 "정산을 진행해주세요" 푸시 → 딥링크
- 호스팅 이벤트 카드의 "정산 만들기" CTA

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement/create` | `settlement_create_screen.dart` | 정산 생성 메인 화면 (.pen single scrollable page) |
| `/settlement/quick-add?title=&amount=&cardCompany=` | `settlement_quick_add_screen.dart` | (옵션 A 딥링크) 카드사 알림 → 빠른 진입 화면 (정산 생성 후 항목까지 한 번에) |

### 화면별 구성 요소 & 액션

### 정산 생성 화면 (`settlement_create_screen.dart`)
- **사용자가 보는 것**:
  - 상단 `CommunityAppBar` 제목 "정산 생성" + actions에 "복제" 텍스트 버튼 (`content_copy` 아이콘)
  - 이벤트 정보 영역 (`event_detail_provider`로 조회한 제목·일시)
  - 정산 모드 라디오 (`SettlementModeSelectorWidget`): `HOST_COLLECT` / `DIRECT`
  - 총액 입력 필드 (천단위 자동 콤마, `ThousandsSeparatorInputFormatter`)
  - 참가자 선택 영역 (`ParticipantSelectorWidget`) — `attendee_list_provider`로 받은 ATTENDING 참석자 + 전체선택/개별선택
  - 1인당 금액 실시간 계산 (총액 / 선택 인원)
  - 하단 "정산 생성" CTA `AppButton(ButtonVariant.primary)`
- **사용자가 할 수 있는 액션**:
  - "정산 생성" 탭 ▶ `settlementCreateProvider.createSettlement(MeetingSettlementAddParam)` ▶ 성공 후 즉시 `addItem(MeetingSettlementItemParam)`까지 호출 ▶ `context.go('/home/events/:eventId/settlement/items')`
  - "복제" 탭 ▶ `CloneSettlementSheet` 바텀시트 ▶ 과거 정산 선택 + copyNote 토글 ▶ `cloneFrom(...)` ▶ items 화면 이동
  - 모드 전환 / 총액 입력 / 참여자 토글 ▶ 1인당 금액 즉시 재계산
- **상태 분기**:
  - `eventDetailNotifierProvider` 로딩/에러: 스피너 / `AppErrorState(title:)`
  - `attendeeListNotifierProvider` 로딩 시 ParticipantSelector 내부 스켈레톤
  - 제출 중: `_isSubmitting=true`, 버튼 비활성화
- **Validation**:
  - 최소 참가자 2명 (`_canSubmit = _parsedAmount > 0 && _selectedUserIds.length >= 2`)
  - 총액 0 또는 인원 1명 미만이면 CTA 비활성
- **에러 토스트**: `showApiErrorToast(context, error, fallback: '정산 생성에 실패했습니다')`
- **모달/시트/네비게이션**: 복제는 `CloneSettlementSheet.show(context)` 바텀시트. 성공 시 `context.go(...)`로 items 화면 replace.

### 정산 항목 빠른 추가 화면 (`settlement_quick_add_screen.dart`)
- **딥링크**: `community://settlement/quick-add?title=커피값&amount=18000&cardCompany=신한카드`
- **사용자가 보는 것**: 호스트인 활성 이벤트 리스트 (`hostingEventsNotifierProvider`)
- **사용자가 할 수 있는 액션**:
  - 호스트 모임이 1개면 자동으로 `SettlementItemFormDialog`를 prefill 상태로 오픈
  - 0개면 "모임 만들기" CTA
  - 다수면 모임 카드 선택 → 다이얼로그 오픈

### API 호출 순서 (Provider/Repository 관점)

생성 화면 진입 시:
1. `eventDetailNotifierProvider(eventId)` ▶ `GET /api/v1/events/:id`
2. `attendeeListNotifierProvider(eventId)` ▶ `GET /api/v1/events/:id/attendees`

"정산 생성" 탭:
1. `settlementCreateProvider.createSettlement(param)` ▶ `MeetingSettlementRepository.createSettlement` ▶ `POST /api/v1/events/{eventId}/settlement` (MeetingSettlementAddParam)
2. 응답 settlement.id 확보 후 `settlementItemsProvider(eventId).addItem(itemParam)` ▶ `POST .../settlement/items` (총액 + EQUAL split + 선택 참여자)
3. `context.go('/home/events/${eventId}/settlement/items')`

"복제" 탭:
1. `CloneSettlementSheet`가 사용자 선택을 받아 `(sourceSettlementId, copyNote)` 반환
2. `settlementCreateProvider.cloneFrom(eventId, sourceSettlementId, copyNote)` ▶ `POST /api/v1/events/{eventId}/settlement/clone` (`MeetingSettlementCloneParam`)
3. 성공 시 items 화면 이동

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트) 종료된 모임의 정산을 처음 만든다 | 로그인됨, 이벤트 종료(CLOSED), 본인이 호스트, 정산 생성 이력 없음 | `meeting_settlement` row(status=DRAFT), `meeting_settlement_item` 1건 + `share` 6건 INSERT, 감사 로그 `SETTLEMENT_CREATED` + `ITEM_CREATED` 발행. 참가자에겐 아직 알림 없음(DRAFT). |
| S2 | (호스트 · 복제) 매주 같은 멤버로 진행하는 정기 모임의 정산을 빠르게 만든다 | 지난 주 정산이 COMPLETED 상태로 존재. 이번 주 이벤트 새로 종료됨. | 새 settlement(DRAFT) + items + shares 복제 완료. 감사 로그 payload `{clonedFromSettlementId, itemCount}`. |
| S3 | (엣지 · 중복 정산 시도) 이미 정산이 있는 이벤트를 또 만들려 한다 | 호스트가 정산 생성 직후 뒤로가기로 화면을 빠져나왔다가 다시 동일 이벤트의 정산 생성 화면 진입. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (엣지 · 비호스트 차단) 참석자가 정산 생성을 시도한다 | 일반 참석자가 우연히 정산 생성 라우트로 직접 접근. | DB 변경 없음. 참석자는 정산 현황 화면(`settlement_status_screen`)만 조회 가능. |
| S5 | (엣지 · 인원 1명) 사용자가 본인만 체크하고 생성을 시도한다 | 호스트가 실수로 본인만 체크. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (Quick-Add 딥링크 · 호스트) 카드사 결제 알림을 공유받아 정산 항목까지 빠르게 입력 | 호스트가 모임 중 카드 결제 → 카드사 푸시 → "공유"로 community 앱 열기 | 정산 항목 추가 완료. (정산이 없으면 사전 생성 흐름이 필요) |

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
| 후보 | backend.md:24 | - `note: String` — 정산 메모 (검증 없음, nullable) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:65 | **검증 위치**: 클라이언트 (`_selectedUserIds.length >= 2`). 백엔드는 별도 최소 인원 검증 없음 — 활성화 시점에 `MEETING_SETTLEMENT_NO_ITEMS` 또는 `INVALID_INPUT`(빈 share)로 차단됨. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트) 종료된 모임의 정산을 처음 만든다**: Given 로그인됨, 이벤트 종료(CLOSED), 본인이 호스트, 정산 생성 이력 없음 When 사용자가 해당 흐름을 실행하면 Then `meeting_settlement` row(status=DRAFT), `meeting_settlement_item` 1건 + `share` 6건 INSERT, 감사 로그 `SETTLEMENT_CREATED` + `ITEM_CREATED` 발행. 참가자에겐 아직 알림 없음(DRAFT).
- **AC-02. (호스트 · 복제) 매주 같은 멤버로 진행하는 정기 모임의 정산을 빠르게 만든다**: Given 지난 주 정산이 COMPLETED 상태로 존재. 이번 주 이벤트 새로 종료됨. When 사용자가 해당 흐름을 실행하면 Then 새 settlement(DRAFT) + items + shares 복제 완료. 감사 로그 payload `{clonedFromSettlementId, itemCount}`.
- **AC-03. (엣지 · 중복 정산 시도) 이미 정산이 있는 이벤트를 또 만들려 한다**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (엣지 · 비호스트 차단) 참석자가 정산 생성을 시도한다**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB 변경 없음. 참석자는 정산 현황 화면(`settlement_status_screen`)만 조회 가능.
- **AC-05. (엣지 · 인원 1명) 사용자가 본인만 체크하고 생성을 시도한다**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (Quick-Add 딥링크 · 호스트) 카드사 결제 알림을 공유받아 정산 항목까지 빠르게 입력**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정산 항목 추가 완료. (정산이 없으면 사전 생성 흐름이 필요)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
