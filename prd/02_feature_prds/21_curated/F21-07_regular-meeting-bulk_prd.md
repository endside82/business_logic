# F21-07. 정기모임 묶음 배정·정산 PRD

## 1. 결론

정기모임 묶음 배정(`POST /api/v1/regular-meetings/{meetingId}/assignments`)과 묶음 정산(`POST /api/v1/regular-meetings/{meetingId}/settlements`) 모두 서버와 Flutter 양쪽에서 구현이 닫혀 있다. 묶음 배정은 단일 트랜잭션(한 회차 실패 시 전체 롤백)이고, 묶음 정산만 회차별 독립 트랜잭션(`NOT_SUPPORTED`)으로 부분 성공을 허용하며 결과를 `BulkSettleStatus` 6종으로 반환한다. BLOCKED 상태 회차는 호스트가 해당 회차의 배정 화면으로 이동해 분담금 현황을 확인하고 조치해야 한다. meetingId는 `RegularMeetingVo.id` (정기모임 자체 ID)이고, 서버는 `getRegularMeetingSessionEventIds`로 그 활성 세션들의 eventId 목록을 추출해 각 회차에 작업한다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `ServiceAssignmentController.java` | `POST /api/v1/regular-meetings/{meetingId}/assignments`, `POST .../settlements` |
| Backend Service (배정) | `ServiceAssignmentService.java` → `bulkAssignToRegularMeeting` | 권한·중복 skip·독립 생성 |
| Backend Service (정산) | `ServiceAssignmentService.java` → `bulkSettleRegularMeeting` | `NOT_SUPPORTED` 전파 격리·회차별 result·classifyBulkSettle |
| Backend Enum | `BulkSettleStatus.java` | `SETTLED`, `ALREADY_SETTLED`, `NO_ASSIGNMENT`, `SKIPPED_NOT_READY`, `BLOCKED`, `FAILED` |
| Backend Model | `ServiceAssignment.java` | `eventId`(회차 owner), `status` |
| Backend Port | `CuratedEventAccessPort.java` | `assertRegularMeetingHost`, `getRegularMeetingSessionEventIds` |
| Frontend API | `service_assignment_api.dart` | `createBulkAssignments`, `bulkSettle` |
| Frontend Repository | `service_assignment_repository.dart` | `Result<List<...>>` |
| Frontend Screen | `regular_meeting_bulk_settle_screen.dart` | `RegularMeetingBulkSettleScreen`, `_ResultCard`, `BLOCKED needsHostAction` → 이동 |
| Frontend Model | `service_assignment_bulk_settle_result_vo.dart` | `eventId`, `assignmentId`, `status`, `reason` |
| Verification | 서버 유닛 테스트 / codex 합의 PASS | 부분 성공·권한 게이트 |

## 3. 전체 동작 흐름

### 3-A. 묶음 배정(bulkAssignToRegularMeeting)

1. 호스트가 정기모임 화면에서 제공자를 배정한다(앱에서 별도 라우트 없이 인라인 CTA).
2. `ServiceAssignmentRepository.createBulkAssignments(meetingId, ServiceAssignmentCreateParam(providerUserId, assignmentSource, providerRole))` 호출.
3. 서버 `ServiceAssignmentService.bulkAssignToRegularMeeting`:
   - `assertRegularMeetingHost(regularMeetingId, hostUserId)` 권한 검증 (세션 0개여도 1회 실행)
   - `getRegularMeetingSessionEventIds(regularMeetingId)` — 활성 세션 eventId 목록
   - 각 eventId에 대해: 이미 배정 존재하면 skip(멱등) / 없으면 `createAssignment` 호출
4. 생성된 배정 목록 반환(`List<ServiceAssignmentVo>`). 이미 배정된 회차는 응답에 포함되지 않는다.

### 3-B. 묶음 정산(bulkSettleRegularMeeting)

1. 호스트가 `RegularMeetingBulkSettleScreen`에서 "제공자 선택" → `ProviderPickerSheet.show` → "묶음 정산 실행" 버튼.
2. `ServiceAssignmentRepository.bulkSettle(meetingId, ServiceAssignmentBulkSettleParam(providerUserId))` 호출.
3. 서버 `ServiceAssignmentService.bulkSettleRegularMeeting` (`@Transactional(propagation=NOT_SUPPORTED)`):
   - `assertRegularMeetingHost` 권한 (세션 0개여도 1회 실행)
   - `getRegularMeetingSessionEventIds(regularMeetingId)` — 활성 세션 eventId 목록
   - 각 eventId에 대해 회차별 독립 처리:
     - 배정 없음 → `NO_ASSIGNMENT`
     - 이미 `SETTLEMENT_LOCKED` → `ALREADY_SETTLED` (멱등)
     - `settlementService.lockAndSettle` 호출 → 성공 `SETTLED`
     - `RestException` → `classifyBulkSettle`로 분류
     - 그 외 예외(경합, 인프라) → `FAILED`
4. `List<ServiceAssignmentBulkSettleResultVo>` 반환.
5. Flutter는 결과 목록을 `_ResultCard`로 렌더링. BLOCKED 행은 "분담금 현황" 버튼 노출 → `Routes.eventAssignmentsFor(eventId, focusAssignmentId: assignmentId)`로 이동.

### 3-C. BLOCKED 처리 흐름

BLOCKED 회차: 완납 게이트 미충족(미수금·금액불일치·earning 미완·forfeit-출석 충돌·계약금 미적용).

1. 호스트가 결과 화면에서 BLOCKED 회차의 "분담금 현황" 버튼을 누른다.
2. `EventAssignmentsScreen(eventId, focusAssignmentId: assignmentId)`로 이동, 해당 배정 카드가 강조(파란 테두리).
3. 호스트가 과금·무료제외·대납 등 액션으로 완납 게이트를 충족시킨 후 재정산 트리거 가능.

## 4. 서버 계약

### `POST /api/v1/regular-meetings/{meetingId}/assignments`

| 항목 | 값 |
|---|---|
| Controller | `ServiceAssignmentController#bulkAssignToRegularMeeting` |
| 인증/권한 | 필수, 정기모임 호스트(`assertRegularMeetingHost`) |
| Path | `meetingId: long` — `RegularMeetingVo.id` |
| Request Body | `ServiceAssignmentCreateParam` — `providerUserId: long`, `assignmentSource: AssignmentSource`, `providerRole: String?` |
| 응답 | `List<ServiceAssignmentVo>` (HTTP 201) — 이번에 새로 생성된 배정만 |
| 중복 처리 | 이미 배정된 회차는 skip(응답에 미포함, 에러 아님) |
| 트랜잭션 | 단일 `@Transactional` — 한 회차 실패 시 전체 롤백 |

### `POST /api/v1/regular-meetings/{meetingId}/settlements`

| 항목 | 값 |
|---|---|
| Controller | `ServiceAssignmentController#bulkSettleRegularMeeting` |
| 인증/권한 | 필수, 정기모임 호스트 |
| Request Body | `ServiceAssignmentBulkSettleParam` — `providerUserId: long` |
| 응답 | `List<ServiceAssignmentBulkSettleResultVo>` (HTTP 200) |
| 트랜잭션 | `@Transactional(NOT_SUPPORTED)` — 회차별 독립 트랜잭션(부분 성공 허용) |

### BulkSettleStatus enum(소스: `BulkSettleStatus.java`)

| 값 | 의미 | 호스트 조치 필요 |
|---|---|---|
| `SETTLED` | 정산 락+APPROVED 완료 | 없음 |
| `ALREADY_SETTLED` | 이미 정산됨(SETTLEMENT_LOCKED) — 멱등 | 없음 |
| `NO_ASSIGNMENT` | 해당 회차에 이 provider 배정 없음 | 배정 생성 |
| `SKIPPED_NOT_READY` | 회차 미종료·CONFIRMED 아님 — 나중에 재트리거 | 없음 |
| `BLOCKED` | 완납 게이트 미충족 — 과금·무료처리·대납 필요 | 해당 회차 배정 화면에서 조치 |
| `FAILED` | 경합(`@Version`)·인프라·commit 예외 | 재시도 |

### ServiceAssignmentBulkSettleResultVo 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `eventId` | long | 회차 event id |
| `assignmentId` | Long? | 배정 id(NO_ASSIGNMENT면 null) |
| `status` | BulkSettleStatus | 회차별 결과 |
| `reason` | String? | BLOCKED/FAILED 시 ErrorCode name |

### classifyBulkSettle 분류 로직(소스: `ServiceAssignmentService.java`)

| ErrorCode | BulkSettleStatus |
|---|---|
| `ASSIGNMENT_NOT_CONFIRMED`, `ASSIGNMENT_EVENT_NOT_ENDED` | `SKIPPED_NOT_READY` |
| `ASSIGNMENT_NOT_FULLY_COLLECTED`, `ASSIGNMENT_FEE_MISMATCH`, `ASSIGNMENT_SETTLEMENT_INVALID_EARNING`, `ASSIGNMENT_BENEFICIARY_ATTENDED`, `ASSIGNMENT_PREPAYMENT_REQUIRED` | `BLOCKED` |
| 그 외 | `FAILED` |

## 5. 프론트 계약

| 항목 | 구현 |
|---|---|
| 묶음 배정 Screen | 정기모임 화면 인라인 CTA (별도 라우트 없음) |
| 묶음 정산 Screen | `RegularMeetingBulkSettleScreen(meetingId)` |
| Route | `Routes.regularMeetingBulkSettle(meetingId)` |
| 제공자 선택 | `ProviderPickerSheet.show(context)` |
| 정산 실행 | `ref.read(serviceAssignmentRepositoryProvider).bulkSettle(meetingId, param)` — Repository를 그 provider로 접근하는 단발(one-shot) 변이 패턴(목록상태 Notifier 아님). 동형 선례: `bulkSettle`/`charge` 등 단발 액션. 정상(규칙 위반 아님). |
| 결과 렌더링 | `_ResultCard` — `AppStateBadge(label, tone, icon)` + reason 한글화(`resolveApiErrorMessage`) |
| BLOCKED CTA | `Routes.eventAssignmentsFor(eventId, focusAssignmentId: assignmentId)` 이동, 배정 카드 강조 |
| 성공 집계 | `results.where((r) => r.status.isSuccess).length` |

### BulkSettleStatus Flutter 확장(`service_assignment_bulk_settle_result_vo.dart` 추정)

| 속성 | 의미 |
|---|---|
| `isSuccess` | `SETTLED` 또는 `ALREADY_SETTLED` |
| `needsHostAction` | `BLOCKED` — "분담금 현황" 버튼 노출 조건 |
| `label` | 한글 라벨 |
| `tone` | `StateTone` |
| `icon` | `IconData?` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 호스트 + 정기모임 소유 + 묶음 배정 | `assertRegularMeetingHost` + skip 멱등 | 성공 토스트 + 목록 갱신 | 새 배정 생성, 기존 회차 skip | 일치 |
| 비호스트 묶음 배정 시도 | `assertRegularMeetingHost` 실패 | 서버 에러 토스트 | 403 | 일치 |
| 묶음 정산 — SETTLED 회차 | `SETTLEMENT_LOCKED` → `ALREADY_SETTLED` | 배지 표시 | 재처리 없음, 멱등 | 일치 |
| 묶음 정산 — BLOCKED 회차 | 완납게이트 실패 | `_ResultCard(needsHostAction=true)` → "분담금 현황" CTA | 해당 회차 배정 화면으로 이동 | 일치 |
| 묶음 정산 — SKIPPED_NOT_READY | 회차 미종료 또는 CONFIRMED 아님 | 배지 표시 | 재트리거 안내 | 일치 |
| 묶음 정산 — FAILED | 경합·인프라 예외 | `FAILED` 배지 + reason | 재시도 안내 | 일치 |
| 세션 0개인 정기모임 | `assertRegularMeetingHost` 1회 실행 후 빈 결과 | 빈 결과 목록 | 빈 화면 | 일치(권한 게이트 통과 확인) |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `BulkSettleStatus` 6종 | `BulkSettleStatus.java` | `service_assignment_bulk_settle_result_vo.dart` — 6값(SETTLED/ALREADY_SETTLED/NO_ASSIGNMENT/SKIPPED_NOT_READY/BLOCKED/FAILED) 모두 정의 확인됨 | 일치 |
| `reason` 필드 | `ErrorCode.name()`(영문) | `resolveApiErrorMessage(result.reason)` 중앙 한글화 | 일치(중앙 매핑 의존) |
| `isSuccess` 플래그 | — | Flutter 확장 getter | Derived: 서버 enum 서브셋 |
| `needsHostAction` 플래그 | — | Flutter 확장 getter | Derived: `BLOCKED`만 |
| meetingId = RegularMeetingVo.id | `@PathVariable long meetingId` | `RegularMeetingBulkSettleScreen(meetingId: ...)` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 묶음 배정 응답에 skip된 회차 포함 여부 불명확 | `bulkAssignToRegularMeeting`은 새로 생성된 것만 반환 — skip된 회차(이미 배정)는 응답에 없음 | 호스트가 어느 회차가 skip됐는지 파악 불가 | 묶음 배정도 묶음 정산처럼 회차별 status(CREATED/SKIPPED) 응답 고려 |
| 확인됨 | `BulkSettleStatus` Flutter enum 일치 | 서버 6종 vs Flutter 6종 — `service_assignment_bulk_settle_result_vo.dart` 소스 확인 완료, 전값 일치 | — | 조치 불필요 |
| P2 | 묶음 배정 실패 시 부분 롤백 | 단일 `@Transactional` — 한 회차 실패 시 전체 롤백 vs 묶음 정산의 `NOT_SUPPORTED`(부분 성공) 정책 불일치 | 정기모임 전체 배정이 한 회차 오류로 롤백 | 배정도 `NOT_SUPPORTED` + 회차별 결과 반환 고려(현재 설계는 단일 tx) |
| P3 | SKIPPED_NOT_READY 회차의 재트리거 UX 없음 | 결과 카드에 배지만 표시, 재트리거 안내 문구나 CTA 없음 | 호스트가 언제 다시 시도해야 하는지 불명확 | "나중에 다시 시도" 메시지 또는 배지 tooltip |

## 9. 수용 기준

### AC-01. 묶음 배정 — 새 회차만 생성, 기존 skip

Given 정기모임에 회차 A(배정 없음), 회차 B(이미 배정)가 있다.  
When `POST /api/v1/regular-meetings/{meetingId}/assignments`를 호출한다.  
Then 회차 A에만 배정이 생성되어 `List<ServiceAssignmentVo>` 1건 반환. 회차 B는 skip(에러 아님).

### AC-02. 비호스트 묶음 배정 거부

Given 정기모임의 비호스트가 묶음 배정을 시도한다.  
When `POST .../assignments`를 호출한다.  
Then 서버가 권한 오류를 반환한다. Flutter 에러 토스트.

### AC-03. 묶음 정산 — 부분 성공

Given 정기모임에 회차 A(정산 가능), 회차 B(완납 게이트 미충족, BLOCKED), 회차 C(이미 정산됨)가 있다.  
When `POST .../settlements`를 호출한다.  
Then 결과: A=SETTLED, B=BLOCKED, C=ALREADY_SETTLED. A만 earning APPROVED. 서버 전체 성공 처리, 배열로 회차별 status 반환.

### AC-04. BLOCKED 회차에서 배정 화면 이동

Given 묶음 정산 결과 화면에 BLOCKED 회차가 있다(assignmentId 포함).  
When 호스트가 "분담금 현황" 버튼을 누른다.  
Then `EventAssignmentsScreen(eventId, focusAssignmentId: assignmentId)`로 이동. 해당 배정 카드에 파란 테두리 강조.

### AC-05. 세션 0개 정기모임 권한 검증

Given 활성 세션이 없는 정기모임에 묶음 배정을 시도한다.  
When `POST .../assignments`를 호출한다.  
Then `assertRegularMeetingHost`가 1회 실행(권한 검증), 빈 리스트 반환. 비호스트면 거부.

### AC-06. SKIPPED_NOT_READY — 회차 미종료

Given 아직 종료되지 않은 회차(CONFIRMED 배정)가 있다.  
When `POST .../settlements`를 호출한다.  
Then 해당 회차 결과 = `SKIPPED_NOT_READY`. earning 변경 없음.

### AC-07. FAILED — 경합 예외 부분 격리

Given 묶음 정산 중 한 회차에서 `@Version` 충돌이 발생한다.  
When `bulkSettleRegularMeeting`이 실행된다.  
Then 해당 회차만 `FAILED`, 나머지 회차 결과는 유지. `FAILED` 회차의 `reason` = 예외 클래스 이름.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 묶음 배정 회차별 결과 반환 | 정산과 동일하게 `NOT_SUPPORTED` + `List<BulkAssignResult>` 반환 구조 고려 |
| 확인됨 | `BulkSettleStatus` Flutter enum 소스 확인 | `service_assignment_bulk_settle_result_vo.dart` 6종 전값 일치 확인 완료. |
| UX | SKIPPED_NOT_READY 재시도 안내 | 회차 종료 예정 일시 표시 또는 "종료 후 다시 시도" 안내 |
| 정책 | 묶음 배정 단일 tx vs NOT_SUPPORTED | 한 회차 오류 시 전체 롤백 정책 유지 여부 결정 |
