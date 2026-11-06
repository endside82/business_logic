# F12-03. 카테고리별 알림 설정 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 알림 type 단위로 푸시 수신 여부(`pushEnabled`)와 이메일 수신 여부(`emailEnabled`)를 토글할 수 있게 하는 두 개의 엔드포인트다. 서버는 `notification_setting` 테이블에 (userId, notificationType) 단위 레코드로 저장하며, 설정이 없는 type은 모두 ON(true)으로 간주하는 "기본 ON, 명시적 OFF" 정책을 따른다. 클라이언트는 11개 묶음(이벤트, 모임 운영, 클럽, 클럽 채팅, 결제·환불, 정산·지갑, 서비스 제공자 활동, 데이팅, 문의·안전·신고, 광고성 정보 수신, 추천 알림)으로 type을 묶어 한 번의 토글로 다수의 type을 일괄 PATCH 한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 알림 목록(`/notifications`) 우측 상단 설정 아이콘 → `context.push('/notifications/settings')`
- 프로필 > 설정 > 알림 설정 (별도 진입점, UI/UX 스펙 SCR-NT-002 명시. 현재 구현 검토에서 라우트는 `/notifications/settings` 단일 사용)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `NotificationController`. 앱: `notification_settings_screen.dart`.

<!-- source-references:start -->
서버 창구: `NotificationController#getSettings`, `NotificationController#updateSettings`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **화면 진입 시**:
   - `notificationSettingsNotifierProvider.build()` ▶ `NotificationRepository.getSettings()` ▶ `GET /api/v1/notifications/settings`
   - 응답: `List<NotificationSettingVo>` (61개 type, 미저장은 모두 true)

2. **카테고리 토글 시**:
   - `_CategoryToggle`의 `onChanged(value)` → 카테고리 매핑 type 리스트 순회 → 각 type에 대해 `_updateSetting(type, value)`
   - `_updateSetting`:
     - `NotificationSettingParam(notificationType: type, pushEnabled: value)` 생성
     - Provider의 `updateSetting(param)` 호출
       - Optimistic: state의 해당 type 항목 즉시 갱신 + state 알림
       - `NotificationRepository.updateSetting(param)` ▶ `PATCH /api/v1/notifications/settings`
       - 성공: 응답 VO로 state의 해당 항목 확정 갱신
       - 실패: `ref.invalidateSelf()` (전체 다시 fetch) + return false → 화면이 토스트 노출
   - 카테고리 내 N개 type이면 N개 PATCH가 동시 발생

3. **카테고리 ON 판정**:
   - 클라이언트 결정: 카테고리 내 매핑된 type들의 `pushEnabled`가 **모두 true**일 때만 카테고리 토글 ON
   - 일부만 false면 카테고리 토글은 OFF로 표기 (mixed 상태 노출 안 함)
   - `categorySettings.every((s) => s.pushEnabled) && categorySettings.isNotEmpty`

## 4. 제품 규칙

- 알림 종류별로 푸시와 이메일 수신을 끌 수 있다. 저장된 설정이 없으면 모두 켜진 것으로 본다. 푸시를 꺼도 알림함에는 그대로 쌓인다.
- 앱은 종류를 사용자가 이해하는 묶음 스위치로 모아 보여 주고, 스위치 하나가 묶음 안 모든 종류를 한꺼번에 바꾼다. 묶음 안 종류가 모두 켜져 있을 때만 스위치가 켜진 것으로 보이고 일부만 켜진 상태는 없다.
- 변경이 일부라도 실패하면 「설정 변경에 실패했습니다」 토스트와 함께 서버 값으로 다시 맞춘다.
- 광고성 정보 수신은 마케팅 수신 동의가 있어야 받는다. 동의는 받을지의 기준이고 이 스위치는 동의한 사람이 받을 채널이다.
- 사용자가 조치하지 않으면 권리를 잃는 절차 통지(분쟁 보완·재분쟁 자료 요청 등)는 항상 전달되어 설정으로 끌 수 없다.
- 설정 화면 맨 아래에 「방해금지 시간」 화면으로 가는 항목이 있다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 마케팅 알림만 끄기 (Happy Path) | 모든 묶음 ON (서버 미저장 상태이므로 기본 true) | 6개 type의 push가 false. 이후 PROMOTION 등의 알림 발생 시 인박스 INSERT는 정상이나(inAppEnabled는 true), FCM 발송은 skip |
| S2 | 데이팅 알림 ON으로 다시 켜기 | 데이팅 알림 OFF (`CHAT_MESSAGE` pushEnabled=false 저장됨) | 채팅 메시지 알림이 다시 푸시 발송됨 |
| S3 | 한 카테고리 내 부분 토글 시 카테고리 표기 | 13개 결제 type 중 12개 ON, `PROMOTION`이 OFF로 가정 (다른 경로/관리자/이전 클라 버전에서 변경된 케이스 — 마케팅과 카테고리 분리되어 있어 결제와는 무관, 결제 카테고리 내부에서는 모두 같은 카테고리) | 13개 모두 ON 동기화 |
| S4 | 카테고리 내 일부 PATCH 실패 (네트워크 끊김) | 이벤트 카테고리 ON, 10개 type 모두 true | 부분 부정합 → 사용자가 재시도. 최종 일관성 회복 |
| S5 | 알림 설정에서 방해금지 진입 | 야간 푸시 차단을 원하는 사용자 | F12-04로 흐름 위임 |
| S6 | 잘못된 notificationType 전달 (방어 케이스) | alice 로그인 후 `/notifications/settings` 진입. `notificationSettingsNotifierProvider.build()` → `GET /api/v1/notifications/settings` → 기존 row 들 + 서버 default(true) 가 머지된 list 가 state 에 채워짐. 화면에 "데이팅 알림" 카테고리 row + Switch(value=true) 노출 | 서버 상태 변경 없음 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:74 | - **디바운스 500ms**: SCR-NT-002 스펙은 디바운스 명시. 현 구현은 즉시 PATCH (Switch onChanged → 바로 호출). 디바운스 미구현 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 마케팅 알림만 끄기 (Happy Path)**: Given 모든 묶음 ON (서버 미저장 상태이므로 기본 true) When 사용자가 해당 흐름을 실행하면 Then 6개 type의 push가 false. 이후 PROMOTION 등의 알림 발생 시 인박스 INSERT는 정상이나(inAppEnabled는 true), FCM 발송은 skip
- **AC-02. 데이팅 알림 ON으로 다시 켜기**: Given 데이팅 알림 OFF (`CHAT_MESSAGE` pushEnabled=false 저장됨) When 사용자가 해당 흐름을 실행하면 Then 채팅 메시지 알림이 다시 푸시 발송됨
- **AC-03. 한 카테고리 내 부분 토글 시 카테고리 표기**: Given 13개 결제 type 중 12개 ON, `PROMOTION`이 OFF로 가정 (다른 경로/관리자/이전 클라 버전에서 변경된 케이스 — 마케팅과 카테고리 분리되어 있어 결제와는 무관, 결제 카테고리 내부에서는 모두 같은 카테고리) When 사용자가 해당 흐름을 실행하면 Then 13개 모두 ON 동기화
- **AC-04. 카테고리 내 일부 PATCH 실패 (네트워크 끊김)**: Given 이벤트 카테고리 ON, 10개 type 모두 true When 사용자가 해당 흐름을 실행하면 Then 부분 부정합 → 사용자가 재시도. 최종 일관성 회복
- **AC-05. 알림 설정에서 방해금지 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then F12-04로 흐름 위임
- **AC-06. 잘못된 notificationType 전달 (방어 케이스)**: Given alice 로그인 후 `/notifications/settings` 진입. `notificationSettingsNotifierProvider.build()` → `GET /api/v1/notifications/settings` → 기존 row 들 + 서버 default(true) 가 머지된 list 가 state 에 채워짐. 화면에 "데이팅 알림" 카테고리 row + Switch(value=true) 노출 When 사용자가 해당 흐름을 실행하면 Then 서버 상태 변경 없음
