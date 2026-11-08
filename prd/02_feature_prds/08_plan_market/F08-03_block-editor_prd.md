# F08-03. 블록 에디터 (블록 CRUD) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

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

## 2. 코드 위치

계약의 정본은 코드다. 서버: `PlanBlockController`, `PlanBlockType`, `PlanBlock`. 앱: `block_editor_screen.dart`, `block_reorder_screen.dart`, `block_type_sheet.dart`, `block_renderer.dart`, `draft_save_controller.dart`, `markdown_shortcuts.dart`, `authoring_pattern.dart`.

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 최대 깊이는 3 이다. 깊이는 앱이 보낸 값을 믿지 않고 서버가 부모 깊이 + 1 로 계산한다.
- 블록을 지우면 자손도 함께 지워진다. 지운 적 없는 블록을 복원하면 거절한다.
- 마크다운 단축키: `# `, `## `, `### ` 제목, `- ` 글머리, `1. ` 번호, `> ` 인용, `[] ` 할 일. 맞으면 내용을 비우고 블록 종류를 바꾼다.
- 작성자가 아니면 편집 화면은 서버를 부르지 않고 "접근 권한이 없습니다"를 보여 준다.
- 오류의 뜻: PLAN_BLOCK_LIMIT_EXCEEDED 블록 200개 초과, PLAN_BLOCK_DEPTH_EXCEEDED 깊이 초과, PLAN_NOT_EDITABLE DRAFT 가 아니라 편집 불가, PLAN_BLOCK_NOT_DELETED 지운 블록이 아니라 복원 불가.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 확정됨(소스 대조) | `PlanBlockType.java`, `plan_block_type.dart`, `block_category.dart` | 서버·Flutter known 타입은 20종. picker는 `BULLETED_LIST`/`NUMBERED_LIST`를 인라인 목록으로 단일화해 18종만 신규 생성하고 레거시 2종은 렌더·편집만 유지 | 20종 처리와 18종 신규 노출을 구분해 회귀 검증 |
| 확정됨(소스 대조) | `block_editor_screen.dart` 마크다운 단축키 | `[] ` → TODO — 실제 구현 존재 (`markdown_shortcuts.dart` 참조) | 완료 |
| 확정됨(소스 대조) | `block_editor_screen.dart:_openTypedEditor` | TODO → `showTodoBlockEditDialog` 매핑 실제 존재 | 완료 |
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

### 11.5 조판과 블록 고르기

`planBlockTextStyle` 의 본문은 16px, 줄간 1.65 이고 제목 위 여백이 넓다. 편집기와 뷰어가 같은 값을 쓴다. 읽기 표면은 최대 폭 680과 `reading` 범위를 쓴다. 콘텐츠 역할별 색조, 블록 고르기의 분류·패턴 아이콘과 접근성, 상태 배지 공통화가 들어가 있다. 블록 고르기 검색은 블록 종류와 작성 패턴을 각각 점수로 매겨 정렬한다.

### 11.6 TABLE 호환·쓰기 계약

TABLE 은 다음 경계를 지킨다.

- 서버 신규/구조 변경 쓰기의 canonical 형식은 `properties.rows: List<List<String>>`다. rows와 각 row는 비어 있지 않고 직사각형이어야 하며 모든 셀은 문자열이다. `header`는 생략하거나 boolean이어야 한다. 미지 sibling key는 허용하고 전체 known payload 64KB 상한을 공유한다.
- add는 TABLE이면 항상 검증한다. update는 요청이 properties를 공급하거나 blockType이 TABLE로 바뀔 때 effective properties를 검증한다. 기존 legacy TABLE의 content-only 수정은 저장된 비정규 properties 때문에 막지 않는다.
- Flutter는 canonical rows와 제한된 legacy `properties.columns + content JSON object list`를 dual-read한다. 안전한 legacy는 편집 저장 때 rows로 정규화하고 `columns`를 제거하면서 미지 sibling key를 보존한다.
- legacy row에 선언되지 않은 key가 있거나 중첩 값·깨진 JSON이면 데이터 유실을 막기 위해 저장을 차단한다. renderer도 raw JSON을 본문으로 재생하지 않고 “표시할 수 없음” 카드를 보여 준다.
- 작은 표는 가용 폭을 채우고, 열당 최소 96px보다 넓어지면 표 내부만 가로 스크롤한다.
- `docs/sql/test_queries.sql`에는 canonical/legacy/broken TABLE 재고를 raw content 노출 없이 집계하는 읽기 전용 쿼리가 추가돼 있다. 자동 데이터 migration은 없다.
