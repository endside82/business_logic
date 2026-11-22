# F15-03. 회원의 경고 이의제기 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 실행·운영 검수 통과 기록이 아니다.

## 현재 역할과 입구

본인 경고 원장의 GRANT 항목에서 이의 다이얼로그를 열거나 전용 제출 화면으로 이동한다. 내 이의 목록은 진행 상태·처리 결과·철회와 조건부 재제출 입구를 제공한다. 제출 대상은 일반 신고나 제재 식별자가 아니라 targetGrantLedgerId다.

## 제출 계약과 중복 방어

POST /api/v1/clubs/{clubId}/warnings/appeals는 회원 여부와 필수 Idempotency-Key를 확인하고 201 WarningAppealVo를 반환한다. 본문은 targetGrantLedgerId·description·선택 attachments다. 설명은 공백만 있는 값이 불가하고 최대 4000자다. 첨부는 파일 식별자 배열 JSON 문자열이며 소유권·최대 5개를 확인해 참조를 등록한다. JSON을 해석하지 못하면 현재 parser는 빈 첨부로 취급하므로 모든 잘못된 JSON을 거절한다고 쓰지 않는다.

서버는 해당 클럽·본인의 GRANT인지 확인하고 회원 잠금을 잡은 뒤 이미 취소·만료됐는지와 진행 중 이의를 커밋된 자료로 확인한다. 같은 원장에 SUBMITTED 또는 IN_REVIEW가 있으면 중복이다. 따라서 예전의 「잠금 없는 조회 후 저장」 설명은 현재 제출 구현에 맞지 않는다. 모든 운영 처리의 동시성까지 이 확인으로 보장하지는 않는다.

앱은 같은 본문을 재전송할 때 키를 유지하고 본문이 바뀌면 새 키를 만든다. 서버의 멱등 실행 경로와 함께 결과 불명 상태에서 동일 제출을 다시 확인할 수 있게 한다. 이 키 계약을 멱등 헤더가 없는 제보 제출에도 적용한다고 설명하지 않는다.

## 본인 목록과 철회

GET /api/v1/clubs/{clubId}/warnings/me/appeals는 본인 List를 생성 시각 역순으로 반환하고 상태 필터를 지원한다. 담당자·처리자·재제출 허용 담당자 식별자는 가린다. POST /appeals/{appealId}/withdraw는 해당 클럽·본인 자료이고 SUBMITTED 또는 IN_REVIEW일 때 WITHDRAWN으로 바꾼다. 연결된 검토 큐도 처리 상태로 맞춘다. 원장 자체를 취소하는 동작은 아니다.

앱 목록은 필터로 숨겨진 행도 진행 중 중복 판정에 포함하도록 필터 없는 전체 목록을 구독한다. 재제출 선택 시 최신 행·계정·세션을 확인하고 원장 식별자와 기존 설명을 전용 화면에 넘긴다.

## 재제출 허용의 앱과 서버 차이

앱의 재제출 버튼은 resubmitAllowedAt이 있고 상태가 REJECTED·PARTIALLY_ACCEPTED·WITHDRAWN 중 하나이며 같은 원장에 진행 중 이의가 없어야 한다. 운영진 UI의 허용 버튼은 그보다 좁게 REJECTED이면서 아직 허용 시각이 없는 행에 노출된다.

그러나 서버 submit은 resubmitAllowedAt을 필수 조건으로 검사하지 않고 활성 GRANT·진행 중 이의 없음만 확인한다. 서버 allowResubmit도 진행 중 상태만 제외하고 허용 시각을 남긴다. 앱 버튼 조건·운영진 버튼 조건·최종 서버 제출 조건을 하나의 강제 정책으로 합치지 않는다. ACCEPTED 결과로 원장이 취소된 뒤에는 원장 검사에 의해 새 이의가 막힌다.

## 앱 실패와 복귀

업로드·제출 중에는 중복 제출과 이탈을 제어한다. 성공하면 돌아가 본인 이의·요약을 다시 읽는다. 원장 취소·만료 오류는 현재 원장과 이의를 재조회하고 제출 화면을 닫는다. 결과 불명은 안전한 동일 요청 재전송 안내와 입력을 유지하고, 다른 실패도 입력을 남긴다. 목록·확인창은 계정·세션 변경 뒤 오래된 작업이 이어지지 않게 확인한다.

## 코드 위치

서버: WarningMemberController#submitAppeal/getMyAppeals/withdrawAppeal, WarningAppealService#submit/getMyAppeals/withdraw/allowResubmit, WarningAppealAddParam. 앱: warning_member_api.dart, warning_member_commands.dart, warning_appeal_dialog.dart, warning_ledger_screen.dart, appeal_submit_screen.dart, my_appeals_screen.dart.

<!-- source-references:start -->
서버 창구: `WarningMemberController#submitAppeal`, `WarningMemberController#getMyAppeals`, `WarningMemberController#withdrawAppeal`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 앱 재제출 표식과 서버 제출 조건이 다르다. | 운영진 허용을 서버 제출의 필수 승인으로 설명하지 않는다. |
| Risk | 본인 목록은 페이지가 아니고 잘못된 첨부 JSON은 빈 첨부로 처리된다. | 데이터 규모·입력 실패 경계를 구분한다. |
| 미검증 | 실제 동시 제출·응답 유실 재전송·계정 전환을 새로 실행하지 않았다. | 잠금·키 코드의 존재와 실행 검증을 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 대상:** 본인·같은 클럽·활성 GRANT를 확인하고 취소·만료를 별도 오류로 거절한다.
- **AC-02 제출 중복:** 필수 멱등 키와 회원 잠금 뒤 진행 중 이의 확인을 적용한다.
- **AC-03 입력:** 필수 설명·4000자·첨부 소유권·5개 한도와 JSON 실패 처리를 구분한다.
- **AC-04 본인 목록:** 본인 List·상태 필터·운영자 정보 가림을 유지하고 재제출 중복은 전체 목록으로 판정한다.
- **AC-05 철회:** 진행 중 본인 이의만 철회하며 원장 취소와 혼동하지 않는다.
- **AC-06 재제출:** 회원 버튼·운영진 허용 버튼·서버 submit의 서로 다른 조건을 기록한다.
- **AC-07 오류 복구:** 원장 상태 변경은 재조회 후 닫기, 결과 불명·일반 실패는 입력 유지와 적절한 안내로 나눈다.
