# F18-05. 호스트 처리함·아홉 출처·업무 이동 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

호스트 처리함 `/host/inbox`는 응답 필요·처리 중·완료 세 탭과 별도 통계 헤더로 구성한다. 카드에서 해당 업무로 이동해 처리하며 처리함 자체가 모든 원천 상태를 바꾸는 명령 API는 아니다. 이벤트 메시지와 INQUIRY 상담 대화는 서로 다른 출처다.

## 현재 서버 계약

| 요청 | 입력·반환 |
|---|---|
| GET /api/v1/host/inbox | page, size, status, sourceType → Page<HostInboxItemVo> |
| GET /api/v1/host/inbox/stats | HostInboxStatsVo |

HostInboxSourceType은 EVENT_MESSAGE, APPLICATION, MEETING_SETTLEMENT_APPEAL, REPORT, PAYMENT_ISSUE, REFUND_ISSUE, OPERATIONAL_ISSUE, DISPUTE_CASE, INQUIRY 아홉 값이다. 상태는 NEEDS_RESPONSE, IN_PROGRESS, DONE 세 값이다. 앱은 출처와 상태에 unknown 역직렬화 fallback도 둔다.

카드 id는 처리함 식별자이고 sourceId는 원천 행 번호다. eventId, clubId, settlementId, regularMeetingId, eventPaymentId, transactionId, deepLinkType, unansweredCount, disputeCaseId 등은 선택값이다. 이들이 없을 때 일반 카드 ID를 원천 ID로 대신 해석하지 않는다.

## 출처별 수집·상태·권한

| 출처 | 실제 수집과 상태 |
|---|---|
| EVENT_MESSAGE | 본인 주최 이벤트 최근 200개와 정지되지 않은 공동 주최 배정을 합친다. 각 이벤트 최근 50개 메시지에서 주최자·유효 공동 주최자의 마지막 답변 뒤에 남은 다른 작성자의 메시지를 센다. 있으면 NEEDS_RESPONSE, 없으면 DONE이다. |
| APPLICATION | 위 이벤트의 신청을 수집한다. PENDING, CANCEL_PENDING_REFUND 또는 확인 대기 무통장 입금 신고가 있으면 NEEDS_RESPONSE다. APPROVED_PENDING_PAYMENT뿐 아니라 APPROVED 신청의 PENDING BANK_TRANSFER도 확인한다. 나머지는 DONE이다. |
| MEETING_SETTLEMENT_APPEAL | 본인이 만든 정산의 이의를 수집한다. PENDING은 NEEDS_RESPONSE, 나머지는 DONE이다. |
| REPORT | 이벤트 호스트 또는 분쟁 처리 권한이 있고 위임이 정지되지 않은 공동 주최자의 이벤트에 대해 EVENT_HOST 관할 신고를 수집한다. 신고 대상이 조회자 본인이면 제외한다. PENDING은 NEEDS_RESPONSE, IN_REVIEW/ESCALATED는 IN_PROGRESS, RESOLVED/DISMISSED는 DONE이다. |
| PAYMENT_ISSUE | PAYMENT, WALLET_TRANSACTION, REGULAR_MEETING_PAYMENT 출처의 운영 이슈다. |
| REFUND_ISSUE | REFUND 운영 이슈와 이벤트별 PENDING/FAILED 환불 실패 항목을 모은다. 후자는 NEEDS_RESPONSE다. |
| OPERATIONAL_ISSUE | SETTLEMENT, REGULAR_MEETING_SETTLEMENT 출처의 운영 이슈다. 운영 이슈의 OPEN은 NEEDS_RESPONSE, IN_PROGRESS는 IN_PROGRESS, RESOLVED/REJECTED는 DONE이다. |
| DISPUTE_CASE | 호스트 통합 분쟁 목록의 첫 100건을 가져온다. OPEN은 NEEDS_RESPONSE, IN_REVIEW/ESCALATED는 IN_PROGRESS, RESOLVED/CLOSED/CLOSED_WITH_MANUAL_RECOVERY는 DONE이다. |
| INQUIRY | OPEN/ANSWERED 상담만 수집한다. 이벤트 담당 큐에서 위임 정지를 제외하고, 클럽 OWNER/ADMIN은 현재 관리자 권한도 검사한다. 클럽 운영진 큐와 이관된 클럽 상담을 포함한다. OPEN은 NEEDS_RESPONSE, ANSWERED는 DONE이다. |

REPORT는 sourceEventId와 관할 기준이므로 EVENT targetType만 조회한다는 옛 설명은 틀리다. 신고 카드에는 신고자의 actorUserId·nickname을 채우지 않는다. 비밀 이벤트 메시지의 미리보기는 일반 안내로 바꾸지만 작성자 식별 필드까지 모두 숨긴다고 확대 해석하지 않는다.

INQUIRY는 ID 순 대화에서 USER 메시지 수를 누적하다가 비사용자 답변마다 0으로 초기화한다. OPEN 카드에 그 미응답 수를 표시한다. 이벤트 메시지의 최근 50개 창과 상담 대화의 계산을 같은 전체 이력 규칙으로 설명하지 않는다.

## 집계·페이지·통계

선택한 출처를 수집하고 상태를 거른 뒤 updatedAt, 없으면 createdAt, 둘 다 없으면 최소 시각을 사용해 내림차순 정렬한다. 동률은 id 오름차순이다. page는 0 이상, size는 1~100으로 제한한다. 현재 페이지의 업무 링크 문맥과 표시 이름을 보완한다.

모든 출처가 각각 최대 500개라는 설명은 사실이 아니다. stats가 size=500인 검색 객체를 만들더라도 수집 함수 전체에 같은 상한을 적용하는 구조가 아니다. 이벤트 200개·이벤트 메시지 50개·호스트 분쟁 100건처럼 서로 다른 창을 사용하며 다른 조회는 이 제한과 같지 않다. 특히 분쟁 100건을 먼저 가져온 뒤 처리함 상태를 거르므로 이전의 응답 필요 사건이 잘릴 수 있다.

통계는 별도로 다시 모은 항목에서 응답 필요·처리 중·완료·전체·출처별 개수를 계산한다. responseRatePercent는 응답 시간 준수율이 아니라 DONE/전체의 반올림 백분율이며 항목이 없으면 100이다. 평균은 DONE 항목의 createdAt~updatedAt 중 음수가 아닌 간격의 분 단위 평균이며 없으면 null이다. 실제 첫 답변 시각을 별도로 측정한 지표로 설명하지 않는다.

sourceTypeCounts의 서버 enum map은 JSON 문자열 키로 전달되며 앱 Map<String,int>와 그 자체로 wire 불일치가 아니다. 출처별 초기 카운트는 0으로 채운다.

## 카드의 실제 이동

| 출처 | 앱 이동 조건과 목적지 |
|---|---|
| EVENT_MESSAGE | eventId가 있으면 이벤트 메시지 |
| APPLICATION | eventId가 있으면 deepLinkType이 EVENT_PAYMENT_QUEUE일 때 결제 관리, 나머지는 신청 목록 |
| MEETING_SETTLEMENT_APPEAL | eventId가 있으면 해당 이벤트 정산 이의 |
| REPORT | eventId와 sourceId로 해당 이벤트 신고 상세 |
| DISPUTE_CASE | disputeCaseId가 있으면 호스트 분쟁 상세. 앱의 item.id fallback은 존재하지만 DISPUTE_CASE: 접두사가 붙은 처리함 ID를 유효한 사건 ID로 보장하지 않는다. |
| INQUIRY | sourceId로 호스트 상담 상세 |
| PAYMENT_ISSUE | eventId가 있으면 이벤트 결제 관리, 아니면 regularMeetingId가 있을 때 정기 모임 회원 관리 |
| OPERATIONAL_ISSUE | eventId가 있으면 이벤트 정산, 아니면 regularMeetingId가 있을 때 정기 모임 정산 |
| REFUND_ISSUE | eventId가 있으면 이벤트 상세 |

앱은 모든 deepLinkType을 그대로 목적지로 사용하지 않는다. 필요한 문맥이 없거나 unknown 출처이면 이동 경로가 없고 카드 탭도 연결하지 않는다. 결제·환불·운영 이슈의 운영팀 처리 표시가 앱의 직접 처리 권한이나 완료를 의미하지 않는다. 분쟁에서 후속 조치를 하려면 [통합 분쟁 상세](F18-01_unified-dispute-case_prd.md)의 조건을 다시 만족해야 한다.

## 앱 새로고침과 복귀

탭별 provider는 20건씩 페이지를 가져온다. 아래로 당기면 현재 상태 목록의 첫 페이지를 다시 가져오며 기존 데이터가 있으면 재조회 동안 유지한다. 통계는 별도 provider다. 이 새로고침 경로는 통계 provider를 invalidate하지 않는다.

처리함 provider에는 disputes 데이터 변경 신호 구독이 없고 화면의 명시적 업무 복귀 재조회도 없다. provider 수명에 따른 재생성과 ‘돌아오면 항상 최신 목록·통계’라는 보장은 다르다. 빈 화면 문구가 새 요청을 자동 표시한다고 하더라도 이 provider의 실시간 구독 근거로 사용하지 않는다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `HostInboxController#getInbox`, `HostInboxController#getStats`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 여러 원천을 모아 메모리에서 정렬하고 수집 창도 서로 다르다. | 모든 이력의 완전한 개수·균일한 500건 상한을 약속하지 않는다. |
| Gap | 목록 당기기 갱신과 별도 통계 갱신이 연결되지 않았다. | 헤더까지 함께 최신화됐다고 설명하지 않는다. |
| Gap | 업무 복귀·새 요청의 실시간 갱신을 이 provider가 직접 보장하지 않는다. | 현재 동작과 빈 화면의 자동 표시 문구를 구분한다. |
| Risk | 필요한 이동 문맥이 없으면 카드가 열리지 않고 사건 ID fallback도 유효성을 보장하지 않는다. | 실제 route 조건과 서버 disputeCaseId를 우선한다. |
| 미검증 | 실제 역할별 목록·대량 항목 성능·업무 처리 후 복귀·통계 시각차를 실행하지 않았다. | 소스 검토를 제품 실행 통과로 계산하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 출처와 역할:** 아홉 출처·세 상태, 공동 주최 위임 정지와 상담의 현재 클럽 관리자 권한을 구분한다.
- **AC-02 미응답:** 이벤트의 최근 메시지 창과 상담의 사용자/비사용자 메시지 누적 규칙을 나눈다.
- **AC-03 입금 확인:** 승인 대기 외에 실제 PENDING BANK_TRANSFER 신고가 있는 신청을 응답 필요로 분류한다.
- **AC-04 신고 공개:** EVENT_HOST 관할·이벤트 범위·조회자 본인 대상 제외·신고자 표시 생략을 따른다.
- **AC-05 페이지 경계:** 출처별 상한과 분쟁 선행 100건 제한 뒤 상태 필터를 설명한다.
- **AC-06 통계 의미:** DONE 비율·빈 목록 100·완료 항목 수정까지의 평균과 실제 답변 시간을 구분한다.
- **AC-07 업무 이동:** 원천별 eventId/regularMeetingId/disputeCaseId 조건과 이동 불가를 확인한다.
- **AC-08 갱신 범위:** 현재 탭의 목록 새로고침·별도 통계·명시적 복귀 갱신 부재를 구분한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
