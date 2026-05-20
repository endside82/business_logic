# F08-03. 블록 에디터 (블록 CRUD) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-03_block-editor -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-03_block-editor`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

플랜의 본문을 트리 구조의 PlanBlock으로 관리한다. 텍스트/제목/이미지/장소/시간표/체크리스트 등 20종 블록을 추가·수정·삭제·복원할 수 있다. 모든 편집 작업은 `status == DRAFT`인 본인 플랜에서만 허용되며, soft delete + restore 패턴을 사용한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 플랜 상세(F08-02)에서 "편집" 버튼 ▶ `/plan/:planId/edit`
- 플랜 목록에서 새 플랜 생성 직후 자동 push

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-03_block-editor/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-03_block-editor/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-03_block-editor/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-03_block-editor/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/PlanBlockController.java:30` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanBlockController.java:35` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanBlockController.java:44` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanBlockController.java:53` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanBlockController.java:62` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입:
   - `planDetailNotifierProvider(planId)`로 `isCreatorOwned` 체크 (가드)
   - `planBlocksNotifierProvider(planId)` ▶ `PlanRepository.getBlockTree(planId)` ▶ `GET /api/v1/plans/{planId}/blocks`
2. 블록 추가: `planBlocksNotifierProvider(planId).notifier.addBlock(PlanBlockAddParam)` ▶ `POST /blocks`
3. 텍스트 자동 저장 (debounce 300ms): `notifier.updateBlock(id, PlanBlockModParam(content), silent: true)` ▶ `PATCH /blocks/{id}` — silent=토스트 없이 인디케이터만
4. 타입별 다이얼로그 저장: `notifier.updateBlock(id, PlanBlockModParam(content, properties))`
5. 타입 변환(마크다운): `notifier.updateBlock(id, PlanBlockModParam(blockType:newType, content:''))`
6. 삭제: `notifier.deleteBlock(id)` ▶ `DELETE /blocks/{id}` → Undo 토스트
7. 복원: `notifier.restoreBlock(id)` ▶ `POST /blocks/{id}/restore`
8. 복제: `notifier.addBlock(...same properties...)` ▶ `POST /blocks`

## 4. 서버 계약

### 개요

플랜의 본문을 트리 구조의 PlanBlock으로 관리한다. 텍스트/제목/이미지/장소/시간표/체크리스트 등 20종 블록을 추가·수정·삭제·복원할 수 있다. 모든 편집 작업은 `status == DRAFT`인 본인 플랜에서만 허용되며, soft delete + restore 패턴을 사용한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/plans/{planId}/blocks | `PlanBlockController#getBlockTree` | optional | 블록 트리 (`children` 포함 재귀 구조) |
| POST | /api/v1/plans/{planId}/blocks | `PlanBlockController#addBlock` | required | 블록 추가, 한도 200, sortOrder shift |
| PATCH | /api/v1/plans/{planId}/blocks/{blockId} | `PlanBlockController#updateBlock` | required | 블록 부분 수정 |
| DELETE | /api/v1/plans/{planId}/blocks/{blockId} | `PlanBlockController#deleteBlock` | required | Soft delete (자손 일괄) |
| POST | /api/v1/plans/{planId}/blocks/{blockId}/restore | `PlanBlockController#restoreBlock` | required | Soft delete 복원 |

(reorder/move는 F08-04에서 별도 다룸)

### 도메인 모델 / Enum (이 기능 관련)

- **PlanBlockType** (20개, `constants/PlanBlockType.java`):
  `PARAGRAPH`, `HEADING_1`, `HEADING_2`, `HEADING_3`, `BULLETED_LIST`, `NUMBERED_LIST`, `TODO`, `TOGGLE`, `QUOTE`, `CALLOUT`, `DIVIDER`, `IMAGE`, `VIDEO`, `TIMETABLE`, `LOCATION`, `FILE`, `CODE`, `TABLE`, `EMBED`, `BOOKMARK`
- **PlanBlock** 핵심 필드 (`model/PlanBlock.java`):
  - `id`, `planId`, `parentBlockId: Long?`
  - `blockType: PlanBlockType (NOT NULL, EnumType.STRING, 30자)`
  - `content (TEXT)`, `properties (JSON)`
  - `sortOrder: int NOT NULL`, `depth: int NOT NULL`
  - `deletedAt: LocalDateTime?` — `@SQLRestriction("deleted_at IS NULL")`
  - 한도 상수: `MAX_BLOCK_COUNT = 200`, `MAX_BLOCK_DEPTH = 3`
- **에러 코드**:
  - 1500010 PLAN_BLOCK_NOT_FOUND
  - 1500011 PLAN_BLOCK_INVALID_TYPE
  - 1500012 PLAN_BLOCK_INVALID_PARENT
  - 1500016 PLAN_BLOCK_LIMIT_EXCEEDED
  - 1500017 PLAN_BLOCK_DEPTH_EXCEEDED
  - 1500018 PLAN_NOT_EDITABLE
  - 1500019 PLAN_BLOCK_NOT_DELETED

### 의존 단위 / 외부 시스템

- **F08-02**: 화면 구성 시 `PlanVo.isCreatorOwned`로 편집 가능 여부 1차 판단
- **F08-04**: 같은 PlanBlockController의 `/reorder`, `/move`
- **File (Unit 미지정 / 횡단)**: 이미지/파일 블록 properties에는 S3 file_key가 들어가지만, 본 단위 API는 properties JSON 문자열을 그대로 저장만 하고 검증은 하지 않음
- 외부 PG/FCM 호출 없음

## 5. 프론트 계약

### 진입 경로

- 플랜 상세(F08-02)에서 "편집" 버튼 ▶ `/plan/:planId/edit`
- 플랜 목록에서 새 플랜 생성 직후 자동 push

### 사용 라우트 & 화면 파일

| 라우트 | Screen / Widget | 역할 |
|---|---|---|
| `/plan/:planId/edit` | `plan/screens/block_editor_screen.dart` | 블록 트리 편집 메인 |
| (모달 시트) | `plan/widgets/block_type_sheet.dart` | 블록 타입 선택 시트 |
| (다이얼로그들) | `plan/widgets/block_edit_dialogs/{callout,image,link,list,location,timetable,todo}_block_edit_dialog.dart` | 타입별 전용 편집 |
| (자식 화면) | `plan/screens/block_reorder_screen.dart` | 재정렬 (F08-04) |
| (렌더러) | `plan/widgets/block_renderer.dart` | 트리 렌더링 (상세에서 재사용) |

### 화면별 구성 요소 & 액션

### 블록 에디터 (`block_editor_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '블록 편집')` + 우측 액션:
    - DRAFT면 "저장됨" 인디케이터 (`Icons.cloud_done_outlined`)
    - 텍스트 액션 "재정렬" → `context.push('/plan/$planId/reorder')`
  - 상단 `AppErrorState(title: '접근 권한이 없습니다')` — `!isCreatorOwned`인 경우
  - 본문: 트리를 DFS로 평탄화한 ListView (`_countBlocks`/`_walk`)
    - 텍스트 계열(PARAGRAPH/H1~3/QUOTE/CALLOUT/CODE) → `_InlineTextBlockCard` (인라인 TextField + 디바운스 저장)
    - 그 외 → `_BlockCard` (탭 시 타입별 다이얼로그)
  - 하단 우측 FAB-like "+ 블록 추가" (Container 52 height, primary500, radius 26)
- **사용자가 할 수 있는 액션**:
  - "+ 블록 추가" 탭 ▶ `BlockTypeSheet` 모달 시트 ▶ 선택 ▶ `_addBlock(blockType)` ▶ `POST /api/v1/plans/{id}/blocks` (content="", depth=0)
  - 텍스트 블록 입력 ▶ debounce 300ms ▶ `_autoSaveText(blockId, value)` ▶ `PATCH /api/v1/plans/{id}/blocks/{blockId}` (silent: 토스트 없음)
  - 텍스트 블록에서 마크다운 단축키 매칭(`detectMarkdownShortcut`) ▶ `_convertBlockType(blockId, newType)` ▶ blockType 변경 + content 비움
  - 비텍스트 블록 탭 ▶ `_openTypedEditor` ▶ 타입별 다이얼로그 ▶ `_applyEdit(block, BlockEditResult)` ▶ `PATCH ...`
  - 길게 누르기 ▶ 컨텍스트 시트 (편집/복제/삭제)
  - "삭제" ▶ `_deleteBlock` ▶ `DELETE /api/v1/plans/{id}/blocks/{blockId}` ▶ Undo 토스트 (`actionLabel: '실행 취소'`)
  - Undo 탭 ▶ `_restoreBlock` ▶ `POST /api/v1/plans/{id}/blocks/{blockId}/restore`
  - "복제" ▶ `_duplicateBlock` ▶ 같은 properties로 새 블록 추가
  - 풀투리프레시 ▶ `ref.invalidate(planBlocksNotifierProvider(planId))`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`
  - 빈 트리: `AppErrorState(title: '블록을 추가해보세요')`
  - 저장 인디케이터: `_SaveStatus { idle, dirty, saving, saved, error }` — TextField 우측 표시
- **모달/시트/네비게이션**:
  - `BlockTypeSheet` — 바텀시트 (isScrollControlled, transparent 배경)
  - 타입별 편집: 풀스크린 다이얼로그 (Image/Todo/Timetable/Location/List/Callout/Link/Bookmark)
  - 컨텍스트 메뉴: `showModalBottomSheet` ListTile (편집/복제/삭제)
  - 재정렬 push: `/plan/:planId/reorder` (F08-04)

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입:
   - `planDetailNotifierProvider(planId)`로 `isCreatorOwned` 체크 (가드)
   - `planBlocksNotifierProvider(planId)` ▶ `PlanRepository.getBlockTree(planId)` ▶ `GET /api/v1/plans/{planId}/blocks`
2. 블록 추가: `planBlocksNotifierProvider(planId).notifier.addBlock(PlanBlockAddParam)` ▶ `POST /blocks`
3. 텍스트 자동 저장 (debounce 300ms): `notifier.updateBlock(id, PlanBlockModParam(content), silent: true)` ▶ `PATCH /blocks/{id}` — silent=토스트 없이 인디케이터만
4. 타입별 다이얼로그 저장: `notifier.updateBlock(id, PlanBlockModParam(content, properties))`
5. 타입 변환(마크다운): `notifier.updateBlock(id, PlanBlockModParam(blockType:newType, content:''))`
6. 삭제: `notifier.deleteBlock(id)` ▶ `DELETE /blocks/{id}` → Undo 토스트
7. 복원: `notifier.restoreBlock(id)` ▶ `POST /blocks/{id}/restore`
8. 복제: `notifier.addBlock(...same properties...)` ▶ `POST /blocks`

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **인라인 자동 저장 정책**:
  - debounce 300ms (`_debounceDelay`)
  - blur 시 즉시 flush (`_flushImmediately`)
  - silent 옵션으로 토스트 억제 (사용자에게 시각적 인디케이터만)
- **`_SaveStatus` 인디케이터 시각화**:
  - dirty: "편집 중" 텍스트
  - saving: 작은 `CircularProgressIndicator (10×10)`
  - saved: `Icons.cloud_done_outlined` + "저장됨"
  - error: `Icons.error_outline` + "재시도 필요"
- **마크다운 단축키 매핑** (`markdown_shortcuts.dart`):
  - `# ` → HEADING_1
  - `## ` → HEADING_2
  - `### ` → HEADING_3
  - `- ` → BULLETED_LIST
  - `1. ` → NUMBERED_LIST
  - `> ` → QUOTE
  - `[] ` → TODO
  - 매칭 시 content 비우고 blockType 교체 (서버에서 검증되는 값)
- **블록별 시각 스타일** (`_containerDecoration`, `_fieldTextStyle`):
  - CALLOUT/CODE: `gray50` 배경
  - QUOTE: 좌측 primary500 3px 보더
  - HEADING_1/2/3: `AppTypography.heading1/2/3`
  - CODE: monospace 폰트
- **들여쓰기 시각화**: `depth * 24` 좌측 패딩, child(`isChild`)면 `gray50` 배경
- **블록 트리 평탄화**: DFS (`_walk`) — children 재귀 순회로 단일 ListView 인덱싱
- **컨텍스트 메뉴 항목**:
  - 텍스트 블록: 복제 / 삭제 (편집은 인라인이라 메뉴 없음)
  - 비텍스트 블록: 편집 / 복제 / 삭제
- **삭제 UX**: 다이얼로그 미사용. Undo 토스트로 처리 (서버 soft delete + restore API 활용)
- **타입별 다이얼로그 매핑** (`_openTypedEditor`):
  - IMAGE → `showImageBlockEditDialog`
  - TODO → `showTodoBlockEditDialog`
  - TIMETABLE → `showTimetableBlockEditDialog`
  - LOCATION → `showLocationBlockEditDialog`
  - BULLETED_LIST/NUMBERED_LIST → `showListBlockEditDialog`
  - CALLOUT → `showCalloutBlockEditDialog`
  - EMBED/BOOKMARK → `showLinkBlockEditDialog`
  - 그 외(VIDEO/FILE/TABLE/DIVIDER) → 폴백 `_legacyTextEdit` (TextField only)
- **+ 블록 추가 시 디폴트**: depth=0, parent 없음, content="" (시트는 sortOrder 안 보내서 끝에 추가)
- **권한 가드**: 화면 진입 시 `plan.isCreatorOwned == false`면 즉시 에러 화면 표시 (서버 호출 없이)
- **재정렬 액션**: 별도 화면(F08-04)으로 push, 본 화면 안에서는 드래그 지원 안 함

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 텍스트 블록 추가 + 인라인 입력 + 자동 저장 (Happy Path) | 빈 DRAFT 플랜, 블록 0개 | 블록 1개, 자동 저장 완료 |
| S2 | 마크다운 단축키로 블록 타입 변환 | 시나리오 본문 참조 | 블록 타입 변환 완료. 제목 텍스트 입력 모드 |
| S3 | 이미지 블록 추가 (전용 다이얼로그) | 시나리오 본문 참조 | 이미지 블록 등록 |
| S4 | Soft Delete + Undo | 시나리오 본문 참조 | 블록 + 자손 복원 |
| S5 | 블록 한도 초과 (200개) | 시나리오 본문 참조 | 블록 추가 실패. 사용자가 "다시 시도" 탭하면 재요청 |
| S6 | 발행된 플랜 편집 시도 | 자기 플랜이지만 `status == PUBLISHED` | 편집 차단. 작성자는 hide 후 다시 시도해야 함 (HIDDEN도 PlanService.publishPlan 허용 — 그러나 `validatePlanEditable`는 DRAFT만 허용) |
| S7 | 비작성자 진입 차단 | 시나리오 본문 참조 | 진입 차단 |
| S8 | 부모 블록에 자식 블록 추가 | 시나리오 본문 참조 | 자식 블록 생성은 F08-04 들여쓰기 액션으로 위임 |
| S9 | 인라인 편집 중 네트워크 오류 → 재시도 | 시나리오 본문 참조 | 사용자 재타이핑이 트리거가 됨 (현재 자동 재시도 없음) |

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
| 후보 | backend.md:120 | `PARAGRAPH`, `HEADING_1`, `HEADING_2`, `HEADING_3`, `BULLETED_LIST`, `NUMBERED_LIST`, `TODO`, `TOGGLE`, `QUOTE`, `CALLOUT`, `DIVIDER`, `IMAGE`, `VIDEO`, `TIMETABLE`, `LOCATION`, `FILE`, `CODE`, `TABLE`, `EMBED`, `BOOKMARK` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:78 | - `[] ` → TODO | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:93 | - TODO → `showTodoBlockEditDialog` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:74 | 1. TODO 블록 편집 다이얼로그에서 항목 추가 (TODO 자체에 children 추가) — 별도 시퀀스 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 텍스트 블록 추가 + 인라인 입력 + 자동 저장 (Happy Path)**: Given 빈 DRAFT 플랜, 블록 0개 When 사용자가 해당 흐름을 실행하면 Then 블록 1개, 자동 저장 완료
- **AC-02. 마크다운 단축키로 블록 타입 변환**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 블록 타입 변환 완료. 제목 텍스트 입력 모드
- **AC-03. 이미지 블록 추가 (전용 다이얼로그)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이미지 블록 등록
- **AC-04. Soft Delete + Undo**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 블록 + 자손 복원
- **AC-05. 블록 한도 초과 (200개)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 블록 추가 실패. 사용자가 "다시 시도" 탭하면 재요청
- **AC-06. 발행된 플랜 편집 시도**: Given 자기 플랜이지만 `status == PUBLISHED` When 사용자가 해당 흐름을 실행하면 Then 편집 차단. 작성자는 hide 후 다시 시도해야 함 (HIDDEN도 PlanService.publishPlan 허용 — 그러나 `validatePlanEditable`는 DRAFT만 허용)
- **AC-07. 비작성자 진입 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 진입 차단
- **AC-08. 부모 블록에 자식 블록 추가**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 자식 블록 생성은 F08-04 들여쓰기 액션으로 위임
- **AC-09. 인라인 편집 중 네트워크 오류 → 재시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 재타이핑이 트리거가 됨 (현재 자동 재시도 없음)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
