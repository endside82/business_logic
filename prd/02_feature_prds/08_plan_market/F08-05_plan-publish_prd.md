# F08-05. 플랜 발행 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-05_plan-publish -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-05_plan-publish`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

DRAFT/HIDDEN 상태의 플랜을 PUBLISHED로 전환하여 마켓에 노출 가능하게 만드는 단일 엔드포인트. 작성자만 호출 가능하며, 상태 전이 규칙(DRAFT/HIDDEN → PUBLISHED)을 검증한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 플랜 상세(F08-02) ▶ DRAFT/HIDDEN 상태에서 "발행하기" 버튼 ▶ `/plan/:planId/publish`
- 플랜 목록(F08-01) ▶ 카드 인라인 "판매 시작" 버튼 ▶ confirm 다이얼로그로 직접 publish 호출 (상세→발행 화면을 거치지 않음, 단축 경로)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-05_plan-publish/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-05_plan-publish/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-05_plan-publish/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-05_plan-publish/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:101` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 진입 시: `planDetailNotifierProvider(planId)` ▶ `GET /api/v1/plans/{planId}` (플랜 메타 + 블록 카운트는 plan.blocks에서 가져옴 — 단, 현재 PlanVo.blocks는 null이므로 실제로는 0으로 카운트되는 가능성 있음)
2. 커버 업로드 시: 파일 업로드 (`uploadImageFile`) → `planCreateNotifier.updatePlan(planId, PlanModParam(thumbnailUrl:fileKey))` → `PATCH /api/v1/plans/{id}`
3. 발행 시:
   - 가격/설명 변경 있으면 `planCreateNotifier.updatePlan(planId, PlanModParam(price, description))` → `PATCH`
   - `planPublishNotifierProvider.publishPlan(planId)` → `POST /publish` → 200
   - notifier 내부에서 `ref.invalidate(myCreatedPlansNotifierProvider)`, `planDetailNotifierProvider(planId)` 트리거 (provider 코드 패턴)

## 4. 서버 계약

### 개요

DRAFT/HIDDEN 상태의 플랜을 PUBLISHED로 전환하여 마켓에 노출 가능하게 만드는 단일 엔드포인트. 작성자만 호출 가능하며, 상태 전이 규칙(DRAFT/HIDDEN → PUBLISHED)을 검증한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/plans/{planId}/publish | `PlanController#publishPlan` | required | 작성자 검증 + DRAFT/HIDDEN → PUBLISHED |

### 도메인 모델 / Enum (이 기능 관련)

- **PlanStatus** 전이:
  - DRAFT → PUBLISHED (publishPlan)
  - HIDDEN → PUBLISHED (publishPlan)
  - PUBLISHED → PUBLISHED 시도 시 `PLAN_INVALID_STATUS_TRANSITION` 400
  - DELETED → PUBLISHED 시도 시 `PLAN_INVALID_STATUS_TRANSITION` 400
- **PlanModParam 무료 포인트 관련 필드** (`PATCH /api/v1/plans/{id}`, `plan/param/PlanModParam.java`): 발행/수정 시 작성자가 함께 설정
  - `allowFreePoints` (Boolean, nullable): 이 플랜을 무료 포인트로 구매할 수 있게 허용할지 여부
  - `freePointPrice` (BigDecimal, nullable): 무료 포인트 결제 시 적용할 차등 금액. 미설정 시 무료 결제는 유료우선 혼합(허용 시), 설정 시 무료 결제는 그 금액 단일 통화
  - 유료/무료 분리정산(Point Split Flow-Through) 정책에 따라 무료 결제분은 수취자에게 무료로만 전파되어 현금화되지 않는다. 상세 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.
- **에러 코드**:
  - 1500001 PLAN_NOT_FOUND
  - 1500002 PLAN_NOT_CREATOR
  - 1500003 PLAN_INVALID_STATUS_TRANSITION

### 의존 단위 / 외부 시스템

- **F08-02**: 발행 후 PlanVo는 plan_detail 화면 invalidate 트리거가 됨
- **F08-08 (마켓 메인 탐색, 다른 agent 영역)**: PUBLISHED 플랜이 `GET /api/v1/plans?status=PUBLISHED` 또는 `GET /api/v1/market/items` 결과에 노출됨
- 외부 시스템 호출 없음 (PG/FCM/S3 미사용)

## 5. 프론트 계약

### 진입 경로

- 플랜 상세(F08-02) ▶ DRAFT/HIDDEN 상태에서 "발행하기" 버튼 ▶ `/plan/:planId/publish`
- 플랜 목록(F08-01) ▶ 카드 인라인 "판매 시작" 버튼 ▶ confirm 다이얼로그로 직접 publish 호출 (상세→발행 화면을 거치지 않음, 단축 경로)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/plan/:planId/publish` | `plan/screens/plan_publish_screen.dart` | 체크리스트 확인 + 가격/설명/커버 입력 + 발행 |
| `/plan/:planId/edit` | `plan/screens/block_editor_screen.dart` | 미충족 항목 수정을 위해 돌아가는 화면 |

### 화면별 구성 요소 & 액션

### 발행 (`plan_publish_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '플랜 발행')`
  - `_PreviewCard(plan)`: 썸네일(72×72) + 제목 + "N개 블록 · DRAFT" + "최종 수정: YYYY.MM.DD"
  - **발행 체크리스트** (`_buildChecklist`):
    1. 제목 입력 (2~50자) — `titleLen` 표시
    2. 최소 1개 블록 — `blockCount`개 표시
    3. 설명 입력 (10~500자) — `descLen` 표시
    4. 커버 이미지 — 등록됨/미등록
    5. 가격 설정 — 항상 통과(0이면 "무료", >0이면 "₩금액" 콤마 포맷)
  - 각 체크 아이템: ✅/❌ + 라벨 + 우측 상태 텍스트 (통과 primary500 / 실패 error500)
  - **가격 설정** 섹션: TextField(숫자만) + "원" 단위, 안내 "0원으로 설정하면 무료 플랜으로 등록됩니다"
  - **커버 이미지** 섹션: `_CoverImagePicker` (현재 URL 표시 또는 "이미지를 선택해주세요 + 권장 16:9, 1200x675px")
  - **플랜 설명** 섹션: TextField multiline, hintText "플랜에 대한 설명을 입력하세요 (10~500자)"
  - 하단 SafeArea + Padding: "발행하기" 버튼 (체크리스트 미충족 시 primary500 50% 알파)
- **사용자가 할 수 있는 액션**:
  - 가격 입력 → 컨트롤러에 저장 (제출 시 plan.update)
  - 설명 입력 → 컨트롤러에 저장
  - 커버 이미지 탭 → `_pickCoverImage()`:
    1. `ImagePicker().pickImage` (gallery, maxW:1200, maxH:675, q:85)
    2. `uploadImageFile(purpose: 'EVENT_THUMBNAIL')` ▶ 파일키 받음
    3. `planCreateNotifierProvider.updatePlan(planId, PlanModParam(thumbnailUrl: fileKey))` ▶ `PATCH /api/v1/plans/{id}`
    4. `ref.invalidate(planDetailNotifierProvider)` + 로컬 `_uploadedThumbnailUrl` 갱신
  - "발행하기" 탭 → `_publish(plan, allPassed)`:
    - 미충족 시 토스트 "발행 조건을 모두 충족해야 합니다" (`ToastType.error`)
    - confirm `AlertDialog("발행 후에는 수정할 수 없습니다.\n발행하시겠습니까?")` (취소/발행)
    - 사용자 변경된 가격/설명이 있으면 먼저 `updatePlan(PlanModParam)` 호출
    - `planPublishNotifierProvider.publishPlan(planId)` ▶ `POST /api/v1/plans/{id}/publish`
    - 성공: 토스트 "플랜이 발행되었습니다" + `Navigator.pop`
    - 실패: 토스트 "발행에 실패했습니다" + 로컬 isPublishing=false
- **상태 분기**:
  - 로딩(plan fetch): `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`
  - 발행 중: 버튼이 `CircularProgressIndicator(strokeWidth:2, white)`로 변경
  - 커버 업로드 중: `_isUploadingCover` 상태로 picker 영역에 spinner 표시
- **모달/시트/네비게이션**:
  - 발행 확인: `AlertDialog` (raw, not AppDialog)
  - 성공 시 `Navigator.of(context).pop()` (back to detail)

### API 호출 순서 (Provider/Repository 관점)

1. 진입 시: `planDetailNotifierProvider(planId)` ▶ `GET /api/v1/plans/{planId}` (플랜 메타 + 블록 카운트는 plan.blocks에서 가져옴 — 단, 현재 PlanVo.blocks는 null이므로 실제로는 0으로 카운트되는 가능성 있음)
2. 커버 업로드 시: 파일 업로드 (`uploadImageFile`) → `planCreateNotifier.updatePlan(planId, PlanModParam(thumbnailUrl:fileKey))` → `PATCH /api/v1/plans/{id}`
3. 발행 시:
   - 가격/설명 변경 있으면 `planCreateNotifier.updatePlan(planId, PlanModParam(price, description))` → `PATCH`
   - `planPublishNotifierProvider.publishPlan(planId)` → `POST /publish` → 200
   - notifier 내부에서 `ref.invalidate(myCreatedPlansNotifierProvider)`, `planDetailNotifierProvider(planId)` 트리거 (provider 코드 패턴)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **체크리스트 정의 (클라이언트만 검증)**:
  - 제목 길이 검증: 서버는 200자 컬럼만 가짐, 클라이언트에서 2~50자 강제
  - 설명 10~500자
  - 블록 ≥ 1
  - 커버 이미지 필수
  - 가격은 항상 통과 처리 (0=무료)
- **체크리스트 충족 못해도 서버는 발행 허용**: 따라서 UI에서 `allPassed`가 false면 토스트로 막고 진행 안 함
- **발행 확인 다이얼로그 메시지**: "발행 후에는 수정할 수 없습니다.\n발행하시겠습니까?" — 실제로는 hide → DRAFT/HIDDEN 후 다시 편집 가능하지만, 사용자에게 신중을 유도하는 메시징
- **이미지 업로드 정책**:
  - 갤러리만 (ImageSource.gallery)
  - maxWidth=1200, maxHeight=675 (16:9), quality=85
  - purpose='EVENT_THUMBNAIL' (S3 prefix가 같이 사용됨)
  - 업로드 즉시 plan.thumbnailUrl 갱신 (발행 전이라도 PATCH 호출)
- **가격 입력 제약**: `FilteringTextInputFormatter.digitsOnly` — 정수만, 소수점 입력 불가. 서버는 BigDecimal이지만 UI는 정수 KRW
- **가격 표시 포맷**:
  - 통과 시 "₩1,000" (3자리 콤마 정규식)
  - 0 시 "무료"
- **저장 전략 — 가격/설명 동시 변경**: 별도 PATCH 한 번 + publish PATCH 한 번 (총 2회). 트랜잭션 분리됨 → 가격 PATCH는 성공, publish 실패 시 가격 변경은 남음
- **isInitialized 패턴**: `_initControllers` 한 번만 호출되도록 가드 → 사용자가 입력한 값을 서버 응답으로 덮어쓰지 않음
- **발행 후 UX**:
  - 단순 pop으로 상세로 돌아감 (마켓 아이템 상세로 이동하지 않음)
  - SCR-PE-005 스펙은 "마켓 아이템 상세로 이동"을 명시하지만 현재 코드는 pop만 수행
- **라우터 위치**: `Routes.planList` 하위에 중첩 라우트 (`/plan/:planId/publish`)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 발행 Happy Path | DRAFT 플랜, 제목 28자, 블록 8개, 설명 작성 안 함 | 플랜이 PUBLISHED, 마켓 노출 시작 |
| S2 | HIDDEN에서 재발행 | 이전에 한 번 발행했다가 hide한 플랜 (status=HIDDEN, 모든 메타 충족) | 다시 PUBLISHED |
| S3 | 잘못된 상태에서 발행 시도 | 어떤 이유로 화면이 PUBLISHED 상태인 플랜에서 발행 호출 | 변경 없음 |
| S4 | 비작성자 발행 시도 | 다른 사용자가 직접 API 호출 (앱 UI는 노출되지 않음) | 차단 |
| S5 | 가격/설명 PATCH 성공, publish 실패 (부분 성공) | 시나리오 본문 참조 | 가격/설명은 저장됨, 발행은 실패. 사용자가 다시 "발행하기" 탭하면 publish만 재시도됨 (PATCH는 변경 감지에서 skip) |
| S6 | 커버 업로드 실패 | 시나리오 본문 참조 | 커버 미등록 상태 유지 |
| S7 | 발행 후 마켓 노출 (다른 단위 의존) | 시나리오 본문 참조 | 마켓에서 발견 가능 |

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
| 후보 | backend.md:38 | - 현재 코드에는 푸시/이메일/마켓 아이템 자동 등록 등의 사이드 이펙트 없음 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:67 | ## 주의 — 서버 측 검증 부재 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:84 | - SCR-PE-005 스펙은 "마켓 아이템 상세로 이동"을 명시하지만 현재 코드는 pop만 수행 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 발행 Happy Path**: Given DRAFT 플랜, 제목 28자, 블록 8개, 설명 작성 안 함 When 사용자가 해당 흐름을 실행하면 Then 플랜이 PUBLISHED, 마켓 노출 시작
- **AC-02. HIDDEN에서 재발행**: Given 이전에 한 번 발행했다가 hide한 플랜 (status=HIDDEN, 모든 메타 충족) When 사용자가 해당 흐름을 실행하면 Then 다시 PUBLISHED
- **AC-03. 잘못된 상태에서 발행 시도**: Given 어떤 이유로 화면이 PUBLISHED 상태인 플랜에서 발행 호출 When 사용자가 해당 흐름을 실행하면 Then 변경 없음
- **AC-04. 비작성자 발행 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단
- **AC-05. 가격/설명 PATCH 성공, publish 실패 (부분 성공)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가격/설명은 저장됨, 발행은 실패. 사용자가 다시 "발행하기" 탭하면 publish만 재시도됨 (PATCH는 변경 감지에서 skip)
- **AC-06. 커버 업로드 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 커버 미등록 상태 유지
- **AC-07. 발행 후 마켓 노출 (다른 단위 의존)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 마켓에서 발견 가능

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- 발행/수정 화면에서 작성자가 무료 포인트 허용(`allowFreePoints`)과 무료 결제가(`freePointPrice`)를 설정하는 UI를 어디에 둘지(가격 설정 섹션 인접 등)는 화면에서 결정한다. 정책 자체(무료 허용은 opt-in, 무료분은 현금화 불가)는 `03_policy_prds/payment_settlement_policy_prd.md` §2.5를 따른다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
