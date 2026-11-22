# F18-03. 분쟁 이의 접수·공개 조건·철회 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

기존 사건의 당사자가 상세 또는 증거 화면에서 canSubmitAppeal에 따라 이의 작성 화면으로 이동한다. 별도 클럽 경고 이의, 모임 정산 이의, 구매 환불 분쟁과 통합 DisputeAppeal은 다른 계약이다. 기존 이의 사건에 통합 이의를 다시 만드는 것을 무조건 허용하지 않는다.

앱 라우트는 허용된 caseId인지 확인하고 서버 상세의 canSubmitAppeal을 조회한다. 권한이 없으면 사건 상세, 조회 실패면 내 분쟁 목록으로 보낸다. 따라서 직접 링크로 작성 화면을 열었다고 접수 가능 조건을 통과한 것은 아니다.

## 현재 서버 계약

| 요청 | 입력·결과 |
|---|---|
| GET /api/v1/me/dispute-cases/{caseId}/appeals | 본인이 낸 이의의 List<AppealVo> |
| POST /api/v1/me/dispute-cases/{caseId}/appeals | AppealCreateParam, 201 AppealVo |
| POST /api/v1/me/dispute-cases/{caseId}/appeals/{appealId}/withdraw | 본인의 PENDING 이의, 200 AppealVo |

AppealCreateParam은 reasonCode, reasonText, evidenceFileIds다. reasonCode는 공백 불가·최대 40자, reasonText는 공백 불가·20~1000자이며 증빙은 최대 5개다. reasonCode는 서버의 문자열 계약이고 앱은 선택 enum을 보낸다. 앱은 본문을 trim하고 책임 동의 체크를 추가로 요구하지만 그 동의 boolean을 서버 요청에 보내지는 않는다.

위 세 API에는 Idempotency-Key 헤더가 없다. 이의 저장의 `(case_id, appellant_user_id)` UNIQUE는 중복 행을 거절하는 조건이며 이전 성공 응답을 재생해 주는 계약이 아니다.

## 허용 출처와 플랫폼 개입 설정

| 출처 | 현재 판정 |
|---|---|
| USER_DISPUTE, SERVICE_ASSIGNMENT, PLATFORM_SANCTION | 허용 그래프에 포함하되 접근·기존 이의·사건 상태를 따로 검사 |
| EVENT_NO_SHOW | 허용 그래프에 있지만 노쇼 플랫폼 판단 기능이 켜져야 통합 접수 가능 |
| SANCTION, CLUB_MEMBERSHIP_ACTION | 클럽 플랫폼 감독 기능이 켜져야 통합 접수 가능 |
| PHOTO, EVENT_MESSAGE, COMMENT | 콘텐츠 처분 플랫폼 판단 기능이 켜져야 통합 접수 가능 |
| WARNING_APPEAL, SETTLEMENT_APPEAL, REFUND_DISPUTE | 두 번째 통합 이의를 금지하고 DISPUTE_APPEAL_NOT_ALLOWED_FOR_SOURCE 반환 |
| 그 밖의 prefix | INVALID_REQUEST |

세 플랫폼 기능의 기본값은 모두 false다. `community.no-show.platform-decision-enabled`, `community.club.platform-oversight-enabled`, `community.dispute.content-moderation-platform-decision-enabled`의 현재 배포값은 이번에 읽지 않았다. 허용 그래프에 이름이 있는 것과 지금 운영에서 접수 가능한 것은 다르다. 공개 권한 플래그 계산과 실제 POST 양쪽에 이 가드가 있다.

## 사건 접근·기한·저장

caseId는 등록된 prefix와 양수 long ID로 정규화한다. 대부분 출처에 접근 검사가 없다는 옛 설명과 달리 현재 requireCaseAccess는 DisputeCaseAccessAdapter의 등록부 당사자 또는 원천 resolver 열람 권한을 확인하고 실패를 NOT_FOUND로 처리한다.

등록부가 없는 과거 EVENT_NO_SHOW만 일반 접근 분기에서 예외로 넘기며, 곧바로 원천의 존재·본인·상태·소명 기한 검사를 저장 전에 수행한다. 노쇼의 canonical caseId가 원 요청과 다르면 INVALID_INPUT이다. 노쇼 기한은 원천의 확정 시각부터 7일 정책을 재사용하며 통합 플랫폼 기능이 비활성인 경우 기한 검사에 이르기 전 접수를 차단한다.

등록부 상태 CLOSED 또는 CLOSED_WITH_MANUAL_RECOVERY는 새 이의를 막는다. RESOLVED까지 일괄 차단하는 조건은 아니므로 단순한 ‘종결 표시=모든 이의 불가’로 해석하지 않는다. SERVICE_ASSIGNMENT는 현재 에피소드의 UserDisputeCase ID를 caseRowId에 결박한다. 증빙 검증 후 PENDING 행을 저장하며 중복 제약 충돌은 CONFLICT다.

등록부가 있으면 원천 보류를 설정하고 사건 당사자와 이의 제기자에게 절차 알림을 요청한다. 사용자 분쟁 알림이 전혀 없다는 과거 설명을 이 호출에 적용하지 않는다. 실제 알림 수신은 별도 검증 사항이다.

## 원천 상태 동기화의 경계

접수 직후의 원천 동기화 dispatcher는 EVENT_NO_SHOW만 처리한다. 별도 새 트랜잭션으로 원천 소명을 호출하고 여기서 발생한 RuntimeException은 기록 후 삼킨다. 따라서 저장 전 권한·기한 검사 실패는 이의를 만들지 않지만, 저장 후 원천 동기화 실패는 이의 응답만으로 원천 변경 완료를 보장하지 못한다.

다른 허용 prefix는 이 시점에 원천 상태를 같은 방식으로 직접 바꾸지 않는다. 그렇다고 아무 효과 없는 감사 기록만 남는 것은 아니다. 이의 행·증빙 참조·등록부 보류·알림은 별도 효과다. 운영자 결정·보상 단계의 원천 반영은 해당 운영 경로에서 판정한다.

## 상태·철회·본인 조회

| 이의 상태 | 해석 경계 |
|---|---|
| PENDING | 접수 대기, 본인 철회 가능 |
| DECIDED | 결정 기록 단계 |
| COMPENSATION_APPLIED | 보상 적용 단계 |
| UPHELD | 인용 결과 |
| RECOVERY_REQUIRED | 수동 수습 필요 |
| REJECTED | 기각 결과 |
| CLOSED | 철회 등 닫힘 |

isClosed()는 PENDING 이외를 true로 반환하지만 보상 완료·사건 종료를 의미하는 하나의 판정으로 사용하지 않는다. blocksCaseClosure()는 PENDING·DECIDED·COMPENSATION_APPLIED를 별도로 막고, 운영 결정 여부 판정도 따로 있다. 기존 4개 상태만으로 모델링하면 중간 결정·수습 상태를 잃는다. 현재 Dart AppealStatus도 7개 값을 가지며 ‘결정 확정 중’·‘보상 처리 중’·‘처리 지연(운영 확인 중)’으로 나눠 표시한다. 철회 버튼은 PENDING에만 나타난다.

철회는 본인 ID와 appealId로 잠근 행을 읽고 정규화한 caseId까지 일치하는지 확인한다. PENDING만 CLOSED로 바꾸고 처리자·시각·철회 메모를 기록한다. 보류 해제 helper는 같은 사건에 PENDING 또는 DECIDED 이의가 없는지 확인한다. 같은 철회를 다시 보내면 성공 재생이 아니라 상태 충돌이 될 수 있다.

본인 목록은 사건 전체의 다른 사람 이의를 공개하지 않고 현재 사용자 행만 반환한다. 배정 이의는 결박된 caseRowId가 현재 에피소드와 일치하는지도 확인한다. 권한 플래그는 기존 이의 행의 존재도 고려하므로 철회가 자동 재접수 권리를 만든다고 안내하지 않는다. 공개 상세에서 canResolveDispute는 최종 계산 시 false로 내려가며 공개 호스트용 이의 승인·기각 API는 현재 Controller에 없다.

## 앱 초안·동의·오류·복귀

앱은 사유 선택, 20~1000자 본문, 최대 5개 증빙, 책임 동의가 갖춰져야 제출한다. 파일 업로드 중에는 막는다. 초안은 계정·caseId별로 사유·본문·파일·동의를 보관한다. 전송 전 pending 저장, 명확한 거절 시 해제, 결과 불명확 시 기록 보존, 성공 뒤 완료 기록 정리를 적용한다. 이 초안은 서버 요청키 보장을 대신하지 않는다.

성공 뒤 분쟁 조회를 갱신하고 이전 화면으로 돌아간다. 금지된 두 번째 이의는 원래 화면을 사용하라는 안내, 노쇼 기한 초과는 마감 안내, 클럽 플랫폼 접수 차단은 상세 갱신과 이전 화면 복귀로 처리한다. 첨부 소유권·잘못된 파일·개수 초과도 별도 안내한다. 일반 CONFLICT 문구는 ‘이미 검토 중’이므로 실제로 철회된 기존 행이나 다른 상태 충돌일 수 있다는 서버 결과 경계를 유지한다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `DisputeCaseController#getMyAppeals`, `DisputeCaseController#createAppeal`, `DisputeCaseController#withdrawAppeal`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 저장 후 노쇼 원천 동기화 실패가 삼켜질 수 있다. | 접수 완료와 원천 상태 변경 완료를 나눈다. |
| Risk | isClosed·blocksCaseClosure·운영 결정 판정의 상태 집합이 다르다. | 중간 보상·수습 단계를 일반 종결과 합치지 않는다. |
| Gap | 앱 CONFLICT 안내가 이미 검토 중으로 고정돼 있다. | 실제 서버 충돌 사유를 그 문구로 단정하지 않는다. |
| 미검증 | 플랫폼 기능의 배포 설정·실제 이의 접수·보상·알림 수신을 실행하지 않았다. | 코드 허용과 운영 활성화·실행 증거를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 허용 출처:** 허용 그래프·두 번째 이의 금지·미지원 prefix를 나눈다.
- **AC-02 플랫폼 설정:** 노쇼·클럽·콘텐츠의 기본 비활성 가드를 표시와 명령에서 적용한다.
- **AC-03 사건 권한:** 등록부/원천 열람을 확인하고 과거 노쇼 예외에도 저장 전 본인·기한 검사를 적용한다.
- **AC-04 입력과 중복:** 서버 문자열 길이·증빙·caseId/사용자 중복 제약과 앱 책임 동의를 구분한다.
- **AC-05 원천 연결:** 저장 전 검사와 저장 후 새 트랜잭션 동기화 실패의 차이를 설명한다.
- **AC-06 상태 범위:** 7개 상태와 철회 가능·사건 종결 차단 판정을 구분한다.
- **AC-07 철회와 조회:** 본인 잠금·사건 일치·PENDING 조건·현재 배정 에피소드 조회를 적용한다.
- **AC-08 앱 복귀:** 계정별 초안·결과 불명확 보관·오류 분기·상세 갱신을 연결한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
