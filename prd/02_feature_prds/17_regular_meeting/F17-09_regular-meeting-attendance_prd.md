# F17-09. 세션 출석 확정·노쇼 (Phase 4) PRD

## 1. 결론

FIXED 모임의 호스트가 매 세션 종료 후 ATTENDING 명단(materialize) 의 실제 출석 여부를 일괄 확정한다. 결과는 권위 테이블 `regular_meeting_session_attendance` (`(event_id, user_id)` UNIQUE) 에 영속된다. 결과는 4종: `ATTENDED, NO_SHOW, EXCUSED, SESSION_CANCELED`.

핵심 규칙:
- **finalize 시점**: 세션 `endTime ≤ now` 일 때만 (`endTime != null && endTime ≤ now`). 미종료 세션 finalize 시도 → `REGULAR_MEETING_SESSION_CANNOT_FINALIZE`.
- **재확정 차단**: 정션 `attendanceFinalizationStatus == FINALIZED` 이면 재호출 거부.
- **NO_SHOW 부작용**: EventAttendance demote(remove ATTENDING flag) + `member.recordNoShow(now)` — 누적/연속 노쇼 +1.
- **ATTENDED**: `member.recordAttended(now)` — attendedCount+1, consecutiveNoShow=0.
- **EXCUSED / SESSION_CANCELED**: `member.recordExcusedOrCanceled` — 노쇼 미가산. consecutive 리셋(EXCUSED 도 연속 끊음, 멤버 귀책 아님이라).
- **FORFEIT_ON_LIMIT**: NO_SHOW 가산 후 `reachesNoShowLimit(mode, limit)` 평가. 한도 도달 + `noShowPolicy == FORFEIT_ON_LIMIT` → `markForfeited` + FORFEIT 환불(F17-08).

finalize 는 단일 트랜잭션: 모임 잠금 → 정션 FINALIZED 재확정 차단 → endTime 가드 → ATTENDING roster 순회 → currentCapacity 재계산 → 정션 FINALIZED.

**close 가드 연동**: close (F17-04) 는 모든 정션의 attendanceFinalizationStatus 가 FINALIZED 여야 통과. 즉 finalize 가 close 전에 완료돼야 정산 시점이 옳다 → 정산 후 환불 위험 0.

**안전망 스케줄러**: `@Value("${regular-meeting.auto-finalize.enabled:false}")` 기본 OFF + endTime+24h grace + Redisson lock. 호스트가 무대응이면 자동 처리(opt-in).

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#finalizeSession` | `POST /events/{eventId}/finalize` |
| Backend Service | `RegularMeetingSessionAttendanceService#finalizeSession` | 단일 트랜잭션 로직 |
| Backend Entity | `RegularMeetingSessionAttendance` — `(event_id, user_id)` UK + member_id/result/manual_reason/finalized_by/finalized_at, FK CASCADE | 권위 테이블 |
| Backend Enum | `RegularMeetingSessionAttendanceResult` (ATTENDED/NO_SHOW/EXCUSED/SESSION_CANCELED) | 결과 종류 |
| Member 카운터 | `RegularMeetingMember#recordAttended,recordNoShow,recordExcusedOrCanceled,reachesNoShowLimit,markForfeited` | 도메인 메서드 |
| FORFEIT 환불 | `RegularMeetingRefundCalculator.calculate(reason=FORFEIT)` | 산식 (F17-08) |
| Scheduler | `RegularMeetingAttendanceFinalizeScheduler` (`auto-finalize.enabled` opt-in) | grace 24h |
| Param | `RegularMeetingSessionFinalizeParam` (per-attendee override) | optional roster |
| Policy | `RegularMeetingAttendancePolicy` | EventCheckIn 기준 ATTENDED 추정 |
| Flutter Screen | `regular_meeting_session_finalize_screen.dart` | 일괄 확정 + 노쇼정책 안내 |

## 3. 전체 동작 흐름

1. 호스트가 세션 상세 → "출석 확정" CTA → `RegularMeetingSessionFinalizeScreen`.
2. `POST /api/v1/regular-meetings/{id}/events/{eventId}/finalize` (Param optional).
3. 서버:
   - `findByIdForUpdate(meetingId)` + host 검증.
   - 정션 조회 → `attendanceFinalizationStatus == FINALIZED` 이면 거절(`REGULAR_MEETING_SESSION_CANNOT_FINALIZE`).
   - event 조회 → `endTime != null && endTime <= now` 강제.
   - ATTENDING roster 로드 (materialize 된 EventAttendance).
   - 각 attendee 에 대해:
     - 결과 결정: param 에 override 있으면 그 결과, 없으면 정책 (`RegularMeetingAttendancePolicy`) — 기본은 EventCheckIn 존재=ATTENDED, 없으면 NO_SHOW.
     - `regular_meeting_session_attendance` row 생성 (`event_id, user_id, member_id, result, finalized_by, finalized_at`).
     - 결과별 부작용:
       - ATTENDED: `member.recordAttended(now)`.
       - NO_SHOW: EventAttendance demote + `member.recordNoShow(now)`. 한도 + policy=FORFEIT_ON_LIMIT 면 `markForfeited` + FORFEIT 환불 trigger (F17-08).
       - EXCUSED / SESSION_CANCELED: `member.recordExcusedOrCanceled(now)`.
   - event.currentCapacity 재계산 (ATTENDING 카운트).
   - 정션 `attendanceFinalizationStatus = FINALIZED`.
4. 응답: 204 No Content.

## 4. 서버 계약

| 엔드포인트 | Method | Body | 응답 | 가드 |
|---|---|---|---|---|
| `/regular-meetings/{id}/events/{eventId}/finalize` | POST | `RegularMeetingSessionFinalizeParam?` (per-attendee override 옵션) | 204 | host + FIXED + endTime≤now + 정션 미확정 |

`RegularMeetingSessionFinalizeParam` (optional):
- `List<AttendeeOverride>`: `{ userId, result, manualReason }` — 특정 사용자만 override (미지정자는 정책 기본값 적용).

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.regularMeetingSessionFinalize(:id, :eventId)` |
| Screen | `RegularMeetingSessionFinalizeScreen` |
| 노쇼정책 안내 | 모임의 `noShowPolicy` (NONE/WARN/FORFEIT_ON_LIMIT) + `noShowLimit` + `noShowCountMode` 표시 |
| 일괄 확정 | 디폴트 — 체크인 기준 자동 판정 후 호스트 confirm |
| per-attendee override UI | 1차 미신설 (서버 roster list endpoint 부재로 보류) — F17-09 §10 후속 |
| Provider | `regularMeetingSessionsProvider(id)` + `regularMeetingDetailProvider(id)` invalidate (FINALIZED 표시 갱신) |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S9-1 | 정상 finalize (체크인 기준) | endTime≤now, ATTENDING roster 5명, 4명 EventCheckIn | session_attendance 5 row: 4 ATTENDED + 1 NO_SHOW. 4명 attendedCount+1, 1명 noShowCount+1+consecutiveNoShow+1 + demote |
| S9-2 | 미종료 세션 finalize 시도 | endTime>now | 400 `REGULAR_MEETING_SESSION_CANNOT_FINALIZE` |
| S9-3 | 재확정 시도 | 정션 FINALIZED | 400 `REGULAR_MEETING_SESSION_CANNOT_FINALIZE` |
| S9-4 | EXCUSED override | param 으로 1명 EXCUSED | 해당 member.consecutiveNoShow=0, noShowCount 미가산 |
| S9-5 | SESSION_CANCELED | param 으로 SESSION_CANCELED | 멤버 귀책 아님 — noShow 미가산, consecutive 리셋 |
| S9-6 | FORFEIT_ON_LIMIT 한도 도달 | mode=CONSECUTIVE, limit=3, member 연속 3노쇼 | member=FORFEITED + FORFEIT 환불 trigger (F17-08) |
| S9-7 | 호스트 미대응 + scheduler opt-in | auto-finalize.enabled=true, endTime+24h grace | scheduler 가 정책 기본값으로 일괄 finalize. Redisson lock 으로 중복 방지 |
| S9-8 | scheduler opt-out (기본) | enabled=false | 자동 finalize 안 됨. close 가드가 끝까지 finalize 요구 |
| S9-9 | finalize 후 close | 모든 정션 FINALIZED | close 통과 (F17-04 §3.2) |
| S9-10 | 비호스트 finalize 시도 | 다른 user | 403 `REGULAR_MEETING_FORBIDDEN` |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| endTime 가드 | `endTime != null && endTime ≤ now` (Codex BLOCKING 1 해소) | 미종료 NO_SHOW 조기 발생 차단 |
| scheduler 기본 OFF | `@Value("${regular-meeting.auto-finalize.enabled:false}")` (Codex BLOCKING 2 해소) | opt-in 강제 |
| EXCUSED/SESSION_CANCELED 연속 리셋 | `recordExcusedOrCanceled` (Codex BLOCKING 3 해소) | 멤버 귀책 아님이라 consecutive 끊음 |
| 권위 테이블 단일 진실 | `regular_meeting_session_attendance` UK | EventCheckIn 은 입력 신호일 뿐 |
| member_id FK CASCADE 안전 | member_id 는 generated col base 아님 → CASCADE OK | 사전존재 버그 1과 별도 |
| close 가드 통합 | F17-04 §3.2 가 모든 정션 FINALIZED 요구 | 정산 후 환불 위험 0 (§7 도메인) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 잔여 | §9 도메인 | finalize per-attendee override UI 부재 — 서버 roster list endpoint 필요 | endpoint 추가 후 UI 신설 |
| 위험 | scheduler grace 24h | 호스트 매우 늦게 finalize → 일찍 강제 종료될 수 있음 | enabled=false 가 기본이라 안전. 켜기 전 운영 검토 |
| 위험 | FORFEIT 환불 실패 | FailedRefund 큐로 가지만 멤버는 FORFEITED 영구 | F17-08 SLA 모니터링 |

## 9. 수용 기준

- **AC-01 (S9-1). 체크인 기반 정상 finalize**: Given endTime≤now, roster 5명, 4명 CheckIn. When `POST /finalize`. Then 5 row 영속 + 4 ATTENDED, 1 NO_SHOW + 1명 demote.
- **AC-02 (S9-2). endTime 가드**: Given endTime>now. Then 400.
- **AC-03 (S9-3). 재확정 차단**: Given 정션 FINALIZED. Then 400.
- **AC-04 (S9-5). SESSION_CANCELED**: Given param SESSION_CANCELED. Then noShow 미가산, consecutive 리셋.
- **AC-05 (S9-6). FORFEIT_ON_LIMIT**: Given mode=CONSECUTIVE limit=3, 연속 3노쇼. Then FORFEITED + FORFEIT 환불 발생.
- **AC-06 (S9-8). scheduler opt-out**: Given enabled=false. Then scheduler 가 finalize 안 함. close 는 finalize 요구.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| per-attendee override UI | roster list endpoint 부재 | endpoint 추가 후 finalize 화면 확장 |
| WARN 정책 액션 | 1차는 NONE/FORFEIT_ON_LIMIT 만 의미 — WARN 은 카운터만 영속, 알림 없음 | NotificationType + WARN 알림 |
| EXCUSED 환불 정책 | 1차는 사용자 cancel 산식과 동일 | 약관 검토 후 결정 |
