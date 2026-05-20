# F04-09. 게시글 댓글 & 대댓글 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/04_club/F04-09_post-comments -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/04_club/F04-09_post-comments`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

클럽 게시글에 1단계 댓글 + 1단계 대댓글(답글)을 달 수 있는 스레드 구조의 댓글 시스템. 작성자는 자기 글을 수정/삭제하고, OWNER/ADMIN은 멤버의 댓글을 삭제할 수 있다. 삭제된 댓글에 자식 답글이 있으면 placeholder("삭제된 댓글입니다")로 보존하고, 자식이 없으면 그냥 사라진다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ 커뮤니티 탭 ▶ 게시판 ▶ 게시글 상세 (SCR-CC-003) ▶ 하단 댓글 섹션
- 푸시 알림 ("새 댓글이 달렸습니다") ▶ 게시글 상세 ▶ 댓글로 스크롤 (스펙)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/04_club/F04-09_post-comments/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/04_club/F04-09_post-comments/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/04_club/F04-09_post-comments/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/04_club/F04-09_post-comments/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubPostCommentController.java:28` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPostCommentController.java:36` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPostCommentController.java:46` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPostCommentController.java:57` | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/controller/ClubPostCommentController.java:67` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. **화면 진입 시**: `postDetailNotifierProvider(clubId, boardId, postId)` ▶ 게시글 상세 + `commentNotifierProvider(clubId, postId)` 트리거 ▶ `ClubCommentRepository.getComments()` ▶ `GET /comments` (List 반환 → 클라이언트 측 그룹핑은 서버에서 이미 완료)
2. **댓글 작성**: `commentNotifier.addComment(content)` ▶ `POST /comments` ▶ 응답으로 받은 `Comment`를 목록에 prepend (또는 invalidate) ▶ `AppToast.show('댓글이 등록되었습니다')`
3. **답글 작성**: `commentNotifier.addReply(parentId, content)` ▶ `POST /comments/{parentId}/replies` ▶ 부모 댓글의 `replies`에 append
4. **수정**: `commentNotifier.updateComment(id, content)` ▶ `PUT /comments/{id}` ▶ 해당 댓글 in-place 갱신
5. **삭제**: `commentNotifier.deleteComment(id)` ▶ `DELETE /comments/{id}` ▶ 응답 후 invalidate (서버가 자식 답글 유무에 따라 placeholder 처리하므로 낙관적 업데이트 어려움)

## 4. 서버 계약

### 개요

클럽 게시글에 1단계 댓글 + 1단계 대댓글(답글)을 달 수 있는 스레드 구조의 댓글 시스템. 작성자는 자기 글을 수정/삭제하고, OWNER/ADMIN은 멤버의 댓글을 삭제할 수 있다. 삭제된 댓글에 자식 답글이 있으면 placeholder("삭제된 댓글입니다")로 보존하고, 자식이 없으면 그냥 사라진다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | `/api/v1/clubs/{clubId}/posts/{postId}/comments` | `ClubPostCommentController#getComments` | required | 댓글 + 대댓글 트리 조회 (List) |
| POST | `/api/v1/clubs/{clubId}/posts/{postId}/comments` | `ClubPostCommentController#createComment` | required | 댓글 작성 |
| POST | `/api/v1/clubs/{clubId}/posts/{postId}/comments/{commentId}/replies` | `ClubPostCommentController#createReply` | required | 답글(대댓글) 작성 |
| PUT | `/api/v1/clubs/{clubId}/comments/{commentId}` | `ClubPostCommentController#updateComment` | required | 본인 댓글 수정 |
| DELETE | `/api/v1/clubs/{clubId}/comments/{commentId}` | `ClubPostCommentController#deleteComment` | required | 본인 또는 ADMIN/OWNER가 삭제 |

> 응답 타입은 **`List<ClubPostCommentVo>`** (Page 아님). `community_app` 측 매핑 시 주의.

### 의존 단위 / 외부 시스템

- **Unit 04 자체**: `ClubPostService`(F04-08)에서 `comment_count` 관리. `ClubAccessService`로 멤버/스태프 검증.
- **공통 인프라**: 인증(`@AuthenticationPrincipal UserPrincipal`).
- **알림**: 댓글/답글 작성 시 FCM 발송은 스펙에 명시되었으나 현재 서비스 구현에는 없음 — 추후 추가 시 `NotificationService` 호출 예정.

## 5. 프론트 계약

### 진입 경로

- 클럽 상세 ▶ 커뮤니티 탭 ▶ 게시판 ▶ 게시글 상세 (SCR-CC-003) ▶ 하단 댓글 섹션
- 푸시 알림 ("새 댓글이 달렸습니다") ▶ 게시글 상세 ▶ 댓글로 스크롤 (스펙)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/club/...) | 역할 |
|---|---|---|
| `/clubs/:clubId/community/boards/:boardId/posts/:postId` | `community/screens/post_detail_screen.dart` | 게시글 상세 + 하단 댓글 섹션 (SCR-CC-003 + SCR-CC-006 통합) |

> 댓글 단독 화면은 없음. 게시글 상세 화면 안에서 댓글 입력/목록/액션이 모두 처리됨.

### 화면별 구성 요소 & 액션

### 게시글 상세 — 댓글 영역 (`post_detail_screen.dart`)
- **사용자가 보는 것**:
  - 댓글 섹션 헤더: "💬 댓글 {count}"
  - 정렬 토글 ("최신순" / "등록순") — 스펙상 명시
  - 댓글 카드 (`comment_tile.dart`): 32dp 프로필, 닉네임, 상대 시간, 본문, 답글/좋아요 버튼
  - 대댓글 카드 (`reply_tile.dart`): 좌 40dp 들여쓰기, "@닉네임" 멘션
  - 삭제된 댓글 placeholder: "삭제된 댓글입니다" (Gray400, italic)
  - 수정 표시: "(수정됨)" (Caption, Gray500)
  - 하단 고정 입력창 (`comment_input.dart`): 텍스트 필드 + 전송 아이콘 버튼
- **사용자가 할 수 있는 액션**:
  - 댓글 입력 후 전송 ▶ `POST /api/v1/clubs/{clubId}/posts/{postId}/comments` ▶ 목록 갱신 + 새 댓글로 스크롤
  - "답글" 버튼 탭 ▶ 입력란 포커스 + "@{원댓글작성자}" prefix 자동 입력 ▶ 전송 시 `POST .../comments/{commentId}/replies`
  - 댓글 롱프레스 ▶ `comment_action_menu.dart` 표시 (작성자: 수정/삭제, ADMIN: 삭제, 일반: 신고)
  - "수정" 선택 ▶ 입력란 프리필 + 모드 전환 ▶ 전송 시 `PUT .../comments/{commentId}`
  - "삭제" 선택 ▶ 확인 다이얼로그 ▶ `DELETE .../comments/{commentId}`
  - 무한 스크롤 도달 ▶ `commentNotifierProvider.loadMore()` (현재 서버 응답이 List이므로 페이지네이션 미사용 — `(클라이언트 측 가상 페이지)`)
- **상태 분기**:
  - 로딩: `SkeletonLoader(preset: SkeletonPreset.detail)` (게시글+댓글 모두)
  - 에러: `AppErrorState(title: '게시글을 불러올 수 없습니다', onRetry: ...)`
  - 빈 상태: 댓글 0개 일 때 "첫 댓글을 남겨보세요" (compact)
- **모달/시트/네비게이션**:
  - 댓글 액션 메뉴: `showModalBottomSheet` (CommentActionMenu)
  - 삭제 확인: `AppDialog.confirm` (스펙)
  - 답글 모드: 모달 아님, 화면 내 입력창 상태만 변경 (`_replyToCommentId`)

### API 호출 순서 (Provider/Repository 관점)

1. **화면 진입 시**: `postDetailNotifierProvider(clubId, boardId, postId)` ▶ 게시글 상세 + `commentNotifierProvider(clubId, postId)` 트리거 ▶ `ClubCommentRepository.getComments()` ▶ `GET /comments` (List 반환 → 클라이언트 측 그룹핑은 서버에서 이미 완료)
2. **댓글 작성**: `commentNotifier.addComment(content)` ▶ `POST /comments` ▶ 응답으로 받은 `Comment`를 목록에 prepend (또는 invalidate) ▶ `AppToast.show('댓글이 등록되었습니다')`
3. **답글 작성**: `commentNotifier.addReply(parentId, content)` ▶ `POST /comments/{parentId}/replies` ▶ 부모 댓글의 `replies`에 append
4. **수정**: `commentNotifier.updateComment(id, content)` ▶ `PUT /comments/{id}` ▶ 해당 댓글 in-place 갱신
5. **삭제**: `commentNotifier.deleteComment(id)` ▶ `DELETE /comments/{id}` ▶ 응답 후 invalidate (서버가 자식 답글 유무에 따라 placeholder 처리하므로 낙관적 업데이트 어려움)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 멤버가 게시글에 댓글을 단다 (Happy Path) | 로그인됨, 클럽 MEMBER, 게시글 상세(SCR-CC-003) 진입, 댓글 0개. | ACTIVE 댓글 1개, 게시글 `comment_count = 1`, 입력창 비워짐. |
| S2 | 다른 멤버 댓글에 답글을 단다 | 게시글 상세, 댓글 5개 표시 중. | 부모 댓글의 `replies` 1개, `comment_count` +1. |
| S3 | 자기 댓글 수정/삭제 | 댓글 작성자 본인. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | ADMIN이 부적절한 댓글을 삭제 | 다른 멤버의 욕설 댓글이 게시됨. | 멤버에게 푸시 알림은 현재 미발송(서비스 코드 기준). |
| S5 | 일반 멤버가 남의 댓글 수정/삭제 시도 (Forbidden) | 작성자 아님, ADMIN/OWNER 아님. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | 답글의 답글 시도 (Depth 제한) | 호기심 많은 멤버. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 비멤버가 게시글/댓글 접근 | 시드 클럽(`Seoul Weekend Boardgamers`, clubId=1201) 비멤버 사용자로 로그인. | 사용자는 클럽 상세 화면에 머무르며 가입 게이트(F04-02 분기)로 안내된다. |

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
| 후보 | backend.md:17 | > 응답 타입은 **`List<ClubPostCommentVo>`** (Page 아님). `community_app` 측 매핑 시 주의. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:69 | - **사이드 이펙트**: 없음 (스펙상 게시글 작성자에게 FCM 발송이 명시되어 있으나 서비스 코드에는 미구현 — `(미확인)`) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:88 | - **사이드 이펙트**: 없음 (스펙상 원댓글 작성자 FCM은 미구현 — `(미확인)`) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:33 | - 무한 스크롤 도달 ▶ `commentNotifierProvider.loadMore()` (현재 서버 응답이 List이므로 페이지네이션 미사용 — `(클라이언트 측 가상 페이지)`) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:82 | ### S1 보강 — 게시글 상세의 댓글 read surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:92 | ### S2 보강 — 답글 모드 진입 시 입력 영역 카피 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:102 | ### S4 보강 — long-press → 액션 시트의 `'삭제'` 노출 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 멤버가 게시글에 댓글을 단다 (Happy Path)**: Given 로그인됨, 클럽 MEMBER, 게시글 상세(SCR-CC-003) 진입, 댓글 0개. When 사용자가 해당 흐름을 실행하면 Then ACTIVE 댓글 1개, 게시글 `comment_count = 1`, 입력창 비워짐.
- **AC-02. 다른 멤버 댓글에 답글을 단다**: Given 게시글 상세, 댓글 5개 표시 중. When 사용자가 해당 흐름을 실행하면 Then 부모 댓글의 `replies` 1개, `comment_count` +1.
- **AC-03. 자기 댓글 수정/삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. ADMIN이 부적절한 댓글을 삭제**: Given 다른 멤버의 욕설 댓글이 게시됨. When 사용자가 해당 흐름을 실행하면 Then 멤버에게 푸시 알림은 현재 미발송(서비스 코드 기준).
- **AC-05. 일반 멤버가 남의 댓글 수정/삭제 시도 (Forbidden)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. 답글의 답글 시도 (Depth 제한)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 비멤버가 게시글/댓글 접근**: Given 시드 클럽(`Seoul Weekend Boardgamers`, clubId=1201) 비멤버 사용자로 로그인. When 사용자가 해당 흐름을 실행하면 Then 사용자는 클럽 상세 화면에 머무르며 가입 게이트(F04-02 분기)로 안내된다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
