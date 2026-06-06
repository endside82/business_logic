# F18-04. 분쟁 증빙·공개범위·보존 PRD

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/dispute/ -->

## 1. 결론

분쟁 증빙(`DisputeEvidenceVo`)은 `Visibility` 4값(PARTIES/HOST_ONLY/CS_ONLY/PUBLIC_SUMMARY)을 기반으로 서버가 미리 필터링한 결과만 클라이언트에 전달한다. 실제 `filterByActorVisibility`(`DisputeCaseService.java:206-231`)는 **`CS_ONLY`만 제거하고 PARTIES/HOST_ONLY/PUBLIC_SUMMARY는 유지**한다. 현재 builder는 HOST_ONLY를 emit하지 않지만 화이트리스트로 보존한다. 클라이언트는 수신한 증빙 목록을 추가 필터링 없이 그대로 표시한다.

legal hold는 `DisputeLegalHoldService`가 OPEN/IN_REVIEW/ESCALATED 상태 케이스에 대해 판정하며, `evidenceFrozen=true` 케이스의 evidence는 삭제가 불가능하다. 계정 삭제·데이터 익명화(`AccountDeactivationService`, `DataDeletionService`)도 이 판정을 통과해야 한다.

`DisputeCaseRetentionScheduler`는 매일 05:00(cron zone 미지정 — JVM 기본 타임존)에 종결(RESOLVED/CLOSED) + 1년 경과 케이스의 evidence `file_metadata` row와 S3 파일을 삭제한다. 삭제 성공 건만 JSON 필드에서 제거하는 partial-success 방어 구조다. `purchase_refund_dispute`(`evidence_file_group_id`)와 `meeting_settlement_appeal`(evidence 필드 미보유)은 retention 대상에서 제외된다.

`EvidenceFileValidator`는 증빙 파일 첨부 시 소유권·용도·상태를 검증하며, `UserDisputeCase`, `DisputeAppeal`, `ClubMembershipAction` 등 증빙을 받는 도메인에서 공통으로 호출된다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Enum | `host/dispute/constants/Visibility.java` | 4값 + 각 값 의미 |
| Backend VO | `host/dispute/vo/DisputeEvidenceVo.java` | 필드 전체 (fileId, mimeType, fileSize, visibility 등) |
| Backend Service | `host/dispute/service/DisputeLegalHoldService.java` | `hasActiveLegalHold`, `isCaseEvidenceFrozen`, `isActive` 판정 |
| Backend Scheduler | `host/dispute/scheduler/DisputeCaseRetentionScheduler.java` | cron, RETENTION_YEARS=1, 7개 source, partial-success 구조 |
| Backend Validator | `EvidenceFileValidator` (소스는 `DisputeAppealService.java:86356e5` 참조) | 소유권/용도/상태 검증 |
| Backend Detail VO | `host/dispute/vo/DisputeCaseDetailVo.java:evidenceFrozen` | `boolean evidenceFrozen` 필드 |
| Flutter Screen | `lib/presentation/dispute/screens/dispute_evidence_screen.dart` | 증빙 전체화면 뷰어 |
| Flutter Screen | `lib/presentation/dispute/screens/dispute_case_detail_screen.dart` | `evidenceFrozen` 처리, 증빙 섹션 |
| Flutter Model | `lib/data/models/dispute/dispute_evidence_vo.dart` | Freezed 모델, `@Default(false) bool evidenceFrozen` |
| Flutter Enum | `lib/data/models/dispute/dispute_enums.dart:DisputeVisibility` | 4값, Dart prefix `DisputeVisibility` |
| Verification | 검증 없음 | — |

## 3. 전체 동작 흐름

### 증빙 조회 (서버 필터링 포함)

1. 사용자가 케이스 상세(`GET /api/v1/me/dispute-cases/{caseId}`)를 조회한다.
2. 서버 `filterByActorVisibility`(`DisputeCaseService.java:206-231`)가 **CS_ONLY timeline/evidence 항목을 제거**한 복사본을 반환한다. PARTIES/HOST_ONLY/PUBLIC_SUMMARY는 유지된다(현재 builder는 HOST_ONLY를 emit하지 않음 — 화이트리스트 보존 주석). actor 역할별 정교한 visibility 분기는 설계 의도이나 현재 구현 수준은 CS_ONLY 제거만이다.
3. Flutter가 수신한 `evidence` 목록을 추가 필터 없이 그대로 렌더링한다. 증빙 카드 탭 → `DisputeEvidenceScreen`(전체화면 뷰어). **evidence 삭제 버튼은 없음** — `EvidenceGallery`는 frozen 시 안내 배너만 표시하고 삭제 기능 자체가 미구현이다.
4. `evidenceFrozen=true`이면 삭제 버튼 숨김.

### legal hold 판정 흐름

1. 계정 삭제/익명화 요청 시 `DisputeLegalHoldService.hasActiveLegalHold(userId)` 호출.
2. `DisputeCaseQueryRepository.existsActiveCaseByUserId(userId)`가 source별 finder 기준으로 active(OPEN/IN_REVIEW/ESCALATED) case를 검사한다 (`DisputeCaseQueryRepository.java:131-234`):
   - OperationalIssue — reporter만
   - WarningReport — reporter만 (target은 club-scoped라 제외)
   - WarningAppeal — member(항소인)
   - MeetingSettlementAppeal — settlement.creatorUserId(호스트 측)
   - 공개 Report (CARPOOL 타입 제외) — reporter만
   - PurchaseRefundDispute — seller만 (buyer 측 finder 부재)
   - DateBlock 안전신고 — blocker(reporter)
   - CARPOOL Report — reporter
   - ClubMembershipAction(KICK/BAN) — 영향받은 member(userId)
   - USER_DISPUTE — reporter 및 target 양측 모두
3. hold가 있으면 `true` 반환 → 계정 삭제 차단.

### evidenceFrozen 판정 흐름

1. `DisputeLegalHoldService.isCaseEvidenceFrozen(caseId)` 호출.
2. caseId prefix 파싱 → 해당 source repo에서 status 조회 → `isActive(status)` 판정.
3. `OPEN | IN_REVIEW | ESCALATED` → frozen=true. `RESOLVED | CLOSED` → frozen=false.

### retention 정리 흐름 (매일 05:00, cron zone 미지정)

1. `DisputeCaseRetentionScheduler.expireOldCases()` 실행 (`DisputeCaseRetentionScheduler.java:103`).
2. 7개 source별로 `closed_at + 1년 < now` 기준 케이스 조회.
3. 각 케이스의 `evidence_file_ids` JSON 파싱 → `FileStorageService.delete(fileId)` 호출.
4. 삭제 성공한 ID만 JSON에서 제거. 일부 실패 시 해당 ID 유지(재시도 보장).
5. `meeting_settlement_appeal`(evidence 필드 미보유)과 `purchase_refund_dispute`(`evidence_file_group_id` 구조)는 처리 제외.

## 4. 서버 계약

### `Visibility` 4값

| 값 | 서버 정의 | 적용 대상 actor |
|---|---|---|
| `PARTIES` | 분쟁 양측(신고자/피신고자, 또는 양 거래자) 노출 | 신고자, 피신고자, 호스트, 참가자 |
| `HOST_ONLY` | 호스트(또는 정산 creator)만 열람 | 호스트, 정산 creator, CS |
| `CS_ONLY` | CS/운영자만 열람 | CS, admin |
| `PUBLIC_SUMMARY` | 요약 형태로 모두 노출 가능 | 전체 (요약 형태) |

실제 `filterByActorVisibility`는 **CS_ONLY만 제거**한다. PARTIES/HOST_ONLY/PUBLIC_SUMMARY는 유지된다. 현재 builder는 HOST_ONLY를 emit하지 않아 사실상 PARTIES/PUBLIC_SUMMARY + CS_ONLY 제거가 적용된다. 클라이언트 추가 필터링 없음.

### `DisputeEvidenceVo` 필드

| 필드 | 타입 | nullable | 설명 |
|---|---|---|---|
| `id` | long | N | 도메인 row id |
| `caseId` | String | N | 통합 케이스 id |
| `fileId` | long | N | `file_metadata.id` |
| `fileName` | String | N | |
| `mimeType` | String | N | |
| `fileSize` | long | N | bytes |
| `submittedByUserId` | Long | Y | 제출자 |
| `submittedByRole` | AuthorRole | N | USER/HOST/CO_HOST/CLUB_STAFF/CS/SYSTEM |
| `evidenceType` | String | N | IMAGE/RECEIPT/CHAT/PHOTO/LOCATION/PAYMENT/OTHER |
| `visibility` | Visibility | N | 4값 |
| `createdAt` | LocalDateTime | N | |

### `DisputeLegalHoldService` 계약

| 메서드 | 인자 | 반환 | 설명 |
|---|---|---|---|
| `hasActiveLegalHold(userId)` | `long userId` | `boolean` | `existsActiveCaseByUserId(userId)`에 위임. source별 제한 finder 사용 |
| `isCaseEvidenceFrozen(caseId)` | `String caseId` | `boolean` | case status가 OPEN/IN_REVIEW/ESCALATED이면 true |

legal hold active 기준: `OPEN | IN_REVIEW | ESCALATED`

`existsActiveCaseByUserId` source별 finder 범위 (`DisputeCaseQueryRepository.java:131-234`):

| source | finder 기준 |
|---|---|
| OperationalIssue | reporter만 (page=0, size=50) |
| WarningReport | reporter만 (target은 club-scoped이라 hold 판정 제외) |
| WarningAppeal | member(작성자) |
| MeetingSettlementAppeal | 호스트(settlement.creatorUserId) 경로로 검출 (appealer 직접 finder 없음) |
| Report(공개) | reporter, CARPOOL 제외 |
| PurchaseRefundDispute | seller만 (buyer 직접 finder 없음) |
| DateBlock | blocker, reportId≠null |
| CARPOOL Report | reporter |
| CLUB_MEMBERSHIP_ACTION | 영향받은 멤버(action.userId, KICK/BAN only) |
| USER_DISPUTE | reporter측+target측 양쪽 |
terminal (evidence 정리 대상): `RESOLVED | CLOSED`

`isCaseEvidenceFrozen` 내부: caseId prefix 파싱 → source repo 조회 → `UnifiedDisputeStatus` 매핑 → `isActive` 판정. caseId 형식 오류 또는 미존재 시 `false` 반환.

### `EvidenceFileValidator` 검증 체계

증빙 파일 첨부 시(`DisputeAppealService`, `UserDisputeCase` 생성, `ClubMembershipAction` 저장) 호출되는 공통 validator.

| 검증 항목 | 실패 시 에러 |
|---|---|
| 최대 파일 개수 초과 (>5) | `EVIDENCE_FILE_TOO_MANY` |
| 파일 소유권 불일치 (file_metadata.uploadedBy != userId) | 소유권 에러 |
| 파일 용도 부적합 (이미 다른 케이스에 사용 중) | 용도 에러 |
| 파일 상태 부적합 (삭제됨 등) | 상태 에러 |

UNBAN 액션 시 null 전달 → validator short-circuit (빈 목록 처리).

### `DisputeCaseRetentionScheduler`

| 항목 | 값 |
|---|---|
| cron | `0 0 5 * * *` (매일 05:00 — `zone` 미지정으로 JVM 기본 타임존. SLA 스케줄러 `DisputeSlaExceededScheduler`는 `Asia/Seoul` 명시와 대조적) |
| `RETENTION_YEARS` | 1년 |
| 처리 source (7개) | OperationalIssue(resolved_at), WarningReport(processed_at), WarningAppeal(processed_at), DATE_BLOCK(연결 report.processed_at + terminal status), CLUB_MEMBERSHIP_ACTION(appeal.processed_at + non-PENDING), USER_DISPUTE(resolved_at + RESOLVED/CLOSED), Report(evidence_file_ids + terminal) |
| 제외 source | `meeting_settlement_appeal`(evidence 필드 미보유), `purchase_refund_dispute`(`evidence_file_group_id` 구조 다름) |
| partial-success | 전부 삭제 성공 시에만 evidence_file_ids JSON 비움. 일부 실패 시 해당 ID 유지 → 재시도 보장 |
| 동작 범위 | evidence file_metadata + S3 파일 삭제만. case row 자체 익명화/삭제는 각 원천 도메인 책임 |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| 증빙 뷰어 라우트 | `/me/disputes/:caseId/evidence` (`Routes.myDisputeEvidence`) |
| 증빙 뷰어 화면 | `DisputeEvidenceScreen` |
| 증빙 섹션 | `DisputeCaseDetailScreen` 내 evidence 리스트 |
| evidenceFrozen | `@Default(false) bool evidenceFrozen` (Dart Freezed) — `true`이면 삭제 버튼 숨김 |
| Visibility enum | `DisputeVisibility` (prefix 불일치. 서버 `Visibility` wire값과는 일치) |
| 서버 필터링 신뢰 | 클라는 수신한 목록 그대로 렌더링. 추가 필터링 없음 |

### Dart enum 정합

| 서버 | Dart | wire value | 판단 |
|---|---|---|---|
| `Visibility` | `DisputeVisibility` | `name()` (prefix 불일치, wire 일치) | 일치 |
| `AuthorRole` | `AuthorRole` | `name()` | 일치 |

## 6. 상태/권한 매트릭스

| 시나리오 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 참가자가 PARTIES 증빙 조회 | `filterByActorVisibility`는 CS_ONLY만 제거. PARTIES/HOST_ONLY/PUBLIC_SUMMARY 유지 | 수신한 목록 그대로 렌더링 | PARTIES/PUBLIC_SUMMARY 증빙 표시 (현재 builder가 HOST_ONLY 미emit) | 일치 |
| 참가자가 HOST_ONLY 증빙 조회 시도 | 서버 필터(`filterByActorVisibility`)는 HOST_ONLY를 제거하지 않음. 현재 builder가 HOST_ONLY를 emit하지 않아 실질적으로 미포함 | — | 현재 해당 증빙 미표시 (builder 미emit 때문이며, 서버 필터 기준은 CS_ONLY 제거만) | 일치(현행 동작), 향후 builder가 HOST_ONLY emit 시 참가자에게 노출될 수 있음 — Gap |
| CS_ONLY 증빙 | `filterByActorVisibility`가 CS_ONLY 제거 | — | CS가 아닌 사용자에게는 미노출 | 일치 |
| evidenceFrozen=true (active case) | OPEN/IN_REVIEW/ESCALATED status | frozen 안내 배너 표시 | 증빙 삭제 불가 (서버 DELETE endpoint 미구현으로 frozen 여부 무관하게 삭제 불가) | 일치(삭제 기능 자체 없음) |
| evidenceFrozen=false (terminal case) | RESOLVED/CLOSED status | frozen 배너 미표시 | 조회만 가능 (삭제 endpoint 미구현) | 일치(조회 전용) |
| legal hold → 계정 삭제 차단 | `hasActiveLegalHold=true` | — (서버 차단) | 계정 삭제 불가 | 일치 |
| retention 1년 후 | `closed_at + 1년 < now` | — (서버 정리) | 증빙 파일 접근 불가 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `evidenceFrozen` boolean | `DisputeCaseDetailVo.evidenceFrozen` | `@Default(false) bool evidenceFrozen` | 일치 |
| visibility 필터링 실제 동작 | `filterByActorVisibility`: CS_ONLY만 제거, 나머지 3값 유지 | 클라이언트 추가 필터 없음 | 서버 필터가 CS_ONLY 제거에만 작동. HOST_ONLY는 현재 builder가 미emit으로 유지 |
| `DisputeVisibility` wire value | `Visibility.name()` | `DisputeVisibility.name` | 일치 (prefix는 다름) |
| evidence 삭제 endpoint | `DisputeCaseController.java` 전체 확인 결과 DELETE endpoint 없음 | `EvidenceGallery` frozen 시 안내 배너만 표시 (`evidence_gallery.dart:37-47`). 삭제 버튼 UI 없음 | 일치(삭제 endpoint 미구현, 화면도 조회 전용) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| ~~P1~~ 해소(2026-06-06, W14 S4) | **evidence 첨부**: `DisputeCaseCreateScreen`에 `EvidencePickerField` 배선 완료(최대 5 `evidenceFileIds`). 서버 `EvidenceFileValidator` 검증. | `dispute_case_create_screen.dart`(community_app `3cb12ac`) | 사용자가 증빙을 첨부해 운영팀에 맥락 전달 가능 | 완료 (마켓 환불 분쟁 첨부는 F08-14 §13 서버 계약 갭으로 별도) |
| P1 | **purchase_refund_dispute retention 미구현**: `evidence_file_group_id` 구조로 인해 단일 file_metadata 패턴과 다름. 별도 file group cleanup 경로 필요. | `DisputeCaseRetentionScheduler.java` 주석 | REFUND_DISPUTE evidence가 1년 후에도 정리되지 않음 | 별도 file group cleanup 스케줄러 추가 |
| P2 | **evidence 삭제 endpoint 미구현 확정**: `DisputeCaseController.java` 전체 확인 결과 DELETE endpoint 없음. `EvidenceGallery`는 frozen 시 안내 배너만 표시 (`evidence_gallery.dart:37-47`) — 삭제 버튼/AC 없음. 증빙은 조회 전용 + frozen 보존 안내만. | `DisputeCaseController.java` grep DELETE 0건 | evidence 삭제 기능 자체가 미구현. evidenceFrozen=false 상태에서도 삭제 불가 | evidence 삭제 endpoint 추가 여부 제품 정책 결정 필요 |
| P2 | **legal hold MeetingSettlementAppeal appealer 직접 finder 없음**: `existsActiveCaseByUserId`(:158-169)는 settlement.creatorUserId(호스트) 경로로만 SETTLEMENT_APPEAL을 검출. appealer가 호스트가 아닌 경우 legal hold 미검출 가능. | `DisputeCaseQueryRepository.java:158-169` 주석 | SETTLEMENT_APPEAL appealer(비호스트)의 계정 삭제가 잘못 허용될 수 있음 | MeetingSettlementAppeal appealer 직접 finder 추가 |
| P2 | **PurchaseRefundDispute buyer legal hold 미검출**: `existsActiveCaseByUserId`(:181-189)는 seller만 검사. buyer 시점 finder 없음. | `DisputeCaseQueryRepository.java:180-189` 주석 | buyer의 활성 REFUND_DISPUTE가 있어도 계정 삭제 차단 안 됨 | buyer 시점 finder 추가 |
| P3 | **HostInboxService 성능**: `collectAllItems` 내부에서 page=0, size=500 전량 조회 후 메모리 집계. 인박스 항목 많을 시 N+1 + 메모리 문제 잠재. | `HostInboxService.java:85-88` | 호스트 인박스 화면 응답 지연 가능 | DB 집계 쿼리로 전환 검토 |

## 9. 수용 기준

### AC-01. PARTIES 증빙 조회

Given 참가자가 OPEN 케이스의 상세를 조회한다.
When 서버가 PARTIES visibility 증빙을 포함해 `DisputeCaseDetailVo`를 반환한다.
Then Flutter 상세 화면에 해당 증빙이 표시된다. CS_ONLY 증빙은 응답에 포함되지 않으므로 표시되지 않는다.

### AC-02. evidenceFrozen=true 잠금

Given 케이스 status가 OPEN이다.
When 상세 조회 시 `evidenceFrozen=true`를 수신한다.
Then `EvidenceGallery`가 "증빙 보존 중" 안내 배너를 표시한다. 삭제 버튼은 서버 DELETE endpoint 미구현으로 원래부터 없다.

### AC-03. evidenceFrozen=false 비잠금

Given 케이스 status가 RESOLVED다.
When 상세 조회 시 `evidenceFrozen=false`를 수신한다.
Then 안내 배너가 표시되지 않는다. 삭제 endpoint 미구현으로 증빙 삭제는 불가하며 조회만 가능하다.

### AC-04. legal hold → 계정 삭제 차단

Given 사용자가 source별 finder 기준에 해당하는 역할(OperationalIssue reporter, WarningReport reporter, PurchaseRefundDispute seller, USER_DISPUTE reporter/target 등)로 OPEN/IN_REVIEW/ESCALATED 케이스에 연관되어 있다.
When 계정 삭제를 요청한다.
Then `DisputeLegalHoldService.hasActiveLegalHold(userId)=true` → `AccountDeactivationService`가 계정 삭제를 차단한다.

### AC-05. EvidenceFileValidator 소유권 검증

Given 사용자가 타인의 `file_metadata.id`를 `evidenceFileIds`에 포함해 이의제기를 제출한다.
When `EvidenceFileValidator`가 소유권 검증을 실행한다.
Then 소유권 불일치로 에러가 반환된다.

### AC-06. retention 1년 후 정리

Given 케이스가 RESOLVED + `closed_at + 1년 < now`다.
When `DisputeCaseRetentionScheduler`가 실행된다.
Then `evidence_file_ids`의 `file_metadata` row와 S3 파일이 삭제된다. 삭제 성공 건만 JSON에서 제거되며 일부 실패 시 재시도 보장된다. case row 자체는 삭제되지 않는다.

### AC-07. meeting_settlement_appeal retention 제외

Given `meeting_settlement_appeal` 케이스가 1년 이상 경과됐다.
When `DisputeCaseRetentionScheduler`가 실행된다.
Then retention 대상에서 제외된다. (evidence 필드 미보유)

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | evidence 삭제 endpoint | DELETE evidence endpoint 미구현. 제품 정책 결정 후 추가 여부 결정 |
| 구현 | evidence 첨부 v2 | `DisputeCaseCreateScreen`/`AppealFormScreen`에 업로드 UI 추가 |
| 구현 | purchase_refund_dispute retention | `evidence_file_group_id` 기반 별도 cleanup 스케줄러 설계 |
| 구현 | SETTLEMENT_APPEAL appealer + PurchaseRefundDispute buyer legal hold | 두 source에 대한 비호스트/buyer 측 legal hold 판정 finder 추가 |
| 정책 | CS_ONLY 증빙의 호스트 접근 여부 | HOST_ONLY와 CS_ONLY 경계 제품 정책 명확화 필요. 현재 filterByActorVisibility는 CS_ONLY만 제거 |
