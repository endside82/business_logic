# F20-02. 운영 이슈 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first: community_api/src/main/java/com/endside/community/support/; updated: 2026-06-05 -->

## 1. 결론

운영 이슈는 사용자가 **특정 소스 객체(트랜잭션·정산·신고)**에 연결해 운영 지원을 요청하는 구조화된 채널이다. 서버는 5개 endpoint를 제공하며 (`POST /api/v1/support/issues`, `GET /my`, `GET /my/by-source`, `GET /{issueId}`, `POST /{issueId}/messages`) 모두 로그인 필수다.

`OperationalIssueSourceType` 7개 값(WALLET_TRANSACTION/PAYMENT/REFUND/SETTLEMENT/REPORT/REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT)은 어떤 객체에 대한 이슈인지와 소유권 검증 방식을 결정한다. 접수 시점에 서버가 호스트 매핑 가능한 source(PAYMENT/REFUND/SETTLEMENT/REGULAR_MEETING_PAYMENT/REGULAR_MEETING_SETTLEMENT)에 한해 자동으로 `relatedHostUserId`를 채워 HostInbox에서 source별 라우팅이 가능하게 한다. WALLET_TRANSACTION과 REPORT는 단일 호스트로 환원되지 않아 null(CS 직접 처리)이다.

Flutter 측은 완전히 구현되어 있다. `SupportIssueApi` (Retrofit) → `SupportIssueRepository` → `SupportIssueMutation/Detail/List` Provider → 3개 화면(목록·상세·작성)이 모두 존재하고 프로필 탭 라우터에 연결되어 있다. Flutter `OperationalIssueSourceType` 은 서버 7종을 모두 갖고(정기모임 결제·정산 문의 포함), 모르는 값은 `unknown` 으로 읽는다.

증빙 첨부(`evidenceFileIds` 최대 5개)와 증빙 가시성(`evidenceVisibility: PARTIES/HOST_ONLY/CS_ONLY`)을 서버가 지원하고, 앱은 접수와 스레드 메시지에 올린 증빙 id 를 보낸다. 가시성은 앱이 보내지 않아 서버의 sourceType 별 기본값을 따른다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `OperationalIssueController`, `OperationalIssueService`, `OperationalIssue`, `OperationalIssueMessage`, `OperationalIssueStatus`, `OperationalIssueSourceType`, `OperationalIssueAuthorRole`, `OperationalIssueEvidenceVisibility`, `OperationalIssueCreateParam`, `OperationalIssueMessageParam`. 앱: `support_issue_api.dart`, `operational_issue.dart`, `operational_issue_create_param.dart`, `support_issue_repository.dart`, `support_issue_provider.dart`, `support_issue_screens.dart`, `app_router.dart`, `routes.dart`.

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

## 4. 제품 규칙

- 대상 소유 확인: 지갑 거래, 결제, 환불, 정기모임 결제는 본인 거래만, 정산과 정기모임 정산은 정산 호스트이거나 정산 항목을 받는 사람, 신고는 신고한 본인만 접수할 수 있다.
- 제목을 비우면 종류에 맞춰 "환불 문의", "결제 문의" 같은 기본 제목이 붙는다. 증빙은 5개까지이고 공개 범위 기본값은 신고만 운영자 전용, 나머지는 당사자 공개이다.
- 내용은 2000자까지이다. 접수한 본인만 자기 건을 볼 수 있고, 남의 건이나 없는 건은 똑같이 없음으로 응답한다. 운영자가 사용자에게 숨긴 메모는 보이지 않는다. 종결된 건에는 메시지를 더할 수 없다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | Flutter 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 로그인 + 유효한 sourceType + 소유권 있음 | `validateSourceOwnership` 통과 | `SupportIssueCreateScreen` 문의 생성 | 접수 성공 | 일치 |
| 로그인 + 소유권 없음 | `OPERATIONAL_ISSUE_SOURCE_NOT_OWNED(403)` | `showApiErrorToast` | 에러 toast | 일치 |
| 로그인 + sourceType=REGULAR_MEETING_PAYMENT | 서버 처리 가능 | Flutter enum `regularMeetingPayment`(「정기모임 결제 문의」) | 정기모임 결제 문의로 접수 | 일치 |
| 로그인 + RESOLVED/REJECTED 이슈 메시지 추가 | `status.isClosed() → INVALID_INPUT(400)` | `!status.isClosed` 조건 → 입력창 숨김 | 입력창 표시 안 됨 | 일치 |
| 비로그인 | 모든 endpoint 401 | Auth guard | 로그인 화면 redirect | 일치 |
| 상세 타인 접근 | `findByIdAndReporterUserId` 실패 → NOT_FOUND | `AppErrorState` | 에러 화면 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 5 endpoint | 완전 구현 | SupportIssueApi 5 method 정확 매핑 | 일치 |
| OperationalIssueStatus 4종 | OPEN/IN_PROGRESS/RESOLVED/REJECTED | Dart enum 4종 label 포함 | 일치 |
| sourceType 7종 | 서버 7종 | Flutter 7종 + 모르는 값 `unknown` | 일치 |
| evidenceFileIds | 서버 지원 (max 5) | Flutter CreateParam·OperationalIssue 에 있음. 접수와 스레드 메시지에 올린 증빙 id 를 보낸다 | 일치 |
| evidenceVisibility | 서버 응답에 포함, 접수 때 비우면 sourceType 별 기본값 | 앱은 보내지 않고 모델에도 칸이 없음(서버 기본값을 따름) | 표시하지 않음 |
| 목록 반환 타입 | `Page<OperationalIssueVo>` (Spring Page) | `PageResponse<OperationalIssue>` | 일치 |
| 메시지 필터 | `userVisible=true` 필터 | Flutter는 서버가 내려주는 대로 렌더링 | 일치 |
| 알림 emit | `SUPPORT_ISSUE_UPDATED(66)` 코드 있으나 community_api emit 없음 | Flutter NotificationRouter에 라우팅 설계 필요 | Gap |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| 해소됨 | Flutter OperationalIssueSourceType 의 정기모임 2종 | 앱 열거가 서버 7종을 모두 갖는다 | 정기모임 결제·정산 문의가 제 종류로 접수된다 | 없음 |
| 해소됨 | Flutter 접수의 증빙 첨부 | 접수 요청과 스레드 메시지가 올린 증빙 id(최대 5)를 보낸다. 서버가 업로더 본인·업로드 완료·용도를 검증한다 | 증빙을 함께 접수할 수 있다 | 없음 |
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
| 구현 | Flutter evidenceVisibility 모델 필드 추가 | `OperationalIssue.dart` 필드 추가 |
| 운영 | SUPPORT_ISSUE_UPDATED emit 경로 확인 | community_admin_api OperationalIssueAdminService에서 emit 여부 확인 |
| 성능 | 상세 화면 polling 교체 | 15초 polling → SSE/WebSocket 또는 pull-to-refresh만 사용 검토 |
| 테스트 | 서비스 단위 테스트 | `OperationalIssueService` 소유권 검증·호스트 라우팅·evidence 검증 테스트 없음 |
