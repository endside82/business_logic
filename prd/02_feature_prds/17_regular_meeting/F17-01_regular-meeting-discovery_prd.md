# F17-01. 정기모임 발견·탐색 PRD

<!-- generated: source-first-regular-meeting; updated: 2026-05-28; source: community_api/src/main/java/com/endside/community/regularmeeting -->

## 1. 결론

호스트가 발행(OPEN)한 정기모임을 사용자가 찾는 진입점. 서버는 `GET /api/v1/regular-meetings` 단일 검색 엔드포인트와 `GET /api/v1/regular-meetings/my` 내 모임 목록을 제공한다. 응답은 `Page<RegularMeetingSimpleVo>` (Spring `Page`) 로, Flutter 는 `PageResponse<RegularMeetingSimpleVo>` 로 받는다. 검색 결과는 OPEN 상태 모임만 노출하며, 카테고리·지역·타입(FIXED/VARIABLE) 으로 필터한다. 일반 이벤트 검색에서 RM 세션은 `EventScope#publiclyDiscoverable` 거름망에 의해 분류되지만, **모임 본체**의 검색은 본 엔드포인트가 단독 책임을 진다.

Flutter `RegularMeetingListScreen` 은 검색 카드 형태로 표시하며 카드에 `RegularMeetingBadge` (FIXED/VARIABLE 표시) 가 붙는다. 일반 이벤트 카드와 시각적으로 구분된다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/src/main/java/com/endside/community/regularmeeting/controller/RegularMeetingController.java:80,86` | `GET /api/v1/regular-meetings`, `GET /api/v1/regular-meetings/my` |
| Backend Service | `RegularMeetingService#search,findMyMeetings` | OPEN 필터, 호스트 닉네임 주입 |
| Backend Query | `RegularMeetingQueryRepository` | QueryDSL 동적 조건(키워드/카테고리/타입/지역) |
| Backend VO/Param | `RegularMeetingSimpleVo`, `RegularMeetingSearchParam extends PagingParam` | 응답 필드, 페이징 |
| Discovery 거름망 | `event/util/EventScope` | RM 세션(eventType=REGULAR_MEETING)을 일반 검색·홈·트렌딩·관심인 8표면에서 분류 |
| Flutter API | `community_app/lib/data/api/regular_meeting_api.dart` | Retrofit endpoint |
| Flutter Repository | `regular_meeting_repository.dart` | `Result<PageResponse<RegularMeetingSimpleVo>>` |
| Flutter Provider | `regular_meeting_list_provider.dart`, `my_regular_meetings_provider.dart` | `@Riverpod(keepAlive: true)` |
| Flutter Screen | `presentation/regular_meeting/screens/regular_meeting_list_screen.dart` | 검색 카드 + FIXED/VARIABLE 뱃지 |
| Flutter Widget | `widgets/regular_meeting_badge.dart` | 카드 상단 뱃지 |

## 3. 전체 동작 흐름

1. 사용자가 정기모임 목록 진입 → `RegularMeetingListScreen` → `regularMeetingListProvider` 구독.
2. Repository → `GET /api/v1/regular-meetings?keyword=...&category=...&meetingType=...&page=0&size=20`.
3. 서버 `RegularMeetingService#search` → `RegularMeetingQueryRepository` 동적 조건 + Pageable → OPEN 상태만 필터 후 호스트 닉네임 일괄 조회·주입.
4. Flutter 가 `RegularMeetingSimpleVo` 카드 + `RegularMeetingBadge` 렌더링. 무한 스크롤은 `PagingParam.page` 증가.
5. 카드 탭 → `Routes.regularMeetingDetail.path(id)` → F17-02.
6. "내 모임" 진입 시 `GET /api/v1/regular-meetings/my` (호스팅+등록 합산). 미로그인은 가드.

## 4. 서버 계약

### `GET /api/v1/regular-meetings`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#search` |
| 인증 | 불필요(public) |
| Query | `RegularMeetingSearchParam extends PagingParam` — `keyword, category, meetingType, region, page, size` |
| 응답 | `Page<RegularMeetingSimpleVo>` (Spring Page JSON 직렬화) |
| 정렬 | `publishedAt DESC` 기본 |
| 필터 | `status = OPEN` 강제 |

### `GET /api/v1/regular-meetings/my`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#myMeetings` |
| 인증 | 필수 (`@AuthenticationPrincipal UserPrincipal`) |
| Query | `PagingParam` |
| 응답 | `Page<RegularMeetingSimpleVo>` |
| 포함 | 호스트(`hostUserId == userId`) + 등록(`regular_meeting_member.user_id == userId AND status occupies seat`) 합산 |

`RegularMeetingSimpleVo` 핵심 필드: `id, hostUserId, hostNickname, title, category, meetingType, status, thumbnailUrl, locationType, regionSummary, startDate, endDate, totalSessionCount, upcomingSessionCount, price, baseCapacity, enrolledCount, publishedAt`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `/regular-meetings` (목록), `/regular-meetings/my` (내 모임) |
| Screen | `RegularMeetingListScreen` |
| Provider | `regularMeetingListProvider(filter)`, `myRegularMeetingsProvider` |
| Repository | `RegularMeetingRepository.search(...)` → `Result<PageResponse<RegularMeetingSimpleVo>>` |
| 뱃지 | `RegularMeetingBadge(meetingType)` — FIXED/VARIABLE 색상 구분 |
| 빈 결과 | `AppErrorState(title: '정기모임이 없습니다')` |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1-1 | 비로그인 사용자 목록 진입 | 비로그인 | OPEN 모임만 노출. 카드 탭 시 상세 진입 가능(상세도 optional auth) |
| S1-2 | 카테고리·타입 필터 | 카테고리=러닝, type=FIXED | OPEN AND category=러닝 AND type=FIXED 필터된 결과 |
| S1-3 | 검색 결과 0건 | 키워드 매치 없음 | empty 카드 표시 |
| S1-4 | 내 모임(호스트+멤버) | 로그인 | 호스팅 + 멤버십 활성 모임 합산. CLOSED/CANCELED 도 포함 |
| S1-5 | DRAFT 모임 노출 차단 | 호스트 자신이 작성중 | 일반 검색에서 미노출. 내 모임에서만 호스트에게 노출 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| OPEN 필터 | `RegularMeetingQueryRepository` 가 `regularMeeting.status.eq(OPEN)` 강제 | 검색에는 OPEN 만 노출. 내 모임은 전 상태 |
| 응답 타입 | `Page<RegularMeetingSimpleVo>` (Spring `Page`) | Flutter 는 `PageResponse<T>` 로 매핑 — `content`, `totalPages`, `totalElements`, `last`, `pageable` 키 그대로 |
| 뱃지 일관성 | `RegularMeetingBadge` 가 EventCard.badge 슬롯 위젯과 별도 | 일반 이벤트 카드와 RM 카드 모두에서 사용 가능. 다만 일반 EventCard 호출처 13+ 에 점진 적용 중(잔여 후속) |
| 호스트 닉네임 일괄 조회 | `UserQueryRepository.findNicknames(...)` 로 N+1 회피 | 100건 페이지 기준 1쿼리 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 잔여 | 구현 리포트 §9 | EventCard 호출처 13+ 개에 RM 뱃지 미통합 | 점진 적용, 위젯 자체는 준비됨 |
| 잔여 | 도메인 PRD §9 | RM 푸시 라우팅 미구현 → 알림에서 목록 deep-link 부재 | NotificationType `REGULAR_MEETING_*` 정의 후 추가 |
| 위험 | `regionSummary` | `address` 가 long string 인 경우 카드 표시 길이 깨질 수 있음 | Flutter 측 truncate 처리 |

## 9. 수용 기준

- **AC-01 (S1-1). 공개 목록**: Given 비로그인. When `GET /api/v1/regular-meetings`. Then OPEN 상태 모임만 응답.
- **AC-02 (S1-2). 필터**: Given `category=RUNNING&meetingType=FIXED`. Then 조건 일치 + OPEN 만.
- **AC-03 (S1-4). 내 모임 합산**: Given 로그인, 호스팅 1건 + 멤버 1건. Then 양쪽 모두 응답 (총 2건).
- **AC-04 (S1-5). DRAFT 비노출**: Given 호스트가 DRAFT 작성중. When 일반 검색. Then 결과에 미포함. 내 모임에서는 호스트 본인에게 노출.
- **AC-05 (S1-3). empty**: Given 매치 없음. Then `content=[]`, `totalElements=0`, Flutter 가 empty state 표시.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| 추천·트렌딩 RM | 1차 출시는 검색만 | NotificationType + 홈 섹션 RM 카드 통합 |
| 거리·가용성 정렬 | 1차는 publishedAt DESC 만 | 후속 슬라이스에서 거리 정렬 옵션 |
