# F15-04. 경고 정책과 패널티 유형 설정 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다. 현재 할 일은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)에 있다.

## 역할과 접근 권한

정책·패널티 설정은 클럽 운영진의 경고 정책 화면에서 관리한다. 서버의 WarningAdminPolicyController는 POLICY_OWNER를 요구한다. 현재 유효 권한 계산에서 OWNER는 전체 권한을 가지며 POLICY_OWNER는 위임 가능한 비트에 포함되지 않는다. 일반 WARNING_REVIEWER나 SANCTION_PROPOSER에게 정책 변경 권한이 자동으로 생기지 않는다.

## 정책 조회와 저장

GET /api/v1/admin/clubs/{clubId}/warnings/config는 정책이 없으면 초기화한다. 초기값은 active=false, allowAnonymous=false, 네 임계치 3·6·10·15이며 안내 문구는 비어 있다. PUT /config는 WarningProgramConfigUpdateParam을 받고 저장된 WarningProgramConfigVo를 반환한다. 안내 문구는 최대 4000자, 임계치는 0 이상이다. null 필드는 기존 값을 유지하는 매퍼를 사용한다.

임계치의 오름차순을 저장 시 강제하지 않는다. 0인 임계치는 해당 등급의 점수 판정을 끈다. active 또는 네 임계치가 바뀌면 회원 요약 재계산 대상을 표시하고 커밋 뒤 재계산 작업을 넘긴다. 저장 응답이 모든 회원의 재계산 완료를 보장하지 않는다. 정책 변경은 감사 기록과 정책 변경 outbox를 남긴다.

## 미리보기의 계산 범위

GET /config/preview는 저장 전 값을 쿼리로 받아 현재·예상 등급 분포와 경고를 반환하며 기존 정책이 있어야 한다. 없는 입력은 저장된 정책값을 사용한다. totalMembers는 클럽 전체 회원 수가 아니라 경고 요약 행 수다. 요약이 100000개 이상이면 분포 계산을 생략하고 LARGE_CLUB_DISTRIBUTION_SKIPPED를 반환한다.

비활성화·익명 제보 중단·임계치 역전에 관한 경고가 있다. 예상 분포는 점수 구간 계산이며 실제 재계산의 활성 SEVERE 원장 우선 판정과 manualLock 유지 규칙을 모두 재현하지 않는다. 따라서 예상 분포를 저장 후 확정 분포로 보장하지 않는다. 긴 안내 문구도 받는 GET 계약이므로 URL 길이 제약과 실제 사용 필드의 범위를 구분한다.

앱 API와 provider에 미리보기 계약은 있지만 현재 presentation에서 warningConfigPreviewProvider를 사용하는 화면은 확인되지 않았다. 정책 화면에 영향 미리보기 단계가 완성됐다고 쓰지 않는다.

## 패널티 카탈로그와 클럽별 설정

GET /penalty-type-catalog는 카탈로그를, GET /penalty-types는 사용 가능한 카탈로그와 클럽 설정을 합친 목록·actions를 반환한다. PUT /penalty-types는 typeCode·active·선택 points를 받고 본문 없이 성공을 반환한다. typeCode는 필수이며 최대 40자, active는 필수, points는 0 이상이다. 카탈로그가 사용 가능해야 설정할 수 있다.

점수는 명시한 부여 점수, 클럽별 points, 카탈로그 기본점수 순서로 결정한다. 설정 행이 없으면 목록의 configured=false·active=false지만 일반 부여 정책은 카탈로그 자체가 사용 가능하면 허용할 수 있다. 반면 호스트 출결 제보의 연결 유형은 attendanceLinkable과 실제 활성 클럽 설정 행을 요구한다. 목록 표시와 두 부여 경로의 자격을 동일시하지 않는다.

기존 points를 null로 보내면 null 무시 매퍼가 값을 유지한다. 앱 입력칸을 비우는 것만으로 이미 저장한 맞춤 점수가 기본값으로 복원되지 않는다. 비활성 설정이 있는 유형은 새 부여가 거절되지만 이미 쌓인 원장을 지우지는 않는다. SEVERE 유형의 부여 권한은 별도로 OWNER를 요구한다.

## 앱의 저장과 실패 복구

정책 화면은 최신 클럽 권한·계정 세션·불러온 설정을 확인한 뒤 저장한다. 임계치 입력은 비어 있거나 0 이상의 정수여야 하며 순서 역전은 막지 않는다. 유형 저장도 최신 목록과 정책 관리 권한을 다시 확인한다.

성공 시 저장된 폼 상태를 반영한다. 결과가 불명확하면 입력을 유지하고 현재 설정을 확인하도록 안내한다. 권한 거절이면 클럽 권한을 다시 읽는다. 서버의 본문 없는 유형 저장 응답을 변경된 유형 VO로 취급하지 않는다.

## 코드 위치

서버: WarningAdminPolicyController, WarningProgramConfigService, WarningPenaltyTypeConfigService, WarningMapper, WarningMemberSummaryService, WarningAbilityPolicy, ClubMemberPermissionFlag. 앱: warning_policy_screen.dart, warning_admin_policy_api.dart, warning_admin_providers.dart.

<!-- source-references:start -->
서버 창구: `WarningAdminPolicyController#getConfig`, `WarningAdminPolicyController#updateConfig`, `WarningAdminPolicyController#previewConfig`, `WarningAdminPolicyController#getPenaltyTypes`, `WarningAdminPolicyController#updatePenaltyType`, `WarningAdminPolicyController#getPenaltyTypeCatalog`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 임계치 단조성을 저장에서 강제하지 않고 재계산은 후속 작업이다. | 저장 성공·경고·요약 반영 완료를 구분한다. |
| Gap | 예상 분포가 SEVERE·수동 잠금의 실제 판정 전체를 재현하지 않고 미리보기 화면 연결도 확인되지 않았다. | 서버 제공과 실제 UI 제공을 구분한다. |
| Gap | 기존 맞춤 점수를 빈 입력/null로 초기화할 수 없다. | 기본점수 복원 동작이 있다고 쓰지 않는다. |
| 미검증 | 실제 소유자 계정 저장·대규모 재계산·네트워크 결과 불명을 실행하지 않았다. | 이번 근거는 소스 대조다. |

## 수용 기준과 검증 근거

- **AC-01 정책 권한:** POLICY_OWNER와 현재 OWNER의 유효 권한 계산을 기준으로 접근한다.
- **AC-02 저장 계약:** 초기값·0 이상 임계치·null 유지와 커밋 뒤 재계산을 구분한다.
- **AC-03 미리보기 한계:** 요약 행 수·대규모 생략·SEVERE 및 잠금과의 차이를 설명한다.
- **AC-04 유형 사용:** 카탈로그·미설정·비활성·출결 연결의 서로 다른 자격을 구분한다.
- **AC-05 점수 선택:** 부여 override·클럽 points·기본값의 순서와 null 초기화 한계를 유지한다.
- **AC-06 앱 복구:** 최신 권한·세션으로 저장하며 실패 시 입력과 현재 설정 확인 경로를 유지한다.
