# F11-06. 취향 평가 & 취향 프로필 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

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

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventFeedbackController`, `DateMeetingFeedbackController`, `TasteProfileController`, `TasteProfileService`, `UserTasteProfile`, `ImpressionTag`. 앱: `taste_profile_screen.dart`, `routes.dart`.

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 인상 태그는 긍정 10종(FUNNY, PUNCTUAL, GOOD_LISTENER, ENERGETIC, THOUGHTFUL, CREATIVE, RELIABLE, WARM, INTELLIGENT, EASYGOING)만 이벤트 피드백에서 고를 수 있다. 부정 태그(NEGATIVE_*)는 제출할 수 없다.
- 취향 프로필의 태그 가중치는 본인이 이벤트 피드백으로 고른 긍정 태그를 쌓은 것이다. 데이트 만남 피드백은 합산하지 않으며, 만남 피드백은 완료된 만남에서만 낼 수 있고 본인 응답 상태만 조회된다.
- 선호도 설정: 카테고리 8개(음식/맛집, 문화/예술, 스포츠/운동, 여행/아웃도어, 게임/취미, 교육/스터디, 네트워킹, 기타), 시간대 4개(오전 9-12, 오후 12-18, 저녁 18-21, 야간 21-24), 그룹 크기 3개(소규모 2-5명, 중규모 6-15명, 대규모 16명 이상). 아무것도 고르지 않은 항목은 바뀌지 않고 이전 값이 유지된다.
- 화면: 태그가 3개 미만이면 레이더 대신 「아직 취향 데이터가 부족합니다」, 레이더와 상위 관심사는 상위 5개와 4개를 쓴다. 내가 고른 사람 기록은 20건씩 「더 보기」로 늘린다. 태그 가중치는 단순 누적이라 퍼센트로 보이는 값이 100을 넘을 수 있다(Gap에 있음).

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
