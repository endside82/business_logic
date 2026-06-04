# F03-20. 이벤트 노쇼 관리 PRD

<!-- 작성일: 2026-06-05 -->
<!-- 소스 기준: community_api 0eae1ed/86356e5/c3f95a1/46c8335, community_app c3bfdc8 -->

## 1. 결론

이벤트 노쇼 관리는 **서버 계약(5 endpoint), 상태기계, 사후 조정 환불(2 endpoint), 제재 카운트 연계**까지 서버 구현이 닫혀 있다. 앱은 단일 확정(POST)과 목록 조회(GET) 2개만 배선되어 있고, 일괄 확정·참가자 소명·뒤집기 3개 endpoint는 미배선이다.

`NoShowStatus`는 CONFIRMED/APPEALED/OVERTURNED 3값으로, 전이 기한은 서버에서 미구현(v1 정책 미확정)이다. CANCEL_PENDING_REFUND 상태 참가자는 노쇼 산정 대상에서 제외된다(체크인 통계 분모 필터). 노쇼 사후 조정 환불은 `NoShowRefundService`가 `refundAmount ≤ grossPaid` 직접 검증 후 원 결제 paid/free 비율로 직접 분리하고, `EventRefundSettlementService.applyRefundToSettlement`를 통해 정산 상태별 claw-back을 적용한다(`RefundFaultCategory`/`computeRefund` 미사용). 분쟁 소명이 성공하면(`OVERTURNED`) 제재 카운트에서 제외된다. 소명은 외부 dispute_case 식별자(`appealCaseId`)를 사전에 발급받아 전달해야 하며, 이 흐름은 통합 분쟁 유니온 EVENT_NO_SHOW source(`../18_dispute_resolution/F18-03_dispute-appeal_prd.md`)로 연결된다.

앱에서 소명·뒤집기·일괄 확정이 미배선이라 참가자가 앱에서 직접 소명을 제출할 수 없다(G-1). 소명 기한이 서버에 미구현이라 CONFIRMED 상태가 무기한 소명 가능하다(G-3). cohost의 `canManageAttendance` flag 체크가 노쇼 확정에서 누락되어 체크인 관리 권한 없는 cohost가 노쇼를 확정할 수 있다(G-6).

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller (노쇼) | `community_api/src/main/java/com/endside/community/capacity/controller/EventNoShowController.java:35-97` | 5개 endpoint, 권한, 응답 타입 |
| Backend Service (노쇼) | `capacity/service/EventNoShowService.java:1-390` | 상태 전이 조건, 권한 검증, 멱등성 보장, 제재 카운트 메서드 |
| Backend Enum (노쇼) | `capacity/constants/NoShowStatus.java:18-22` | CONFIRMED/APPEALED/OVERTURNED 3값 직접 확인 |
| Backend Model (노쇼) | `capacity/model/EventNoShow.java:27-116`, `V1__init.sql:2721-2743` | 엔티티 컬럼, UNIQUE KEY |
| Backend Param | `capacity/param/NoShowConfirmParam.java`, `NoShowAppealParam.java`, `NoShowOverturnParam.java` | 필드 목록 |
| Backend Controller (환불) | `payment/refundpolicy/controller/RefundPolicyController.java:53-68` | no-show-refund 2 endpoint |
| Backend Service (환불) | `payment/refundpolicy/service/NoShowRefundService.java` | 노쇼 사후 조정 환불 로직 |
| Backend Model (환불) | `payment/refundpolicy/model/NoShowRefund.java:30-91`, `V1__init.sql:4515-4534` | no_show_refund 테이블 컬럼 |
| Backend Enum (환불) | `payment/refundpolicy/constants/RefundFaultCategory.java:38` | NO_SHOW_POST_ADJUSTMENT 값 |
| Backend ApplicationStatus | `event/constants/ApplicationStatus.java:24-36` | CANCEL_PENDING_REFUND 노쇼 제외 |
| Frontend API | `lib/data/api/event_no_show_api.dart` | 배선된 2개 endpoint 확인 |
| Frontend Models | `lib/data/models/dispute/event_no_show_vo.dart`, `no_show_confirm_param.dart` | Dart 모델 필드 |
| Frontend Screen | `lib/presentation/dispute/screens/no_show_refund_screen.dart` | 노쇼 환불 화면 |
| Frontend Router | `lib/core/router/routes.dart` (hostNoShowRefund) | 노쇼 환불 라우트 |
| Frontend Provider | `lib/domain/providers/dispute/no_show_refund_form_provider.dart` | 노쇼 환불 Form 상태 |
| Verification | `EventNoShowService.java:343-348` (countRecentNoShows), `CheckInService.java:239-249` (pendingRefundUserIds 필터) | 제재 카운트/노쇼 통계 분모 |

## 3. 전체 동작 흐름

### 3-1. 호스트가 노쇼 확정하는 흐름

1. 이벤트 종료 후 호스트가 참석 관리 화면에서 체크인 안 한 ATTENDING 사용자를 확인한다.
2. 앱이 `event_no_show_api.dart`의 `confirm(eventId, NoShowConfirmParam)`을 호출한다.
3. `POST /api/v1/events/{eventId}/no-shows`로 `NoShowConfirmParam`(userId, reasonCode?, reasonText?, evidenceFileIds?[max5], evidenceVisibility?)이 전달된다.
4. 서버 `EventNoShowService.confirm`이 `(event_id, user_id)` UNIQUE KEY로 멱등성을 보장한다(기존 row가 있으면 그대로 반환).
5. row가 없으면 `status=CONFIRMED`, `confirmed_by_user_id=호스트userId`, `confirmed_by_role=EVENT_HOST`로 저장한다.
6. `evidenceFileIds` 또는 `reasonText`가 있으면 `ModerationActionLogger`가 NO_SHOW_CONFIRM audit을 별도 트랜잭션으로 기록한다(실패 시 노쇼 확정 트랜잭션에 영향 없음).
7. `EventNoShowVo`를 반환한다.

### 3-2. 일괄 노쇼 확정 흐름 (앱 미배선)

1. 호스트가 "일괄 노쇼 확정" 버튼을 누른다(앱에 현재 없음).
2. `POST /api/v1/events/{eventId}/no-shows/batch`를 body 없이 호출한다.
3. 서버 `confirmBatch`가 `ATTENDING && !checked-in && !CANCEL_PENDING_REFUND` 조건으로 대상자를 선별한다.
4. 각 대상자에 대해 `confirm`을 호출하며, UNIQUE KEY 멱등성으로 이미 확정된 row는 재생성하지 않는다.
5. `List<EventNoShowVo>`를 반환한다.

### 3-3. 참가자가 소명하는 흐름 (앱 미배선)

1. 참가자가 분쟁 통합 시스템을 통해 `appealCaseId`를 발급받는다(external dispute_case 식별자).
2. `POST /api/v1/events/{eventId}/no-shows/{noShowId}/appeal`로 `NoShowAppealParam(appealCaseId)`를 전달한다.
3. 서버가 `row.userId == 본인`인지 확인한다(본인만 소명 가능).
4. status가 CONFIRMED이면 APPEALED로 전이하고 `appeal_case_id`, `appealed_at`을 기록한다.
5. APPEALED 상태의 재소명은 `EVENT_NO_SHOW_ALREADY_APPEALED(409)`.

### 3-4. 호스트/CS가 결정을 뒤집는 흐름 (앱 미배선)

1. `POST /api/v1/events/{eventId}/no-shows/{noShowId}/overturn`으로 `NoShowOverturnParam(reason)`을 전달한다.
2. 서버가 호스트/cohost/클럽 운영진 또는 SYSTEM(id=0) 여부를 확인한다.
3. status가 OVERTURNED이면 `EVENT_NO_SHOW_ALREADY_OVERTURNED(409)`.
4. 그 외 상태(CONFIRMED 또는 APPEALED)에서 OVERTURNED로 전이하고 `overturned_reason`, `overturned_at`을 기록한다.
5. `countRecentNoShows`에서 OVERTURNED row는 집계에서 제외된다.

### 3-5. 호스트가 노쇼 사후 조정 환불하는 흐름

1. 호스트가 `/host/disputes/:caseId/no-show-refund/:applicationId`로 `NoShowRefundScreen`에 진입한다.
2. `NoShowRefundForm` Provider가 상태를 관리한다.
3. `POST /api/v1/events/{eventId}/applications/{applicationId}/no-show-refund`로 `NoShowRefundParam(refundAmount, reasonCode, reasonText?, evidenceVisibility?, evidenceFileIds?, releaseTicket?)`을 전달한다.
4. 서버 `NoShowRefundService.refund`가 `existsByApplicationId`로 중복 체크(UNIQUE 미설정이지만 서비스 레이어 exact-once) 후 `no_show_refund` row를 생성한다.
5. `refundAmount ≤ grossPaid(원 결제 트랜잭션 금액)` 직접 검증 (`NoShowRefundService.java:116-118`). `computeRefund`/`RefundFaultCategory` 미사용.
6. 원 결제 `paidAmount`/`freeAmount` 비율로 환불금을 직접 분리(BigInteger 오버플로 방어 포함). 지갑에 paid/free 별도 입금 후 `eventRefundSettlementService.applyRefundToSettlement`(:185) 경로로 회계 분개 + 정산 후처리. `ticket_released=true`이면 hosting ticket을 release한다.
7. `dispute_case_id = "HOST_ACTION_REVIEW-{UUID}"`를 자동 생성해 기록한다.
8. `NoShowRefundVo`를 반환한다.

## 4. 서버 계약

### 4-1. 노쇼 Endpoint 표

기본 경로: `/api/v1/events/{eventId}/no-shows`

소스: `EventNoShowController.java:35-97`

| HTTP | Path | 인증 | 권한 | Request 필드 | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/events/{eventId}/no-shows` | required | 호스트·cohost·클럽 운영진(canCreateEvent) | `NoShowConfirmParam` | `EventNoShowVo` |
| POST | `/api/v1/events/{eventId}/no-shows/batch` | required | 동상 | body 없음 | `List<EventNoShowVo>` |
| GET | `/api/v1/events/{eventId}/no-shows` | required | — (본인 row 조회 가능) | — | `List<EventNoShowVo>` |
| POST | `/api/v1/events/{eventId}/no-shows/{noShowId}/appeal` | required | **본인(row.userId)만** | `NoShowAppealParam{appealCaseId @NotBlank}` | `EventNoShowVo` |
| POST | `/api/v1/events/{eventId}/no-shows/{noShowId}/overturn` | required | 호스트·cohost·클럽 운영진 or SYSTEM(id=0) | `NoShowOverturnParam{reason @NotBlank}` | `EventNoShowVo` |

### 4-2. 노쇼 사후 조정 환불 Endpoint 표

소스: `RefundPolicyController.java:53-68`

| HTTP | Path | 인증 | 권한 | Request 필드 | Response |
|---|---|---|---|---|---|
| POST | `/api/v1/events/{eventId}/applications/{applicationId}/no-show-refund` | required | 호스트·cohost·클럽 EVENT_REFUND_MANAGER | `NoShowRefundParam` | `NoShowRefundVo` (201) |
| GET | `/api/v1/events/{eventId}/applications/{applicationId}/no-show-refund` | required | — | — | `NoShowRefundVo` |

`NoShowRefundParam` 필드:

| 필드 | 타입 | 제약 |
|---|---|---|
| refundAmount | Long | @NotNull @Min(0) |
| reasonCode | String | @NotBlank |
| reasonText | String? | nullable |
| evidenceVisibility | String? | PARTIES/HOST_ONLY/ALL |
| evidenceFileIds | List\<String\>? | nullable |
| releaseTicket | Boolean? | nullable |

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
  ↓  본인(row.userId)만 appeal(noShowId, appealCaseId)
  |  ※ appealCaseId는 외부(분쟁 시스템)에서 사전 발급 필요
APPEALED
  ↓  호스트·cohost·클럽 운영진 또는 SYSTEM(id=0) overturn(reason)
OVERTURNED  ← 터미널. countRecentNoShows 제외.
```

추가 전이 경로:
- `CONFIRMED → OVERTURNED` 직접 가능 (overturn은 OVERTURNED만 차단, 중간 상태 검사 없음).
- `APPEALED → APPEALED` 금지: `EVENT_NO_SHOW_ALREADY_APPEALED(409)`.
- `OVERTURNED → *` 금지: `EVENT_NO_SHOW_ALREADY_OVERTURNED(409)`.

**소명 기한**: 코드 상 만료 기한 없음 — `EventNoShowService.java:53-55` 주석에 "후속 wave 정책"으로 명시됨. 현재 CONFIRMED 상태는 무기한 소명 가능.

소스: `EventNoShowService.java:82-390`

### 4-5. 노쇼 산정 제외 조건

`CANCEL_PENDING_REFUND` 상태 참가자는 체크인 통계 분모(`getCheckInStats`)에서 `pendingRefundUserIds` 필터로 제외된다. 즉, 계좌이체 취소 후 호스트 환불 확인 대기 중인 참가자는 노쇼 집계에서 제외된다.

소스: `CheckInService.java:239-249`, `ApplicationStatus.java`의 `CANCEL_PENDING_REFUND` 주석

### 4-6. 제재 카운트 연계

`EventNoShowService.countRecentNoShows(userId, withinDays)`: `CONFIRMED+APPEALED` 합산, `OVERTURNED` 제외.

소스: `EventNoShowService.java:343-348`

### 4-7. EventNoShow 엔티티 컬럼

소스: `EventNoShow.java:27-116`, `V1__init.sql:2721-2743`

| 컬럼 | 타입 | nullable | 설명 |
|---|---|---|---|
| id | bigint PK AUTO_INCREMENT | N | |
| event_id | bigint | N | |
| user_id | bigint | N | |
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

UNIQUE KEY: `(event_id, user_id)` — confirm 멱등성 보장
INDEX: `idx_event_no_show_user_status(user_id, status, created_at DESC)`

### 4-8. no_show_refund 엔티티 컬럼

소스: `NoShowRefund.java:30-91`, `V1__init.sql:4515-4534`

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
| dispute_case_id | varchar(80) | Y | HOST_ACTION_REVIEW-{UUID} 자동 생성 |
| created_at | datetime | N | @CreatedDate |

### 4-9. 사후 조정 환불 계산 경로

`NoShowRefundService`는 `RefundFaultCategory`/`computeRefund`를 사용하지 않는다. 실제 경로 (`NoShowRefundService.java:116-187`):

1. `refundAmount ≤ grossPaid` 직접 검증 — 초과 시 `NO_SHOW_REFUND_EXCEEDS_PAID (400)`.
2. 원 결제 `paidAmount`/`freeAmount` 비율로 refundAmount를 직접 분리(BigInteger 오버플로 방어).
3. 지갑에 paid/free 별도 입금 + `PointTransaction(type=REFUND)` 기록.
4. `eventRefundSettlementService.applyRefundToSettlement(eventId, hostUserId, applicantUserId, txId, paidRefund, 0L, freeRefund)` 호출 — 회계 분개 + 정산 상태별 후처리(claw-back/PAYING-block).
5. `ticket_released=true`이면 hosting ticket release.

`NoShowRefundParam`에 `faultCategory` 필드 없음. 호스트 입력 `refundAmount`가 [0, gross] 범위 내 manual 조정값.

소스: `NoShowRefundService.java:100-199`

### 4-10. ErrorCode

| ErrorCode | HTTP | 내부 코드 | 설명 |
|---|---|---|---|
| EVENT_NO_SHOW_NOT_FOUND | 404 | 400017 | |
| EVENT_NO_SHOW_ALREADY_APPEALED | 409 | 400018 | |
| EVENT_NO_SHOW_ALREADY_OVERTURNED | 409 | 400019 | |
| NO_SHOW_REFUND_NOT_FOUND | 404 | 3200004 | |
| NO_SHOW_REFUND_DUPLICATE | 409 | 3200005 | |
| NO_SHOW_REFUND_EXCEEDS_PAID | 400 | 3200006 | refundAmount가 원결제 초과 |

소스: `ErrorCode.java`

## 5. 프론트 계약

### 5-1. 배선된 Endpoint (앱에 실제 존재)

`lib/data/api/event_no_show_api.dart`:

| 배선된 endpoint | 메서드 시그니처 |
|---|---|
| `POST /api/v1/events/{eventId}/no-shows` | `confirm(eventId, NoShowConfirmParam)` → `EventNoShowVo` |
| `GET /api/v1/events/{eventId}/no-shows` | `list(eventId)` → `List<EventNoShowVo>` |

### 5-2. 미배선 Endpoint

| 서버 Endpoint | 앱 배선 여부 |
|---|---|
| `POST .../no-shows/batch` | 미배선 |
| `POST .../no-shows/{noShowId}/appeal` | 미배선 |
| `POST .../no-shows/{noShowId}/overturn` | 미배선 |
| `GET .../no-show-refund` | 미배선 (화면 없음) |

`POST .../no-show-refund`는 `NoShowRefundScreen`에서 배선됨.

### 5-3. 화면 및 라우트

**`NoShowRefundScreen`** (`lib/presentation/dispute/screens/no_show_refund_screen.dart`)
- 라우트: `/host/disputes/:caseId/no-show-refund/:applicationId` (`Routes.hostNoShowRefund`)
- Provider: `NoShowRefundForm` (`lib/domain/providers/dispute/no_show_refund_form_provider.dart`)
- POST `no-show-refund` 배선 완료.
- GET `no-show-refund` 미배선 (기존 제출 내역 확인 불가).

### 5-4. Dart 모델 정합성

`EventNoShowVo` (`lib/data/models/dispute/event_no_show_vo.dart`):
- `NoShowStatus` enum: CONFIRMED/APPEALED/OVERTURNED — 서버 mirror 정확 (소스 직접 확인).
- `confirmedByRole`: `String?` (서버는 `WarningActorRole` enum 직렬화 → 오타/미지원 값 silent null 위험, G-7).

`NoShowConfirmParam` (`lib/data/models/dispute/no_show_confirm_param.dart`):
- `userId` int required, `reasonCode` String?, `reasonText` String?, `evidenceFileIds` List\<int\>[], `evidenceVisibility` String? — 서버와 일치.

`NoShowConfirmReasonCode` (클라 전용 enum): ATTENDEE_ABSENT, LATE_NO_CONTACT, OTHER — 서버는 String으로 받으므로 UI 목적의 클라 전용 enum.

`NoShowRefundReasonCode` (클라 전용 enum): LATE_CONFIRM/CIRCUMSTANCES/HOST_CHECKIN_MISSED/OTHER — 서버 `reasonCode`는 자유 String, 공식 wire 계약 없음(G-5).

## 6. 상태/권한 매트릭스

| 행위자/상태 | 서버 근거 | 앱 분기 | 결과 | 판단 |
|---|---|---|---|---|
| host — 단일 확정 | UNIQUE(event_id, user_id) 멱등 | confirm() 호출 | row 생성 또는 기존 반환 | 배선됨 |
| host — 일괄 확정 | ATTENDING && !checked-in && !CANCEL_PENDING_REFUND | 미배선 | 서버 완성, 앱 없음 | Gap G-1 |
| 참가자 — 소명 | row.userId == 본인 | 미배선 | 서버 완성, 앱 없음 | Gap G-1 |
| host/CS — 뒤집기 | 호스트·cohost·클럽 운영진·SYSTEM | 미배선 | 서버 완성, 앱 없음 | Gap G-1 |
| CONFIRMED → APPEALED | 본인만 | 미배선 | 서버 전이 가능 | Gap |
| APPEALED → OVERTURNED | 호스트/CS | 미배선 | 서버 전이 가능 | Gap |
| OVERTURNED → * | 차단 409 | — | 409 반환 | — |
| CANCEL_PENDING_REFUND 참가자 노쇼 확정 | batch 대상 제외 | 미배선 | batch에서 자동 제외 | 일치 |
| 제재 카운트 — OVERTURNED | countRecentNoShows에서 제외 | 앱에서 직접 사용 안함 | 서버 정확 | 일치 |
| 노쇼 환불 — POST | EVENT_REFUND_MANAGER 권한 | NoShowRefundScreen 배선 완료 | 환불 처리 | 배선됨 |
| 노쇼 환불 — GET | — | 미배선 | 이력 확인 불가 | Gap G-2 |
| cohost (canManageAttendance=false) 확정 | canManageAttendance 미체크 | — | 권한 없는 cohost가 확정 가능 | Gap G-6 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| NoShowStatus 3값 | CONFIRMED/APPEALED/OVERTURNED | Dart enum 3값 mirror | 일치 |
| confirmedByRole 타입 | WarningActorRole enum 직렬화 | String? (silent null 위험) | 약한 타입 (G-7) |
| NoShowConfirmReasonCode | 서버 String 자유값 | 클라 3값 enum (UI 목적) | wire 계약 없음, 기능상 무방 |
| NoShowRefundReasonCode | 서버 String 자유값 | 클라 4값 enum | wire 계약 없음 (G-5) |
| 소명/뒤집기/일괄 | 서버 구현 완료 | 앱 API 없음 | Gap G-1 |
| no-show-refund POST | 서버 구현 완료 | NoShowRefundScreen 배선 | 일치 |
| no-show-refund GET | 서버 구현 완료 | 앱 화면 없음 | Gap G-2 |
| 소명 기한 | 서버 미구현 (v1 정책 미결) | — | Gap G-3 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | **G-1. 소명·뒤집기·일괄 확정 미배선** | `event_no_show_api.dart`에 `/batch`, `/appeal`, `/overturn` 3 endpoint 없음. | 참가자가 앱에서 직접 소명 불가. 호스트가 일괄 확정 불가. CS가 앱으로 결정 뒤집기 불가. | API/Repository/화면 순서로 구현. 소명 화면은 분쟁 통합 유니온 연계 필요. |
| P1 | **G-2. 노쇼 환불 GET 화면 없음** | `RefundPolicyController.java:63-67` 서버 완성. 앱 GET 화면 없음. | 호스트가 기존 제출 내역 확인 불가. 중복 제출 방지 UX 없음. | `NoShowRefundScreen`에 기존 이력 조회 섹션 추가. |
| P1 | **G-3. 소명 기한 서버 미구현** | `EventNoShowService.java:53-55` 주석 "후속 wave 정책 미결정". | 참가자가 CONFIRMED 상태를 무기한 소명 가능. 법적 분쟁 기간 준수 불가. | 소명 기한(예: 이벤트 종료 후 14일) 정책 결정 후 서버 구현. |
| P2 | **G-4. disputeSystem 연계 계약** | `appealCaseId`가 외부 dispute_case 식별자인데, 발급 절차가 앱-서버 계약으로 명시되지 않음. | 소명 UI 구현 시 appealCaseId를 어디서 발급하는지 불명확. | 분쟁 시스템 API와 소명 흐름 연계 설계(F18-03 cross-ref). |
| P2 | **G-5. NoShowRefundReasonCode wire 계약 없음** | 서버 `reasonCode`는 free String. 클라 4값 enum과 공식 매핑 없음. | 향후 서버에서 `reasonCode` 기반 필터링/보고 시 클라 값과 불일치 가능. | 서버에 `NoShowRefundReasonCode` enum 정의 및 검증 추가. |
| P2 | **G-6. cohost canManageAttendance 미체크** | `EventNoShowService.validateCheckInManager()`가 `canManageAttendance` flag 없이 단순 `existsByEventIdAndUserId` 검사. `CheckInService.java:273-279`는 해당 flag를 체크함. | 체크인 관리 권한 없는 cohost가 노쇼를 확정/뒤집기 가능. | 서버 `EventNoShowService.validateCheckInManager`에 cohost canManageAttendance 체크 추가. |
| P2 | **G-7. confirmedByRole String? 역직렬화** | Dart `EventNoShowVo.confirmedByRole`가 `String?`인데, 서버는 `WarningActorRole` enum 직렬화. | 오타/미지원 값 수신 시 silent null. UI에서 actor role 표시 오류 가능. | Dart enum으로 타입 강화 또는 fallback 처리 명시. |

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

Given 원결제 금액이 10,000원인 참가자에 대해 `refundAmount=15000`을 입력한다.
When `POST .../no-show-refund`가 호출된다.
Then `NO_SHOW_REFUND_EXCEEDS_PAID(400)`이 반환된다.

### AC-08. 노쇼 환불 중복 차단

Given 동일 applicationId에 대한 no-show-refund row가 이미 존재한다.
When 다시 `POST .../no-show-refund`를 호출한다.
Then `NO_SHOW_REFUND_DUPLICATE(409)`가 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 정책 | G-3 소명 기한 | 법무·운영 정책 결정 후 서버 구현(예: 이벤트 종료 후 N일). |
| 구현 | G-1 앱 소명 화면 | 분쟁 통합 시스템(F18-03)과 연계한 소명 UI 설계 및 구현. appealCaseId 발급 흐름 확정 필요. |
| 구현 | G-1 앱 일괄 확정 | 호스트 참석 관리 화면에 일괄 노쇼 확정 버튼 추가. |
| 구현 | G-1 앱 뒤집기 화면 | CS/호스트 뒤집기 화면 — 관리자 앱 또는 공개 앱 결정 필요. |
| 구현 | G-2 노쇼 환불 GET | NoShowRefundScreen에 기존 이력 조회 섹션 추가. |
| 서버 | G-6 cohost 권한 | `EventNoShowService.validateCheckInManager`에 cohost canManageAttendance flag 체크 추가. |
| 서버 | G-5 reasonCode enum 화 | 서버에 `NoShowRefundReasonCode` enum 도입 여부 결정. |
| 테스트 | 멱등성 검증 | 동일 (event_id, user_id) 이중 confirm 동시성 테스트. |
| 테스트 | 배치 필터 검증 | CANCEL_PENDING_REFUND 사용자가 batch에서 제외되는지 확인. |
| cross-ref | 분쟁 소명 연계 | 소명 흐름(APPEALED 상태)은 통합 분쟁 유니온 EVENT_NO_SHOW source인 `../18_dispute_resolution/F18-03_dispute-appeal_prd.md`에서 상세 다룸. |
| cross-ref | 환불 정책 | 노쇼 사후 환불은 F03-13 계산기·귀책 매트릭스를 사용하지 않는다(수동 금액 입력 + grossPaid 상한 검증 + paid/free 비율 분리 + 정산 후처리 `applyRefundToSettlement`만 공유). `RefundFaultCategory.NO_SHOW_POST_ADJUSTMENT`는 enum 값으로만 존재. |
