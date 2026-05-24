# F08-01. 내 플랜 목록 관리 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-01_my-plan-list -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-01_my-plan-list`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

크리에이터가 본인이 작성한 플랜과 구매한 플랜을 한 화면에서 관리하기 위한 두 개의 페이징 목록과, 새 플랜 작성을 시작하는 DRAFT 생성 엔드포인트를 제공한다. 플랜 작성 한도(일반 5개 / HOST 10개)는 이 단계에서 검증된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭 또는 마이페이지 ▶ "내 플랜" 메뉴 ▶ `/plan` (Routes.planList)
- 마켓 메인의 "내가 만든 플랜" 진입 카드
- 새 플랜 생성 후 자동 진입 (블록 에디터에서 뒤로가기)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-01_my-plan-list/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-01_my-plan-list/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-01_my-plan-list/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-01_my-plan-list/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:141` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:149` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:38` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시:
   - 만든 플랜 탭: `myCreatedPlansNotifierProvider` ▶ `PlanRepository.getMyCreatedPlans(page:0,size:20)` ▶ `GET /api/v1/plans/my/created`
   - 구매한 플랜 탭: `myPurchasedPlansNotifierProvider` ▶ `PlanRepository.getMyPurchasedPlans(page:0,size:20)` ▶ `GET /api/v1/plans/my/purchased`
2. "+ 새 플랜 만들기": `planCreateNotifierProvider.createPlan(title)` ▶ `PlanRepository.createPlan(PlanAddParam(title:..., price:0))` ▶ `POST /api/v1/plans` ▶ 성공 시 `ref.invalidate(myCreatedPlansNotifierProvider)` + push edit
3. "판매 시작": `planPublishNotifierProvider.publishPlan(planId)` ▶ `POST /api/v1/plans/{id}/publish` ▶ `ref.invalidate(myCreatedPlansNotifierProvider)`
4. 풀투리프레시: 해당 탭 notifier invalidate

## 4. 서버 계약

### 개요

크리에이터가 본인이 작성한 플랜과 구매한 플랜을 한 화면에서 관리하기 위한 두 개의 페이징 목록과, 새 플랜 작성을 시작하는 DRAFT 생성 엔드포인트를 제공한다. 플랜 작성 한도(일반 5개 / HOST 10개)는 이 단계에서 검증된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/plans/my/created | `PlanController#getMyCreatedPlans` | required | 내가 만든 플랜 페이지 (DRAFT/PUBLISHED/HIDDEN/DELETED 모두) |
| GET | /api/v1/plans/my/purchased | `PlanController#getMyPurchasedPlans` | required | 구매한 플랜 페이지 |
| POST | /api/v1/plans | `PlanController#createPlan` | required | DRAFT 플랜 생성 (5/10개 한도 검증) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `PlanStatus`: `DRAFT`, `PUBLISHED`, `HIDDEN`, `DELETED`
- **Enum** `PlanType`: `PERSONAL`, `CREATOR`
- **Plan 핵심 필드** (`model/Plan.java`):
  - `id: long`, `creatorId: long`, `title (200)`, `summary (TEXT, NOT NULL)`, `description (TEXT, NOT NULL)`, `category (50, NOT NULL)`
  - `price: BigDecimal(12,2) NOT NULL`, `durationHours: int NOT NULL`
  - `difficulty (20)`, `checklist (JSON)`, `timeline (JSON)`
  - `status: PlanStatus NOT NULL`, `purchaseCount: int NOT NULL`
  - `setupStartTime/EndTime: LocalTime`, `planType: PlanType`, `maxParticipants: Integer`
  - `createdAt/updatedAt: LocalDateTime` (Spring Auditing)
- **PlanLimit 상수** (`PlanService`):
  - `MAX_PLANS_USER = 5`
  - `MAX_PLANS_HOST = 10`
- **PlanAddParam 무료 포인트 관련 필드** (`POST /api/v1/plans`, `plan/param/PlanAddParam.java`): 플랜 생성 시 설정 가능
  - `allowFreePoints` (boolean): 이 플랜을 무료 포인트로 구매할 수 있게 허용할지 여부 (작성자 opt-in)
  - `freePointPrice` (BigDecimal, nullable): 무료 포인트 결제 시 적용할 차등 금액
  - 현재 화면의 새 플랜 다이얼로그는 `title`(+ `price:0`)만 전달하므로 이 두 값은 생성 시점에 기본값으로 들어가고, 이후 발행/수정(F08-05, `PlanModParam`)에서 작성자가 조정한다.
  - 유료/무료 분리정산(Point Split Flow-Through) 정책 적용. 상세 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.

### 의존 단위 / 외부 시스템

- **Account (Unit 01)**: `UserPrincipal.getUserId()`, `UserPrincipal.getRole()` (UserRole.HOST), `UserRepository#findById` (creatorNickname 조회)
- 외부 시스템 의존 없음 (외부 PG/FCM/S3 호출 없음)

## 5. 프론트 계약

### 진입 경로

- 하단 탭 또는 마이페이지 ▶ "내 플랜" 메뉴 ▶ `/plan` (Routes.planList)
- 마켓 메인의 "내가 만든 플랜" 진입 카드
- 새 플랜 생성 후 자동 진입 (블록 에디터에서 뒤로가기)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/plan` | `plan/screens/plan_list_screen.dart` | 두 탭 (내가 만든 / 구매한) 페이지 |
| `/plan/:planId` | `plan/screens/plan_detail_screen.dart` | 카드 탭 시 이동 |
| `/plan/:planId/preview` | `plan/screens/plan_preview_screen.dart` | 구매 플랜 카드 탭 시 이동 |
| `/plan/:planId/edit` | `plan/screens/block_editor_screen.dart` | 새 플랜 생성 직후 이동 |

### 화면별 구성 요소 & 액션

### 플랜 목록 (`plan_list_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '내 플랜')` + 우측 액션 `Icons.bar_chart` (판매 현황 → `/market/creators/me/stats`)
  - 상단 세그먼트 `_TabSelector` — "내가 만든 플랜" / "구매한 플랜" (인덱스 0/1, 선택 시 primary500)
  - `TabBarView`로 두 리스트:
    - `_CreatedPlansTab`: 카드 (썸네일 52×52 + 제목 + summary + `PlanStatusBadge`)
    - DRAFT/HIDDEN 카드는 "판매 시작" 인라인 버튼 노출
    - `_PurchasedPlansTab`: 카드 (썸네일 + 제목 + 가격, 0이면 "무료")
  - 하단 고정 "+ 새 플랜 만들기" CTA (Container 48 height, primary500)
- **사용자가 할 수 있는 액션**:
  - 탭 카드 ▶ `context.push('/plan/${plan.id}')` (만든 플랜) 또는 `'/plan/${plan.planId}/preview'` (구매)
  - "+ 새 플랜 만들기" 탭 ▶ `_showCreateDialog()` ▶ 제목 입력 ▶ `planCreateNotifierProvider.createPlan(title)` ▶ `POST /api/v1/plans` ▶ 성공 시 `context.push('/plan/${plan.id}/edit')`
  - 카드의 "판매 시작" 탭 ▶ `AppDialog.confirm` ▶ `planPublishNotifierProvider.publishPlan(planId)` ▶ `POST /api/v1/plans/{id}/publish`
  - 풀투리프레시 ▶ `ref.invalidate(myCreatedPlansNotifierProvider)` 또는 `myPurchasedPlansNotifierProvider`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError` + onRetry로 invalidate
  - 빈 상태: 만든 플랜 없음 → `AppErrorState(title: '아직 만든 플랜이 없습니다')`, 구매 없음 → `AppErrorState(title: '구매한 플랜이 없습니다')`
- **모달/시트/네비게이션**:
  - 새 플랜 다이얼로그: `AlertDialog` + `TextField`(autofocus) + 취소/만들기
  - 카드 탭 ▶ push (replace 아님)

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시:
   - 만든 플랜 탭: `myCreatedPlansNotifierProvider` ▶ `PlanRepository.getMyCreatedPlans(page:0,size:20)` ▶ `GET /api/v1/plans/my/created`
   - 구매한 플랜 탭: `myPurchasedPlansNotifierProvider` ▶ `PlanRepository.getMyPurchasedPlans(page:0,size:20)` ▶ `GET /api/v1/plans/my/purchased`
2. "+ 새 플랜 만들기": `planCreateNotifierProvider.createPlan(title)` ▶ `PlanRepository.createPlan(PlanAddParam(title:..., price:0))` ▶ `POST /api/v1/plans` ▶ 성공 시 `ref.invalidate(myCreatedPlansNotifierProvider)` + push edit
3. "판매 시작": `planPublishNotifierProvider.publishPlan(planId)` ▶ `POST /api/v1/plans/{id}/publish` ▶ `ref.invalidate(myCreatedPlansNotifierProvider)`
4. 풀투리프레시: 해당 탭 notifier invalidate

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **페이지네이션 정책**: 페이지당 20개, `_currentPage`/`_hasMore` 상태 보유, `loadMore()` 메서드 (현재 화면에 무한 스크롤 트리거 미연결 — 페이지 1만 표시)
- **두 탭 구조**: 서버는 두 별개 API. 프론트는 `TabController(length: 2)`로 단일 화면에 배치
- **탭 라벨**: "내가 만든 플랜" / "구매한 플랜" (한글 고정)
- **새 플랜 다이얼로그 UX**:
  - 제목 입력 (제목만, 다른 필드는 추후 에디터에서 편집)
  - 빈 문자열 trim 후 비어있으면 닫지 않음
  - 생성 후 곧장 블록 에디터로 push (별도 확인 다이얼로그 없음)
- **카드 디자인**:
  - 썸네일: 52×52 둥근 사각형, 카테고리에 따라 색 변경 (`travel`=주황, `date`=파랑, 기본=노란)
  - 카드 그림자 없음, 흰 배경, radius 12
  - "판매 시작" 인라인 버튼: DRAFT/HIDDEN에서만 노출, primary50 배경
- **판매 시작 확인 다이얼로그**: "플랜을 판매 시작하시겠습니까?" / "발행 후에는 마켓에서 다른 사용자가 구매할 수 있습니다."
- **토스트 메시지**:
  - 판매 시작 성공: "플랜이 발행되었습니다"
  - 실패: "플랜 발행에 실패했습니다" (`ToastType.error`)
- **하단 "+" CTA**: `bottomNavigationBar` 슬롯에 SafeArea + Padding, `screenPadding` 적용
- **판매 현황 진입점**: 상단 우측 `Icons.bar_chart` 아이콘 (F08-07로 이동)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 플랜 작성 (Happy Path — 신규 크리에이터) | 로그인됨, 내가 만든 플랜 0건, 일반 사용자(USER 한도 5) | DRAFT 플랜 1건 생성, 사용자는 블록 에디터 화면에서 첫 블록을 추가할 준비 완료 |
| S2 | 두 탭 전환 (만든 / 구매) | 만든 플랜 3개(DRAFT/PUBLISHED 혼재), 구매 플랜 2개 | 컨텍스트 따라 다른 화면으로 이동 (편집 vs 미리보기) |
| S3 | DRAFT 카드 인라인 발행 | 작성 완료한 DRAFT 플랜 1건 (블록/제목/설명 모두 충족) | 플랜이 마켓에 노출 시작 |
| S4 | 한도 초과 (5개 / 10개) | 일반 사용자, DRAFT/PUBLISHED 합쳐 5개 보유 | 새 플랜 생성 실패. HOST 권한 사용자는 한도 10개로 더 여유. |
| S5 | 빈 제목 입력 시도 | 시나리오 본문 참조 | API 호출 자체가 발생하지 않음 |
| S6 | 풀투리프레시 | 만든 플랜 탭에는 `Draft Hiking Plan` / `Hidden Language Exchange Plan` 노출, 구매 이력 0건 | 최신 목록 표시 |

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
| 후보 | scenarios.md:43 | 4. 화면은 push되지 않고 다이얼로그가 닫힘 (현재 코드는 별도 토스트를 표시하지 않음 — 후속 개선 필요) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 플랜 작성 (Happy Path — 신규 크리에이터)**: Given 로그인됨, 내가 만든 플랜 0건, 일반 사용자(USER 한도 5) When 사용자가 해당 흐름을 실행하면 Then DRAFT 플랜 1건 생성, 사용자는 블록 에디터 화면에서 첫 블록을 추가할 준비 완료
- **AC-02. 두 탭 전환 (만든 / 구매)**: Given 만든 플랜 3개(DRAFT/PUBLISHED 혼재), 구매 플랜 2개 When 사용자가 해당 흐름을 실행하면 Then 컨텍스트 따라 다른 화면으로 이동 (편집 vs 미리보기)
- **AC-03. DRAFT 카드 인라인 발행**: Given 작성 완료한 DRAFT 플랜 1건 (블록/제목/설명 모두 충족) When 사용자가 해당 흐름을 실행하면 Then 플랜이 마켓에 노출 시작
- **AC-04. 한도 초과 (5개 / 10개)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 새 플랜 생성 실패. HOST 권한 사용자는 한도 10개로 더 여유.
- **AC-05. 빈 제목 입력 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then API 호출 자체가 발생하지 않음
- **AC-06. 풀투리프레시**: Given 만든 플랜 탭에는 `Draft Hiking Plan` / `Hidden Language Exchange Plan` 노출, 구매 이력 0건 When 사용자가 해당 흐름을 실행하면 Then 최신 목록 표시

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- `PlanAddParam`에 `allowFreePoints`/`freePointPrice`가 있으나 현재 생성 다이얼로그는 제목만 받는다. 생성 시점에 무료 허용/차등가를 입력받게 할지, 발행/수정 단계(F08-05)로 미룰지는 화면 결정 사항이다. 정책 자체는 `03_policy_prds/payment_settlement_policy_prd.md` §2.5를 따른다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
