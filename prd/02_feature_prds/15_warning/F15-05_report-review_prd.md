# F15-05. 클럽 경고 제보 심사 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다.

## 현재 역할과 입구

운영 제보 목록·상세에서 대상·이벤트·증빙·추가 검토 여부를 읽고 승인, 반려, 추가 정보 요청을 한다. API는 /api/v1/admin/clubs/{clubId}/warnings 아래이며 WARNING_REVIEWER 권한을 요구한다. 승인에는 패널티 유형 사용 가능 여부와 SEVERE 유형의 소유자 제한이 추가된다.

## 목록·상세·증빙과 자기 대상 가림

GET /reports는 Page, GET /reports/{reportId}는 같은 형태의 단건 WarningReportVo다. 대상 닉네임·이벤트 제목·actions를 붙인다. 조회자가 제보 대상이면 reporterUserId·description·attachmentIds·internalMemo를 가리고 extraReviewRequired를 false로, selfTargetedRestricted를 true로 만든다. 본인 대상이라는 사실을 숨기기 위해 행 전체를 제거하는 계약은 아니다.

actions.approve·requestMoreInfo·reject는 검토 권한, 자기 대상 여부, 처리 상태를 반영한다. 승인에는 활성 유형·심각도 조건도 반영한다. 증빙 GET /reports/{reportId}/attachments/{fileId}/download-url은 가림 처리 후 노출 가능한 첨부 목록에 포함된 파일만 단기 다운로드 URL을 발급한다. 자기 대상의 가려진 증빙이나 다른 제보의 파일은 FILE_NOT_FOUND다.

## 승인·반려·추가 정보 요청

POST /reports/{reportId}/approve는 패널티 점수를 해석하고 사용·소유자 조건을 확인한 뒤 REPORT 출처의 GRANT를 만든다. 제보는 APPROVED, 결과 원장 식별자·처리자·시각·사유를 기록한다. 반려는 REJECTED로 마무리하고 원장을 부여하지 않는다. 승인·반려는 감사 기록과 outbox를 만들지만 실제 알림 수신은 별도다.

POST /reports/{reportId}/request-more-info는 NEEDS_MORE_INFO로 바꾸고 요청 횟수를 1 올린다. 이 메서드에는 요청 횟수 상한이나 실제 추가 자료 수신 API가 포함되지 않는다. 이 호출은 상태·사유·내부 메모·감사 기록을 저장하며 승인·반려와 같은 outbox 발행은 없다. 화면 문구만으로 알림이나 제보자의 보완 전송까지 구현됐다고 주장하지 않는다.

세 작업 모두 이미 APPROVED·REJECTED·WITHDRAWN이거나 자기 대상이면 거절한다. 서버 처리 사유는 공백 불가·최대 4000자, reasonCode 최대 40자, 내부 메모 최대 4000자다. 비어 있지 않은 내부 메모만 덮어쓰므로 빈 메모 전송은 기존 내용을 삭제하지 않는다. 회원의 본인 목록에는 내부 메모를 내려주지 않는다.

## 선점과 최종 처리의 경계

승인·반려 컨트롤러는 claimForReview로 IN_REVIEW·담당자를 기록한 뒤 최종 처리 서비스를 호출한다. 선점과 최종 처리는 분리된 서비스 트랜잭션이다. 최종 검증 실패 때 앞선 선점까지 자동으로 되돌아간다고 설명하지 않는다. 제보 선점은 미처리 상태를 다시 검사하며 이미 IN_REVIEW인 행도 재선점할 수 있다. 이의제기의 선점과는 조건이 다르다.

## 앱 권한 재확인과 실패 처리

상세 다이얼로그는 최신 동일 클럽·행의 actions를 다시 읽고 로딩·오류 중에는 실행을 허용하지 않는다. 승인 사유는 앱에서 1자 이상, 반려·추가 자료 요청은 5자 이상으로 서버보다 엄격하다. 첨부 뷰어도 현재 계정·세션·접근 범위를 확인한다.

성공은 복귀와 목록·상세 갱신으로 이어진다. 이미 처리됐다는 응답은 최신 목록·상세를 읽고 닫는다. 결과 불명은 목록 확인 안내와 입력 유지, 권한 거절은 권한·대상을 다시 확인하는 흐름이다. 명령이 반영됐을 수 있으면 콘솔과 영향을 받은 회원 자료를 갱신하도록 신호를 보낸다.

## 코드 위치

서버: WarningAdminActionController#searchReports/getReport/getReportAttachmentDownloadUrl/approveReport/rejectReport/requestMoreInfo, WarningReportService, WarningAbilityPolicy. 앱: warning_report_detail_screen.dart, warning_admin_commands.dart.

<!-- source-references:start -->
서버 창구: `WarningAdminActionController#searchReports`, `WarningAdminActionController#getReport`, `WarningAdminActionController#getReportAttachmentDownloadUrl`, `WarningAdminActionController#approveReport`, `WarningAdminActionController#rejectReport`, `WarningAdminActionController#requestMoreInfo`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 선점 뒤 최종 처리 실패 시 IN_REVIEW가 남을 수 있다. | 전체 요청의 원자적 성공·실패를 가정하지 않는다. |
| Gap | 추가 정보 요청은 상태·횟수 기록이고 이 메서드의 알림 outbox·보완 제출 동작은 없다. | 요청 문구를 전체 보완 절차 완료로 설명하지 않는다. |
| Gap | 빈 내부 메모로 삭제할 수 없고 사유 누락은 WARNING_REPORT_NOT_FOUND다. | 실제 입력·오류 계약으로 기록한다. |
| 미검증 | 역할별 심사·증빙 다운로드·동시 처리·알림을 새로 실행하지 않았다. | 소스 대조와 운영 완료를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 접근과 가림:** 검토 권한을 요구하고 자기 대상 제보의 본문·증빙·제보자·내부 메모를 가린다.
- **AC-02 실행 표식:** 조회자별 actions와 서버의 최종 권한·유형·심각도 검사를 함께 적용한다.
- **AC-03 증빙 범위:** 해당 제보에서 노출 가능한 파일만 다운로드 URL을 발급한다.
- **AC-04 처리 결과:** 승인은 GRANT와 APPROVED, 반려는 원장 없는 REJECTED, 추가 요청은 NEEDS_MORE_INFO와 횟수 증가다.
- **AC-05 사유와 메모:** 서버 길이·공백 검사, 앱 최소 길이, 빈 메모 삭제 불가를 구분한다.
- **AC-06 거래와 실패:** 선점/최종 처리의 분리, 이미 처리·결과 불명·권한 거절의 앱 복구를 명시한다.
