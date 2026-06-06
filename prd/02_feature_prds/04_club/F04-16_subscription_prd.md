# F04-16. 클럽 구독 (시작/갱신/해지/재활성) PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05; unit: business_logic/units/04_club/F04-16_subscription -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-16_subscription`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

**클럽장(OWNER)이 플랫폼에 운영비를 지불하는 정기 구독.** 사용자 관점의 멤버 구독이 아니라 클럽 단위 운영료. FREE 클럽은 월 10,000 / 연 100,000원, BUSINESS 클럽은 월 30,000 / 연 300,000원. 결제 우선순위는 **ClubFund(클럽 기금) → 부족분 OWNER 지갑**. 만료 임박 시 자동 갱신, 결제 실패 3회시 SUSPENDED + 7일 유예 후 EXPIRED.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ (OWNER 전용) "구독" 또는 클럽 설정에서 "구독 관리"
- 마이페이지 ▶ "구독 관리" — 본인이 OWNER인 클럽들의 구독 일괄 관리
- 자동 갱신 실패 / SUSPENDED 푸시 알림 ▶ 구독 관리 화면

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-16_subscription/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-16_subscription/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-16_subscription/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-16_subscription/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:382` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:390` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:402` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:410` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java:418` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **플랜 화면 진입**: `subscriptionPlanProvider(clubId)` ▶ `ClubSubscriptionRepository.getPlans(clubId)` ▶ `GET /subscription/plans` (비인증 가능)
2. **현재 구독 조회**: `subscriptionProvider(clubId)` ▶ `GET /subscription` (없으면 `CLUB_NOT_MEMBER` → 화면에 미가입 표시)
3. **구독 시작**: 결제 수단 선택 → `subscribe(clubId, ClubSubscriptionParam{planType, autoRenew})` ▶ `POST /subscription` ▶ invalidate(clubFund, subscription)
4. **해지**: `cancelSubscription(clubId)` ▶ `DELETE /subscription` ▶ invalidate
5. **재활성**: `reactivateSubscription(clubId)` ▶ `POST /subscription/reactivate` ▶ invalidate
6. **풀투리프레시**: 구독 + 기금 + 결제 이력 invalidate

## 4. 서버 계약

### 개요

**클럽장(OWNER)이 플랫폼에 운영비를 지불하는 정기 구독.** 사용자 관점의 멤버 구독이 아니라 클럽 단위 운영료. FREE 클럽은 월 10,000 / 연 100,000원, BUSINESS 클럽은 월 30,000 / 연 300,000원. 결제 우선순위는 **ClubFund(클럽 기금) → 부족분 OWNER 지갑**. 만료 임박 시 자동 갱신, 결제 실패 3회시 SUSPENDED + 7일 유예 후 EXPIRED.

> 결제·회계 처리는 결제/지갑 Unit(`WalletService`, `AccountingLedgerService`)에 위임. 본 Unit은 구독 라이프사이클 + 결제 트리거.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/clubs/{id}/subscription/plans` | `ClubController#getSubscriptionPlans` | 비인증 가능 | 클럽 타입별 월/연 플랜 |
| POST | `/api/v1/clubs/{id}/subscription` | `ClubController#subscribe` | OWNER | 구독/갱신 |
| GET | `/api/v1/clubs/{id}/subscription` | `ClubController#getSubscription` | OWNER | 구독 상태 |
| DELETE | `/api/v1/clubs/{id}/subscription` | `ClubController#cancelSubscription` | OWNER | 자동 갱신 취소 (즉시 종료 아님) |
| POST | `/api/v1/clubs/{id}/subscription/reactivate` | `ClubController#reactivateSubscription` | OWNER | SUSPENDED → ACTIVE 재활성 |

### 의존 단위 / 외부 시스템

- **Unit 결제/지갑 (별 Unit)**:
  - `WalletService.deductFromWallet`(부족분 차감)
  - `AccountingLedgerService.recordClubSubscriptionFromFund/Wallet` (분개)
  - `PointTransaction` (거래 이력)
- **F04-13 (ClubFund)**: `deductFromFund` 우선 차감 → 우선순위 결제.
- **알림**: 결제 실패 단계별 `PAYMENT_FAILED`, 만료 시 `SUBSCRIPTION_EXPIRED` (별 Unit `NotificationService.createNotification`).
- **Unit 04 자체 (F04-10 / F04-12)**: BUSINESS 클럽 운영 구독이 만료되면 공지/이벤트 작성 차단 (`validateClubSubscription`).
- **F04-03 소유권 이전**: 소유권 이전 시 구 오너 활성 구독 즉시 CANCELLED + `autoRenew=false`. 신 오너 구독 자동 생성 없음. `club.subscriptionExpiresAt` 폴백으로 기간 내 혜택 유지.
- **외부**: PG 직접 결제 미연동. 모든 결제는 ClubFund/지갑 잔액에서. (스펙 SCR-CF-005에는 "신용/체크카드", "간편결제(카카오페이)" 옵션이 있으나 서버 미구현 — `(서버 미연동)`)

### processAutoRenewals owner-mismatch 가드 (5f70d1b, 2026-06-04)

소스: `ClubSubscriptionService.java:210-234`

- 자동 갱신 배치 실행 시, 구독 `userId != club.ownerId` 인 stale row 탐지
- `sub.cancel()` + `sub.setAutoRenew(false)` 후 continue (재청구/알림 없이 조용히 정리)
- 로그: `[CLUB_SUBSCRIPTION] stale subscription cancelled (owner mismatch)`
- 목적: 소유권 이전 후 구 오너 구독이 배치에서 재청구되는 것을 방어

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ (OWNER 전용) "구독" 또는 클럽 설정에서 "구독 관리"
- 마이페이지 ▶ "구독 관리" — 본인이 OWNER인 클럽들의 구독 일괄 관리
- 자동 갱신 실패 / SUSPENDED 푸시 알림 ▶ 구독 관리 화면

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/club/finance/...) | 역할 |
|---|---|---|
| `/clubs/:clubId/subscriptions` | `screens/subscription_screen.dart` | 클럽 운영 구독 플랜 선택 (SCR-CF-005) |
| `/clubs/:clubId/subscriptions/manage` | `screens/subscription_manage_screen.dart` | 운영 구독 관리 (SCR-CF-006) |

라우트 상수: `Routes.clubSubscriptions`(`...:69`), `clubSubscriptionManage`(`...:70`).

> 실제 서버 모델은 **OWNER가 플랫폼에 운영비를 내는 구조** (`subscribe`는 비오너 `CLUB_NOT_OWNER` 403).
> **2026-06-04 P2-② 정정 완료**: 클라 두 화면 모두 비오너 게이팅("클럽장 전용 메뉴입니다") + 문구를
> "클럽 운영 구독"으로 정정, 서버 plans 혜택 문구도 실제 게이트되는 운영 기능
> (`ClubSubscriptionFeature`: 이벤트 게시/공지/멤버 초대/상한 확장/사진 앨범) 기준의 오너 관점으로
> 교체했다 (구 "Basic/Premium 멤버 혜택" 문구는 서버에 없는 기능이라 폐기). 앱 스펙
> `17-club-finance.md` SCR-CF-005/006 도 동일 기준으로 갱신됨.

### 화면별 구성 요소 & 액션

### 클럽 운영 구독 (`subscription_screen.dart`)
- **오너 게이팅**: 클럽 상세 `myRole != OWNER` 이면 플랜/구독 조회 없이 "클럽장 전용 메뉴입니다" 안내만 노출
- **사용자가 보는 것** (SCR-CF-005, OWNER):
  - AppBar "클럽 운영 구독", 부제 "{클럽명} 운영 구독 플랜"
  - 플랜 카드 2개 (`finance/widgets/subscription_plan_card.dart`):
    - MONTHLY: "₩{FREE_MONTHLY 또는 BUSINESS_MONTHLY} / 월", description "월간 운영 구독 플랜", benefits(운영 기능)
    - YEARLY: "₩{FREE_YEARLY 또는 BUSINESS_YEARLY} / 년", description "연간 운영 구독 플랜 (2개월 할인)", benefits
  - 안내 텍스트: 자동 갱신/해지 + "구독료(운영비)는 클럽 기금에서 우선 차감되며, 부족분은 클럽장 지갑에서 결제됩니다."
  - 이미 구독 중인 플랜에는 "현재 플랜" 배지
- **사용자가 할 수 있는 액션**:
  - 플랜 카드의 "구독하기" 버튼 ▶ `payment_method_sheet.dart` (BottomSheet) 표시:
    - 내 지갑 단일 옵션 (부제 "클럽 기금에서 우선 차감 후 부족분 결제") — 2026-06-04 P2-② 정정으로
      서버에 없는 신용카드/간편결제 옵션 제거 (서버 subscribe 는 결제수단 파라미터 없이 기금→지갑 고정)
  - "결제하기" → 확인 → `POST /clubs/{clubId}/subscription` (`{planType, autoRenew: true}`)
  - 성공 → "구독이 시작되었습니다" 토스트 → 구독 관리 화면으로 이동

### 운영 구독 관리 (`subscription_manage_screen.dart`)
- **오너 게이팅**: SCR-CF-005 와 동일 — 비오너는 "클럽장 전용 메뉴입니다" 안내만 노출 (AppBar "운영 구독 관리")
- **사용자가 보는 것** (SCR-CF-006, OWNER):
  - 구독 정보 카드 (`subscription_info_card.dart`): 클럽명, 플랜명, 상태(`subscription_status_badge.dart`), 시작일, 다음 결제일, 결제 금액, 결제 수단
  - 결제 이력 (`payment_history_list.dart`, 최근 6건): 결제일/금액/결과 — **현재 서버 GET /subscription 응답에 결제 이력 별도 없음** → 클라이언트가 거래 내역(별 Unit) 또는 별도 API로 조립 필요 `(미확인)`
  - 플랜 변경 영역: 다른 플랜 정보 + "변경하기"
  - 구독 해지 영역 (Danger): "구독을 해지하면 다음 결제일({만료일})까지 이용 가능합니다." + "구독 해지" 버튼
- **사용자가 할 수 있는 액션**:
  - "변경하기" ▶ 다른 plan으로 `POST /subscription`(즉시 갱신) — 가격 차이 처리는 서버 측 결제 로직(차액 처리는 `(미확인)`, 현재 코드는 단순히 새 plan 가격 전액 결제)
  - "구독 해지" → `cancel_subscription_dialog.dart` → `DELETE /clubs/{clubId}/subscription`
    - 응답 후 status=CANCELLED 표시 (만료일까지 혜택 유지)
  - SUSPENDED 상태에서 "재활성" → `POST /subscription/reactivate`

### 상태별 UI (스펙)

| 서버 status | 배지 라벨 | 배지 색 | 가능 액션 |
|---|---|---|---|
| `ACTIVE` | "구독 중" | 녹색 dot (`subscription.active` #4CAF50) | 플랜 변경, 구독 해지 |
| `CANCELLED` | "해지 예정 ({만료일}까지)" | 노란색 dot (`subscription.cancelling` #FF9800) | 해지 취소(=재구독, 현재 별도 API 없음 — 만료 후 새 구독) |
| `SUSPENDED` | "일시정지 (결제 실패)" | 빨간색 dot (`subscription.suspended` #F44336) | 결제 수단 변경, 재활성 (`/reactivate`) |
| `EXPIRED` | "만료" | 회색 dot (`subscription.expired` #9E9E9E) | 재구독 (=`POST /subscription`) |

### API 호출 순서 (Provider/Repository 관점)

1. **플랜 화면 진입**: `subscriptionPlanProvider(clubId)` ▶ `ClubSubscriptionRepository.getPlans(clubId)` ▶ `GET /subscription/plans` (비인증 가능)
2. **현재 구독 조회**: `subscriptionProvider(clubId)` ▶ `GET /subscription` (없으면 `CLUB_NOT_MEMBER` → 화면에 미가입 표시)
3. **구독 시작**: 결제 수단 선택 → `subscribe(clubId, ClubSubscriptionParam{planType, autoRenew})` ▶ `POST /subscription` ▶ invalidate(clubFund, subscription)
4. **해지**: `cancelSubscription(clubId)` ▶ `DELETE /subscription` ▶ invalidate
5. **재활성**: `reactivateSubscription(clubId)` ▶ `POST /subscription/reactivate` ▶ invalidate
6. **풀투리프레시**: 구독 + 기금 + 결제 이력 invalidate

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | OWNER가 새 클럽의 월간 구독 시작 (Happy Path) | 클럽 생성 직후 `subscriptionExpiresAt = null`, 기금 잔액 0, 본인 지갑 잔액 50,000. | club_subscription 1행 ACTIVE, wallet -10,000, 분개 기록. |
| S2 | 자동 갱신 — 만료 D-1 | ACTIVE 구독, expiresAt=now+1day, autoRenew=true. | 동일 row 갱신, 알림 미발송(성공 시). |
| S3 | 자동 갱신 결제 실패 1회차 → 알림 | 지갑 잔액 부족. | status=ACTIVE 유지, attempts=1. |
| S4 | 자동 갱신 3회 실패 → SUSPENDED + 7일 유예 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | SUSPENDED 상태에서 OWNER 재활성 | 시나리오 본문 참조 | 정상 ACTIVE 복귀. |
| S6 | 7일 유예 만료 → EXPIRED | SUSPENDED, gracePeriodUntil < now. | BUSINESS 클럽이면 `validateClubSubscription` 차단(공지/이벤트 작성 불가). |
| S7 | OWNER가 자동 갱신 취소 (해지 예약) | ACTIVE, 만료일 D-15. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 플랜 변경 (월간 → 연간) | ACTIVE MONTHLY 구독. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | OWNER 아닌 사용자 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 비로그인 사용자가 플랜 조회 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| **해소** | dossier §4-E / 5f70d1b (2026-06-04) | **소유권 이전 시 구 오너 구독 처리** — `ClubService.transferOwnership`에서 구 오너 활성 구독 즉시 CANCELLED + autoRenew=false. processAutoRenewals owner-mismatch stale row 가드 추가. **구현 완료** (5f70d1b, 2026-06-04) | 완료 |
| 후보 | backend.md:136 | **외부 PG 미연동**: PG 직접 결제 미연동. 모든 결제는 ClubFund/지갑 잔액에서. (스펙 SCR-CF-005에는 "신용/체크카드", "간편결제(카카오페이)" 옵션이 있으나 서버 미구현) | Decision Needed: PG 연동 여부 결정 |
| 후보 | frontend.md:41 | **결제 이력 조회 미확인**: 서버 GET /subscription 응답에 결제 이력 별도 없음 → 클라이언트가 거래 내역(별 Unit) 또는 별도 API로 조립 필요 | 실제 소스 대조 확인 |
| 후보 | frontend.md:45 | **플랜 변경 차액 처리 미구현**: 월간→연간 변경 시 잔여 월간 환불 없이 풀가격 청구. 클라이언트 안내 필요 | Decision Needed: 차액 처리 정책 결정 |
| 정보 | G5 (dossier) | **신 오너 구독 없음 + subscriptionExpiresAt 폴백**: 소유권 이전 후 신 오너에게 즉시 구독 안내 화면 없음. 앱 구독 관리 화면은 별도 진입 필요 | 신 오너 대상 구독 안내 UX 추가 검토 |
| 해소 (2026-06-06) | community_admin_api ManageClubSubscriptionService.java:108-180 (29e6430), api ClubSubscriptionStatus.java:14 | **클럽구독 환불 정합(C3/C4/H1) 해소** — admin 클럽구독 환불이 ① **지갑 부담분(`walletPaidAmount`) 기준 일할 환불**(`walletTransactionId==null`/`walletPaidAmount==0`이면 거부), ② community_api internal 위임(`refunds/by-transaction`)으로 split·lot·매출 역분개 정합, ③ 환불 중 `ClubSubscriptionStatus.REFUNDING` 선점으로 동시 중복 환불·취소 차단(멱등키 resume), ④ C4 잔여 멱등 적용. 과거 admin 전액-paid 직접 입금(split 파괴) 제거. | 없음 |

## 9. 수용 기준

- **AC-01. OWNER가 새 클럽의 월간 구독 시작 (Happy Path)**: Given 클럽 생성 직후 `subscriptionExpiresAt = null`, 기금 잔액 0, 본인 지갑 잔액 50,000. When 사용자가 해당 흐름을 실행하면 Then club_subscription 1행 ACTIVE, wallet -10,000, 분개 기록.
- **AC-02. 자동 갱신 — 만료 D-1**: Given ACTIVE 구독, expiresAt=now+1day, autoRenew=true. When 사용자가 해당 흐름을 실행하면 Then 동일 row 갱신, 알림 미발송(성공 시).
- **AC-03. 자동 갱신 결제 실패 1회차 → 알림**: Given 지갑 잔액 부족. When 사용자가 해당 흐름을 실행하면 Then status=ACTIVE 유지, attempts=1.
- **AC-04. 자동 갱신 3회 실패 → SUSPENDED + 7일 유예**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. SUSPENDED 상태에서 OWNER 재활성**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 ACTIVE 복귀.
- **AC-06. 7일 유예 만료 → EXPIRED**: Given SUSPENDED, gracePeriodUntil < now. When 사용자가 해당 흐름을 실행하면 Then BUSINESS 클럽이면 `validateClubSubscription` 차단(공지/이벤트 작성 불가).
- **AC-07. OWNER가 자동 갱신 취소 (해지 예약)**: Given ACTIVE, 만료일 D-15. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 플랜 변경 (월간 → 연간)**: Given ACTIVE MONTHLY 구독. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. OWNER 아닌 사용자 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 비로그인 사용자가 플랜 조회**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
