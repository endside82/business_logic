# F06-08. 개인 구독 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

플랜 카탈로그(유료 등급 PREMIUM 하나) 조회 → 구독 시작(`/subscribe`) → 자동갱신 해제(`/cancel`) → 정지된 구독 재활성(`/reactivate`)을 한 컨트롤러에서 제공한다. 결제는 외부 PG가 아닌 사용자 지갑 포인트 차감(`walletSpendService.spend(SUBSCRIPTION, ...)`)으로 처리되며, `TransactionType.PERSONAL_SUBSCRIPTION_PAY`로 거래 내역에 기록된다. 자동갱신 시도(주기 만료 시)는 `SubscriptionService` 스케줄러에서 별도로 운영(본 단위 외).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "커뮤니티 멤버십" 진입 카드 (`_MembershipEntryCard`)
- 프로필 설정 ▶ "멤버십" 메뉴 (선택)
- 구독 만료 알림(자동갱신 실패 등) 푸시 → 본 화면 직진입

## 2. 코드 위치

계약의 정본은 코드다. 서버: `SubscriptionController`, `Subscription`, `SubscriptionService`, `ClubSubscriptionStatus`, `FavoriteService`, `PrivacySettingService`, `WalletSpendService`. 앱: `favorite_list_screen.dart`, `privacy_settings_screen.dart`, `personal_subscription_screen.dart`.

<!-- source-references:start -->
서버 창구: `SubscriptionController#getPlans`, `SubscriptionController#getMySubscription`, `SubscriptionController#subscribe`, `SubscriptionController#cancelAutoRenew`, `SubscriptionController#reactivate`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 멤버십 (`personal_subscription_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `멤버십`
  - `_HeroCard` — primary700/primary500/warning500 그라디언트, "Community Plus / 더 적은 마찰로 모임을 운영하세요" + 현재 지갑 잔액 표기
  - `_CurrentSubscriptionCard` — 활성/예약해지/정지/만료 상태별 `_StatusPill` (이용 중 / 해지 예약 / 정지 / 만료) + 단가 + 만료일 + 액션 버튼(자동갱신 해제 / 재활성화 / 안내문)
  - "플랜 선택" 섹션 헤더
  - `_PlanCard` (서버가 주는 프리미엄 하나) — 단가, 기간, 혜택 체크리스트, "지갑으로 구독" 또는 "이용 중" 버튼
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

## 4. 제품 규칙

- 유료 등급은 PREMIUM 하나이고 30일 2,800P다. 값은 운영 설정으로 바꿀 수 있다. 구독하지 않은 상태가 무료 등급이다. BASIC 은 옛 행 호환용으로 목록에 없고 새로 구독할 수 없다.
- 상태는 ACTIVE, CANCELLED(자동 갱신 해제, 만료일까지 이용), SUSPENDED, EXPIRED, REFUNDING(운영 환불 진행 중) 다섯이다.
- 결제는 유료 우선 차감이다. 받는 사람이 없는 플랫폼 매출이라 쓰인 무료 포인트는 누구에게도 넘어가지 않는다.
- 돈 이동이 닫혀 있으면 구독과 재활성을 거절한다.
- 자동 갱신이 실패하면 1, 2회째는 결제 실패 알림을 보낸다. 3회째는 SUSPENDED 로 바꾸고 7일 유예를 주며 알림을 보낸다. 유예 안에 재활성하면 새 기간이 시작되고, 유예가 지나면 EXPIRED 가 되고 만료 알림이 간다.
- CANCELLED 는 만료일이 지나면 EXPIRED 가 된다. 서버가 여러 대여도 한 구독은 한 번만 결제된다.
- 운영 환불은 환불 대상을 REFUNDING 으로 먼저 잡아 동시 환불을 막고, 원결제의 유료·무료 구성을 복원한다.

| PREMIUM 혜택 | 없을 때 |
|---|---|
| 관심인 10명 | 3명까지 등록 |
| 관심인에게 캘린더 공개 제어 | 켜면 PREMIUM_REQUIRED |
| Google 캘린더 자동 동기화 | 켜면 PREMIUM_REQUIRED |
| 클럽 숨김 | 켜면 PREMIUM_REQUIRED |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 구독 (Happy Path) | `/profile/wallet/subscription`, `GET /subscriptions/me` → null | 사용자 잔액 47,200P, ACTIVE 구독 1건. 거래 내역에 `PERSONAL_SUBSCRIPTION_PAY -2,800P`. |
| S2 | 자동갱신 해제 (이용은 만료까지 유지) | ACTIVE 구독 (만료 5일 후), autoRenew=true | 사용자는 만료 시점까지 PREMIUM 혜택 유지, 그 이후 자동 결제 없음. |
| S3 | 정지된 구독 재활성 | status=SUSPENDED | 잔액 -2,800, ACTIVE 구독 복귀. |
| S4 | 잔액 부족으로 구독 시도 실패 | 잔액 2,000P, PREMIUM(2,800) 구독 시도 | 충전 1건 + 구독 1건 (재시도 후). |
| S5 | 이미 활성 구독 보유한 채로 재구독 시도 | ACTIVE 상태에서 BASIC을 PREMIUM으로 바꾸려는 사용자 | 변경 없음. 사용자가 자동갱신 해제 → 만료 후 새 플랜으로 재가입하는 플로우 안내(미래 개선 영역). |
| S6 | 만료 후 동일 플랜 재구독 | 만료된 구독을 다시 시작하려는 사용자 | 새 ACTIVE 구독 1건 추가, 이전 EXPIRED 행은 그대로 보존(이력). |
| S7 | 잘못된 planType 시도 | 로그인 완료. mutation 무관 — 멱등. | 변경 없음. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | scenarios.md:162 | ## P71 매트릭스 한계 및 향후 보강 (보강 메모) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:164 | 본 절은 본 라운드 시점의 P71 미커버 시나리오와 그 사유를 기록한다. 5필드 시나리오 형식이 아닌 운영 메모이므로 check_format `보강 메모` 화이트리스트 적용. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:167 | - **S4 (잔액 부족)**: 클라 사전 가드가 서버 호출 전 차단. Provider 통한 직접 호출 매트릭스에서는 UI 가드를 우회하나, 서버 INSUFFICIENT_BALANCE 분기 자체는 P70 `pay_insufficient_prefill` 가 같은 코드 경로 (`walletService.deductFromWallet`) 로 이미 검증. 본 단위 별도 mode 보강은 alice 잔액 사전 소진 setup 이 필요 — 향후 보강 후보. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 구독 (Happy Path)**: Given `/profile/wallet/subscription`, `GET /subscriptions/me` → null When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 47,200P, ACTIVE 구독 1건. 거래 내역에 `PERSONAL_SUBSCRIPTION_PAY -2,800P`.
- **AC-02. 자동갱신 해제 (이용은 만료까지 유지)**: Given ACTIVE 구독 (만료 5일 후), autoRenew=true When 사용자가 해당 흐름을 실행하면 Then 사용자는 만료 시점까지 PREMIUM 혜택 유지, 그 이후 자동 결제 없음.
- **AC-03. 정지된 구독 재활성**: Given status=SUSPENDED When 사용자가 해당 흐름을 실행하면 Then 잔액 -2,800, ACTIVE 구독 복귀.
- **AC-04. 잔액 부족으로 구독 시도 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 충전 1건 + 구독 1건 (재시도 후).
- **AC-05. 이미 활성 구독 보유한 채로 재구독 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없음. 사용자가 자동갱신 해제 → 만료 후 새 플랜으로 재가입하는 플로우 안내(미래 개선 영역).
- **AC-06. 만료 후 동일 플랜 재구독**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 새 ACTIVE 구독 1건 추가, 이전 EXPIRED 행은 그대로 보존(이력).
- **AC-07. 잘못된 planType 시도**: Given 로그인 완료. mutation 무관 — 멱등. When 사용자가 해당 흐름을 실행하면 Then 변경 없음.
