# F11-06. 취향 평가 & 취향 프로필 PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/11_review_report/F11-06_taste-profile -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/11_review_report/F11-06_taste-profile`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> 2026-07-29 현재 소스 갱신: legacy GraphQL 추천, `PreferenceRating`, `TasteNeighbor` 중심 흐름은 현재 기준이 아니다. 현재 `TasteProfileService`의 자동 재구축 원천은 이벤트 선택형 피드백이며, 데이트 만남 피드백은 이 프로필에 합산되지 않는다. InterestTag 카탈로그는 서버 단일 출처이고, 데이터 내보내기·삭제도 현재 취향 데이터를 포함한다. 아래 기존 trace는 역사적 전환본으로 남기되, 구현 판단은 `EventFeedbackController`, `TasteProfileService`, 현재 Flutter 피드백 화면을 우선한다.

## 1. 결론

취향 프로필은 이벤트 선택형 피드백으로 쌓인 본인 관점의 라벨 데이터이며, 피드백이 쌓일수록 `UserTasteProfile.positiveTagWeights`가 자동 재구축된다. 별도로 사용자가 선호 카테고리/시간대/그룹 크기를 설정한다. 현재 사람 추천과 관계 공통점은 카테고리·시간대만 소비하고 그룹 크기는 저장·조회·export에 머문다. 데이트 만남 피드백은 취향 프로필 재구축 원천이 아니다.

### 2026-07-29 소스 재실측 — 선언 선호와 행동 근사 스타일의 분리

`UserTasteProfile`에는 기존 선언 선호/피드백 집계 외에 JSON `behaviorStyleEstimate`가 저장된다.

| 항목 | 현재 계약 |
|---|---|
| 축 | `ACTIVITY_LEVEL`, `GROUP_SIZE_PREFERENCE` |
| 입력 기간 | 최근 12개월 증거등급 참석 이벤트 |
| 최소 표본 | 3개. 미만이면 `axes={}`, `provenance=BEHAVIOR_V1`, `reason=INSUFFICIENT_EVIDENCE` |
| 활동성 | 이벤트 Category를 active=0, neutral=50, calm=100으로 매핑한 평균 |
| 그룹 크기 | `currentCapacity > 0 ? currentCapacity : baseCapacity` 평균을 4명 이하=0, 20명 이상=100, 사이 선형으로 변환 |
| 메타데이터 | eventCount, horizonMonths, categoryDist, timeOfDayDist, avgGroupSize, reason, computedAt |
| 재계산 시점 | `EventFeedbackService.submit` 성공 후 `TasteProfileService.rebuildProfile(responderUserId)` |

중요한 노출 경계:

- `GET /api/v1/taste/profile`의 `TasteProfileVo`에는 `preferredCategories`, `preferredTimeSlots`, `preferredGroupSize`, `positiveTagWeights`, `updatedAt`만 있고 `behaviorStyleEstimate`는 없다. 현재 Flutter 취향 프로필 화면은 행동 근사 축을 볼 수 없다.
- behavior estimate는 trait 검사의 최신 제출 점수와 다른 데이터다. 이벤트/클럽 fit preview는 **trait 점수만** 사용하며 행동 근사를 섞지 않는다.
- 사람 추천과 `RelationshipSummary.commonGround`는 사용자가 선언한 카테고리·시간대와 관심사 태그만 사용한다. 행동 근사는 사용하지 않는다.
- 데이터 내보내기 `taste` 섹션에는 선언 선호와 `behaviorStyleEstimate`가 포함된다. `positiveTagWeights`는 본인 선택 피드백에서 재생성 가능한 중복 파생 캐시라 의도적으로 제외한다.

현재 Gap은 행동 근사가 저장/export되지만 API·UI로 본인에게 노출되지 않는 점, 그리고 참석 이력 변화 자체가 아니라 다음 이벤트 피드백 제출 때에만 재계산되는 점이다.

실측 근거: `TasteProfileService`, `BehaviorStyleEstimate`, `BehaviorAxis`, `CategoryActivityIntensity`, `TimeOfDayBucket`, `TasteProfileVo`, `DataExportAsyncWorker`, Flutter `taste_profile_vo.dart`와 `taste_profile_screen.dart`.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 → "취향 프로필" → `Routes.profileTasteProfile` → `TasteProfileScreen()`
- 이벤트 선택형 피드백 작성은 종료 이벤트의 별도 `EventFeedbackScreen`에서 진행한다. 본 화면은 누적 결과 조회와 선언 선호 설정 중심이며 legacy `PreferenceRatingWriteNotifier` 흐름은 현재 기준이 아니다.

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
| `community_api/src/main/java/com/endside/community/review/controller/EventFeedbackController.java:37` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateMeetingFeedbackController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/service/TasteProfileService.java:54` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/TasteProfileController.java:23` | 확인됨 |
| `community_api/src/main/java/com/endside/community/review/controller/TasteProfileController.java:29` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입: `tasteProfileNotifierProvider` build
   → `TasteProfileRepository.getProfile()` → `GET /api/v1/taste/profile`
2. 이벤트 피드백 후보 조회: `GET /api/v1/events/{eventId}/feedback/candidates`
   → 같은 이벤트에 함께한 사용자 후보만 반환. 게스트, 차단 사용자, 부적격 대상은 제외.
3. 이벤트 피드백 제출: `POST /api/v1/events/{eventId}/feedback`
   → 본인이 다시 함께하고 싶은 사람/인상 태그를 제출. 받은 선택 조회 endpoint는 없다.
4. 내 피드백 이력/통계: `GET /api/v1/feedback/me`, `GET /api/v1/feedback/me/stats`
5. 데이트 만남 피드백은 인접한 privatedate 원본이다: `POST /api/v1/date/meetings/{meetingId}/feedback`, `GET /api/v1/date/meetings/{meetingId}/feedback/me`
   → 완료된 만남에서 본인 응답 여부, meetAgain, satisfaction만 노출하며 TasteProfile을 재구축하지 않는다.
6. "저장": `tasteProfileNotifier.updatePreferences(param)`
   → `TasteProfileRepository.updatePreferences(param)` → `PUT /api/v1/taste/preferences`
   → 응답 `TasteProfileVo`로 state replace, 토스트 노출

## 4. 서버 계약

### 개요

현재 취향 프로필의 자동 입력은 이벤트 선택 피드백이다. `TasteProfileService.rebuildProfile`은 `EventFeedbackChoice.impressionTags`의 긍정 `ImpressionTag`를 누적해 `UserTasteProfile.positiveTagWeights`를 재구축하고 같은 시점에 참석 이력 기반 `behaviorStyleEstimate`를 갱신한다. 데이트 만남 피드백은 이 메서드를 호출하지 않는다. `PreferenceRatingController`, `/api/v1/ratings`, `TasteNeighbor`, GraphQL 추천은 현재 API가 아니다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/feedback/candidates` | `EventFeedbackController#getCandidates` | required | 함께한 사람 피드백 후보 조회. 게스트·차단·부적격 대상 제외 |
| POST | `/api/v1/events/{eventId}/feedback` | `EventFeedbackController#submit` | required | 이벤트 선택 피드백 제출 + 취향 프로필 재구축 |
| GET | `/api/v1/feedback/me` | `EventFeedbackController#getMyFeedback` | required | 본인이 남긴 이벤트 피드백 목록 (Spring `Page<>`) |
| GET | `/api/v1/feedback/me/stats` | `EventFeedbackController#getMyStats` | required | 본인 피드백 통계 |
| POST | `/api/v1/date/meetings/{meetingId}/feedback` | `DateMeetingFeedbackController#submitFeedback` | required | 완료된 데이트 만남 피드백 제출 |
| GET | `/api/v1/date/meetings/{meetingId}/feedback/me` | `DateMeetingFeedbackController#getMyFeedbackStatus` | required | 호출자 본인 응답 상태만 조회 |
| GET | `/api/v1/taste/profile` | `TasteProfileController#getMyProfile` | required | 누적된 취향 프로필 |
| PUT | `/api/v1/taste/preferences` | `TasteProfileController#updatePreferences` | required | 카테고리/시간대/그룹 크기 갱신 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity** `EventFeedbackResponse` / `EventFeedbackChoice`: 응답자 본인 관점의 이벤트 피드백과 선택한 대상/인상 태그. 받은 선택 조회는 제공하지 않는다.
- **Entity** `DateMeetingFeedback`: 데이트 만남 완료 후 본인 응답 여부, `meetAgain`, `satisfaction` 등 본인 응답만 노출.
- **Entity** `UserTasteProfile` (`review/model/UserTasteProfile.java`): `userId`, `positiveTagWeights`, `preferredCategories`, `preferredTimeSlots`, `preferredGroupSize`, `behaviorStyleEstimate` (JSON String), audit. 현재 `TasteProfileVo`에는 behavior estimate가 없다.
- **Enum** `ImpressionTag` (`review/constants/ImpressionTag.java`):
  - 긍정 10개: `FUNNY`, `PUNCTUAL`, `GOOD_LISTENER`, `ENERGETIC`, `THOUGHTFUL`, `CREATIVE`, `RELIABLE`, `WARM`, `INTELLIGENT`, `EASYGOING`
  - 부정 4개: `NEGATIVE_RUDE`, `NEGATIVE_LATE`, `NEGATIVE_NOSHOW`, `NEGATIVE_UNCOMFORTABLE`
  - 이벤트 피드백 제출 시점에는 긍정 10종만 허용한다. `NEGATIVE_*`는 현재 이벤트 피드백 제출 가능 태그가 아니다.

### 의존 단위 / 외부 시스템

- **Event 도메인**: 실제 참석/차단/게스트 제외 기준으로 피드백 후보를 만든다.
- **PrivateDate 도메인**: 완료된 만남에서만 만남 피드백 제출을 허용한다.
- 외부 시스템: 없음.

## 5. 프론트 계약

### 진입 경로

- 마이페이지 → "취향 프로필" → `Routes.profileTasteProfile` → `TasteProfileScreen()`
- TasteProfile 재구축을 유발하는 작성 진입은 종료 이벤트의 이벤트 피드백 화면이다. 데이트 만남 완료 피드백 시트는 별도 privatedate 데이터이며 본 화면의 누적 결과를 바꾸지 않는다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | 라우트 상수 | Screen 파일 | 역할 |
|---|---|---|---|
| 프로필 탭 sub-route | `Routes.profileTasteProfile` (`core/router/routes.dart:107`) | `presentation/review/screens/taste_profile_screen.dart` | 취향 요약/태그/본인 이벤트 피드백 통계·이력 + 선호도 설정 시트 |

### 화면별 구성 요소 & 액션

### 취향 프로필 (`taste_profile_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '취향 프로필', actions: [Icons.settings_outlined → 선호도 시트])`
  - 본문: `SingleChildScrollView` + `screenPadding`
    1. **취향 요약 (`_TasteRadarSection`)**: `positiveTagWeights` 상위 5개로 5각형 레이더 차트(200×200, 자체 `_RadarChartPainter`, primary500 stroke + 0.2 fill). 항목 < 3이면 "아직 취향 데이터가 부족합니다" 텍스트만.
    2. **상위 관심사 (`_TopInterestsSection`)**: 상위 4개 태그를 `AppTag` 위젯으로 wrap.
    3. **긍정적 인상 (`_TagWeightsSection` color=primary500)**: 정렬된 태그 + 가로 LinearProgress + `${(weight*100).toInt()}%`
    4. **피드백 통계**: 내가 남긴 이벤트 피드백 수와 선택/태그 통계.
    5. **내 피드백 기록**: 페이지 단위 로딩. `AppEmptyState` 또는 피드백 카드 리스트 + "더 보기" `AppButton(variant: outline)`
    6. **"선호도 설정" 버튼 (`AppButton variant: outline`)** — 시트 트리거
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
  - "더 보기" 탭 → 내 피드백 목록 다음 페이지 조회 (`GET /api/v1/feedback/me`)
- **상태 분기**:
  | 영역 | 처리 |
  |---|---|
  | profile loading | `CircularProgressIndicator` 중앙 |
  | profile error | `AppErrorState.fromError(error, onRetry → invalidate)` |
  | radar entries < 3 | "아직 취향 데이터가 부족합니다" |
  | stats error | "통계를 불러올 수 없습니다" |
  | feedback empty | `아직 고른 사람이 없습니다` `AppEmptyState` |
  | feedback error | `이력을 불러올 수 없습니다` |

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입: `tasteProfileNotifierProvider` build
   → `TasteProfileRepository.getProfile()` → `GET /api/v1/taste/profile`
2. 이벤트 피드백 후보: `GET /api/v1/events/{eventId}/feedback/candidates`
3. 이벤트 피드백 제출: `POST /api/v1/events/{eventId}/feedback`
   → 성공 시 `TasteProfileService.rebuildProfile(responderUserId)`가 이벤트 피드백 선택지를 기반으로 프로필을 재구축.
4. 내 이벤트 피드백 이력/통계: `GET /api/v1/feedback/me`, `GET /api/v1/feedback/me/stats`
5. 데이트 만남 피드백은 별도 화면/API이며 TasteProfile provider를 invalidate하거나 rebuild하지 않는다.
6. "저장": `tasteProfileNotifier.updatePreferences(param)`
   → `TasteProfileRepository.updatePreferences(param)` → `PUT /api/v1/taste/preferences`
   → 응답 `TasteProfileVo`로 state replace, 토스트 노출

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 카테고리/시간대/그룹크기 옵션 라벨 — 클라이언트 정의 (서버는 단순 String 리스트로 저장)
- 레이더 차트는 위젯 자체 페인팅(`_RadarChartPainter`, 3개 미만이면 비표시)
- 태그 가중치 → "%": `(weight * 100).toInt()` — 서버 가중치는 `Double::sum`으로 단순 카운트라 1.0 이상이 흔함 → 100% 초과 표기 가능 → `clamp(0.0, 1.0)` 가드(레이더만)
- 태그 라벨 포맷: `NEGATIVE_` 접두 제거 + `_` → 공백 + 단어별 capitalize
- "내가 고른 사람" 페이지 사이즈 20, "더 보기"는 `AppButton(variant: outline)` 단일 버튼(스크롤 끝 자동 로드 아님)
- 피드백 카드: 선택한 대상/인상 태그 요약과 제출일 표시
- "선호도 설정" 시트는 `showModalBottomSheet(isScrollControlled: true)` + `DraggableScrollableSheet` 조합
- `FilterChip` selectedColor = `primary500.withValues(alpha: 0.15)`, checkmarkColor = primary500
- 빈 리스트 저장 정책: 시트의 `_save`는 비어 있으면 null로 보냄 → 서버는 null이면 해당 필드 갱신 안 함(`toJson(null) → null`)
- 이벤트 선택형 피드백 작성 UI는 본 화면이 아니라 종료 이벤트의 `EventFeedbackScreen`에 있다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 취향 프로필 첫 진입 (Happy Path) | `user_taste_profile` 행 존재, `positiveTagWeights` 5개 이상, `preferredCategories` null. | 화면 데이터로 채워짐, 추가 액션 가능. |
| S2 | 선호도 설정 시트 — 카테고리/시간대/그룹 저장 | 프로필에 선언 선호가 없거나 변경됨. | `user_taste_profile`의 세 JSON 선언 선호가 갱신되고 이후 사람 추천/관계 공통점 입력에 사용된다. |
| S3 | 자격 있는 종료 이벤트 피드백 제출 | 증거등급 참석, 종료 후 7일 이내, 후보 2명 이상, 서버 후보 snapshot과 요청이 일치함. | 응답/표시 후보/선택이 저장되고 응답자 `positiveTagWeights`와 `behaviorStyleEstimate`가 재구축된다. |
| S4 | 후보 snapshot 변경 | 후보 조회 후 차단·자격 변화로 서버 재계산 순서/집합이 `displayedUserIds`와 다름. | `FEEDBACK_CANDIDATES_CHANGED`, 신규 응답/선택/취향 재구축 없음. |
| S5 | 이벤트 피드백 재시도/중복 | 같은 이벤트·응답자에 기존 응답이 있음. | 같은 `clientRequestId`면 기존 응답을 멱등 반환하고, 다른 key면 `DUPLICATE_RESOURCE`; 둘 다 재구축하지 않는다. |
| S6 | 내가 고른 사람 더 보기 (페이지네이션) | 첫 페이지 20건 노출 + `page.last=false`. | 다음 20건 크기로 다시 조회해 이력을 확장한다. |
| S7 | 행동 근사 표본 부족 | 최근 12개월 증거등급 이벤트가 3건 미만. | `behaviorStyleEstimate.axes={}`, `reason=INSUFFICIENT_EVIDENCE`; 현재 API/UI에는 축을 노출하지 않는다. |
| S8 | 분위기 태그 검증 | `vibeTags`에 중복/null/미등록 값이 있거나 3개를 초과함. | `INVALID_INPUT`, 저장과 취향 재구축 없음. null/빈 목록은 허용된다. |

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
| Gap | `UserTasteProfile` / `TasteProfileVo` / Flutter model | `behaviorStyleEstimate`는 저장·export되지만 본인 profile API와 화면에는 없다. | 본인 설명형 UI로 노출할지 제품 결정 후 VO/model 동기화 |
| Risk | `EventFeedbackService.submit` 단일 rebuild hook | 참석 이력이 바뀌어도 다음 이벤트 피드백 제출 전까지 행동 근사가 갱신되지 않는다. | 참석 변경 훅 또는 정기 재계산 필요성 결정 |
| Gap | `DataExportAsyncWorker.toEventFeedbackMap` | 본인이 작성한 `vibeTags`가 export에서 빠진다. | feedback export schema에 추가하고 회귀 테스트 |
| Gap | `taste_profile_screen.dart` | 단순 count weight를 `%`로 표시해 1.0 초과 값이 100%를 넘을 수 있다. | count/비율 의미를 구분하거나 정규화 |

## 9. 수용 기준

- **AC-01. 취향 프로필 첫 진입 (Happy Path)**: Given `user_taste_profile` 행 존재, `positiveTagWeights` 5개 이상, `preferredCategories` null. When 사용자가 해당 흐름을 실행하면 Then 화면 데이터로 채워짐, 추가 액션 가능.
- **AC-02. 선호도 설정 시트 — 카테고리/시간대/그룹 저장**: Given 선언 선호를 변경한 사용자 When 저장하면 Then 세 JSON 선호가 갱신되고 사람 추천/관계 공통점은 다음 조회부터 새 값을 사용한다.
- **AC-03. 자격 있는 종료 이벤트 피드백 제출**: Given 증거등급 참석·7일 창·후보 2명 이상·정확한 snapshot When 유효한 선택을 제출하면 Then 응답/선택을 저장하고 본인 태그 가중치와 행동 근사를 재구축한다.
- **AC-04. 후보 snapshot 변경**: Given 조회 후 후보 집합 또는 순서 변화 When 예전 `displayedUserIds`로 제출하면 Then `FEEDBACK_CANDIDATES_CHANGED`이고 어떤 피드백/취향 변경도 없다.
- **AC-05. 이벤트 피드백 재시도/중복**: Given 기존 응답 When 같은 `clientRequestId`로 재시도하면 Then 기존 응답을 반환한다. 다른 key면 `DUPLICATE_RESOURCE`이며 재구축하지 않는다.
- **AC-06. 내가 고른 사람 더 보기 (페이지네이션)**: Given 첫 페이지 20건 노출 + `page.last=false` When 더 보기를 탭하면 Then size를 20 늘려 본인 이벤트 피드백을 다시 조회한다.
- **AC-07. 행동 근사 표본 부족**: Given 최근 12개월 증거등급 이벤트 3건 미만 When rebuild하면 Then 빈 axes와 `INSUFFICIENT_EVIDENCE`를 저장하고 추정 축을 만들지 않는다.
- **AC-08. 분위기 태그 검증**: Given 중복/null/미등록/4개 이상 `vibeTags` When 제출하면 Then `INVALID_INPUT`; null/빈 목록은 정상 처리한다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
