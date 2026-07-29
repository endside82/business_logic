# 17. 정기모임 PRD

<!-- generated: source-first-regular-meeting; updated: 2026-05-28; source: community_api/src/main/java/com/endside/community/regularmeeting + docs/plan/regular-meeting -->

> 문서 상태: **신규 도메인 신설본**. 본 PRD는 `community_api/docs/plan/regular-meeting/IMPLEMENTATION_REPORT_2026_05_28.md` 와 `community_api/src/main/java/com/endside/community/regularmeeting/` 실제 소스(엔티티 5종 · enum 9종 · 서비스 17종 · 컨트롤러 1종 · 엔드포인트 25개) 를 1차 자료로 작성한다. 계획 문서는 `docs/plan/regular-meeting/` 16개 분할본이 canonical.

## 1. 결론

호스트가 동일 멤버를 묶어 여러 회차를 운영하는 **신규 경량 도메인**. 클럽(상시 멤버십)과 EventRecurrence(일정 반복) 둘 다 부적합하다는 결론 후 별도 도메인 `regularmeeting` 으로 신설했다. 한 도메인 안에 두 가지 운영 형태가 있다:

- **FIXED(고정형)** — 호스트가 사전에 회차 수를 정하고 멤버를 **코스 단위로** 등록·결제·정산한다. 모든 세션에 동일 멤버 명단이 깔리고, 멤버 한 명이 코스 비용을 한 번에 결제하며, 정산도 코스 종료 시 한 번에 발생한다.
- **VARIABLE(변동형)** — 회차마다 독립된 이벤트로 동작한다. 인원·결제·정산이 **세션 단위로** 바인딩되며, 일반 이벤트 머신을 그대로 재사용한다.

타입이 **인원·정산의 바인딩 레벨을 전환**하는 것이 도메인의 핵심 설계 결정이다. 하위 세션은 모두 `event` 테이블(`eventType=REGULAR_MEETING(3)`) 위에 올라가며, 모임과 세션을 잇는 정션 `regular_meeting_event` 가 순번·교체본·확정 상태를 관리한다. 일반 호스트용 이양 경로는 없고, 관리자 internal API에만 결제·정산 귀속을 보존하는 break-glass 이양이 있다.

이 도메인은 기능 PRD 10개로 구성된다(F17-01 ~ F17-10). 백엔드 구현(Phase 1~5)·Flutter(Phase 6)·통합 검증(Phase 7)은 2026-05-28 단일 세션에 완료됐고, Codex 다단 sign-off(금전 영역 100%) 를 거쳤다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | 핵심 소스 | 상태 | Trace |
|---|---|---|---|---|---:|
| F17-01 | 정기모임 발견·탐색 | [F17-01_regular-meeting-discovery_prd.md](../02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md) | `RegularMeetingController#search,myMeetings`, `RegularMeetingQueryRepository` | 구현됨 | 3 |
| F17-02 | 정기모임 상세 조회 | [F17-02_regular-meeting-detail_prd.md](../02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md) | `#get`, `RegularMeetingService#getMeeting`, `RegularMeetingVo` | 구현됨 | 4 |
| F17-03 | 정기모임 생성 (호스트) | [F17-03_regular-meeting-creation_prd.md](../02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md) | `#create`, `RegularMeetingAddParam`, `truncateToHundred` 100원 floor | 구현됨 | 3 |
| F17-04 | 정기모임 생명주기 (publish/close/cancel/reopen) | [F17-04_regular-meeting-lifecycle_prd.md](../02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md) | `RegularMeetingStatus`, `#publish/close/cancel/reopen`, `findByIdForUpdate` | 구현됨 | 5 |
| F17-05 | 세션 관리 (add/generate/bulk/replace/cancel) | [F17-05_regular-meeting-sessions_prd.md](../02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md) | `#addSession,generateSessions,addSessionsBulk,replaceSession,cancelSession`, `RegularMeetingEventFactory` | 구현됨 | 6 |
| F17-06 | 고정형 등록·승인·대기열 (FIXED) | [F17-06_regular-meeting-enrollment_prd.md](../02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md) | `RegularMeetingEnrollmentService`, `RegularMeetingMemberStatus` | 구현됨 | 8 |
| F17-07 | 고정형 결제 (WALLET / BANK_TRANSFER) | [F17-07_regular-meeting-payment_prd.md](../02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md) | `RegularMeetingPaymentService`, `RegularMeetingPayment.isHostDirect`, `active_member_id` 생성컬럼 | 구현됨 | 6 |
| F17-08 | 환불 (pro-rata · 트리거별 · FAILED_REFUND) | [F17-08_regular-meeting-refund_prd.md](../02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md) | `RegularMeetingRefundCalculator`, `RegularMeetingRefundService`, `failed_refund.regular_meeting_id` | 구현됨 | 7 |
| F17-09 | 세션 출석 확정·노쇼 (Phase 4) | [F17-09_regular-meeting-attendance_prd.md](../02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md) | `RegularMeetingSessionAttendanceService`, `regular_meeting_session_attendance`, `RegularMeetingNoShowPolicy` | 구현됨 | 6 |
| F17-10 | 호스트 정산 (flow-through) | [F17-10_regular-meeting-settlement_prd.md](../02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md) | `RegularMeetingSettlementService`, `Settlement.regularMeetingId`, `reservedRefund` | 구현됨 | 8 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F17-10](../02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md) | 호스트 정산 (flow-through) | 머니 안전 핵심. close→afterCommit→REQUIRES_NEW 다층 방어, `uk_settlement_rm` 멱등, `reservedRefund` 게이트 |
| [F17-08](../02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md) | 환불 (pro-rata) | MEMBER_CANCEL=elapsed 차감, HOST_CANCEL=delivered 차감, FORFEIT 동일 산식. 100원 floor, 0 clamp |
| [F17-07](../02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md) | 결제 (WALLET/BANK) | `isHostDirect` 분기 + `active_member_id` 생성컬럼 + `uk_payment_active` UNIQUE 활성 1건 |
| [F17-09](../02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md) | 출석 확정·노쇼 | finalize 시점=close 전. FORFEIT_ON_LIMIT 즉시 환불, EXCUSED/SESSION_CANCELED 노쇼 미가산 |
| [F17-06](../02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md) | FIXED 등록·승인·대기열 | 8 상태(`PENDING→APPROVED_PENDING_PAYMENT→ENROLLED`/`WAITING`/...) + waitlist 승격 |

## 4. 도메인 책임 한도

본 도메인은 **VARIABLE 의 세션 인원/결제/정산 머신을 신설하지 않는다.** VARIABLE 세션은 `eventType=REGULAR_MEETING` 으로 일반 이벤트 머신을 그대로 재사용하며, RM 컨텍스트 5필드(`regularMeetingId`, `regularMeetingTitle`, `regularMeetingType`, `sequenceNo`, `directApplyBlocked`) 만 오버레이된다. FIXED 세션은 모임 본체가 정원·결제·정산을 잡고, 세션 자체는 ATTENDING materialize(체크인용)만 받는다 — 세션 단위 직접 신청/취소/체크인 mutation 은 가드로 차단(`directApplyBlocked=true`).

## 5. 핵심 데이터·인프라

### 5.1 신규 테이블 5종 (V1__init.sql 통합)

| 테이블 | 책임 | 핵심 제약 |
|---|---|---|
| `regular_meeting` | 모임 본체 (호스트·타입·코스·노쇼 정책·정산 후크) | `meeting_type ∈ {FIXED, VARIABLE}`, `status ∈ {DRAFT, OPEN, CLOSED, CANCELED}`, `price` 100원 floor |
| `regular_meeting_event` | 모임 ↔ 세션 정션 | `event_id` UNIQUE (이벤트당 최대 1모임), `(meeting_id, sequence_no)` 중복 허용(원본 취소+대체본) |
| `regular_meeting_member` | FIXED 등록 멤버 (8 상태) | `(meeting_id, user_id)` UNIQUE, 카운터 `attendedCount/noShowCount/consecutiveNoShowCount` 영속 |
| `regular_meeting_payment` | FIXED 결제 (WALLET·BANK_TRANSFER) | `active_member_id` STORED 생성컬럼 + `uk_payment_active` UNIQUE → 활성 1건 보장 |
| `regular_meeting_session_attendance` | 세션 출석 확정 권위 (Phase 4) | `(event_id, user_id)` UNIQUE, FK CASCADE (member_id 는 generated col base 아님 안전) |

### 5.2 Settlement / failed_refund 확장

- `Settlement.event_id` `long` → `Long` nullable
- `Settlement.regular_meeting_id` Long nullable 신규
- `Settlement.reserved_refund` BigDecimal 신규 (FORFEIT 환불 예약분)
- `uk_settlement_rm(regular_meeting_id)` UNIQUE — 코스당 정산 1건
- `CHECK ((event_id IS NULL) <> (regular_meeting_id IS NULL))`
- `failed_refund.event_id` nullable + `failed_refund.regular_meeting_id` 신규 (결정 K)

### 5.3 enum 9종

| Enum | 값 | 용도 |
|---|---|---|
| `RegularMeetingType` | FIXED, VARIABLE | 인원·정산 바인딩 레벨 분기 |
| `RegularMeetingStatus` | DRAFT, OPEN, CLOSED, CANCELED | 모임 본체 상태머신 |
| `RegularMeetingMemberStatus` | PENDING, APPROVED_PENDING_PAYMENT, ENROLLED, WAITING, PAYMENT_EXPIRED, CANCELED, REJECTED, FORFEITED | FIXED 등록 멤버 8 상태 |
| `RegularMeetingNoShowPolicy` | NONE, WARN, FORFEIT_ON_LIMIT | 노쇼 정책(기본 NONE) |
| `RegularMeetingNoShowCountMode` | CUMULATIVE, CONSECUTIVE | 한도 카운트 방식 |
| `RegularMeetingEventOrigin` | ORIGINAL, REPLACEMENT | 정션의 세션 출처 |
| `RegularMeetingMaterializationStatus` | PENDING, MATERIALIZED, FAILED | 세션 ATTENDING 자동 생성(≤24h) |
| `RegularMeetingFinalizationStatus` | PENDING, FINALIZED, NEEDS_REVIEW | 세션 출석 확정 |
| `RegularMeetingSessionAttendanceResult` | ATTENDED, NO_SHOW, EXCUSED, SESSION_CANCELED | Phase 4 권위 결과 |

### 5.4 ErrorCode 블록 2700001~

`REGULAR_MEETING_NOT_FOUND`, `REGULAR_MEETING_INVALID_STATUS`, `REGULAR_MEETING_FORBIDDEN`, `REGULAR_MEETING_NOT_FIXED`, `REGULAR_MEETING_MEMBER_NOT_FOUND`, `REGULAR_MEETING_ENROLLMENT_DENIED`, `REGULAR_MEETING_PAYMENT_NOT_FOUND`, `REGULAR_MEETING_PAYMENT_INVALID_STATUS`, `REGULAR_MEETING_SESSION_CANNOT_FINALIZE`, … (전체 목록은 `ErrorCode.java` 2700001~2700019 참조)

## 6. 도메인 외부 영향

| 도메인 | 영향 | 이유 |
|---|---|---|
| 03 이벤트 | **강함** | `EventType.REGULAR_MEETING(3)` 신규. `EventScope` 공용 거름망 2개(디스커버리 8표면 분류 + 신청 가드). VO 5필드 오버레이(`regularMeetingId/Title/Type, sequenceNo, directApplyBlocked`). |
| 05 검색 | **있음** | `EventScope#publiclyDiscoverable` 가 검색·트렌딩·홈·추천·관심인 8표면에서 RM 세션을 분류. RM 본체 검색은 `/api/v1/regular-meetings` 별도 엔드포인트. |
| 06 결제·지갑 | **강함** | WALLET 결제는 기존 `PointTransaction` (`referenceType="REGULAR_MEETING_PAYMENT"`) + 분개 재사용. BANK_TRANSFER 는 off-ledger (`isHostDirect=true`). |
| 07 모임 정산 | **강함** | `Settlement` 확장(event_id nullable + regular_meeting_id + reservedRefund). flow-through gross 산식: `retainedPaid` 만 호스트 수익으로, `retainedFree` 는 플랫폼 보조(payout 비대상). |
| 11 리뷰·신고 | 조건부 | FIXED 세션은 EventCheckIn 기반 ATTENDED 만 리뷰 자격. 리뷰는 매 세션마다 가능. |
| 12 알림 | 조건부 | 1차 출시는 RM 푸시 라우팅 미연동(NotificationType `REGULAR_MEETING_*` 미정의). 잔여 후속. |
| 13 프로필·설정 | **있음** | `AccountDeactivationService` 4건 가드(member 활성 결제 / 호스트 운영중 모임 / 호스트 환불 책임 / failed_refund). PAID 는 `meeting.status != CLOSED` 일 때만 차단. |
| 15 경고·징계 | 조건부 | FIXED 노쇼 `FORFEIT_ON_LIMIT` 한도 도달 → FORFEITED + pro-rata 환불(시작된 제공분 무환불). warning 도메인은 club-scoped + dead wiring 이라 재사용 불가 → RM v1 자체완결. |

## 7. 핵심 머니 안전 불변

> "정산 후 환불 위험 0" — 다층 방어. F17-10 §7 에 상세.

1. `close()` → `findByIdForUpdate` 잠금 (pay 와 직렬화)
2. close FIXED 가드: 미래 OPEN 세션 무 + `activeSessionCount == totalSessionCount` + 모든 정션 `attendanceFinalizationStatus == FINALIZED`
3. 정산 생성은 **afterCommit** REQUIRES_NEW (close 커밋 후 → orphan 차단)
4. `tryCreateSettlement` 에 CLOSED 가드 (scheduler 우회 방지)
5. `cancelEnrollment` CLOSED/CANCELED 거절
6. `cancel()` `findByIdForUpdate` 잠금 (close 정산 스냅샷과 cancel REQUIRES_NEW 환불 경합 차단)
7. `finalizeSession` `endTime ≤ now` 강제 (미종료 NO_SHOW 조기 발생 차단)
8. FORFEIT 환불은 finalize 시점(=close 전) 에만 발생 → settlement gross 의 retained paid 에 자연 반영

이중지급 차단:
- `uk_settlement_rm(regular_meeting_id)` UNIQUE — 코스당 1정산
- `SettlementService.doCreditAndRecord` 의 `existsByReferenceTypeAndReferenceId("SETTLEMENT", id)` 멱등
- `reservedRefund > 0` 게이트 (`completeSettlement` 내부, retry scheduler 우회 불가)

## 8. 진행 상태 (2026-05-28 기준)

| Phase | 범위 | 상태 | Codex |
|---|---|---|---|
| Pre-1 | Event 분류 정리(EventScope, 디스커버리 8표면) | 완료 | ✅ sign-off |
| Phase 1 | RM 코어 + VARIABLE happy path · 정션 · 통합 가드 | 완료 | ✅ sign-off |
| Phase 2 | 고정형 인원 + materialize + 출석 정책 | 완료 | ✅ sign-off |
| Phase 3a | RM 결제 (regular_meeting_payment, WALLET/BANK, 회계) | 완료 | ✅ sign-off |
| Phase 3b | 환불 pro-rata + failed_refund 확장 | 완료 | ✅ sign-off |
| Phase 3c | 호스트 정산 (Settlement 확장 · flow-through · close afterCommit) | 완료 | ✅ **금전 sign-off** |
| Phase 4 | 노쇼/출석 확정 + FORFEIT 환불 + close FINALIZED 가드 | 완료 | ✅ **금전 sign-off** |
| Phase 5 | 계정삭제 가드 (결정 L) | 완료 | ✅ sign-off |
| Phase 6 | Flutter 데이터 레이어 + 10 화면 + 라우터 + smoke test | 완료 | — UI 영역 |
| Phase 7 | 전체 회귀 검증 | 완료 | — 누적 sign-off |

## 9. 잔여 후속 (서버 확장 필요)

| 항목 | 차단 사유 |
|---|---|
| RM 푸시 라우팅 | 서버 `NotificationType` enum 에 `REGULAR_MEETING_*` 미정의 |
| payment confirm/reject/refund 호스트 화면 | 서버 결제 list 엔드포인트 부재 (푸시 deep-link 예정) |
| finalize per-attendee override UI | 서버 attendance roster list endpoint 필요 (MVP: 일괄 확정으로 충분) |
| bulk/replace 세션 호스트 UI | API 는 있으나 UX 우선순위 낮음 |
| EventCard 호출처 RM 뱃지 통합 | 위젯 준비됨, 호출처 13+ 개 점진 적용 |
| `retained ≤ 0` 종료 코스 failsafe 영구 재검사 | non-blocking 백로그 (settlement-skipped 마커) |

## 10. 관련 문서

- 구현 리포트: `community_api/docs/plan/regular-meeting/IMPLEMENTATION_REPORT_2026_05_28.md`
- 계획 마스터: `docs/plan/regular-meeting/README.md` (16 분할 + GLOSSARY · NEXT_SESSION)
- 결제 정책 횡단: `prd/03_policy_prds/payment_settlement_policy_prd.md`
- 상태 정책 횡단: `prd/03_policy_prds/state_policy_prd.md`

## 11. 접근권한 감사 교정 (2026-07-02)

접근권한 전수 감사(F17 정기모임)에서 확인된 동작 변경 사항을 반영한다. Codex 2R GO 완료·커밋·푸시.

### 미발행 정기모임 상세·세션 비호스트 접근 차단 (F17-3)

`GET /api/v1/regular-meetings/{id}` 및 `GET .../sessions`가 인증 사용자 누구에게나 DRAFT 상태 또는 발행 전 취소(status=CANCELED && publishedAt=null) 정기모임의 상세와 세션 목록을 노출하는 문제. 직접 링크(ID)를 알면 비호스트도 모임 주소·온라인 URL 등을 열람 가능했다. **수정**: 한 번도 발행되지 않은 정기모임(DRAFT, 또는 `publishedAt=null`인 CANCELED)은 호스트가 아닌 요청자에게 NOT_FOUND 응답. 한 번 공개됐던 CLOSED/CANCELED 상세는 계속 읽을 수 있다. 재현 테스트 추가.

이 원칙은 플랜 마켓(F08-03 getPlan 비공개 게이트)과 동일하다: 발행 전 콘텐츠는 작성자(호스트)만 열람 가능, 직접 링크로도 비호스트 접근 불가.

### 기타 접근권한 현황 (이슈 없음)

- 정기모임 멤버 명단(PII 표면): 서버가 호스트 전용으로 강제(기존 설계 정상)
- 결제: 등록 당사자만 조회·결제 가능(기존 서버 강제 확인)
- 승인/반려: 호스트만 처리 가능(기존 서버 강제 확인)

### 잔여 백로그 (비보안, 별도)

호스트 생애주기 UI 도달불가(F17-1 기능 갭)·관리 라우트 딥링크 press-then-error(F17-2)·`/regular-meetings/my` 라우트 크래시(F17-4)는 별도 기능 트랙으로 이연.

## 12. 2026-07-29 서버·Flutter 재실측 갱신

실측 기준은 `community_api` HEAD `be38d128b80d`, `community_app` HEAD `cb21bce8ef08`이다.

### 12.1 가격의 귀속 단위

| 계약 | FIXED | VARIABLE |
|---|---|---|
| 본체 가격 | 코스 전체 가격, 100원 미만 절삭 | 서버가 0 강제 |
| 세션 가격 | 요청값과 무관하게 0 강제 | 세션별 가격, null/0 무료, 양수는 100원 미만 절삭 |
| 신청·결제 | 정기모임 등록/결제 | 일반 이벤트처럼 세션별 신청/결제 |
| 유료 세션 환불 | 코스 정책 | 세션별 template, 누락 시 STANDARD |

VARIABLE 세션은 가격을 100원 단위로 절삭한 결과가 양수일 때 `EventPrepayment(required=true, type=CASH)`을 만들고 결제기한은 양수 요청값 또는 24시간 기본을 쓴다. 1~99원 요청은 0원이 되어 무료 처리된다. 단건·bulk·`generate(count 1..26)`·replace가 같은 가격/환불 helper를 공유한다.

### 12.2 썸네일 저장·표시

- 정기모임 생성/수정은 호스트 소유, `COMPLETED`, `EVENT_THUMBNAIL` purpose의 bare key만 저장한다.
- 만료 URL/외부 절대 URL은 저장값으로 채택하지 않는다.
- 목록·상세·세션 생성 응답은 bare key를 표시용 presigned URL로 바꾸고 미완료/유실 파일은 null 처리한다.
- 세션 Event는 정기모임 썸네일 키를 상속하지만 `RegularMeetingEventVo` 자체에는 썸네일 필드가 없다.
- Flutter 목록·상세는 응답 URL을 표시할 수 있으나 생성·수정 화면에는 썸네일 업로드 입력이 아직 없다.

### 12.3 Flutter authoring/운영 UX

2026-07-10~12 앱 변경으로 다음이 실제 화면에 반영됐다.

- FIXED/VARIABLE 선택 전에 등록·결제·환불·노쇼·정산 단위 차이를 안내한다.
- FIXED 생성/수정은 날짜, 총 회차, 환불 기준, 노쇼 정책, 승인/선결제를 입력하고 결과 카드를 보여 준다.
- `LocalDate`는 `yyyy-MM-dd`로 직렬화한다.
- 세션 추가는 VARIABLE의 정원·참가비·환불 template·결제기한을 받고, cadence와 1..26 횟수로 자동생성할 수 있다.
- 상세/목록은 타입별 신청 단위를 설명하고 유료 VARIABLE 세션 가격을 표시한다.

### 12.4 새로 확인된 계약 Gap

`features.js`의 전체 F17 Risk 후보 합계는 **43개**다. 이 재실측에서 직접 갱신한
F17-03은 4개, F17-05는 6개이며 아래 표의 10개 행과 일치한다.

| 우선순위 | 실제 소스 | 판단 |
|---|---|---|
| **P0** | 앱 category: `CLASS/STUDY/SPORTS/HOBBY/COOKING/OTHER`; 서버 `Category`: `BOARD_GAME/HIKING/COOKING/BOOK_CLUB/SPORTS/MUSIC/ART/LANGUAGE/TECH/SOCIAL/TRAVEL/PHOTOGRAPHY/FOOD/FITNESS/OTHER` | 기본값 `CLASS`부터 서버에 없어 생성이 역직렬화 단계에서 실패할 수 있다. 앱 옵션을 서버 enum 정본에 맞춰야 한다. |
| P1 | 서버/Dart param은 `thumbnailUrl`을 지원하지만 생성·수정 UI가 값을 보내지 않음 | 안전한 썸네일 계약은 있으나 authoring 도달 불가. |
| P1 | 서버 param은 주소·좌표·온라인 URL을 지원하지만 앱은 `locationType`만 선택 | 상세 장소가 비어 있는 초안이 만들어질 수 있다. |
| P1 | 앱은 FIXED 음수 가격을 막지만 서버 `validateAddParam/validateModParam`에는 `price < 0` 가드가 없음 | 직접 API 요청으로 음수 코스 가격이 저장될 수 있어 서버 검증이 필요하다. |
| P1 | VARIABLE 세션 1~99원은 100원 절삭 후 0원이 되지만 앱에 최소 유료 금액 안내가 없음 | 호스트가 유료 세션으로 오인할 수 있다. |
| P1 | bulk/replace API는 있으나 앱 호스트 UI 없음 | 자동생성은 배선됐지만 임의 bulk/대체 운영은 직접 호출만 가능. |
| P1 | 상세의 회차 카드가 읽기 전용이고 일반 이벤트 상세에 정기모임 회차 라벨이 없음 | `RegularMeetingDetailScreen` 카드에 `onTap`이 없고 `EventDetailScreen`이 `sequenceNo`/정기모임 컨텍스트를 렌더링하지 않는다. 회차별 운영·상세 진입이 끊겨 있다. |
| P1 | 세션끼리 시간 겹침 검사 없음 | 동일 시각 중복 회차 가능. |
| P1 | 모집 중 세션 추가 알림 발행·배선 없음 | 기존 참여자가 새 회차를 놓칠 수 있어 별도 알림 정책과 발행 경로가 필요하다. |
| P2 | Flutter replace 요청이 전용 모델 대신 `RegularMeetingSessionAddParam`을 재사용 | 현재 JSON 필드는 호환되지만 서버 ReplaceParam이 분기되면 compile-time 계약 보호가 약하다. |
