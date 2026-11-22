# F16-03. 시즌 조회·순위 확정·재시도 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 현재 소스 계약을 대조했다. 새 제품 실행·외부 인증·실기기 확인 기록은 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 진입

회원은 마일리지 메인의 시즌 입구에서 진행·마감 중·종료 시즌을 본다. 시즌 공개 범위가 닫혀 있으면 안내 화면으로 연결된다. 회원 목록은 서버 전체 목록을 받은 뒤 ACTIVE/CLOSING/CLOSED만 표시하고 SCHEDULED는 숨긴다. 진행 중, 마감 중, 종료 순서와 종료 시각 역순으로 정렬한다. CLOSED 항목만 과거 순위 화면을 연다.

시즌 생성·수정·마감은 정책 운영 화면에서 수행한다. 상태는 **SCHEDULED → ACTIVE → CLOSING → CLOSED**이며 ACTIVE라도 projectionReady=false면 아직 회원별 시즌 집계를 준비하는 중이다. 예전 문서의 ‘상태만 마감하고 스냅샷 생성은 호출자 책임’ 설명은 현재 전이 runner/worker와 다르다.

## 현재 서버 계약

공통 접두사는 `/api/v1/clubs/{clubId}/mileage/seasons`다. MILEAGE_SEASON 공개 범위를 적용한다. 조회는 클럽 회원 확인, 재시도는 POLICY_OWNER 권한을 적용한다.

| 요청 | 현재 응답·조건 |
|---|---|
| GET / | `List<MileageSeasonVo>`, 선택적 status 필터. 필터가 없으면 시작일 역순 |
| GET /{seasonId}/ranking | `Page<MileageSeasonSnapshotVo>`, 해당 클럽의 CLOSED 시즌만 조회 |
| GET /{seasonId}/me | CLOSED 시즌의 본인 스냅샷, 없으면 204 |
| POST /{seasonId}/close-retry | `MileageSeasonVo`, 마감 또는 집계 준비를 이어 시도 |

과거 시즌 순위의 basis는 **미지정 또는 SEASON_EARNED만 허용**한다. BALANCE/LIFETIME_EARNED는 MILEAGE_SEASON_RANKING_BASIS_NOT_ALLOWED로 거절한다. 앱은 현재 basis를 전송하지 않는다. 과거 BY_EARNED/BY_BALANCE 불일치나 잔액 기준 전환을 현재 앱 결함으로 설명하지 않는다.

## 마감 대상과 순위 확정

운영 마감은 ACTIVE, projectionReady=true, 종료 시각 경과를 요구한다. CLOSING이면 진행 중 오류, 종료 전이면 MILEAGE_SEASON_NOT_ENDED다. 시즌 시간 판정은 Asia/Seoul을 사용한다.

마감 runner는 요약 행의 회원과 클럽 회원 ID의 합집합을 대상으로 회원별 별도 트랜잭션에서 스냅샷을 만든다. 해당 시즌 요약이 없는 회원은 0점 기록을 만들 수 있다. 이미 만든 기록은 다시 만들지 않는다. 실패한 회원은 기록하고 계속 진행하며, 마지막에 모든 대상의 스냅샷 존재를 검사한다.

완료 검사에서 seasonEarned 내림차순·memberId 오름차순으로 정렬한다. 양수 적립만 순위에 포함하고 동점은 같은 순위, 다음 순위는 건너뛰는 방식이다(예: 1, 1, 3). 0 이하 적립의 rankByEarned와 모든 rankByBalance는 null이다. 필요한 기록과 순위가 준비된 뒤에만 CLOSED·closedAt을 저장한다. HTTP 성공 응답이 반드시 CLOSED 완료를 뜻하지는 않는다.

## 다음 시즌과 복구

다음 시즌은 시작 시각이 됐고 다른 ACTIVE/CLOSING이 없으며 직전 경계에 맞닿은 시즌이 CLOSED인 경우 활성화할 수 있다. 무조건 목록의 다음 항목을 즉시 시작하지 않는다. 새 활성화는 세대를 증가시키고 projectionReady=false로 시작한다. 회원별 delta를 재집계하고 준비할 회원이 남지 않았을 때 true가 된다.

재시도는 CLOSING의 남은 마감, 또는 ACTIVE이면서 준비가 끝나지 않은 시즌의 집계를 이어 간다. SCHEDULED는 거절한다. 이미 준비됐거나 CLOSED인 시즌에 대한 재시도는 현재 상태를 반환할 수 있다. 자동 tick도 공개 범위를 확인하고 준비·기한 경과 마감·미완료 마감·다음 활성화를 이어 간다. 미완료는 무결성 사건으로 기록하며 완료 상태로 덮지 않는다.

## 회원 결과와 앱 제한

공개 순위는 양수 적립과 확정 순위가 있는 스냅샷만 반환하고 rankByEarned/memberId 순서로 페이지를 나눈다. 본인 조회는 순위 밖의 0점 스냅샷도 받을 수 있다. lateEarned는 별도 delta 조회로 보강하며 고정된 스냅샷 순위와 분리한다.

앱은 순위 **첫 20건**과 별도 본인 기록을 조회한다. 순위 화면에 추가 페이지 입구는 없으므로 전체 순위 탐색으로 설명하지 않는다. 본인 기록이 없으면 카드를 숨기고 조회 실패면 독립 재시도를 제공한다. 목록/순위 새로고침과 준비·마감 상태의 오류 안내를 제공한다.

운영 목록은 ACTIVE 미준비에 ‘준비 다시 시도’, CLOSING에 ‘마감 다시 시도’를 보여 준다. 응답이 CLOSED인지 준비 완료인지 아직 처리 중인지에 따라 안내를 나눈다. 일반 마감 입구는 준비된 ACTIVE이면 종료 전에도 나타날 수 있으며 서버가 종료 시각을 최종 검사한다. 재시도 후 시즌·본인 기록·메인·시즌 순위 관련 조회를 무효화한다.

## 코드 위치

서버: MileageSeasonController, MileageSeasonService, MileageSeasonRankingSearchParam, MileageSeasonTransitionRunner/Worker, MileageSeasonMemberWorker, MileageSeasonSnapshotQueryRepository. 앱: mileage_season_api.dart, mileage_season_providers.dart, mileage_seasons_screen.dart, mileage_season_ranking_screen.dart, mileage_season_crud_screen.dart. 생성·수정의 정책 계약은 [적립 규칙·등급·배지·차감 사유·시즌 관리](F16-05_policy-presets_prd.md)를 따른다.

<!-- source-references:start -->
서버 창구: `MileageSeasonController#listSeasons`, `MileageSeasonController#getSeasonRanking`, `MileageSeasonController#getMySeasonSnapshot`, `MileageSeasonController#retryClose`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 앱 과거 순위는 첫 20건만 표시한다. | 서버 페이지 지원과 앱 전체 탐색을 구분한다. |
| Risk | 일부 회원 처리 실패 시 ACTIVE 미준비 또는 CLOSING이 남을 수 있다. | 요청 성공·작업 진행·확정 완료를 나눈다. |
| Gap | 마감 단추 표시와 종료 시각 검사는 분리돼 있다. | 종료 전 선택은 서버 오류가 날 수 있음을 남긴다. |
| 미검증 | 대규모 회원 마감·장애 재시도·실제 순위·앱 복귀를 실행하지 않았다. | 현재 구현 경로 대조이며 실행 통과 기록이 아니다. |

## 수용 기준과 검증 근거

- **AC-01 실제 목록:** 회원 화면의 진행/마감 중/종료 표시와 예약 시즌 숨김을 구분한다.
- **AC-02 순위 조회 조건:** CLOSED와 현재 클럽을 확인하고 과거 순위는 적립 기준만 허용한다.
- **AC-03 본인 결과:** 별도 본인 스냅샷과 204, 순위 밖 0점 기록을 구분한다.
- **AC-04 마감 단계:** 준비 완료·종료 시각 확인 후 CLOSING에서 회원별 스냅샷을 생성한다.
- **AC-05 순위 확정:** 모든 대상 확인과 동점 순위/양수 조건을 마친 뒤 CLOSED로 전환한다.
- **AC-06 준비와 다음 시즌:** 활성화 조건·세대·재집계 완료를 확인하고 무조건 즉시 전환으로 설명하지 않는다.
- **AC-07 복구 결과:** 마감/준비 재시도와 아직 처리 중인 응답을 완료와 구분한다.
- **AC-08 화면 범위:** 첫 20건·본인 기록·오류 재시도·새로고침을 실제 제공 범위로 기록한다.

소스 계약 및 후속 실행 기준이다. 이번 작업에서 제품 시험·실기기·시각 검수를 새로 실행하지 않았다.
