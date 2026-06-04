# 19. 관심인 PRD

<!-- source-first; 작성일: 2026-06-05; 원천: community_api/src/main/java/com/endside/community/favorite/ + community_app/lib/ 직접 읽기 -->

> 문서 상태: **신규 도메인 신설본**. 본 PRD는 `community_api/src/.../favorite/` 실제 소스(컨트롤러 4종 · 서비스 5종 · 엔티티 2종 · VO 4종 · config 1종 · 엔드포인트 12개)와 `community_app/lib/` Flutter 소스를 1차 자료로 작성한다. 계획 원본은 `community_api/docs/plan/FAVORITE_PERSON_CALENDAR_PLAN.md`.

## 1. 결론

사용자가 다른 사용자를 **단방향 비공개**로 "관심인"으로 등록하고, 그 사람의 공개 이벤트를 자신의 캘린더에 오버레이로 보는 신규 경량 도메인이다.

관계는 owner에게만 비공개 — 대상에게 "누가 나를 관심등록했는지" 알림·조회를 일절 노출하지 않는다. 한도는 설정값 기반(무료 3명 / PREMIUM 10명, `FavoritePolicyProperties` 기본값). 프리미엄 기능은 두 가지다: ① 한도 확장(3→10) ② 내 캘린더·가입클럽을 관심인에게 숨기는 프라이버시 토글 2종.

알림은 관심인이 독립 공개 이벤트를 발행할 때 `FAVORITE_PERSON_NEW_EVENT(96)` 타입으로 전원(무료 포함) 유효 관심등록자에게 팬아웃된다.

서버 구현과 Flutter 데이터 레이어·화면은 2026-05-27 구현 완료됐으나 PRD/docs에 등재되지 않아 이 문서가 그 기록이 된다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | 핵심 소스 | 상태 |
|---|---|---|---|---|
| F19-01 | 관심인 등록·해제·한도 | [F19-01_favorite-manage_prd.md](../02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md) | `FavoriteController`, `FavoriteService`, `FavoritePolicyProperties` | 구현됨 |
| F19-02 | 관심인 캘린더 뷰·알림 | [F19-02_favorite-calendar_prd.md](../02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md) | `FavoriteCalendarController`, `FavoriteCalendarService`, `FavoriteEventNotifier` | 구현됨 |
| F19-03 | 프라이버시 공개범위 설정 | [F19-03_privacy-visibility-settings_prd.md](../02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md) | `PrivacySettingController`, `PrivacySettingService`, `UserClubController`, `UserClubService` | 구현됨 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 이유 |
|---|---|
| [F19-01](../02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md) | 등록 한도(3/10)와 프리미엄 게이팅이 F19-02·F19-03의 유효성 판정 기반 |
| [F19-02](../02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md) | 캘린더 필터 체인(차단→유효성→비공개)이 관심인 신뢰 경계를 정의 |
| [F19-03](../02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md) | 두 프라이버시 토글이 프리미엄의 실질 첫 게이팅 혜택 |

## 4. 핵심 데이터·인프라

### 4.1 신규 테이블 2종 (V1__init.sql 통합)

| 테이블 | 책임 | 핵심 제약 |
|---|---|---|
| `favorite_person` | 단방향 owner→target 관계 | `uk_favorite_person(owner_id, target_id)` UNIQUE, CASCADE ON DELETE |
| `user_privacy_setting` | 프라이버시 토글 단일 출처 | `uk_user_privacy_setting_user(user_id)` UNIQUE, CASCADE. row 없으면 전부 false(공개) |

### 4.2 설정값

| 키 | 기본값 | 위치 |
|---|---|---|
| `favorite.default-max` | `3` | `FavoritePolicyProperties.java:18` |
| `favorite.premium-max` | `10` | `FavoritePolicyProperties.java:20` |

### 4.3 프리미엄 판별

`SubscriptionService.isPremium(long userId)` — 활성 PREMIUM 구독 존재 여부. `FavoriteLimitVo.premium` 필드(`boolean`, Jackson `isPremium` → JSON key `premium`)로 클라이언트에 전달.

### 4.4 알림 타입

`NotificationType.FAVORITE_PERSON_NEW_EVENT(96)` — 관심인 새 이벤트 팬아웃. `referenceType=EVENT`, `referenceId=eventId`로 딥링크.

### 4.5 동시성 보호

`addFavorite` 내부: Redisson `RLock("lock:favorite:add:{ownerId}")`, waitTime=3s, leaseTime=10s. count→insert 레이스 조건 방어.

## 5. 컨트롤러 전수 목록 (12 endpoints)

| 컨트롤러 | 기본 경로 | Endpoint 수 |
|---|---|---|
| `FavoriteController` | `/api/v1/favorites` | 4 |
| `FavoriteCalendarController` | `/api/v1/calendar/favorites` | 2 |
| `PrivacySettingController` | `/api/v1/users/me/privacy` | 3 |
| `UserClubController` | `/api/v1/users` | 1 |

> `UserClubController`는 타인 가입 클럽 보기 엔드포인트 1개만 담당. "나를 관심등록한 사람 목록" 조회 엔드포인트는 설계 원칙(비공개 관계)상 존재하지 않는다.

## 6. 도메인 외부 영향

| 도메인 | 영향 | 이유 |
|---|---|---|
| 03 이벤트 | **강함** | `EventPublishedEvent` 발행 훅(독립 이벤트 publish 시). `EventScope.isPublicClassification` 공용 거름망 사용. |
| 06 결제·지갑 | **있음** | `SubscriptionService.isPremium` 의존. 관심인 한도·프라이버시 토글의 게이팅 판정 기반. |
| 09 데이팅 | **있음** | `DateBlockRepository` 양방향 차단 검사(`BLOCKED` 상태 필터). 차단 관계면 등록·캘린더·클럽 보기 모두 차단. |
| 10 캘린더 | **있음** | `CalendarEventVo`에 `ownerUserId`·`ownerNickname` 필드 추가(nullable). 본인 캘린더에서는 null — 기존 응답 무영향. |
| 12 알림 | **있음** | `NotificationType.FAVORITE_PERSON_NEW_EVENT(96)` 신규. `notification_router.dart`에 이벤트 상세 딥링크 배선 완료. 단 Flutter `NotificationType` enum에 전용 값이 미등재(문자열 직접 처리로 동작하나 타입 안전성 없음). |
| 13 프로필·설정 | **있음** | 마이페이지 진입점 2개 추가(관심인 `/profile/favorites`, 프라이버시 설정 `/profile/privacy-settings`). |

## 7. 진행 상태 (2026-05-27 기준)

| 레이어 | 상태 |
|---|---|
| 서버 (Java Spring Boot) | 구현 완료. 컨트롤러 4 · 서비스 5 · 리포지토리 3 · 엔티티 2 |
| Flutter 데이터 레이어 | 구현 완료. Freezed 모델 6 · Retrofit API 1 · Repository 1 · Provider 5 |
| Flutter 화면 | 구현 완료. `FavoriteListScreen`, `PrivacySettingsScreen`. 캘린더 오버레이 토글 통합. |
| 라우터 | 구현 완료. `/profile/favorites`, `/profile/privacy-settings` 등록. |
| PRD/docs | 이 문서가 최초 등재. |

## 8. 잔여 후속 (Gap 정리)

| 항목 | 근거 | 우선순위 |
|---|---|---|
| Flutter `NotificationType` enum에 `FAVORITE_PERSON_NEW_EVENT` 미등재 | `notification_router.dart`에 딥링크 배선 완료(이벤트 상세 이동). 그러나 `notification_type.dart` enum에 해당 값 없어 타입 안전성 없음(문자열 직접 처리로 동작). | P1 |
| `FavoritePersonCalendarProvider`(개별 뷰) 없음 | `FavoriteCalendarController.getFavoritePersonMonthly` 구현됨, Flutter에 `FavoriteCalendarNotifier`는 집계 뷰만 있고 개별 뷰 Provider·화면 진입 CTA 미구현. | P1 |
| 타인 프로필 화면 UserClubs 섹션 — 구현 완료 | `userClubsProvider(userId)` + `UserProfileScreen` 가입 클럽 섹션 구현됨(숨김 시 빈 상태 "공개된 가입 클럽이 없습니다." 표시). | 완료 |
| `isEffectiveFavorite` N+1 성능 | `FavoriteService.java:145-147` — owner별 전체 목록 로드 후 contains. 팔로워가 많은 host 시 성능 저하. | P2 |
| 관심인 알림 참가 이벤트 확장(Phase 4.5) | 현재 알림은 주최(publish)만. 참가 확정 시 팬아웃은 계획서 §6.3 참조. | P3 |

## 9. 관련 문서

- 계획 원본: `community_api/docs/plan/FAVORITE_PERSON_CALENDAR_PLAN.md`
- 구독 게이팅: `prd/02_feature_prds/06_payment/F06-08_personal-subscription_prd.md`
- 캘린더: `prd/01_domain_prds/10_캘린더_prd.md`
- 알림 정책: `prd/03_policy_prds/notification_policy_prd.md`
