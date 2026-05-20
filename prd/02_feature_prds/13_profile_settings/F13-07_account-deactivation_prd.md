# F13-07. 계정 즉시 비활성화 (탈퇴) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/13_profile_settings/F13-07_account-deactivation -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/13_profile_settings/F13-07_account-deactivation`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

계정 즉시 비활성화는 사용자가 30일 유예 없이 서비스를 떠나는 흐름이다. 서버는 먼저 탈퇴 가능 여부를 점검해 금전적/운영상 차단 항목과 자동 처리 가능한 항목을 반환하고, 실제 DELETE에서는 차단 항목이 없을 때 자동 해결 항목을 처리한 뒤 계정을 익명화/비활성화한다. 삭제 예약(F13-06)과 달리 결과 계정 상태는 `TRYEXIT`로 설정된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `데이터 프라이버시` 메뉴로 진입한다.
- 데이터 프라이버시 화면의 세 번째 섹션 `계정 탈퇴`에서 즉시 비활성화를 시작한다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/13_profile_settings/F13-07_account-deactivation/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/13_profile_settings/F13-07_account-deactivation/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/13_profile_settings/F13-07_account-deactivation/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/13_profile_settings/F13-07_account-deactivation/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/UserController.java:64` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/UserController.java:70` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 사용자가 `계정 탈퇴` 버튼을 탭한다.
2. 화면은 `authRepositoryProvider.checkDeactivation()`을 호출한다.
3. repository는 `GET /api/v1/users/me/deactivation-check`를 호출한다.
4. 실패 Result면 오류 토스트 후 중단한다.
5. 차단 항목이 있으면 `_showBlockingDialog`로 최대 3개 상세와 `외 N건`을 표시한다.
6. 차단 항목이 없고 자동 처리 항목이 있으면 confirm message에 `- title count건 (action)` 목록을 넣는다.
7. 사용자가 최종 확인하면 `authNotifierProvider.notifier.deactivateAccount()`를 호출한다.
8. notifier 내부에서 `DELETE /api/v1/users/me` 호출과 인증 상태 정리를 수행하는 것으로 보이나 내부 구현은 허용 범위 밖이라 `(미확인)`.

## 4. 서버 계약

### 개요

계정 즉시 비활성화는 사용자가 30일 유예 없이 서비스를 떠나는 흐름이다. 서버는 먼저 탈퇴 가능 여부를 점검해 금전적/운영상 차단 항목과 자동 처리 가능한 항목을 반환하고, 실제 DELETE에서는 차단 항목이 없을 때 자동 해결 항목을 처리한 뒤 계정을 익명화/비활성화한다. 삭제 예약(F13-06)과 달리 결과 계정 상태는 `TRYEXIT`로 설정된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/users/me/deactivation-check` | `UserController#checkDeactivation` | required | 탈퇴 가능 여부와 차단/자동해결 항목 조회 |
| DELETE | `/api/v1/users/me` | `UserController#deleteMyAccount` | required | 즉시 계정 비활성화 및 강제 로그아웃 기반 처리 |

### 도메인 모델 / Enum (이 기능 관련)

- **VO** `DeactivationCheckVo`: 탈퇴 전 사용자가 해결해야 할 항목과 자동 처리될 항목을 보여주는 기준 응답
- **Enum** `UserStatus`: `NORMAL`, `LOGOUT`, `STOP`, `BAN`, `TRYEXIT`, `EXIT`
- 즉시 비활성화는 `TRYEXIT`, 30일 데이터 삭제 완료는 `EXIT`를 사용한다.

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - payment: 정산/수익/포인트/모임 정산/송금/지갑 처리
  - event: 참가 신청 취소, 무료 이벤트 취소, 유료 이벤트 호스팅 차단
  - club: 소유 클럽/구독/멤버십/기금 인출/대기열
  - privatedate: 매칭 만료, 데이트 프로필 비활성화
  - Unit 01: 프론트 강제 로그아웃 및 인증 상태 정리
- 외부 시스템: PG/은행/푸시 등 직접 호출 여부는 account 코드에서 확인되지 않음.

## 5. 프론트 계약

### 진입 경로

- 마이페이지 허브에서 `데이터 프라이버시` 메뉴로 진입한다.
- 데이터 프라이버시 화면의 세 번째 섹션 `계정 탈퇴`에서 즉시 비활성화를 시작한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/profile/privacy` | `profile/screens/data_privacy_screen.dart` | 탈퇴 가능 여부 확인, 차단 안내, 최종 탈퇴 실행 |

### 화면별 구성 요소 & 액션

### 데이터 프라이버시 - 계정 탈퇴 섹션 (`data_privacy_screen.dart`)
- **사용자가 보는 것**:
  - 섹션 제목 `계정 탈퇴`
  - 설명 `계정을 탈퇴하면 즉시 로그아웃되며 더 이상 서비스를 이용할 수 없습니다.`
  - danger 버튼 `계정 탈퇴`
  - 차단 항목이 있으면 `탈퇴 불가` alert
  - 자동 처리 항목이 있으면 최종 확인 메시지 안의 목록
- **사용자가 할 수 있는 액션**:
  - `계정 탈퇴` 탭 ▶ `authRepositoryProvider.checkDeactivation()` ▶ `GET /api/v1/users/me/deactivation-check`
  - 차단 항목 없음 ▶ 최종 확인 다이얼로그
  - 최종 확인 `탈퇴` ▶ `authNotifierProvider.notifier.deactivateAccount()` ▶ `DELETE /api/v1/users/me`
  - 차단 항목 다이얼로그 확인 ▶ 현재 화면 유지
- **상태 분기**:
  - check 실패: `탈퇴 가능 여부를 확인할 수 없습니다` error toast
  - `deactivationAllowed == false`: blocking dialog 표시 후 중단
  - `resolvableItems.isNotEmpty`: 자동 처리 항목 목록을 확인 문구에 포함
  - 최종 DELETE 성공: `계정이 탈퇴되었습니다` toast
  - 최종 DELETE 실패: `계정 탈퇴에 실패했습니다` error toast
- **모달/시트/네비게이션**:
  - 차단 항목: `AppDialog.alert`
  - 최종 확인: `AppDialog.confirm`
  - 성공 후 로그인 화면 이동/토큰 정리는 `authNotifierProvider.deactivateAccount()` 내부 동작이라 profile 화면 범위에서는 `(미확인)`.

### API 호출 순서 (Provider/Repository 관점)

1. 사용자가 `계정 탈퇴` 버튼을 탭한다.
2. 화면은 `authRepositoryProvider.checkDeactivation()`을 호출한다.
3. repository는 `GET /api/v1/users/me/deactivation-check`를 호출한다.
4. 실패 Result면 오류 토스트 후 중단한다.
5. 차단 항목이 있으면 `_showBlockingDialog`로 최대 3개 상세와 `외 N건`을 표시한다.
6. 차단 항목이 없고 자동 처리 항목이 있으면 confirm message에 `- title count건 (action)` 목록을 넣는다.
7. 사용자가 최종 확인하면 `authNotifierProvider.notifier.deactivateAccount()`를 호출한다.
8. notifier 내부에서 `DELETE /api/v1/users/me` 호출과 인증 상태 정리를 수행하는 것으로 보이나 내부 구현은 허용 범위 밖이라 `(미확인)`.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 탈퇴 전 항상 `deactivation-check`를 먼저 호출한다.
- 차단 항목 상세는 각 item마다 최대 3건만 표시하고 초과분은 `외 N건`으로 접는다.
- 차단 상세 라인은 `relatedInfo`, `amount`, `status`를 `/`로 이어 보여준다.
- 자동 처리 항목은 별도 화면이 아니라 최종 확인 문구 안에 텍스트 목록으로 포함한다.
- 즉시 탈퇴 성공 후 실제 라우팅은 auth notifier 내부 구현에 위임되어 profile 화면 코드만으로는 `(미확인)`.
- 비밀번호 재입력, 재인증, 소셜 unlink는 현재 즉시 탈퇴 섹션에서 확인되지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 차단 항목 없이 즉시 탈퇴한다 | 로그인됨, 미정산/진행 중 결제/소유 클럽 등 차단 항목 없음 | 사용자 status는 `TRYEXIT`가 되고 refresh token은 삭제된다. |
| S2 | 미정산 항목 때문에 탈퇴가 차단된다 | 로그인됨, `SETTLEMENT` 또는 `CREATOR_EARNING` 등 blocking item 존재 | DELETE는 호출되지 않고 사용자는 차단 사유를 해결해야 한다. |
| S3 | 자동 처리 항목을 확인하고 탈퇴한다 | blockingItems 없음, resolvableItems 존재 | 자동 처리 가능한 활동은 정리되고 계정은 즉시 비활성화된다. |
| S4 | 탈퇴 가능 여부 확인 API가 실패한다 | 로그인됨, API 실패 또는 repository failure | 계정 상태는 변경되지 않는다. |
| S5 | 최종 DELETE 중 서버가 차단을 다시 감지한다 | check는 통과했지만 DELETE 시점에 blocking item 발생 | 계정은 비활성화되지 않는다. 상세 차단 정보를 DELETE 실패에서 UI에 다시 매핑하는지는 `(미확인)`. |

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
| 후보 | backend.md:41 | - **에러 분기**: 체크 자체의 명시적 에러는 코드상 없음. 외부 repository 예외 응답은 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:71 | - walletService 또는 외부 도메인 자동 해결 실패 응답은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:100 | - 클럽 대기열은 실제 삭제 메서드가 있으나 리포트 항목에는 건수 미확인 주석으로 제외됨 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:35 | - 성공 후 로그인 화면 이동/토큰 정리는 `authNotifierProvider.deactivateAccount()` 내부 동작이라 profile 화면 범위에서는 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:45 | 8. notifier 내부에서 `DELETE /api/v1/users/me` 호출과 인증 상태 정리를 수행하는 것으로 보이나 내부 구현은 허용 범위 밖이라 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:52 | - 즉시 탈퇴 성공 후 실제 라우팅은 auth notifier 내부 구현에 위임되어 profile 화면 코드만으로는 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:63 | **종료 상태**: 계정은 비활성화되지 않는다. 상세 차단 정보를 DELETE 실패에서 UI에 다시 매핑하는지는 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 차단 항목 없이 즉시 탈퇴한다**: Given 로그인됨, 미정산/진행 중 결제/소유 클럽 등 차단 항목 없음 When 사용자가 해당 흐름을 실행하면 Then 사용자 status는 `TRYEXIT`가 되고 refresh token은 삭제된다.
- **AC-02. 미정산 항목 때문에 탈퇴가 차단된다**: Given 로그인됨, `SETTLEMENT` 또는 `CREATOR_EARNING` 등 blocking item 존재 When 사용자가 해당 흐름을 실행하면 Then DELETE는 호출되지 않고 사용자는 차단 사유를 해결해야 한다.
- **AC-03. 자동 처리 항목을 확인하고 탈퇴한다**: Given blockingItems 없음, resolvableItems 존재 When 사용자가 해당 흐름을 실행하면 Then 자동 처리 가능한 활동은 정리되고 계정은 즉시 비활성화된다.
- **AC-04. 탈퇴 가능 여부 확인 API가 실패한다**: Given 로그인됨, API 실패 또는 repository failure When 사용자가 해당 흐름을 실행하면 Then 계정 상태는 변경되지 않는다.
- **AC-05. 최종 DELETE 중 서버가 차단을 다시 감지한다**: Given check는 통과했지만 DELETE 시점에 blocking item 발생 When 사용자가 해당 흐름을 실행하면 Then 계정은 비활성화되지 않는다. 상세 차단 정보를 DELETE 실패에서 UI에 다시 매핑하는지는 `(미확인)`.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
