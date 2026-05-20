# F06-10. 정산 조회·요약·이의 제기 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-10_settlement-appeal -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-10_settlement-appeal`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

호스트가 자신에게 발생한 정산을 상태별로 조회하고, 서버 측 집계로 총/대기/승인 합계와 건수를 따로 받아 일관된 요약을 본다(CL-05). 정산 상세는 수수료 10% / 원천징수 3.3% / 무료 포인트 보조금 차감 / 실수령액으로 자동 분해되어 라인 아이템(`FeeLineItem`)으로 응답된다. `REJECTED` 상태일 때만 이의 제기가 가능하며, 본 단위는 이의 제기 생성/조회 API도 함께 묶는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "정산" 바로가기
- 수익 대시보드(F06-09) ▶ "전체 수익 내역 보기 →"
- 정산 상태 변경 알림(예: 정산 거절) ▶ 푸시 클릭으로 정산 상세 직진입
- 거래 상세(F06-03)에서 정산 거래 → "관련 이벤트" 외에 정산 상세 진입 경로(추가 라우팅, 미래 영역)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-10_settlement-appeal/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-10_settlement-appeal/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-10_settlement-appeal/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-10_settlement-appeal/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/SettlementAppealController.java:25` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/SettlementAppealController.java:34` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:217` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:231` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:241` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 정산 목록 (`settlement_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `정산 내역`
  - 요약 Row (CL-05 서버 합계 사용): "정산 완료 / ₩{paidAmount}" + "보류 금액 / ₩{pending+approved}" (보류는 PENDING+APPROVED 합)
  - 상태 필터 탭 가로 스크롤: 전체 / 대기(PENDING) / 승인(APPROVED) / 지급중(PAYING) / 완료(PAID) / 실패(FAILED) / 거절(REJECTED)
  - 시간 필터 탭 가로 스크롤: 전체 / 이번 주 / 지난 주 / 이번 달 / 지난 달 / 최근 3개월 (클라 측 필터 — `_applyTimeFilter`로 `createdAt` 기준)
  - `SettlementItemWidget` 리스트 (이벤트명 + 금액 + 상태 배지 + 정산일)
  - 무한 스크롤 (maxScrollExtent - 200)
- **사용자가 할 수 있는 액션**:
  - 상태 탭 ▶ `notifier.setStatusFilter(value)` ▶ page=0부터 `GET /settlements?status=...`
  - 시간 탭 ▶ 클라 필터링만 (서버 호출 없음)
  - 카드 탭 ▶ `context.go('/profile/wallet/settlements/${id}')`
  - 풀투리프레시 ▶ `settlementSummaryProvider` invalidate + `settlementListNotifierProvider` refresh
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `AppErrorState(title: '정산 내역을 불러올 수 없습니다', onRetry: ...)`
  - 빈 결과: `Center('정산 내역이 없습니다')`
- **모달/시트/네비게이션**: 없음

### 정산 상세 (`settlement_detail_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `정산 상세`
  - 헤더: 이벤트명(없으면 "이벤트 #N") + "정산 ID: {id}" + 우측 `SettlementStatusBadgeWidget`
  - `SettlementTimelineWidget` — PENDING → APPROVED → PAYING → PAID 타임라인 (실패/거절 분기 시각화)
  - 상태별 안내 카드:
    - PAYING: "지급 처리 중" (primary50 + primary500)
    - FAILED: "자동 재시도 중" (warning50, "5일 이내에 처리되지 않으면 관리자 문의")
    - REJECTED: "정산이 거부되었습니다" + 사유 표기 + "이의 제기" 안내 (error500 6%)
  - `SettlementDetailBreakdownWidget` — 라인 아이템 리스트 (총 매출 / 플랫폼 수수료 -10% / 원천징수 -3.3% / [무료 포인트 보조금] / 실수령액)
  - REJECTED + 이의 미제출 → `AppButton(variant: ButtonVariant.danger, label: '이의 제기')`
  - 이의 제기 이력 있으면: `_buildAppealInfo(appeal)` ("사유 / 상태 / 관리자 답변")
- **사용자가 할 수 있는 액션**:
  - "이의 제기" 탭 ▶ `SettlementAppealDialog` 모달 (사유 입력 + 제출)
  - 다이얼로그 "제출" ▶ `notifier.submitAppeal(reason)` ▶ `POST /settlements/{id}/appeal` ▶ 토스트 "이의 제기가 접수되었습니다"
- **상태 분기**:
  - 로딩: 스켈레톤
  - 에러: `AppErrorState(title: '정산 상세를 불러올 수 없습니다', onRetry: ...)`
  - REJECTED + 이의 이미 제출됨: 버튼 숨김, 이의 카드만 노출
- **모달/시트/네비게이션**:
  - `SettlementAppealDialog(onSubmit: (reason) => ...)` — 사유 입력. UI/UX 20에는 첨부 파일도 명시되어 있으나 **서버 Param에 첨부 필드 없음** → 클라 다이얼로그도 텍스트만 받음

## 4. 서버 계약

### 개요

호스트가 자신에게 발생한 정산을 상태별로 조회하고, 서버 측 집계로 총/대기/승인 합계와 건수를 따로 받아 일관된 요약을 본다(CL-05). 정산 상세는 수수료 10% / 원천징수 3.3% / 무료 포인트 보조금 차감 / 실수령액으로 자동 분해되어 라인 아이템(`FeeLineItem`)으로 응답된다. `REJECTED` 상태일 때만 이의 제기가 가능하며, 본 단위는 이의 제기 생성/조회 API도 함께 묶는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/wallet/settlements | WalletController#getMySettlements | required | 정산 페이지 + 상태 필터 |
| GET | /api/v1/wallet/settlements/summary | WalletController#getMySettlementSummary | required | 서버 측 합계/건수 (CL-05) |
| GET | /api/v1/wallet/settlements/{id} | WalletController#getSettlementDetail | required | 단건 상세 (수수료/세금/순정산 breakdown) |
| POST | /api/v1/wallet/settlements/{settlementId}/appeal | SettlementAppealController#createAppeal | required | REJECTED 정산에 이의 제기 (201) |
| GET | /api/v1/wallet/settlements/{settlementId}/appeal | SettlementAppealController#getAppeal | required | 기제출 이의 내역 조회 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `SettlementStatus`: `PENDING`, `APPROVED`, `PAYING`, `PAID`, `FAILED`, `REJECTED` (정확히 6개)
- **Enum** `AppealStatus`: `PENDING`, `APPROVED`, `REJECTED`, `RESOLVED` (정확히 4개)
- 핵심 도메인 객체:
  - `Settlement` — hostUserId, eventId, status, grossAmount, platformFee, withholdingTax, netAmount, freePointSubsidy, settledAt, periodStart/End, rejectionReason
  - `SettlementAppeal` — settlementId, userId, reason, status, adminResponse, resolvedAt
  - `FeeLineItem` — label, rate, amount (응답 breakdown 라인)
  - 비고: 상태 전이는 `SettlementService` (정산 승인/완료/거절/재시도)에서 운영. 본 단위는 조회와 이의 제기만 다루며, 이의 제기 성공 시 서버측 후속 워크플로우(REJECTED → PENDING 등)는 `SettlementAppealService`/`SettlementService` 내부 로직(향후 확인). UI/UX는 "이의 제출 → REJECTED → PENDING"으로 명시.

### 의존 단위 / 외부 시스템

- 외부: 없음 (조회 + 신청 큐)
- 다른 Unit:
  - **F06-09 수익 대시보드**의 `recentSettlements` 항목과 동일한 도메인 사용
  - **Event Unit (03)**: `eventTitle` 보강을 위해 `eventRepository.findById` 호출
  - **알림 Unit (12)**: 관리자가 정산 상태를 전환하면 발송되는 푸시(예: `SETTLEMENT_REJECTED`, `SETTLEMENT_COMPLETED`)는 본 컨트롤러 코드에 직접 명시되지 않음

## 5. 프론트 계약

### 진입 경로

- 지갑 메인(F06-01) ▶ "정산" 바로가기
- 수익 대시보드(F06-09) ▶ "전체 수익 내역 보기 →"
- 정산 상태 변경 알림(예: 정산 거절) ▶ 푸시 클릭으로 정산 상세 직진입
- 거래 상세(F06-03)에서 정산 거래 → "관련 이벤트" 외에 정산 상세 진입 경로(추가 라우팅, 미래 영역)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/settlements` | `payment/screens/settlement_list_screen.dart` | 정산 목록 + 요약 카드 + 상태 필터 + 시간 필터 |
| `/profile/wallet/settlements/:settlementId` | `payment/screens/settlement_detail_screen.dart` | 정산 상세 + breakdown + 타임라인 + 이의 제기 |

### 화면별 구성 요소 & 액션

### 정산 목록 (`settlement_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `정산 내역`
  - 요약 Row (CL-05 서버 합계 사용): "정산 완료 / ₩{paidAmount}" + "보류 금액 / ₩{pending+approved}" (보류는 PENDING+APPROVED 합)
  - 상태 필터 탭 가로 스크롤: 전체 / 대기(PENDING) / 승인(APPROVED) / 지급중(PAYING) / 완료(PAID) / 실패(FAILED) / 거절(REJECTED)
  - 시간 필터 탭 가로 스크롤: 전체 / 이번 주 / 지난 주 / 이번 달 / 지난 달 / 최근 3개월 (클라 측 필터 — `_applyTimeFilter`로 `createdAt` 기준)
  - `SettlementItemWidget` 리스트 (이벤트명 + 금액 + 상태 배지 + 정산일)
  - 무한 스크롤 (maxScrollExtent - 200)
- **사용자가 할 수 있는 액션**:
  - 상태 탭 ▶ `notifier.setStatusFilter(value)` ▶ page=0부터 `GET /settlements?status=...`
  - 시간 탭 ▶ 클라 필터링만 (서버 호출 없음)
  - 카드 탭 ▶ `context.go('/profile/wallet/settlements/${id}')`
  - 풀투리프레시 ▶ `settlementSummaryProvider` invalidate + `settlementListNotifierProvider` refresh
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `AppErrorState(title: '정산 내역을 불러올 수 없습니다', onRetry: ...)`
  - 빈 결과: `Center('정산 내역이 없습니다')`
- **모달/시트/네비게이션**: 없음

### 정산 상세 (`settlement_detail_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `정산 상세`
  - 헤더: 이벤트명(없으면 "이벤트 #N") + "정산 ID: {id}" + 우측 `SettlementStatusBadgeWidget`
  - `SettlementTimelineWidget` — PENDING → APPROVED → PAYING → PAID 타임라인 (실패/거절 분기 시각화)
  - 상태별 안내 카드:
    - PAYING: "지급 처리 중" (primary50 + primary500)
    - FAILED: "자동 재시도 중" (warning50, "5일 이내에 처리되지 않으면 관리자 문의")
    - REJECTED: "정산이 거부되었습니다" + 사유 표기 + "이의 제기" 안내 (error500 6%)
  - `SettlementDetailBreakdownWidget` — 라인 아이템 리스트 (총 매출 / 플랫폼 수수료 -10% / 원천징수 -3.3% / [무료 포인트 보조금] / 실수령액)
  - REJECTED + 이의 미제출 → `AppButton(variant: ButtonVariant.danger, label: '이의 제기')`
  - 이의 제기 이력 있으면: `_buildAppealInfo(appeal)` ("사유 / 상태 / 관리자 답변")
- **사용자가 할 수 있는 액션**:
  - "이의 제기" 탭 ▶ `SettlementAppealDialog` 모달 (사유 입력 + 제출)
  - 다이얼로그 "제출" ▶ `notifier.submitAppeal(reason)` ▶ `POST /settlements/{id}/appeal` ▶ 토스트 "이의 제기가 접수되었습니다"
- **상태 분기**:
  - 로딩: 스켈레톤
  - 에러: `AppErrorState(title: '정산 상세를 불러올 수 없습니다', onRetry: ...)`
  - REJECTED + 이의 이미 제출됨: 버튼 숨김, 이의 카드만 노출
- **모달/시트/네비게이션**:
  - `SettlementAppealDialog(onSubmit: (reason) => ...)` — 사유 입력. UI/UX 20에는 첨부 파일도 명시되어 있으나 **서버 Param에 첨부 필드 없음** → 클라 다이얼로그도 텍스트만 받음

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 정산 목록 + 요약 빠르게 확인 (Happy Path) | 지갑 메인 → "정산" 바로가기 | 사용자가 어떤 상태가 몇 건인지 명확히 인지 |
| S2 | 정산 상세 → breakdown 확인 | 호스트가 한 정산의 수수료 내역을 보고 싶음 | 사용자가 수수료 정확히 인지 |
| S3 | REJECTED 정산에 이의 제기 | 정산 상세, status=REJECTED, rejectionReason="중복 정산 의심" | 이의 1건 제출됨. 관리자 검토 대기. UI/UX 20에 따르면 정산 상태가 REJECTED → PENDING으로 전환되어 재심사 대기 (서버 후속 워크플로우). |
| S4 | 이의 제기 중복 시도 | 이미 이의 제출한 사용자가 다시 제출 시도 | 중복 차단. 1정산 1이의 원칙. |
| S5 | PENDING 정산에 이의 제기 시도 → 거절 | 아직 거절 안 된 정산에 이의 시도하는 사용자 | 변경 없음. UI 가드 + 서버 가드 이중. |
| S6 | PAYING 상태 안내 | 정산 지급 진행 중 | 사용자가 진행 단계 인지 |
| S7 | FAILED 정산 자동 재시도 안내 | 정산 1건이 외부 송금 실패로 FAILED | 사용자에게 명확한 일정 안내 + 추가 액션 불필요 |
| S8 | 시간 필터 (이번 달) | 이번 달 정산만 보고 싶은 호스트 | 빠른 클라이언트 필터로 사용자 결정 보강 |
| S9 | 상태/시간 필터 동시 사용 | 이번 달 PAID만 보고 싶음 | 정확한 부분집합 노출 |

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
| 후보 | backend.md:85 | - `reason: String` `@NotBlank @Size(max=1000)` (UI/UX 20에는 첨부 파일도 명시되어 있으나 서버 Param에는 없음 — 서버 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:134 | - **Event Unit (03)**: `eventTitle` 보강을 위해 `eventRepository.findById` 호출 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:87 | - **이의 제출 다이얼로그 디자인**: 사유 텍스트 입력 (max 1000자 가드 — 서버 `@Size(max=1000)`과 일치 권장), 첨부 파일은 UI/UX에는 있지만 서버 미구현 → 현재 화면도 텍스트만 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:87 | **종료 상태**: 빠른 클라이언트 필터로 사용자 결정 보강 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 정산 목록 + 요약 빠르게 확인 (Happy Path)**: Given 지갑 메인 → "정산" 바로가기 When 사용자가 해당 흐름을 실행하면 Then 사용자가 어떤 상태가 몇 건인지 명확히 인지
- **AC-02. 정산 상세 → breakdown 확인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 수수료 정확히 인지
- **AC-03. REJECTED 정산에 이의 제기**: Given 정산 상세, status=REJECTED, rejectionReason="중복 정산 의심" When 사용자가 해당 흐름을 실행하면 Then 이의 1건 제출됨. 관리자 검토 대기. UI/UX 20에 따르면 정산 상태가 REJECTED → PENDING으로 전환되어 재심사 대기 (서버 후속 워크플로우).
- **AC-04. 이의 제기 중복 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 중복 차단. 1정산 1이의 원칙.
- **AC-05. PENDING 정산에 이의 제기 시도 → 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없음. UI 가드 + 서버 가드 이중.
- **AC-06. PAYING 상태 안내**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 진행 단계 인지
- **AC-07. FAILED 정산 자동 재시도 안내**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 명확한 일정 안내 + 추가 액션 불필요
- **AC-08. 시간 필터 (이번 달)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빠른 클라이언트 필터로 사용자 결정 보강
- **AC-09. 상태/시간 필터 동시 사용**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정확한 부분집합 노출

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
