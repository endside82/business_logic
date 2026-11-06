# F11-05. 신뢰점수 & 변동 이력 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- updated: 2026-07-29; delta: 2026-07-29 bilateral dating community-data opt-in use measured -->

## 1. 결론

사용자의 활동·인증·패널티를 가중합한 0~100 신뢰점수와 등급(BRONZE/SILVER/GOLD/PLATINUM/DIAMOND), 그리고 점수 변동 스냅샷 이력을 제공한다. Flutter 화면은 이력을 본인 모드에서만 그리지만 서버 history API도 본인만 조회할 수 있고 다른 사용자의 이력 요청은 거절된다. 누적 이력은 `TrustScoreService.recalculate(userId)`가 호출될 때 변동치 ≥ 1.0 조건으로 추가된다.

### 2026-07-29 소스 재실측 — 데이팅 점수 입력의 동의 경계

`MatchScoringService`는 두 데이팅 프로필의 신뢰점수 유사도를 기본 가중치 0.15 성분으로 갖지만, **양쪽 모두 `communityDataOptIn=true`일 때만** 읽는다. 한쪽이라도 미동의면 신뢰점수와 관심사 태그 성분을 모두 제외하고 지역·상호 연령 선호·활동성의 가중치 합으로 재정규화한다. 따라서 미동의/신뢰점수 없음은 0점 벌점이 아니다.

이 사용은 내부 후보 정렬 입력이며 상대 신뢰점수 원값·유사도·성분별 점수는 데이팅 카드에 내려가지 않는다. 커뮤니티의 직접 타인 신뢰점수 조회는 기존 양방향 차단 게이트를 그대로 유지하고, 데이팅 옵트인과는 별도 계약이다.

실측 근거: `MatchScoringService.calculateMatchScore`, `DateProfile.communityDataOptIn`, `DateProfileService`, `TrustScoreRepository`, 관련 matching/profile service tests.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지(프로필 탭) → "신뢰점수" 항목 → `Routes.profileTrustScore` → `TrustScoreScreen(userId: 본인 userId, isMyScore: true)`
- 타인 모드 Provider/화면 분기는 존재하지만 `TrustScoreScreen(isMyScore: false)`를 여는 presentation caller는 확인되지 않는다. 이벤트 상세 호스트 카드는 별도 인라인 응답을 사용한다.

`isMyScore`는 화면 코드에서 본인 단축 엔드포인트(`/me/trust-score`)와 변동 이력 섹션 노출 여부를 결정한다. 이는 UI 정책이며 서버 history의 소유자 권한 검사는 아니다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ReviewController`, `ScoreHistoryController`, `TrustScore`, `ScoreSnapshot`, `TrustScoreVo`, `TrustScoreService`. 앱: `trust_score_screen.dart`, `routes.dart`, `app_router.dart`.

## 3. 전체 동작 흐름

1. 화면 진입(본인 모드): `myTrustScoreNotifierProvider` watch
   → `ReviewRepository.getMyTrustScore()` → `GET /api/v1/users/me/trust-score`
2. 화면 진입(타인 모드): `trustScoreNotifierProvider(userId)` watch
   → `ReviewRepository.getTrustScore(userId)` → `GET /api/v1/users/{userId}/trust-score`
3. 변동 이력(현재 UI는 본인 모드 한정): `_buildHistorySection`이 `scoreHistoryNotifierProvider(userId, days: _selectedPeriodDays)` watch
   → `ReviewRepository.getScoreHistory(userId, days)` → `GET /api/v1/users/{userId}/trust-score/history?days=N`
   → `_selectedPeriodDays` 변경 시 패밀리 키가 바뀌어 자동 재호출
4. 재시도: 각 provider invalidate

## 4. 제품 규칙

- 신뢰점수는 인증, 활동, 패널티를 합친 0~100점이다. 운영자의 수동 조정 값은 다시 계산해도 지워지지 않고 총점에 더해진다.
- 등급: 90 이상 DIAMOND, 75 이상 PLATINUM, 60 이상 GOLD, 40 이상 SILVER, 40 미만 BRONZE. 다음 등급까지 남은 점수는 서버가 주는 다음 등급 기준점으로 계산하고, DIAMOND에서는 표시하지 않는다.
- 패널티는 운영자가 확정하거나 이관한 신고 1건당 20점이며 100점이 상한이다.
- 변동 이력은 지난 이력보다 1점 이상 달라질 때만 새로 남는다. 추세는 최근 30일 첫 값과 끝 값의 차가 5 이상이면 상승, -5 이하면 하락, 그 밖에는 유지다.
- 변동 이력은 본인만 볼 수 있다(남이 요청하면 거절). 화면은 7, 30, 90일 기간을 고를 수 있고 이력이 없으면 안내 문구가 나온다.
- 후기 작성, 수정, 삭제 때마다 점수가 다시 계산된다. 후기를 숨겨도 별점은 점수에서 빠지지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 본인 신뢰점수 첫 조회 (Happy Path) | 이메일 인증 완료, 전화 인증 완료, 프로필 사진 등록, 이벤트 8개 참석, 주최 1회. | 화면 데이터로 채워짐. |
| S2 | 기간 셀렉터 변경 (7→30→90일) | 본인 신뢰점수 화면. | 30일 데이터 노출. |
| S3 | 타인 신뢰점수 직접 조회 / 타인 이력 요청 | 인증된 양방향 비차단 viewer가 다른 `userId`로 호출 | 점수는 반환하고 history 요청은 거절(FORBIDDEN)한다. 현재 Flutter에는 타인 점수 화면 caller가 없다. |
| S4 | 신뢰점수 변동 트리거 (간접 이벤트) | 점수 64.0 (GOLD), `score_snapshot` 가장 최근 64.0. | 변동 1건이 history 리스트 끝에 추가됨. |
| S5 | 변동치 1.0 미만 — 스냅샷 미적재 | 작은 활동(신청 취소 등)을 한 사용자. | 점수만 갱신, 이력 리스트 동일. |
| S6 | 추세(trend) 판정 | 30일 내 스냅샷 first=58, last=68. | 응답에 trend 포함. |
| S7 | 데이터 없음 — 빈 이력 | `score_snapshot` 0건. | 빈 상태 정상 노출. |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| CLOSED | 클라이언트 등급 임계 하드코딩 불일치 (GOLD 80, DIAMOND 미노출) | (2026-06-04): `trust_score_screen.dart:392-398`에서 서버 `nextGradeScore` 값으로 전환. 클라 하드코딩 제거 완료. | 해소됨. 이제 서버 임계가 단일출처. | — |
| Info | 등급 경계 PRD 오기 정정 | 기존 문서 "GOLD 80"이 오기. 서버 실제 GOLD 경계는 60+. `TrustScoreService.java:119-125` 기준. | 이 문서를 소비하는 팀에 정확한 임계 전달. | 이미 위 §4 도메인 모델 테이블에 정정 반영됨. |
| Risk | breakdown 키 매핑 불일치 | 클라 `attendance/review/good_review/hosting/base` vs 서버 `activityScore/verificationScore/penaltyScore/...` | 매핑 안 된 키가 그대로 영문 키 이름으로 노출됨 | 클라 breakdown 키 매핑 서버 응답 키와 정렬 필요 |
| Gap | Router/presentation caller 실측 | 타인 모드 `TrustScoreScreen` 분기는 있으나 이를 여는 사용자 경로가 없다. | PRD의 “사용자 프로필에서 진입” happy path가 실행 불가 | 필요 시 명시적 CTA를 연결하거나 미사용 분기 정리 |

## 9. 수용 기준

- **AC-01. 본인 신뢰점수 첫 조회 (Happy Path)**: Given 이메일 인증 완료, 전화 인증 완료, 프로필 사진 등록, 이벤트 8개 참석, 주최 1회. When 사용자가 해당 흐름을 실행하면 Then 화면 데이터로 채워짐.
- **AC-02. 기간 셀렉터 변경 (7→30→90일)**: Given 본인 신뢰점수 화면. When 사용자가 해당 흐름을 실행하면 Then 30일 데이터 노출.
- **AC-03. 타인 신뢰점수 직접 조회 / 타인 이력 요청**: Given 인증된 양방향 비차단 viewer When 다른 userId의 점수를 호출하면 Then 반환한다. 이력을 호출하면 Then 거절한다.
- **AC-04. 신뢰점수 변동 트리거 (간접 이벤트)**: Given 점수 64.0 (GOLD), `score_snapshot` 가장 최근 64.0. When 사용자가 해당 흐름을 실행하면 Then 변동 1건이 history 리스트 끝에 추가됨.
- **AC-05. 변동치 1.0 미만 — 스냅샷 미적재**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 점수만 갱신, 이력 리스트 동일.
- **AC-06. 추세(trend) 판정**: Given 30일 내 스냅샷 first=58, last=68. When 사용자가 해당 흐름을 실행하면 Then 응답에 trend 포함.
- **AC-07. 데이터 없음 — 빈 이력**: Given `score_snapshot` 0건. When 사용자가 해당 흐름을 실행하면 Then 빈 상태 정상 노출.
