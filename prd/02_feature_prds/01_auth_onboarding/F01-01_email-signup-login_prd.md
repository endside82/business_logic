# F01-01. 이메일 가입·로그인 PRD

<!-- release-document: reference -->

> 2026-10-29 현재 소스 대조: 공개 API `9f9928876`, 앱 `9472ab98`. 현재 할 일은 [다음 작업](../../../../docs/plan/NEXT_WORK.md), 설계 근거는 [이메일 번호 인증](../../../../docs/plan/auth/EMAIL_CODE_AUTH_2026-10-29.md)을 따른다.

이메일 소유를 먼저 확인한 뒤 계정을 만든다. 가입을 마치면 바로 로그인되고 온보딩으로 이어진다. 2026년 10월 29일 번호 인증 전환을 반영한 현재 동작이다.

## 가입 순서

이메일 입력 → 인증번호 받기 → 6자리 번호 확인 → 비밀번호·닉네임·생년월일·필수 약관 입력 → 가입 완료와 로그인 → 온보딩이다. 번호 확인만으로 계정이 생성되지는 않는다. 확인된 이메일은 가입 정보 화면에서 바꾸지 않는다.

## 가입 검증과 중복 요청

번호를 확인하면 60분 동안 유효한 가입 표(signupToken)를 받는다. 가입 시 이메일이 그 표와 일치해야 하고 이메일·닉네임 중복, 만 19세 이상, 이용약관·개인정보 동의, 비밀번호 규칙을 검사한다. 가입 표는 계정 생성이 커밋된 뒤 소모하므로 닉네임 충돌 등으로 실패하면 수정해 다시 제출할 수 있다. 동시에 제출해도 같은 이메일의 계정은 하나만 만든다.

## 비밀번호와 선택 정보

가입과 비밀번호 재설정은 영문·숫자·특수문자를 포함한 8~20자 규칙을 공유한다. 공백은 특수문자로 세지 않는다. 휴대전화·성별은 선택 항목이며 마케팅 동의는 필수 약관과 분리한다.

## 기존 계정 로그인

이메일·비밀번호를 검증하고 정지·차단·탈퇴 등 계정 상태에 맞게 처리한다. 잘못된 이메일과 비밀번호에는 같은 자격 증명 오류를 표시한다. 신규 가입 뒤 다시 로그인 화면에서 비밀번호를 입력하게 하지 않는다. 기존 emailVerified 값이 거짓이라는 이유만으로 로그인 이후 서비스를 막는 제한 세션은 제거됐다.

## 기기와 복구

다른 기기에서 새로 로그인하면 기존 세션을 종료한다. 비밀번호를 잊었다면 비밀번호 찾기에서 메일 번호를 확인하고 새 비밀번호를 설정한다. 변경 후에는 이전 비밀번호와 기존 세션으로 접근할 수 없다.

## 서버 계약

| 메서드·주소 | 요청과 응답 |
| --- | --- |
| `POST /api/v1/auth/signup` | SignupParam: email, password, nickname, birthDate, mobile?, gender?, agreeTerm, agreePrivacy, agreeMarketing, signupToken → LoginVo (201) |
| `POST /api/v1/auth/login` | LoginParam → LoginVo (200) |

## 출시 확인

- 실제 메일 번호를 확인하기 전에는 계정이 만들어지지 않고, 확인 뒤 가입·자동 로그인·온보딩으로 이어진다.
- 가입 표 만료·이메일 불일치·닉네임 충돌·중복 제출·미성년·필수 동의 누락·비밀번호 오류를 확인한다.
- 정상 로그인과 정지·탈퇴·다른 기기 세션 종료를 운영 설정의 서명 앱에서 확인한다.

이전 링크 방식의 10월 12일 실수신 결과를 번호 인증의 통과 기록으로 사용하지 않는다. [외부 준비 현황](../../../docs/qa/external-readiness.html)에서 운영 메일·새 패키지·물리 기기·iOS의 남은 검증을 확인한다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-10-29에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `POST /api/v1/auth/signup` | `AuthController#signup` | [AuthController.java:65](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L65) |
| `POST /api/v1/auth/login` | `AuthController#login` | [AuthController.java:71](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L71) |
<!-- source-references:end -->
