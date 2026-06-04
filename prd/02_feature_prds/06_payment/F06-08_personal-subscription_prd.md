# F06-08. 개인 구독 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-08_personal-subscription -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-08_personal-subscription`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

플랜 카탈로그(BASIC/PREMIUM) 조회 → 구독 시작(`/subscribe`) → 자동갱신 해제(`/cancel`) → 정지된 구독 재활성(`/reactivate`)을 한 컨트롤러에서 제공한다. 결제는 외부 PG가 아닌 사용자 지갑 포인트 차감(`walletSpendService.spend(SUBSCRIPTION, ...)`)으로 처리되며, `TransactionType.PERSONAL_SUBSCRIPTION_PAY`로 거래 내역에 기록된다. 자동갱신 시도(주기 만료 시)는 `SubscriptionService` 스케줄러에서 별도로 운영(본 단위 외).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "커뮤니티 멤버십" 진입 카드 (`_MembershipEntryCard`)
- 프로필 설정 ▶ "멤버십" 메뉴 (선택)
- 구독 만료 알림(자동갱신 실패 등) 푸시 → 본 화면 직진입

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-08_personal-subscription/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-08_personal-subscription/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-08_personal-subscription/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-08_personal-subscription/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java:26` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java:31` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java:37` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java:45` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java:51` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 멤버십 (`personal_subscription_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `멤버십`
  - `_HeroCard` — primary700/primary500/warning500 그라디언트, "Community Plus / 더 적은 마찰로 모임을 운영하세요" + 현재 지갑 잔액 표기
  - `_CurrentSubscriptionCard` — 활성/예약해지/정지/만료 상태별 `_StatusPill` (이용 중 / 해지 예약 / 정지 / 만료) + 단가 + 만료일 + 액션 버튼(자동갱신 해제 / 재활성화 / 안내문)
  - "플랜 선택" 섹션 헤더
  - `_PlanCard` (베이직 / 프리미엄) — 단가, 기간, 혜택 체크리스트, "지갑으로 구독" 또는 "이용 중" 버튼
  - `_PolicyNote` — "구독은 지갑 잔액에서 결제되며, 자동갱신 해제 후에도 만료일까지 이용할 수 있습니다."
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `personalSubscriptionPlansNotifierProvider`, `personalSubscriptionNotifierProvider`, `walletNotifierProvider` 모두 invalidate
  - "지갑으로 구독" 탭 ▶ 확인 다이얼로그 ("BASIC/PREMIUM 구독 / N P가 지갑에서 차감됩니다") → 동의 시 `notifier.subscribe(planType)` ▶ `POST /subscriptions/subscribe { planType }` ▶ 토스트 "구독이 시작되었습니다"
  - 잔액 부족 사전 가드: walletBalance < plan.price면 토스트 "잔액이 부족합니다. 포인트를 충전한 뒤 다시 시도해주세요."
  - "자동갱신 해제" 탭 ▶ 확인 다이얼로그 → `notifier.cancelAutoRenew()` ▶ `POST /subscriptions/cancel` ▶ 토스트 "자동갱신을 해제했습니다"
  - "재활성화" 탭 ▶ 확인 다이얼로그 → `notifier.reactivate()` ▶ `POST /subscriptions/reactivate` ▶ 토스트 "멤버십이 재활성화되었습니다"
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `AppErrorState.fromError(error, onRetry: _refresh)`
  - 빈 플랜 응답: `_EmptyPlanCard` "이용 가능한 멤버십 플랜이 없습니다."
  - 현재 구독 없음: `_CurrentSubscriptionCard` 자체를 그리지 않고 플랜만 노출
- **모달/시트/네비게이션**:
  - `AlertDialog` (구독/해제/재활성 각각)
  - 토스트는 `AppToast.show(...)`

## 4. 서버 계약

### 개요

플랜 카탈로그(BASIC/PREMIUM) 조회 → 구독 시작(`/subscribe`) → 자동갱신 해제(`/cancel`) → 정지된 구독 재활성(`/reactivate`)을 한 컨트롤러에서 제공한다. 결제는 외부 PG가 아닌 사용자 지갑 포인트 차감(`walletSpendService.spend(SUBSCRIPTION, ...)`)으로 처리되며, `TransactionType.PERSONAL_SUBSCRIPTION_PAY`로 거래 내역에 기록된다. 자동갱신 시도(주기 만료 시)는 `SubscriptionService` 스케줄러에서 별도로 운영(본 단위 외).

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/subscriptions/plans | SubscriptionController#getPlans | 없음(공개) | 플랜 목록 (BASIC/PREMIUM) |
| GET | /api/v1/subscriptions/me | SubscriptionController#getMySubscription | required | 사용자의 가장 최근 구독 (없으면 null) |
| POST | /api/v1/subscriptions/subscribe | SubscriptionController#subscribe | required | 신규 구독 (포인트 차감 + ACTIVE 행 생성) |
| POST | /api/v1/subscriptions/cancel | SubscriptionController#cancelAutoRenew | required | 자동갱신만 해제 (만료까지 사용 가능) |
| POST | /api/v1/subscriptions/reactivate | SubscriptionController#reactivate | required | SUSPENDED 상태에서 재결제 + ACTIVE 복귀 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `SubscriptionPlan`: `BASIC("BASIC", "베이직", 4900, 30)`, `PREMIUM("PREMIUM", "프리미엄", 9900, 30)` — 단가/기간(30일) 코드 내 정의
- **Enum** `SubscriptionStatus`: `ACTIVE`, `CANCELLED`, `SUSPENDED`, `EXPIRED`
- **Enum** `TransactionType`: 결제 거래 타입 = `PERSONAL_SUBSCRIPTION_PAY`(25)
- 핵심 도메인 객체:
  - `Subscription` (`payment/model/Subscription.java`) — userId, planType, status, startedAt, expiresAt, autoRenew, price, renewalAttempts, paymentRecordId
  - `SubscriptionService`의 자동갱신 스케줄러: `MAX_RENEWAL_ATTEMPTS=3`, `GRACE_PERIOD_DAYS=7`

> **유료/무료 분리정산 — free-burn** (2026-05-24 반영): 개인 구독은 수취자가 없는 **플랫폼 매출**이라 사용처 분류상 **free-burn**이다. 결제는 `walletSpendService.spend(SUBSCRIPTION, ...)`로 차감된다. opt-in으로 무료 결제를 허용하면 무료분은 수취자 없이 지갑에서 차감(소각)된다. **단 spend 시점 프로모션 비용(PROMOTION_EXPENSE) 분개는 현재 미구현 — followup.** 구독 환불(`refundToWallet` 계열)은 전액 paid 복원(원결제 split 미보존)이며 `refundByTransaction` 전환은 followup. 정본은 정책 PRD §2.5.

### 의존 단위 / 외부 시스템

- **WalletSpendService**: 본 흐름 전체가 `spend(SUBSCRIPTION, ...)`을 통해 포인트 차감 → F06-01/03에 영향
- 다른 Unit: 멤버십 혜택은 다른 도메인이 `SubscriptionService.isPremium(userId)`를 호출하여 게이팅 적용 (Unit별 책임)
- 외부: 없음 (PG 직접 호출 없음 — 포인트 결제만)
- 알림: 본 코드에는 직접 발송 명시 없음. 자동갱신 실패 시는 별도 스케줄러가 발송 가능 (본 단위 외).

### 실제 프리미엄 혜택 게이팅 (2026-06-05 보강)

> **Fact**: 서버에서 `SubscriptionService.isPremium(long userId)`가 활성 PREMIUM 존재 여부를 판정하며, 이를 게이팅으로 쓰는 도메인은 현재 **favorite 도메인 단독**이다(소스 확인 기준 2026-06-05).

| 혜택 | 도메인 | 서버 게이팅 소스 | 클라 업셀 경로 |
|---|---|---|---|
| 관심인 한도 3명→10명 | 19 관심인 | `FavoriteService.java:162-165` — `isPremium ? premiumMax : defaultMax` | `favorite_list_screen.dart:104-125` |
| 캘린더 비공개 토글 | 19 관심인 | `PrivacySettingService.java:36-38` — `privateToFavorites && !isPremium → PREMIUM_REQUIRED` | `privacy_settings_screen.dart:78-81` |
| 가입 클럽 숨기기 토글 | 19 관심인 | `PrivacySettingService.java:45-47` — `hideClubs && !isPremium → PREMIUM_REQUIRED` | `privacy_settings_screen.dart:95-98` |

> **isPremium 구현**: `SubscriptionService`에 `isPremium(long userId)` 메서드가 존재하며, `hasActiveSubscription`(BASIC도 true)과 구분하여 **활성 PREMIUM만** 판별한다. 계획 원본(`FAVORITE_PERSON_CALENDAR_PLAN.md §2-A`)에 `BASIC+PREMIUM row 공존 시 findTopBy... false-negative` 함정이 기술되어 있어 전용 쿼리로 구현됨.
>
> **Gap**: BASIC 플랜은 현재 구독 가능하나 어떤 혜택도 게이팅하지 않는다. `BASIC → 0원 재가격 불가`(SpendCommand amount<=0 거절) 제약으로 별도 정책 결정 필요(계획서 §2-A 참조).

## 5. 프론트 계약

### 진입 경로

- 지갑 메인(F06-01) ▶ "커뮤니티 멤버십" 진입 카드 (`_MembershipEntryCard`)
- 프로필 설정 ▶ "멤버십" 메뉴 (선택)
- 구독 만료 알림(자동갱신 실패 등) 푸시 → 본 화면 직진입

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/subscription` | `payment/screens/personal_subscription_screen.dart` | 멤버십 헤로 + 현재 구독 카드 + 플랜 카드 + 정책 안내 |

### 화면별 구성 요소 & 액션

### 멤버십 (`personal_subscription_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `멤버십`
  - `_HeroCard` — primary700/primary500/warning500 그라디언트, "Community Plus / 더 적은 마찰로 모임을 운영하세요" + 현재 지갑 잔액 표기
  - `_CurrentSubscriptionCard` — 활성/예약해지/정지/만료 상태별 `_StatusPill` (이용 중 / 해지 예약 / 정지 / 만료) + 단가 + 만료일 + 액션 버튼(자동갱신 해제 / 재활성화 / 안내문)
  - "플랜 선택" 섹션 헤더
  - `_PlanCard` (베이직 / 프리미엄) — 단가, 기간, 혜택 체크리스트, "지갑으로 구독" 또는 "이용 중" 버튼
  - `_PolicyNote` — "구독은 지갑 잔액에서 결제되며, 자동갱신 해제 후에도 만료일까지 이용할 수 있습니다."
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `personalSubscriptionPlansNotifierProvider`, `personalSubscriptionNotifierProvider`, `walletNotifierProvider` 모두 invalidate
  - "지갑으로 구독" 탭 ▶ 확인 다이얼로그 ("BASIC/PREMIUM 구독 / N P가 지갑에서 차감됩니다") → 동의 시 `notifier.subscribe(planType)` ▶ `POST /subscriptions/subscribe { planType }` ▶ 토스트 "구독이 시작되었습니다"
  - 잔액 부족 사전 가드: walletBalance < plan.price면 토스트 "잔액이 부족합니다. 포인트를 충전한 뒤 다시 시도해주세요."
  - "자동갱신 해제" 탭 ▶ 확인 다이얼로그 → `notifier.cancelAutoRenew()` ▶ `POST /subscriptions/cancel` ▶ 토스트 "자동갱신을 해제했습니다"
  - "재활성화" 탭 ▶ 확인 다이얼로그 → `notifier.reactivate()` ▶ `POST /subscriptions/reactivate` ▶ 토스트 "멤버십이 재활성화되었습니다"
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `AppErrorState.fromError(error, onRetry: _refresh)`
  - 빈 플랜 응답: `_EmptyPlanCard` "이용 가능한 멤버십 플랜이 없습니다."
  - 현재 구독 없음: `_CurrentSubscriptionCard` 자체를 그리지 않고 플랜만 노출
- **모달/시트/네비게이션**:
  - `AlertDialog` (구독/해제/재활성 각각)
  - 토스트는 `AppToast.show(...)`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 구독 (Happy Path) | `/profile/wallet/subscription`, `GET /subscriptions/me` → null | 사용자 잔액 40,100P, ACTIVE 구독 1건. 거래 내역에 `PERSONAL_SUBSCRIPTION_PAY -9,900P`. |
| S2 | 자동갱신 해제 (이용은 만료까지 유지) | ACTIVE 구독 (만료 5일 후), autoRenew=true | 사용자는 만료 시점까지 PREMIUM 혜택 유지, 그 이후 자동 결제 없음. |
| S3 | 정지된 구독 재활성 | status=SUSPENDED | 잔액 -9,900, ACTIVE 구독 복귀. |
| S4 | 잔액 부족으로 구독 시도 실패 | 잔액 5,000P, PREMIUM(9,900) 구독 시도 | 충전 1건 + 구독 1건 (재시도 후). |
| S5 | 이미 활성 구독 보유한 채로 재구독 시도 | ACTIVE 상태에서 BASIC을 PREMIUM으로 바꾸려는 사용자 | 변경 없음. 사용자가 자동갱신 해제 → 만료 후 새 플랜으로 재가입하는 플로우 안내(미래 개선 영역). |
| S6 | 만료 후 동일 플랜 재구독 | 만료된 구독을 다시 시작하려는 사용자 | 새 ACTIVE 구독 1건 추가, 이전 EXPIRED 행은 그대로 보존(이력). |
| S7 | 잘못된 planType 시도 | 로그인 완료. mutation 무관 — 멱등. | 변경 없음. |

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
| 후보 | scenarios.md:162 | ## P71 매트릭스 한계 및 향후 보강 (보강 메모) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:164 | 본 절은 본 라운드 시점의 P71 미커버 시나리오와 그 사유를 기록한다. 5필드 시나리오 형식이 아닌 운영 메모이므로 check_format `보강 메모` 화이트리스트 적용. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:167 | - **S4 (잔액 부족)**: 클라 사전 가드가 서버 호출 전 차단. Provider 통한 직접 호출 매트릭스에서는 UI 가드를 우회하나, 서버 INSUFFICIENT_BALANCE 분기 자체는 P70 `pay_insufficient_prefill` 가 같은 코드 경로 (`walletService.deductFromWallet`) 로 이미 검증. 본 단위 별도 mode 보강은 alice 잔액 사전 소진 setup 이 필요 — 향후 보강 후보. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 구독 (Happy Path)**: Given `/profile/wallet/subscription`, `GET /subscriptions/me` → null When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 40,100P, ACTIVE 구독 1건. 거래 내역에 `PERSONAL_SUBSCRIPTION_PAY -9,900P`.
- **AC-02. 자동갱신 해제 (이용은 만료까지 유지)**: Given ACTIVE 구독 (만료 5일 후), autoRenew=true When 사용자가 해당 흐름을 실행하면 Then 사용자는 만료 시점까지 PREMIUM 혜택 유지, 그 이후 자동 결제 없음.
- **AC-03. 정지된 구독 재활성**: Given status=SUSPENDED When 사용자가 해당 흐름을 실행하면 Then 잔액 -9,900, ACTIVE 구독 복귀.
- **AC-04. 잔액 부족으로 구독 시도 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 충전 1건 + 구독 1건 (재시도 후).
- **AC-05. 이미 활성 구독 보유한 채로 재구독 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없음. 사용자가 자동갱신 해제 → 만료 후 새 플랜으로 재가입하는 플로우 안내(미래 개선 영역).
- **AC-06. 만료 후 동일 플랜 재구독**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 새 ACTIVE 구독 1건 추가, 이전 EXPIRED 행은 그대로 보존(이력).
- **AC-07. 잘못된 planType 시도**: Given 로그인 완료. mutation 무관 — 멱등. When 사용자가 해당 흐름을 실행하면 Then 변경 없음.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
