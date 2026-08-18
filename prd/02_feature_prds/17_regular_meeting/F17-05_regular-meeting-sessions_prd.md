# F17-05. 정기모임 세션 추가·자동생성·일괄·대체·취소 PRD

<!-- source-measured: 2026-07-29; api HEAD be38d128b80d; app HEAD cb21bce8ef08 -->

## 1. 결론

정기모임의 각 회차는 `event` 테이블의 독립 이벤트(`eventType=REGULAR_MEETING`)이며 `regular_meeting_event` 정션이 순번·원본/대체 관계·materialization·출석 확정 상태를 보유한다.

가격 단위는 모임 타입에 따라 완전히 갈린다.

- `FIXED`: 코스 전체 가격은 정기모임 본체에 있고 세션 가격은 서버가 항상 0으로 강제한다. 세션 단독 신청도 차단한다.
- `VARIABLE`: 정기모임 본체 가격은 0이고 각 세션이 자체 정원·가격·환불정책·결제기한을 갖는다. 유료 세션은 일반 이벤트 신청/사전결제/환불 흐름을 사용한다.

Flutter 호스트 화면은 현재 단건 추가와 제한된 반복 자동생성(`count 1..26`)을 지원한다. 서버의 임의 목록 bulk와 취소 회차 replace endpoint는 앱 호스트 UI가 아직 없다. 상세의 회차 카드는 현재 읽기 전용이라 일반 이벤트 상세로 이동하지 않으며, 일반 이벤트 상세도 `sequenceNo`를 이용한 `"정기모임 N회차"` 컨텍스트 라벨을 렌더링하지 않는다.

## 2. 실사 근거

| 계층 | 확인 소스 | 확인 계약 |
|---|---|---|
| Controller | `RegularMeetingController`의 `addSession`, `addSessionsBulk`, `generateSessions`, `sessions`, `cancelSession`, `replaceSession` | endpoint/body/response |
| Param | `RegularMeetingSessionAddParam`, `BulkParam`, `GenerateParam`, `ReplaceParam` | 정확한 필드·타입 |
| Service | `RegularMeetingService` 세션 구간 | 상태·상한·가격·선결제·replace |
| Factory | `RegularMeetingEventFactory` | 상속 필드와 세션 고유 필드 |
| VO | `RegularMeetingEventVo`, `EventVo` | 목록 가격과 생성 응답 |
| Flutter | `regular_meeting_session_add_screen.dart`, API/repository/models | 단건/자동생성 입력과 표시 |

## 3. Endpoint 계약

기본 경로: `/api/v1/regular-meetings/{id}`

| Method | Path | Body/Query | 응답 | 접근 |
|---|---|---|---|---|
| POST | `/events` | `RegularMeetingSessionAddParam` | 201 `EventVo` | 호스트, DRAFT/OPEN, `EVENT_HOST_RESTRICT` 제재 시 차단 |
| POST | `/events/bulk` | `RegularMeetingSessionBulkParam` | 201 `List<Long>` | 호스트, DRAFT/OPEN, 같은 제재 가드 |
| POST | `/events/generate` | `RegularMeetingSessionGenerateParam` | 201 `List<Long>` | 호스트, DRAFT/OPEN, 같은 제재 가드 |
| GET | `/events?includeHistory=false` | boolean | `List<RegularMeetingEventVo>` | 공개 이력 상태는 조회 가능, 미발행은 호스트만 |
| DELETE | `/events/{eventId}` | 없음 | 204 | 호스트 |
| POST | `/events/{eventId}/replace` | `RegularMeetingSessionReplaceParam` | 200 `EventVo` | 호스트, 취소된 원본, 같은 제재 가드 |

`GET`까지 전부 host-only라는 과거 문서 서술은 틀리다. DRAFT 또는 한 번도 발행되지 않은 CANCELED만 비호스트에게 `NOT_FOUND`이며, 공개된 모임의 세션 목록은 상세 읽기 표면이다.

## 4. 요청 필드

### 4.1 단건·대체

`RegularMeetingSessionAddParam` / `RegularMeetingSessionReplaceParam`:

- `title:String`
- `description:String?`
- `startTime:LocalDateTime`
- `endTime:LocalDateTime`
- `baseCapacity:Integer?`
- `price:BigDecimal?`
- `refundPolicyCode:String?`
- `refundDeadlineHours:Integer?`

장소·좌표·온라인 URL·카테고리·썸네일은 세션 요청 필드가 아니다. 정기모임 본체에서 상속한다.

### 4.2 자동생성

`RegularMeetingSessionGenerateParam`:

- 단건 공통 필드 중 `title`, `description`, `baseCapacity`, 가격/환불 필드
- `firstStartTime`, `firstEndTime`
- `cadence: DAILY | WEEKLY | BIWEEKLY | MONTHLY`
- `count: 1..26`

서버는 첫 회차 길이를 유지한 채 cadence만큼 시각을 이동해 목록으로 확장한 뒤, bulk 경로에 위임한다. 따라서 세션 상한과 유료 세션 사전결제 규칙이 동일하게 적용된다.

## 5. 생성·순번·대체 규칙

- 세션 상태는 모임이 OPEN이면 `OPEN`, DRAFT면 `DRAFT`.
- 정션 순번은 기존 최대값 + 1부터 자동 할당한다.
- FIXED는 활성 세션 수가 `totalSessionCount`를 넘을 수 없다. VARIABLE에는 수량 상한이 없다.
- FIXED 발행/종료 정책은 활성 세션 수와 총 회차 정합성을 사용한다.
- 취소는 Event를 `CANCELED`로 바꾸고 정션/이력은 보존한다.
- 대체는 취소된 세션에만 가능하고 원본과 같은 `sequenceNo`, `origin=REPLACEMENT`, `replacedEventId=원본`으로 새 row를 만든다.
- 같은 순번의 취소 원본과 대체본은 함께 존재할 수 있지만 활성 세션은 하나만 허용한다.
- `includeHistory=false`는 취소 이력을 제외하고, true는 원본/대체 이력을 함께 돌려준다.

## 6. 가격·결제·환불 계약

### 6.1 FIXED

- 단건/bulk/generate/replace 요청에 `price`가 있어도 서버가 세션 가격을 0으로 강제한다.
- 정원은 모임의 `baseCapacity`를 사용한다.
- 코스 등록·결제는 F17-06/F17-07 경로이고 세션 직접 신청은 `directApplyBlocked=true`.

### 6.2 VARIABLE

- `baseCapacity`는 세션별 필수 UI 입력이며 서버는 1 이상을 검증한다.
- `price == null || price == 0`: 무료 세션. 별도 사전결제/환불정책 row를 만들지 않는다.
- `price < 0`: `INVALID_INPUT`.
- `price > 0`: 100원 미만을 아래로 절삭한다. 예: 5,099원 → 5,000원이며 1~99원은 0원이 되어 무료 세션으로 처리된다.
- 유료 세션은 `EventPrepayment`을 생성한다.
  - `prepaymentRequired=true`
  - `prepaymentAmount=절삭 가격`
  - `prepaymentType` — **2026-08-18 개정(P0-PAID-01)**: 이 경로는 호스트에게 결제수단을 묻지 않는다. 종전 서술의 고정값(문서상 `CASH`, 코드상 하드코딩)은 **폐기**되고, 이제 결제 시점과 **같은 술어**(`MoneyLiveGate`)에 위임해 지금 열린 수단으로 낙착시킨다. **P0 태세의 실제 낙착값은 `CASH`**이며, 이 경우 호스트 수납 계좌 결박까지 함께 확정한다 — 기본 계좌가 없으면 유료 세션 생성이 거부된다(신규 제약). 열린 수단이 하나도 없으면 유료 세션 자체를 만들지 않는다(`400023`). 하드코딩을 폐기한 이유는 "지금 되는 수단"을 사람이 판단해 박는 방식이 판단 근거가 바뀔 때마다 조용히 틀리기 때문이다(과거 두 번 틀림).
  - 결제기한은 요청값(1~168시간), 미지정이면 24시간, 범위 밖이면 거부
- 환불 template은 요청 `refundPolicyCode`, 누락 시 `STANDARD`.
- 지원 UI 값은 `STANDARD, FLEXIBLE, STRICT, FULL, NON_REFUNDABLE`; 규칙 본문이 필요한 `CUSTOM`은 이 경로에서 지원하지 않는다.

`RegularMeetingEventVo.price`는 Java `BigDecimal`이며 Flutter는 `double`로 읽는다. 앱 상세는 `price > 0`인 세션에만 금액을 표시한다.

### 6.3 취소

- DRAFT/OPEN 세션만 실제로 `CANCELED` 전이한다. 이미 그 밖의 상태면 endpoint는 별도 전이 없이 끝난다.
- VARIABLE 세션의 `ATTENDING/WAITING` 대상에게 `EVENT_CANCELLED` 알림을 보내고, 결제한 `ATTENDING`은 전액 환불 또는 수동 환불 요청으로 전환한다. 실패분은 `FailedRefund`와 호스트 `PAYMENT_FAILED` 알림으로 남긴다.
- FIXED 세션은 세션 자체 가격이 0이라 세션 결제 환불은 없고, 코스 멤버십은 유지된다.

## 7. 썸네일 계약

- 세션 Event row는 정기모임 본체의 bare thumbnail key를 상속한다.
- 단건 추가/대체 응답 `EventVo`는 표시용 presigned URL로 변환한다.
- 정기모임 상세의 `sessions: List<RegularMeetingEventVo>`에는 별도 `thumbnailUrl` 필드가 없다. 상단 모임 썸네일은 `RegularMeetingVo.thumbnailUrl`로 표시한다.
- 따라서 “세션마다 썸네일을 업로드한다”는 UI/Param 계약은 없다.

## 8. Flutter 실제 UX

`RegularMeetingSessionAddScreen`:

- 공통: 제목, 설명, 시작/종료 시각
- VARIABLE만: 정원, 참가비, 환불정책 template, 결제기한
- FIXED: 정원·가격 입력을 보내지 않고 코스 등록자용 회차임을 설명
- 자동생성 스위치:
  - 꺼짐 → `POST /events`
  - 켜짐 → cadence + `count(1..26)` 입력 후 `POST /events/generate`
- 성공하면 상세/세션 provider를 invalidate하고 `"세션 추가 완료"` 또는 `"회차 자동 생성 완료"` 토스트 후 뒤로 간다.
- 상세 세션 목록은 순번, 상태, materialization, 출석 확정 상태, 시작 시각과 양수 가격을 표시한다.
- 각 회차 카드는 현재 `onTap`이 없는 읽기 전용 카드다. `EventVo`에는 정기모임 컨텍스트 필드가 있지만 일반 이벤트 상세 화면은 이를 표시하지 않는다.

현재 앱 API의 replace 메서드는 Dart 전용 replace param 대신 구조가 같은 `RegularMeetingSessionAddParam`을 body로 사용한다. 현행 JSON 필드는 서버 ReplaceParam과 일치하지만 서버 계약 분리를 모델 이름으로 표현하지 못한다.

## 9. 확인된 Gap / Risk

| 우선순위 | 실측 결과 | 영향/후속 |
|---|---|---|
| P1 | 임의 목록 bulk와 취소 회차 replace의 호스트 UI가 없다. | API 직접 사용만 가능. 관리 화면 추가 필요. |
| P1 | 세션 간 시간 겹침을 검사하지 않는다. bulk도 각 세션의 시작<종료만 확인한다. | 같은 시각에 중복 회차 생성 가능. 경고 또는 서버 conflict 정책 필요. |
| P1 | 모집 중 세션 추가 알림이 별도 배선되지 않았다. | 참여자가 새 회차를 놓칠 수 있다. |
| P1 | 1~99원 VARIABLE 가격은 양수 입력이지만 100원 절삭 후 0원이 된다. | 앱이 최소 유료 금액을 설명/제한하지 않으면 호스트가 유료로 오인할 수 있다. |
| P1 | 회차 카드에서 일반 이벤트 상세로 들어가는 동작과 `"정기모임 N회차"` 라벨이 없다. | 회차 운영/상세 확인 진입이 끊기고 일반 이벤트 상세를 열더라도 정기모임 문맥을 보장할 수 없다. |
| P2 | Flutter replace body가 AddParam 모델을 재사용한다. | 현재는 호환되나 서버 필드 분기 시 compile-time 보호가 약하다. |

## 10. 수용 기준

- **AC-01**: FIXED 세션은 어떤 요청 가격에도 저장 가격 0이고 코스 정원을 상속한다.
- **AC-02**: VARIABLE 유료 세션은 100원 단위 절삭 가격, **지금 열린 결제수단으로 낙착된** 사전결제(P0 태세 = 계좌이체 + 호스트 수납 계좌 결박), 지정/기본 환불 template을 만든다. 열린 수단이 없거나 계좌이체로 낙착됐는데 호스트 기본 계좌가 없으면 유료 세션 생성이 거부된다.
- **AC-02a**: VARIABLE 1~99원 요청은 절삭 후 0원이므로 사전결제/환불정책 row를 만들지 않는다.
- **AC-03**: generate는 1..26과 네 cadence만 허용하고, 생성된 모든 회차가 같은 기간·가격·환불 계약을 갖는다.
- **AC-04**: FIXED 활성 세션 수는 `totalSessionCount`를 초과하지 못한다.
- **AC-05**: 취소 원본만 replace할 수 있고 새 정션은 같은 순번과 원본 참조를 보유한다.
- **AC-06**: 미발행 세션 목록은 비호스트에게 `NOT_FOUND`.
- **AC-07**: Flutter는 VARIABLE 가격을 `int?`로 보내고 응답 `BigDecimal` 가격을 `double`로 안전하게 읽는다.
- **AC-08**: 자동생성 성공 후 상세/세션 목록이 invalidate되어 새 회차를 표시한다.
- **AC-09**: VARIABLE 유료 세션 취소는 참가자 알림과 결제 환불을 실행하고 실패분을 추적한다. FIXED 코스 멤버십은 세션 하나의 취소로 해지되지 않는다.
- **AC-10 (현재 Gap 기록)**: 상세 회차 카드는 탭 이동을 제공하지 않으며 일반 이벤트 상세의 정기모임 회차 라벨도 아직 구현되지 않았다.
