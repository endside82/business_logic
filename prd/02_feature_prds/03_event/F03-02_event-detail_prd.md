# F03-02. 이벤트 상세 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따릅니다.

> **2026-11-22 대조 범위:** 삭제·다음 회차 만들기·취소 후 복구 입구를 현재 소스와 맞췄다. 결제·핏·클럽 상세 권한 등 나머지 항목은 이번 전체 문서 갱신에서 후속 대조 중이며, 과거 시험 설명을 현재 버전의 통과 기록으로 사용하지 않는다.

## 1. 결론

이벤트 상세는 서버가 허용한 열람 범위와 행동 권한에 따라 본문·신청·운영 입구를 제공한다. 공유 링크도 같은 열람 판정을 거치며, 초안은 호스트와 유효한 공동호스트만 볼 수 있다.

현재 초안의 하단 행동은 **수정·공개**이고 **삭제는 더보기 메뉴 맨 아래 한 곳**에 있다. 정기모임 회차에는 이 삭제 입구를 두지 않는다. 종료된 이벤트에는 삭제 버튼이 없고 종결 안내를 표시한다. 삭제할 수 없는 돈·배정 연결이 있으면 서버가 거절하므로 초안이라는 이유만으로 삭제 성공을 보장하지 않는다.

다음 회차 만들기는 호스트·유효한 공동호스트의 독립·비공개 모임에 열리며 클럽 모임·정기모임 회차·취소·운영자 숨김 모임은 제외한다. 상세·지난 이벤트·결과 화면은 공통 판정과 실행 흐름을 사용한다. 과거 문서의 ‘초안 삭제 입구 없음’, ‘종료된 이벤트에 삭제 노출’, ‘공동호스트·비공개 복제 누락’은 현재 결함이 아니다.

취소된 이벤트는 일반 본문을 차단하지만 정산·환불 내역과 모임 대화로 갈 수 있는 별도 입구가 조건에 따라 남는다. ‘취소하면 모든 복구 입구가 사라진다’는 설명도 현재와 다르다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `EventDetailQueryService`, `EventEntryService`, `EventPrepaymentController`, `EventFitPreviewController`, `EventService`, `EventViewerContextService`, `EventVo`, `ApplicationStatus`, `EventStatus`, `EventType`, `EventVisibility`. 앱: `event_detail_screen.dart`, `event_api.dart`, `event_repository.dart`, `event_vo.dart`, `event_status.dart`, `event_viewer_status.dart`, `event_detail_provider.dart`, `attendance_action_provider.dart`, `event_action_bar.dart`, `event_info_section.dart`.

## 3. 전체 동작 흐름

1. 사용자는 홈 이벤트 카드, 검색 결과, 알림 딥링크, 공유 링크, 내 이벤트 목록 등에서 `/home/events/:eventId`로 진입한다.
2. GoRouter는 `Routes.eventDetail = events/:eventId`를 `EventDetailScreen(eventId)`로 연결한다.
3. `EventDetailScreen`은 `eventDetailNotifierProvider(eventId)`와 `similarEventsProvider(eventId)`를 구독한다.
4. `EventDetailNotifier.build()`는 `EventRepository.getEventDetail()`을 호출하고, Repository는 `EventApi.getEventDetail()`로 `GET /api/v1/events/{eventId}`를 호출한다.
5. 서버 `EventController#getEvent`는 선택적 로그인 정보와 공유 토큰을 `EventDetailQueryService#getEvent`에 전달한다. 직접 주소·공유 토큰도 상세 열람 권한을 우회하지 않는다.
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
17. 취소된 이벤트는 일반 본문 대신 차단 안내를 표시한다. 호스트·참석자 또는 정산 의무가 있는 사용자에게 정산·환불 내역 입구를, 대화 권한이 있으면 모임 대화 입구를 제공한다. 종료된 이벤트는 본문과 종료 표시를 유지한다. 운영자 숨김은 이벤트 상태와 별도 표지다.
18. 더보기의 다음 회차 만들기는 수정 권한과 공통 유형·상태 판정으로 노출한다. 독립·비공개만 허용하고 취소·숨김·클럽 모임·정기모임 회차는 제외한다. 제공자 범위가 열렸으면 배정만 이어갈지 묻고, 생성 성공 뒤 새 초안 편집으로 이동한다. 진행 중 중복 명령을 제한하며 실패하면 현재 상세에 남는다.
19. 정기모임 회차가 아닌 초안은 하단에 수정·공개, 더보기 맨 아래에 삭제를 둔다. 삭제 확인을 취소하면 요청하지 않는다. 성공하면 목록을 갱신하고 이전 화면으로 돌아가며, 실패하면 상세에 남아 오류를 안내한다. 결과를 알 수 없는 실패도 관련 자료를 재조회한다. 종료·취소에는 삭제 입구가 없다.

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
- 상세의 더보기·지난 이벤트·결과 화면은 공통 노출 판정과 실행 흐름을 사용한다. 생성 명령은 중복 실행을 제한하며, 같은 요청을 다시 처리할 때의 키를 서버에 보낸다.
- 호스트 또는 현재 유효한 공동호스트가 부를 수 있다. 새 모임의 호스트는 부른 사람이 아니라 원본 호스트다.
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
| host/유효한 co-host + DRAFT | 서버는 초안 소유·정기모임 여부·배정/돈 연결을 확인 | 하단 수정·공개, 더보기 삭제 | 확인 후 성공 시 목록 갱신·복귀. 거절 시 오류 안내 | 현재 소스 대조 |
| 비host + DRAFT | 서버가 `EVENT_NOT_FOUND` | not found blocked state | "이벤트를 찾을 수 없습니다" 계열 | 일치 |
| 비멤버 + 클럽 이벤트 | 서버가 description/addressDetail/onlineUrl/privateMeetingDetail/plans 제거 | restricted notice + 일부 섹션 숨김 | 클럽 가입 CTA 중심 | 대체로 일치 |
| `CLOSED` 일반/참석자 | 서버 상세 응답 | 정상 본문 + `종료` 배지, 참석자는 후기/피드백/사진첩 | 오버레이 없이 회고 surface 유지 | 일치 |
| `CLOSED` host/co-host | 삭제 거절 | 삭제 없이 종결 안내 | 기록을 보존하고 종료 내용을 조회 | 현재 소스 대조 |
| `CANCELED` 열람 허용 당사자 | 상세 열람 권한을 먼저 검사 | 일반 본문 차단과 조건부 정산·환불/대화 입구 | 허용된 후속 업무로 이동 | 현재 소스 대조 |
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
| `CANCELED` 표현 | 당사자의 열람 권한을 검사 | 일반 본문은 차단하고 정산·환불/대화 입구는 조건에 따라 유지 | 모든 입구가 사라진다는 과거 설명 정정 |
| 이벤트 삭제 | 호스트·유효한 공동호스트의 초안, 정기모임 회차·배정/돈 연결 제한 | 초안 더보기의 확인형 삭제, 종료·취소에는 없음 | 상태 역전 해소. 성공 여부는 서버의 최종 판단 |
| 다음 회차 권한 | 호스트·유효한 공동호스트 | 수정 권한으로 노출 | 과거 공동호스트 누락 해소 |
| 다음 회차 유형 | 독립·비공개 허용, 클럽 모임·정기모임 회차 거절 | 공통 판정으로 같은 유형 제한, 취소·숨김 제외 | 과거 유형 반전 해소 |
| 결제 기한 집행 | 5분 주기 scheduler가 `PAYMENT_EXPIRED` 전환. `payByWallet` 자체에는 dueAt 비교 없음 | 기기 시계가 dueAt 경과를 보면 CTA 차단 후 상세 재조회 | 정책 시점 차이 |
| 운영자 숨김 모임 직접 조회 | 당사자 밖은 404 `EVENT_NOT_FOUND` | 당사자에게 본문, 호스트·공동 호스트에게 숨김 안내 | 일치 |
| similar events failure | 서버 optional auth + list 반환 | 실패를 빈 리스트로 숨김 | UX는 안정적이나 장애 탐지 약함 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| 해소됨 | 삭제 CTA 상태 역전 | 초안 더보기의 삭제와 하단 수정·공개를 분리하고 종료·취소 삭제를 제거 | 유효한 초안에서만 삭제를 시도 | 실제 삭제·목록 복귀 시험의 범위는 아래 기록과 구분 |
| 해소됨 | 다음 회차 권한·유형 차이 | 수정 권한과 공통 유형 판정으로 독립·비공개만 노출 | 공동호스트 누락·클럽 유형 오노출 정정 | 실행 실패·생성 결과는 실제 버전의 검증 근거로 확인 |
| 현재 설명 정정 | 취소 후 복구 입구 | 당사자 열람 판정 뒤 앱은 본문을 차단하되 정산·환불과 대화를 조건부 제공 | 모든 입구가 사라지지 않음 | 후속 업무별 실제 권한·결과 확인은 별도 |
| 해소됨 | 운영자가 숨긴 모임의 직접 조회 | 숨김은 상태가 아니라 운영자 표지다. 상세 열람 판정이 숨김·취소 모임을 당사자에게만 열고 그 밖은 `EVENT_NOT_FOUND` 로 존재를 숨긴다. 공유 링크로도 열지 않는다 | 당사자 밖에는 본문이 내려가지 않는다 | 없음 |
| 해소됨 | 웹에서 먼 모임의 상세가 모임 조회를 쉬지 않고 다시 보냄 | 2026-11-08 밤 늦게 발송 실패 운영 복구 여정에서 찾았다. 모임 시각 경계 위젯이 다음 경계까지 Dart 타이머를 거는데, 웹은 약 24.8일보다 긴 지연을 곧바로 불러 30일 뒤 모임의 상세가 열자마자 무효화와 다시 걸기를 되풀이했다(10초 1,678번, 그중 429 1,617번). 2026-11-09 새벽 하루보다 긴 지연을 하루씩 이어 기다리는 공용 긴 타이머로 날짜 타이머 넷(시각 경계, 개인 구독 만료, 정기모임 납부 기한, 채널 보내기 만료)을 바꿨다(재현 시험 넷) | 고친 뒤 여정에서 모임 조회 1번, 429 0번. 고치기 전에는 본문이 그려지지 않고 요청 한도에 걸렸다 | 발송 복구 여정 마지막 확인으로 닫는다(문서 저장소 앞으로 할 일 H-658) |
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
Then 일반 본문·더보기는 차단 안내로 바뀐다. 열람이 허용된 당사자 중 정산·환불 또는 대화 권한이 있는 사람에게는 해당 후속 업무 입구가 표시된다.

### AC-12. 이벤트 삭제 상태 정합성

Given host/co-host가 `DRAFT` 이벤트를 보고 있다.
When 삭제 진입점을 찾는다.
Then 서버 계약상 `DELETE`가 성공할 수 있는 상태이므로 DRAFT에서만 삭제 CTA가 보여야 한다.
현재 초안 더보기 메뉴에만 삭제 입구가 있다. 확인을 취소하면 요청하지 않으며 성공 시 원래 주최 목록에서 제거된다. 정기모임 회차·배정/돈 연결 제한도 구분해 확인한다.

### AC-13. 다음 회차 gate

Given 사용자가 `이 이벤트로 새로 만들기`를 선택한다.
When Flutter와 서버가 권한·유형을 검사한다.
Then 양쪽이 같은 역할과 `EventType` 집합을 허용해야 한다.
현재 상세 메뉴는 수정 권한과 공통 판정으로 서버의 허용 역할·유형을 따른다. 생성 성공 뒤 새 초안 편집으로 이동하고, 제공자 배정을 이어가는 선택은 돈·정산 복사를 뜻하지 않는다.

## 10. 검증 현황

아래 기존 시험의 ‘검증됨’은 과거 문서 작성 시점의 설명이며 이번 버전의 재실행 기록이 아니다. 2026-11-22에는 `entry_paths_event_delete_result_test.dart`에서 전체 메뉴→내 이벤트→주최 중→초안 상세→더보기 삭제→확인 취소/실행→같은 목록·탭·메뉴 검색어로 복귀하는 시험 소스를 확인했다.

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
| `event_detail_draft_delete_menu_test.dart` | 초안 하단의 수정·공개, 더보기 삭제·확인, 다른 상태의 삭제 미노출 | 2026-11-22 시험 소스를 확인했으며 이번 문서 갱신에서 재실행하지 않음 |
| 운영자 숨김 직접 조회 테스트 | 숨긴 모임을 당사자 밖에서 404 로 막는지 | 정책은 정해짐(당사자만 연다). 이 판정만 보는 전용 시험 파일은 이름으로 찾지 못함 |

## 11. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 검증 | 초안 삭제 | 메뉴 확인→취소/삭제→목록 갱신·복귀와 배정/돈 연결 거절을 구분해 확인 |
| 검증 | 다음 회차 | 현재 허용 역할·유형은 결정·구현돼 있음. 생성·배정 이어가기·실패·복귀 결과를 확인 |
| 검증 | 취소 후 복구 | 일반 본문 차단과 조건부 정산·환불/대화 입구가 실제 권한과 맞는지 확인 |
| 정책 | 결제 하드 마감 | 정상 운용 시 약 5분 주기인 soft grace(상한 아님)를 허용할지, `payByWallet`에서 dueAt을 인라인 검증할지 결정 |
| 테스트 | payment pending 상세 | 승인 후 결제 대기 CTA·기한 만료 재신청·결제 성공 후 화면 갱신의 Flutter E2E 근거를 연결 |
| 테스트 | restricted club detail | 서버 field redaction과 Flutter restricted notice를 같은 시나리오에서 검증 |
