# F09-02. 데이팅 프로필 관리 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

본인 인증을 통과한 사용자의 데이팅 프로필 본문, 노출 ON/OFF, 공개 범위(`PUBLIC/MATCHED_ONLY/HIDDEN`)와 사진 API를 정의한다. 후보 discovery는 `isActive=true && visibility=PUBLIC`만 허용한다. 현재 Flutter에는 기존 프로필 조회·본문 편집·활성 토글만 연결되어 있고 신규 생성 화면과 사진 추가/삭제 액션은 없다.

### 2026-07-29 소스 재실측 — 결격 선호와 커뮤니티 데이터 옵트인

`DateProfileAddParam`, `DateProfileModParam`, `DateProfileVo`, Flutter `DateProfileParam/Vo`에 아래 필드가 실제 반영됐다.

| 구분 | 필드/Enum | 계약 |
|---|---|---|
| 본인 특성 | `smoking` | `NON_SMOKER`, `OCCASIONAL`, `SMOKER`; 선택 입력 |
| 본인 특성 | `drinking` | `NEVER`, `SOMETIMES`, `OFTEN`; 선택 입력 |
| 본인 특성 | `datingPurpose` | `SERIOUS_RELATIONSHIP`, `CASUAL`, `MARRIAGE`, `FRIENDSHIP_FIRST`; 선택 입력 |
| 민감정보 | `religion` | `NONE`, `CHRISTIAN`, `CATHOLIC`, `BUDDHIST`, `OTHER`; 저장할 때 같은 요청의 `religionConsent=true` 필수 |
| 결격 토글 | `excludeSmoker`, `excludeHeavyDrinker`, `excludeCasualPurpose`, `sameReligionOnly` | create 기본 false, modify에서는 `Boolean null=미변경` |
| 옵트인 | `communityDataOptIn` | create 기본 false, modify에서 null=미변경. true 전환 시 `communityDataOptInAt`, false 전환 시 시각 제거 |

- 수정 요청에서 enum 문자열 `null`은 미변경이고 blank는 해당 값을 지운다. 종교를 지우면 `religionConsentAt`도 지운다.
- 종교는 결격 필터 용도로만 저장하며 `religion`을 채우는 요청에는 별도 동의가 필수다.
- 커뮤니티 옵트인은 관심사 태그와 신뢰점수를 데이팅 매칭 점수에 가져오는 동의다. 양측 동의일 때만 사용하며 한쪽 미동의는 점수 벌점이 아니다.
- Flutter `date_profile_edit_screen.dart`에 특성 선택 chip, 네 결격 토글, 종교 동의, 커뮤니티 데이터 옵트인 UI와 저장 전 종교 동의 검증이 있다.

실측 근거: `DateProfileController/Service`, `DateProfileAddParam`, `DateProfileModParam`, `DateProfileVo`, `DateSmoking/Drinking/DatingPurpose/Religion`, Flutter `date_profile_api.dart`, `date_profile_param.dart`, `date_profile_edit_screen.dart`.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **데이팅 탭 진입** — `/dating`과 `/dating/candidates`는 모두 후보 카드 화면이며 프로필 화면으로 자동 분기하지 않는다.
- **프로필 직접 경로** — `/dating/profile` 라우트는 있으나 이 화면으로 여는 일반 presentation CTA는 확인되지 않는다.
- **편집 진입**: 프로필 화면 우상단 "편집" 텍스트 → `/dating/profile/edit`
- **프로필 방문자 진입**: 우상단 👁 아이콘 → `/dating/profile/viewers` (F09-08 진입점)
- **차단 목록 진입**: 본문 하단 "차단 목록" ListTile → `datingBlocks` 라우트 (F09-07 진입점)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DateProfileController`, `DatePhotoModerationStatus`. 앱: `date_profile_screen.dart`, `date_profile_edit_screen.dart`.

## 3. 전체 동작 흐름

1. 프로필 화면 진입: `dateProfileNotifierProvider` ▶ `DateProfileRepository.getProfile()` ▶ `GET /api/v1/date/profile`
2. 활성 토글: `notifier.toggleActive(active)` ▶ `Repository.toggleActive(DateProfileActiveParam(active))` ▶ `PATCH /api/v1/date/profile/active`
3. 프로필 편집 저장: `notifier.updateProfile(DateProfileModParam(...))` ▶ `Repository.updateProfile(...)` ▶ `PATCH /api/v1/date/profile` ▶ Provider 상태 invalidate/replace
4. 사진 추가/삭제 (화면 미연결): Repository/Provider plumbing은 있으나 Flutter 요청 모델이 서버 `fileId/isPrimary` 계약과 맞지 않는다.
5. 프로필 신규 생성: Repository/Provider plumbing만 있고 생성 화면/호출자는 없다. 후보 화면의 `프로필 만들기`는 생성 폼이 아니라 `/dating/verification`으로 이동한다.

## 4. 제품 규칙

- 프로필은 인증을 마친 사람만 만들 수 있고 한 사람에 하나다. 만들 때 사진 3장 이상이 필요하고 사진은 최대 6장이다. 사진은 본인이 올린 업로드 완료 파일(프로필 용도)만 붙일 수 있다.
- 사진을 지워서 다른 사람에게 보이는(검수 통과한) 사진이 3장 아래로 내려가면 거절된다.
- 사진 상태: 검수 통과(기본), 거절, 신고 접수 중. 거절과 신고 접수 중인 사진은 본인에게만 보인다. 신고가 처리되는 동안은 그 사진을 지울 수 없다. 지운 사진도 기록은 남는다.
- 공개 범위: 전체 공개만 후보에 나온다. 매칭된 상대만과 비공개는 후보에서 빠진다. 활성 스위치를 끄면 노출만 멈추고 데이터는 그대로 남는다.
- 입력: 표시 이름(필수, 20자), 자기소개(300자). 나이는 출생연도로 「N년생」 처럼 보인다. 후보 카드에서는 올해에서 출생연도를 뺀 값이다.
- 편집 중 바꾼 것이 있는 채 나가려 하면 「저장하지 않고 나갈지」 묻는다.
- 프로필이 없으면 생성 화면 대신 오류 화면이 보인다. 앱에 프로필 신규 생성과 사진 추가·삭제 화면은 아직 연결되어 있지 않다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 프로필 생성 API 직접 호출 (현재 화면 미구현) | `IdentityVerification.status=VERIFIED`, 프로필 없음, `photoUrls` 문자열 3개 이상 | `DateProfile.isActive=true`, `visibility=PUBLIC` row는 생기지만 사진 row는 생성되지 않는다. 현재 Flutter UI에서는 이 흐름을 실행할 수 없다. |
| S2 | 활성/비활성 토글로 매칭 잠시 중단 | 출장 가는 사용자. 일주일간 매칭 알림 받기 싫음. | `isActive=false`. 데이터는 보존, 노출만 중단. |
| S3 | 프로필 편집 — 변경 사항 폐기 | 시나리오 본문 참조 | 서버 상태 변동 없음. |
| S4 | 사진 6장 초과 API 시도 | 이미 6장 사진이 있고 업로드 완료 fileId로 직접 POST. 화면 호출자는 없음. | 서버가 거절하고 사진은 추가되지 않음. |
| S5 | 다른 사용자의 사진 삭제 API 시도 (권한 위반) | 본인 프로필이 아닌 photoId로 DELETE 직접 호출. 화면 호출자는 없음. | 사진 그대로. |
| S6 | 미인증 상태에서 프로필 생성 시도 | 시나리오 본문 참조 | 프로필 생성 차단. |
| S7 | 차단된 사용자가 내 프로필을 보는 경우 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 신고로 인한 프로필 영향 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Gap | frontend.md:64 | **사진 슬롯 그리드**: 2x3, 빈 슬롯에는 + 아이콘 (편집 모드 미구현 — 현재 코드에서는 사진 추가 UI 미연결) | 사진 추가/삭제 UI 구현 |
| Gap | scenarios.md:45 | 클라이언트는 `Result.failure`로 받아 토스트 ("사진은 최대 6장까지 등록 가능합니다" — 실 화면 미구현 시 일반 에러로 표시) | 에러 토스트 문구 구체화 |
| Gap (P0) | `DateProfilePhotoVo`, Flutter `DateProfilePhotoParam` | Entity의 `fileId`/검수 상태가 **서버 VO에도 없고**, Flutter POST는 `photoUrl/primary`를 보내 서버 `fileId/isPrimary`와 불일치한다. | 서버 응답 VO와 Flutter 모델을 함께 정렬하고 업로드 완료 fileId 기반 사진 UI 연결 |
| Gap | Router/Screen 호출자 실측 | 신규 프로필 생성 화면과 일반 프로필 화면 진입 CTA가 없다. 후보 화면의 `프로필 만들기`는 `/dating/verification`으로만 이동한다. | 인증 완료 뒤 생성 폼·호출 체인 연결 |

## 9. 수용 기준

- **AC-01. 프로필 생성 API 직접 호출 (현재 화면 미구현)**: Given 인증 완료, 프로필 없음, `photoUrls` 문자열 3개 이상 When POST를 직접 호출하면 Then 활성 PUBLIC 프로필 본문만 생성되고 사진 row는 생기지 않는다. 현재 Flutter UI에서는 실행할 수 없다.
- **AC-02. 활성/비활성 토글로 매칭 잠시 중단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then `isActive=false`. 데이터는 보존, 노출만 중단.
- **AC-03. 프로필 편집 — 변경 사항 폐기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 상태 변동 없음.
- **AC-04. 사진 6장 초과 API 시도**: Given 사진 6장과 업로드 완료 fileId When POST를 직접 호출하면 Then 서버가 거절하고 사진은 추가되지 않는다. 현재 화면 호출자는 없다.
- **AC-05. 다른 사용자의 사진 삭제 API 시도 (권한 위반)**: Given 타인 photoId When DELETE를 직접 호출하면 Then 소유권 검사로 거절되고 사진은 유지된다. 현재 화면 호출자는 없다.
- **AC-06. 미인증 상태에서 프로필 생성 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 프로필 생성 차단.
- **AC-07. 차단된 사용자가 내 프로필을 보는 경우 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 신고로 인한 프로필 영향 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
