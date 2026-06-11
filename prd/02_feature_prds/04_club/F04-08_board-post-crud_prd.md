# F04-08. 게시판 & 게시글 CRUD PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-10; unit: business_logic/units/04_club/F04-08_board-post-crud -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-08_board-post-crud`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.
>
> **2026-06-10 AUTH-04/06/08 + 이미지 수정 반영**: 클럽 포스트 컴포저 고도화(AUTH-04), 예약 게시(AUTH-06, `PostStatus.SCHEDULED`), 게시글 좋아요(AUTH-08, `club_post_like` 테이블), 이미지 업로드 완료 처리(presigned → completeUpload → IDOR 검증).

## 1. 결론

클럽 멤버는 게시판 단위로 글을 작성/조회/수정/삭제하며, OWNER/ADMIN은 추가 게시판을 만들고 게시글을 고정한다. 클럽 생성 시 기본 게시판 3개(NOTICE/FREE/INTRODUCTION)가 자동 생성된다. 게시글 수정은 작성자 본인만, 삭제는 작성자 또는 OWNER/ADMIN, 고정은 OWNER/ADMIN만 가능하다. NOTICE 게시판에는 OWNER/ADMIN만 글을 쓸 수 있다.

**AUTH-06 (예약 게시)**: `PostStatus` enum에 `SCHEDULED` 값이 추가됐다(`community_api/.../club/model/PostStatus.java:5`). 작성 시 `scheduledAt` 파라미터를 넘기면 status=SCHEDULED로 생성되고 피드/목록/상세에 미노출된다. 예약 시각 도달 시 스케줄러가 ACTIVE로 전환하며, 전환 실패 시 `NotificationType.SCHEDULED_PUBLISH_FAILED`(97) 알림을 발송한다. 게시판 삭제 시 SCHEDULED 글은 DELETED 글과 달리 자유게시판으로 이동 보존된다(`ClubBoardService.java:169-180`).

**AUTH-08 (게시글 좋아요)**: `club_post_like` 테이블이 신설됐다(UNIQUE(club_post_id, user_id)). 좋아요/취소는 각각 `POST`/`DELETE` `.../posts/{postId}/like`로 분리되며 멱등(insert-if-absent / delete-if-present)이다. 비관적 락(`findForUpdateById`)으로 동시 요청을 직렬화해 UNIQUE 충돌을 방지한다. 응답 VO는 `{postId, likeCount, likedByMe}`다. 목록 API는 `likeCount`/`likedByMe`를 배치로 채운다(N+1 방지).

**이미지 수정**: 이미지 업로드는 presigned URL → S3 PUT → `completeUpload` 호출까지 완료해야 서버가 COMPLETED 상태로 인정한다. 미완료 PENDING 파일은 24h 후 소실된다. 게시글 이미지 표시는 서버 presigned downloadUrl로만 가능하며, 읽기 시 소유자(authorId) + COMPLETED + CLUB_BOARD 용도를 재검증해 IDOR를 차단한다(`ClubPostService.java:73-90`).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세(F04-02) > "클럽 홈" CTA → 클럽 커뮤니티 화면 (`/clubs/:id/community`) > "게시판" 탭
- 알림 → 댓글/멘션(F04-09)을 통해 게시글 상세로 직접 진입
- 딥링크 `community://clubs/:id/posts/:postId`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-08_board-post-crud/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-08_board-post-crud/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-08_board-post-crud/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-08_board-post-crud/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/.../club/model/PostStatus.java:3-8` (SCHEDULED/ACTIVE/DELETED) | 확인됨 |
| `community_api/.../club/model/ClubPostLike.java:15` (club_post_like 엔티티, `@Table(name="club_post_like")`) | 확인됨 |
| `community_api/src/main/resources/db/migration/V1__init.sql:3347` (UNIQUE KEY `uk_club_post_like_post_user` (`club_post_id`, `user_id`) — 실제 UNIQUE 제약 DDL) | 확인됨 |
| `community_api/.../club/vo/ClubPostLikeResultVo.java:12-16` ({postId, likeCount, likedByMe}) | 확인됨 |
| `community_api/.../club/controller/ClubPostController.java:88-106` (POST/DELETE /like 엔드포인트) | 확인됨 |
| `community_api/.../club/service/ClubPostService.java:354-396` (likePost/unlikePost, 비관적 락) | 확인됨 |
| `community_api/.../club/service/ClubPostService.java:181-208` (SCHEDULED 생성 + 예약 액션 등록) | 확인됨 |
| `community_api/.../club/service/ClubBoardService.java:169-180` (게시판 삭제 시 SCHEDULED 글 보존) | 확인됨 |
| `community_api/.../club/service/ClubPostService.java:73-90` (이미지 downloadUrl presign + IDOR 재검증) | 확인됨 |
| `community_app/lib/data/api/club_post_api.dart:60-73` (likePost/unlikePost Retrofit 정의) | 확인됨 |
| `community_app/lib/domain/providers/club/post_list_provider.dart:72-136` (낙관적 좋아요 토글+롤백) | 확인됨 |
| `community_app/lib/data/models/club/community/post_status.dart:3-14` (Flutter PostStatus — SCHEDULED 미포함, gap 확인됨) | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 게시판 목록 (`board_list_screen.dart`)

- **사용자가 보는 것**:
  - 상단 탭 바 [게시판/공지/사진첩/캘린더] (F04-08~12 공통)
  - 게시판 카드 (List): 아이콘, 게시판명, 설명, "게시글 N개 · 최근 X시간"
  - OWNER/ADMIN: "+ 게시판 추가" TextButton
- **액션**:
  - 카드 탭 ▶ `/clubs/:id/boards/:boardId/posts`
  - "게시판 추가" ▶ `BoardCreateDialog` ▶ `boardListNotifier.createBoard(BoardAddParam(name, description?))` ▶ `POST .../boards`
- **상태 분기**: 로딩/에러/빈상태

### 게시글 목록 (`post_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar 게시판명 + 검색 아이콘 (서버 미지원, UI placeholder)
  - 고정 섹션 (`PinnedPostSection`) — 고정된 게시글들 강조 표시 (필터링 또는 별도 정렬은 클라가 `pinned=true`로 분리)
  - 게시글 카드 (`PostCard`): 제목, 작성자, "댓글 N · 시간 전", 이미지 프리뷰 (최대 3개 thumbnail)
  - FAB(+) ▶ 작성 진입
- **액션**:
  - 카드 탭 ▶ 상세
  - FAB ▶ `/clubs/:id/boards/:boardId/posts/create`
  - 무한 스크롤 ▶ `loadMore()`
  - 풀투리프레시 ▶ `refresh()`

### 게시글 상세 (`post_detail_screen.dart`)

- **사용자가 보는 것**:
  - 제목 (H5 Bold), 작성자(아바타 + 이름 + 시간), 본문, 이미지 갤러리 (`ImageGrid` 2열, 탭 시 전체화면 뷰어)
  - 댓글 섹션 (F04-09)
  - 우상단 더보기 ⋮
- **액션**:
  - ⋮ → 작성자: 수정/삭제. OWNER/ADMIN: 삭제/고정 토글. 일반 멤버: 신고.
  - 수정 ▶ `/posts/:postId/edit` (post_form 프리필)
  - 삭제 ▶ 확인 다이얼로그 → `deletePost` ▶ `DELETE .../posts/:postId` ▶ pop + 토스트
  - 고정 토글 ▶ `togglePin` ▶ `PATCH .../posts/:postId/pin` ▶ refresh
  - 댓글 입력 ▶ F04-09
- **상태 분기**: 로딩(스켈레톤), 에러, DELETED 게시글 (`POST_NOT_FOUND` 안내).

### 게시글 작성/수정 (`post_create_screen.dart`, `post_edit_screen.dart`, `post_form.dart`)

- **구성**:
  - 제목 TextField (1~100자)
  - 본문 TextArea (1~3000자, 자동 확장)
  - 이미지 첨부 (`PostImagePicker`, 최대 10장, 각 5MB)
  - 글자 카운터 0/3000
  - **[AUTH-06]** 예약 게시 시각 선택 UI (선택 시 `scheduledAt` 파라미터 포함)
- **액션**:
  - 제출 (등록/저장) ▶ 1) 새 이미지는 presigned-url 발급 → S3 PUT → `completeUpload` 호출(COMPLETED 전환 필수) → fileKey 확보 2) `createPost`/`updatePost` ▶ `POST` 또는 `PUT`
  - 닫기 (✕) ▶ 작성 중 내용 있으면 이탈 확인 다이얼로그
  - 이미지 추가/삭제 ▶ `addImage`/`removeImage` (state)
- **상태 분기**:
  - validation: title 비었으면 등록 비활성, content 비었으면 등록 비활성
  - hasChanges: 수정 시 변경 없으면 저장 비활성
  - **[AUTH-06]** `scheduledAt` 있으면 status=SCHEDULED 로 저장, 피드에 즉시 미노출
- **서버 에러 매핑**:
  - `POST_IMAGE_LIMIT_EXCEEDED`: "이미지는 최대 10장까지 첨부할 수 있습니다"
  - `BOARD_NO_WRITE_PERMISSION`: "공지 게시판에는 관리자만 작성할 수 있습니다"
  - `POST_NO_EDIT_PERMISSION`: "작성자만 수정할 수 있습니다"

### 게시글 좋아요 (`post_list_screen.dart`, `post_detail_screen.dart`)

- **[AUTH-08]** 각 게시글 카드에 하트 버튼 표시
- **액션**:
  - 하트 탭 ▶ 낙관적 토글(`likedByMe` + `likeCount` 즉시 반영) ▶ `POST/DELETE .../posts/{postId}/like` ▶ 서버 VO로 reconcile, 실패 시 롤백
  - 더블탭 방지: `_likeInFlight` Set으로 in-flight 요청 중 재진입 차단(`post_list_provider.dart:78`)
- **응답**: `ClubPostLikeResultVo{postId, likeCount, likedByMe}`
- **목록 배치**: `getPosts` 응답에 `likeCount`/`likedByMe` 배치 포함(N+1 방지, `ClubPostService.java:103-116`)

## 4. 서버 계약

### 개요

클럽 멤버는 게시판 단위로 글을 작성/조회/수정/삭제하며, OWNER/ADMIN은 추가 게시판을 만들고 게시글을 고정한다. 클럽 생성 시 기본 게시판 3개(NOTICE/FREE/INTRODUCTION)가 자동 생성된다. 게시글 수정은 작성자 본인만, 삭제는 작성자 또는 OWNER/ADMIN, 고정은 OWNER/ADMIN만 가능하다. NOTICE 게시판에는 OWNER/ADMIN만 글을 쓸 수 있다.

### 엔드포인트 요약

### 게시판 (`/api/v1/clubs/{clubId}/boards`)

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/clubs/{clubId}/boards | ClubBoardController#getBoards | required (멤버) | 게시판 목록 (List, **Page 아님**) |
| POST | /api/v1/clubs/{clubId}/boards | ClubBoardController#createBoard | required (OWNER/ADMIN) | 커스텀 게시판 생성 |
| PUT | /api/v1/clubs/{clubId}/boards/{boardId} | ClubBoardController#updateBoard | required (OWNER/ADMIN) | 수정 |
| DELETE | /api/v1/clubs/{clubId}/boards/{boardId} | ClubBoardController#deleteBoard | required (OWNER/ADMIN) | 삭제 (기본 게시판 삭제 불가) |

### 게시글 (`/api/v1/clubs/{clubId}/boards/{boardId}/posts`)

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | .../posts | ClubPostController#getPosts | required (멤버) | 게시글 목록 (Page) — `likeCount`/`likedByMe` 배치 포함 |
| GET | .../posts/{postId} | ClubPostController#getPost | required (멤버) | 상세 + viewCount +1 + `likeCount`/`likedByMe` |
| POST | .../posts | ClubPostController#createPost | required (멤버, NOTICE는 staff만) | 작성. `scheduledAt` 있으면 status=SCHEDULED |
| PUT | .../posts/{postId} | ClubPostController#updatePost | required (작성자 본인) | 수정 |
| DELETE | .../posts/{postId} | ClubPostController#deletePost | required (작성자 or OWNER/ADMIN) | 삭제 (soft, SCHEDULED 글도 삭제 가능) |
| PATCH | .../posts/{postId}/pin | ClubPostController#togglePin | required (OWNER/ADMIN) | 고정 토글 |
| POST | .../posts/{postId}/like | ClubPostController#likePost | required (멤버) | 좋아요 (멱등 insert-if-absent, 비관적 락) |
| DELETE | .../posts/{postId}/like | ClubPostController#unlikePost | required (멤버) | 좋아요 취소 (멱등 delete-if-present, 비관적 락) |

### PostStatus enum (`community_api/.../club/model/PostStatus.java:3-8`)

| 값 | 의미 | 피드 노출 |
|---|---|---|
| SCHEDULED | 예약 발행 대기 (scheduledAt 미도달) | 미노출 |
| ACTIVE | 공개 | 노출 |
| DELETED | soft-delete | 미노출 |

> **Flutter 불일치 (Gap)**: `community_app/lib/data/models/club/community/post_status.dart`는 `SCHEDULED`를 모르고 `active`/`deleted`만 정의한다. 예약 게시 상태를 앱에서 표시·관리하려면 Flutter enum에 `scheduled('SCHEDULED')` 추가가 필요하다.

### 의존 단위 / 외부 시스템

- **Unit 01 (account)**: 작성자 닉네임 (`@EntityGraph` author).
- **F04-09 (이 단위)**: `commentCount`는 댓글 도메인이 별도 관리 (이 도메인은 INSERT 시 0으로 시작, 댓글 생성/삭제 시 카운터 동기화는 F04-09).
- **외부 (file)**: 이미지 업로드는 `POST /api/v1/files/presigned-url` → S3 PUT → `POST /api/v1/files/{fileId}/complete`(`completeUpload`) 순서. completeUpload 미호출 시 FileMetadata가 PENDING으로 남아 24h 후 소실됨. 서버는 `saveImages` 시 소유자(authorId) + COMPLETED + CLUB_BOARD purpose를 검증해 IDOR를 차단함(`ClubPostService.java:512-617`).
- **알림**: 게시글 즉시 작성 시 FCM 없음. 예약 게시 실패 시 `NotificationType.SCHEDULED_PUBLISH_FAILED`(97) 알림 발송. 댓글 알림은 F04-09.
- **예약 발행 스케줄러**: `ScheduledPublishService` + `ScheduledPublishScheduler`가 `scheduledAt` 도달 시 SCHEDULED→ACTIVE 전환.

## 5. 프론트 계약

### 진입 경로

- 클럽 상세(F04-02) > "클럽 홈" CTA → 클럽 커뮤니티 화면 (`/clubs/:id/community`) > "게시판" 탭
- 알림 → 댓글/멘션(F04-09)을 통해 게시글 상세로 직접 진입
- 딥링크 `community://clubs/:id/posts/:postId`

### 사용 라우트 & 화면 파일

| 라우트 | 파일 | 역할 |
|---|---|---|
| `/clubs/:id/community` | `community/screens/club_community_screen.dart` | 게시판/공지/사진첩/캘린더 상단 탭 묶음 |
| `/clubs/:id/community/boards` (또는 community 탭의 board 영역) | `community/screens/board_list_screen.dart` | 게시판 목록 (SCR-CC-001) |
| `/clubs/:id/boards/:boardId/posts` | `community/screens/post_list_screen.dart` | 게시글 목록 + 고정 섹션 + 좋아요 버튼 |
| `/clubs/:id/posts/:postId` | `community/screens/post_detail_screen.dart` | 게시글 상세 + 댓글(F04-09) + 좋아요 버튼 |
| `/clubs/:id/boards/:boardId/posts/create` | `community/screens/post_create_screen.dart` | 작성 (AUTH-04 컴포저 고도화, AUTH-06 예약 게시) |
| `/clubs/:id/posts/:postId/edit` | `community/screens/post_edit_screen.dart` | 수정 |
| `widgets/board_card.dart`, `board_create_dialog.dart` | 게시판 카드, 생성 다이얼로그 |
| `widgets/post_card.dart`, `pinned_post_section.dart`, `post_form.dart`, `post_image_picker.dart`, `post_more_menu.dart` | 게시글 UI |

### Retrofit API 파일 (`community_app/lib/data/api/club_post_api.dart`)

| 메서드 | 경로 | 반환 타입 |
|---|---|---|
| `likePost` | `POST /api/v1/clubs/{clubId}/boards/{boardId}/posts/{postId}/like` | `ClubPostLikeResultVo` |
| `unlikePost` | `DELETE /api/v1/clubs/{clubId}/boards/{boardId}/posts/{postId}/like` | `ClubPostLikeResultVo` |

`ClubPostLikeResultVo` 모델: `community_app/lib/data/models/club/community/club_post_like_result_vo.dart` (postId, likeCount, likedByMe).

### 화면별 구성 요소 & 액션

### 게시판 목록 (`board_list_screen.dart`)

- **사용자가 보는 것**:
  - 상단 탭 바 [게시판/공지/사진첩/캘린더] (F04-08~12 공통)
  - 게시판 카드 (List): 아이콘, 게시판명, 설명, "게시글 N개 · 최근 X시간"
  - OWNER/ADMIN: "+ 게시판 추가" TextButton
- **액션**:
  - 카드 탭 ▶ `/clubs/:id/boards/:boardId/posts`
  - "게시판 추가" ▶ `BoardCreateDialog` ▶ `boardListNotifier.createBoard(BoardAddParam(name, description?))` ▶ `POST .../boards`
- **상태 분기**: 로딩/에러/빈상태

### 게시글 목록 (`post_list_screen.dart`)

- **사용자가 보는 것**:
  - AppBar 게시판명 + 검색 아이콘 (서버 미지원, UI placeholder)
  - 고정 섹션 (`PinnedPostSection`) — 고정된 게시글들 강조 표시 (필터링 또는 별도 정렬은 클라가 `pinned=true`로 분리)
  - 게시글 카드 (`PostCard`): 제목, 작성자, "댓글 N · 시간 전", 이미지 프리뷰 (최대 3개 thumbnail)
  - FAB(+) ▶ 작성 진입
- **액션**:
  - 카드 탭 ▶ 상세
  - FAB ▶ `/clubs/:id/boards/:boardId/posts/create`
  - 무한 스크롤 ▶ `loadMore()`
  - 풀투리프레시 ▶ `refresh()`

### 게시글 상세 (`post_detail_screen.dart`)

- **사용자가 보는 것**:
  - 제목 (H5 Bold), 작성자(아바타 + 이름 + 시간), 본문, 이미지 갤러리 (`ImageGrid` 2열, 탭 시 전체화면 뷰어)
  - 댓글 섹션 (F04-09)
  - 우상단 더보기 ⋮
- **액션**:
  - ⋮ → 작성자: 수정/삭제. OWNER/ADMIN: 삭제/고정 토글. 일반 멤버: 신고.
  - 수정 ▶ `/posts/:postId/edit` (post_form 프리필)
  - 삭제 ▶ 확인 다이얼로그 → `deletePost` ▶ `DELETE .../posts/:postId` ▶ pop + 토스트
  - 고정 토글 ▶ `togglePin` ▶ `PATCH .../posts/:postId/pin` ▶ refresh
  - 댓글 입력 ▶ F04-09
- **상태 분기**: 로딩(스켈레톤), 에러, DELETED 게시글 (`POST_NOT_FOUND` 안내).

### 게시글 작성/수정 (`post_create_screen.dart`, `post_edit_screen.dart`, `post_form.dart`)

- **구성**:
  - 제목 TextField (1~100자)
  - 본문 TextArea (1~3000자, 자동 확장)
  - 이미지 첨부 (`PostImagePicker`, 최대 10장, 각 5MB)
  - 글자 카운터 0/3000
- **액션**:
  - 제출 (등록/저장) ▶ 1) `imageKeys` 중 새 파일은 presigned-url + S3 PUT 후 fileKey 사용 2) `createPost`/`updatePost` ▶ `POST` 또는 `PUT`
  - 닫기 (✕) ▶ 작성 중 내용 있으면 이탈 확인 다이얼로그
  - 이미지 추가/삭제 ▶ `addImage`/`removeImage` (state)
- **상태 분기**:
  - validation: title 비었으면 등록 비활성, content 비었으면 등록 비활성
  - hasChanges: 수정 시 변경 없으면 저장 비활성
- **서버 에러 매핑**:
  - `POST_IMAGE_LIMIT_EXCEEDED`: "이미지는 최대 10장까지 첨부할 수 있습니다"
  - `BOARD_NO_WRITE_PERMISSION`: "공지 게시판에는 관리자만 작성할 수 있습니다"
  - `POST_NO_EDIT_PERMISSION`: "작성자만 수정할 수 있습니다"

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 일반 멤버 자유게시판 글 작성 (Happy Path) | MEMBER. 후기 글 작성. | 게시글 등록. viewCount=0, pinned=false, likeCount=0, likedByMe=false. |
| S2 | NOTICE 게시판에 일반 멤버 작성 시도 (실패) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | ADMIN이 게시글 고정 토글 (Happy Path) | ADMIN. | 고정. 다시 ⋮ → "고정 해제"로 false. |
| S4 | 작성자 게시글 수정 | 작성자 본인. | 수정 반영. |
| S5 | ADMIN이 남의 글 수정 시도 (실패) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | ADMIN이 남의 글 삭제 (가능) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 게시글 상세 진입 = viewCount +1 | 시나리오 본문 참조 | 조회 카운터 정확하게 누적. |
| S8 | 삭제된 게시글 진입 (에러) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 이미지 11장 이상 첨부 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | OWNER/ADMIN이 커스텀 게시판 생성 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S11 | 기본 게시판 삭제 시도 (실패) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S12 | 작성 중 이탈 (이탈 확인) | 시드 클럽(clubId=1201)의 community 진입. | role에 맞는 community hub surface가 노출된다. |
| S13 | [AUTH-06] 멤버가 예약 게시글 작성 | MEMBER. scheduledAt=미래 시각. | status=SCHEDULED로 저장. 피드에 즉시 미노출. 예약 시각 도달 시 ACTIVE 전환 + 멤버 FCM 없음(댓글 시만 FCM). |
| S14 | [AUTH-06] 예약 게시판 삭제 시 SCHEDULED 글 보존 | 커스텀 게시판에 SCHEDULED 글 존재. OWNER가 게시판 삭제. | SCHEDULED 글이 자유게시판으로 이동 보존됨. soft-delete된 DELETED 글은 카운트 제외(`ClubBoardService.java:175-180`). |
| S15 | [AUTH-08] 멤버가 게시글 좋아요 토글 | MEMBER. ACTIVE 글. | POST /like → likeCount+1, likedByMe=true. 재호출 no-op(멱등). DELETE /like → likeCount-1, likedByMe=false. |
| S16 | [AUTH-08] 동시 좋아요 중복 요청 | 두 클라이언트가 동시에 같은 postId POST /like | 비관적 락으로 직렬화 → club_post_like UNIQUE 충돌 없음. 최종 likeCount=1, likedByMe=true. |
| S17 | [AUTH-08] SCHEDULED 글 좋아요 시도 | 예약 발행 대기 글(SCHEDULED). 멤버. | POST_NOT_FOUND 오류. ACTIVE 글만 좋아요 대상(`ClubPostService.java:412`). |
| S18 | [이미지 수정] completeUpload 없이 게시글 저장 시도 | presigned URL 발급 후 S3 PUT만 수행, completeUpload 미호출. | 서버 saveImages에서 COMPLETED 상태 검증 실패 → 이미지 저장 거부. 파일은 PENDING 상태로 24h 후 소실. |

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
| Gap (확정) | `community_app/lib/data/models/club/community/post_status.dart:3-14` / `post.dart:24` | Flutter `PostStatus` enum에 `SCHEDULED`가 없고 `PostStatus.fromString` 미매핑. 단, `post.dart`의 `Post` 모델은 `status`를 `String?`으로 직접 보관하므로(`post.dart:24`) 서버가 SCHEDULED를 반환해도 String 그대로 저장됨 — `PostStatus.fromString` 자체는 미사용. **실질 gap은 예약 상태 enum/표시/관리 UI 부재**: 목록·상세·수정 화면이 `SCHEDULED`를 인지·표시·취소할 수 없음. `active` 폴백은 `PostStatus.fromString` 호출처가 있는 경우에만 발생. | `post_status.dart`에 `scheduled('SCHEDULED')` 추가 + 목록/상세 예약 상태 표시 + 작성자 취소 CTA 추가 |
| 후보 | scenarios.md:106 | ### S1 보강 — 게시글 작성 화면 라벨 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:118 | ### S4 보강 — 게시글 수정 화면 프리필 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:127 | - 프리필 검증은 폼 dirty 검증(S4의 변경 필드만 PUT) 사전 조건이다. 프리필 누락 시 PUT body가 빈 값으로 전송되어 데이터 손실 위험. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 일반 멤버 자유게시판 글 작성 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 게시글 등록. viewCount=0, pinned=false, likeCount=0, likedByMe=false.
- **AC-02. NOTICE 게시판에 일반 멤버 작성 시도 (실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. ADMIN이 게시글 고정 토글 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 고정. 다시 ⋮ → "고정 해제"로 false.
- **AC-04. 작성자 게시글 수정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 수정 반영.
- **AC-05. ADMIN이 남의 글 수정 시도 (실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. ADMIN이 남의 글 삭제 (가능)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 게시글 상세 진입 = viewCount +1**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 조회 카운터 정확하게 누적.
- **AC-08. 삭제된 게시글 진입 (에러)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 이미지 11장 이상 첨부 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. OWNER/ADMIN이 커스텀 게시판 생성**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-11. 기본 게시판 삭제 시도 (실패)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-12. 작성 중 이탈 (이탈 확인)**: Given 시드 클럽(clubId=1201)의 community 진입. When 사용자가 해당 흐름을 실행하면 Then role에 맞는 community hub surface가 노출된다.
- **AC-13. [AUTH-06] 예약 게시글이 피드에 미노출**: Given MEMBER가 scheduledAt=미래 시각으로 게시글 작성. When 작성 완료. Then DB에 status=SCHEDULED 저장, 다른 멤버 목록 API에서 해당 글 미포함.
- **AC-14. [AUTH-06] 게시판 삭제 시 SCHEDULED 글 보존**: Given 커스텀 게시판에 SCHEDULED 글 1건 이상 존재. When OWNER가 게시판 삭제. Then SCHEDULED 글이 자유게시판으로 이동. DELETED 글은 이동 대상 아님.
- **AC-15. [AUTH-08] 게시글 좋아요/취소 멱등**: Given MEMBER, ACTIVE 글. When POST /like 2회 연속 호출. Then likeCount=1, likedByMe=true (중복 no-op). DELETE /like 후 재시도도 likeCount=0.
- **AC-16. [AUTH-08] SCHEDULED 글 좋아요 시도 실패**: Given SCHEDULED 상태 글. When 멤버가 POST /like. Then POST_NOT_FOUND 반환. club_post_like 행 미생성.
- **AC-17. [이미지] completeUpload 없이 이미지 포함 글 저장 실패**: Given presigned URL 발급 후 S3 PUT만 수행(completeUpload 미호출). When POST /posts. Then 서버가 COMPLETED 검증 실패 → 이미지 등록 거부.
- **AC-18. [이미지] 타인 이미지 키 도용 시도 실패 (IDOR)**: Given 다른 사용자의 fileKey를 `imageKeys`에 포함. When POST /posts. Then 서버가 authorId 소유자 검증 실패 → 저장 거부.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
