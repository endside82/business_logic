# F09-03. 후보자 카드 & 매칭 액션 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

후보 카드를 한 장씩 보여 주고 버튼으로 LIKE/PASS를 받는다. drag/swipe gesture는 없다. 양쪽 LIKE가 일치하면 `DateMatch.MATCHED` + `DateChatRoom.ACTIVE` 채팅방을 즉시 생성하고, 매칭 미성사 시 7일짜리 PENDING row를 보관한다. 후보 쿼리는 이미 내가 처리한 상대와 나를 넘긴 상대를 제외한다.

### 2026-07-29 소스 재실측 — 후보 하드필터와 점수 옵트인

- 기존 성별·연령·차단·활성 프로필 조건 뒤에 **조회자 관점의 단방향 결격 필터**가 적용된다.
  - `excludeSmoker=true`이면 후보 `SMOKER` 제외
  - `excludeHeavyDrinker=true`이면 후보 `OFTEN` 제외
  - `excludeCasualPurpose=true`이면 후보 `CASUAL` 제외
  - `sameReligionOnly=true`이면 양쪽 종교가 모두 non-null이고 서로 다를 때만 제외
- 후보의 특성 값이 null이면 위 결격 필터를 통과한다. 필터가 상호 대칭으로 강제되는 것은 아니며 현재 조회자의 설정만 적용한다.
- 기본 점수 성분은 태그 교집합 0.30, 지역 0.25, 상호 연령 선호 0.20, 신뢰점수 유사도 0.15, 활동성 0.10이다. 태그·신뢰점수는 양쪽 `communityDataOptIn=true`일 때만 포함한다.
- 한쪽이라도 미동의면 지역·연령·활동성 성분의 합으로 가중치를 재정규화한다. 신규 프로필 보너스는 30일 범위 최대 +0.15, 과다 노출 페널티는 최대 -0.10이며 옵트인과 무관하다.
- trait 검사 점수와 내부 `behaviorStyleEstimate`는 현재 데이팅 후보 점수에 사용되지 않는다.

실측 근거: `DateMatchingService.passesDealbreakers`, `MatchScoringService.calculateMatchScore`, `DateProfileQueryRepository`, 관련 service/repository 테스트.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **데이팅 탭 메인** — `/dating`과 `/dating/candidates` 모두 같은 후보 카드 화면
- **매칭 목록 빈 상태에서 "후보자 둘러보기" 버튼** (스펙)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DateMatchController`, `DateProfileController`, `DateMatchExpirationScheduler`. 앱: `candidate_card_screen.dart`, `date_block_reason_sheet.dart`.

## 3. 전체 동작 흐름

### 후보자 카드 (`candidate_card_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '')` (배경 `gray50`)
  - 가드 분기:
    - 프로필 조회 실패 시 — 인증 안내 화면 + "프로필 만들기" 버튼 → `/dating/verification` 이동
  - 후보 스택 (`_CandidateStack`) — 한 번에 1장. 카드 위에 사진(또는 핑크 fallback), 그라데이션 오버레이, 좌하단에 "{displayName}, {age}" + 📍 지역 + 자기소개 2줄
  - 카드 우상단에 "더보기" `more_vert` IconButton — 탭 시 바텀시트(차단 메뉴)
  - 하단 액션 버튼 2개: ✕ 패스(흰배경 + 그림자), ♥ LIKE(`datingPink` 원형)
  - 모든 후보 소진 시 `AppErrorState(title: '모든 후보를 확인했습니다')`
- **사용자가 할 수 있는 액션**:
  - ♥ 탭 ▶ `_onAction(candidate, 'LIKE')` ▶ `POST /api/v1/date/matches/action {targetUserId, action: 'LIKE'}` ▶ 응답 `isMatched=true` 시 매칭 다이얼로그, 아니면 다음 카드
  - ✕ 탭 ▶ 동일 흐름, action=`PASS`
  - 좌상단 "더보기" → 바텀시트 `_showActionSheet` → "차단" 탭 ▶ `DateBlockReasonSheet.show` → 사유 받아 `matchActionNotifier.blockUser(userId, reason)` ▶ `POST /api/v1/date/blocks/{targetUserId}?reason=...` ▶ 토스트 + 다음 카드 (F09-07 호출)
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`
  - 빈 후보: `AppErrorState(title: '추천 상대가 없습니다')`
- **모달/시트**:
  - 매칭 성공 시 `AlertDialog` "매칭 성공! 🎉" + 두 버튼 ("계속 둘러보기" / "채팅 시작")
  - "채팅 시작" 탭 시 `chatRoomId`로 `/dating/chat/{chatRoomId}?partnerName=...` push (F09-05 진입)
  - 더보기 시트: 차단 액션 1개

## 4. 제품 규칙

- 후보는 활성이고 전체 공개이며, 내 선호 성별에 맞고, 인증이 유효한 본인 외의 사람이다. 한 번에 최대 20명을 점수순으로 주고, 같은 점수는 회원 번호순이다.
- 이미 좋아요나 넘김을 한 상대와 나를 넘긴 상대는 후보에서 빠진다. 상대가 먼저 좋아요를 눌렀고 내가 아직 응답하지 않았다면 남아 있다.
- 내 인증이 없거나 프로필이 없으면 후보를 볼 수 없고, 인증 안내 화면으로 보낸다.
- 양쪽이 좋아요를 누르면 바로 매칭이 되고 채팅방이 열린다. 한쪽만 누르면 7일간 응답 대기로 두고, 7일이 지나면 만료된다. 한쪽이 넘기고 상대도 이미 넘긴 상태면 거절로 끝난다.
- 이미 매칭된 상대에게는 다시 보낼 수 없다. 차단 관계(어느 쪽이든)면 거절된다. 처음 상호작용하는 상대가 비활성이거나 전체 공개가 아니면 없는 프로필로 취급한다. 상대의 인증이 만료되었다면 좋아요는 닿지 않지만 넘기기는 할 수 있다.
- 좋아요와 넘김을 누른 상대의 「나를 본 사람」 목록에 내가 기록된다.
- 화면은 카드를 한 장씩 보여 주고 스와이프 없이 ✕, ♥ 버튼으로 고른다. 후보가 없으면 「추천 상대가 없습니다」, 다 보면 「모든 후보를 확인했습니다」 안내가 나온다. 더보기에서 바로 차단할 수 있고 차단하면 다음 카드로 넘어간다.
- 매칭이 되면 「계속 둘러보기」와 「채팅 시작」 두 선택이 있는 창이 뜬다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | LIKE → 상대도 LIKE → 즉시 매칭 + 채팅 시작 (Happy Path) | 후보자 카드 화면. 상대(targetUserId=42)가 이미 나에게 LIKE 한 상태(즉, `DateMatch(user1=42, user2=me, user1Action=LIKE, user2Action=PENDING, status=PENDING)` 존재). | `DateMatch.status=MATCHED, DateChatRoom.status=ACTIVE`. 매칭 목록(F09-04)·채팅방 목록(F09-05)에 반영. |
| S2 | LIKE → 상대 미응답 → 7일 PENDING 보류 | 시나리오 본문 참조 | 사용자에게는 매칭 목록의 `새매칭` 탭에 PENDING 카드가 일정 기간 노출됨 (잔여시간 배너 — F09-04). |
| S3 | PASS → 상대도 이미 PASS → REJECTED | 상대가 이미 PASS한 PENDING 페어 | row는 REJECTED로 보존되고, 이 페어는 후보 쿼리에서 제외되어 다시 노출되지 않는다. |
| S4 | 차단된 사용자에게 LIKE 시도 | 내가 user42를 차단한 상태에서 어쩐 일로 카드가 노출(또는 캐시). | 매칭 미생성. |
| S5 | 이미 매칭된 사용자에게 LIKE 재시도 | 시나리오 본문 참조 | 무변동. |
| S6 | 미인증 / 프로필 미작성 사용자가 후보자 호출 | 시나리오 본문 참조 | 가드 통과 후 재시도 가능. |
| S7 | 차단(횡단) — 카드에서 즉시 차단 | 시나리오 본문 참조 | 후보자 풀에서 영구 제외(차단 해제 전까지). |
| S8 | 신고 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 동시성 — 같은 사용자에게 두 번 빠르게 LIKE 탭 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:86 | - `DateMatchExpirationScheduler` (`service/DateMatchExpirationScheduler.java`) — 7일 만료된 PENDING 매치를 `EXPIRED`로 전환 (본 작업 범위 외 상세는 미확인, 존재 사실만) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:50 | - **카드 1장씩 진행**: `_currentIndex`로 단순 인덱스 진행. 실제 스와이프 제스처는 미구현 — 액션 버튼 탭만 사용. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:83 | 2. 클라이언트는 첫 응답에서 `removeCandidate` + 인덱스++ 했으므로 두 번째 액션은 다음 카드 대상이 되어버릴 위험. 코드 보호 장치는 명시적이지 않음 (UX 개선 여지 있음). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. LIKE → 상대도 LIKE → 즉시 매칭 + 채팅 시작 (Happy Path)**: Given 후보자 카드 화면. 상대(targetUserId=42)가 이미 나에게 LIKE 한 상태(즉, `DateMatch(user1=42, user2=me, user1Action=LIKE, user2Action=PENDING, status=PENDING)` 존재). When 사용자가 해당 흐름을 실행하면 Then `DateMatch.status=MATCHED, DateChatRoom.status=ACTIVE`. 매칭 목록(F09-04)·채팅방 목록(F09-05)에 반영.
- **AC-02. LIKE → 상대 미응답 → 7일 PENDING 보류**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게는 매칭 목록의 `새매칭` 탭에 PENDING 카드가 일정 기간 노출됨 (잔여시간 배너 — F09-04).
- **AC-03. PASS → 상대도 이미 PASS → REJECTED**: Given 상대가 이미 PASS한 PENDING 페어 When 내가 PASS하면 Then row는 REJECTED가 되고 이 페어는 후보에서 제외된다.
- **AC-04. 차단된 사용자에게 LIKE 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 매칭 미생성.
- **AC-05. 이미 매칭된 사용자에게 LIKE 재시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무변동.
- **AC-06. 미인증 / 프로필 미작성 사용자가 후보자 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가드 통과 후 재시도 가능.
- **AC-07. 차단(횡단) — 카드에서 즉시 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 후보자 풀에서 영구 제외(차단 해제 전까지).
- **AC-08. 신고 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 동시성 — 같은 사용자에게 두 번 빠르게 LIKE 탭**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
