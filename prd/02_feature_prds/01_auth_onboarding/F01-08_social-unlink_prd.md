# F01-08. 소셜 계정 연결 해제 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 더 이상 사용하지 않는 소셜 제공자(Apple/Google/Kakao/Naver)를 계정에서 분리한다. 단, 모든 로그인 수단이 사라지지 않도록 "최소 1개의 로그인 수단(이메일+비밀번호 또는 소셜)" 정책을 강제한다. 마지막 남은 수단을 해제하려고 하면 차단된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 본 단위에 전용 화면 없음
- 외부 단위(설정/프로필, Unit 13 추정)에서 사용자가 "{Provider} 연결 해제" 항목 탭

## 2. 코드 위치

계약의 정본은 코드다. 서버: `AuthController`. 앱: `auth_api.dart`, `auth_repository.dart`.

<!-- source-references:start -->
서버 창구: `AuthController#unlinkSocial`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

> 원천 frontend 문서에 API 호출 순서가 없다. Route/Screen/Provider를 실제 소스에서 재확인해야 한다.

## 4. 제품 규칙

- 연결 해제는 우리 서비스 쪽 연결만 지운다. Apple, Google, Kakao, Naver 쪽 계정 연결은 취소하지 않는다.
- 제공자 이름은 대소문자를 가리지 않는다. 목록에 없는 이름은 오류로 거절한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 이메일 가입자 + 카카오 연동 사용자가 카카오 해제 (Happy Path) | - `Users.password != null` (비밀번호 있음) | 카카오 SocialLogin 삭제, 이메일/비밀번호로만 로그인 가능 |
| S2 | 카카오만 사용하는 사용자가 해제 시도 (마지막 수단 차단) | - `Users.password = null` | 해제 차단, 사용자가 비밀번호 설정 또는 다른 소셜 추가 후 재시도 필요 |
| S3 | 카카오 + 구글 사용자가 카카오 해제 | SocialLogin 2행 (KAKAO, GOOGLE), password null | 1개 남음(GOOGLE) — 다음 카카오 해제 시도는 차단됨 |
| S4 | 잘못된 providerType | 시나리오 본문 참조 | 변화 없음 |
| S5 | 연동되지 않은 제공자 해제 시도 | KAKAO만 보유 + 비밀번호 있음 | 변화 없음 |
| S6 | 해제 후 같은 제공자로 다시 로그인 | S1의 사용자가 다시 카카오 로그인 시도 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 인증 없이 호출 | 시나리오 본문 참조 | 변화 없음 |
| S8 | 동시 다발 해제 호출 (멀티 디바이스) | 시나리오 본문 참조 | 동시성 안전 (count + hasPassword 검사가 트랜잭션 내 자동 보호) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:40 | - providerType 문자열은 사용처에서 결정 — 본 단위 코드에서는 검증 없음, 어떤 문자열이든 그대로 path로 전달 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 이메일 가입자 + 카카오 연동 사용자가 카카오 해제 (Happy Path)**: Given - `Users.password != null` (비밀번호 있음) When 사용자가 해당 흐름을 실행하면 Then 카카오 SocialLogin 삭제, 이메일/비밀번호로만 로그인 가능
- **AC-02. 카카오만 사용하는 사용자가 해제 시도 (마지막 수단 차단)**: Given - `Users.password = null` When 사용자가 해당 흐름을 실행하면 Then 해제 차단, 사용자가 비밀번호 설정 또는 다른 소셜 추가 후 재시도 필요
- **AC-03. 카카오 + 구글 사용자가 카카오 해제**: Given SocialLogin 2행 (KAKAO, GOOGLE), password null When 사용자가 해당 흐름을 실행하면 Then 1개 남음(GOOGLE) — 다음 카카오 해제 시도는 차단됨
- **AC-04. 잘못된 providerType**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변화 없음
- **AC-05. 연동되지 않은 제공자 해제 시도**: Given KAKAO만 보유 + 비밀번호 있음 When 사용자가 해당 흐름을 실행하면 Then 변화 없음
- **AC-06. 해제 후 같은 제공자로 다시 로그인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 인증 없이 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변화 없음
- **AC-08. 동시 다발 해제 호출 (멀티 디바이스)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 동시성 안전 (count + hasPassword 검사가 트랜잭션 내 자동 보호)
