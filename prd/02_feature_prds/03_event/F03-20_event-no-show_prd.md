# F03-20. 이벤트 노쇼 관리 PRD

<!-- 작성일: 2026-06-05 -->
<!-- 소스 기준: community_api 0eae1ed/86356e5/c3f95a1/46c8335, community_app c3bfdc8 -->
<!-- 갱신: 2026-06-06 (W14-S2 — community_api 07bdb38 / community_app 577c9ac 반영): cohost 권한 버그(G-6) 해소, 소명 기한 7일(G-3) 해소, 앱 소명/번복/일괄 배선(G-1) 해소 -->
<!-- 갱신: 2026-07-08 (게스트 동반 예매 반영): 계정 없는 게스트 노쇼는 attendance row 기준으로 남기되 소유자(owner_user_id)의 최근 노쇼/제재 신호에 합산한다. -->
<!-- 소스 기준 갱신: 2026-07-29 community_api/community_app current source -->

## 1. 결론

이벤트 노쇼 관리는 서버에 **노쇼 5 endpoint, 사후 조정 환불 2 endpoint, 상태기계와 제재 카운트 연계**가 구현돼 있다. Flutter에도 노쇼 5 endpoint의 API/repository 정의가 모두 있다. 다만 실제 UI 소유 위치는 나뉜다. 참석자 목록의 `NoShowManageSection`은 **일괄 확정과 번복만** 제공하고, 단일 확정은 `DisputeCaseDetailScreen`의 호스트 액션 시트가 `targetUserId`를 보내는 경로다. 참가자 소명 CTA는 참석자 목록의 `_MyNoShowNotice`가 통합 분쟁 이의제기 화면으로 연결한다.

`NoShowStatus`는 CONFIRMED/APPEALED/OVERTURNED 3값이다. **서버 소명 기한은 확정 후 7일**이며(`confirmedAt + 7일`을 지난 경우 `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED`(409, 400036)), 뒤집기 성공 시 OVERTURNED가 제재 카운트에서 빠진다. 그러나 Flutter의 `_MyNoShowNotice`는 CONFIRMED이면 확정시각과 관계없이 CTA를 계속 표시하므로, 기한 초과 사용자는 이의제기 화면까지 들어간 뒤 제출 시 서버에서 거절된다(G-12). 회원 노쇼를 뒤집을 때는 `method=NOSHOW_OVERTURN`인 정정 `EventCheckIn`을 같은 트랜잭션에서 멱등 생성한다. 따라서 노쇼 카운트뿐 아니라 체크인 기반 공동참석 증거·핏 미리보기·재방문 배지 집계에도 다시 포함된다. 게스트는 계정 주체가 없어 정정 체크인을 만들지 않는다.

`CANCEL_PENDING_REFUND` 제외는 **일괄 확정과 체크인 통계**에 적용된다. 단일 `confirm`은 ATTENDING·미체크인만 검사하며 application 상태를 별도로 보지 않는다(G-8). 서버와 앱 모두 “이벤트 종료 후”라는 UX 문구를 사용하지만 confirm/confirmBatch 자체에는 종료시각 검사가 없다(G-9).

노쇼 사후 조정 환불의 상한은 유료 포인트만이 아니라 원 결제의 `amount`(**paid+free 총액**)에서 동일 원결제에 대해 이미 완료된 일반/선결제 환불 누계를 뺀 잔액이다. 요청액은 원 결제의 paid/free 비율로 분리되고 `EventRefundSettlementService.applyRefundToSettlement`를 통해 정산 상태별 claw-back을 적용한다. 0원도 유효하며 이때 지갑·정산 변동 없이 기록만 만든다. 반면 이 서비스는 대상 application에 대응하는 `event_no_show` row의 존재·상태를 전혀 검증하지 않고(G-14), 공동호스트는 `canHandleRefundIssue` 없이도 공동호스트 row 존재만으로 환불할 수 있다(G-15).

노쇼 확정·일괄·번복의 과거 cohost 권한 버그(G-6)는 해소됐다. 체크인과 노쇼가 `EventAttendanceManagerGuard`를 공유해 `canManageAttendance=false` 공동호스트를 `EVENT_CO_HOST_PERMISSION_DENIED`로 차단한다. **이 해소는 사후 환불에는 적용되지 않는다.** `NoShowRefundService`는 `EventCoHost.canHandleRefundIssue`를 읽지 않고 `existsByEventIdAndUserId`만 검사한다.

게스트는 자체 계정이 없으므로 서버가 소명/제재의 주체를 `partyOwnerUserId`(회원=`userId`, 게스트=`ownerUserId`)로 본다. 노쇼 row는 attendance를 기준으로 식별하고 `countRecentNoShows`와 제재·신뢰 신호는 owner에게 합산한다. 다만 Flutter의 본인 CTA 선택은 여전히 `row.userId == currentUserId`라 소유 게스트 row를 고르지 못하고, 단일 확정 UI도 `attendanceId`가 아니라 `targetUserId`만 보내므로 게스트 단일 확정 동선이 없다(G-10).

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller (노쇼) | `community_api/src/main/java/com/endside/community/capacity/controller/EventNoShowController.java` | 5개 endpoint, `appeal`/`overturn`에서 path eventId 미사용, 응답 타입 |
| Backend Service (노쇼) | `capacity/service/EventNoShowService.java` | 상태 전이 조건, 권한 검증, 멱등성, 게스트 귀속, 번복 정정 체크인, 제재 카운트 |
| Backend Permission | `capacity/service/EventAttendanceManagerGuard.java` | host ∪ cohost(flag) ∪ club attendance manager 권한 단일 진실원 |
| Backend Enum (노쇼) | `capacity/constants/NoShowStatus.java:18-22` | CONFIRMED/APPEALED/OVERTURNED 3값 직접 확인 |
| Backend Model (노쇼) | `capacity/model/EventNoShow.java`, `V1__init.sql`의 `event_no_show` | 회원/게스트 컬럼, user/attendance UNIQUE KEY |
| Backend Check-in | `capacity/model/EventCheckIn.java`, `EventNoShowService.createCorrectionCheckInIfNeeded` | OVERTURNED 회원의 `NOSHOW_OVERTURN` 정정 체크인 |
| Backend Param | `capacity/param/NoShowConfirmParam.java`, `NoShowAppealParam.java`, `NoShowOverturnParam.java` | 필드 목록 |
| Backend Controller (환불) | `payment/refundpolicy/controller/RefundPolicyController.java` | no-show-refund 2 endpoint, GET의 principal/eventId 미사용 |
| Backend Service (환불) | `payment/refundpolicy/service/NoShowRefundService.java` | application lock, 권한, 누적 상한, paid/free 분할, 노쇼 row 미검증, 알림 부작용 부재 |
| Backend Param/VO (환불) | `payment/refundpolicy/param/NoShowRefundParam.java`, `vo/NoShowRefundVo.java` | DTO 필드와 annotation 부재, 실제 service-level 검증 |
| Backend Model (환불) | `payment/refundpolicy/model/NoShowRefund.java`, `V1__init.sql`의 `no_show_refund` | no_show_refund 테이블 컬럼과 applicationId 비고유 인덱스 |
| Backend Enum (환불) | `payment/refundpolicy/constants/RefundFaultCategory.java:38` | NO_SHOW_POST_ADJUSTMENT 값 |
| Backend ApplicationStatus | `event/constants/ApplicationStatus.java:24-36` | CANCEL_PENDING_REFUND 노쇼 제외 |
| Frontend API | `lib/data/api/event_no_show_api.dart` | 서버의 노쇼 endpoint 5개 전부 배선 |
| Frontend Models | `lib/data/models/dispute/event_no_show_vo.dart`, `no_show_confirm_param.dart` | 회원/게스트 VO와 userId/attendanceId 선택 요청 계약 |
| Frontend Attendance UI | `attendee_list_screen.dart`, `no_show_manage_section.dart`, `no_show_overturn_sheet.dart` | 관리자 일괄/번복, 회원 CTA 선택과 기한 미반영 |
| Frontend Dispute UI | `dispute_case_detail_screen.dart`, `host_action_bar.dart` | 단일 confirm의 유일한 UI 호출부, 환불 화면의 유일한 호출부와 sourceId 변환 |
| Frontend Screen | `lib/presentation/dispute/screens/no_show_refund_screen.dart` | 0원 허용, originalPaidAmount=0 처리, 조회·알림 동작 부재 |
| Frontend Router | `lib/core/router/routes.dart`, `app_router.dart` (hostNoShowRefund) | `eventId`/`paidAmount` query 계약과 기본값 0 |
| Frontend Provider | `lib/domain/providers/dispute/no_show_refund_form_provider.dart` | 노쇼 환불 Form 상태 |
| Backend Tests | `EventNoShowServiceTest`, `EventNoShowServiceGuestPartyTest`, `NoShowRefundServiceTest` | actor role, cohost attendance flag, party owner, 7일 경계, 누적 상한, 0원, paid/free 분할 |
| UI/UX Spec | `community_api/docs/ui-ux/screens/30-dispute-host.md` §30.4-30.5, `31-dispute-participant.md` §31.5 | source와 다른 진입·0원·조회·알림 기대를 Gap으로 분리 |

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

### 3-2. 일괄 노쇼 확정 흐름 (앱 배선됨, W14-S2)

1. 호스트가 "일괄 노쇼 확정" 버튼을 누른다(`NoShowManageSection`, host/coHost/staff — 2026-06-06 `577c9ac` 배선 완료).
2. `POST /api/v1/events/{eventId}/no-shows/batch`를 body 없이 호출한다.
3. 서버 `confirmBatch`가 `ATTENDING && !checked-in && !CANCEL_PENDING_REFUND` 조건으로 회원과 게스트 attendance row를 선별한다. 환불 대기는 party owner 기준으로 게스트까지 함께 제외한다.
4. 기존 회원 userId/게스트 attendanceId 노쇼 집합을 먼저 읽고, 없는 대상만 직접 저장한다.
5. `List<EventNoShowVo>`를 반환한다.

### 3-3. 참가자가 소명하는 흐름 (앱 배선됨, W14-S2)

1. 참석자 목록의 `_MyNoShowNotice`는 조회된 row 중 `row.userId == currentUserId`인 회원 row 하나를 선택한다. status가 CONFIRMED이면 **confirmedAt과 무관하게 항상** “소명할게요” CTA를 표시한다. 소유 게스트 row는 서버에서 반환돼도 이 선택에서 빠진다.
2. CTA는 직접 no-show appeal endpoint가 아니라 `Routes.myDisputeAppealFor('EVENT_NO_SHOW:{noShowId}')`의 통합 분쟁 화면으로 이동해 `POST /api/v1/me/dispute-cases/{caseId}/appeals`를 호출한다.
3. `DisputeAppealService`가 통합 appeal row를 저장하기 전에 canonical caseId, `partyOwnerUserId == 본인`, 현재 status, `confirmedAt + 7일`을 `EventNoShowService.validateAppealable`로 검사한다. 회원 row는 본인, 게스트 row는 예매 소유자가 권리 주체다.
4. 기한이 지났으면 `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED(409)`, APPEALED면 `EVENT_NO_SHOW_ALREADY_APPEALED(409)`, OVERTURNED면 `EVENT_NO_SHOW_ALREADY_OVERTURNED(409)`로 거부된다.
5. 사전 검증을 통과하면 통합 `dispute_appeal`을 저장하고, 별도 트랜잭션의 best-effort sync가 `EventNoShowService.appeal`을 호출해 status=APPEALED, `appeal_case_id`, `appealed_at`을 기록한다.
6. `POST /api/v1/events/{eventId}/no-shows/{noShowId}/appeal`과 `NoShowAppealParam`도 직접 폴백 경로로 남아 있다. 이 controller는 path `eventId`를 service로 전달하지 않는다.

### 3-4. 호스트/CS가 결정을 뒤집는 흐름 (앱 배선됨, W14-S2)

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

## 4. 서버 계약

### 4-1. 노쇼 Endpoint 표

기본 경로: `/api/v1/events/{eventId}/no-shows`

소스: `EventNoShowController.java:35-97`

| HTTP | Path | 인증 | 권한 | Request 필드 | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/events/{eventId}/no-shows` | required | 호스트·cohost(canManageAttendance)·클럽 운영진 — `EventAttendanceManagerGuard` | `NoShowConfirmParam{userId?, attendanceId?, reasonCode?, reasonText?, evidenceFileIds?, evidenceVisibility?}` | `EventNoShowVo` |
| POST | `/api/v1/events/{eventId}/no-shows/batch` | required | 동일 | body 없음 | `List<EventNoShowVo>` |
| GET | `/api/v1/events/{eventId}/no-shows` | required | 관리자=전체 / 참가자=본인 회원 row+소유 게스트 row (`partyOwnerUserId`) | — | `List<EventNoShowVo>` |
| POST | `/api/v1/events/{eventId}/no-shows/{noShowId}/appeal` | required | **party owner만**(회원 본인/게스트 예매자), `confirmedAt+7일` 이내 | `NoShowAppealParam{appealCaseId}` — service가 nonblank+canonical 강제 | `EventNoShowVo` |
| POST | `/api/v1/events/{eventId}/no-shows/{noShowId}/overturn` | required | 호스트·cohost(canManageAttendance)·클럽 운영진 or SYSTEM(id=0) | `NoShowOverturnParam{reason}` — service가 nonblank 강제 | `EventNoShowVo` |

`NoShowConfirmParam`에는 Jakarta validation annotation이 없고 controller도 `@Valid`를 쓰지 않는다. `userId`와 `attendanceId`는 둘 다 `Long` nullable이지만 `validateConfirmParam`이 최소 하나를 요구한다. 둘 다 전달하면 `attendanceId` 경로가 우선한다. `reasonText` 최대 500자, `evidenceFileIds` 최대 5개도 service가 검사한다.

`confirmedByRole`의 실제 저장 분기는 다음과 같다.

| actor | `confirmedByRole` |
|---|---|
| event.hostUserId | `EVENT_HOST` |
| 권한 있는 cohost 또는 club staff | `ADMIN` |
| 내부 SYSTEM actorUserId=0 | `SYSTEM` |

`appeal`과 `overturn` controller는 path `eventId`를 받지만 service 호출에는 `noShowId`와 actor/param만 넘긴다. 따라서 row.eventId와 path eventId의 일치 검증은 없다(G-11).

### 4-2. 노쇼 사후 조정 환불 Endpoint 표

소스: `RefundPolicyController.java:53-68`

| HTTP | Path | 인증 | 권한 | Request 필드 | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/no-show-refund` | required | 호스트·**모든 cohost(존재만 검사)**·클럽 OWNER/EVENT_REFUND_MANAGER | `NoShowRefundParam` | `NoShowRefundVo` (201) |
| GET | `/api/v1/events/{eventId}/applications/{applicationId}/no-show-refund` | required(전역 security) | **객체 권한 검사 없음** | — | `NoShowRefundVo` |

GET controller는 `@AuthenticationPrincipal`을 받지 않고 path `eventId`도 사용하지 않는다. service는 `findByApplicationId(applicationId)`만 호출하므로 인증 사용자가 다른 applicationId를 알면 타 이벤트의 환불 사유·금액·참가자/호스트 ID를 조회할 수 있는 IDOR/BOLA 후보(G-13)다.

`NoShowRefundParam` 필드:

| 필드 | 타입 | 제약 |
|---|---|---|
| refundAmount | Long? | DTO annotation 없음. service가 null/음수를 거부하고 0은 허용 |
| reasonCode | String? | DTO annotation 없음. service가 null/blank를 거부 |
| reasonText | String? | nullable |
| evidenceVisibility | String? | nullable, null이면 PARTIES. service enum 검증 없음 |
| evidenceFileIds | List\<String\>? | nullable. service 개수·소유권 검증 없음 |
| releaseTicket | Boolean? | nullable |

`NoShowRefundParam`은 Lombok DTO일 뿐 Jakarta validation annotation이 없고 controller도 `@Valid`를 쓰지 않는다. reasonText 500자/evidence 최대 5개/evidenceVisibility 값 집합은 Flutter UI 또는 DB 컬럼에 기대며 service-level 계약으로 강제되지 않는다.

### 4-3. NoShowStatus Enum (3값, 소스 직접 확인: `NoShowStatus.java:18-22`)

```
CONFIRMED  — 호스트 또는 시스템 자동 확정
APPEALED   — 참가자 소명 진행 중 (dispute_case 연결)
OVERTURNED — CS/호스트가 결정 뒤집음 (제재 카운트 제외)
```

### 4-4. 상태기계 — 전이 조건·행위자·기한

```
[없음]
  ↓  호스트·cohost·클럽 운영진 confirm() 또는 confirmBatch()
CONFIRMED
  ↓  party owner(회원 본인/게스트 예매자)만 appeal(noShowId, appealCaseId)
  |  ※ appealCaseId는 canonical EVENT_NO_SHOW:{noShowId}; 통합 endpoint가 같은 문자열로 dispute_appeal 저장
APPEALED
  ↓  호스트·cohost·클럽 운영진 또는 SYSTEM(id=0) overturn(reason)
OVERTURNED  ← 터미널. countRecentNoShows 제외.
               회원은 기존 체크인이 없을 때 NOSHOW_OVERTURN 정정 체크인 생성.
```

추가 전이 경로:
- `CONFIRMED → OVERTURNED` 직접 가능 (overturn은 OVERTURNED만 차단, 중간 상태 검사 없음).
- `APPEALED → APPEALED` 금지: `EVENT_NO_SHOW_ALREADY_APPEALED(409)`.
- `OVERTURNED → *` 금지: `EVENT_NO_SHOW_ALREADY_OVERTURNED(409)`.

**소명 기한 (해소됨, 커밋 `07bdb38` / D-2 확정=7일)**: `confirmedAt + 7일`이 경과한 CONFIRMED 노쇼는 소명할 수 없다 — `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED`(409, 400036) 거부. 기한 검사는 `validateAppealable`(read-only) 헬퍼로 추출되어 `appeal()`과 통합 분쟁 경로(`DisputeAppealService.createAppeal` EVENT_NO_SHOW source)가 공유한다.

소스: `EventNoShowService.validateAppealable`, `DisputeAppealService.createAppeal`

### 4-5. 노쇼 산정 제외 조건

`CANCEL_PENDING_REFUND` 상태 참가자는 체크인 통계 분모(`getCheckInStats`)와 `confirmBatch` 대상에서 제외된다. 게스트는 party owner의 application 상태를 따른다. 다만 단일 `confirm`은 application 상태를 검사하지 않아 이 제외 규칙이 적용되지 않는다(G-8).

소스: `CheckInService.java:239-249`, `ApplicationStatus.java`의 `CANCEL_PENDING_REFUND` 주석

### 4-6. 제재 카운트 연계

`EventNoShowService.countRecentNoShows(userId, withinDays)`: `CONFIRMED+APPEALED` 합산, `OVERTURNED` 제외.

소스: `EventNoShowService.java:343-348`

### 4-7. 뒤집기 정정 체크인 계약

`EventNoShowService.createCorrectionCheckInIfNeeded`는 회원 row의 OVERTURNED 전이와 같은 트랜잭션에서 아래 행을 저장한다.

| 필드 | 저장값 |
|---|---|
| eventId | no-show row의 eventId |
| userId | no-show row의 userId |
| attendanceId | no-show row의 attendanceId(nullable legacy) |
| method | `NOSHOW_OVERTURN` |
| manualActorId | actorUserId, SYSTEM(0)이면 null |

`existsByEventIdAndUserId` 또는 `existsByAttendanceId`가 true이면 새 행을 만들지 않는다. 게스트 row(`userId=null`)도 생성 대상이 아니다. `EventNoShowServiceTest`가 회원 생성, SYSTEM actor, 두 멱등 분기, 게스트 제외를 각각 검증한다.

### 4-8. EventNoShow 엔티티 컬럼

소스: `EventNoShow.java`, `V1__init.sql`의 `event_no_show`

| 컬럼 | 타입 | nullable | 설명 |
|---|---|---|---|
| id | bigint PK AUTO_INCREMENT | N | |
| event_id | bigint | N | |
| user_id | bigint | Y | 계정 회원. 게스트 row는 NULL |
| attendance_id | bigint | Y | 참가 행 id. 게스트 멱등 키, 레거시 회원은 NULL 가능 |
| owner_user_id | bigint | Y | 게스트 예매 소유자·패널티/소명 귀속 |
| guest_name | varchar(40) | Y | 게스트 표시 이름 스냅샷 |
| application_id | bigint | Y | attendance 직접 생성 케이스는 NULL |
| confirmed_at | datetime | N | |
| confirmed_by_user_id | bigint | N | SYSTEM=0 |
| confirmed_by_role | varchar(20) | N | WarningActorRole |
| status | varchar(20) | N | NoShowStatus |
| appeal_case_id | varchar(80) | Y | dispute_case 연결 |
| appealed_at | datetime | Y | |
| overturned_at | datetime | Y | |
| overturned_reason | varchar(500) | Y | |
| created_at | datetime | N | @CreatedDate |
| updated_at | datetime | N | @LastModifiedDate |

UNIQUE KEY: `(event_id, user_id)`, `(attendance_id)` — 회원/게스트 confirm 멱등성 보장
INDEX: `idx_event_no_show_user_status`, `idx_event_no_show_owner_status`

### 4-9. no_show_refund 엔티티 컬럼

소스: `NoShowRefund.java`, `V1__init.sql`의 `no_show_refund`

| 컬럼 | 타입 | nullable | 설명 |
|---|---|---|---|
| id | bigint PK | N | |
| event_id | bigint | N | |
| application_id | bigint | N | UNIQUE 미설정, existsByApplicationId 서비스 체크 |
| host_user_id | bigint | N | |
| applicant_user_id | bigint | N | |
| refund_amount | bigint | N | |
| reason_code | varchar(40) | N | |
| reason_text | varchar(500) | Y | |
| evidence_visibility | varchar(20) DEFAULT 'PARTIES' | N | PARTIES/HOST_ONLY/ALL |
| evidence_file_ids | json | Y | |
| ticket_released | tinyint(1) DEFAULT 0 | N | |
| dispute_case_id | varchar(80) | Y | HOST_ACTION_REVIEW-{UUID} 식별자 문자열 자동 생성(통합 case row 생성 아님) |
| created_at | datetime | N | @CreatedDate |

### 4-10. 사후 조정 환불 계산 경로

`NoShowRefundService`는 `RefundFaultCategory`/`computeRefund`를 사용하지 않는다. 실제 경로:

1. 원 결제를 legacy `EVENT_PAYMENT/userId+eventId`에서 찾고, 없으면 active `EventPayment/applicationId`의 `pointTxId`로 `EVENT_PREPAYMENT` 결제를 찾는다.
2. `grossPaid = payTx.amount`다. 이 값은 **paidAmount + freeAmount의 총 결제액**이며 유료 잔액만 뜻하지 않는다. 결제가 없으면 grossPaid=0이다.
3. 동일 사용자의 완료된 `EVENT_REFUND/eventId`를 합산하고, 선결제면 완료된 `EVENT_PREPAYMENT_REFUND/prepaymentId`도 합산한다. `refundAmount > grossPaid - alreadyRefunded`면 `NO_SHOW_REFUND_EXCEEDS_PAID(400)`로 거부한다.
4. 양수 요청은 원 결제 비율을 기준으로 `paidRefund=floor(refundAmount×paidAmount/(paidAmount+freeAmount))`, `freeRefund=refundAmount-paidRefund`로 분리한다(BigInteger 오버플로 방어). 이전 환불 후 남은 bucket 비율을 다시 계산하는 방식은 아니다.
5. 지갑에 paid/free 별도 입금하고 `PointTransaction(type=REFUND, referenceType=EVENT_REFUND)`을 기록한다. 원 PaymentRecord가 있으면 charge lot도 같은 paid/free 금액으로 복구한다.
6. `eventRefundSettlementService.applyRefundToSettlement(eventId, hostUserId, applicantUserId, txId, paidRefund, 0L, freeRefund)`를 호출해 회계 분개와 정산 상태별 후처리(claw-back/PAYING-block)를 적용한다.
7. `refundAmount=0`은 유효하다. wallet/PointTransaction/PaymentRecord/정산 helper를 건너뛰고 `no_show_refund` row만 저장한다.
8. `releaseTicket=true`이면 hosting ticket release를 시도한다.

`NoShowRefundParam`에 `faultCategory` 필드가 없다. 호스트 입력 `refundAmount`가 `[0, grossPaid-alreadyRefunded]` 범위 내 manual 조정값이다. `NoShowRefundServiceTest`가 일반·선결제 원결제, 교차 경로 누적 차단, 0원, 50/50 paid/free 분할, 정산 helper 위임을 각각 검증한다.

### 4-11. ErrorCode

| ErrorCode | HTTP | 내부 코드 | 설명 |
|---|---|---|---|
| EVENT_NO_SHOW_NOT_FOUND | 404 | 400017 | |
| EVENT_NO_SHOW_ALREADY_APPEALED | 409 | 400018 | |
| EVENT_NO_SHOW_ALREADY_OVERTURNED | 409 | 400019 | |
| EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED | 409 | 400036 | `confirmedAt + 7일` 경과 후 소명 차단 (W14-S2, D-2=7일) |
| EVENT_CO_HOST_PERMISSION_DENIED | 403 | 300030 | cohost 자격은 있으나 `canManageAttendance` flag 미보유 (W14-S2, 외부인 EVENT_NOT_OWNER와 분리) |
| NO_SHOW_REFUND_NOT_FOUND | 404 | 3200004 | |
| NO_SHOW_REFUND_DUPLICATE | 409 | 3200005 | |
| NO_SHOW_REFUND_EXCEEDS_PAID | 400 | 3200006 | refundAmount가 paid+free 원결제 총액에서 완료된 기존 환불을 뺀 잔액 초과 |

소스: `ErrorCode.java`

## 5. 프론트 계약

### 5-1. 배선된 Endpoint (앱에 실제 존재)

`lib/data/api/event_no_show_api.dart`에는 서버 5개 노쇼 endpoint의 Retrofit 정의와 repository 래핑이 모두 있다.

| 배선된 endpoint | 메서드 시그니처 |
|---|---|
| `POST /api/v1/events/{eventId}/no-shows` | `confirm(eventId, NoShowConfirmParam)` → `EventNoShowVo` |
| `POST /api/v1/events/{eventId}/no-shows/batch` | `confirmBatch(eventId)` → `List<EventNoShowVo>` |
| `GET /api/v1/events/{eventId}/no-shows` | `list(eventId)` → `List<EventNoShowVo>` |
| `POST .../no-shows/{noShowId}/appeal` | `appeal(eventId, noShowId, NoShowAppealParam)` → `EventNoShowVo` |
| `POST .../no-shows/{noShowId}/overturn` | `overturn(eventId, noShowId, NoShowOverturnParam)` → `EventNoShowVo` |

`NoShowAppealParam`/`NoShowOverturnParam` Dart 모델 및 repository 래핑도 존재한다. 실제 화면 호출은 다음처럼 분리된다.

- `NoShowManageSection`: `list` 조회, `confirmBatch`, `overturn`. **단일 confirm과 appeal UI는 없다.**
- `DisputeCaseDetailScreen` 호스트 액션 시트: `confirm`의 유일한 UI 호출부. `userId=targetUserId`만 보내므로 `attendanceId` 게스트 단일 확정은 못 한다.
- `_MyNoShowNotice`: direct `appeal` API 대신 `Routes.myDisputeAppealFor('EVENT_NO_SHOW:{noShowId}')`의 통합 분쟁 endpoint를 사용한다.
- `EventNoShowList.appeal`: direct appeal의 폴백 메서드는 존재하지만 current UI 호출부는 없다.

### 5-2. 미배선 Endpoint

| 서버 Endpoint | 앱 배선 여부 |
|---|---|
| `GET .../no-show-refund` | API 정의 자체가 없음. 이력 조회 UI도 없음(G-2), 서버 endpoint는 객체 권한 미검사(G-13) |

`POST .../no-show-refund`는 `NoShowRefundScreen`에서 배선됨.

### 5-3. 화면 및 라우트

**`NoShowRefundScreen`** (`lib/presentation/dispute/screens/no_show_refund_screen.dart`)
- 라우트: `/host/disputes/:caseId/no-show-refund/:applicationId` (`Routes.hostNoShowRefund`)
- Provider: `NoShowRefundForm` (`lib/domain/providers/dispute/no_show_refund_form_provider.dart`)
- POST `no-show-refund` 배선 완료.
- GET `no-show-refund` 미배선 (기존 제출 내역 확인 불가).
- 유일한 caller는 `DisputeCaseDetailScreen._openNoShowRefund`다. UI spec에 적힌 참석자 목록 노쇼 long-press caller는 없다.
- caller는 APPLICATION/ATTENDANCE/CHECK_IN의 `sourceId`를 모두 applicationId로 간주한다. attendance/check-in → application 변환 조회가 없어 잘못된 id가 전달될 수 있다.
- caller가 `paidAmount`를 넘기지 않아 라우트 기본값 0으로 진입한다. 원 결제 조회도 하지 않아 “원 결제액 정보 없음 (0원 또는 무료 모임)”으로 표시하고 client-side 상한을 적용하지 못한다.
- form은 0원을 유효하게 제출한다. 이는 current server/test와 일치하지만 UI/UX spec §30.5의 “금액 0이면 확인 비활성”과는 불일치한다.
- 성공 후 toast만 표시하고 pop한다. 화면 문구는 “참가자에게 안내됩니다”라고 하지만 서버·앱에 notification 발송 호출은 없다.

**참석자 목록 노쇼 UI**
- 관리자: `permission.canManageAttendance`일 때 `NoShowManageSection` 노출. 모든 row, 게스트 이름, **일괄 확정, 기존 row 번복**을 제공한다. 개별 확정 버튼은 없다.
- 일반 참가자: GET 결과가 본인 및 소유 게스트 row로 필터된다. `_MyNoShowNotice`는 현재 `row.userId == currentUserId`만 찾으므로 회원 본인 CTA는 보이지만 소유 게스트 row의 소명 CTA는 보이지 않는다(G-10).
- `_MyNoShowNotice`는 status만 보고 CONFIRMED이면 CTA를 표시한다. `confirmedAt+7일` 계산이나 deadline 필드가 없어 기한이 지나도 CTA가 사라지거나 비활성화되지 않는다(G-12).

### 5-4. Dart 모델 정합성

`EventNoShowVo` (`lib/data/models/dispute/event_no_show_vo.dart`):
- `NoShowStatus` enum: CONFIRMED/APPEALED/OVERTURNED — 서버 mirror 정확 (소스 직접 확인).
- `confirmedByRole`: `String?` (서버는 `WarningActorRole` enum 직렬화 → 오타/미지원 값 silent null 위험, G-7).

`NoShowConfirmParam` (`lib/data/models/dispute/no_show_confirm_param.dart`):
- `userId` int?, `attendanceId` int?, `reasonCode` String?, `reasonText` String?, `evidenceFileIds` List\<int\>[], `evidenceVisibility` String? — 서버 DTO 타입과 일치. 최소 하나 필요/attendanceId 우선 규칙은 Dart 타입 자체로 강제하지 않는다.

`NoShowConfirmReasonCode` (클라 전용 enum): ATTENDEE_ABSENT, LATE_NO_CONTACT, OTHER — 서버는 String으로 받으므로 UI 목적의 클라 전용 enum.

`NoShowRefundReasonCode` (클라 전용 enum): LATE_CONFIRM/CIRCUMSTANCES/HOST_CHECKIN_MISSED/OTHER — 서버 `reasonCode`는 자유 String, 공식 wire 계약 없음(G-5).

## 6. 상태/권한 매트릭스

| 행위자/상태 | 서버 근거 | 앱 분기 | 결과 | 판단 |
|---|---|---|---|---|
| host — 회원 단일 확정 | UNIQUE(event_id, user_id) 멱등 | DisputeCaseDetail 호스트 액션 시트가 userId로 confirm | row 생성 또는 기존 반환 | 부분 배선 |
| host — 게스트 단일 확정 | attendanceId 멱등 | attendanceId를 보내는 UI caller 없음 | API/model만 존재 | Gap |
| host — 일괄 확정 | ATTENDING && !checked-in && !CANCEL_PENDING_REFUND | confirmBatch() 배선(W14-S2) | 서버·앱 완성 | 해소 |
| 참가자 — 소명 | partyOwnerUserId == 본인, confirmedAt+7일 이내 | 회원 row만 통합 appeal CTA | 회원만 배선, owner guest 누락 | Gap G-10 |
| host/CS — 뒤집기 | 호스트·cohost(flag)·클럽 운영진·SYSTEM | overturn() 배선(W14-S2) | 서버·앱 완성 | 해소 |
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
| cohost (canManageAttendance=false) 확정 | `EventAttendanceManagerGuard` → `EVENT_CO_HOST_PERMISSION_DENIED` | — | 권한 없는 cohost 차단 | 해소(W14-S2) |
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
| ~~P0~~ **해소(W14-S2, `577c9ac`)** | ~~G-1. 소명·뒤집기·일괄 확정 미배선~~ | API/model/repository가 있고 `NoShowManageSection`은 batch/overturn, `_MyNoShowNotice`는 통합 dispute appeal CTA를 제공한다. | 회원 참가자 소명·호스트 일괄·번복이 앱에서 가능. 게스트 CTA/단일 guest confirm은 G-10으로 별도. | 완료(회원 기준) |
| P1 | **G-2. 노쇼 환불 GET 앱 미배선** | Flutter `DisputeCaseApi`에는 POST만 있고 GET 정의/조회 화면이 없다. | 호스트가 기존 제출 내역을 확인하지 못하고 중복 제출 후 409를 받아야 안다. | G-13의 서버 권한 문제를 먼저 고친 뒤 기존 이력 조회를 배선. |
| ~~P1~~ **해소(W14-S2, `07bdb38` / D-2=7일)** | ~~G-3. 소명 기한 서버 미구현~~ | `EventNoShowService.validateAppealable`이 `confirmedAt + 7일` 초과 시 `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED(409, 400036)` 거부. `appeal()`과 통합 분쟁 경로가 공유. | CONFIRMED 무기한 소명 차단. | 완료 |
| P2 | **G-4. 두 appeal 기록의 best-effort 동기화** | 통합 경로는 canonical caseId로 `dispute_appeal`을 먼저 저장한 뒤 REQUIRES_NEW에서 `event_no_show`를 APPEALED로 sync한다. 사전 검증은 공유하지만 sync 실패는 공식 appeal row를 롤백하지 않는다. | 드문 sync 실패 시 `dispute_appeal=PENDING`인데 `event_no_show=CONFIRMED`인 불일치가 가능하다. | 재시도/outbox 또는 reconciliation을 F18-03에서 소유. |
| P2 | **G-5. NoShowRefundReasonCode wire 계약 없음** | 서버 `reasonCode`는 free String. 클라 4값 enum과 공식 매핑 없음. | 향후 서버에서 `reasonCode` 기반 필터링/보고 시 클라 값과 불일치 가능. | 서버에 `NoShowRefundReasonCode` enum 정의 및 검증 추가. |
| ~~P2~~ **해소(W14-S2, `07bdb38`)** | ~~G-6. 노쇼 확정/번복의 cohost canManageAttendance 미체크~~ | 체크인·노쇼가 `EventAttendanceManagerGuard`를 공유한다. cohost는 `canManageAttendance` 보유 시만 통과한다. | 권한 없는 cohost의 노쇼 확정/번복 차단. 환불 권한은 G-15로 별도 잔존. | 완료 |
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
| ~~정책~~ **완료(W14-S2, D-2=7일)** | ~~G-3 소명 기한~~ | `confirmedAt + 7일`(400036). 통합 분쟁 경로와 공유. |
| ~~구현~~ **완료(W14-S2)** | ~~G-1 회원 앱 소명 화면~~ | `attendee_list_screen.dart`의 `_MyNoShowNotice` → canonical `EVENT_NO_SHOW:{noShowId}` 통합 분쟁 라우트. |
| ~~구현~~ **완료(W14-S2)** | ~~G-1 앱 일괄 확정~~ | `NoShowManageSection`(host/coHost/staff)에 일괄 확정 UI. |
| ~~구현~~ **완료(W14-S2)** | ~~G-1 앱 뒤집기~~ | `NoShowManageSection` 번복 UI(host/coHost/staff). |
| 구현 | G-2/G-13 노쇼 환불 GET | 먼저 eventId+principal 객체 권한을 강제한 뒤 NoShowRefundScreen에 기존 이력 조회를 배선. |
| ~~서버~~ **완료(W14-S2)** | ~~G-6 출결 cohost 권한~~ | `EventAttendanceManagerGuard` 추출 — 체크인·노쇼 단일 기준 공유. 환불 scope는 G-15. |
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

## 11. 변경 이력

- **2026-07-29 (current source 재실측)**: OVERTURNED 회원의 `NOSHOW_OVERTURN` 정정 체크인과 멱등/게스트 제외 테스트를 반영했다. 단일 confirm이 `DisputeCaseDetailScreen`, 일괄/번복이 `NoShowManageSection`에 있다는 실제 UI 소유 경계를 교정했다. `NoShowConfirmParam`의 nullable userId/attendanceId 최소-one 계약과 actor role 분기를 명시했다. 소명 party owner/7일 서버 가드와 앱의 상시 CTA를 구분했다. 환불은 paid+free gross에서 기존 환불을 뺀 상한·원 결제 비례 분할·0원 허용으로 교정하고, GET IDOR 후보, no-show row 미검증, cohost refund scope 미검사, 유일 caller의 applicationId/paidAmount=0 문제, 알림·실제 dispute case 부작용 부재를 Gap으로 추가했다.
