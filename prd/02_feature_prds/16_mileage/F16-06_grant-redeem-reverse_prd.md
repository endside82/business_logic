# F16-06. 적립/차감/정정 집행 PRD

## 1. 결론

`MILEAGE_MANAGER` 운영진이 마일리지 점수를 실제로 이동시키는 핵심 쓰기 경로다 — 수동/일괄 적립(`grants`, `grants/bulk`), 차감(`redemptions`, `redemptions/bulk`), 원장 정정(`ledger/{ledgerId}/reverse`), 배지 부여/회수(`badges/{badgeDefId}/awards`, `badge-awards/{awardId}`), 일괄 결과 조회(`batches/{batchId}`). grant/redeem 4종은 `Idempotency-Key` 헤더로 멱등 처리되고, Flutter는 호출마다 UUIDv4 키를 자동 발급한다.

원장 primitive(`MileageLedgerService`)는 모두 동일 트랜잭션에서 ① summary 비관적 락 ② 잔액/UNIQUE 검증 ③ ledger INSERT(UNIQUE 위반 시 idempotent 흡수) ④ FEFO 소비 매핑(`mileage_ledger_consumption`) ⑤ summary 갱신 ⑥ 등급 재산정 ⑦ outbox publish를 수행한다. 차감은 잔액 부족 시 `MILEAGE_INSUFFICIENT_BALANCE`, 일괄은 멤버별 부분 성공(`GrantResultVo.Row.success/errorReason`).

판정: **적립/차감/정정/배지 집행은 사용 가능**. 단 ① **일괄 결과 조회의 type 불일치**(서버 `Map`, Flutter `GrantResultVo`) ② **자동 적립 트리거 호출처 부재**(`triggerAutoEarn`을 호출하는 이벤트 도메인 연동이 mileage 패키지 내에 없음)가 핵심 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `MileageAdminActionController.java` | `@RequiresClubPermission(MILEAGE_MANAGER)`, Idempotency-Key, grants/redemptions/reverse/awards/batches |
| Backend Service | `MileageLedgerService.java` | `insertEarn/insertRedeem/insertReverse/insertExpire`, FEFO `allocateFefo`, `computeEarnRemaining`, summary 락 |
| Backend Service | `MileageEarningService.java` | `grantManual`(단일/일괄, 부분 성공), `triggerAutoEarn`(트리거 적립) |
| Backend Service | `MileageRedemptionService.java` | `redeem`(부분 성공), `reverseLedger` |
| Backend Service | `MileageBadgeService.java` | `award`(단일/일괄), `revoke` |
| Backend Service | `MileageMemberSummaryService.java` | `lockOrInit`, `recalcGrade` |
| Backend Service | `MileageQueryService.java` | `findBatchResult`(Map: ledgerRows/badgeRows/totalAffectedMembers/succeeded/failed) |
| Backend VO/Param/Enum | `GrantResultVo.java`, `MileageLedgerVo.java`, `MileageBadgeAwardVo.java`, `MileageGrantParam`/`MileageRedeemParam`/`MileageReverseParam`/`MileageBadgeAwardAddParam`/`MileageBadgeRevokeParam`, `constants/LedgerType.java`, `ActorRole.java` | 요청/응답·enum |
| Frontend | `mileage_admin_action_api.dart`, `mileage_admin_action_repository.dart`, `mileage_admin_action_providers`(di), `presentation/mileage/admin/screens/mileage_action_screen.dart`, `mileage_batch_result_screen.dart`, `widgets/mileage_bulk_confirm_dialog.dart`, `mileage_batch_result_row.dart` | route·멱등·부분 결과 표시 |
| DB | `V1__init.sql` `mileage_ledger`(UNIQUE idem), `mileage_ledger_consumption`, `mileage_member_summary` | 멱등 제약·FEFO |

## 3. 전체 동작 흐름

### 적립 (grant)
1. MILEAGE_MANAGER가 액션 화면에서 멤버·점수·사유를 입력 → `grant`/`grantBulk` → `POST /grants[/bulk]`(`MileageGrantParam`: memberIds, points>0, reason). Flutter가 `Idempotency-Key`(UUIDv4) 헤더 자동 발급.
2. 서버 `idempotent(...)`가 키 캐시 확인 → 없으면 `earningService.grantManual` 실행 후 응답 저장.
3. `grantManual`은 `requireActive`(정책 ON) + reason 필수 검증, memberIds>1이면 batchId(UUID) 발급, ACTIVE 시즌 id 조회.
4. 멤버별로 `ledgerService.insertEarn(...)` 호출 → summary 락 → ledger INSERT(`MANUAL_GRANT` sourceType, UNIQUE 위반 시 기존 row 반환) → summary 가감(currentBalance/lifetimeEarnedRaw/qualifiedLifetimeEarned/시즌) → `recalcGrade` → outbox. 성공/실패를 `GrantResultVo.Row`로 누적, audit 기록.
5. 실패(예: 검증 예외)는 row.success=false + errorReason으로 부분 성공 처리.

### 차감 (redeem)
1. `redeem`/`redeemBulk` → `POST /redemptions[/bulk]`(`MileageRedeemParam`: memberIds, points>0, reason, presetId?).
2. `requireActive` + reason 필수 + presetId면 `requireActivePreset`(비활성 시 `MILEAGE_PRESET_INACTIVE`).
3. 멤버별 `insertRedeem` → 잔액 부족 시 `MILEAGE_INSUFFICIENT_BALANCE`(row 실패) → 통과 시 음수 amount ledger + **FEFO 소비 매핑**(만료 임박 EARN부터 `mileage_ledger_consumption` 생성) → summary 차감.

### 정정 (reverse)
1. `reverseLedger` → `POST /ledger/{ledgerId}/reverse`(`MileageReverseParam`: reason 필수).
2. `insertReverse`가 원 row 조회, 이미 REVERSE면 `MILEAGE_LEDGER_ALREADY_REVERSED`, EARN reverse 시 잔액 부족이면 차단. 반대 부호 row(`sourceType=REVERSE`, `reversesLedgerId`) 생성. EARN reverse면 qualifiedLifetimeEarned 감소 → 등급 재산정(강등 가능).

### 배지 부여/회수
1. `awardBadge` → `POST /badges/{badgeDefId}/awards`(`MileageBadgeAwardAddParam`: memberIds, awardedReason). 비활성 정의면 `MILEAGE_BADGE_NOT_FOUND`. 다수면 batchId 부여, `List<MileageBadgeAwardVo>` 반환.
2. `revokeBadge` → `DELETE /badge-awards/{awardId}`(`MileageBadgeRevokeParam`: revokedReason 필수). revokedAt/revokedBy/revokedReason 기록(soft revoke).

### 일괄 결과 조회
1. `getBatchResult` → `GET /batches/{batchId}` → `MileageQueryService.findBatchResult`가 batchId의 ledger row를 모아 `Map`(`ledgerRows`, `badgeRows`(빈 리스트), `totalAffectedMembers`, `succeeded`, `failed`(audit FAIL 행))으로 반환.

## 4. 서버 계약

### `POST /grants`, `/grants/bulk`
- 권한 `MILEAGE_MANAGER`. Header `Idempotency-Key`(선택). Body `MileageGrantParam`(memberIds NotEmpty, points Positive, reason). 응답 `GrantResultVo`(batchId nullable, results: Row{memberId, success, ledgerId, newBalance, errorReason}).

### `POST /redemptions`, `/redemptions/bulk`
- Body `MileageRedeemParam`(memberIds, points Positive, reason, presetId?). 응답 `GrantResultVo`. 잔액 부족 → row.errorReason=`MILEAGE_INSUFFICIENT_BALANCE`.

### `POST /ledger/{ledgerId}/reverse`
- Body `MileageReverseParam`(reason NotBlank). 응답 `MileageLedgerVo`(reversed row). 이미 정정됨 → `MILEAGE_LEDGER_ALREADY_REVERSED`(409), 원 row 없음 → `MILEAGE_LEDGER_NOT_FOUND`(404).

### `POST /badges/{badgeDefId}/awards`, `DELETE /badge-awards/{awardId}`
- award Body `MileageBadgeAwardAddParam`(memberIds, awardedReason), 응답 `List<MileageBadgeAwardVo>`(201). revoke Body `MileageBadgeRevokeParam`(revokedReason NotBlank), 204.

### `GET /batches/{batchId}`
- 응답 **`Map<String,Object>`**: `clubId, batchId, ledgerRows[], badgeRows[](빈), totalAffectedMembers, succeeded, failed[]`.

### 공통 enum/제약
- `LedgerType{EARN,REDEEM,REVERSE,EXPIRE}`, `ActorRole`(액션 시 `isOwner ? OWNER : ADMIN`). 멱등: ledger UNIQUE(club, member, sourceType, sourceId) + API Idempotency-Key. points≤0 → `MILEAGE_AMOUNT_INVALID`, reason 누락 → `MILEAGE_REASON_REQUIRED`, 정책 OFF → `MILEAGE_NOT_ACTIVATED`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `adminMileageAction`(`action`), `adminMileageBatchDetail`(`batches/:batchId`) |
| Screen/Widget | `MileageActionScreen`, `MileageBatchResultScreen`, `MileageBulkConfirmDialog`, `MileageBatchResultRow` |
| Repository/API | `MileageAdminActionRepository.grant/grantBulk/redeem/redeemBulk/reverseLedger/awardBadge/revokeBadge/getBatchResult` |
| 멱등 | repository가 `ClientMessageId.generate()`로 UUIDv4 Idempotency-Key 자동 발급(override 가능) |
| Model | `GrantResultVo`, `MileageLedgerVo`, `MileageBadgeAwardVo`, 각 Param, `LedgerType`/`ActorRole` enum |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| MILEAGE_MANAGER + 단일 적립 | insertEarn 성공 | Row.success=true | 잔액 증가·등급 재산정 | 일치 |
| MILEAGE_MANAGER + 일괄 적립 일부 실패 | row별 success/errorReason | 부분 결과 표시 | 성공/실패 멤버 구분 | 일치 |
| 동일 Idempotency-Key 재호출 | 캐시 응답 반환 | 동일 결과 | 중복 적립 방지 | 일치 |
| 차감 + 잔액 부족 | `MILEAGE_INSUFFICIENT_BALANCE` row | 실패 표시 | 해당 멤버만 실패 | 일치 |
| 정정 + 이미 정정됨 | `MILEAGE_LEDGER_ALREADY_REVERSED` | 에러 | 중복 정정 차단 | 일치 |
| EARN 정정으로 등급 강등 | qualified 감소 → recalcGrade DOWN | 등급 변경 audit | 등급 하락 + 이력 기록 | 일치 |
| 정책 OFF 상태 적립 | `requireActive` 실패 | 에러 | 적립 차단 | 일치 |
| 일괄 결과 조회 | 서버 `Map` 반환 | `GrantResultVo` 파싱 | 필드 매핑 실패 가능 | **불일치 (Gap)** |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| grant/redeem 응답 | `GrantResultVo` | `GrantResultVo` | 일치 |
| `LedgerType`/`ActorRole` | 서버 enum | 동일 enum | 일치 |
| 멱등 키 | `Idempotency-Key` 헤더 | UUIDv4 자동 발급 | 일치 |
| reverse 응답 | `MileageLedgerVo`(부분 필드만 builder) | `MileageLedgerVo` | 일치 (reason 등 일부 null) |
| batch 결과 타입 | `Map<String,Object>`(ledgerRows 등) | `GrantResultVo`(batchId/results) | **불일치** |
| 자동 적립 트리거 | `triggerAutoEarn` 구현됨 | 호출 없음 | **호출처 부재(Gap)** |
| 부분 성공 | 멤버별 row | Row 표시 | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | 일괄 결과 조회 type 불일치 | 서버 `findBatchResult`는 `Map`(ledgerRows/badgeRows/totalAffectedMembers/succeeded/failed) 반환, Flutter `getBatchResult`는 `GrantResultVo`(batchId/results)로 파싱 | batchId·succeeded만 우연히 맞고 `results`는 항상 비어 batch 상세가 안 보일 수 있음 | 서버 응답 전용 VO 정의 또는 Flutter가 Map으로 받아 파싱 |
| P0 | 자동 적립 트리거 호출처 부재 | `MileageEarningService.triggerAutoEarn`(체크인/후기/사진)이 구현됐으나 mileage 패키지 내 호출처 없음 | 적립 규칙(F16-05)을 켜도 자동 적립이 발생하지 않을 수 있음 | 이벤트 도메인(체크인/후기/사진 승인)에서 `triggerAutoEarn` 호출 연동 확인/추가 |
| P1 | 만료 배치가 `ledgerRepository.findAll()` 풀스캔 | `MileageExpireBatchService.runDailyExpire`가 전체 ledger 로드 후 필터 | 대규모 원장에서 만료 배치 지연·메모리 부담 | 만료 대상 전용 query(인덱스 `idx_mileage_ledger_expire`)로 이관 |
| P1 | 일괄 실패 행 추적이 audit FAIL 문자열 매칭 | `findBatchResult`가 actionType.contains("FAIL")로 실패 추적 | 실패 행이 audit에 FAIL로 안 남으면 batch 결과에 안 보임 | grantManual 실패 시 batchId 포함 audit 기록 보장 |
| P2 | reverse 응답 VO 부분 필드 | 컨트롤러가 reversed row의 일부 필드만 builder로 채움(reason/createdAt 등 누락) | 화면에서 정정 사유/시각이 비어 보일 수 있음 | reverse 응답을 mapper로 full 매핑 |

## 9. 수용 기준

### AC-01. 단일 적립
Given MILEAGE_MANAGER가 멤버 1명에게 100점 적립한다. When `POST /grants`가 성공한다. Then `GrantResultVo.results[0].success=true`, newBalance가 증가하고 등급이 재산정된다.

### AC-02. 멱등 재호출
Given 같은 Idempotency-Key로 적립을 두 번 호출한다. When 두 번째 호출이 도착한다. Then 캐시된 첫 응답이 반환되고 잔액은 한 번만 증가한다.

### AC-03. 일괄 부분 성공
Given 일괄 차감 대상 중 일부가 잔액 부족이다. When `POST /redemptions/bulk`를 호출한다. Then 잔액 충분 멤버는 success=true, 부족 멤버는 errorReason=`MILEAGE_INSUFFICIENT_BALANCE`로 반환된다.

### AC-04. FEFO 소비
Given 멤버가 만료일이 다른 여러 EARN 잔여분을 가진다. When 차감이 발생한다. Then 만료 임박분부터 `mileage_ledger_consumption`에 소비 매핑이 생성된다.

### AC-05. 정정 중복 방지
Given 이미 정정된 ledger를 다시 정정한다. When `POST /ledger/{id}/reverse`를 호출한다. Then `MILEAGE_LEDGER_ALREADY_REVERSED`가 반환된다.

### AC-06. 일괄 결과 조회 (현재 미충족)
Given 운영진이 일괄 적립 후 batchId로 결과를 조회한다. When `GET /batches/{batchId}`가 ledgerRows/succeeded/failed를 반환한다. Then 화면이 영향 멤버 수·성공/실패 행을 표시해야 한다. 현재 Flutter가 `GrantResultVo`로 파싱해 이 기준을 충족하지 못한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | batch 결과 VO | `findBatchResult` 응답 전용 모델 정의 + Flutter 매핑 수정 |
| 구현 | 자동 적립 연동 | 이벤트 체크인/후기/사진 승인에서 `triggerAutoEarn` 호출 연결 |
| 성능 | 만료 배치 | 풀스캔 → 인덱스 query 이관 |
| 구현 | reverse 응답 매핑 | mapper로 full 필드 매핑 |
| 테스트 | 집행 경로 | 멱등, 부분 성공, FEFO, 정정 강등, 만료 배치 E2E 추가 |
