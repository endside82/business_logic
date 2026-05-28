# 03. 이벤트 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-22; unit: business_logic/units/03_event -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/03_event/00_overview.md`와 153개 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

> **2026-05-28 RM 도메인 신설 영향(cross-ref).** `EventType.REGULAR_MEETING(3)` 신규. `event/util/EventScope` 공용 거름망 2개 도입(디스커버리 8표면 분류 + 신청 가드). EventVo/EventSimpleVo/CalendarEventVo에 RM 컨텍스트 5필드(`regularMeetingId`, `regularMeetingTitle`, `regularMeetingType`, `sequenceNo`, `directApplyBlocked`) 오버레이. RM 세션은 일반 `EventService.publishEvent/cancelEvent`/`EventCapacitySettingsService`/`CapacitySettingsService`/`RecurringEventCreateService` 6개 경로에서 `RegularMeetingSessionGuard`로 직접 mutation 차단. 자세한 내용은 [17 정기모임](../01_domain_prds/17_정기모임_prd.md).

## 1. 결론

사용자가 오프라인 모임을 발견·신청·참석·체크인·사진 공유까지 완수하는 비즈니스 단위.
- UI/UX 스펙: `community_api/docs/ui-ux/screens/13-event.md`, `14-event-attendance.md` (총 14개 화면 SCR-EV-001~008, SCR-EA-001~006)
- 백엔드 컨트롤러: `event/EventController`, `event/EventPhotoController`, `event/EventPlanMapController`, `event/WishlistController`, `capacity/CapacityController`, `capacity/AttendanceController`, `capacity/CheckInController`
- 프론트 feature: `community_app/lib/presentation/event/` (15 screens, 45 widgets)
**프라이빗 모임(eventType=PRIVATE)** 은 SCR-EV-006 + `GET/POST .../private/detail|open|select|complete|cancel` 시리즈로 별도 단계 모델(`WAITING_PAYMENT → RECRUITING → MATCHED → COMPLETED`)을 갖는다. 호스팅비 결제·지갑 차감이 결합되므로 본 단위(F03)에서는 **F03-03(생성)/F03-04(생명주기)/F03-06(신청자 선택)** 의 변형으로 다루고, 결제 흐름은 Unit 06(결제 & 지갑)에서 교차 정리한다.

이 도메인은 기능 PRD 18개로 구성된다(F03-01~12 기존 + F03-13~17 W2~W7 슬라이스 + F03-18 구성인원 인구통계 2026-05-27). 기존 기능별 trace source는 총 70개대, risk 후보는 총 58개이며, 이동수단 확장 슬라이스(F03-14~17)는 backend-only 1차 출시이고 Flutter 클라이언트는 후속이다. F03-18은 서버 + 앱 양쪽 완성. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

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
| F03-13 | F03-13. 이벤트 참가 선입금 (참가자·호스트) | [F03-13_event-prepayment_prd.md](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | (PLAN.md v4.5 §2/§0.2/§0.4/§2.14/§2.15) | 신규 (W2/W3 도입) | 17 | 6 |
| F03-14 | F03-14. 이동수단 공통 베이스 (Transport Mode) | [F03-14_event-transport-mode_prd.md](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md) | (W4 슬라이스 — PLAN.md v4.5 §3.2/§4) | 신규 (backend-only 1차) | 7 | 3 |
| F03-15 | F03-15. 이벤트 카풀 (CARPOOL) | [F03-15_event-carpool_prd.md](../02_feature_prds/03_event/F03-15_event-carpool_prd.md) | (W5 슬라이스 — PLAN.md v4.5 §3) | 신규 (backend-only 1차) | 11 | 5 |
| F03-16 | F03-16. 이벤트 버스대절 (BUS) | [F03-16_event-bus-charter_prd.md](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md) | (W7 슬라이스 — PLAN.md v4.5 §4) | 신규 (backend-only 1차) | 11 | 5 |
| F03-17 | F03-17. 차량 레이아웃 카탈로그 | [F03-17_vehicle-layout-catalog_prd.md](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | (W6 슬라이스 — PLAN.md v4.5 §4.1~§4.3) | 신규 (호스트용 read-only API + 시드 4종 1차) | 6 | 4 |
| F03-18 | F03-18. 이벤트 구성인원 인구통계 | [F03-18_event-demographics_prd.md](../02_feature_prds/03_event/F03-18_event-demographics_prd.md) | (DEMOGRAPHICS_STATS_PLAN.md v2, Codex sign-off) | 신규 (2026-05-27 도입) | 8 | 1 |

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

## 4. 도메인 기능 목록

### 핵심 기능 12개 + 이동수단 확장 4개

이벤트는 **호스트(주최자)** 와 **참가자** 의 행동이 명확히 구분되며, 동일 객체에 대해서도 보는 시점/권한이 다르므로 분리 표기한다. 이동수단 확장(F03-14~17)은 PLAN.md v4.5 W4~W7 슬라이스로, 1차는 backend-only로 출시한다.

| ID | 기능명 | 관점 | 주요 화면 (SCR) | 주요 API |
|---|---|---|---|---|
| F03-01 | 이벤트 발견 & 탐색 | 참가자/비로그인 | SCR-EV-001 (이벤트 목록), SCR-EV-007 (유사 이벤트) | `GET /api/v1/events`, `GET /api/v1/events/{id}/similar`, `GET /api/v1/events/recommend` |
| F03-02 | 이벤트 상세 조회 | 참가자/비로그인 | SCR-EV-002 (이벤트 상세) | `GET /api/v1/events/{eventId}`, `GET /api/v1/events/{eventId}/calendar` (.ics 내보내기) |
| F03-03 | 이벤트 생성 (호스트) | 호스트 | SCR-EV-003 (4-step 생성 폼) | `POST /api/v1/events`, `POST /api/v1/events/{id}/publish` (DRAFT→OPEN), `POST .../recurring` (반복 이벤트) |
| F03-04 | 이벤트 수정/생명주기 관리 (호스트) | 호스트 | SCR-EV-004 (수정), SCR-EV-002 (액션 바) | `PATCH /api/v1/events/{id}` (DRAFT only), `PATCH .../capacity-settings` (DRAFT/OPEN, v4.5 W1 신설 — `EventCapacitySettingsService`), `PATCH .../reschedule`, `POST .../close`, `POST .../cancel`, `DELETE /api/v1/events/{id}`, `POST .../announce` |
| F03-05 | 이벤트 신청 & 참석 (참가자) | 참가자 | SCR-EV-002 (액션 바), 신청서 바텀시트 | `POST /api/v1/events/{id}/capacity` 또는 `POST .../attend`, `POST .../apply`, `DELETE .../capacity` (취소), `GET /api/v1/events/{id}/capacity/me` |
| F03-06 | 신청서 승인/거절 (호스트) | 호스트 | SCR-EA-003 (신청서 목록) | `GET /api/v1/events/{id}/applications`, `POST .../applications/{appId}/approve`, `POST .../applications/{appId}/reject` |
| F03-07 | 정원 & 대기열 관리 | 호스트(설정/수동승격) + 참가자(대기등록) | SCR-EA-001 (참석자 목록), SCR-EA-002 (대기열) | `GET .../capacity/settings`, `PUT .../capacity/settings`, `PATCH .../capacity`, `GET .../waitlist`, `POST .../capacity/{userId}/promote`, `DELETE .../capacity/{userId}` (제거), `POST .../registration/close`, `POST .../registration/reopen` |
| F03-08 | QR 체크인 | 참가자(QR 발급) + 호스트(스캔/수동/통계) | SCR-EA-004 (QR 체크인) | `GET .../check-in/qr` (참가자 토큰 발급), `POST .../check-in` (QR 스캔), `POST .../check-in/short-code`, `POST .../check-in/{userId}` (수동), `GET .../check-in/stats` |
| F03-09 | 이벤트 사진첩 | 참석자(업로드/삭제) + 호스트(전체 관리) | SCR-EA-005 (사진첩) | `GET /api/v1/events/{id}/photos`, `POST /api/v1/events/{id}/photos`, `DELETE /api/v1/events/{id}/photos/{photoId}` |
| F03-10 | 이벤트 ↔ 플랜 연결 (호스트) | 호스트 | SCR-EV-005 (플랜 연결) | `GET/POST/PATCH/DELETE /api/v1/events/{id}/plans[/(mapId)]`, `POST .../plans/{mapId}/toggle-active` |
| F03-11 | 위시리스트 (관심 이벤트) | 참가자 | SCR-EV-001/SCR-EV-002 하트 토글, 프로필 위시리스트 | `POST /api/v1/events/{id}/wishlist`, `DELETE /api/v1/events/{id}/wishlist`, `GET /api/v1/users/me/wishlist` |
| F03-12 | 내 이벤트 관리 & 참석 로그 | 참가자 + 호스트 | SCR-EV-008 (내 이벤트), SCR-EA-006 (참석 로그) | `GET /api/v1/events/my`, `GET /api/v1/events/users/me/applications`, `GET .../capacity/logs`, `GET .../attendance/logs` |
| F03-14 | 이동수단 공통 베이스 (Transport Mode) | 호스트 | (Flutter UI 후속 — 이벤트 생성/수정 폼 내 섹션) | `GET /api/v1/events/{id}/transport`, `PUT /api/v1/events/{id}/transport/config` |
| F03-15 | 이벤트 카풀 (CARPOOL) | 호스트 + 운전자 + 탑승자 | (Flutter UI 후속) | `GET/POST .../carpool/offer[s]`, `POST .../carpool/offers/{offerId}/decision`, `PUT .../carpool/passenger`, `PUT .../carpool/passengers/{pid}/assignment`, `GET .../carpool/passengers` |
| F03-16 | 이벤트 버스대절 (BUS) | 호스트 + 참가자 | (Flutter UI 후속) | `GET /events/{id}/buses`, `GET .../buses/{busId}/seats`, `POST .../buses`, `PUT .../buses/{busId}/seats/{seatNo}?userId=` |
| F03-17 | 차량 레이아웃 카탈로그 | 호스트(read-only) + 운영자(후속 admin CRUD) | (Flutter UI 후속) | `GET /api/v1/vehicle-layouts/active`, `GET /api/v1/vehicle-layouts/{id}/seats` |

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
| F03-14 이동수단 mode | DRAFT에서 mode 선택(NONE/CARPOOL/BUS), `allowsSelfTransport` 토글. OPEN 후 mode immutable | (mode에 따른 carpool/bus 진입 — F03-15/16) |
| F03-15 카풀 | offer 확정/거절, 탑승자 배정/해제 (`pickup_capacity` 한도) | 운전자 자처(`POST /carpool/offer`) 또는 탑승 의사 등록 (`PUT /carpool/passenger`) |
| F03-16 버스대절 | 버스 추가(최대 3대), assignment_mode(`FREE/FIXED_BY_HOST/FIRST_COME`) 결정, 좌석 배정 | `FIRST_COME` 또는 `FIXED_BY_HOST + allow_self_swap=true`일 때 본인 좌석 선택 |
| F03-17 차량 카탈로그 | (호스트는 read-only로 카탈로그 조회) | (해당 없음) |

### 의존 단위 (Cross-cutting)

- **Unit 06 결제 & 지갑** — 유료 이벤트 참가비, 프라이빗 모임 호스팅비 차감 (F03-05, F03-04 PRIVATE)
- **Unit 07 모임 정산** — 사전결제·정산 항목 등록 (호스트가 SCR-EV-003 옵션 단계에서 prepayment 설정 시)
- **Unit 08 플랜 마켓** — F03-10이 참조하는 plan 엔티티
- **Unit 12 알림** — 신청 승인/거절, 일정 변경, 대기열 자동 승격, 호스트 공지(announce) FCM 발송
- **Unit 11 리뷰 & 신고** — 종료된 이벤트 리뷰 작성 (SCR-EV-002 종료 후 진입점)
- **Unit 14 위치 & 길찾기** — 오프라인 이벤트 주소 검색·지오코딩, 지도 미리보기
- 횡단 인프라 — `file/FileController` (썸네일/사진 S3 presigned URL)

### 도메인 상태 모델 (요약)

- **EventStatus**: `DRAFT → OPEN → CLOSED` (정상) / `OPEN → CANCELED` (호스트 취소) / `HIDDEN` (비공개)
- **AttendanceStatus**: `ATTENDING` / `WAITING` (대기 순번 보유) / `CANCELLED`
  - 승격 플래그: `promotedFromWaitlist` (자동), `manuallyPromoted` (호스트 수동)
- **ApplicationStatus**: `PENDING → APPROVED` / `PENDING → REJECTED` / `CANCELED` (신청자 본인 취소, L 한 개)
- **PrivateMeetingPhase**: `WAITING_PAYMENT → RECRUITING → MATCHED → COMPLETED` / `CANCELLED`
- **TransportMode** (W4): `NONE / CARPOOL / BUS` — DRAFT only 변경 (hard delete). OPEN 후 immutable.
- **CarpoolStatus** (W5): `OFFERED → CONFIRMED` / `OFFERED → REJECTED` / `CANCELED` (`event_carpool_offer.status`)
- **TransportChoice** (W5): `CARPOOL_REQUESTED / CARPOOL_ASSIGNED / SELF / DRIVER` (`event_carpool_passenger.transport_choice`)
- **BusAssignmentMode** (W7): `FREE / FIXED_BY_HOST / FIRST_COME` — 좌석 배정자 0명일 때만 OPEN에서 변경 가능

## 6. 화면/API 매핑

### Flutter 화면 ↔ 기능 매핑

| Flutter screen | 기능 ID |
|---|---|
| `event_list_screen.dart` | F03-01 |
| `similar_events_screen.dart` | F03-01 |
| `event_detail_screen.dart` | F03-02 (참가자) / F03-04 액션 바 (호스트) |
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

- **2026-05-22 (v4.5 W2/W3 — 이벤트 참가 선입금 + 환불 + 호스트 cancel 통합, [F03-13](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md))**: 신규 테이블 `event_payment(id, event_id, user_id, application_id, amount, method ENUM(WALLET,BANK_TRANSFER), status ENUM(PENDING,PAID,REFUND_REQUESTED,REFUNDED,CANCELED), bank_transfer_memo, host_confirmed_at, host_confirmed_by, point_tx_id, refund_point_tx_id, paid_at, refunded_at, refund_amount, refund_reason, refund_failure_reason, active_application_id STORED, UNIQUE)` — `active_application_id` STORED generated column으로 application당 활성 결제 1건 보장(D6). 신규 facade 4종: `EventPrepaymentService(payByWallet/bankDeclare/bankConfirm/bankReject, :68/:124/:159/:211)`, `EventPaymentRefundService(refundByWallet/refundByBankConfirm/refundByHostCancel, :68/:153/:203)`, `EventParticipationCancellationService(cancelMyParticipation, :44)`, `EventCancellationRefundCoordinator` (현재는 `EventService.tryRefundNewPrepayment` :631에서 인라인 위임). lock 순서 `event → application → event_payment`(§0.4) 전 facade 적용. `EventService.cancelEvent/ClubEventService.cancelClubEvent/RecurringEventCreateService.cancelAllFutureEvents`에 신규 `tryRefundNewPrepayment` 우선 시도 + legacy `refundByHostCancel` fallback 분기 추가. D1 동기화: 선입금 활성 시 `Event.price = EventPrepayment.prepaymentAmount` 단방향, 활성+price 불일치 → 400 `PRICE_PREPAYMENT_MISMATCH`, 활성+amount<=0 → 400 `INVALID_PREPAYMENT_AMOUNT`, OFF 전환 시 `event.price=0` 자동 무료(Q2). D4: `APPROVED_PENDING_PAYMENT` 좌석 미점유(capacity는 결제 확정 시점에만 증가). D5: 계좌이체 분개 없음, 호스트 정산 보고서 6 섹션. D6: 1 active payment per application. D7: 1차 환불 정책 단일 deadline 100% / 마감 후 0%(비율 정책은 후속). D8: 신규 `WalletService.payForApplication(:189)` — referenceType="EVENT_PREPAYMENT" / referenceId=eventPaymentId. 기존 `WalletService.pay` 변경 없음. D15: 알림은 `@TransactionalEventListener(AFTER_COMMIT)` (EventExtensionNotificationListener). D16: `reservedPaymentPendingCount`는 EventVo 단건 lazy, 목록 0. 신규 enum: TransactionType 26 `EVENT_PREPAYMENT_REFUND`, NotificationType 71~76 + 83 `EVENT_PREPAYMENT_REFUND_REQUESTED`, EventPaymentMethod·EventPaymentStatus. 신규 ErrorCode: `INVALID_PREPAYMENT_AMOUNT`, `PRICE_PREPAYMENT_MISMATCH`, `EVENT_PAYMENT_NOT_FOUND`, `INVALID_PAYMENT_STATE`, `PREPAYMENT_POLICY_NOT_FOUND`, `PAYMENT_PENDING`, `REFUND_ALREADY_REQUESTED`, `DEACTIVATION_BLOCKED_BY_PAYMENT`(`ErrorCode.java:96`). EventVo 4 필드 + ViewerContext 9 필드 확장. `AccountDeactivationService` BlockingItem `ACTIVE_EVENT_PAYMENT`(`:493`) — PENDING/PAID/REFUND_REQUESTED 보유 시 탈퇴 차단. 영향 받는 기능: F03-04(이벤트 취소 시 신규 환불 분기), F03-05(`APPROVED_PENDING_PAYMENT` 진입 + `cancelMyParticipation` 라우팅), F03-13(본 신규 PRD), F06-06(`payForApplication` 신규 경로), F06-10(BANK 6 섹션 D5). 미완(후속 슬라이스): `WalletRefundExecutor` 공통 헬퍼 추출, 환불 정책 비율 계산(GRADUATED), Flutter 결제 화면, PG queue 환불 통합, 호스트 정산 보고서 BANK 6 섹션 UI.
- **2026-05-22 (v4.5 W1 — 정원 초과 허용 도입)**: `event` 테이블에 `overcapacity_allowed`/`hard_capacity_limit` 두 컬럼 추가. 정원 판정을 `CapacityPolicy.decide(event, attendingCount)` 5-룰 매트릭스로 단일화하여 `apply / approveApplication / attend / confirmAttendanceFromPayment` 진입점이 모두 동일 헬퍼를 호출. 별도 서비스 `EventCapacitySettingsService`(`community_api/src/main/java/com/endside/community/event/service/EventCapacitySettingsService.java`)와 신규 엔드포인트 `PATCH /events/{id}/capacity-settings`로 DRAFT/OPEN 운영 중 정원 토글 분리(Q7 — CLOSED 차단). 공통 빈 `EventAuthorizationService` + `EventVoAssembler`(D12/D13) 추출. `ChangeType.OVERCAPACITY_APPROVED(9)` / `CAPACITY_REDUCED(10)` 신규, `ErrorCode.INVALID_HARD_CAPACITY_LIMIT(400013)` + `CAPACITY_FULL_AT_CONFIRMATION(400012)` 추가. EventVo에 `overcapacityAllowed / hardCapacityLimit / exceedingAttendees / reservedPaymentPendingCount` 4개 필드 노출(목록은 N+1 회피 위해 `reservedPaymentPendingCount=0` 고정, 단건만 lazy). 정원 축소 시 기존 ATTENDING은 유지하고 audit log만 기록. 영향 받는 기능: F03-03(생성 시 정원 옵션) / F03-04(생명주기 별도 capacity-settings 위임) / F03-05(신청·결제 확정 매트릭스 위임) / F03-06(승인 매트릭스 위임) / F03-07(정책 본체와 매트릭스 정의 위치). F03-07의 기존 trace ID와 risk 후보 수치는 그대로 유지됨 — W1 변경은 기존 trace를 변경하지 않고 신규 정책 문서만 추가했다.
- **2026-05-22 (v4.5 W4 — 이동수단 공통 베이스 도입, [F03-14](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md))**: 신규 테이블 `event_transport_config(event_id PK, mode ENUM(NONE,CARPOOL,BUS), allows_self_transport)` 추가. 신규 패키지 `event/transport/` 신설. 사용자 확정 D2(택일) 반영 — 한 이벤트는 한 mode만. `mode` 변경은 **DRAFT only hard delete** 정책 (PLAN.md §3.2). OPEN 이후 immutable, `MODE_CHANGE_NOT_ALLOWED` 가드. mode-internal 토글(`allowsSelfTransport`, `event_bus.allow_self_swap`)은 OPEN에서도 변경 가능. 신규 enum: `TransportMode`, `CarpoolStatus`, `TransportChoice`, `BusAssignmentMode` (`ENUM_RESERVATIONS.md`). 신규 endpoint: `GET /api/v1/events/{eventId}/transport`, `PUT /transport/config`. Flutter 클라이언트는 후속 슬라이스.
- **2026-05-22 (v4.5 W5 — 카풀 운영 도입, [F03-15](../02_feature_prds/03_event/F03-15_event-carpool_prd.md))**: 신규 테이블 3종 — `event_carpool_offer`(driver_user_id, pickup_capacity, pickup_locations, status), `event_carpool_passenger`(event_id+user_id UNIQUE, transport_choice, boarding_location, assigned_offer_id), `event_carpool_assignment_log`(현 슬라이스는 스키마만, INSERT 미적용 — 후속). `EventCarpoolService.assertCarpoolMode` 가드를 offer/decideOffer/registerPassenger/assign 전체에 적용. 권한 정책: `GET /carpool/passengers`는 host/coHost이면 전체, 그 외는 본인 row 1건만 (E2E S3-4). `pickup_capacity` 초과 배정 차단. NotificationType 77~80 — `CARPOOL_OFFER_CONFIRMED/REJECTED`, `CARPOOL_PASSENGER_ASSIGNED/UNASSIGNED` (AFTER_COMMIT). 신규 endpoint 7개(controller line 29~71). Flutter 클라이언트와 swap 로그 INSERT는 후속.
- **2026-05-22 (v4.5 W6 — 차량 레이아웃 카탈로그 도입, [F03-17](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md))**: 신규 테이블 `vehicle_layout(name, seat_count, is_active)` + `vehicle_layout_seat(layout_id, seat_no, row_index, col_index, seat_type ENUM(NORMAL,DRIVER,GUIDE,FOLDABLE,DISABLED,AISLE), is_selectable)`. 시드 4종 INSERT: 28인승 A타입, 45인승, 20인승, 8인승(운전자 제외). 호스트용 read-only endpoint 2개 — `GET /api/v1/vehicle-layouts/active`, `GET /vehicle-layouts/{id}/seats`. **관리자 CRUD UI(SPA)는 1차 출시 범위 외** (Q5 사용자 확정) — `community_admin_api` 후속 슬라이스. 1차 운영은 직접 INSERT 또는 admin API curl 호출.
- **2026-05-22 (v4.5 W7 — 버스대절 운영 도입, [F03-16](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md))**: 신규 테이블 `event_bus(event_id+bus_no UNIQUE, vehicle_layout_id, assignment_mode ENUM(FREE,FIXED_BY_HOST,FIRST_COME), allow_self_swap)` + `event_bus_seat(event_bus_id+seat_no UNIQUE, event_id+user_id UNIQUE 비정규화, user_id nullable, locked_by_host)`. 최대 3대/이벤트 (`MAX_BUSES_PER_EVENT=3`) service-level 가드. 모드별 좌석 prepopulate: `FREE`는 seat row 미생성, `FIXED_BY_HOST`/`FIRST_COME`은 `vehicle_layout_seat.is_selectable=true` 좌석을 미리 INSERT. 동시성: `event_bus` parent lock + seat `FOR UPDATE`, `UNIQUE(event_id, user_id)` 위반 → `DataIntegrityViolationException` → `USER_ALREADY_SEATED_IN_EVENT` 변환. `event_bus.eventId != pathEventId` 시 400 (E2E S4-7). NotificationType 81~82 — `BUS_SEAT_ASSIGNED`, `BUS_SEAT_CHANGED`. VO 추출 완료(`EventBusVo`, `EventBusSeatVo`). 신규 endpoint 4개(controller line 28~48). Flutter 좌석 위젯·모델·화면은 후속.
