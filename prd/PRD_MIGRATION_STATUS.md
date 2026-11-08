# PRD 문서 상태표

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.


> 업데이트: 2026-11-08(갭 후보 수와 코드 대조 기록), 목록은 2026-09-02. `business_logic/prd/02_feature_prds`에 기능 PRD 175개가 등록되어 있다. 상태 컬럼은 각 기능 PRD의 실제 `문서 상태` 문구 또는 source-first 본문을 기준으로 갱신한다. 이 표는 구현 완료표가 아니라, PRD가 어떤 원천과 어느 수준의 소스 대조로 작성됐는지 보여주는 문서 운영 인벤토리다.
>
> 이벤트 확장 PRD 5개(F03-13~17)의 현재 계약은 각 기능 PRD와 `community_api` 실제 소스가 기준이다.
> DB 스키마는 `V1__init.sql` 한 파일에 둔다.
>
> **2026-05-28 운영 원칙 명시 — units/ 부재 = source-first.** F03-13~18 / F04-17 / F08-14~15 / F15-01~09 / F16-01~08 / F17-01~10 (총 36개 신규 PRD, 2026-06-05에 F03-19~20 / F04-18 / F11-07 / F18-01~05 / F19-01~03 / F20-01~03 15개 추가로 총 51개), 이후 F21-01~07 7개가 추가되어 현재 58개 기능은 `business_logic/units/<domain>/<feature>/` 폴더 없이 작성된다. canonical은 실제 Controller/Service/DTO/enum/DDL/test와 App/Admin 소비부이며, plan·구현 리포트는 설계 배경으로만 사용한다. F03-13~17은 `EnumReservationTest`가 enum registry만 검증하고, F15·F16은 `community_api/src/main/java/com/endside/community/{warning,mileage}/`, F21은 API/App/Admin 제공자·약관·배정·원장 소스를 직접 대조한다. units/ 새로 만들면 운영 모델이 깨진다 — 만들지 않는다.

## 요약

| 항목 | 개수 |
| --- | ---: |
| **현재 총 기능 PRD (2026-09-02)** | **175** |
| Golden sample | 1 |
| 실사 기반 전환본 | 115 |
| 실사 기반 갱신본 | 1 |
| 실사 기반 신규 작성 | 1 |
| 신규 PRD | 3 |
| 코드·운영 화면 완료 | 4 |
| source-first 구현 확인 | 42 |
| source-first PRD | 5 |
| source-first 부분 구현 | 3 |
| 누락/확인 필요 | 0 |

## 상태 축 분리와 갭 후보 판정 미완 고지

이 표는 **문서 작성·대조 수준**을 잰다. 어떤 기능이 첫 출시에 실제로 열리는지, 그리고 그 사실을
무엇으로 확인했는지는 이 표로 알 수 없다. 그 질문은 새로 만든 두 페이지가 답한다.

- `docs/qa/launch-status.html` — 현재 출시 판정, 출시 관문, 출시를 막는 항목·제한하는 항목·후속으로
  넘긴 항목의 등록부, 기능 ID와 개발 작업 코드의 연결표
- `docs/qa/feature-status.html` — 175개 기능 각각의 두 축(첫 출시에 열리는가 / 무엇으로 확인했는가)

**갭 후보 판정은 2026-11-08 에 끝났다.** 기능 PRD의 `## 8. Gap / Risk` 표에 "실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정" 상태로
남은 행은 없다(2026-08-18 기준 286행 중 280행, 2026-11-08 낮 234행, 저녁 144행을 모두 판정했다). 판정 결과 `Gap` / `Risk` /
`Decision Needed` 로 남은 행은 결함 수가 아니라 확인된 미완성·위험·결정 거리다. 다음을 지킨다.

1. 고객이 체감하는 `Gap` / `Risk` / `Decision Needed` 는 `docs/qa/launch-status.html` 등록부와 해당 기능 HTML 에 올린다.
   등록부에 없는 행을 "문제 없음"으로 읽지 않는다.
2. 새 후보를 적을 때는 실제 소스에서 재현 여부를 확인한 뒤 판정 칸을 `Gap` / `Risk` / `Decision Needed` / `해소됨` 중 하나로
   바로 쓴다. 지시문을 남겨 두지 않는다.
3. `docs/qa/feature-status.html` 의 "미판정" 열은 모든 기능이 0 이다.

## 2026-11-08 코드 대조 기록

서버·앱 main 을 읽어 판정했다. PRD 본문에는 결과 문장만 두고 근거 자리는 여기에 남긴다. 경로는 서버 `domain/src/main/java/com/endside/community/` 와 `api-app/src/main/java/com/endside/community/`, 앱 `lib/` 기준이다.

### 남은 글이 코드와 어긋난 곳(2026-11-07 정리 때 찾은 12곳) — 모두 고침

| PRD | 코드가 말하는 것 | 근거 |
| --- | --- | --- |
| F03-02·F03-11 숨김 | 모임 상태는 넷이고 운영자 숨김은 따로 둔 표지다. 숨긴 모임은 당사자만 상세를 열고 그 밖은 `EVENT_NOT_FOUND`, 공유 링크로도 열지 않는다. 새 신청·참석·찜을 받지 않는다. 호스트·공동 호스트에게만 숨김 안내 | `event/constants/EventStatus.java`, `event/model/Event.java:78-84,360-363`, `event/service/EventViewerContextService.java:790-824,843-848`, `event/service/WishlistService.java:76-87`, 앱 `presentation/event/screens/event_detail_screen.dart:283-290,336` |
| F03-07 모집 마감 화면 | 정원 설정 화면의 「모집 상태」 구역이 마감(확인 창)·다시 시작을 부른다. 모임을 연 호스트이고 정기모임 회차가 아닐 때만 보인다 | 앱 `presentation/event/screens/capacity_settings_screen.dart:169-180,220-227,384-385,406-432` |
| F03-05·F03-13 결제 만료 알림 | 만료는 신청 하나씩 조건부로 바꾸고 결정 이력과 알림 75(`EVENT_PREPAYMENT_EXPIRED`)를 같은 트랜잭션에 남긴다. 확인 대기 계좌이체 신고가 있으면 만료하지 않는다 | `event/service/ApplicationService.java:566-608`, `event/service/ApplicationTransitions.java:465-490`, `event/repository/query/ApplicationQueryRepository.java:302-316`, `event/prepayment/service/EventPrepaymentNotices.java:35-39` |
| F03-19 변경 대상 | 동의 대상은 계정 있는 참석·대기자, 돈을 냈거나 입금 신고한 진행 중 신청자, 결제 행 없는 진행 중 신청자다. 0명이면 같은 트랜잭션에서 바로 적용 | `event/reschedule/service/EventRescheduleProposalService.java:245-279`, `capacity/service/EventChangeConsentRoster.java:15-45` |
| F03-20 시작 전 확정 | 단일·일괄 노쇼 확정은 OPEN·CLOSED 이고 시작 시각이 지났을 때만 받는다. 종료 시각 상한은 없다. 앱 일괄 단추는 같은 판정의 서버 표지를 따른다 | `capacity/service/EventNoShowService.java:289-308`, 앱 `presentation/event/widgets/no_show_manage_section.dart:28,44-50` |
| F04-03·04 도메인 소유권 이전 | 제안(201, `PROPOSED`, 7일) → 받는 회원이 재인증해 수락하면 같은 처리 안에서 `EFFECTIVE`. 거절·취소·만료가 있다 | `club/controller/ClubController.java:252-300`, `club/constants/ClubOwnershipTransferStatus.java`, `club/service/ClubOwnershipTransferTransitions.java:20-23,86-96`, `club/service/ClubOwnershipTransferService.java:94` |
| F04-15 지급처 | 관리자 승인은 기금 차감·예약 분개 뒤 연결된 출금 요청을 승인해 신청 때 복사한 정산 계좌로 보낸다. 지갑 입금이 아니다. 지급이 끝나면 PAID | `club/service/ClubSettlementService.java:179-236`, `payment/withdrawal/port/ClubFundWithdrawalAdapter.java:45-53` |
| F06-06 옛 결제 서술 | 카드 환불 대기열(`refund.pg-queue.enabled`)과 PG 환불 상태 열거·비동기 환불 작업기는 없다. 환불은 지갑으로 바로 돌아간다. 지갑 환불 창구(`POST /api/v1/wallet/refund`)도 없다. 충전 취소의 결과 모름은 결과 모름 사건으로 조회해 푼다. 지갑 결제 창구는 금액을 받지 않는다 | `api-app/.../payment/controller/WalletController.java`(매핑 목록, `:219` 정책 조회), `payment/service/WalletRefundPolicyService.java`, `payment/cancel/ChargeCancelIndeterminate*.java`, `event/prepayment/controller/EventPrepaymentController.java:128`, `api-app/src/main/resources/application-prod.yaml:153-163` |
| F08-06 S7·S10 | 승인 뒤 심사 대상 칸을 바꾸면 SUBMITTED 로 재심사. 판매된 적 있으면 삭제 거절(`MARKET_ITEM_SOLD_NOT_DELETABLE`). 삭제한 아이템은 작성자에게 REMOVED, 남에게 `NOT_FOUND` | `plan/service/MarketItemService.java:203-215,299-308,410-425`, `plan/policy/MarketAbilityPolicy.java:32-46` |
| F11-07 답변 수정 표 | 앱이 수정 가능 시각 안에서만 「답변 수정」 을 보이고 수정 시트가 저장한다 | 앱 `presentation/review/widgets/review_card.dart:74-78,254-257`, `presentation/review/screens/review_list_screen.dart:252-259` |
| F20-02 앱 종류 | 앱 열거가 서버 7종을 모두 갖는다. 접수·스레드 메시지가 증빙 id 를 보낸다. 가시성은 서버 기본값 | `support/constants/OperationalIssueSourceType.java`, 앱 `data/models/support/operational_issue.dart:11-35`, `data/models/support/operational_issue_create_param.dart:16-22` |

### 미반영 여섯과 그 밖의 확인

| 항목 | 지금 코드 | PRD | 근거 |
| --- | --- | --- | --- |
| 호스트 직접 수납 | 들어감 | 반영. 입금 신고·확인·거절·환불 확인은 F03-05·F03-07·F03-13·F17-02·F17-05·F17-07, 받을 계좌 등록·인증과 인증 강제를 끈 지금 상태는 F07-10 4절 | `event/prepayment/service/EventHostBankAccountService.java`, `BankAccountVerification*.java`, `HostDirectCashBootGuard.java`, 설정 `payment.host-direct-cash` |
| 출시 범위 관문 | 들어감 | 반영. 묶음 목록·상위 의존·운영 기본값·410·안전 출구는 권한 정책 PRD 「출시 범위와 안전 출구」 | `ReleaseScope*.java`(도메인 `P0`·`CASH_EVENT`·`MARKET`·`MARKET_PERIOD_PASS` …), `RELEASE_SCOPE_DISABLED` |
| 계정 정지 제한 세션 | 들어감 | 반영. F15-08 4-C(허용 목록·앱 화면 목록·토큰과 상태), F01-01 1절, F13-06 1절 | `JwtProperties.java:22-27`(`SCOPE_RESTRICTED`), `api-app/.../config/security/JwtAuthorizationFilter.java:126,183`, `AccountSanctionService.java:42` |
| 분쟁 종결 | 들어감 | 반영. F18-01 4절 「종결과 보상」(진행 상태 여섯, 당사자 명령, 보상 원장과 종결 차단) | `DisputeCompensationLedger*.java`, `DisputeCompensationCommand.java` |
| 마일리지 규칙·배지 | 들어감 | 반영. 배지는 F16-01·02·05·06·08, 제도 상태 셋·기본 규칙 셋·공개 때 고정(신규 적용)은 F16-04 1절 | `MileageBadge*.java` |
| 이메일 인증 제한 세션의 화면 파급 | 제한 세션 자체가 2026-10-29 에 없어짐(가입 전 번호 확인) | 해당 없음. F01-03 이 이미 반영 | `EmailCodePurpose.java`(`SIGNUP`·`PASSWORD_RESET`·`SOCIAL_LINK`), `EmailCodeService.java` |
| 플랜 읽기 조판·TABLE(옛 「미커밋 Flutter 작업본」) | 앱·서버 main 에 들어감 | F08-02 11.3, F08-03 11.5·11.6, 08 도메인 9.6 을 지금 계약으로 고침 | 앱 `presentation/plan/screens/plan_reading_mode_screen.dart:33,68,77,114-126`, `presentation/plan/theme/plan_block_text_styles.dart:11,50-53,110`, `presentation/plan/widgets/block_renderer.dart:1730,1823`, `presentation/plan/widgets/block_type_sheet.dart:132-148`, `data/models/plan/table_block_adapter.dart:83`, 서버 `PlanBlockTableRowsValidator.java` |
| 여러 요일 반복 생성 시험 | 있음 | F03-03 다음 조치 칸을 고침 | `domain/src/test/.../event/service/RecurringEventCreateSourceGateTest.java:210,249,316`, `domain/src/test/.../club/service/ClubRecurringEventServiceTest.java:302,419` |
| F06-06 S8·S9, F06-08 시험 | S8 은 창구가 금액을 받지 않아 구조로 막힘. S9 는 충전 취소 결과 모름으로 바뀌었고 시험이 있음. F06-08 은 개인 구독 서비스 시험이 있음 | F06-06 S8·S9 를 고침 | `EventPrepaymentController.java:128`, `ChargeCancelIndeterminateServiceTest.java`, `ChargeCancelIndeterminateInternalControllerTest.java`, `SubscriptionServiceTest.java` |

### 소개 웹·보관 설명 문서

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 소개 웹 「공개 전 남은 확인」 ① 앱 서명 키 지문 | 들어감. 업로드 키와 Play 앱 서명 키 두 줄이 있다. 소개 웹 확인 문서의 「업로드 키 지문 하나뿐」 문장이 낡았다 | 소개 웹 `src/deeplinks.mjs:3-8` |
| ② 개인정보처리방침·계정 삭제 안내의 `[운영자 확인 필요]` | 남음(15곳: 개인정보 11, 약관 1, 안내 3). 운영자·법무가 채울 값이라 코드로 닫지 않는다 | 소개 웹 `src/privacy-content.mjs`, `src/legal-content.mjs`, `src/guide-content.mjs` |
| ③ 종교 민감정보 별도 동의 문구 | 법무 승인 대상. 코드 판정 밖 | 소개 웹 확인 문서 |
| ④ `/open/` 경로와 `.well-known` 응답 형식, ⑤ 모임·클럽 설치 안내 Nginx 반영, ⑥ 출시 상태·주소 확정 | 운영 서버·출시 준비에서 확인할 일. 코드 판정 밖 | 소개 웹 `deploy/content-links.nginx.conf` |
| 보관 설명 문서의 기부 취소 7일 | 맞음 | `club/service/ClubDonationService.java:262,286` |
| 보관 설명 문서의 무료 포인트 180일 만료 | 틀림. 무료 지급은 원천과 상관없이 지급일부터 1년이고 유료 포인트는 기한이 없다. 환불로 되돌린 무료 몫의 남은 기한이 30일 미만이면 되돌린 날부터 30일짜리 새 묶음으로 뗀다 | `payment/service/WalletCreditService.java:30-31,157-161`, `payment/service/ChargeLotConsumptionService.java:32-34,43` |

### 미반영 다섯 들이기의 근거

| PRD | 들인 내용 | 근거 |
| --- | --- | --- |
| F07-10 4절 | 등록·기본 계좌·같은 계좌 재등록, 모임 결박과 고치기·지우기 막기, 1원 인증 창(4자리·10분·5번), 정보를 바꾸면 확인 풀림, 지금은 인증 강제 끔 | `payment/meeting/service/SettlementBankAccountService.java:101-227,381-472`, `event/service/EventHostBankAccountService.java:24-53,113-169`, `payment/meeting/constants/BankAccountVerificationStatus.java`, api-app `payment/meeting/controller/SettlementBankAccountController.java`, `application-prod.yaml` `payment.host-direct-cash.require-verified-account`(기본 false)·`bank-account-verification` |
| 권한 정책 「출시 범위와 안전 출구」 | 묶음 목록·상위 의존·운영 기본값·앱 범위 응답·410·안전 출구·미분류 창구 기동 거부 | `config/release/ReleaseScopeDomain.java`, `ReleaseScope.java`, `ReleaseScopeVo.java`, api-app `config/release/ReleaseScopeController.java`(`GET /api/v1/app/release-scope`), `application-prod.yaml` `release.scope.enabled-domains`, 시험 자원 `api-app/src/test/resources/release-scope/classification-snapshot.txt`(안전 출구 79, 봉인 215) |
| F15-08 4-C, F01-01, F13-06 | 제한 토큰 발급·허용 목록·앱 화면 목록·상태가 권한을 정함·삭제 요청과 내보내기는 닫힘 | `account/service/TokenService.java:56-99,171-188`, `account/service/AuthService.java:160-180,230-232`, api-app `config/security/AccountLockPolicy.java`, `config/security/JwtAuthorizationFilter.java:73-75,120-212`, 앱 `core/router/account_lock_routes.dart`, `presentation/auth/screens/account_blocked_screen.dart` |
| F18-01 4절 | 진행 상태 여섯과 전이, 결과 확인·종결 동의·이관·소명 대화, 보상 명령과 원장 상태, 대기·실패면 종결 막음 | `host/dispute/constants/DisputeWorkflowStatus.java`, `DisputeCompensationCommand.java`, `DisputeCompensationStatus.java`, api-app `host/dispute/controller/DisputeCasePartyController.java` |
| F16-04 1절 | 제도 상태 셋과 전이, 기본 규칙 셋(체크인 10·후기 5·사진 3 꺼짐), 공개 때 모임 규칙 고정과 상한 | `mileage/constants/MileageProgramStatus.java`, `mileage/service/MileageEarningRuleService.java:99-159`, `mileage/service/MileageEventRuleService.java:47-145`, `mileage/constants/MileageEventRulePolicy.java` |

### 2026-11-08 갭 후보 판정(90행)

| PRD | 판정 | 근거 |
| --- | --- | --- |
| F03-05(20) | 유료 승인제 순서·체크인 정리·끝난 모임 승급 건너뜀·마감 거절·승인 필요 판정·재신청·`WAITING` 은 해소됨. 신청 메시지 길이 검증 없음은 Risk | `event/service/ApplicationEntryService.java:115-192`, `capacity/service/CapacityService.java:205-214,432-442,417,561,996`, V1 `application.message varchar(500)`, `event/param/ApplicationParam.java`, 앱 `data/models/attendance/attendance_status.dart`, `presentation/event/widgets/event_action_bar.dart:63-85,695` |
| F04-03(11) | 삭제·넘기기 입구와 확인 창 해소됨 | 앱 `presentation/club/screens/club_edit_screen.dart:91,395-412`, `presentation/club/widgets/club_delete_dialog.dart` |
| F02-04(9) | 기기에서 거르는 필터는 Risk, 점수·트렌딩·다음 쪽 실패 안내는 해소됨 | 앱 `domain/providers/home/recommend_events_provider.dart:57-159`, `presentation/home/screens/recommend_events_screen.dart:85-95` |
| F03-06(8) | 결제 대기 탭·기한 표시·거절 사유 필수 해소됨 | 앱 `presentation/event/screens/application_list_screen.dart:68,145`, `presentation/event/widgets/application_card.dart:136-229`, `event/param/ApplicationDecisionParam.java` |
| F10-02(8) | 비공개 만남 일정 누름 없음은 Gap(데이트 묶음은 첫 출시에 닫힘) | 앱 `presentation/calendar/screens/daily_calendar_screen.dart:485-503`, `monthly_calendar_screen.dart:538-545` |
| F03-12(7) | 상태 필터 서버 처리·세 탭 해소됨 | api-app `event/controller/EventController.java:184-216`, `event/param/MyEventSearchParam.java`, 앱 `presentation/event/screens/my_events_screen.dart:26-28` |
| F04-14(6) | 기부 알림·1회 상한은 Decision Needed | `club/service/ClubDonationService.java:55,123` |
| F07-10(3) | 내 정산 카드 누름·신뢰도 배지 해소됨 | 앱 `presentation/meeting_settlement/screens/my_settlement_entries_screen.dart:25-60,300-345`, `widgets/host_reputation_badge.dart:83-92`, `presentation/event/widgets/event_host_card.dart:112` |
| F07-09·F13-07·F04-12·F04-07·F10-04·F05-05·F08-12·F13-01 일부(18) | 계좌이체 환불 마무리, 탈퇴 뒤 기기 정리는 해소됨. 나머지는 그림 줄·원문 조각·시험 보강 기록 | 앱 `domain/providers/auth_provider.dart:840-874`, 분류 스냅숏의 계좌이체 안전 출구 |

### 2026-11-08 갭 후보 판정(남은 144행, 66 기능)

| PRD(후보 수) | 판정 | 근거 |
| --- | --- | --- |
| F01-06·F01-08(2) | 태그 3개는 「다음」 조건·건너뛰기 있음, 해제 제공자 열거·이메일 거절·마지막 수단 막음 해소됨 | 앱 `presentation/auth/screens/onboarding_interests_screen.dart:36,92,159-161`, `account/param/UserPreferenceTagParam.java`, api-app `account/controller/AuthController.java:118-124`, `account/service/SocialLoginService.java:97-123`, 앱 `presentation/profile/screens/connected_accounts_screen.dart:48-70,156-175` |
| F02-01·F02-02·F02-03(6) | 홈 예정 모임은 시작 시각순(위치 안 씀), 공용 요청 제한, 마켓 목록 입구는 비공개 경로·상세는 공개 해소됨 | `main/service/HomeService.java:151-198`, `main/param/HomeEventSearchParam.java`, api-app `config/security/RateLimitingFilter.java`, 앱 `core/router/routes.dart:366,763-775`, `core/router/app_redirect.dart:219-223` |
| F03-01·03·04·08·09·10·11(13) | 거리순 없음, 임시 저장, 이후 회차 일괄 수정·취소, 공개 뒤 수정은 동의 절차, QR 새로 받기, 사진 10MB·축소, 연결 실패 안내, 찜 거절 문구 해소됨. 플랜 연결 덮어쓰기 입력 칸 없음은 Gap | 앱 `presentation/event/screens/event_list_screen.dart:43`, `core/storage/event_draft_storage.dart`, `domain/providers/event/event_create_provider.dart:58,176,209`, `event/service/RecurringEventUpdateService.java`(시험 `RecurringEventUpdateServiceTest`), 앱 `presentation/event/screens/event_edit_screen.dart:771-799,1142`, `presentation/event/widgets/qr_code_view.dart`, `core/utils/image_upload_helper.dart:13-26,77-90`, `presentation/event/widgets/photo_upload_sheet.dart:200-211`, `data/models/event/event_plan_map_add_param.dart:11-13`, `presentation/event/widgets/event_plan_card.dart`, `presentation/event/screens/event_plan_link_screen.dart:123,191-204`, `presentation/event/screens/event_detail_screen.dart:1786-1806` |
| F04-01·05·07·08·10·11·12·13·15(18) | 시험 보강 기록, 달력 회원·통계 운영진, 반복 만들기 운영진·제재·회차 0 거절 해소됨. 회원 통계 「참석률」 이 활동 멤버 비율인 것과 신규·증감·기간 없음은 Risk, 인출 사유 서버 무검증은 Risk | `club/service/ClubEventStatisticsService.java:59-62,150-152,257-277`, `club/service/ClubRecurringEventService.java:80-122`, api-app `club/controller/ClubEventController.java:278-326`, 앱 `presentation/club/widgets/member_stats_overview.dart:37-65`, `presentation/club/screens/club_member_stats_screen.dart`, `club/param/ClubFundWithdrawParam.java`, `club/service/ClubSettlementService.java:84-85,266-270`, V1 `club_fund_withdrawal.reason varchar(500)`, 앱 `presentation/club/finance/screens/withdrawal_screen.dart:210-254`, `presentation/club/community/screens/post_edit_screen.dart:212-217` |
| F05-01·02·03·05(8) | 거리 값 비어 있음, 자동완성은 글자 검색, 필터는 검색 조건, 검색어 그대로 찾음, 새 결과 알림 경로, 이름순 정렬 해소됨 | `search/vo/SuggestionVo.java`, 앱 `presentation/search/screens/search_screen.dart:377-395`, `presentation/search/widgets/suggest_dropdown.dart:70`, `data/api/search_api.dart:19,73`, `core/utils/notification_router.dart:489-490`, `presentation/search/utils/saved_search_sort.dart:9-13` |
| F06-03·04·07·08·09·10(18) | 충전 취소 확인 창, 결제 수단 배열, 개설권 3,000원·유료 포인트·6개월·만료 안내, 수익 요약에 증감 없음 해소됨. 정산 이의 첨부 없음은 Gap | 앱 `presentation/payment/screens/transaction_detail_screen.dart:402-420`, `data/api/wallet_api.dart:35`, `data/api/payment_method_api.dart:14-15`, `payment/service/HostingTicketService.java:46,72-103`, 앱 `presentation/payment/screens/hosting_ticket_screen.dart:45,191-234,262-271`, `presentation/payment/screens/earnings_dashboard_screen.dart:112-155`, `payment/param/SettlementAppealParam.java`, `payment/service/SettlementAppealService.java:39,114-121`, 앱 `presentation/payment/widgets/settlement_appeal_dialog.dart:34-35,75` |
| F07-01·02·03·04·05·07·09(15) | 정산 만들기는 방식·메모만, 영수증 본인 증빙만, 시작 뒤 항목 수정 거절, 시작 선택 값, 현황 입구, 송금 목록에서 내기, 알림 이력 카드, 선입금 배지 여섯 해소됨. 알림 덧붙임 말 입력 칸은 Decision Needed | `payment/meeting/param/MeetingSettlementAddParam.java`, `MeetingSettlementActivateParam.java`, `MeetingSettlementItemParam.java`, `payment/meeting/service/MeetingSettlementItemService.java:129,377-396`, V1 `meeting_settlement.note text`, 앱 `data/server/server_error_codes.dart:1102-1106`, `domain/providers/meeting_settlement/settlement_detail_provider.dart:92-104`, `presentation/meeting_settlement/screens/settlement_status_screen.dart:1058-1080`, `presentation/meeting_settlement/screens/my_settlement_shares_screen.dart:123-130`, `data/models/meeting_settlement/meeting_settlement_remind_param.dart:13-14`, `presentation/meeting_settlement/widgets/prepayment_card_widget.dart:87-98,192-222` |
| F08-01(1) | 해소됨 1 | lib/presentation/plan/screens/plan_list_screen.dart:161-184(실패 시 showApiErrorToast, 대체 문구 「플랜을 만들지 못했습니다」), :240-271(_create: 실패면 창을 닫지 않고 _draft.failed) |
| F08-08(2) | 해소됨 2 | api-app plan/controller/MarketSearchController.java:32-36(limit 기본 10, 최대 50); domain plan/service/MarketItemService.java:98-102, 453-456; plan/repository/query/MarketItemQueryRepository.java:76-110(목록: 판매 중·닫힌 종류 제외·종류·가격·난이도), :103-110(인기: purchaseCount desc, itemId desc), :158-161(listedOnSale), :212-221(정렬, 모르는 값은 최신); lib/presentation/market/screens/market_main_screen.dart:130-155(분류를 고르면 searchItems, 아니면 getMarketItems) |
| F08-09(4) | 해소됨 3행(4건) | MarketItemService.java:439-451(분류 거름, 숨은 분류면 빈 쪽); MarketItemQueryRepository.java:41-73(검색 조건), :163-167(검색어: hasText 일 때 제목·설명 containsIgnoreCase), :168-176(통화·종류 parseEnum), :232-239(정렬: POPULAR·PRICE_ASC·PRICE_DESC, 그 밖은 최신); common/util/EnumUtils.java parseEnum(빈 값·모르는 값은 INVALID_INPUT); lib/data/server/server_error_codes.dart:373(INVALID_INPUT=400); lib/presentation/market/screens/market_search_screen.dart:55-62(앞뒤 공백 제거, 비면 안 보냄) |
| F08-11(3) | Gap 1, 해소됨 2 | lib/presentation/market/screens/market_item_detail_screen.dart:333(구매하기 → _handlePurchase 바로), :529·560-580(묶음도 바로), :862-885(확인 창 없이 purchaseItem), :888-985(_handlePurchaseError: 충전 가능한 부족만 충전 권유, 그 밖 400·409 는 문구 함수); lib/presentation/market/market_purchase_error_message.dart:16-47(월 한도·묶음 한도·품절·돈 잠금 실패 문구, isChargeableShortfall 은 INSUFFICIENT_BALANCE·INSUFFICIENT_PAID_BALANCE 만); lib/presentation/plan/screens/plan_preview_screen.dart:296-340(무료 포인트 선택 가능할 때만 결제 수단 시트); 명세 docs/ui-ux/screens/22-plan-market.md:150·182·210(구매 확인 바텀시트), 23-plan-editor.md:660(구매 확인 다이얼로그) |
| F08-12(3) | 해소됨 1행(3건) | lib/presentation/market/screens/my_collection_screen.dart:188-195(갱신하기 → _openRenewal), :514-524(하나면 상품 상세, 여럿이면 「만료 예정」 거름) |
| F08-13(2) | 해소됨 2 | domain plan/service/PlanService.java:570(validatePlanEventAddParam), :600-602(참가비 있으면 EVENT_REQUIRES_PREPAYMENT), :615-616(visibility·locationType parseEnum); plan/param/PlanEventAddParam.java(반복 칸 없음); plan/service/MarketItemReviewService.java:28-147(쓰기·고치기·지우기에 부수 작업 없음); plan/repository/query/ItemReviewQueryRepository.java:16-37(평균·개수는 지워지지 않은 후기로 매번 계산); MarketItemService.java:470-471(상세 응답에 평균·개수); lib/presentation/market/screens/market_item_detail_screen.dart:787-808(쓰기 뒤 상세 다시 읽음, 고치기 뒤 안 읽음), :847-852(지우기 뒤 다시 읽음); lib/presentation/plan/screens/plan_event_create_screen.dart:427-433, 728(참가비 안 보냄) |
| F09-03(3) | Risk 2, Decision Needed 1 | privatedate/service/DateMatchExpirationScheduler.java(매 정시 PENDING 만료, 매일 03시 30일 무활동 방 닫기); privatedate/service/DateMatchExpirationWorker.java(만료 시 양쪽 알림, 방 INACTIVE); privatedate/repository/query/DateMatchQueryRepository.java:120-128(무활동 판정 = DateMatch.updatedAt < cutoff); privatedate/model/DateMatch.java:51-52(@LastModifiedDate updatedAt); java-class-refs: DateMatchRepository#save 는 DateAccountClosure·DateBlockService·DateMatchExpirationWorker·DateMatchingService 만, DateChatService 는 DateMatch 를 읽기만 함; privatedate/service/DateMatchingService.java:295(expiresAt = 지금+7일), :300-302(기존 매치에서 자기 동작을 덮어씀); lib/presentation/date/screens/candidate_card_screen.dart:141-152(맨 앞 카드, 처리 후보는 userId 로 제거), :168-206(✕·♥ GestureDetector, 진행 중 잠금 없음), :276-292(_onAction, 실패면 「오류가 발생했습니다」); 명세 docs/ui-ux/screens/24-private-date.md:186-214(좌우 스와이프 카드) |
| F09-05(1) | 해소됨 1 | lib/presentation/date/screens/chat_screen.dart:403(_roomUnavailableMessage), :436-456(보낼 수 없으면 _InputDisabledBar 에 서버 거절 이유 또는 기본 문구), :474-476(_canSend: 소켓 닫힘·actions.send), :600-630(닫힘 안내 띠) |
| F09-06(3) | 해소됨 1, Risk 1행(2건) | privatedate/constants/MeetingStatus.java(PROPOSED·CONFIRMED·CANCELLED·COMPLETED); lib/data/server/server_enums.dart:1698-1702; 명세 docs/ui-ux/screens/24-private-date.md:527(같은 넷), :643(위치 공유는 제품에서 제거, 제공 기능처럼 노출 금지); location/model/LocationShare.java(eventId 만, 데이트 만남 위치 공유 없음); lib/presentation/date/screens/meeting_proposal_screen.dart:591-600(「미팅 시작 1시간 전부터 종료까지 자동으로 위치가 공유됩니다」), :720(위치 공유 안내 단추), :845(확정 카드 「만남 시작 1시간 전부터 위치가 공유됩니다」) |
| F09-08(3) | 해소됨 3 | privatedate/service/DateProfileService.java:475-491(recordProfileView: 본인·프로필 없음 제외, 24시간 중복 제거); java-class-refs: recordProfileView 는 DateMatchingService(좋아요·넘김 처리)에서만 부름, getProfileByProfileIdWithView 는 없음(0건); lib/presentation/date/screens/profile_viewers_screen.dart:99-105(빈 상태 아이콘·제목·설명, 단추 없음), :108-195(방문자 줄에 누름 동작·화살표 없음) |
| F10-01(1) | 해소됨. 달력 관련 알림은 구글 연결 끊김 하나, 통합 달력 여는 알림 없음 | `core/utils/notification_router.dart:628-629`, `core/router/routes.dart:318-336`, `core/router/app_redirect.dart:127-129` |
| F10-03(1) | 해소됨. 시험 보강 기록 | PRD 원문 절 제목 |
| F10-04(4) | 입구 둘 해소됨. 시간 검사·실패 안내 둘은 Gap | 입구 `presentation/calendar/screens/monthly_calendar_screen.dart:107`, `presentation/calendar/screens/recurring_rule_list_screen.dart:71,137`, `presentation/calendar/screens/availability_screen.dart:288-297`; Gap `presentation/calendar/screens/recurring_rule_screen.dart:189`(저장 단추 조건), `:538-552`(자정 넘김 길이), `:580-590`(분 제한 없는 시각 고르기), `:723-750`(저장·수정 실패 무안내), `:786-793`(삭제 실패 무안내), `domain/providers/calendar/availability_provider.dart:121-150`(실패면 null/false 만), 서버 domain `calendar/service/AvailabilityService.java:99-102,541-561`(끝>시작, 30~480분, 30분 단위), 명세 `docs/ui-ux/screens/25-calendar.md:359-376`(실패 토스트). 단건 화면은 30분 검사·실패 안내가 있다 `availability_screen.dart:435-457,626-653` |
| F10-05(2) | 해소됨. 다른 회원 가능 시간 주소 자체가 없음(설계 철회) | api-app `calendar/controller/AvailabilityController.java:33-155`(회원별 공개 조회 경로 없음), `data/api/availability_api.dart:18-50`, PRD 2절 철회 표시, 명세 `25-calendar.md:354-355`(나만 보는 기록) |
| F11-03(1) | 해소됨. 서버 확인 뒤 다시 읽기 | `domain/providers/review/review_write_provider.dart:153-176`, `presentation/review/screens/review_list_screen.dart:77-100` |
| F12-02(3) | Gap. 묶음 보기는 최근 20건만, 이어 불러오기 없음, 건수도 20건 안 | domain `notification/service/NotificationService.java:617-639`, `data/repositories/notification_repository.dart:40-46`, `domain/providers/notification/notification_list_provider.dart:140-148`, `presentation/notification/screens/notification_list_screen.dart:611,648,820-858`, 명세 `docs/ui-ux/screens/27-notification.md:75` |
| F12-03(1) | 해소됨. 즉시 한 요청 저장, 실패면 그 변경만 되돌림, 명세에 늦춰 보내기 없음 | `presentation/notification/screens/notification_settings_screen.dart:503-537`, `domain/providers/notification/notification_settings_provider.dart:55-80`, 명세 `27-notification.md` SCR-NT-002 표(카테고리 토글 줄) |
| F13-01(3) | 해소됨. 401 문제 형식, 앱 갱신·관문, 내 정보 조회는 인증 상태 관리가 부름 | 공용 근거, `data/api/auth_api.dart:110-111`, `data/repositories/auth_repository.dart:206-215`, `domain/providers/auth_provider.dart:559,758,1178` |
| F13-02(4) | 검증·사진 셋 해소됨. 중복 닉네임 안내 Gap | domain `account/service/UserService.java:303-334`(중복 409), `:386-395`(길이 400), `account/param/UserModParam.java`(검증 표시 없음); 사진 `core/utils/image_upload_helper.dart:60-150`, api-app `file/controller/FileController.java:24-79`, domain `file/service/FileStorageService.java:48-51`(S3); Gap `presentation/profile/screens/profile_edit_screen.dart:434-440`(오류 무시), 문구는 이미 있음 `data/models/common/api_error.dart:519`, 입력 제한 `profile_edit_screen.dart:247,276` |
| F13-03(4) | 셋 해소됨. 글 길이 Risk | domain `account/service/UserAddressService.java:25,46-66,94-100,128-145`(404·403·한도), `:152-191`(종류·주소·좌표만 검사), `account/param/UserAddressAddParam.java`(검증 표시 없음), V1 `db/migration/V1__init.sql:211-220`(label 50, address_detail 200, address 500), `presentation/profile/screens/address_form_screen.dart:393`(일반 실패 문구, 길이 제한 없음), 공용 근거 무결성 위반 409; 호출 `data/api/user_address_api.dart:14-30`, `data/repositories/profile_repository.dart:30-79`; 한도 `presentation/profile/screens/address_list_screen.dart:24,41,75` |
| F13-04(1) | 해소됨. 서버·앱 20개 | domain `account/service/UserPreferenceTagService.java:26,57-58`, `presentation/profile/screens/preference_tag_screen.dart:19,75,104-107` |
| F13-05(2) | 해소됨. 공용 오류 응답, 커밋 뒤에만 실행 기동 | domain `account/service/DataExportService.java:32-55`, `presentation/profile/screens/data_privacy_screen.dart:182-191`, 공용 근거 |
| F13-06(1) | 해소됨. 확인 창만, 서버도 비밀번호 받지 않음, 명세도 확인 창만 | api-app `account/controller/DataPrivacyController.java:45-51`, domain `account/param/DeactivationConsentParam.java`(동의 판 번호·보관금 건만), `presentation/profile/screens/data_privacy_screen.dart:636`, 명세 `docs/ui-ux/screens/28-profile-settings.md:525,542,855-861`. 참고: 재인증 장치는 클럽 소유권 넘기기·마일리지 설정에만 쓰인다(`account/service/AccountReauthenticationService` 참조 둘). 즉시 탈퇴도 재인증이 없다 |
| F13-07(4) | 해소됨 넷 | domain `account/service/AccountDeactivationService.java:188-244`(점검 읽기만), `:379-407`(막히면 탈퇴 불가 번호), `:669-718`(신청 취소 실패는 남김), `:418-420`(탈퇴 뒤 정리), `:866-876`(판매 내리기 실패 → 잠금 뒤 판정), `:898-952`(클럽 나가기 실패 → 막음 항목), `:557-575`(잠금 뒤 대기 기록 수), `account/service/AccountDeactivationResolutionWorker.java:73-82`, `club/service/ClubAccountClosure.java:83-92,134-150`, `club/constants/WaitType.java`(신청·초대·차단), `account/service/UserDeactivationFinalizer.java:82-86`; 앱 `presentation/profile/screens/data_privacy_screen.dart:651-712` |
| F14-01(2) | 해소됨. 시험 보강 기록 | PRD 원문 절 제목 |
| F14-02(1) | 해소됨. 시험 보강 기록 | PRD 원문 절 제목 |
| F14-03(3) | 갱신·보강 둘 해소됨. 120분 자르기 시험 Gap | domain `location/service/LocationService.java:240-272`(1~120 자르기, 모임 끝 상한), api-app `location/controller/LocationController.java:75-83`, 시험 domain test `location/service/LocationServiceTest.java:1095-1104`(모임 끝 상한만), `:1075-1093`(공유 시간 밖 거절); 앱 `domain/providers/location/event_location_provider.dart:144-157`, `presentation/location/screens/event_location_screen.dart:413-428,529-538,616-622` |
| F14-04(1) | 해소됨. 시험 보강 기록 | PRD 원문 절 제목 |

본문 고친 곳: F06-07 만료 안내, F06-09 요약 카드, F08-08 분류 고르기, F08-11 409 문구(이미 판정된 Gap 행도 해소됨으로), F08-12 S5 갱신하기, F08-13 후기 뒤 다시 읽기·참가비·한 번짜리 모임, F09-06 위치 공유 문구, F09-08 방문 기록이 쌓이는 곳·빈 상태·누름 없음.

### 다음에 이어 갈 것

갭 후보는 남지 않았고 F10~F14 본문의 낡은 줄 15곳과 화면 명세 4곳도 2026-11-08 저녁 고쳤다. 판정한 행 가운데 고객이 체감하는 것은 `docs/assets/launch-status.js` 등록부의 「기능 문서 대조에서 나온 화면·문구 차이」 와 「기능 문서 대조에서 나온 제품 결정」 두 줄에 올렸고 해당 기능 HTML 에 보인다. 그 뒤 고친 것은 판정 칸을 바꿨다: F03-05 신청 메시지 길이, F04-15 인출 사유 검증, F14-03 연장 상한 시험은 해소됨, F13-03 주소 글 길이는 서버 쪽이 끝나 앱 입력 칸 한도만 남은 Gap 이다. 결정 73~78 과 그 뒤 79~81 은 2026-11-08 밤 답을 받아 판정 칸을 바꿨다: F06-10 이의 첨부는 명세에서 빼 해소됨, F04-14 기부 상한·알림·메시지와 F07-07 덧붙임 말, F03-10 덮어쓰기 칸은 결정대로 만들 Gap, F09-03 30일 방 닫힘은 서버를 고쳐 해소됨이다. 같은 밤 앱·관리자 웹 몫도 합쳐 판정 칸을 다시 바꿨다: F04-07 참석률 이름, F08-11 구매 확인, F09-03 단추 잠금, F09-06 위치 공유 문구, F10-04 반복 일정 시간 검사, F12-02 묶음 더 불러오기, F13-02 닉네임 중복 문구, F13-03 주소 칸 한도, F03-10 덮어쓰기 칸, F04-14 기부 알림·메시지·금액, F07-07 덧붙임 말은 해소됨, F04-15 는 남의 출금 줄 계좌 숨김을 해소됨으로 더했다. 같은 밤 늦게 F12-02 쪽 사이 새 알림(묶음 보기·알림함 커서)과 배지의 차단 상대 알림, F03-10 준비 시작이 끝보다 늦음(서버를 앱 규칙에 맞춰 결정 82 닫음), F03-05 신청 메시지 보내기(승인이 필요한 모임의 확인 시트 칸)를 해소됨으로 바꿨다. 같은 밤 결정 83~87 의 답(모두 권고대로)과 그 서버·앱 고침으로 F14-04 공개 뒤 호스트 위치 공유 스위치(결정 84-2, 전용 창구와 알림 둘)와 F07-09 참가자 정산 선입금(결정 85-3′, 출시 범위로 닫고 참가비 선결제로 모음)을 해소됨으로 바꾸고, F13-07 응답 전에 끝난 세션의 탈퇴 정리(결정 86-4), F04-14 기부 내역 일시(결정 87-1)를 해소됨으로 더하고, F03-08 에 직접 체크인 시간 문구(결정 83-1)를 적었다. F14-04 에 더한 참가자 쓰기가 허용 값을 잠그지 않고 읽는 Gap 은 같은 밤 늦게 모임 행 공유 잠금으로 고쳐 해소됨으로 바꿨다(같은 회원의 켜기 겹침도 회원 행 잠금으로 고쳤고, 끄기·첫 위치 올리기의 같은 꼴은 문서 저장소 H-656). 같은 때 F04-11 앨범 댓글의 숨긴 부모 가림과 F14-05 출발 안내 문장을 해소됨으로, F04-11 숨긴 댓글에 쓰기(H-653)를 Gap 으로 더하고, F12-05 에 발송 실패 운영 복구 여정의 서버 몫 확인을 적었다. 남은 Risk 는 F04-07 기간·증감 필터다. 남은 처리는 문서 저장소 [앞으로 할 일](../../docs/plan/NEXT_WORK.md)의 앱 갈래 요청표·기능을 열 때(데이트 끌기와 단추)에 있다.

## 이동수단 현재 계약

DB 스키마 정의는 `community_api/domain/src/main/resources/db/migration/V1__init.sql` 한 파일이며 V2 이상 파일을 만들지 않는다. 이동수단 표는 아래 통합 표다.

- `event_transport_config`: 이동 운영·자리 반납·자차 허용의 독립 설정
- `event_vehicle`: `BUS/CAR/SELF`, `DESIGNATED/UNDESIGNATED`,
  `HOST_ASSIGNS/SELF_CLAIMS`, 차량별 정산 금액과 승용차 승인 상태
- `event_vehicle_seat`: 지정·비지정 모두의 실제 탑승 자리. 모임 안 사용자 중복 탑승을 유일 제약으로 차단
- `event_transport_participant`: 승차 위치와 이동 조율 참여 상태
- `event_vehicle_seat_log`: 배정·이동·반납 이력
- `vehicle_layout`, `vehicle_layout_seat`: 표준 좌석 배치도와 좌석 정의

두 API 저장소의 반복 기준 데이터에는 25·28·41·45인승 버스와 7·9·11·12·15인승 승합차 9종이
들어 있다. 관리자 웹은 목록·좌석표·복제·이름/설명 수정·활성화/비활성화를 제공한다.

### 현재 후속 범위

- **관리자 차량 운영** — `MANAGE_EVENT` 관리자 API와 웹에서 목록·좌석표·복제·이름/설명 수정·활성화/비활성화를 할 수 있다. 임의 좌석 위치 편집기와 삭제 명령은 후속 확장이다.
- **Flutter 이동수단** — 통합 설정·차량·자리·승차 위치·승용차 결정·취소·자차 종료·자리/차량 신고 화면과 라우팅이 연결됐다.
- **환불 정책** — 6종 카탈로그와 귀책 기반 계산이 구현됨.
- **이동수단 로그/알림** — 자리 변경 이력을 저장하며 77·78·81·82를 영속 알림 대기열에 기록한다. 79·80은 과거 알림 행 해석용으로만 유지한다.
- **선입금 만료/환불** — 만료 payment 정리·75 publisher와 escalation 환불 경합 방지가 현재 Gap.

## v4.5 신규 기능 PRD (별도 등록 — `02_feature_prds/03_event/`)

| ID | 도메인 | 예상 PRD 파일 | 주요 기능 | Wave | 상태 |
| --- | --- | --- | --- | --- | --- |
| F03-13 | 이벤트 | `F03-13_event-prepayment_prd.md` | 참가 선입금 (서버 WALLET/BANK, Flutter WALLET only) | W2a/W2b/W3 | current source 실측 |
| F03-14 | 이벤트 | `F03-14_event-transport-mode_prd.md` | 이동 운영·자리 반납·자차 허용 공통 설정 | W4에서 시작 | 2026-09-02 코드 완료 |
| F03-15 | 이벤트 | `F03-15_event-carpool_prd.md` | 승용차 제안·결정·취소와 자차·탑승 조율 | W5에서 시작 | 2026-09-02 코드 완료 |
| F03-16 | 이벤트 | `F03-16_event-bus-charter_prd.md` | 대절 버스, 지정·비지정 자리와 배정·반납·신고 | W7에서 시작 | 2026-09-02 코드 완료 |
| F03-17 | 이벤트 | `F03-17_vehicle-layout-catalog_prd.md` | 표준 9종과 관리자 배치도 운영 | W6에서 시작 | 2026-09-02 코드·운영 화면 완료 |

신규 PRD 5개는 모두 작성 완료 상태다. 세부 구현/클라이언트 후속 범위는 각 기능 PRD의 §8 Gap/Risk를 우선한다.

## 읽는 법

- **Golden sample**: 수작업으로 실제 서버/Flutter 소스를 직접 대조해 완성한 기준 문서다.
- **실사 기반 전환본**: `backend.md`, `frontend.md`, `scenarios.md`, `diagrams.md`의 실사 내용을 PRD 구조로 재배치한 문서다. 구현 착수 전 trace source를 다시 열어 최종 확인한다.
- **신규 PRD**: 별도 master plan 또는 신규 기능 결정을 바탕으로 작성한 기능 PRD다.
- **source-first 구현 확인**: `units/` 없이 실제 소스 또는 구현 리포트를 canonical로 삼아 서버/앱 계약을 확인한 PRD다.
- **source-first PRD**: `units/` 없이 실제 소스 또는 plan을 canonical로 작성한 PRD다. 구현 정합/후속 범위는 각 PRD §7·§8을 확인한다.
- **source-first 부분 구현**: 핵심 계약은 문서화됐지만 PRD 본문상 앱/서버 배선 후속 또는 미구현 Gap이 남아 있는 PRD다.
- **Trace 수**: 원천 문서에 남아 있는 `<!-- traces: ... -->` 소스 참조 개수다.
- **Risk 후보 수**: 원천 문서에서 Gap/Risk/주의/보강 등으로 표시된 판단 후보 수다.

## 전체 목록

| ID | 도메인 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
| --- | --- | --- | --- | --- | ---: | ---: |
| F01-01 | 인증 & 온보딩 | [F01-01_email-signup-login_prd.md](02_feature_prds/01_auth_onboarding/F01-01_email-signup-login_prd.md) | `F01-01_email-signup-login` | 실사 기반 전환본 | 2 | 0 |
| F01-02 | 인증 & 온보딩 | [F01-02_social-login_prd.md](02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | `F01-02_social-login` | 실사 기반 전환본 | 1 | 1 |
| F01-03 | 인증 & 온보딩 | [F01-03_email-verification_prd.md](02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | `F01-03_email-verification` | 실사 기반 전환본 | 4 | 1 |
| F01-04 | 인증 & 온보딩 | [F01-04_password-reset_prd.md](02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | `F01-04_password-reset` | 실사 기반 전환본 | 2 | 1 |
| F01-05 | 인증 & 온보딩 | [F01-05_token-refresh-logout_prd.md](02_feature_prds/01_auth_onboarding/F01-05_token-refresh-logout_prd.md) | `F01-05_token-refresh-logout` | 실사 기반 전환본 | 2 | 0 |
| F01-06 | 인증 & 온보딩 | [F01-06_onboarding_prd.md](02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | `F01-06_onboarding` | 실사 기반 전환본 | 0 | 1 |
| F01-07 | 인증 & 온보딩 | [F01-07_preference-tags_prd.md](02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | `F01-07_preference-tags` | 실사 기반 전환본 | 4 | 1 |
| F01-08 | 인증 & 온보딩 | [F01-08_social-unlink_prd.md](02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | `F01-08_social-unlink` | 실사 기반 전환본 | 1 | 1 |
| F02-01 | 홈 피드 | [F02-01_home-feed-main_prd.md](02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | `F02-01_home-feed-main` | 실사 기반 전환본 | 4 | 3 |
| F02-02 | 홈 피드 | [F02-02_home-feed-refresh_prd.md](02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | `F02-02_home-feed-refresh` | 실사 기반 전환본 | 0 | 1 |
| F02-03 | 홈 피드 | [F02-03_section-card-entry_prd.md](02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | `F02-03_section-card-entry` | 실사 기반 전환본 | 0 | 2 |
| F02-04 | 홈 피드 | [F02-04_recommend-events-more_prd.md](02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | `F02-04_recommend-events-more` | 실사 기반 전환본 | 2 | 9 |
| F02-05 | 홈 피드 | [F02-05_search-notification-entry_prd.md](02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | `F02-05_search-notification-entry` | 실사 기반 전환본 | 0 | 10 |
| F03-01 | 이벤트 | [F03-01_event-discovery_prd.md](02_feature_prds/03_event/F03-01_event-discovery_prd.md) | `F03-01_event-discovery` | 실사 기반 전환본 | 3 | 2 |
| F03-02 | 이벤트 | [F03-02_event-detail_prd.md](02_feature_prds/03_event/F03-02_event-detail_prd.md) | `F03-02_event-detail` | Golden sample | 2 | 2 |
| F03-03 | 이벤트 | [F03-03_event-creation_prd.md](02_feature_prds/03_event/F03-03_event-creation_prd.md) | `F03-03_event-creation` | 실사 기반 전환본 | 4 | 3 |
| F03-04 | 이벤트 | [F03-04_event-lifecycle_prd.md](02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | `F03-04_event-lifecycle` | 실사 기반 전환본 | 9 | 3 |
| F03-05 | 이벤트 | [F03-05_event-attendance_prd.md](02_feature_prds/03_event/F03-05_event-attendance_prd.md) | `F03-05_event-attendance` | 실사 기반 전환본 | 6 | 21 |
| F03-06 | 이벤트 | [F03-06_application-review_prd.md](02_feature_prds/03_event/F03-06_application-review_prd.md) | `F03-06_application-review` | 실사 기반 전환본 | 3 | 9 |
| F03-07 | 이벤트 | [F03-07_capacity-and-waitlist_prd.md](02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | `F03-07_capacity-and-waitlist` | 실사 기반 전환본 | 16 | 3 |
| F03-08 | 이벤트 | [F03-08_qr-checkin_prd.md](02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | `F03-08_qr-checkin` | 실사 기반 전환본 | 5 | 1 |
| F03-09 | 이벤트 | [F03-09_event-photos_prd.md](02_feature_prds/03_event/F03-09_event-photos_prd.md) | `F03-09_event-photos` | 실사 기반 전환본 | 8 | 4 |
| F03-10 | 이벤트 | [F03-10_event-plan-link_prd.md](02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | `F03-10_event-plan-link` | 실사 기반 전환본 | 5 | 3 |
| F03-11 | 이벤트 | [F03-11_wishlist_prd.md](02_feature_prds/03_event/F03-11_wishlist_prd.md) | `F03-11_wishlist` | 실사 기반 전환본 | 3 | 1 |
| F03-12 | 이벤트 | [F03-12_my-events_prd.md](02_feature_prds/03_event/F03-12_my-events_prd.md) | `F03-12_my-events` | 실사 기반 전환본 | 3 | 7 |
| F03-13 | 이벤트 | [F03-13_event-prepayment_prd.md](02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | `source-first` | 신규 PRD | 14 | 8 |
| F03-14 | 이벤트 | [F03-14_event-transport-mode_prd.md](02_feature_prds/03_event/F03-14_event-transport-mode_prd.md) | `source-first` | 신규 PRD | 2 | 3 |
| F03-15 | 이벤트 | [F03-15_event-carpool_prd.md](02_feature_prds/03_event/F03-15_event-carpool_prd.md) | `source-first` | 신규 PRD | 7 | 6 |
| F03-16 | 이벤트 | [F03-16_event-bus-charter_prd.md](02_feature_prds/03_event/F03-16_event-bus-charter_prd.md) | `source-first` | 신규 PRD | 6 | 6 |
| F03-17 | 이벤트 | [F03-17_vehicle-layout-catalog_prd.md](02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | `source-first` | 신규 PRD | 2 | 2 |
| F03-18 | 이벤트 | [F03-18_event-demographics_prd.md](02_feature_prds/03_event/F03-18_event-demographics_prd.md) | `source-first` | 신규 PRD | 4 | 1 |
| F03-19 | 이벤트 | [F03-19_event-reschedule-consent_prd.md](02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | `source-first` | source-first 구현 확인 | 4 | 5 |
| F03-20 | 이벤트 | [F03-20_event-no-show_prd.md](02_feature_prds/03_event/F03-20_event-no-show_prd.md) | `source-first` | source-first 구현 확인 | 4 | 7 |
| F04-01 | 클럽 | [F04-01_club-discovery_prd.md](02_feature_prds/04_club/F04-01_club-discovery_prd.md) | `F04-01_club-discovery` | 실사 기반 전환본 | 1 | 3 |
| F04-02 | 클럽 | [F04-02_club-detail-join_prd.md](02_feature_prds/04_club/F04-02_club-detail-join_prd.md) | `F04-02_club-detail-join` | 실사 기반 전환본 | 3 | 2 |
| F04-03 | 클럽 | [F04-03_club-crud-transfer_prd.md](02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | `F04-03_club-crud-transfer` | 실사 기반 전환본 | 4 | 11 |
| F04-04 | 클럽 | [F04-04_member-management_prd.md](02_feature_prds/04_club/F04-04_member-management_prd.md) | `F04-04_member-management` | 실사 기반 전환본 | 3 | 0 |
| F04-05 | 클럽 | [F04-05_waitlist-invitation_prd.md](02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | `F04-05_waitlist-invitation` | 실사 기반 전환본 | 6 | 1 |
| F04-06 | 클럽 | [F04-06_ban-management_prd.md](02_feature_prds/04_club/F04-06_ban-management_prd.md) | `F04-06_ban-management` | 실사 기반 전환본 | 4 | 0 |
| F04-07 | 클럽 | [F04-07_my-clubs-stats_prd.md](02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | `F04-07_my-clubs-stats` | 실사 기반 전환본 | 2 | 6 |
| F04-08 | 클럽 | [F04-08_board-post-crud_prd.md](02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | `F04-08_board-post-crud` | 실사 기반 전환본 | 0 | 3 |
| F04-09 | 클럽 | [F04-09_post-comments_prd.md](02_feature_prds/04_club/F04-09_post-comments_prd.md) | `F04-09_post-comments` | 실사 기반 전환본 | 5 | 7 |
| F04-10 | 클럽 | [F04-10_announcements_prd.md](02_feature_prds/04_club/F04-10_announcements_prd.md) | `F04-10_announcements` | 실사 기반 전환본 | 3 | 2 |
| F04-11 | 클럽 | [F04-11_photo-album_prd.md](02_feature_prds/04_club/F04-11_photo-album_prd.md) | `F04-11_photo-album` | 실사 기반 전환본 | 8 | 1 |
| F04-12 | 클럽 | [F04-12_club-events-calendar_prd.md](02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | `F04-12_club-events-calendar` | 실사 기반 전환본 | 15 | 7 |
| F04-13 | 클럽 | [F04-13_fund-overview_prd.md](02_feature_prds/04_club/F04-13_fund-overview_prd.md) | `F04-13_fund-overview` | 실사 기반 전환본 | 1 | 2 |
| F04-14 | 클럽 | [F04-14_donation_prd.md](02_feature_prds/04_club/F04-14_donation_prd.md) | `F04-14_donation` | 실사 기반 전환본 | 4 | 6 |
| F04-15 | 클럽 | [F04-15_fund-withdrawal_prd.md](02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | `F04-15_fund-withdrawal` | 실사 기반 전환본 | 2 | 2 |
| F04-16 | 클럽 | [F04-16_subscription_prd.md](02_feature_prds/04_club/F04-16_subscription_prd.md) | `F04-16_subscription` | 실사 기반 전환본 | 5 | 8 |
| F04-17 | 클럽 | [F04-17_club-demographics_prd.md](02_feature_prds/04_club/F04-17_club-demographics_prd.md) | `source-first` | 신규 PRD | 4 | 1 |
| F04-18 | 클럽 | [F04-18_club-reputation_prd.md](02_feature_prds/04_club/F04-18_club-reputation_prd.md) | `source-first` | source-first 구현 확인 | 3 | 1 |
| F05-01 | 검색 | [F05-01_keyword-search_prd.md](02_feature_prds/05_search/F05-01_keyword-search_prd.md) | `F05-01_keyword-search` | 실사 기반 전환본 | 3 | 2 |
| F05-02 | 검색 | [F05-02_autocomplete-suggest_prd.md](02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | `F05-02_autocomplete-suggest` | 실사 기반 전환본 | 1 | 2 |
| F05-03 | 검색 | [F05-03_search-filter_prd.md](02_feature_prds/05_search/F05-03_search-filter_prd.md) | `F05-03_search-filter` | 실사 기반 전환본 | 2 | 2 |
| F05-04 | 검색 | [F05-04_search-history_prd.md](02_feature_prds/05_search/F05-04_search-history_prd.md) | `F05-04_search-history` | 실사 기반 전환본 | 3 | 0 |
| F05-05 | 검색 | [F05-05_saved-search_prd.md](02_feature_prds/05_search/F05-05_saved-search_prd.md) | `F05-05_saved-search` | 실사 기반 전환본 | 5 | 4 |
| F06-01 | 결제 & 지갑 | [F06-01_wallet-main_prd.md](02_feature_prds/06_payment/F06-01_wallet-main_prd.md) | `F06-01_wallet-main` | 실사 기반 전환본 | 1 | 0 |
| F06-02 | 결제 & 지갑 | [F06-02_point-charge_prd.md](02_feature_prds/06_payment/F06-02_point-charge_prd.md) | `F06-02_point-charge` | 실사 기반 전환본 | 5 | 0 |
| F06-03 | 결제 & 지갑 | [F06-03_transaction-history_prd.md](02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | `F06-03_transaction-history` | 실사 기반 전환본 | 3 | 4 |
| F06-04 | 결제 & 지갑 | [F06-04_payment-method_prd.md](02_feature_prds/06_payment/F06-04_payment-method_prd.md) | `F06-04_payment-method` | 실사 기반 전환본 | 4 | 1 |
| F06-05 | 결제 & 지갑 | [F06-05_auto-charge_prd.md](02_feature_prds/06_payment/F06-05_auto-charge_prd.md) | `F06-05_auto-charge` | 실사 기반 전환본 | 4 | 0 |
| F06-06 | 결제 & 지갑 | [F06-06_point-pay-refund_prd.md](02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | `F06-06_point-pay-refund` | 실사 기반 전환본 | 3 | 21 |
| F06-07 | 결제 & 지갑 | [F06-07_hosting-ticket_prd.md](02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | `F06-07_hosting-ticket` | 실사 기반 전환본 | 2 | 3 |
| F06-08 | 결제 & 지갑 | [F06-08_personal-subscription_prd.md](02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | `F06-08_personal-subscription` | 실사 기반 전환본 | 5 | 3 |
| F06-09 | 결제 & 지갑 | [F06-09_earnings-dashboard_prd.md](02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | `F06-09_earnings-dashboard` | 실사 기반 전환본 | 1 | 3 |
| F06-10 | 결제 & 지갑 | [F06-10_settlement-appeal_prd.md](02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | `F06-10_settlement-appeal` | 실사 기반 전환본 | 5 | 4 |
| F07-01 | 모임 정산 | [F07-01_create-settlement_prd.md](02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | `F07-01_create-settlement` | 실사 기반 전환본 | 3 | 2 |
| F07-02 | 모임 정산 | [F07-02_settlement-items_prd.md](02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | `F07-02_settlement-items` | 실사 기반 전환본 | 4 | 2 |
| F07-03 | 모임 정산 | [F07-03_activate-cancel_prd.md](02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | `F07-03_activate-cancel` | 실사 기반 전환본 | 2 | 1 |
| F07-04 | 모임 정산 | [F07-04_status-summary-receipt_prd.md](02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | `F07-04_status-summary-receipt` | 실사 기반 전환본 | 3 | 2 |
| F07-05 | 모임 정산 | [F07-05_pay-share_prd.md](02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | `F07-05_pay-share` | 실사 기반 전환본 | 7 | 2 |
| F07-06 | 모임 정산 | [F07-06_host-confirm-transfers_prd.md](02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | `F07-06_host-confirm-transfers` | 실사 기반 전환본 | 6 | 2 |
| F07-07 | 모임 정산 | [F07-07_remind-extend_prd.md](02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | `F07-07_remind-extend` | 실사 기반 전환본 | 3 | 3 |
| F07-08 | 모임 정산 | [F07-08_appeal-audit_prd.md](02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md) | `F07-08_appeal-audit` | 실사 기반 전환본 | 4 | 0 |
| F07-09 | 모임 정산 | [F07-09_prepayment-refund_prd.md](02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | `F07-09_prepayment-refund` | 실사 기반 전환본 | 7 | 7 |
| F07-10 | 모임 정산 | [F07-10_account-history-reputation_prd.md](02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | `F07-10_account-history-reputation` | 실사 기반 전환본 | 0 | 3 |
| F08-01 | 플랜 마켓 | [F08-01_my-plan-list_prd.md](02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | `F08-01_my-plan-list` | 실사 기반 전환본 | 3 | 1 |
| F08-02 | 플랜 마켓 | [F08-02_plan-detail_prd.md](02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md) | `F08-02_plan-detail` | 실사 기반 전환본 | 6 | 1 |
| F08-03 | 플랜 마켓 | [F08-03_block-editor_prd.md](02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | `F08-03_block-editor` | 실사 기반 전환본 | 5 | 4 |
| F08-04 | 플랜 마켓 | [F08-04_block-reorder_prd.md](02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | `F08-04_block-reorder` | 실사 기반 전환본 | 2 | 2 |
| F08-05 | 플랜 마켓 | [F08-05_plan-publish_prd.md](02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | `F08-05_plan-publish` | 실사 기반 전환본 | 1 | 3 |
| F08-06 | 플랜 마켓 | [F08-06_market-item-management_prd.md](02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | `F08-06_market-item-management` | 실사 기반 전환본 | 6 | 2 |
| F08-07 | 플랜 마켓 | [F08-07_creator-profile-stats_prd.md](02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | `F08-07_creator-profile-stats` | 실사 기반 전환본 | 2 | 7 |
| F08-08 | 플랜 마켓 | [F08-08_market-main-browse_prd.md](02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | `F08-08_market-main-browse` | 실사 기반 전환본 | 3 | 2 |
| F08-09 | 플랜 마켓 | [F08-09_market-search_prd.md](02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | `F08-09_market-search` | 실사 기반 전환본 | 1 | 4 |
| F08-10 | 플랜 마켓 | [F08-10_market-item-detail_prd.md](02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | `F08-10_market-item-detail` | 실사 기반 전환본 | 5 | 4 |
| F08-11 | 플랜 마켓 | [F08-11_purchase_prd.md](02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | `F08-11_purchase` | 실사 기반 전환본 | 3 | 4 |
| F08-12 | 플랜 마켓 | [F08-12_my-collection_prd.md](02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | `F08-12_my-collection` | 실사 기반 전환본 | 4 | 4 |
| F08-13 | 플랜 마켓 | [F08-13_plan-event-and-review_prd.md](02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | `F08-13_plan-event-and-review` | 실사 기반 전환본 | 4 | 2 |
| F08-14 | 플랜 마켓 | [F08-14_purchase-refund_prd.md](02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md) | `source-first` | source-first 구현 확인 | 6 | 2 |
| F08-15 | 플랜 마켓 | [F08-15_creator-earning-coverage_prd.md](02_feature_prds/08_plan_market/F08-15_creator-earning-coverage_prd.md) | `source-first` | source-first 구현 확인 | 4 | 1 |
| F09-01 | 프라이빗 데이팅 | [F09-01_verification_prd.md](02_feature_prds/09_private_date/F09-01_verification_prd.md) | `F09-01_verification` | 실사 기반 전환본 | 3 | 0 |
| F09-02 | 프라이빗 데이팅 | [F09-02_profile_prd.md](02_feature_prds/09_private_date/F09-02_profile_prd.md) | `F09-02_profile` | 실사 기반 전환본 | 6 | 2 |
| F09-03 | 프라이빗 데이팅 | [F09-03_candidate_swipe_prd.md](02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | `F09-03_candidate_swipe` | 실사 기반 전환본 | 2 | 4 |
| F09-04 | 프라이빗 데이팅 | [F09-04_match_list_prd.md](02_feature_prds/09_private_date/F09-04_match_list_prd.md) | `F09-04_match_list` | 실사 기반 전환본 | 2 | 0 |
| F09-05 | 프라이빗 데이팅 | [F09-05_chat_prd.md](02_feature_prds/09_private_date/F09-05_chat_prd.md) | `F09-05_chat` | 실사 기반 전환본 | 4 | 1 |
| F09-06 | 프라이빗 데이팅 | [F09-06_meeting_proposal_prd.md](02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | `F09-06_meeting_proposal` | 실사 기반 전환본 | 3 | 8 |
| F09-07 | 프라이빗 데이팅 | [F09-07_block_prd.md](02_feature_prds/09_private_date/F09-07_block_prd.md) | `F09-07_block` | 실사 기반 전환본 | 3 | 1 |
| F09-08 | 프라이빗 데이팅 | [F09-08_profile_views_prd.md](02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | `F09-08_profile_views` | 실사 기반 전환본 | 1 | 3 |
| F10-01 | 캘린더 | [F10-01_unified-calendar-view_prd.md](02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | `F10-01_unified-calendar-view` | 실사 기반 전환본 | 3 | 1 |
| F10-02 | 캘린더 | [F10-02_calendar-item-routing_prd.md](02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | `F10-02_calendar-item-routing` | 실사 기반 전환본 | 0 | 8 |
| F10-03 | 캘린더 | [F10-03_single-availability-crud_prd.md](02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | `F10-03_single-availability-crud` | 실사 기반 전환본 | 5 | 3 |
| F10-04 | 캘린더 | [F10-04_recurring-availability-rule_prd.md](02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | `F10-04_recurring-availability-rule` | 실사 기반 전환본 | 5 | 8 |
| F10-05 | 캘린더 | [F10-05_other-user-availability_prd.md](02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | `F10-05_other-user-availability` | 실사 기반 전환본 | 2 | 2 |
| F11-01 | 리뷰 & 신고 | [F11-01_event-review-write_prd.md](02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | `F11-01_event-review-write` | 실사 기반 전환본 | 1 | 1 |
| F11-02 | 리뷰 & 신고 | [F11-02_review-list_prd.md](02_feature_prds/11_review_report/F11-02_review-list_prd.md) | `F11-02_review-list` | 실사 기반 전환본 | 2 | 2 |
| F11-03 | 리뷰 & 신고 | [F11-03_review-edit-delete_prd.md](02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | `F11-03_review-edit-delete` | 실사 기반 전환본 | 2 | 3 |
| F11-04 | 리뷰 & 신고 | [F11-04_report_prd.md](02_feature_prds/11_review_report/F11-04_report_prd.md) | `F11-04_report` | 실사 기반 갱신본 | 2 | 3 |
| F11-05 | 리뷰 & 신고 | [F11-05_trust-score_prd.md](02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | `F11-05_trust-score` | 실사 기반 전환본 | 3 | 1 |
| F11-06 | 리뷰 & 신고 | [F11-06_taste-profile_prd.md](02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | `F11-06_taste-profile` | 실사 기반 전환본 | 5 | 1 |
| F11-07 | 리뷰 & 신고 | [F11-07_review-moderation_prd.md](02_feature_prds/11_review_report/F11-07_review-moderation_prd.md) | `source-first` | 실사 기반 신규 작성 | 3 | 4 |
| F12-01 | 알림 | [F12-01_notification-list-read_prd.md](02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | `F12-01_notification-list-read` | 실사 기반 전환본 | 5 | 4 |
| F12-02 | 알림 | [F12-02_notification-grouped-badge_prd.md](02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | `F12-02_notification-grouped-badge` | 실사 기반 전환본 | 2 | 3 |
| F12-03 | 알림 | [F12-03_category-settings_prd.md](02_feature_prds/12_notification/F12-03_category-settings_prd.md) | `F12-03_category-settings` | 실사 기반 전환본 | 2 | 1 |
| F12-04 | 알림 | [F12-04_quiet-hours_prd.md](02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | `F12-04_quiet-hours` | 실사 기반 전환본 | 2 | 1 |
| F12-05 | 알림 | [F12-05_device-token-management_prd.md](02_feature_prds/12_notification/F12-05_device-token-management_prd.md) | `F12-05_device-token-management` | 실사 기반 전환본 | 5 | 0 |
| F12-06 | 알림 | [F12-06_permission-banner_prd.md](02_feature_prds/12_notification/F12-06_permission-banner_prd.md) | `F12-06_permission-banner` | 실사 기반 전환본 | 0 | 0 |
| F13-01 | 프로필 & 설정 | [F13-01_profile-hub_prd.md](02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | `F13-01_profile-hub` | 실사 기반 전환본 | 1 | 4 |
| F13-02 | 프로필 & 설정 | [F13-02_profile-edit_prd.md](02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | `F13-02_profile-edit` | 실사 기반 전환본 | 1 | 4 |
| F13-03 | 프로필 & 설정 | [F13-03_address-management_prd.md](02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | `F13-03_address-management` | 실사 기반 전환본 | 5 | 5 |
| F13-04 | 프로필 & 설정 | [F13-04_preference-tags_prd.md](02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | `F13-04_preference-tags` | 실사 기반 전환본 | 4 | 7 |
| F13-05 | 프로필 & 설정 | [F13-05_data-export_prd.md](02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | `F13-05_data-export` | 실사 기반 전환본 | 2 | 6 |
| F13-06 | 프로필 & 설정 | [F13-06_account-deletion_prd.md](02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | `F13-06_account-deletion` | 실사 기반 전환본 | 3 | 4 |
| F13-07 | 프로필 & 설정 | [F13-07_account-deactivation_prd.md](02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | `F13-07_account-deactivation` | 실사 기반 전환본 | 2 | 7 |
| F14-01 | 위치 & 길찾기 | [F14-01_event-location-share_prd.md](02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | `F14-01_event-location-share` | 실사 기반 전환본 | 3 | 2 |
| F14-02 | 위치 & 길찾기 | [F14-02_location-opt-out_prd.md](02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | `F14-02_location-opt-out` | 실사 기반 전환본 | 1 | 2 |
| F14-03 | 위치 & 길찾기 | [F14-03_location-extend_prd.md](02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | `F14-03_location-extend` | 실사 기반 전환본 | 1 | 3 |
| F14-04 | 위치 & 길찾기 | [F14-04_location-privacy-dashboard_prd.md](02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | `F14-04_location-privacy-dashboard` | 실사 기반 전환본 | 1 | 4 |
| F14-05 | 위치 & 길찾기 | [F14-05_event-directions_prd.md](02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | `F14-05_event-directions` | 실사 기반 전환본 | 2 | 2 |
| F14-06 | 위치 & 길찾기 | [F14-06_reverse-geocoding_prd.md](02_feature_prds/14_location_directions/F14-06_reverse-geocoding_prd.md) | `F14-06_reverse-geocoding` | 실사 기반 전환본 | 1 | 0 |
| F15-01 | 경고 & 징계 | [F15-01_warning-overview-ledger_prd.md](02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-02 | 경고 & 징계 | [F15-02_report-submit-manage_prd.md](02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F15-03 | 경고 & 징계 | [F15-03_appeal_prd.md](02_feature_prds/15_warning/F15-03_appeal_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-04 | 경고 & 징계 | [F15-04_policy-penalty-types_prd.md](02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F15-05 | 경고 & 징계 | [F15-05_report-review_prd.md](02_feature_prds/15_warning/F15-05_report-review_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-06 | 경고 & 징계 | [F15-06_grant-ledger-adjust_prd.md](02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F15-07 | 경고 & 징계 | [F15-07_appeal-resolve_prd.md](02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-08 | 경고 & 징계 | [F15-08_sanction-enforcement_prd.md](02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F15-09 | 경고 & 징계 | [F15-09_queue-dashboard-audit_prd.md](02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F16-01 | 마일리지 | [F16-01_my-mileage-main_prd.md](02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-02 | 마일리지 | [F16-02_grade-badge-ranking_prd.md](02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-03 | 마일리지 | [F16-03_season_prd.md](02_feature_prds/16_mileage/F16-03_season_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-04 | 마일리지 | [F16-04_policy-config_prd.md](02_feature_prds/16_mileage/F16-04_policy-config_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-05 | 마일리지 | [F16-05_policy-presets_prd.md](02_feature_prds/16_mileage/F16-05_policy-presets_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-06 | 마일리지 | [F16-06_grant-redeem-reverse_prd.md](02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F16-07 | 마일리지 | [F16-07_host-proposal_prd.md](02_feature_prds/16_mileage/F16-07_host-proposal_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-08 | 마일리지 | [F16-08_review-queue-dashboard_prd.md](02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F17-01 | 정기모임 | [F17-01_regular-meeting-discovery_prd.md](02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md) | `source-first` | source-first 구현 확인 | 3 | 2 |
| F17-02 | 정기모임 | [F17-02_regular-meeting-detail_prd.md](02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md) | `source-first` | source-first 구현 확인 | 4 | 3 |
| F17-03 | 정기모임 | [F17-03_regular-meeting-creation_prd.md](02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md) | `source-first` | source-first 구현 확인 | 3 | 4 |
| F17-04 | 정기모임 | [F17-04_regular-meeting-lifecycle_prd.md](02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md) | `source-first` | source-first 구현 확인 | 5 | 4 |
| F17-05 | 정기모임 | [F17-05_regular-meeting-sessions_prd.md](02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md) | `source-first` | source-first 구현 확인 | 6 | 6 |
| F17-06 | 정기모임 | [F17-06_regular-meeting-enrollment_prd.md](02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md) | `source-first` | source-first 구현 확인 | 8 | 5 |
| F17-07 | 정기모임 | [F17-07_regular-meeting-payment_prd.md](02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md) | `source-first` | source-first 구현 확인 | 6 | 6 |
| F17-08 | 정기모임 | [F17-08_regular-meeting-refund_prd.md](02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md) | `source-first` | source-first 구현 확인 | 7 | 6 |
| F17-09 | 정기모임 | [F17-09_regular-meeting-attendance_prd.md](02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md) | `source-first` | source-first 구현 확인 | 6 | 3 |
| F17-10 | 정기모임 | [F17-10_regular-meeting-settlement_prd.md](02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md) | `source-first` | source-first 구현 확인 | 8 | 4 |
| F18-01 | 분쟁 해결 | [F18-01_unified-dispute-case_prd.md](02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md) | `source-first` | source-first PRD | 4 | 5 |
| F18-02 | 분쟁 해결 | [F18-02_dispute-create_prd.md](02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md) | `source-first` | source-first PRD | 3 | 4 |
| F18-03 | 분쟁 해결 | [F18-03_dispute-appeal_prd.md](02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md) | `source-first` | source-first PRD | 3 | 4 |
| F18-04 | 분쟁 해결 | [F18-04_evidence-visibility_prd.md](02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md) | `source-first` | source-first PRD | 3 | 5 |
| F18-05 | 분쟁 해결 | [F18-05_host-inbox_prd.md](02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md) | `source-first` | source-first PRD | 3 | 5 |
| F19-01 | 관심인 | [F19-01_favorite-manage_prd.md](02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md) | `source-first` | source-first 구현 확인 | 3 | 3 |
| F19-02 | 관심인 | [F19-02_favorite-calendar_prd.md](02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md) | `source-first` | source-first 부분 구현 | 3 | 2 |
| F19-03 | 관심인 | [F19-03_privacy-visibility-settings_prd.md](02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md) | `source-first` | source-first 구현 확인 | 3 | 2 |
| F20-01 | 고객지원 | [F20-01_inquiry_prd.md](02_feature_prds/20_support/F20-01_inquiry_prd.md) | `source-first` | source-first 부분 구현 | 2 | 3 |
| F20-02 | 고객지원 | [F20-02_operational-issue_prd.md](02_feature_prds/20_support/F20-02_operational-issue_prd.md) | `source-first` | source-first 부분 구현 | 2 | 3 |
| F20-03 | 고객지원 | [F20-03_support-faq_prd.md](02_feature_prds/20_support/F20-03_support-faq_prd.md) | `source-first` | source-first 구현 확인 | 1 | 1 |
| F21-01 | 제공자 배정·정산 | [F21-01_provider-assignment_prd.md](02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | `source-first` | source-first 구현 확인 | 4 | 6 |
| F21-02 | 제공자 배정·정산 | [F21-02_participant-fee-charge_prd.md](02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | `source-first` | source-first 구현 확인 | 6 | 7 |
| F21-03 | 제공자 배정·정산 | [F21-03_provider-settlement_prd.md](02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | `source-first` | source-first 구현 확인 | 5 | 7 |
| F21-04 | 제공자 배정·정산 | [F21-04_free-invite-host-subsidy_prd.md](02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md) | `source-first` | source-first 구현 확인 | 4 | 5 |
| F21-05 | 제공자 배정·정산 | [F21-05_refund-clawback_prd.md](02_feature_prds/21_curated/F21-05_refund-clawback_prd.md) | `source-first` | source-first 구현 확인 | 5 | 5 |
| F21-06 | 제공자 배정·정산 | [F21-06_engagement-prepayment_prd.md](02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md) | `source-first` | source-first 구현 확인 | 5 | 5 |
| F21-07 | 제공자 배정·정산 | [F21-07_regular-meeting-bulk_prd.md](02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md) | `source-first` | source-first 구현 확인 | 4 | 6 |

## 누락/확인 필요

누락된 기능 PRD는 없다.

## 2026-08 미반영 백로그 (2026-11-08 코드 대조는 위 「미반영 여섯과 그 밖의 확인」)

> 이 저장소의 마지막 전면 동기화는 2026-07-30이다. 그 이후 루트 워크스페이스에 착지한 아래 항목들은 **아직 이 저장소의 PRD/시각화에 반영되지 않았다**. 2026-08-18 동기화는 ①이메일 인증 제한 세션(F01-03 한정) ②P0 결제 태세(포인트 유예·계좌이체 개방) 두 축만 반영했다. 나머지는 다음 동기화 wave의 작업 목록이다. 각 항목의 정본 근거는 루트 `docs/` 경로를 병기한다(이 저장소 기준 `../../docs/`).
>
> 2026-11-08: 1·2·3·4·6 은 위 「미반영 다섯 들이기의 근거」 대로 기능·정책 PRD 에 들였다. 7 은 제한 세션이 없어져 닫았다.
>
> 새 기능 ID를 만들지 않는다는 원칙은 유지한다 — 대부분 기존 기능(F03·F06·F13·F17·F18)의 내용 확장이며, 반영 시점에 어느 기능 PRD에 흡수할지 먼저 정한다.

| # | 미반영 항목 | 내용 요약 | 정본 근거 |
|---|---|---|---|
| 1 | 호스트 계좌 직접 수납 전체 플로우 (MNY-03B) | 호스트 수납 계좌 등록·모임 결박, 참가자 입금자명 신고, 호스트 입금 확인/거절, 수동 환불과 수령 확인, 계좌 1원 인증(실 제공자 계약 전에는 인증 없이 출시), 관리자 대행 처리까지의 사용자·운영 동선 전체. 현재 F03-13/F17-07에는 결제수단 판정만 반영돼 있고 계좌 등록·확인 화면 계약은 없다. | `docs/plan/payment/MNY03B_HOST_DIRECT_CASH_PLAN_2026-08-17.md`, `docs/release-gate/evidence/MNY-03B/`, `docs/plan/payment/G0_10_PAID_EVENT_PAYMENT_DECISION_2026-08-11.md` |
| 2 | 출시 범위 게이트 (P0-SCOPE-01) | 이 배포가 파는 도메인만 열고 나머지 7개 도메인은 서버·앱 양쪽에서 봉인하는 구조. 봉인된 도메인의 기존 건에 대한 조회·취소·환불 등 **안전 출구**는 유지된다는 계약을 포함한다. 앱은 서버가 주는 범위 목록으로 메뉴·라우트를 그린다. | `docs/release-gate/plans/P0SCOPE_ACCLOCK_EXECUTION_PLAN_2026-08-17.md`, `docs/release-gate/evidence/P0SCOPE-ACCLOCK/` |
| 3 | 계정 정지·차단의 권리구제 (ACC-LOCK-01) | 정지·차단 계정은 로그인을 거부당하지 않고 **제한된 권한의 세션**을 받는다. 제재 안내 화면, 본인 케이스 결과 확인·이의 제기, 데이터 권리 등 허용 동선 22행이 확정됐다. 현재 인증·프로필 계열 PRD(F01·F13·F15)에는 이 제한 세션 개념 자체가 없다. | `docs/release-gate/plans/P0SCOPE_ACCLOCK_EXECUTION_PLAN_2026-08-17.md`, `docs/release-gate/evidence/P0SCOPE-ACCLOCK/` |
| 4 | 분쟁 종결 완결 (DSP-01) | 분쟁 케이스의 자동/수동 종결, 보상 원장, 당사자 명령·동의 종결, 관리자 위임 확정, 종결 고지 단일화. F18-01~05 전체가 이 재설계 이전 기준이다. | `docs/plan/payment/DSP01_DISPUTE_CLOSURE_PLAN_2026-08-16.md`, `docs/release-gate/evidence/DSP-01/` |
| 6 | 마일리지 규칙·배지 (MLG-01) | 기본 적립 규칙 3종 시딩, 규칙의 신규 적용 전용 원칙, 서버 계산 권한 게이팅, 배지·등급. F16-01~08이 이 착지 이전 기준이다. | `docs/development/IMPLEMENTATION_WORKBOARD.md`, `docs/club_activity/mileage/README.md` |
| 7 | 이메일 인증 제한 세션의 화면 파급 | 2026-08-18 동기화는 F01-03(및 F01-01·F01-02의 모순 서술)만 정정했다. 미인증 상태에서 각 도메인 화면이 무엇을 보여주고 어디로 안내하는지는 아직 각 기능 PRD에 반영되지 않았다. | `docs/archive/decisions/PENDING_DECISIONS_2026-08-15.md`, `docs/release-gate/evidence/P0-REAL-ACCOUNT-E2E/`, `docs/release-gate/RC_MANIFEST_2026-08-18_P0_R2.md` |
