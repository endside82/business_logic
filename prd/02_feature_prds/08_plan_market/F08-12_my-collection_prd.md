# F08-12. 내 컬렉션 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/08_plan_market/F08-12_my-collection -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/08_plan_market/F08-12_my-collection`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

사용자가 마켓에서 구매한 모든 아이템을 보관하는 "보유함" 영역. 비활성/활성/만료 상태로 구분되며, 사용자가 직접 활성화 시점을 선택할 수 있다 (활성화 시점에 만료 카운트다운이 시작된다). 만료 임박 알림 배너로 갱신을 유도한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- F08-11 구매 완료 다이얼로그 "확인" 후 `context.push('/market/collection')`
- 마켓 메인 또는 마이페이지의 "내 컬렉션" 진입점 (`/market/collection`)
- 라우터 경로: `Routes.planMarketCollection = 'collection'` (planMarket 하위)
- 만료 알림 배너 또는 푸시 알림 (구현 시점에 따라)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/08_plan_market/F08-12_my-collection/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/08_plan_market/F08-12_my-collection/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/08_plan_market/F08-12_my-collection/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/08_plan_market/F08-12_my-collection/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/plan/controller/CollectionController.java:24` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/CollectionController.java:34` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/CollectionController.java:42` | 확인됨 |
| `community_api/src/main/java/com/endside/community/plan/controller/PlanController.java:63` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 화면 진입 시:
   - `myCollectionNotifierProvider` ▶ `MarketRepository.getMyCollection()` ▶ `GET /api/v1/market/collection`
   - `expiringItemsNotifierProvider` ▶ `MarketRepository.getExpiringItems()` ▶ `GET /api/v1/market/collection/expiring`
2. 활성화 액션:
   - `myCollectionNotifierProvider.notifier.activateItem(collectionId)` ▶ `MarketRepository.activateItem(collectionId)` ▶ `POST /api/v1/market/collection/{id}/activate`
   - 성공 시 `refresh()` 호출 → 컬렉션 재로드 → 카드 상태가 "활성 D-N"으로 변경됨
3. 카드 탭: `/market/items/{itemId}` 라우터 push (F08-10에서 별도 API)

## 4. 서버 계약

### 개요

사용자가 마켓에서 구매한 모든 아이템을 보관하는 "보유함" 영역. 비활성/활성/만료 상태로 구분되며, 사용자가 직접 활성화 시점을 선택할 수 있다 (활성화 시점에 만료 카운트다운이 시작된다). 만료 임박 알림 배너로 갱신을 유도한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/market/collection | CollectionController#getMyCollection | required | 내 보유함 전체 또는 활성만 조회 |
| POST | /api/v1/market/collection/{id}/activate | CollectionController#activateItem | required | 비활성 아이템 활성화 (만료일 설정) |
| GET | /api/v1/market/collection/expiring | CollectionController#getExpiringItems | required | 3일 내 만료 예정 활성 아이템 조회 |
| GET | /api/v1/plans/{planId}/preview | PlanController#getPreview | optional | 플랜 미리보기 (구매 시 전체 본문 노출) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `PeriodType`: `NONE`, `DAY`, `MONTH`, `YEAR`, `EXPIRATION` (`constants/PeriodType.java`)
- **Entity** `Collection`:
  - `collectionId`, `userId`, `itemId`, `purchaseId`, `quantity`, `isActivated`, `activatedAt`, `expiredAt`, `createdAt`
- **VO** `CollectionVo`: 위 응답 섹션 참조

### 의존 단위 / 외부 시스템

- **F08-11 (구매)**: 구매 완료 시 `Collection` 자동 insert (isActivated=false)
- **F08-13 (이벤트 생성/리뷰)**: 컬렉션 카드를 통해 다시 F08-10으로 이동하여 리뷰 작성 또는 플랜 미리보기 진입
- **F08-10 (아이템 상세)**: 컬렉션 카드 탭 시 다시 상세로 이동
- 외부 호출 없음
- Unit 06 (결제) 의존 없음 — 활성화는 무료 행위

## 5. 프론트 계약

### 진입 경로

- F08-11 구매 완료 다이얼로그 "확인" 후 `context.push('/market/collection')`
- 마켓 메인 또는 마이페이지의 "내 컬렉션" 진입점 (`/market/collection`)
- 라우터 경로: `Routes.planMarketCollection = 'collection'` (planMarket 하위)
- 만료 알림 배너 또는 푸시 알림 (구현 시점에 따라)

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/market/collection` | `presentation/market/screens/my_collection_screen.dart` | 보유함 (전체/활성/만료 필터, 활성화 액션) |

### 화면별 구성 요소 & 액션

### 내 컬렉션 (`my_collection_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar(title: '내 컬렉션')`
  - 만료 예정 배너 (조건부 — `expiringItemsNotifierProvider` 결과 비어있지 않을 때):
    - 배경 `Color(0xFFFFF8F0)`, 마진 12 bottom, 패딩 12
    - 좌측: "만료 예정 N개" (caption, textSecondary) + "7일 내 만료되는 플랜이 있습니다" (warning500, bold)
    - 우측: "갱신하기" (orange `0xFFD89575`) 텍스트 (현 구현은 액션 미정 — 갱신 화면 미구현)
  - 필터 칩 row (높이 32) — `['전체', '활성', '만료']` (라우터 query 파라미터 아님, local state)
    - 선택: `AppColors.primary500` 배경 + white 텍스트 + bold
    - 미선택: `0xFFF0F0ED` + textSecondary
  - 컬렉션 카드 리스트 (`MarketItemListCard`):
    - 썸네일 56×56, 타입에 따라 배경색 (활성=primary500 30%, 만료=error500 30%, 비활성=gray100)
    - 타이틀 + subtitle (`만료` / `활성 D-N` / `미활성`)
    - 만료된 카드는 `opacity: 0.5`
    - 비활성 카드는 trailing에 "활성화" 작은 outline 버튼 (`AppButton.outline, ButtonSize.sm`)
- **사용자가 할 수 있는 액션**:
  - 필터 칩 탭 ▶ `setState(_selectedFilter = filter)` — 클라이언트 사이드 필터 (전체/활성/만료)
  - 카드 탭 ▶ `context.push('/market/items/${item.itemId}')` (F08-10 아이템 상세 — 미리보기/리뷰)
  - "활성화" 버튼 탭 ▶ `_activateItem(item)` ▶ `myCollectionNotifierProvider.notifier.activateItem(collectionId)` ▶ `POST /api/v1/market/collection/{id}/activate`
    - 성공: `AppToast.show('활성화되었습니다', success)` + `refresh()`로 리스트 재로드
    - 실패: `AppToast.show('활성화에 실패했습니다', error)`
  - 풀투리프레시 ▶ `myCollectionNotifierProvider`/`expiringItemsNotifierProvider` invalidate
  - 만료 배너 "갱신하기" 탭: 현 구현은 빈 콜백 (`// Navigate to renewal`)
- **상태 분기**:
  - 로딩: `Center(CircularProgressIndicator)`
  - 에러: `AppErrorState.fromError(error, onRetry: ref.invalidate(myCollectionNotifierProvider))`
  - 빈 결과: `AppErrorState(title: '구매한 플랜이 없습니다')` — 필터 적용 후 0건일 때도 동일 (현 구현)
- **모달/시트/네비게이션**:
  - 별도 모달 없음 (활성화는 토스트로만 피드백)
  - 카드 탭 시 `/market/items/{itemId}` push

### API 호출 순서 (Provider/Repository 관점)

1. 화면 진입 시:
   - `myCollectionNotifierProvider` ▶ `MarketRepository.getMyCollection()` ▶ `GET /api/v1/market/collection`
   - `expiringItemsNotifierProvider` ▶ `MarketRepository.getExpiringItems()` ▶ `GET /api/v1/market/collection/expiring`
2. 활성화 액션:
   - `myCollectionNotifierProvider.notifier.activateItem(collectionId)` ▶ `MarketRepository.activateItem(collectionId)` ▶ `POST /api/v1/market/collection/{id}/activate`
   - 성공 시 `refresh()` 호출 → 컬렉션 재로드 → 카드 상태가 "활성 D-N"으로 변경됨
3. 카드 탭: `/market/items/{itemId}` 라우터 push (F08-10에서 별도 API)

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 구매 직후 컬렉션 진입 → 비활성 아이템 확인 (Happy Path) | F08-11 구매 완료 다이얼로그 "확인" 직후 → `/market/collection`로 이동. | 사용자가 자신의 보유함에 신규 아이템을 확인. |
| S2 | 활성화 흐름 | 시나리오 본문 참조 | 카드가 활성 상태로 전이. expiredAt 카운트다운 시작. |
| S3 | 이중 활성화 시도 (400 INVALID_INPUT) | 시나리오 본문 참조 | 상태 변경 없음. |
| S4 | 권한 없음 (403 FORBIDDEN) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 만료 임박 배너 → 사용자 갱신 유도 | 시나리오 본문 참조 | 사용자에게 만료 임박 인지시킴. 향후 갱신 흐름 추가 필요. |
| S6 | 필터로 활성/만료 분리 보기 | 시나리오 본문 참조 | 사용자가 원하는 상태군만 보고 결정. |
| S7 | 카드 탭 → 아이템 상세로 이동 | 시나리오 본문 참조 | 사용자가 보유 아이템의 콘텐츠를 확인할 수 있음. |
| S8 | 빈 컬렉션 (신규 사용자) | 시나리오 본문 참조 | 빈 상태 안내. 사용자가 직접 마켓 메인으로 이동해야 함. |
| S9 | 풀투리프레시 | 시나리오 본문 참조 | 만료 임박 배너 / 활성화 D-day 모두 갱신. |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | backend 원천 문서의 Controller/Service/VO/Enum 및 trace | 위 trace가 실제 소스에 존재하는지 먼저 확인하고, endpoint/path/body/response를 기준으로 확정 |
| 프론트 계약 | frontend 원천 문서의 Route/API/Repository/Provider/Screen/Widget | Flutter가 서버 필드와 enum을 그대로 소비하는지 모델/parser에서 재확인 |
| 상태/권한 | scenarios 원천 문서의 시작 상태, 종료 상태, 우회/실패 흐름 | 시나리오별 종료 상태가 서버 응답과 화면 CTA에 동시에 반영되는지 확인 |
| 외부 영향 | 결제, 알림, 위치, 캘린더, 리뷰/신뢰 등 cross-unit 의존 | 원천 문서에 명시된 의존 단위와 정책 PRD를 함께 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:25 | - 우측: "갱신하기" (orange `0xFFD89575`) 텍스트 (현 구현은 액션 미정 — 갱신 화면 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:85 | - **갱신하기 버튼**: 액션 미구현 (`// Navigate to renewal`) — 향후 재구매 흐름 또는 동일 아이템 재구매로 라우팅 필요 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:54 | 4. 사용자 "갱신하기" 탭 → 현 구현은 액션 미구현 (TODO 주석만 있음, 기획상 재구매 또는 동일 아이템 상세로 이동 예정) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:23 | Collection -->\|만료 배너 갱신하기\| Renewal[🔵 (TODO) 갱신 흐름] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 구매 직후 컬렉션 진입 → 비활성 아이템 확인 (Happy Path)**: Given F08-11 구매 완료 다이얼로그 "확인" 직후 → `/market/collection`로 이동. When 사용자가 해당 흐름을 실행하면 Then 사용자가 자신의 보유함에 신규 아이템을 확인.
- **AC-02. 활성화 흐름**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 카드가 활성 상태로 전이. expiredAt 카운트다운 시작.
- **AC-03. 이중 활성화 시도 (400 INVALID_INPUT)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 상태 변경 없음.
- **AC-04. 권한 없음 (403 FORBIDDEN)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 만료 임박 배너 → 사용자 갱신 유도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 만료 임박 인지시킴. 향후 갱신 흐름 추가 필요.
- **AC-06. 필터로 활성/만료 분리 보기**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 원하는 상태군만 보고 결정.
- **AC-07. 카드 탭 → 아이템 상세로 이동**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 보유 아이템의 콘텐츠를 확인할 수 있음.
- **AC-08. 빈 컬렉션 (신규 사용자)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 빈 상태 안내. 사용자가 직접 마켓 메인으로 이동해야 함.
- **AC-09. 풀투리프레시**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 만료 임박 배너 / 활성화 D-day 모두 갱신.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
