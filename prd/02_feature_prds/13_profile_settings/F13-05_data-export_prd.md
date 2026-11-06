# F13-05. 데이터 내보내기 (Export) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

데이터 내보내기는 로그인 사용자가 자기 데이터 사본을 JSON 파일로 생성하도록 요청하고, 최신 요청 상태를 조회하는 기능이다. 서버는 요청을 `PROCESSING`으로 저장한 뒤 비동기 worker로 사용자 데이터를 수집해 파일을 만들고 완료 상태와 다운로드 위치를 기록한다. UI 스펙은 "최대 48시간"을 안내하지만, account 코드 안에서 48시간 제한을 강제하는 로직은 확인되지 않는다.

**2026-05-27 변경**: `DataExportAsyncWorker.toMemberMap`이 `mbti` 필드를 export에 포함한다(기존 name/birthDate/gender/bio/profileImageUrl/locale + mbti). [[F13-02]] / [[F09-01]]의 데이터가 모두 사용자에게 내보내져야 한다는 GDPR-style 원칙에 따른다.

### 2026-07-29 소스 재실측 — 저장·다운로드·스키마

- `POST /api/v1/users/me/data-export`는 202를 반환하고 `PROCESSING`, `expiresAt=now+30일` 요청을 만든다. `GET /api/v1/users/me/data-export/status`는 최신 요청을 반환한다.
- worker는 JSON을 `FileStorageService`로 `exports/{userId}/{requestId}_{yyyyMMdd_HHmmss}.json` 키에 업로드하고 `fileKey`만 저장한다. 완료 시 DB `downloadUrl`은 null이다.
- 상태 조회 시 `COMPLETED + fileKey + 미만료`일 때만 `my-data-export.json` 파일명의 presigned GET URL을 동적으로 발급한다. 과거 문서의 로컬 절대경로 설명은 현재 소스와 다르다.
- 최상위 `metadata.schemaVersion`은 `2026-04-23`이고 포함 섹션은 `profile`, `events`, `trust`, `financial`, `notifications`, `dating`, `feedback`, `traits`, `taste` 9개다.
- `notifications.devices[].token`과 신원인증 `verifiedName`, `verifiedBirthDate`, `ci`, `di`는 redacted 목록에 명시되고 export하지 않는다. 인증 type/status/gender/provider/시각은 포함한다.
- `dating.profile`은 흡연·음주·만남 목적·종교/동의시각·네 결격 토글·`communityDataOptIn/At`를 포함한다.
- `feedback`은 내가 작성한 이벤트 선택/인상 태그와 데이트 만남 피드백만 포함한다. 받은 선택/피드백은 포함하지 않는다.
- `traits` schema v1은 본인의 모든 세션(`IN_PROGRESS` 포함), 응답과 해석용 문항/축 메타, 점수를 포함한다. 전역 축·문항을 독립 데이터로 덤프하지 않는다.
- `taste` schema v1은 선언 선호와 `behaviorStyleEstimate`를 포함한다. `positiveTagWeights`는 원본 이벤트 선택 피드백에서 재생성 가능한 중복 파생 캐시라 의도적으로 제외한다.

확정 Gap:

1. `EventFeedbackVo`가 보존하는 사용자 작성 `vibeTags`를 `toEventFeedbackMap`이 export하지 않는다.
2. community_api에는 시간 경과만으로 status를 `EXPIRED`로 바꾸는 자동 전이와 artifact 정리 scheduler가 없다. 자연 만료 조회는 `COMPLETED + downloadUrl=null`이다. 다만 community_admin_api의 `expire` 액션은 수동으로 `EXPIRED` 전이할 수 있다.
3. Flutter에는 `COMPLETED`인데 URL이 없는 만료 케이스를 명시적으로 재요청 상태로 바꾸는 계약이 없고, 화면의 "최대 48시간" 문구도 서버 SLA로 강제되지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브에서 `데이터 프라이버시` 메뉴를 탭한다.
- 데이터 프라이버시 화면의 첫 번째 섹션 `데이터 내보내기`에서 요청과 다운로드를 수행한다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DataPrivacyController`, `FileStorageService`. 앱: `data_privacy_screen.dart`.

## 3. 전체 동작 흐름

1. 화면 진입: `exportStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-export/status`.
2. status 조회가 NOT_FOUND 등 실패일 때 화면은 오류 자체보다 요청 버튼을 보여준다.
3. 요청 버튼: `requestExport()` ▶ `POST /api/v1/users/me/data-export`.
4. 요청 성공: `데이터 내보내기를 요청했습니다` 토스트.
5. 처리 중 새로고침: provider invalidate ▶ status 재조회.
6. 완료 후 다운로드: `canLaunchUrl(Uri.parse(downloadUrl))` 확인 ▶ 외부 앱 열기.
7. `ExportStatusNotifier` → `ProfileRepository` → `DataPrivacyApi` 체인이 상태 조회와 요청을 수행한다.

## 4. 제품 규칙

- 요청 전 확인 창 없이 바로 요청이 만들어지고 `데이터 내보내기를 요청했습니다` 안내가 뜬다. 안내 문구는 `처리에 최대 48시간이 소요됩니다` 지만 서버가 이 시간을 강제하지는 않는다.
- 화면은 가장 최근 요청 하나만 보인다. 상태에 따라 다음처럼 바뀐다.
  - 요청이 없거나 상태 조회가 실패: 요청 버튼
  - 처리 중(`PROCESSING`): 요청 버튼은 꺼지고 진행 표시, 요청 뒤 경과 시간(방금 전, N분 전, N시간 전, N일 전), 새로고침 아이콘
  - 완료(`COMPLETED`): 만료일(`yyyy.MM.dd (D-N)`, `오늘 만료`, `만료됨`)과 다운로드 버튼. 다운로드 주소가 없으면 버튼도 없다.
  - 실패(`FAILED`), 만료(`EXPIRED`), 알 수 없는 상태: 상태 표시와 다시 요청 버튼
- 다운로드는 외부 앱(브라우저)으로 연다. 주소는 상태를 볼 때마다 새로 발급되는 임시 주소다.
- 관리자는 완료된 건을 수동으로 만료시키거나(`EXPIRED`) 미래 만료일을 줘 다시 열 수 있다. 시간이 지나 저절로 `EXPIRED` 로 바뀌지는 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 처음으로 데이터 내보내기를 요청한다 | 로그인됨, 기존 export 요청 없음 또는 status 조회 실패 | 최신 export 요청이 `PROCESSING` 상태로 존재한다. |
| S2 | 처리 중 상태를 확인한다 | 최신 요청 status가 `PROCESSING` | 사용자는 요청이 아직 처리 중임을 확인한다. |
| S3 | 완료된 JSON 파일을 다운로드한다 | 최신 요청 status가 `COMPLETED`, `fileKey` 존재, 미만료 | 상태 조회가 presigned `downloadUrl`을 발급하고 사용자는 외부 앱으로 JSON을 연다. |
| S4 | 내보내기 작업이 실패한다 | worker가 예외를 만나 status를 `FAILED`로 변경 | 다시 요청하면 새 `PROCESSING` row가 생기고 기존 FAILED row는 보존된다. 화면은 최신 row 하나만 표시한다. |
| S5 | 완료 파일이 자연 만료된다 | 최신 요청 status가 `COMPLETED`, `expiresAt <= now`, 관리자 expire 미실행 | community_api는 status를 바꾸지 않고 `downloadUrl=null`을 반환한다. 관리자 expire를 실행한 경우에만 `EXPIRED` UI로 도달한다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:43 | - 요청 생성 중 repository 저장 실패 등 일반 예외 응답은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:44 | - 인증 실패 응답은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| Gap | `DataExportAsyncWorker#toEventFeedbackMap` | 본인이 작성한 `vibeTags`가 export에서 빠진다. | feedback schema에 vibeTags 추가 및 테스트 보강 |
| Gap | `DataExportService#getExportStatus`, admin `expire` | 자연 만료는 자동 EXPIRED 전이/파일 정리 없이 `COMPLETED + downloadUrl=null`이 되고, 관리자 수동 expire만 EXPIRED를 만든다. | 자동 만료·관리자 전이·artifact retention·Flutter 재요청 UX를 한 계약으로 정렬 |
| 확정 | request repository/status 조회 | 재요청은 새 row를 만들고 기존 FAILED row를 보존하며, public status는 `createdAt DESC` 최신 row 하나를 반환한다. | 문서 계약으로 유지 |

## 9. 수용 기준

- **AC-01. 처음으로 데이터 내보내기를 요청한다**: Given 로그인됨, 기존 export 요청 없음 또는 status 조회 실패 When 사용자가 해당 흐름을 실행하면 Then 최신 export 요청이 `PROCESSING` 상태로 존재한다.
- **AC-02. 처리 중 상태를 확인한다**: Given 최신 요청 status가 `PROCESSING` When 사용자가 해당 흐름을 실행하면 Then 사용자는 요청이 아직 처리 중임을 확인한다.
- **AC-03. 완료된 JSON 파일을 다운로드한다**: Given 최신 요청 status가 `COMPLETED`, `fileKey` 존재, 미만료 When 사용자가 상태를 조회하면 Then 서버가 `my-data-export.json`용 presigned GET URL을 발급하고 사용자는 외부 앱으로 연다.
- **AC-04. 내보내기 작업이 실패한다**: Given worker가 최신 요청을 FAILED로 변경 When 사용자가 다시 요청하면 Then 새 PROCESSING row가 생기고 기존 FAILED row는 보존되며 화면은 최신 row를 표시한다.
- **AC-05. 완료 파일이 자연 만료된다**: Given 최신 요청이 COMPLETED이고 `expiresAt <= now`, 관리자 expire 미실행 When public status를 조회하면 Then `downloadUrl=null`이고 status는 COMPLETED다. 관리자 expire를 실행한 경우에만 EXPIRED다.
