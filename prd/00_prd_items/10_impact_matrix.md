# 기능별 알림·금전·일정·위치·후기·안전 영향 표

<!-- release-document: reference -->
> 2026-11-22 현재 21개 도메인·175개 기능 PRD를 기준으로 분류했다. 소스 대조된 정본의 설명을 재사용한 문서 검토이며, 제품 실행·알림 수신·돈 이동의 통과 기록은 아니다. 현재 할 일은 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)에 있다.

## 문서 설명

기능을 변경할 때 함께 읽어야 할 영역을 찾는 표다. **●는 해당 PRD가 생성·변경뿐 아니라 조회·설정·입구·보존 조건으로 직접 다루는 영역**이다. 예를 들어 거래 내역은 금전, 방해금지는 알림, 차량 자리 신고는 후기·안전에 포함한다. 기능마다 분류 이유와 정본 링크를 제공한다.

**·는 이번 정본에서 주요 검토 연결로 분류하지 않았다는 뜻**이다. 영향이 없다는 보증이나 검토 면제가 아니다. 공통 인증·권한·동시 처리·복구·개인정보와 마일리지·스탬프 등 다섯 열 밖의 규칙도 변경 범위에 맞춰 확인한다. 폐기된 기능은 유지해야 할 차단 경계를 분류하며 현재 사용 가능한 기능으로 되돌려 소개하지 않는다.

<a id="1-영향-판단-기준"></a>
## 영향 판단 기준

| 영역 | 함께 확인할 계약 | 잘못 확대하지 않을 것 |
|---|---|---|
| 알림 | 앱 알림·푸시·인증 이메일의 발송 의도, 수신 설정·방해금지·기기·배지·업무 이동·자료 보존 | 상태 변경이 있다는 이유만으로 새 알림 발송이 있다고 판단하지 않음 |
| 금전 | 가격·결제·지갑·납부·반환·정산·거래 조회·구매 권리와 금전 분쟁 | 마일리지 점수·배지를 현금으로 분류하지 않음; 화면 성공을 실제 지급으로 바꾸지 않음 |
| 일정 | 이벤트·만남·회차·참석 일정, 가능 시간·반복·달력 조회와 공개 경계 | 단순 생성 시각·예약 알림·시즌 기간을 개인 달력 반영으로 확대하지 않음 |
| 위치 | 주소·좌표·장소·거리·길찾기·위치 동의·공유·개인 승차 장소와 위치 자료 | 좌석 번호나 문서 블록 순서의 ‘위치’를 지리 정보로 분류하지 않음 |
| 후기·안전 | 후기·피드백·신뢰점수·차단·신고·노쇼·경고·제재·분쟁과 그 조회·보존 | 마일리지 등급을 신뢰점수로 혼동하지 않음; 접수를 제재·보상 완료로 쓰지 않음 |

아래의 분류는 기능 정본의 검토 범위를 요약한다. 같은 이름의 앱 단추가 모든 서버 조건을 지원하는지, 기능이 운영에서 활성화되어 있는지는 각 정본의 현재 제한과 별도 실행 근거를 확인한다.

<a id="2-기능별-영향"></a>
## 기능별 영향

| 기능과 정본 | 알림 | 금전 | 일정 | 위치 | 후기·안전 | 분류 이유 |
|---|---|---|---|---|---|---|
| [F01-01 이메일 회원가입 & 로그인](../02_feature_prds/01_auth_onboarding/F01-01_email-signup-login_prd.md) | ● | · | · | · | ● | 이메일 확인과 제한 계정의 로그인 경계 |
| [F01-02 소셜 로그인](../02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | · | · | · | · | ● | 소셜 연결과 제한 계정의 접근 경계 |
| [F01-03 이메일 인증](../02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | ● | · | · | · | · | 인증번호 발송·재발송·수신 제한 |
| [F01-04 비밀번호 재설정](../02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | ● | · | · | · | · | 재설정 번호 발송과 세션·기기 정리 |
| [F01-05 토큰 갱신 & 로그아웃](../02_feature_prds/01_auth_onboarding/F01-05_token-refresh-logout_prd.md) | ● | · | · | · | · | 로그아웃·세션 교체의 푸시 기기 정리 |
| [F01-06 온보딩](../02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | · | · | · | ● | · | 선택형 위치 안내와 주소·권한 |
| [F01-07 관심사 태그 관리](../02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | · | · | · | · | · | 관심 태그 저장·개수 제한 |
| [F01-08 소셜 계정 연결 해제](../02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | · | · | · | · | · | 소셜 연결 해제와 마지막 로그인 수단 |
| [F02-01 홈 피드 메인 조회](../02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | · | · | ● | ● | ● | 예정 이벤트·위치 추천·후기와 차단을 반영한 노출 |
| [F02-02 홈 피드 새로고침](../02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | · | · | · | ● | · | 위치 재확인과 피드 재조회 |
| [F02-03 섹션 카드 진입](../02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | · | · | · | · | · | 홈 카드에서 목록·상세로 이동하고 복귀 |
| [F02-04 추천 이벤트 더보기·필터·무한스크롤](../02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | · | · | ● | ● | ● | 시작 시간·거리·주최자 후기와 차단을 반영한 추천 |
| [F02-05 검색·알림 진입점](../02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | ● | · | · | · | · | 공통 상단 알림함·배지 입구 |
| [F03-01 이벤트 발견과 탐색](../02_feature_prds/03_event/F03-01_event-discovery_prd.md) | · | · | ● | ● | ● | 기간·거리 조건과 차단 호스트 제외 |
| [F03-02 이벤트 상세 조회](../02_feature_prds/03_event/F03-02_event-detail_prd.md) | · | ● | ● | ● | · | 일시·장소·참가비와 참가 상태 표시 |
| [F03-03 이벤트 생성과 다음 일정·반복 일정](../02_feature_prds/03_event/F03-03_event-creation_prd.md) | · | ● | ● | ● | · | 일시·장소·참가비 설정과 다음·반복 이벤트 |
| [F03-04 이벤트 수정·공개·종료·취소](../02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | ● | ● | ● | ● | · | 일정·장소 변경, 취소·반환과 후속 알림 |
| [F03-05 이벤트 신청·참석·본인 취소](../02_feature_prds/03_event/F03-05_event-attendance_prd.md) | ● | ● | ● | · | · | 참가·승인 대기·결제 대기와 참석 일정 |
| [F03-06 신청서 승인·거절과 일괄 처리](../02_feature_prds/03_event/F03-06_application-review_prd.md) | ● | ● | · | · | · | 승인·거절 알림과 유료 참가의 납부 대기 |
| [F03-07 정원 설정·대기열·모집 관리](../02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | ● | · | · | · | · | 정원과 대기자 승격 알림 |
| [F03-08 QR·코드·직접 체크인](../02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | · | · | ● | · | ● | 이벤트 출석 시각·체크인과 참석 기록 |
| [F03-09 이벤트 사진첩](../02_feature_prds/03_event/F03-09_event-photos_prd.md) | ● | · | · | · | ● | 사진 알림·신고와 접근·보관 경계 |
| [F03-10 이벤트와 플랜 연결](../02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | · | · | ● | ● | · | 플랜 연결과 이벤트 시간·장소 반영 |
| [F03-11 찜한 이벤트](../02_feature_prds/03_event/F03-11_wishlist_prd.md) | · | · | · | · | · | 찜 저장과 공개 범위 |
| [F03-12 내 이벤트와 참석 변경 기록](../02_feature_prds/03_event/F03-12_my-events_prd.md) | · | · | ● | · | · | 본인 참가 이벤트의 일정·참석 이력 |
| [F03-13 이벤트 참가비 선입금·은행 확인·환불 기록](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | ● | ● | · | · | · | 지갑·계좌 납부와 취소·환불·증빙 알림 |
| [F03-14 이동수단 공통 설정](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md) | · | · | · | ● | · | 이동 정책·실제 참석자·탑승 장소 연결 |
| [F03-15 카풀 지원·개별 이동](../02_feature_prds/03_event/F03-15_event-carpool_prd.md) | ● | · | · | ● | ● | 카풀 지원·운행 취소, 승하차 장소와 차량 신고 |
| [F03-16 대절 버스와 자리 배정](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md) | ● | · | · | · | ● | 버스 좌석 배정·변경 알림과 자리 신고 |
| [F03-17 차량 좌석 배치도 운영](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | · | · | · | · | · | 좌석 배치도·물리 좌석과 증빙 |
| [F03-18 이벤트 구성 통계](../02_feature_prds/03_event/F03-18_event-demographics_prd.md) | · | · | · | · | · | 통계 집계와 소수 인원 비공개 경계 |
| [F03-19 일정 변경 제안·참가자 합의 (RS-002)](../02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | ● | ● | ● | · | · | 일정 변경 동의·반영·취소와 납부·반환 |
| [F03-20 이벤트 노쇼 관리](../02_feature_prds/03_event/F03-20_event-no-show_prd.md) | ● | ● | · | · | ● | 노쇼 판정·이의·환불과 절차 알림 |
| [F04-01 클럽 발견 & 탐색](../02_feature_prds/04_club/F04-01_club-discovery_prd.md) | · | · | · | ● | ● | 클럽 탐색의 지역 조건과 차단·공개 경계 |
| [F04-02 클럽 상세와 가입·탈퇴](../02_feature_prds/04_club/F04-02_club-detail-join_prd.md) | ● | ● | · | · | ● | 가입 신청·탈퇴 알림, 가입비 반환과 제한 회원 |
| [F04-03 클럽 생성·수정·폐쇄와 소유권 이전](../02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | ● | ● | · | · | ● | 폐쇄 알림·잔여 금전 의무·신고 이관 |
| [F04-04 회원 목록·역할·권한 위임과 강퇴](../02_feature_prds/04_club/F04-04_member-management_prd.md) | ● | ● | · | · | ● | 역할 변경·강퇴 알림, 참가·반환과 불리 조치 |
| [F04-05 가입 신청 처리·초대 발송과 받은 초대](../02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | ● | ● | · | · | · | 신청·초대 알림과 가입비 처리 |
| [F04-06 클럽 차단·기간·해제 관리](../02_feature_prds/04_club/F04-06_ban-management_prd.md) | ● | ● | · | · | ● | 가입 금지·반환·불리 조치와 대상 알림 |
| [F04-07 내 클럽 목록과 회원 활동 통계](../02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | · | · | ● | · | · | 내 클럽과 참가·출석 통계 |
| [F04-08 게시판·게시글·예약·초안과 작성 글 모아 보기](../02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | ● | · | · | · | ● | 게시글 알림과 신고·차단에 따른 표시 |
| [F04-09 게시글 댓글·답글·멘션과 대상 댓글 찾기](../02_feature_prds/04_club/F04-09_post-comments_prd.md) | ● | · | · | · | ● | 댓글·멘션 알림과 차단·신고 표시 |
| [F04-10 공지 읽기·작성·수정과 예약 게시](../02_feature_prds/04_club/F04-10_announcements_prd.md) | ● | · | · | · | · | 예약 공지의 발행·알림 |
| [F04-11 클럽 사진첩·등록 복구·공개 범위·댓글](../02_feature_prds/04_club/F04-11_photo-album_prd.md) | ● | · | · | · | ● | 앨범 댓글·멘션 알림과 신고·공개 경계 |
| [F04-12 클럽 모임·캘린더·통계·반복 초안](../02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | · | ● | ● | · | · | 클럽 이벤트·반복 일정과 참가 비용 |
| [F04-13 클럽 기금 잔액·월별 기부 차트·거래 내역](../02_feature_prds/04_club/F04-13_fund-overview_prd.md) | · | ● | · | · | · | 기금 요약·채무와 상환 |
| [F04-14 클럽 기부·내역·취소·폐쇄 반환](../02_feature_prds/04_club/F04-14_donation_prd.md) | ● | ● | · | · | · | 기부·환불·알림 |
| [F04-15 클럽 기금 출금 신청·예약·지급 상태](../02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | ● | ● | · | · | · | 예약 출금과 실제 지급·알림 |
| [F04-16 클럽 운영 구독·갱신·해지·정지·환불](../02_feature_prds/04_club/F04-16_subscription_prd.md) | · | ● | · | · | · | 클럽 구독·갱신·취소·환불 |
| [F04-17 구성인원 인구통계](../02_feature_prds/04_club/F04-17_club-demographics_prd.md) | · | · | · | · | · | 클럽 통계와 최소 집계 인원 |
| [F04-18 클럽 회원 신뢰도 점수와 공개 범위](../02_feature_prds/04_club/F04-18_club-reputation_prd.md) | · | · | · | · | ● | 클럽 신뢰 등급·경고·제재 |
| [F05-01 키워드 검색](../02_feature_prds/05_search/F05-01_keyword-search_prd.md) | · | · | · | · | ● | 유형별 검색 공개 범위와 차단 제외 |
| [F05-02 자동완성 서제스트](../02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | · | · | · | · | · | 자동완성 요청·표시·선택 |
| [F05-03 검색 필터 적용](../02_feature_prds/05_search/F05-03_search-filter_prd.md) | · | · | · | ● | · | 검색 좌표·거리 등 복합 조건 |
| [F05-04 최근 검색어](../02_feature_prds/05_search/F05-04_search-history_prd.md) | · | · | · | · | · | 기기 최근 검색어 저장·삭제 |
| [F05-05 저장된 검색](../02_feature_prds/05_search/F05-05_saved-search_prd.md) | ● | · | · | · | · | 저장한 검색 조건과 알림 설정 |
| [F06-01 지갑 메인 조회](../02_feature_prds/06_payment/F06-01_wallet-main_prd.md) | · | ● | · | · | · | 본인 지갑·유상/무상 잔액과 만료 |
| [F06-02 포인트 충전](../02_feature_prds/06_payment/F06-02_point-charge_prd.md) | ● | ● | · | · | · | 충전·실패·결과 불명과 알림 |
| [F06-03 거래 내역 조회·필터·내보내기](../02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | · | ● | · | · | · | 거래 내역·상세·충전 취소·내보내기 |
| [F06-04 결제 수단 관리](../02_feature_prds/06_payment/F06-04_payment-method_prd.md) | · | ● | · | · | · | 결제수단과 자동충전 연결 |
| [F06-05 자동 충전 설정](../02_feature_prds/06_payment/F06-05_auto-charge_prd.md) | · | ● | · | · | · | 자동충전 조건·카드·한도 |
| [F06-06 포인트 결제·환불](../02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | ● | ● | · | · | · | 포인트 결제·환불·주최자 정산과 알림 |
| [F06-07 호스팅 티켓 구매](../02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | · | ● | · | · | · | 주최 이용권 구매·소모·원거래 반환 |
| [F06-08 개인 구독 관리](../02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | · | ● | · | · | · | 개인 구독의 비용·지갑·기간 |
| [F06-09 수익 대시보드 조회](../02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | · | ● | · | · | · | 주최자 수익 조회 |
| [F06-10 정산 조회·요약·이의 제기](../02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | · | ● | · | · | ● | 주최자 정산·이의·회수 |
| [F07-01 정산 초안·첫 비용 저장·복사·계산 결과 가져오기](../02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | · | ● | · | · | · | 정산 초안·비용·복사 |
| [F07-02 정산 항목·배분 편집·영수증·최근 항목](../02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | · | ● | · | · | · | 지출·배분·영수증 |
| [F07-03 금액 검토·정산 요청·취소와 반환](../02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | ● | ● | · | · | · | 정산 요청 알림과 취소·반환 |
| [F07-04 정산 현황·금액 요약·영수증 열람](../02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | ● | ● | · | · | · | 정산 금액·상태·수납 현황과 알림의 원본 이동 |
| [F07-05 항목별 분담·송금 납부·송금 신고·포인트 반환](../02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | · | ● | · | · | · | 지갑·계좌 납부와 실제 수취인·반환 |
| [F07-06 수취 확인·일괄 확인·만료·재요청·손실 정리](../02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | · | ● | · | · | · | 수납 확인·만료·재발급·결손 처리 |
| [F07-07 다시 알림·마감 연장·알림 기록](../02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | ● | ● | · | · | · | 납부 독촉 간격·기한·발송 기록 |
| [F07-08 정산 이의제기·처리·변경 기록](../02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md) | ● | ● | · | · | ● | 정산 이의·조정 이력과 답변·판단 알림 |
| [F07-09 출시 제한 중인 정산 선입금·환불 규정](../02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | · | ● | · | · | · | 폐쇄한 모임 선결제 계약과 과거 정산 경계 |
| [F07-10 정산 계좌·내 정산·호스트 평판](../02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | · | ● | · | · | ● | 정산 계좌 확인과 정산 평판 |
| [F08-01 내 플랜 목록과 새 플랜 생성](../02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | · | ● | · | · | · | 제작·구매 플랜과 구매 권한 구분 |
| [F08-02 플랜 상세·미리보기와 관리 행동](../02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md) | · | ● | · | · | · | 유료 본문·구매자 접근·판매 중지 |
| [F08-03 플랜 블록 편집·저장·복구](../02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | · | · | · | ● | · | 위치 블록을 포함한 문서 편집·저장 |
| [F08-04 블록 순서와 계층 변경](../02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | · | · | · | · | · | 블록 트리·순서·revision 충돌 |
| [F08-05 플랜 공개와 예약 공개](../02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | ● | · | · | · | · | 발행 예약과 발행 실패 알림 |
| [F08-06 내 상품 등록·심사·판매 관리](../02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | · | ● | · | · | · | 판매 승인·상품 가격·기간 이용권 |
| [F08-07 크리에이터 프로필·판매 현황](../02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | · | ● | · | · | · | 제작자 판매·매출 통계 |
| [F08-08 마켓 메인 탐색](../02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | · | ● | · | · | · | 마켓 가격·구독·공개 범위 |
| [F08-09 마켓 키워드 검색](../02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | · | ● | · | · | · | 상품 검색·가격 조건 |
| [F08-10 마켓 상품 상세·구매 입구](../02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | · | ● | · | · | ● | 상품 가격·구매 조건과 후기 |
| [F08-11 상품·번들·플랜 구매](../02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | · | ● | · | · | · | 구매·소모·배분과 권리 생성 |
| [F08-12 내 보관함](../02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | · | ● | · | · | · | 구매 보관함·활성화·전달·환불 |
| [F08-13 구매 플랜으로 모임 만들기·후기 작성](../02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | · | ● | ● | · | ● | 구매 플랜의 이벤트 생성과 참가 후 후기 |
| [F08-14 마켓 구매 환불·부분 환불·분쟁](../02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md) | ● | ● | · | · | ● | 부분 환불·분쟁과 처리 알림 |
| [F08-15 크리에이터 매출 귀속·정산](../02_feature_prds/08_plan_market/F08-15_creator-earning-coverage_prd.md) | · | ● | · | · | · | 제작자 정산·월별 수익·회수 |
| [F09-01 본인 인증과 증빙 검토](../02_feature_prds/09_private_date/F09-01_verification_prd.md) | · | · | · | · | · | 본인인증·수동 심사와 인증 상태 |
| [F09-02 데이트 프로필 생성·편집과 사진 관리](../02_feature_prds/09_private_date/F09-02_profile_prd.md) | · | · | · | · | ● | 데이트 프로필 공개와 제재 경계 |
| [F09-03 후보 탐색과 좋아요·넘김](../02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | ● | · | · | · | ● | 후보 차단·관심/거절과 만료 알림 |
| [F09-04 매칭 목록과 대화 연결](../02_feature_prds/09_private_date/F09-04_match_list_prd.md) | · | · | · | · | ● | 매칭 목록과 현재 차단 관계 |
| [F09-05 데이트 채팅과 전송 복구](../02_feature_prds/09_private_date/F09-05_chat_prd.md) | ● | · | · | · | ● | 채팅 알림·읽음과 차단·방 접근 |
| [F09-06 만남 제안·상태 변경·본인 피드백](../02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | ● | · | ● | ● | ● | 만남 일시·장소와 완료 피드백·알림 |
| [F09-07 데이트 차단과 안전 신고](../02_feature_prds/09_private_date/F09-07_block_prd.md) | · | · | · | · | ● | 차단·안전 신고와 실시간 접근 회수 |
| [F09-08 내 데이트 프로필 방문 기록](../02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | · | · | · | · | ● | 방문자 조회의 차단 제외 |
| [F10-01 월간·일간 통합 달력](../02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | · | · | ● | · | · | 본인 통합 일정·관심인 공개 모임·가능 시간 |
| [F10-02 달력 항목과 상세 연결](../02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | · | · | ● | · | · | 달력 항목과 실제 상세 이동 |
| [F10-03 본인 가능 시간 등록·수정·삭제](../02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | · | · | ● | · | · | 본인 가능 시간 저장·삭제와 달력 갱신 |
| [F10-04 반복 가능 시간 규칙 관리](../02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | · | · | ● | · | · | 반복 가능 시간 규칙·인스턴스 |
| [F10-05 타 사용자 가능 시간 공개 기능 폐기와 비공개 경계](../02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | · | · | ● | · | · | 폐기한 타 사용자 가능 시간 공개 경계 |
| [F11-01 이벤트 후기 작성과 선택형 피드백](../02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | · | · | ● | · | ● | 이벤트 종료·참석 자격과 후기·피드백 |
| [F11-02 이벤트 후기와 사용자가 받은 후기 조회](../02_feature_prds/11_review_report/F11-02_review-list_prd.md) | · | · | · | · | ● | 받은·작성한 후기와 차단·숨김 |
| [F11-03 후기 수정과 삭제](../02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | · | · | · | · | ● | 후기 수정·삭제·재작성 제한 |
| [F11-04 신고 접수·관할 결정·본인 처리 내역](../02_feature_prds/11_review_report/F11-04_report_prd.md) | · | · | · | · | ● | 신고 대상·관할·본인 처리 내역 |
| [F11-05 신뢰점수 계산과 본인 변동 이력](../02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | · | · | · | · | ● | 본인 신뢰점수와 변동 이력 |
| [F11-06 본인 취향 프로필과 선언 선호 관리](../02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | · | · | · | · | ● | 선호·피드백 기반 취향 프로필 |
| [F11-07 호스트 후기 답변과 임시 숨김](../02_feature_prds/11_review_report/F11-07_review-moderation_prd.md) | · | · | · | · | ● | 호스트 답변·신고와 후기 임시 숨김 |
| [F12-01 알림 목록 조회 & 읽음 관리](../02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | ● | · | · | · | · | 알림 목록·읽음·업무 이동 |
| [F12-02 알림 그룹 보기 & 미읽음 배지](../02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | ● | · | · | · | · | 알림 그룹과 미읽음 배지 |
| [F12-03 카테고리별 알림 설정](../02_feature_prds/12_notification/F12-03_category-settings_prd.md) | ● | · | · | · | · | 카테고리별 푸시·알림함·이메일 설정 |
| [F12-04 방해금지 시간 설정](../02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | ● | · | · | · | · | 방해금지 시간과 알림 제한 |
| [F12-05 푸시 기기 관리](../02_feature_prds/12_notification/F12-05_device-token-management_prd.md) | ● | · | · | · | · | 로그인 세션별 푸시 기기 관리 |
| [F12-06 알림 권한 인라인 안내 배너](../02_feature_prds/12_notification/F12-06_permission-banner_prd.md) | ● | · | · | · | · | OS 알림 권한 안내와 복귀 |
| [F13-01 내·타인 프로필과 작성 글](../02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | · | · | · | · | ● | 프로필의 받은 후기·작성 글·만난 사람 |
| [F13-02 프로필 수정](../02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | · | · | · | · | · | 본인 프로필·사진 저장 |
| [F13-03 다중 주소 관리](../02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | · | · | · | ● | · | 주소·좌표·기본 주소 |
| [F13-04 선호 태그 관리](../02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | · | · | · | · | · | 본인 선호 태그 관리 |
| [F13-05 데이터 내보내기](../02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | ● | ● | · | ● | ● | 내보내기에 포함되는 알림·금전·위치·신뢰 자료 |
| [F13-06 계정 삭제 요청과 취소](../02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | ● | ● | · | · | ● | 금전·분쟁 의무와 삭제 예약·취소·자료 보류 |
| [F13-07 계정 즉시 탈퇴](../02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | ● | ● | · | · | ● | 탈퇴 금전 의무·제재·분쟁과 기기 정리 |
| [F14-01 이벤트 위치 공유와 조회](../02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | ● | · | ● | ● | · | 이벤트 시간에 따른 위치 공유·조회·알림 |
| [F14-02 위치 공유 중단과 이벤트 설정](../02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | ● | · | · | ● | · | 공유 철회·이벤트 설정 변경과 알림 |
| [F14-03 위치 공유 만료와 연장](../02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | ● | · | · | ● | · | 공유 만료·연장과 예고 알림 |
| [F14-04 이벤트 위치 개인정보와 열람 기록](../02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | · | · | · | ● | · | 본인 위치 열람 기록과 개인정보 설정 |
| [F14-05 이벤트 길찾기와 참석자 거리](../02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | · | · | · | ● | · | 길찾기·출발점·거리·외부 지도 |
| [F14-06 주소 변환과 장소 검색](../02_feature_prds/14_location_directions/F14-06_reverse-geocoding_prd.md) | · | · | · | ● | · | 주소·좌표 변환과 장소 검색 |
| [F15-01 내 경고 현황과 원장](../02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md) | · | · | · | · | ● | 본인 경고 원장·제재 표시 |
| [F15-02 클럽 경고 제보와 본인 관리](../02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md) | ● | · | · | · | ● | 경고 제보·철회와 절차 알림 |
| [F15-03 회원의 경고 이의제기](../02_feature_prds/15_warning/F15-03_appeal_prd.md) | ● | · | · | · | ● | 경고 이의제기·재제출과 절차 알림 |
| [F15-04 경고 정책과 패널티 유형 설정](../02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md) | · | · | · | · | ● | 경고 정책·패널티·재계산 |
| [F15-05 클럽 경고 제보 심사](../02_feature_prds/15_warning/F15-05_report-review_prd.md) | ● | · | · | · | ● | 경고 제보 심사·추가 요청과 알림 |
| [F15-06 경고 부여와 원장 조정](../02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md) | ● | · | · | · | ● | 경고 부여·감경·원장과 알림 |
| [F15-07 경고 이의제기 처리와 재제출 허용](../02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md) | ● | · | · | · | ● | 경고 이의 처리·재제출 허용과 알림 |
| [F15-08 클럽·플랫폼 제재와 계정 제한](../02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md) | ● | · | · | · | ● | 클럽·플랫폼 제재·강제 탈퇴와 알림 |
| [F15-09 검토 큐·대시보드·통계와 감사 로그](../02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md) | · | · | · | · | ● | 제보·이의 검토 큐와 감사 기록 |
| [F16-01 내 마일리지·원장·월간 영수증](../02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md) | · | · | · | · | · | 마일리지 원장·월간 집계; 현금 잔액과 구분 |
| [F16-02 등급·배지·랭킹·프로필 카드](../02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md) | · | · | · | · | · | 등급·배지·랭킹; 신뢰점수와 구분 |
| [F16-03 시즌 조회·순위 확정·재시도](../02_feature_prds/16_mileage/F16-03_season_prd.md) | · | · | · | · | · | 마일리지 시즌·순위 확정; 개인 달력과 구분 |
| [F16-04 마일리지 제도 설정·변경 미리보기](../02_feature_prds/16_mileage/F16-04_policy-config_prd.md) | · | · | · | · | · | 마일리지 제도 설정과 미리보기 |
| [F16-05 적립 규칙·등급·배지·차감 사유·시즌 관리](../02_feature_prds/16_mileage/F16-05_policy-presets_prd.md) | · | · | · | · | · | 적립 규칙·등급·배지·시즌 관리 |
| [F16-06 마일리지 적립·차감·정정·배지 집행](../02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md) | ● | · | · | · | · | 마일리지 집행·정정과 알림 |
| [F16-07 호스트 적립 제안·승인·반려](../02_feature_prds/16_mileage/F16-07_host-proposal_prd.md) | ● | · | · | · | · | 호스트 적립 제안·승인·반려 알림 |
| [F16-08 검토 대기열·대시보드·감사 기록](../02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md) | · | · | · | · | · | 마일리지 검토 큐·집계·감사 |
| [F17-01 정기모임 발견·운영·참여 목록](../02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md) | · | · | ● | · | · | 공개·운영·참여 목록의 회차 일정 |
| [F17-02 정기모임 상세·참여 상태·회차 정보](../02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md) | · | ● | ● | · | ● | 회차 일정·참가비·참여 상태·후기 연결 |
| [F17-03 정기모임 생성·기본 정보 수정](../02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md) | · | ● | · | ● | · | 정기모임 기본 장소·가격과 초안 |
| [F17-04 정기모임 공개·종료·취소·호스트 변경](../02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md) | ● | ● | · | · | · | 정기모임 공개·종료·취소·환불·알림 |
| [F17-05 정기모임 회차 생성·반복·대체·취소](../02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md) | · | ● | ● | · | · | 회차 생성·반복·대체·취소와 가격 |
| [F17-06 정기모임 등록·승인·대기·취소](../02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md) | ● | ● | ● | · | · | 등록·승인·대기·취소와 납부·회차 참석 |
| [F17-07 정기모임 회비 납부·입금 확인](../02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md) | ● | ● | · | · | · | 회비 지갑·계좌 납부와 확인·알림 |
| [F17-08 정기모임 환불·증빙·실패 복구](../02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md) | ● | ● | · | · | · | 회비 환불·증빙·복구와 완료·호스트 조치 알림 |
| [F17-09 정기모임 출석 확정·노쇼·등록 박탈](../02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md) | ● | ● | · | · | ● | 출석·노쇼·등록 박탈과 환불·알림 |
| [F17-10 정기모임 수익 정산·보류·조회](../02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md) | · | ● | · | · | · | 수익 정산·실패 환불·보류 |
| [F18-01 통합 분쟁 조회·당사자 대화·종결 경계](../02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md) | ● | ● | · | · | ● | 분쟁 조회·당사자 대화·금전 원천·절차 알림 |
| [F18-02 사용자 분쟁 접수·출처 연결·초안 복구](../02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md) | · | ● | · | · | ● | 사용자 분쟁 접수와 금전 원천·상대 연결 |
| [F18-03 분쟁 이의 접수·공개 조건·철회](../02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md) | ● | ● | · | · | ● | 분쟁 이의·원천 보류·보상 경계와 알림 |
| [F18-04 분쟁 증거 열람·보존·파일 정리](../02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md) | ● | · | · | · | ● | 분쟁 증빙 보존·공개와 알림 자료 보류 |
| [F18-05 호스트 처리함·아홉 출처·업무 이동](../02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md) | · | ● | · | · | ● | 호스트 처리함의 금전·노쇼·운영 분쟁 |
| [F19-01 관심인 등록·해제·한도](../02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md) | · | · | · | · | · | 관심인 등록·해제·활성 수 제한 |
| [F19-02 관심인 캘린더·새 이벤트 알림](../02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md) | ● | · | ● | · | · | 관심인 공개 모임 달력과 새 이벤트 알림 |
| [F19-03 공개범위(프라이버시) 설정](../02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md) | · | · | ● | · | · | 공개 모임·관심인 달력 노출의 프라이버시 |
| [F20-01 작성자 문의·호스트 응대·관할 이관](../02_feature_prds/20_support/F20-01_inquiry_prd.md) | ● | · | · | · | ● | 문의 응대·분쟁 출처·관할 이관과 알림 |
| [F20-02 원천별 운영 이슈·증빙·처리 대화](../02_feature_prds/20_support/F20-02_operational-issue_prd.md) | ● | ● | · | · | ● | 금전·운영 원천 이슈·증빙·대화와 알림 |
| [F20-03 출처별 지원 FAQ·검색·실패 복구](../02_feature_prds/20_support/F20-03_support-faq_prd.md) | · | · | · | · | · | 출처별 지원 FAQ와 검색·재시도 |
| [F21-01 제공자 배정·프로필·상품·계약조건](../02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | ● | ● | · | · | · | 제공자 계약조건·상품 가격·배정과 심사 알림 |
| [F21-02 참가자 서비스 이용료 첫 납부·추가 납부·자동 분담](../02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | ● | ● | · | · | · | 참가자 서비스 이용료·추가 납부·자동 분담과 알림 |
| [F21-03 제공자 정산 확정·주간 지급·지급 재처리](../02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | ● | ● | · | · | · | 제공자 정산·주간 지급·상계와 알림 |
| [F21-04 무료 제외·되돌리기·호스트 대납](../02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md) | · | ● | · | · | · | 무료 제외·되돌리기·호스트 대납 |
| [F21-05 제공자 이용료 환불·정산 후 회수·배정 종료](../02_feature_prds/21_curated/F21-05_refund-clawback_prd.md) | ● | ● | · | · | · | 이용료 환불·정산 후 회수·배정 종료와 알림 |
| [F21-06 수락 조건의 계약금 선납·적용·취소](../02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md) | · | ● | · | · | · | 계약금 선납·적용·취소와 귀속 |
| [F21-07 정기모임 묶음 배정·정산](../02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md) | ● | ● | ● | · | · | 회차별 묶음 배정·정산·승계와 요청 알림 |

<a id="3-검토-순서"></a>
## 검토 순서

1. 바뀌는 입력·상태·대상·권한·원천을 해당 기능 정본에서 확인한다.
2. 표시된 영역의 실제 생성·조회·설정·연결 조건을 따라 관련 정책과 기능을 읽는다. 표시 개수나 색의 진하기로 위험도·시험량을 정하지 않는다.
3. 표시가 없는 영역도 이번 변경이 새 연결을 만드는지 판단한다. 다섯 열 밖의 개인정보·마일리지·스탬프·파일·세션·동시 처리·복구를 빠뜨리지 않는다.
4. 정본의 조건을 먼저 고치고 이 표와 공개 HTML의 분류·이유를 함께 맞춘다. 외부 연동·실기기 확인은 실제로 필요한 주장에만 대응시킨다.

검사 방법과 범위는 [예외와 경계 검토](09_exceptions_edge_cases.md)를 따른다. 공개 표의 검색·도메인·복수 분류 필터는 [기능별 영향 페이지](../../docs/features/impact.html)에서 제공한다.
