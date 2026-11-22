# F17-01. 정기모임 발견·운영·참여 목록 PRD

<!-- release-document: reference -->
2026-11-22 서버·앱 소스 대조 문서다. 새 제품 실행·브라우저·실기기 검수 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

앱 `/regular-meetings`는 공개 목록, `/regular-meetings/my`는 운영하는 모임, `/regular-meetings/my/enrolled`는 참여하는 모임이다. 같은 목록 화면의 `all`, `operated`, `enrolled` 모드를 사용한다. 카드에서 [정기모임 상세](F17-02_regular-meeting-detail_prd.md#참가자가-판단하고-다음-행동으로-이동하는-화면)로 이동한다.

로그인한 이용자에게 공개·운영 목록의 만들기 입구를 제공한다. 참여 목록에는 만들기 입구가 없다. 운영 방식 설명은 운영 목록에만 두며 공개 목록은 카드 탐색을 먼저 제공한다.

## 현재 서버 계약

세 API 모두 `Page<RegularMeetingSimpleVo>`를 반환하며 앱은 `PageResponse<RegularMeetingSimpleVo>`로 받는다. 공개 목록은 HTTP 비로그인 조회를 허용하고 `/my`, `/my/**`는 인증이 필요하다.

| 요청 | 실제 조회 범위 | 정렬 |
|---|---|---|
| GET /api/v1/regular-meetings | 숨김이 아닌 OPEN 모임 | createdAt 내림차순, id 내림차순 |
| GET /api/v1/regular-meetings/my | 현재 이용자가 호스트인 모임. 상태·숨김 필터 없음 | createdAt 내림차순, id 내림차순 |
| GET /api/v1/regular-meetings/my/enrolled | 활성 과정 등록 또는 VARIABLE 회차 참석·대기에서 모임 ID를 모은 뒤 숨김 제외, OPEN/CLOSED만 | OPEN 먼저, createdAt·id 내림차순 |

공개 검색의 실제 필터는 `keyword`(제목 또는 설명 부분 일치), **`categories`**(목록), `meetingType`, `region`(주소 부분 일치)이다. 카테고리·타입 문자열은 서버 enum으로 파싱하고 잘못된 값은 `SEARCH_FILTER_INVALID`로 거절한다. 요청 객체에 `status`, `sortType`이 있어도 현재 검색 쿼리는 이를 적용하지 않는다. `category` 단수나 후기순·거리순 지원으로 설명하지 않는다.

참여 목록의 과정 등록 상태는 PENDING, WAITING, APPROVED_PENDING_PAYMENT, ENROLLED다. VARIABLE은 취소되지 않은 회차의 ATTENDING 또는 WAITING을 추가한다. 두 경로의 모임 ID를 합쳐 중복을 제거한다. 따라서 운영 목록은 참여 목록과 합산되지 않으며, 참여 목록은 취소·탈락·결제 만료 전체 이력 화면이 아니다. 참여 목록에 관련 등록 행이 있으면 `myMemberStatus`를 채우고, 결제 대기일 때만 `myPaymentDueAt`, 정원 대기일 때만 `myWaitlistOrder`를 채운다.

## 카드와 요약 집계

`shortIntro`, 썸네일 표시 URL, 호스트 닉네임, 지역 요약, 등록 인원, 실제 공개 회차 수와 다음 회차를 목록에서 내려준다. 지역은 오프라인 주소의 앞 두 어절이며 온라인은 null이다. 공개 회차 집계는 PUBLIC인 OPEN/CLOSED 회차를 세고, 다음 회차와 예정 수는 그중 시작 전 OPEN 회차로 계산한다. 계획한 `totalSessionCount`와 실제 `publishedSessionCount`는 다른 값이다. 조회 페이지의 모임 ID들을 묶어 회차 요약을 집계한다.

앱은 종류·모집 상태·내 등록 상태를 구분한다. VARIABLE 본체 가격 0은 무료로 해석하지 않고 일정별 비용·정원을 표시한다. 다음 일정이 없으면 공개 회차 0건인 ‘일정 준비 중’과 ‘예정된 일정 없음’을 구별한다. FIXED는 전체 과정 참가비·등록 인원을 표시한다. 제목·짧은 소개는 두 줄, 지역·기간은 한 줄 말줄임 처리한다.

## 앱 탐색·실패·복귀

세 목록 모두 20건씩 첫 페이지와 추가 페이지를 읽는다. 로딩·오류 재시도·빈 목록·추가 조회 오류를 구분한다. 목록의 새로고침은 해당 공급자를 무효화하며 운영/참여 데이터 변경을 구독한다. 참여 목록은 이벤트 카드 데이터 변경도 구독한다.

현재 공개 목록 화면은 `regularMeetingListProvider()`를 필터 인자 없이 사용한다. 서버와 공급자가 검색 조건을 지원한다는 사실을 이 화면에 검색창·필터 UI가 있다는 뜻으로 확대하지 않는다. 카드 탭은 `/regular-meetings/{id}`를 연다.

## 코드 위치

서버: RegularMeetingController, RegularMeetingService, RegularMeetingQueryRepository, RegularMeetingReadSupport, RegularMeetingSearchParam, SecurityConfiguration. 앱: regular_meeting_api.dart, regular_meeting_list_provider.dart, regular_meeting_list_screen.dart, regular_meeting_simple_vo.dart, regular_meeting_routes.dart.

<!-- source-references:start -->
서버 창구: `RegularMeetingController#search`, `RegularMeetingController#myMeetings`, `RegularMeetingController#myEnrolledMeetings`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 공개 목록 화면에는 검색 조건을 입력하는 UI가 없다. | API 필터 지원과 화면 제공 범위를 구분한다. |
| Gap | status/sortType 요청값이 검색 쿼리에 반영되지 않는다. | 현재 정렬은 최근 생성순으로 기록한다. |
| Risk | 참여 목록은 활성 참여의 OPEN/CLOSED 모임만 포함한다. | 과거 취소·결제 전체 기록으로 안내하지 않는다. |
| 미검증 | 이번 작업에서 목록 이동·로그인 복귀·무한 스크롤을 실행하지 않았다. | 소스 대조와 실제 사용 검증을 구분한다. |

기존 ‘일반 EventCard 13곳 이상 미통합’, ‘정기모임 푸시 미구현’은 이 목록의 현재 근거가 아니므로 미구현 판정에서 제외한다. 다른 영역의 전체 적용 여부를 이 문서에서 추정하지 않는다.

## 수용 기준과 검증 근거

- **AC-01 공개 탐색:** 비로그인 공개 검색은 숨김이 아닌 OPEN만 반환하고 개인 목록은 인증을 요구한다.
- **AC-02 실제 필터:** categories 복수명과 서버 enum 검증을 사용하고 status/sortType 미적용을 구분한다.
- **AC-03 운영과 참여:** 호스트 전 상태 목록과 활성 참여 OPEN/CLOSED 목록의 서로 다른 조건을 설명한다.
- **AC-04 회차 집계:** 계획 회차·실제 공개 회차·시작 전 회차를 구분하고 페이지 단위 집계를 사용한다.
- **AC-05 가격과 상태:** VARIABLE의 일정별 비용·정원과 FIXED의 과정 참가비, 등록 상태·납부 기한·대기 순번을 구분한다.
- **AC-06 탐색 실패:** 20건 페이지, 추가 조회 재시도, 빈 상태와 카드 상세 이동을 현재 앱 연결로 대조한다.

현재 근거는 서버·앱 소스다. 새 제품 시험이나 화면 검수 통과 기록은 없다.

## 과거 실행 기록의 보존

아래는 이전 문서의 당시 기록이다. 이번 소스 대조의 실행 근거로 합산하지 않으며 현재 계약은 위 본문을 따른다.

> 2026-09-30 `RM-UX-01`에서 구현했고, 2026-10-02 현재 API·앱 main에 반영했다. 저장소별 커밋과 검증 소스 대조 기록 (Git 이력)에 병합과 검증 근거를 남긴다. 공개 목록은 운영·결제·노쇼 설명을 먼저 읽게 하지 않고 모임 카드부터 제공한다. 운영 방식 설명은 주최자의 내 모임 목록과 상세 정책에서 확인한다.
