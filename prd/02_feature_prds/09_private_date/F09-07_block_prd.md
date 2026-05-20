# F09-07. 사용자 차단/해제 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/09_private_date/F09-07_block -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-07_block`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

데이팅의 횡단 안전 보호 기능. 어디서든(후보자 카드/매칭 목록/채팅) 상대를 차단할 수 있고, 차단 시 활성 매치는 `BLOCKED`로, 채팅방은 `CLOSED`로 즉시 전환된다. 차단된 사용자는 후보자 노출과 매칭 액션에서 제외된다(F09-03 양방향 검사). 해제 시 매치 상태는 자동 복원하지 않으며, 다시 후보자 풀에 노출될 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **차단 발동**: 어느 화면에서나 발동 가능
  - F09-03 후보자 카드 우상단 ⋮ → "차단" → `DateBlockReasonSheet`
  - F09-04 매칭 목록 카드 ⋮ → "차단" → `DateBlockReasonSheet`
  - (스펙) F09-05 채팅 화면에서도 발동 가능 — 현 화면 코드에는 차단 메뉴 미연결
- **차단 목록 조회**: 데이팅 프로필 화면(F09-02) → "차단 목록" ListTile → `datingBlocks` 라우트

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-07_block/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-07_block/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-07_block/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-07_block/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateBlockController.java:25` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateBlockController.java:31` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateBlockController.java:40` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 차단 목록 (`date_blocks_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('차단 목록')`
  - 빈 상태: `AppEmptyState(icon: block_outlined, title: '차단한 사용자가 없습니다', description: '차단된 사용자는 매칭/채팅에 노출되지 않습니다')`
  - 차단 카드 `_BlockCard` — 첫글자 placeholder 아바타(`gray100` 배경) + `blockedNickname or "알 수 없음"` + `reason` (있을 때 2줄까지) + 차단일 `차단일 yyyy.MM.dd`
  - 우측 `AppButton(variant: outline, size: sm, label: '해제')`
- **사용자가 할 수 있는 액션**:
  - "해제" 탭 ▶ `AppDialog.confirm("차단 해제", "{nickname}의 차단을 해제하시겠습니까?", confirmLabel: '해제')`
  - 확인 시 `dateBlocksNotifier.unblock(blockedId)` ▶ `DELETE /api/v1/date/blocks/{blockedId}` ▶ 토스트 (성공: "차단을 해제했습니다", 실패: "차단 해제에 실패했습니다")
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`

### 차단 사유 입력 시트 (`date_block_reason_sheet.dart`)

- **사용자가 보는 것**: 사유 입력 바텀시트 (구현 세부는 본 작업 범위 외 — 단 호출 시그니처는 `DateBlockReasonSheet.show(context, targetNickname: ...)` → `Future<String?>`)
- **반환**: null이면 액션 취소, 문자열이면 사유로 전달

## 4. 서버 계약

### 개요

데이팅의 횡단 안전 보호 기능. 어디서든(후보자 카드/매칭 목록/채팅) 상대를 차단할 수 있고, 차단 시 활성 매치는 `BLOCKED`로, 채팅방은 `CLOSED`로 즉시 전환된다. 차단된 사용자는 후보자 노출과 매칭 액션에서 제외된다(F09-03 양방향 검사). 해제 시 매치 상태는 자동 복원하지 않으며, 다시 후보자 풀에 노출될 수 있다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/date/blocks | DateBlockController#listBlocks | required | 내가 차단한 사용자 목록 |
| POST | /api/v1/date/blocks/{targetUserId} | DateBlockController#blockUser | required | 차단 + 활성 매치 BLOCKED + 채팅방 CLOSED |
| DELETE | /api/v1/date/blocks/{targetUserId} | DateBlockController#unblockUser | required | 차단 해제 (매치/채팅 복원 없음) |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity `DateBlock`**: `id, blockerId, blockedId, reason?, createdAt`
- **VO `DateBlockVo`**: 위 응답 필드 (mutable, `@Setter` — service에서 nickname 주입)

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-03** — `findCandidates`/`performAction`이 양방향 차단 검사로 본 도메인 호출
  - **F09-04** — 매칭 status가 BLOCKED로 갱신되어 목록에 반영
  - **F09-05** — 채팅방 CLOSED 전환으로 메시지 송신 차단
  - **account 도메인 (`UserRepository`)** — 닉네임 lookup
- 외부:
  - 없음

## 5. 프론트 계약

### 진입 경로

- **차단 발동**: 어느 화면에서나 발동 가능
  - F09-03 후보자 카드 우상단 ⋮ → "차단" → `DateBlockReasonSheet`
  - F09-04 매칭 목록 카드 ⋮ → "차단" → `DateBlockReasonSheet`
  - (스펙) F09-05 채팅 화면에서도 발동 가능 — 현 화면 코드에는 차단 메뉴 미연결
- **차단 목록 조회**: 데이팅 프로필 화면(F09-02) → "차단 목록" ListTile → `datingBlocks` 라우트

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/dating/blocks` (`Routes.datingBlocks`, named `datingBlocks`) | `presentation/date/screens/date_blocks_screen.dart` | 차단 목록 + 해제 액션 |
| (시트) | `presentation/date/widgets/date_block_reason_sheet.dart` | 사유 입력 바텀시트 (호출 시) |

### 화면별 구성 요소 & 액션

### 차단 목록 (`date_blocks_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('차단 목록')`
  - 빈 상태: `AppEmptyState(icon: block_outlined, title: '차단한 사용자가 없습니다', description: '차단된 사용자는 매칭/채팅에 노출되지 않습니다')`
  - 차단 카드 `_BlockCard` — 첫글자 placeholder 아바타(`gray100` 배경) + `blockedNickname or "알 수 없음"` + `reason` (있을 때 2줄까지) + 차단일 `차단일 yyyy.MM.dd`
  - 우측 `AppButton(variant: outline, size: sm, label: '해제')`
- **사용자가 할 수 있는 액션**:
  - "해제" 탭 ▶ `AppDialog.confirm("차단 해제", "{nickname}의 차단을 해제하시겠습니까?", confirmLabel: '해제')`
  - 확인 시 `dateBlocksNotifier.unblock(blockedId)` ▶ `DELETE /api/v1/date/blocks/{blockedId}` ▶ 토스트 (성공: "차단을 해제했습니다", 실패: "차단 해제에 실패했습니다")
- **상태 분기**:
  - 로딩: `CircularProgressIndicator`
  - 에러: `AppErrorState.fromError(onRetry: invalidate)`

### 차단 사유 입력 시트 (`date_block_reason_sheet.dart`)

- **사용자가 보는 것**: 사유 입력 바텀시트 (구현 세부는 본 작업 범위 외 — 단 호출 시그니처는 `DateBlockReasonSheet.show(context, targetNickname: ...)` → `Future<String?>`)
- **반환**: null이면 액션 취소, 문자열이면 사유로 전달

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **차단 사유 노출 정책**: 서버 응답의 `reason`은 본인(차단한 자)에게만 보임. 차단당한 자에게는 차단 사실/사유 모두 미통지
- **차단 카드 아바타**: 사용자 사진 사용 안 함 — 첫 글자 텍스트 + `gray100` 배경 (빠른 식별 + 사진 노출 차단)
- **확인 다이얼로그**: `AppDialog.confirm` (Cancel + 해제 두 버튼)
- **토스트 메시지**: "차단을 해제했습니다" / "차단 해제에 실패했습니다"
- **TestId**: `screenDatingBlocks`
- **라우트 진입 방식**: 데이팅 프로필 화면에서 `context.pushNamed('datingBlocks')` 사용
- **차단 사유 옵션 UI**: `DateBlockReasonSheet`가 사유 텍스트(자유 입력 또는 사전 정의 옵션 — 본 작업 범위 외)를 받아 String 반환. 현 코드 호출부는 단순 String만 사용
- **차단 후 즉각 후처리**:
  - 후보자(F09-03): `dateCandidatesNotifier.removeCandidate(userId)` 호출 후 인덱스 ++
  - 매칭 목록(F09-04): 토스트만 — 사용자가 새로고침하면 BLOCKED 반영
- **차단 시 기록 정책**: 차단 사유는 분쟁 시 운영팀 참조 용도. 서버는 평문으로 저장(개인정보 X). 사용자에게 보임

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 후보자 카드에서 차단 (Happy Path) | 활성 매치 없음, 후보 카드 표시 중. | 차단 row 1개. 다음 후보자 fetch에서 해당 사용자 제외 (양방향 차단 필터). |
| S2 | 매칭 카드에서 차단 → 매치 BLOCKED + 채팅 CLOSED | `Match.MATCHED`, `ChatRoom.ACTIVE`, 메시지 5건 교환됨. | 메시지 송신 차단, 새 매칭 액션 차단. |
| S3 | 이미 차단한 사용자에게 다시 차단 시도 | 시나리오 본문 참조 | 변동 없음. |
| S4 | 차단 해제 — 매치 복원 없음 | 과거에 차단한 사용자 1명. 매치는 BLOCKED 상태로 잔존. | 차단 row 삭제, 매치/채팅 그대로. |
| S5 | 권한 — 존재하지 않는 차단 해제 | 시나리오 본문 참조 | 변동 없음. |
| S6 | 차단당한 자의 관점 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 신고와의 관계 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 차단 시 데이터 보존 정책 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | diagrams.md:18 | Chat[🔵 chat_screen F09-05] -.->\|차단 메뉴 미구현\| Sheet1 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 후보자 카드에서 차단 (Happy Path)**: Given 활성 매치 없음, 후보 카드 표시 중. When 사용자가 해당 흐름을 실행하면 Then 차단 row 1개. 다음 후보자 fetch에서 해당 사용자 제외 (양방향 차단 필터).
- **AC-02. 매칭 카드에서 차단 → 매치 BLOCKED + 채팅 CLOSED**: Given `Match.MATCHED`, `ChatRoom.ACTIVE`, 메시지 5건 교환됨. When 사용자가 해당 흐름을 실행하면 Then 메시지 송신 차단, 새 매칭 액션 차단.
- **AC-03. 이미 차단한 사용자에게 다시 차단 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변동 없음.
- **AC-04. 차단 해제 — 매치 복원 없음**: Given 과거에 차단한 사용자 1명. 매치는 BLOCKED 상태로 잔존. When 사용자가 해당 흐름을 실행하면 Then 차단 row 삭제, 매치/채팅 그대로.
- **AC-05. 권한 — 존재하지 않는 차단 해제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변동 없음.
- **AC-06. 차단당한 자의 관점 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 신고와의 관계 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 차단 시 데이터 보존 정책**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
