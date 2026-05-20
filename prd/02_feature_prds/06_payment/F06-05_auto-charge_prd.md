# F06-05. 자동 충전 설정 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-05_auto-charge -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-05_auto-charge`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 미리 정의한 임계값(`thresholdAmount`)·자동 충전 금액(`chargeAmount`)·결제수단을 저장하고, 결제 시점에 잔액이 부족하면 서버가 등록된 빌링키로 PG 자동 결제를 일으켜 잔액을 보충한 뒤 원 결제를 재시도한다. D-03으로 월간 자동충전 한도(`monthlyLimit`)도 추가되어 누적 자동충전이 한도를 넘으면 skip된다. 본 단위는 (1) 설정 조회/저장/해제 API와 (2) `WalletService.pay`에서 호출되는 `tryAutoCharge` 트리거 로직 두 부분을 다룬다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 충전 화면(F06-02) ▶ "자동충전 설정 →" 링크 (`AppColors.linkBlue`)
- 지갑 메인 → 메뉴/딥링크를 통한 직접 진입 (라우트 `/profile/wallet/auto-charge`)
- 결제 실패 자동 진입 안내 모달에서 "자동충전 설정으로 이동" 액션이 호출될 수 있음 (선택)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-05_auto-charge/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-05_auto-charge/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-05_auto-charge/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-05_auto-charge/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java:25` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java:31` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java:37` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java:44` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 자동 충전 설정 (`auto_charge_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `자동 충전 설정`
  - 상단 토글 Row: "자동 충전" 헤딩 + `Switch.adaptive(activeTrackColor: AppColors.primary500)`
  - 토글 ON일 때만:
    - "최소 잔액 임계값" — 설명 + 천 단위 콤마 입력칸 (suffixText "원", hint "5,000")
    - "충전 금액" — `AutoChargeConstants.chargePresets`로 ChoiceChip 가로 배치 (선택 색상 primary50/primary500)
    - "월간 한도 (선택)" — 입력칸, hint "예: 100,000", 비워두면 한도 없음
    - "결제 수단" — 결제수단 목록 드롭다운 (`DropdownButton<int>`로 카드사·뒷4자리 표기)
    - 빈 결제수단 상태 → 박스로 "결제 수단을 먼저 등록해주세요" + 탭 시 `/profile/wallet/methods`로 이동
    - "설정 저장" `AppButton(variant: ButtonVariant.primary, fullWidth: true)`
- **사용자가 할 수 있는 액션**:
  - 토글 OFF → ON ▶ 폼 표시 (저장 전이라 서버 미반영)
  - 토글 ON → OFF ▶ `AlertDialog` "자동 충전 해제 / 자동 충전을 해제하시겠습니까?" → "해제" → `DELETE /auto-charge` ▶ 토스트 "자동 충전이 해제되었습니다"
  - 임계값 입력 ▶ `AutoChargeConstants.validateThreshold` (1,000 ~ 100,000)
  - 충전 금액 칩 선택 ▶ 상태 갱신
  - 월간 한도 입력 ▶ `validateMonthlyLimit(monthlyLimit, chargeAmount)` (chargeAmount보다 작거나 잘못된 값 거절)
  - 결제 수단 드롭다운 변경 ▶ 상태 갱신
  - "설정 저장" 탭 ▶ 검증 후 `PUT /auto-charge` ▶ 토스트 "자동 충전 설정이 저장되었습니다"
  - 결제수단 미등록 시 저장 시도 ▶ 토스트 "결제 수단을 먼저 등록해주세요" + `/profile/wallet/methods` 이동
- **상태 분기**:
  - 로딩: `Center(CircularProgressIndicator)`
  - 에러: 메시지 + "다시 시도" `AppButton(variant: outline)`
  - 결제수단 로딩 중: 작은 인디케이터, 에러: "결제 수단을 불러올 수 없습니다"
- **모달/시트/네비게이션**:
  - 토글 OFF 확인 다이얼로그
  - 결제수단 미등록 시 결제수단 화면으로 이동

## 4. 서버 계약

### 개요

사용자가 미리 정의한 임계값(`thresholdAmount`)·자동 충전 금액(`chargeAmount`)·결제수단을 저장하고, 결제 시점에 잔액이 부족하면 서버가 등록된 빌링키로 PG 자동 결제를 일으켜 잔액을 보충한 뒤 원 결제를 재시도한다. D-03으로 월간 자동충전 한도(`monthlyLimit`)도 추가되어 누적 자동충전이 한도를 넘으면 skip된다. 본 단위는 (1) 설정 조회/저장/해제 API와 (2) `WalletService.pay`에서 호출되는 `tryAutoCharge` 트리거 로직 두 부분을 다룬다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/wallet/auto-charge | AutoChargeController#getAutoChargeConfig | required | 현재 자동 충전 설정 조회 (없으면 enabled=false 기본 객체) |
| PUT | /api/v1/wallet/auto-charge | AutoChargeController#updateAutoChargeConfig | required | 자동 충전 활성화 + 설정 저장 |
| DELETE | /api/v1/wallet/auto-charge | AutoChargeController#disableAutoCharge | required | 자동 충전 비활성 (행은 유지, enabled=false) |
| GET | /api/v1/wallet/charge/presets | AutoChargeController#getChargePresets | required | 자동충전 화면 진입 시 충전 금액 프리셋 (F06-02도 동일 사용) |

자동 충전 트리거(`POST /wallet/pay` 흐름 내부 호출)는 별도 엔드포인트 없이 결제 시점에 자동 실행 → F06-06에 재기재.

### 도메인 모델 / Enum (이 기능 관련)

- 본 기능 전용 enum 없음
- 핵심 도메인 객체:
  - `AutoChargeConfig` (`payment/model/AutoChargeConfig.java`) — userId(unique), enabled, thresholdAmount, chargeAmount, paymentMethodId, monthlyLimit, createdAt/updatedAt
  - 트리거 결과는 `PointTransaction.referenceType="AUTO_CHARGE"`로 기록되어 거래 내역(F06-03)에서 일반 충전과 구분 식별 가능

### 의존 단위 / 외부 시스템

- **외부 PG (🟠 Toss)**: prod에서 `billingPayment(billingKey, orderId, amount, '자동 충전')` 호출. non-prod은 시뮬레이션.
- 다른 Unit:
  - F06-04 결제수단의 `paymentMethodId`를 참조 (삭제되면 다음 트리거 시 결제수단 미존재 → false)
  - F06-06 결제 흐름이 본 트리거를 발화시키는 진입점
  - F06-02 충전 화면에서 "자동충전 설정 →" 링크가 본 화면으로 라우팅
- 알림: `WalletService#pay` 내부에서 자동 충전 성공 시 별도 알림은 본 단위 코드에 명시되지 않음(메트릭 카운터만). 결제 완료 알림은 결제 단계가 발송.

## 5. 프론트 계약

### 진입 경로

- 충전 화면(F06-02) ▶ "자동충전 설정 →" 링크 (`AppColors.linkBlue`)
- 지갑 메인 → 메뉴/딥링크를 통한 직접 진입 (라우트 `/profile/wallet/auto-charge`)
- 결제 실패 자동 진입 안내 모달에서 "자동충전 설정으로 이동" 액션이 호출될 수 있음 (선택)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/auto-charge` | `payment/screens/auto_charge_screen.dart` | 자동 충전 토글 + 임계값/금액/한도/결제수단 설정 |

### 화면별 구성 요소 & 액션

### 자동 충전 설정 (`auto_charge_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `자동 충전 설정`
  - 상단 토글 Row: "자동 충전" 헤딩 + `Switch.adaptive(activeTrackColor: AppColors.primary500)`
  - 토글 ON일 때만:
    - "최소 잔액 임계값" — 설명 + 천 단위 콤마 입력칸 (suffixText "원", hint "5,000")
    - "충전 금액" — `AutoChargeConstants.chargePresets`로 ChoiceChip 가로 배치 (선택 색상 primary50/primary500)
    - "월간 한도 (선택)" — 입력칸, hint "예: 100,000", 비워두면 한도 없음
    - "결제 수단" — 결제수단 목록 드롭다운 (`DropdownButton<int>`로 카드사·뒷4자리 표기)
    - 빈 결제수단 상태 → 박스로 "결제 수단을 먼저 등록해주세요" + 탭 시 `/profile/wallet/methods`로 이동
    - "설정 저장" `AppButton(variant: ButtonVariant.primary, fullWidth: true)`
- **사용자가 할 수 있는 액션**:
  - 토글 OFF → ON ▶ 폼 표시 (저장 전이라 서버 미반영)
  - 토글 ON → OFF ▶ `AlertDialog` "자동 충전 해제 / 자동 충전을 해제하시겠습니까?" → "해제" → `DELETE /auto-charge` ▶ 토스트 "자동 충전이 해제되었습니다"
  - 임계값 입력 ▶ `AutoChargeConstants.validateThreshold` (1,000 ~ 100,000)
  - 충전 금액 칩 선택 ▶ 상태 갱신
  - 월간 한도 입력 ▶ `validateMonthlyLimit(monthlyLimit, chargeAmount)` (chargeAmount보다 작거나 잘못된 값 거절)
  - 결제 수단 드롭다운 변경 ▶ 상태 갱신
  - "설정 저장" 탭 ▶ 검증 후 `PUT /auto-charge` ▶ 토스트 "자동 충전 설정이 저장되었습니다"
  - 결제수단 미등록 시 저장 시도 ▶ 토스트 "결제 수단을 먼저 등록해주세요" + `/profile/wallet/methods` 이동
- **상태 분기**:
  - 로딩: `Center(CircularProgressIndicator)`
  - 에러: 메시지 + "다시 시도" `AppButton(variant: outline)`
  - 결제수단 로딩 중: 작은 인디케이터, 에러: "결제 수단을 불러올 수 없습니다"
- **모달/시트/네비게이션**:
  - 토글 OFF 확인 다이얼로그
  - 결제수단 미등록 시 결제수단 화면으로 이동

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 자동 충전 처음 활성화 (Happy Path) | `auto_charge_configs` 행 없음, `GET /auto-charge` → `enabled=false` 기본 객체 | 결제 시 잔액이 5,000P 이하로 떨어지면 30,000P 자동 충전(월 100k 한도 내). |
| S2 | 자동 충전 트리거 (실제 결제 시) | 자동 충전 활성, paymentMethodId 등록됨 | 사용자 잔액 = 4,500 + 30,000 - 8,000 = 26,500P. 자동 충전 결과는 거래 내역으로 추적. |
| S3 | 월간 한도 초과로 skip | 잔액 부족 결제 시도 | 자동 충전이 의도된 한도에서 멈춤. 사용자가 명시적으로 충전 결정. |
| S4 | 자동 충전 해제 | 자동 충전 활성 상태에서 해제하려는 사용자 | 다음 결제부터 잔액 부족 시 자동 충전 비활성, `INSUFFICIENT_BALANCE` 직행. |
| S5 | 결제수단 미등록 상태 진입 | 카드 없이 자동충전 설정 진입한 신규 사용자 | 결제수단 등록 후 다시 진입해 활성화 가능. |
| S6 | 결제수단이 묶여 있는데 사용자가 그 카드를 삭제 | 자동 충전이 카드 A를 가리키는데 A를 삭제한 사용자 | 자동 충전 일시 무력화. 사용자 인지 후 새 결제수단으로 재설정. |
| S7 | PG 자동결제 실패 (한도 초과/만료 카드) | 카드가 한도 초과인 사용자 | 결제 실패 + 사용자 명시적 재시도 유도. |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. 자동 충전 처음 활성화 (Happy Path)**: Given `auto_charge_configs` 행 없음, `GET /auto-charge` → `enabled=false` 기본 객체 When 사용자가 해당 흐름을 실행하면 Then 결제 시 잔액이 5,000P 이하로 떨어지면 30,000P 자동 충전(월 100k 한도 내).
- **AC-02. 자동 충전 트리거 (실제 결제 시)**: Given 자동 충전 활성, paymentMethodId 등록됨 When 사용자가 해당 흐름을 실행하면 Then 사용자 잔액 = 4,500 + 30,000 - 8,000 = 26,500P. 자동 충전 결과는 거래 내역으로 추적.
- **AC-03. 월간 한도 초과로 skip**: Given 잔액 부족 결제 시도 When 사용자가 해당 흐름을 실행하면 Then 자동 충전이 의도된 한도에서 멈춤. 사용자가 명시적으로 충전 결정.
- **AC-04. 자동 충전 해제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 다음 결제부터 잔액 부족 시 자동 충전 비활성, `INSUFFICIENT_BALANCE` 직행.
- **AC-05. 결제수단 미등록 상태 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제수단 등록 후 다시 진입해 활성화 가능.
- **AC-06. 결제수단이 묶여 있는데 사용자가 그 카드를 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 자동 충전 일시 무력화. 사용자 인지 후 새 결제수단으로 재설정.
- **AC-07. PG 자동결제 실패 (한도 초과/만료 카드)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제 실패 + 사용자 명시적 재시도 유도.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
