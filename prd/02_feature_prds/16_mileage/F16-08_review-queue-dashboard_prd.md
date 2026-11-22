# F16-08. 검토 대기열·대시보드·감사 기록 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 서버와 앱 소스의 현재 계약을 대조했다. 새 제품 실행·실기기 확인 기록은 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 응답 정정

운영 콘솔은 본인의 정책·검토·점수 처리·배지 권한을 조회하고 허용된 입구를 제공한다. 대시보드와 회원 상세는 현재 서버·앱 양쪽의 **전용 응답 모델**을 사용한다. 과거 문서의 Map/MemberMileageMainVo 불일치 설명은 현재 계약과 다르다. 대시보드 원장 수치는 SQL 집계, 회원 관련 감사 기록은 구조화된 memberUserId로 조회한다. 전체 원장 `findAll()`과 감사 JSON 문자열 포함 검색을 현재 구현으로 설명하지 않는다.

다만 회원 상세 화면은 요약·배지·원장을 표시하고, 응답의 auditTrail/openQueueItems는 표시하지 않는다. 모델 정합성 해결과 화면에서 모든 정보 제공은 별개의 상태다.

## 권한별 콘솔과 공개 범위

`GET /api/v1/admin/clubs/{clubId}/mileage/my-permissions`는 POLICY_OWNER, MILEAGE_MANAGER, REWARD_MANAGER, BADGE_AWARD_MANAGER의 허용 여부와 canEnterConsole을 계산한다. 앱은 권한 데이터가 확정될 때까지 보호하고 검토 권한이 있을 때 대시보드, 정책 권한이 있을 때 설정을 읽는다.

| 행동 | 현재 서버 권한·별도 경계 |
|---|---|
| 대기열·대시보드·회원 상세·감사 조회와 일반 무시 | MILEAGE_MANAGER, MILEAGE 공개 범위 |
| 반복 수동 적립 NORMAL 판정 | MILEAGE_MANAGER, MILEAGE_ADVANCED_REVIEW 공개 범위 |
| 반복 수동 적립 FRAUD 판정 | 위 조건 + REWARD_MANAGER |
| 자동 회수 검토의 회수 재시도 | REWARD_MANAGER |
| 자동 회수 검토의 종결 | MILEAGE_MANAGER |

점수 지급·차감·원장 정정은 [적립·차감·정정](F16-06_grant-redeem-reverse_prd.md), 호스트 제안 승인/거절은 [호스트 제안](F16-07_host-proposal_prd.md)의 별도 명령이다. 일반 대기열 처리로 모두 대신하지 않는다.

## 현재 서버 계약

아래 주소의 공통 접두사는 `/api/v1/admin/clubs/{clubId}/mileage`다.

| 요청 | 현재 결과 |
|---|---|
| GET /my-permissions | `MileageConsolePermissionVo` |
| GET /queue | queueType/status 필터의 `Page<MileageReviewQueueVo>`, 생성 시각/id 역순 |
| GET /queue/{queueId} | 현재 클럽의 단건. 타 클럽/없는 항목은 없음 오류 |
| POST /queue/{queueId}/process | decision은 **IGNORE만 허용**. OPEN → IGNORED, 감사·outbox 기록, 204 |
| POST /queue/{queueId}/repeated-manual-decision | NORMAL/FRAUD, note, 선택 원장 ID. 필수 Idempotency-Key, 처리 결과 VO |
| POST /queue/{queueId}/auto-revert/retry | 필수 Idempotency-Key와 note, 회수 재시도 결과 VO |
| POST /queue/{queueId}/auto-revert/close | 필수 Idempotency-Key와 note, 원장 변경 없이 종결한 결과 VO |
| GET /dashboard | `MileageAdminDashboardVo` |
| GET /members/{memberId} | `MileageAdminMemberDetailVo`: memberNickname/main/ledger/auditTrail/openQueueItems |
| GET /members/{memberId}/grade-history | 기본 50개, 저장소 1~200 제한의 `List<MileageGradeChangeVo>` |
| GET /audit-logs | `Page<MileageAuditLogVo>`, actorId/actorRole/actionType/targetType/targetId/batchId/from/to 필터 |

대기열 유형은 HOST_PROPOSAL, AUTO_REVERT_REVIEW, REPEATED_MANUAL, REPEATED_REDEMPTION의 **4개**, 상태는 OPEN/PROCESSED/IGNORED다. 일반 process는 APPROVE/REJECT를 실행하지 않으며 이미 닫힌 항목은 성공 no-op이 아니라 처리됨 오류다. 앱의 호스트 제안 행은 별도 제안 처리 화면을 열고, 일반 무시로 닫으면 점수가 바뀌지 않음을 안내한다.

## 판정·재시도·종결의 차이

반복 수동 적립은 같은 클럽/운영자/회원의 기간 내 MANUAL_GRANT를 증거로 묶는다. 반복 차감도 실제 탐지 워커가 있으며 같은 회원의 사유·액수와 인접 처리 간격을 이용한다. 두 탐지는 고급 검토 공개 범위를 확인하고 이전 증거의 최대 ID와 탐지 키로 중복 적재를 줄인다. enum에만 존재하고 모두 미구현이라는 과거 설명은 현재와 다르다.

반복 수동 적립 판정은 REPEATED_MANUAL 대상만 받는다. NORMAL은 선택 원장이 없어야 하며 FRAUD는 중복 없는 원장 ID가 필요하다. 선택 ID는 저장된 증거에 속해야 하고 실제 클럽·회원·운영자·EARN/MANUAL_GRANT를 다시 확인한다. 이미 정정된 원장은 건너뛴다. 회수 잔액이 부족하면 AUTO_REVERT_REVIEW를 적재하고 나머지 판정을 진행하므로 PROCESSED가 모든 금액 회수 완료를 뜻하지 않는다.

자동 회수 검토는 클럽·회원·EARN 원장을 확인한다. 재시도는 회수 필요액과 잔액을 검사해 정정하며 이미 정정됐다면 새 정정을 만들지 않고 처리할 수 있다. 종결은 원장을 바꾸지 않는다. 두 명령은 성공 시 PROCESSED와 처리자·메모·감사·outbox를 남긴다. 같은 사용자/키/내용은 기존 결과, 같은 키/다른 내용은 충돌이며 다른 키로 닫힌 항목을 다시 처리하면 처리됨 오류다.

반복 차감 행의 ‘증거 확인 및 정정’과 반복 적립의 ‘증거 확인과 판단’은 별도 화면 입구다. 반복 적립 판정 API를 반복 차감에도 공통 사용한다고 설명하지 않는다.

## 집계의 의미와 회원 상세

| 항목 | 현재 의미 |
|---|---|
| activeMembers | 최근 30일 EARN 기록이 있는 서로 다른 회원 수. 클럽 전체 활동 회원 수가 아님 |
| 월 적립·사용·만료 | DB의 월별 원장 집계, 사용/만료는 절댓값 |
| prevMonthDelta | 이번 달 EARN − 전월 EARN |
| pendingQueueCount | 해당 클럽 OPEN 항목 수. 현재 열린 행을 읽어 size를 계산 |
| recentActions | 해당 클럽 최근 감사 10건 |
| currentSeason | ACTIVE 시즌 요약 |
| outboxMetric | **MILEAGE 도메인 전역** PENDING/FAILED/SKIPPED 수. 클럽별 집계가 아님 |
| 회원 상세 원장 | 해당 회원 첫 페이지 50건 |
| auditTrail | memberUserId로 조회한 최근 감사 20건 |
| openQueueItems | 해당 클럽·회원의 OPEN 항목, id 역순 |

앱 상세 모델은 ledger Page의 content를 목록으로 읽으며 페이지 메타데이터를 보존하지 않는다. 화면에 별도 다음 페이지 입구도 없다. ledger가 비어 있으면 main.recentLedger를 대체 표시한다. 감사 목록은 플랫폼 관리자·시스템 역할의 actorId를 0으로 가리며, 회원용 원장 가림과 동일한 전체 정책이라고 확대하지 않는다.

## 앱 행동·실패·복귀

대기열은 상태별 20건 추가 조회, 감사 기록은 역할·행동·날짜 필터와 20건 이전/다음 페이지를 사용한다. 감사 필터 변경은 첫 페이지로 돌아간다. 빈 상태와 로딩·오류 재시도를 구분한다.

점수 회수 재시도와 단순 종결은 서로 다른 단추와 권한을 사용한다. 처리 중 중복 탭을 막고 세션/명령 범위를 확인한다. 전용 명령 provider는 같은 시도의 키를 유지하며 성공·이미 처리됨·저장됐을 수 있는 오류에서 목록과 단건을 다시 읽는다. 결과 미확인과 실패를 새 키로 무조건 재실행하는 것으로 설명하지 않는다.

## 코드 위치

서버: MileageAdminQueueController, MileageConsolePermissionService, MileageReviewQueueService, MileageReviewQueueQueryRepository, MileageRepeatedManualReviewService/Worker, MileageRepeatedManualQueryRepository, MileageAutoRevertReviewService/Worker, MileageQueryService, MileageLedgerQueryRepository, MileageAuditLogQueryRepository. 앱: mileage_admin_queue_api.dart, mileage_admin_queue_providers.dart, mileage_admin_member_detail_vo.dart, mileage_console_screen.dart, mileage_queue_screen.dart, mileage_audit_log_screen.dart, mileage_member_detail_screen.dart.

<!-- source-references:start -->
서버 창구: `MileageAdminQueueController#getMyConsolePermissions`, `MileageAdminQueueController#listQueue`, `MileageAdminQueueController#getQueueItem`, `MileageAdminQueueController#processQueue`, `MileageAdminQueueController#decideRepeatedManual`, `MileageAdminQueueController#retryAutoRevert`, `MileageAdminQueueController#closeAutoRevert`, `MileageAdminQueueController#getDashboard`, `MileageAdminQueueController#getMemberDetail`, `MileageAdminQueueController#getMemberGradeHistory`, `MileageAdminQueueController#listAuditLogs`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 회원 상세 모델은 auditTrail/openQueueItems를 받지만 화면은 표시하지 않는다. | 응답 타입 해결과 화면 제공 범위를 분리한다. |
| Gap | 회원 상세 원장은 첫 50건이며 앱은 Page 메타데이터를 버린다. | 전체 원장 탐색 완료로 설명하지 않는다. |
| Risk | outbox는 도메인 전역 수치다. | 특정 클럽의 전송 장애 수로 단정하지 않는다. |
| Risk | FRAUD 처리 완료에도 잔액 부족 원장은 별도 회수 검토로 남는다. | 검토 종결과 금액 회수를 따로 확인한다. |
| 미검증 | 동시 처리·재시도·권한 회수·실제 집계/화면 복귀를 실행하지 않았다. | 소스 대조를 운영 검수 통과로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 권한별 입구:** 콘솔의 정책·검토·점수·배지 권한을 나누고 조회/명령 권한을 다시 적용한다.
- **AC-02 현재 유형:** 4개 대기열 유형과 3개 상태를 사용하고 실제 탐지 구현과 공개 범위를 구분한다.
- **AC-03 일반 처리:** IGNORE만 허용하며 이미 닫힌 항목의 오류와 별도 호스트 제안 명령을 구분한다.
- **AC-04 반복 적립 판정:** NORMAL/FRAUD의 원장 선택·권한·증거·멱등 조건을 설명한다.
- **AC-05 회수와 종결:** 잔액 부족의 추가 검토, 회수 재시도, 원장 변경 없는 종결을 구분한다.
- **AC-06 대시보드 의미:** EARN 기준 활동 회원·월 수치·전역 outbox를 해당 범위대로 표시한다.
- **AC-07 상세 응답과 화면:** 전용 모델 수신, 첫 50건 원장, 미표시 감사/열린 항목을 구분한다.
- **AC-08 감사 탐색:** API 필터·역순과 앱 역할/행동/기간 및 20건 페이지를 구분한다.
- **AC-09 실패 후 갱신:** 같은 시도의 키 유지와 결과 미확인/이미 처리됨 후 관련 조회 갱신을 설명한다.

현재 확인은 서버·앱 소스와 문서의 대조다. 새 제품 시험·동시성 실행·브라우저/실기기 통과 기록은 없다.
