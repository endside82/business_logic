# F07-05. 분담금 납부 (Pay Share / Transfer) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

참가자가 본인에게 할당된 분담금(Share) 또는 이체(Transfer)를 **POINT(지갑)**, **계좌이체**, 또는 **POINT+계좌이체 혼합**으로 납부한다. POINT는 즉시 완료되지만 혼합 결제에 은행분이 있으면 transfer가 `BANK_AWAITING_CONFIRM`에 머물고, 수취자 또는 정산 생성자가 실제 입금 내역을 수기로 확인해야 `COMPLETED`가 된다. 또한 `PENDING_MANUAL_REFUND` 상태의 transfer에 대해 수취자가 본인 POINT로 자체 환불(self-refund)할 수 있고, EXPIRED transfer는 정산 생성자가 재발행(reissue)할 수 있다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 활성화 푸시 알림 탭 → 정산 현황 화면 → "내 분담금 보기" → `MySettlementSharesScreen`
- 정산 현황 → 이체 내역 화면(`TransferListScreen`) "내 이체" 탭
- 환불 필요 알림(`MEETING_SETTLEMENT_REFUND_REQUIRED`) 탭 → transfer list로 이동

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `MeetingSettlementTransferService`, `WithdrawalService`, `WalletSpendService`, `WalletService`, `AccountingLedgerService`. 앱: `transfer_list_screen.dart`, `my_settlement_shares_screen.dart`, `meeting_settlement_api.dart`, `meeting_settlement_repository.dart`, `transfer_list_provider.dart`, `transfer_card_widget.dart`, `transfer_actions_provider_test.dart`, `transfer_card_widget_test.dart`, `my_share_row_card.dart`, `transfer_status_badge_widget.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#getMyShares`, `MeetingSettlementController#getMyTransfers`, `MeetingSettlementController#payShare`, `MeetingSettlementController#confirmBankTransfer`, `MeetingSettlementController#payTransferByPoint`, `MeetingSettlementController#payTransferMixed`, `MeetingSettlementController#selfRefundTransfer`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

내 분담금 화면 진입 시:
1. `mySharesProvider(eventId)` ▶ `MeetingSettlementRepository.getMyShares` ▶ `GET .../my-shares`
2. `settlementDetailProvider(eventId)` ▶ host vs 일반사용자 분기

이체 내역 화면 진입 시:
1. `transferListProvider(eventId)` 초기 로드 — 탭 0 시 `getTransfers`, 탭 1 시 `getMyTransfers`
2. `appealsProvider(eventId)` ▶ PENDING appeal 표시

POINT 결제 액션:
1. `AppDialog.confirm` 확인
2. `transferListProvider.payTransfer(transferId)` ▶ `POST .../transfers/{id}/pay`
3. 현재 탭 목록 재조회 + `settlementDetailProvider` invalidate

혼합 결제 서버/data/provider 흐름:
1. `MeetingSettlementMixedPayParam(pointAmount, bankTransferAmount)`의 합은 transfer 총액과 정확히 같아야 한다.
2. `transferListProvider.payTransferMixed(...)` ▶ `POST .../transfers/{id}/pay-mixed`
3. `bankTransferAmount == 0`이면 전액 POINT로 즉시 `COMPLETED`; `> 0`이면 POINT 부분만 차감·수취 반영하고 transfer는 `BANK_AWAITING_CONFIRM`
4. 수취자 또는 정산 생성자가 `받았어요` ▶ `POST .../confirm-bank-portion`
5. 서버가 transfer를 `COMPLETED`로 바꾸고 정산 완료 조건을 다시 계산

> **현재 Flutter 도달성:** API/Repository/Provider에는 `payTransferMixed`가 있으나 `community_app/lib/presentation/meeting_settlement`에는 이를 호출하는 결제 CTA/다이얼로그가 없다. 반대로 이미 `BANK_AWAITING_CONFIRM`인 transfer를 확정하는 `받았어요` CTA와 caller는 구현돼 있다.

self-refund 액션:
1. `AppDialog.confirm` ("환불 후 되돌릴 수 없습니다")
2. `transferListProvider.selfRefundTransfer(transferId)` ▶ `POST .../transfers/{id}/self-refund`

share 결제 액션 (my_shares에서):
1. `mySharesProvider.payShare(shareId)` ▶ `POST .../shares/{id}/pay`

## 4. 제품 규칙

- 포인트 납부는 유료 포인트만 쓴다(무료 포인트 불가).
- 출금 자격은 실제로 받은 사람에게만 생긴다. 분담금을 낸 사람은 낸 것으로 출금 자격을 얻지 않고, 자체 환불·선입금 환불로 받은 돈도 출금 권리가 아니다.
- 정산 취소 되돌림은 원결제의 유료·무료 몫을 되살려, 무료가 유료로 바뀌지 않는다.
- 참석을 취소해도 내 돈이 걸려 있으면 내 분담금을 볼 수 있다. 결제는 그대로 막아, DRAFT 에서는 결제·확정·재발행·상각을 거절한다.
- DRAFT 분담금에는 「준비 중」 표시와 금액이 바뀔 수 있다는 안내가 붙는다.
- 이의 버튼은 정산 상태를 확인한 뒤 DRAFT 가 아니고 호스트가 아닐 때만 보인다. 호스트는 자기 분담에 이의할 수 없다(자기 이의로 완료를 막지 않게). 이의 사유는 2000자까지다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 참가자 · POINT 결제) 분담금 16,000원을 포인트로 즉시 결제 | settlement ACTIVE, 본인 transfer 1건 PENDING (16,000원 → 호스트) | 사용자 지갑 -16,000, 호스트 지갑 +16,000, transfer COMPLETED, 호스트 푸시 1건. |
| S2 | (참가자 · 외부 송금 앱) 토스로 16,000원을 호스트에게 송금 | 토스 앱 사용자 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (참가자 · 혼합 결제 mixed) POINT 10,000 + 계좌이체 6,000 | ACTIVE, 본인 PENDING transfer 16,000원 | POINT 10,000은 즉시 이동하고 transfer는 `MIXED/BANK_AWAITING_CONFIRM`; `completedAt`은 아직 기록되지 않으며 수취자/정산 생성자 확인 전 정산 완료 불가 |
| S3-A | (수취자/정산 생성자 · 은행분 확인) `받았어요` | 위 S3 transfer, PENDING appeal 없음, 확인자는 송금자가 아님 | transfer `COMPLETED` + `completedAt`, 송금자 알림·감사로그, 모든 유효 transfer/share 완료 시 settlement `COMPLETED` |
| S3-B | (차단 · 송금자/제3자/상태 불일치) 은행분 확인 우회 호출 | 송금자 또는 무관 사용자, 혹은 상태가 `BANK_AWAITING_CONFIRM`이 아님 | 각각 403 SELF_CONFIRM / 403 NOT_AUTHORIZED / 400 NOT_AWAITING_CONFIRM, 상태 불변 |
| S4 | (참가자 · share 직접 결제) my-shares에서 항목 단위로 결제 | HOST_COLLECT 모드가 아니라 항목 단위 share 결제 흐름 (현재는 transfer 단위 결제가 주류) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (수취자 · self-refund) 정산 취소로 PENDING_MANUAL_REFUND 된 BANK 입금분 환불 | 호스트가 정산 취소 → 자기 transfer가 BANK_TRANSFER COMPLETED였음 → PENDING_MANUAL_REFUND로 전이 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (엣지 · 잔액 부족) 결제 시도 시 지갑 잔액 부족 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (엣지 · 이미 완료된 transfer) 중복 결제 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · PENDING appeal 차단) 본인 transfer에 이의가 걸린 상태에서 결제 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | (엣지 · settlement 완료 트리거) 마지막 transfer 결제 시 정산 자동 COMPLETED | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 송금 조회 권한 | 송금 조회는 로그인 회원 본인 것만 돌려준다 | 없음 |
| 해소됨 | 내 몫 화면 | 내 몫 화면은 항목별 몫을 보이고 「실제로 주고받을 돈 보기」 로 송금 목록에 간다. 내는 일은 송금 목록에서 한다 | 없음 |
| Gap (2026-07-29 실측) | `transfer_list_provider.dart:111`, presentation 전체 caller 검색 | `pay-mixed` API/Repository/Provider는 있으나 현재 Flutter presentation에서 호출하는 CTA/다이얼로그가 없어 사용자가 혼합 결제를 시작할 수 없음 | 혼합 결제 입력 CTA를 배선하거나 미지원 기능으로 명시 |
| Risk (2026-07-29 실측) | `MeetingSettlementTransferVo`, `transfer_list_screen.dart:_confirmBankPortion` | transfer 응답에는 혼합 결제의 point/bank 분할 금액이 없고 총액 `amount`만 있다. 확인 다이얼로그는 총액을 “계좌이체 부분” 확인 금액으로 표시해 실제 은행분보다 크게 보일 수 있음 | 서버 VO에 분할 금액을 보존·노출하거나 다이얼로그에서 금액 단정을 제거 |
| Fact (2026-07-29 실측) | `confirmBankPortion`, `canConfirmBankPortion` | 서버와 Flutter 모두 송금자 self-confirm을 막고 수취자/정산 생성자만 은행분 확인 가능. 실제 입금 자동 검증은 없음 | 현 신뢰 경계와 경고 문구 유지 |

## 9. 수용 기준

- **AC-01. (Happy Path · 참가자 · POINT 결제) 분담금 16,000원을 포인트로 즉시 결제**: Given settlement ACTIVE, 본인 transfer 1건 PENDING (16,000원 → 호스트) When 사용자가 해당 흐름을 실행하면 Then 사용자 지갑 -16,000, 호스트 지갑 +16,000, transfer COMPLETED, 호스트 푸시 1건.
- **AC-02. (참가자 · 외부 송금 앱) 토스로 16,000원을 호스트에게 송금**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (참가자 · 혼합 결제 mixed) POINT 일부 + 계좌이체 일부**: Given ACTIVE 정산의 본인 PENDING transfer이고 두 금액 합이 총액과 같을 때 When `pay-mixed`를 호출하면 Then POINT 부분만 즉시 이동하고 은행분이 있으면 transfer는 `BANK_AWAITING_CONFIRM`에 머물며 `completedAt`은 아직 기록되지 않는다.
- **AC-03-A. (수취자/정산 생성자 · 혼합 은행분 확인)**: Given `BANK_AWAITING_CONFIRM`이고 PENDING appeal이 없을 때 When 송금자가 아닌 수취자 또는 정산 생성자가 `받았어요`를 확정하면 Then transfer가 `COMPLETED`가 되고 송금자 알림·감사로그·정산 완료 재평가가 실행된다.
- **AC-03-B. (차단 · 은행분 self-confirm/제3자/잘못된 상태)**: Given 혼합 은행분 확인 요청 When 송금자, 무관 사용자, 또는 잘못된 상태로 호출하면 Then 각각 서버의 SELF_CONFIRM, NOT_AUTHORIZED, NOT_AWAITING_CONFIRM 오류로 거절되고 transfer 상태는 바뀌지 않는다.
- **AC-04. (참가자 · share 직접 결제) my-shares에서 항목 단위로 결제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (수취자 · self-refund) 정산 취소로 PENDING_MANUAL_REFUND 된 BANK 입금분 환불**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (엣지 · 잔액 부족) 결제 시도 시 지갑 잔액 부족**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (엣지 · 이미 완료된 transfer) 중복 결제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · PENDING appeal 차단) 본인 transfer에 이의가 걸린 상태에서 결제 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. (엣지 · settlement 완료 트리거) 마지막 transfer 결제 시 정산 자동 COMPLETED**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
