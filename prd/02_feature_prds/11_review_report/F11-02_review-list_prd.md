# F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/11_review_report/F11-02_review-list -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/11_review_report/F11-02_review-list`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 단위 또는 사용자 단위로 작성·수신된 리뷰 목록을 단일 리스트로 반환하는 두 개의 GET 엔드포인트다. 응답은 페이지 응답이 아닌 단순 `List<ReviewVo>`이며, 평균 별점·총 개수·별점 분포는 클라이언트가 응답으로부터 산출한다. N+1 방지를 위해 `Review.reviewerId` 집합에 대해 한 번에 사용자 기본정보를 조회(`UserService.getUserBasicInfoMap`)한 뒤 매퍼가 닉네임/이미지 필드를 채워준다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03 도메인)의 "리뷰" 탭/액션 → `context.push('/reviews?eventId=$id')`
- 사용자 프로필(F-프로필)의 "리뷰" 탭 → `context.push('/reviews?userId=$id')`
- F11-01 리뷰 작성 완료 후 호출자가 invalidate 또는 push로 이동

`ReviewListScreen`은 `eventId` 또는 `userId` 둘 중 하나만 받으며 둘 다 null이면 assert 실패.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/11_review_report/F11-02_review-list/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/11_review_report/F11-02_review-list/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/11_review_report/F11-02_review-list/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/11_review_report/F11-02_review-list/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/review/controller/ReviewController.java:39` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/ReviewController.java:45` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 이벤트별 진입: `eventReviewListNotifierProvider(eventId)` watch
   → `ReviewRepository.getReviewsByEvent(eventId)`
   → `ReviewApi.getReviewsByEvent` (`GET /api/v1/events/{eventId}/reviews`)
   → 성공: `List<ReviewVo>`. 클라이언트가 `totalCount`/`avgRating`/`distribution` 계산.
2. 사용자별 진입: `userReviewListNotifierProvider(userId)` watch
   → `ReviewRepository.getReviewsByUser(userId)`
   → `ReviewApi.getReviewsByUser` (`GET /api/v1/users/{userId}/reviews`)
   → 성공: `List<ReviewVo>`. `distribution` 미사용.
3. 풀투리프레시: 각 provider invalidate → 빌드 함수 재실행 → 동일 GET 재호출.
4. 신고 클릭: F11-04 라우트로 push (별도 API 호출은 신고 화면에서 발생).

## 4. 서버 계약

### 개요

이벤트 단위 또는 사용자 단위로 작성·수신된 리뷰 목록을 단일 리스트로 반환하는 두 개의 GET 엔드포인트다. 응답은 페이지 응답이 아닌 단순 `List<ReviewVo>`이며, 평균 별점·총 개수·별점 분포는 클라이언트가 응답으로부터 산출한다. N+1 방지를 위해 `Review.reviewerId` 집합에 대해 한 번에 사용자 기본정보를 조회(`UserService.getUserBasicInfoMap`)한 뒤 매퍼가 닉네임/이미지 필드를 채워준다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/reviews` | `ReviewController#getReviewsByEvent` | 정책상 공개(가드 미강제) | 이벤트 작성된 리뷰 전체 리스트 |
| GET | `/api/v1/users/{userId}/reviews` | `ReviewController#getReviewsByUser` | 정책상 공개 | 해당 사용자가 받은 리뷰 전체 리스트 |

> 서비스에는 페이지네이션 지원 오버로드(`getReviewsByEvent(long, Pageable)` / `getReviewsByUser(long, Pageable)`)가 정의되어 있으나 컨트롤러에서 노출되지 않는다. (서비스 구현은 존재, 컨트롤러 미노출)

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `Review` (재사용, F11-01 참조). 조회 조건은 `deleted_at IS NULL` 필터.
- 매퍼: `ReviewMapper.updateReviewToVo(Review)` 단일 변환 + `updateReviewToVoWithUserInfo(Review, Map<Long, String[]>)` 닉네임/이미지 채움.
- 평균 별점·분포·정렬은 본 단위 백엔드에서 계산하지 않는다 (클라이언트 책임).

### 의존 단위 / 외부 시스템

- **Account 도메인**: `UserService.getUserBasicInfoMap(List<Long>)` — 닉네임/프로필 이미지 일괄 조회 (호출만)
- **F11-01 / F11-03**: 동일한 `Review` 엔티티 라이프사이클을 공유. 본 기능은 INSERT/UPDATE/DELETE를 일으키지 않음.
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세(F03 도메인)의 "리뷰" 탭/액션 → `context.push('/reviews?eventId=$id')`
- 사용자 프로필(F-프로필)의 "리뷰" 탭 → `context.push('/reviews?userId=$id')`
- F11-01 리뷰 작성 완료 후 호출자가 invalidate 또는 push로 이동

`ReviewListScreen`은 `eventId` 또는 `userId` 둘 중 하나만 받으며 둘 다 null이면 assert 실패.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | 라우트 상수 | Screen 파일 | 역할 |
|---|---|---|---|
| `/reviews?eventId=...&userId=...` | `Routes.reviewList` (`core/router/routes.dart:170`) | `presentation/review/screens/review_list_screen.dart` | 이벤트별/사용자별 리뷰 목록 분기 |

내부적으로 `ReviewListScreen`이 `eventId != null`이면 `_EventReviewList`, 아니면 `_UserReviewList`로 분기한다.

### 화면별 구성 요소 & 액션

### 이벤트별 리뷰 목록 (`_EventReviewList`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '리뷰')`
  - 헤더 영역(첫 ListView 항목): `RatingSummaryWidget(averageRating, totalCount, distribution)` — 큰 평균 숫자 + 별 + "리뷰 N개" + 5점→1점 분포 막대그래프 (warning500 색상)
  - 정렬 라벨 "최신순 ▼" (현재 정적 텍스트, 실제 정렬 변경 미구현)
  - 리뷰 카드 리스트 (`ReviewCard`): 작성자 아바타/닉네임, 별점, 상대 시간(15분 전/2시간 전/3일 전 또는 MM/DD), 본문 텍스트, 우측 신고 아이콘
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 → `ref.invalidate(eventReviewListNotifierProvider(eventId))`
  - 리뷰 카드의 신고 아이콘 탭 → `context.push('/report', extra: {'targetType': 'REVIEW', 'targetId': review.id})` → F11-04
  - (정렬 옵션 탭 — 라벨은 있으나 동작은 미구현)
- **상태 분기**:
  - 데이터: 위 구성 그대로
  - 빈 상태: `AppEmptyState(icon: Icons.rate_review_outlined, title: '아직 리뷰가 없습니다')`
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(error, onRetry)` (재시도 시 invalidate)

### 사용자별 리뷰 목록 (`_UserReviewList`)

- **사용자가 보는 것**: 평균 별점 카드 + (분포 차트 없음) + 사용자가 받은 리뷰 카드 리스트. 리뷰 카드는 신고 아이콘 미노출(`onReport` 미전달).
- **액션**: 풀투리프레시만. 신고는 카드의 `onReport`가 null이라 아이콘 자체가 보이지 않음.
- **상태 분기**: 동일 (loading/error/empty + 데이터)

### API 호출 순서 (Provider/Repository 관점)

1. 이벤트별 진입: `eventReviewListNotifierProvider(eventId)` watch
   → `ReviewRepository.getReviewsByEvent(eventId)`
   → `ReviewApi.getReviewsByEvent` (`GET /api/v1/events/{eventId}/reviews`)
   → 성공: `List<ReviewVo>`. 클라이언트가 `totalCount`/`avgRating`/`distribution` 계산.
2. 사용자별 진입: `userReviewListNotifierProvider(userId)` watch
   → `ReviewRepository.getReviewsByUser(userId)`
   → `ReviewApi.getReviewsByUser` (`GET /api/v1/users/{userId}/reviews`)
   → 성공: `List<ReviewVo>`. `distribution` 미사용.
3. 풀투리프레시: 각 provider invalidate → 빌드 함수 재실행 → 동일 GET 재호출.
4. 신고 클릭: F11-04 라우트로 push (별도 API 호출은 신고 화면에서 발생).

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 평균 별점 = `reviews.fold(rating합) / count` — 클라이언트 산출
- 별점 분포 맵 = 1~5 별 별 개수 — 클라이언트 산출 (이벤트 모드만)
- 정렬 라벨 "최신순 ▼" — 정적 텍스트, 동작은 서버 응답 순서에 의존(서버는 정렬 보장 미명시 — `findByEventIdAndDeletedAtIsNull` 메서드 시그니처 기반)
- 빈 상태 카피("아직 리뷰가 없습니다")
- 상대 시간 포맷("N분 전"/"N시간 전"/"N일 전"/"MM/DD") — `ReviewCard._formatDate`
- 사용자별 모드에서 분포 막대 미표시 정책
- 신고 아이콘은 이벤트 모드에서만 노출
- 한 번 호출로 전체 리스트를 받기 때문에 페이지네이션 미사용 (서버 페이지 오버로드는 컨트롤러 미노출)
- 풀투리프레시 → `ref.invalidate`로 단순 재요청
- AppBar는 단일 타이틀 "리뷰" (사용자/이벤트 구분 없음)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 이벤트 상세에서 리뷰 탭 진입 (Happy Path · 이벤트별) | 이벤트에 작성된 리뷰가 N건 존재. | 화면이 데이터로 채워짐. 사용자는 스크롤하거나 신고/뒤로 액션 가능. |
| S2 | 풀투리프레시 | 리뷰 작성(F11-01) 직후 목록 화면에 복귀. | 리스트 갱신, 평균/분포 재계산. |
| S3 | 빈 상태 — 아직 리뷰가 없는 이벤트 | `review` 테이블에 해당 이벤트로 작성된 행 없음. | 화면에 빈 상태만 노출. 사용자는 뒤로가기. |
| S4 | 리뷰 카드의 신고 아이콘 탭 (이벤트별 모드 한정) | 이벤트별 모드에서 리뷰 카드가 보이는 상태. | 신고 화면으로 이동 (이 시나리오에서 신고 자체는 F11-04에서 다룸). |
| S5 | 사용자 프로필에서 받은 리뷰 보기 | 프로필의 "리뷰" 탭 진입. | 화면이 채워짐. |
| S6 | 에러 — 서버 500 | 진입. | 정상 응답이 오면 데이터 화면으로 전환, 실패 지속 시 에러 화면 유지. |

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
| 후보 | frontend.md:26 | - 정렬 라벨 "최신순 ▼" (현재 정적 텍스트, 실제 정렬 변경 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:31 | - (정렬 옵션 탭 — 라벨은 있으나 동작은 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 이벤트 상세에서 리뷰 탭 진입 (Happy Path · 이벤트별)**: Given 이벤트에 작성된 리뷰가 N건 존재. When 사용자가 해당 흐름을 실행하면 Then 화면이 데이터로 채워짐. 사용자는 스크롤하거나 신고/뒤로 액션 가능.
- **AC-02. 풀투리프레시**: Given 리뷰 작성(F11-01) 직후 목록 화면에 복귀. When 사용자가 해당 흐름을 실행하면 Then 리스트 갱신, 평균/분포 재계산.
- **AC-03. 빈 상태 — 아직 리뷰가 없는 이벤트**: Given `review` 테이블에 해당 이벤트로 작성된 행 없음. When 사용자가 해당 흐름을 실행하면 Then 화면에 빈 상태만 노출. 사용자는 뒤로가기.
- **AC-04. 리뷰 카드의 신고 아이콘 탭 (이벤트별 모드 한정)**: Given 이벤트별 모드에서 리뷰 카드가 보이는 상태. When 사용자가 해당 흐름을 실행하면 Then 신고 화면으로 이동 (이 시나리오에서 신고 자체는 F11-04에서 다룸).
- **AC-05. 사용자 프로필에서 받은 리뷰 보기**: Given 프로필의 "리뷰" 탭 진입. When 사용자가 해당 흐름을 실행하면 Then 화면이 채워짐.
- **AC-06. 에러 — 서버 500**: Given 진입. When 사용자가 해당 흐름을 실행하면 Then 정상 응답이 오면 데이터 화면으로 전환, 실패 지속 시 에러 화면 유지.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
