# F17-03. 정기모임 생성·기본 정보 수정 PRD

<!-- release-document: reference -->
2026-11-22 서버·앱 소스 대조 문서다. 새 실행·브라우저·실기기 검수 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

공개·운영 목록의 만들기에서 FIXED(전체 과정 등록) 또는 VARIABLE(일정별 신청) 초안을 만든다. 이벤트 회고의 정기모임 만들기는 본인이 주최한 이벤트를 바탕으로 VARIABLE 초안을 만든다. 생성 성공은 아직 공개·등록·납부 완료가 아니다. 상세에서 검토하고 [모집 상태 관리](F17-04_regular-meeting-lifecycle_prd.md)를 거쳐 공개한다.

기본 정보 수정은 호스트의 DRAFT만 허용한다. `meetingType`은 수정 요청에 없으며 생성 후 바꿀 수 없다. 현재 회원 Controller에는 모임 본체 DELETE가 없으므로 ‘초안 삭제 API’를 제공한다고 설명하지 않는다. 모임 취소는 별도 명령이다.

## 현재 서버 계약

| 요청 | 입력·키 | 결과 |
|---|---|---|
| POST /api/v1/regular-meetings | RegularMeetingAddParam, Idempotency-Key 필수 | 201 RegularMeetingVo, DRAFT |
| POST /api/v1/regular-meetings/from-event/{eventId} | 본인 이벤트 ID, Idempotency-Key 필수 | 201 VARIABLE DRAFT |
| PATCH /api/v1/regular-meetings/{id} | RegularMeetingModParam, 생성용 키 없음 | 200 수정된 RegularMeetingVo |

생성 요청은 제목의 공백 여부와 최대 200자, category·meetingType·locationType 필수, 정원 음수·금액 음수, 주소 500자·상세 200자·온라인 URL 500자 상한을 검사한다. 현재 호스팅 제한 제재가 있으면 USER_RESTRICTED_FROM_HOSTING으로 거절한다. FIXED는 총 회차 1~200과 정원 1 이상이 필요하다.

| 필드 | FIXED | VARIABLE |
|---|---|---|
| 날짜·총 회차 | 요청한 LocalDate·총 회차 | null |
| 가격·기본 정원 | 100원 단위 절삭 가격·양수 정원 | 0·0 |
| 선결제·승인 | 선결제는 요청 true이면서 저장 가격 양수일 때, 승인은 요청값 | false·false |
| 결제 정책 | 저장 가격 양수이면 prepaymentType 필수 | null |
| 환불 정책·기준 시간 | 요청 또는 FULL 기본값·요청값 | FULL·null |

가격은 null이면 0이며 100원 미만 자릿수를 버린다. 1~99원은 저장 시 0원이므로 입력이 양수라는 이유만으로 유료라고 단정하지 않는다. VARIABLE의 노쇼 관련 요청값은 생성 코드에서 그대로 전달되지만 현재 앱은 해당 타입에 이를 보내지 않는다.

기존 이벤트에서 생성은 소유자를 검사하고 제목·설명·카테고리·장소·썸네일을 복사하여 일반 생성 경로로 넘긴다. 기존 이벤트를 회차로 편입하거나 참가자를 자동 이관하는 명령은 아니다. 생성 재조회는 저장된 모임 ID의 현재 호스트와 모임 존재를 다시 확인한다.

## 초안 수정과 장소

수정은 모임을 잠그고 소유자·DRAFT를 확인한다. 제공한 값만 적용하며 총 회차를 취소되지 않은 기존 회차 수 아래로 줄일 수 없다. FIXED 정원 변경은 연결된 살아 있는 회차에도 적용한다. 금액을 0으로 바꾸면 선결제 필수·결제 정책·계좌 연결을 해제한다. 유료 상태인데 결제 정책이 비어 있으면 거절한다.

오프라인 장소는 미정으로 둘 수 있다. 온라인은 빈 값이 아닌 유효한 http/https URL이 필요하다. 장소 유형을 바꾸면 반대 유형의 주소 또는 온라인 URL을 제거한다. 오프라인 주소를 빈 문자열로 수정하면 상세 주소·좌표도 비운다. 초안 장소 변경은 연결된 DRAFT 회차에 전파된다. 공개 후 오프라인 장소 변경은 [공개 뒤 장소 변경](F17-04_regular-meeting-lifecycle_prd.md#공개-뒤-장소-변경)의 별도 계약이다.

썸네일은 EVENT_THUMBNAIL 용도의 소유·업로드 검증을 거친 키를 저장한다. 수정에서 정규화 결과가 null이면 새 값을 지정하지 않으므로 빈 입력으로 기존 썸네일을 제거할 수 있다고 추정하지 않는다.

## 앱 입력과 이미 해결된 항목

생성 카테고리는 서버 Category의 15개 항목을 사용하고 기본값은 SOCIAL이다. 기존 문서의 CLASS/STUDY/HOBBY 불일치 주장은 현재 미구현 항목에서 제외한다. 생성·수정에 주소 선택·상세 위치·좌표·온라인 URL 입력이 연결돼 있으며, 서버 생성·수정 모두 음수 가격을 거절한다.

FIXED 입력은 기간·총 회차·정원·가격·승인·선결제·환불·노쇼 정책이다. 날짜는 dateKey 문자열로 직렬화하여 서버 LocalDate에 보낸다. 앱은 종료일이 시작일보다 빠르면 막는다. 좌표가 없는 새 오프라인 주소는 주소 검색으로 좌표를 구하며 실패하면 입력을 유지한다. 수정은 기존 주소의 좌표를 불필요하게 다시 구하지 않는다.

앱은 유료 새 과정의 정책을 현재 활성 결제 기능에서 정하고 사용 가능한 정책이 없으면 저장을 막는다. 수정에서 결제 조건을 바꾸지 않으면 기존 정책을 보존한다. 정책이 누락된 기존 유료 초안은 가격 입력을 명시적으로 확인하여 정책을 정해야 한다. 무료로 바꾸는 요청은 가격과 선결제 false를 보내며 서버가 정책을 비운다.

생성/수정 제출 body에는 thumbnailUrl이 연결되지 않는다. 생성에는 카테고리 선택이 있지만 현재 수정 body에는 category를 보내지 않는다. 서버 수정 가능 필드와 화면 제공 범위를 분리한다.

## 응답이 끊긴 생성 요청과 계정별 복원

일반 생성은 계정별 로컬 초안에 입력과 요청 본문·키·발급 시각·성공 결과를 보관한다. 요청 전 저장에 실패하면 전송하지 않는다. 응답이 유실됐을 수 있거나 MEMBER_COMMAND_RESULT_UNAVAILABLE이면 같은 요청 정보를 남긴다. 저장되지 않은 것으로 판정할 수 있는 실패만 pending 요청을 해제한다.

재진입 시 같은 본문·키로 다시 확인하며, 성공 결과를 이미 보관한 경우 새 생성 없이 해당 상세로 이동한다. 입력을 새 요청으로 바꾸기 전에는 운영 목록에서 결과를 확인했다는 명시적 확인을 받고 중복 생성 가능성을 알린다. 계정·세션·초안 소유권을 확인하여 이전 계정의 요청을 현재 계정에서 전송하지 않는다.

이벤트 기반 생성도 계정과 eventId별 로컬 기록을 쓰고 같은 세션·계정·이벤트의 동시 실행을 공유한다. 일반 초안 수정은 생성용 Idempotency-Key를 사용하는 명령이 아니며 저장/실패 후 입력 보존과 성공 시 상세 복귀를 별도로 처리한다. 성공하거나 저장됐을 가능성이 있는 결과에서는 정기모임 목록 변경을 알린다.

## 본체 생성과 반복 일정의 경계

정기모임 본체 생성은 회차를 자동 생성하지 않는다. 단건 추가와 반복 생성은 [회차 생성·대체·취소](F17-05_regular-meeting-sessions_prd.md)에서 수행한다. 개인 반복·클럽 반복을 이 API와 같은 요청이라고 설명하지 않는다.

## 코드 위치

서버: RegularMeetingController, RegularMeetingCourseCommandService, RegularMeetingCourseRules, RegularMeetingCourseTransitions, RegularMeeting, Category, RegularMeetingAddParam/ModParam. 앱: regular_meeting_create_screen.dart, regular_meeting_edit_screen.dart, regular_meeting_add_param.dart, regular_meeting_mod_param.dart, regular_meeting_creation_draft.dart, regular_meeting_write_command.dart, event_recap_screen.dart.

<!-- source-references:start -->
서버 창구: `RegularMeetingController#create`, `RegularMeetingController#createFromEvent`, `RegularMeetingController#update`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 생성·수정 화면에서 썸네일 값을 작성하지 않고 수정 body에 category도 없다. | 서버 지원과 앱 입력 지원을 구분한다. |
| Gap | 서비스의 기본 수정 검사는 제목 공백, 본체 날짜의 시작/종료 순서를 별도로 검사하지 않는다. | 앱 검사와 서버 보장을 동일시하지 않는다. |
| Risk | 가격은 100원 단위로 절삭된다. | 1~99원 입력을 유료 저장 성공이라고 설명하지 않는다. |
| 미검증 | 로컬 초안 복구·계정 전환·응답 유실을 이번에 실행하지 않았다. | 소스 대조를 실제 복구 통과로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 초안 생성:** 정상 요청은 DRAFT이며 FIXED의 총 회차 1~200·양수 정원과 공통 입력을 검사한다.
- **AC-02 타입 정규화:** VARIABLE의 날짜·회차·가격·정원·승인·선결제와 FIXED의 저장 가격 기준 정책을 구분한다.
- **AC-03 수정 범위:** 현재 호스트의 초안만 수정하며 타입 불변·기존 회차 수·정원 전파를 적용한다.
- **AC-04 장소 계약:** 오프라인 미정, 온라인 URL 필수, 유형 전환 시 비관련 필드 정리와 초안 회차 전파를 설명한다.
- **AC-05 현재 앱 입력:** 카테고리·장소·음수 가격의 해결된 항목과 썸네일·수정 카테고리 미제공을 나눈다.
- **AC-06 생성 재확인:** 요청 전 로컬 저장, 같은 본문·키, 결과 미확정 유지와 계정 경계를 설명한다.
- **AC-07 이벤트 재사용:** 본인 이벤트에서 VARIABLE 초안을 만들고 기존 이벤트·참가자를 자동 편입하지 않는다.
- **AC-08 결과 복귀:** 생성 결과는 상세로, 수정 성공은 원래 화면 또는 상세로 복귀하며 관련 목록을 갱신한다.

현재 근거는 서버·앱 소스다. 새 제품 시험·브라우저·실기기 통과 기록은 없다.
