# F07-02. 정산 항목 관리 (Settlement Items CRUD) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-02_settlement-items -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-02_settlement-items`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트가 DRAFT 상태의 정산에 항목(영수증/지출 단위)을 추가/수정/삭제한다. 항목별로 분할 방식(EQUAL/CUSTOM/RATIO)을 지정해 참가자 분담금(`MeetingSettlementShare`)이 자동 계산·저장된다. 호스트가 과거 입력한 항목을 빠르게 재사용할 수 있도록 "최근 정산 항목" 자동완성 엔드포인트도 함께 제공한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 생성 직후 자동 라우팅 (F07-01에서 `context.go('.../settlement/items')`)
- 정산 현황 화면(SCR-MS-002)에서 DRAFT 상태일 때 우측 상단 `edit_note` 아이콘
- 카드사 알림 딥링크 → `SettlementQuickAddScreen` → `SettlementItemFormDialog` (직접 항목 추가)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-02_settlement-items/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-02_settlement-items/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-02_settlement-items/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-02_settlement-items/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:140` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:151` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:161` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/RecentSettlementItemController.java:31` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

호스트가 DRAFT 상태의 정산에 항목(영수증/지출 단위)을 추가/수정/삭제한다. 항목별로 분할 방식(EQUAL/CUSTOM/RATIO)을 지정해 참가자 분담금(`MeetingSettlementShare`)이 자동 계산·저장된다. 호스트가 과거 입력한 항목을 빠르게 재사용할 수 있도록 "최근 정산 항목" 자동완성 엔드포인트도 함께 제공한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/settlement/items | MeetingSettlementController#addItem | required | 항목 추가 + share 자동 생성 |
| PUT | /api/v1/events/{eventId}/settlement/items/{itemId} | MeetingSettlementController#updateItem | required | 항목 수정 + share 재생성 |
| DELETE | /api/v1/events/{eventId}/settlement/items/{itemId} | MeetingSettlementController#deleteItem | required | 항목/share 삭제 |
| GET | /api/v1/users/me/settlement-items/recent | RecentSettlementItemController#getRecentSettlementItems | required | 호스트 본인 최근 항목 자동완성 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `SplitType`: `EQUAL`, `CUSTOM`, `RATIO`
- **Enum** `SettlementItemType`: `EXPENSE`, `INCOME`
- **Enum** `SettlementItemCategory`: `FOOD`, `CAFE`, `ALCOHOL`, `TRANSPORT`, `LODGING`, `SHOP`, `ENTERTAINMENT`, `ETC` (`fromValueOrNull` / `isValid` 헬퍼 제공)
- **Entity** `MeetingSettlementItem`: `id`, `settlementId`, `title`, `amount(long)`, `holderUserId`, `itemType(String)`, `splitType(String)`, `sortOrder(int)`, `receiptFileId?`, `category?`, `createdAt`/`updatedAt`
- **Entity** `MeetingSettlementShare`: `id`, `itemId`, `userId`, `shareAmount(long)`, `paymentMethod(MeetingPaymentMethod)`, `pointAmount`, `bankTransferAmount`, `isCompleted`, `completedAt?`

### 의존 단위 / 외부 시스템

- Unit 0 (Account): `UserService.getUserBasicInfoMap` for holder/share user info
- Unit 11 (File): `receiptFileId`는 file 도메인에서 업로드 후 받은 ID — 별도 검증 없음 (영수증 다운로드는 F07-04에서 settlement-scope 검증)
- 외부 시스템: 없음 (감사 로그만 발행, 푸시 없음)

## 5. 프론트 계약

### 진입 경로

- 정산 생성 직후 자동 라우팅 (F07-01에서 `context.go('.../settlement/items')`)
- 정산 현황 화면(SCR-MS-002)에서 DRAFT 상태일 때 우측 상단 `edit_note` 아이콘
- 카드사 알림 딥링크 → `SettlementQuickAddScreen` → `SettlementItemFormDialog` (직접 항목 추가)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement/items` | `settlement_items_screen.dart` | 항목 리스트 + 추가/수정/삭제 진입점 |
| (모달) | `widgets/settlement_item_form_dialog.dart` | 항목 추가/수정 다이얼로그 |
| (모달) | `widgets/settlement_item_card_widget.dart` | 카드형 항목 표시 |
| (모달) | `widgets/item_type_selector_widget.dart` | EXPENSE/INCOME 선택 |
| (모달) | `widgets/split_type_selector_widget.dart` | EQUAL/CUSTOM/RATIO 선택 |
| (모달) | `widgets/equal_split_form_widget.dart` | EQUAL 입력 폼 |
| (모달) | `widgets/custom_split_form_widget.dart` | CUSTOM 입력 폼 |
| (모달) | `widgets/ratio_split_form_widget.dart` | RATIO 입력 폼 |

### 화면별 구성 요소 & 액션

### 정산 항목 목록 화면 (`settlement_items_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` "정산 항목"
  - 항목 카드 리스트 (`SettlementItemCardWidget`) — 항목명/금액/holder 아바타/참여자 수/카테고리 칩
  - DRAFT일 때 카드 하단에 수정/삭제 액션
  - DRAFT일 때 인라인 "+ 항목 추가" 점선 박스 버튼 (`AppRadius.card`, `AppSemanticColors.borderDefault`)
  - 참가자별 합산 금액 섹션 (`_ParticipantAllocationSection`) — `summaryAsync`의 `participants[].userId/totalShare`
  - 빈 상태: `AppEmptyState(icon: Icons.receipt_long, title: '아직 항목이 없습니다', actionLabel: '항목 추가')` (DRAFT일 때만 actionLabel 노출)
- **사용자가 할 수 있는 액션**:
  - "+ 항목 추가" 탭 ▶ `SettlementItemFormDialog(mode: add, prefill?)` ▶ `addItem(MeetingSettlementItemParam)` ▶ `POST .../items`
  - 카드 "수정" 아이콘 ▶ 동일 다이얼로그(prefill=기존 값) ▶ `updateItem(itemId, param)` ▶ `PUT .../items/{itemId}`
  - 카드 "삭제" 아이콘 ▶ 확인 다이얼로그 → `deleteItem(itemId)` ▶ `DELETE .../items/{itemId}` ▶ 토스트
- **상태 분기**:
  - `itemsAsync.when` 로딩 시 `CircularProgressIndicator`
  - 에러 시 `AppErrorState(title:)` + onRetry로 invalidate
  - DRAFT 아닐 때 onEdit/onDelete null로 전달 → 카드 액션 숨김

### 항목 폼 다이얼로그 (`settlement_item_form_dialog.dart`)
- **사용자가 보는 것**:
  - 카테고리 선택 칩 (옵션 D — `SettlementItemCategory` 8개)
  - 최근 항목 칩 (Quick Pick — `recent_settlement_items_provider` 호출 결과, `(title, amount)` 묶음, lastUsedAt desc)
  - 제목 입력 / 금액 입력 (천단위 콤마)
  - holder 사용자 선택 (참여자 추천)
  - 분할 타입 선택 (EQUAL/CUSTOM/RATIO) → 해당 폼 위젯 노출
  - 영수증 첨부 (옵션 — file 도메인 업로드 → fileId 보관)
  - "저장" CTA
- **사용자가 할 수 있는 액션**:
  - 카테고리 칩 탭 ▶ `_recentItemsProvider(category=...)` 재호출 ▶ Quick Pick 칩 자동완성 갱신
  - 최근 항목 칩 탭 ▶ title/amount/category prefill
  - 분할 타입 변경 ▶ 폼 영역 swap (EQUAL은 체크박스, CUSTOM은 사용자별 금액 입력, RATIO는 비율 입력)
  - "저장" 탭 ▶ 검증 통과 시 add/update API 호출 → 토스트 + 다이얼로그 닫힘

### Quick-Add 진입 (`settlement_quick_add_screen.dart`)
- 딥링크 파라미터(`prefillTitle`, `prefillAmount`, `cardCompany`)를 그대로 다이얼로그 prefill로 전달

### API 호출 순서 (Provider/Repository 관점)

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
| 후보 | backend.md:101 | - Unit 11 (File): `receiptFileId`는 file 도메인에서 업로드 후 받은 ID — 별도 검증 없음 (영수증 다운로드는 F07-04에서 settlement-scope 검증) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:55 | **주의**: ACTIVE 진입 후 수정 시도 시 400 `MEETING_SETTLEMENT_NOT_DRAFT`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 · EQUAL) 균등 분할 항목을 5명에게 추가**: Given 정산 DRAFT 존재, 항목 0건 When 사용자가 해당 흐름을 실행하면 Then settlement total 96000, share 6건 모두 isCompleted=false, paymentMethod=POINT(default).
- **AC-02. (호스트 · CUSTOM) 항목별로 다른 금액을 부담시킨다**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (호스트 · RATIO) 비율 분할로 직책별 분담**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (호스트 · 항목 수정) 누락 사용자를 추가**: Given settlement DRAFT, 항목 1건 (6명 share) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (호스트 · 항목 삭제) 잘못 입력한 항목 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (엣지 · CUSTOM 합계 불일치 + autoBalance) 잔여를 마지막에 흡수**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (호스트 · Quick Pick 자동완성) 최근 항목으로 빠르게 추가**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (참가자 차단) 일반 참가자가 항목 추가 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
