# F04-10. 공지사항 PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-10; unit: business_logic/units/04_club/F04-10_announcements -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-10_announcements`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> **2026-06-10 AUTH-06 반영**: 예약 공지(`AnnouncementStatus.SCHEDULED`) 신설, 고정 공지 동시 생성 비관적 락 강화.

## 1. 결론

OWNER/ADMIN이 모든 멤버에게 일괄 알림을 보내는 단방향 게시 도구. 클럽 멤버에게 FCM으로 새 공지가 도달하고, 멤버는 목록을 읽을 수 있다. 고정 공지(상단 sticky)는 클럽당 최대 3개. BUSINESS 클럽은 운영 구독이 만료되면 작성 차단.

**AUTH-06 (예약 공지)**: `AnnouncementStatus` enum에 `SCHEDULED`가 추가됐다(`community_api/.../club/model/AnnouncementStatus.java:9-11`). `scheduledAt` 파라미터로 미래 시각을 지정하면 status=SCHEDULED로 저장되며 목록에 미노출·FCM 미발송이다. 예약 시각 도달 시 `publishScheduledAnnouncement`가 ACTIVE로 전환하고 그 시점에 멤버 FCM을 발송한다. 공지는 hard delete이라 `DELETED` 상태가 없다.

**고정 공지 동시 생성 락**: 즉시 게시(ACTIVE) 고정 공지 생성과 예약 공지 활성화 양쪽 모두 클럽 row 비관적 락(`clubRepository.findForUpdateById`)으로 직렬화한 뒤 ACTIVE pinned 수를 재확인한다(`ClubAnnouncementService.java:70-78`, `129-136`). 이로써 동시 즉시 생성이 ACTIVE 고정 3개 제한을 우회하던 race condition을 차단한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ 커뮤니티 ▶ "공지" 탭 (SCR-CC-007)
- FCM 푸시 알림 (제목 "새 공지사항", 본문 "'러닝크루': 2월 정기 모임 안내") 탭 ▶ 공지 목록 또는 공지 상세

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-10_announcements/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-10_announcements/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-10_announcements/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-10_announcements/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:292` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:301` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:309` | 확인됨 |
| `community_api/.../club/model/AnnouncementStatus.java:9-11` (SCHEDULED/ACTIVE, hard delete라 DELETED 없음) | 확인됨 |
| `community_api/.../club/service/ClubAnnouncementService.java:50-108` (createAnnouncement: 예약/즉시 분기, 고정 락) | 확인됨 |
| `community_api/.../club/service/ClubAnnouncementService.java:117-146` (publishScheduledAnnouncement: ACTIVE 전환+FCM) | 확인됨 |
| `community_api/.../club/service/ClubAnnouncementService.java:70-78` (즉시 고정 공지 생성 시 클럽 row 비관적 락) | 확인됨 |
| `community_api/.../club/service/ClubAnnouncementService.java:129-136` (예약 활성화 시 고정 3개 재검사+클럽 락) | 확인됨 |
| `community_api/.../club/service/ClubAnnouncementService.java:158-163` (목록 조회 시 ACTIVE 상태만 노출) | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **목록 진입**: `announcementNotifierProvider(clubId)` ▶ `ClubAnnouncementRepository.getAnnouncements(clubId, page=0, size=20)` ▶ `GET /announcements` ▶ `PageResponse<Announcement>` 반환 (ACTIVE 상태만)
2. **무한 스크롤**: `loadMore()` ▶ `page++` 호출 ▶ 결과 append
3. **작성 화면 등록 (즉시)**: `announcementCreateNotifier.submit()` ▶ `ClubAnnouncementRepository.create(clubId, AnnouncementAddParam)` ▶ `POST /announcements` ▶ status=ACTIVE, 멤버 FCM 즉시 발송 ▶ 성공 시 `ref.invalidate(announcementNotifierProvider(clubId))` ▶ pop
4. **[AUTH-06] 작성 화면 등록 (예약)**: `scheduledAt` 있으면 `POST /announcements` ▶ status=SCHEDULED, FCM 미발송 ▶ 예약 시각 도달 시 스케줄러가 ACTIVE 전환 + FCM 발송
5. **삭제**: 카드 메뉴에서 ▶ `ClubAnnouncementRepository.delete(clubId, id)` ▶ `DELETE` ▶ invalidate (hard delete)

## 4. 서버 계약

### 개요

OWNER/ADMIN이 모든 멤버에게 일괄 알림을 보내는 단방향 게시 도구. 클럽 멤버에게 FCM으로 새 공지가 도달하고, 멤버는 목록을 읽을 수 있다. 고정 공지(상단 sticky)는 클럽당 최대 3개. BUSINESS 클럽은 운영 구독이 만료되면 작성 차단.

### AnnouncementStatus enum (`community_api/.../club/model/AnnouncementStatus.java:9-11`)

| 값 | 의미 | 목록 노출 | FCM |
|---|---|---|---|
| SCHEDULED | 예약 발행 대기 (scheduledAt 미도달) | 미노출 | 미발송 |
| ACTIVE | 공개 | 노출 | 발송됨 (생성 또는 활성화 시점) |

> 공지는 hard delete이라 `DELETED` 상태가 없다. 삭제는 항상 물리 삭제.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/clubs/{id}/announcements` | `ClubController#createAnnouncement` | required (OWNER/ADMIN) | 공지 작성. `scheduledAt` 없으면 ACTIVE+FCM 즉시. `scheduledAt` 있으면 SCHEDULED+FCM 예약. |
| GET | `/api/v1/clubs/{id}/announcements` | `ClubController#getAnnouncements` | required (멤버) | 페이징 목록 (ACTIVE만, 고정 우선, 그 다음 최신순) |
| DELETE | `/api/v1/clubs/{id}/announcements/{announcementId}` | `ClubController#deleteAnnouncement` | required (OWNER/ADMIN) | 공지 영구 삭제 (hard delete) |

### 의존 단위 / 외부 시스템

- **Unit 04 자체**: `ClubMemberQueryRepository.findUserIdsByClubId`로 수신자 ID 조회. BUSINESS 클럽 운영 구독 상태 체크 (F04-16과 결합, `ClubSubscriptionGateService.checkFeature(ANNOUNCEMENT_CREATE)`).
- **알림 (Unit 알림)**: `NotificationService.createBatchNotifications`(타입 `CLUB_ANNOUNCEMENT`) → 내부에서 FCM 발송. 데이터 페이로드는 `ClubNotificationData(clubId, announcementId)`. **예약 공지의 경우 활성화 시점(`publishScheduledAnnouncement`)에 발송**, 생성 시점이 아님.
- **예약 발행 스케줄러**: `ScheduledPublishService`+`ScheduledPublishScheduler` — targetType=CLUB_ANNOUNCEMENT. 고정 3개 초과 시 FAILED → `NotificationType.SCHEDULED_PUBLISH_FAILED`(97) 작성자 알림.
- **외부 시스템**: FCM (Firebase Cloud Messaging).

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ 커뮤니티 ▶ "공지" 탭 (SCR-CC-007)
- FCM 푸시 알림 (제목 "새 공지사항", 본문 "'러닝크루': 2월 정기 모임 안내") 탭 ▶ 공지 목록 또는 공지 상세

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/club/community/...) | 역할 |
|---|---|---|
| `/clubs/:clubId/community/announcements` | `screens/announcement_list_screen.dart` | 공지 목록 (SCR-CC-007) |
| `/clubs/:clubId/community/announcements/create` | `screens/announcement_create_screen.dart` | 공지 작성 (SCR-CC-008) |

라우트 상수: `Routes.clubAnnouncements`, `Routes.clubAnnouncementCreate` (`core/router/routes.dart:56-57`).

### 화면별 구성 요소 & 액션

### 공지 목록 (`announcement_list_screen.dart`)
- **사용자가 보는 것**:
  - 상단 탭 바 (게시판/공지/사진첩/캘린더) — "공지" 활성
  - 공지 카드 (`widgets/announcement_card.dart`): 📢 아이콘, 제목 (Bold), 작성자 닉네임 + 작성일, 본문 미리보기 2줄, "더보기" 토글
  - 고정 공지는 상단 (서버 정렬 `isPinned DESC`)에 자동 배치
  - FAB ("+") — `_isAdminOrOwner()` 체크 후 OWNER/ADMIN에게만 표시 → 작성 화면으로 이동
  - 무한 스크롤
- **사용자가 할 수 있는 액션**:
  - 카드 탭 ▶ 본문 펼침/접힘 토글
  - "더보기" 탭 ▶ 본문 전체 표시 (인라인)
  - FAB ▶ `context.go(Routes.clubAnnouncementCreate)`
  - 풀투리프레시 ▶ `announcementNotifier.refresh()`
  - 끝 도달 ▶ `loadMore()` ▶ 다음 페이지 fetch
- **상태 분기**:
  - 로딩: `SkeletonLoader` (Card preset)
  - 에러: `AppErrorState(title:)` + 재시도
  - 빈 상태: `AppEmptyState` "아직 공지사항이 없습니다"
- **권한 분기**: `clubDetailNotifierProvider`로 `myRole` 조회 → `ClubRole.fromString().isOwnerOrAdmin` 으로 FAB 표시.
- **삭제 액션**: 공지 카드 더보기(⋮) 메뉴 (OWNER/ADMIN만) → "삭제" → 확인 다이얼로그 → `DELETE /announcements/{id}`

### 공지 작성 (`announcement_create_screen.dart`)
- **사용자가 보는 것**:
  - 상단: 닫기(✕), 타이틀 "공지사항 작성", 등록 버튼 (입력 시 활성화)
  - 제목 TextField (필수, 1~100자)
  - 본문 TextArea (자동 확장, 1~2000자)
  - 푸시 알림 체크박스 "푸시 알림으로 전체 멤버에게 전송" — **기본값 체크** (스펙)
  - 고정(상단 노출) 토글 (선택)
  - **[AUTH-06]** 예약 게시 시각 선택 UI (선택 시 `scheduledAt` 파라미터 포함)
- **사용자가 할 수 있는 액션**:
  - 등록 (즉시) ▶ `POST /announcements` (scheduledAt 없음) ▶ ACTIVE 저장 + 멤버 FCM ▶ pop + "공지가 등록되었습니다" 토스트
  - 등록 (예약) ▶ `POST /announcements` (scheduledAt 포함) ▶ SCHEDULED 저장, FCM 미발송 ▶ pop + "공지가 예약됐습니다" 토스트
  - 닫기 ▶ 입력 내용 있으면 이탈 확인 다이얼로그
- **유효성 검증** (서버 + 클라이언트):
  - 제목: `@NotBlank`, 1~100자 (스펙)
  - 본문: `@NotBlank`, 1~2000자 (스펙)
  - 고정 3개 초과 시 서버에서 `INVALID_INPUT` → "고정 공지는 최대 3개까지 가능합니다" 토스트 (클라이언트 매핑). **즉시 게시와 예약 활성화 양쪽 모두 클럽 row 비관적 락으로 강제 검사됨.**

> 공지사항은 서버에 **수정 API가 없다**. 작성 후 수정하려면 삭제 후 재작성. (서버 코드에 PUT/PATCH 없음)

### API 호출 순서 (Provider/Repository 관점)

1. **목록 진입**: `announcementNotifierProvider(clubId)` ▶ `ClubAnnouncementRepository.getAnnouncements(clubId, page=0, size=20)` ▶ `GET /announcements` ▶ `PageResponse<Announcement>` 반환
2. **무한 스크롤**: `loadMore()` ▶ `page++` 호출 ▶ 결과 append
3. **작성 화면 등록**: `announcementCreateNotifier.submit()` ▶ `ClubAnnouncementRepository.create(clubId, AnnouncementAddParam)` ▶ `POST /announcements` ▶ 성공 시 `ref.invalidate(announcementNotifierProvider(clubId))` ▶ pop
4. **삭제**: 카드 메뉴에서 ▶ `ClubAnnouncementRepository.delete(clubId, id)` ▶ `DELETE` ▶ invalidate

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | ADMIN이 정기모임 공지를 작성한다 (Happy Path) | 클럽 커뮤니티 진입, 공지 탭, 공지 0~2개. | `club_announcement` 1행 신규(ACTIVE), `notification × (members - 1)`행, FCM 발송. |
| S2 | OWNER가 중요 공지를 고정 등록 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 고정 공지 4개째 등록 시도 → 차단 | 이미 ACTIVE 고정 공지 3개. | 변경 없음. 클럽 row 비관적 락으로 race condition 차단. |
| S4 | 일반 멤버가 작성 시도 → 권한 부족 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 구독 만료된 BUSINESS 클럽에서 작성 시도 | 구독 만료된 BUSINESS 클럽 OWNER. | 변경 없음. OWNER는 F04-16 구독 관리로 유도됨. |
| S6 | ADMIN이 오래된 공지를 삭제 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 멤버가 공지를 읽는다 | 푸시 알림 도달. | 클라이언트 표시 외 서버 변경 없음 (읽음 처리는 별도 도메인 — 스펙상 미적용). |
| S8 | 비멤버가 공지 목록 접근 시도 | 시드 클럽 community 진입 가능, 공지 1건 이상 존재. | 일반 멤버는 공지를 read-only로 조회/옵션 시트는 열 수 있으나 삭제 액션은 노출되지 않는다. |
| S9 | [AUTH-06] ADMIN이 예약 공지를 작성 | scheduledAt=미래 시각 지정. | status=SCHEDULED 저장. 목록 미노출. FCM 미발송. 예약 시각 도달 시 ACTIVE 전환 + 멤버 FCM 발송. |
| S10 | [AUTH-06] 예약 고정 공지 활성화 시 3개 초과 → 실패 | 이미 ACTIVE 고정 3개. 예약 고정 공지가 scheduledAt 도달. | 클럽 row 비관적 락으로 재확인 → 초과 시 예외. 스케줄러가 FAILED 처리 + 작성자에게 SCHEDULED_PUBLISH_FAILED(97) 알림. 공지는 SCHEDULED 상태 유지(목록 미노출). |

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
| Gap (확정) | `community_api/.../club/service/ClubAnnouncementService.java:100-103` | **푸시 알림 체크박스 의미**: 앱 작성 화면에 "푸시 알림으로 전체 멤버에게 전송" 체크박스가 있지만, 서버 `ClubAnnouncementParam`에 해당 필드가 없고 서비스는 즉시 게시 시 항상 배치 알림 발송. UI의 체크박스가 서버에 전달되지 않아 misleading. `(서버 처리 미구현)` | 서버에 `sendPush` 파라미터 추가하거나, UI에서 체크박스 제거/비활성화 처리 결정 필요. Decision Needed. |
| 후보 | scenarios.md:72 | ### S1 보강 — 공지 작성 화면의 푸시 토글 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. ADMIN이 정기모임 공지를 작성한다 (Happy Path)**: Given 클럽 커뮤니티 진입, 공지 탭, 공지 0~2개. When 사용자가 해당 흐름을 실행하면 Then `club_announcement` 1행 신규(status=ACTIVE), `notification × (members - 1)`행, FCM 발송.
- **AC-02. OWNER가 중요 공지를 고정 등록**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 고정 공지 4개째 등록 시도 → 차단**: Given 이미 ACTIVE 고정 공지 3개. When 사용자가 해당 흐름을 실행하면 Then DB 변경 없음. 클럽 row 비관적 락으로 차단됨.
- **AC-04. 일반 멤버가 작성 시도 → 권한 부족**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 구독 만료된 BUSINESS 클럽에서 작성 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없음. OWNER는 F04-16 구독 관리로 유도됨.
- **AC-06. ADMIN이 오래된 공지를 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 멤버가 공지를 읽는다**: Given 푸시 알림 도달. When 사용자가 해당 흐름을 실행하면 Then 클라이언트 표시 외 서버 변경 없음 (읽음 처리는 별도 도메인 — 스펙상 미적용).
- **AC-08. 비멤버가 공지 목록 접근 시도**: Given 시드 클럽 community 진입 가능, 공지 1건 이상 존재. When 사용자가 해당 흐름을 실행하면 Then 일반 멤버는 공지를 read-only로 조회/옵션 시트는 열 수 있으나 삭제 액션은 노출되지 않는다.
- **AC-09. [AUTH-06] 예약 공지가 목록에 미노출**: Given ADMIN이 scheduledAt=미래 시각으로 공지 작성. When 작성 완료. Then DB에 status=SCHEDULED 저장. 멤버 목록 GET /announcements에 해당 공지 미포함. FCM 미발송.
- **AC-10. [AUTH-06] 예약 고정 공지 활성화 시 3개 초과 → 실패 알림**: Given ACTIVE 고정 공지 3개, SCHEDULED 고정 공지 1개가 scheduledAt 도달. When 스케줄러가 publishScheduledAnnouncement 실행. Then INVALID_INPUT 예외 → FAILED 처리 + 작성자에게 NotificationType.SCHEDULED_PUBLISH_FAILED(97) 알림. 공지 status=SCHEDULED 유지.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
