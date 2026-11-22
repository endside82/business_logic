# F10-03. 본인 가능 시간 등록·수정·삭제 PRD

<!-- release-document: reference -->
> 2026-11-22 소스 대조. 현재 계약과 검증 경계이며 새 제품 실행 기록이 아니다. 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 입구와 입력

월 달력 추가 또는 일간 추가에서 신규 입력을 열고, AVAILABILITY 카드에서 id를 전달해 편집한다. 신규의 과거 initialDate는 서울 오늘로 보정한다. 편집은 본인 기록을 읽어 제목·날짜·시간과 반복 규칙 번호를 채운다. 반복에서 만들어진 한 칸의 수정과 전체 반복 규칙 수정은 별도 입구다.

## 코드 위치

`AvailabilityController`, `AvailabilityService`, `AvailabilityQueryRepository`, `CalendarHostEventAdapter`와 `availability_screen.dart`, `availability_provider.dart`, `availability_time_rule.dart`, `availability_param.dart`를 대조했다.

<!-- source-references:start -->
서버 창구: `AvailabilityController#createAvailability`, `AvailabilityController#getAvailabilities`, `AvailabilityController#getAvailability`, `AvailabilityController#updateAvailability`, `AvailabilityController#deleteAvailability`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 서버 소유권과 저장

목록은 principal의 userId만 읽는다. 단건 읽기는 없음과 다른 소유자를 구별하고, 수정·삭제는 id+userId로 찾아 본인 행이 아니면 AVAILABILITY_NOT_FOUND다. title·startTime·endTime·timezone만 받으며 공개/친구 visibility는 없다.

생성은 미래 시작·정상 시간 범위·제목 최대 100자·본인 가능 시간과 겹치지 않음을 확인해 isRecurring=false로 저장한다. 겹침은 start<상대end와 end>상대start여서 끝과 시작이 맞닿는 것은 겹침이 아니다. 모임과의 충돌 검사는 이 생성 겹침 검사와 다른 경로다.

PATCH는 null 필드를 유지한다. title의 빈 문자열은 변경값이지만 null은 기존 제목 유지다. 시각을 바꿀 때 합쳐진 범위·길이·자기 행을 뺀 겹침을 재검사한다. 생성의 ‘과거 시작 금지’를 수정에도 동일하게 실행하지는 않는다. 저장한 반복 인스턴스의 규칙 ID를 이 PATCH가 지우거나 전체 규칙을 수정하지 않는다.

## 서울 시간과 입력 검증

현재 timezone은 Asia/Seoul만 허용한다. 생성은 timezone 누락·빈 문자열도 거절한다. 시작/종료 차이는 30~480분의 30분 배수여야 한다. 앱도 같은 길이 규칙과 반복 선택 요일을 확인해 유효하지 않으면 저장을 막는다. 30분 배수는 길이에 대한 규칙이며 시작 분을 반드시 00/30으로 고정하는 서버 조건은 아니다.

앱은 선택한 서울 날짜·시각 성분을 서버 벽시계 형식으로 직렬화한다. 기기의 로컬 시간대로 다시 변환해 날짜를 바꾸는 동작으로 설명하지 않는다. 단일 화면은 같은 날짜의 시작·종료를 구성한다. 서버 LocalDateTime 계약이 앱의 모든 날짜 선택 제한과 동일한 것은 아니다.

## 삭제 확인과 강제 삭제

DELETE는 204가 아니라 AvailabilityDeleteCheckVo를 반환한다. 본인의 DRAFT/OPEN 주최 모임 중 decisionPending=false이고 시간이 겹치는 건수를 확인한다. 충돌이 있고 force=false면 deleted=false로 남긴다. 앱은 건수를 보여 주고 확인받은 뒤 force=true로 다시 요청한다. 충돌 확인 자체는 삭제가 아니다.

deleted=true일 때 해당 가능 시간만 삭제한다. 겹친 모임을 취소하거나 반복 규칙 전체를 삭제하지 않는다. 삭제 실패는 화면에 남고 다시 시도할 수 있다. 반복 규칙 전체 제거는 [반복 가능 시간 관리](F10-04_recurring-availability-rule_prd.md)의 별도 명령이다.

## 저장·오류·복귀와 갱신

성공은 안내 후 현재 화면을 닫고 달력 변경 신호를 보낸다. 수정은 상세 상태도 갱신하며 deleted=false에는 변경 신호를 보내지 않는다. 서버에 반영됐을 수 있는 오류도 달력을 재조회한다. 새 생성·수정 요청에는 영구 멱등 키가 없어 응답 유실 뒤 같은 성공 결과 재생을 보장하지 않는다.

실패는 입력을 유지한다. 현재 충돌 배너 판정은 errorCode가 아니라 오류 message에 OVERLAP이 포함되는지 검사한다. 따라서 모든 TIME_OVERLAP_DETECTED 응답에 반드시 같은 배너가 뜬다고 단정하지 않는다. 본인 외 기록 조회 오류가 사용자에게 어떻게 안내되는지는 상세 로딩·실패 처리와 함께 확인해야 한다.

## 요청과 응답

| 요청 | 현재 계약 |
| --- | --- |
| POST /api/v1/availability | title·startTime·endTime·timezone → 201 AvailabilityVo |
| GET /api/v1/availability?from=&to=&includeRecurring= | 날짜 to를 포함하도록 다음 날 시작으로 조회. items·totalCount·from·to의 AvailabilitySimpleVo |
| GET /api/v1/availability/{id} | 본인 AvailabilityVo |
| PATCH /api/v1/availability/{id} | 선택 변경값 → AvailabilityVo |
| DELETE /api/v1/availability/{id}?force= | hasConflictingEvents·conflictingEventCount·deleted, 200 |
| GET /api/v1/availability/{id}/calendar | 본인 ICS 파일 내보내기 창구. 실제 단말 공유 성공은 별도 |

## 현재 제한과 확인 범위

| 구분 | 현재 경계 |
| --- | --- |
| Gap | 충돌 배너는 message 문자열에 의존한다. 오류 코드만으로 표시 성공을 보장하지 않는다 |
| Risk | 일반 생성은 요청 키 재생이 없으며 조회 후 겹침 검사만으로 모든 동시 등록 경합이 해결됐다고 주장하지 않는다 |
| 미검증 | 소스·기존 달력 신호 단언을 읽었다. 기존 E2E 원문은 과거 인용으로 보존하며 이번 실행 결과에 합산하지 않는다 |

## 수용 기준과 검증 근거

- **AC-01 소유권:** 본인만 조회·수정·삭제하며 visibility를 받지 않는다.
- **AC-02 신규:** 미래 시작·제목 길이·timezone·정상 범위를 확인해 단일 행을 만든다.
- **AC-03 길이:** 30~480분·30분 배수를 앱과 서버에서 확인한다.
- **AC-04 겹침:** 본인 기록의 실제 겹침만 거절하고 맞닿는 경계는 구별한다.
- **AC-05 수정:** null 유지·빈 제목·현재 값과 합친 시간 검증 및 반복 연결 유지의 의미를 보존한다.
- **AC-06 삭제 확인:** 충돌 시 deleted=false와 force 재요청을 구분한다.
- **AC-07 삭제 결과:** 가능 시간만 제거하고 모임·반복 규칙을 취소하지 않는다.
- **AC-08 갱신:** 명령 성공·서버 반영 가능 오류·삭제 미실행을 구분한다. 기존 신호 단언을 읽었다.
- **AC-09 오류:** 입력 유지·문자열 기반 충돌 안내와 응답 불명 한계를 표시한다.

위 항목은 문서 수용 기준이며 새 시험 통과 수가 아니다.
