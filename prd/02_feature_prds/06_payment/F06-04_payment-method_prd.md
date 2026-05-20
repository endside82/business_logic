# F06-04. 결제 수단 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/06_payment/F06-04_payment-method -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/06_payment/F06-04_payment-method`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

PG(Toss)에서 발급된 빌링키(billingKey) 기반 카드 결제수단을 등록·조회·삭제하고 기본 결제수단을 전환한다. 등록 시 첫 결제수단은 자동으로 `isDefault=true`. 삭제 시 기본이 사라지면 가장 최근 등록된 다른 결제수단을 자동 기본으로 승격. 최대 5개 제한.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 지갑 메인(F06-01) ▶ "결제수단" 바로가기
- 충전 화면(F06-02)에서 "결제 수단을 등록해주세요" 경고 탭 또는 결제수단 셀렉터 "변경" 액션 → `context.go('/profile/wallet/methods')`
- 자동 충전 설정(F06-05)에서 결제수단이 없을 때 "결제 수단을 먼저 등록해주세요" 분기

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/06_payment/F06-04_payment-method/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/06_payment/F06-04_payment-method/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/06_payment/F06-04_payment-method/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/06_payment/F06-04_payment-method/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java:33` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java:41` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java:49` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

PG(Toss)에서 발급된 빌링키(billingKey) 기반 카드 결제수단을 등록·조회·삭제하고 기본 결제수단을 전환한다. 등록 시 첫 결제수단은 자동으로 `isDefault=true`. 삭제 시 기본이 사라지면 가장 최근 등록된 다른 결제수단을 자동 기본으로 승격. 최대 5개 제한.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/wallet/payment-methods | PaymentMethodController#getPaymentMethods | required | 사용자의 결제수단 목록 (기본 우선, 생성일 내림차순) |
| POST | /api/v1/wallet/payment-methods | PaymentMethodController#createPaymentMethod | required | 빌링키 기반 결제수단 등록 (201 Created) |
| DELETE | /api/v1/wallet/payment-methods/{id} | PaymentMethodController#deletePaymentMethod | required | 결제수단 삭제 (204) + 기본 자동 승계 |
| PATCH | /api/v1/wallet/payment-methods/{id}/default | PaymentMethodController#setDefault | required | 기본 결제수단 전환 |

### 도메인 모델 / Enum (이 기능 관련)

- 본 기능에 묶인 enum 없음
- 핵심 도메인 객체: `PaymentMethod` (`payment/model/PaymentMethod.java`) — userId, billingKey, cardCompany, last4Digits, isDefault, nickname, createdAt/updatedAt (Spring Auditing)

### 의존 단위 / 외부 시스템

- **외부 PG (🟠 Toss)**: `billingKey`는 클라가 Toss WebView로 카드 등록 흐름을 거쳐 발급받은 토큰을 전송. 서버는 토큰을 그대로 저장만 하며, 본 단위에서는 PG API 직접 호출 없음. 자동 충전(F06-05) 시 `tossPaymentService.billingPayment(billingKey, ...)`로 사용된다.
- 다른 Unit 의존:
  - F06-02 충전 화면이 결제수단 셀렉터에서 본 API의 목록을 사용
  - F06-05 자동 충전이 `paymentMethodId`를 참조 (삭제 시 자동 충전 영향 가능)
- 알림: 없음

## 5. 프론트 계약

### 진입 경로

- 지갑 메인(F06-01) ▶ "결제수단" 바로가기
- 충전 화면(F06-02)에서 "결제 수단을 등록해주세요" 경고 탭 또는 결제수단 셀렉터 "변경" 액션 → `context.go('/profile/wallet/methods')`
- 자동 충전 설정(F06-05)에서 결제수단이 없을 때 "결제 수단을 먼저 등록해주세요" 분기

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/profile/wallet/methods` | `payment/screens/payment_method_screen.dart` | 결제수단 목록 + 추가 + 삭제 + 기본 전환 |

### 화면별 구성 요소 & 액션

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
| 후보 | backend.md:24 | - **응답**: `List<PaymentMethodVo>` (배열, **PageResponse 아님 — 주의**) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 결제수단 등록 (Happy Path)**: Given `/profile/wallet/methods`, 빈 상태 카드 노출 When 사용자가 해당 흐름을 실행하면 Then `payment_methods` 1행, 기본 결제수단 자동 설정. 이후 충전 화면이 이 카드를 디폴트로 채운다.
- **AC-02. 두 번째 결제수단 등록 + 기본 전환**: Given 카드 A(기본) 1개, 새 카드 추가하려는 의도 When 사용자가 해당 흐름을 실행하면 Then 기본 결제수단이 B로 전환. 자동 충전 설정도 다음 진입 시 B를 권장.
- **AC-03. 기본 결제수단 삭제 → 자동 승계**: Given 카드 A(기본) + B + C When 사용자가 해당 흐름을 실행하면 Then 기본 결제수단 0건이 되지 않음. 사용자 별도 액션 없이 다음 결제수단이 기본 승계.
- **AC-04. 5개 한도 초과 시도**: Given 카드 5개 모두 등록 완료 When 사용자가 해당 흐름을 실행하면 Then 사용자는 추가 불가능 → 기존 카드 1개 삭제 후에만 추가 가능
- **AC-05. 카드 1개일 때 그것을 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 결제수단 0건. 자동 충전이 묶여 있었으면 다음 트리거 시 paymentMethodOpt empty로 skip(F06-05 backend 참조).
- **AC-06. 권한 없는 결제수단 ID 조작**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 없음. 안전.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
