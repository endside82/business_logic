# F03-02. 이벤트 상세 조회 PRD

## 1. 결론

이벤트 상세 조회는 현재 **일반 상세 조회, DRAFT 비공개 마스킹, 클럽 비멤버 제한, 서버 능력플래그 기반 운영 CTA, 유료 승인제 결제 대기, .ics 내보내기**까지 실제 서버와 Flutter 소스가 맞물려 있다. 서버는 `GET /api/v1/events/{eventId}`에서 `EventVo`와 viewer context를 내려주고, Flutter는 `/home/events/:eventId`에서 이를 바탕으로 상세 화면과 하단 CTA를 결정한다. 다만 상태별 렌더링과 이벤트 복제·삭제 CTA는 서버 계약과 완전히 맞지 않는다.

2026-07-29 재실측 결과, 이전 문서가 Gap으로 적었던 결제 대기 승인제 흐름은 이미 닫혀 있다. 서버 `EventVo`에는 `myPaymentDueAt`, `myPaymentRequired`, `myPayableAmount`, `reservedPaymentPendingCount`가 있고, `EventViewerContextService`는 `APPROVED_PENDING_PAYMENT → PENDING_PAYMENT`, `PAYMENT_EXPIRED → PAYMENT_EXPIRED`를 변환한다. 단 `reservedPaymentPendingCount`는 예약 **좌석 수가 아니라 신청 건수**다. 서버의 실제 hold는 party size 합계라 게스트 동반 신청에서는 Flutter 만석 판단이 과소 계산된다. Flutter 결제 CTA는 범용 지갑 결제가 아니라 `POST /api/v1/events/{eventId}/prepayment/wallet`을 호출하며, 서버는 지갑 차감·회계 기록·`Application APPROVED`·`EventAttendance ATTENDING`을 한 트랜잭션에서 확정한다.

현재 판정은 **상세 조회/권한/기본 CTA/유료 승인제 결제 경로/개인화 핏 프리뷰 사용 가능, 삭제·복제 lifecycle CTA는 정합성 Gap**이다. 상세 본문에는 증거등급 참석 이력을 k-익명성 규칙으로 가공한 “나와의 핏”과 원점수를 숨긴 “재방문 많은 호스트” 배지도 실제 배선돼 있다. `CANCELED`는 응답을 받은 뒤 화면 전체를 `AppBlockedState`로 교체하고, `CLOSED`는 흐릿한 오버레이 없이 정상 본문에 `종료` 배지만 붙인다. 가장 큰 현재 위험은 Flutter가 서버에서 유일하게 삭제 가능한 `DRAFT`에는 삭제 버튼을 주지 않고, 삭제 불가능한 `CLOSED`에는 삭제 버튼을 노출하는 상태 역전이다. 복제도 Flutter는 host-only·PRIVATE 숨김인데 서버는 co-host도 받고 PRIVATE를 허용하며, 반대로 Flutter가 노출하는 `CLUB_MEETING`은 서버가 거부한다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/src/main/java/com/endside/community/event/controller/EventController.java` | `GET /api/v1/events/{eventId}`, `POST /api/v1/events/{eventId}/next-occurrence`, `DELETE /api/v1/events/{eventId}`, calendar/similar |
| Backend Service | `community_api/src/main/java/com/endside/community/event/service/EventService.java` | DRAFT 조회 guard, Redis 조회수 증가, `createNextOccurrence`, DRAFT-only `deleteEvent`, `validateOwnership` |
| Backend Viewer Context | `community_api/src/main/java/com/endside/community/event/service/EventViewerContextService.java` | 멤버십/참석/신청/결제 상태와 11개 viewer capability 주입 |
| Backend VO/Enum | `EventVo.java`, `ApplicationStatus.java`, `EventStatus.java`, `EventType.java`, `EventVisibility.java`, `LocationType.java` | 실제 응답 필드, enum 값, Jackson boolean key |
| Backend Payment Boundary | `EventPrepaymentController.java`, `EventPrepaymentService.java`, `ApplicationService.java`, `CapacityService.java` | 이벤트 선결제 전용 endpoint, 결제·분개·신청/참석 확정 트랜잭션 |
| Backend Connectivity | `EventFitPreviewController.java`, `EventFitPreviewService.java`, `TraitFitPreviewService.java`, `EventHostCardService.java` | 증거등급 로스터, k-익명 버킷/비율/축 분포, 호스트 재방문 배지 |
| Flutter API/Repository | `community_app/lib/data/api/event_api.dart`, `community_app/lib/data/repositories/event_repository.dart` | Retrofit endpoint와 `Result<T>` wrapping |
| Flutter Model | `community_app/lib/data/models/event/event_vo.dart`, `event_status.dart`, `event_viewer_status.dart` | 클라이언트가 기대하는 JSON field와 상태 parser |
| Flutter Provider | `community_app/lib/domain/providers/event/event_detail_provider.dart`, `domain/providers/attendance/attendance_action_provider.dart` | 상세 조회, 유사 이벤트, .ics export, 이벤트 선결제 호출과 참석 상태 갱신 |
| Flutter Screen/Widget | `event_detail_screen.dart`, `event_action_bar.dart`, `event_info_section.dart`, `event_more_menu.dart` | CANCELED full-block, CLOSED badge, 역할별 액션바, 복제·삭제 caller |
| Flutter Fit/Host UI | `event_fit_preview_section.dart`, `event_host_card.dart` | 로딩·오류·전 신호 부재 시 숨김, coarse 신호와 재방문 배지 표시 |
| Verification | `PaidApprovalFlowE2ETest.java`, `EventPrepaymentServiceTest.java`, `seed_event_detail_role_controls_test.dart`, `seed_event_list_badge_matrix_test.dart`, `seed_event_payment_authoring_test.dart`, 관련 E2E runner | 승인 전/후 결제, 중복·만료·정원·제재 가드와 상세 권한/정보 surface |

## 3. 전체 동작 흐름

1. 사용자는 홈 이벤트 카드, 검색 결과, 알림 딥링크, 공유 링크, 내 이벤트 목록 등에서 `/home/events/:eventId`로 진입한다.
2. GoRouter는 `Routes.eventDetail = events/:eventId`를 `EventDetailScreen(eventId)`로 연결한다.
3. `EventDetailScreen`은 `eventDetailNotifierProvider(eventId)`와 `similarEventsProvider(eventId)`를 구독한다.
4. `EventDetailNotifier.build()`는 `EventRepository.getEventDetail()`을 호출하고, Repository는 `EventApi.getEventDetail()`로 `GET /api/v1/events/{eventId}`를 호출한다.
5. 서버 `EventController#getEvent`는 optional auth를 허용하고, 로그인 사용자가 있으면 `currentUserId`를 `EventService#getEvent(eventId, currentUserId)`에 전달한다.
6. `EventService#getEvent`는 이벤트를 조회한 뒤 `DRAFT` 이벤트에 비호스트/비공동호스트가 접근하면 `EVENT_NOT_FOUND`로 마스킹한다.
7. 통과한 조회는 Redis 조회수 증가(`TrendingService.recordView`)와 로그인 사용자의 view interaction 기록을 수행한다. interaction 기록 실패는 warning으로만 남기고 상세 조회는 계속한다.
8. `loadEventVoWithDetails`/`EventVoAssembler`는 host nickname, co-host, viewer context, 클럽 비멤버 제한, 사전결제 환불 정보, private meeting detail과 `APPROVED_PENDING_PAYMENT` 예약 수를 `EventVo`에 주입한다.
9. Flutter는 서버가 계산한 viewer capability와 본인 상태를 소비해 본문 섹션과 하단 CTA를 결정한다. 정원 설정 진입은 `canManageCapacity`를 그대로 사용하고, 참석 여부는 `myAttendanceStatus`를 `EventViewerStatus`로 파싱한다.
10. 결제 대기 사용자는 카운트다운과 `결제하고 참석 확정` CTA를 본다. CTA는 `EventPrepaymentRepository.payByWallet(eventId)`를 통해 `POST /api/v1/events/{eventId}/prepayment/wallet`을 호출한다. 서버 응답이 `PAID`이면 Flutter는 우선 `attending`으로 갱신하고 상세 provider를 invalidate한다.
11. 서버 결제 서비스는 event/application 행을 잠그고 활성 중복 결제를 차단한 뒤 자동충전 시도, `WalletSpendService.spend(EVENT_PREPAYMENT, PAID_FIRST)`, 결제 기록·회계 분개, `ApplicationService.confirmPaymentAndAttend()`를 같은 트랜잭션에서 수행한다. 확정 시 정원이 찼으면 전체 트랜잭션이 롤백된다.
12. 인증 사용자의 “나와의 핏” 섹션은 `GET /api/v1/events/{eventId}/fit-preview`를 별도로 호출한다. 서버는 상세 조회와 같은 DRAFT gate를 적용한 뒤 아는 사람/비슷한 성향은 `FEW(1~2)`·`SEVERAL(3+)` 버킷으로, 단골/초면은 조건 충족 시 10% 단위 비율로, 성향 축은 LOW/MID/HIGH coarse 분포로만 내려준다. 가시성 또는 최소 모수 미달 신호는 JSON 키 자체를 생략하고 축 목록은 빈 배열을 쓴다.
13. 호스트 카드는 `hostRevisitBadge`가 참이면 “재방문 많은 호스트”를 표시한다. 서버 기준은 CLOSED 주최 이벤트 3개 이상, 증거등급 유니크 참석자 15명 이상, 그중 2회 이상 재방문자 비율 30% 이상이며 원카운트·원비율은 노출하지 않는다. viewer와 host가 차단 관계면 false로 축소한다.
14. 호스트 또는 참석확정(ATTENDING) 사용자에게 "모임 정산" 네비게이션 행이 노출된다(`/home/events/:id/settlement` push, [F07-04](../07_meeting_settlement/F07-04_status-summary-receipt_prd.md) 참조).
15. `.ics` 내보내기는 `exportEventCalendarProvider`가 `GET /api/v1/events/{eventId}/calendar`를 호출하고, Flutter가 임시 파일로 저장한 뒤 share sheet를 연다.
16. 유사 이벤트는 `similarEventsProvider`가 `GET /api/v1/events/{eventId}/similar?limit=5`를 호출한다. 실패 시 빈 리스트로 숨긴다.
17. 상태를 파싱한 직후 Flutter는 `CANCELED`와 `HIDDEN`을 본문·하단바가 없는 `AppBlockedState`로 반환한다. `DRAFT`는 `canEditEvent=false`일 때 같은 방식으로 막지만, 정상 서버 경로에서는 비권한 DRAFT가 이미 `EVENT_NOT_FOUND`이므로 보통 not-found 분기로 간다. `CLOSED`는 차단하지 않고 전체 본문을 렌더하며 `EventInfoSection`의 `종료` 배지와 종료 후 전용 행만 추가한다.
18. 더보기의 `이 이벤트로 새로 만들기`는 `isHost && eventType != PRIVATE`일 때만 보이고, `POST /api/v1/events/{eventId}/next-occurrence` 성공 시 새 DRAFT의 `/edit-event/{id}`로 이동한다. 서버와 달리 co-host·PRIVATE에는 숨고, `CLUB_MEETING`에는 잘못 노출된다.
19. `EventActionBar`는 host/co-host에게 DRAFT=`수정·발행`, OPEN=`수정·종료·취소`, 그 밖의 상태=`삭제`를 만든다. 화면 상단 차단을 고려하면 실제 상세에서 삭제가 보이는 정상 경로는 `CLOSED` host/co-host뿐이다. 그러나 서버 `DELETE`는 DRAFT만 허용하므로 이 버튼은 400이 되고, 정작 삭제 가능한 DRAFT에는 진입점이 없다.

## 4. 서버 계약

### `GET /api/v1/events/{eventId}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `EventController#getEvent` |
| 인증 | optional. `@AuthenticationPrincipal(errorOnInvalidType = false)` |
| Path | `eventId: long` |
| 응답 | `EventVo` |
| DRAFT 접근 | host 또는 co-host만 허용. 그 외 `EVENT_NOT_FOUND` |
| 다른 상태 접근 | `OPEN`, `CLOSED`, `CANCELED`, `HIDDEN`에는 별도 조회 차단이 없어 응답 조립까지 진행 |
| Side effect | Redis 조회수 증가, 로그인 사용자 view interaction 기록 |
| 실패 | 이벤트 없음 또는 DRAFT 비권한 접근 시 `EVENT_NOT_FOUND` |

`EventVo` 핵심 필드:

| 필드 | 타입 | 판단 |
|---|---|---|
| `id`, `hostUserId`, `clubId`, `hostNickname` | long/Long/String | 소유자와 클럽 관계 판단에 사용 |
| `title`, `description`, `thumbnailUrl` | String | 상세 본문 표시 |
| `category`, `eventType`, `status`, `visibility`, `locationType` | enum | 상태/유형/노출 판단 |
| `address`, `addressDetail`, `latitude`, `longitude`, `onlineUrl` | String/Double | 위치/온라인 정보 |
| `startTime`, `endTime`, `timezone`, `publishedAt`, `createdAt` | LocalDateTime/String | 일정 표시 |
| `baseCapacity`, `currentCapacity`, `reservedPaymentPendingCount`, `waitlistEnabled`, `approvalRequired`, `isClosed` | int/boolean | 하단 참석 CTA 판단. `reservedPaymentPendingCount`는 APPROVED_PENDING_PAYMENT 신청 **건수**이며 좌석 가중치가 아님 |
| `price`, `refundPolicy`, `prepaymentRefundPolicyType`, `refundDeadlineHours` | BigDecimal/enum/int | 유료/환불 안내 |
| `coHostUserIds` | List<Long> | 공동주최자 권한 판단 |
| `privateMeetingDetail` | PrivateMeetingDetailVo? | private event 섹션 |
| `plans` | List<EventPlanMapVo> | 연결 플랜 섹션 |
| `myMembershipStatus`, `myRole` | String? | 클럽 멤버/운영진 판단 |
| `myAttendanceStatus`, `myApplicationStatus` | String? | 본인 참석/신청 상태 |
| `myPaymentRequired`, `myPayableAmount`, `myPaymentDueAt` | boolean/Long/LocalDateTime? | 승인 후 선결제 필요 여부·서버 확정 금액·기한 |
| `myPromotedFromWaitlist` | boolean | 대기열 승격 1회성 강조 |
| `isWishlisted` | boolean, JSON key `wishlisted` | 찜 하트 상태 |
| `isClosed` | boolean, JSON key `closed` | 모집 마감 CTA |
| `canEditEvent` 등 capability 11종 | boolean | 서버 액션 가드를 화면/라우터가 그대로 소비. 정원 설정은 `canManageCapacity` |

### `GET /api/v1/events/{eventId}/calendar`

| 항목 | 실제 계약 |
|---|---|
| Controller | `EventController#exportCalendar` |
| 인증 | 없음 |
| 응답 | `byte[]`, `Content-Type: text/calendar; charset=utf-8` |
| 파일명 | `event-{eventId}.ics` |
| 실패 | 이벤트 없음 시 404 계열 |

### `GET /api/v1/events/{eventId}/similar`

| 항목 | 실제 계약 |
|---|---|
| Controller | `EventController#getSimilarEvents` |
| 인증 | optional |
| Query | `limit`, default `5` |
| 응답 | `List<SearchVo>` |
| Flutter 처리 | 실패 시 빈 리스트로 숨김 |

### `GET /api/v1/events/{eventId}/fit-preview`

| 항목 | 실제 계약 |
|---|---|
| Controller | `EventFitPreviewController#getFitPreview` |
| 인증 | 필수. Security matcher가 이 경로를 `authenticated()`로 고정 |
| 상세 gate | 내부에서 `EventService#getEvent(eventId, viewerId)` 재사용. 존재하지 않음/DRAFT 비권한 접근은 상세와 동일 |
| 응답 | `EventFitPreviewVo`: `knownAttendeesBucket?`, `returningRatioPercent?`, `firstTimerRatioPercent?`, `similarTraitBucket?`, `traitAxisDistribution` |
| 증거 로스터 | 체크인 1건 이상이면 check-in userId. 아니면 ATTENDING 중 CONFIRMED/APPEALED 노쇼 제외. host/co-host/차단 관계는 개인화 pool에서 제외 |
| 로스터 개인화 가시성 | host/co-host/ATTENDING만 아는 사람·비슷한 성향 신호를 받음 |
| 단골/초면 비율 | pool 5명 이상이고 0이 아닌 각 bucket이 5명 이상일 때만 10% 단위 반올림 |
| 성향 유사 | 최신 SUBMITTED 점수, 공통 축 4개 이상, 평균 절대차 20 이하. 점수 보유 후보 5명 미만이면 키 생략 |
| 성향 축 분포 | LOW 0~33/MID 34~66/HIGH 67~100. 축 모수 5명 이상이고 0이 아닌 band가 각각 5명 이상일 때만 축 노출 |
| 구성 분포 가시성 | PUBLIC OPEN/CLOSED는 모든 인증 사용자. 그 외 visibility/status 조합은 host/co-host/ATTENDING |
| 비노출 계약 | nullable 신호는 `@JsonInclude(NON_NULL)`로 키 자체 생략. `traitAxisDistribution`은 빈 배열 가능. 원점수·원인원은 비노출 |

### `POST /api/v1/events/{eventId}/next-occurrence`

| 항목 | 실제 계약 |
|---|---|
| Controller | `EventController#createNextOccurrence`, 성공 `201 Created` |
| 인증/요청 | 인증 필수. body `NextOccurrenceParam`은 optional이며 `newStartTime?`, `carryProviderAssignments`를 받음 |
| 소유권 | `validateOwnership`을 사용하므로 source host **또는 임의 co-host**. 새 이벤트의 `hostUserId`는 requester가 아니라 원본 host로 고정 |
| 상태 | `CANCELED`, `HIDDEN`은 `INVALID_EVENT_STATUS`; `DRAFT`, `OPEN`, `CLOSED`는 통과 |
| 유형 | 서버는 `INDEPENDENT`, `PRIVATE`를 허용하고 `CLUB_MEETING`은 `INVALID_REQUEST` |
| 추가 guard | 정기모임 session은 차단. hosting 제한 제재 사용자는 `USER_RESTRICTED_FROM_HOSTING` |
| 기본 일정 | body가 없으면 원본 시작일 `+7일`, 종료는 원본 duration 보존. 계산된 시작이 이미 과거면 `INVALID_INPUT` |
| 결과 | 새 `DRAFT`, 원본 host/club/type/config 보존. prepayment·refund policy·plan map·co-host는 새 row로 만들고 참가자·결제·정산·후기·사진은 이관하지 않음 |

### `DELETE /api/v1/events/{eventId}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `EventController#deleteEvent`, 성공 `204 No Content` |
| 소유권 | `validateOwnership`: host 또는 임의 co-host |
| 상태 | **DRAFT만 허용**. 그 외 `EVENT_INVALID_STATUS_TRANSITION` 400 |
| 추가 guard | 정기모임 session 차단 |
| 변경 | co-host row 삭제 후 event hard delete |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `/home/events/:eventId` |
| Screen | `EventDetailScreen` |
| 상세 Provider | `eventDetailNotifierProvider(eventId)` |
| 유사 이벤트 Provider | `similarEventsProvider(eventId)` |
| .ics Provider | `exportEventCalendarProvider(eventId)` |
| Repository | `EventRepository.getEventDetail`, `getSimilarEvents`, `exportCalendar` |
| Retrofit | `EventApi.getEventDetail`, `getSimilarEvents`, `exportCalendar` |
| Error UI | not found는 `AppBlockedState`, 나머지는 `AppErrorState.fromError` |

화면 주요 분기:

| 분기 | Flutter 판단 |
|---|---|
| host | `currentUserId == event.hostUserId` |
| co-host | `event.coHostUserIds.contains(currentUserId)` |
| club staff | `event.myRole == OWNER/ADMIN` |
| club member | `event.myMembershipStatus == ACTIVE` |
| restricted club viewer | `clubId != null && !host && !coHost && !staff && !clubMember && !applicant && !attending` |
| photos allowed | `permission.canViewPhotos` = host/co-host/staff/attending. 일반 ACTIVE club member만으로는 열리지 않음 |
| manage applications | `permission.canManageApplications` = host/co-host. club staff는 제외 |
| check-in | 관리 화면은 `canManageAttendance`, 본인 체크인은 attending. co-host는 attendance flag가 있어야 관리 가능 |
| location view | host/co-host/attending |
| 수용인원 설정 | `event.canManageCapacity` — host ∪ any co-host ∪ 클럽 ADMIN/OWNER |
| lifecycle action bar | identity `isHost || isCoHost`를 사용. club staff는 `canManageEvent=true`여도 lifecycle bar를 받지 않음 |
| DRAFT host/co-host action | `수정`, `발행`만 표시. 서버가 허용하는 `삭제`는 없음 |
| CLOSED host/co-host action | `삭제` 표시. 서버는 CLOSED 삭제를 거부 |
| CANCELED/HIDDEN | `Scaffold(body: AppBlockedState)`로 조기 반환해 본문·더보기·하단바 모두 없음 |
| clone | `isHost && event.eventType != 'PRIVATE'`; 호출은 `createNextOccurrence` 후 새 DRAFT edit route |
| 나와의 핏 | 인증 사용자에게 별도 provider 호출. 신호 전부 부재/로딩/오류면 섹션을 조용히 숨김 |
| 재방문 많은 호스트 | `EventHostCardVo.hostRevisitBadge`가 true일 때만 태그 표시 |
| 모임 정산 입구 | `isHost \|\| isAttendingViewer` — 항상 노출 (2026-06-05 신설, DEC-V8). 정산 부재 시 정산 화면이 참가자 빈 상태/호스트 생성 CTA로 분기 ([F07-04](../07_meeting_settlement/F07-04_status-summary-receipt_prd.md)) |
| bottom CTA capacity full | `currentCapacity + reservedPaymentPendingCount >= baseCapacity` |
| promoted notice | `myPromotedFromWaitlist && !promotedSeen && viewerStatus == attending` |

역할별 서버 capability 실측:

| 역할 | lifecycle/신청/공지 | 출석·모더레이션 | 정원·기타 |
|---|---|---|---|
| host | 11개 관리 capability 전부 true | 전부 true | `canManageCapacity=true` |
| co-host | `canEditEvent`, `canManageApplications`, `canSendAnnouncement`, 환불/분쟁/명단은 co-host row 존재만으로 true | 출석·모더레이션만 각각 `canManageAttendance`/`canModerateMessages` flag 필요 | `canManageCapacity=true` |
| club OWNER, 비host | 편집·신청관리·공지 false | 출석·명단·모더레이션·환불·분쟁 true | `canManageCapacity=true`; lifecycle bar/clone 없음 |
| club ADMIN, 비host | 편집·신청관리·공지 false | 출석·명단 true, 모더레이션/환불/분쟁은 해당 permission flag별 | `canManageCapacity=true`; lifecycle bar/clone 없음 |
| 일반 참가자 | 관리 capability false | attendance row가 있으면 명단 열람만 true | 본인 CTA만 |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 비로그인 + OPEN | optional auth, viewer context EMPTY | `currentUserId == null` | 상세 조회 가능, 찜/참석 액션은 로그인 유도 | 일치 |
| 일반 로그인 + OPEN + 미참석 | `myAttendanceStatus = NOT_ATTENDING` | `EventViewerStatus.notAttending` | `참석 신청` CTA | 일치 |
| 일반 로그인 + 승인 대기 | application `PENDING` -> `PENDING_APPLICATION` | `pendingApplication` | `신청 검토중` disabled | 일치 |
| 일반 로그인 + 참석 확정 | attendance 우선, `ATTENDING` | `attending` | `참석 취소`, 참석자/체크인/사진첩 가능 | 일치 |
| 일반 로그인 + 대기열 | attendance `WAITING` | `waitlisted` | `대기 취소`, 대기열/참석자 가능 | 일치 |
| host/co-host + DRAFT | 서버 DRAFT guard 통과, DELETE도 허용 | host/co-host branch | 수정/발행은 보이나 삭제 진입점 없음 | 삭제만 불일치 |
| 비host + DRAFT | 서버가 `EVENT_NOT_FOUND` | not found blocked state | "이벤트를 찾을 수 없습니다" 계열 | 일치 |
| 비멤버 + 클럽 이벤트 | 서버가 description/addressDetail/onlineUrl/privateMeetingDetail/plans 제거 | restricted notice + 일부 섹션 숨김 | 클럽 가입 CTA 중심 | 대체로 일치 |
| `CLOSED` 일반/참석자 | 서버 상세 응답 | 정상 본문 + `종료` 배지, 참석자는 후기/피드백/사진첩 | 오버레이 없이 회고 surface 유지 | 일치 |
| `CLOSED` host/co-host | 서버 상세 응답, DELETE는 DRAFT-only | 액션바 `삭제` | 탭하면 400 | 불일치 |
| `CANCELED` 모든 역할 | 서버는 상세 응답 가능 | screen에서 즉시 `AppBlockedState` 반환 | 본문·환불정보·더보기·하단바 모두 없음 | 제품/서버 노출 정책 불일치 |
| `HIDDEN` | 서버 `getEvent`에 HIDDEN guard 없음 | screen에서 `AppBlockedState` | 본문 전체 차단 | 서버 차단 여부 결정 필요 |
| clone host + INDEPENDENT | 서버 허용 | 메뉴 노출 | 새 DRAFT edit route | 일치 |
| clone co-host + INDEPENDENT | 서버 `validateOwnership`상 허용 | 메뉴 숨김 | 호출 진입점 없음 | 불일치 |
| clone host + PRIVATE | 서버 허용 | 메뉴 숨김 | 호출 진입점 없음 | 불일치 |
| clone host + CLUB_MEETING | 서버 거부 | 메뉴 노출 | 탭 후 실패 toast | 불일치 |
| 유료 승인제 `APPROVED_PENDING_PAYMENT` | `PENDING_PAYMENT` + 결제 금액/기한/필요 여부 | `pendingPayment` | 카운트다운 + `결제하고 참석 확정` | 일치 |
| 결제 기한 만료 `PAYMENT_EXPIRED` | `PAYMENT_EXPIRED` | `paymentExpired` | `재신청` CTA | 일치 |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `EventStatus` | `DRAFT`, `OPEN`, `CLOSED`, `CANCELED`, `HIDDEN` | parser가 `CANCELED`/`CANCELLED` 모두 처리 | 일치 |
| `EventType` | `INDEPENDENT`, `CLUB_MEETING`, `PRIVATE` | String으로 수신 | 일치 |
| `isClosed` JSON key | Java field `isClosed` -> Jackson key `closed` | `@JsonKey(name: 'closed')` | 일치 |
| `isWishlisted` JSON key | Java field `isWishlisted` -> Jackson key `wishlisted` | `@JsonKey(name: 'wishlisted')` | 일치 |
| viewer membership | `ACTIVE`, `PENDING`, `BANNED`, `NONE` | `ClubMembershipStatus.fromString` | 일치 |
| viewer attendance | `ATTENDING`, `WAITING`, `PENDING_APPLICATION`, `ENDED`, `NOT_ATTENDING` | parser 처리 | 대체로 일치 |
| viewer payment status | `APPROVED_PENDING_PAYMENT → PENDING_PAYMENT`, 만료는 `PAYMENT_EXPIRED` | parser가 두 값을 처리 | 일치 |
| payment detail fields | Java `EventVo`가 `myPaymentDueAt`, `myPaymentRequired`, `myPayableAmount` 제공 | Dart `EventVo`가 동일 계약 수신 | 일치 |
| pending payment capacity count | `EventVoAssembler`는 `APPROVED_PENDING_PAYMENT` 신청 건수를 계산하지만 실제 서버 hold는 `sumPartySizeByEventIdAndStatus` | `currentCapacity + reservedPaymentPendingCount`로 CTA 계산 | 게스트 partySize>1에서 과소 계산 |
| payment confirmation | 이벤트 선결제 전용 서비스가 지갑 차감 후 `confirmPaymentAndAttend()` 호출 | `EventPrepaymentRepository.payByWallet(eventId)` 호출 | 일치 |
| 정원 관리 capability | `canManageCapacity = host ∪ any co-host ∪ club ADMIN/OWNER` | 상세 행과 route guard가 같은 boolean 소비 | 일치 |
| `CLOSED` 표현 | 상세 응답 가능 | 전체 본문 + `종료` badge; overlay 없음 | 일치. 과거 문서의 “흐릿한 오버레이”가 오기 |
| `CANCELED` 표현 | 상세 응답과 capability까지 조립 | 모든 역할에 `AppBlockedState` 조기 반환 | 정책 차이 |
| 이벤트 삭제 | host/co-host + DRAFT만 204 | DRAFT에는 버튼 없음, CLOSED host/co-host에 버튼 노출 | **상태 역전** |
| 다음 회차 권한 | host/co-host | host-only 메뉴 | co-host UI 누락 |
| 다음 회차 유형 | INDEPENDENT/PRIVATE 허용, CLUB_MEETING 거부 | PRIVATE 숨김, CLUB_MEETING 노출 | **유형 gate 반전** |
| 결제 기한 집행 | 5분 주기 scheduler가 `PAYMENT_EXPIRED` 전환. `payByWallet` 자체에는 dueAt 비교 없음 | 기기 시계가 dueAt 경과를 보면 CTA 차단 후 상세 재조회 | 정책 시점 차이 |
| `HIDDEN` 직접 조회 | 서버 guard 없음 | UI blocked state | 서버 정책 결정 필요 |
| similar events failure | 서버 optional auth + list 반환 | 실패를 빈 리스트로 숨김 | UX는 안정적이나 장애 탐지 약함 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | 삭제 CTA 상태가 서버와 반대로 배치됨 | 서버는 DRAFT-only인데 `EventActionBar`는 DRAFT에 수정/발행, CLOSED에 삭제를 렌더. CANCELED/HIDDEN은 상위 화면에서 차단 | 유효한 DRAFT를 앱에서 삭제할 수 없고 CLOSED 삭제는 매번 400 | DRAFT host/co-host에 확인형 삭제 CTA를 두고 CLOSED/CANCELED/HIDDEN에서는 제거. 같은 매트릭스의 widget test 추가 |
| P1 | 복제 권한·유형 gate가 서버와 다름 | 서버 host/co-host + INDEPENDENT/PRIVATE, Flutter host-only + non-PRIVATE(따라서 CLUB_MEETING 포함) | co-host/PRIVATE는 기능 누락, CLUB_MEETING은 press-then-error | 제품 정책을 정한 뒤 서버·Flutter gate를 같은 capability/enum으로 통일 |
| P1 | CANCELED 상세 정책이 서버와 Flutter에서 다름 | 서버는 full `EventVo`를 반환하지만 Flutter는 역할과 무관하게 즉시 `AppBlockedState` | 환불/운영 정보 진입점이 사라지고 API에는 본문이 이미 노출 | 취소 상세을 정말 막을지 결정하고 서버 redaction 또는 취소 전용 요약 surface로 통일 |
| P1 | `HIDDEN` 이벤트가 서버에서 직접 조회될 수 있음 | `EventService#getEvent`는 DRAFT만 guard하고 HIDDEN은 guard하지 않음 | 숨김 상태의 본문 데이터가 API response로 내려갈 수 있음. UI는 차단하지만 네트워크 응답은 이미 받은 뒤임 | HIDDEN의 제품 의미를 결정하고 서버 guard 추가 여부 판단 |
| P1 | 결제 기한 직후 서버 API에 soft grace가 있음 | `payByWallet`은 `paymentDueAt`을 직접 비교하지 않고 fixedDelay 5분 만료 scheduler가 상태를 바꾼 뒤에야 거부 | 정상 스케줄러 운용이면 기한 뒤 약 다음 5분 주기 내외까지 결제될 수 있다. 실행 지연·실패가 가능해 5분은 하드 상한이 아니며 Flutter의 즉시 차단 시점과 다르다. | 하드 마감이 정책이면 잠금 획득 후 dueAt 인라인 검증 추가 |
| P1 | 결제 대기 좌석 가중치가 EventVo에 없음 | `reservedPaymentPendingCount`는 신청 건수, 실제 server reservation은 party size 합계 | 게스트 동반 신청에서 상세 CTA가 남은 좌석을 실제보다 크게 볼 수 있음 | `reservedPaymentPendingSeatCount` 등 weighted 값을 서버에서 내려 CTA에 사용 |
| P2 | 유사 이벤트 실패가 사용자/QA에게 드러나지 않음 | `similarEventsProvider`는 failure를 `[]`로 반환 | 추천 장애가 빈 상태처럼 보임 | 로그/telemetry 또는 QA-only evidence 필요 |
| P2 | 핏 프리뷰 장애와 정상 비노출을 UI에서 구분하지 않음 | `EventFitPreviewSection`은 loading/error/전 신호 부재를 모두 `SizedBox.shrink()`로 처리 | API 장애가 k-익명 gate 미달처럼 보임 | telemetry 또는 QA-only 진단 신호를 추가하되 사용자에게 원모수는 노출하지 않음 |

## 9. 수용 기준

### AC-01. OPEN 이벤트 일반 상세

Given 로그인 사용자가 `OPEN` 이벤트 상세에 진입한다.
When 서버가 `myAttendanceStatus=NOT_ATTENDING`, `currentCapacity < baseCapacity`를 반환한다.
Then Flutter는 제목/일정/주소/정원/호스트 정보를 표시하고 하단 CTA를 `참석 신청`으로 표시한다.

### AC-02. DRAFT 이벤트 비호스트 접근

Given 사용자가 host/co-host가 아닌 상태로 `DRAFT` 이벤트 ID에 직접 접근한다.
When `GET /api/v1/events/{eventId}`를 호출한다.
Then 서버는 `EVENT_NOT_FOUND`로 마스킹하고 Flutter는 not found blocked state를 표시한다.

### AC-03. DRAFT 이벤트 host 접근

Given host가 자기 `DRAFT` 이벤트 상세에 진입한다.
When `GET /api/v1/events/{eventId}`가 성공한다.
Then Flutter는 host status hint와 `수정`, `발행`, `신청서 관리`, `수용인원 설정` 등 운영 CTA를 표시한다.

### AC-04. 클럽 비멤버 제한

Given 클럽 이벤트에 비멤버가 접근한다.
When 서버가 viewer context를 `myMembershipStatus=NONE`으로 계산한다.
Then 서버는 민감 상세 필드 일부를 제거하고 Flutter는 제한 안내와 클럽 가입 CTA를 표시한다.

### AC-05. 참석 확정 사용자

Given 사용자가 `ATTENDING` attendance를 가진다.
When 상세 화면이 `myAttendanceStatus=ATTENDING`을 수신한다.
Then 하단 CTA는 `참석 취소`이고 참석자, 체크인, 위치, 사진첩 진입이 열린다.

### AC-06. 대기열 승격 강조

Given 사용자의 attendance가 `WAITING -> ATTENDING`으로 승격되어 `myPromotedFromWaitlist=true`이다.
When 같은 디바이스에서 아직 해당 이벤트의 promoted notice를 본 적이 없다.
Then Flutter는 한 번만 `참석이 확정됐어요` 상태 힌트를 표시하고 storage에 seen을 기록한다.

### AC-07. .ics 내보내기

Given 사용자가 더보기 메뉴에서 `.ics` 내보내기를 선택한다.
When `GET /api/v1/events/{eventId}/calendar`가 bytes를 반환한다.
Then Flutter는 `event-{eventId}.ics` 임시 파일을 만들고 시스템 share sheet를 연다.

### AC-08. 유료 승인제 결제 대기

Given application이 `APPROVED_PENDING_PAYMENT`이고 결제 기한이 남아 있다.
When 사용자가 이벤트 상세 화면에 진입한다.
Then 서버는 viewer status와 결제 금액/기한을 `EventVo`에 내려야 하고 Flutter는 `결제하고 참석 확정` CTA를 표시해야 한다.
현재 구현은 이 기준을 충족한다.

### AC-09. 결제 후 참석 확정

Given 사용자가 `APPROVED_PENDING_PAYMENT` 상태에서 결제 CTA를 누른다.
When 지갑 결제가 성공한다.
Then application은 `APPROVED`, attendance는 `ATTENDING`으로 전환되어야 한다.
현재 `EventPrepaymentService.payByWallet()`이 지갑 차감과 `confirmPaymentAndAttend()`를 같은 트랜잭션으로 묶어 이 기준을 충족한다. 확정 시 정원 부족이면 지갑 차감과 결제 row도 함께 롤백한다.

### AC-10. 수용인원 설정 capability

Given 상세 뷰어가 host, 공동호스트 또는 클럽 `ADMIN/OWNER` 중 하나이다.
When 서버가 `canManageCapacity=true`를 반환한다.
Then Flutter 상세는 `수용인원 설정` 행을 노출하고 `/capacity-settings` route guard도 같은 boolean으로 통과시킨다.

### AC-11. CLOSED/CANCELED 표현

Given 서버가 `CLOSED`를 반환한다.
When Flutter가 상세를 렌더한다.
Then 본문은 흐리거나 차단하지 않고 `종료` 배지와 종료 후 전용 행을 보여야 한다.

Given 서버가 `CANCELED`를 반환한다.
When Flutter가 상태를 파싱한다.
Then 현재 구현은 역할과 무관하게 본문·더보기·하단바 대신 `AppBlockedState`만 보여 준다.

### AC-12. 이벤트 삭제 상태 정합성

Given host/co-host가 `DRAFT` 이벤트를 보고 있다.
When 삭제 진입점을 찾는다.
Then 서버 계약상 `DELETE`가 성공할 수 있는 상태이므로 DRAFT에서만 삭제 CTA가 보여야 한다.
현재 구현은 DRAFT에 CTA가 없고 CLOSED에 CTA가 있어 이 기준을 충족하지 못한다.

### AC-13. 다음 회차 gate

Given 사용자가 `이 이벤트로 새로 만들기`를 선택한다.
When Flutter와 서버가 권한·유형을 검사한다.
Then 양쪽이 같은 역할과 `EventType` 집합을 허용해야 한다.
현재 서버(host/co-host, INDEPENDENT/PRIVATE)와 Flutter(host-only, non-PRIVATE)가 달라 이 기준을 충족하지 못한다.

## 10. 검증 현황

| 검증 | 확인하는 것 | 현재 판단 |
|---|---|---|
| `seed_event_detail_role_controls_test.dart` | host/member가 신청서 관리/수용인원 설정 노출 여부를 다르게 본다 | 상세 권한 CTA 일부 검증됨 |
| `run_p41_baseline_smoke_matrix.sh event_detail_host_controls/member_controls` | 로컬 seed backend 기준 host/member 상세 제어 smoke | 상세 권한 회귀 가드 있음 |
| `seed_event_list_badge_matrix_test.dart` | host detail manage surface, member readonly surface, waitlist detail cancel surface | 상세 진입/배지/권한 surface 보강됨 |
| `run_p31_event_list_badge_matrix.sh` | P31 이벤트 목록/상세 badge matrix | 상세 상태 surface 일부 검증됨 |
| `seed_event_payment_authoring_test.dart` | 상세 정보 surface에 가격/주소 등 메타 표시 | 정보 섹션 일부 검증됨 |
| `run_p53_event_payment_authoring_matrix.sh event_detail_info_surface` | 이벤트 상세 가격/주소 surface | 유료 정보 표시는 검증됨 |
| `PaidApprovalFlowE2ETest` | 승인 전 결제 차단, 승인 후 결제의 `PAID + APPROVED + ATTENDING`, 만료·중복·정원 확정 롤백·제재 차단 | 서버 서비스 간 흐름 검증됨 |
| `EventPrepaymentServiceTest` | 전용 지갑 결제, 자동충전, 멱등 가드, 회계/결제 기록 위임 | 서버 단위 검증됨 |
| Flutter 결제 대기 CTA | `pendingPayment/paymentExpired` 분기와 실제 endpoint 호출 | 소스 배선은 확인됨. 이 문서 실측 범위에서 기기 E2E 결과는 별도 확인하지 않음 |
| `EventFitPreviewServiceTest`, `EventFitPreviewControllerTest` | 상세 gate, evidence roster, block 제외, bucket·비율·성향 k-익명 gate, JSON 키 생략 | 서버 단위/controller 계약 검증됨 |
| `EventHostCardServiceTest` | 재방문 배지 3개/15명/30% 경계와 block degrade | 서버 단위 검증됨 |
| `event_fit_preview_section_test.dart`, `event_host_card_test.dart` | coarse 신호·빈 상태 숨김·호스트 배지 렌더 | Flutter widget 검증 파일 존재 |
| `EventServiceTest` | 다음 회차 딥카피 happy path, DRAFT 삭제 성공, OPEN 삭제 거부, co-host 수정 권한 | 서버 핵심 단위 근거 있음. clone 유형/권한 edge와 CLOSED/CANCELED 삭제는 별도 테스트 없음 |
| `EventViewerContextServiceTest` | host/co-host/club OWNER/ADMIN/참가자 capability matrix | 서버 역할 계산 단위 검증됨 |
| Flutter lifecycle 상태 widget test | DRAFT/CLOSED/CANCELED 액션바와 clone gate | 현재 전용 테스트 파일을 찾지 못함 |
| HIDDEN direct 조회 테스트 | 서버가 숨김 이벤트를 직접 조회 차단하는지 | 검증 없음. 정책 결정 필요 |

## 11. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 삭제 CTA | DRAFT에만 노출하고 확인 후 호출; CLOSED delete 제거. CANCELED/HIDDEN 정책과 별도 처리 |
| 정책/구현 | 다음 회차 | co-host 및 PRIVATE 허용 여부, CLUB_MEETING 지원 여부를 결정하고 서버/Flutter gate 통일 |
| 정책 | CANCELED 상세 | full-block, read-only 요약, 환불/운영 전용 surface 중 하나로 확정하고 API 노출과 맞춤 |
| 정책 | `HIDDEN` 조회 | 숨김 이벤트를 API에서 404 마스킹할지, UI 차단만 할지 결정 |
| 정책 | 결제 하드 마감 | 정상 운용 시 약 5분 주기인 soft grace(상한 아님)를 허용할지, `payByWallet`에서 dueAt을 인라인 검증할지 결정 |
| 테스트 | payment pending 상세 | 승인 후 결제 대기 CTA·기한 만료 재신청·결제 성공 후 화면 갱신의 Flutter E2E 근거를 연결 |
| 테스트 | restricted club detail | 서버 field redaction과 Flutter restricted notice를 같은 시나리오에서 검증 |

## 12. 변경 이력

- **2026-07-29 (상태·권한·lifecycle CTA 재실측)**: `CANCELED`는 `AppBlockedState` 조기 반환, `CLOSED`는 overlay 없는 정상 본문+badge임을 교정했다. DRAFT-only 서버 삭제와 CLOSED 삭제 CTA의 상태 역전, host-only/non-PRIVATE Flutter 복제 gate와 host/co-host+INDEPENDENT/PRIVATE 서버 gate의 불일치, co-host/club operator capability 실제 계산을 Controller/Service/Flutter caller 기준으로 추가했다.
- **2026-07-29 (current source 재실측)**: 과거 Gap으로 남아 있던 유료 승인제 결제 대기 필드·viewer status·전용 선결제 endpoint·결제 후 참석 확정 흐름이 구현되어 있음을 Controller/Service/VO/Flutter provider에서 확인했다. `reservedPaymentPendingCount`는 좌석 수가 아니라 신청 건수라 guest party 가중치 Gap이 있음을 분리했다. `canManageCapacity` 서버 capability와 Flutter 상세/route 소비, k-익명 `fit-preview`, 호스트 재방문 배지를 추가했다. 결제 만료 fixedDelay 5분은 하드 상한이 아니라 정상 cadence로 교정했다.
