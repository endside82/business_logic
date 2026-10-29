# F01-02. 소셜 로그인 PRD

<!-- release-document: reference -->

> 2026-10-29 현재 소스 대조: 공개 API `9f9928876`, 앱 `9472ab98`. 현재 할 일은 [다음 작업](../../../../docs/plan/NEXT_WORK.md), 설계 근거는 [이메일 번호 인증](../../../../docs/plan/auth/EMAIL_CODE_AUTH_2026-10-29.md)을 따른다.

현재 활성 소셜 제공자는 Google이다. 외부 인증 후 기존 사용자·신규 사용자·같은 이메일의 기존 계정 연결을 구분한다. 카카오·네이버·Apple의 코드는 남아 있지만 활성화와 실제 사용 확인은 별도다.

## Google 인증 뒤 세 갈래

이미 연결된 Google 계정이면 로그인한다. 처음 보는 Google 신원이고 같은 이메일 계정도 없으면 그때 닉네임·생년월일·약관을 받고 가입한다. 같은 이메일의 기존 계정이 있으면 계정 연결 확인 화면으로 안내한다. 재방문 사용자에게 가입 정보를 먼저 다시 묻지 않는다.

## 기존 계정에 Google 연결

서버는 SOCIAL_ACCOUNT_LINK_REQUIRED 응답과 가린 이메일·30분 유효한 linkToken을 준다. 사용자가 연결에 동의한 뒤 기존 계정 이메일로 번호를 보내고, 6자리 번호를 확인하면 그 계정에 Google을 연결하고 로그인한다. 이메일 문자열이 같다는 이유만으로 자동 연결하지 않는다. 별도 계정도 만들지 않는다.

## 연결 중 상태가 바뀐 경우

연결 확정 시 계정을 잠그고 이메일·계정 상태·기존 소셜 연결을 다시 검사한다. 다른 Google 계정이 이미 연결됐거나 정지·차단 등 이용 제한이 있으면 해당 정책을 따른다. 탈퇴 대기 계정은 안내 대상으로 처리하며 일반 연결 성공으로 취급하지 않는다. 연결 표는 한 번만 사용할 수 있다.

## 신규 가입과 취소

신규 사용자에게만 만 19세 이상·필수 약관·닉네임을 확인한다. 검증된 Google 이메일로 가입한 계정은 이메일 인증 완료로 만든다. 외부 인증이나 추가 정보 입력을 취소하면 로그인 화면에 남고 계정을 만들지 않는다. 공급자 오류와 사용자가 취소한 경우를 구분한다.

## 현재 로그인 활성 상태와 iOS 공개 전 결정

이메일·Google이 현재 활성 상태다. iOS 공개 전 로그인 구성 결정은 아직 남아 있다. Apple을 선택하면 설정·이메일 숨기기·실제 로그인·탈퇴와 인증 철회까지 확인한다. 카카오·네이버는 후속 공개 범위다. 구체 준비는 외부 준비 현황의 iOS 로그인 구성과 심사 준비를 따른다.

## 서버 계약

| 메서드·주소 | 요청과 응답 |
| --- | --- |
| `POST /api/v1/auth/social` | SocialLoginParam → LoginVo; 기존 이메일 연결 필요 시 409 + linkToken/maskedEmail |
| `POST /api/v1/auth/social/existing-account/email-code` | SocialLinkCodeParam: linkToken → EmailCodeSentVo |
| `POST /api/v1/auth/social/existing-account/link` | SocialLinkConfirmParam: linkToken, code → LoginVo |

## 출시 확인

- Google 기존 로그인·신규 가입·기존 이메일 연결 세 경로와 취소를 실제 계정으로 확인한다.
- 연결 동의 전 메일을 보내지 않고, 다른 번호·만료 표·동시 연결·정지 또는 탈퇴 대기 상태를 확인한다.
- Android 새 패키지의 OAuth·서명과 iOS 로그인 구성을 갖춘 뒤 물리 기기·배포본에서 재검사한다.

이전 링크 방식의 10월 12일 실수신 결과를 번호 인증의 통과 기록으로 사용하지 않는다. [외부 준비 현황](../../../docs/qa/external-readiness.html)에서 운영 메일·새 패키지·물리 기기·iOS의 남은 검증을 확인한다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-10-29에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `POST /api/v1/auth/social` | `AuthController#socialLogin` | [AuthController.java:95](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L95) |
| `POST /api/v1/auth/social/existing-account/email-code` | `AuthController#requestSocialLinkCode` | [AuthController.java:102](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L102) |
| `POST /api/v1/auth/social/existing-account/link` | `AuthController#linkSocialToExistingAccount` | [AuthController.java:108](https://github.com/endside82/community_api/blob/cf4497208fb99585b4455b2b8ba392857fbcce24/src/main/java/com/endside/community/account/controller/AuthController.java#L108) |
<!-- source-references:end -->
