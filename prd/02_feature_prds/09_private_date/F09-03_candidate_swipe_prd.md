# F09-03. 후보 탐색과 좋아요·넘김 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 시험·운영·실기기 검수 통과 기록이 아니다.

## 입구와 API

/dating과 /dating/candidates는 같은 후보 카드 화면이며 DATING 공개 범위를 따른다. GET /api/v1/date/profile/candidates는 페이지가 아닌 List<DateCandidateVo>를 최대 20개 반환한다. POST /api/v1/date/matches/action은 targetUserId·action을 받아 matchId·isMatched·선택 chatRoomId를 반환한다. 현재 화면 선택은 LIKE·PASS 버튼이며 끌어 넘기는 제스처 구현으로 설명하지 않는다.

본인 프로필 없음 오류는 인증 상태 확인 입구로 안내한다. 다른 프로필 조회 오류는 오류/재시도로 표시한다. 후보 읽기 오류도 별도로 재시도하며 조회가 정상인데 빈 경우는 추천 상대 없음 안내다. 후보 응답을 받은 뒤 표시하지 않은 카드까지 실제 열람한 것으로 보장하지 않는다.

## 후보 조건과 공개 필드

조회자는 현재 유효한 인증과 본인 프로필이 있어야 한다. 후보 쿼리는 본인을 제외하고 isActive=true·PUBLIC·유효 인증·양쪽의 선호 성별 일치를 검사한다. 서비스에서 양방향 데이트 차단, 조회자 선호 나이, 조회자 관점의 결격 필터를 추가한다. 선호 나이는 현재 연도에서 출생연도를 뺀 값이며 프로필 생성의 실제 생일 기준 만 20세 검사와 다르다.

이미 내가 LIKE/PASS 등 PENDING 아닌 행동을 했거나 상대가 나를 PASS한 매치가 있으면 제외한다. 상대가 먼저 LIKE하고 나는 PENDING이면 후보에 남을 수 있다. 이 제외 조건은 매치의 상태나 만료 여부를 보지 않으므로 만료·차단 해제가 곧 후보 재노출을 보장하지 않는다.

excludeSmoker는 SMOKER, excludeHeavyDrinker는 OFTEN, excludeCasualPurpose는 CASUAL을 제외한다. sameReligionOnly는 양쪽 종교가 모두 있고 서로 다를 때 제외한다. 후보 값이 없으면 이 필터를 통과하며 상대방의 결격 선호를 대칭으로 적용하지 않는다.

응답의 출생연도·성별·소개·키·직업·지역은 후보의 개별 disclose 설정에 따라 null일 수 있다. 사진은 삭제되지 않은 APPROVED 사진만 포함하고 표시용 서명 URL을 사용한다. 현재 후보 조회에 조회자 활성 여부, 계정 상태, DATE_PROFILE_BLOCK을 직접 검사하는 추가 경로는 없다. 프로필 생성·활성화의 제재 가드가 이 조회에서도 그대로 실행된다고 쓰지 않는다.

## 점수와 노출 계수

기본 가중치는 지역 0.25, 양쪽 나이 선호 0.20, 후보 활동성 0.10이며 양쪽 모두 communityDataOptIn=true일 때 관심 태그 0.30과 신뢰점수 유사도 0.15를 더한다. 사용한 성분의 가중치 합으로 다시 나누므로 미동의 자체를 별도의 감점으로 처리하지 않는다.

그 뒤 생성 30일 이내 프로필에 최대 +0.15, 최근 24시간 노출 10회를 넘긴 프로필에 최대 -0.10을 적용하고 100을 곱한다. 최종값을 0~100으로 자르는 코드는 없다. 점수 내림차순 뒤 회원 ID 내림차순으로 최대 20개를 고른다.

노출 계수는 반환 목록을 만들 때 Redis에 기록하며 실제 화면에서 카드를 본 시각과 다르다. 조회/기록 실패는 로그를 남기고 감점을 생략하거나 기록 없이 진행한다. 점수 계산은 현재 연도 나이·프로필 활동 시각 등을 사용하며 성격 검사 추정값 전체를 가져오는 계약이 아니다.

## 선택 명령과 재검사 범위

선택은 계정 번호 순서의 공유 잠금, 본인 인증 공유 읽기, 사용자 쌍 잠금, 양방향 차단의 잠긴 조회, 매치 행 잠금을 거친다. 자기 자신은 거절한다. LIKE는 상대의 현재 인증과 양쪽 계정의 닫힘 상태도 검사한다. PASS는 LIKE와 같은 상대 인증 조건을 요구하지 않는다.

기존 매치가 없을 때만 상대 프로필 활성·PUBLIC을 검사한다. 직접 선택 API는 후보 목록의 나이·결격·점수 조건과 본인 프로필 존재/활성 조건을 모두 다시 적용하지 않는다. 이미 MATCHED이면 거절하지만 EXPIRED·REJECTED·BLOCKED 상태나 expiresAt을 명시적으로 일괄 거절하는 분기는 없다. 현재 차단이 풀려 있어도 기존 행동값과 상태가 이후 결과에 영향을 줄 수 있다.

앱은 LIKE/PASS만 보내지만 서버 enum 변환에는 PENDING도 존재하며 요청 DTO와 이 메서드에 LIKE/PASS만 허용하는 별도 검증은 없다. 이 차이를 UI 선택 범위와 서버 명령 범위의 현재 제한으로 남긴다.

## 매칭 결과와 만료 작업

처음 선택하면 PENDING 매치와 생성 시점부터 7일의 expiresAt을 저장한다. 기존 행은 해당 사용자의 행동을 바꾸며 expiresAt을 새로 연장하지 않는다. 양쪽 LIKE면 MATCHED와 matchedAt, ACTIVE 채팅방을 같은 흐름에서 저장한다. 양쪽 PASS면 REJECTED다. 선택 저장 뒤 방문 기록을 같은 거래에서 남긴다.

매 정시 만료 작업은 기한이 지난 PENDING을 찾아 행 잠금 뒤 여전히 PENDING인지 확인하고 EXPIRED 및 양쪽 알림 outbox를 기록한다. DATING이 닫혀 있으면 이 작업을 건너뛴다. 기한이 지났다는 사실과 스케줄러 반영 완료, 알림 발행과 실제 수신을 구분한다.

30일 무활동 방 정리는 별도로 매일 03:00 스케줄에서 수행한다. 매칭 갱신·메시지·만남의 갱신 및 제안/확정된 만남 예정 시각을 활동 판단에 쓰고, 매치와 방을 잠근 뒤 다시 확인한다. 실제 변경은 방의 INACTIVE와 closedAt이며 매치 자체를 EXPIRED로 바꾸는 작업이 아니다. 이 작업도 DATING 닫힘에서는 건너뛴다.

## 앱의 선택·차단·사진 신고

선택 요청 중 두 버튼을 함께 잠그고 응답이 성공한 후보를 목록에서 뺀다. 실패는 일반 오류를 알리고 카드를 유지한다. 매칭 성공 창에서 계속 보기 또는 chatRoomId가 있는 채팅 시작을 선택할 수 있다. 이 입구는 방 번호를 포함하지만 현재 matchId는 넘기지 않으며 채팅 화면의 방 목록 해석에 의존한다.

후보 메뉴에는 차단과 대표 사진 신고가 연결돼 있다. 사진 신고는 대표 또는 첫 사진의 사진 ID를 사용하고 복귀 후 후보를 다시 읽는다. 차단 성공 시 관련 목록을 갱신하고 현재 후보를 뺀다. 차단 사유·안전 신고·실패 입력 유지는 [데이트 차단과 안전 신고](F09-07_block_prd.md)를 따른다.

이미 데이트에서 차단한 상대라는 일반 CONFLICT도 차단된 상태로 처리해 현재 후보를 넘긴다. 안전 신고 중복 REPORT_ALREADY_EXISTS는 별도 실패이며 사유 시트를 유지하고 후보를 빼지 않는다.

## 코드 위치

서버: DateProfileController#getCandidates, DateMatchController#performAction, DateMatchingService, DateProfileQueryRepository, MatchScoringService, MatchActionParam, MatchAction, DateBlockGuard, DateMatchQueryRepository, DateMatchExpirationScheduler, DateMatchExpirationWorker. 앱: date_profile_provider.dart, date_match_api.dart, date_match_provider.dart, candidate_card_screen.dart, dating_routes.dart.

<!-- source-references:start -->
서버 창구: `DateProfileController#getCandidates`, `DateMatchController#performAction`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 후보 조회와 직접 선택이 같은 자격 검사를 공유하지 않고 전역 프로필 제재를 직접 검사하지 않는다. | 생성/활성화 가드로 전체 노출·선택이 차단됐다고 단정하지 않는다. |
| Gap | 선택 API의 PENDING 입력·기존 종료 상태·만료 시각 검증이 UI 정책보다 넓다. | LIKE/PASS만 있는 화면과 서버 범위를 구분한다. |
| Risk | 응답 생성의 노출 기록·100 초과 가능한 점수·스케줄 반영 시차가 있다. | 실제 열람·백분율·즉시 만료로 오해하지 않게 한다. |
| 미검증 | 실제 동시 선택/차단·Redis 실패·만료 작업·기기 채팅 이동은 실행하지 않았다. | 현재 소스 구조를 제품 시험 통과로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 후보 필터:** 공개·활성·인증·양쪽 성별과 조회자 나이/결격·차단·기존 행동 제외를 구분한다.
- **AC-02 개인정보:** disclose별 nullable 필드와 승인 사진만 응답한다.
- **AC-03 점수 의미:** 옵트인 성분 재정규화·가감점·동점 역순·응답 시점 노출 계수를 설명한다.
- **AC-04 선택 범위:** 잠금과 LIKE/PASS의 다른 인증 조건, 직접 API의 검증 한계를 명시한다.
- **AC-05 상태 전이:** PENDING/양쪽 LIKE/양쪽 PASS와 기존 expiresAt 유지, 방문 기록을 구분한다.
- **AC-06 예약 작업:** 7일 대기 만료와 30일 무활동 방 INACTIVE, 공개 범위에 따른 중단을 구분한다.
- **AC-07 앱 복구:** 중복 버튼 잠금·실패 카드 유지·방 번호 채팅 이동·차단/사진 신고 후 갱신을 반영한다.
