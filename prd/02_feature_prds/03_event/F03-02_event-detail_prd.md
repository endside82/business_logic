# F03-02. 이벤트 상세 조회 PRD

## 1. 결론

이벤트 상세 조회는 현재 **일반 상세 조회, DRAFT 비공개 마스킹, 클럽 비멤버 제한, 호스트/멤버 CTA 분기, .ics 내보내기**까지는 실제 서버와 Flutter 소스가 맞물려 있다. 서버는 `GET /api/v1/events/{eventId}`에서 `EventVo`와 viewer context를 내려주고, Flutter는 `/home/events/:eventId`에서 이를 바탕으로 상세 화면과 하단 CTA를 결정한다.

다만 결제 대기 승인제 흐름은 아직 상세 화면 기준으로 닫혀 있지 않다. Flutter는 `myPaymentDueAt`, `myPaymentRequired`, `myPayableAmount`, `reservedPaymentPendingCount`, `PENDING_PAYMENT`/`PAYMENT_EXPIRED` viewer status를 기대하지만, 현재 서버 `EventVo`와 `EventViewerContextService`는 해당 상세 필드를 내려주거나 viewer status로 변환하지 않는다. 또한 서버에는 `ApplicationService.confirmPaymentAndAttend()`가 있지만 호출 경로가 없고, `WalletService.pay()`도 application 상태를 참석 확정으로 전환하지 않는다.

따라서 이 기능의 현재 판정은 **상세 조회/권한/기본 CTA는 사용 가능, 유료 승인제 결제 대기 CTA는 Gap**이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `community_api/src/main/java/com/endside/community/event/controller/EventController.java` | `GET /api/v1/events/{eventId}`, `GET /api/v1/events/{eventId}/calendar`, `GET /api/v1/events/{eventId}/similar` |
| Backend Service | `community_api/src/main/java/com/endside/community/event/service/EventService.java` | DRAFT guard, Redis 조회수 증가, user interaction 기록, `loadEventVoWithDetails` |
| Backend Viewer Context | `community_api/src/main/java/com/endside/community/event/service/EventViewerContextService.java` | `myMembershipStatus`, `myRole`, `myAttendanceStatus`, `myApplicationStatus`, `myPromotedFromWaitlist`, `wishlisted` 주입 |
| Backend VO/Enum | `EventVo.java`, `ApplicationStatus.java`, `EventStatus.java`, `EventType.java`, `EventVisibility.java`, `LocationType.java` | 실제 응답 필드, enum 값, Jackson boolean key |
| Backend Payment Boundary | `ApplicationService.java`, `WalletService.java` | `APPROVED_PENDING_PAYMENT` 존재 여부, 결제 후 참석 확정 호출 경로 부재 |
| Flutter API/Repository | `community_app/lib/data/api/event_api.dart`, `community_app/lib/data/repositories/event_repository.dart` | Retrofit endpoint와 `Result<T>` wrapping |
| Flutter Model | `community_app/lib/data/models/event/event_vo.dart`, `event_status.dart`, `event_viewer_status.dart` | 클라이언트가 기대하는 JSON field와 상태 parser |
| Flutter Provider | `community_app/lib/domain/providers/event/event_detail_provider.dart`, `attendance_action_provider.dart` | 상세 조회, 유사 이벤트, .ics export, 참석/결제 CTA 상태 |
| Flutter Screen/Widget | `event_detail_screen.dart`, `event_action_bar.dart` | route 진입, 본문 섹션, 제한 표시, 하단 CTA |
| Verification | `seed_event_detail_role_controls_test.dart`, `seed_event_list_badge_matrix_test.dart`, `seed_event_payment_authoring_test.dart`, `run_p41_baseline_smoke_matrix.sh`, `run_p31_event_list_badge_matrix.sh`, `run_p53_event_payment_authoring_matrix.sh` | 호스트/멤버 상세 권한, 상세 정보 surface, 이벤트 상세 진입 smoke |

## 3. 전체 동작 흐름

1. 사용자는 홈 이벤트 카드, 검색 결과, 알림 딥링크, 공유 링크, 내 이벤트 목록 등에서 `/home/events/:eventId`로 진입한다.
2. GoRouter는 `Routes.eventDetail = events/:eventId`를 `EventDetailScreen(eventId)`로 연결한다.
3. `EventDetailScreen`은 `eventDetailNotifierProvider(eventId)`와 `similarEventsProvider(eventId)`를 구독한다.
4. `EventDetailNotifier.build()`는 `EventRepository.getEventDetail()`을 호출하고, Repository는 `EventApi.getEventDetail()`로 `GET /api/v1/events/{eventId}`를 호출한다.
5. 서버 `EventController#getEvent`는 optional auth를 허용하고, 로그인 사용자가 있으면 `currentUserId`를 `EventService#getEvent(eventId, currentUserId)`에 전달한다.
6. `EventService#getEvent`는 이벤트를 조회한 뒤 `DRAFT` 이벤트에 비호스트/비공동호스트가 접근하면 `EVENT_NOT_FOUND`로 마스킹한다.
7. 통과한 조회는 Redis 조회수 증가(`TrendingService.recordView`)와 로그인 사용자의 view interaction 기록을 수행한다. interaction 기록 실패는 warning으로만 남기고 상세 조회는 계속한다.
8. `loadEventVoWithDetails`는 host nickname, co-host, viewer context, 클럽 비멤버 제한, 사전결제 환불 정보, private meeting detail을 `EventVo`에 주입한다.
9. Flutter는 `EventVo.status`, `clubId`, `myMembershipStatus`, `myRole`, `myAttendanceStatus`, `myApplicationStatus`, `isWishlisted`, `myPromotedFromWaitlist` 등을 바탕으로 본문 섹션과 하단 CTA를 결정한다.
10. `.ics` 내보내기는 `exportEventCalendarProvider`가 `GET /api/v1/events/{eventId}/calendar`를 호출하고, Flutter가 임시 파일로 저장한 뒤 share sheet를 연다.
11. 유사 이벤트는 `similarEventsProvider`가 `GET /api/v1/events/{eventId}/similar?limit=5`를 호출한다. 실패 시 빈 리스트로 숨긴다.

## 4. 서버 계약

### `GET /api/v1/events/{eventId}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `EventController#getEvent` |
| 인증 | optional. `@AuthenticationPrincipal(errorOnInvalidType = false)` |
| Path | `eventId: long` |
| 응답 | `EventVo` |
| DRAFT 접근 | host 또는 co-host만 허용. 그 외 `EVENT_NOT_FOUND` |
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
| `baseCapacity`, `currentCapacity`, `waitlistEnabled`, `approvalRequired`, `isClosed` | int/boolean | 하단 참석 CTA 판단 |
| `price`, `refundPolicy`, `prepaymentRefundPolicyType`, `refundDeadlineHours` | BigDecimal/enum/int | 유료/환불 안내 |
| `coHostUserIds` | List<Long> | 공동주최자 권한 판단 |
| `privateMeetingDetail` | PrivateMeetingDetailVo? | private event 섹션 |
| `plans` | List<EventPlanMapVo> | 연결 플랜 섹션 |
| `myMembershipStatus`, `myRole` | String? | 클럽 멤버/운영진 판단 |
| `myAttendanceStatus`, `myApplicationStatus` | String? | 본인 참석/신청 상태 |
| `myPromotedFromWaitlist` | boolean | 대기열 승격 1회성 강조 |
| `isWishlisted` | boolean, JSON key `wishlisted` | 찜 하트 상태 |
| `isClosed` | boolean, JSON key `closed` | 모집 마감 CTA |

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
| restricted club viewer | `clubId != null && !host && !staff && !clubMember && !applicant && !attending` |
| photos allowed | host/staff/club member/attending |
| manage applications | host/staff |
| check-in | host/staff/attending |
| location view | host/co-host/attending |
| bottom CTA capacity full | `currentCapacity + reservedPaymentPendingCount >= baseCapacity` |
| promoted notice | `myPromotedFromWaitlist && !promotedSeen && viewerStatus == attending` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 비로그인 + OPEN | optional auth, viewer context EMPTY | `currentUserId == null` | 상세 조회 가능, 찜/참석 액션은 로그인 유도 | 일치 |
| 일반 로그인 + OPEN + 미참석 | `myAttendanceStatus = NOT_ATTENDING` | `EventViewerStatus.notAttending` | `참석 신청` CTA | 일치 |
| 일반 로그인 + 승인 대기 | application `PENDING` -> `PENDING_APPLICATION` | `pendingApplication` | `신청 검토중` disabled | 일치 |
| 일반 로그인 + 참석 확정 | attendance 우선, `ATTENDING` | `attending` | `참석 취소`, 참석자/체크인/사진첩 가능 | 일치 |
| 일반 로그인 + 대기열 | attendance `WAITING` | `waitlisted` | `대기 취소`, 대기열/참석자 가능 | 일치 |
| host/co-host + DRAFT | 서버 DRAFT guard 통과 | host/co-host branch | 수정/발행/관리 메뉴 | 일치 |
| 비host + DRAFT | 서버가 `EVENT_NOT_FOUND` | not found blocked state | "이벤트를 찾을 수 없습니다" 계열 | 일치 |
| 비멤버 + 클럽 이벤트 | 서버가 description/addressDetail/onlineUrl/privateMeetingDetail/plans 제거 | restricted notice + 일부 섹션 숨김 | 클럽 가입 CTA 중심 | 대체로 일치 |
| `CANCELED` | 서버는 상세 응답 가능 | screen에서 `AppBlockedState` | 본문 전체 차단 | UI 차단은 있으나 서버 응답 노출 리스크 존재 |
| `HIDDEN` | 서버 `getEvent`에 HIDDEN guard 없음 | screen에서 `AppBlockedState` | 본문 전체 차단 | 서버 차단 여부 결정 필요 |
| 유료 승인제 `APPROVED_PENDING_PAYMENT` | `ApplicationStatus`는 존재 | viewer status 변환 없음 | 결제 CTA에 도달하기 어려움 | Gap |
| 결제 기한 만료 `PAYMENT_EXPIRED` | `ApplicationStatus`는 존재 | viewer status 변환 없음 | 재신청 CTA에 도달하기 어려움 | Gap |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `EventStatus` | `DRAFT`, `OPEN`, `CLOSED`, `CANCELED`, `HIDDEN` | parser가 `CANCELED`/`CANCELLED` 모두 처리 | 일치 |
| `EventType` | `INDEPENDENT`, `CLUB_MEETING`, `PRIVATE` | String으로 수신 | 일치 |
| `isClosed` JSON key | Java field `isClosed` -> Jackson key `closed` | `@JsonKey(name: 'closed')` | 일치 |
| `isWishlisted` JSON key | Java field `isWishlisted` -> Jackson key `wishlisted` | `@JsonKey(name: 'wishlisted')` | 일치 |
| viewer membership | `ACTIVE`, `PENDING`, `BANNED`, `NONE` | `ClubMembershipStatus.fromString` | 일치 |
| viewer attendance | `ATTENDING`, `WAITING`, `PENDING_APPLICATION`, `ENDED`, `NOT_ATTENDING` | parser 처리 | 대체로 일치 |
| viewer payment status | 서버 application enum에는 `APPROVED_PENDING_PAYMENT`, `PAYMENT_EXPIRED` 존재 | parser는 `PENDING_PAYMENT`, `PAYMENT_EXPIRED` 기대 | 불일치 |
| payment detail fields | Java `EventVo`에 없음 | Dart `EventVo`는 `myPaymentDueAt`, `myPaymentRequired`, `myPayableAmount` 기대 | 불일치 |
| pending payment capacity count | Java `EventVo`에 없음 | Dart `reservedPaymentPendingCount` 기본 0으로 capacity 계산 | 불일치 가능 |
| payment confirmation | `ApplicationService.confirmPaymentAndAttend()` 존재, 호출처 없음 | `AttendanceActionNotifier.payForApprovedApplication()`은 `WalletRepository.pay()`만 호출 | 불일치 |
| `HIDDEN` 직접 조회 | 서버 guard 없음 | UI blocked state | 서버 정책 결정 필요 |
| similar events failure | 서버 optional auth + list 반환 | 실패를 빈 리스트로 숨김 | UX는 안정적이나 장애 탐지 약함 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | 유료 승인제 결제 대기 CTA가 상세 화면에서 닫히지 않음 | Flutter는 `myPaymentDueAt/myPayableAmount/PENDING_PAYMENT`를 기대하지만 Java `EventVo`와 `resolveMyAttendanceStatus`가 제공하지 않음 | 승인 후 결제해야 하는 사용자가 상세 화면에서 결제 CTA를 못 볼 수 있음 | `EventViewerContextService`가 `APPROVED_PENDING_PAYMENT -> PENDING_PAYMENT`, `PAYMENT_EXPIRED -> PAYMENT_EXPIRED`를 반환하고 `EventVo`에 payment fields를 주입해야 함 |
| P0 | 결제 후 참석 확정 호출 경로 부재 | `ApplicationService.confirmPaymentAndAttend()` 호출처가 없음. `WalletService.pay()`는 point transaction만 만들고 application/attendance 전환을 호출하지 않음 | 사용자가 결제했지만 application이 승인/attendance로 전환되지 않는 돈-상태 불일치 가능 | Wallet 결제 boundary에서 application status 검증 후 `confirmPaymentAndAttend` 또는 도메인 이벤트를 호출해야 함 |
| P1 | 정원 계산이 결제 대기 예약 수를 반영하지 못할 수 있음 | Flutter는 `reservedPaymentPendingCount`를 더하지만 서버 `EventVo`에는 해당 필드가 없음 | 결제 대기자가 정원을 점유해야 하는 정책이면 CTA가 과하게 열릴 수 있음 | 서버 응답 필드 추가 또는 Flutter 계산 제거 중 하나 결정 |
| P1 | `HIDDEN` 이벤트가 서버에서 직접 조회될 수 있음 | `EventService#getEvent`는 DRAFT만 guard하고 HIDDEN은 guard하지 않음 | 숨김 상태의 본문 데이터가 API response로 내려갈 수 있음. UI는 차단하지만 네트워크 응답은 이미 받은 뒤임 | HIDDEN의 제품 의미를 결정하고 서버 guard 추가 여부 판단 |
| P2 | 유사 이벤트 실패가 사용자/QA에게 드러나지 않음 | `similarEventsProvider`는 failure를 `[]`로 반환 | 추천 장애가 빈 상태처럼 보임 | 로그/telemetry 또는 QA-only evidence 필요 |
| P2 | 권한 판단 로직이 screen local과 `event_permission_provider.dart`로 중복됨 | screen의 restricted guard는 applicant를 허용하지만 provider getter는 clubId/context 없이 단순 계산 | 다른 화면에서 provider 재사용 시 미묘한 권한 차이 가능 | event permission 모델을 상세 화면 분기와 동기화 |

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
현재 구현은 이 기준을 충족하지 못한다.

### AC-09. 결제 후 참석 확정

Given 사용자가 `APPROVED_PENDING_PAYMENT` 상태에서 결제 CTA를 누른다.  
When 지갑 결제가 성공한다.  
Then application은 `APPROVED`, attendance는 `ATTENDING`으로 전환되어야 한다.  
현재 `WalletService.pay()`와 `ApplicationService.confirmPaymentAndAttend()` 사이 호출 경로가 없어 이 기준을 충족하지 못한다.

## 10. 검증 현황

| 검증 | 확인하는 것 | 현재 판단 |
|---|---|---|
| `seed_event_detail_role_controls_test.dart` | host/member가 신청서 관리/수용인원 설정 노출 여부를 다르게 본다 | 상세 권한 CTA 일부 검증됨 |
| `run_p41_baseline_smoke_matrix.sh event_detail_host_controls/member_controls` | 로컬 seed backend 기준 host/member 상세 제어 smoke | 상세 권한 회귀 가드 있음 |
| `seed_event_list_badge_matrix_test.dart` | host detail manage surface, member readonly surface, waitlist detail cancel surface | 상세 진입/배지/권한 surface 보강됨 |
| `run_p31_event_list_badge_matrix.sh` | P31 이벤트 목록/상세 badge matrix | 상세 상태 surface 일부 검증됨 |
| `seed_event_payment_authoring_test.dart` | 상세 정보 surface에 가격/주소 등 메타 표시 | 정보 섹션 일부 검증됨 |
| `run_p53_event_payment_authoring_matrix.sh event_detail_info_surface` | 이벤트 상세 가격/주소 surface | 유료 정보 표시는 검증됨 |
| 결제 대기 CTA 테스트 | `APPROVED_PENDING_PAYMENT` 상세 CTA와 결제 후 attendance 전환 | 검증 없음. 구현 Gap |
| HIDDEN direct 조회 테스트 | 서버가 숨김 이벤트를 직접 조회 차단하는지 | 검증 없음. 정책 결정 필요 |

## 11. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 유료 승인제 상세 응답 | `EventVo`에 payment due/payable/reserved count를 추가할지, 별도 endpoint로 분리할지 결정 |
| 구현 | 결제 후 application/attendance 전환 | `WalletService.pay()`에서 event application 상태를 검증하고 `confirmPaymentAndAttend()`를 호출하는 boundary 필요 |
| 정책 | `HIDDEN` 조회 | 숨김 이벤트를 API에서 404 마스킹할지, UI 차단만 할지 결정 |
| 테스트 | payment pending 상세 | 승인 후 결제 대기 상세 CTA, 기한 만료 재신청, 결제 성공 후 참석 확정 E2E 추가 |
| 테스트 | restricted club detail | 서버 field redaction과 Flutter restricted notice를 같은 시나리오에서 검증 |
