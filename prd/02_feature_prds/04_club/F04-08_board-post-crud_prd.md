# F04-08. 게시판 & 게시글 CRUD PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-08_board-post-crud -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-08_board-post-crud`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽 멤버는 게시판 단위로 글을 작성/조회/수정/삭제하며, OWNER/ADMIN은 추가 게시판을 만들고 게시글을 고정한다. 클럽 생성 시 기본 게시판 3개(NOTICE/FREE/INTRODUCTION)가 자동 생성된다. 게시글 수정은 작성자 본인만, 삭제는 작성자 또는 OWNER/ADMIN, 고정은 OWNER/ADMIN만 가능하다. NOTICE 게시판에는 OWNER/ADMIN만 글을 쓸 수 있다.

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

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

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
| GET | .../posts | ClubPostController#getPosts | required (멤버) | 게시글 목록 (Page) |
| GET | .../posts/{postId} | ClubPostController#getPost | required (멤버) | 상세 + viewCount +1 |
| POST | .../posts | ClubPostController#createPost | required (멤버, NOTICE는 staff만) | 작성 |
| PUT | .../posts/{postId} | ClubPostController#updatePost | required (작성자 본인) | 수정 |
| DELETE | .../posts/{postId} | ClubPostController#deletePost | required (작성자 or OWNER/ADMIN) | 삭제 (soft) |
| PATCH | .../posts/{postId}/pin | ClubPostController#togglePin | required (OWNER/ADMIN) | 고정 토글 |

### 의존 단위 / 외부 시스템

- **Unit 01 (account)**: 작성자 닉네임 (`@EntityGraph` author).
- **F04-09 (이 단위)**: `commentCount`는 댓글 도메인이 별도 관리 (이 도메인은 INSERT 시 0으로 시작, 댓글 생성/삭제 시 카운터 동기화는 F04-09).
- **외부 (file)**: 이미지 업로드는 별도 `POST /api/v1/files/presigned-url` → S3 직접 PUT, 그 후 본 API에 `imageKeys`로 전달.
- **알림**: 게시글 작성 시 별도 FCM 발송 없음. 댓글에서만 발송됨 (F04-09).

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
| `/clubs/:id/boards/:boardId/posts` | `community/screens/post_list_screen.dart` | 게시글 목록 + 고정 섹션 |
| `/clubs/:id/posts/:postId` | `community/screens/post_detail_screen.dart` | 게시글 상세 + 댓글(F04-09) |
| `/clubs/:id/boards/:boardId/posts/create` | `community/screens/post_create_screen.dart` | 작성 |
| `/clubs/:id/posts/:postId/edit` | `community/screens/post_edit_screen.dart` | 수정 |
| `widgets/board_card.dart`, `board_create_dialog.dart` | 게시판 카드, 생성 다이얼로그 |
| `widgets/post_card.dart`, `pinned_post_section.dart`, `post_form.dart`, `post_image_picker.dart`, `post_more_menu.dart` | 게시글 UI |

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
| S1 | 일반 멤버 자유게시판 글 작성 (Happy Path) | MEMBER. 후기 글 작성. | 게시글 등록. viewCount=0, pinned=false. |
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
| 후보 | scenarios.md:106 | ### S1 보강 — 게시글 작성 화면 라벨 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:118 | ### S4 보강 — 게시글 수정 화면 프리필 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:127 | - 프리필 검증은 폼 dirty 검증(S4의 변경 필드만 PUT) 사전 조건이다. 프리필 누락 시 PUT body가 빈 값으로 전송되어 데이터 손실 위험. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 일반 멤버 자유게시판 글 작성 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 게시글 등록. viewCount=0, pinned=false.
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

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
