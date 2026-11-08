# F03-12. 내 이벤트 관리 & 참석 로그 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 자신과 관련된 이벤트를 한 데 모아 보는 기능. 두 가지 시점이 결합됨:
- **참가자 시점**: 내가 신청한 이벤트 (`Application` 기준) → "참석 예정" 탭 (APPROVED + 미래)
- **호스트 시점**: 내가 주최하는 이벤트 (`Event.hostUserId == 본인`) → "주최 중" / "지난 이벤트" 탭

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **내 이벤트**: 프로필 탭 → "내 이벤트" → `/profile/my-events`
- **참석 로그** (호스트 시점): 이벤트 상세 또는 참석자 목록(F03-07) 의 우상단 "로그 >" → `/home/events/:eventId/log`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `CapacityController`, `AttendanceController`, `EventService`. 앱: `my_events_screen.dart`, `attendance_log_screen.dart`, `my_events_tab_view.dart`, `timeline_node.dart`, `date_divider.dart`, `event_card.dart`.

<!-- source-references:start -->
서버 창구: `EventController#listMyEvents`, `EventController#getMyApplications`, `CapacityController#getLogs`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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
  - `APPLIED_ATTENDING` → "참석 확정" (positive). 대기로 들어간 신청(`newStatus=WAITING`)은 "대기열 등록" 으로 그린다
  - `APPLIED_WAITING` → "대기열 등록" (neutral)
  - `CANCELLED_BY_USER` → "참석 취소" (negative)
  - `PROMOTED_AUTO` → "자동 승격" (positive)
  - `PROMOTED_CAPACITY_INCREASE` → "정원 증가 승격" (positive)
  - `PROMOTED_MANUAL` → "수동 승격" (positive)
  - `REMOVED_BY_HOST` → "호스트 제거" (negative)
  - `OVERCAPACITY_APPROVED` → "정원 초과 승인" (neutral). 지금 이 값을 쓰는 길은 없다
  - 옛 `REJECTED_BY_HOST`(호스트 거절)·`WAITLIST_ORDER_CHANGED`(순번 변경)·`CAPACITY_REDUCED`(정원 축소)는 걷었다. 신청 거절은 신청 결정 이력이 남긴다
- **상태 분기**: 로딩 / 에러(`AppErrorState`) / 빈 상태 / 데이터

## 4. 제품 규칙

- 참석 예정 탭은 승인된 신청을 보인다. 결제 대기 신청은 결제 기한을 함께 보이고, 누르면 상세로 가서 결제한다.
- 모임이 종료·취소됐으면 참석 예정 카드는 흐리게, 상태 라벨과 함께 보인다.
- 주최 중 탭은 DRAFT·OPEN, 지난 이벤트 탭은 CLOSED·CANCELED 이고 20개씩 불러온다. DRAFT 에는 임시저장 표시가 붙는다.
- 빈 탭 안내: "참석 예정인 이벤트가 없습니다", "주최 중인 이벤트가 없습니다", "지난 이벤트가 없습니다".
- 참석 로그는 최신이 위인 타임라인이고 날짜가 바뀌면 구분선을 넣는다. 볼 수 있는 사람은 F03-07 §4 를 따른다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 상태 필터 | 내 모임 목록 창구는 상태 목록(쉼표로 이은 값, 예: 주최 중은 DRAFT·OPEN, 지난 모임은 CLOSED·CANCELED)을 받아 서버에서 거른다. 빈 값이면 전체다 | 없음 |
| 해소됨 | 서비스 상세 미확인 메모 | 개발 메모라 제품 판정 대상이 아니다. 주최 목록은 내가 주최한 모임을 쪽으로 나눈 목록이다 | 없음 |
| 해소됨 | 참가자 지난 모임 | 내 모임 화면은 참석 예정·주최 중·지난 이벤트 세 탭이다. 서버에 지난 모임 기록 창구와 참석했던 모임 창구가 따로 있다 | 없음 |
| 해소됨 | 그림 줄 | 흐름 그림의 마디·색 지정 줄이라 판정할 내용이 없다 | 없음 |

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
