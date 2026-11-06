# F09-07. 사용자 차단/해제 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

데이팅의 횡단 안전 보호 기능. 어디서든(후보자 카드/매칭 목록/채팅) 상대를 차단할 수 있고, 차단 시 활성 매치는 `BLOCKED`로, 채팅방은 `CLOSED`로 즉시 전환된다. 차단된 사용자는 후보자 노출과 매칭 액션에서 제외된다(F09-03 양방향 검사). 해제 시 매치 상태는 자동 복원하지 않으며, 다시 후보자 풀에 노출될 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **차단 발동**: 어느 화면에서나 발동 가능
  - F09-03 후보자 카드 우상단 ⋮ → "차단" → `DateBlockReasonSheet`
  - F09-04 매칭 목록 카드 ⋮ → "차단" → `DateBlockReasonSheet`
  - (스펙) F09-05 채팅 화면에서도 발동 가능 — 현 화면 코드에는 차단 메뉴 미연결
- **차단 목록 조회**: 데이팅 프로필 화면(F09-02) → "차단 목록" ListTile → `datingBlocks` 라우트

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DateBlockController`, `DateBlockStatus`, `FavoriteService`, `ReportService`. 앱: `date_blocks_screen.dart`, `date_block_reason_sheet.dart`, `date_block_param.dart`.

<!-- source-references:start -->
서버 창구: `DateBlockController#listBlocks`, `DateBlockController#blockUser`, `DateBlockController#unblockUser`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 후보 카드와 매칭 목록 어디서든 상대를 차단할 수 있다. 차단하면 그 상대와의 매칭은 차단 상태가 되고 그 쌍의 채팅방은 모두 닫힌다. 차단은 양방향으로 적용되어 서로의 후보 노출과 좋아요가 막힌다.
- 이미 차단 중인 상대를 다시 차단하면 충돌 오류, 차단 중이 아닌 상대를 해제하면 찾을 수 없음 오류다.
- 해제해도 매칭과 채팅방은 되살아나지 않는다. 해제는 기록으로 남고(해제 상태) 지워지지 않는다. 해제 뒤에는 후보 풀에 다시 나올 수 있다.
- 차단할 때 사유(200자까지)를 남길 수 있고, 안전신고를 함께 접수할 수 있다(신고 사유를 안 고르면 기타). 증빙 파일은 5개까지다. 안전신고가 딸린 차단은 분쟁 케이스에 포함되어, 처리 중에는 증빙을 지울 수 없고 처리 뒤 1년 보관한다.
- 차단당한 사람에게는 차단 사실도 사유도 알리지 않고, 사유는 차단한 본인만 본다.
- 차단 목록에는 닉네임(없으면 「알 수 없음」), 사유, 차단일이 보이고 해제는 확인을 거친다. 차단한 사람이 없으면 「차단한 사용자가 없습니다」 안내가 나온다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 후보자 카드에서 차단 (Happy Path) | 활성 매치 없음, 후보 카드 표시 중. | 차단 row 1개. 다음 후보자 fetch에서 해당 사용자 제외 (양방향 차단 필터). |
| S2 | 매칭 카드에서 차단 → 매치 BLOCKED + 채팅 CLOSED | `Match.MATCHED`, `ChatRoom.ACTIVE`, 메시지 5건 교환됨. | 메시지 송신 차단, 새 매칭 액션 차단. |
| S3 | 이미 차단한 사용자에게 다시 차단 시도 | 시나리오 본문 참조 | 변동 없음. |
| S4 | 차단 해제 — 매치 복원 없음 | 과거에 차단한 사용자 1명. 매치는 BLOCKED 상태로 잔존. | 차단 row status=UNBLOCKED 전환 (삭제 아님), 매치/채팅 그대로. |
| S5 | 권한 — 존재하지 않는 차단 해제 | 시나리오 본문 참조 | 변동 없음. |
| S6 | 차단당한 자의 관점 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 신고와의 관계 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 차단 시 데이터 보존 정책 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Gap | diagrams.md:18 | F09-05 채팅 화면에서 차단 메뉴 미연결 (`date_block_reason_sheet` 호출 코드 없음) | 채팅 화면 더보기(⋮) → 차단 진입 추가 |
| Gap | dossier 09 §3-5 | Flutter `DateProfilePhotoVo`에 `fileId`, `moderationStatus` 필드 없음 — 차단+신고 시 증빙 사진의 moderationStatus 표시 불가 (F09-02 영역) | F09-02 Gap 참조 |
| Risk | dossier 01 §4-D | `fileReport=true`이면 evidence 1년 legal hold → 탈퇴 사용자 데이터 보존 정책과 충돌 가능성 | 법무 검토 필요 |

## 9. 수용 기준

- **AC-01. 후보자 카드에서 차단 (Happy Path)**: Given 활성 매치 없음, 후보 카드 표시 중. When 사용자가 해당 흐름을 실행하면 Then 차단 row 1개. 다음 후보자 fetch에서 해당 사용자 제외 (양방향 차단 필터).
- **AC-02. 매칭 카드에서 차단 → 매치 BLOCKED + 채팅 CLOSED**: Given `Match.MATCHED`, `ChatRoom.ACTIVE`, 메시지 5건 교환됨. When 사용자가 해당 흐름을 실행하면 Then 메시지 송신 차단, 새 매칭 액션 차단.
- **AC-03. 이미 차단한 사용자에게 다시 차단 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변동 없음.
- **AC-04. 차단 해제 — 매치 복원 없음**: Given 과거에 차단한 사용자 1명. 매치는 BLOCKED 상태로 잔존. When 사용자가 해당 흐름을 실행하면 Then 차단 row status=UNBLOCKED 전환(row 보존), 매치/채팅 그대로. `FavoriteService.isBlockedBetween()` 등 소비자는 이 row를 "차단 중" 아닌 이력으로 처리.
- **AC-05. 권한 — 존재하지 않는 차단 해제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변동 없음.
- **AC-06. 차단당한 자의 관점 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 신고와의 관계 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 차단 시 데이터 보존 정책**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
