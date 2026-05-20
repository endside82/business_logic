# F09-04. 매칭 목록 조회 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/09_private_date/F09-04_match_list -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-04_match_list`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 가진 모든 데이팅 매칭(상태 무관 또는 status 필터)을 페이지로 반환하고, 단건 상세 조회를 제공한다. 응답에는 채팅방의 최근 메시지 미리보기와 미읽음 카운트를 함께 enrich(merge)하여 매칭 목록만으로도 진척 상태(새매칭/대화중)를 보여준다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **하단 데이팅 탭 ▶ "매칭" 탭** (`/dating/matches`)
- **F09-03 매칭 다이얼로그 "채팅 시작"** 클릭 시 직접 채팅으로 이동하므로 본 화면을 거치지 않을 수 있음 — 이 화면은 매칭 목록 진척을 한눈에 볼 때 사용

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-04_match_list/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-04_match_list/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-04_match_list/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-04_match_list/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateMatchController.java:35` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateMatchController.java:43` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 매칭 목록 (`match_list_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('매칭')`
  - 상단 탭바 — 3개: `전체 / 새매칭 / 대화중` (커스텀 SegmentedControl, `gray200` 배경 + 선택 흰 배경)
  - 비활성 프로필 배너 (조건부): `asyncProfile.valueOrNull != null && !isActive` 시 노란 띠 ("프로필이 비활성화 상태입니다…")
  - "새로운 매칭 💕" 가로 스크롤 (최대 5개 아바타) — 매칭일이 있는 항목 추출
  - 새매칭 아바타 — `User{id}` 텍스트 placeholder, 만료 임박이면 잔여시간 표시(분/시간/일), `EXPIRED`면 회색 + 시계 차단 아이콘
  - "대화중" 섹션의 매치 카드 (`_MatchChatItem`) — 아바타, `User{id}`, 마지막 메시지(없으면 status), 시간, unread 배지, "더보기" 메뉴
  - PENDING 매치는 카드 상단에 "응답 대기 중 · {잔여}" 만료 배너 (6시간 내면 빨강, 그 외 노랑)
  - EXPIRED 매치는 카드 전체가 회색톤 + "만료됨" 배지
- **사용자가 할 수 있는 액션**:
  - 탭 전환: `setState(_tabIndex = i)` — 현 코드는 `'새매칭'/'대화중'` 둘 다 `status='MATCHED'` 로 보내고 클라이언트 측에서 분리(스펙과 차이)
  - 매치 카드 탭 → `context.push('/dating/chat')` — **현 구현은 roomId 없이 push하므로 연결성 미흡(개선 여지)**
  - "더보기" → 바텀시트 → "차단" → `DateBlockReasonSheet` → `matchActionNotifier.blockUser(userId, reason)` (F09-07)
  - 풀투리프레시 (`RefreshIndicator`) → `ref.invalidate(dateMatchesNotifierProvider(status: status))`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`
  - 빈 상태: `AppErrorState(title: '매칭이 없습니다')`

## 4. 서버 계약

### 개요

사용자가 가진 모든 데이팅 매칭(상태 무관 또는 status 필터)을 페이지로 반환하고, 단건 상세 조회를 제공한다. 응답에는 채팅방의 최근 메시지 미리보기와 미읽음 카운트를 함께 enrich(merge)하여 매칭 목록만으로도 진척 상태(새매칭/대화중)를 보여준다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/date/matches | DateMatchController#getMatches | required | 매칭 페이지 (status 필터 가능, 채팅 enrich 포함) |
| GET | /api/v1/date/matches/{matchId} | DateMatchController#getMatch | required | 매칭 단건 조회 (참여자만) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum `MatchStatus`**: `PENDING, MATCHED, REJECTED, EXPIRED, BLOCKED`
- **Enum `MatchAction`**: `PENDING(0), LIKE(1), PASS(2)`
- **Entity `DateMatch`**: 위 F09-03 backend.md 참조
- **VO `DateMatchVo`**: 위 응답 필드. `unreadCount/lastMessage/lastMessageAt`는 service에서 후처리 주입(DTO에는 setter 존재)

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-03**이 만든 매치 row와 채팅방을 그대로 조회
  - **F09-05** (`DateChatService#enrichMatchWithChatInfo`) — 채팅 미리보기 enrich를 위해 호출
  - **F09-07** — 차단 시 `status=BLOCKED`로 변경된 row가 본 응답에 그대로 포함됨 (status 필터로 제외 가능)
- 외부:
  - 없음 (AES 복호화 키만 내부)

## 5. 프론트 계약

### 진입 경로

- **하단 데이팅 탭 ▶ "매칭" 탭** (`/dating/matches`)
- **F09-03 매칭 다이얼로그 "채팅 시작"** 클릭 시 직접 채팅으로 이동하므로 본 화면을 거치지 않을 수 있음 — 이 화면은 매칭 목록 진척을 한눈에 볼 때 사용

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/dating/matches` (`Routes.datingMatches`) | `presentation/date/screens/match_list_screen.dart` | 탭 필터 + 새매칭/대화중 섹션 + 차단 시트 |

### 화면별 구성 요소 & 액션

### 매칭 목록 (`match_list_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('매칭')`
  - 상단 탭바 — 3개: `전체 / 새매칭 / 대화중` (커스텀 SegmentedControl, `gray200` 배경 + 선택 흰 배경)
  - 비활성 프로필 배너 (조건부): `asyncProfile.valueOrNull != null && !isActive` 시 노란 띠 ("프로필이 비활성화 상태입니다…")
  - "새로운 매칭 💕" 가로 스크롤 (최대 5개 아바타) — 매칭일이 있는 항목 추출
  - 새매칭 아바타 — `User{id}` 텍스트 placeholder, 만료 임박이면 잔여시간 표시(분/시간/일), `EXPIRED`면 회색 + 시계 차단 아이콘
  - "대화중" 섹션의 매치 카드 (`_MatchChatItem`) — 아바타, `User{id}`, 마지막 메시지(없으면 status), 시간, unread 배지, "더보기" 메뉴
  - PENDING 매치는 카드 상단에 "응답 대기 중 · {잔여}" 만료 배너 (6시간 내면 빨강, 그 외 노랑)
  - EXPIRED 매치는 카드 전체가 회색톤 + "만료됨" 배지
- **사용자가 할 수 있는 액션**:
  - 탭 전환: `setState(_tabIndex = i)` — 현 코드는 `'새매칭'/'대화중'` 둘 다 `status='MATCHED'` 로 보내고 클라이언트 측에서 분리(스펙과 차이)
  - 매치 카드 탭 → `context.push('/dating/chat')` — **현 구현은 roomId 없이 push하므로 연결성 미흡(개선 여지)**
  - "더보기" → 바텀시트 → "차단" → `DateBlockReasonSheet` → `matchActionNotifier.blockUser(userId, reason)` (F09-07)
  - 풀투리프레시 (`RefreshIndicator`) → `ref.invalidate(dateMatchesNotifierProvider(status: status))`
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`
  - 빈 상태: `AppErrorState(title: '매칭이 없습니다')`

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **탭과 status 매핑**:
  - `전체` → status=null
  - `새매칭` / `대화중` → 둘 다 status=`'MATCHED'` (현 구현). PENDING은 `전체` 탭에서만 보임
- **새 매칭/대화중 분리**: 현 구현은 `matches.where((m) => m.matchedAt != null).take(5)`를 새 매칭으로 가로 스크롤, 전체 목록은 "대화중" 섹션에 노출 (실제로는 더 정교한 분리 로직이 필요 — 현 코드 한계)
- **잔여시간 표기 규칙**:
  - 60분 미만: `${분}분`
  - 24시간 미만: `${시간}시간`
  - 그 외: `${일}일`
  - 6시간 이내: 배경 `error50`, 텍스트 `error600`. 그 외: `warning50` / `warning600`
- **만료된 매치 디자인**: 회색 카드 + "만료됨" 배지 + "매칭이 만료되었습니다" 텍스트
- **unread 배지**: 99 초과 시 "99+", 최대 22x22 원형 `datingPink`
- **시간 표기**: 분 < 60 → `${n}분 전`, 시간 < 24 → `${n}시간 전`, 1일 → "어제", 그 외 `${n}일 전`
- **TestId**: `screenDatingMatches`
- **차단 시트와 사유 입력**: `DateBlockReasonSheet.show(context, targetNickname: ...)` — null 시 액션 취소
- **사용자 표시명 미존재**: 현 구현은 `User${userId}` 폴백 (실제로는 partnerProfile 조회가 필요)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 새 매칭 직후 매칭 목록 진입 (Happy Path) | 매치 1건 (`status=MATCHED, matchedAt=now-5m`), 채팅방 1개(메시지 0건). | 사용자가 채팅으로 이동. |
| S2 | PENDING 매치의 잔여시간 표시 | 5일 전에 LIKE 했지만 상대 무응답. `expiresAt = now + 2일`. | 사용자에게 자동으로 만료 임박 인지. |
| S3 | 비활성 프로필 사용자가 매칭 목록 진입 | `DateProfile.isActive=false`, 기존 매칭 3건 보유. | 사용자가 토글 켜기 전까지 신규 매칭 미수신. |
| S4 | EXPIRED 매치 처리 | PENDING이었으나 7일 경과로 스케줄러가 EXPIRED로 변경한 매치. | 사용자에게 만료 인지. 새 매칭을 위해 후보자(F09-03)로 돌아가야 함. |
| S5 | 권한 없는 단건 조회 시도 | 시나리오 본문 참조 | 무변동. |
| S6 | 차단 발동 → 매치 BLOCKED 상태가 목록에 반영 | 시나리오 본문 참조 | 사용자에게 차단 결과 시각적으로 반영 (다만 현 화면 구현은 BLOCKED 별도 디자인이 명확히 분기되지는 않음). |
| S7 | 신고 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 페이지네이션 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. 새 매칭 직후 매칭 목록 진입 (Happy Path)**: Given 매치 1건 (`status=MATCHED, matchedAt=now-5m`), 채팅방 1개(메시지 0건). When 사용자가 해당 흐름을 실행하면 Then 사용자가 채팅으로 이동.
- **AC-02. PENDING 매치의 잔여시간 표시**: Given 5일 전에 LIKE 했지만 상대 무응답. `expiresAt = now + 2일`. When 사용자가 해당 흐름을 실행하면 Then 사용자에게 자동으로 만료 임박 인지.
- **AC-03. 비활성 프로필 사용자가 매칭 목록 진입**: Given `DateProfile.isActive=false`, 기존 매칭 3건 보유. When 사용자가 해당 흐름을 실행하면 Then 사용자가 토글 켜기 전까지 신규 매칭 미수신.
- **AC-04. EXPIRED 매치 처리**: Given PENDING이었으나 7일 경과로 스케줄러가 EXPIRED로 변경한 매치. When 사용자가 해당 흐름을 실행하면 Then 사용자에게 만료 인지. 새 매칭을 위해 후보자(F09-03)로 돌아가야 함.
- **AC-05. 권한 없는 단건 조회 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무변동.
- **AC-06. 차단 발동 → 매치 BLOCKED 상태가 목록에 반영**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 차단 결과 시각적으로 반영 (다만 현 화면 구현은 BLOCKED 별도 디자인이 명확히 분기되지는 않음).
- **AC-07. 신고 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 페이지네이션**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
