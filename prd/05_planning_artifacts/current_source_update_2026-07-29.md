# 2026-07-29 현재 소스 실측 갱신 노트

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

## 1. 기준점

| 저장소 | 실측 기준 | 기준 시각/설명 |
| --- | --- | --- |
| `business_logic` | `58d160d434e0` | 2026-07-08 문서 동기화 커밋을 갱신 전 기준선으로 사용 |
| `community_api` | `be38d128b80d` | 2026-07-27 제공자 이행 통계·계약 정리까지 포함 |
| `community_app` | `cb21bce8ef08` | 2026-07-27 제공자 통계·가용성 고지까지 포함 |
| `community-realtime` | `2d9215e56781` | `/community-chat` 분리 namespace와 차단 퇴장 동작 확인 |
| `community_admin_api` | `e507ab96a9fe` | 제공자 심사 큐·서류 presign·상품 운영 endpoint 확인 |

`community_app`에는 작업 시작 전부터 플랜 renderer/screen/test/golden 관련 변경이 있었고,
동기화 중 `community_api`와 `community_app`의 플랜 소스·테스트·SQL 문서에도 병렬 작업 변경이
추가됐다. 두 소스 worktree는 문서 실측의 읽기 입력으로만 사용했고 이 작업에서
수정·format·restore하지 않았다. F08 문서는 위 HEAD 기준과 최종 통합 시점의 dirty worktree를
다시 대조해, 커밋 기준 사실과 미커밋 TABLE canonical validator/dual-read·조판 변경의 경계를
명시한다.

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

## 3. 반영 범위

기능 수는 바꾸지 않았다. 아래 50개 기능의 PRD와 HTML, 15개 도메인 요약, 공통 정책을
현재 소스로 다시 대조했다.

| 묶음 | 기능 | 실측해 반영한 현재 계약 |
| --- | --- | --- |
| 인증·관심 태그 | F01-07 | 태그명 교집합, 사람 추천 `COMMON_GROUND`, 양쪽 동의가 있을 때만 쓰는 데이팅 Jaccard와 weight 소비 범위를 분리 |
| 홈·검색 | F02-01, F05-01, F05-04 | 인증 사용자 사람 추천 섹션, 공유 맥락 안의 사람 검색, `Page<PersonSearchVo>`, `hideFromSearch`, 중복 제거 검색 기록을 실제 caller까지 확인 |
| 이벤트 운영 | F03-02, F03-07 | 상태별 상세 body와 capability, clone/delete 계약, 기본 정원 폼, 마감/재개·고급 초과정원 미배선, 수동 승급 상한 우회를 반영 |
| 선입금·이동수단 | F03-13~17 | 논리 capacity hold와 환불 권한·취소 Gap, transport 2/carpool 7/bus 4/user layout 2/Admin layout 6 API를 재작성. Flutter는 WALLET 결제 CTA만 연결되고 BANK·교통 운영은 미배선이며, 카풀 신고 API/screen/route는 있지만 인앱 caller가 없다. 무시드·String seat type도 반영 |
| 일정 변경·노쇼 | F03-19, F03-20 | MAJOR proposal의 48시간 응답, late response rollback, DECLINED 취소 best-effort, no-show party owner/7일/정정 체크인, 환불 계약·보안 후보를 교정 |
| 클럽 | F04-02, F04-09 | 멤버 전용 k-익명성 fit preview, 댓글/답글/멘션 검증, 알림 우선순위와 댓글 딥링크를 현재 구현으로 교정 |
| 모임 정산 | F07-05, F07-06 | 혼합결제의 `BANK_AWAITING_CONFIRM` 2단계, 수취인/정산 생성자 확인, 수기 신뢰 기반 은행분 확인과 완료 전이를 반영 |
| 플랜·마켓 | F08-02/03/04/05/10/11 | preview/detail/body 권한 분리, block tree revision·직렬 queue·서버 cycle/depth 검증, 미디어 projection, 발행·구매의 무료 포인트 금액 계약을 교정. 병렬 dirty 작업본의 known block 20종/picker 18종·pattern 12종과 TABLE canonical rows validator·legacy dual-read도 별도 경계로 반영 |
| 데이팅 | F09-02, F09-03, F09-06 | community-data 양쪽 동의, 동의 철회 시 재계산, profile/candidate/meeting feedback의 실제 소비 경계를 반영 |
| 리뷰·신뢰·핏 | F11-01, F11-05, F11-06 | 선택형 이벤트 피드백, `VibeTag` 8값, 받은 선택 비노출, 이벤트 피드백 기반 taste rebuild, 행동 근사 style과 trait privacy를 반영 |
| 알림 | F12-04 | 요일 필터, 자정 넘김의 시작 요일, `start==end` 하루 전체 차단, 앱의 0요일 저장 차단과 서버 empty 정규화를 반영 |
| 프로필·개인정보 | F13-01/04/05/06, F19-03 | 만난 사람/trait 진입, 태그 downstream 소비, 비동기 export presign·schema, 삭제 전 금융 gate·보존, `hideFromStrangers`와 `hideFromSearch` 의미를 분리 |
| 위치·길찾기 | F14-01~06 | 실시간 공유의 실제 timer/권한/데이터 노출, 즉시 opt-out, 연장 scheduler, raw access log, 외부 지도 fallback, geocode/reverse-geocode caller를 교정 |
| 정기모임 | F17-03, F17-05 | 생성 enum/기본값 계약, FIXED·VARIABLE 가격 단위, 단건/자동생성 UI와 bulk/replace 미배선을 반영 |
| 관심인 정책 | F19-03 | 무료 토글 2종과 premium 토글 2종, 프로필 직접 열람과 검색·추천 후보 제외의 차이를 반영 |
| 제공자 마켓 | F21-01~07 | 공개 프로필·상품·심사, versioned terms, fee snapshot, fulfillment gate, 환불/회수, 계약금, 정기 회차 복제/재수락 계약을 API·App·Admin에서 확인 |

tracked 반영 영역은 다음과 같다.

- `prd/01_domain_prds/`: 01, 02, 03, 04, 05, 07, 08, 09, 11, 12, 13, 14, 17, 19, 21
  (06은 선입금 환불의 폐기 executor 경로를 바로잡고, 15는 catalog Trace/Risk 롤업을
  교정하는 교차 갱신 추가)
- `prd/02_feature_prds/`: 위 표의 50개 기능 전체 재실측 + F03-05, F03-06, F03-08,
  F06-06, F08-14, F17-01, F17-02의 논리 hold·이동 source trace·현행 라벨 교차 갱신 7건
- `prd/03_policy_prds/`: permission, privacy/safety, notification, payment/settlement, state,
  planning QA
- `docs/domains/`: 위 15개 도메인
- `docs/features/`: 위 50개 기능 + F03-08 현행 라벨 교정 1건
- `docs/policies/`: permission, privacy, notification, payment, state
- `docs/assets/features.js`: 위 50개 기능의 현재 실측 표식과 핵심 점검 항목
- `planner_onboarding/`: 제품 전체 21개 도메인·175개 기능과 unit-backed
  14개 도메인·117개 기능·1011개 시나리오 부분집합의 경계를 명시
- 기능 metadata 재검산으로 F03/F04/F08/F17/F19/F21의 시나리오 수를 바로잡고, 현재 허브·제품·QA·카탈로그의
  총 시나리오 1275개와 Risk 후보 598개를 같은 값으로 동기화했다. 과거 changelog/2026-07-08
  갱신 노트의 당시 1218개 수치는 역사 기록으로 보존했다.

Git에서 ignore되는 canonical 원천은 33개 feature 디렉터리의
`backend/frontend/scenarios/diagrams.md` 132개와 관련 도메인 `00_overview.md` 12개,
총 144개 파일을 같은 사실로 역동기화했다. 전역 source-path 검사에서 찾은 F06-06의 이동된
`RefundPolicyService` package trace와 F06-10의 이동된 `settlement_status.dart` trace도
별도 unit 문서에서 교정해, ignore 영역의 실제 수정은 146개 파일이다. source-first 운영
기능에는 새 `units/` 폴더를 만들지 않았다.

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

## 5. 검증

문서만 수정했고 서버·Flutter·Realtime·Admin 소스는 수정하지 않았다.

- 연결성/검색/핏/프로필 묶음: 서버 관련 182 tests, Flutter 관련 64 tests 통과.
- F04 클럽 상세·댓글 unit 재검증: API 선택 테스트 150개, Flutter 선택 테스트 31개 통과.
- 제공자 marketplace 묶음: API/App/Admin의 관련 service/controller 테스트 통과.
- 은행분 확인: `MeetingSettlementTransferServiceTest`,
  `MeetingSettlementControllerTest`, `MeetingSettlementServiceTest.confirmBankPortion_rejectedWhenDraft`
  통과; Flutter 관련 provider/card/guidance 17 tests 통과.
- F03-07 정원·대기열: 관련 서버 54 tests 통과.
- F03-13~17 결제·이동수단 독립 역검증: 선입금·환불·취소·결제 E2E·카풀·버스
  6 suites 89 tests 통과. `EnumReservationTest`도 별도 BUILD SUCCESSFUL.
- F08 최종 dirty 재실측 회귀: API `PlanBlockService`·TABLE rows validator 57 tests,
  Flutter block editor/renderer/type sheet 관련 6파일 129 tests 통과.
- F12-04 방해금지: `PushServiceTest`, `NotificationSettingServiceTest` BUILD SUCCESSFUL;
  Flutter guidance card 3 tests 통과.
- F13 프로필·내보내기·삭제: API 관련 64 tests, Admin 관련 2 tests,
  Flutter privacy guidance 3 tests 통과.
- 전체 스캔은 952개 파일(Markdown 728, HTML 221), Mermaid fence 620개, 상대 링크 3629개,
  실제 소스 경로 819개를 검사해 오류 0건으로 통과했다. HTML은 `xmllint` 구조 검사도 포함한다.
- 카탈로그는 175개 고유 ID, 2026-07-29 실측 표식 50개, 시나리오 1275, 도식 552,
  Trace 565, Risk 후보 598로 재계산했다. 변경 metadata는 50개 ID의
  `checks/statusDetail/scenarios/risk` 안으로 한정됐고, 마이그레이션 상세표 175행과
  status/Trace/Risk가 전부 일치한다.
- unit-backed 117개와 unit 부재 source-first 58개를 분리 검산했다. 전자의 기획자 온보딩
  부분집합은 시나리오 1011, 도식 508이며, 2026-07-29에 수정된 ignore unit 파일은 146개다.
- Git에 보이는 산출물은 기존 추적 파일 183개 갱신과 이 노트 1개 신규이며, ignore unit 원천
  146개까지 합치면 파일시스템 기준 동기화 대상은 330개다.
- 최종 `git diff --check`와 폐기된 source path·현행 stale 수치 검색을 통과했다.
  소스 저장소 HEAD는 기준점과 같다. 읽기 입력의 기존 `git status --short` 항목은
  API 8개(수정 6·미추적 2), App 42개(수정 36·미추적 경로 6)이며 Realtime·Admin은 0개다.
  App의 미추적 디렉터리를 실제 파일로 펼치면 전체 dirty 파일은 45개다.

## 6. 유지한 경계

- 기능 ID와 문서 인벤토리 수는 바꾸지 않았다.
- server/controller에 없는 endpoint, DTO에 없는 field, enum에 없는 값을 만들지 않았다.
- 현재 `units/`가 없는 source-first 계열 58개 기능(F03-13~20, F04-17/18, F08-14/15,
  F11-07, F15~21의 해당 기능)에 억지로 원천 폴더를 만들지 않았다.
- 보안/권한/미배선 후보는 문서에만 기록했고 제품 소스를 고치지 않았다.
- 이전 기준과 배경은 [2026-07-08 현재 소스 갱신 노트](current_source_update_2026-07-08.md)에
  보존한다.
