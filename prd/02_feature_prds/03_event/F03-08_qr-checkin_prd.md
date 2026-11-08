# F03-08. QR 체크인 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-29 현재 소스 갱신: 체크인은 사용자 단위뿐 아니라 attendance row 단위로 게스트를 표시해야 한다. 호스트/공동호스트가 참석자 목록과 QR 체크인 화면에서 소유자와 동반 게스트를 구분하고, 게스트 체크인·미체크인 결과는 F03-20 노쇼 집계에서 owner 기준 패널티로 이어진다.

## 1. 결론

이벤트 당일 호스트가 ATTENDING 참석자의 입장을 확인하는 기능. 호스트가 QR 토큰 + 6자리 단축 코드를 발급해 화면에 표시하면 참석자가 스캔/입력하는 방식 (Flutter 구현은 호스트→참석자 표시 방식이지만 서버 흐름상 양방향 모두 호환). 수동 체크인 (호스트가 참석자 선택)도 지원하며, 체크인 통계 (체크인율, 미체크인 명단) 조회 가능. 체크인 성공 시 `event_check_in` 행이 INSERT되고, 추후 F03-12 의 참석 로그/리뷰 노출 가능 여부에 영향.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 (`SCR-EV-002`) → "체크인" 버튼 → `/home/events/:eventId/checkin`
- 라우터 가드: `_redirectEventAccess(hostOrAttending)` — 호스트, 공동호스트, ATTENDING 참석자만 진입 허용

진입 후 단일 화면이 사용자 권한에 따라 두 모드로 분기:
- **호스트/공동호스트** → 3-탭 모드 (QR 발급 / 수동 체크인 / 통계)
- **ATTENDING 참석자** → QR 스캐너 모드 (호스트가 제시한 QR 을 스캔)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `CheckInController`, `EventCheckIn`, `CheckInService`. 앱: `qr_check_in_screen.dart`, `qr_code_view.dart`, `qr_scanner_view.dart`, `manual_check_in_list.dart`, `check_in_stats_card.dart`, `check_in_short_code_sheet.dart`.

<!-- source-references:start -->
서버 창구: `CheckInController#generateQrToken`, `CheckInController#checkIn`, `CheckInController#checkInByShortCode`, `CheckInController#batchManualCheckIn`, `CheckInController#getCheckInStats`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
- 수동 체크인은 참가 행 번호 목록의 일괄 요청이다. 옛 사용자 번호 단건 입구는 제거됐다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 본인 체크인은 OPEN 모임에서 시작 2시간 전부터 종료 직전까지다. 수동 체크인은 OPEN·CLOSED 에서 종료 후 2시간까지 사후 정정을 받는다. 시간 밖이면 `CHECK_IN_NOT_ALLOWED` 다.
- QR 과 단축 코드는 5분간 유효하다. 발급은 출석 관리 권한자가 언제든 할 수 있고, 시간창은 그 토큰을 쓰는 본인 체크인에서 본다.
- 거절 차례: 참석 상태가 아니면 `INVALID_INPUT`, 은행 환불 대기면 `CHECK_IN_NOT_ALLOWED`, 이미 체크인했으면 `CONFLICT`, 번복되지 않은 노쇼가 있으면 `CHECK_IN_NOT_ALLOWED` 다. 늦은 회원은 소명으로 다툰다.
- 수동 체크인은 여러 명을 한 번에 받는다. 이미 체크인했거나 체크인할 수 없는 사람은 건너뛰고 나머지만 처리한다.
- 체크인 방법은 `QR_CODE`, `SHORT_CODE`, `MANUAL`, `NOSHOW_OVERTURN`(번복 정정)이다. 수동·정정은 실행자와 사유 코드를 남기고 QR·단축 코드는 비운다.
- 체크인 통계에서 `CANCEL_PENDING_REFUND` 참가자는 노쇼 목록과 전체 인원 모두에서 뺀다. 환불을 기다리는 사람이 출석률을 왜곡하지 않게 한다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 만료된 QR | QR 이 만료되면 호스트 화면이 「새 QR 코드 받기」 단추를 보이고, 누를 때만 새로 받는다. 시험 보강 기록이다 | 없음 |

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
