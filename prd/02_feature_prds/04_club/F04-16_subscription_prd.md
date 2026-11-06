# F04-16. 클럽 구독 (시작/갱신/해지/재활성) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

**클럽장(OWNER)이 플랫폼에 운영비를 지불하는 정기 구독.** 사용자 관점의 멤버 구독이 아니라 클럽 단위 운영료. FREE 클럽은 월 10,000 / 연 100,000원, BUSINESS 클럽은 월 30,000 / 연 300,000원. 결제 우선순위는 **ClubFund(클럽 기금) → 부족분 OWNER 지갑**. 만료 임박 시 자동 갱신, 결제 실패 3회시 SUSPENDED + 7일 유예 후 EXPIRED.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 상세 ▶ (OWNER 전용) "구독" 또는 클럽 설정에서 "구독 관리"
- 마이페이지 ▶ "구독 관리" — 본인이 OWNER인 클럽들의 구독 일괄 관리
- 자동 갱신 실패 / SUSPENDED 푸시 알림 ▶ 구독 관리 화면

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `ClubSubscriptionService`, `WalletService`, `AccountingLedgerService`, `NotificationService`. 앱: `subscription_screen.dart`, `subscription_manage_screen.dart`, `subscription_plan_card.dart`, `payment_method_sheet.dart`, `subscription_info_card.dart`, `subscription_status_badge.dart`, `payment_history_list.dart`, `cancel_subscription_dialog.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#getSubscriptionPlans`, `ClubController#subscribe`, `ClubController#getSubscription`, `ClubController#cancelSubscription`, `ClubController#reactivateSubscription`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **플랜 화면 진입**: `subscriptionPlanProvider(clubId)` ▶ `ClubSubscriptionRepository.getPlans(clubId)` ▶ `GET /subscription/plans` (비인증 가능)
2. **현재 구독 조회**: `subscriptionProvider(clubId)` ▶ `GET /subscription` (없으면 `CLUB_NOT_MEMBER` → 화면에 미가입 표시)
3. **구독 시작**: 결제 수단 선택 → `subscribe(clubId, ClubSubscriptionParam{planType, autoRenew})` ▶ `POST /subscription` ▶ invalidate(clubFund, subscription)
4. **해지**: `cancelSubscription(clubId)` ▶ `DELETE /subscription` ▶ invalidate
5. **재활성**: `reactivateSubscription(clubId)` ▶ `POST /subscription/reactivate` ▶ invalidate
6. **풀투리프레시**: 구독 + 기금 + 결제 이력 invalidate

## 4. 제품 규칙

- 구독이 만료된 BUSINESS 클럽은 이벤트 생성·게시, 공지 작성, 멤버 초대, 사진 앨범 생성이 막힌다. 멤버 상한 확장은 예약해 둔 칸이다. 다른 클럽은 영향이 없다.
- 클럽장이 아니면 구독 화면에서 조회 없이 클럽장 전용 안내만 보인다. 요금제 목록은 로그인 없이 볼 수 있다.
- 상태별로 할 수 있는 일: 「구독 중」은 플랜 변경·해지, 「해지 예정」은 만료일까지 혜택 유지, 「일시정지」는 재활성, 만료는 재구독이다.
- 소유권 이전은 F04-03 §4 규칙을 따른다.
- 운영자 환불은 그 결제의 몫 전액, 또는 그 결제가 더한 구간 중 쓰지 않은 몫 두 가지다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | OWNER가 새 클럽의 월간 구독 시작 (Happy Path) | 클럽 생성 직후 `subscriptionExpiresAt = null`, 기금 잔액 0, 본인 지갑 잔액 50,000. | club_subscription 1행 ACTIVE, wallet -10,000, 분개 기록. |
| S2 | 자동 갱신 — 만료 D-1 | ACTIVE 구독, expiresAt=now+1day, autoRenew=true. | 동일 row 갱신, 알림 미발송(성공 시). |
| S3 | 자동 갱신 결제 실패 1회차 → 알림 | 지갑 잔액 부족. | status=ACTIVE 유지, attempts=1. |
| S4 | 자동 갱신 3회 실패 → SUSPENDED + 7일 유예 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | SUSPENDED 상태에서 OWNER 재활성 | 시나리오 본문 참조 | 정상 ACTIVE 복귀. |
| S6 | 7일 유예 만료 → EXPIRED | SUSPENDED, gracePeriodUntil < now. | BUSINESS 클럽이면 `validateClubSubscription` 차단(공지/이벤트 작성 불가). |
| S7 | OWNER가 자동 갱신 취소 (해지 예약) | ACTIVE, 만료일 D-15. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 플랜 변경 (월간 → 연간) | ACTIVE MONTHLY 구독. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | OWNER 아닌 사용자 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 비로그인 사용자가 플랜 조회 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:136 | **외부 PG 미연동**: PG 직접 결제 미연동. 모든 결제는 ClubFund/지갑 잔액에서. (스펙 SCR-CF-005에는 "신용/체크카드", "간편결제(카카오페이)" 옵션이 있으나 서버 미구현) | Decision Needed: PG 연동 여부 결정 |
| 후보 | frontend.md:41 | **결제 이력 조회 미확인**: 서버 GET /subscription 응답에 결제 이력 별도 없음 → 클라이언트가 거래 내역(별 Unit) 또는 별도 API로 조립 필요 | 실제 소스 대조 확인 |
| 후보 | frontend.md:45 | **플랜 변경 차액 처리 미구현**: 월간→연간 변경 시 잔여 월간 환불 없이 풀가격 청구. 클라이언트 안내 필요 | Decision Needed: 차액 처리 정책 결정 |

## 9. 수용 기준

- **AC-01. OWNER가 새 클럽의 월간 구독 시작 (Happy Path)**: Given 클럽 생성 직후 `subscriptionExpiresAt = null`, 기금 잔액 0, 본인 지갑 잔액 50,000. When 사용자가 해당 흐름을 실행하면 Then club_subscription 1행 ACTIVE, wallet -10,000, 분개 기록.
- **AC-02. 자동 갱신 — 만료 D-1**: Given ACTIVE 구독, expiresAt=now+1day, autoRenew=true. When 사용자가 해당 흐름을 실행하면 Then 동일 row 갱신, 알림 미발송(성공 시).
- **AC-03. 자동 갱신 결제 실패 1회차 → 알림**: Given 지갑 잔액 부족. When 사용자가 해당 흐름을 실행하면 Then status=ACTIVE 유지, attempts=1.
- **AC-04. 자동 갱신 3회 실패 → SUSPENDED + 7일 유예**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. SUSPENDED 상태에서 OWNER 재활성**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 ACTIVE 복귀.
- **AC-06. 7일 유예 만료 → EXPIRED**: Given SUSPENDED, gracePeriodUntil < now. When 사용자가 해당 흐름을 실행하면 Then BUSINESS 클럽이면 `validateClubSubscription` 차단(공지/이벤트 작성 불가).
- **AC-07. OWNER가 자동 갱신 취소 (해지 예약)**: Given ACTIVE, 만료일 D-15. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 플랜 변경 (월간 → 연간)**: Given ACTIVE MONTHLY 구독. When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. OWNER 아닌 사용자 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 비로그인 사용자가 플랜 조회**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
