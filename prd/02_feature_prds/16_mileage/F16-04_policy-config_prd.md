# F16-04. 마일리지 정책 설정 PRD

## 1. 결론

마일리지 정책 설정은 `POLICY_OWNER` 권한 운영진이 프로그램 활성화·만료일·랭킹 기준·시즌 사용을 조회/수정하고, 변경 영향을 미리 보는 흐름이다. 서버 `MileageAdminPolicyController`의 `GET/PUT /config`와 `GET /config/preview`가 `MileageProgramConfigService`로 연결되고, Flutter `mileage_policy_screen.dart` + `mileage_config_preview_dialog.dart`가 이를 표시한다.

정책 조회는 없으면 기본값(`active=false`, `expiryDays=365`, `rankingBasis=BALANCE`, `seasonEnabled=false`)으로 생성 후 반환한다. **정책의 `active`가 핵심 게이트다** — `requireActive(clubId)`가 false면 적립(F16-06 grant)·차감(redeem)·호스트 제안 제출(F16-07)이 전부 `MILEAGE_NOT_ACTIVATED`로 막힌다. 즉 정책 활성화는 도메인 전체의 ON/OFF 스위치다.

판정: **조회/수정/미리보기는 사용 가능**. config preview가 `Map<String,Object>`(Flutter `dynamic`)로 내려와 typed 모델이 없고, preview의 GRADE_THRESHOLD 분포가 in-memory/대규모 클럽 분기를 가진다는 점이 Gap/Risk다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `MileageAdminPolicyController.java` | `@RequiresClubPermission(POLICY_OWNER)`, `GET/PUT /config`, `GET /config/preview` |
| Backend Service | `MileageProgramConfigService.java` | `getOrInitConfig`, `updateConfig`, `setActive`, `previewImpact`, `requireActive` |
| Backend VO/Param/Enum | `MileageProgramConfigVo.java`, `MileageProgramConfigModParam.java`, `constants/RankingBasis.java` | 응답 필드·부분 갱신·랭킹 기준 |
| Backend 기본값 | `MileageProgramConfigService` 상수 | `DEFAULT_EXPIRY_DAYS=365`, `DEFAULT_RANKING_BASIS=BALANCE`, preview 임계치 `BIG_BATCH_THRESHOLD=50`, `LARGE_CLUB_MEMBER_THRESHOLD=100000` |
| Frontend | `mileage_admin_policy_api.dart`, `mileage_admin_policy_repository.dart`, `mileage_admin_policy_providers.dart`, `presentation/mileage/admin/screens/mileage_policy_screen.dart`, `widgets/mileage_config_preview_dialog.dart`, `mileage_policy_row.dart` | route·preview dialog |
| DB | `V1__init.sql` `mileage_program_config` | club_id PK, active/expiry_days/ranking_basis/season_enabled |

## 3. 전체 동작 흐름

1. 운영진(POLICY_OWNER)이 정책 화면(`policy`)에 진입 → `getConfig(clubId)` → `GET /admin/clubs/{clubId}/mileage/config`.
2. 서버 `getOrInitConfig`가 config row를 조회, 없으면 기본값으로 생성해 `MileageProgramConfigVo` 반환.
3. 운영진이 active/expiryDays/rankingBasis/seasonEnabled를 수정하고 저장 → `updateConfig` → `PUT /config`(`MileageProgramConfigModParam`, 모든 필드 nullable 부분 갱신).
4. 서버 `updateConfig`는 actorRole(`isOwner ? OWNER : ADMIN`)을 결정하고 MapStruct로 부분 병합 후 저장, `MILEAGE_POLICY_UPDATED` audit + `PolicyChanged` outbox 발행.
5. 변경 전 영향을 보려면 `getConfigPreview` → `GET /config/preview?changeType=&value=`. changeType별로 다른 안내/추정을 `Map`으로 반환:
   - `EXPIRY_DAYS`: 신규 적립분에만 적용·소급 없음 안내(`NO_RETROACTIVE_APPLICATION`).
   - `TRIGGER_OFF`: 향후 자동 적립 중단 안내(`FUTURE_EARN_DISABLED`).
   - `GRADE_THRESHOLD`: 현재 등급 분포 추정(`qualifiedLifetimeEarned` 버킷). 멤버 ≥100,000이면 분포 생략(`LARGE_CLUB_DISTRIBUTION_SKIPPED`).
   - `BIG_BATCH_BULK`: 대상 인원 수(value) 안내. ≥50이면 `LARGE_BATCH_DETECTED`.
6. 다른 서비스가 적립/차감/제안 시 `requireActive(clubId)`를 호출 — config 없으면 `MILEAGE_PROGRAM_NOT_FOUND`, active=false면 `MILEAGE_NOT_ACTIVATED`.

## 4. 서버 계약

### `GET /api/v1/admin/clubs/{clubId}/mileage/config`
- 권한: `POLICY_OWNER`. 응답 `MileageProgramConfigVo`: `clubId`, `active`(boolean), `expiryDays`(int), `rankingBasis`(RankingBasis), `seasonEnabled`(boolean), `createdAt/updatedAt`.
- 없으면 기본값 생성 후 반환(active=false, expiryDays=365, rankingBasis=BALANCE, seasonEnabled=false).

### `PUT /api/v1/admin/clubs/{clubId}/mileage/config`
- Body `MileageProgramConfigModParam`: `active`(Boolean), `expiryDays`(Integer, ≥0), `rankingBasis`(RankingBasis), `seasonEnabled`(Boolean) — 모두 nullable 부분 갱신.
- side effect: `MILEAGE_POLICY_UPDATED` audit, `PolicyChanged` outbox.

### `GET /api/v1/admin/clubs/{clubId}/mileage/config/preview`
- Query `changeType`(EXPIRY_DAYS/TRIGGER_OFF/GRADE_THRESHOLD/BIG_BATCH_BULK), `value`(String). 둘 다 nullable.
- 응답 `Map<String,Object>`: `clubId/changeType/value/estimatedAffectedMembers/summary/warnings`, changeType별 추가 키(`currentExpiryDays`, `currentGradeDistribution`, `totalMembers`, `largeClub` 등).

### `requireActive` 게이트 (다른 기능에서 호출)
- config 없음 → `MILEAGE_PROGRAM_NOT_FOUND`(404). active=false → `MILEAGE_NOT_ACTIVATED`(400).

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `adminMileagePolicy`(`policy`) |
| Screen/Widget | `MileagePolicyScreen`, `MileageConfigPreviewDialog`, `MileagePolicyRow` |
| Repository/API | `MileageAdminPolicyRepository.getConfig / updateConfig / getConfigPreview` |
| Model | `MileageProgramConfigVo`, `MileageProgramConfigModParam`, `RankingBasis` enum |
| Preview 응답 | `getConfigPreview`는 `Future<dynamic>` → repository가 JSON map으로 파싱 |

Flutter `getConfigPreview`는 query 파라미터(`changeType`/`value`)를 API 시그니처에 노출하지 않음 — repository/dialog 호출 방식 확인 필요(현재 시그니처는 clubId만).

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| POLICY_OWNER + config 없음 | 기본값 생성 후 반환 | 기본값 폼 표시 | active=false로 시작 | 일치 |
| POLICY_OWNER + 활성화 저장 | active=true 저장 + audit/outbox | 토글 ON | 적립/차감 게이트 열림 | 일치 |
| 비 POLICY_OWNER | `@RequiresClubPermission` 차단 | 접근 불가 | 권한 부족 | 일치 |
| active=false 상태 적립 시도 (F16-06) | `requireActive` → MILEAGE_NOT_ACTIVATED | 액션 화면 에러 | 적립 차단 | 일치 |
| preview GRADE_THRESHOLD + 대규모 클럽 | 분포 생략·largeClub=true | 안내 표시 | 정확 분포 대신 경고 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `RankingBasis` | BALANCE/LIFETIME_EARNED/SEASON_EARNED | 동일 enum | 일치 |
| config 부분 갱신 | nullable 필드 병합 | `MileageProgramConfigModParam` nullable | 일치 |
| preview 응답 타입 | `Map<String,Object>` | `dynamic` → JSON map | 타입은 정합하나 typed 모델 없음(Gap) |
| active 게이트 | requireActive로 다른 기능 차단 | 액션 화면이 에러 수신 | 일치 |
| preview changeType 값 | EXPIRY_DAYS/TRIGGER_OFF/GRADE_THRESHOLD/BIG_BATCH_BULK | 문자열 상수 | 일치 (오타 시 UNKNOWN_CHANGE_TYPE) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | config preview가 typed 모델 없는 dynamic | 서버 `Map<String,Object>`, Flutter `getConfigPreview : Future<dynamic>` | 키 오타·구조 변경이 컴파일 타임에 안 잡힘. 클라이언트 파싱 취약 | preview 응답 전용 VO 정의 |
| P2 | GRADE_THRESHOLD 분포가 멤버 수 분기 | `countMembersByQualifiedThresholdBuckets` + 100,000명 이상 생략 | 대규모 클럽은 정확 분포 미제공, 운영자 판단 정보 부족 | 대규모 클럽 분포 추정 방식(샘플링 등) 결정 |
| P2 | preview query 파라미터 전달 경로 확인 필요 | Flutter `getConfigPreview` 시그니처에 changeType/value 미노출 | dialog가 어떻게 changeType을 전송하는지 불명확 — preview 미동작 가능 | repository/dialog 호출부에서 query 전달 여부 점검 |

## 9. 수용 기준

### AC-01. 정책 초기 조회
Given POLICY_OWNER가 정책 화면을 처음 연다. When config가 없다. Then 서버는 기본값(active=false/expiryDays=365/rankingBasis=BALANCE/seasonEnabled=false)으로 생성해 반환한다.

### AC-02. 활성화 저장
Given POLICY_OWNER가 active=true로 저장한다. When `PUT /config`가 성공한다. Then config.active=true가 되고 `MILEAGE_POLICY_UPDATED` audit가 남으며 이후 적립/차감이 허용된다.

### AC-03. 비활성 게이트
Given config.active=false다. When MILEAGE_MANAGER가 적립을 시도한다. Then 서버가 `MILEAGE_NOT_ACTIVATED`를 반환한다.

### AC-04. 만료일 변경 미리보기
Given POLICY_OWNER가 expiryDays 변경 영향을 본다. When `GET /config/preview?changeType=EXPIRY_DAYS&value=180`을 호출한다. Then summary에 "신규 적립분에만 적용·소급 없음", warnings에 `NO_RETROACTIVE_APPLICATION`이 포함된다.

### AC-05. 권한 차단
Given 비 POLICY_OWNER가 `PUT /config`를 호출한다. When 권한 검증이 실패한다. Then 권한 부족으로 차단된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | preview 응답 VO | config preview 전용 모델 정의 |
| 구현 | preview query 전달 | Flutter dialog의 changeType/value 전송 경로 점검 |
| 정책 | 대규모 클럽 분포 | 분포 추정 방식·임계치 결정 |
| 테스트 | 정책 게이트 | active 토글이 적립/차감/제안을 막는지 통합 검증 |
