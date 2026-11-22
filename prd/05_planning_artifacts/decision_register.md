# 결정 등록부

<!-- release-document: reference -->
> **문서 구분: 기획 검토 자료.** 2026-11-22 현재 정본과 대조했다. 현재 실행 순서는 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)을 따른다. 이 문서는 제품 변경이나 공개를 새로 승인하는 기록이 아니다.

## 현재 결정과 미결정의 구분

승인된 정책, 현재 구현, 공개 범위, 확인 결과를 나누어 기록한다. 과거의 질문을 현재 미결정 목록에 그대로 합산하지 않는다. 실제로 답이 필요한 일은 [사용자가 정할 것](../../../docs/plan/NEXT_WORK.md#2-사용자가-정할-것), 이미 정한 답은 [현재 적용하는 결정](../../../docs/plan/NEXT_WORK.md#현재-적용하는-결정)을 따른다. 이 등록부는 그 실행 목록의 주제별 연결표다.

## 기존 결정 주제의 현재 연결

D-01~D-10 식별자는 유지한다. 아래의 ‘재검토’는 새 승인 요청이 아니라, 해당 주제를 바꿀 때 확인할 근거와 질문이다.

| ID | 주제 | 현재 기준과 정본 | 재검토할 때 구분할 것 |
|---|---|---|---|
| D-01 | 첫 출시 범위 | [첫 출시에서 제공할 것](../../../docs/README.md#첫-출시에서-제공할-것)과 [후속 공개 대상](../../../docs/README.md#첫-출시를-기다리게-하지-않는-일)이 이미 정해져 있다. [범위 검토표](mvp_scope_matrix.md)는 이 기준을 따른다. | 175개 기능을 모두 다시 선택하는 미결정으로 되돌리지 않는다. 포함 범위 변경·공개 설정·실행 확인을 구분한다. |
| D-02 | 성공 KPI | 이 등록부에는 지표 정의·목표 수치·승인 근거가 기록돼 있지 않다. | 필요한 지표의 분모·기간·측정 방법과 결정 근거를 기록한다. 수치나 미달 판정을 임의로 만들지 않는다. |
| D-03 | 운영 응답 기한 | 이 등록부에는 신고·환불·이의 대응의 확정 응답 기한과 책임 배정 근거가 없다. | 기능의 신청 기한·자동 처리 시각을 운영 응답 약속으로 바꾸지 않는다. 합의할 대상·영업일·예외·담당과 승인 근거를 남긴다. |
| D-04 | 결제·환불 | [결제·정산 정책](../03_policy_prds/payment_settlement_policy_prd.md)과 각 원천별 환불 정본에 현재 조건이 있다. 직접 송금, 지갑 반환, 외부 지급, 정산 선입금의 공개 제한을 구분한다. | 환불 전체가 미결정이라고 표시하지 않는다. 기존 조건을 바꾸는 제안과 결제 공개·외부 계약 입력을 구분한다. |
| D-05 | 데이팅 안전 | [개인정보·안전 정책](../03_policy_prds/privacy_safety_policy_prd.md)과 [데이팅 정본](../01_domain_prds/09_프라이빗_데이팅_prd.md)의 인증·동의·차단·열람 조건을 따른다. 데이트는 후속 공개 대상이다. | 현재 안전 장치의 구현과 운영·법적 검토·공개 판단을 동일한 완료로 합치지 않는다. |
| D-06 | 위치 동의·고지 | [위치 동의·좌표·열람 기록](../03_policy_prds/privacy_safety_policy_prd.md#위치-동의좌표열람-기록)에 동의·전송·조회·중지의 현재 경계가 있다. | 현재 동의 흐름과 고지 문구 변경·외부 검토를 구분한다. 동의 끄기를 열람 기록 즉시 파기로 안내하지 않는다. |
| D-07 | 알림 전달 정책 | [알림 정책](../03_policy_prds/notification_policy_prd.md)의 카테고리·알림함·방해금지·항상 전달·광고 동의를 구분한다. | 일반 카테고리를 끄면 새 푸시와 알림함 기록이 함께 제한된다. 방해금지의 푸시 제한과 혼합하지 않는다. 정책 변경과 실제 기기 수신 확인도 별개다. |
| D-08 | 클럽 기금 | [클럽 기금 출금](../02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md)은 현재 회원인 정본 클럽장 권한, 신청·승인·지급 단계를 구분한다. | 출금 권한이 모두 미정이라고 하지 않는다. 공개 조건·보호액·증빙과 감사 요구의 변경은 해당 정본과 대조한다. 승인·지급 요청만으로 입금 완료를 선언하지 않는다. |
| D-09 | 마켓 심사·환불 | [상품 관리](../02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md)와 [구매 환불](../02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md)에 승인 버전·판매 상태·원천별 처리 조건이 있다. 마켓은 후속 공개 대상이다. | 심사 승인과 판매 시작, 회원 상품과 플랫폼 기간권, 전체와 부분 환불을 구분한다. 공개 전 남은 결정은 현재 실행 목록에서 확인한다. |
| D-10 | 계정 종료 | [삭제 예약·즉시 탈퇴·후속 정리](../03_policy_prds/privacy_safety_policy_prd.md#계정-삭제-예약즉시-탈퇴후속-정리)를 따른다. 삭제 예약은 기본 30일이며 로그인 자체가 취소하지 않는다. | 예약과 즉시 탈퇴, 실행 전 재검사, 자료 보존·파기를 구분한다. 개인 유료 구독의 후속 정책 등 별도 질문을 모든 계정 종료 정책의 미확정으로 확대하지 않는다. |

## 결정 기록 양식

| 항목 | 기록할 내용 |
|---|---|
| 식별자·질문 | 기존 ID를 유지하고 바꾸려는 정책 또는 범위를 명확히 적는다. |
| 현재 기준 | 관련 정본·현재 결정·기준 버전과 날짜 |
| 상태 | 제안·결정 필요·승인됨·대체됨·철회됨과 근거. 구현·검증 상태는 별도 |
| 결정일·결정자 | 실제 승인 날짜와 주체. 제안 담당자를 승인자로 쓰지 않는다. |
| 내용과 이유 | 선택한 규칙, 대안, 사용자 영향·운영 제약·검토 근거 |
| 반영 범위 | 관련 기능 ID, 정책·QA·HTML, 현재 실행 목록의 해당 항목 |
| 후속 확인 | 적용 버전, 확인할 조건과 실제 결과, 남은 외부 입력 |
| 재검토·대체 관계 | 재검토 조건과 이전 결정을 대체한 기록의 링크 |

## 정기모임의 현재 정본

과거 A~T 및 시뮬레이션 식별자는 바꾸지 않는다. 당시 ‘미확정 0’은 그 결정 묶음에 관한 기록이며 현재 모든 정책·구현·출시의 완료 수가 아니다. 삭제된 설계 파일은 Git 이력의 근거로 남기고 현재 규칙은 [정기모임 영역 PRD](../01_domain_prds/17_정기모임_prd.md)와 아래 정본에서 확인한다.

| 주제 | 현재 정본 |
|---|---|
| 모임·회차·공개·종료 | [정기모임 생명주기](../02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md), [회차 관리](../02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md) |
| 등록·결제 | [등록과 자격](../02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md), [결제](../02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md) |
| 환불·출석·정산 | [환불](../02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md), [출석](../02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md), [정산](../02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md) |

## 정기모임 결정 원문 보존

아래는 수정 전 기록을 그대로 보존한 것이다. 당시 기술 표현과 조건을 현재 계약으로 복사하지 않는다. 현재 정본과 달라진 항목은 현재 정본의 근거를 따른다.

> > **2026-05-27 일괄 확정 완료** (A~T + J·K + 시뮬레이션 결정 C8·C11·P2·P3 + 정합성 접근 B = 미확정 0).
> > Canonical: `docs/plan/regular-meeting/03-design-decisions.md`(2026-08-10 문서 저장소에서 지움, Git 이력에 있음) — 결정 식별자(A~T)는 분할 후에도 **불변**. namespace 변환(D-11 등) 안 함.
> > 본 표는 요약·교차 참조 인덱스. 결정 본문/근거/검증 조건은 canonical에서 본다.
>
> | ID | 주제 | 결정 요약 | 영향 |
> |---|---|---|---|
> | A | 도메인명 | 신규 first-class 도메인 `RegularMeeting` (클럽·EventRecurrence 부적합) | 패키지 명명 / 책임 경계 |
> | B | event_id 다중 모임 | `regular_meeting_event.event_id` UNIQUE (한 이벤트 = 최대 1모임) | DDL 제약 |
> | C | EventType 신규값 | `EventType.REGULAR_MEETING(3)` 추가 (클럽 패턴 미러) | 03_event |
> | D | 사교 정산 | 1차 = 유료 참가권 + 환불. 사교 N빵 정산은 선택 후순위 | 06/07 정산 |
> | E | 결제 객체 격리 | 신규 `regular_meeting_payment` (기존 `event_payment` 오버로드 회피) | 06 결제 |
> | F | FIXED 중도 환불 | **진행 세션 차감(pro-rata)** — F17-08 산식 | 환불 |
> | G | FIXED 결제 시점 | 승인제=승인 후 마감 / 무승인=즉시 | 등록·결제 |
> | H | VARIABLE 유료·무료 혼재 | 허용 (이벤트별 가격) | 검증 |
> | I | EventRecurrence 관계 | 분리 유지 (RM과 EventRecurrence는 별개) | 범위 경계 |
> | J | 회계 레저 | **신규 RM 전용 메서드** `recordRegularMeetingPayment/Refund` (기존 event-id-shaped 메서드 미변경, 리스크 격리) | 회계 분개 |
> | K | failed_refund 확장 | `failed_refund.regular_meeting_id` 컬럼 추가 + `event_id` nullable화. 신규 테이블 기각 | 환불 재시도 |
> | L | 탈퇴 처리 | **환불 완료 전까지 탈퇴 불가**(blocking). `AccountDeactivationService` 4건 가드 추가 | 13 프로필 |
> | M | 노쇼 기본 정책 | `NONE`(OFF) 기본. 호스트가 WARN/FORFEIT 선택 | UX·약관 |
> | N | 노쇼 카운트 모드 | `CONSECUTIVE`(연속) 기본. 모임별 선택 | 정책 평가 |
> | O | 출석 확정 방식 | **호스트 수동 승인이 기본.** 스케줄러 자동확정은 보조(기본 OFF) | 출석 |
> | P | FORFEIT 무환불 적법성 | 등록 시 환불정책 + (FORFEIT 시) 무환불 약관 필수 고지·동의 | 리스크 |
> | Q | 금액 표기 일관성 | 원(KRW) 정수. `BigDecimal` + 100원 floor (Event.price 미러) | 금액 타입 |
> | R | RM 세션 디스커버리 | 세션을 검색·캘린더에 **노출**. FIXED는 컨텍스트화 + 직접신청 가드 + 가시성 가드 | 검색/홈/캘린더 |
> | S | FIXED 출석 저장 방식 | 기존 EventAttendance **재사용** (조건부). bulk ATTENDING 금지 + ≥24h 전 materialize + post-finalize `ATTENDED` 권위 | 출석/체크인/통계 |
> | T | FIXED 호스트 정산 경로 | **(B) 신규 RM 정산 전체 경로** — `Settlement.regular_meeting_id` + `recordSettlementComplete` + RM-keyed clawback. 코스 완료 경계 발화 | 호스트 수익 지급 |
> | C8 (시뮬) | FORFEIT vs 호스트 비제공 | 몰수는 제공된 미참석 세션만 무환불. 호스트 미제공 세션은 몰수 멤버에게도 환불 | 06/07 정산 |
> | C11/P3 (시뮬) | 리뷰 자격 | **세션마다** (코스 1회 아님). 자격 = 그 세션 ATTENDED | 11 리뷰 |
> | P2 (시뮬) | 중도 등록 | 호스트 권한(허용 토글). 가격 = 잔여 세션 비례 (`price×잔여/N`) | 06 결제 |
> | 정합성 접근 | Event 중앙 분류 | **B안 (공용 거름망 2개)** — 디스커버리 predicate + service 가드. RM은 Event 도메인 정리 선행 작업 | 03 이벤트 |
