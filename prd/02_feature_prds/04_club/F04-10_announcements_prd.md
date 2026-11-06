# F04-10. 공지사항 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> **2026-06-10 AUTH-06 반영**: 예약 공지(`AnnouncementStatus.SCHEDULED`) 신설, 고정 공지 동시 생성 비관적 락 강화.

## 1. 결론

OWNER/ADMIN이 모든 멤버에게 일괄 알림을 보내는 단방향 게시 도구. 클럽 멤버에게 FCM으로 새 공지가 도달하고, 멤버는 목록을 읽을 수 있다. 고정 공지(상단 sticky)는 클럽당 최대 3개. BUSINESS 클럽은 운영 구독이 만료되면 작성 차단.

**AUTH-06 (예약 공지)**: `AnnouncementStatus` enum에 `SCHEDULED`가 추가됐다(`community_api/.../club/model/AnnouncementStatus.java:9-11`). `scheduledAt` 파라미터로 미래 시각을 지정하면 status=SCHEDULED로 저장되며 목록에 미노출·FCM 미발송이다. 예약 시각 도달 시 `publishScheduledAnnouncement`가 ACTIVE로 전환하고 그 시점에 멤버 FCM을 발송한다. 공지는 hard delete이라 `DELETED` 상태가 없다.

**고정 공지 동시 생성 락**: 즉시 게시(ACTIVE) 고정 공지 생성과 예약 공지 활성화 양쪽 모두 클럽 row 비관적 락(`clubRepository.findForUpdateById`)으로 직렬화한 뒤 ACTIVE pinned 수를 재확인한다(`ClubAnnouncementService.java:70-78`, `129-136`). 이로써 동시 즉시 생성이 ACTIVE 고정 3개 제한을 우회하던 race condition을 차단한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ 커뮤니티 ▶ "공지" 탭 (SCR-CC-007)
- FCM 푸시 알림 (제목 "새 공지사항", 본문 "'러닝크루': 2월 정기 모임 안내") 탭 ▶ 공지 목록 또는 공지 상세

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `AnnouncementStatus`, `ClubSubscriptionGateService`, `NotificationService`, `ScheduledPublishService`. 앱: `announcement_list_screen.dart`, `announcement_create_screen.dart`, `routes.dart`, `announcement_card.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#createAnnouncement`, `ClubController#getAnnouncements`, `ClubController#deleteAnnouncement`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **목록 진입**: `announcementNotifierProvider(clubId)` ▶ `ClubAnnouncementRepository.getAnnouncements(clubId, page=0, size=20)` ▶ `GET /announcements` ▶ `PageResponse<Announcement>` 반환 (ACTIVE 상태만)
2. **무한 스크롤**: `loadMore()` ▶ `page++` 호출 ▶ 결과 append
3. **작성 화면 등록 (즉시)**: `announcementCreateNotifier.submit()` ▶ `ClubAnnouncementRepository.create(clubId, AnnouncementAddParam)` ▶ `POST /announcements` ▶ status=ACTIVE, 멤버 FCM 즉시 발송 ▶ 성공 시 `ref.invalidate(announcementNotifierProvider(clubId))` ▶ pop
4. **[AUTH-06] 작성 화면 등록 (예약)**: `scheduledAt` 있으면 `POST /announcements` ▶ status=SCHEDULED, FCM 미발송 ▶ 예약 시각 도달 시 스케줄러가 ACTIVE 전환 + FCM 발송
5. **삭제**: 카드 메뉴에서 ▶ `ClubAnnouncementRepository.delete(clubId, id)` ▶ `DELETE` ▶ invalidate (hard delete)

## 4. 제품 규칙

- 목록은 고정 공지를 먼저, 그다음 최신순으로 보인다.
- 푸시 전송 선택은 처음부터 켜져 있다.
- 비어 있으면 「아직 공지사항이 없습니다」를 보인다.

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
