# PRD 전환 상태표

> 업데이트: 2026-05-22. 이 표는 `business_logic/units`의 117개 기능 단위와 `business_logic/prd/02_feature_prds`의 기능 PRD를 1:1로 맞춘 결과다.
>
> v4.5 W1~W7 (이벤트 확장 슬라이스) 신규 PRD 5개(F03-13~17)가 같은 디렉터리에 추가된다. 본 슬라이스는 단일 master plan(`docs/plan/event-extensions/PLAN.md`) 산하 vertical slice이며, V1__init.sql 단일 마이그레이션 파일 원칙(`community_api/CLAUDE.md`)을 유지한다.

## 요약

| 항목 | 개수 |
|---|---:|
| 전체 기능 단위 (v4.5 확장 전) | 117 |
| v4.5 신규 기능 단위 (F03-13~17) | 5 |
| Golden sample 유지 | 1 |
| 실사 기반 전환 완료 | 116 |
| v4.5 신규 PRD (별도 master plan 산하) | 5 |
| 누락/확인 필요 | 0 |

## 2026-05-24 — 경고·징계 / 마일리지 도메인 추가

community_api 의 `warning`·`mileage` 도메인(§30 클럽 활동)이 PRD/docs에 누락되어 있어 source-first 로 신규 작성했다. 서버 controller/service/VO/enum + Flutter `lib/.../warning|mileage/` + `V1__init.sql` 을 직접 대조했다.

| 도메인 | 도메인 PRD | 기능 PRD | docs |
|---|---|---|---:|
| 15 경고 & 징계 | `01_domain_prds/15_경고_징계_prd.md` | `02_feature_prds/15_warning/F15-01~09` | `docs/domains/15-warning.html` + `F15-01~09.html` |
| 16 마일리지 | `01_domain_prds/16_마일리지_prd.md` | `02_feature_prds/16_mileage/F16-01~08` | `docs/domains/16-mileage.html` + `F16-01~08.html` |

신규 기능 PRD 17개(F15 9 + F16 8) 추가 → 기능 인벤토리 122 → **139**, 도메인 14 → **16**. 두 도메인은 units/ 파이프라인 없이 source-first 로 직접 작성(시나리오 수는 미측정 "—"). 주요 Gap: FORCED_REMOVE 후속 미연동, mileage batch/member-detail 응답 타입(Map↔VO) 불일치, 자동적립 트리거 호출처 부재, 시즌 랭킹 basis 값 불일치 — 각 기능 PRD §8 참조.

## v4.5 W1~W7 영향 요약 (2026-05-22)

`docs/plan/event-extensions/PLAN.md` v4.5의 7개 Wave는 아래 인프라/스키마 변경을 동반한다. 모두 단일 `community_api/src/main/resources/db/migration/V1__init.sql`에 흡수한다 (V2 이상 신규 파일 금지 — `community_api/CLAUDE.md` 규칙 준수). 운영 환경 정합성 복구는 별도 절차 SQL인 `docs/sql/local_schema_repair_2026-05-22.sql`(또는 `docs/sql/repair_local_schema_2026-05-22.sql`)을 통해 수동 실행한다.

### 스키마 변경

| 대상 | 변경 종류 | 상세 | Wave |
|---|---|---|---|
| `event` 테이블 | 컬럼 2개 추가 | `overcapacity_allowed TINYINT(1) NOT NULL DEFAULT 0`, `hard_capacity_limit INT NULL` | W1 |
| `application` 테이블 | 복합 인덱스 1개 추가 | `idx_application_event_status (event_id, status)` — `countByEventIdInAndStatus` 최적화 | W2a |
| `event_payment` | 신규 테이블 | 참가 선입금 결제/환불 트래킹. FK: event/users/application/point_transaction | W2a |
| `event_transport_config` | 신규 테이블 | 이벤트별 교통 모드 (NONE/CARPOOL/BUS) | W4 |
| `event_carpool_offer` | 신규 테이블 | 운전자 offer (OFFERED→CONFIRMED/REJECTED/CANCELED) | W5 |
| `event_carpool_passenger` | 신규 테이블 | 탑승자 배정 상태 | W5 |
| `event_carpool_assignment_log` | 신규 테이블 | 카풀 swap 감사 로그 | W5 |
| `vehicle_layout` | 신규 테이블 | 관리자 카탈로그 (admin 측 마스터) | W6 |
| `vehicle_layout_seat` | 신규 테이블 | 좌석 정의 (NORMAL/DRIVER/GUIDE/FOLDABLE/DISABLED/AISLE) | W6 |
| `event_bus` | 신규 테이블 | 이벤트별 버스 인스턴스 | W7 |
| `event_bus_seat` | 신규 테이블 | 좌석 배정 (FREE/FIXED_BY_HOST/FIRST_COME) | W7 |

추가 테이블 총 **9개** (event_payment 1 + carpool 3 + vehicle_layout 2 + bus 2 + log 1). 기존 테이블 컬럼/인덱스 추가는 `event` 2 컬럼 + `application` 1 인덱스로 한정.

### Enum 변경

| 대상 enum | 종류 | 추가/신규 | Wave |
|---|---|---|---|
| `TransactionType` | 기존 enum 값 추가 | 26 = `EVENT_PREPAYMENT_REFUND` (WALLET 환불 그룹 집계 포함) | W2b |
| `NotificationType` | 기존 enum 값 추가 | 71~83 (13개 — 선입금/카풀/버스 알림) | W2~W7 |
| `ChangeType` | 기존 enum 값 추가 | 9 = `OVERCAPACITY_APPROVED`, 10 = `CAPACITY_REDUCED` | W1 |
| `EventPaymentMethod` | 신규 enum | `WALLET`, `BANK_TRANSFER` | W2a |
| `EventPaymentStatus` | 신규 enum | `PENDING`, `PAID`, `REFUND_REQUESTED`, `REFUNDED`, `CANCELED` | W2a |
| `TransportMode` | 신규 enum | `NONE`, `CARPOOL`, `BUS` | W4 |
| `CarpoolStatus` | 신규 enum | `OFFERED`, `CONFIRMED`, `REJECTED`, `CANCELED` | W5 |
| `TransportChoice` | 신규 enum | `CARPOOL_REQUESTED`, `CARPOOL_ASSIGNED`, `SELF`, `DRIVER` | W5 |
| `BusAssignmentMode` | 신규 enum | `FREE`, `FIXED_BY_HOST`, `FIRST_COME` | W7 |
| `VehicleSeatType` | 신규 enum | `NORMAL`, `DRIVER`, `GUIDE`, `FOLDABLE`, `DISABLED`, `AISLE` | W6 |

검증 테스트: `community_api/src/test/java/com/endside/community/EnumReservationTest.java` (모든 enum 번호의 unique + presence 검증).

### V1__init.sql 단일 파일 규칙

- `community_api/CLAUDE.md`에 명시된 대로 **모든 W1~W7 DDL은 `V1__init.sql` 한 파일에만 누적**. V2/V3 추가 금지.
- 신규 `CREATE TABLE` 9개와 신규 컬럼 2개 + 인덱스 1개를 `V1__init.sql`의 적절한 위치에 삽입.
- 로컬/스테이징 DB가 이미 V1 적용 후일 경우, `docs/sql/local_schema_repair_2026-05-22.sql`을 수동 실행해 동기화. (운영 절차: ① 백업 → ② repair SQL dry-run → ③ 실행 → ④ flyway info 확인). 부록은 PLAN.md §"부록 A — Repair SQL 패턴"을 참조.

### 시드 데이터 (W6 — vehicle_layout 4종)

| 레이아웃 | 좌석 수 | 용도 |
|---|---:|---|
| 8인승 (밴) | 8 | 소규모 카풀/렌터카 |
| 20인승 (소형버스) | 20 | 소규모 단체 |
| 28인승 (미니버스) | 28 | 중간 단체 |
| 45인승 (대형버스) | 45 | 대규모 단체 |

- 시드 SQL은 `V1__init.sql` 말미 또는 `community_admin_api/docs/seed/vehicle_layouts.json` 기반 ddl insert 블록으로 삽입.
- 좌석 JSON은 운영자가 직접 수정 가능 — 1차 출시 관리자 UI는 범위 외, admin API + 직접 INSERT로 운영.

### 후속 슬라이스 (1차 범위 외)

- **관리자 SPA** — `vehicle_layout` 관리 UI (W6b로 분리, 1차 출시 직후 후속)
- **Flutter W5/W7 클라이언트** — 카풀/버스 좌석 위젯, 운전자 offer 화면
- **WalletRefundExecutor** — `EventPaymentRefundService` 분리 후 별도 빈 (W2b 완료 시점에 추출)
- **환불 비율 정책** — 시간대별 환불 비율(시작 N시간 전 100%/50%/0% 등)은 별도 PRD로 결정. 현재 PLAN은 100% 환불만 명시.
- **카풀 swap 로그 분석** — `event_carpool_assignment_log` 기반 호스트 swap 패턴 리포트 (분석/감사 용도)

## v4.5 신규 기능 PRD (별도 등록 — `02_feature_prds/03_event/`)

| ID | 도메인 | 예상 PRD 파일 | 주요 기능 | Wave | 상태 |
|---|---|---|---|---|---|
| F03-13 | 이벤트 | `F03-13_event-prepayment_prd.md` 또는 `F07-11_event-prepayment-flow_prd.md` | 참가 선입금 (WALLET/BANK_TRANSFER) | W2a/W2b/W3 | 신설 진행중 (별도 agent) |
| F03-14 | 이벤트 | `F03-14_event-transport-mode_prd.md` | 교통 모드 베이스 (NONE/CARPOOL/BUS 전이) | W4 | 신설 진행중 (별도 agent) |
| F03-15 | 이벤트 | `F03-15_event-carpool_prd.md` | 카풀 운영 (offer/passenger/swap) | W5 | 신설 진행중 (별도 agent) |
| F03-16 | 이벤트 | `F03-16_event-bus-charter_prd.md` | 이벤트 측 버스 운영 + 좌석 위젯 | W7 | 신설 진행중 (별도 agent) |
| F03-17 | 이벤트 | `F03-17_vehicle-layout-catalog_prd.md` | 관리자 차량 레이아웃 카탈로그 | W6 | 신설 진행중 (별도 agent) |

신규 PRD 5개는 본 인덱스에는 등록하되, 본문 작성은 별도 agent에서 진행. 본 표는 머지 시점에 trace/risk 후보 수가 채워진다.

## 읽는 법

- **Golden sample**: 수작업으로 실제 서버/Flutter 소스를 직접 대조해 완성한 기준 문서다.
- **전환 완료**: `backend.md`, `frontend.md`, `scenarios.md`, `diagrams.md`의 실사 내용을 PRD 구조로 재배치했다. 구현 착수 전 trace source를 다시 열어 최종 확인한다.
- **Trace 수**: 원천 문서에 남아 있는 `<!-- traces: ... -->` 소스 참조 개수다.
- **Risk 후보 수**: 원천 문서에서 Gap/Risk/주의/보강 등으로 표시된 판단 후보 수다.

## 전체 목록

| ID | 도메인 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F01-01 | 인증 & 온보딩 | [F01-01_email-signup-login_prd.md](02_feature_prds/01_auth_onboarding/F01-01_email-signup-login_prd.md) | [F01-01_email-signup-login](../units/01_auth_onboarding/F01-01_email-signup-login) | 전환 완료 | 2 | 0 |
| F01-02 | 인증 & 온보딩 | [F01-02_social-login_prd.md](02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | [F01-02_social-login](../units/01_auth_onboarding/F01-02_social-login) | 전환 완료 | 1 | 1 |
| F01-03 | 인증 & 온보딩 | [F01-03_email-verification_prd.md](02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | [F01-03_email-verification](../units/01_auth_onboarding/F01-03_email-verification) | 전환 완료 | 4 | 1 |
| F01-04 | 인증 & 온보딩 | [F01-04_password-reset_prd.md](02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | [F01-04_password-reset](../units/01_auth_onboarding/F01-04_password-reset) | 전환 완료 | 2 | 1 |
| F01-05 | 인증 & 온보딩 | [F01-05_token-refresh-logout_prd.md](02_feature_prds/01_auth_onboarding/F01-05_token-refresh-logout_prd.md) | [F01-05_token-refresh-logout](../units/01_auth_onboarding/F01-05_token-refresh-logout) | 전환 완료 | 2 | 0 |
| F01-06 | 인증 & 온보딩 | [F01-06_onboarding_prd.md](02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | [F01-06_onboarding](../units/01_auth_onboarding/F01-06_onboarding) | 전환 완료 | 0 | 1 |
| F01-07 | 인증 & 온보딩 | [F01-07_preference-tags_prd.md](02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | [F01-07_preference-tags](../units/01_auth_onboarding/F01-07_preference-tags) | 전환 완료 | 4 | 1 |
| F01-08 | 인증 & 온보딩 | [F01-08_social-unlink_prd.md](02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | [F01-08_social-unlink](../units/01_auth_onboarding/F01-08_social-unlink) | 전환 완료 | 1 | 1 |
| F02-01 | 홈 피드 | [F02-01_home-feed-main_prd.md](02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | [F02-01_home-feed-main](../units/02_home_feed/F02-01_home-feed-main) | 전환 완료 | 4 | 3 |
| F02-02 | 홈 피드 | [F02-02_home-feed-refresh_prd.md](02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | [F02-02_home-feed-refresh](../units/02_home_feed/F02-02_home-feed-refresh) | 전환 완료 | 0 | 1 |
| F02-03 | 홈 피드 | [F02-03_section-card-entry_prd.md](02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | [F02-03_section-card-entry](../units/02_home_feed/F02-03_section-card-entry) | 전환 완료 | 0 | 2 |
| F02-04 | 홈 피드 | [F02-04_recommend-events-more_prd.md](02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | [F02-04_recommend-events-more](../units/02_home_feed/F02-04_recommend-events-more) | 전환 완료 | 2 | 9 |
| F02-05 | 홈 피드 | [F02-05_search-notification-entry_prd.md](02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | [F02-05_search-notification-entry](../units/02_home_feed/F02-05_search-notification-entry) | 전환 완료 | 0 | 10 |
| F03-01 | 이벤트 | [F03-01_event-discovery_prd.md](02_feature_prds/03_event/F03-01_event-discovery_prd.md) | [F03-01_event-discovery](../units/03_event/F03-01_event-discovery) | 전환 완료 | 3 | 2 |
| F03-02 | 이벤트 | [F03-02_event-detail_prd.md](02_feature_prds/03_event/F03-02_event-detail_prd.md) | [F03-02_event-detail](../units/03_event/F03-02_event-detail) | Golden sample | 2 | 2 |
| F03-03 | 이벤트 | [F03-03_event-creation_prd.md](02_feature_prds/03_event/F03-03_event-creation_prd.md) | [F03-03_event-creation](../units/03_event/F03-03_event-creation) | 전환 완료 | 4 | 3 |
| F03-04 | 이벤트 | [F03-04_event-lifecycle_prd.md](02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | [F03-04_event-lifecycle](../units/03_event/F03-04_event-lifecycle) | 전환 완료 | 9 | 3 |
| F03-05 | 이벤트 | [F03-05_event-attendance_prd.md](02_feature_prds/03_event/F03-05_event-attendance_prd.md) | [F03-05_event-attendance](../units/03_event/F03-05_event-attendance) | 전환 완료 | 6 | 21 |
| F03-06 | 이벤트 | [F03-06_application-review_prd.md](02_feature_prds/03_event/F03-06_application-review_prd.md) | [F03-06_application-review](../units/03_event/F03-06_application-review) | 전환 완료 | 3 | 9 |
| F03-07 | 이벤트 | [F03-07_capacity-and-waitlist_prd.md](02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | [F03-07_capacity-and-waitlist](../units/03_event/F03-07_capacity-and-waitlist) | 전환 완료 | 16 | 3 |
| F03-08 | 이벤트 | [F03-08_qr-checkin_prd.md](02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | [F03-08_qr-checkin](../units/03_event/F03-08_qr-checkin) | 전환 완료 | 5 | 1 |
| F03-09 | 이벤트 | [F03-09_event-photos_prd.md](02_feature_prds/03_event/F03-09_event-photos_prd.md) | [F03-09_event-photos](../units/03_event/F03-09_event-photos) | 전환 완료 | 3 | 2 |
| F03-10 | 이벤트 | [F03-10_event-plan-link_prd.md](02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | [F03-10_event-plan-link](../units/03_event/F03-10_event-plan-link) | 전환 완료 | 5 | 3 |
| F03-11 | 이벤트 | [F03-11_wishlist_prd.md](02_feature_prds/03_event/F03-11_wishlist_prd.md) | [F03-11_wishlist](../units/03_event/F03-11_wishlist) | 전환 완료 | 3 | 1 |
| F03-12 | 이벤트 | [F03-12_my-events_prd.md](02_feature_prds/03_event/F03-12_my-events_prd.md) | [F03-12_my-events](../units/03_event/F03-12_my-events) | 전환 완료 | 3 | 7 |
| F04-01 | 클럽 | [F04-01_club-discovery_prd.md](02_feature_prds/04_club/F04-01_club-discovery_prd.md) | [F04-01_club-discovery](../units/04_club/F04-01_club-discovery) | 전환 완료 | 1 | 3 |
| F04-02 | 클럽 | [F04-02_club-detail-join_prd.md](02_feature_prds/04_club/F04-02_club-detail-join_prd.md) | [F04-02_club-detail-join](../units/04_club/F04-02_club-detail-join) | 전환 완료 | 3 | 0 |
| F04-03 | 클럽 | [F04-03_club-crud-transfer_prd.md](02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | [F04-03_club-crud-transfer](../units/04_club/F04-03_club-crud-transfer) | 전환 완료 | 4 | 11 |
| F04-04 | 클럽 | [F04-04_member-management_prd.md](02_feature_prds/04_club/F04-04_member-management_prd.md) | [F04-04_member-management](../units/04_club/F04-04_member-management) | 전환 완료 | 3 | 0 |
| F04-05 | 클럽 | [F04-05_waitlist-invitation_prd.md](02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | [F04-05_waitlist-invitation](../units/04_club/F04-05_waitlist-invitation) | 전환 완료 | 6 | 1 |
| F04-06 | 클럽 | [F04-06_ban-management_prd.md](02_feature_prds/04_club/F04-06_ban-management_prd.md) | [F04-06_ban-management](../units/04_club/F04-06_ban-management) | 전환 완료 | 4 | 0 |
| F04-07 | 클럽 | [F04-07_my-clubs-stats_prd.md](02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | [F04-07_my-clubs-stats](../units/04_club/F04-07_my-clubs-stats) | 전환 완료 | 2 | 6 |
| F04-08 | 클럽 | [F04-08_board-post-crud_prd.md](02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | [F04-08_board-post-crud](../units/04_club/F04-08_board-post-crud) | 전환 완료 | 0 | 3 |
| F04-09 | 클럽 | [F04-09_post-comments_prd.md](02_feature_prds/04_club/F04-09_post-comments_prd.md) | [F04-09_post-comments](../units/04_club/F04-09_post-comments) | 전환 완료 | 5 | 7 |
| F04-10 | 클럽 | [F04-10_announcements_prd.md](02_feature_prds/04_club/F04-10_announcements_prd.md) | [F04-10_announcements](../units/04_club/F04-10_announcements) | 전환 완료 | 3 | 2 |
| F04-11 | 클럽 | [F04-11_photo-album_prd.md](02_feature_prds/04_club/F04-11_photo-album_prd.md) | [F04-11_photo-album](../units/04_club/F04-11_photo-album) | 전환 완료 | 8 | 1 |
| F04-12 | 클럽 | [F04-12_club-events-calendar_prd.md](02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | [F04-12_club-events-calendar](../units/04_club/F04-12_club-events-calendar) | 전환 완료 | 15 | 7 |
| F04-13 | 클럽 | [F04-13_fund-overview_prd.md](02_feature_prds/04_club/F04-13_fund-overview_prd.md) | [F04-13_fund-overview](../units/04_club/F04-13_fund-overview) | 전환 완료 | 1 | 2 |
| F04-14 | 클럽 | [F04-14_donation_prd.md](02_feature_prds/04_club/F04-14_donation_prd.md) | [F04-14_donation](../units/04_club/F04-14_donation) | 전환 완료 | 4 | 6 |
| F04-15 | 클럽 | [F04-15_fund-withdrawal_prd.md](02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | [F04-15_fund-withdrawal](../units/04_club/F04-15_fund-withdrawal) | 전환 완료 | 2 | 2 |
| F04-16 | 클럽 | [F04-16_subscription_prd.md](02_feature_prds/04_club/F04-16_subscription_prd.md) | [F04-16_subscription](../units/04_club/F04-16_subscription) | 전환 완료 | 5 | 8 |
| F05-01 | 검색 | [F05-01_keyword-search_prd.md](02_feature_prds/05_search/F05-01_keyword-search_prd.md) | [F05-01_keyword-search](../units/05_search/F05-01_keyword-search) | 전환 완료 | 3 | 2 |
| F05-02 | 검색 | [F05-02_autocomplete-suggest_prd.md](02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | [F05-02_autocomplete-suggest](../units/05_search/F05-02_autocomplete-suggest) | 전환 완료 | 1 | 2 |
| F05-03 | 검색 | [F05-03_search-filter_prd.md](02_feature_prds/05_search/F05-03_search-filter_prd.md) | [F05-03_search-filter](../units/05_search/F05-03_search-filter) | 전환 완료 | 2 | 2 |
| F05-04 | 검색 | [F05-04_search-history_prd.md](02_feature_prds/05_search/F05-04_search-history_prd.md) | [F05-04_search-history](../units/05_search/F05-04_search-history) | 전환 완료 | 3 | 0 |
| F05-05 | 검색 | [F05-05_saved-search_prd.md](02_feature_prds/05_search/F05-05_saved-search_prd.md) | [F05-05_saved-search](../units/05_search/F05-05_saved-search) | 전환 완료 | 5 | 4 |
| F06-01 | 결제 & 지갑 | [F06-01_wallet-main_prd.md](02_feature_prds/06_payment/F06-01_wallet-main_prd.md) | [F06-01_wallet-main](../units/06_payment/F06-01_wallet-main) | 전환 완료 | 1 | 0 |
| F06-02 | 결제 & 지갑 | [F06-02_point-charge_prd.md](02_feature_prds/06_payment/F06-02_point-charge_prd.md) | [F06-02_point-charge](../units/06_payment/F06-02_point-charge) | 전환 완료 | 5 | 0 |
| F06-03 | 결제 & 지갑 | [F06-03_transaction-history_prd.md](02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | [F06-03_transaction-history](../units/06_payment/F06-03_transaction-history) | 전환 완료 | 3 | 4 |
| F06-04 | 결제 & 지갑 | [F06-04_payment-method_prd.md](02_feature_prds/06_payment/F06-04_payment-method_prd.md) | [F06-04_payment-method](../units/06_payment/F06-04_payment-method) | 전환 완료 | 4 | 1 |
| F06-05 | 결제 & 지갑 | [F06-05_auto-charge_prd.md](02_feature_prds/06_payment/F06-05_auto-charge_prd.md) | [F06-05_auto-charge](../units/06_payment/F06-05_auto-charge) | 전환 완료 | 4 | 0 |
| F06-06 | 결제 & 지갑 | [F06-06_point-pay-refund_prd.md](02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | [F06-06_point-pay-refund](../units/06_payment/F06-06_point-pay-refund) | 전환 완료 | 3 | 21 |
| F06-07 | 결제 & 지갑 | [F06-07_hosting-ticket_prd.md](02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | [F06-07_hosting-ticket](../units/06_payment/F06-07_hosting-ticket) | 전환 완료 | 2 | 3 |
| F06-08 | 결제 & 지갑 | [F06-08_personal-subscription_prd.md](02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | [F06-08_personal-subscription](../units/06_payment/F06-08_personal-subscription) | 전환 완료 | 5 | 3 |
| F06-09 | 결제 & 지갑 | [F06-09_earnings-dashboard_prd.md](02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | [F06-09_earnings-dashboard](../units/06_payment/F06-09_earnings-dashboard) | 전환 완료 | 1 | 3 |
| F06-10 | 결제 & 지갑 | [F06-10_settlement-appeal_prd.md](02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | [F06-10_settlement-appeal](../units/06_payment/F06-10_settlement-appeal) | 전환 완료 | 5 | 4 |
| F07-01 | 모임 정산 | [F07-01_create-settlement_prd.md](02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | [F07-01_create-settlement](../units/07_meeting_settlement/F07-01_create-settlement) | 전환 완료 | 3 | 2 |
| F07-02 | 모임 정산 | [F07-02_settlement-items_prd.md](02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | [F07-02_settlement-items](../units/07_meeting_settlement/F07-02_settlement-items) | 전환 완료 | 4 | 2 |
| F07-03 | 모임 정산 | [F07-03_activate-cancel_prd.md](02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | [F07-03_activate-cancel](../units/07_meeting_settlement/F07-03_activate-cancel) | 전환 완료 | 2 | 1 |
| F07-04 | 모임 정산 | [F07-04_status-summary-receipt_prd.md](02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | [F07-04_status-summary-receipt](../units/07_meeting_settlement/F07-04_status-summary-receipt) | 전환 완료 | 3 | 2 |
| F07-05 | 모임 정산 | [F07-05_pay-share_prd.md](02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | [F07-05_pay-share](../units/07_meeting_settlement/F07-05_pay-share) | 전환 완료 | 7 | 2 |
| F07-06 | 모임 정산 | [F07-06_host-confirm-transfers_prd.md](02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | [F07-06_host-confirm-transfers](../units/07_meeting_settlement/F07-06_host-confirm-transfers) | 전환 완료 | 6 | 2 |
| F07-07 | 모임 정산 | [F07-07_remind-extend_prd.md](02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | [F07-07_remind-extend](../units/07_meeting_settlement/F07-07_remind-extend) | 전환 완료 | 3 | 3 |
| F07-08 | 모임 정산 | [F07-08_appeal-audit_prd.md](02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md) | [F07-08_appeal-audit](../units/07_meeting_settlement/F07-08_appeal-audit) | 전환 완료 | 4 | 0 |
| F07-09 | 모임 정산 | [F07-09_prepayment-refund_prd.md](02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | [F07-09_prepayment-refund](../units/07_meeting_settlement/F07-09_prepayment-refund) | 전환 완료 | 7 | 7 |
| F07-10 | 모임 정산 | [F07-10_account-history-reputation_prd.md](02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | [F07-10_account-history-reputation](../units/07_meeting_settlement/F07-10_account-history-reputation) | 전환 완료 | 0 | 3 |
| F08-01 | 플랜 마켓 | [F08-01_my-plan-list_prd.md](02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | [F08-01_my-plan-list](../units/08_plan_market/F08-01_my-plan-list) | 전환 완료 | 3 | 1 |
| F08-02 | 플랜 마켓 | [F08-02_plan-detail_prd.md](02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md) | [F08-02_plan-detail](../units/08_plan_market/F08-02_plan-detail) | 전환 완료 | 6 | 0 |
| F08-03 | 플랜 마켓 | [F08-03_block-editor_prd.md](02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | [F08-03_block-editor](../units/08_plan_market/F08-03_block-editor) | 전환 완료 | 5 | 4 |
| F08-04 | 플랜 마켓 | [F08-04_block-reorder_prd.md](02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | [F08-04_block-reorder](../units/08_plan_market/F08-04_block-reorder) | 전환 완료 | 2 | 2 |
| F08-05 | 플랜 마켓 | [F08-05_plan-publish_prd.md](02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | [F08-05_plan-publish](../units/08_plan_market/F08-05_plan-publish) | 전환 완료 | 1 | 3 |
| F08-06 | 플랜 마켓 | [F08-06_market-item-management_prd.md](02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | [F08-06_market-item-management](../units/08_plan_market/F08-06_market-item-management) | 전환 완료 | 6 | 2 |
| F08-07 | 플랜 마켓 | [F08-07_creator-profile-stats_prd.md](02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | [F08-07_creator-profile-stats](../units/08_plan_market/F08-07_creator-profile-stats) | 전환 완료 | 2 | 7 |
| F08-08 | 플랜 마켓 | [F08-08_market-main-browse_prd.md](02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | [F08-08_market-main-browse](../units/08_plan_market/F08-08_market-main-browse) | 전환 완료 | 3 | 2 |
| F08-09 | 플랜 마켓 | [F08-09_market-search_prd.md](02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | [F08-09_market-search](../units/08_plan_market/F08-09_market-search) | 전환 완료 | 1 | 4 |
| F08-10 | 플랜 마켓 | [F08-10_market-item-detail_prd.md](02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | [F08-10_market-item-detail](../units/08_plan_market/F08-10_market-item-detail) | 전환 완료 | 5 | 4 |
| F08-11 | 플랜 마켓 | [F08-11_purchase_prd.md](02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | [F08-11_purchase](../units/08_plan_market/F08-11_purchase) | 전환 완료 | 3 | 4 |
| F08-12 | 플랜 마켓 | [F08-12_my-collection_prd.md](02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | [F08-12_my-collection](../units/08_plan_market/F08-12_my-collection) | 전환 완료 | 4 | 4 |
| F08-13 | 플랜 마켓 | [F08-13_plan-event-and-review_prd.md](02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | [F08-13_plan-event-and-review](../units/08_plan_market/F08-13_plan-event-and-review) | 전환 완료 | 4 | 2 |
| F09-01 | 프라이빗 데이팅 | [F09-01_verification_prd.md](02_feature_prds/09_private_date/F09-01_verification_prd.md) | [F09-01_verification](../units/09_private_date/F09-01_verification) | 전환 완료 | 3 | 0 |
| F09-02 | 프라이빗 데이팅 | [F09-02_profile_prd.md](02_feature_prds/09_private_date/F09-02_profile_prd.md) | [F09-02_profile](../units/09_private_date/F09-02_profile) | 전환 완료 | 6 | 2 |
| F09-03 | 프라이빗 데이팅 | [F09-03_candidate_swipe_prd.md](02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | [F09-03_candidate_swipe](../units/09_private_date/F09-03_candidate_swipe) | 전환 완료 | 2 | 4 |
| F09-04 | 프라이빗 데이팅 | [F09-04_match_list_prd.md](02_feature_prds/09_private_date/F09-04_match_list_prd.md) | [F09-04_match_list](../units/09_private_date/F09-04_match_list) | 전환 완료 | 2 | 0 |
| F09-05 | 프라이빗 데이팅 | [F09-05_chat_prd.md](02_feature_prds/09_private_date/F09-05_chat_prd.md) | [F09-05_chat](../units/09_private_date/F09-05_chat) | 전환 완료 | 4 | 1 |
| F09-06 | 프라이빗 데이팅 | [F09-06_meeting_proposal_prd.md](02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | [F09-06_meeting_proposal](../units/09_private_date/F09-06_meeting_proposal) | 전환 완료 | 3 | 8 |
| F09-07 | 프라이빗 데이팅 | [F09-07_block_prd.md](02_feature_prds/09_private_date/F09-07_block_prd.md) | [F09-07_block](../units/09_private_date/F09-07_block) | 전환 완료 | 3 | 1 |
| F09-08 | 프라이빗 데이팅 | [F09-08_profile_views_prd.md](02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | [F09-08_profile_views](../units/09_private_date/F09-08_profile_views) | 전환 완료 | 1 | 3 |
| F10-01 | 캘린더 | [F10-01_unified-calendar-view_prd.md](02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | [F10-01_unified-calendar-view](../units/10_calendar/F10-01_unified-calendar-view) | 전환 완료 | 3 | 1 |
| F10-02 | 캘린더 | [F10-02_calendar-item-routing_prd.md](02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | [F10-02_calendar-item-routing](../units/10_calendar/F10-02_calendar-item-routing) | 전환 완료 | 0 | 8 |
| F10-03 | 캘린더 | [F10-03_single-availability-crud_prd.md](02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | [F10-03_single-availability-crud](../units/10_calendar/F10-03_single-availability-crud) | 전환 완료 | 5 | 3 |
| F10-04 | 캘린더 | [F10-04_recurring-availability-rule_prd.md](02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | [F10-04_recurring-availability-rule](../units/10_calendar/F10-04_recurring-availability-rule) | 전환 완료 | 5 | 8 |
| F10-05 | 캘린더 | [F10-05_other-user-availability_prd.md](02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | [F10-05_other-user-availability](../units/10_calendar/F10-05_other-user-availability) | 전환 완료 | 2 | 2 |
| F11-01 | 리뷰 & 신고 | [F11-01_event-review-write_prd.md](02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | [F11-01_event-review-write](../units/11_review_report/F11-01_event-review-write) | 전환 완료 | 1 | 0 |
| F11-02 | 리뷰 & 신고 | [F11-02_review-list_prd.md](02_feature_prds/11_review_report/F11-02_review-list_prd.md) | [F11-02_review-list](../units/11_review_report/F11-02_review-list) | 전환 완료 | 2 | 2 |
| F11-03 | 리뷰 & 신고 | [F11-03_review-edit-delete_prd.md](02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | [F11-03_review-edit-delete](../units/11_review_report/F11-03_review-edit-delete) | 전환 완료 | 2 | 3 |
| F11-04 | 리뷰 & 신고 | [F11-04_report_prd.md](02_feature_prds/11_review_report/F11-04_report_prd.md) | [F11-04_report](../units/11_review_report/F11-04_report) | 전환 완료 | 2 | 3 |
| F11-05 | 리뷰 & 신고 | [F11-05_trust-score_prd.md](02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | [F11-05_trust-score](../units/11_review_report/F11-05_trust-score) | 전환 완료 | 3 | 1 |
| F11-06 | 리뷰 & 신고 | [F11-06_taste-profile_prd.md](02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | [F11-06_taste-profile](../units/11_review_report/F11-06_taste-profile) | 전환 완료 | 5 | 1 |
| F12-01 | 알림 | [F12-01_notification-list-read_prd.md](02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | [F12-01_notification-list-read](../units/12_notification/F12-01_notification-list-read) | 전환 완료 | 5 | 4 |
| F12-02 | 알림 | [F12-02_notification-grouped-badge_prd.md](02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | [F12-02_notification-grouped-badge](../units/12_notification/F12-02_notification-grouped-badge) | 전환 완료 | 2 | 3 |
| F12-03 | 알림 | [F12-03_category-settings_prd.md](02_feature_prds/12_notification/F12-03_category-settings_prd.md) | [F12-03_category-settings](../units/12_notification/F12-03_category-settings) | 전환 완료 | 2 | 1 |
| F12-04 | 알림 | [F12-04_quiet-hours_prd.md](02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | [F12-04_quiet-hours](../units/12_notification/F12-04_quiet-hours) | 전환 완료 | 2 | 1 |
| F12-05 | 알림 | [F12-05_device-token-management_prd.md](02_feature_prds/12_notification/F12-05_device-token-management_prd.md) | [F12-05_device-token-management](../units/12_notification/F12-05_device-token-management) | 전환 완료 | 5 | 0 |
| F12-06 | 알림 | [F12-06_permission-banner_prd.md](02_feature_prds/12_notification/F12-06_permission-banner_prd.md) | [F12-06_permission-banner](../units/12_notification/F12-06_permission-banner) | 전환 완료 | 0 | 0 |
| F13-01 | 프로필 & 설정 | [F13-01_profile-hub_prd.md](02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | [F13-01_profile-hub](../units/13_profile_settings/F13-01_profile-hub) | 전환 완료 | 1 | 4 |
| F13-02 | 프로필 & 설정 | [F13-02_profile-edit_prd.md](02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | [F13-02_profile-edit](../units/13_profile_settings/F13-02_profile-edit) | 전환 완료 | 1 | 4 |
| F13-03 | 프로필 & 설정 | [F13-03_address-management_prd.md](02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | [F13-03_address-management](../units/13_profile_settings/F13-03_address-management) | 전환 완료 | 5 | 5 |
| F13-04 | 프로필 & 설정 | [F13-04_preference-tags_prd.md](02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | [F13-04_preference-tags](../units/13_profile_settings/F13-04_preference-tags) | 전환 완료 | 4 | 7 |
| F13-05 | 프로필 & 설정 | [F13-05_data-export_prd.md](02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | [F13-05_data-export](../units/13_profile_settings/F13-05_data-export) | 전환 완료 | 2 | 6 |
| F13-06 | 프로필 & 설정 | [F13-06_account-deletion_prd.md](02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | [F13-06_account-deletion](../units/13_profile_settings/F13-06_account-deletion) | 전환 완료 | 3 | 4 |
| F13-07 | 프로필 & 설정 | [F13-07_account-deactivation_prd.md](02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | [F13-07_account-deactivation](../units/13_profile_settings/F13-07_account-deactivation) | 전환 완료 | 2 | 7 |
| F14-01 | 위치 & 길찾기 | [F14-01_event-location-share_prd.md](02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | [F14-01_event-location-share](../units/14_location_directions/F14-01_event-location-share) | 전환 완료 | 3 | 2 |
| F14-02 | 위치 & 길찾기 | [F14-02_location-opt-out_prd.md](02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | [F14-02_location-opt-out](../units/14_location_directions/F14-02_location-opt-out) | 전환 완료 | 1 | 2 |
| F14-03 | 위치 & 길찾기 | [F14-03_location-extend_prd.md](02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | [F14-03_location-extend](../units/14_location_directions/F14-03_location-extend) | 전환 완료 | 1 | 3 |
| F14-04 | 위치 & 길찾기 | [F14-04_location-privacy-dashboard_prd.md](02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | [F14-04_location-privacy-dashboard](../units/14_location_directions/F14-04_location-privacy-dashboard) | 전환 완료 | 1 | 4 |
| F14-05 | 위치 & 길찾기 | [F14-05_event-directions_prd.md](02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | [F14-05_event-directions](../units/14_location_directions/F14-05_event-directions) | 전환 완료 | 2 | 2 |
| F14-06 | 위치 & 길찾기 | [F14-06_reverse-geocoding_prd.md](02_feature_prds/14_location_directions/F14-06_reverse-geocoding_prd.md) | [F14-06_reverse-geocoding](../units/14_location_directions/F14-06_reverse-geocoding) | 전환 완료 | 1 | 0 |

## 누락/확인 필요

누락된 기능 PRD는 없다.
