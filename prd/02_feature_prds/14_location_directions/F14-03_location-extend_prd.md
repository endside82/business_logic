# F14-03. 위치 공유 만료 연장 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

옵트인 상태로 위치 공유 중인 사용자의 `LocationShare.expiresAt` 시각을 분 단위로 연장하는 API. 기본 요청은 30분이고 각 요청값을 1~120분으로 클램프한다. 횟수 제한은 없지만 연장된 만료는 모임 종료 시각을 넘지 못한다. `LocationShareExpiringScheduler`는 매분 잔여 25~31분 범위의 share를 찾아 `LOCATION_SHARE_EXPIRING` 알림 생성을 시도하며, 실제 인앱/푸시 도달은 사용자 채널 설정과 비동기 발송 결과에 따른다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 카운트다운 행에 노출되는 "+ 30분 연장" 버튼
- (2) `LOCATION_SHARE_EXPIRING` 푸시 알림 탭 → `notification_router` 가 이벤트 위치 화면으로 인계 (UI/UX 스펙 SCR-LD-001/003에 별도 진입점 표기는 없으나 컨트롤러 주석 G-01에 명시)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `LocationController`. 앱: `event_location_screen.dart`.

<!-- source-references:start -->
서버 창구: `LocationController#extendShare`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 사용자가 "+ 30분 연장" 탭 → `EventLocationNotifier.extend(extendMinutes: 30)` 호출
2. `EventLocationRepository.extendShare(eventId, 30)` → POST `/api/v1/events/{eventId}/location/extend?extendMinutes=30`
3. 성공 → notifier 가 내부 `refresh()` 호출 → `GET /location` → 응답의 `LocationVo.expiresAt` 이 갱신된 값으로 들어옴
4. UI: `myLocation.expiresAt` 이 다음 빌드에서 새 값으로 반영 → 카운트다운 텍스트 즉시 증가
5. (백그라운드) 서버 측 스케줄러가 새 expiresAt 기준 잔여 25~31분 window에서 다시 알림 생성을 시도할 수 있음

> 주의: `ref.invalidate(eventLocationNotifierProvider(eventId))` 를 호출하면 Notifier 가 dispose 되어 30s 자동 갱신 Timer 가 영구 정지된다. 따라서 `extend()` 가 내부에서 `refresh()` 만 호출하고, 화면은 invalidate 호출하지 않는다 (현 구현 G01-D2 코멘트 참조).

## 4. 제품 규칙

- 연장은 지금 공유 중인 사람만 할 수 있다. 공유가 이미 만료됐으면 연장되지 않고(`LOCATION_SHARE_EXPIRED`), 공유를 다시 켜서 좌표를 새로 올려야 한다. 호스트는 opt-in 없이도 연장할 수 있지만 본인 좌표를 한 번도 올리지 않았으면 연장할 공유가 없다.
- 연장 결과는 모임 종료 시각을 넘지 못한다. 한 번에 1~120분(기본 30분)만 늘 수 있고 횟수 제한은 없다.
- 만료 30분 전 알림은 그 사람이 opt-in 중일 때만 가고, 연장하면 새 만료 시각 기준으로 다시 간 수 있다. 앱 알림을 끈 사람에게는 알림이 만들어지지 않고, 푸시를 끈 사람은 앱 안 알림만 받는다. 푸시는 늦게 도착할 수 있어 정확히 30분 전은 약속하지 않는다.
- 위치 지도 시트에는 공유 중이고 만료 시각이 있을 때만 남은 시간(`N분 M초 후 종료`)과 `+ 30분 연장` 버튼이 보인다. 만료되면 `공유 종료됨` 이 빨갛게 뜬다. 성공은 `+ 30분 연장됨`, 실패는 `연장에 실패했습니다` 이고 처리 중에는 버튼이 눌리지 않는다. 연장 슬라이더 같은 단위 선택은 없다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 만료 근접 알림을 받고 연장한다 (Happy Path, 알림 트리거) | opt-in true, LocationShare 행 존재, 인앱 알림 허용 | 스케줄러 window와 dedupe를 통과하면 인앱 알림이 생성되고 push 허용 시 비동기 발송을 시도한다. 사용자가 연장하면 `location_share.expires_at` += 30분 |
| S2 | 시트에서 직접 연장 (알림 없이 능동적으로) | 카운트다운을 보고 미리 연장하려는 사용자 | 위 S1 의 7~9 단계와 동일 |
| S3 | 호스트가 본인 위치 공유 없이 연장 시도 (호스트 분기) | 호스트, 본인은 LocationShare 행 없음 (위치 update 호출 안 함) | 호스트는 본인 좌표를 한 번이라도 update 한 후에야 연장 가능 |
| S4 | 이미 만료된 공유를 연장 시도 (만료 분기) | 알림을 늦게 본 사용자, expiresAt 이 이미 5분 전 | 사용자는 옵트인 토글을 다시 켜고 update 호출하여 새로 시작해야 함 (`POST /update` 가 `expiresAt = now+2h` 로 재설정) |
| S5 | 클램프 동작 — 사용자가 200분을 보내도 120분으로 잘림 | 외부 호출자 / 디버그 환경 | 항상 1~120 분 범위 내에서만 연장. 음수/0 도 1로 클램프 |
| S6 | opt-out 후 알림 발송 차단 (알림 producer 분기) | 사용자가 opt-out 한 상태인데 expiresAt 이 30분 후로 다가옴 | opt-out 사용자는 만료 알림을 받지 않음 (스케줄러 79-83 행) |
| S7 | 미참가자가 연장 시도 (자격 분기) | ATTENDING 아닌 사용자 | 서버 변화 없음 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 연장 뒤 자동 갱신 | 연장이 성공하면 위치 목록을 그 자리에서 다시 읽고 30초 자동 갱신은 그대로 돈다. 오류 화면의 「다시 시도」 만 목록을 새로 만들고, 목록이 다시 보이면 자동 갱신을 다시 켠다 | 없음 |
| 해소됨 | 시험 보강 기록 | 위치 공유 연장의 시험 보강 기록이다. 결함이 아니다 | 없음 |
| Gap | 연장 상한 시험 | 서버는 한 번 연장을 1~120분으로 자르고 모임 끝 시각을 넘기지 않는다. 앱은 늘 30분만 보낸다. 모임 끝 상한과 공유 시간 밖 거절은 단위 시험이 지키지만, 120분 자르기와 1분 올리기는 시험이 없다 | 120분 넘는 값과 1분 밑 값을 자르는 단위 시험을 더한다 |
| 전달 한계 | `LocationShareExpiringScheduler`, `NotificationService` | 잔여 25~31분 window에서 알림 생성을 시도하며 채널 설정에 따라 skip된다. push는 비동기라 정확히 30분 전 도달을 보장하지 않는다. | 문구를 근사 알림으로 유지하고 trace/설정별 테스트 |
| UX Gap | `_CountdownRow` | 만료 여부로 연장 버튼을 disable하지 않는다. 다음 GET 전에 stale `myLocation`이 남으면 `"공유 종료됨"` 옆 버튼이 활성이고 누르면 서버 실패 토스트가 날 수 있다. | `expiresAt <= now`에서 버튼 숨김/비활성화 |

## 9. 수용 기준

- **AC-01. 만료 근접 알림을 받고 연장한다 (Happy Path, 알림 트리거)**: Given opt-in true, share가 잔여 25~31분 window에 있고 인앱 알림이 허용될 때 When scheduler와 dedupe를 통과하면 Then 인앱 알림을 생성하고 push 허용 시 비동기 발송을 시도하며, 사용자의 +30분 요청 성공 시 기존 `expiresAt`에 30분을 더한다
- **AC-02. 시트에서 직접 연장 (알림 없이 능동적으로)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 위 S1 의 7~9 단계와 동일
- **AC-03. 호스트가 본인 위치 공유 없이 연장 시도 (호스트 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 호스트는 본인 좌표를 한 번이라도 update 한 후에야 연장 가능
- **AC-04. 이미 만료된 공유를 연장 시도 (만료 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자는 옵트인 토글을 다시 켜고 update 호출하여 새로 시작해야 함 (`POST /update` 가 `expiresAt = now+2h` 로 재설정)
- **AC-05. 요청 1회 클램프**: Given 200분·0분 같은 값을 보낼 때 When 연장 서비스가 처리하면 Then 해당 요청만 120분·1분으로 클램프한다. 반복 호출해도 만료는 모임 종료 시각까지만 늘어난다
- **AC-06. opt-out 후 알림 발송 차단 (알림 producer 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then opt-out 사용자는 만료 알림을 받지 않음 (스케줄러 79-83 행)
- **AC-07. 미참가자가 연장 시도 (자격 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음
