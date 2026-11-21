# F03-14. 이동수단 공통 설정 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다. 2026-11-22 소스 대조이며 새 제품 시험·실제 앱 이용 결과가 아니다. 이 기능은 별도 units 문서 없이 실제 소스를 기준으로 관리한다.

## 결론

호스트와 활성 공동호스트가 모임의 이동 조율 사용 여부, 개별 이동 허용, 배정 후 참가자 본인 변경 허용을 정한다. 현재 앱은 **이동 조율 API**로 설정을 저장한다. 옛 이동 설정 쓰기 API와 서비스에 남은 예전 규칙을 현재 동작으로 설명하지 않는다.

설정을 꺼도 기존 배정과 기록은 유지된다. 버스·카풀 등록, 배정 변경, 물리 좌석 지정의 상세 조건은 각각 해당 기능 문서에서 관리하며, 이 문서는 공통 정책과 조회·저장·복구의 경계를 다룬다.

## 코드 위치

서버: TransportCoordinationController#overview·policy, TransportPreferencesService#policy, TransportRosterService#overview, TransportCommandGate·TransportCommandInputCheck·TransportActorGuard, EventAuthorizationService, TransportPolicyParam·TransportMutationParam·TransportCommandVo·TransportOverviewVo, EventTransportConfig. 구형 창구: EventTransportController·EventTransportService.

앱: TransportCoordinationScreen·TransportCoordinationSettingsScreen, TransportPolicyForm·TransportEditorFrame, transport_coordination_provider.dart, transport_coordination_api.dart·transport_coordination_repository.dart, transport_coordination_param.dart·transport_coordination_vo.dart, event_host_routes.dart·event_permission_provider.dart.

<!-- source-references:start -->
서버 창구: `TransportCoordinationController#overview`, `TransportCoordinationController#policy`, `EventTransportController#getConfig`, `EventTransportController#updateConfig`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 실제 입구와 권한

모임 상세에서 이동 기능의 공개 범위와 화면 권한을 확인해 ‘함께 이동’ 및 관리용 ‘이동 설정’ 입구를 제공한다. 함께 이동 화면의 관리자 영역에서도 이동 설정을 연다. 설정 전용 경로는 TransportCoordinationSettingsScreen, 현황 경로는 TransportCoordinationScreen으로 연결된다. 과거 EventTransportSettingsScreen·EventTransportScreen을 현재 화면 이름으로 쓰지 않는다.

| 구분 | 현재 조건 |
| --- | --- |
| 조율 현황 조회 | 해당 모임의 호스트·활성 공동호스트 또는 실제 ATTENDING 참가 행의 회원 |
| 대기자·승인 신청만 있는 사용자 | 실제 참석 행이 없으면 조율 현황 권한이 생기지 않음 |
| 설정 저장 | 호스트·활성 공동호스트이면서 모임 상태 DRAFT 또는 OPEN |
| CLOSED·CANCELED의 새 설정 변경 | TRANSPORT_EVENT_NOT_OPEN으로 거절 |
| 설정 전용 앱 경로 | eventManage 권한을 먼저 검사하고, 조회 결과의 canManage에 따라 폼 또는 권한 오류를 표시 |

서버 쓰기는 현재 행위자의 계정 상태도 검사한다. 화면 입구의 존재나 예전 권한을 근거로 저장을 허용하지 않는다. 앱 현황 접근도 실제 참석 행을 사용하며, 인자로 대기 상태를 받더라도 현재 canViewTransportWhen은 대기만으로 허용하지 않는다.

## 현재 설정과 기본값

설정 행이 없는 조회는 `enabled=false`, `allowsIndividualTravel=true`, `allowsParticipantChanges=false`, `revision=0`인 기본 구성을 사용한다. 조회만으로 설정 행을 저장하지 않는다.

| 화면 설정 | API 필드 | 의미와 보존 범위 |
| --- | --- | --- |
| 이동을 함께 조율해요 | enabled | 새 이동 조율을 받을지 결정. 꺼도 현재 배정·기록을 삭제하지 않음 |
| 개별 이동을 허용해요 | allowsIndividualTravel | 배정 전 개별 이동 선택의 허용 정책. 이미 배정된 사용자의 변경은 별도 배정·조정 규칙 적용 |
| 배정 후 본인 변경 허용 | allowsParticipantChanges | 본인 변경 명령의 정책 조건. 타인 이동·임의의 첫 배정 권한을 부여하지 않음 |

‘자리 반납 허용’은 현재 설정 폼과 정책 요청의 항목이 아니다. 서버는 정책 저장 때 이전 필드 allowsSeatRelease를 false로 설정한다. 개별 이동 허용은 기존 저장 필드 allowsSelfVehicle에 대응하지만, 앱에 예전 ‘자차 허용’ 스위치를 그대로 설명하지 않는다.

현재 policy 명령에는 살아 있는 차량을 찾아 끄기를 금지하는 단계가 없다. 예전 EventTransportService.updateConfig에 남은 차량 보호 조건을 현재 쓰기 흐름에 적용하지 않는다. OPEN에서 설정을 변경하면 현재 배정을 유지한다는 조율 알림 경로를 호출한다. 이는 실제 기기의 푸시 수신을 확인했다는 뜻이 아니다.

본인 변경 폼의 안내는 이미 배정된 사람의 빈 차량·좌석 이동을 설명한다. 서버 배정 명령은 기존 차량의 claimPolicy와 배정 상태도 검사하므로 설정 하나를 모든 구형 차량의 자리 반납 허용/금지 규칙으로 확대하지 않는다.

## 현재 API와 구형 쓰기 종료

| 창구 | 현재 역할 |
| --- | --- |
| GET /api/v1/events/{eventId}/transport/coordination | 개정 번호·세 정책·관리 가능 여부·명단·차량·지원·요청·행동 정보를 함께 조회 |
| PUT /api/v1/events/{eventId}/transport/coordination/policy | 현재 앱의 설정 저장 |
| GET /api/v1/events/{eventId}/transport | 기존 설정 조회. 모임 상세의 이동 사용 여부 등 기존 연결에서 사용 |
| PUT /api/v1/events/{eventId}/transport/config | 구형 쓰기 종료 안내. 컨트롤러에서 TRANSPORT_CLIENT_UPDATE_REQUIRED를 반환하며 예전 서비스 변경 메서드를 호출하지 않음 |

새 정책 요청은 세 boolean 값과 requestId·expectedRevision을 모두 요구한다. null인 정책 값, 음수·누락 개정 번호, 소문자 UUID 형태가 아닌 요청 번호를 거절한다. 정의되지 않은 필드도 역직렬화에서 거절한다.

저장 응답 TransportCommandVo에는 requestId, appliedRevision, currentRevision, replayed, 선택적인 resourceId가 있다. 정책 저장은 생성할 차량 번호가 없으므로 resourceId를 새 차량으로 해석하지 않는다.

## 충돌과 응답 유실 복구

서버는 모임 행을 잠그고 행위자·권한을 검사한 다음, 같은 모임·행위자·requestId의 기존 처리 기록을 확인한다. 명령 종류·대상·요청 내용이 같으면 재실행하지 않고 이전 적용 개정 번호와 현재 개정 번호를 반환한다. 내용이 바뀌면 TRANSPORT_REQUEST_REUSED로 거절한다. 같은 요청을 확인하는 경우에도 현재 행위자 자격과 권한 검사를 먼저 거친다.

새 요청의 expectedRevision이 현재 개정 번호와 다르면 TRANSPORT_REVISION_MISMATCH로 거절한다. 성공한 새 변경만 개정 번호를 1 올리고 처리 기록을 함께 저장한다. 오래된 요청의 재전송이 이후에 저장된 설정·배정을 되돌리지 않는다.

앱 편집기는 최초 제출 시 요청 번호와 내용을 보관하고 저장 중 입력을 잠근다. 네트워크·서버·알 수 없는 오류는 처리 여부가 불확실하므로 ‘처리 결과 확인’으로 **같은 요청**을 다시 보낸다. 제한 오류도 같은 요청으로 확인한다. 다른 확정 오류에서는 ‘현황 다시 검토’로 최신 현황을 읽은 뒤 보관한 요청을 해제한다. 입력한 스위치 값은 유지하므로 사용자가 최신 상황에 맞는지 다시 확인한 다음 새 요청을 만든다.

화면이 살아 있는 동안 보관하는 요청이며 앱 종료 후까지 영속 복구를 보장하는 장치가 아니다. 계정이 바뀌면 편집기에서 재전송을 막고 다시 진입하도록 안내한다.

## 저장 후 갱신과 실패 표시

명령 성공 뒤 앱은 응답의 currentRevision을 최소 조회 개정으로 올리고 조율 현황과 관련 기존 설정·차량·기록 조회를 갱신한다. 그보다 오래된 현황 응답은 최신 결과로 채택하지 않고 다시 불러오라는 오류를 표시한다. 충돌·권한 오류에서도 관련 조회를 무효화한다.

저장이 성공했으나 뒤따른 현황 조회가 실패할 수 있다. 명령 처리기는 저장 성공 자체를 취소하지 않으며, 편집기는 저장 안내 후 닫힐 수 있다. 이때 현황의 오류·재시도로 갱신을 회복한다. ‘저장 성공’과 ‘최신 화면 조회 성공’을 같은 판정으로 합치지 않는다.

함께 이동 화면은 초기 로딩·오류와 재시도, 상단 및 당겨서 새로고침을 제공한다. 조율을 끈 상태에서도 기존 배정·기록 보존 안내와 현황을 보여 준다. 설정 전용 화면도 조회 실패 재시도와 관리 권한 오류를 구분한다.

## 출시 상태와 기존 기록의 해석

2026-09-02 작성본의 ‘신규 이용 봉인’, ‘운영 설정에 TRANSPORT 추가’는 당시 설명이다. 현재 [구현 작업판의 첫 출시 기능의 확인 범위](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md#첫-출시-기능의-확인-범위)를 기준으로 버스·카풀·배정의 구현 및 기존 로컬·웹 기록과 휴대전화·실제 푸시·실차 도면·최종 시나리오의 남은 확인을 구분한다.

현재 application-prod.yaml의 공개 도메인 기본값에는 TRANSPORT가 포함된다. 다만 환경 변수로 바뀔 수 있으므로 저장소 기본값만으로 운영 환경의 실제 활성 상태를 확정하지 않는다. 서버 컨트롤러와 앱 경로의 출시 범위 검사도 유지된다.

이전 [통합 이동 기능 근거](../../../../docs/release-gate/evidence/MOV-01/README.md)는 과거 범위의 기록으로 보존한다. 행동별 실행 결과는 [이동 조율 E2E의 이미 확인한 행동과 정확한 확인 범위](../../../../docs/plan/transport/TRANSPORT_E2E_SCENARIOS_2026-09-20.md#이미-확인한-행동과-정확한-확인-범위)와 [웹 검사로 대신할 수 없는 확인](../../../../docs/plan/transport/TRANSPORT_E2E_SCENARIOS_2026-09-20.md#웹-검사로-대신할-수-없는-확인)을 따른다.

## 현재 제한과 확인 범위

| 구분 | 확인된 경계 | 영향 | 후속 판단 |
| --- | --- | --- | --- |
| Gap | 설정 폼의 거절 문구가 ‘호스트만 진행 중인 모임’이라고 표현 | 실제 조건은 활성 공동호스트와 DRAFT도 포함하여 문구가 권한·상태 범위를 좁게 설명함 | 동작을 문구로 추측하지 않고 UI 문구 정비 때 반영 |
| Risk | 편집기의 미확정 요청은 화면 메모리에 보관 | 닫기·앱 종료 후 같은 요청 번호로 복구된다고 보장할 수 없음 | 실제 장애 시나리오에서 저장 여부와 최신 현황을 구분 |
| Risk | 저장 성공 후 현황 재조회는 별도로 실패 가능 | 저장 안내 뒤에도 최신 화면이 아직 없을 수 있음 | 개정 하한과 재조회 오류·재시도 함께 확인 |
| 미검증 | 소스와 선택한 기존 시험 단언 대조 | 운영 공개 범위·실제 기기 푸시·실차 도면·여러 실제 계정의 왕복은 이번에 실행하지 않음 | 해당 실행 환경과 기존 E2E 기록의 범위를 명시한 별도 확인 |

## 수용 기준과 검증 근거

- **AC-01 현재 입구:** 모임 상세와 함께 이동 관리자 영역에서 현재 설정 폼으로 연결되며 예전 화면 클래스의 존재를 전제하지 않는다.
- **AC-02 조회 권한:** 호스트·활성 공동호스트·실제 ATTENDING 회원은 조율 현황을 읽을 수 있고 대기·승인 신청만으로는 허용하지 않는다.
- **AC-03 저장 권한과 상태:** 호스트·활성 공동호스트의 DRAFT·OPEN에서 새 설정을 저장하고 다른 역할 및 종료·취소 상태의 새 저장을 거절한다.
- **AC-04 기본 구성:** 설정 행이 없으면 조율 사용 안 함·개별 이동 허용·본인 변경 불허·개정 0을 사용하며 조회로 행을 만들지 않는다.
- **AC-05 세 설정 계약:** enabled·allowsIndividualTravel·allowsParticipantChanges와 요청 번호·개정을 모두 전달하고 누락·잘못된 형식·미정의 필드를 거절한다.
- **AC-06 조율 중단:** 기존 차량·배정이 있다는 이유만으로 현재 policy의 끄기를 금지하지 않으며 기존 기록을 삭제하지 않는다.
- **AC-07 예전 설정과 구분:** 자리 반납 스위치를 현재 설정 항목으로 설명하지 않고 정책 저장 때 예전 allowsSeatRelease가 false로 설정되는 사실과 개별 배정 규칙을 구분한다.
- **AC-08 구형 쓰기 종료:** 옛 PUT transport/config가 현재 설정을 저장한다고 표시하지 않고 업데이트 필요 오류와 새 policy 창구를 연결한다.
- **AC-09 같은 요청 재확인:** 응답 유실 뒤 같은 요청·내용을 보내면 재실행 없이 적용 개정과 현재 개정을 반환하고 이후 변경을 되돌리지 않는다.
- **AC-10 재사용과 개정 충돌:** 같은 요청 번호의 다른 내용 및 새 요청의 오래된 개정을 각각 거절하며 충돌 후 최신 현황을 다시 검토한다.
- **AC-11 입력 보존:** 미확정 오류에서는 입력을 잠그고 같은 요청을 확인한다. 확정 오류 후 현황을 재검토해도 스위치 값은 유지하되 새 제출 전에 다시 확인한다.
- **AC-12 계정과 최신성:** 계정 변경 시 편집기 제출을 막으며 저장 응답보다 오래된 현황을 최신으로 표시하지 않는다.
- **AC-13 저장과 조회 분리:** 저장 완료 후 조회 실패가 생기면 저장 성공을 되돌렸다고 설명하지 않고 현황의 오류·재시도로 회복한다.
- **AC-14 출시 근거:** 저장소 기본 공개 도메인·현재 E2E 기록·운영의 실제 활성 상태를 구분하고 과거 봉인 설명을 현재 상태로 재사용하지 않는다.

검증 근거: TransportCommandGateTest의 최초 설정 저장·개정 증가, 응답 유실 후 재시도의 이후 배정 보존, 같은 요청 번호의 다른 내용 거절 단언을 읽었다. transport_coordination_screen_test.dart의 지연된 설정 저장 후 폼 닫힘·중단 안내 제거·버스 추가 표시 단언도 읽었다. 시험 소스 대조이며 이번에 제품 시험을 실행한 기록이 아니다. 이 문서의 수용 기준 전체가 해당 두 시험만으로 검증됐다고 표시하지 않는다.
