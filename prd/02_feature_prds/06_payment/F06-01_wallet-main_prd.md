# F06-01. 지갑 메인 조회 PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/06_payment/F06-01_wallet-main -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-01_wallet-main`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 앱 내 어디서든 자기 잔액과 최근 거래 흐름을 한 화면으로 확인하기 위한 단일 조회 API. 잔액(유료 + 무료) · 누적 충전/사용/환불 메트릭 · 통화 코드 · 생성/갱신 시각을 묶어 `WalletVo` 한 객체로 반환한다. 실 거래 변경 액션은 본 기능에 포함되지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 프로필 탭 ▶ "내 지갑" 메뉴
- 충전 완료 모달 닫은 직후 자동 복귀 (`charge_screen.dart`의 성공 모달 → `context.pop()`)
- 결제 실패 후 충전 화면 prefill 흐름의 출발지로 재진입
- 알림(거래 완료 푸시) 클릭 → 거래 상세를 거치지 않고 지갑 메인부터 시작하는 라우팅 일부 케이스
- 멤버십/호스팅 티켓/정산 화면들의 "내 지갑" 헤더 액션 (각 화면 상단 잔액 카드 탭)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-01_wallet-main/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-01_wallet-main/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-01_wallet-main/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-01_wallet-main/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/WalletController.java:68` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시: `walletNotifierProvider` ▶ `WalletRepository.getWallet()` ▶ `GET /api/v1/wallet` ▶ `Wallet` Freezed 모델 (`data/models/payment/wallet.dart`)로 디시리얼라이즈.
2. 풀투리프레시: 위와 동일 (provider future refresh).
3. 다른 화면(F06-02, F06-06, F06-07, F06-08)에서 잔액 변동 작업 종료 시 `ref.invalidate(walletNotifierProvider)`로 재조회 트리거 → 본 화면이 리빌드되면서 새 잔액 표시.

## 4. 서버 계약

### 개요

사용자가 앱 내 어디서든 자기 잔액과 최근 거래 흐름을 한 화면으로 확인하기 위한 단일 조회 API. 잔액(유료 + 무료) · 누적 충전/사용/환불 메트릭 · 통화 코드 · 생성/갱신 시각을 묶어 `WalletVo` 한 객체로 반환한다. 실 거래 변경 액션은 본 기능에 포함되지 않는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/wallet | WalletController#getWallet | required (`@AuthenticationPrincipal`) | 사용자 지갑 단건 조회 (잔액/누적 메트릭 묶음). 지갑 행이 없는 신규 유저는 lazy-create (아래 서버 계약 참조). |

> **Fact (2026-06-04, 커밋 4637b30)**: `WalletService.getWallet`은 `findByUserId` 결과가 null일 때 `self.ensureWalletExists(userId)` 를 호출한다. `self` 는 `@Lazy @Autowired WalletService self` 로 자기 자신을 프록시 경유 주입받아, `@Transactional(propagation=REQUIRES_NEW)` 쓰기 트랜잭션을 readOnly 커넥션과 분리한다. 해결 전에는 신규 가입자가 최초 `GET /api/v1/wallet` 호출 시 "Connection is read-only" 500 오류가 발생했다. 동시 생성 경합은 `DataIntegrityViolationException` catch 후 재조회로 처리. 소스: `WalletService.java:74-100`.

### 도메인 모델 / Enum (이 기능 관련)

- 본 기능에 직접 묶인 enum은 없음. 단, 응답 메트릭을 채우는 거래 누적은 다음 enum의 거래에서 적립된다 (집계 대상).
  - `TransactionType` (`payment/constants/TransactionType.java`): `CHARGE`, `PAY`, `REFUND`, `WITHDRAW`, `DONATE`, `CLUB_SUBSCRIPTION_PAY`, `DONATION_REFUND`, `MEMBER_FEE_PAY`, `FREE_POINT_GRANT`, `SETTLEMENT`, `EXPIRATION`, `MEETING_PREPAYMENT`, `MEETING_SETTLEMENT`, `PRIVATE_HOSTING_COST`, `PRIVATE_MEETING_FEE`, `CHARGE_CANCEL`, `FREE_POINT_FORFEIT`, `MEETING_PREPAYMENT_REFUND`, `MARKETPLACE_SETTLEMENT`, `CLUB_FUND_WITHDRAWAL`, `POINT_EXPIRATION`, `SUBSCRIPTION_REFUND`, `SETTLEMENT_CORRECTION_DEBIT`, `SETTLEMENT_CORRECTION_CREDIT`, `MEMBER_FEE_REFUND`, `PERSONAL_SUBSCRIPTION_PAY` (총 26개, 0~25 코드)
- 핵심 도메인 객체:
  - `Wallet` (`payment/model/Wallet.java`): userId 1:1, 두 종류 잔액(유료/무료)을 함께 관리. 편의 메서드 `addPaidBalance`, `addFreeBalance`, `deductPaidBalance`, `deductAmount(long)` (유료 우선 차감), 누적 메트릭 `totalCharged`/`totalSpent`/`totalRefunded`/`totalFreeGranted`.
- 응답 VO 잔액 필드 (`WalletVo` — `payment/vo/WalletVo.java`):
  - `balance` (long): 총잔액 (= 유료 + 무료)
  - `paidBalance` (long): **유료 잔액**. 충전·현금 환불로 들어온 분으로 **현금 인출 가능** 대상
  - `freeBalance` (long): **무료 잔액**. 프로모션 적립분으로 사용 가능하나 **현금 인출 불가**
  - 유료/무료 분리정산(Point Split Flow-Through) 정책에 따라 잔액·결제·정산·인출이 전 구간에서 분리된다. 상세 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 없음. 순수 조회.
- 본 Unit 내부 의존: 모든 거래(`F06-02 충전`, `F06-06 결제·환불`, `F06-07 호스팅 티켓`, `F06-08 구독`, `F06-10 정산`) 이후 잔액 갱신이 본 API 응답에 즉시 반영.
- 외부: 없음. PG/FCM/S3 호출 없음.

## 5. 프론트 계약

### 진입 경로

- 프로필 탭 ▶ "내 지갑" 메뉴
- 충전 완료 모달 닫은 직후 자동 복귀 (`charge_screen.dart`의 성공 모달 → `context.pop()`)
- 결제 실패 후 충전 화면 prefill 흐름의 출발지로 재진입
- 알림(거래 완료 푸시) 클릭 → 거래 상세를 거치지 않고 지갑 메인부터 시작하는 라우팅 일부 케이스
- 멤버십/호스팅 티켓/정산 화면들의 "내 지갑" 헤더 액션 (각 화면 상단 잔액 카드 탭)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/profile/wallet` | `payment/screens/wallet_screen.dart` | 지갑 메인 (잔액 카드 + 바로가기 4개 + 멤버십 진입 카드 + 최근 거래 3건) |

### 화면별 구성 요소 & 액션

### 지갑 메인 (`wallet_screen.dart`)

- **사용자가 보는 것**:
  - AppBar 타이틀 `내 지갑`
  - `BalanceCardWidget` — 합계 잔액 + 유료/무료 분리 표시 + "충전하기" CTA (.pen 기준 큰 숫자 + 눈 아이콘 토글)
  - `ShortcutGridWidget` — 4개 아이콘: 거래내역 / 결제수단 / 수익 / 정산
  - `_MembershipEntryCard` — 커뮤니티 멤버십(개인 구독) 진입 카드 (primary50/primary500 스타일)
  - `RecentTransactionWidget` — 최근 거래 프리뷰 (서버 wallet 응답이 거래 3건을 직접 포함하지는 않으므로 별도 provider로 거래내역 first page 일부를 그려 사용; 각 항목 탭 시 거래 상세로 이동)
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `ref.refresh(walletNotifierProvider.future)` ▶ `GET /api/v1/wallet`
  - "충전하기" 탭 ▶ `context.go('/profile/wallet/charge')` (F06-02)
  - 잔액 숨김 토글 ▶ 클라이언트 상태로 마스킹 표시(`****** P`); 서버 호출 없음
  - 바로가기 4개:
    - 거래내역 → `/profile/wallet/transactions` (F06-03)
    - 결제수단 → `/profile/wallet/methods` (F06-04)
    - 수익 → `/profile/wallet/earnings` (F06-09)
    - 정산 → `/profile/wallet/settlements` (F06-10)
  - 멤버십 카드 탭 → `/profile/wallet/subscription` (F06-08)
  - 최근 거래 항목 탭 → `/profile/wallet/transactions/{id}` (F06-03 거래 상세)
  - "거래내역 전체보기" 탭 → `/profile/wallet/transactions`
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.detail)`
  - 에러: `AppErrorState(title: '지갑 정보를 불러올 수 없습니다', onRetry: () => ref.invalidate(walletNotifierProvider))`
  - 데이터: 잔액 0이라도 빈 상태 안내 없이 정상 카드 노출 (사용자가 "지금 0원"을 명확히 보아야 함)
- **모달/시트/네비게이션**: 본 화면은 모달 없음. 모든 액션은 `context.go(...)`로 다음 화면 push.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시: `walletNotifierProvider` ▶ `WalletRepository.getWallet()` ▶ `GET /api/v1/wallet` ▶ `Wallet` Freezed 모델 (`data/models/payment/wallet.dart`)로 디시리얼라이즈.
2. 풀투리프레시: 위와 동일 (provider future refresh).
3. 다른 화면(F06-02, F06-06, F06-07, F06-08)에서 잔액 변동 작업 종료 시 `ref.invalidate(walletNotifierProvider)`로 재조회 트리거 → 본 화면이 리빌드되면서 새 잔액 표시.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 잔액 숨김 토글은 클라이언트 전용 상태 (서버에 prefs 저장 안 함)
- 바로가기 그리드의 4개 항목 순서/아이콘 (거래내역 → 결제수단 → 수익 → 정산)
- 멤버십 진입 카드 노출 정책 (서버는 항상 같은 wallet vo만 반환; 카드 자체는 클라가 자체 디자인으로 항상 노출)
- 최근 거래 3건은 서버 `WalletVo`에 포함되지 않음 → 별도 `transactionListNotifierProvider` first page 일부를 사용 (UI/UX 문서가 "최근 3건"으로 명시)
- 풀투리프레시 적용 (스크린 전체 `RefreshIndicator`)
- 빈 상태 문구는 사용하지 않음 (잔액 0 그대로 노출)
- 토스트/스낵바 메시지: 본 화면 액션은 즉시 라우팅이라 없음
- 디바운스/쓰로틀: 해당 없음

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 처음 가입한 사용자가 지갑을 처음 본다 (Happy Path / 빈 잔액) | 로그인 완료, 온보딩 종료, `wallets` 행 없음 | DB에 사용자별 wallet 행 1건 생성, 사용자는 충전 CTA로 다음 단계 유도 받음 |
| S2 | 잔액이 있는 사용자가 충전 후 돌아와 잔액 갱신을 본다 | 결제 후 잔액 부족 인지 → 충전 화면 진입 | 사용자가 "충전이 잔액에 반영되었음"을 즉시 확인 |
| S3 | 잔액 숨김 토글로 프라이버시 보호 | 잔액 250,000P 보유 중 | 시각적으로 잔액이 가려진 상태. 서버 호출 없음. |
| S4 | 네트워크 오류 시 재시도 | 지갑 메인 진입, 통신 두절 | 사용자가 별도 새로고침 액션 없이 동일 화면에서 복구 |
| S5 | 인증 만료 (Refresh 흐름) | Access Token 만료, Refresh Token 유효 | 사용자는 인증 만료를 인지하지 않은 채 정상 흐름 진행 |
| S6 | 다른 기기에서 지급된 무료 포인트가 즉시 반영 | 어제 지갑 5,000P 사용 후 0 → 오늘 캠페인으로 5,000P 지급됨 | 사용자가 별다른 알림 외에도 지갑 진입 즉시 새 잔액을 본다 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 상태 |
|---|---|---|---|---|
| 해소 | S1 신규 유저 첫 GET /api/v1/wallet 500 오류 | `WalletService.getWallet` 에서 readOnly 트랜잭션 내 INSERT 시도로 "Connection is read-only" | 신규 가입자가 지갑 화면 진입 시 500 응답 | **해소** — 4637b30 (2026-06-04): `@Lazy` self-injection + `REQUIRES_NEW` 분리로 수정. 첫 조회부터 balance=0 정상 응답. |

## 9. 수용 기준

- **AC-01. 처음 가입한 사용자가 지갑을 처음 본다 (Happy Path / 빈 잔액)**: Given 로그인 완료, 온보딩 종료, `wallets` 행 없음 When 사용자가 해당 흐름을 실행하면 Then DB에 사용자별 wallet 행 1건 생성, 사용자는 충전 CTA로 다음 단계 유도 받음
- **AC-02. 잔액이 있는 사용자가 충전 후 돌아와 잔액 갱신을 본다**: Given 결제 후 잔액 부족 인지 → 충전 화면 진입 When 사용자가 해당 흐름을 실행하면 Then 사용자가 "충전이 잔액에 반영되었음"을 즉시 확인
- **AC-03. 잔액 숨김 토글로 프라이버시 보호**: Given 잔액 250,000P 보유 중 When 사용자가 해당 흐름을 실행하면 Then 시각적으로 잔액이 가려진 상태. 서버 호출 없음.
- **AC-04. 네트워크 오류 시 재시도**: Given 지갑 메인 진입, 통신 두절 When 사용자가 해당 흐름을 실행하면 Then 사용자가 별도 새로고침 액션 없이 동일 화면에서 복구
- **AC-05. 인증 만료 (Refresh 흐름)**: Given Access Token 만료, Refresh Token 유효 When 사용자가 해당 흐름을 실행하면 Then 사용자는 인증 만료를 인지하지 않은 채 정상 흐름 진행
- **AC-06. 다른 기기에서 지급된 무료 포인트가 즉시 반영**: Given 어제 지갑 5,000P 사용 후 0 → 오늘 캠페인으로 5,000P 지급됨 When 사용자가 해당 흐름을 실행하면 Then 사용자가 별다른 알림 외에도 지갑 진입 즉시 새 잔액을 본다

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- 잔액 화면 표기: `WalletVo`가 유료(`paidBalance`)/무료(`freeBalance`)를 분리 노출하므로, 합계만 보여 줄지 분리 표기할지(특히 "무료는 인출 불가"를 사용자에게 어떻게 알릴지)는 화면에서 결정한다. 정책 자체(무료는 현금화 불가, 유료만 인출 대상)는 `03_policy_prds/payment_settlement_policy_prd.md` §2.5를 따른다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
