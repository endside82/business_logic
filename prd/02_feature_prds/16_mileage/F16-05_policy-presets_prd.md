# F16-05. 적립규칙·등급·배지·교환 프리셋 관리 PRD

## 1. 결론

`POLICY_OWNER` 운영진이 마일리지 메타 정의 4종을 CRUD 한다 — 자동 적립 규칙(트리거별), 등급(최대 10), 배지 정의(최대 50), 차감 프리셋, 그리고 시즌 CRUD. 서버 `MileageAdminPolicyController`의 각 섹션이 `MileageEarningRuleService`/`MileageGradeService`/`MileageBadgeService`/`MileageRedemptionPresetService`/`MileageSeasonService`로 연결되고, Flutter `mileage_grade_crud_screen.dart`·`mileage_badge_crud_screen.dart`·`mileage_redemption_preset_crud_screen.dart`·`mileage_season_crud_screen.dart`가 표시한다.

핵심 비즈니스 규칙: 등급은 클럽당 ≤10, threshold는 단조·중복 금지, 이름에 금전성 단어("원/캐시/포인트/won/cash/point") 금지 — 그러나 **이 세 위반이 전부 `MILEAGE_GRADE_LIMIT_EXCEEDED` 단일 코드**로 던져진다. 배지 정의는 ≤50. 적립 규칙은 트리거별 upsert(`POST`)이고, 차감 프리셋은 삭제 불가·비활성화만(`DELETE`=deactivate).

판정: **CRUD는 사용 가능**. 등급 검증 에러 코드가 사유별로 구분되지 않아 사용자 메시지가 모호한 것이 주요 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `MileageAdminPolicyController.java` | earning-rules/grades/badges/redemption-presets/seasons CRUD 엔드포인트 |
| Backend Service | `MileageEarningRuleService.java` | `upsertRule`(트리거별), `modifyRule` |
| Backend Service | `MileageGradeService.java` | MAX_GRADES=10, FORBIDDEN_KEYWORDS, threshold 단조/중복, 모두 `MILEAGE_GRADE_LIMIT_EXCEEDED` |
| Backend Service | `MileageBadgeService.java` | MAX_BADGES=50, 정의 CRUD |
| Backend Service | `MileageRedemptionPresetService.java` | 삭제 불가·`deactivate`만, `requireActivePreset` |
| Backend Service | `MileageSeasonService.java` | 시즌 CRUD, 기간 중복 금지, close |
| Backend VO/Param/Enum | `MileageEarningRuleVo`·`...AddParam/ModParam`, `MileageGradeVo`·param, `MileageBadgeDefinitionVo`·param, `MileageRedemptionPresetVo`·param, `MileageSeasonVo`·param, `constants/EarningTriggerType.java` | 필드·검증 |
| Frontend | `mileage_admin_policy_api.dart`, `mileage_admin_policy_repository.dart`, `mileage_admin_policy_providers.dart`, `presentation/mileage/admin/screens/mileage_grade_crud_screen.dart`, `mileage_badge_crud_screen.dart`, `mileage_redemption_preset_crud_screen.dart`, `mileage_season_crud_screen.dart` | route·CRUD CTA |
| DB | `V1__init.sql` `mileage_earning_rule`, `mileage_grade`, `mileage_badge_definition`, `mileage_redemption_preset`, `mileage_season` | 컬럼·제약 |

## 3. 전체 동작 흐름

1. POLICY_OWNER가 각 메타 화면에 진입 → list 조회(`GET /earning-rules` 등).
2. **적립 규칙**: `POST /earning-rules`는 트리거별 upsert — 같은 `triggerType`이 있으면 갱신, 없으면 생성. `MileageEarningRuleAddParam`(triggerType 필수, active 기본 false, points≥0 필수, reviewDeadlineDays/photoAutoApprove 선택).
3. **등급**: `POST /grades`는 ① 클럽 등급 수 ≥10 검증 ② 이름 금전성 단어 검증 ③ threshold 중복 검증 ④ 이름 중복 검증 — 모든 위반이 `MILEAGE_GRADE_LIMIT_EXCEEDED`. `PUT`/`DELETE`도 동일 서비스.
4. **배지 정의**: `POST /badges`는 ≥50 검증 후 생성(active=true). `PUT`로 수정(active 토글 포함).
5. **차감 프리셋**: `POST /redemption-presets` 생성(active=true), `PUT` 수정, `DELETE`는 실제 삭제가 아니라 `deactivate`(active=false). 차감(F16-06) 시 `requireActivePreset`이 비활성 프리셋을 `MILEAGE_PRESET_INACTIVE`로 차단.
6. **시즌**: `POST /seasons` 생성 시 startAt<endAt·기간 중복(CLOSED 제외) 검증, 현재 시각 기준 SCHEDULED/ACTIVE 자동 결정. `PUT`로 수정(CLOSED 시즌은 수정 불가), `POST /seasons/{seasonId}/close`로 마감(상태 CLOSED + 다음 SCHEDULED→ACTIVE).
7. 모든 쓰기는 actorRole 결정 후 audit log(`MILEAGE_*_CREATED/UPDATED/DELETED/DEACTIVATED/SEASON_CLOSED`) + outbox 발행.

## 4. 서버 계약

### 적립 규칙
- `GET /earning-rules` → `List<MileageEarningRuleVo>`(id/triggerType/active/points/reviewDeadlineDays/photoAutoApprove).
- `POST /earning-rules`(upsert, 201) / `PUT /earning-rules/{ruleId}`. `EarningTriggerType{EVENT_CHECKIN,EVENT_REVIEW,EVENT_PHOTO_APPROVED}`.

### 등급
- `GET /grades` → `List<MileageGradeVo>`. `POST`(201)/`PUT/{gradeId}`/`DELETE/{gradeId}`(204).
- `MileageGradeAddParam`: name(≤20, 금전성 단어 금지), threshold(≥0, 단조/중복 금지), colorToken(≤50), iconKey(≤50), displayOrder.
- 위반(≥10 / 금전성 단어 / threshold 중복 / 이름 중복) → 모두 `MILEAGE_GRADE_LIMIT_EXCEEDED`. 미존재 → `MILEAGE_GRADE_NOT_FOUND`.

### 배지 정의
- `GET /badges` → 전체(active 포함). `POST`(201, active=true)/`PUT/{badgeDefId}`. ≥50 → `MILEAGE_BADGE_LIMIT_EXCEEDED`. 미존재 → `MILEAGE_BADGE_NOT_FOUND`.

### 차감 프리셋
- `GET /redemption-presets` → 전체(displayOrder asc). `POST`(201, active=true)/`PUT/{presetId}`/`DELETE/{presetId}`(204=deactivate).
- `MileageRedemptionPresetAddParam`: label(≤50), defaultAmount(Positive), displayOrder. 미존재 → `MILEAGE_PRESET_NOT_FOUND`.

### 시즌
- `GET /seasons`(운영, 전체) / `POST`(201) / `PUT/{seasonId}` / `POST /{seasonId}/close`.
- `MileageSeasonAddParam`: name(≤50), startAt/endAt 필수. 시작≥종료 또는 기간 중복 → `MILEAGE_SEASON_OVERLAP`. CLOSED 수정/close 대상 미충족 → `MILEAGE_SEASON_NOT_FOUND`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `adminMileagePolicyGrades`(`grades`), `adminMileagePolicyBadges`(`badges`), `adminMileagePolicyPresets`(`presets`), `adminMileagePolicySeasons`(`seasons`) |
| Screen | `MileageGradeCrudScreen`, `MileageBadgeCrudScreen`, `MileageRedemptionPresetCrudScreen`, `MileageSeasonCrudScreen` |
| Repository/API | `MileageAdminPolicyRepository` (earning-rule/grade/badge/preset/season CRUD) |
| Model | `MileageEarningRuleVo`·`...AddParam/ModParam`, `MileageGradeVo`·param, `MileageBadgeDefinitionVo`·param, `MileageRedemptionPresetVo`·param, `MileageSeasonVo`·param, `EarningTriggerType` enum |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| POLICY_OWNER + 등급 10개 초과 생성 | `MILEAGE_GRADE_LIMIT_EXCEEDED` | 에러 표시 | 생성 차단 | 일치 (메시지 모호) |
| POLICY_OWNER + 금전성 단어 등급명 | 동일 코드로 차단 | 동일 에러 | 생성 차단 | 일치 (사유 구분 안 됨) |
| POLICY_OWNER + 적립 규칙 재생성 | 같은 trigger upsert(갱신) | 폼 저장 | 기존 규칙 갱신 | 일치 |
| POLICY_OWNER + 프리셋 삭제 | deactivate(active=false) | 삭제 버튼 | 비활성화(이력 보존) | 일치 |
| POLICY_OWNER + 시즌 기간 중복 | `MILEAGE_SEASON_OVERLAP` | 에러 | 생성 차단 | 일치 |
| POLICY_OWNER + CLOSED 시즌 수정 | `MILEAGE_SEASON_NOT_FOUND` | 에러 | 수정 차단 | 일치 (코드 의미 모호) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `EarningTriggerType` | EVENT_CHECKIN/EVENT_REVIEW/EVENT_PHOTO_APPROVED | 동일 enum | 일치 |
| 적립 규칙 생성 의미 | upsert(트리거 unique) | POST = create로 인식 | 의미 차이 가능(중복 생성 시 갱신) |
| 프리셋 DELETE | deactivate(soft) | 삭제 UI | 동작 일치(이력 보존) |
| 등급 검증 에러 | 4가지 위반 모두 `MILEAGE_GRADE_LIMIT_EXCEEDED` | 단일 에러 메시지 | 일치하나 사유 구분 불가 |
| 배지 active 노출 | 운영 `GET /badges`는 전체 | 운영 화면 전체 표시 | 일치 (멤버는 active만 — F16-02) |
| CLOSED 시즌 수정 거부 | `MILEAGE_SEASON_NOT_FOUND` 재사용 | not-found로 해석 | 의미 모호(Gap) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 등급 검증 에러가 단일 코드로 묶임 | `MileageGradeService`가 ≥10/금전성 단어/threshold 중복/이름 중복을 모두 `MILEAGE_GRADE_LIMIT_EXCEEDED`로 던짐 | 사용자가 "왜 안 되는지"(개수 초과인지 단어 금지인지) 알 수 없음 | 위반 사유별 ErrorCode 분리 |
| P2 | CLOSED 시즌 수정 거부에 NOT_FOUND 재사용 | `modify`/`close`가 상태 위반에 `MILEAGE_SEASON_NOT_FOUND` 던짐 | "없음"과 "수정 불가 상태"가 구분 안 됨 | 상태 위반 전용 에러 코드 도입 |
| P2 | 적립 규칙 POST가 upsert | 같은 trigger 재생성 시 기존 갱신 | UI에서 "생성"으로 보이나 실제 덮어쓰기 | UI에서 기존 규칙 존재 시 "수정"으로 표기 |

## 9. 수용 기준

### AC-01. 등급 개수 제한
Given 클럽에 등급이 10개 있다. When POLICY_OWNER가 11번째 등급을 생성한다. Then `MILEAGE_GRADE_LIMIT_EXCEEDED`가 반환되고 생성이 차단된다.

### AC-02. 금전성 단어 차단
Given POLICY_OWNER가 "1000포인트" 등급명을 입력한다. When `POST /grades`를 호출한다. Then 금전성 단어로 차단된다(현재 동일 코드 `MILEAGE_GRADE_LIMIT_EXCEEDED`).

### AC-03. 적립 규칙 upsert
Given EVENT_CHECKIN 규칙이 이미 있다. When POLICY_OWNER가 같은 트리거로 다시 저장한다. Then 새 row가 아니라 기존 규칙의 points/active가 갱신된다.

### AC-04. 프리셋 비활성화
Given 사용 중인 차감 프리셋이 있다. When POLICY_OWNER가 삭제(DELETE)한다. Then row는 보존되고 active=false가 되며 이후 차감에서 `MILEAGE_PRESET_INACTIVE`로 선택 불가가 된다.

### AC-05. 시즌 기간 중복
Given ACTIVE 시즌이 있다. When POLICY_OWNER가 기간이 겹치는 시즌을 생성한다. Then `MILEAGE_SEASON_OVERLAP`이 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 등급 검증 에러 분리 | 개수/단어/중복별 ErrorCode 분리 |
| 구현 | 시즌 상태 위반 에러 | CLOSED 수정 거부 전용 코드 |
| 정책 | 금전성 단어 목록 | FORBIDDEN_KEYWORDS 확장/관리 정책 결정 |
| 테스트 | 메타 CRUD | 등급 제한/단어, 프리셋 deactivate, 시즌 중복 E2E 추가 |
