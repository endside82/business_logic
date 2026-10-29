# F01-03. 이메일 인증 PRD

<!-- release-document: reference -->

> 2026-10-29 현재 소스 대조: 공개 API `9f9928876`, 앱 `9472ab98`. 현재 할 일은 [다음 작업](../../../../docs/plan/NEXT_WORK.md), 설계 근거는 [이메일 번호 인증](../../../../docs/plan/auth/EMAIL_CODE_AUTH_2026-10-29.md)을 따른다.

가입 전에 이메일로 보낸 6자리 번호를 앱에서 확인한다. 가입 뒤 메일 링크를 눌러 제한을 해제하던 방식은 2026년 10월 29일 제거됐다. 번호 확인은 가입·비밀번호 찾기·Google 기존 계정 연결에서 목적별로 분리된다.

## 번호를 받고 확인하기

이메일로 받은 6자리 번호를 앱에 입력한다. 번호는 10분 유효하며, 5회 틀리면 폐기된다. 다시 받기는 60초 뒤에 가능하고 같은 목적·이메일로 첫 발송부터 24시간 동안 10회까지 보낸다. 새 번호를 받으면 이전 번호는 사용할 수 없다. 발송 실패는 발송 횟수에서 되돌린다.

## 실패와 다시 시작

잘못된 번호는 같은 화면에서 고친다. 만료되거나 시도 횟수를 넘기면 새 번호를 받는다. 가입·재설정·계정 연결용 확인 표가 만료되거나 이미 사용됐다면 이메일 또는 Google 인증부터 다시 시작한다. 메일이 늦게 도착했을 때에는 마지막으로 요청한 번호만 사용한다.

## 가입 확인과 계정 생성의 경계

가입 번호를 확인하면 60분 유효한 가입 표를 받는다. 이 단계에서는 사용자·지갑·프로필이 아직 생성되지 않는다. 가입 정보를 제출해 계정 생성이 성공하면 이메일 인증 완료 상태로 로그인한다. 주소를 잘못 썼다면 계정 삭제 없이 이메일 입력부터 다시 시작한다.

## 없어진 정책

가입 뒤 미인증 계정의 이용을 막던 EMAIL_NOT_VERIFIED 제한, 인증 링크 진입 화면, 가입 후 인증 메일 재발송 API, 미인증 30일 뒤 안내·7일 뒤 익명 처리 작업은 제거됐다. emailVerified 필드는 남지만 옛 제한 세션을 유지하는 근거가 아니다. 기존 메일 링크는 현재 앱에서 로그인으로 안내하고, 웹·공유 링크 계약 정리는 남은 작업이다.

## 발송 장애와 운영 확인

인증번호 메일은 요청 중 발송한다. 발송에 실패하면 오류를 안내하고 재시도한다. 이전 링크 메일의 아웃박스 재처리 정책을 번호 메일에 적용하지 않는다. 운영 환경의 번호 인증 우회는 꺼져 있어야 하며, 실제 외부 수신함·물리 기기·iOS에서 지연·재발송·만료를 별도로 확인해야 한다.

## 서버 계약

| 메서드·주소 | 요청과 응답 |
| --- | --- |
| `POST /api/v1/auth/signup/email-code` | EmailCodeRequestParam: email → EmailCodeSentVo |
| `POST /api/v1/auth/signup/email-code/verify` | EmailCodeVerifyParam: email, code → SignupTokenVo |

## 출시 확인

- 새 번호 메일을 실제 외부 수신함에서 받아 10분 안에 확인하고 가입으로 이어진다.
- 60초 재발송 제한·24시간 10회 제한·5회 오입력·새 번호 뒤 이전 번호 거절을 확인한다.
- 운영 우회가 꺼져 있고, 번호·가입 표·개인정보가 로그나 오류 응답에 노출되지 않는다.

이전 링크 방식의 10월 12일 실수신 결과를 번호 인증의 통과 기록으로 사용하지 않는다. [외부 준비 현황](../../../docs/qa/external-readiness.html)에서 운영 메일·새 패키지·물리 기기·iOS의 남은 검증을 확인한다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-10-29에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `POST /api/v1/auth/signup/email-code` | `AuthController#requestSignupCode` | [AuthController.java:54](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L54) |
| `POST /api/v1/auth/signup/email-code/verify` | `AuthController#verifySignupCode` | [AuthController.java:60](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L60) |
<!-- source-references:end -->
