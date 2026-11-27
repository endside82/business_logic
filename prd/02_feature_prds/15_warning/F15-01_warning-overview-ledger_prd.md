# F15-01. 내 경고 현황과 원장 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다. 현재 할 일은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)에 있다.

## 현재 역할과 입구

클럽의 내 경고 화면은 점수·검토 등급·진행 중 이의·제재 및 잠금 기록·최근 원장을 보여 준다. 경고 기록, 내 이의, 제보하기, 내 제보 네 입구를 제공한다. 이벤트 일반 신고와 클럽 경고 제보는 다른 계약이다.

## 본인 조회와 원장 필터

GET /api/v1/clubs/{clubId}/warnings/me는 클럽 회원을 확인하고 summary·recentLedger·activeSanctions·선택 appealSlaText를 반환한다. 최근 원장은 생성 시각 내림차순에서 5개를 선택한다. 요약은 effectiveScore·qualifiedScore·rawScore·effectiveCount, 유형·심각도별 집계 문자열, reviewLevel·underReview·manualLock과 관련 시각·사유를 담는다.

GET /api/v1/clubs/{clubId}/warnings/me/ledger는 Page를 반환한다. 서버가 memberId를 로그인 본인으로 덮어쓰므로 요청 필터로 타인의 원장을 읽을 수 없다. type·penaltyTypeCode·fromAt·toAt·page·size를 지원하고 기간은 생성 시각의 양 끝을 포함한다. 조회 순서는 createdAt 내림차순 뒤 id 내림차순이다. 앱 모델에도 같은 필터가 있고 provider는 페이지당 20개를 요청한다. 모델 지원을 화면의 모든 필터 조작이 구현됐다는 뜻으로 확장하지 않는다.

## 요약 생성과 제재 목록의 의미

내 경고 조회는 요약이 없으면 빈 요약 행을 초기화하는 쓰기 가능한 트랜잭션이다. 부모 클럽·회원 확인과 중복 초기화 방어가 있으며 정책 활성 여부를 요구하지 않는다. 정책 미운영 클럽에서도 빈 요약이 생길 수 있다. 이 GET이 매번 전체 원장을 재계산하는 것은 아니며 저장된 요약을 반환한다.

activeSanctions는 ACTIVE 상태에서 endAt이 없거나 미래인 행이다. 이 목록 필터는 startAt을 검사하지 않아 예약된 제재나 잠금 관련 기록을 포함할 수 있다. 현재 시점의 모든 실효 제재만 담긴 목록이라고 단정하지 않는다. 집행 계약은 [제재 집행](F15-08_sanction-enforcement_prd.md)을 따른다.

## 본인 정보와 운영 정보의 구분

본인 원장에서는 actorId를 가리고, 본인 제재 응답에서는 actorId·actorRole·revokedBy를 가린다. 제재의 actions는 현재 조회자의 권한·상태를 바탕으로 계산한다. 본인 경고 화면이 모든 운영진 액션을 허용한다는 의미는 아니다. 운영자용 회원 상세는 다른 API이며 별도 권한을 따른다.

## 앱의 조회와 이의 연결

메인 새로고침은 요약과 본인 이의를 함께 다시 읽는다. 원장은 페이지를 이어 읽고 읽어 온 자료를 GRANT와 연결된 조정 행으로 묶는다. 현재 진행 중인 이의 대상도 읽어 이의 버튼의 중복 진입을 제한한다. 메인·원장·이의 provider는 해당 클럽 회원 변경 신호를 구독한다.

이의 제출 도중 원장이 이미 취소·만료됐다는 응답을 받으면 원장과 이의를 갱신하고 제출창을 닫는다. 다른 실패·결과 불명은 입력을 유지한다. 제출 키·재전송과 권한은 [회원의 이의제기](F15-03_appeal_prd.md)에 정의한다.

## 코드 위치

서버: WarningMemberController#getMyMain/getMyLedger, WarningQueryService, WarningMemberSummaryService#getOrInitialize/ensureRow, WarningLedgerSearchParam, WarningLedgerQueryRepository, WarningAbilityPolicy, WarningSanctionService#listActiveByMember. 앱: warning_member_api.dart, warning_member_providers.dart, warning_main_screen.dart, warning_ledger_screen.dart, warning_member_overview_vo.dart, warning_member_summary_vo.dart.

<!-- source-references:start -->
서버 창구: `WarningMemberController#getMyMain`, `WarningMemberController#getMyLedger`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 저장된 요약을 반환하고 제재 목록에는 시작 전 행도 포함될 수 있다. | 현재 원장 재계산과 실제 제재 발효를 구분한다. |
| Gap | 내 경고 도움말이 F11-07을 가리킨다. | 현재 경고 기능 안내와 연결 차이를 남긴다. |
| 미검증 | 실제 회원별 접근·페이지 추가·동시 조정·복귀를 실행하지 않았다. | 소스 대조를 제품 실행 완료로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 본인 범위:** 회원 여부를 확인하고 원장 memberId를 본인으로 강제한다.
- **AC-02 응답 구분:** 메인은 요약·최근 5건·제재·SLA 안내, 원장은 페이지 응답으로 소비한다.
- **AC-03 필터 계약:** 유형·패널티 코드·포함 기간·페이지를 적용하고 생성 시각 및 id 역순으로 읽는다.
- **AC-04 요약 의미:** 정책 비활성에서도 초기화할 수 있고 조회 자체를 전체 재계산으로 설명하지 않는다.
- **AC-05 정보 가림:** 회원 응답의 운영자 식별 정보를 가리고 제재 actions는 실제 조회자 기준으로 계산한다.
- **AC-06 앱 갱신:** 회원 변경·새로고침·원장 상태 변경 후 관련 화면을 다시 읽고 이의 입력 유지 여부를 구분한다.
