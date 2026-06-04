# 20. 고객지원 PRD

<!-- source-first: community_api/src/main/java/com/endside/community/inquiry/ + support/; updated: 2026-06-05 -->

> 문서 상태: **신규 도메인 신설본**. 서버 소스 (`inquiry/`, `support/`) 및 Flutter 소스 (`data/api/support_issue_api.dart`, `presentation/support/`, `domain/providers/support/`) 를 1차 자료로 작성한다.

## 1. 결론

**고객지원 도메인**은 사용자가 플랫폼에 도움을 요청하는 두 가지 채널을 제공한다.

- **1:1 문의 (Inquiry)** — 계정·결제·이벤트·클럽·신고 등 카테고리로 관리자에게 직접 접수한다. sourceType(`EVENT/CLUB/SETTLEMENT`)이 있으면 호스트도 답변 가능한 3자 스레드가 열린다 (서버에 설계 돼 있으나 admin 측 호스트 답변 endpoint는 v1 미구현).
- **운영 이슈 (OperationalIssue)** — 결제·환불·정산·신고 등 특정 트랜잭션/정산/신고 오브젝트에 직접 연결해 접수한다. 시스템이 호스트 매핑 가능한 source(PAYMENT/REFUND/SETTLEMENT/REGULAR_MEETING_*)에 한해 자동으로 `relatedHostUserId`를 채워 HostInbox로 라우팅한다. WALLET_TRANSACTION·REPORT는 null(CS 직접 처리).

두 채널은 대상이 다르다. **Inquiry는 카테고리 기반 일반 문의**이고, **OperationalIssue는 특정 소스 객체(transaction/settlement/report)에 묶인 운영 이슈**다. 사용자 입장에서는 진입점이 다르다: Inquiry는 설정 > 고객센터 > 문의하기, OperationalIssue는 각 기능 화면(정산 상세, 거래 내역, 신고 내역)에서 맥락과 함께 접수된다.

**SupportFaq**는 DB 기반 FAQ 테이블 없이 코드에 하드코딩된 문구 제안 기능이다. 문의 작성 화면 진입 시 소스 타입에 맞는 도움말 2개를 최대 5개까지 keyword 필터해 제공한다.

이 도메인은 기능 PRD 3개로 구성된다(F20-01 ~ F20-03).

## 2. 실사 근거 맵

| ID | 기능 | PRD | 핵심 소스 | 상태 |
|---|---|---|---|---|
| F20-01 | 1:1 문의 | [F20-01_inquiry_prd.md](../02_feature_prds/20_support/F20-01_inquiry_prd.md) | `inquiry/controller/InquiryController.java`, `InquiryService.java`, `InquiryStatus`, `InquirySourceType`, `InquiryCategory` | 구현됨 |
| F20-02 | 운영 이슈 | [F20-02_operational-issue_prd.md](../02_feature_prds/20_support/F20-02_operational-issue_prd.md) | `support/controller/OperationalIssueController.java`, `OperationalIssueService.java`, `OperationalIssueSourceType`, `OperationalIssueStatus`, `OperationalIssueEvidenceVisibility` | 구현됨 |
| F20-03 | 지원 FAQ 제안 | [F20-03_support-faq_prd.md](../02_feature_prds/20_support/F20-03_support-faq_prd.md) | `support/controller/SupportFaqController.java`, `SupportFaqSuggestionService.java` | 구현됨 (코드 하드코딩) |

## 3. 도메인 핵심 설계 결정

### 3-1. 두 채널의 역할 분담

| 구분 | Inquiry | OperationalIssue |
|---|---|---|
| 진입 맥락 | 카테고리 + 자유 텍스트 | 특정 소스 객체 ID 필수 |
| 소스 연결 | NONE/EVENT/CLUB/SETTLEMENT | WALLET_TRANSACTION/PAYMENT/REFUND/SETTLEMENT/REPORT/REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT |
| 답변 주체 | 관리자 (+ sourceType 있을 시 호스트 가능) | 운영자 (HOST_ONLY visibility 시 호스트 열람 가능) |
| 증빙 첨부 | 없음 | evidenceFileIds(최대 5개) + evidenceVisibility |
| 자동 라우팅 | 없음 | relatedHostUserId 자동 채우기 → HostInbox |
| DB 테이블 | `inquiry`, `inquiry_message` | `operational_issue`, `operational_issue_message` |

### 3-2. InquirySourceType 의 의미

`InquirySourceType`은 누가 답변할 수 있는지를 결정한다.

- `NONE` (기본): 관리자만 답변. sourceId 무시.
- `EVENT`: event 호스트·공동호스트 또는 APPROVED/APPROVED_PENDING_PAYMENT/CANCEL_PENDING_REFUND 참가자만 작성 가능. 호스트 답변 루프 활성화(v1 admin 측 미구현).
- `CLUB`: club owner 또는 ClubMember만 작성 가능. 호스트 답변 루프 활성화(v1 미구현).
- `SETTLEMENT`: hostUserId 본인만 작성 가능. 정산 호스트 전용.

소스 참조: `InquiryService.verifySource()` (`InquiryService.java:144-157`)

### 3-3. OperationalIssue 자동 라우팅 (Wave C-1)

`createIssue()` 시점에 `resolveRelatedHostUserId()`가 sourceType별로 호스트를 자동 해석한다.

- `SETTLEMENT/REGULAR_MEETING_SETTLEMENT` → `MeetingSettlement.creatorUserId`
- `PAYMENT/REFUND` → PointTransaction → Event → `Event.hostUserId`
- `REGULAR_MEETING_PAYMENT` → PointTransaction → RegularMeetingPayment → RegularMeeting → `RegularMeeting.hostUserId`
- `WALLET_TRANSACTION/REPORT` → null (일반 거래·신고는 단일 호스트 매핑 불가)

소스 참조: `OperationalIssueService.resolveRelatedHostUserId()` (`OperationalIssueService.java:222-256`)

### 3-4. OperationalIssue 유입 경로

사용자가 직접 접수하는 경로 외에, 시스템이 자동으로 운영 이슈를 emit하는 경로가 **v1 기준 없다**. 자동 발제는 dispute SLA 임박·settlement limbo 등 다른 도메인에서 emit하는 방향으로 설계 가능하지만, 현재는 모두 **사용자 수동 접수**다. `NotificationType.SUPPORT_ISSUE_UPDATED(66)` 알림 코드가 정의되어 있으나 서버 `OperationalIssueService` 내에서 알림 emit 코드가 없음 — admin 측에서 답변 시 emit하는 것으로 설계된 것으로 보이나 admin api 구현에만 존재할 가능성이 있다.

## 4. 도메인 책임 한도

| 영역 | 책임 | 비고 |
|---|---|---|
| 문의 접수·조회·메시지 | 사용자 측 CRUD 전담 | admin 관리 페이지는 community_admin_api 별도 |
| sourceType 소유권 검증 | 접수 시점 서버 강제 검증 | EVENT/CLUB/SETTLEMENT별 로직 상이 |
| 자동 라우팅 (OperationalIssue) | creatorUserId/hostUserId 자동 채우기 | HostInbox는 admin_api 영역 |
| 증빙 첨부 | OperationalIssue만 지원 (max 5파일) | EVIDENCE/REVIEW purpose 파일만 허용 |
| FAQ 제안 | 코드 하드코딩 제안 (DB 없음) | 최대 5개, keyword 필터 |
| 분쟁 (DisputeCase) | **이 도메인이 아님 — 도메인 18** | 분쟁은 양측 당사자 구조, 법적 hold 포함 |
| 신고 처리 결과 | **이 도메인이 아님 — 도메인 11** | 신고 접수·조치는 review/ReportController |
| 경고·징계 | **이 도메인이 아님 — 도메인 15** | WarningController 영역 |

### 이웃 도메인과의 경계

| 이웃 | 구분 기준 |
|---|---|
| 도메인 18 분쟁 | DisputeCase = 양측 당사자(피신고자 포함)·법적 hold·appeal·SLA. OperationalIssue = reporter 단방향·CS 처리·법적 hold 없음. |
| 도메인 11 신고 (F11-04) | Report = 콘텐츠 위반 신고(ReportController). OperationalIssue sourceType=REPORT = 신고 결과에 대한 운영 문의. 역할이 다름. |
| 도메인 15 경고 (F15-02) | Warning = 징계 처분. OperationalIssue = 결제/환불/정산 이슈. 겹치지 않음. |

## 5. 핵심 데이터 인프라

### 5-1. 테이블 2종 (inquiry 측)

| 테이블 | 핵심 컬럼 | 인덱스 |
|---|---|---|
| `inquiry` | `id, user_id, category(30), title(200), status(20), assignee_admin_id, last_message_at, answered_at, closed_at, source_type(20) DEFAULT 'NONE', source_id, host_response_at, created_at, updated_at` | `idx_inquiry_user`, `idx_inquiry_status`, `idx_inquiry_source` |
| `inquiry_message` | `id, inquiry_id, sender_type(10), sender_id, content(text), created_at` | `idx_inquiry_message_inquiry` |

### 5-2. 테이블 2종 (support 측)

| 테이블 | 핵심 컬럼 | 인덱스 |
|---|---|---|
| `operational_issue` | `id, source_type(40), source_id, reporter_user_id, assignee_user_id, related_host_user_id, status(20) DEFAULT 'OPEN', title(120), last_message_at, resolved_at, evidence_file_ids(JSON), evidence_visibility(20), created_at, updated_at` | `idx_operational_issue_reporter`, `idx_operational_issue_source`, `idx_operational_issue_status`, `idx_operational_issue_related_host` |
| `operational_issue_message` | `id, issue_id, author_user_id, author_role(20), content(text), user_visible(tinyint default 1), created_at` | `idx_operational_issue_message_issue` |

### 5-3. Enum 목록

| Enum | 값 | 파일 |
|---|---|---|
| `InquiryStatus` | `OPEN, ANSWERED, CLOSED` | `inquiry/constants/InquiryStatus.java` |
| `InquirySourceType` | `NONE, EVENT, CLUB, SETTLEMENT` | `inquiry/constants/InquirySourceType.java` |
| `InquiryCategory` | `ACCOUNT, PAYMENT, EVENT, CLUB, REPORT, ETC` | `inquiry/constants/InquiryCategory.java` |
| `InquirySenderType` | `USER, ADMIN` | `inquiry/constants/InquirySenderType.java` |
| `OperationalIssueStatus` | `OPEN, IN_PROGRESS, RESOLVED, REJECTED` | `support/constants/OperationalIssueStatus.java` |
| `OperationalIssueSourceType` | `WALLET_TRANSACTION, PAYMENT, REFUND, SETTLEMENT, REPORT, REGULAR_MEETING_PAYMENT, REGULAR_MEETING_SETTLEMENT` | `support/constants/OperationalIssueSourceType.java` |
| `OperationalIssueAuthorRole` | `USER, OPERATOR` | `support/constants/OperationalIssueAuthorRole.java` |
| `OperationalIssueEvidenceVisibility` | `PARTIES, HOST_ONLY, CS_ONLY` | `support/constants/OperationalIssueEvidenceVisibility.java` |

### 5-4. ErrorCode 블록

| 코드 | HTTP | 서버 번호 | 설명 |
|---|---|---|---|
| `INQUIRY_NOT_FOUND` | 404 | 2300006 | 문의 없음 |
| `INQUIRY_ACCESS_DENIED` | 403 | 2300007 | 접근 거부 |
| `INQUIRY_CLOSED` | 400 | 2300008 | 종결된 문의에 메시지 추가 시도 |
| `INQUIRY_INVALID_CATEGORY` | 400 | 2300009 | 잘못된 카테고리 값 |
| `INQUIRY_SOURCE_NOT_FOUND` | 404 | 2300010 | 소스 객체 없음 |
| `INQUIRY_SOURCE_NOT_OWNED` | 403 | 2300011 | 소스 소유권 없음 |
| `INQUIRY_SOURCE_ID_REQUIRED` | 400 | 2300012 | sourceType 비NONE 시 sourceId 누락 |
| `OPERATIONAL_ISSUE_SOURCE_NOT_OWNED` | 403 | 3000001 | 운영 이슈 소스 소유권 없음 |
| `OPERATIONAL_ISSUE_SOURCE_NOT_FOUND` | 404 | 3000002 | 운영 이슈 소스 객체 없음 |
| `OPERATIONAL_ISSUE_EVIDENCE_FILE_INVALID` | 400 | 3000003 | 증빙 파일 상태/purpose 불적합 |
| `OPERATIONAL_ISSUE_EVIDENCE_FILE_NOT_OWNED` | 403 | 3000004 | 증빙 파일 소유권 없음 |
| `OPERATIONAL_ISSUE_EVIDENCE_TOO_MANY` | 400 | 3000005 | 증빙 5개 초과 |

## 6. 도메인 외부 영향

| 도메인 | 영향 | 이유 |
|---|---|---|
| 06 결제·지갑 | **있음** | OperationalIssue sourceType PAYMENT/REFUND/WALLET_TRANSACTION → PointTransaction 소유권 검증 및 hostUserId 해석 |
| 07 모임 정산 | **있음** | OperationalIssue sourceType SETTLEMENT/REGULAR_MEETING_SETTLEMENT → MeetingSettlement 조회 + host 라우팅 |
| 11 신고 | **있음** | OperationalIssue sourceType REPORT → Report 소유권 검증 (reporter만 접수 가능) |
| 12 알림 | 조건부 | `NotificationType.SUPPORT_ISSUE_UPDATED(66)` 코드 정의됨. 사용자에게 답변 도착 시 알림 emit 설계이나 community_api 서버에서 emit 코드 미확인 (admin_api에만 있을 가능성) |
| 17 정기모임 | **있음** | OperationalIssue sourceType REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT → RegularMeetingPayment/RegularMeeting 조회 + host 라우팅 |
| 18 분쟁 | **경계 명확** | HostInbox는 OperationalIssue.relatedHostUserId로 이슈를 source-routing. 단 DisputeCase 자체는 별도 도메인 |

## 7. 진행 상태 (2026-06-05 기준)

| 레이어 | 상태 |
|---|---|
| 서버 inquiry 도메인 | 구현 완료 (4 endpoint, InquirySourceType D-09 포함) |
| 서버 support 도메인 | 구현 완료 (5 endpoint OperationalIssue + 1 endpoint FAQ) |
| Flutter 데이터 레이어 (OperationalIssue) | 구현 완료 (models/api/repository/providers) |
| Flutter 화면 (OperationalIssue) | 구현 완료 (3 screens: List/Detail/Create) |
| Flutter 데이터 레이어 (Inquiry) | **미구현** — InquiryApi, InquiryRepository, InquiryProvider 없음 |
| Flutter 화면 (Inquiry) | **미구현** — 설정 화면에서 Inquiry 진입점 없음 |
| PRD 문서 | 신설 (본 문서) |

## 8. 잔여 후속

| 항목 | 차단 사유 |
|---|---|
| Flutter Inquiry 데이터 레이어 + 화면 | Flutter에 InquiryApi/InquiryRepository/화면 없음. 서버 endpoint 4개 구현됨. |
| 호스트 답변 루프 (Inquiry sourceType EVENT/CLUB) | admin_api에 호스트 답변 endpoint 미구현. `inquiry.host_response_at` 컬럼은 준비돼 있음. |
| SUPPORT_ISSUE_UPDATED 알림 emit | community_api 서버에서 OperationalIssueService가 답변 시 알림 emit하는 코드 없음. admin_api에만 있을 가능성. |
| OperationalIssue Flutter 모델 — REGULAR_MEETING_* sourceType 미반영 | Flutter `OperationalIssueSourceType` enum에 `REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT` 없음 (서버에는 존재). |
| 증빙 첨부 Flutter UI | `OperationalIssueCreateParam`에 `evidenceFileIds` 필드 없음. 서버는 지원. |
