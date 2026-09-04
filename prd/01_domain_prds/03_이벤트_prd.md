# 03. 이벤트 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-09-02; unit: business_logic/units/03_event -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/03_event/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

> **2026-05-28 RM 도메인 신설 영향(cross-ref).** `EventType.REGULAR_MEETING(3)` 신규. `event/util/EventScope` 공용 거름망 2개 도입(디스커버리 8표면 분류 + 신청 가드). EventVo/EventSimpleVo/CalendarEventVo에 RM 컨텍스트 5필드(`regularMeetingId`, `regularMeetingTitle`, `regularMeetingType`, `sequenceNo`, `directApplyBlocked`) 오버레이. RM 세션은 일반 `EventService.publishEvent/cancelEvent`/`EventCapacitySettingsService`/`CapacitySettingsService`/`RecurringEventCreateService` 6개 경로에서 `RegularMeetingSessionGuard`로 직접 mutation 차단. 자세한 내용은 [17 정기모임](../01_domain_prds/17_정기모임_prd.md).

## 1. 결론

사용자가 오프라인 모임을 발견·신청·참석·체크인·사진 공유까지 완수하는 비즈니스 단위.
- UI/UX 스펙: `community_api/docs/ui-ux/screens/13-event.md`, `14-event-attendance.md` (총 14개 화면 SCR-EV-001~008, SCR-EA-001~006)
- 백엔드 컨트롤러: `event/EventController`, `event/EventPhotoController`, `event/EventPlanMapController`, `event/WishlistController`, `event/prepayment/EventPrepaymentController`, `event/reschedule/EventRescheduleProposalController`, `capacity/CapacityController`, `capacity/AttendanceController`, `capacity/CheckInController`, `capacity/EventNoShowController`, `connectivity/EventFitPreviewController`
- 프론트 feature: `community_app/lib/presentation/event/` (2026-07-29 실측: 22 screen 파일, 63 widget 파일)
**프라이빗 모임(eventType=PRIVATE)** 은 SCR-EV-006 + `GET/POST .../private/detail|open|select|complete|cancel` 시리즈로 별도 단계 모델(`WAITING_PAYMENT → RECRUITING → MATCHED → COMPLETED`)을 갖는다. 호스팅비 결제·지갑 차감이 결합되므로 본 단위(F03)에서는 **F03-03(생성)/F03-04(생명주기)/F03-06(신청자 선택)** 의 변형으로 다루고, 결제 흐름은 Unit 06(결제 & 지갑)에서 교차 정리한다.

이 도메인은 기능 PRD 20개로 구성된다(F03-01~12 기존 + F03-13~17 확장 + F03-18 구성인원 인구통계 + F03-19 일정 변경 제안·합의 + F03-20 노쇼 관리). F03-14~17 이동수단은 2026-09-01 대절 버스·참가자 승용차·자차 통합 모델로 교체됐고 고객 앱·서버·관리자 API·관리자 웹과 표준 차량 9종까지 완료됐다. 신규 이용은 서명 앱 다중 역할·알림·신고와 책임 고지 검증 뒤 연다. 도메인 수준의 현재 판단은 아래 기능 PRD를 우선하고, `units` trace 수·risk 후보 수는 초기 전환 당시의 역사적 계수로만 사용한다.

> **2026-07-29 current source 요약.** F03-02의 유료 승인제 상세은 `APPROVED_PENDING_PAYMENT → PENDING_PAYMENT`, 결제 금액/기한, 예약 정원 수, `POST /prepayment/wallet`, `PAID → APPROVED + ATTENDING`까지 닫혔다. EventVo viewer capability는 `canManageCapacity`를 포함한 11종이며 Flutter 상세/route가 이를 직접 소비한다. 이벤트 상세에는 k-익명 `fit-preview`와 호스트 재방문 배지도 배선됐다. 일정 변경은 주소 변경 좌표를 보존하고, 노쇼 뒤집기는 교정 체크인을 생성해 출석 증거까지 복원한다. 세부 계약과 잔여 Gap은 F03-02/F03-07/F03-19/F03-20을 따른다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F03-01 | F03-01. 이벤트 발견 & 탐색 | [F03-01_event-discovery_prd.md](../02_feature_prds/03_event/F03-01_event-discovery_prd.md) | [F03-01_event-discovery](../../units/03_event/F03-01_event-discovery) | 전환 완료 | 3 | 2 |
| F03-02 | F03-02. 이벤트 상세 조회 | [F03-02_event-detail_prd.md](../02_feature_prds/03_event/F03-02_event-detail_prd.md) | [F03-02_event-detail](../../units/03_event/F03-02_event-detail) | Golden sample | 2 | 2 |
| F03-03 | F03-03. 이벤트 생성 (호스트) | [F03-03_event-creation_prd.md](../02_feature_prds/03_event/F03-03_event-creation_prd.md) | [F03-03_event-creation](../../units/03_event/F03-03_event-creation) | 전환 완료 | 4 | 3 |
| F03-04 | F03-04. 이벤트 수정/생명주기 관리 (호스트) | [F03-04_event-lifecycle_prd.md](../02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | [F03-04_event-lifecycle](../../units/03_event/F03-04_event-lifecycle) | 전환 완료 | 9 | 3 |
| F03-05 | F03-05. 이벤트 신청 & 참석 (참가자) | [F03-05_event-attendance_prd.md](../02_feature_prds/03_event/F03-05_event-attendance_prd.md) | [F03-05_event-attendance](../../units/03_event/F03-05_event-attendance) | 전환 완료 | 6 | 21 |
| F03-06 | F03-06. 신청서 승인/거절 (호스트) | [F03-06_application-review_prd.md](../02_feature_prds/03_event/F03-06_application-review_prd.md) | [F03-06_application-review](../../units/03_event/F03-06_application-review) | 전환 완료 | 3 | 9 |
| F03-07 | F03-07. 정원 & 대기열 관리 | [F03-07_capacity-and-waitlist_prd.md](../02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | [F03-07_capacity-and-waitlist](../../units/03_event/F03-07_capacity-and-waitlist) | 전환 완료 | 16 | 3 |
| F03-08 | F03-08. QR 체크인 | [F03-08_qr-checkin_prd.md](../02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | [F03-08_qr-checkin](../../units/03_event/F03-08_qr-checkin) | 전환 완료 | 5 | 1 |
| F03-09 | F03-09. 이벤트 사진첩 | [F03-09_event-photos_prd.md](../02_feature_prds/03_event/F03-09_event-photos_prd.md) | [F03-09_event-photos](../../units/03_event/F03-09_event-photos) | 전환 완료 | 3 | 2 |
| F03-10 | F03-10. 이벤트 ↔ 플랜 연결 | [F03-10_event-plan-link_prd.md](../02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | [F03-10_event-plan-link](../../units/03_event/F03-10_event-plan-link) | 전환 완료 | 5 | 3 |
| F03-11 | F03-11. 위시리스트 (관심 이벤트) | [F03-11_wishlist_prd.md](../02_feature_prds/03_event/F03-11_wishlist_prd.md) | [F03-11_wishlist](../../units/03_event/F03-11_wishlist) | 전환 완료 | 3 | 1 |
| F03-12 | F03-12. 내 이벤트 관리 & 참석 로그 | [F03-12_my-events_prd.md](../02_feature_prds/03_event/F03-12_my-events_prd.md) | [F03-12_my-events](../../units/03_event/F03-12_my-events) | 전환 완료 | 3 | 7 |
| F03-13 | F03-13. 이벤트 참가 선입금 (참가자·호스트) | [F03-13_event-prepayment_prd.md](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | current server/app source | 서버 6개 API, Flutter WALLET만 사용자 연결 | 17 | 6 |
| F03-14 | F03-14. 이동수단 공통 설정 | [F03-14_event-transport-mode_prd.md](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md) | current server/app source | 코드·화면 완료, 실기기 출시 증명 대기 | 0 | 0 |
| F03-15 | F03-15. 카풀·자차 | [F03-15_event-carpool_prd.md](../02_feature_prds/03_event/F03-15_event-carpool_prd.md) | current server/app source | 코드·화면 완료, 책임 고지·실기기 증명 대기 | 0 | 0 |
| F03-16 | F03-16. 대절 버스와 자리 배정 | [F03-16_event-bus-charter_prd.md](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md) | current server/app source | 코드·표준 차량 완료, 실기기 증명 대기 | 0 | 0 |
| F03-17 | F03-17. 차량 좌석 배치도 운영 | [F03-17_vehicle-layout-catalog_prd.md](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | current public/admin source | 관리자 API·웹·표준 9종 완료 | 0 | 0 |
| F03-18 | F03-18. 이벤트 구성인원 인구통계 | [F03-18_event-demographics_prd.md](../02_feature_prds/03_event/F03-18_event-demographics_prd.md) | (DEMOGRAPHICS_STATS_PLAN.md v2, Codex sign-off) | 신규 (2026-05-27 도입) | 8 | 1 |
| F03-19 | F03-19. 이벤트 일정 변경 제안·참가자 합의 | [F03-19_event-reschedule-consent_prd.md](../02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | (RS-002 reschedule response 계획, 2026-06-01 완료) | 신규 (2026-06-05 등재) | — | — |
| F03-20 | F03-20. 이벤트 노쇼 관리 | [F03-20_event-no-show_prd.md](../02_feature_prds/03_event/F03-20_event-no-show_prd.md) | (D-20/v3 노쇼 확정·소명·뒤집기, 2026-06-04 구현 완료) | 신규 (2026-06-05 등재) | — | — |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F03-05](../02_feature_prds/03_event/F03-05_event-attendance_prd.md) | F03-05. 이벤트 신청 & 참석 (참가자) | Risk 후보 21 |
| [F03-06](../02_feature_prds/03_event/F03-06_application-review_prd.md) | F03-06. 신청서 승인/거절 (호스트) | Risk 후보 9 |
| [F03-12](../02_feature_prds/03_event/F03-12_my-events_prd.md) | F03-12. 내 이벤트 관리 & 참석 로그 | Risk 후보 7 |
| [F03-03](../02_feature_prds/03_event/F03-03_event-creation_prd.md) | F03-03. 이벤트 생성 (호스트) | Risk 후보 3 |
| [F03-10](../02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | F03-10. 이벤트 ↔ 플랜 연결 | Risk 후보 3 |
| [F03-04](../02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | F03-04. 이벤트 수정/생명주기 관리 (호스트) | Risk 후보 3 |
| [F03-07](../02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | F03-07. 정원 & 대기열 관리 | Risk 후보 3 |
| [F03-02](../02_feature_prds/03_event/F03-02_event-detail_prd.md) | F03-02. 이벤트 상세 조회 | Risk 후보 2 |
| [F03-01](../02_feature_prds/03_event/F03-01_event-discovery_prd.md) | F03-01. 이벤트 발견 & 탐색 | Risk 후보 2 |
| [F03-09](../02_feature_prds/03_event/F03-09_event-photos_prd.md) | F03-09. 이벤트 사진첩 | Risk 후보 2 |
| [F03-11](../02_feature_prds/03_event/F03-11_wishlist_prd.md) | F03-11. 위시리스트 (관심 이벤트) | Risk 후보 1 |
| [F03-08](../02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | F03-08. QR 체크인 | Risk 후보 1 |
| [F03-19](../02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | F03-19. 이벤트 일정 변경 제안·참가자 합의 | RS-002 reschedule response 계약 (2026-06-01 구현 완료) |
| [F03-20](../02_feature_prds/03_event/F03-20_event-no-show_prd.md) | F03-20. 이벤트 노쇼 관리 | 노쇼 확정·소명·뒤집기·사후 환불·제재 카운트 (2026-06-04 구현 완료) |

## 4. 도메인 기능 목록

### 핵심 기능 12개 + 이동수단 확장 4개

이벤트는 **호스트(주최자)** 와 **참가자** 의 행동이 명확히 구분되며, 동일 객체에 대해서도 보는 시점/권한이 다르므로 분리 표기한다. 이동수단 확장(F03-14~17)은 현재 Controller·Service·Flutter·관리자 소스를 기준으로 구현 범위를 구분한다.

| ID | 기능명 | 관점 | 주요 화면 (SCR) | 주요 API |
|---|---|---|---|---|
| F03-01 | 이벤트 발견 & 탐색 | 참가자/비로그인 | SCR-EV-001 (이벤트 목록), SCR-EV-007 (유사 이벤트) | `GET /api/v1/events`, `GET /api/v1/events/{id}/similar`, `GET /api/v1/events/recommend` |
| F03-02 | 이벤트 상세 조회 | 참가자/비로그인 | SCR-EV-002 (이벤트 상세) | `GET /api/v1/events/{eventId}`, `GET .../calendar`, `GET .../host-card`, `GET .../demographics`, 인증 `GET .../fit-preview`, 결제 CTA `POST .../prepayment/wallet` |
| F03-03 | 이벤트 생성 (호스트) | 호스트 | SCR-EV-003 (4-step 생성 폼) | `POST /api/v1/events`, `POST /api/v1/events/{id}/publish` (DRAFT→OPEN), `POST .../recurring` (반복 이벤트) |
| F03-04 | 이벤트 수정/생명주기 관리 (호스트) | 호스트 | SCR-EV-004 (수정), SCR-EV-002 (액션 바) | `PATCH /api/v1/events/{id}` (DRAFT only), `PATCH .../capacity-settings` (DRAFT/OPEN, v4.5 W1 신설 — `EventCapacitySettingsService`), `PATCH .../reschedule`, `POST .../close`, `POST .../cancel`, `DELETE /api/v1/events/{id}`, `POST .../announce` |
| F03-05 | 이벤트 신청 & 참석 (참가자) | 참가자 | SCR-EV-002 (액션 바), 신청서 바텀시트 | `POST /api/v1/events/{id}/capacity` 또는 `POST .../attend`, `POST .../apply`, `DELETE .../capacity` (취소), `GET /api/v1/events/{id}/capacity/me` |
| F03-06 | 신청서 승인/거절 (호스트) | 호스트 | SCR-EA-003 (신청서 목록) | `GET /api/v1/events/{id}/applications`, `POST .../applications/{appId}/approve`, `POST .../applications/{appId}/reject` |
| F03-07 | 정원 & 대기열 관리 | host/공동호스트/클럽 운영진(설정), 출석관리자(승격·제거), 참가자(조회) | SCR-EA-001 (참석자 목록), SCR-EA-002 (대기열) | `GET .../capacity/settings`, `PUT .../capacity/settings`, `PATCH .../capacity`, `GET .../waitlist`, `POST .../capacity/{userId}/promote`, `DELETE .../capacity/{userId}` (제거), `POST .../registration/close`, `POST .../registration/reopen` |
| F03-08 | QR 체크인 | 참가자(QR 발급) + 호스트(스캔/수동/통계) | SCR-EA-004 (QR 체크인) | `GET .../check-in/qr` (참가자 토큰 발급), `POST .../check-in` (QR 스캔), `POST .../check-in/short-code`, `POST .../check-in/{userId}` (수동), `GET .../check-in/stats` |
| F03-09 | 이벤트 사진첩 | 참석자(업로드/삭제) + 호스트(전체 관리) | SCR-EA-005 (사진첩) | `GET /api/v1/events/{id}/photos`, `POST /api/v1/events/{id}/photos`, `DELETE /api/v1/events/{id}/photos/{photoId}` |
| F03-10 | 이벤트 ↔ 플랜 연결 (호스트) | 호스트 | SCR-EV-005 (플랜 연결) | `GET/POST/PATCH/DELETE /api/v1/events/{id}/plans[/(mapId)]`, `POST .../plans/{mapId}/toggle-active` |
| F03-11 | 위시리스트 (관심 이벤트) | 참가자 | SCR-EV-001/SCR-EV-002 하트 토글, 프로필 위시리스트 | `POST /api/v1/events/{id}/wishlist`, `DELETE /api/v1/events/{id}/wishlist`, `GET /api/v1/users/me/wishlist` |
| F03-12 | 내 이벤트 관리 & 참석 로그 | 참가자 + 호스트 | SCR-EV-008 (내 이벤트), SCR-EA-006 (참석 로그) | `GET /api/v1/events/my`, `GET /api/v1/events/users/me/applications`, `GET .../capacity/logs`, `GET .../attendance/logs` |
| F03-14 | 이동수단 공통 설정 | Host/CoHost 설정, 권한 있는 사용자 조회 | `event_transport_settings_screen.dart`, `event_transport_screen.dart` | `GET /api/v1/events/{id}/transport`, `PUT /api/v1/events/{id}/transport/config` |
| F03-15 | 카풀·자차 | Host/CoHost + ATTENDING 운전자/탑승자 | 통합 이동수단 화면·차량 등록/결정/취소·신고 | `/events/{id}/vehicles`, `/transport/participant`, 차량 신고 경로 |
| F03-16 | 대절 버스와 자리 배정 | Host/CoHost + ATTENDING/WAITING 조회, ATTENDING 자기 선택 | 통합 이동수단 화면·자리 격자/목록·배정/반납·신고 | `/events/{id}/vehicles/{vehicleId}/seats/**` |
| F03-17 | 차량 좌석 배치도 운영 | 호스트 활성 목록 조회 + `MANAGE_EVENT` 관리자 운영 | 호스트 배치도 선택, 관리자 목록·좌석표·복제·수정·활성화 | 사용자 read 2개 + 관리자 list/detail/create/update/replace-seats/toggle-active |
| F03-19 | 이벤트 일정 변경 제안·참가자 합의 | 호스트 (reschedule 제안 배치 생성·확인) | 참가자 (동의/거절, 기한 만료 자동 처리) | `GET /api/v1/events/{id}/reschedule-proposals`, `POST .../reschedule-proposals/{batchId}/respond` 등 |
| F03-20 | 이벤트 노쇼 관리 | 호스트·공동호스트 (노쇼 확정·일괄·사후 환불) | 참가자 (소명 제출) | `POST /api/v1/events/{id}/no-shows`, `POST .../no-shows/batch`, `POST .../no-shows/{noShowId}/appeal`, `POST .../no-shows/{noShowId}/overturn` |

> **프라이빗 모임(eventType=PRIVATE)** 은 SCR-EV-006 + `GET/POST .../private/detail|open|select|complete|cancel` 시리즈로 별도 단계 모델(`WAITING_PAYMENT → RECRUITING → MATCHED → COMPLETED`)을 갖는다. 호스팅비 결제·지갑 차감이 결합되므로 본 단위(F03)에서는 **F03-03(생성)/F03-04(생명주기)/F03-06(신청자 선택)** 의 변형으로 다루고, 결제 흐름은 Unit 06(결제 & 지갑)에서 교차 정리한다.

## 5. 상태/권한/의존성

### 호스트 vs 참가자 관점 매트릭스

| 기능 ID | 호스트 액션 | 참가자 액션 |
|---|---|---|
| F03-01 발견 | (해당 없음 — 자신은 다른 호스트의 이벤트 탐색 가능) | 검색·필터·추천 카드로 진입 |
| F03-02 상세 | 액션 바가 "수정/삭제/종료/취소"로 교체 | "참석 신청" / "대기열 등록" / "참석 취소" |
| F03-03 생성 | 4-step 폼 진행, DRAFT→OPEN 발행 | 없음 |
| F03-04 생명주기 | publish/close/cancel/reschedule/announce/delete | (영향만 받음, FCM 알림 수신) |
| F03-05 신청 | 없음 | `POST .../capacity` 또는 `POST .../apply` |
| F03-06 승인/거절 | 신청서 승인/거절 (승인 필요 이벤트) | 신청서 작성·제출, 결과 알림 수신 |
| F03-07 정원/대기열 | 정원 변경, 모집 마감/재개, 수동 승격, 강제 제거 | 본인 대기 순번 확인, 자동 승격 알림 |
| F03-08 QR 체크인 | QR 스캐너 / 수동 체크인 / 통계 조회 | QR 토큰 발급 → 화면 표시 |
| F03-09 사진첩 | 모든 사진 삭제 가능 (관리 권한) | 본인 업로드/본인 사진 삭제 |
| F03-10 플랜 연결 | 플랜 추가/순서/활성/삭제 | (조회만, SCR-EV-002 하단 노출) |
| F03-11 위시리스트 | 자신도 하트 토글 가능 | 하트 토글, 프로필에서 목록 조회 |
| F03-12 내 이벤트 | "주최 중" 탭 | "참석 예정" / "지난 이벤트" 탭 |
| F03-14 이동 설정 | 이동 운영·자리 반납·자차 허용 설정, 살아 있는 차량이 있으면 운영 종료 차단 | 권한 있는 사용자는 통합 화면 조회. 신규 이용은 출시 범위로 봉인 |
| F03-15 카풀·자차 | 승용차 승인/거절·탑승 배정·강제 취소 | ATTENDING이 승용차 제안·취소, 승차 요청·이탈, 자차 생성·종료, 차량 신고 |
| F03-16 대절 버스·자리 | BUS 등록, 본인을 포함한 참가자 배정·재배정·해제 | 정책이 허용하면 본인 자리 선택·이동·반납, 자리 신고 |
| F03-17 차량 배치도 | `MANAGE_EVENT` 관리자가 표준 9종 조회·복제·수정·활성화 | 호스트는 활성 배치도 선택, 참가자는 좌석표 확인 |

### 의존 단위 (Cross-cutting)

- **Unit 06 결제 & 지갑** — 유료 이벤트 참가비, 프라이빗 모임 호스팅비 차감 (F03-05, F03-04 PRIVATE)
- **Unit 07 모임 정산** — 사전결제·정산 항목 등록 (호스트가 SCR-EV-003 옵션 단계에서 prepayment 설정 시)
- **Unit 08 플랜 마켓** — F03-10이 참조하는 plan 엔티티
- **Unit 12 알림** — 신청 승인/거절, 일정 변경(AUTO=즉시 FCM / MAJOR=참가자 합의 절차 후 FCM — F03-19 참조), 대기열 자동 승격, 호스트 공지(announce) FCM 발송
- **Unit 11 리뷰 & 신고** — 종료된 이벤트 리뷰 작성 (SCR-EV-002 종료 후 진입점)
- **Unit 14 위치 & 길찾기** — 오프라인 이벤트 주소 검색·지오코딩, 지도 미리보기
- 횡단 인프라 — `file/FileController` (썸네일/사진 S3 presigned URL)

### 도메인 상태 모델 (요약)

- **EventStatus**: `DRAFT → OPEN → CLOSED` (정상) / `OPEN → CANCELED` (호스트 취소) / `HIDDEN` (비공개)
- **AttendanceStatus**: `ATTENDING` / `WAITING` (대기 순번 보유) / `CANCELLED`
  - 승격 플래그: `promotedFromWaitlist` (자동), `manuallyPromoted` (호스트 수동)
- **ApplicationStatus** (전체 7값, 갱신 2026-06-05, `ApplicationStatus.java:24-36`):
  `PENDING` / `APPROVED` / `APPROVED_PENDING_PAYMENT` (선입금 결제 대기) / `PAYMENT_EXPIRED` (터미널) / `REJECTED` (터미널) / `CANCELED` (L 한 개, 터미널) / `CANCEL_PENDING_REFUND` (계좌이체 취소 후 환불 대기, capacity hold)
- **PrivateMeetingPhase**: `WAITING_PAYMENT → RECRUITING → MATCHED → COMPLETED` / `CANCELLED`
- **VehicleKind**: `BUS / CAR / SELF`
- **SeatAssignment**: `DESIGNATED / UNDESIGNATED`
- **ClaimPolicy**: `HOST_ASSIGNS / SELF_CLAIMS`
- **VehicleStatus**: `PENDING → CONFIRMED` 또는 `REJECTED / CANCELLED`; BUS·SELF는 처음부터 `CONFIRMED`
- **NoShowStatus** (D-20): `CONFIRMED / APPEALED / OVERTURNED` (`event_no_show.status`)
- **EventCheckIn 감사 컬럼** (Wave D-1, 갱신 2026-06-05): `manual_actor_id` (MANUAL/CORRECTED 체크인 actor) / `manual_reason_code` (사유 코드) / `corrected_from_check_in_id` (원본 체크인 ID) — 소스: `EventCheckIn.java:41-56`

## 6. 화면/API 매핑

### Flutter 화면 ↔ 기능 매핑

| Flutter screen | 기능 ID |
|---|---|
| `event_list_screen.dart` | F03-01 |
| `similar_events_screen.dart` | F03-01 |
| `event_detail_screen.dart` | F03-02 (결제 대기 CTA·핏 프리뷰·호스트 재방문 배지·참가자) / F03-04 액션 바 (호스트) |
| `event_create_screen.dart` (+ step1~4 widgets) | F03-03 |
| `event_edit_screen.dart` | F03-04 |
| `recurring_event_group_screen.dart` | F03-03/F03-04 (반복 이벤트) |
| `application_list_screen.dart` | F03-06 |
| `attendee_list_screen.dart` | F03-07 |
| `waitlist_screen.dart` | F03-07 |
| `capacity_settings_screen.dart` | F03-07 |
| `qr_check_in_screen.dart` | F03-08 |
| `event_photos_screen.dart` | F03-09 |
| `event_plan_link_screen.dart` | F03-10 |
| `my_events_screen.dart` | F03-11 (위시리스트 탭 시) / F03-12 |
| `attendance_log_screen.dart` | F03-12 |
| `event_transport_settings_screen.dart` | F03-14 |
| `event_transport_screen.dart` | F03-14/F03-15/F03-16 |
| `vehicle_seat_report_screen.dart` | F03-16 |

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F03-05](../02_feature_prds/03_event/F03-05_event-attendance_prd.md) | F03-05. 이벤트 신청 & 참석 (참가자) | 21 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-06](../02_feature_prds/03_event/F03-06_application-review_prd.md) | F03-06. 신청서 승인/거절 (호스트) | 9 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-12](../02_feature_prds/03_event/F03-12_my-events_prd.md) | F03-12. 내 이벤트 관리 & 참석 로그 | 7 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-03](../02_feature_prds/03_event/F03-03_event-creation_prd.md) | F03-03. 이벤트 생성 (호스트) | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-04](../02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | F03-04. 이벤트 수정/생명주기 관리 (호스트) | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-07](../02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | F03-07. 정원 & 대기열 관리 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-10](../02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | F03-10. 이벤트 ↔ 플랜 연결 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-01](../02_feature_prds/03_event/F03-01_event-discovery_prd.md) | F03-01. 이벤트 발견 & 탐색 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-02](../02_feature_prds/03_event/F03-02_event-detail_prd.md) | F03-02. 이벤트 상세 조회 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-09](../02_feature_prds/03_event/F03-09_event-photos_prd.md) | F03-09. 이벤트 사진첩 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-08](../02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | F03-08. QR 체크인 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F03-11](../02_feature_prds/03_event/F03-11_wishlist_prd.md) | F03-11. 위시리스트 (관심 이벤트) | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.

## 9. 변경 이력

- **2026-09-02 (대절 버스·카풀 통합 완료 반영)**: `BUS/CAR/SELF` 통합 차량 모델, 지정·비지정 자리와 호스트 전담·참가자 자기 선택, 승용차 승인·취소·자차 복귀, 자리·차량 신고, 표준 배치도 9종과 관리자 화면을 현재 계약으로 갱신했다. 사용자 API 156건·앱 160건·관리자 API 23건·관리자 웹 E2E 3건 실패 0을 확인했다. 신규 기능은 서명 앱 다중 역할·알림·신고와 책임 고지 승인 뒤 출시한다.

- **2026-05-22 (이벤트 참가 선입금 도입, [F03-13](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md); 2026-07-29 재실측)**: WALLET/BANK_TRANSFER 결제·환불 facade와 `event_payment`를 도입했다. active INITIAL만 application당 unique, GUEST_INCREMENT는 다건이다. APPROVED_PENDING_PAYMENT는 currentCapacity/attendance 없이 party size를 논리 hold하고 BANK 취소는 `CANCEL_PENDING_REFUND`로 hold를 유지한다. 만료 payment/75, 이벤트 취소 pending 누락·BANK 완료 오표시, refund preview IDOR, non-locking escalation 경합이 Gap이다. 72/83은 주 호스트 한 명, Flutter는 WALLET only이며 BANK 운영·deep link는 없다.
- **2026-05-22 (v4.5 W1 — 정원 초과 허용 도입)**: `event` 테이블에 `overcapacity_allowed`/`hard_capacity_limit` 두 컬럼 추가. 정원 판정을 `CapacityPolicy.decide(event, attendingCount)` 5-룰 매트릭스로 단일화하여 `apply / approveApplication / attend / confirmAttendanceFromPayment` 진입점이 모두 동일 헬퍼를 호출. 별도 서비스 `EventCapacitySettingsService`(`community_api/src/main/java/com/endside/community/event/service/EventCapacitySettingsService.java`)와 신규 엔드포인트 `PATCH /events/{id}/capacity-settings`로 DRAFT/OPEN 운영 중 정원 토글 분리(Q7 — CLOSED 차단). 공통 빈 `EventAuthorizationService` + `EventVoAssembler`(D12/D13) 추출. `ChangeType.OVERCAPACITY_APPROVED(9)` / `CAPACITY_REDUCED(10)` 신규, `ErrorCode.INVALID_HARD_CAPACITY_LIMIT(400013)` + `CAPACITY_FULL_AT_CONFIRMATION(400012)` 추가. EventVo에 `overcapacityAllowed / hardCapacityLimit / exceedingAttendees / reservedPaymentPendingCount` 4개 필드 노출(목록은 N+1 회피 위해 `reservedPaymentPendingCount=0` 고정, 단건만 lazy). 정원 축소 시 기존 ATTENDING은 유지하고 audit log만 기록. 영향 받는 기능: F03-03(생성 시 정원 옵션) / F03-04(생명주기 별도 capacity-settings 위임) / F03-05(신청·결제 확정 매트릭스 위임) / F03-06(승인 매트릭스 위임) / F03-07(정책 본체와 매트릭스 정의 위치). F03-07의 기존 trace ID와 risk 후보 수치는 그대로 유지됨 — W1 변경은 기존 trace를 변경하지 않고 신규 정책 문서만 추가했다.
- **2026-05-22 (이동수단 공통 베이스 도입, [F03-14](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md); 2026-07-29 재실측)**: `event_transport_config`와 GET/PUT 구현. mode 변경은 DRAFT에서만 가능하고 이탈한 CARPOOL/BUS 데이터를 hard delete한다. `allowsSelfTransport` 단독 변경에는 status 가드가 없다. GET은 로그인만 요구하며 Flutter 호출부·전용 테스트·알림·audit은 없다.
- **2026-05-22 (카풀 운영 도입, [F03-15](../02_feature_prds/03_event/F03-15_event-carpool_prd.md); 2026-07-29 재실측)**: offer/passenger/assignment-log 스키마와 실제 7개 API 구현. assignment log는 기록하지 않고 77~80 알림은 enum only다. Flutter 신고 route에는 인앱 caller가 없다. register/assign lost update·assignedOfferId 잔존·terminal event mutation·same-full-offer 재배정 오류가 남아 있다.
- **2026-05-22 (차량 레이아웃 카탈로그 도입, [F03-17](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md); 2026-07-29 재실측)**: 사용자 read API 2개와 관리자 `MANAGE_EVENT` 목록·상세·생성·메타 수정·좌석 전체 교체·active 토글 API가 구현됐다. `seatType`은 enum이 아닌 String whitelist다. 양 V1과 seed SQL에 기본 차량 4종 INSERT는 없고 Flutter 소비 화면도 없다.
- **2026-06-05 (D-20/v3 + Phase 4/5 — ApplicationStatus 전체 7값·NoShowStatus·EventCheckIn 감사컬럼·F03-19/F03-20 등재)**: `ApplicationStatus` 7값 전체 갱신 (APPROVED_PENDING_PAYMENT/PAYMENT_EXPIRED/CANCEL_PENDING_REFUND 추가). `NoShowStatus` (CONFIRMED/APPEALED/OVERTURNED) 상태 모델 추가. `EventCheckIn` Wave D-1 감사 추적 3컬럼 (manual_actor_id/manual_reason_code/corrected_from_check_in_id) 추가. "일정 변경 즉시 FCM 발송" → AUTO/MAJOR 분기·합의 절차 요약 교체 (F03-19 참조). F03-19(일정 변경 제안·참가자 합의), F03-20(이벤트 노쇼 관리) 기능 표·먼저 볼 기능·도메인 기능 목록에 등재. 도메인 기능 PRD 18개 → 20개.
- **2026-05-22 (버스대절 운영 도입, [F03-16](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md); 2026-07-29 재실측)**: 버스/좌석/좌석로그와 4개 API 구현. FREE는 seat row를 만들지 않고 FIXED_BY_HOST/FIRST_COME은 선택 가능한 좌석을 복사한다. FIRST_COME 자동 배정, seat `SKIP LOCKED`, 진짜 swap/unassign은 없고 좌석 PUT은 target user를 덮어쓴다. add/assign은 terminal event도 변경 가능하다. 중복은 `INVALID_REQUEST`; 81~82는 enum only; Flutter 버스 기능은 없다.
- **2026-07-02 (접근권한 감사 교정 — 서버 능력플래그 북극성 풀슬라이스, Codex GO 완료)**: 서버가 EventVo에 **뷰어별 능력플래그 10종**(canEditEvent / canManageApplications / canManageAttendance / canModerateMessages / canSendAnnouncement / canHandleRefundIssue / canResolveDispute / canViewAttendees / canCheckIn / canManageEvent)을 계산해 내려주는 북극성 모델 구현 완료. 각 플래그는 해당 액션의 실제 서버 가드와 1:1 거울 — 추측 재계산 없이 서버가 단일 진실원. **독립 이벤트**: 생애주기(편집/발행/취소/삭제)·신청관리·공지 = 호스트∪임의 공동호스트; 출석관리·체크인 = 호스트∪canManageAttendance 공동호스트∪클럽 출석관리 권한 보유자; 메시지 모더레이션 = 호스트∪canModerateMessages 공동호스트∪클럽 모더레이션 권한 보유자. **클럽 이벤트**: 위 + 클럽 권한플래그(EVENT_ATTENDANCE_MANAGER/EVENT_MODERATION_MANAGER/EVENT_REFUND_MANAGER/EVENT_DISPUTE_RESOLVER)+OWNER 보유자 합산. **앱**: `eventPermissionProvider`를 서버 플래그 소비형으로 전환(클라이언트 ad-hoc 재계산 제거); 라우트 가드(편집/반복그룹/리스케줄 배치)를 능력플래그 기반으로 교정; 메시지 라우트의 stale `isOpenEvent` 절 제거. **반복 이벤트 그룹**: 비호스트/비공동호스트에게 DRAFT 및 발행 전 취소(publishedAt=null) 자식 세션 메타 필터(NOT_FOUND 응답). **정원 설정 read**: 로그인 임의 사용자 열람 → 호스트∪공동호스트∪클럽 운영진 게이트. 결정: D-F03-2(클럽 운영진 이벤트 편집/공지/신청 권한 부여 하지 않음 = 현행 유지), D-F03-3(독립이벤트 생성주체 = 제품결정 대기). 잔여 비보안 백로그: F03C-04(capacity 이원화)·F03D-01(HOSTS_ONLY 죽은 enum)·F03FG-05/09(위치 공동호스트 드리프트).
- **2026-07-02 (접근권한 감사 교정 — 서버 능력플래그 북극성 풀슬라이스, Codex GO 완료)**: 서버가 EventVo에 **뷰어별 능력플래그 10종**(canEditEvent / canManageApplications / canManageAttendance / canModerateMessages / canSendAnnouncement / canHandleRefundIssue / canResolveDispute / canViewAttendees / canCheckIn / canManageEvent)을 계산해 내려주는 북극성 모델 구현 완료. 각 플래그는 해당 액션의 실제 서버 가드와 1:1 거울 — 추측 재계산 없이 서버가 단일 진실원. **독립 이벤트**: 생애주기(편집/발행/취소/삭제)·신청관리·공지 = 호스트∪임의 공동호스트; 출석관리·체크인 = 호스트∪canManageAttendance 공동호스트∪클럽 출석관리 권한 보유자; 메시지 모더레이션 = 호스트∪canModerateMessages 공동호스트∪클럽 모더레이션 권한 보유자. **클럽 이벤트**: 위 + 클럽 권한플래그(EVENT_ATTENDANCE_MANAGER/EVENT_MODERATION_MANAGER/EVENT_REFUND_MANAGER/EVENT_DISPUTE_RESOLVER)+OWNER 보유자 합산. **앱**: `eventPermissionProvider`를 서버 플래그 소비형으로 전환(클라이언트 ad-hoc 재계산 제거); 라우트 가드(편집/반복그룹/리스케줄 배치)를 능력플래그 기반으로 교정; 메시지 라우트의 stale `isOpenEvent` 절 제거. **반복 이벤트 그룹**: 비호스트/비공동호스트에게 DRAFT 및 발행 전 취소(publishedAt=null) 자식 세션 메타 필터(NOT_FOUND 응답). **정원 설정 read**: 로그인 임의 사용자 열람 → 호스트∪공동호스트∪클럽 운영진 게이트. 결정: D-F03-2(클럽 운영진 이벤트 편집/공지/신청 권한 부여 하지 않음 = 현행 유지), D-F03-3(독립이벤트 생성주체 = 제품결정 대기). 잔여 비보안 백로그: F03C-04(capacity 이원화)·F03D-01(HOSTS_ONLY 죽은 enum)·F03FG-05/09(위치 공동호스트 드리프트).
- **2026-07-29 (current source 재실측)**: viewer capability를 `canManageCapacity` 포함 **11종**으로 갱신하고 기본 정원 설정 권한(host∪any co-host∪클럽 ADMIN/OWNER)과 고급 `PATCH /capacity-settings` 권한(host/co-host)의 차이를 기록했다. F03-02의 승인 후 선결제 전용 endpoint·참석 확정, k-익명 `fit-preview`, 호스트 재방문 배지, F03-19 주소 좌표 전달, F03-20 뒤집기 교정 체크인까지 현재 서버/Flutter 배선을 반영했다.
