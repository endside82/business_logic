# 13. 프로필 & 설정 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/13_profile_settings -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/13_profile_settings/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

> **2026-05-28 RM 도메인 신설 영향(cross-ref).** `AccountDeactivationService`에 RM 가드 4건 추가(결정 L). (1) `checkRegularMeetingPayments` — PENDING/REFUND_REQUESTED 항상 차단, PAID는 `meeting.status != CLOSED`일 때만 차단. (2) `checkRegularMeetingHosting` — 호스트의 DRAFT/OPEN 운영중 모임 차단(자동 cancel 없음, 금전 발화 방지). (3) `checkRegularMeetingHostedRefunds` — 호스트가 책임진 멤버 PENDING/REFUND_REQUESTED 결제 + RM-keyed failed_refund 차단(CANCELED 호스트의 환불 책임 갭 해소). (4) `checkFailedRefunds` — 멤버측 user_id 기반 PENDING/FAILED 차단. 즉시 비활성화(F13-07) 진입 전 `AccountDeactivationCheckVo.blockingItems`에서 확인. 자세한 내용은 [17 정기모임 도메인 §6](17_정기모임_prd.md).

> **2026-06-05 관심인(19) 도메인 신설 영향(cross-ref).** 마이페이지(`my_profile_screen.dart:115-129`) 메뉴에 두 항목이 추가됐다: ① "관심인" → `/profile/favorites`(`FavoriteListScreen`) — 관심인 목록·등록·해제 진입점. ② "프라이버시 설정" → `/profile/privacy-settings`(`PrivacySettingsScreen`) — 캘린더 비공개 + 가입 클럽 숨기기 토글 진입점(프리미엄 전용). 두 화면 모두 `app_router.dart`의 profile 쉘 내 GoRoute로 등록. 자세한 내용은 [19 관심인 도메인](19_관심인_prd.md).

## 1. 결론

이 단위는 로그인 사용자가 자기 신원과 활동 환경을 직접 관리하는 영역을 담당한다. "내 프로필 카드(닉네임·자기소개·사진·지갑/이벤트/클럽/신뢰점수 요약)"를 출발점으로, 프로필 편집, 다중 주소 관리(라벨/기본/지오코드), 선호 태그 관리, 데이터 프라이버시(데이터 내보내기, 30일 유예 계정 삭제, 즉시 계정 비활성화), 그리고 외부 화면(앱 설정/연동 계정/고객센터/찜 목록)으로의 진입을 통합 제공한다. 이 단위가 끝나면 사용자는 자기 데이터를 자기 의지로 갱신·내보내기·삭제할 수 있는 통제권을 보유한 상태가 된다. 인증 자체(로그인/토큰/소셜 SDK)는 Unit 01에서, 알림 설정은 Unit 12에서 처리된다 — 본 단위는 "소유한 데이터의 표시·수정·삭제" 책임에 한정한다.

이 도메인은 기능 PRD 7개로 구성된다. 현재 기능별 trace source는 총 18개이고, risk 후보는 총 37개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F13-01 | F13-01. 내 프로필 조회 (마이페이지 허브) | [F13-01_profile-hub_prd.md](../02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | [F13-01_profile-hub](../../units/13_profile_settings/F13-01_profile-hub) | 전환 완료 | 1 | 4 |
| F13-02 | F13-02. 프로필 수정 (닉네임·자기소개·사진) | [F13-02_profile-edit_prd.md](../02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | [F13-02_profile-edit](../../units/13_profile_settings/F13-02_profile-edit) | 전환 완료 | 1 | 4 |
| F13-03 | F13-03. 다중 주소 관리 | [F13-03_address-management_prd.md](../02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | [F13-03_address-management](../../units/13_profile_settings/F13-03_address-management) | 전환 완료 | 5 | 5 |
| F13-04 | F13-04. 선호 태그 관리 | [F13-04_preference-tags_prd.md](../02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | [F13-04_preference-tags](../../units/13_profile_settings/F13-04_preference-tags) | 전환 완료 | 4 | 7 |
| F13-05 | F13-05. 데이터 내보내기 (Export) | [F13-05_data-export_prd.md](../02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | [F13-05_data-export](../../units/13_profile_settings/F13-05_data-export) | 전환 완료 | 2 | 6 |
| F13-06 | F13-06. 계정 삭제 요청 (30일 유예) | [F13-06_account-deletion_prd.md](../02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | [F13-06_account-deletion](../../units/13_profile_settings/F13-06_account-deletion) | 전환 완료 | 3 | 4 |
| F13-07 | F13-07. 계정 즉시 비활성화 (탈퇴) | [F13-07_account-deactivation_prd.md](../02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | [F13-07_account-deactivation](../../units/13_profile_settings/F13-07_account-deactivation) | 전환 완료 | 2 | 7 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F13-07](../02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | F13-07. 계정 즉시 비활성화 (탈퇴) | Risk 후보 7 |
| [F13-04](../02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | F13-04. 선호 태그 관리 | Risk 후보 7 |
| [F13-05](../02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | F13-05. 데이터 내보내기 (Export) | Risk 후보 6 |
| [F13-03](../02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | F13-03. 다중 주소 관리 | Risk 후보 5 |
| [F13-01](../02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | F13-01. 내 프로필 조회 (마이페이지 허브) | Risk 후보 4 |
| [F13-02](../02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | F13-02. 프로필 수정 (닉네임·자기소개·사진) | Risk 후보 4 |
| [F13-06](../02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | F13-06. 계정 삭제 요청 (30일 유예) | Risk 후보 4 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (7개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F13-01 | 내 프로필 조회 (마이페이지 허브) | 프로필 카드 + 지갑/이벤트/클럽/신뢰점수 요약 + 하위 메뉴 진입점을 한 화면에서 본다 | 마이페이지 탭 진입, 카드/메뉴 항목 탭 |
| F13-02 | 프로필 수정 (닉네임·자기소개·사진) | 닉네임/자기소개를 편집하고 프로필 사진을 카메라/앨범에서 골라 S3에 업로드한 뒤 저장한다 | 사진 영역 탭, 닉네임/자기소개 입력, "저장" 탭 |
| F13-03 | 다중 주소 관리 | 여러 주소(라벨: 집/회사/기타)를 추가·수정·삭제하고 기본 주소를 지정한다 | 주소 관리 진입, "+" 추가, 라벨 선택, 다음 우편번호 검색, "기본설정"/"수정"/"삭제" 탭 |
| F13-04 | 선호 태그 관리 | 서버 카탈로그에서 내 관심사 태그를 조회·추가·삭제한다. 서버 PUT은 있지만 현재 편집 UI 호출자는 없다 | 선호 태그 진입, 추천 태그 칩 탭으로 추가, 기존 태그의 X로 삭제 |
| F13-05 | 데이터 내보내기 (Export) | 내 데이터를 JSON으로 비동기 추출 요청하고, 완료 시 만료 전에 다운로드한다 | "데이터 내보내기 요청" 탭, 진행 상태 새로고침, "다운로드" 탭 |
| F13-06 | 계정 삭제 요청 (30일 유예) | 개인정보 삭제·익명화를 예약하고 마이페이지 배너로 상태를 본다. 사용자 취소는 PENDING에서만 가능하다 | "계정 삭제 요청" 탭 → 확인 다이얼로그, 배너에서 "관리" → PENDING일 때 "삭제 취소" 탭 |
| F13-07 | 계정 즉시 비활성화 (탈퇴) | 차단 사유 사전 점검 후, 즉시 계정을 비활성화하고 강제 로그아웃된다 | "계정 탈퇴" 탭 → deactivation-check → (해결 항목 안내) → 최종 확인 |

> M = 7 기능. F13-01은 단위의 "허브 화면" 자체이고, F13-02·F13-03·F13-04는 사용자가 자기 신원·생활권·관심사를 갱신하는 운영 기능이며, F13-05·F13-06·F13-07은 GDPR/개인정보 통제권(데이터 추출, 30일 유예 삭제, 즉시 탈퇴)을 구성한다. 본 단위는 "데이터 통제권" 핵심 흐름에 집중하기 위해 외부 도메인 진입점(앱 설정, 연동 계정, 고객센터, 찜, 정산 계좌, 기기 관리)은 별도 기능으로 분리하지 않는다.

---

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 상세

### F13-01 내 프로필 조회 (마이페이지 허브)

- **사용자 가치**: 자기 정체성(이름·사진·자기소개)과 활동 요약(지갑 잔액·내 이벤트 수·내 클럽 수·신뢰점수)을 한 화면에서 확인하고, 모든 프로필/설정 하위 메뉴로 일관된 진입점을 갖는다.
- **주요 화면**:
  - `community_app/lib/presentation/profile/screens/my_profile_screen.dart` (SCR-PS-001 대응)
  - `community_app/lib/presentation/profile/widgets/deletion_in_progress_banner.dart` — 삭제 요청 진행 중일 때 상단 고정 배너
- **백엔드 엔드포인트**:
  - `GET /api/v1/users/me` (`UserController#getMyProfile`) — `UserProfileVo` 반환
  - 요약 카드 데이터는 외부 단위 의존: 지갑(payment), 내 이벤트/클럽(event/club), 신뢰점수(review)
- **선결 조건/상태**: 로그인 상태(`@AuthenticationPrincipal UserPrincipal`).
- **결과 상태 변화**:
  - 화면 진입 시 프로필/요약 카드 렌더, 메뉴 탭 시 해당 하위 화면(편집/주소/태그/계좌/기기/프라이버시/캘린더/리뷰/찜/앱 설정/고객센터)으로 이동
  - "로그아웃" 탭 시 확인 다이얼로그 → `authNotifierProvider.logout()` 호출(Unit 01의 F01-05로 위임)
  - 삭제 요청이 PENDING/APPROVED 상태이면 상단에 D-day 카운트다운 배너 노출 → "관리" 탭 시 데이터 프라이버시 화면 이동

### F13-02 프로필 수정 (닉네임·자기소개·사진)

- **사용자 가치**: 자기 표현(닉네임·자기소개)과 시각 자산(프로필 사진)을 직접 갱신하여 다른 사용자에게 보이는 정체성을 통제한다.
- **주요 화면**:
  - `community_app/lib/presentation/profile/screens/profile_edit_screen.dart` (SCR-PS-002 대응)
- **백엔드 엔드포인트**:
  - `PATCH /api/v1/users/me` (`UserController#updateMyProfile`) — `@RequestBody UserModParam`, 응답 `UserProfileVo`
  - 프로필 사진 업로드: file 도메인 (`uploadImageFile` 헬퍼, `purpose: 'PROFILE'`) — 본 단위 외부 의존
- **선결 조건/상태**: 로그인 상태. 변경 사항(닉네임/자기소개/사진 중 하나라도)이 있을 때만 저장 버튼 활성화.
- **결과 상태 변화**:
  - 저장 성공: User의 nickname/bio/profileImageUrl 갱신 → `authNotifierProvider.checkAuthStatus()`로 클라이언트 상태 동기화 → "프로필이 수정되었습니다" 토스트 → 이전 화면 복귀
  - 닉네임 < 2자: 클라 검증 실패 토스트 ("닉네임은 2자 이상이어야 합니다")
  - 변경 사항 있는 채로 뒤로가기 시 "변경 사항을 저장하지 않고 나가시겠습니까?" 다이얼로그
  - 사진 업로드 실패: "사진 업로드에 실패했습니다" 토스트, 기존 이미지 유지

### F13-03 다중 주소 관리

- **사용자 가치**: 집/회사/기타 라벨로 여러 생활 거점을 등록해 이벤트 추천·정산·배송 등 위치 기반 기능에 활용하고, "기본 주소" 한 건을 지정해 디폴트 동작의 일관성을 확보한다.
- **주요 화면**:
  - `community_app/lib/presentation/profile/screens/address_list_screen.dart` (SCR-PS-003 대응) — 클라 한도 상수 `_maxAddressCount = 10` (서버 `UserAddressService.MAX_ADDRESS_COUNT = 10`과 일치)
  - `community_app/lib/presentation/profile/screens/address_form_screen.dart` (SCR-PS-004 대응) — 추가/수정 공용
  - `common/widgets/daum_postcode_search.dart` — 다음 우편번호 검색 웹뷰(외부)
- **백엔드 엔드포인트** (모두 `UserAddressController`, prefix `/api/v1/users/me/addresses`):
  - `GET /` — `List<UserAddressVo>` 전체 조회
  - `GET /{addressId}` — 단건 조회
  - `POST /` — `@RequestBody UserAddressAddParam`, 201 + `UserAddressVo`
  - `PUT /{addressId}` — `@RequestBody UserAddressModParam`, 200
  - `DELETE /{addressId}` — 204
- **선결 조건/상태**: 로그인 상태. 추가 시 라벨(home/work/custom)·주소·좌표 필요(클라이언트는 다음 검색 결과로 입력하지만 좌표는 0.0 기본값으로 보낼 수도 있음 — 코드 주석에 명시).
- **결과 상태 변화**:
  - 목록: 카드 단위로 라벨/기본 배지/주소/상세주소 노출, 항목별 "기본설정"(기본이 아닌 경우만)·"수정"·"삭제" 버튼
  - 추가 성공: `UserAddress` 신규 레코드, isDefault=true이면 기존 기본 주소 자동 해제 → 목록에 합류
  - 수정 성공: 해당 레코드 갱신, isDefault 토글 시 기본 주소 재할당
  - 삭제: 기본 주소이면 클라 토스트 차단("기본 주소는 삭제할 수 없습니다…"), 일반 주소이면 확인 다이얼로그 후 DELETE → 애니메이션과 함께 목록에서 제거
  - 한도 초과(10개): "+" 버튼 자체를 비표시(클라 가드)

### F13-04 선호 태그 관리

- **사용자 가치**: 자기 관심사를 시점에 맞게 갱신하여 추천·검색 도메인의 결과 품질을 지속적으로 조정한다.
- **주요 화면**:
  - `community_app/lib/presentation/profile/screens/preference_tag_screen.dart` (SCR-PS-006 대응) — 클라 한도 상수 `_maxPreferenceTagCount = 20` (서버 `UserPreferenceTagService.MAX_TAGS_PER_USER = 20`과 일치)
  - 추천 태그는 공유 `interestCatalogProvider`가 서버 카탈로그를 조회해 그린다. 현재 카탈로그는 비어 있지 않은 13개 카테고리, 25개 라벨이다.
- **백엔드 엔드포인트**:
  - `GET /api/v1/interests/catalog` — 서버 허용 태그 카탈로그
  - `GET /` — `List<UserPreferenceTagVo>`
  - `POST /` — `@RequestBody UserPreferenceTagParam`, 201 + `UserPreferenceTagVo`
  - `PUT /{tagId}` — `@RequestBody UserPreferenceTagParam`, 200
  - `DELETE /{tagId}` — 204
- **선결 조건/상태**: 로그인 상태.
- **결과 상태 변화**:
  - 추천 칩 탭: 단건 POST → 즉시 "내 태그" 섹션에 추가, 카운터 갱신
  - 내 태그의 X 탭: 단건 DELETE → 칩 제거, 카운터 갱신
  - 한도 도달(20): 추천 칩 탭 차단 + "최대 20개까지 선택 가능합니다" 토스트
  - 이미 선택된 추천 태그는 비활성(연한 회색)으로 표시되어 중복 추가 차단
  - UI 스펙(SCR-PS-006)은 PUT 일괄 업데이트를 가정하지만 서버는 단건 API를 제공하고 현재 화면은 POST/DELETE만 호출한다. 이름·가중치 편집 caller는 없다.
  - POST/DELETE 실패는 Provider에서 `false`로 접히며 화면이 Future를 await하지 않아 오류 안내와 재동기화가 없다.

### F13-05 데이터 내보내기 (Data Export)

- **사용자 가치**: 자기 데이터의 사본을 JSON으로 받아 다른 곳에 보관·검토할 수 있게 함으로써 데이터 이동권/투명성을 보장한다(GDPR 데이터 이동권 구현).
- **주요 화면**:
  - `community_app/lib/presentation/profile/screens/data_privacy_screen.dart` 내 `_DataExportSection`
- **백엔드 엔드포인트** (`DataPrivacyController`, prefix `/api/v1/users/me`):
  - `POST /data-export` — 비동기 작업 큐잉, 202 Accepted + `DataExportRequestVo`
  - `GET /data-export/status` — 현재 요청 상태 조회 (`DataExportRequestVo`, status: PROCESSING/COMPLETED/EXPIRED/FAILED 등)
  - 관리자 `MANAGE_PRIVACY`: `/admin/v1/manage/privacy/export-requests/{id}/process|expire|reissue` — `expire`만 수동 EXPIRED 전이, `reissue`는 COMPLETED와 미래 만료 시각을 기록
- **선결 조건/상태**: 로그인 상태. 진행 중인 요청이 없거나(null), 완료/만료/실패 상태에서 재요청 가능.
- **결과 상태 변화**:
  - 요청 성공(202): 상태가 PROCESSING으로 전환, 요청 버튼 비활성, 진행 인디케이터 + 경과 시간 + "최대 48시간" 안내 + 새로고침 아이콘 노출
  - COMPLETED + downloadUrl 존재: "다운로드" 버튼 노출(외부 브라우저로 열기), 만료일 D-day 표시
  - FAILED에서 다시 요청하면 새 PROCESSING row가 생기고 기존 FAILED row는 보존된다. public status는 최신 row 하나만 반환한다.
  - 실제 EXPIRED 응답: "다시 요청" 버튼 노출. 다만 자연 만료는 status를 바꾸지 않고 `COMPLETED + downloadUrl=null`을 반환하며, EXPIRED는 관리자 `expire`를 실행한 경우에만 도달한다.
  - 알 수 없는 상태값: 현재 상태 그대로 표시 + "다시 요청" 버튼

### F13-06 계정 삭제 요청 (30일 유예)

- **사용자 가치**: 즉시 비활성화와 별도로 30일 유예의 개인정보 삭제·익명화를 예약한다. 거래/정산과 법적 분쟁 기록은 보존 정책에 따라 남을 수 있다.
- **주요 화면**:
  - `community_app/lib/presentation/profile/screens/data_privacy_screen.dart` 내 `_AccountDeletionSection`
  - `community_app/lib/presentation/profile/widgets/deletion_in_progress_banner.dart` — 마이페이지 상단 고정 배너 (D-day + "관리" 버튼)
- **백엔드 엔드포인트** (`DataPrivacyController`, prefix `/api/v1/users/me`):
  - `POST /data-deletion` — 삭제 예약, 202 Accepted + `DataDeletionRequestVo` (서버 status enum 진행 중 값은 PENDING/APPROVED — 코드 주석에 CONFIRMED가 아님이 명시됨)
  - `GET /data-deletion/status` — 현재 요청 상태 조회
  - `DELETE /data-deletion` — `PENDING` 요청만 취소, 204
  - 참고: UI 스펙(SCR-PS-007)의 비밀번호 재확인은 현재 Flutter 화면과 서버에 없다. 컨트롤러는 body 없이 요청하고 서비스도 비밀번호를 검증하지 않는다.
- **선결 조건/상태**: 로그인 상태이며 진행 중 `PENDING` 요청이 없어야 한다. status 조회는 최신 `PENDING`/`APPROVED`만 반환하고 취소·완료 뒤에는 NOT_FOUND다.
- **결과 상태 변화**:
  - 요청 성공: status PENDING 진입 → "삭제까지 N일 남음" 카드 + "삭제 취소" 버튼 노출, 마이페이지 상단 배너 활성화. APPROVED도 배너에는 보이지만 취소 버튼은 없다.
  - 취소 성공: DELETE 후 status CANCELLED → "계정 삭제가 취소되었습니다" 토스트, 배너 사라짐
  - 로그인은 진행 중 요청을 조회해 배너/관리 동선을 노출할 뿐 삭제 요청을 자동 취소하지 않는다. 취소는 사용자가 `DELETE /data-deletion`을 명시적으로 호출해야 한다.
  - 30일 만료: 서버 워커가 개인정보를 삭제·익명화하고 계정을 EXIT로 전환한다. 거래/정산은 5년, active legal hold의 분쟁 증거와 종결 분쟁 보존 대상은 별도 정책에 따라 유지한다.
  - 관리자 `process`는 현재 COMPLETED만 skip해 이미 CANCELLED인 row도 실행할 수 있다. 공개 취소를 우회할 수 있는 상태 가드 Gap이다.

### F13-07 계정 즉시 비활성화 (탈퇴)

- **사용자 가치**: 30일 유예 없이 즉시 서비스 이용을 중단하고 계정을 비활성화한다. 단, 진행 중인 의무(예: 호스팅 정산, 결제 미정산 등)가 있으면 차단되거나 자동 처리 안내 후 진행된다.
- **주요 화면**:
  - `community_app/lib/presentation/profile/screens/data_privacy_screen.dart` 내 `_AccountDeactivationSection`
- **백엔드 엔드포인트**:
  - `GET /api/v1/users/me/deactivation-check` (`UserController#checkDeactivation`) — `DeactivationCheckVo` (`deactivationAllowed`, `blockingItems[]`, `resolvableItems[]`)
  - `DELETE /api/v1/users/me` (`UserController#deleteMyAccount`) — `AccountDeactivationService` 호출, 204
- **선결 조건/상태**: 로그인 상태. 사전 점검에서 `deactivationAllowed=true` 또는 차단 항목 없음.
- **결과 상태 변화**:
  - check 결과 `deactivationAllowed=false`: blocking 항목(타이틀/설명/디테일 최대 3건 + "외 N건") 다이얼로그 노출 후 진행 차단
  - check 결과 resolvable 항목 존재: "탈퇴 시 다음 항목이 자동 처리됩니다" 안내 + 최종 확인 다이얼로그
  - 최종 확인 후 DELETE 성공: User 비활성화 → 강제 로그아웃 + "계정이 탈퇴되었습니다" 토스트 → 로그인 화면 복귀(Unit 01 흐름)
  - check 호출 실패: "탈퇴 가능 여부를 확인할 수 없습니다" 토스트, 진행 차단

---

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F13-04](../02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | F13-04. 선호 태그 관리 | 7 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F13-07](../02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | F13-07. 계정 즉시 비활성화 (탈퇴) | 7 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F13-05](../02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | F13-05. 데이터 내보내기 (Export) | 6 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F13-03](../02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | F13-03. 다중 주소 관리 | 5 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F13-01](../02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | F13-01. 내 프로필 조회 (마이페이지 허브) | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F13-02](../02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | F13-02. 프로필 수정 (닉네임·자기소개·사진) | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F13-06](../02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | F13-06. 계정 삭제 요청 (30일 유예) | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

### 접근권한 감사 교정 (2026-07-02)

접근권한 감사(2026-06-30~07-01)에서 확인·교정된 사항이다.

**타인 프로필 단계 노출 정책(확인).** 타인 프로필 조회 시 관계 유형에 따라 노출 필드가 단계적으로 제한된다. 서버가 SELF / MATCHED / SAME_CLUB / THIRD_PARTY 네 단계의 관계 유형을 계산해 단계별로 필드를 투영한다. 제3자(THIRD_PARTY) 뷰어에게는 닉네임과 프로필 사진만 노출된다. 이메일과 생년월일은 본인만 조회할 수 있다. 클라이언트가 비본인 필드를 "많이 fetch한다"는 의심은 서버가 비본인 필드를 null로 내려 반증됐다.

**차단 시 타인 프로필 열람 불가(확인).** 차단 관계(양방향)인 상대의 프로필은 열람할 수 없다(FORBIDDEN 반환).

**기본정보 이메일 제거(방어적 교정).** 타 멤버 기본정보 조회 경로에 이메일 필드가 포함되어 있었으나 배선되지 않은 잠재적 노출 경로였다. 해당 필드가 제거됐다.

**관심인(F19) 단방향 확인.** 관심인은 단방향 즐겨찾기이며 팔로워/팔로잉 목록 개념이 없다. 변경 없음.

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.

## 9. 연결성·성향·개인정보 재실측 (2026-07-29)

F13-01 허브에는 메시지, `/my/met-people`, 성향 검사/리포트가 실제 연결됐다. 만난 사람 API는 증거등급 공동참석자를 사람별로 접어 반환하며 현재 상태·차단·`hideFromSearch`를 매번 다시 적용한다. 성향 API는 문항/세션/제출/내 최신 결과 4개 endpoint이고 V1 기준 활성 11축·24문항이다. 타인 원점수 API는 없으며 이벤트/클럽 fit은 최소 표본과 k-익명 게이트를 통과한 버킷·분포만 보여 준다.

PersonSheet 관계 요약은 공통 관심태그/선호 카테고리/시간대만 제한적으로 보여 주고 커뮤니티 chip에서 데이팅 `MATCHED`를 제거했다. 커뮤니티 채팅은 같은 클럽·이벤트 72시간 유예·미결 의무 자격을 매 전송 재평가하며 `sendableBasis`와 nullable `sendableUntil`을 내려준다.

F13-05 export는 FileStorage key를 저장하고 조회 시 presigned URL을 발급한다. metadata 외 9개 섹션에 데이팅 새 필드, 본인 이벤트/만남 피드백, trait, taste behavior estimate를 포함한다. `vibeTags` 누락, 자연 만료의 자동 EXPIRED 전이/파일 정리 부재, `COMPLETED + URL 없음` UX가 Gap이다. 관리자 `expire`/`reissue`는 수동 상태 전이를 제공한다.

F13-06 삭제는 요청/실행 직전 금융 의무를 이중 검사하고 프로필·관심태그·데이트·취향·이벤트 피드백·trait 개인 데이터를 삭제한다. 법정 거래/분쟁 기록은 보존한다. 차단 의무 상세의 Flutter 손실, 데이팅 사진 FileStorage 실물 삭제 부재, Entity unique 선언과 V1 non-unique index 불일치는 후속 조치가 필요하다.
