# F17-02. 정기모임 상세 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.


> 2026-07-29 현재 소스 갱신: 재사용 경험 루프 보강으로 정기모임 상세는 단일 모임 본체 조회뿐 아니라 이전 회차 결과·다음 회차/세션으로 이어지는 진입점과 함께 봐야 한다. 특히 유료 VARIABLE 세션, 세션별 선결제, 클럽 recurrence, host cost type, 비공개 clone 안전장치는 F17 결제/정산 PRD 및 F03 이벤트 반복 문서와 함께 확인한다. 신규 기능 ID는 만들지 않고 기존 F17 상세·세션·결제 흐름에 흡수한다.

## 소개 재사용·본인용 선호·준비 안내 자동화

2026-10-01 `RM-UX-04~06` 워크트리 구현·로컬 검증 완료다. [실제 연동·기존 데이터 보존·화면 점검 결과](../../../../docs/plan/regular-meeting/evidence/RM-UX-07/README.md)에 최신 계약과 검증 범위·한계를 남긴다.

- 선택형 소개·비용 설명과 회차별 필수/선택 준비를 같은 원본으로 미리보기·공개·참가자 화면에 표시한다. 공통 내용은 회차를 명시적으로 골라 복사한다.
- 콘텐츠 전용 수정은 주최자·현재 버전·회차 상태를 검사한다. 중요 준비 변경은 이력과 자동 안내를 남기며 가격·일정·환불 변경으로 확장하지 않는다.
- 이미 답한 관심 분야·시간대·인원 선호를 본인만 비교한다. 수정·해제·건너뛰기를 제공하고 성향 검사를 필수화하거나 원점수를 공개하지 않는다. 모임별 목적 수집·호스트 공유는 이번에 추가하지 않는다.
- 확정 직후 준비, D-7 필수 준비, 기존 24H/1H 시작 안내, 후기·선택 피드백과 다음 회차를 연결한다. 취소·만료·일정 변경은 전달 직전 재검사하고 재시도·종료 후 안내는 내구성 중복 원장으로 조정한다.
- 직원 인터뷰·대표 후기 선정·준비 검수·개별 독촉을 추가하지 않는다. 실제 앱/HTTP 자동 왕복과 기존 데이터 보존형 적용을 통과했다. 수동 브라우저 접근 제한, 렌더링 시각 점검과 출시 검증의 구분은 [전체 완료 점검](../../../../docs/plan/regular-meeting/COMPLETION_AUDIT.md)을 따른다.


## 참가자가 판단하고 다음 행동으로 이동하는 화면

2026-09-30 `RM-UX-01` 워크트리 구현 범위다. [정기모임 콘텐츠와 참가자 경험 개선 계획](../../../../docs/plan/regular-meeting/CONTENT_UX_IMPROVEMENT_PLAN_2026-09-29.md)을 따르며 검증 결과는 별도로 기록한다.

- 요약과 내 참여 상태를 장문 소개보다 먼저 보여준다. 전체 일정, 접을 수 있는 소개, 신청·취소 조건으로 이어지고 참가자의 주 행동은 하단에 고정한다.
- 참가자는 내부 회차 생성·출석 확정 상태를 보지 않는다. 주최자는 관리 도구와 참가자 미리보기를 사용한다.
- 같은 가격 0이라도 VARIABLE 본체는 ‘회차별 비용’, FIXED 본체는 ‘전체 과정 무료’, FIXED 회차는 ‘과정 참가비에 포함’으로 설명한다.
- 승인 대기와 정원 대기, 미납과 입금 신고 후 주최자 확인 대기를 구별한다. 조회 실패는 미신청이 아니다. 종료·취소된 모임이나 예정 회차가 없는 모임에는 새 신청을 제공하지 않는다.
- 등록 완료 후에는 취소된 회차를 제외한 다음 회차로 연결한다. 기존 취소·환불·증빙 열람은 유지한다.
- 회원 인터뷰나 직원의 소개문 편집을 추가하지 않는다. 후기는 아래 회차 후기 설명을 따르고, 설문·준비 자동화의 최신 구현은 [소개 재사용·본인용 선호·준비 안내 자동화](#소개-재사용본인용-선호준비-안내-자동화)를 따른다.

### 회차 활동과 진행 경험으로 판단하기

2026-09-30 `RM-UX-02`에서 기존 회차 설명과 진행자 정보를 연결했다. [회차 콘텐츠와 진행자 연결 구현 기록](../../../../docs/plan/regular-meeting/evidence/RM-UX-02/README.md)에 검증 범위를 남긴다.

- 회차의 일시·가격은 항상 보이고 활동 설명을 펼친다. 가장 가까운 미래 회차를 먼저 펼치며, 내용이 없으면 ‘활동 안내 예정’으로 표시한다. 원문을 재입력하거나 자동 추정하지 않는다.
- 미공개·숨김·비공개 회차는 참가자 조회에서 제외한다. 숨김 정기모임은 주최자만 상세·진행자 정보를 열람한다.
- 인증된 이용자는 정기모임 전용 `GET /api/v1/regular-meetings/{id}/host-card`로 진행자 사진·허용된 프로필·공개 모임 완료 횟수를 확인한다. 기존 차단·프로필 숨김 정책을 재사용한다.
- `completedHostedCount`는 공개 CLOSED 모임 횟수이며, `hostedCount`는 초안 등도 포함하는 생성 건수다. 전자만 ‘공개 모임 진행 완료’로 표시하고 신뢰점수와 후기 평점도 구별한다. 축소 응답에서는 점수·횟수·프로필 버튼을 숨긴다.
- 소개 작성에 대상·활동·준비 예시와 참가자용 소개 미리보기를 제공한다. 공개 후 콘텐츠 수정·구조화된 저장은 상단의 [소개 재사용·본인용 선호·준비 안내 자동화](#소개-재사용본인용-선호준비-안내-자동화)에 추가했다.

### 회차 후기와 다른 모임 후기를 구별하기

2026-09-30 `RM-UX-03` 워크트리 구현. [출처가 분명한 후기 구현 기록](../../../../docs/plan/regular-meeting/evidence/RM-UX-03/README.md)에 조회·권한·앱 검사와 화면을 남긴다.

- 참가자 상세 상단에 같은 정기모임의 후기 건수·고유 작성자 수·진행자 평가 평균과 본문 이동을 둔다. 진행자 아래에는 최신 3건과 전체 보기를 제공하고, 현재 진행자의 다른 모임 후기는 별도 카드로 표시한다. 주최자는 참가자 미리보기에서 이 배치를 확인한다.
- 후기는 회차 진행자 평가다. 전체 과정 만족도·출석 인증·수료 평가로 해석하지 않는다. 원래 모임 제목·회차 번호·평가 대상·작성자·작성일을 표시하며, 주최자가 바뀐 이력도 원래 평가 대상을 유지한다.
- 인증된 `GET /api/v1/regular-meetings/{id}/reviews?scope=THIS_MEETING|HOST_OTHER_EVENTS&page=0&size=3`은 `scope`, `summary{reviewCount,reviewerCount,averageRating}`, `reviews: Page`를 반환한다. 평균은 후기 없음이면 null이다. 최신 작성일·번호 내림차순이며 앱 전체 보기는 20건씩 조회한다.
- 삭제·관리자 숨김·임시 숨김, 차단 작성자·평가 대상·회차 주최자, 받은 리뷰의 프로필 열람 제한을 목록과 집계에 같은 조건으로 적용한다. 공개 OPEN/CLOSED 회차만 사용하고, 숨김·미발행 부모의 회차도 제외한다. 원래 숨김 검토·작성 자격·신고 절차는 바꾸지 않는다.
- 후기 없음·조회 실패·열람 불가·로그인 필요를 구별한다. 다른 모임 평점으로 같은 과정의 빈 후기를 대체하지 않는다. 계정·개인정보 상태가 바뀌거나 원래 회차·신고에서 돌아오면 후기를 다시 조회한다.
- 직원의 대표 후기 선정이나 검수 큐를 신설하지 않는다. 평균은 노출 대상 후기 건수로 계산하고 작성자 수는 별도로 세어, 여러 회차의 후기를 여러 사람의 경험으로 과장하지 않는다.

## 1. 결론

`GET /api/v1/regular-meetings/{id}` 단일 엔드포인트가 모임 본체 + 세션 요약(`sessions`) + 조회자 컨텍스트(`host` boolean, `myMembership` Phase 2 후 별도 endpoint) 를 한 번에 내려준다. Controller는 nullable principal을 받지만 현재 SecurityConfiguration의 인증 기본 규칙이 적용된다. 익명 공개를 새로 추가하지 않는다. DRAFT 는 호스트 본인만 조회 가능(기타는 `REGULAR_MEETING_NOT_FOUND`). 세션 목록은 별도 `GET /api/v1/regular-meetings/{id}/events?includeHistory={bool}` 로 조회한다 (취소된 세션 포함 옵션).

Flutter `RegularMeetingDetailScreen` 은 status (DRAFT/OPEN/CLOSED/CANCELED) 와 viewer (host/member/guest) 분기로 하단 CTA 를 결정한다. 호스트는 "멤버 관리", "세션 출석 확정", "정산 보기" 진입, 멤버는 "취소", "결제" (APPROVED_PENDING_PAYMENT), 게스트는 "참가 신청" CTA.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `RegularMeetingController#get,sessions,myMembership` | `GET /api/v1/regular-meetings/{id}`, `/events`, `/members/me` |
| Backend Service | `RegularMeetingService#getMeeting,getSessions` | DRAFT 가드, 세션 정렬, 활성/취소 분리 |
| Backend VO | `RegularMeetingVo`, `RegularMeetingEventVo`, `RegularMeetingMemberVo` | 본인 멤버 응답에 nullable `paymentDueAt` 포함 |
| Backend ErrorCode | `ErrorCode.REGULAR_MEETING_NOT_FOUND(2700001)` | DRAFT 마스킹 |
| Flutter API | `regular_meeting_api.dart` | Retrofit getDetail/getSessions/getMyMembership |
| Flutter Provider | `community_app/lib/domain/providers/regular_meeting/regular_meeting_detail_provider.dart` | `regularMeetingDetail`, `regularMeetingSessions`, `myRegularMeetingMembership`가 한 파일에 통합된 `@riverpod` 3종 |
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
| 인증 | Controller는 nullable principal. HTTP 접근은 현재 보안 설정의 인증 기본 규칙 적용 |
| Path | `id: long` |
| 응답 | `RegularMeetingVo` (sessions 포함) |
| DRAFT 접근 | 호스트만. 그 외 `REGULAR_MEETING_NOT_FOUND` |

`RegularMeetingVo` 핵심 필드: `id, hostUserId, hostNickname, title, category, meetingType, status, thumbnailUrl, locationType, regionSummary, startDate, endDate, totalSessionCount, upcomingSessionCount, price, baseCapacity, enrolledCount, description, address, addressDetail, latitude, longitude, onlineUrl, prepaymentRequired, refundPolicy, refundDeadlineHours, approvalRequired, isHost(JSON: "host"), sessions: List<RegularMeetingEventVo>, noShowPolicy, noShowLimit, noShowCountMode, publishedAt, closedAt, canceledAt, createdAt`.

### `GET /api/v1/regular-meetings/{id}/events?includeHistory={bool}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#sessions` |
| Query | `includeHistory: bool, default false` (true 면 CANCELED 세션 포함) |
| 응답 | `List<RegularMeetingEventVo>` — `eventId, sequenceNo, origin, replacedEventId, active, materializationStatus, attendanceFinalizationStatus, title, description, startTime, endTime, status, locationType, address, onlineUrl, baseCapacity, currentCapacity` |
| 정렬 | `sequenceNo ASC` (replacement 는 원본 옆에) |

### `GET /api/v1/regular-meetings/{id}/members/me`

| 항목 | 실제 계약 |
|---|---|
| Controller | `RegularMeetingController#myMembership` |
| 인증 | 필수 |
| 응답 | `RegularMeetingMemberVo`. 미등록은 400 `ENROLLMENT_INVALID_STATUS`(2700009). `paymentDueAt`은 결제 대기일 때만 서버 저장 기한을 반환 |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `Routes.regularMeetingDetail = /regular-meetings/:id` |
| Screen | `RegularMeetingDetailScreen` |
| Detail Provider | `regularMeetingDetailProvider(id)` |
| Sessions Provider | `regularMeetingSessionsProvider(id, includeHistory)` |
| Membership Provider | `myRegularMeetingMembershipProvider(id)` |
| CTA 위젯 | `RegularMeetingParticipation` (참가자 본문·하단 행동), 주최자는 상세의 관리 영역 |
| RM 컨텍스트 표기 | `DirectApplyBlockedNotice` — `directApplyBlocked=true` 일 때 "이 모임은 일반 신청이 막혀 있습니다" 안내 |

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S2-1 | 미등록 이용자 OPEN 조회 | 인증됨, status=OPEN | `host=false`. 전체 과정 신청(FIXED) 또는 회차 선택(VARIABLE). 익명 진입은 현재 보안 설정에서 인증 필요 |
| S2-2 | 호스트 DRAFT 조회 | 로그인, hostUserId == userId, status=DRAFT | 200. `host=true`. CTA="발행하기" |
| S2-3 | 비호스트 DRAFT 접근 | DRAFT 모임에 다른 user 접근 | 404 `REGULAR_MEETING_NOT_FOUND` |
| S2-4 | 멤버 ENROLLED 조회 | 로그인, member status=ENROLLED | 200. 다음 회차 보기, 서버가 허용하는 취소·환불 요청 |
| S2-5 | 멤버 APPROVED_PENDING_PAYMENT 조회 | 승인 후 결제 전 | 미납은 납부 안내, 신고 완료는 주최자 확인 대기. 기한 경과·조회 실패는 상태 갱신 |
| S2-6 | 세션 히스토리 조회 | `includeHistory=true` | 주최자는 전체 이력. 비주최자는 공개 가능한 회차와 발행 후 취소 이력만 포함 |
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

- **AC-01 (S2-1). 비주최자 조회**: Given 인증된 비주최자. When 공개된 모임 `GET /{id}`. Then 200 + `host=false`. 비로그인은 현재 HTTP 인증 기본 규칙을 따른다.
- **AC-02 (S2-3). DRAFT 마스킹**: Given DRAFT + 비호스트. When 조회. Then 404 `REGULAR_MEETING_NOT_FOUND`.
- **AC-03 (S2-5). 결제 대기 멤버 CTA**: Given `myMembership.status=APPROVED_PENDING_PAYMENT`. When 상세 진입. Then "결제하기" CTA + paymentDueAt 카운트다운.
- **AC-04 (S2-6). 히스토리**: Given `includeHistory=true`. Then CANCELED 세션 포함. `active=false` 플래그 노출.
- **AC-05 (S2-7). CLOSED 호스트**: Given CLOSED + host. Then "정산 보기" CTA. 미생성 정산은 204 → "준비중" 라벨.

## 10. 미결정 / 후속

| 항목 | 사유 | 후속 |
|---|---|---|
| viewer status 통합 응답 | 1차는 `/members/me` 별도 호출 | 후속에 `RegularMeetingVo` 안에 `myMembershipStatus` 인라인 |
| 세션 카드 풀 정보 | 상세 응답 sessions 는 요약 — 자세한 정원/체크인은 일반 이벤트 상세에서 | 분리 유지 |
