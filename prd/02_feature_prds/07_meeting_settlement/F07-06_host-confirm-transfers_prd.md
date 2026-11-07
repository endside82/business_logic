# F07-06. 이체 확인 / 일괄 확인 / 상각 (Host Confirm Transfers) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

현재 Flutter에서 일반 계좌이체 단건·일괄 확인은 정산 생성자가 수행하고, POINT+계좌이체 혼합 결제의 은행분은 수취자 또는 정산 생성자가 `받았어요`로 확인한다. 혼합결제 송금자는 정산 생성자이기도 해도 self-confirm할 수 없다. 다건 일괄 확인, 만료 transfer 재발행(reissue), 회수 불가 transfer 상각(writeoff)을 처리하며, 취소·대체 원본을 제외한 모든 transfer가 `COMPLETED`이고 모든 share도 완료될 때 settlement가 자동 `COMPLETED`로 전이된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 정산 현황 화면(SCR-MS-002) → "이체 내역" 진입 → `transfer_list_screen`
- 외부 송금 또는 혼합결제 은행분을 확인해야 하는 사용자가 정산 이체 내역으로 진입
- 만료 transfer 알림 → reissue/writeoff 진입

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `ManageMeetingSettlementController`, `TransferStatus`, `MeetingSettlementExpirationScheduler`, `ManageMeetingSettlementService`, `MeetingSettlementTransferService`. 앱: `transfer_list_screen.dart`, `transfer_card_widget.dart`, `transfer_list_provider.dart`, `transfer_actions_provider_test.dart`, `transfer_card_widget_test.dart`, `transfer_status_badge_widget.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#getTransfers`, `MeetingSettlementController#confirmBankTransfer`, `MeetingSettlementController#confirmTransferBankTransfer`, `MeetingSettlementController#bulkConfirmTransfers`, `MeetingSettlementController#reissueTransfer`, `MeetingSettlementController#writeoffTransfer`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

화면 진입 시:
1. `transferListProvider(eventId)` — 탭 인덱스에 따라 `getTransfers` 또는 `getMyTransfers`
2. `settlementDetailProvider(eventId)`의 `creatorUserId`와 로그인 사용자 ID를 비교해 정산 생성자(`isHost`) 판정
3. `appealsProvider(eventId)` ▶ PENDING appeal 표시

혼합결제 은행분 확인 액션:
1. 화면이 `status == bankAwaitingConfirm && !isSender && (isRecipient || isHost)`를 계산
2. 조건이 참일 때만 카드에 callback을 넘겨 `받았어요` 노출
3. 되돌릴 수 없는 확인 다이얼로그에서 실제 입금 비검증 경고 확인
4. `transferListProvider.confirmBankPortion(transferId)` ▶ `POST .../transfers/{id}/confirm-bank-portion`
5. 현재 탭 목록 재조회 + `settlementDetailProvider` invalidate; 서버는 transfer 완료 및 settlement 완료 조건 재평가

이체 확인 액션:
1. `transferListProvider(eventId).confirmBankTransfer(transferId)` ▶ `PATCH .../transfers/{id}/confirm`
2. 현재 탭 목록 재조회 + `settlementDetailProvider` invalidate
3. 토스트

일괄 확인 액션:
1. 현재 탭 목록에서 `pendingTransfers = transfers.where(status==PENDING)`
2. 확인 다이얼로그
3. `settlementBulkActionProvider(eventId).bulkConfirmTransfers(ids)` ▶ `PATCH .../bulk-confirm`
4. 결과 카운팅 토스트

미납자 알림 버튼:
1. 현재 탭의 PENDING transfer로 안내 문자열을 만들지만 그 문자열은 사용하지 않는다.
2. 서버/알림 API 호출 없이 “미납자 N명에게 알림을 보냈습니다” 토스트만 표시한다.

재요청 액션:
1. 확인 다이얼로그
2. `transferListProvider.reissueTransfer(transferId)` ▶ `POST .../transfers/{id}/reissue`
3. invalidate

상각 액션:
1. 사유 입력 다이얼로그
2. `transferListProvider.writeoffTransfer(transferId, reason)` ▶ `POST .../transfers/{id}/writeoff`
3. invalidate

## 4. 제품 규칙

### 송금 상태

| 값 | 뜻 | 미결 |
|---|---|---|
| `PENDING` | 결제·이체 대기 | 예 |
| `BANK_AWAITING_CONFIRM` | 혼합 결제의 은행분 확인 대기 | 예 |
| `REVERSAL_FAILED` | 되돌림 실패 | 예 |
| `PENDING_MANUAL_REFUND` | 수동 환불 대기 | 예 |
| `COMPLETED` | 완료 | 아니오 |
| `CANCELLED` | 취소 | 아니오 |
| `EXPIRED` | 만료 | 아니오 |
| `SUPERSEDED` | 재요청으로 대체된 원본. 정산 완료 판정에서 뺀다 | 아니오 |
| `BANK_WAIVED` | 포인트분은 냈고 은행분을 운영자가 면제 | 아니오 |

### 확인·재요청·상각

- 은행분을 확인하면 완료 시각을 적고 송금자에게 알린다. 앞서 낸 포인트분은 그대로다. 정산의 남은 송금이 모두 끝나고(취소·대체 제외) 모든 분담이 완료되면 ACTIVE 정산만 COMPLETED 로 바꾸고 생성자에게 알린다.
- 재요청은 최대 2회다. 새 PENDING 을 만들고 송금자에게 알린다. 상각은 되돌릴 수 없고 사유는 500자까지(선택)다.
- 일괄 확인 대상은 지금 탭의 PENDING 이다. 없으면 「확인할 이체가 없습니다」만 보인다.
- 호스트 일괄 수금의 송금 제안은 10원 단위로 반올림하되, 잔액은 실제 송금액으로 줄여 합이 어긋나지 않는다.

### limbo SLA 정책

돈이 이미 움직였을 수 있는 `BANK_AWAITING_CONFIRM`, `PENDING_MANUAL_REFUND` 는 자동으로 만료시키지 않는다. 상태를 바꾸지 않고 다시 알린다.

- 매일 05:10 에 보고, 다시 알리는 간격은 기본 3일(설정값)이다.
- `BANK_AWAITING_CONFIRM`: 수취자와 정산 생성자(다르면)에게 재알림한다.
- `PENDING_MANUAL_REFUND`: 수취자에게 환불 필요 알림을 다시 보낸다.
- 2회 이상 풀리지 않으면 운영자에게 HIGH 경보를 보낸다. 확인 대기인데 정산이 ACTIVE 가 아니면 바로 경보한다.

### 운영자 처리

확인 대기인데 정산이 진행 중이 아닌 경우는 정산 취소의 되돌림이 도는 몇 분 동안의 CANCELLED 뿐이다. 그동안 해소 명령은 `PARENT_CANCELLED`, 취소 뒤 입금 확인은 `CANCEL_IN_PROGRESS` 로 답한다. 되돌림이 끝나면 되돌림 실패(`REVERSAL_FAILED`) 방법이나 취소 뒤 입금 확인을 쓴다. 이 경우의 즉시 경보는 되돌림 복구가 멈췄다는 뜻이다.

방법은 은행 확인(증빙 필요), 포인트 보상, 손실 정리, 되돌림 재설정 넷이다.

| 상태 | 쓸 수 있는 방법 |
|---|---|
| `PENDING_MANUAL_REFUND` | 은행 확인, 포인트 보상, 손실 정리 |
| `REVERSAL_FAILED`, 은행분 없음 | 넷 모두 |
| `REVERSAL_FAILED`, 은행분 있음 | 포인트 보상, 되돌림 재설정. 가상계좌로 적립된 은행분이면 재설정만 |
| `BANK_AWAITING_CONFIRM`, 정산 ACTIVE | 손실 정리. 가상계좌가 살아 있을 수 없을 때만 은행 확인도 |
| `BANK_WAIVED`, 정산 취소 아님 | 은행 확인 |

- 돌려받을 돈의 포인트 보상은 은행분(없으면 총액)을 무료 포인트로 준다. 되돌림 실패의 보상은 원 포인트 거래의 남은 몫을 환불한다.
- 포인트분이 있는 확인 대기의 손실 정리는 은행분만 면제한다.
- 되돌림 재시도는 3회까지다. 다 쓰면 운영자에게 한 번 경보한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트 단건 확인) 참가자 1명의 계좌이체를 확인 | settlement ACTIVE, transfer 5건 (1건 PENDING 계좌이체 대기) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S2 | (Happy Path · 호스트 일괄 확인) 5건을 한 번에 확인 | 5건 PENDING (모두 계좌이체) | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (엣지 · 일괄 확인 부분 실패) 일부 transfer가 이미 ALREADY_COMPLETED | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (호스트 · EXPIRED 재요청) 30일 경과한 transfer 재발행 | `MeetingSettlementExpirationScheduler`가 transfer 1건을 EXPIRED로 전이, reissueCount=0 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (호스트 · 상각/포기) 회수 불가능한 transfer 정리 | transfer EXPIRED, 사용자 연락 두절 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S6 | (참가자 · 자기 share 확인 시도) 본인이 자기 share confirm | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (엣지 · 자동 COMPLETED 트리거) 마지막 transfer confirm 시 정산 자동 완료 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (엣지 · appeal 차단) PENDING appeal이 있는 transfer를 confirm 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | (혼합결제 · 수취자 확인) 은행분 입금을 받고 `받았어요` | ACTIVE, `BANK_AWAITING_CONFIRM`, 확인자=`toUserId`, PENDING appeal 없음 | transfer `COMPLETED` + `completedAt`, 송금자 알림, 감사로그, 정산 완료 재평가 |
| S10 | (혼합결제 · 정산 생성자 대리 확인) 수취자 대신 확인 | ACTIVE, `BANK_AWAITING_CONFIRM`, 확인자=`creatorUserId`, 확인자는 송금자가 아님 | S9와 동일, 감사 actorRole=`HOST` |
| S11 | (차단 · 송금자/제3자) 확인 우회 호출 | 송금자 또는 transfer 무관 사용자 | SELF_CONFIRM 403 또는 NOT_AUTHORIZED 403, transfer 상태 불변 |
| S12 | (차단 · wrong status/비ACTIVE/PENDING appeal) | 다른 transfer status, DRAFT·COMPLETED·CANCELLED settlement, 또는 PENDING appeal | 각각 NOT_AWAITING_CONFIRM 400 / NOT_ACTIVE 400 / UNDER_APPEAL 409, 상태 불변 |
| S13 | (표시만 성공 · 미납자 알림) | 현재 탭에 PENDING transfer 존재 | API 호출/실제 발송 없이 성공 토스트만 표시 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Risk | `MeetingSettlementExpirationScheduler.java:120-122` | `BANK_AWAITING_CONFIRM` 첫 발송 앵커가 전용 진입 컬럼 없이 `createdAt` 폴백 사용. 결제가 transfer 생성보다 늦으면 첫 알림이 다소 이르게 발화 가능 (무해하나 인지 필요) | 인지 필요 — 영향 없음 |
| Risk (2026-07-29 실측) | Controller `confirmTransferBankPortion` | URL의 `eventId`는 Controller가 받지만 service 호출에는 전달하지 않는다. 실제 대상·권한은 `transferId → settlementId`로만 결정되어 URL event context 불일치를 검증하지 않음 | service에 eventId를 전달해 transfer의 settlement event와 일치 검증하거나 공통 scope validator 적용 |
| Risk (2026-07-29 실측) | `MeetingSettlementTransferVo`, `_confirmBankPortion` | 혼합 분할 금액이 VO에 없어 확인 다이얼로그가 transfer 총액을 은행분 확인 금액으로 표시 | VO에 `pointAmount`/`bankTransferAmount` 추가 또는 금액 단정 문구 제거 |
| Fact (2026-07-29 실측) | `confirmBankPortion`, `canConfirmBankPortion` | 수취자/정산 생성자 허용, 송금자 self-confirm/제3자/wrong status 차단, 수기 입금 비검증 경고가 서버·Flutter에 반영됨 | 회귀 테스트와 경고 유지 |
| Risk (2026-07-29 실측) | `bulkConfirmBankTransfers` self-invocation | 응답은 건별 성공/실패를 집계하지만 주석과 달리 건별 service transaction이 생성되지 않아 한 건 내부 원자성이 불명확 | 명시적 건별 transaction 경계 도입 + 후반 side-effect 실패 회귀 테스트 |
| Gap (2026-07-29 실측) | `_notifyUnpaid` | 실제 알림 호출 없이 성공 토스트만 표시 | 실제 remind API에 연결하거나 버튼/성공 문구 제거 |
| Gap (2026-07-29 실측) | `_TransferSummaryStats`, `canConfirmBank`, `_TransferBottomActions` | 대기 합계가 BANK_AWAITING_CONFIRM 제외, 일반 BANK 수취자 CTA 누락, 완료 후 하단 액션 잔존 가능 | 서버 권한·상태와 표시식을 동기화 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트 단건 확인) 참가자 1명의 계좌이체를 확인**: Given settlement ACTIVE, transfer 5건 (1건 PENDING 계좌이체 대기) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. (Happy Path · 호스트 일괄 확인) 5건을 한 번에 확인**: Given 5건 PENDING (모두 계좌이체) When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 일괄 확인 부분 실패) 일부 transfer가 이미 ALREADY_COMPLETED**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (호스트 · EXPIRED 재요청) 30일 경과한 transfer 재발행**: Given `MeetingSettlementExpirationScheduler`가 transfer 1건을 EXPIRED로 전이, reissueCount=0 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (호스트 · 상각/포기) 회수 불가능한 transfer 정리**: Given transfer EXPIRED, 사용자 연락 두절 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-06. (참가자 · 자기 share 확인 시도) 본인이 자기 share confirm**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (엣지 · 자동 COMPLETED 트리거) 마지막 transfer confirm 시 정산 자동 완료**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (엣지 · appeal 차단) PENDING appeal이 있는 transfer를 confirm 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. (혼합결제 은행분 수취자/정산 생성자 확인)**: Given ACTIVE 정산의 `BANK_AWAITING_CONFIRM` transfer이고 PENDING appeal이 없을 때 When 송금자가 아닌 수취자 또는 정산 생성자가 `받았어요`를 확정하면 Then transfer가 `COMPLETED`가 되고 `completedAt`, 감사로그, 송금자 알림, 정산 완료 재평가가 기록된다.
- **AC-10. (혼합결제 은행분 self-confirm/제3자 차단)**: Given `BANK_AWAITING_CONFIRM` When 송금자 또는 무관 사용자가 endpoint를 우회 호출하면 Then 403으로 거절되고 transfer는 대기 상태를 유지한다.
- **AC-11. (혼합결제 은행분 wrong status/비ACTIVE/appeal 차단)**: Given 상태·정산·분쟁 조건이 맞지 않을 때 When 확인을 호출하면 Then 대응 error code로 거절되고 어떤 완료 side effect도 생기지 않는다.
- **AC-12. (완료 전이)**: Given 마지막 미완료 transfer가 해당 은행분 확인 건이고 모든 share가 완료됐을 때 When 확인에 성공하면 Then transfer와 ACTIVE settlement가 함께 `COMPLETED`가 되고 정산 생성자에게 완료 알림이 간다.
- **AC-13. (일괄 확인 원자성)**: Given 일괄 확인 중 한 transfer의 감사/알림 같은 후반 side effect가 실패할 때 When 해당 건을 처리하면 Then 그 transfer의 앞선 상태·지갑·원장 변경이 모두 롤백되거나, 문서화된 복구 상태로 일관되게 남아야 한다.
- **AC-14. (미납자 알림 진실성)**: Given PENDING transfer가 있을 때 When “미납자 알림” 성공을 표시하면 Then 실제 서버 알림 요청과 수신 근거가 있어야 한다.
