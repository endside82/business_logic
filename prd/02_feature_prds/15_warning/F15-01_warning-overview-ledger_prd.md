# F15-01. 내 경고 현황 & 원장 PRD

## 1. 결론

멤버 본인 경고 화면은 **점수 요약·검토 등급·활성 제재·최근 원장 5건**을 `GET /api/v1/clubs/{clubId}/warnings/me`(`WarningMemberOverviewVo`)로, **전체 원장 페이지**를 `GET .../me/ledger`(`Page<WarningLedgerVo>`)로 내려주며, Flutter `warning_main_screen.dart`/`warning_ledger_screen.dart`가 이를 그대로 소비한다. 두 엔드포인트 모두 `permissionChecker.requireClubMember`로 멤버만 접근하고, 원장 조회는 서버가 `param.setMemberId(principal.getUserId())`로 본인 범위를 강제한다. 응답 VO 필드와 Dart 모델 필드는 일치한다.

판정: **조회·권한·본인 범위 격리는 사용 가능**. 다만 (a) 정책이 비활성(`is_active=false`)인 클럽에서도 본인 화면 진입 시 `warning_member_summary` row가 0값으로 생성되고, (b) `effectiveScore`/`reviewLevel`은 캐시값이라 원장과 일시적으로 불일치할 수 있으며, (c) Flutter 원장 검색 파라미터가 서버 필터 컬럼과 어디까지 맞물리는지 PRD에서 확정 못 한 부분이 Gap이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `warning/controller/WarningMemberController.java` | `GET /me`, `GET /me/ledger`, `requireClubMember`, `param.setMemberId` |
| Backend Service | `warning/service/WarningQueryService.java#getMemberOverview`, `#searchLedger` | summary + 최근 5건 + 활성 제재 합성, ledger 페이징 |
| Backend Service | `warning/service/WarningMemberSummaryService.java#getOrInitialize`, `#doRecalculate` | row 없으면 0값 생성, effective/qualified/raw 산정 |
| Backend VO | `WarningMemberOverviewVo`, `WarningMemberSummaryVo`, `WarningLedgerVo`, `WarningSanctionVo` | 실제 응답 필드/타입/enum |
| Backend DDL | `V1__init.sql` `warning_member_summary`, `warning_ledger` | 컬럼/PK/인덱스 |
| Frontend API | `data/api/warning/warning_member_api.dart` | `getMyOverview`(VO), `getMyLedger`(PageResponse) |
| Frontend Provider | `domain/providers/warning/warning_member_providers.dart` | `warningMemberOverviewProvider`, `warningMyLedgerProvider` |
| Frontend Model | `data/models/warning/warning_member_overview_vo.dart`, `warning_member_summary_vo.dart`, `warning_ledger_vo.dart` | 필드 일치 |
| Frontend Screen | `presentation/warning/screens/warning_main_screen.dart`, `warning_ledger_screen.dart`, `widgets/warning_ledger_row.dart`, `warning_severity_chip.dart` | 진입/표시 |
| Verification | (해당 없음) | warning 도메인 전용 자동화 테스트 자산 미확인 — 검증 공백 |

## 3. 전체 동작 흐름

1. 멤버가 클럽 화면에서 `warnings`(Routes.clubWarnings) route로 진입해 `WarningMainScreen(clubId)`를 연다.
2. 화면은 `warningMemberOverviewProvider(clubId)`를 구독 → `WarningMemberRepository.getMyOverview` → `GET /api/v1/clubs/{clubId}/warnings/me`.
3. 서버 `WarningMemberController#getMyMain`은 `requireClubMember(clubId, userId)`로 멤버 검증 후 `WarningQueryService.getMemberOverview`를 호출한다.
4. 서비스는 `WarningMemberSummaryService.getOrInitialize`로 summary를 얻고(row 없으면 0값 INSERT), 원장 최근순 상위 5건과 활성 제재 목록(`listActiveByMember`)을 합성해 `WarningMemberOverviewVo`로 반환한다.
5. Flutter는 `summary.effectiveScore`/`reviewLevel`/`underReview`/`manualLock`로 상단 점수 카드와 등급 배지를, `activeSanctions`로 제재 안내를, `recentLedger`로 최근 항목 리스트를 렌더한다.
6. "전체 원장 보기" → `ledger`(Routes.clubWarningLedger) route → `WarningLedgerScreen` → `warningMyLedgerProvider(clubId, param)` → `GET .../me/ledger`.
7. 서버는 `param.setMemberId(principal.getUserId())`로 본인 범위를 덮어쓰고 `WarningQueryService.searchLedger`로 `Page<WarningLedgerVo>`를 반환한다. Flutter는 `PageResponse<WarningLedgerVo>`로 받아 페이지네이션한다.

## 4. 서버 계약

### `GET /api/v1/clubs/{clubId}/warnings/me`

| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningMemberController#getMyMain` |
| 인증/권한 | Bearer 필수, `permissionChecker.requireClubMember(clubId, userId)` |
| Path | `clubId: long` |
| 응답 | `WarningMemberOverviewVo` |
| Side effect | summary row 없으면 `getOrInitialize`가 0값 INSERT (`@Transactional`) |

`WarningMemberOverviewVo`: `summary: WarningMemberSummaryVo`, `recentLedger: List<WarningLedgerVo>`(최대 5), `activeSanctions: List<WarningSanctionVo>`.

`WarningMemberSummaryVo` 핵심: `clubId`, `memberId`, `effectiveScore:int`, `qualifiedScore:int`, `rawScore:int`, `effectiveCount:int`, `countBySeverity:String(JSON)`, `countByPenaltyType:String(JSON)`, `lastGrantAt:LocalDateTime?`, `underReview:boolean`(JSON key `underReview`), `reviewLevel:WarningReviewLevel`, `reviewTriggeredAt:LocalDateTime?`, `manualLock:boolean`(JSON key `manualLock`), `manualLockReason:String?`, `updatedAt`.

`WarningLedgerVo` 핵심: `id`, `clubId`, `memberId`, `ledgerType:WarningLedgerType`, `penaltyTypeCode:String?`, `points:int`, `targetGrantLedgerId:Long?`, `sourceType`, `sourceId`, `reasonCode`, `reason`, `actorId`, `batchId`, `reportId`, `eventId`, `createdAt`.

### `GET /api/v1/clubs/{clubId}/warnings/me/ledger`

| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningMemberController#getMyLedger` |
| 인증/권한 | Bearer 필수, `requireClubMember` |
| Query | `WarningLedgerSearchParam`(`@ModelAttribute`) extends PagingParam; 서버가 `memberId`를 본인으로 덮어씀 |
| 응답 | `Page<WarningLedgerVo>` |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `warnings` (`Routes.clubWarnings`), `ledger` (`Routes.clubWarningLedger`) — 클럽 하위 |
| Screen | `WarningMainScreen`, `WarningLedgerScreen` |
| Provider | `warningMemberOverviewProvider(clubId)`, `warningMyLedgerProvider(clubId, param)` |
| Repository | `WarningMemberRepository.getMyOverview`, `getMyLedger` |
| Retrofit | `WarningMemberApi.getMyOverview`(VO), `getMyLedger`(PageResponse) |
| Widget | `warning_ledger_row.dart`, `warning_severity_chip.dart` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 비멤버 | `requireClubMember` 실패 | route는 클럽 멤버 컨텍스트 진입 | 차단/에러 | 일치 |
| 멤버 + 경고 0 | summary row 0값 생성 | effectiveScore=0, reviewLevel=NONE | "경고 없음" 상태 | 일치 |
| 멤버 + ATTENTION~ | `reviewLevel != NONE` | 등급 배지 + 안내 | 등급별 안내 표시 | 일치 |
| 멤버 + 활성 제재 | `activeSanctions` 비어있지 않음 | 제재 안내 카드 | 진행 중 제재 표시 | 일치 |
| 멤버 + manual_lock | `manualLock=true` | 잠금 상태 표시 | 자동 해제 차단 안내 | 일치 |
| 정책 비활성 클럽 멤버 | `me`는 정책 활성 검사 없음 → 진입 가능 | 화면 진입됨 | 0점 화면 + summary row 생성 | Gap(아래) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `WarningLedgerType` | `GRANT/MITIGATE/REVERSE/EXPIRE` | `warning_enums.dart` 동일 | 일치 |
| `WarningReviewLevel` | 5값 | `warning_enums.dart` 동일 | 일치 |
| overview 응답 형태 | `WarningMemberOverviewVo`(단일) | `getMyOverview` → VO | 일치 |
| ledger 응답 형태 | `Page<WarningLedgerVo>` | `getMyLedger` → `PageResponse<WarningLedgerVo>` | 일치 |
| boolean key | Java `underReview`/`manualLock` (이미 is-prefix 없음) | Dart 동일 key | 일치 |
| `countBySeverity`/`countByPenaltyType` | String(JSON 문자열) | Dart String | 일치(클라이언트가 재파싱 필요) |
| effective 캐시 vs 원장 | summary는 캐시, 원장 변경 시 `recalculateForUpdate` | 화면은 캐시값 신뢰 | 대체로 일치(캐시 지연 Risk) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | 정책 비활성 클럽에서도 본인 화면 진입 시 summary row 생성 | `getMyMain`은 `requireActive`를 호출하지 않고, `getOrInitialize`가 row를 INSERT | 경고 제도를 켜지 않은 클럽에도 빈 경고 행이 양산됨(데이터 노이즈) | 정책 비활성 시 본인 화면을 "제도 미운영"으로 처리할지, row 생성을 lazy 유지할지 결정 |
| P2 | summary 캐시와 원장 일시 불일치 | summary는 `recalculateForUpdate`로 갱신되지만 화면은 캐시값을 신뢰 | 동시 조정 중 점수가 잠깐 어긋나 보일 수 있음 | 화면 새로고침 시 재조회로 수렴, 운영 안내 필요 |
| P3 | `WarningLedgerSearchParam` 필터 컬럼이 PRD에서 미확정 | 본 PRD에서 search param 필드 전수 확인 안 함 | 원장 필터 UX와 서버 쿼리 정합 미검증 | `WarningLedgerSearchParam`/`WarningLedgerQueryRepository` 대조 후 보강 |

## 9. 수용 기준

### AC-01. 경고 없는 멤버 메인
Given 경고 이력이 없는 멤버가 본인 경고 메인에 진입한다.
When `GET /warnings/me`가 성공한다.
Then `summary.effectiveScore=0`, `reviewLevel=NONE`, `recentLedger=[]`, `activeSanctions=[]`이고 Flutter는 "경고 없음" 상태를 표시한다.

### AC-02. 검토 등급 멤버 메인
Given 멤버의 `reviewLevel=RESTRICTION_CANDIDATE`이다.
When 메인 화면이 overview를 수신한다.
Then 등급 배지와 effectiveScore를 표시하고, 활성 제재가 있으면 제재 안내 카드를 표시한다.

### AC-03. 원장 페이지네이션
Given 멤버가 전체 원장 화면에 진입한다.
When `GET /warnings/me/ledger`가 `Page<WarningLedgerVo>`를 반환한다.
Then 서버는 `memberId`를 본인으로 강제하고, Flutter는 `ledgerType`/`points`/`createdAt`을 행으로 페이지네이션한다.

### AC-04. 타인 원장 접근 차단
Given 멤버가 본인이 아닌 memberId의 원장을 보려 한다.
When `me/ledger`는 query memberId를 무시하고 principal로 덮어쓴다.
Then 항상 본인 원장만 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 정책 | 비활성 클럽 본인 화면 | 제도 미운영 클럽의 멤버 화면 노출/row 생성 정책 결정 |
| 테스트 | 본인 화면 권한·범위 | `requireClubMember` 차단, ledger 본인 범위 강제 E2E 추가 |
| 구현 | 원장 필터 | `WarningLedgerSearchParam` 필터 컬럼과 화면 필터 정합 확인 |
