# F04-11. 사진첩 (앨범 + 사진) PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-10; unit: business_logic/units/04_club/F04-11_photo-album -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-11_photo-album`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽 멤버가 앨범을 만들고 사진을 모아 올리는 사진첩 기능. 앨범 단위로 사진 그리드/뷰어를 제공하고, 본인 사진은 자기 삭제·일괄 삭제 가능, OWNER/ADMIN은 모든 사진/앨범 관리 가능. 사진 업로드는 클라이언트가 S3 presigned URL로 원본 PUT 후, `completeUpload`를 호출해 PENDING→COMPLETED 전환까지 완료해야 서버에 정상 등록된다.

**이미지 업로드 완료 수정 (2026-06-10)**: presigned URL 발급 → S3 PUT → `completeUpload`(`POST /api/v1/files/{fileId}/complete`) 순서가 필수다. `completeUpload` 미호출 시 FileMetadata가 PENDING 상태로 남아 24h 후 파일이 소실된다. 사진첩 업로드 화면(`photo_upload_screen.dart`)은 `ImageUploadHelper.uploadImageFileWithId`를 통해 이 흐름을 수행한다(`community_app/lib/presentation/club/community/screens/photo_upload_screen.dart:343`).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ 커뮤니티 ▶ "사진첩" 탭 (SCR-CC-009)
- 게시글 본문 내 사진 → 이미지 뷰어(별 이슈)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-11_photo-album/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-11_photo-album/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-11_photo-album/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-11_photo-album/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:33` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:41` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:50` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:60` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:69` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:78` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:88` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java:98` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **앨범 목록**: `photoAlbumNotifierProvider(clubId)` ▶ `ClubPhotoRepository.getAlbums(...)` ▶ `GET /photo-albums`
2. **앨범 생성**: 다이얼로그 → `ClubPhotoRepository.createAlbum(clubId, PhotoAlbumAddParam)` ▶ `POST` ▶ invalidate
3. **사진 목록**: `photoNotifierProvider(clubId, albumId)` ▶ `getPhotos(...)` ▶ `GET /photo-albums/{albumId}/photos`
4. **업로드 화면**: `photoUploadNotifierProvider(clubId, albumId)` 상태 머신 (`pending/uploading/uploaded/failed`)
   - presigned URL fetch (file API)
   - S3 PUT
   - `ClubPhotoRepository.uploadPhoto(clubId, albumId, ClubPhotoAddParam{fileKey,...})` ▶ `POST .../photos`
5. **단건 삭제**: 사진 뷰어/그리드 → `deletePhoto` ▶ `DELETE`
6. **일괄 삭제**: 선택 모드 → `batchDeletePhotos(PhotoBatchDeleteParam{photoIds})` ▶ `POST .../batch-delete`

## 4. 서버 계약

### 개요

클럽 멤버가 앨범을 만들고 사진을 모아 올리는 사진첩 기능. 앨범 단위로 사진 그리드/뷰어를 제공하고, 본인 사진은 자기 삭제·일괄 삭제 가능, OWNER/ADMIN은 모든 사진/앨범 관리 가능. 사진 업로드는 클라이언트가 S3 presigned URL로 원본 PUT 후, `completeUpload`로 COMPLETED 전환까지 완료해야 서버에 정상 등록된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/clubs/{clubId}/photo-albums` | `ClubPhotoAlbumController#getAlbums` | required | 앨범 페이지 목록 |
| POST | `/api/v1/clubs/{clubId}/photo-albums` | `ClubPhotoAlbumController#createAlbum` | required | 앨범 생성 (멤버 누구나) |
| PUT | `/api/v1/clubs/{clubId}/photo-albums/{albumId}` | `ClubPhotoAlbumController#updateAlbum` | required | 앨범 수정 (작성자 또는 OWNER/ADMIN) |
| DELETE | `/api/v1/clubs/{clubId}/photo-albums/{albumId}` | `ClubPhotoAlbumController#deleteAlbum` | required | 앨범 + 사진 삭제 (작성자 또는 OWNER/ADMIN) |
| GET | `/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos` | `ClubPhotoAlbumController#getPhotos` | required | 사진 페이지 목록 |
| POST | `/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos` | `ClubPhotoAlbumController#uploadPhoto` | required | 사진 메타 등록 (S3 PUT 이후) |
| DELETE | `/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos/{photoId}` | `ClubPhotoAlbumController#deletePhoto` | required | 단건 삭제 (업로더 또는 OWNER/ADMIN) |
| POST | `/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos/batch-delete` | `ClubPhotoAlbumController#batchDeletePhotos` | required | 일괄 삭제 |

> **업로드 필수 3단계**: 클라이언트는 1) `POST /api/v1/files/presigned-url` 발급 → 2) S3에 원본 PUT → 3) `POST /api/v1/files/{fileId}/complete`(`completeUpload`) 호출(PENDING→COMPLETED 전환). `completeUpload` 미호출 시 FileMetadata가 PENDING으로 남아 24h 후 소실. 앱은 `ImageUploadHelper.uploadImageFileWithId`를 통해 이 3단계를 수행(`community_app/lib/core/utils/image_upload_helper.dart:117-162`). (해당 file 엔드포인트는 본 Unit 04 범위 외)

### 의존 단위 / 외부 시스템

- **Unit 04 자체**: `ClubAccessService`로 멤버십/스태프 검증.
- **공통 file 도메인 (외부 Unit)**: `POST /api/v1/files/presigned-url` (사전 업로드용). 본 Unit 외.
- **외부 시스템**: AWS S3 (원본 + 썸네일 저장, `s3Client.deleteObject`).
- **알림**: 없음 (사진 업로드는 알림 미발송).

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ 커뮤니티 ▶ "사진첩" 탭 (SCR-CC-009)
- 게시글 본문 내 사진 → 이미지 뷰어(별 이슈)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/club/community/...) | 역할 |
|---|---|---|
| `/clubs/:clubId/community/photos` | `screens/photo_album_list_screen.dart` | 앨범 그리드 (SCR-CC-009) |
| `/clubs/:clubId/community/photos/:albumId` | `screens/photo_album_detail_screen.dart` | 앨범 사진 그리드 (SCR-CC-010) |
| `/clubs/:clubId/community/photos/:albumId/upload` | `screens/photo_upload_screen.dart` | 일괄 업로드 (SCR-CC-011) |

라우트 상수: `Routes.clubPhotos` / `clubPhotoAlbum` / `clubPhotoUpload` (`core/router/routes.dart:58-60`).

### 화면별 구성 요소 & 액션

### 앨범 목록 (`photo_album_list_screen.dart`)
- **사용자가 보는 것**:
  - 2-column GridView, 셀: 커버 이미지(1:1), 앨범명(2줄), "📷 {photoCount}장"
  - 빈 상태: "아직 앨범이 없습니다"
  - FAB(+): 앨범 생성 (멤버 누구나 가능 — 서버는 `validateMembership`)
- **액션**:
  - 카드 탭 ▶ `context.go('/clubs/{clubId}/community/photos/{albumId}')`
  - FAB ▶ `album_create_dialog.dart` 표시 → 제목/설명 입력 → `POST /photo-albums` ▶ invalidate
  - 풀투리프레시 ▶ `photoAlbumNotifier.refresh()`
- **상태 분기**: 로딩 `SkeletonLoader(card)`, 에러/빈 상태 처리.
- **위젯**: `widgets/album_card.dart`, `album_create_dialog.dart`.

### 앨범 상세 (`photo_album_detail_screen.dart`)
- **사용자가 보는 것**:
  - 헤더: 앨범명, "{photoCount}장 / 업로더 N명"
  - 우상단: "선택" 버튼 + ⋮ 더보기 (앨범 수정/삭제 — 작성자/ADMIN만)
  - 3-column 사진 그리드 (`photo_grid.dart`), 정사각형 썸네일, 간격 2dp
  - 우하단 업로드 FAB(📷)
- **액션**:
  - 사진 탭 ▶ `photo_viewer.dart` (스와이프 + 핀치 줌, 하단에 업로더/일자)
  - "선택" 탭 ▶ 다중 선택 모드 진입 (`photo_selection_bar.dart`):
    - 체크박스 토글 → 선택 카운터 갱신
    - 하단 [전체 선택] / [다운로드] 액션, 상단 [삭제] 노출
    - 삭제 ▶ `POST /photos/batch-delete` (`{photoIds: [...]}`) ▶ 권한 미달 시 토스트
  - 업로드 FAB ▶ 업로드 화면으로 이동
  - ⋮ → "앨범 수정" / "앨범 삭제" → 다이얼로그 후 `PUT/DELETE /photo-albums/{albumId}`
- **상태 분기**: 빈 상태 "아직 사진이 없어요" + "사진 올리기" 버튼.

### 사진 업로드 (`photo_upload_screen.dart`)
- **사용자가 보는 것**:
  - 헤더 "사진 업로드", 우측 "완료"
  - 선택 카운터 "선택된 사진 (n/10)"
  - 가로 스크롤 프리뷰 (80x80, ✕로 제거)
  - "[+] 사진 추가하기" 버튼 → 갤러리/카메라
  - 업로드 진행 중: 개별 LinearProgressBar(파일명 + %), 전체 ProgressBar
  - 하단 BottomCTA "업로드 시작" → 진행 중에는 "업로드 중..."
- **액션**:
  - 사진 추가 ▶ image_picker / camera (네이티브 권한 요청)
  - 클라이언트 측 리사이징 (원본 1920px, 썸네일 200x200) — 스펙
  - 각 파일에 대해:
    1. `POST /api/v1/files/presigned-url` (외부 Unit)
    2. S3에 PUT
    3. 모두 끝나면 일괄적으로 `POST /clubs/{clubId}/photo-albums/{albumId}/photos`(파일별)
  - "완료" → `context.pop()` + 앨범 invalidate

### API 호출 순서 (Provider/Repository 관점)

1. **앨범 목록**: `photoAlbumNotifierProvider(clubId)` ▶ `ClubPhotoRepository.getAlbums(...)` ▶ `GET /photo-albums`
2. **앨범 생성**: 다이얼로그 → `ClubPhotoRepository.createAlbum(clubId, PhotoAlbumAddParam)` ▶ `POST` ▶ invalidate
3. **사진 목록**: `photoNotifierProvider(clubId, albumId)` ▶ `getPhotos(...)` ▶ `GET /photo-albums/{albumId}/photos`
4. **업로드 화면**: `photoUploadNotifierProvider(clubId, albumId)` 상태 머신 (`pending/uploading/uploaded/failed`)
   - presigned URL fetch (file API)
   - S3 PUT
   - `ClubPhotoRepository.uploadPhoto(clubId, albumId, ClubPhotoAddParam{fileKey,...})` ▶ `POST .../photos`
5. **단건 삭제**: 사진 뷰어/그리드 → `deletePhoto` ▶ `DELETE`
6. **일괄 삭제**: 선택 모드 → `batchDeletePhotos(PhotoBatchDeleteParam{photoIds})` ▶ `POST .../batch-delete`

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 멤버가 새 앨범을 만들고 첫 사진을 올린다 (Happy Path) | 사진첩 탭, 앨범 0개. | `club_photo_album.photoCount = 5`, `coverImageKey` 설정. |
| S2 | 50장 도달 후 추가 업로드 시도 | 앨범에 이미 50장. | DB 변경 없음. (잠재 개선: 사전 photoCount 체크) |
| S3 | 일괄 삭제 (본인 사진만) | 일반 MEMBER, 본인이 올린 흐릿한 사진 3장을 한꺼번에 지우고 싶다. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 일괄 삭제 (남의 사진 포함, 비-ADMIN) | 일반 MEMBER가 본인 사진 2장 + 남의 사진 1장 선택. | 변경 없음. |
| S5 | ADMIN이 부적절한 앨범 통째로 삭제 | 시나리오 본문 참조 | 앨범 + 사진 메타 + S3 객체(가능한 한) 삭제. |
| S6 | 비멤버가 앨범 접근 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | S3 업로드 실패 (네트워크 끊김) | 시나리오 본문 참조 | 사용자가 명시적 재시도해야 마무리됨. |
| S8 | 앨범 작성자가 제목 수정 | 시드 앨범(albumId=1295) 존재, 멤버는 사진 업로드 권한 보유. | 사용자는 갤러리 picker로 진입할 수 있다 (S1의 갤러리 5장 선택 단계). |

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
| 후보 | scenarios.md:85 | ### S1 보강 — 앨범 상세 메타 카피 + `'선택'` 모드 진입 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 멤버가 새 앨범을 만들고 첫 사진을 올린다 (Happy Path)**: Given 사진첩 탭, 앨범 0개. When 사용자가 해당 흐름을 실행하면 Then `club_photo_album.photoCount = 5`, `coverImageKey` 설정.
- **AC-02. 50장 도달 후 추가 업로드 시도**: Given 앨범에 이미 50장. When 사용자가 해당 흐름을 실행하면 Then DB 변경 없음. (잠재 개선: 사전 photoCount 체크)
- **AC-03. 일괄 삭제 (본인 사진만)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 일괄 삭제 (남의 사진 포함, 비-ADMIN)**: Given 일반 MEMBER가 본인 사진 2장 + 남의 사진 1장 선택. When 사용자가 해당 흐름을 실행하면 Then 변경 없음.
- **AC-05. ADMIN이 부적절한 앨범 통째로 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 앨범 + 사진 메타 + S3 객체(가능한 한) 삭제.
- **AC-06. 비멤버가 앨범 접근**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. S3 업로드 실패 (네트워크 끊김)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 명시적 재시도해야 마무리됨.
- **AC-08. 앨범 작성자가 제목 수정**: Given 시드 앨범(albumId=1295) 존재, 멤버는 사진 업로드 권한 보유. When 사용자가 해당 흐름을 실행하면 Then 사용자는 갤러리 picker로 진입할 수 있다 (S1의 갤러리 5장 선택 단계).

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
