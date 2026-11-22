# F16-02. 등급·배지·랭킹·프로필 카드 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 서버와 앱 소스의 현재 계약을 대조했다. 새 제품 실행·실기기 확인 기록은 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 실제 입구

등급 정의, 받은 배지/배지 안내, 등급 변화, 랭킹은 각각의 화면이 있다. 메인의 등급 카드는 본인 등급 변화로, 랭킹 바로가기는 랭킹으로 이동한다. 등급 목록은 threshold 오름차순이고 본인 배지는 메인 응답의 활성 부여 목록, 배지 안내는 활성 정의 조회를 사용한다.

프로필 카드 조회 API와 provider는 존재하지만 현재 lib의 provider 사용 검색에서는 화면 소비자가 확인되지 않았다. 랭킹 행도 현재 Container/Row 표시이며 프로필 카드 이동 동작이 없다. API 구현을 근거로 ‘다른 회원 카드 열기까지 앱에서 연결 완료’라고 설명하지 않는다.

## 현재 서버 계약

모든 요청은 클럽 회원을 확인한다.

| 요청 | 응답과 의미 |
|---|---|
| GET /api/v1/clubs/{clubId}/mileage/grades | `List<MileageGradeVo>`, 등급 기준 목록 |
| GET /api/v1/clubs/{clubId}/mileage/badges | `List<MileageBadgeDefinitionVo>`, 활성 정의만 반환 |
| GET /api/v1/clubs/{clubId}/mileage/me/grade-history | `List<MileageGradeChangeVo>`, 기본 limit 50, 저장소에서 1~200 범위로 제한 |
| GET /api/v1/clubs/{clubId}/mileage/ranking | `Page<MileageRankingEntryVo>`, 명시한 basis 또는 미지정 시 정책 기준 |
| GET /api/v1/clubs/{clubId}/mileage/members/{memberId}/profile-card | `MemberProfileCardVo`, 대상 회원 확인과 양방향 차단 검사 후 공개 필드 조합 |

프로필 카드는 현재 등급과 활성 배지, 표시 이름·사진을 구성한다. 타인을 조회할 때 양방향 커뮤니티 차단이면 FORBIDDEN이다. 정책이 LIFETIME_EARNED면 등급 산정 누적을, SEASON_EARNED이고 ACTIVE 시즌 집계가 준비됐으면 시즌 적립을 공개한다. 나머지는 해당 점수를 null로 가린다. 배지 운영자 정보도 가린다. 이 null은 정책에 따른 정보 경계이며 그 자체를 파싱 결함으로 분류하지 않는다.

## 랭킹의 대상·순위·앱 기본값

| 기준 | 현재 점수 |
|---|---|
| BALANCE | currentBalance |
| LIFETIME_EARNED | qualifiedLifetimeEarned |
| SEASON_EARNED | currentSeasonEarned. ACTIVE 시즌이 없거나 집계 준비 전이면 각각 오류 |

서버는 basis 미지정 시 정책 기준을 사용하지만 **앱의 초기 선택은 BALANCE이며 이를 명시해 요청**한다. 정책이 시즌 기준이라고 앱이 처음부터 시즌 랭킹을 보여 주는 것은 아니다.

요약 행과 클럽 회원 행을 조인하며 요약이 없는 회원을 별도 0점 행으로 추가하지 않는다. 현재 랭킹 쿼리에는 회원 상태/양방향 차단 제외 조건이 없다. 점수 내림차순, memberId 오름차순으로 정렬하며 rank는 offset + 행 순서 + 1이다. 동점자가 공동 순위를 갖는 방식이 아니다. 응답의 currentBalance도 basis와 별개로 포함된다.

앱은 20건씩 읽고 주요 랭킹과 전체 목록이 같은 데이터를 공유한다. 주요 랭킹은 읽은 항목 중 상위 10개와 본인이 이미 포함된 경우 주변 ±3개를 사용한다. 별도 본인 순위 조회로 아직 읽지 않은 본인 위치를 찾아 주지는 않는다. 전체 목록은 추가 조회와 실패 재시도를 제공한다.

## 등급 변화와 배지의 표시 경계

등급 이력은 별도 역사 테이블 대신 감사 로그의 MILEAGE_MEMBER_GRADE_CHANGED, MEMBER 대상, 본인 targetId를 조회한다. 생성 시각/id 역순이며 before/after JSON에서 등급과 방향을 복원한다. JSON이 잘못되면 관련 필드가 비어 있을 수 있고 방향의 기본값 처리도 있어 원본 감사 계약의 영향을 받는다.

앱은 기본 조회된 목록을 타임라인으로 표시하며 이전 50건을 넘겨 계속 읽는 페이지 UI는 없다. 운영용 타임라인은 reviewQueue 권한을 재확인한다. 본인/운영 화면 모두 오류 재시도·새로고침을 제공한다. 배지 정의의 활성 여부와 이미 받은 활성 배지 부여 목록은 서로 다른 조건이다.

## 코드 위치

서버: MileageMemberController, MileageQueryService#buildProfileCard/searchRanking/findGradeChanges, MileageRankingQueryRepository, MileageAuditLogQueryRepository. 앱: mileage_member_api.dart, mileage_member_providers.dart, mileage_grade_list_screen.dart, mileage_badge_list_screen.dart, mileage_ranking_screen.dart, mileage_grade_history_screen.dart, club_branch_routes.dart.

<!-- source-references:start -->
서버 창구: `MileageMemberController#getGrades`, `MileageMemberController#getBadgeDefinitions`, `MileageMemberController#getMyGradeHistory`, `MileageMemberController#getRanking`, `MileageMemberController#getMemberProfileCard`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 앱 초기 BALANCE는 서버 정책 기본값을 사용하지 않는다. | 정책 기준 자동 시작을 수용 완료로 표시하지 않는다. |
| Risk | 랭킹 쿼리에 회원 상태/차단 제외가 없고 currentBalance도 반환한다. | 프로필 카드의 차단·점수 가림과 같은 정책으로 보장하지 않는다. |
| Gap | 주요 랭킹의 내 주변은 로드된 항목 안에서만 계산한다. | 아직 조회하지 않은 본인 순위를 찾는 기능과 구분한다. |
| Gap | 프로필 카드 API/provider의 실제 화면 소비자가 확인되지 않는다. | 연결된 회원 카드 화면으로 설명하지 않는다. |
| Risk | 등급 이력은 감사 JSON과 조회 상한의 영향을 받는다. | 전체 기간의 완전한 이력 보장을 하지 않는다. |
| 미검증 | 실제 순위·차단 데이터·서버 오류·페이지·복귀를 실행하지 않았다. | 문서 대조와 제품 실행을 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 정의와 부여:** 정렬된 등급 정의, 활성 배지 정의, 본인의 활성 부여 목록을 구분한다.
- **AC-02 이력 원천:** 감사 로그의 대상·유형·역순·상한과 JSON 파싱 경계를 명시한다.
- **AC-03 초기 기준:** 서버 미지정 정책 기준과 앱의 명시적 BALANCE를 구분한다.
- **AC-04 순위 계산:** 기준별 점수·시즌 준비 조건·동점 정렬과 개별 순번을 설명한다.
- **AC-05 페이지와 내 주변:** 20건 추가 조회와 로드된 데이터에 한정한 내 주변 표시를 구분한다.
- **AC-06 카드 공개:** 회원·양방향 차단 검사와 정책별 nullable 점수, 배지 운영자 가림을 설명한다.
- **AC-07 실제 입구:** 등급/배지/랭킹 화면과 아직 소비자가 확인되지 않은 카드 API를 구분한다.
- **AC-08 실패와 갱신:** 초기/추가 실패와 오류 재시도·타임라인 갱신을 소스로 확인한다.

위 항목은 현재 소스 계약과 후속 실행 기준이다. 이번 작업은 새 제품 시험·시각 검수의 통과 기록을 추가하지 않는다.
