# 17. 정기모임 PRD

<!-- generated: source-first-regular-meeting; updated: 2026-05-28; source: community_api/src/main/java/com/endside/community/regularmeeting + docs/plan/regular-meeting -->

> 문서 상태: **신규 도메인 신설본**. 본 PRD는 `community_api/docs/plan/regular-meeting/IMPLEMENTATION_REPORT_2026_05_28.md` 와 `community_api/src/main/java/com/endside/community/regularmeeting/` 실제 소스(엔티티 5종 · enum 9종 · 서비스 17종 · 컨트롤러 1종 · 엔드포인트 25개) 를 1차 자료로 작성한다. 계획 문서는 `docs/plan/regular-meeting/` 16개 분할본이 canonical.

## 1. 결론

호스트가 동일 멤버를 묶어 여러 회차를 운영하는 **신규 경량 도메인**. 클럽(상시 멤버십)과 EventRecurrence(일정 반복) 둘 다 부적합하다는 결론 후 별도 도메인 `regularmeeting` 으로 신설했다. 한 도메인 안에 두 가지 운영 형태가 있다:

- **FIXED(고정형)** — 호스트가 사전에 회차 수를 정하고 멤버를 **코스 단위로** 등록·결제·정산한다. 모든 세션에 동일 멤버 명단이 깔리고, 멤버 한 명이 코스 비용을 한 번에 결제하며, 정산도 코스 종료 시 한 번에 발생한다.
- **VARIABLE(변동형)** — 회차마다 독립된 이벤트로 동작한다. 인원·결제·정산이 **세션 단위로** 바인딩되며, 일반 이벤트 머신을 그대로 재사용한다.

타입이 **인원·정산의 바인딩 레벨을 전환**하는 것이 도메인의 핵심 설계 결정이다. 하위 세션은 모두 `event` 테이블(`eventType=REGULAR_MEETING(3)`) 위에 올라가며, 모임과 세션을 잇는 정션 `regular_meeting_event` 가 순번·교체본·확정 상태를 관리한다. 호스트는 교체 불가.

이 도메인은 기능 PRD 10개로 구성된다(F17-01 ~ F17-10). 백엔드 구현(Phase 1~5)·Flutter(Phase 6)·통합 검증(Phase 7)은 2026-05-28 단일 세션에 완료됐고, Codex 다단 sign-off(금전 영역 100%) 를 거쳤다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | 핵심 소스 | 상태 | Trace |
|---|---|---|---|---|---:|
| F17-01 | 정기모임 발견·탐색 | [F17-01_regular-meeting-discovery_prd.md](../02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md) | `RegularMeetingController#search,myMeetings`, `RegularMeetingQueryRepository` | 구현됨 | 3 |
| F17-02 | 정기모임 상세 조회 | [F17-02_regular-meeting-detail_prd.md](../02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md) | `#get`, `RegularMeetingService#getMeeting`, `RegularMeetingVo` | 구현됨 | 4 |
| F17-03 | 정기모임 생성 (호스트) | [F17-03_regular-meeting-creation_prd.md](../02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md) | `#create`, `RegularMeetingAddParam`, `truncateToHundred` 100원 floor | 구현됨 | 3 |
| F17-04 | 정기모임 생명주기 (publish/close/cancel/reopen) | [F17-04_regular-meeting-lifecycle_prd.md](../02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md) | `RegularMeetingStatus`, `#publish/close/cancel/reopen`, `findByIdForUpdate` | 구현됨 | 5 |
| F17-05 | 세션 관리 (add/bulk/replace/cancel) | [F17-05_regular-meeting-sessions_prd.md](../02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md) | `#addSession,addSessionsBulk,replaceSession,cancelSession`, `RegularMeetingEventFactory` | 구현됨 | 6 |
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
