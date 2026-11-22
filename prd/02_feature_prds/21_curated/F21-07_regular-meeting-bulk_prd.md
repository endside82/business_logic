# F21-07. 정기모임 묶음 배정·정산 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

정기모임 호스트가 한 제공자를 여러 회차에 직접 배정하거나, 같은 제공자의 회차별 수익을 지급 대기로 확정한다. meetingId는 정기모임 자체 ID이고 eventId는 각 회차의 이벤트 ID다. 묶음 배정은 하나의 트랜잭션으로 생성하며 묶음 정산은 배정마다 명령 기록과 업무를 함께 커밋한다. 두 명령의 실패·재시도 단위가 다르다.

앱 정기모임 상세의 호스트 운영 도구에서 제공자 선택 후 묶음 배정을 호출한다. PROVIDER 범위가 봉인되면 새 묶음 배정 버튼을 숨긴다. 묶음 정산 입구는 잔여 거래 정리를 위해 남기며, 정산 화면 경로에는 현재 호스트 전용 redirect가 있다. 서버도 정기모임 호스트를 다시 검사한다. 화면 안내가 모든 일정이라고 표현해도 서버 대상은 아래 회차 필터를 통과한 목록이다.

## 현재 서버 계약

| 요청 | 본문·헤더 | 반환 |
|---|---|---|
| POST /api/v1/regular-meetings/{meetingId}/assignments | providerUserId, 선택 providerRole. 요청키 헤더 없음 | 201 List<ServiceAssignmentVo>, 새로 만든 행만 |
| POST /api/v1/regular-meetings/{meetingId}/settlements | providerUserId, 필수 Idempotency-Key | 200 ServiceAssignmentBulkSettleResultVo[], JSON 배열 |

현재 CreateParam에는 assignmentSource나 offeringId가 없다. 묶음 생성은 HOST_MANUAL 직접 배정이며 카탈로그 상품을 선택하는 묶음 계약이 아니다. 과거의 ‘CATALOG 입력값을 거부한다’는 설명을 현재 요청 DTO로 대신한다. providerRole은 서비스에서 최대 길이를 검사한다.

정산 결과는 eventId, nullable assignmentId, status, nullable reason, nullable eventTitle이다. 앱은 동일한 배열을 List로 읽는다. 정산 API의 PROVIDER safetyExit 선언은 기존 거래 정리를 위한 예외이며 신규 배정이나 다음 회차 자동 승계를 허용한다는 뜻이 아니다.

## 대상 회차와 호스트 이전

두 명령 모두 정기모임의 현재 호스트를 검사하며, 활성 회차가 0개여도 권한 검사를 생략하지 않는다. 회차 목록은 sequenceNo 순서다. 존재하지 않는 이벤트, CANCELED 이벤트, 이벤트 호스트가 정기모임의 현재 호스트와 다른 retained 회차를 제외한다. 이전 호스트에게 남은 회차를 새 호스트의 묶음 작업에 넣지 않는다.

묶음 배정은 정기모임 행을 쓰기 잠금으로 잡고 호스트를 확인한 뒤 이벤트 ID 오름차순으로 회차를 공유 잠금한다. 실제 반환 순서는 원래 회차 순서로 복원한다. 묶음 정산은 처음에 대상 목록을 읽고 각 배정의 정산 시 eventId 일치와 이벤트 호스트/공동 주최자 권한을 다시 검사한다. 처리 중 모든 회차를 하나의 트랜잭션으로 고정하는 방식으로 설명하지 않는다.

회차 교체는 먼저 기존 이벤트 배정들을 ID 순서로 잠근다. 교체 뒤 SETTLEMENT_LOCKED/DECLINED/CANCELED 종단 배정과 새 회차 호스트가 assignment.hostUserId와 다른 배정은 남긴다. 나머지만 eventId를 새 회차로 옮긴다. 같은 assignmentId를 유지하므로 그 번호를 참조하는 과금·계약금·조건 행은 별도로 복제하지 않는다. 회차 교체와 다음 회차 신규 생성은 다른 동작이다.

## 묶음 배정과 중복 처리

회차별로 같은 제공자의 active 배정이 있으면 건너뛰고 없으면 직접 생성한다. active 집합은 DRAFT/ASSIGNED/ACCEPTED/CONFIRMED/SETTLEMENT_LOCKED다. 따라서 정산 잠금은 상태 전이상 종단이지만 중복 배정 검색에서는 active에 포함된다. DECLINED/CANCELED 과거 행이 있다는 이유만으로 항상 건너뛰는 것은 아니다.

새 생성은 회차의 호스트/공동 주최자 권한, 제공자 배정 가능 상태, 상호 차단을 검사한다. 일반 직접 배정은 ASSIGNED이고, 호스트 자신을 직접 배정하면 ACCEPTED로 만든다. 다른 제공자에게는 배정 요청 outbox 알림을 연결한다. 다음 회차 승계 함수와 달리 명시적 생성 경로의 동작이다.

한 회차 생성에서 예외가 나면 묶음 생성 트랜잭션 전체가 롤백된다. 성공 응답은 새 행만 포함하고 건너뛴 회차별 이유는 없다. 응답 재생용 요청키가 있는 API는 아니며 active 행을 확인하는 중복 처리와 영구 명령 결과 재생을 구분한다. 묶음 취소 API는 현재 Controller에 없다.

앱은 제공자 선택 전 계정 ticket을 잡고 선택·명령 완료 뒤 계정 변경을 확인한다. 성공하면 반환된 새 배정 수를 토스트로 보여준다. 현재 assignProviderToRegularMeeting 함수는 Repository 호출을 그대로 반환하고 목록/배정 무효화를 호출하지 않는다. 성공 후 모든 회차 배정 목록이 자동 갱신된다고 설명하지 않는다.

## 묶음 정산의 기록과 부분 성공

반복은 트랜잭션 선언이 없는 별도 ServiceAssignmentBulkSettleService에서 실행한다. 과거 ServiceAssignmentService의 NOT_SUPPORTED 구현 설명을 현재 위치로 바꾼다. 각 배정은 actor, ASSIGNMENT_BULK_SETTLE, 해시된 개별 키로 명령 기록을 만들고 정산 업무·결과 JSON을 같은 트랜잭션에 저장한다.

개별 키는 묶음 요청키와 assignment:{id}를 함께 해시한다. 같은 제공자·대상에 같은 키를 재전송하면 커밋한 SETTLED/ALREADY_SETTLED 결과를 재생한다. 실패해 롤백된 회차는 같은 키로 다시 시도한다. 이 명령은 확정 거절을 별도 저장하는 명령 집합에 포함되지 않는다. 배정이 없던 회차는 기록 없이 NO_ASSIGNMENT를 반환하므로 재요청 시 다시 조회한다.

요청 전체를 고정한 단일 응답 스냅샷은 아니다. 대상 회차와 배정을 다시 찾으며 제목은 마지막 조회로 덧붙인다. 같은 묶음 키로 providerUserId를 바꾸면 다른 assignment 대상의 새 명령이 될 수 있다. 앱은 정기모임과 제공자 조합을 키의 fingerprint로 사용한다.

| 결과 | 현재 판정 |
|---|---|
| NO_ASSIGNMENT | 회차에서 제공자의 active 배정을 찾지 못함 |
| ALREADY_SETTLED | 선택한 배정이 이미 SETTLEMENT_LOCKED이며 이 개별 명령 기록을 새로 만듦 |
| SETTLED | 정산 게이트 통과 후 SETTLEMENT_LOCKED, 관련 수익 승인 |
| SKIPPED_NOT_READY | ASSIGNMENT_NOT_CONFIRMED 또는 ASSIGNMENT_EVENT_NOT_ENDED |
| BLOCKED | 완납·금액 합계·수익 행·출석/몰수 충돌·필수 계약금·최신 조건 수락·이행·분쟁 게이트 오류 |
| FAILED | 위 분류 밖 RestException 또는 일반 예외 |

RestException의 reason은 오류 코드 이름이고 일반 예외는 클래스 단축 이름이다. 배정별 정산 호출에서 난 오류를 결과로 바꾸어 다음 회차를 진행한다. 권한·대상 조회, 반복 중 배정 조회, 마지막 제목 조회 등 바깥 호출까지 모두 부분 결과로 보장하는 것은 아니다. 앞 회차 커밋 뒤 전체 응답이 실패할 수 있어 같은 키 재시도가 필요하다.

SETTLED는 제공자 지갑에 즉시 지급했다는 의미가 아니다. 정산 함수는 배정을 잠그고 필요한 계약금 수익 적용과 관련 earning 승인을 수행한다. 실지급은 [제공자 정산](F21-03_provider-settlement_prd.md)의 지급 경로에서 별도로 판정한다.

## 앱 결과·실패·재시도

실행 중 중복 호출을 막고 제공자 미선택은 요청 전에 안내한다. 화면은 IdempotencyKeyHolder.untimed를 사용해 같은 정기모임·제공자 조합의 실패 재시도에 같은 키를 유지한다. 이 키는 화면 State 메모리에 있으며 앱 재시작·화면 재생성까지 영속 복원하는 초안 저장이 아니다.

HTTP 요청이 성공해 결과 배열을 받으면 BLOCKED/FAILED 행이 있어도 키를 완료 처리한다. 사용자가 다음 실행을 누르면 새 키로 시도하고 서버 상태가 이미 정산한 배정의 재승인을 막는다. 네트워크 등 전체 요청 실패에서는 키를 유지한다.

성공 결과의 SETTLED/ALREADY_SETTLED 회차에 assignmentsChanged를 발행한다. 커밋 가능성이 있는 전체 실패에서는 요청 전에 읽어 둔 정기모임 상세의 회차 ID들에 같은 신호를 보낸다. 상세 provider가 없거나 회차 목록을 확보하지 못했으면 이 실패 갱신 목록은 비어 있다. 묶음 생성의 갱신 경계와 구분한다.

결과 제목은 eventTitle, 없으면 ‘알 수 없는 일정’이다. 상태별 표시와 reason 오류문구 변환을 제공하고 빈 배열은 ‘정산할 일정이 없습니다’를 표시한다. 서버 여섯 상태 외 앱 UNKNOWN fallback이 있다. SKIPPED_NOT_READY와 FAILED는 다시 시도 안내를 포함한다. BLOCKED와 assignmentId가 있는 행은 ‘분담금 현황’으로 해당 이벤트의 배정 화면에 focusAssignmentId를 전달한다. 도착 화면은 해당 배정 카드를 강조한다.

BLOCKED의 현재 배지는 ‘아직 다 내지 않음’이지만 실제 분류에는 분쟁·조건·이행 문제도 포함한다. 배지 문구만으로 모든 막힘을 미납으로 해석하지 않는다.

## 다음 회차 제공자 승계

PROVIDER 범위가 봉인되면 승계 listener는 즉시 종료한다. 허용된 경우에도 원본 종단 배정, 새 회차의 동일 제공자 active 배정, 현재 배정 불가 제공자를 제외한다.

수락된 조건 행이 없는 원본은 제공자·역할·기존 hostUserId를 가진 HOST_MANUAL 배정을 ASSIGNED로 생성한다. DRAFT로 생성한다는 과거 설명과 그에 근거한 ‘자동 승계가 재개 불가’ 결함은 폐기한다. 명시적 자기 직접 배정의 자동 ACCEPTED 분기를 이 승계 코드에도 있다고 확대하지 않는다.

수락된 조건 행이 있으면 상품 ID/스냅샷과 수락 조건의 총액 X·계약금 D·payload를 새 terms v1으로 복제한다. 새 배정은 HOST_MANUAL·ASSIGNED, currentTermsVersion=1이며 acceptedTermsVersion은 복제하지 않는다. fee rate와 정책 버전은 생성 시 현재 값을 사용하고 expiresAt은 null이다. 이전 과금·계약금·engagement·보장수수료 재원을 복제하지 않으며 새 회차에서 조건을 다시 수락해야 한다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `ServiceAssignmentController#bulkAssignToRegularMeeting`, `ServiceAssignmentController#bulkSettleRegularMeeting`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 묶음 배정은 새 행만 반환하며 건너뛴 회차별 결과와 묶음 취소 API가 없다. | 정산의 여섯 결과를 생성 응답에 적용하지 않는다. |
| Gap | 앱 묶음 배정 성공 뒤 배정/목록 무효화 호출이 없다. | 성공 토스트와 실제 목록 재조회 보장을 구분한다. |
| Risk | 정산 키는 화면 메모리에만 있고, 바깥 조회 실패는 앞 회차 커밋 뒤 전체 오류가 될 수 있다. | 같은 키 재시도와 화면 재생성의 한계를 명시한다. |
| Risk | BLOCKED 배지 문구는 미납으로 좁지만 서버 사유는 계약·분쟁·이행까지 포함한다. | reason과 해당 배정 상세를 함께 확인한다. |
| 미검증 | 동시 호스트 이전·회차 교체·응답 단절 재시도·실지급·실제 앱 이동을 이번에 실행하지 않았다. | 소스 근거와 제품 시험 통과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 입력 계약:** 정기모임 ID와 회차 ID를 구분하고 직접 생성의 두 필드, 정산 필수 요청키와 배열 응답을 따른다.
- **AC-02 호스트와 회차:** 빈 목록에서도 호스트를 검사하고 취소·누락·이전 호스트 retained 회차를 제외한다.
- **AC-03 생성 단위:** active 배정만 건너뛰고 새 행만 반환하며 한 회차 예외는 전체 생성을 롤백한다.
- **AC-04 정산 기록:** 배정별 키와 업무를 함께 커밋하고 성공 결과 재생·실패 재시도·배정 없음 재판정을 구분한다.
- **AC-05 상태 의미:** 여섯 서버 결과·UNKNOWN fallback·정산 승인과 실지급·바깥 조회 실패를 구분한다.
- **AC-06 앱 갱신:** 생성의 무효화 부재와 정산 성공/불명확 실패의 회차 신호를 실제 호출대로 설명한다.
- **AC-07 화면 복귀:** 호스트 redirect, 제목/빈 목록/다시 시도, BLOCKED의 배정 강조 경로를 연결한다.
- **AC-08 다음 회차:** 봉인·종단·중복·제공자 자격 필터 뒤 ASSIGNED를 생성하고 수락/재원은 승계하지 않는다.
- **AC-09 회차 교체:** 잠금 후 비종단·동일 호스트 배정만 기존 assignmentId를 유지해 새 eventId로 옮긴다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
