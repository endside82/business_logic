# 11. 리뷰 & 신고 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-07-29; unit: business_logic/units/11_review_report -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/11_review_report/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.
>
> 2026-07-29 현재 소스 갱신: F11-06의 현재 구현 기준은 legacy `PreferenceRatingController`, `/api/v1/ratings`, `TasteNeighbor`, GraphQL 추천이 아니다. `TasteProfileService`의 재구축 원천은 이벤트 피드백(`EventFeedbackChoice`)의 긍정 `ImpressionTag`이며, 데이트 만남 피드백은 별도 privatedate 원본으로 취향 프로필에 합산되지 않는다. 커뮤니티 메시지·클럽 게시글·클럽 댓글 신고 타입(`COMMUNITY_MESSAGE`, `COMMUNITY_POST`, `COMMUNITY_COMMENT`)도 현재 ReportType에 포함된다.

## 1. 결론

이 단위는 community 플랫폼이 모임 종료 뒤 신뢰와 본인 관점 피드백을 축적하는 영역이다. 공개 `Review`는 별점·텍스트 평판이고, 별도 `EventFeedback`은 증거등급 참석자가 또 함께하고 싶은 사람·긍정 인상 태그·모임 분위기를 비공개로 남기는 흐름이다. 받은 선택과 상대 응답은 노출하지 않는다. 본인 선택의 긍정 인상은 `positiveTagWeights`로 재구축되고, 선언 카테고리·시간대는 사람 추천/관계 공통점에 사용된다. 그룹 크기는 현재 저장·조회·export되지만 이 두 소비 경로에는 쓰이지 않는다. 최근 참석 이력 기반 행동 근사는 내부 저장/export만 되고 API/UI에는 아직 없다.

이 도메인은 기능 PRD 7개로 구성된다. 현재 기능별 trace source는 총 18개이고, risk 후보는 총 15개다. 도메인 수준의 판단은 아래 기능별 PRD와 실제 Controller/Service/VO/Flutter 소비 근거를 따라가며 확정한다.

2026-06-04 기준 호스트 리뷰 모더레이션(답변/임시 숨김) 기능이 서버와 앱 모두 구현 완료됐다(F11-07). ReportType이 8종으로 확장되어 CLUB 신고가 지원된다(v1 운영자 수동). 신뢰점수 임계값이 서버 단일출처로 통합됐다(클라 하드코딩 제거, b0dc370).

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F11-01 | F11-01. 이벤트 리뷰 작성 | [F11-01_event-review-write_prd.md](../02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | [F11-01_event-review-write](../../units/11_review_report/F11-01_event-review-write) | 갱신 완료 (2026-07-29) | 1 | 1 |
| F11-02 | F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) | [F11-02_review-list_prd.md](../02_feature_prds/11_review_report/F11-02_review-list_prd.md) | [F11-02_review-list](../../units/11_review_report/F11-02_review-list) | 갱신 완료 (2026-06-05) | 2 | 2 |
| F11-03 | F11-03. 리뷰 수정 & 삭제 | [F11-03_review-edit-delete_prd.md](../02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | [F11-03_review-edit-delete](../../units/11_review_report/F11-03_review-edit-delete) | 전환 완료 | 2 | 3 |
| F11-04 | F11-04. 신고 (이벤트/사용자/리뷰/클럽/카풀) | [F11-04_report_prd.md](../02_feature_prds/11_review_report/F11-04_report_prd.md) | [F11-04_report](../../units/11_review_report/F11-04_report) | 갱신 완료 (2026-06-05) | 2 | 3 |
| F11-05 | F11-05. 신뢰점수 & 변동 이력 | [F11-05_trust-score_prd.md](../02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | [F11-05_trust-score](../../units/11_review_report/F11-05_trust-score) | 갱신 완료 (2026-07-29) | 3 | 1 |
| F11-06 | F11-06. 취향 평가 & 취향 프로필 | [F11-06_taste-profile_prd.md](../02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | [F11-06_taste-profile](../../units/11_review_report/F11-06_taste-profile) | 갱신 완료 (2026-07-29) | 5 | 1 |
| F11-07 | F11-07. 호스트 리뷰 모더레이션 (답변 · 임시 숨김) | [F11-07_review-moderation_prd.md](../02_feature_prds/11_review_report/F11-07_review-moderation_prd.md) | — | 신규 작성 (2026-06-05) | 3 | 4 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F11-07](../02_feature_prds/11_review_report/F11-07_review-moderation_prd.md) | F11-07. 호스트 리뷰 모더레이션 | Risk 후보 4 (답변 수정 미배선, autoEscalate 불일치, 알림 미구현, 엔티티 직접 반환) |
| [F11-03](../02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | F11-03. 리뷰 수정 & 삭제 | Risk 후보 3 |
| [F11-04](../02_feature_prds/11_review_report/F11-04_report_prd.md) | F11-04. 신고 (이벤트/사용자/리뷰/클럽/카풀) | Risk 후보 3 |
| [F11-02](../02_feature_prds/11_review_report/F11-02_review-list_prd.md) | F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) | Risk 후보 2 (호스트 답변 수정 409 잠재) |
| [F11-05](../02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | F11-05. 신뢰점수 & 변동 이력 | Risk 후보 1 (상세 PRD §8 참조) |
| [F11-06](../02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | F11-06. 취향 평가 & 취향 프로필 | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (7개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F11-01 | 이벤트 리뷰 작성 | 참석한 이벤트에 별점(1~5)과 텍스트 후기를 남긴다 | 별점 탭, 후기 입력, "제출" 탭 |
| F11-02 | 리뷰 목록 조회 (이벤트별/사용자별) | 이벤트 또는 사용자 단위로 받은 리뷰 목록과 평균 별점·분포를 본다 | 이벤트 리뷰 탭/사용자 프로필 리뷰 탭 진입, 스크롤 |
| F11-03 | 리뷰 수정 & 삭제 | 본인이 작성한 리뷰를 수정하거나 삭제한다 | 리뷰 카드의 수정/삭제 액션 |
| F11-04 | 신고 (이벤트/사용자/리뷰/클럽/글/댓글) | 부적절한 콘텐츠를 신고 유형 + 상세 설명으로 운영자에게 접수한다. 증빙 파일 첨부(max 5개) 지원. CLUB(7) 서버 지원(v1 수동). 클럽 글(COMMUNITY_POST, 9)·댓글(COMMUNITY_COMMENT, 10) 신고 서버 지원 추가(2026-07-01), 클라 실배선 완료(기존 기만 토스트/pop 제거). | 신고 대상의 "신고" 탭 → 유형 선택 → 상세 설명 입력 → "신고" 탭 |
| F11-05 | 신뢰점수 & 변동 이력 | 현재 앱에서는 본인의 점수·등급·기간별 이력을 본다. 서버는 양방향 비차단 사용자라면 임의 userId의 점수와 이력까지 반환한다. 다음 등급 임계는 서버 nextGradeScore 값 사용. | 마이페이지의 신뢰점수 진입, 기간(1주/1개월/3개월) 변경 |
| F11-06 | 취향 평가 & 취향 프로필 | 이벤트 선택형 피드백으로 쌓인 긍정 태그 가중치, 선언 선호, 내부 행동 근사를 관리한다 | 피드백 작성, 취향 프로필 조회, "선호도 설정" 바텀시트에서 카테고리/시간/그룹 선택 → 저장 |
| F11-07 | 호스트 리뷰 모더레이션 (답변·임시 숨김) | 이벤트 호스트가 본인 이벤트에 달린 리뷰에 답변을 달고(1:1, 24h 수정), 임시 숨김(6종 사유코드, autoEscalate→신고 자동생성) 처리한다 | 리뷰 카드 더보기 → 답변하기 / 임시 숨김 / 숨김 해제 |

> M = 7 기능. F11-01 ~ F11-03은 공개 리뷰 라이프사이클, F11-04는 신고 접수, F11-05는 신뢰점수, F11-06은 본인이 남긴 이벤트 선택형 피드백과 취향 프로필, F11-07은 호스트 모더레이션이다. 컨트롤러에는 본인이 접수한 신고 목록 조회(`GET /api/v1/reports/my`)도 존재하나 F11-04에 흡수한다. UI 스펙(SCR-RR-005)의 행동 근사 차트는 현재 `TasteProfileVo`/Flutter 화면에 없으므로 구현 기능으로 보지 않는다.

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

### F11-04 신고 (이벤트/사용자/리뷰/클럽/글/댓글)

- **사용자 가치**: 부적절한 콘텐츠를 운영자에게 빠르게 전달해 커뮤니티 품질을 자정한다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/report_screen.dart` (SCR-RR-003)
- **백엔드 엔드포인트** (`ReportController`):
  - `POST /api/v1/reports` — `ReportParam` (`targetType`, `targetId`, `reason`, `description?`), 201 + `ReportVo`
  - `GET /api/v1/reports/my` — 200 + `List<ReportVo>` (본인이 접수한 신고 이력)
- **선결 조건/상태**: 로그인 상태. `targetType ∈ {EVENT, USER, REVIEW, CLUB, COMMUNITY_POST, COMMUNITY_COMMENT}`(클라이언트 라벨 매핑 기준), `reason`은 `ReportReason` enum(클라이언트는 `SPAM/HARASSMENT/INAPPROPRIATE_CONTENT/FALSE_INFORMATION/FRAUD/OTHER` 라벨 노출, "OTHER" 선택 시 상세 설명 10자 이상 필수). 본인 신고 불가(400 CANNOT_REPORT_SELF), 동일 대상 중복 신고 불가(409 ALREADY_REPORTED).
- **신고자 익명성**: 이벤트 신고를 받은 피신고 호스트 인박스에 신고자 신원이 포함되지 않는다. 신고 내용과 처리 상태만 호스트에게 전달되며, 신고자 신원은 운영팀 전용이다.
- **결과 상태 변화**:
  - 성공: `Report` 레코드 생성 → "신고 접수 완료" 다이얼로그 → 이전 화면 복귀
  - 실패: 400 CANNOT_REPORT_SELF(토스트 후 뒤로), 404 TARGET_NOT_FOUND(토스트 후 뒤로), 409 ALREADY_REPORTED(토스트 후 뒤로), 500(토스트)

### F11-05 신뢰점수 & 변동 이력

- **사용자 가치**: 자신의 활동(참석/리뷰/주최/노쇼/신고 접수 등)이 정량 점수와 등급(BRONZE/SILVER/GOLD/PLATINUM/DIAMOND)으로 환산된 결과와 변동 이력을 확인한다. 타인 점수 화면 분기는 있으나 현재 이를 여는 presentation CTA는 없다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/trust_score_screen.dart` (SCR-RR-004)
- **백엔드 엔드포인트**:
  - `GET /api/v1/users/{userId}/trust-score` (`ReviewController#getTrustScore`) — 200 + `TrustScoreVo` (`trustScore`, `grade`, `breakdown`)
  - `GET /api/v1/users/me/trust-score` (`ReviewController#getMyTrustScore`) — 본인 단축 경로
  - `GET /api/v1/users/{userId}/trust-score/history?days={N}` (`ScoreHistoryController#getScoreHistory`) — `days` 기본 90, 최대 365 클램프, 200 + `ScoreHistoryVo` (`history[]: {date, totalScore, changeReason}`)
- **선결 조건/상태**: 본인 조회는 자신의 토큰만 있으면 충분하다. 서버의 타인 점수와 이력 조회는 모두 인증 + 양방향 비차단만 검사하며 owner-only를 강제하지 않는다. 차단 관계(양방향 어느 쪽이든)이면 타인 신뢰점수와 이력을 열람할 수 없다.
- **결과 상태 변화**:
  - 데이터: 원형 게이지(0~100) + 등급 배지 + 점수 구성(`breakdown`) + 현재 앱 본인 모드의 변동 이력 리스트 + 기간 셀렉터(7/30/90일)
  - 다음 등급까지 남은 점수: 서버 `nextGradeScore`를 사용하며 최고 등급 DIAMOND에서는 null
  - 에러: 404 USER_NOT_FOUND(다이얼로그 후 뒤로), 500(토스트)

### F11-06 취향 평가 & 취향 프로필

- **사용자 가치**: 종료 이벤트에서 또 함께하고 싶은 사람·긍정 인상·분위기를 비공개로 남기고, 본인이 남긴 선택의 긍정 태그 가중치와 선언 선호를 확인·관리한다. 받은 선택은 노출하지 않는다.
- **주요 화면**:
  - `community_app/lib/presentation/review/screens/taste_profile_screen.dart` (SCR-RR-005, "선호도 설정" 바텀시트 포함)
- **백엔드 엔드포인트**:
  - 이벤트 피드백 (`EventFeedbackController`):
    - `GET /api/v1/events/{eventId}/feedback/candidates` — 함께한 사람 피드백 후보
    - `POST /api/v1/events/{eventId}/feedback` — 이벤트 선택 피드백 제출 + 취향 프로필 재구축
    - `GET /api/v1/feedback/me` / `GET /api/v1/feedback/me/stats` — 본인 피드백 이력/통계
  - 데이트 만남 피드백 (`DateMeetingFeedbackController`, 별도 privatedate 원본이며 TasteProfile 재구축에는 미사용):
    - `POST /api/v1/date/meetings/{meetingId}/feedback` — 완료된 만남 피드백 제출
    - `GET /api/v1/date/meetings/{meetingId}/feedback/me` — 호출자 본인 응답 상태만 조회
  - 취향 프로필 (`TasteProfileController`):
    - `GET /api/v1/taste/profile` — 200 + `TasteProfileVo` (`positiveTagWeights`, `preferredCategories`, `preferredTimeSlots`, `preferredGroupSize`, `updatedAt`)
    - `PUT /api/v1/taste/preferences` — `TastePreferenceParam` body, 200 + 갱신된 `TasteProfileVo`
- **선결 조건/상태**: 모두 로그인 상태다. 이벤트 피드백은 종료 후 7일 이내, 증거등급 참석, 차단·본인 제외 후보 2명 이상이어야 한다. 한 이벤트/응답자당 응답 1개이며 같은 `clientRequestId` 재시도만 멱등 반환한다. 프로필 태그가 3개 미만이면 레이더 차트는 비표시한다.
- **결과 상태 변화**:
  - 이벤트 피드백 생성: `EventFeedbackChoice` 누적 → `positiveTagWeights`와 `behaviorStyleEstimate` 재구축
  - 프로필 갱신: 카테고리/시간대/그룹 크기 저장. 현재 사람 추천·관계 공통점은 카테고리/시간대만 소비하고 그룹 크기는 저장·조회·export에 머문다.
  - 빈 상태: "아직 취향 데이터가 부족합니다" / "아직 고른 사람이 없습니다"
  - 에러: 404 PROFILE_NOT_FOUND(빈 상태 표시, 최초 데이터 없음), 500(토스트)

---

## 7. Gap / Risk Rollup

| 기능 | 제목 | Risk 수 | 처리 기준 |
|---|---|---:|---|
| [F11-01](../02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | F11-01. 이벤트 리뷰 작성 | 1 | EventFeedback의 본인 작성 `vibeTags`가 export에서 누락 — 기능 PRD 참조 |
| [F11-07](../02_feature_prds/11_review_report/F11-07_review-moderation_prd.md) | F11-07. 호스트 리뷰 모더레이션 | 4 | 답변 수정 UI 미배선(409 잠재), autoEscalate 기본값 불일치, 알림 미구현, 엔티티 직접 반환 — 기능 PRD §8 참조 |
| [F11-03](../02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | F11-03. 리뷰 수정 & 삭제 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 source 대조로 확정 |
| [F11-04](../02_feature_prds/11_review_report/F11-04_report_prd.md) | F11-04. 신고 (이벤트/사용자/리뷰/클럽/카풀) | 3 | DDL COMMENT 불일치, contextId 미배선(현재 영향 없음), OTHER 서버 미검증 — 기능 PRD §8 참조 |
| [F11-02](../02_feature_prds/11_review_report/F11-02_review-list_prd.md) | F11-02. 리뷰 목록 조회 (이벤트별 / 사용자별) | 2 | 정렬 미구현, 답변 수정 경로 미배선(409 잠재) — 기능 PRD §8 참조 |
| [F11-05](../02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | F11-05. 신뢰점수 & 변동 이력 | 1 | features.js 정본 기준 후보 1건 — 상세 PRD §8 참조 |
| [F11-06](../02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | F11-06. 취향 평가 & 취향 프로필 | 1 | 참석 이력 변경 후 다음 이벤트 피드백 제출 전까지 행동 근사 갱신 지연 — 기능 PRD §8 참조 |

### 접근권한 감사 교정 (2026-07-02)

접근권한 감사(2026-06-30~07-01)에서 확정·교정된 사항이다. 서버 코드에만 적용됐다.

**신고자 익명성 보호 (F11-F1).** 이벤트 신고 호스트 인박스에 신고자 userId가 포함되어 있었으나 제거됐다. 피신고 호스트는 신고 내용과 처리 상태만 확인할 수 있으며, 자신을 신고한 사용자 신원은 알 수 없다.

**임시숨김 리뷰 본문·사유 마스킹 (F11-F2).** 임시숨김(temporarilyHidden) 처리된 리뷰는 리뷰 작성자와 이벤트 호스트 외의 뷰어에게 본문이 제거된 상태로 전달된다. 호스트가 입력한 숨김 사유 텍스트도 호스트 본인 외에는 노출되지 않는다. 숨김 상태 코드와 사유 코드는 모든 뷰어에게 유지된다.

**신뢰점수 차단 게이트 (F11-F3).** 차단 관계(양방향)인 상대의 신뢰점수를 조회하면 USER_NOT_FOUND가 반환된다. 이전에 점수 이력 조회는 차단 게이트가 있었으나 점수 단건 조회는 누구에게나 열람 가능했다.

**클럽 글·댓글 신고 실배선 (D-F11-1).** 클럽 게시글 신고가 기존에는 클라이언트에서 기만 토스트(접수된 것처럼 보이나 실제 API 미호출) 또는 단순 pop으로 처리됐다. 서버에 COMMUNITY_POST(9)·COMMUNITY_COMMENT(10) 신고 유형이 추가됐고, 클라이언트가 실제 신고 화면으로 연결됐다(중복 차단, 사유/증빙 입력 포함).

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.

## 9. 선택형 피드백·행동 근사·데이트 옵트인 재실측 (2026-07-29)

F11-01의 별점/텍스트 Review와 별도로 EventFeedback은 또 만나고 싶은 사람과 모임 분위기를 수집한다. `vibeTags`는 `LIVELY`, `CALM`, `TALKATIVE`, `FOCUSED`, `WELCOMING`, `ORGANIZED`, `FREE_FLOWING`, `DRINKS_CENTERED` 중 선택 최대 3개다. 본인 제출만 조회되며 받은 선택/상대 응답/상호 결과는 노출하지 않는다.

F11-06 `UserTasteProfile.behaviorStyleEstimate`는 최근 12개월 증거등급 참석 이벤트 3건 이상에서 `ACTIVITY_LEVEL`, `GROUP_SIZE_PREFERENCE` 두 축을 산출한다. 3건 미만이면 축 없이 `INSUFFICIENT_EVIDENCE`를 저장한다. 재계산은 이벤트 피드백 제출 성공 때 일어난다.

현재 `TasteProfileVo`와 Flutter 화면은 행동 근사를 노출하지 않지만 데이터 export의 `taste` 섹션은 포함한다. 이벤트/클럽 fit preview는 행동 근사가 아니라 최신 제출 trait 점수만 쓴다. EventFeedback의 사용자 작성 `vibeTags`가 export에서 누락된 것은 확정 Gap이다.

F11-05 신뢰점수는 양쪽 데이팅 프로필의 `communityDataOptIn`이 모두 true일 때만 내부 후보 유사도 0.15 성분으로 사용된다. 원점수나 성분별 점수는 데이팅 카드에 노출하지 않는다.
