# F08-12. 내 컬렉션 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 마켓에서 구매한 모든 아이템을 보관하는 "보유함" 영역. 비활성/활성/만료 상태로 구분되며, 사용자가 직접 활성화 시점을 선택할 수 있다 (활성화 시점에 만료 카운트다운이 시작된다). 만료 임박 알림 배너로 갱신을 유도한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- F08-11 구매 완료 다이얼로그 "확인" 후 `context.push('/market/collection')`
- 마켓 메인 또는 마이페이지의 "내 컬렉션" 진입점 (`/market/collection`)
- 라우터 경로: `Routes.planMarketCollection = 'collection'` (planMarket 하위)
- 만료 알림 배너 또는 푸시 알림 (구현 시점에 따라)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `CollectionController`, `PlanController`, `PeriodType`. 앱: `my_collection_screen.dart`.

<!-- source-references:start -->
서버 창구: `CollectionController#getMyCollection`, `CollectionController#activateItem`, `CollectionController#getExpiringItems`, `PlanController#getPreview`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 시:
   - `myCollectionNotifierProvider` ▶ `MarketRepository.getMyCollection()` ▶ `GET /api/v1/market/collection`
   - `expiringItemsNotifierProvider` ▶ `MarketRepository.getExpiringItems()` ▶ `GET /api/v1/market/collection/expiring`
2. 활성화 액션:
   - `myCollectionNotifierProvider.notifier.activateItem(collectionId)` ▶ `MarketRepository.activateItem(collectionId)` ▶ `POST /api/v1/market/collection/{id}/activate`
   - 성공 시 `refresh()` 호출 → 컬렉션 재로드 → 카드 상태가 "활성 D-N"으로 변경됨
3. 카드 탭: `/market/items/{itemId}` 라우터 push (F08-10에서 별도 API)

## 4. 제품 규칙

- 만료 예정은 7일 안에 끝나는 활성 항목이다.
- 활성화는 돈이 들지 않고 만료 카운트다운을 시작한다. 회수, 만료, 환불된 항목은 활성화할 수 없다. 남의 항목은 없는 것처럼 NOT_FOUND 다.
- 구매 직후 보유함 항목은 미활성이다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 구매 직후 컬렉션 진입 → 비활성 아이템 확인 (Happy Path) | F08-11 구매 완료 다이얼로그 "확인" 직후 → `/market/collection`로 이동. | 사용자가 자신의 보유함에 신규 아이템을 확인. |
| S2 | 활성화 흐름 | 시나리오 본문 참조 | 카드가 활성 상태로 전이. expiredAt 카운트다운 시작. |
| S3 | 이중 활성화 시도 (400 INVALID_INPUT) | 시나리오 본문 참조 | 상태 변경 없음. |
| S4 | 권한 없음 (403 FORBIDDEN) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 만료 임박 배너 → 사용자 갱신 유도 | 시나리오 본문 참조 | 갱신하기를 누르면 만료 예정이 하나일 때 그 상품 상세로, 여럿일 때 만료 예정 목록으로 간다. |
| S6 | 필터로 활성/만료 분리 보기 | 시나리오 본문 참조 | 사용자가 원하는 상태군만 보고 결정. |
| S7 | 카드 탭 → 아이템 상세로 이동 | 시나리오 본문 참조 | 사용자가 보유 아이템의 콘텐츠를 확인할 수 있음. |
| S8 | 빈 컬렉션 (신규 사용자) | 시나리오 본문 참조 | 빈 상태 안내. 사용자가 직접 마켓 메인으로 이동해야 함. |
| S9 | 풀투리프레시 | 시나리오 본문 참조 | 만료 임박 배너 / 활성화 D-day 모두 갱신. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 만료 예정 갱신하기 | 만료 예정 띠의 갱신하기는 만료 예정이 하나면 그 상품 상세로 가서 다시 살 수 있게 하고, 여럿이면 목록을 만료 예정으로 좁힌다 | 없음 |
| 해소됨 | 원문 조각 | 원문 표·그림의 줄바꿈 조각이라 판정할 내용이 없다 | 없음 |

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
