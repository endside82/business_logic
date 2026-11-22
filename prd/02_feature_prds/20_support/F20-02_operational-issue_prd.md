# F20-02. 원천별 운영 이슈·증빙·처리 대화 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

운영 이슈는 특정 거래·정산·신고에 연결한 지원 요청이다. 원천 업무에서 sourceType/sourceId를 넘겨 작성하며 프로필에서 내 운영 이슈 목록과 상세를 읽는다. 일반 텍스트 상담의 [1:1 문의](F20-01_inquiry_prd.md)와 데이터·권한·상태가 다르다.

앱 작성 route는 알려진 출처와 양수 sourceId를 요구한다. 알 수 없는 출처, 번호 없음·파싱 실패·0·음수이면 임의의 지갑 거래로 연결하지 않고 내 운영 이슈 목록을 표시한다.

## 현재 서버 계약

| 요청 | 입력·반환 |
|---|---|
| POST /api/v1/support/issues | OperationalIssueCreateParam → 201 OperationalIssueVo |
| GET /api/v1/support/issues/my | PagingParam → Page<OperationalIssueVo> |
| GET /api/v1/support/issues/my/by-source | sourceType, sourceId → List<OperationalIssueVo> |
| GET /api/v1/support/issues/{issueId} | 본인 OperationalIssueVo |
| POST /api/v1/support/issues/{issueId}/messages | OperationalIssueMessageParam → OperationalIssueVo |

모두 로그인 경로이며 요청키 헤더는 선언돼 있지 않다. 생성에는 sourceType/sourceId와 공백 아닌 content가 필요하다. content는 요청 문자열 기준 최대 2000자, 선택 title은 최대 120자다. 제목이 없거나 trim 후 비면 출처별 기본 제목을 사용한다. 본문은 trim해서 저장한다. 생성과 메시지는 각각 evidenceFileIds 최대 5개를 받으며, 생성만 선택 evidenceVisibility를 받는다.

## 원천 번호와 소유권

| sourceType | sourceId가 가리키는 실제 행 | 접수·원천별 조회 권한 |
|---|---|---|
| WALLET_TRANSACTION, PAYMENT, REFUND, REGULAR_MEETING_PAYMENT | point_transaction | 거래 소유자 |
| SETTLEMENT | meeting_settlement | 정산 생성자, 항목 보유/분담 당사자 또는 취소된 미확인 송금의 당사자 |
| REGULAR_MEETING_SETTLEMENT | regular_meeting_id가 있는 settlement 행 | 해당 정기모임 정산 호스트 |
| REPORT | report | 신고 접수자 |

PAYMENT/REFUND라고 해서 event_payment 또는 refund 행 번호를 직접 보내지 않는다. REGULAR_MEETING_SETTLEMENT에도 정기모임 ID나 meeting_settlement ID를 대신 넣지 않는다. 이 매핑은 서버 sourceRecord()가 소유권 검사·호스트 연결의 공통 기준으로 사용한다.

거래가 없으면 TRANSACTION_NOT_FOUND, 거래 소유자가 다르면 FORBIDDEN이다. 다른 출처는 해당 원천 없음/소유권 오류를 반환하므로 모든 권한 오류가 OPERATIONAL_ISSUE_SOURCE_NOT_OWNED라고 정규화해 쓰지 않는다. REPORT 접수는 연결된 신고 대상 리뷰를 잠그는 경로도 거친다.

## 관련 호스트와 원천 제목

SETTLEMENT는 정산 생성자, REGULAR_MEETING_SETTLEMENT는 해당 정산의 호스트를 연결한다. PAYMENT/REFUND는 거래 referenceType/referenceId를 읽고 EVENT_PAYMENT/EVENT_REFUND이면 이벤트 번호로, EVENT_PREPAYMENT/EVENT_PREPAYMENT_REFUND이면 EventPayment에서 이벤트 번호를 찾아 호스트를 연결한다.

REGULAR_MEETING_PAYMENT는 거래 참조가 REGULAR_MEETING_PAYMENT 또는 REGULAR_MEETING_PAYMENT_REFUND일 때 결제 행의 정기모임과 호스트를 찾는다. 참조 종류·번호·원천이 없으면 null일 수 있다. WALLET_TRANSACTION과 REPORT는 이 함수에서 관련 호스트를 정하지 않는다. 출처 enum만으로 항상 호스트 처리함에 나타난다고 약속하지 않는다.

응답 sourceTitle은 사용자에게 보여줄 원천 제목이다. sourceId를 원천 화면 ID로 임의 해석하지 않고 실제 업무 연결은 [호스트 처리함](../18_dispute_resolution/F18-05_host-inbox_prd.md)의 문맥과 경로 조건을 따른다.

## 접수·목록·상세·메시지

생성은 OPEN 이슈, 생성 시 증빙 참조, USER 작성의 첫 공개 메시지를 함께 저장한다. 본문 증빙은 이슈에 붙고 첫 메시지에 같은 파일 참조를 중복 저장하지 않는다. 코드에 요청키 기반 성공 응답 재생이나 동일 출처 활성 이슈를 하나로 제한하는 조건은 없다.

내 목록은 본인 접수 건을 updatedAt·id 내림차순으로 조회한다. by-source도 원천 소유권을 다시 확인한 뒤 본인의 해당 출처 이슈를 반환한다. 상세는 issueId와 reporterUserId로 조회하므로 타인 이슈는 NOT_FOUND다. 목록은 messages를 빈 배열로 주고, 상세는 userVisible=true인 메시지만 createdAt·id 오름차순으로 준다.

추가 메시지는 이슈 행을 잠근 뒤 본인과 상태를 검사한다. RESOLVED/REJECTED는 INVALID_INPUT으로 거절한다. 허용되면 공개 USER 메시지·증빙 참조와 lastMessageAt을 저장한다. Inquiry처럼 ANSWERED→OPEN으로 되돌리는 상태 전이는 없다. 운영 이슈 상태는 OPEN, IN_PROGRESS, RESOLVED, REJECTED다.

## 증빙 입력·공개·열기

원시 evidenceFileIds 배열이 5개를 넘으면 먼저 거절한다. 이후 null·0·음수 ID를 제외하고 중복을 제거하며 실제 파일의 본인 소유·COMPLETED·EVIDENCE 또는 REVIEW 용도를 검사한다. 5개를 넘게 보내 놓고 중복 제거 뒤 5개 이하가 된다는 이유로 항상 허용되는 것은 아니다.

공통 참조 등록부에 이슈 본문과 각 메시지의 파일 연결을 동기화한다. evidenceVisibility는 PARTIES/HOST_ONLY/CS_ONLY 중 명시값을 우선하고, 생략하면 REPORT는 CS_ONLY, 나머지는 PARTIES다. 본인 조회의 evidenceFileIds는 유지된다. 이 필드만으로 모든 다른 역할의 열람을 허용하는 것은 아니다.

현재 앱은 생성 시 evidenceVisibility를 보내지 않고 응답 모델에도 그 필드가 없다. 서버 기본값을 따르는 동작이며 사용자가 공개 범위를 선택하는 UI로 설명하지 않는다. 본문·추가 메시지의 파일 ID는 모두 칩으로 표시한다. 일반 파일 다운로드 helper는 소유자와 제공 가능한 파일 상태를 검사한다. 분쟁의 별도 공개 목록 기반 파일 주소 발급과 같은 권한 규칙이라고 가정하지 않는다.

첨부 참조의 보존·정리는 [분쟁 증거 보존과 파일 정리](../18_dispute_resolution/F18-04_evidence-visibility_prd.md)를 따른다. 접수 필드에서 파일 ID를 제거했다는 사실만으로 실제 파일 삭제가 끝났다고 쓰지 않는다.

## 운영팀 답변·상태·알림

현재 관리 모듈은 community_api/admin-app 안에 있다. 상태 변경은 이슈를 잠그고 요청 상태·담당자를 저장한다. 끝 상태면 resolvedAt을 기록하고 다시 진행 상태로 옮기면 null로 지운다. 신고 관련 이슈를 다시 열 때는 직접 출처와 활성 연결 신고의 리뷰를 잠근다.

상태 변경의 사용자 메시지는 공개 메시지와 알림으로, 내부 메모는 userVisible=false로 저장한다. 사용자 메시지가 없어도 상태 변경 안내 알림을 요청한다. 일반 운영 답변은 OPEN을 IN_PROGRESS로 바꾸며 공개 메시지일 때만 알린다. 추가 메시지 함수 자체는 사용자의 종료 상태 거절 조건과 동일하지 않으므로 끝난 이슈의 운영 메모까지 모두 금지한다고 설명하지 않는다.

알림은 SUPPORT_ISSUE_UPDATED를 관리 outbox에 넣으며 issueId를 포함한다. payload의 transactionId 키에도 sourceId를 넣는 현재 코드는 그 값이 언제나 실제 거래 번호라는 보장이 아니다. 출처별 원천 매핑을 유지한다. outbox 호출 근거는 실제 사용자 기기 수신·딥링크 성공과 다르다.

## 앱 초안·전송·새로고침

내 목록은 20건씩 다음 페이지를 읽는다. 상세는 화면이 살아 있는 동안 15초 타이머로 상세 provider를 invalidate하고 dispose에서 취소한다. 이 타이머가 실시간 스트리밍이거나 화면 비활성 시 자동 중지되는 기능이라고 확대하지 않는다.

접수 초안은 계정·sourceType/sourceId, 메시지 초안은 계정·issueId를 구분하며 제목·본문·첨부 ID를 복원한다. 업로드 중이거나 pending/충돌이면 전송을 막고 전송 전에 기록을 저장한다. 명확한 거절은 pending을 풀지만 불명확한 결과는 기록을 보관한다. API에 요청키가 없으므로 자동 재시도로 중복 접수를 만들지 않는다.

접수 성공은 반환 issue.id의 상세로 교체 이동하고 내 목록·원천별 목록을 invalidate한다. 메시지 성공은 내 목록·해당 상세를 invalidate하며 보낸 본문과 첨부만 비운다. 원천별 목록은 이 메시지 함수의 무효화 대상이 아니다. 커밋 가능 실패에서도 해당 조회들을 무효화하고 계정 세션 종료 후 옛 결과는 적용하지 않는다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `OperationalIssueController#createIssue`, `OperationalIssueController#getMyIssues`, `OperationalIssueController#getMyIssuesBySource`, `OperationalIssueController#getMyIssue`, `OperationalIssueController#addMessage`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | PAYMENT/REFUND와 정기모임 정산의 ID 공간이 이름만으로 드러나지 않는다. | 실제 테이블·참조 경로를 명시한다. |
| Gap | 앱에 evidenceVisibility 선택·응답 필드가 없다. | 서버 기본값을 따르는 현재 동작으로 설명한다. |
| Risk | 요청키·활성 출처 중복 제한이 없고 메시지 성공이 원천별 목록까지 무효화하지 않는다. | pending 결과 확인과 갱신 범위를 분리한다. |
| Risk | 상세 15초 타이머와 알림 payload의 transactionId가 원천 의미를 완전히 표현하지 못한다. | 실시간·항상 거래 번호라는 약속을 피한다. |
| 미검증 | 실제 원천 권한·증빙 다운로드·운영 답변 수신·다중 제출·화면 수명은 실행하지 않았다. | 문서 소스 대조와 제품 실행을 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 원천 ID:** 일곱 출처를 네 원천 행 종류에 정확히 연결한다.
- **AC-02 권한과 호스트:** 원천별 소유권·정산 당사자 예외·거래 참조에 따른 호스트/null을 구분한다.
- **AC-03 접수와 목록:** OPEN·첫 메시지·본문 증빙, 본인 페이지/출처 조회와 상세 공개 메시지를 구분한다.
- **AC-04 추가 메시지:** 잠금·본인·종료 상태 거절과 상태 유지·메시지 증빙 참조를 적용한다.
- **AC-05 증빙:** 원시 개수 검사 뒤 정규화·소유/완료/용도·서버 기본 공개값을 따른다.
- **AC-06 운영 처리:** 재개방 resolvedAt 초기화·리뷰 잠금·공개/내부 메모·알림 발행을 나눈다.
- **AC-07 앱 결과:** 업로드 잠금·계정별 pending·성공 상세 이동·보낸 내용만 정리를 적용한다.
- **AC-08 갱신 범위:** 15초 상세 조회와 접수/메시지별 목록 무효화, 실제 알림 수신을 구분한다.

근거는 현재 서버·앱·관리 모듈 소스이며 새 제품 시험 통과 기록은 없다.
