# F08-03. 블록 에디터 (블록 CRUD) PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-10; unit: business_logic/units/08_plan_market/F08-03_block-editor -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-03_block-editor`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-07-29 현재 소스 갱신: 여행/플랜 에디터 후속이 반영됐다. 모바일 IME Enter는 블록 분할로 처리되고, URL 입력은 bookmark/link card 제안으로 이어지며, 체크리스트/시간표 업데이트와 controller 정리가 들어갔다. 앱은 course map 렌더링, system share, Kakao plan share를 지원하고, 서버는 공개 preview teaser(텍스트 3 + 이미지 1 + 시간표 1)와 작성자 선택 sample preview(최대 5개)를 내려준다. 발행 준비와 상세/공유 문서는 F08-05/F08-02/F08-10도 함께 확인한다.

## 1. 결론

플랜의 본문을 트리 구조의 PlanBlock으로 관리한다. 서버와 Flutter 렌더러는 known 블록 20종을 처리하지만, 현재 추가 picker는 목록 두 종류(`BULLETED_LIST`, `NUMBERED_LIST`)를 인라인 서식으로 단일화해 **18종만 직접 생성**한다. 레거시 목록 블록은 렌더·편집 호환을 유지한다. 모든 편집 작업은 `status == DRAFT`인 본인 플랜에서만 허용되며, soft delete + restore 패턴을 사용한다.

AUTH-02(자동저장)·AUTH-03(블록 picker + 패턴) 구현이 완료되어 다음 capability가 추가되었다.

- **AUTH-02 자동저장 경합 제거**: `DraftSaveController`의 generation token 워터마크로 out-of-order save 완료가 최신 편집을 덮어쓰지 않음. 에디터 전역 dirty/saving/saved/failed/offline 상태가 앱바에 노출되며, 실패 시 retry 재시도 흐름 존재.
- **AUTH-03 블록 picker 고도화**: 카테고리·검색·최근 사용 섹션을 갖춘 `BlockTypeSheet`가 직접 생성 가능한 18종을 노출한다. 검색은 블록과 패턴을 함께 찾고 exact/prefix/substring/keyword 순으로 정렬한다. **12개 predefined authoring pattern**(모임 8 + 여행 4)을 삽입할 수 있다.

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
3. 텍스트 자동 저장 (debounce 300ms): `notifier.updateBlock(id, PlanBlockModParam(content), silent: true)` ▶ `PATCH /blocks/{id}` — silent=토스트 없이 인디케이터만. 저장 호출 직전에 `_saveController.genOf(blockId)`로 generation을 캡처하고, 완료 시 `markSaved(blockId, gen)`으로 out-of-order 완료를 워터마크로 처리함.
4. 타입별 다이얼로그 저장: `notifier.updateBlock(id, PlanBlockModParam(content, properties))`
5. 타입 변환(마크다운): `notifier.updateBlock(id, PlanBlockModParam(blockType:newType, content:''))`
6. 삭제: `notifier.deleteBlock(id)` ▶ `DELETE /blocks/{id}` → Undo 토스트. 삭제 시 `_saveController.forgetTree(subtreeIds)` 호출로 자손 블록의 dirty/failed 마킹을 일괄 해제.
7. 복원: `notifier.restoreBlock(id)` ▶ `POST /blocks/{id}/restore`
8. 복제: `notifier.addBlock(...same properties...)` ▶ `POST /blocks`
9. 패턴 삽입(AUTH-03): `BlockTypeSheet`에서 패턴 선택 → `_saveController.beginOperation()` 후 pattern.blocks 순서대로 `POST /blocks` 순차 호출 → `_saveController.endOperation()`. 중간 실패 시 `endOperation(failed: true)`로 인디케이터에 실패 표시.

## 4. 서버 계약

### 개요

서버 known 타입과 Flutter 렌더러는 20종을 다루며, picker 신규 생성은 인라인 목록으로 대체된 2종을 제외한 18종이다. 모든 편집 작업은 `status == DRAFT`인 본인 플랜에서만 허용되며, soft delete + restore 패턴을 사용한다.

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
  - `blockType: String (NOT NULL, 30자)` — known 20종은 정상 저장, 미지 타입은 `rawEnvelope`에 원본을 보존하는 버전 내성 계약
  - `content (TEXT)`, `properties (JSON)`
  - `sortOrder: int NOT NULL`, `depth: int NOT NULL`
  - `deletedAt: LocalDateTime?` — `@SQLRestriction("deleted_at IS NULL")`
  - `schemaVersion`, `rawEnvelope`
  - 한도 상수: `MAX_BLOCK_COUNT = 200`, `MAX_BLOCK_DEPTH = 3`
- **에러 코드**:
  - 1500010 PLAN_BLOCK_NOT_FOUND
  - 1500011 PLAN_BLOCK_INVALID_TYPE
  - 1500012 PLAN_BLOCK_INVALID_PARENT
  - 1500016 PLAN_BLOCK_LIMIT_EXCEEDED
  - 1500017 PLAN_BLOCK_DEPTH_EXCEEDED
  - 1500018 PLAN_NOT_EDITABLE
  - 1500019 PLAN_BLOCK_NOT_DELETED

> **2026-07-29 정정(블록 depth 신뢰 경계)**: add 시 depth는 클라이언트 값을 저장하지 않고 `parent.depth + 1`로 서버가 산출한 뒤 최대 깊이를 검증한다. move도 대상 parent 기준으로 재산출한다. 과거의 “POST/PATCH가 임의 depth를 신뢰한다” Gap은 현행 소스에 적용되지 않는다.

### 의존 단위 / 외부 시스템

- **F08-02**: 화면 구성 시 `PlanVo.isCreatorOwned`로 편집 가능 여부 1차 판단
- **F08-04**: 같은 PlanBlockController의 `/reorder`, `/move`
- **File (횡단)**: IMAGE/VIDEO/FILE은 `properties.fileId`를 사용한다. 서버는 존재·작성자 소유·`COMPLETED`·`PLAN_BLOCK` purpose를 검증하고 `plan_block_file`에 등록한 뒤, 읽기 권한 게이트 통과 후 표시용 미디어 projection을 붙인다.
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
    - DRAFT면 `_DraftSaveIndicator` (AUTH-02): `DraftSaveController`의 `DraftSaveState`를 구독해 saving/dirty/saved/failed/offline 상태를 앱바에 실시간 표시. 실패 시 "재시도" CTA 노출 → `failedBlockIds`의 각 블록에 대해 `_autoSaveText(blockId, latestValue, genOf)` retry.
    - 텍스트 액션 "재정렬" → `context.push('/plan/$planId/reorder')`
  - 상단 `AppErrorState(title: '접근 권한이 없습니다')` — `!isCreatorOwned`인 경우
  - 본문: 트리를 DFS로 평탄화한 ListView (`_countBlocks`/`_walk`)
    - 텍스트 계열(PARAGRAPH/H1~3/QUOTE/CALLOUT/CODE) → `_InlineTextBlockCard` (인라인 TextField + 디바운스 저장)
    - 그 외 → `_BlockCard` (탭 시 타입별 다이얼로그)
  - 하단 우측 FAB-like "+ 블록 추가" (Container 52 height, primary500, radius 26)
- **사용자가 할 수 있는 액션**:
  - "+ 블록 추가" 탭 ▶ `BlockTypeSheet` 모달 시트 (AUTH-03) ▶ 단일 블록 선택 → `_addBlock(blockType)` ▶ `POST /api/v1/plans/{id}/blocks` (content="", depth=0) / 패턴 선택 → `_insertPattern(AuthoringPattern)` ▶ pattern.blocks 순차 POST
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
3. 텍스트 자동 저장 (debounce 300ms): `notifier.updateBlock(id, PlanBlockModParam(content), silent: true)` ▶ `PATCH /blocks/{id}` — generation 캡처 후 완료 시 `_saveController.markSaved(blockId, gen)` 호출 (AUTH-02)
4. 타입별 다이얼로그 저장: `notifier.updateBlock(id, PlanBlockModParam(content, properties))`
5. 타입 변환(마크다운): `notifier.updateBlock(id, PlanBlockModParam(blockType:newType, content:''))`
6. 삭제: `notifier.deleteBlock(id)` ▶ `DELETE /blocks/{id}` → Undo 토스트 + `_saveController.forgetTree(subtreeIds)`
7. 복원: `notifier.restoreBlock(id)` ▶ `POST /blocks/{id}/restore`
8. 복제: `notifier.addBlock(...same properties...)` ▶ `POST /blocks`
9. 패턴 삽입(AUTH-03): `_saveController.beginOperation()` → pattern.blocks 순차 `POST /blocks` → `_saveController.endOperation()`

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **인라인 자동 저장 정책 (AUTH-02)**:
  - debounce 300ms (`_debounceDelay`)
  - blur 시 즉시 flush (`_flushImmediately`)
  - silent 옵션으로 토스트 억제 (사용자에게 시각적 인디케이터만)
  - **Generation token 경합 방지**: `DraftSaveController.markDirty(blockId, value)` 호출 시 해당 블록의 generation이 단조 증가. 저장 완료 시 `markSaved(blockId, savedGen)`이 `_savedGen`(최고 완료 generation)과 현재 generation을 비교해 아직 미저장 편집이 있으면 블록을 clean으로 전환하지 않음. 더 느린 v1 save가 빠른 v2 save 이후 도달해도 `highestSaved >= currentGen` 조건 실패로 v2를 덮어쓰지 않음 (`draft_save_controller.dart:76`)
  - **retry**: 실패한 블록 id는 `DraftSaveState.failedBlockIds`에 보존. 앱바 "재시도" CTA가 `latestValueOf(blockId)` (markDirty 시 캡처한 최신 로컬 텍스트)로 retry 호출 — provider tree의 stale 값이 아닌 미저장 최신값 사용 (`draft_save_controller.dart:38,165`)
  - **route leave guard**: dirty/failed 블록 또는 진행 중 pattern-op(`kPatternOpKey=-1`)가 있으면 화면 이탈 시 `_confirmLeave` 다이얼로그 표시 (`block_editor_screen.dart:622`)
- **`_SaveStatus` 인디케이터 시각화** (블록-local, `_InlineTextBlockCard` 우측):
  - dirty: "편집 중" 텍스트
  - saving: 작은 `CircularProgressIndicator (10×10)`
  - saved: `Icons.cloud_done_outlined` + "저장됨"
  - error: `Icons.error_outline` + "재시도 필요"
- **`_DraftSaveIndicator` (AUTH-02, 에디터 전역, 앱바)**: `DraftSaveController`가 집계한 `DraftSaveStatus`를 구독. saving → spinner, dirty → "편집 중", saved → cloud_done + 마지막 저장 시각, failed → 경고 아이콘 + "재시도", offline → 오프라인 아이콘 (`block_editor_screen.dart:1174`)
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
  - VIDEO → `showVideoBlockEditSheet`
  - FILE → `showFileBlockEditSheet`
  - TABLE → `showTableBlockEditSheet`
  - TOGGLE → `showToggleBlockEditSheet`
  - DIVIDER는 내용 편집 없이 문서 구분선으로 렌더링
- **+ 블록 추가 시 디폴트**: depth=0, parent 없음, content="" (시트는 sortOrder 안 보내서 끝에 추가)
- **BlockTypeSheet 구조 (AUTH-03)**: `DraggableScrollableSheet(initialChildSize: 0.7)`. 섹션 순서: 검색바 → 최근 사용(recents) → 패턴(`_PatternSection`) → 카테고리별 블록 목록. 처음에는 최근 사용 우선 추천 5개 패턴을 보이고 “모든 패턴”으로 12개를 펼친다. 검색 결과는 블록과 패턴을 별도 섹션으로 노출하며 exact/prefix/substring/keyword 점수로 정렬한다. `authoringUsageMetadataProvider`로 최근 사용 블록·패턴 id를 추적한다.
- **12개 predefined authoring pattern** (`authoring_pattern.dart`):
  1. `meeting_intro` — 모임 소개 (HEADING_2 × 1 + PARAGRAPH × 2)
  2. `target_audience` — 참가 대상 (HEADING_2 × 1 + 인라인 bullet `PARAGRAPH` × 3)
  3. `preparations` — 준비물 (HEADING_2 × 1 + TODO × 3)
  4. `timetable` — 타임테이블 (HEADING_2 × 1 + TIMETABLE × 1)
  5. `location_guide` — 장소 안내 (HEADING_2 × 1 + LOCATION × 1 + PARAGRAPH × 1)
  6. `host_intro` — 진행자 소개 (HEADING_2 × 1 + PARAGRAPH × 1)
  7. `refund_notice` — 환불/주의사항 (HEADING_2 × 1 + CALLOUT × 1 + 인라인 bullet `PARAGRAPH` × 1)
  8. `pre_apply_checklist` — 신청 전 체크리스트 (HEADING_2 × 1 + TODO × 3)
  9. `travel_overview` — 여행 개요 (HEADING_1 + PARAGRAPH + canonical TABLE)
  10. `travel_day_section` — Day 일정 (HEADING_2 + TIMETABLE)
  11. `travel_spot` — 스팟 소개 (HEADING_3 + LOCATION + PARAGRAPH + CALLOUT)
  12. `travel_packing` — 준비물 체크 (HEADING_2 + TODO × 3)
  - 모든 블록은 depth=0(최상위). 클라이언트 전용 predefined 상수 — 서버 테이블 없음.
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
| S9 | 인라인 편집 중 네트워크 오류 → 재시도 (AUTH-02 이후) | 텍스트 블록 편집 후 save 중 네트워크 단절 | `DraftSaveController`가 failed 상태 기록. 앱바 "재시도" CTA 노출. 탭 시 `latestValueOf(blockId)` 기반 retry — 사용자 재타이핑 불필요 (AUTH-02 이후 개선) |
| S10 | 빠른 연속 편집 중 느린 v1 save가 v2 이후 완료 | 연속 타이핑으로 v1 후 v2 생성 후 v1 PATCH 응답 먼저 도달 | v1 `markSaved(blockId, gen=1)` 호출 시 `_savedGen[blockId]=1 < currentGen=2` → 블록을 clean으로 전환하지 않음. v2 save 완료 후에야 saved 상태로 전환 |
| S11 | 패턴 삽입 — 전체 성공 (AUTH-03) | DRAFT 플랜, `BlockTypeSheet`에서 패턴 선택 | pattern.blocks(2~4개) 순차 POST 성공 → 전체 블록 트리에 추가됨. `_saveController.endOperation()` |
| S12 | 패턴 삽입 — 중간 실패 (AUTH-03) | 패턴 삽입 중 네트워크 오류 | 이미 생성된 블록은 트리에 남음. `endOperation(failed:true)` → 앱바 실패 인디케이터. 사용자가 직접 삭제하거나 체크리스트로 교정 필요 |

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
| 확정됨(소스 대조) | `PlanBlockType.java`, `plan_block_type.dart`, `block_category.dart` | 서버·Flutter known 타입은 20종. picker는 `BULLETED_LIST`/`NUMBERED_LIST`를 인라인 목록으로 단일화해 18종만 신규 생성하고 레거시 2종은 렌더·편집만 유지 | 20종 처리와 18종 신규 노출을 구분해 회귀 검증 |
| 확정됨(소스 대조) | `block_editor_screen.dart` 마크다운 단축키 | `[] ` → TODO — 실제 구현 존재 (`markdown_shortcuts.dart` 참조) | 완료 |
| 확정됨(소스 대조) | `block_editor_screen.dart:_openTypedEditor` | TODO → `showTodoBlockEditDialog` 매핑 실제 존재 | 완료 |
| 해소(2026-07-29 재실측) | `PlanBlockService#addBlock`, `validateParentBlock`, `validateBlockDepth` | add depth는 parent에서 서버 산출하며 클라이언트 임의 값을 저장하지 않는다. move도 대상 parent 기준으로 검증한다. | 임의 depth 회귀 테스트 유지 |
| Gap(미해소) | `authoring_pattern.dart:32` | **패턴 삽입 원자성 부재**: 복수 블록 순차 POST 중 중간 실패 시 부분 삽입 상태 발생. 서버에 bulk-insert 트랜잭션 endpoint 없음 | 선택: 부분 삽입된 블록 자동 롤백(삭제) 로직 추가 또는 사용자 안내 개선 |
| Gap(미해소) | `authoring_pattern.dart:32` | **패턴은 클라이언트 전용 predefined 상수** — 사용자 정의 패턴 저장 서버 테이블 없음 | 후속 슬라이스에서 user-saved template 서버 설계 필요 시 신규 F 추가 |
| Decision Needed | `block_editor_screen.dart` | TODO 블록 편집 다이얼로그에서 항목 추가(TODO 자체에 children 추가)는 별도 시퀀스 — 현재 `showTodoBlockEditDialog`의 children 추가 흐름이 어떤 방식으로 처리되는지 정확한 구현 확인 필요 | 다음 QA 착수 전에 `todo_block_edit_dialog.dart` 소스 재확인 |

## 9. 수용 기준

- **AC-01. 첫 텍스트 블록 추가 + 인라인 입력 + 자동 저장 (Happy Path)**: Given 빈 DRAFT 플랜, 블록 0개 When 사용자가 해당 흐름을 실행하면 Then 블록 1개, 자동 저장 완료
- **AC-02. 마크다운 단축키로 블록 타입 변환**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 블록 타입 변환 완료. 제목 텍스트 입력 모드
- **AC-03. 이미지 블록 추가 (전용 다이얼로그)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 이미지 블록 등록
- **AC-04. Soft Delete + Undo**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 블록 + 자손 복원
- **AC-05. 블록 한도 초과 (200개)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 블록 추가 실패. 사용자가 "다시 시도" 탭하면 재요청
- **AC-06. 발행된 플랜 편집 시도**: Given 자기 플랜이지만 `status == PUBLISHED` When 사용자가 해당 흐름을 실행하면 Then 편집 차단. 작성자는 hide 후 다시 시도해야 함 (HIDDEN도 PlanService.publishPlan 허용 — 그러나 `validatePlanEditable`는 DRAFT만 허용)
- **AC-07. 비작성자 진입 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 진입 차단
- **AC-08. 부모 블록에 자식 블록 추가**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 자식 블록 생성은 F08-04 들여쓰기 액션으로 위임
- **AC-09. 인라인 편집 중 네트워크 오류 → 재시도 (AUTH-02)**: Given 텍스트 블록 편집 후 네트워크 오류 발생 When 앱바 "재시도" 탭 Then `DraftSaveController.latestValueOf(blockId)` 기반으로 retry 호출 → 성공 시 saved 상태
- **AC-10. 빠른 연속 편집 시 generation 경합 방지 (AUTH-02)**: Given 연속 타이핑으로 v1·v2 생성 후 v1 save 완료가 v2 이후 도달 When v1 `markSaved(blockId, gen=1)` 호출 Then `_savedGen < currentGen` 조건으로 블록이 clean 전환되지 않음 — v2 save 완료 후에야 saved 상태로 전환
- **AC-11. 패턴 삽입 전체 성공 (AUTH-03)**: Given DRAFT 플랜 When `BlockTypeSheet`에서 predefined 패턴 선택 Then pattern.blocks 순차 POST 성공 후 전체 블록 트리에 삽입됨
- **AC-12. 패턴 삽입 후 leave guard 해제 (AUTH-03)**: Given 패턴 삽입 성공 후 `_saveController.endOperation()` 호출 Then `kPatternOpKey` 마킹이 제거되어 route leave guard가 해제됨

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.

## 11. 2026-07-29 편집·미디어·전환 계약

### 11.1 mutation 직렬화와 revision

- `PlanRepository`는 GET/POST/PATCH/DELETE/restore/reorder/move 응답의 `X-Plan-Block-Tree-Revision`을 읽는다.
- `PlanBlocksNotifier`는 mutation을 하나의 직렬 queue로 실행해 같은 앱 안의 self-409를 막는다.
- 요청은 신뢰 중인 revision을 보내고, 409 `CONCURRENT_MODIFICATION`이면 최신 트리/revision을 reconcile한 뒤 부작용이 rollback된 mutation을 한 번만 재시도한다.
- revision이 건너뛴 경우 expected/server 값을 로그하고 burst당 제한된 경고를 낸다. queue가 idle이 되면 화면 트리를 다시 불러온다.
- silent autosave 충돌 reconcile은 편집 중인 로컬 텍스트를 provider 값으로 덮지 않는다.

### 11.2 읽기 모드·발행으로 나가기 전 barrier

에디터의 후속 화면 전환은 다음을 모두 통과해야 한다.

1. 전환 잠금 획득
2. 활성 편집 세션 즉시 flush
3. 호출 시점까지의 mutation queue 완료 대기
4. failed block, operation failure, pending save가 없는지 검사
5. 트리가 준비됐는지 검사
6. 성공 후에만 읽기 모드/발행 화면 present

실패 유형은 `flushFailed`, `saveFailed`, `operationFailed`, `savePending`, `treeNotReady` 등으로 나뉘며 전환을 중단하고 복구 동선을 유지한다. route leave도 dirty/failed 상태를 경고한다.

### 11.3 파일 업로드와 미디어 수명

- 최대 10MiB를 앱과 서버가 모두 검사한다.
- `PLAN_BLOCK` MIME: JPEG/PNG/WebP, MP4/WebM/QuickTime, PDF.
- 앱은 presign → S3 PUT → complete 순서로 처리하고 PUT/complete 실패 시 abort한다.
- IMAGE/VIDEO/FILE properties는 `fileId`와 `fileKey`를 보존하고, 서버는 `fileId`를 4단 검증해 관계를 등록한다.
- 블록 조회는 전체 본문 권한을 먼저 확인한 뒤 `media[].presignedUrl`을 붙인다.
- 삭제된 블록 미디어는 Undo/복원을 위해 30일 보존하고, 복사된 플랜의 미디어 참조도 새 블록에 등록한다.
- 표시 URL 만료/실패 시 Flutter `MediaRefreshGuard`가 provider를 한 번 invalidate해 새 URL을 요청한다.

### 11.4 preview sample authoring

블록의 `properties.previewSample=true` 토글은 작성자가 판매 preview에 노출할 블록을 지정한다. 서버가 known/non-envelope 블록만 문서 순서대로 최대 5개로 제한하며, 지정이 없으면 자동 티저로 폴백한다.

### 11.5 committed HEAD와 현재 미커밋 worktree

committed HEAD에서 `planBlockTextStyle`의 본문은 14px이고 기존 제목 여백을 쓴다. 현재 worktree는 본문 16px/line-height 1.65, 제목 위 여백 확대, 읽기 표면 최대 폭 680과 `reading` scope를 추가했다. 콘텐츠 역할별 tone, picker category/pattern icon·접근성, 검색 순위, 상태 badge 공통화도 같은 미커밋 작업본에 포함된다. 관련 tests/goldens는 변경됐지만 아직 제품 정본으로 간주하지 않는다.

### 11.6 미커밋 TABLE 호환·쓰기 계약

현재 API/Flutter worktree를 재실측한 결과 TABLE은 다음 경계로 강화되는 중이다.

- 서버 신규/구조 변경 쓰기의 canonical 형식은 `properties.rows: List<List<String>>`다. rows와 각 row는 비어 있지 않고 직사각형이어야 하며 모든 셀은 문자열이다. `header`는 생략하거나 boolean이어야 한다. 미지 sibling key는 허용하고 전체 known payload 64KB 상한을 공유한다.
- add는 TABLE이면 항상 검증한다. update는 요청이 properties를 공급하거나 blockType이 TABLE로 바뀔 때 effective properties를 검증한다. 기존 legacy TABLE의 content-only 수정은 저장된 비정규 properties 때문에 막지 않는다.
- Flutter는 canonical rows와 제한된 legacy `properties.columns + content JSON object list`를 dual-read한다. 안전한 legacy는 편집 저장 때 rows로 정규화하고 `columns`를 제거하면서 미지 sibling key를 보존한다.
- legacy row에 선언되지 않은 key가 있거나 중첩 값·깨진 JSON이면 데이터 유실을 막기 위해 저장을 차단한다. renderer도 raw JSON을 본문으로 재생하지 않고 “표시할 수 없음” 카드를 보여 준다.
- 작은 표는 가용 폭을 채우고, 열당 최소 96px보다 넓어지면 표 내부만 가로 스크롤한다.
- `docs/sql/test_queries.sql`에는 canonical/legacy/broken TABLE 재고를 raw content 노출 없이 집계하는 읽기 전용 쿼리가 추가돼 있다. 자동 데이터 migration은 없다.
