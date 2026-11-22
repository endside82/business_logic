# 175개 기능의 시나리오·도식 인덱스

<!-- release-document: reference -->
> 2026-11-22 현재 기능 정본과 문서 목록을 대조했다. 문서 대조·등록 항목 수와 제품 시험·외부 환경·출시 승인은 다르다. 실행 순서는 [앞으로 할 일](../../docs/plan/NEXT_WORK.md)을 따른다.

<!-- derived-from: prd/04_qa_acceptance/acceptance_criteria_matrix.md; sha256: 6f233d0cd0f480b8b15b03b1a7b64bc8eb361ca0c065de0836e0ecc530fa9da8 -->

## 숫자의 의미

전체 175개 기능의 목록 등록 확인 항목은 1,654개다. 별도 상세 시나리오 문서 117개의 제목은 1,276개이고 이 117개 문서의 units/diagrams.md에는 Mermaid 블록이 120개 있다. 별도 units가 없는 58개 기능은 해당 기능 PRD를 읽는다. 이 표의 ‘없음’은 미구현·시험 부재·0% 커버리지 판정이 아니다.

F12-02는 정본 수용 기준과 등록값이 6개이고 상세 문서에는 기존 조건을 풀어 쓴 E2E-derived 제목이 있어 7개다. 숫자를 억지로 일치시키거나 모든 제목을 새 시험 통과로 세지 않는다. 카드 작성 여부도 제품 완성 여부와 다르다.

## 01. 인증 & 온보딩

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F01-01 이메일 회원가입 & 로그인](../prd/02_feature_prds/01_auth_onboarding/F01-01_email-signup-login_prd.md) | 8 | 8개 · [이메일 회원가입 & 로그인 시나리오](../units/01_auth_onboarding/F01-01_email-signup-login/scenarios.md) | 1 |
| [F01-02 소셜 로그인](../prd/02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | 9 | 9개 · [소셜 로그인 시나리오](../units/01_auth_onboarding/F01-02_social-login/scenarios.md) | 1 |
| [F01-03 이메일 인증](../prd/02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | 8 | 8개 · [이메일 인증 시나리오](../units/01_auth_onboarding/F01-03_email-verification/scenarios.md) | 1 |
| [F01-04 비밀번호 재설정](../prd/02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | 8 | 8개 · [비밀번호 재설정 시나리오](../units/01_auth_onboarding/F01-04_password-reset/scenarios.md) | 1 |
| [F01-05 토큰 갱신 & 로그아웃](../prd/02_feature_prds/01_auth_onboarding/F01-05_token-refresh-logout_prd.md) | 9 | 9개 · [토큰 갱신 & 로그아웃 시나리오](../units/01_auth_onboarding/F01-05_token-refresh-logout/scenarios.md) | 1 |
| [F01-06 온보딩](../prd/02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | 10 | 10개 · [온보딩 시나리오](../units/01_auth_onboarding/F01-06_onboarding/scenarios.md) | 1 |
| [F01-07 관심사 태그 관리](../prd/02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | 10 | 10개 · [관심사 태그 관리 시나리오](../units/01_auth_onboarding/F01-07_preference-tags/scenarios.md) | 1 |
| [F01-08 소셜 계정 연결 해제](../prd/02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | 8 | 8개 · [소셜 계정 연결 해제 시나리오](../units/01_auth_onboarding/F01-08_social-unlink/scenarios.md) | 1 |

## 02. 홈 피드

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F02-01 홈 피드 메인 조회](../prd/02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | 10 | 10개 · [홈 피드 메인 조회 시나리오](../units/02_home_feed/F02-01_home-feed-main/scenarios.md) | 1 |
| [F02-02 홈 피드 새로고침](../prd/02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | 10 | 10개 · [홈 피드 새로고침 시나리오](../units/02_home_feed/F02-02_home-feed-refresh/scenarios.md) | 1 |
| [F02-03 섹션 카드 진입](../prd/02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | 10 | 10개 · [섹션 카드 진입 시나리오](../units/02_home_feed/F02-03_section-card-entry/scenarios.md) | 1 |
| [F02-04 추천 이벤트 더보기·필터·무한스크롤](../prd/02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | 10 | 10개 · [추천 이벤트 더보기·필터·무한스크롤 시나리오](../units/02_home_feed/F02-04_recommend-events-more/scenarios.md) | 1 |
| [F02-05 검색·알림 진입점](../prd/02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | 8 | 8개 · [검색·알림 진입점 시나리오](../units/02_home_feed/F02-05_search-notification-entry/scenarios.md) | 1 |

## 03. 이벤트

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F03-01 이벤트 발견과 탐색](../prd/02_feature_prds/03_event/F03-01_event-discovery_prd.md) | 14 | 14개 · [이벤트 발견과 탐색 시나리오](../units/03_event/F03-01_event-discovery/scenarios.md) | 1 |
| [F03-02 이벤트 상세 조회](../prd/02_feature_prds/03_event/F03-02_event-detail_prd.md) | 12 | 12개 · [이벤트 상세 조회 시나리오](../units/03_event/F03-02_event-detail/scenarios.md) | 1 |
| [F03-03 이벤트 생성과 다음 일정·반복 일정](../prd/02_feature_prds/03_event/F03-03_event-creation_prd.md) | 16 | 16개 · [이벤트 생성과 다음 일정·반복 일정 시나리오](../units/03_event/F03-03_event-creation/scenarios.md) | 1 |
| [F03-04 이벤트 수정·공개·종료·취소](../prd/02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | 17 | 17개 · [이벤트 수정·공개·종료·취소 시나리오](../units/03_event/F03-04_event-lifecycle/scenarios.md) | 1 |
| [F03-05 이벤트 신청·참석·본인 취소](../prd/02_feature_prds/03_event/F03-05_event-attendance_prd.md) | 14 | 14개 · [이벤트 신청·참석·본인 취소 시나리오](../units/03_event/F03-05_event-attendance/scenarios.md) | 1 |
| [F03-06 신청서 승인·거절과 일괄 처리](../prd/02_feature_prds/03_event/F03-06_application-review_prd.md) | 13 | 13개 · [신청서 승인·거절과 일괄 처리 시나리오](../units/03_event/F03-06_application-review/scenarios.md) | 1 |
| [F03-07 정원 설정·대기열·모집 관리](../prd/02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | 14 | 14개 · [정원 설정·대기열·모집 관리 시나리오](../units/03_event/F03-07_capacity-and-waitlist/scenarios.md) | 1 |
| [F03-08 QR·코드·직접 체크인](../prd/02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | 15 | 15개 · [QR·코드·직접 체크인 시나리오](../units/03_event/F03-08_qr-checkin/scenarios.md) | 1 |
| [F03-09 이벤트 사진첩](../prd/02_feature_prds/03_event/F03-09_event-photos_prd.md) | 17 | 17개 · [이벤트 사진첩 시나리오](../units/03_event/F03-09_event-photos/scenarios.md) | 1 |
| [F03-10 이벤트와 플랜 연결](../prd/02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | 14 | 14개 · [이벤트와 플랜 연결 시나리오](../units/03_event/F03-10_event-plan-link/scenarios.md) | 1 |
| [F03-11 찜한 이벤트](../prd/02_feature_prds/03_event/F03-11_wishlist_prd.md) | 12 | 12개 · [찜한 이벤트 시나리오](../units/03_event/F03-11_wishlist/scenarios.md) | 1 |
| [F03-12 내 이벤트와 참석 변경 기록](../prd/02_feature_prds/03_event/F03-12_my-events_prd.md) | 14 | 14개 · [내 이벤트와 참석 변경 기록 시나리오](../units/03_event/F03-12_my-events/scenarios.md) | 1 |
| [F03-13 이벤트 참가비 선입금·은행 확인·환불 기록](../prd/02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | 0 | 별도 문서 없음 | — |
| [F03-14 이동수단 공통 설정](../prd/02_feature_prds/03_event/F03-14_event-transport-mode_prd.md) | 0 | 별도 문서 없음 | — |
| [F03-15 카풀 지원·개별 이동](../prd/02_feature_prds/03_event/F03-15_event-carpool_prd.md) | 0 | 별도 문서 없음 | — |
| [F03-16 대절 버스와 자리 배정](../prd/02_feature_prds/03_event/F03-16_event-bus-charter_prd.md) | 0 | 별도 문서 없음 | — |
| [F03-17 차량 좌석 배치도 운영](../prd/02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | 0 | 별도 문서 없음 | — |
| [F03-18 이벤트 구성 통계](../prd/02_feature_prds/03_event/F03-18_event-demographics_prd.md) | 0 | 별도 문서 없음 | — |
| [F03-19 일정 변경 제안·참가자 합의 (RS-002)](../prd/02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | 0 | 별도 문서 없음 | — |
| [F03-20 이벤트 노쇼 관리](../prd/02_feature_prds/03_event/F03-20_event-no-show_prd.md) | 0 | 별도 문서 없음 | — |

## 04. 클럽

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F04-01 클럽 발견 & 탐색](../prd/02_feature_prds/04_club/F04-01_club-discovery_prd.md) | 12 | 12개 · [클럽 발견 & 탐색 시나리오](../units/04_club/F04-01_club-discovery/scenarios.md) | 1 |
| [F04-02 클럽 상세와 가입·탈퇴](../prd/02_feature_prds/04_club/F04-02_club-detail-join_prd.md) | 17 | 17개 · [클럽 상세와 가입·탈퇴 시나리오](../units/04_club/F04-02_club-detail-join/scenarios.md) | 1 |
| [F04-03 클럽 생성·수정·폐쇄와 소유권 이전](../prd/02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | 20 | 20개 · [클럽 생성·수정·폐쇄와 소유권 이전 시나리오](../units/04_club/F04-03_club-crud-transfer/scenarios.md) | 1 |
| [F04-04 회원 목록·역할·권한 위임과 강퇴](../prd/02_feature_prds/04_club/F04-04_member-management_prd.md) | 17 | 17개 · [회원 목록·역할·권한 위임과 강퇴 시나리오](../units/04_club/F04-04_member-management/scenarios.md) | 1 |
| [F04-05 가입 신청 처리·초대 발송과 받은 초대](../prd/02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | 18 | 18개 · [가입 신청 처리·초대 발송과 받은 초대 시나리오](../units/04_club/F04-05_waitlist-invitation/scenarios.md) | 1 |
| [F04-06 클럽 차단·기간·해제 관리](../prd/02_feature_prds/04_club/F04-06_ban-management_prd.md) | 13 | 13개 · [클럽 차단·기간·해제 관리 시나리오](../units/04_club/F04-06_ban-management/scenarios.md) | 1 |
| [F04-07 내 클럽 목록과 회원 활동 통계](../prd/02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | 12 | 12개 · [내 클럽 목록과 회원 활동 통계 시나리오](../units/04_club/F04-07_my-clubs-stats/scenarios.md) | 1 |
| [F04-08 게시판·게시글·예약·초안과 작성 글 모아 보기](../prd/02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | 16 | 16개 · [게시판·게시글·예약·초안과 작성 글 모아 보기 시나리오](../units/04_club/F04-08_board-post-crud/scenarios.md) | 1 |
| [F04-09 게시글 댓글·답글·멘션과 대상 댓글 찾기](../prd/02_feature_prds/04_club/F04-09_post-comments_prd.md) | 16 | 16개 · [게시글 댓글·답글·멘션과 대상 댓글 찾기 시나리오](../units/04_club/F04-09_post-comments/scenarios.md) | 1 |
| [F04-10 공지 읽기·작성·수정과 예약 게시](../prd/02_feature_prds/04_club/F04-10_announcements_prd.md) | 15 | 15개 · [공지 읽기·작성·수정과 예약 게시 시나리오](../units/04_club/F04-10_announcements/scenarios.md) | 1 |
| [F04-11 클럽 사진첩·등록 복구·공개 범위·댓글](../prd/02_feature_prds/04_club/F04-11_photo-album_prd.md) | 20 | 20개 · [클럽 사진첩·등록 복구·공개 범위·댓글 시나리오](../units/04_club/F04-11_photo-album/scenarios.md) | 1 |
| [F04-12 클럽 모임·캘린더·통계·반복 초안](../prd/02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | 20 | 20개 · [클럽 모임·캘린더·통계·반복 초안 시나리오](../units/04_club/F04-12_club-events-calendar/scenarios.md) | 1 |
| [F04-13 클럽 기금 잔액·월별 기부 차트·거래 내역](../prd/02_feature_prds/04_club/F04-13_fund-overview_prd.md) | 10 | 10개 · [클럽 기금 잔액·월별 기부 차트·거래 내역 시나리오](../units/04_club/F04-13_fund-overview/scenarios.md) | 1 |
| [F04-14 클럽 기부·내역·취소·폐쇄 반환](../prd/02_feature_prds/04_club/F04-14_donation_prd.md) | 14 | 14개 · [클럽 기부·내역·취소·폐쇄 반환 시나리오](../units/04_club/F04-14_donation/scenarios.md) | 1 |
| [F04-15 클럽 기금 출금 신청·예약·지급 상태](../prd/02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | 12 | 12개 · [클럽 기금 출금 신청·예약·지급 상태 시나리오](../units/04_club/F04-15_fund-withdrawal/scenarios.md) | 1 |
| [F04-16 클럽 운영 구독·갱신·해지·정지·환불](../prd/02_feature_prds/04_club/F04-16_subscription_prd.md) | 18 | 18개 · [클럽 운영 구독·갱신·해지·정지·환불 시나리오](../units/04_club/F04-16_subscription/scenarios.md) | 1 |
| [F04-17 구성인원 인구통계](../prd/02_feature_prds/04_club/F04-17_club-demographics_prd.md) | 0 | 별도 문서 없음 | — |
| [F04-18 클럽 회원 신뢰도 점수와 공개 범위](../prd/02_feature_prds/04_club/F04-18_club-reputation_prd.md) | 10 | 별도 문서 없음 | — |

## 05. 검색

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F05-01 키워드 검색](../prd/02_feature_prds/05_search/F05-01_keyword-search_prd.md) | 10 | 10개 · [키워드 검색 시나리오](../units/05_search/F05-01_keyword-search/scenarios.md) | 1 |
| [F05-02 자동완성 서제스트](../prd/02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | 10 | 10개 · [자동완성 서제스트 시나리오](../units/05_search/F05-02_autocomplete-suggest/scenarios.md) | 1 |
| [F05-03 검색 필터 적용](../prd/02_feature_prds/05_search/F05-03_search-filter_prd.md) | 10 | 10개 · [검색 필터 적용 시나리오](../units/05_search/F05-03_search-filter/scenarios.md) | 1 |
| [F05-04 최근 검색어](../prd/02_feature_prds/05_search/F05-04_search-history_prd.md) | 10 | 10개 · [최근 검색어 시나리오](../units/05_search/F05-04_search-history/scenarios.md) | 1 |
| [F05-05 저장된 검색](../prd/02_feature_prds/05_search/F05-05_saved-search_prd.md) | 10 | 10개 · [저장된 검색 시나리오](../units/05_search/F05-05_saved-search/scenarios.md) | 1 |

## 06. 결제 & 지갑

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F06-01 지갑 메인 조회](../prd/02_feature_prds/06_payment/F06-01_wallet-main_prd.md) | 8 | 8개 · [지갑 메인 조회 시나리오](../units/06_payment/F06-01_wallet-main/scenarios.md) | 1 |
| [F06-02 포인트 충전](../prd/02_feature_prds/06_payment/F06-02_point-charge_prd.md) | 11 | 11개 · [포인트 충전 시나리오](../units/06_payment/F06-02_point-charge/scenarios.md) | 1 |
| [F06-03 거래 내역 조회·필터·내보내기](../prd/02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | 12 | 12개 · [거래 내역 조회·필터·내보내기 시나리오](../units/06_payment/F06-03_transaction-history/scenarios.md) | 1 |
| [F06-04 결제 수단 관리](../prd/02_feature_prds/06_payment/F06-04_payment-method_prd.md) | 9 | 9개 · [결제 수단 관리 시나리오](../units/06_payment/F06-04_payment-method/scenarios.md) | 1 |
| [F06-05 자동 충전 설정](../prd/02_feature_prds/06_payment/F06-05_auto-charge_prd.md) | 11 | 11개 · [자동 충전 설정 시나리오](../units/06_payment/F06-05_auto-charge/scenarios.md) | 1 |
| [F06-06 포인트 결제·환불](../prd/02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | 12 | 12개 · [포인트 결제·환불 시나리오](../units/06_payment/F06-06_point-pay-refund/scenarios.md) | 1 |
| [F06-07 호스팅 티켓 구매](../prd/02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | 10 | 10개 · [호스팅 티켓 구매 시나리오](../units/06_payment/F06-07_hosting-ticket/scenarios.md) | 1 |
| [F06-08 개인 구독 관리](../prd/02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | 11 | 11개 · [개인 구독 관리 시나리오](../units/06_payment/F06-08_personal-subscription/scenarios.md) | 1 |
| [F06-09 수익 대시보드 조회](../prd/02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | 10 | 10개 · [수익 대시보드 조회 시나리오](../units/06_payment/F06-09_earnings-dashboard/scenarios.md) | 1 |
| [F06-10 정산 조회·요약·이의 제기](../prd/02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | 12 | 12개 · [정산 조회·요약·이의 제기 시나리오](../units/06_payment/F06-10_settlement-appeal/scenarios.md) | 1 |

## 07. 모임 정산

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F07-01 정산 초안·첫 비용 저장·복사·계산 결과 가져오기](../prd/02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | 15 | 15개 · [정산 초안·첫 비용 저장·복사·계산 결과 가져오기 시나리오](../units/07_meeting_settlement/F07-01_create-settlement/scenarios.md) | 1 |
| [F07-02 정산 항목·배분 편집·영수증·최근 항목](../prd/02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | 14 | 14개 · [정산 항목·배분 편집·영수증·최근 항목 시나리오](../units/07_meeting_settlement/F07-02_settlement-items/scenarios.md) | 1 |
| [F07-03 금액 검토·정산 요청·취소와 반환](../prd/02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | 16 | 16개 · [금액 검토·정산 요청·취소와 반환 시나리오](../units/07_meeting_settlement/F07-03_activate-cancel/scenarios.md) | 1 |
| [F07-04 정산 현황·금액 요약·영수증 열람](../prd/02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | 14 | 14개 · [정산 현황·금액 요약·영수증 열람 시나리오](../units/07_meeting_settlement/F07-04_status-summary-receipt/scenarios.md) | 1 |
| [F07-05 항목별 분담·송금 납부·송금 신고·포인트 반환](../prd/02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | 17 | 17개 · [항목별 분담·송금 납부·송금 신고·포인트 반환 시나리오](../units/07_meeting_settlement/F07-05_pay-share/scenarios.md) | 1 |
| [F07-06 수취 확인·일괄 확인·만료·재요청·손실 정리](../prd/02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | 16 | 16개 · [수취 확인·일괄 확인·만료·재요청·손실 정리 시나리오](../units/07_meeting_settlement/F07-06_host-confirm-transfers/scenarios.md) | 1 |
| [F07-07 다시 알림·마감 연장·알림 기록](../prd/02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | 12 | 12개 · [다시 알림·마감 연장·알림 기록 시나리오](../units/07_meeting_settlement/F07-07_remind-extend/scenarios.md) | 1 |
| [F07-08 정산 이의제기·처리·변경 기록](../prd/02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md) | 14 | 14개 · [정산 이의제기·처리·변경 기록 시나리오](../units/07_meeting_settlement/F07-08_appeal-audit/scenarios.md) | 1 |
| [F07-09 출시 제한 중인 정산 선입금·환불 규정](../prd/02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | 10 | 10개 · [출시 제한 중인 정산 선입금·환불 규정 시나리오](../units/07_meeting_settlement/F07-09_prepayment-refund/scenarios.md) | 1 |
| [F07-10 정산 계좌·내 정산·호스트 평판](../prd/02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | 18 | 18개 · [정산 계좌·내 정산·호스트 평판 시나리오](../units/07_meeting_settlement/F07-10_account-history-reputation/scenarios.md) | 1 |

## 08. 플랜 마켓

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F08-01 내 플랜 목록과 새 플랜 생성](../prd/02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | 9 | 9개 · [내 플랜 목록과 새 플랜 생성 시나리오](../units/08_plan_market/F08-01_my-plan-list/scenarios.md) | 1 |
| [F08-02 플랜 상세·미리보기와 관리 행동](../prd/02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md) | 12 | 12개 · [플랜 상세·미리보기와 관리 행동 시나리오](../units/08_plan_market/F08-02_plan-detail/scenarios.md) | 1 |
| [F08-03 플랜 블록 편집·저장·복구](../prd/02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | 12 | 12개 · [플랜 블록 편집·저장·복구 시나리오](../units/08_plan_market/F08-03_block-editor/scenarios.md) | 1 |
| [F08-04 블록 순서와 계층 변경](../prd/02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | 10 | 10개 · [블록 순서와 계층 변경 시나리오](../units/08_plan_market/F08-04_block-reorder/scenarios.md) | 1 |
| [F08-05 플랜 공개와 예약 공개](../prd/02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | 13 | 13개 · [플랜 공개와 예약 공개 시나리오](../units/08_plan_market/F08-05_plan-publish/scenarios.md) | 1 |
| [F08-06 내 상품 등록·심사·판매 관리](../prd/02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | 15 | 15개 · [내 상품 등록·심사·판매 관리 시나리오](../units/08_plan_market/F08-06_market-item-management/scenarios.md) | 1 |
| [F08-07 크리에이터 프로필·판매 현황](../prd/02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | 11 | 11개 · [크리에이터 프로필·판매 현황 시나리오](../units/08_plan_market/F08-07_creator-profile-stats/scenarios.md) | 1 |
| [F08-08 마켓 메인 탐색](../prd/02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | 11 | 11개 · [마켓 메인 탐색 시나리오](../units/08_plan_market/F08-08_market-main-browse/scenarios.md) | 1 |
| [F08-09 마켓 키워드 검색](../prd/02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | 10 | 10개 · [마켓 키워드 검색 시나리오](../units/08_plan_market/F08-09_market-search/scenarios.md) | 1 |
| [F08-10 마켓 상품 상세·구매 입구](../prd/02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | 12 | 12개 · [마켓 상품 상세·구매 입구 시나리오](../units/08_plan_market/F08-10_market-item-detail/scenarios.md) | 1 |
| [F08-11 상품·번들·플랜 구매](../prd/02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | 14 | 14개 · [상품·번들·플랜 구매 시나리오](../units/08_plan_market/F08-11_purchase/scenarios.md) | 1 |
| [F08-12 내 보관함](../prd/02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | 11 | 11개 · [내 보관함 시나리오](../units/08_plan_market/F08-12_my-collection/scenarios.md) | 1 |
| [F08-13 구매 플랜으로 모임 만들기·후기 작성](../prd/02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | 10 | 10개 · [구매 플랜으로 모임 만들기·후기 작성 시나리오](../units/08_plan_market/F08-13_plan-event-and-review/scenarios.md) | 1 |
| [F08-14 마켓 구매 환불·부분 환불·분쟁](../prd/02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md) | 12 | 별도 문서 없음 | — |
| [F08-15 크리에이터 매출 귀속·정산](../prd/02_feature_prds/08_plan_market/F08-15_creator-earning-coverage_prd.md) | 10 | 별도 문서 없음 | — |

## 09. 프라이빗 데이팅

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F09-01 본인 인증과 증빙 검토](../prd/02_feature_prds/09_private_date/F09-01_verification_prd.md) | 7 | 7개 · [본인 인증과 증빙 검토 시나리오](../units/09_private_date/F09-01_verification/scenarios.md) | 1 |
| [F09-02 데이트 프로필 생성·편집과 사진 관리](../prd/02_feature_prds/09_private_date/F09-02_profile_prd.md) | 7 | 7개 · [데이트 프로필 생성·편집과 사진 관리 시나리오](../units/09_private_date/F09-02_profile/scenarios.md) | 1 |
| [F09-03 후보 탐색과 좋아요·넘김](../prd/02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | 7 | 7개 · [후보 탐색과 좋아요·넘김 시나리오](../units/09_private_date/F09-03_candidate_swipe/scenarios.md) | 1 |
| [F09-04 매칭 목록과 대화 연결](../prd/02_feature_prds/09_private_date/F09-04_match_list_prd.md) | 5 | 5개 · [매칭 목록과 대화 연결 시나리오](../units/09_private_date/F09-04_match_list/scenarios.md) | 1 |
| [F09-05 데이트 채팅과 전송 복구](../prd/02_feature_prds/09_private_date/F09-05_chat_prd.md) | 7 | 7개 · [데이트 채팅과 전송 복구 시나리오](../units/09_private_date/F09-05_chat/scenarios.md) | 1 |
| [F09-06 만남 제안·상태 변경·본인 피드백](../prd/02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | 7 | 7개 · [만남 제안·상태 변경·본인 피드백 시나리오](../units/09_private_date/F09-06_meeting_proposal/scenarios.md) | 1 |
| [F09-07 데이트 차단과 안전 신고](../prd/02_feature_prds/09_private_date/F09-07_block_prd.md) | 6 | 6개 · [데이트 차단과 안전 신고 시나리오](../units/09_private_date/F09-07_block/scenarios.md) | 1 |
| [F09-08 내 데이트 프로필 방문 기록](../prd/02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | 5 | 5개 · [내 데이트 프로필 방문 기록 시나리오](../units/09_private_date/F09-08_profile_views/scenarios.md) | 1 |

## 10. 캘린더

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F10-01 월간·일간 통합 달력](../prd/02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | 8 | 8개 · [월간·일간 통합 달력 시나리오](../units/10_calendar/F10-01_unified-calendar-view/scenarios.md) | 1 |
| [F10-02 달력 항목과 상세 연결](../prd/02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | 6 | 6개 · [달력 항목과 상세 연결 시나리오](../units/10_calendar/F10-02_calendar-item-routing/scenarios.md) | 1 |
| [F10-03 본인 가능 시간 등록·수정·삭제](../prd/02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | 9 | 9개 · [본인 가능 시간 등록·수정·삭제 시나리오](../units/10_calendar/F10-03_single-availability-crud/scenarios.md) | 1 |
| [F10-04 반복 가능 시간 규칙 관리](../prd/02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | 10 | 10개 · [반복 가능 시간 규칙 관리 시나리오](../units/10_calendar/F10-04_recurring-availability-rule/scenarios.md) | 1 |
| [F10-05 타 사용자 가능 시간 공개 기능 폐기와 비공개 경계](../prd/02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | 5 | 5개 · [타 사용자 가능 시간 공개 기능 폐기와 비공개 경계 시나리오](../units/10_calendar/F10-05_other-user-availability/scenarios.md) | 1 |

## 11. 리뷰 & 신고

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F11-01 이벤트 후기 작성과 선택형 피드백](../prd/02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | 8 | 8개 · [이벤트 후기 작성과 선택형 피드백 시나리오](../units/11_review_report/F11-01_event-review-write/scenarios.md) | 1 |
| [F11-02 이벤트 후기와 사용자가 받은 후기 조회](../prd/02_feature_prds/11_review_report/F11-02_review-list_prd.md) | 7 | 7개 · [이벤트 후기와 사용자가 받은 후기 조회 시나리오](../units/11_review_report/F11-02_review-list/scenarios.md) | 1 |
| [F11-03 후기 수정과 삭제](../prd/02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | 7 | 7개 · [후기 수정과 삭제 시나리오](../units/11_review_report/F11-03_review-edit-delete/scenarios.md) | 1 |
| [F11-04 신고 접수·관할 결정·본인 처리 내역](../prd/02_feature_prds/11_review_report/F11-04_report_prd.md) | 9 | 9개 · [신고 접수·관할 결정·본인 처리 내역 시나리오](../units/11_review_report/F11-04_report/scenarios.md) | 1 |
| [F11-05 신뢰점수 계산과 본인 변동 이력](../prd/02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | 8 | 8개 · [신뢰점수 계산과 본인 변동 이력 시나리오](../units/11_review_report/F11-05_trust-score/scenarios.md) | 1 |
| [F11-06 본인 취향 프로필과 선언 선호 관리](../prd/02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | 8 | 8개 · [본인 취향 프로필과 선언 선호 관리 시나리오](../units/11_review_report/F11-06_taste-profile/scenarios.md) | 1 |
| [F11-07 호스트 후기 답변과 임시 숨김](../prd/02_feature_prds/11_review_report/F11-07_review-moderation_prd.md) | 7 | 별도 문서 없음 | — |

## 12. 알림

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F12-01 알림 목록 조회 & 읽음 관리](../prd/02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | 6 | 6개 · [알림 목록 조회 & 읽음 관리 시나리오](../units/12_notification/F12-01_notification-list-read/scenarios.md) | 1 |
| [F12-02 알림 그룹 보기 & 미읽음 배지](../prd/02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | 6 | 7개 · [알림 그룹 보기 & 미읽음 배지 시나리오](../units/12_notification/F12-02_notification-grouped-badge/scenarios.md) | 4 |
| [F12-03 카테고리별 알림 설정](../prd/02_feature_prds/12_notification/F12-03_category-settings_prd.md) | 6 | 6개 · [카테고리별 알림 설정 시나리오](../units/12_notification/F12-03_category-settings/scenarios.md) | 1 |
| [F12-04 방해금지 시간 설정](../prd/02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | 6 | 6개 · [방해금지 시간 설정 시나리오](../units/12_notification/F12-04_quiet-hours/scenarios.md) | 1 |
| [F12-05 푸시 기기 관리](../prd/02_feature_prds/12_notification/F12-05_device-token-management_prd.md) | 8 | 8개 · [푸시 기기 관리 시나리오](../units/12_notification/F12-05_device-token-management/scenarios.md) | 1 |
| [F12-06 알림 권한 인라인 안내 배너](../prd/02_feature_prds/12_notification/F12-06_permission-banner_prd.md) | 6 | 6개 · [알림 권한 인라인 안내 배너 시나리오](../units/12_notification/F12-06_permission-banner/scenarios.md) | 1 |

## 13. 프로필 & 설정

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F13-01 내·타인 프로필과 작성 글](../prd/02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | 15 | 15개 · [내·타인 프로필과 작성 글 시나리오](../units/13_profile_settings/F13-01_profile-hub/scenarios.md) | 1 |
| [F13-02 프로필 수정](../prd/02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | 10 | 10개 · [프로필 수정 시나리오](../units/13_profile_settings/F13-02_profile-edit/scenarios.md) | 1 |
| [F13-03 다중 주소 관리](../prd/02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | 11 | 11개 · [다중 주소 관리 시나리오](../units/13_profile_settings/F13-03_address-management/scenarios.md) | 1 |
| [F13-04 선호 태그 관리](../prd/02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | 8 | 8개 · [선호 태그 관리 시나리오](../units/13_profile_settings/F13-04_preference-tags/scenarios.md) | 1 |
| [F13-05 데이터 내보내기](../prd/02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | 8 | 8개 · [데이터 내보내기 시나리오](../units/13_profile_settings/F13-05_data-export/scenarios.md) | 1 |
| [F13-06 계정 삭제 요청과 취소](../prd/02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | 10 | 10개 · [계정 삭제 요청과 취소 시나리오](../units/13_profile_settings/F13-06_account-deletion/scenarios.md) | 1 |
| [F13-07 계정 즉시 탈퇴](../prd/02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | 10 | 10개 · [계정 즉시 탈퇴 시나리오](../units/13_profile_settings/F13-07_account-deactivation/scenarios.md) | 1 |

## 14. 위치 & 길찾기

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F14-01 이벤트 위치 공유와 조회](../prd/02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | 7 | 7개 · [이벤트 위치 공유와 조회 시나리오](../units/14_location_directions/F14-01_event-location-share/scenarios.md) | 1 |
| [F14-02 위치 공유 중단과 이벤트 설정](../prd/02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | 5 | 5개 · [위치 공유 중단과 이벤트 설정 시나리오](../units/14_location_directions/F14-02_location-opt-out/scenarios.md) | 1 |
| [F14-03 위치 공유 만료와 연장](../prd/02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | 6 | 6개 · [위치 공유 만료와 연장 시나리오](../units/14_location_directions/F14-03_location-extend/scenarios.md) | 1 |
| [F14-04 이벤트 위치 개인정보와 열람 기록](../prd/02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | 6 | 6개 · [이벤트 위치 개인정보와 열람 기록 시나리오](../units/14_location_directions/F14-04_location-privacy-dashboard/scenarios.md) | 1 |
| [F14-05 이벤트 길찾기와 참석자 거리](../prd/02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | 6 | 6개 · [이벤트 길찾기와 참석자 거리 시나리오](../units/14_location_directions/F14-05_event-directions/scenarios.md) | 1 |
| [F14-06 주소 변환과 장소 검색](../prd/02_feature_prds/14_location_directions/F14-06_reverse-geocoding_prd.md) | 7 | 7개 · [주소 변환과 장소 검색 시나리오](../units/14_location_directions/F14-06_reverse-geocoding/scenarios.md) | 1 |

## 15. 경고 & 징계

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F15-01 내 경고 현황과 원장](../prd/02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md) | 6 | 별도 문서 없음 | — |
| [F15-02 클럽 경고 제보와 본인 관리](../prd/02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md) | 7 | 별도 문서 없음 | — |
| [F15-03 회원의 경고 이의제기](../prd/02_feature_prds/15_warning/F15-03_appeal_prd.md) | 7 | 별도 문서 없음 | — |
| [F15-04 경고 정책과 패널티 유형 설정](../prd/02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md) | 6 | 별도 문서 없음 | — |
| [F15-05 클럽 경고 제보 심사](../prd/02_feature_prds/15_warning/F15-05_report-review_prd.md) | 6 | 별도 문서 없음 | — |
| [F15-06 경고 부여와 원장 조정](../prd/02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md) | 6 | 별도 문서 없음 | — |
| [F15-07 경고 이의제기 처리와 재제출 허용](../prd/02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md) | 6 | 별도 문서 없음 | — |
| [F15-08 클럽·플랫폼 제재와 계정 제한](../prd/02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md) | 7 | 별도 문서 없음 | — |
| [F15-09 검토 큐·대시보드·통계와 감사 로그](../prd/02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md) | 6 | 별도 문서 없음 | — |

## 16. 마일리지

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F16-01 내 마일리지·원장·월간 영수증](../prd/02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md) | 8 | 별도 문서 없음 | — |
| [F16-02 등급·배지·랭킹·프로필 카드](../prd/02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md) | 8 | 별도 문서 없음 | — |
| [F16-03 시즌 조회·순위 확정·재시도](../prd/02_feature_prds/16_mileage/F16-03_season_prd.md) | 8 | 별도 문서 없음 | — |
| [F16-04 마일리지 제도 설정·변경 미리보기](../prd/02_feature_prds/16_mileage/F16-04_policy-config_prd.md) | 8 | 별도 문서 없음 | — |
| [F16-05 적립 규칙·등급·배지·차감 사유·시즌 관리](../prd/02_feature_prds/16_mileage/F16-05_policy-presets_prd.md) | 10 | 별도 문서 없음 | — |
| [F16-06 마일리지 적립·차감·정정·배지 집행](../prd/02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md) | 10 | 별도 문서 없음 | — |
| [F16-07 호스트 적립 제안·승인·반려](../prd/02_feature_prds/16_mileage/F16-07_host-proposal_prd.md) | 8 | 별도 문서 없음 | — |
| [F16-08 검토 대기열·대시보드·감사 기록](../prd/02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md) | 9 | 별도 문서 없음 | — |

## 17. 정기모임

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F17-01 정기모임 발견·운영·참여 목록](../prd/02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md) | 6 | 별도 문서 없음 | — |
| [F17-02 정기모임 상세·참여 상태·회차 정보](../prd/02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md) | 9 | 별도 문서 없음 | — |
| [F17-03 정기모임 생성·기본 정보 수정](../prd/02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md) | 8 | 별도 문서 없음 | — |
| [F17-04 정기모임 공개·종료·취소·호스트 변경](../prd/02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md) | 9 | 별도 문서 없음 | — |
| [F17-05 정기모임 회차 생성·반복·대체·취소](../prd/02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md) | 10 | 별도 문서 없음 | — |
| [F17-06 정기모임 등록·승인·대기·취소](../prd/02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md) | 8 | 별도 문서 없음 | — |
| [F17-07 정기모임 회비 납부·입금 확인](../prd/02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md) | 9 | 별도 문서 없음 | — |
| [F17-08 정기모임 환불·증빙·실패 복구](../prd/02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md) | 8 | 별도 문서 없음 | — |
| [F17-09 정기모임 출석 확정·노쇼·등록 박탈](../prd/02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md) | 8 | 별도 문서 없음 | — |
| [F17-10 정기모임 수익 정산·보류·조회](../prd/02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md) | 8 | 별도 문서 없음 | — |

## 18. 분쟁 해결

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F18-01 통합 분쟁 조회·당사자 대화·종결 경계](../prd/02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md) | 8 | 별도 문서 없음 | — |
| [F18-02 사용자 분쟁 접수·출처 연결·초안 복구](../prd/02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md) | 8 | 별도 문서 없음 | — |
| [F18-03 분쟁 이의 접수·공개 조건·철회](../prd/02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md) | 8 | 별도 문서 없음 | — |
| [F18-04 분쟁 증거 열람·보존·파일 정리](../prd/02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md) | 9 | 별도 문서 없음 | — |
| [F18-05 호스트 처리함·아홉 출처·업무 이동](../prd/02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md) | 8 | 별도 문서 없음 | — |

## 19. 관심인

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F19-01 관심인 등록·해제·한도](../prd/02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md) | 0 | 별도 문서 없음 | — |
| [F19-02 관심인 캘린더·새 이벤트 알림](../prd/02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md) | 0 | 별도 문서 없음 | — |
| [F19-03 공개범위(프라이버시) 설정](../prd/02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md) | 0 | 별도 문서 없음 | — |

## 20. 고객지원

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F20-01 작성자 문의·호스트 응대·관할 이관](../prd/02_feature_prds/20_support/F20-01_inquiry_prd.md) | 8 | 별도 문서 없음 | — |
| [F20-02 원천별 운영 이슈·증빙·처리 대화](../prd/02_feature_prds/20_support/F20-02_operational-issue_prd.md) | 8 | 별도 문서 없음 | — |
| [F20-03 출처별 지원 FAQ·검색·실패 복구](../prd/02_feature_prds/20_support/F20-03_support-faq_prd.md) | 5 | 별도 문서 없음 | — |

## 21. 제공자 배정·정산

| 기능 정본 | 등록 확인 항목 | 상세 시나리오 | units 도식 |
|---|---:|---|---:|
| [F21-01 제공자 배정·프로필·상품·계약조건](../prd/02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | 12 | 별도 문서 없음 | — |
| [F21-02 참가자 서비스 이용료 첫 납부·추가 납부·자동 분담](../prd/02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | 10 | 별도 문서 없음 | — |
| [F21-03 제공자 정산 확정·주간 지급·지급 재처리](../prd/02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | 10 | 별도 문서 없음 | — |
| [F21-04 무료 제외·되돌리기·호스트 대납](../prd/02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md) | 8 | 별도 문서 없음 | — |
| [F21-05 제공자 이용료 환불·정산 후 회수·배정 종료](../prd/02_feature_prds/21_curated/F21-05_refund-clawback_prd.md) | 10 | 별도 문서 없음 | — |
| [F21-06 수락 조건의 계약금 선납·적용·취소](../prd/02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md) | 10 | 별도 문서 없음 | — |
| [F21-07 정기모임 묶음 배정·정산](../prd/02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md) | 9 | 별도 문서 없음 | — |

## 검토 순서

돈·안전·계정·민감정보·핵심 업무의 영향과 실제 변경 범위로 우선순위를 정한다. [시나리오 커버리지 가이드](08_scenario_coverage_matrix.md)의 적용 가능한 질문을 고르고 기존 근거를 재사용한다. 모든 기능에 같은 개수의 새 시험·이미지·기기 조합을 요구하지 않는다.
