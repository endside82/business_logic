# F09-01. 본인 인증과 증빙 검토 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 시험·외부 인증·기기 검수 통과 기록이 아니다.

## 역할과 공개 범위

일반 본인 인증의 요청·완료·상태·제공자 목록은 P0 범위이며 수동 증빙 검토는 DATING 범위다. 따라서 인증 성공이 소개팅 공개나 모든 후속 기능 사용 가능을 뜻하지 않는다. 프로필 생성에는 별도로 만 20세 이상·검증된 성별·사진·노출 동의와 제재 조건을 적용한다.

서버는 TOSS·NICE 제공자 구조와 설정별 활성 목록을 지원한다. GET /api/v1/date/verification/providers는 활성 제공자의 type·displayName 목록을 반환한다. POST /request는 선택 본문의 provider를 받고 없으면 활성 TOSS를 우선하며 그다음 활성 제공자를 선택한다. 모두 비활성이면 시작을 거절한다. 설정 클래스의 기본값은 비활성이며 실제 공급자 계약·자격증명·운영 활성 여부는 이번 문서 대조로 확인하지 않았다.

현재 앱의 requestVerification은 본문 없이 요청한다. 사용자에게 제공자 선택 UI가 있다는 뜻은 아니며 서버가 선택해 반환한 provider와 콜백 경로를 사용한다. 과거 Toss 단독·NICE 미구현 설명은 현재 구조와 다르다.

## 인증 URL 발급과 완료 계약

POST /request는 201 VerificationAuthVo(txId·authUrl·provider·successScheme·failScheme)를 반환한다. POST /verify는 txId와 선택 encData·integrityValue·tokenVersionId를 받아 VerificationVo를 반환한다. GET /status도 같은 상태 VO이며 아직 인증 행이 없으면 DATE_VERIFICATION_NOT_FOUND다. 응답에는 status·verificationProvider·verifiedAt·expiresAt·currentlyValid 등이 있고 실명·생년월일·CI·DI 평문은 없다.

요청과 완료의 외부 공급자 호출은 NOT_SUPPORTED 경계에서 DB 거래 밖으로 실행된다. 별도 VerificationWriteWorker가 계정·인증 행을 잠그고 발급 준비, 발급 세션 저장, 완료 선점, 결과 반영을 짧은 거래로 나눈다. 사용자별 Redis 잠금은 대기 3초·임대 10초이며, 별도 DB 발급 선점의 토큰·만료도 확인한다. 외부 호출이 늦게 돌아와도 선점 소유권을 잃었으면 결과를 저장하지 않는다.

하루 한도는 저장된 인증 세션의 requestedAt 기준 5건이다. 외부 URL 발급 실패가 모두 저장된 시도 수를 늘린다고 설명하지 않는다. 유효 인증이 있으면 새 요청을 거절하고, 살아 있는 발급 선점이면 발급 진행 중 오류를 반환한다. 새 세션을 저장할 때 이전 PENDING·COMPLETING 세션을 EXPIRED로 바꾼다.

## 시도 세션과 개인정보 반영

세션은 사용자와 txId 해시로 연결하고 유효기간은 10분이다. 완료 시 PENDING 또는 임대가 만료된 COMPLETING을 선점해 COMPLETING과 새 토큰을 기록한다. 이미 살아 있는 완료 임대는 재시도 필요 오류다. 만료된 시도로 완료를 요청하면 거절하며 이 오류만으로 세션 행이 즉시 EXPIRED로 저장된다고 보장하지 않는다.

공급자 실패는 아직 해당 임대를 소유한 경우 별도 거래에서 FAILED와 실패 정보를 저장한다. 성공 반영도 소유권·시도 기한을 다시 확인한다. 이미 유효한 인증이 있으면 verify는 기존 결과를 반환할 수 있고, 외부 호출 중 수동 승인이 생겼다면 그 인증을 덮어쓰지 않는다.

자동 인증 성공 시 이름·생년월일·CI 및 제공된 DI를 암호화 저장하고 유효기간을 365일로 설정한다. 인증 저장이 커밋된 뒤 회원 인구통계 동기화를 호출하며 동기화 실패가 인증 성공을 되돌리지는 않는다. 프로필용 신원 판정은 실제 생년월일과 성별 1/2를 사용한다. 복호화 실패는 사용자 미자격과 구분한다.

## 증빙 검토 요청과 철회

GET·POST·DELETE /manual-review가 본인의 상태·제출·철회를 담당한다. 제출은 fileId 하나를 받는다. 유효 인증이 없고 발급 선점이 진행 중이 아니며 가장 최근 시도가 FAILED·EXPIRED 또는 기한이 지난 PENDING이어야 한다. 아직 자동 인증을 시작하지 않은 사람이나 살아 있는 COMPLETING 시도를 일반 수동 검토 대상으로 허용하지 않는다.

파일은 본인 소유·업로드 COMPLETED·IDENTITY_VERIFICATION 목적이며 QUARANTINED 또는 CLEAN이어야 한다. 제출은 참조 등록·검토 세대 증가와 이전 검토 결과 정리를 수행한다. 응답의 reviewDecision과 evidenceScanStatus는 인증 status와 별개의 상태다. 스캔 대기는 PENDING, 안전 확인은 CLEAN, 누락·거절은 BLOCKED로 표현하며 새 제출은 PENDING_REVIEW가 될 수 있다. 회원용 제출 API가 직접 승인하는 것은 아니다.

철회는 제출/수동 증빙 참조와 검토 기록을 정리하고 파일을 즉시 삭제 대상으로 표시해 후속 작업에 넘긴다. 현재 유효한 MANUAL 인증을 철회하면 인증도 EXPIRED로 바꾸고 verificationRevoked=true를 반환한다. 실제 저장소 삭제 완료를 응답만으로 보장하지 않는다. 교체·검토 종료의 증빙 보존 기한은 설정을 따르며 기본 90일이고, 실제 파일 정리의 보류 조건은 파일 서비스가 담당한다.

## 앱의 인증 입구와 결과

/dating/verification은 상태를 읽고 미인증·대기·유효·만료·실패·알 수 없는 상태를 구분한다. VERIFIED라도 currentlyValid=false면 만료로 보여 준다. 정확한 인증 없음 오류만 미시작으로 취급하고 다른 읽기 실패는 오류와 재시도로 표시한다.

발급 응답의 URL·txId·성공/실패 경로가 모두 준비돼야 WebView를 연다. 콜백은 scheme·host·정규화한 path를 일치 검사하고 완료 요청에는 콜백이 준 임의 txId 대신 처음 발급한 txId를 사용한다. NICE 결과 필드는 함께 전달한다. 서버의 NICE return은 결과 값을 앱 콜백 URL로 넘기는 302이며 그 자체가 인증 완료 저장은 아니다.

앱은 한도·시간 초과·세션 불일치·발급 진행·재시도 필요·제공자 비활성 등을 다른 안내로 표시한다. 닫기는 WebView 표시를 닫으며 서버 취소 명령을 호출하지 않는다. 일반 웹 리소스 오류에 대한 별도 복구 화면은 이 WebView에서 구현돼 있지 않다. 유효 인증 화면의 프로필 생성 입구는 DATING이 열려 있을 때 제공한다.

## 앱의 증빙·불명 결과 복구

수동 검토 입구는 DATING 공개 범위와 서버가 준 현재 제출 가능 상태를 따른다. 앱은 JPG·JPEG·PNG·WEBP 및 10MB 상한을 확인하고 본인확인 목적의 업로드 fileId를 제출한다. 증빙을 계정별로 보관하고 제출 전 최신 서버 상태·현재 계정을 다시 확인한다.

결과 불명인 제출은 바로 중복 전송하지 않는다. 이미 같은 fileId가 접수됐는지 상태를 확인하며, 확실한 거절 또는 전송되지 않았다고 확인한 오류만 재제출 가능 상태로 되돌린다. 증빙 스캔 대기는 10·30·60초 간격과 10분 예산으로 재조회한다. 운영자 최종 판정을 무제한 폴링하는 계약은 아니다. 철회가 수동 인증도 취소했으면 일반 인증 상태를 다시 읽는다.

## 코드 위치

서버: DateVerificationController, VerificationService, VerificationWriteWorker, VerificationProperties, VerificationVo, DateAbilityPolicy. 앱: date_verification_api.dart, date_verification_provider.dart, verification_screen.dart, verification_webview.dart, verification_redirect_interceptor.dart, date_verification_error_message.dart, date_manual_review_provider.dart, date_manual_review_screen.dart, dating_routes.dart, release_scope_routes.dart.

<!-- source-references:start -->
서버 창구: `DateVerificationController#requestVerification`, `DateVerificationController#verify`, `DateVerificationController#getStatus`, `DateVerificationController#submitManualReview`, `DateVerificationController#withdrawManualReview`, `DateVerificationController#getManualReview`, `DateVerificationController#getProviders`, `DateVerificationController#niceReturn`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 제공자 코드 지원과 실제 계약·설정·기기 콜백 성공은 다르다. | Toss/NICE 실제 왕복·운영 활성화를 이번 완료로 기록하지 않는다. |
| Risk | 인증·DATING 공개·프로필 자격과 증빙 검토 상태가 서로 다르다. | 인증 성공을 모든 소개팅 기능 사용 가능으로 확대하지 않는다. |
| Gap | 앱은 제공자 선택 본문을 보내지 않고 WebView 일반 리소스 오류의 별도 복구가 없다. | 서버 선택과 현재 앱의 한계를 명시한다. |
| 미검증 | 실제 외부 인증·동시 완료·운영자 승인·파일 삭제와 실기기 복귀를 실행하지 않았다. | 과거 시험 주장은 로컬 시나리오에 인용으로 보존하고 새 통과 수로 합산하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 제공자와 공개:** 활성 제공자 선택·앱 기본 요청·P0와 DATING 범위를 구분한다.
- **AC-02 시도 발급:** 사용자별 잠금·DB 선점·저장 세션 5건·10분 기한과 이전 시도 종료를 적용한다.
- **AC-03 완료 소유권:** 사용자/해시와 COMPLETING 임대를 확인하고 늦은 결과·실패 반영을 제한한다.
- **AC-04 상태와 신원:** 현재 유효성·365일 인증·암호화 저장·커밋 후 인구통계 및 프로필 자격을 나눠 설명한다.
- **AC-05 증빙 제출:** 가장 최근 실패 시도·파일 소유/목적/스캔·검토 세대 조건을 확인한다.
- **AC-06 증빙 철회:** 참조 해제·삭제 예약과 MANUAL 인증 취소를 구분한다.
- **AC-07 앱 복구:** 발급 txId로 콜백을 완료하고 상태별 오류·제출 결과 불명·제한된 스캔 폴링을 처리한다.
