# F20-02. 운영 이슈 PRD

<!-- source-first: community_api/src/main/java/com/endside/community/support/; updated: 2026-06-05 -->

## 1. 결론

운영 이슈는 사용자가 **특정 소스 객체(트랜잭션·정산·신고)**에 연결해 운영 지원을 요청하는 구조화된 채널이다. 서버는 5개 endpoint를 제공하며 (`POST /api/v1/support/issues`, `GET /my`, `GET /my/by-source`, `GET /{issueId}`, `POST /{issueId}/messages`) 모두 로그인 필수다.

`OperationalIssueSourceType` 7개 값(WALLET_TRANSACTION/PAYMENT/REFUND/SETTLEMENT/REPORT/REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT)은 어떤 객체에 대한 이슈인지와 소유권 검증 방식을 결정한다. 접수 시점에 서버가 호스트 매핑 가능한 source(PAYMENT/REFUND/SETTLEMENT/REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT)에 한해 자동으로 `relatedHostUserId`를 채워 HostInbox에서 source별 라우팅이 가능하게 한다. WALLET_TRANSACTION과 REPORT는 단일 호스트로 환원되지 않아 null(CS 직접 처리)이다.

Flutter 측은 완전히 구현되어 있다. `SupportIssueApi` (Retrofit) → `SupportIssueRepository` → `SupportIssueMutation/Detail/List` Provider → 3개 화면(목록·상세·작성)이 모두 존재하고 프로필 탭 라우터에 연결되어 있다. 단 **Flutter `OperationalIssueSourceType` enum에 `REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT`가 없어** 정기모임 관련 운영 이슈 접수 화면을 진입하면 enum 파싱 fallback이 발동한다.

증빙 첨부(`evidenceFileIds` 최대 5개)와 증빙 가시성(`evidenceVisibility: PARTIES/HOST_ONLY/CS_ONLY`)이 서버는 지원하지만 **Flutter `OperationalIssueCreateParam`에 `evidenceFileIds` 필드가 없어 첨부 UI가 불가**한 상태다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `support/controller/OperationalIssueController.java:1-72` | 5개 endpoint 전수 |
| Backend Service | `support/service/OperationalIssueService.java:59-458` | createIssue, 소유권 검증, relatedHostUserId 해석, evidence 검증, FAQ 연동 |
| Backend Entity | `support/model/OperationalIssue.java`, `OperationalIssueMessage.java` | 컬럼 전체 |
| Backend Enum | `OperationalIssueStatus.java`, `OperationalIssueSourceType.java`, `OperationalIssueAuthorRole.java`, `OperationalIssueEvidenceVisibility.java` | 전체 값 |
| Backend Param | `OperationalIssueCreateParam.java`, `OperationalIssueMessageParam.java` | 요청 필드 |
| Backend VO | `OperationalIssueVo.java`, `OperationalIssueMessageVo.java`, `SupportIssueNotificationData.java` | 응답 필드, 알림 데이터 |
| Backend ErrorCode | `ErrorCode.java:543-547` | OPERATIONAL_ISSUE_* 5개 |
| Frontend API | `data/api/support_issue_api.dart` | 5 endpoint Retrofit |
| Frontend Model | `data/models/support/operational_issue.dart` | Freezed OperationalIssue, OperationalIssueSourceType enum |
| Frontend Param | `data/models/support/operational_issue_create_param.dart` | Freezed Param |
| Frontend Repository | `data/repositories/support_issue_repository.dart` | Result<T> 래핑 |
| Frontend Provider | `domain/providers/support/support_issue_provider.dart` | mySupportIssues, detail, mutation |
| Frontend Screen | `presentation/support/screens/support_issue_screens.dart` | MySupportIssuesScreen, SupportIssueDetailScreen, SupportIssueCreateScreen |
| Frontend Router | `core/router/app_router.dart:2921-2956` | profileSupportIssueCreate/Detail/Issues 라우트 |
| Frontend Routes | `core/router/routes.dart:171-179` | profileSupport, profileSupportIssues, profileSupportIssueDetail, profileSupportIssueCreate |
| DB | `V1__init.sql:1533-1573` | `operational_issue`, `operational_issue_message` DDL |
| Notification | `NotificationType.java:129` — `SUPPORT_ISSUE_UPDATED(66)` | 답변 알림 코드 |
| Verification | **테스트 없음** | 검증 공백 |

## 3. 전체 동작 흐름

### 사용자 수동 접수 경로

1. 사용자가 거래 내역, 정산 화면, 신고 내역 등 각 기능 화면에서 "운영 문의" 버튼 탭 → `context.push('/profile/support-issues/new?sourceType=PAYMENT&sourceId=123')`.
2. `SupportIssueCreateScreen(sourceType, sourceId)` 진입. 서버 FAQ 제안(`GET /api/v1/support/faq/suggestions`) 선행 표시.
3. 제목(선택)·내용 입력 → `SupportIssueMutation.createIssue(OperationalIssueCreateParam)` 호출.
4. 서버 `OperationalIssueService.createIssue()`:
   a. `validateSourceOwnership(userId, sourceType, sourceId)` — sourceType별 소유권 검증.
   b. `validateAndNormalizeEvidence()` — 증빙 파일 검증 (v1 Flutter에서 미전달).
   c. `resolveRelatedHostUserId()` — 자동 호스트 해석.
   d. `OperationalIssue` 저장 + 첫 `OperationalIssueMessage`(authorRole=USER) 저장.
   e. `OperationalIssueVo` 반환.
5. Flutter가 성공 toast 후 `/profile/support-issues/{id}` push.
6. `SupportIssueDetailScreen` 15초 주기로 자동 갱신(polling timer).

### 운영자 답변 경로 (admin_api 측)

1. admin_api HostInbox 또는 CS 콘솔에서 운영자가 issue를 처리.
2. `OperationalIssueMessage`(authorRole=OPERATOR) 추가 + `status` IN_PROGRESS/RESOLVED/REJECTED 변경.
3. `NotificationType.SUPPORT_ISSUE_UPDATED(66)` 알림 emit — community_api `OperationalIssueService`에는 없음. admin_api에만 있을 것으로 추정. **확인 필요(Gap)**.

## 4. 서버 계약

### `POST /api/v1/support/issues`

| 항목 | 실제 계약 |
|---|---|
| Controller | `OperationalIssueController#createIssue` (`OperationalIssueController.java:29-34`) |
| 인증 | 필수 |
| Body | `OperationalIssueCreateParam` |
| 응답 | `OperationalIssueVo` (201 Created) |
| 에러 | `OPERATIONAL_ISSUE_SOURCE_NOT_OWNED(403)`, `OPERATIONAL_ISSUE_SOURCE_NOT_FOUND(404)`, `OPERATIONAL_ISSUE_EVIDENCE_TOO_MANY(400)`, `OPERATIONAL_ISSUE_EVIDENCE_FILE_INVALID(400)`, `OPERATIONAL_ISSUE_EVIDENCE_FILE_NOT_OWNED(403)` |

`OperationalIssueCreateParam` 필드:

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `sourceType` | `OperationalIssueSourceType` | `@NotNull` | 소스 타입 |
| `sourceId` | `Long` | `@NotNull` | 소스 객체 ID |
| `title` | `String` | nullable, max 120 | null 시 sourceType별 기본 제목 자동 설정 |
| `content` | `String` | `@NotBlank, max 2000` | 첫 메시지 내용 |
| `evidenceFileIds` | `List<Long>` | nullable, max 5 | 증빙 파일 ID 목록 |
| `evidenceVisibility` | `OperationalIssueEvidenceVisibility` | nullable | null 시 sourceType별 기본값 적용 |

**자동 제목 매핑** (`OperationalIssueService.resolveTitle()`, `java:396-409`):

| sourceType | 자동 제목 |
|---|---|
| REFUND | "환불 문의" |
| PAYMENT | "결제 문의" |
| WALLET_TRANSACTION | "거래 문의" |
| SETTLEMENT | "정산 문의" |
| REPORT | "신고 문의" |
| REGULAR_MEETING_PAYMENT | "정기모임 결제 문의" |
| REGULAR_MEETING_SETTLEMENT | "정기모임 정산 문의" |

### `GET /api/v1/support/issues/my`

| 항목 | 실제 계약 |
|---|---|
| Controller | `OperationalIssueController#getMyIssues` (`OperationalIssueController.java:36-43`) |
| 인증 | 필수 |
| Query | `PagingParam (page, size)` |
| 응답 | `Page<OperationalIssueVo>` (updatedAt DESC 정렬) |
| 주의 | Flutter는 `PageResponse<OperationalIssue>` 로 받아 `page.content` 추출 |

### `GET /api/v1/support/issues/my/by-source`

| 항목 | 실제 계약 |
|---|---|
| Controller | `OperationalIssueController#getMyIssuesBySource` (`OperationalIssueController.java:45-53`) |
| 인증 | 필수 |
| Query | `sourceType: OperationalIssueSourceType`, `sourceId: long` |
| 소유권 재검증 | 서버가 `validateSourceOwnership()` 재호출 |
| 응답 | `List<OperationalIssueVo>` |

### `GET /api/v1/support/issues/{issueId}`

| 항목 | 실제 계약 |
|---|---|
| Controller | `OperationalIssueController#getMyIssue` (`OperationalIssueController.java:55-61`) |
| 인증 | 필수 |
| 소유권 | `findByIdAndReporterUserId` — reporter 본인만 가능 |
| 응답 | `OperationalIssueVo` (messages 포함, userVisible=true인 메시지만) |
| 에러 | `NOT_FOUND(404)` (소유권 없거나 없는 경우 동일 처리) |

### `POST /api/v1/support/issues/{issueId}/messages`

| 항목 | 실제 계약 |
|---|---|
| Controller | `OperationalIssueController#addMessage` (`OperationalIssueController.java:63-71`) |
| 인증 | 필수 |
| Body | `OperationalIssueMessageParam { content: @NotBlank max 2000 }` |
| 에러 | `NOT_FOUND(404)`, `INVALID_INPUT(400)` (status.isClosed() 시) |
| 사이드이펙트 | `issue.lastMessageAt = now()` |
| 응답 | `OperationalIssueVo` |

### OperationalIssueVo 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | `Long` | 이슈 ID |
| `sourceType` | `String` | OperationalIssueSourceType.name() |
| `sourceId` | `Long` | 소스 객체 ID |
| `reporterUserId` | `Long` | 작성자 |
| `assigneeUserId` | `Long` | nullable |
| `status` | `String` | OperationalIssueStatus.name() |
| `title` | `String` | 제목 |
| `lastMessageAt` | `LocalDateTime` | nullable |
| `resolvedAt` | `LocalDateTime` | nullable |
| `createdAt` | `LocalDateTime` | nullable |
| `updatedAt` | `LocalDateTime` | nullable |
| `messages` | `List<OperationalIssueMessageVo>` | userVisible=true 필터 |
| `evidenceFileIds` | `List<Long>` | nullable 또는 빈 리스트 |
| `evidenceVisibility` | `String` | nullable |

`OperationalIssueMessageVo`: `{ id, issueId, authorUserId, authorRole(USER/OPERATOR), content, userVisible, createdAt }`

### 소유권 검증 매트릭스

| sourceType | 검증 로직 (`OperationalIssueService.java:157-212`) |
|---|---|
| WALLET_TRANSACTION | `PointTransaction.userId == userId` |
| PAYMENT | `PointTransaction.userId == userId` |
| REFUND | `PointTransaction.userId == userId` |
| REGULAR_MEETING_PAYMENT | `PointTransaction.userId == userId` |
| SETTLEMENT | `MeetingSettlement.creatorUserId == userId` OR `MeetingSettlementItem.holderUserId == userId` OR `MeetingSettlementShare.userId == userId` |
| REGULAR_MEETING_SETTLEMENT | 동일 (SETTLEMENT과 동일 로직) |
| REPORT | `Report.reporterId == userId` |

### evidenceVisibility 기본값 매트릭스

| sourceType | 기본 visibility (`OperationalIssueEvidenceVisibility.java:24-33`) |
|---|---|
| WALLET_TRANSACTION/PAYMENT/REFUND/SETTLEMENT/REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT | `PARTIES` |
| REPORT | `CS_ONLY` |

### relatedHostUserId 자동 해석

| sourceType | 해석 경로 (`OperationalIssueService.java:222-256`) |
|---|---|
| SETTLEMENT/REGULAR_MEETING_SETTLEMENT | `MeetingSettlement.creatorUserId` |
| PAYMENT/REFUND | PointTransaction → Event → `Event.hostUserId` |
| REGULAR_MEETING_PAYMENT | PointTransaction → RegularMeetingPayment → RegularMeeting → `RegularMeeting.hostUserId` |
| WALLET_TRANSACTION/REPORT | null (라우팅 불가) |

## 5. 프론트 계약

| 항목 | 구현 상태 |
|---|---|
| Route `/profile/support-issues` | `Routes.profileSupportIssues` → `MySupportIssuesScreen` |
| Route `/profile/support-issues/new?sourceType=X&sourceId=Y` | `Routes.profileSupportIssueCreate` → `SupportIssueCreateScreen` |
| Route `/profile/support-issues/:issueId` | `Routes.profileSupportIssueDetail` → `SupportIssueDetailScreen` |
| API | `SupportIssueApi` — 5 endpoint 정확히 매핑 |
| Model | `OperationalIssue`, `OperationalIssueMessage` (Freezed) |
| Repository | `SupportIssueRepository` (Result<T> 패턴) |
| Provider | `mySupportIssuesProvider`, `supportIssueDetailProvider(id)`, `supportIssuesBySourceProvider(type, id)`, `supportFaqSuggestionsProvider(type, id, query)`, `SupportIssueMutation` |
| 목록 갱신 | `mySupportIssuesProvider.invalidate()` on RefreshIndicator |
| 상세 갱신 | 15초 polling timer (`Timer.periodic(15s)`) |
| 에러 처리 | `showApiErrorToast(context, error, fallback: ...)` |
| CTA | 문의 목록 카드 탭 → 상세. 상세에서 추가 메시지(status.isClosed 시 입력창 숨김). |

Flutter `OperationalIssueSourceType` enum 현재 값:

```dart
// operational_issue.dart:7-24
enum OperationalIssueSourceType {
  walletTransaction('WALLET_TRANSACTION'),
  payment('PAYMENT'),
  refund('REFUND'),
  settlement('SETTLEMENT'),
  report('REPORT');
  // REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT 없음 — Gap
}
```

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | Flutter 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 로그인 + 유효한 sourceType + 소유권 있음 | `validateSourceOwnership` 통과 | `SupportIssueCreateScreen` 문의 생성 | 접수 성공 | 일치 |
| 로그인 + 소유권 없음 | `OPERATIONAL_ISSUE_SOURCE_NOT_OWNED(403)` | `showApiErrorToast` | 에러 toast | 일치 |
| 로그인 + sourceType=REGULAR_MEETING_PAYMENT | 서버 처리 가능 | Flutter enum 없음 → fallback → `walletTransaction`으로 파싱 | 잘못된 sourceType 전달 가능 | **Gap** |
| 로그인 + RESOLVED/REJECTED 이슈 메시지 추가 | `status.isClosed() → INVALID_INPUT(400)` | `!status.isClosed` 조건 → 입력창 숨김 | 입력창 표시 안 됨 | 일치 |
| 비로그인 | 모든 endpoint 401 | Auth guard | 로그인 화면 redirect | 일치 |
| 상세 타인 접근 | `findByIdAndReporterUserId` 실패 → NOT_FOUND | `AppErrorState` | 에러 화면 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 5 endpoint | 완전 구현 | SupportIssueApi 5 method 정확 매핑 | 일치 |
| OperationalIssueStatus 4종 | OPEN/IN_PROGRESS/RESOLVED/REJECTED | Dart enum 4종 label 포함 | 일치 |
| sourceType 7종 | 서버 7종 | Flutter 5종 (REGULAR_MEETING_* 2종 누락) | **불일치** |
| evidenceFileIds | 서버 지원 (max 5) | Flutter CreateParam에 없음 | **불일치** |
| evidenceVisibility | 서버 응답에 포함 | Flutter OperationalIssue 모델에 없음 | Gap |
| 목록 반환 타입 | `Page<OperationalIssueVo>` (Spring Page) | `PageResponse<OperationalIssue>` | 일치 |
| 메시지 필터 | `userVisible=true` 필터 | Flutter는 서버가 내려주는 대로 렌더링 | 일치 |
| 알림 emit | `SUPPORT_ISSUE_UPDATED(66)` 코드 있으나 community_api emit 없음 | Flutter NotificationRouter에 라우팅 설계 필요 | Gap |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P0 | Flutter OperationalIssueSourceType enum에 REGULAR_MEETING_* 2종 누락 | `operational_issue.dart:7-24` — enum 5종, 서버 7종 | 정기모임 관련 운영 이슈 접수 시 잘못된 sourceType 전달로 소유권 검증 실패 또는 엉뚱한 이슈 생성 | `REGULAR_MEETING_PAYMENT('REGULAR_MEETING_PAYMENT')`, `REGULAR_MEETING_SETTLEMENT('REGULAR_MEETING_SETTLEMENT')` Flutter enum에 추가 |
| P1 | Flutter OperationalIssueCreateParam에 evidenceFileIds 없음 | `operational_issue_create_param.dart:10-16` — 4필드, 서버는 evidenceFileIds/evidenceVisibility 지원 | 증빙 첨부 UI 불가. 분쟁 수준 이슈 접수 시 증빙 전달 불가 | Param에 `List<int>? evidenceFileIds` 추가 |
| P1 | Flutter OperationalIssue 모델에 evidenceVisibility 없음 | `operational_issue.dart:63-82` — evidenceVisibility 필드 없음 | 서버 응답의 visibility 정보 무시 | 모델에 `String? evidenceVisibility` 추가 |
| P2 | SUPPORT_ISSUE_UPDATED 알림 emit 위치 불명 | `OperationalIssueService` emit 코드 없음. `SupportIssueNotificationData` VO는 존재 | 운영자 답변 시 사용자 push 알림 미수신 가능 | admin_api 답변 처리 경로 확인 및 emit 추가 |
| P3 | 상세 15초 polling — 서버 부하 | `SupportIssueDetailScreen._refreshTimer = Timer.periodic(15s)` | 이슈 상세를 오래 열어두면 불필요한 API 호출 발생 | WebSocket 또는 long polling으로 교체 검토 |

## 9. 수용 기준

### AC-01. 결제 이슈 접수

Given 로그인 사용자가 자신의 PointTransaction ID로 sourceType=PAYMENT 운영 이슈를 접수한다.  
When `POST /api/v1/support/issues` 가 성공한다.  
Then 서버는 status=OPEN, title="결제 문의"(자동), relatedHostUserId=이벤트 호스트 ID인 OperationalIssue를 생성한다.

### AC-02. 소유권 없는 sourceId 접수 거부

Given 사용자 A가 사용자 B 소유의 PointTransaction ID로 운영 이슈를 접수한다.  
When `POST /api/v1/support/issues` 를 호출한다.  
Then 서버는 `OPERATIONAL_ISSUE_SOURCE_NOT_OWNED(403)`을 반환한다.

### AC-03. 목록 페이지네이션

Given 사용자가 운영 이슈 목록을 요청한다.  
When `GET /api/v1/support/issues/my?page=0&size=20` 을 호출한다.  
Then 서버는 updatedAt DESC 정렬된 `Page<OperationalIssueVo>`를 반환한다. Flutter는 `page.content` 리스트를 카드 목록으로 표시한다.

### AC-04. RESOLVED 이슈 메시지 추가 차단

Given 이슈 status=RESOLVED 상태에서 사용자가 메시지를 추가한다.  
When `POST /api/v1/support/issues/{id}/messages` 를 호출한다.  
Then 서버는 `INVALID_INPUT(400)`을 반환한다. Flutter는 상세 화면에서 status.isClosed=true이므로 입력창을 숨긴다.

### AC-05. 신고 관련 이슈 CS_ONLY visibility

Given 사용자가 sourceType=REPORT로 이슈를 접수한다.  
When evidenceVisibility 미지정 상태로 생성된다.  
Then 서버는 evidenceVisibility=CS_ONLY를 자동 설정한다.

### AC-06. by-source 조회

Given 사용자가 특정 settlement에 연결된 운영 이슈를 조회한다.  
When `GET /api/v1/support/issues/my/by-source?sourceType=SETTLEMENT&sourceId=456` 을 호출한다.  
Then 서버는 소유권 재검증 후 해당 settlement 관련 이슈 목록을 반환한다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | Flutter REGULAR_MEETING_* enum 추가 | `operational_issue.dart` enum 2종 추가 후 build_runner |
| 구현 | Flutter evidenceFileIds 첨부 UI | CreateParam + Screen 파일 선택기 추가 |
| 구현 | Flutter evidenceVisibility 모델 필드 추가 | `OperationalIssue.dart` 필드 추가 |
| 운영 | SUPPORT_ISSUE_UPDATED emit 경로 확인 | community_admin_api OperationalIssueAdminService에서 emit 여부 확인 |
| 성능 | 상세 화면 polling 교체 | 15초 polling → SSE/WebSocket 또는 pull-to-refresh만 사용 검토 |
| 테스트 | 서비스 단위 테스트 | `OperationalIssueService` 소유권 검증·호스트 라우팅·evidence 검증 테스트 없음 |
