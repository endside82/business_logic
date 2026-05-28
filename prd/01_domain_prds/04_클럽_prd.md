# 04. 클럽 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/04_club -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/04_club/00_overview.md`와 153개 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

같은 관심사 사용자들의 정기 그룹. 클럽 자체 운영(가입/멤버/권한) + 커뮤니티(게시판/공지/사진첩/캘린더) + 재정(기금/기부/구독/공동 이벤트)을 한 단위로 묶는다.
서버 검증 위치: `ClubController#joinClub`은 `JoinResultVo.resultType` 으로 `MEMBER`/`WAITLIST` 분기 — 자유가입/승인가입 흐름 모두 같은 엔드포인트(`POST /api/v1/clubs/{id}/join`).
비로그인 사용자도 카테고리/키워드로 클럽을 발견하고 카드로 훑어볼 수 있다.
클럽 정보·이벤트 프리뷰·멤버 프리뷰를 보고, 역할/상태에 따른 분기 CTA로 가입/홈 진입한다.
OWNER는 클럽 메타정보(이름, 카테고리, 지역, 소개, 가입방식, 정원, 커버 이미지)를 만들고 관리한다.
OWNER/ADMIN은 멤버 목록을 역할별로 필터링하고 역할 변경 또는 추방한다.
승인가입 클럽에서 OWNER/ADMIN이 신청자를 처리하거나 다른 사용자를 초대한다.
OWNER/ADMIN이 멤버를 차단(자동 추방)하고, 차단 목록에서 해제한다.
사용자는 운영/가입 클럽을 한눈에 보고, OWNER/ADMIN은 클럽 활동 통계를 본다.
멤버는 게시판을 골라 글을 작성/조회/수정/삭제하고, OWNER/ADMIN은 게시판을 만들고 글을 고정한다.
멤버는 게시글에 댓글을 달고 답글로 1뎁스 스레드를 만든다.
OWNER/ADMIN이 푸시 알림과 함께 공지를 등록하고, 멤버는 목록을 읽는다.
멤버는 앨범 단위로 사진을 모아 올리고 그리드/뷰어로 본다. OWNER/ADMIN은 앨범을 만들고 관리한다.
클럽 멤버는 클럽 전용 이벤트(CLUB_MEETING) 목록을 보고 참석/취소하며, 캘린더로 월별 일정을 본다. OWNER/ADMIN은 이벤트와 반복 일정을 만든다.
멤버는 클럽 기금 잔액·월별 입출금 추이·최근 거래를 본다.
일반 멤버는 지갑 잔액으로 클럽 기금에 기부하고, 모든 멤버는 기부 내역(요약+월별)을 본다.
OWNER만 수수료(5%)+원천징수(3.3%) 차감을 미리 보고 외부 계좌로 인출을 요청한다.
사용자는 Basic/Premium 플랜을 골라 정기결제로 구독하고, 마이페이지에서 상태/이력을 보고 해지·재활성한다.

이 도메인은 기능 PRD 17개로 구성된다(F04-01~16 + F04-17 구성인원 인구통계 2026-05-27). 현재 기능별 trace source는 총 73개대이고, risk 후보는 총 60개대다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F04-01 | F04-01. 클럽 발견 & 탐색 | [F04-01_club-discovery_prd.md](../02_feature_prds/04_club/F04-01_club-discovery_prd.md) | [F04-01_club-discovery](../../units/04_club/F04-01_club-discovery) | 전환 완료 | 1 | 3 |
| F04-02 | F04-02. 클럽 상세 보기 & 가입/탈퇴 | [F04-02_club-detail-join_prd.md](../02_feature_prds/04_club/F04-02_club-detail-join_prd.md) | [F04-02_club-detail-join](../../units/04_club/F04-02_club-detail-join) | 전환 완료 | 3 | 0 |
| F04-03 | F04-03. 클럽 생성/수정/삭제/소유권 이전 | [F04-03_club-crud-transfer_prd.md](../02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | [F04-03_club-crud-transfer](../../units/04_club/F04-03_club-crud-transfer) | 전환 완료 | 4 | 11 |
| F04-04 | F04-04. 멤버 관리 (목록 / 역할 변경 / 추방) | [F04-04_member-management_prd.md](../02_feature_prds/04_club/F04-04_member-management_prd.md) | [F04-04_member-management](../../units/04_club/F04-04_member-management) | 전환 완료 | 3 | 0 |
| F04-05 | F04-05. 가입 대기열 승인/거절 & 초대 | [F04-05_waitlist-invitation_prd.md](../02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | [F04-05_waitlist-invitation](../../units/04_club/F04-05_waitlist-invitation) | 전환 완료 | 6 | 1 |
| F04-06 | F04-06. 차단 관리 | [F04-06_ban-management_prd.md](../02_feature_prds/04_club/F04-06_ban-management_prd.md) | [F04-06_ban-management](../../units/04_club/F04-06_ban-management) | 전환 완료 | 4 | 0 |
| F04-07 | F04-07. 내 클럽 / 멤버 통계 | [F04-07_my-clubs-stats_prd.md](../02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | [F04-07_my-clubs-stats](../../units/04_club/F04-07_my-clubs-stats) | 전환 완료 | 2 | 6 |
| F04-08 | F04-08. 게시판 & 게시글 CRUD | [F04-08_board-post-crud_prd.md](../02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | [F04-08_board-post-crud](../../units/04_club/F04-08_board-post-crud) | 전환 완료 | 0 | 3 |
| F04-09 | F04-09. 게시글 댓글 & 대댓글 | [F04-09_post-comments_prd.md](../02_feature_prds/04_club/F04-09_post-comments_prd.md) | [F04-09_post-comments](../../units/04_club/F04-09_post-comments) | 전환 완료 | 5 | 7 |
| F04-10 | F04-10. 공지사항 | [F04-10_announcements_prd.md](../02_feature_prds/04_club/F04-10_announcements_prd.md) | [F04-10_announcements](../../units/04_club/F04-10_announcements) | 전환 완료 | 3 | 2 |
| F04-11 | F04-11. 사진첩 (앨범 + 사진) | [F04-11_photo-album_prd.md](../02_feature_prds/04_club/F04-11_photo-album_prd.md) | [F04-11_photo-album](../../units/04_club/F04-11_photo-album) | 전환 완료 | 8 | 1 |
| F04-12 | F04-12. 클럽 이벤트 & 캘린더 | [F04-12_club-events-calendar_prd.md](../02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | [F04-12_club-events-calendar](../../units/04_club/F04-12_club-events-calendar) | 전환 완료 | 15 | 7 |
| F04-13 | F04-13. 기금 현황 & 거래 차트 | [F04-13_fund-overview_prd.md](../02_feature_prds/04_club/F04-13_fund-overview_prd.md) | [F04-13_fund-overview](../../units/04_club/F04-13_fund-overview) | 전환 완료 | 1 | 2 |
| F04-14 | F04-14. 기부하기 & 기부 내역 | [F04-14_donation_prd.md](../02_feature_prds/04_club/F04-14_donation_prd.md) | [F04-14_donation](../../units/04_club/F04-14_donation) | 전환 완료 | 4 | 6 |
| F04-15 | F04-15. 기금 인출 요청 | [F04-15_fund-withdrawal_prd.md](../02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | [F04-15_fund-withdrawal](../../units/04_club/F04-15_fund-withdrawal) | 전환 완료 | 2 | 2 |
| F04-16 | F04-16. 클럽 구독 (시작/갱신/해지/재활성) | [F04-16_subscription_prd.md](../02_feature_prds/04_club/F04-16_subscription_prd.md) | [F04-16_subscription](../../units/04_club/F04-16_subscription) | 전환 완료 | 5 | 8 |
| F04-17 | F04-17. 클럽 구성인원 인구통계 | [F04-17_club-demographics_prd.md](../02_feature_prds/04_club/F04-17_club-demographics_prd.md) | (DEMOGRAPHICS_STATS_PLAN.md v2, Codex sign-off) | 신규 (2026-05-27 도입) | 7 | 1 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F04-03](../02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | F04-03. 클럽 생성/수정/삭제/소유권 이전 | Risk 후보 11 |
| [F04-16](../02_feature_prds/04_club/F04-16_subscription_prd.md) | F04-16. 클럽 구독 (시작/갱신/해지/재활성) | Risk 후보 8 |
| [F04-09](../02_feature_prds/04_club/F04-09_post-comments_prd.md) | F04-09. 게시글 댓글 & 대댓글 | Risk 후보 7 |
| [F04-12](../02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | F04-12. 클럽 이벤트 & 캘린더 | Risk 후보 7 |
| [F04-07](../02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | F04-07. 내 클럽 / 멤버 통계 | Risk 후보 6 |
| [F04-14](../02_feature_prds/04_club/F04-14_donation_prd.md) | F04-14. 기부하기 & 기부 내역 | Risk 후보 6 |
| [F04-08](../02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | F04-08. 게시판 & 게시글 CRUD | Risk 후보 3, trace 없음 |
| [F04-01](../02_feature_prds/04_club/F04-01_club-discovery_prd.md) | F04-01. 클럽 발견 & 탐색 | Risk 후보 3 |
| [F04-13](../02_feature_prds/04_club/F04-13_fund-overview_prd.md) | F04-13. 기금 현황 & 거래 차트 | Risk 후보 2 |
| [F04-15](../02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | F04-15. 기금 인출 요청 | Risk 후보 2 |
| [F04-10](../02_feature_prds/04_club/F04-10_announcements_prd.md) | F04-10. 공지사항 | Risk 후보 2 |
| [F04-05](../02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | F04-05. 가입 대기열 승인/거절 & 초대 | Risk 후보 1 |
| [F04-11](../02_feature_prds/04_club/F04-11_photo-album_prd.md) | F04-11. 사진첩 (앨범 + 사진) | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (M = 13)

### 클럽 자체 운영

#### F04-01. 클럽 발견 & 탐색
> 비로그인 사용자도 카테고리/키워드로 클럽을 발견하고 카드로 훑어볼 수 있다.
- **사용자**: 비멤버 / 모든 사용자
- **화면**: SCR-CL-001 클럽 목록
- **API**: `GET /api/v1/clubs` (`ClubSearchParam`, 비인증 허용 — `errorOnInvalidType=false`)
- **프론트**: `screens/club_list_screen.dart`, `widgets/club_grid_card.dart`, `club_category_tabs.dart`
- **액션**: 키워드 검색, 카테고리 필터, 무한 스크롤, FAB로 클럽 생성 진입(로그인 필요)

#### F04-02. 클럽 상세 보기 & 가입 액션
> 클럽 정보·이벤트 프리뷰·멤버 프리뷰를 보고, 역할/상태에 따른 분기 CTA로 가입/홈 진입한다.
- **사용자**: 비멤버, MEMBER, OWNER/ADMIN
- **화면**: SCR-CL-002 클럽 상세
- **API**: `GET /api/v1/clubs/{id}` (인증 선택), `POST /api/v1/clubs/{id}/join`, `DELETE /api/v1/clubs/{id}/leave`
- **프론트**: `screens/club_detail_screen.dart`, `widgets/club_detail_header.dart`, `club_join_button.dart`, `club_event_preview.dart`, `club_member_preview.dart`
- **권한별 CTA**:
  - 비멤버: "가입하기" → 자유가입 즉시 멤버 / 승인가입 → 대기열
  - 신청 중: "승인 대기 중" 비활성
  - MEMBER/ADMIN: "클럽 홈" → 커뮤니티 진입, 더보기 메뉴 "탈퇴"
  - OWNER: 가입 버튼 미표시 + 설정 아이콘 노출, 탈퇴 시 `CLUB_OWNER_CANNOT_LEAVE`
  - 차단됨: "가입할 수 없습니다" 비활성

#### F04-03. 클럽 생성 / 수정 / 삭제 / 소유권 이전
> OWNER는 클럽 메타정보(이름, 카테고리, 지역, 소개, 가입방식, 정원, 커버 이미지)를 만들고 관리한다.
- **사용자**: 로그인 사용자(생성), OWNER(수정/삭제/이전), ADMIN(수정 일부 — 스펙상 SCR-CL-004 수정은 OWNER/ADMIN 모두 진입)
- **화면**: SCR-CL-003 생성, SCR-CL-004 수정 (위험 영역에 클럽 삭제)
- **API**: `POST /api/v1/clubs`, `PATCH /api/v1/clubs/{id}`, `DELETE /api/v1/clubs/{id}` (Owner 전용 204), `POST /api/v1/clubs/{id}/transfer-ownership`
- **프론트**: `screens/club_create_screen.dart`, `club_edit_screen.dart`, `widgets/club_form.dart`, `club_delete_dialog.dart`
- **유효성**: 이름 2~30자(중복 검사), 소개 10~500자, 커버 5MB↓, 가입방식 JOIN_FREE/JOIN_APPROVAL

#### F04-04. 멤버 관리 (목록 / 역할 변경 / 추방)
> OWNER/ADMIN은 멤버 목록을 역할별로 필터링하고 역할 변경 또는 추방한다.
- **사용자**: 모든 멤버(목록 조회), OWNER/ADMIN(액션)
- **화면**: SCR-CL-005 멤버 목록, SCR-CL-008 역할 변경 Bottom Sheet
- **API**: `GET /api/v1/clubs/{id}/members` (`ClubMemberSearchParam`), `POST /{id}/members/{userId}/role` (`RoleChangeParam`), `DELETE /{id}/members/{userId}`
- **프론트**: `screens/club_member_list_screen.dart`, `widgets/member_card.dart`, `member_action_sheet.dart`, `role_change_sheet.dart`, `role_badge.dart`
- **권한 매트릭스** (스펙상):
  - OWNER → ADMIN/MEMBER: 역할변경, 추방, 차단
  - ADMIN → MEMBER: 추방, 차단 (ADMIN/OWNER 대상 불가)
  - MEMBER → 모두: 액션 메뉴 미표시

#### F04-05. 가입 대기열 승인/거절 & 초대
> 승인가입 클럽에서 OWNER/ADMIN이 신청자를 처리하거나 다른 사용자를 초대한다.
- **사용자**: OWNER/ADMIN(처리), 신청자/피초대자(수락/거절)
- **화면**: SCR-CL-006 가입 대기열
- **API**:
  - 대기열 조회: `GET /api/v1/clubs/{id}/waitlist`
  - 승인/거절: `POST /{id}/waitlist/{waitId}/approve`, `POST /{id}/waitlist/{waitId}/reject` (사유 선택, body `{reason}`)
  - 초대: `POST /{id}/invitations` (`InviteParam`)
  - 초대 수락/거절: `POST /{id}/invitations/{invitationId}/accept`, `POST /{id}/invitations/{invitationId}/decline`
- **프론트**: `screens/club_waitlist_screen.dart`, `widgets/waitlist_card.dart`, `reject_dialog.dart`
- **알림**: 신청/승인/거절/초대 시 양 당사자에게 FCM

#### F04-06. 차단 관리
> OWNER/ADMIN이 멤버를 차단(자동 추방)하고, 차단 목록에서 해제한다.
- **사용자**: OWNER/ADMIN
- **화면**: SCR-CL-009 차단 목록 (클럽 설정 > 차단 관리)
- **API**:
  - 차단: `POST /api/v1/clubs/{id}/members/{userId}/ban` (`BanParam`)
  - 차단 해제: `DELETE /{id}/members/{userId}/ban`, `DELETE /{id}/bans/{userId}` (전용 경로)
  - 차단 목록: `GET /{id}/bans` (waitType=BAN 고정)
- **프론트**: `screens/club_ban_list_screen.dart`, `widgets/ban_card.dart`, `unban_dialog.dart`
- **결과**: 차단된 멤버는 자동 멤버 제거 + 재가입 불가, 알림 발송

#### F04-07. 내 클럽 / 멤버 통계
> 사용자는 운영/가입 클럽을 한눈에 보고, OWNER/ADMIN은 클럽 활동 통계를 본다.
- **사용자**: 로그인 사용자(내 클럽), OWNER/ADMIN(통계)
- **화면**: SCR-CL-007 내 클럽, SCR-CL-010 멤버 통계
- **API**: `GET /api/v1/clubs/my`, `GET /api/v1/clubs/{id}/members/stats` → `ClubActivityStatsVo`
- **프론트**: `screens/my_clubs_screen.dart`, `club_member_stats_screen.dart`, `widgets/my_club_card.dart`, `member_stats_overview.dart`, `member_top_list.dart`, `member_trend_chart.dart`, `role_distribution_chart.dart`
- **통계 항목**: 전체/활성/신규 멤버, 평균 참석률, 멤버 증감, 활동 TOP 5, 역할별 분포

---

### 클럽 커뮤니티 (게시판 / 공지 / 사진첩 / 캘린더)

#### F04-08. 게시판 & 게시글 CRUD
> 멤버는 게시판을 골라 글을 작성/조회/수정/삭제하고, OWNER/ADMIN은 게시판을 만들고 글을 고정한다.
- **사용자**: MEMBER(게시글 CRUD, 자기 글), OWNER/ADMIN(게시판 CRUD, 모든 글 삭제·고정)
- **화면**: SCR-CC-001 게시판 목록, SCR-CC-002 게시글 목록, SCR-CC-003 상세, SCR-CC-004 작성, SCR-CC-005 수정
- **API**:
  - 게시판: `GET/POST /api/v1/clubs/{clubId}/boards`, `PUT/DELETE /boards/{boardId}` (생성/수정/삭제는 OWNER/ADMIN)
  - 게시글: `GET/POST /clubs/{clubId}/boards/{boardId}/posts` (`ClubPostSearchParam`), `GET/PUT/DELETE /posts/{postId}`, `PATCH /posts/{postId}/pin` (고정 토글, OWNER/ADMIN)
- **프론트**: `community/screens/board_list_screen.dart`, `post_list_screen.dart`, `post_detail_screen.dart`, `post_create_screen.dart`, `post_edit_screen.dart`, `widgets/post_card.dart`, `pinned_post_section.dart`, `post_form.dart`, `post_image_picker.dart`, `post_more_menu.dart`, `board_create_dialog.dart`
- **유효성**: 제목 1~100자, 본문 1~3000자, 이미지 최대 10장 / 5MB, 작성 중 이탈 가드

#### F04-09. 게시글 댓글 & 대댓글
> 멤버는 게시글에 댓글을 달고 답글로 1뎁스 스레드를 만든다.
- **사용자**: MEMBER (작성/자기 글 수정·삭제), OWNER/ADMIN (남의 댓글 삭제), 작성자(자기 댓글 수정/삭제)
- **화면**: SCR-CC-006 댓글/대댓글 (게시글 상세 하단)
- **API**:
  - 목록: `GET /api/v1/clubs/{clubId}/posts/{postId}/comments` → `List<ClubPostCommentVo>` (Page 아님, **List**)
  - 작성: `POST /posts/{postId}/comments` (`ClubCommentAddParam`)
  - 답글: `POST /posts/{postId}/comments/{commentId}/replies`
  - 수정/삭제: `PUT/DELETE /clubs/{clubId}/comments/{commentId}` (`ClubCommentModParam`)
- **프론트**: `community/widgets/comment_tile.dart`, `reply_tile.dart`, `comment_input.dart`, `comment_action_menu.dart`
- **삭제 정책**: 대댓글 보존 시 "삭제된 댓글입니다" placeholder, 수정 시 "(수정됨)" 표시

#### F04-10. 공지사항
> OWNER/ADMIN이 푸시 알림과 함께 공지를 등록하고, 멤버는 목록을 읽는다.
- **사용자**: 모든 멤버(읽기), OWNER/ADMIN(작성/삭제)
- **화면**: SCR-CC-007 목록, SCR-CC-008 작성
- **API**: `POST/GET /api/v1/clubs/{id}/announcements` (`ClubAnnouncementParam`, `ClubMemberSearchParam`), `DELETE /announcements/{announcementId}`
- **프론트**: `community/screens/announcement_list_screen.dart`, `announcement_create_screen.dart`, `widgets/announcement_card.dart`
- **유효성**: 제목 1~100자, 본문 1~2000자, 푸시 알림 체크박스(기본 체크)

#### F04-11. 사진첩 (앨범 + 사진 업로드)
> 멤버는 앨범 단위로 사진을 모아 올리고 그리드/뷰어로 본다. OWNER/ADMIN은 앨범을 만들고 관리한다.
- **사용자**: 모든 멤버(조회/업로드/일괄 삭제 자기 사진), OWNER/ADMIN(앨범 CRUD, 모든 사진 삭제)
- **화면**: SCR-CC-009 앨범 목록, SCR-CC-010 사진첩 상세(선택 모드 포함), SCR-CC-011 사진 업로드
- **API**:
  - 앨범: `GET/POST /api/v1/clubs/{clubId}/photo-albums`, `PUT/DELETE /photo-albums/{albumId}`
  - 사진: `GET/POST /photo-albums/{albumId}/photos`, `DELETE /photos/{photoId}`, `POST /photos/batch-delete` (`PhotoBatchDeleteParam`)
  - 업로드 사전: `POST /api/v1/files/presigned-url` → S3 직접 PUT
- **프론트**: `community/screens/photo_album_list_screen.dart`, `photo_album_detail_screen.dart`, `photo_upload_screen.dart`, `widgets/album_card.dart`, `album_create_dialog.dart`, `photo_grid.dart`, `photo_viewer.dart`, `photo_selection_bar.dart`, `photo_upload_progress.dart`
- **제한**: 1회 10장, 각 10MB↓, JPG/PNG/HEIC, 원본 1920px / 썸네일 200x200

#### F04-12. 클럽 이벤트 & 캘린더
> 클럽 멤버는 클럽 전용 이벤트(CLUB_MEETING) 목록을 보고 참석/취소하며, 캘린더로 월별 일정을 본다. OWNER/ADMIN은 이벤트와 반복 일정을 만든다.
- **사용자**: 모든 멤버(조회/참석), OWNER/ADMIN(생성/수정/게시/취소/통계/반복 이벤트)
- **화면**: SCR-CC-012 캘린더, SCR-CF-007 이벤트 목록, SCR-CF-008 이벤트 통계
- **API**:
  - 이벤트 CRUD: `POST/GET /api/v1/clubs/{clubId}/events` (`ClubEventSearchParam`), `GET/PATCH/DELETE /events/{eventId}`
  - 예정/캘린더: `GET /events/upcoming`, `GET /events/calendar?year=&month=`
  - 상태 전환: `POST /events/{eventId}/publish` (DRAFT→OPEN, 자동 참가), `POST /events/{eventId}/cancel`
  - 참석: `POST /events/{eventId}/attendees`, `DELETE /events/{eventId}/attendees/me`, `GET /events/{eventId}/attendees`
  - 반복: `POST /events/recurring` (`RecurringEventParam`), `GET /events/recurring`
  - 통계: `GET /events/statistics` → `ClubEventStatisticsVo`
- **프론트**: `community/screens/club_calendar_screen.dart`, `community/widgets/calendar_month_view.dart`, `calendar_day_events.dart`, `finance/screens/club_event_list_screen.dart`, `club_event_stats_screen.dart`, `club_recurring_event_screen.dart`, `finance/widgets/club_event_card.dart`, `event_attendance_button.dart`, `event_status_tabs.dart`, `event_trend_chart.dart`, `attendance_histogram.dart`, `popular_events_list.dart`, `weekday_distribution_chart.dart`, `event_stats_overview.dart`
- **참석 버튼 상태**: 미참석/참석완료/대기 등록(정원 초과)/종료됨

---

### 클럽 재정

#### F04-13. 기금 현황 & 거래 차트
> 멤버는 클럽 기금 잔액·월별 입출금 추이·최근 거래를 본다.
- **사용자**: 모든 멤버(조회), OWNER(인출 요청 진입), 일반 멤버(기부 진입)
- **화면**: SCR-CF-001 클럽 기금 현황
- **API**: `GET /api/v1/clubs/{id}/fund` → `ClubFundVo`
- **프론트**: `finance/screens/club_fund_screen.dart`, `club_fund_policy_screen.dart`, `widgets/fund_balance_card.dart`, `fund_chart.dart`, `transaction_card.dart`
- **권한별 CTA**: OWNER → "기부 내역" + "인출 요청", 일반 멤버 → "기부하기"
- **유료/무료 분리** (2026-05-24 포인트 분리정산 반영): 기금 잔액도 지갑과 동일하게 유료(paid)/무료(free)로 분리 표시된다. 무료 적립분은 클럽 안에서 쓸 수 있으나 인출(현금화) 불가. 정본은 정책 PRD §2.5.

#### F04-14. 기부하기 & 기부 내역
> 일반 멤버는 지갑 잔액으로 클럽 기금에 기부하고, 모든 멤버는 기부 내역(요약+월별)을 본다.
- **사용자**: 모든 멤버(목록/요약/기부), 본인(취소)
- **화면**: SCR-CF-002 기부 내역, SCR-CF-003 기부하기
- **API**:
  - 기부: `POST /api/v1/clubs/{id}/donations` (`ClubDonateParam`)
  - 요약: `GET /donations/summary` → `DonationSummaryVo`
  - 목록: `GET /donations` (Paging)
  - 취소: `POST /donations/{donationId}/cancel`
- **프론트**: `finance/screens/donation_screen.dart`, `donation_list_screen.dart`, `widgets/amount_input.dart`, `quick_amount_chips.dart`, `donation_card.dart`, `donation_month_header.dart`, `donation_summary_card.dart`, `donation_confirm_dialog.dart`
- **유효성**: 1,000원 이상, 잔액 이내, 1회 1,000,000원 이하, 메시지 100자 이하
- **회계**: 지갑 차감 + ClubFund 증가 + AccountingLedger 분개(DR CLUB_FUND / CR USER_WALLET)
- **기부 split 전파** (2026-05-24 포인트 분리정산 반영): 기부·가입비는 flow-through 사용처. 멤버가 무료 포인트로 기부하면 그 split이 기금에 free로 적립되어 인출 불가 상태로 유지된다(무료 기부 → 기금 free → 현금화 불가). (followup: 기부·가입비 환불의 원결제 split 보존은 `refundToWallet` → `refundByTransaction` 전환 예정.)

#### F04-15. 기금 인출 요청
> OWNER만 수수료(5%)+원천징수(3.3%) 차감을 미리 보고 외부 계좌로 인출을 요청한다.
- **사용자**: OWNER (단독)
- **화면**: SCR-CF-004 기금 인출 요청
- **API**: `POST /api/v1/clubs/{id}/fund/withdraw` (`ClubFundWithdrawParam`), `GET /fund/withdrawals` (이력)
- **프론트**: `finance/screens/withdrawal_screen.dart`, `widgets/fee_breakdown_card.dart`
- **유효성**: 10,000원 이상, 잔액 이내, 사유 10~200자, 은행/계좌번호/예금주 필수
- **에러**: `NOT_CLUB_OWNER`, `FUND_INSUFFICIENT`, `WITHDRAWAL_ALREADY_PENDING`
- **회계**: 4중 분개(DR CLUB_FUND_WITHDRAWAL net + DR PLATFORM_FEE_REVENUE 5% + DR WITHHOLDING_TAX_PAYABLE 3.3% / CR CLUB_FUND gross). 이후 관리자 승인 후 송금.
- **인출 paid-only** (2026-05-24 포인트 분리정산 반영): 기금 인출은 유료(paid) 잔액만 현금화 대상. 가용액 = paid 잔액 − 예비금/미수금이며, 수수료(5%)·원천징수(3.3%)는 유료(현금)분에만 부과한다. 무료 기금은 인출 불가, 클럽 폐쇄 인출도 유료만 현금화하고 무료 기금은 소멸한다. 정본은 정책 PRD §2.5.

#### F04-16. 클럽 구독 (시작 / 갱신 / 해지 / 재활성)
> 사용자는 Basic/Premium 플랜을 골라 정기결제로 구독하고, 마이페이지에서 상태/이력을 보고 해지·재활성한다.
- **사용자**: 로그인 사용자 (구독자), 시스템(자동 갱신)
- **화면**: SCR-CF-005 클럽 구독, SCR-CF-006 구독 관리
- **API**:
  - 플랜 조회: `GET /api/v1/clubs/{id}/subscription/plans` (인증 무관)
  - 구독: `POST /api/v1/clubs/{id}/subscription` (`ClubSubscriptionParam`, body 선택)
  - 조회: `GET /subscription`
  - 해지(자동갱신 취소): `DELETE /subscription`
  - 재활성: `POST /subscription/reactivate`
- **프론트**: `finance/screens/subscription_screen.dart`, `subscription_manage_screen.dart`, `widgets/subscription_plan_card.dart`, `subscription_info_card.dart`, `subscription_status_badge.dart`, `payment_history_list.dart`, `payment_method_sheet.dart`, `cancel_subscription_dialog.dart`
- **상태 모델**: ACTIVE / CANCELLING(만료일까지) / SUSPENDED(결제 실패 3회) / EXPIRED
- **결제 수단**: 내 지갑 / 카드 / 간편결제

---

## 5. 상태/권한/의존성

### 멤버 권한 모델 (서버 확인됨)

- **OWNER**: 클럽 생성자. 클럽 수정/삭제, 소유권 이전, 기금 인출, 모든 관리 권한.
- **ADMIN**: OWNER가 임명. 멤버 승인/추방/차단, 게시판 관리, 게시글/댓글 삭제/고정, 공지/이벤트 작성, 앨범 관리.
- **MEMBER**: 일반 멤버. 게시글/댓글/사진/이벤트 참석, 기부, 자기 글 수정/삭제.
- **비멤버 (GUEST)**: 클럽 목록/상세 일부 조회 가능 (인증 무관). 가입/탈퇴/커뮤니티/재정 접근 불가.

> 서버 검증 위치: `ClubController#joinClub`은 `JoinResultVo.resultType` 으로 `MEMBER`/`WAITLIST` 분기 — 자유가입/승인가입 흐름 모두 같은 엔드포인트(`POST /api/v1/clubs/{id}/join`).

---

### 기능 → 권한 요약 매트릭스

| #   | 기능                          | 비멤버 | MEMBER | ADMIN | OWNER |
|-----|-------------------------------|:------:|:------:|:-----:|:-----:|
| F04-01 | 클럽 발견 & 탐색           | ●      | ●      | ●     | ●     |
| F04-02 | 클럽 상세 & 가입/탈퇴      | 가입   | 탈퇴   | 탈퇴  | 탈퇴X |
| F04-03 | 클럽 생성/수정/삭제/이전   | 생성   | -      | 수정  | 전체  |
| F04-04 | 멤버 목록/역할/추방        | -      | 조회   | 추방  | 전체  |
| F04-05 | 대기열/초대                | 신청/수락 | -   | 처리/초대 | 처리/초대 |
| F04-06 | 차단 관리                  | -      | -      | ●     | ●     |
| F04-07 | 내 클럽 / 멤버 통계        | -      | 내 클럽 | 통계  | 통계  |
| F04-08 | 게시판/게시글 CRUD         | -      | 자기 글 | 전체+고정/판 CRUD | 전체 |
| F04-09 | 댓글/대댓글                | -      | 자기 글 | 전체 삭제 | 전체 삭제 |
| F04-10 | 공지사항                   | -      | 읽기   | 작성/삭제 | 작성/삭제 |
| F04-11 | 사진첩 & 업로드            | -      | 자기 사진 | 앨범 CRUD/모든 사진 | 동일 |
| F04-12 | 클럽 이벤트 & 캘린더       | -      | 참석   | 생성/게시/취소/반복/통계 | 동일 |
| F04-13 | 기금 현황                  | -      | 조회   | 조회  | 조회 + 인출 진입 |
| F04-14 | 기부 / 기부 내역           | -      | 기부/취소 | 동일 | 동일 |
| F04-15 | 기금 인출                  | -      | -      | -     | ●     |
| F04-16 | 구독 (시작/해지/재활성)    | 플랜만 | ●      | ●     | ●     |

---

### 횡단 의존

- **인증/권한**: `@AuthenticationPrincipal UserPrincipal` — 클럽 목록/상세/구독 플랜만 비인증 허용.
- **파일 업로드**: `POST /api/v1/files/presigned-url` → S3 직접 PUT (사진/커버 이미지).
- **결제/지갑**: 기부/구독 → Wallet, AccountingLedger (복식부기).
- **알림**: 가입/승인/거절/초대/추방/차단/공지/댓글/구독 결제 결과에서 FCM 발송.

## 6. 화면/API 매핑

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F04-03](../02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | F04-03. 클럽 생성/수정/삭제/소유권 이전 | 11 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-16](../02_feature_prds/04_club/F04-16_subscription_prd.md) | F04-16. 클럽 구독 (시작/갱신/해지/재활성) | 8 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-09](../02_feature_prds/04_club/F04-09_post-comments_prd.md) | F04-09. 게시글 댓글 & 대댓글 | 7 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-12](../02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | F04-12. 클럽 이벤트 & 캘린더 | 7 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-07](../02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | F04-07. 내 클럽 / 멤버 통계 | 6 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-14](../02_feature_prds/04_club/F04-14_donation_prd.md) | F04-14. 기부하기 & 기부 내역 | 6 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-01](../02_feature_prds/04_club/F04-01_club-discovery_prd.md) | F04-01. 클럽 발견 & 탐색 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-08](../02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | F04-08. 게시판 & 게시글 CRUD | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-10](../02_feature_prds/04_club/F04-10_announcements_prd.md) | F04-10. 공지사항 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-13](../02_feature_prds/04_club/F04-13_fund-overview_prd.md) | F04-13. 기금 현황 & 거래 차트 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-15](../02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | F04-15. 기금 인출 요청 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-05](../02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | F04-05. 가입 대기열 승인/거절 & 초대 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F04-11](../02_feature_prds/04_club/F04-11_photo-album_prd.md) | F04-11. 사진첩 (앨범 + 사진) | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
