# F13-02. 프로필 수정 (닉네임·자기소개·사진) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

프로필 수정 API는 사용자가 다른 사람에게 보이는 닉네임, 자기소개, 프로필 이미지, **MBTI**를 갱신하는 기능이다. 닉네임 변경 시 중복 여부를 검사하고 변경 이력을 남기며, 자기소개·이미지 URL·MBTI는 멤버 상세 정보에 저장한다. 이미지 파일 업로드 자체는 file 도메인 의존이며 본 account 컨트롤러에는 포함되지 않는다.

**2026-05-27 변경**: `UserModParam.mbti(Mbti enum 16)` 신규 + `clearMbti(boolean)` 플래그 추가. PATCH 의미는 유지(mbti=null+clearMbti=false → 미변경)하면서, 명시적 삭제 의도(`mbti=null + clearMbti=true`)는 서버가 null 저장으로 반영한다. 앱은 ChoiceChip 재탭 해제 시 `clearMbti=true` 전송. MBTI는 [[F03-18 event-demographics]] / [[F04-17 club-demographics]] 의 I·E 비율 분포의 데이터 원천이다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `프로필 편집` 메뉴를 탭해 진입한다.
- 화면은 현재 authenticated user 값을 초기 폼 값으로 사용한다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `UserController`, `UserService`. 앱: `profile_edit_screen.dart`.

<!-- source-references:start -->
서버 창구: `UserController#updateMyProfile`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 초기화: `authNotifierProvider`의 authenticated user를 읽어 `_nicknameController`, `_bioController`, `_profileImageUrl`에 반영한다.
2. 사진 선택: `ImagePicker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 85)`.
3. 사진 업로드: `uploadImageFile(ref: ref, file: file, purpose: 'PROFILE')` ▶ 파일 서버에서 올릴 주소를 받아(`POST /api/v1/files/presigned-url`) S3 에 바로 올리고 완료를 알린다(`POST /api/v1/files/upload/complete`). 실패하면 발급한 파일을 취소한다.
4. 저장: `authRepositoryProvider.updateProfile(UserModParam(nickname, bio, profileImageUrl))` ▶ `PATCH /api/v1/users/me`.
5. 저장 성공: `authNotifierProvider.notifier.checkAuthStatus()`로 전역 인증 사용자 정보를 재조회/동기화한다.
6. 저장 성공 후 화면 종료: `AppToast.show(... '프로필이 수정되었습니다')` ▶ `context.pop()`.

## 4. 제품 규칙

- 닉네임은 2자 이상 30자 이하다(서버가 강제). 앞뒤 공백을 뺀 길이가 2자 미만이면 앱이 저장 전에 `닉네임은 2자 이상이어야 합니다` 로 막는다. 이미 쓰는 닉네임이면 서버가 거절하고 기존 프로필이 유지된다.
- 자기소개는 입력창에서 200자로 제한한다.
- 프로필 사진은 갤러리에서만 고른다(카메라 촬영, 기본 이미지, 자르기 화면은 없다). 10MB를 넘으면 `프로필 사진은 10MB 이하로 선택해 주세요` 로 막는다. 업로드 실패는 `사진 업로드에 실패했습니다`, 저장 실패는 `프로필 수정에 실패했습니다` 오류 안내가 뜬다.
- MBTI는 16종 중 하나이거나 비어 있다. 같은 칩을 다시 누르면 선택이 해제되고, 해제 후 저장하면 값이 지워진다. 건드리지 않고 저장하면 기존 값이 그대로다. 타인 프로필에는 본인, 서로 매칭된 사이, 같은 클럽 사이에만 MBTI가 보이고 제3자에게는 보이지 않는다.
- 저장 버튼은 바뀐 값이 있고 저장 중이 아닐 때만 켜진다. 바뀐 값이 있는 채 뒤로 가면 `취소`/`나가기` 확인 창이 뜨고 나가면 입력은 버려진다.
- 저장에 성공하면 `프로필이 수정되었습니다` 안내 뒤 화면을 닫고 마이페이지의 표시 정보가 새 값으로 바뀐다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 닉네임과 자기소개를 수정한다 | 로그인됨, 마이페이지에서 프로필 편집 진입 | `users.nickname`과 `member.bio`가 갱신되고 마이페이지의 표시 정보가 새 값으로 동기화된다. |
| S2 | 프로필 사진을 갤러리에서 바꾼다 | 로그인됨, 프로필 수정 화면 표시 중 | `member.profile_image_url`이 새 이미지 값으로 갱신된다. |
| S3 | 닉네임이 너무 짧아 저장되지 않는다 | 로그인됨, 프로필 수정 화면 표시 중 | 프로필은 변경되지 않고 사용자는 입력을 수정할 수 있다. |
| S4 | 중복 닉네임으로 서버 저장이 실패한다 | 로그인됨, 유효한 길이의 닉네임 입력 완료 | 기존 프로필 값이 유지된다. 앱은 이유 없이 「프로필 수정에 실패했습니다」 만 보인다(8절 Gap). |
| S5 | 변경 사항이 있는 상태로 나가기를 시도한다 | `_hasChanges == true` | 취소 시 변경 중 상태 유지, 나가기 시 저장하지 않은 값은 폐기된다. |
| S6 | MBTI를 선택하여 저장한다 | 기존 `member.mbti=null` 또는 다른 값 | `member.mbti = <선택값>` 저장, 응답 VO의 `mbti` 갱신, 인구통계의 I·E 분포에 반영 |
| S7 | MBTI를 ChoiceChip 재탭으로 해제 후 저장한다 | 기존 `member.mbti != null` | `clearMbti=true` 동반 전송 → `member.mbti=null` 저장 |
| S8 | MBTI 변경 없이 저장한다 | `_selectedMbti`가 초기값과 동일 | `_hasChanges` 미증가 → 서버 호출 시 `mbti=null + clearMbti=false`로 미변경 처리(다른 필드만 갱신) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 입력 검증 실패 응답 | 프로필 수정은 칸별 검증 표시 없이 서버가 닉네임 길이(2~30자)를 보고, 어기면 잘못된 입력 400 을 공용 오류 형식으로 돌려준다. 앱은 닉네임 30자, 자기소개 200자로 입력을 막고 2자 미만은 저장 전에 막는다 | 없음 |
| 해소됨 | 사진 올리기 | 사진은 파일 서버를 거쳐 S3 에 올린다. 앱이 올릴 주소를 받아 S3 에 바로 올린 뒤 올림 완료를 알리고, 중간에 실패하면 받은 파일을 취소한다 | 없음 |
| Gap | 중복 닉네임 안내 | 이미 쓰는 닉네임이면 서버가 409 와 닉네임 중복 번호로 거절하고 프로필은 그대로다. 앱은 이 번호의 문구 「이미 사용 중인 닉네임입니다」 를 갖고 있지만 이 화면은 쓰지 않고 「프로필 수정에 실패했습니다」 만 띄운다 | 중복 닉네임이면 「이미 사용 중인 닉네임입니다」 를 보인다 |

## 9. 수용 기준

- **AC-01. 닉네임과 자기소개를 수정한다**: Given 로그인됨, 마이페이지에서 프로필 편집 진입 When 사용자가 해당 흐름을 실행하면 Then `users.nickname`과 `member.bio`가 갱신되고 마이페이지의 표시 정보가 새 값으로 동기화된다.
- **AC-02. 프로필 사진을 갤러리에서 바꾼다**: Given 로그인됨, 프로필 수정 화면 표시 중 When 사용자가 해당 흐름을 실행하면 Then `member.profile_image_url`이 새 이미지 값으로 갱신된다.
- **AC-03. 닉네임이 너무 짧아 저장되지 않는다**: Given 로그인됨, 프로필 수정 화면 표시 중 When 사용자가 해당 흐름을 실행하면 Then 프로필은 변경되지 않고 사용자는 입력을 수정할 수 있다.
- **AC-04. 중복 닉네임으로 서버 저장이 실패한다**: Given 로그인됨, 유효한 길이의 닉네임 입력 완료 When 사용자가 해당 흐름을 실행하면 Then 기존 프로필 값이 유지된다. 앱은 이유 없이 「프로필 수정에 실패했습니다」 만 보인다(8절 Gap).
- **AC-05. 변경 사항이 있는 상태로 나가기를 시도한다**: Given `_hasChanges == true` When 사용자가 해당 흐름을 실행하면 Then 취소 시 변경 중 상태 유지, 나가기 시 저장하지 않은 값은 폐기된다.
- **AC-06. MBTI 신규 선택/변경**: Given `_selectedMbti=INTJ`(기존 null) When 저장하면 Then `member.mbti=INTJ`, 응답 `UserProfileVo.mbti=INTJ`.
- **AC-07. MBTI 명시적 삭제**: Given `member.mbti=INTJ`인 상태에서 ChoiceChip 재탭으로 해제(`_selectedMbti=null`) When 저장하면 Then 서버가 `clearMbti=true`를 받아 `member.mbti=null` 저장. 단순 미선택 상태(`clearMbti=false + mbti=null`)와 구분된다.
