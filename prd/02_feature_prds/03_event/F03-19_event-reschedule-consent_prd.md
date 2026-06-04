# F03-19. 일정 변경 제안·참가자 합의 (RS-002) PRD

<!-- 작성일: 2026-06-05 -->
<!-- 소스 기준: community_api 86356e5/46c8335, community_app f4109a0/95e0c5f/6c2d5f6 -->

## 1. 결론

일정 변경 합의(RS-002)는 **서버 계약, 분류기 로직, 상태기계, 환불 연계, 스케줄러, 알림 딥링크, 화면 3종**까지 구현이 닫혀 있다.

분류기(`RescheduleClassifierService`)가 변경 규모를 AUTO/MAJOR로 분류한다. AUTO이면 즉시 이벤트에 반영하고 `EVENT_UPDATED(type=RESCHEDULE)` 알림만 발송하며 proposal row를 생성하지 않는다. MAJOR이면 참가자 1명당 proposal row를 생성하고, 48시간 이내 명시 응답을 기다리며, 스케줄러가 1시간 주기로 마감된 PENDING을 AUTO_ACCEPTED로 일괄 전이한다. 호스트가 모든 PENDING이 소진됐을 때 `applyBatch`를 호출해야 이벤트에 반영된다. 참가자가 DECLINED하면 100% 환불 + 호스팅 티켓 release가 즉시 발생한다.

앱은 `EventEditNotifier`에서 `rescheduleProposalRepository.createProposal()`을 직접 호출해 `POST /api/v1/events/{eventId}/reschedule-proposals`(직접 POST 경로)를 사용한다. `RescheduleProposalCreateParam`에 newStartTime/newEndTime/newAddress/newAddressDetail/changeReason/hostMessage(=changeReason과 동일값)를 채우며, **newPrice는 채우지 않는다** — 가격 변경 입력 UI 자체가 없어 가격 인상 제안은 현재 불가(G-1). 두 서버 경로(`PATCH /reschedule`과 `POST /reschedule-proposals`)가 공존하며 PATCH는 서버 내부에서 위임/하위호환 경로로 유지된다(G-7). apply 후 이벤트 상세 캐시 무효화(G-2), 전원 응답 전 확정 차단(G-5), RESCHEDULE_APPLIED 알림 전용 라우팅 미구현(G-6)이 미완 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/src/main/java/com/endside/community/event/reschedule/controller/RescheduleProposalController.java` | 7개 endpoint, 권한, 응답 타입 |
| Backend Service | `event/reschedule/service/EventRescheduleProposalService.java` | 상태 전이 조건, 환불 연계, 스케줄러 연결, 알림 발송 |
| Backend Classifier | `event/reschedule/service/RescheduleClassifierService.java:37-105` | AUTO/MAJOR 분류 조건 코드 직접 확인 |
| Backend Enum | `constants/RescheduleChangeType.java`, `RescheduleClassification.java`, `RescheduleResponseStatus.java` | 4값/2값/5값 직접 확인 |
| Backend Param | `param/RescheduleProposalCreateParam.java`, `param/RescheduleResponseParam.java` | 필드 목록 직접 확인 |
| Backend VO | `vo/RescheduleProposalResultVo.java`, `vo/RescheduleProposalBatchVo.java`, `vo/RescheduleProposalViewVo.java`, `vo/RescheduleResponseResultVo.java`, `vo/RescheduleChangeDiffVo.java`, `vo/RescheduleEventMetaVo.java` | 응답 필드 구조 |
| Backend Scheduler | `scheduler/EventRescheduleProposalScheduler.java:31` | fixedDelay 3600000ms=1h |
| Backend Entity | `model/EventRescheduleProposal.java:41-102`, `V1__init.sql:4545-4568` | 테이블 컬럼, 인덱스, UNIQUE |
| Frontend API | `community_app/lib/data/api/reschedule_proposal_api.dart` | Retrofit endpoint 배선 |
| Frontend Models | `lib/data/models/reschedule/` (12개), `models/event/event_reschedule_param.dart` | Dart 모델 필드, @JsonValue 매핑 |
| Frontend Screens | `presentation/event/screens/reschedule_proposal_batch_screen.dart`, `reschedule_proposal_response_screen.dart`, `my_reschedule_proposals_screen.dart`, `event_edit_screen.dart:549-573` | 화면 역할, 분기 조건 |
| Frontend Providers | `domain/providers/event/reschedule_proposal_providers.dart:19-176` | Provider 6개 |
| Frontend Router | `core/router/routes.dart:338-350`, `app_router.dart:498-526` | 경로 상수, 화면 연결 |
| Frontend Notification | `core/utils/notification_router.dart:34-39, 382-389` | EVENT_UPDATED 서브타입 딥링크 |
| Verification | `EventRescheduleProposalService.java` 내 respond/markExpiredAsAutoAccepted/withdraw 메서드 | 상태 전이 조건 직접 확인 |

## 3. 전체 동작 흐름

### 3-1. 호스트가 일정 변경 제안하는 흐름 (직접 POST 경로)

1. 호스트가 `event_edit_screen.dart`에서 시간/장소/변경사유를 입력하고 저장 버튼을 누른다.
2. `EventEditNotifier.submit()`이 `rescheduleProposalRepository.createProposal(eventId, RescheduleProposalCreateParam)`을 직접 호출한다 (`event_edit_provider.dart:348-361`).
3. `POST /api/v1/events/{eventId}/reschedule-proposals`로 `RescheduleProposalCreateParam`(newStartTime, newEndTime, newAddress?, newAddressDetail?, changeReason, hostMessage=changeReason)이 전달된다. **newPrice는 채우지 않는다** — 가격 변경 입력 UI 부재로 가격 인상 제안은 현재 불가.
4. 서버 `RescheduleProposalController`가 `createProposal`을 직접 처리한다.
5. `RescheduleClassifierService.classify(event, param)`이 AUTO 또는 MAJOR를 결정한다.
   - **AUTO 경로**: 이벤트 필드 즉시 반영 → `EVENT_UPDATED(type=RESCHEDULE)` 알림 → proposal row 미생성 → `applied=true, batchId=null` 반환.
   - **MAJOR 경로**: ATTENDING+WAITING 참가자 1명당 proposal row 생성(status=PENDING, 48h 마감) → 각 참가자에게 `EVENT_UPDATED(type=RESCHEDULE_PROPOSAL, proposalId=<id>, batchId=<uuid>)` 알림 → `applied=false, batchId=<uuid>` 반환.
6. `event_edit_screen.dart:549-573`이 `lastRescheduleProposalResult`를 확인한다.
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
   - DECLINED: proposal.status = DECLINED → `EventParticipationCancellationService.cancelMyParticipation(RefundFaultCategory.RESCHEDULE_DECLINED)` 호출 → 100% 환불 + hosting ticket release.
8. 화면은 `RescheduleResponseResultVo`(proposal 상태, autoCancelTriggered, cancelStatus)를 표시한다.

### 3-3. 호스트가 batch를 확정·철회하는 흐름

1. 호스트가 `RescheduleProposalBatchScreen`에서 응답 현황(`totalCount`, `acceptedCount`, `declinedCount`, `pendingCount` 등)을 확인한다.
2. `readyToApply=true`(pendingCount==0 && withdrawnCount==0)이면 "확정" 버튼 활성.
3. 확정: `POST /api/v1/events/{eventId}/reschedule-proposals/{batchId}/apply` → 이벤트 필드 반영 + ACCEPTED/AUTO_ACCEPTED 참가자에게 `EVENT_UPDATED(type=RESCHEDULE_APPLIED)` 알림 + `EventUpdatedEvent` 발행(캘린더 sync).
4. 철회: `DELETE /api/v1/events/{eventId}/reschedule-proposals/{batchId}` → 모든 row status=WITHDRAWN(soft-delete, audit 보존).

### 3-4. 스케줄러 자동 수락 흐름

1. `EventRescheduleProposalScheduler`가 1시간 주기(`fixedDelayString=3600000ms`)로 `markExpiredAsAutoAccepted`를 호출한다.
2. QueryDSL bulk UPDATE: `WHERE status=PENDING AND response_deadline_at < now` → AUTO_ACCEPTED 전이.
3. 마감 후 늦은 응답 시도 시: `respond()` 인라인 `!now.isBefore(deadline)` 체크 → PENDING row를 AUTO_ACCEPTED로 전이 후 `RESCHEDULE_RESPONSE_DEADLINE_PASSED(409)` 반환.

## 4. 서버 계약

### 4-1. Endpoint 표

| Method | Path | 권한 | Request | Response | 용도 |
|---|---|---|---|---|---|
| `PATCH` | `/api/v1/events/{eventId}/reschedule` | host/cohost | `EventRescheduleParam` (5필드) | `EventVo` | 기존 호환 진입점 → 내부 위임 (앱 미사용, 서버 하위호환) |
| `POST` | `/api/v1/events/{eventId}/reschedule-proposals` | host/cohost | `RescheduleProposalCreateParam` (7필드) | `RescheduleProposalResultVo` 201 | 직접 제안 생성 (**앱 사용 경로** — `event_edit_provider.dart:349`) |
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
| newStartTime | LocalDateTime | @NotNull | startTime |
| newEndTime | LocalDateTime | @NotNull | endTime |
| newAddress | String | nullable | address (변경된 경우만) |
| newAddressDetail | String | nullable | addressDetail (변경된 경우만) |
| **newPrice** | BigDecimal | nullable | **미전송** (가격 변경 UI 부재) |
| changeReason | String | @NotBlank @Size(max=200) | reason |
| **hostMessage** | String | @Size(max=500), nullable | reason (changeReason과 동일값) |

`EventRescheduleParam` (기존 PATCH 경로, **서버 내부 위임/하위호환 — 앱 미사용**):

| 필드 | 타입 | 제약 |
|---|---|---|
| newStartTime | LocalDateTime | @NotNull |
| newEndTime | LocalDateTime | @NotNull |
| newAddress | String | nullable |
| newAddressDetail | String | nullable |
| changeReason | String | @NotBlank @Size(max=200) |

소스: `EventRescheduleParam.java`, `RescheduleProposalCreateParam.java`

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
  → DECLINED      : 참가자 accept=false 응답 (respond(), 마감 전) → 100% 환불 + ticket release
  → AUTO_ACCEPTED : 스케줄러 bulk UPDATE (deadline < now, status=PENDING 조건부 원자 update)
                    또는 마감 후 늦은 응답 시도 시 인라인 전이 → 409 반환
  → WITHDRAWN     : 호스트 batch 철회 (withdraw(), 이미 응답한 row 포함 일괄)

ACCEPTED / AUTO_ACCEPTED / DECLINED : 응답 완료 (변경 불가)
WITHDRAWN : 소프트 삭제 (행 보존, audit 용)
```

applyBatch 조건: `pendingCount==0 && withdrawnCount==0` (readyToApply=true). 위반 시 `RESCHEDULE_BATCH_NOT_READY_FOR_APPLY(400)`.

소스: `EventRescheduleProposalService.java:229-283(respond)`, `markExpiredAsAutoAccepted:454-463`, `applyBatch:309-313`

### 4-7. 환불 연계

DECLINED 시 `EventParticipationCancellationService.cancelMyParticipation`을 `RefundFaultCategory.RESCHEDULE_DECLINED`로 호출.

`RESCHEDULE_DECLINED` = 100% 환불 + 수수료 강제 0% + hosting ticket release.

소스: `EventRescheduleProposalService.java:534-537`, `RefundFaultCategory.java:31`, `EventPaymentRefundService.java:371,392`

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
| before_json | json | N | {startTime,endTime,address,addressDetail,price} |
| after_json | json | N | 동일 구조 |
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

**`RescheduleProposalResponseScreen` (참가자)**
- `myRescheduleProposalProvider(proposalId)`로 단건 조회.
- typed diff(before/after 시간/장소/가격), 이벤트 메타 표시.
- `canRespond=false` 시 상태 표시만.
- 거절 시 `cancelStatus` 결과 표시 (환불 금액 미노출).
- 알림 탭(type=RESCHEDULE_PROPOSAL) 직접 진입 가능.

**`MyRescheduleProposalsScreen` (참가자)**
- 본인 수신 proposal 목록(무한 페이징, status 필터).
- 프로필 화면 "일정 변경 요청" 메뉴로 진입(`/me/reschedule-proposals`).
- 탭 시 `RescheduleProposalResponseScreen` 이동.

**`EventEditScreen` — reschedule 분기**
- `POST /events/{eventId}/reschedule-proposals` 성공 후 `lastRescheduleProposalResult` 분기:
  - `applied=true` → 토스트 "경미한 변경으로 바로 반영됐습니다"
  - `applied=false && batchId != null` → `pushReplacement` → BatchScreen.

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
| 참가자 — PENDING + 마감 후 인라인 체크 | `!now.isBefore(deadline)` → AUTO_ACCEPTED 전이 + 409 | 409 수신 → 에러 표시 | 갱신 후 차단 | 일치 |
| 참가자 — ACCEPTED | 응답 완료 | canRespond=false → 상태 표시 | 재응답 불가 | 일치 |
| 참가자 — DECLINED | 100% 환불 + ticket release 발생 | cancelStatus 표시 | 취소 확인 | 일치 |
| 참가자 — AUTO_ACCEPTED | 스케줄러 전이 | 상태 표시 | 자동 수락 확인 | 일치 |
| 참가자 — WITHDRAWN | 호스트 철회 | 목록에서 WITHDRAWN 상태 표시 | 철회 확인 | 일치 |
| 가격 인상 변경 (POST proposal 경로 — 앱이 newPrice를 전송하지 않아 가격 인상 판정 불가) | `RescheduleClassifierService.java:94-103`: newPrice==null이면 가격 인상 체크 false 반환 → 분류기 가격인상 판정 불가 | EventEditScreen이 newPrice 전달 못함 | MAJOR 미분류 위험 | Gap G-1 |

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
| apply 후 캐시 무효화 | EventUpdatedEvent 발행 | eventDetailProvider invalidate 없음 | Gap G-2 |
| RESCHEDULE_APPLIED 라우팅 | type="RESCHEDULE_APPLIED" 알림 발송 | 이벤트 상세 fallback | Gap G-6 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | **G-1. newPrice 미전달 → 가격 인상 제안 불가** | 앱이 `POST /reschedule-proposals` 경로를 사용하나 `EventEditNotifier`가 `newPrice`를 채우지 않음 (`event_edit_provider.dart:349-361`). 가격 변경 입력 UI 자체 미구현. 분류기가 newPrice=null로 수신해 가격 인상 케이스를 MAJOR로 분류하지 못함. | 가격 인상 변경이 분류기 가격 체크를 통과 못해 AUTO로 즉시 반영될 위험. 참가자 합의 없이 가격 인상 적용 가능. | 이벤트 편집 화면에 가격 변경 UI 추가 + `RescheduleProposalCreateParam.newPrice` 전송 배선. |
| P2 | **G-2. apply 후 이벤트 상세 캐시 미무효화** | `rescheduleProposalActionNotifierProvider.applyBatch` 성공 후 `rescheduleProposalBatchProvider` invalidate만, `eventDetailProvider(eventId)` invalidate 없음. | 확정 후 이벤트 상세 화면에서 이전 시간/장소 표시. | `applyBatch` Provider에서 `eventDetailProvider(eventId).invalidate()` 추가. |
| P2 | **G-5. 전원 응답 전 확정 차단** | `applyBatch`는 `pendingCount>0`이면 400. 대형 이벤트에서 1명 미응답 시 변경 미확정 지속. | 스케줄러 48h 완화책 있으나 최대 1시간 SLA 갭. | 운영 정책 결정 — 스케줄러 주기 단축 또는 부분 apply 정책 도입. |
| P2 | **G-6. RESCHEDULE_APPLIED 알림 전용 라우팅 미구현** | `notification_router.dart:43-51`: type="RESCHEDULE_APPLIED"는 이벤트 상세 fallback 처리. | 변경 확정 후 도착하는 알림이 일반 상세로만 연결됨. 전용 "변경 확정" UI 없음. | 전용 라우팅 화면 설계 또는 상세 화면 내 변경 확정 배너 추가. |
| P2 | **G-7. PATCH vs POST 이중 계약 공존** | 두 서버 경로가 공존. 앱은 POST 직접 경로 사용, PATCH는 서버 내부 위임/하위호환으로만 유지. PATCH가 외부에 노출된 상태로 유지될 경우 혼용 위험. | 향후 API 통일 시 브레이킹 체인지 가능성. | 장기적으로 PATCH를 deprecated 처리하거나 서버 내부 전용으로 변경. |

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
Then proposal.status=DECLINED, `autoCancelTriggered=true`, `cancelStatus`가 CANCELED 또는 CANCEL_PENDING_REFUND를 반환한다. 환불 귀책은 `RESCHEDULE_DECLINED`(100%, 수수료 0%)가 적용된다.

### AC-05. 48h 마감 후 자동 수락

Given MAJOR 제안 생성 48시간 후 PENDING row가 남아 있다.
When 스케줄러가 `markExpiredAsAutoAccepted`를 실행한다.
Then 해당 row status가 AUTO_ACCEPTED로 전이된다. 참가자가 이후 응답 시도 시 409를 수신한다.

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

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | G-1 가격 인상 분류기 미동작 | 앱은 이미 POST 직접 경로 사용 중. 이벤트 편집 화면에 가격 변경 입력 UI 추가 + `newPrice` 전송 배선만 필요. |
| 구현 | G-2 캐시 무효화 | `applyBatch` Provider에 `eventDetailProvider.invalidate()` 추가(단순 수정). |
| 구현 | G-6 RESCHEDULE_APPLIED 전용 라우팅 | 확정 후 UX 흐름 설계 결정 후 구현. |
| 정책 | G-5 대형 이벤트 1명 미응답 차단 | 운영 정책: 스케줄러 48h 완화책 유지 vs 부분 apply 정책 도입 결정. |
| 사업 | hostMessage 분리 여부 | 현재 앱은 hostMessage=changeReason 동일값 전송. 호스트가 참가자에게 별도 메시지를 보낼 수 있어야 하는지 사업 결정. |
| 테스트 | AUTO/MAJOR 분류기 경계값 | 60분 정확히 = MAJOR인지 59분 = AUTO인지 경계 테스트. |
| 테스트 | 동시성 — 같은 batch 복수 apply 시도 | pessimistic lock + applyBatch 경합 시나리오 검증. |
| cross-ref | 분쟁 소명 연계 | 일정 변경으로 인한 취소 분쟁은 `../18_dispute_resolution/F18-03_dispute-appeal_prd.md` 참조. |
