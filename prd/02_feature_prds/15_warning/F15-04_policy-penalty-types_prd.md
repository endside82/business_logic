# F15-04. 경고 정책 & 패널티 유형 설정 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

경고 정책 설정은 `POLICY_OWNER` 권한(OWNER 자동 통과)으로 `WarningAdminPolicyController`(`/api/v1/admin/clubs/{clubId}/warnings`)가 제공한다. `GET/PUT /config`로 경고 제도 활성화, 익명 제보 허용, 만료/SLA 안내 텍스트, 검토 임계치 4단계(`attentionMin ≤ monitorMin ≤ restrictionMin ≤ severeMin` 권장)를 관리하고, `GET /config/preview`로 임계치 변경 시 현재/이후 검토 등급 분포를 미리 본다. 패널티 유형은 `GET /penalty-types`로 플랫폼 카탈로그 + 클럽 override를 병합 조회하고, `PUT /penalty-types`로 유형별 ON/OFF·점수를 upsert하며, `GET /penalty-type-catalog`로 시스템 마스터 7행을 본다. Flutter `warning_policy_screen.dart`가 이를 구현했고 enum/VO 필드가 일치한다.

판정: **설정 조회·갱신·프리뷰의 화면-API 정합은 닫혀 있다**. 정책 기본 임계치는 Java `WarningProgramConfigService.initialize()` 와 DDL `warning_program_config` 기본값이 모두 attention=3/monitor=6/restriction=10/severe=15 로 같다(2026-11-08 확인, 옛 글의 「DDL 1/3/5/7」 은 지금 V1 과 다르다). 핵심 Gap은 (b) 임계치 단조 증가를 서버가 강제하지 않고 경고(`THRESHOLD_NOT_MONOTONIC`)로만 표시, (c) 대규모 클럽(≥100,000명)은 분포 계산을 스킵하고 `LARGE_CLUB_DISTRIBUTION_SKIPPED`만 반환, (d) `previewConfig`가 GET인데 `@Valid WarningProgramConfigUpdateParam`을 쿼리로 받으므로 `text` 필드 길이 검증이 쿼리스트링에 적용되는 점이다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `WarningAdminPolicyController`, `WarningProgramConfigService`, `WarningPenaltyTypeConfigService`, `WarningProgramConfigUpdateParam`, `ClubPenaltyTypeConfigUpdateParam`. 앱: `warning_policy_screen.dart`, `warning_admin_policy_api.dart`.

## 3. 전체 동작 흐름

1. POLICY_OWNER가 운영 콘솔에서 `policy`(`Routes.adminWarningPolicy`) → `WarningPolicyScreen(clubId, role)` 진입.
2. `GET /config`(`getConfig`) → 없으면 `getOrCreate`가 DDL/Java 기본값 row를 INSERT → `WarningProgramConfigVo`. `GET /penalty-types`(병합 7행), `GET /penalty-type-catalog`(마스터) 동시 로드.
3. 임계치/토글 수정 후 `GET /config/preview`(`previewConfig`)로 영향 미리보기 → `WarningConfigPreviewVo`(현재/이후 분포, warnings 리스트).
4. 저장: `PUT /config`(`updateConfig`) → `WarningProgramConfigService.update`가 변경 필드만 적용(MapStruct, null 무시), before/after 스냅샷을 audit log + outbox `PolicyChanged`로 기록.
5. 패널티 유형 토글/점수: `PUT /penalty-types`(`ClubPenaltyTypeConfigUpdateParam`) → `upsert`가 카탈로그 존재·available 검증 후 클럽 override INSERT/UPDATE(멱등), audit `PENALTY_TYPE_CONFIG_UPDATED` + outbox `PenaltyTypeConfigChanged`.

## 4. 제품 규칙

- 부여 점수는 직접 지정한 점수, 클럽이 정한 점수, 기본 점수 순으로 먼저 있는 것을 쓴다. 클럽이 끈 유형은 부여할 수 없다.
- 클럽이 아직 설정하지 않은 유형은 목록에서 꺼진 상태로 보이고 점수가 비어 있다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| POLICY_OWNER | `@RequiresClubPermission(POLICY_OWNER)` | 설정 화면 | 정책/유형 편집 | 일치 |
| OWNER | flag 자동 통과 | 동일 | 편집 | 일치 |
| 일반 ADMIN(권한 없음) | 403 | 진입 차단 | 접근 불가 | 일치 |
| config 없는 클럽 GET | `getOrCreate` row 생성 | 기본값 표시 | 기본 정책 노출 | 기본값 불일치 Gap |
| 단조성 위반 PUT | 저장은 됨, preview에서 `THRESHOLD_NOT_MONOTONIC` 경고 | 경고 배지 | 저장 허용+경고 | Risk(아래) |
| 대규모 클럽 preview | `largeClub=true`, 분포 스킵 | 분포 미표시 안내 | 분포 없이 경고만 | 일치(의도) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `PenaltySeverity` | LIGHT/MODERATE/SEVERE | `warning_enums.dart` 동일 | 일치 |
| `PenaltyApprover` | ADMIN/OWNER | 동일 | 일치 |
| config 응답 형태 | `WarningProgramConfigVo` | VO | 일치 |
| penalty-types 응답 | `List<ClubPenaltyTypeMergedVo>` | List | 일치 |
| preview 쿼리 바인딩 | GET + `@Valid` param | Flutter `@Queries()` | 일치 |
| 기본 임계치 | Java·DDL 모두 3/6/10/15 | 화면은 서버값 표시 | 일치(2026-11-08 확인) |
| `configured=false` 표현 | active=false, points=null | Dart `points: int?` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | 임계치 단조성 미강제 | `update`가 단조성 검사 없이 저장, preview만 경고 | restriction<monitor 같은 역전 설정 시 등급 평가 왜곡 가능 | 저장 시 단조성 강제 또는 명시적 확인 UX |
| P2 | preview가 GET 쿼리로 text 필드 받음 | `@Valid WarningProgramConfigUpdateParam`에 `expiryPolicyText@Size(4000)` 포함 | 긴 텍스트를 쿼리스트링으로 보내면 URL 길이 제한·인코딩 이슈 | preview body 전환 또는 text 필드 제외 검토 |
| P3 | `updatePenaltyType` 응답 void | PUT 후 클라이언트가 즉시 재조회 필요 | 화면 동기화 추가 라운드트립 | 변경 결과 VO 반환 검토 |

## 9. 수용 기준

### AC-01. 정책 활성화
Given POLICY_OWNER가 경고 제도를 `active=true`로 저장한다.
When `PUT /config`가 호출된다.
Then config가 갱신되고 audit `POLICY_UPDATED`(before/after) + outbox `PolicyChanged`가 발행된다.

### AC-02. 임계치 변경 영향 미리보기
Given POLICY_OWNER가 `restrictionMin`을 변경하고 preview를 요청한다.
When `GET /config/preview`가 호출된다(대규모 클럽 아님).
Then `currentLevelDistribution`/`projectedLevelDistribution`이 5등급별 인원으로 반환된다.

### AC-03. 패널티 유형 ON + 점수 override
Given POLICY_OWNER가 `LATE` 유형을 `active=true, points=2`로 저장한다.
When `PUT /penalty-types`가 호출된다.
Then 클럽 override가 upsert되고, 이후 부여 시 `resolvePoints`가 2를 반환한다.

### AC-04. 비활성 유형 부여 차단
Given 클럽이 `NO_SHOW` 유형을 `active=false`로 설정했다.
When 그 유형으로 부여/제보가 시도된다.
Then `resolvePoints`가 `PENALTY_TYPE_INACTIVE`를 던진다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 기본 임계치 단일화 | Java `initialize()`와 DDL 기본값을 한쪽으로 통일 |
| 정책 | 단조성 강제 여부 | 임계치 역전을 막을지/경고만 할지 결정 |
| 구현 | preview 요청 방식 | GET 쿼리 text 길이 이슈 해결(body 전환 검토) |
| 테스트 | 정책/유형 | 활성/단조성/유형 ON-OFF/대규모 클럽 분포 스킵 E2E |
