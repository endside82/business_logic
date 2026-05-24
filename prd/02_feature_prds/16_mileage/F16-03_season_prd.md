# F16-03. 시즌 (목록·과거 랭킹·내 스냅샷) PRD

## 1. 결론

시즌 조회는 멤버가 시즌 목록(`GET /mileage/seasons`, 상태 필터), 종료 시즌의 스냅샷 기반 랭킹(`GET /seasons/{seasonId}/ranking`), 본인 시즌 스냅샷(`GET /seasons/{seasonId}/me`, 없으면 204)을 보는 흐름이다. 서버 `MileageSeasonController`와 Flutter `mileage_seasons_screen.dart` / `mileage_season_ranking_screen.dart`가 연결되어 있다.

시즌 상태는 `SCHEDULED → ACTIVE → CLOSED`이고, 시즌 마감(운영진 `/close`, F16-05) 시 멤버별 시즌 합계가 `mileage_season_snapshot`에 기록되며 다음 SCHEDULED 시즌이 자동 ACTIVE로 전환된다.

**가장 큰 Gap은 과거 시즌 랭킹의 `basis` 파라미터다.** 컨트롤러 시그니처는 `MileageSeasonRankingSearchParam.basis : RankingBasis`(enum 값 `BALANCE`/`LIFETIME_EARNED`/`SEASON_EARNED`)인데, 컨트롤러 주석·Flutter API·QueryRepository 설명은 모두 `BY_EARNED`/`BY_BALANCE`를 가정한다. Spring이 query string `basis`를 `RankingBasis` enum으로 바인딩하므로 `BY_EARNED`/`BY_BALANCE`를 보내면 enum 변환에 실패해 400이 날 수 있다. 즉 **문서·클라이언트가 기대하는 basis 값이 실제 enum과 불일치**한다.

판정: **목록·내 스냅샷·기본 랭킹은 사용 가능, basis 지정 랭킹은 Gap**.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `MileageSeasonController.java` | `GET /seasons`(?status), `/seasons/{seasonId}/ranking`(ModelAttribute basis), `/seasons/{seasonId}/me`(204) |
| Backend Service | `MileageSeasonService.java` | `listSeasons(status)`, `getSeasonRanking(basis)`, `getMySeasonSnapshot`, `close`(스냅샷·자동 ACTIVE 전환), `recordMemberSnapshot` |
| Backend Query | `MileageSeasonSnapshotQueryRepository.java` | basis별 정렬: `BALANCE`→rankByBalance, 그 외→rankByEarned. nullsLast |
| Backend Param | `MileageSeasonRankingSearchParam.java` | `basis : RankingBasis`(주석은 BY_EARNED/BY_BALANCE) |
| Backend VO/Enum | `MileageSeasonVo.java`, `MileageSeasonSnapshotVo.java`, `constants/SeasonStatus.java`, `RankingBasis.java` | 응답 필드·enum 값 |
| Frontend | `mileage_season_api.dart`, `mileage_season_repository.dart`, `mileage_season_providers.dart`, `presentation/mileage/screens/mileage_seasons_screen.dart`, `mileage_season_ranking_screen.dart` | route·basis 전달·204 처리 |
| DB | `V1__init.sql` `mileage_season`, `mileage_season_snapshot` | rank_by_earned/rank_by_balance 컬럼 |

## 3. 전체 동작 흐름

1. 멤버가 시즌 목록 화면(`seasons`)에 진입 → `listSeasons(clubId, status?)` → `GET /mileage/seasons?status=`. status 미지정이면 전체(startAt desc), 지정 시 해당 상태만.
2. 멤버가 특정 시즌을 선택 → `getSeasonRanking(clubId, seasonId, basis?, page, size)` → `GET /seasons/{seasonId}/ranking`. 서버는 시즌 존재 검증(소속 클럽 포함) 후 `MileageSeasonSnapshotQueryRepository.searchByClubAndSeason`로 스냅샷 정렬.
3. basis가 `BALANCE`면 `rankByBalance asc nullsLast → seasonBalance desc`, 그 외(null 포함)면 `rankByEarned asc nullsLast → seasonEarned desc`로 정렬.
4. 본인 시즌 기록은 `getMySeasonSnapshot(clubId, seasonId, memberId)` → `GET /seasons/{seasonId}/me`. 스냅샷이 있으면 `MileageSeasonSnapshotVo`, 없으면 204 → Flutter는 null로 받아 빈 상태 표시.
5. 스냅샷 자체는 운영진 시즌 마감(`MileageSeasonService.close`, F16-05) 시 생성된다. `close`는 상태를 CLOSED로 바꾸고 `closedAt`을 찍은 뒤 다음 SCHEDULED(시작시각 도래) 시즌을 ACTIVE로 전환한다.

## 4. 서버 계약

### `GET /api/v1/clubs/{clubId}/mileage/seasons`
- 인증/권한: `requireClubMember`.
- Query: `status`(SeasonStatus, nullable). 응답 `List<MileageSeasonVo>`(id/clubId/name/startAt/endAt/status/createdAt/closedAt).

### `GET /api/v1/clubs/{clubId}/mileage/seasons/{seasonId}/ranking`
- Query: `MileageSeasonRankingSearchParam`(basis=RankingBasis nullable, page/size). 응답 `Page<MileageSeasonSnapshotVo>`.
- `MileageSeasonSnapshotVo`: `id/clubId/seasonId/memberId/seasonEarned/seasonBalance/rankByEarned(Integer)/rankByBalance(Integer)/createdAt`.
- 시즌 미존재(소속 클럽 불일치 포함) 시 `MILEAGE_SEASON_NOT_FOUND`.

### `GET /api/v1/clubs/{clubId}/mileage/seasons/{seasonId}/me`
- 응답 `MileageSeasonSnapshotVo` 또는 **204 No Content**(스냅샷 없음).

### 시즌 상태 머신 (운영 close는 F16-05)
- `SCHEDULED`(시작 전) / `ACTIVE`(진행) / `CLOSED`(마감, 스냅샷 확정).
- `close`: ACTIVE → CLOSED + `closedAt` + 다음 SCHEDULED(시작 도래) → ACTIVE.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `clubMileageSeasons`(`seasons`), `clubMileageSeasonRanking`(`:seasonId`) |
| Screen | `MileageSeasonsScreen`, `MileageSeasonRankingScreen` |
| Repository/API | `MileageSeasonRepository.listSeasons / getSeasonRanking / getMySeasonSnapshot` |
| Model | `MileageSeasonVo`, `MileageSeasonSnapshotVo`, `SeasonStatus` enum |
| 204 처리 | `getMySeasonSnapshot` 반환 타입 `MileageSeasonSnapshotVo?` (null 허용) |

Flutter `getSeasonRanking`은 `basis`를 `String?`으로 전달하며 API doc 주석은 `BY_EARNED(default)/BY_BALANCE`로 표기.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 멤버 + status 미지정 | 전체 시즌(startAt desc) | 전체 목록 | 모든 시즌 표시 | 일치 |
| 멤버 + status=CLOSED | 종료 시즌만 | 필터 적용 | 과거 시즌만 | 일치 |
| 멤버 + CLOSED 시즌 랭킹 (basis 미지정) | rankByEarned 정렬 | basis null | 적립 기준 랭킹 | 일치 |
| 멤버 + basis=BY_EARNED 전달 | enum 바인딩 실패 가능 | BY_EARNED 전송 | 400 또는 기본 정렬 | **불일치 (Gap)** |
| 멤버 + 본인 스냅샷 없음 | 204 | null 수신 | 빈 상태 | 일치 |
| 비멤버 | requireClubMember 차단 | 에러 | 접근 차단 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `SeasonStatus` | SCHEDULED/ACTIVE/CLOSED | 동일 enum | 일치 |
| basis 값 | `RankingBasis`(BALANCE/LIFETIME_EARNED/SEASON_EARNED) 바인딩 | doc/전달값 `BY_EARNED/BY_BALANCE` | **불일치** |
| basis null 동작 | rankByEarned 정렬(default) | basis 미전달 시 동일 | 일치 (미지정일 때만) |
| 내 스냅샷 없음 | 204 | `MileageSeasonSnapshotVo?` null | 일치 |
| 스냅샷 필드 | seasonEarned/seasonBalance/rankByEarned/rankByBalance | 동일 필드 | 일치 |
| 시즌 자동 전환 | close 시 다음 SCHEDULED→ACTIVE | 조회만 | 일치 (조회 기능 영향 없음) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 시즌 랭킹 `basis` 값 불일치 | 컨트롤러 param 타입은 `RankingBasis`(BALANCE/LIFETIME_EARNED/SEASON_EARNED)인데 주석/Flutter/QueryRepo는 `BY_EARNED/BY_BALANCE` 사용 | `BY_EARNED`/`BY_BALANCE` 전송 시 enum 변환 실패로 400 또는 무시. 잔액 기준 랭킹(BY_BALANCE)에 도달 불가 | 서버가 `BY_EARNED/BY_BALANCE`를 받는 별도 enum/param을 쓰거나, Flutter가 `BALANCE`를 보내도록 통일 |
| P2 | close 스냅샷 생성 범위 | `MileageSeasonService.close`는 상태만 바꾸고, 멤버별 `recordMemberSnapshot`은 "배치 처리는 호출자 책임"으로 남겨둠 | close만 호출하면 스냅샷이 비어 과거 랭킹이 빈 상태가 될 수 있음 | close 시 전체 멤버 스냅샷 일괄 생성 보장 경로 확인/추가 |
| P2 | rank 컬럼이 nullable | `rankByEarned/rankByBalance`가 Integer nullable, 정렬은 nullsLast | 순위 미산정 멤버가 목록 끝에 무순위로 노출 | 스냅샷 생성 시 rank 채움 보장 여부 결정 |

## 9. 수용 기준

### AC-01. 시즌 목록 필터
Given 멤버가 status=CLOSED로 시즌 목록을 연다. When `GET /seasons?status=CLOSED`를 호출한다. Then CLOSED 시즌만 반환된다.

### AC-02. 과거 시즌 랭킹 (기본)
Given 멤버가 basis 없이 CLOSED 시즌 랭킹을 연다. When `GET /seasons/{seasonId}/ranking`을 호출한다. Then rankByEarned 기준 정렬된 스냅샷 페이지가 반환된다.

### AC-03. 내 스냅샷 없음
Given 멤버가 해당 시즌에 스냅샷이 없다. When `GET /seasons/{seasonId}/me`를 호출한다. Then 204가 반환되고 Flutter는 null로 받아 빈 상태를 표시한다.

### AC-04. basis 지정 랭킹 (현재 미충족)
Given 멤버가 잔액 기준(BY_BALANCE) 랭킹을 요청한다. When 클라이언트가 `basis=BY_BALANCE`를 전송한다. Then 서버는 잔액 기준 정렬을 반환해야 한다. 현재 enum이 `BALANCE`만 받으므로 이 기준을 충족하지 못한다.

### AC-05. 존재하지 않는 시즌
Given 멤버가 다른 클럽의 seasonId로 랭킹을 요청한다. When 서버가 소속 클럽을 검증한다. Then `MILEAGE_SEASON_NOT_FOUND`가 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | basis 값 통일 | `BY_EARNED/BY_BALANCE` 전용 enum 도입 또는 `RankingBasis` 값으로 클라이언트 통일 |
| 구현 | close 스냅샷 일괄 생성 | close 시 전체 멤버 snapshot 생성 보장 경로 확정 |
| 테스트 | 시즌 조회 3종 | status 필터, basis 정렬, 204 빈 스냅샷, 클럽 격리 E2E 추가 |
