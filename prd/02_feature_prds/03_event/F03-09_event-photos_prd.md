# F03-09. 이벤트 사진첩 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

이벤트 종료 후 일정 기간 동안 참석자(ATTENDING)가 사진을 공유하는 임시 앨범. 첫 업로드 시 lazy 하게 앨범 생성, 업로드는 S3 presigned URL (Unit 횡단 file 도메인) 로 진행한 뒤 본 API 에 fileKey 등록. 만료 시각이 지나면 업로드 차단, 만료 후 별도 스케줄러(`EventPhotoCleanupScheduler`)가 cleanup 수행. 본 단위는 앨범/사진 CRUD 만 다룬다 — S3 presigned URL 발급은 `file/FileController` 영역.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 (`SCR-EV-002`) → "사진첩" 아이콘/탭 → `/home/events/:eventId/photos`
- 라우터 가드: `_redirectEventAccess(hostOrAttending)` — 비참석자는 진입 차단

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventPhotoController`, `FileController`, `PhotoHideReasonCode`, `EventPhotoHideParam`, `EventPhotoService`. 앱: `event_photos_screen.dart`, `photo_thumbnail.dart`, `photo_fullscreen_viewer.dart`, `photo_upload_sheet.dart`.

<!-- source-references:start -->
서버 창구: `EventPhotoController#getPhotos`, `EventPhotoController#uploadPhoto`, `EventPhotoController#deletePhoto`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 보기·올리기는 사진 운영자 또는 실제 `ATTENDING` 참석자다. 참석을 취소하면 올린 사진은 남지만 그 뒤로 보기·올리기를 못 한다.
- 삭제는 올린 사람 또는 운영자다. 저장소 파일은 삭제가 확정된 뒤 지운다.
- 숨김은 호스트·공동호스트·클럽 매니저가 한다. 숨긴 사진은 일반 참석자에게 보이지 않는다. 사유 코드와 보충 글(500자), 조치자, 시각을 남긴다.
- 사유: `INAPPROPRIATE`, `HARASSMENT`, `OFF_TOPIC`, `PRIVACY_VIOLATION`, `COPYRIGHT`, `OTHER`. 사유를 비우면 `MANUAL` 이다.
- 미종결 신고(`PENDING`·`IN_REVIEW`·`ESCALATED`)가 있으면 올린 사람과 운영자 모두 지우지 못하고 숨김도 풀지 못한다(`EVENT_PHOTO_LEGAL_HOLD`). 숨기는 것은 막지 않는다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 사진 크기·형식 | 앱은 고를 때 사진을 줄이고(가로 1920, 품질 85) 올리기 전에 10MB 상한을 본다. 형식은 확장자로 정해 보내고 서버가 크기와 형식을 다시 본다 | 없음 |
| 해소됨 | 시험 보강 기록 | 참석 확정 회원의 사진첩 입구의 시험 보강 기록이다. 결함이 아니다 | 없음 |

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
