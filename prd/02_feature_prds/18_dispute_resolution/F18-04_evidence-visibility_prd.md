# F18-04. 분쟁 증빙·공개범위·보존 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/dispute/ -->

## 1. 결론

분쟁 증빙(`DisputeEvidenceVo`)은 `Visibility` 4값(PARTIES/HOST_ONLY/CS_ONLY/PUBLIC_SUMMARY)을 기반으로 서버가 미리 필터링한 결과만 클라이언트에 전달한다. 실제 `filterByActorVisibility`(`DisputeCaseService`)는 **`CS_ONLY`를 제거하고, `HOST_ONLY`는 처분 권한이 있는 호스트 쪽 열람자(호스트·공동 주최자·정산 creator·클럽 운영진)에게만 남긴다**(차수 11 S3b). 현재 builder는 HOST_ONLY를 내지 않지만 값은 둔다. 클라이언트는 수신한 증빙 목록을 추가 필터링 없이 그대로 표시한다.

legal hold는 `DisputeLegalHoldService`가 OPEN/IN_REVIEW/ESCALATED 상태 케이스에 대해 판정하며, `evidenceFrozen=true` 케이스의 evidence는 삭제가 불가능하다. 계정 삭제·데이터 익명화(`AccountDeactivationService`, `DataDeletionService`)도 이 판정을 통과해야 한다.

`DisputeCaseRetentionScheduler`는 매일 05:00(cron zone 미지정 — JVM 기본 타임존)에 종결(RESOLVED/CLOSED) + 1년 경과 케이스의 evidence `file_metadata` row와 S3 파일을 삭제한다. 삭제 성공 건만 JSON 필드에서 제거하는 partial-success 방어 구조다. `purchase_refund_dispute`(`evidence_file_group_id`)와 `meeting_settlement_appeal`(evidence 필드 미보유)은 retention 대상에서 제외된다.

`EvidenceFileValidator`는 증빙 파일 첨부 시 소유권·용도·상태를 검증하며, `UserDisputeCase`, `DisputeAppeal`, `ClubMembershipAction` 등 증빙을 받는 도메인에서 공통으로 호출된다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `Visibility`, `DisputeEvidenceVo`, `DisputeLegalHoldService`, `DisputeCaseRetentionScheduler`, `DisputeAppealService`, `DisputeCaseDetailVo`, `DisputeCaseQueryRepository`. 앱: `dispute_evidence_screen.dart`, `dispute_case_detail_screen.dart`, `dispute_evidence_vo.dart`, `dispute_enums.dart`.

## 3. 전체 동작 흐름

### 증빙 조회 (서버 필터링 포함)

1. 사용자가 케이스 상세(`GET /api/v1/me/dispute-cases/{caseId}`)를 조회한다.
2. 서버 `filterByActorVisibility`(`DisputeCaseService.java:206-231`)가 **CS_ONLY timeline/evidence 항목을 제거**하고, 처분 권한(`actorPermissions.canResolveDispute`)이 없는 당사자 화면에서는 HOST_ONLY 항목도 제거한 복사본을 반환한다. PARTIES/PUBLIC_SUMMARY는 유지된다. 증빙은 붙인 사람 본인에게만 예외로 남긴다.
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

## 6. 상태/권한 매트릭스

| 시나리오 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 참가자가 PARTIES 증빙 조회 | `filterByActorVisibility`는 CS_ONLY 제거, 당사자 화면에서는 HOST_ONLY 도 제거. PARTIES/PUBLIC_SUMMARY 유지 | 수신한 목록 그대로 렌더링 | PARTIES/PUBLIC_SUMMARY 증빙 표시 (현재 builder가 HOST_ONLY 미emit) | 일치 |
| 참가자가 HOST_ONLY 증빙 조회 시도 | 서버 필터(`filterByActorVisibility`)가 처분 권한 없는 당사자 화면에서 HOST_ONLY를 제거(차수 11 S3b) | — | 해당 증빙 미표시 | 일치 |
| CS_ONLY 증빙 | `filterByActorVisibility`가 CS_ONLY 제거 | — | CS가 아닌 사용자에게는 미노출 | 일치 |
| evidenceFrozen=true (active case) | OPEN/IN_REVIEW/ESCALATED status | frozen 안내 배너 표시 | 증빙 삭제 불가 (서버 DELETE endpoint 미구현으로 frozen 여부 무관하게 삭제 불가) | 일치(삭제 기능 자체 없음) |
| evidenceFrozen=false (terminal case) | RESOLVED/CLOSED status | frozen 배너 미표시 | 조회만 가능 (삭제 endpoint 미구현) | 일치(조회 전용) |
| legal hold → 계정 삭제 차단 | `hasActiveLegalHold=true` | — (서버 차단) | 계정 삭제 불가 | 일치 |
| retention 1년 후 | `closed_at + 1년 < now` | — (서버 정리) | 증빙 파일 접근 불가 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `evidenceFrozen` boolean | `DisputeCaseDetailVo.evidenceFrozen` | `@Default(false) bool evidenceFrozen` | 일치 |
| visibility 필터링 실제 동작 | `filterByActorVisibility`: CS_ONLY 제거, 당사자 화면은 HOST_ONLY 도 제거 | 클라이언트 추가 필터 없음 | 호스트 쪽 열람자만 HOST_ONLY를 받는다. 현재 builder는 HOST_ONLY를 내지 않음 |
| `DisputeVisibility` wire value | `Visibility.name()` | `DisputeVisibility.name` | 일치 (prefix는 다름) |
| evidence 삭제 endpoint | `DisputeCaseController.java` 전체 확인 결과 DELETE endpoint 없음 | `EvidenceGallery` frozen 시 안내 배너만 표시 (`evidence_gallery.dart:37-47`). 삭제 버튼 UI 없음 | 일치(삭제 endpoint 미구현, 화면도 조회 전용) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| ~~P1~~ 해소(2026-06-06) | **evidence 첨부**: `DisputeCaseCreateScreen`에 `EvidencePickerField` 배선 완료(최대 5 `evidenceFileIds`). 서버 `EvidenceFileValidator` 검증. | `dispute_case_create_screen.dart` | 사용자가 증빙을 첨부해 운영팀에 맥락 전달 가능 | 완료 (마켓 환불 분쟁 첨부는 F08-14 §13 서버 계약 갭으로 별도) |
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
| 정책 | CS_ONLY 증빙의 호스트 접근 여부 | HOST_ONLY와 CS_ONLY 경계 제품 정책 명확화 필요. 현재 filterByActorVisibility는 CS_ONLY를 제거하고 HOST_ONLY는 호스트 쪽 열람자에게만 남긴다 |
