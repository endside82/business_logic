# 11. 리뷰 & 신고 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/11_review_report -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/11_review_report/00_overview.md`와 117개 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

이 단위는 community 플랫폼이 모임이 끝난 뒤 사용자 간 신뢰를 회복·축적하는 "후속 평가" 영역을 담당한다. 이벤트에 실제로 참석한 사용자가 공개 리뷰(별점 + 텍스트)를 남기고, 이벤트별·사용자별 리뷰 목록과 평균/분포를 열람한다. 부적절한 콘텐츠(이벤트/사용자/리뷰/클럽)는 신고로 운영자에게 전달되어 검토 큐에 쌓이고, 모든 활동(참석, 리뷰, 신고, 노쇼 등)은 0~100점 범위의 신뢰점수(TrustScore)로 환산되어 본인은 변동 이력까지, 타인은 점수·등급만 열람 가능하다. 또한 비공개 취향 평가(별점 + 태그 + 메모)와 자동 누적되는 취향 프로필(긍정/부정 태그 가중치, 선호 카테고리/시간대/그룹 크기)을 통해 추천·매칭 품질을 개인화한다. 이 단위가 끝나면 사용자는 자신의 평판(공개 리뷰)과 신뢰등급, 자신만의 취향 데이터(비공개 평가/태그)를 확인·관리할 수 있다.

이 도메인은 기능 PRD 6개로 구성된다. 현재 기능별 trace source는 총 15개이고, risk 후보는 총 10개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F11-01 | F11-01. 이벤트 리뷰 작성 | [F11-01_event-review-write_prd.md](../02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | [F11-01_event-review-write](../../units/11_review_report/F11-01_event-review-write) | 전환 완료 | 1 | 0 |
| F11-02 | F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) | [F11-02_review-list_prd.md](../02_feature_prds/11_review_report/F11-02_review-list_prd.md) | [F11-02_review-list](../../units/11_review_report/F11-02_review-list) | 전환 완료 | 2 | 2 |
| F11-03 | F11-03. 리뷰 수정 & 삭제 | [F11-03_review-edit-delete_prd.md](../02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | [F11-03_review-edit-delete](../../units/11_review_report/F11-03_review-edit-delete) | 전환 완료 | 2 | 3 |
| F11-04 | F11-04. 신고 (이벤트/사용자/리뷰/클럽) | [F11-04_report_prd.md](../02_feature_prds/11_review_report/F11-04_report_prd.md) | [F11-04_report](../../units/11_review_report/F11-04_report) | 전환 완료 | 2 | 3 |
| F11-05 | F11-05. 신뢰점수 & 변동 이력 | [F11-05_trust-score_prd.md](../02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | [F11-05_trust-score](../../units/11_review_report/F11-05_trust-score) | 전환 완료 | 3 | 1 |
| F11-06 | F11-06. 취향 평가 & 취향 프로필 | [F11-06_taste-profile_prd.md](../02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | [F11-06_taste-profile](../../units/11_review_report/F11-06_taste-profile) | 전환 완료 | 5 | 1 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F11-03](../02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | F11-03. 리뷰 수정 & 삭제 | Risk 후보 3 |
| [F11-04](../02_feature_prds/11_review_report/F11-04_report_prd.md) | F11-04. 신고 (이벤트/사용자/리뷰/클럽) | Risk 후보 3 |
| [F11-02](../02_feature_prds/11_review_report/F11-02_review-list_prd.md) | F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) | Risk 후보 2 |
| [F11-05](../02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | F11-05. 신뢰점수 & 변동 이력 | Risk 후보 1 |
| [F11-06](../02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | F11-06. 취향 평가 & 취향 프로필 | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (6개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F11-01 | 이벤트 리뷰 작성 | 참석한 이벤트에 별점(1~5)과 텍스트 후기를 남긴다 | 별점 탭, 후기 입력, "제출" 탭 |
| F11-02 | 리뷰 목록 조회 (이벤트별/사용자별) | 이벤트 또는 사용자 단위로 받은 리뷰 목록과 평균 별점·분포를 본다 | 이벤트 리뷰 탭/사용자 프로필 리뷰 탭 진입, 스크롤 |
| F11-03 | 리뷰 수정 & 삭제 | 본인이 작성한 리뷰를 수정하거나 삭제한다 | 리뷰 카드의 수정/삭제 액션 |
| F11-04 | 신고 (이벤트/사용자/리뷰/클럽) | 부적절한 콘텐츠를 신고 유형 + 상세 설명으로 운영자에게 접수한다 | 신고 대상의 "신고" 탭 → 유형 선택 → 상세 설명 입력 → "신고" 탭 |
| F11-05 | 신뢰점수 & 변동 이력 | 본인/타인의 신뢰점수·등급을 확인하고, 본인은 기간별 변동 이력까지 본다 | 마이페이지/프로필의 신뢰점수 진입, 기간(1주/1개월/3개월) 변경 |
| F11-06 | 취향 평가 & 취향 프로필 | 비공개 별점·태그·메모 기록과 자동 누적된 긍정/부정 태그 가중치, 선호 카테고리/시간대/그룹 크기를 조회·설정한다 | 평점 작성, 취향 프로필 조회, "선호도 설정" 바텀시트에서 카테고리/시간/그룹 선택 → 저장 |

> M = 6 기능. F11-01 ~ F11-03은 공개 리뷰 라이프사이클(작성/조회/수정·삭제)이고, F11-04는 신고 접수, F11-05는 신뢰점수(공개 점수 + 본인 한정 이력), F11-06은 비공개 취향(평가 + 프로필 누적/설정)이다. 컨트롤러에는 본인이 받은 신고 목록 조회(`GET /api/v1/reports/my`)도 존재하나 신고 라이프사이클의 보조 기능이므로 F11-04에 흡수한다. UI 스펙(SCR-RR-005)에는 활동 패턴 히트맵·월별 차트가 있으나 서버 `TasteProfileVo`/`RatingStatsVo`에 해당 필드가 없고 클라이언트도 렌더링하지 않으므로 본 단위 기능 목록에 포함하지 않는다.

---

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 상세

### F11-01 이벤트 리뷰 작성

- **사용자 가치**: 자신이 실제로 참석한 이벤트에 대해 공개 별점·후기를 남겨 호스트와 다른 참가자가 다음 의사결정에 활용할 정보를 제공한다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/review_write_screen.dart` (SCR-RR-001)
  - 위젯: `community_app/lib/presentation/review/widgets/star_rating_widget.dart`
- **백엔드 엔드포인트** (`ReviewController`):
  - `POST /api/v1/events/{eventId}/reviews` — `ReviewParam` body, 201 + `ReviewVo` (`reviewId`, `rating`, `content`, `createdAt`)
  - 부수효과: `TrustScoreService`가 작성자/대상자의 신뢰점수를 갱신
- **선결 조건/상태**: 로그인 + 해당 이벤트 참석자(미참석 시 403 NOT_ATTENDED). 동일 이벤트에 본인이 작성한 리뷰가 없어야 함(409 REVIEW_ALREADY_EXISTS).
- **결과 상태 변화**:
  - 성공: `Review` 레코드 생성, 신뢰점수 변동 → "리뷰가 등록되었습니다" 토스트 → 리뷰 목록(SCR-RR-002) 또는 이벤트 상세로 복귀
  - 실패: 403 NOT_ATTENDED(다이얼로그 후 뒤로), 409 REVIEW_ALREADY_EXISTS(토스트 후 뒤로), 422 INAPPROPRIATE_CONTENT(인라인), 500(토스트)

### F11-02 리뷰 목록 조회 (이벤트별/사용자별)

- **사용자 가치**: 이벤트 참가 여부를 결정하기 전에는 해당 이벤트의 평판을, 사용자를 평가하기 전에는 그 사용자가 받아온 평가의 누적치를 한 번에 본다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/review_list_screen.dart` (SCR-RR-002)
  - 위젯: `community_app/lib/presentation/review/widgets/rating_summary_widget.dart`, `review_card.dart`
- **백엔드 엔드포인트** (`ReviewController`):
  - `GET /api/v1/events/{eventId}/reviews` — 200 + `List<ReviewVo>` (단일 리스트, 페이지 응답 아님)
  - `GET /api/v1/users/{userId}/reviews` — 200 + `List<ReviewVo>`
- **선결 조건/상태**: 공개 조회(인증 가드 정책에 따름). 평균 별점·분포는 클라이언트가 응답 리스트로부터 계산.
- **결과 상태 변화**:
  - 데이터: 평균 별점, 총 개수, 별점 분포(이벤트), 리뷰 카드 리스트 렌더링
  - 액션 분기: 리뷰 카드의 "신고" 탭 → SCR-RR-003 (`targetType=REVIEW`, `targetId=reviewId`)
  - 빈 상태: "아직 리뷰가 없습니다" 표시
  - 에러: 404 EVENT_NOT_FOUND(다이얼로그 후 뒤로), 500(토스트)

### F11-03 리뷰 수정 & 삭제

- **사용자 가치**: 작성 후 정정·후회된 리뷰를 본인이 직접 정리하여 평판 데이터의 정확성을 유지한다.
- **주요 화면**: 본 단위에 전용 화면 없음. 리뷰 목록(SCR-RR-002)의 본인 리뷰 카드 또는 마이페이지 리뷰 영역에서 트리거(수정 시 SCR-RR-001 재사용 가능). 백엔드 라이프사이클이 리뷰 도메인이므로 본 단위에 포함.
- **백엔드 엔드포인트** (`ReviewController`):
  - `PATCH /api/v1/reviews/{id}` — `ReviewParam` body, 200 + `ReviewVo` (작성자 본인 검증)
  - `DELETE /api/v1/reviews/{reviewId}` — 204 No Content (작성자 본인 검증)
- **선결 조건/상태**: 로그인 + 본인이 작성한 리뷰(서비스에서 `userId` 일치 검증). 신뢰점수 갱신 정책은 서비스 측에서 처리.
- **결과 상태 변화**:
  - 수정 성공: `Review` 레코드의 `rating`/`content` 갱신 → 목록 재로드
  - 삭제 성공: `Review` 레코드 제거 → 목록에서 사라짐
  - 실패: 403(타인 리뷰), 404 REVIEW_NOT_FOUND

### F11-04 신고 (이벤트/사용자/리뷰/클럽)

- **사용자 가치**: 부적절한 콘텐츠를 운영자에게 빠르게 전달해 커뮤니티 품질을 자정한다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/report_screen.dart` (SCR-RR-003)
- **백엔드 엔드포인트** (`ReportController`):
  - `POST /api/v1/reports` — `ReportParam` (`targetType`, `targetId`, `reason`, `description?`), 201 + `ReportVo`
  - `GET /api/v1/reports/my` — 200 + `List<ReportVo>` (본인이 접수한 신고 이력)
- **선결 조건/상태**: 로그인 상태. `targetType ∈ {EVENT, USER, REVIEW, CLUB}`(클라이언트 라벨 매핑 기준), `reason`은 `ReportReason` enum(클라이언트는 `SPAM/HARASSMENT/INAPPROPRIATE_CONTENT/FALSE_INFORMATION/FRAUD/OTHER` 라벨 노출, "OTHER" 선택 시 상세 설명 10자 이상 필수). 본인 신고 불가(400 CANNOT_REPORT_SELF), 동일 대상 중복 신고 불가(409 ALREADY_REPORTED).
- **결과 상태 변화**:
  - 성공: `Report` 레코드 생성 → "신고 접수 완료" 다이얼로그 → 이전 화면 복귀
  - 실패: 400 CANNOT_REPORT_SELF(토스트 후 뒤로), 404 TARGET_NOT_FOUND(토스트 후 뒤로), 409 ALREADY_REPORTED(토스트 후 뒤로), 500(토스트)

### F11-05 신뢰점수 & 변동 이력

- **사용자 가치**: 자신의 활동(참석/리뷰/주최/노쇼/신고 접수 등)이 정량 점수와 등급(BRONZE/SILVER/GOLD/PLATINUM)으로 환산된 결과와 변동 이력을 확인하고, 타인의 신뢰도도 점수·등급으로 가늠한다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/trust_score_screen.dart` (SCR-RR-004)
- **백엔드 엔드포인트**:
  - `GET /api/v1/users/{userId}/trust-score` (`ReviewController#getTrustScore`) — 200 + `TrustScoreVo` (`trustScore`, `grade`, `breakdown`)
  - `GET /api/v1/users/me/trust-score` (`ReviewController#getMyTrustScore`) — 본인 단축 경로
  - `GET /api/v1/users/{userId}/trust-score/history?days={N}` (`ScoreHistoryController#getScoreHistory`) — `days` 기본 90, 최대 365 클램프, 200 + `ScoreHistoryVo` (`history[]: {date, totalScore, changeReason}`)
- **선결 조건/상태**: 본인 조회는 자신의 토큰만 있으면 충분. 타인 조회는 점수·등급만 노출(상세 이력은 본인 한정 정책).
- **결과 상태 변화**:
  - 데이터: 원형 게이지(0~100) + 등급 배지 + 점수 구성(`breakdown`) + 본인 한정 변동 이력 리스트 + 기간 셀렉터(7/30/90일)
  - 다음 등급까지 남은 점수: 클라이언트가 임계값(BRONZE 40 / SILVER 60 / GOLD 80 / PLATINUM max)으로 계산해 표시
  - 에러: 404 USER_NOT_FOUND(다이얼로그 후 뒤로), 500(토스트)

### F11-06 취향 평가 & 취향 프로필

- **사용자 가치**: 비공개 별점·태그·메모로 자신의 호불호를 누적 기록하고, 자동 집계된 긍정/부정 태그 가중치 + 직접 설정한 선호 카테고리/시간대/그룹 크기로 추천·매칭의 입력값을 본인이 통제한다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/taste_profile_screen.dart` (SCR-RR-005, "선호도 설정" 바텀시트 포함)
- **백엔드 엔드포인트**:
  - 비공개 평가 (`PreferenceRatingController`):
    - `POST /api/v1/ratings` — `PreferenceRatingParam` body, 201 + `PreferenceRatingVo`
    - `GET /api/v1/ratings/me?page=&size=` — 200 + `Page<PreferenceRatingVo>` (Spring `Page` → 클라이언트 `PageResponse`)
    - `GET /api/v1/ratings/me/stats` — 200 + `RatingStatsVo` (`totalRatings`, `averageGiven` 등)
  - 취향 프로필 (`TasteProfileController`):
    - `GET /api/v1/taste/profile` — 200 + `TasteProfileVo` (`positiveTagWeights`, `negativeTagWeights`, `preferredCategories`, `preferredTimeSlots`, `preferredGroupSize`)
    - `PUT /api/v1/taste/preferences` — `TastePreferenceParam` body, 200 + 갱신된 `TasteProfileVo`
- **선결 조건/상태**: 모두 로그인 상태(`@AuthenticationPrincipal UserPrincipal`). 평가는 한 건씩 작성, 통계는 자동 집계. 프로필 데이터가 부족하면(태그 3개 미만) 레이더 차트는 비표시(클라이언트 가드).
- **결과 상태 변화**:
  - 평가 생성: `PreferenceRating` 레코드 누적 → 통계/태그 가중치에 반영
  - 프로필 갱신: `TasteProfile`의 카테고리/시간대/그룹 크기 필드 갱신 → "선호도가 저장되었습니다" 토스트 → 추천/매칭 도메인의 입력값 변동
  - 빈 상태: "아직 활동 데이터가 없습니다" / "아직 남긴 평점이 없습니다"
  - 에러: 404 PROFILE_NOT_FOUND(빈 상태 표시, 최초 데이터 없음), 500(토스트)

---

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F11-03](../02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | F11-03. 리뷰 수정 & 삭제 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F11-04](../02_feature_prds/11_review_report/F11-04_report_prd.md) | F11-04. 신고 (이벤트/사용자/리뷰/클럽) | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F11-02](../02_feature_prds/11_review_report/F11-02_review-list_prd.md) | F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F11-05](../02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | F11-05. 신뢰점수 & 변동 이력 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F11-06](../02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | F11-06. 취향 평가 & 취향 프로필 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
