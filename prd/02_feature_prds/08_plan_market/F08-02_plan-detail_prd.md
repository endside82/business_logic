# F08-02. 플랜 상세 / 작성자용 미리보기 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-02_plan-detail -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-02_plan-detail`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

플랜의 메타데이터(제목/설명/상태/구매수)와 블록 트리, 그리고 현재 사용자의 소유/구매 여부를 반환한다. 작성자는 추가로 수정·삭제·복사·발행·숨김(Hide) 같은 라이프사이클 액션을 호출할 수 있다.

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
| GET | /api/v1/plans/{planId} | `PlanController#getPlan` | optional | 플랜 풀 정보 (블록 포함) + 소유/구매 플래그 |
| GET | /api/v1/plans/{planId}/preview | `PlanController#getPreview` | optional | 마켓용 미리보기 (샘플 블록 최대 3개, 비구매자는 본문 차단) |
| PATCH | /api/v1/plans/{planId} | `PlanController#updatePlan` | required | 메타 부분 수정 (작성자만) |
| DELETE | /api/v1/plans/{planId} | `PlanController#deletePlan` | required | DELETED 상태로 soft delete |
| POST | /api/v1/plans/{planId}/copy | `PlanController#copyPlan` | required | 본인 플랜 복사 → DRAFT 신규 생성 |
| POST | /api/v1/plans/{planId}/hide | `PlanController#hidePlan` | required | PUBLISHED → HIDDEN |

### 도메인 모델 / Enum (이 기능 관련)

- **PlanStatus** 전이: `DRAFT → PUBLISHED → HIDDEN → PUBLISHED → ... → DELETED`
- **PlanVo.status** 가능 값: `DRAFT`, `PUBLISHED`, `HIDDEN`, `DELETED`
- **PlanType**: `PERSONAL`, `CREATOR`
- **에러 코드**:
  - 1500001 PLAN_NOT_FOUND (404)
  - 1500002 PLAN_NOT_CREATOR (403)
  - 1500003 PLAN_INVALID_STATUS_TRANSITION (400)
  - 1500015 PLAN_LIMIT_EXCEEDED (400)

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
  - **HIDDEN + 비작성자**: `BackdropFilter(blur:8)` 오버레이 + "비공개 플랜" 안내
- **사용자가 할 수 있는 액션 (작성자, isCreatorOwned)**:
  - "편집" ▶ `context.push('/plan/$planId/edit')`
  - DRAFT/HIDDEN: "발행하기" ▶ `context.push('/plan/$planId/publish')`
  - PUBLISHED: "판매 중지" ▶ confirm ▶ `planPublishNotifierProvider.hidePlan(planId)` ▶ `POST /api/v1/plans/{id}/hide`
  - PUBLISHED: "복제" ▶ `planCreateNotifierProvider.copyPlan(planId)` ▶ `POST /api/v1/plans/{id}/copy` ▶ 토스트 + push 신규 ID 상세
  - DRAFT: 하단에 "초안 저장됨 · 수정 N분 전" 표시
  - 휴지통 ▶ confirm ▶ `planCreateNotifierProvider.deletePlan(planId)` ▶ `DELETE /api/v1/plans/{id}` ▶ `context.go('/plan')`
- **사용자가 할 수 있는 액션 (구매자, isPurchased && !isCreatorOwned)**:
  - "이 플랜으로 이벤트 만들기" ▶ `context.push('/plan/$planId/create-event')`
- **상태 분기**: 로딩 / 에러 (`AppErrorState.fromError(onRetry: invalidate)`) / HIDDEN 비작성자 → 블러
- **모달/시트/네비게이션**:
  - 삭제 확인: `AppDialog.confirm(isDangerous: true)`
  - 판매 중지 확인: `AppDialog.confirm(isDangerous: true)`
  - 모든 액션 `pop` 또는 `push` (replace 미사용)

### 구매자용 미리보기 (`plan_preview_screen.dart`)
- 구매한 플랜의 블록을 읽기 전용으로 렌더링
- 진입 시 `GET /api/v1/plans/{planId}/preview` 호출하여 `PlanPreviewVo` 받음
- 작성자 정보 (`creator.nickname`, `planCount`, `totalSales`) 카드
- 비구매자에게는 `sampleBlocks`만 표시되고 본문은 잠금 처리됨

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
- **HIDDEN 블러 오버레이**: sigmaX/Y=8, 흰색 60% 투명 배경 위에 자물쇠 아이콘 + "비공개 플랜" + "이 플랜은 현재 공개되지 않았습니다."
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
| S4 | 비작성자가 HIDDEN 플랜 진입 (블러) | 작성자가 발행 후 HIDDEN으로 전환한 플랜 | 사용자는 본문을 볼 수 없고 뒤로 이동만 가능 |
| S5 | 작성자가 DRAFT 플랜 삭제 | 시나리오 본문 참조 | 목록에서 사라짐 (count는 status=DELETED 제외 카운트라 한도 회복) |
| S6 | 잘못된 상태 전이 시도 — DRAFT에서 hide 호출 | 시나리오 본문 참조 | 상태 변경 없음 |
| S7 | 구매자가 미리보기 진입 | planId=123 구매 완료 | 본문 열람 가능. 하단 "이 플랜으로 이벤트 만들기" 버튼 |
| S8 | 비구매자가 미리보기 진입 | `/plan/1002` 상세, status=DRAFT, isCreatorOwned=true | 구매 유도 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. 작성자가 DRAFT 플랜을 검토하고 발행 진입 (Happy Path)**: Given 자기 소유 플랜, status=DRAFT, 블록 5개 When 사용자가 해당 흐름을 실행하면 Then F08-05 발행 화면 진입
- **AC-02. PUBLISHED 작성자 본인 — 통계 + 판매 중지 / 복제**: Given status=PUBLISHED, purchaseCount=12 When 사용자가 해당 흐름을 실행하면 Then 새 DRAFT 플랜 124가 새 화면에 표시됨
- **AC-03. PUBLISHED 작성자 — 판매 중지 → HIDDEN**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 마켓에 노출되지 않음. 다시 발행할 수 있음
- **AC-04. 비작성자가 HIDDEN 플랜 진입 (블러)**: Given 작성자가 발행 후 HIDDEN으로 전환한 플랜 When 사용자가 해당 흐름을 실행하면 Then 사용자는 본문을 볼 수 없고 뒤로 이동만 가능
- **AC-05. 작성자가 DRAFT 플랜 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 목록에서 사라짐 (count는 status=DELETED 제외 카운트라 한도 회복)
- **AC-06. 잘못된 상태 전이 시도 — DRAFT에서 hide 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 상태 변경 없음
- **AC-07. 구매자가 미리보기 진입**: Given planId=123 구매 완료 When 사용자가 해당 흐름을 실행하면 Then 본문 열람 가능. 하단 "이 플랜으로 이벤트 만들기" 버튼
- **AC-08. 비구매자가 미리보기 진입**: Given `/plan/1002` 상세, status=DRAFT, isCreatorOwned=true When 사용자가 해당 흐름을 실행하면 Then 구매 유도

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
