# F09-03. 후보자 카드 & 매칭 액션 PRD

<!-- generated: source-first-unit-sync; updated: 2026-07-29; unit: business_logic/units/09_private_date/F09-03_candidate_swipe -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-03_candidate_swipe`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

후보 카드를 한 장씩 보여 주고 버튼으로 LIKE/PASS를 받는다. drag/swipe gesture는 없다. 양쪽 LIKE가 일치하면 `DateMatch.MATCHED` + `DateChatRoom.ACTIVE` 채팅방을 즉시 생성하고, 매칭 미성사 시 7일짜리 PENDING row를 보관한다. 현재 후보 쿼리는 과거 액션·매치 row를 제외하지 않아 이미 처리한 페어도 재노출될 수 있다.

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

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-03_candidate_swipe/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-03_candidate_swipe/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-03_candidate_swipe/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-03_candidate_swipe/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateMatchController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:92` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

활성·PUBLIC 후보를 필터링해 카드 데이터를 반환하고 LIKE/PASS 액션을 처리한다. 후보 쿼리는 과거 LIKE/PASS나 PENDING/REJECTED/MATCHED row를 제외하지 않으므로 이미 처리한 페어가 재노출될 수 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/date/profile/candidates | DateProfileController#getCandidates | required | 점수순 후보 ≤20명 반환 |
| POST | /api/v1/date/matches/action | DateMatchController#performAction | required | LIKE/PASS 액션 → 매칭/PENDING/REJECTED 결정 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum `MatchAction`** (int code): `PENDING(0), LIKE(1), PASS(2)`
- **Enum `MatchStatus`**: `PENDING, MATCHED, REJECTED, EXPIRED, BLOCKED`
- **Enum `ChatRoomStatus`**: `ACTIVE, CLOSED, INACTIVE`
- **Entity `DateMatch`**: `id, user1Id, user2Id, status(MatchStatus), user1Action(int), user2Action(int), matchedAt?, expiresAt, createdAt, updatedAt`
- **Entity `DateChatRoom`**: `id, matchId, status(ChatRoomStatus), createdAt, closedAt?`
- **VO `DateCandidateVo`**: 후보 카드 데이터
- **VO `MatchActionVo`**: 액션 결과(`matchId, isMatched, chatRoomId`)

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-01** — `isVerified` 가드 (액션·후보 모두)
  - **F09-02** — 내 프로필 미존재 시 후보자 조회 차단
  - **F09-07** — 양방향 차단 관계 검사
  - **F09-04** — `MATCHED` 결과는 매칭 목록에 반영
  - **F09-05** — 매칭 시 즉시 생성되는 `DateChatRoom`이 채팅 방 목록의 시작점
- 외부:
  - 없음 (백엔드 내 도메인 서비스만 사용)
- 스케줄러:
  - `DateMatchExpirationScheduler` (`service/DateMatchExpirationScheduler.java`) — 7일 만료된 PENDING 매치를 `EXPIRED`로 전환 (본 작업 범위 외 상세는 미확인, 존재 사실만)

## 5. 프론트 계약

### 진입 경로

- **데이팅 탭 메인 카드** — 활성 프로필 사용자가 매일 열어보는 화면 (`/dating/candidates`)
- **매칭 목록 빈 상태에서 "후보자 둘러보기" 버튼** (스펙)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/dating/candidates` (`Routes.datingCandidates`) | `presentation/date/screens/candidate_card_screen.dart` | 후보자 카드 + LIKE/PASS + 매칭 다이얼로그 |
| (시트) | `presentation/date/widgets/date_block_reason_sheet.dart` | 차단 사유 입력 바텀시트 |

### 화면별 구성 요소 & 액션

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

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **카드 1장씩 진행**: `_currentIndex`로 단순 인덱스 진행. 실제 스와이프 제스처는 미구현 — 액션 버튼 탭만 사용.
- **카드 그라데이션**: top→bottom, 하단 `Colors.black.withOpacity(0.7)`, stops `[0.5, 1.0]`
- **버튼 색상**: PASS=흰 배경 + `error500`(✕), LIKE=`datingPink` 배경 + 흰 ♥, 64x64 원형
- **매칭 다이얼로그 본문**: "{name}님과 매칭되었습니다!\n채팅을 시작해보세요."
- **빈 상태 텍스트**: "추천 상대가 없습니다", "모든 후보를 확인했습니다"
- **나이 계산**: `DateTime.now().year - candidate.birthYear` (만 나이가 아닌 한국식 출생연도 차이)
- **TestId**: `screenDatingCandidates`
- **연속 액션 보호**: 액션 응답 받기 전 `removeCandidate` 후 `setState`로 인덱스 ++ — race 시 두 번 누르면 두 카드가 한 번에 처리될 수 있어, 사용자 인지 상 LIKE/PASS 후 즉시 다음 카드가 나타남
- **차단 시트 사유 입력**: `DateBlockReasonSheet` 내부에서 `String?` 반환. null이면 액션 취소.
- **매칭 후 라우팅 정책**: 채팅 시작 시 `partnerName` 쿼리 파라미터로 전달 (URL 인코딩)
- **에러 토스트**: `'오류가 발생했습니다'` (서버 에러 코드 그대로 노출하지 않음)
- **차단 후 카드 처리**: `dateCandidatesNotifier.removeCandidate` + 인덱스 증가로 즉시 다음 카드 표시 (목록 재페치 없음)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | LIKE → 상대도 LIKE → 즉시 매칭 + 채팅 시작 (Happy Path) | 후보자 카드 화면. 상대(targetUserId=42)가 이미 나에게 LIKE 한 상태(즉, `DateMatch(user1=42, user2=me, user1Action=LIKE, user2Action=PENDING, status=PENDING)` 존재). | `DateMatch.status=MATCHED, DateChatRoom.status=ACTIVE`. 매칭 목록(F09-04)·채팅방 목록(F09-05)에 반영. |
| S2 | LIKE → 상대 미응답 → 7일 PENDING 보류 | 시나리오 본문 참조 | 사용자에게는 매칭 목록의 `새매칭` 탭에 PENDING 카드가 일정 기간 노출됨 (잔여시간 배너 — F09-04). |
| S3 | PASS → 상대도 이미 PASS → REJECTED | 상대가 이미 PASS한 PENDING 페어 | row는 REJECTED로 보존되지만 후보 쿼리가 매치 row를 제외하지 않아 같은 페어가 다시 노출될 수 있음. |
| S4 | 차단된 사용자에게 LIKE 시도 | 내가 user42를 차단한 상태에서 어쩐 일로 카드가 노출(또는 캐시). | 매칭 미생성. |
| S5 | 이미 매칭된 사용자에게 LIKE 재시도 | 시나리오 본문 참조 | 무변동. |
| S6 | 미인증 / 프로필 미작성 사용자가 후보자 호출 | 시나리오 본문 참조 | 가드 통과 후 재시도 가능. |
| S7 | 차단(횡단) — 카드에서 즉시 차단 | 시나리오 본문 참조 | 후보자 풀에서 영구 제외(차단 해제 전까지). |
| S8 | 신고 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 동시성 — 같은 사용자에게 두 번 빠르게 LIKE 탭 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| Gap | `DateProfileQueryRepository#findCandidates` | 활성·PUBLIC/성별/본인 제외까지만 DB에서 필터하고 과거 액션·PENDING/REJECTED/MATCHED 페어를 제외하지 않아 처리한 카드가 재노출될 수 있다. | 후보 쿼리의 재노출 정책을 정의하고 상태별 제외 또는 명시적 재추천 규칙 구현 |
| 후보 | backend.md:86 | - `DateMatchExpirationScheduler` (`service/DateMatchExpirationScheduler.java`) — 7일 만료된 PENDING 매치를 `EXPIRED`로 전환 (본 작업 범위 외 상세는 미확인, 존재 사실만) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:50 | - **카드 1장씩 진행**: `_currentIndex`로 단순 인덱스 진행. 실제 스와이프 제스처는 미구현 — 액션 버튼 탭만 사용. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:83 | 2. 클라이언트는 첫 응답에서 `removeCandidate` + 인덱스++ 했으므로 두 번째 액션은 다음 카드 대상이 되어버릴 위험. 코드 보호 장치는 명시적이지 않음 (UX 개선 여지 있음). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. LIKE → 상대도 LIKE → 즉시 매칭 + 채팅 시작 (Happy Path)**: Given 후보자 카드 화면. 상대(targetUserId=42)가 이미 나에게 LIKE 한 상태(즉, `DateMatch(user1=42, user2=me, user1Action=LIKE, user2Action=PENDING, status=PENDING)` 존재). When 사용자가 해당 흐름을 실행하면 Then `DateMatch.status=MATCHED, DateChatRoom.status=ACTIVE`. 매칭 목록(F09-04)·채팅방 목록(F09-05)에 반영.
- **AC-02. LIKE → 상대 미응답 → 7일 PENDING 보류**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게는 매칭 목록의 `새매칭` 탭에 PENDING 카드가 일정 기간 노출됨 (잔여시간 배너 — F09-04).
- **AC-03. PASS → 상대도 이미 PASS → REJECTED**: Given 상대가 이미 PASS한 PENDING 페어 When 내가 PASS하면 Then row는 REJECTED가 되지만 현재 후보 쿼리에서는 같은 페어가 다시 노출될 수 있다.
- **AC-04. 차단된 사용자에게 LIKE 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 매칭 미생성.
- **AC-05. 이미 매칭된 사용자에게 LIKE 재시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무변동.
- **AC-06. 미인증 / 프로필 미작성 사용자가 후보자 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 가드 통과 후 재시도 가능.
- **AC-07. 차단(횡단) — 카드에서 즉시 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 후보자 풀에서 영구 제외(차단 해제 전까지).
- **AC-08. 신고 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 동시성 — 같은 사용자에게 두 번 빠르게 LIKE 탭**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
