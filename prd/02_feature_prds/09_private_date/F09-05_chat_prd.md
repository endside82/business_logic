# F09-05. 채팅 (방 목록 + 메시지) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

매칭(`DateMatch.MATCHED`)이 생성한 `DateChatRoom(ACTIVE)`을 사용해 양 사용자가 1:1 메시지를 주고받는다. 메시지는 AES 암호화되어 DB에 저장되며, 서버는 메시지 송신 시 ApplicationEvent를 발행해 별도 realtime 레이어가 WebSocket 푸시를 처리한다. `clientMessageId` 기반 멱등성 보장으로 재전송 안전, 읽음 처리는 별도 PATCH로 일괄 갱신.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **데이팅 탭 ▶ 채팅 탭** → 방 목록 화면 (`/dating/chat`)
- **F09-03 매칭 다이얼로그 "채팅 시작"** → 직접 `/dating/chat/{chatRoomId}?partnerName=...`
- **F09-04 매칭 카드 탭** → `/dating/chat` (현 구현은 roomId 미전달 — 개선 여지)
- **푸시 알림 탭** → DeepLink로 `/dating/chat/{roomId}?matchId=...&partnerName=...`

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DateChatController`. 앱: `chat_room_list_screen.dart`, `chat_screen.dart`.

<!-- source-references:start -->
서버 창구: `DateChatController#getChatRooms`, `DateChatController#getMessages`, `DateChatController#sendMessage`, `DateChatController#markAsRead`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

### 채팅방 목록 (`chat_room_list_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('채팅')`
  - 방 카드 — 아바타(`otherUserPhotoUrl` or 핑크 fallback), 이름(`otherUserDisplayName` or `User{id}`), 마지막 메시지(없으면 CLOSED일 때 "대화 종료"), 시각, unread 배지
  - 빈 상태: `AppErrorState(title: '채팅방이 없습니다')`
- **사용자가 할 수 있는 액션**:
  - 카드 탭 → `/dating/chat/{roomId}?matchId=...&partnerName=...`
  - 풀투리프레시 → `ref.invalidate(dateChatRoomsNotifierProvider)`
- **TestId**: `screenDatingChatRooms`

### 채팅 (`chat_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: partnerName)` + 우측 📅 액션 (만남 제안 진입)
  - 연결 배지 `_ConnectionBadge` — `connecting/disconnected/failed` 라벨 ("연결 중..." / "재연결 중..." / "오프라인 모드")
  - 메시지 리스트 (역순, `reverse: true`) — 내 버블(`datingPink` 우정렬, "읽음" + 시간) / 상대 버블(흰 배경 좌정렬 + 아바타 + 시간)
  - 빈 상태: "대화를 시작해보세요! 💬"
  - `_TypingIndicator` — 상대 입력 중 "상대방이 입력 중..." 표시
  - 입력바 `_InputBar` — `gray50` 둥근 입력창 + `datingPink` 원형 ➤ 송신 버튼
- **사용자가 할 수 있는 액션**:
  - 진입 시 자동 `_markAsRead()` ▶ `notifier.markRead(currentUserId)` ▶ `PATCH /api/v1/date/chats/{roomId}/read`
  - 메시지 입력 → `_onInputChanged` → typing 시작 이벤트 (소켓), 2초 정지 후 typing 정지 이벤트
  - 송신 ▶ `notifier.send(text, senderId)` ▶ `POST /api/v1/date/chats/{roomId}/messages` (`ChatMessageParam(messageType: 'TEXT', content, clientMessageId: uuid)`) ▶ 실패 시 토스트 "메시지 전송에 실패했습니다."
  - 📅 탭 → `/dating/meeting/{matchId}?partnerName=...` (F09-06)
  - 풀투리프레시 / `invalidate` 가능 (`AppErrorState.fromError(onRetry)`)
  - 소켓 실패 시 1회성 토스트 "실시간 연결 실패. 메시지는 정상 전송됩니다."
- **상태 분기**: `loading` (로딩 인디케이터), `error` (`AppErrorState`), 정상 (메시지 리스트)

## 4. 제품 규칙

- 채팅은 매칭이 성사될 때 열린 방에서만 한다. 방의 두 참여자만 읽고 보낼 수 있고, 아닌 사람은 거절된다.
- 차단이 생기면 방이 닫힌다. 닫힌 방은 목록에서 사라지고 보내기, 기록 조회, 읽음 처리가 모두 막힌다.
- 메시지는 암호화해 저장한다. 같은 메시지를 재전송해도(앱이 붙이는 고유 번호가 같으면) 한 건만 남는다. 빈 메시지는 보내지 않는다.
- 방에 들어오면 읽지 않은 메시지가 한꺼번에 읽음 처리되고, 보낸 메시지 옆에 「읽음」 이 붙는다.
- 내 데이트 프로필이 꺼져 있어도 이미 열린 방의 대화는 할 수 있다.
- 메시지 종류는 텍스트, 이미지, 만남 제안, 시스템이며 앱은 현재 텍스트만 보낸다.
- 화면: 상대가 입력 중이면 「상대방이 입력 중...」 이 보이고(입력을 멈추고 2초 뒤 사라진다), 실시간 연결이 끊기면 연결 상태 배지가 나온다. 연결에 실패해도 메시지는 정상 전송된다는 안내가 한 번 나온다.
- 푸시 알림을 누르면 해당 채팅방으로 바로 간다. 채팅 화면 상단의 달력 아이콘이 만남 제안으로 가는 입구다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 매칭 직후 첫 메시지 송신 (Happy Path) | `DateChatRoom(status=ACTIVE, matchId)`, 메시지 0건. 양 사용자가 채팅 화면 진입. | 메시지 1건, A 측에 "읽음" 표시. |
| S2 | 동일 메시지 재전송 (네트워크 일시 끊김) | 시나리오 본문 참조 | DB에 메시지 1건만 존재. 사용자에게는 두 번 보낸 것처럼 보이지 않음. |
| S3 | CLOSED 방에 송신 시도 | 어느 한쪽이 차단(F09-07) → 채팅방 status=CLOSED. | 메시지 미저장. 사용자는 화면을 떠나야 함. |
| S4 | 비참여자가 메시지 조회 시도 | 시나리오 본문 참조 | 403 응답. |
| S5 | 차단 발동 → 채팅 즉시 종료 | 시나리오 본문 참조 | 양쪽 모두 송신 불가, 방 목록 폴링 시 CLOSED는 ACTIVE 필터로 자연 제거됨. |
| S6 | 신고 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 1년 후 만료된 사용자가 채팅 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 푸시 알림 → 채팅 진입 | 시나리오 본문 참조 | B가 채팅 화면에 들어와 메시지 확인. |
| S9 | 만남 제안으로 이동 | 시나리오 본문 참조 | 사용자 흐름이 만남 제안 단계로 이동. |
| S10 | 비활성 프로필 사용자가 채팅 | 본인 `isActive=false`, 기존 매칭 채팅방 보유. | 이미 열린 방의 대화는 계속 가능하다(서버가 허용). |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 닫힌 방 화면 | 방이 닫히면 입력창 대신 서버가 준 막힘 이유를, 없으면 「이 채팅방은 더 이상 사용할 수 없습니다」 를 보여 주고 다시 보내기도 닫힌다. 실시간으로 닫힘을 받으면 차단이나 종료로 전송과 읽음이 멈췄다는 안내 띠도 뜬다 | 없음 |

## 9. 수용 기준

- **AC-01. 매칭 직후 첫 메시지 송신 (Happy Path)**: Given `DateChatRoom(status=ACTIVE, matchId)`, 메시지 0건. 양 사용자가 채팅 화면 진입. When 사용자가 해당 흐름을 실행하면 Then 메시지 1건, A 측에 "읽음" 표시.
- **AC-02. 동일 메시지 재전송 (네트워크 일시 끊김)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB에 메시지 1건만 존재. 사용자에게는 두 번 보낸 것처럼 보이지 않음.
- **AC-03. CLOSED 방에 송신 시도**: Given 어느 한쪽이 차단(F09-07) → 채팅방 status=CLOSED. When 사용자가 해당 흐름을 실행하면 Then 메시지 미저장. 사용자는 화면을 떠나야 함.
- **AC-04. 비참여자가 메시지 조회 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 403 응답.
- **AC-05. 차단 발동 → 채팅 즉시 종료**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 양쪽 모두 송신 불가, 방 목록 폴링 시 CLOSED는 ACTIVE 필터로 자연 제거됨.
- **AC-06. 신고 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 1년 후 만료된 사용자가 채팅 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 푸시 알림 → 채팅 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then B가 채팅 화면에 들어와 메시지 확인.
- **AC-09. 만남 제안으로 이동**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자 흐름이 만남 제안 단계로 이동.
- **AC-10. 비활성 프로필 사용자가 채팅**: Given 본인 `isActive=false`, 기존 매칭 채팅방 보유. When 메시지를 보내면 Then 정상 전송된다.
