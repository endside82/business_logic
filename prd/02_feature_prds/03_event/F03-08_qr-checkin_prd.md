# F03-08. QR 체크인 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-08_qr-checkin -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-08_qr-checkin`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 당일 호스트가 ATTENDING 참석자의 입장을 확인하는 기능. 호스트가 QR 토큰 + 6자리 단축 코드를 발급해 화면에 표시하면 참석자가 스캔/입력하는 방식 (Flutter 구현은 호스트→참석자 표시 방식이지만 서버 흐름상 양방향 모두 호환). 수동 체크인 (호스트가 참석자 선택)도 지원하며, 체크인 통계 (체크인율, 미체크인 명단) 조회 가능. 체크인 성공 시 `event_check_in` 행이 INSERT되고, 추후 F03-12 의 참석 로그/리뷰 노출 가능 여부에 영향.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 (`SCR-EV-002`) → "체크인" 버튼 → `/home/events/:eventId/checkin`
- 라우터 가드: `_redirectEventAccess(hostOrAttending)` — 호스트, 공동호스트, ATTENDING 참석자만 진입 허용

진입 후 단일 화면이 사용자 권한에 따라 두 모드로 분기:
- **호스트/공동호스트** → 3-탭 모드 (QR 발급 / 수동 체크인 / 통계)
- **ATTENDING 참석자** → QR 스캐너 모드 (호스트가 제시한 QR 을 스캔)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-08_qr-checkin/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-08_qr-checkin/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-08_qr-checkin/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-08_qr-checkin/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java:26` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java:33` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java:42` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java:51` | 확인됨 |
| `community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java:60` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### `QrCheckInScreen` — 진입 가드

- `eventDetailNotifierProvider(eventId)` watch
- 로딩 중: `Scaffold + CircularProgressIndicator`
- 에러: `AppErrorState(title: '정보를 불러오지 못했습니다', onRetry: invalidate)`
- `event.status != "OPEN"`: `AppErrorState(icon: event_busy, title: '체크인 기간이 아닙니다', description: '이벤트가 진행 중일 때만 체크인할 수 있습니다.')`
- `isManager = isHost || isCoHost || (myRole == OWNER/ADMIN)` → `_buildHostView`
- 그 외 → `_buildAttendeeView`

### 참석자 모드 (`_buildAttendeeView`)

- **사용자가 보는 것**:
  - 상단 AppBar "체크인"
  - 360 높이의 QR 스캐너 뷰포트 (`QrScannerView`) — 카메라 권한 자동 요청, 사각 가이드 오버레이
  - hint: "호스트가 제시한 체크인 QR 코드를 스캔하세요"
  - "다시 스캔" `TextButton.icon(refresh)` — `_attendeeScannerEpoch++` 로 스캐너 키 변경하여 재초기화
  - "스캔이 안 되시나요?" + "코드로 입력하기" `TextButton` — 6자리 코드 입력 BottomSheet 오픈
  - 체크인 성공 후: `QrCodeView(qrState: QrState.checkedIn)` — 체크 마크 애니메이션
- **사용자가 할 수 있는 액션**:
  - QR 스캔 자동 인식 → `_handleQrScanned(token)` → `checkInNotifier.checkInByQr(token)` → `POST /api/v1/events/{id}/check-in` body=`CheckInParam{qrToken}`
  - "코드로 입력하기" → `CheckInShortCodeSheet.show` → 6자리 입력 → `POST .../check-in/short-code` body=`CheckInShortCodeParam{code}`
  - 성공 시 `_attendeeCheckedIn = true` setState → 화면이 SuccessView 로 전환 + `AppToast.show("체크인 완료", success)` + `checkInStatsNotifier` invalidate

### 호스트 모드 (`_buildHostView`)

3개 탭의 `TabBar` + `TabBarView`:

#### 탭 1: 체크인 QR (`_buildHostQrTab`)

- **사용자가 보는 것**:
  - 초기: QR 코드 생성 안내 — "체크인 QR을 생성하세요" + ElevatedButton "QR 생성"
  - 발급 후: `QrCodeView(qrToken, expiresAt, qrState: active, hintText: "참석자가 이 QR을 스캔하면 체크인이 완료됩니다.")` + 새로고침 버튼
  - 단축 코드 영역: "코드 입력 가능" + 6자리 큰 글자 (Pretendard heading2, letter-spacing 6, primary500)
- **사용자가 할 수 있는 액션**:
  - 자동 발급: `_hostQrRequested` 플래그로 첫 진입 시 `Future.microtask(getQrToken)` 호출
  - "QR 생성" / 새로고침 → `checkInNotifier.getQrToken()` → `GET /api/v1/events/{id}/check-in/qr` → `QrTokenVo{qrToken, shortCode, expiresAt}`
- **상태 분기**: 로딩 (Spinner) / 데이터 / 에러 (재시도 TextButton)

#### 탭 2: 수동 체크인 (`_buildManualTab`)

- **데이터 소스**:
  - `attendeeListNotifierProvider(eventId)` (F03-07 의 참석자 목록 재사용)
  - `checkInStatsNotifierProvider(eventId)` 의 `noShowUserIds` 로 미체크인 표시
  - `checkedInUserIds = allUserIds - noShowUserIds.toSet()` 로 클라이언트에서 도출
- **사용자가 보는 것**: `ManualCheckInList(attendees, checkedInUserIds, onCheckIn)` — 체크박스 리스트
- **사용자가 할 수 있는 액션**:
  - 사용자 선택 후 일괄 체크인 → `_manualCheckIn(userIds)` → 각 userId 별로 `checkInNotifier.manualCheckIn(userId)` 순차 호출 → `POST /api/v1/events/{id}/check-in/{userId}`
  - 완료 시 `attendeeList` + `checkInStats` 둘 다 invalidate, 토스트 "${N}명 체크인 완료"

#### 탭 3: 통계 (`_buildStatsTab`)

- **사용자가 보는 것**: `CheckInStatsCard(stats, variant: detailed)` — 원형 프로그레스 + 총 인원/체크인/미체크인 수치 + 미체크인 목록
- **사용자가 할 수 있는 액션**: 재시도 / 자동 갱신 (탭 진입 시)
- **상태 분기**: 로딩 / 데이터 / 에러 / `stats == null` → `AppErrorState(title: '통계 정보가 없습니다')`

## 4. 서버 계약

### 개요

이벤트 당일 호스트가 ATTENDING 참석자의 입장을 확인하는 기능. 호스트가 QR 토큰 + 6자리 단축 코드를 발급해 화면에 표시하면 참석자가 스캔/입력하는 방식 (Flutter 구현은 호스트→참석자 표시 방식이지만 서버 흐름상 양방향 모두 호환). 수동 체크인 (호스트가 참석자 선택)도 지원하며, 체크인 통계 (체크인율, 미체크인 명단) 조회 가능. 체크인 성공 시 `event_check_in` 행이 INSERT되고, 추후 F03-12 의 참석 로그/리뷰 노출 가능 여부에 영향.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/check-in/qr` | `CheckInController#generateQrToken` | 호스트/공동호스트 | QR JWT + 6자리 shortCode 발급 (TTL 5분, Redis) |
| POST | `/api/v1/events/{eventId}/check-in` | `CheckInController#checkIn` | 인증 | QR 토큰 검증 + 본인 체크인 |
| POST | `/api/v1/events/{eventId}/check-in/short-code` | `CheckInController#checkInByShortCode` | 인증 | 6자리 코드로 본인 체크인 |
| POST | `/api/v1/events/{eventId}/check-in/{userId}` | `CheckInController#manualCheckIn` | 호스트/공동호스트 | 수동 체크인 (호스트가 참석자 선택) |
| GET | `/api/v1/events/{eventId}/check-in/stats` | `CheckInController#getCheckInStats` | 호스트/공동호스트 | 체크인율 + 미체크인 사용자 ID 목록 |

### 의존 단위 / 외부 시스템

- **F03-07 정원/대기열** — 체크인 대상자는 status=ATTENDING 이어야 함. 호스트가 `removeByHost` 로 강제 제거하면 `event_check_in` 행도 함께 삭제됨 (F03-07 backend 참조)
- **F03-12 참석 로그** — 미체크인(no-show) 정보가 향후 신뢰점수/리뷰 권한에 사용 (Unit 11)
- **외부**: 없음. **인프라**: Redis (notiRedisTemplate, `@Qualifier("notiRedisTemplate")`)

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 (`SCR-EV-002`) → "체크인" 버튼 → `/home/events/:eventId/checkin`
- 라우터 가드: `_redirectEventAccess(hostOrAttending)` — 호스트, 공동호스트, ATTENDING 참석자만 진입 허용

진입 후 단일 화면이 사용자 권한에 따라 두 모드로 분기:
- **호스트/공동호스트** → 3-탭 모드 (QR 발급 / 수동 체크인 / 통계)
- **ATTENDING 참석자** → QR 스캐너 모드 (호스트가 제시한 QR 을 스캔)

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/checkin` | `qr_check_in_screen.dart` | QR 발급/스캔/수동체크인/통계 통합 |

위젯:
- `widgets/qr_code_view.dart` — 호스트가 표시하는 QR + shortCode + 만료 카운트다운
- `widgets/qr_scanner_view.dart` — 참석자가 스캔하는 카메라 뷰 + 가이드 오버레이
- `widgets/manual_check_in_list.dart` — 호스트의 참석자 검색·체크박스 리스트
- `widgets/check_in_stats_card.dart` — 체크인율 원형 프로그레스 + 미체크인 목록
- `widgets/check_in_short_code_sheet.dart` — 참석자가 6자리 코드 직접 입력하는 BottomSheet

### 화면별 구성 요소 & 액션

### `QrCheckInScreen` — 진입 가드

- `eventDetailNotifierProvider(eventId)` watch
- 로딩 중: `Scaffold + CircularProgressIndicator`
- 에러: `AppErrorState(title: '정보를 불러오지 못했습니다', onRetry: invalidate)`
- `event.status != "OPEN"`: `AppErrorState(icon: event_busy, title: '체크인 기간이 아닙니다', description: '이벤트가 진행 중일 때만 체크인할 수 있습니다.')`
- `isManager = isHost || isCoHost || (myRole == OWNER/ADMIN)` → `_buildHostView`
- 그 외 → `_buildAttendeeView`

### 참석자 모드 (`_buildAttendeeView`)

- **사용자가 보는 것**:
  - 상단 AppBar "체크인"
  - 360 높이의 QR 스캐너 뷰포트 (`QrScannerView`) — 카메라 권한 자동 요청, 사각 가이드 오버레이
  - hint: "호스트가 제시한 체크인 QR 코드를 스캔하세요"
  - "다시 스캔" `TextButton.icon(refresh)` — `_attendeeScannerEpoch++` 로 스캐너 키 변경하여 재초기화
  - "스캔이 안 되시나요?" + "코드로 입력하기" `TextButton` — 6자리 코드 입력 BottomSheet 오픈
  - 체크인 성공 후: `QrCodeView(qrState: QrState.checkedIn)` — 체크 마크 애니메이션
- **사용자가 할 수 있는 액션**:
  - QR 스캔 자동 인식 → `_handleQrScanned(token)` → `checkInNotifier.checkInByQr(token)` → `POST /api/v1/events/{id}/check-in` body=`CheckInParam{qrToken}`
  - "코드로 입력하기" → `CheckInShortCodeSheet.show` → 6자리 입력 → `POST .../check-in/short-code` body=`CheckInShortCodeParam{code}`
  - 성공 시 `_attendeeCheckedIn = true` setState → 화면이 SuccessView 로 전환 + `AppToast.show("체크인 완료", success)` + `checkInStatsNotifier` invalidate

### 호스트 모드 (`_buildHostView`)

3개 탭의 `TabBar` + `TabBarView`:

#### 탭 1: 체크인 QR (`_buildHostQrTab`)

- **사용자가 보는 것**:
  - 초기: QR 코드 생성 안내 — "체크인 QR을 생성하세요" + ElevatedButton "QR 생성"
  - 발급 후: `QrCodeView(qrToken, expiresAt, qrState: active, hintText: "참석자가 이 QR을 스캔하면 체크인이 완료됩니다.")` + 새로고침 버튼
  - 단축 코드 영역: "코드 입력 가능" + 6자리 큰 글자 (Pretendard heading2, letter-spacing 6, primary500)
- **사용자가 할 수 있는 액션**:
  - 자동 발급: `_hostQrRequested` 플래그로 첫 진입 시 `Future.microtask(getQrToken)` 호출
  - "QR 생성" / 새로고침 → `checkInNotifier.getQrToken()` → `GET /api/v1/events/{id}/check-in/qr` → `QrTokenVo{qrToken, shortCode, expiresAt}`
- **상태 분기**: 로딩 (Spinner) / 데이터 / 에러 (재시도 TextButton)

#### 탭 2: 수동 체크인 (`_buildManualTab`)

- **데이터 소스**:
  - `attendeeListNotifierProvider(eventId)` (F03-07 의 참석자 목록 재사용)
  - `checkInStatsNotifierProvider(eventId)` 의 `noShowUserIds` 로 미체크인 표시
  - `checkedInUserIds = allUserIds - noShowUserIds.toSet()` 로 클라이언트에서 도출
- **사용자가 보는 것**: `ManualCheckInList(attendees, checkedInUserIds, onCheckIn)` — 체크박스 리스트
- **사용자가 할 수 있는 액션**:
  - 사용자 선택 후 일괄 체크인 → `_manualCheckIn(userIds)` → 각 userId 별로 `checkInNotifier.manualCheckIn(userId)` 순차 호출 → `POST /api/v1/events/{id}/check-in/{userId}`
  - 완료 시 `attendeeList` + `checkInStats` 둘 다 invalidate, 토스트 "${N}명 체크인 완료"

#### 탭 3: 통계 (`_buildStatsTab`)

- **사용자가 보는 것**: `CheckInStatsCard(stats, variant: detailed)` — 원형 프로그레스 + 총 인원/체크인/미체크인 수치 + 미체크인 목록
- **사용자가 할 수 있는 액션**: 재시도 / 자동 갱신 (탭 진입 시)
- **상태 분기**: 로딩 / 데이터 / 에러 / `stats == null` → `AppErrorState(title: '통계 정보가 없습니다')`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 호스트가 QR 발급 → 참석자가 스캔으로 체크인 (Happy path) | 모임 시작 10분 전, event.status=OPEN, 12명 ATTENDING | event_check_in 1행, 호스트는 통계 갱신 시 확인 가능 |
| S2 | 참석자가 QR 스캔 안 됨 → 6자리 코드로 fallback | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 호스트가 수동 체크인 (스캔 불가 참석자) | 폰 배터리 방전된 참석자 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 호스트가 통계 확인 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 시간 외 체크인 시도 → 차단 | 모임 종료 후 3시간 경과 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 비참석자가 QR 스캔 → 거부 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 중복 체크인 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 호스트가 새 QR 발급 → 이전 단축코드 즉시 무효화 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | JWT 만료된 QR 사용 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | scenarios.md:103 | [E2E 보강: seed_event_attendance_state_test.dart::event_qr_expired_refresh_surface — `QrTokenVo.expiresAt` 가 과거인 상태로 호스트가 `screenEventCheckin` 진입 시 "새 QR 코드 받기" 텍스트 + `screenEventCheckinQrRefresh` semantics 버튼이 함께 노출되어 새 토큰 발급 진입점 보장. 만료 표시는 화면 분기 — 자동으로 새로 발급하지 않고 명시적 사용자 액션 필요.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 호스트가 QR 발급 → 참석자가 스캔으로 체크인 (Happy path)**: Given 모임 시작 10분 전, event.status=OPEN, 12명 ATTENDING When 사용자가 해당 흐름을 실행하면 Then event_check_in 1행, 호스트는 통계 갱신 시 확인 가능
- **AC-02. 참석자가 QR 스캔 안 됨 → 6자리 코드로 fallback**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 호스트가 수동 체크인 (스캔 불가 참석자)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 호스트가 통계 확인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 시간 외 체크인 시도 → 차단**: Given 모임 종료 후 3시간 경과 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 비참석자가 QR 스캔 → 거부**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 중복 체크인 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 호스트가 새 QR 발급 → 이전 단축코드 즉시 무효화**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. JWT 만료된 QR 사용**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
