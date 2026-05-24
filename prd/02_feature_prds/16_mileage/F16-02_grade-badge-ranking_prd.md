# F16-02. 등급·배지·랭킹·프로필 카드 PRD

## 1. 결론

등급/배지/랭킹/프로필 카드 조회는 서버와 Flutter가 맞물려 구현되어 있다. 멤버는 클럽 등급 정의(`GET /grades`), 본인 등급 변경 이력(`GET /me/grade-history`), 활성 배지 정의(`GET /badges`, active=true만), 클럽 랭킹(`GET /ranking`), 다른 멤버 프로필 카드(`GET /members/{memberId}/profile-card`)를 본다.

등급은 별도 grade_history 테이블이 없고, **`mileage_audit_log`의 `MILEAGE_MEMBER_GRADE_CHANGED` 행을 파싱해 `MileageGradeChangeVo`로 합성**한다. 랭킹 기준(`RankingBasis`)은 `BALANCE`/`LIFETIME_EARNED`/`SEASON_EARNED`이며, 미지정 시 클럽 정책의 `rankingBasis`를 사용한다. 프로필 카드의 누적/시즌 적립 노출 여부도 정책의 rankingBasis에 따라 마스킹된다.

판정: **조회/표시는 사용 가능**. 등급 이력이 audit log JSON 파싱에 의존하고, 프로필 카드 점수 노출이 정책에 따라 null이 되는 점이 Gap/Risk다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `MileageMemberController.java` | `GET /grades`, `/badges`, `/ranking`, `/members/{memberId}/profile-card`, `/me/grade-history` |
| Backend Service | `MileageGradeService.java` | 등급 정의·`resolveGradeForQualified`(threshold ≤ qualified) |
| Backend Service | `MileageBadgeService.java` | `listDefinitions`, `listActiveAwards` |
| Backend Service | `MileageMemberSummaryService.java` | `recalcGrade` → `MILEAGE_MEMBER_GRADE_CHANGED` audit 기록, `GradeChangeDirection` 결정 |
| Backend Service | `MileageQueryService.java` | `buildProfileCard`, `searchRanking`, `findGradeChanges` |
| Backend Query | `MileageAuditLogQueryRepository.findGradeChangesByMember`(호출), `MileageRankingQueryRepository.searchRanking`(호출) | 등급 이력 파싱·랭킹 정렬 |
| Backend VO/Enum | `MileageGradeVo.java`, `MileageGradeChangeVo.java`, `MileageRankingEntryVo.java`, `MemberProfileCardVo.java`, `MileageBadgeDefinitionVo.java`, `MileageBadgeAwardVo.java`, `constants/RankingBasis.java`, `GradeChangeDirection.java` | 응답 필드·enum |
| Frontend | `mileage_member_api.dart`, `mileage_member_repository.dart`, `mileage_member_providers.dart`, `presentation/mileage/screens/mileage_grade_list_screen.dart`, `mileage_badge_list_screen.dart`, `mileage_ranking_screen.dart`, `mileage_grade_history_screen.dart` | route·상태·CTA |
| DB | `V1__init.sql` `mileage_grade`, `mileage_badge_definition`, `mileage_badge_award`, `mileage_member_summary`, `mileage_audit_log` | 컬럼·인덱스 |

## 3. 전체 동작 흐름

1. 멤버가 등급/배지/랭킹 화면에 진입하면 각 provider가 대응 repository → API를 호출한다.
2. `GET /grades` → `MileageGradeService.listGrades`(threshold 오름차순) → `List<MileageGradeVo>`.
3. `GET /badges` → `MileageBadgeService.listDefinitions` 후 컨트롤러가 `active=true`만 필터해 반환.
4. `GET /me/grade-history?limit=` → `MileageQueryService.findGradeChanges` → `MileageAuditLogQueryRepository.findGradeChangesByMember`가 `MILEAGE_MEMBER_GRADE_CHANGED` audit 행의 before/after JSON에서 등급 정보·`direction`을 추출해 `MileageGradeChangeVo` 리스트로 반환(시간 역순, limit은 repository가 1~200 클램프).
5. `GET /ranking?basis=&page=` → `searchRanking`이 basis null이면 정책 `rankingBasis`(없으면 `BALANCE`)로 결정 후 `MileageRankingQueryRepository.searchRanking` → `Page<MileageRankingEntryVo>`.
6. `GET /members/{memberId}/profile-card` → `buildProfileCard`가 대상 멤버의 현재 등급·활성 배지와, 정책 rankingBasis에 따라 `currentSeasonEarned`(SEASON_EARNED일 때만) 또는 `qualifiedLifetimeEarned`(LIFETIME_EARNED일 때만) 중 하나를 공개. 둘 다 아니면 둘 다 null.
7. 등급 산정 자체는 적립/차감/정정 시점에 `MileageMemberSummaryService.recalcGrade`가 수행하고, 등급이 실제 변경되면 audit 행을 남긴다(이 기능은 그 결과를 읽기만 함).

## 4. 서버 계약

### `GET /api/v1/clubs/{clubId}/mileage/grades`
- `List<MileageGradeVo>`(id/clubId/name/threshold/colorToken/iconKey/displayOrder/createdAt/updatedAt). threshold 오름차순.

### `GET /api/v1/clubs/{clubId}/mileage/badges`
- `List<MileageBadgeDefinitionVo>`(id/name/description/iconKey/colorToken/active...). 컨트롤러가 `isActive()`만 필터.

### `GET /api/v1/clubs/{clubId}/mileage/me/grade-history`
- Query `limit`(default 50). 응답 `List<MileageGradeChangeVo>`.
- `MileageGradeChangeVo`: `auditLogId`, `gradeId`(null이면 등급 박탈), `gradeName`, `colorToken`, `iconKey`, `threshold`, `changedAt`, `previousGradeId`(null이면 INITIAL), `previousGradeName`, `direction`(INITIAL/UP/DOWN).

### `GET /api/v1/clubs/{clubId}/mileage/ranking`
- Query `MileageRankingSearchParam`(basis=RankingBasis nullable, seasonId nullable, page/size). 응답 `Page<MileageRankingEntryVo>`.
- `MileageRankingEntryVo`: `rank`, `memberId`, `nickname`, `profileImageUrl`, `score`(basis에 따라 의미 다름), `currentBalance`, `gradeName/gradeColorToken/gradeIconKey`.

### `GET /api/v1/clubs/{clubId}/mileage/members/{memberId}/profile-card`
- 응답 `MemberProfileCardVo`: `memberId`, `nickname`, `profileImageUrl`, `currentGrade`(CurrentGradeVo), `badges`, `currentSeasonEarned`(Integer nullable), `qualifiedLifetimeEarned`(Integer nullable).
- 점수 노출 규칙: rankingBasis==SEASON_EARNED → currentSeasonEarned만, ==LIFETIME_EARNED → qualifiedLifetimeEarned만, 그 외(BALANCE) → 둘 다 null.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `clubMileageGrades`(`grades`), `clubMileageBadges`(`badges`), `clubMileageRanking`(`ranking`), `clubMileageGradeHistory`(`me/grade-history`) |
| Screen | `MileageGradeListScreen`, `MileageBadgeListScreen`, `MileageRankingScreen`, `MileageGradeHistoryScreen` |
| Repository/API | `MileageMemberRepository.getGrades / getBadgeDefinitions / getRanking / getMemberProfileCard / getMyGradeHistory` |
| Model | `MileageGradeVo`, `MileageBadgeDefinitionVo`, `MileageRankingEntryVo`, `MemberProfileCardVo`, `MileageGradeChangeVo`, `RankingBasis`/`GradeChangeDirection` enum |

Flutter `getRanking`은 `basis`를 `String?`으로 전달(미지정 가능). `RankingBasis` enum 값(BALANCE/LIFETIME_EARNED/SEASON_EARNED)이 서버와 1:1 일치.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 멤버 + basis 미지정 | 정책 rankingBasis 사용 (없으면 BALANCE) | basis null 전달 | 정책 기준 랭킹 표시 | 일치 |
| 멤버 + 등급 변경 이력 있음 | audit `MILEAGE_MEMBER_GRADE_CHANGED` 파싱 | timeline 표시 | 승급/강등/최초 도달 timeline | 일치 |
| 멤버 + 등급 이력 없음 | 파싱 결과 빈 리스트 | 빈 상태 | "등급 변경 이력 없음" | 일치 |
| 프로필 카드 (정책 BALANCE) | season/lifetime 모두 null | 점수 미표시 | 등급·배지만 노출 | 일치 |
| 프로필 카드 (정책 SEASON_EARNED) | currentSeasonEarned만 공개 | 시즌 적립 표시 | 시즌 점수 노출 | 일치 |
| 배지 정의 (비활성) | 컨트롤러가 active만 필터 | 노출 안 됨 | 활성 배지만 보임 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `RankingBasis` | BALANCE/LIFETIME_EARNED/SEASON_EARNED | 동일 enum | 일치 |
| `GradeChangeDirection` | INITIAL/UP/DOWN | 동일 enum | 일치 |
| 등급 이력 출처 | audit_log JSON 파싱 (전용 테이블 없음) | timeline 표시 | 일치하나 파싱 의존 Risk |
| 프로필 점수 노출 | 정책 따라 nullable | nullable 모델 | 일치 |
| 배지 active 필터 | 멤버 `GET /badges`만 active 필터, 운영 `GET /badges`는 전체 | 멤버 화면은 활성만 | 일치 |
| 랭킹 `score` 의미 | basis별 의미 다름 (주석상) | 단일 score 필드 | 일치하나 라벨 표기 책임은 화면 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 등급 이력이 audit log JSON 파싱에 의존 | `findGradeChangesByMember`가 `MILEAGE_MEMBER_GRADE_CHANGED` before/after JSON에서 등급/방향 추출 | audit log 포맷·`actionType` 변경 시 등급 이력 깨짐. 누락 시 timeline 공백 | 전용 grade_change 뷰/테이블 또는 파싱 계약 고정 |
| P2 | 등급 강등이 사용자에게 노출됨 | REVERSE/EXPIRE로 `qualifiedLifetimeEarned` 감소 시 `direction=DOWN` 기록 | 멤버가 등급 하락 이력을 직접 보게 됨(운영 정정이 멤버에게 노출) | 멤버 노출 정책 결정(강등 사유 표시 여부) |
| P2 | 프로필 카드 점수 노출이 정책 단일 값에 묶임 | rankingBasis가 BALANCE면 두 점수 모두 null | 잔액 기준 클럽은 프로필에 점수가 전혀 안 보임 | 프로필 공개 항목을 정책과 분리할지 결정 |

## 9. 수용 기준

### AC-01. 등급 목록
Given 멤버가 등급 목록을 연다. When `GET /grades`가 성공한다. Then threshold 오름차순으로 등급(name/threshold/color/icon)이 표시된다.

### AC-02. 활성 배지만 노출
Given 운영진이 일부 배지 정의를 비활성화했다. When 멤버가 `GET /badges`를 호출한다. Then `active=true`인 배지 정의만 반환된다.

### AC-03. 등급 이력 timeline
Given 멤버가 적립으로 등급이 변경된 적이 있다. When `GET /me/grade-history`를 호출한다. Then `direction`(INITIAL/UP/DOWN), 변경 후 등급명, `changedAt`이 시간 역순으로 표시된다.

### AC-04. 정책 기준 랭킹
Given 클럽 정책 rankingBasis=SEASON_EARNED이고 멤버가 basis 미지정으로 랭킹을 연다. When `GET /ranking`을 호출한다. Then 시즌 적립 기준 랭킹이 rank·score·등급 정보와 함께 반환된다.

### AC-05. 프로필 카드 마스킹
Given 정책 rankingBasis=BALANCE이다. When 멤버가 다른 멤버 프로필 카드를 연다. Then `currentSeasonEarned`와 `qualifiedLifetimeEarned`는 모두 null이고 등급·배지만 노출된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 등급 이력 출처 | audit 파싱 의존 제거(전용 뷰) 검토 |
| 정책 | 강등 이력 멤버 노출 | DOWN 이력 표시·사유 노출 정책 결정 |
| 정책 | 프로필 점수 공개 범위 | rankingBasis와 분리 여부 결정 |
| 테스트 | 랭킹/프로필/이력 | basis별 랭킹, 마스킹, direction 파싱 E2E 추가 |
