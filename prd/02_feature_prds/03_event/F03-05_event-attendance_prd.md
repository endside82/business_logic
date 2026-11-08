# F03-05. 이벤트 신청 & 참석 (참가자) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

> 문서 상태: **실사 기반 전환본 + W1/W2/W3 신규 분기 통합 (2026-05-22)**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-05_event-attendance`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-05-22 W2/W3 추가: 선입금 활성 이벤트의 `APPROVED_PENDING_PAYMENT`/`PAYMENT_EXPIRED` 분기와 `EventParticipationCancellationService.cancelMyParticipation` facade가 `apply`/`approveApplication`/`DELETE .../apply` 흐름에 통합되었다. 선입금 결제·환불 자체의 facade·회계·환불 매트릭스는 **F03-13 (이벤트 참가 선입금)** 으로 분리. 본 PRD는 신청·취소 사용자 액션과 상태 전이까지만 다룬다.
>
> 2026-07-29 현재 소스 갱신: 게스트 동반 예매가 같은 참석 흐름에 편입됐다. 서버는 `allowGuests`, `maxGuestsPerBooking`, `Application.partySize`, `guestNames`, `payableAmount`, 계정 없는 게스트 attendance row를 사용하고, 앱은 신청 확인 시트·일행 관리 시트·참석자/체크인 화면에서 소유자와 게스트를 분리 표시한다. 유료 이벤트의 게스트 추가/삭제는 F03-13 결제·환불 경로(증분 결제, 라인 환불, 호스트 강제환불)를 따른다. 현재 워크트리에는 host removal / party removal의 lock 순서를 event-first로 정렬한 deadlock hardening도 포함되어 있다.

## 1. 결론

참가자가 OPEN 이벤트에 참석/대기열 등록/취소하거나, 승인 필요(`approvalRequired` 또는 `visibility=APPROVAL`) 이벤트에 신청서를 제출한다. 두 경로(`capacity` / `apply`)가 있고 `EventAttendance` (참석 row)와 `Application` (신청 row)는 분리되어 저장된다. 정원 초과 + 대기열 활성 시 `WAITING` 상태로 들어가고 호스트가 ATTENDING을 취소하면 `WaitlistService`가 다음 대기자를 자동 승급시킨다. 본 단위는 참가자의 직접 액션만 다룬다 (호스트의 승인/거절은 F03-06, 정원 설정은 F03-07).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 하단 액션바 "참석 신청" / "대기열 등록" / "참석 취소"
- 마이 이벤트(F03-12) "참석 예정" 카드 ▶ 상세 진입 후 액션바
- 알림(F12) 승인/거절/자동 승급 푸시 ▶ 상세

## 2. 코드 위치

계약의 정본은 코드다. 서버: `CapacityController`, `EventController`, `AttendanceController`, `EventParticipationCancellationService`, `ApplicationStatus`, `ChangeType`, `EventVo`, `EventApplyRestrictionGuard`, `ApplicationService`, `CheckInService`. 앱: `event_detail_screen.dart`, `my_events_screen.dart`, `attendance_apply_sheet.dart`, `event_apply_confirm_sheet.dart`, `cancel_attendance_sheet.dart`, `event_action_bar.dart`, `event_viewer_status.dart`, `application_card.dart`.

<!-- source-references:start -->
서버 창구: `CapacityController#attend`, `CapacityController#cancel`, `CapacityController#getMyAttendance`, `EventController#applyToEvent`, `EventController#cancelApplication`, `EventController#getMyApplications`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 액션바 상태: `eventDetailNotifierProvider(eventId).valueOrNull?.myAttendanceStatus` 기반 분기
2. 결제 필요 여부: `event.price > 0 && event.prepaymentRequired` (UI 결정)
3. 일반 신청 (승인 불필요):
   - `AttendanceActionNotifier.attend()` ▶ `_directAttend`
   - `AttendanceRepository.attend(eventId)` ▶ `POST /api/v1/events/{id}/capacity`
   - 응답 200/201 → `eventDetailNotifierProvider.invalidate()` (currentCapacity 갱신, viewer status 갱신)
4. 신청서 (승인 필요):
   - `AttendanceActionNotifier._apply()`
   - `ApplicationRepository.apply(eventId, ApplicationParam)` ▶ `POST /api/v1/events/{id}/apply`
   - 응답 → status=PENDING으로 표기, viewer 갱신
5. 유료 + 승인제:
   - 신청 시점에는 결제 API를 호출하지 않는다.
   - 호스트 승인 후 사용자는 `approvedApplication` 또는 `approvedPendingPayment` 상태를 보고 결제 CTA를 누른다.
   - 결제 성공 후에만 `event_attendance=ATTENDING`으로 확정되어 체크인/위치/리뷰 자격이 열린다.
   - **`APPROVED_PENDING_PAYMENT` + `paymentDueAt` 구현 완료** (해소 2026-06-05): 선입금 활성 이벤트에서 승인 즉시 해당 상태로 진입하고, `confirmPaymentAndAttend`에서 결제 확정 시 `APPROVED + ATTENDING`으로 전이한다 (`ApplicationService.java:150-165`).
6. 취소:
   - approvalRequired → `ApplicationRepository.cancelApplication` ▶ `DELETE .../apply`
   - 일반 → `AttendanceRepository.cancel` ▶ `DELETE .../capacity`
   - `eventDetailNotifierProvider.invalidate()`
7. 내 신청 목록(F03-12 위임): `myApplicationsProvider` ▶ `GET /api/v1/events/users/me/applications` (List 반환, Page 아님!)

## 4. 제품 규칙

### 2.0 선입금 갈래
- 유료인데 선입금이 꺼져 있으면 신청·승인을 받지 않는다(`EVENT_REQUIRES_PREPAYMENT`). 결제 없는 참석을 만들지 않기 위해서다.
- 자동 승인 + 선입금은 신청 즉시, 승인 필요 + 선입금은 호스트가 승인할 때 `APPROVED_PENDING_PAYMENT` 와 결제 기한이 붙는다. 자동 승인 무료만 바로 `APPROVED` + 참석이다.
- 결제 기한은 호스트가 정한 결제창(1~168시간, 기본 24시간)이다.
- 결제 대기 동안 참석 수와 참석 행은 늘지 않지만 일행 수만큼 좌석을 논리로 잡는다. 결제 요청 알림은 커밋 뒤에 간다.
- 캘린더 동기화 같은 승인 후속은 결제가 확정될 때 한 번만 한다.
- 다시 신청: 지난 신청이 `PENDING`·`APPROVED`·`APPROVED_PENDING_PAYMENT` 이면 `APPLICATION_ALREADY_EXISTS` 다. `CANCEL_PENDING_REFUND` 이거나 은행 환불 대기 결제가 남았으면 `APPLICATION_REFUND_PENDING` 이고 환불이 끝난 뒤에만 받는다. `PAYMENT_EXPIRED`·`REJECTED`·`CANCELED` 는 받되, 입금 신고·결제 완료가 남았으면 이미 신청한 것으로 거절한다.

### 2.6 본인 취소
- 끝난 모임은 `EVENT_ALREADY_CLOSED`, 시작 시각이 지난 OPEN 모임은 `EVENT_ALREADY_STARTED` 로 거절한다(2026-10-24 사용자 결정: 시작 뒤 빠져나가 노쇼 판정과 점수 회수를 비켜 가지 못하게). 그 뒤는 호스트 처리로만 된다.
- 취소된 모임은 환불 회수를 위해 받는다. 일정 변경 거절의 자동 취소는 끝난 모임만 거절한다.
- 이미 `CANCELED`·`REJECTED`·`CANCEL_PENDING_REFUND` 인 신청은 `APPLICATION_INVALID_STATUS` 다. 보관금이 열린 비공개 모임 선정자도 스스로 나가지 못한다.

| 활성 결제 | 결과 |
|---|---|
| 없음 | 신청 `CANCELED`, 참석 행이 있으면 좌석 해제 |
| 지갑, 결제 전 | 결제 `CANCELED`, 신청 `CANCELED` |
| 지갑, 결제 완료 | 환불 정책대로 즉시 지갑 환불, 신청 `CANCELED`. 돌려줄 돈이 0원이면 `REFUND_NOT_ALLOWED`, 시작 뒤 일행이 체크인했으면 `EVENT_REFUND_NOT_ALLOWED_AFTER_CHECKIN` |
| 계좌이체, 입금 신고 | 신고액 전액을 은행 환불 대기로, 신청 `CANCELED`. 참가자가 이미 보냈을 수 있어 추적 행을 남긴다 |
| 계좌이체, 입금 확인 | 결제 `REFUND_REQUESTED`, 신청 `CANCEL_PENDING_REFUND`, 호스트에게 바로 알림. 호스트가 환불을 확인하면 `CANCELED` + 좌석 해제. 정책 상한이 0원이면 거절 |
| 이미 환불 대기 | `APPLICATION_INVALID_STATUS` |

### 2.7 결제 기한 만료
- 5분 주기로 기한 지난 결제 대기를 `PAYMENT_EXPIRED` 로 바꾸고, 결정 이력(`AUTO_REJECT`)과 만료 알림을 남긴다. 잡았던 좌석은 풀리고 참석 수는 변하지 않는다.
- 호스트 확인을 기다리는 입금 신고가 있으면 기한이 지나도 만료하지 않는다. 기한이 지난 결제·신고는 배치 전이라도 거절한다.
- 유료 모임은 대기 없음이다(결제한 사람은 대기에 두지 않고, 대기자가 있는 모임은 유료로 바꾸지 못한다). 그래서 만료로 풀린 자리는 대기자에게 넘기지 않고 다음 신청이 받는다(2026-11-08).

### 2.1 정원과 신청 조건
- 사전 판정은 어느 갈래로도 들 수 없는 경우만 막고, 나머지는 F03-07 §3-1 매트릭스가 정한다.
- 대기열 상한은 최대 대기 수이고 0이면 정원×2 다. 닿으면 `WAITLIST_FULL` 이다.
- 승인 필요는 승인제, 공개 범위 `APPROVAL`, 비공개 모임이다. 호스트 본인은 신청하지 못한다. 클럽 모임은 그 클럽 회원만 받는다.

### 신청 상태
- 좌석을 잡는 상태: `APPROVED`, `APPROVED_PENDING_PAYMENT`, `CANCEL_PENDING_REFUND`. 끝난 상태: `CANCELED`, `REJECTED`, `PAYMENT_EXPIRED`.
- `CANCEL_PENDING_REFUND` 는 취소로만 간다. 환불 확인 전까지 자리를 잡고 체크인은 거절되며 노쇼 산정에서 빠진다.
- 참석 상태 값은 `ATTENDING`, `WAITING`, `CANCELLED`, `REJECTED` 다. 신청의 `CANCELED` 와 철자가 다르다.

### 제재
- 클럽 제재와 플랫폼 제재를 함께 본다. 제재 중이면 신청·참석이 `USER_RESTRICTED_FROM_EVENT_APPLY` 로 막힌다. 승인 뒤 참석을 만들 때 다시 본다. 대기열 처리는 F03-07 §4 를 따른다.

### 사용자가 보는 것
- 유료 승인제는 승인 전(심사 중), 승인 후 결제 전(결제 버튼 "결제하고 참석 확정"), 결제 뒤(참석 확정)를 구분해 보인다.
- 대기에서 승격한 사람에게 상세에서 한 번만 강조하고, 닫으면 다시 보이지 않는다.
- 잔액이 모자라면 충전으로 안내한다.
- 오류의 뜻: `EVENT_CANNOT_APPLY` 신청할 수 없는 모임, `EVENT_ALREADY_CLOSED` 모집 마감, `CAPACITY_FULL` 정원 가득, `ALREADY_ATTENDING`·`APPLICATION_ALREADY_EXISTS` 이미 신청함, `APPROVAL_REQUIRED` 승인 필요, `CLUB_MEMBERSHIP_REQUIRED` 클럽 회원만(가입 안내), `CAPACITY_FULL_AT_CONFIRMATION` 결제 처리 중 정원 초과.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 무료 + 승인 불필요 + 정원 여유 (Happy Path) | 로그인됨, 이벤트 status=OPEN, currentCapacity=8/12, approvalRequired=false. | 사용자 ATTENDING, 호스트에게 알림 없음 (자동 신청은 알림 트리거 없음 — 코드 확인 결과 NEW_APPLICATION은 apply 경로에서만 발생). |
| S2 | 정원 초과 + 대기열 등록 | status=OPEN, currentCapacity=12/12, waitlistEnabled=true, 대기열 2명. | 사용자 WAITING. |
| S3 | 자동 승급 (다른 사용자 취소 시) | S2의 사용자, 대기 3번째. | 순번 갱신. |
| S4 | 자동 승급된 사용자가 ATTENDING으로 전환 | 1번째 대기자. | 정상 ATTENDING. |
| S5 | 승인 필요 이벤트 신청 → 호스트 승인 | status=OPEN, approvalRequired=true. | ATTENDING. |
| S6 | 자가 취소 (ATTENDING) | 참석 확정 사용자. | 사용자 CANCELLED, 다음 대기자 ATTENDING. |
| S7 | 호스트 본인이 신청 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 클럽 비멤버가 클럽 이벤트 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 중복 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 정원 + 대기열 모두 가득 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S11 | 유료 이벤트 신청 시 잔액 부족 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S12 | 모집 마감(`isClosed=true`) 후 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S13 | 유료 + 승인제 이벤트 신청 → 승인 후 결제 필요 | 로그인됨, 이벤트 status=OPEN, price=20,000, approvalRequired=true 또는 visibility=APPROVAL, currentCapacity=8/10. | 결제 성공 전까지 정식 참석자가 아니며, 결제 성공 후에만 참석 확정. |
| S2-2 (W2) | 선입금 + 승인 필요 + 호스트 승인 → APPROVED_PENDING_PAYMENT | `EventPrepayment.prepaymentRequired=true`, `approvalRequired=true`. 호스트가 승인 호출 | `Application=APPROVED_PENDING_PAYMENT + paymentDueAt`. `currentCapacity`·attendance는 미점유지만 `partySize`는 논리 hold. 알림 71 (after-commit). 참가자 결제 화면 진입 가능 (F03-13). |
| S2-2b (W2) | 선입금 + 자동 승인 → 즉시 APPROVED_PENDING_PAYMENT | `prepaymentRequired=true`, `approvalRequired=false`. 참가자가 `POST .../apply` | `Application=APPROVED_PENDING_PAYMENT + paymentDueAt`. 물리 attendance 전이 전에도 `partySize` 논리 hold가 정원 검사에 반영. 결제 facade 진입 (F03-13). |
| S2-5 (W2) | 결제 기한 만료 | `APPROVED_PENDING_PAYMENT + paymentDueAt < now()` | 결제 만료 주기 작업이 신청 하나씩 `Application=PAYMENT_EXPIRED` 로 바꿔 논리 hold를 해제하고, 결정 이력 `AUTO_REJECT` 와 만료 알림 75를 같은 트랜잭션에 남긴다. 호스트가 확인하지 않은 계좌이체 입금 신고가 있으면 만료하지 않아 확인 대기 결제가 남지 않는다. |
| S2-6 (W3) | 사용자 자가 취소 — `cancelMyParticipation` (WALLET PAID) | `event_payment.PAID(WALLET)`, deadline 통과 전 | `DELETE /api/v1/events/{eventId}/apply` → facade가 `refundByWallet` 100% 위임 → `Application=CANCELED + capacity-- + event_payment.REFUNDED`. 알림 76. |
| S2-7 (W3) | 사용자 자가 취소 — BANK_TRANSFER PAID | `event_payment.PAID(BANK_TRANSFER)` | `event_payment.REFUND_REQUESTED + Application 유지`. 호스트 알림 83. 환불 정리는 호스트 책임. |
| S2-11 (W3) | 탈퇴 차단 | active `event_payment` 보유 | 400 `DEACTIVATION_BLOCKED` + BlockingItem `ACTIVE_EVENT_PAYMENT`. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 유료 승인제 순서 | 승인이 필요한 모임의 신청은 대기(PENDING)로 들어가고 호스트·공동 호스트에게 알린다. 승인되면 선입금 모임은 결제 대기(`APPROVED_PENDING_PAYMENT`)가 되고 참석 행·정원·체크인 대상은 결제가 확정될 때 생긴다. 승인이 필요 없는 유료 모임은 바로 결제 대기다. 결제 단추는 결제 대기 신청자에게만 보이고 결제는 선입금 경로로만 한다 | 없음 |
| 해소됨 | 체크인 기록 정리 | 참석 취소·내보내기·일행 정리 때 그 사람과 그 참석 행의 체크인 기록을 함께 지운다 | 없음 |
| 해소됨 | 끝난 모임의 대기 승급 | 종료·취소된 모임에서는 자리가 비어도 대기자를 올리지 않는다 | 없음 |
| 해소됨 | 마감 모임 참석 | 새 참석을 받지 않는 모임(숨긴 모임 포함)은 `EVENT_NOT_OPEN`, 마감된 모임은 `EVENT_ALREADY_CLOSED` 로 거절한다. 신청도 같은 모집 중 판정으로 거절한다 | 없음 |
| 해소됨 | 승인 필요 판정 | 승인 표시가 켜졌거나 승인 공개 범위이거나 비공개 만남이면 대기로 시작한다. 아니면 유료는 결제 대기, 무료는 바로 승인과 참석 등록이다 | 없음 |
| 해소됨 | 다시 신청 | 살아 있는 신청이 있으면 거절한다. 끝난 신청(취소·거절·만료) 행은 다시 신청할 때 그 행을 다시 쓰고 결정 기록 번호를 하나 올린다 | 없음 |
| 해소됨 | 대기 상태 이름 | 앱 열거는 서버와 같은 `WAITING` 을 쓰고 옛 표기 `WAITLISTED` 는 받지 않는다 | 없음 |
| 해소됨 | 신청 메시지 길이 | 서버가 2026-11-08 부터 신청 메시지를 500자까지 받고, 넘으면 잠금 전에 잘못된 입력 400 으로 거절한다. 서버는 이모지를 두 글자로 센다 | 없음 |
| 해소됨 | 신청 메시지 보내기 | 신청서 시트의 신청 메시지는 2월 서버 맞춤 때 입구가 끊겨 참가자가 보낼 길이 없었다(호스트 쪽 표시는 있었다). 2026-11-08 부터 승인이 필요한 모임(승인 표시·승인 공개·비공개)이면 신청 확인 시트 안에 메시지 칸(선택, 서버 셈 500자)이 있고 신청 본문에 실린다. 모임 상세와 클럽 일정 목록 두 입구가 같다. 액션바의 「신청서 작성」 글자는 화면에 없다(「참석 신청」 뒤 확인 시트, 글 승인 때 함께 묻는다) | 없음 |
| 해소됨 | 대기 중 클럽 모임 상세 | 대기 중인 클럽 모임 상세는 대기 안내와 「클럽 가입 후 참석 가능」 라벨을 함께 보일 수 있다. 화면 기록이고 결함이 아니다 | 없음 |
| 해소됨 | 그림 꾸밈 줄 | 흐름 그림의 색 지정 줄이라 판정할 내용이 없다 | 없음 |

## 9. 수용 기준

- **AC-01. 무료 + 승인 불필요 + 정원 여유 (Happy Path)**: Given 로그인됨, 이벤트 status=OPEN, currentCapacity=8/12, approvalRequired=false. When 사용자가 해당 흐름을 실행하면 Then 사용자 ATTENDING, 호스트에게 알림 없음 (자동 신청은 알림 트리거 없음 — 코드 확인 결과 NEW_APPLICATION은 apply 경로에서만 발생).
- **AC-02. 정원 초과 + 대기열 등록**: Given status=OPEN, currentCapacity=12/12, waitlistEnabled=true, 대기열 2명. When 사용자가 해당 흐름을 실행하면 Then 사용자 WAITING.
- **AC-03. 자동 승급 (다른 사용자 취소 시)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 순번 갱신.
- **AC-04. 자동 승급된 사용자가 ATTENDING으로 전환**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 ATTENDING.
- **AC-05. 승인 필요 이벤트 신청 → 호스트 승인**: Given status=OPEN, approvalRequired=true. When 사용자가 해당 흐름을 실행하면 Then ATTENDING.
- **AC-06. 자가 취소 (ATTENDING)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 CANCELLED, 다음 대기자 ATTENDING.
- **AC-07. 호스트 본인이 신청 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 클럽 비멤버가 클럽 이벤트 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 중복 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 정원 + 대기열 모두 가득**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-11. 유료 이벤트 신청 시 잔액 부족**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-12. 모집 마감(`isClosed=true`) 후 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-13. 유료 + 승인제 이벤트 신청 → 승인 후 결제 필요**: Given 로그인됨, 이벤트 status=OPEN, price=20,000, approvalRequired=true 또는 visibility=APPROVAL, currentCapacity=8/10. When 사용자가 해당 흐름을 실행하면 Then 결제 성공 전까지 정식 참석자가 아니며, 결제 성공 후에만 참석 확정.
- **AC-W2-1 (S2-2). 선입금 + 승인 필요 + 호스트 승인**: Given `prepaymentRequired=true`, `approvalRequired=true`. When 호스트가 승인 호출. Then `Application=APPROVED_PENDING_PAYMENT + paymentDueAt` 설정, `currentCapacity`·attendance는 미점유지만 `partySize` 논리 hold가 시작된다. 알림 71 발송(after-commit). 결제 facade 진입은 F03-13.
- **AC-W2-2 (S2-2b). 선입금 + 자동 승인**: Given `prepaymentRequired=true`, `approvalRequired=false`. When 참가자가 `POST .../apply`. Then 즉시 `Application=APPROVED_PENDING_PAYMENT + paymentDueAt`, 물리 attendance 전이 전에도 논리 hold는 점유한다. 결제 후에만 ATTENDING.
- **AC-W2-3 (S2-5). 결제 기한 만료**: Given `APPROVED_PENDING_PAYMENT + paymentDueAt < now()`. When `ApplicationPaymentExpiryScheduler` 실행. Then `Application=PAYMENT_EXPIRED`로 논리 hold가 해제되고 결정 이력과 만료 알림 75가 같은 트랜잭션에 남는다. 확인 대기 계좌이체 신고가 있는 신청은 만료하지 않는다.
- **AC-W2-4 (S2-6). 사용자 자가 취소 (WALLET PAID) — `cancelMyParticipation`**: Given `event_payment.PAID(WALLET)`. When `DELETE /api/v1/events/{eventId}/apply`. Then facade가 `refundByWallet` 호출 → `Application=CANCELED + capacity-- + event_payment.REFUNDED + 분개 1건`. 알림 76. (환불 facade 자체는 F03-13에서 검증)
- **AC-W2-5 (S2-7). 사용자 자가 취소 (BANK PAID)**: Given `event_payment.PAID(BANK_TRANSFER)`. When 동일 호출. Then `event_payment.REFUND_REQUESTED + Application 유지`. 알림 83.
- **AC-W2-6 (S2-11). 탈퇴 차단**: Given active `event_payment` 보유. When 탈퇴 요청. Then 400 `DEACTIVATION_BLOCKED` + `ACTIVE_EVENT_PAYMENT` BlockingItem.
