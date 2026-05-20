# F02-05. 검색·알림 진입점 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/02_home_feed/F02-05_search-notification-entry -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/02_home_feed/F02-05_search-notification-entry`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

홈 피드 상단 `CommunityAppBar`의 검색 아이콘과 알림 아이콘은 사용자가 홈에서 빠르게 검색/알림 도메인으로 진입하기 위한 단일 진입점이다. **본 유닛이 책임지는 것은 진입점(아이콘 클릭 → 라우팅)뿐이며, 검색/알림 도메인의 실제 API는 각 유닛이 담당한다.**

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 메인 피드(SCR-HF-001)에 진입한 상태에서 상단 `CommunityAppBar`의 우측 액션 영역에 노출되는 두 개의 `IconButton` 탭

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/02_home_feed/F02-05_search-notification-entry/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/02_home_feed/F02-05_search-notification-entry/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/02_home_feed/F02-05_search-notification-entry/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/02_home_feed/F02-05_search-notification-entry/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

본 유닛 자체는 백엔드 호출을 발생시키지 않는다.

1. 사용자가 검색/알림 아이콘 탭 → `trackedAction` 콜백 → `context.go(...)`.
2. (▶ Unit 05 / Unit 12) 진입 후 각 화면이 자체 Provider로 도메인 API 호출.

## 4. 서버 계약

### 개요

홈 피드 상단 `CommunityAppBar`의 검색 아이콘과 알림 아이콘은 사용자가 홈에서 빠르게 검색/알림 도메인으로 진입하기 위한 단일 진입점이다. **본 유닛이 책임지는 것은 진입점(아이콘 클릭 → 라우팅)뿐이며, 검색/알림 도메인의 실제 API는 각 유닛이 담당한다.**

홈 피드 코드(`HomeController`, `TrendingController`)에는 검색·알림 진입에 필요한 별도 백엔드 호출이 정의되어 있지 않다.

### 엔드포인트 요약

본 기능 자체에서 발생하는 백엔드 호출은 **없다**.

| 진입점 | 타깃 라우트 | 백엔드 진입 | 위임 |
|---|---|---|---|
| AppBar 검색 아이콘 | `/search` | (검색 도메인 API) | ▶ Unit 05 (검색) |
| AppBar 알림 아이콘 | `/notifications` | (알림 도메인 API) | ▶ Unit 12 (알림) |

### 의존 단위 / 외부 시스템

- **다른 Unit으로 위임**:
  - 검색 화면 진입 후 호출되는 검색/카테고리/저장검색 API → ▶ Unit 05
  - 알림 화면 진입 후 호출되는 알림 목록/설정 API → ▶ Unit 12
- **외부 시스템**: 본 유닛에서는 없음. (알림 도메인은 FCM 등 외부 시스템과 연결되어 있으나 본 유닛 책임 외.)

## 5. 프론트 계약

### 진입 경로

- 메인 피드(SCR-HF-001)에 진입한 상태에서 상단 `CommunityAppBar`의 우측 액션 영역에 노출되는 두 개의 `IconButton` 탭

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home` | `lib/presentation/home/screens/home_feed_screen.dart` | 진입점이 노출되는 화면 (본 유닛) |
| `/search` | (▶ Unit 05 검색 화면) | SCR-SR-001 검색 |
| `/notifications` | (▶ Unit 12 알림 목록) | SCR-NT-001 알림 목록 |

### 화면별 구성 요소 & 액션

### 메인 피드 AppBar (`home_feed_screen.dart` 일부)

```dart
CommunityAppBar(
  showBackButton: false,
  centerTitle: false,
  titleWidget: Text(
    'Community',
    style: AppTypography.heading2.copyWith(color: AppColors.primary500),
  ),
  actions: [
    IconButton(
      icon: const Icon(Icons.search),
      onPressed: context.trackedAction('home.appbar.search', () {
        context.go('/search');
      }),
    ),
    IconButton(
      icon: const Icon(Icons.notifications_outlined),
      onPressed: context.trackedAction('home.appbar.notifications', () {
        context.go('/notifications');
      }),
    ),
  ],
),
```

- **사용자가 보는 것**:
  - 좌측: "Community" 텍스트 로고 (`AppTypography.heading2`, `AppColors.primary500` 그린)
  - 우측: 검색 아이콘(`Icons.search`), 알림 아이콘(`Icons.notifications_outlined`)
  - (UI/UX 스펙상 알림 아이콘에 미읽음 뱃지가 명시되어 있으나 **현재 화면 코드에서는 뱃지 위젯이 보이지 않는다 — 미확인**)
- **사용자가 할 수 있는 액션**:
  - 검색 아이콘 탭 ▶ `context.trackedAction('home.appbar.search', ...)`로 이벤트 트래킹 후 `context.go('/search')` 실행
  - 알림 아이콘 탭 ▶ 동일 패턴으로 `context.go('/notifications')`
- **상태 분기**: 본 유닛 자체에 로딩/에러 상태 없음. 진입 후 화면이 자체 로딩/에러 처리.
- **모달/시트/네비게이션**: 두 진입 모두 GoRouter `go` (모달 아님). 다른 Branch (Branch 1 검색, Branch 3 알림)로의 이동이므로 `StatefulShellRoute` 동작 상 탭 전환 의미가 될 수 있음(라우터 정책에 따라).

### API 호출 순서 (Provider/Repository 관점)

본 유닛 자체는 백엔드 호출을 발생시키지 않는다.

1. 사용자가 검색/알림 아이콘 탭 → `trackedAction` 콜백 → `context.go(...)`.
2. (▶ Unit 05 / Unit 12) 진입 후 각 화면이 자체 Provider로 도메인 API 호출.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **AppBar 레이아웃**: `centerTitle: false`로 좌측 정렬 로고, 우측 액션 두 개. `showBackButton: false`로 홈 루트에서는 뒤로가기 미노출.
- **로고 텍스트**: 하드코딩 "Community" + `AppColors.primary500` 그린 컬러. (다국어/브랜드 변경 시 토큰화 필요.)
- **트래킹 이벤트 키**:
  - 검색 탭 → `'home.appbar.search'`
  - 알림 탭 → `'home.appbar.notifications'`
  - `context.trackedAction(eventKey, callback)` 패턴(`tracked_material_widgets.dart`)을 사용해 액션 트래킹.
- **알림 뱃지 노출 여부**: UI/UX 스펙은 `unreadCount > 0`일 때 뱃지 표시를 요구하지만, 본 유닛 코드 탐색 범위에서는 뱃지 위젯이 확인되지 않음. (▶ Unit 12에서 별도 위젯/Provider 정의 또는 향후 구현 필요 가능성 — 미확인.)
- **인증 상태에 따른 분기**: 검색은 `Routes.publicRoutes`에 `/search`가 포함되어 비로그인 진입 가능. 알림은 publicRoutes에 포함되지 않음 → 비로그인 시 라우터 가드가 로그인 화면으로 redirect할 가능성(라우터 가드 정책은 본 유닛 외부).
- **뒤로가기 시 홈 보존**: `StatefulShellRoute`의 indexedStack에서 다른 Branch로 이동하므로, 사용자가 알림/검색 탭 위치에서 다시 홈 탭(Branch 0)으로 돌아오면 홈 피드의 스크롤 위치 유지(라우터 정책).
- **디자인 토큰**: 아이콘은 Material 기본 크기, 액션 영역은 `CommunityAppBar`의 기본 패딩 사용.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 홈에서 검색 진입 | SCR-HF-001 진입 완료, 정상 렌더. | 사용자가 검색 화면에 진입. 홈 피드 상태는 보존(`StatefulShellRoute` indexedStack). |
| S2 | (Happy Path) 홈에서 알림 진입 | SCR-HF-001 진입 완료. | 사용자가 알림 목록 화면에 진입. |
| S3 | (백버튼 / 탭 전환) 홈으로 복귀 | 알림 목록에서 머물던 사용자. | 홈 피드 상태 복구. 추가 API 호출 없음. |
| S4 | (비로그인 알림 탭) 게스트가 알림 아이콘 탭 | `AuthState.unauthenticated`. 홈은 publicRoute로 진입 가능. | 게스트는 로그인 흐름으로 유도. |
| S5 | (알림 미읽음 뱃지 — 미확인 영역) | 푸시 알림이 누적되어 서버상 unreadCount=5. | 사용자가 알림 목록 화면에서 미읽음 알림 확인. (▶ Unit 12에서 뱃지 위젯·Provider 추가 여부 확인 필요.) |
| S6 | (트래킹 이벤트 검증) | QA 또는 BI 분석가. | 사용자 행동 패턴 측정 가능. |

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
| 후보 | backend.md:22 | - 미읽음 뱃지 갱신을 위한 폴링/푸시 수신·반영 로직은 알림 도메인(▶ Unit 12)에 있을 것으로 추정. 본 유닛에서는 미확인으로 표기. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:47 | - (UI/UX 스펙상 알림 아이콘에 미읽음 뱃지가 명시되어 있으나 **현재 화면 코드에서는 뱃지 위젯이 보이지 않는다 — 미확인**) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:69 | - **알림 뱃지 노출 여부**: UI/UX 스펙은 `unreadCount > 0`일 때 뱃지 표시를 요구하지만, 본 유닛 코드 탐색 범위에서는 뱃지 위젯이 확인되지 않음. (▶ Unit 12에서 별도 위젯/Provider 정의 또는 향후 구현 필요 가능성 — 미확인.) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:56 | ## S5. (알림 미읽음 뱃지 — 미확인 영역) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:60 | **시퀀스(현재 코드 기준)**: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:61 | 1. SCR-HF-001 AppBar에 미읽음 뱃지가 그려져야 한다는 UI/UX 요구가 있으나, 현재 `home_feed_screen.dart`에는 뱃지 노출 위젯이 보이지 않음(미확인). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:75 | ## 4. 미읽음 뱃지 노출 (UI/UX 스펙 vs 현재 코드) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:79 | Spec[🟡 UI/UX 스펙: NotificationIcon에<br/>unreadCount 뱃지 노출 요구] --> Q{🟡 현재 코드?} | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:80 | Q -->\|home_feed_screen.dart\| Now[🔵 단순 IconButton만 노출<br/>뱃지 위젯 없음 - 미확인] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:81 | Q -->\|향후 보강\| Future[🔵 Badge widget + unreadCountProvider<br/>▶ Unit 12에서 정의 가능성] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 홈에서 검색 진입**: Given SCR-HF-001 진입 완료, 정상 렌더. When 사용자가 해당 흐름을 실행하면 Then 사용자가 검색 화면에 진입. 홈 피드 상태는 보존(`StatefulShellRoute` indexedStack).
- **AC-02. (Happy Path) 홈에서 알림 진입**: Given SCR-HF-001 진입 완료. When 사용자가 해당 흐름을 실행하면 Then 사용자가 알림 목록 화면에 진입.
- **AC-03. (백버튼 / 탭 전환) 홈으로 복귀**: Given 알림 목록에서 머물던 사용자. When 사용자가 해당 흐름을 실행하면 Then 홈 피드 상태 복구. 추가 API 호출 없음.
- **AC-04. (비로그인 알림 탭) 게스트가 알림 아이콘 탭**: Given `AuthState.unauthenticated`. 홈은 publicRoute로 진입 가능. When 사용자가 해당 흐름을 실행하면 Then 게스트는 로그인 흐름으로 유도.
- **AC-05. (알림 미읽음 뱃지 — 미확인 영역)**: Given 푸시 알림이 누적되어 서버상 unreadCount=5. When 사용자가 해당 흐름을 실행하면 Then 사용자가 알림 목록 화면에서 미읽음 알림 확인. (▶ Unit 12에서 뱃지 위젯·Provider 추가 여부 확인 필요.)
- **AC-06. (트래킹 이벤트 검증)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 행동 패턴 측정 가능.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
