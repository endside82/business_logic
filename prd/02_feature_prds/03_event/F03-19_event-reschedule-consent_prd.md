# F03-19. 일정 변경 제안·참가자 합의 (RS-002) PRD

<!-- 작성일: 2026-06-05 -->
<!-- 소스 기준 갱신: 2026-07-29 community_api/community_app current source -->

## 1. 결론

일정 변경 합의(RS-002)는 **서버 계약, 분류기 로직, 상태기계, 환불 연계, 스케줄러, 알림 딥링크, 화면 3종**까지 구현이 닫혀 있다.

분류기(`RescheduleClassifierService`)가 변경 규모를 AUTO/MAJOR로 분류한다. AUTO이면 즉시 이벤트에 반영하고 `EVENT_UPDATED(type=RESCHEDULE)` 알림만 발송하며 proposal row를 생성하지 않는다. MAJOR이면 ATTENDING/WAITING 중 계정 userId가 있는 대상마다 proposal row를 만들고 48시간 이내 명시 응답을 기다린다. fixed-delay 스케줄러가 마감된 PENDING을 AUTO_ACCEPTED로 일괄 전이한 뒤 호스트가 `applyBatch`를 호출해야 이벤트에 반영된다. 참가자가 DECLINED하면 100%·수수료 0 환불 정책으로 자동 취소를 시도하지만 예외는 `autoCancelFailed=true`로 흡수되고, hosting ticket release도 best-effort라 즉시 완료를 보장하지 않는다.

앱은 `EventEditNotifier`에서 `rescheduleProposalRepository.createProposal()`을 직접 호출해 `POST /api/v1/events/{eventId}/reschedule-proposals`(직접 POST 경로)를 사용한다. `RescheduleProposalCreateParam`에 newStartTime/newEndTime/newAddress/newAddressDetail/**newLatitude/newLongitude**/changeReason/hostMessage(=changeReason과 동일값)를 채우며, **newPrice는 채우지 않는다** — 가격 변경 입력 UI 자체가 없어 가격 변경 제안은 현재 불가(G-1). 주소가 바뀌면 저장 전에 서버 geocoding API로 좌표를 다시 구하고, 실패하면 저장을 막는다. 두 서버 경로(`PATCH /reschedule`과 `POST /reschedule-proposals`)가 공존하며 PATCH는 서버 내부에서 위임/하위호환 경로로 유지된다(G-7). apply 후 이벤트 상세 캐시 무효화(G-2), 전원 응답 전 확정 차단(G-5), RESCHEDULE_APPLIED 알림 전용 라우팅 미구현(G-6)이 미완 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/src/main/java/com/endside/community/event/reschedule/controller/RescheduleProposalController.java` | 7개 endpoint, 권한, 응답 타입 |
| Backend Service | `event/reschedule/service/EventRescheduleProposalService.java` | 상태 전이 조건, 환불 연계, 스케줄러 연결, 알림 발송 |
| Backend Classifier | `event/reschedule/service/RescheduleClassifierService.java:37-105` | AUTO/MAJOR 분류 조건 코드 직접 확인 |
| Backend Enum | `constants/RescheduleChangeType.java`, `RescheduleClassification.java`, `RescheduleResponseStatus.java` | 4값/2값/5값 직접 확인 |
| Backend Param | `event/param/EventRescheduleParam.java`, `reschedule/param/RescheduleProposalCreateParam.java`, `param/RescheduleResponseParam.java` | 7/9필드 계약, nullable 좌표 pair 검증 |
| Backend VO | `vo/RescheduleProposalResultVo.java`, `vo/RescheduleProposalBatchVo.java`, `vo/RescheduleProposalViewVo.java`, `vo/RescheduleResponseResultVo.java`, `vo/RescheduleChangeDiffVo.java`, `vo/RescheduleEventMetaVo.java` | 응답 필드 구조 |
| Backend Scheduler | `scheduler/EventRescheduleProposalScheduler.java:31` | fixedDelay 3600000ms=1h |
| Backend Entity | `model/EventRescheduleProposal.java:41-102`, `V1__init.sql:4545-4568` | 테이블 컬럼, 인덱스, UNIQUE |
| Frontend API | `community_app/lib/data/api/reschedule_proposal_api.dart` | Retrofit endpoint 배선 |
| Frontend Models | `lib/data/models/reschedule/`, `models/event/event_reschedule_param.dart` | Dart 모델 필드, newLatitude/newLongitude, @JsonValue 매핑 |
| Frontend Geocoding | `event_edit_provider.dart`, `geocoding_repository.dart`, `geocoding_api.dart` | 주소 dirty 시 저장 전 강제 재지오코딩, 실패 시 저장 차단 |
| Frontend Screens | `presentation/event/screens/reschedule_proposal_batch_screen.dart`, `reschedule_proposal_response_screen.dart`, `my_reschedule_proposals_screen.dart`, `event_edit_screen.dart:549-573` | 화면 역할, 분기 조건 |
| Frontend Providers | `community_app/lib/domain/providers/reschedule/reschedule_proposal_providers.dart:19-176` | Provider 6개 |
| Frontend Router | `core/router/routes.dart:338-350`, `app_router.dart:498-526` | 경로 상수, 화면 연결 |
| Frontend Notification | `core/utils/notification_router.dart:34-39, 382-389` | EVENT_UPDATED 서브타입 딥링크 |
| Verification | `EventRescheduleProposalService.java` 내 respond/markExpiredAsAutoAccepted/withdraw 메서드 | 상태 전이 조건 직접 확인 |

## 3. 전체 동작 흐름

### 3-1. 호스트가 일정 변경 제안하는 흐름 (직접 POST 경로)

1. 호스트가 `event_edit_screen.dart`에서 시간/장소/변경사유를 입력하고 저장 버튼을 누른다.
2. 주소가 dirty인 오프라인 이벤트면 `EventEditNotifier._resolveAddressCoordinatesIfNeeded()`가 `GeocodingRepository.geocodeAddress(address)`를 호출한다. 성공 시 새 위도/경도를 state에 저장하고, 실패 또는 빈 주소면 address error를 남기고 저장을 중단한다. 주소가 바뀌지 않았으면 기존 좌표를 그대로 둔다.
3. `EventEditNotifier`가 `rescheduleProposalRepository.createProposal(eventId, RescheduleProposalCreateParam)`을 직접 호출한다.
4. `POST /api/v1/events/{eventId}/reschedule-proposals`로 `RescheduleProposalCreateParam`(newStartTime, newEndTime, newAddress?, newAddressDetail?, newLatitude?, newLongitude?, changeReason, hostMessage=changeReason)이 전달된다. 새 좌표는 주소가 바뀐 경우에만 pair로 보낸다. **newPrice는 채우지 않는다** — 가격 변경 입력 UI 부재로 가격 변경 제안은 현재 불가.
5. 서버 `RescheduleProposalController`가 `createProposal`을 직접 처리한다. 좌표는 둘 다 없으면 기존값 보존, 한쪽만 있거나 범위 밖 또는 `(0,0)`이면 `INVALID_COORDINATES`로 거부한다.
6. `RescheduleClassifierService.classify(event, param)`이 AUTO 또는 MAJOR를 결정한다.
   - **AUTO 경로**: 이벤트 필드 즉시 반영 → `EVENT_UPDATED(type=RESCHEDULE)` 알림 → proposal row 미생성 → `applied=true, batchId=null` 반환.
   - **MAJOR 경로**: ATTENDING+WAITING 중 `userId != null`인 계정 참가자마다 proposal row 생성(status=PENDING, 48h 마감) → 각 참가자에게 `EVENT_UPDATED(type=RESCHEDULE_PROPOSAL, proposalId=<id>, batchId=<uuid>)` 알림 → `applied=false, batchId=<uuid>` 반환. 게스트 행은 건너뛰며 계정 대상이 0명이면 `proposalCount=0`인데 batch GET은 row가 없어 NOT_FOUND가 되는 Gap이 있다.
7. `event_edit_screen.dart`가 `lastRescheduleProposalResult`를 확인한다.
   - `applied=true` → 토스트 "경미한 변경으로 바로 반영됐습니다"
   - `applied=false && batchId != null` → `pushReplacement`로 `RescheduleProposalBatchScreen(eventId, batchId)` 이동.

### 3-2. 참가자가 제안에 응답하는 흐름

1. 참가자가 푸시 알림(EVENT_UPDATED, type=RESCHEDULE_PROPOSAL)을 수신한다.
2. `notification_router.dart`가 `proposalId`를 추출해 `/me/reschedule-proposals/{proposalId}`로 라우팅한다.
3. `RescheduleProposalResponseScreen`이 `myRescheduleProposalProvider(proposalId)`로 `GET /api/v1/me/reschedule-proposals/{proposalId}`를 호출한다.
4. 화면은 `RescheduleProposalViewVo`에서 typed diff(시간/장소/가격 변경 전후), 이벤트 메타, `canRespond`/`deadlinePassed`를 읽어 UI를 구성한다.
5. 참가자가 "동의" 또는 "거절"을 선택하고 note를 입력해 제출한다.
6. `rescheduleProposalActionNotifierProvider.respondToProposal(proposalId, RescheduleResponseParam(accept, note))`가 `POST /api/v1/reschedule-proposals/{proposalId}/response`를 호출한다.
7. 서버는 pessimistic lock(`@Lock(PESSIMISTIC_WRITE)`)으로 row를 잠그고 마감 인라인 체크 후 상태를 전이한다.
   - ACCEPTED: proposal.status = ACCEPTED.
   - DECLINED: proposal.status = DECLINED → `EventParticipationCancellationService.cancelMyParticipation(RefundFaultCategory.RESCHEDULE_DECLINED)` 호출. 성공 시 100%·수수료 0 정책이 적용되지만 예외는 응답 row를 되돌리지 않고 `autoCancelFailed=true`로 반환한다. hosting ticket release는 별도 best-effort다.
8. 화면은 `RescheduleResponseResultVo`(proposal 상태, autoCancelTriggered, cancelStatus)를 표시한다.

### 3-3. 호스트가 batch를 확정·철회하는 흐름

1. 호스트가 `RescheduleProposalBatchScreen`에서 응답 현황(`totalCount`, `acceptedCount`, `declinedCount`, `pendingCount` 등)을 확인한다.
2. `readyToApply=true`(pendingCount==0 && withdrawnCount==0)이면 "확정" 버튼 활성. DECLINED row는 ready 조건을 막지 않지만 화면 배너는 “거절 또는 대기 중이면 확정 불가”라고 써 서버 조건과 불일치한다.
3. 확정: `POST /api/v1/events/{eventId}/reschedule-proposals/{batchId}/apply` → 이벤트 필드 반영 + ACCEPTED/AUTO_ACCEPTED 참가자에게 `EVENT_UPDATED(type=RESCHEDULE_APPLIED)` 알림 + `EventUpdatedEvent` 발행(캘린더 sync).
4. 철회: `DELETE /api/v1/events/{eventId}/reschedule-proposals/{batchId}` → 모든 row status=WITHDRAWN(soft-delete, audit 보존).

### 3-4. 스케줄러 자동 수락 흐름

1. `EventRescheduleProposalScheduler`가 1시간 주기(`fixedDelayString=3600000ms`)로 `markExpiredAsAutoAccepted`를 호출한다.
2. QueryDSL bulk UPDATE: `WHERE status=PENDING AND response_deadline_at < now` → AUTO_ACCEPTED 전이.
3. 마감 후 늦은 응답 시도 시: `respond()`가 PENDING row를 AUTO_ACCEPTED로 저장한 뒤 `RESCHEDULE_RESPONSE_DEADLINE_PASSED(409)`를 던지지만 메서드가 `rollbackFor=Exception.class`이므로 이 인라인 저장은 롤백된다. 영속 AUTO_ACCEPTED 전이는 스케줄러 bulk update 경로에서만 일어난다.

## 4. 서버 계약

### 4-1. Endpoint 표

| Method | Path | 권한 | Request | Response | 용도 |
|---|---|---|---|---|---|
| `PATCH` | `/api/v1/events/{eventId}/reschedule` | host/cohost | `EventRescheduleParam` (7필드) | `EventVo` | 기존 호환 진입점 → 내부 위임 (앱 미사용, 서버 하위호환) |
| `POST` | `/api/v1/events/{eventId}/reschedule-proposals` | host/cohost | `RescheduleProposalCreateParam` (9필드) | `RescheduleProposalResultVo` 201 | 직접 제안 생성 (**앱 사용 경로**) |
| `GET` | `/api/v1/events/{eventId}/reschedule-proposals/{batchId}` | host/cohost | — | `RescheduleProposalBatchVo` | 호스트 batch 현황 |
| `POST` | `/api/v1/events/{eventId}/reschedule-proposals/{batchId}/apply` | host/cohost | — | `RescheduleProposalBatchVo` | batch 확정 |
| `DELETE` | `/api/v1/events/{eventId}/reschedule-proposals/{batchId}` | host/cohost | — | 204 | batch 철회(soft) |
| `POST` | `/api/v1/reschedule-proposals/{proposalId}/response` | 해당 참가자 | `RescheduleResponseParam` | `RescheduleResponseResultVo` | 참가자 응답 |
| `GET` | `/api/v1/me/reschedule-proposals/{proposalId}` | 본인 | — | `RescheduleProposalViewVo` | 참가자 단건 상세 |
| `GET` | `/api/v1/me/reschedule-proposals` | 본인 | `?status=&page=&size=` | `Page<RescheduleProposalViewVo>` | 참가자 목록 |

소스: `RescheduleProposalController.java:49-114`

### 4-2. 이중 계약 — POST vs PATCH

`RescheduleProposalCreateParam` (직접 POST 경로, **앱 사용 중** — `event_edit_provider.dart:349-361`):

| 필드 | 타입 | 제약 | 앱 전송값 |
|---|---|---|---|
| newStartTime | LocalDateTime | DTO annotation 없음; service에서 non-null·현재 이후 검증 | startTime |
| newEndTime | LocalDateTime | DTO annotation 없음; service에서 non-null·start 이후 검증 | endTime |
| newAddress | String | nullable | address (변경된 경우만) |
| newAddressDetail | String | nullable | addressDetail (변경된 경우만) |
| **newLatitude** | Double | nullable pair, -90..90, `(0,0)` 금지 | address가 변경된 경우 geocoding 결과 |
| **newLongitude** | Double | nullable pair, -180..180, `(0,0)` 금지 | address가 변경된 경우 geocoding 결과 |
| **newPrice** | BigDecimal | nullable | **미전송** (가격 변경 UI 부재) |
| changeReason | String | DTO annotation 없음; service에서 nonblank·최대 200 | reason |
| **hostMessage** | String | DTO annotation 없음; service에서 nullable·최대 500 | reason (changeReason과 동일값) |

`EventRescheduleParam` (기존 PATCH 경로, **서버 내부 위임/하위호환 — 앱 미사용**):

| 필드 | 타입 | 제약 |
|---|---|---|
| newStartTime | LocalDateTime | DTO annotation 없음; `EventService` runtime 검증 |
| newEndTime | LocalDateTime | DTO annotation 없음; `EventService` runtime 검증 |
| newAddress | String | nullable |
| newAddressDetail | String | nullable |
| newLatitude | Double | nullable pair, 미동봉 시 기존 좌표 유지 |
| newLongitude | Double | nullable pair, 미동봉 시 기존 좌표 유지 |
| changeReason | String | DTO annotation 없음; `EventService`에서 nonblank·최대 200 |

소스: `EventRescheduleParam.java`, `RescheduleProposalCreateParam.java`

좌표 공통 검증은 `EventService.validateOptionalCoordinates`를 재사용한다. 둘 다 null은 허용하고, 한쪽만 전달·위경도 범위 초과·`(0,0)` pair는 `INVALID_COORDINATES`다. AUTO는 즉시 event 좌표를 바꾸고, MAJOR는 before/after JSON snapshot에 좌표를 보존했다가 `applyBatch`에서 복원한다.

### 4-3. Enum 전체값 (소스 직접 확인)

`RescheduleChangeType` (4값, `RescheduleChangeType.java`):
```
TIME, PLACE, PRICE, MULTI
```

`RescheduleClassification` (2값, `RescheduleClassification.java`):
```
AUTO, MAJOR
```

`RescheduleResponseStatus` (5값, `RescheduleResponseStatus.java`):
```
PENDING, ACCEPTED, DECLINED, AUTO_ACCEPTED, WITHDRAWN
```

### 4-4. 분류기 규칙 (소스 직접 확인: `RescheduleClassifierService.java:37-104`)

| 조건 | 분류 |
|---|---|
| `|Δstart| ≥ 60분` (`Math.abs(Duration.between(oldTime, newTime).toMinutes()) >= 60`) | MAJOR |
| address 또는 addressDetail 변경 (`newAddress != null && !equals(old, new)`) | MAJOR |
| `newPrice > oldPrice` (가격 인상, `newPrice.compareTo(effectiveOld) > 0`) | MAJOR |
| 위 조건 **모두** 미해당 | AUTO |

ChangeType 결정: 2개 이상 변경 → MULTI, 단일 → 해당 타입(TIME/PLACE/PRICE). 변경 없음에 가까운 경우 안전 기본값 TIME 반환.

### 4-5. 응답 VO 핵심 필드

`RescheduleProposalResultVo` (제안 생성 응답):

| 필드 | 타입 | 설명 |
|---|---|---|
| classification | RescheduleClassification | AUTO or MAJOR |
| applied | boolean | AUTO이면 true, MAJOR이면 false |
| batchId | String? | AUTO이면 null, MAJOR이면 UUID |
| proposalCount | int | AUTO이면 0 |

`RescheduleProposalBatchVo` (호스트 batch 현황):

| 필드 | 타입 |
|---|---|
| batchId | String |
| eventId | Long |
| totalCount | int |
| acceptedCount | int |
| declinedCount | int |
| autoAcceptedCount | int |
| pendingCount | int |
| withdrawnCount | int |
| readyToApply | boolean (`pending==0 && withdrawn==0`) |
| proposals | `List<RescheduleProposalDetailVo>` |

`RescheduleProposalViewVo` (참가자 시점):

| 필드 | 타입 | nullable |
|---|---|---|
| id | Long | no |
| batchId | String | no |
| eventId | Long | no |
| changeType | RescheduleChangeType | no |
| status | RescheduleResponseStatus | no |
| hostMessage | String | yes |
| responseNote | String | yes |
| responseDeadlineAt | LocalDateTime | yes |
| respondedAt | LocalDateTime | yes |
| createdAt | LocalDateTime | yes |
| diff | RescheduleChangeDiffVo | yes (before/after 각 필드 + 3개 boolean flag) |
| event | RescheduleEventMetaVo | yes |
| canRespond | boolean | no (파생) |
| deadlinePassed | boolean | no (파생) |

`RescheduleResponseResultVo` (참가자 응답 결과):

| 필드 | 타입 | 설명 |
|---|---|---|
| proposal | RescheduleProposalViewVo | 응답 직후 상태 |
| autoCancelTriggered | boolean | DECLINED → 자동 취소 시도 여부 |
| cancelStatus | ApplicationStatus? | CANCELED / CANCEL_PENDING_REFUND / null |
| autoCancelFailed | boolean | 취소 예외 발생 여부 |

환불 금액은 `RescheduleResponseResultVo`에 노출 없음(`cancelStatus`만 반환).

### 4-6. 상태기계 — 전이 조건·행위자

```
PENDING
  → ACCEPTED      : 참가자 accept=true 응답 (respond(), 마감 전)
  → DECLINED      : 참가자 accept=false 응답 (respond(), 마감 전) → 100% 정책 자동 취소 시도 + best-effort ticket release
  → AUTO_ACCEPTED : 스케줄러 bulk UPDATE (deadline < now, status=PENDING 조건부 원자 update)
                    ※ 마감 후 늦은 응답의 인라인 save는 409 예외와 함께 트랜잭션 rollback
  → WITHDRAWN     : 호스트 batch 철회 (withdraw(), 이미 응답한 row 포함 일괄)

ACCEPTED / AUTO_ACCEPTED / DECLINED : 응답 완료 (변경 불가)
WITHDRAWN : 소프트 삭제 (행 보존, audit 용)
```

applyBatch 조건: `pendingCount==0 && withdrawnCount==0` (readyToApply=true). 위반 시 `RESCHEDULE_BATCH_NOT_READY_FOR_APPLY(400)`.

소스: `EventRescheduleProposalService.java:229-283(respond)`, `markExpiredAsAutoAccepted:454-463`, `applyBatch:309-313`

### 4-7. 환불 연계

DECLINED 시 `EventParticipationCancellationService.cancelMyParticipation`을 `RefundFaultCategory.RESCHEDULE_DECLINED`로 호출한다. 이 호출 예외는 잡아서 `autoCancelFailed=true`로 반환하므로 DECLINED 자체는 유지될 수 있다.

`RESCHEDULE_DECLINED` 환불 정책은 100%·수수료 0이다. 실제 취소 결과는 CANCELED/CANCEL_PENDING_REFUND/null일 수 있고, hosting ticket release는 실패를 응답에 반영하지 않는 best-effort다.

소스: `EventRescheduleProposalService.java:534-537`, `RefundFaultCategory.java:31`, `EventPaymentRefundService.java:371,392`

> **Fact (2026-06-06 돈 흐름 무결성 — H9 해소, 커밋 6c1d630)**: 일정 변경이 가격을 바꾸는 경우(`newPrice ≠ oldPrice`) 이벤트 가격과 **선결제 금액(prepaymentAmount)을 동기화**하도록 `EventRescheduleProposalService`(apply 경로)가 정정되었다. 과거에는 `EventService.cancelEvent`/`reschedule` 시 `prepaymentAmount`가 미동기되어 `FailedRefund.amount`(→ admin `compensatePoints` 적립 구동)가 원금초과/과소 환불을 유발하던 불변식 위반(H9). 이제 가격 변경 apply가 선결제 금액 불변식을 보존해 환불액이 실제 결제액과 일치한다. (단 가격 인상 입력 UI 부재(G-1)로 앱에서 newPrice 제안 자체는 현재 불가 — 본 동기화는 서버 경로/admin 강제 변경 시 보호.)

### 4-8. 알림 구조

| 트리거 | NotificationType | dataJson | 수신자 |
|---|---|---|---|
| MAJOR 제안 생성 | EVENT_UPDATED(11) | `{eventId, type:"RESCHEDULE_PROPOSAL", proposalId:<id>, batchId:<uuid>}` | 참가자 개별 |
| batch apply | EVENT_UPDATED(11) | `{eventId, type:"RESCHEDULE_APPLIED", batchId}` | ACCEPTED+AUTO_ACCEPTED 참가자 |
| AUTO 경로 | EVENT_UPDATED(11) | `{eventId, type:"RESCHEDULE"}` | 참가자 전원 |

소스: `EventNotificationData.java:19,49-54`, `EventRescheduleProposalService.java:191-207,320-334,481-501`

### 4-9. ErrorCode

| Code | HTTP | 코드번호 | 설명 |
|---|---|---|---|
| RESCHEDULE_PROPOSAL_NOT_FOUND | 404 | 300020 | 존재하지 않는 proposal |
| RESCHEDULE_ALREADY_RESPONDED | 409 | 300021 | 이미 응답한 proposal |
| RESCHEDULE_BATCH_NOT_READY_FOR_APPLY | 400 | 300022 | PENDING 있어 apply 불가 |
| RESCHEDULE_BATCH_PENDING_EXISTS | 409 | 300023 | 동일 이벤트 PENDING batch 이미 존재 |
| RESCHEDULE_RESPONSE_DEADLINE_PASSED | 409 | 300024 | 마감 후 응답 시도 |
| RESCHEDULE_BATCH_WITHDRAWN | 409 | 300025 | 철회된 batch 응답/apply 시도 |

소스: `ErrorCode.java:83-90`

### 4-10. 테이블 컬럼 (event_reschedule_proposal)

DDL: `V1__init.sql:4545-4568`

| 컬럼 | 타입 | nullable | 설명 |
|---|---|---|---|
| id | bigint PK AI | N | |
| batch_id | varchar(36) | N | UUID, 같은 제안 묶음 |
| event_id | bigint | N | FK events |
| attendee_user_id | bigint | N | ATTENDING+WAITING 대상 |
| change_type | varchar(20) | N | TIME/PLACE/PRICE/MULTI |
| before_json | json | N | {startTime,endTime,address,addressDetail,price,latitude,longitude} |
| after_json | json | N | 동일 구조. 새 좌표 미동봉이면 기존 좌표 snapshot 보존 |
| host_message | varchar(500) | Y | |
| status | varchar(20) | N | PENDING/.../WITHDRAWN |
| response_deadline_at | datetime | N | created_at + 48h |
| responded_at | datetime | Y | |
| response_note | varchar(500) | Y | |
| created_at | datetime | N | |
| updated_at | datetime | N | |

인덱스: `idx_reschedule_batch(batch_id)`, `idx_reschedule_event_status(event_id, status)`, `idx_reschedule_attendee_status(attendee_user_id, status)`, `idx_reschedule_deadline(status, response_deadline_at)`

## 5. 프론트 계약

### 5-1. 라우트 및 화면

| 라우트 상수 | 경로 | 화면 | 역할 |
|---|---|---|---|
| `rescheduleProposalBatch` | `/events/:eventId/reschedule-proposals/:batchId` | `RescheduleProposalBatchScreen` | 호스트 batch 현황 및 확정/철회 |
| `myRescheduleProposals` | `/me/reschedule-proposals` | `MyRescheduleProposalsScreen` | 참가자 수신 목록 |
| `myRescheduleProposal` | `/me/reschedule-proposals/:proposalId` | `RescheduleProposalResponseScreen` | 참가자 단건 응답 |

소스: `routes.dart:338-350`, `app_router.dart:498-526`

### 5-2. 화면별 역할

**`RescheduleProposalBatchScreen` (호스트)**
- `rescheduleProposalBatchProvider(eventId, batchId)`로 batch 현황 표시.
- readyToApply=true이면 "확정" 버튼 활성 → `rescheduleProposalActionNotifierProvider.applyBatch`.
- "철회" 버튼 → `withdrawBatch`.
- 화면 진입 시 FutureProvider GET 한 번이며 Timer·polling·socket refresh는 없다. action 성공 또는 명시 retry 때만 invalidate한다.
- 배너의 “거절 또는 대기 중인 응답이 있으면 바로 확정할 수 없습니다”는 서버 `readyToApply=pending==0 && withdrawn==0`과 어긋난다. DECLINED는 확정을 막지 않는다.

**`RescheduleProposalResponseScreen` (참가자)**
- `myRescheduleProposalProvider(proposalId)`로 단건 조회.
- typed diff(before/after 시간/장소/가격), 이벤트 메타 표시.
- `canRespond=false` 시 상태 표시만.
- 거절 시 `cancelStatus` 결과 표시 (환불 금액 미노출).
- 알림 탭(type=RESCHEDULE_PROPOSAL) 직접 진입 가능.
- 응답 기한은 `yyyy.MM.dd HH:mm` 절대 시각으로만 표시하며 Timer 기반 남은 시간 countdown은 없다.

**`MyRescheduleProposalsScreen` (참가자)**
- 본인 수신 proposal 목록(무한 페이징, status 필터).
- 프로필 화면 "일정 변경 요청" 메뉴로 진입(`/me/reschedule-proposals`).
- 탭 시 `RescheduleProposalResponseScreen` 이동.

**`EventEditScreen` — reschedule 분기**
- 주소가 변경된 오프라인 이벤트는 저장 전 주소→좌표 변환이 성공해야 한다. 실패하면 address error를 표시하고 API 호출을 하지 않는다.
- 새 좌표는 `newLatitude/newLongitude` pair로 proposal에 동봉한다. 주소 미변경이면 두 필드를 null로 보내 서버가 기존 event 좌표를 유지한다.
- `POST /events/{eventId}/reschedule-proposals` 성공 후 `lastRescheduleProposalResult` 분기:
  - `applied=true` → 토스트 "경미한 변경으로 바로 반영됐습니다"
  - `applied=false && batchId != null` → `pushReplacement` → BatchScreen.
- OPEN 편집 화면은 합의 기준 안내·3개 chip을 항상 보여 주지만 현재 입력 변화에 맞춘 “장소 변경 포함 — 큰 변경” 동적 배너는 없다.

소스: `event_edit_screen.dart:549-573`

### 5-3. Provider

| Provider | 타입 | 역할 |
|---|---|---|
| `rescheduleProposalApiProvider` | keepAlive | API 인스턴스 |
| `rescheduleProposalRepositoryProvider` | keepAlive | Repository |
| `rescheduleProposalBatchProvider(eventId, batchId)` | auto-dispose FutureProvider | 호스트 batch 조회 |
| `myRescheduleProposalProvider(proposalId)` | auto-dispose FutureProvider | 참가자 단건 |
| `myRescheduleProposalsProvider(status,page,size)` | auto-dispose FutureProvider | 참가자 목록 |
| `rescheduleProposalActionNotifierProvider` | auto-dispose AsyncNotifier | 모든 쓰기 액션 |

소스: `reschedule_proposal_providers.dart:19-176`

### 5-4. 알림 딥링크 배선

`notification_router.dart:34-39, 382-389`

- `EVENT_UPDATED` + `dataJson.type == "RESCHEDULE_PROPOSAL"` + `proposalId` 있음 → `Routes.myRescheduleProposalPath(proposalId)` 직행.
- `type == "RESCHEDULE"` (AUTO) / `type == "RESCHEDULE_APPLIED"` (확정) → 기존 이벤트 상세 fallback.

### 5-5. Dart 모델 특이사항

- `cancelStatus`는 `String?`으로 수신 후 `RescheduleResponseResultVoX.cancelApplicationStatus`에서 `ApplicationStatus.fromString()`으로 변환.
- `RescheduleEventMetaVo.eventStatus`는 `String?` (EventStatus 직접 enum 매핑 아님).
- Enum은 모두 `@JsonValue`로 서버 값과 1:1 매핑 확인됨.

## 6. 상태/권한 매트릭스

| 행위자/상태 | 서버 근거 | 앱 분기 | 결과 | 판단 |
|---|---|---|---|---|
| host — AUTO 변경 | 분류기 MAJOR 조건 미해당 | EventEditScreen 토스트 | 즉시 반영, batch 화면 없음 | 일치 |
| host — MAJOR 변경 | 분류기 조건 1개 이상 해당 | BatchScreen으로 이동 | proposal 생성, 현황 표시 | 일치 |
| host — applyBatch (readyToApply=true) | pendingCount==0 && withdrawnCount==0 | 확정 버튼 활성 | 이벤트 반영 + 알림 발송 | 일치 |
| host — applyBatch (pendingCount>0) | `RESCHEDULE_BATCH_NOT_READY_FOR_APPLY` 400 | 확정 버튼 비활성 또는 에러 | 차단 | 일치 |
| host — withdrawBatch | status != WITHDRAWN인 row 일괄 WITHDRAWN | soft-delete | audit 보존 | 일치 |
| 참가자 — PENDING + 마감 전 | canRespond=true, deadlinePassed=false | 동의/거절 버튼 노출 | 응답 가능 | 일치 |
| 참가자 — PENDING + 마감 후 인라인 체크 | AUTO_ACCEPTED save 후 409 throw, `rollbackFor=Exception` | 409 수신 → 에러 표시 | save는 rollback되어 PENDING 유지 가능; scheduler가 별도 전이 | Gap |
| 참가자 — ACCEPTED | 응답 완료 | canRespond=false → 상태 표시 | 재응답 불가 | 일치 |
| 참가자 — DECLINED | 100% 정책 자동 취소 시도; 예외 흡수·ticket best-effort | cancelStatus/autoCancelFailed 표시 | DECLINED와 실제 취소 완료가 분리될 수 있음 | 조건부 |
| 참가자 — AUTO_ACCEPTED | 스케줄러 전이 | 상태 표시 | 자동 수락 확인 | 일치 |
| 참가자 — WITHDRAWN | 호스트 철회 | 목록에서 WITHDRAWN 상태 표시 | 철회 확인 | 일치 |
| 가격 변경 제안 (POST proposal 경로) | `RescheduleClassifierService.java:94-103`: `newPrice`가 실제로 전달되면 인상 여부를 정확히 판정하고, null이면 가격 변경 없음으로 처리 | EventEditScreen에 가격 입력이 없고 `newPrice`를 보내지 않음 | 앱에서 가격 인상·인하 proposal 생성 불가(기존 가격은 그대로 유지) | Gap G-1 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| RescheduleChangeType 4값 | TIME,PLACE,PRICE,MULTI | @JsonValue 1:1 매핑 | 일치 |
| RescheduleClassification 2값 | AUTO,MAJOR | @JsonValue 1:1 매핑 | 일치 |
| RescheduleResponseStatus 5값 | PENDING,ACCEPTED,DECLINED,AUTO_ACCEPTED,WITHDRAWN | @JsonValue 1:1 매핑 | 일치 |
| batchId null (AUTO) | applied=true, batchId=null | BatchScreen 미진입 조건으로 처리 | 일치 |
| cancelStatus 타입 | ApplicationStatus enum 직렬화 | String?로 수신 후 fromString 변환 | 기능상 일치, 타입 안전성 약함 |
| eventStatus 타입 | EventStatus enum 직렬화 | String?로 수신 (enum 매핑 없음) | 약한 타입 |
| newPrice/hostMessage | POST 경로에 존재 | 앱은 POST 경로 사용하나 newPrice 미전송(UI 부재), hostMessage=changeReason 동일값 전송 | G-1: newPrice 미전달로 가격 인상 제안 불가 |
| 주소·좌표 | 서버 param 2종과 snapshot/apply가 nullable 좌표 pair 지원 | 주소 dirty 시 강제 geocoding 후 pair 전송, 실패 시 저장 차단 | 일치 |
| apply 후 캐시 무효화 | EventUpdatedEvent 발행 | eventDetailProvider invalidate 없음 | Gap G-2 |
| RESCHEDULE_APPLIED 라우팅 | type="RESCHEDULE_APPLIED" 알림 발송 | 이벤트 상세 fallback | Gap G-6 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | **G-1. newPrice 미전달 → 가격 변경 제안 불가** | 앱이 `POST /reschedule-proposals` 경로를 사용하나 `EventEditNotifier`가 `newPrice`를 채우지 않고 OPEN 편집 화면에 가격 변경 입력도 없음. | 앱에서는 가격 인상/인하 proposal 자체를 만들 수 없다. `newPrice=null`은 “변경 없음”이므로 현재 앱 경로에서 가격이 몰래 AUTO 반영되는 것은 아니다. | 가격 변경을 제품 범위에 넣을 때 입력 UI + `newPrice` 전송 + MAJOR 안내를 함께 배선 |
| P2 | **주소 변경 저장이 geocoding 가용성에 종속** | 주소 dirty인 오프라인 이벤트는 `geocodeAddress` 성공 전 proposal 호출을 막음 | geocoding key/외부 API 장애 시 시간 변경과 주소 변경을 함께 저장할 수 없음 | 의도한 안전장치로 유지하되 오류 telemetry와 재시도 UX 검증 |
| P2 | **G-2. apply 후 이벤트 상세 캐시 미무효화** | `rescheduleProposalActionNotifierProvider.applyBatch` 성공 후 `rescheduleProposalBatchProvider` invalidate만, `eventDetailProvider(eventId)` invalidate 없음. | 확정 후 이벤트 상세 화면에서 이전 시간/장소 표시. | `applyBatch` Provider에서 `eventDetailProvider(eventId).invalidate()` 추가. |
| P2 | **G-5. PENDING 소진 전 확정 차단** | `applyBatch`는 `pendingCount>0`이면 400. 대형 이벤트에서 1명 미응답 시 변경 미확정 지속. | 기본 1시간 fixed-delay 스케줄러가 48h 마감을 정리하지만 처리 시간·장애·설정 변경을 포함한 최대 지연 상한은 아니다. | 운영 정책 결정 — 스케줄러 주기/모니터링 강화 또는 부분 apply 정책 도입. |
| P2 | **G-7. PATCH vs POST 이중 계약 공존** | 두 서버 경로가 공존. 앱은 POST 직접 경로 사용, PATCH는 서버 내부 위임/하위호환으로만 유지. PATCH가 외부에 노출된 상태로 유지될 경우 혼용 위험. | 향후 API 통일 시 브레이킹 체인지 가능성. | 장기적으로 PATCH를 deprecated 처리하거나 서버 내부 전용으로 변경. |
| P1 | **마감 후 인라인 AUTO_ACCEPTED rollback** | `respond()`가 상태 저장 뒤 409 `RestException`을 throw하고 트랜잭션은 모든 Exception rollback이다. | 늦은 응답 자체는 자동 수락을 영속화하지 못해 다음 scheduler 실행 전 PENDING으로 남는다. | 전이를 별도 transaction으로 확정하거나 저장 없이 deadline error만 반환하도록 계약 정리 |
| P1 | **게스트-only MAJOR 빈 batch** | create loop는 `userId==null` 게스트를 제외한다. 계정 대상 0명이면 batchId와 count=0을 반환하지만 batch API는 row가 없어 NOT_FOUND다. | 앱이 반환 batchId로 이동한 직후 오류 화면. | 0-target AUTO 처리/생성 거부/별도 batch entity 중 하나 결정 |
| P2 | **path eventId 미검증** | batch GET/apply/delete controller는 path `eventId`를 service에 전달하지 않는다. service는 batch row의 실제 event 소유권은 검사하지만 URL eventId와 row eventId 일치는 검사하지 않는다. | URL 리소스 계층과 실제 대상이 불일치해 audit/cache 의미가 흐려진다. | eventId를 service에 전달해 batch 소속 검증 |
| P1 | **거절 후 자동 취소 완료 비보장** | cancellation 예외를 잡아 `autoCancelFailed=true`로 응답하고 ticket release도 best-effort다. | 거절 row는 확정됐지만 참가·환불·티켓 정리가 지연/불일치할 수 있다. | 재시도/운영 큐와 failed 상태 모니터링 |
| P2 | **현황 화면 snapshot** | batch FutureProvider는 최초 GET 한 번뿐이고 polling/socket이 없다. | 다른 참가자의 응답이 화면에 “실시간” 반영되지 않는다. | pull-to-refresh/polling/realtime 중 하나 연결 |
| P2 | **readyToApply 안내 문구 불일치** | 서버는 DECLINED를 허용하지만 화면 배너는 거절도 확정을 막는다고 안내한다. | 버튼 활성 상태와 설명이 모순된다. | 문구를 pending/withdrawn 기준으로 교정 |

## 9. 수용 기준

### AC-01. AUTO 변경 즉시 반영

Given 호스트가 30분 시간 변경(MAJOR 조건 미해당)을 제출한다.
When `POST /events/{eventId}/reschedule-proposals`가 성공한다.
Then 서버는 `applied=true, batchId=null`을 반환하고, 앱은 "경미한 변경으로 바로 반영됐습니다" 토스트를 표시하며 BatchScreen으로 이동하지 않는다.

### AC-02. MAJOR 변경 합의 시작

Given 호스트가 90분 시간 변경(MAJOR 조건)을 제출한다.
When `POST /events/{eventId}/reschedule-proposals`가 성공한다.
Then 서버는 `applied=false, batchId=<uuid>`를 반환하고, 각 ATTENDING/WAITING 참가자에게 `EVENT_UPDATED(type=RESCHEDULE_PROPOSAL)` 알림이 발송되며, 앱은 `RescheduleProposalBatchScreen`으로 이동한다.

### AC-03. 참가자 동의 응답

Given 참가자가 PENDING proposal을 수신하고 마감 전 동의 버튼을 누른다.
When `POST /reschedule-proposals/{proposalId}/response`(accept=true)가 성공한다.
Then proposal.status=ACCEPTED, `autoCancelTriggered=false`, 화면은 수락 확인 상태를 표시한다.

### AC-04. 참가자 거절 → 100% 환불

Given 참가자가 PENDING proposal을 마감 전 거절한다.
When `POST /reschedule-proposals/{proposalId}/response`(accept=false)가 성공한다.
Then proposal.status=DECLINED, `autoCancelTriggered=true`가 된다. 취소 성공 시 `cancelStatus`가 CANCELED 또는 CANCEL_PENDING_REFUND이고 `RESCHEDULE_DECLINED`(100%, 수수료 0%) 정책을 적용한다. 예외 시 DECLINED는 유지되면서 `autoCancelFailed=true`, cancelStatus=null일 수 있다.

### AC-05. 48h 마감 후 자동 수락

Given MAJOR 제안 생성 48시간 후 PENDING row가 남아 있다.
When 스케줄러가 `markExpiredAsAutoAccepted`를 실행한다.
Then 해당 row status가 AUTO_ACCEPTED로 전이된다. 스케줄러 실행 전 늦은 응답은 409를 받지만 인라인 AUTO_ACCEPTED save는 rollback된다.

### AC-06. batch 확정 (readyToApply=true)

Given `pendingCount==0 && withdrawnCount==0`인 batch에서 호스트가 확정을 누른다.
When `POST /reschedule-proposals/{batchId}/apply`가 성공한다.
Then 이벤트 필드가 제안값으로 반영되고, ACCEPTED+AUTO_ACCEPTED 참가자에게 `EVENT_UPDATED(type=RESCHEDULE_APPLIED)` 알림이 발송된다.

### AC-07. pendingCount>0 확정 차단

Given `pendingCount>0`인 batch에서 호스트가 확정을 시도한다.
When `POST /reschedule-proposals/{batchId}/apply`가 호출된다.
Then `RESCHEDULE_BATCH_NOT_READY_FOR_APPLY(400)`이 반환되고 이벤트 필드는 변경되지 않는다.

### AC-08. 알림 딥링크 → 응답 화면 직행

Given 참가자가 `EVENT_UPDATED(type=RESCHEDULE_PROPOSAL)` 알림을 수신한다.
When 알림을 탭한다.
Then `notification_router`가 `proposalId`를 추출해 `/me/reschedule-proposals/{proposalId}`로 이동하고 `RescheduleProposalResponseScreen`이 열린다.

### AC-09. 주소 변경 시 좌표 동기화

Given OPEN 오프라인 이벤트에서 호스트가 주소를 변경한다.
When 앱이 주소 geocoding에 성공하고 proposal을 제출한다.
Then `newLatitude/newLongitude`가 pair로 전송되고, AUTO면 즉시 event에 반영되며 MAJOR면 snapshot을 거쳐 batch apply 시 반영된다. geocoding 실패, 한쪽 좌표 누락, 범위 밖 또는 `(0,0)`은 저장되지 않는다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | G-1 앱 가격 변경 제안 부재 | 서버 분류기는 전달된 `newPrice`를 정상 판정한다. 이벤트 편집 화면에 가격 변경 입력 UI 추가 + `newPrice` 전송 배선이 필요하다. |
| 구현 | G-2 캐시 무효화 | `applyBatch` Provider에 `eventDetailProvider.invalidate()` 추가(단순 수정). |
| 구현 | G-6 RESCHEDULE_APPLIED 전용 라우팅 | 확정 후 UX 흐름 설계 결정 후 구현. |
| 정책 | G-5 대형 이벤트 1명 미응답 차단 | 운영 정책: 스케줄러 48h 완화책 유지 vs 부분 apply 정책 도입 결정. |
| 사업 | hostMessage 분리 여부 | 현재 앱은 hostMessage=changeReason 동일값 전송. 호스트가 참가자에게 별도 메시지를 보낼 수 있어야 하는지 사업 결정. |
| 테스트 | AUTO/MAJOR 분류기 경계값 | 60분 정확히 = MAJOR인지 59분 = AUTO인지 경계 테스트. |
| 테스트 | 동시성 — 같은 batch 복수 apply 시도 | pessimistic lock + applyBatch 경합 시나리오 검증. |
| cross-ref | 분쟁 소명 연계 | 일정 변경으로 인한 취소 분쟁은 `../18_dispute_resolution/F18-03_dispute-appeal_prd.md` 참조. |

## 11. 변경 이력

- **2026-07-29 (주소-좌표 재동기화 current source 실측)**: `EventRescheduleParam` 7필드, `RescheduleProposalCreateParam` 9필드로 교정했다. Flutter가 주소 dirty 시 강제 geocoding하고 좌표 pair를 보내며, 서버가 AUTO 즉시 적용/MAJOR snapshot round-trip/기존 좌표 유지/`INVALID_COORDINATES`를 처리하는 계약과 테스트를 반영했다. G-1 영향도 “무동의 가격 인상”이 아니라 “앱 가격 변경 제안 부재”로 정정했다.
