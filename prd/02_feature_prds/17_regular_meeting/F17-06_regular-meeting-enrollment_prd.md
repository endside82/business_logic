# F17-06. 고정형 등록·승인·대기열 (FIXED) PRD

## 1. 결론

FIXED 모임만의 멤버 8 상태 머신:

```
신청 → PENDING(승인제) | APPROVED_PENDING_PAYMENT(무승인+유료) | ENROLLED(무료)
PENDING → APPROVED_PENDING_PAYMENT | ENROLLED | REJECTED
APPROVED_PENDING_PAYMENT → ENROLLED(결제) | PAYMENT_EXPIRED(만료)
정원초과 → WAITING → ENROLLED(승격+결제)
ENROLLED → CANCELED(취소+환불) | FORFEITED(노쇼 한도, 무환불)
```

좌석 점유(occupiesSeat): `PENDING | APPROVED_PENDING_PAYMENT | ENROLLED`. terminal: `CANCELED | REJECTED | PAYMENT_EXPIRED | FORFEITED`.

호스트 5 액션: enroll(참가자) / cancelEnrollment(참가자) / approve(호스트) / reject(호스트) / 자동 승격(WAITING → APPROVED_PENDING_PAYMENT).

핵심 가드:
- 호스트 자신 enroll 금지 (`HOST_CANNOT_ENROLL`)
- FORFEITED 재신청 금지 (`ENROLLMENT_FORFEITED`)
- ENROLLED 동안 재신청 금지 (`ALREADY_ENROLLED`)
- 종료(CANCELED/REJECTED/PAYMENT_EXPIRED) 후 재신청은 동일 row 재사용 (UNIQUE `(meeting_id, user_id)`)
- CLOSED/CANCELED 모임에서는 자발 취소 금지 (`REGULAR_MEETING_INVALID_STATUS`) — 클로백 갭/중복 환불 방지

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#enroll,cancelEnrollment,members,myMembership,approveEnrollment,rejectEnrollment` | 6 endpoint |
| Backend Service | `RegularMeetingEnrollmentService#enroll,cancelEnrollment,approve,reject,getMembers,getMyMembership` | 좌석·대기열·승격 |
| Backend Entity | `RegularMeetingMember` | 카운터(`attended/noShow/consecutiveNoShow`) + `markEnrolled/markForfeited` |
| Backend Constants | `RegularMeetingMemberStatus#occupiesSeat,isTerminal` | 상태 정책 |
| Backend Param | `RegularMeetingEnrollParam(message)`, `EnrollmentDecisionParam(decisionMessage)` | 메시지 |
| Backend ErrorCode | `HOST_CANNOT_ENROLL`, `ENROLLMENT_FORFEITED`, `ALREADY_ENROLLED`, `ENROLLMENT_INVALID_STATUS`, `ENROLLMENT_DENIED` | 분기 코드 |
| Materialization 연동 | `RegularMeetingMaterializationService#syncMemberAdded,syncMemberRemoved` | ATTENDING catch-up + demote |
| Flutter Screen | `regular_meeting_enroll_screen.dart`, `regular_meeting_members_screen.dart` | 승인제·즉시 분기, 호스트 PENDING 승인/거절 |

## 3. 전체 동작 흐름

### 3.1 enroll (`POST /enroll`)
1. `lockFixedOpenMeeting(meetingId)` — FIXED + OPEN 만.
2. 호스트 자신 차단 (`HOST_CANNOT_ENROLL`).
3. 기존 member row 조회:
   - `FORFEITED` → 거절.
   - non-terminal → `ALREADY_ENROLLED`.
   - terminal (재신청) → row 재사용.
4. `activeSeats = count(status IN {PENDING, APPROVED_PENDING_PAYMENT, ENROLLED})`.
5. status 결정:
   - `meeting.approvalRequired=true` → PENDING (좌석 점유 시작)
   - approvalRequired=false + price>0 → APPROVED_PENDING_PAYMENT (좌석 예약, paymentDueAt=now+72h)
   - approvalRequired=false + price=0 → ENROLLED (즉시 확정)
   - activeSeats >= baseCapacity → WAITING (`waitlistOrder` 자동 할당)
6. ENROLLED 이면 `materializationService.syncMemberAdded` — 이미 ≤24h 머터리얼라이즈된 미래 세션에 ATTENDING catch-up.
7. 응답: `RegularMeetingMemberVo`.

### 3.2 cancelEnrollment (`DELETE /enroll`)
1. `findByIdForUpdate(meetingId)`.
2. `meeting.status ∈ {CLOSED, CANCELED}` → 거절 (`REGULAR_MEETING_INVALID_STATUS`).
3. member 조회 (terminal 이면 거절).
4. ENROLLED + price>0 → MEMBER_CANCEL pro-rata 환불 (F17-08).
5. status = CANCELED. 자리 비움 → 다음 WAITING 자동 승격 (`promoteWaitlist`):
   - 가장 작은 `waitlistOrder` 의 WAITING 1명 → APPROVED_PENDING_PAYMENT(유료) 또는 ENROLLED(무료).
   - 승격 직후 알림(후속) + Flutter 가 invalidate.
6. `materializationService.syncMemberRemoved` — 미래 세션 ATTENDING demote.

### 3.3 approve (`POST /members/{memberId}/approve`)
- 호스트만. PENDING 만.
- 결과: price>0 → APPROVED_PENDING_PAYMENT (paymentDueAt=now+72h) / price=0 → ENROLLED.
- 결정 메시지(`decisionMessage`) 저장.

### 3.4 reject (`POST /members/{memberId}/reject`)
- 호스트만. PENDING 만.
- 결과: REJECTED. 좌석 비움 → 다음 WAITING 승격.

### 3.5 getMembers (`GET /members`)
- 호스트만. 페이징.
- 정렬: status priority (ENROLLED → APPROVED_PENDING_PAYMENT → PENDING → WAITING → terminal) + enrolledAt ASC.

### 3.6 getMyMembership (`GET /members/me`)
- 인증 필수. 없으면 404 (silent for Flutter).

## 4. 서버 계약

| 엔드포인트 | Method | Body | 응답 | 가드 |
|---|---|---|---|---|
| `/enroll` | POST | `RegularMeetingEnrollParam(message?)` optional | 201 `RegularMeetingMemberVo` | FIXED + OPEN + 호스트 아님 |
| `/enroll` | DELETE | — | 200 `RegularMeetingMemberVo` (CANCELED) | non-terminal + 모임 ∉ {CLOSED, CANCELED} |
| `/members` | GET | `PagingParam` | `Page<RegularMeetingMemberVo>` | 호스트만 |
| `/members/me` | GET | — | `RegularMeetingMemberVo` or 404 | 인증 |
| `/members/{memberId}/approve` | POST | `EnrollmentDecisionParam(decisionMessage?)` | 200 `RegularMeetingMemberVo` | 호스트 + PENDING |
| `/members/{memberId}/reject` | POST | `EnrollmentDecisionParam(decisionMessage?)` | 200 `RegularMeetingMemberVo` | 호스트 + PENDING |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Routes | `regularMeetingEnroll`, `regularMeetingMembers` |
| Enroll Screen | `RegularMeetingEnrollScreen` — 승인제(message 입력) / 즉시 분기 |
| Host Members Screen | `RegularMeetingMembersScreen` — PENDING 승인/거절 + 결정 메시지 |
| Provider | `myRegularMeetingMembershipProvider(id)`, members page provider |
| 승격 UX | invalidate 후 사용자에게 자동 토스트("대기열에서 승격되었습니다") — 후속에서 푸시 통합 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S6-1 | 무승인 + 무료 enroll | approvalRequired=false, price=0, 정원 여유 | ENROLLED 즉시. ATTENDING catch-up |
| S6-2 | 무승인 + 유료 enroll | approvalRequired=false, price>0 | APPROVED_PENDING_PAYMENT + paymentDueAt=now+72h |
| S6-3 | 승인제 enroll | approvalRequired=true | PENDING. 호스트 알림 |
| S6-4 | PENDING → approve (유료) | 호스트 approve | APPROVED_PENDING_PAYMENT + paymentDueAt |
| S6-5 | PENDING → reject | 호스트 reject(decisionMessage) | REJECTED. 좌석 비움 → 다음 WAITING 승격 |
| S6-6 | 정원 초과 → WAITING | activeSeats=baseCapacity | WAITING + waitlistOrder |
| S6-7 | WAITING 자동 승격 | ENROLLED 1명 cancelEnrollment | 가장 작은 waitlistOrder WAITING → APPROVED_PENDING_PAYMENT or ENROLLED |
| S6-8 | ENROLLED 자가 취소 | OPEN 상태 | CANCELED + MEMBER_CANCEL pro-rata 환불 (F17-08) |
| S6-9 | CLOSED 모임 자가 취소 시도 | meeting CLOSED | 400 `REGULAR_MEETING_INVALID_STATUS` |
| S6-10 | 호스트 자신 enroll 시도 | hostUserId == userId | 400 `HOST_CANNOT_ENROLL` |
| S6-11 | FORFEITED 재신청 | 노쇼 한도 박탈 후 | 400 `ENROLLMENT_FORFEITED` (영구 차단) |
| S6-12 | CANCELED 후 재신청 | terminal → 동일 row 재사용 | 정상 enroll. row 의 status/message/reviewedBy 등 초기화 |
| S6-13 | PAYMENT_EXPIRED → 자동 좌석 해제 | paymentDueAt 만료 (F17-07 스케줄러) | PAYMENT_EXPIRED + 다음 WAITING 승격 |
| S6-14 | VARIABLE 모임에 enroll | meetingType=VARIABLE | 400 — `lockFixedOpenMeeting` 가 `REGULAR_MEETING_NOT_FIXED` |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| `(meeting_id, user_id)` UNIQUE | DDL | 한 user 가 한 모임에 동시에 두 row 불가 |
| terminal 후 재신청 row 재사용 | `enroll()` 분기에서 `member.status.isTerminal()` 후 reset | 잘 동작. UNIQUE 만족 |
| 좌석 카운트 일관성 | `countByRegularMeetingIdAndStatusIn(SEAT_STATUSES)` 기준 | enroll/cancel 모두 같은 술어 사용 |
| 승격 알고리즘 | `waitlistOrder ASC` 첫 번째 WAITING | FIFO |
| CLOSED 자가 취소 차단 | `cancelEnrollment` 의 status 분기 | 클로백 갭 / 중복 환불 방지 |
| materialize 동기화 | `syncMemberAdded/syncMemberRemoved` 양방향 호출 | ATTENDING catch-up + demote 양쪽 정상 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 잔여 | 도메인 §9 | RM 푸시 라우팅 미구현 → 승인/거절/승격/만료 알림 미발송 | NotificationType 정의 후 추가 |
| 위험 | WAITING 가시성 | 사용자가 WAITING 인 줄 모름 (앱이 알림 없으면 새로고침 의존) | invalidate 빈도 + 알림 통합 |
| 위험 | approve race | 호스트 두 명(공동호스트 미지원) 동시 approve 시 — 현재 단일 호스트만이라 안전 | 공동호스트 도입 시 락 필요 |

## 9. 수용 기준

- **AC-01 (S6-1). 무료 즉시 enroll**: Given approvalRequired=false, price=0, 정원여유. Then ENROLLED + ATTENDING catch-up.
- **AC-02 (S6-6). 정원 초과 WAITING**: Given activeSeats=baseCapacity. Then WAITING + waitlistOrder=N.
- **AC-03 (S6-7). 자동 승격**: Given ENROLLED 1명 취소. Then WAITING 중 가장 작은 order → APPROVED_PENDING_PAYMENT(유료) 또는 ENROLLED(무료).
- **AC-04 (S6-9). CLOSED 자가 취소 차단**: Given meeting CLOSED. When `DELETE /enroll`. Then 400 `REGULAR_MEETING_INVALID_STATUS`.
- **AC-05 (S6-10). 호스트 자신 차단**: Given hostUserId=userId. When enroll. Then 400 `HOST_CANNOT_ENROLL`.
- **AC-06 (S6-11). FORFEITED 영구 차단**: Given member FORFEITED. When enroll. Then 400 `ENROLLMENT_FORFEITED`.
- **AC-07 (S6-12). terminal 후 재신청**: Given member CANCELED. When enroll. Then row 재사용 + 새 status (PENDING/APPROVED_PENDING_PAYMENT/ENROLLED).

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| 호스트 일괄 approve | MVP 는 개별만 | 후속 슬라이스 |
| WAITING 가시 알림 | NotificationType 미정의 | 푸시 통합 |
| 공동호스트 권한 분리 | MVP 는 단일 호스트만 | 후속 |
