# F15-06. 경고 부여와 원장 조정 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다.

## 역할과 공개 계약

WarningAdminActionController의 원장 명령은 WARNING_REVIEWER를 요구한다. 부여 가능한 유형 목록을 읽고 회원 상세에서 부여·감경·정정·만료·일괄 만료를 수행한다. SEVERE 유형에는 추가로 OWNER 권한이 필요하다. 부여 가능한 목록은 유형별 actions.grant를 반영한다.

POST /api/v1/admin/clubs/{clubId}/warnings/grants와 POST /ledger/bulk-expire는 WarningLedgerBatchResultVo를 반환한다. 감경·정정·만료는 각각 POST /ledger/{ledgerId}/mitigate·reverse·expire이며 WarningLedgerVo를 반환한다. 과거 dynamic Map 설명을 현재 응답으로 사용하지 않는다.

## 직접 부여와 부분 결과

직접 부여 입력은 대상 회원 목록·패널티 코드·사유·선택 이벤트·선택 점수 override·batchId다. 사유는 공백 불가·최대 4000자, 코드 최대 40자, batchId 최대 36자이며 점수는 0 이상이다. 중복 대상은 LinkedHashSet으로 제거한다. 현재 클럽 회원이 아닌 대상은 실패 목록에 넣고 선택 이벤트가 있으면 클럽 일치를 검사한다.

결과는 success·ledgerIds·failed·batchId다. 직접 부여의 failed는 회원 ID이며 반환한 원장 ID는 성공한 부여다. 대상별 RestException을 실패로 모으지만 하나의 외부 트랜잭션에서 실행하므로 모든 DB 오류가 안전한 부분 성공으로 바뀐다고 보장하지 않는다. 빈 대상 목록도 서버에서 받을 수 있다.

수동 부여 자체에는 정책 active 검사가 없다. 출결 자동 부여는 정책 활성과 출결 연결 유형을 요구한다. 자동 유형은 LATE·SAME_DAY_CANCEL/CANCELLED_SAME_DAY·NO_SHOW·REPEATED_CANCEL이며 ATTENDANCE_AUTO와 출결 ID로 중복을 막는다. 이 규칙을 수동 부여의 사전 조건과 섞지 않는다.

## 중복 재전송과 원장 보존

직접 부여와 일괄 만료의 컨트롤러는 선택 Idempotency-Key를 받아 요청을 검증·재생하는 서비스를 사용한다. 앱은 같은 본문의 키를 유지해 재전송한다. 수동 부여의 sourceId에는 매번 달라지는 값이 들어가므로 batchId만 같다고 중복 부여가 차단되는 것은 아니다.

감경은 같은 클럽의 GRANT를 대상으로 양수 점수·공백 아닌 사유를 요구한다. 회원 잠금과 커밋된 조정 행을 확인해 정정·만료된 대상이나 남은 유효 점수보다 큰 감경을 거절한다. 수동 감경은 batchId가 있으면 대상 원장과 batchId로 sourceId를 정하고 없으면 새 값을 만든다. 앱은 본문이 같을 때 batchId를 유지한다.

정정(REVERSE)과 만료(EXPIRE)는 원본을 삭제하지 않고 points=0의 연결 행을 추가한다. 이미 정정·만료된 원장을 다시 무효화할 수 없다. 모든 조정 뒤 요약을 재계산하고 감사·outbox를 기록한다.

## 일괄 만료 응답의 구분

일괄 만료는 grantLedgerIds·사유·선택 batchId를 받으며 빈 목록은 성공 0건을 반환한다. 각 대상의 RestException을 모으고 원래 입력 목록을 순회한다. 직접 부여와 달리 실패 목록은 GRANT 원장 ID이며 ledgerIds는 빈 목록이다. success만으로 응답의 ID 의미를 추측하지 않는다. 같은 ID가 입력에 반복되면 두 번째 처리에서 이미 무효화된 상태로 실패할 수 있다.

## 점수와 검토 등급

rawScore는 모든 GRANT 점수 합, qualifiedScore는 정정·만료되지 않은 GRANT 점수 합이다. effectiveScore는 각 활성 GRANT에서 연결된 감경을 빼고 0 미만을 막아 합산한다. effectiveCount는 활성 GRANT 행 수이므로 완전히 감경된 행도 포함할 수 있다.

활성 SEVERE GRANT가 있으면 점수 임계치와 정책 활성 여부보다 먼저 SEVERE_SANCTION_CANDIDATE로 판정한다. 점수를 전부 감경해도 원장을 정정·만료하지 않았다면 이 우선 판정이 남는다. manualLock은 등급·검토 상태를 유지하지만 점수 재계산 자체를 막지 않는다. 등급 상승·운영자 알림과 실제 제재 집행은 별도다.

## 앱의 명령과 복구

회원 상세는 서버가 준 유형과 현재 권한·세션을 확인한다. 현재 UI의 사유는 최소 5자다. 성공 0건과 일부 실패를 전체 성공과 구분하며, 키 만료 오류는 목록 확인과 새 작업을 안내한다. 원장이 이미 정정·만료됐으면 다시 읽고 조정창을 닫는다. 다른 실패·결과 불명은 입력을 유지하고 안전한 재전송 여부를 구분한다.

명령이 성공했거나 현재 세션에서 반영됐을 가능성이 있으면 관련 회원과 클럽 콘솔 변경 신호를 발행한다. 이 신호를 새로운 서버 실행 성공의 증거로 삼지 않는다.

## 코드 위치

서버: WarningAdminActionController, WarningLedgerService, WarningLedgerBatchResultVo, WarningMemberSummaryService, WarningPenaltyTypeConfigService, WarningAbilityPolicy. 앱: warning_admin_action_api.dart, warning_ledger_batch_result_vo.dart, warning_member_detail_screen.dart, warning_admin_commands.dart.

<!-- source-references:start -->
서버 창구: `WarningAdminActionController#getGrantablePenaltyTypes`, `WarningAdminActionController#grant`, `WarningAdminActionController#mitigate`, `WarningAdminActionController#reverse`, `WarningAdminActionController#expire`, `WarningAdminActionController#bulkExpire`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 부분 결과는 대상별 RestException 처리이며 전체 트랜잭션 오류까지 보장하지 않는다. | 실패 ID 종류와 재조회·재전송을 구분한다. |
| Risk | 수동 부여는 정책 active를 요구하지 않고 완전 감경된 SEVERE도 등급을 유지할 수 있다. | 부여 가능·유효 점수·심각 유형·제재를 나눠 설명한다. |
| 미검증 | 실제 동시 조정·재전송·부분 DB 실패를 새로 실행하지 않았다. | 현재 구조를 제품 시험 통과로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 부여 권한:** 현재 회원·유형·심각도 권한과 이벤트 소속을 확인한다.
- **AC-02 응답 타입:** 직접 부여의 실패 회원 ID와 일괄 만료의 실패 원장 ID를 구분한다.
- **AC-03 재전송 식별:** 부여/일괄 만료의 키와 감경의 batchId를 유지하고 batchId만으로 부여 멱등을 보장하지 않는다.
- **AC-04 조정 상한:** 잠금과 기존 조정 행을 바탕으로 유효 점수 초과 및 중복 무효화를 거절한다.
- **AC-05 원장 산식:** 원시·대상·실효 점수와 건수, SEVERE 우선 판정·수동 잠금을 구분한다.
- **AC-06 실패 복구:** 0건·부분 실패·이미 무효화·결과 불명에 맞춰 입력 유지와 재조회를 수행한다.
