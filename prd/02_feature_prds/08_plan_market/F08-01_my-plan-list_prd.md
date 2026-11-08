# F08-01. 내 플랜 목록 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

크리에이터가 본인이 작성한 플랜과 구매한 플랜을 한 화면에서 관리하기 위한 두 개의 페이징 목록과, 새 플랜 작성을 시작하는 DRAFT 생성 엔드포인트를 제공한다. 플랜 작성 한도(일반 5개 / HOST 10개)는 이 단계에서 검증된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 또는 마이페이지 ▶ "내 플랜" 메뉴 ▶ `/plan` (Routes.planList)
- 마켓 메인의 "내가 만든 플랜" 진입 카드
- 새 플랜 생성 후 자동 진입 (블록 에디터에서 뒤로가기)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `PlanController`, `Plan`, `PlanAddParam`, `PlanService`. 앱: `plan_list_screen.dart`, `plan_detail_screen.dart`, `plan_preview_screen.dart`, `block_editor_screen.dart`.

<!-- source-references:start -->
서버 창구: `PlanController#getMyCreatedPlans`, `PlanController#getMyPurchasedPlans`, `PlanController#createPlan`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 2026-10-29 현재 계약 대조

### 응답이 끊긴 생성 요청은 같은 요청으로 확인합니다

차수 10에서 모임 생성 다섯 경로·플랜 생성·정기모임 생성·개인 반복 생성에 요청 고유키를 연결했다. 같은 키·같은 본문 재전송은 앞 결과를 돌려주며 다른 본문 재사용은 거절한다. 저장 결과를 모르는 동안 새 생성으로 바꾸지 않는다. 화면 재진입·계정 전환 뒤 이전 사용자의 미확정 요청을 현재 계정으로 보내지 않는지도 확인한다.

기존 설계 중 이 규칙과 다른 서술은 아래 현재 계약을 기준으로 정정한다. 운영·실기기 완료 판정은 [현재 출시 상태표](../../../docs/qa/launch-status.html)를 따른다.

<!-- source-references:start -->
### 확인한 서버 코드 위치

2026-11-01에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. 아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.

| 호출 주소 | 처리 함수 | 확인한 코드 위치 |
|---|---|---|
| `GET /api/v1/plans/my/created` | `PlanController#getMyCreatedPlans` | [PlanController.java:178](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/plan/controller/PlanController.java#L178) |
| `GET /api/v1/plans/my/purchased` | `PlanController#getMyPurchasedPlans` | [PlanController.java:170](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/plan/controller/PlanController.java#L170) |
| `POST /api/v1/plans` | `PlanController#createPlan` | [PlanController.java:46](https://github.com/endside82/community_api/blob/3e654d5eb2ad02fbb8b30ae6a5d7d357a62902d3/api-app/src/main/java/com/endside/community/plan/controller/PlanController.java#L46) |
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 시:
   - 만든 플랜 탭: `myCreatedPlansNotifierProvider` ▶ `PlanRepository.getMyCreatedPlans(page:0,size:20)` ▶ `GET /api/v1/plans/my/created`
   - 구매한 플랜 탭: `myPurchasedPlansNotifierProvider` ▶ `PlanRepository.getMyPurchasedPlans(page:0,size:20)` ▶ `GET /api/v1/plans/my/purchased`
2. "+ 새 플랜 만들기": `planCreateNotifierProvider.createPlan(title)` ▶ `PlanRepository.createPlan(PlanAddParam(title:..., price:0))` ▶ `POST /api/v1/plans` ▶ 성공 시 `ref.invalidate(myCreatedPlansNotifierProvider)` + push edit
3. "판매 시작": 발행 화면(F08-05)으로 이동한다. 발행 호출은 그 화면이 한다.
4. 풀투리프레시: 해당 탭 notifier invalidate

## 4. 제품 규칙

- 새 플랜은 제목만 받아 가격 0 의 DRAFT 로 만들고 곧장 블록 에디터로 간다. 제목이 공백뿐이면 창을 닫지 않는다. 무료 포인트 허용과 가격은 발행·수정 때 정한다(F08-05).
- 내가 만든 목록은 DELETED 를 뺀 모든 상태를 보여 준다. 플랜 수 한도도 DELETED 를 뺀 수로 센다.
- DRAFT 와 HIDDEN 카드의 "판매 시작"은 바로 발행하지 않고 발행 화면으로 보낸다. 준비도 확인을 건너뛰지 못하게 하기 위해서다. 마켓이 닫혀 있으면 이 단추는 없다.
- 구매한 플랜 탭은 가격이 0 이면 "무료"로 표시한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 플랜 작성 (Happy Path — 신규 크리에이터) | 로그인됨, 내가 만든 플랜 0건, 일반 사용자(USER 한도 5) | DRAFT 플랜 1건 생성, 사용자는 블록 에디터 화면에서 첫 블록을 추가할 준비 완료 |
| S2 | 두 탭 전환 (만든 / 구매) | 만든 플랜 3개(DRAFT/PUBLISHED 혼재), 구매 플랜 2개 | 컨텍스트 따라 다른 화면으로 이동 (편집 vs 미리보기) |
| S3 | DRAFT 카드 인라인 발행 | 작성 완료한 DRAFT 플랜 1건 (블록/제목/설명 모두 충족) | 플랜이 마켓에 노출 시작 |
| S4 | 한도 초과 (5개 / 10개) | 일반 사용자, DRAFT/PUBLISHED 합쳐 5개 보유 | 새 플랜 생성 실패. HOST 권한 사용자는 한도 10개로 더 여유. |
| S5 | 빈 제목 입력 시도 | 시나리오 본문 참조 | API 호출 자체가 발생하지 않음 |
| S6 | 풀투리프레시 | 만든 플랜 탭에는 `Draft Hiking Plan` / `Hidden Language Exchange Plan` 노출, 구매 이력 0건 | 최신 목록 표시 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 플랜 만들기 실패 안내 | 만들기에 실패하면 제목 창은 쓴 제목을 그대로 쥔 채 남고, 서버가 준 이유를 알림으로 띄운다. 이유가 없으면 「플랜을 만들지 못했습니다」 를 띄운다 | 없음 |

## 9. 수용 기준

- **AC-01. 첫 플랜 작성 (Happy Path — 신규 크리에이터)**: Given 로그인됨, 내가 만든 플랜 0건, 일반 사용자(USER 한도 5) When 사용자가 해당 흐름을 실행하면 Then DRAFT 플랜 1건 생성, 사용자는 블록 에디터 화면에서 첫 블록을 추가할 준비 완료
- **AC-02. 두 탭 전환 (만든 / 구매)**: Given 만든 플랜 3개(DRAFT/PUBLISHED 혼재), 구매 플랜 2개 When 사용자가 해당 흐름을 실행하면 Then 컨텍스트 따라 다른 화면으로 이동 (편집 vs 미리보기)
- **AC-03. DRAFT 카드 인라인 발행**: Given 작성 완료한 DRAFT 플랜 1건 (블록/제목/설명 모두 충족) When 사용자가 해당 흐름을 실행하면 Then 플랜이 마켓에 노출 시작
- **AC-04. 한도 초과 (5개 / 10개)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 새 플랜 생성 실패. HOST 권한 사용자는 한도 10개로 더 여유.
- **AC-05. 빈 제목 입력 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then API 호출 자체가 발생하지 않음
- **AC-06. 풀투리프레시**: Given 만든 플랜 탭에는 `Draft Hiking Plan` / `Hidden Language Exchange Plan` 노출, 구매 이력 0건 When 사용자가 해당 흐름을 실행하면 Then 최신 목록 표시

## 10. 미결정 / 후속

- `PlanAddParam`에 `allowFreePoints`/`freePointPrice`가 있으나 현재 생성 다이얼로그는 제목만 받는다. 생성 시점에 무료 허용/차등가를 입력받게 할지, 발행/수정 단계(F08-05)로 미룰지는 화면 결정 사항이다. 정책 자체는 `03_policy_prds/payment_settlement_policy_prd.md` §2.5를 따른다.
