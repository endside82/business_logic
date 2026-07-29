# F08-04. 블록 드래그 재정렬 / 계층 이동 PRD

<!-- source-measured: 2026-07-29; api HEAD be38d128; app HEAD cb21bce -->

> 문서 상태: **현재 소스 실측본**. 서버 Controller/Service/Param과 Flutter API/Repository/Provider/화면을 직접 대조했다. 이 기능의 최종 권한·트리 무결성·동시성 판단은 서버가 담당한다.

## 1. 결론

작성자는 `DRAFT` 플랜의 블록을 로컬에서 드래그·들여쓰기·내어쓰기한 뒤 저장할 수 있다. 저장은 부모가 바뀐 블록의 `move`를 먼저 처리하고, 각 부모 아래의 **살아 있는 전체 형제 집합**을 `reorder`로 보낸다.

현재 구현은 과거 문서의 “마지막 요청 우선”, “사이클은 프론트만 차단” 계약이 아니다.

- 서버는 같은 플랜의 mutation을 플랜 행 비관락으로 직렬화한다.
- 기대 `revision`이 다르면 `409 CONCURRENT_MODIFICATION`으로 전체 요청을 롤백한다.
- 부모 범위 reorder는 전체 형제 ID의 중복·누락·외부 ID를 set-equality로 거절한다.
- move는 자기 자신/자손을 새 부모로 지정하는 cycle을 서버에서 거절한다.
- `depth`는 요청값을 신뢰하지 않고 서버가 부모 기준으로 계산하며, 자손 depth도 함께 재계산한다.

## 2. 소스 근거

| 영역 | 실제 소스 |
|---|---|
| Controller | `community_api/.../plan/controller/PlanBlockController.java` |
| Service | `community_api/.../plan/service/PlanBlockService.java` |
| Params | `PlanBlockReorderParam.java`, `PlanBlockMoveParam.java` |
| Revision 저장 | `Plan.blockTreeRevision`, `PlanRevisionRepository.java` |
| Flutter API/Repository | `community_app/lib/data/api/plan_api.dart`, `data/repositories/plan_repository.dart` |
| Flutter 상태 | `domain/providers/plan/plan_block_provider.dart` |
| Flutter 화면/모델 | `presentation/plan/screens/block_reorder_screen.dart`, `block_reorder_model.dart` |

## 3. 서버 계약

### 3.1 엔드포인트

| Method | Path | 요청 | 응답 |
|---|---|---|---|
| `PUT` | `/api/v1/plans/{planId}/blocks/reorder` | `PlanBlockReorderParam` | `List<PlanBlockVo>` + `X-Plan-Block-Tree-Revision` |
| `PATCH` | `/api/v1/plans/{planId}/blocks/{blockId}/move` | `PlanBlockMoveParam` | `PlanBlockVo` + `X-Plan-Block-Tree-Revision` |

`PlanBlockReorderParam`:

- 신규 계약: `parentBlockId: Long?`, `siblingIds: List<Long>`, `revision: Long?`
- 구앱 호환 계약: `blockIds: List<Long>`, `revision: Long?`
- `siblingIds`가 있으면 부모 범위 계약을 우선한다.

`PlanBlockMoveParam`:

- `parentBlockId: Long?`
- `sortOrder: int`
- `depth: int` — 전송 필드는 남아 있으나 서버의 권위값이 아니다.
- `revision: Long?`

### 3.2 편집 권한

- 플랜이 존재해야 한다.
- 요청자는 `creatorId`와 같아야 한다.
- 상태는 `DRAFT`여야 한다.
- 미지원 버전의 `rawEnvelope`를 가진 읽기 전용 블록은 개별 move할 수 없다.

### 3.3 reorder 불변식

부모 범위 계약은 해당 `parentBlockId` 아래 살아 있는 전체 자식 ID와 `siblingIds`가 정확히 같은 집합이어야 한다.

- 중복 ID: 거절
- 일부 형제 누락: 거절
- 다른 부모/플랜의 ID 포함: 거절
- 통과 시 기존 형제들이 사용하던 `sortOrder` 슬롯을 정렬해 요청 순서대로 재배치

레거시 `blockIds` 계약도 플랜 전체 살아 있는 블록 집합과 set-equality를 강제한다.

### 3.4 move 불변식

- 새 부모는 같은 플랜의 유효 블록이어야 한다.
- 자기 자신 또는 자신의 자손을 부모로 지정하면 `PLAN_BLOCK_INVALID_PARENT`로 거절한다.
- 루트 depth는 `0`, 자식은 `parent.depth + 1`로 서버가 계산한다.
- 이동된 루트의 모든 자손 depth도 재계산한다.
- 재계산 결과 `MAX_BLOCK_DEPTH = 3`을 넘으면 트랜잭션 전체를 롤백한다.
- `sortOrder`는 음수일 수 없고 대상 부모의 현재 형제 최대값 `+1`보다 클 수 없다.

### 3.5 동시성

- 각 mutation 시작 시 플랜 행을 `SELECT ... FOR UPDATE` 성격의 저장소 호출로 잠근다.
- revision 제공 시 현재 토큰과 일치할 때만 `+1`하며, 불일치는 `409 CONCURRENT_MODIFICATION`이다.
- `plan.editor.revision-fail-closed=false`이면 revision 없는 구앱 요청도 허용하되 토큰은 무조건 증가한다.
- fail-closed가 켜지면 revision 미제공 요청은 `428 PLAN_BLOCK_REVISION_REQUIRED`다.
- 성공 응답은 새 revision을 `X-Plan-Block-Tree-Revision` 헤더로 돌려준다.

## 4. Flutter 계약

### 4.1 진입과 로컬 편집

- 블록 에디터에서 `/plan/:planId/reorder`로 진입한다.
- 트리는 `planBlocksNotifierProvider(planId)`를 사용한다.
- 드래그와 indent/outdent는 `BlockReorderModel`의 로컬 상태만 바꾸며 즉시 API를 호출하지 않는다.
- 미지원/읽기 전용 블록의 부모가 바뀐 상태면 저장 전에 경고하고 중단한다.

### 4.2 저장 순서

1. 부모가 바뀐 블록을 순차적으로 `moveBlock`한다.
2. 각 부모 그룹의 전체 형제 ID를 `reorderSiblings`로 순차 전송한다.
3. 모든 호출이 성공하면 성공 토스트 후 이전 화면으로 돌아간다.
4. 중간 실패면 이후 호출을 멈추고 provider를 invalidate해 최신 서버 트리로 재동기화하며 화면에 남는다.

`PlanBlocksNotifier`는 mutation을 직렬 큐에 넣고, 직전 응답 헤더의 revision을 다음 요청에 연결한다. `409`이면 최신 트리/revision을 다시 읽고 동일 요청을 **한 번만** 재시도한다. revision이 건너뛴 충돌은 로그를 남기고 버스트 단위로 사용자에게 경고한다.

## 5. 상태·실패 매트릭스

| 시나리오 | 서버/화면 결과 |
|---|---|
| 같은 부모 안에서 순서 변경 | 부모 범위 reorder 성공 후 최신 트리 반영 |
| 다른 부모 아래로 이동 | move로 부모/depth 변경 후 두 부모 그룹 reorder |
| depth 3을 넘는 서브트리 이동 | 서버 400, 전체 move 롤백 |
| cycle 이동 | 서버 400, 트리 유지 |
| 형제 ID 누락·중복·외부 ID | reorder 거절, 기존 순서 유지 |
| 다른 기기에서 먼저 수정 | 첫 요청 409 → 최신 트리/revision reconcile → 동일 mutation 1회 재시도 |
| 저장 흐름 중 일부 호출 실패 | 이후 호출 중단, 최신 트리로 화면 모델 재설정, 오류 토스트 |
| 비작성자 또는 비-DRAFT | 서버 차단 |
| 취소 | 로컬 모델 폐기, 서버 변경 없음 |

## 6. 수용 기준

- **AC-01**: reorder 요청은 대상 부모의 전체 살아 있는 형제 ID를 정확히 한 번씩 포함해야 한다.
- **AC-02**: move 요청의 `depth`와 무관하게 저장 depth는 서버가 부모 기준으로 산출해야 한다.
- **AC-03**: 이동된 블록의 자손도 연쇄 재계산되며 하나라도 최대 depth를 넘으면 부분 저장이 없어야 한다.
- **AC-04**: 자기 자신/자손 아래로의 이동은 서버에서 거절되어야 한다.
- **AC-05**: revision 불일치는 409여야 하며 Flutter는 최신 토큰을 받은 뒤 한 번만 재시도해야 한다.
- **AC-06**: 여러 로컬 mutation은 병렬 발사하지 않고 직렬 큐에서 순서대로 처리되어야 한다.
- **AC-07**: 중간 실패 후 화면은 오래된 로컬 순서를 성공 상태처럼 유지하지 않아야 한다.

## 7. 확인된 리스크

- 저장은 여러 HTTP mutation으로 구성되므로 앞선 move가 성공하고 뒤 reorder가 실패하는 **요청 간 부분 반영**은 가능하다. 화면은 이를 감지해 최신 트리를 다시 읽고 재시도를 요구한다.
- Flutter `PlanBlockMoveParam.depth`는 호환상 남아 있으나 서버가 무시하는 입력이다. 제품 계약과 QA 기대값은 서버 산출 depth를 기준으로 해야 한다.
- revision fail-closed의 기본값은 현재 `false`다. 구앱 호환을 종료하려면 운영 설정과 최소 지원 버전 정책을 함께 결정해야 한다.
