# F04-07. 내 클럽 / 멤버 통계 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-07_my-clubs-stats -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-07_my-clubs-stats`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자는 본인이 운영(OWNER)/관리(ADMIN)/가입(MEMBER) 중인 모든 클럽을 한 번에 조회한다. OWNER/ADMIN은 클럽별 활동 통계(전체/월간 활성 멤버 수, 멤버별 참석 횟수·기부액·최근 참석일)를 페이지로 받아 차트로 시각화한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 > "내 클럽" 메뉴 → `/my/clubs`
- 클럽 상세(F04-02) > 헤더의 통계 진입 (OWNER/ADMIN) → `/clubs/:id/stats`
- 멤버 목록(F04-04) > "통계" 탭 (스펙상 클럽 상세 > 통계 탭)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-07_my-clubs-stats/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-07_my-clubs-stats/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-07_my-clubs-stats/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-07_my-clubs-stats/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:102` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:282` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 내 클럽 목록 (`my_clubs_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "내 클럽"
  - 섹션 헤더: "운영 중인 클럽 (N)" — myRole이 OWNER/ADMIN인 클럽
  - 섹션 헤더: "가입한 클럽 (N)" — myRole이 MEMBER
  - 카드: 이미지, 클럽명, 멤버수, 역할 배지(Owner/Admin/Member), 다음 이벤트 날짜
  - 빈 상태: "아직 가입한 클럽이 없어요" + "클럽 둘러보기" 버튼
- **사용자가 할 수 있는 액션**:
  - 카드 탭 ▶ `/clubs/:id` 클럽 상세 (F04-02)
  - 풀투리프레시 ▶ `myClubsNotifier.refresh()`
  - 빈 상태 버튼 ▶ `/clubs` 목록으로
- **상태 분기**: 로딩/에러/빈상태
- **모달**: 없음

### 멤버 통계 (`club_member_stats_screen.dart`)

- **사용자가 보는 것**:
  - 4개 StatCard 2x2 그리드: 전체 멤버 / 활성 멤버(monthlyActive) / 신규(이번달, 클라 가공) / 평균 참석률(클라 가공 또는 placeholder)
  - 멤버 증감 차트 (3개월 등) — 서버 미제공 시 빈 상태 또는 클라 누적 계산
  - 활동 TOP 5 — `MemberActivityVo`를 attendedEvents desc 정렬 후 상위 5
  - 역할별 분포 파이 차트 — 별도 멤버 목록 호출(F04-04) 결합 또는 단순 카운트
  - 기간 SegmentedControl (1개월/3개월/6개월/1년) — 서버 미지원이라 UI placeholder
- **사용자가 할 수 있는 액션**:
  - 페이지 변경 (멤버별 활동 페이지) ▶ `clubStatsNotifier.setPage(p)` ▶ `GET .../members/stats?page=p&size=20`
  - TOP 멤버 카드 탭 ▶ 사용자 프로필
  - 풀투리프레시 ▶ `refresh`
- **상태 분기**:
  - 비OWNER/ADMIN 진입: UI 가드로 차단 ("권한이 없습니다")
  - 로딩: 스켈레톤 차트
  - 에러: 표준
- **모달**: 없음

## 4. 서버 계약

### 개요

사용자는 본인이 운영(OWNER)/관리(ADMIN)/가입(MEMBER) 중인 모든 클럽을 한 번에 조회한다. OWNER/ADMIN은 클럽별 활동 통계(전체/월간 활성 멤버 수, 멤버별 참석 횟수·기부액·최근 참석일)를 페이지로 받아 차트로 시각화한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/clubs/my | ClubController#getMyClubs | required | 내가 ACTIVE 멤버인 모든 클럽 |
| GET | /api/v1/clubs/{id}/members/stats | ClubController#getMemberStats | required (멤버) | 활동 통계 + 멤버별 활동 페이지 |

### 의존 단위 / 외부 시스템

- **Unit 03 (event)**: `EventRepository.findByClubId` (클럽 이벤트 ID 수집).
- **Unit 03 (capacity)**: `EventAttendanceRepository.findByEventIdInAndStatus(ATTENDING)`.
- **Unit 01 (account)**: `UserRepository.findAllById` (닉네임).
- **F04-14 (이 단위 후반)**: `ClubDonationRepository.findByClubIdAndUserIdIn` (멤버별 기부 합계).

## 5. 프론트 계약

### 진입 경로

- 마이페이지 > "내 클럽" 메뉴 → `/my/clubs`
- 클럽 상세(F04-02) > 헤더의 통계 진입 (OWNER/ADMIN) → `/clubs/:id/stats`
- 멤버 목록(F04-04) > "통계" 탭 (스펙상 클럽 상세 > 통계 탭)

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/my/clubs` | `screens/my_clubs_screen.dart` | 운영/가입 클럽 한눈에 |
| `/clubs/:id/stats` (또는 `/clubs/:id/members/stats`) | `screens/club_member_stats_screen.dart` | 활동 통계 + 차트 |
| `widgets/my_club_card.dart` | 내 클럽 카드 (이미지, 이름, 멤버수, 역할 배지, 다음 이벤트) |
| `widgets/member_stats_overview.dart` | 4개 StatCard (전체/활성/신규/평균) |
| `widgets/member_top_list.dart` | 활동 TOP 5 |
| `widgets/member_trend_chart.dart` | 멤버 증감 라인 차트 (서버 미제공 — 클라 가공 또는 placeholder) |
| `widgets/role_distribution_chart.dart` | 역할 파이 차트 |

### 화면별 구성 요소 & 액션

### 내 클럽 목록 (`my_clubs_screen.dart`)

- **사용자가 보는 것**:
  - AppBar "내 클럽"
  - 섹션 헤더: "운영 중인 클럽 (N)" — myRole이 OWNER/ADMIN인 클럽
  - 섹션 헤더: "가입한 클럽 (N)" — myRole이 MEMBER
  - 카드: 이미지, 클럽명, 멤버수, 역할 배지(Owner/Admin/Member), 다음 이벤트 날짜
  - 빈 상태: "아직 가입한 클럽이 없어요" + "클럽 둘러보기" 버튼
- **사용자가 할 수 있는 액션**:
  - 카드 탭 ▶ `/clubs/:id` 클럽 상세 (F04-02)
  - 풀투리프레시 ▶ `myClubsNotifier.refresh()`
  - 빈 상태 버튼 ▶ `/clubs` 목록으로
- **상태 분기**: 로딩/에러/빈상태
- **모달**: 없음

### 멤버 통계 (`club_member_stats_screen.dart`)

- **사용자가 보는 것**:
  - 4개 StatCard 2x2 그리드: 전체 멤버 / 활성 멤버(monthlyActive) / 신규(이번달, 클라 가공) / 평균 참석률(클라 가공 또는 placeholder)
  - 멤버 증감 차트 (3개월 등) — 서버 미제공 시 빈 상태 또는 클라 누적 계산
  - 활동 TOP 5 — `MemberActivityVo`를 attendedEvents desc 정렬 후 상위 5
  - 역할별 분포 파이 차트 — 별도 멤버 목록 호출(F04-04) 결합 또는 단순 카운트
  - 기간 SegmentedControl (1개월/3개월/6개월/1년) — 서버 미지원이라 UI placeholder
- **사용자가 할 수 있는 액션**:
  - 페이지 변경 (멤버별 활동 페이지) ▶ `clubStatsNotifier.setPage(p)` ▶ `GET .../members/stats?page=p&size=20`
  - TOP 멤버 카드 탭 ▶ 사용자 프로필
  - 풀투리프레시 ▶ `refresh`
- **상태 분기**:
  - 비OWNER/ADMIN 진입: UI 가드로 차단 ("권한이 없습니다")
  - 로딩: 스켈레톤 차트
  - 에러: 표준
- **모달**: 없음

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 내 클럽 한눈에 보기 (Happy Path) | OWNER 1개, ADMIN 1개, MEMBER 3개를 가진 사용자. | 본인이 속한 모든 클럽을 빠르게 조회. |
| S2 | 빈 상태 (가입 클럽 없음) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 멤버 통계 진입 (OWNER) | OWNER, 멤버 24명, 클럽 이벤트 12개. | 통계 화면 완성. |
| S4 | 페이지 이동 (큰 클럽) | 멤버 100명 클럽. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 비OWNER/ADMIN 진입 시도 (가드) | MEMBER. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 비멤버 진입 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 큰 데이터 / 캐시 없음 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 다음 이벤트 미리보기 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:73 | - "기간 필터(1/3/6/12개월)" 역시 서버 파라미터 미존재 — 클라 측 시각화 가공으로 대응 또는 미구현 표기. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:70 | - **신규(이번달), 평균 참석률, 멤버 증감, 역할 분포**: 서버 응답에 직접 없음 → 클라 가공 또는 미구현 placeholder 표시 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:71 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, 인라인 검증 포인트 모음) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:75 | ### S1 보강 — 마이페이지 → 내 클럽 → 상세 진입 + 운영진 메뉴 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:88 | ### S3 보강 — 멤버 통계 화면 라벨 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:103 | S5(비OWNER/ADMIN 진입 시도 가드)의 surface 보강: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 내 클럽 한눈에 보기 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본인이 속한 모든 클럽을 빠르게 조회.
- **AC-02. 빈 상태 (가입 클럽 없음)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 멤버 통계 진입 (OWNER)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 통계 화면 완성.
- **AC-04. 페이지 이동 (큰 클럽)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 비OWNER/ADMIN 진입 시도 (가드)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 비멤버 진입 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 큰 데이터 / 캐시 없음**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 다음 이벤트 미리보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
