# F01-04. 비밀번호 재설정 PRD

<!-- release-document: reference -->

> 2026-10-29 현재 소스 대조: 공개 API `9f9928876`, 앱 `9472ab98`. 현재 할 일은 [다음 작업](../../../../docs/plan/NEXT_WORK.md), 설계 근거는 [이메일 번호 인증](../../../../docs/plan/auth/EMAIL_CODE_AUTH_2026-10-29.md)을 따른다.

이메일 입력, 6자리 번호 확인, 새 비밀번호 설정의 세 단계로 계정 접근을 회복한다. 이메일 링크로 앱을 여는 방식과 30분 링크 유효기간은 현재 동작이 아니다.

## 이메일에 따른 발송

사용 가능한 비밀번호 계정이면 인증번호 메일을 보낸다. 비밀번호 없이 Google로 가입한 계정이면 Google 로그인을 이용하라는 안내 메일을 보낸다. 존재하지 않거나 닫힌 계정에는 보내지 않는다. 정상 요청 응답은 이 경우들에서 같다. 다만 실제 메일 발송 장애는 503으로 드러날 수 있으므로 장애 중까지 가입 여부가 완전히 숨겨진다고 보장하지 않는다.

## 번호 확인 뒤 새 비밀번호

6자리 번호는 10분 동안 유효하다. 확인하면 15분 유효한 재설정 표를 받고 새 비밀번호를 입력한다. 확인 요청에는 이메일과 번호, 변경 요청에는 이메일·표(token)·newPassword를 보낸다. 가입과 같은 영문·숫자·특수문자 포함 8~20자 규칙을 적용한다.

## 변경 결과와 세션 종료

표와 이메일이 일치해야 하며 표는 변경 시 원자적으로 소모돼 두 번 성공할 수 없다. 비밀번호가 바뀌면 모든 기존 세션을 종료하고 실시간 연결에도 해지를 알린다. 새 비밀번호로 다시 로그인한다. 과거 미인증 계정도 이 복구가 성공하면 이메일 인증 완료로 기록한다.

## 번호를 받고 확인하기

이메일로 받은 6자리 번호를 앱에 입력한다. 번호는 10분 유효하며, 5회 틀리면 폐기된다. 다시 받기는 60초 뒤에 가능하고 같은 목적·이메일로 첫 발송부터 24시간 동안 10회까지 보낸다. 새 번호를 받으면 이전 번호는 사용할 수 없다. 발송 실패는 발송 횟수에서 되돌린다.

## 실패와 다시 시작

잘못된 번호는 같은 화면에서 고친다. 만료되거나 시도 횟수를 넘기면 새 번호를 받는다. 가입·재설정·계정 연결용 확인 표가 만료되거나 이미 사용됐다면 이메일 또는 Google 인증부터 다시 시작한다. 메일이 늦게 도착했을 때에는 마지막으로 요청한 번호만 사용한다.

## 서버 계약

| 메서드·주소 | 요청과 응답 |
| --- | --- |
| `POST /api/v1/auth/password-reset/request` | PasswordResetRequestParam: email → EmailCodeSentVo |
| `POST /api/v1/auth/password-reset/verify` | EmailCodeVerifyParam: email, code → PasswordResetTokenVo |
| `POST /api/v1/auth/password-reset/confirm` | PasswordResetParam: email, token, newPassword → 빈 성공 응답 (200) |

## 출시 확인

- 비밀번호 계정·Google 전용 계정·미가입 이메일의 안내와 실제 발송을 구분해 확인한다.
- 번호 만료·오입력·재발송·15분 표 만료·이메일 불일치·재사용 거절·비밀번호 규칙을 확인한다.
- 변경 뒤 새 비밀번호만 성공하고 이전 비밀번호·Access/Refresh 토큰·실시간 세션을 사용할 수 없다.

이전 링크 방식의 10월 12일 실수신 결과를 번호 인증의 통과 기록으로 사용하지 않는다. [외부 준비 현황](../../../docs/qa/external-readiness.html)에서 운영 메일·새 패키지·물리 기기·iOS의 남은 검증을 확인한다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-10-29에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `POST /api/v1/auth/password-reset/request` | `AuthController#requestPasswordReset` | [AuthController.java:141](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L141) |
| `POST /api/v1/auth/password-reset/verify` | `AuthController#verifyPasswordResetCode` | [AuthController.java:148](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L148) |
| `POST /api/v1/auth/password-reset/confirm` | `AuthController#confirmPasswordReset` | [AuthController.java:153](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L153) |
<!-- source-references:end -->
