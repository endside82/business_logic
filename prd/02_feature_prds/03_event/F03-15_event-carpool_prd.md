# F03-15. 카풀 지원·개별 이동 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다. 2026-11-22 소스 대조이며 새 제품 시험·실제 앱 이용 결과가 아니다. 이 기능은 별도 units 문서 없이 실제 소스를 기준으로 관리한다.

## 결론

현재 카풀은 **차량 지원 신청과 현재 탑승 배정을 분리**한다. 지원·수정·철회·거절로 기존 배정을 바꾸지 않고, 승인될 때 확정 차량과 운전자 자리를 만든다. 운행을 취소하면 모임에 남는 운전자와 승객을 다시 배정할 대상으로 남기며 자차로 자동 복귀시키지 않는다.

‘개별 이동’은 현재 이동 의사를 저장하는 기능이다. 예전처럼 새 SELF 차량·한 자리·0원 결제를 만드는 흐름으로 설명하지 않는다. 기존 SELF 차량은 과거 기록과 정리 조건에서 여전히 다루므로 데이터에서 삭제됐다는 뜻도 아니다.

## 코드 위치

서버: VehicleOfferController·VehicleOfferService·EventVehicleOffer·EventVehicleOfferVo·VehicleOfferParam·VehicleOfferStatus, TransportPreferencesService#intent, TransportReplacementService, TransportLifecycleController·TransportLifecycleService, TransportReallocationService, TransportRosterService, EventActionPolicy, TransportCommandInputCheck, EventVehicleReportController·EventVehicleReportService.

앱: TransportCoordinationScreen, TransportVehicleOfferForm·TransportIntentForm·TransportConfirmationForm, TransportAssignmentForm의 교체 분기, TransportLiabilityNotice, transport_coordination_provider.dart·transport_coordination_api.dart·transport_coordination_param.dart. 공통 재시도와 개정 처리는 [이동수단 공통 설정의 충돌과 응답 유실 복구](F03-14_event-transport-mode_prd.md#충돌과-응답-유실-복구)를 따른다.

<!-- source-references:start -->
서버 창구: `VehicleOfferController#list`, `VehicleOfferController#create`, `VehicleOfferController#update`, `VehicleOfferController#withdraw`, `VehicleOfferController#decide`, `TransportCoordinationController#intent`, `TransportLifecycleController#cancel`, `TransportLifecycleController#leave`, `TransportCoordinationController#replace`, `EventVehicleReportController#reportVehicle`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 차량 지원과 현재 배정

| 행동 | 조건 | 현재 배정에 미치는 영향 |
| --- | --- | --- |
| 새 지원·내용 수정 | 상세 열람 가능, 호스트·활성 공동호스트 또는 실제 참석 회원, 모임 OPEN·조율 사용, 이동 조율 LEFT 아님 | 지원 행만 저장. 지금 타는 차량·개별 이동 유지 |
| 새 지원 중복 검사 | 본인의 PENDING 지원 없음, 확정된 본인 CAR 없음. 남은 구형 PENDING 차량은 기존 자료 확인 필요 | 두 번째 지원을 임의 생성하지 않음 |
| 지원 수정 | 본인 PENDING 지원이며 정리되지 않은 구형 연결 자료가 아님 | 같은 지원 내용만 변경 |
| 본인 지원 철회 | 본인 PENDING 지원 | WITHDRAWN으로 바꾸고 현재 배정 유지 |
| 호스트·활성 공동호스트의 거절 | PENDING 지원, 공백이 아닌 사유 필수 | REJECTED로 바꾸고 현재 배정 유지 |
| 호스트·활성 공동호스트의 승인 | OPEN·조율 사용, 지원자의 현재 자격·LEFT·기존 소유 차량·구형 기록을 재검사 | 당시의 실제 배정을 해제하고 새 확정 차량의 운전자로 전환 |

상태는 PENDING·APPROVED·REJECTED·WITHDRAWN·PARTICIPATION_ENDED다. 승인된 지원의 기록과 실제 차량의 현재 운행 상태를 구분한다. 승인된 지원을 다시 철회해서 운행 취소를 대신하지 않는다.

지원 조회는 호스트·활성 공동호스트에게 전체, 일반 참가자에게 본인 지원만 반환한다. 앱의 관리자 확인 목록은 PENDING 지원을 중심으로 표시하고, 본인 목록은 처리 결과와 사유도 보여 준다. 정리되지 않은 구형 지원에는 원래 배정 기록 확인 안내를 표시하고 일반 수정·결정 버튼을 열지 않는다.

## 동승 정원·비용·승인 결과

지원 입력은 passengerCapacity 1~99, 선택적인 함께 이동할 경로 pickupLocations와 안내 notes 각 500자 이내, 선택적인 settlementAmount 0~10억 원이다. 정원은 **운전자를 제외한 동승 인원**이다. 예를 들어 3명이면 운전자 1명과 동승자 3명이다. null 비용은 미정, 0은 무료로 구분하며 비용 안내 자체가 자동 분담·결제를 실행하지 않는다.

승인 시 CAR·CONFIRMED·UNDESIGNATED·allocationVersion 2 차량을 만들고 별도의 운전자 자리 D와 동승 정원만큼 빈 내부 자리를 만든다. 현재 생성 기본 claimPolicy는 SELF_CLAIMS이며 allowSelfSwap은 false다. 차량별 자리 채우기 정책과 개정·배정 조건은 별도로 적용한다. 내부 순번을 실제 차량의 물리 좌석 번호로 설명하지 않는다.

지원자가 이미 승객이었다면 **승인 시점의 최신 자리**를 먼저 비운다. 기존 SELF에 본인 외 다른 사람이 있거나 기존 자리·차량이 유효하지 않으면 조정이 필요한 구형 자료 오류를 낸다. 정상적인 기존 SELF는 취소 상태로 남기고 이력을 보존한다. 새 운전자 생성과 이전 자리 해제는 같은 트랜잭션에 속한다. 지원 시점의 오래된 배정을 나중에 복원하지 않는다.

## 내 이동 의사와 개인 승차 장소

현재 앱의 ‘내 이동 방법·승차 장소’에서 NEEDS_ASSIGNMENT 또는 INDIVIDUAL과 선택적인 boardingLocation 200자 이내를 보낸다. LEFT는 이 입력으로 저장할 수 없으며 별도 이동 조율 종료를 사용한다.

OPEN·조율 사용과 현재 대상 자격을 검사한다. 새 개별 이동은 정책에서 허용해야 한다. 이미 개별 이동이거나 기존 SELF에 있는 사용자의 유지에는 예외가 있다. CAR·BUS에 배정된 사용자는 이 창구에서 개별 이동으로 바꿀 수 없으며 조정 요청이 필요하다. 앱도 이미 공동 차량에 배정된 경우 승차 장소만 수정하도록 안내한다. 기존 SELF에서 다른 의사로 바꾸려면 남아 있는 차량 정리가 먼저 필요하다.

개인 승차 장소는 본인·호스트/활성 공동호스트, 그리고 신원 열람이 허용된 현재 CAR의 운전자에게 공개한다. 차량 지원의 공용 경로·안내와 개인 승차 장소는 다른 필드다. 다른 참가자에게 전체 개인 장소를 공개한다고 설명하지 않는다.

## 운행 취소·다시 배정·지원 차량 교체

차량 주인은 자기 차량을 취소할 수 있고, 다른 사람의 차량 취소는 호스트·활성 공동호스트와 사유가 필요하다. 앱 취소 폼은 주인에게도 사유 입력을 요구하므로 서버 최소 조건보다 엄격하다. 취소와 지원 철회는 조율 사용·OPEN 조건을 다시 요구하는 신규 승인과 구분되며, 서버에서 출시 범위의 안전 출구로 표시돼 있다. 요청 번호·개정·현재 행위자 검사는 그대로 적용된다.

확정 차량 취소 시 기존 자리를 비우고 차량을 CANCELLED로 남긴다. 현재 자격을 유지하며 모임에 남는 운전자·승객은 NEEDS_ASSIGNMENT로 바뀌고, 원래 차량·자리·운전자 여부를 가진 재배정 기록에 포함된다. 모임이 끝난 상태의 기록은 미해결 보관 상태로 남긴다. 운전자를 새 SELF 차량이나 개별 이동으로 자동 전환하지 않는다.

‘지원 차량으로 교체’는 주최자가 확정된 기존 공동 차량과 다른 사람의 PENDING 지원을 선택해 한 번에 조정하는 명령이다. OPEN·조율 사용이어야 하고, 새 지원자의 현재 자격과 구형 자료 정리 여부를 검사한다. **전 운전자와 기존 승객 전원의 결과**를 포함해야 하며, 새 차량 동승자 수는 지원 정원을 넘을 수 없다. 기존 차량 취소·새 지원 승인·사람별 목적지 반영을 한 트랜잭션으로 처리한다. 일부만 옮긴 뒤 나머지를 누락한 교체를 허용하지 않는다.

앱 교체 폼도 현재 지원의 유효성, 전원 결과, 새 정원을 확인하고 replacementPassengerIds·assignments·vehicles·reason을 보낸다. 다른 차량 배정과 물리 좌석의 모든 세부 규칙은 이 문서의 대조 범위가 아니다.

## 이동 조율 종료와 모임 참가 종료

‘이동 조율 종료’는 모임 참가를 취소하지 않는다. 자신의 자리를 해제하고 대기 지원·조정 요청을 끝낸 뒤 LEFT로 남긴다. 살아 있는 본인 차량이 있으면 먼저 운행을 취소해야 한다. 현재 대상 자격 또는 기존 이동 참가 기록이 없는 사람의 직접 종료는 거절한다.

모임 참가 종료는 별도 연동이다. TransportLifecycleService.participationEnded는 지원을 PARTICIPATION_ENDED로 마감하고, 운전자 차량 또는 본인 자리와 관련 요청을 정리하며 떠나는 사람을 남은 사람의 재배정 대상에서 제외한다. 모든 모임 취소·추방·탈퇴 진입점과의 실행 왕복까지 이번 소스 대조로 통과 처리하지 않는다.

## 안전 안내와 차량 신고

차량 지원 폼은 면허·보험·차량 상태의 당사자 확인, 서비스의 이동 안전 보증 부재, 실제 귀책사유와 법령에 따른 책임 및 운영자 책임을 일괄 배제하지 않는 안내를 표시한다. 문구가 구현돼 있다는 사실을 법률 검토나 운전자 자격 확인 완료로 확대하지 않는다.

차량 신고 API는 실제 참석 회원인지 확인하고 해당 모임의 CAR와 소유자를 서버에서 확정한다. 본인 신고와 다른 모임 차량, 소유자가 없는 종류를 거절한다. 선택적인 expectedTargetUserId가 현재 소유자와 다르면 대상 변경 오류를 반환한다. 신고 성공은 HTTP 201·ReportVo이며 조율 명령 영수증과 다르다. 출시 범위에서는 안전 출구로 표시돼 있다. 운영자 화면 처리나 실제 기기의 신고 왕복은 이번에 실행하지 않았다.

## 현재 API와 실행 근거

지원 목록은 GET /api/v1/events/{eventId}/transport/offers에서 List<EventVehicleOfferVo>로 반환한다. 같은 경로의 POST와 /{offerId} PUT은 생성·수정, /{offerId}/withdraw와 /{offerId}/decision POST는 철회·결정이다. 앱은 조율 현황에 포함된 지원도 사용한다.

이동 의사는 PUT /transport/coordination/my-intent, 운행 취소는 POST /transport/vehicles/{vehicleId}/cancel, 이동 조율 종료는 POST /transport/leave, 교체는 POST /transport/coordination/vehicles/{vehicleId}/replacement이며 모두 /api/v1/events/{eventId} 아래에 있다. 이들 변경은 공통 requestId·expectedRevision과 TransportCommandVo를 사용한다. 차량 신고 창구는 POST /api/v1/events/{eventId}/vehicles/{vehicleId}/report다.

예전 문서의 ‘신규 이용 봉인’·‘승인 전 주인 자리 생성’·‘거절/취소 후 자차 복귀’는 2026-09-02 작성본의 설명이며 현재 판정으로 재사용하지 않는다. 현재 출시 근거와 실제 기기 확인 경계는 [이동수단 공통 설정의 출시 상태와 기존 기록의 해석](F03-14_event-transport-mode_prd.md#출시-상태와-기존-기록의-해석)을 따른다.

## 현재 제한과 확인 범위

| 구분 | 확인된 경계 | 영향 | 후속 판단 |
| --- | --- | --- | --- |
| Gap | 서버의 지원 거절은 신규 승인과 달리 OPEN·조율 사용 검사를 하지 않지만 앱 결정 버튼은 canEdit에서만 표시 | 조율 중단 후 서버의 정리 가능 범위와 화면 입구가 같지 않음 | API 허용을 앱 버튼 존재로 설명하지 않음 |
| Gap | 차량 주인의 서버 취소 사유는 선택, 앱은 사유 필수 | 같은 행위의 화면 요구 조건이 더 엄격함 | 직접 API와 화면 시나리오 조건 구분 |
| Risk | 구형 PENDING·SELF·유효하지 않은 배정 자료는 별도 정리 요구 | 정상 지원 승인처럼 자동 변환하면 원래 기록을 잃을 수 있음 | 현재 오류와 기존 자료 확인 경로 유지 |
| 미검증 | 선택한 소스·기존 시험 단언만 대조 | 전체 배정 알고리즘·모든 참가 종료 연동·실제 푸시·실제 계정 신고·책임 고지 승인 여부는 이번 실행 결과가 없음 | 해당 범위의 근거를 별도로 유지 |

## 수용 기준과 검증 근거

- **AC-01 지원과 배정 분리:** 이미 탑승 중이거나 개별 이동 중인 사용자가 지원·수정·철회·거절을 거쳐도 현재 배정은 바뀌지 않는다.
- **AC-02 지원 자격:** 호스트·활성 공동호스트·실제 참석과 OPEN·조율 사용·LEFT 아님을 검사하며 승인 신청만으로 허용하지 않는다.
- **AC-03 중복과 구형 기록:** 대기 지원 중복·확정된 본인 CAR를 거절하고 정리되지 않은 구형 PENDING 자료는 기존 기록 확인을 요구한다.
- **AC-04 입력 의미:** 동승 3명은 운전자 별도 1명과 승객 3명이며 비용 미정·0원을 구분한다. 1~99 정원과 문자열·금액 상한을 검사한다.
- **AC-05 승인 전후:** 승인 전에는 지원 행만 있고, 승인 때 현재 승객 자리를 해제한 후 확정 CAR의 운전자 자리와 빈 동승 자리를 만든다.
- **AC-06 거절·철회:** 거절은 주최자 권한과 사유, 철회는 본인 PENDING 지원을 요구하며 승인 이후 운행 취소와 혼동하지 않는다.
- **AC-07 지원 공개:** 주최자는 전체 지원을 조회하고 일반 참가자는 본인 지원만 조회한다. 앱 관리자 확인 목록과 본인 처리 결과를 구분한다.
- **AC-08 개별 이동:** 새 개별 이동은 정책 허용을 따르고 차량에 배정된 사람의 의사 변경은 조정 요청으로 안내한다. 새 SELF 차량을 생성한다고 설명하지 않는다.
- **AC-09 개인 장소:** 개인 승차 장소의 본인·주최자·현재 운전자 공개와 차량의 공용 경로를 구분한다.
- **AC-10 운행 취소:** 현재 운전자·승객의 자리를 정리하고 모임에 남는 사람을 다시 배정 대상으로 남기며 자차·개별 이동으로 자동 복귀시키지 않는다.
- **AC-11 교체 전체 결과:** 새 지원 정원과 현재 자격을 검사하고 전 운전자 포함 기존 승객 전원의 목적지를 포함해 한 번에 교체한다.
- **AC-12 두 종료 구분:** 이동 조율 종료는 모임 참가를 유지하며 살아 있는 본인 차량부터 정리한다. 모임 참가 종료 연동에서는 떠나는 사람을 재배정 대상에서 제외한다.
- **AC-13 요청 복구:** 같은 요청 재확인·다른 내용 재사용 거절·오래된 개정 충돌은 공통 조율 규칙을 따르고 저장 성공과 최신 현황 조회 성공을 구분한다.
- **AC-14 신고 대상:** 실제 참석·같은 모임 CAR·현재 소유자를 검사하며 본인 신고와 예상 대상 불일치를 거절한다.
- **AC-15 근거의 범위:** 책임 안내 표시·기존 시험 단언·소스 구현과 실제 기기/운영/법률 검토 결과를 구분한다.

검증 근거: VehicleOfferServiceTest의 생성·수정 때 배정 미변경, 비용 null 보존, 주최자가 배정을 바꾼 뒤 거절해도 최신 차량 유지, 철회 시 SELF 미생성, 승인 때 최신 승객 자리 해제와 운전자·동승 3자리 생성 단언을 읽었다. 새 시험 실행이나 이 수용 기준 전체의 자동 검증 통과가 아니다.
