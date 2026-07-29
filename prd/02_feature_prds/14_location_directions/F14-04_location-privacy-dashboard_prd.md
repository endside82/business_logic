# F14-04. 위치 프라이버시 대시보드 PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/14_location_directions/F14-04_location-privacy-dashboard -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-04_location-privacy-dashboard`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-07-29 현재 소스 갱신: 컨트롤러는 `eventId`를 서비스에 전달하며, 서비스는 해당 이벤트에서 최근 30일 동안 내 위치를 본 기록만 반환한다. 응답의 `userOptedIn`·`locationShareEnabled`가 토글 상태의 서버 기준이고, Flutter는 `locationPrivacyProvider(eventId)`로 이를 조회해 접근 기록·빈 상태·재시도를 실제 렌더한다. 30일 초과 접근 로그는 매일 03:30 삭제된다. 단 호스트 토글은 전용 위치 설정 API가 아니라 DRAFT-only 범용 이벤트 PATCH를 사용하므로 OPEN/진행 이벤트에서는 실패한다.

## 1. 결론

현재 이벤트에서 내 위치가 지난 30일 동안 위치 목록 응답에 포함된 기록과 내 opt-in 상태, 이벤트 위치 공유 허용 상태를 반환하는 API다. 화면은 단일 `eventId` 컨텍스트에서 토글과 접근 기록을 함께 보여 주며, 토글 자체는 F14-01/F14-02 엔드포인트 또는 호스트의 이벤트 수정 API를 재사용한다. 접근 기록은 고유 사용자나 의도적 클릭을 세지 않는다. `GET /location` 한 번마다 응답에 포함된 타인 좌표별로 행을 추가하므로 30초 자동 폴링도 반복 기록된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- `EventLocationScreen` (SCR-LD-001) AppBar 우측 톱니바퀴 → `context.push('/home/events/$eventId/location/privacy')`
- (간접) 이벤트 설정 메뉴/딥링크에서 같은 라우트로 push 가능

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/14_location_directions/F14-04_location-privacy-dashboard/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/14_location_directions/F14-04_location-privacy-dashboard/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/14_location_directions/F14-04_location-privacy-dashboard/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/14_location_directions/F14-04_location-privacy-dashboard/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/location/controller/LocationController.java:62` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 → `eventDetailNotifierProvider(eventId)`와 `locationPrivacyProvider(eventId)`를 함께 watch
2. `locationPrivacyProvider` → Repository → `GET /api/v1/events/{eventId}/location/privacy`
3. 응답의 `locationShareEnabled`·`userOptedIn`으로 카드/결과 프리뷰 상태를 정하고, `byEvent[].accessors[]`를 최근 접근 기록으로 렌더
4. 호스트 토글 → `PATCH /api/v1/events/{eventId}`. DRAFT에서만 성공하며, 성공 뒤 event detail과 privacy provider를 invalidate한다. OPEN/진행 이벤트는 `INVALID_EVENT_STATUS`.
5. 참석자 토글 → `/opt-in` 또는 `/opt-out` 성공 뒤 privacy provider invalidate. On은 동의 행만 바꾸며 GPS 취득·`POST /update`·타이머 시작은 하지 않는다.

## 4. 서버 계약

### 개요

`LocationController#getPrivacyDashboard`가 `principal.userId`와 path의 `eventId`를 모두 `LocationPrivacyService#getPrivacyDashboard(userId, eventId)`에 전달한다. 서비스는 해당 이벤트·대상 사용자·최근 30일 조건으로 접근 로그를 조회하고, 현재 opt-in과 이벤트 위치 공유 허용 상태를 함께 계산한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/location/privacy | LocationController#getPrivacyDashboard | required | 지난 30일 본인 위치 접근 로그 집계 (이벤트별) |

(opt-in / opt-out 은 F14-01 / F14-02 의 엔드포인트를 그대로 호출)

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `LocationAccessLog` — F14-01 `getEventLocations` 응답에 포함된 타인 `LocationShare`마다 GET 호출 시 한 행씩 INSERT. 고유 접근자 dedupe나 사용자 클릭 구분 없음
  - `id, accessorId, targetUserId, eventId, createdAt`
- **VO** `LocationPrivacyVo`: `totalAccesses`, `userOptedIn`, `locationShareEnabled`, `byEvent`
  - `EventAccessGroup`: `eventId`, `eventTitle`, `accessors`
  - `AccessorInfo`: `userId`, `accessedAt`
- **Enum**: 본 기능 전용 enum 없음

### 의존 단위 / 외부 시스템

- **Unit 03 (event)**: `EventRepository#findById` (제목 lookup, deleted/없는 이벤트 fallback "삭제된 이벤트")
- **F14-01 (같은 단위)**: `LocationAccessLog` 가 본 대시보드의 데이터 원천
- **보관 정책**: `LocationService#cleanupExpiredAccessLogs`, 매일 03:30(`0 30 3 * * *`)에 30일 초과 접근 로그 삭제
- **F14-01 / F14-02**: opt-in / opt-out 토글은 같은 엔드포인트 재사용
- **Unit 03 event 갱신 (호스트 분기)**: `PATCH /api/v1/events/{eventId}` + `EventModParam(locationShareEnabled)`를 재사용한다. `EventService.updateEvent`는 DRAFT만 허용하므로 운영 중 토글 계약으로는 성립하지 않는다.
- **외부**: 없음

## 5. 프론트 계약

### 진입 경로

- `EventLocationScreen` (SCR-LD-001) AppBar 우측 톱니바퀴 → `context.push('/home/events/$eventId/location/privacy')`
- (간접) 이벤트 설정 메뉴/딥링크에서 같은 라우트로 push 가능

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/home/events/:eventId/location/privacy` | `location/screens/location_privacy_screen.dart` | SCR-LD-003 — 이벤트별 위치 공유 토글 + 안내 |

라우트 상수: `Routes.eventLocationPrivacy = 'privacy'` (`/events/:eventId/location` 의 자식 중첩 라우트, `routes.dart:26`).

### 화면별 구성 요소 & 액션

### 위치 프라이버시 (`location_privacy_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar` 제목 "위치 프라이버시", 뒤로가기, 가이드 도움말
  - 이벤트 카드 (`_EventLocationCard`)
    - 이벤트 제목 (`event.title`, body1Medium w600)
    - 시작 시각 `yyyy.MM.dd (E)` 한국어 로케일 (`DateFormat('yyyy.MM.dd (E)', 'ko')`)
    - Switch + 상태 텍스트: 호스트는 `locationShareEnabled`, 참석자는 `locationShareEnabled && userOptedIn`을 기준으로 표시
    - 호스트인 경우 "호스트로서 이벤트의 위치 공유를 관리합니다" 보조 텍스트
    - 처리 중 Switch 자리에 `CircularProgressIndicator(strokeWidth: 2)`
  - 결과 프리뷰 카드: 호스트의 이벤트 허용 범위 또는 참석자의 내 참여 상태, 공유 시간, 접근 기록 의미
  - 안내 박스(`AppColors.linkBlue50`): 업데이트 시작 2시간 전~종료 2시간 후, 참석자 열람 시작 24시간 전, ATTENDING 한정, 중단 효과, 접근 기록 30일
  - 접근 기록 섹션:
    - 데이터 있음: 이벤트 제목 아래 `"사용자 #{userId}"`와 `MM.dd HH:mm` 목록
    - 없음: `"위치 접근 기록이 없습니다"` / `"최근 30일 동안 내 위치를 조회한 기록이 없어요."`
    - 로딩·에러: 전용 로딩 상태와 재시도
    - `totalAccesses`와 목록은 raw log 행 수다. 같은 사람이 위치 화면을 5분 열어 30초 GET이 계속되면 같은 대상에 약 10개 행이 생길 수 있다.
- **사용자가 할 수 있는 액션**:
  - 호스트 + Switch 토글 → `_toggleEventLocationShare(value)` → 범용 `eventRepository.updateEvent`; DRAFT만 성공
  - 일반 참석자 + Switch 토글 →
    - On: `EventLocationNotifier.optIn()` → POST `/opt-in`. 이 화면에서는 GPS/update/timer를 연결하지 않는다.
    - Off: `EventLocationNotifier.optOut()` → POST `/opt-out` (다이얼로그 없이 즉시 호출 — 이 화면 한정)
- **상태 분기**:
  - `eventDetailNotifierProvider(eventId)` 의 AsyncValue:
    - loading: `CircularProgressIndicator` 중앙
    - error: `AppErrorState.fromError(error: ..., onRetry: invalidate(eventDetailNotifierProvider))`
    - data: 위 카드 + 안내 박스
  - 토글 처리 중 `_toggling` 가드로 더블 탭 방지
  - 호스트 토글 성공 시 event detail과 privacy provider를 모두 invalidate
  - 참석자 토글 성공 시 privacy provider를 invalidate해 서버의 `userOptedIn`을 재조회
  - 호스트 토글 실패는 throw 후 `showApiErrorToast`를 표시한다.
  - 참석자 `EventLocationNotifier.optIn/optOut`은 실패를 `false`로 변환하고 `_toggleOptIn`은 false 분기 안내가 없어 조용히 끝날 수 있다.

> 현재 화면은 라우트의 한 이벤트만 다루며, 서버 응답도 해당 `eventId`로 필터링된다. UI/UX 스펙의 다중 이벤트 일괄 대시보드는 구현되지 않았지만, 이벤트별 접근 기록 조회·빈 상태·재시도는 실제 연결되어 있다.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 → 이벤트 상세와 `locationPrivacyProvider(eventId)`를 병렬 조회
2. privacy provider → `EventLocationRepository.getPrivacyDashboard` → `GET /api/v1/events/{eventId}/location/privacy`
3. (호스트) DRAFT 이벤트 수정 성공 → event detail + privacy provider invalidate. OPEN/진행은 `INVALID_EVENT_STATUS`와 오류 토스트.
4. (참석자) opt-in/out 성공 → privacy provider invalidate

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 단일 이벤트 컨텍스트로만 진입 (라우트가 `/events/:eventId/location/privacy`)
- 안내 박스 색상: 배경 `AppColors.linkBlue50`, 헤더 `AppColors.linkBlue`, 본문 `AppSemanticColors.textSecondary`
- 안내 문구는 실제 서버 시간창·보관 계약을 반영: 업데이트 시작 -2h~종료 +2h, 참석자 조회 시작 -24h, ATTENDING 한정, opt-out 후 미노출, 접근 기록 30일
- 날짜 포맷: `yyyy.MM.dd (E)` ko 로케일
- 호스트 vs 참석자 분기: 토글이 작동하는 백엔드 엔드포인트 자체가 다름 (이벤트 PATCH vs opt-in/out)
- 토스트 문구:
  - 호스트 활성: "위치 공유가 활성화되었습니다"
  - 호스트 비활성: "위치 공유가 비활성화되었습니다"
  - 참석자 On: "위치 공유에 참여했습니다"
  - 참석자 Off: "위치 공유를 중단했습니다"
  - 실패: "위치 공유 설정에 실패했습니다"
- 토글 처리 중 인디케이터 사이즈: 20×20 strokeWidth 2
- Switch active 색: `AppColors.primary500` (트랙 50% alpha)
- 참석자 Off 시 본 화면은 SCR-LD-001 과 달리 **확인 다이얼로그 없이** 즉시 호출
- 접근 기록은 빈 상태·로딩·에러·재시도 UI를 제공하되, 접근자 표시가 닉네임이 아닌 raw `"사용자 #id"`다.
- 접근 횟수는 위치 목록 GET의 raw hit 수이며 고유 접근자 수나 의도적 열람 횟수가 아니다.
- (UI/UX 스펙과의 갭) 여러 이벤트 카드 일괄 목록은 현 구현 미반영
- (배선 Gap) AppBar 도움말 `guideId`가 위치 기능이 아닌 `F12-01`로 지정되어 있다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 톱니바퀴를 눌러 진입한 일반 참석자가 토글을 끈다 (Happy Path) | opt-in true, `EventLocationScreen` 위치 화면 사용 중 | 서버 `optedIn=false`·현재 좌표 삭제, privacy 재조회에서 `userOptedIn=false` |
| S2 | 운영 중 호스트가 위치 공유 자체를 비활성화 시도 | OPEN/진행 이벤트 호스트 | 범용 PATCH가 `INVALID_EVENT_STATUS`로 실패하고 서버 값은 유지되며 호스트에게 오류 토스트 표시 |
| S3 | 처리 중 스피너 표시 (UX 디테일) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 이벤트 조회 실패 (에러 분기) | 시나리오 본문 참조 | 카드 미렌더, 안내 박스도 미노출 |
| S5 | 토글 실패 — API 에러 | 호스트 또는 일반 참석자 | 서버 변화 없음. 호스트는 오류 토스트, 참석자는 notifier가 false를 반환해 별도 안내 없이 끝날 수 있음 |
| S6 | 최근 30일 이벤트별 접근 기록 확인 | 타 참석자의 위치 화면 30초 GET에 내 share가 반복 포함됨 | 해당 이벤트의 raw 로그 행 수와 `"사용자 #id"`·시각이 모두 표시된다. 같은 접근자가 반복될 수 있고 다른 이벤트 기록은 포함되지 않음 |
| S7 | 접근 기록 없음 | 최근 30일 해당 이벤트 로그 0건 | 전용 빈 상태가 표시됨 |
| S8 | 프라이버시 화면에서 토글 On | opt-out으로 share row가 삭제된 일반 참석자 | `userOptedIn=true`로 바뀌지만 GPS 취득/update/timer가 없어 실제 좌표 share는 생성되지 않음 |

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
| 사실 | `LocationPrivacyService#getPrivacyDashboard(userId,eventId)` | 응답은 현재 이벤트에서 내 위치가 목록 응답에 포함될 때 쌓인 최근 30일 raw 로그이며, 다중 이벤트 목록 API가 아니다. | "고유 열람자/의도적 조회"로 해석하지 않도록 표시 |
| Gap | `location_privacy_screen.dart` | UI/UX 스펙의 여러 이벤트 일괄 카드 목록은 없고 단일 이벤트만 제공한다. | 다중 이벤트 허브 필요 여부 결정 |
| Gap | `location_privacy_screen.dart` | 접근자를 닉네임/프로필 없이 raw 사용자 ID로 표시하고 AppBar 도움말이 잘못된 `F12-01`을 가리킨다. | 사용자 식별 VO 확장 및 guideId 교정 |
| P0 Gap | `_toggleEventLocationShare` → `EventService.updateEvent` | 화면은 운영 중 호스트 제어처럼 보이지만 범용 PATCH는 DRAFT-only다. OPEN/진행 이벤트에서는 토글이 항상 실패한다. | 운영 상태에서도 허용하는 전용 locationShareEnabled endpoint 또는 이벤트 수정 정책 분리 |
| P1 Gap | `_toggleOptIn` / `EventLocationNotifier` | 참석자 opt-in/out 실패가 false로 축약되고 UI에 false 실패 안내 분기가 없다. | 실패 원인을 보존하고 명시적 toast/상태 rollback |
| P1 Gap | `_toggleOptIn(true)` | 프라이버시 화면은 opt-in만 저장하고 GPS 취득·첫 update·타이머를 시작하지 않는다. opt-out으로 share가 삭제된 뒤 토글을 다시 켜도 좌표는 보이지 않는다. | 실제 share 생성까지 연결하거나 동의/좌표 상태를 분리 표시 |
| 분석 한계 | `LocationAccessLog` 생성부 | 30초 자동 GET마다 대상별 행을 추가하고 dedupe하지 않아 `totalAccesses`가 고유 사용자나 의도적 조회 수처럼 보일 수 있다. | 고유 접근자 집계/세션 집계 또는 raw polling hit라는 UI 설명 |
| 후보 | scenarios.md:64 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P64 매트릭스 mode=privacy_dashboard) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 톱니바퀴를 눌러 진입한 일반 참석자가 토글을 끈다 (Happy Path)**: Given opt-in true, `EventLocationScreen` 위치 화면 사용 중 When 사용자가 토글을 끄면 Then 서버 `optedIn=false`·현재 좌표 삭제 후 privacy 응답의 `userOptedIn=false`로 화면이 동기화된다
- **AC-02. 운영 중 호스트 토글의 현재 결과**: Given OPEN/진행 이벤트 호스트가 위치 공유 토글을 누를 때 When 범용 PATCH를 호출하면 Then `INVALID_EVENT_STATUS`로 실패하고 `location_share_enabled`는 바뀌지 않으며 호스트 오류 토스트가 표시된다
- **AC-03. 처리 중 스피너 표시 (UX 디테일)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 이벤트 조회 실패 (에러 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 카드 미렌더, 안내 박스도 미노출
- **AC-05. 토글 실패 — API 에러**: Given 토글 API가 실패할 때 When 호스트 분기이면 Then 오류 토스트를 표시한다. 일반 참석자 분기이면 현재 false 반환을 소비하지 않아 별도 실패 토스트가 없을 수 있다
- **AC-06. 최근 30일 이벤트별 접근 기록 확인**: Given 해당 이벤트의 위치 목록 GET에 내 share가 반복 포함됐을 때 When 화면에 진입하면 Then 해당 이벤트의 raw 로그 행 수·접근자 ID·시각을 중복 포함해 표시하고 다른 이벤트 기록은 포함하지 않는다
- **AC-07. 접근 기록 없음**: Given 최근 30일 해당 이벤트의 접근 로그가 없을 때 When 화면에 진입하면 Then `"위치 접근 기록이 없습니다"` 빈 상태를 표시한다
- **AC-08. 프라이버시 화면에서 토글 On**: Given share row가 없는 일반 참석자 When 프라이버시 화면에서 opt-in이 성공하면 Then `userOptedIn=true`만 반영되고 위치 화면에서 `POST /update`하기 전까지 실제 좌표는 노출되지 않는다

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
