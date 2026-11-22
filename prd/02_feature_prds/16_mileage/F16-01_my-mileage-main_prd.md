# F16-01. 내 마일리지·원장·월간 영수증 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 서버와 앱 소스의 현재 계약을 대조했다. 새 제품 실행·실기기 확인 기록은 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 진입

클럽 회원이 마일리지 메인에서 잔액·등급·받은 배지·최근 원장을 본다. 메인의 전체 원장, 월간 영수증, 랭킹, 등급 변화는 각각 별도 화면으로 연결된다. 월간 영수증은 현재 월로 진입한다. 시즌 기능이 공개되지 않은 상태에서는 지난 시즌 입구가 안내 화면을 연다.

NOT_STARTED는 시작 전 안내를 표시한다. PAUSED는 중지 안내와 기존 조회 내용을 함께 보여 준다. 잔액과 누적 적립이 모두 0이고 중지 상태가 아니면 이벤트 탐색 입구를 보여 준다. 메인의 평판 카드와 마일리지 점수는 별도 정보다.

## 현재 서버 계약

모든 회원 조회는 `MileageMemberController`에서 클럽 회원을 확인한다. 메인은 `buildMemberMainForSelf`를 호출한다. 요약 행이 없으면 0으로 구성하고 현재 등급과 다음 등급은 등급 기준과 `qualifiedLifetimeEarned`로 계산한다. 시즌 적립·잔액은 ACTIVE 시즌의 집계 준비가 끝났을 때만 내려준다.

| 요청 | 응답과 현재 의미 |
|---|---|
| GET /api/v1/clubs/{clubId}/mileage/me | `MemberMileageMainVo`: 운영 상태, 잔액, 원시 누적 적립, 등급 산정 누적, 선택적 시즌 수치, 현재/다음 등급, 활성 배지, 최근 원장 5건 |
| GET /api/v1/clubs/{clubId}/mileage/me/ledger | `Page<MileageLedgerVo>`. 요청 memberId는 본인으로 덮어쓴다. type·from·to·keyword·page·size를 적용 |
| GET /api/v1/clubs/{clubId}/mileage/me/receipts/{year}/{month} | `MileageMonthlyReceiptVo`. 해당 월의 적립·사용·만료·정정 합계, 순증, 시작/종료 잔액, 적립 출처별 합계, 배지, 등급명 |

최근 원장은 클럽·회원 조건으로 DB에서 생성 시각/id 역순 5건만 읽는다. 전체 원장도 같은 정렬의 페이지 조회이며 from/to는 경계를 포함한다. keyword는 **사유(reason)**의 대소문자 무시 포함 검색이다. 메모 전체를 검색한다고 설명하지 않는다. 과거 문서의 `findAll()` 전체 원장 메모리 필터 설명은 현재 조회와 다르다.

본인 원장의 actorId는 0으로 가린다. 메인의 배지 awardedBy는 0, revokedBy는 null로 가린다. 운영 상세의 응답과 회원용 응답을 동일한 공개 범위로 취급하지 않는다.

## 월간 영수증 계산과 과거 기록의 한계

| 항목 | 현재 계산 |
|---|---|
| 월 경계 | 월 1~12를 검사하고 해당 월 첫날 이상, 다음 월 첫날 미만의 본인 원장 조회 |
| 적립·사용·만료·정정 | EARN 합, REDEEM/EXPIRE/REVERSE 각각의 절댓값 합 |
| netDelta | 적립 − 사용 − 만료. **REVERSE를 빼지 않는다** |
| 시작/종료 잔액 | 각 기준 시각 이전의 모든 원장 amount 합. REVERSE도 포함 |
| byType | 해당 월 EARN의 sourceType별 합계. 출처가 없으면 UNKNOWN |
| 월 배지 | 해당 월 부여 ID와 현재 활성 배지의 교집합. 당시 상태를 고정한 스냅샷이 아님 |
| gradeStart/gradeEnd | 경계 이전 EARN 합계를 현재 등급 정의에 대입. 이 쿼리는 qualifiedForGrade 필터와 REVERSE 차감을 적용하지 않음 |

따라서 순증이 종료 잔액 − 시작 잔액과 항상 같지는 않다. 월간 등급명도 실제 당시의 등급 변화 기록이나 현재 `qualifiedLifetimeEarned`를 정확히 복원한 값으로 보장하지 않는다. 등급 이력의 별도 감사 기록 조회는 [등급·배지·랭킹·프로필 카드](F16-02_grade-badge-ranking_prd.md)를 따른다.

## 앱 행동·실패·복귀

메인은 로딩·오류 재시도·당겨서 새로고침을 제공한다. 원장은 전체/EARN/REDEEM/REVERSE/EXPIRE를 선택하고 20건씩 추가한다. REVERSE의 화면 이름은 적립취소다. 서버의 기간·keyword 검색 필드는 현재 원장 화면에 입력 UI가 없다. 추가 조회 실패는 목록 아래에서 재시도한다. 데이터가 있는 목록은 당겨서 갱신하지만 빈 원장 안내는 같은 RefreshIndicator 안에 있지 않다.

월간 영수증은 이전/다음 월 이동, 로딩·오류 재시도·새로고침을 제공하며 현재 월 이후의 다음 이동을 막는다. 화면 제약과 서버가 받는 연/월 범위를 구분한다. 원장 새로고침은 이미 읽은 데이터를 유지하고 계정·클럽 회원 데이터 변경을 구독한다.

받은 배지는 메인에 최대 6개, 6개 초과일 때 더보기로 본인 배지 목록을 연다. 메인의 ‘클럽 등급/뱃지 보기’는 실제로 등급 목록 경로를 연다. 배지 안내까지 연결된 것으로 간주하지 않는다.

## 코드 위치

서버: MileageMemberController, MileageQueryService#buildMemberMain/buildMemberMainForSelf/searchLedger/buildMonthlyReceipt, MileageLedgerQueryRepository, MileageMonthlyReceiptQueryRepository. 앱: mileage_member_api.dart, mileage_member_providers.dart, mileage_main_screen.dart, mileage_ledger_screen.dart, mileage_monthly_receipt_screen.dart, club_branch_routes.dart.

<!-- source-references:start -->
서버 창구: `MileageMemberController#getMyMileage`, `MileageMemberController#getMyLedger`, `MileageMemberController#getMyMonthlyReceipt`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | netDelta는 REVERSE를 제외하지만 잔액은 포함한다. | 순증과 잔액 증감을 동일 수치로 설명하지 않는다. |
| Risk | 과거 월의 등급·배지는 현재 정의/활성 상태의 영향을 받는다. | 당시 상태를 보존한 영수증으로 단정하지 않는다. |
| Gap | 원장 기간·사유 검색 UI가 없고 빈 목록의 당겨서 갱신이 다르다. | API 기능과 화면 제공 범위를 나눈다. |
| Gap | ‘클럽 등급/뱃지 보기’는 등급 목록만 연다. | 배지 안내 연결은 별도 후속으로 남긴다. |
| 미검증 | 권한 변경·실제 월별 데이터·페이지 경계·복귀를 실행하지 않았다. | 소스 대조를 새 제품 시험 통과로 기록하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 본인 범위:** 모든 조회에서 회원 여부를 확인하고 원장 memberId를 본인으로 강제한다.
- **AC-02 요약과 최근 기록:** 요약이 없으면 0으로 구성하고 최근 원장은 DB에서 5건만 읽는다.
- **AC-03 운영 상태:** 시작 전 안내와 중지 후 기존 조회를 구분하고 시즌 준비 전 수치는 가린다.
- **AC-04 정보 가림:** 회원용 원장과 배지 응답의 운영자 식별 필드를 가린다.
- **AC-05 원장 탐색:** API의 유형·기간·사유 검색과 앱의 유형·20건 페이지 지원을 구분한다.
- **AC-06 월별 산식:** 정정 포함 잔액과 정정 제외 순증을 각각의 계산대로 설명한다.
- **AC-07 과거 상태:** 월 배지와 등급명이 당시 상태를 고정한 기록이 아님을 명시한다.
- **AC-08 재조회와 입구:** 오류·추가 조회·갱신 및 실제 이동 대상을 코드와 대조한다.

위 항목은 소스로 확인할 계약과 후속 실행 시나리오다. 이번 작업에서는 제품 시험·브라우저·실기기 확인을 실행하지 않았다.
