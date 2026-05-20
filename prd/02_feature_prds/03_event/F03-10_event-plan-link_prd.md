# F03-10. 이벤트 ↔ 플랜 연결 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-10_event-plan-link -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-10_event-plan-link`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트가 자기 이벤트에 미리 만들어둔 "플랜"(Unit 08 — 진행 시나리오/타임테이블) 을 N개 연결하고, 순서를 정하고, 활성/비활성 토글하는 기능. 같은 플랜을 여러 이벤트에 재사용할 수 있다. 본 단위는 매핑 CRUD 만 다룸 — 플랜 자체의 생성/편집은 Unit 08 영역. 매핑 시 `override_*` 필드로 이 이벤트에서만 다른 시간/장소를 적용할 수도 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 호스트: 이벤트 상세 (`SCR-EV-002`) 의 호스트 더보기 메뉴 또는 액션바 → "플랜 연결" → `/home/events/:eventId/plans`
- 라우터 가드: `_redirectEventAccess(hostOrStaff)` — 호스트/공동호스트/클럽 staff 만

> 일반 참가자가 이벤트 상세에서 보는 "이 모임 진행 플랜" 미리보기는 본 화면이 아니라 `EventVo.plans` 필드로 함께 받아서 표시 — F03-02 영역.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-10_event-plan-link/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-10_event-plan-link/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-10_event-plan-link/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-10_event-plan-link/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java:28` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java:35` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java:44` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java:53` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java:62` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 플랜 연결 (`event_plan_link_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "플랜 연결"
  - 빈 상태 (매핑 0건): 가운데 안내 — 아이콘(article_outlined, gray300), "연결된 플랜이 없습니다", `AppButton('플랜 연결하기')`
  - 매핑 ≥ 1: `ReorderableListView.builder` — 각 항목 `EventPlanCard`
    - 제목 (planTitle)
    - 활성 Switch (`isActive`)
    - 삭제 IconButton
  - 하단 고정 영역: `AppButton(variant: outline, label: '플랜 추가', icon: Icons.add, fullWidth: true)`
- **사용자가 할 수 있는 액션**:
  - 드래그로 순서 변경 → `eventPlanNotifier.reorder(oldIndex, newIndex)` — 내부적으로 PATCH 로 sortOrder 업데이트하거나 클라이언트에서 일괄 처리 (Provider 구현체가 결정)
  - 토글 → `eventPlanNotifier.toggleActive(mapId)` → `POST /api/v1/events/{id}/plans/{mapId}/toggle-active`
  - 삭제 → `eventPlanNotifier.deletePlan(mapId)` → `DELETE /api/v1/events/{id}/plans/{mapId}`
  - "플랜 추가" → `PlanSearchSheet.show(onSelect: (planId, _) => addPlan(planId))`
  - 추가 → `eventPlanNotifier.addPlan(planId)` → `POST /api/v1/events/{id}/plans` body `EventPlanMapAddParam{planId, sortOrder: null/last}`
- **상태 분기**: 로딩 (Spinner) / 에러 (`AppErrorState.fromError`) / 빈 상태 (위 inline 안내) / 데이터 (ReorderableListView)

### 플랜 검색 BottomSheet (`plan_search_sheet.dart`)

- 검색어 입력 → Unit 08 의 plan 검색 API 호출
- 결과 카드 탭 → onSelect(planId, planTitle) 콜백 → 부모 화면이 추가 액션 수행
- 본 단위는 호출 측만 — sheet 내부 구현은 plan 도메인

## 4. 서버 계약

### 개요

호스트가 자기 이벤트에 미리 만들어둔 "플랜"(Unit 08 — 진행 시나리오/타임테이블) 을 N개 연결하고, 순서를 정하고, 활성/비활성 토글하는 기능. 같은 플랜을 여러 이벤트에 재사용할 수 있다. 본 단위는 매핑 CRUD 만 다룸 — 플랜 자체의 생성/편집은 Unit 08 영역. 매핑 시 `override_*` 필드로 이 이벤트에서만 다른 시간/장소를 적용할 수도 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/plans` | `EventPlanMapController#getEventPlans` | 호스트/공동호스트/클럽관리자 | 매핑 목록 (sortOrder 순) + planTitle |
| POST | `/api/v1/events/{eventId}/plans` | `EventPlanMapController#addPlanToEvent` | 호스트/공동호스트/클럽관리자 | 플랜 매핑 추가 |
| PATCH | `/api/v1/events/{eventId}/plans/{mapId}` | `EventPlanMapController#updateMapping` | 호스트/공동호스트/클럽관리자 | 매핑 일부 필드 수정 (sortOrder/isActive/override_*) |
| DELETE | `/api/v1/events/{eventId}/plans/{mapId}` | `EventPlanMapController#removePlanFromEvent` | 호스트/공동호스트/클럽관리자 | 매핑 삭제 |
| POST | `/api/v1/events/{eventId}/plans/{mapId}/toggle-active` | `EventPlanMapController#toggleActive` | 호스트/공동호스트/클럽관리자 | isActive 토글 |

### 의존 단위 / 외부 시스템

- **Unit 08 플랜 마켓** — `Plan` 엔티티는 plan 도메인 소유. 본 단위는 `planRepository.findById` 로 title 조회만 하고, 플랜 CRUD/구매는 Unit 08.
- **F03-02 이벤트 상세 조회** — `EventVo.plans: List<EventPlanMapVo>` 필드로 일반 사용자에게도 매핑 목록(`isActive=true` 만 노출하는 것은 클라이언트 측 결정) 노출. 본 단위 API 의 list 권한과는 별개로, 이벤트 상세 조회는 누구나 plans 필드를 받을 수 있다.
- 외부: 없음

## 5. 프론트 계약

### 진입 경로

- 호스트: 이벤트 상세 (`SCR-EV-002`) 의 호스트 더보기 메뉴 또는 액션바 → "플랜 연결" → `/home/events/:eventId/plans`
- 라우터 가드: `_redirectEventAccess(hostOrStaff)` — 호스트/공동호스트/클럽 staff 만

> 일반 참가자가 이벤트 상세에서 보는 "이 모임 진행 플랜" 미리보기는 본 화면이 아니라 `EventVo.plans` 필드로 함께 받아서 표시 — F03-02 영역.

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/plans` | `event_plan_link_screen.dart` | 매핑 목록 + 순서 변경 + 토글/삭제 + 추가 |

위젯:
- `widgets/event_plan_card.dart` — 카드 (제목 + 활성 토글 + 삭제 버튼)
- `widgets/plan_search_sheet.dart` — 플랜 검색 BottomSheet (Unit 08 의 plan 검색 API 사용)

### 화면별 구성 요소 & 액션

### 플랜 연결 (`event_plan_link_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "플랜 연결"
  - 빈 상태 (매핑 0건): 가운데 안내 — 아이콘(article_outlined, gray300), "연결된 플랜이 없습니다", `AppButton('플랜 연결하기')`
  - 매핑 ≥ 1: `ReorderableListView.builder` — 각 항목 `EventPlanCard`
    - 제목 (planTitle)
    - 활성 Switch (`isActive`)
    - 삭제 IconButton
  - 하단 고정 영역: `AppButton(variant: outline, label: '플랜 추가', icon: Icons.add, fullWidth: true)`
- **사용자가 할 수 있는 액션**:
  - 드래그로 순서 변경 → `eventPlanNotifier.reorder(oldIndex, newIndex)` — 내부적으로 PATCH 로 sortOrder 업데이트하거나 클라이언트에서 일괄 처리 (Provider 구현체가 결정)
  - 토글 → `eventPlanNotifier.toggleActive(mapId)` → `POST /api/v1/events/{id}/plans/{mapId}/toggle-active`
  - 삭제 → `eventPlanNotifier.deletePlan(mapId)` → `DELETE /api/v1/events/{id}/plans/{mapId}`
  - "플랜 추가" → `PlanSearchSheet.show(onSelect: (planId, _) => addPlan(planId))`
  - 추가 → `eventPlanNotifier.addPlan(planId)` → `POST /api/v1/events/{id}/plans` body `EventPlanMapAddParam{planId, sortOrder: null/last}`
- **상태 분기**: 로딩 (Spinner) / 에러 (`AppErrorState.fromError`) / 빈 상태 (위 inline 안내) / 데이터 (ReorderableListView)

### 플랜 검색 BottomSheet (`plan_search_sheet.dart`)

- 검색어 입력 → Unit 08 의 plan 검색 API 호출
- 결과 카드 탭 → onSelect(planId, planTitle) 콜백 → 부모 화면이 추가 액션 수행
- 본 단위는 호출 측만 — sheet 내부 구현은 plan 도메인

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 호스트가 첫 플랜 연결 | 이벤트 status=DRAFT, `event_plan_map` 0건 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S2 | 두 번째 플랜 연결 + 순서 변경 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 플랜 비활성 토글 | 호스트가 사정상 이번 회차에는 특정 플랜을 진행하지 않기로 함 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 매핑 삭제 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 동일 플랜 중복 매핑 시도 | 이미 `(eventId=10, planId=7)` 매핑 존재 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 플랜이 삭제된 후 매핑 조회 | planId=7 이 plan 도메인에서 삭제됨, 그러나 `event_plan_map` 행은 남아있음 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 권한 없는 사용자 직접 호출 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 일반 참가자가 이벤트 상세에서 플랜 미리보기 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | frontend.md:60 | - **override_*` 필드들의 UI 노출**: 현재 화면은 sortOrder/isActive/삭제만 다루며, `overrideLocation`/시간 필드는 미노출 (서버 API 는 지원하지만 UI 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:62 | 4. Flutter: 토스트(현재 화면은 명시적 토스트 미구현 — Provider error 로 처리) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:80 | [E2E 보강: seed_event_authoring_surface_test.dart::event_plan_link_member_gate — 비호스트가 `/home/events/{id}/plans` 직접 진입 시 라우터 redirect로 `screenEventPlanLink` 미마운트, 대신 `screenEventDetail`로 복귀. 즉 backend 403보다 먼저 client-side router guard가 동작.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 호스트가 첫 플랜 연결**: Given 이벤트 status=DRAFT, `event_plan_map` 0건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. 두 번째 플랜 연결 + 순서 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 플랜 비활성 토글**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 매핑 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 동일 플랜 중복 매핑 시도**: Given 이미 `(eventId=10, planId=7)` 매핑 존재 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 플랜이 삭제된 후 매핑 조회**: Given planId=7 이 plan 도메인에서 삭제됨, 그러나 `event_plan_map` 행은 남아있음 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 권한 없는 사용자 직접 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 일반 참가자가 이벤트 상세에서 플랜 미리보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
