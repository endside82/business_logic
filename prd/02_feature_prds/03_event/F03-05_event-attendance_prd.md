# F03-05. 이벤트 신청 & 참석 (참가자) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-05_event-attendance -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-05_event-attendance`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

참가자가 OPEN 이벤트에 참석/대기열 등록/취소하거나, 승인 필요(`approvalRequired` 또는 `visibility=APPROVAL`) 이벤트에 신청서를 제출한다. 두 경로(`capacity` / `apply`)가 있고 `EventAttendance` (참석 row)와 `Application` (신청 row)는 분리되어 저장된다. 정원 초과 + 대기열 활성 시 `WAITING` 상태로 들어가고 호스트가 ATTENDING을 취소하면 `WaitlistService`가 다음 대기자를 자동 승급시킨다. 본 단위는 참가자의 직접 액션만 다룬다 (호스트의 승인/거절은 F03-06, 정원 설정은 F03-07).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 하단 액션바 "참석 신청" / "대기열 등록" / "참석 취소"
- 마이 이벤트(F03-12) "참석 예정" 카드 ▶ 상세 진입 후 액션바
- 알림(F12) 승인/거절/자동 승급 푸시 ▶ 상세

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-05_event-attendance/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-05_event-attendance/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-05_event-attendance/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-05_event-attendance/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:107` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:32` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java:40` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:156` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:165` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java:181` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 액션바 상태: `eventDetailNotifierProvider(eventId).valueOrNull?.myAttendanceStatus` 기반 분기
2. 결제 필요 여부: `event.price > 0 && event.prepaymentRequired` (UI 결정)
3. 일반 신청 (승인 불필요):
   - `AttendanceActionNotifier.attend()` ▶ `_directAttend`
   - `AttendanceRepository.attend(eventId)` ▶ `POST /api/v1/events/{id}/capacity`
   - 응답 200/201 → `eventDetailNotifierProvider.invalidate()` (currentCapacity 갱신, viewer status 갱신)
4. 신청서 (승인 필요):
   - `AttendanceActionNotifier._apply()`
   - `ApplicationRepository.apply(eventId, ApplicationParam)` ▶ `POST /api/v1/events/{id}/apply`
   - 응답 → status=PENDING으로 표기, viewer 갱신
5. 유료 + 승인제:
   - 신청 시점에는 결제 API를 호출하지 않는다.
   - 호스트 승인 후 사용자는 `approvedApplication` 또는 `approvedPendingPayment` 상태를 보고 결제 CTA를 누른다.
   - 결제 성공 후에만 `event_attendance=ATTENDING`으로 확정되어 체크인/위치/리뷰 자격이 열린다.
   - 현재 코드에는 `APPROVED_PENDING_PAYMENT` 또는 결제 대기 전용 필드가 없으므로 구현 보강이 필요하다.
6. 취소:
   - approvalRequired → `ApplicationRepository.cancelApplication` ▶ `DELETE .../apply`
   - 일반 → `AttendanceRepository.cancel` ▶ `DELETE .../capacity`
   - `eventDetailNotifierProvider.invalidate()`
7. 내 신청 목록(F03-12 위임): `myApplicationsProvider` ▶ `GET /api/v1/events/users/me/applications` (List 반환, Page 아님!)

## 4. 서버 계약

### 개요

참가자가 OPEN 이벤트에 참석/대기열 등록/취소하거나, 승인 필요(`approvalRequired` 또는 `visibility=APPROVAL`) 이벤트에 신청서를 제출한다. 두 경로(`capacity` / `apply`)가 있고 `EventAttendance` (참석 row)와 `Application` (신청 row)는 분리되어 저장된다. 정원 초과 + 대기열 활성 시 `WAITING` 상태로 들어가고 호스트가 ATTENDING을 취소하면 `WaitlistService`가 다음 대기자를 자동 승급시킨다. 본 단위는 참가자의 직접 액션만 다룬다 (호스트의 승인/거절은 F03-06, 정원 설정은 F03-07).

### 유료 + 승인제 조합 정책

유료 이벤트(`event.price > 0`)와 승인제(`approvalRequired=true` 또는 `visibility=APPROVAL`)는 제품상 동시에 허용해야 한다. 단, 신청 시점 결제는 금지한다. 권장 상태 흐름은 다음과 같다.

1. 참가자 신청: `POST /apply` → `Application=PENDING`, 결제 없음.
2. 호스트 승인: `Application=APPROVED_PENDING_PAYMENT` 또는 별도 payment hold 상태로 전환하고 결제 요청 알림 발송.
3. 참가자 결제: `POST /wallet/pay` 성공 후 `EventAttendance=ATTENDING`, `currentCapacity++`, 체크인/위치/리뷰 자격 오픈.
4. 호스트 거절: `Application=REJECTED`, 결제 없음, 환불 없음.
5. 결제 기한 만료/사용자 취소: 결제 대기 상태 해제, 예약 정원 반환, 재신청 가능 여부 표시.

현재 서버 코드는 이 목표 흐름을 완성하지 못한다. `ApplicationService.approveApplication`은 승인 즉시 `capacityService.createAttendanceFromApplication`을 호출해 ATTENDING을 만든다. `WalletService.pay`는 가격과 중복 결제만 검증하고 신청/승인 상태를 확인하지 않는다. 따라서 유료 승인제는 문서상 정책과 구현 보강 대상이 함께 추적되어야 한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/capacity | CapacityController#attend | required | 즉시 참석 등록 (또는 대기열) |
| POST | /api/v1/events/{eventId}/attend | AttendanceController#attend | required | 위와 동일 (플랜 호환 경로) |
| DELETE | /api/v1/events/{eventId}/capacity | CapacityController#cancel | required | 참석/대기 취소 |
| DELETE | /api/v1/events/{eventId}/attend | AttendanceController#cancel | required | 위와 동일 |
| GET | /api/v1/events/{eventId}/capacity/me | CapacityController#getMyAttendance | required | 내 참석 상태 조회 |
| GET | /api/v1/events/{eventId}/attendance/me | AttendanceController#getMyAttendance | required | 위와 동일 |
| POST | /api/v1/events/{eventId}/apply | EventController#applyToEvent | required | 신청서 제출 (승인 필요 이벤트) |
| DELETE | /api/v1/events/{eventId}/apply | EventController#cancelApplication | required | 신청 취소 |
| GET | /api/v1/events/users/me/applications | EventController#getMyApplications | required | 내 신청 목록 |

> Capacity / Attendance 경로는 동일한 `CapacityService`를 호출하는 alias. 클라이언트는 Capacity 경로를 사용한다.

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `AttendanceStatus`: `ATTENDING(0)`, `WAITING(1)`, `CANCELLED(2)`, `REJECTED(3)`
  - 클라이언트 enum 생성 시 서버 그대로 사용 (`WAITLISTED`가 아닌 `WAITING`임에 주의)
- **Enum** `ApplicationStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELED` (한 글자 L 빠짐 — `CANCELLED`가 아님)
- **Enum** `ChangeType` (event_attendance_log): `APPLIED_ATTENDING`, `APPLIED_WAITING`, `CANCELLED_BY_USER`, `REMOVED_BY_HOST`, `PROMOTED_AUTO`, `PROMOTED_MANUAL`, ... (전체 목록은 `capacity/constants/ChangeType.java` 참조)
- **Enum** `EventVisibility`: `APPROVAL`이면 신청서 필요
- 도메인 객체:
  - `Event#approvalRequired: boolean`
  - `Event#waitlistEnabled: boolean`
  - `Event#maxWaitlist: int` (0이면 baseCapacity * 2)
  - `Event#currentCapacity: int`
  - `EventAttendance` 필드: `id, eventId, userId, status, waitlistOrder, promotedFromWaitlist, manuallyPromoted, createdAt`

### 의존 단위 / 외부 시스템

- **Unit 06 결제 & 지갑** — 유료 이벤트 참가비/사전결제 차감은 `WalletService` 위임. 본 엔드포인트는 결제 처리를 하지 않음. 승인 불필요 유료 이벤트는 신청/참석 전 결제 확인 다이얼로그 후 별도 API 호출이 필요하고, 승인제 유료 이벤트는 승인 후 결제 확정 흐름을 사용해야 한다. 자가 취소 시 환불 정책은 `event_prepayment.refundPolicyType`에 따라 Unit 06에서 결정.
- **유료 승인제 주의** — 승인제 이벤트에서는 신청 전 결제가 아니라 승인 후 결제 확정이 되어야 한다. 현재 `ApplicationStatus`에는 결제 대기 상태가 없고 `WalletService.pay`도 신청 상태를 검증하지 않으므로, `APPROVED_PENDING_PAYMENT`/결제기한/정원 예약 중 하나의 서버 source-of-truth를 추가해야 한다.
- **Unit 07 모임 정산** — 사전결제 항목은 정산 흐름과 연결 (참가자 신청 시점에 settlement_item 등록).
- **Unit 12 알림** — `NEW_APPLICATION` (호스트), `APPLICATION_APPROVED/REJECTED` (참가자, F03-06), 자동 승급 알림 (`WaitlistService` 발송).
- **Unit 04 클럽** — `clubMemberRepository.existsByClubIdAndUserId` 멤버십 검증.
- **Redis** — `TrendingService.recordRegistration` (인기순 정렬용 카운트).
- **외부**: FCM (Unit 12 위임).

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세(F03-02) ▶ 하단 액션바 "참석 신청" / "대기열 등록" / "참석 취소"
- 마이 이벤트(F03-12) "참석 예정" 카드 ▶ 상세 진입 후 액션바
- 알림(F12) 승인/거절/자동 승급 푸시 ▶ 상세

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/event/) | 역할 |
|---|---|---|
| `/home/events/:eventId` | `screens/event_detail_screen.dart` | 액션바 + 신청 시트 진입점 |
| (모달) | `widgets/attendance_apply_sheet.dart` | 참석 신청 시트 |
| (모달) | `widgets/event_apply_confirm_sheet.dart` | 결제 확인 시트 (유료 이벤트) |
| (모달) | `widgets/cancel_attendance_sheet.dart` | 참석 취소 시트 |
| `/home/my-events` | `screens/my_events_screen.dart` (F03-12) | 내 신청/참석 목록 |

본 단위는 화면 파일이 거의 없고 액션바 + 모달 시트로 구성된다.

### 화면별 구성 요소 & 액션

### 액션바 (`event_action_bar.dart`)

- **사용자가 보는 것**:
  - viewer 상태에 따라 버튼 라벨/색상 변경:
    - null + OPEN + 정원 미달 → "참석 신청" (primary500)
    - null + OPEN + 정원 초과 + waitlistEnabled → "대기열 등록" (warning500)
    - null + OPEN + 정원 초과 + !waitlistEnabled → "마감" disabled
    - null + approvalRequired → "신청서 작성"
    - ATTENDING → "참석 취소" (gray-outlined)
    - WAITING → "대기 취소 (N번째)"
    - PENDING → "심사 중" disabled + "신청 취소"
    - APPROVED → "참석 확정" (회색 disabled, 취소는 가능)
    - REJECTED/CANCELED → "다시 신청"
- **사용자가 할 수 있는 액션**:
  - "참석 신청" 탭 → `AttendanceActionNotifier.attend()`:
    1. `event.approvalRequired || visibility == APPROVAL` 체크
    2. true → `_apply` (신청서 시트 + `POST .../apply`)
    3. false → `_directAttend` (`POST .../capacity`)
  - 유료 + 승인 불필요 이벤트 → `EventApplyConfirmSheet` (결제 확인 시트, Unit 06 위임) 선행 후 직접 참석
  - 유료 + 승인제 이벤트 → 결제 선행 금지. 먼저 신청서를 제출하고, 호스트 승인 후 "결제하고 참석 확정" CTA로 전환
  - "참석 취소" 탭 → `CancelAttendanceSheet` 확인 → `AttendanceActionNotifier.cancel()`
  - 비로그인 → 로그인 화면 redirect

### 신청 시트 (`attendance_apply_sheet.dart`)

- 신청 메시지 입력 (`AppTextArea`, optional)
- 본인 정보 표시 (자동입력)
- "제출" 탭 → `ApplicationParam(message: ...)` ▶ `POST .../apply` ▶ status=PENDING
- 성공 → 토스트 "신청이 접수되었습니다. 호스트 승인을 기다려주세요" + 시트 dismiss + 액션바 갱신

### 결제/신청 확인 시트 (`event_apply_confirm_sheet.dart`)

- 가격, 환불 정책 미리보기, 잔액 표시
- 승인 불필요 유료 이벤트: "결제 후 신청" → Wallet 차감 (Unit 06) → 참석 확정
- 승인제 유료 이벤트: "신청하기" → 결제 없이 `Application=PENDING` 생성. 승인 전 결제받지 않음
- 승인제 유료 이벤트에서 승인 알림을 받은 뒤: "결제하고 참석 확정" → Wallet 차감 → 참석 확정
- 잔액 부족 → 충전 화면(Unit 06)으로 이동 (PaymentShortfall)

### 취소 시트 (`cancel_attendance_sheet.dart`)

- 환불 정책 안내 (유료 이벤트의 경우)
- "취소 확인" → `DELETE .../capacity` 또는 `DELETE .../apply`
- 환불 실제 처리는 서버의 `event_prepayment.refundPolicyType` 기반 (Unit 06 위임)

### API 호출 순서 (Provider/Repository 관점)

1. 액션바 상태: `eventDetailNotifierProvider(eventId).valueOrNull?.myAttendanceStatus` 기반 분기
2. 결제 필요 여부: `event.price > 0 && event.prepaymentRequired` (UI 결정)
3. 일반 신청 (승인 불필요):
   - `AttendanceActionNotifier.attend()` ▶ `_directAttend`
   - `AttendanceRepository.attend(eventId)` ▶ `POST /api/v1/events/{id}/capacity`
   - 응답 200/201 → `eventDetailNotifierProvider.invalidate()` (currentCapacity 갱신, viewer status 갱신)
4. 신청서 (승인 필요):
   - `AttendanceActionNotifier._apply()`
   - `ApplicationRepository.apply(eventId, ApplicationParam)` ▶ `POST /api/v1/events/{id}/apply`
   - 응답 → status=PENDING으로 표기, viewer 갱신
5. 유료 + 승인제:
   - 신청 시점에는 결제 API를 호출하지 않는다.
   - 호스트 승인 후 사용자는 `approvedApplication` 또는 `approvedPendingPayment` 상태를 보고 결제 CTA를 누른다.
   - 결제 성공 후에만 `event_attendance=ATTENDING`으로 확정되어 체크인/위치/리뷰 자격이 열린다.
   - 현재 코드에는 `APPROVED_PENDING_PAYMENT` 또는 결제 대기 전용 필드가 없으므로 구현 보강이 필요하다.
6. 취소:
   - approvalRequired → `ApplicationRepository.cancelApplication` ▶ `DELETE .../apply`
   - 일반 → `AttendanceRepository.cancel` ▶ `DELETE .../capacity`
   - `eventDetailNotifierProvider.invalidate()`
7. 내 신청 목록(F03-12 위임): `myApplicationsProvider` ▶ `GET /api/v1/events/users/me/applications` (List 반환, Page 아님!)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **버튼 라벨 한글**: "참석 신청" / "대기열 등록" / "신청서 작성" / "심사 중" / "참석 취소" / "대기 취소 (N번째)"
- **viewer 상태 → UI 매핑** (`event_viewer_status.dart` enum, 클라이언트 정의):
  - `attending`, `waitlisted`, `pendingApplication`, `approvedApplication`, `rejectedApplication`, `notAttending`
  - 서버 `myAttendanceStatus`/`myApplicationStatus` 두 필드를 합쳐 결정
- **유료 이벤트 결제 확인 시트**: 결제 흐름은 Unit 06 위임이지만, "신청 전 결제 확인" 다이얼로그 노출 정책은 화면 결정
- **취소 환불 정책 표시**: `event.prepaymentRefundPolicyType`/`refundDeadlineHours`에 따른 안내 문구
- **자동 승급 강조**: `event.myPromotedFromWaitlist == true && !promotedSeenProvider.contains(eventId)` 조건에서 1회성 강조 표시 → dismiss 후 `promotedSeenProvider.add(eventId)`
- **에러 메시지 매핑**:
  - `EVENT_CANNOT_APPLY` → "신청할 수 없는 모임입니다"
  - `EVENT_ALREADY_CLOSED` → "모집이 마감되었습니다"
  - `CAPACITY_FULL` → "정원이 가득 찼습니다"
  - `WAITLIST_FULL` → "대기열이 가득 찼습니다"
  - `ALREADY_ATTENDING` → "이미 신청한 모임입니다"
  - `APPROVAL_REQUIRED` → "이 모임은 호스트 승인이 필요합니다"
  - `CLUB_MEMBERSHIP_REQUIRED` → "클럽 멤버만 참석할 수 있습니다" + 클럽 가입 CTA
  - `APPLICATION_ALREADY_EXISTS` → "이미 신청한 모임입니다"
  - `PaymentShortfall` (Unit 06) → "잔액이 부족합니다" + 충전 CTA
- **신청 메시지 글자수**: 서버 제한 미확인 (DB column 길이 기준, 화면에서 500자 권장)
- **AttendanceStatus enum 매핑** (서버 그대로): `ATTENDING`, `WAITING`, `CANCELLED`, `REJECTED` — `WAITLISTED` 아님!
- **ApplicationStatus enum 매핑**: `PENDING`, `APPROVED`, `REJECTED`, `CANCELED` (L 한 개)
- **결제 확인 시트 디자인**: 잔액·금액·환불 정책을 한 화면에 표시
- **취소 확인 시트**: "정말 취소하시겠습니까?" + 환불 안내
- **`EventViewerBadge`**: 카드/상세에 viewer 상태 라벨 (참석 중/대기 N번째/심사 중)
- **유료 승인제 상태 라벨**: 승인 전 "심사 중", 승인 후 결제 전 "결제 필요", 결제 후 "참석 확정"을 구분해야 한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 무료 + 승인 불필요 + 정원 여유 (Happy Path) | 로그인됨, 이벤트 status=OPEN, currentCapacity=8/12, approvalRequired=false. | 사용자 ATTENDING, 호스트에게 알림 없음 (자동 신청은 알림 트리거 없음 — 코드 확인 결과 NEW_APPLICATION은 apply 경로에서만 발생). |
| S2 | 정원 초과 + 대기열 등록 | status=OPEN, currentCapacity=12/12, waitlistEnabled=true, 대기열 2명. | 사용자 WAITING. |
| S3 | 자동 승급 (다른 사용자 취소 시) | S2의 사용자, 대기 3번째. | 순번 갱신. |
| S4 | 자동 승급된 사용자가 ATTENDING으로 전환 | 1번째 대기자. | 정상 ATTENDING. |
| S5 | 승인 필요 이벤트 신청 → 호스트 승인 | status=OPEN, approvalRequired=true. | ATTENDING. |
| S6 | 자가 취소 (ATTENDING) | 참석 확정 사용자. | 사용자 CANCELLED, 다음 대기자 ATTENDING. |
| S7 | 호스트 본인이 신청 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 클럽 비멤버가 클럽 이벤트 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 중복 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 정원 + 대기열 모두 가득 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S11 | 유료 이벤트 신청 시 잔액 부족 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S12 | 모집 마감(`isClosed=true`) 후 신청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S13 | 유료 + 승인제 이벤트 신청 → 승인 후 결제 필요 | 로그인됨, 이벤트 status=OPEN, price=20,000, approvalRequired=true 또는 visibility=APPROVAL, currentCapacity=8/10. | 결제 성공 전까지 정식 참석자가 아니며, 결제 성공 후에만 참석 확정. |

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
| 후보 | backend.md:17 | 현재 서버 코드는 이 목표 흐름을 완성하지 못한다. `ApplicationService.approveApplication`은 승인 즉시 `capacityService.createAttendanceFromApplication`을 호출해 ATTENDING을 만든다. `WalletService.pay`는 가격과 중복 결제만 검증하고 신청/승인 상태를 확인하지 않는다. 따라서 유료 승인제는 문서상 정책과 구현 보강 대상이 함께 추적되어야 한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:85 | - **체크인 기록 삭제**: `eventCheckInRepository.deleteByEventIdAndUserId` (MEDIUM #10) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:87 | - 이벤트가 CLOSED/CANCELED면 대기열 승급 스킵 (MEDIUM #9) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:117 | - `event.isClosed()` → `EVENT_ALREADY_CLOSED` (HIGH #6) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:121 | - 승인 필요 결정 (HIGH #7): `event.approvalRequired \|\| visibility == APPROVAL` → 초기 status=PENDING. 아니면 자동 APPROVED + `capacityService.createAttendanceFromApplication` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:122 | - 재신청 처리 (HIGH #8): 기존 row가 PENDING/APPROVED면 `APPLICATION_ALREADY_EXISTS`. CANCELED/REJECTED면 status 재설정해서 재사용. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:153 | - 클라이언트 enum 생성 시 서버 그대로 사용 (`WAITLISTED`가 아닌 `WAITING`임에 주의) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:167 | - **유료 승인제 주의** — 승인제 이벤트에서는 신청 전 결제가 아니라 승인 후 결제 확정이 되어야 한다. 현재 `ApplicationStatus`에는 결제 대기 상태가 없고 `WalletService.pay`도 신청 상태를 검증하지 않으므로, `APPROVED_PENDING_PAYMENT`/결제기한/정원 예약 중 하나의 서버 source-of-truth를 추가해야 한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:83 | - 현재 코드에는 `APPROVED_PENDING_PAYMENT` 또는 결제 대기 전용 필드가 없으므로 구현 보강이 필요하다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:109 | - **신청 메시지 글자수**: 서버 제한 미확인 (DB column 길이 기준, 화면에서 500자 권장) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:39 | [E2E 보강: seed_event_list_badge_matrix_test.dart::waitlist_detail_cancel_surface — 본인이 WAITING 인 클럽 이벤트 상세 진입 시 액션바/배지 영역에 "현재 대기열에 등록되어 있습니다" + "클럽 가입 후 참석 가능"(클럽 멤버십 게이트 안내, S8 cross-ref) 라벨이 동시 노출됨. 즉 waitlist 상태와 클럽 가드는 시각적으로 결합되어 표시.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:119 | [E2E 보강 (cross-ref S2): seed_event_list_badge_matrix_test.dart::waitlist_detail_cancel_surface — 클럽 이벤트 상세에서 "클럽 가입 후 참석 가능" 라벨 노출. WAITING 상태와 동시 노출 가능.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:177 | **현재 구현 갭**: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:184 | - 승인 전 결제 거래가 생성되면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:185 | - 거절된 신청자에게 결제 CTA가 노출되면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:186 | - 승인 후 결제 전 사용자가 체크인/리뷰/위치공유 대상자로 보이면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:122 | Apply --> P1[⚪ INSERT applications PENDING] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:123 | P1 --> P2[🟠 FCM → 호스트/coHost] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:124 | P2 --> Hold[🔵 심사 중 표시<br/>승인 후 결제 CTA 대기] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:142 | class P1,F1,F2 storage | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:143 | class P2 external | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 무료 + 승인 불필요 + 정원 여유 (Happy Path)**: Given 로그인됨, 이벤트 status=OPEN, currentCapacity=8/12, approvalRequired=false. When 사용자가 해당 흐름을 실행하면 Then 사용자 ATTENDING, 호스트에게 알림 없음 (자동 신청은 알림 트리거 없음 — 코드 확인 결과 NEW_APPLICATION은 apply 경로에서만 발생).
- **AC-02. 정원 초과 + 대기열 등록**: Given status=OPEN, currentCapacity=12/12, waitlistEnabled=true, 대기열 2명. When 사용자가 해당 흐름을 실행하면 Then 사용자 WAITING.
- **AC-03. 자동 승급 (다른 사용자 취소 시)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 순번 갱신.
- **AC-04. 자동 승급된 사용자가 ATTENDING으로 전환**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 ATTENDING.
- **AC-05. 승인 필요 이벤트 신청 → 호스트 승인**: Given status=OPEN, approvalRequired=true. When 사용자가 해당 흐름을 실행하면 Then ATTENDING.
- **AC-06. 자가 취소 (ATTENDING)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 CANCELLED, 다음 대기자 ATTENDING.
- **AC-07. 호스트 본인이 신청 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 클럽 비멤버가 클럽 이벤트 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 중복 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 정원 + 대기열 모두 가득**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-11. 유료 이벤트 신청 시 잔액 부족**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-12. 모집 마감(`isClosed=true`) 후 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-13. 유료 + 승인제 이벤트 신청 → 승인 후 결제 필요**: Given 로그인됨, 이벤트 status=OPEN, price=20,000, approvalRequired=true 또는 visibility=APPROVAL, currentCapacity=8/10. When 사용자가 해당 흐름을 실행하면 Then 결제 성공 전까지 정식 참석자가 아니며, 결제 성공 후에만 참석 확정.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
