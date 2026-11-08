# F03-03. 이벤트 생성 (호스트) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트가 새 이벤트를 만든다. 생성 시 `status=DRAFT`로 저장되고, 별도 `publish` 호출 시 `OPEN`으로 전이한다. 일반/클럽/프라이빗 모임을 한 엔드포인트로 받으며, `hostingCostType`이 있으면 PRIVATE 타입이 된다. 반복 이벤트는 모(母) 이벤트 생성 후 `recurring` 엔드포인트로 자식 occurrence를 일괄 생성한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 목록(F03-01) ▶ 우하단 FAB(+) 탭 ▶ `/create-event`
- 이벤트 상세(F03-02) ▶ 더보기 ▶ "이 이벤트로 새로 만들기" ▶ `/create-event` + `extra=EventVo` (prefill)
- 클럽 상세(Unit 04) ▶ "이벤트 생성" ▶ `/create-event` (clubId 사전 설정)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `EventService`. 앱: `event_create_screen.dart`, `recurring_event_group_screen.dart`, `event_create_step1.dart`, `event_create_step2.dart`, `event_create_step3.dart`, `event_create_step4.dart`, `event_preview_card.dart`, `event_summary_table.dart`.

<!-- source-references:start -->
서버 창구: `EventController#createEvent`, `EventController#publishEvent`, `EventController#createRecurringEvents`, `EventController#getRecurringGroup`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 2026-10-29 현재 계약 대조

### 응답이 끊긴 생성 요청은 같은 요청으로 확인합니다

차수 10에서 모임 생성 다섯 경로·플랜 생성·정기모임 생성·개인 반복 생성에 요청 고유키를 연결했다. 같은 키·같은 본문 재전송은 앞 결과를 돌려주며 다른 본문 재사용은 거절한다. 저장 결과를 모르는 동안 새 생성으로 바꾸지 않는다. 화면 재진입·계정 전환 뒤 이전 사용자의 미확정 요청을 현재 계정으로 보내지 않는지도 확인한다.

기존 설계 중 이 규칙과 다른 서술은 아래 현재 계약을 기준으로 정정한다. 운영·실기기 완료 판정은 [현재 출시 상태표](../../../docs/qa/launch-status.html)를 따른다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-11-01에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `POST /api/v1/events` | `EventController#createEvent` | [EventController.java:94](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventController.java#L94) |
| `POST /api/v1/events/{eventId}/publish` | `EventController#publishEvent` | [EventController.java:257](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventController.java#L257) |
| `POST /api/v1/events/{eventId}/recurring` | `EventController#createRecurringEvents` | [EventController.java:395](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventController.java#L395) |
| `GET /api/v1/events/{eventId}/recurring` | `EventController#getRecurringGroup` | [EventController.java:433](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/event/controller/EventController.java#L433) |
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 진입: `EventCreateNotifier.build()` → 빈 `EventCreateState`
2. (prefill 시) `applyPrefill(eventVoToCreateState(source, clearSchedule: true))`
3. 사용자 입력 → `update*` 메서드들 (각 필드별 setter)
4. Step 진행 → `validateStep1/2/3` → `nextStep`
5. 썸네일: `state.thumbnailFile` 있으면 `_uploadThumbnail`:
   - `FileRepository.generatePresignedUrl(fileName, mimeType, purpose: 'EVENT_THUMBNAIL', fileSize)` (Unit 05)
   - S3 PUT (presigned URL)
   - `state.thumbnailUrl = signed.fileKey`
6. 등록: `EventRepository.createEvent(_buildParam())` → `POST /api/v1/events`
7. 발행: `EventRepository.publishEvent(eventId)` → `POST .../publish` (선택적)
8. 성공 후 `eventListNotifier`/`myEventsNotifier` invalidate

## 4. 제품 규칙

### 4.1 유료 모임의 결제 수단
- 고를 수 있는 값은 서버가 정한다. `POINT` 는 실결제 스위치, `CASH` 는 호스트 직접 수납 스위치와 출시 범위(`CASH_EVENT`), `MIXED` 는 둘 다를 본다.
- 첫 출시 태세에서 실제로 고를 수 있는 값은 `CASH`(계좌이체) 하나다. 닫힌 수단은 `EVENT_PREPAYMENT_TYPE_NOT_READY`(지금 쓸 수 없는 결제 수단)로 거절한다.
- 판정은 만들 때뿐 아니라 DRAFT→OPEN, 비공개→공개 전이에도 걸린다. 열려 있을 때 만들어 둔 초안이 닫힌 뒤 공개되어, 아무도 결제할 수 없는 유료 모임이 나오는 일을 막는다.
- 별도 스위치는 없다. 실결제가 열리면 `POINT` 는 자동으로 다시 열린다.
- 봉인은 새로 나오는 것에만 건다. 이미 있는 건의 조회·취소·환불·정산·노쇼·분쟁은 막지 않는다. 막으면 돈과 좌석이 함께 갇힌다.
- 앱은 서버 목록에 있는 수단만 그리고, 목록을 못 읽으면 빈 목록으로 본다.

### 4.2 입력 값
- 제목은 필수이고 200자까지다. 정원은 1 이상, 가격은 0 이상이다.
- 시간대는 서울만 받는다. 빈 값은 서울로 저장하고 다른 값은 `INVALID_TIMEZONE` 이다.
- 대기열은 기본 꺼짐이다. 정원 초과 허용·상한은 입력 칸이 없어 기본값으로 남는다(F03-07 §3-1).
- 공동호스트 권한 변경은 호스트만 한다.
- 복제로 시작하면 내용은 채우고 일정은 비운다.
- "등록 후 발행" 은 DRAFT 를 만든 뒤 곧바로 공개한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 무료 일반 모임 생성 후 즉시 발행 (Happy Path) | 로그인됨, 마이 이벤트(주최 중) 0건. | status=OPEN 이벤트 생성. 목록/마이 이벤트 invalidate. |
| S2 | 임시저장 (DRAFT) 후 추후 발행 | 정보가 완전치 않은 호스트. | DRAFT → OPEN (별도 시점). |
| S3 | 시작 시각이 과거인 경우 | 호스트. | 사용자가 시각 수정 후 정상 진행. |
| S4 | 유료 이벤트 + 사전결제 설정 | 클래스 호스트. | 유료 이벤트 DRAFT 생성 완료. |
| S5 | 프라이빗 모임 생성 | 데이팅 매칭 호스트. | PRIVATE 모임 DRAFT, phase=WAITING_PAYMENT. |
| S6 | 공동호스트 추가 시 비존재 사용자 ID | 호스트. | 사용자 재선택. |
| S7 | 템플릿 복제 (C-04) | 정기 호스트, 지난 모임을 다시 만들고 싶음. | 같은 호스트가 새 일정으로 모임 재생성. |
| S8 | 반복 이벤트 (반복 occurrence 일괄 생성) | 매주 같은 시간 모임 호스트. | 반복 이벤트 그룹 생성 완료. |
| S9 | Step 1 필수 입력 미완 시 다음 차단 | 호스트 로그인됨, 모 이벤트(`templateEventId`) 생성됨 (S8 의 1단계와 동일 — DRAFT 또는 갓 발행된 OPEN). | 사용자가 필수값을 채운 뒤에만 다음 단계 진입 가능. |
| S10 | 반복 이벤트 그룹 관리 화면 surface | 부모 이벤트 + 자식 N건이 생성됨 (S8 결과). | 호스트가 반복 이벤트 운영 진입점을 한 화면에서 확인. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 임시 저장 | 모임 만들기는 쓰던 내용을 기기에 임시 저장하고 다시 열면 불러온다. 저장이나 불러오기에 실패하면 화면에 알리고 다시 시도하게 한다 | 없음 |
| 확정 | `RecurringEventCreateService` | 반복 생성 본문의 `daysOfWeek`(MON~SUN, 영문 약어·2글자·전체 이름 모두 받음)는 WEEKLY/BIWEEKLY 에서 여러 요일을 한 번에 지정한다. 비우면 원본 시작 요일 하나다. 값 중복은 합치고 월~일 순으로 정렬하며, 모르는 요일 값은 `INVALID_INPUT` 이다. 회차는 시작 주 월요일부터 주 단위로 펼쳐 시작 시각 이전은 뺀다. 규칙 문자열은 `BYDAY=MO,WE,FR` 꼴이다. 회차 계산의 상한 `MAX_CHILD_EVENTS=52` 는 원본 회차를 포함한 목록 크기라, 시작 요일이 지정 요일에 들어 있으면 실제 만드는 자식은 최대 51개다. 시작이 이미 지난 회차는 만들지 않고 남는 회차가 없으면 `INVALID_INPUT` 이다. | 여러 요일 매주 생성은 서버 단위 시험이 덮는다(종료일 당일의 요일 회차, 원본 요일과 다른 요일, 클럽 반복의 요일 둘). |

## 9. 수용 기준

- **AC-01. 무료 일반 모임 생성 후 즉시 발행 (Happy Path)**: Given 로그인됨, 마이 이벤트(주최 중) 0건. When 사용자가 해당 흐름을 실행하면 Then status=OPEN 이벤트 생성. 목록/마이 이벤트 invalidate.
- **AC-02. 임시저장 (DRAFT) 후 추후 발행**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DRAFT → OPEN (별도 시점).
- **AC-03. 시작 시각이 과거인 경우**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 시각 수정 후 정상 진행.
- **AC-04. 유료 이벤트 + 사전결제 설정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 유료 이벤트 DRAFT 생성 완료.
- **AC-05. 프라이빗 모임 생성**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then PRIVATE 모임 DRAFT, phase=WAITING_PAYMENT.
- **AC-06. 공동호스트 추가 시 비존재 사용자 ID**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 재선택.
- **AC-07. 템플릿 복제 (C-04)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 같은 호스트가 새 일정으로 모임 재생성.
- **AC-08. 반복 이벤트 (반복 occurrence 일괄 생성)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 반복 이벤트 그룹 생성 완료.
- **AC-09. Step 1 필수 입력 미완 시 다음 차단**: Given 호스트 로그인됨, 모 이벤트(`templateEventId`) 생성됨 (S8 의 1단계와 동일 — DRAFT 또는 갓 발행된 OPEN). When 사용자가 해당 흐름을 실행하면 Then 사용자가 필수값을 채운 뒤에만 다음 단계 진입 가능.
- **AC-10. 반복 이벤트 그룹 관리 화면 surface**: Given 부모 이벤트 + 자식 N건이 생성됨 (S8 결과). When 사용자가 해당 흐름을 실행하면 Then 호스트가 반복 이벤트 운영 진입점을 한 화면에서 확인.

## 12. 공동호스트(CoHost) 권한 세분화 (Wave E-1)

> **갱신일**: 2026-06-05. 소스: `EventCoHost.java:38-55`, `EventCoHostController.java:31`, `EventCoHostService.java:48`.

### 권한 flag 5종

이벤트 생성 이후, 호스트는 공동호스트를 추가한 뒤 5개 권한 flag를 개별 부여할 수 있다. 기본값은 보수적(기존 사용 패턴 유지 위해 `canSendAnnouncement`만 `true`, 나머지 `false`).

| 필드 | 컬럼 | 기본값 | 의미 |
|---|---|---|---|
| `canManageAttendance` | `can_manage_attendance` | false | 수동 체크인·참석자 강제 제거·대기열 수동 승급 |
| `canModerateMessages` | `can_moderate_messages` | false | 타 사용자 메시지 삭제 (콘텐츠 모더레이션) |
| `canSendAnnouncement` | `can_send_announcement` | **true** | 공지 일괄 발송 (기존 동작 보존) |
| `canHandleRefundIssue` | `can_handle_refund_issue` | false | 환불 처리 (은행 환불 확인 등) |
| `canResolveDispute` | `can_resolve_dispute` | false | 분쟁 처리 (host/dispute 도메인 연동) |

### PATCH 엔드포인트

```
PATCH /api/v1/events/{eventId}/co-hosts/{coHostUserId}/permissions
```

- **인증**: 호스트 본인만 호출 가능 (`assertHostOrCoHost` 아님 — `assertHost`)
- **Body**: `EventCoHostPermissionParam` — 5개 `Boolean` 필드, null 필드는 기존 값 유지 (PATCH 의미)
- **응답**: 갱신된 `EventCoHost` 엔티티

소스: `EventCoHostController.java:31-41`, `EventCoHostService.java:37-70`
