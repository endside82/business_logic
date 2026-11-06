# F19-02. 관심인 캘린더 뷰·새 이벤트 알림 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first; 작성일: 2026-06-05 -->

## 1. 결론

관심인 캘린더는 두 개의 뷰를 제공한다. **집계 뷰**(`GET /api/v1/calendar/favorites/monthly`)는 유효 관심인 전원의 이벤트를 월간 캘린더에 오버레이로 보여주고, **개별 뷰**(`GET /api/v1/calendar/favorites/{targetUserId}/monthly`)는 특정 관심인 한 명의 일정만 단독으로 보여준다.

표시 대상은 독립 공개 이벤트만(클럽 이벤트·PRIVATE 제외, `EventScope.isPublicClassification` 거름망), status `OPEN` 또는 `CLOSED`이며 주최(HOSTING)와 참가(ATTENDING, EventAttendance 기준) 모두 포함한다. 차단 관계이거나 대상이 캘린더를 비공개로 설정한 경우 해당 대상 이벤트는 조회에서 제외된다.

알림은 관심인이 독립 공개 이벤트를 발행(DRAFT→OPEN)할 때 `FAVORITE_PERSON_NEW_EVENT(96)` 타입으로, 그 host를 유효하게(등록순 N명 내) 관심등록한 사용자에게 팬아웃된다. 무료·프리미엄 구분 없이 전원 수신.

알림 딥링크(`notification_router.dart` :50)는 `FAVORITE_PERSON_NEW_EVENT` 케이스가 이벤트 상세로 배선되어 있어 탭 시 정상 이동한다. Flutter `NotificationType` enum(`notification_type.dart`) 미등재 Gap은 **해소(2026-06-06)** — `FAVORITE_PERSON_NEW_EVENT`가 분쟁 3종과 함께 enum에 등재되어 타입 안전성을 확보했다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `FavoriteCalendarController`, `FavoriteCalendarService`, `FavoriteEventNotifier`, `FavoriteQueryRepository`, `CalendarEventVo`. 앱: `monthly_calendar_screen.dart`, `favorite_api.dart`, `calendar_event_vo.dart`, `favorite_calendar_provider.dart`, `notification_router.dart`.

## 3. 전체 동작 흐름

### 집계 오버레이 뷰
1. 사용자가 캘린더 화면(`monthly_calendar_screen.dart`) 진입.
2. 우측 하단 하트 토글 아이콘 탭 → `_showFavorites = true`.
3. `favoriteCalendarNotifierProvider(year, month)` watch → `GET /api/v1/calendar/favorites/monthly?year=&month=`.
4. 서버 `FavoriteCalendarService.getAllFavoritesCalendar`:
   - `effectiveTargetIds(ownerId)` — 유효 N명.
   - 그중 `!isCalendarPrivateToFavorites` && `!isBlockedBetween` 필터.
   - 남은 targetIds IN 쿼리 → HOSTING + ATTENDING 이벤트 조회(EventScope.publicClassification, OPEN/CLOSED).
   - ownerNickname 채움, isPast 세팅, startTime 정렬 → `List<CalendarEventVo>` 반환.
5. 캘린더 날짜 셀에 관심인 이벤트 마커 오버레이(ownerNickname별 그룹 표시).

### 개별 뷰
1. 관심인 목록 타일 탭 → 타인 프로필 화면 `/profile/users/{targetUserId}`.
2. 프로필 화면의 "캘린더 보기" → `GET /api/v1/calendar/favorites/{targetUserId}/monthly?year=&month=`.
3. 서버 `FavoriteCalendarService.getFavoritePersonCalendar`:
   - `isBlockedBetween` → `FORBIDDEN`.
   - `isEffectiveFavorite` → `FAVORITE_NOT_FOUND`(유효 N명 밖이면 차단).
   - `isCalendarPrivateToFavorites` → `CALENDAR_PRIVATE`.
   - 통과 시 단일 targetId IN 쿼리 → 응답.
4. **Gap**: 서버 endpoint(`GET /api/v1/calendar/favorites/{targetUserId}/monthly`)와 Flutter API 메서드(`FavoriteApi.getFavoritePersonMonthly`)는 구현되어 있으나, 개별 뷰 전용 Provider와 화면에서의 진입 CTA가 미구현이다. `FavoriteCalendarNotifier`는 집계 뷰만 구현하며, 특정 관심인 개별 캘린더를 단독으로 보여주는 Provider·화면 흐름이 없다.

### 알림 팬아웃
1. 호스트가 독립 이벤트 발행(`EventService.publishEvent`) → `EventPublishedEvent` 발행.
2. `FavoriteEventNotifier.onEventPublished` (AFTER_COMMIT, REQUIRES_NEW):
   - `EventScope.isPublicClassification` false면 조기 종료.
   - host가 캘린더 비공개 설정이면 조기 종료.
   - host를 관심등록한 owner 중 유효+비차단 필터 → `ownerIds`.
   - `createBatchNotifications(ownerIds, FAVORITE_PERSON_NEW_EVENT, ...)` → FCM 푸시 + in-app 알림.
3. Flutter `notification_router.dart` :50에 `FAVORITE_PERSON_NEW_EVENT` 케이스가 이벤트 상세로 배선되어 있다. 딥링크는 정상 동작한다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 |
|---|---|---|---|
| 오버레이 OFF | — | `!_showFavorites` | 관심인 이벤트 비표시 |
| 유효 관심인 0명 | `visibleTargetIds.isEmpty()` → `List.of()` | 빈 목록 | 오버레이 켜도 마커 없음 |
| 관심인 있으나 모두 비공개 설정 | `isCalendarPrivateToFavorites` 필터 후 0명 | 빈 목록 | 동일 |
| 개별 뷰 — 차단 관계 | `FORBIDDEN` | 에러 처리 필요 | 403 |
| 개별 뷰 — dormant 관심인 | `FAVORITE_NOT_FOUND` | 에러 처리 필요 | 404 |
| 개별 뷰 — 비공개 설정 대상 | `CALENDAR_PRIVATE` | 에러 처리 필요 | 403 |
| 알림 수신(무료) | ownerIds 포함 | — | FAVORITE_PERSON_NEW_EVENT 수신 |
| 알림 탭 | notification_router.dart :50 배선 완료 | 이벤트 상세 이동 | 정상 동작. NotificationType enum 등재 완료(2026-06-06) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 집계 API endpoint | `GET /api/v1/calendar/favorites/monthly` | `@GET('/api/v1/calendar/favorites/monthly')` | 정합 |
| 개별 API endpoint | `GET /api/v1/calendar/favorites/{targetUserId}/monthly` | `@GET('/api/v1/calendar/favorites/{targetUserId}/monthly')` | 정합 |
| ownerNickname | 서버 채움 | Flutter null-safe `?? '관심인 #'` 대체 | 정합 |
| ATTENDING 기준 | `EventAttendance.ATTENDING` | — (서버 처리) | 정합 |
| 알림 타입 96 | `NotificationType.FAVORITE_PERSON_NEW_EVENT(96)` | router 배선 완료. enum 등재 완료 | 딥링크 정상. 타입 안전성 확보 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| ~~P1~~ 해소(2026-06-06) | Flutter `NotificationType` enum에 `FAVORITE_PERSON_NEW_EVENT` ~~미등재~~ → **등재 완료** | `notification_type.dart` enum에 분쟁 3종과 함께 등재됨 → 타입 안전성 확보 | enum fromString 정상 매핑 | 완료 |
| **P1** | 개별 뷰 Provider·CTA 미구현 | 서버 endpoint·Flutter API 메서드(`FavoriteApi.getFavoritePersonMonthly`) 구현됨, Flutter Provider·화면 진입 CTA 없음 | 특정 관심인 캘린더 개별 조회 화면 미지원 | `FavoritePersonCalendarNotifier(targetUserId, year, month)` Provider 추가 + 관심인 프로필 화면 CTA 연결 |
| **P2** | `isEffectiveFavorite` N+1 | `FavoriteService.java:145-147` 전체 목록 로드 후 contains | 팬아웃 시 대형 host 성능 | rank 쿼리 최적화 |
| Risk | 본인 캘린더 참가 이벤트 누락 | 계획서 §5.3 메모 — `CalendarQueryRepository.findAttendingEvents`는 Application APPROVED 기반(EventAttendance 미사용). 관심인 캘린더는 EventAttendance 기반이라 이중 기준 존재. | 본인 캘린더 참가 이벤트 일부 누락 가능성 | 별도 후속 검토 |

## 9. 수용 기준

- **AC-01 (집계 오버레이)**: Given 관심인 2명 등록(공개 설정), 각 1개 이상 이벤트 주최 When 캘린더 오버레이 ON Then 해당 날짜에 ownerNickname별 마커 표시.
- **AC-02 (비공개 필터)**: Given 관심인 A=비공개, B=공개 When 오버레이 ON Then A 이벤트 비표시, B 이벤트 표시.
- **AC-03 (차단 필터)**: Given 차단된 관심인 C When 오버레이 ON Then C 이벤트 비표시.
- **AC-04 (알림 발화)**: Given 유효 관심인 등록자 존재 When 관심인이 독립 공개 이벤트 발행 Then FAVORITE_PERSON_NEW_EVENT(96) 알림 수신.
- **AC-05 (딥링크)**: Given 알림 수신 When 탭 Then 이벤트 상세 화면으로 이동. (배선 완료 — 현재 동작함)

## 10. 미결정 / 후속

- 참가 이벤트 알림(Phase 4.5) 범위 및 시점 결정.
- 개별 뷰 Provider 구현 우선순위 결정.
- 본인 캘린더 참가 이벤트 Application vs EventAttendance 기준 통일 여부 결정.
