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

**갭 후보는 아직 판정이 끝나지 않았다.** 기능 PRD의 `## 8. Gap / Risk` 표에서 2026-11-08 기준
**234행(74개 기능)이 "실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정"** 상태로 남아 있다(2026-08-18 기준 286행 중 280행). 이 문장은
결론이 아니라 아직 수행하지 않은 작업 지시다. 따라서 다음을 지킨다.

1. 갭 후보 수를 결함 수로 읽지 않는다. 출시 판단에 그대로 쓰지 않는다.
2. 사실이 확인된 미완성 항목만 `docs/qa/launch-status.html`의 등록부에 올린다. 등록부에 없는 후보는
   "아직 판정하지 않음"이라는 뜻이지 "문제 없음"이 아니다.
3. 후보를 판정할 때는 후보 문장을 그대로 믿지 말고 실제 소스에서 재현 여부를 확인한 뒤, 표의 판정
   칸을 `Gap` / `Risk` / `Decision Needed` / `해소됨` 중 하나로 **바꿔 쓴다.** 지시문을 남겨 두지 않는다.
4. 판정을 마친 후보 중 고객이 체감하는 것은 같은 날 `docs/qa/launch-status.html` 등록부와 해당 기능
   HTML에도 반영한다.

미판정 후보가 남아 있는 기능은 74개이며, 기능별 잔여 수는 `docs/qa/feature-status.html`의 "미판정"
열에서 확인한다. 상위 집중 구간은 F03-05(20) · F04-03(11) · F02-04(9) · F03-06(8) · F10-02(8) ·
F03-12(7) · F04-12(7) · F07-09(7) · F13-07(7)이다. F06-06 은 2026-11-08 에 모두 판정했다.

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
| 호스트 직접 수납 | 들어감 | 일부 반영(입금 신고·확인·거절·환불 확인은 F03-05·F03-07·F03-13·F17-02·F17-05·F17-07). 받을 계좌 등록·인증 화면 계약은 아직 | `event/prepayment/service/EventHostBankAccountService.java`, `BankAccountVerification*.java`, `HostDirectCashBootGuard.java`, 설정 `payment.host-direct-cash` |
| 출시 범위 관문 | 들어감 | 일부 반영(F02-01·F03-03·F03-13·F03-17 에 언급). 범위 목록·안전 출구 계약은 아직 | `ReleaseScope*.java`(도메인 `P0`·`CASH_EVENT`·`MARKET`·`MARKET_PERIOD_PASS` …), `RELEASE_SCOPE_DISABLED` |
| 계정 정지 제한 세션 | 들어감 | 없음(F01·F13·F15) | `JwtProperties.java:22-27`(`SCOPE_RESTRICTED`), `api-app/.../config/security/JwtAuthorizationFilter.java:126,183`, `AccountSanctionService.java:42` |
| 분쟁 종결 | 들어감 | 없음(F18) | `DisputeCompensationLedger*.java`, `DisputeCompensationCommand.java` |
| 마일리지 규칙·배지 | 들어감 | 배지는 F16-01·02·05·06·08 에 있음. 기본 규칙 셋과 신규 적용 원칙은 아직 | `MileageBadge*.java` |
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

### 다음에 이어 갈 것

8절 갭 후보 234행(위 상위 집중 구간부터). 미반영 여섯 가운데 넷(호스트 직접 수납의 받을 계좌 등록·인증, 출시 범위 관문의 범위 목록·안전 출구, 계정 정지 제한 세션, 분쟁 종결)과 마일리지 기본 규칙을 해당 기능 PRD 에 들이는 일.

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
> 새 기능 ID를 만들지 않는다는 원칙은 유지한다 — 대부분 기존 기능(F03·F06·F13·F17·F18)의 내용 확장이며, 반영 시점에 어느 기능 PRD에 흡수할지 먼저 정한다.

| # | 미반영 항목 | 내용 요약 | 정본 근거 |
|---|---|---|---|
| 1 | 호스트 계좌 직접 수납 전체 플로우 (MNY-03B) | 호스트 수납 계좌 등록·모임 결박, 참가자 입금자명 신고, 호스트 입금 확인/거절, 수동 환불과 수령 확인, 계좌 1원 인증(실 제공자 계약 전에는 인증 없이 출시), 관리자 대행 처리까지의 사용자·운영 동선 전체. 현재 F03-13/F17-07에는 결제수단 판정만 반영돼 있고 계좌 등록·확인 화면 계약은 없다. | `docs/plan/payment/MNY03B_HOST_DIRECT_CASH_PLAN_2026-08-17.md`, `docs/release-gate/evidence/MNY-03B/`, `docs/plan/payment/G0_10_PAID_EVENT_PAYMENT_DECISION_2026-08-11.md` |
| 2 | 출시 범위 게이트 (P0-SCOPE-01) | 이 배포가 파는 도메인만 열고 나머지 7개 도메인은 서버·앱 양쪽에서 봉인하는 구조. 봉인된 도메인의 기존 건에 대한 조회·취소·환불 등 **안전 출구**는 유지된다는 계약을 포함한다. 앱은 서버가 주는 범위 목록으로 메뉴·라우트를 그린다. | `docs/release-gate/plans/P0SCOPE_ACCLOCK_EXECUTION_PLAN_2026-08-17.md`, `docs/release-gate/evidence/P0SCOPE-ACCLOCK/` |
| 3 | 계정 정지·차단의 권리구제 (ACC-LOCK-01) | 정지·차단 계정은 로그인을 거부당하지 않고 **제한된 권한의 세션**을 받는다. 제재 안내 화면, 본인 케이스 결과 확인·이의 제기, 데이터 권리 등 허용 동선 22행이 확정됐다. 현재 인증·프로필 계열 PRD(F01·F13·F15)에는 이 제한 세션 개념 자체가 없다. | `docs/release-gate/plans/P0SCOPE_ACCLOCK_EXECUTION_PLAN_2026-08-17.md`, `docs/release-gate/evidence/P0SCOPE-ACCLOCK/` |
| 4 | 분쟁 종결 완결 (DSP-01) | 분쟁 케이스의 자동/수동 종결, 보상 원장, 당사자 명령·동의 종결, 관리자 위임 확정, 종결 고지 단일화. F18-01~05 전체가 이 재설계 이전 기준이다. | `docs/plan/payment/DSP01_DISPUTE_CLOSURE_PLAN_2026-08-16.md`, `docs/release-gate/evidence/DSP-01/` |
| 6 | 마일리지 규칙·배지 (MLG-01) | 기본 적립 규칙 3종 시딩, 규칙의 신규 적용 전용 원칙, 서버 계산 권한 게이팅, 배지·등급. F16-01~08이 이 착지 이전 기준이다. | `docs/development/IMPLEMENTATION_WORKBOARD.md`, `docs/club_activity/mileage/README.md` |
| 7 | 이메일 인증 제한 세션의 화면 파급 | 2026-08-18 동기화는 F01-03(및 F01-01·F01-02의 모순 서술)만 정정했다. 미인증 상태에서 각 도메인 화면이 무엇을 보여주고 어디로 안내하는지는 아직 각 기능 PRD에 반영되지 않았다. | `docs/archive/decisions/PENDING_DECISIONS_2026-08-15.md`, `docs/release-gate/evidence/P0-REAL-ACCOUNT-E2E/`, `docs/release-gate/RC_MANIFEST_2026-08-18_P0_R2.md` |
