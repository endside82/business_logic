# F09-02. 데이트 프로필 생성·편집과 사진 관리 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 시험·외부 인증·기기 검수 통과 기록이 아니다. 현재 할 일은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)에 있다.

## 현재 입구와 공개 범위

현재 앱에는 /dating/profile/create 생성 화면과 /dating/profile 조회, /dating/profile/edit 편집이 모두 있다. 유효 인증 화면의 프로필 만들기에서 생성 화면으로 들어가며 성공하면 /dating/profile로 이동하고 후보 목록을 갱신한다. 프로필이 없는 조회 화면은 안내와 인증 입구를 제공한다. 인증 입구와 생성 폼을 같은 화면으로 설명하지 않는다.

프로필 화면에는 편집·사진 추가/삭제·노출 토글·차단 목록이 있다. 방문자 입구는 DATING이 열려 있을 때 표시한다. 출시 범위가 닫혀도 본인 프로필·편집·인증·차단 경로는 유지하지만 새 생성·방문자·후보 진입은 허용 예외가 아니다. 서버의 본인 조회·편집·활성/사진 명령은 safetyExit 경로이며 서비스가 노출 증가를 추가로 검사한다.

## 생성 입력과 검증된 신원

POST /api/v1/date/profile은 DateProfileAddParam을 받고 201 DateProfileVo를 반환한다. 입력은 표시 이름·자기소개·선호 성별·선택 키/직업/지역/선호 나이, photoFileIds, discoverableConsent와 개별 공개·특성·선호·동의 필드다. 생년과 성별을 임의 입력으로 받아 저장하지 않고 유효 본인 인증의 실제 생년월일·검증 성별을 사용한다. 만 20세 미만, 검증 성별이 1/2가 아니거나 인증이 만료된 경우 생성 자격이 없다.

닫힌 계정·전역 DATE_PROFILE_BLOCK·기존 프로필을 검사한다. 표시 이름은 공백 불가·trim 기준 최대 50자, 자기소개는 10~300자, 직업 100자·지역 50자 이내, 키는 선택 또는 100~250, 선호 나이는 선택 또는 20~100이며 최소가 최대를 넘지 않아야 한다. 선호 성별과 discoverableConsent=true가 필요하다.

photoFileIds는 서로 다른 3~6개다. 파일마다 본인 소유·업로드 COMPLETED·DATE_PROFILE 목적을 확인한다. 프로필과 사진 행을 같은 생성 흐름에서 저장하고 파일 참조를 등록한다. 처음 사진이 대표이며 표시 순서를 입력 순서로 정한다. 초기 사진은 APPROVED, isVerified=false다. 과거 photoUrls만 받고 사진 행이 생기지 않는다는 설명은 현재 코드와 다르다.

## 프로필 본문과 공개 설정

GET /profile은 본인의 삭제되지 않은 사진과 actions.activate를 포함한다. 사진 URL은 표시용 서명 URL로 바꾼다. 본인 목록에는 검수 상태도 포함하므로 본인이 보는 사진 수와 타인에게 공개할 수 있는 사진 수를 구분한다.

PATCH /profile은 null 필드를 유지한다. smoking·drinking·datingPurpose·religion 문자열은 빈 값이면 지울 수 있다. 종교 값을 저장할 때 같은 요청의 religionConsent=true가 필요하고 지우면 동의 시각도 지운다. excludeSmoker·excludeHeavyDrinker·excludeCasualPurpose·sameReligionOnly는 별도 토글이며 communityDataOptIn=true면 동의 시각을 설정하고 false면 지운다. 이 문서는 저장 계약을 다루며 실제 후보 점수 적용은 [후보 탐색과 선택](F09-03_candidate_swipe_prd.md)을 따른다.

출생연도·성별·소개·키·직업·지역의 disclose 필드도 각각 저장한다. 공개 범위는 PUBLIC·MATCHED_ONLY·HIDDEN이며 노출 활성과 별개의 값이다. DATING이 닫혀 있을 때 비활성→활성, 숨김→매칭 대상, 비공개 범위→PUBLIC 등 노출을 늘리는 변경을 거절한다. 열려 있더라도 활성 PUBLIC으로 노출시키는 요청에는 제재·신원·승인 사진 최소 3장을 확인한다.

PATCH /profile/active의 active=true는 공개 범위와 별개로 노출 자격 검사를 거친다. false는 노출을 끄며 원본 데이터를 삭제하지 않는다. 앱은 actions.activate가 없거나 허용되지 않으면 새 활성화를 허용하지 않지만 이미 켜진 프로필을 끄는 입구는 유지한다.

## 사진 추가와 삭제

POST /profile/photos는 fileId·primary·displayOrder를 받고 201 DateProfilePhotoVo를 반환한다. Java의 isPrimary는 JSON primary이며 앱도 이를 명시적으로 매핑한다. 본인 프로필 잠금 아래 최대 6장·동일 fileId 중복·파일 자격을 검사하고 사진과 파일 참조를 저장한다. 응답은 사진 ID·URL·primary/verified·검수 상태·시각이며 fileId를 반환해야만 삭제할 수 있는 계약은 아니다.

DELETE /profile/photos/{photoId}는 사진 소유권을 확인하며 이미 삭제한 사진은 다시 삭제하지 않는다. 신고 보류 대상이면 거절한다. 전체 남은 사진 3장, 승인 사진을 지울 때 승인 사진 3장을 유지해야 한다. 성공은 deletedAt과 참조 해제이며 원본 이력을 물리적으로 지우는 동작은 아니다.

## 앱의 생성·사진·편집 복구

생성 화면은 갤러리/카메라 업로드에서 fileId를 모으고 중복 조작·다른 세션에서 이어진 제출을 막는다. 저장 전 기본 입력·사진 3장·노출 동의를 확인한다. 실패하면 생성 폼을 유지하고 일반적인 인증/입력 확인 안내를 보인다. 임시 사진을 사용자가 제거할 때는 업로드 파일 정리에 성공해야 목록에서도 뺀다. 미저장 이탈 확인이 있으며 이 확인을 모든 임시 파일의 즉시 삭제 완료로 해석하지 않는다.

기존 프로필의 사진 추가는 업로드 완료 후 fileId를 보내고 결과가 불명확하면 목록을 다시 읽어 확인하도록 안내한다. 사진 삭제는 최소 수량·승인 사진·신고 검토 상태를 확인하고 사용자 확인 뒤 명령한다. 성공 시 프로필을 다시 읽는다.

편집 성공은 응답으로 상태를 바꾸고 원래 화면으로 돌아가며 실패는 입력을 유지한다. 현재 편집 화면의 표시 이름 상한은 20자로 생성 화면·서버의 50자와 다르다. 소개·직업·지역을 빈칸으로 저장하면 앱이 null을 보내므로 서버의 기존 값을 지우지 못한다. 특성 선택 해제는 빈 문자열을 보내 지울 수 있다. 일반 텍스트와 특성 초기화의 차이를 유지한다.

## 코드 위치

서버: DateProfileController, DateProfileService, DateProfileAddParam, DateProfilePhotoVo, VerificationService#evaluateDateProfileIdentity, DateAbilityPolicy. 앱: date_profile_api.dart, date_profile_param.dart, date_profile_photo_vo.dart, date_profile_provider.dart, date_profile_create_screen.dart, date_profile_screen.dart, date_profile_edit_screen.dart, dating_routes.dart, release_scope_routes.dart.

<!-- source-references:start -->
서버 창구: `DateProfileController#createProfile`, `DateProfileController#getMyProfile`, `DateProfileController#updateProfile`, `DateProfileController#toggleActive`, `DateProfileController#addPhoto`, `DateProfileController#deletePhoto`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | 편집 이름 20자와 생성/서버 50자가 다르고 일반 텍스트 빈 입력은 null로 유지된다. | 입력·초기화 차이를 남긴다. |
| Risk | 노출 범위·활성·현재 인증·승인 사진·출시 범위는 서로 다른 조건이다. | 생성 성공을 모든 대상에게 노출 완료로 설명하지 않는다. |
| 미검증 | 실제 사진 업로드·신고 보류·동시 삭제·기기 복귀를 실행하지 않았다. | 현재 연결과 실행 결과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 생성 입구:** 인증 완료 뒤 실제 생성 화면·POST·프로필 복귀가 연결돼 있다.
- **AC-02 신원과 입력:** 검증 생년/성별·만 20세·입력 길이/범위·노출 동의를 적용한다.
- **AC-03 사진 원자성:** 서로 다른 본인 완료 파일 3~6개로 프로필과 사진·참조를 함께 저장한다.
- **AC-04 공개 자격:** 출시 범위·제재·인증·승인 사진과 actions.activate를 기준으로 노출을 허용한다.
- **AC-05 사진 삭제:** 소유권·신고 보류·전체/승인 최소 수량과 소프트 삭제를 적용한다.
- **AC-06 특성 동의:** null 유지·빈 특성 삭제·종교 동의·커뮤니티 옵트인 시각을 구분한다.
- **AC-07 앱 복구:** 생성/편집 입력 유지·사진 불명 결과 재조회·미저장 이탈과 입력 상한 차이를 명시한다.
