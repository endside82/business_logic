# F20-01. 1:1 문의 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first: community_api/src/main/java/com/endside/community/inquiry/; updated: 2026-06-05 -->

## 1. 결론

1:1 문의는 사용자가 관리자에게 카테고리 기반 스레드를 개설하는 기능이다. 서버는 4개 endpoint(생성·목록·상세·메시지 추가)를 제공하며 모두 로그인 필수(`@AuthenticationPrincipal`)다. 상태는 `OPEN → ANSWERED → CLOSED` 3단계이며 사용자가 추가 메시지를 보내면 `OPEN` 으로 되돌아간다.

`sourceType` 필드가 핵심 분기 포인트다. 기본값 `NONE`은 일반 admin 처리 문의이고, `EVENT/CLUB/SETTLEMENT`를 지정하면 서버가 sourceId 소유권을 검증한다(이벤트 참가자·클럽 멤버·정산 호스트만 작성 가능). 이 경우 호스트 답변 루프 컬럼(`host_response_at`)이 활성화되도록 설계되어 있으나 **v1에서 admin 측 호스트 답변 endpoint가 미구현**이다.

Flutter 측에서는 `SupportIssueApi`가 OperationalIssue 전용으로 구현되어 있고, Inquiry 전용 Flutter 데이터 레이어·화면은 **2026-06-06에 풀스택 구현 완료**되었다. 목록/상세 스레드/작성 화면 + `/profile/inquiries` 라우트 + 마이페이지 진입 메뉴가 서버 4개 endpoint를 소비한다. 다만 **v1 작성 화면은 위의 `sourceType`을 `NONE`으로 고정**하며(컨텍스트 분기 미구현 — `inquiry_screens.dart:204`), EVENT/CLUB/SETTLEMENT 컨텍스트 지정은 후속이다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `InquiryController`, `InquiryService`, `Inquiry`, `InquiryStatus`, `InquirySourceType`, `InquiryCategory`, `InquirySenderType`, `InquiryAddParam`, `InquiryVo`, `InquiryDetailVo`. 앱: `inquiry_screens_test.dart`, `support_issue_api.dart`.

## 3. 전체 동작 흐름

1. 사용자가 마이페이지 > 1:1 문의에서 목록 화면(`/profile/inquiries`)을 거쳐 작성 화면(`/profile/inquiries/new`)에 진입한다 — **2026-06-06 앱 화면·진입점 구현 완료**.
2. 카테고리(`ACCOUNT/PAYMENT/EVENT/CLUB/REPORT/ETC`) + 제목 + 내용을 입력한다. **v1 작성 흐름에서 `sourceType`은 `NONE` 고정**(컨텍스트 분기 미구현 — `inquiry_screens.dart:204` 주석, `InquiryAddParam.sourceType` 기본값 `NONE`). EVENT/CLUB/SETTLEMENT 컨텍스트 지정은 후속.
3. `POST /api/v1/inquiries` 호출. 서버는 category 파싱 후 sourceType 소유권 검증 → `Inquiry` 생성 → 첫 번째 `InquiryMessage` 생성(senderType=USER) → `InquiryDetailVo` 반환.
4. 관리자가 admin 콘솔에서 답변 → `InquiryStatus.ANSWERED`, `answeredAt` 기록. sourceType 비NONE이면 `host_response_at` 기록 가능(v1 미구현).
5. 사용자가 추가 메시지 `POST /api/v1/inquiries/{inquiryId}/messages` → 서버가 소유권 확인 후 상태를 다시 `OPEN`으로 변경.
6. 관리자가 `CLOSED` 처리하면 이후 사용자 메시지 추가 불가(`INQUIRY_CLOSED` 400).
7. 사용자가 `GET /api/v1/inquiries/my` 로 목록(최신순), `GET /api/v1/inquiries/{inquiryId}` 로 상세+스레드 조회.

## 4. 제품 규칙

- 카테고리는 계정, 결제, 이벤트, 클럽, 신고, 기타 여섯 가지이다. 제목은 200자, 내용과 추가 메시지는 각 2000자까지이다.
- 이벤트, 클럽, 정산을 연결하려면 연결 대상이 있어야 하고 본인과 관련이 있어야 한다. 이벤트는 호스트, 공동 호스트, 승인된 참가자, 클럽은 소유자와 멤버, 정산은 그 정산의 호스트만 쓸 수 있다.
- 종결된 문의에는 메시지를 더할 수 없다. 사용자가 메시지를 더하면 문의는 다시 접수 상태가 된다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 사용자 결과 | 판단 |
|---|---|---|---|
| 로그인 사용자 + sourceType=NONE | `createInquiry`, `verifySource` NONE pass | 문의 생성 가능 | 일치 (서버 구현) |
| 로그인 사용자 + sourceType=EVENT + 비참가자 | `verifyEventSource` 검증 실패 | `INQUIRY_SOURCE_NOT_OWNED(403)` | 일치 |
| 로그인 사용자 + sourceType=EVENT + 참가자(APPROVED) | 검증 통과 | 문의 생성 가능, 이벤트 컨텍스트 연결 | 일치 |
| 로그인 사용자 + CLOSED 문의에 메시지 | `addMessage` CLOSED 체크 | `INQUIRY_CLOSED(400)` | 일치 |
| 타인의 문의 상세 조회 | `verifyOwner` 실패 | `INQUIRY_ACCESS_DENIED(403)` | 일치 |
| 비로그인 | 모든 endpoint 인증 필수 | 401 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 문의 접수 | `POST /api/v1/inquiries` 구현됨 | Flutter 구현 완료 | 일치 |
| 문의 목록 | `GET /api/v1/inquiries/my` 구현됨 | Flutter 구현 완료 | 일치 |
| 문의 상세 | `GET /api/v1/inquiries/{id}` 구현됨 | Flutter 구현 완료 | 일치 |
| 메시지 추가 | `POST /api/v1/inquiries/{id}/messages` 구현됨 | Flutter 구현 완료 | 일치 |
| sourceType 분기 | `InquirySourceType` 4개 값, 검증 로직 완성 | v1 작성 화면은 `sourceType=NONE` 고정(컨텍스트 분기 미구현 — `inquiry_screens.dart:204`, `InquiryAddParam` 기본 `NONE`) | 부분(EVENT/CLUB/SETTLEMENT 지정은 후속) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| ~~P0~~ 해소(2026-06-06) | Flutter Inquiry 전 레이어 ~~미구현~~ → **구현 완료** | `InquiryApi`·`data/models/inquiry/`·목록/상세/작성 화면·`/profile/inquiries` 라우트·마이페이지 메뉴 신설 | 사용자가 1:1 문의를 직접 접수·조회 가능 | 완료. 후속은 admin 호스트 답변 루프(P1)·답변 알림(P2)만 잔존 |
| P1 | 호스트 답변 루프 미완 (admin 측) | `inquiry.host_response_at` 컬럼 준비됨. admin_api 호스트 답변 endpoint 없음 | EVENT/CLUB sourceType 문의의 호스트 회신 기능 비활성화 | admin_api 호스트 답변 endpoint + `InquiryService.addHostMessage()` 추가 필요 |
| P2 | SUPPORT_ISSUE_UPDATED 알림 미배선 | `NotificationType(66)` 코드 있으나 `InquiryService`에 알림 emit 없음 | 관리자 답변 도착 시 사용자가 푸시 알림 미수신 | admin_api 답변 처리 시 알림 emit 연결 |
| P3 | `sourceType=SETTLEMENT`의 settlement는 어느 settlement인가 | `InquiryAddParam.sourceId` = settlement.id 이나 어떤 Settlement 테이블인지 코드에서 `SettlementRepository.findById(settlementId)` 사용 → Payment 도메인의 `Settlement` 엔티티 | 사용자가 어떤 settlement ID를 알아야 하는지 UI 가이드 필요 | 문의 생성 화면에서 Settlement 컨텍스트 전달 방법 정의 |

## 9. 수용 기준

### AC-01. 기본 문의 접수

Given 로그인 사용자가 category=PAYMENT, sourceType=NONE으로 문의를 접수한다.  
When `POST /api/v1/inquiries` 가 성공한다.  
Then 서버는 status=OPEN인 Inquiry + 첫 메시지 1건을 생성하고 `InquiryDetailVo`를 201로 반환한다.

### AC-02. sourceType=EVENT 소유권 검증

Given 사용자가 자신이 APPROVED 참가자인 이벤트에 sourceType=EVENT, sourceId={eventId}로 문의한다.  
When `POST /api/v1/inquiries` 를 호출한다.  
Then 소유권 검증을 통과하고 문의가 생성된다.

### AC-03. sourceType=EVENT 비소유자 거부

Given 사용자가 참가하지 않은 이벤트에 sourceType=EVENT로 문의를 시도한다.  
When `POST /api/v1/inquiries` 를 호출한다.  
Then 서버는 `INQUIRY_SOURCE_NOT_OWNED(403)`을 반환한다.

### AC-04. CLOSED 문의 추가 메시지 거부

Given 문의 status=CLOSED인 상태에서 사용자가 메시지를 추가한다.  
When `POST /api/v1/inquiries/{id}/messages` 를 호출한다.  
Then 서버는 `INQUIRY_CLOSED(400)`을 반환한다.

### AC-05. 사용자 추가 메시지 후 OPEN 복귀

Given 문의 status=ANSWERED인 상태에서 사용자가 메시지를 추가한다.  
When 메시지 추가에 성공한다.  
Then 서버는 `inquiry.status = OPEN`, `inquiry.lastMessageAt = now()`으로 갱신한다.

### AC-06. 타인 문의 접근 거부

Given 사용자 A가 사용자 B의 문의 ID로 상세를 조회한다.  
When `GET /api/v1/inquiries/{id}` 를 호출한다.  
Then 서버는 `INQUIRY_ACCESS_DENIED(403)`을 반환한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| ~~구현~~ 해소(2026-06-06) | Flutter Inquiry 데이터 레이어 | InquiryApi·Repository·Provider·목록/상세/작성 화면·라우트 구현 완료 |
| 구현 | 호스트 답변 루프 | admin_api + `InquiryService.addHostMessage()` 신규 메서드 필요 |
| 운영 | sourceType=SETTLEMENT UI 안내 | 어떤 settlement ID를 입력해야 하는지 화면 안내 정의 |
| 알림 | 답변 알림 배선 | admin_api 답변 처리 후 `SUPPORT_ISSUE_UPDATED(66)` emit 연결 |
| 테스트 | 전체 검증 없음 | 단위/통합/Flutter UI 테스트 작성 필요 |
