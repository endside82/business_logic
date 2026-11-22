# F18-02. 사용자 분쟁 접수·출처 연결·초안 복구 PRD

<!-- release-document: reference -->
2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험·브라우저·실기기 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 입구

내 분쟁 목록의 접수 버튼은 맥락 없는 사용자 사건을 작성한다. 이벤트 결제 화면은 EVENT_PAYMENT와 실제 payment.id를 넘기고, 라우트 도우미는 PRIVATE_MEETING·SERVICE_ASSIGNMENT의 출처 ID 및 일정 변경 이의의 eventId를 지원한다. 출처 ID와 이벤트 ID를 같은 숫자로 추정하지 않는다.

생성 화면은 caseType, summary, 선택 증빙을 입력한다. 일정 변경 이의는 HOST_ACTION_REVIEW로 고정하고 사유 선택도 요구한다. 서버의 sourceType은 원천 참조, caseType은 접수 유형이다. 유형에서 NO_SHOW_APPEAL이나 APPEAL을 골랐다는 이유로 기존 처분의 통합 이의 절차가 자동 실행되는 것은 아니다. 기존 사건 이의는 [분쟁 이의 접수·철회](F18-03_dispute-appeal_prd.md)를 따른다.

## 현재 서버 계약

| 요청 | 본문 | 결과 |
|---|---|---|
| POST /api/v1/me/dispute-cases | DisputeCaseCreateParam | 201 DisputeCaseDetailVo |

본문 필드는 caseType, sourceType, sourceId, eventId, clubId, targetUserId, reasonCode, summary, evidenceFileIds다. 요청키 헤더는 선언돼 있지 않다. 사건 생성 외에도 종결 동의·결과 확인·운영자 이관·대화 등의 별도 명령이 있으므로 이것을 분쟁 전체의 유일한 쓰기 API라고 설명하지 않는다.

caseType 값은 REPORT, APPEAL, REFUND_ISSUE, NO_SHOW_APPEAL, CONTENT_MODERATION, SAFETY, SETTLEMENT, TRANSPORT, HOST_ACTION_REVIEW다. 모든 유형이 별도 원천 테이블을 새로 만드는 것은 아니다. 이 API는 UserDisputeCase를 저장하고 등록부의 당사자·사건에 연결한다.

## 입력과 출처별 권한

caseType과 공백이 아닌 summary가 필요하다. 서버 summary 길이는 요청 문자열 기준 10~2000자, reasonCode는 선택 최대 40자다. 앱은 summary를 trim한 뒤 길이를 검사하고 전송한다. 증빙은 최대 5개이며 공통 EvidenceFileValidator가 본인 소유·완료 상태·허용 용도와 양수 ID·중복을 검사/정규화한다. 별도 책임 동의 체크박스는 이 생성 요청의 필드가 아니다.

sourceType을 보내지 않으면 sourceId도 없어야 한다. 참조 출처로 허용하는 값은 SERVICE_ASSIGNMENT, EVENT_PAYMENT, PRIVATE_MEETING 세 가지다. 노쇼·클럽·콘텐츠 처분의 플랫폼 접수 차단 가드도 검사하며 다른 sourceType을 임의로 참조하는 계약은 없다.

| 출처 | 권한·상대·문맥 처리 |
|---|---|
| 일반 사용자 사건 | 자기 자신을 상대로 지정하면 INVALID_REQUEST, 없는 상대는 USER_NOT_FOUND. eventId/clubId가 있으면 접수자의 관련성을 확인한다. |
| HOST_ACTION_REVIEW + eventId + sourceType 없음 | 요청 targetUserId 대신 해당 이벤트 호스트를 서버가 산출한다. 본인이 호스트이면 거절한다. |
| SERVICE_ASSIGNMENT | sourceId 필수, resolver의 열람 권한 검사 후 상대·이벤트·클럽 문맥을 산출한다. 권한 없음은 FORBIDDEN이다. |
| EVENT_PAYMENT | 실제 결제 sourceId 필수, resolver의 열람 권한 검사 후 상대와 문맥을 산출한다. 권한 없음은 NOT_FOUND다. |
| PRIVATE_MEETING | sourceId 필수, private meeting 당사자 resolver가 권한과 상대·문맥을 산출한다. 권한 없음은 NOT_FOUND다. |

참조 출처 분기에서는 클라이언트가 보낸 targetUserId·eventId·clubId를 그대로 신뢰하지 않고 서버가 구한 문맥을 저장한다. SERVICE_ASSIGNMENT/EVENT_PAYMENT의 상대가 접수자와 같으면 null로 정규화한다.

## 접수 제한과 중복

서비스가 접수자 기준 최근 24시간 생성 수를 세어 10건 이상이면 TOO_MANY_REQUESTS로 거절한다. ‘주석에만 있고 구현 여부 미확인’은 현재 사실이 아니다. 이 검사는 조회 기반이므로 이 문서가 동시 다중 요청의 엄밀한 10건 원자성까지 입증한 것은 아니다.

활성 상태는 OPEN·IN_REVIEW·ESCALATED다. 일반 사건은 같은 접수자와 상대의 활성 사건을 막고, 이 중복 기준은 eventId별로 분리되지 않는다. SERVICE_ASSIGNMENT는 동일 배정의 활성 사건, EVENT_PAYMENT는 동일 결제의 활성 사건을 별도로 막는다. DB의 생성 열과 UNIQUE 제약도 같은 배정·결제의 중복을 방어하며 저장 충돌을 도메인 오류로 변환한다. 기존 사건이 없는 무상대 접수를 요청키 재생처럼 처리하지 않는다.

## 저장 결과와 배정 사건

일반 사건은 OPEN으로 저장하고 USER_DISPUTE:{userDisputeCaseId} 등록부에 접수자와 상대를 연결한다. 배정 사건은 서비스 배정을 분쟁 상태로 바꾸고 관련 당사자를 잠근 뒤 저장한다. 등록부에는 HOST·PROVIDER·REPORTER 역할을 연결하고 응답 caseId는 SERVICE_ASSIGNMENT:{assignmentId}다. 따라서 모든 생성 결과가 USER_DISPUTE prefix라는 기존 설명은 틀리다.

증빙 파일 참조를 저장하고 actor visibility 필터를 적용한 상세 응답을 반환한다. 접수 성공은 운영자의 결정·보상·처분 변경까지 끝났다는 뜻이 아니다. 앱은 서버가 반환한 created.caseId로 내 분쟁 상세를 열며 로컬에서 접수 ID를 조립하지 않는다.

## 앱 문맥 전달과 초안

생성 라우트는 eventId, sourceType, sourceId, 일정 변경 purpose를 실제 화면에 전달한다. 화면은 복원 뒤 setContext를 호출하고 provider가 이 값을 요청에 넣는다. 반면 현재 라우트 builder는 targetUserId/clubId query를 화면에 전달하지 않는다. 모델과 위젯 인자가 존재한다는 사실만으로 해당 외부 진입이 제공된다고 설명하지 않는다.

초안은 계정과 대상·이벤트·클럽·출처·일정 변경 목적을 구분하는 문서 키로 보관한다. 유형·본문·사유·증빙 ID를 복원하고 업로드 중에는 제출을 막는다. 전송 전에 pending을 저장하며 기록 저장 실패 시 전송하지 않는다. 명확한 서버 거절이면 pending을 해제하고 입력을 유지한다. 커밋됐을 수 있는 실패는 pending 기록을 유지해 자동 재제출을 막고 내 분쟁 목록에서 결과를 확인하도록 한다.

성공 뒤 완료 기록을 저장·정리한 후 상세로 이동한다. 계정 세션이 종료되면 이전 화면의 제출 결과를 새 계정 화면에 반영하지 않는다. 이 로컬 초안은 서버 Idempotency-Key나 정확히 한 번 생성 보장과 다르다. 성공 또는 결과 불명확 시 분쟁 조회 갱신 신호를 보낸다.

## 코드 위치

<!-- source-references:start -->
서버 창구: `DisputeCaseController#createMyDispute`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 라우트 builder는 targetUserId·clubId query를 전달하지 않는다. | 모델 필드·위젯 인자·실제 입구를 구분한다. |
| Risk | 생성 API에 요청키 계약이 없다. | 초안의 미확정 보관과 서버 중복 방어를 구분한다. |
| Risk | 24시간 제한은 조회 뒤 저장 경로다. | 동시성 시험 없이 엄밀한 원자 제한을 주장하지 않는다. |
| 미검증 | 초안 복구·파일 업로드·동시 접수·운영 처리 결과를 실행하지 않았다. | 소스 대조와 실제 접수 성공을 나눈다. |

## 수용 기준과 검증 근거

- **AC-01 요청 필드:** 유형·본문·선택 사유·증빙과 참조 출처 필드를 정확히 구분한다.
- **AC-02 문맥 권한:** 일반 관련성, 이벤트 호스트 산출, 세 참조 출처 resolver의 권한과 문맥을 적용한다.
- **AC-03 접수 제한:** 최근 24시간 10건의 실제 서비스 검사와 원자성 확인 범위를 구분한다.
- **AC-04 중복 기준:** 접수자/상대 및 배정/결제별 활성 중복을 설명한다.
- **AC-05 사건 식별자:** 일반 USER_DISPUTE와 배정 SERVICE_ASSIGNMENT 응답을 나눈다.
- **AC-06 실제 입구:** 라우트가 전달하는 문맥과 전달하지 않는 인자를 구분한다.
- **AC-07 미확정 보관:** 전송 전 pending 저장·명확한 거절·불명확 결과·완료 정리를 연결한다.
- **AC-08 결과 복귀:** 반환 caseId로 상세 이동하고 계정 경계·분쟁 조회 갱신을 적용한다.

근거는 현재 서버·앱 소스이며 새 제품 시험 통과 기록은 없다.
