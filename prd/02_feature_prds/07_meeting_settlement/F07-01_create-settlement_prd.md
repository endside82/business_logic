# F07-01. 모임 정산 생성 (Create Settlement) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

종료된 이벤트에 대해 호스트가 정산 본체를 **DRAFT 상태로 생성**한다. 이벤트당 1개의 정산만 허용되며, 메모/정산 모드(HOST_COLLECT vs DIRECT)를 지정한다. 과거 이벤트의 정산 항목·분담 구조를 새 이벤트로 그대로 복제하는 보조 엔드포인트, 정산 생성 시 기본 참가자 후보를 제안하는 엔드포인트를 함께 제공한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 화면 → "모임 정산" 메뉴/카드 → 정산이 없으면 `Routes.eventSettlementCreate`로 이동
- 이벤트 종료 후 호스트에게 "정산을 진행해주세요" 푸시 → 딥링크
- 호스팅 이벤트 카드의 "정산 만들기" CTA

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `UserService`. 앱: `settlement_create_screen.dart`, `settlement_quick_add_screen.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#createSettlement`, `MeetingSettlementController#cloneSettlement`, `MeetingSettlementController#getParticipantSuggestions`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 2026-10-29 현재 계약 대조

### 자신이 만든 정산에서만 복사합니다

정산 복사 입구는 자신이 만든 원본에만 표시한다. 다른 사람이 만든 정산을 관리할 수 있다는 이유로 복사 소유권까지 부여하지 않는다. 원본을 다시 읽어 권한을 확인하고 복사본 생성의 중복 요청을 구분한다.

기존 설계 중 이 규칙과 다른 서술은 아래 현재 계약을 기준으로 정정한다. 운영·실기기 완료 판정은 [현재 출시 상태표](../../../docs/qa/launch-status.html)를 따른다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-11-01에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `POST /api/v1/events/{eventId}/settlement` | `MeetingSettlementController#createSettlement` | [MeetingSettlementController.java:86](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java#L86) |
| `POST /api/v1/events/{eventId}/settlement/clone` | `MeetingSettlementController#cloneSettlement` | [MeetingSettlementController.java:105](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java#L105) |
| `GET /api/v1/events/{eventId}/settlement/participant-suggestions` | `MeetingSettlementController#getParticipantSuggestions` | [MeetingSettlementController.java:169](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java#L169) |
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 참여자 후보는 호스트와 참석자다. FIXED 정기모임 회차는 실제 체크인한 사람만이다.
- 생성 화면의 1인당 금액은 총액을 고른 인원으로 나눈 값을 바로 보여 준다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트) 종료된 모임의 정산을 처음 만든다 | 로그인됨, 이벤트 종료(CLOSED), 본인이 호스트, 정산 생성 이력 없음 | `meeting_settlement` row(status=DRAFT), `meeting_settlement_item` 1건 + `share` 6건 INSERT, 감사 로그 `SETTLEMENT_CREATED` + `ITEM_CREATED` 발행. 참가자에겐 아직 알림 없음(DRAFT). |
| S2 | (호스트 · 복제) 매주 같은 멤버로 진행하는 정기 모임의 정산을 빠르게 만든다 | 지난 주 정산이 COMPLETED 상태로 존재. 이번 주 이벤트 새로 종료됨. | 새 settlement(DRAFT) + items + shares 복제 완료. 감사 로그 payload `{clonedFromSettlementId, itemCount}`. |
| S3 | (엣지 · 중복 정산 시도) 이미 정산이 있는 이벤트를 또 만들려 한다 | 호스트가 정산 생성 직후 뒤로가기로 화면을 빠져나왔다가 다시 동일 이벤트의 정산 생성 화면 진입. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (엣지 · 비호스트 차단) 참석자가 정산 생성을 시도한다 | 일반 참석자가 우연히 정산 생성 라우트로 직접 접근. | DB 변경 없음. 참석자는 정산 현황 화면(`settlement_status_screen`)만 조회 가능. |
| S5 | (엣지 · 인원 1명) 사용자가 본인만 체크하고 생성을 시도한다 | 호스트가 실수로 본인만 체크. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (Quick-Add 딥링크 · 호스트) 카드사 결제 알림을 공유받아 정산 항목까지 빠르게 입력 | 호스트가 모임 중 카드 결제 → 카드사 푸시 → "공유"로 community 앱 열기 | 정산 항목 추가 완료. (정산이 없으면 사전 생성 흐름이 필요) |

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
