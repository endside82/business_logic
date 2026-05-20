# F06-03. 거래 내역 조회·필터·내보내기 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-03_transaction-history -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-03_transaction-history`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

지갑에서 발생한 모든 포인트 거래(충전·결제·환불·정산·구독·만료 등 26종)를 페이지네이션으로 조회하고, 단건 상세를 확인하고, 회계용 CSV/TXT 파일을 다운로드한다. 환불 거래의 경우 `refund_request`를 추가 조회하여 PG 환불 sub-status(`pgStatus`, `pgCompletedAt`)를 응답에 합성한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "거래내역" 바로가기 또는 최근 거래 위젯의 "전체보기"
- 거래 푸시 알림(결제 완료/환불 완료) 클릭 → 거래 상세로 직접 이동
- 충전/결제 성공 모달 닫기 후 사용자가 임의 진입
- 정산 완료 알림 → 정산 거래 카드 노출

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-03_transaction-history/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-03_transaction-history/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-03_transaction-history/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-03_transaction-history/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/TransactionExportController.java:32` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:166` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:178` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 거래 목록 (`transaction_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `거래 내역` + 우측 actions에 다운로드 아이콘
  - `TransactionFilterWidget` — 유형 탭(전체/충전/결제/환불/정산) + 기간 프리셋(1주/1개월/3개월/직접설정)
  - 날짜 그룹 헤더(`yyyy년 M월 d일 (E)`) + `TransactionItemWidget` (32x32 r=16 아이콘 + 설명 + 금액 + 잔액)
  - 무한 스크롤 끝에 "마지막 거래까지 확인했습니다" 종료 메시지 (terminal state)
- **사용자가 할 수 있는 액션**:
  - 유형 탭 ▶ `notifier.setType(type)` ▶ page=0부터 재조회 `GET /transactions?type=...`
  - 기간 프리셋 ▶ `notifier.setDateRange(preset)` ▶ `dateFrom`/`dateTo` 변경 후 재조회
  - 직접설정 ▶ 캘린더 모달 (앱 표준 `showDateRangePicker` 또는 커스텀; UI/UX 19에 명시)
  - 무한 스크롤 ▶ `_onScroll`에서 maxScrollExtent-200 임계 시 `notifier.loadMore()` ▶ `GET /transactions?page=N`
  - 거래 카드 탭 ▶ `context.go('/profile/wallet/transactions/${tx.id}')`
  - 풀투리프레시 ▶ provider invalidate
  - 다운로드 아이콘 탭 ▶ `_exportCsv()` ▶ `walletRepository.exportTransactions(format: 'csv', fromDate, toDate)` ▶ `Share.shareXFiles`로 시스템 공유 시트
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `AppErrorState(title: '거래 내역을 불러올 수 없습니다', onRetry: ...)`
  - 빈 결과: `Center('거래 내역이 없습니다')`
- **모달/시트/네비게이션**: 직접설정 기간 모달, 다운로드는 시스템 공유 시트.

### 거래 상세 (`transaction_detail_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `거래 상세`
  - 큰 아이콘(타입별) + 큰 금액(±) + 타입 배지(라벨)
  - 상세 카드: `상태 / 설명 / 유료 포인트 / 무료 포인트 / 거래 전 잔액 / 거래 후 잔액 / 거래 일시 / 주문번호 / PG 거래번호`
  - REFUND 타입에서 `freeAmount > 0`이면 "포인트 환불 즉시 완료" 카드
  - REFUND 타입에서 `pgStatus`가 있으면 `PgSubStatusRowWidget`로 PG 환불 sub-status 라인 (e.g., 진행 중 / 완료 / 보류)
  - 관련 이벤트/클럽 링크 카드 (CHARGE/REFUND/SETTLEMENT/CLUB_SUBSCRIPTION_PAY 등 조건)
  - CHARGE + COMPLETED일 때 "충전 취소" `AppButton(variant: ButtonVariant.danger)`
- **사용자가 할 수 있는 액션**:
  - 주문번호/PG 거래번호 탭 ▶ `Clipboard.setData` + `AppToast.show('복사됨: ...')`
  - 관련 이벤트 카드 탭 ▶ `context.go('/home/events/${eventId}')`
  - 관련 클럽 카드 탭 ▶ `context.go('/clubs/${referenceId}')`
  - "충전 취소" 탭 ▶ `AppDialog.confirm` (위험 스타일) → `chargeCancelNotifier.cancelCharge(tx.id)` ▶ `POST /charge/cancel` (F06-02 참조) ▶ 성공 토스트
- **상태 분기**:
  - 로딩: 스켈레톤
  - `ApiError.notFound`: `AppEmptyState(icon: Icons.search_off, title: '거래 정보를 찾을 수 없습니다', ...)`
  - 일반 에러: `AppErrorState(title: '거래 정보를 불러올 수 없습니다', onRetry: ...)`

## 4. 서버 계약

### 개요

지갑에서 발생한 모든 포인트 거래(충전·결제·환불·정산·구독·만료 등 26종)를 페이지네이션으로 조회하고, 단건 상세를 확인하고, 회계용 CSV/TXT 파일을 다운로드한다. 환불 거래의 경우 `refund_request`를 추가 조회하여 PG 환불 sub-status(`pgStatus`, `pgCompletedAt`)를 응답에 합성한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/wallet/transactions | WalletController#getTransactions | required | 페이지네이션 + 유형/기간 필터 |
| GET | /api/v1/wallet/transactions/{id} | WalletController#getTransaction | required | 단건 상세 + relatedEventId/pgStatus 합성 |
| GET | /api/v1/wallet/transactions/export | TransactionExportController#exportTransactions | required | CSV/TXT 바이너리 다운로드 (최대 90일) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `TransactionType` (전체 26개): `CHARGE`(0), `PAY`(1), `REFUND`(2), `WITHDRAW`(3), `DONATE`(4), `CLUB_SUBSCRIPTION_PAY`(5), `DONATION_REFUND`(6), `MEMBER_FEE_PAY`(7), `FREE_POINT_GRANT`(8), `SETTLEMENT`(9), `EXPIRATION`(10), `MEETING_PREPAYMENT`(11), `MEETING_SETTLEMENT`(12), `PRIVATE_HOSTING_COST`(13), `PRIVATE_MEETING_FEE`(14), `CHARGE_CANCEL`(15), `FREE_POINT_FORFEIT`(16), `MEETING_PREPAYMENT_REFUND`(17), `MARKETPLACE_SETTLEMENT`(18), `CLUB_FUND_WITHDRAWAL`(19), `POINT_EXPIRATION`(20), `SUBSCRIPTION_REFUND`(21), `SETTLEMENT_CORRECTION_DEBIT`(22), `SETTLEMENT_CORRECTION_CREDIT`(23), `MEMBER_FEE_REFUND`(24), `PERSONAL_SUBSCRIPTION_PAY`(25)
- **Enum** `PointTransactionStatus`: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED`
- **PG 환불 sub-status (응답 `pgStatus`)**: `RefundPgStatus` enum의 name() 그대로 — `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `CANCELLED`, `MANUAL_REQUIRED` (값은 `payment/constants/RefundPgStatus.java` 참조)
- 핵심 도메인 객체:
  - `PointTransaction` — 본 Unit 모든 거래의 단일 기록
  - `RefundRequest` — 환불 큐 행, `refundPointTransactionId`로 환불 거래와 1:N 연결, `pgStatus`/`updatedAt`(=pgCompletedAt) 보유

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 거래 상세에서 `Settlement.eventId`(F06-10), `MeetingSettlement.eventId`(Unit 07) 보강 조회. 이벤트/클럽 모델은 referenceId만 노출, 상세 페이지 진입은 클라 라우팅 책임.
- 외부: 없음 (CSV 직접 생성)

## 5. 프론트 계약

### 진입 경로

- 지갑 메인(F06-01) ▶ "거래내역" 바로가기 또는 최근 거래 위젯의 "전체보기"
- 거래 푸시 알림(결제 완료/환불 완료) 클릭 → 거래 상세로 직접 이동
- 충전/결제 성공 모달 닫기 후 사용자가 임의 진입
- 정산 완료 알림 → 정산 거래 카드 노출

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/transactions` | `payment/screens/transaction_list_screen.dart` | 거래 내역 (필터 + 무한 스크롤 + 내보내기) |
| `/profile/wallet/transactions/:transactionId` | `payment/screens/transaction_detail_screen.dart` | 거래 상세 (필드 + 관련 이벤트/클럽 + 충전 취소 CTA + 환불 PG sub-status) |

### 화면별 구성 요소 & 액션

### 거래 목록 (`transaction_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `거래 내역` + 우측 actions에 다운로드 아이콘
  - `TransactionFilterWidget` — 유형 탭(전체/충전/결제/환불/정산) + 기간 프리셋(1주/1개월/3개월/직접설정)
  - 날짜 그룹 헤더(`yyyy년 M월 d일 (E)`) + `TransactionItemWidget` (32x32 r=16 아이콘 + 설명 + 금액 + 잔액)
  - 무한 스크롤 끝에 "마지막 거래까지 확인했습니다" 종료 메시지 (terminal state)
- **사용자가 할 수 있는 액션**:
  - 유형 탭 ▶ `notifier.setType(type)` ▶ page=0부터 재조회 `GET /transactions?type=...`
  - 기간 프리셋 ▶ `notifier.setDateRange(preset)` ▶ `dateFrom`/`dateTo` 변경 후 재조회
  - 직접설정 ▶ 캘린더 모달 (앱 표준 `showDateRangePicker` 또는 커스텀; UI/UX 19에 명시)
  - 무한 스크롤 ▶ `_onScroll`에서 maxScrollExtent-200 임계 시 `notifier.loadMore()` ▶ `GET /transactions?page=N`
  - 거래 카드 탭 ▶ `context.go('/profile/wallet/transactions/${tx.id}')`
  - 풀투리프레시 ▶ provider invalidate
  - 다운로드 아이콘 탭 ▶ `_exportCsv()` ▶ `walletRepository.exportTransactions(format: 'csv', fromDate, toDate)` ▶ `Share.shareXFiles`로 시스템 공유 시트
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `AppErrorState(title: '거래 내역을 불러올 수 없습니다', onRetry: ...)`
  - 빈 결과: `Center('거래 내역이 없습니다')`
- **모달/시트/네비게이션**: 직접설정 기간 모달, 다운로드는 시스템 공유 시트.

### 거래 상세 (`transaction_detail_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `거래 상세`
  - 큰 아이콘(타입별) + 큰 금액(±) + 타입 배지(라벨)
  - 상세 카드: `상태 / 설명 / 유료 포인트 / 무료 포인트 / 거래 전 잔액 / 거래 후 잔액 / 거래 일시 / 주문번호 / PG 거래번호`
  - REFUND 타입에서 `freeAmount > 0`이면 "포인트 환불 즉시 완료" 카드
  - REFUND 타입에서 `pgStatus`가 있으면 `PgSubStatusRowWidget`로 PG 환불 sub-status 라인 (e.g., 진행 중 / 완료 / 보류)
  - 관련 이벤트/클럽 링크 카드 (CHARGE/REFUND/SETTLEMENT/CLUB_SUBSCRIPTION_PAY 등 조건)
  - CHARGE + COMPLETED일 때 "충전 취소" `AppButton(variant: ButtonVariant.danger)`
- **사용자가 할 수 있는 액션**:
  - 주문번호/PG 거래번호 탭 ▶ `Clipboard.setData` + `AppToast.show('복사됨: ...')`
  - 관련 이벤트 카드 탭 ▶ `context.go('/home/events/${eventId}')`
  - 관련 클럽 카드 탭 ▶ `context.go('/clubs/${referenceId}')`
  - "충전 취소" 탭 ▶ `AppDialog.confirm` (위험 스타일) → `chargeCancelNotifier.cancelCharge(tx.id)` ▶ `POST /charge/cancel` (F06-02 참조) ▶ 성공 토스트
- **상태 분기**:
  - 로딩: 스켈레톤
  - `ApiError.notFound`: `AppEmptyState(icon: Icons.search_off, title: '거래 정보를 찾을 수 없습니다', ...)`
  - 일반 에러: `AppErrorState(title: '거래 정보를 불러올 수 없습니다', onRetry: ...)`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 1주 충전 + 결제 내역 빠르게 보기 (Happy Path) | 최근 1주 내 충전 2건, 결제 5건, 정산 1건 | 사용자 인지 완료, 다음 액션 임의 (상세 진입 또는 닫기) |
| S2 | 정산 거래 상세에서 관련 이벤트로 점프 | 거래 목록에서 `SETTLEMENT` 유형 카드 탭 | 이벤트 상세 화면으로 이동, 본 정산이 어떤 모임에서 발생했는지 확인 |
| S3 | 환불 거래의 PG sub-status 추적 | REFUND 거래 1건이 어제 생성됨, PG 환불 큐는 진행 중 | 사용자가 카드 환불 진행 상황을 앱에서 그대로 추적 가능 |
| S4 | 회계용 CSV 내보내기 (3개월) | 거래 목록 화면, 기간 필터 = 3개월 | 외부 앱에 거래내역 CSV 전달 |
| S5 | 90일 초과 기간 내보내기 시도 → 거절 | 직접설정으로 fromDate=1년 전, toDate=오늘 | 잘못된 요청 차단, 사용자 인지 후 재시도 |
| S6 | 빈 결과 (필터 없는 신규 사용자) | 거래 목록 진입 | 충전 화면으로 유도되는 자연스러운 빈 상태 |
| S7 | 거래 단건 미존재 (404) | `transactionId=999`로 직접 라우팅 | 안전한 안내 + 사용자가 다른 거래로 이동 |

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
| 후보 | backend.md:56 | - 3) `relatedEventId` 보강: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:99 | - 다른 Unit 의존: 거래 상세에서 `Settlement.eventId`(F06-10), `MeetingSettlement.eventId`(Unit 07) 보강 조회. 이벤트/클럽 모델은 referenceId만 노출, 상세 페이지 진입은 클라 라우팅 책임. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:54 | - "충전 취소" 탭 ▶ `AppDialog.confirm` (위험 스타일) → `chargeCancelNotifier.cancelCharge(tx.id)` ▶ `POST /charge/cancel` (F06-02 참조) ▶ 성공 토스트 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:61 | ## 3. 거래 상세 보강 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 1주 충전 + 결제 내역 빠르게 보기 (Happy Path)**: Given 최근 1주 내 충전 2건, 결제 5건, 정산 1건 When 사용자가 해당 흐름을 실행하면 Then 사용자 인지 완료, 다음 액션 임의 (상세 진입 또는 닫기)
- **AC-02. 정산 거래 상세에서 관련 이벤트로 점프**: Given 거래 목록에서 `SETTLEMENT` 유형 카드 탭 When 사용자가 해당 흐름을 실행하면 Then 이벤트 상세 화면으로 이동, 본 정산이 어떤 모임에서 발생했는지 확인
- **AC-03. 환불 거래의 PG sub-status 추적**: Given REFUND 거래 1건이 어제 생성됨, PG 환불 큐는 진행 중 When 사용자가 해당 흐름을 실행하면 Then 사용자가 카드 환불 진행 상황을 앱에서 그대로 추적 가능
- **AC-04. 회계용 CSV 내보내기 (3개월)**: Given 거래 목록 화면, 기간 필터 = 3개월 When 사용자가 해당 흐름을 실행하면 Then 외부 앱에 거래내역 CSV 전달
- **AC-05. 90일 초과 기간 내보내기 시도 → 거절**: Given 직접설정으로 fromDate=1년 전, toDate=오늘 When 사용자가 해당 흐름을 실행하면 Then 잘못된 요청 차단, 사용자 인지 후 재시도
- **AC-06. 빈 결과 (필터 없는 신규 사용자)**: Given 거래 목록 진입 When 사용자가 해당 흐름을 실행하면 Then 충전 화면으로 유도되는 자연스러운 빈 상태
- **AC-07. 거래 단건 미존재 (404)**: Given `transactionId=999`로 직접 라우팅 When 사용자가 해당 흐름을 실행하면 Then 안전한 안내 + 사용자가 다른 거래로 이동

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
