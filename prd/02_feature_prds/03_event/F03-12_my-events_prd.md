# F03-12. 내 이벤트 관리 & 참석 로그 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-12_my-events -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-12_my-events`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 자신과 관련된 이벤트를 한 데 모아 보는 기능. 두 가지 시점이 결합됨:
- **참가자 시점**: 내가 신청한 이벤트 (`Application` 기준) → "참석 예정" 탭 (APPROVED + 미래)
- **호스트 시점**: 내가 주최하는 이벤트 (`Event.hostUserId == 본인`) → "주최 중" / "지난 이벤트" 탭

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **내 이벤트**: 프로필 탭 → "내 이벤트" → `/profile/my-events`
- **참석 로그** (호스트 시점): 이벤트 상세 또는 참석자 목록(F03-07) 의 우상단 "로그 >" → `/home/events/:eventId/log`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-12_my-events/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-12_my-events/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-12_my-events/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-12_my-events/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:82` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:181` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:82` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 내 이벤트 (`my_events_screen.dart`)

- **AppBar 제목**: "내 이벤트", `TabBar` 3개 탭: "참석 예정" / "주최 중" / "지난 이벤트"
- `DefaultTabController(length: 3)` + `TabBarView` — 각 탭 콘텐츠는 `MyEventsTabView(tabIndex: 0|1|2)`

#### 탭 0: "참석 예정" (`_UpcomingTab`)

- **데이터**: `upcomingEventsNotifierProvider` ▶ `eventRepository.getMyApplications()` ▶ `GET /api/v1/events/users/me/applications`
- 클라이언트 측 필터: `status == APPROVED` 만
- 카드: `EventCard` — 제목/썸네일/시작시간/주소/`_ApplicationBadge(status)` (APPROVED 표시)
- 이벤트 status (`eventStatus`) 가 CLOSED / CANCELED 면 `EventCardVariant.disabled` + statusLabel 노출
- 빈 상태: `_EmptyMessage(message: '참석 예정인 이벤트가 없습니다', actionLabel: '이벤트 탐색')`
- 풀투리프레시 활성

#### 탭 1: "주최 중" (`_HostingTab`)

- **데이터**: `hostingEventsNotifierProvider` ▶ `eventRepository.getMyEvents(status: 'DRAFT,OPEN', page, size: 20)` ▶ `GET /api/v1/events/my?page=N&size=20` (`status` 쿼리는 서버 미사용, 클라이언트가 status 분류 의도 표시 — 백엔드는 모두 hostUserId 기반 조회)
- 무한 스크롤 (`loadMore`), 페이지 사이즈 20
- 카드: 정원/현재인원/가격 표시 + DRAFT 인 경우 회색 "임시저장" 뱃지
- 빈 상태: "주최 중인 이벤트가 없습니다" + "이벤트 생성" 안내

#### 탭 2: "지난 이벤트" (`_PastTab`)

- **데이터**: `pastEventsNotifierProvider` ▶ `getMyEvents(status: 'CLOSED,CANCELED', ...)` 동일 엔드포인트
- 카드는 항상 `EventCardVariant.disabled` + statusLabel
- 무한 스크롤
- 빈 상태: "지난 이벤트가 없습니다"

### 참석 로그 (`attendance_log_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "참석 로그"
  - 시간순 세로 타임라인 (최신 상단)
  - 날짜별 `DateDivider` 자동 삽입 (이전 항목과 다른 날짜인 경우)
  - 각 노드: `TimelineNode(logType, message: logType.label, userNickname, createdAt, isFirst, isLast)`
  - 빈 상태: `AppEmptyState(title: '아직 참석 기록이 없습니다')`
- **사용자가 할 수 있는 액션**:
  - 무한 스크롤 — `position.maxScrollExtent - 200` 도달 시 `attendanceLogNotifier.loadMore()`
  - 풀투리프레시 → `refresh()`
- **타임라인 이벤트 유형 매핑** (`AttendanceLogType` enum + `.label`):
  - `APPLIED_ATTENDING` → "참석 신청" (positive)
  - `APPLIED_WAITING` → "대기열 등록" (neutral)
  - `CANCELLED_BY_USER` → "참석 취소" (negative)
  - `PROMOTED_AUTO` → "자동 승격" (positive)
  - `PROMOTED_CAPACITY_INCREASE` → "정원 확대 승격" (positive)
  - `PROMOTED_MANUAL` → "수동 승격" (system)
  - `REJECTED_BY_HOST` → "신청 거절" (negative)
  - `WAITLIST_ORDER_CHANGED` → 순번 변경 (neutral)
  - `REMOVED_BY_HOST` → "강제 제거" (negative)
- **상태 분기**: 로딩 / 에러(`AppErrorState`) / 빈 상태 / 데이터

## 4. 서버 계약

### 개요

사용자가 자신과 관련된 이벤트를 한 데 모아 보는 기능. 두 가지 시점이 결합됨:
- **참가자 시점**: 내가 신청한 이벤트 (`Application` 기준) → "참석 예정" 탭 (APPROVED + 미래)
- **호스트 시점**: 내가 주최하는 이벤트 (`Event.hostUserId == 본인`) → "주최 중" / "지난 이벤트" 탭

또한 같은 단위 안에 **참석 변경 로그**(F03-07 의 호스트용 로그 화면) 가 묶여 있다 — UX 상 호스트 본인의 이벤트 운영 흐름 파악과 묶어서 표시되기 때문.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/my` | `EventController#listMyEvents` | 인증 | 내가 호스트인 이벤트 페이지 (PagingParam) |
| GET | `/api/v1/events/users/me/applications` | `EventController#getMyApplications` | 인증 | 내 신청 목록 (List, 페이지네이션 없음) |
| GET | `/api/v1/events/{eventId}/capacity/logs` | `CapacityController#getLogs` | 호스트/공동호스트 | 참석 변경 로그 페이지 (F03-07 backend 도 참조) |
| GET | `/api/v1/events/{eventId}/attendance/logs` | `AttendanceController#getLogs` | 같음 | 동일 (플랜 호환 경로) |

> **주의**: `EventController#listMyEvents` 시그니처는 `@ModelAttribute PagingParam pagingParam` 만 받음. UI 스펙 문서의 `?status=DRAFT,OPEN` 쿼리는 Flutter 측에서 보내고는 있으나 컨트롤러가 PagingParam (`page`/`size`) 만 처리하므로 status 파라미터는 서버에서 무시됨 — 실제 status 필터는 **클라이언트 사이드** 또는 EventService 의 listMyEvents 내부 로직에 의존.

### 의존 단위 / 외부 시스템

- **F03-05 신청 & 참석** — `Application` 도메인 소유. 본 단위는 GET 만, 신청 생성은 F03-05.
- **F03-06 신청서 승인/거절** — Application status 전이를 만드는 곳, 본 단위는 결과(APPROVED/REJECTED)를 표시.
- **F03-03 ~ 04 이벤트 생성/생명주기** — `Event.status` 전이가 "주최 중" / "지난 이벤트" 분류의 기준.
- **F03-07 정원/대기열** — 참석 로그 화면 (`AttendanceLogVo`) 데이터 소스. 본 단위 frontend 가 같은 화면을 재사용.
- 외부: 없음

## 5. 프론트 계약

### 진입 경로

- **내 이벤트**: 프로필 탭 → "내 이벤트" → `/profile/my-events`
- **참석 로그** (호스트 시점): 이벤트 상세 또는 참석자 목록(F03-07) 의 우상단 "로그 >" → `/home/events/:eventId/log`

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/profile/my-events` | `presentation/event/screens/my_events_screen.dart` | 3-탭 (참석 예정 / 주최 중 / 지난 이벤트) |
| `/home/events/:eventId/log` | `presentation/event/screens/attendance_log_screen.dart` | 참석 변경 타임라인 (호스트용) |

위젯:
- `presentation/event/widgets/my_events_tab_view.dart` — 탭별 데이터 fetch + 카드 리스트
- `presentation/event/widgets/timeline_node.dart` — 타임라인 한 노드 (아이콘 + 텍스트 + 시간)
- `presentation/event/widgets/date_divider.dart` — 날짜별 구분선
- `presentation/common/widgets/event_card.dart` — 공통 카드

### 화면별 구성 요소 & 액션

### 내 이벤트 (`my_events_screen.dart`)

- **AppBar 제목**: "내 이벤트", `TabBar` 3개 탭: "참석 예정" / "주최 중" / "지난 이벤트"
- `DefaultTabController(length: 3)` + `TabBarView` — 각 탭 콘텐츠는 `MyEventsTabView(tabIndex: 0|1|2)`

#### 탭 0: "참석 예정" (`_UpcomingTab`)

- **데이터**: `upcomingEventsNotifierProvider` ▶ `eventRepository.getMyApplications()` ▶ `GET /api/v1/events/users/me/applications`
- 클라이언트 측 필터: `status == APPROVED` 만
- 카드: `EventCard` — 제목/썸네일/시작시간/주소/`_ApplicationBadge(status)` (APPROVED 표시)
- 이벤트 status (`eventStatus`) 가 CLOSED / CANCELED 면 `EventCardVariant.disabled` + statusLabel 노출
- 빈 상태: `_EmptyMessage(message: '참석 예정인 이벤트가 없습니다', actionLabel: '이벤트 탐색')`
- 풀투리프레시 활성

#### 탭 1: "주최 중" (`_HostingTab`)

- **데이터**: `hostingEventsNotifierProvider` ▶ `eventRepository.getMyEvents(status: 'DRAFT,OPEN', page, size: 20)` ▶ `GET /api/v1/events/my?page=N&size=20` (`status` 쿼리는 서버 미사용, 클라이언트가 status 분류 의도 표시 — 백엔드는 모두 hostUserId 기반 조회)
- 무한 스크롤 (`loadMore`), 페이지 사이즈 20
- 카드: 정원/현재인원/가격 표시 + DRAFT 인 경우 회색 "임시저장" 뱃지
- 빈 상태: "주최 중인 이벤트가 없습니다" + "이벤트 생성" 안내

#### 탭 2: "지난 이벤트" (`_PastTab`)

- **데이터**: `pastEventsNotifierProvider` ▶ `getMyEvents(status: 'CLOSED,CANCELED', ...)` 동일 엔드포인트
- 카드는 항상 `EventCardVariant.disabled` + statusLabel
- 무한 스크롤
- 빈 상태: "지난 이벤트가 없습니다"

### 참석 로그 (`attendance_log_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "참석 로그"
  - 시간순 세로 타임라인 (최신 상단)
  - 날짜별 `DateDivider` 자동 삽입 (이전 항목과 다른 날짜인 경우)
  - 각 노드: `TimelineNode(logType, message: logType.label, userNickname, createdAt, isFirst, isLast)`
  - 빈 상태: `AppEmptyState(title: '아직 참석 기록이 없습니다')`
- **사용자가 할 수 있는 액션**:
  - 무한 스크롤 — `position.maxScrollExtent - 200` 도달 시 `attendanceLogNotifier.loadMore()`
  - 풀투리프레시 → `refresh()`
- **타임라인 이벤트 유형 매핑** (`AttendanceLogType` enum + `.label`):
  - `APPLIED_ATTENDING` → "참석 신청" (positive)
  - `APPLIED_WAITING` → "대기열 등록" (neutral)
  - `CANCELLED_BY_USER` → "참석 취소" (negative)
  - `PROMOTED_AUTO` → "자동 승격" (positive)
  - `PROMOTED_CAPACITY_INCREASE` → "정원 확대 승격" (positive)
  - `PROMOTED_MANUAL` → "수동 승격" (system)
  - `REJECTED_BY_HOST` → "신청 거절" (negative)
  - `WAITLIST_ORDER_CHANGED` → 순번 변경 (neutral)
  - `REMOVED_BY_HOST` → "강제 제거" (negative)
- **상태 분기**: 로딩 / 에러(`AppErrorState`) / 빈 상태 / 데이터

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 참가자가 "참석 예정" 확인 | APPROVED 상태 신청 3건, REJECTED 1건, PENDING 1건 | 사용자가 일정 확인 완료 |
| S2 | 호스트가 "주최 중" 탭에서 임시저장 이벤트 발견 | 어제 폼 작성하다 임시저장한 호스트, DRAFT 1건 + OPEN 2건 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 호스트가 "지난 이벤트" 회고 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 호스트가 자기 이벤트의 참석 로그 검토 | 종료된 이벤트, 신청/취소/체크인 로그 50건 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 무한 스크롤 마지막 페이지 도달 | 로그 50건, 페이지 0 (20건) 로드됨 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 종료/취소 카드 시각화 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 참석 예정 0건일 때 "이벤트 탐색" 안내 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 풀투리프레시로 페이지 초기화 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 호스트가 아닌 사용자가 참석 로그 URL 직접 접근 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:20 | > **주의**: `EventController#listMyEvents` 시그니처는 `@ModelAttribute PagingParam pagingParam` 만 받음. UI 스펙 문서의 `?status=DRAFT,OPEN` 쿼리는 Flutter 측에서 보내고는 있으나 컨트롤러가 PagingParam (`page`/`size`) 만 처리하므로 status 파라미터는 서버에서 무시됨 — 실제 status 필터는 **클라이언트 사이드** 또는 EventService 의 listMyEvents 내부 로직에 의존. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:34 | - `eventQueryRepository.listMyEvents(userId, pageable)` — QueryDSL 로 hostUserId == 본인 인 이벤트 페이지 (정확한 정렬 등은 Service 내부 — 서비스 구현 미확인 상세는 audit 필요) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:47 | - 본인 userId 의 모든 Application 조회 후 매핑 (서비스 구현 상세 미확인 — `ApplicationService` 본 단위 외 영역) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:89 | - **참가자 시점의 "지난 이벤트"** (참석했던 종료된 이벤트) 는 별도 미구현 — 추후 audit 가능 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:119 | Type --> P1[APPLIED_ATTENDING<br>참석 신청<br>🔵 positive 초록] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:120 | Type --> P2[PROMOTED_AUTO<br>자동 승격<br>🔵 positive 초록] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:132 | class P1,P2,P3,Sys,Neu1,Neu2 screen | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 참가자가 "참석 예정" 확인**: Given APPROVED 상태 신청 3건, REJECTED 1건, PENDING 1건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 일정 확인 완료
- **AC-02. 호스트가 "주최 중" 탭에서 임시저장 이벤트 발견**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 호스트가 "지난 이벤트" 회고**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 호스트가 자기 이벤트의 참석 로그 검토**: Given 종료된 이벤트, 신청/취소/체크인 로그 50건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 무한 스크롤 마지막 페이지 도달**: Given 로그 50건, 페이지 0 (20건) 로드됨 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 종료/취소 카드 시각화**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 참석 예정 0건일 때 "이벤트 탐색" 안내**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 풀투리프레시로 페이지 초기화**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 호스트가 아닌 사용자가 참석 로그 URL 직접 접근**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
