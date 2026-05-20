# F14-04. 위치 프라이버시 대시보드 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/14_location_directions/F14-04_location-privacy-dashboard -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/14_location_directions/F14-04_location-privacy-dashboard`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

내 위치가 지난 30일 동안 어떤 이벤트의 누구에게 노출되었는지를 집계해서 돌려주는 API. 컨트롤러 시그니처상 path 에 `eventId` 가 있지만 서비스는 `principal.getUserId()` 만 사용하여 사용자 단위 접근 이력을 반환한다 (path 변수는 무시되며, 같은 eventId 컨텍스트로 진입한 화면에서 호출하기 위한 라우팅 일관성용). 토글 자체(opt-in/opt-out) 는 별도 엔드포인트(F14-01/F14-02) 를 재사용한다.

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

1. 화면 진입 → `eventDetailNotifierProvider(eventId)` 빌드 → `GET /api/v1/events/{eventId}` (Unit 03)
2. (호스트) Switch 토글 → `eventRepositoryProvider.updateEvent(eventId, EventModParam(locationShareEnabled: bool))` → `PUT/PATCH /api/v1/events/{eventId}` (Unit 03 영역) → 성공 시 `ref.invalidate(eventDetailNotifierProvider(eventId))`
3. (참석자) Switch 토글 → `eventLocationNotifierProvider(eventId).notifier.optIn()/optOut()` → POST `/opt-in` 또는 `/opt-out` → 성공 시 로컬 `_isOptedIn` 만 갱신 (대시보드 자체는 invalidate 안 함)

> `LocationPrivacyVo` 응답 구조(`totalAccesses`, `byEvent[].accessors[]`) 는 클라이언트에 데이터 모델로 존재하지만, 현 화면은 이를 호출하지 않는다 — 백엔드는 access-log history 를 돌려주는 데 비해 현 UI 는 토글 위주로 단순화된 상태.

## 4. 서버 계약

### 개요

내 위치가 지난 30일 동안 어떤 이벤트의 누구에게 노출되었는지를 집계해서 돌려주는 API. 컨트롤러 시그니처상 path 에 `eventId` 가 있지만 서비스는 `principal.getUserId()` 만 사용하여 사용자 단위 접근 이력을 반환한다 (path 변수는 무시되며, 같은 eventId 컨텍스트로 진입한 화면에서 호출하기 위한 라우팅 일관성용). 토글 자체(opt-in/opt-out) 는 별도 엔드포인트(F14-01/F14-02) 를 재사용한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/location/privacy | LocationController#getPrivacyDashboard | required | 지난 30일 본인 위치 접근 로그 집계 (이벤트별) |

(opt-in / opt-out 은 F14-01 / F14-02 의 엔드포인트를 그대로 호출)

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `LocationAccessLog` — F14-01 `getEventLocations` 호출 시 한 행씩 INSERT
  - `id, accessorId, targetUserId, eventId, createdAt`
- **VO** `LocationPrivacyVo`, `LocationPrivacyVo.EventAccessGroup`, `LocationPrivacyVo.AccessorInfo`
- **Enum**: 본 기능 전용 enum 없음

### 의존 단위 / 외부 시스템

- **Unit 03 (event)**: `EventRepository#findById` (제목 lookup, deleted/없는 이벤트 fallback "삭제된 이벤트")
- **F14-01 (같은 단위)**: `LocationAccessLog` 가 본 대시보드의 데이터 원천
- **F14-01 / F14-02**: opt-in / opt-out 토글은 같은 엔드포인트 재사용
- **Unit 03 event 갱신 (호스트 분기)**: 호스트가 본 화면에서 `Event.locationShareEnabled` 토글하려면 `PUT /api/v1/events/{eventId}` (event 도메인) 호출 — 본 단위 외부 의존
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
  - `CommunityAppBar` 제목 "위치 프라이버시", 뒤로가기
  - 이벤트 카드 (`_EventLocationCard`)
    - 이벤트 제목 (`event.title`, body1Medium w600)
    - 시작 시각 `yyyy.MM.dd (E)` 한국어 로케일 (`DateFormat('yyyy.MM.dd (E)', 'ko')`)
    - Switch + 상태 텍스트
      - 호스트: `event.locationShareEnabled` 기반 "위치 공유 중" / "위치 비공개"
      - 일반 참석자: `_isOptedIn` 기반 동일 라벨
    - 호스트인 경우 "호스트로서 이벤트의 위치 공유를 관리합니다" 보조 텍스트
    - 처리 중 Switch 자리에 `CircularProgressIndicator(strokeWidth: 2)`
  - 안내 박스 (`Color(0xFFF0F4FF)` 연한 파랑 배경, `AppColors.linkBlue` 헤더)
    - 헤더: "ℹ️ 위치 공유 안내"
    - 불릿 3개:
      - · 이벤트 시작 1시간 전부터 종료까지 공유
      - · 참석 확정자에게만 위치 공유
      - · 이벤트 종료 후 위치 데이터 즉시 삭제
- **사용자가 할 수 있는 액션**:
  - 호스트 + Switch 토글 → `_toggleEventLocationShare(value)` → `eventRepository.updateEvent(eventId, EventModParam(locationShareEnabled: value))`
  - 일반 참석자 + Switch 토글 →
    - On: `EventLocationNotifier.optIn()` → POST `/opt-in`
    - Off: `EventLocationNotifier.optOut()` → POST `/opt-out` (다이얼로그 없이 즉시 호출 — 이 화면 한정)
- **상태 분기**:
  - `eventDetailNotifierProvider(eventId)` 의 AsyncValue:
    - loading: `CircularProgressIndicator` 중앙
    - error: `AppErrorState.fromError(error: ..., onRetry: invalidate(eventDetailNotifierProvider))`
    - data: 위 카드 + 안내 박스
  - 토글 처리 중 `_toggling` 가드로 더블 탭 방지
  - 호스트 토글 성공 시 `ref.invalidate(eventDetailNotifierProvider(eventId))` 로 카드 재빌드
  - 토글 실패 시 `showApiErrorToast(context, error, fallback: '위치 공유 설정에 실패했습니다')`

> 메모: UI/UX 스펙 SCR-LD-003 은 "위치 공유 이벤트 카드 **리스트**"(여러 이벤트 한 화면)를 보여 주도록 그려져 있으나, 현 구현은 단일 이벤트 카드만 노출한다. `LocationPrivacyVo` (지난 30일 access-log 집계) 는 본 화면에서 **현재 호출되고 있지 않다**. (참고: `LocationPrivacyNotifier` 파일은 실제로는 존재하지 않는다 — Round1 표기 정정. `LocationPrivacyVo` 모델만 단독으로 존재.)
>
> **보존 결정 (Codex Round3 후속, 분기 B = 의도된 기능 / 미연결)**:
> - `location_privacy_vo.dart` 와 `location_privacy_screen.dart` 는 **그대로 보존한다**. 화면은 라우터(`Routes.eventLocationPrivacy = 'privacy'`)에 등록되어 있고 `EventLocationScreen` AppBar 톱니바퀴(`event_location_screen.dart:264`) 에서 실제 push 진입 경로가 살아 있으므로 dead code 가 아니다.
> - VO 는 화면이 호출하지 않지만 서버 엔드포인트(`GET /api/v1/events/{eventId}/location/privacy` → `LocationPrivacyVo`) 가 정상 운영 중이며, 향후 화면을 "다중 이벤트 카드 + access-log history" 로 확장할 때 직접 사용하도록 보존한다.
> - Codex Round3 가 보고한 빌드 오류는 **stale `event_location_api.g.dart` 잔여** 가 원인 (원본 `event_location_api.dart` 에는 `getPrivacyDashboard` 선언이 이미 제거됨). `dart run build_runner build --delete-conflicting-outputs` 재생성으로 해결되며, VO/화면 삭제로 대응할 사안이 아니다.
> - 결정 근거 영구 기록: `business_logic/verification/location_privacy_decision.md`.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 → `eventDetailNotifierProvider(eventId)` 빌드 → `GET /api/v1/events/{eventId}` (Unit 03)
2. (호스트) Switch 토글 → `eventRepositoryProvider.updateEvent(eventId, EventModParam(locationShareEnabled: bool))` → `PUT/PATCH /api/v1/events/{eventId}` (Unit 03 영역) → 성공 시 `ref.invalidate(eventDetailNotifierProvider(eventId))`
3. (참석자) Switch 토글 → `eventLocationNotifierProvider(eventId).notifier.optIn()/optOut()` → POST `/opt-in` 또는 `/opt-out` → 성공 시 로컬 `_isOptedIn` 만 갱신 (대시보드 자체는 invalidate 안 함)

> `LocationPrivacyVo` 응답 구조(`totalAccesses`, `byEvent[].accessors[]`) 는 클라이언트에 데이터 모델로 존재하지만, 현 화면은 이를 호출하지 않는다 — 백엔드는 access-log history 를 돌려주는 데 비해 현 UI 는 토글 위주로 단순화된 상태.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 단일 이벤트 컨텍스트로만 진입 (라우트가 `/events/:eventId/location/privacy`)
- 안내 박스 색상: 배경 `#F0F4FF`, 헤더 `AppColors.linkBlue`, 본문 `AppSemanticColors.textSecondary`
- 안내 문구 3개 (정확한 워딩):
  - "이벤트 시작 1시간 전부터 종료까지 공유"
  - "참석 확정자에게만 위치 공유"
  - "이벤트 종료 후 위치 데이터 즉시 삭제"
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
- 빈 상태/리스트 UI 없음 (단일 이벤트만 다룸)
- (UI/UX 스펙과의 갭) 여러 이벤트 카드 리스트, 활성 시간 외 dim 처리, "이벤트 종료된 항목 자동 제거" 는 현 구현 미반영

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 톱니바퀴를 눌러 진입한 일반 참석자가 토글을 끈다 (Happy Path) | opt-in true, `EventLocationScreen` 위치 화면 사용 중 | 서버 `optedIn=false`, 화면 로컬 `_isOptedIn=false` |
| S2 | 호스트가 본인 이벤트의 위치 공유 자체를 비활성화 (호스트 분기) | 야외 이벤트를 진행 중인 호스트 | - 서버 `event.location_share_enabled = false` |
| S3 | 처리 중 스피너 표시 (UX 디테일) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 이벤트 조회 실패 (에러 분기) | 시나리오 본문 참조 | 카드 미렌더, 안내 박스도 미노출 |
| S5 | 토글 실패 — API 에러 (네트워크 분기) | 시나리오 본문 참조 | 서버 변화 없음, 토글 시각 상태 그대로 |
| S6 | UI/UX 스펙과 현 구현의 갭 (한계 시나리오) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:40 | > 주의: 응답은 "내가 누구에게 보였는가" 의 access-log 기반 history 를 돌려주는 것이고, "내가 위치 공유 가능한 이벤트 목록" 을 돌려주는 것이 아니다. UI 스펙(SCR-LD-003) 의 "위치 공유 이벤트" 카드 리스트는 클라이언트가 별도로 이벤트 상세(`eventDetailNotifierProvider`) 를 결합하여 구성한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:86 | - (UI/UX 스펙과의 갭) 여러 이벤트 카드 리스트, 활성 시간 외 dim 처리, "이벤트 종료된 항목 자동 제거" 는 현 구현 미반영 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:54 | ## S6. UI/UX 스펙과 현 구현의 갭 (한계 시나리오) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:64 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P64 매트릭스 mode=privacy_dashboard) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 톱니바퀴를 눌러 진입한 일반 참석자가 토글을 끈다 (Happy Path)**: Given opt-in true, `EventLocationScreen` 위치 화면 사용 중 When 사용자가 해당 흐름을 실행하면 Then 서버 `optedIn=false`, 화면 로컬 `_isOptedIn=false`
- **AC-02. 호스트가 본인 이벤트의 위치 공유 자체를 비활성화 (호스트 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then - 서버 `event.location_share_enabled = false`
- **AC-03. 처리 중 스피너 표시 (UX 디테일)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 이벤트 조회 실패 (에러 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 카드 미렌더, 안내 박스도 미노출
- **AC-05. 토글 실패 — API 에러 (네트워크 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음, 토글 시각 상태 그대로
- **AC-06. UI/UX 스펙과 현 구현의 갭 (한계 시나리오)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
