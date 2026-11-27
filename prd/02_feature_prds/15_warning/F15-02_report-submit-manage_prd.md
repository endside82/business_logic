# F15-02. 클럽 경고 제보와 본인 관리 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다. 현재 할 일은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)에 있다.

## 현재 역할과 입구

클럽 회원의 경고 제보는 /api/v1/clubs/{clubId}/warnings/reports, 이벤트 호스트의 출결 연계 제보는 /api/v1/clubs/{clubId}/events/{eventId}/warning-reports로 제출한다. 둘 다 201 WarningReportVo를 반환한다. 일반 플랫폼 신고는 [일반 신고 접수](../11_review_report/F11-04_report_prd.md)와 구분한다.

호스트 경로는 실제 이벤트 호스트와 이벤트·클럽 일치를 검사하고 출결 연계가 허용된 활성 패널티 유형을 요구한다. URL의 eventId를 본문에 강제한다. 클럽 운영자라는 이유만으로 이벤트 호스트 검사를 생략하지 않는다.

## 입력과 접수 조건

입력은 targetMemberId·penaltyTypeCode·선택 eventId·attachmentIds·description·anonymous다. attachmentIds는 파일 식별자 목록을 담은 JSON 문자열이며 소유권·최대 5개를 검사해 정규화하고 참조를 등록한다. 설명은 서버에서 최대 4000자를 검사하지만 필수는 아니다. 현재 앱은 비어 있지 않은 설명을 제출 조건으로 삼는다.

서버는 정책 활성, 익명 허용, 자기 자신 제보 금지, 대상의 클럽 회원 여부, 선택 이벤트의 클럽 일치, 패널티 유형 사용 가능성을 확인한다. 클럽·제보자·대상 잠금을 잡고 실명과 익명을 합친 최근 24시간 제출 수를 검사한다. 일반 경로는 20건, 호스트 경로는 100건 한도이며 이 횟수 조회는 특정 클럽으로 제한하지 않는다.

## 중복과 익명 제보의 추가 검토

최근 5분 동일 클럽·제보자·대상·패널티 유형의 중복을 실명/익명 저장 필드별로 확인한다. 별도로 5분 시간 구간의 고유 키는 실명과 익명 모두 같은 제보자 식별자를 사용한다. 키에는 eventId·설명·익명 여부가 없으며 DB 고유 제약 충돌도 중복 오류로 처리한다. 이 계약은 동일 결과를 돌려주는 Idempotency-Key 재전송 계약과 다르다.

익명 제보자가 같은 클럽의 같은 대상에게 최근 24시간 이미 3건을 냈으면 추가 접수를 거절하고 REPEATED_REPORT 검토 큐를 남긴다. 해당 거절은 큐 기록을 함께 되돌리지 않도록 처리한다. 익명 제보 표본 5건 이상에서 반려 비율 70% 이상이면 접수 자체를 차단하지 않고 extraReviewRequired=true로 저장한다. 앱은 접수 성공 뒤 추가 검토 안내를 표시한다.

## 익명 포함 본인 목록과 철회

현재 본인 목록은 reporterUserId 또는 anonymousReporterId가 본인인 자료를 조회하므로 **익명 제보도 포함된다**. 응답은 Page가 아닌 List다. 상태·유형·대상·이벤트·생성 기간을 필터하며 호스트 목록에는 URL 이벤트 범위를 추가로 강제한다. 본인 범위 밖의 reporterUserId 요청 값을 그대로 신뢰하지 않는다.

본인 응답은 담당자·처리자·내부 메모를 가린다. 목록에는 대상 닉네임·이벤트 제목을 붙인다. 익명 제보의 내부 소유자 필드는 공개 VO에 없다. 철회도 실명·익명 원본의 본인을 확인하고 APPROVED·REJECTED·WITHDRAWN이면 거절한다. 그 밖의 미처리 상태는 WITHDRAWN과 처리 시각을 기록한다.

## 앱의 제출·복귀·실패

회원·호스트 작성 화면은 첨부 업로드 중 또는 제출 중의 재제출을 막고 미저장 이탈을 확인한다. 성공하면 호출 화면으로 돌아가고 관련 본인·호스트 목록을 갱신한다. 실패는 입력을 유지하지만 현재 안내는 일반적인 접수 실패 문구다. 명령 결과가 불확실해도 현재 세션에서 반영 가능성이 있으면 목록을 재조회한다.

본인 철회는 확인창을 연 뒤 계정·세션·대상 행·현재 화면을 다시 확인하고 호출한다. 다른 계정으로 바뀐 뒤 이전 확인창으로 작업을 이어가지 않는다. 제보하기·호스트 출결 제보의 도움말은 현재 F11-07을 가리킨다.

## 코드 위치

서버: WarningMemberController, WarningHostController, WarningReportService#submit/submitAttendanceReport/getMyReports/getMyAttendanceReports/withdraw, WarningReportAddParam, WarningReportSearchParam, WarningReportVo. 앱: warning_member_api.dart, warning_member_commands.dart, report_submit_screen.dart, host_report_submit_screen.dart, warning 영역의 my_reports_screen.dart.

<!-- source-references:start -->
서버 창구: `WarningMemberController#submitReport`, `WarningMemberController#getMyReports`, `WarningMemberController#withdrawReport`, `WarningHostController#submitAttendanceReport`, `WarningHostController#getMyAttendanceReports`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 본인 List를 읽은 뒤 필터하므로 페이지 조회가 아니며 누적 자료의 비용이 남는다. | 목록을 서버 페이지 응답으로 설명하지 않는다. |
| Gap | 앱 설명 필수·도움말 F11-07·일반 실패 문구가 서버 계약 및 해당 기능 안내와 다르다. | 입력과 오류·도움말 차이를 남긴다. |
| Risk | 자기 자신 제보는 WARNING_REPORT_NOT_FOUND로 거절한다. | 전용 자기 제보 오류가 있다고 쓰지 않는다. |
| 미검증 | 실제 익명 계정 분리·동시 제출·첨부 열람을 새로 실행하지 않았다. | 현재 소스와 실행 증거를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 두 입구:** 회원 경로와 이벤트 호스트 경로의 권한·유형·eventId 강제를 구분한다.
- **AC-02 입력 검증:** 대상·정책·유형·클럽 일치와 첨부 소유권·5개 한도를 검사하며 설명 필수의 앱/서버 차이를 기록한다.
- **AC-03 접수 제한:** 실명·익명 합산 24시간 한도, 최근 중복 조회, 공통 구간 키를 각각 적용한다.
- **AC-04 익명 추가 검토:** 반복 3건 뒤 거절·큐 유지와 반려 비율에 따른 추가 검토 표식을 구분한다.
- **AC-05 본인 익명 목록:** 실명·익명 본인 제보를 List로 반환하고 운영자 식별 정보·내부 메모를 가린다.
- **AC-06 철회:** 본인 소유·미처리 상태를 확인하고 앱은 확인 후 계정·대상·세션을 다시 검사한다.
- **AC-07 결과 복구:** 성공과 반영 가능성이 있는 결과 불명은 관련 목록을 갱신하며 실패 입력을 유지한다.
