# F07-08. 정산 이의제기 / 처리 / 감사로그 (Appeal & Audit Log) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/07_meeting_settlement/F07-08_appeal-audit -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-08_appeal-audit`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

참가자가 본인의 분담 또는 이체에 이의를 제기하면 PENDING appeal이 생성되고 해당 subject에 대한 결제·확인이 차단된다. 호스트(=정산 생성자)가 APPROVED/REJECTED/RESOLVED 중 하나로 처리해야 차단이 해제된다. 모든 정산 변경은 감사 로그(audit log)로 기록되어 페이지네이션 조회된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **이의 생성**:
  - `MySettlementSharesScreen` 카드의 "이의 제기" 버튼 (참가자, F07-05)
  - `TransferListScreen` 카드의 "이의 제기" 버튼 (참가자/호스트)
- **이의 관리 / 감사 로그**:
  - 정산 현황 화면 manager PopupMenu → "이의제기 관리" / "감사 로그"

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-08_appeal-audit/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-08_appeal-audit/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-08_appeal-audit/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-08_appeal-audit/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:245` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:256` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:265` | 확인됨 |
| `community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java:274` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

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

## 4. 서버 계약

### 개요

참가자가 본인의 분담 또는 이체에 이의를 제기하면 PENDING appeal이 생성되고 해당 subject에 대한 결제·확인이 차단된다. 호스트(=정산 생성자)가 APPROVED/REJECTED/RESOLVED 중 하나로 처리해야 차단이 해제된다. 모든 정산 변경은 감사 로그(audit log)로 기록되어 페이지네이션 조회된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/events/{eventId}/settlement/appeals | MeetingSettlementController#createAppeal | required | 이의 생성 (참가자/호스트) |
| GET | /api/v1/events/{eventId}/settlement/appeals | MeetingSettlementController#getAppeals | required | 정산의 모든 이의 리스트 |
| PATCH | /api/v1/events/{eventId}/settlement/appeals/{appealId}/resolve | MeetingSettlementController#resolveAppeal | required | 이의 처리 (호스트) |
| GET | /api/v1/events/{eventId}/settlement/audit-log | MeetingSettlementController#getAuditLog | required | 감사 로그 페이지네이션 |

### 의존 단위 / 외부 시스템

- Unit 0 (Account): `UserService.getUserBasicInfoMap` — appealer/actor 이름 enrich
- Unit 12 (Notification): 본 기능 자체는 알림 발송 X (다른 기능에서 audit 발행 시 부가적으로 알림 발송됨)
- 외부 시스템: 없음

## 5. 프론트 계약

### 진입 경로

- **이의 생성**:
  - `MySettlementSharesScreen` 카드의 "이의 제기" 버튼 (참가자, F07-05)
  - `TransferListScreen` 카드의 "이의 제기" 버튼 (참가자/호스트)
- **이의 관리 / 감사 로그**:
  - 정산 현황 화면 manager PopupMenu → "이의제기 관리" / "감사 로그"

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/home/events/:eventId/settlement/appeals` | `settlement_appeals_screen.dart` | 이의 리스트 + 호스트 처리 |
| `/home/events/:eventId/settlement/audit-log` | `settlement_audit_log_screen.dart` | 감사 로그 타임라인 |
| (모달) | `presentation/payment/widgets/settlement_appeal_dialog.dart` | 이의 입력 다이얼로그 (공통) |

### 화면별 구성 요소 & 액션

### 이의제기 관리 화면 (`settlement_appeals_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` "정산 이의제기"
  - 이의 카드 리스트 (createdAt desc):
    - subjectType 배지 (SHARE/ITEM/TRANSFER), subjectId
    - appealerUserName + reason (멀티라인 표시)
    - status 배지 (PENDING=노랑, APPROVED/REJECTED/RESOLVED=각각 색상)
    - PENDING + 호스트일 때: "승인" / "기각" / "처리 완료" 버튼 + hostResponse 입력
    - resolvedAt 표시 (resolved 시)
  - 빈 상태 `AppEmptyState(icon: report_gmailerrorred, title: '이의제기 내역이 없습니다')`
- **사용자가 할 수 있는 액션**:
  - 호스트 PENDING 카드 액션 ▶ 다이얼로그 (status 선택 + hostResponse 입력 max 2000자) ▶ `PATCH .../appeals/{id}/resolve`
  - 풀투리프레시 ▶ `invalidate(appealsProvider(eventId))`
- **상태 분기**: 로딩/빈/에러

### 감사 로그 화면 (`settlement_audit_log_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` "정산 감사 로그"
  - 로그 카드 리스트 (createdAt desc, 페이지네이션):
    - action 배지 (한국어 라벨 + 색상 매핑)
    - subjectType + subjectId
    - actorRole(USER/HOST/SYSTEM/ADMIN) + actorUserName
    - createdAt (`yyyy.MM.dd HH:mm:ss`)
    - 펼치면 beforeSnapshot/afterSnapshot/payload JSON 표시 (선택)
  - 빈 상태 `AppEmptyState(icon: history, title: '감사 로그가 없습니다')`
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ `invalidate(auditLogProvider(eventId))`
  - 무한스크롤 (PageResponse 기반)

### 이의 입력 다이얼로그 (공통 — `SettlementAppealDialog`)
- **사용자가 보는 것**:
  - 안내 문구 "이 이체 건에 이의를 제기합니다.\n호스트가 검토 전까지는 해당 이체의 결제·확인이 차단됩니다.\n\n금액: N원"
  - 사유 입력 `TextField(maxLength: 2000, maxLines: 4)`
  - "취소" / "제기" 버튼
- **사용자가 할 수 있는 액션**:
  - 사유가 빈 문자열이면 "제기" 무효
  - 제출 ▶ `appealsProvider.createAppeal(subjectType, subjectId, reason)`

### API 호출 순서 (Provider/Repository 관점)

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

- **AC-01. (Happy Path · 참가자 이의 제기) 분담금 산정에 동의 못 함**: Given settlement ACTIVE, share 본인 PENDING 결제 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. (호스트 · 이의 처리 - APPROVED) 호스트가 사용자 의견 수락**: Given PENDING appeal 1건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (호스트 · 이의 처리 - REJECTED) 사유 부족으로 기각**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (엣지 · 동일 subject 중복 이의) PENDING이 있는데 또 이의제기 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (엣지 · 호스트 본인 share 이의 차단) 클라이언트 가드 + 백엔드 가드**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (호스트 · 결제 차단 효과) PENDING appeal로 transfer 결제 차단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (참가자 / 호스트 · 감사 로그 조회) 정산 변경 이력 추적**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · ALREADY_RESOLVED) 이미 처리된 이의를 다시 처리 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. (엣지 · INVALID_STATUS) status에 PENDING으로 resolve 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
