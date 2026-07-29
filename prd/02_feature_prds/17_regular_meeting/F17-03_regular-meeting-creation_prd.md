# F17-03. 정기모임 생성·초안 수정 PRD

<!-- source-measured: 2026-07-29; api HEAD be38d128b80d; app HEAD cb21bce8ef08 -->

## 1. 결론

호스트는 `FIXED`(코스 전체 등록·결제) 또는 `VARIABLE`(세션별 신청·결제) 정기모임을 만들며, 서버는 항상 `DRAFT`로 저장한다. 수정·삭제는 호스트의 `DRAFT`에서만 가능하고 `meetingType`은 수정 body에 없어 생성 뒤 바꿀 수 없다.

Flutter 생성/수정 화면은 2026-07-10 이후 타입별 결과와 환불·노쇼·정산 영향을 설명하는 authoring guidance까지 갖췄다. 다만 실제 소스 대조 결과 **앱 카테고리 enum 세 값이 서버에 없고 기본값도 그중 하나라 생성 자체를 막을 수 있는 P0 계약 불일치**가 있다. 또한 서버는 안전한 썸네일 키를 지원하지만 앱 생성·수정 화면에는 썸네일 선택/업로드 입력이 없다.

## 2. 실사 근거

| 계층 | 확인 소스 | 확인 계약 |
|---|---|---|
| Controller | `RegularMeetingController#create`, `update`, `delete`, `createFromEvent` | path, method, 응답 |
| Param | `RegularMeetingAddParam`, `RegularMeetingModParam` | 정확한 필드와 Java 타입 |
| Enum | `Category`, `LocationType`, `RegularMeetingType`, `RefundPolicyType`, no-show enums | 허용 문자열 |
| Service / Entity | `RegularMeetingService#createMeeting/updateMeeting`, `RegularMeeting#setPrice` | 타입별 강제값, DRAFT, 100원 절삭 |
| File | `FileStorageService#validateAndNormalizeImageKeyForWrite` | 썸네일 소유권·상태·purpose |
| Flutter model | `regular_meeting_add_param.dart`, `regular_meeting_mod_param.dart` | Freezed body, `LocalDate` 직렬화 |
| Flutter screen | `regular_meeting_create_screen.dart`, `regular_meeting_edit_screen.dart` | 실제 입력·가이드·누락 입력 |

## 3. 서버 계약

### 3.1 Endpoint

| Method | Path | Body | 응답 | 권한/상태 |
|---|---|---|---|---|
| POST | `/api/v1/regular-meetings` | `RegularMeetingAddParam` | 201 `RegularMeetingVo` | 인증 사용자, `EVENT_HOST_RESTRICT` 제재 시 차단 |
| POST | `/api/v1/regular-meetings/from-event/{eventId}` | 없음 | 201 `RegularMeetingVo` | 원본 이벤트 호스트 |
| PATCH | `/api/v1/regular-meetings/{id}` | `RegularMeetingModParam` | 200 `RegularMeetingVo` | 호스트 + DRAFT |
| DELETE | `/api/v1/regular-meetings/{id}` | 없음 | 204 | 호스트 + DRAFT |

Controller에는 `@Valid`가 없고 Service가 핵심 값을 직접 검증한다. 따라서 문서/클라이언트는 Bean Validation annotation을 계약으로 가정하지 않는다.

### 3.2 Add/Mod 필드

`RegularMeetingAddParam`:

- 공통: `title:String`, `description:String?`, `category:Category`, `meetingType:RegularMeetingType`, `locationType:LocationType`
- 장소: `address`, `addressDetail`, `latitude:Double`, `longitude:Double`, `onlineUrl`
- FIXED 코스: `startDate:LocalDate`, `endDate:LocalDate`, `totalSessionCount:Integer`, `price:BigDecimal`, `prepaymentRequired:boolean`, `refundPolicy:RefundPolicyType`, `refundDeadlineHours:Integer`, `baseCapacity:int`, `approvalRequired:boolean`
- 노쇼: `noShowPolicy`, `noShowLimit`, `noShowCountMode`
- 미디어: `thumbnailUrl:String`

`RegularMeetingModParam`은 `meetingType`을 제외한 같은 필드를 nullable로 받는다. null은 기존값 유지이며 수정은 DRAFT에서만 허용된다.

### 3.3 타입별 저장 규칙

| 항목 | FIXED | VARIABLE |
|---|---|---|
| 등록/결제 단위 | 정기모임 코스 전체 | 각 세션 이벤트 |
| `totalSessionCount` | 1 이상 필수 | 서버가 null 강제 |
| `baseCapacity` | 1 이상 필수 | 서버가 0 강제 |
| 본체 `price` | 앱은 0 이상을 검증하고 서버는 100원 단위 아래 절삭. 서버 직접 요청의 음수 거절은 현재 누락 | 서버가 0 강제 |
| 본체 날짜 | 요청값 저장 | 서버가 null 강제 |
| 선결제/승인 | 요청값 적용 | 서버가 false 강제 |
| 본체 환불 | 요청값, null이면 `FULL` | `FULL` 강제, deadline null |

예: FIXED `price=12,345`는 `12,300`으로 저장된다. VARIABLE의 금액은 본체가 아니라 F17-05 세션 param에서 받는다.

### 3.4 썸네일 쓰기·읽기

- 쓰기 값은 만료되는 URL이 아니라 bare file key여야 한다.
- 서버는 호스트 소유, `COMPLETED`, `EVENT_THUMBNAIL` purpose인 파일만 저장한다.
- 절대 `http(s)` URL은 새 키로 저장하지 않는다. 생성에서는 null이 되고, 수정에서는 기존 썸네일을 유지한다.
- 존재하지 않음/타인 소유/미완료/다른 purpose는 각각 파일 오류로 거절한다.
- 상세·목록 응답 시 bare key를 표시용 presigned URL로 바꾼다. 미완료/유실 파일은 null로 내려 앱 폴백을 유도한다.
- `createFromEvent`는 원본 이벤트의 썸네일 키를 복사하지만 같은 호스트 소유 검증을 다시 통과해야 한다.

## 4. Flutter 실제 화면 계약

### 4.1 현재 입력

공통 입력:

- 운영 방식 `VARIABLE | FIXED`
- 카테고리
- 장소 유형 `OFFLINE | ONLINE`
- 제목, 설명

FIXED일 때만:

- 정원, 참가비
- 시작일·종료일, 총 회차
- 환불 정책, 환불 기준 시간
- 노쇼 정책, 집계 기준, 한도
- 호스트 승인 필요, 선결제 필수

화면은 타입별로 다음 결과를 설명한다.

- FIXED: 코스 전체 등록·결제, 잔여 회차 환불, 노쇼, 코스 정산
- VARIABLE: 세션별 신청·결제·환불, 정기모임은 세션 묶음

제출 전 `AppDialog.confirm`으로 아직 공개/결제가 발생하지 않는 DRAFT 생성임을 확인하고, 성공하면 `"정기모임 생성 완료"` 토스트 후 `/regular-meetings/{id}`로 이동한다.

### 4.2 날짜 직렬화

Flutter `DateTime?`은 add/mod model의 `toJson`에서 정확히 `yyyy-MM-dd`로 변환되어 서버 `LocalDate`와 맞는다. 과거 ISO timestamp 전송 위험은 현재 소스에서 해소됐다.

### 4.3 현재 없는 입력

서버 param에는 있지만 생성/수정 화면이 실제로 보내지 않는 값:

- `address`, `addressDetail`, `latitude`, `longitude`, `onlineUrl`
- `thumbnailUrl`

따라서 장소 유형만 선택해도 실제 주소/온라인 URL은 비어 있고, 정기모임 썸네일을 새로 업로드할 UI도 없다.

## 5. 확인된 P0/P1 Gap

### 5.1 P0 — 카테고리 enum 불일치

서버 `Category`:

`BOARD_GAME, HIKING, COOKING, BOOK_CLUB, SPORTS, MUSIC, ART, LANGUAGE, TECH, SOCIAL, TRAVEL, PHOTOGRAPHY, FOOD, FITNESS, OTHER`

앱 생성 폼:

`CLASS, STUDY, SPORTS, HOBBY, COOKING, OTHER`

- 앱 기본값은 `CLASS`인데 서버 enum에 없다.
- `CLASS`, `STUDY`, `HOBBY`는 서버 JSON enum 역직렬화 단계에서 거절될 수 있다.
- 현재 일치하는 값은 `SPORTS`, `COOKING`, `OTHER`뿐이다.
- Service 진입 전 실패할 수 있으므로 안내 문구 문제가 아니라 생성 경로 차단 결함이다.

**해소 조건**: 앱 옵션을 서버 `Category` 정본에 맞추고, 기본값과 모든 선택값에 대한 request JSON 계약 테스트를 둔다. 서버에 없는 앱 enum을 새로 만들지 않는다.

### 5.2 P1 — 썸네일 authoring 미배선

서버의 안전한 `EVENT_THUMBNAIL` 저장·표시 계약과 Dart param의 `thumbnailUrl`은 있으나 화면에서 값을 만들지 않는다. 목록·상세는 기존 썸네일 URL을 표시할 수 있지만 사용자가 생성/수정 중 설정할 수 없다.

### 5.3 P1 — 장소 상세 authoring 미배선

장소 유형 선택은 있으나 주소/좌표/온라인 URL 필드가 없어 실제 장소 정보가 비어 있는 초안이 만들어진다.

### 5.4 P1 — FIXED 본체 가격의 서버 음수 가드 누락

Flutter 생성 화면은 음수 가격을 폼 검증으로 막지만, `RegularMeetingService.validateAddParam/validateModParam`은 `price < 0`을 검사하지 않는다. 엔티티는 받은 값을 100원 단위로 절삭할 뿐이므로 직접 API 요청으로 음수 FIXED 가격이 저장될 수 있다. 결제·환불 산식에 들어가기 전에 서버가 0 이상을 강제해야 한다.

## 6. 상태·권한

- 생성 결과는 항상 `DRAFT`.
- 호스트만 DRAFT 상세·수정·삭제·세션 조회가 가능하다.
- 한 번도 발행되지 않은 DRAFT 또는 `publishedAt == null`인 CANCELED 모임을 비호스트가 직접 ID로 조회하면 `REGULAR_MEETING_NOT_FOUND`.
- 한 번 공개됐던 CLOSED/CANCELED는 기존 공개 이력이 있으므로 상세 조회를 유지한다.
- `meetingType`은 생성 뒤 변경하지 않는다.
- 일반 호스트용 이양 API는 없다. 다만 관리자 백엔드에는 internal token으로 호출하는 `POST /api/internal/regular-meetings/{id}/transfer-host` break-glass 경로가 있고, CANCELED가 아니면 본체 호스트와 결제·정산이 없는 미래 세션의 호스트를 이관한다.

## 7. 수용 기준

- **AC-01**: 서버 enum과 일치하는 category, 유효한 공통 필드로 생성하면 201 `DRAFT`.
- **AC-02**: FIXED는 `totalSessionCount > 0`, `baseCapacity > 0`; 위반 시 `INVALID_INPUT`.
- **AC-03**: VARIABLE은 본체 날짜·회차·가격·정원·선결제·승인을 서버가 null/0/false로 강제한다.
- **AC-04**: 0 이상 FIXED 가격은 100원 아래를 절삭한다. 음수 직접 요청 차단은 현재 미충족 Gap이다.
- **AC-05**: 앱의 날짜는 `yyyy-MM-dd` JSON으로 전송된다.
- **AC-06**: 타인·미완료·purpose 불일치 썸네일 키는 저장되지 않고 서버 오류로 거절된다.
- **AC-07**: 비호스트는 미발행 상세를 직접 ID로도 볼 수 없다.
- **AC-08 (차단 상태)**: `CLASS/STUDY/HOBBY`가 서버와 합의되기 전에는 해당 앱 선택값을 정상 생성 수용 기준으로 간주하지 않는다.

## 8. 후속 우선순위

1. 앱 카테고리 옵션을 서버 enum과 일치시킨다(P0).
2. 생성·수정에 `EVENT_THUMBNAIL` 업로드 → PUT → complete → bare key 제출 흐름을 연결한다.
3. 서버 create/update에서 FIXED `price >= 0`을 강제한다.
4. OFFLINE 주소/좌표, ONLINE URL 입력과 타입별 검증을 연결한다.
5. 서버 응답의 절삭된 FIXED 가격을 상세에서 명확히 표시한다.
