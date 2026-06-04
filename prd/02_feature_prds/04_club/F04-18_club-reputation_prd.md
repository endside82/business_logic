# F04-18. 클럽 레퓨테이션 점수 PRD

<!-- source-first; updated: 2026-06-05 -->

## 1. 결론

클럽 멤버의 레퓨테이션 점수는 **마일리지·마일리지 등급·경고·심각 제재** 4개 원천을 합산해 0~100으로 계산하고, 4단계 레벨(LOW/MEDIUM/HIGH/EXCELLENT)로 변환해 표시한다. 서버 `GET /api/v1/clubs/{clubId}/reputation/me`와 `/members/{memberId}` 두 endpoint가 모두 구현돼 있고, Flutter `ReputationScoreCard` 위젯 + `reputationScoreProvider`가 이를 완전히 소비한다.

접근 권한: 본인 점수는 항상 breakdown 포함. 타 멤버는 운영진(OWNER/ADMIN)만 breakdown을 볼 수 있고, 일반 멤버는 score+level만 받는다. 비멤버는 접근 불가.

이 기능은 **F07-10 정산 신뢰도(HostSettlementReputation)**와 완전히 별개다. F07-10은 `payment/meeting` 패키지의 호스트 정산 이행 지표이고, F04-18은 `club/reputation` 패키지의 클럽 내 멤버 행동 종합 점수다. 두 점수는 서버·클라이언트 양쪽 모두 서로를 참조하지 않는다.

현재 판정: **프로덕션 사용 가능. 서버·클라이언트 정합. 단, breakdown 조회 API 미노출 Gap(이력/시간축) 한 건 존재.**

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/src/.../club/reputation/controller/ReputationScoreController.java` | endpoint 2개, 권한 분기, breakdown 포함 여부 |
| Backend Service | `community_api/src/.../club/reputation/service/ReputationScoreService.java` | 점수 공식, 원천 5개, clamp 범위 |
| Backend VO | `community_api/src/.../club/reputation/vo/ReputationScoreVo.java` | 응답 필드 4개 + breakdown nullable |
| Backend Enum | `community_api/src/.../club/reputation/constants/ReputationLevel.java` | 4단계 레벨 구간 |
| Backend Test | `ReputationScoreServiceTest.java` | 점수 공식 회귀 테스트 존재 |
| Flutter API | `community_app/lib/data/api/reputation/reputation_score_api.dart` | Retrofit 2 endpoint |
| Flutter Model | `community_app/lib/data/models/reputation/reputation_score_vo.dart`, `reputation_level.dart` | 서버 VO 1:1 매핑, fromName 파서 |
| Flutter Repository | `community_app/lib/data/repositories/reputation/reputation_score_repository.dart` | Result<T> 래핑 |
| Flutter Provider | `community_app/lib/domain/providers/reputation/reputation_providers.dart` | DI 체인, `reputationScoreProvider` |
| Flutter Widget | `community_app/lib/presentation/reputation/widgets/reputation_score_card.dart` | 표시 UI, breakdown 토글, 레벨 색상 |
| F07-10 경계 | `community_api/src/.../payment/meeting/controller/HostSettlementReputationController.java` | 다른 패키지(payment/meeting), 다른 endpoint, 다른 점수 |

## 3. 전체 동작 흐름

1. 멤버 목록·멤버 카드·상세 프로필 등에서 `ReputationScoreCard(clubId: X, memberId: Y?)` 위젯이 삽입된다.
2. `memberId`가 null이면 본인(`/me`) 호출, 아니면 `/members/{memberId}` 호출.
3. `reputationScoreProvider(clubId, memberId: memberId)`가 `ReputationScoreRepository`를 통해 서버에 GET 요청을 보낸다.
4. 서버 `ReputationScoreController`가 클럽 멤버 여부를 검증하고, `ReputationScoreService.buildScoreVo(clubId, userId, includeBreakdown)`를 호출한다.
5. 서비스는 `MileageMemberSummary`, `WarningMemberSummary`, `MileageGrade`를 조회해 점수를 계산하고 `ReputationScoreVo`를 반환한다.
6. Flutter는 `asyncScore.when(data: _buildContent)`로 `ReputationScoreCard`를 렌더한다.
7. breakdown이 있으면 우상단 토글 아이콘이 나타나고, 탭 시 5개 항목 breakdown 행을 펼친다.

## 4. 서버 계약

### 엔드포인트

| Method | Path | 인증 | breakdown 포함 조건 |
|---|---|---|---|
| GET | `/api/v1/clubs/{clubId}/reputation/me` | required (클럽 멤버) | 항상 포함 |
| GET | `/api/v1/clubs/{clubId}/reputation/members/{memberId}` | required (조회자 + 대상 모두 클럽 멤버) | 조회자가 본인이거나 운영진(OWNER/ADMIN)이면 포함, 그 외 null |

### 점수 공식 (0~100 clamp)

소스: `ReputationScoreService.java:41-48`

| 원천 | 계산 | 상한/하한 |
|---|---|---|
| `base` | 고정 50 | — |
| `mileage` | `qualifiedLifetimeEarned / 100` | cap +40 |
| `grade` | 현재 등급 `displayOrder * 2` | cap +10 |
| `warning` | `effectiveScore * -3` | cap -30 |
| `severe` | 활성 SEVERE GRANT 1건 이상 시 -20 | — |

최종 점수 = 5개 합산 후 `Math.max(0, Math.min(100, raw))`

> 마일리지 summary 미존재 시 mileage=0, grade=0. 경고 summary 미존재 시 warning=0, severe=0. 기본 점수 50 반환.

### ReputationScoreVo 응답 필드

소스: `ReputationScoreVo.java`

| 필드 | Java 타입 | Dart 타입 | 설명 |
|---|---|---|---|
| `clubId` | `long` | `int` | 클럽 ID |
| `memberId` | `long` | `int` | 멤버 사용자 ID |
| `score` | `int` | `int` | 0~100 정수 |
| `level` | `ReputationLevel` (enum) | `ReputationLevel` (enum) | LOW/MEDIUM/HIGH/EXCELLENT |
| `breakdown` | `Map<String, Integer>` | `Map<String, int>?` | 운영진/본인만 비null. key: base/mileage/grade/warning/severe |

### ReputationLevel enum

소스: `ReputationLevel.java`

| 값 | 점수 구간 | Dart enum | 표시 |
|---|---|---|---|
| `LOW` | 0~30 | `ReputationLevel.low` | 낮음 |
| `MEDIUM` | 31~60 | `ReputationLevel.medium` | 보통 |
| `HIGH` | 61~85 | `ReputationLevel.high` | 높음 |
| `EXCELLENT` | 86~100 | `ReputationLevel.excellent` | 최상 |

## 5. 프론트 계약

### 진입 경로

- 멤버 목록/카드/상세 화면에 `ReputationScoreCard` 위젯 삽입 형태 (독립 스크린 없음)
- 본인 조회: `ReputationScoreCard(clubId: X)` (memberId 생략)
- 타 멤버 조회: `ReputationScoreCard(clubId: X, memberId: Y)`

### 파일 목록

| 파일 | 역할 |
|---|---|
| `data/api/reputation/reputation_score_api.dart` | Retrofit — 2 endpoint |
| `data/models/reputation/reputation_score_vo.dart` | Freezed VO (breakdown `Map<String, int>?`) |
| `data/models/reputation/reputation_level.dart` | ReputationLevel enum + `fromName()` 파서 |
| `data/repositories/reputation/reputation_score_repository.dart` | Result<T> 래핑 |
| `domain/providers/reputation/reputation_providers.dart` | DI chain + `reputationScoreProvider` |
| `presentation/reputation/widgets/reputation_score_card.dart` | 표시 위젯 — score/level/breakdown 토글 |

### 위젯 구성 요소

- 레벨 배지 (LOW=error500/빨강, MEDIUM=warning500/주황, HIGH=primary500/초록, EXCELLENT=linkBlue/파랑)
- score 숫자 + "/100" 레이블
- breakdown 토글 아이콘 (breakdown 미포함이면 미표시)
- breakdown 5개 행 (기본/마일리지/등급/경고/심각 제재; 양수=초록, 음수=빨강, 0=회색)
- 에러 시 "신뢰도 점수를 불러올 수 없습니다." + "다시 시도" 버튼

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
