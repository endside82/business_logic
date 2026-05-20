# F14-02. 위치 공유 중지 (opt-out) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/14_location_directions/F14-02_location-opt-out -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-02_location-opt-out`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

참석자가 진행 중인 위치 공유를 즉시 중지하는 API. `LocationOptIn` 행의 `optedIn` 필드를 `false` 로 토글하여, 이후 다른 참석자의 `GET /location` 응답에서 본인이 제외되도록 한다. 본 엔드포인트는 `LocationShare` 행을 명시적으로 삭제하지 않지만, opt-in 토글이 false 면 응답 필터에서 자동으로 제외되어 사실상 즉시 비공개 처리된다. UI 스펙에는 "이벤트 종료 후 위치 데이터 즉시 삭제" 라는 정책이 있으나, opt-out 단일 호출이 `LocationShare` 를 직접 DELETE 하지는 않는 점에 주의(서비스 코드 65-83 행).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 "위치 공유" 토글 Off
- (2) `LocationPrivacyScreen` (SCR-LD-003)의 이벤트 카드 토글 Off
- (3) 이벤트 종료 + 2시간 경과 후 자동 비활성 (서버 측 정책 — 클라이언트가 먼저 인식하지는 못함)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/14_location_directions/F14-02_location-opt-out/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/14_location_directions/F14-02_location-opt-out/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/14_location_directions/F14-02_location-opt-out/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/14_location_directions/F14-02_location-opt-out/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/location/controller/LocationController.java:37` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 토글 Off 액션 → 다이얼로그 → 확인
2. `EventLocationNotifier.optOut()` → `EventLocationRepository.optOut(eventId)` → POST `/api/v1/events/{eventId}/location/opt-out`
3. 성공 → notifier 가 내부 `refresh()` 호출 → `GET /api/v1/events/{eventId}/location` 다시 호출 (본인 좌표 응답에서 제외됨 — 응답 자체에는 다른 opt-in 사용자만 남음)
4. (Privacy 화면 흐름) `LocationPrivacyNotifier.optOut()` → `ref.invalidateSelf()` 로 대시보드 재조회

## 4. 서버 계약

### 개요

참석자가 진행 중인 위치 공유를 즉시 중지하는 API. `LocationOptIn` 행의 `optedIn` 필드를 `false` 로 토글하여, 이후 다른 참석자의 `GET /location` 응답에서 본인이 제외되도록 한다. 본 엔드포인트는 `LocationShare` 행을 명시적으로 삭제하지 않지만, opt-in 토글이 false 면 응답 필터에서 자동으로 제외되어 사실상 즉시 비공개 처리된다. UI 스펙에는 "이벤트 종료 후 위치 데이터 즉시 삭제" 라는 정책이 있으나, opt-out 단일 호출이 `LocationShare` 를 직접 DELETE 하지는 않는 점에 주의(서비스 코드 65-83 행).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/location/opt-out | LocationController#optOut | required | LocationOptIn upsert (optedIn=false) |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `LocationOptIn`
  - 행이 한 번 만들어지면 삭제하지 않고 `optedIn` boolean 만 토글하는 설계. 이력성 행이 아니므로 audit 용도는 별도 access log 가 담당.
- **Entity** `LocationShare`
  - opt-out 으로 삭제되지 않음. 만료(`expiresAt`) 또는 30일 cleanup 스케줄(`LocationService.cleanupExpiredLocations`, `cron = 0 30 3 * * *`) 에 의해 정리.
- **Param/VO**: 없음 (요청/응답 body 없음)

### 의존 단위 / 외부 시스템

- **Unit 03 (event/capacity)**: F14-01 과 동일한 자격 검증 (`EventRepository`, `EventCoHostRepository`, `EventAttendanceRepository`).
- **Unit 12 notification (간접)**: opt-out 시 30분 전 만료 알림 자동 차단 (`LocationShareExpiringScheduler`).
- **외부**: 없음.

## 5. 프론트 계약

### 진입 경로

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 "위치 공유" 토글 Off
- (2) `LocationPrivacyScreen` (SCR-LD-003)의 이벤트 카드 토글 Off
- (3) 이벤트 종료 + 2시간 경과 후 자동 비활성 (서버 측 정책 — 클라이언트가 먼저 인식하지는 못함)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/home/events/:eventId/location` | `location/screens/event_location_screen.dart` | 시트 내 토글 Off + 확인 다이얼로그 |
| `/home/events/:eventId/location/privacy` | `location/screens/location_privacy_screen.dart` | 이벤트 카드 토글 Off |

### 화면별 구성 요소 & 액션

### 이벤트 위치 지도 — 시트 (`event_location_screen.dart`)

- **사용자가 보는 것**:
  - 시트 상단 "위치 공유 중" / "위치 비공개" 라벨 + Switch (Switch가 Off일 때 라벨은 회색 textSecondary)
- **사용자가 할 수 있는 액션**:
  - Switch Off → `_toggleOptIn(false)` → `_showOptOutDialog()` (`AlertDialog`)
    - 제목: "위치 공유 중지"
    - 본문: "위치 공유를 중지하시겠습니까?\n다른 참석자에게 내 위치가 표시되지 않습니다."
    - 액션: "취소" / "중지" (중지는 `AppColors.error500` 색)
  - "중지" 탭 → `EventLocationNotifier.optOut()` → POST `/api/v1/events/{eventId}/location/opt-out`
  - 성공 시: `_isOptedIn = false`, `stopAutoRefresh()`, 토스트 "위치 공유를 중지했습니다"
- **상태 분기**:
  - 토글 처리 중 두 번째 탭 무시 (`_isTogglingOptIn` 가드)
  - 다이얼로그 취소 시 토글이 시각적으로 Off → On 복귀(별도 시각적 처리 없음, `_isOptedIn` 변경 안됨)
  - 실패 시 silent (`Result.failure` → `success: false` 반환, 토스트 미표기 — 관찰된 현 구현)

### 위치 프라이버시 — 이벤트 카드 (`location_privacy_screen.dart`)

- **사용자가 보는 것**:
  - 이벤트 정보 카드 + Switch + 상태 텍스트 ("위치 공유 중" green / "위치 비공개" gray)
  - 안내 박스 (위치 공유 1시간 전부터 활성, 참석 확정자에게만, 종료 후 즉시 삭제)
- **사용자가 할 수 있는 액션**:
  - Switch Off (참석자) → `_toggleOptIn(false)` → `LocationPrivacyNotifier.optOut()` 또는 `EventLocationNotifier.optOut()` (현 구현은 `eventLocationNotifierProvider` 의 `.optOut()` 호출, 173-176 행)
  - 성공 시 토스트 "위치 공유를 중단했습니다" (`success` 타입), 실패 시 `showApiErrorToast(fallback: '위치 공유 설정에 실패했습니다')`
  - (호스트인 경우엔 별도 분기로 `Event.locationShareEnabled` 토글 → F14-04 에서 다룸)
- **상태 분기**:
  - 처리 중에는 Switch 자리에 `CircularProgressIndicator(strokeWidth: 2)` 표시
  - 에러 시 `ApiErrorFeedback` 토스트로 fallback 메시지

### API 호출 순서 (Provider/Repository 관점)

1. 토글 Off 액션 → 다이얼로그 → 확인
2. `EventLocationNotifier.optOut()` → `EventLocationRepository.optOut(eventId)` → POST `/api/v1/events/{eventId}/location/opt-out`
3. 성공 → notifier 가 내부 `refresh()` 호출 → `GET /api/v1/events/{eventId}/location` 다시 호출 (본인 좌표 응답에서 제외됨 — 응답 자체에는 다른 opt-in 사용자만 남음)
4. (Privacy 화면 흐름) `LocationPrivacyNotifier.optOut()` → `ref.invalidateSelf()` 로 대시보드 재조회

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 옵트아웃 확인 다이얼로그를 띄울지 여부 (서버는 항상 즉시 처리. 사용자 보호 차원에서 클라이언트가 강제)
- 다이얼로그 문구: "위치 공유를 중지하시겠습니까?\n다른 참석자에게 내 위치가 표시되지 않습니다."
- "중지" 버튼 색상: `AppColors.error500`
- 토스트 메시지: "위치 공유를 중지했습니다" (지도 화면) / "위치 공유를 중단했습니다" (프라이버시 화면)
- 옵트아웃 후 시트 라벨 색상이 `AppColors.primary500` → `AppSemanticColors.textSecondary` 로 즉시 전환
- 30초 자동 폴링 타이머 즉시 중지 (`stopAutoRefresh()`)
- 다이얼로그 취소 시 토글이 시각적으로 잠시 Off로 보였다가 On으로 복귀하는지 — 현 구현은 `setState` 가 다이얼로그 결과 후에만 호출되므로 시각적 깜빡임 없음

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 목적지에 도착해서 위치 공유를 끈다 (Happy Path) | `LocationOptIn.optedIn=true`, `LocationShare` 행 존재 (expiresAt = +2h) | - 서버: `optedIn=false`, `LocationShare` 행은 그대로 남아 있음 (expiresAt 만료 또는 30일 cleanup 까지) |
| S2 | 다이얼로그에서 "취소"를 눌러 공유를 유지한다 (취소 분기) | 토글을 잘못 건드린 사용자 | 서버/클라이언트 모두 변화 없음. 폴링 계속 동작 |
| S3 | 프라이버시 대시보드에서 끄기 (다른 진입점) | 모임 종료 직후 본인 위치 데이터를 빨리 끄고 싶은 사용자 | 서버 동일. 프라이버시 화면이 dispose 되지 않으면 다음 빌드 때 토글이 Off 유지 |
| S4 | 자격 미충족 (네거티브) | 모임에서 강퇴되어 `ATTENDING` 상태가 아닌 사용자 | 서버 변화 없음 |
| S5 | 호스트가 이벤트 단위로 위치 공유 비활성화 → 모든 참석자 자동 비공개 (간접 opt-out) | 일반 참석자, 호스트가 이벤트 설정에서 `locationShareEnabled=false` 토글 | 본인 옵트인 행은 true 유지, 그러나 update 차단으로 좌표 멈춤 → 다음 GET 응답에선 expiresAt 만료 시점에 자동 제외 |
| S6 | 이벤트 종료 + 2h 경과 (자동 만료 분기) | 모임이 끝났는데 화면을 켜둔 채로 둔 사용자 | 서버 데이터 점진적 정리, 사용자는 다음 화면 진입 시 에러 상태로 진입 |
| S7 | opt-out 후 다시 opt-in (재개) | 잠시 끈 뒤 다시 켜는 사용자 | F14-01 S1 종료 상태와 동일 |

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
| 후보 | backend.md:5 | 참석자가 진행 중인 위치 공유를 즉시 중지하는 API. `LocationOptIn` 행의 `optedIn` 필드를 `false` 로 토글하여, 이후 다른 참석자의 `GET /location` 응답에서 본인이 제외되도록 한다. 본 엔드포인트는 `LocationShare` 행을 명시적으로 삭제하지 않지만, opt-in 토글이 false 면 응답 필터에서 자동으로 제외되어 사실상 즉시 비공개 처리된다. UI 스펙에는 "이벤트 종료 후 위치 데이터 즉시 삭제" 라는 정책이 있으나, opt-out 단일 호출이 `LocationShare` 를 직접 DELETE 하지는 않는 점에 주의(서비스 코드 65-83 행). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:74 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P64 매트릭스 mode=opt_out) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 목적지에 도착해서 위치 공유를 끈다 (Happy Path)**: Given `LocationOptIn.optedIn=true`, `LocationShare` 행 존재 (expiresAt = +2h) When 사용자가 해당 흐름을 실행하면 Then - 서버: `optedIn=false`, `LocationShare` 행은 그대로 남아 있음 (expiresAt 만료 또는 30일 cleanup 까지)
- **AC-02. 다이얼로그에서 "취소"를 눌러 공유를 유지한다 (취소 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버/클라이언트 모두 변화 없음. 폴링 계속 동작
- **AC-03. 프라이버시 대시보드에서 끄기 (다른 진입점)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 동일. 프라이버시 화면이 dispose 되지 않으면 다음 빌드 때 토글이 Off 유지
- **AC-04. 자격 미충족 (네거티브)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음
- **AC-05. 호스트가 이벤트 단위로 위치 공유 비활성화 → 모든 참석자 자동 비공개 (간접 opt-out)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본인 옵트인 행은 true 유지, 그러나 update 차단으로 좌표 멈춤 → 다음 GET 응답에선 expiresAt 만료 시점에 자동 제외
- **AC-06. 이벤트 종료 + 2h 경과 (자동 만료 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 데이터 점진적 정리, 사용자는 다음 화면 진입 시 에러 상태로 진입
- **AC-07. opt-out 후 다시 opt-in (재개)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then F14-01 S1 종료 상태와 동일

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
