# F03-19. 일정 변경 제안·참가자 합의 (RS-002) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- 작성일: 2026-06-05 -->
<!-- 소스 기준 갱신: 2026-07-29 community_api/community_app current source -->

## 1. 결론

일정 변경 합의(RS-002)는 **서버 계약, 분류기 로직, 상태기계, 환불 연계, 스케줄러, 알림 딥링크, 화면 3종**까지 구현이 닫혀 있다.

분류기(`RescheduleClassifierService`)가 변경 규모를 AUTO/MAJOR로 분류한다. AUTO이면 즉시 이벤트에 반영하고 `EVENT_UPDATED(type=RESCHEDULE)` 알림만 발송하며 proposal row를 생성하지 않는다. MAJOR이면 동의 대상(계정이 있는 참석·대기자, 참석 행 없이 돈을 냈거나 입금을 신고한 진행 중 신청자, 결제 행 없는 심사 대기·결제 대기 신청자)마다 proposal row를 만들고 48시간 이내 명시 응답을 기다린다. 동의 대상이 0명이면 기다리지 않고 바로 적용한다. fixed-delay 스케줄러가 마감된 PENDING을 AUTO_ACCEPTED로 일괄 전이한 뒤 호스트가 `applyBatch`를 호출해야 이벤트에 반영된다. 참가자가 DECLINED하면 100%·수수료 0 환불 정책으로 자동 취소를 시도하지만 예외는 `autoCancelFailed=true`로 흡수되고, hosting ticket release도 best-effort라 즉시 완료를 보장하지 않는다.

앱은 `EventEditNotifier`에서 `rescheduleProposalRepository.createProposal()`을 직접 호출해 `POST /api/v1/events/{eventId}/reschedule-proposals`(직접 POST 경로)를 사용한다. `RescheduleProposalCreateParam`에 newStartTime/newEndTime/newAddress/newAddressDetail/**newLatitude/newLongitude**/changeReason/hostMessage(=changeReason과 동일값)를 채우며, **newPrice는 채우지 않는다** — 가격 변경 입력 UI 자체가 없어 가격 변경 제안은 현재 불가(G-1). 주소가 바뀌면 저장 전에 서버 geocoding API로 좌표를 다시 구하고, 실패하면 저장을 막는다. 두 서버 경로(`PATCH /reschedule`과 `POST /reschedule-proposals`)가 공존하며 PATCH는 서버 내부에서 위임/하위호환 경로로 유지된다(G-7). apply 후 이벤트 상세 캐시 무효화(G-2), 전원 응답 전 확정 차단(G-5), RESCHEDULE_APPLIED 알림 전용 라우팅 미구현(G-6)이 미완 Gap이다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `RescheduleProposalController`, `EventRescheduleProposalService`, `RescheduleClassifierService`, `RescheduleChangeType`, `RescheduleClassification`, `RescheduleResponseStatus`, `RescheduleProposalCreateParam`, `RescheduleResponseParam`, `RescheduleProposalResultVo`, `RescheduleProposalBatchVo`. 앱: `reschedule_proposal_batch_screen.dart`, `reschedule_proposal_response_screen.dart`, `my_reschedule_proposals_screen.dart`, `event_edit_screen.dart`, `reschedule_proposal_api.dart`, `event_edit_provider.dart`, `geocoding_repository.dart`, `geocoding_api.dart`, `reschedule_proposal_providers.dart`, `routes.dart`.

## 3. 전체 동작 흐름

### 3-1. 호스트가 일정 변경 제안하는 흐름 (직접 POST 경로)

1. 호스트가 `event_edit_screen.dart`에서 시간/장소/변경사유를 입력하고 저장 버튼을 누른다.
2. 주소가 dirty인 오프라인 이벤트면 `EventEditNotifier._resolveAddressCoordinatesIfNeeded()`가 `GeocodingRepository.geocodeAddress(address)`를 호출한다. 성공 시 새 위도/경도를 state에 저장하고, 실패 또는 빈 주소면 address error를 남기고 저장을 중단한다. 주소가 바뀌지 않았으면 기존 좌표를 그대로 둔다.
3. `EventEditNotifier`가 `rescheduleProposalRepository.createProposal(eventId, RescheduleProposalCreateParam)`을 직접 호출한다.
4. `POST /api/v1/events/{eventId}/reschedule-proposals`로 `RescheduleProposalCreateParam`(newStartTime, newEndTime, newAddress?, newAddressDetail?, newLatitude?, newLongitude?, changeReason, hostMessage=changeReason)이 전달된다. 새 좌표는 주소가 바뀐 경우에만 pair로 보낸다. **newPrice는 채우지 않는다** — 가격 변경 입력 UI 부재로 가격 변경 제안은 현재 불가.
5. 서버 `RescheduleProposalController`가 `createProposal`을 직접 처리한다. 좌표는 둘 다 없으면 기존값 보존, 한쪽만 있거나 범위 밖 또는 `(0,0)`이면 `INVALID_COORDINATES`로 거부한다.
6. `RescheduleClassifierService.classify(event, param)`이 AUTO 또는 MAJOR를 결정한다.
   - **AUTO 경로**: 이벤트 필드 즉시 반영 → `EVENT_UPDATED(type=RESCHEDULE)` 알림 → proposal row 미생성 → `applied=true, batchId=null` 반환.
   - **MAJOR 경로**: 동의 대상마다 proposal row 생성(status=PENDING, 48h 마감) → 각 대상에게 `EVENT_UPDATED(type=RESCHEDULE_PROPOSAL, proposalId=<id>, batchId=<uuid>)` 알림 → `applied=false, batchId=<uuid>` 반환. 동의 대상은 작은 변경의 알림·큰 변경의 동의·확정 알림이 함께 쓰는 한 명단이다: 계정이 있는 참석·대기자, 그 밖에 돈을 냈거나 입금을 신고했고 신청이 진행 중인 회원, 그 밖에 결제 행 없는 심사 대기·결제 대기 신청자. 게스트 행은 응답할 계정이 없어 빠지고 데려온 회원이 일행 대표로 받는다. 대상이 0명이면 같은 트랜잭션에서 바로 적용하고 응답 모양은 AUTO 와 같다(batchId 없음).
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

## 4. 제품 규칙

### 분류
- 큰 변경(MAJOR)은 시작 시각 60분 이상 변경 또는 가격 인상이다. 나머지는 작은 변경(AUTO)이다.
- 장소 변경은 동의를 받지 않는다. 바로 적용하고 참가자에게 알린다(2026-11-02 사용자 결정). 변경 종류 기록(`PLACE`·`MULTI`)에만 쓴다.
- 장소 이름만 바뀌어도 장소 변경으로 적는다. 공백뿐인 이름은 없음과 같다. 좌표만 바뀐 것은 장소 변경이 아니다.

### 입력
- 새 시작·종료는 필수이고 시작은 현재 이후, 종료는 시작 이후다. 변경 사유는 필수이고 200자, 호스트 메시지는 500자까지다.
- 좌표는 둘 다 비우면 기존 값을 유지한다. 한쪽만 주거나 범위를 벗어나거나 (0,0) 이면 `INVALID_COORDINATES` 다.

### 대상과 묶음
- 동의 대상은 계정이 있는 참석·대기자, 참석 행 없이 돈을 냈거나 입금을 신고한 진행 중 신청자, 결제 행 없는 심사 대기·결제 대기 신청자다. 마지막 무리를 빼면 동의를 묻는 사이 참가를 마치고 바뀐 모임에 묶이기 때문이다. 큰 변경이라도 대상이 0명이면 바로 적용한다.
- 같은 모임에 적용도 철회도 안 된 묶음이 있으면 새 제안을 받지 않는다.
- 철회는 이미 적용된 묶음이면 `RESCHEDULE_BATCH_ALREADY_APPLIED` 다. 모임 상태는 보지 않아 취소된 모임의 제안도 정리한다.
- 호스트 철회는 이미 응답한 행까지 `WITHDRAWN` 으로 바꾸고 행은 기록으로 남기며, 참석자에게 철회 알림을 보낸다. 거절자의 자동 취소는 되돌리지 않는다. 다시 철회해도 오류 없이 아무 일도 하지 않는다.
- 거절(`DECLINED`)은 확정을 막지 않는다. 거절한 사람은 자동 취소로 빠진다.
- 끝난 모임의 응답은 거절한다. 거절 응답 결과에는 취소 상태만 있고 환불 금액은 없다.

### 가격
- 가격이 바뀌는 적용은 선결제 금액도 함께 맞춰 환불액이 실제 결제액과 어긋나지 않게 한다.
- 무료에서 유료로 바뀌면 결제 수단을 지금 열린 수단에서 고르고, 고를 수 없으면 거절한다(F03-03 §4.1).

### 알림
| 때 | 받는 사람 |
|---|---|
| 큰 변경 제안 | 참가자 각각, 응답 화면으로 바로 |
| 묶음 확정 | 동의·자동 동의한 참가자 |
| 작은 변경 적용 | 참가자 전원 |

### 화면
- 호스트 현황은 자동으로 갱신되지 않는다. 처리하거나 다시 시도할 때 새로 읽는다.
- 응답 기한은 절대 시각으로 보이고 남은 시간 카운트다운은 없다.

### 오류의 뜻
| 코드 | 뜻 |
|---|---|
| `RESCHEDULE_ALREADY_RESPONDED` | 이미 응답함 |
| `RESCHEDULE_RESPONSE_DEADLINE_PASSED` | 응답 기한 지남 |
| `RESCHEDULE_BATCH_PENDING_EXISTS` | 진행 중인 제안이 있음 |
| `RESCHEDULE_BATCH_WITHDRAWN` | 철회된 제안 |

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
| 해소됨 | **게스트-only MAJOR 빈 batch** | 동의 대상이 0명이면 제안 행을 만들지 않고 같은 트랜잭션에서 바로 적용하며 batchId 없이 AUTO 와 같은 응답을 준다. | 없는 batchId 로 이동하는 일이 없다. | 없음 |
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
