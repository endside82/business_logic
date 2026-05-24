# F06-07. 호스팅 티켓 구매 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-07_hosting-ticket -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-07_hosting-ticket`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

프라이빗 모임 개최 권리(호스팅 티켓)를 보유 포인트로 구매한다. 단가는 서버 상수 `TICKET_PRICE = 3,000원`이며 사용자는 한 번에 1~100장 구매 가능. 결제는 `walletSpendService.spend(HOSTING_TICKET_PURCHASE, ...)`로 차감(무료 미허용 시 유료만 차감) 후 6개월 만료 티켓 1행을 생성. 보유 티켓은 만료 전 + 잔여 수량 > 0인 항목만 노출.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 프로필/지갑 메뉴 ▶ "호스팅 티켓" 진입 (`/profile/wallet/hosting-tickets`)
- 프라이빗 모임 개최 시작 화면(Unit 09) ▶ 티켓 부족 시 본 화면으로 분기
- 결제 완료 모달의 후속 추천 (호스트 활동 시작 가이드)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-07_hosting-ticket/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-07_hosting-ticket/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-07_hosting-ticket/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-07_hosting-ticket/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/HostingTicketController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/HostingTicketController.java:33` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 호스팅 티켓 (`hosting_ticket_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `호스팅 티켓`
  - 활성 티켓이 있으면 "현재 티켓 / N 이용중 / 다음 결제일: -" 배너 (#E8F5E9 r=12 p=16)
  - 만료 임박 배너 (3일/7일 이내 차등 색상 — `_getTicketExpirationInfo`)
  - 만료된 티켓 안내 (gray50 배경, "만료된 티켓 N건이 있습니다")
  - 티어 카드 (UI/UX 20에 정의된 3개 티어 — Basic 3,000원 / Standard 8,000원 / Premium 15,000원). **클라가 자체 정의** (서버 `hosting-tickets` API는 보유 티켓 목록만 반환, 티어 메타는 클라 하드코딩 `TicketTier.tiers`)
  - 각 카드: 티켓명 + 가격 + 유효기간 + 혜택 체크리스트 + "구매하기" 버튼
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `ref.refresh(hostingTicketNotifierProvider.future)` ▶ `GET /api/v1/hosting-tickets`
  - 티어 카드 "구매하기" 탭 ▶ `_showPurchaseDialog(...)` → `TicketPurchaseDialog`
  - 다이얼로그 "구매" 탭 ▶ `hostingTicketNotifier.purchase(1)` ▶ `POST /api/v1/hosting-tickets/purchase { count: 1 }`
  - 잔액 부족(`INSUFFICIENT_PAID_BALANCE`) ▶ 다이얼로그/토스트 안내 → 충전 화면 분기
  - 다이얼로그 "취소" ▶ 모달 닫기
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `Center(... '티켓 정보를 불러올 수 없습니다' + 다시 시도)`
  - 빈 보유 상태: 활성 배너/만료 배너 없음, 티어 카드만 노출
- **모달/시트/네비게이션**:
  - `TicketPurchaseDialog(tier, balance, onConfirm)` — 잔액 비교 + 결제 확인

## 4. 서버 계약

### 개요

프라이빗 모임 개최 권리(호스팅 티켓)를 보유 포인트로 구매한다. 단가는 서버 상수 `TICKET_PRICE = 3,000원`이며 사용자는 한 번에 1~100장 구매 가능. 결제는 `walletSpendService.spend(HOSTING_TICKET_PURCHASE, ...)`로 차감(무료 미허용 시 유료만 차감) 후 6개월 만료 티켓 1행을 생성. 보유 티켓은 만료 전 + 잔여 수량 > 0인 항목만 노출.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/hosting-tickets | HostingTicketController#getAvailableTickets | required | 사용자의 사용 가능 티켓 목록 |
| POST | /api/v1/hosting-tickets/purchase | HostingTicketController#purchaseTicket | required | 포인트 차감 후 티켓 구매 (201) |

### 도메인 모델 / Enum (이 기능 관련)

- **상수**: `HostingTicketService.TICKET_PRICE = 3000L` (서버 단가). 다른 단가는 본 코드에 없음.
- **만료 정책**: 구매 시점 + 6개월 (`now.plusMonths(6)`)
- 핵심 도메인 객체:
  - `HostingTicket` (`payment/model/HostingTicket.java`) — userId, totalCount, remainCount, purchasedAt, expiresAt, createdAt/updatedAt
  - 사용/반환 메서드: `useOne()` (잔량 -1), `restoreOne()` (반환 +1)
- 추가 서비스: `HostingTicketExpirationScheduler` — 만료 티켓을 주기적으로 정리 (본 단위 외)

> **유료/무료 분리정산 — free-burn** (2026-05-24 반영): 호스팅 티켓은 수취자가 없는 **플랫폼 매출**이라 사용처 분류상 **free-burn**이다. 결제는 `walletSpendService.spend(HOSTING_TICKET_PURCHASE, ...)`로 차감된다. opt-in으로 무료 결제를 허용하면 무료분은 수취자 없이 지갑에서 차감(소각)된다(별도 수취자에게 전파되지 않음). **단 spend 시점 프로모션 비용(PROMOTION_EXPENSE) 분개는 현재 미구현 — followup.** 정본은 정책 PRD §2.5.

### 의존 단위 / 외부 시스템

- **Private Date Unit (09)**: 호스팅 티켓은 프라이빗 모임 개최 시 `useTicket(userId)`로 1장 소비, 모임 취소 시 `releaseTicket`으로 복원. 본 단위는 구매·조회만 다룸.
- 외부: 없음. PG 직접 호출 없음. (잔액 부족 시 사용자가 충전 → 잔액 보충 후 본 API 재호출)
- 알림: 없음 (UI/UX 19~20에 명시된 알림 없음)

## 5. 프론트 계약

### 진입 경로

- 프로필/지갑 메뉴 ▶ "호스팅 티켓" 진입 (`/profile/wallet/hosting-tickets`)
- 프라이빗 모임 개최 시작 화면(Unit 09) ▶ 티켓 부족 시 본 화면으로 분기
- 결제 완료 모달의 후속 추천 (호스트 활동 시작 가이드)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/hosting-tickets` | `payment/screens/hosting_ticket_screen.dart` | 호스팅 티어 카드 목록 + 구매 다이얼로그 |

### 화면별 구성 요소 & 액션

### 호스팅 티켓 (`hosting_ticket_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `호스팅 티켓`
  - 활성 티켓이 있으면 "현재 티켓 / N 이용중 / 다음 결제일: -" 배너 (#E8F5E9 r=12 p=16)
  - 만료 임박 배너 (3일/7일 이내 차등 색상 — `_getTicketExpirationInfo`)
  - 만료된 티켓 안내 (gray50 배경, "만료된 티켓 N건이 있습니다")
  - 티어 카드 (UI/UX 20에 정의된 3개 티어 — Basic 3,000원 / Standard 8,000원 / Premium 15,000원). **클라가 자체 정의** (서버 `hosting-tickets` API는 보유 티켓 목록만 반환, 티어 메타는 클라 하드코딩 `TicketTier.tiers`)
  - 각 카드: 티켓명 + 가격 + 유효기간 + 혜택 체크리스트 + "구매하기" 버튼
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `ref.refresh(hostingTicketNotifierProvider.future)` ▶ `GET /api/v1/hosting-tickets`
  - 티어 카드 "구매하기" 탭 ▶ `_showPurchaseDialog(...)` → `TicketPurchaseDialog`
  - 다이얼로그 "구매" 탭 ▶ `hostingTicketNotifier.purchase(1)` ▶ `POST /api/v1/hosting-tickets/purchase { count: 1 }`
  - 잔액 부족(`INSUFFICIENT_PAID_BALANCE`) ▶ 다이얼로그/토스트 안내 → 충전 화면 분기
  - 다이얼로그 "취소" ▶ 모달 닫기
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `Center(... '티켓 정보를 불러올 수 없습니다' + 다시 시도)`
  - 빈 보유 상태: 활성 배너/만료 배너 없음, 티어 카드만 노출
- **모달/시트/네비게이션**:
  - `TicketPurchaseDialog(tier, balance, onConfirm)` — 잔액 비교 + 결제 확인

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 호스팅 티켓 구매 (Happy Path) | `/profile/wallet/hosting-tickets`, 보유 티켓 0건 | 보유 티켓 1장, 6개월 유효기간. 사용자는 프라이빗 모임 개최 가능. |
| S2 | 잔액 부족 → 충전 분기 → 재구매 | 잔액 1,500P, 3,000P Basic 구매 시도 | 충전 1건 + 티켓 1장. 사용자가 의식적으로 두 번의 액션을 거침. |
| S3 | 만료 임박 티켓 안내 (3일 이내) | 6개월 전에 구매한 티켓이 곧 만료 | 사용자가 만료 전 사용 또는 재구매 결정 가능. |
| S4 | 만료된 티켓 안내 | 사용 안 한 티켓이 만료됨 | UI 안내만. 환불 없음. |
| S5 | 다른 도메인에서 티켓 사용 | 프라이빗 모임 개최 시작 화면(Unit 09)에서 티켓 1장 자동 사용 | F06-07 단위 입장에서는 외부 호출 영향만 받음. 직접 노출되는 화면은 본 화면. |
| S6 | 비정상 count (101장 시도) | 잘못된 클라이언트 | 변경 없음. |

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
| 후보 | backend.md:66 | > 주의: `WalletService.deductPaidOnly`의 거래 타입은 `TransactionType.MEETING_SETTLEMENT`로 통일되어 있고, 호스팅 티켓 구매 식별은 `referenceType=HOSTING_TICKET_PURCHASE`로 한다. UI/거래 내역에서는 `referenceType` 또는 description으로 호스팅 티켓을 분리 노출해야 한다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:49 | - 단, 현재 서버 `purchaseTicket`은 `count`만 받아 단가 × count로 차감하므로 UI에서 "Standard 8,000원 = 단가 8,000 × 1장"을 의도하면 `count`로는 표현 불가. 실제 서버 호출은 항상 `count: 1` (단가 3,000원). UI/UX 20의 티어 가격은 **현재 서버 구현과 정합되지 않음** (서비스 미확인 영역). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:47 | 2. 단, 클라 화면이 별도 hosting_tickets 전체 조회 등을 통해 만료 정보를 가지고 있다면 "만료된 티켓 N건이 있습니다" 안내 (현재 코드는 같은 응답에서 `remainCount==0 && expiresAt!=null`인 것만 카운트하지만 서버는 조건상 그런 행을 빼므로 실제로는 0건일 가능성) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 호스팅 티켓 구매 (Happy Path)**: Given `/profile/wallet/hosting-tickets`, 보유 티켓 0건 When 사용자가 해당 흐름을 실행하면 Then 보유 티켓 1장, 6개월 유효기간. 사용자는 프라이빗 모임 개최 가능.
- **AC-02. 잔액 부족 → 충전 분기 → 재구매**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 충전 1건 + 티켓 1장. 사용자가 의식적으로 두 번의 액션을 거침.
- **AC-03. 만료 임박 티켓 안내 (3일 이내)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 만료 전 사용 또는 재구매 결정 가능.
- **AC-04. 만료된 티켓 안내**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then UI 안내만. 환불 없음.
- **AC-05. 다른 도메인에서 티켓 사용**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then F06-07 단위 입장에서는 외부 호출 영향만 받음. 직접 노출되는 화면은 본 화면.
- **AC-06. 비정상 count (101장 시도)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없음.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
