# F07-04. 정산 현황 / 요약 / 영수증 (Status & Summary & Receipt) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-04_status-summary-receipt -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-04_status-summary-receipt`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

정산 본체 조회, 정산 요약(참가자별 net 포지션 + transfer 리스트), 항목 영수증의 settlement-scope presigned 다운로드 URL 발급. 호스트와 참가자(ATTENDING) 모두 접근 가능. 모든 상태(DRAFT/ACTIVE/COMPLETED/CANCELLED)에서 호출된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 → "모임 정산" 탭/카드 → 정산 존재 시 status 화면
- 정산 활성화 알림 푸시 → 딥링크 → status 화면
- 정산 완료/취소 알림 → 딥링크 → status 화면
- 본인 정산 이력 화면(F07-10) → 카드 탭 → status 화면

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-04_status-summary-receipt/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-04_status-summary-receipt/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-04_status-summary-receipt/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-04_status-summary-receipt/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:131` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:69` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:89` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

status 화면 진입 시:
1. `settlementDetailProvider(eventId)` ▶ `MeetingSettlementRepository.getSettlement` ▶ `GET /api/v1/events/:id/settlement`
2. `settlementSummaryProvider(eventId)` ▶ `GET /api/v1/events/:id/settlement/summary`
3. `eventDetailNotifierProvider(eventId)` ▶ host/staff 권한 판정 (myRole)
4. `authNotifierProvider` ▶ currentUserId 확보
5. (manager + ACTIVE) `appealsProvider(eventId)` ▶ PENDING appeal 카운트로 차단 UI 표시 가능
6. (manager) `auditLogProvider(eventId)` ▶ 감사 로그 진입 시

영수증 뷰어 진입 시:
1. `meetingSettlementRepository.getReceiptDownloadUrl(eventId, fileId)` ▶ `GET .../receipts/{fileId}/download-url`
2. 응답 `PresignedUrlVo.downloadUrl` 받아 `CachedNetworkImage`에 전달

## 4. 서버 계약

### 개요

정산 본체 조회, 정산 요약(참가자별 net 포지션 + transfer 리스트), 항목 영수증의 settlement-scope presigned 다운로드 URL 발급. 호스트와 참가자(ATTENDING) 모두 접근 가능. 모든 상태(DRAFT/ACTIVE/COMPLETED/CANCELLED)에서 호출된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/settlement | MeetingSettlementController#getSettlement | required | 정산 본체 단건 조회 |
| GET | /api/v1/events/{eventId}/settlement/summary | MeetingSettlementController#getSettlementSummary | required | 요약(net 포지션 + transfers + 참가자 정보) |
| GET | /api/v1/events/{eventId}/settlement/receipts/{fileId}/download-url | MeetingSettlementController#getReceiptDownloadUrl | required | 영수증 presigned URL |

### 도메인 모델 / Enum (이 기능 관련)

- `MeetingSettlementVo` — 본체 응답
- `MeetingSettlementSummaryVo` (+ inner `ParticipantSummary`)
- `MeetingSettlementTransferVo` — 송금자/수취자 ID·이름·사진, 상태(`PENDING/COMPLETED/CANCELLED/EXPIRED/REVERSAL_FAILED/PENDING_MANUAL_REFUND`), `paymentMethod`, `parentTransferId?`, `reissueCount`, `writeoffReason?`, `writeoffAt?`, `writeoffByUserId?`, `reversalFailureReason?`, `reversalRetryCount`, `reversalLastAttemptedAt?`
- `PresignedUrlVo` (file 도메인)

### 의존 단위 / 외부 시스템

- Unit 03 (Event): `validateEventParticipantOrHost` — `EventRepository.findById` + `EventAttendanceRepository.existsByEventIdAndUserIdAndStatus(ATTENDING)`
- Unit 0 (Account): `UserService.getUserBasicInfoMap` — 참가자/송금자/수취자 이름/사진 일괄 조회
- Unit 11 (File): `FileStorageService.generateDownloadUrlWithoutOwnerCheck(fileId)` — settlement-scope 인가 후 presigned URL 발급
- 외부 시스템: AWS S3 (presigned URL 발급)

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 → "모임 정산" 탭/카드 → 정산 존재 시 status 화면
- 정산 활성화 알림 푸시 → 딥링크 → status 화면
- 정산 완료/취소 알림 → 딥링크 → status 화면
- 본인 정산 이력 화면(F07-10) → 카드 탭 → status 화면

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement` | `settlement_status_screen.dart` | 정산 현황 (호스트+참여자 공통) |
| `/home/events/:eventId/settlement/receipts/:fileId` | `settlement_receipt_viewer_screen.dart` | 영수증 풀스크린 뷰어 |
| (위젯) | `widgets/settlement_summary_card_widget.dart` | 총액/평균/납부 진척률 카드 |
| (위젯) | `widgets/participant_status_list_widget.dart` | 참가자별 상태 리스트 |
| (위젯) | `widgets/participant_share_card_widget.dart` | 참가자 단건 카드 |
| (위젯) | `widgets/settlement_receipt_gallery_widget.dart` | 영수증 썸네일 갤러리 |

### 화면별 구성 요소 & 액션

### 정산 현황 화면 (`settlement_status_screen.dart`, SCR-MS-002)
- **사용자가 보는 것 (공통)**:
  - `CommunityAppBar` "정산 현황" + 우측 액션:
    - manager(host/staff)일 때만 DRAFT 시 `edit_note` 아이콘 (항목 화면 진입)
    - 모든 사용자: `account_balance_wallet_outlined` "내 분담금 보기" (F07-05)
    - manager만 PopupMenu: 이의제기 관리(F07-08) / 감사 로그(F07-08)
  - 상태별 안내 배너 (DRAFT/ACTIVE/COMPLETED/CANCELLED)
  - `SettlementSummaryCardWidget` — totalAmount, 1인당 평균, 납부 진척률 (`completedAmount/totalShare`)
  - `ParticipantStatusListWidget` — 참가자별 카드 (이름/사진/totalShare/completedAmount/완료배지)
  - `SettlementReceiptGalleryWidget` — 영수증 thumbnail 그리드 (탭 시 receipt viewer)
  - 하단 `SettlementActionBarWidget` (F07-03 활성화/취소, F07-07 독촉)
  - 미납자만 보기 토글 `_showUnpaidOnly`
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `invalidate(settlementDetailProvider)` + `invalidate(settlementSummaryProvider)`
  - 영수증 thumbnail 탭 ▶ `context.push('/home/events/$eventId/settlement/receipts/$fileId')`
  - "내 분담금 보기" 탭 ▶ F07-05 진입
  - manager의 "이의제기 관리" / "감사 로그" 탭 ▶ F07-08 진입
- **상태 분기**:
  - DRAFT: `primary50` (항목 있음) / `warning50` (항목 없음) 안내 배너 + "정산 신청" CTA
  - ACTIVE: 진행 중 배너 + "독촉/취소" CTA + 참가자 카드에 PENDING/COMPLETED 배지
  - COMPLETED: "정산이 완료되었습니다" 라벨, CTA 없음
  - CANCELLED: "취소된 정산입니다" 라벨, CTA 없음
  - 로딩: SkeletonLoader / 에러: `AppErrorState(title: '정산 정보를 불러올 수 없습니다')`

### 영수증 뷰어 화면 (`settlement_receipt_viewer_screen.dart`, SCR-MS-RECEIPT-VIEWER)
- **사용자가 보는 것**:
  - 검은 배경 풀스크린, 상단 AppBar (뒤로가기 + close)
  - `InteractiveViewer` (minScale 0.5, maxScale 4)로 영수증 이미지 (`CachedNetworkImage`)
- **사용자가 할 수 있는 액션**:
  - 핀치 줌 / 패닝
  - 뒤로가기 / 닫기 → `context.pop()`
- **상태 분기**:
  - downloadUrl 로딩 중: `CircularProgressIndicator (white)`
  - downloadUrl null/실패 (403 또는 FE getReceiptDownloadUrl 실패): `AppErrorState(title: '영수증을 불러올 수 없습니다', onRetry:...)`
  - 이미지 로딩 실패: `Icons.broken_image_outlined`

### API 호출 순서 (Provider/Repository 관점)

status 화면 진입 시:
1. `settlementDetailProvider(eventId)` ▶ `MeetingSettlementRepository.getSettlement` ▶ `GET /api/v1/events/:id/settlement`
2. `settlementSummaryProvider(eventId)` ▶ `GET /api/v1/events/:id/settlement/summary`
3. `eventDetailNotifierProvider(eventId)` ▶ host/staff 권한 판정 (myRole)
4. `authNotifierProvider` ▶ currentUserId 확보
5. (manager + ACTIVE) `appealsProvider(eventId)` ▶ PENDING appeal 카운트로 차단 UI 표시 가능
6. (manager) `auditLogProvider(eventId)` ▶ 감사 로그 진입 시

영수증 뷰어 진입 시:
1. `meetingSettlementRepository.getReceiptDownloadUrl(eventId, fileId)` ▶ `GET .../receipts/{fileId}/download-url`
2. 응답 `PresignedUrlVo.downloadUrl` 받아 `CachedNetworkImage`에 전달

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트) 활성화된 정산의 진행률 모니터링 | settlement ACTIVE, 5명 분담, 2명 결제 완료 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S2 | (Happy Path · 참가자) 본인 분담 확인 + 영수증 열람 | 본인은 ATTENDING, settlement ACTIVE | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (엣지 · 비참가자 차단) 다른 모임 사용자가 settlement summary 호출 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (엣지 · 우회 fileId 차단) 임의 fileId로 영수증 URL 요청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (참가자 · DRAFT 단계 조회) 정산이 아직 활성화되지 않음 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (호스트 · COMPLETED 상태) 정산 완료 후 회고 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (호스트 · CANCELLED 상태) 취소된 정산 회고 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (UX · 풀투리프레시) 호스트가 결제 진행률을 1초 단위로 갱신 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | frontend.md:83 | - **참가자 카드 탭**: 해당 참가자의 transfer 상세로 이동 (현재 코드에선 my-shares로 이동) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:23 | 3. 자기 카드 강조 표시 (현재 코드는 별도 강조 없음, 카드만 노출) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트) 활성화된 정산의 진행률 모니터링**: Given settlement ACTIVE, 5명 분담, 2명 결제 완료 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. (Happy Path · 참가자) 본인 분담 확인 + 영수증 열람**: Given 본인은 ATTENDING, settlement ACTIVE When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 비참가자 차단) 다른 모임 사용자가 settlement summary 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (엣지 · 우회 fileId 차단) 임의 fileId로 영수증 URL 요청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (참가자 · DRAFT 단계 조회) 정산이 아직 활성화되지 않음**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (호스트 · COMPLETED 상태) 정산 완료 후 회고**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (호스트 · CANCELLED 상태) 취소된 정산 회고**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (UX · 풀투리프레시) 호스트가 결제 진행률을 1초 단위로 갱신**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
