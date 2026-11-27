# F15-09. 검토 큐·대시보드·통계와 감사 로그 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다. 현재 할 일은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)에 있다.

## 입구와 실행 권한

경고 콘솔에서 검토 큐·제보·이의·검토 대상·회원 상세·감사 로그로 이동한다. WarningAdminQueueController는 기본 WARNING_REVIEWER를 요구한다. 회원 상세만 WARNING_REVIEWER 또는 SANCTION_PROPOSER를 허용한다. 제재 담당이 회원 상세를 읽는 권한을 콘솔 통계·큐 전체 접근으로 넓히지 않는다.

공개 기반 경로는 /api/v1/admin/clubs/{clubId}/warnings다. GET /queue·review-targets·audit-logs는 페이지 응답, GET /queue/{queueId}는 단일 행, GET /dashboard·statistics·members/{memberId}는 각 전용 응답이다. 큐 처리는 POST /queue/{queueId}/process다.

## 제보 목록과 검토 큐의 구분

제보 검색은 WarningAdminActionController의 별도 /reports 경로다. 앱의 최신순·오래된순을 sortType으로 전달하고 서버가 정렬한다. 경고 제보 심사, 검토 큐 처리, 실제 원장 부여·제재 집행은 서로 다른 명령이다. 제보 심사의 상태·자기 대상 가림·입력 복구는 [클럽 경고 제보 심사](F15-05_report-review_prd.md)를 따른다.

검토 큐·감사 로그는 생성 시각 내림차순 뒤 ID 내림차순으로 읽는다. 검토 대상은 effectiveScore 내림차순 뒤 회원 ID 내림차순이다. 동점 순서를 유지하는 서버 페이지 계약과 사용자가 선택하는 제보 정렬을 혼동하지 않는다.

## 큐 생성과 처리의 범위

같은 대상 유형·대상 ID의 OPEN 큐가 있으면 재사용하고 새 행 경합도 저장소에서 막는다. 실제 연결에는 반복 익명 제보, 반복 취소 작업, 오래된 이의 작업이 있다. 과거 enqueue 호출처가 전혀 확인되지 않았다는 설명을 현재 상태로 유지하지 않는다.

이의 지연 작업은 매일 05:00 Asia/Seoul에 SUBMITTED·IN_REVIEW 중 생성 후 14일을 넘긴 대상을 개별 트랜잭션으로 다시 확인하고 APPEAL_OVERDUE 큐를 만든다. 28일을 넘긴 미상향 건에는 escalatedAt과 상향 outbox를 남긴다. 이 처리는 이의를 자동 인용·기각하거나 자동 종결하는 작업이 아니다.

큐 처리는 같은 클럽의 행을 잠그고 OPEN인지 확인한다. 이미 닫혔으면 현재 행을 반환한다. IGNORE는 IGNORED, APPROVE와 REJECT는 모두 PROCESSED이며 선택 메모·감사·outbox를 기록한다. 이 명령만으로 GRANT나 제재를 자동 생성하지 않는다.

## 대시보드 지표의 정확한 의미

newThisMonthCount는 이번 달 생성된 GRANT 행 수, severe30dCount는 최근 30일 SEVERE 유형으로 부여된 GRANT 행 수다. 현재 심각 제재 후보 회원 수가 아니며 뒤에 감경·정정된 부여를 자동 제외한 수치도 아니다. 대시보드는 현재 등급별 요약 수와 미처리 제보·이의·OPEN 큐 수도 포함한다.

제보 대기는 SUBMITTED·IN_REVIEW·NEEDS_MORE_INFO, 이의 대기는 SUBMITTED·IN_REVIEW다. outbox 관측값은 WARNING 도메인 전체 수치이며 해당 클럽만의 전송 상태로 제한되지 않는다.

## 통계 기간과 앱 제공 범위

원장 통계는 클럽·기간 조건을 사용한 저장소 집계다. 과거 findAll 뒤 메모리 필터 설명은 현재 구현과 다르다. period는 ALL·7D·30D·90D·MONTH·YEAR를 지원하며 빈 값이나 인식하지 못한 값은 전체 범위로 집계한다. 응답의 period 문자열과 실제 적용 범위를 동일시하지 않는다.

원장 유형별·패널티 코드별 GRANT 집계와 처리된 이의의 평균 소요시간 등이 있다. reviewTargetTotal은 현재 요약 상태에 대한 수치이며 기간 당시의 이력 스냅샷이 아니다. API와 provider에 period 전달이 존재한다. 다만 현재 presentation에서 warningStatisticsProvider 사용은 확인되지 않아 통계 기간 선택 화면의 완성을 주장하지 않는다. 콘솔의 현재 대시보드 표시와 구분한다.

## 이상 패턴과 감사의 범위

이상 패턴에는 반복 수동 마일리지·교환, 반복 큐, 추가 검토가 필요한 제보, 강퇴 재시도, 오래된 이의·상향 등이 쓰인다. 모든 항목이 같은 기간으로 집계되는 것은 아니다. 자기 자신에 대한 행동 집계는 기간 인자가 없는 감사 조회를 사용한다.

6개월 강퇴 추이는 실행 SUCCEEDED이며 결과가 REMOVED인 건을 실행 시각으로 묶는다. 이미 없던 회원에 대한 ALREADY_ABSENT 성공을 실제 제거 건수에 더하지 않는다. 감사 로그는 별도 페이지 API로 읽으며 목록을 열었다는 사실만으로 모든 알림 전송과 외부 효과가 완료됐다고 판정하지 않는다.

## 앱의 처리 확인과 복구

큐 처리창은 최신 동일 클럽 행·OPEN 상태·확정된 검토 권한·현재 세션을 확인한다. 권한이나 현재 행을 읽는 중이거나 오류면 실행하지 않는다. 처리 안내는 큐를 닫는 동작이며 제재 자체가 아니라는 점을 알린다. 실패하면 창을 유지하고 오류를 알린다. 실제 원장 조정과 제재는 각각의 입구·권한·결과를 별도로 확인한다.

## 코드 위치

서버: WarningAdminQueueController, WarningReviewQueueService, WarningLedgerQueryRepository, WarningReviewQueueQueryRepository, WarningMemberSummaryQueryRepository, WarningAuditLogQueryRepository, WarningReportQueryRepository, WarningAppealOverdueScheduler, WarningAppealOverdueWorker, WarningRepeatedCancelWorker, WarningAbusePatternService. 앱: warning_admin_queue_api.dart, warning_admin_providers.dart, warning_queue_screen.dart, warning_console_screen.dart, warning_admin_access.dart.

<!-- source-references:start -->
서버 창구: `WarningAdminQueueController#searchQueue`, `WarningAdminQueueController#getQueueItem`, `WarningAdminQueueController#processQueueItem`, `WarningAdminQueueController#getDashboard`, `WarningAdminQueueController#getAdminMemberDetail`, `WarningAdminQueueController#getReviewTargets`, `WarningAdminQueueController#searchAuditLogs`, `WarningAdminQueueController#getStatistics`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 통계 period 전달은 있지만 현재 presentation의 통계 provider 소비가 확인되지 않았다. | API 지원과 기간 선택 UI를 구분한다. |
| Risk | 큐 승인은 큐 종결이고 일부 대시보드·패턴 수치는 클럽/기간 범위가 다르다. | 자동 제재나 모두 같은 범위의 지표로 설명하지 않는다. |
| 미검증 | 실제 대량 자료·예약 작업·큐 경합·운영자 접근을 새로 실행하지 않았다. | 소스 대조를 운영 실행 결과와 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 접근 분리:** 회원 상세의 OR 권한과 검토 콘솔·큐 권한을 구분한다.
- **AC-02 목록 정렬:** 제보 선택 정렬과 큐·감사·검토 대상의 서버 동점 순서를 유지한다.
- **AC-03 큐 계약:** OPEN 재사용·잠금·닫힌 행 재조회와 APPROVE/REJECT/IGNORE의 상태만 변경한다.
- **AC-04 지연 이의:** 14일 큐·28일 상향을 자동 최종 판정으로 설명하지 않는다.
- **AC-05 지표 의미:** GRANT 건수·현재 요약·기간 통계·전역 outbox 수치를 구분한다.
- **AC-06 화면 범위:** period 전달과 통계 화면 연결의 차이, 최신 권한 확인과 실패 시 창 유지를 명시한다.
