# F13-07. 계정 즉시 비활성화 (탈퇴) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

계정 즉시 비활성화는 사용자가 30일 유예 없이 서비스를 떠나는 흐름이다. 서버는 먼저 탈퇴 가능 여부를 점검해 금전적/운영상 차단 항목과 자동 처리 가능한 항목을 반환하고, 실제 DELETE에서는 차단 항목이 없을 때 자동 해결 항목을 처리한 뒤 계정을 익명화/비활성화한다. 삭제 예약(F13-06)과 달리 결과 계정 상태는 `TRYEXIT`로 설정된다.

**2026-05-27 변경**: `UserService.deactivateAccount`의 Member 비식별화 범위가 확장됐다. 기존(name, profileImageUrl, bio)에 더해 `birthDate`, `gender`, `mbti`도 null 처리한다(이전엔 birthDate/gender가 잔존하던 MF6 보강). [[F09-01]] 본인인증 검증값과 [[F13-02]] MBTI가 모두 삭제 범위에 포함된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `데이터 프라이버시` 메뉴로 진입한다.
- 데이터 프라이버시 화면의 세 번째 섹션 `계정 탈퇴`에서 즉시 비활성화를 시작한다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `UserController`. 앱: `data_privacy_screen.dart`.

<!-- source-references:start -->
서버 창구: `UserController#checkDeactivation`, `UserController#deleteMyAccount`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 2026-10-29 현재 계약 대조

### 탈퇴 뒤 도착한 돈은 운영 보류로 처리합니다

끝난 결제 이력만으로 탈퇴를 막지 않는다. 진행 중 돈 의무를 정리한 뒤 탈퇴하며, 탈퇴 뒤 외부·자동 처리가 보내는 돈은 탈퇴 회원 지갑 대신 보류 행에 기록한다. 운영자는 새 계좌 재지급 또는 외부 지급 증빙으로 종결한다. 늦게 도착한 지급 증빙은 거래별로 검토하며 미검토 증빙이 있으면 재지급·외부 종결을 막는다. 원출금 지급 확정·지급되지 않음 판정을 먼저 할 수 있다. 중복 지급 손실 처리의 제품 결정(H-543)은 별도로 남아 있다.

기존 설계 중 이 규칙과 다른 서술은 아래 현재 계약을 기준으로 정정한다. 운영·실기기 완료 판정은 [현재 출시 상태표](../../../docs/qa/launch-status.html)를 따른다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-11-01에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `GET /api/v1/users/me/deactivation-check` | `UserController#checkDeactivation` | [UserController.java:77](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/account/controller/UserController.java#L77) |
| `DELETE /api/v1/users/me` | `UserController#deleteMyAccount` | [UserController.java:83](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/account/controller/UserController.java#L83) |
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 사용자가 `계정 탈퇴` 버튼을 탭한다.
2. 화면은 `authRepositoryProvider.checkDeactivation()`을 호출한다.
3. repository는 `GET /api/v1/users/me/deactivation-check`를 호출한다.
4. 실패 Result면 오류 토스트 후 중단한다.
5. 차단 항목이 있으면 `_showBlockingDialog`로 최대 3개 상세와 `외 N건`을 표시한다.
6. 차단 항목이 없고 자동 처리 항목이 있으면 confirm message에 `- title count건 (action)` 목록을 넣는다.
7. 사용자가 최종 확인하면 `authNotifierProvider.notifier.deactivateAccount()`를 호출한다.
8. notifier 내부에서 `DELETE /api/v1/users/me` 호출과 인증 상태 정리를 수행하는 것으로 보이나 내부 구현은 허용 범위 밖이라 `(미확인)`.

## 4. 제품 규칙

- `계정 탈퇴` 를 누르면 먼저 탈퇴 가능 여부를 점검한다. 점검이 실패하면 `탈퇴 가능 여부를 확인할 수 없습니다` 로 멈추고 계정은 그대로다.
- 막는 항목이 있으면 `탈퇴 불가` 창만 보이고 탈퇴는 진행하지 않는다. 항목마다 상세는 3건까지 보이고 나머지는 `외 N건` 으로 접는다. 상세 한 줄은 관련 정보, 금액, 상태를 `/` 로 이어 보인다.
- 막는 항목이 없고 자동으로 정리되는 항목이 있으면 별도 화면 없이 최종 확인 문구 안에 목록으로 보인다. 최종 확인 뒤에야 탈퇴가 실행된다. 비밀번호 재입력, 재인증, 소셜 연결 해제는 이 단계에 없다.
- 점검을 통과한 뒤 탈퇴 실행 시점에 막는 항목이 새로 생기면 탈퇴하지 않고 같은 차단 창을 다시 보인다.
- 성공하면 `계정이 탈퇴되었습니다` 안내와 함께 즉시 로그아웃되고 서비스를 더 쓸 수 없다. 실패하면 `계정 탈퇴에 실패했습니다` 가 뜬다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 차단 항목 없이 즉시 탈퇴한다 | 로그인됨, 미정산/진행 중 결제/소유 클럽 등 차단 항목 없음 | 사용자 status는 `TRYEXIT`가 되고 refresh token은 삭제된다. |
| S2 | 미정산 항목 때문에 탈퇴가 차단된다 | 로그인됨, `SETTLEMENT` 또는 `CREATOR_EARNING` 등 blocking item 존재 | DELETE는 호출되지 않고 사용자는 차단 사유를 해결해야 한다. |
| S3 | 자동 처리 항목을 확인하고 탈퇴한다 | blockingItems 없음, resolvableItems 존재 | 자동 처리 가능한 활동은 정리되고 계정은 즉시 비활성화된다. |
| S4 | 탈퇴 가능 여부 확인 API가 실패한다 | 로그인됨, API 실패 또는 repository failure | 계정 상태는 변경되지 않는다. |
| S5 | 최종 DELETE 중 서버가 차단을 다시 감지한다 | check는 통과했지만 DELETE 시점에 blocking item 발생 | 계정은 비활성화되지 않는다. 앱은 실패 응답의 점검 내용을 읽어 차단 창을 다시 보인다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:41 | - **에러 분기**: 체크 자체의 명시적 에러는 코드상 없음. 외부 repository 예외 응답은 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:71 | - walletService 또는 외부 도메인 자동 해결 실패 응답은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:100 | - 클럽 대기열은 실제 삭제 메서드가 있으나 리포트 항목에는 건수 미확인 주석으로 제외됨 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 해소됨 | 탈퇴 뒤 정리 | 앱의 탈퇴 명령이 `DELETE /api/v1/users/me` 를 부르고, 성공하면 그 계정을 기기에서 지운다(토큰·저장 정보). 화면 범위 밖이라 적었던 미확인 메모는 닫는다 | 없음 |
| 후보 | scenarios.md:63 | **종료 상태**: 계정은 비활성화되지 않는다. 앱은 실패 응답의 점검 내용을 읽어 차단 창을 다시 보인다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 차단 항목 없이 즉시 탈퇴한다**: Given 로그인됨, 미정산/진행 중 결제/소유 클럽 등 차단 항목 없음 When 사용자가 해당 흐름을 실행하면 Then 사용자 status는 `TRYEXIT`가 되고 refresh token은 삭제된다.
- **AC-02. 미정산 항목 때문에 탈퇴가 차단된다**: Given 로그인됨, `SETTLEMENT` 또는 `CREATOR_EARNING` 등 blocking item 존재 When 사용자가 해당 흐름을 실행하면 Then DELETE는 호출되지 않고 사용자는 차단 사유를 해결해야 한다.
- **AC-03. 자동 처리 항목을 확인하고 탈퇴한다**: Given blockingItems 없음, resolvableItems 존재 When 사용자가 해당 흐름을 실행하면 Then 자동 처리 가능한 활동은 정리되고 계정은 즉시 비활성화된다.
- **AC-04. 탈퇴 가능 여부 확인 API가 실패한다**: Given 로그인됨, API 실패 또는 repository failure When 사용자가 해당 흐름을 실행하면 Then 계정 상태는 변경되지 않는다.
- **AC-05. 최종 DELETE 중 서버가 차단을 다시 감지한다**: Given check는 통과했지만 DELETE 시점에 blocking item 발생 When 사용자가 해당 흐름을 실행하면 Then 계정은 비활성화되지 않는다. 앱은 실패 응답의 점검 내용을 읽어 차단 창을 다시 보인다.
