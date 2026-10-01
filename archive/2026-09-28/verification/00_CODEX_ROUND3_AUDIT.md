# Codex 3차 라운드 감사 보고서

검증일: 2026-05-09

검증 원칙: Claude sub-agent 보고는 신뢰하지 않고, 실제 파일 read / rg / flutter analyze / check_format.sh 실행 결과만 근거로 삼았다.

## 임무 1: B-Flutter 5건 실 코드 검증

### B1 CalendarEventVo eventType
- 적용: ⚠️ 원본 모델은 적용됨, 생성 파일 미재생성으로 현재 analyzer 에러 발생
- 근거:

```dart
// community_app/lib/data/models/calendar/calendar_event_vo.dart:15-17
String? eventStatus,
String? eventType,
@Default(false) bool isPast,
```

- 생성 파일 부작용:

```dart
// community_app/lib/data/models/calendar/calendar_event_vo.freezed.dart:31
int get eventType => throw _privateConstructorUsedError;

// community_app/lib/data/models/calendar/calendar_event_vo.g.dart:23
eventType: (json['eventType'] as num?)?.toInt() ?? 0,
```

- 검증 명령:
  - `flutter analyze lib/data/models/calendar/calendar_event_vo.dart lib/presentation/calendar/screens/availability_screen.dart lib/presentation/location/screens/directions_screen.dart`
- 결과:

```text
error • The redirected constructor '_CalendarEventVo Function(... int eventType ...)' has incompatible parameters with 'CalendarEventVo Function(... String? eventType ...)' • lib/data/models/calendar/calendar_event_vo.dart:18:8
```

- 판정: `dart run build_runner build --delete-conflicting-outputs`로 `calendar_event_vo.freezed.dart`와 `calendar_event_vo.g.dart` 재생성 필요.

### B2 AvailabilityScreen 요일 약어
- 적용: ✅
- 근거:

```dart
// community_app/lib/presentation/calendar/screens/availability_screen.dart:41-49
static const _dayValues = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
];
```

- 잔여 풀네임 grep:
  - `rg -n "MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY" community_app/lib/presentation/calendar/screens/availability_screen.dart`
  - 결과 0건.
- 부작용: 해당 파일 자체의 추가 analyzer 이슈는 확인되지 않음. 단, B1 생성 파일 에러 때문에 같은 targeted analyze 실행은 실패했다.

### B6 DirectionsScreen padding
- 적용: ✅
- 근거:

```dart
// community_app/lib/presentation/location/screens/directions_screen.dart:106-108
child: SingleChildScrollView(
  padding: const EdgeInsets.all(AppSpacing.screenPadding),
```

- 판정: `AppSpacing.screenPadding` 사용 확인.

### B7 date 모델 bool is* JsonKey
- 적용: ✅
- grep 결과: 원본 date 모델의 `bool is*` 필드 6개 모두 `@JsonKey(name: ...)` 보유.

```text
date_profile_photo_vo.dart:12  @JsonKey(name: 'primary')  bool isPrimary
date_profile_photo_vo.dart:13  @JsonKey(name: 'verified') bool isVerified
date_profile_param.dart:52     @JsonKey(name: 'primary')  bool isPrimary
match_action_vo.dart:10        @JsonKey(name: 'matched')  bool isMatched
chat_message_vo.dart:15        @JsonKey(name: 'read')     bool isRead
date_profile_vo.dart:23        @JsonKey(name: 'active')   bool isActive
```

- 부정 grep:
  - `rg -n "bool is[A-Z]" community_app/lib/data/models/date -g '*.dart' -g '!*.freezed.dart' -g '!*.g.dart' | rg -v "@JsonKey\(name:"`
  - 결과 0건.

### B8 dead code 삭제
- 적용: ⚠️ 원본 API 선언/호출처 기준으로는 제거됨. 생성 파일 stale 부작용 있음.
- 근거:
  - `community_app/lib/data/api/event_location_api.dart`에는 `getPrivacyDashboard` 선언 없음.
  - `community_app/lib/domain/providers/location/location_privacy_provider.dart` 파일 없음.
  - 원본 소스 기준 grep:
    - `rg -n "getPrivacyDashboard" community_app/lib -g '*.dart' -g '!*.g.dart' -g '!*.freezed.dart'`
    - 결과 0건.

- 생성 파일 잔여:

```text
community_app/lib/data/api/event_location_api.g.dart:107:  Future<LocationPrivacyVo> getPrivacyDashboard(int eventId) async {
```

- 생성 파일 직접 analyze 결과:

```text
error • The name 'LocationPrivacyVo' isn't a type, so it can't be used as a type argument • event_location_api.g.dart:107:10
warning • The method doesn't override an inherited method • event_location_api.g.dart:107:29
error • Undefined class 'LocationPrivacyVo' • event_location_api.g.dart:123:10
```

- 추가 잔여 dead code:
  - `location_privacy_vo.dart` 모델과 `location_privacy_screen.dart` 화면은 여전히 존재한다.
  - 이번 요청의 핵심 조건인 provider 부재와 호출처 0건은 만족하지만, dead code 정리로 보면 완전 삭제는 아니다.
- 판정: `event_location_api.g.dart` 재생성 필요. dead screen/model 유지 여부도 결정 필요.

## 임무 2: B-Backend 2건

### B3 SuggestionVo.eventId
- 적용: ✅
- 근거:

```java
// EventSearchRepository.java:243-247
public List<Tuple> suggestEventTitles(String keyword, int limit) {
    QEvent event = QEvent.event;
    return jpaQueryFactory
            .select(event.id, event.title)
```

```java
// SearchSuggestionService.java:49-58
String title = tuple.get(event.title);
Long eventId = tuple.get(event.id);
...
suggestions.add(SuggestionVo.builder()
        .type("event")
        .text(title)
        .eventId(eventId)
        .score(50.0)
        .build());
```

```java
// SuggestionVo.java:8-12
public class SuggestionVo {
    private String type;
    private String text;
    private Long eventId;
    private Double score;
}
```

- 판정: QueryDSL select에 `event.id` 포함, Service에서 `tuple.get(event.id)` 후 builder `.eventId(eventId)` 설정 확인.

### B9 SavedSearch.searchParams
- 적용: ✅
- 근거:

```java
// SavedSearchService.java:50-55
public SavedSearchVo updateSavedSearch(long userId, long id, SavedSearchParam param) {
    SavedSearch search = findAndValidate(userId, id);
    search.setName(param.getName());
    search.setSearchParams(param.getSearchParams());
    search.setNotifyOnNew(param.isNotifyOnNew());
    return searchMapper.updateSavedSearchToVo(savedSearchRepository.save(search));
}
```

- 판정: `updateSavedSearch`에서 `searchParams` 갱신 확인.

## 임무 3: F09-06 SOS 12개 파일 정정
- 잔여 "서버 미구현" 본문 사용: 0건으로 판단
- 정정 컨텍스트(허용): 9건
- 관련 외부/비대상 잔여 "서버 미구현": 2건

### 검증 결과
- `business_logic/units/09_private_date/`의 F09-06 관련 문서는 "의도적 미운영"으로 정정되어 있음.

```text
business_logic/units/09_private_date/00_overview.md:34
긴급 연락처(SCR-PD-008), SOS, 체크인은 **의도적 미운영** 상태이다.

business_logic/units/09_private_date/F09-06_meeting_proposal/backend.md:70
POST .../check-in — **의도적 미운영**

business_logic/units/09_private_date/F09-06_meeting_proposal/scenarios.md:66
## S7. SOS / 체크인 (의도적 미운영)
```

- `business_logic/verification/e2e_traceability/09_private_date_e2e.md:195`의 `"서버 미구현 갭"이 아니라` 표현은 정정 컨텍스트라 허용.
- 단, `business_logic/verification/e2e_traceability/00_CODEX_E2E_AUDIT.md`는 과거 감사 문서로 보이며 아직 다음 표현을 유지한다.

```text
line 59: 현 상태는 "미구현 positive E2E가 항상 실패하는 상태"에 가깝다.
line 120: F09-06은 의도적 가드라기보다 미구현 positive E2E가 실패하는 상태다.
```

- 이는 "서버 미구현" 단정은 아니지만, 현재 최종 결론인 "의도적 미운영"과 충돌하는 과거 판정이다. `00_E2E_MASTER_SUMMARY.md`는 같은 표현을 히스토리로 남긴 뒤 최종 정정을 병기하고 있어 허용 가능.
- 비대상 잔여:
  - `business_logic/verification/06_payment_report.md:165`
  - `business_logic/verification/08_plan_market_report.md:172`
  - 둘 다 F09-06이 아닌 다른 도메인 문맥이다.

## 임무 4: P19 deprecation
- 스크립트 마커: ✅
- 테스트 마커: ✅
- 다른 호출처: 0건

### 스크립트 마커
```bash
# community_app/scripts/e2e/run_p19_dating_checkin_mutation.sh:2-3
# DEPRECATED: F09-06 SOS/체크인/긴급연락처 기능은 의도적으로 삭제됨 (2026 product decision).
# 이 매트릭스는 deprecated. 실행 대상에서 skip 처리 권장. 향후 재도입 시 재활성화.
```

- 판정: deprecated 의도가 명확하다.

### 테스트 마커
```dart
// community_app/integration_test/seed_dating_checkin_mutation_test.dart:1-5
/// DEPRECATED: F09-06 SOS/check-in/emergency-contacts feature was intentionally removed.
/// This test will always FAIL. Marked deprecated for CI exclusion.
/// Re-enable only when feature is reintroduced.
@Tags(<String>['deprecated'])
library;
```

```dart
// seed_dating_checkin_mutation_test.dart:32-36
testWidgets('$roleLabel direct check-in mutation', (tester) async {
  markTestSkipped(
    'F09-06 deprecated — SOS/check-in/emergency-contacts feature removed.',
  );
  return;
```

- `flutter analyze integration_test/seed_dating_checkin_mutation_test.dart`: No issues found.
- 주의: 주석의 "This test will always FAIL"은 `markTestSkipped` 적용 후에는 부정확하다. "would fail if re-enabled" 또는 "skipped because deprecated"로 바꾸는 것이 맞다.

### 다른 호출처
- executable `.sh` 기준:
  - `rg -n "run_p19_dating_checkin_mutation|seed_dating_checkin_mutation" community_app/scripts/e2e -g '*.sh'`
  - 결과는 자기 자신 1건뿐. 다른 P 매트릭스 스크립트에서 P19 호출 없음.
- 문서 잔여:
  - `community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md:31`은 P19를 `yes`로 표시.
  - `community_app/scripts/e2e/README.md:64`는 P19를 stateful runner 목록에 유지.
  - 호출처는 아니지만 deprecated 상태와 문서 표현이 맞지 않는다.

## 임무 5: 메타 개선
- SPEC_TEMPLATE 가이드: ✅
- check_format.sh 실행 가능: ✅
- 형식 위반 검출 정상 작동: ✅

### SPEC_TEMPLATE 가이드
- 출처 표기 가이드 확인:

```markdown
<!-- business_logic/SPEC_TEMPLATE.md:155-157 -->
### 출처 표기 (E2E-derived 시나리오 시)
- 형식: `> 출처: integration_test/<file>.dart` 한 가지로 통일
- 다른 표기 (`유래:`, `E2E source:`, `E2E 매핑:`) 사용 금지
```

- traces 마커 가이드 확인:

```markdown
<!-- business_logic/SPEC_TEMPLATE.md:66-75 -->
### 코드 추적 마커 (선택, 권장)
<!-- traces: community_api/src/main/java/com/endside/community/event/controller/EventController.java:45 -->
`traces:` 경로 검사 스크립트를 별도 작성·수동 실행하면 산출물-코드 동기화 가능.
```

### check_format.sh 실행 가능
- 파일 권한: `-rwxr-xr-x`
- 실행 명령: `bash check_format.sh`
- exit code: 1
- 판정: 실행 가능. exit 1은 현재 산출물 위반 발견에 따른 정상 동작이다.

### 형식 위반 검출 정상 작동
- 실행 결과 39건 위반 탐지.
- 대표 검출:

```text
[2] units/02_home_feed/F02-01_home-feed-main/scenarios.md (line 97) — '## E2E-derived' 섹션에 '출처:' 누락
[2] units/04_club/F04-01_club-discovery/scenarios.md (line 61) — ... '**페르소나**' 누락
[2] units/08_plan_market/F08-10_market-item-detail/scenarios.md (line 74) — ... '출처:' 누락
```

- 판정: 실제 corpus를 샘플로 사용했을 때 위반을 탐지하므로 검사 동작은 정상. 다만 현재 repo는 format check를 통과하지 않는다.

## 종합 판정
- 신뢰도: 보통
- Claude가 놓친 추가 발견:
  1. B1은 원본 모델만 수정되고 `calendar_event_vo.freezed.dart` / `.g.dart`가 미재생성되어 targeted `flutter analyze`가 실제 실패한다.
  2. B8은 원본 호출처 제거는 됐지만 `event_location_api.g.dart`에 stale `getPrivacyDashboard`가 남아 생성 파일 직접 analyze 시 5개 이슈가 난다.
  3. `00_CODEX_E2E_AUDIT.md`에는 F09-06을 "미구현 positive E2E"로 보는 과거 판정이 남아 있어 최종 "의도적 미운영" 결론과 혼재한다.
  4. P19 테스트 주석의 "This test will always FAIL"은 `markTestSkipped` 이후 부정확하고, `SCENARIO_MATRIX_INDEX.md` / `README.md`는 P19를 deprecated로 표시하지 않는다.
- 부작용:
  1. B1 generated mismatch로 `calendar_event_vo.dart` analyzer 에러.
  2. B8 generated stale 메서드로 `event_location_api.g.dart` 직접 analyzer 에러.
- 권장 사항:
  1. `community_app`에서 `dart run build_runner build --delete-conflicting-outputs` 실행 후 B1/B8 생성 파일 diff를 재검증한다.
  2. P19 문서 인덱스와 README를 deprecated 상태에 맞게 갱신한다.
  3. `00_CODEX_E2E_AUDIT.md`를 archival로 둘지, 현재 결론을 상단에 명시할지 결정한다.
  4. `location_privacy_vo.dart` / `location_privacy_screen.dart`가 실제 라우트에서 죽은 코드인지 별도 확인 후 삭제 또는 명시적 보존 처리한다.

