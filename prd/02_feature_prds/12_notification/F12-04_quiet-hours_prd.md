# F12-04. 방해금지 시간 설정 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-29 현재 소스 갱신: `PushService#isQuietHours`가 `daysOfWeek`를 실제 발송 차단에 적용한다. 같은 날 구간은 현재 요일, 자정을 넘는 구간의 새벽 부분은 방해금지가 시작된 전날 요일을 기준으로 판단하며, 시작·종료가 같으면 선택한 요일 전체를 방해금지로 처리한다. `PushServiceTest`의 요일 불일치 발송 및 금요일→토요일 자정 넘김 차단 테스트로 이 분기를 고정한다.

## 1. 결론

사용자가 지정한 시간대 + 요일에는 푸시 알림(FCM 발송)을 일괄 차단하는 상위 차단 규칙을 관리한다. 카테고리별 설정(F12-03)과 독립적으로 작동하며, 방해금지 시간대에 발생한 알림은 인박스(`notification` 테이블)에는 정상 적재되어 사용자가 나중에 인지할 수 있다 — push 채널만 skip된다. 시간대는 자정 넘김(예: 22:00~07:00)을 지원하며, 요일은 1=월요일~7=일요일의 정수 리스트로 저장한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 알림 설정 화면(`/notifications/settings`) 하단 "방해금지 시간" 카드 → `context.push('/notifications/settings/quiet-hours')`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `NotificationController`, `QuietHoursVo`. 앱: `quiet_hours_screen.dart`.

<!-- source-references:start -->
서버 창구: `NotificationController#getQuietHours`, `NotificationController#updateQuietHours`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **화면 진입 시**:
   - `_loadQuietHours()` ▶ `ref.read(quietHoursNotifierProvider.future)` ▶ `NotificationRepository.getQuietHours()` ▶ `GET /api/v1/notifications/settings/quiet-hours`
   - 응답을 받으면 setState로 `_enabled / _startTime / _endTime / _selectedDays` 채우고 `_isInitialized=true`

2. **저장 시**:
   - `QuietHoursParam(enabled, startTime: "HH:MM", endTime: "HH:MM", daysOfWeek: [...])` 빌드 (`_formatTime`으로 TimeOfDay → 문자열)
   - `quietHoursNotifierProvider.notifier.updateQuietHours(param)` 호출
     - Repository ▶ `PUT /api/v1/notifications/settings/quiet-hours`
     - 성공: 응답 VO로 state = AsyncData(updated), return VO
     - 실패: return null
   - 결과 null/non-null로 토스트 분기 + pop

## 4. 제품 규칙

- 방해금지는 정한 시간과 요일에 푸시만 보내지 않는 규칙이다. 알림 종류별 설정과 따로 작동하고, 알림은 알림함에 정상으로 쌓이며 차단된 푸시를 나중에 다시 보내지는 않는다.
- 시각은 한국 시간 기준이다. 시작과 종료가 같으면 선택한 요일 하루 전체가 방해금지다. 같은 날 구간(예 09:00~22:00)은 시작 이상 종료 미만이다. 자정을 넘는 구간(예 금요일 22:00~토요일 08:00)은 시작 요일 기준으로 다음 날 새벽 종료 시각 전까지 이어진다.
- 요일은 월 1부터 일 7까지이며 선택이 없으면 매일로 저장한다.
- 계정 권리와 관련된 절차 통지와 안전 체크인 알림은 방해금지 중에도 전달된다.
- 화면: 스위치를 끄면 시간과 요일 입력이 막힌다. 켜져 있으면 「HH:mm ~ HH:mm · N일 적용」 요약이 보인다. 요일을 하나도 고르지 않으면 오류색 안내가 나온다. 저장하면 「저장되었습니다」 토스트와 함께 이전 화면으로 돌아가고, 실패하면 오류 토스트와 함께 화면에 남는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 야간 방해금지 22:00~07:00, 평일만 적용 (Happy Path) | 처음 방해금지 화면 진입(서버 미저장) | 알림 설정 화면 복귀. 월~금에 시작하는 22:00~다음 날 07:00 구간의 푸시는 차단되고 인박스는 정상 적재 |
| S2 | 방해금지 OFF로 일시 해제 | 야간 방해금지 활성화 상태 | 모든 시간대 푸시 정상 발송 |
| S3 | 자정 넘김 시간대 정상 동작 확인 (방해금지 시간대 수신) | 22:00~07:00 방해금지 활성화 사용자, 새벽 02:00에 다른 사용자가 채팅 발송 | 야간 푸시 차단, 인박스 데이터는 보존 |
| S4 | 저장 실패 (네트워크 끊김) | 지하철 사용자 | 서버 미반영, 클라 입력 보존 |
| S5 | 권한 카테고리(F12-03) OFF + 방해금지 모두 적용 | F12-03에서 PROMOTION pushEnabled=false, F12-04에서 22:00~07:00 ON | PROMOTION/EVENT_REMINDER 둘 다 인박스에 있고 푸시는 미발송. 두 차단은 독립적으로 작동 |
| S6 | ON 상태에서 요일을 모두 해제하고 저장 시도 | 호기심 사용자 | Flutter `_save()`가 안내 토스트 후 요청을 보내지 않는다. API를 직접 empty days로 호출해도 서버 entity setter가 1~7(전 요일)로 정규화한다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Risk | `QuietHoursParam` / `setDaysOfWeekList` | 서버는 요일 정수 범위를 검증하지 않고 null/empty를 전 요일로 바꾼다. 앱은 ON+0요일 저장을 막지만 직접 API의 0·8 같은 값은 저장 가능하다. | service에서 1~7·중복 여부를 검증할지 결정 |
| Gap | `quiet_hours_screen.dart` AppBar | 현재 도움말 버튼이 본 기능이 아닌 `guideId: 'F15-01'`을 사용한다. | F12-04 가이드로 교정하거나 의도된 공용 가이드인지 확인 |

## 9. 수용 기준

- **AC-01. 야간 방해금지 22:00~07:00, 평일만 적용 (Happy Path)**: Given 처음 방해금지 화면 진입(서버 미저장) When 사용자가 월~금과 22:00~07:00을 저장하면 Then 월~금에 시작하는 야간 구간의 푸시는 다음 날 07:00 전까지 차단되고 인박스는 정상 적재
- **AC-02. 방해금지 OFF로 일시 해제**: Given 야간 방해금지 활성화 상태 When 사용자가 해당 흐름을 실행하면 Then 모든 시간대 푸시 정상 발송
- **AC-03. 자정 넘김 시간대 정상 동작 확인 (방해금지 시간대 수신)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 야간 푸시 차단, 인박스 데이터는 보존
- **AC-04. 저장 실패 (네트워크 끊김)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 미반영, 클라 입력 보존
- **AC-05. 권한 카테고리(F12-03) OFF + 방해금지 모두 적용**: Given F12-03에서 PROMOTION pushEnabled=false, F12-04에서 22:00~07:00 ON When 사용자가 해당 흐름을 실행하면 Then PROMOTION/EVENT_REMINDER 둘 다 인박스에 있고 푸시는 미발송. 두 차단은 독립적으로 작동
- **AC-06. ON 상태 0요일 저장 차단/정규화**: Given 방해금지가 ON이고 선택 요일이 0개일 때 When 앱에서 저장하면 Then 토스트 후 API를 호출하지 않는다. 직접 API로 empty를 보내면 서버는 전 요일(1~7)로 저장한다
