# 상태 전이와 후속 결과

<!-- release-document: reference -->
> 2026-11-22 현재 서버 상태값·주요 전이와 검토 완료한 기능 정본을 대조했다. 소스 설명이며 새 제품 시험·기기 검수·배포 확인 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)을 따른다.


<!-- derived-from: prd/03_policy_prds/state_policy_prd.md; sha256: a34997962b6370e352e3bef8fbd374e99efb06c1c1c89db8714ba7f640a1fc38 -->

## 이 보조 문서의 역할

[상태 정책 정본](../03_policy_prds/state_policy_prd.md)의 현재 상태·전이·후속 결과를 기획 검토용으로 연결한다. 버튼 문구를 정할 때는 각 기능의 입구·현재 권한·대상 상태를 함께 확인한다. 정책 정본과 기능 PRD가 우선하며 날짜별 조사 원문은 아래 별도로 보존한다. 이 보조 문서의 반복된 상태 표를 독립된 두 번째 규칙으로 운영하지 않는다.

## 상태를 읽는 기준

상태는 **어떤 기록의 상태인지**부터 구분한다. 모임 공개 상태, 신청, 실제 참석, 납부, 송금, 반환, 분쟁, 알림 전달은 서로 다른 기록이다. 같은 이름의 PENDING·COMPLETED라도 같은 사건을 뜻하지 않는다. enum에 전이가 있다는 사실만으로 모든 API·역할에서 그 전이가 허용되지는 않는다.

| 확인 순서 | 문서에 남길 내용 |
|---|---|
| 대상과 현재 사실 | 계정·대상·원천 기록, 저장 상태와 계산한 화면 단계 |
| 실행 자격 | 현재 역할·소속·상태·기한·보류·공개 설정·필요한 동의 |
| 실행 결과 | 저장된 전이, 아직 진행 중인 돈·알림·정리 작업 |
| 실패·복귀 | 확정 거절·결과 불명·부분 처리·만료를 나누고 현재 결과를 다시 조회 |

권한의 공통 기준은 [권한 정책](../03_policy_prds/permission_policy_prd.md), 금전 후속 처리는 [결제·환불·정산 정책](../03_policy_prds/payment_settlement_policy_prd.md)을 따른다. 화면 문구만으로 저장 상태나 외부 실행 완료를 판정하지 않는다.

## 이벤트 공개 상태와 실제 종료

EventStatus는 DRAFT·OPEN·CLOSED·CANCELED 네 값이다. 기본 전이는 DRAFT에서 OPEN 또는 CANCELED, OPEN에서 CLOSED 또는 CANCELED다. 일반 이벤트 enum에서 CLOSED·CANCELED는 다음 전이가 없다. **숨김은 이 enum의 다섯 번째 상태가 아니다.** 노출 설정·운영 제한·시간 경계는 별도로 읽는다.

공개 모임의 편집 가능 범위와 일정 변경 제안은 상태 전이와 다른 계약이다. CLOSED 표시를 모든 모임의 실제 만남 종료로 번역하지 않는다. 특히 비공개 모임은 상대 선정 때 모집을 닫아도 만남과 완료 확인이 남는다. 정기모임 코스의 CLOSED 재공개는 별도 상태 기계다.

[이벤트 생성·공개·마감·취소](../02_feature_prds/03_event/F03-04_event-lifecycle_prd.md), [정기모임 코스 공개·마감·재개·취소](../02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md)를 따른다. 정기모임 코스의 재개는 VARIABLE에 허용되며 일반 이벤트의 CLOSED를 다시 OPEN으로 바꾸는 공통 규칙이 아니다.

## 신청·참석·선입금의 서로 다른 상태

| 기록 | 현재 상태값 | 혼동하면 안 되는 사실 |
|---|---|---|
| ApplicationStatus | PENDING, APPROVED, APPROVED_PENDING_PAYMENT, PAYMENT_EXPIRED, REJECTED, CANCELED, CANCEL_PENDING_REFUND | 승인과 참석 행 생성·납부 완료를 합치지 않음 |
| AttendanceStatus | ATTENDING, WAITING, CANCELLED | 신청의 CANCELED와 철자가 다름. 회원·게스트 행과 정원을 별도 판단 |
| EventPaymentStatus | PENDING, PAID, REFUND_REQUESTED, REFUNDED, CANCELED | 결제 행과 송금·입금 신고 상태는 별개 |

신청 PENDING은 승인·결제 대기 승인·거절·취소로 이동할 수 있다. APPROVED_PENDING_PAYMENT에서는 납부 완료에 따른 APPROVED, 기한 만료 PAYMENT_EXPIRED 또는 취소를 구분한다. 이미 승인된 신청의 취소는 곧바로 CANCELED가 되거나 반환 대기 CANCEL_PENDING_REFUND가 남을 수 있다. 만료·거절·취소 후의 재신청·재승인 전이는 해당 명령의 현재 조건을 다시 검사한다.

선입금 대기 동안 참석 행 없이 논리적으로 자리를 예약하는 경우가 있다. 한 신청의 회원·게스트가 실제 참석과 대기로 나뉠 수도 있으므로 신청 한 행만으로 전체 인원의 참석을 세지 않는다. 유료 모임인데 선입금이 꺼진 설정을 무료 승인 흐름으로 우회시키는 과거 설명은 현재 거절 조건과 맞지 않는다.

납부 만료 처리는 기한이 엄격하게 지난 대상을 다룬다. 호스트의 은행 입금 확인을 기다리는 신고는 일반 만료 대상과 구분한다. 현재 은행 신고·확인 앱 경로가 있으며 신고 버튼 성공이 실제 송금·입금 확인·참석 확정을 모두 뜻하지 않는다. POINT는 지갑, CASH·현재 MIXED 앱 경로는 은행 안내를 사용하며 MIXED를 항상 사용자 결제수단 선택 화면으로 설명하지 않는다.

EventPaymentStatus의 PENDING은 PAID·REFUND_REQUESTED·CANCELED로, PAID는 REFUND_REQUESTED·REFUNDED로, REFUND_REQUESTED는 REFUNDED·CANCELED로 전이할 수 있다. 이 허용 목록은 모든 취소가 즉시 환불된다는 보장이 아니다.

[이벤트 신청·참석·취소](../02_feature_prds/03_event/F03-05_event-attendance_prd.md), [정원과 대기자](../02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md), [선입금과 입금 확인](../02_feature_prds/03_event/F03-13_event-prepayment_prd.md)을 함께 따른다.

## 비공개 만남의 계산된 단계

PrivateMeetingPhase는 EventStatus와 matchedAt·completedAt으로 계산한다. 독립된 단계 열을 저장하고 순서대로 증가시키는 모델로 설명하지 않는다.

| 조건 | 계산 단계 | 해석 |
|---|---|---|
| DRAFT | WAITING_PAYMENT | 초안의 표시 단계. 이 이름만으로 실제 미납 채무 존재를 단정하지 않음 |
| OPEN | RECRUITING | 상대 모집 |
| CANCELED | CANCELLED | 취소. 반환의 실제 완료와 별도 |
| CLOSED + completedAt 있음 | COMPLETED | 완료 사실 저장 |
| CLOSED + matchedAt 있음, completedAt 없음 | MATCHED | 상대 선정 뒤 실제 만남·완료 확인이 남음 |
| 위 조건에 해당하지 않음 | WAITING_PAYMENT | 현재 계산 함수의 기본값 |

선정은 선택 신청을 승인하고 실제 참석을 연결하며 다른 대기 신청을 정리한 뒤 모임을 PRIVATE_MATCH 사유로 닫고 matchedAt을 남긴다. 동일 선정의 재요청에서 참석 연결을 보완하는 경로도 있다.

완료 확인은 매칭된 모임의 호스트 또는 선정 상대가 예정 종료 시각 이후에 한다. 각자 확인 시각과 최종 completedAt은 다르다. 양쪽이 확인했더라도 보관금 보류 등 반환·지급 조건을 해결하지 못하면 곧바로 완료로 저장되지 않는다. 이미 완료된 확인의 재요청과 새로운 완료 전이를 구분한다. 이 정책의 직접 대조 범위는 선정·완료 확인이며 비공개 만남의 모든 결제·취소 실행을 새로 검증했다는 뜻은 아니다.

## 모임 정산과 송금·반환

| 기록 | 현재 상태값 | 완료의 경계 |
|---|---|---|
| MeetingSettlementStatus | DRAFT, ACTIVE, COMPLETED, CANCELLED | 초안 확정·분담 수집·종결·취소이며 개별 돈 이동과 다름 |
| TransferStatus | PENDING, BANK_AWAITING_CONFIRM, COMPLETED, CANCELLED, EXPIRED, SUPERSEDED, REVERSAL_FAILED, PENDING_MANUAL_REFUND, BANK_WAIVED | 납부·은행 확인·대체·반환 실패·수동 반환·은행 면제 상태를 보존 |
| 호스트 SettlementStatus | PENDING, APPROVED, PAYING, PAID, FAILED, REJECTED | 호스트 정산금의 별도 지급 절차. 모임 정산이나 회원 송금과 합치지 않음 |

초안 정산을 확정하면 유효성 검사 뒤 ACTIVE가 되거나 남은 의무가 없는 경우 같은 요청에서 COMPLETED가 될 수 있다. 확정은 그 자체로 돈을 보내는 행동이 아니다. DRAFT·ACTIVE 취소가 CANCELLED로 저장돼도 지갑 반환·외부 은행 반환·수동 수습은 남을 수 있다.

EXPIRED가 TransferStatus.isOpen()에서 false인 것과 해당 정산의 완료 판정은 다르다. 완료 판정에서는 COMPLETED·CANCELLED·SUPERSEDED·BANK_WAIVED를 제외한 송금 의무를 따로 검사하므로 ‘기한 만료=채무 소멸’로 안내하지 않는다. BANK_AWAITING_CONFIRM은 수취 확인 전 상태이며 앱 신고 성공을 수취 완료로 바꾸지 않는다.

호스트 정산금의 FAILED·REJECTED에 임의로 자동 재지급·회원 재심 화살표를 붙이지 않는다. 각 재처리 명령·보류·외부 결과 확인 조건이 필요하다. 외부 지급 시작 전의 대기와 이미 요청한 뒤 결과를 모르는 UNKNOWN·조회 대기를 나누고, 응답을 잃었다는 이유로 새 지급을 보내지 않는다.

[모임 정산 도메인](../01_domain_prds/07_모임_정산_prd.md), [금액 검토·정산 요청·취소와 반환](../02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md), [결제·환불·정산 정책](../03_policy_prds/payment_settlement_policy_prd.md)을 따른다.

## 이동 지원·차량 배정·조정 요청

이동 지원, 실제 차량, 현재 참가자의 이동 의사, 차량 배정, 물리 좌석과 조정 요청을 한 상태열로 합치지 않는다. 조율을 끄는 설정 변경도 기존 배정 기록의 삭제를 뜻하지 않는다.

| 대상 | 상태·행동의 경계 |
|---|---|
| 차량 지원 | PENDING·APPROVED·REJECTED·WITHDRAWN·PARTICIPATION_ENDED. 지원·수정·철회·거절은 기존 배정을 유지하며 승인 시점에 운전자 배정으로 전환 |
| 배정 필요·개별 이동 | NEEDS_ASSIGNMENT·INDIVIDUAL과 개인 승차 장소. 공동 차량에 이미 배정된 사람의 의사 변경은 조정 절차 적용 |
| 이동 조율 종료 | LEFT. 모임 참가 취소와 다름. 현재 자리·대기 지원·요청을 정리하며 살아 있는 본인 차량은 먼저 취소 |
| 운행 취소 | 차량 CANCELLED. 모임에 남는 전 운전자·승객을 다시 배정 대상으로 남김. 자동 SELF 차량이나 개별 이동을 생성하지 않음 |
| 조정 요청 | PENDING·RESOLVED·DECLINED·WITHDRAWN·PARTICIPATION_ENDED·EVENT_ENDED. 모임 종료에 따른 닫힘을 해결 성공으로 읽지 않음 |
| 모임 종료 뒤 미해결 | 남은 배정 과제를 미해결 기록으로 보존. 화면에서 요청이 닫혔다고 모두 배정됐다고 표시하지 않음 |

차량 배정과 물리 좌석은 별개다. 지원 승인이 실제 좌석 선택 완료를 뜻하지 않으며 운전자는 동승 정원에서 제외한다. 상세 조건은 [이동수단 공통 설정](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md), [카풀 지원·개별 이동](../02_feature_prds/03_event/F03-15_event-carpool_prd.md), [대절 버스와 자리 배정](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md)을 따른다.

## 일정 변경 응답·노쇼·분쟁

| 대상 | 현재 상태값 | 별도로 읽을 사실 |
|---|---|---|
| 일정 변경 개별 응답 | PENDING, ACCEPTED, DECLINED, AUTO_ACCEPTED, WITHDRAWN | 응답·기한 자동 동의·변경 묶음의 실제 확정은 다름 |
| NoShowStatus | CONFIRMED, APPEALED, OVERTURNED | 서버 판정과 앱의 OPEN·REJECTED·DEADLINE_PASSED 등 표시 분류는 다름 |
| UnifiedDisputeStatus | OPEN, IN_REVIEW, RESOLVED, CLOSED, ESCALATED, CLOSED_WITH_MANUAL_RECOVERY | 수동 수습을 남긴 닫힘과 모든 보상 완료를 합치지 않음 |
| DisputeAppealStatus | PENDING, DECIDED, COMPENSATION_APPLIED, UPHELD, RECOVERY_REQUIRED, REJECTED, CLOSED | 결정·보상 적용·인용·수습·기각·철회 닫힘을 보존 |

노쇼의 소명은 본인과 확정 시각부터 7일 기한을 검사하며 기각 뒤 재소명을 자동 허용하지 않는다. CONFIRMED·APPEALED에서 OVERTURNED로 뒤집은 결과는 별도 최종 판정이다. canonical 사건 ID가 있다는 사실을 통합 분쟁 등록부가 이미 만들어졌다는 뜻으로 사용하지 않는다.

통합 이의의 isClosed()는 PENDING 이외에서 true지만, 사건 종결 차단 판정은 PENDING·DECIDED·COMPENSATION_APPLIED를 별도로 다룬다. PENDING 본인 철회는 CLOSED로 바뀌며 재요청 성공 재생이나 재접수 권리를 자동 보장하지 않는다. 원천 동기화·보류 해제·알림·보상은 각각의 후속 결과를 확인한다. 기본 비활성인 플랫폼 판단 경로도 있으므로 상태 enum의 존재와 운영 접수 가능을 구분한다.

[일정 변경 제안과 참가자 합의](../02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md), [노쇼 확정·소명](../02_feature_prds/03_event/F03-20_event-no-show_prd.md), [통합 이의 접수·철회](../02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md)을 따른다.

## 플랜 공개·구매 권리·차단 해제

PlanStatus는 DRAFT·PUBLISHED·HIDDEN·DELETED다. 플랜 본문 공개, 마켓 판매, 구매 거래, 보유 권리는 별개다. 무료 본문 열람이 구매 완료·모임 생성 권리를 뜻하지 않으며 숨김 이후 기존 유효 구매자의 접근도 별도로 판정한다. [플랜 상세와 열람 권리](../02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md)를 따른다.

DateBlockStatus는 BLOCKED·UNBLOCKED다. 해제는 이전 매칭·채팅방 복원을 뜻하지 않고 상대방이 설정한 차단까지 해제하지 않는다. [프라이빗 데이트 차단](../02_feature_prds/09_private_date/F09-07_block_prd.md)의 현재 관계·소프트 기록 정책을 따른다.

차단 출처 DateBlockSource는 DATING과 COMMUNITY다. 커뮤니티 차단이 데이트 쪽에 만든 행은 COMMUNITY이며, 데이트에서 명시적으로 다시 차단하면 DATING으로 바뀐다. 데이트 해제는 DATING만 대상으로 하고 같은 방향의 커뮤니티 차단이 남으면 BLOCKED·COMMUNITY로 바꾼다. 커뮤니티 해제는 별도로 건 DATING을 풀지 않는다. 이미 데이트에서 차단한 상대에게 안전 신고를 추가하는 요청은 차단 상태·최초 시각을 유지하며, 중복 신고의 거절은 요청 전체를 되돌린다.

## 데이터 내보내기·삭제 예약·탈퇴

| 대상 | 상태 | 사용자에게 설명할 경계 |
|---|---|---|
| 데이터 내보내기 | PROCESSING, COMPLETED, FAILED, EXPIRED | 상태 조회 실패를 요청 없음으로 해석하지 않음. 완료 URL 열기는 실제 파일 수신 확인과 다름 |
| 데이터 삭제 요청 | PENDING, APPROVED, COMPLETED, CANCELLED | NONE은 저장 enum이 아니라 활성 요청이 없는 화면 표현 |
| 삭제 요청 취소 | 본인 PENDING만 가능 | APPROVED 이후에도 취소 가능하다는 이전 설명은 현재 계약과 맞지 않음 |
| 예약 시각 도래 | PENDING의 30일 뒤 처리 대상 | 제재·금전 의무·동의·실패 등의 실행 조건 재검사. 시각 도래만으로 COMPLETED 아님 |

활성 삭제 조회가 PENDING·APPROVED만 반환하므로 완료·취소 뒤 요청이 없다는 화면과 감사 기록 삭제를 혼동하지 않는다. 예약 시 공개 해제한 자료와 실행 전 일부 정리 결과는 취소·후속 실패 때 자동 복구되지 않을 수 있다.

즉시 탈퇴의 계정 비활성·신원 정리·세션 해제, 예약 삭제, 보존 기한에 따른 물리 제거는 서로 다른 처리다. 탈퇴가 이미 끝난 모임의 참가·출석 사실을 취소로 바꿔서는 안 되며 미결 책임과 후속 정리는 별도다. [데이터 내보내기](../02_feature_prds/13_profile_settings/F13-05_data-export_prd.md), [데이터 삭제 예약](../02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md), [즉시 탈퇴와 남은 참여 정리](../02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md)를 따른다.

## 위치 동의·좌표·만료와 보존

공유 동의, OS 위치 권한, 좌표 갱신, 공유 만료 시각, 실제 조회 권한과 조회 기록은 별개다. 동의 저장만으로 좌표를 취득하거나 타인이 본 것은 아니다. 주기적 좌표 갱신이 원래 공유 만료를 자동 연장한다고 설명하지 않는다. 공유 중지는 새로운 공개와 저장된 기록의 보존·삭제를 같은 결과로 만들지 않는다.

증빙 참조 해제와 저장소의 실제 파일 제거도 별도 단계다. 분쟁의 화면상 종결일 하나로 모든 원천의 보존 기한을 계산하지 않는다. [개인정보·안전 정책](../03_policy_prds/privacy_safety_policy_prd.md)의 현재 소유권·목적·동의·보류·원천별 기한을 따른다.

## 알림 의도·알림함·발송·실수신

업무 상태 변경 → 알림 의도 → 알림함 기록·채널 작업 → 공급자 발송 → 실제 기기 표시를 하나의 완료로 합치지 않는다. 채널·기능별 구현이 다르며 모든 메일에 영속 큐의 자동 재시도가 있다고 일반화하지 않는다.

카테고리 끄기는 새 푸시와 알림함 기록을 함께 제한하며 이미 받은 기록을 삭제하지 않는다. 방해금지는 일반 푸시를 건너뛰는 조건이고 알림함 기록을 취소하지 않는다. 이를 무조건 다음 시간까지 보류·예약 발송하는 상태로 설명하지 않는다. 예외 종류·수신자 자격·발송 시점의 도메인 상태를 따로 검사한다.

처리 소유권·임대·다음 시도·만료·최대 시도는 발송 작업의 상태다. 알림함 읽음은 업무 완료가 아니며 공급자의 SENT·수락도 사용자의 수신 증거가 아니다. [알림 정책](../03_policy_prds/notification_policy_prd.md)을 따른다.

## 계정 전환·오류 뒤 화면 복귀의 확인 기준

상태를 바꾸는 기능은 시작 계정·대상과 완료 시점 계정·대상을 맞춰야 한다. 통신 오류는 기존 자료와 재시도를 유지할 수 있지만, 오류 코드로 확인된 자료 접근 거절은 앞 본문·목록·권한 값을 내리고 그 값으로 명령이나 다음 화면을 열지 않는다. 추가 페이지의 거절도 앞쪽 자료를 비우며 빈 조회 성공으로 바꾸지 않는다. 401의 세션 처리와 재동의·계정 제한 관문은 자료 접근 거절과 구분한다. 낙관적 변경 실패는 해당 변경의 복구, 저장 후 조회 실패는 저장 결과 확인으로 나눈다. 자세한 판정과 대화 기록 예외는 [접근 거절 뒤의 자료와 명령](../03_policy_prds/permission_policy_prd.md#접근-거절-뒤의-자료와-명령)을 따른다.

이 기준을 모든 화면에서 새로 실행 검증했다는 뜻으로 읽지 않는다. 초안 보존, 업로드 중 이탈, 페이지 추가 조회, 권한 갱신, 계정 전환 응답 폐기는 각 기능 정본에 확인된 연결과 제한을 적는다. 검수 범위는 [기획 QA 정책](../03_policy_prds/planning_qa_policy.md)을 따른다.

## 결과 불명 명령과 재요청 키

앱의 시간 제한형 IdempotencyKeyHolder는 같은 입력의 키를 만든 시각부터 **23시간 미만**, 시계가 뒤로 가지 않은 경우 재사용한다. 시간창을 벗어난 기존 키는 해제하고 동일 입력의 즉시 재생성을 잠시 막으며 현재 결과 확인을 안내한다. 입력이 달라진 새 명령과 동일 명령의 재시도는 구분한다.

이 보관함의 untimed 모드는 위 시간창을 쓰지 않는다. 회원 금전 명령에는 별도의 계정별 영속 의도 저장소를 사용하므로 화면 메모리 보관함의 23시간 정책을 그대로 적용하지 않는다. 서버의 모든 API가 같은 기간 응답을 재생한다는 보장도 아니다.

확정 거절, 실행 성공, 결과 불명, 입력 수정은 각 명령의 키 해제·보존 규칙을 따른다. 응답이 없다는 이유로 돈·역할 변경을 새 키로 반복하지 않는다. 영속 기록이 필요한 명령에서 저장 실패는 실행을 막는 조건이며 UI 재시도 문구가 서버 중복 방지 계약을 대신하지 않는다.

## 구독·환불 큐·출금 운영 값의 추가 구분

| 대상 | 현재 enum 값 | 판정 경계 |
|---|---|---|
| 개인 SubscriptionStatus | ACTIVE, CANCELLED, SUSPENDED, EXPIRED, REFUNDING | 환불 중을 별도로 표현. 상태 표지·남은 기간·신규 가입 자격은 서로 다름 |
| ClubSubscriptionStatus | ACTIVE, CANCELLED, SUSPENDED, EXPIRED | 현재 enum에는 REFUNDING이 없음. 개인 구독 enum을 복제하지 않음 |
| FailedRefundStatus | PENDING, RESOLVED, FAILED | 현재 enum에는 PROCESSING이 없음. 운영 선점·예약 여부를 이 enum 값으로 만들어 내지 않음 |
| WithdrawalDeadLetterAction | REQUEUE, RESTORE_RESERVE | 상태가 아니라 운영 행동. 자동 재지급·지급 미실행 증거를 뜻하지 않음 |

개인 구독의 CANCELLED는 자동갱신 해제와 남은 이용 기간을 구분한다. `canSubscribe`는 서버의 현재 기간·환불 상태 판정이며 클라이언트 시각만으로 가입을 열지 않는다. [개인 구독의 가입·해제·이용 기간](../02_feature_prds/06_payment/F06-08_personal-subscription_prd.md)을 따른다.

위 운영 enum 목록은 해당 서비스의 모든 실행 전이를 새로 대조했다는 뜻이 아니다. 외부 지급 시작 전 대기·이미 호출한 뒤 결과 불명·현재 선점권·늦은 증빙·원장 반영은 [결제·환불·정산 정책](../03_policy_prds/payment_settlement_policy_prd.md#외부-지급의-시작-전-대기와-결과-불명)을 따른다. 과거 차수의 환불 예약 상태·재전송 설명을 현재 구현으로 재사용하지 않는다. 원장 차대·세금·실제 은행 수령은 현재 정책에 따른 별도 대사 대상이다.

## 상태 정책의 수용 기준과 검증 근거

- **대상 분리:** 신청·참석·결제·송금·반환·분쟁·알림을 같은 상태로 합치지 않는다.
- **종료 경계:** 모집 마감·실제 만남 종료·양쪽 확인·보관금 해제·완료 사실을 구분한다.
- **후속 작업:** 취소·기한 만료·삭제 예약·분쟁 닫힘을 돈 반환·물리 삭제·보상 완료로 확대하지 않는다.
- **복구:** 결과 불명에서는 해당 키·의도 기록과 현재 결과를 확인하고 기능별 확정 거절 조건을 따른다.
- **증거:** 직접 읽은 상태 enum·비공개 선정/완료·앱 키 보관과 동일 SHA의 기능 정본을 근거로 한다. 이번 제품 시험·실제 기기·운영 설정·외부 송금·푸시는 실행하지 않았다.

## 과거 상태 전이 조사 원문 보존

아래는 2026년 6월 당시 조사·수정 기록의 원문이다. 현재 enum·실행 경로와 다를 수 있으므로 현재 계약이나 이번 시험 결과로 세지 않는다. 본문의 현재 설명과 연결된 정본을 우선한다.

> > 아래 섹션은 2026-06-05 신규 상태기계 추가분이다. 근거: 2026-06-04 델타 실사. 원문은 [문서 정리와 보관 위치](../../../docs/development/DOCUMENTATION_GUIDE.md#2026-09-28-문서-정리)의 외부 백업에 보관한다.
>
> ## 10. ApplicationStatus — 참가 신청 상태 (전체 7값, 갱신)
>
> > 소스: `ApplicationStatus.java:24-36`. 기존 §2의 4값 기술을 7값으로 갱신한다.
>
> ```mermaid
> stateDiagram-v2
>     [*] --> PENDING: 신청 제출
>     PENDING --> APPROVED: 호스트 승인 (선입금 미활성)
>     PENDING --> APPROVED_PENDING_PAYMENT: 호스트 승인 + 선입금 필요
>     PENDING --> REJECTED: 호스트 거절 (reasonCode 필수)
>     PENDING --> CANCELED: 사용자 취소
>     APPROVED --> CANCELED: 사용자 취소
>     APPROVED_PENDING_PAYMENT --> CANCELED: 사용자 취소
>     APPROVED_PENDING_PAYMENT --> PAYMENT_EXPIRED: 결제 기한 만료 (스케줄러)
>     APPROVED_PENDING_PAYMENT --> CANCEL_PENDING_REFUND: 계좌이체 취소 후 호스트 환불 확인 대기
>     REJECTED --> PENDING: 재신청
>     PAYMENT_EXPIRED --> PENDING: 재신청 (active event_payment 없을 때만)
>     CANCELED --> PENDING: 재신청
> ```
>
> | 상태 | 의미 | 정원 점유 | 터미널 여부 |
> |---|---|---|---|
> | `PENDING` | 호스트 심사 대기 | 미점유 | 아니오 |
> | `APPROVED` | 승인 완료 | 점유 (`occupiesCapacity()`) | 아니오 |
> | `APPROVED_PENDING_PAYMENT` | 승인됐으나 선입금 결제 대기 | 미점유 (D4) | 아니오 |
> | `PAYMENT_EXPIRED` | 결제 기한 만료 | 미점유 | 예 (`isTerminated()`) |
> | `REJECTED` | 호스트 거절 | 미점유 | 예 |
> | `CANCELED` | 정상 취소 완료 | 미점유 | 예 |
> | `CANCEL_PENDING_REFUND` | 계좌이체 취소 후 호스트 환불 확인 대기 | 점유 유지 (hold), 노쇼 통계 제외 | 아니오 |
>
> 기획 주의점:
> - `CANCEL_PENDING_REFUND`는 정원을 hold하되, `CheckInService.getCheckInStats()`에서 `pendingRefundUserIds` 필터로 노쇼 통계 분모/분자에서 제외된다.
> - 거절(REJECTED) 시 `ApplicationRejectReasonCode`(CAPACITY_FULL/ELIGIBILITY_NOT_MET/SANCTIONED/HOST_DISCRETION/DUPLICATE_PROFILE/PAYMENT_TIMEOUT/OTHER) 7종 중 하나를 반드시 지정해야 한다. 미지정 시 서버 400 반환.
> - 승인→attendance 생성 직전 `EventApplyRestrictionGuard.assertNotRestricted`가 재검사된다(클럽-스코프 + 플랫폼 전역 2축).
>
> ## 11. NoShowStatus — 이벤트 노쇼 상태 (신규)
>
> > 소스: `NoShowStatus.java:18-22`, `EventNoShowService.java:82-390`
>
> ```mermaid
> stateDiagram-v2
>     [*] --> CONFIRMED: 호스트·cohost·클럽 운영진 confirm() 또는 confirmBatch()
>     CONFIRMED --> APPEALED: 본인(row.userId)만 appeal(noShowId, appealCaseId) — appealCaseId 외부 발급 필요
>     CONFIRMED --> OVERTURNED: 호스트·cohost·클럽 운영진 또는 SYSTEM(id=0) overturn() 직접 가능
>     APPEALED --> OVERTURNED: 호스트·cohost·클럽 운영진 또는 SYSTEM overturn()
> ```
>
> | 상태 | 의미 | 제재 카운트 포함 여부 |
> |---|---|---|
> | `CONFIRMED` | 호스트 또는 시스템 자동 확정 | 포함 |
> | `APPEALED` | 참가자 소명 진행 중 (dispute_case 연결) | 포함 (`countRecentNoShows`는 CONFIRMED+APPEALED 합산) |
> | `OVERTURNED` | CS/호스트가 결정 뒤집음 — 터미널 | 제외 |
>
> 기획 주의점:
> - OVERTURNED 상태에서 추가 전이 불가 (`EVENT_NO_SHOW_ALREADY_OVERTURNED` 409).
> - APPEALED 상태에서 다시 appeal 시도 시 `EVENT_NO_SHOW_ALREADY_APPEALED` 409.
> - appeal 기한은 v1에서 미구현. 참가자가 CONFIRMED 상태를 무기한 소명 가능한 상태(Gap G-3).
> - `cohost.canManageAttendance` flag 체크 없이 노쇼 확정/뒤집기 가능한 불일치 존재(Gap G-6 — `EventNoShowService.validateCheckInManager()` vs `CheckInService.validateCheckInManager()` 비교).
>
> ## 12. UnifiedDisputeStatus — 통합 분쟁 케이스 상태 (신규)
>
> > 소스: `UnifiedDisputeStatus.java`, `DisputeLegalHoldService.java:103-107`
>
> ```mermaid
> stateDiagram-v2
>     [*] --> OPEN: 분쟁 접수 (USER_DISPUTE 직접 생성, 또는 원천 도메인 파생)
>     OPEN --> IN_REVIEW: 운영자 검토 시작
>     OPEN --> ESCALATED: CS/운영자 에스컬레이션
>     OPEN --> RESOLVED: 처리 완료
>     OPEN --> CLOSED: 액션 없이 종결
>     IN_REVIEW --> RESOLVED: 처리 완료
>     IN_REVIEW --> ESCALATED: 에스컬레이션
>     IN_REVIEW --> CLOSED: 종결
>     ESCALATED --> RESOLVED: 처리 완료
>     ESCALATED --> CLOSED: 종결
> ```
>
> | 상태 | Legal Hold | Evidence 정리 대상 |
> |---|---|---|
> | `OPEN` | 활성 | 아니오 |
> | `IN_REVIEW` | 활성 | 아니오 |
> | `ESCALATED` | 활성 | 아니오 |
> | `RESOLVED` | 비활성 | 예 (1년 후) |
> | `CLOSED` | 비활성 | 예 (1년 후) |
>
> **원천 도메인 → UnifiedDisputeStatus 매핑:**
>
> | 원천 도메인 (caseId prefix) | 원천 상태 | 매핑 UnifiedDisputeStatus |
> |---|---|---|
> | `OPERATIONAL_ISSUE` | OPEN | OPEN |
> | `OPERATIONAL_ISSUE` | IN_PROGRESS | IN_REVIEW |
> | `OPERATIONAL_ISSUE` | RESOLVED | RESOLVED |
> | `OPERATIONAL_ISSUE` | REJECTED | CLOSED |
> | `WARNING_REPORT` | SUBMITTED | OPEN |
> | `WARNING_REPORT` | IN_REVIEW / NEEDS_MORE_INFO | IN_REVIEW |
> | `WARNING_REPORT` | APPROVED / REJECTED | RESOLVED |
> | `WARNING_REPORT` | WITHDRAWN | CLOSED |
> | `WARNING_APPEAL` | SUBMITTED | OPEN |
> | `WARNING_APPEAL` | IN_REVIEW | IN_REVIEW |
> | `WARNING_APPEAL` | ACCEPTED / PARTIALLY_ACCEPTED / REJECTED | RESOLVED |
> | `WARNING_APPEAL` | WITHDRAWN | CLOSED |
> | `SETTLEMENT_APPEAL` (AppealStatus) | PENDING | OPEN |
> | `SETTLEMENT_APPEAL` | APPROVED / REJECTED | RESOLVED |
> | `SETTLEMENT_APPEAL` | RESOLVED | CLOSED |
> | `REPORT` (public) | PENDING | OPEN |
> | `REPORT` | IN_REVIEW | IN_REVIEW |
> | `REPORT` | RESOLVED / DISMISSED | RESOLVED |
> | `REPORT` | ESCALATED | ESCALATED |
> | `REFUND_DISPUTE` | OPEN | OPEN |
> | `REFUND_DISPUTE` | UPHELD / OVERTURNED | RESOLVED |
> | `REFUND_DISPUTE` | CLOSED | CLOSED |
> | `DATE_BLOCK` | — | 연결 report.status로 파생 (reportId=null → hold 없음) |
> | `TRANSPORT` | — | source row = report, mapReport와 동일 |
> | `CLUB_MEMBERSHIP_ACTION` | DisputeAppeal 없음 | OPEN |
> | `CLUB_MEMBERSHIP_ACTION` | DisputeAppeal PENDING | IN_REVIEW |
> | `CLUB_MEMBERSHIP_ACTION` | DisputeAppeal UPHELD / REJECTED | RESOLVED |
> | `CLUB_MEMBERSHIP_ACTION` | DisputeAppeal CLOSED | CLOSED |
> | `USER_DISPUTE` | OPEN (native) | OPEN (admin API가 전이 소유) |
> | `USER_DISPUTE` | IN_REVIEW / ESCALATED / RESOLVED / CLOSED | 동일 매핑 |
>
> ## 13. DisputeAppealStatus — 분쟁 이의제기 상태 (신규)
>
> > 소스: `DisputeAppealStatus.java`, `DisputeAppealService.java:210-241`
>
> ```mermaid
> stateDiagram-v2
>     [*] --> PENDING: 이의 제출 (POST /me/dispute-cases/{caseId}/appeals)
>     PENDING --> CLOSED: 본인 철회 (POST .../withdraw)
>     PENDING --> UPHELD: admin 인용
>     PENDING --> REJECTED: admin 기각
> ```
>
> | 상태 | 의미 | 철회 가능 |
> |---|---|---|
> | `PENDING` | 검토 대기 | 가능 (본인만) |
> | `UPHELD` | 인용됨 — 터미널 | 불가 |
> | `REJECTED` | 기각됨 — 터미널 | 불가 |
> | `CLOSED` | 철회/만료 — 터미널 | 불가 |
>
> `isClosed()` 로직: `this != PENDING` (`DisputeAppealStatus.java:17`).
>
> ## 14. RescheduleProposalStatus — 일정 변경 제안 응답 상태 (신규)
>
> > 소스: `RescheduleResponseStatus.java:15-21`, `EventRescheduleProposalService.java`
>
> ```mermaid
> stateDiagram-v2
>     [*] --> PENDING: 참가자별 proposal 생성 (MAJOR 분류 시)
>     PENDING --> ACCEPTED: 참가자 accept=true 응답 (마감 전)
>     PENDING --> DECLINED: 참가자 accept=false 응답 (마감 전) → 자동 취소 트리거
>     PENDING --> AUTO_ACCEPTED: 스케줄러 48h 자동수락 (deadline 경과, bulk UPDATE) 또는 마감 후 늦은 응답 시 인라인 전이 후 409
>     PENDING --> WITHDRAWN: 호스트 batch 철회 (이미 응답한 row 포함 일괄)
> ```
>
> | 상태 | 의미 | 응답 변경 가능 |
> |---|---|---|
> | `PENDING` | 참가자 응답 대기 | 가능 (마감 전) |
> | `ACCEPTED` | 동의 — 터미널 | 불가 |
> | `DECLINED` | 거절 → 참가 자동 취소(RESCHEDULE_DECLINED, 100% 환불) | 불가 |
> | `AUTO_ACCEPTED` | 스케줄러 자동 수락 — 터미널 | 불가 |
> | `WITHDRAWN` | 호스트 철회로 소프트 삭제 (감사 보존) | 불가 |
>
> **분류 규칙 (RescheduleClassifierService):**
>
> | 조건 | 분류 | 동작 |
> |---|---|---|
> | |Δstart| ≥ 60분 또는 주소 변경 또는 가격 인상 | `MAJOR` | 참가자별 proposal 생성, 48h 응답 기한, batch 확정 필요 |
> | 위 조건 모두 미해당 | `AUTO` | 즉시 이벤트 필드 반영, proposal row 생성 없음, EVENT_UPDATED(RESCHEDULE) 알림 |
>
> applyBatch 조건: `pendingCount == 0 && withdrawnCount == 0` (readyToApply=true).
>
> ## 15. TransferStatus — 모임 정산 이체 상태 (전체 8값, 갱신)
>
> > 소스: `TransferStatus.java`. 기존 6값 기술을 8값으로 갱신.
>
> | 상태 | 의미 | 비고 |
> |---|---|---|
> | `PENDING` | 이체 대기 | — |
> | `BANK_AWAITING_CONFIRM` | 혼합결제의 은행 부분 확인 대기 | 21자 — varchar(32)로 정정 완료. limbo SLA 스케줄러 재알림 대상 |
> | `COMPLETED` | 이체 완료 | — |
> | `CANCELLED` | 취소됨 | — |
> | `EXPIRED` | 만료됨 | — |
> | `SUPERSEDED` | 재발급으로 대체된 원본 | 정산 완료 판정에서 제외 |
> | `REVERSAL_FAILED` | 역분개 실패 | — |
> | `PENDING_MANUAL_REFUND` | 역분개 실패 → 수동 환불 대기 | 21자 — varchar(32)로 정정 완료. limbo SLA 스케줄러 재알림 대상 |
>
> limbo 상태(BANK_AWAITING_CONFIRM, PENDING_MANUAL_REFUND): 실제 돈이 움직였을 수 있는 중간 상태로 자동 EXPIRED 전이 금지. `MeetingSettlementExpirationScheduler`(05:10 cron)가 N일(기본 3일) 경과 시 수신자에게 재알림, 2회 이상 미해소 시 `SETTLEMENT_TRANSFER_LIMBO` 운영알림(HIGH severity) 승급.
>
> ## 16. DateBlockStatus — 데이트 차단 상태 (신규)
>
> > 소스: `DateBlockStatus.java` (Wave D-5)
>
> | 상태 | 의미 | 비고 |
> |---|---|---|
> | `BLOCKED` | 차단 활성 | `isBlockedBetween()` 체크 대상 |
> | `UNBLOCKED` | 차단 해제 (이력 보존) | hard delete → soft transition. UNBLOCKED history row는 차단 체크에서 제외 |
>
> 안전신고 연동: 차단 시 `DateBlockParam.fileReport=true`이면 `ReportType.DATE_USER` 안전신고 동시 생성 + `DateBlock.reportId` 백필. evidence_file_ids 첨부 시 dispute(SAFETY) evidence로 처리. legal hold: 연결 report가 IN_REVIEW/OPEN/ESCALATED이면 DATE_BLOCK source에 legal hold 적용, RESOLVED/CLOSED 후 1년 evidence 정리.
>
> ## 17. 돈 흐름 무결성 운영 상태 (2026-06-06 추가)
>
> > 2026-06-06 돈·포인트 흐름 무결성 수정으로 도입/정정된 결제 운영 상태. 모두 실제 enum 소스 확인 기준이며, 운영자 환불·정산 직렬화와 limbo 감시를 위한 비ACTIVE 예약 상태가 핵심이다.
>
> ### 17.1 SubscriptionStatus — 개인 구독 (갱신)
>
> > 소스: `payment/constants/SubscriptionStatus.java`
>
> | 상태 | 의미 | 비고 |
> |---|---|---|
> | `ACTIVE` | 활성 구독 | 혜택 게이팅 대상 |
> | `CANCELLED` | 해지 | autoRenew=false |
> | `SUSPENDED` | 정지 | |
> | `EXPIRED` | 만료 | |
> | `REFUNDING` | **운영 환불 진행중 예약 마킹 (신규)** | admin prepare tx가 환불 대상 row 선점 → 동시 중복 환불 차단. 비ACTIVE 취급. EnumType.STRING valueOf 파싱 호환을 위해 enum 동기 |
>
> > `ClubSubscriptionStatus`(`club/constants/ClubSubscriptionStatus.java`)에도 동일하게 `REFUNDING` 추가 — admin 클럽구독 환불 진행 중 비ACTIVE 게이트 차단.
>
> ### 17.2 FailedRefundStatus — 환불 실패 보상 큐 (갱신)
>
> > 소스: `payment/constants/FailedRefundStatus.java`
>
> | 상태 | type | 의미 | 비고 |
> |---|---|---|---|
> | `PENDING` | 0 | 처리 대기 | 스케줄러 재시도 대상 |
> | `RESOLVED` | 1 | 처리 완료 | |
> | `FAILED` | 2 | 처리 실패 | |
> | `PROCESSING` | 3 | **운영 포인트 보상 진행중 예약 마킹 (신규)** | admin prepare tx가 선점, unresolved 필터에서 제외 |
>
> ### 17.3 WithdrawalDeadLetterAction — 외부출금 dead-letter 운영 액션 (신규)
>
> > 소스: `payment/withdrawal/constants/WithdrawalDeadLetterAction.java`
>
> | 액션 | 의미 | 비고 |
> |---|---|---|
> | `REQUEUE` | dead-letter 재처리(재전송) | provider 멱등성에 의존(NOOP 상태 미검증, PG 게이트) |
> | `RESTORE_RESERVE` | 터미널 FAILED/DEAD_LETTER에서 지갑 예약 복원 | `pgTransactionId` 가드 + 운영자 confirmPayoutNotSent 오버라이드. 출금 예약 spend 복원 |
>
> > 외부출금은 요청 시 지갑 paidBalance·lot을 reserve spend(SETTLEMENT-lot 우선소비)하고, 출금 가능액은 원장 RECEIVABLE-leg(Σ수취−Σ회수) 기반으로 산정(C1). 정산 수취 크레딧을 지갑에서 소비하면서 동시에 출금하는 이중사용이 차단된다.
>
> ### 17.4 회계 무결성 — 정산/원천세 상태 부수 효과 (정정)
>
> - **정산 완료 분개(§5 PAID)**: `CREATOR_PAYABLE`를 gross 전액(net+fee+tax)으로 소거(triple-entry). admin 운영 정산도 community_api에 위임해 동일 분개(H0).
> - **원천세 예수금(`WITHHOLDING_TAX_PAYABLE`)**: 적립=정방향(DR PLATFORM_CASH/CR WITHHOLDING), 납부(소거)=DR WITHHOLDING/CR PLATFORM_CASH. ledger-only `TransactionType.WITHHOLDING_REMITTANCE(30)`. 운영 납부는 admin 멱등 액션(`accounting_remit_lock` 직렬화).
> - **감시 경보(신규 `OperatorAlertType`)**: `REVERSAL_EXHAUSTED`(역분개 회수 3회 소진), `BANK_REFUND_STALE`(BANK 환불요청 3일 무응답), `SETTLEMENT_FAILED_STALE`(정산 FAILED 5일 경과) — 멱등 키, 상태 전이 없음(돈 in-flight 자동 만료 금지).
