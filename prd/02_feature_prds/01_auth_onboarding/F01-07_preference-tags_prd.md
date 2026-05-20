# F01-07. 관심사 태그 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-07_preference-tags -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-07_preference-tags`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자의 관심사를 표현하는 태그를 CRUD 한다. 각 태그는 이름과 가중치(0.1~5.0)를 가지며 사용자별 최대 20개까지 저장된다. 온보딩(F01-06)의 등록 진입점뿐 아니라 이후에도 외부 단위(프로필/설정)에서 호출되어 추천 품질을 갱신한다. 본 단위는 라이프사이클 4종(GET/POST/PUT/DELETE)을 모두 정의한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **신규 등록**: 온보딩 Step 3 (`/onboarding/interests`) — F01-06에서 다룬 화면
- **조회/수정/삭제**: 본 단위에는 전용 화면 없음. 프로필/설정 영역(외부 단위, Unit 13 추정)에서 사용

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

사용자의 관심사를 표현하는 태그를 CRUD 한다. 각 태그는 이름과 가중치(0.1~5.0)를 가지며 사용자별 최대 20개까지 저장된다. 온보딩(F01-06)의 등록 진입점뿐 아니라 이후에도 외부 단위(프로필/설정)에서 호출되어 추천 품질을 갱신한다. 본 단위는 라이프사이클 4종(GET/POST/PUT/DELETE)을 모두 정의한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/users/me/preference-tags | `UserPreferenceTagController#getMyTags` | required | 내 태그 목록 (List) |
| POST | /api/v1/users/me/preference-tags | `UserPreferenceTagController#addTag` | required | 태그 1건 추가 (201) |
| PUT | /api/v1/users/me/preference-tags/{tagId} | `UserPreferenceTagController#updateTag` | required | 태그명/가중치 변경 |
| DELETE | /api/v1/users/me/preference-tags/{tagId} | `UserPreferenceTagController#deleteTag` | required | 태그 삭제 (204) |

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 없음 (자체 도메인)
- 사용처:
  - F01-06 (온보딩 신규 등록 진입점)
  - 외부 단위(프로필/설정/추천) — Unit 13/Profile/Settings 영역에서 조회/수정/삭제
  - 추천 도메인이 본 테이블을 입력값으로 사용 가능 (search/추천)
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- **신규 등록**: 온보딩 Step 3 (`/onboarding/interests`) — F01-06에서 다룬 화면
- **조회/수정/삭제**: 본 단위에는 전용 화면 없음. 프로필/설정 영역(외부 단위, Unit 13 추정)에서 사용

본 파일은 본 단위 코드 범위(`presentation/auth/`, `data/api/user_preference_tag_api.dart`, `data/repositories/auth_repository.dart` 부분) 안에서 다루는 흐름만 기술한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/onboarding/interests` | `lib/presentation/auth/screens/onboarding_interests_screen.dart` | 신규 일괄 등록 |
| (외부 단위) | (Unit 13 등) | 조회/수정/삭제 — 본 단위 화면 없음 |

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
| S6 | 태그명 변경 | '러닝'을 '마라톤'으로 변경하려는 사용자 | 태그명 변경 완료 |
| S7 | 다른 사용자의 태그 수정 시도 (보안) | A 사용자가 B 사용자의 tagId로 PUT 호출 | 차단 (404로 존재 여부 노출하지 않음) |
| S8 | 가중치만 변경 | 시나리오 본문 참조 | 가중치 갱신, 다음 조회 시 정렬 변경 |
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
| 후보 | frontend.md:36 | - 클라이언트 측 한도(20개) 검증 없음 — 서버에 위임 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 온보딩에서 3개 태그 일괄 등록 (Happy Path)**: Given `/onboarding/interests`, 기존 태그 0개 When 사용자가 해당 흐름을 실행하면 Then `user_preference_tag` 3행 INSERT, 가중치 1.0
- **AC-02. 일부 등록 후 중단된 상태에서 재시도 (중복 발생)**: Given ['러닝']만 INSERT됨, 화면은 다음 단계로 안 넘어감 When 사용자가 해당 흐름을 실행하면 Then 부분 저장된 상태로 막힘 (개선 필요한 알려진 한계)
- **AC-03. 태그 21개째 등록 시도 (한도 초과)**: Given 사용자에게 이미 20개 태그 등록됨 When 사용자가 해당 흐름을 실행하면 Then 추가 차단
- **AC-04. 동일 이름 태그 재등록 시도 (중복)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 추가 안 됨
- **AC-05. 외부 단위에서 본인 태그 조회**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 조회 성공
- **AC-06. 태그명 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 태그명 변경 완료
- **AC-07. 다른 사용자의 태그 수정 시도 (보안)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단 (404로 존재 여부 노출하지 않음)
- **AC-08. 가중치만 변경**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가중치 갱신, 다음 조회 시 정렬 변경
- **AC-09. 가중치 범위 초과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 거부
- **AC-10. 태그 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 태그 제거, 추천 입력값 변동

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
