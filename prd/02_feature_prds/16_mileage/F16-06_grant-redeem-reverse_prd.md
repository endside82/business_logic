# F16-06. 마일리지 적립·차감·정정·배지 집행 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 현재 서버·앱 계약을 대조했다. 새 제품 실행·실기기 검수 기록은 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 정정

운영진의 직접/일괄 적립·차감, 원장 정정, 배지 부여·회수와 일괄 결과 조회를 다룬다. 점수 이동은 **REWARD_MANAGER**, 배지는 **BADGE_AWARD_MANAGER**, 서버 일괄 결과 조회는 **MILEAGE_MANAGER**다. 모든 작업을 MILEAGE_MANAGER 하나로 설명하지 않는다.

서버와 앱의 일괄 재조회 응답은 현재 MileageBatchResultVo로 연결된다. 과거 Map/GrantResultVo 불일치는 현재 문제가 아니다. 체크인·후기·사진 신호의 자동 적립 연결도 존재한다. 단순히 mileage 패키지 안에서 옛 함수 호출을 찾지 못했다고 미구현으로 판정하지 않는다.

## 현재 서버 계약

공통 접두사는 `/api/v1/admin/clubs/{clubId}/mileage`이고 MILEAGE 공개 범위를 적용한다.

| 요청 | 현재 계약 |
|---|---|
| POST /grants, /grants/bulk | REWARD_MANAGER, 필수 Idempotency-Key, MileageGrantParam → GrantResultVo |
| POST /redemptions, /redemptions/bulk | REWARD_MANAGER, 필수 Idempotency-Key, MileageRedeemParam → GrantResultVo |
| POST /ledger/{ledgerId}/reverse | REWARD_MANAGER, 필수 Idempotency-Key, 사유 → MileageLedgerVo |
| POST /badges/{badgeDefId}/awards | BADGE_AWARD_MANAGER, 회원 ID 목록·부여 사유 → 201 List<MileageBadgeAwardVo>. 필수 키 헤더 없음 |
| DELETE /badge-awards/{awardId} | BADGE_AWARD_MANAGER, revokedReason 필수 → 204. 필수 키 헤더 없음 |
| GET /batches/{batchId} | MILEAGE_MANAGER, MileageBatchResultVo |

적립·차감은 비어 있지 않은 회원 ID 목록, 양수 points, 필수 reason, 최대 200자 memo를 검사한다. 클럽 제도 ACTIVE를 진입과 회원별 잠금 경로에서 확인한다. 선택한 차감 presetId는 해당 클럽의 활성 사유여야 하며 요청 points와 reason을 자동으로 프리셋 값으로 교체하지 않는다.

## 멱등·부분 성공·원장

점수 명령은 API 멱등 실행기를 거치고 적립/차감 원장에도 요청 키와 회원 ID에 따른 출처 키를 사용한다. 기존 동일 출처 원장은 재사용한다. 일괄은 회원별 별도 트랜잭션에서 처리하므로 전체 성공/전체 롤백이 아니다. 즉시 GrantResultVo.results에는 각 회원의 success, ledgerId/newBalance 또는 errorReason을 담는다. batchId는 요청 대상 수가 2명 이상인 경우 생성한다.

적립은 회원 요약을 잠그고 새 원장을 기록한 뒤 잔액·원시 누적·등급 산정 누적과 해당 시즌 수치를 갱신한다. 수동/호스트 제안 적립은 현재 등급 산정에 반영한다. 요약이 없는 새 적립은 잠금 아래 0 요약을 만들지만 이미 적립 원장이 있는데 요약이 없으면 무결성 오류다.

차감은 잔액 부족을 거절하고 음수 REDEEM을 만든다. 정정되지 않은 EARN을 만료일(없는 값은 마지막), 적립일, ID 순으로 골라 소비 관계를 기록한다. 잔액과 누적 사용, 소비된 원장의 시즌 잔액을 갱신한다. 단순 사용/만료가 누적 등급 점수를 감소시킨다고 설명하지 않는다.

현재 차감은 FEFO에 배정하지 못한 잔여가 있으면 경고를 남기고 잔액 차감을 계속하는 경로가 있다. 반면 적립 정정에서 필요한 대체 소비를 배정하지 못하면 무결성 오류로 정정을 되돌린다. 모든 원장 작업이 같은 실패 정책을 가진다고 일반화하지 않는다.

## 정정·만료·배지의 서로 다른 효과

정정 대상은 같은 클럽·회원의 EARN 또는 REDEEM만 가능하다. 이미 정정된 대상의 새 실행은 MILEAGE_LEDGER_ALREADY_REVERSED다. API의 같은 명령 키 재응답과 대상 원장의 중복 정정 거절을 구분한다. 수동 정정 worker는 ACTIVE 조건 없는 설정 공유 잠금을 사용하므로 새 적립/차감 중지와 정정 가능 범위가 다르다.

| 처리 | 현재 효과 |
|---|---|
| EARN 정정 | 원래 적립액에서 이미 만료된 양을 제외한 금액을 회수. 충분한 현재 잔액 필요. 사용된 양은 다른 적립에서 대체 소비를 구성하고 원시/등급 누적은 원래 적립액만큼 감소 |
| REDEEM 정정 | 원래 사용액을 양수로 돌려주고 유효한 소비 관계를 복원. 누적 사용을 감소 |
| EXPIRE | 기한이 지난 미정정 EARN의 남은 양만 만료. 요약 잔액·누적 만료·시즌 잔액 갱신. 등급 누적을 감소시키거나 등급을 다시 산정하지 않음 |
| 배지 부여 | 활성 정의와 대상 회원을 확인해 부여 행·감사·outbox 생성. 점수 이동과 다른 목록 응답이며 한 번의 서비스 트랜잭션 |
| 배지 회수 | 사유 필수. revokedAt/By/Reason을 남기며 이미 회수됐으면 그대로 종료 |

배지 부여에는 점수 명령과 같은 Idempotency-Key 계약이나 서비스 내 기존 동일 부여 재사용이 없다. 화면 중복 탭 제한만으로 네트워크 재요청의 중복 부여 방지까지 보장하지 않는다.

만료 후보는 전체 원장 findAll이 아니라 만료 시각·정정 제외·잔여·ID cursor 조건으로 페이지 조회한다. 만료 기간은 적립 당시 설정으로 만료일을 정하고 0일이면 만료일이 없다. 제도 PAUSED만으로 이미 정해진 만료 처리를 멈추지 않는다.

## 자동 적립 연결의 확인 범위

체크인과 후기 작성은 실제 서비스에서 제도 활성 여부를 확인하고 MileageAutoTaskSignals.earn을 호출한다. 후기 되돌림은 revert 신호로 연결된다. 사진은 별도 MILEAGE_PHOTO 공개 범위와 활성 확인 후 사진 검토 의도를 기록한다. 신호는 원래 쓰기 트랜잭션에서 작업 의도를 저장하고 커밋 후 runner로 넘긴다. 활성 상태를 판정하지 못하면 사람의 검토가 필요한 기록을 남긴다.

이 연결 확인은 ‘호출처가 전혀 없음’이라는 과거 진단을 정정하는 근거다. 사진의 검토·승인과 자동 작업의 최종 원장 성공을 단순 업로드/신호 호출만으로 보장하지 않는다. 작업 의도 저장, 실행, 원장 반영, 알림 전달은 별도 결과다.

## 일괄 결과와 화면 복귀

앱은 회원·양수 점수·사유를 확인하고 변경 내용을 확인받은 뒤 현재 보상 권한을 다시 확인한다. 같은 본문을 재시도할 때 같은 키를 사용하고 성공 시 그 시도를 완료 처리한다. 실패 시 입력을 유지한다. ‘호출할 때마다 UUID를 새로 만든다’는 과거 설명과 다르다. 대상 수에 따라 단일/일괄 API를 선택한다.

결과 화면은 현재 계정 범위가 유효한 즉시 GrantResultVo가 있으면 이를 표시한다. 서버 새로고침은 batchId와 검토 권한이 필요하다. 회원 상세에서는 개별 적립·차감과 EARN/REDEEM 정정 입구를 제공한다.

서버 재조회는 저장된 batchId의 원장 행과 `actionType contains("FAIL")`인 감사 행을 조합한다. badgeRows는 현재 항상 빈 목록이고 succeeded는 원장 행 수, totalAffectedMembers는 원장에 등장한 서로 다른 회원 수다. 적립·차감 루프의 실패는 응답 행과 로그에 기록되지만 이 경로에서 실패 감사 행을 별도로 남기지는 않는다. 따라서 **즉시 결과의 실패 목록을 나중의 서버 조회가 완전히 재현한다고 보장할 수 없다**.

정정의 직접 응답은 id/club/member/type/amount/source/reversesLedgerId만 구성한다. 사유·시각 등을 채운 완전한 원장 응답이라고 설명하지 않는다. 최신 표시에는 원장 재조회가 필요하다.

## 코드 위치

서버: MileageAdminActionController, MileageEarningService/GrantWorker, MileageRedemptionService/Worker, MileageReverseWorker, MileageLedgerService, MileageBadgeService, MileageQueryService#findBatchResult, MileageLedgerQueryRepository, MileageAuditLogQueryRepository, MileageAutoTaskSignals, CheckInService, ReviewService, MileagePhotoUploadSignal. 앱: mileage_admin_action_api.dart, mileage_admin_action_repository.dart, mileage_admin_commands.dart, mileage_action_screen.dart, mileage_batch_result_screen.dart, mileage_member_detail_screen.dart.

<!-- source-references:start -->
서버 창구: `MileageAdminActionController#grant`, `MileageAdminActionController#grantBulk`, `MileageAdminActionController#redeem`, `MileageAdminActionController#redeemBulk`, `MileageAdminActionController#reverseLedger`, `MileageAdminActionController#awardBadge`, `MileageAdminActionController#revokeBadge`, `MileageAdminActionController#getBatchResult`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 서버 일괄 재조회는 즉시 실패 행과 배지 결과를 완전히 복원하지 않는다. | typed 모델 해결과 결과 보존 문제를 나눈다. |
| Risk | 배지 부여에는 점수 명령과 같은 키/중복 재사용 계약이 없다. | 모든 운영 명령의 멱등 보장을 선언하지 않는다. |
| Risk | 차감의 FEFO 미배정은 경고 후 계속될 수 있다. | 모든 무결성 불일치가 롤백된다고 설명하지 않는다. |
| Gap | 정정 직접 응답에 사유·시각 등 일부 필드가 없다. | 전체 원장 표시와 재조회 필요를 구분한다. |
| 미검증 | 동시 요청·부분 실패·재시도·자동 적립 완료·기기 복귀를 실행하지 않았다. | 연결/계약 대조를 제품 실행 성공으로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 명령별 권한:** 보상·배지·일괄 조회 권한과 공개 범위를 구분한다.
- **AC-02 입력과 상태:** 대상·양수 점수·사유·메모·프리셋과 ACTIVE 검사 범위를 설명한다.
- **AC-03 요청 키:** 같은 점수 명령 시도의 키 유지와 원장 출처 키 재사용을 구분한다.
- **AC-04 부분 결과:** 회원별 별도 처리와 즉시 성공/실패 행을 전체 트랜잭션과 혼동하지 않는다.
- **AC-05 소비 순서:** FEFO 순서와 소비 관계·미배정 경고를 실제 구현대로 설명한다.
- **AC-06 정정과 만료:** 적립 회수·사용 복원·잔여 만료 및 등급 누적에 미치는 차이를 구분한다.
- **AC-07 배지 집행:** 활성 정의/회원 검사·부여/회수와 중복 요청 보장의 한계를 명시한다.
- **AC-08 자동 연결:** 실제 신호 호출과 최종 실행 성공을 나눈다.
- **AC-09 일괄 재조회:** 전용 모델·권한·원장/실패 감사 재구성 및 빈 badgeRows를 설명한다.
- **AC-10 입력과 재조회:** 실패 입력 유지·현재 계정의 즉시 결과·정정 후 원장 재조회를 구분한다.

소스 계약과 후속 실행 기준이다. 이번 작업에서는 제품 시험·부하/동시성·실기기·이미지 검수를 실행하지 않았다.
