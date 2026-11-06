# F06-03. 거래 내역 조회·필터·내보내기 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

지갑에서 발생한 모든 포인트 거래(충전·결제·환불·정산·구독·만료 등 모든 거래)를 페이지네이션으로 조회하고, 단건 상세를 확인하고, 회계용 CSV/TXT 파일을 다운로드한다. 환불 거래의 경우 `refund_request`를 추가 조회하여 PG 환불 sub-status(`pgStatus`, `pgCompletedAt`)를 응답에 합성한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "거래내역" 바로가기 또는 최근 거래 위젯의 "전체보기"
- 거래 푸시 알림(결제 완료/환불 완료) 클릭 → 거래 상세로 직접 이동
- 충전/결제 성공 모달 닫기 후 사용자가 임의 진입
- 정산 완료 알림 → 정산 거래 카드 노출

## 2. 코드 위치

계약의 정본은 코드다. 서버: `WalletController`, `TransactionExportController`. 앱: `transaction_list_screen.dart`, `transaction_detail_screen.dart`.

<!-- source-references:start -->
서버 창구: `WalletController#getTransactions`, `WalletController#getTransaction`, `TransactionExportController#exportTransactions`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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
