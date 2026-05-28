# F17-03. 정기모임 생성 (호스트) PRD

## 1. 결론

호스트가 정기모임 본체를 작성한다. 첫 단계는 항상 `DRAFT` 상태로 저장되며, 발행은 별도 publish 호출(F17-04)에서 이루어진다. `meetingType` 이 `FIXED` 인 경우만 `totalSessionCount>0`, `baseCapacity>0`, `price`(BigDecimal, 100원 floor) 가 의미 있고, `VARIABLE` 은 세션별로 정원·가격이 재정의되므로 본체 필드는 0/null 허용. 가격은 도메인 메서드 `truncateToHundred(price)` 가 100원 단위로 절삭(`RoundingMode.DOWN`)한다 — Event.price 와 동일 정책.

Flutter `RegularMeetingCreateScreen` 은 MVP 폼: `type, category, locationType, capacity, price, approvalRequired, prepaymentRequired`. 작성 직후 호스트는 DRAFT 모임의 세션을 자유롭게 추가/대체할 수 있고, 모든 준비가 끝나면 발행(publish) 한다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#create` | `POST /api/v1/regular-meetings` |
| Backend Service | `RegularMeetingService#createMeeting` | DRAFT 초기화, FIXED 불변식, 100원 floor |
| Backend Param | `RegularMeetingAddParam` | `@NotBlank title`, `@NotNull category/meetingType/locationType`, validation |
| Backend Entity | `RegularMeeting` (model) | `truncateToHundred(price)`, 상태 DRAFT 기본 |
| Backend Enum | `RegularMeetingType`, `RegularMeetingNoShowPolicy`, `RegularMeetingNoShowCountMode` | 옵션 노쇼 정책(기본 NONE) |
| Flutter API | `regular_meeting_api.dart` | `POST` Retrofit |
| Flutter Param | `regular_meeting_add_param.dart` | Freezed `*Param` |
| Flutter Screen | `regular_meeting_create_screen.dart` | MVP 폼 |

## 3. 전체 동작 흐름

1. 호스트가 "정기모임 만들기" CTA → `RegularMeetingCreateScreen`.
2. type 선택(FIXED/VARIABLE) → 폼 분기 표시(FIXED 만 코스 정원·가격·세션 수 필드 활성).
3. 폼 제출 → `RegularMeetingRepository.create(RegularMeetingAddParam)` → `POST /api/v1/regular-meetings`.
4. 서버 validation (`@Valid`): title 필수, category·type·locationType 필수, URL 패턴 검증. FIXED 추가 불변식: `totalSessionCount > 0`, `baseCapacity > 0` → 위반 시 `INVALID_INPUT`.
5. 도메인 builder 가 price 를 `truncateToHundred` (예: 12,345 → 12,300) 처리하고 status=DRAFT 로 저장.
6. 응답 `RegularMeetingVo` → Flutter 가 `Routes.regularMeetingDetail.path(id)` 로 이동 (DRAFT 상세).
7. 이어서 세션 추가(F17-05) → 발행(F17-04).

## 4. 서버 계약

### `POST /api/v1/regular-meetings`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#create` |
| 인증 | 필수 (`@AuthenticationPrincipal UserPrincipal`) |
| Body | `RegularMeetingAddParam` |
| 응답 | 201 `RegularMeetingVo` (DRAFT) |
| validation | `@NotBlank title`, `@Size(max=200)`, `@NotNull category/meetingType/locationType`, `@Min(0) baseCapacity`, URL 패턴 |
| FIXED 추가 가드 | `totalSessionCount > 0`, `baseCapacity > 0` 위반 → `INVALID_INPUT` |
| 가격 정규화 | `RegularMeeting.setPrice` 에서 100원 단위 절삭 (`RoundingMode.DOWN`) |
| 초기 status | `DRAFT` (불변) |

`RegularMeetingAddParam` 필드: `title, description, category, meetingType, locationType, address, addressDetail, latitude, longitude, onlineUrl, startDate, endDate, totalSessionCount, price, prepaymentRequired, refundPolicy, refundDeadlineHours, baseCapacity, approvalRequired, noShowPolicy, noShowLimit, noShowCountMode, thumbnailUrl`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.regularMeetingCreate = /regular-meetings/create` |
| Screen | `RegularMeetingCreateScreen` |
| MVP 입력 필드 | type / category / locationType / baseCapacity / price / approvalRequired / prepaymentRequired |
| 후속 입력 | description / address / startDate~endDate / totalSessionCount / refundPolicy / refundDeadlineHours / noShow 정책 / thumbnail |
| 성공 후 | `regularMeetingDetail` 라우트 + `AppToast.show("초안이 생성되었습니다")` |
| 가격 표기 | 입력값에 100원 단위 가이드 표기. 서버가 잘라낸 값을 응답 후 반영 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S3-1 | FIXED 정상 생성 | type=FIXED, totalSessionCount=8, baseCapacity=10, price=12345 | 201, status=DRAFT, price=12300 (100원 절삭) |
| S3-2 | VARIABLE 정상 생성 | type=VARIABLE, totalSessionCount=null, baseCapacity=0 | 201, status=DRAFT. 세션별 정의 후속 |
| S3-3 | FIXED + totalSessionCount=null | type=FIXED, totalSessionCount 누락 | 400 `INVALID_INPUT` |
| S3-4 | FIXED + baseCapacity=0 | type=FIXED, baseCapacity=0 | 400 `INVALID_INPUT` |
| S3-5 | title 누락 | title="" | 400 (`@NotBlank` violation) |
| S3-6 | onlineUrl 형식 오류 | locationType=ONLINE, onlineUrl="not-a-url" | 400 ("올바른 URL 형식이 아닙니다") |
| S3-7 | 노쇼 정책 NONE 기본 | noShowPolicy 미지정 | DB 저장 시 NONE 강제 (builder 디폴트) |
| S3-8 | refundPolicy null | 미지정 | `RefundPolicyType.FULL` 강제 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| DRAFT 강제 | `RegularMeeting.builder().status(...)` 가 null 이면 DRAFT 로 설정 + Param 에 status 필드 없음 | 외부에서 status 강제 불가 |
| 100원 절삭 | `RegularMeeting.setPrice` + 빌더 모두 truncateToHundred 적용 | Event.price 와 동일 정책 |
| FIXED 불변식 위치 | `RegularMeetingService#createMeeting` 안에서 `param.getTotalSessionCount() == null \|\| <= 0` 검사 | 서비스 레이어 |
| 호스트 = 작성자 | `hostUserId = principal.userId` 자동 설정. 후속 변경 불가 (호스트 교체 미지원) | 확정 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후속 | 구현 리포트 §10 | DRAFT 다중 생성 가능 (호스트당 모임 수 제한 없음) | 운영 정책 결정 후 quota 추가 가능 |
| 위험 | 가격 절삭 UX | 사용자가 12345 입력 → 12300 저장. 응답을 다시 보여줘야 혼란 방지 | Flutter create 후 detail 진입 시 가격 표시로 자연 확인 |
| 위험 | VARIABLE + price 입력 | VARIABLE 은 본체 price 무의미하지만 입력 자체는 차단 안 됨 | 폼 측에서 type=VARIABLE 시 price 필드 비활성 |

## 9. 수용 기준

- **AC-01 (S3-1). FIXED 생성 happy path**: Given valid Param. When `POST`. Then 201 + status=DRAFT + price 100원 절삭. `lastEventCreatedAt=null`.
- **AC-02 (S3-3). FIXED 불변식**: Given `meetingType=FIXED, totalSessionCount=null`. Then 400 `INVALID_INPUT`.
- **AC-03 (S3-7). 노쇼 정책 디폴트**: Given `noShowPolicy=null`. Then 저장 후 noShowPolicy=NONE.
- **AC-04 (S3-2). VARIABLE 생성**: Given type=VARIABLE, totalSessionCount=null. Then 201. 본체 price/capacity 는 0 허용.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| 호스트 모임 quota | 운영 정책 미정 | 후속에 호스트당 동시 OPEN 수 제한 검토 |
| 카테고리·태그 자동 추천 | MVP 외 | 별도 검색 최적화 슬라이스 |
