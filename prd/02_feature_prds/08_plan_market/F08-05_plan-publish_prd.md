# F08-05. 플랜 발행 PRD

<!-- generated: source-first-unit-sync; source-measured: 2026-07-29; api HEAD be38d128; app HEAD cb21bce; unit: business_logic/units/08_plan_market/F08-05_plan-publish -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-05_plan-publish`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

DRAFT/HIDDEN 상태의 플랜을 PUBLISHED로 전환하여 마켓에 노출 가능하게 만든다. AUTH-01(게시 준비도 서버 검증)·AUTH-06(예약 발행)이 추가되어 발행 경로가 세 가지로 확장되었다.

**현재 발행 진입 경로:**
1. 플랜 상세(F08-02) ▶ DRAFT/HIDDEN 상태에서 "발행하기" 버튼 ▶ `/plan/:planId/publish`
2. `/plan/:planId/publish` 화면 내 "예약 발행" ▶ `SchedulePublishSheet` ▶ `POST /api/v1/authoring/schedules` (AUTH-06)
3. ~~플랜 목록(F08-01) ▶ 카드 인라인 "판매 시작" 버튼 직접 publish 호출~~ (AUTH-01 이후 제거됨 — 발행 준비 화면 우회 경로 폐쇄)

**AUTH-01 핵심 변경점:**
- `publishPlan`이 내부적으로 `PlanPublishReadinessService.evaluate(planId).isPublishable()`를 재검사하여 BLOCKER 있으면 `PLAN_NOT_READY_TO_PUBLISH(400/1500020)` 반환 — 체크리스트 우회 불가 (`PlanService.java:313`).
- 신규 엔드포인트 `GET /api/v1/plans/{planId}/publish-readiness`로 사전 readiness 조회 가능 (`PlanController.java:102`).
- 앱 발행 화면 체크리스트는 서버 readiness 결과를 렌더링하는 presentation layer로 재구성됨 (`plan_publish_screen.dart:374`). ~~클라이언트 전용 검증~~ 은 더 이상 최종 게이트가 아님.

**AUTH-06 핵심 변경점:**
- 미래 KST 시각을 지정해 플랜을 예약 발행. 폴러가 readiness를 재검사 후 `publishPlan` 실행. 실패 시 `NotificationType.SCHEDULED_PUBLISH_FAILED`(코드 97) 알림 발송.
- 상태 기계: `SCHEDULED → EXECUTING → EXECUTED / FAILED / CANCELLED`. stuck EXECUTING 복구 스캔(`recoverStuck`) 존재.

**AUTH-06 Slice 3 (초안 미리보기 로그인 게이트):**
- `GET /api/v1/plans/{planId}/preview` **서비스 레이어** 게이트: DRAFT/HIDDEN 익명 요청은 UNAUTHORIZED, PUBLISHED는 익명 허용(의도), DELETED는 PLAN_NOT_FOUND (`PlanService.java:169`). **단 preview 경로가 전역 보안 permitAll 미선언이라 익명 HTTP 요청은 보안 필터에서 먼저 차단됨 — 익명 분기는 실제 미도달(상세 caveat: F08-02 §8).** (cross-ref: F08-02)

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
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:102` | 확인됨 (`GET /{planId}/publish-readiness` — AUTH-01) |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:110` | 확인됨 (`POST /{planId}/publish`) |
| `community_api/src/main/java/com/endside/community/plan/service/PlanPublishReadinessService.java:50` | 확인됨 (readiness evaluate, 8개 rule) |
| `community_api/src/main/java/com/endside/community/plan/service/PlanService.java:313` | 확인됨 (publishPlan 내부 readiness 재검사) |
| `community_api/src/main/java/com/endside/community/authoring/controller/ScheduledPublishController.java:28` | 확인됨 (`POST/GET/DELETE /api/v1/authoring/schedules` — AUTH-06) |
| `community_api/src/main/java/com/endside/community/authoring/constants/ScheduledPublishStatus.java:13` | 확인됨 (상태 enum: SCHEDULED/EXECUTING/EXECUTED/CANCELLED/FAILED) |
| `community_api/src/main/java/com/endside/community/authoring/constants/ScheduledPublishTargetType.java:9` | 확인됨 (PLAN/MARKET_ITEM/CLUB_POST/CLUB_ANNOUNCEMENT) |
| `community_api/src/main/java/com/endside/community/authoring/constants/ScheduledPublishActionType.java:8` | 확인됨 (PUBLISH만 지원) |
| `community_api/src/main/java/com/endside/community/plan/service/PlanService.java:159` | 확인됨 (getPreview — AUTH-06 Slice 3 미리보기 로그인 게이트) |
| `community_app/lib/presentation/plan/screens/plan_publish_screen.dart:374` | 확인됨 (서버 readiness 렌더링) |
| `community_app/lib/presentation/plan/widgets/schedule_publish_sheet.dart:21` | 확인됨 (예약 발행 바텀시트 — AUTH-06) |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 진입 시:
   - `planDetailNotifierProvider(planId)` ▶ `GET /api/v1/plans/{planId}` (플랜 메타)
   - `planPublishReadinessNotifierProvider(planId)` ▶ `GET /api/v1/plans/{planId}/publish-readiness` (AUTH-01) ▶ `PlanPublishReadinessVo` → 체크리스트 렌더링 (`plan_publish_screen.dart:78`)
2. 커버 업로드 시: 파일 업로드 (`uploadImageFile`) → `planCreateNotifier.updatePlan(planId, PlanModParam(thumbnailUrl:fileKey))` → `PATCH /api/v1/plans/{id}` → `ref.invalidate(planPublishReadinessNotifierProvider(planId))`
3. 발행 시 (즉시 발행):
   - 가격/설명/무료 포인트 설정 변경이 있으면 `planCreateNotifier.updatePlan(planId, PlanModParam(price, description, allowFreePoints, freePointPrice))` → `PATCH`
   - `planRepository.publishPlan(planId)` → `POST /api/v1/plans/{planId}/publish` → 서버가 readiness 재검사 후 발행 또는 `PLAN_NOT_READY_TO_PUBLISH(400)` 반환
   - 실패 시: `ref.invalidate(planPublishReadinessNotifierProvider(planId))`; `PLAN_NOT_READY_TO_PUBLISH`이면 체크리스트 확인 안내, 그 밖의 오류면 일반 실패 안내
   - 성공 시: `ref.invalidate(planDetailNotifierProvider)` + `ref.invalidate(myCreatedPlansNotifierProvider)` → `Navigator.pop`
4. 예약 발행 시 (AUTH-06):
   - 가격/설명/무료 포인트 설정 변경이 있으면 먼저 PATCH 저장 (위와 동일). `updatePlan`은 실패 시 예외를 던지므로 시트를 열지 않고 저장 실패 토스트를 표시한다.
   - `SchedulePublishSheet.show(context, targetType:'PLAN', targetId: planId)` 표시 → 날짜/시간 선택
   - `POST /api/v1/authoring/schedules` (`ScheduledPublishCreateParam(targetType:PLAN, targetId, actionType:PUBLISH, scheduledAt)`) → `ScheduledPublishActionVo` 반환
   - 성공 시 `ref.invalidate(planDetailNotifierProvider(planId))`

## 4. 서버 계약

### 개요

DRAFT/HIDDEN 상태의 플랜을 PUBLISHED로 전환한다. AUTH-01로 발행 전 준비도 서버 검증이 추가되었고, AUTH-06으로 예약 발행 경로가 신설되었다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/plans/{planId}/publish-readiness | `PlanController#getPublishReadiness` | required | 발행 준비도 평가. `PlanPublishReadinessVo` 반환 (AUTH-01) |
| POST | /api/v1/plans/{planId}/publish | `PlanController#publishPlan` | required | 작성자 검증 + readiness 재검사 + DRAFT/HIDDEN → PUBLISHED |
| POST | /api/v1/authoring/schedules | `ScheduledPublishController#schedule` | required | 예약 발행 생성 (AUTH-06). targetType=PLAN, actionType=PUBLISH |
| GET | /api/v1/authoring/schedules | `ScheduledPublishController#list` | required | 내 예약 목록 조회. targetType/targetId 필터 가능 |
| DELETE | /api/v1/authoring/schedules/{scheduleId} | `ScheduledPublishController#cancel` | required | 예약 취소. SCHEDULED 상태에서만 가능 |
| GET | /api/v1/plans/{planId}/preview | `PlanController#getPreview` | HTTP 인증 필요(현재 Security 설정) | Controller/서비스는 nullable principal을 받지만, DRAFT/HIDDEN은 로그인 필수이고 PUBLISHED 익명 허용 분기는 현재 보안 필터 때문에 HTTP에서 도달하지 못한다. DELETED=PLAN_NOT_FOUND (AUTH-06 Slice 3) |

### 도메인 모델 / Enum (이 기능 관련)

- **PlanStatus** 전이:
  - DRAFT → PUBLISHED (publishPlan — readiness 통과 시)
  - HIDDEN → PUBLISHED (publishPlan — readiness 통과 시)
  - PUBLISHED → PUBLISHED 시도 시 `PLAN_INVALID_STATUS_TRANSITION` 400
  - DELETED → PUBLISHED 시도 시 `PLAN_INVALID_STATUS_TRANSITION` 400
- **PlanPublishReadinessVo** (`plan/vo/PlanPublishReadinessVo.java`): readiness endpoint 응답
  - `targetType`: "PLAN"
  - `targetId`: planId
  - `publishable`: BLOCKER 항목이 없으면 true
  - `checkedAt`: 평가 시각
  - `items`: `List<PlanPublishReadinessItemVo>` (ruleId/severity/label/message/target/currentValue/requiredValue)
- **readiness 룰 목록** (`PlanPublishReadinessService.java:57`): 8개
  - `PLAN_TITLE_LENGTH` — 제목 2~50자 (BLOCKER)
  - `PLAN_DESCRIPTION_LENGTH` — 설명 10~500자 (BLOCKER)
  - `PLAN_HAS_BLOCK` — 블록 ≥ 1 (BLOCKER)
  - `PLAN_HAS_COVER` — 커버 이미지 (`thumbnailUrl`) 존재 여부 (**WARNING** — 발행 차단 안 함)
  - `PLAN_PRICE_VALID` — 가격 ≥ 0 (BLOCKER)
  - `PLAN_REQUIRED_DB_FIELDS` — 카테고리 비어있지 않을 것 (BLOCKER)
  - `PLAN_BLOCK_DEPTH_VALID` — 최대 depth ≤ 3 (BLOCKER)
  - `PLAN_BLOCK_COUNT_VALID` — 블록 수 ≤ 200 (BLOCKER)
- **ScheduledPublishStatus** (`authoring/constants/ScheduledPublishStatus.java`):
  - `SCHEDULED` → `EXECUTING` → `EXECUTED` (성공)
  - `SCHEDULED` → `CANCELLED` (작성자 취소, SCHEDULED일 때만)
  - `EXECUTING` → `FAILED` (readiness 실패 또는 예외)
  - stuck `EXECUTING`은 `recoverStuck` 스캔으로 실제 플랜 상태 기반 수렴
- **ScheduledPublishTargetType** (`authoring/constants/ScheduledPublishTargetType.java`): `PLAN`, `MARKET_ITEM`, `CLUB_POST`, `CLUB_ANNOUNCEMENT` — **폴러 대상집합 4종 전부 실행됨** (PLAN 발행·MARKET_ITEM 판매시작·CLUB_POST 공개 전환·CLUB_ANNOUNCEMENT 공개 전환). `ScheduledPublishScheduler.SUPPORTED_TARGET_TYPES` 및 `process()` 디스패치(`ScheduledPublishScheduler.java:92,374-378`) 확인.
- **ScheduledPublishActionType**: `PUBLISH` (현재 유일 지원값)
- **PlanModParam 무료 포인트 관련 필드** (`PATCH /api/v1/plans/{id}`, `plan/param/PlanModParam.java`): 발행/수정 시 작성자가 함께 설정
  - `allowFreePoints` (Boolean, nullable): 이 플랜을 무료 포인트로 구매할 수 있게 허용할지 여부
  - `freePointPrice` (BigDecimal, nullable): 무료 포인트 결제 시 적용할 차등 금액. 서버 저장값이 `null`이면 플랜 기본 가격으로 폴백하며, 값이 있으면 FREE 결제에 그 가격을 적용한다.
  - 서버 교차검증은 `price > 0 && allowFreePoints=true && freePointPrice != null`일 때 `freePointPrice >= 1`을 강제한다. `null`은 기본 가격 폴백이므로 서버상 유효하다.
  - `PATCH`에서 `null`은 “기존값 유지”라 저장된 `freePointPrice`를 명시적으로 지우는 계약은 없다. `allowFreePoints=false`이면 남은 가격값은 구매 판단에 사용되지 않는다.
  - 유료/무료 분리정산(Point Split Flow-Through) 정책에 따라 무료 결제분은 수취자에게 무료로만 전파되어 현금화되지 않는다. 상세 정책: `03_policy_prds/payment_settlement_policy_prd.md` §2.5.
- **에러 코드**:
  - 1500001 PLAN_NOT_FOUND
  - 1500002 PLAN_NOT_CREATOR
  - 1500003 PLAN_INVALID_STATUS_TRANSITION
  - 1500020 PLAN_NOT_READY_TO_PUBLISH (AUTH-01 신규) — publishPlan이 readiness 검사에서 BLOCKER 발견 시 반환
  - 3300001 SCHEDULED_PUBLISH_NOT_FOUND
  - 3300002 SCHEDULED_PUBLISH_TIME_NOT_FUTURE — scheduledAt이 현재 + 1분 이내인 경우
  - 3300003 SCHEDULED_PUBLISH_INVALID_TARGET_STATE
  - 3300004 SCHEDULED_PUBLISH_INVALID_STATUS
  - 3300005 SCHEDULED_PUBLISH_NOT_OWNER
  - 3300006 SCHEDULED_PUBLISH_UNSUPPORTED_TARGET_TYPE
  - 3300007 SCHEDULED_PUBLISH_UNSUPPORTED_ACTION_TYPE
  - 3300008 SCHEDULED_PUBLISH_DUPLICATE (409) — 동일 대상에 SCHEDULED/EXECUTING 예약 중복

### 의존 단위 / 외부 시스템

- **F08-02**: 발행 후 PlanVo는 plan_detail 화면 invalidate 트리거가 됨. 미리보기(`GET /preview`) 로그인 게이트 DRAFT/HIDDEN은 인증 필수 (AUTH-06 Slice 3)
- **F08-08 (마켓 메인 탐색, 다른 agent 영역)**: PUBLISHED 플랜이 `GET /api/v1/plans?status=PUBLISHED` 또는 `GET /api/v1/market/items` 결과에 노출됨
- **알림(NotificationService)**: AUTH-06 예약 발행 실패 시 `SCHEDULED_PUBLISH_FAILED(97)` FCM 알림 발송. dataJson에 `planId`, `targetType:PLAN`, `targetId` 포함 (`ScheduledPublishScheduler.java:569`)
- **ShedLock**: 예약 발행 폴러(`scheduledPublish`)와 복구 스캔(`scheduledPublishRecovery`)이 분산 스케줄러 락 사용. 외부 PG/S3 미사용.

## 5. 프론트 계약

### 진입 경로

- 플랜 상세(F08-02) ▶ DRAFT/HIDDEN 상태에서 "발행하기" 버튼 ▶ `/plan/:planId/publish`
- ~~플랜 목록(F08-01) ▶ 카드 인라인 "판매 시작" 버튼 직접 publish 호출~~ (AUTH-01 이후 제거 — 발행 준비 화면 우회 경로 폐쇄됨)

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
  - **발행 체크리스트** (`_buildChecklist`): 서버가 반환한 8개 readiness 항목을 그대로 순회해 표시한다. 제목 길이, 설명 길이, 최소 1개 블록, 커버, 가격, 카테고리, 최대 depth, 최대 블록 수가 대상이다. readiness가 아직 없을 때만 설명과 가격 2개 항목의 로컬 미러를 사용한다.
  - 설명·가격 항목은 저장 전 입력값으로 즉시 덮어 계산한다. 가격은 0이면 "무료", 양수이면 "₩금액" 형식으로 표시한다.
  - 각 체크 아이템: ✅/❌ + 라벨 + 우측 상태 텍스트 (통과 primary500 / 실패 error500)
  - **가격 설정** 섹션: TextField(숫자만) + "원" 단위, 안내 "0원으로 설정하면 무료 플랜으로 등록됩니다"
  - 유료 플랜(`price > 0`)에서는 **무료 포인트 구매 허용** 스위치를 표시한다. 켜면 무료 포인트 가격 입력(`digitsOnly`, 단위 `P`)을 표시하고 앱은 빈 값 또는 1 미만을 오류로 본다.
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
    - confirm `AppDialog.confirm("발행 후에는 본문 블록이 읽기 전용이 됩니다.\n발행하시겠습니까?")` (취소/발행)
    - 사용자 변경된 가격/설명/무료 포인트 설정이 있으면 먼저 `updatePlan(PlanModParam)` 호출
    - `planRepository.publishPlan(planId)` ▶ `POST /api/v1/plans/{id}/publish`
    - 성공: 토스트 "플랜이 발행되었습니다" + `Navigator.pop`
    - 실패: 서버 오류가 `PLAN_NOT_READY_TO_PUBLISH`이면 "발행 조건을 충족하지 못했습니다. 체크리스트를 확인해주세요", 그 밖에는 "발행에 실패했습니다" 토스트. 둘 다 readiness를 무효화하고 로컬 `isPublishing=false`
- **상태 분기**:
  - 로딩(plan fetch): `AppLoadingState(label:'발행 정보를 불러오는 중입니다')`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`
  - 발행 중: 버튼이 `CircularProgressIndicator(strokeWidth:2, white)`로 변경
  - 커버 업로드 중: `_isUploadingCover` 상태로 picker 영역에 spinner 표시
- **모달/시트/네비게이션**:
  - 발행 확인: `AppDialog.confirm`
  - 성공 시 `Navigator.of(context).pop()` (back to detail)

### API 호출 순서 (Provider/Repository 관점)

1. 진입 시:
   - `planDetailNotifierProvider(planId)` ▶ `GET /api/v1/plans/{planId}`
   - `planPublishReadinessNotifierProvider(planId)` ▶ `GET /api/v1/plans/{planId}/publish-readiness` (AUTH-01)
2. 커버 업로드 시: 파일 업로드 (`uploadImageFile`) → `planCreateNotifier.updatePlan(planId, PlanModParam(thumbnailUrl:fileKey))` → `PATCH /api/v1/plans/{id}` → readiness 무효화
3. 즉시 발행 시:
   - 가격/설명/무료 포인트 설정 변경이 있으면 `planCreateNotifier.updatePlan(planId, PlanModParam(price, description, allowFreePoints, freePointPrice))` → `PATCH`
   - `planRepository.publishPlan(planId)` → `POST /api/v1/plans/{planId}/publish`
   - 성공 시: `ref.invalidate(planDetailNotifierProvider)` + `ref.invalidate(myCreatedPlansNotifierProvider)` + `Navigator.pop`
   - 실패(400/PLAN_NOT_READY_TO_PUBLISH) 시: `ref.invalidate(planPublishReadinessNotifierProvider(planId))` 후 오류 토스트
4. 예약 발행 시 (AUTH-06):
   - 가격/설명/무료 포인트 인라인 편집이 있으면 먼저 PATCH 저장
   - `POST /api/v1/authoring/schedules` (`ScheduledPublishCreateParam`)
   - 성공 시: `ref.invalidate(planDetailNotifierProvider(planId))`

### 에디터에서 발행 화면으로 넘어가기 전 저장 배리어

`block_editor_screen.dart`는 발행 화면을 바로 push하지 않고 `EditorTransitionCoordinator`의 공통 전환 절차를 통과한다.

1. 전환 잠금을 잡고 진행 중인 업로드·다단계 블록 작업이 있으면 진입을 거부한다.
2. 활성 텍스트 세션을 unfocus하고 미저장 입력을 flush한다.
3. `PlanBlocksNotifier.waitForIdle()`로 직렬 mutation 큐의 tail을 기다린다.
4. 실패 블록·부분 작업 실패·남은 pending을 구분해 검사한다.
5. 최신 블록 트리를 다시 읽을 수 있을 때만 `/plan/:planId/publish`를 표시한다.

따라서 publish readiness는 “버튼을 누르기 직전 화면에 보였지만 아직 서버에 저장되지 않은 본문”을 의도적으로 배제하지 않는다. flush/큐/저장 상태/트리 재조회 중 하나라도 실패하면 화면 이동을 중단하고 원인별 복구 메시지를 표시한다.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **체크리스트 렌더링 방식 (AUTH-01 이후)**:
  - ~~클라이언트만 검증~~ → **서버 readiness(`PlanPublishReadinessVo`) 결과를 렌더링**하는 presentation layer로 재구성 (`plan_publish_screen.dart:374`).
  - readiness 로딩/실패 시 로컬 미러(description/price 2항목)로 폴백. publish 호출은 서버 gate가 최종 판단.
  - description/price 2항목은 로컬 TextEditingController 값으로 live override — 사용자 입력 즉시 체크리스트 반영(save 전에도).
  - **커버 이미지는 WARNING(발행 차단 안 함)** — 서버 `PLAN_HAS_COVER`의 severity가 `"WARNING"` (`PlanPublishReadinessService.java:126`). 기존 PRD의 "커버 이미지 필수" 기술은 잘못됨.
  - 타깃(`title`, `blocks`, `depth`, `count`, `category`)은 "수정하러 가기" CTA → `/plan/:planId/edit` 이동. description/price/cover는 인라인 편집이라 CTA 없음 (`plan_publish_screen.dart:453`).
- **체크리스트 BLOCKER 존재 시 서버도 발행 거부** (AUTH-01 이후): `publishPlan`이 내부에서 readiness를 재검사. UI `allPassed==false`면 토스트로 먼저 막고, 서버는 `PLAN_NOT_READY_TO_PUBLISH(400/1500020)` 반환. 앱은 400 응답 시 `planPublishReadinessNotifierProvider`를 invalidate해 체크리스트 자동 갱신 (`plan_publish_screen.dart:537`).
- **발행 확인 다이얼로그 메시지**: "발행 후에는 본문 블록이 읽기 전용이 됩니다.\n발행하시겠습니까?"
- **이미지 업로드 정책**:
  - 갤러리만 (ImageSource.gallery)
  - maxWidth=1200, maxHeight=675 (16:9), quality=85
  - purpose='EVENT_THUMBNAIL' (S3 prefix가 같이 사용됨)
  - 업로드 즉시 plan.thumbnailUrl 갱신 (발행 전이라도 PATCH 호출)
- **가격 입력 제약**: `FilteringTextInputFormatter.digitsOnly` — 정수만, 소수점 입력 불가. 서버는 BigDecimal이지만 UI는 정수 KRW
- **가격 표시 포맷**:
  - 통과 시 "₩1,000" (3자리 콤마 정규식)
  - 0 시 "무료"
- **저장 전략 — 인라인 메타 변경**: 가격/설명/무료 포인트 설정을 별도 `PATCH` 한 번으로 저장한 뒤 publish `POST`를 호출한다. 트랜잭션이 분리되므로 PATCH 성공 후 publish 실패 시 메타 변경은 남는다.
- **무료 포인트 앱 검증은 서버보다 엄격함**: 서버는 `allowFreePoints=true`이면서 `freePointPrice=null`인 기본가 폴백을 허용하지만, 현재 발행 화면은 토글을 켜면 1 이상의 값을 반드시 입력하게 한다.
- **isInitialized 패턴**: `_initControllers` 한 번만 호출되도록 가드 → 사용자가 입력한 값을 서버 응답으로 덮어쓰지 않음
- **발행 후 UX**:
  - 단순 pop으로 상세로 돌아감 (마켓 아이템 상세로 이동하지 않음)
  - SCR-PE-005 스펙은 "마켓 아이템 상세로 이동"을 명시하지만 현재 코드는 pop만 수행
- **라우터 위치**: `Routes.planList` 하위에 중첩 라우트 (`/plan/:planId/publish`)
- **예약 발행 UX (AUTH-06)**: 발행하기 버튼 옆에 "예약 발행" CTA 존재. 탭 시 `_schedulePublish(plan, allPassed)` 호출.
  - allPassed==false면 "예약 발행하려면 발행 조건을 먼저 충족해야 합니다" 토스트로 막음 (`plan_publish_screen.dart:566`).
  - 인라인 편집(description/price/allowFreePoints/freePointPrice) 변경 있으면 먼저 PATCH 저장 후 시트 표시.
  - `SchedulePublishSheet` 내에서 날짜(DatePicker) + 시간(TimePicker) 선택 → `POST /api/v1/authoring/schedules` 호출.
  - 성공 시 `ref.invalidate(planDetailNotifierProvider(planId))` → sheet pop (true 반환).
  - 예약 시각 최소 리드타임: 현재 + 1분 이상 (`ScheduledPublishService.java:53`). 그 이전 시각은 서버에서 `SCHEDULED_PUBLISH_TIME_NOT_FUTURE(400)` 반환.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 발행 Happy Path | DRAFT 플랜, 제목 28자, 블록 8개, 설명 10~500자 및 나머지 BLOCKER 조건 충족 | 플랜이 PUBLISHED, 마켓 노출 시작 |
| S2 | HIDDEN에서 재발행 | 이전에 한 번 발행했다가 hide한 플랜 (status=HIDDEN, 모든 메타 충족) | 다시 PUBLISHED |
| S3 | 잘못된 상태에서 발행 시도 | 어떤 이유로 화면이 PUBLISHED 상태인 플랜에서 발행 호출 | 변경 없음 |
| S4 | 비작성자 발행 시도 | 다른 사용자가 직접 API 호출 (앱 UI는 노출되지 않음) | 차단 |
| S5 | 가격/설명 PATCH 성공, publish 실패 (부분 성공) | 시나리오 본문 참조 | 가격/설명은 저장됨, 발행은 실패. 사용자가 다시 "발행하기" 탭하면 publish만 재시도됨 (PATCH는 변경 감지에서 skip) |
| S6 | 커버 업로드 실패 | 시나리오 본문 참조 | 커버 미등록 상태 유지 |
| S7 | 발행 후 마켓 노출 (다른 단위 의존) | 시나리오 본문 참조 | 마켓에서 발견 가능 |
| S8 | readiness BLOCKER 있는 상태에서 발행 시도 (AUTH-01) | 설명 미입력(PLAN_DESCRIPTION_LENGTH BLOCKER) 상태에서 발행 버튼 탭 | UI allPassed==false → 토스트. 서버 호출 시 `PLAN_NOT_READY_TO_PUBLISH(400/1500020)`. 체크리스트 자동 갱신. |
| S9 | 커버 없이 발행 (AUTH-01 이후 정책 변경) | 커버 이미지 없이 나머지 조건 충족 | `PLAN_HAS_COVER`가 WARNING이므로 발행 허용. 커버 없음을 경고 표시만. (기존 "커버 필수" 동작 변경됨) |
| S10 | 예약 발행 — 성공 (AUTH-06) | DRAFT 플랜, 조건 모두 충족, 미래 시각 선택 | `POST /api/v1/authoring/schedules` → 201. 폴러가 도달 시 `publishPlan` 실행 → PUBLISHED |
| S11 | 예약 발행 — 취소 (AUTH-06) | SCHEDULED 예약 존재 | `DELETE /api/v1/authoring/schedules/{id}` → CANCELLED 상태. EXECUTING 이후는 취소 불가(`SCHEDULED_PUBLISH_INVALID_STATUS`) |
| S12 | 예약 실행 시 readiness 실패 (AUTH-06) | 예약 후 설명을 삭제해 readiness BLOCKER 발생 | 폴러가 readiness 재검사 → FAILED. `SCHEDULED_PUBLISH_FAILED(97)` 알림 발송 |
| S13 | stuck EXECUTING 복구 (AUTH-06) | JVM 재시작으로 EXECUTING 고착 | `recoverStuck` 스캔 → 실제 플랜 상태가 PUBLISHED면 markExecuted, DRAFT/HIDDEN면 재큐잉(최대 N회), DELETED면 FAILED + 알림 |
| S14 | 유료 플랜의 무료 포인트 가격 미입력/0 | `price > 0`, 무료 포인트 허용 스위치 ON | 앱이 발행·예약 전에 차단하고 “무료 포인트 가격은 1 이상이어야 합니다” 표시 |

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
| 해소됨(AUTH-01) | `PlanService.java:313`, `PlanPublishReadinessService.java:50` | ~~서버 측 검증 부재~~ — AUTH-01로 `publishPlan`이 readiness 재검사를 내장. BLOCKER 있으면 `PLAN_NOT_READY_TO_PUBLISH(400)` 반환. | 완료 |
| 해소됨(AUTH-01) | `plan_publish_screen.dart:374` | ~~체크리스트는 클라이언트만 검증~~ — 서버 readiness 결과를 렌더링하는 presentation layer로 재구성됨. | 완료 |
| 확정됨(소스 대조) | `PlanController.java:110` | 즉시 발행 후 사이드 이펙트(FCM/이메일/마켓 자동 등록) 없음 — `publishPlan`은 상태 전환만 수행. 구매자 알림 등은 별도 도메인에서 처리. | 현재 설계 의도적 — 추가 필요 시 신규 슬라이스 |
| Risk(미해소) | `plan_publish_screen.dart:165` | SCR-PE-005 스펙은 "발행 후 마켓 아이템 상세로 이동"을 명시하지만 현재 코드는 `Navigator.pop`만 수행. | Decision Needed: 스펙 갱신 또는 라우팅 수정 |
| Risk(AUTH-06) | `ScheduledPublishService.java:53` | 예약 시각 최소 리드타임이 1분이어서 폴링 주기(기본 60초) 내 실행이 보장되지 않음. 실제 발행은 최대 2분 지연 가능. | 허용 범위 여부 UX 결정 필요 |
| 확정-OK (AUTH-06 Slice 2b) | `ScheduledPublishScheduler.java:92`, app `0056d89` | CLUB_POST/CLUB_ANNOUNCEMENT는 폴러 대상집합에 포함돼 실행되며, 앱 작성 화면도 `scheduledAt`을 전달해 `SCHEDULED` 상태로 생성하는 경로까지 구현됨(`schedule_publish_section.dart` → 게시글/공지 작성 화면). | 해소됨 — 상세는 F04-08·F04-10 |
| 해소됨(2026-07 실측) | `plan_publish_screen.dart:296,623,726` | 무료 포인트 허용/가격 UI 위치가 미결정이라는 과거 기록과 달리 가격 섹션에 스위치·가격 입력·검증이 구현됐고, 즉시/예약 발행 모두 먼저 PATCH한다. | 완료 |
| 확인된 차이 | `PlanService.validateFreePointPriceCrossField`, `plan_publish_screen.dart:93` | 서버는 `freePointPrice=null` 기본가 폴백을 허용하지만 앱 발행 화면은 허용 스위치 ON 시 값을 필수화한다. | 앱의 엄격한 UX를 유지할지 정책 결정 |

## 9. 수용 기준

- **AC-01. 첫 발행 Happy Path**: Given DRAFT 플랜, 제목 28자, 블록 8개, 설명 10~500자 및 나머지 BLOCKER 조건 충족 When 사용자가 발행을 확정하면 Then 플랜이 PUBLISHED, 마켓 노출 시작
- **AC-02. HIDDEN에서 재발행**: Given 이전에 한 번 발행했다가 hide한 플랜 (status=HIDDEN, 모든 메타 충족) When 사용자가 해당 흐름을 실행하면 Then 다시 PUBLISHED
- **AC-03. 잘못된 상태에서 발행 시도**: Given 어떤 이유로 화면이 PUBLISHED 상태인 플랜에서 발행 호출 When 사용자가 해당 흐름을 실행하면 Then 변경 없음
- **AC-04. 비작성자 발행 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 차단
- **AC-05. 가격/설명 PATCH 성공, publish 실패 (부분 성공)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가격/설명은 저장됨, 발행은 실패. 사용자가 다시 "발행하기" 탭하면 publish만 재시도됨 (PATCH는 변경 감지에서 skip)
- **AC-06. 커버 업로드 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 커버 미등록 상태 유지
- **AC-07. 발행 후 마켓 노출 (다른 단위 의존)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 마켓에서 발견 가능
- **AC-08. readiness BLOCKER 있는 상태에서 발행 거부 (AUTH-01)**: Given 설명 미입력 상태 When "발행하기" 탭 Then UI가 먼저 토스트로 막고, 서버 호출 시 `PLAN_NOT_READY_TO_PUBLISH(400)`. 체크리스트 갱신.
- **AC-09. 커버 없이도 발행 허용 (AUTH-01 정책 변경)**: Given 커버 이미지 없고 나머지 BLOCKER 없는 DRAFT 플랜 When "발행하기" 탭 Then 발행 성공 (`PLAN_HAS_COVER`는 WARNING)
- **AC-10. 예약 발행 성공 (AUTH-06)**: Given DRAFT 플랜 + 조건 충족 When 미래 시각 선택 후 "확인" Then `SCHEDULED_PUBLISH_ACTION` 생성. 지정 시각 폴러 실행 후 플랜 PUBLISHED.
- **AC-11. 예약 발행 취소 (AUTH-06)**: Given SCHEDULED 예약 When "취소" Then CANCELLED 상태 전환. EXECUTING 이후 취소 시 `SCHEDULED_PUBLISH_INVALID_STATUS(400)`.
- **AC-12. 예약 실행 실패 시 알림 (AUTH-06)**: Given readiness BLOCKER 발생 When 폴러 실행 Then `SCHEDULED_PUBLISH_FAILED(97)` FCM 알림 수신 + 체크리스트 blockers 포함 메시지.
- **AC-13. 무료 포인트 메타 선저장**: Given 가격·설명·무료 포인트 설정을 변경 When 즉시 발행 또는 예약 발행 Then 해당 `PlanModParam` PATCH가 성공한 뒤에만 publish/schedule 단계로 진행.
- **AC-14. 무료 포인트 가격 앱 검증**: Given `price > 0`이고 무료 포인트 구매 허용 When 가격이 비었거나 1 미만 Then API 호출 전에 오류 토스트로 차단.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- **발행 후 라우팅**: SCR-PE-005 스펙의 "마켓 아이템 상세로 이동" vs 현재 코드의 `Navigator.pop`(단순 상세로 복귀) — 어떤 UX가 맞는지 결정 필요.
- **예약 발행 리드타임 UX**: 최소 1분 리드타임 + 폴링 주기(60초) = 실제 발행 최대 2분 지연. 사용자에게 이를 고지할 방법(시트 내 안내 문구 등) 결정 필요.
- **클럽 글/공지 예약 발행(AUTH-06 Slice 2b) — 구현됨**: `CLUB_POST`/`CLUB_ANNOUNCEMENT` targetType 예약 생성·폴러 실행(서버)에 더해, 앱 작성 화면이 `scheduledAt`을 전달해 `SCHEDULED` 상태로 생성하는 경로까지 구현됨(`schedule_publish_section.dart` → `post_create_screen.dart`/`announcement_create_screen.dart`, 커밋 app `0056d89`). 상세는 F04-08·F04-10 참조.
- **무료 포인트 폴백 정책 정렬**: 서버는 `freePointPrice=null`이면 기본가 FREE 결제를 허용하지만 앱 발행 화면은 가격 입력을 필수화한다. 어느 계약을 제품 표준으로 삼을지 결정한다.
- **예약 목록 화면 — 구현됨**: `GET /api/v1/authoring/schedules` 서버 조회 + 앱 내 예약 목록 화면(`scheduled_publish_list_screen.dart`, 라우트 `/authoring/schedules`, `app_router.dart` 배선)으로 작성자가 자기 예약을 조회·취소할 수 있다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
