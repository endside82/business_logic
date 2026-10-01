# Codex 외부 감사 보고서

## 임무 1: Fail 3건 판정 정확성

### Fail-1 ApplicationStatus CANCELED
- Claude 판정: ✅ 정확
- 근거:
  - 산출물 `business_logic/units/03_event/F03-12_my-events/backend.md:55`는 `ApplicationStatus`를 `PENDING, APPROVED, REJECTED, CANCELLED`로 적고 있다.
  - 실제 서버 enum `community_api/src/main/java/com/endside/community/event/constants/ApplicationStatus.java:3-7`:

```java
public enum ApplicationStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELED;
```

- 결론: 서버 enum은 `CANCELED`(L 한 개)이고, F03-12 backend.md의 `CANCELLED`는 오기다. 참고로 `EventStatus.java`의 일부 주석에는 `CANCELLED`가 남아 있지만 enum 상수는 `CANCELED`이므로 판단 기준은 enum 코드가 맞다.

### Fail-2 SOS endpoint 부재
- Claude 판정: ✅ 정확
- 근거:
  - 실제 `community_api/src/main/java/com/endside/community/privatedate/controller/`에는 6개 컨트롤러만 존재한다: `DateChatController`, `DateMatchController`, `DateVerificationController`, `DateProfileController`, `DateBlockController`, `DateMeetingController`.
  - `DateMeetingController.java:20-52`의 전체 매핑은 `POST /api/v1/date/meetings`, `PATCH /api/v1/date/meetings/{meetingId}`, `GET /api/v1/date/meetings/match/{matchId}`뿐이다.
  - `rg -i "sos|check[-_ ]?in|emergency|SafetyController|EmergencyContact"`를 `community_api/src`에 대해 실행했을 때 데이트용 컨트롤러/서비스 구현은 없고, 이벤트 체크인(`capacity`)이나 문서(`docs`)만 검색된다.
  - 산출물 `F09-06_meeting_proposal/backend.md:68-70`도 `check-in`, `sos`, `emergency-contacts`가 본 컨트롤러에 없다고 적고 있다.
- 결론: `/api/v1/date/meetings/{meetingId}/sos`, `/check-in`, `/api/v1/date/emergency-contacts`는 실제 코드에 없다. `docs/IMPLEMENTATION_CROSSWALK.md`와 workboard에는 `EmergencyContactController` 언급이 있으나 현재 소스 트리 기준으로는 존재하지 않는 문서 드리프트다.

### Fail-3 Unit 12 ❌ 항목
- Claude 판정: ⚠️ 부분 정확 (파일 단위 지목은 오판)
- 근거:
  - Claude 보고서는 F12-05 `backend.md`를 ❌로 분류했지만, 실제 `business_logic/units/12_notification/F12-05_device-token-management/backend.md:41-43`은 `DeviceTokenParam`을 `token`, `deviceType` 2필드로 정확히 적고 있다.
  - 실제 서버 `community_api/src/main/java/com/endside/community/notification/param/DeviceTokenParam.java:9-13`:

```java
public class DeviceTokenParam {
    @NotBlank
    private String token;
    @NotBlank
    private String deviceType;
}
```

  - 그러나 `business_logic/units/12_notification/00_overview.md:95`는 `DeviceTokenParam(token, platform, deviceName)`이라고 적고 있어 `platform`, `deviceName`이라는 서버에 없는 필드를 만들어낸다.
- 결론: Unit 12 산출물 세트에 CRITICAL 사실 오류가 있다는 판단은 맞다. 다만 ❌ 대상은 F12-05 backend.md가 아니라 `00_overview.md`다. 따라서 Claude의 Fail은 "부분 정확, 지목 파일 기준 과민/오분류"로 본다.

## 임무 2: 라벨 수정 정확성

### 지정 grep 잔여 검사

아래 7개 명령은 모두 출력 없음(exit 1)이다.

```text
grep -rn "Unit 09" /Users/kyle/source/09.community/business_logic/units/04_club/
grep -rn "Unit 02 (account)" /Users/kyle/source/09.community/business_logic/units/04_club/
grep -rn "Unit 02 클럽" /Users/kyle/source/09.community/business_logic/units/03_event/
grep -rn "Unit 04 검색" /Users/kyle/source/09.community/business_logic/units/03_event/
grep -rn "Unit 02 인증" /Users/kyle/source/09.community/business_logic/units/08_plan_market/
grep -rn "Unit 1 위임" /Users/kyle/source/09.community/business_logic/units/
grep -rn "WAITLISTED" /Users/kyle/source/09.community/business_logic/units/03_event/00_overview.md
```

### Claude가 놓친 추가 라벨 오류

- 2건 발견.
- `business_logic/units/04_club/F04-05_waitlist-invitation/frontend.md:40`
  - 현재: `사용자 검색 (Unit 02 사용자 검색 API 활용)`
  - 문제: Unit 02는 홈피드다. 실제 사용자 검색 API는 `community_api/src/main/java/com/endside/community/account/controller/UserController.java:33-38`의 `GET /api/v1/users/search`이고, Flutter도 `community_app/lib/data/api/user_search_api.dart` 및 `domain/providers/profile/user_search_provider.dart`를 사용한다.
  - 권장: `Unit 01 account/UserController` 또는 프로필 사용자 검색 흐름으로 정정.
- `business_logic/units/04_club/F04-05_waitlist-invitation/frontend.md:73`
  - 현재: `사용자 검색 흐름: 본 단위 외 (Unit 02 또는 자체 search)`
  - 문제: 같은 이유로 Unit 02 라벨이 부정확하다. 검색 화면(Unit 05)도 글로벌 콘텐츠 검색이지 `/api/v1/users/search`의 소유자로 보기 어렵다.

추가로 `rg -n "Unit [1-9](\D|$)" business_logic/units`는 출력 없음이라 `Unit 1` 같은 비제로패딩 표기는 남아 있지 않다.

## 임무 3: 클라이언트 버그 보고 정확성

- 검증한 항목: Unit 10 `CalendarEventVo.eventType` 타입 불일치
- 결과: Claude 보고가 정확
- 근거:
  - 서버 `community_api/src/main/java/com/endside/community/calendar/vo/CalendarEventVo.java:30-32`:

```java
private EventStatus eventStatus;
private EventType eventType;
```

  - `EventType`은 `INDEPENDENT`, `CLUB_MEETING`, `PRIVATE` enum이고 `@JsonValue`가 없다. 일반 Jackson enum 직렬화는 문자열 enum name이다.
  - 서버 `CalendarIntegrationService.java:42-46`은 hosted 이벤트에서 `e.getEventType()`을 실제로 읽어 `itemType`을 세팅하므로 hosted 이벤트 응답에는 `eventType`이 null이 아닐 수 있다.
  - Flutter `community_app/lib/data/models/calendar/calendar_event_vo.dart:8-17`:

```dart
const factory CalendarEventVo({
  ...
  @Default(0) int eventType,
  @Default(false) bool isPast,
}) = _CalendarEventVo;
```

  - 생성 코드 `calendar_event_vo.g.dart:21-23`:

```dart
eventType: (json['eventType'] as num?)?.toInt() ?? 0,
```

- 결론: 서버가 `"PRIVATE"` 같은 문자열을 내려주면 Flutter는 `num` 캐스팅을 시도해 역직렬화 예외가 날 수 있다. 화면에서 `eventType`을 직접 사용하지 않아도 `CalendarEventVo.fromJson` 단계에서 실패 가능성이 있으므로 실제 버그 보고가 맞다.

## 종합 판정

- Claude 검증 결과의 신뢰도: 보통
- 추가 발견:
  - Fail 3건 중 2건은 정확.
  - Unit 12 Fail은 실제 오류는 있으나 지목 파일이 틀린 부분 오분류.
  - 잔여 라벨 오류 2건 발견: F04-05 frontend.md의 `Unit 02 사용자 검색` 표기.
  - F03-12 backend.md의 `ApplicationStatus.CANCELLED`는 아직 남아 있어, 마스터 요약의 자동 수정 범위와 실제 파일 상태가 일치하지 않는다.
- 권장 사항:
  1. `business_logic/units/03_event/F03-12_my-events/backend.md:55`의 `CANCELLED`를 `CANCELED`로 수정.
  2. `business_logic/units/12_notification/00_overview.md:95`의 `DeviceTokenParam(token, platform, deviceName)`을 `DeviceTokenParam(token, deviceType)`으로 수정.
  3. `business_logic/units/04_club/F04-05_waitlist-invitation/frontend.md:40,73`의 `Unit 02 사용자 검색` 라벨을 account/profile 사용자 검색 소유 단위로 수정.
  4. `docs/IMPLEMENTATION_CROSSWALK.md`/workboard의 `EmergencyContactController` 언급이 현 소스와 맞는지 정리.
  5. Flutter `CalendarEventVo.eventType`을 `String?` 또는 서버 enum name에 맞는 enum converter로 정정.
