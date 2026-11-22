# F04-18. 클럽 회원 신뢰도 점수와 공개 범위 PRD

<!-- release-document: reference -->
> 2026-11-22 실제 서버·앱과 선택 시험 단언을 대조했다. 새 제품 실행이나 프로덕션 적합성 판정은 아니다. 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다. 이 기능은 소스 기준으로 관리하며 별도 units 문서를 만들지 않는다.

## 현재 범위와 실제 입구

클럽 회원의 신뢰도는 마일리지·등급·경고·심각 제재를 조합한 현재 점수다. 앱의 실제 카드 사용처는 **내 마일리지 화면**과 **운영진의 회원 마일리지 상세** 두 곳이다. 일반 회원 목록이나 모든 프로필에 기본으로 노출한다고 설명하지 않는다.

내 마일리지 화면은 회원 경로로 들어가며 마일리지 자료를 읽은 뒤 프로그램이 아직 시작되지 않은 경우 시작 전 안내를 보여 준다. 이때는 신뢰도 카드를 만들지 않는다. 시작된 프로그램에서는 카드가 표시되고, 일시정지 상태에서도 안내와 함께 카드를 유지한다. 운영진 회원 상세는 관리 경로와 `reviewQueue` 범위의 화면 권한을 확인한 뒤 상세 자료와 대상 회원의 카드를 표시한다.

점수 계산은 가입 승인·출금 가능액·정산 이행 판정 자체가 아니다. [계좌 이력과 정산 신뢰도](../07_meeting_settlement/F07-10_account-history-reputation_prd.md)와 이름을 혼용하지 않는다. 이 문서는 클럽의 `/reputation` API와 그 카드만 다룬다.

## 조회 계약과 공개 범위

| 요청 | 조건과 반환 |
| --- | --- |
| `GET /api/v1/clubs/{clubId}/reputation/me` | 요청자가 해당 클럽 회원이어야 한다. 본인 점수와 계산 항목을 반환한다. |
| `GET /api/v1/clubs/{clubId}/reputation/members/{memberId}` | 요청자와 대상 모두 현재 클럽 회원이어야 한다. 대상 `memberId`는 클럽 회원 행 ID가 아니라 사용자 ID다. 본인이거나 유효 운영진이면 계산 항목을 포함하고 다른 일반 회원에게는 숨긴다. |

유효 운영진 판정은 단순 역할 문자열 비교가 아니다. 정본 소유자 조건을 충족하는 클럽장 또는 권한 정지되지 않은 ADMIN이어야 한다. 회원 경로로 자기 ID를 명시해 조회해도 본인 계산 항목은 포함한다. 회원이 없으면 `CLUB_MEMBER_NOT_FOUND`로 거절한다. 신뢰도 컨트롤러에서 ACTIVE 클럽·마일리지 시작 여부를 추가로 요구하지는 않으므로 앱의 카드 노출 조건과 API 조회 조건을 구분한다.

응답은 `clubId`, `memberId`(사용자 ID), 정수 `score`, `level`, nullable `Map<String, Integer> breakdown`이다. 목록·페이지 응답이나 점수 변화 이력이 아니다. 앱은 정수와 nullable `Map<String, int>`로 받고, 대상 ID가 없으면 본인 API를, 있으면 회원 API를 사용한다.

## 점수 계산과 레벨

| 계산 항목 | 현재 계산 |
| --- | --- |
| `base` | 기본 50 |
| `mileage` | `qualifiedLifetimeEarned / 100`의 정수 몫, 최대 +40. 현재 사용 가능한 마일리지 잔액이 아니다. |
| `grade` | 현재 등급의 `displayOrder × 2`, 최대 +10 |
| `warning` | 경고 요약의 `effectiveScore × -3`, 최저 -30 |
| `severe` | 경고 요약이 존재하고 유효한 심각 제재 부여가 있으면 -20 |

마일리지 요약이 없으면 마일리지·등급 기여는 0이다. 현재 등급 ID가 있어도 등급 행을 찾지 못하면 등급 기여는 0이다. 경고 요약이 없으면 경고·심각 제재 기여는 0이며 심각 제재 조회도 그 분기에서는 호출하지 않는다. 심각 제재는 경고 원장에서 취소·만료 대상으로 표시된 부여를 제외하고, 남은 GRANT의 제재 카탈로그 심각도가 SEVERE인지 확인한다.

다섯 항목을 더한 뒤 최종 점수를 0~100으로 제한한다. LOW는 0~30(낮음), MEDIUM은 31~60(보통), HIGH는 61~85(높음), EXCELLENT는 86~100(최상)이다. 원천 자료가 모두 없으면 50·MEDIUM이다. 계산 항목은 최종 점수 제한 전 기여값이므로 각 값을 따로 점수 비율처럼 표시하지 않는다.

## 카드 행동과 실패와 갱신

카드는 점수 `/ 100`과 레벨 이름을 표시한다. 계산 항목이 null이 아니며 비어 있지 않을 때만 펼치기 버튼을 제공하고, 처음에는 접힌 상태다. 펼치면 기본·마일리지·등급·경고·심각 제재 다섯 행을 보여 준다. 숨겨진 계산 항목을 앱에서 추정해 복원하지 않는다.

레벨 표시는 현재 `StateTone`의 danger·warning·success·info를 테마 밝기에 맞춰 사용한다. 과거 문서의 고정 `AppColors` 대응표는 현재 구현이 아니다. 알 수 없는 서버 레벨은 임의의 보통 등급으로 바꾸지 않고 FormatException으로 처리한다.

점수 조회 중에는 로딩, 실패하면 오류 안내와 해당 점수 provider의 다시 시도를 제공한다. 갱신 중 이전 값 유지 정책을 사용한다. 내 마일리지의 당겨서 새로고침은 마일리지 메인 provider를, 운영진 상세의 재조회는 회원 상세 provider를 갱신한다. 점수 provider는 별도 조회이므로 활동 수정 직후나 부모 화면 재조회 뒤 점수까지 갱신되는지는 실제 상태 전환으로 확인해야 한다.

## 코드 위치

서버: `ReputationScoreController`, `ReputationScoreService`, `ReputationScoreMileageAdapter`, `ReputationScoreWarningAdapter`, `ClubMemberPermissionChecker`, `WarningMemberSummaryService`, `ReputationScoreVo`, `ReputationLevel`. 앱: `reputation_score_api.dart`, `reputation_score_repository.dart`, `reputation_providers.dart`, `reputation_score_vo.dart`, `reputation_level.dart`, `reputation_score_card.dart`, `mileage_main_screen.dart`, `mileage_member_detail_screen.dart`, `club_branch_routes.dart`, `club_admin_routes.dart`.

<!-- source-references:start -->
서버 창구: `ReputationScoreController#getMyReputation`, `ReputationScoreController#getMemberReputation`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 근거 | 내용 | 다음 확인 |
| --- | --- | --- | --- |
| 미검증 | 별도 점수 provider와 부모 화면 재조회 | 마일리지·경고 정정 후 같은 카드의 최신 점수 반영을 이번에 실행하지 않았다. | 원천 값 변경→재조회→점수 반영의 실제 전환 확인. |
| 미검증 | 소스와 선택 단언 확인 | 운영진 권한 상실·대상 탈퇴·계산 항목 토글의 실제 화면 흐름을 이번에 실행하지 않았다. | 필요 시 실제 경로에서 확인하고 소스 확인과 별도 기록. |

현재 응답에는 점수 변화 이력·시간축이 없다. 이를 필수 미구현 결함으로 단정하거나 이력 API가 있는 것처럼 안내하지 않는다. 별도 이력 제공은 제품 결정이 필요한 확장 후보다.

## 수용 기준과 검증 근거

- **AC-01 실제 입구:** 내 마일리지와 운영진 회원 마일리지 상세에서 카드를 사용하며 시작 전 마일리지 화면에는 노출하지 않는다.
- **AC-02 조회 대상:** 요청자·대상 회원 존재와 사용자 ID 의미를 지키고 탈퇴한 대상에게 기본 점수를 만들어 반환하지 않는다.
- **AC-03 본인 공개:** 본인 API와 본인 ID를 지정한 회원 API 모두 계산 항목을 포함한다.
- **AC-04 타인 공개:** 타인 계산 항목은 유효 운영진만 읽고 다른 현재 회원에게는 null을 반환한다.
- **AC-05 기본값과 누락:** 요약이 없으면 기본 50이며 등급 행이 없어도 해당 기여를 0으로 계산한다.
- **AC-06 계산 경계:** 인정 누적 마일리지·등급 순서·경고 점수·유효 심각 제재를 사용하고 항목별 한도와 최종 0~100 제한을 적용한다.
- **AC-07 레벨 계약:** 30/31·60/61·85/86 경계를 구별하고 앱은 모르는 레벨을 정상 등급으로 대체하지 않는다.
- **AC-08 카드 공개:** 계산 항목이 없으면 토글을 숨기고 있으면 접기·펼치기로 다섯 항목을 표시한다.
- **AC-09 실패 재시도:** 조회 실패는 오류와 개별 점수 재시도로 처리하며 제공되지 않은 이력을 있다고 표시하지 않는다.
- **AC-10 검증 범위:** 소스·기존 시험 단언·새 실행 결과를 구분하고 현재 코드만으로 프로덕션 사용 가능을 선언하지 않는다.

`ReputationScoreServiceTest`의 기본 50·마일리지 상한·계산 항목 숨김·등급 누락 단언과 앱 `reputation_level_server_values_test.dart`의 서버 레벨 대응·미지 값 오류 단언을 읽었다. 이번에는 제품 시험을 새로 실행하지 않았다.
