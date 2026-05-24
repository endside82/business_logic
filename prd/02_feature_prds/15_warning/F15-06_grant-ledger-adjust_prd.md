# F15-06. 경고 부여 & 원장 조정 PRD

## 1. 결론

운영진(`WARNING_REVIEWER`)은 제보 없이도 점수를 직접 부여하고 부여된 원장 항목을 조정한다. `POST /grants`는 `targetMemberIds` 배열을 받아 멤버별로 `WarningLedgerService.insertGrant`를 호출하고 `{success, ledgerIds, failed, batchId}` Map을 반환한다(Idempotency-Key 헤더 지원). 조정은 `POST /ledger/{ledgerId}/mitigate`(점수 일부 경감, effective 초과 불가), `/reverse`(전체 정정, GRANT당 1회), `/expire`(만료)이며, `POST /ledger/bulk-expire`는 batchId로 여러 GRANT를 일괄 만료한다(AMNESTY, Idempotency-Key 지원). 원장은 append-only이고 `UNIQUE(club_id, member_id, source_type, source_id)`로 멱등하다. 모든 조정은 `WarningMemberSummaryService.recalculateForUpdate`로 점수를 재산정하고 audit + outbox(`WarningGranted/Mitigated/Reversed/Expired`)를 발행한다. Flutter `warning_member_detail_screen.dart`/`warning_reason_dialog.dart`가 이를 구현했다.

판정: **부여·경감·정정·만료·일괄만료의 정합과 멱등은 닫혀 있다**. Gap은 (a) `grant`의 일괄 처리가 단일 컨트롤러 트랜잭션이 아니라 멤버별 try-catch 부분 성공이라 "성공 N건/실패 M건"의 의미와 트랜잭션 경계가 모호, (b) Idempotency-Key 캐시(`ApiIdempotencyKeyService`)와 원장 source UNIQUE의 이중 멱등 구조, (c) mitigate/reverse/expire의 reason blank가 `WARNING_MITIGATE_EXCEEDS_EFFECTIVE`로 매핑되어 의미 불일치인 점이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningAdminActionController.java#grant/mitigate/reverse/expire/bulkExpire`, `#idempotent` | Map 응답, Idempotency-Key, ledgerId path |
| Backend Service | `WarningLedgerService.java#insertGrant/insertMitigate/insertReverse/insertExpire/bulkExpire/autoGrantFromAttendance/getInvalidationStatus` | 멱등, effective 초과 검사, REVERSE/EXPIRE 1회, 출결 자동 매핑 |
| Backend Service | `WarningMemberSummaryService.java#recalculateForUpdate/doRecalculate` | REVERSE/EXPIRE 제외, MITIGATE 차감, review_level 재평가 |
| Backend Service | `WarningPenaltyTypeConfigService#resolvePoints` | 점수 결정 우선순위 |
| Backend Param | `WarningGrantAddParam`, `WarningMitigateParam`, `WarningReverseParam`, `WarningExpireParam`, `WarningBulkExpireParam` | 배열 부여, points/reason/batchId |
| Backend VO | `WarningLedgerVo.java` | 원장 row 응답 |
| Backend Enum | `WarningLedgerType.java` | GRANT/MITIGATE/REVERSE/EXPIRE |
| Backend Error | `ErrorCode.java` | `WARNING_LEDGER_NOT_FOUND`, `WARNING_LEDGER_ALREADY_REVERSED/EXPIRED`, `WARNING_MITIGATE_EXCEEDS_EFFECTIVE` |
| Backend DDL | `V1__init.sql` `warning_ledger` | `uk_warning_ledger_idem`, `target_grant_ledger_id` FK |
| Backend Infra | `common/idempotency/ApiIdempotencyKeyService` | Idempotency-Key 저장/조회 |
| Frontend API | `warning_admin_action_api.dart#grant/mitigate/reverse/expire/bulkExpire` | Map(dynamic) 응답, Idempotency-Key 헤더 |
| Frontend Screen | `admin/warning_member_detail_screen.dart`, `widgets/warning_reason_dialog.dart` | 조정 액션 |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

1. WARNING_REVIEWER가 `members/:memberId`(`Routes.adminWarningMemberDetail`) → `WarningMemberDetailScreen` → 멤버 원장/제재 확인.
2. **직접 부여**: `POST /grants`(`WarningGrantAddParam{targetMemberIds, penaltyTypeCode, pointsOverride?, reasonCode?, reason, eventId?, batchId?}`, Idempotency-Key 헤더). 컨트롤러 `idempotent(...)` 래퍼가 캐시 확인 후, 멤버별로 `resolvePoints` + `insertGrant(sourceType="MANUAL_GRANT", sourceId="M{memberId}-{nanoTime}")`. 개별 실패는 `failed`에 누적, `{success, ledgerIds, failed, batchId}` 반환.
3. **경감**: `POST /ledger/{ledgerId}/mitigate`(`WarningMitigateParam{points, reasonCode, reason, batchId}`) → 대상이 GRANT이고 REVERSE/EXPIRE 안 됨, `points ≤ (target.points − mitigateSum)`이어야 함. MITIGATE row(sourceType="MITIGATE") 생성 + 요약 재계산.
4. **정정**: `POST /ledger/{ledgerId}/reverse` → GRANT당 1회, 기존 REVERSE/EXPIRE 있으면 거절. REVERSE row(points=0) 생성 → 요약에서 해당 GRANT 완전 제외.
5. **만료**: `POST /ledger/{ledgerId}/expire` → 기존 EXPIRE/REVERSE 있으면 거절. EXPIRE row(points=0) 생성.
6. **일괄 만료**: `POST /ledger/bulk-expire`(`WarningBulkExpireParam{grantLedgerIds, reasonCode, reason, batchId?}`, Idempotency-Key) → batchId 발급 후 각 GRANT를 `insertExpire`, 실패는 `failed` 누적, `{batchId, success, failed}` 반환.
7. 모든 조정 후 `recalculateForUpdate`가 effective/qualified/raw/count와 review_level을 갱신하고, 등급 변화 시 outbox `MemberReviewLevelChanged` 발행.

## 4. 서버 계약

### `POST /grants`
| 항목 | 실제 계약 |
|---|---|
| 권한 | `WARNING_REVIEWER` |
| Header | `Idempotency-Key`(선택) → `ApiIdempotencyKeyService` 캐시 |
| Body | `WarningGrantAddParam` (`targetMemberIds@NotNull`, `penaltyTypeCode@NotBlank@Size(40)`, `pointsOverride?@Min(0)`, `reasonCode?`, `reason@NotBlank@Size(4000)`, `eventId?`, `batchId?@Size(36)`) |
| 응답 | `Map{success:int, ledgerIds:List<Long>, failed:List<Long>, batchId:String}` |
| 멱등 | source UNIQUE(`MANUAL_GRANT`+sourceId) + Idempotency-Key 이중 |
| 부분 성공 | 멤버별 try-catch (개별 실패가 전체 롤백하지 않음) |

### `POST /ledger/{ledgerId}/mitigate`
| 항목 | 실제 계약 |
|---|---|
| 검증 | 대상 GRANT, 미-REVERSE·미-EXPIRE, `points>0`, `points ≤ (points − mitigateSum)` |
| 실패 | `WARNING_LEDGER_NOT_FOUND`(비GRANT/없음), `WARNING_LEDGER_ALREADY_REVERSED/EXPIRED`, `WARNING_MITIGATE_EXCEEDS_EFFECTIVE`(초과/points≤0/reason blank) |
| 응답 | `WarningLedgerVo`(MITIGATE row) |

### `POST /ledger/{ledgerId}/reverse`
| 항목 | 실제 계약 |
|---|---|
| 검증 | 대상 GRANT, 기존 REVERSE/EXPIRE 없음 |
| 실패 | `WARNING_LEDGER_NOT_FOUND`, `WARNING_LEDGER_ALREADY_REVERSED/EXPIRED` |
| 응답 | `WarningLedgerVo`(REVERSE, points=0) |

### `POST /ledger/{ledgerId}/expire`
| 항목 | 실제 계약 |
|---|---|
| 검증 | 대상 GRANT, 기존 EXPIRE/REVERSE 없음 |
| 응답 | `WarningLedgerVo`(EXPIRE, points=0) |

### `POST /ledger/bulk-expire`
| 항목 | 실제 계약 |
|---|---|
| Header | `Idempotency-Key`(선택) |
| Body | `WarningBulkExpireParam{grantLedgerIds, reasonCode, reason, batchId?}` |
| 응답 | `Map{batchId, success, failed}` |
| 멱등 | batchId 미지정 시 새 UUID, 각 GRANT EXPIRE는 source UNIQUE 멱등 |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `members/:memberId`(`Routes.adminWarningMemberDetail`) |
| Screen | `WarningMemberDetailScreen`, `widgets/warning_reason_dialog.dart` |
| Repository | `WarningAdminActionRepository` |
| Retrofit | `WarningAdminActionApi.grant`(dynamic Map)/`mitigate`/`reverse`/`expire`/`bulkExpire`(dynamic Map) |
| 멱등 헤더 | `@Header('Idempotency-Key') String?` (grant, bulkExpire) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| WARNING_REVIEWER 단일 부여 | `insertGrant` | 부여 액션 | GRANT 1건 + 점수 갱신 | 일치 |
| 일괄 부여(일부 실패) | 멤버별 try-catch | 결과 Map 표시 | success/failed 분리 | 부분 성공 의미 Gap |
| 같은 Idempotency-Key 재호출 | 캐시 응답 | 재시도 안전 | 중복 부여 없음 | 일치 |
| effective 초과 경감 | `WARNING_MITIGATE_EXCEEDS_EFFECTIVE` | 에러 | 차단 | 일치 |
| 이미 REVERSE된 GRANT 정정 | `WARNING_LEDGER_ALREADY_REVERSED` | 에러 | 차단 | 일치 |
| reason blank 조정 | `WARNING_MITIGATE_EXCEEDS_EFFECTIVE` | 에러 | 차단(의미 모호) | Risk(아래) |
| 출결 자동 GRANT(SYSTEM) | `autoGrantFromAttendance` | (이벤트 도메인 트리거) | 자동 부여 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| grant 응답 형태 | `Map` | `dynamic` | 일치(타입 안전성 낮음) |
| mitigate/reverse/expire 응답 | `WarningLedgerVo` | VO | 일치 |
| `WarningLedgerType` | 4값 | enum 동일 | 일치 |
| 멱등 키 헤더 | grant/bulkExpire 지원 | `@Header` 전달 | 일치 |
| 점수 재계산 | `recalculateForUpdate` | 화면은 재조회로 반영 | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | 일괄 부여 부분 성공 의미·트랜잭션 경계 모호 | `grant`가 멤버별 try-catch, `insertGrant`는 `@Transactional` 개별 | 일부 멤버만 부여된 채 "성공 N"으로 보고됨 — 운영진이 실패 멤버 재처리 필요 | failed 목록의 UX 처리 명시 + 재시도 가이드 |
| P2 | grant 응답이 `dynamic` Map | 컨트롤러가 `Map<String,Object>` 반환, Flutter `dynamic` | 타입 안전성 없음, 필드 오타 런타임 노출 | 응답 전용 VO(`WarningGrantResultVo`) 도입 검토 |
| P2 | 조정 reason blank가 `WARNING_MITIGATE_EXCEEDS_EFFECTIVE`로 매핑 | `insertMitigate/Reverse/Expire`가 reason 없으면 해당 코드 throw | "초과" 에러로 오해 | `WARNING_REASON_REQUIRED`로 통일 |
| P3 | Idempotency 캐시 저장 실패를 무시 | `idempotent`가 store 실패를 swallow | 동일 키 재호출이 재실행될 수 있음(원장 UNIQUE가 2차 방어) | 원장 UNIQUE 의존을 명시, 캐시 실패 로깅 강화 |

## 9. 수용 기준

### AC-01. 단일 직접 부여
Given WARNING_REVIEWER가 한 멤버에게 점수를 부여한다(reason 포함).
When `POST /grants`가 `targetMemberIds=[m]`로 호출된다.
Then 원장 GRANT 1건 생성, `{success:1, ledgerIds:[id]}` 반환, 멤버 요약 effective_score가 증가한다.

### AC-02. 멱등 재부여
Given 같은 `Idempotency-Key`로 grant를 재호출한다.
When 두 번째 호출이 도착한다.
Then 캐시된 응답을 반환하고 새 원장 row를 만들지 않는다.

### AC-03. effective 초과 경감 차단
Given GRANT points=3에 이미 MITIGATE 2가 있다.
When `mitigate`를 points=2로 호출한다.
Then 서버는 `WARNING_MITIGATE_EXCEEDS_EFFECTIVE`로 거절한다(remaining=1).

### AC-04. 정정 1회 제한
Given GRANT가 이미 REVERSE되었다.
When 다시 `reverse`를 호출한다.
Then 서버는 `WARNING_LEDGER_ALREADY_REVERSED`로 거절한다.

### AC-05. 일괄 만료 부분 성공
Given `bulk-expire`에 GRANT 3건 중 1건이 이미 EXPIRE이다.
When 일괄 만료가 호출된다.
Then 나머지 2건만 EXPIRE되고 `{success:2, failed:[id]}`가 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | grant 응답 VO | `dynamic` Map → 전용 결과 VO 도입 |
| UX | 일괄 부분 성공 | failed 멤버 재처리 흐름 명시 |
| UX | 에러 매핑 | 조정 reason 누락을 `WARNING_REASON_REQUIRED`로 통일 |
| 테스트 | 원장 조정 | 단일/일괄 부여·멱등·경감 초과·정정 1회·일괄 부분성공 E2E |
