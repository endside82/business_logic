# F19-03. 프라이버시 공개범위 설정 PRD

<!-- source-first; updated: 2026-07-29 -->

## 1. 결론

프라이버시 설정 화면은 네 개의 토글을 제공한다. ① **캘린더 비공개**, ② **가입 클럽 숨기기**는 켜기만 PREMIUM 전용이고 끄기는 항상 허용된다. ③ **낯선 사람에게 프로필 숨기기**(`hideFromStrangers`), ④ **사람 검색·추천에서 숨기기**(`hideFromSearch`)는 구독과 무관하게 누구나 설정한다. 설정 row가 없으면 네 값 모두 false다.

"타인의 가입 클럽 보기"(`GET /api/v1/users/{targetUserId}/clubs`)는 무료 포함 전원이 조회할 수 있으며, 대상이 `hide_clubs=true`를 설정하면 빈 리스트가 반환된다. 차단 관계이면 `FORBIDDEN`.

본인 프라이버시 설정 조회(`GET /api/v1/users/me/privacy`)도 제공되어 화면 초기 상태를 서버에서 읽어온다.

### 2026-07-29 소스 재실측 — 두 신규 공개범위의 의미

- `hideFromStrangers=true`: `GET /api/v1/users/{target}/profile`에서 뷰어가 SELF/MATCHED/같은 클럽/증거등급 공동참석/증거등급 호스트-참가자 맥락 중 어디에도 속하지 않으면 leak-safe `USER_NOT_FOUND`를 반환한다. 직접 프로필 열람 정책이며 차단 검사는 더 먼저 적용된다.
- `hideFromSearch=true`: `/api/v1/search/people`, `/api/v1/users/search`, `/api/v1/users/me/met-people`, `/api/v1/users/me/people-recommendations` 후보에서 제외한다. 직접 프로필 URL을 막지는 않는다.
- `/api/v1/users/search?nickname=` 전역 사용자 선택기는 두 값이 모두 false인 사용자만 반환한다. 반면 `/api/v1/search/people`는 이미 공유 맥락 후보만 대상으로 하므로 `hideFromSearch`만 적용한다.
- 두 신규 토글은 무료 설정이며 서버/Flutter 모두 optimistic premium gate를 적용하지 않는다.
- Flutter의 통합 타인 프로필 route는 `/profile/users/:userId`이고 즐겨찾기 목록, 사람 시트,
  멘션 텍스트 등 실제 화면에서 호출한다. 따라서 `hideFromStrangers`는 직접 route에서도 서버 프로필
  조회 결과로 강제되며, 미사용 route를 전제로 설명하면 안 된다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller(프라이버시) | `PrivacySettingController.java` | endpoint 5개, PUT 요청 body |
| Backend Controller(클럽보기) | `UserClubController.java:18-28` | endpoint 1개 |
| Backend Service(프라이버시) | `PrivacySettingService.java:19-71` | 프리미엄 게이트, upsert, 게터 |
| Backend Service(클럽보기) | `UserClubService.java:19-38` | 차단·숨김 필터 |
| Backend Model | `UserPrivacySetting.java` | 테이블 구조, 공개범위 컬럼 4개 |
| Backend VO | `UserPrivacySettingVo.java`, `UserJoinedClubVo.java` | 응답 필드 |
| Backend Param | `CalendarPrivacyParam`, `ClubPrivacyParam`, `HideFromStrangersParam`, `HideFromSearchParam` | 요청 필드 |
| Frontend API | `favorite_api.dart` | privacy 조회/갱신과 타인 클럽 조회 |
| Frontend Model | `user_privacy_setting_vo.dart`, `user_joined_club_vo.dart`, `privacy_param.dart` | Freezed 모델 |
| Frontend Provider | `privacy_setting_provider.dart`, `user_clubs_provider.dart` | 상태 관리 |
| Frontend Screen | `privacy_settings_screen.dart:19-225` | 토글 UI, 업셀 다이얼로그 |
| Verification | `PrivacySettingServiceTest`, `UserQueryRepositoryTest`, `PersonSearchQueryRepositoryTest`, `EventAttendanceQueryRepositoryTest` | 신규 boolean 저장과 전역 검색·사람 검색·만난 사람/추천 제외 검증. Flutter 전용 테스트는 별도 확인되지 않음 |

## 3. 전체 동작 흐름

### 프라이버시 설정 화면
1. 마이페이지 "프라이버시 설정" 메뉴 → `/profile/privacy-settings`(`PrivacySettingsScreen`).
2. 화면 진입 시 `privacySettingNotifierProvider` watch → `GET /api/v1/users/me/privacy`.
3. 서버 `PrivacySettingService.getMySettings`: row 없으면 기본값(false, false) 반환. row 있으면 현재 설정값.
4. `personalSubscriptionNotifierProvider` watch → 프리미엄 여부 판단(`status=='ACTIVE' && planType=='PREMIUM'`).
5. 비프리미엄이면 상단 `_PremiumBanner` 표시.
6. 낯선 사람 프로필 숨김과 검색·추천 숨김은 프리미엄 상태와 무관하게 즉시 PUT한다.

### 캘린더 비공개 토글
1. 토글 ON 시도(next=true) + 비프리미엄 → `_showUpsell()` → 구독 화면 이동 제안. 서버 호출 없음.
2. 토글 ON 시도 + 프리미엄 → `PrivacySettingNotifier.setCalendarPrivate(true)` → `PUT /api/v1/users/me/privacy/calendar { privateToFavorites: true }`.
3. 서버 `PrivacySettingService.updateCalendarPrivacy`: `privateToFavorites && !isPremium` → `PREMIUM_REQUIRED`. 통과 시 upsert → `UserPrivacySettingVo` 반환.
4. 성공: `state = AsyncData(data)` → 토글 상태 갱신, "설정을 저장했어요" 토스트.
5. 서버 `PREMIUM_REQUIRED` 응답(403) → 업셀 다이얼로그.
6. 토글 OFF(next=false) → 프리미엄 여부 무관하게 서버 호출(프리미엄 게이트 없음).

### 가입 클럽 숨기기 토글
1. 동일 패턴. `PrivacySettingNotifier.setHideClubs(bool)` → `PUT /api/v1/users/me/privacy/clubs`.
2. 서버 `PrivacySettingService.updateHideClubs`: `hideClubs && !isPremium` → `PREMIUM_REQUIRED`.

### 낯선 사람에게 프로필 숨기기

1. `PUT /api/v1/users/me/privacy/strangers { hideFromStrangers }`.
2. 구독 게이트 없이 upsert하고 전체 `UserPrivacySettingVo`를 반환한다.
3. 같은 클럽·증거등급 모임·호스트/참가자·데이트 MATCHED 맥락에는 프로필이 계속 보이고, 무맥락 뷰어에게는 `USER_NOT_FOUND`로 숨김 여부와 미존재를 구별하지 못하게 한다.

### 사람 검색·추천에서 숨기기

1. `PUT /api/v1/users/me/privacy/search-visibility { hideFromSearch }`.
2. 구독 게이트 없이 upsert한다.
3. 사람 검색, 전역 사용자 선택기, 만난 사람, 홈 사람 추천에서 제외한다. 이미 알고 있는 사용자의 직접 프로필 열람은 별도 `hideFromStrangers` 계약이다.

### 타인 가입 클럽 조회
1. 타인 프로필 화면 → `userClubsProvider(userId)` watch → `GET /api/v1/users/{userId}/clubs`.
2. 서버 `UserClubService.getJoinedClubs(viewerId, targetUserId)`:
   - `viewerId != targetUserId && isBlockedBetween` → `FORBIDDEN`.
   - `viewerId != targetUserId && isClubsHidden(targetUserId)` → 빈 리스트.
   - 본인 조회 → 항상 전체 목록.
   - 통과 시 `ClubMemberQueryRepository.findJoinedClubsForViewer(targetUserId)` → `List<UserJoinedClubVo>`.
3. 타인 프로필 화면(`UserProfileScreen`)에 가입 클럽 섹션이 구현되어 있다. `userClubsProvider(userId)` watch → clubs 목록 표시. 숨김 설정 시 빈 상태 "공개된 가입 클럽이 없습니다." 표시(`user_profile_screen.dart:54-131`).

## 4. 서버 계약

### Endpoints

| HTTP | 경로 | 요청 | 응답 | 성공 상태 |
|---|---|---|---|---|
| GET | `/api/v1/users/me/privacy` | — | `UserPrivacySettingVo` | 200 |
| PUT | `/api/v1/users/me/privacy/calendar` | `@RequestBody CalendarPrivacyParam { boolean privateToFavorites }` | `UserPrivacySettingVo` | 200 |
| PUT | `/api/v1/users/me/privacy/clubs` | `@RequestBody ClubPrivacyParam { boolean hideClubs }` | `UserPrivacySettingVo` | 200 |
| PUT | `/api/v1/users/me/privacy/strangers` | `@RequestBody HideFromStrangersParam { boolean hideFromStrangers }` | `UserPrivacySettingVo` | 200 |
| PUT | `/api/v1/users/me/privacy/search-visibility` | `@RequestBody HideFromSearchParam { boolean hideFromSearch }` | `UserPrivacySettingVo` | 200 |
| GET | `/api/v1/users/{targetUserId}/clubs` | `@PathVariable long targetUserId` | `List<UserJoinedClubVo>` | 200 |

> 소스: `PrivacySettingController.java:23-42`, `UserClubController.java:22-28`

### UserPrivacySettingVo (응답)

| 필드 | 타입 | 기본값 | 비고 |
|---|---|---|---|
| `calendarPrivateToFavorites` | `boolean` | `false` | row 없으면 false |
| `hideClubs` | `boolean` | `false` | row 없으면 false |
| `hideFromStrangers` | `boolean` | `false` | 무료. 무맥락 직접 프로필 열람 제한 |
| `hideFromSearch` | `boolean` | `false` | 무료. 사람 발견 표면에서 제외 |

> 소스: `UserPrivacySettingVo.java:13-18`

### UserJoinedClubVo (응답)

| 필드 | 타입 | 비고 |
|---|---|---|
| `clubId` | `Long` | |
| `name` | `String` | |
| `thumbnailUrl` | `String` (nullable) | |
| `category` | `Category` (enum) | |
| `memberCount` | `int` | |
| `clubType` | `ClubType` | FREE/BUSINESS |
| `role` | `MemberRole` | OWNER/ADMIN/MEMBER |
| `joinedAt` | `LocalDateTime` (nullable) | |

> 소스: `UserJoinedClubVo.java:13-30`

### 에러코드

| 코드 | HTTP | 조건 |
|---|---|---|
| `PREMIUM_REQUIRED` | 403 | 비프리미엄이 토글 ON 시도 |
| `FORBIDDEN` | 403 | 차단 관계에서 타인 클럽 조회 |

> 소스: `PrivacySettingService.java:36-38, 45-47`, `UserClubService.java:30-32`

### DB 저장소

`user_privacy_setting` 테이블. row 없으면 upsert(retrieveOrCreate 패턴). Unique: `user_id`. 공개범위 값은 `calendar_private_to_favorites`, `hide_clubs`, `hide_from_strangers`, `hide_from_search` 네 개다.

> 소스: `PrivacySettingService.java:67-70`, `UserPrivacySetting.java:24-64`

## 5. 프론트 계약

| 항목 | 값 | 소스 |
|---|---|---|
| Route | `/profile/privacy-settings` | `Routes.profilePrivacySettings`, `app_router.dart` |
| 통합 타인 프로필 Route | `/profile/users/:userId` | `Routes.userProfile`, `app_router.dart`; 즐겨찾기 목록·사람 시트·멘션에서 호출 |
| Screen | `PrivacySettingsScreen` | `privacy_settings_screen.dart:19` |
| Provider(설정) | `privacySettingNotifierProvider` | `privacy_setting_provider.dart` |
| Provider(클럽) | `userClubsProvider(userId)` | `user_clubs_provider.dart` |
| 업셀 경로 | `/profile/wallet/subscription` | `privacy_settings_screen.dart:142` |
| 프리미엄 판단 | `sub.status=='ACTIVE' && sub.planType=='PREMIUM'` | `privacy_settings_screen.dart:22-25` |

### Freezed 모델 — 서버 대비 확인

| 서버 필드 | Dart 필드 | 매핑 | 판단 |
|---|---|---|---|
| `boolean calendarPrivateToFavorites` | `bool calendarPrivateToFavorites` | `@Default(false)` | 정합 |
| `boolean hideClubs` | `bool hideClubs` | `@Default(false)` | 정합 |
| `boolean hideFromStrangers` | `bool hideFromStrangers` | `@Default(false)` | 정합 |
| `boolean hideFromSearch` | `bool hideFromSearch` | `@Default(false)` | 정합 |
| `boolean privateToFavorites`(param) | `bool privateToFavorites` | 직접 | 정합 |
| `boolean hideClubs`(param) | `bool hideClubs` | 직접 | 정합 |
| `boolean hideFromStrangers`(param) | `bool hideFromStrangers` | 직접 | 정합 |
| `boolean hideFromSearch`(param) | `bool hideFromSearch` | 직접 | 정합 |
| `Category category`(club) | `String category` | `@Default('')` | 정합(enum → String) |
| `ClubType clubType`(club) | `String clubType` | `@Default('FREE')` | 정합(enum → String) |
| `MemberRole role`(club) | `String role` | `@Default('')` | 정합(enum → String) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 |
|---|---|---|---|
| 비프리미엄 · 토글 ON 시도 | 서버 `PREMIUM_REQUIRED` | 클라 선제 업셀 다이얼로그 | 구독 화면 이동 안내 |
| 비프리미엄 · 토글 OFF | 서버 게이트 없음 | 직접 서버 호출 | 공개 상태로 저장 |
| PREMIUM · 토글 ON/OFF | 게이트 없음 | 직접 서버 호출 | 저장 성공, 토스트 |
| 누구나 · 낯선 사람 숨김 ON/OFF | 구독 게이트 없음 | 직접 서버 호출 | 무맥락 프로필 열람만 제어 |
| 누구나 · 검색 숨김 ON/OFF | 구독 게이트 없음 | 직접 서버 호출 | 검색/만난 사람/추천 후보 제어 |
| 본인 클럽 조회 | `viewerId == targetUserId` → 전체 | — | 전체 목록 |
| 타인 클럽 조회 · 공개 설정 | `isClubsHidden=false` | 목록 표시 | 클럽 목록 노출 |
| 타인 클럽 조회 · 비공개 설정 | `isClubsHidden=true` → 빈 리스트 | 빈 목록 처리 | 빈 상태 표시 |
| 차단된 사용자 클럽 조회 | `FORBIDDEN` | 에러 처리 | 403 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| GET 설정 조회 | `GET /api/v1/users/me/privacy` | `@GET('/api/v1/users/me/privacy')` | 정합 |
| PUT 캘린더 | `PUT /api/v1/users/me/privacy/calendar` | `@PUT('/api/v1/users/me/privacy/calendar')` | 정합 |
| PUT 클럽 | `PUT /api/v1/users/me/privacy/clubs` | `@PUT('/api/v1/users/me/privacy/clubs')` | 정합 |
| PUT 낯선 사람 | `PUT /api/v1/users/me/privacy/strangers` | 동일 Retrofit path | 정합 |
| PUT 검색 공개범위 | `PUT /api/v1/users/me/privacy/search-visibility` | 동일 Retrofit path | 정합 |
| GET 타인 클럽 | `GET /api/v1/users/{targetUserId}/clubs` | `@GET('/api/v1/users/{userId}/clubs')` | 정합 |
| 비공개 → 빈 리스트 vs 404 | 서버 빈 리스트 반환 | 빈 리스트 처리 | 정합 |
| PREMIUM 필드 이름 | `boolean premium`(FavoriteLimitVo) | 클라 `PersonalSubscription.planType=='PREMIUM'` 별도 판단 | 중복이지만 모순 없음 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| 완료 | 타인 프로필 화면 가입 클럽 섹션 — 구현 완료 | `userClubsProvider(userId)` + `UserProfileScreen:54-131` 클럽 섹션 및 빈 상태 모두 구현됨 | 숨김 설정 시 빈 상태 "공개된 가입 클럽이 없습니다." 표시 | — |
| **P1** | 서버 `PREMIUM_REQUIRED` 응답에 대한 forbidden 처리 분기 | `privacy_settings_screen.dart:117-121` — `forbidden` 또는 `unprocessable` 둘 다 업셀 처리. 실제 서버는 `forbidden`(403)만 반환 | 큰 영향 없음, `unprocessable` 케이스가 들어올 수 없는 경로 처리 | 향후 에러 코드 세분화 시 업셀 분기 정제 |
| Risk | 비프리미엄이 토글 OFF 후 재구독 시 자동 재설정 없음 | 토글 값은 서버 저장값 그대로 유지. 다운그레이드로 토글이 true이더라도 서버는 비공개를 유지 — 설정 보존. 재구독 없이 비공개 효과 지속됨 | 비프리미엄인데도 캘린더/클럽 비공개 상태 유지(설정 row = true) — 일관성 논의 필요 | 정책 결정 필요: 구독 만료 시 자동 리셋 여부 |

## 9. 수용 기준

- **AC-01 (설정 조회)**: Given 프라이버시 설정 미설정 사용자 When `GET /users/me/privacy` Then 네 boolean이 모두 false다.
- **AC-02 (프리미엄 캘린더 비공개)**: Given PREMIUM 구독 사용자 When 캘린더 비공개 토글 ON Then 200 + `calendarPrivateToFavorites: true` 저장, 토스트.
- **AC-03 (비프리미엄 업셀)**: Given 무료 사용자 When 캘린더 비공개 토글 ON 시도 Then 클라 업셀 다이얼로그, 서버 호출 없음.
- **AC-04 (서버 이중 게이트)**: Given 비프리미엄 사용자가 클라 우회하여 `PUT /users/me/privacy/calendar { privateToFavorites: true }` 직접 호출 When Then 403 `PREMIUM_REQUIRED`.
- **AC-05 (클럽 숨김 효과)**: Given 대상이 `hideClubs=true` 설정 When 타인이 `GET /users/{targetUserId}/clubs` Then 200 + 빈 리스트.
- **AC-06 (차단 클럽 조회)**: Given 뷰어와 대상 간 차단 관계 When `GET /users/{targetUserId}/clubs` Then 403.
- **AC-07 (낯선 사람 숨김)**: Given 대상 `hideFromStrangers=true`, 공유 맥락 없음 When 통합 타인 프로필 조회 Then 404 `USER_NOT_FOUND`; 같은 클럽/증거등급 이벤트/host-participant/MATCHED 맥락은 기존 관계 view를 유지한다.
- **AC-08 (검색 숨김)**: Given 대상 `hideFromSearch=true` When 사람 검색·만난 사람·홈 추천 후보를 산출 Then 해당 사용자를 제외하되 직접 프로필 URL은 이 값만으로 막지 않는다.

## 10. 미결정 / 후속

- 구독 만료 시 프라이버시 토글 자동 리셋 여부 정책 결정.
- 타인 프로필 화면 가입 클럽 섹션 구현 완료(숨김 시 빈 상태 표시).
- 비공개 설정 효과를 알림으로 안내(예: "캘린더 비공개 켜져 있어 관심인이 볼 수 없습니다") 여부.
