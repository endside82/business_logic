# F16-01. 내 마일리지 메인 & 월간 영수증 & 원장 PRD

## 1. 결론

멤버 본인의 마일리지 조회 3종(메인/월간 영수증/원장)은 서버와 Flutter가 맞물려 구현되어 있다. `GET /api/v1/clubs/{clubId}/mileage/me`가 현재 잔액·누적 적립·등급(현재/다음)·활성 배지·최근 5건 원장을 `MemberMileageMainVo`로 내려주고, Flutter `mileage_main_screen.dart`가 이를 잔액 카드·등급 카드·배지·최근 원장 행으로 표시한다. 월간 영수증과 원장 페이지도 동일하게 연결되어 있다.

모든 포인트/잔액 필드는 서버에서 `int`다(BigDecimal 아님). 진입은 클럽 멤버만 가능하며 서버 `ClubMemberPermissionChecker.requireClubMember`가 비멤버를 차단한다.

판정: **조회/권한/표시는 사용 가능**. 다만 메인 화면의 최근 원장 5건과 일부 집계가 서버에서 `ledgerRepository.findAll()` 후 in-memory 필터로 계산되어 대규모 클럽에서 성능 Risk가 있고, 원장 검색 `keyword`가 멤버 API에서 인덱스 없이 동작한다는 점이 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `mileage/controller/MileageMemberController.java` | `GET /me`, `GET /me/receipts/{year}/{month}`, `GET /me/ledger` 엔드포인트·인증·반환타입 |
| Backend Service | `mileage/service/MileageQueryService.java` | `buildMemberMain`, `buildMonthlyReceipt`, `searchLedger` 합성 로직 |
| Backend Service | `mileage/service/MileageLedgerService.java` | 원장 row 구조, EARN/REDEEM/REVERSE/EXPIRE 의미 |
| Backend Query | `mileage/repository/query/MileageMonthlyReceiptQueryRepository.java`(인터페이스 호출), `MileageLedgerQueryRepository` | 영수증 집계·원장 페이징 |
| Backend VO/Enum | `MemberMileageMainVo.java`, `MileageMonthlyReceiptVo.java`, `MileageLedgerVo.java`, `constants/LedgerType.java` | 응답 필드·타입, ledger type |
| Backend Param | `param/MileageLedgerSearchParam.java` | `type/from/to/keyword/memberId` 필터 |
| Frontend API/Repo | `data/api/mileage/mileage_member_api.dart`, `data/repositories/mileage/mileage_member_repository.dart` | Retrofit endpoint·`Result<T>` |
| Frontend Model | `data/models/mileage/member_mileage_main_vo.dart`, `mileage_monthly_receipt_vo.dart`, `mileage_ledger_vo.dart`, `mileage_enums.dart` | 클라이언트 필드·enum |
| Frontend Provider/Screen | `domain/providers/mileage/mileage_member_providers.dart`, `presentation/mileage/screens/mileage_main_screen.dart`, `mileage_ledger_screen.dart`, `mileage_monthly_receipt_screen.dart` | route 진입·상태 분기 |
| DB | `db/migration/V1__init.sql` `mileage_ledger`, `mileage_member_summary` | 컬럼·UNIQUE·인덱스 |

## 3. 전체 동작 흐름

1. 멤버가 클럽 내에서 `mileage` route(`Routes.clubMileage`)로 진입한다.
2. `MileageMainScreen`이 `mileage_member_providers`의 메인 provider를 구독 → `MileageMemberRepository.getMyMileage(clubId)` → `MileageMemberApi.getMyMileage` → `GET /api/v1/clubs/{clubId}/mileage/me`.
3. 서버 `MileageMemberController#getMyMileage`가 `requireClubMember(clubId, userId)`로 멤버 검증 후 `MileageQueryService.buildMemberMain(clubId, userId)` 호출.
4. `buildMemberMain`은 `mileage_member_summary`에서 요약을 조회(없으면 0 build), 등급 정의에서 현재/다음 등급을 계산, 활성 배지(`badgeService.listActiveAwards`), 최근 원장 5건(`ledgerRepository.findAll()` in-memory 필터·정렬·limit)을 합성해 `MemberMileageMainVo`로 반환.
5. Flutter가 `currentBalance`, `currentGrade`, `nextGrade.deltaToReach`, `badges`, `recentLedger`를 잔액/등급/배지/최근 원장 위젯으로 표시한다.
6. 멤버가 "전체 원장"으로 이동하면 `mileage_ledger_screen.dart`가 `getMyLedger`(`GET /me/ledger`)를 `MileageLedgerSearchParam`(type/from/to/keyword/page/size)로 호출. 서버는 `searchParam.setMemberId(userId)`로 본인 ID를 강제 주입한다.
7. 월간 영수증 진입(`receipts/:year/:month`)은 `getMyMonthlyReceipt(clubId, year, month)` → `GET /me/receipts/{year}/{month}` → `buildMonthlyReceipt`가 해당 월 원장 합계·시작/종료 잔액·sourceType별 EARN 합·부여 배지·시작/종료 등급명을 합성.

## 4. 서버 계약

### `GET /api/v1/clubs/{clubId}/mileage/me`

| 항목 | 실제 계약 |
|---|---|
| Controller | `MileageMemberController#getMyMileage` |
| 인증/권한 | `@AuthenticationPrincipal` + `requireClubMember(clubId, userId)` |
| 응답 | `MemberMileageMainVo` |
| 실패 | 비멤버 시 클럽 권한 예외 |

`MemberMileageMainVo` 필드: `currentBalance`(int), `lifetimeEarnedRaw`(int), `qualifiedLifetimeEarned`(int), `currentSeasonEarned`(int), `currentSeasonBalance`(int), `currentGrade`(CurrentGradeVo: id/name/colorToken/iconKey/threshold), `nextGrade`(NextGradeVo: id/name/threshold/deltaToReach), `badges`(List\<MileageBadgeAwardVo\>), `recentLedger`(List\<MileageLedgerVo\>).

### `GET /api/v1/clubs/{clubId}/mileage/me/receipts/{year}/{month}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `MileageMemberController#getMyMonthlyReceipt` |
| Path | `year:int`, `month:int` (month 1~12, 범위 밖이면 `INVALID_INPUT`) |
| 응답 | `MileageMonthlyReceiptVo` |

`MileageMonthlyReceiptVo` 필드: `earnedTotal/redeemedTotal/expiredTotal/reversedTotal`(절대값 기준 합), `netDelta`(=earned−redeemed−expired, REVERSE 제외), `startBalance/endBalance`, `byType`(Map\<String,Integer\> = sourceType별 EARN 합), `badgesAwarded`, `gradeStart/gradeEnd`(등급명 추정), `ledgerRowCount`.

### `GET /api/v1/clubs/{clubId}/mileage/me/ledger`

| 항목 | 실제 계약 |
|---|---|
| Controller | `MileageMemberController#getMyLedger` |
| Query | `MileageLedgerSearchParam`(type=LedgerType, from/to=LocalDateTime, keyword, page, size). `memberId`는 서버가 principal로 강제 |
| 응답 | `Page<MileageLedgerVo>` (Spring Page → Flutter `PageResponse`) |

`MileageLedgerVo` 필드: `id`, `clubId`, `memberId`, `ledgerType`(EARN/REDEEM/REVERSE/EXPIRE), `amount`(부호 포함 int), `sourceType`, `sourceId`, `reversesLedgerId`, `reason`, `presetId`, `actorId`, `batchId`, `seasonId`, `earnedAt`, `expiresAt`, `createdAt`, `consumptions`(운영진 응답에만 포함 — 멤버 응답은 보통 null).

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.clubMileage`(`mileage`), `clubMileageLedger`(`ledger`), `clubMileageMonthlyReceipt`(`receipts/:year/:month`) |
| Screen | `MileageMainScreen`, `MileageLedgerScreen`, `MileageMonthlyReceiptScreen` |
| Provider | `mileage_member_providers.dart` |
| Repository | `MileageMemberRepository.getMyMileage / getMyLedger / getMyMonthlyReceipt` |
| Retrofit | `MileageMemberApi.getMyMileage / getMyLedger / getMyMonthlyReceipt` |
| Model | `MemberMileageMainVo`, `MileageMonthlyReceiptVo`, `MileageLedgerVo`, `LedgerType` enum |

Flutter `getMyLedger`는 `type` 등 쿼리를 `String?`으로 직접 전달하고 `memberId`는 보내지 않는다(서버가 principal로 강제 주입하므로 정합).

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 클럽 멤버 + 적립 이력 있음 | summary row 존재 | 잔액/등급/최근 원장 표시 | 잔액·등급·다음 등급 진행도 노출 | 일치 |
| 클럽 멤버 + 적립 이력 없음 | summary 없으면 0으로 build | 0 잔액, 등급 null | 빈 상태(등급 미부여) | 일치 |
| 비멤버 | `requireClubMember` 차단 | API 에러 → 에러 상태 | 접근 차단 | 일치 |
| 월 범위 밖 요청 | `INVALID_INPUT`(month<1 또는 >12) | 에러 표시 | 잘못된 월 차단 | 일치 |
| 원장 type 필터 | `LedgerType` enum 바인딩 | `type` String 전달 | 적립/차감/정정/만료별 필터 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 포인트 타입 | 모든 잔액/적립 필드 `int` | Dart `int` | 일치 (double 금지) |
| `LedgerType` | EARN/REDEEM/REVERSE/EXPIRE | 동일 enum | 일치 |
| 원장 반환 타입 | Spring `Page<MileageLedgerVo>` | `PageResponse<MileageLedgerVo>` | 일치 |
| `byType` 타입 | `Map<String,Integer>` | Dart Map\<String,int\> | 일치 (sourceType 문자열 키) |
| `recentLedger` 정렬 근거 | `createdAt` desc, limit 5 (in-memory) | 서버 순서 그대로 표시 | 일치하나 in-memory 집계 Risk |
| `consumptions` | 멤버 응답엔 미포함 | 모델에 필드 존재(null 허용) | 일치 (멤버 화면 미사용) |
| 멤버 ledger memberId | 서버가 principal로 강제 | Flutter 미전달 | 일치 (안전) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 메인 최근 원장이 `ledgerRepository.findAll()` in-memory 필터 | `MileageQueryService.buildMemberMain`이 전체 ledger 로드 후 club/member 필터·정렬·limit 5 | 대규모 클럽에서 메인 조회 지연·메모리 부담 | 멤버별 최근 N건 전용 query(인덱스 `idx_mileage_ledger_member` 활용)로 이관 |
| P2 | 원장 `keyword` 검색 범위 불명확 | `MileageLedgerSearchParam.keyword`는 사유/메모 키워드 주석이나 인덱스 없음 | 키워드 검색 시 풀스캔 가능 | 검색 대상 컬럼·인덱싱 정책 결정 |
| P2 | 월간 영수증 등급명이 "추정" | `gradeStart/gradeEnd`는 `qualifiedLifetimeEarned` 누적으로 등급명을 역산 | 등급 정의가 바뀐 과거 월은 현재 정의 기준으로 표시될 수 있음 | 과거 등급 스냅샷 필요 여부 결정(현재는 현 등급 정의로 역산) |

## 9. 수용 기준

### AC-01. 메인 조회

Given 클럽 멤버가 `mileage` 메인에 진입한다.
When `GET /me`가 `currentBalance`, `currentGrade`, `nextGrade.deltaToReach`를 반환한다.
Then Flutter는 잔액 카드, 현재 등급 카드, 다음 등급까지 남은 점수, 활성 배지, 최근 원장 5건을 표시한다.

### AC-02. 비멤버 차단

Given 비멤버가 같은 clubId의 `GET /me`를 호출한다.
When 서버 `requireClubMember`가 실패한다.
Then 클럽 권한 예외가 반환되고 화면은 접근 차단 상태를 보인다.

### AC-03. 원장 필터

Given 멤버가 원장 화면에서 type=REDEEM 필터를 적용한다.
When `GET /me/ledger?type=REDEEM`을 호출한다.
Then 본인의 REDEEM(차감, 음수 amount) 원장만 페이지로 반환된다.

### AC-04. 월간 영수증

Given 멤버가 특정 연/월 영수증을 연다.
When `GET /me/receipts/{year}/{month}`가 성공한다.
Then `earnedTotal/redeemedTotal/expiredTotal`, `netDelta`, `startBalance/endBalance`, sourceType별 EARN 합(`byType`), 해당 월 부여 배지가 표시된다.

### AC-05. 잘못된 월

Given 멤버가 month=13으로 영수증을 요청한다.
When 서버가 month 범위를 검증한다.
Then `INVALID_INPUT`이 반환되고 화면은 에러 상태를 표시한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 성능 | 메인 최근 원장/대시보드 집계 in-memory | 전용 QueryDSL 조회로 이관 (대규모 클럽 대비) |
| 정책 | 과거 월 등급 표시 | 등급 정의 변경 이력 반영 여부 결정 |
| 테스트 | 멤버 조회 3종 권한·필터 | 비멤버 차단, type 필터, 월 범위 검증 E2E 추가 |
