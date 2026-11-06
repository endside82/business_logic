# F07-10. 정산 계좌 / 내 정산 이력 / 호스트 신뢰도 (Account, History, Reputation) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

횡단(개인 영역) 기능: 사용자가 정산 수령용 은행 계좌를 등록·관리하고, 본인의 정산 참여 이력 및 월별 요약을 조회하며, 다른 호스트의 정산 신뢰도(완료율·평균 완료시간·취소율·이의율)를 확인한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 프로필 화면 → "정산 계좌" 메뉴 → `bank_account_screen`
- 프로필 화면 → "정산 히스토리" 메뉴 → `my_settlement_history_screen`
- 호스트 프로필 카드 / 모임 상세 → `HostReputationBadge` 탭 → 신뢰도 모달/화면 (현재 위젯만 — 별도 화면 없음)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `SettlementBankAccountController`, `MeetingSettlementHistoryController`, `HostSettlementReputationController`, `WalletController`, `MeetingSettlementService`. 앱: `bank_account_screen.dart`, `my_settlement_history_screen.dart`, `wallet_meeting_settlement_list_screen.dart`, `bank_account_card_widget.dart`, `bank_account_form_dialog.dart`, `host_reputation_badge.dart`.

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 호스트 신뢰도의 진행 중 건수는 ACTIVE 만 센다. DRAFT 는 집계에서 뺀다.
- 신뢰도 배지: 완료율 90% 이상이고 정산 3건 이상이면 초록, 70% 이상이면 파랑, 그 밖에는 회색이다.
- 지갑의 모임 정산 목록에서 DRAFT 는 「준비중」 칩으로 보인다.

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

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:47 | - 카드 탭 ▶ 해당 settlement의 status 화면(F07-04) 진입 (현재 코드는 `_HistoryTile` 클릭 라우팅 별도 처리) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:55 | - 탭 ▶ 상세 모달 (옵션 — 현재 코드에 모달 화면 X) 또는 단순 표시 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:97 | - 70% 미만 주의 (회색 배지) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| ~~Gap (P2)~~ 해소 (2026-06-05) | DRAFT_SETTLEMENT_VISIBILITY_PLAN §8.6 후속 완료 기록 | ~~지갑 "내 모임정산 목록" 화면 부재~~ → SCR-PA-005 구현 — 비ATTENDING share 당사자 앱 진입 경로 부재도 동시 해소(read 게이트 재구성) | 완료 |

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
