# F03-06. 신청서 승인/거절 (호스트) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-22; unit: business_logic/units/03_event/F03-06_application-review -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-06_application-review`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트/공동호스트가 승인 필요(`approvalRequired=true` 또는 `visibility=APPROVAL`) 이벤트의 PENDING 신청서를 승인하거나 거절한다. 현재 구현은 승인 시 자동으로 `event_attendance` 레코드를 ATTENDING 또는 WAITING으로 만들어 currentCapacity를 증가시키며 정원 초과는 비관적 잠금으로 동시성 보호된다. 승인/거절 결과는 신청자에게 FCM 푸시(`APPLICATION_APPROVED` / `APPLICATION_REJECTED`)로 fanout된다. 본 단위는 신청 처리만 다루며, 신청서 작성·취소(참가자 시점)는 F03-05에서 다룬다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 호스트 액션바 또는 더보기 ▶ "신청서 관리" ▶ `/home/events/:eventId/applications`
- 호스트 알림(F12) `NEW_APPLICATION` 푸시 ▶ 딥링크 ▶ 신청서 목록
- 마이 이벤트(F03-12) "주최 중" 카드 ▶ 상세 ▶ "신청서 관리"

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-06_application-review/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-06_application-review/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-06_application-review/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-06_application-review/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:173` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:188` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:197` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 진입: `applicationListNotifierProvider(eventId).build()` ▶ `ApplicationRepository.getApplications(eventId)` ▶ `GET /api/v1/events/{id}/applications` (List 반환)
2. 승인: `notifier.approve(appId)` ▶ `ApplicationRepository.approve(eventId, appId)` ▶ `POST .../approve` ▶ 성공 시 `invalidateSelf` (전체 목록 재조회)
3. 거절: `notifier.reject(appId)` ▶ `ApplicationRepository.reject(eventId, appId)` ▶ `POST .../reject` ▶ `invalidateSelf`
4. 사이드 효과: 승인 시 `eventDetailNotifier(eventId)` invalidate가 필요할 수 있음 (currentCapacity 갱신을 위해) — 코드에는 없으나 UX 권장
5. 일괄 처리: 선택된 IDs를 `for ... await notifier.approve` 순차 호출
6. 유료 승인제 승인 성공 시: 신청 목록, 이벤트 상세, 알림 카운트를 갱신하되 currentCapacity는 결제 전 reservation 정책에 따라 별도 표시

## 4. 서버 계약

### 개요

호스트/공동호스트가 승인 필요(`approvalRequired=true` 또는 `visibility=APPROVAL`) 이벤트의 PENDING 신청서를 승인하거나 거절한다. 현재 구현은 승인 시 자동으로 `event_attendance` 레코드를 ATTENDING 또는 WAITING으로 만들어 currentCapacity를 증가시키며 정원 초과는 비관적 잠금으로 동시성 보호된다. 승인/거절 결과는 신청자에게 FCM 푸시(`APPLICATION_APPROVED` / `APPLICATION_REJECTED`)로 fanout된다. 본 단위는 신청 처리만 다루며, 신청서 작성·취소(참가자 시점)는 F03-05에서 다룬다.

유료 승인제 이벤트에서는 현재 구현처럼 승인 즉시 ATTENDING을 만들면 안 된다. 목표 정책은 승인 후 `APPROVED_PENDING_PAYMENT` 또는 별도 결제 대기 상태를 만들고, 결제 성공 후에만 참석 확정으로 전환하는 것이다.

### 승인 시점 정원 분기 (v4.5 W1)

`ApplicationService.approveApplication`의 사전 정원 체크는 **명백한 FULL만** 차단하도록 완화되었다(`hardCapacityLimit` 도달 또는 `baseCapacity` 도달 + `!waitlistEnabled` + `!overcapacityAllowed`). 그 외 분기는 본 서비스가 호출하는 `CapacityService.createAttendanceFromApplication`이 위임받아 `CapacityPolicy.decide(event, attendingCount)` 5-룰 매트릭스를 단일 진실의 원천(single source of truth)으로 적용한다. 매트릭스 규칙은 F03-07 §3-1에 정의되어 있다.

호스트가 승인을 누른 순간의 결과:

| 조건 | 결과 |
|---|---|
| 매트릭스 R1 (`ATTENDING`) | `Application=APPROVED`, `EventAttendance=ATTENDING`, `currentCapacity++`, `change_type=APPLIED_ATTENDING` |
| 매트릭스 R2 (`OVERCAPACITY`) | `Application=APPROVED`, `EventAttendance=ATTENDING`, `currentCapacity++`, `change_type=OVERCAPACITY_APPROVED(9)` (v4.5 W1) |
| 매트릭스 R3/R4 (`WAITING`) | `Application=APPROVED`, `EventAttendance=WAITING`(waitlistOrder 부여) |
| 매트릭스 R5 (`FULL`) | `RestException(ErrorCode.CAPACITY_FULL)` 409 — 클라이언트는 정원 초과 다이얼로그 노출 후 F03-07로 안내 |

`hardCapacityLimit`을 켜둔 호스트가 한도까지 채운 뒤 추가 PENDING을 승인하려고 하면 R5로 즉시 차단되며, `overcapacityAllowed=true`인 경우에도 hardLimit 초과는 발생하지 않는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/applications | EventController#getApplications | required | 호스트가 신청서 목록 조회 |
| POST | /api/v1/events/{eventId}/applications/{applicationId}/approve | EventController#approveApplication | required | 신청 승인 + 참석 등록 |
| POST | /api/v1/events/{eventId}/applications/{applicationId}/reject | EventController#rejectApplication | required | 신청 거절 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `ApplicationStatus` (전체 7값, 갱신 2026-06-05, `ApplicationStatus.java:24-36`):

  | 값 | 의미 | 특성 |
  |---|---|---|
  | `PENDING` | 호스트 심사 대기 | active |
  | `APPROVED` | 승인 완료 (정원 점유) | active |
  | `APPROVED_PENDING_PAYMENT` | 승인됐으나 선입금 결제 대기 | active, capacity 미점유 |
  | `PAYMENT_EXPIRED` | 결제 기한 만료 | 터미널 |
  | `REJECTED` | 호스트 거절 | 터미널 |
  | `CANCELED` | 정상 취소 (L 한 개 — `CANCELLED` 아님) | 터미널 |
  | `CANCEL_PENDING_REFUND` | 계좌이체 취소 후 환불 대기 | capacity hold 유지 |

- **Enum** `AttendanceStatus`: 승인 후 자동 등록 시 `ATTENDING` 또는 `WAITING`. 정원 초과 + !waitlist면 자동 등록 실패로 트랜잭션 롤백.
- **Enum** `NotificationType` (Unit 12): `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `NEW_APPLICATION` (호스트 수신은 F03-05에서 발생)
- **`Application` 엔티티 핵심 필드**:
  - `id, eventId, userId, status, message, reviewedBy, processedAt, createdAt`
  - VO에서는 `id`로 노출되지만 클라이언트 모델은 `applicationId`로도 부를 수 있음 (서버 필드명은 `id`)
- **반환 타입**: `getApplicationsByEvent`는 **List**. CR-04 history에서 `PageResponse`로 잘못 매핑한 사례가 있어 주의.

### 거절 시 reasonCode 필수화 (갱신 2026-06-05)

`POST .../applications/{applicationId}/reject` 호출 시 `decisionParam.getReasonCode()` 가 null이면 `APPLICATION_REJECT_REASON_REQUIRED(400, 내부코드 300013)` 에러를 반환한다 (`ApplicationService.java:568-569`).

**Enum** `ApplicationRejectReasonCode` (전체 7값, `ApplicationRejectReasonCode.java:20-27`):

| 값 | 의미 |
|---|---|
| `CAPACITY_FULL` | 정원 부족 |
| `ELIGIBILITY_NOT_MET` | 참가 자격 미충족 |
| `SANCTIONED` | 제재 사용자 |
| `HOST_DISCRETION` | 호스트 재량 |
| `DUPLICATE_PROFILE` | 중복 신청자 |
| `PAYMENT_TIMEOUT` | 결제 기한 초과 (자동 거절) |
| `OTHER` | 기타 |

Flutter 측 거절 화면에서 사유 선택 UI를 제공해야 한다. 현재 미구현(F03-06 §5 프론트 계약 Gap 참조).

### 참가 결정 이력 (application_decision_log) — 신규 (갱신 2026-06-05)

> 소스: `ApplicationDecisionLog.java:29-135`, `V1__init.sql:1116-1141`.

모든 신청 상태 전이는 `application_decision_log` 테이블에 **append-only**로 기록된다. Row 수정·삭제 금지. 단일 진입점: `ApplicationService.recordDecisionLog()` (`ApplicationService.java:762-764`).

#### 테이블 핵심 컬럼

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `application_id` | bigint | |
| `event_id` | bigint | |
| `applicant_user_id` | bigint | |
| `attempt_no` | int DEFAULT 1 | 재신청 차수 (최초=1) |
| `decision_type` | varchar(20) | `ApplicationDecisionType` |
| `from_status` | varchar(30) | 전이 직전 상태 (최초 APPLY시 null) |
| `to_status` | varchar(30) | 전이 후 상태 |
| `actor_user_id` | bigint | SYSTEM=0 |
| `actor_role` | varchar(20) | APPLICANT/HOST/CO_HOST/CLUB_STAFF/SYSTEM |
| `reason_code` | varchar(40) | REJECT시 `ApplicationRejectReasonCode` |
| `reason_text` | varchar(500) | 자유 텍스트 (nullable) |
| `created_at` | datetime | @CreatedDate (append-only) |

#### ApplicationDecisionType 전체 6값 (`ApplicationDecisionType.java:21-27`)

| 값 | 기록 시점 | actorRole |
|---|---|---|
| `APPLY` | 사용자 최초 신청 | APPLICANT |
| `APPROVE` | 호스트/공동호스트 승인 | HOST/CO_HOST |
| `REJECT` | 호스트/공동호스트 거절 | HOST/CO_HOST |
| `CANCEL` | 사용자 취소 | APPLICANT |
| `REAPPLY` | 사용자 재신청 (attemptNo 증가) | APPLICANT |
| `AUTO_REJECT` | 시스템 자동 만료 (PAYMENT_EXPIRED 등) | SYSTEM |

### 승인→attendance 전환 직전 제재 재검사 (갱신 2026-06-05)

승인(`approveApplication`)은 `EventApplyRestrictionGuard`를 직접 호출하지 않는다. 대신 승인 후 `createAttendanceFromApplication`에서 `assertNotRestricted`를 재검사한다 (`CapacityService.java:380`). 즉, 호스트가 승인한 뒤 capacity 확정 직전에 참가자의 제재 상태를 다시 확인한다.

### 의존 단위 / 외부 시스템

- **F03-05** — 신청서 작성·취소(참가자 시점). 본 단위는 호스트의 처리만 다룸.
- **F03-07** — 정원 설정/대기열. 승인 시 정원 초과면 자동 WAITING 등록 또는 `CAPACITY_FULL` 롤백.
- **Unit 12 알림** — `APPLICATION_APPROVED`, `APPLICATION_REJECTED` 푸시. 템플릿 기반 (fallback 본문 포함).
- **Unit 06 결제 & 지갑** — 유료 승인제의 승인 후 결제 확정. 결제 성공 후 attendance 생성과 신청 상태 갱신이 함께 일어나야 한다.
- **Unit 04 클럽** — 클럽 이벤트면 멤버십 검증은 신청 시점(F03-05)에서 이미 통과. 호스트 권한은 본 단위에서 검증.
- **외부**: FCM (Firebase) — Unit 12 위임.

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세(F03-02) ▶ 호스트 액션바 또는 더보기 ▶ "신청서 관리" ▶ `/home/events/:eventId/applications`
- 호스트 알림(F12) `NEW_APPLICATION` 푸시 ▶ 딥링크 ▶ 신청서 목록
- 마이 이벤트(F03-12) "주최 중" 카드 ▶ 상세 ▶ "신청서 관리"

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/applications` (Routes.eventApplications) | `screens/application_list_screen.dart` | 신청서 탭 + 승인/거절 |

### 화면별 구성 요소 & 액션

### 신청서 목록 (`application_list_screen.dart`)

- **사용자가 보는 것**:
  - 4-tab `TabBar`: 전체 / 심사중(PENDING) / 승인(APPROVED) / 거절(REJECTED)
  - PENDING 탭에 빨간 점 뱃지 (대기 건수 표시)
  - `ApplicationCard` 리스트:
    - 아바타 + 닉네임 + 신청 시각
    - 신청 메시지 (`ExpandableText` 2줄 미리보기 + "더보기")
    - 상태 뱃지 (PENDING은 회색, APPROVED 초록, REJECTED 빨강, CANCELED 그레이아웃)
    - PENDING 카드: "승인" 초록 버튼 + "거절" 빨간 아웃라인 버튼
    - 처리된 카드: 버튼 숨김 + 상태 뱃지 표시
    - 유료 승인제 보강 상태: `APPROVED_PENDING_PAYMENT` 또는 결제 대기 필드가 도입되면 "승인됨 · 결제 대기" 뱃지와 결제 기한 표시
  - 일괄 선택 모드 (C-01): 우상단 "선택" 토글 → 체크박스 노출 → 일괄 승인/거절 (서버는 단건 endpoint이므로 클라에서 fan-out)
  - 빈 상태: "신청서가 없습니다"
- **사용자가 할 수 있는 액션**:
  - 진입 시: `applicationListNotifierProvider(eventId).build()` ▶ `GET /api/v1/events/{id}/applications`
  - 탭 전환: 클라이언트 필터링만 (서버는 한 번에 다 받음)
  - "승인" 탭 → `ApplicationListNotifier.approve(applicationId)` ▶ `POST .../approve` ▶ 성공 시 `ref.invalidateSelf()` + 토스트 "신청을 승인했습니다"
    - 유료 승인제 이벤트라면 성공 문구는 "승인했습니다. 참가자 결제 후 참석이 확정됩니다"로 분리
  - "거절" 탭 → `reject(applicationId)` ▶ `POST .../reject` ▶ 토스트 "신청을 거절했습니다"
  - 일괄 모드: 선택된 ID들을 순차 호출 (Promise.all 형태) → 결과 집계 토스트
  - 신청자 닉네임 탭 → 프로필 미리보기 바텀시트 (Unit 13 위임)
  - 풀투리프레시 → `ref.invalidateSelf()`
- **상태 분기**:
  - PENDING 0건 → "모든 신청을 처리했습니다" 안내 카드 (선택)
  - 모든 신청 0건 → 빈 상태 일러스트
  - 권한 없음 (`UNAUTHORIZED` 403) → `AppErrorState(title: '권한이 없습니다')` + 뒤로가기
  - 정원 가득 참 후 승인 시도 → 백엔드 `CAPACITY_FULL` (409) → 다이얼로그 "정원이 가득 찼습니다. 정원을 늘리거나 다른 참석자를 제거한 후 다시 시도해주세요" + 정원 관리 화면(F03-07)으로 이동 옵션
- **모달/시트/네비게이션**:
  - 거절 시 사유 입력 (선택) — 현재 코드는 사유 없이 거절만 가능 (서버는 reason 받지 않음). UI에서 입력받아 클라이언트 노트로만 저장하는 정책은 미정.
  - 정원 초과 다이얼로그 → F03-07로 이동

### API 호출 순서 (Provider/Repository 관점)

1. 진입: `applicationListNotifierProvider(eventId).build()` ▶ `ApplicationRepository.getApplications(eventId)` ▶ `GET /api/v1/events/{id}/applications` (List 반환)
2. 승인: `notifier.approve(appId)` ▶ `ApplicationRepository.approve(eventId, appId)` ▶ `POST .../approve` ▶ 성공 시 `invalidateSelf` (전체 목록 재조회)
3. 거절: `notifier.reject(appId)` ▶ `ApplicationRepository.reject(eventId, appId)` ▶ `POST .../reject` ▶ `invalidateSelf`
4. 사이드 효과: 승인 시 `eventDetailNotifier(eventId)` invalidate가 필요할 수 있음 (currentCapacity 갱신을 위해) — 코드에는 없으나 UX 권장
5. 일괄 처리: 선택된 IDs를 `for ... await notifier.approve` 순차 호출
6. 유료 승인제 승인 성공 시: 신청 목록, 이벤트 상세, 알림 카운트를 갱신하되 currentCapacity는 결제 전 reservation 정책에 따라 별도 표시

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **4-tab 구성**: 전체/심사중/승인/거절 — 한글 라벨, 클라이언트 필터링
- **선택 모드 (C-01) 일괄 승인/거절**: 서버는 단건 endpoint이므로 클라에서 fan-out. 결과 집계 토스트 ("3건 승인, 1건 실패")
- **상태 뱃지 색상**:
  - PENDING — 회색 (#9E9E9E) "심사 중"
  - APPROVED — 초록 (#4CAF50) "승인됨"
  - APPROVED_PENDING_PAYMENT — 파랑/강조 "결제 대기"
  - PAYMENT_EXPIRED — 회색/경고 "결제 기한 만료"
  - REJECTED — 빨강 (#F44336) "거절됨"
  - CANCELED — 그레이아웃 "취소됨" (신청자 본인이 자가 취소)
- **신청 메시지 ExpandableText**: 2줄 미리보기 + "더보기" → 전체 메시지 펼침
- **신청자 프로필 미리보기**: 닉네임 탭 → `BottomSheet` (간단 프로필 카드)
- **PENDING 빨간 점 뱃지**: 대기 신청 건수가 있을 때 탭 라벨에 dot indicator
- **정원 초과 시 다이얼로그**:
  - "정원이 가득 찼습니다."
  - "정원을 늘리거나 다른 참석자를 제거한 후 다시 시도해주세요"
  - "정원 관리" 버튼 → F03-07 (`Routes.eventCapacitySettings`)
- **거절 사유 입력**: 현재 미지원. 서버 API에 reason 필드 없음.
- **유료 승인제 일괄 승인**: 여러 명을 승인할 때 예약 가능한 정원과 결제 대기 수를 함께 계산해야 한다. 결제 전 실제 참석자로 보이면 안 된다.
- **에러 매핑**:
  - `APPLICATION_NOT_FOUND` (404) → "신청서를 찾을 수 없습니다"
  - `APPLICATION_INVALID_STATUS` (400) → "이미 처리된 신청입니다"
  - `INVALID_REQUEST` (400) → "잘못된 요청입니다"
  - `CAPACITY_FULL` (409) → 정원 초과 다이얼로그
  - `UNAUTHORIZED` (403) → "권한이 없습니다"
- **TestId** 키 (코드에 정의됨):
  - `screenEventApplicationsTabAll`, `...TabPending`, `...TabApproved`, `...TabRejected`
- **빈 상태 문구**: 탭별 다른 안내 (전체 0건 / PENDING 0건 / APPROVED 0건 등)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 단건 승인 (Happy Path) | ATTENDING 5명, baseCapacity 10, PENDING 신청 3건. | 1건 APPROVED, currentCapacity 6/10. |
| S2 | 정원 초과 시 승인 시도 | ATTENDING 10명 = baseCapacity 10, PENDING 1건, waitlistEnabled=false. | 정원 확장 후 승인 완료. |
| S3 | 정원 초과 + 대기열 활성 시 승인 → WAITING 자동 등록 | ATTENDING 12=baseCapacity, PENDING 1건, waitlistEnabled=true, 대기 1명. | 정원 확장하지 않으면 승인 불가. |
| S4 | 거절 | 호스트. | 거절 처리 + 신청자 알림. |
| S5 | 일괄 승인 (C-01) | 호스트, PENDING 5건. | 부분 처리 + 사용자 안내. |
| S6 | 이미 처리된 신청 재처리 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 권한 없는 사용자 진입 | 일반 사용자. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 자가 취소된 신청 | 신청자가 PENDING 상태에서 본인이 취소(F03-05). | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | eventId mismatch (path 변조) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 동시성 — 두 호스트가 동시 승인 | 호스트 A + 공동호스트 B. | 동시성 안전 — 정원 초과 방지. |
| S11 | 유료 승인제 신청 승인 → 결제 대기 상태로 전환 | event.price=20,000, approvalRequired=true, PENDING 신청 1건, currentCapacity=8/10. | 시드 무변동, capacity 불변, 멱등. **출처: ApplicationService.java:230-233** |

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
| 후보 | backend.md:77 | #### 유료 승인제 승인 보강 필요 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 해소 | backend.md:108 | ~~`ApplicationStatus` 4값만 열거~~ → 7값 전체 (APPROVED_PENDING_PAYMENT/PAYMENT_EXPIRED/CANCEL_PENDING_REFUND 포함) | 해소 2026-06-05 |
| 후보 | backend.md:114 | - **반환 타입**: `getApplicationsByEvent`는 **List**. CR-04 history에서 `PageResponse`로 잘못 매핑한 사례가 있어 주의. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:28 | - 유료 승인제 보강 상태: `APPROVED_PENDING_PAYMENT` 또는 결제 대기 필드가 도입되면 "승인됨 · 결제 대기" 뱃지와 결제 기한 표시 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:46 | - 거절 시 사유 입력 (선택) — 현재 코드는 사유 없이 거절만 가능 (서버는 reason 받지 않음). UI에서 입력받아 클라이언트 노트로만 저장하는 정책은 미정. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:30 | [E2E 보강: seed_event_application_lifecycle_test.dart (E2E_EXPECT_MANAGE_CONTROLS=true) — 호스트가 상세에서 "신청서 관리" CTA 진입 후 `screenEventApplications`로 들어가면 4개 탭 헤더("전체", "심사중", "승인", "거절")가 노출되고, 각 탭에서 seed pendingNickname / approvedNickname / rejectedNickname 카드가 분류되어 보이는지 검증. (탭 구현은 `screenEventApplicationsTabPending/Approved/Rejected` semantics ID로 라우팅.) seed_event_detail_role_controls_test.dart (host) — 호스트가 신청서 관리 진입 후 "전체" 탭이 기본 활성으로 노출되는지 surface 검증.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:155 | **현재 구현 갭**: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:162 | - 결제 전 사용자가 체크인 대상, 리뷰 대상, 위치공유 대상에 포함되면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:163 | - 결제 기한 만료 후 결제 API가 성공하면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 단건 승인 (Happy Path)**: Given ATTENDING 5명, baseCapacity 10, PENDING 신청 3건. When 사용자가 해당 흐름을 실행하면 Then 1건 APPROVED, currentCapacity 6/10.
- **AC-02. 정원 초과 시 승인 시도**: Given ATTENDING 10명 = baseCapacity 10, PENDING 1건, waitlistEnabled=false. When 사용자가 해당 흐름을 실행하면 Then 정원 확장 후 승인 완료.
- **AC-03. 정원 초과 + 대기열 활성 시 승인 → WAITING 자동 등록**: Given ATTENDING 12=baseCapacity, PENDING 1건, waitlistEnabled=true, 대기 1명. When 사용자가 해당 흐름을 실행하면 Then 정원 확장하지 않으면 승인 불가.
- **AC-04. 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 거절 처리 + 신청자 알림.
- **AC-05. 일괄 승인 (C-01)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 부분 처리 + 사용자 안내.
- **AC-06. 이미 처리된 신청 재처리 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 권한 없는 사용자 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 자가 취소된 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. eventId mismatch (path 변조)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 동시성 — 두 호스트가 동시 승인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 동시성 안전 — 정원 초과 방지.
- **AC-11. 유료 승인제 신청 승인 → 결제 대기 상태로 전환**: Given event.price=20,000, approvalRequired=true, PENDING 신청 1건, currentCapacity=8/10. When 사용자가 해당 흐름을 실행하면 Then 시드 무변동, capacity 불변, 멱등. **출처: ApplicationService.java:230-233**

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.

## 11. 변경 이력

- **2026-05-22 (v4.5 W1 — 정원 초과 허용)**: `approveApplication`의 사전 정원 체크를 명백한 FULL(hardLimit 도달 또는 baseCapacity 도달 + !waitlist + !overcap)만 차단하도록 완화. OVERCAPACITY 분기 결정은 `CapacityService.createAttendanceFromApplication`이 호출하는 `CapacityPolicy.decide` 매트릭스에 위임 (F03-07 §3-1). 승인 시점 결과는 §승인 시점 정원 분기 표 참조. `ChangeType.OVERCAPACITY_APPROVED(9)`로 audit log 기록.
- **2026-06-05 (D-20 / v3 — ApplicationStatus 전체 7값 + 거절 reasonCode 필수 + 결정 이력 + 제재 재검사)**: `ApplicationStatus` 7값 전체 표로 갱신 (APPROVED_PENDING_PAYMENT/PAYMENT_EXPIRED/CANCEL_PENDING_REFUND 추가). 거절 시 `reasonCode` 필수 — `APPLICATION_REJECT_REASON_REQUIRED(400, 300013)`, `ApplicationRejectReasonCode` 7값 명시 (`ApplicationRejectReasonCode.java:20-27`). `application_decision_log` append-only 이력 신규 절 — `ApplicationDecisionType` 6값, 모든 전이 로깅, 단일 진입점 `recordDecisionLog()`. 승인→attendance 직전 `CapacityService.createAttendanceFromApplication`에서 제재 재검사 명시.
