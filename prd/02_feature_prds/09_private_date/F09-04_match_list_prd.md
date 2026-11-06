# F09-04. 매칭 목록 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 가진 모든 데이팅 매칭(상태 무관 또는 status 필터)을 페이지로 반환하고, 단건 상세 조회를 제공한다. 응답에는 채팅방의 최근 메시지 미리보기와 미읽음 카운트를 함께 enrich(merge)하여 매칭 목록만으로도 진척 상태(새매칭/대화중)를 보여준다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **하단 데이팅 탭 ▶ "매칭" 탭** (`/dating/matches`)
- **F09-03 매칭 다이얼로그 "채팅 시작"** 클릭 시 직접 채팅으로 이동하므로 본 화면을 거치지 않을 수 있음 — 이 화면은 매칭 목록 진척을 한눈에 볼 때 사용

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DateMatchController`, `DateChatService`. 앱: `match_list_screen.dart`.

<!-- source-references:start -->
서버 창구: `DateMatchController#getMatches`, `DateMatchController#getMatch`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 매칭 상태는 응답 대기(PENDING), 매칭됨(MATCHED), 거절(REJECTED), 만료(EXPIRED), 차단(BLOCKED)이다. 목록은 상태로 거를 수 있고 매칭 당사자만 단건을 볼 수 있다.
- 각 매칭에는 채팅 마지막 메시지와 읽지 않은 수가 붙는다(99 넘으면 99+).
- 응답 대기 카드에는 남은 시간(60분 미만은 분, 24시간 미만은 시간, 그 밖은 일)이 보이고 6시간 안이면 강조색이다. 만료된 카드는 회색에 「만료됨」 이 붙는다.
- 응답 대기 매칭은 「전체」 탭에서만 보인다. 새 매칭 가로 목록은 최대 5개다.
- 차단하면 그 매칭은 차단 상태가 되고, 목록에는 새로 고침해야 반영된다.
- 매칭이 없으면 「매칭이 없습니다」 안내가 나온다.

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
