# Codex 6차 라운드 감사 보고서

## 임무 1: 4개 테스트 analyze
- F11-03: ✅ analyze pass, modes 5 (보고/runner 5와 일치: `edit_success`, `edit_limit_exceeded`, `delete_confirm`, `delete_cancel`, `other_user`)
- F13-02: ✅ analyze pass, modes 5 (보고/runner 5와 일치: `nickname_change`, `bio_change`, `image_change`, `dirty_guard`, `validation_error`)
- F14: ✅ analyze pass, modes 5 (보고/runner 5와 일치: `opt_in`, `opt_out`, `update`, `extend`, `privacy_dashboard`)
- F10: ✅ analyze pass, modes 5 (보고/runner 5와 일치: `create_single`, `update`, `delete_single`, `create_recurring`, `delete_recurring_scope`)
- mock 사용: 0건. `package:mockito`, `package:mocktail`, `HttpOverrides`, mock adapter류 import 없음. 네 파일 모두 `localhost:38082`, `ENV=dev` 실서버 전제 주석과 실제 앱 bootstrap 사용.

실행 근거:
```bash
flutter analyze integration_test/seed_review_edit_delete_test.dart integration_test/seed_profile_edit_mutation_test.dart integration_test/seed_location_share_mutation_test.dart integration_test/seed_calendar_availability_mutation_test.dart
```
exit code 0, `No issues found!`.

## 임무 2: 매트릭스 스크립트
- P62-P65 chmod +x: ✅ `run_p62_profile_edit_mutation_matrix.sh`, `run_p63_review_edit_delete_matrix.sh`, `run_p64_location_share_mutation_matrix.sh`, `run_p65_calendar_availability_mutation_matrix.sh` 모두 executable.
- bash -n: ✅ 네 스크립트 모두 syntax 검사 exit code 0.
- SCENARIO_MATRIX_INDEX 4행 추가: ✅/주의. P62-P65 대상 행 4개는 존재하고 P 번호, 스크립트명, 테스트 파일 매핑이 정확하다. 다만 현재 `community_app` git diff 기준으로는 P61 행도 함께 추가되어 raw added row는 총 5행이다.

대상 매핑:
- P62 → `run_p62_profile_edit_mutation_matrix.sh` → `seed_profile_edit_mutation_test.dart`
- P63 → `run_p63_review_edit_delete_matrix.sh` → `seed_review_edit_delete_test.dart`
- P64 → `run_p64_location_share_mutation_matrix.sh` → `seed_location_share_mutation_test.dart`
- P65 → `run_p65_calendar_availability_mutation_matrix.sh` → `seed_calendar_availability_mutation_test.dart`

## 임무 3: 서버 API 시그니처 일치
- F11-03 PATCH/DELETE: ✅ `ReviewController`는 `@RequestMapping("/api/v1")`, `@PatchMapping("/reviews/{id}")`, `@DeleteMapping("/reviews/{reviewId}")`. Flutter `ReviewApi`의 `PATCH /api/v1/reviews/{id}`, `DELETE /api/v1/reviews/{reviewId}`와 일치. body는 서버/클라 모두 `rating`, `content`.
- F13-02 PATCH: ✅ `UserController`는 `@RequestMapping("/api/v1/users")`, `@PatchMapping("/me")`, body `UserModParam(nickname, bio, profileImageUrl, locale)`. Flutter `UserApi.updateMe`와 `UserModParam` 필드 일치.
- F14 4종: ❌ path 자체는 일치하지만 host gate 가정이 부분적으로 틀림. `LocationController`는 `POST /api/v1/events/{eventId}/location/opt-in`, `/opt-out`, `/update`, `/extend?extendMinutes=30`을 제공하고 Flutter `EventLocationApi`와 일치한다. 그러나 `LocationService.updateLocation`은 host도 `locationShareEnabled`, 시간 게이트(`startTime-2h` ~ `endTime+2h`), opt-in 검사를 통과해야 한다. host가 opt-in/시간 게이트를 우회한다는 주장은 `getEventLocations` 조회에는 맞지만 `/update`에는 맞지 않다. `extendShare`는 host opt-in 검사는 우회하지만 기존 `LocationShare` 행이 없으면 `LOCATION_SHARE_NOT_FOUND`.
- F10 mutation: ✅ 서버 시그니처와 클라 API는 일치. `AvailabilityController`는 `POST /api/v1/availability`, `PATCH /api/v1/availability/{id}`, `DELETE /api/v1/availability/{id}?force=false`, `POST /api/v1/availability/recurring`, `DELETE /api/v1/availability/recurring/{ruleId}`. 반복 삭제에 `scope` 파라미터는 없고, `AvailabilityService.deleteRecurrenceRule`은 `deleteAllByRecurrenceRuleId(ruleId)` 후 rule 삭제라 항상 전체 삭제 의미가 맞다. 단, E2E `delete_recurring_scope` 모드는 ruleId를 확보하지 못해 실제 DELETE 호출은 하지 않고 scope UI 부재만 검증한다.

추가 재확인:
- 프로필 nickname 상한: 서버는 `@Size(min = 2, max = 30)`. Flutter `ProfileEditScreen`은 `AppTextInput(maxLength: 20)`과 `_save()`의 `<2` 검사만 있다. "30자 미검증"이라기보다 서버 30자 / 클라 20자 상한 불일치가 정확한 표현이다.
- F14 privacy dashboard: 서버에는 `GET /api/v1/events/{eventId}/location/privacy`가 있지만 현 `LocationPrivacyScreen`은 이 API를 호출하지 않고 `eventDetailNotifierProvider` 및 opt-in/out/updateEvent 흐름만 사용한다. P64 `privacy_dashboard` mode는 API 검증이 아니라 라우팅/화면 도달 검증이다.

## 임무 4: 산출물 일관성
- 8건 갱신 확인: ❌ 8개 파일에 E2E-derived 내용은 있으나 요구 형식과 `check_format.sh` 기준을 만족하지 못한다.
  - F11-03은 `## E2E-derived 시나리오:` + `> 출처: integration_test/seed_review_edit_delete_test.dart` 형식 충족.
  - F13-02는 `## E2E-derived`와 blockquote 출처가 있으나 제목이 요구 문자열과 다르다. `check_format.sh`에는 걸리지 않았다.
  - F14-01~04는 `## E2E-derived (...)` 형식이고 출처가 bold 텍스트라 `출처:` 검사에서 누락으로 처리된다.
  - F10-03/04는 `## E2E-derived 시나리오 (P65...)` 섹션은 있으나 해당 섹션 레벨에 `페르소나/시작 상태/종료 상태`가 누락되어 실패한다.
- check_format.sh: ❌ 26 violations, exit code 1.

실행 근거:
```bash
cd /Users/kyle/source/09.community/business_logic
bash verification/check_format.sh
```

## 종합
- 신뢰도: 보통. 컴파일/analyze, 매트릭스 스크립트, 주요 API path는 대체로 통과하지만, F14 host gate 가정 오류와 F10 반복 삭제 미호출, scenarios.md 형식 실패가 남아 있다.
- 추가 발견: P64 `update` mode는 성공/실패 모두 silent라 화면 유지 검증만 한다. 실서버 mutation 성공 검증으로 보기 어렵다. P65 `delete_recurring_scope`는 서버 정책 설명은 맞지만 삭제 mutation E2E가 아니다.
- 즉시 수정 권장:
  1. F14 테스트/문서에서 "host는 update 시간/opt-in gate 우회" 표현 제거 또는 일반 참석자/호스트 분기를 실제 서버 로직에 맞게 분리.
  2. F10 `delete_recurring_scope`를 실제 ruleId 추적 후 `DELETE /api/v1/availability/recurring/{ruleId}`를 호출하도록 보강하거나 mode명을 `recurring_scope_ui_absence`로 변경.
  3. F14/F10/F13 scenarios.md E2E-derived 섹션을 `check_format.sh`가 요구하는 필드와 `출처:` 형식으로 정리.
  4. 프로필 닉네임 상한을 서버 30자와 클라 20자 중 하나로 정렬.

Codex 6차 감사: 4 테스트 통과 4/4 / 매트릭스 P62-P65 통과(인덱스 raw diff P61 포함 주의) / API 시그니처 대체로 일치하나 F14 host gate 가정 오류·F10 반복 삭제 미호출 / 산출물 check_format 26건 실패 / 신뢰도 보통
