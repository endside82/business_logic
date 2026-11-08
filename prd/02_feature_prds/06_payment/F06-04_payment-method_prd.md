# F06-04. 결제 수단 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

PG(Toss)에서 발급된 빌링키(billingKey) 기반 카드 결제수단을 등록·조회·삭제하고 기본 결제수단을 전환한다. 등록 시 첫 결제수단은 자동으로 `isDefault=true`. 삭제 시 기본이 사라지면 가장 최근 등록된 다른 결제수단을 자동 기본으로 승격. 최대 5개 제한.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "결제수단" 바로가기
- 충전 화면(F06-02)에서 "결제 수단을 등록해주세요" 경고 탭 또는 결제수단 셀렉터 "변경" 액션 → `context.go('/profile/wallet/methods')`
- 자동 충전 설정(F06-05)에서 결제수단이 없을 때 "결제 수단을 먼저 등록해주세요" 분기

## 2. 코드 위치

계약의 정본은 코드다. 서버: `PaymentMethodController`, `PaymentMethod`. 앱: `payment_method_screen.dart`.

<!-- source-references:start -->
서버 창구: `PaymentMethodController#getPaymentMethods`, `PaymentMethodController#createPaymentMethod`, `PaymentMethodController#deletePaymentMethod`, `PaymentMethodController#setDefault`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 결제 수단 (`payment_method_screen.dart`)

- **사용자가 보는 것**:
  - AppBar `결제 수단`
  - "등록된 결제 수단 (N/5)" 카운터
  - 빈 상태: 카드 일러스트 + "등록된 결제 수단이 없습니다 / 결제 수단을 추가하여 편리하게 충전하세요" (gray50 배경)
  - 데이터: `PaymentMethodCardWidget` 리스트 — 카드사 + 마스킹된 뒷 4자리 + 별칭 + 기본 배지
  - 하단 CTA: "결제 수단 추가" `AppButton(variant: ButtonVariant.outline, fullWidth)` — 5개 미만일 때만
- **사용자가 할 수 있는 액션**:
  - "결제 수단 추가" 탭 ▶ `_AddMethodBottomSheet` 모달 (현재는 PG 빌링키 등록 시뮬레이션 — 카드사 드롭다운, 카드 뒷 4자리, 별칭 입력)
  - 시트 "등록하기" ▶ `paymentMethodListNotifier.addPaymentMethod(param)` ▶ `POST /payment-methods` ▶ 성공 토스트
  - 카드 액션 메뉴 → "기본으로 설정" ▶ `PATCH /payment-methods/{id}/default` ▶ 성공 토스트 "기본 결제 수단으로 설정되었습니다"
  - 카드 액션 메뉴 → "삭제" ▶ `AlertDialog` 확인 → `DELETE /payment-methods/{id}` ▶ 성공 토스트 "결제 수단이 삭제되었습니다"
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.list)`
  - 에러: 인라인 메시지 + "다시 시도" `TextButton`
  - 빈 상태: 위 빈 상태 카드
- **모달/시트/네비게이션**:
  - `showModalBottomSheet`로 결제수단 등록 시트 (`_AddMethodBottomSheet`)
  - `AlertDialog`로 삭제 확인 (액션 라벨 "취소"/"삭제", 삭제 버튼은 `AppColors.error500`)
  - 5개 한도일 때 하단 CTA 자체를 숨김(`asyncMethods.maybeWhen` 분기)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 결제수단 등록 (Happy Path) | `/profile/wallet/methods`, 빈 상태 카드 노출 | `payment_methods` 1행, 기본 결제수단 자동 설정. 이후 충전 화면이 이 카드를 디폴트로 채운다. |
| S2 | 두 번째 결제수단 등록 + 기본 전환 | 카드 A(기본) 1개, 새 카드 추가하려는 의도 | 기본 결제수단이 B로 전환. 자동 충전 설정도 다음 진입 시 B를 권장. |
| S3 | 기본 결제수단 삭제 → 자동 승계 | 카드 A(기본) + B + C | 기본 결제수단 0건이 되지 않음. 사용자 별도 액션 없이 다음 결제수단이 기본 승계. |
| S4 | 5개 한도 초과 시도 | 카드 5개 모두 등록 완료 | 사용자는 추가 불가능 → 기존 카드 1개 삭제 후에만 추가 가능 |
| S5 | 카드 1개일 때 그것을 삭제 | 마지막 남은 카드를 삭제하는 사용자 (자동 충전 설정 없음 가정) | 결제수단 0건. 자동 충전이 묶여 있었으면 다음 트리거 시 paymentMethodOpt empty로 skip(F06-05 backend 참조). |
| S6 | 권한 없는 결제수단 ID 조작 | 다른 사용자의 결제수단 ID로 PATCH 시도하는 비정상 클라이언트 | 변경 없음. 안전. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 결제 수단 목록 | 결제 수단 목록은 쪽 나눔 없는 배열이고 앱도 배열로 받는다 | 없음 |

## 9. 수용 기준

- **AC-01. 첫 결제수단 등록 (Happy Path)**: Given `/profile/wallet/methods`, 빈 상태 카드 노출 When 사용자가 해당 흐름을 실행하면 Then `payment_methods` 1행, 기본 결제수단 자동 설정. 이후 충전 화면이 이 카드를 디폴트로 채운다.
- **AC-02. 두 번째 결제수단 등록 + 기본 전환**: Given 카드 A(기본) 1개, 새 카드 추가하려는 의도 When 사용자가 해당 흐름을 실행하면 Then 기본 결제수단이 B로 전환. 자동 충전 설정도 다음 진입 시 B를 권장.
- **AC-03. 기본 결제수단 삭제 → 자동 승계**: Given 카드 A(기본) + B + C When 사용자가 해당 흐름을 실행하면 Then 기본 결제수단 0건이 되지 않음. 사용자 별도 액션 없이 다음 결제수단이 기본 승계.
- **AC-04. 5개 한도 초과 시도**: Given 카드 5개 모두 등록 완료 When 사용자가 해당 흐름을 실행하면 Then 사용자는 추가 불가능 → 기존 카드 1개 삭제 후에만 추가 가능
- **AC-05. 카드 1개일 때 그것을 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제수단 0건. 자동 충전이 묶여 있었으면 다음 트리거 시 paymentMethodOpt empty로 skip(F06-05 backend 참조).
- **AC-06. 권한 없는 결제수단 ID 조작**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없음. 안전.
