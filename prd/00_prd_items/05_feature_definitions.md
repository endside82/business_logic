# 168개 기능 정의

<!-- supporting-doc-status: 2026-05-18 -->

> 문서 상태: **보조 문서**. 기능별 현재 계약, source trace, Gap/Risk 판단은 [PRD_MIGRATION_STATUS.md](../PRD_MIGRATION_STATUS.md)와 각 기능 PRD를 우선한다. 이 문서는 인벤토리, 정책, QA, 기획 운영 기준을 보조하며, 기능 세부 판단은 [FEATURE_PRD_STANDARD.md](../FEATURE_PRD_STANDARD.md) 기준으로 재확인한다.

## 문서 설명

| 항목 | 내용 |
|---|---|
| 목적 | 전체 기능 인벤토리를 한 표로 확인해 누락된 기능과 과소 정의된 기능을 찾는다. |
| 보는 시점 | 전체 PRD 커버리지 검토, 릴리즈 범위 산정, 기능별 담당 배정 시점 |
| 이 문서로 정할 것 | 기능 ID, 도메인, 주 사용자, 핵심 검산 포인트, 시나리오/도식 수 |
| 같이 볼 문서 | 02_feature_prds/, 10_impact_matrix.md, 11_qa_acceptance_criteria.md |

이 문서는 전체 기능을 한 번에 검토하기 위한 인벤토리다. 개별 상세는 `02_feature_prds`의 기능별 PRD에서 확인한다.

> 갱신: 2026-06-05. 도메인 18(분쟁 해결)/19(관심인)/20(고객지원) 신설 +9개, 기존 도메인 신규 기능 +6개 추가. 총 153 → 168개.

| ID | 도메인 | 기능 | 주 사용자 | 핵심 검산 포인트 | 시나리오 | 도식 |
|---|---|---|---|---|---:|---:|
| F01-01 | 인증 & 온보딩 | 이메일 회원가입 & 로그인 | 신규/기존 사용자 | 미성년자, 중복 이메일, 비밀번호 정책, 차단/탈퇴 상태 | 10 | 4 |
| F01-02 | 인증 & 온보딩 | 소셜 로그인 | 신규/기존 사용자 | 신규 추가정보, 앱 연동 모듈 취소, 연동 제공자 오류, 차단 사용자 | 8 | 4 |
| F01-03 | 인증 & 온보딩 | 이메일 인증 | 신규 사용자 | 재발송 제한, 만료/위조 토큰, 이미 인증된 사용자 | 10 | 4 |
| F01-04 | 인증 & 온보딩 | 비밀번호 재설정 | 비로그인 사용자 | 미가입 이메일 보안 응답, 토큰 만료/재사용, 약한 비밀번호 | 10 | 5 |
| F01-05 | 인증 & 온보딩 | 토큰 갱신 & 로그아웃 | 로그인 사용자 | 동시 401, refresh 만료, 로그아웃 실패 시 로컬 처리, 계정 상태 변화 | 15 | 5 |
| F01-06 | 인증 & 온보딩 | 온보딩 | 첫 로그인 사용자 | 건너뛰기, 중간 재개, 사진/태그/위치 실패, 추천 가능 상태 | 11 | 4 |
| F01-07 | 인증 & 온보딩 | 관심사 태그 관리 | 로그인 사용자 | 태그 한도, 중복, 가중치, 추천 품질 영향 | 10 | 4 |
| F01-08 | 인증 & 온보딩 | 소셜 계정 연결 해제 | 로그인 사용자 | 마지막 로그인 수단 보호, 미연동 연동 제공자, 멀티 디바이스 | 8 | 4 |
| F02-01 | 홈 피드 | 홈 피드 메인 조회 | 로그인/게스트 | 섹션별 부분 실패, 캐시, 빈 섹션, 비로그인 노출 | 8 | 4 |
| F02-02 | 홈 피드 | 홈 피드 새로고침 | 로그인/게스트 | 강제 새로고침, 네트워크 실패, 스크롤 위치 | 6 | 4 |
| F02-03 | 홈 피드 | 섹션 카드 진입 | 로그인/게스트 | 카드별 라우팅, 잘못된 ID, 백버튼 복귀 | 7 | 4 |
| F02-04 | 홈 피드 | 추천 이벤트 더보기·필터·무한스크롤 | 로그인 사용자 | 필터 초기화, 마지막 페이지, 빈 결과, 추천 배지 | 11 | 5 |
| F02-05 | 홈 피드 | 검색·알림 진입점 | 로그인/게스트 | 알림 로그인 가드, 미읽음 배지, 탭 복귀 | 6 | 4 |
| F03-01 | 이벤트 | 이벤트 발견 & 탐색 | 참가자/게스트 | 검색/필터, 비로그인, 무한스크롤, 결과 없음 | 7 | 3 |
| F03-02 | 이벤트 | 이벤트 상세 조회 | 참가자/게스트/호스트 | 호스트 CTA, 작성중 접근, 종료/취소/비공개 상태, 모임 정산 입구(2026-06-05) | 8 | 3 |
| F03-03 | 이벤트 | 이벤트 생성 | 호스트 | 4단계 입력, 초안/발행, 유료/사전결제, 반복, 프라이빗 | 10 | 4 |
| F03-04 | 이벤트 | 이벤트 수정/생명주기 관리 | 호스트 | 일정 변경, 취소/환불, 공지 throttle, 삭제 제한 | 11 | 4 |
| F03-05 | 이벤트 | 이벤트 신청 & 참석 | 참가자 | 승인제, 유료, 유료 승인제, 정원, 대기열, 취소, 자동 승격 | 13 | 6 |
| F03-06 | 이벤트 | 신청서 승인/거절 | 호스트 | 정원 초과 승인, 유료 승인제 결제 대기, 일괄 승인, 거절 사유, 알림 | 11 | 6 |
| F03-07 | 이벤트 | 정원 & 대기열 관리 | 호스트/참가자 | 정원 변경, 수동 승격, 강제 제거, 모집 마감/재개 | 7 | 5 |
| F03-08 | 이벤트 | QR 체크인 | 참가자/호스트 | QR 발급, 스캔, 단축코드, 수동 체크인, 시간 게이트 | 9 | 5 |
| F03-09 | 이벤트 | 이벤트 사진첩 | 참석자/호스트 | 업로드 권한, 삭제 권한, 앨범 상태, 파일 실패 | 9 | 5 |
| F03-10 | 이벤트 | 이벤트-플랜 연결 | 호스트 | 플랜 추가/순서/활성화, 권한, 연결 해제 | 8 | 4 |
| F03-11 | 이벤트 | 위시리스트 | 참가자 | 낙관적 토글, 비로그인, 숨김/삭제 이벤트 | 9 | 5 |
| F03-12 | 이벤트 | 내 이벤트 관리 & 참석 로그 | 참가자/호스트 | 주최/참석/지난 탭, 로그 페이지네이션, 상태별 카드 | 9 | 5 |
| F03-13 | 이벤트 | 이벤트 참가 선입금 (WALLET / BANK_TRANSFER) | 참가자/호스트 | APPROVED_PENDING_PAYMENT, paymentDueAt, BANK 입금확인/거부, 호스트 취소 환불, deactivation 차단 | 11 | 5 |
| F03-14 | 이벤트 | 이동수단 공통 베이스 (Transport Mode) | 호스트 | NONE/CARPOOL/BUS mode, DRAFT 변경, OPEN 변경 차단, 개별 이동 허용 토글 | 6 | 2 |
| F03-15 | 이벤트 | 이벤트 카풀 (CARPOOL) | 호스트/참가자 | 운전자 offer, 호스트 확정/거절, 탑승자 배정, SELF 이동 선택, swap 감사로그 | 8 | 4 |
| F03-16 | 이벤트 | 이벤트 버스대절 (BUS) | 호스트/참가자 | 버스 추가, 좌석표, FREE/FIXED_BY_HOST/FIRST_COME, 중복 좌석 방지 | 8 | 4 |
| F03-17 | 이벤트 | 차량 레이아웃 카탈로그 | 호스트(read-only) | 활성 레이아웃, 좌석 row, 시드 4종 1차 | 4 | 2 |
| F03-18 | 이벤트 | 구성인원 인구통계 (성별/나이대/MBTI) | 참가자/예비참가자/호스트 | k-익명성 3단계 게이트, 공개+OPEN/CLOSED 비참가자 노출, 비공개=host·cohost·ATTENDING | 8 | 1 |
| F04-01 | 클럽 | 클럽 발견 & 탐색 | 게스트/사용자 | 공개/비공개, 멤버십 상태, 빈 결과 | 8 | 3 |
| F04-02 | 클럽 | 클럽 상세 보기 & 가입 액션 | 게스트/사용자/멤버 | 가입/탈퇴/대기/차단/소유자 CTA | 7 | 3 |
| F04-03 | 클럽 | 클럽 생성·수정·삭제·소유권 이전 | 소유자 | 삭제 보상, 멤버 존재, 이전 수락/거절 | 13 | 4 |
| F04-04 | 클럽 | 멤버 관리 | 관리자/소유자 | 역할 변경, 추방, 자기 자신/소유자 보호 | 12 | 3 |
| F04-05 | 클럽 | 가입 대기열 승인/거절 & 초대 | 관리자/소유자 | 초대 만료, 중복 신청, 승인 알림 | 13 | 4 |
| F04-06 | 클럽 | 차단 관리 | 관리자/소유자 | 차단 시 자동 추방/환불, 해제, 자기 차단 방지 | 12 | 4 |
| F04-07 | 클럽 | 내 클럽 / 멤버 통계 | 멤버/관리자 | 내 클럽 탭, 통계 빈 상태, 권한 | 11 | 3 |
| F04-08 | 클럽 | 게시판 & 게시글 생성/수정/삭제 | 멤버/관리자 | 이미지 업로드, 고정, 삭제, 권한 | 17 | 4 |
| F04-09 | 클럽 | 게시글 댓글 & 대댓글 | 멤버/관리자 | 답글, 삭제, soft delete, 권한 | 12 | 4 |
| F04-10 | 클럽 | 공지사항 | 관리자/소유자 | 작성 권한, 고정, 멤버 알림 | 11 | 3 |
| F04-11 | 클럽 | 사진첩 | 멤버/관리자 | 앨범 생성/수정/삭제, 사진 업로드, 삭제 권한 | 11 | 4 |
| F04-12 | 클럽 | 클럽 이벤트 & 캘린더 | 멤버/관리자 | 이벤트 발행, 자동 참가, 대기 승격, 통계 | 13 | 5 |
| F04-13 | 클럽 | 기금 현황 & 거래 차트 | 멤버/관리자 | 잔액/거래 차트, 인출 가능액 | 10 | 4 |
| F04-14 | 클럽 | 기부하기 & 기부 내역 | 멤버 | 지갑 차감, 취소, 기금 반영, 잔액 부족 | 16 | 4 |
| F04-15 | 클럽 | 기금 인출 요청 | 소유자 | 가용 잔액, pending 중복, 승인 위임 | 10 | 5 |
| F04-16 | 클럽 | 클럽 구독 | 멤버/관리자/소유자 | 시작/해지/재활성, 결제 실패, 만료 혜택 | 13 | 5 |
| F04-17 | 클럽 | 구성인원 인구통계 (성별/나이대/MBTI) | 클럽 멤버 | 멤버 전용 게이트, k-익명성 3단계, Asia/Seoul 기준일 | 7 | 1 |
| F05-01 | 검색 | 키워드 검색 | 탐색 사용자 | 영역별 결과, 정렬, 무한스크롤, 결과 없음 | 8 | 4 |
| F05-02 | 검색 | 자동완성 서제스트 | 탐색 사용자 | 입력 전/입력 중, 디바운스, 최근/트렌딩 조합 | 7 | 3 |
| F05-03 | 검색 | 검색 필터 적용 | 탐색 사용자 | 필터 칩, 미리보기 카운트, GPS 권한 | 8 | 4 |
| F05-04 | 검색 | 최근 검색어 | 로그인 사용자 | 개별 삭제, 전체 삭제, 재검색 | 9 | 4 |
| F05-05 | 검색 | 저장된 검색 | 로그인 사용자 | 저장/수정/삭제, 알림 연동, 중복 | 9 | 5 |
| F06-01 | 결제 & 지갑 | 지갑 메인 조회 | 결제 사용자 | 잔액 숨김, 최근 거래, 바로가기 | 6 | 4 |
| F06-02 | 결제 & 지갑 | 포인트 충전 | 결제 사용자 | 결제수단 없음, PG 실패, 승인/취소, 금액 범위 | 7 | 5 |
| F06-03 | 결제 & 지갑 | 거래 내역 조회·필터·내보내기 | 결제 사용자 | 기간 제한, 내보내기, 상세 진입, 빈 결과 | 7 | 5 |
| F06-04 | 결제 & 지갑 | 결제 수단 관리 | 결제 사용자 | 최대 5개, 기본 수단, 삭제 영향 | 6 | 4 |
| F06-05 | 결제 & 지갑 | 자동 충전 설정 | 결제 사용자 | 임계값, 충전 금액, 결제 실패, 원래 결제 재시도 | 7 | 4 |
| F06-06 | 결제 & 지갑 | 포인트 결제·환불 | 결제 사용자 | 잔액 부족, 자동충전, 유료 승인제 승인 후 결제, 환불 조건, 거래내역 | 10 | 6 |
| F06-07 | 결제 & 지갑 | 호스팅 티켓 구매 | 호스트 | 보유 티켓, 만료, 잔액 부족 | 6 | 4 |
| F06-08 | 결제 & 지갑 | 개인 구독 관리 | 구독 사용자 | 가입, 자동갱신 해지, 재활성, 결제 실패 | 7 | 4 |
| F06-09 | 결제 & 지갑 | 수익 대시보드 조회 | 호스트 | 기간 차트, 수익 없음, 이벤트별 Top | 6 | 4 |
| F06-10 | 결제 & 지갑 | 정산 조회·요약·이의 제기 | 호스트 | 상태 필터, 거절됨 이의제기, 재심사 | 9 | 5 |
| F07-01 | 모임 정산 | 모임 정산 생성 | 호스트 | 중복 정산, 복제, 참가자 선택, Quick-add | 6 | 5 |
| F07-02 | 모임 정산 | 정산 항목 관리 | 호스트 | 작성중 편집, 항목/분담금, 최근 항목, 영수증 | 8 | 4 |
| F07-03 | 모임 정산 | 정산 활성화/취소 | 호스트 | 작성중->진행중, 납부 알림, 취소/환불 | 8 | 5 |
| F07-04 | 모임 정산 | 정산 현황/요약/영수증 조회 | 호스트/참가자 | 요약, 참여자 상태, 영수증 권한, DRAFT 미리보기 차등 노출·열람 자격 확장(2026-06-05) | 8 | 5 |
| F07-05 | 모임 정산 | 분담금 납부 | 참가자 | 포인트, 계좌이체, 혼합 결제, 재발행/환불, DRAFT 준비 중 표시·이의 버튼 가드(2026-06-05) | 9 | 5 |
| F07-06 | 모임 정산 | 이체 확인/일괄 확인/상각 | 호스트 | 수동 확인, 일괄 처리, 완료 전이, 회수불가 | 8 | 5 |
| F07-07 | 모임 정산 | 미납자 리마인드/마감 연장 | 호스트 | 독촉 대상, 연장 제한, 이력 | 8 | 6 |
| F07-08 | 모임 정산 | 이의제기/처리/감사로그 | 참가자/호스트 | 이의 상태, 처리 권한, 감사로그, DRAFT 이의 차단(2026-06-05) | 9 | 6 |
| F07-09 | 모임 정산 | 선입금/환불/환불규정 | 호스트/참가자 | 사전 결제, 확인, 환불률, 결제 상태 알림 | 11 | 6 |
| F07-10 | 모임 정산 | 정산 계좌/이력/호스트 신뢰도 | 호스트/참가자 | 기본 계좌, 월별 요약, 신뢰도 노출, 평판 DRAFT 제외·지갑 목록 DRAFT 포함(서버 선구현, 2026-06-05) | 9 | 6 |
| F08-01 | 플랜 마켓 | 내 플랜 목록 관리 | 크리에이터/구매자 | 만든 플랜/구매 플랜 탭, 새 플랜 | 7 | 4 |
| F08-02 | 플랜 마켓 | 플랜 상세/작성자용 미리보기 | 크리에이터 | 작성중/발행ED, 복사, 숨김 | 10 | 5 |
| F08-03 | 플랜 마켓 | 블록 에디터 | 크리에이터 | 블록 생성/수정/삭제, 자동저장, 삭제/복구, 타입 변환 | 9 | 5 |
| F08-04 | 플랜 마켓 | 블록 드래그 재정렬 | 크리에이터 | 순서/계층 이동, 저장 실패 복구 | 7 | 4 |
| F08-05 | 플랜 마켓 | 플랜 발행 | 크리에이터 | 발행 요건, 중복 발행, 체크리스트 | 7 | 4 |
| F08-06 | 플랜 마켓 | 마켓 아이템 관리 | 크리에이터 | 등록/수정/판매중지/재개/삭제 | 9 | 4 |
| F08-07 | 플랜 마켓 | 크리에이터 프로필/통계 | 크리에이터/구매자 | 공개 프로필과 본인 통계 구분 | 9 | 4 |
| F08-08 | 플랜 마켓 | 마켓 메인 탐색 | 구매자 | 카테고리, 인기/최신, 빈 결과 | 5 | 4 |
| F08-09 | 플랜 마켓 | 마켓 검색 | 구매자 | 키워드, 정렬, 필터 | 7 | 4 |
| F08-10 | 플랜 마켓 | 마켓 아이템 상세 | 구매자 | 커버, 설명, 리뷰, 번들, 자기 상품 | 8 | 4 |
| F08-11 | 플랜 마켓 | 아이템·번들·플랜 구매 | 구매자 | 잔액 부족, 이미 구매, 부분 중복 | 8 | 5 |
| F08-12 | 플랜 마켓 | 내 컬렉션 | 구매자 | 활성/비활성, 만료 임박, 미리보기 | 9 | 5 |
| F08-13 | 플랜 마켓 | 구매 플랜 -> 이벤트 생성/리뷰 | 구매자 | 소유권, 이벤트 정보 복사, 리뷰 중복 | 12 | 6 |
| F08-14 | 플랜 마켓 | 플랜 마켓 환불 (Purchase Refund) | 구매자/크리에이터 | 요청·승인·거절·자동처리·분쟁, 사용 흔적 차단, 회계 분개 split, 지갑 paid 복원 (split 미보존 followup) | — | — |
| F08-15 | 플랜 마켓 | 크리에이터 매출 귀속 보정 (Creator Earning Coverage) | 크리에이터/플랫폼 | 3 소스(MARKET_ITEM/BUNDLE/PLAN_DIRECT) CreatorEarning, grossPaid/grossFree split, 무료=free_credit 무수수료, EVENT legacy followup | — | — |
| F09-01 | 프라이빗 데이팅 | 본인 인증 | 데이팅 사용자 | 인증 요청/검증, 미성년/실패, 재인증 | 7 | 4 |
| F09-02 | 프라이빗 데이팅 | 데이팅 프로필 관리 | 데이팅 사용자 | 사진, 소개, active 토글, 미인증 차단 | 8 | 4 |
| F09-03 | 프라이빗 데이팅 | 후보자 스와이프 & 매칭 액션 | 데이팅 사용자 | 좋아요/패스, 상호 매칭, 일일 한도 | 9 | 4 |
| F09-04 | 프라이빗 데이팅 | 매칭 목록 조회 | 데이팅 사용자 | 새매칭/대화중, 차단/만료 상태 | 8 | 3 |
| F09-05 | 프라이빗 데이팅 | 채팅 | 매칭 사용자 | 메시지, 읽음, 중복 전송, 차단 | 10 | 4 |
| F09-06 | 프라이빗 데이팅 | 만남 제안 & 안전 흐름 | 매칭 사용자 | 제안/수락/거절, 일정/장소, 안전 기능 | 10 | 5 |
| F09-07 | 프라이빗 데이팅 | 사용자 차단/해제 | 데이팅 사용자 | 후보/매칭/채팅 어디서든 차단, cascade | 8 | 4 |
| F09-08 | 프라이빗 데이팅 | 내 프로필 조회 이력 | 데이팅 사용자 | 조회자 목록, 차단/비활성 사용자 필터 | 10 | 4 |
| F10-01 | 캘린더 | 월간/일간 통합 캘린더 조회 | 로그인 사용자 | 이벤트/가용성/데이팅 합산, 오늘, 캐시 | 7 | 5 |
| F10-02 | 캘린더 | 일정 항목 라우팅 | 로그인 사용자 | itemType별 상세 이동, referenceId 없음 | 7 | 4 |
| F10-03 | 캘린더 | 단일 가용 시간 생성/수정/삭제 | 로그인 사용자 | 시간 검증, 충돌, 강제 삭제 | 9 | 5 |
| F10-04 | 캘린더 | 반복 가용 시간 규칙 관리 | 로그인 사용자 | 주기/요일, 미리보기, 인스턴스 충돌 | 9 | 7 |
| F10-05 | 캘린더 | 타 사용자 가용성 공개 조회 | 로그인/게스트 | 공개/친구 범위, 자기 자신, 빈 결과 | 8 | 5 |
| F11-01 | 리뷰 & 신고 | 이벤트 리뷰 작성 | 참석자 | 참석자 자격, 중복, 부적절 콘텐츠 | 6 | 3 |
| F11-02 | 리뷰 & 신고 | 리뷰 목록 조회 | 사용자 | 이벤트별/사용자별, 평균/분포, 신고 진입 | 6 | 4 |
| F11-03 | 리뷰 & 신고 | 리뷰 수정 & 삭제 | 작성자 | 수정 한도, 타인 리뷰 차단, 삭제 후 점수 | 6 | 5 |
| F11-04 | 리뷰 & 신고 | 신고 | 로그인 사용자 | 대상 유형, 자기 신고, 중복 신고, 운영 접수 | 6 | 5 |
| F11-05 | 리뷰 & 신고 | 신뢰점수 & 변동 이력 | 사용자 | 본인/타인 노출 차이, 등급 임계, 이력 | 7 | 5 |
| F11-06 | 리뷰 & 신고 | 취향 평가 & 취향 프로필 | 로그인 사용자 | 비공개 평가, 태그 가중치, 데이터 부족 | 8 | 5 |
| F12-01 | 알림 | 알림 목록 조회 & 읽음 관리 | 로그인 사용자 | 딥링크, 모두 읽음, 삭제, 무한스크롤 | 6 | 4 |
| F12-02 | 알림 | 알림 그룹 보기 & 미읽음 배지 | 로그인 사용자 | 그룹 토글, 배지 감소, 빈 인박스 | 6 | 4 |
| F12-03 | 알림 | 카테고리별 알림 설정 | 로그인 사용자 | 카테고리와 내부 타입 매핑, 실패 원복 | 6 | 4 |
| F12-04 | 알림 | 방해금지 시간 설정 | 로그인 사용자 | 자정 넘김, 요일, 카테고리 설정과 중첩 | 6 | 4 |
| F12-05 | 알림 | 푸시 기기 관리 | 로그인 사용자 | 다중 기기, 토큰 갱신, 로그아웃 해제 | 8 | 5 |
| F12-06 | 알림 | 알림 권한 인라인 안내 배너 | 로그인 사용자 | OS 권한, 설정 진입, lifecycle 재확인 | 6 | 4 |
| F13-01 | 프로필 & 설정 | 내 프로필 조회 | 로그인 사용자 | 요약 카드, 삭제 배너, 하위 메뉴 | 5 | 3 |
| F13-02 | 프로필 & 설정 | 프로필 수정 | 로그인 사용자 | 닉네임/사진, 변경사항 이탈, 중복 | 5 | 3 |
| F13-03 | 프로필 & 설정 | 다중 주소 관리 | 로그인 사용자 | 기본 주소, 주소 한도, 중복 라벨 | 5 | 4 |
| F13-04 | 프로필 & 설정 | 선호 태그 관리 | 로그인 사용자 | 추천 태그, 삭제, 20개 한도 | 5 | 4 |
| F13-05 | 프로필 & 설정 | 데이터 내보내기 | 로그인 사용자 | 처리중/완료/실패/만료, 다운로드 | 5 | 4 |
| F13-06 | 프로필 & 설정 | 계정 삭제 요청 | 로그인 사용자 | 30일 유예, 배너, 취소, 스케줄러 | 5 | 4 |
| F13-07 | 프로필 & 설정 | 계정 즉시 비활성화 | 로그인 사용자 | 사전 점검, 미정산 차단, 강제 로그아웃 | 5 | 4 |
| F14-01 | 위치 & 길찾기 | 이벤트 참석자 위치 공유 | 참석자/호스트 | opt-in, 30초 갱신, 시간 게이트, 권한 | 7 | 4 |
| F14-02 | 위치 & 길찾기 | 위치 공유 중지 | 참석자 | opt-out, 데이터 제거, 자동 만료, 재개 | 7 | 4 |
| F14-03 | 위치 & 길찾기 | 위치 공유 만료 연장 | 참석자 | 연장 한도, 만료 후 시도, 알림 | 7 | 4 |
| F14-04 | 위치 & 길찾기 | 위치 프라이버시 대시보드 | 참석자/호스트 | 이벤트별 토글, 호스트 분기, 실패 롤백 | 6 | 4 |
| F14-05 | 위치 & 길찾기 | 이벤트 길찾기 | 참석자/호스트 | 현재 위치/저장 주소, 외부 지도, 참석자 거리 | 9 | 4 |
| F14-06 | 위치 & 길찾기 | 역지오코딩 | 위치 입력 사용자 | 캐시, 좌표 오류, 외부 시스템 연동 장애 | 6 | 4 |
| F15-01 | 경고 & 징계 | 내 경고 현황 | 일반 사용자 | 활성 경고/이의제기 표시, 페이지네이션, 만료 게이팅 | — | — |
| F15-02 | 경고 & 징계 | 신고 제출 & 신고 관리 | 일반 사용자 | 대상 유형, 자기 신고, 중복 신고, 운영 접수 | — | — |
| F15-03 | 경고 & 징계 | 이의제기 | 경고 보유 사용자 | 한 경고당 1회, 사유, 운영 검토 | — | — |
| F15-04 | 경고 & 징계 | 정책·페널티 유형 (조회) | 일반 사용자/운영자 | enum 노출, 임계값 설명 | — | — |
| F15-05 | 경고 & 징계 | 신고 심사 | WARNING_REVIEWER | 검토 큐, 승인/기각, 감사로그 | — | — |
| F15-06 | 경고 & 징계 | 경고 부여·조정 | WARNING_REVIEWER | 효과 점수, 자동/수동, 만료, 강도 | — | — |
| F15-07 | 경고 & 징계 | 이의제기 처리 | WARNING_REVIEWER | 승인 시 경고 무효화, 기각, 감사 | — | — |
| F15-08 | 경고 & 징계 | 제재 집행 | WARNING_REVIEWER | RESTRICT/SUSPEND/PERMANENT, FORCED_REMOVE 후속 미연동 | — | — |
| F15-09 | 경고 & 징계 | 검토 큐 & 대시보드/통계/감사로그 | WARNING_REVIEWER | 큐 처리, period 집계, findAll 메모리 집계 | — | — |
| F16-01 | 마일리지 | 내 마일리지 메인 & 월간 영수증 & 원장 | 클럽 멤버 | 잔액/등급/배지, 월간 byType 합성, FEFO 원장 | — | — |
| F16-02 | 마일리지 | 등급·배지·랭킹·프로필 카드 | 클럽 멤버 | threshold 등급, 랭킹 정렬(BALANCE), 배지 정의 | — | — |
| F16-03 | 마일리지 | 시즌 (목록·과거 랭킹·내 스냅샷) | 클럽 멤버 | SCHEDULED/ACTIVE/CLOSED, 스냅샷 랭킹, basis 값 정합 | — | — |
| F16-04 | 마일리지 | 마일리지 정책 설정 | POLICY_OWNER | 활성화, 만료일, 랭킹 기준, 미리보기 | — | — |
| F16-05 | 마일리지 | 적립규칙·등급·배지·교환 프리셋 관리 | POLICY_OWNER | CRUD, 등급 제약(단일 ErrorCode), 프리셋 비활성 | — | — |
| F16-06 | 마일리지 | 적립/차감/정정 집행 | MILEAGE_MANAGER | EARN/REDEEM/REVERSE, 멱등, 자동적립 트리거 호출처, batch 결과 타입(Map↔VO) | — | — |
| F16-07 | 마일리지 | 호스트 제안 | 이벤트 호스트/MILEAGE_MANAGER | SUBMITTED→APPROVED/REJECTED, 승인 시 원장 반영 | — | — |
| F16-08 | 마일리지 | 검토 큐 & 대시보드/감사로그 | MILEAGE_MANAGER | 큐 처리, 멤버 상세 타입(Map↔VO), findAll 집계 | — | — |
| F17-01 | 정기모임 | 정기모임 발견·탐색 | 사용자/게스트 | OPEN 필터, 카테고리/타입(FIXED/VARIABLE)/지역 필터, 내 모임 합산, DRAFT 마스킹 | 5 | 1 |
| F17-02 | 정기모임 | 정기모임 상세 조회 | 사용자/호스트/게스트 | DRAFT 마스킹, isHost(JSON: host), 세션 요약, status×viewer CTA 분기 | 8 | 1 |
| F17-03 | 정기모임 | 정기모임 생성 (호스트) | 호스트 | DRAFT 강제, FIXED 불변식(totalSessionCount>0/baseCapacity>0), 100원 floor, 호스트 교체 불가 | 8 | 0 |
| F17-04 | 정기모임 | 생명주기 (publish/close/cancel/reopen) | 호스트 | 4상태 머신, findByIdForUpdate 락, close FIXED 가드(모든 정션 FINALIZED), afterCommit 정산, cancel pro-rata 환불 | 11 | 1 |
| F17-05 | 정기모임 | 세션 관리 (add/bulk/replace/cancel) | 호스트 | event_id UNIQUE, sequence_no 중복허용(원본+대체본), RegularMeetingSessionGuard 6경로 차단 | 9 | 0 |
| F17-06 | 정기모임 | FIXED 등록·승인·대기열 | 사용자/호스트 | 8 멤버 상태, 승인제/즉시/유료 분기, FORFEITED 영구 차단, CLOSED 자가 취소 차단, WAITING 자동 승격 | 14 | 1 |
| F17-07 | 정기모임 | FIXED 결제 (WALLET / BANK_TRANSFER) | 사용자/호스트 | active_member_id UNIQUE 활성 1건, WALLET 즉시·BANK off-ledger(isHostDirect), paymentDueAt 72h, lock 순서 | 10 | 1 |
| F17-08 | 정기모임 | 환불 (pro-rata · 트리거별) | 멤버/호스트 | MEMBER_CANCEL=elapsed, HOST_CANCEL=delivered, FORFEIT 동일 산식, 100원 floor, failed_refund.regular_meeting_id | 10 | 1 |
| F17-09 | 정기모임 | 세션 출석 확정·노쇼 | 호스트 | session_attendance 권위, endTime≤now 가드, FORFEIT_ON_LIMIT, scheduler opt-in, close 가드 연동 | 10 | 0 |
| F17-10 | 정기모임 | 호스트 정산 (flow-through) | 호스트 | retained paid/free 분리, close afterCommit REQUIRES_NEW, uk_settlement_rm 멱등, fail-closed, reservedRefund 게이트 | 10 | 1 |
| F03-19 | 이벤트 | 일정 변경 제안·참가자 합의 (RS-002) | 호스트/참가자 | RescheduleClassification(AUTO/MAJOR) 분류, 참가자 PENDING→ACCEPTED/DECLINED/AUTO_ACCEPTED/WITHDRAWN 응답, batch 확정/철회, 48h 자동수락 스케줄러, DECLINED→무료 자동취소 연계, EVENT_UPDATED 알림(type:RESCHEDULE_PROPOSAL/RESCHEDULE_APPLIED/RESCHEDULE) | — | — |
| F03-20 | 이벤트 | 이벤트 노쇼 관리 | 호스트/참가자 | NoShowStatus(CONFIRMED/APPEALED/OVERTURNED), 호스트·cohost 단건/일괄 확정, 참가자 소명(appealCaseId 외부 발급 필요), 호스트 뒤집기(OVERTURNED 제재 카운트 제외), 노쇼 사후 환불(NoShowRefund + dispute_case_id 자동 생성), EventApplyRestrictionGuard 17개 진입점 통합 | — | — |
| F04-18 | 클럽 | 클럽 레퓨테이션 점수 | 클럽 멤버/관리자 | ReputationScoreController(GET /api/v1/club/reputation/me, /members/{memberId}), 클럽 호스트 신뢰도 (HostSettlementReputation)와 별개 도메인, 클럽-스코프 점수 | — | — |
| F11-07 | 리뷰 & 신고 | 호스트 리뷰 모더레이션 | 이벤트 호스트 | 호스트 답변(POST/PUT/GET /reviews/{reviewId}/reply, 수정 EditWindow 제한), 임시 숨김(POST /reviews/{reviewId}/hide, ReviewHideReasonCode **6종**), 숨김 해제(unhide), autoEscalate 옵션(hide 시 Report 자동 생성), 증빙 파일 첨부(EvidenceFileValidator, max 5), 신고 진행 중 리뷰 unhide 차단(legal hold) | — | — |
| F18-01 | 분쟁 해결 | 통합 분쟁 케이스 조회 | 참가자/호스트 | GET /me/dispute-cases(참가자), GET /host/dispute-cases(호스트), UnifiedDisputeStatus(OPEN/IN_REVIEW/RESOLVED/CLOSED/ESCALATED) 필터, **DisputeSourceType enum 21값(분류용) — 실제 emit: 사용자 7종+USER_DISPUTE 양측/호스트 2종**, caseId 형식 `{sourceType}:{sourceId}`, DisputeCaseVo 목록·상세(타임라인·증빙·actorPermissions), Page 페이지네이션 | — | — |
| F18-02 | 분쟁 해결 | 분쟁 직접 접수 | 참가자 | POST /me/dispute-cases, DisputeCaseType(REPORT/APPEAL/REFUND_ISSUE/NO_SHOW_APPEAL/CONTENT_MODERATION/SAFETY/SETTLEMENT/TRANSPORT/HOST_ACTION_REVIEW) 9종, summary 필수(min 10/max 2000자), evidenceFileIds max 5, rate-limit 429/중복 409 가드, active_dedup_key GENERATED 컬럼(OPEN/IN_REVIEW/ESCALATED+target 존재 시 중복 방지) | — | — |
| F18-03 | 분쟁 해결 | 분쟁 이의제기 | 참가자 | POST /me/dispute-cases/{caseId}/appeals, AppealCreateParam(reasonCode 5종: FACT_INCORRECT/EVIDENCE_MISSING/PROCEDURE_UNFAIR/CIRCUMSTANCE_OVERRIDE/OTHER, reasonText min 20/max 1000자), UNIQUE(caseId, appellantUserId) 1건 제약, 철회(POST .../withdraw, PENDING만 가능→CLOSED), DisputeAppealStatus(PENDING/UPHELD/REJECTED/CLOSED), admin이 UPHELD/REJECTED 전이 소유 | — | — |
| F18-04 | 분쟁 해결 | 분쟁 증빙·공개범위·보존 | 참가자/호스트/CS | Visibility(PARTIES/HOST_ONLY/CS_ONLY/PUBLIC_SUMMARY) 4종 **정책 의도(4종 분류)** — **현재 구현은 CS_ONLY 항목 제거만(public detail 조회 시 CS_ONLY 필터링), 역할별 게이트(HOST_ONLY·PARTIES 분기) 미생성**, evidenceFrozen flag, legal hold(OPEN/IN_REVIEW/ESCALATED 상태에서 evidence 삭제 차단), DisputeCaseRetentionScheduler(매일 05:00, RESOLVED/CLOSED 후 1년 경과 시 evidence 정리), EvidenceFileValidator(max 5, 소유권 검증) | — | — |
| F18-05 | 분쟁 해결 | 호스트 운영 인박스 | 호스트 | GET /host/inbox(Page<HostInboxItemVo>), GET /host/inbox/stats(HostInboxStatsVo), HostInboxSourceType 8종(EVENT_MESSAGE/APPLICATION/MEETING_SETTLEMENT_APPEAL/REPORT/PAYMENT_ISSUE/REFUND_ISSUE/OPERATIONAL_ISSUE/DISPUTE_CASE), HostInboxStatus(NEEDS_RESPONSE/IN_PROGRESS/DONE), DISPUTE_CASE 카드→호스트 분쟁 상세 딥링크(미배선 Gap 포함), **unansweredCount는 EVENT_MESSAGE 카드의 스레드 단위 미응답 카운트** | — | — |
| F19-01 | 관심인 | 관심인 등록·관리 | 로그인 사용자 | POST /api/v1/favorites(등록), DELETE /api/v1/favorites/{targetUserId}(해제), GET /api/v1/favorites(목록, active=true max N명 등록순), GET /api/v1/favorites/limit(구독 플랜별 한도 확인), isBlockedBetween status-aware(BLOCKED row만 체크, UNBLOCKED history 제외), FAVORITE_PERSON_NEW_EVENT(96) 알림 팬아웃(FavoriteService.isEffectiveFavorite 기반) | — | — |
| F19-02 | 관심인 | 관심인 캘린더·알림 | 로그인 사용자 | GET /api/v1/favorites/calendar/monthly(관심인 전체 월간 일정 합산), GET /api/v1/favorites/{targetUserId}/monthly(특정 관심인 월간 일정), 관심인이 새 이벤트 발행 시 FAVORITE_PERSON_NEW_EVENT(96) 수신, effectiveTargetIds()로 캘린더·알림 팬아웃 공통 대상 집합 관리 | — | — |
| F19-03 | 관심인 | 공개범위(프라이버시) 설정 | 로그인 사용자 | PUT `/api/v1/users/me/privacy/calendar`(본인 캘린더 공개범위), PUT `/api/v1/users/me/privacy/clubs`(클럽 활동 공개범위), 관심인 한도 무료 **3명** / 프리미엄 **10명**, PrivacySettingController 기반 | — | — |
| F20-01 | 고객지원 | 1:1 문의 | 로그인 사용자 | POST /api/v1/inquiries(문의 생성, InquiryCategory 6종: ACCOUNT/PAYMENT/EVENT/CLUB/REPORT/ETC, sourceType 4종: NONE/EVENT/CLUB/SETTLEMENT), GET /api/v1/inquiries/my(내 문의 목록), GET /api/v1/inquiries/{inquiryId}(상세), POST /api/v1/inquiries/{inquiryId}/messages(추가 메시지), 운영팀 답변 시 SUPPORT_ISSUE_UPDATED(66) 알림 | — | — |
| F20-02 | 고객지원 | 운영 이슈 접수 | 로그인 사용자 | POST /api/v1/operational-issues(이슈 접수), GET /api/v1/operational-issues/my(내 이슈 목록), GET /api/v1/operational-issues/my/by-source(소스별 조회), GET /api/v1/operational-issues/{issueId}(상세), POST /api/v1/operational-issues/{issueId}/messages(추가 메시지), HostInboxSourceType.OPERATIONAL_ISSUE로 호스트 인박스 연동, DisputeSlaExceededScheduler SLA 7일 초과 시 운영알림 승급 | — | — |
| F20-03 | 고객지원 | 지원 FAQ | 로그인/게스트 사용자 | SupportFaqController 기반 자주 묻는 질문 목록·상세 조회, 카테고리별 분류, 고객 자가해결 지원 | — | — |
