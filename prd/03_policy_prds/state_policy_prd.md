# 상태 정책 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버 상태값·주요 전이와 검토 완료한 기능 정본을 대조했다. 소스 설명이며 새 제품 시험·기기 검수·배포 확인 결과가 아니다. 실행 순서는 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)을 따른다.

## 상태를 읽는 기준

상태는 **어떤 기록의 상태인지**부터 구분한다. 모임 공개 상태, 신청, 실제 참석, 납부, 송금, 반환, 분쟁, 알림 전달은 서로 다른 기록이다. 같은 이름의 PENDING·COMPLETED라도 같은 사건을 뜻하지 않는다. enum에 전이가 있다는 사실만으로 모든 API·역할에서 그 전이가 허용되지는 않는다.

| 확인 순서 | 문서에 남길 내용 |
|---|---|
| 대상과 현재 사실 | 계정·대상·원천 기록, 저장 상태와 계산한 화면 단계 |
| 실행 자격 | 현재 역할·소속·상태·기한·보류·공개 설정·필요한 동의 |
| 실행 결과 | 저장된 전이, 아직 진행 중인 돈·알림·정리 작업 |
| 실패·복귀 | 확정 거절·결과 불명·부분 처리·만료를 나누고 현재 결과를 다시 조회 |

권한의 공통 기준은 [권한 정책](permission_policy_prd.md), 금전 후속 처리는 [결제·환불·정산 정책](payment_settlement_policy_prd.md)을 따른다. 화면 문구만으로 저장 상태나 외부 실행 완료를 판정하지 않는다.

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

[모임 정산 도메인](../01_domain_prds/07_모임_정산_prd.md), [금액 검토·정산 요청·취소와 반환](../02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md), [결제·환불·정산 정책](payment_settlement_policy_prd.md)을 따른다.

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

증빙 참조 해제와 저장소의 실제 파일 제거도 별도 단계다. 분쟁의 화면상 종결일 하나로 모든 원천의 보존 기한을 계산하지 않는다. [개인정보·안전 정책](privacy_safety_policy_prd.md)의 현재 소유권·목적·동의·보류·원천별 기한을 따른다.

## 알림 의도·알림함·발송·실수신

업무 상태 변경 → 알림 의도 → 알림함 기록·채널 작업 → 공급자 발송 → 실제 기기 표시를 하나의 완료로 합치지 않는다. 채널·기능별 구현이 다르며 모든 메일에 영속 큐의 자동 재시도가 있다고 일반화하지 않는다.

카테고리 끄기는 새 푸시와 알림함 기록을 함께 제한하며 이미 받은 기록을 삭제하지 않는다. 방해금지는 일반 푸시를 건너뛰는 조건이고 알림함 기록을 취소하지 않는다. 이를 무조건 다음 시간까지 보류·예약 발송하는 상태로 설명하지 않는다. 예외 종류·수신자 자격·발송 시점의 도메인 상태를 따로 검사한다.

처리 소유권·임대·다음 시도·만료·최대 시도는 발송 작업의 상태다. 알림함 읽음은 업무 완료가 아니며 공급자의 SENT·수락도 사용자의 수신 증거가 아니다. [알림 정책](notification_policy_prd.md)을 따른다.

## 계정 전환·오류 뒤 화면 복귀의 확인 기준

상태를 바꾸는 기능은 시작 계정·대상과 완료 시점 계정·대상을 맞춰야 한다. 조회 실패를 비어 있음이나 권한 없음으로 바꿔 쓰지 않고 현재 결과를 확인할 수 있게 한다. 낙관적 변경 실패는 해당 변경의 복구, 저장 후 조회 실패는 저장 결과 확인으로 나눈다.

이 기준을 모든 화면에서 새로 실행 검증했다는 뜻으로 읽지 않는다. 초안 보존, 업로드 중 이탈, 페이지 추가 조회, 권한 갱신, 계정 전환 응답 폐기는 각 기능 정본에 확인된 연결과 제한을 적는다. 검수 범위는 [기획 QA 정책](planning_qa_policy.md)을 따른다.

## 결과 불명 명령과 재요청 키

앱의 시간 제한형 IdempotencyKeyHolder는 같은 입력의 키를 만든 시각부터 **23시간 미만**, 시계가 뒤로 가지 않은 경우 재사용한다. 시간창을 벗어난 기존 키는 해제하고 동일 입력의 즉시 재생성을 잠시 막으며 현재 결과 확인을 안내한다. 입력이 달라진 새 명령과 동일 명령의 재시도는 구분한다.

이 보관함의 untimed 모드는 위 시간창을 쓰지 않는다. 회원 금전 명령에는 별도의 계정별 영속 의도 저장소를 사용하므로 화면 메모리 보관함의 23시간 정책을 그대로 적용하지 않는다. 서버의 모든 API가 같은 기간 응답을 재생한다는 보장도 아니다.

확정 거절, 실행 성공, 결과 불명, 입력 수정은 각 명령의 키 해제·보존 규칙을 따른다. 응답이 없다는 이유로 돈·역할 변경을 새 키로 반복하지 않는다. 영속 기록이 필요한 명령에서 저장 실패는 실행을 막는 조건이며 UI 재시도 문구가 서버 중복 방지 계약을 대신하지 않는다.

## 상태 정책의 수용 기준과 검증 근거

- **대상 분리:** 신청·참석·결제·송금·반환·분쟁·알림을 같은 상태로 합치지 않는다.
- **종료 경계:** 모집 마감·실제 만남 종료·양쪽 확인·보관금 해제·완료 사실을 구분한다.
- **후속 작업:** 취소·기한 만료·삭제 예약·분쟁 닫힘을 돈 반환·물리 삭제·보상 완료로 확대하지 않는다.
- **복구:** 결과 불명에서는 해당 키·의도 기록과 현재 결과를 확인하고 기능별 확정 거절 조건을 따른다.
- **증거:** 직접 읽은 상태 enum·비공개 선정/완료·앱 키 보관과 동일 SHA의 기능 정본을 근거로 한다. 이번 제품 시험·실제 기기·운영 설정·외부 송금·푸시는 실행하지 않았다.

## 과거 상태 조사 원문 보존

아래는 이전 날짜별 조사·상태 공백·시험 기록의 원문이다. 옛 상태값·미구현 판정·시험 통과를 현재 계약이나 이번 실행 근거로 합산하지 않는다. 현재 설명은 위 본문과 기능 정본을 따른다.

> ### 2.1 `APPROVED_PENDING_PAYMENT` 진입 조건 명문화 (W2)
>
> `ApplicationStatus.APPROVED_PENDING_PAYMENT`는 다음 두 진입점에서만 발생한다(F03-05 §2.0).
>
> | 진입점 | 조건 | 동작 |
> |---|---|---|
> | `ApplicationService.apply` | `EventPrepayment.prepaymentRequired=true` + `approvalRequired=false` (자동 승인 + 선입금 활성) | `Application.status=APPROVED_PENDING_PAYMENT + paymentDueAt=...`. attendance/currentCapacity는 없지만 pending party size를 용량 판정에 논리 hold. 알림 71 (after-commit) |
> | `ApplicationService.approveApplication` | `EventPrepayment.prepaymentRequired=true` + 호스트가 `PENDING` application을 승인 | 동일하게 `APPROVED_PENDING_PAYMENT + paymentDueAt` 전이. `ApplicationApprovedEvent` 미발행 — 캘린더 sync는 결제 확정 시점에 1회만 |
>
> 진입 후 허용 액션:
>
> | 액션 | 결과 상태 |
> |---|---|
> | 참가자 WALLET 결제 성공 | `APPROVED + ATTENDING + capacity++ + event_payment.PAID` |
> | 참가자 BANK_TRANSFER 신고 → 호스트 확인 | 동일 (분개 없음, D5) |
> | 참가자 자가 취소 (`DELETE .../apply`) | `event_payment` 상태별 분기(F03-05 §2.6), 종료 상태는 `Application=CANCELED` 또는 `REFUND_REQUESTED 진행` |
> | `paymentDueAt < now()` 스케줄러 트리거 | `Application=PAYMENT_EXPIRED`, capacity 변화 없음. 현재 PENDING `event_payment` 취소는 빠져 있음 |
> | 호스트 이벤트 취소 (`EventService.cancelEvent`) | facade가 결제 상태별 환불 진행 후 `Application=CANCELED` |
>
> `PAYMENT_EXPIRED` 재신청은 active `event_payment` 행이 없을 때만 허용. 있으면 `PAYMENT_PENDING` 에러.
>
> ### 2.2 `event_payment` 상태머신 (W2 신규)
>
> 선입금 결제는 별도 `event_payment` row로 추적된다. `purpose=INITIAL`의 active 결제만 application당 1건이고 `GUEST_INCREMENT`는 다건 허용이므로 전체 관계는 1:0..N이다. Application과 결제 상태를 함께 봐야 정확한 액션을 표시할 수 있다.
>
> ```mermaid
> stateDiagram-v2
>     [*] --> PENDING: payByWallet 진입 또는 bankDeclare
>     PENDING --> PAID: WALLET 결제 성공 또는 BANK bankConfirm
>     PENDING --> CANCELED: bankReject (호스트 거부) 또는 사용자 자가 취소(PENDING) 또는 paymentDueAt 만료
>     PAID --> REFUND_REQUESTED: 사용자 자가 취소(BANK PAID) 또는 호스트 이벤트 취소(BANK PAID) 또는 capacity_full_at_confirmation(BANK)
>     PAID --> REFUNDED: refundByWallet 성공 (WALLET) 또는 refundByHostCancel (WALLET)
>     REFUND_REQUESTED --> REFUNDED: refundByBankConfirm (호스트 수동)
>     REFUNDED --> [*]
>     CANCELED --> [*]
> ```
>
> | 상태 | 의미 | 분개 영향 | UI 라벨 |
> |---|---|---|---|
> | `PENDING` | 결제 시도 중 또는 BANK 입금 신고 후 호스트 확인 대기 | 분개 없음 | "결제 대기 중" / "입금 확인 대기 중" |
> | `PAID` | 결제 완료 | WALLET → `recordPayment` 분개 1건. BANK → 분개 없음(D5) | "결제 완료" — 액션바는 "참석 확정" |
> | `REFUND_REQUESTED` | 환불 진행 필요 (BANK 사용자 취소 또는 호스트 이벤트 취소 또는 capacity full) | WALLET 환불 시점에 분개. BANK는 분개 없음 | "환불 요청됨 — 호스트 처리 대기" |
> | `REFUNDED` | 환불 완료 | WALLET 환불 분개(`recordRefund`). BANK는 분개 없음 | "환불 완료" |
> | `CANCELED` | 결제 미진행 종료 (호스트 거부 / 사용자 취소 등) | 분개 없음 | "결제 취소됨 — 재시도 가능". 현재 payment 만료 자동 취소는 미구현 |
>
> 상태 전이는 다음 가드를 따른다:
>
> - `event` row 잠금 → `application` row 잠금 → `event_payment` row 잠금 순서(§0.4) 필수
> - `Event.status=OPEN`만 결제·BANK 확인 허용. `CANCELED`는 모든 결제 facade 차단. `CLOSED`는 BANK 거부만 허용(이벤트 종료 후에도 입금 미확인 가능).
> - `Application.status=APPROVED_PENDING_PAYMENT`만 결제 진입 허용.
> - `active_application_id` STORED + UNIQUE로 PENDING/PAID/REFUND_REQUESTED 동시 1건만 허용 (D6).
>
> 기획 주의점:
>
> - 사용자 화면에는 `Application.status` 단독이 아니라 `event_payment.status`와 결합한 라벨이 필요하다. 예: `Application=APPROVED_PENDING_PAYMENT` + `event_payment=PENDING(BANK_TRANSFER)`는 "입금 확인 대기"로, 같은 application에 결제 row가 없으면 "결제 필요"로 표시한다.
> - 현재 호스트 신청 관리 UI는 `community_app/lib/presentation/event/screens/application_list_screen.dart`의 **결제 대기** 탭(`Application.status=APPROVED_PENDING_PAYMENT`)까지 구현한다. 전용 호스트 결제대기 화면은 없고 카드가 `event_payment.method/status`를 받지 않으므로, `PENDING(BANK_TRANSFER)` 전용 표시·bank confirm/reject와 confirm 결과의 `REFUND_REQUESTED` 라벨 전환은 현재 UI에 없다.
> - `REFUNDED → [*]` 종료 후에는 `active_application_id`가 NULL이 되어 같은 application에 신규 PENDING 진입이 다시 가능하다. 단, `Application` 자체가 `CANCELED`로 전이된 경우는 신규 신청이 필요.
>
> ## 10. 이벤트 선입금·교통 상태머신 (2026-07-29 현재 소스)
>
> > 현재 `ApplicationStatus`, 결제/교통 enum, Service, DDL과 테스트를 기준으로 한다. 삭제된 event-extensions 계획의 예정 전이는 구현으로 간주하지 않는다.
>
> ### 10.1 Application 상태머신 — 결제와 Attendance 분리
>
> `ApplicationStatus`의 실제 7값은 `PENDING, APPROVED, APPROVED_PENDING_PAYMENT, PAYMENT_EXPIRED, REJECTED, CANCELED, CANCEL_PENDING_REFUND`다. `ATTENDING`은 Application 상태가 아니라 별도 `EventAttendance.status`다.
>
> ```mermaid
> stateDiagram-v2
>     [*] --> PENDING: 신청서 제출
>     PENDING --> REJECTED: 호스트 거절
>     PENDING --> APPROVED_PENDING_PAYMENT: 호스트 승인 + 선입금 필요
>     PENDING --> APPROVED: 호스트 승인 + 선입금 없음
>     APPROVED_PENDING_PAYMENT --> APPROVED: 결제 성공
>     APPROVED_PENDING_PAYMENT --> PAYMENT_EXPIRED: 결제 마감 만료
>     APPROVED_PENDING_PAYMENT --> CANCELED: 사용자 취소
>     APPROVED_PENDING_PAYMENT --> APPROVED_PENDING_PAYMENT: BANK 입금 거부 후 재신고
>     APPROVED --> CANCEL_PENDING_REFUND: BANK 결제 참가자가 취소
>     CANCEL_PENDING_REFUND --> CANCELED: 호스트가 BANK 환불 완료 표시
>     REJECTED --> PENDING: 재신청 (active event_payment 없을 때만)
>     PAYMENT_EXPIRED --> PENDING: 재신청
>     CANCELED --> PENDING: 재신청
> ```
>
> | 상태 | 의미 | 허용 액션 | 관련 event_payment 상태 |
> |---|---|---|---|
> | `APPROVED_PENDING_PAYMENT` | 승인 + 결제 대기 | 결제, 취소, 만료, BANK 재신고 | active payment가 없거나 BANK PENDING |
> | `PAYMENT_EXPIRED` | 결제 마감 시간 지남 | 재신청 | 현재 scheduler는 application만 bulk update하여 PENDING payment가 남을 수 있음 |
> | `APPROVED` | 결제 또는 무료 승인 완료 | 취소/환불, 참석 row 기반 체크인 | PAID일 수 있음 |
> | `CANCEL_PENDING_REFUND` | BANK 취소 후 외부 환불 확인 대기 | 호스트 환불 완료 표시 | REFUND_REQUESTED, capacity hold |
>
> 결제 성공 시 Application은 `APPROVED`가 되고 별도 `EventAttendance(ATTENDING)`가 생성된다. 현재 만료 bulk update는 payment 취소와 만료 event 발행을 하지 않아 orphan active payment 위험이 있다.
>
> ### 10.2 event_payment 상태머신
>
> `EventPaymentPurpose = INITIAL | GUEST_INCREMENT`다. `uk_event_payment_active`는 status가 `PENDING/PAID/REFUND_REQUESTED`인 **INITIAL**만 application당 1건으로 제한하며, 게스트 증분 결제는 다건을 허용한다.
>
> ```mermaid
> stateDiagram-v2
>     [*] --> PENDING: WALLET 결제 시작 또는 BANK 신고
>     PENDING --> PAID: WALLET 같은 트랜잭션 또는 BANK 호스트 확인
>     PENDING --> CANCELED: 사용자 취소 / 호스트 입금 거절
>     PAID --> REFUND_REQUESTED: 참가 취소 또는 이벤트 취소 (환불 facade 진입)
>     REFUND_REQUESTED --> REFUNDED: 환불 완료
> ```
>
> | 상태 | 의미 | application 영향 | 알림 |
> |---|---|---|---|
> | `PENDING` | WALLET 처리 중 또는 BANK 신고 대기 | APPROVED_PENDING_PAYMENT | 71은 application event, 72는 BANK 신고 event |
> | `PAID` | 결제 완료 | APPROVED + 별도 ATTENDING | BANK 확인은 73, WALLET은 기존 `PAYMENT_COMPLETED` |
> | `REFUND_REQUESTED` | 환불 진행 중 | BANK 사용자 취소면 CANCEL_PENDING_REFUND | 83은 최초 전이가 아니라 기본 3일 후 escalation |
> | `REFUNDED` | 환불 완료 | CANCELED 정리 가능 | 76 |
> | `CANCELED` | 결제 미진행 종료/입금 거부 | BANK reject에서는 APPROVED_PENDING_PAYMENT 유지 | 74 |
>
> **만료 Gap**: `ApplicationPaymentExpiryScheduler`는 application만 bulk update한다. PENDING payment를 CANCELED로 바꾸지 않고 `ApplicationPaymentExpiredEvent`도 발행하지 않아 75 listener는 dead wiring이다.
>
> **회계 분개**: WALLET 결제·환불만 ledger에 기록한다. BANK_TRANSFER는 확인·환불까지 전 과정이 off-ledger다.
>
> ### 10.3 2026-09-02 현재 — 통합 차량과 자리 상태
>
> 종전 `event_carpool_offer`와 `event_bus` 상태는 `event_vehicle` 하나로 교체됐다.
>
> ```mermaid
> stateDiagram-v2
>     [*] --> PENDING: 참석자가 승용차 제안
>     [*] --> CONFIRMED: 호스트가 대절 버스 등록 또는 참석자가 자차 등록
>     PENDING --> CONFIRMED: 호스트 승인
>     PENDING --> REJECTED: 호스트 거절
>     PENDING --> CANCELLED: 차량 주인 또는 호스트 취소
>     CONFIRMED --> CANCELLED: 차량 주인 또는 호스트 취소
> ```
>
> | 차량 종류 | 처음 상태 | 주인 | 종착 처리 |
> | --- | --- | --- | --- |
> | `BUS` | `CONFIRMED` | 없음. 호스트가 운영 | 자리 전부 해제 후 `CANCELLED` |
> | `CAR` | `PENDING` | 제안한 참석자 | 승인 시 `CONFIRMED`; 거절·취소 시 자리를 비우고 주인을 자차로 복귀 |
> | `SELF` | `CONFIRMED` | 등록한 참석자 | 본인 자리 1개·0원. 종료 시 복귀 없이 `CANCELLED` |
>
> 자리 지정 여부 `DESIGNATED/UNDESIGNATED`와 배정 주체 `HOST_ASSIGNS/SELF_CLAIMS`는 독립이다.
> 비지정 차량도 정원만큼 자리 행을 만들어 실제 탑승자를 센다. 자리 배정·이동·반납은 모임 행 잠금,
> 자리 버전, 모임 안 사용자 한 자리 유일 제약으로 보호한다. 이동 중 충돌하면 기존 자리 해제까지 같은
> 처리에서 되돌린다.
>
> 모임 이동 설정은 사용 여부, 자리 반납 허용, 자차 허용을 따로 저장한다. 살아 있는 차량이 있으면
> 사용 중지할 수 없다. 신규 차량·자리 점유는 `TRANSPORT` 출시 범위가 열려야 하지만 운행 취소·자차
> 종료·강제 취소·이동 조율 이탈·자리 반납·신고는 봉인 중에도 가능한 안전 출구다.
>
> ### 10.4 2026-07-29 이력 — event_carpool_offer 상태
>
> > 아래 종전 카풀·교통 모드·버스 상태와 공백은 통합 전 소스의 이력이다. 현재 제품 판단에는 바로 위
> > 통합 차량 상태와 F03-14~17 기능 PRD를 사용한다.
>
> 운전자가 등록하는 카풀 offer 라이프사이클.
>
> ```mermaid
> stateDiagram-v2
>     [*] --> OFFERED: 운전자가 offer 등록
>     OFFERED --> CONFIRMED: 호스트 confirm
>     OFFERED --> REJECTED: 호스트 reject
>     OFFERED --> CANCELED: enum 값은 존재하나 public 전이 API 없음
> ```
>
> | 상태 | 의미 | 탑승자 배정 가능 여부 | 알림 |
> |---|---|---|---|
> | `OFFERED` | 호스트 검토 전 | 불가 | (없음) |
> | `CONFIRMED` | 호스트 확정 — 배정 대상 | 가능 | 77 enum만 있고 생산 알림 없음 |
> | `REJECTED` | 호스트 거절 | 불가 | 78 enum만 있고 생산 알림 없음 |
> | `CANCELED` | enum 값 | 불가 | public cancel/cascade 구현 없음 |
>
> 현재 decision 서비스는 입력을 CONFIRMED/REJECTED로 제한하지만 기존 status를 검사하지 않아 재결정할 수 있다. offer 취소, 참석 이탈 cascade, 탑승자 자동 해제, 77~80 알림, `event_carpool_assignment_log` insert는 구현되어 있지 않다.
>
> ### 10.5 2026-07-29 이력 — event_transport_config.mode 전이 정책 ([F03-14](../02_feature_prds/03_event/F03-14_event-transport-mode_prd.md))
>
> ```mermaid
> stateDiagram-v2
>     [*] --> NONE: row 미생성 시 기본값
>     NONE --> CARPOOL: DRAFT only
>     NONE --> BUS: DRAFT only
>     CARPOOL --> NONE: DRAFT only, carpool 데이터 hard delete
>     CARPOOL --> BUS: DRAFT only, carpool 데이터 hard delete
>     BUS --> NONE: DRAFT only, bus 데이터 hard delete
>     BUS --> CARPOOL: DRAFT only, bus 데이터 hard delete
> ```
>
> | 현재 이벤트 상태 | 허용 mode 전이 | 비고 |
> |---|---|---|
> | DRAFT (`published_at IS NULL`) | NONE ↔ CARPOOL ↔ BUS | 이전 mode의 carpool/bus 데이터를 **hard delete** (`EventTransportService.changeMode`). 알림·감사 없음 |
> | OPEN | **mode immutable** | mode 변경 시 `INVALID_EVENT_STATUS`. `allowsSelfTransport` 단독 변경은 허용 |
> | CLOSED/CANCELED/HIDDEN | mode 변경 금지 | 그러나 현재 서비스는 `allowsSelfTransport` 단독 변경을 허용하는 Gap이 있음 |
>
> **D2 — 택일 원칙**: CARPOOL과 BUS 동시 운영 불가. 한 이벤트는 한 mode만.
>
> 버스의 `allowSelfSwap`·`assignmentMode`를 수정하는 endpoint는 없다. mode 내부 카풀·버스 write는 각 서비스의 개별 상태 검사를 따르며, 일관된 OPEN gate가 있는 것은 아니다.
>
> ### 10.6 2026-07-29 이력 — event_bus 좌석 점유 모델 ([F03-16](../02_feature_prds/03_event/F03-16_event-bus-charter_prd.md))
>
> `event_bus.assignment_mode` 3종에 따라 좌석 점유 상태머신이 분기.
>
> | assignment_mode | 좌석 row 생성 | 좌석 배정 권한 | `allow_self_swap=true` 효과 | 비고 |
> |---|---|---|---|---|
> | `FREE` | **미생성** | target seat가 없어 PUT 사용 불가 | 무효 | GET seats 빈 배열 |
> | `FIXED_BY_HOST` | selectable seat prepopulate | Host/CoHost, 또는 `allowSelfSwap=true` self | target user 덮어쓰기 | service는 assignmentMode를 검사하지 않음 |
> | `FIRST_COME` | selectable seat prepopulate | FIXED_BY_HOST와 같은 PUT | target user 덮어쓰기 | 이름과 달리 자동 배정·SKIP LOCKED 없음 |
>
> 좌석별 `event_bus_seat`의 점유 상태머신:
>
> ```mermaid
> stateDiagram-v2
>     [*] --> EMPTY: 좌석 prepopulate (user_id=NULL)
>     EMPTY --> ASSIGNED: PUT seats/{seatNo}?userId= 성공
>     ASSIGNED --> ASSIGNED: target seat userId 덮어쓰기
> ```
>
> **실제 동시성/제약**:
>
> - add/assign은 event row를 잠가 같은 이벤트 write를 직렬화한다. seat row 전용 `FOR UPDATE`와 `SKIP LOCKED`는 없다.
> - `UNIQUE(event_id, user_id)`가 중복을 막지만 위반은 `USER_ALREADY_SEATED_IN_EVENT`가 아닌 일반 `INVALID_REQUEST`로 변환된다.
> - `userId`는 primitive long이라 null unassign이 불가능하고, 기존 사용자 좌석을 먼저 비우지 않아 좌석 이동이 unique 위반이 될 수 있다.
> - self 요청은 참석/대기 자격, assignmentMode, `lockedByHost`를 검사하지 않는다.
> - 좌석 변경 log는 기록하지만 81~82 생산 알림은 없다.
>
> ### 10.7 2026-07-29 당시 상태 공백 — 현재 판단에 사용하지 않음
>
> - 만료 application과 PENDING payment를 같은 트랜잭션에서 정리하고 75 event를 발행해야 한다.
> - 카풀 decision 선행상태, cancel/cascade, assignment log, 77~80 알림이 없다. register는 assignedOfferId를 정리하지 않고 assign과 경합하면 lost update 가능하다.
> - `allowsSelfTransport` terminal-state 변경이 가능하고 SELF/DRIVER 선택에 소비되지 않는 inert flag다.
> - carpool decide/register/assign/report와 bus add/assign은 event status 가드가 없어 CLOSED/CANCELED에서도 mutation할 수 있다.
> - 버스 FIRST_COME 자동 배정, 진짜 swap/unassign, locked seat·참석 자격 검사, 81~82 알림이 없다.
> - Flutter에는 transport/bus 운영 화면이 없고 카풀 신고 route도 인앱 navigation caller가 없다.
>
> ## 11. 2026-06-05 신규 상태기계 (v5.0 delta)
>
> > 본 섹션은 2026-06-05 기준 추가된 상태기계를 정책 차원에서 요약한다. 전체 enum 전이도와 원천 도메인 매핑은 `08_state_transitions.md §10~16`을 참조한다.
>
> ### 11.1 ApplicationStatus — 전체 7값으로 갱신
>
> 기존 §2에서 `APPROVED_PENDING_PAYMENT`, `PAYMENT_EXPIRED`는 "현재 서버 enum에 없다"고 기술했으나 실제로 구현 완료됨. 추가로 `CANCEL_PENDING_REFUND`가 정식 추가됨.
>
> 전체 7값: `PENDING, APPROVED, APPROVED_PENDING_PAYMENT, PAYMENT_EXPIRED, REJECTED, CANCELED, CANCEL_PENDING_REFUND`.
>
> 정책 포인트:
> - `CANCEL_PENDING_REFUND`는 정원을 hold하고 노쇼 통계에서 제외된다 (`CheckInService.pendingRefundUserIds` 필터).
> - 거절(REJECTED) 시 `ApplicationRejectReasonCode`(7종) 필수 지정. 미지정 시 400.
> - 승인 경로의 `CapacityService.createAttendanceFromApplication`에서 `EventApplyRestrictionGuard` 재검사 실행.
>
> ### 11.2 NoShowStatus — 신규
>
> `CONFIRMED → APPEALED → OVERTURNED` 전이. 상세는 `08_state_transitions.md §11`.
>
> 정책 포인트:
> - OVERTURNED 상태에서 제재 카운트에서 제외 (`countRecentNoShows` CONFIRMED+APPEALED 합산, OVERTURNED 제외).
> - appeal 기한 미구현(v1 Gap). 무기한 소명 가능.
> - `cohost.canManageAttendance` flag 미체크 Gap 존재 (노쇼 확정/뒤집기 권한 불일치).
>
> ### 11.3 UnifiedDisputeStatus — 신규
>
> `OPEN, IN_REVIEW, RESOLVED, CLOSED, ESCALATED` 5값. legal hold: OPEN/IN_REVIEW/ESCALATED 상태에서 evidence 삭제 차단, 파일 정리는 RESOLVED/CLOSED 후 1년. 원천 도메인 매핑 전체는 `08_state_transitions.md §12`.
>
> 정책 포인트:
> - admin API가 USER_DISPUTE 전이를 소유한다. 공개 API는 생성(POST /me/dispute-cases)과 이의(POST /me/.../appeals)만 노출.
> - DisputeCaseRetentionScheduler(매일 05:00): terminal 상태 1년 후 evidence S3+metadata 정리.
> - DisputeSlaExceededScheduler(매일 06:00): 7일 초과 OPEN/IN_REVIEW/ESCALATED 케이스에 HIGH severity 운영알림.
>
> ### 11.4 DisputeAppealStatus — 신규
>
> `PENDING → UPHELD / REJECTED / CLOSED` 4값. PENDING만 본인 철회 가능. admin 인용/기각은 공개 endpoint 없음(Gap). 상세는 `08_state_transitions.md §13`.
>
> ### 11.5 RescheduleResponseStatus — 신규
>
> `PENDING, ACCEPTED, DECLINED, AUTO_ACCEPTED, WITHDRAWN` 5값. DECLINED 시 `RefundFaultCategory.RESCHEDULE_DECLINED`(100% 환불) 자동 취소 트리거. 상세는 `08_state_transitions.md §14`.
>
> ### 11.6 TransferStatus — 전체 8값으로 갱신
>
> 기존 6값에 `BANK_AWAITING_CONFIRM`, `SUPERSEDED` 추가. limbo 상태(BANK_AWAITING_CONFIRM/PENDING_MANUAL_REFUND) 자동 만료 금지. 상세는 `08_state_transitions.md §15`.
>
> ### 11.7 DateBlockStatus — 신규
>
> `BLOCKED, UNBLOCKED` 2값. hard delete → soft transition으로 이력 보존. 안전신고 연동 및 legal hold. 상세는 `08_state_transitions.md §16`.
