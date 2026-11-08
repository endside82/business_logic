# F04-07. 내 클럽 / 멤버 통계 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자는 본인이 운영(OWNER)/관리(ADMIN)/가입(MEMBER) 중인 모든 클럽을 한 번에 조회한다. OWNER/ADMIN은 클럽별 활동 통계(전체/월간 활성 멤버 수, 멤버별 참석 횟수·기부액·최근 참석일)를 페이지로 받아 차트로 시각화한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 > "내 클럽" 메뉴 → `/my/clubs`
- 클럽 상세(F04-02) > 헤더의 통계 진입 (OWNER/ADMIN) → `/clubs/:id/stats`
- 멤버 목록(F04-04) > "통계" 탭 (스펙상 클럽 상세 > 통계 탭)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`. 앱: `my_clubs_screen.dart`, `club_member_stats_screen.dart`, `my_club_card.dart`, `member_stats_overview.dart`, `member_top_list.dart`, `member_trend_chart.dart`, `role_distribution_chart.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#getMyClubs`, `ClubController#getMemberStats`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 참석률 이름 | 회원 통계의 비율은 모임 참석률이 아니라 활동 중인 멤버를 전체 멤버로 나눈 값이라 앱 이름을 「활동 멤버 비율」 로 바로잡았다(2026-11-08 앱). 이 기능 문서는 모임 참석률을 정의하지 않으므로 서버 계산은 더하지 않는다(조정자 판정) | 없음 |
| Risk | 기간·증감 필터 | 신규 멤버·증감·기간(1·3·6·12개월) 필터는 서버와 앱 모두 없다 | 통계를 넓힐 때 둘지 정한다 |
| 해소됨 | 시험 보강 기록 | 화면 문구·입구를 적은 시험 보강 기록이다. 결함이 아니다 | 없음 |

## 9. 수용 기준

- **AC-01. 내 클럽 한눈에 보기 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 본인이 속한 모든 클럽을 빠르게 조회.
- **AC-02. 빈 상태 (가입 클럽 없음)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 멤버 통계 진입 (OWNER)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 통계 화면 완성.
- **AC-04. 페이지 이동 (큰 클럽)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 비OWNER/ADMIN 진입 시도 (가드)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 비멤버 진입 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 큰 데이터 / 캐시 없음**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 다음 이벤트 미리보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
