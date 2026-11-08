# F07-02. 정산 항목 관리 (Settlement Items CRUD) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트가 DRAFT 상태의 정산에 항목(영수증/지출 단위)을 추가/수정/삭제한다. 항목별로 분할 방식(EQUAL/CUSTOM/RATIO)을 지정해 참가자 분담금(`MeetingSettlementShare`)이 자동 계산·저장된다. 호스트가 과거 입력한 항목을 빠르게 재사용할 수 있도록 "최근 정산 항목" 자동완성 엔드포인트도 함께 제공한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 생성 직후 자동 라우팅 (F07-01에서 `context.go('.../settlement/items')`)
- 정산 현황 화면(SCR-MS-002)에서 DRAFT 상태일 때 우측 상단 `edit_note` 아이콘
- 카드사 알림 딥링크 → `SettlementQuickAddScreen` → `SettlementItemFormDialog` (직접 항목 추가)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `RecentSettlementItemController`, `UserService`. 앱: `settlement_items_screen.dart`, `settlement_quick_add_screen.dart`, `settlement_item_form_dialog.dart`, `settlement_item_card_widget.dart`, `item_type_selector_widget.dart`, `split_type_selector_widget.dart`, `equal_split_form_widget.dart`, `custom_split_form_widget.dart`, `ratio_split_form_widget.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#addItem`, `MeetingSettlementController#updateItem`, `MeetingSettlementController#deleteItem`, `RecentSettlementItemController#getRecentSettlementItems`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

화면 진입 시:
1. `settlementItemsProvider(eventId)` ▶ (서버에 직접 항목 list API 없음 — 정산 detail/summary 통해 간접 조회)
2. `settlementSummaryProvider(eventId)` ▶ `GET .../summary` (참여자 합산 표시용)
3. `settlementDetailProvider(eventId)` ▶ `GET .../settlement` (status 확인 → DRAFT 여부 분기)

항목 추가 시:
1. (옵션) `recentSettlementItemsProvider(category)` ▶ `GET /users/me/settlement-items/recent?limit=10&category=FOOD`
2. `settlementItemsProvider(eventId).addItem(param)` ▶ `POST /events/{eventId}/settlement/items`
3. 성공 시 invalidate → 리스트/요약 refetch

항목 수정 시:
1. `settlementItemsProvider(eventId).updateItem(itemId, param)` ▶ `PUT .../items/{itemId}`

항목 삭제 시:
1. 확인 다이얼로그 → `settlementItemsProvider(eventId).deleteItem(itemId)` ▶ `DELETE .../items/{itemId}`

## 4. 제품 규칙

- 항목은 지출(EXPENSE)이나 수입(INCOME)이고, 카테고리는 음식, 카페, 술, 교통, 숙박, 쇼핑, 오락, 기타 여덟 가지 중 고른다(선택).
- 항목을 저장하면 고른 분할 방식으로 참가자 분담금을 계산하고, 고치면 다시 만들며, 지우면 분담금도 지운다. 항목에는 돈을 낸 사람을 적는다.
- 비어 있으면 「아직 항목이 없습니다」를 보이고, 추가 버튼은 작성 중에만 있다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트 · EQUAL) 균등 분할 항목을 5명에게 추가 | 정산 DRAFT 존재, 항목 0건 | settlement total 96000, share 6건 모두 isCompleted=false, paymentMethod=POINT(default). |
| S2 | (호스트 · CUSTOM) 항목별로 다른 금액을 부담시킨다 | 와인 모임. 술을 마시지 않은 1명은 안주값만 부담, 나머지 4명은 와인+안주 전액. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (호스트 · RATIO) 비율 분할로 직책별 분담 | 회식 6명. 임원 3명은 비율 2씩, 사원 3명은 비율 1씩, 총 9 비율 → 90,000원 분배. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (호스트 · 항목 수정) 누락 사용자를 추가 | settlement DRAFT, 항목 1건 (6명 share) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (호스트 · 항목 삭제) 잘못 입력한 항목 삭제 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (엣지 · CUSTOM 합계 불일치 + autoBalance) 잔여를 마지막에 흡수 | 호스트가 4명에게 24,000씩 입력, 합계 96,000인데 amount는 100,000. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (호스트 · Quick Pick 자동완성) 최근 항목으로 빠르게 추가 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (참가자 차단) 일반 참가자가 항목 추가 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 영수증 첨부 | 영수증은 호스트 본인이 올린 업로드 완료 증빙 파일만 붙는다. 항목이 가리키는 동안 원본을 지울 수 없다 | 없음 |
| 해소됨 | 시작 뒤 항목 수정 | 시작한 정산의 항목을 고치면 400 으로 거절한다 | 없음 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 · EQUAL) 균등 분할 항목을 5명에게 추가**: Given 정산 DRAFT 존재, 항목 0건 When 사용자가 해당 흐름을 실행하면 Then settlement total 96000, share 6건 모두 isCompleted=false, paymentMethod=POINT(default).
- **AC-02. (호스트 · CUSTOM) 항목별로 다른 금액을 부담시킨다**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (호스트 · RATIO) 비율 분할로 직책별 분담**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (호스트 · 항목 수정) 누락 사용자를 추가**: Given settlement DRAFT, 항목 1건 (6명 share) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (호스트 · 항목 삭제) 잘못 입력한 항목 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (엣지 · CUSTOM 합계 불일치 + autoBalance) 잔여를 마지막에 흡수**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (호스트 · Quick Pick 자동완성) 최근 항목으로 빠르게 추가**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (참가자 차단) 일반 참가자가 항목 추가 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
