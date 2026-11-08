# F04-11. 사진첩 (앨범 + 사진) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

클럽 멤버가 앨범을 만들고 사진을 모아 올리는 사진첩 기능. 앨범 단위로 사진 그리드/뷰어를 제공하고, 본인 사진은 자기 삭제·일괄 삭제 가능, OWNER/ADMIN은 모든 사진/앨범 관리 가능. 사진 업로드는 클라이언트가 S3 presigned URL로 원본 PUT 후, `completeUpload`를 호출해 PENDING→COMPLETED 전환까지 완료해야 서버에 정상 등록된다.

**이미지 업로드 완료 수정 (2026-06-10)**: presigned URL 발급 → S3 PUT → `completeUpload`(`POST /api/v1/files/{fileId}/complete`) 순서가 필수다. `completeUpload` 미호출 시 FileMetadata가 PENDING 상태로 남아 24h 후 파일이 소실된다. 사진첩 업로드 화면(`photo_upload_screen.dart`)은 `ImageUploadHelper.uploadImageFileWithId`를 통해 이 흐름을 수행한다(`community_app/lib/presentation/club/community/screens/photo_upload_screen.dart:343`).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ 커뮤니티 ▶ "사진첩" 탭 (SCR-CC-009)
- 게시글 본문 내 사진 → 이미지 뷰어(별 이슈)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubPhotoAlbumController`, `ClubAccessService`. 앱: `photo_album_list_screen.dart`, `photo_album_detail_screen.dart`, `photo_upload_screen.dart`, `image_upload_helper.dart`, `routes.dart`, `album_create_dialog.dart`, `album_card.dart`, `photo_grid.dart`, `photo_viewer.dart`, `photo_selection_bar.dart`.

<!-- source-references:start -->
서버 창구: `ClubPhotoAlbumController#getAlbums`, `ClubPhotoAlbumController#createAlbum`, `ClubPhotoAlbumController#updateAlbum`, `ClubPhotoAlbumController#deleteAlbum`, `ClubPhotoAlbumController#getPhotos`, `ClubPhotoAlbumController#uploadPhoto`, `ClubPhotoAlbumController#deletePhoto`, `ClubPhotoAlbumController#batchDeletePhotos`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **앨범 목록**: `photoAlbumNotifierProvider(clubId)` ▶ `ClubPhotoRepository.getAlbums(...)` ▶ `GET /photo-albums`
2. **앨범 생성**: 다이얼로그 → `ClubPhotoRepository.createAlbum(clubId, PhotoAlbumAddParam)` ▶ `POST` ▶ invalidate
3. **사진 목록**: `photoNotifierProvider(clubId, albumId)` ▶ `getPhotos(...)` ▶ `GET /photo-albums/{albumId}/photos`
4. **업로드 화면**: `photoUploadNotifierProvider(clubId, albumId)` 상태 머신 (`pending/uploading/uploaded/failed`)
   - presigned URL fetch (file API)
   - S3 PUT
   - `ClubPhotoRepository.uploadPhoto(clubId, albumId, ClubPhotoAddParam{fileKey,...})` ▶ `POST .../photos`
5. **단건 삭제**: 사진 뷰어/그리드 → `deletePhoto` ▶ `DELETE`
6. **일괄 삭제**: 선택 모드 → `batchDeletePhotos(PhotoBatchDeleteParam{photoIds})` ▶ `POST .../batch-delete`

## 4. 제품 규칙

- 앨범은 회원 누구나 만들 수 있다(BUSINESS 클럽은 구독 만료 때 막힌다). 사진은 올린 사람 또는 OWNER·ADMIN 이 지운다.
- 앨범 하나에 사진은 50장까지다.
- 사진을 올려도 알림은 가지 않는다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 시험 보강 기록 | 앨범 상세 문구와 선택 모드 진입의 시험 보강 기록이다. 결함이 아니다 | 없음 |

## 9. 수용 기준

- **AC-01. 멤버가 새 앨범을 만들고 첫 사진을 올린다 (Happy Path)**: Given 사진첩 탭, 앨범 0개. When 사용자가 해당 흐름을 실행하면 Then `club_photo_album.photoCount = 5`, `coverImageKey` 설정.
- **AC-02. 50장 도달 후 추가 업로드 시도**: Given 앨범에 이미 50장. When 사용자가 해당 흐름을 실행하면 Then DB 변경 없음. (잠재 개선: 사전 photoCount 체크)
- **AC-03. 일괄 삭제 (본인 사진만)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 일괄 삭제 (남의 사진 포함, 비-ADMIN)**: Given 일반 MEMBER가 본인 사진 2장 + 남의 사진 1장 선택. When 사용자가 해당 흐름을 실행하면 Then 변경 없음.
- **AC-05. ADMIN이 부적절한 앨범 통째로 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 앨범 + 사진 메타 + S3 객체(가능한 한) 삭제.
- **AC-06. 비멤버가 앨범 접근**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. S3 업로드 실패 (네트워크 끊김)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 명시적 재시도해야 마무리됨.
- **AC-08. 앨범 작성자가 제목 수정**: Given 시드 앨범(albumId=1295) 존재, 멤버는 사진 업로드 권한 보유. When 사용자가 해당 흐름을 실행하면 Then 사용자는 갤러리 picker로 진입할 수 있다 (S1의 갤러리 5장 선택 단계).
