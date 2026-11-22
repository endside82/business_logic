# F09-05. 데이트 채팅과 전송 복구 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 현재 서버·앱 소스 대조다. 새 제품 시험이나 실제 기기·외부 서비스 통과 기록이 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 결론과 실제 입구

채팅방 목록 `/dating/chat`과 개별 대화 `/dating/chat/{roomId}`는 모두 등록된 별개 경로다. 매칭 카드와 CHAT_MESSAGE 알림은 방 목록으로 이동한다. 목록에서 방을 고르면 roomId·선택 matchId·partnerName을 넘겨 개별 대화를 연다. 후보 선택 직후 매칭 성공 창은 받은 chatRoomId로 직접 대화를 연다. roomId 없이 목록으로 가는 것을 라우트 누락으로 판정하지 않는다.

대화방에는 MATCH와 PRIVATE_MEETING 유형이 있다. 전자는 매치의 두 회원, 후자는 해당 이벤트 호스트와 선택된 신청자가 참여한다. PRIVATE_MEETING의 matchId는 null일 수 있어 만남 제안을 모든 방의 공통 기능으로 보지 않는다. 대화 상단에는 안전 도움말·상대 사진이 있을 때 사진 신고·서버가 허용할 때 만남 제안이 있다. 현재 상단에는 사용자 차단 단추가 없다.

## 코드 위치

서버 정본은 DateChatController, DateChatService, DateAbilityPolicy, DateChatRoomQueryRepository, DateChatMessageQueryRepository다. 앱은 date_chat_api/repository/provider, date_chat_reconciler, chat_room_list_screen, chat_screen, dating_routes와 notification_router를 따른다. 실시간 중계는 community-realtime의 DateChatMessageService·DateChatRoomAuthorizationService·DateChatHandler다.

<!-- source-references:start -->
서버 창구: `DateChatController#getChatRooms`, `DateChatController#getMessages`, `DateChatController#sendMessage`, `DateChatController#markAsRead`, `DateChatController#access`, `DateChatController#messagesSince`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 공개 API와 응답

모든 창구는 DATING 공개 범위를 적용한다. 아래 경로의 공통 앞부분은 `/api/v1/date/chats`다.

| 메서드·경로 | 요청 | 응답 |
|---|---|---|
| GET 기본 경로 | 없음 | List<ChatRoomVo>; 페이지 아님 |
| GET /{roomId}/messages | page, size; 기본 size 50 | Page<ChatMessageVo>; createdAt DESC, id DESC |
| GET /{roomId}/access | 없음 | allowed, counterpartUserId?, unreadCount; 거절은 false/null/0 |
| GET /{roomId}/messages/since | afterId ≥ 0, limit 1~100 필수 | messages와 hasMore; 방 안 id ASC |
| POST /{roomId}/messages | messageType, content, clientMessageId? | 201 ChatMessageVo |
| PATCH /{roomId}/read | 본문 없음 | 200 updatedCount; 앱 REST 어댑터는 값을 버림 |

ChatRoomVo는 id, nullable matchId, status, roomType, 상대 ID·이름·사진 URL·사진 ID, unreadCount, lastMessage/lastMessageAt, createdAt/closedAt, actions.send/proposeMeeting을 담는다. 메시지는 id, roomId, senderId, clientMessageId?, messageType, content, 읽음 여부, createdAt을 담는다. REST의 읽음 키는 read이고 앱 모델이 이를 isRead에 연결한다. 실시간 DTO는 isRead를 사용하며 read도 입력 별칭으로 받는다.

## 참여자와 방 접근

목록은 ACTIVE 방만 가져오고 양방향 활성 데이트 차단 상대를 제외한다. MATCH와 PRIVATE_MEETING 목록을 합치며 전체 최근 메시지순 정렬이나 페이지 처리는 구현하지 않았다. 상대 사진은 삭제되지 않은 APPROVED 사진 중 표시 순서의 첫 사진을 서명 URL로 제공한다.

메시지 페이지·증분·읽음은 방 존재, 참여자, 양방향 차단, ACTIVE를 검사한다. access는 접근 불가의 상세 사유 대신 allowed=false를 반환한다. 송신은 참여자/ACTIVE 확인 뒤 계정 공유 잠금·쌍 잠금·방 상태 공유 잠금과 차단 재검사를 거친다. 이 채팅 서비스는 본인 인증의 유효기간이나 데이트 프로필 활성 상태를 매번 확인하지 않는다. 서버의 계정·공개 범위 제한은 별도로 적용된다.

## 송신 저장·멱등·읽음

content는 공백만으로 된 값이 아니어야 하고 최대 1,000자다. clientMessageId는 선택이며 최대 36자다. 공개 송신은 TEXT만 허용한다. IMAGE·MEETING_PROPOSAL·SYSTEM enum 또는 저장 형식이 있다고 해당 종류를 이 API로 보낼 수 있는 것은 아니다.

권한 재검사 뒤 `(roomId, senderId, clientMessageId)`로 기존 메시지를 찾는다. 같은 키가 있으면 기존 메시지를 돌려주고 생성 이벤트를 다시 발행한다. 동일 키의 본문을 비교해 새 내용으로 교체하지 않는다. 빈 키는 null로 취급하므로 이 경우 중복 방지 보장을 적용하지 않는다. DB 고유 키도 같은 세 필드다. 동시 저장의 고유 키 충돌은 서비스가 예외를 다시 던지므로 모든 경쟁 요청이 성공 응답을 받는다고 쓰지 않는다.

새 본문은 AES 암호화하여 저장하고 응답/미리보기에서 복호화한다. 새 메시지에는 상대방 CHAT_MESSAGE 알림 outbox를 메시지 ID로 한 번 등록한다. 읽음 PATCH는 해당 방의 상대 메시지 중 아직 읽지 않은 행 전체를 갱신하며, 변경 건수가 있을 때 읽음 이벤트를 발행한다. REST는 특정 메시지 번호까지 읽는 요청을 받지 않는다.

## 실시간 연결과 전달

앱은 소켓 연결·room.join 이후 message.send/message.read를 사용한다. 중계 서버는 회원 토큰으로 공개 API를 호출해 저장·읽음을 처리하고 응답을 ACK로 돌려준다. 가입 권한은 access API로 확인한다. message.created·message.read.updated 이벤트의 발행은 API 트랜잭션 커밋 이후이며 발행 예외는 기록한다. DB 저장 성공과 모든 상대 기기의 이벤트 수신 성공은 같은 결과가 아니다.

앱은 입장/재입장 성공과 재동기화 신호에서 since API로 누락을 복구한다. 한 쪽은 100건이고 hasMore가 끝날 때까지 이어 읽는다. 일반 오류는 1·2·4·8초 간격 후 연속 다섯 번째 실패에서 중단해 재시도 안내를 남긴다. 인증·권한·방 없음 오류는 복구를 멈추며, 속도 제한은 Retry-After를 따라 기다린다. 실제 배포 연결·푸시 도착은 이번에 실행하지 않았다.

## 앱 전송·복구·이전 기록

송신 전 계정별 대기 저장소에 고유 키와 내용을 저장한 뒤 임시 말풍선을 추가한다. 소켓 TIMEOUT·NOT_CONNECTED·PERSISTENCE_FAILED일 때만 같은 키로 REST를 시도한다. 명시적 권한/방 거절은 일반적인 REST 재송신 사유가 아니다.

응답이 불명확하면 “전송 결과 확인 중” 상태를 유지하고 이력과 대조한다. 실패한 전송과 결과 미확인을 구분한다. 재시도는 같은 키를 사용하고, 확정 실패의 지우기는 로컬 대기 내용을 제거한다. 서버에 이미 저장된 메시지를 삭제하는 기능이 아니다. 결과 미확인 말풍선에는 지우기를 제공하지 않는다. 앱을 다시 열었을 때 남은 대기 항목도 결과 미확인으로 복원한다.

첫 메시지 페이지는 50건이며 앱에서 id 순으로 합친다. 이전 기록은 페이지를 추가 조회해 중복을 합치고, 중복만 나온 꽉 찬 페이지는 한 호출에서 최대 다섯 쪽까지 더 읽는다. 추가 조회 실패는 기존 대화를 유지하고 이전 기록 재시도를 제공한다. 누락 복구 실패는 별도 재시도이며, 첫 조회 실패·빈 대화·닫힌 방을 구분한다.

방 목록은 갱신·차단/해제 신호를 구독하고 차단한 상대의 방을 즉시 목록에서 제외한 뒤 재조회한다. 목록이 비어 있으면 안내를 표시하며 목록이 있을 때 당겨 갱신한다. 계정 세대가 바뀐 오래된 결과는 현재 방에 적용하지 않는다.

## 권한 변경과 닫힌 대화

room.closed 또는 ROOM_NOT_AVAILABLE을 받으면 송신·재시도·읽음을 닫는다. 이미 화면에 있는 대화는 읽기 전용으로 남을 수 있으나 서버가 닫힌 방의 새 기록 조회를 허용하는 것은 아니다. 작성 입력은 계정/방에 연결된 초안이며 송신 준비가 완료된 시점에 제출한 초안을 소비한다.

송신·만남 제안 단추는 현재 방 목록의 actions에서 결정한다. 목록 재조회 중에는 쓰기 동작을 막고, 조회 실패에는 재시도를 제공한다. 권한 거절 뒤에는 해당 표지의 출처인 방 목록을 다시 확인한다. 사진 신고는 상대 사진 ID가 있어야 가능하며 신고 대상은 DATE_PROFILE_PHOTO다.

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Gap | “실시간 연결 실패. 메시지는 정상 전송됩니다.” 안내는 REST까지 실패할 수 있는 실제 상태보다 강하다. | 연결 실패와 저장/전달 성공을 구분한다. |
| Risk | 방 목록은 전체 최근 메시지순 정렬·페이지 계약이 없다. | 최신순·대량 목록 완료를 약속하지 않는다. |
| Risk | 서버 멱등 키는 선택이고 고유 키 경쟁 예외가 재발생할 수 있다. | 같은 키 재시도와 무키 호출·동시 응답을 구분한다. |
| Risk | 읽음 API는 현재 방의 상대 미읽음 전체를 처리한다. | 소켓의 upToMessageId가 서버 쓰기 범위를 제한한다고 쓰지 않는다. |
| 미검증 | 실제 두 계정·소켓 장애·푸시·앱 재시작·차단 경쟁을 실행하지 않았다. | 소스 대조와 전달/복구 시험 통과를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 입구:** 방 목록·개별 방·알림·매칭 성공 창의 주소와 추가 선택 단계를 구분한다.
- **AC-02 접근:** MATCH/PRIVATE_MEETING 당사자·양방향 차단·ACTIVE와 별도 공개 범위를 명시한다.
- **AC-03 저장:** TEXT·본문 길이·암호화·선택 멱등 키·기존 응답·고유 키 경쟁을 구분한다.
- **AC-04 전달:** 소켓 중계 API 쓰기, ACK, 커밋 후 이벤트, 푸시 등록과 실제 수신을 구분한다.
- **AC-05 결과 복구:** 실패·결과 미확인·같은 키 재시도·대기 복원·since 복구를 구분한다.
- **AC-06 기록과 읽음:** 50건 과거 페이지·추가 실패·100건 증분과 방 전체 읽음 처리를 설명한다.
- **AC-07 종료와 계정:** 닫힌 방의 읽기 전용 잔상, 쓰기 차단, 계정 변경 결과 배제·현재 actions 재판정을 명시한다.

위 기준은 현재 소스에서 확인한 계약과 후속 검증 항목이다. 제품 시험·실제 서비스 연결은 실행하지 않았다.
