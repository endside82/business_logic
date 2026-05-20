# F14-03. 위치 공유 만료 연장 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/14_location_directions/F14-03_location-extend -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-03_location-extend`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

옵트인 상태로 위치 공유 중인 사용자의 `LocationShare.expiresAt` 시각을 분 단위로 연장하는 API. 기본 30분, 최대 120분으로 클램프된다. `LocationShareExpiringScheduler` 가 만료 30분 전에 발송하는 `LOCATION_SHARE_EXPIRING` 푸시 알림이 사용자가 모임이 길어졌을 때 본 API를 호출하도록 유도하는 흐름의 종착지.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 카운트다운 행에 노출되는 "+ 30분 연장" 버튼
- (2) `LOCATION_SHARE_EXPIRING` 푸시 알림 탭 → `notification_router` 가 이벤트 위치 화면으로 인계 (UI/UX 스펙 SCR-LD-001/003에 별도 진입점 표기는 없으나 컨트롤러 주석 G-01에 명시)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/14_location_directions/F14-03_location-extend/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/14_location_directions/F14-03_location-extend/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/14_location_directions/F14-03_location-extend/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/14_location_directions/F14-03_location-extend/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/location/controller/LocationController.java:72` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 사용자가 "+ 30분 연장" 탭 → `EventLocationNotifier.extend(extendMinutes: 30)` 호출
2. `EventLocationRepository.extendShare(eventId, 30)` → POST `/api/v1/events/{eventId}/location/extend?extendMinutes=30`
3. 성공 → notifier 가 내부 `refresh()` 호출 → `GET /location` → 응답의 `LocationVo.expiresAt` 이 갱신된 값으로 들어옴
4. UI: `myLocation.expiresAt` 이 다음 빌드에서 새 값으로 반영 → 카운트다운 텍스트 즉시 증가
5. (백그라운드) 서버 측 스케줄러가 새 expiresAt 의 30분 전 시점에 다시 알림 가능

> 주의: `ref.invalidate(eventLocationNotifierProvider(eventId))` 를 호출하면 Notifier 가 dispose 되어 30s 자동 갱신 Timer 가 영구 정지된다. 따라서 `extend()` 가 내부에서 `refresh()` 만 호출하고, 화면은 invalidate 호출하지 않는다 (현 구현 G01-D2 코멘트 참조).

## 4. 서버 계약

### 개요

옵트인 상태로 위치 공유 중인 사용자의 `LocationShare.expiresAt` 시각을 분 단위로 연장하는 API. 기본 30분, 최대 120분으로 클램프된다. `LocationShareExpiringScheduler` 가 만료 30분 전에 발송하는 `LOCATION_SHARE_EXPIRING` 푸시 알림이 사용자가 모임이 길어졌을 때 본 API를 호출하도록 유도하는 흐름의 종착지.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/location/extend?extendMinutes=30 | LocationController#extendShare | required | LocationShare.expiresAt 을 분 단위 연장 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `LocationShare`
  - `expiresAt: LocalDateTime?` — 연장의 단일 진실 출처
  - 컨트롤러 주석 (G-01) 에 "최대 120분" 명시. 서비스 클램프 로직과 일치.
- **Enum**: 본 기능 전용 enum 없음.
- **외부 알림 producer**: `LocationShareExpiringScheduler`
  - `@Scheduled(fixedRate = 60000)` — 매분 실행
  - 윈도우: `[now + 25m, now + 31m]` (lookback 5m + lookahead 1m)
  - dedupe TTL 35분, key 에 `expiresAt` 포함 → 연장 시 새 슬롯 자동 발급
  - opt-out 사용자에게는 발송 스킵

### 의존 단위 / 외부 시스템

- **Unit 03 (event/capacity)**: 자격 검증 의존. Event/Attendance 미존재 시 차단.
- **Unit 12 (notification)**: `LOCATION_SHARE_EXPIRING` (NotificationType.id=56) 발송 — 본 API 호출을 유도하는 진입점이 되는 알림.
- **외부**: Redisson (Redis) — dedupe key 로 동일 (shareId, expiresAt) 조합 알림 중복 발송 방지.

## 5. 프론트 계약

### 진입 경로

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 카운트다운 행에 노출되는 "+ 30분 연장" 버튼
- (2) `LOCATION_SHARE_EXPIRING` 푸시 알림 탭 → `notification_router` 가 이벤트 위치 화면으로 인계 (UI/UX 스펙 SCR-LD-001/003에 별도 진입점 표기는 없으나 컨트롤러 주석 G-01에 명시)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/home/events/:eventId/location` | `location/screens/event_location_screen.dart` | 시트 내 "+ 30분 연장" 버튼 (`_CountdownRow` 익스텐션) |

별도 화면/모달 없음 — 시트 내 인라인 액션.

### 화면별 구성 요소 & 액션

### 이벤트 위치 지도 — 카운트다운 행 (`event_location_screen.dart` `_buildCountdownRow`)

- **표시 조건**: `_isOptedIn == true` && `myLocation?.expiresAt != null`
- **사용자가 보는 것**:
  - 좌측: 시계 아이콘 (`Icons.schedule_outlined`) + 텍스트 "N분 M초 후 종료" (만료 시 "공유 종료됨", 색은 `AppColors.error500`)
  - 우측: `AppButton` (label "+ 30분 연장", `ButtonVariant.secondary`, `ButtonSize.sm`, `loading: _isExtending`)
  - 1초마다 좌측 텍스트만 rebuild (`ValueNotifier<DateTime> _nowTick` + `ValueListenableBuilder`) — 지도/시트/거리 위젯은 rebuild 되지 않음 (G01-D1 최적화)
- **사용자가 할 수 있는 액션**:
  - "+ 30분 연장" 탭 → `_extendShare()` → POST `/api/v1/events/{eventId}/location/extend?extendMinutes=30`
  - 성공 시 토스트 "+ 30분 연장됨"
  - 실패 시 토스트 "연장에 실패했습니다" (`ToastType.error`)
- **상태 분기**:
  - 로딩: 버튼 자체에 `loading: true` 로 인디케이터 표기
  - 만료 직전 텍스트는 검정 → 만료 시점 즉시 빨강 + "공유 종료됨"
  - 비-옵트인 또는 `expiresAt == null` 일 땐 카운트다운 행 자체가 렌더되지 않음

### API 호출 순서 (Provider/Repository 관점)

1. 사용자가 "+ 30분 연장" 탭 → `EventLocationNotifier.extend(extendMinutes: 30)` 호출
2. `EventLocationRepository.extendShare(eventId, 30)` → POST `/api/v1/events/{eventId}/location/extend?extendMinutes=30`
3. 성공 → notifier 가 내부 `refresh()` 호출 → `GET /location` → 응답의 `LocationVo.expiresAt` 이 갱신된 값으로 들어옴
4. UI: `myLocation.expiresAt` 이 다음 빌드에서 새 값으로 반영 → 카운트다운 텍스트 즉시 증가
5. (백그라운드) 서버 측 스케줄러가 새 expiresAt 의 30분 전 시점에 다시 알림 가능

> 주의: `ref.invalidate(eventLocationNotifierProvider(eventId))` 를 호출하면 Notifier 가 dispose 되어 30s 자동 갱신 Timer 가 영구 정지된다. 따라서 `extend()` 가 내부에서 `refresh()` 만 호출하고, 화면은 invalidate 호출하지 않는다 (현 구현 G01-D2 코멘트 참조).

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 클라이언트 기본 연장값: **30분** (`extendMinutes: 30`)
- 사용자에게 노출되는 연장 단위/슬라이더 UI는 없음 — 단일 "+ 30분" 버튼
- 카운트다운 표시 포맷: `"${remaining.inMinutes}분 ${remaining.inSeconds % 60}초 후 종료"`
- 만료 후 텍스트: "공유 종료됨" (빨강)
- tick 주기: 1초 (`Timer.periodic(Duration(seconds: 1))`)
- 토스트 문구: 성공 "+ 30분 연장됨", 실패 "연장에 실패했습니다"
- `_isExtending` 가드로 더블 탭 방지
- 카운트다운 행은 시트 안에서 토글 행과 Divider 사이에 위치
- invalidate 대신 in-place `refresh()` 사용하여 폴링 Timer 보존

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 만료 30분 전 푸시를 받고 연장한다 (Happy Path, 알림 트리거) | opt-in true, LocationShare 행 존재 | - 서버: `location_share.expires_at` += 30분 |
| S2 | 시트에서 직접 연장 (알림 없이 능동적으로) | 카운트다운을 보고 미리 연장하려는 사용자 | 위 S1 의 7~9 단계와 동일 |
| S3 | 호스트가 본인 위치 공유 없이 연장 시도 (호스트 분기) | 호스트, 본인은 LocationShare 행 없음 (위치 update 호출 안 함) | 호스트는 본인 좌표를 한 번이라도 update 한 후에야 연장 가능 |
| S4 | 이미 만료된 공유를 연장 시도 (만료 분기) | 알림을 늦게 본 사용자, expiresAt 이 이미 5분 전 | 사용자는 옵트인 토글을 다시 켜고 update 호출하여 새로 시작해야 함 (`POST /update` 가 `expiresAt = now+2h` 로 재설정) |
| S5 | 클램프 동작 — 사용자가 200분을 보내도 120분으로 잘림 | 외부 호출자 / 디버그 환경 | 항상 1~120 분 범위 내에서만 연장. 음수/0 도 1로 클램프 |
| S6 | opt-out 후 알림 발송 차단 (알림 producer 분기) | 사용자가 opt-out 한 상태인데 expiresAt 이 30분 후로 다가옴 | opt-out 사용자는 만료 알림을 받지 않음 (스케줄러 79-83 행) |
| S7 | 미참가자가 연장 시도 (자격 분기) | ATTENDING 아닌 사용자 | 서버 변화 없음 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:42 | > 주의: `ref.invalidate(eventLocationNotifierProvider(eventId))` 를 호출하면 Notifier 가 dispose 되어 30s 자동 갱신 Timer 가 영구 정지된다. 따라서 `extend()` 가 내부에서 `refresh()` 만 호출하고, 화면은 invalidate 호출하지 않는다 (현 구현 G01-D2 코멘트 참조). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:76 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P64 매트릭스 mode=extend) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:106 | - 클램프(1~120분) 검증은 본 E2E 에서 미커버 — 서비스 단위 테스트로 보강 필요 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 만료 30분 전 푸시를 받고 연장한다 (Happy Path, 알림 트리거)**: Given opt-in true, LocationShare 행 존재 When 사용자가 해당 흐름을 실행하면 Then - 서버: `location_share.expires_at` += 30분
- **AC-02. 시트에서 직접 연장 (알림 없이 능동적으로)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 위 S1 의 7~9 단계와 동일
- **AC-03. 호스트가 본인 위치 공유 없이 연장 시도 (호스트 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 호스트는 본인 좌표를 한 번이라도 update 한 후에야 연장 가능
- **AC-04. 이미 만료된 공유를 연장 시도 (만료 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자는 옵트인 토글을 다시 켜고 update 호출하여 새로 시작해야 함 (`POST /update` 가 `expiresAt = now+2h` 로 재설정)
- **AC-05. 클램프 동작 — 사용자가 200분을 보내도 120분으로 잘림**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 항상 1~120 분 범위 내에서만 연장. 음수/0 도 1로 클램프
- **AC-06. opt-out 후 알림 발송 차단 (알림 producer 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then opt-out 사용자는 만료 알림을 받지 않음 (스케줄러 79-83 행)
- **AC-07. 미참가자가 연장 시도 (자격 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
