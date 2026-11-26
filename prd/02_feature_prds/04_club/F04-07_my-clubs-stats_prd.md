# F04-07. 내 클럽 목록과 회원 활동 통계 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다. 2026-11-22 서버·앱 소스와 선택한 기존 시험 단언을 대조했고, 2026-11-26 회원 통계의 신규·달별 증감·역할별 수를 서버 main `b66a954f8`·앱 main `da2a26394` 의 소스와 다시 대조했다. 새 앱·이미지·실데이터 성능 시험 결과가 아니다.

## 결론

내 클럽은 현재 사용자의 회원 행과 연결된 클럽을 페이지로 읽는다. 기본 조회는 ACTIVE 클럽이며, 앱의 운영 중/가입한 구분은 소유자 번호를 기준으로 한다. ADMIN도 본인 소유가 아니면 가입한 클럽에 나타날 수 있다.

회원 통계는 현재 유효한 운영진용이다. 서버는 전체 회원의 체크인 수로 순서를 정하고 페이지를 반환하지만, 현재 앱은 첫 20명만 읽어 그중 상위 5명을 표시한다. 월간 활동은 달력상 이번 달이 아니라 현재부터 한 달 전 이후의 체크인 여부이며 활동 멤버 비율은 이벤트 참석률과 다르다. 응답은 이번 달 신규·역할별 수·최근 12개월의 달별 가입·나감·순증감도 클럽 전체로 싣고, 앱은 이를 개요 카드·멤버 수 변화 도표·역할별 멤버 수로 보인다. 달별 셈은 사람 번호 없이 클럽·달별 수만 쌓으며 나간 수는 셈을 연 달부터다.

## 코드 위치

서버: ClubController#getMyClubs·getMemberStats, ClubService#getMyClubs·applyMembershipContext, ClubQueryRepository#findMyClubs, ClubMemberStatsService, ClubMemberStatsEventAdapter·ClubMemberStatsCheckInAdapter/Port, EventRepository·EventCheckInRepository·EventCheckIn, ClubDonationRepository·ClubDonation, ClubActivityStatsVo·MemberActivityVo·ClubMemberMonthlyChangeVo·ClubMemberRoleCountsVo, ClubMemberMonthlyCountQueryRepository·ClubMemberEnroller·ClubMemberRemover·ClubMemberMonthlyCountBackfillService, ClubAbilityPolicy·ClubMemberPermissionChecker.

앱: my_clubs_screen.dart·my_club_card.dart·my_clubs_provider.dart·club_api.dart·club_repository.dart, club_member_stats_screen.dart·club_stats_provider.dart·club_stats_api.dart·club_member_repository.dart·club_member_stats.dart·member_trend.dart, member_stats_overview.dart·member_trend_chart.dart·role_distribution_chart.dart·member_top_list.dart. 입구는 app_menu.dart·gathering_tab_sections.dart·member_tools_routes.dart·club_management_screen.dart·club_branch_routes.dart다.

<!-- source-references:start -->
서버 창구: `ClubController#getMyClubs`, `ClubController#getMemberStats`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 내 클럽 입구와 조회 조건

현재 모임 탭과 메뉴의 내 클럽은 /my/clubs로 연결한다. 카드에서 /clubs/{id} 상세로 이동하고, 빈 상태의 클럽 둘러보기는 /clubs로 이동한다. 이전 마이페이지 중심 설명만을 유일한 입구로 쓰지 않는다.

GET /api/v1/clubs/my는 인증 principal과 ClubSearchParam을 받고 Page<ClubSimpleVo>를 반환한다. 현재 사용자의 클럽 회원 행으로 연결하고 status 미지정 시 ACTIVE, category와 이름/설명 keyword 조건을 적용할 수 있다. 회원 가입 시각·회원 행 번호 내림차순이며 현재 역할·회원 상태와 표시용 썸네일 URL을 보완한다.

현재 앱 API는 page/size를 전달하고 상태·카테고리·검색 입력은 제공하지 않는다. 따라서 앱의 내 클럽을 운영 중지·폐쇄까지 포함한 모든 과거 소속 이력이라고 설명하지 않는다. 가입 대기만 있는 클럽도 현재 회원 목록에 자동 포함되지 않는다.

## 내 클럽 표시와 페이지 복구

앱은 20개씩 읽고 ownerId가 현재 사용자이면 운영 중인 클럽, 아니면 가입한 클럽으로 나눈다. 카드의 역할 배지는 myRole을 사용하고 값이 없을 때 소유자 여부로 OWNER/MEMBER를 보완한다. 구역 분류와 역할 배지는 서로 다른 판단이다.

카드는 썸네일·이름·역할·회원 수와 상세 이동을 제공한다. 현재 MyClubCard에는 다음 이벤트 날짜가 없다. 다음 이벤트 미리보기를 완료된 카드 기능으로 문서에 남기지 않는다.

페이지가 더 있으면 구역 제목에 현재 받은 수를 총수처럼 붙이지 않고, 끝까지 읽으면 구역별 개수를 표시한다. 첫 실패는 본문 재시도, 추가 조회의 통신 오류는 기존 목록과 재시도 줄을 유지하며 같은 다음 페이지를 다시 요청한다. 자료가 있는 목록은 당겨 새로고침을 지원한다. 계정/사람·클럽 카드 변경 신호를 구독해 목록을 다시 읽는다.

## 통계 입구·권한·응답

모임 관리의 회원·가입 구역에서 회원 통계를 누르면 /clubs/{clubId}/members/stats로 이동한다. viewMemberStats와 운영 권한 라우트 검사가 적용된다. 예전 /clubs/{id}/stats 경로나 회원 목록 안 통계 탭을 현재 입구로 설명하지 않는다.

GET /api/v1/clubs/{id}/members/stats는 PagingParam을 받고 **ClubActivityStatsVo 단건**을 반환한다. 전체 응답 자체가 Page인 것은 아니며 그 안의 memberStats가 Page<MemberActivityVo>다. 현재 소유자/실효 운영진 권한을 서버에서 검사하므로 역할 제한된 ADMIN을 정상 권한으로 간주하지 않는다.

| 필드 | 의미 |
| --- | --- |
| totalMembers | 현재 클럽 회원 행 전체 수 |
| monthlyActiveMembers | 현재 회원 중 최근 한 달 경계보다 뒤에 체크인이 하나라도 있는 사람 수 |
| newMembersThisMonth | 달별 셈의 이번 달 가입 수. 이번 달에 들어왔다 나간 사람·다시 들어온 사람도 센다 |
| roleCounts | 현재 회원 행의 owner·admin·member 수 |
| monthlyChanges | 최근 12개월(이번 달 포함, 오래된 달부터)의 month(yyyy-MM)·joined·left·net(joined−left). 셈이 없는 달은 0 |
| memberStats.content | 정렬 후 요청한 페이지의 회원 활동 행 |
| userId·nickname·joinedAt | 현재 회원 식별·이름·가입 시각 |
| attendedEvents | 해당 클럽 이벤트의 해당 사용자 체크인 행 수 |
| lastAttendedAt | 그 체크인 시각 중 최대값, 없으면 null |
| donationAmount | 해당 회원의 기부 행 amount 합계. 아래의 현재 집계 제한 참고 |

## 통계 집계 범위와 순서

서버는 현재 회원 전체와 클럽 이벤트 번호를 읽고 이벤트의 체크인을 현재 회원 번호 집합으로 제한한다. 등록·신청만 하고 체크인이 없는 사람을 참석자로 더하지 않는다. 탈퇴한 사람과 회원 번호 없는 외부 동행 체크인은 현재 회원 활동 집계 대상이 아니다.

전체 회원을 체크인 수 내림차순, 동률이면 가입 시각 오름차순·회원 행 번호 오름차순으로 정렬한 뒤 페이지를 자른다. 월간 활동 수와 전체 회원 수는 요청한 페이지와 상관없이 클럽 전체를 기준으로 한다. 월간 경계는 LocalDateTime.now().minusMonths(1)이며 정확히 경계와 같은 체크인은 isAfter 조건에 들지 않는다.

달별 가입·나감은 사람 번호 없이 클럽·그 달 1일·가입 수·나간 수만 쌓는 표에서 읽는다. 회원 행을 넣는 길(자유 가입·신청 승인·초대 수락·클럽 만들기)과 지우는 길(본인 탈퇴·계정 탈퇴·강퇴·제재 강퇴·관리자 강제 탈퇴·차단·클럽 폐쇄)이 같은 트랜잭션에서 센다. 역할 바꾸기·클럽장 넘기기는 세지 않는다. 지난 달 가입 수는 유지보수 기동의 채우기가 가입 종결 기록과 회원 가입일로 채우며 몇 번 돌아도 같다. 나간 수는 지난 기록이 없어 셈을 연 달부터 쌓인다. 역할별 수는 현재 회원 행에서 센다.

페이지에 들어간 회원의 닉네임·기부액을 보완하고, 참석 이력이 없으면 참석 수0·최근 참석일 null이다. 기부액은 현재 조회/합계 코드에서 상태 필터나 refundAmount 차감을 적용하지 않는다. 따라서 취소·반환을 뺀 순기부액 또는 현재 기금 잔액으로 해석하지 않는다.

## 앱이 제공하는 통계

현재 공급자는 page=0, size=20만 요청한다. 모델은 memberStats.content를 활동 List로 읽고 페이지 메타데이터를 보관하지 않는다. 화면에는 다음 페이지 버튼이나 setPage 동작이 없다. 서버의 페이지 계약과 앱의 전체 명단 탐색 기능을 구분한다.

개요 카드는 전체 멤버·활동 중인 멤버·이번 달 신규·활동 멤버 비율의 네 항목이다. 비율은 monthlyActiveMembers / totalMembers × 100을 반올림하고 전체가0이면0%다. 이벤트별 참석률이나 등록 대비 체크인 비율이 아니다. 이번 달 신규는 서버 값을 그대로 보이며, 그 칸이 없는 옛 서버 응답이면 0명으로 보이지 않고 카드를 그리지 않는다.

멤버 수 변화는 가입·나감·멤버 변화(순증감) 세 선의 도표다. 1개월·3개월·6개월·1년 가운데 처음은 3개월이고, 서버가 준 12개월을 가까운 달부터 잘라 그리므로 기간을 바꿔도 다시 읽지 않는다. 도표 아래에 「나간 멤버 수는 이 기능을 연 달부터 셉니다.」 를 보인다. 달 목록이 비면 변화 데이터 없음 상태다.

역할별 멤버 수는 클럽장·운영진·멤버 줄마다 전체에서 차지하는 비율 막대와 사람 수다. 원 도표가 아니며 roleCounts가 없는 옛 응답이면 구역을 그리지 않는다. 활동 TOP 5는 서버 순서의 첫5명을 사용하며 닉네임은 PersonLink, 참석 횟수를 함께 표시한다. 로딩·본문 오류 재시도·당겨 새로고침을 제공하고, 활동 목록이 비어 있으면 활동 데이터 없음 상태를 보여 준다.

## 조회 거절 뒤의 복구

추가 조회를 포함한 자료 접근 거절에서는 이전 목록과 선택·권한 값을 비우고 오류를 표시한다. 기존 목록 유지·재시도는 통신 오류일 때의 복구이며, 401은 세션 처리에 맡긴다.

## 현재 제한과 확인 범위

| 판정 | 항목 | 근거·사용자 영향 | 남은 확인 |
| --- | --- | --- | --- |
| Risk | 기본 목록 범위와 구역 이름 | ACTIVE 기본·소유자 기준 운영 구역이므로 모든 상태/ADMIN 운영 클럽 목록과 다름 | 사용자 안내와 과거 소속 조회 수요 구분 |
| Risk | 기부 지표의 순액 해석 | 상태/반환액을 빼지 않은 amount 합계 | 취소 기부의 지표 포함 정책 정렬. 현재 앱 TOP5에는 기부액을 표시하지 않음 |
| Risk | 통계의 데이터 규모 | 결과는 페이지여도 서버가 현재 회원·해당 이벤트 체크인을 먼저 모두 읽고 정렬 | 실제 규모에서 조회량·응답 시간 확인 |
| 제한 | 화면 범위와 갱신 | 첫20명 중TOP5와 클럽 전체의 요약·달별 증감·역할별 수를 제공. 통계 공급자는 계정 범위를 구독하며 회원 변경 신호의 자동 재조회는 별도 연결돼 있지 않음 | 전체 활동 명단/실시간 갱신이 필요하면 별도 범위 결정 |
| 제한 | 나간 수의 시작 | 나간 수는 셈을 연 달부터만 쌓이고, 지난 달 가입 수는 남은 가입 기록으로만 채운다. 폐쇄한 클럽·탈퇴를 마친 계정의 지난 가입 기록은 이미 지워져 채우지 못함 | 운영 반영 때 표 만들기와 가입 수 채우기 한 번 |
| 미검증 | 실제 앱·성능 | 소스와 기존 시험 단언만 대조 | 이미지·대량 데이터 실행 성공으로 간주하지 않음 |

## 수용 기준과 검증 근거

- **AC-01 실제 입구:** 모임 탭/메뉴의 내 클럽과 모임 관리의 회원 통계 경로를 구분한다.
- **AC-02 내 목록 조건:** 현재 회원 연결·기본ACTIVE·가입시각/번호 내림차순을 따른다.
- **AC-03 구역과 배지:** 소유자 기준 구역·myRole 배지·없을 때 보완값을 구분한다.
- **AC-04 목록 개수:** 20개 페이지의 중간 개수를 전체 수처럼 표시하지 않고 마지막 뒤 구역 수를 표시한다.
- **AC-05 목록 복구:** 추가 실패에 기존 카드·같은 페이지 재시도를 남기고 빈 목록은 클럽 탐색으로 연결한다.
- **AC-06 통계 권한:** 현재 유효 운영진·라우트 조건을 검사하고 비회원/제한된 역할을 통계 권한으로 오인하지 않는다.
- **AC-07 응답 구조:** 단건 통계와 그 안의 Page 회원 활동을 구분한다.
- **AC-08 실출석 범위:** 현재 회원의 클럽 이벤트 체크인만 집계하고 미체크인 등록을 출석으로 더하지 않는다.
- **AC-09 정렬과 페이지:** 전체 참석순/가입시각/회원번호 정렬 뒤 페이지를 자르고 전체 지표는 페이지와 독립적이다.
- **AC-10 최근 한 달:** 달력상 이번 달과 최근 한 달의 엄격한 시각 경계·최근 참석일 null을 구분한다.
- **AC-11 지표 의미:** 활동 멤버 비율·기부 행 합계와 이벤트 참석률·순기부액을 혼동하지 않는다.
- **AC-12 현재 화면:** 개요 카드 넷·멤버 수 변화 도표와 기간 고르기·서버순서TOP5·PersonLink·역할별 비율 막대를 제공하고, 옛 응답에서는 신규 카드와 역할 구역을 그리지 않으며, 없는 페이지 동작을 완료 기능으로 적지 않는다.
- **AC-13 달별 셈:** 회원 행을 넣고 지우는 모든 길이 같은 트랜잭션에서 사람 번호 없이 달별 가입·나감을 세고, 역할 바꾸기·넘기기는 세지 않으며, 이번 달 신규와 도표의 이번 달 가입이 같다.

검증 근거: my_clubs_and_bans_paging_test.dart의 21개 목록·끝까지 읽은 뒤 구역 수·추가 실패 같은 페이지 재시도, ClubMemberStatsServiceTest의 체크인 기반 집계·전체 참석 순서로 페이지 분할·페이지와 무관한 활동 수 단언을 읽었다. 새 시험을 실행하지 않았다. 과거 E2E 표면 확인 원문은 로컬 시나리오 문서에 인용 보존하며 현재 계약이나 새 실행 통과로 합산하지 않는다. 2026-11-26 대조는 서버·앱 소스만 읽었다.
