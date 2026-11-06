# F04-18. 클럽 레퓨테이션 점수 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first; updated: 2026-06-05 -->

## 1. 결론

클럽 멤버의 레퓨테이션 점수는 **마일리지·마일리지 등급·경고·심각 제재** 4개 원천을 합산해 0~100으로 계산하고, 4단계 레벨(LOW/MEDIUM/HIGH/EXCELLENT)로 변환해 표시한다. 서버 `GET /api/v1/clubs/{clubId}/reputation/me`와 `/members/{memberId}` 두 endpoint가 모두 구현돼 있고, Flutter `ReputationScoreCard` 위젯 + `reputationScoreProvider`가 이를 완전히 소비한다.

접근 권한: 본인 점수는 항상 breakdown 포함. 타 멤버는 운영진(OWNER/ADMIN)만 breakdown을 볼 수 있고, 일반 멤버는 score+level만 받는다. 비멤버는 접근 불가.

이 기능은 **F07-10 정산 신뢰도(HostSettlementReputation)**와 완전히 별개다. F07-10은 `payment/meeting` 패키지의 호스트 정산 이행 지표이고, F04-18은 `club/reputation` 패키지의 클럽 내 멤버 행동 종합 점수다. 두 점수는 서버·클라이언트 양쪽 모두 서로를 참조하지 않는다.

현재 판정: **프로덕션 사용 가능. 서버·클라이언트 정합. 단, breakdown 조회 API 미노출 Gap(이력/시간축) 한 건 존재.**

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ReputationScoreController`, `HostSettlementReputationController`, `ReputationScoreService`, `ReputationScoreVo`, `ReputationLevel`, `ReputationScoreServiceTest`. 앱: `reputation_score_api.dart`, `reputation_score_vo.dart`, `reputation_level.dart`, `reputation_score_repository.dart`, `reputation_providers.dart`, `reputation_score_card.dart`.

## 3. 전체 동작 흐름

1. 멤버 목록·멤버 카드·상세 프로필 등에서 `ReputationScoreCard(clubId: X, memberId: Y?)` 위젯이 삽입된다.
2. `memberId`가 null이면 본인(`/me`) 호출, 아니면 `/members/{memberId}` 호출.
3. `reputationScoreProvider(clubId, memberId: memberId)`가 `ReputationScoreRepository`를 통해 서버에 GET 요청을 보낸다.
4. 서버 `ReputationScoreController`가 클럽 멤버 여부를 검증하고, `ReputationScoreService.buildScoreVo(clubId, userId, includeBreakdown)`를 호출한다.
5. 서비스는 `MileageMemberSummary`, `WarningMemberSummary`, `MileageGrade`를 조회해 점수를 계산하고 `ReputationScoreVo`를 반환한다.
6. Flutter는 `asyncScore.when(data: _buildContent)`로 `ReputationScoreCard`를 렌더한다.
7. breakdown이 있으면 우상단 토글 아이콘이 나타나고, 탭 시 5개 항목 breakdown 행을 펼친다.

## 4. 제품 규칙

- 점수 = 합산 뒤 0~100 으로 자른다. 기본 50, 마일리지 누적/100(최대 +40), 등급 순서×2(최대 +10), 경고 점수×-3(최대 -30), 활성 중대 제재 있으면 -20.
- 마일리지 요약이 없으면 마일리지·등급 0, 경고 요약이 없으면 경고·중대 0 이다.
- 등급: 낮음 0~30, 보통 31~60, 높음 61~85, 최상 86~100.

## 6. 상태/권한 매트릭스

| 조회자 / 대상 | 서버 근거 | breakdown | 프론트 분기 | 사용자 결과 |
|---|---|---|---|---|
| 본인 (/me) | `requireClubMember`, `includeBreakdown=true` | 항상 포함 | `memberId == null` → `/me` | score + level + breakdown 토글 |
| 운영진(OWNER/ADMIN) → 일반 멤버 | `isAdmin(clubId, userId)=true` → `includeBreakdown=true` | 포함 | breakdown != null → 토글 노출 | score + level + breakdown 토글 |
| 일반 멤버 → 타 멤버 | `isAdmin=false` → `includeBreakdown=false` | null | breakdown == null → 토글 미표시 | score + level만 |
| 비멤버 접근 시도 | `requireClubMember` 실패 | — | `ApiError.forbidden` | 에러 카드 ("다시 시도") |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| endpoint path | `/api/v1/clubs/{clubId}/reputation/me`, `/members/{memberId}` | `reputation_score_api.dart` 동일 | 일치 |
| ReputationLevel 값 | LOW/MEDIUM/HIGH/EXCELLENT | `fromName()` 4개 case + FormatException | 일치 |
| breakdown key 목록 | base/mileage/grade/warning/severe | `_BreakdownRows`에 동일 5개 key | 일치 |
| `breakdown` nullable | 서버 null (일반 멤버 조회 시) | `Map<String, int>?` | 일치 |
| `clubId`/`memberId` 타입 | `long` | `int` | 일치 (Dart `int` = 64bit) |
| F07-10 경계 | 다른 패키지(`payment/meeting`), 다른 Controller | 다른 모델(`HostSettlementReputationVo`) | 분리됨 — 혼용 없음 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | breakdown 이력/시간축 미제공 | 현재 점수는 현시점 snapshot만 반환. "점수가 왜 낮아졌는지" 이력이 없음 | 운영 분쟁 시 점수 변화 추적 불가 | 점수 이력 endpoint 추가 검토 (현 v1에서는 필요성 결정 대기) |
| 정보 | 비멤버 접근 시 `requireClubMember` 에러 | `ClubMemberPermissionChecker.requireClubMember` 예외 | Flutter `ApiError.forbidden` → 에러 카드 표시 | 현재 동작 정상 — 문서화만 |

## 9. 수용 기준

### AC-01. 본인 점수 조회

Given 클럽 멤버인 사용자가 `/api/v1/clubs/{clubId}/reputation/me`를 호출한다.  
When 서버가 응답한다.  
Then `score` 0~100, `level` 유효값, `breakdown` 비null(base/mileage/grade/warning/severe 5개 key 포함).

### AC-02. 일반 멤버가 타 멤버 조회

Given 일반 MEMBER가 `/api/v1/clubs/{clubId}/reputation/members/{memberId}`를 호출한다.  
When 서버가 응답한다.  
Then `score`와 `level`은 정상 반환, `breakdown`은 null. Flutter 위젯에 breakdown 토글 아이콘 미표시.

### AC-03. 운영진이 멤버 조회

Given OWNER 또는 ADMIN이 `/api/v1/clubs/{clubId}/reputation/members/{memberId}`를 호출한다.  
When 서버가 응답한다.  
Then `breakdown` 비null. Flutter 위젯에 breakdown 토글 아이콘 표시, 탭 시 5개 breakdown 행 펼침.

### AC-04. 레벨 색상 분기

Given `score = 20` → `ReputationLevel.LOW`, `score = 50` → `MEDIUM`, `score = 75` → `HIGH`, `score = 90` → `EXCELLENT`.  
When Flutter `_levelColor()` 호출.  
Then LOW → `AppColors.error500`, MEDIUM → `AppColors.warning500`, HIGH → `AppColors.primary500`, EXCELLENT → `AppColors.linkBlue`.

### AC-05. 비멤버 접근 차단

Given 비멤버가 해당 클럽의 reputation endpoint를 호출한다.  
When 서버가 `requireClubMember` 검증 실패를 반환한다.  
Then Flutter는 에러 카드("신뢰도 점수를 불러올 수 없습니다.")를 표시하고 "다시 시도" 버튼을 제공한다.

### AC-06. F07-10 혼용 없음

Given 동일 사용자가 클럽 레퓨테이션 카드와 정산 신뢰도 화면을 각각 진입한다.  
When 두 API를 각각 호출한다.  
Then 클럽 레퓨테이션은 `/api/v1/clubs/{clubId}/reputation/*`을 호출하고, 정산 신뢰도는 `payment/meeting` 패키지의 별도 endpoint를 호출한다. 두 점수는 서로에게 영향을 미치지 않는다.

## 10. 미결정 / 후속

| 분류 | 항목 |
|---|---|
| 구현 검토 | 점수 이력(시간축) endpoint 추가 여부 — 운영 분쟁 대응용 |
| UX 결정 | 레퓨테이션 점수를 어떤 화면(멤버 상세/카드/목록)에서 기본 노출할지 |
| 정책 결정 | `qualifiedLifetimeEarned` mileage 점수 가중치 조정 및 레벨 구간 재조정 시점 |
| 테스트 보강 | E2E: 운영진/멤버 분기 breakdown 포함 여부, 레벨 색상 렌더링 확인 |
