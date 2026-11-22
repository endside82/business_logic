# F18-01. 통합 분쟁 조회·당사자 대화·종결 경계 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

내 분쟁 목록과 호스트 분쟁 목록은 여러 원천을 한 형식으로 읽는 조회 화면이다. 목록에 포함되는 조건과 사건 상세의 열람 권한은 별도다. 원천 행·등록부 사건·통합 이의를 하나의 테이블이나 동일한 상태 기계로 취급하지 않는다.

사용자는 목록에서 caseId로 상세를 연다. 호스트 처리함의 분쟁 카드는 [호스트 처리함](F18-05_host-inbox_prd.md)의 disputeCaseId로 같은 호스트 상세를 연다. 신규 사용자 접수와 기존 사건 이의는 각각 [사용자 분쟁 접수](F18-02_dispute-create_prd.md), [분쟁 이의 접수·철회](F18-03_dispute-appeal_prd.md)를 따른다.

## 현재 서버 계약

| 요청 | 입력·반환 |
|---|---|
| GET /api/v1/me/dispute-cases | page, size, status, caseType, sourceType → Page<DisputeCaseVo> |
| GET /api/v1/host/dispute-cases | 같은 필터 → Page<DisputeCaseVo> |
| GET /api/v1/me/dispute-cases/{caseId} | DisputeCaseDetailVo |
| GET /api/v1/host/dispute-cases/{caseId} | 같은 getDetail 서비스의 DisputeCaseDetailVo |
| POST /api/v1/me/dispute-cases/{caseId}/consent-close | ConsentVo |
| POST /api/v1/me/dispute-cases/{caseId}/acknowledge | AcknowledgeVo |
| POST /api/v1/me/dispute-cases/{caseId}/escalate | EscalationVo |
| GET /api/v1/me/dispute-cases/{caseId}/messages | List<DisputeMessageVo> |
| POST /api/v1/me/dispute-cases/{caseId}/messages | DisputeMessageCreateParam → 201 DisputeMessageVo |

caseId는 등록된 prefix와 양수 원천 ID를 연결한 문자열이며 sourceType enum과 일대일로 같지 않다. prefix를 UI 라벨에서 조립하지 않는다. 목록의 page는 0 이상, size는 1~100으로 제한한다. 각 원천에서 수집한 뒤 status·caseType·sourceType의 단일 값으로 필터하고 updatedAt 내림차순, createdAt 내림차순, caseId 오름차순으로 정렬한 뒤 메모리에서 페이지를 나눈다.

## 내 목록과 호스트 목록의 범위

| 목록 | 실제 수집 범위 |
|---|---|
| 내 목록의 운영·신고 | 본인이 접수한 운영 이슈의 최근 200건, 클럽 경고 제보, 본인의 경고 이의, 일반 신고와 이동 신고, 본인의 차단에 연결된 신고 |
| 내 목록의 처분·사용자 사건 | 자신에게 적용된 KICK/BAN 클럽 조치, 접수자 또는 상대인 사용자 분쟁 |
| 내 목록의 배정 | 현재 배정 에피소드에 대해 접수자·상대·호스트·제공자이거나, 확정 거래가 있는 비용의 납부자/수혜자, 포인트 거래가 있는 선납자, 환불의 호스트 회수 대상인 사람 |
| 내 목록의 등록부 | EVENT_NO_SHOW, SANCTION, PLATFORM_SANCTION, PHOTO, EVENT_MESSAGE, COMMENT 중 등록부 당사자로 연결된 사건 |
| 호스트 목록의 원천 | 본인이 만든 정산의 이의, 판매자에게 공개하는 상태 집합에 속한 환불 분쟁 |
| 호스트 목록의 확장 | 본인이 호스트인 배정의 현재 사건, 위 여섯 등록부 출처의 HOST 역할 사건, 본인을 대상으로 한 이벤트 호스트 처분 검토 사용자 사건 |

배정은 모든 과거 에피소드를 나열하지 않고 현재 에피소드를 고른다. 확정 비용 참여자는 transactionId 등 실제 거래 조건을 사용하며 단순한 관련자 전체와 다르다. 내 목록에 정산 이의의 제기자·환불 분쟁의 구매자를 별도 원천으로 전부 합치는 분기는 없다. 목록 포함 여부를 모든 상세 접근권의 완전한 색인으로 설명하지 않는다.

최종 집계에는 모든 출처를 포괄하는 중복 제거 단계가 없다. 원천마다 수집 상한도 다르므로 totalElements를 모든 과거 사건의 무제한 개수라고 설명하지 않는다.

## 표시 상태와 실제 사건 상태

UnifiedDisputeStatus는 OPEN, IN_REVIEW, RESOLVED, CLOSED, ESCALATED, CLOSED_WITH_MANUAL_RECOVERY 여섯 값이다. 원천 상태의 의미를 다음처럼 표시 상태로 변환한다.

| 원천 | 주요 변환 |
|---|---|
| 운영 이슈 | OPEN → OPEN, IN_PROGRESS → IN_REVIEW, RESOLVED → RESOLVED, REJECTED → CLOSED |
| 경고 제보 | SUBMITTED → OPEN, IN_REVIEW/NEEDS_MORE_INFO → IN_REVIEW, APPROVED/REJECTED → RESOLVED, WITHDRAWN → CLOSED |
| 경고 이의 | SUBMITTED → OPEN, IN_REVIEW → IN_REVIEW, ACCEPTED/PARTIALLY_ACCEPTED/REJECTED → RESOLVED, WITHDRAWN → CLOSED |
| 정산 이의 | PENDING → OPEN, APPROVED/REJECTED → RESOLVED, RESOLVED → CLOSED |
| 공개 신고 | PENDING → OPEN, IN_REVIEW → IN_REVIEW, RESOLVED/DISMISSED → RESOLVED, ESCALATED → ESCALATED |
| 환불 분쟁 | OPEN → OPEN, UPHELD/OVERTURNED → RESOLVED, CLOSED/DECISION_REVERSED → CLOSED |
| 통합 이의가 있는 등록부 카드 | PENDING/DECIDED/COMPENSATION_APPLIED/RECOVERY_REQUIRED → IN_REVIEW, UPHELD/REJECTED → RESOLVED, CLOSED → CLOSED |
| 본인 이의가 없는 등록부 카드 | OPEN → OPEN, IN_REVIEW/ESCALATED → IN_REVIEW, RESOLVED → RESOLVED, CLOSED/CLOSED_WITH_MANUAL_RECOVERY → CLOSED |

등록부 카드의 변환처럼 실제 ESCALATED 또는 수동 수습 종결이 별도 표시 값으로 그대로 나오지 않는 경로가 있다. 상태 enum의 존재만으로 각 원천이 그 값을 그대로 반환한다고 가정하지 않는다.

별도의 DisputeWorkflowStatus는 같은 이름의 여섯 진행 상태를 가진다. RESOLVED, CLOSED, CLOSED_WITH_MANUAL_RECOVERY는 끝 상태다. 끝 상태에서 다른 상태로 다시 열지 않고, IN_REVIEW/ESCALATED에서 OPEN으로 되돌리지 않는다. 상세의 최종 명령 가능 여부는 상태 이름만으로 계산하지 않고 actorPermissions를 따른다.

## 상세 공개와 행동 권한

상세는 원천·등록부의 접근 판정 후 timeline, evidence, actorPermissions, evidenceFrozen, myConsentedAt, appealDeadlineAt 등을 반환한다. 호스트 URL을 사용하는 것 자체가 호스트 권한을 부여하지 않는다. 타임라인의 CS_ONLY는 제외하고 HOST_ONLY는 호스트에게만 보이며 운영자 작성자의 사용자 ID는 숨긴다. 증빙에는 제출자 본인 예외가 있으므로 ‘CS_ONLY는 누구에게나 제외’라고 요약하지 않는다. 파일별 주소 발급과 보존은 [분쟁 증거 열람·보존](F18-04_evidence-visibility_prd.md)을 따른다.

ActorPermissionFlags는 canResolveDispute, canEscalateToCs, canSendNote, canModerateMessages, canHandleRefundIssue, canManageAttendance, canConsentToClose, canAcknowledgeOutcome, canRequestSupplement, canSubmitAppeal의 열 가지 boolean이다. canApproveAppeal은 현재 필드가 아니다.

공개 응답의 canResolveDispute는 최종 계산에서 false다. 이는 서버 내부의 기본 호스트 권한 판정이 없다는 뜻이 아니다. 호스트 앱의 ‘호스트 해결’은 canManageAttendance와 실제 eventId·본인이 아닌 targetUserId가 있어야 열리며 출결 관련 원천 조치 화면으로 연결된다. 이 버튼을 임의의 사건 종결 또는 통합 이의 승인 API라고 설명하지 않는다. 메시지 숨김도 대상 EVENT_MESSAGE와 callback이 특정되는 경우에만 노출한다.

## 당사자 명령과 대화

| 행동 | 현재 조건·결과·재요청 경계 |
|---|---|
| 종결 동의 | USER_DISPUTE, 금전·제재 사건 아님, 서로 다른 두 당사자, 열린 이의 없음일 때 가능하다. 기존 본인 동의가 있으면 이를 읽고 현재 합의·종결 상태를 다시 계산하므로 최초 응답을 그대로 재생하는 계약이 아니다. 양쪽 동의 뒤 커널이 CLOSED로 전이한다. |
| 결과 확인 | 스냅샷 당사자이며 결과 결정 조건을 만족해야 한다. 사건·사용자별 감사 키로 확인을 기록하고 상태나 이의 권리를 바꾸지 않는다. |
| 운영팀 검토 요청 | 현재 당사자·미종결·플랫폼 개입 가드를 검사한다. ESCALATED로 전이하고 운영자 경보 및 절차 알림을 요청한다. 이미 ESCALATED이면 DISPUTE_ALREADY_ESCALATED로 거절한다. |
| 메모 | 열린 등록부 사건의 당사자가 NOTE를 작성한다. 내부 운영 메모를 일반 당사자가 쓰거나 읽는 경로는 아니다. |
| 추가 자료 요청 | 호스트 권한과 다른 지정 당사자가 필요하다. 서버가 OPEN 요청과 현재부터 14일 기한을 만든다. 호스트는 스냅샷 당사자가 아니더라도 이 명령의 별도 권한 조건으로 허용될 수 있다. |
| 추가 자료 답변 | 같은 사건의 SUPPLEMENT_REQUEST를 잠그고 지정 수신자·OPEN 상태를 확인한다. 저장 뒤 원 요청을 RESPONDED로 표시한다. 이 함수 자체에는 dueAt와 현재 시각을 직접 비교하는 분기가 없다. |

대화 본문은 trim 후 비어 있지 않아야 하며 최대 2000자, 첨부는 최대 5개다. NOTE는 해당 대화 열람자에게 보이고, 추가 자료 요청은 작성자와 지정 수신자, 답변은 답변자와 원 요청자에게 보인다. INTERNAL_NOTE는 당사자 목록에서 제외한다. 첨부 참조 저장·감사 기록·절차 알림 요청은 메시지 저장 흐름에 연결된다.

이 API들에 요청키 헤더가 선언돼 있지 않다. 동의·확인 기록의 중복 방어, 재이관 오류, 새 메시지 저장을 같은 재전송 정책으로 합치지 않는다.

## 종결과 보상·알림

커널은 종결 때 보상 원장과 열린 이의를 검사한다. 금전·제재 사건에 PENDING 또는 FAILED 원장이 남으면 종결을 막는다. CLOSED_WITH_MANUAL_RECOVERY는 이 차단 원장이 없어야 하고 MANUAL_RECOVERY 원장이 있어야 한다. MANUAL_RECOVERY가 있으면 다른 종결 상태로 닫을 수 없다. 열린 이의는 운영자가 아닌 전이 주체의 종결을 막는다. 이 조건을 ‘모든 사건의 모든 종결은 언제나 같은 보상 검사’로 확대하지 않는다.

종결 전이는 원천 보류 해제, 열린 추가 자료 요청 취소, 사건 종결 알림 요청을 연결한다. 결정·보상 원장·수동 수습은 다른 결과이므로 바깥에서 처리한 기록만으로 자동 복구가 완료됐다고 쓰지 않는다. 구체적인 보상 실행 가능 여부는 해당 운영 명령과 원천 도메인에서 확인한다.

현재 DisputeNotificationPublisher는 이의 접수·결정, 보완 요청·만료, 메모, 운영팀 이관, 종결, 호스트 조치를 DISPUTE outbox에 발행한다. 수신자 ID를 유효한 양수로 거르고 중복 제거하며 비어 있으면 건너뛴다. 따라서 ‘분쟁 사용자 알림 발행 경로가 전혀 없음’은 폐기한다. outbox 호출 근거만으로 기기 수신 완료까지 주장하지 않는다.

SLA 스캐너는 매일 한국 시간 06:00에 7일이 지난 활성 원천을 검사한다. 운영 이슈·경고 제보·경고 이의·정산 이의·공개 신고·환불 분쟁·사용자 분쟁·통합 이의의 여덟 종류다. 추가 정보 요청 중인 경고 제보와 ESCALATED 공개 신고는 이 검사에서 제외한다. 종류별 조회 실패·항목별 발행 실패를 나누어 다른 검사를 계속하고, 운영자 경보에는 출처·ID 기반 중복 방지 키와 가능한 caseId를 보낸다. 모든 등록부 사건을 직접 전수 스캔하는 구현으로 설명하지 않는다.

## 앱 목록·상세·갱신

앱 목록은 20건씩 가져온다. 상태 칩은 단일 값 필터이며 ‘진행 중’은 OPEN만 요청한다. 전체·OPEN·IN_REVIEW·RESOLVED·CLOSED·ESCALATED 칩이 있고 수동 수습 종결 전용 칩은 없다. 출처 칩과 상태를 서버 요청에 전달한다.

내 목록·호스트 목록·상세·대화·본인 이의 provider는 disputes 데이터 변경 신호를 구독한다. 상세는 asHost에 따라 호스트/본인 API를 고른다. 조회 실패는 재시도할 수 있고, 성공 응답의 공개 타임라인·증빙과 행동 플래그로 영역을 만든다. 이 연결은 실제 알림 전달·기기 갱신까지 실행 검증한 결과와 구분한다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `DisputeCaseController#getMyCases`, `DisputeCaseController#getHostCases`, `DisputeCaseController#getMyCaseDetail`, `DisputeCaseController#getHostCaseDetail`, `DisputeCasePartyController#consentToClose`, `DisputeCasePartyController#acknowledgeOutcome`, `DisputeCasePartyController#escalate`, `DisputeCasePartyController#listMessages`, `DisputeCasePartyController#createMessage`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 출처별 수집 상한·현재 에피소드·등록부 상태 변환이 다르다. | 목록 전체 수와 표시 상태를 원천의 완전한 이력으로 단정하지 않는다. |
| Gap | 수동 수습 종결 전용 상태 칩이 없고 등록부 카드에서는 CLOSED로 합쳐질 수 있다. | 별도 상태의 존재와 화면 필터를 구분한다. |
| Risk | 일부 명령의 반복 요청은 충돌이며 대화 API에 요청키가 없다. | 전 명령의 동일 응답 재생을 약속하지 않는다. |
| 미검증 | 실제 권한별 응답·대화 첨부·보상 실행·알림 수신·SLA 실행을 이번에 수행하지 않았다. | 현재 코드 대조와 실행 결과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 내 목록 범위:** 기존 신고·조치·사용자 사건에 현재 배정과 여섯 등록부 출처를 포함하되 실제 당사자 조건을 따른다.
- **AC-02 호스트 목록 범위:** 정산·환불 외에 호스트 배정·등록부 HOST·이벤트 호스트 처분 검토를 구분한다.
- **AC-03 필터와 순서:** 단일 enum 필터, 정렬 키, 크기 제한과 메모리 페이지의 경계를 유지한다.
- **AC-04 상태와 권한:** 여섯 표시 상태·여섯 진행 상태·원천 변환·최종 열 가지 행동 플래그를 구분한다.
- **AC-05 명령별 반복:** 동의의 재계산·결과 확인 기록·재이관 오류·메시지 저장을 각각 설명한다.
- **AC-06 대화 공개:** 호스트 요청 권한·수신자·14일 기한·답변 OPEN 조건·내부 메모 제외를 연결한다.
- **AC-07 종결 경계:** 금전·제재 보상 차단, 수동 수습 원장, 열린 이의와 전이 주체를 함께 판단한다.
- **AC-08 알림과 앱 갱신:** outbox 발행·SLA 경보·앱 데이터 신호 구독·실제 수신 여부를 구분한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
