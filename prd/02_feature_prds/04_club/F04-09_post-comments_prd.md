# F04-09. 게시글 댓글·대댓글·멘션 PRD

<!-- source-measured: 2026-07-29; api HEAD be38d128b80d; app HEAD cb21bce8ef08 -->

> 이 문서는 2026-07-29 현재 `community_api`와 `community_app`의 실제 소스를 다시 대조한 계약이다. 과거 unit 문서의 “댓글/답글 알림 미구현”, “답글 선택 시 `@닉네임` 자동 삽입”, “댓글 좋아요”, “정렬 토글이 실제 정렬을 바꿈” 서술은 현행 구현과 다르므로 이 문서가 우선한다.

## 1. 결론

클럽 멤버는 게시글에 최상위 댓글과 1단계 답글을 작성하고, 댓글 본문에서 최대 10명의 현재 클럽 멤버를 `@닉네임`으로 멘션할 수 있다. 서버는 클라이언트가 보낸 사용자 ID를 그대로 믿지 않고 실제 본문 토큰과 클럽 멤버십을 다시 확인한다.

댓글·답글 작성 시 알림은 이미 구현되어 있다. 같은 수신자가 여러 조건에 해당하면 **멘션 > 답글 > 게시글 댓글** 우선순위로 한 번만 알리고, 자기 자신과 현재 클럽 멤버가 아닌 사용자는 제외한다. 앱은 알림을 게시글 상세의 대상 댓글까지 딥링크하고 3초 동안 강조한다.

## 2. 실사 기준

| 계층 | 확인한 실제 소스 | 확인한 계약 |
|---|---|---|
| Controller | `club/controller/ClubPostCommentController.java` | 5개 endpoint, body/response |
| Param / VO | `ClubCommentAddParam`, `ClubCommentModParam`, `ClubPostCommentVo`, `ClubPostCommentMentionVo` | `content`, `mentionedUserIds`, `mentions` |
| Service | `club/service/ClubPostCommentService.java` | 권한, 깊이, 멘션 검증·diff, 알림 우선순위 |
| DB | `V1__init.sql`, `ClubPostCommentMention` | 댓글-멘션 고유 관계와 cascade |
| Notification | `NotificationType`, `NotificationService`, `ClubPostNotificationData` | 타입, 차단/설정, payload |
| Flutter data | `club_comment_api.dart`, `comment*.dart`, `comment_provider.dart` | Retrofit/Freezed/Provider 전달 |
| Flutter UI | `mention_field.dart`, `mention_text.dart`, `post_detail_screen.dart` | 후보 검색, 확정 멘션 렌더링, 댓글 강조 |
| Flutter routing | `notification_router.dart`, `app_router.dart` | 알림 → 게시글/댓글 딥링크 |

## 3. 서버 API 계약

기본 경로는 `/api/v1/clubs/{clubId}`이며 전부 인증과 해당 클럽 멤버십이 필요하다.

| Method | Path | Body | 응답 |
|---|---|---|---|
| GET | `/posts/{postId}/comments` | 없음 | `List<ClubPostCommentVo>` |
| POST | `/posts/{postId}/comments` | `ClubCommentAddParam` | 201 `ClubPostCommentVo` |
| POST | `/posts/{postId}/comments/{commentId}/replies` | `ClubCommentAddParam` | 201 `ClubPostCommentVo` |
| PUT | `/comments/{commentId}` | `ClubCommentModParam` | 200 `ClubPostCommentVo` |
| DELETE | `/comments/{commentId}` | 없음 | 204 |

### 3.1 요청·응답 필드

- `ClubCommentAddParam` / `ClubCommentModParam`
  - `content: String`
  - `mentionedUserIds: List<Long>` — 누락 가능. 서버가 빈 목록처럼 처리한다.
- `ClubPostCommentVo`
  - `id`, `parentCommentId`, `authorId`, `authorNickname`, `content`
  - `status: ACTIVE | DELETED`
  - `createdAt`, `updatedAt`
  - `replies: List<ClubPostCommentVo>`
  - `mentions: List<ClubPostCommentMentionVo>`
- `ClubPostCommentMentionVo`
  - `userId`
  - `nickname` — 멘션 생성 시점의 표시용 닉네임 snapshot

목록 응답은 `Page`가 아니라 완성된 1단계 트리의 `List`다. 서버 저장/조회 순서는 `createdAt ASC`이며 현재 페이지네이션은 없다.

## 4. 권한·무결성

- 읽기·댓글 작성·답글·수정은 현재 클럽 멤버만 가능하다.
- 수정은 댓글 작성자만 가능하다.
- 삭제는 댓글 작성자 또는 `OWNER`/`ADMIN`만 가능하다.
- `clubId`, `postId`, `commentId`의 실제 소속 관계를 서버가 확인한다. 다른 클럽 ID를 섞은 직접 호출은 존재를 숨기는 `NOT_FOUND` 계열로 차단한다.
- 답글 생성 시 부모 댓글을 잠그고, 같은 게시글의 `ACTIVE` 최상위 댓글인지 확인한다.
- 답글의 답글은 허용하지 않는다. 깊이는 정확히 1단계다.
- 삭제된 부모에는 새 답글을 달 수 없다.
- 부모 삭제 후 답글이 남아 있으면 부모는 `DELETED` placeholder로 조회되고, 멘션 정보는 노출하지 않는다.

## 5. 멘션 계약

### 5.1 클라이언트가 보내는 값과 서버가 인정하는 값

앱은 사용자가 후보 목록에서 고른 사용자 ID를 `mentionedUserIds`로 보내지만, 서버는 다음 조건을 모두 만족하는 대상만 실제 멘션으로 저장한다.

1. 자기 자신이 아니다.
2. 현재 클럽 멤버다.
3. 본문에 그 사용자의 실제 `@닉네임` 토큰이 있다.
4. 중복 제거 후 최대 10명이다.

본문의 `@` 시작 위치는 최대 20개까지만 스캔한다. 이를 넘기거나 요청 후보가 10명을 넘으면 `INVALID_INPUT`으로 거절한다.

### 5.2 토큰 판정

- `@` 앞이 문자열 시작 또는 공백 계열 문자일 때만 후보로 본다. 이메일 중간의 `@`는 멘션으로 보지 않는다.
- 공백을 포함한 닉네임도 전체 닉네임으로 매칭한다.
- 같은 접두어가 겹치면 가장 긴 닉네임을 우선한다.
- 클럽 안에 같은 닉네임 사용자가 둘 이상이면 누구인지 안전하게 확정할 수 없으므로 해당 토큰을 멘션으로 저장하지 않는다.
- 저장된 `nickname`은 표시 안정성을 위한 snapshot이다. 이후 사용자가 닉네임을 바꿔도 기존 댓글의 표시 문자열은 유지된다.

### 5.3 수정·삭제

- 수정 요청은 최종 본문과 전체 `mentionedUserIds`를 다시 보낸다.
- 서버는 기존 관계와 새 관계를 diff하여 추가·유지·삭제한다.
- 수정으로 **새로 추가된** 멘션 수신자에게만 알림을 보낸다. 유지된 대상에게는 중복 알림을 보내지 않는다.
- 댓글 삭제 시 연결된 멘션 관계도 삭제된다.
- DB는 `(comment_id, mentioned_user_id)`를 유일하게 유지한다.

## 6. 댓글·답글 알림

### 6.1 알림 타입과 수신자

| 우선순위 | `NotificationType` | 수신 조건 |
|---:|---|---|
| 1 | `CLUB_POST_COMMENT_MENTION` (101) | 댓글/답글 본문에서 실제 멘션된 현재 멤버 |
| 2 | `CLUB_POST_COMMENT_REPLY` (103) | 답글의 부모 댓글 작성자 |
| 3 | `CLUB_POST_COMMENT` (102) | 최상위 댓글이 달린 게시글 작성자 |

한 사용자가 멘션 대상이면서 부모/게시글 작성자이기도 하면 가장 높은 한 종류만 발송한다. 행위자는 언제나 제외한다.

알림 본문 발췌는 줄바꿈을 평탄화하고 최대 50자로 제한한다. payload는 `ClubPostNotificationData`이며 `clubId`, `boardId`, `postId`, `commentId`, `actorUserId`를 담는다. reference는 `CLUB` / `clubId`다.

`NotificationService`의 공통 정책도 그대로 적용된다.

- 행위자와 수신자 사이에 어느 방향이든 사용자 차단이 있으면 인앱·푸시 모두 억제한다.
- 사용자의 알림 설정에 따라 인앱/푸시 채널을 각각 결정한다.
- 알림 시점에 클럽에서 탈퇴한 사용자는 수신 대상에서 제외한다.

### 6.2 Flutter 딥링크

세 알림 타입은 모두 다음 경로로 해석된다.

`/clubs/{clubId}/posts/{postId}?boardId={boardId}&commentId={commentId}`

- `boardId` 또는 `postId`가 없으면 클럽 홈으로 안전하게 폴백한다.
- 라우터가 `commentId`를 `highlightCommentId`로 넘긴다.
- 게시글 상세가 댓글 목록 로드 후 대상 댓글로 한 번 스크롤하고 약 3초 강조한다.
- 댓글이 이미 삭제되었거나 목록에 없으면 화면 진입은 유지하고 상단에 머문다.

## 7. Flutter 입력·표시 계약

- `MentionField`는 `@` 입력 뒤 250ms debounce로 클럽 멤버를 검색한다.
- 자기 자신을 후보에서 제외하고, 후보를 고르면 공백 포함 전체 닉네임을 본문에 삽입한다.
- 전송 직전에도 본문에 남아 있는 선택 멘션만 ID 목록으로 보낸다.
- 답글 모드는 부모 댓글을 지정하는 배너/힌트로 표시한다. **부모 작성자의 `@닉네임`을 자동 삽입하지 않는다.** 멘션이 필요하면 사용자가 `@` 후보에서 별도로 선택한다.
- 수정 다이얼로그는 서버가 내려준 기존 `mentions`를 seed하고 전체 교체 요청을 보낸다.
- `MentionText`는 본문의 임의 `@단어`가 아니라 서버가 확정해 내려준 `mentions`만 `linkBlue`로 강조한다.
- 확정 멘션을 탭하면 `/profile/users/{userId}`로 이동한다.

## 8. 현재 확인된 Gap / Risk

| 분류 | 실측 결과 | 영향 |
|---|---|---|
| Gap | Flutter API는 `sort` query를 보내고 Provider는 `latest/oldest`를 토글하지만 서버 Controller에는 해당 파라미터가 없고, 클라이언트도 별도 정렬하지 않는다. | UI 정렬 라벨을 바꿔도 실제 순서는 서버의 `createdAt ASC` 그대로일 수 있다. 서버 정렬 계약을 추가하거나 앱에서 정렬해야 한다. |
| 범위 확인 | 목록은 `List` 전체 조회이고 `loadMore`는 실질 페이지를 추가하지 않는다. | 댓글이 매우 많은 게시글의 비용 정책은 별도 결정이 필요하다. |
| 문서 교정 | 과거 문서의 댓글 좋아요/신고·성공 토스트·자동 멘션 prefix 묘사는 현재 댓글 화면의 보장 계약이 아니다. | QA는 실제 노출 위젯과 API만 기준으로 한다. |

## 9. 수용 기준

- **AC-01**: 멤버가 유효한 본문으로 댓글을 작성하면 201과 `ACTIVE` VO를 받고 목록에 반영된다.
- **AC-02**: 최상위 `ACTIVE` 댓글에만 답글을 만들 수 있고, 답글의 답글은 서버가 거절한다.
- **AC-03**: 요청 ID가 있어도 본문에 정확한 `@닉네임`이 없거나 대상이 현 멤버가 아니면 멘션으로 저장·알림되지 않는다.
- **AC-04**: 한 수신자가 멘션과 답글/게시글 작성자 조건을 동시에 만족하면 우선순위가 가장 높은 알림 한 건만 받는다.
- **AC-05**: 댓글 수정에서 기존 멘션은 재알림하지 않고 새로 추가된 대상만 알린다.
- **AC-06**: 작성자는 자기 댓글을 수정·삭제하고, `OWNER`/`ADMIN`은 타인의 댓글을 삭제만 할 수 있다.
- **AC-07**: 알림 탭 시 게시글 상세에 진입하고 대상 댓글이 존재하면 스크롤·강조한다.
- **AC-08**: 사용자 차단 또는 알림 설정 비활성 상태에서는 공통 알림 정책대로 전달을 억제한다.
- **AC-09**: 정렬 토글은 현재 실제 순서 변경 수용 기준으로 간주하지 않는다. Gap 해소 후 별도 검증한다.

## 10. 후속

- 댓글 정렬을 서버 query로 공식 지원할지, 현재 전체 `List`를 앱에서 정렬할지 결정한다.
- 페이지네이션이 필요하면 서버 반환 타입부터 변경해야 하며, 현재 `List` 계약을 `PageResponse`로 임의 해석하지 않는다.
- 알림 딥링크의 삭제 댓글 폴백과 긴 댓글 목록 스크롤을 통합/E2E로 지속 검증한다.
