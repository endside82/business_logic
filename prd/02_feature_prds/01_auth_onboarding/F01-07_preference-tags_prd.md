# F01-07. 관심사 태그 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/01_auth_onboarding/F01-07_preference-tags -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-07_preference-tags`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

서버는 사용자의 관심사 태그를 단건 CRUD 한다. 각 태그는 서버 카탈로그의 라벨과 가중치(0.1~5.0)를 가지며 사용자별 최대 20개까지 저장된다. 온보딩은 POST를 순차 호출하고, 현재 프로필 화면은 조회·추가·삭제만 연결한다. PUT과 Retrofit 선언은 존재하지만 이름·가중치를 편집하는 화면/Provider/Repository 호출자는 없다.

### 2026-07-29 소스 재실측 — 태그의 현재 소비 계약

- `UserPreferenceTag`는 더 이상 단순 보관 데이터가 아니다. `RelationshipService.commonGround`가 두 사용자의 태그명을 trim·대소문자 무시로 교집합 처리하고, 뷰어 가중치 순서를 유지해 최대 5개 `commonInterestTags`만 노출한다. 전체 상대 태그나 수치 유사도는 노출하지 않는다.
- `PersonRecommendationService`는 관심사 태그·선호 카테고리·선호 시간대의 교집합 개수를 `COMMON_GROUND` 신호로 사용한다. 공통점 1개당 0.5점, 최대 4점이며 추천 응답에는 총점 대신 우선순위형 `reasonCodes` 최대 2개만 내려간다.
- 데이팅 `MatchScoringService`의 태그 Jaccard 유사도(가중치 0.30)는 **양쪽 데이팅 프로필이 모두 `communityDataOptIn=true`일 때만** 사용된다. 한쪽이라도 미동의하면 태그·신뢰점수 성분을 제외하고 남은 가중치를 재정규화하므로 미동의자를 0점 처리하지 않는다.
- 위 소비 경로는 태그명 집합을 사용한다. 저장 `weight`는 관계 공통점 표시 순서에는 쓰이지만 사람 추천 공통점 개수와 데이팅 Jaccard 점수에는 직접 가중치로 쓰이지 않는다.

실측 근거: `UserPreferenceTagService`, `RelationshipService`, `PersonRecommendationService`, `MatchScoringService`와 Flutter `preference_tag_screen.dart`.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **신규 등록**: 온보딩 Step 3 (`/onboarding/interests`) — F01-06에서 다룬 화면
- **운영 중 조회/추가/삭제**: `/profile/tags`의 프로필 화면에서 사용
- **수정**: 서버 PUT과 Retrofit 선언만 있고 현재 Flutter 사용자 경로는 없음

본 파일은 본 단위 코드 범위(`presentation/auth/`, `data/api/user_preference_tag_api.dart`, `data/repositories/auth_repository.dart` 부분) 안에서 다루는 흐름만 기술한다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-07_preference-tags/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-07_preference-tags/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-07_preference-tags/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-07_preference-tags/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:34` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:42` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:51` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 신규 일괄 등록 (`onboarding_interests_screen.dart`)
F01-06 frontend.md에서 자세히 다룸. 본 파일에서는 API 호출 측면만 정리:
- 사용자가 N개 태그 선택 후 "다음" 탭
- `AuthRepository.addPreferenceTags(List<String> tagNames)` 호출 (본 단위 자체 메서드)
- 내부 동작:
  ```dart
  for (final tagName in tagNames) {
    await _userPreferenceTagApi.addTag(
      UserPreferenceTagParam(tagName: tagName),
    );
  }
  return const Result.success(null);
  ```
- `UserPreferenceTagParam`은 `tagName`만 명시 → `weight` 기본값 1.0 사용
- 첫 실패 시 즉시 throw → `Result.failure(ApiError)`
- 클라이언트 측 한도(20개) 검증 없음 — 서버에 위임

## 4. 서버 계약

### 개요

서버는 사용자의 관심사 태그를 단건 CRUD 한다. 각 태그는 서버 카탈로그의 라벨과 가중치(0.1~5.0)를 가지며 사용자별 최대 20개까지 저장된다. 현재 Flutter는 온보딩의 추가와 프로필 화면의 조회·추가·삭제를 연결하며 PUT 편집은 연결하지 않는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/interests/catalog | `InterestCatalogController#getCatalog` | required | 25개 허용 라벨을 카테고리별 반환 |
| GET | /api/v1/users/me/preference-tags | `UserPreferenceTagController#getMyTags` | required | 내 태그 목록 (List) |
| POST | /api/v1/users/me/preference-tags | `UserPreferenceTagController#addTag` | required | 태그 1건 추가 (201) |
| PUT | /api/v1/users/me/preference-tags/{tagId} | `UserPreferenceTagController#updateTag` | required | 태그명/가중치 변경 |
| DELETE | /api/v1/users/me/preference-tags/{tagId} | `UserPreferenceTagController#deleteTag` | required | 태그 삭제 (204) |

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 없음 (자체 도메인)
- 사용처:
  - F01-06 (온보딩 신규 등록 진입점)
  - Unit 13 프로필 화면에서 조회/추가/삭제
  - `RelationshipService`, `PersonRecommendationService`, `MatchScoringService`가 공통점·사람 추천·양측 동의 데이팅 점수 입력으로 실제 사용
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- **신규 등록**: 온보딩 Step 3 (`/onboarding/interests`) — F01-06에서 다룬 화면
- **운영 중 조회/추가/삭제**: `/profile/tags`의 프로필 화면에서 사용
- **수정**: 서버 PUT과 Retrofit 선언만 있고 현재 Flutter 사용자 경로는 없음

본 파일은 본 단위 코드 범위(`presentation/auth/`, `data/api/user_preference_tag_api.dart`, `data/repositories/auth_repository.dart` 부분) 안에서 다루는 흐름만 기술한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/onboarding/interests` | `lib/presentation/auth/screens/onboarding_interests_screen.dart` | 신규 일괄 등록 |
| `/profile/tags` | `lib/presentation/profile/screens/preference_tag_screen.dart` | 조회·추가·삭제 — 이름/가중치 편집 없음 |

| API 클래스 | 파일 |
|---|---|
| `UserPreferenceTagApi` | `lib/data/api/user_preference_tag_api.dart` |

### 화면별 구성 요소 & 액션

### 신규 일괄 등록 (`onboarding_interests_screen.dart`)
F01-06 frontend.md에서 자세히 다룸. 본 파일에서는 API 호출 측면만 정리:
- 사용자가 N개 태그 선택 후 "다음" 탭
- `AuthRepository.addPreferenceTags(List<String> tagNames)` 호출 (본 단위 자체 메서드)
- 내부 동작:
  ```dart
  for (final tagName in tagNames) {
    await _userPreferenceTagApi.addTag(
      UserPreferenceTagParam(tagName: tagName),
    );
  }
  return const Result.success(null);
  ```
- `UserPreferenceTagParam`은 `tagName`만 명시 → `weight` 기본값 1.0 사용
- 첫 실패 시 즉시 throw → `Result.failure(ApiError)`
- 클라이언트 측 한도(20개) 검증 없음 — 서버에 위임

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 온보딩에서 3개 태그 일괄 등록 (Happy Path) | `/onboarding/interests`, 기존 태그 0개 | `user_preference_tag` 3행 INSERT, 가중치 1.0 |
| S2 | 일부 등록 후 중단된 상태에서 재시도 (중복 발생) | ['러닝']만 INSERT됨, 화면은 다음 단계로 안 넘어감 | 부분 저장된 상태로 막힘 (개선 필요한 알려진 한계) |
| S3 | 태그 21개째 등록 시도 (한도 초과) | 사용자에게 이미 20개 태그 등록됨 | 추가 차단 |
| S4 | 동일 이름 태그 재등록 시도 (중복) | 시나리오 본문 참조 | 추가 안 됨 |
| S5 | 외부 단위에서 본인 태그 조회 | 시나리오 본문 참조 | 조회 성공 |
| S6 | 태그명 변경 API | 화면 호출자는 없음. 본인 tagId의 `러닝`을 카탈로그 라벨 `자전거`로 PUT | 서버에서는 변경 완료. `마라톤`처럼 카탈로그 밖 라벨은 `INVALID_INPUT` |
| S7 | 다른 사용자의 태그 수정 시도 (보안) | A 사용자가 B 사용자의 tagId로 PUT 호출 | 차단 (404로 존재 여부 노출하지 않음) |
| S8 | 가중치만 변경 API | 화면 호출자는 없음. 본인 tagId에 범위 내 weight만 PUT | 서버에서는 가중치 갱신, 다음 조회 시 정렬 변경 |
| S9 | 가중치 범위 초과 | 시나리오 본문 참조 | 변경 거부 |
| S10 | 태그 삭제 | 시나리오 본문 참조 | 태그 제거, 추천 입력값 변동 |

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
| Gap | `preference_tag_screen.dart`, `ProfileRepository` | 서버/Retrofit에는 PUT이 있지만 현재 이름·가중치 편집 사용자 경로가 없다. | 편집 기능을 제공하려면 카탈로그 선택형 UI와 Repository/Provider PUT 체인을 연결 |
| Risk | `preference_tag_provider.dart` | 프로필 화면의 POST/DELETE 실패는 `false`로 접히고 화면이 Future를 await하지 않아 오류 안내가 없다. | mutation 실패 피드백과 재동기화 정책 보강 |
| Risk | `AuthRepository#addPreferenceTags` | 온보딩은 클라이언트 20개 검증 없이 태그를 한 건씩 저장하므로 중간 실패 시 부분 저장된다. | 원자적 일괄 저장 또는 재시도 정합화 |

## 9. 수용 기준

- **AC-01. 온보딩에서 3개 태그 일괄 등록 (Happy Path)**: Given `/onboarding/interests`, 기존 태그 0개 When 사용자가 해당 흐름을 실행하면 Then `user_preference_tag` 3행 INSERT, 가중치 1.0
- **AC-02. 일부 등록 후 중단된 상태에서 재시도 (중복 발생)**: Given ['러닝']만 INSERT됨, 화면은 다음 단계로 안 넘어감 When 사용자가 해당 흐름을 실행하면 Then 부분 저장된 상태로 막힘 (개선 필요한 알려진 한계)
- **AC-03. 태그 21개째 등록 시도 (한도 초과)**: Given 사용자에게 이미 20개 태그 등록됨 When 사용자가 해당 흐름을 실행하면 Then 추가 차단
- **AC-04. 동일 이름 태그 재등록 시도 (중복)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 추가 안 됨
- **AC-05. 외부 단위에서 본인 태그 조회**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 조회 성공
- **AC-06. 태그명 변경 API**: Given 본인 tagId와 카탈로그 라벨 When PUT을 직접 호출하면 Then 서버에서는 변경되며, 카탈로그 밖 라벨은 `INVALID_INPUT`이다. 현재 Flutter 화면 호출자는 없다.
- **AC-07. 다른 사용자의 태그 수정 시도 (보안)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단 (404로 존재 여부 노출하지 않음)
- **AC-08. 가중치만 변경 API**: Given 본인 tagId와 범위 내 weight When PUT을 직접 호출하면 Then 서버에서는 가중치와 다음 조회 정렬이 갱신된다. 현재 Flutter 화면 호출자는 없다.
- **AC-09. 가중치 범위 초과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 거부
- **AC-10. 태그 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 태그 제거, 추천 입력값 변동

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
