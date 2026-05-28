# F17-02. 정기모임 상세 조회 PRD

## 1. 결론

`GET /api/v1/regular-meetings/{id}` 단일 엔드포인트가 모임 본체 + 세션 요약(`sessions`) + 조회자 컨텍스트(`host` boolean, `myMembership` Phase 2 후 별도 endpoint) 를 한 번에 내려준다. optional auth 라 비로그인도 진입 가능. DRAFT 는 호스트 본인만 조회 가능(기타는 `REGULAR_MEETING_NOT_FOUND`). 세션 목록은 별도 `GET /api/v1/regular-meetings/{id}/events?includeHistory={bool}` 로 조회한다 (취소된 세션 포함 옵션).

Flutter `RegularMeetingDetailScreen` 은 status (DRAFT/OPEN/CLOSED/CANCELED) 와 viewer (host/member/guest) 분기로 하단 CTA 를 결정한다. 호스트는 "멤버 관리", "세션 출석 확정", "정산 보기" 진입, 멤버는 "취소", "결제" (APPROVED_PENDING_PAYMENT), 게스트는 "참가 신청" CTA.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#get,sessions,myMembership` | `GET /api/v1/regular-meetings/{id}`, `/events`, `/members/me` |
| Backend Service | `RegularMeetingService#getMeeting,getSessions` | DRAFT 가드, 세션 정렬, 활성/취소 분리 |
| Backend VO | `RegularMeetingVo`, `RegularMeetingEventVo`, `RegularMeetingMemberVo` | 필드 매트릭스 |
| Backend ErrorCode | `ErrorCode.REGULAR_MEETING_NOT_FOUND(2700001)` | DRAFT 마스킹 |
| Flutter API | `regular_meeting_api.dart` | Retrofit getDetail/getSessions/getMyMembership |
| Flutter Provider | `regular_meeting_detail_provider.dart`, `regular_meeting_sessions_provider.dart`, `my_regular_meeting_membership_provider.dart` | `@Riverpod` 3종 |
| Flutter Screen | `regular_meeting_detail_screen.dart` | 헤더·세션·status별 CTA 분기 |
| Flutter VO | `regular_meeting_vo.dart` | `isHost` → `@JsonKey(name: 'host')`, `directApplyBlocked` 그대로 |

## 3. 전체 동작 흐름

1. 진입: `/regular-meetings/:id` → `RegularMeetingDetailScreen(id)`.
2. `regularMeetingDetailProvider(id)` → `GET /api/v1/regular-meetings/{id}` (optional auth — `currentUserId` 가 있으면 `isHost` 판정).
3. DRAFT 차단: `meeting.status == DRAFT && currentUserId != hostUserId` → `REGULAR_MEETING_NOT_FOUND` (404).
4. 통과 후 호스트 닉네임 일괄 조회, `sessions` 요약(상위 N개) 주입, `enrolledCount` 카운트 (FIXED 만 의미).
5. Flutter 가 status × viewer 매트릭스로 하단 CTA 분기:
   - `host` + DRAFT → "발행하기" (POST publish, F17-04)
   - `host` + OPEN → "멤버 관리" / "세션 추가" / "출석 확정"
   - `host` + CLOSED → "정산 보기" (F17-10)
   - 게스트 + OPEN → "참가 신청" (FIXED 만, F17-06)
   - 멤버 + ENROLLED → "취소"
   - 멤버 + APPROVED_PENDING_PAYMENT → "결제하기" (F17-07)
6. 세션 카드 탭 → `event_id` 로 일반 이벤트 상세(F03-02) 이동. 단 RM 컨텍스트 5필드(`regularMeetingId/Title/Type, sequenceNo, directApplyBlocked`)가 EventVo 에 오버레이됨.

## 4. 서버 계약

### `GET /api/v1/regular-meetings/{id}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#get` |
| 인증 | optional. `@AuthenticationPrincipal(errorOnInvalidType = false)` |
| Path | `id: long` |
| 응답 | `RegularMeetingVo` (sessions 포함) |
| DRAFT 접근 | 호스트만. 그 외 `REGULAR_MEETING_NOT_FOUND` |

`RegularMeetingVo` 핵심 필드: `id, hostUserId, hostNickname, title, category, meetingType, status, thumbnailUrl, locationType, regionSummary, startDate, endDate, totalSessionCount, upcomingSessionCount, price, baseCapacity, enrolledCount, description, address, addressDetail, latitude, longitude, onlineUrl, prepaymentRequired, refundPolicy, refundDeadlineHours, approvalRequired, isHost(JSON: "host"), sessions: List<RegularMeetingEventVo>, noShowPolicy, noShowLimit, noShowCountMode, publishedAt, closedAt, canceledAt, createdAt`.

### `GET /api/v1/regular-meetings/{id}/events?includeHistory={bool}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#sessions` |
| Query | `includeHistory: bool, default false` (true 면 CANCELED 세션 포함) |
| 응답 | `List<RegularMeetingEventVo>` — `eventId, sequenceNo, origin, replacedEventId, active, materializationStatus, attendanceFinalizationStatus, title, startTime, endTime, status, locationType, address, onlineUrl, baseCapacity, currentCapacity` |
| 정렬 | `sequenceNo ASC` (replacement 는 원본 옆에) |

### `GET /api/v1/regular-meetings/{id}/members/me`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#myMembership` |
| 인증 | 필수 |
| 응답 | `RegularMeetingMemberVo` 또는 404 (멤버 없음) |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.regularMeetingDetail = /regular-meetings/:id` |
| Screen | `RegularMeetingDetailScreen` |
| Detail Provider | `regularMeetingDetailProvider(id)` |
| Sessions Provider | `regularMeetingSessionsProvider(id, includeHistory)` |
| Membership Provider | `myRegularMeetingMembershipProvider(id)` |
| CTA 위젯 | `RegularMeetingActionBar` (status × viewer 분기) |
| RM 컨텍스트 표기 | `DirectApplyBlockedNotice` — `directApplyBlocked=true` 일 때 "이 모임은 일반 신청이 막혀 있습니다" 안내 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S2-1 | 게스트 OPEN 조회 | 비로그인, status=OPEN | `RegularMeetingVo` 응답. `host=false`. CTA="참가 신청"(FIXED) 또는 세션별 "신청"(VARIABLE) |
| S2-2 | 호스트 DRAFT 조회 | 로그인, hostUserId == userId, status=DRAFT | 200. `host=true`. CTA="발행하기" |
| S2-3 | 비호스트 DRAFT 접근 | DRAFT 모임에 다른 user 접근 | 404 `REGULAR_MEETING_NOT_FOUND` |
| S2-4 | 멤버 ENROLLED 조회 | 로그인, member status=ENROLLED | 200. CTA="취소" (deadline 내) |
| S2-5 | 멤버 APPROVED_PENDING_PAYMENT 조회 | 승인 후 결제 전 | CTA="결제하기" — F17-07 진입 |
| S2-6 | 세션 히스토리 조회 | `includeHistory=true` | CANCELED + REPLACEMENT 까지 포함된 전체 정션 |
| S2-7 | CLOSED 모임 호스트 | CLOSED 상태 | CTA="정산 보기" — F17-10 진입. 정산 미생성 시 204 |
| S2-8 | CANCELED 모임 | 모임 취소 후 | 본문 회색 + "취소된 모임" 라벨. 멤버는 환불 안내 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| DRAFT 마스킹 | `RegularMeetingService#getMeeting` 의 `status==DRAFT && currentUserId!=hostUserId` 분기 | `REGULAR_MEETING_NOT_FOUND` 일관 |
| `isHost` JSON key | 서버 VO `isHost` → Jackson 이 `is` prefix 제거 → JSON `host` | Flutter `@JsonKey(name: 'host')` 명시 적용됨 |
| `sessions` 페이로드 | 상세 응답에 상위 N개 요약. 전체 세션은 `/events` 별도 호출 | 응답 크기 균형 |
| RM 컨텍스트 오버레이 | EventVo 5필드(`regularMeetingId/Title/Type, sequenceNo, directApplyBlocked`) | Flutter 가 EventDetailScreen 에서도 표기 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후속 | 구현 리포트 §9 | 호스트 결제 list 화면 부재 — 상세에서 "결제 대기 멤버 N" 카운트만 노출 | 서버 list endpoint + 푸시 deep-link 정의 후 신설 |
| 후속 | 구현 리포트 §9 | 세션별 attendance roster 응답 미존재 → 상세에서 finalize per-attendee override 불가. MVP 는 일괄 확정 (F17-09) | roster list endpoint 추가 |
| 위험 | viewer membership | `/members/me` 404 응답 — Flutter 가 null 분기 처리. 일반 사용자가 호출하면 정상적 404 | 토스트로 노출 금지 (silent) |

## 9. 수용 기준

- **AC-01 (S2-1). 게스트 조회**: Given 비로그인. When `GET /{id}`. Then 200 + `host=false`.
- **AC-02 (S2-3). DRAFT 마스킹**: Given DRAFT + 비호스트. When 조회. Then 404 `REGULAR_MEETING_NOT_FOUND`.
- **AC-03 (S2-5). 결제 대기 멤버 CTA**: Given `myMembership.status=APPROVED_PENDING_PAYMENT`. When 상세 진입. Then "결제하기" CTA + paymentDueAt 카운트다운.
- **AC-04 (S2-6). 히스토리**: Given `includeHistory=true`. Then CANCELED 세션 포함. `active=false` 플래그 노출.
- **AC-05 (S2-7). CLOSED 호스트**: Given CLOSED + host. Then "정산 보기" CTA. 미생성 정산은 204 → "준비중" 라벨.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| viewer status 통합 응답 | 1차는 `/members/me` 별도 호출 | 후속에 `RegularMeetingVo` 안에 `myMembershipStatus` 인라인 |
| 세션 카드 풀 정보 | 상세 응답 sessions 는 요약 — 자세한 정원/체크인은 일반 이벤트 상세에서 | 분리 유지 |
