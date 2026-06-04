# F19-03. 프라이버시 공개범위 설정 PRD

<!-- source-first; 작성일: 2026-06-05 -->

## 1. 결론

프라이버시 설정 화면은 두 개의 토글을 제공한다. ① **캘린더 비공개**: 켜면 나를 관심인으로 등록한 사람에게도 내 일정이 보이지 않는다. ② **가입 클럽 숨기기**: 켜면 타인이 내 프로필에서 가입 클럽 목록을 볼 수 없다. 두 토글 모두 **PREMIUM 구독 전용** — 비프리미엄이 켜려 하면 클라이언트 선제 업셀 다이얼로그 후, 서버에서도 `PREMIUM_REQUIRED`로 거절한다. 끄는 것(공개 전환)은 항상 허용된다. 설정 row가 없으면 기본 공개(false)로 간주한다.

"타인의 가입 클럽 보기"(`GET /api/v1/users/{targetUserId}/clubs`)는 무료 포함 전원이 조회할 수 있으며, 대상이 `hide_clubs=true`를 설정하면 빈 리스트가 반환된다. 차단 관계이면 `FORBIDDEN`.

본인 프라이버시 설정 조회(`GET /api/v1/users/me/privacy`)도 제공되어 화면 초기 상태를 서버에서 읽어온다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller(프라이버시) | `PrivacySettingController.java:18-43` | endpoint 3개, PUT 요청 body |
| Backend Controller(클럽보기) | `UserClubController.java:18-28` | endpoint 1개 |
| Backend Service(프라이버시) | `PrivacySettingService.java:19-71` | 프리미엄 게이트, upsert, 게터 |
| Backend Service(클럽보기) | `UserClubService.java:19-38` | 차단·숨김 필터 |
| Backend Model | `UserPrivacySetting.java:24-64` | 테이블 구조, 컬럼 2개 |
| Backend VO | `UserPrivacySettingVo.java:13-18`, `UserJoinedClubVo.java:13-30` | 응답 필드 |
| Backend Param | `CalendarPrivacyParam.java`, `ClubPrivacyParam.java` | 요청 필드 |
| Frontend API | `favorite_api.dart:33-50` | Retrofit endpoint 4개 |
| Frontend Model | `user_privacy_setting_vo.dart`, `user_joined_club_vo.dart`, `privacy_param.dart` | Freezed 모델 |
| Frontend Provider | `privacy_setting_provider.dart`, `user_clubs_provider.dart` | 상태 관리 |
| Frontend Screen | `privacy_settings_screen.dart:19-225` | 토글 UI, 업셀 다이얼로그 |
| Verification | 없음 (테스트 자산 미확인) | — |

## 3. 전체 동작 흐름

### 프라이버시 설정 화면
1. 마이페이지 "프라이버시 설정" 메뉴 → `/profile/privacy-settings`(`PrivacySettingsScreen`).
2. 화면 진입 시 `privacySettingNotifierProvider` watch → `GET /api/v1/users/me/privacy`.
3. 서버 `PrivacySettingService.getMySettings`: row 없으면 기본값(false, false) 반환. row 있으면 현재 설정값.
4. `personalSubscriptionNotifierProvider` watch → 프리미엄 여부 판단(`status=='ACTIVE' && planType=='PREMIUM'`).
5. 비프리미엄이면 상단 `_PremiumBanner` 표시.

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
| GET | `/api/v1/users/{targetUserId}/clubs` | `@PathVariable long targetUserId` | `List<UserJoinedClubVo>` | 200 |

> 소스: `PrivacySettingController.java:23-42`, `UserClubController.java:22-28`

### UserPrivacySettingVo (응답)

| 필드 | 타입 | 기본값 | 비고 |
|---|---|---|---|
| `calendarPrivateToFavorites` | `boolean` | `false` | row 없으면 false |
| `hideClubs` | `boolean` | `false` | row 없으면 false |

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

`user_privacy_setting` 테이블. row 없으면 upsert(retrieveOrCreate 패턴). Unique: `user_id`.

> 소스: `PrivacySettingService.java:67-70`, `UserPrivacySetting.java:24-64`

## 5. 프론트 계약

| 항목 | 값 | 소스 |
|---|---|---|
| Route | `/profile/privacy-settings` | `Routes.profilePrivacySettings`, `app_router.dart` |
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
| `boolean privateToFavorites`(param) | `bool privateToFavorites` | 직접 | 정합 |
| `boolean hideClubs`(param) | `bool hideClubs` | 직접 | 정합 |
| `Category category`(club) | `String category` | `@Default('')` | 정합(enum → String) |
| `ClubType clubType`(club) | `String clubType` | `@Default('FREE')` | 정합(enum → String) |
| `MemberRole role`(club) | `String role` | `@Default('')` | 정합(enum → String) |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 |
|---|---|---|---|
| 비프리미엄 · 토글 ON 시도 | 서버 `PREMIUM_REQUIRED` | 클라 선제 업셀 다이얼로그 | 구독 화면 이동 안내 |
| 비프리미엄 · 토글 OFF | 서버 게이트 없음 | 직접 서버 호출 | 공개 상태로 저장 |
| PREMIUM · 토글 ON/OFF | 게이트 없음 | 직접 서버 호출 | 저장 성공, 토스트 |
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

- **AC-01 (설정 조회)**: Given 프라이버시 설정 미설정 사용자 When `GET /users/me/privacy` Then `{ calendarPrivateToFavorites: false, hideClubs: false }`.
- **AC-02 (프리미엄 캘린더 비공개)**: Given PREMIUM 구독 사용자 When 캘린더 비공개 토글 ON Then 200 + `calendarPrivateToFavorites: true` 저장, 토스트.
- **AC-03 (비프리미엄 업셀)**: Given 무료 사용자 When 캘린더 비공개 토글 ON 시도 Then 클라 업셀 다이얼로그, 서버 호출 없음.
- **AC-04 (서버 이중 게이트)**: Given 비프리미엄 사용자가 클라 우회하여 `PUT /users/me/privacy/calendar { privateToFavorites: true }` 직접 호출 When Then 403 `PREMIUM_REQUIRED`.
- **AC-05 (클럽 숨김 효과)**: Given 대상이 `hideClubs=true` 설정 When 타인이 `GET /users/{targetUserId}/clubs` Then 200 + 빈 리스트.
- **AC-06 (차단 클럽 조회)**: Given 뷰어와 대상 간 차단 관계 When `GET /users/{targetUserId}/clubs` Then 403.

## 10. 미결정 / 후속

- 구독 만료 시 프라이버시 토글 자동 리셋 여부 정책 결정.
- 타인 프로필 화면 가입 클럽 섹션 구현 완료(숨김 시 빈 상태 표시).
- 비공개 설정 효과를 알림으로 안내(예: "캘린더 비공개 켜져 있어 관심인이 볼 수 없습니다") 여부.
