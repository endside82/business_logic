# F16-07. 호스트 제안 PRD

## 1. 결론

호스트 제안은 이벤트 호스트가 자기 이벤트 참여 멤버에게 줄 적립 점수를 제안하고, 운영진(`MILEAGE_MANAGER`)이 검토 큐에서 승인(적립 실행)/반려하는 두 단계 흐름이다. 제출/조회는 `MileageHostController`(`/api/v1/clubs/{clubId}/events/{eventId}/mileage-proposals`, `isEventHost` 검증), 처리는 `MileageAdminQueueController`(`/admin/.../host-proposals`)에서 이뤄진다.

제출 시 정책 활성(`requireActive`) + points>0 검증 후 `SUBMITTED` 제안을 만들고 **검토 큐(`HOST_PROPOSAL`)에 자동 적재**한다. 승인 시 `MileageEarningService.approveProposal`이 대상 멤버에게 적립(`insertEarn`, sourceType=`HOST_PROPOSAL`)을 실행하고 제안을 `APPROVED`로, 큐를 `PROCESSED`로 전환한다(`overridePoints`로 점수 조정 가능). 반려는 사유 필수.

판정: **제출·승인·반려는 사용 가능**. `HostProposalStatus`의 `NEEDS_MORE_INFO`/`WITHDRAWN` 전환 경로가 없고, 제안 경로(클럽+이벤트)와 처리 경로(admin)의 권한·컨트롤러가 분리되어 호스트가 자기 제안의 처리 결과를 직접 조회할 화면 흐름이 제한적인 것이 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `MileageHostController.java` | `isEventHost` 검증, `POST/GET .../mileage-proposals` |
| Backend Controller | `MileageAdminQueueController.java` | `host-proposals` 목록·`/approve`·`/reject` |
| Backend Service | `MileageEarningService.java` | `submitProposal`(큐 적재), `approveProposal`(적립 실행), `rejectProposal`(사유 필수) |
| Backend Service | `MileageReviewQueueService.java` | `enqueue`(HOST_PROPOSAL), `markProcessed` |
| Backend VO/Param/Enum | `MileageHostProposalVo.java`, `MileageHostProposalAddParam.java`, `MileageHostProposalProcessParam.java`, `MileageHostProposalSearchParam.java`, `constants/HostProposalStatus.java` | 필드·상태 |
| Frontend | `mileage_host_api.dart`, `mileage_host_repository.dart`, `mileage_host_providers.dart`, `mileage_admin_queue_api.dart`(approve/reject), `mileage_admin_queue_repository.dart`, `presentation/mileage/screens/mileage_host_proposal_screen.dart` | route·CTA |
| DB | `V1__init.sql` `mileage_host_proposal`, `mileage_review_queue` | 컬럼·상태·인덱스 |

## 3. 전체 동작 흐름

1. 이벤트 호스트가 호스트 제안 화면(`mileage-proposals`)에 진입 → 대상 멤버·점수·사유를 입력 → `submitProposal(clubId, eventId, param)` → `POST /api/v1/clubs/{clubId}/events/{eventId}/mileage-proposals`.
2. 서버 `MileageHostController#submitProposal`이 `requireEventHost(eventId, userId)`(아니면 `CLUB_PERMISSION_DENIED`) 검증 후 `earningService.submitProposal`.
3. `submitProposal`은 `requireActive` + points>0(`MILEAGE_AMOUNT_INVALID`) 검증, `SUBMITTED` 제안 저장, `reviewQueueService.enqueue(HOST_PROPOSAL, target=proposalId)`로 큐 적재, audit + outbox(`HostProposalSubmitted`). 응답 201 `MileageHostProposalVo`.
4. 호스트는 `getMyProposals` → `GET .../mileage-proposals`로 본인이 그 이벤트에 낸 제안 목록을 조회(`eventId + proposerUserId` 필터).
5. 운영진이 큐/제안 목록(`GET /admin/.../host-proposals`, `MileageHostProposalSearchParam`: status/eventId/proposerUserId)에서 제안을 검토.
6. **승인**: `POST /host-proposals/{proposalId}/approve`(`MileageHostProposalProcessParam`: overridePoints?, processReason?). `approveProposal`이 SUBMITTED/NEEDS_MORE_INFO만 처리, finalPoints(override 우선) 검증, ACTIVE 시즌 id로 `insertEarn`(sourceType=`HOST_PROPOSAL`, sourceId=`HOST_PROPOSAL-{id}`) → 제안 `APPROVED`+processedBy/resultingLedgerId, 큐 markProcessed, audit+outbox.
7. **반려**: `POST /host-proposals/{proposalId}/reject`. processReason 필수(없으면 `MILEAGE_REASON_REQUIRED`), 제안 `REJECTED`, 큐 markProcessed.
8. 이미 처리된 제안 재처리 시 `MILEAGE_PROPOSAL_ALREADY_PROCESSED`.

## 4. 서버 계약

### `POST /api/v1/clubs/{clubId}/events/{eventId}/mileage-proposals`
- 권한: `isEventHost(eventId, userId)`(아니면 `CLUB_PERMISSION_DENIED`).
- Body `MileageHostProposalAddParam`: targetMemberId(NotNull), points(Positive), reason, attachmentIds(List\<Long\>→JSON).
- 응답 201 `MileageHostProposalVo`. 정책 OFF → `MILEAGE_NOT_ACTIVATED`, points≤0 → `MILEAGE_AMOUNT_INVALID`.

### `GET /api/v1/clubs/{clubId}/events/{eventId}/mileage-proposals`
- 응답 `List<MileageHostProposalVo>`(eventId + proposerUserId 필터, 본인 제안).

### `GET /api/v1/admin/clubs/{clubId}/mileage/host-proposals`
- 권한 `MILEAGE_MANAGER`. Query `MileageHostProposalSearchParam`(status, eventId, proposerUserId). 응답 `Page<MileageHostProposalVo>`.

### `POST .../host-proposals/{proposalId}/approve`, `/reject`
- Body `MileageHostProposalProcessParam`(overridePoints?, processReason?). 응답 `MileageHostProposalVo`.
- approve: SUBMITTED/NEEDS_MORE_INFO만, 적립 실행 + APPROVED + resultingLedgerId.
- reject: processReason 필수, REJECTED.
- 이미 처리됨 → `MILEAGE_PROPOSAL_ALREADY_PROCESSED`, 미존재 → `MILEAGE_PROPOSAL_NOT_FOUND`.

### `MileageHostProposalVo` 필드
`id`, `clubId`, `eventId`, `proposerUserId`, `targetMemberId`, `points`, `reason`, `attachments`, `status`(HostProposalStatus), `processedBy`, `processedAt`, `processReason`, `resultingLedgerId`, `createdAt`, `updatedAt`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `eventMileageProposals`(`mileage-proposals`), 운영 처리는 `adminMileageQueue`/host-proposals 경로 |
| Screen | `MileageHostProposalScreen`(제출/조회), 승인·반려는 `MileageQueueScreen`(F16-08)에서 |
| Repository/API | 호스트: `MileageHostRepository.submitProposal/getMyProposals` / 운영: `MileageAdminQueueRepository.listHostProposals/approveHostProposal/rejectHostProposal` |
| Model | `MileageHostProposalVo`, `MileageHostProposalAddParam`, `MileageHostProposalProcessParam`, `HostProposalStatus` enum |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 이벤트 호스트 + 제출 | isEventHost 통과, SUBMITTED + 큐 적재 | 제출 성공 | 제안 등록·검토 대기 | 일치 |
| 비호스트 + 제출 | `CLUB_PERMISSION_DENIED` | 에러 | 제출 차단 | 일치 |
| 정책 OFF + 제출 | `MILEAGE_NOT_ACTIVATED` | 에러 | 제출 차단 | 일치 |
| MANAGER + 승인 | 적립 실행 + APPROVED | 승인 결과 | 멤버 적립·resultingLedgerId | 일치 |
| MANAGER + 승인 + overridePoints | finalPoints로 적립 | 조정 점수 입력 | 제안과 다른 점수 적립 | 일치 |
| MANAGER + 반려 사유 누락 | `MILEAGE_REASON_REQUIRED` | 에러 | 반려 차단 | 일치 |
| 이미 처리된 제안 재처리 | `MILEAGE_PROPOSAL_ALREADY_PROCESSED` | 에러 | 중복 처리 차단 | 일치 |
| NEEDS_MORE_INFO/WITHDRAWN 전환 | 전환 경로 없음 | 해당 CTA 없음 | 사용 불가 | **미구현 (Gap)** |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 제출 경로 | `/clubs/{clubId}/events/{eventId}/mileage-proposals` | 동일 path | 일치 |
| `HostProposalStatus` | SUBMITTED/APPROVED/REJECTED/NEEDS_MORE_INFO/WITHDRAWN | 동일 enum | enum 일치하나 일부 미사용 |
| 승인 적립 sourceType | `HOST_PROPOSAL`, sourceId `HOST_PROPOSAL-{id}` | 결과 표시만 | 일치 |
| 제안 조회 응답 | 호스트 `List`, 운영 `Page` | 호스트 List / 운영 PageResponse | 일치 |
| overridePoints | nullable, 우선 적용 | 입력 필드 | 일치 |
| 처리 경로 권한 | `MILEAGE_MANAGER`(admin 컨트롤러) | 운영 화면 | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | `NEEDS_MORE_INFO`/`WITHDRAWN` 전환 경로 부재 | enum에 존재하나 어떤 서비스도 이 상태로 전환하지 않음(approve는 NEEDS_MORE_INFO를 받지만 설정 경로 없음) | "추가 정보 요청"·"호스트 철회" 워크플로 불가 | 전환 액션 추가 또는 enum 정리 |
| P2 | 호스트의 처리 결과 추적 화면 제한 | 호스트 조회는 본인 이벤트 제안 목록만(`getMyProposals`), 승인/반려는 admin 화면 | 호스트가 자기 제안의 승인/반려·적립 결과를 확인할 알림/화면 흐름 불명확 | 호스트용 결과 알림(outbox)·상태 표시 경로 정의 |
| P2 | 제안 적립이 qualifiedForGrade=true | `approveProposal`이 `insertEarn(... qualifiedForGrade=true)` | 호스트 제안 적립도 등급 산정에 반영 — 정책상 의도인지 확인 필요 | 제안 적립의 등급 반영 정책 확정 |

## 9. 수용 기준

### AC-01. 호스트 제안 제출
Given 이벤트 호스트가 참여 멤버에게 50점을 제안한다. When `POST .../mileage-proposals`가 성공한다. Then SUBMITTED 제안이 생성되고 검토 큐에 HOST_PROPOSAL 항목이 적재된다.

### AC-02. 비호스트 차단
Given 호스트가 아닌 사용자가 제안을 제출한다. When 서버가 `isEventHost`를 검증한다. Then `CLUB_PERMISSION_DENIED`가 반환된다.

### AC-03. 승인 적립
Given MILEAGE_MANAGER가 SUBMITTED 제안을 승인한다. When `POST .../approve`가 성공한다. Then 대상 멤버에게 적립이 실행되고 제안은 APPROVED, resultingLedgerId가 채워진다.

### AC-04. 점수 조정 승인
Given 운영진이 overridePoints=30으로 승인한다. When 제안 points=50이다. Then 30점이 적립된다.

### AC-05. 반려 사유 필수
Given 운영진이 사유 없이 반려한다. When `POST .../reject`를 호출한다. Then `MILEAGE_REASON_REQUIRED`가 반환된다.

### AC-06. 중복 처리 방지
Given 이미 APPROVED된 제안을 다시 승인한다. When `POST .../approve`를 호출한다. Then `MILEAGE_PROPOSAL_ALREADY_PROCESSED`가 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | NEEDS_MORE_INFO/WITHDRAWN | 전환 액션 추가 또는 enum 정리 |
| 구현 | 호스트 결과 추적 | 승인/반려 알림(outbox) + 호스트 화면 상태 표시 |
| 정책 | 제안 적립 등급 반영 | qualifiedForGrade 정책 확정 |
| 테스트 | 제안 흐름 | 제출→큐 적재→승인 적립→중복 차단 E2E 추가 |
