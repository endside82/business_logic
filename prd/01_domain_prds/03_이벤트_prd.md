# 03. 이벤트 영역 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)을 따른다. 2026-11-22 소스 대조를 마친 이벤트 기능 PRD 20개에서 이 개요를 동기화했다. 문서 최신화와 실제 앱·송금·푸시·출시 검증 완료를 구분한다.

## 영역의 범위와 읽는 순서

사용자가 모임을 발견하고 조건을 확인한 뒤 신청·결제·참석·현장 체크인·사진 공유까지 이어가는 영역이다. 주최자는 초안·공개·운영·종료·취소를 관리한다. 같은 모임이라도 사용자 역할, 신청·납부·참석 상태와 현재 허용 행동에 따라 입구와 결과가 달라진다.

정본은 아래 개별 기능 PRD다. 이 개요는 권한과 돈·좌석·상태의 경계를 연결하며 API 주소·필드·시간 한도·정확한 조건을 별도 표로 중복 복제하지 않는다. 소스 연결은 기능 PRD의 코드 위치와 검증 근거에서 확인한다. 기존 units 문서는 이 정본에서 파생한 로컬 참고이고, 부속 파일이 없는 기능에 존재하지 않는 경로를 만들지 않는다.

## 사용자 흐름과 상태의 구분

| 흐름 | 현재 구분해야 할 상태·결과 |
| --- | --- |
| 찾기 → 상세 | 공개 검색 후보와 상세 열람 권한은 다르다. 차단·숨김·클럽/링크 접근과 현재 행동 허가를 검사한다 |
| 작성 → 저장 → 공개 | 기기 초안 보관, 서버 DRAFT 생성, OPEN 공개는 별도 단계다. 응답 유실 뒤 새 모임을 만들기 전에 같은 요청과 결과를 확인한다 |
| 신청 → 승인 → 납부 → 참석 | 무료 직접 참석·심사·결제 대기·대기열·실제 참석을 구분한다. 유료 신청 승인이 곧 결제나 참석 확정은 아니다 |
| 정원·일행·이동 | 회원 수, 일행 포함 점유 자리, 결제 대기 자리, 차량 탑승 배정, 물리 좌석은 서로 다른 값이다 |
| 수정·일정 변경 | 공개 후 소개 수정과 일정·장소 변경 제안은 별도 요청이다. 주요 변경의 동의 결과와 실제 적용을 구분한다 |
| 종료·취소·환불 | CLOSED와 CANCELED는 다르다. 취소 커밋, 비동기 환불, 은행 반환 요청, 완료 기록, 참가자 수령 확인도 별개다 |
| 체크인·노쇼 | 참석 관리자가 QR/코드를 제공하고 참석자가 스캔·입력한다. 미체크인 숫자와 노쇼 확정·소명·번복·사후 환불을 구분한다 |
| 사진·플랜 | 소개 사진과 행사 사진첩, 플랜 연결과 원본 사용 권리, 등록 응답과 저장소 전송·삭제 완료를 구분한다 |

일반 EventStatus는 DRAFT에서 OPEN 또는 CANCELED, OPEN에서 CLOSED 또는 CANCELED로 간다. 숨김은 별도 표지다. 모든 신청·결제·참석 상태를 이 이벤트 상태 하나로 합치지 않는다. 정기모임 고정 회차와 PRIVATE의 전용 명령은 일반 모임 명령의 단순 별칭이 아니다.

## 입구와 행동별 권한

초안의 수정·공개는 하단, 초안 삭제는 더보기, 공개 후 수정은 상세 관리 목록, 공유는 상단 한 곳이다. 종료·취소 뒤에는 그 상태에서 허용된 정산·환불·대화 등 후속 의무의 입구를 구분한다. 같은 수정 메뉴를 여러 위치에 중복 배치한 것으로 안내하지 않는다.

서버의 현재 행동 허가를 앱이 소비하고 실행 시 서버가 재검사한다. 호스트·공동호스트·클럽 운영자·출석 담당·환불 담당을 한 관리자 권한으로 합치지 않는다. 예를 들어 반복 일괄 관리·포인트 전환은 원본 호스트 조건이고, 환불 담당은 은행 큐의 반환 요청만 볼 수 있다. 정확한 업무별 범위는 해당 기능 PRD를 따른다.

실제 검수는 입구 → 권한·상태 → 행동 → 성공·실패 → 결과 확인·복귀로 판정한다. 소스 확인, 선택한 시험 단언 읽기, 새 시험 실행, 실기기·운영 검증을 각각 기록한다. 메뉴 맵을 열어 본 것을 실제 앱 검수로 대신하지 않는다.

## 사진과 자료의 경계

대표·본문 사진은 모임 소개 편집의 자료다. 사진첩은 실제 참석·운영 권한과 공개·보존·신고·앨범 상태를 다룬다. 업로드 파일 완료와 사진 등록, 사진 목록에서 숨김과 원본 소거를 구분한다. 플랜 연결은 그 모임에서 사용할 자료를 정하는 것이며 플랜 원본 삭제·구매 권리 부여가 아니다.

## 검수한 기능 정본 20개

| 기능 정본 | 주요 사용자 | 수용 기준 | 부속 문서 |
| --- | --- | ---: | --- |
| F03-01 [이벤트 발견과 탐색](../02_feature_prds/03_event/F03-01_event-discovery_prd.md) | 모임을 찾는 사용자 | 14 | 서버·앱·시나리오·도식 |
| F03-02 [이벤트 상세 조회](../02_feature_prds/03_event/F03-02_event-detail_prd.md) | 참가자·호스트·공동호스트 | 12 | 서버·앱·시나리오·도식 |
| F03-03 [이벤트 생성과 다음 일정·반복 일정](../02_feature_prds/03_event/F03-03_event-creation_prd.md) | 개인 호스트·클럽 생성 권한자 | 16 | 서버·앱·시나리오·도식 |
| F03-04 [이벤트 수정·공개·종료·취소](../02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | 호스트·공동호스트 | 17 | 서버·앱·시나리오·도식 |
| F03-05 [이벤트 신청·참석·본인 취소](../02_feature_prds/03_event/F03-05_event-attendance_prd.md) | 참가자 | 14 | 서버·앱·시나리오·도식 |
| F03-06 [신청서 승인·거절과 일괄 처리](../02_feature_prds/03_event/F03-06_application-review_prd.md) | 호스트·공동호스트 | 13 | 서버·앱·시나리오·도식 |
| F03-07 [정원 설정·대기열·모집 관리](../02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | 정원·출석 관리자와 참가자 | 14 | 서버·앱·시나리오·도식 |
| F03-08 [QR·코드·직접 체크인](../02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | 출석 관리자·참석자 | 15 | 서버·앱·시나리오·도식 |
| F03-09 [이벤트 사진첩](../02_feature_prds/03_event/F03-09_event-photos_prd.md) | 사진 운영자·실제 참석자 | 17 | 서버·앱·시나리오·도식 |
| F03-10 [이벤트와 플랜 연결](../02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | 플랜 연결 관리자 | 14 | 서버·앱·시나리오·도식 |
| F03-11 [찜한 이벤트](../02_feature_prds/03_event/F03-11_wishlist_prd.md) | 로그인 회원 | 12 | 서버·앱·시나리오·도식 |
| F03-12 [내 이벤트와 참석 변경 기록](../02_feature_prds/03_event/F03-12_my-events_prd.md) | 회원·호스트·참석 관리자 | 14 | 서버·앱·시나리오·도식 |
| F03-13 [이벤트 참가비 선입금·은행 확인·환불 기록](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | 참가자·호스트·공동호스트·환불 담당 | 18 | 기능 PRD·HTML |
| F03-14 [이동수단 공통 설정](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md) | 호스트·공동호스트 | 14 | 기능 PRD·HTML |
| F03-15 [카풀 지원·개별 이동](../02_feature_prds/03_event/F03-15_event-carpool_prd.md) | 차량 지원자·주최자·탑승자 | 15 | 기능 PRD·HTML |
| F03-16 [대절 버스와 자리 배정](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md) | 주최자·탑승자 | 16 | 기능 PRD·HTML |
| F03-17 [차량 좌석 배치도 운영](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | 차량 배치도 운영자 | 14 | 기능 PRD·HTML |
| F03-18 [이벤트 구성 통계](../02_feature_prds/03_event/F03-18_event-demographics_prd.md) | 모임 열람 권한자 | 12 | 기능 PRD·HTML |
| F03-19 [일정 변경 제안·참가자 합의 (RS-002)](../02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | 호스트·공동호스트·참가자 | 16 | 기능 PRD·HTML |
| F03-20 [이벤트 노쇼 관리](../02_feature_prds/03_event/F03-20_event-no-show_prd.md) | 호스트·출석/환불 권한자·참가자 | 18 | 기능 PRD·HTML |

수용 기준 수는 문서의 확인 항목 수다. 시험 통과 수가 아니다. F03-01~12에는 기존 단위 문서가 있고 F03-13~20에는 별도 단위 파일이 없다. 기능이 없다는 뜻으로 해석하지 않는다.

## 현재 차이를 먼저 볼 곳

| 검토 대상 | 현재 차이와 근거 |
| --- | --- |
| [이벤트 발견과 탐색](../02_feature_prds/03_event/F03-01_event-discovery_prd.md) | 유사 조회 실패가 빈 결과로 보이는 경우와 필터·목록 재시도. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [이벤트 상세 조회](../02_feature_prds/03_event/F03-02_event-detail_prd.md) | 일행 포함 확보 자리와 화면 표시, 링크 전용 모임의 캘린더 전달. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [이벤트 생성과 다음 일정·반복 일정](../02_feature_prds/03_event/F03-03_event-creation_prd.md) | 오래된 원본의 다음 일정 생성, 반복 요청의 세션 보관 범위. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [이벤트 수정·공개·종료·취소](../02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | 소개 저장 뒤 변경 제안 실패, 공지 응답 유실, 반복 건너뜀 결과. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [이벤트 참가비 선입금·은행 확인·환불 기록](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | 은행 반환 0원·증빙·상한 이하 완료액과 앱/서버 차이. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [차량 좌석 배치도 운영](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | 합성 기본 자료·확인 후보·활성 배치도를 구분하는 운영 조건. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [이벤트 구성 통계](../02_feature_prds/03_event/F03-18_event-demographics_prd.md) | 집계 수치의 공개 범위와 차원별 숨김·오류 안내. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [일정 변경 제안·참가자 합의 (RS-002)](../02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | 제안 분류와 실제 적용·응답 실패·반환 후속의 차이. 상세 제한 표와 검증 범위를 함께 읽는다 |
| [이벤트 노쇼 관리](../02_feature_prds/03_event/F03-20_event-no-show_prd.md) | 미체크인·노쇼 확정·신고/소명·사후 환불의 상태와 잔여 금액. 상세 제한 표와 검증 범위를 함께 읽는다 |

이 표는 작업 순서를 위한 요약이다. 다른 기능의 제한이 없다는 뜻은 아니며 각 정본의 현재 제한 표가 우선한다. 운영 수단·실제 차량·푸시·은행 반환을 소스만으로 통과 판정하지 않는다.

## 다른 영역과 연결

- 클럽 생성·운영 권한·정기모임 고정 회차는 [클럽 영역](04_클럽_prd.md)과 [정기모임 영역](17_정기모임_prd.md)의 정책을 따른다.
- 참가비 지갑·환불·회수금은 [결제와 지갑](06_결제_and_지갑_prd.md), 모임 비용의 공동 정산은 [모임 정산](07_모임_정산_prd.md)으로 이어진다.
- 플랜 원본과 사용 권리는 [플랜 마켓](08_플랜_마켓_prd.md), 리뷰·신고는 [리뷰와 신고](11_리뷰_and_신고_prd.md)에서 관리한다.
- 알림의 생성·전달·이동·수신은 [알림](12_알림_prd.md), 위치 공유의 참가자 동의·종료·길찾기는 [위치와 길찾기](14_위치_and_길찾기_prd.md)에서 확인한다.

## 문서와 검증의 완료 기준

기능 정본의 소스 지문·API 창구·관련 문서 링크를 유지하고, 개요·온보딩 목록·기능 카드가 같은 20개 기능을 가리키게 한다. 옛 화면 수·위젯 수·API 개수·위험 후보 숫자를 현재 구현 완료율로 쓰지 않는다. 갱신된 기능의 미검증 항목은 그대로 남기고 실제 실행 근거가 생길 때 갱신한다.

이번 개요 동기화는 이미 소스 대조를 마친 20개 정본과 지문을 근거로 했다. 새 서버 조사·제품 시험·브라우저·앱 이미지 검수·배포를 수행한 기록이 아니다.

## 이전 작성 이력의 보존

아래는 원문에 있던 날짜별 작성 이력을 보존한 부분이다. 당시의 완료·미구현·권한·수단·갯수 표기는 과거 판단이며, 현재 계약으로 사용하지 않는다. 현재 동작은 위 기능 정본과 확인 범위를 따른다.

- **2026-09-02 (대절 버스·카풀 통합 완료 반영)**: `BUS/CAR/SELF` 통합 차량 모델, 지정·비지정 자리와 호스트 전담·참가자 자기 선택, 승용차 승인·취소·자차 복귀, 자리·차량 신고, 표준 배치도 9종과 관리자 화면을 현재 계약으로 갱신했다. 사용자 API 156건·앱 160건·관리자 API 23건·관리자 웹 E2E 3건 실패 0을 확인했다. 신규 기능은 서명 앱 다중 역할·알림·신고와 책임 고지 승인 뒤 출시한다.

- **2026-05-22 (이벤트 참가 선입금 도입, [F03-13](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md); 2026-07-29 재실측)**: WALLET/BANK_TRANSFER 결제·환불 facade와 `event_payment`를 도입했다. active INITIAL만 application당 unique, GUEST_INCREMENT는 다건이다. APPROVED_PENDING_PAYMENT는 currentCapacity/attendance 없이 party size를 논리 hold하고 BANK 취소는 `CANCEL_PENDING_REFUND`로 hold를 유지한다. 만료 payment/75, 이벤트 취소 pending 누락·BANK 완료 오표시, refund preview IDOR, non-locking escalation 경합이 Gap이다. 72/83은 주 호스트 한 명, Flutter는 WALLET only이며 BANK 운영·deep link는 없다.
- **2026-05-22 (v4.5 W1 — 정원 초과 허용 도입)**: `event` 테이블에 `overcapacity_allowed`/`hard_capacity_limit` 두 컬럼 추가. 정원 판정을 `CapacityPolicy.decide(event, attendingCount)` 5-룰 매트릭스로 단일화하여 `apply / approveApplication / attend / confirmAttendanceFromPayment` 진입점이 모두 동일 헬퍼를 호출. 별도 서비스 `EventCapacitySettingsService`(`community_api/src/main/java/com/endside/community/event/service/EventCapacitySettingsService.java`)와 신규 엔드포인트 `PATCH /events/{id}/capacity-settings`로 DRAFT/OPEN 운영 중 정원 토글 분리(Q7 — CLOSED 차단). 공통 빈 `EventAuthorizationService` + `EventVoAssembler`(D12/D13) 추출. `ChangeType.OVERCAPACITY_APPROVED(9)` / `CAPACITY_REDUCED(10)` 신규, `ErrorCode.INVALID_HARD_CAPACITY_LIMIT(400013)` + `CAPACITY_FULL_AT_CONFIRMATION(400012)` 추가. EventVo에 `overcapacityAllowed / hardCapacityLimit / exceedingAttendees / reservedPaymentPendingCount` 4개 필드 노출(목록은 N+1 회피 위해 `reservedPaymentPendingCount=0` 고정, 단건만 lazy). 정원 축소 시 기존 ATTENDING은 유지하고 audit log만 기록. 영향 받는 기능: F03-03(생성 시 정원 옵션) / F03-04(생명주기 별도 capacity-settings 위임) / F03-05(신청·결제 확정 매트릭스 위임) / F03-06(승인 매트릭스 위임) / F03-07(정책 본체와 매트릭스 정의 위치). F03-07의 기존 trace ID와 risk 후보 수치는 그대로 유지됨 — W1 변경은 기존 trace를 변경하지 않고 신규 정책 문서만 추가했다.
- **2026-05-22 (이동수단 공통 베이스 도입, [F03-14](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md); 2026-07-29 재실측)**: `event_transport_config`와 GET/PUT 구현. mode 변경은 DRAFT에서만 가능하고 이탈한 CARPOOL/BUS 데이터를 hard delete한다. `allowsSelfTransport` 단독 변경에는 status 가드가 없다. GET은 로그인만 요구하며 Flutter 호출부·전용 테스트·알림·audit은 없다.
- **2026-05-22 (카풀 운영 도입, [F03-15](../02_feature_prds/03_event/F03-15_event-carpool_prd.md); 2026-07-29 재실측)**: offer/passenger/assignment-log 스키마와 실제 7개 API 구현. assignment log는 기록하지 않고 77~80 알림은 enum only다. Flutter 신고 route에는 인앱 caller가 없다. register/assign lost update·assignedOfferId 잔존·terminal event mutation·same-full-offer 재배정 오류가 남아 있다.
- **2026-05-22 (차량 레이아웃 카탈로그 도입, [F03-17](../02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md); 2026-07-29 재실측)**: 사용자 read API 2개와 관리자 `MANAGE_EVENT` 목록·상세·생성·메타 수정·좌석 전체 교체·active 토글 API가 구현됐다. `seatType`은 enum이 아닌 String whitelist다. 양 V1과 seed SQL에 기본 차량 4종 INSERT는 없고 Flutter 소비 화면도 없다.
- **2026-06-05 (D-20/v3 + Phase 4/5 — ApplicationStatus 전체 7값·NoShowStatus·EventCheckIn 감사컬럼·F03-19/F03-20 등재)**: `ApplicationStatus` 7값 전체 갱신 (APPROVED_PENDING_PAYMENT/PAYMENT_EXPIRED/CANCEL_PENDING_REFUND 추가). `NoShowStatus` (CONFIRMED/APPEALED/OVERTURNED) 상태 모델 추가. `EventCheckIn` Wave D-1 감사 추적 3컬럼 (manual_actor_id/manual_reason_code/corrected_from_check_in_id) 추가. "일정 변경 즉시 FCM 발송" → AUTO/MAJOR 분기·합의 절차 요약 교체 (F03-19 참조). F03-19(일정 변경 제안·참가자 합의), F03-20(이벤트 노쇼 관리) 기능 표·먼저 볼 기능·도메인 기능 목록에 등재. 도메인 기능 PRD 18개 → 20개.
- **2026-05-22 (버스대절 운영 도입, [F03-16](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md); 2026-07-29 재실측)**: 버스/좌석/좌석로그와 4개 API 구현. FREE는 seat row를 만들지 않고 FIXED_BY_HOST/FIRST_COME은 선택 가능한 좌석을 복사한다. FIRST_COME 자동 배정, seat `SKIP LOCKED`, 진짜 swap/unassign은 없고 좌석 PUT은 target user를 덮어쓴다. add/assign은 terminal event도 변경 가능하다. 중복은 `INVALID_REQUEST`; 81~82는 enum only; Flutter 버스 기능은 없다.
- **2026-07-02 (접근권한 감사 교정 — 서버 능력플래그 북극성 풀슬라이스\)**: 서버가 EventVo에 **뷰어별 능력플래그 10종**(canEditEvent / canManageApplications / canManageAttendance / canModerateMessages / canSendAnnouncement / canHandleRefundIssue / canResolveDispute / canViewAttendees / canCheckIn / canManageEvent)을 계산해 내려주는 북극성 모델 구현 완료. 각 플래그는 해당 액션의 실제 서버 가드와 1:1 거울 — 추측 재계산 없이 서버가 단일 진실원. **독립 이벤트**: 생애주기(편집/발행/취소/삭제)·신청관리·공지 = 호스트∪임의 공동호스트; 출석관리·체크인 = 호스트∪canManageAttendance 공동호스트∪클럽 출석관리 권한 보유자; 메시지 모더레이션 = 호스트∪canModerateMessages 공동호스트∪클럽 모더레이션 권한 보유자. **클럽 이벤트**: 위 + 클럽 권한플래그(EVENT_ATTENDANCE_MANAGER/EVENT_MODERATION_MANAGER/EVENT_REFUND_MANAGER/EVENT_DISPUTE_RESOLVER)+OWNER 보유자 합산. **앱**: `eventPermissionProvider`를 서버 플래그 소비형으로 전환(클라이언트 ad-hoc 재계산 제거); 라우트 가드(편집/반복그룹/리스케줄 배치)를 능력플래그 기반으로 교정; 메시지 라우트의 stale `isOpenEvent` 절 제거. **반복 이벤트 그룹**: 비호스트/비공동호스트에게 DRAFT 및 발행 전 취소(publishedAt=null) 자식 세션 메타 필터(NOT_FOUND 응답). **정원 설정 read**: 로그인 임의 사용자 열람 → 호스트∪공동호스트∪클럽 운영진 게이트. 결정: D-F03-2(클럽 운영진 이벤트 편집/공지/신청 권한 부여 하지 않음 = 현행 유지), D-F03-3(독립이벤트 생성주체 = 제품결정 대기). 잔여 비보안 백로그: F03C-04(capacity 이원화)·F03D-01(HOSTS_ONLY 죽은 enum)·F03FG-05/09(위치 공동호스트 드리프트).
- **2026-07-02 (접근권한 감사 교정 — 서버 능력플래그 북극성 풀슬라이스\)**: 서버가 EventVo에 **뷰어별 능력플래그 10종**(canEditEvent / canManageApplications / canManageAttendance / canModerateMessages / canSendAnnouncement / canHandleRefundIssue / canResolveDispute / canViewAttendees / canCheckIn / canManageEvent)을 계산해 내려주는 북극성 모델 구현 완료. 각 플래그는 해당 액션의 실제 서버 가드와 1:1 거울 — 추측 재계산 없이 서버가 단일 진실원. **독립 이벤트**: 생애주기(편집/발행/취소/삭제)·신청관리·공지 = 호스트∪임의 공동호스트; 출석관리·체크인 = 호스트∪canManageAttendance 공동호스트∪클럽 출석관리 권한 보유자; 메시지 모더레이션 = 호스트∪canModerateMessages 공동호스트∪클럽 모더레이션 권한 보유자. **클럽 이벤트**: 위 + 클럽 권한플래그(EVENT_ATTENDANCE_MANAGER/EVENT_MODERATION_MANAGER/EVENT_REFUND_MANAGER/EVENT_DISPUTE_RESOLVER)+OWNER 보유자 합산. **앱**: `eventPermissionProvider`를 서버 플래그 소비형으로 전환(클라이언트 ad-hoc 재계산 제거); 라우트 가드(편집/반복그룹/리스케줄 배치)를 능력플래그 기반으로 교정; 메시지 라우트의 stale `isOpenEvent` 절 제거. **반복 이벤트 그룹**: 비호스트/비공동호스트에게 DRAFT 및 발행 전 취소(publishedAt=null) 자식 세션 메타 필터(NOT_FOUND 응답). **정원 설정 read**: 로그인 임의 사용자 열람 → 호스트∪공동호스트∪클럽 운영진 게이트. 결정: D-F03-2(클럽 운영진 이벤트 편집/공지/신청 권한 부여 하지 않음 = 현행 유지), D-F03-3(독립이벤트 생성주체 = 제품결정 대기). 잔여 비보안 백로그: F03C-04(capacity 이원화)·F03D-01(HOSTS_ONLY 죽은 enum)·F03FG-05/09(위치 공동호스트 드리프트).
- **2026-07-29 (current source 재실측)**: viewer capability를 `canManageCapacity` 포함 **11종**으로 갱신하고 기본 정원 설정 권한(host∪any co-host∪클럽 ADMIN/OWNER)과 고급 `PATCH /capacity-settings` 권한(host/co-host)의 차이를 기록했다. F03-02의 승인 후 선결제 전용 endpoint·참석 확정, k-익명 `fit-preview`, 호스트 재방문 배지, F03-19 주소 좌표 전달, F03-20 뒤집기 교정 체크인까지 현재 서버/Flutter 배선을 반영했다.
