# F13-04. 선호 태그 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

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

## 2. 코드 위치

계약의 정본은 코드다. 서버: `UserPreferenceTagController`, `InterestCatalogController`, `RelationshipService`, `PersonRecommendationService`, `MatchScoringService`. 앱: `preference_tag_screen.dart`.

## 3. 전체 동작 흐름

1. 화면 진입: `preferenceTagListNotifierProvider`로 내 태그를, 공유 `interestCatalogProvider`로 서버 카탈로그를 독립 조회한다.
2. 추천 태그 추가: `_addTag`가 현재 개수 20 미만인지 확인 ▶ notifier `addTag(tagName)` ▶ `POST /api/v1/users/me/preference-tags`.
3. 내 태그 삭제: `_removeTag` ▶ notifier `deleteTag(tagId)` ▶ `DELETE /api/v1/users/me/preference-tags/{tagId}`.
4. 태그 수정 PUT은 서버에 존재하지만 현재 profile 화면에서는 호출 UI가 확인되지 않는다.
5. `PreferenceTagListNotifier`는 `ProfileRepository`를 통해 POST/DELETE를 호출하고 성공 시 자신을 invalidate한다. 실패는 `false`로 접히며 화면은 Future를 await하지 않아 오류 toast가 없다.

## 4. 제품 규칙

- 고를 수 있는 태그는 서버 카탈로그의 25개 라벨(13개 카테고리)뿐이다. 추천 칩은 온보딩과 같은 카탈로그를 그대로 보이고 앱에 따로 적어 두지 않는다.
- 한 사용자가 가질 수 있는 태그는 최대 20개이고 같은 태그를 두 번 넣을 수 없다(예전 UI 스펙의 10개는 틀렸다). 화면 위에 `내 태그 (현재/20)` 를 보이고, 20개에서 더 누르면 `최대 20개까지 선택 가능합니다` 가 뜬다.
- 추가와 삭제는 칩을 누르는 즉시 한 건씩 반영된다. 저장 버튼, 확인 창, 일괄 저장은 없다. 삭제에도 확인 창이 없고, 성공 안내 없이 다시 불러온 칩으로 결과를 보인다. 이미 고른 추천 칩은 회색으로 눌리지 않는다.
- 태그가 하나도 없으면 `아래에서 관심 태그를 추가하세요` 가 보인다. 온보딩 직후 첫 등록은 인증 온보딩의 몫이고 이 화면은 그 뒤의 추가와 삭제만 다룬다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 추천 태그를 눌러 관심사를 추가한다 | 로그인됨, 선호 태그 20개 미만 | `요가` 태그가 내 태그에 추가되고 추천 칩은 비활성 상태로 보인다. |
| S2 | 내 태그를 삭제한다 | 로그인됨, 내 태그에 `캠핑`이 있음 | `user_preference_tag`에서 해당 태그가 삭제되고 추천 칩은 다시 선택 가능해진다. |
| S3 | 이미 선택한 추천 태그를 다시 누를 수 없다 | 내 태그에 `러닝`이 이미 있음 | 중복 POST가 발생하지 않는다. 서버의 중복 차단은 추가 안전망으로 남는다. |
| S4 | 태그 20개 한도에 도달한다 | 내 태그가 20개 | 태그 목록은 변경되지 않는다. |
| S5 | 서버에서 태그를 찾지 못해 삭제가 실패한다 | 화면에는 오래된 태그가 남아 있음 | Provider가 `false`를 반환하고 invalidate하지 않으므로 기존 칩이 그대로 남으며 오류 안내도 없음. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 확정 | `UserPreferenceTagService`, `SecurityConfiguration` | 인증은 기본 `anyRequest().authenticated()`이고 Param/Controller에는 Bean Validation이 없다. 입력 검증은 Service 수동 분기다. | 문서 계약으로 유지 |
| 해소됨 | 태그 한도 | 태그는 서버와 앱 모두 20개까지다. 화면 위에 「내 태그 (현재/20)」 이 보이고 20개에서 더 누르면 「최대 20개까지 선택 가능합니다」 가 뜬다. 화면 명세의 10개는 옛 값이다 | 없음 |
| Gap | `preference_tag_provider.dart`, `preference_tag_screen.dart` | mutation 실패를 `false`로 흡수하고 화면이 await하지 않아 POST/DELETE 오류 안내와 재동기화가 없다. | 실패 toast와 목록 재조회/복구 정책 추가 |

## 9. 수용 기준

- **AC-01. 추천 태그를 눌러 관심사를 추가한다**: Given 로그인됨, 선호 태그 20개 미만 When 사용자가 해당 흐름을 실행하면 Then `요가` 태그가 내 태그에 추가되고 추천 칩은 비활성 상태로 보인다.
- **AC-02. 내 태그를 삭제한다**: Given 로그인됨, 내 태그에 `캠핑`이 있음 When 사용자가 해당 흐름을 실행하면 Then `user_preference_tag`에서 해당 태그가 삭제되고 추천 칩은 다시 선택 가능해진다.
- **AC-03. 이미 선택한 추천 태그를 다시 누를 수 없다**: Given 내 태그에 `러닝`이 이미 있음 When 사용자가 해당 흐름을 실행하면 Then 중복 POST가 발생하지 않는다. 서버의 중복 차단은 추가 안전망으로 남는다.
- **AC-04. 태그 20개 한도에 도달한다**: Given 내 태그가 20개 When 사용자가 해당 흐름을 실행하면 Then 태그 목록은 변경되지 않는다.
- **AC-05. 서버에서 태그를 찾지 못해 삭제가 실패한다**: Given 화면에는 오래된 태그가 남아 있음 When 사용자가 삭제하면 Then Provider는 `false`를 반환하고 목록은 invalidate되지 않아 칩이 그대로 남으며 오류 안내도 없다.
