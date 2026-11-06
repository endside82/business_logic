# F08-05. 플랜 발행 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

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

## 2. 코드 위치

계약의 정본은 코드다. 서버: `PlanController`, `ScheduledPublishController`, `PlanPublishReadinessService`, `PlanService`, `ScheduledPublishStatus`, `ScheduledPublishTargetType`, `ScheduledPublishActionType`, `PlanPublishReadinessVo`, `ScheduledPublishScheduler`, `PlanModParam`. 앱: `plan_publish_screen.dart`, `block_editor_screen.dart`, `schedule_publish_sheet.dart`.

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 발행은 DRAFT 와 HIDDEN 에서만 된다. PUBLISHED, DELETED 에서 부르면 PLAN_INVALID_STATUS_TRANSITION 이다. 발행 뒤 본문 블록은 읽기 전용이다.
- 서버가 발행 때 준비도를 다시 검사해 막는 항목이 하나라도 있으면 PLAN_NOT_READY_TO_PUBLISH 로 거절한다. 앱은 체크리스트를 새로 읽는다.

| 준비도 항목 | 기준 | 막는가 |
|---|---|---|
| 운영팀 숨김 | 운영팀이 숨기지 않음 | 막음 |
| 제목 | 2~50자 | 막음 |
| 설명 | 10~500자 | 막음 |
| 블록 | 1개 이상 | 막음 |
| 커버 이미지 | 있음 | 경고만 |
| 가격 | 0 이상 | 막음 |
| 카테고리 | 비어 있지 않음 | 막음 |
| 깊이 | 3 이하 | 막음 |
| 블록 수 | 200 이하 | 막음 |

- 제목, 블록, 깊이, 수, 카테고리 항목은 에디터로 가서 고치고, 설명, 가격, 커버는 발행 화면에서 고친다.
- 가격은 정수 원이고 0 이면 무료 플랜이다. 무료 포인트 가격은 서버에서 값이 있을 때 1 이상이어야 하고, 비워 두면 기본 가격을 쓴다. 앱은 켜면 1 이상을 반드시 입력하게 해 서버보다 엄격하다. 수정 때 비운 값은 "기존값 유지"이므로 저장된 무료 포인트 가격을 지우는 방법은 없다.
- 입력 저장과 발행은 따로 일어나, 저장 뒤 발행이 실패해도 고친 값은 남는다.
- 에디터에서 발행 화면으로 가기 전 진행 중인 저장을 모두 끝내고 트리를 다시 읽는다. 하나라도 실패하면 이동을 멈추고 원인을 알린다. 저장 안 된 본문이 발행 판정에서 빠지지 않게 하기 위해서다.
- 예약 발행은 작성자만 할 수 있고 준비도를 충족해야 시작할 수 있다. 시각은 지금부터 1분 뒤 이후여야 한다. 같은 대상에 SCHEDULED, EXECUTING 예약이 있으면 거절(409)한다. 취소는 SCHEDULED 일 때만 된다.
- 예약 대상은 플랜 외에 마켓 아이템, 클럽 글, 클럽 공지도 있다. 실행 때 준비도를 다시 보고 실패하면 FAILED 와 알림으로 끝난다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 확정됨(소스 대조) | `PlanController.java:110` | 즉시 발행 후 사이드 이펙트(FCM/이메일/마켓 자동 등록) 없음 — `publishPlan`은 상태 전환만 수행. 구매자 알림 등은 별도 도메인에서 처리. | 현재 설계 의도적 — 추가 필요 시 신규 슬라이스 |
| Risk(미해소) | `plan_publish_screen.dart:165` | SCR-PE-005 스펙은 "발행 후 마켓 아이템 상세로 이동"을 명시하지만 현재 코드는 `Navigator.pop`만 수행. | Decision Needed: 스펙 갱신 또는 라우팅 수정 |
| Risk(AUTH-06) | `ScheduledPublishService.java:53` | 예약 시각 최소 리드타임이 1분이어서 폴링 주기(기본 60초) 내 실행이 보장되지 않음. 실제 발행은 최대 2분 지연 가능. | 허용 범위 여부 UX 결정 필요 |
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

- **발행 후 라우팅**: SCR-PE-005 스펙의 "마켓 아이템 상세로 이동" vs 현재 코드의 `Navigator.pop`(단순 상세로 복귀) — 어떤 UX가 맞는지 결정 필요.
- **예약 발행 리드타임 UX**: 최소 1분 리드타임 + 폴링 주기(60초) = 실제 발행 최대 2분 지연. 사용자에게 이를 고지할 방법(시트 내 안내 문구 등) 결정 필요.
- **클럽 글/공지 예약 발행(AUTH-06 Slice 2b) — 구현됨**: `CLUB_POST`/`CLUB_ANNOUNCEMENT` targetType 예약 생성·폴러 실행(서버)에 더해, 앱 작성 화면이 `scheduledAt`을 전달해 `SCHEDULED` 상태로 생성하는 경로까지 구현됨(`schedule_publish_section.dart` → `post_create_screen.dart`/`announcement_create_screen.dart`). 상세는 F04-08·F04-10 참조.
- **무료 포인트 폴백 정책 정렬**: 서버는 `freePointPrice=null`이면 기본가 FREE 결제를 허용하지만 앱 발행 화면은 가격 입력을 필수화한다. 어느 계약을 제품 표준으로 삼을지 결정한다.
- **예약 목록 화면 — 구현됨**: `GET /api/v1/authoring/schedules` 서버 조회 + 앱 내 예약 목록 화면(`scheduled_publish_list_screen.dart`, 라우트 `/authoring/schedules`, `app_router.dart` 배선)으로 작성자가 자기 예약을 조회·취소할 수 있다.
