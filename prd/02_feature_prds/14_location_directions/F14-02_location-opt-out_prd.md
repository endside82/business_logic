# F14-02. 위치 공유 중지 (opt-out) PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/14_location_directions/F14-02_location-opt-out -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-02_location-opt-out`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-07-29 현재 소스 갱신: `LocationService#optOut`은 `LocationOptIn.optedIn=false` 저장과 함께 `locationShareRepository.deleteByEventIdAndUserId(eventId, userId)`를 호출한다. 따라서 기존 문서의 “LocationShare 행은 남는다”는 설명은 현재 소스와 반대이며, 성공 즉시 보관 좌표를 삭제하는 계약으로 교정한다.

## 1. 결론

참석자가 진행 중인 위치 공유를 즉시 중지하는 API. `LocationOptIn` 행의 `optedIn`을 `false`로 저장하고 해당 이벤트·사용자의 `LocationShare` 행을 삭제한다. 이후 다른 참석자의 `GET /location` 응답에서 본인이 제외된다. 위치 지도 화면에서 끄면 목록 조회와 GPS 전송 타이머를 모두 정지하지만, push로 연 프라이버시 화면에서 끄는 경로는 아래 지도 화면의 타이머를 직접 정지하지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 "위치 공유" 토글 Off
- (2) `LocationPrivacyScreen` (SCR-LD-003)의 이벤트 카드 토글 Off
- 종료 +2시간은 일반 참석자의 GET/update 접근창 종료일 뿐 opt-out 동작이 아니다. `LocationOptIn.optedIn`을 false로 바꾸는 자동 경로는 없다.

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
3. 성공 → notifier가 내부 `refresh()`를 fire-and-forget으로 호출한다. 일반 참석자는 이제 opt-in이 아니므로 `GET /location`이 `LOCATION_OPT_IN_REQUIRED`로 거절되고 `refresh()`가 예외를 삼켜 기존 state를 유지할 수 있다. 관리자급 조회자만 새 목록을 정상 수신한다.
4. (Privacy 화면 흐름) 같은 `EventLocationNotifier.optOut()` 성공 후 `ref.invalidate(locationPrivacyProvider(eventId))`로 대시보드를 재조회

## 4. 서버 계약

### 개요

참석자가 진행 중인 위치 공유를 즉시 중지한다. `LocationOptIn` 행은 이력성 토글로 남겨 `optedIn=false`로 바꾸고, 현재 좌표가 든 `LocationShare` 행은 이벤트·사용자 키로 즉시 삭제한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/location/opt-out | LocationController#optOut | required | LocationOptIn upsert (optedIn=false) |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `LocationOptIn`
  - 행이 한 번 만들어지면 삭제하지 않고 `optedIn` boolean 만 토글하는 설계. 이력성 행이 아니므로 audit 용도는 별도 access log 가 담당.
- **Entity** `LocationShare`
  - opt-out 성공 시 `deleteByEventIdAndUserId`로 즉시 삭제. 남은 만료/30일 초과 행은 매일 03:30 cleanup으로 별도 정리.
- **Param/VO**: 없음 (요청/응답 body 없음)

### 의존 단위 / 외부 시스템

- **Unit 03 (event/capacity)**: F14-01 과 동일한 자격 검증 (`EventRepository`, `EventCoHostRepository`, `EventAttendanceRepository`).
- **Unit 12 notification (간접)**: opt-out 시 30분 전 만료 알림 자동 차단 (`LocationShareExpiringScheduler`).
- **외부**: 없음.

## 5. 프론트 계약

### 진입 경로

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 "위치 공유" 토글 Off
- (2) `LocationPrivacyScreen` (SCR-LD-003)의 이벤트 카드 토글 Off
- 이벤트 종료 +2시간은 일반 참석자 GET/update 시간 게이트다. opt-in 행을 바꾸거나 opt-out API를 자동 호출하지 않으며, 관리자급 GET은 이 시간 게이트도 우회한다.

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
  - 안내 박스의 실제 5개 문구: 위치 update 시작 -2시간~종료 +2시간, 참석자 조회 시작 -24시간, ATTENDING 한정, 중단 후 미노출, 접근 기록 30일
- **사용자가 할 수 있는 액션**:
  - Switch Off (참석자) → `_toggleOptIn(false)` → `eventLocationNotifierProvider(eventId).notifier.optOut()`; 성공 시 `locationPrivacyProvider(eventId)` invalidate
  - 성공 시 토스트 "위치 공유를 중단했습니다" (`success` 타입)
  - notifier가 API 실패를 `false`로 축약하고 화면에 false 분기가 없어 실패는 silent다. `catch/showApiErrorToast`는 예외가 throw될 때만 실행되며 이 repository 실패 경로에는 도달하지 않는다.
  - 이 화면은 `EventLocationScreen` 위에 push되므로 opt-out 성공 후에도 아래 화면의 30초 목록/GPS 60초 타이머를 직접 중지하지 않는다. 목록 GET은 opt-in 부족으로 실패를 삼키고 GPS update는 실패를 누적한 뒤 중지될 수 있다.
  - (호스트인 경우엔 별도 분기로 `Event.locationShareEnabled` 토글 → F14-04 에서 다룸)
- **상태 분기**:
  - 처리 중에는 Switch 자리에 `CircularProgressIndicator(strokeWidth: 2)` 표시
  - 참석자 opt-in/out의 일반적인 `Result.failure`는 boolean false로 소실되어 fallback 토스트가 나오지 않는다.

### API 호출 순서 (Provider/Repository 관점)

1. 토글 Off 액션 → 다이얼로그 → 확인
2. `EventLocationNotifier.optOut()` → `EventLocationRepository.optOut(eventId)` → POST `/api/v1/events/{eventId}/location/opt-out`
3. 성공 → notifier가 `refresh()`를 시도한다. 일반 참석자의 후속 `GET /location`은 opt-in 필수 조건 때문에 실패하고 예외가 화면에 전파되지 않으며, 관리자급 조회자만 새 목록을 정상 수신한다.
4. (Privacy 화면 흐름) `EventLocationNotifier.optOut()` 성공 → `ref.invalidate(locationPrivacyProvider(eventId))`

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
| S1 | 목적지에 도착해서 위치 공유를 끈다 (Happy Path) | `LocationOptIn.optedIn=true`, `LocationShare` 행 존재 | 서버는 `optedIn=false`로 저장하고 `LocationShare` 행을 즉시 삭제한다. 앱은 30초 목록 조회와 60초 GPS 갱신 타이머를 모두 중지한다. |
| S2 | 다이얼로그에서 "취소"를 눌러 공유를 유지한다 (취소 분기) | 토글을 잘못 건드린 사용자 | 서버/클라이언트 모두 변화 없음. 폴링 계속 동작 |
| S3 | 프라이버시 대시보드에서 끄기 (다른 진입점) | 위치 지도에서 push한 프라이버시 화면 | 서버 좌표 삭제와 privacy 토글 Off는 동일하다. 다만 아래 위치 화면의 목록/GPS 타이머는 직접 중지되지 않아 실패 호출이 잠시 계속될 수 있다 |
| S4 | 자격 미충족 (네거티브) | 모임에서 강퇴되어 `ATTENDING` 상태가 아닌 사용자 | 서버 변화 없음 |
| S5 | `locationShareEnabled=false`인 이벤트 조회 | 일반 참석자 또는 관리자급 viewer, 기존 opt-in/share 존재 | `GET /location`은 즉시 빈 목록을 반환한다. opt-in/share 저장 행은 그대로이고 update는 차단된다. |
| S6 | 이벤트 종료 + 2h 경과 (일반 참석자 접근창 종료) | 모임이 끝났는데 화면을 켜둔 일반 참석자 | 다음 GET/update는 시간 오류로 차단되지만 opt-in은 true로 남을 수 있다. share 행은 자체 expiresAt 필터와 03:30 cleanup을 따른다. 관리자급 GET은 +2h를 우회한다. |
| S7 | 위치 지도에서 opt-out 후 다시 opt-in | 같은 위치 지도 인스턴스에서 다시 켜는 사용자 | opt-in 성공 후 첫 좌표 update를 시도하지만 그 성공 여부는 확인하지 않고 두 타이머와 성공 토스트를 시작하므로 동의 true·share row 없음 상태가 가능 |
| S8 | 프라이버시 화면에서 opt-out 후 다시 opt-in | 프라이버시 토글을 다시 켠 사용자 | opt-in 행만 true가 된다. 이 화면은 GPS 취득·`POST /update`·타이머 시작을 하지 않아 위치 화면에서 좌표를 다시 보낼 때까지 share row가 없다 |

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
| 해소 | `LocationService#optOut` | 과거 “opt-out 뒤 좌표 잔존” 후보는 해소됐다. 현재 서비스가 `LocationShare`를 즉시 삭제한다. | 삭제 회귀 테스트 유지 |
| 후보 | scenarios.md:74 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P64 매트릭스 mode=opt_out) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| Gap | `EventLocationNotifier#optOut` / `refresh` | 일반 참석자는 opt-out 직후 목록 조회 자격을 잃는데 notifier가 곧바로 GET을 재시도하고 실패를 숨긴다. 화면의 로컬 토글·타이머는 중지되지만 provider에는 이전 목록이 남을 수 있다. | opt-out 성공 시 state를 비우거나 후속 GET을 생략하는 클라이언트 정책 결정 |
| Gap | `location_privacy_screen.dart` → `EventLocationNotifier` | 프라이버시 화면의 opt-in/out 실패는 boolean false로 소실되어 사용자 안내가 없고, opt-out은 아래 위치 화면의 실행 중 타이머도 정지하지 않는다. | 실패 원인 보존과 공유 라이프사이클 제어를 한 notifier 상태로 통합 |
| P1 Gap | 프라이버시 화면 재동의 | 토글 On은 `LocationOptIn`만 true로 바꾸며 GPS update를 하지 않는다. opt-out이 share를 삭제했으므로 동의와 실제 좌표 공유가 분리된다. | opt-in 성공 뒤 좌표 확보/update 또는 위치 화면으로 명시적 이동 |
| 사실 교정 | `LocationService#getEventLocations` | `locationShareEnabled=false`이면 응답은 즉시 빈 목록이다. 저장된 opt-in/share를 자동 변경·삭제하는 것은 아니다. | “간접 opt-out/만료까지 잔존 응답” 표현 금지 |
| Gap | 종료 +2h 시간 게이트 | 일반 참석자 GET/update만 차단하며 opt-in을 false로 바꾸지 않는다. privileged viewer는 GET gate를 우회한다. | 접근창 종료와 동의 상태 종료를 UI/정책에서 명확히 구분 |

## 9. 수용 기준

- **AC-01. 목적지에 도착해서 위치 공유를 끈다 (Happy Path)**: Given `LocationOptIn.optedIn=true`, `LocationShare` 행 존재 When 사용자가 중지를 확인하면 Then 서버는 `optedIn=false`를 저장하고 현재 좌표 행을 삭제하며 앱은 두 자동 갱신 타이머를 중지한다
- **AC-02. 다이얼로그에서 "취소"를 눌러 공유를 유지한다 (취소 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버/클라이언트 모두 변화 없음. 폴링 계속 동작
- **AC-03. 프라이버시 대시보드에서 끄기 (다른 진입점)**: Given 위치 화면 위에 프라이버시 화면이 push된 상태 When opt-out이 성공하면 Then 서버는 좌표를 삭제하고 privacy 토글은 Off가 되지만 아래 위치 화면의 목록/GPS 타이머는 이 경로에서 직접 중지되지 않는다
- **AC-04. 자격 미충족 (네거티브)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음
- **AC-05. 이벤트 단위 위치 공유 비활성 조회**: Given `locationShareEnabled=false`이고 기존 opt-in/share 행이 있을 때 When GET `/location`을 호출하면 Then 즉시 빈 목록이며 저장 행과 opt-in 값은 그대로다
- **AC-06. 이벤트 종료 +2h 접근창 종료**: Given 일반 참석자의 이벤트가 종료된 지 2시간을 지났을 때 When GET/update를 호출하면 Then 시간 게이트로 차단되지만 `optedIn`은 자동으로 false가 되지 않는다. 관리자급 viewer GET은 이 게이트를 우회한다
- **AC-07. 위치 지도에서 opt-out 후 다시 opt-in**: Given 같은 위치 지도에서 다시 토글을 켤 때 When opt-in은 성공하지만 첫 좌표 update가 실패하면 Then UI는 성공 토스트와 타이머를 시작할 수 있으나 서버에는 `optedIn=true`만 있고 share row는 없을 수 있다
- **AC-08. 프라이버시 화면에서 다시 opt-in**: Given opt-out으로 share row가 삭제된 사용자가 프라이버시 토글을 다시 켤 때 When opt-in이 성공하면 Then `optedIn=true`만 저장되고, 위치 화면에서 `POST /update`하기 전까지 좌표는 노출되지 않는다

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
