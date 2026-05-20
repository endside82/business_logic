# F11-06. 취향 평가 & 취향 프로필 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/11_review_report/F11-06_taste-profile -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/11_review_report/F11-06_taste-profile`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

비공개 취향 평가(별점+태그+메모)는 다른 사용자와의 모임 후 본인만 보는 호불호 누적 데이터이며, 평가가 쌓일수록 `UserTasteProfile.positiveTagWeights`/`negativeTagWeights`가 자동 재구축된다. 별도로 사용자가 직접 선호 카테고리/시간대/그룹 크기를 설정해 추천·매칭 입력을 통제할 수 있다. 평가 생성 시점에 자기 자신/중복은 차단되고, 생성 후 `TasteProfileService.rebuildProfile`과 `CollaborativeFilteringService.rebuildNeighbors`가 부수적으로 실행된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 → "취향 프로필" → `Routes.profileTasteProfile` → `TasteProfileScreen()`
- 비공개 평가 작성 진입은 모임 종료 후 모임 정산/체크아웃 흐름 또는 별도 모달에서 트리거(현재 화면 코드에는 직접 작성 폼 노출이 없음 — `PreferenceRatingWriteNotifier`만 정의되어 외부에서 호출). 본 화면은 누적 결과의 조회·설정 중심.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/11_review_report/F11-06_taste-profile/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/11_review_report/F11-06_taste-profile/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/11_review_report/F11-06_taste-profile/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/11_review_report/F11-06_taste-profile/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/review/controller/PreferenceRatingController.java:28` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/PreferenceRatingController.java:36` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/PreferenceRatingController.java:43` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/TasteProfileController.java:23` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/TasteProfileController.java:29` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입: `tasteProfileNotifierProvider` build
   → `TasteProfileRepository.getProfile()` → `GET /api/v1/taste/profile`
2. 통계 영역 진입(자동): `myRatingStatsProvider` build
   → `PreferenceRatingRepository.getMyRatingStats()` → `GET /api/v1/ratings/me/stats`
3. 평점 기록 영역 진입(자동): `myRatingsNotifierProvider` build (page=0)
   → `PreferenceRatingRepository.getMyRatings(page: 0, size: 20)` → `GET /api/v1/ratings/me?page=0&size=20`
   → 응답은 `PageResponse<PreferenceRatingVo>` (`content`, `last` 등)
4. "더 보기": `loadMore()` → page++ → 동일 GET → state에 append, `_hasMore = !pageResponse.last`로 갱신
5. "저장": `tasteProfileNotifier.updatePreferences(param)`
   → `TasteProfileRepository.updatePreferences(param)` → `PUT /api/v1/taste/preferences`
   → 응답 `TasteProfileVo`로 state replace, 토스트 노출
6. 비공개 평가 생성: `preferenceRatingWriteNotifierProvider.notifier.submitRating(...)` (`presentation` 외부에서 호출 가정)
   → `PreferenceRatingRepository.createRating(PreferenceRatingParam)` → `POST /api/v1/ratings`
   → 성공 시 서버는 `rebuildProfile` + `rebuildNeighbors` 자동 실행. 클라이언트는 응답 후 `tasteProfileNotifierProvider`/`myRatingStatsProvider`/`myRatingsNotifierProvider` invalidate가 권장(현재 코드에는 미연결)

## 4. 서버 계약

### 개요

비공개 취향 평가(별점+태그+메모)는 다른 사용자와의 모임 후 본인만 보는 호불호 누적 데이터이며, 평가가 쌓일수록 `UserTasteProfile.positiveTagWeights`/`negativeTagWeights`가 자동 재구축된다. 별도로 사용자가 직접 선호 카테고리/시간대/그룹 크기를 설정해 추천·매칭 입력을 통제할 수 있다. 평가 생성 시점에 자기 자신/중복은 차단되고, 생성 후 `TasteProfileService.rebuildProfile`과 `CollaborativeFilteringService.rebuildNeighbors`가 부수적으로 실행된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/ratings` | `PreferenceRatingController#createRating` | required | 비공개 평가 INSERT + 프로필/이웃 재구축 |
| GET | `/api/v1/ratings/me` | `PreferenceRatingController#getMyRatings` | required | 본인 평가 목록 (Spring `Page<>`) |
| GET | `/api/v1/ratings/me/stats` | `PreferenceRatingController#getMyStats` | required | 총개수·평균·상위 태그 |
| GET | `/api/v1/taste/profile` | `TasteProfileController#getMyProfile` | required | 누적된 취향 프로필 |
| PUT | `/api/v1/taste/preferences` | `TasteProfileController#updatePreferences` | required | 카테고리/시간대/그룹 크기 갱신 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `PreferenceRating` (`review/model/PreferenceRating.java`): `raterId`, `targetUserId`, `eventId`, `rating`, `tags`(JSON String), `memo`, audit timestamps. 유니크 제약: `(raterId, targetUserId, eventId)` 한 번씩.
- **Entity** `UserTasteProfile` (`review/model/UserTasteProfile.java`): `userId`, `positiveTagWeights`/`negativeTagWeights`/`preferredCategories`/`preferredTimeSlots`/`preferredGroupSize` (모두 JSON String), audit. JSON 디코드 실패 시 null 반환(서비스 가드).
- **Enum** `ImpressionTag` (`review/constants/ImpressionTag.java`):
  - 긍정 10개: `FUNNY`, `PUNCTUAL`, `GOOD_LISTENER`, `ENERGETIC`, `THOUGHTFUL`, `CREATIVE`, `RELIABLE`, `WARM`, `INTELLIGENT`, `EASYGOING`
  - 부정 4개: `NEGATIVE_RUDE`, `NEGATIVE_LATE`, `NEGATIVE_NOSHOW`, `NEGATIVE_UNCOMFORTABLE`
  - **rebuildProfile**은 `tag.startsWith("NEGATIVE_")`로 부정 분류. 즉 `NEGATIVE_*` prefix가 핵심 규약.

### 의존 단위 / 외부 시스템

- **추천 도메인** (`CollaborativeFilteringService`): `rebuildNeighbors(raterId)` 트리거 — 본 단위는 호출만, 알고리즘은 별 단위 책임.
- **Account / Event 도메인**: `targetUserId`/`eventId`는 외부 도메인의 식별자이지만 본 서비스는 외래키 검증을 직접 수행하지 않음(존재 검증 미명시).
- 외부 시스템: 없음.

## 5. 프론트 계약

### 진입 경로

- 마이페이지 → "취향 프로필" → `Routes.profileTasteProfile` → `TasteProfileScreen()`
- 비공개 평가 작성 진입은 모임 종료 후 모임 정산/체크아웃 흐름 또는 별도 모달에서 트리거(현재 화면 코드에는 직접 작성 폼 노출이 없음 — `PreferenceRatingWriteNotifier`만 정의되어 외부에서 호출). 본 화면은 누적 결과의 조회·설정 중심.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | 라우트 상수 | Screen 파일 | 역할 |
|---|---|---|---|
| 프로필 탭 sub-route | `Routes.profileTasteProfile` (`core/router/routes.dart:107`) | `presentation/review/screens/taste_profile_screen.dart` | 취향 요약/태그/통계/평점 + 선호도 설정 시트 |

### 화면별 구성 요소 & 액션

### 취향 프로필 (`taste_profile_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '취향 프로필', actions: [Icons.settings_outlined → 선호도 시트])`
  - 본문: `SingleChildScrollView` + `screenPadding`
    1. **취향 요약 (`_TasteRadarSection`)**: `positiveTagWeights` 상위 5개로 5각형 레이더 차트(200×200, 자체 `_RadarChartPainter`, primary500 stroke + 0.2 fill). 항목 < 3이면 "아직 취향 데이터가 부족합니다" 텍스트만.
    2. **상위 관심사 (`_TopInterestsSection`)**: 상위 4개 태그를 `AppTag` 위젯으로 wrap.
    3. **긍정적 인상 (`_TagWeightsSection` color=primary500)**: 정렬된 태그 + 가로 LinearProgress + `${(weight*100).toInt()}%`
    4. **개선 포인트 (`_TagWeightsSection` color=error500)**: `negativeTagWeights`로 동일 형태
    5. **평점 통계 (`_RatingStatsSection`)**: 카드 2개(총 평점 수=primary500 큰숫자, 평균 평점=warning500)
    6. **내 평점 기록 (`_MyRatingsSection`)**: 페이지 단위 무한 로딩(20개씩). `AppEmptyState(title: '아직 남긴 평점이 없습니다', description: '이벤트 참석 후 참가자에게 평점을 남겨보세요')` 또는 평점 카드 리스트 + "더 보기" `AppButton(variant: outline)`
    7. **"선호도 설정" 버튼 (`AppButton variant: outline`)** — 시트 트리거
  - **선호도 설정 시트 (`_PreferenceSettingsSheet`)**: 풀스크린 70% 시트(`DraggableScrollableSheet`, initial 0.7, max 0.9), 상단 핸들바 + "선호도 설정" 헤딩 + 3개 `_ChipSection`(`FilterChip`):
    - 카테고리 8개: 음식/맛집, 문화/예술, 스포츠/운동, 여행/아웃도어, 게임/취미, 교육/스터디, 네트워킹, 기타
    - 시간대 4개: 오전 (9-12), 오후 (12-18), 저녁 (18-21), 야간 (21-24)
    - 그룹 크기 3개: 소규모 (2-5명), 중규모 (6-15명), 대규모 (16명+)
    - 하단 sticky `AppButton(label: '저장', variant: primary, fullWidth)`
- **사용자가 할 수 있는 액션**:
  - 시트 진입(설정 아이콘 또는 하단 버튼) → `showModalBottomSheet`
  - FilterChip 토글 → 선택 리스트 업데이트
  - "저장" 탭 → `tasteProfileNotifier.updatePreferences(TastePreferenceParam(categories, timeSlots, groupSizes))` → `PUT /api/v1/taste/preferences`
  - 저장 완료 시 시트 닫고 `AppToast.show('선호도가 저장되었습니다')`
  - "더 보기" 탭 → `myRatingsNotifierProvider.notifier.loadMore()` → `GET /api/v1/ratings/me?page=N&size=20`
- **상태 분기**:
  | 영역 | 처리 |
  |---|---|
  | profile loading | `CircularProgressIndicator` 중앙 |
  | profile error | `AppErrorState.fromError(error, onRetry → invalidate)` |
  | radar entries < 3 | "아직 취향 데이터가 부족합니다" |
  | stats error | "통계를 불러올 수 없습니다" |
  | ratings empty | `AppEmptyState` |
  | ratings error | "평점 기록을 불러올 수 없습니다" |

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입: `tasteProfileNotifierProvider` build
   → `TasteProfileRepository.getProfile()` → `GET /api/v1/taste/profile`
2. 통계 영역 진입(자동): `myRatingStatsProvider` build
   → `PreferenceRatingRepository.getMyRatingStats()` → `GET /api/v1/ratings/me/stats`
3. 평점 기록 영역 진입(자동): `myRatingsNotifierProvider` build (page=0)
   → `PreferenceRatingRepository.getMyRatings(page: 0, size: 20)` → `GET /api/v1/ratings/me?page=0&size=20`
   → 응답은 `PageResponse<PreferenceRatingVo>` (`content`, `last` 등)
4. "더 보기": `loadMore()` → page++ → 동일 GET → state에 append, `_hasMore = !pageResponse.last`로 갱신
5. "저장": `tasteProfileNotifier.updatePreferences(param)`
   → `TasteProfileRepository.updatePreferences(param)` → `PUT /api/v1/taste/preferences`
   → 응답 `TasteProfileVo`로 state replace, 토스트 노출
6. 비공개 평가 생성: `preferenceRatingWriteNotifierProvider.notifier.submitRating(...)` (`presentation` 외부에서 호출 가정)
   → `PreferenceRatingRepository.createRating(PreferenceRatingParam)` → `POST /api/v1/ratings`
   → 성공 시 서버는 `rebuildProfile` + `rebuildNeighbors` 자동 실행. 클라이언트는 응답 후 `tasteProfileNotifierProvider`/`myRatingStatsProvider`/`myRatingsNotifierProvider` invalidate가 권장(현재 코드에는 미연결)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 카테고리/시간대/그룹크기 옵션 라벨 — 클라이언트 정의 (서버는 단순 String 리스트로 저장)
- 레이더 차트는 위젯 자체 페인팅(`_RadarChartPainter`, 3개 미만이면 비표시)
- 태그 가중치 → "%": `(weight * 100).toInt()` — 서버 가중치는 `Double::sum`으로 단순 카운트라 1.0 이상이 흔함 → 100% 초과 표기 가능 → `clamp(0.0, 1.0)` 가드(레이더만)
- 태그 라벨 포맷: `NEGATIVE_` 접두 제거 + `_` → 공백 + 단어별 capitalize
- "내 평점 기록" 페이지 사이즈 20, "더 보기"는 `AppButton(variant: outline)` 단일 버튼(스크롤 끝 자동 로드 아님)
- 평점 카드: 별 5개 (warning500 채움/textTertiary 빈), 태그 3개까지(`take(3)`) 또는 메모, 우측에 `MM/DD` 날짜
- "선호도 설정" 시트는 `showModalBottomSheet(isScrollControlled: true)` + `DraggableScrollableSheet` 조합
- `FilterChip` selectedColor = `primary500.withValues(alpha: 0.15)`, checkmarkColor = primary500
- 빈 리스트 저장 정책: 시트의 `_save`는 비어 있으면 null로 보냄 → 서버는 null이면 해당 필드 갱신 안 함(`toJson(null) → null`)
- 평가 작성용 UI는 본 단위 화면에 미존재. 모임 종료 후 별도 모달/시트에서 호출되도록 외부 모듈에 노출

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 취향 프로필 첫 진입 (Happy Path) | `user_taste_profile` 행 존재, `positiveTagWeights` 5개 이상, `preferredCategories` null. | 화면 데이터로 채워짐, 추가 액션 가능. |
| S2 | 선호도 설정 시트 — 카테고리/시간대/그룹 저장 | 프로필에 `preferredCategories=null` 등. | `user_taste_profile.preferred_categories/time_slots/group_size` JSON 갱신. 추천 도메인이 다음 호출부터 입력으로 사용. |
| S3 | 비공개 평가 생성 (외부 트리거) | 평가 작성 모달 진입(외부 화면). | `preference_rating` 1건, `user_taste_profile` 갱신, 추천 이웃 재계산. |
| S4 | 자기 자신 평가 시도 | 잘못된 호출. | INSERT 없음. |
| S5 | 동일 (rater, target, event) 중복 평가 | 같은 모임에서 같은 상대를 두 번 평가하려는 사용자. | INSERT 없음. |
| S6 | 평점 기록 더 보기 (페이지네이션) | 첫 페이지 20건 노출 + `_hasMore = true`. | 30건 모두 노출, 추가 로드 불가. |
| S7 | 데이터 부족 — 빈 상태 | 신규 가입자, 아직 평가 0건. | 빈 상태 안내 노출, 설정만 가능. |
| S8 | 부정 태그 분류 규약 | NEGATIVE 태그가 포함된 평가를 누적한 사용자. | 두 섹션 동시 갱신. |

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
| 후보 | frontend.md:64 | → 성공 시 서버는 `rebuildProfile` + `rebuildNeighbors` 자동 실행. 클라이언트는 응답 후 `tasteProfileNotifierProvider`/`myRatingStatsProvider`/`myRatingsNotifierProvider` invalidate가 권장(현재 코드에는 미연결) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 취향 프로필 첫 진입 (Happy Path)**: Given `user_taste_profile` 행 존재, `positiveTagWeights` 5개 이상, `preferredCategories` null. When 사용자가 해당 흐름을 실행하면 Then 화면 데이터로 채워짐, 추가 액션 가능.
- **AC-02. 선호도 설정 시트 — 카테고리/시간대/그룹 저장**: Given 프로필에 `preferredCategories=null` 등. When 사용자가 해당 흐름을 실행하면 Then `user_taste_profile.preferred_categories/time_slots/group_size` JSON 갱신. 추천 도메인이 다음 호출부터 입력으로 사용.
- **AC-03. 비공개 평가 생성 (외부 트리거)**: Given 평가 작성 모달 진입(외부 화면). When 사용자가 해당 흐름을 실행하면 Then `preference_rating` 1건, `user_taste_profile` 갱신, 추천 이웃 재계산.
- **AC-04. 자기 자신 평가 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-05. 동일 (rater, target, event) 중복 평가**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then INSERT 없음.
- **AC-06. 평점 기록 더 보기 (페이지네이션)**: Given 첫 페이지 20건 노출 + `_hasMore = true`. When 사용자가 해당 흐름을 실행하면 Then 30건 모두 노출, 추가 로드 불가.
- **AC-07. 데이터 부족 — 빈 상태**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 상태 안내 노출, 설정만 가능.
- **AC-08. 부정 태그 분류 규약**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 두 섹션 동시 갱신.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
