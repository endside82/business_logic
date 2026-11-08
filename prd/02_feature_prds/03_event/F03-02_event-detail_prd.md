# F03-02. 이벤트 상세 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

이벤트 상세 조회는 현재 **일반 상세 조회, DRAFT 비공개 마스킹, 클럽 비멤버 제한, 서버 능력플래그 기반 운영 CTA, 유료 승인제 결제 대기, .ics 내보내기**까지 실제 서버와 Flutter 소스가 맞물려 있다. 서버는 `GET /api/v1/events/{eventId}`에서 `EventVo`와 viewer context를 내려주고, Flutter는 `/home/events/:eventId`에서 이를 바탕으로 상세 화면과 하단 CTA를 결정한다. 다만 상태별 렌더링과 이벤트 복제·삭제 CTA는 서버 계약과 완전히 맞지 않는다.

2026-07-29 재실측 결과, 이전 문서가 Gap으로 적었던 결제 대기 승인제 흐름은 이미 닫혀 있다. 서버 `EventVo`에는 `myPaymentDueAt`, `myPaymentRequired`, `myPayableAmount`, `reservedPaymentPendingCount`가 있고, `EventViewerContextService`는 `APPROVED_PENDING_PAYMENT → PENDING_PAYMENT`, `PAYMENT_EXPIRED → PAYMENT_EXPIRED`를 변환한다. 단 `reservedPaymentPendingCount`는 예약 **좌석 수가 아니라 신청 건수**다. 서버의 실제 hold는 party size 합계라 게스트 동반 신청에서는 Flutter 만석 판단이 과소 계산된다. Flutter 결제 CTA는 범용 지갑 결제가 아니라 `POST /api/v1/events/{eventId}/prepayment/wallet`을 호출하며, 서버는 지갑 차감·회계 기록·`Application APPROVED`·`EventAttendance ATTENDING`을 한 트랜잭션에서 확정한다.

현재 판정은 **상세 조회/권한/기본 CTA/유료 승인제 결제 경로/개인화 핏 프리뷰 사용 가능, 삭제·복제 lifecycle CTA는 정합성 Gap**이다. 상세 본문에는 증거등급 참석 이력을 k-익명성 규칙으로 가공한 “나와의 핏”과 원점수를 숨긴 “재방문 많은 호스트” 배지도 실제 배선돼 있다. `CANCELED`는 응답을 받은 뒤 화면 전체를 `AppBlockedState`로 교체하고, `CLOSED`는 흐릿한 오버레이 없이 정상 본문에 `종료` 배지만 붙인다. 가장 큰 현재 위험은 Flutter가 서버에서 유일하게 삭제 가능한 `DRAFT`에는 삭제 버튼을 주지 않고, 삭제 불가능한 `CLOSED`에는 삭제 버튼을 노출하는 상태 역전이다. 복제도 Flutter는 host-only·PRIVATE 숨김인데 서버는 co-host도 받고 PRIVATE를 허용하며, 반대로 Flutter가 노출하는 `CLUB_MEETING`은 서버가 거부한다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `EventPrepaymentController`, `EventFitPreviewController`, `EventService`, `EventViewerContextService`, `EventVo`, `ApplicationStatus`, `EventStatus`, `EventType`, `EventVisibility`. 앱: `event_detail_screen.dart`, `event_api.dart`, `event_repository.dart`, `event_vo.dart`, `event_status.dart`, `event_viewer_status.dart`, `event_detail_provider.dart`, `attendance_action_provider.dart`, `event_action_bar.dart`, `event_info_section.dart`.

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
17. 상태를 파싱한 직후 Flutter는 `CANCELED`를 본문·하단바가 없는 `AppBlockedState`로 반환한다. 모임 상태는 `DRAFT`·`OPEN`·`CLOSED`·`CANCELED` 넷이고, 운영자 숨김은 상태가 아니라 따로 둔 표지라 이 차단과 상관없다(아래 숨김 행). `DRAFT`는 `canEditEvent=false`일 때 같은 방식으로 막지만, 정상 서버 경로에서는 비권한 DRAFT가 이미 `EVENT_NOT_FOUND`이므로 보통 not-found 분기로 간다. `CLOSED`는 차단하지 않고 전체 본문을 렌더하며 `EventInfoSection`의 `종료` 배지와 종료 후 전용 행만 추가한다.
18. 더보기의 `이 이벤트로 새로 만들기`는 `isHost && eventType != PRIVATE`일 때만 보이고, `POST /api/v1/events/{eventId}/next-occurrence` 성공 시 새 DRAFT의 `/edit-event/{id}`로 이동한다. 서버와 달리 co-host·PRIVATE에는 숨고, `CLUB_MEETING`에는 잘못 노출된다.
19. `EventActionBar`는 host/co-host에게 DRAFT=`수정·발행`, OPEN=`수정·종료·취소`, 그 밖의 상태=`삭제`를 만든다. 화면 상단 차단을 고려하면 실제 상세에서 삭제가 보이는 정상 경로는 `CLOSED` host/co-host뿐이다. 그러나 서버 `DELETE`는 DRAFT만 허용하므로 이 버튼은 400이 되고, 정작 삭제 가능한 DRAFT에는 진입점이 없다.

## 4. 제품 규칙

### 4.1 나와의 핏(개인 식별 막기)
- 근거 명단: 체크인이 한 건이라도 있으면 체크인한 회원, 없으면 참석자에서 노쇼 확정·소명 중을 뺀 회원이다. 호스트·공동호스트·게스트·나와 차단 관계인 사람은 개인화 모수에서 뺀다.
- 아는 사람·비슷한 성향 신호는 호스트·공동호스트·참석자만 받는다.
- 단골·초면 비율은 모수 5명 이상이고 0이 아닌 쪽이 각각 5명 이상일 때만 10% 단위로 보인다.
- 비슷한 성향은 최신 제출 점수에서 공통 축 4개 이상, 평균 절대차 20 이하다. 점수가 있는 후보가 5명 미만이면 내지 않는다.
- 성향 축 분포는 LOW 0~33, MID 34~66, HIGH 67~100 이다. 축 모수 5명 이상이고 0이 아닌 구간이 각각 5명 이상일 때만 그 축을 보인다.
- 구성 분포는 공개이고 OPEN·CLOSED 이며 숨기지 않은 모임이면 로그인 사용자 누구나, 그 밖은 호스트·공동호스트·참석자만 본다.
- 원점수·원인원은 내지 않는다. 신호가 모두 없거나 로딩·오류면 섹션을 조용히 숨긴다.

### 4.2 다음 회차 만들기
- 호스트 또는 공동호스트가 부를 수 있다. 새 모임의 호스트는 부른 사람이 아니라 원본 호스트다.
- 원본이 취소됐거나 숨겨졌으면 거절한다. 독립·비공개 모임만 되고 클럽 모임과 정기모임 회차는 안 된다. 주최 제한 제재 중이면 거절한다.
- 시작을 주지 않으면 원본 시작 + 7일이고 길이는 원본과 같다. 시작이 과거면 거절한다.
- 결과는 새 DRAFT 다. 선입금·환불 정책·플랜 연결·공동호스트는 새로 만들어 옮기고, 참가자·결제·정산·후기·사진은 옮기지 않는다.

### 4.3 역할별 권한
- 클럽 OWNER·ADMIN(호스트 아님)은 수정·신청 관리·공지를 못 한다. 출석·명단 관리와 정원 설정은 된다. 생명주기 버튼과 복제는 받지 않는다.
- 공동호스트의 출석·모더레이션 등 세부 권한은 F03-03 §12 표를 따른다.
- 일반 참가자는 참석 행이 있으면 명단만 본다. 일반 클럽 회원이라는 것만으로는 사진첩이 열리지 않는다.

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
| 운영자가 숨긴 모임 | 상태와 따로 둔 숨김 표지. 호스트·활성 공동 호스트·참석/대기·끝나지 않은 신청·클럽 회원·끝나지 않은 결제가 걸린 회원만 상세를 열고, 그 밖은 `EVENT_NOT_FOUND`(공유 링크로도 열지 않음). 호스트·활성 공동 호스트에게만 `operatorHidden=true` | 본문 위에 운영자 숨김 안내 | 본문 유지, 새 신청·참석·찜은 받지 않음 | 일치 |
| clone host + INDEPENDENT | 서버 허용 | 메뉴 노출 | 새 DRAFT edit route | 일치 |
| clone co-host + INDEPENDENT | 서버 `validateOwnership`상 허용 | 메뉴 숨김 | 호출 진입점 없음 | 불일치 |
| clone host + PRIVATE | 서버 허용 | 메뉴 숨김 | 호출 진입점 없음 | 불일치 |
| clone host + CLUB_MEETING | 서버 거부 | 메뉴 노출 | 탭 후 실패 toast | 불일치 |
| 유료 승인제 `APPROVED_PENDING_PAYMENT` | `PENDING_PAYMENT` + 결제 금액/기한/필요 여부 | `pendingPayment` | 카운트다운 + `결제하고 참석 확정` | 일치 |
| 결제 기한 만료 `PAYMENT_EXPIRED` | `PAYMENT_EXPIRED` | `paymentExpired` | `재신청` CTA | 일치 |

## 7. 서버-프론트 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `EventStatus` | `DRAFT`, `OPEN`, `CLOSED`, `CANCELED`(운영자 숨김은 상태와 따로 둔 표지) | 네 값을 읽고 모르는 값은 `unknown` | 일치 |
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
| 운영자 숨김 모임 직접 조회 | 당사자 밖은 404 `EVENT_NOT_FOUND` | 당사자에게 본문, 호스트·공동 호스트에게 숨김 안내 | 일치 |
| similar events failure | 서버 optional auth + list 반환 | 실패를 빈 리스트로 숨김 | UX는 안정적이나 장애 탐지 약함 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | 삭제 CTA 상태가 서버와 반대로 배치됨 | 서버는 DRAFT-only인데 `EventActionBar`는 DRAFT에 수정/발행, CLOSED에 삭제를 렌더. CANCELED는 상위 화면에서 차단 | 유효한 DRAFT를 앱에서 삭제할 수 없고 CLOSED 삭제는 매번 400 | DRAFT host/co-host에 확인형 삭제 CTA를 두고 CLOSED/CANCELED에서는 제거. 같은 매트릭스의 widget test 추가 |
| P1 | 복제 권한·유형 gate가 서버와 다름 | 서버 host/co-host + INDEPENDENT/PRIVATE, Flutter host-only + non-PRIVATE(따라서 CLUB_MEETING 포함) | co-host/PRIVATE는 기능 누락, CLUB_MEETING은 press-then-error | 제품 정책을 정한 뒤 서버·Flutter gate를 같은 capability/enum으로 통일 |
| P1 | CANCELED 상세 정책이 서버와 Flutter에서 다름 | 서버는 full `EventVo`를 반환하지만 Flutter는 역할과 무관하게 즉시 `AppBlockedState` | 환불/운영 정보 진입점이 사라지고 API에는 본문이 이미 노출 | 취소 상세을 정말 막을지 결정하고 서버 redaction 또는 취소 전용 요약 surface로 통일 |
| 해소됨 | 운영자가 숨긴 모임의 직접 조회 | 숨김은 상태가 아니라 운영자 표지다. 상세 열람 판정이 숨김·취소 모임을 당사자에게만 열고 그 밖은 `EVENT_NOT_FOUND` 로 존재를 숨긴다. 공유 링크로도 열지 않는다 | 당사자 밖에는 본문이 내려가지 않는다 | 없음 |
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
| 운영자 숨김 직접 조회 테스트 | 숨긴 모임을 당사자 밖에서 404 로 막는지 | 정책은 정해짐(당사자만 연다). 이 판정만 보는 전용 시험 파일은 이름으로 찾지 못함 |

## 11. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 삭제 CTA | DRAFT에만 노출하고 확인 후 호출; CLOSED delete 제거. CANCELED 정책과 별도 처리 |
| 정책/구현 | 다음 회차 | co-host 및 PRIVATE 허용 여부, CLUB_MEETING 지원 여부를 결정하고 서버/Flutter gate 통일 |
| 정책 | CANCELED 상세 | full-block, read-only 요약, 환불/운영 전용 surface 중 하나로 확정하고 API 노출과 맞춤 |
| 정책 | 결제 하드 마감 | 정상 운용 시 약 5분 주기인 soft grace(상한 아님)를 허용할지, `payByWallet`에서 dueAt을 인라인 검증할지 결정 |
| 테스트 | payment pending 상세 | 승인 후 결제 대기 CTA·기한 만료 재신청·결제 성공 후 화면 갱신의 Flutter E2E 근거를 연결 |
| 테스트 | restricted club detail | 서버 field redaction과 Flutter restricted notice를 같은 시나리오에서 검증 |
