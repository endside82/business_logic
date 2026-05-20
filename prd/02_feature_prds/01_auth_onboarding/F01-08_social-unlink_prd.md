# F01-08. 소셜 계정 연결 해제 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/01_auth_onboarding/F01-08_social-unlink -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/01_auth_onboarding/F01-08_social-unlink`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 더 이상 사용하지 않는 소셜 제공자(Apple/Google/Kakao/Naver)를 계정에서 분리한다. 단, 모든 로그인 수단이 사라지지 않도록 "최소 1개의 로그인 수단(이메일+비밀번호 또는 소셜)" 정책을 강제한다. 마지막 남은 수단을 해제하려고 하면 차단된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 본 단위에 전용 화면 없음
- 외부 단위(설정/프로필, Unit 13 추정)에서 사용자가 "{Provider} 연결 해제" 항목 탭

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/01_auth_onboarding/F01-08_social-unlink/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/01_auth_onboarding/F01-08_social-unlink/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/01_auth_onboarding/F01-08_social-unlink/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/01_auth_onboarding/F01-08_social-unlink/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/AuthController.java:67` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

> 원천 frontend 문서에 API 호출 순서가 없다. Route/Screen/Provider를 실제 소스에서 재확인해야 한다.

## 4. 서버 계약

### 개요

사용자가 더 이상 사용하지 않는 소셜 제공자(Apple/Google/Kakao/Naver)를 계정에서 분리한다. 단, 모든 로그인 수단이 사라지지 않도록 "최소 1개의 로그인 수단(이메일+비밀번호 또는 소셜)" 정책을 강제한다. 마지막 남은 수단을 해제하려고 하면 차단된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| DELETE | /api/v1/auth/social/{providerType} | `AuthController#unlinkSocial` | required | 해당 제공자 SocialLogin 삭제 (204) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `ProviderType`: `EMAIL(0)`, `KAKAO(1)`, `NAVER(2)`, `GOOGLE(3)`, `APPLE(4)`
  - Path 변환 로직: `ProviderType.valueOf(providerType.toUpperCase())` — "kakao"/"KAKAO" 모두 허용
  - 잘못된 값(예: "facebook")은 `IllegalArgumentException` (Spring 기본 400)
- **Entity** `SocialLogin`: `userId`, `providerType` (int), `socialId`
- 정책: 최소 1개 로그인 수단 보장 (소셜 카운트 + 비밀번호 보유 ≥ 2 인 경우만 해제 가능)

### 의존 단위 / 외부 시스템

- 다른 Unit 의존: 없음
- 사용처:
  - 외부 단위(Unit 13 — 프로필/설정 화면) → 본 API 호출
- 외부 시스템: 없음 (외부 OAuth provider revoke는 호출하지 않음)

## 5. 프론트 계약

### 진입 경로

- 본 단위에 전용 화면 없음
- 외부 단위(설정/프로필, Unit 13 추정)에서 사용자가 "{Provider} 연결 해제" 항목 탭

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| (외부 단위) | (Unit 13 settings) | 연결된 소셜 목록 + 해제 버튼 — 본 단위 화면 없음 |

본 단위에서 정의되는 코드:

| 파일 | 역할 |
|---|---|
| `lib/data/api/auth_api.dart` | `AuthApi.unlinkSocial(@Path() String providerType)` |
| `lib/data/repositories/auth_repository.dart` | `AuthRepository.unlinkSocial(String providerType)` |

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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
