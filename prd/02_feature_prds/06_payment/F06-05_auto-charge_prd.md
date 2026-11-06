# F06-05. 자동 충전 설정 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 미리 정의한 임계값(`thresholdAmount`)·자동 충전 금액(`chargeAmount`)·결제수단을 저장하고, 결제 시점에 잔액이 부족하면 서버가 등록된 빌링키로 PG 자동 결제를 일으켜 잔액을 보충한 뒤 원 결제를 재시도한다. D-03으로 월간 자동충전 한도(`monthlyLimit`)도 추가되어 누적 자동충전이 한도를 넘으면 skip된다. 본 단위는 (1) 설정 조회/저장/해제 API와 (2) `WalletService.pay`에서 호출되는 `tryAutoCharge` 트리거 로직 두 부분을 다룬다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 충전 화면(F06-02) ▶ "자동충전 설정 →" 링크 (`AppColors.linkBlue`)
- 지갑 메인 → 메뉴/딥링크를 통한 직접 진입 (라우트 `/profile/wallet/auto-charge`)
- 결제 실패 자동 진입 안내 모달에서 "자동충전 설정으로 이동" 액션이 호출될 수 있음 (선택)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `AutoChargeController`, `AutoChargeConfig`, `WalletService`. 앱: `auto_charge_screen.dart`.

<!-- source-references:start -->
서버 창구: `AutoChargeController#getAutoChargeConfig`, `AutoChargeController#updateAutoChargeConfig`, `AutoChargeController#disableAutoCharge`, `AutoChargeController#getChargePresets`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 서버 하한은 임계값 1,000원, 충전 금액 10,000원, 월 한도 10,000원이다. 앱은 임계값을 1,000원 이상 100,000원 이하로 받고, 충전 금액은 10,000, 30,000, 50,000원 중에서 고르게 한다.
- 켜는 것은 저장을 눌러야 서버에 반영된다. 끌 때는 확인을 받고 바로 반영한다.
- 묶인 결제수단이 지워지면 다음 발동은 실패하고 결제는 잔액 부족으로 끝난다.

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
