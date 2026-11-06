# F03-10. 이벤트 ↔ 플랜 연결 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트가 자기 이벤트에 미리 만들어둔 "플랜"(Unit 08 — 진행 시나리오/타임테이블) 을 N개 연결하고, 순서를 정하고, 활성/비활성 토글하는 기능. 같은 플랜을 여러 이벤트에 재사용할 수 있다. 본 단위는 매핑 CRUD 만 다룸 — 플랜 자체의 생성/편집은 Unit 08 영역. 매핑 시 `override_*` 필드로 이 이벤트에서만 다른 시간/장소를 적용할 수도 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 호스트: 이벤트 상세 (`SCR-EV-002`) 의 호스트 더보기 메뉴 또는 액션바 → "플랜 연결" → `/home/events/:eventId/plans`
- 라우터 가드: `_redirectEventAccess(hostOrStaff)` — 호스트/공동호스트/클럽 staff 만

> 일반 참가자가 이벤트 상세에서 보는 "이 모임 진행 플랜" 미리보기는 본 화면이 아니라 `EventVo.plans` 필드로 함께 받아서 표시 — F03-02 영역.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventPlanMapController`. 앱: `event_plan_link_screen.dart`, `event_plan_card.dart`, `plan_search_sheet.dart`.

<!-- source-references:start -->
서버 창구: `EventPlanMapController#getEventPlans`, `EventPlanMapController#addPlanToEvent`, `EventPlanMapController#updateMapping`, `EventPlanMapController#removePlanFromEvent`, `EventPlanMapController#toggleActive`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 2026-10-29 현재 계약 대조

### 연결 플랜 순서는 한 번에 저장합니다

연결 목록의 순서 변경은 모임의 전체 연결 번호 목록을 한 번에 보낸다. 비활성 연결도 빠뜨리지 않고 서버가 모임 잠금 아래에서 전체 목록을 확인해 저장한다. 같은 모임의 연결 추가·제거·순서 변경은 함께 직렬화한다.

기존 설계 중 이 규칙과 다른 서술은 아래 현재 계약을 기준으로 정정한다. 운영·실기기 완료 판정은 [현재 출시 상태표](../../../docs/qa/launch-status.html)를 따른다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-11-01에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `GET /api/v1/events/{eventId}/plans` | `EventPlanMapController#getEventPlans` | [EventPlanMapController.java:31](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventPlanMapController.java#L31) |
| `POST /api/v1/events/{eventId}/plans` | `EventPlanMapController#addPlanToEvent` | [EventPlanMapController.java:38](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventPlanMapController.java#L38) |
| `PATCH /api/v1/events/{eventId}/plans/{mapId}` | `EventPlanMapController#updateMapping` | [EventPlanMapController.java:47](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventPlanMapController.java#L47) |
| `DELETE /api/v1/events/{eventId}/plans/{mapId}` | `EventPlanMapController#removePlanFromEvent` | [EventPlanMapController.java:68](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventPlanMapController.java#L68) |
| `POST /api/v1/events/{eventId}/plans/{mapId}/toggle-active` | `EventPlanMapController#toggleActive` | [EventPlanMapController.java:77](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventPlanMapController.java#L77) |
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 플랜 연결의 조회·추가·수정·토글·해제는 호스트, 활성 공동호스트, 클럽 운영진만 한다. 아니면 `EVENT_NOT_OWNER` 다.
- 이 권한과 달리 모임 상세를 읽는 사람은 연결된 플랜을 함께 받는다. 비활성 연결을 가리는 것은 앱이 정한다.

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
