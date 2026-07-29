# F08-02. 플랜 상세 / 작성자용 미리보기 PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-10; unit: business_logic/units/08_plan_market/F08-02_plan-detail -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-02_plan-detail`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

플랜의 메타데이터(제목/설명/상태/구매수)와 블록 트리, 그리고 현재 사용자의 소유/구매 여부를 반환한다. 작성자는 추가로 수정·삭제·복사·발행·숨김(Hide) 같은 라이프사이클 액션을 호출할 수 있다.

**AUTH-08(2026-06-09 커밋 api `eed2867`)**: 플랜 상세 조회 시 **인증된 비소유자(non-owner)** 조회에 한해 `view_count` 원자 증가를 수행한다. 소유자(크리에이터) 본인과 익명(보안상 도달 불가) 조회는 카운트 대상 제외. 집계 합산은 크리에이터 대시보드(F08-07 `planViewTotal`)로 환류된다.

**AUTH-06 Slice 3(2026-06-09 커밋 api `90de4ed`)**: `getPreview` **서비스 레이어**에 상태별 게이트 적용 — PUBLISHED는 익명 허용(의도), DRAFT/HIDDEN은 로그인 필수(익명 → 401 UNAUTHORIZED), DELETED는 404 PLAN_NOT_FOUND. **단 현재 preview 경로는 전역 보안 permitAll 미선언이라 익명 HTTP 요청 자체가 필터에서 차단됨 → "PUBLISHED 익명 공개"·"익명→401" 분기는 서비스 의도일 뿐 실제로는 미도달(실효 효과 = 로그인 비소유자의 DRAFT/HIDDEN 미리보기 허용). §8 Gap 참조.**

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 플랜 목록(F08-01) ▶ 만든 플랜 카드 탭 ▶ `/plan/:planId`
- 플랜 목록 ▶ 구매 플랜 카드 탭 ▶ `/plan/:planId/preview` (별도 화면)
- 마켓 아이템 상세 ▶ "구매 플랜 보기" ▶ `/plan/:planId/preview`
- 발행 화면(F08-05)에서 발행 성공 후 pop → 상세로 복귀

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-02_plan-detail/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-02_plan-detail/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-02_plan-detail/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-02_plan-detail/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:109` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:54` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:63` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:72` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:81` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:91` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/model/Plan.java:74` (view_count 컬럼) | 확인됨 (AUTH-08) |
| `community_api/src/main/java/com/endside/community/plan/service/PlanService.java:131` (getPlan 2-arg — view count 분기) | 확인됨 (AUTH-08) |
| `community_api/src/main/java/com/endside/community/plan/service/PlanService.java:148` (비소유자 가드 + increment 호출) | 확인됨 (AUTH-08) |
| `community_api/src/main/java/com/endside/community/plan/service/ViewCountIncrementService.java:36` (incrementPlanView, REQUIRES_NEW) | 확인됨 (AUTH-08) |
| `community_api/src/main/java/com/endside/community/plan/repository/query/PlanQueryRepository.java:33` (incrementViewCount — 단일 UPDATE) | 확인됨 (AUTH-08) |
| `community_api/src/main/java/com/endside/community/plan/service/PlanService.java:159` (getPreview — AUTH-06 Slice 3 게이트) | 확인됨 (AUTH-06) |
| `community_api/src/main/java/com/endside/community/plan/service/PlanService.java:172` (DRAFT/HIDDEN + 익명 → UNAUTHORIZED) | 확인됨 (AUTH-06) |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시: `planDetailNotifierProvider(planId)` ▶ `PlanRepository.getPlanDetail(planId)` ▶ `GET /api/v1/plans/{planId}`
2. "편집" 버튼: 단순 `context.push` (편집 화면이 자체 Provider로 블록 트리 로드)
3. "발행": `context.push('/plan/$planId/publish')` — F08-05에서 실제 API 호출
4. "판매 중지": `planPublishNotifierProvider.hidePlan(planId)` ▶ `POST /api/v1/plans/{id}/hide` ▶ `ref.invalidate(myCreatedPlansNotifierProvider)` + 토스트
5. "복제": `planCreateNotifierProvider.copyPlan(planId)` ▶ `POST /api/v1/plans/{id}/copy` ▶ 토스트 + `context.push('/plan/${copied.id}')`
6. "삭제": `planCreateNotifierProvider.deletePlan(planId)` ▶ `DELETE /api/v1/plans/{id}` ▶ invalidate + `context.go('/plan')`
7. "이벤트 만들기": push로 별도 화면 (Unit 03 위임)

## 4. 서버 계약

### 개요

플랜의 메타데이터(제목/설명/상태/구매수)와 블록 트리, 그리고 현재 사용자의 소유/구매 여부를 반환한다. 작성자는 추가로 수정·삭제·복사·발행·숨김(Hide) 같은 라이프사이클 액션을 호출할 수 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/plans/{planId} | `PlanController#getPlan` | `anyRequest().authenticated()` (Spring Security 전역 — `SecurityConfiguration.java`) | 플랜 메타 + 소유/구매 플래그. `blocks`는 null이 정상이며 본문은 별도 `/blocks`. **인증된 비소유자** 조회 시 `view_count` 원자 증가(AUTH-08). |
| GET | /api/v1/plans/{planId}/preview | `PlanController#getPreview` | optional(컨트롤러) — 전역 보안상 **실질 인증 필수**(preview permitAll 미선언) + 서비스 레이어 상태별 게이트(AUTH-06 Slice 3) | 서비스 의도: PUBLISHED 익명 허용·DRAFT/HIDDEN 로그인 필수(익명→401)·DELETED 404. **단 익명은 보안 필터에서 먼저 차단된다.** 작성자 지정 샘플 최대 5 또는 자동 티저(텍스트 3 + 일정표 1 + 로그인 시 이미지 1). |
| PATCH | /api/v1/plans/{planId} | `PlanController#updatePlan` | required | 메타 부분 수정 (작성자만) |
| DELETE | /api/v1/plans/{planId} | `PlanController#deletePlan` | required | DELETED 상태로 soft delete |
| POST | /api/v1/plans/{planId}/copy | `PlanController#copyPlan` | required | 본인 플랜 복사 → DRAFT 신규 생성 |
| POST | /api/v1/plans/{planId}/hide | `PlanController#hidePlan` | required | PUBLISHED → HIDDEN |

### 도메인 모델 / Enum (이 기능 관련)

- **PlanStatus** 전이: `DRAFT → PUBLISHED → HIDDEN → PUBLISHED → ... → DELETED`
- **PlanVo.status** 가능 값: `DRAFT`, `PUBLISHED`, `HIDDEN`, `DELETED`
- **PlanType**: `PERSONAL`, `CREATOR`
- **view_count 컬럼** (`plan/model/Plan.java:74`): `INT NOT NULL DEFAULT 0`. `PlanVo`에는 노출하지 않음(크리에이터 대시보드 집계 전용). 비소유자 상세 조회 때마다 `PlanQueryRepository.incrementViewCount` 단일 UPDATE로 race-safe 원자 증가(`plan/repository/query/PlanQueryRepository.java:33`). 증가는 `ViewCountIncrementService(REQUIRES_NEW, noRollbackFor=Exception.class)`로 격리(`plan/service/ViewCountIncrementService.java:36`) — 실패 시 warn 로그만 남기고 조회 트랜잭션 정상 반환. 집계는 `CreatorStatsQueryRepository.sumPlanViewCountByCreatorId` → `CreatorStatsVo.planViewTotal`(F08-07)로 환류.
- **PlanVo 무료 포인트 관련 필드** (`plan/vo/PlanVo.java`):
  - `price` (BigDecimal): 기본(유료) 구매 금액
  - `allowFreePoints` (boolean): 이 플랜을 무료 포인트로 구매할 수 있는지 여부. 작성자(콘텐츠 생산자) opt-in으로 결정
  - `freePointPrice` (BigDecimal, nullable): 무료 포인트 결제 시 적용할 차등 금액. 미설정(null)이면서 `fundingMode=FREE`면 기본 `price`로 폴백해 `FREE_ONLY`; 일반 구매는 `price`와 `PAID_ONLY`
  - 유료/무료 분리정산(Point Split Flow-Through) 정책에 따라, 무료 포인트로 결제하면 수취자에게 무료로 전파되어 현금화되지 않는다. 상세 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.
- **에러 코드**:
  - 1500001 PLAN_NOT_FOUND (404) — 존재하지 않는 planId, 또는 DELETED 플랜 미리보기 접근
  - 1500002 PLAN_NOT_CREATOR (403)
  - 1500003 PLAN_INVALID_STATUS_TRANSITION (400)
  - 1500015 PLAN_LIMIT_EXCEEDED (400)
  - UNAUTHORIZED (401) — DRAFT/HIDDEN 미리보기에 익명 접근 시 (`PlanService.java:173`, AUTH-06 Slice 3)

### 의존 단위 / 외부 시스템

- **Account (Unit 01)**: `UserRepository#findById`로 creatorNickname 조회
- **F08-03 블록 에디터**: 화면에서 블록 트리는 `/blocks` 별도 호출. 본 API의 `blocks` 필드는 트리를 직접 채우지 않음
- 외부 시스템 의존 없음

## 5. 프론트 계약

### 진입 경로

- 플랜 목록(F08-01) ▶ 만든 플랜 카드 탭 ▶ `/plan/:planId`
- 플랜 목록 ▶ 구매 플랜 카드 탭 ▶ `/plan/:planId/preview` (별도 화면)
- 마켓 아이템 상세 ▶ "구매 플랜 보기" ▶ `/plan/:planId/preview`
- 발행 화면(F08-05)에서 발행 성공 후 pop → 상세로 복귀

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/plan/:planId` | `plan/screens/plan_detail_screen.dart` | 작성자 시점 + 비공개 블러 처리 |
| `/plan/:planId/preview` | `plan/screens/plan_preview_screen.dart` | 구매자 미리보기 (블록 읽기 전용) |
| `/plan/:planId/edit` | `plan/screens/block_editor_screen.dart` | "편집" 버튼 진입 (F08-03) |
| `/plan/:planId/publish` | `plan/screens/plan_publish_screen.dart` | "발행하기" (F08-05) |
| `/plan/:planId/create-event` | `plan/screens/plan_event_create_screen.dart` | 구매자 "이 플랜으로 이벤트 만들기" |

### 화면별 구성 요소 & 액션

### 플랜 상세 (`plan_detail_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar(title: '플랜 상세')` — 작성자 + DRAFT/HIDDEN인 경우만 우측에 휴지통 액션 (`TestIds.screenPlanDetailDeleteAction`)
  - 상단 `PlanStatusBadge(status)` + `_formatUpdatedAt(plan.updatedAt)` (예: "수정 5분 전")
  - 큰 제목 (Pretendard 22, w700)
  - **PUBLISHED + 작성자 본인** 한정: primary50 배경 통계 카드 (구매 횟수, 상태)
  - description 텍스트
  - Divider 후 `BlockRenderer(blocks: plan.blocks!)` (블록이 있을 때)
  - **HIDDEN + 비작성자·비구매자**: `BackdropFilter(blur:8)` 오버레이 + "비공개 플랜" 안내. 기존 구매자는 숨김 뒤에도 전체 읽기 유지
- **사용자가 할 수 있는 액션 (작성자, isCreatorOwned)**:
  - "편집" ▶ `context.push('/plan/$planId/edit')`
  - DRAFT/HIDDEN: "발행하기" ▶ `context.push('/plan/$planId/publish')`
  - PUBLISHED: "판매 중지" ▶ confirm ▶ `planPublishNotifierProvider.hidePlan(planId)` ▶ `POST /api/v1/plans/{id}/hide`
  - PUBLISHED: "복제" ▶ `planCreateNotifierProvider.copyPlan(planId)` ▶ `POST /api/v1/plans/{id}/copy` ▶ 토스트 + push 신규 ID 상세
  - DRAFT: 하단에 "초안 저장됨 · 수정 N분 전" 표시
  - 휴지통 ▶ confirm ▶ `planCreateNotifierProvider.deletePlan(planId)` ▶ `DELETE /api/v1/plans/{id}` ▶ `context.go('/plan')`
- **사용자가 할 수 있는 액션 (구매자, isPurchased && !isCreatorOwned)**:
  - "이 플랜으로 이벤트 만들기" ▶ `context.push('/plan/$planId/create-event')`
- **상태 분기**: 로딩 / 에러 (`AppErrorState.fromError(onRetry: invalidate)`) / HIDDEN 비작성자·비구매자 → 블러
- **모달/시트/네비게이션**:
  - 삭제 확인: `AppDialog.confirm(isDangerous: true)`
  - 판매 중지 확인: `AppDialog.confirm(isDangerous: true)`
  - 모든 액션 `pop` 또는 `push` (replace 미사용)

### 구매자용 미리보기 (`plan_preview_screen.dart`)
- 구매한 플랜의 블록을 읽기 전용으로 렌더링
- 진입 시 `GET /api/v1/plans/{planId}/preview` 호출하여 `PlanPreviewVo` 받음
- 작성자 정보 (`creator.nickname`, `planCount`, `totalSales`) 카드
- 비구매자에게는 `sampleBlocks`만 표시되고 본문은 잠금 처리됨
- **AUTH-06 Slice 3 게이트** (`PlanService.java:159`): DRAFT/HIDDEN 상태 플랜 미리보기는 로그인 사용자만 접근 가능. 익명 사용자가 요청하면 서버에서 401 UNAUTHORIZED 반환 — 앱은 로그인 유도 처리 필요. DELETED 플랜은 404 PLAN_NOT_FOUND로 처리하여 마치 존재하지 않는 플랜처럼 취급.

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시: `planDetailNotifierProvider(planId)` ▶ `PlanRepository.getPlanDetail(planId)` ▶ `GET /api/v1/plans/{planId}`
2. "편집" 버튼: 단순 `context.push` (편집 화면이 자체 Provider로 블록 트리 로드)
3. "발행": `context.push('/plan/$planId/publish')` — F08-05에서 실제 API 호출
4. "판매 중지": `planPublishNotifierProvider.hidePlan(planId)` ▶ `POST /api/v1/plans/{id}/hide` ▶ `ref.invalidate(myCreatedPlansNotifierProvider)` + 토스트
5. "복제": `planCreateNotifierProvider.copyPlan(planId)` ▶ `POST /api/v1/plans/{id}/copy` ▶ 토스트 + `context.push('/plan/${copied.id}')`
6. "삭제": `planCreateNotifierProvider.deletePlan(planId)` ▶ `DELETE /api/v1/plans/{id}` ▶ invalidate + `context.go('/plan')`
7. "이벤트 만들기": push로 별도 화면 (Unit 03 위임)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **삭제 노출 정책**: 작성자 본인 + (DRAFT 또는 HIDDEN)일 때만 휴지통 노출. PUBLISHED 상태는 휴지통 숨김 (`_canDeletePlan` 메서드)
- **`_formatUpdatedAt` 포맷**: "수정 N분 전" / "수정 N시간 전" / "수정 N일 전" — 60분 미만 / 24시간 미만 / 그 이상으로 분기
- **HIDDEN 블러 오버레이**: `!isCreatorOwned && !isPurchased`일 때만 sigmaX/Y=8, 흰색 60% 투명 배경 위에 자물쇠 아이콘 + "비공개 플랜" 안내. 기존 구매자는 블러하지 않는다.
- **PUBLISHED 통계 카드**: 작성자만 노출. "구매 N회" + "상태: 판매중" 두 칸. primary50 배경, primary200 divider
- **하단 액션 레이아웃**:
  - 작성자: "편집" + (DRAFT/HIDDEN ? "발행하기" : "판매 중지" + "복제")
  - 구매자: "이 플랜으로 이벤트 만들기" 단독 버튼
  - 둘 다 아니면 하단 영역 미표시 (null 반환)
- **AppButton 크기**: 모두 `ButtonSize.lg`, `fullWidth: true`, `Row` 안에서 `Expanded`로 등분
- **삭제 확인 다이얼로그**: "삭제된 플랜은 복구할 수 없습니다." (실제로는 soft delete지만 UX는 hard delete처럼)
- **판매 중지 다이얼로그**: "판매 중지 후 마켓에서 노출되지 않습니다. 언제든 다시 판매를 시작할 수 있습니다."
- **복제 후 흐름**: 토스트 "플랜이 복제되었습니다" + 새 플랜 상세 화면으로 push
- **블록 트리**: 본 API의 `blocks` 필드는 null이 정상. `BlockRenderer`는 별도 provider/state에서 채워질 때만 렌더링

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 작성자가 DRAFT 플랜을 검토하고 발행 진입 (Happy Path) | 자기 소유 플랜, status=DRAFT, 블록 5개 | F08-05 발행 화면 진입 |
| S2 | PUBLISHED 작성자 본인 — 통계 + 판매 중지 / 복제 | status=PUBLISHED, purchaseCount=12 | 새 DRAFT 플랜 124가 새 화면에 표시됨 |
| S3 | PUBLISHED 작성자 — 판매 중지 → HIDDEN | 시나리오 본문 참조 | 마켓에 노출되지 않음. 다시 발행할 수 있음 |
| S4 | 비구매 비작성자가 HIDDEN 플랜 진입 | 작성자가 발행 후 HIDDEN으로 전환한 플랜 | 서버 상세/블록이 FORBIDDEN이며 앱은 접근 불가/블러 폴백 |
| S4-A | 기존 구매자가 HIDDEN 플랜 재진입 | 구매 뒤 작성자가 HIDDEN으로 전환 | 전체 본문과 이벤트 생성 권한 유지, 블러 없음 |
| S5 | 작성자가 DRAFT 플랜 삭제 | 시나리오 본문 참조 | 목록에서 사라짐 (count는 status=DELETED 제외 카운트라 한도 회복) |
| S6 | 잘못된 상태 전이 시도 — DRAFT에서 hide 호출 | 시나리오 본문 참조 | 상태 변경 없음 |
| S7 | 구매자가 미리보기 진입 | planId=123 구매 완료 | 본문 열람 가능. 하단 "이 플랜으로 이벤트 만들기" 버튼 |
| S8 | 비구매자가 미리보기 진입 | `/plan/1002` 상세, status=DRAFT, isCreatorOwned=true | 구매 유도 |
| S9 (AUTH-08) | 인증된 비소유자 상세 조회 → view_count 증가 | 타 사용자가 GET /api/v1/plans/{planId} 호출 | view_count +1 원자 증가. 조회 응답 정상 반환(증가 실패 시에도 warn 로그만, 응답 무중단) |
| S10 (AUTH-08) | 크리에이터 본인 상세 조회 → view_count 불변 | 작성자가 자기 PUBLISHED 플랜 조회 | view_count 변화 없음. 통계 부풀리기 방지 |
| S11 (AUTH-06) | 익명 사용자가 DRAFT 플랜 미리보기 진입 | GET /api/v1/plans/{planId}/preview, 비로그인, status=DRAFT | 401 UNAUTHORIZED 반환. 앱 로그인 유도 |
| S12 (AUTH-06) | 로그인 사용자가 HIDDEN 플랜 미리보기 진입 | GET /api/v1/plans/{planId}/preview, 로그인, status=HIDDEN | 미리보기 허용(sampleBlocks). 본문은 비구매자 차단 |

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
| 구현됨 (AUTH-08) | `PlanService.java:148`, `ViewCountIncrementService.java:36` | view_count 비소유자 조회 시 원자 증가. REQUIRES_NEW 격리. 실패 무중단. | QA: 소유자/비소유자/증가실패 시나리오 E2E 확인 |
| 구현됨 (AUTH-06) | `PlanService.java:159-173` | getPreview 서비스 게이트(DELETED→404, DRAFT/HIDDEN+익명→401, PUBLISHED→익명 포함 공개, DRAFT/HIDDEN+로그인→허용·person-specific 보류). | QA: 로그인 비소유자의 DRAFT 미리보기 → 허용, DELETED 미리보기 → 404 E2E 확인 |
| 의도 vs 배선 주의 (AUTH-06) | `SecurityConfiguration.java:77~88`(permitAll 목록), `PlanController.java:64` | `/api/v1/plans/*/preview`는 permitAll 목록에 없어 `anyRequest().authenticated()` 적용 → **익명 요청은 보안 레이어에서 먼저 차단**. 따라서 서비스의 "PUBLISHED 익명 공개" 의도와 "익명→401(UNAUTHORIZED)" 분기는 현재 HTTP로 도달 불가(방어적 게이트로만 작동). 실효 효과는 "로그인 비소유자의 DRAFT/HIDDEN 미리보기 허용". | 비로그인 미리보기 공유가 의도라면 preview 경로를 permitAll에 추가 필요. AUTH-08 상세 조회수의 익명 미도달과 동일 패턴. |
| 주의 | `PlanVo.java` | view_count는 PlanVo 응답 필드에 노출되지 않음 — 크리에이터 대시보드(F08-07 planViewTotal)에서만 집계 확인 가능. 앱 상세 화면에서 직접 조회수를 표시하려면 별도 필드 추가 필요(현재 미노출). | 현재 정책 유지: 상세 화면에 조회수 미표시, 대시보드 집계만 제공. |

## 9. 수용 기준

- **AC-01. 작성자가 DRAFT 플랜을 검토하고 발행 진입 (Happy Path)**: Given 자기 소유 플랜, status=DRAFT, 블록 5개 When 사용자가 해당 흐름을 실행하면 Then F08-05 발행 화면 진입
- **AC-02. PUBLISHED 작성자 본인 — 통계 + 판매 중지 / 복제**: Given status=PUBLISHED, purchaseCount=12 When 사용자가 해당 흐름을 실행하면 Then 새 DRAFT 플랜 124가 새 화면에 표시됨
- **AC-03. PUBLISHED 작성자 — 판매 중지 → HIDDEN**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 마켓에 노출되지 않음. 다시 발행할 수 있음
- **AC-04. 비구매 비작성자가 HIDDEN 플랜 진입**: Given 작성자가 발행 후 HIDDEN으로 전환한 플랜 When 비구매자가 상세/블록을 요청하면 Then FORBIDDEN이며 전체 본문은 노출되지 않음
- **AC-04-A. 기존 구매자의 HIDDEN 접근 유지**: Given 구매 완료 뒤 플랜이 HIDDEN When 구매자가 상세/블록/이벤트 생성을 요청하면 Then 기존 소유 권한이 유지되고 앱 블러가 없음
- **AC-05. 작성자가 DRAFT 플랜 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 목록에서 사라짐 (count는 status=DELETED 제외 카운트라 한도 회복)
- **AC-06. 잘못된 상태 전이 시도 — DRAFT에서 hide 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 상태 변경 없음
- **AC-07. 구매자가 미리보기 진입**: Given planId=123 구매 완료 When 사용자가 해당 흐름을 실행하면 Then 본문 열람 가능. 하단 "이 플랜으로 이벤트 만들기" 버튼
- **AC-08. 비구매자가 미리보기 진입**: Given `/plan/1002` 상세, status=DRAFT, isCreatorOwned=true When 사용자가 해당 흐름을 실행하면 Then 구매 유도
- **AC-09 (AUTH-08). 인증된 비소유자 상세 조회 → view_count 증가**: Given 타 사용자가 GET /api/v1/plans/{planId} 호출 When 조회 완료 Then view_count +1 원자 증가. 조회 응답 정상 반환. 증가 실패 시에도 응답 무중단.
- **AC-10 (AUTH-08). 크리에이터 본인 조회 → view_count 불변**: Given 작성자가 자기 PUBLISHED 플랜 조회 When 조회 완료 Then view_count 변화 없음.
- **AC-11 (AUTH-06). 익명 사용자가 DRAFT/HIDDEN 미리보기 진입 → 401**: Given GET /api/v1/plans/{planId}/preview, 비로그인, status=DRAFT When 요청 Then 서버 401 UNAUTHORIZED 반환.
- **AC-12 (AUTH-06). DELETED 플랜 미리보기 → 404**: Given GET /api/v1/plans/{planId}/preview, status=DELETED When 요청 Then 서버 404 PLAN_NOT_FOUND 반환.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- `PlanPreviewVo`도 `allowFreePoints`/`freePointPrice`를 직접 포함하고, 앱 preview/마켓 플랜 상세는 유료 플랜에서 무료 구매가 허용되면 PAID/FREE 선택 시트를 실제로 연다. `freePointPrice`가 null이면 기본가로 무료 결제하며, 무료 잔액 최종 판정은 서버가 담당한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.

## 11. 2026-07-29 소스 실측 보강

### 11.1 상세·preview·전체 본문은 서로 다른 계약

- `GET /plans/{id}`: DRAFT 작성자만, HIDDEN 작성자 또는 기존 구매자, DELETED 없음.
- `GET /plans/{id}/blocks`: 위 상태 게이트에 더해 PUBLISHED 유료 플랜은 작성자/구매자만. 무료 플랜은 인증 사용자 전체 읽기.
- `GET /plans/{id}/preview`: PUBLISHED 공개 의도, DRAFT/HIDDEN 로그인 사용자 preview 허용(person-specific 보류), DELETED 없음.
- `POST /plans/{id}/create-event`: 작성자 또는 구매자. HIDDEN 기존 구매자도 계속 가능하고 신규 구매만 막힌다.

### 11.2 티저 선택

- `properties.previewSample=true`인 known/non-envelope 블록이 있으면 문서 순서 최대 5.
- 없으면 텍스트 3 + 일정표 1 + 로그인 시 이미지 1 자동 폴백.
- 구매한 비작성자는 전체 본문을 쓰므로 `sampleBlocks=[]`; 작성자는 실제 판매 preview 검수용으로 티저를 받는다.
- 이미지 projection은 접근 게이트 통과 뒤 붙인다.

### 11.3 committed 읽기 UX와 미커밋 작업본 구분

committed HEAD `cb21bce8ef08`에서 상세는 별도 block provider로 전체 트리를 읽고, preview는 서버 `sampleBlocks`를 렌더링하며, 구매자는 이벤트 생성 CTA를 본다. committed 본문 기본 스타일은 14px이고 기존 제목 여백을 사용한다.

현재 Flutter worktree에는 별도 미커밋 변경이 있다.

- 읽기 모드에 커버·제목·작성자 header와 최대 폭 680 추가
- 본문 16px/line-height 1.65, 제목 위 여백 확대
- `BlockRenderer(reading:true)`와 읽기/편집 여백 소유권 분리
- TABLE canonical rows와 제한적 legacy `columns + content JSON` dual-read. 깨진 표는 raw JSON 대신 안전 안내 카드로 표시
- 2열 같은 작은 표는 가용 폭을 채우고 열당 96px를 넘으면 표 내부 가로 스크롤
- 콘텐츠 역할별 tone과 링크/장소/파일/코드/영상 카드 표현 보강
- tests/goldens 갱신

이 미커밋 렌더링·TABLE 호환 작업은 진행 중 제안이며 출시 계약이나 수용 기준으로 간주하지 않는다.
