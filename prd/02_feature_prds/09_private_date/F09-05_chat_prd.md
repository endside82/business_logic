# F09-05. 채팅 (방 목록 + 메시지) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/09_private_date/F09-05_chat -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-05_chat`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

매칭(`DateMatch.MATCHED`)이 생성한 `DateChatRoom(ACTIVE)`을 사용해 양 사용자가 1:1 메시지를 주고받는다. 메시지는 AES 암호화되어 DB에 저장되며, 서버는 메시지 송신 시 ApplicationEvent를 발행해 별도 realtime 레이어가 WebSocket 푸시를 처리한다. `clientMessageId` 기반 멱등성 보장으로 재전송 안전, 읽음 처리는 별도 PATCH로 일괄 갱신.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **데이팅 탭 ▶ 채팅 탭** → 방 목록 화면 (`/dating/chat`)
- **F09-03 매칭 다이얼로그 "채팅 시작"** → 직접 `/dating/chat/{chatRoomId}?partnerName=...`
- **F09-04 매칭 카드 탭** → `/dating/chat` (현 구현은 roomId 미전달 — 개선 여지)
- **푸시 알림 탭** → DeepLink로 `/dating/chat/{roomId}?matchId=...&partnerName=...`

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-05_chat/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-05_chat/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-05_chat/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-05_chat/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java:31` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java:38` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java:47` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java:56` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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
  - 비활성 프로필 배너 (조건부): "프로필이 비활성화 상태에서는 메시지를 보낼 수 없습니다" — 입력바 미노출
  - 입력바 `_InputBar` — `gray50` 둥근 입력창 + `datingPink` 원형 ➤ 송신 버튼
- **사용자가 할 수 있는 액션**:
  - 진입 시 자동 `_markAsRead()` ▶ `notifier.markRead(currentUserId)` ▶ `PATCH /api/v1/date/chats/{roomId}/read`
  - 메시지 입력 → `_onInputChanged` → typing 시작 이벤트 (소켓), 2초 정지 후 typing 정지 이벤트
  - 송신 ▶ `notifier.send(text, senderId)` ▶ `POST /api/v1/date/chats/{roomId}/messages` (`ChatMessageParam(messageType: 'TEXT', content, clientMessageId: uuid)`) ▶ 실패 시 토스트 "메시지 전송에 실패했습니다."
  - 📅 탭 → `/dating/meeting/{matchId}?partnerName=...` (F09-06)
  - 풀투리프레시 / `invalidate` 가능 (`AppErrorState.fromError(onRetry)`)
  - 소켓 실패 시 1회성 토스트 "실시간 연결 실패. 메시지는 정상 전송됩니다."
- **상태 분기**: `loading` (로딩 인디케이터), `error` (`AppErrorState`), 정상 (메시지 리스트)

## 4. 서버 계약

### 개요

매칭(`DateMatch.MATCHED`)이 생성한 `DateChatRoom(ACTIVE)`을 사용해 양 사용자가 1:1 메시지를 주고받는다. 메시지는 AES 암호화되어 DB에 저장되며, 서버는 메시지 송신 시 ApplicationEvent를 발행해 별도 realtime 레이어가 WebSocket 푸시를 처리한다. `clientMessageId` 기반 멱등성 보장으로 재전송 안전, 읽음 처리는 별도 PATCH로 일괄 갱신.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/date/chats | DateChatController#getChatRooms | required | 내 활성 채팅방 목록 |
| GET | /api/v1/date/chats/{roomId}/messages | DateChatController#getMessages | required | 메시지 페이지 (createdAt 내림차순) |
| POST | /api/v1/date/chats/{roomId}/messages | DateChatController#sendMessage | required | 메시지 전송 (AES + 멱등) |
| PATCH | /api/v1/date/chats/{roomId}/read | DateChatController#markAsRead | required | 미읽음 메시지 일괄 읽음 처리 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum `ChatRoomStatus`**: `ACTIVE, CLOSED, INACTIVE`
- **Enum `MessageType`** (int code): `TEXT(0), IMAGE(1), MEETING_PROPOSAL(2), SYSTEM(3)`
- **Entity `DateChatRoom`**: `id, matchId, status, createdAt, closedAt?`
- **Entity `DateChatMessage`**: `id, roomId, senderId, clientMessageId?, messageType(int), content(byte[] AES), isRead, createdAt`
- **VO `ChatRoomVo`**, **VO `ChatMessageVo`**, **VO `MarkAsReadVo`**

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-03** — `DateMatch.MATCHED` 시점에 채팅방이 생성되어 본 도메인의 입력
  - **F09-04** — 매칭 목록의 enrich에 본 서비스(`enrichMatchWithChatInfo`) 사용
  - **F09-06** — 만남 제안 발생 시 `messageType=MEETING_PROPOSAL` 메시지로 표현 가능 (현 코드 직접 호출은 없음, 향후 통합 가능)
  - **F09-07** — 차단 시 `chatRoom.status=CLOSED` 전환되어 본 메시지 송신이 막힘
- 외부:
  - `notification` 도메인 → FCM/이메일 발송
  - `realtime` 패키지 → WebSocket 브로드캐스트 (DateChatRealtimeEventListener)
  - AES 키 (대칭 암호화)

## 5. 프론트 계약

### 진입 경로

- **데이팅 탭 ▶ 채팅 탭** → 방 목록 화면 (`/dating/chat`)
- **F09-03 매칭 다이얼로그 "채팅 시작"** → 직접 `/dating/chat/{chatRoomId}?partnerName=...`
- **F09-04 매칭 카드 탭** → `/dating/chat` (현 구현은 roomId 미전달 — 개선 여지)
- **푸시 알림 탭** → DeepLink로 `/dating/chat/{roomId}?matchId=...&partnerName=...`

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/dating/chat` (`Routes.datingChatRooms`) | `presentation/date/screens/chat_room_list_screen.dart` | 활성 채팅방 목록 |
| `/dating/chat/:roomId` (`Routes.datingChat`) | `presentation/date/screens/chat_screen.dart` | 1:1 메시지 송수신 + 만남 제안 진입 |

쿼리: `matchId`, `partnerName`(URL 인코딩).

### 화면별 구성 요소 & 액션

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
  - 비활성 프로필 배너 (조건부): "프로필이 비활성화 상태에서는 메시지를 보낼 수 없습니다" — 입력바 미노출
  - 입력바 `_InputBar` — `gray50` 둥근 입력창 + `datingPink` 원형 ➤ 송신 버튼
- **사용자가 할 수 있는 액션**:
  - 진입 시 자동 `_markAsRead()` ▶ `notifier.markRead(currentUserId)` ▶ `PATCH /api/v1/date/chats/{roomId}/read`
  - 메시지 입력 → `_onInputChanged` → typing 시작 이벤트 (소켓), 2초 정지 후 typing 정지 이벤트
  - 송신 ▶ `notifier.send(text, senderId)` ▶ `POST /api/v1/date/chats/{roomId}/messages` (`ChatMessageParam(messageType: 'TEXT', content, clientMessageId: uuid)`) ▶ 실패 시 토스트 "메시지 전송에 실패했습니다."
  - 📅 탭 → `/dating/meeting/{matchId}?partnerName=...` (F09-06)
  - 풀투리프레시 / `invalidate` 가능 (`AppErrorState.fromError(onRetry)`)
  - 소켓 실패 시 1회성 토스트 "실시간 연결 실패. 메시지는 정상 전송됩니다."
- **상태 분기**: `loading` (로딩 인디케이터), `error` (`AppErrorState`), 정상 (메시지 리스트)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **메시지 정렬**: 서버는 createdAt 내림차순 페이지를 반환. 클라이언트는 정상 ascending state로 보관 후 `reverse:true` ListView로 역순 렌더 (`messages.reversed.toList()`)
- **typing 디바운스**: 2초 (`Duration(seconds: 2)`)
- **clientMessageId**: 클라이언트 UUID 생성 → 동일 메시지 재전송 시 서버 멱등 (DataIntegrityViolation 시에도 기존 row 반환)
- **소켓 연결 상태 표기**: idle/connected는 표시 안 함, connecting/disconnected/failed만 배지 노출
- **소켓 실패 토스트 1회 정책**: `_connectionToastShown` 플래그로 동일 세션에서 1회만
- **읽음 표시 위치**: 내 버블 시각 옆 "읽음" (메시지에 `isRead=true`인 경우)
- **AppBar 액션**: 만남 제안 아이콘은 이모지 📅 (16pt) — Pretendard 폰트로 렌더
- **입력바 색상**: 입력창 배경 `gray50`, 송신 버튼 `datingPink` 원형 36x36
- **TestId**: `screenDatingChat`, `screenDatingChatInput`, `screenDatingChatSend`, `screenDatingChatRooms`
- **빈 메시지 송신 보호**: `text.trim().isEmpty` 시 미송신
- **비활성 프로필 정책**: 본인 프로필 비활성 시 입력바 자체를 숨기고 안내 텍스트 노출 (서버에는 이 가드가 없으므로 클라이언트 정책)
- **시간 표기**: `HH:mm` (zero-padded)
- **메시지 타입**: 클라이언트는 현재 `TEXT`만 송신. IMAGE/MEETING_PROPOSAL/SYSTEM은 서버 enum에 정의되어 있으나 본 화면에서 직접 송신 UI 없음

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
| S10 | 비활성 프로필 사용자가 채팅 시도 | 본인 `isActive=false`, 기존 매칭 채팅방 보유. | 일방적 송신 차단. 토글 ON 시 정상화. |

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
| 후보 | scenarios.md:52 | 3. 채팅 화면이 다음 fetch에서 에러 또는 CLOSED 분기 진입 (현 화면은 CLOSED 디자인 별도 분기 미구현 — 송신 시 에러로 인지) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

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
- **AC-10. 비활성 프로필 사용자가 채팅 시도**: Given 본인 `isActive=false`, 기존 매칭 채팅방 보유. When 사용자가 해당 흐름을 실행하면 Then 일방적 송신 차단. 토글 ON 시 정상화.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
