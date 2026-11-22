# F15-07. 경고 이의제기 처리와 재제출 허용 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다.

## 현재 역할과 입구

운영 이의 목록은 GET /api/v1/admin/clubs/{clubId}/warnings/appeals의 Page를 읽는다. 상태·회원 필터를 지원하고 회원 닉네임을 보완한다. 운영자는 이의와 대상 GRANT를 확인해 전부 수용·일부 수용·반려를 선택하거나 종결된 이의의 재제출을 허용한다.

## 처리 권한과 결과

컨트롤러는 WARNING_REVIEWER 권한을 요구한다. 대상 GRANT의 패널티 카탈로그가 SEVERE이면 서버 resolve는 최종 결정 종류와 무관하게 OWNER를 요구한다. 단순 검토 권한만으로 모든 심각도 이의를 처리할 수 있다고 쓰지 않는다.

POST /appeals/{appealId}/resolve는 resolution·선택 mitigatePoints·reasonCode·reason을 받는다. ACCEPTED는 대상 원장의 REVERSE, PARTIALLY_ACCEPTED는 양수 감경점수의 MITIGATE를 만들고 resultingLedgerId를 연결한다. REJECTED는 원장을 그대로 두고 결과 원장 식별자가 없다. SUBMITTED·IN_REVIEW·WITHDRAWN을 최종 resolution으로 받지 않는다. 원장 조정의 세부 조건은 [경고 부여와 원장 조정](F15-06_grant-ledger-adjust_prd.md)을 따른다.

사유는 공백 불가·최대 4000자이며 reasonCode 최대 40자다. 앱 처리 다이얼로그는 최소 5자와 일부 수용 시 양수 점수를 요구한다. 사유 누락은 현재 서버에서 WARNING_APPEAL_NOT_FOUND로 거절한다.

## 선점·결과·검토 큐의 거래

공개 처리 경로는 하나의 트랜잭션인 claimAndResolve 안에서 먼저 claimForReview를 호출한다. 선점은 SUBMITTED만 받아 IN_REVIEW로 바꾸고 이어서 resolve가 최종 상태·처리자·시각·사유·결과 원장을 저장한다. 처리와 연결 큐의 마무리·감사·outbox 등록을 수행한다. 뒤 단계 실패는 이 트랜잭션의 선점도 되돌린다.

내부 resolve 자체는 미종결 상태를 다루지만 공개 경로의 선점이 더 좁다. 따라서 이미 IN_REVIEW로 남아 있는 이의는 공개 resolve 요청의 첫 단계에서 거절된다. 앱은 SUBMITTED와 IN_REVIEW 양쪽에 처리 조건을 열어 두므로 실제 요청에서 이 차이가 드러날 수 있다.

## 재제출 허용의 범위

POST /appeals/{appealId}/allow-resubmit는 진행 중 SUBMITTED·IN_REVIEW를 제외한 이의에 허용 시각·담당자를 저장하고 감사·outbox를 등록한다. 원장을 복원하거나 새 이의를 자동 생성하지 않는다. 현재 서버는 기존 허용 시각이 있어도 다시 기록할 수 있다.

운영 앱은 REJECTED이면서 허용 시각이 없는 행에만 허용 버튼을 제공한다. 회원 앱의 재제출은 허용 표식·종결 종류·같은 원장의 진행 중 이의 없음을 확인한다. 반면 서버의 새 이의 submit에는 허용 표식 검사가 없다. 상세한 차이는 [회원 이의제기의 재제출 조건](F15-03_appeal_prd.md#재제출-허용의-앱과-서버-차이)을 따른다.

## 앱의 최신 상태 확인과 복구

처리 다이얼로그는 현재 이의 목록에서 같은 클럽·행이 아직 처리 가능한지 재확인한다. 로딩·오류 중에는 오래된 행으로 처리하지 않는다. 재제출 허용도 현재 계정·세션·검토 권한·최신 행을 확인하고 동일 행의 중복 요청을 막는다.

성공과 반영 가능성이 있는 결과 불명은 콘솔·대상 회원·이의 목록을 갱신한다. 이미 처리된 오류는 목록을 읽고 닫으며 결과 불명·일반 거절은 입력을 유지한다. 이의 처리 API에는 회원 제출 API와 같은 필수 Idempotency-Key 헤더가 없다. 서로 다른 작업의 재전송 계약을 합치지 않는다.

## 코드 위치

서버: WarningAdminActionController#searchAppeals/resolveAppeal/allowResubmit, WarningAppealService#claimAndResolve/claimForReview/resolve/allowResubmit, WarningAppealResolveParam. 앱: warning_appeal_inbox_screen.dart, warning_admin_commands.dart, my_appeals_screen.dart.

<!-- source-references:start -->
서버 창구: `WarningAdminActionController#searchAppeals`, `WarningAdminActionController#resolveAppeal`, `WarningAdminActionController#allowResubmit`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 앱은 IN_REVIEW 처리 버튼을 허용하지만 공개 resolve의 선점은 SUBMITTED만 받는다. | 이미 검토 중 자료의 실패 가능성을 남긴다. |
| Gap | 운영 앱·회원 앱·서버의 재제출 허용 조건이 다르다. | 허용 표식을 서버 제출의 강제 승인으로 설명하지 않는다. |
| Risk | 심각도 OWNER 제한은 반려까지 적용되고 처리 사유 누락은 대상 없음 오류다. | 처리별 실제 권한·오류를 기록한다. |
| 미검증 | 실제 동시 판정·원장 후속 처리·알림 수신을 새로 실행하지 않았다. | 서비스 호출과 운영 완료를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 권한:** 경고 검토 권한과 SEVERE 대상의 OWNER 제한을 최종 결정 종류와 함께 적용한다.
- **AC-02 결과:** 전부 수용은 REVERSE, 일부 수용은 양수 MITIGATE, 반려는 원장 유지로 처리한다.
- **AC-03 거래:** 공개 경로의 SUBMITTED 선점과 최종 처리·큐·감사·outbox를 같은 트랜잭션에서 수행한다.
- **AC-04 검토 중 차이:** 앱 IN_REVIEW 표시와 공개 선점의 거절 조건을 미해결 경계로 기록한다.
- **AC-05 재제출 허용:** 허용 표식 저장을 새 이의 생성·원장 복원과 구분하고 세 계층의 다른 조건을 명시한다.
- **AC-06 앱 복구:** 최신 행·계정·권한을 재확인하고 이미 처리·결과 불명·일반 실패를 나눠 갱신과 입력 유지를 수행한다.
