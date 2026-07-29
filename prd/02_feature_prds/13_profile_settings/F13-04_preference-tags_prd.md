# F13-04. 선호 태그 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/13_profile_settings/F13-04_preference-tags -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/13_profile_settings/F13-04_preference-tags`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

선호 태그 서버 API는 관심사 태그 단건 CRUD를 제공하지만 현재 프로필 화면은 조회·추가·삭제만 연결한다. 서버는 `InterestTag` 카탈로그 라벨, 사용자별 최대 20개, 같은 사용자 내 중복 금지를 강제한다. UI 스펙의 `tagId`/`tagIds[]` 일괄 업데이트와 달리 실제 변경 API는 `tagName`과 `weight` 기반이다.

### 2026-07-29 소스 재실측 — 현재 downstream 소비

- PersonSheet 관계 요약은 두 사람의 태그명 교집합을 뷰어 `weight` 내림차순으로 최대 5개만 `commonInterestTags`에 싣는다.
- 홈 사람 추천은 태그·선호 카테고리·선호 시간대 교집합 개수를 `COMMON_GROUND` 점수/이유로 사용한다. weight 자체는 추천 점수에 곱하지 않는다.
- 데이팅 매칭은 양쪽 `communityDataOptIn=true`일 때만 태그명 집합의 Jaccard 유사도를 0.30 성분으로 사용한다. 한쪽 미동의 시 이 성분을 제외하고 재정규화한다.
- 태그 원문 전체나 수치 궁합 점수는 타인 표면에 노출하지 않는다. `hideFromSearch`는 검색/추천 후보 노출을 막지만 이미 저장된 태그 CRUD 권한에는 영향을 주지 않는다.

실측 근거: `UserPreferenceTagService`, `RelationshipService`, `PersonRecommendationService`, `MatchScoringService`, Flutter `preference_tag_screen.dart`.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `선호 태그` 메뉴를 탭해 진입한다.
- 이 화면은 운영 중 태그 추가/삭제를 다룬다. 온보딩 직후 1회 등록은 Unit 01 범위다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/13_profile_settings/F13-04_preference-tags/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/13_profile_settings/F13-04_preference-tags/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/13_profile_settings/F13-04_preference-tags/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/13_profile_settings/F13-04_preference-tags/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:34` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:42` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserPreferenceTagController.java:51` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입: `preferenceTagListNotifierProvider`로 내 태그를, 공유 `interestCatalogProvider`로 서버 카탈로그를 독립 조회한다.
2. 추천 태그 추가: `_addTag`가 현재 개수 20 미만인지 확인 ▶ notifier `addTag(tagName)` ▶ `POST /api/v1/users/me/preference-tags`.
3. 내 태그 삭제: `_removeTag` ▶ notifier `deleteTag(tagId)` ▶ `DELETE /api/v1/users/me/preference-tags/{tagId}`.
4. 태그 수정 PUT은 서버에 존재하지만 현재 profile 화면에서는 호출 UI가 확인되지 않는다.
5. `PreferenceTagListNotifier`는 `ProfileRepository`를 통해 POST/DELETE를 호출하고 성공 시 자신을 invalidate한다. 실패는 `false`로 접히며 화면은 Future를 await하지 않아 오류 toast가 없다.

## 4. 서버 계약

### 개요

서버는 `InterestTag` 카탈로그와 관심사 태그 단건 CRUD를 제공한다. 신규 저장과 실제 개명은 카탈로그 라벨만 허용하고, 현재 Flutter 프로필 화면은 조회·추가·삭제만 연결한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/interests/catalog` | `InterestCatalogController#getCatalog` | required | 25개 허용 태그를 비어 있지 않은 13개 카테고리로 반환 |
| GET | `/api/v1/users/me/preference-tags` | `UserPreferenceTagController#getMyTags` | required | 내 선호 태그 목록 조회 |
| POST | `/api/v1/users/me/preference-tags` | `UserPreferenceTagController#addTag` | required | 태그 단건 추가 |
| PUT | `/api/v1/users/me/preference-tags/{tagId}` | `UserPreferenceTagController#updateTag` | required | 태그 단건 수정 |
| DELETE | `/api/v1/users/me/preference-tags/{tagId}` | `UserPreferenceTagController#deleteTag` | required | 태그 단건 삭제 |

### 도메인 모델 / Enum (이 기능 관련)

- **Param** `UserPreferenceTagParam`: `tagName`, `weight`
- **VO** `UserPreferenceTagVo`: `id`, `tagName`, `weight`, `createdAt`
- **Entity** `UserPreferenceTag`: 테이블 `user_preference_tag`
  - `id: long`
  - `userId: long`
  - `tagName: String`
  - `weight: double`
  - `createdAt`, `updatedAt`
- **한도**: `MAX_TAGS_PER_USER = 20`
- **Enum** `InterestTag`: 25개 허용 라벨과 상위 `Category` 매핑의 서버 단일 출처.

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - `RelationshipService`, `PersonRecommendationService`, `MatchScoringService`가 관계 공통점·사람 추천·양측 동의 데이팅 점수에 실제 사용한다.
  - 온보딩 직후 최초 태그 등록은 Unit 01 범위로 overview에 위임되어 있음.
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- 마이페이지 허브에서 `선호 태그` 메뉴를 탭해 진입한다.
- 이 화면은 운영 중 태그 추가/삭제를 다룬다. 온보딩 직후 1회 등록은 Unit 01 범위다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/profile/tags` | `profile/screens/preference_tag_screen.dart` | 내 태그 조회, 추천 태그 추가, 내 태그 삭제 |

### 화면별 구성 요소 & 액션

### 선호 태그 (`preference_tag_screen.dart`)
- **사용자가 보는 것**:
  - 앱바 제목 `선호 태그`
  - `내 태그 (현재/20)` 카운터
  - 내 태그 칩과 X 아이콘
  - 내 태그가 없을 때 `아래에서 관심 태그를 추가하세요`
  - 추천 태그 섹션
  - 추천 카테고리와 라벨: `GET /api/v1/interests/catalog` 응답을 그대로 렌더링한다. 현재 비어 있지 않은 카테고리는 13개다.
  - 현재 25개 라벨: 등산, 요리, 독서, 테니스, 수영, 자전거, 골프, 음악, 전시, 언어교환, 네트워킹, 캠핑, 여행, 사진, 카페탐방, 맛집투어, 와인, 러닝, 요가, 영화, 연극, 반려동물, DIY, 봉사활동, 스터디
- **사용자가 할 수 있는 액션**:
  - 추천 태그 칩 탭 ▶ `preferenceTagListNotifierProvider.notifier.addTag(tagName)`
  - 내 태그 칩 탭 또는 X 탭 ▶ `preferenceTagListNotifierProvider.notifier.deleteTag(tag.id)`
  - 에러 상태의 재시도 ▶ `ref.invalidate(preferenceTagListNotifierProvider)`
- **상태 분기**:
  - 로딩: 중앙 `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError`
  - 빈 상태: 내 태그 영역에 안내 텍스트 표시
  - 이미 선택한 추천 태그: onTap null, 회색 텍스트
  - 20개 도달: 오류 토스트 `최대 20개까지 선택 가능합니다`
- **모달/시트/네비게이션**:
  - 저장 버튼이나 별도 확인 모달은 현재 구현에 없음.
  - 추천 태그 추가/삭제는 탭 즉시 단건 API 호출로 처리된다.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입: `preferenceTagListNotifierProvider` ▶ `GET /api/v1/users/me/preference-tags`.
2. 추천 태그 추가: `_addTag`가 현재 개수 20 미만인지 확인 ▶ notifier `addTag(tagName)` ▶ `POST /api/v1/users/me/preference-tags`.
3. 내 태그 삭제: `_removeTag` ▶ notifier `deleteTag(tagId)` ▶ `DELETE /api/v1/users/me/preference-tags/{tagId}`.
4. 태그 수정 PUT은 서버에 존재하지만 현재 profile 화면에서는 호출 UI가 확인되지 않는다.
5. `PreferenceTagListNotifier` → `ProfileRepository` → Retrofit 체인이 POST/DELETE를 호출한다. 성공 시 목록을 invalidate하고 실패는 `false`로 접는다.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 추천 태그 목록과 카테고리는 온보딩과 공유하는 `interestCatalogProvider`가 서버 카탈로그에서 읽는다. 앱 하드코딩 목록이 아니다.
- 클라이언트 한도는 20개이며 서버 `MAX_TAGS_PER_USER = 20`과 일치한다. UI 스펙의 10개 한도는 현재 코드와 불일치한다.
- UI 스펙의 앱바 저장 버튼과 일괄 PUT은 현재 화면에 없다.
- 현재 화면은 `tagName` 기반 추가를 사용한다. UI 스펙의 `{ tagId }` 기반 추가와 다르다.
- 이미 선택된 추천 태그는 비활성 칩으로 표현해 중복 추가를 막는다.
- 태그 삭제에는 확인 다이얼로그가 없다.
- 성공 토스트는 없고 재조회된 칩으로만 성공을 확인한다. POST/DELETE 실패는 `false`로 흡수되며 화면이 Future를 await하지 않아 오류 안내도 없다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 추천 태그를 눌러 관심사를 추가한다 | 로그인됨, 선호 태그 20개 미만 | `요가` 태그가 내 태그에 추가되고 추천 칩은 비활성 상태로 보인다. |
| S2 | 내 태그를 삭제한다 | 로그인됨, 내 태그에 `캠핑`이 있음 | `user_preference_tag`에서 해당 태그가 삭제되고 추천 칩은 다시 선택 가능해진다. |
| S3 | 이미 선택한 추천 태그를 다시 누를 수 없다 | 내 태그에 `러닝`이 이미 있음 | 중복 POST가 발생하지 않는다. 서버의 중복 차단은 추가 안전망으로 남는다. |
| S4 | 태그 20개 한도에 도달한다 | 내 태그가 20개 | 태그 목록은 변경되지 않는다. |
| S5 | 서버에서 태그를 찾지 못해 삭제가 실패한다 | 화면에는 오래된 태그가 남아 있음 | Provider가 `false`를 반환하고 invalidate하지 않으므로 기존 칩이 그대로 남으며 오류 안내도 없음. |

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
| 확정 | `UserPreferenceTagService`, `SecurityConfiguration` | 인증은 기본 `anyRequest().authenticated()`이고 Param/Controller에는 Bean Validation이 없다. 입력 검증은 Service 수동 분기다. | 문서 계약으로 유지 |
| 후보 | frontend.md:46 | - 클라이언트 한도는 20개이며 서버 `MAX_TAGS_PER_USER = 20`과 일치한다. UI 스펙의 10개 한도는 현재 코드와 불일치한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| Gap | `preference_tag_provider.dart`, `preference_tag_screen.dart` | mutation 실패를 `false`로 흡수하고 화면이 await하지 않아 POST/DELETE 오류 안내와 재동기화가 없다. | 실패 toast와 목록 재조회/복구 정책 추가 |

## 9. 수용 기준

- **AC-01. 추천 태그를 눌러 관심사를 추가한다**: Given 로그인됨, 선호 태그 20개 미만 When 사용자가 해당 흐름을 실행하면 Then `요가` 태그가 내 태그에 추가되고 추천 칩은 비활성 상태로 보인다.
- **AC-02. 내 태그를 삭제한다**: Given 로그인됨, 내 태그에 `캠핑`이 있음 When 사용자가 해당 흐름을 실행하면 Then `user_preference_tag`에서 해당 태그가 삭제되고 추천 칩은 다시 선택 가능해진다.
- **AC-03. 이미 선택한 추천 태그를 다시 누를 수 없다**: Given 내 태그에 `러닝`이 이미 있음 When 사용자가 해당 흐름을 실행하면 Then 중복 POST가 발생하지 않는다. 서버의 중복 차단은 추가 안전망으로 남는다.
- **AC-04. 태그 20개 한도에 도달한다**: Given 내 태그가 20개 When 사용자가 해당 흐름을 실행하면 Then 태그 목록은 변경되지 않는다.
- **AC-05. 서버에서 태그를 찾지 못해 삭제가 실패한다**: Given 화면에는 오래된 태그가 남아 있음 When 사용자가 삭제하면 Then Provider는 `false`를 반환하고 목록은 invalidate되지 않아 칩이 그대로 남으며 오류 안내도 없다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
