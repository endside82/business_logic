# F06-07. 호스팅 티켓 구매 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

프라이빗 모임 개최 권리(호스팅 티켓)를 보유 포인트로 구매한다. 단가는 서버 상수 `TICKET_PRICE = 3,000원`이며 사용자는 한 번에 1~100장 구매 가능. 결제는 `walletSpendService.spend(HOSTING_TICKET_PURCHASE, ...)`로 차감(무료 미허용 시 유료만 차감) 후 6개월 만료 티켓 1행을 생성. 보유 티켓은 만료 전 + 잔여 수량 > 0인 항목만 노출.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 프로필/지갑 메뉴 ▶ "호스팅 티켓" 진입 (`/profile/wallet/hosting-tickets`)
- 프라이빗 모임 개최 시작 화면(Unit 09) ▶ 티켓 부족 시 본 화면으로 분기
- 결제 완료 모달의 후속 추천 (호스트 활동 시작 가이드)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `HostingTicketController`, `HostingTicket`, `HostingTicketService`. 앱: `hosting_ticket_screen.dart`.

<!-- source-references:start -->
서버 창구: `HostingTicketController#getAvailableTickets`, `HostingTicketController#purchaseTicket`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 호스팅 티켓 (`hosting_ticket_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `호스팅 티켓`
  - 활성 티켓이 있으면 "현재 티켓 / N 이용중 / 다음 결제일: -" 배너 (#E8F5E9 r=12 p=16)
  - 만료 임박 배너 (3일/7일 이내 차등 색상 — `_getTicketExpirationInfo`)
  - 만료된 티켓 안내 (gray50 배경, "만료된 티켓 N건이 있습니다")
  - 남은 장수와 가장 먼저 끝나는 만료일. 값은 1장 3,000원 하나이고 등급 카드는 없다.
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `ref.refresh(hostingTicketNotifierProvider.future)` ▶ `GET /api/v1/hosting-tickets`
  - 수량을 정해 구매 확인 창을 연다.
  - 확인 창 "구매" 탭 ▶ 고른 수량으로 구매하고 "이벤트 개설권 N장을 구매했습니다"를 보여 준다.
  - 잔액 부족(`INSUFFICIENT_PAID_BALANCE`) ▶ 다이얼로그/토스트 안내 → 충전 화면 분기
  - 다이얼로그 "취소" ▶ 모달 닫기
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: `Center(... '티켓 정보를 불러올 수 없습니다' + 다시 시도)`
  - 빈 보유 상태: 활성 배너/만료 배너 없음, 구매 영역만 노출
- **모달/시트/네비게이션**:
  - 구매 확인 창: 수량, 금액, 잔액 비교.

## 4. 제품 규칙

- 개설권은 프라이빗 모임을 열 때 1장 쓰고, 모임이 취소되면 그 모임이 쓴 개설권으로 되돌린다.
- 값은 1장 3,000원 하나이고 등급은 없다. 한 번에 1장 이상 100장 이하로 산다.
- 유료 잔액으로만 산다. 무료 포인트는 쓰지 못한다.
- 돈 이동이 닫혀 있으면 구매 영역만 안내로 바뀌고, 보유 개설권과 만료 안내는 그대로 보인다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 호스팅 티켓 구매 (Happy Path) | `/profile/wallet/hosting-tickets`, 보유 티켓 0건 | 보유 티켓 1장, 6개월 유효기간. 사용자는 프라이빗 모임 개최 가능. |
| S2 | 잔액 부족 → 충전 분기 → 재구매 | 잔액 1,500P, 3,000P Basic 구매 시도 | 충전 1건 + 티켓 1장. 사용자가 의식적으로 두 번의 액션을 거침. |
| S3 | 만료 임박 티켓 안내 (3일 이내) | 6개월 전에 구매한 티켓이 곧 만료 | 사용자가 만료 전 사용 또는 재구매 결정 가능. |
| S4 | 만료된 티켓 안내 | 사용 안 한 티켓이 만료됨 | UI 안내만. 환불 없음. |
| S5 | 다른 도메인에서 티켓 사용 | 프라이빗 모임 개최 시작 화면(Unit 09)에서 티켓 1장 자동 사용 | F06-07 단위 입장에서는 외부 호출 영향만 받음. 직접 노출되는 화면은 본 화면. |
| S6 | 비정상 count (101장 시도) | 잘못된 클라이언트 | 변경 없음. |

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
