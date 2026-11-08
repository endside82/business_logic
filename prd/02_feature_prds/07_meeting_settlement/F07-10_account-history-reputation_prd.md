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

내 정산 진입:
1. 「내 정산」 화면이 보낼 돈·받을 돈·지난 내역 세 탭과 기간 합계를 보인다. 금액을 알 수 없는 내역은 합계에서 빼고 그 사실을 적는다.
2. 나눔·송금 내역의 카드를 누르면 그 내역의 상세로 간다. 그 밖의 카드는 누르지 않는다. 「모임별 보기」 단추는 지갑의 모임 정산 목록으로 간다.

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

### 받을 계좌 등록·인증

- 계좌는 은행·번호·예금주 셋이 모두 있어야 등록된다. 첫 계좌는 기본 계좌가 된다. 같은 은행·번호·예금주를 다시 등록하면 새 계좌를 만들지 않고 있던 계좌를 돌려준다. 등록 요청은 같은 요청 열쇠로 다시 보내면 첫 결과를 그대로 받는다.
- 탈퇴가 끝난 회원은 계좌를 등록하거나 고칠 수 없다.
- 계좌이체 참가비를 받는 모임(이벤트·정기모임)은 호스트 본인 계좌 하나에 묶인다. 고르지 않으면 기본 계좌가 묶이고, 기본 계좌도 없으면 모임을 만들 수 없다. 없는 계좌와 남의 계좌는 같은 거절로 답한다.
- 모임에 묶였거나 결제 건이 가리키는 계좌는 은행·번호·예금주를 고칠 수 없고 지울 수도 없다. 계좌를 바꾸려면 새 계좌를 등록해 모임에 다시 묶는다. 화면은 서버가 허락할 때만 고치기·지우기 메뉴를 보인다.
- 실명 확인(1원 인증): 인증 시작을 누르면 계좌로 1원이 가고 입금자명에 4자리 번호가 실린다. 그 번호를 10분 안에 5번 안에 넣으면 확인된 계좌가 된다. 상태는 미확인·확인 중·확인됨·실패 넷이다. 은행·번호·예금주 가운데 하나라도 바꾸면 확인이 풀린다.
- 지금은 실명 확인을 강제하지 않는다. 1원 인증 공급자 계약 전이라 확인되지 않은 계좌도 모임에 묶이고, 「계좌 인증」 표시는 붙지 않는다. 그동안 계좌를 잘못 적은 경우는 참가자의 입금자명 신고, 호스트의 입금 확인, 환불과 환불 수령 확인으로 바로잡는다. 공급자 계약 때 강제를 켠다. 켜면 확인된 계좌만 새로 묶이고, 이미 묶인 모임은 그대로 간다.

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
| 해소됨 | 내 정산 카드 누름 | 「내 정산」 화면의 나눔·송금 카드는 그 내역의 상세로 가고, 모임별로는 지갑의 모임 정산 목록이 모임 정산 화면으로 보낸다 | 없음 |
| 해소됨 | 신뢰도 상세 창 | 신뢰도는 모임 상세의 호스트 카드에 붙는 배지로만 보인다. 누르는 상세 창은 두지 않는다 | 없음 |
| 해소됨 | 70% 미만 배지 | 완료율 70% 미만은 회색 배지다(4절 규칙과 같다) | 없음 |
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
