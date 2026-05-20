# 03. 이벤트 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/03_event -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/03_event/00_overview.md`와 117개 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

사용자가 오프라인 모임을 발견·신청·참석·체크인·사진 공유까지 완수하는 비즈니스 단위.
- UI/UX 스펙: `community_api/docs/ui-ux/screens/13-event.md`, `14-event-attendance.md` (총 14개 화면 SCR-EV-001~008, SCR-EA-001~006)
- 백엔드 컨트롤러: `event/EventController`, `event/EventPhotoController`, `event/EventPlanMapController`, `event/WishlistController`, `capacity/CapacityController`, `capacity/AttendanceController`, `capacity/CheckInController`
- 프론트 feature: `community_app/lib/presentation/event/` (15 screens, 45 widgets)
**프라이빗 모임(eventType=PRIVATE)** 은 SCR-EV-006 + `GET/POST .../private/detail|open|select|complete|cancel` 시리즈로 별도 단계 모델(`WAITING_PAYMENT → RECRUITING → MATCHED → COMPLETED`)을 갖는다. 호스팅비 결제·지갑 차감이 결합되므로 본 단위(F03)에서는 **F03-03(생성)/F03-04(생명주기)/F03-06(신청자 선택)** 의 변형으로 다루고, 결제 흐름은 Unit 06(결제 & 지갑)에서 교차 정리한다.

이 도메인은 기능 PRD 12개로 구성된다. 현재 기능별 trace source는 총 62개이고, risk 후보는 총 57개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

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

### 핵심 기능 12개

이벤트는 **호스트(주최자)** 와 **참가자** 의 행동이 명확히 구분되며, 동일 객체에 대해서도 보는 시점/권한이 다르므로 분리 표기한다.

| ID | 기능명 | 관점 | 주요 화면 (SCR) | 주요 API |
|---|---|---|---|---|
| F03-01 | 이벤트 발견 & 탐색 | 참가자/비로그인 | SCR-EV-001 (이벤트 목록), SCR-EV-007 (유사 이벤트) | `GET /api/v1/events`, `GET /api/v1/events/{id}/similar`, `GET /api/v1/events/recommend` |
| F03-02 | 이벤트 상세 조회 | 참가자/비로그인 | SCR-EV-002 (이벤트 상세) | `GET /api/v1/events/{eventId}`, `GET /api/v1/events/{eventId}/calendar` (.ics 내보내기) |
| F03-03 | 이벤트 생성 (호스트) | 호스트 | SCR-EV-003 (4-step 생성 폼) | `POST /api/v1/events`, `POST /api/v1/events/{id}/publish` (DRAFT→OPEN), `POST .../recurring` (반복 이벤트) |
| F03-04 | 이벤트 수정/생명주기 관리 (호스트) | 호스트 | SCR-EV-004 (수정), SCR-EV-002 (액션 바) | `PATCH /api/v1/events/{id}`, `PATCH .../reschedule`, `POST .../close`, `POST .../cancel`, `DELETE /api/v1/events/{id}`, `POST .../announce` |
| F03-05 | 이벤트 신청 & 참석 (참가자) | 참가자 | SCR-EV-002 (액션 바), 신청서 바텀시트 | `POST /api/v1/events/{id}/capacity` 또는 `POST .../attend`, `POST .../apply`, `DELETE .../capacity` (취소), `GET /api/v1/events/{id}/capacity/me` |
| F03-06 | 신청서 승인/거절 (호스트) | 호스트 | SCR-EA-003 (신청서 목록) | `GET /api/v1/events/{id}/applications`, `POST .../applications/{appId}/approve`, `POST .../applications/{appId}/reject` |
| F03-07 | 정원 & 대기열 관리 | 호스트(설정/수동승격) + 참가자(대기등록) | SCR-EA-001 (참석자 목록), SCR-EA-002 (대기열) | `GET .../capacity/settings`, `PUT .../capacity/settings`, `PATCH .../capacity`, `GET .../waitlist`, `POST .../capacity/{userId}/promote`, `DELETE .../capacity/{userId}` (제거), `POST .../registration/close`, `POST .../registration/reopen` |
| F03-08 | QR 체크인 | 참가자(QR 발급) + 호스트(스캔/수동/통계) | SCR-EA-004 (QR 체크인) | `GET .../check-in/qr` (참가자 토큰 발급), `POST .../check-in` (QR 스캔), `POST .../check-in/short-code`, `POST .../check-in/{userId}` (수동), `GET .../check-in/stats` |
| F03-09 | 이벤트 사진첩 | 참석자(업로드/삭제) + 호스트(전체 관리) | SCR-EA-005 (사진첩) | `GET /api/v1/events/{id}/photos`, `POST /api/v1/events/{id}/photos`, `DELETE /api/v1/events/{id}/photos/{photoId}` |
| F03-10 | 이벤트 ↔ 플랜 연결 (호스트) | 호스트 | SCR-EV-005 (플랜 연결) | `GET/POST/PATCH/DELETE /api/v1/events/{id}/plans[/(mapId)]`, `POST .../plans/{mapId}/toggle-active` |
| F03-11 | 위시리스트 (관심 이벤트) | 참가자 | SCR-EV-001/SCR-EV-002 하트 토글, 프로필 위시리스트 | `POST /api/v1/events/{id}/wishlist`, `DELETE /api/v1/events/{id}/wishlist`, `GET /api/v1/users/me/wishlist` |
| F03-12 | 내 이벤트 관리 & 참석 로그 | 참가자 + 호스트 | SCR-EV-008 (내 이벤트), SCR-EA-006 (참석 로그) | `GET /api/v1/events/my`, `GET /api/v1/events/users/me/applications`, `GET .../capacity/logs`, `GET .../attendance/logs` |

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
