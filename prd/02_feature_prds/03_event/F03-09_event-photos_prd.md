# F03-09. 이벤트 사진첩 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/03_event/F03-09_event-photos -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/03_event/F03-09_event-photos`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이벤트 종료 후 일정 기간 동안 참석자(ATTENDING)가 사진을 공유하는 임시 앨범. 첫 업로드 시 lazy 하게 앨범 생성, 업로드는 S3 presigned URL (Unit 횡단 file 도메인) 로 진행한 뒤 본 API 에 fileKey 등록. 만료 시각이 지나면 업로드 차단, 만료 후 별도 스케줄러(`EventPhotoCleanupScheduler`)가 cleanup 수행. 본 단위는 앨범/사진 CRUD 만 다룬다 — S3 presigned URL 발급은 `file/FileController` 영역.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 (`SCR-EV-002`) → "사진첩" 아이콘/탭 → `/home/events/:eventId/photos`
- 라우터 가드: `_redirectEventAccess(hostOrAttending)` — 비참석자는 진입 차단

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/03_event/F03-09_event-photos/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/03_event/F03-09_event-photos/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/03_event/F03-09_event-photos/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/03_event/F03-09_event-photos/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventPhotoController.java:26` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventPhotoController.java:33` | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/controller/EventPhotoController.java:42` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 사진첩 (`event_photos_screen.dart`)

- **권한 가드** (라우터 외 추가 가드): `eventPermissionProvider(eventId).canViewPhotos == false` 일 때 `AppEmptyState(icon: lock_outline, title: '참석 확정된 사용자만 볼 수 있는 갤러리입니다')` 노출.
- **사용자가 보는 것**:
  - 만료 안내 배너 — `expiresAt != null` 시 항상 노출. 만료 전: warning50 배경 "${daysLeft}일 후 사진첩이 만료됩니다", 만료 후: "사진 업로드 기간이 만료되었습니다" + `timer_off` 아이콘
  - "사진 N장" 헤더 텍스트
  - 2-열 GridView (`crossAxisCount: 2`, spacing: AppSpacing.space2 ≒ 8)
  - 각 셀 `PhotoThumbnail(imageUrl: photo.fileKey, uploaderName: photo.uploaderNickname)`
  - FAB (`Icons.add_a_photo`, primary500) — **만료된 앨범에서는 숨김**
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 → `eventPhotoNotifier.refresh()`
  - 썸네일 탭 → `MaterialPageRoute(PhotoFullscreenViewer(photos, initialIndex, canDelete: photo.uploaderId == currentUserId, onDelete))` 로 push (모달 X, full screen)
  - FAB 탭 → `PhotoUploadSheet.show(onUpload)`
  - 풀스크린 뷰어에서 본인 사진 삭제 시 `AppDialog.confirm(title: '사진 삭제', message: '이 사진을 삭제하시겠습니까?', isDangerous: true)` → `eventPhotoNotifier.deletePhoto(photoId)`
- **상태 분기**: 로딩 (Spinner) / 에러 (`AppErrorState(title: '사진을 불러올 수 없습니다')`) / 빈 상태 (`AppEmptyState(title: '아직 사진이 없습니다')`)

### 업로드 BottomSheet (`photo_upload_sheet.dart`)

- 갤러리/카메라 선택, 캡션 입력 후 결과 객체(`PhotoUploadResult{file, caption}`) 콜백 반환
- 화면 측 `_uploadPhoto(context, ref, eventId, result)` 가 후속 처리:
  1. `fileRepository.generatePresignedUrl(fileName, mimeType, purpose: 'EVENT_PHOTO', fileSize)` — Unit 횡단 file API
  2. 성공 시 `signedResult.uploadUrl` 로 `fileRepository.uploadFile(uploadUrl, bytes, mimeType)` (S3 PUT)
  3. 성공 시 `eventPhotoNotifier.addPhoto(EventPhotoAddParam(fileKey, originalFileName, caption))` ▶ `POST /api/v1/events/{id}/photos`
  4. 성공 시 `AppToast.show("사진이 업로드되었습니다", success)`
  5. 어느 단계든 실패 시 `showApiErrorToast(fallback: '파일 업로드에 실패했습니다' / '사진 등록에 실패했습니다' / '업로드 URL 생성에 실패했습니다')`

## 4. 서버 계약

### 개요

이벤트 종료 후 일정 기간 동안 참석자(ATTENDING)가 사진을 공유하는 임시 앨범. 첫 업로드 시 lazy 하게 앨범 생성, 업로드는 S3 presigned URL (Unit 횡단 file 도메인) 로 진행한 뒤 본 API 에 fileKey 등록. 만료 시각이 지나면 업로드 차단, 만료 후 별도 스케줄러(`EventPhotoCleanupScheduler`)가 cleanup 수행. 본 단위는 앨범/사진 CRUD 만 다룬다 — S3 presigned URL 발급은 `file/FileController` 영역.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/events/{eventId}/photos` | `EventPhotoController#getPhotos` | 참석자 또는 호스트/공동호스트 | 앨범 + 사진 목록 (createdAt DESC) |
| POST | `/api/v1/events/{eventId}/photos` | `EventPhotoController#uploadPhoto` | 참석자 또는 호스트/공동호스트 | 사진 등록 (S3 presigned 업로드 완료 후 fileKey 전달) |
| DELETE | `/api/v1/events/{eventId}/photos/{photoId}` | `EventPhotoController#deletePhoto` | 업로더 본인 또는 호스트 | 사진 삭제 + S3 객체 삭제 |
| PATCH | `/api/v1/events/{eventId}/photos/{photoId}/hide` | `EventPhotoController#hidePhoto` | 호스트/공동호스트/클럽 매니저 | 사진 soft-숨김 또는 숨김 해제 (Wave B-8, `EventPhotoHideParam`) |

### 구조화 숨김 사유 (PhotoHideReasonCode) — Wave B-8 (갱신 2026-06-05)

> 소스: `PhotoHideReasonCode.java`, `EventPhotoHideParam.java`, `EventPhotoService.java:565-627`.

운영자가 `PATCH .../photos/{photoId}/hide` 호출 시 `EventPhotoHideParam` body를 전달한다:

- `hidden` (`Boolean`, `@NotNull`) — true=숨김, false=숨김 해제
- `reasonCode` (`PhotoHideReasonCode`, nullable) — 숨김 시 사유 코드. null이면 서비스 레이어에서 `MANUAL`로 자동 보정
- `reasonText` (`String`, max 500, nullable) — 자유 텍스트 (운영자 보충)

**PhotoHideReasonCode 전체 7종** (`PhotoHideReasonCode.java`):

| 값 | 의미 |
|---|---|
| `INAPPROPRIATE` | 부적절한 내용 (욕설/혐오/선정성) |
| `HARASSMENT` | 특정 참석자 괴롭힘/모욕 |
| `OFF_TOPIC` | 모임과 무관한 사진 |
| `PRIVACY_VIOLATION` | 개인정보/PII 노출 |
| `COPYRIGHT` | 저작권 침해 |
| `OTHER` | 기타 (reasonText 보충 권장) |
| `MANUAL` | 사유 미지정 호환 케이스 (Wave B-8 이전 호출자) |

### Soft-delete / Legal hold 정책 (Wave B-8, 갱신 2026-06-05)

> 소스: `EventPhotoService.java:565-627`.

- **숨김(`hidden=true`)**: `reasonCode` + `reasonText` + 조치자 + 시각을 audit 컬럼에 기록. 일반 참석자 조회에서 제외. 운영자에게만 표시.
- **숨김 해제(`hidden=false`)**: 신고가 `PENDING`/`IN_REVIEW` 상태로 진행 중이면 **unhide 차단** (legal hold) — `EventPhotoService.java:604-606`. 신고 종결 또는 없을 때만 숨김 해제 가능하며 `hidden_reason_*` 컬럼 초기화.
- 신고 진행 중인 사진은 호스트/공동호스트 삭제 불가 (동일 legal hold 정책).

### 의존 단위 / 외부 시스템

- **횡단 file 도메인** — Flutter 가 `POST /api/v1/files/presigned-url` 로 업로드 URL 받고 S3 PUT 직접 수행. 본 단위 API 는 fileKey 만 받아 등록.
- **AWS S3** — 삭제 시 `DeleteObject` (best-effort, 실패해도 DB 삭제는 진행)
- **F03-07/F03-05** — `validateAttendee` 의 ATTENDING 검증으로 결합. 참석 취소(F03-07/05) 가 발생해도 이미 업로드한 사진 자체는 삭제되지 않으나 그 시점부터 업로드/조회 권한은 잃음.
- **`EventPhotoCleanupScheduler`** — 만료된 앨범의 S3 객체 정리 + `status=CLEANED` 마킹 (운영용 배치)

## 5. 프론트 계약

### 진입 경로

- 이벤트 상세 (`SCR-EV-002`) → "사진첩" 아이콘/탭 → `/home/events/:eventId/photos`
- 라우터 가드: `_redirectEventAccess(hostOrAttending)` — 비참석자는 진입 차단

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/photos` | `event_photos_screen.dart` | 그리드 사진첩 + 업로드 FAB + 풀스크린 뷰어 진입 |

위젯:
- `widgets/photo_thumbnail.dart` — 정사각 썸네일 + 업로더 닉네임 오버레이
- `widgets/photo_fullscreen_viewer.dart` — 좌우 스와이프 풀스크린 + 삭제 옵션
- `widgets/photo_upload_sheet.dart` — 갤러리/카메라 선택 + 캡션 입력 BottomSheet

### 화면별 구성 요소 & 액션

### 사진첩 (`event_photos_screen.dart`)

- **권한 가드** (라우터 외 추가 가드): `eventPermissionProvider(eventId).canViewPhotos == false` 일 때 `AppEmptyState(icon: lock_outline, title: '참석 확정된 사용자만 볼 수 있는 갤러리입니다')` 노출.
- **사용자가 보는 것**:
  - 만료 안내 배너 — `expiresAt != null` 시 항상 노출. 만료 전: warning50 배경 "${daysLeft}일 후 사진첩이 만료됩니다", 만료 후: "사진 업로드 기간이 만료되었습니다" + `timer_off` 아이콘
  - "사진 N장" 헤더 텍스트
  - 2-열 GridView (`crossAxisCount: 2`, spacing: AppSpacing.space2 ≒ 8)
  - 각 셀 `PhotoThumbnail(imageUrl: photo.fileKey, uploaderName: photo.uploaderNickname)`
  - FAB (`Icons.add_a_photo`, primary500) — **만료된 앨범에서는 숨김**
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 → `eventPhotoNotifier.refresh()`
  - 썸네일 탭 → `MaterialPageRoute(PhotoFullscreenViewer(photos, initialIndex, canDelete: photo.uploaderId == currentUserId, onDelete))` 로 push (모달 X, full screen)
  - FAB 탭 → `PhotoUploadSheet.show(onUpload)`
  - 풀스크린 뷰어에서 본인 사진 삭제 시 `AppDialog.confirm(title: '사진 삭제', message: '이 사진을 삭제하시겠습니까?', isDangerous: true)` → `eventPhotoNotifier.deletePhoto(photoId)`
- **상태 분기**: 로딩 (Spinner) / 에러 (`AppErrorState(title: '사진을 불러올 수 없습니다')`) / 빈 상태 (`AppEmptyState(title: '아직 사진이 없습니다')`)

### 업로드 BottomSheet (`photo_upload_sheet.dart`)

- 갤러리/카메라 선택, 캡션 입력 후 결과 객체(`PhotoUploadResult{file, caption}`) 콜백 반환
- 화면 측 `_uploadPhoto(context, ref, eventId, result)` 가 후속 처리:
  1. `fileRepository.generatePresignedUrl(fileName, mimeType, purpose: 'EVENT_PHOTO', fileSize)` — Unit 횡단 file API
  2. 성공 시 `signedResult.uploadUrl` 로 `fileRepository.uploadFile(uploadUrl, bytes, mimeType)` (S3 PUT)
  3. 성공 시 `eventPhotoNotifier.addPhoto(EventPhotoAddParam(fileKey, originalFileName, caption))` ▶ `POST /api/v1/events/{id}/photos`
  4. 성공 시 `AppToast.show("사진이 업로드되었습니다", success)`
  5. 어느 단계든 실패 시 `showApiErrorToast(fallback: '파일 업로드에 실패했습니다' / '사진 등록에 실패했습니다' / '업로드 URL 생성에 실패했습니다')`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 사진 업로드 (앨범 lazy 생성) | 이벤트 종료 1시간 전, ATTENDING 인 참석자, `event_photo_album` 행 없음 | `event_photo_album` 1행, `event_photo` 1행, S3 객체 1개 |
| S2 | 추가 사진 업로드 (앨범 존재) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 만료 임박 배너 노출 | 이벤트 종료 후 (`ALBUM_EXPIRY_DAYS - 2`) 일 경과 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 만료 후 진입 (업로드 차단) | `now > album.expiresAt` | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 100장 제한 도달 | `album.photoCount = 100` | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 본인 업로드 사진 삭제 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 호스트가 부적절한 타인 사진 삭제 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 비참석자 진입 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 업로드 중 네트워크 끊김 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:76 | - 클라이언트 측 파일 크기/형식 제약: 코드에서 명시 검증 없음 — `mime` 으로 type 추정 후 그대로 업로드, 서버/S3 가 차단 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:27 | [E2E 보강: seed_event_post_attendance_surfaces_test.dart::photo_gallery_surface (E2E_EXPECT_PHOTOS_ACCESS=true) — 참석 확정 사용자가 상세에서 "사진첩" CTA 탭 → `screenEventPhotos`로 진입, 헤더 "사진첩" 노출. 권한 게이트는 라우터 redirect로 처리되어 ATTENDING 사용자는 직접 진입 가능.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 사진 업로드 (앨범 lazy 생성)**: Given 이벤트 종료 1시간 전, ATTENDING 인 참석자, `event_photo_album` 행 없음 When 사용자가 해당 흐름을 실행하면 Then `event_photo_album` 1행, `event_photo` 1행, S3 객체 1개
- **AC-02. 추가 사진 업로드 (앨범 존재)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 만료 임박 배너 노출**: Given 이벤트 종료 후 (`ALBUM_EXPIRY_DAYS - 2`) 일 경과 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 만료 후 진입 (업로드 차단)**: Given `now > album.expiresAt` When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 100장 제한 도달**: Given `album.photoCount = 100` When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 본인 업로드 사진 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 호스트가 부적절한 타인 사진 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 비참석자 진입 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 업로드 중 네트워크 끊김**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.

## 11. 변경 이력

- **2026-06-05 (Wave B-8 — 구조화 숨김 사유 + soft-delete/legal hold)**: `PATCH /api/v1/events/{eventId}/photos/{photoId}/hide` 신규 엔드포인트 추가 (`EventPhotoController.java:134`). `PhotoHideReasonCode` 7종 — INAPPROPRIATE/HARASSMENT/OFF_TOPIC/PRIVACY_VIOLATION/COPYRIGHT/OTHER/MANUAL (소스: `PhotoHideReasonCode.java`). `EventPhotoHideParam` — `hidden`(필수), `reasonCode`(null시 MANUAL 보정), `reasonText`(max500). Legal hold 정책: 신고 진행 중 사진은 unhide 및 삭제 차단 (소스: `EventPhotoService.java:565-627`).
