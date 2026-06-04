# F19-01. 관심인 등록·해제·한도 PRD

<!-- source-first; 작성일: 2026-06-05 -->

## 1. 결론

사용자는 다른 사용자를 단방향·비공개로 "관심인"으로 등록하고, 한도 내에서 자유롭게 해제할 수 있다. 등록 관계는 owner에게만 비공개 — 대상에게는 누가 자신을 관심등록했는지 알림·조회를 일절 제공하지 않는다. 한도는 설정값 기반(무료 3명 / PREMIUM 10명)이며, PREMIUM 구독 유무로 실시간 판별한다. 한도 초과·중복·자기자신·차단 관계·비존재 대상은 서버에서 거절한다. 다운그레이드 시 등록 row는 보존되고 등록순 최초 N명만 "유효(active)" 처리되어 캘린더·알림에서만 효력을 발휘한다 — 목록 화면에는 dormant 배지로 표시되고, 해제 후 재등록하거나 PREMIUM 재가입 시 자동 복원된다.

서버와 Flutter 양쪽 구현이 완료되어 있으며, 서버-Flutter 계약 정합성이 높다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `FavoriteController.java:18-53` | endpoint 4개, HTTP 상태, PathVariable/RequestBody |
| Backend Service | `FavoriteService.java:48-166` | 한도 검증, 차단 검사, 동시성 잠금, active 로직 |
| Backend Config | `FavoritePolicyProperties.java:17-21` | defaultMax=3, premiumMax=10 |
| Backend VO | `FavoritePersonVo.java:19-26`, `FavoriteLimitVo.java:14-19` | 응답 필드 전수 |
| Backend Param | `FavoriteAddParam.java:12-15` | 요청 필드 |
| Backend Repository | `FavoritePersonRepository.java:9-25` | 메서드 계약 |
| Frontend API | `favorite_api.dart:20-31` | Retrofit endpoint 4개 |
| Frontend Model | `favorite_person_vo.dart`, `favorite_limit_vo.dart` | Freezed 모델 필드 |
| Frontend Provider | `favorite_list_provider.dart`, `favorite_limit_provider.dart` | 상태 관리 흐름 |
| Frontend Screen | `favorite_list_screen.dart:21-305` | CTA, 업셀 다이얼로그, dormant 배지 |
| Verification | 없음 (테스트 자산 미확인) | — |

## 3. 전체 동작 흐름

### 등록 흐름
1. 사용자가 마이페이지 메뉴 "관심인" → `/profile/favorites`(`FavoriteListScreen`) 진입.
2. `FavoriteListScreen`이 `FavoriteListNotifier`(`.getFavorites()`)와 `FavoriteLimitNotifier`(`.getLimit()`)를 동시 watch.
3. FAB "추가" 탭 → `FavoriteAddSheet` 바텀시트 오픈(닉네임 검색 피커 — `/api/v1/users/search?nickname=` 재사용).
4. 대상 선택 → `FavoriteListNotifier.add(targetUserId)` → `POST /api/v1/favorites`.
5. 서버 `FavoriteService.addFavorite`: 자기자신 → `FAVORITE_SELF_NOT_ALLOWED`; 차단 → `FORBIDDEN`; 중복 → `FAVORITE_ALREADY_EXISTS`; 한도 초과 → `FAVORITE_LIMIT_EXCEEDED`. 모두 통과 시 `favorite_person` row 저장 → `FavoritePersonVo` 반환(201).
6. 성공 시 `favoriteListNotifierProvider`·`favoriteLimitNotifierProvider` 모두 invalidate. 실패 시 `AppToast.show` 오류 메시지.

### 해제 흐름
1. 목록의 타일 우측 × 버튼 → `AppDialog.confirm`.
2. `FavoriteListNotifier.remove(targetUserId)` → `DELETE /api/v1/favorites/{targetUserId}`.
3. 서버: row 없으면 `FAVORITE_NOT_FOUND`. 성공 시 204.
4. 성공/실패 토스트 표시.

### 한도 초과 선제 업셀
- FAB 탭 시 `limit.currentCount >= limit.maxCount`이면 `AppDialog.alert`(프리미엄이면) 또는 `AppDialog.confirm`("프리미엄으로 더 많은 관심인" + 구독 화면 이동)(비프리미엄이면).

## 4. 서버 계약

### Endpoints

| HTTP | 경로 | 요청 | 응답 | 성공 상태 |
|---|---|---|---|---|
| POST | `/api/v1/favorites` | `@RequestBody FavoriteAddParam { @NotNull Long targetUserId }` | `FavoritePersonVo` | 201 |
| GET | `/api/v1/favorites` | — | `List<FavoritePersonVo>` | 200 |
| DELETE | `/api/v1/favorites/{targetUserId}` | `@PathVariable long targetUserId` | void | 204 |
| GET | `/api/v1/favorites/limit` | — | `FavoriteLimitVo` | 200 |

> 소스: `FavoriteController.java:26-52`

### FavoritePersonVo (응답)

| 필드 | 타입 | 비고 |
|---|---|---|
| `id` | `Long` | favorite_person PK |
| `targetUserId` | `Long` | 관심 대상 userId |
| `nickname` | `String` | QueryDSL Users 조인 |
| `profileImageUrl` | `String` (nullable) | QueryDSL Member 조인 |
| `createdAt` | `LocalDateTime` (nullable) | 등록 시각 |
| `active` | `boolean` | 유효 N명 내 = true, dormant = false (서비스 레이어 세팅) |

> 소스: `FavoritePersonVo.java:19-26`, `FavoriteQueryRepository.java:38-53`

### FavoriteLimitVo (응답)

| 필드 | 타입 | JSON key | 비고 |
|---|---|---|---|
| `currentCount` | `int` | `currentCount` | 현재 등록 수 |
| `maxCount` | `int` | `maxCount` | 현재 한도 |
| `premium` | `boolean` | `premium` | Jackson `isPremium` → `premium` 변환 |

> 소스: `FavoriteLimitVo.java:14-19`

### 에러코드

| 코드 | HTTP | 발화 조건 |
|---|---|---|
| `FAVORITE_SELF_NOT_ALLOWED` | 400 | ownerId == targetId |
| `FAVORITE_ALREADY_EXISTS` | 409 | 중복 등록 |
| `FAVORITE_LIMIT_EXCEEDED` | 400 | count >= maxFor(ownerId) |
| `FAVORITE_NOT_FOUND` | 404 | 해제 시 row 없음 |
| `USER_NOT_FOUND` | 404 | 대상 미존재 또는 비정상 상태 |
| `FORBIDDEN` | 403 | 차단 관계 |
| `TOO_MANY_REQUESTS` | 429 | Redisson 잠금 획득 실패 |

> 소스: `FavoriteService.java:50-68, 84-115`

### 동시성 잠금

`RLock("lock:favorite:add:{ownerId}")` — waitTime=3s, leaseTime=10s. count→insert 레이스 방어. 획득 실패 시 `TOO_MANY_REQUESTS`.

> 소스: `FavoriteService.java:55-70`

### active 판정 로직

`getMyFavorites`: `findFavoritesWithProfile(ownerId)` 결과를 등록순(`createdAt ASC, id ASC`)으로 받아 인덱스 `i < maxFor(ownerId)`이면 `active=true`, 나머지는 `active=false` 세팅.

`effectiveTargetIds(ownerId)`: 같은 정렬 기준으로 상위 N개만 추출. 캘린더·알림 팬아웃의 "유효 대상" 집합.

> 소스: `FavoriteService.java:122-140`

## 5. 프론트 계약

| 항목 | 값 | 소스 |
|---|---|---|
| Route | `/profile/favorites` | `Routes.profileFavorites`, `app_router.dart:3046-3049` |
| Screen | `FavoriteListScreen` | `favorite_list_screen.dart:21` |
| Provider(목록) | `favoriteListNotifierProvider` | `favorite_list_provider.dart:13` |
| Provider(한도) | `favoriteLimitNotifierProvider` | `favorite_limit_provider.dart:9` |
| API(등록) | `FavoriteApi.addFavorite(FavoriteAddParam)` | `favorite_api.dart:21` |
| API(목록) | `FavoriteApi.getFavorites()` | `favorite_api.dart:24` |
| API(해제) | `FavoriteApi.removeFavorite(targetUserId)` | `favorite_api.dart:27` |
| API(한도) | `FavoriteApi.getLimit()` | `favorite_api.dart:30` |
| 업셀 경로 | `/profile/wallet/subscription` | `favorite_list_screen.dart:120` |
| dormant 배지 | `_DormantBadge`("프리미엄 시 활성") | `favorite_list_screen.dart:287-305` |

### Freezed 모델 — 서버 대비 확인

| 서버 필드 | Dart 필드 | 매핑 | 판단 |
|---|---|---|---|
| `Long id` | `int id` | 직접 | 정합 |
| `Long targetUserId` | `int targetUserId` | 직접 | 정합 |
| `String nickname` | `String nickname` | 직접 | 정합 |
| `String profileImageUrl` | `String? profileImageUrl` | nullable | 정합 |
| `LocalDateTime createdAt` | `DateTime? createdAt` | nullable | 정합 |
| `boolean active` | `bool active` | `@Default(true)` | 정합 |
| `boolean premium`(FavoriteLimitVo) | `bool premium` | `@JsonKey(name: 'premium')` | 정합(Jackson is-prefix 제거 처리됨) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 |
|---|---|---|---|
| 무료(무구독) · 한도 미만 | maxFor=3, count<3 | FAB 활성 | 등록 가능 |
| 무료 · 한도 도달(3명) | maxFor=3, count>=3 | FAB 탭 → 업셀 다이얼로그 | 구독 안내 후 이동 불가 |
| PREMIUM · 한도 미만 | maxFor=10 | FAB 활성 | 등록 가능 |
| PREMIUM · 한도 도달(10명) | maxFor=10, count>=10 | FAB 탭 → 알림 다이얼로그 | "최대 10명" 안내 |
| 자기자신 등록 시도 | `FAVORITE_SELF_NOT_ALLOWED` | ToastType.error | 오류 토스트 |
| 차단된 사용자 등록 시도 | `FORBIDDEN` | ToastType.error("등록할 수 없는 사용자") | 오류 토스트 |
| 중복 등록 시도 | `FAVORITE_ALREADY_EXISTS`(409) | conflict → "이미 등록된 관심인" | 오류 토스트 |
| PREMIUM → 무료 다운그레이드 후 기존 관심인 | active=false (서비스 레이어) | dormant 배지 표시, 반투명 | 목록 잔존, 캘린더/알림 비활성 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 한도(무료) | `defaultMax=3` (`FavoritePolicyProperties.java:18`) | `limit.maxCount` 표시 + 업셀 | 정합 |
| 한도(프리미엄) | `premiumMax=10` (`FavoritePolicyProperties.java:20`) | `limit.maxCount` 표시 | 정합 |
| `premium` JSON key | Jackson `isPremium` → `premium` | `@JsonKey(name: 'premium')` | 정합 |
| 등록 응답 201 | `ResponseEntity.status(201).body(vo)` | Retrofit `Future<FavoritePersonVo>` | 정합 |
| 해제 응답 204 | `ResponseEntity.noContent().build()` | `Future<void>` | 정합 |
| dormant 로직 | `active` 서비스 레이어 세팅 | `@Default(true) bool active` | 정합 (서버가 세팅, Flutter 수신) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| Gap-P1 | 테스트 자산 미확인 | 단위/통합 테스트 파일 미확인 | 회귀 검증 공백 | 테스트 파일 확인 후 보강 |
| Gap-P2 | `isEffectiveFavorite` N+1 | `FavoriteService.java:145-147` — owner별 전체 row 로드 후 contains | 관심인 많은 대형 host 알림 팬아웃 시 성능 저하 | 단일 rank 쿼리 최적화 후속 |
| Risk | Redisson 잠금 실패 시 UX | `TOO_MANY_REQUESTS` 오류 코드 클라 미분기 처리 | "관심인 등록에 실패했습니다" 범용 메시지 노출 | orElse 분기는 현재 적절, 메시지 정제 고려 |

## 9. 수용 기준

- **AC-01 (무료 한도)**: Given 무료 사용자 + 관심인 3명 등록됨 When FAB 탭 Then 구독 안내 다이얼로그 표시, "프리미엄 보기" 탭 시 `/profile/wallet/subscription` 이동.
- **AC-02 (등록 성공)**: Given 무료 사용자 + 관심인 0명 When targetUserId 선택 → 확인 Then 201 응답, 목록에 새 항목, 한도 카운트 +1.
- **AC-03 (해제)**: Given 관심인 1명 이상 등록됨 When × 탭 → 확인 Then 204 응답, 목록에서 제거, 카운트 -1, "해제했어요" 토스트.
- **AC-04 (중복 방지)**: Given 이미 등록된 대상 When 동일 targetUserId 재등록 Then 409 → "이미 등록된 관심인" 토스트.
- **AC-05 (dormant 배지)**: Given PREMIUM→무료 다운그레이드 후 관심인 4~N명 등록됨 When 목록 조회 Then 4번째 이후 항목에 "프리미엄 시 활성" 배지 + 반투명 표시.

## 10. 미결정 / 후속

- 단위/통합 테스트 파일 존재 여부 확인 필요.
- `FavoriteAddSheet` 내부 닉네임 검색 UX(검색 제한·공백 처리 등) 상세 확인 미완.
- 프리미엄 업셀 후 구독 완료 시 자동으로 관심인 목록 fresh 여부 — 현재 미검증.
