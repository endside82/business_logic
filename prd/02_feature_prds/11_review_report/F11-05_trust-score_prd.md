# F11-05. 신뢰점수 & 변동 이력 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/11_review_report/F11-05_trust-score -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/11_review_report/F11-05_trust-score`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자의 활동·인증·패널티를 가중합한 0~100 신뢰점수와 등급(BRONZE/SILVER/GOLD/PLATINUM/DIAMOND), 그리고 본인용 점수 변동 스냅샷 이력을 제공한다. 점수 자체는 호출 시점에 즉시 산정해 응답하며, 누적 이력(`ScoreSnapshot`)은 다른 도메인에서 `TrustScoreService.recalculate(userId)`가 호출될 때마다 변동치 ≥ 1.0 조건으로만 추가된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지(프로필 탭) → "신뢰점수" 항목 → `Routes.profileTrustScore` → `TrustScoreScreen(userId: 본인 userId, isMyScore: true)`
- 사용자 프로필(타인) → "신뢰점수" 영역 → `TrustScoreScreen(userId: 99, isMyScore: false)`

`isMyScore`는 본인 단축 엔드포인트(`/me/trust-score`) 사용 여부와 변동 이력 섹션 노출 여부를 결정한다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/11_review_report/F11-05_trust-score/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/11_review_report/F11-05_trust-score/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/11_review_report/F11-05_trust-score/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/11_review_report/F11-05_trust-score/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/review/controller/ReviewController.java:68` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/ReviewController.java:74` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/ScoreHistoryController.java:20` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입(본인 모드): `myTrustScoreNotifierProvider` watch
   → `ReviewRepository.getMyTrustScore()` → `GET /api/v1/users/me/trust-score`
2. 화면 진입(타인 모드): `trustScoreNotifierProvider(userId)` watch
   → `ReviewRepository.getTrustScore(userId)` → `GET /api/v1/users/{userId}/trust-score`
3. 변동 이력(본인 모드 한정): `_buildHistorySection`이 `scoreHistoryNotifierProvider(userId, days: _selectedPeriodDays)` watch
   → `ReviewRepository.getScoreHistory(userId, days)` → `GET /api/v1/users/{userId}/trust-score/history?days=N`
   → `_selectedPeriodDays` 변경 시 패밀리 키가 바뀌어 자동 재호출
4. 재시도: 각 provider invalidate

## 4. 서버 계약

### 개요

사용자의 활동·인증·패널티를 가중합한 0~100 신뢰점수와 등급(BRONZE/SILVER/GOLD/PLATINUM/DIAMOND), 그리고 본인용 점수 변동 스냅샷 이력을 제공한다. 점수 자체는 호출 시점에 즉시 산정해 응답하며, 누적 이력(`ScoreSnapshot`)은 다른 도메인에서 `TrustScoreService.recalculate(userId)`가 호출될 때마다 변동치 ≥ 1.0 조건으로만 추가된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/users/{userId}/trust-score` | `ReviewController#getTrustScore` | required | 임의 사용자 신뢰점수 |
| GET | `/api/v1/users/me/trust-score` | `ReviewController#getMyTrustScore` | required | 본인 단축 경로 |
| GET | `/api/v1/users/{userId}/trust-score/history?days=N` | `ScoreHistoryController#getScoreHistory` | required | 스냅샷 이력 + 추세 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `TrustScore` (`review/model/TrustScore.java`): `userId`(unique), `reviewScore`, `verificationScore`, `activityScore`, `penaltyScore`, `totalScore`(default 50.0), `grade`(default "BRONZE"), `reviewCount`, `eventCount`, `noShowCount`, `reportCount`. `recalculate`에서 갱신.
- **Entity** `ScoreSnapshot` (`review/model/ScoreSnapshot.java`): 일자별 스냅샷. 인덱스 `(user_id, snapshot_date)`.
- 등급 enum 형태가 아닌 String 상수로 관리(`DIAMOND/PLATINUM/GOLD/SILVER/BRONZE`).

### 의존 단위 / 외부 시스템

- **F11-01 / F11-03**: 리뷰 작성/수정/삭제 시 `recalculate(revieweeId)` 호출 → 본 단위가 갱신/스냅샷 적재
- **F11-04**: `RESOLVED`/`ESCALATED` 신고가 `PenaltyScoreCalculator`에 직접 영향
- **Account 도메인**: `VerificationScoreCalculator`가 `Users`/`Member`/`SocialLogin`을 조회 (이메일 인증, 전화번호, 프로필, 소셜 연동 수)
- **Capacity / Event 도메인**: `ActivityScoreCalculator`가 `EventAttendance`/`Event` 카운트 사용
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- 마이페이지(프로필 탭) → "신뢰점수" 항목 → `Routes.profileTrustScore` → `TrustScoreScreen(userId: 본인 userId, isMyScore: true)`
- 사용자 프로필(타인) → "신뢰점수" 영역 → `TrustScoreScreen(userId: 99, isMyScore: false)`

`isMyScore`는 본인 단축 엔드포인트(`/me/trust-score`) 사용 여부와 변동 이력 섹션 노출 여부를 결정한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | 라우트 상수 | Screen 파일 | 역할 |
|---|---|---|---|
| 프로필 탭 내부 stateful sub-route | `Routes.profileTrustScore` (`core/router/routes.dart:106`) | `presentation/review/screens/trust_score_screen.dart` | 점수/등급/구성/이력 대시보드 |

`app_router.dart:1832-1839` 부근에서 `TrustScoreScreen(userId: ..., isMyScore: true)`로 구성.

### 화면별 구성 요소 & 액션

### 신뢰점수 (`trust_score_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '신뢰점수')`
  - 원형 게이지(160×160, `_ScoreGaugePainter`): 회색 배경 호 + 등급 색상 호(시작 -135°, 360° 중 270° 영역). 중앙 큰 숫자(`trustScore.toStringAsFixed(1)`, fontSize 48) + "/ 100" 보조 캡션
  - 등급 배지(둥근 캡슐, 등급 색상 배경, 흰 텍스트 + 아이콘): PLATINUM=`Color(0xFF6B7FD7)` + `diamond_outlined`, GOLD=`AppColors.warning500` + `workspace_premium`, SILVER=`AppColors.gray400` + `military_tech`, BRONZE=`Color(0xFFCD7F32)` + `emoji_events_outlined`
  - "다음 등급까지 N점" 라벨 (BRONZE→40, SILVER→60, GOLD→80, PLATINUM→null)
  - "점수 구성" 섹션: `breakdown` 맵을 카드 리스트로 노출. 키 매핑(`attendance/review/good_review/hosting/base`) 한국어 라벨 + 아이콘 + 부호와 함께 점수 표시. 양수면 primary500, 음수면 error500.
  - 본인 한정: "변동 이력" 헤딩 + 기간 셀렉터(7/30/90일, equal-width tabs) + 이력 카드(날짜 4자리 MM-DD + 사유 + 총점 라벨) 또는 "변동 이력이 없습니다"
- **사용자가 할 수 있는 액션**:
  - 기간 셀렉터 탭 → `_selectedPeriodDays` 변경 → `scoreHistoryNotifierProvider(userId, days)` 다시 watch
  - 본인 화면에서 변동 이력은 `userId`가 명시되지 않으면 노출되지 않음(코드상 `_buildHistorySection`이 `widget.userId == null`이면 SizedBox 반환 — 본인 모드도 userId가 필요)
  - 에러 시 `AppErrorState.fromError(error, onRetry)` "다시 시도" → 해당 provider invalidate
- **상태 분기**:
  | AsyncValue | 처리 |
  |---|---|
  | data | 게이지+등급+breakdown(+이력) 정상 노출 |
  | loading | `CircularProgressIndicator` 중앙 |
  | error | `AppErrorState.fromError` |
  | history empty | "변동 이력이 없습니다" |

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입(본인 모드): `myTrustScoreNotifierProvider` watch
   → `ReviewRepository.getMyTrustScore()` → `GET /api/v1/users/me/trust-score`
2. 화면 진입(타인 모드): `trustScoreNotifierProvider(userId)` watch
   → `ReviewRepository.getTrustScore(userId)` → `GET /api/v1/users/{userId}/trust-score`
3. 변동 이력(본인 모드 한정): `_buildHistorySection`이 `scoreHistoryNotifierProvider(userId, days: _selectedPeriodDays)` watch
   → `ReviewRepository.getScoreHistory(userId, days)` → `GET /api/v1/users/{userId}/trust-score/history?days=N`
   → `_selectedPeriodDays` 변경 시 패밀리 키가 바뀌어 자동 재호출
4. 재시도: 각 provider invalidate

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 원형 게이지 시작 각도 -135°(`-π·0.75`), 스윕 270°(`π·1.5`) — 클라이언트 페인팅 정책
- 등급별 색상/아이콘 매핑 (5등급 중 DIAMOND는 클라이언트 매핑 미정 → 폴백)
- 등급 임계 클라이언트 정책: BRONZE 40/SILVER 60/GOLD 80/PLATINUM max — 서버 임계(SILVER 40+, GOLD 60+, PLATINUM 75+, DIAMOND 90+)와 불일치
- "변동 이력" 섹션은 본인 모드에서만 노출 — 타인 점수는 점수/등급/구성만 노출
- 기간 셀렉터 옵션 7/30/90일 — UI 정책. 서버는 `days` 1~365 허용
- 변동 이력 카드의 점수는 항상 "+" 부호로 표시(델타가 아닌 totalScore 그대로)되며 색상은 항상 primary500 — UX적으로 변동치 표기는 정확하지 않음(서버 응답에 delta 필드 없음, totalScore만)
- breakdown 키 매핑(`attendance/review/good_review/hosting/base`)은 클라이언트가 가지고 있으나 서버 응답 키는 `activityScore/verificationScore/penaltyScore/activityWeight/...` — 매핑되지 않는 키는 그대로 키 이름이 라벨로 노출됨(폴백 `default: return key`)
- 토스트/다이얼로그 카피
- 점수 표기 소수1자리(`toStringAsFixed(1)`)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 본인 신뢰점수 첫 조회 (Happy Path) | 이메일 인증 완료, 전화 인증 완료, 프로필 사진 등록, 이벤트 8개 참석, 주최 1회. | 화면 데이터로 채워짐. |
| S2 | 기간 셀렉터 변경 (7→30→90일) | 본인 신뢰점수 화면. | 30일 데이터 노출. |
| S3 | 타인 신뢰점수 조회 (이력 비공개) | 사용자 프로필에서 "신뢰점수" 진입. | 점수와 등급, 구성만 보임. |
| S4 | 신뢰점수 변동 트리거 (간접 이벤트) | 점수 64.0 (GOLD), `score_snapshot` 가장 최근 64.0. | 변동 1건이 history 리스트 끝에 추가됨. |
| S5 | 변동치 1.0 미만 — 스냅샷 미적재 | 작은 활동(신청 취소 등)을 한 사용자. | 점수만 갱신, 이력 리스트 동일. |
| S6 | 추세(trend) 판정 | 30일 내 스냅샷 first=58, last=68. | 응답에 trend 포함. |
| S7 | 데이터 없음 — 빈 이력 | `score_snapshot` 0건. | 빈 상태 정상 노출. |

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
| 후보 | backend.md:97 | > 클라이언트 UI는 BRONZE 40 / SILVER 60 / GOLD 80 / PLATINUM max 임계로 "다음 등급까지 N점"을 표시 — 서버 임계와 다름(서버는 GOLD 60+, PLATINUM 75+, DIAMOND 90+). 클라이언트 코드 보강 시 서버 임계로 맞추는 것이 정확. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 본인 신뢰점수 첫 조회 (Happy Path)**: Given 이메일 인증 완료, 전화 인증 완료, 프로필 사진 등록, 이벤트 8개 참석, 주최 1회. When 사용자가 해당 흐름을 실행하면 Then 화면 데이터로 채워짐.
- **AC-02. 기간 셀렉터 변경 (7→30→90일)**: Given 본인 신뢰점수 화면. When 사용자가 해당 흐름을 실행하면 Then 30일 데이터 노출.
- **AC-03. 타인 신뢰점수 조회 (이력 비공개)**: Given 사용자 프로필에서 "신뢰점수" 진입. When 사용자가 해당 흐름을 실행하면 Then 점수와 등급, 구성만 보임.
- **AC-04. 신뢰점수 변동 트리거 (간접 이벤트)**: Given 점수 64.0 (GOLD), `score_snapshot` 가장 최근 64.0. When 사용자가 해당 흐름을 실행하면 Then 변동 1건이 history 리스트 끝에 추가됨.
- **AC-05. 변동치 1.0 미만 — 스냅샷 미적재**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 점수만 갱신, 이력 리스트 동일.
- **AC-06. 추세(trend) 판정**: Given 30일 내 스냅샷 first=58, last=68. When 사용자가 해당 흐름을 실행하면 Then 응답에 trend 포함.
- **AC-07. 데이터 없음 — 빈 이력**: Given `score_snapshot` 0건. When 사용자가 해당 흐름을 실행하면 Then 빈 상태 정상 노출.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
