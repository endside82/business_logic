# 02. 홈 피드 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/02_home_feed -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/02_home_feed/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

홈 피드는 앱 실행 직후 사용자가 가장 먼저 만나는 메인 디스커버리 화면이다. 별도의 검색·탐색 행위 없이도 "오늘 어떤 모임/클럽/플랜이 있는지"를 한눈에 보여주어 자연스럽게 이벤트 상세, 클럽 상세, 플랜 상세, 검색, 알림 등으로 진입하도록 만드는 허브 역할을 한다.

이 도메인은 기능 PRD 5개로 구성된다. 현재 기능별 trace source는 총 6개이고, risk 후보는 총 25개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F02-01 | F02-01. 홈 피드 메인 조회 | [F02-01_home-feed-main_prd.md](../02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | [F02-01_home-feed-main](../../units/02_home_feed/F02-01_home-feed-main) | 전환 완료 | 4 | 3 |
| F02-02 | F02-02. 홈 피드 새로고침 | [F02-02_home-feed-refresh_prd.md](../02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | [F02-02_home-feed-refresh](../../units/02_home_feed/F02-02_home-feed-refresh) | 전환 완료 | 0 | 1 |
| F02-03 | F02-03. 섹션 카드 진입 (이벤트/클럽/플랜) | [F02-03_section-card-entry_prd.md](../02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | [F02-03_section-card-entry](../../units/02_home_feed/F02-03_section-card-entry) | 전환 완료 | 0 | 2 |
| F02-04 | F02-04. 추천 이벤트 더보기·필터·무한스크롤 | [F02-04_recommend-events-more_prd.md](../02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | [F02-04_recommend-events-more](../../units/02_home_feed/F02-04_recommend-events-more) | 전환 완료 | 2 | 9 |
| F02-05 | F02-05. 검색·알림 진입점 | [F02-05_search-notification-entry_prd.md](../02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | [F02-05_search-notification-entry](../../units/02_home_feed/F02-05_search-notification-entry) | 전환 완료 | 0 | 10 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F02-05](../02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | F02-05. 검색·알림 진입점 | Risk 후보 10, trace 없음 |
| [F02-04](../02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | F02-04. 추천 이벤트 더보기·필터·무한스크롤 | Risk 후보 9 |
| [F02-01](../02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | F02-01. 홈 피드 메인 조회 | Risk 후보 3 |
| [F02-03](../02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | F02-03. 섹션 카드 진입 (이벤트/클럽/플랜) | Risk 후보 2, trace 없음 |
| [F02-02](../02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | F02-02. 홈 피드 새로고침 | Risk 후보 1, trace 없음 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (5개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F02-01 | 홈 피드 메인 조회 | 앱 진입 시 인기 클럽/최신 플랜/예정 이벤트/트렌딩을 단일 화면에 병렬 로드해 보여준다 | 홈 탭 진입, 스크롤 |
| F02-02 | 홈 피드 새로고침 | Pull-to-refresh로 모든 섹션을 캐시 무시하고 동시 재호출한다 | 화면 아래로 당기기 |
| F02-03 | 섹션 카드 진입 (이벤트/클럽/플랜) | 카드 탭 시 해당 카테고리 상세 화면으로 라우팅한다 | 이벤트/클럽/플랜 카드 탭 |
| F02-04 | 추천 이벤트 더보기·필터·무한스크롤 | 추천 이벤트 섹션 더보기에서 필터·정렬을 적용한 페이지네이션 리스트를 제공한다 | "더보기" 탭, 필터/정렬 변경, 하단 도달 |
| F02-05 | 검색·알림 진입점 | 상단바의 검색·알림 아이콘으로 각 도메인 진입을 제공하고 미읽음 알림 뱃지를 표시한다 | 검색 아이콘 탭, 알림 아이콘 탭 |

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 상세

### F02-01 홈 피드 메인 조회
- **사용자 가치**: 앱을 켜자마자 "지금 떠오르는 클럽/플랜/이벤트"를 검색·필터 없이 한눈에 둘러볼 수 있다.
- **주요 화면**: `SCR-HF-001 메인 피드` (4개 섹션: 추천/예정 이벤트, 인근 이벤트, 인기 클럽, 새 플랜).
- **백엔드 엔드포인트**:
  - `GET /api/v1/home/events` (예정 이벤트, 기본 `sort=startTime,asc`)
  - `GET /api/v1/home/clubs` (인기 클럽, 기본 `sort=memberCount,desc`, `category` 옵션)
  - `GET /api/v1/home/plans` (최신 플랜, 기본 `sort=createdAt,desc`, `category` 옵션)
  - `GET /api/v1/search/trending?limit=` (트렌딩 이벤트, 최대 50)
- **선결 조건/상태**: 인증은 선택적(비로그인 사용자도 진입 가능, `principal == null` 허용). 위치 권한은 거부되어도 기본 피드는 렌더링된다.
- **결과 상태 변화**: 클라이언트 캐시(5분 TTL)에 응답 저장, 4개 섹션 렌더링. 개별 섹션 실패 시 다른 섹션은 정상 렌더링되고 실패 섹션만 재시도 UI로 대체.

### F02-02 홈 피드 새로고침
- **사용자 가치**: 사용자가 새로운 콘텐츠 등장 여부를 명시적으로 확인하고 싶을 때 강제 갱신할 수 있다.
- **주요 화면**: `SCR-HF-001` (FeedScrollView Pull-to-refresh).
- **백엔드 엔드포인트**: F02-01과 동일한 4개 엔드포인트를 캐시 무시하고 재호출.
- **선결 조건/상태**: 메인 피드 화면에 진입해 있어야 한다.
- **결과 상태 변화**: 모든 섹션 데이터 재로드, 로컬 캐시 갱신, 새로고침 인디케이터 종료.

### F02-03 섹션 카드 진입 (이벤트/클럽/플랜)
- **사용자 가치**: 관심 가는 카드를 탭해 즉시 해당 도메인의 상세 흐름으로 진입할 수 있다.
- **주요 화면**:
  - 추천/예정/인근 이벤트 카드 → `SCR-EV-002 이벤트 상세`
  - 인기 클럽 카드 → `SCR-CL-002 클럽 상세`
  - 새 플랜 카드 → `SCR-MK-002 플랜 상세`
- **백엔드 엔드포인트**: 진입 자체는 라우팅이며, 상세 데이터 로드는 각 도메인 유닛(이벤트/클럽/마켓) 책임. 홈 피드 응답의 `*SimpleVo`(eventId / clubId / planId)를 키로 사용한다.
- **선결 조건/상태**: 해당 섹션이 비어있지 않아야 한다(EmptySection 표시 시 진입 불가).
- **결과 상태 변화**: 라우터 스택에 상세 화면이 push되며, 홈 피드 상태는 그대로 유지(돌아오면 동일 스크롤 위치).

### F02-04 추천 이벤트 더보기·필터·무한스크롤
- **사용자 가치**: 메인 피드의 가로 스크롤만으로는 부족할 때, 필터/정렬을 적용해 추천 이벤트를 깊게 탐색할 수 있다.
- **주요 화면**: `SCR-HF-002 추천 이벤트`(필터 칩 + 정렬 드롭다운 + 무한 스크롤), `SCR-HF-003 추천 상세`(추천 이유 + 유사 이벤트).
- **백엔드 엔드포인트**:
  - `GET /api/v1/home/events` (page/size + `sort` 파라미터로 정렬 변경)
  - `GET /api/v1/search/trending?limit=` (인기/추천 시그널 보강용)
  - `SCR-HF-003`의 "이벤트 상세 보기" 진입 시 이벤트 도메인의 상세 API 사용 (해당 유닛에서 다룸)
- **선결 조건/상태**: 메인 피드 추천 이벤트 섹션의 "더보기"를 통해 진입. `last=true` 도달 시 더 이상 페이지 호출하지 않음.
- **결과 상태 변화**: 페이지 인덱스 증가, 누적 리스트 append, 마지막 페이지에서 "더 이상 추천 이벤트가 없습니다" 표시. 필터/정렬 변경 시 리스트 초기화 후 page=0부터 재로드.

### F02-05 검색·알림 진입점
- **사용자 가치**: 홈 피드를 떠나지 않고도 검색 / 알림 흐름으로 빠르게 진입하며, 새 알림 존재 여부를 시각적으로 인지한다.
- **주요 화면**: `SCR-HF-001` 상단 TopBar(SearchIcon, NotificationIcon with unreadCount badge) → `SCR-SR-001 검색`, `SCR-NT-001 알림 목록`.
- **백엔드 엔드포인트**: 본 유닛 범위(홈 피드)에서는 진입점만 책임. 검색/알림의 실제 API는 각 도메인 유닛이 담당한다.
- **선결 조건/상태**: 알림 뱃지 표시는 미읽음 알림 카운트 > 0 일 때. 비로그인 사용자에게 알림 아이콘은 노출 정책상 인증 후 활성화될 수 있음(상세는 알림 유닛 참조).
- **결과 상태 변화**: 라우터 push로 검색/알림 화면 진입. 홈 피드 자체 상태는 보존.

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F02-05](../02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | F02-05. 검색·알림 진입점 | 10 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F02-04](../02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | F02-04. 추천 이벤트 더보기·필터·무한스크롤 | 9 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F02-01](../02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | F02-01. 홈 피드 메인 조회 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F02-03](../02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | F02-03. 섹션 카드 진입 (이벤트/클럽/플랜) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F02-02](../02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | F02-02. 홈 피드 새로고침 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
