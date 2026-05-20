# F08-04. 블록 드래그 재정렬 / 계층 이동 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-04_block-reorder -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-04_block-reorder`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

블록의 순서(sortOrder)와 부모/깊이(parentBlockId/depth)를 변경하는 두 개의 엔드포인트. 드래그앤드롭 UI에서 한 번 드롭한 결과를 일괄 반영(reorder)하거나, 단일 블록의 부모/순서/깊이를 한 번에 갱신(move)한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 블록 에디터(F08-03) ▶ 우측 상단 "재정렬" 텍스트 액션 ▶ `/plan/:planId/reorder`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-04_block-reorder/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-04_block-reorder/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-04_block-reorder/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-04_block-reorder/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/PlanBlockController.java:70` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanBlockController.java:78` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 진입 시: `planBlocksNotifierProvider(planId)` 캐시된 트리 사용 (별도 fetch 안 함, F08-03에서 이미 로드됨)
2. 사용자 드래그/들여쓰기는 모두 로컬 `BlockReorderModel`에서만 수행 (API 호출 X)
3. "완료" 탭 시:
   - parent가 변경된 블록 각각: `PlanRepository.moveBlock(blockId, MoveParam(parentBlockId, sortOrder, depth))` ▶ `PATCH /api/v1/plans/{planId}/blocks/{blockId}/move`
   - 각 부모 그룹별: `PlanRepository.reorderBlocks(blockIds)` ▶ `PUT /api/v1/plans/{planId}/blocks/reorder`
4. 모두 성공 시 `Navigator.pop` → 에디터로 복귀 (자동으로 invalidate되며 새 순서 반영)

## 4. 서버 계약

### 개요

블록의 순서(sortOrder)와 부모/깊이(parentBlockId/depth)를 변경하는 두 개의 엔드포인트. 드래그앤드롭 UI에서 한 번 드롭한 결과를 일괄 반영(reorder)하거나, 단일 블록의 부모/순서/깊이를 한 번에 갱신(move)한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| PUT | /api/v1/plans/{planId}/blocks/reorder | `PlanBlockController#reorderBlocks` | required | 순서 일괄 갱신 (`blockIds` 순서 그대로 0..N) |
| PATCH | /api/v1/plans/{planId}/blocks/{blockId}/move | `PlanBlockController#moveBlock` | required | 단일 블록 parent/order/depth 동시 갱신 |

### 도메인 모델 / Enum (이 기능 관련)

- **상수**:
  - `MAX_BLOCK_DEPTH = 3` (PlanBlockService)
  - `MAX_BLOCK_COUNT = 200`
- **PlanBlock**:
  - `parentBlockId: Long?` (root는 null)
  - `sortOrder: int NOT NULL` — 같은 parent 내 순서
  - `depth: int NOT NULL` — 들여쓰기 시각화용 깊이
- **에러 코드**:
  - 1500017 PLAN_BLOCK_DEPTH_EXCEEDED (400)
  - 1500012 PLAN_BLOCK_INVALID_PARENT (400)
  - 1500018 PLAN_NOT_EDITABLE (400)
  - 1500010 PLAN_BLOCK_NOT_FOUND (404)

### 의존 단위 / 외부 시스템

- **F08-03**: 같은 PlanBlockController 내 블록 CRUD와 동일한 권한·트랜잭션 가드
- 외부 시스템 의존 없음
- **DB 일관성 주의**:
  - reorder는 saveAll로 일괄 처리 — 동시 변경 시 마지막 요청이 우선
  - move는 단일 행 UPDATE — 사이클 방지 검증 없음 (예: A를 A의 자식으로 이동하면 트리 깨짐 가능). 프론트가 막아야 함

## 5. 프론트 계약

### 진입 경로

- 블록 에디터(F08-03) ▶ 우측 상단 "재정렬" 텍스트 액션 ▶ `/plan/:planId/reorder`

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/plan/:planId/reorder` | `plan/screens/block_reorder_screen.dart` | 드래그 + 들여/내어쓰기 |
| (모델) | `plan/screens/block_reorder_model.dart` | 평탄화/이동/그룹화 도메인 모델 |

### 화면별 구성 요소 & 액션

### 블록 재정렬 (`block_reorder_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '순서 변경')` (별도 액션 없음)
  - 상단 `_HintBanner`: 연두색 배경, 💡 + "길게 눌러 드래그로 순서 변경, 화살표 버튼으로 들여쓰기/내어쓰기"
  - `ReorderableListView.builder` — 드래그 핸들 + 블록 요약(아이콘 + 텍스트 1줄) + 들여/내어쓰기 IconButton
  - 들여쓴 블록은 `gray50` 배경, 좌측 패딩 `depth * 20`
  - 부모 변경된 블록은 좌측 `linkBlue` 2px 보더 (시각 피드백)
  - 하단 SafeArea + Padding: "취소" / "완료" 두 버튼 (각각 width 등분, primary500 / 흰색)
- **사용자가 할 수 있는 액션**:
  - 길게 눌러 드래그 ▶ `setState(() => model.reorder(o, n))` — 로컬 상태 변경, API 호출 안 함
  - 들여쓰기 (`format_indent_increase`) ▶ `model.indent(index)` — depth +1, parentBlockId 변경
  - 내어쓰기 (`format_indent_decrease`) ▶ `model.outdent(index)` — depth -1, parentBlockId 변경
  - "취소" ▶ `Navigator.of(context).pop()` (변경 폐기)
  - "완료" ▶ `_saveOrder()`:
    1. parentChanged된 블록만 `notifier.moveBlock(id, MoveParam)` 순차 호출 → `PATCH /move`
    2. parent별로 그룹핑한 후 각 그룹별 `notifier.reorderBlocks(ids)` → `PUT /reorder`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError`
  - 빈 트리: `AppErrorState(title: '블록이 없습니다')`
  - 저장 중: "완료" 버튼 자리에 `CircularProgressIndicator`
- **모달/시트/네비게이션**:
  - 별도 모달 없음
  - 저장 성공: `AppToast.show("순서가 변경되었습니다")` + `Navigator.pop()`
  - 일부 실패: `AppToast.show("일부 변경에 실패했습니다", ToastType.error)` (pop 안 함)

### API 호출 순서 (Provider/Repository 관점)

1. 진입 시: `planBlocksNotifierProvider(planId)` 캐시된 트리 사용 (별도 fetch 안 함, F08-03에서 이미 로드됨)
2. 사용자 드래그/들여쓰기는 모두 로컬 `BlockReorderModel`에서만 수행 (API 호출 X)
3. "완료" 탭 시:
   - parent가 변경된 블록 각각: `PlanRepository.moveBlock(blockId, MoveParam(parentBlockId, sortOrder, depth))` ▶ `PATCH /api/v1/plans/{planId}/blocks/{blockId}/move`
   - 각 부모 그룹별: `PlanRepository.reorderBlocks(blockIds)` ▶ `PUT /api/v1/plans/{planId}/blocks/reorder`
4. 모두 성공 시 `Navigator.pop` → 에디터로 복귀 (자동으로 invalidate되며 새 순서 반영)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **드래그 동작 (Flutter ReorderableListView)**:
  - 길게 누르기로 드래그 시작
  - `proxyDecorator`: 드래그 중 elevation 2의 Material로 감쌈
  - drop 위치 인디케이터는 ReorderableListView 기본 동작 활용
- **`BlockReorderModel` 핵심 메서드**:
  - `flatten(blocks)`: 트리 → 평탄화된 List<FlatBlock> (block + depth + parentBlockId)
  - `reorder(o, n)`: 인덱스 o → n으로 이동
  - `indent(index)` / `outdent(index)`: depth/parent 갱신, `canIndent`/`canOutdent`로 가능 여부 판단
  - `parentChanged: bool` per-item: 원본 parent와 다르면 true
  - `parentChangedBlocks()`: 변경된 블록 목록
  - `groupedByParent()`: parent별로 blockIds 그룹화 (Map<Long?, List<Long>>)
  - `sortOrderOf(fb)`: 형제 그룹 내 위치 (0..N)
- **저장 전략**:
  - 부분 실패 허용 (각 호출이 독립적 try/catch)
  - parent 변경부터 처리한 뒤 sort 갱신 — 새 부모로 옮긴 후에야 그룹별 reorder가 의미 있음
  - 모두 성공해야만 pop, 일부 실패면 화면에 머무름
- **들여쓰기/내어쓰기 UX**:
  - 형 직전에 같은/낮은 depth 블록이 있어야 indent 가능
  - 0번째이거나 형이 없으면 indent 비활성 (회색 아이콘)
  - depth 0이면 outdent 비활성
  - MAX_BLOCK_DEPTH=3 (서버 검증) 도달 시 indent 시도해도 서버 400 반환 (현재 클라이언트는 모델 단계에서 막지 않음 — 후속 개선 여지)
- **시각 단서**:
  - 부모 변경 블록: 좌측 `linkBlue` 2px (`AppColors.linkBlue` = #5B7FD8)
  - child 블록: `gray50` 배경 + 작은 폰트 (`isChild ? 12 : 13`)
  - 드래그 핸들 텍스트: `≡` (≡)
- **취소 정책**: 단순 pop만 호출. 로컬 모델은 화면 dispose와 함께 폐기 → 서버 상태는 변하지 않음
- **저장 실패 시 자동 새로고침 없음**: 부분 실패면 사용자가 다시 시도 또는 취소를 눌러야 함

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 같은 부모 안에서 두 블록 순서 바꾸기 (Happy Path) | DRAFT 플랜, 루트 5개 블록, parent 변경 없음 | 에디터에서 새 순서 반영 |
| S2 | 들여쓰기로 블록을 자식으로 만들기 | 루트 블록 A, B (B는 평블록) | B는 A의 자식 블록으로 트리 구조 변경 |
| S3 | depth 한도 초과 시도 | 이미 depth 3에 도달한 블록 | 부분 실패. 사용자가 직접 outdent 후 다시 저장해야 함 |
| S4 | 동시 편집 충돌 (다른 디바이스) | 시나리오 본문 참조 | 데이터 불일치 가능. 후속 개선: 화면 진입 전 fresh fetch + 변경된 ids만 보내도록 |
| S5 | 빈 트리에서 진입 | 시나리오 본문 참조 | 사용자는 취소만 가능 |
| S6 | 취소 | 시나리오 본문 참조 | 변경 없이 에디터로 복귀 |
| S7 | 비작성자/PUBLISHED 시도 (서버 가드) | 시나리오 본문 참조 | 차단. UI 가드는 F08-03에서 이미 `isCreatorOwned` 체크하므로 일반 흐름은 진입 자체가 차단됨 |

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
| 후보 | backend.md:88 | - **DB 일관성 주의**: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:90 | - move는 단일 행 UPDATE — 사이클 방지 검증 없음 (예: A를 A의 자식으로 이동하면 트리 깨짐 가능). 프론트가 막아야 함 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 같은 부모 안에서 두 블록 순서 바꾸기 (Happy Path)**: Given DRAFT 플랜, 루트 5개 블록, parent 변경 없음 When 사용자가 해당 흐름을 실행하면 Then 에디터에서 새 순서 반영
- **AC-02. 들여쓰기로 블록을 자식으로 만들기**: Given 루트 블록 A, B (B는 평블록) When 사용자가 해당 흐름을 실행하면 Then B는 A의 자식 블록으로 트리 구조 변경
- **AC-03. depth 한도 초과 시도**: Given 이미 depth 3에 도달한 블록 When 사용자가 해당 흐름을 실행하면 Then 부분 실패. 사용자가 직접 outdent 후 다시 저장해야 함
- **AC-04. 동시 편집 충돌 (다른 디바이스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 데이터 불일치 가능. 후속 개선: 화면 진입 전 fresh fetch + 변경된 ids만 보내도록
- **AC-05. 빈 트리에서 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자는 취소만 가능
- **AC-06. 취소**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없이 에디터로 복귀
- **AC-07. 비작성자/PUBLISHED 시도 (서버 가드)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단. UI 가드는 F08-03에서 이미 `isCreatorOwned` 체크하므로 일반 흐름은 진입 자체가 차단됨

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
