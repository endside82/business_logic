# F07-08. 정산 이의제기 / 처리 / 감사로그 (Appeal & Audit Log) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

참가자가 본인의 분담 또는 이체에 이의를 제기하면 PENDING appeal이 생성되고 해당 subject에 대한 결제·확인이 차단된다. 호스트(=정산 생성자)가 APPROVED/REJECTED/RESOLVED 중 하나로 처리해야 차단이 해제된다. 모든 정산 변경은 감사 로그(audit log)로 기록되어 페이지네이션 조회된다.

**2026-06-05부터 DRAFT(준비 중) 정산에는 이의제기를 서버가 차단한다(DEC-V4)** — 비확정 금액에 대한 이의는 혼란과 활성화 후 결제 장애(미처리 PENDING appeal의 결제 차단)만 만들기 때문. 정산 신청(ACTIVE) 이후부터 이의 가능하며, COMPLETED에서의 현행 허용은 유지된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **이의 생성**:
  - `MySettlementSharesScreen` 카드의 "이의 제기" 버튼 (참가자, F07-05) — DRAFT 또는 status 미확정(로딩/에러) 동안은 버튼 숨김(3상태 가드, 2026-06-05)
  - `TransferListScreen` 카드의 "이의 제기" 버튼 (참가자/호스트) — transfer는 활성화 시점에 생성되므로 DRAFT에서는 진입 자체가 없음
- **이의 관리 / 감사 로그**:
  - 정산 현황 화면 manager PopupMenu → "이의제기 관리" / "감사 로그"

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `MeetingSettlementAppealService`, `UserService`. 앱: `settlement_appeals_screen.dart`, `settlement_audit_log_screen.dart`, `settlement_appeal_dialog.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#createAppeal`, `MeetingSettlementController#getAppeals`, `MeetingSettlementController#resolveAppeal`, `MeetingSettlementController#getAuditLog`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

이의제기 관리 화면 진입 시:
1. `appealsProvider(eventId)` ▶ `GET .../appeals`
2. `settlementDetailProvider(eventId)` ▶ host 권한 판정

이의 생성 액션 (다른 화면에서):
1. `SettlementAppealDialog` 표시 → reason 입력
2. `appealsProvider(eventId).createAppeal(subjectType, subjectId, reason)` ▶ `POST .../appeals`
3. invalidate appealsProvider + transferList(또는 myShares) — 결제 차단 표시 갱신

이의 처리 액션 (호스트):
1. PENDING 카드의 액션 → status 선택 + hostResponse 입력
2. `appealsProvider(eventId).resolveAppeal(appealId, status, hostResponse)` ▶ `PATCH .../appeals/{id}/resolve`
3. invalidate appealsProvider + transferList/summary (차단 해제)

감사 로그 화면 진입 시:
1. `auditLogProvider(eventId)` ▶ `GET .../audit-log?page=0&size=30`
2. (스크롤 페이지네이션) 다음 페이지 로딩

## 4. 제품 규칙

- 이의 대상은 분담(SHARE), 항목(ITEM), 송금(TRANSFER)이다. 사유는 비울 수 없고, 사유와 호스트 답변은 2000자까지다.
- 감사 기록의 행위자 역할은 USER, HOST, SYSTEM, ADMIN 이다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 참가자 이의 제기) 분담금 산정에 동의 못 함 | settlement ACTIVE, share 본인 PENDING 결제 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S2 | (호스트 · 이의 처리 - APPROVED) 호스트가 사용자 의견 수락 | PENDING appeal 1건 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (호스트 · 이의 처리 - REJECTED) 사유 부족으로 기각 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (엣지 · 동일 subject 중복 이의) PENDING이 있는데 또 이의제기 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (엣지 · 호스트 본인 share 이의 차단) 클라이언트 가드 + 백엔드 가드 | 호스트가 자기 share에 이의 제기 시도 (UI 우회) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (호스트 · 결제 차단 효과) PENDING appeal로 transfer 결제 차단 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (참가자 / 호스트 · 감사 로그 조회) 정산 변경 이력 추적 | 호스트가 누가 언제 무엇을 했는지 점검 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · ALREADY_RESOLVED) 이미 처리된 이의를 다시 처리 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | (엣지 · INVALID_STATUS) status에 PENDING으로 resolve 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | (엣지 · DRAFT 이의 차단) 준비 중 정산에 이의제기 시도 (UI 우회 포함) | settlement DRAFT, 본인 share 존재 | `MEETING_SETTLEMENT_NOT_ACTIVE` 거부, appeal row 미생성, 호스트 알림 0건. 앱은 버튼 자체를 숨김 (2026-06-05) |

## 8. Gap / Risk

> 원천 문서에서 명시적인 Gap/Risk 키워드는 발견되지 않았다. 이 문서는 기능 구현이나 QA 착수 전에 실제 서버/Flutter 소스 대조로 Gap을 다시 닫아야 한다.

## 9. 수용 기준

- **AC-01. (Happy Path · 참가자 이의 제기) 분담금 산정에 동의 못 함**: Given settlement ACTIVE, share 본인 PENDING 결제 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. (호스트 · 이의 처리 - APPROVED) 호스트가 사용자 의견 수락**: Given PENDING appeal 1건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (호스트 · 이의 처리 - REJECTED) 사유 부족으로 기각**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (엣지 · 동일 subject 중복 이의) PENDING이 있는데 또 이의제기 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (엣지 · 호스트 본인 share 이의 차단) 클라이언트 가드 + 백엔드 가드**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (호스트 · 결제 차단 효과) PENDING appeal로 transfer 결제 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (참가자 / 호스트 · 감사 로그 조회) 정산 변경 이력 추적**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · ALREADY_RESOLVED) 이미 처리된 이의를 다시 처리 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. (엣지 · INVALID_STATUS) status에 PENDING으로 resolve 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. (엣지 · DRAFT 이의 차단) 준비 중 정산에 이의제기 시도**: Given settlement DRAFT, 본인 share 존재 When 참가자가 이의 생성을 호출하면(UI 우회 포함) Then `MEETING_SETTLEMENT_NOT_ACTIVE`로 거부되고 appeal이 저장되지 않으며 호스트 알림도 발생하지 않는다
