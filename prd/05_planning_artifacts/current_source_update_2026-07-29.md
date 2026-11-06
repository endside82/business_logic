# 현재 소스 실측 노트 (2026-07-29 기준 Gap/Risk)

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.


> **역사 기록:** 이 문서는 2026-07-29 당시 소스를 보존한다. 대절 버스·카풀의 현재 계약은
> [이동수단 공통 설정](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md),
> [카풀·자차](../02_feature_prds/03_event/F03-15_event-carpool_prd.md),
> [대절 버스와 자리 배정](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md),
> [차량 좌석 배치도 운영](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md)의
> 2026-09-02 갱신 내용을 우선한다.

> 범위: `business_logic`의 2026-07-08 문서 기준선을 현재 `community_api`, `community_app`,
> `community-realtime`, `community_admin_api` 소스와 다시 대조했다. 신규 도메인·기능 ID는
> 만들지 않고 기존 21개 도메인·175개 기능 체계 안에서 사실, UI 도달성, 권한, 상태 전이,
> Gap/Risk를 교정한다.

## 2. 실측 원칙

1. 서버 Controller의 실제 path/method/param/response를 먼저 읽고 Service, DTO/VO, enum,
   DB side effect와 테스트로 내려간다.
2. Flutter는 API → Repository → Provider → Router → Screen/Widget caller를 끝까지 추적한다.
   API나 Provider가 존재한다는 이유만으로 사용자가 실행할 수 있는 기능으로 쓰지 않는다.
3. 역할명보다 서버가 내려주는 capability와 실제 service guard를 우선한다.
4. 알림 service 호출은 “생성 요청”으로 기록한다. 사용자 설정, 비동기 FCM, 실패 결과를 확인하지
   않은 상태에서 “도달”로 쓰지 않는다.
5. 소스에 확인된 미배선, 권한 누락, path scope 불일치, silent failure와 보안 후보는 구현 완료
   표현으로 덮지 않고 Gap/Risk에 남긴다.
6. `units/**`는 `business_logic/.gitignore`의 `/*/` 규칙 때문에 Git 추적 대상은 아니지만,
   기존 PRD가 링크하는 로컬 원천 자료다. 이번에 교정한 tracked PRD/HTML과 모순하지 않도록
   해당 feature의 backend/frontend/scenarios/diagrams와 overview도 파일시스템 기준으로 역동기화한다.

## 4. 확정한 대표 Gap/Risk

### 이벤트

- F03-02의 `CANCELED`는 상세 본문 위 overlay가 아니라 body 전체 `AppBlockedState`다.
  `CLOSED`는 badge만 붙고 본문은 유지된다.
- 상세의 CLOSED/CANCELED 삭제 CTA와 서버의 DRAFT-only 삭제 guard가 역전돼 있어 버튼을 누른 뒤
  실패한다.
- clone은 Flutter에서 host-only·PRIVATE 불가지만 서버는 host/cohost를 허용하고
  INDEPENDENT/PRIVATE를 받으며 CLUB_MEETING을 거절한다. 양 계층 계약이 다르다.
- close/reopen은 F03-07 Provider까지만 있고 화면 caller가 없다. 고급
  `PATCH /capacity-settings`는 Repository까지만 있고 입력 화면과 초과 badge 소비처가 없다.
- 수동 대기열 승급은 `CapacityPolicy`, baseCapacity, hardCapacityLimit을 검사하지 않고
  `currentCapacity`를 증가시킨다. hard limit은 현재 시스템 전체의 절대 상한이 아니다.
- F03-19의 deadline 경과 응답은 AUTO_ACCEPTED 저장 뒤 예외를 던지지만 전체 transaction rollback으로
  그 저장이 사라진다. 영속 자동 수락은 scheduler만 수행한다.
- F03-19의 guest-only MAJOR 변경은 `batchId/count=0`을 반환한 뒤 같은 batch GET이 NOT_FOUND가
  될 수 있다. batch GET/apply/delete는 path eventId와 row 소속을 대조하지 않는다.
- F03-20 no-show refund GET은 path eventId와 principal/소유권을 검사하지 않아 IDOR/BOLA 후보이고,
  refund POST는 실제 no-show row를 확인하지 않는다. cohost의 환불 capability도 검사하지 않는다.
- F03-13의 일반 `refund-preview`도 principal을 service에 전달하지 않아 applicationId를 아는 인증
  사용자가 타인의 결제·환불 예상 정보를 볼 수 있는 IDOR 후보다.
- 이벤트 취소는 ATTENDING/WAITING attendance만 순회해 attendance가 아직 없는
  `APPROVED_PENDING_PAYMENT`와 BANK PENDING 결제를 누락할 수 있다. BANK PAID는 실제로
  `REFUND_REQUESTED`에 머무는데 상위 caller가 환불 완료로 집계·알림하는 경계 오류도 있다.
- 환불 요청 지연 재알림 scheduler는 non-locking 조회·저장을 사용하고 `event_payment`에는 version이
  없어, 동시에 완료된 REFUNDED 상태를 stale `REFUND_REQUESTED`로 되살릴 경쟁 위험이 있다.
- transport mode의 `allowsSelfTransport`는 현재 다른 service가 소비하지 않는 비활성 설정이다.
  카풀·버스 운영 UI와 77~82 알림 생산 배선은 없고, 카풀 신고 route도 인앱 caller가 없는 고아
  route다. 카풀의 stale `assignedOfferId`/lost update와 버스의 점유 좌석 덮어쓰기, 양쪽의 terminal
  event mutation도 현재 Gap이다.
- 차량 레이아웃은 기본 seed가 없고 seat type은 enum이 아닌 문자열 whitelist다. create가
  `active=true`를 받아 좌석맵이 없는 활성 레이아웃도 만들 수 있으며 Flutter 운영 UI는 없다.

### 클럽

- 클럽 상세 GET은 현재 인증이 필요한데 Flutter `/home/clubs/:id`는 공개 라우트로 취급해,
  비로그인 사용자가 라우터를 통과한 뒤 상세 GET 401을 일반 “클럽을 찾을 수 없습니다”로 보게 된다.
- APPROVAL 가입도 메시지 입력 없이 `joinClub(clubId)`를 호출해 신청 body의 `message`가 null이다.
  서버·운영 대기열이 지원하는 가입 메시지와 현재 사용자 UI가 연결되지 않았다.
- 댓글 정렬 토글과 pagination UI는 실제 조회를 바꾸지 않고, mutation 뒤 게시글
  `commentCount`가 stale할 수 있다.
- root 댓글 삭제 뒤 서버 응답에는 답글이 남지만 Flutter tree는 삭제된 root 아래 답글까지 숨긴다.
  댓글 전 경로의 club/post/comment scope 검증과 멘션 snapshot·차단 알림 억제는 확인됐다.

### 정산·플랜·정기모임

- 은행분 확인은 은행/영수증 시스템 검증 없이 사람이 “받았어요”를 누르는 신뢰 기반 확정이다.
  controller path의 eventId는 service에 전달되지 않는다.
- 혼합결제 시작 API/Repository/Provider는 있으나 Flutter presentation 시작 caller가 없다.
  Transfer VO에는 point/bank 분할 금액이 없어 은행분 확인 dialog가 총 transfer amount를 표시한다.
- 이체 일괄 확인은 건별 결과를 집계하지만 같은 service bean의 transaction method를 self-invocation해
  주석과 달리 건별 Spring transaction 경계를 만들지 않는다.
- 이체 화면의 “미납자 알림”은 실제 API 호출 없이 성공 토스트만 표시한다. 대기 합계는
  `BANK_AWAITING_CONFIRM`을 제외하고, 일반 BANK 수취자 CTA와 완료 후 하단 action 상태식에도 공백이 있다.
- EXPIRED transfer 재발행 시 원본은 그대로 남지 않고 `SUPERSEDED`로 전환되며 새 PENDING row가 생성된다.
- 플랜 preview controller/service의 PUBLISHED 익명 허용 의도와 현재 Spring Security의 실질 인증
  요구가 다르다.
- 정기모임 생성 화면의 category 문자열/기본값이 서버 enum과 달라 기본 생성도 실패할 수 있다.
  서버 bulk session/replace endpoint는 Flutter 호스트 UI가 없다.

### 개인정보·위치·연결성

- 데이터 export는 object storage key를 저장하고 조회 때 presigned URL을 만든다. Admin의 수동
  EXPIRED/reissue/process와 `MANAGE_PRIVACY` 감사 경로는 있지만, 만료 뒤 자동 상태 전이·artifact
  정리 scheduler는 확인되지 않았다.
- 이벤트 피드백의 `vibeTags`는 사용자 작성 데이터지만 export map에서 빠진다.
- 계정 삭제 화면은 `DEACTIVATION_BLOCKED` 상세를 bool 실패로 축약하고, 데이팅 사진 DB row 삭제와
  storage object 삭제가 연결되지 않았다.
- 예약 삭제의 정상 `APPROVED` writer가 확인되지 않는 반면 내부 실행기는 CANCELLED 요청도 실행할
  수 있어 상태 불변식에 공백이 있다. 예약 삭제와 즉시 탈퇴의 서버 상호배제도 없다.
- 위치 공유 opt-out은 share row를 즉시 삭제하지만 privacy 화면에서 끈 경우 이미 열린 공유 화면의
  timer를 직접 중지하지 않는다.
- 위치 접근 기록은 unique viewer 집계가 아니라 polling GET마다 target별 raw row를 남긴다.
- 일반 참가자의 위치 목록은 거리 API 권한 실패를 화면이 빈 map처럼 흡수할 수 있고, active share
  화면 재진입 시 GPS timer만 재시작하고 목록 timer는 재시작하지 않는다.
- `hideFromSearch`는 검색/만난 사람/추천 후보를 숨기지만 직접 프로필 URL을 막지 않는다.
  직접 프로필은 별도 `hideFromStrangers`와 공유 맥락 판정이 담당한다.
- 데이팅 후보 화면은 swipe gesture가 없고 처리한 후보가 다시 노출될 수 있다. 프로필 생성·사진
  관리 UI와 만남 상태 변경 CTA도 현재 presentation caller가 없다.
- 신뢰점수 history API는 owner-only가 아니어서 인증된 비차단 사용자가 다른 userId의 변경 사유까지
  조회할 수 있지만, Flutter에는 타 사용자 신뢰 이력 화면으로 가는 caller가 없다.

### 제공자 마켓

- 카탈로그 돈 진입은 최신 terms 수락을 요구하고 수수료율을 계약/earning에 snapshot한다.
  과거 0% 계약은 재수락 전까지 0%를 유지한다.
- terms preview는 총액에 한 번 반올림하지만 실제 원장은 charge/deposit별로 반올림해 원 단위 차이가
  날 수 있다. 정산의 진실은 각 earning row다.
- 참가자 charge status 서버 VO의 `agreedGross`·`participantCap`은 Flutter 모델에서 유실되고,
  화면은 aggregate `myPaidAmount`만 표시한다. direct route 화면은 `chargeable`과 기존 coverage를
  무시해 무료·대납·완납 상태에도 실패할 결제 CTA를 그릴 수 있다.
- readiness는 coverage 집합과 보장 금액만 사전점검한다. settle은 이벤트 종료·CONFIRMED·최신
  terms·fulfillment·earning·계약금까지 추가 검사하므로 `ready=true`가 정산 성공을 보장하지 않는다.
  앱도 미커버 사용자를 이름·금액이 아닌 raw `#userId`로만 보여 주고 제공자 earning/payout 화면은 없다.
- 카탈로그 D>0 terms 수락은 engagement를 먼저 만들지만 앱의
  `canPrepay = !hasServiceFee && !hasEngagement`가 즉시 계약금 버튼을 숨긴다. 서버 결제는 가능해도
  현재 앱 caller가 없고, cancel은 PENDING 전용 API/Repository만 있으며 화면 액션이 없다.
- 부분환불은 참가자와 호스트 양쪽에 `partialAmount`를 반대 분개한다. paid-refund 차액만 호스트가
  부담한다는 설명은 틀리며, Idempotency-Key 필수 범위도 partial-refund/clawback뿐이다.
- confirm/cancel controller는 path `eventId`를 service에 넘기지 않는다. assignment 실제 event로
  권한을 검사해 권한 상승은 없지만 path-owner 일치 invariant는 강제되지 않는다.
- 다음 회차 direct/미수락 배정은 DRAFT로 복제되지만 이를 ASSIGNED로 재개하는 API가 없고 유일성 때문에
  같은 제공자를 다시 생성할 수도 있다.
- 묶음 취소 API는 없고, `SKIPPED_NOT_READY`는 미납이 아니라 미CONFIRMED/회차 미종료만 뜻한다.
  미수금·terms·fulfillment 실패는 `BLOCKED`로 분류된다.

## 6. 유지한 경계

- 기능 ID와 문서 인벤토리 수는 바꾸지 않았다.
- server/controller에 없는 endpoint, DTO에 없는 field, enum에 없는 값을 만들지 않았다.
- 현재 `units/`가 없는 source-first 계열 58개 기능(F03-13~20, F04-17/18, F08-14/15,
  F11-07, F15~21의 해당 기능)에 억지로 원천 폴더를 만들지 않았다.
- 이전 기준의 계약 사실은 [2026-07-08 현재 소스 계약 노트](current_source_update_2026-07-08.md)에 있다.
