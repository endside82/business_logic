# F07-10. 정산 계좌 / 내 정산 이력 / 호스트 신뢰도 (Account, History, Reputation) PRD

<!-- generated: source-first-unit-sync; updated: 2026-06-05 (평판 DRAFT 제외 DEC-V5 + 지갑 모임정산 목록 DEC-V9 반영); unit: business_logic/units/07_meeting_settlement/F07-10_account-history-reputation -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/07_meeting_settlement/F07-10_account-history-reputation`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

횡단(개인 영역) 기능: 사용자가 정산 수령용 은행 계좌를 등록·관리하고, 본인의 정산 참여 이력 및 월별 요약을 조회하며, 다른 호스트의 정산 신뢰도(완료율·평균 완료시간·취소율·이의율)를 확인한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 프로필 화면 → "정산 계좌" 메뉴 → `bank_account_screen`
- 프로필 화면 → "정산 히스토리" 메뉴 → `my_settlement_history_screen`
- 호스트 프로필 카드 / 모임 상세 → `HostReputationBadge` 탭 → 신뢰도 모달/화면 (현재 위젯만 — 별도 화면 없음)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/07_meeting_settlement/F07-10_account-history-reputation/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/07_meeting_settlement/F07-10_account-history-reputation/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/07_meeting_settlement/F07-10_account-history-reputation/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/07_meeting_settlement/F07-10_account-history-reputation/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

정산 계좌 화면 진입:
1. `bankAccountListProvider` ▶ `SettlementBankAccountRepository.getAccounts` ▶ `GET .../bank-accounts`

계좌 추가 액션:
1. `BankAccountFormDialog` 입력
2. `bankAccountListProvider.add(SettlementBankAccountParam)` ▶ `POST .../bank-accounts`
3. invalidate

기본 설정:
1. `bankAccountListProvider.setDefault(accountId)` ▶ `PATCH .../bank-accounts/{id}/default`
2. invalidate

내 정산 히스토리 진입:
1. `myMeetingSettlementHistoryProvider` ▶ `GET .../meeting-settlements`
2. `myMeetingSettlementMonthlySummaryProvider(months=6)` ▶ `GET .../meeting-settlements/monthly-summary?months=6`

호스트 신뢰도:
1. `hostReputationProvider(userId)` ▶ `GET .../users/{userId}/meeting-settlement-reputation`
2. 배지 또는 모달에 표시

지갑 모임정산 목록 진입 (2026-06-05 신설):
1. `walletMeetingSettlementListNotifierProvider` ▶ `WalletRepository.getMyMeetingSettlements(page,size,status)` ▶ `GET /api/v1/wallet/meeting-settlements`
2. 무한스크롤 loadMore / 상태 필터 변경 시 재조회. 카드 탭 ▶ `/home/events/{eventId}/settlement` (read 게이트 — 캐시 빠른 통과 + getMyShares BE 폴백)

## 4. 서버 계약

### 개요

횡단(개인 영역) 기능: 사용자가 정산 수령용 은행 계좌를 등록·관리하고, 본인의 정산 참여 이력 및 월별 요약을 조회하며, 다른 호스트의 정산 신뢰도(완료율·평균 완료시간·취소율·이의율)를 확인한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/users/me/bank-accounts | SettlementBankAccountController#getAccounts | required | 내 정산 계좌 리스트 |
| POST | /api/v1/users/me/bank-accounts | SettlementBankAccountController#createAccount | required | 계좌 등록 |
| PUT | /api/v1/users/me/bank-accounts/{id} | SettlementBankAccountController#updateAccount | required | 계좌 수정 |
| DELETE | /api/v1/users/me/bank-accounts/{id} | SettlementBankAccountController#deleteAccount | required | 계좌 삭제 |
| PATCH | /api/v1/users/me/bank-accounts/{id}/default | SettlementBankAccountController#setDefault | required | 기본 계좌 설정 |
| GET | /api/v1/users/me/meeting-settlements | MeetingSettlementHistoryController#getMyHistory | required | 내 정산 참여 이력 |
| GET | /api/v1/users/me/meeting-settlements/monthly-summary | MeetingSettlementHistoryController#getMonthlySummary | required | 월별 요약 (최대 24개월) |
| GET | /api/v1/users/{userId}/meeting-settlement-reputation | HostSettlementReputationController#getReputation | required | 호스트 정산 신뢰도 — "진행 중 건수"(activeCount)는 ACTIVE만 집계, DRAFT(준비 중)는 제외 (DEC-V5, 2026-06-05) |
| GET | /api/v1/wallet/meeting-settlements | WalletController(→ MeetingSettlementService#getMySettlements) | required | 내가 참여한 모임 정산 목록 — §7-A 참조. 행에 `eventTitle` 배치 enrich(2026-06-05, c8977c5). 소비처: 지갑 모임정산 목록 화면(SCR-PA-005, app 8c60999) |

### 의존 단위 / 외부 시스템

- Unit 03 (Event): eventTitle for history
- Unit 06 (Wallet/Settlement): 본 기능 자체는 wallet 직접 조작 X — 거래 이력은 transfer로부터 집계
- 외부 시스템: 없음 (모두 read-only 또는 메타 등록)

## 5. 프론트 계약

### 진입 경로

- 프로필 화면 → "정산 계좌" 메뉴 → `bank_account_screen`
- 프로필 화면 → "정산 히스토리" 메뉴 → `my_settlement_history_screen`
- 지갑 메인(F06-01) → "모임 정산" 진입 카드 → `wallet_meeting_settlement_list_screen` (2026-06-05 신설, SCR-PA-005)
- 호스트 프로필 카드 / 모임 상세 → `HostReputationBadge` 탭 → 신뢰도 모달/화면 (현재 위젯만 — 별도 화면 없음)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/profile/bank-accounts` | `bank_account_screen.dart` | 정산 계좌 CRUD |
| `/profile/settlement-history` | `my_settlement_history_screen.dart` | 내 정산 참여 이력 + 월별 요약 |
| `/profile/wallet/meeting-settlements` | `payment/screens/wallet_meeting_settlement_list_screen.dart` | 내가 참여한 모임 정산 목록 (상태 필터·무한스크롤·DRAFT '준비중' 칩, 탭 → 정산 현황. 2026-06-05) |
| (위젯) | `widgets/bank_account_card_widget.dart` | 계좌 카드 |
| (위젯) | `widgets/bank_account_form_dialog.dart` | 계좌 입력 다이얼로그 |
| (위젯) | `widgets/host_reputation_badge.dart` | 호스트 신뢰도 배지 (다른 화면에 embed) |

### 화면별 구성 요소 & 액션

### 정산 계좌 화면 (`bank_account_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` "정산 계좌"
  - 계좌 카드 리스트 (`BankAccountCardWidget`)
    - bankName, 마스킹된 accountNumber, accountHolder
    - default 표시 (배지 또는 강조)
    - 액션: 수정 / 삭제 / 기본 설정 (기본인 경우 비활성)
  - 빈 상태: `AppEmptyState(icon: account_balance, title: '등록된 계좌가 없습니다', actionLabel: '계좌 추가')`
  - FAB `add` (primary500) → 추가 다이얼로그
- **사용자가 할 수 있는 액션**:
  - 추가/수정 다이얼로그 (`BankAccountFormDialog`) → `SettlementBankAccountParam(bankName, accountNumber, accountHolder)`
  - 추가 ▶ `bankAccountListProvider.add(param)` ▶ `POST .../bank-accounts`
  - 수정 ▶ `bankAccountListProvider.update(id, param)` ▶ `PUT .../bank-accounts/{id}`
  - 삭제 ▶ 확인 다이얼로그 ▶ `bankAccountListProvider.delete(id)` ▶ `DELETE .../bank-accounts/{id}`
  - 기본 설정 ▶ `bankAccountListProvider.setDefault(id)` ▶ `PATCH .../bank-accounts/{id}/default`
  - 풀투리프레시 ▶ invalidate
- **상태 분기**: 로딩 / 빈 / 에러 (`AppErrorState(title: '계좌 정보를 불러올 수 없습니다')`)

### 내 정산 히스토리 화면 (`my_settlement_history_screen.dart`)
- **사용자가 보는 것**:
  - `CommunityAppBar` "내 정산 히스토리"
  - `_MonthlySummarySection` — 6개월 월별 카드 (`yearMonth`, count, totalPaid/Received, pending count)
  - "정산 참여 내역" 섹션 헤더 + `_HistoryTile` 리스트
    - eventTitle, status 배지 (DRAFT/ACTIVE/COMPLETED/CANCELLED), totalAmount, myPaid/myReceived, pending 표시
    - createdAt 표시 (`yyyy.MM.dd`)
  - 빈 상태 `AppEmptyState(icon: receipt_long, title: '아직 참여한 정산이 없습니다')`
- **사용자가 할 수 있는 액션**:
  - 풀투리프레시 ▶ invalidate(history) + invalidate(monthly)
  - 카드 탭 ▶ 해당 settlement의 status 화면(F07-04) 진입 (현재 코드는 `_HistoryTile` 클릭 라우팅 별도 처리)
- **상태 분기**: 로딩 / 빈 / 에러

### 호스트 신뢰도 배지 (`host_reputation_badge.dart`)
- **사용자가 보는 것**:
  - 작은 배지 형태 — completionRate %, avgCompleteHours, appealRate %
  - 배지 색상은 신뢰도 등급으로 (예: ≥90% 초록, 70~89% 노랑, <70% 회색)
- **사용자가 할 수 있는 액션**:
  - 탭 ▶ 상세 모달 (옵션 — 현재 코드에 모달 화면 X) 또는 단순 표시

### API 호출 순서 (Provider/Repository 관점)

정산 계좌 화면 진입:
1. `bankAccountListProvider` ▶ `SettlementBankAccountRepository.getAccounts` ▶ `GET .../bank-accounts`

계좌 추가 액션:
1. `BankAccountFormDialog` 입력
2. `bankAccountListProvider.add(SettlementBankAccountParam)` ▶ `POST .../bank-accounts`
3. invalidate

기본 설정:
1. `bankAccountListProvider.setDefault(accountId)` ▶ `PATCH .../bank-accounts/{id}/default`
2. invalidate

내 정산 히스토리 진입:
1. `myMeetingSettlementHistoryProvider` ▶ `GET .../meeting-settlements`
2. `myMeetingSettlementMonthlySummaryProvider(months=6)` ▶ `GET .../meeting-settlements/monthly-summary?months=6`

호스트 신뢰도:
1. `hostReputationProvider(userId)` ▶ `GET .../users/{userId}/meeting-settlement-reputation`
2. 배지 또는 모달에 표시

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 첫 계좌 등록) 정산 수령용 계좌 등록 | 등록된 계좌 0건 | 1개 계좌 (default). |
| S2 | (계좌 추가 + default 변경) 두번째 계좌 등록 후 변경 | 신한 1개 (default) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (계좌 삭제 + default 부재 케이스) 기본 계좌 삭제 시 자동 승격 없음 | 신한(default), 카카오 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (Happy Path · 내 정산 이력) 6개월 참여 이력 조회 | 사용자가 본인이 어떤 모임에 얼마 보냈는지 회고 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (참가자 · pendingForMe 강조) 미납 건 표시 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (Happy Path · 호스트 신뢰도 조회) 모임 신청 전 호스트 평판 확인 | 사용자가 새 모임 신청 전 호스트 신뢰도 확인 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (엣지 · 정산 0건 호스트) 신뢰도 미산정 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · 본인이 아닌 계좌 접근) 다른 사용자 계좌 수정 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | (UX · 월별 요약 기간 변경) 12/24개월 보기 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

### 7-A. 평판 DRAFT 제외 + 지갑 모임정산 목록 (Fact, 2026-06-05)

> **Fact (D-OPEN-2 해소의 일부, 서버 커밋 426c26d·94c4869, 2026-06-05)**: 결정·검토 이력 canonical은 `community_api/docs/plan/DRAFT_SETTLEMENT_VISIBILITY_PLAN.md`.

- **호스트 평판 집계 정정(DEC-V5)**: `HostSettlementReputationService`의 "진행 중 건수"(activeCount)가 DRAFT를 ACTIVE와 섞어 세던 오염을 정정 — **ACTIVE만 집계, DRAFT 제외**. 작성 중(비확정) 정산이 호스트 평판 숫자에 들어가지 않는다.
- **지갑 모임정산 목록 DRAFT 포함(DEC-V9)**: `GET /api/v1/wallet/meeting-settlements`(`MeetingSettlementQueryRepository.findByParticipantUserId`)의 참여 판정이 기존 "생성자 or transfer 당사자"였는데, DRAFT 단계에는 transfer가 없어 **내 분담금이 걸린 준비 중 정산이 목록에 안 들어오던 것**을 "DRAFT && 본인 share 당사자"(share→item→settlement 조인) 분기 추가로 해소. **DRAFT && 비생성자 행은 note·autoRemindAfterHours·autoRemindSentAt null 마스킹**(F07-04 차등 노출과 동일 원칙). ACTIVE 이후 행과 생성자 행은 무변경. 실데이터 `@DataJpaTest` 8건(포함/제외/무회귀/필터/페이징).
- **앱 소비처 0 (계획 정정)** → **2026-06-05 후속 슬라이스로 해소 (api c8977c5 / app 8c60999)**: 지갑 모임정산 목록 화면(`WalletMeetingSettlementListScreen`, `/profile/wallet/meeting-settlements`, SCR-PA-005)이 이 API의 첫 소비자가 됨 — 상태 필터·무한스크롤·DRAFT '준비중' 칩+금액 변동 캡션·'내가 만든 정산' 태그. 목록 행에 `eventTitle` 배치 enrich(서버, N+1 금지, 이벤트 부재 시 null). 진입은 지갑 메인 카드. 항목 탭 시 정산 현황으로 이동하며, 앱 read 게이트는 캐시 기반 빠른 통과 + `getMyShares` BE 판정 폴백으로 재구성돼 비ATTENDING share 당사자도 진입 가능(F07-04 §8 참조).
- **참고**: 본 PRD §4의 "내 정산 참여 이력"(`/users/me/meeting-settlements`)은 별개 API로, transfer 기반 집계라 **DRAFT는 애초에 히스토리에 유입되지 않는다**(앱 히스토리 화면의 'DRAFT→준비중' 칩은 렌더 코드만 존재).

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:47 | - 카드 탭 ▶ 해당 settlement의 status 화면(F07-04) 진입 (현재 코드는 `_HistoryTile` 클릭 라우팅 별도 처리) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:55 | - 탭 ▶ 상세 모달 (옵션 — 현재 코드에 모달 화면 X) 또는 단순 표시 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:97 | - 70% 미만 주의 (회색 배지) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| ~~Gap (P2)~~ 해소 (2026-06-05, api c8977c5 / app 8c60999) | DRAFT_SETTLEMENT_VISIBILITY_PLAN §8.6 후속 완료 기록 | ~~지갑 "내 모임정산 목록" 화면 부재~~ → SCR-PA-005 구현 — 비ATTENDING share 당사자 앱 진입 경로 부재도 동시 해소(read 게이트 재구성) | 완료 |

## 9. 수용 기준

- **AC-01. (Happy Path · 첫 계좌 등록) 정산 수령용 계좌 등록**: Given 등록된 계좌 0건 When 사용자가 해당 흐름을 실행하면 Then 1개 계좌 (default).
- **AC-02. (계좌 추가 + default 변경) 두번째 계좌 등록 후 변경**: Given 신한 1개 (default) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (계좌 삭제 + default 부재 케이스) 기본 계좌 삭제 시 자동 승격 없음**: Given 신한(default), 카카오 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (Happy Path · 내 정산 이력) 6개월 참여 이력 조회**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (참가자 · pendingForMe 강조) 미납 건 표시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (Happy Path · 호스트 신뢰도 조회) 모임 신청 전 호스트 평판 확인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (엣지 · 정산 0건 호스트) 신뢰도 미산정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · 본인이 아닌 계좌 접근) 다른 사용자 계좌 수정 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. (UX · 월별 요약 기간 변경) 12/24개월 보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
