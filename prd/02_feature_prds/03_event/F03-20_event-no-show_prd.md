# F03-20. 이벤트 노쇼 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- 작성일: 2026-06-05 -->
<!-- 갱신: 2026-06-06: cohost 권한 버그(G-6) 해소, 소명 기한 7일(G-3) 해소, 앱 소명/번복/일괄 배선(G-1) 해소 -->
<!-- 갱신: 2026-07-08 (게스트 동반 예매 반영): 계정 없는 게스트 노쇼는 attendance row 기준으로 남기되 소유자(owner_user_id)의 최근 노쇼/제재 신호에 합산한다. -->
<!-- 소스 기준 갱신: 2026-07-29 community_api/community_app current source -->

## 2026-10-29 현재 계약 대조

### 사후 조정 결과는 참가자에게 알립니다

노쇼 소명은 확정 뒤 7일 안에 해당 모임에서 제출한다. 통합 분쟁 접수로 자동 연결하지 않는다. 사후 조정 환불이 확정되면 금액 0원인 경우도 참가자에게 결과 알림(183)을 보낸다. 환불 알림의 발송·실기기 수신과 지갑 잔액 갱신은 각각 확인한다.

기존 설계 중 이 규칙과 다른 서술은 아래 현재 계약을 기준으로 정정한다. 운영·실기기 완료 판정은 [현재 출시 상태표](../../../docs/qa/launch-status.html)를 따른다.

## 1. 결론

이벤트 노쇼 관리는 서버에 **노쇼 5 endpoint, 사후 조정 환불 2 endpoint, 상태기계와 제재 카운트 연계**가 구현돼 있다. Flutter에도 노쇼 5 endpoint의 API/repository 정의가 모두 있다. 다만 실제 UI 소유 위치는 나뉜다. 참석자 목록의 `NoShowManageSection`은 **일괄 확정과 번복만** 제공하고, 단일 확정은 `DisputeCaseDetailScreen`의 호스트 액션 시트가 `targetUserId`를 보내는 경로다. 참가자 소명 CTA는 참석자 목록의 `_MyNoShowNotice`가 통합 분쟁 이의제기 화면으로 연결한다.

`NoShowStatus`는 CONFIRMED/APPEALED/OVERTURNED 3값이다. **서버 소명 기한은 확정 후 7일**이며(`confirmedAt + 7일`을 지난 경우 `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED`(409, 400036)), 뒤집기 성공 시 OVERTURNED가 제재 카운트에서 빠진다. 그러나 Flutter의 `_MyNoShowNotice`는 CONFIRMED이면 확정시각과 관계없이 CTA를 계속 표시하므로, 기한 초과 사용자는 이의제기 화면까지 들어간 뒤 제출 시 서버에서 거절된다(G-12). 회원 노쇼를 뒤집을 때는 `method=NOSHOW_OVERTURN`인 정정 `EventCheckIn`을 같은 트랜잭션에서 멱등 생성한다. 따라서 노쇼 카운트뿐 아니라 체크인 기반 공동참석 증거·핏 미리보기·재방문 배지 집계에도 다시 포함된다. 게스트는 계정 주체가 없어 정정 체크인을 만들지 않는다.

`CANCEL_PENDING_REFUND` 제외는 **일괄 확정과 체크인 통계**에 적용된다. 단일 `confirm`은 ATTENDING·미체크인만 검사하며 application 상태를 별도로 보지 않는다(G-8). 서버와 앱 모두 “이벤트 종료 후”라는 UX 문구를 사용하지만 confirm/confirmBatch 자체에는 종료시각 검사가 없다(G-9).

노쇼 사후 조정 환불의 상한은 유료 포인트만이 아니라 원 결제의 `amount`(**paid+free 총액**)에서 동일 원결제에 대해 이미 완료된 일반/선결제 환불 누계를 뺀 잔액이다. 요청액은 원 결제의 paid/free 비율로 분리되고 `EventRefundSettlementService.applyRefundToSettlement`를 통해 정산 상태별 claw-back을 적용한다. 0원도 유효하며 이때 지갑·정산 변동 없이 기록만 만든다. 반면 이 서비스는 대상 application에 대응하는 `event_no_show` row의 존재·상태를 전혀 검증하지 않고(G-14), 공동호스트는 `canHandleRefundIssue` 없이도 공동호스트 row 존재만으로 환불할 수 있다(G-15).

노쇼 확정·일괄·번복의 과거 cohost 권한 버그(G-6)는 해소됐다. 체크인과 노쇼가 `EventAttendanceManagerGuard`를 공유해 `canManageAttendance=false` 공동호스트를 `EVENT_CO_HOST_PERMISSION_DENIED`로 차단한다. **이 해소는 사후 환불에는 적용되지 않는다.** `NoShowRefundService`는 `EventCoHost.canHandleRefundIssue`를 읽지 않고 `existsByEventIdAndUserId`만 검사한다.

게스트는 자체 계정이 없으므로 서버가 소명/제재의 주체를 `partyOwnerUserId`(회원=`userId`, 게스트=`ownerUserId`)로 본다. 노쇼 row는 attendance를 기준으로 식별하고 `countRecentNoShows`와 제재·신뢰 신호는 owner에게 합산한다. 다만 Flutter의 본인 CTA 선택은 여전히 `row.userId == currentUserId`라 소유 게스트 row를 고르지 못하고, 단일 확정 UI도 `attendanceId`가 아니라 `targetUserId`만 보내므로 게스트 단일 확정 동선이 없다(G-10).

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventNoShowController`, `RefundPolicyController`, `EventNoShowService`, `EventAttendanceManagerGuard`, `NoShowStatus`, `EventNoShow`, `EventCheckIn`, `NoShowConfirmParam`, `NoShowAppealParam`, `NoShowOverturnParam`. 앱: `attendee_list_screen.dart`, `dispute_case_detail_screen.dart`, `no_show_refund_screen.dart`, `event_no_show_api.dart`, `event_no_show_vo.dart`, `no_show_confirm_param.dart`, `no_show_manage_section.dart`, `no_show_overturn_sheet.dart`, `host_action_bar.dart`, `routes.dart`.

## 3. 전체 동작 흐름

### 3-1. 호스트가 노쇼 확정하는 흐름

1. 현재 Flutter의 **단일 확정 UI**는 참석자 목록이 아니라 `DisputeCaseDetailScreen._openHostActionSheet`다. 호스트가 사유 `NO_SHOW`를 고르면 해당 케이스의 `eventId`와 `targetUserId`를 사용한다.
2. 앱이 `event_no_show_api.dart`의 `confirm(eventId, NoShowConfirmParam)`을 호출한다. 현재 호출부는 `userId=targetUserId`만 보내며 `attendanceId`를 보내는 UI 호출부는 없다.
3. `POST /api/v1/events/{eventId}/no-shows`로 `NoShowConfirmParam(userId?, attendanceId?, reasonCode?, reasonText?, evidenceFileIds?, evidenceVisibility?)`이 전달된다. 두 식별자는 DTO에서 모두 nullable이지만 서비스가 **최소 하나**를 요구한다. 둘 다 있으면 `attendanceId`가 우선하며 상호배타 검증은 없다.
4. `attendanceId` 경로는 attendance가 path event에 속하는지, ATTENDING인지, 체크인되지 않았는지 검사한다. 회원 attendance면 userId 경로로 위임하고 게스트면 `attendance_id`로 멱등 처리한다. userId 경로는 `(event_id, user_id)`로 멱등 처리한다.
5. row가 없으면 `status=CONFIRMED`, `confirmed_by_user_id=actorUserId`를 저장한다. `confirmed_by_role`은 실제 분기에 따라 호스트=`EVENT_HOST`, 권한 있는 공동호스트·클럽 운영진=`ADMIN`, actorUserId 0=`SYSTEM`이다.
6. `evidenceFileIds` 또는 `reasonText`가 있으면 `ModerationActionLogger`가 NO_SHOW_CONFIRM audit을 별도 트랜잭션으로 기록한다(실패 시 노쇼 확정 트랜잭션에 영향 없음).
7. `EventNoShowVo`를 반환한다.

`NoShowManageSection`에는 개별 미확정 attendance를 선택하는 UI가 없고 **일괄 확정과 기존 row 번복만** 있다. 따라서 UI/UX spec의 “참석자 목록에서 한 명씩 노쇼 확정/게스트 long-press”는 current source에 없다.

### 3-2. 일괄 노쇼 확정 흐름 (앱 배선됨)

1. 호스트가 "일괄 노쇼 확정" 버튼을 누른다(`NoShowManageSection`, host/coHost/staff — 2026-06-06 배선 완료).
2. `POST /api/v1/events/{eventId}/no-shows/batch`를 body 없이 호출한다.
3. 서버 `confirmBatch`가 `ATTENDING && !checked-in && !CANCEL_PENDING_REFUND` 조건으로 회원과 게스트 attendance row를 선별한다. 환불 대기는 party owner 기준으로 게스트까지 함께 제외한다.
4. 기존 회원 userId/게스트 attendanceId 노쇼 집합을 먼저 읽고, 없는 대상만 직접 저장한다.
5. `List<EventNoShowVo>`를 반환한다.

### 3-3. 참가자가 소명하는 흐름 (앱 배선됨)

1. 참석자 목록의 `_MyNoShowNotice`는 조회된 row 중 `row.userId == currentUserId`인 회원 row 하나를 선택한다. status가 CONFIRMED이면 **confirmedAt과 무관하게 항상** “소명할게요” CTA를 표시한다. 소유 게스트 row는 서버에서 반환돼도 이 선택에서 빠진다.
2. CTA는 직접 no-show appeal endpoint가 아니라 `Routes.myDisputeAppealFor('EVENT_NO_SHOW:{noShowId}')`의 통합 분쟁 화면으로 이동해 `POST /api/v1/me/dispute-cases/{caseId}/appeals`를 호출한다.
3. `DisputeAppealService`가 통합 appeal row를 저장하기 전에 canonical caseId, `partyOwnerUserId == 본인`, 현재 status, `confirmedAt + 7일`을 `EventNoShowService.validateAppealable`로 검사한다. 회원 row는 본인, 게스트 row는 예매 소유자가 권리 주체다.
4. 기한이 지났으면 `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED(409)`, APPEALED면 `EVENT_NO_SHOW_ALREADY_APPEALED(409)`, OVERTURNED면 `EVENT_NO_SHOW_ALREADY_OVERTURNED(409)`로 거부된다.
5. 사전 검증을 통과하면 통합 `dispute_appeal`을 저장하고, 별도 트랜잭션의 best-effort sync가 `EventNoShowService.appeal`을 호출해 status=APPEALED, `appeal_case_id`, `appealed_at`을 기록한다.
6. `POST /api/v1/events/{eventId}/no-shows/{noShowId}/appeal`과 `NoShowAppealParam`도 직접 폴백 경로로 남아 있다. 이 controller는 path `eventId`를 service로 전달하지 않는다.

### 3-4. 호스트/CS가 결정을 뒤집는 흐름 (앱 배선됨)

1. `POST /api/v1/events/{eventId}/no-shows/{noShowId}/overturn`으로 `NoShowOverturnParam(reason)`을 전달한다.
2. 서버가 호스트/cohost/클럽 운영진 또는 SYSTEM(id=0) 여부를 확인한다.
3. status가 OVERTURNED이면 `EVENT_NO_SHOW_ALREADY_OVERTURNED(409)`.
4. 그 외 상태(CONFIRMED 또는 APPEALED)에서 OVERTURNED로 전이하고 `overturned_reason`, `overturned_at`을 기록한다.
5. 회원 row에 기존 체크인이 없으면 `EventCheckIn(eventId,userId,attendanceId,method=NOSHOW_OVERTURN,manualActorId)`을 생성한다. SYSTEM(id=0)이면 manualActorId는 null이며, 게스트 row 또는 기존 체크인이 있으면 생성하지 않는다.
6. `countRecentNoShows`에서 OVERTURNED row는 제외되고, 회원은 정정 체크인 덕분에 체크인 증거 집계에 복권된다.

### 3-5. 호스트가 노쇼 사후 조정 환불하는 흐름

1. current Flutter에서 `NoShowRefundScreen`을 여는 유일한 호출부는 `DisputeCaseDetailScreen._openNoShowRefund`다. 참석자 목록 long-press 호출부는 없다.
2. 호출부는 detail source가 APPLICATION/ATTENDANCE/CHECK_IN일 때 `detail.sourceId`를 applicationId로 그대로 사용한다. ATTENDANCE/CHECK_IN id를 application id로 변환하는 조회는 없다. 또한 `hostNoShowRefundFor`의 `paidAmount`를 넘기지 않아 기본값 **0**으로 진입한다.
3. 화면은 원 결제 조회나 기존 환불 GET을 호출하지 않는다. “원 결제액 정보 없음 (0원 또는 무료 모임)”을 표시하며, `originalPaidAmount=0`일 때 클라이언트 초과 상한도 동작하지 않는다. 서버 상한만 최종 방어다.
4. `POST /api/v1/events/{eventId}/applications/{applicationId}/no-show-refund`로 `NoShowRefundParam(refundAmount, reasonCode, reasonText?, evidenceVisibility?, evidenceFileIds?, releaseTicket?)`을 전달한다.
5. 서버는 event를 조회하고 application row를 비관락한 뒤 application.eventId와 path eventId 일치를 확인한다. 권한은 host, **존재만 확인한 모든 cohost**, 클럽 OWNER/EVENT_REFUND_MANAGER다.
6. 같은 application의 `no_show_refund` 존재 여부를 lock 아래 검사한다. DB UNIQUE는 없지만 application lock으로 동시 요청을 직렬화한다.
7. 서버는 legacy `EVENT_PAYMENT` 또는 application 기반 `EVENT_PREPAYMENT`의 원 PointTransaction을 찾는다. `grossPaid=payTx.amount`(paid+free 총액)이고, 완료된 `EVENT_REFUND/eventId` 및 선결제면 `EVENT_PREPAYMENT_REFUND/prepaymentId` 누계를 차감한다. `refundAmount > grossPaid - alreadyRefunded`이면 거부한다.
8. 양수 환불은 `paidRefund=floor(refundAmount × originalPaid / (originalPaid+originalFree))`, `freeRefund=refundAmount-paidRefund`로 분리한다. 지갑·원장·lot 복구 후 `applyRefundToSettlement`로 정산 후처리한다. **0원은 허용**하며 돈·정산 경로 없이 기록만 만든다.
9. `releaseTicket=true`면 ticket release를 best-effort 수행한다. `"HOST_ACTION_REVIEW-{UUID}"` 문자열을 `dispute_case_id`에 기록하지만 별도 통합 dispute case row를 생성하지는 않는다.
10. 이 흐름은 `EventNoShowRepository`를 의존하지 않아 대상 application의 노쇼 row 존재/상태를 검증하지 않는다. 참가자 알림이나 notification outbox 호출도 없다.
11. `NoShowRefundVo`를 201로 반환한다.

## 4. 제품 규칙

### 확정
- 개최된 모임만 확정한다. OPEN·CLOSED 이고 시작 시각이 지나야 하며, 아니면 `EVENT_NO_SHOW_NOT_ALLOWED` 다. 권한 없는 사람에게 개최 여부를 먼저 알리지 않는다.
- 한 건 확정은 회원 번호나 참석 행 번호 중 하나가 필요하고, 둘 다 오면 참석 행 번호를 쓴다. 사유 글은 500자, 증빙은 5개까지다.
- 참가자는 본인과 자기가 데려온 게스트의 노쇼만 본다. 운영자는 전체를 본다.

### 상태 전이
| 지금 | 다음 | 조건 |
|---|---|---|
| 없음 | `CONFIRMED` | 호스트, 출석 권한 공동호스트, 클럽 운영진 |
| `CONFIRMED` | `APPEALED` | 소명 주체가 확정 뒤 7일 안에 |
| `CONFIRMED`·`APPEALED` | `OVERTURNED` | 호스트, 출석 권한 공동호스트, 클럽 운영진 또는 시스템. 사유 필수 |
| `OVERTURNED` | 없음 | 끝. 제재 셈에서 빠짐 |

- 번복 입구에서 상세나 출석 권한이 없으면 없는 노쇼와 같은 답이다(`EVENT_NO_SHOW_NOT_FOUND`).
- 번복의 정정 체크인은 회원에게만 만들고, 이미 체크인이 있으면 새로 만들지 않는다. 게스트는 대상이 아니다.

### 사후 조정 환불
- 실제 노쇼에게만 받고 신청 한 건에 한 번이다. 호스트가 넣은 금액을 쓰는 수동 조정이라 귀책 환불 정책을 타지 않는다.
- 금액은 비우거나 음수면 거절하고 0은 받는다. 사유 코드는 필수다.
- 증빙은 집행자 본인이 올린 업로드 완료 파일, 증빙 용도, 5개까지다. 어기면 환불 자체를 거절한다.
- 증빙 공개 범위는 `PARTIES`(기본, 당사자), `HOST_ONLY`, `ALL`(분쟁 때 운영자도)이다.
- 권한은 호스트, 공동호스트, 클럽 OWNER·환불 담당이다.

### 오류의 뜻
| 코드 | 뜻 |
|---|---|
| `EVENT_NO_SHOW_ALREADY_APPEALED` | 이미 소명함 |
| `EVENT_NO_SHOW_ALREADY_OVERTURNED` | 이미 번복됨 |
| `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED` | 소명 기한 7일 지남 |
| `EVENT_CO_HOST_PERMISSION_DENIED` | 공동호스트지만 출석 권한 없음 |
| `NO_SHOW_REFUND_DUPLICATE` | 이미 조정 환불함 |
| `NO_SHOW_REFUND_EXCEEDS_PAID` | 원결제 총액에서 받은 환불을 뺀 잔액 초과 |

## 6. 상태/권한 매트릭스

| 행위자/상태 | 서버 근거 | 앱 분기 | 결과 | 판단 |
|---|---|---|---|---|
| host — 회원 단일 확정 | UNIQUE(event_id, user_id) 멱등 | DisputeCaseDetail 호스트 액션 시트가 userId로 confirm | row 생성 또는 기존 반환 | 부분 배선 |
| host — 게스트 단일 확정 | attendanceId 멱등 | attendanceId를 보내는 UI caller 없음 | API/model만 존재 | Gap |
| host — 일괄 확정 | ATTENDING && !checked-in && !CANCEL_PENDING_REFUND | confirmBatch() 배선 | 서버·앱 완성 | 해소 |
| 참가자 — 소명 | partyOwnerUserId == 본인, confirmedAt+7일 이내 | 회원 row만 통합 appeal CTA | 회원만 배선, owner guest 누락 | Gap G-10 |
| host/CS — 뒤집기 | 호스트·cohost(flag)·클럽 운영진·SYSTEM | overturn() 배선 | 서버·앱 완성 | 해소 |
| CONFIRMED → APPEALED | party owner만, 7일 이내 | `_MyNoShowNotice` → 통합 dispute appeal | 서버 전이 + 회원 앱 진입 | 부분 일치 |
| APPEALED → OVERTURNED | 호스트/CS | NoShowManageSection 번복 UI | 서버 전이 + 앱 진입 | 해소 |
| 회원 OVERTURNED | 기존 체크인 없으면 `NOSHOW_OVERTURN` 정정 행 생성 | 번복 성공 토스트 후 목록 갱신 | 제재·체크인 증거 모두 복권 | 일치 |
| 게스트 OVERTURNED | 계정 기반 증거 집계 대상이 아니므로 정정 체크인 미생성 | 게스트로 표시·번복 가능 | 소유자 노쇼 카운트에서만 제외 | 일치 |
| OVERTURNED → * | 차단 409 | — | 409 반환 | — |
| 기한 초과 소명 (confirmedAt+7일 경과) | `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED(409)` | CONFIRMED이면 CTA 계속 노출, 제출 후 에러 | 서버 차단·앱 사전 게이트 없음 | Gap G-12 |
| CANCEL_PENDING_REFUND 참가자 일괄 확정 | batch 대상 제외 | confirmBatch() 배선 | batch에서 자동 제외 | 일치 |
| CANCEL_PENDING_REFUND 참가자 단일 확정 | application 상태 미검사 | 단일 confirm 호출 가능 | 노쇼 row 생성 가능 | Gap G-8 |
| 이벤트 종료 전 확정 | 종료시각 미검사 | 관리자 UI 버튼도 상태별 숨김 없음 | 노쇼 row 생성 가능 | Gap G-9 |
| 제재 카운트 — OVERTURNED | countRecentNoShows에서 제외 | 앱에서 직접 사용 안함 | 서버 정확 | 일치 |
| 노쇼 환불 — POST | host·모든 cohost·club refund manager, no-show row 미검증 | detail caller만, paidAmount=0 | 동작하지만 권한·대상·진입 데이터 Gap | G-14/G-15/G-16 |
| 노쇼 환불 — 0원 | service가 허용, 기록만 생성 | form도 허용 | money side effect 없이 row 생성 | source 일치/spec 불일치 |
| 노쇼 환불 — GET | 전역 인증만, eventId/principal/소유권 미검증 | 미배선 | 이력 UI 없음 + IDOR 후보 | G-2/G-13 |
| cohost (canManageAttendance=false) 확정 | `EventAttendanceManagerGuard` → `EVENT_CO_HOST_PERMISSION_DENIED` | — | 권한 없는 cohost 차단 | 해소 |
| cohost (canHandleRefundIssue=false) 환불 | cohost 존재만 확인 | detail permission도 cohost를 전면 허용 | 금전 변경 가능 | Gap G-15 |
| 환불 후 참가자 알림 | 호출 없음 | 화면 문구만 존재 | 알림 미발송 | Gap G-17 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| NoShowStatus 3값 | CONFIRMED/APPEALED/OVERTURNED | Dart enum 3값 mirror | 일치 |
| confirmedByRole 타입 | WarningActorRole enum 직렬화 | String? (silent null 위험) | 약한 타입 (G-7) |
| NoShowConfirmReasonCode | 서버 String 자유값 | 클라 3값 enum (UI 목적) | wire 계약 없음, 기능상 무방 |
| NoShowRefundReasonCode | 서버 String 자유값 | 클라 4값 enum | wire 계약 없음 (G-5) |
| 소명/뒤집기/일괄 | 서버 구현 완료 | 회원 소명·일괄·번복 UI 배선 | 게스트 소명만 G-10 |
| no-show-refund POST | endpoint와 money path 구현 | 화면 배선, caller/금액 데이터 불완전 | 부분 일치(G-14~16) |
| no-show-refund GET | endpoint 존재, 객체 권한 미검사 | API/화면 없음 | G-2/G-13 |
| 소명 기한 | 서버 구현(confirmedAt+7일, 400036) | CTA는 status만 검사해 항상 노출 | Gap G-12 |
| cohost attendance 범위 | `EventAttendanceManagerGuard` 검사 | canManageAttendance로 섹션 gate | 일치 |
| cohost refund 범위 | `canHandleRefundIssue` 미검사 | dispute permission도 모든 cohost 허용 | Gap G-15 |
| 뒤집기 후 출석 증거 | 회원만 멱등 정정 체크인 생성 | 성공 후 목록 재조회 | 일치 |
| 게스트 owner 소명 | 서버는 `partyOwnerUserId` 허용 | `_MyNoShowNotice`가 회원 userId만 선택 | Gap G-10 |
| appeal/overturn의 eventId path | Controller가 eventId를 service에 전달하지 않고 noShowId만 사용 | 앱은 일치하는 eventId 사용 | 서버 path-row 정합 검증 없음(G-11) |
| 환불 GET 객체 권한 | eventId/principal 미사용, applicationId 단독 조회 | API 미정의 | IDOR/BOLA 후보(G-13) |
| 환불 대상 노쇼성 | application/event만 검증 | noShowId를 전달하지 않음 | 노쇼 row 없는 신청도 처리 가능(G-14) |
| 환불 상한 | paid+free gross - 완료된 기존 환불 | paidAmount query 기본 0, 원결제 조회 없음 | 서버만 authoritative(G-16) |
| 환불 알림 | notification 호출 없음 | 안내 문구만 있음 | spec/문구와 불일치(G-17) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | **G-2. 노쇼 환불 GET 앱 미배선** | Flutter `DisputeCaseApi`에는 POST만 있고 GET 정의/조회 화면이 없다. | 호스트가 기존 제출 내역을 확인하지 못하고 중복 제출 후 409를 받아야 안다. | G-13의 서버 권한 문제를 먼저 고친 뒤 기존 이력 조회를 배선. |
| P2 | **G-4. 두 appeal 기록의 best-effort 동기화** | 통합 경로는 canonical caseId로 `dispute_appeal`을 먼저 저장한 뒤 REQUIRES_NEW에서 `event_no_show`를 APPEALED로 sync한다. 사전 검증은 공유하지만 sync 실패는 공식 appeal row를 롤백하지 않는다. | 드문 sync 실패 시 `dispute_appeal=PENDING`인데 `event_no_show=CONFIRMED`인 불일치가 가능하다. | 재시도/outbox 또는 reconciliation을 F18-03에서 소유. |
| P2 | **G-5. NoShowRefundReasonCode wire 계약 없음** | 서버 `reasonCode`는 free String. 클라 4값 enum과 공식 매핑 없음. | 향후 서버에서 `reasonCode` 기반 필터링/보고 시 클라 값과 불일치 가능. | 서버에 `NoShowRefundReasonCode` enum 정의 및 검증 추가. |
| P2 | **G-7. confirmedByRole String? 역직렬화** | Dart `EventNoShowVo.confirmedByRole`가 `String?`인데, 서버는 `WarningActorRole` enum 직렬화. | 오타/미지원 값 수신 시 silent null. UI에서 actor role 표시 오류 가능. | Dart enum으로 타입 강화 또는 fallback 처리 명시. |
| P1 | **G-8. 단일 confirm의 CANCEL_PENDING_REFUND 제외 누락** | `confirmBatch`는 owner application의 환불대기를 제외하지만 `confirm`은 ATTENDING·미체크인만 검사한다. | 동일 참가자가 일괄에서는 제외되지만 단일 확정으로는 노쇼 처리될 수 있다. | 단일 confirm에도 batch와 같은 application 상태 가드 공유. |
| P1 | **G-9. 이벤트 종료 전 노쇼 확정 가능** | 서비스에 event.endTime/status 검사가 없고 관리자 UI의 일괄 버튼도 이벤트 상태로 숨기지 않는다. | 시작 전·진행 중 참가자를 확정할 수 있다. | 서버 종료시각 가드를 단일/일괄 공통 적용하고 UI도 capability로 게이트. |
| P2 | **G-10. 소유 게스트 소명 CTA 미노출** | 서버 GET/appeal은 owner 귀속을 지원하지만 `_MyNoShowNotice`는 `row.userId == currentUserId`만 선택한다. | 예매자가 본인 게스트 노쇼를 앱에서 소명할 수 없다. | ownerUserId가 본인인 게스트 row 목록과 대상명을 소명 UI에 노출. |
| P2 | **G-11. appeal/overturn path eventId 미검증** | Controller가 path의 eventId를 service에 전달하지 않고, service는 noShowId의 실제 eventId만 사용한다. | 잘못된 이벤트 path로도 다른 이벤트 row가 처리되어 URL 자원 의미·감사 추적이 어긋난다(실제 row 기준 권한 검사는 수행됨). | service에 eventId를 전달해 row.eventId 일치 검증. |
| P2 | **G-12. 7일 경과 후에도 소명 CTA 상시 노출** | `_MyNoShowNotice`는 CONFIRMED 여부만 보고 `canAppeal=true`; confirmedAt/deadline을 계산하지 않는다. | 사용자가 긴 폼을 작성한 뒤 제출 시에야 409를 받아 불필요한 실패 경험이 생긴다. | 서버가 `appealDeadlineAt/canAppeal`을 내려주거나 앱이 confirmedAt+7일을 표시·gate하고 서버 에러를 구체 안내. |
| P1 Security | **G-13. no-show-refund GET IDOR/BOLA 후보** | controller는 principal을 받지 않고 eventId를 무시하며 service가 applicationId만 조회한다. endpoint 자체는 전역 security로 인증만 요구한다. | 인증 사용자가 추측/획득한 applicationId로 타 이벤트 환불 금액·사유·당사자 ID를 조회할 수 있다. | GET에도 actorUserId 전달, row.eventId==path eventId와 host/cohost(scope)/club manager 또는 applicant 본인 정책을 명시·검증. |
| P1 | **G-14. 환불 대상이 실제 노쇼인지 미검증** | `NoShowRefundService`는 `EventNoShowRepository`를 의존하지 않고 application/event만 검증한다. | 노쇼 row가 전혀 없는 신청도 처리할 수 있고, CONFIRMED/APPEALED/OVERTURNED 중 어떤 상태를 환불 대상으로 허용할지 정책이 강제되지 않는다. | applicationId에 연결된 EventNoShow 존재와 허용 상태 정책을 명시하고 lock 아래 검증. |
| P1 Security | **G-15. 환불 cohost scoped permission 미검사** | `EventCoHost`에 `canHandleRefundIssue`가 있지만 service는 `existsByEventIdAndUserId`만 검사한다. `DisputeSourceResolver`와 `EventViewerContextService`의 `canHandleRefundIssue`도 모든 cohost를 허용해 상세 버튼·route guard가 같은 넓은 권한을 mirror한다. | 환불 권한을 받지 않은 공동호스트가 금전 변경·정산 claw-back을 실행할 수 있다. | EventCoHost row를 조회해 `canHandleRefundIssue=true`를 강제하고 route/detail permission도 같은 기준으로 통일. |
| P1 | **G-16. 환불 화면 진입·식별자·결제액 데이터 불완전** | 유일 caller는 분쟁 상세. attendee long-press가 없고, ATTENDANCE/CHECK_IN sourceId를 applicationId로 그대로 쓰며, paidAmount를 생략해 항상 0으로 진입한다. GET application/payment도 없다. | 잘못된 applicationId로 404 또는 타 신청 처리 시도, client 상한·원 결제 표시 무력화, spec 진입로 부재. | 서버가 case detail에 canonical applicationId와 refundable gross/remaining을 제공하거나 전용 preview/read endpoint를 권한 있게 추가하고 attendee row CTA를 배선. |
| P2 | **G-17. 환불 알림·실제 dispute case 부작용 부재** | `NoShowRefundService`는 UUID 문자열만 row에 기록하며 notification/outbox나 통합 dispute case row를 만들지 않는다. Flutter도 성공 toast/pop만 한다. UI spec과 화면 문구는 참가자 알림·자동 dispute 등록을 약속한다. | 참가자가 환불 사실을 즉시 알지 못하고 운영자가 해당 ID로 통합 케이스를 조회할 수 없다. | 정책에 맞는 notification outbox와 조회 가능한 dispute source/case를 같은 트랜잭션 또는 신뢰 가능한 outbox로 생성하고 문구를 정합화. |

## 9. 수용 기준

### AC-01. 단일 노쇼 확정 멱등성

Given 호스트가 동일 (event_id, user_id) 쌍에 대해 confirm을 두 번 호출한다.
When 서버가 두 요청을 처리한다.
Then 두 번째 요청은 기존 row를 그대로 반환하고 새 row를 생성하지 않는다(UNIQUE KEY 보장).

### AC-02. CANCEL_PENDING_REFUND 노쇼 제외

Given 참가자 A가 `CANCEL_PENDING_REFUND` 상태이고, 이벤트에 체크인하지 않았다.
When 호스트가 일괄 노쇼 확정을 실행한다.
Then 참가자 A는 노쇼 확정 대상에서 제외된다.

### AC-03. CONFIRMED → APPEALED 전이

Given 참가자가 본인의 `CONFIRMED` 노쇼 row에 대해 유효한 `appealCaseId`로 소명한다.
When `POST .../no-shows/{noShowId}/appeal`이 성공한다.
Then row.status=APPEALED, `appeal_case_id`와 `appealed_at`이 기록된다.

### AC-04. OVERTURNED 제재 카운트 제외

Given 참가자의 노쇼 row가 OVERTURNED로 전이됐다.
When `countRecentNoShows(userId, withinDays)`를 호출한다.
Then OVERTURNED row는 집계에서 제외된다.

### AC-05. 재소명 차단

Given 참가자의 row가 이미 APPEALED 상태이다.
When 다시 소명을 시도한다.
Then `EVENT_NO_SHOW_ALREADY_APPEALED(409)`가 반환된다.

### AC-06. OVERTURNED 재전이 차단

Given row가 이미 OVERTURNED이다.
When overturn을 다시 시도한다.
Then `EVENT_NO_SHOW_ALREADY_OVERTURNED(409)`가 반환된다.

### AC-07. 노쇼 사후 조정 환불 — 범위 초과 차단

Given paid+free 원결제 총액이 10,000원이고 완료된 기존 환불이 7,000원인 참가자에 대해 `refundAmount=5000`을 입력한다.
When `POST .../no-show-refund`가 호출된다.
Then `NO_SHOW_REFUND_EXCEEDS_PAID(400)`이 반환된다.

### AC-08. 노쇼 환불 중복 차단

Given 동일 applicationId에 대한 no-show-refund row가 이미 존재한다.
When 다시 `POST .../no-show-refund`를 호출한다.
Then `NO_SHOW_REFUND_DUPLICATE(409)`가 반환된다.

### AC-09. 번복 시 회원 출석 증거 복권

Given 체크인 행이 없는 회원 노쇼가 CONFIRMED 또는 APPEALED 상태이다.
When 권한자가 overturn을 성공시킨다.
Then OVERTURNED 전이와 같은 트랜잭션에서 `method=NOSHOW_OVERTURN` 정정 체크인이 한 번만 생성되고, actor가 SYSTEM이면 `manualActorId=null`이다. 게스트 또는 기존 체크인이 있으면 새 행은 생성되지 않는다.

### AC-10. 확정 actor role 기록

Given 각각 event host, `canManageAttendance=true` 공동호스트, 내부 SYSTEM(0)이 같은 조건의 노쇼를 확정한다.
When 노쇼 row가 생성된다.
Then `confirmedByRole`은 각각 EVENT_HOST, ADMIN, SYSTEM으로 기록된다.

### AC-11. 0원 사후 조정 기록

Given 유효한 사유 코드와 `refundAmount=0`인 요청이다.
When 권한자가 no-show-refund를 생성한다.
Then wallet·PointTransaction·PaymentRecord·정산 helper 호출 없이 `no_show_refund(refund_amount=0)` row와 응답만 생성된다.

### AC-12. mixed paid/free 환불 분할

Given 원 결제가 paid 5,000 + free 5,000이고 기존 환불 누계가 없으며 요청액이 6,000원이다.
When no-show-refund가 성공한다.
Then paidRefund=3,000, freeRefund=3,000으로 지갑·lot·정산 helper에 동일하게 전달된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | G-2/G-13 노쇼 환불 GET | 먼저 eventId+principal 객체 권한을 강제한 뒤 NoShowRefundScreen에 기존 이력 조회를 배선. |
| 서버 | G-5 reasonCode enum 화 | 서버에 `NoShowRefundReasonCode` enum 도입 여부 결정. |
| 서버 | G-8/G-9 확정 공통 가드 | 단일·일괄에 환불대기 제외와 종료시각 검사를 같은 helper로 적용. |
| 앱 | G-10/G-12 소명 CTA | ownerUserId 기준 게스트 노쇼 대상 UI와 7일 deadline 표시/게이트 추가. |
| 서버 | G-11 path-row 정합 | appeal/overturn에 eventId 전달 후 row.eventId 비교. |
| 서버 | G-14/G-15 환불 불변식·권한 | no-show row와 applicationId를 결박해 허용 상태를 검증하고 cohost `canHandleRefundIssue`를 강제. |
| 앱/API | G-16 환불 진입 데이터 | canonical applicationId와 refundable remaining을 권한 있는 조회/preview로 제공하고 참석자 목록 진입을 배선. |
| 서버/알림 | G-17 후속 부작용 | 참가자 notification outbox와 조회 가능한 dispute case/source를 구현하거나 현재 화면·spec의 약속을 제거. |
| 테스트 | 멱등성 검증 | 동일 (event_id, user_id) 이중 confirm 동시성 테스트. |
| 테스트 | 배치 필터 검증 | CANCEL_PENDING_REFUND 사용자가 batch에서 제외되는지 확인. |
| cross-ref | 분쟁 소명 연계 | 소명 흐름(APPEALED 상태)은 통합 분쟁 유니온 EVENT_NO_SHOW source인 `../18_dispute_resolution/F18-03_dispute-appeal_prd.md`에서 상세 다룸. |
| cross-ref | 환불 정책 | 노쇼 사후 환불은 F03-13 계산기·귀책 매트릭스를 사용하지 않는다(수동 금액 입력 + paid/free gross에서 기존 환불을 뺀 상한 + 원 결제 비율 분리 + 정산 후처리 `applyRefundToSettlement`만 공유). `RefundFaultCategory.NO_SHOW_POST_ADJUSTMENT`는 enum 값으로만 존재. |
