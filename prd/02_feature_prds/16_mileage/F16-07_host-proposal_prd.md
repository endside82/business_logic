# F16-07. 호스트 적립 제안·승인·반려 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 현재 서버·앱 계약을 대조했다. 새 제품 실행·실기기 검수 기록은 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 입구와 범위

클럽 이벤트의 호스트는 이벤트 상세의 ‘마일리지 적립 제안’에서 제안 화면으로 들어간다. MILEAGE 공개 범위, 호스트 여부, clubId 존재가 입구 조건이며 라우터도 hostOnly 접근을 확인한다. 제안 화면은 회원 선택·점수·선택 사유/첨부와 ‘내가 낸 제안’을 함께 제공한다. 과거 문서의 호스트 처리 결과 조회 화면 부재 설명은 현재와 다르다.

운영진은 검토 대기열의 제안 처리 입구 또는 운영 액션의 제안 목록에서 처리한다. **승인은 REWARD_MANAGER**, 목록/단건/반려는 MILEAGE_MANAGER다. 일반 검토 대기열을 IGNORE로 닫는 동작은 제안 승인·반려가 아니며 점수를 바꾸지 않는다.

## 현재 서버 계약

MILEAGE 공개 범위를 적용한다.

| 요청 | 현재 계약 |
|---|---|
| POST /api/v1/clubs/{clubId}/events/{eventId}/mileage-proposals | 호스트 제출, MileageHostProposalAddParam → 201 MileageHostProposalVo |
| GET 같은 주소 | 현재 이벤트 호스트의 club/event/proposer 조건 목록, List<MileageHostProposalVo> |
| GET /api/v1/admin/clubs/{clubId}/mileage/host-proposals | status/eventId/proposerUserId 필터와 생성 시각/id 역순 Page |
| GET 위 운영 주소/{proposalId} | 현재 클럽 단건, 표시 이름 보강 |
| POST 위 운영 주소/{proposalId}/approve | 선택 overridePoints/processReason → 승인 VO, REWARD_MANAGER |
| POST 위 운영 주소/{proposalId}/reject | processReason 필수 → 반려 VO, MILEAGE_MANAGER |

제출·승인·반려 API는 필수 Idempotency-Key 헤더를 받지 않는다. 점수 직접 명령과 동일한 요청 키 API라고 설명하지 않는다. 승인 원장은 제안 ID 기반 출처 키를 사용한다.

## 제출·대상·첨부 검사

제출은 대상 ID와 양수 points를 검사하고 설정 공유 잠금 아래 제도 ACTIVE를 요구한다. 실제 이벤트 호스트, 이벤트의 clubId와 경로 일치, 제안자/대상 모두 해당 클럽 회원인지 확인한다. 첨부는 소유자 기준 검증·정규화에 최대 5개 제한을 적용하고 파일 참조를 연결한다.

현재 제출 서비스가 검사하는 대상 조건은 **클럽 회원**이다. 이벤트 참석 이력까지 같은 서비스에서 검증한다고 확대하지 않는다. 앱 회원 선택은 hostProposal 목적과 eventId를 보내지만 API의 직접 제출 검사 범위와 동일하다고 보장하지 않는다. reason은 현재 제출 서비스와 앱에서 선택 입력이다.

저장 결과는 SUBMITTED이고 HOST_PROPOSAL 검토 항목, 제출 감사, HostProposalSubmitted outbox를 남긴다. 본인 목록 조회는 현재 이벤트 호스트인지 확인한 뒤 클럽/이벤트/제안자 조건으로 읽는다. 제출에서 수행하는 활성·이벤트 클럽 일치·대상 회원 검사를 조회가 전부 반복하는 것은 아니다.

## 승인·반려·동시 처리

승인은 ACTIVE를 요구하고 SUBMITTED 또는 NEEDS_MORE_INFO만 처리한다. overridePoints가 없으면 제안 점수, 있으면 양수 조정 점수를 사용하며 대상이 아직 클럽 회원인지 재확인한다. 제안을 APPROVED로 기록하고 `HOST_PROPOSAL-{id}` 출처로 적립한 원장 ID를 resultingLedgerId에 연결한다. 최신 열린 HOST_PROPOSAL 검토 항목을 처리하고 감사·결과 outbox를 남긴다.

적립 worker는 별도 REQUIRES_NEW 트랜잭션이며 제안 상태 저장과 원장 반영을 하나의 단일 트랜잭션으로 설명하지 않는다. 응답 실패만으로 적립이 전혀 없었다고 판단하지 않고 제안/원장을 다시 조회해야 한다. 동일 제안 출처 원장은 재사용 경로가 있다.

반려는 처리 가능한 상태와 비어 있지 않은 사유를 확인해 REJECTED와 처리자/시각/사유를 저장하고 검토 항목을 처리한다. 반려에는 제도 ACTIVE 검사가 없어 중지 상태에서도 접수된 제안을 정리할 수 있다. 이미 끝난 제안의 새 승인/반려는 MILEAGE_PROPOSAL_ALREADY_PROCESSED이며 낙관적 잠금 충돌도 현재 결과를 읽은 뒤 같은 오류로 전달한다.

현재 상태 enum은 SUBMITTED/APPROVED/REJECTED/NEEDS_MORE_INFO의 4개다. WITHDRAWN은 없다. NEEDS_MORE_INFO를 받는 처리 조건은 남아 있지만 이번에 대조한 제안 Controller/Service에는 해당 상태로 바꾸는 명령이 없다. 추가 정보 요청·호스트 철회를 지원한다고 설명하지 않는다.

## 앱 결과·실패·복귀

호스트 화면은 회원·양수 점수를 확인하고 첨부 업로드 중 제출을 막는다. 성공 시 회원/점수/사유/첨부를 비우고 본인 목록을 다시 읽는다. 실패는 입력을 유지하지만 현재 오류 문구는 일반적인 제출 실패로 표시한다. 본인 목록에는 대상 이름·원래 제안 점수·사유·상태가 보이며 처리 사유와 resultingLedgerId는 표시하지 않는다.

운영 승인 단추는 현재 보상 권한을 확인하고 빈 처리 Param을 보내므로 **현재 화면에 overridePoints 입력은 없다**. 서버가 점수 조정 승인을 받는다는 사실과 화면 지원 범위를 나눈다. 반려는 사유 입력 명령을 사용한다. 권한이 부족한 승인은 비활성화하고 보상 권한 필요를 안내한다. 처리 결과 뒤 관련 콘솔/제안 조회를 다시 읽는 경로가 있다.

승인 시 원래 proposal.points를 최종 조정 점수로 덮어쓰지는 않는다. 원래 제안 점수와 실제 원장 적립액, 승인 outbox의 최종 points를 구분한다. 현재 앱의 빈 Param 승인은 원래 점수를 사용한다.

결과 outbox에는 제안자 userId와 eventId가 포함된다. 앱의 HostProposalApproved/Rejected 알림 경로는 eventId가 있으면 해당 이벤트 제안 화면, 없으면 클럽 마일리지 메인이다. 이것은 서버 기록/앱 이동 경로 확인이며 실제 푸시 수신을 검증한 것은 아니다.

## 코드 위치

서버: MileageHostController, MileageAdminQueueController, MileageEarningService, MileageEarningGrantWorker, MileageHostProposalQueryRepository, HostProposalStatus. 앱: mileage_host_api.dart, mileage_host_providers.dart, mileage_host_proposal_screen.dart, mileage_action_screen.dart, mileage_admin_commands.dart, event_detail_screen.dart, club_branch_routes.dart, notification_router.dart.

<!-- source-references:start -->
서버 창구: `MileageAdminQueueController#listHostProposals`, `MileageAdminQueueController#getHostProposal`, `MileageAdminQueueController#approveHostProposal`, `MileageAdminQueueController#rejectHostProposal`, `MileageHostController#submitProposal`, `MileageHostController#getMyProposals`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | NEEDS_MORE_INFO 전환·호스트 철회 명령이 없다. | enum/설계와 실제 지원 행동을 구분한다. |
| Gap | API 점수 조정 승인과 처리 사유/원장 정보가 현재 화면에 모두 노출되지 않는다. | 원래 제안 점수·최종 적립·상태 표시에 차이가 있음을 남긴다. |
| Risk | 직접 제출 API는 대상의 클럽 회원 여부를 확인하며 이벤트 참석 검사는 하지 않는다. | 회원 선택 UI와 서버 불변 조건을 혼동하지 않는다. |
| Risk | 제안 승인과 적립 worker의 트랜잭션이 나뉘고 제출에는 필수 요청 키가 없다. | 불명확한 실패에서 새 제안/새 적립을 임의 반복하지 않는다. |
| 미검증 | 파일 검증·승인 경합·중단 후 복구·푸시 수신·실제 앱 복귀를 실행하지 않았다. | 소스 계약과 실제 운영 결과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 호스트 입구:** 이벤트 상세의 공개 범위/호스트/클럽 조건과 hostOnly 라우터를 대조한다.
- **AC-02 제출 검사:** 활성 제도·클럽 일치·호스트/대상 회원·양수 점수·첨부 검증 경계를 설명한다.
- **AC-03 접수와 목록:** SUBMITTED·대기열·감사/outbox 생성과 본인 상태 목록을 구분한다.
- **AC-04 처리 권한:** 승인 보상 권한과 조회/반려 검토 권한을 나눈다.
- **AC-05 실제 적립:** 조정 점수·제안 출처 키·별도 트랜잭션과 원장 ID 연결을 설명한다.
- **AC-06 반려와 경쟁:** 사유 필수·중지 중 반려·종료 상태/낙관적 충돌 오류를 구분한다.
- **AC-07 화면 결과:** 입력 유지/초기화, 원래 점수/상태 표시와 조정 입력·처리 사유 미표시를 명시한다.
- **AC-08 알림과 미지원 상태:** 제안자/eventId 결과 경로와 추가 정보 요청/철회 미지원을 구분한다.

현재 소스 계약과 후속 실행 기준이다. 이번 작업에서 제품 시험·실기기·알림 전송/수신·시각 검수를 실행하지 않았다.
