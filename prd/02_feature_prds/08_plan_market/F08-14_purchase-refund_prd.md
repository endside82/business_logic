# F08-14 — 플랜 마켓 환불 (Purchase Refund) · v2

> 신규 PRD. 작성일 2026-05-24, codex 페어 리뷰 합의 v2 갱신.
> 상태: **구현됨** (`PurchaseRefundController`/`PurchaseRefundService`). 본 문서가 구현 계약(spec)이며 아래 일부 절(특히 환불 split 보존)은 followup이다.
> **하드 의존**: `F08-15_creator-earning-coverage_prd.md` 완료 전에는 본 PRD 백엔드 구현에 들어가지 않는다.
> 의존 이유: 환불 회계는 `CreatorEarning`의 정확한 매출 귀속과 상태 모델에 기반한다. F08-15가 그 기반이다.

## 1. 결론

플랜 마켓에서 구매한 아이템·번들·플랜에 대해 **구매자가 환불을 신청**하고, **판매자(크리에이터)가 승인 또는 거절**하는 흐름을 다룬다. 판매자 무응답에 대비한 자동 처리, 사용 흔적 기반 차단, 거절에 대한 운영자 중재까지 본 PRD가 다룬다. 환불 API는 구현되어 있다(`PurchaseRefundController`/`PurchaseRefundService` — 요청·승인·거절·구매자취소·자동처리·분쟁 진입, 회계 분개 split 포함). 다만 지갑 환불 자체는 `walletService.refundToWallet`로 **전액 paid 복원**(원결제 유료/무료 split 미보존)이며, split 보존을 위한 `refundByTransaction` 전환은 followup이다.

## 2. 의존성

본 PRD는 F08-15(크리에이터 매출 귀속 보정)에 하드 의존한다. F08-15가 보장하는 인터페이스:

- 세 source type 모두 `CreatorEarning` 행이 생성되며, `sourceId`는 **구매 ID**다.
- `CreatorEarning.status`에 `REFUND_HELD`, `REFUNDED`, `REVERSED`가 정의된다.
- `MarketplaceSettlementService`가 환불 가능 기간이 끝난 수익만 정산한다.
- 번들 매출은 포함 아이템별로 N행 분개된다.

이 보장을 전제로 환불 흐름을 설계한다.

## 3. 사용자 흐름

### 3.1 구매자

1. 마이 → 보유함 또는 내 플랜 구매 탭에서 구매 카드를 누른다.
2. "환불 신청" 버튼을 누른다 (환불 가능 상태일 때만 노출, 6절 환불 가능 조건 참조).
3. 환불 사유 입력 시트가 열린다. 사유 분류(품질 불만족, 설명과 다름, 실수 구매, 파일 하자, 기타)와 메모를 입력한다.
4. "신청" 버튼을 누르면 환불 요청이 `REQUESTED` 상태로 접수된다. 카드는 즉시 잠긴다.
5. 판매자에게 푸시 알림이 발송된다. 구매자에게는 보유함 카드에 "환불 심사 중" 배지가 표시된다.
6. 판매자 결정까지 카드는 사용·다운로드·이벤트 연결이 불가능한 잠금 상태가 된다.
7. 승인되면 결제 금액이 지갑으로 환불되고, 카드는 보유함에서 사라진다 (또는 "환불 완료" 표시).
8. 거절되면 사유와 함께 알림이 오고, 카드는 다시 사용 가능 상태로 돌아간다. 구매자는 24시간 후 1회 추가 신청 가능하다 (5.4 참조).
9. 판매자가 7일 동안 응답하지 않고 사용 흔적이 없으면 자동 승인된다. 사용 흔적이 있으면 운영자 검토로 에스컬레이션된다 (5.3 참조).
10. 거절·자동 거절에 이의가 있으면 7일 이내 1회 분쟁 신청 가능 (8절 운영자 중재 참조).

### 3.2 판매자 (크리에이터)

1. 알림 또는 크리에이터 대시보드 → "환불 요청"에서 진입한다.
2. 환불 요청 목록에서 카드를 누르면 구매자 정보·사유·구매 시점·결제 금액·사용 흔적(다운로드 횟수, 이벤트 연결, 활성화 시각)이 표시된다.
3. "승인", "거절", "추가 자료 요청" 중 하나를 선택한다.
4. 거절 시 거절 사유를 입력한다.
5. "추가 자료 요청"은 1회 가능. 7일 자동 승인 타이머를 멈춘다. 구매자가 일정 기간 응답하지 않으면 만료된다.
6. 결정이 저장되면 구매자에게 결과 알림이 발송된다.

### 3.3 운영자 (분쟁)

1. 구매자가 거절에 분쟁을 제기한 경우, `community_admin_api`를 통해 분쟁 큐에 진입한다.
2. 분쟁 상세에서 거절 사유·증빙·사용 흔적·이전 신청 이력을 검토한다.
3. "판매자 거절 유지", "강제 환불", "추가 자료 요청" 중 선택한다.
4. 강제 환불은 판매자 승인 환불과 동일한 회계 경로를 탄다. 다만 `decision_source = OPERATOR` 메타가 남는다.
5. 결정은 양측에 알림으로 통지된다. 판매자 측 정산·노출 패널티는 누적되어 별도 정책으로 추적된다.

## 4. 상태 모델

```
REQUESTED ──승인──▶ APPROVED ──지갑환불완료──▶ REFUNDED
   │                       │
   │                       └──환불실패──▶ FAILED ─재시도─▶ APPROVED
   │
   ├──거절──▶ REJECTED ──분쟁신청──▶ DISPUTED
   │                                    │
   │                                    ├──거절유지──▶ REJECTED
   │                                    └──강제환불──▶ REFUNDED_BY_OPERATOR
   │
   ├──자동승인(미사용 7일경과)──▶ APPROVED
   │
   ├──운영자에스컬레이션(사용흔적 7일경과)──▶ ESCALATED
   │                                            │
   │                                            └──운영자결정──▶ APPROVED|REJECTED
   │
   ├──자료보완요청──▶ AWAITING_BUYER ──응답없음──▶ EXPIRED
   │                              └──응답──▶ REQUESTED (타이머 재시작)
   │
   └──구매자취소──▶ CANCELED
```

### 상태 정의

| 상태 | 의미 | 카드 잠금 | 정산 영향 |
|---|---|---|---|
| `REQUESTED` | 구매자가 신청. 판매자 결정 대기. | 잠금 | 수익 행 `REFUND_HELD` |
| `AWAITING_BUYER` | 판매자가 자료 보완 요청. 구매자 응답 대기. | 잠금 | `REFUND_HELD` 유지 |
| `APPROVED` | 판매자 승인 또는 자동 승인. 지갑 환불 트랜잭션 발행 직전. | 잠금 | `REFUND_HELD` |
| `REFUNDED` | 지갑 환불 완료. | 영구 잠금 | 정산 전이면 `REFUNDED`, 정산 후면 `REVERSED` |
| `REFUNDED_BY_OPERATOR` | 운영자 강제 환불 완료. | 영구 잠금 | 동일 |
| `FAILED` | 지갑 환불 실패. 운영자 재시도 필요. | 잠금 | `REFUND_HELD` 유지 |
| `REJECTED` | 판매자 거절. 분쟁 가능 7일. | 잠금 해제 | `PENDING` 복원 |
| `ESCALATED` | 사용 흔적 + 자동 처리 대상. 운영자 검토. | 잠금 | `REFUND_HELD` |
| `DISPUTED` | 구매자가 거절에 분쟁 제기. | 잠금 | `REFUND_HELD` 재진입 |
| `CANCELED` | 구매자가 결정 전 신청 취소. | 잠금 해제 | `PENDING` 복원 |
| `EXPIRED` | 자료 보완 요청 후 구매자 무응답. | 잠금 해제 | `PENDING` 복원 |

## 5. 정책 결정 (codex 페어 리뷰 합의)

### 5.1 환불 가능 기간 — **14일**

- 결제 후 **14일** 이내 신청 가능.
- 정산 쿼리는 `created_at <= now - 14일` 조건을 포함하여 환불 가능 기간이 끝난 수익만 정산한다 (F08-15 5.5절).
- 사유 분류가 **"파일 하자" 또는 "설명과 다름"** 인 경우는 14일 제한을 예외 적용. 판매자 심사·운영자 중재로 처리한다.

### 5.2 환불 가능 조건

다음을 모두 만족해야 신청 가능:

- 결제 후 14일 이내 (5.1 예외 적용 가능)
- 같은 구매에 대해 열린 환불 요청 없음
- 누적 신청 횟수 2회 미만 (5.4 참조)
- 사용 흔적이 없거나, 사용 흔적이 있더라도 사유가 하자/설명 불일치
- 번들은 전체 환불만 (7.2 참조)
- 플랜이 이벤트에 사용 중이고 사유가 단순 변심이면 불가

### 5.3 자동 처리 — 7일 조건부

판매자 무응답 시 처리:

- **사용 흔적 없음** (다운로드 0회, 이벤트 연결 0건, 활성화 0회, 번들 보너스 미사용): **7일 후 자동 승인**
- **사용 흔적 있음**: **7일 후 `ESCALATED` 상태로 운영자 큐 진입**. 자동 승인하지 않음.
- "자료 보완 요청"이 들어오면 7일 타이머 일시 정지. 구매자 응답 시 재시작. 보완 요청은 1회만 가능.

### 5.4 재신청 정책

- 같은 구매에 대해 열린 신청은 1건만.
- 구매자 취소(`CANCELED`)는 시도 횟수에 포함하지 않는다. 단 반복 취소는 악용 지표로 누적.
- 판매자 거절(`REJECTED`) 후 24시간 잠금. 이후 1회 추가 신청 가능.
- 두 번째 신청은 **새 증빙** 또는 **새 사유**가 필수. UI에서 강제.
- 두 번째 거절 뒤에는 일반 재신청 불가. 분쟁 제기만 가능.

### 5.5 사용 흔적 정의

다음 항목 중 하나라도 발생했으면 "사용 흔적 있음"으로 본다.

- `Collection.isActivated = true` (마켓 아이템·번들 보유함 활성화)
- `Collection.activatedAt != null`
- 마켓 아이템 또는 번들 포함 아이템의 다운로드 횟수 1회 이상 (신규 `download_count` 컬럼 필요)
- `PLAN_DIRECT`: 해당 구매가 이벤트에 연결된 적이 있음 (신규 `plan_purchase_id` 추적 컬럼 필요, 6.5 참조)
- 번들 보너스 포인트가 이미 사용됨 (지갑 거래 내역에서 추적)

사용 흔적이 있으면 자유 환불은 불가하지만, 사유가 "파일 하자" 또는 "설명과 다름"이면 신청 가능. 판매자 심사 또는 운영자 중재로 처리.

### 5.6 악용 방지

다음 다층 방어를 둔다.

- **구매 단위**: 열린 환불 요청 1건, 총 신청 2회.
- **사용자 단위**: 최근 30일 환불 신청 5건 초과 시 추가 신청은 자동으로 `ESCALATED`로 진입.
- **신뢰점수(F11-05) 연동**: 승인된 환불은 차감하지 않는다. 다음 케이스만 차감:
  - 판매자 거절이 2회 이상 연속 발생한 사용자
  - 운영자가 악용으로 판정한 분쟁
  - 사용 직후 반복 환불 신청 (1주일 내 3회 이상)
- **판매자 품질 지표**:
  - 자동 승인된 환불 비율 (응답 지연)
  - 분쟁 패소 비율
  - 임계 초과 시 정산 보류·노출 제한·판매 일시 정지

### 5.7 도메인 통일 — 마켓 한정 + 공통 커널

본 PRD는 플랜 마켓에 한정한다. 정기 구독(F04-16)·이벤트 사전결제(F03-13)·기부(F04-14) 환불과는 별도 흐름을 유지한다.

다만 다음 내부 기반은 공통 커널로 설계한다:

- `RefundRequestStatus` enum (`REQUESTED/APPROVED/REFUNDED/...`)
- 환불 금액 계산 로직
- 지갑 환불 입금 트랜잭션
- 원장 기록 reference 규칙
- 알림 템플릿 베이스
- 악용 방지 카운터

이 커널 위에 도메인별 환불 서비스가 오케스트레이션을 한다. `PurchaseRefundService`는 마켓 환불 오케스트레이션을 맡고, 지갑·원장·알림은 공통 서비스에 위임한다.

### 5.8 부분 환불 — 본 PRD는 전체 환불만

본 PRD는 **전체 환불만 출시**한다. 부분 환불은 후속 PRD.

다만 데이터 모델은 부분 환불 확장이 가능한 구조로 둔다 (7.1 스키마 참조).

## 6. 데이터 모델

### 6.1 신규 테이블: `purchase_refund_request`

```sql
CREATE TABLE purchase_refund_request (
  refund_id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  purchase_id          BIGINT       NOT NULL,
  purchase_source      VARCHAR(20)  NOT NULL,  -- 'MARKET_ITEM' | 'MARKET_BUNDLE' | 'PLAN_DIRECT'
  buyer_user_id        BIGINT       NOT NULL,
  seller_user_id       BIGINT       NOT NULL,
  refund_scope         VARCHAR(20)  NOT NULL DEFAULT 'FULL',  -- 'FULL' (현재) | 'PARTIAL_ITEM' (후속) | 'PARTIAL_AMOUNT' (후속)
  requested_amount     BIGINT       NOT NULL,
  approved_amount      BIGINT       NULL,
  reason_category      VARCHAR(30)  NOT NULL,  -- 'QUALITY' | 'NOT_AS_DESCRIBED' | 'MISTAKE' | 'FILE_DEFECT' | 'OTHER'
  reason_memo          TEXT         NULL,
  status               VARCHAR(30)  NOT NULL,  -- 4절 상태 모델
  attempt_no           INT          NOT NULL DEFAULT 1,
  reapply_unlocked_at  DATETIME     NULL,
  rejection_reason     TEXT         NULL,
  refund_transaction_id BIGINT      NULL,
  decision_source      VARCHAR(20)  NULL,  -- 'BUYER' | 'SELLER' | 'AUTO' | 'OPERATOR'
  has_usage_at_request TINYINT(1)   NOT NULL DEFAULT 0,  -- 신청 시점 사용 흔적 스냅샷
  requested_at         DATETIME     NOT NULL,
  decided_at           DATETIME     NULL,
  auto_process_at      DATETIME     NULL,    -- requested_at + 7일
  awaiting_buyer_at    DATETIME     NULL,
  finalized_reason     TEXT         NULL,    -- 최종 종결 사유 (감사용)
  INDEX idx_refund_buyer (buyer_user_id, status),
  INDEX idx_refund_seller (seller_user_id, status),
  INDEX idx_refund_purchase (purchase_source, purchase_id),
  INDEX idx_refund_auto_process (auto_process_at, status)
);
```

### 6.2 신규 테이블: `purchase_refund_dispute`

```sql
CREATE TABLE purchase_refund_dispute (
  dispute_id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  refund_id             BIGINT       NOT NULL,
  buyer_user_id         BIGINT       NOT NULL,
  seller_user_id        BIGINT       NOT NULL,
  reason_category       VARCHAR(30)  NOT NULL,
  reason_memo           TEXT         NULL,
  evidence_file_group_id BIGINT      NULL,
  status                VARCHAR(20)  NOT NULL,  -- 'OPEN' | 'UPHELD' (판매자 거절 유지) | 'OVERTURNED' (강제 환불) | 'CLOSED'
  operator_user_id      BIGINT       NULL,
  operator_decision     VARCHAR(30)  NULL,  -- 'UPHOLD_REJECTION' | 'FORCE_REFUND' | 'REQUEST_MORE_EVIDENCE'
  operator_note         TEXT         NULL,
  created_at            DATETIME     NOT NULL,
  resolved_at           DATETIME     NULL,
  FOREIGN KEY (refund_id) REFERENCES purchase_refund_request(refund_id),
  INDEX idx_dispute_status (status, created_at),
  INDEX idx_dispute_refund (refund_id),
  UNIQUE KEY uk_dispute_open_refund (refund_id, status)  -- 같은 환불에 열린 분쟁 1건만
);
```

### 6.3 기존 테이블 변경

```sql
-- 환불 진행 중인 구매를 빠르게 식별
ALTER TABLE market_purchase
  ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN active_refund_id BIGINT NULL;

ALTER TABLE plan_purchase
  ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN active_refund_id BIGINT NULL;

-- 다운로드 추적 (사용 흔적 판정용)
ALTER TABLE collection
  ADD COLUMN download_count INT NOT NULL DEFAULT 0,
  ADD COLUMN first_downloaded_at DATETIME NULL,
  ADD COLUMN last_downloaded_at DATETIME NULL;

-- 플랜 직접 구매 이벤트 연결 추적 (5.5 사용 흔적 판정)
ALTER TABLE event_plan_map
  ADD COLUMN plan_purchase_id BIGINT NULL;
```

### 6.4 마이그레이션 정책

CLAUDE.md 규칙대로 `V1__init.sql` 단일 파일에 직접 반영.

### 6.5 신규 회계 계정

`AccountCode`에 다음을 추가:

- `CREATOR_RECEIVABLE`: 크리에이터 미수금. 정산 후 환불 시 회수 대상.
- `MARKETPLACE_REFUND_HOLD`: 환불 대기 중인 금액 (선택, `REFUND_HELD` 상태 대응)

`TransactionType`에도 다음을 추가:

- `MARKETPLACE_REFUND_BEFORE_SETTLEMENT`
- `MARKETPLACE_REFUND_AFTER_SETTLEMENT`
- `CREATOR_RECEIVABLE_OFFSET` (다음 정산에서 차감)

## 7. 백엔드 API

### 7.1 구매자

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/market/refunds` | 환불 신청. Body: `{ purchaseId, purchaseSource, reasonCategory, reasonMemo? }` |
| DELETE | `/api/v1/market/refunds/{refundId}` | 신청 취소 (`REQUESTED`·`AWAITING_BUYER`에서만) |
| POST | `/api/v1/market/refunds/{refundId}/respond` | 자료 보완 응답 (`AWAITING_BUYER` 상태에서) |
| POST | `/api/v1/market/refunds/{refundId}/dispute` | 거절에 분쟁 제기 |
| GET | `/api/v1/market/refunds/me` | 내 환불 요청 목록 |
| GET | `/api/v1/market/refunds/{refundId}` | 상세 |

### 7.2 판매자

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/market/refunds/incoming` | 본인에게 들어온 환불 요청 목록 |
| POST | `/api/v1/market/refunds/{refundId}/approve` | 승인 |
| POST | `/api/v1/market/refunds/{refundId}/reject` | 거절. Body: `{ rejectionReason }` |
| POST | `/api/v1/market/refunds/{refundId}/request-evidence` | 자료 보완 요청 (1회) |

### 7.2a 번들 큐레이터 관리

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/market/bundles/{bundleId}/curators` | 큐레이터 목록 |
| POST | `/api/v1/market/bundles/{bundleId}/curators` | 큐레이터 추가. Body: `{ userId, role: LEAD|CO }` |
| DELETE | `/api/v1/market/bundles/{bundleId}/curators/{curatorId}` | 큐레이터 제거 |

권한: `bundle.curator_user_id` 또는 LEAD 큐레이터만 호출 가능. LEAD는 번들당 최대 1명.

### 7.2b 번들 부분 환불

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/market/refunds/partial` | 번들 부분 환불 신청. Body: `{ purchaseId, selectedBundleItemIds, reasonCategory, reasonMemo? }` |

선택된 BundleItem만 환불 처리되며 `refund_scope=PARTIAL_ITEM`으로 기록. 모든 아이템 선택 시 일반 환불(`FULL`)로 자동 전환된다.

### 7.2c 다운로드 트래킹

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/market/collection/{id}/download` | 다운로드 흔적 기록 |

호출 시 `Collection.downloadCount++`, `firstDownloadedAt`(없을 때만), `lastDownloadedAt` 갱신. 단순 변심 환불 차단 기준이 된다.

### 7.2d Admin API 이관 정책

운영자 분쟁 처리·강제 환불 엔드포인트는 현재 `community_api`의 `AdminRefundController`에 있다. `community_admin_api`로의 이관은 다음 조건을 충족해야 한다:

- `PurchaseRefundRequest`/`PurchaseRefundDispute` Entity·Repository를 admin_api 패키지에 복제 (또는 공유 모듈로 추출)
- admin_api에 별도 `ManageRefundController` + `ManageRefundService` 작성 — 분개·지갑 환불은 community_api의 트랜잭션 경로를 그대로 사용해야 lot 추적과 회계 정합성이 유지됨
- 따라서 단순 복제가 아니라 community_api → admin_api 호출 또는 공유 라이브러리 도입이 선행돼야 한다

본 PRD 시점에는 community_api에 유지하되 라우트 prefix(`/api/v1/admin/...`)는 admin 도메인 표시로 둔다. 보안은 admin 토큰 또는 별도 `@PreAuthorize` 정책으로 강화. 모듈 분리는 별도 의사결정 + 인프라 작업으로 분리한다.

### 7.3 운영자 (admin API)

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/admin/refund-disputes` | 분쟁 큐 |
| GET | `/api/v1/admin/refund-disputes/{disputeId}` | 분쟁 상세 |
| POST | `/api/v1/admin/refund-disputes/{disputeId}/uphold` | 판매자 거절 유지 |
| POST | `/api/v1/admin/refund-disputes/{disputeId}/force-refund` | 강제 환불 |
| POST | `/api/v1/admin/refund-disputes/{disputeId}/request-evidence` | 추가 자료 요청 |
| GET | `/api/v1/admin/refund-escalations` | `ESCALATED` 상태 큐 |
| POST | `/api/v1/admin/refund-escalations/{refundId}/approve` | 운영자 직접 승인 |
| POST | `/api/v1/admin/refund-escalations/{refundId}/reject` | 운영자 직접 거절 |

### 7.4 시스템

- `RefundAutoProcessScheduler`: 매시 `auto_process_at < now AND status IN (REQUESTED)` 조회
  - 사용 흔적 없음 → `APPROVED`로 전이 + 환불 실행
  - 사용 흔적 있음 → `ESCALATED`로 전이 + 운영자 알림
- `AwaitingBuyerExpiryScheduler`: 자료 보완 요청 후 일정 기간(예: 7일) 경과 시 `EXPIRED`로 전이

## 8. 서비스 책임

### 8.1 `PurchaseRefundService`

- `requestRefund(userId, param)`: 가능 조건 검증 → `purchase_refund_request` INSERT → `market_purchase.is_locked = 1`, `active_refund_id` 설정 → `CreatorEarning.status = REFUND_HELD` → 판매자 알림
- `approveRefund(sellerUserId, refundId, decisionSource)`: 권한 검증 → status `APPROVED` → 환불 실행 위임 (8.2 참조) → 성공 시 `REFUNDED`, 실패 시 `FAILED` (별도 트랜잭션 `REQUIRES_NEW`) → 양측 알림
- `rejectRefund(sellerUserId, refundId, reason)`: 권한 검증 → status `REJECTED` → 카드 잠금 해제 → `CreatorEarning.status = PENDING` 복원 → 구매자 알림 (분쟁 가능 안내 포함)
- `cancelRefund(buyerUserId, refundId)`: `REQUESTED`·`AWAITING_BUYER`에서만 → `CANCELED` → 카드 잠금 해제 → `PENDING` 복원
- `requestEvidence(sellerUserId, refundId)`: 1회만 가능 → `AWAITING_BUYER` → auto_process_at 일시 정지
- `respondEvidence(buyerUserId, refundId, memo)`: `AWAITING_BUYER` → `REQUESTED` → auto_process_at 재계산
- `autoProcessExpired()`: 스케줄러 진입점

### 8.2 환불 실행 (회계 분개)

기존 코드 관례(`AccountingLedgerService.recordRefund`: `USER_WALLET` 차변, `CREATOR_PAYABLE` 대변)에 맞춰 다음 메서드를 신설:

> **유료/무료 split 보존** (2026-05-24 포인트 분리정산 반영): 마켓 구매는 flow-through 사용처이므로, 환불은 원결제의 유료/무료 split을 그대로 복원하는 것이 정책 목표다 — 유료분은 구매자 paid로, 무료분은 구매자 free로 환원(무료→현금 전환 차단). 회계 분개는 이미 `CreatorEarning`의 `grossPaid/grossFree`·수수료·원천징수를 split으로 인식한다(`recordMarketplaceRefundDetailedBefore/AfterSettlement`, 수수료·원천징수 환원은 유료분에만). **단 지갑 환불 자체는 현재 `walletService.refundToWallet`로 전액 paid 복원(원결제 split 미보존)이며, `refundByTransaction`(결제 txId 기준 split 조회) 전환은 followup이다.** 정본은 정책 PRD §2.5.

#### 8.2.1 정산 전 환불

```
차변: USER_WALLET (구매자 지갑 입금)
대변: CREATOR_PAYABLE[creator_i] (각 크리에이터 미지급금 차감)
대변: PLATFORM_FEE_REVENUE (수수료 환원)
대변: WITHHOLDING_TAX_PAYABLE (원천세 환원)

(번들의 경우 N행으로 발행)
```

`CreatorEarning.status = REFUNDED`로 변경.

#### 8.2.2 정산 후 환불

```
차변: USER_WALLET (구매자 지갑 입금)
대변: CREATOR_RECEIVABLE[creator_i] (각 크리에이터 미수금)
대변: PLATFORM_FEE_RECEIVABLE 또는 PLATFORM_FEE_REVENUE 보정
대변: WITHHOLDING_TAX_RECEIVABLE 또는 보정
```

`CreatorEarning.status = REVERSED`로 변경.

다음 정산 사이클에서 `CREATOR_RECEIVABLE`을 우선 차감하여 회수한다. `MarketplaceSettlementService.offsetCreatorReceivable(creatorId, availableNet)`이 정산 직전 호출되어 `REVERSED` 상태의 earning을 회수 대상으로 잡고, 가용 정산금에서 차감한 뒤 회수 완료된 행은 `PAID`로 전이된다.

`CREATOR_RECEIVABLE_OFFSET` 분개로 회수:

```
차변: CREATOR_PAYABLE (다음 정산 크리에이터 지급액에서 회수)
대변: CREATOR_RECEIVABLE
```

회수 흐름(구현):
1. 월간 정산 시작 시 각 크리에이터별로 `offsetCreatorReceivable(creatorId, totalNet)` 호출
2. `REVERSED` 상태 earning 목록 조회
3. 가용 정산금이 미수금 전액을 충당하면 해당 earning은 `PAID`로 전이 + 회수 금액만큼 정산 지급액 감소
4. 부분 회수는 본 라운드 미지원 — 전액 회수만. 부분 회수가 필요한 잔액은 다음 사이클로 이월
5. 회수 분개 1행 발행 (`recordCreatorReceivableOffset`)
6. 정산 지갑 입금 안내 메시지에 회수 금액 표시

장기 미수(예: 60일 초과)는 운영자 알림 + 판매 중지 트리거.

### 8.3 분쟁 서비스: `RefundDisputeService`

- `createDispute(buyerUserId, refundId, param)`: `REJECTED` 상태 + 거절 후 7일 이내 + 같은 환불에 열린 분쟁 없음 → `purchase_refund_dispute` INSERT → 환불 상태 `DISPUTED` → 카드 재잠금 → `CreatorEarning.status = REFUND_HELD` 복원
- `upholdRejection(operatorUserId, disputeId, note)`: 권한 검증 → dispute `UPHELD` → 환불 `REJECTED` 유지 → 카드 잠금 해제 → 양측 알림
- `forceRefund(operatorUserId, disputeId, note)`: 권한 검증 → dispute `OVERTURNED` → 환불 `REFUNDED_BY_OPERATOR` → 환불 실행(8.2) → 양측 알림 → 판매자 패널티 지표 누적
- `requestMoreEvidence(operatorUserId, disputeId, note)`: 분쟁 진행 중 자료 요청

### 8.4 락 정책

- 환불 신청 시: `MarketPurchase` row lock (`SELECT ... FOR UPDATE`)
- 환불 승인 시: `CreatorEarning` row lock. 같은 row를 월간 정산이 잡지 못하게 함.
- 정산 배치 시: 환불 가능 기간 종료 + `is_locked = 0` + `status = PENDING`인 수익만 잡음.

## 9. 클라이언트 화면

### 9.1 신규 화면

- `presentation/market/screens/refund_request_screen.dart` — 사유 입력 + 신청 시트
- `presentation/market/screens/my_refunds_screen.dart` — 내 환불 요청 목록
- `presentation/market/screens/incoming_refunds_screen.dart` — 판매자용 받은 환불 요청 목록
- `presentation/market/screens/refund_detail_screen.dart` — 양쪽 공용 상세 화면 (역할에 따라 액션 분기)
- `presentation/market/screens/dispute_create_screen.dart` — 구매자 분쟁 제기

### 9.2 기존 화면 보강

- `my_collection_screen.dart` — 카드에 "환불 신청" 버튼 + "환불 심사 중"·"분쟁 진행 중" 배지
- `creator_stats_screen.dart` — 환불 요청 카운트 + 진입 링크
- `notification_screen.dart` — 환불 신청·결정·분쟁 알림 표시
- `market_item_detail_screen.dart` — 환불 정책 안내 섹션 신설

### 9.3 라우트

`Routes`에 추가:
- `marketRefundRequest = 'refund-request'`
- `marketMyRefunds = 'my-refunds'`
- `marketIncomingRefunds = 'incoming-refunds'`
- `marketRefundDetail = ':refundId'`
- `marketDisputeCreate = ':refundId/dispute'`

### 9.4 운영자 UI

본 PRD 범위 밖. 후속 PRD로 처리. `community_admin_api` 운영자 화면은 별도 작업.

API 응답에는 후속 UI가 바로 붙을 수 있게 `canDispute`, `disputeDeadlineAt`, `activeDisputeId`, `disputeStatus`, `operatorDecision` 필드를 포함.

## 10. 알림 (Unit 12)

새 알림 타입 추가:

- `REFUND_REQUESTED` — 판매자 수신
- `REFUND_APPROVED` — 구매자 수신
- `REFUND_AUTO_APPROVED` — 양측 수신
- `REFUND_REJECTED` — 구매자 수신 (분쟁 가능 안내 포함)
- `REFUND_EVIDENCE_REQUESTED` — 구매자 수신
- `REFUND_EVIDENCE_RESPONDED` — 판매자 수신
- `REFUND_ESCALATED` — 운영자 수신
- `REFUND_FAILED` — 운영자 + 구매자 수신
- `DISPUTE_CREATED` — 운영자 + 판매자 수신
- `DISPUTE_UPHELD` — 구매자 수신
- `DISPUTE_OVERTURNED` — 판매자 + 구매자 수신
- `CREATOR_RECEIVABLE_OFFSET` — 판매자 수신 (정산에서 회수 시)

각 알림은 딥링크로 해당 상세 화면 진입.

## 11. 가이드 문서

F08-11 사용자 가이드(`business_logic/user_guides/08_plan_market/F08-11_purchase.html`)에 환불 섹션 추가. 본 PRD 구현 완료 후 가이드 갱신:

- 환불 가능 조건 (14일·중복 신청 제한·번들 단일 환불·사용 흔적 차단)
- 환불 신청 → 판매자 심사 → 결과의 흐름
- 자동 처리 정책 (미사용 7일 자동 승인, 사용 흔적 운영자 검토)
- 거절 시 재신청 정책 (24시간 쿨다운, 새 증빙 필수, 총 2회)
- 분쟁 제기 흐름 (거절 후 7일 이내)
- 사유 분류별 처리 (단순 변심·하자·설명 불일치 차이)

신규 가이드도 검토:
- `F08-15_refund_dispute.html` — 분쟁 제기 가이드 (필요 시)

## 12. 권한·검증

- `JwtAuthorizationFilter` 통해 인증된 사용자만 접근
- 환불 신청은 본인 구매에 한정 (`buyer_user_id == @AuthenticationPrincipal.userId`)
- 승인·거절은 판매자에 한정 (`seller_user_id == @AuthenticationPrincipal.userId`)
- 분쟁 처리는 운영자 권한 (`@PreAuthorize("hasRole('OPERATOR')")` 또는 admin API 토큰)
- 자동 처리 스케줄러는 시스템 권한으로 실행

## 13. Gap / Risk

- **F08-15 의존**: 본 PRD는 F08-15 완료 전 구현 불가.
- **분쟁 운영자 UI 부재**: API는 있으나 UI는 후속. 운영자가 임시로 API 도구를 써야 한다. UI 후속 PRD 우선순위 높음.
- **사용 흔적 측정 정확도**: 다운로드 카운터·플랜 구매 ID 추적은 신규 컬럼이라 백필 데이터 없음. 본 PRD 시행 이전 구매에는 사용 흔적이 0으로 보일 수 있다. 운영 정책으로 별도 안내.
- **자료 보완 요청 악용**: 판매자가 시간 끌기로 사용. 1회 제한과 7일 만료(`EXPIRED`)로 방어하지만 후속 모니터링 필요.
- **회계 정합성**: 정산 후 환불의 미수금 회수 실패 케이스. 장기 미수 처리 정책이 본 PRD에 명시되어 있으나 (60일+ 알림) 운영 합의 필요.
- **세무 보고**: `WITHHOLDING_TAX_PAYABLE` 환원 시 신고 변경. 재무·세무팀 합의.
- **국제 사례**: 한국 전자상거래법 적용 여부. 법무 검토 필요.
- **동시 환불 + 정산 경합**: 락 정책으로 방어하지만 부하 테스트 필요.

## 14. 구현 순서

1. **F08-15 완료** (선행 차단)
2. **재무·법무·운영 합의**: 환불 가능 기간 14일, 자동 처리 7일, 분쟁 7일, 신뢰점수 차감 규칙, 판매자 패널티 임계
3. **마이그레이션**: `V1__init.sql`에 신규 2개 테이블 + 기존 3개 테이블 컬럼 추가 + 신규 회계 계정·트랜잭션 타입
4. **백엔드 공통 커널**: `RefundRequestStatus`, 금액 계산, 지갑 환불 입금, 원장 reference
5. **백엔드 환불 서비스**: `PurchaseRefundService` 전체 흐름
6. **백엔드 분쟁 서비스**: `RefundDisputeService` 전체 흐름
7. **회계 분개 메서드**: 정산 전/후 환불, `CREATOR_RECEIVABLE` 회수
8. **스케줄러**: `RefundAutoProcessScheduler`, `AwaitingBuyerExpiryScheduler`
9. **알림 fanout**: 12종 알림 타입 + 딥링크
10. **백엔드 테스트**: 상태 전이·권한·잔액 정합성·정산 경합·번들 다중 크리에이터 환불
11. **클라이언트**: 신규 5개 화면 + 기존 4개 보강 + 라우트 5개
12. **가이드 갱신**: F08-11 환불 섹션
13. **운영자 UI**: `community_admin_api` 분쟁 화면 (후속 PRD)
14. **모니터링**: 자동 처리 비율, 분쟁 비율, 미수금 잔액, 판매자 패널티 지표

## 15. 잠정 결정값 (PO·재무·법무 최종 합의 전)

다음은 codex 페어 리뷰 합의로 정한 잠정값이다. 코드에 박는 기본값이며 최종 합의 시 변경 가능.

### 15.1 `CREATOR_RECEIVABLE` 장기 미수 처리

- **30일** 초과: 운영자 알림 + 정산 보류 (모니터링 단계)
- **60일** 초과: 판매 중지 트리거 (제재 단계, 운영자 수동 해제·이의 처리 경로 필수)
- **90일** 초과: 법무·회계 write-off 검토

### 15.2 판매자 패널티 임계값

| 지표 | 사전 경고 | 판매 제한 후보 |
|---|---|---|
| 자동 승인 환불 비율 (최근 30일) | 환불 3건+ AND 자동승인율 15%+ | 환불 5건+ AND 자동승인율 25%+ |
| 분쟁 패소 비율 (최근 30일) | 분쟁 2건+ AND 패소율 25%+ | 분쟁 3건+ AND 패소율 40%+ |

최소 건수 조건은 표본 1건 100% 오탐을 막기 위함. 판매 제한은 영구가 아니라 "후보" 상태로, 운영자 확인 후 처리.

### 15.3 신뢰점수 차감 가중치 (F11-05 연동)

신뢰점수 최종 차감량(0~100점 척도) 기준:

| 케이스 | 차감 |
|---|---|
| 판매자 거절 2회 연속 발생한 사용자 | **-2점** |
| 운영자 악용 판정 분쟁 | **-5점** (신고 1건과 동급) |
| 사용 직후 반복 환불 (1주 내 3회 이상) | **-8점** |

근거: 현재 `PenaltyScoreCalculator`에서 확인된 신고 1건이 penalty 20 → 최종 점수 약 -5점. 운영자 악용 판정을 이와 동급으로 둠. 환불 악용용 penalty event ledger를 별도 도입한다.

### 15.4 한국 전자상거래법 잠정 적용

- 단순 변심 + 사용 흔적 없음: **14일 환불 가능** (현 PRD 5.1)
- 단순 변심 + 사용 흔적 있음: **자동 승인 금지, 판매자/운영자 심사**
- 파일 하자·설명과 다름: **공급일부터 3개월 이내**, **안 날 또는 알 수 있었던 날부터 30일 이내** 신청 가능

근거: 전자상거래법 제17조 제1항은 기본 7일 청약철회. 더 긴 기간은 약정 가능. 14일은 유리한 약정으로 충돌 없음. 제17조 제3항은 하자·표시광고 불일치에 3개월/30일 별도 적용.

**위험도 높음**: 디지털 콘텐츠 청약철회 제한 가능성. 법무 확정 전까지 사용 흔적 있는 단순 변심은 자동 거절하지 말고 운영자 검토로 보낸다.

### 15.5 보너스 포인트 회계

기존 `PROMOTION_EXPENSE` 재사용은 **후속 회계 설계(followup)** — 현재 구현 아님 (F08-15 6.4 참조: 번들 보너스는 `WalletService.creditBonusToWallet`로 지갑 입금만 하고 회계 분개 미생성). 신규 계정 도입하지 않음.

### 15.6 기존 데이터 백필

(a) 백필 포기. 과거 `MARKET_BUNDLE`·`PLAN_DIRECT` 구매는 매출 귀속 없음 상태로 유지. 거래 메모에 "백필 이전 구매" 플래그 남김 (F08-15 3.6 결정).

## 17. MARKET_BUNDLE 환불 잠정 정책 (구현 라운드 결정)

번들은 N개 아이템이 N명의 원작자에게 정가 비례 배분되므로 환불 권한과 결과 전파가 단일 크리에이터와 다르다. 본 라운드에서 다음 잠정 정책으로 구현한다.

### 17.1 권한자 결정 (`resolveSellerUserId`)

1. `bundle.curator_user_id`가 있으면 큐레이터를 권한자로 한다.
2. 없으면 첫 번째 `CreatorEarning.creator_user_id` (= F08-15 정가 비례 배분 결과의 첫 행 — 사실상 정가가 가장 큰 아이템의 원작자 또는 ID 기준 첫 행)를 권한자로 한다.
3. 매출 귀속이 비어 있으면(백필 이전 구매) `0L`을 반환하여 운영자 큐로 진입한다.

이 단일 `sellerUserId`만이 승인/거절/자료 보완 요청 권한을 가진다.

### 17.2 환불 실행

- `purchase_refund_request`는 단일 행만 만든다.
- 승인 시 `creator_earning.source_type='MARKET_BUNDLE' AND source_id=marketPurchaseId` 행 전체를 일괄 상태 전이한다.
- 회계 분개도 일괄 처리: 각 `CreatorEarning` 행의 `grossAmount`만큼 `AccountingLedgerService.recordMarketplaceRefundBeforeSettlement` 또는 `recordMarketplaceRefundAfterSettlement`를 N번 호출한다 (정산 전/후 분기는 각 earning의 status로 판정).

### 17.3 알림

- 단일 `sellerUserId`에는 항상 단건 알림 (기존 흐름과 동일).
- 추가로 `notifyAllBundleCreators(refund, type, title, message)` 헬퍼로 모든 `CreatorEarning.creatorUserId`에게 같은 타입의 알림을 fanout한다. `sellerUserId`와 `buyerUserId`는 중복 회피.
- 적용 메서드: `requestRefund` (`REFUND_REQUESTED`/`REFUND_ESCALATED`), `approveRefund` (`REFUND_APPROVED`), `rejectRefund` (`REFUND_REJECTED`).

### 17.4 후속 결정 필요

- **부분 환불**: 본 PRD 5.8과 동일하게 전체 환불만 출시. 번들 일부 아이템만 환불은 후속 PRD.
- **다수 큐레이터**: 현재 모델은 큐레이터 1명 가정. 공동 큐레이터·환불 결정 위임 정책은 후속.
- **원작자 거절권**: 큐레이터가 승인한 환불을 원작자가 이의 제기할 수 있는지는 미정. 본 라운드는 큐레이터/대표 판매자 결정만 따른다.
- **fanout 부하**: N=100+ 큰 번들 환불 시 알림 fanout 비용. 추후 큐 비동기 처리 검토.

## 18. 명시되지 않은 결정 사항 (후속)

- 환불 사유 분류 한글 라벨 확정
- 분쟁 증빙 파일 업로드 제약 (개수·용량·형식)
- 판매자 패널티 임계값 (자동 승인 비율 X%, 분쟁 패소 비율 Y%)
- 신뢰점수 차감 가중치 정책 (F11-05와 연동)
- `CREATOR_RECEIVABLE` 장기 미수 처리 시점 (60일이 적정한가)
- 부분 환불 도입 시점 (후속 PRD)
- 정기 구독·이벤트 사전결제·기부 환불을 본 PRD 패턴으로 통일하는 마스터 플랜
