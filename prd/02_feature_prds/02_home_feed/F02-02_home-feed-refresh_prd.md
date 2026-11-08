# F02-02. 홈 피드 새로고침 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

홈 피드 메인 화면(SCR-HF-001)에서 사용자가 화면을 아래로 당겨 명시적으로 갱신을 요청할 때 호출되는 API 묶음이다. 백엔드 관점에서는 F02-01과 **완전히 동일한 4개 엔드포인트를 그대로 재호출**하므로 서버 로직에 변화가 없다. 차이는 클라이언트가 자체 캐시를 무시하고 강제로 새 응답을 받아온다는 점뿐이다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 메인 피드(SCR-HF-001) 화면에 진입한 상태에서, 화면을 아래로 당기는 제스처(Pull-to-refresh) 사용
- 프로그래밍적 호출: `homeFeedNotifierProvider.notifier.refresh()` (재시도 버튼, 일부 에러 화면의 onRetry)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `HomeController`. 앱: `home_feed_screen.dart`.

## 3. 전체 동작 흐름

1. 사용자가 풀투리프레시 → `RefreshIndicator.onRefresh` 콜백 실행
2. `HomeFeedNotifier.refresh()`:
   - `state = const HomeFeedState();` (4개 섹션 모두 `AsyncValue.loading`으로 리셋)
   - `await _loadFeed(forceRefresh: true)`
3. `HomeRepository.fetchHomeFeed(forceRefresh: true)`:
   - `_isCacheValid && !forceRefresh` 분기 통과 → 캐시 무시
   - `Future.wait`로 4개 호출 병렬 실행
4. 각 호출은 F02-01과 동일:
   - `EventApi.getRecommendEvents(...)` ▶ Unit 03 영역
   - `HomeApi.getUpcomingEvents(sort: 'startTime,asc', size: 10)`
   - `HomeApi.getPopularClubs(sort: 'memberCount,desc', size: 5)`
   - `HomeApi.getNewPlans(sort: 'createdAt,desc', size: 5)`
5. 4개 결과를 `Result<T>`로 받아 캐시(`_cachedXxx`) 갱신, 하나라도 success면 `_lastFetchTime = now()` 재설정
6. `HomeFeedNotifier`가 `state.copyWith(...)`로 4개 `AsyncValue` 동시 갱신 → 화면 자동 rebuild

## 4. 제품 규칙

- 아래로 당겨 새로고침하면 5분 캐시를 무시하고 네 섹션을 모두 새로 받는다. 캐시가 아직 유효해도 마찬가지다. 성공하면 캐시 시각이 새로 시작된다.
- 새로고침 중에는 섹션이 로딩 상태가 됐다가 새 데이터로 바뀐다. 일부만 실패하면 성공한 섹션은 갱신되고 실패한 섹션에만 다시 시도가 뜬다. 완료 토스트나 오류 토스트는 없다.
- 연타를 막는 별도 제한은 없고, 서버도 호출 횟수를 제한하지 않는다. 위치 좌표는 새로고침 결과에 영향을 주지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 사용자가 새 콘텐츠를 보려 풀투리프레시한다 | 홈 피드 진입 후 7분 경과 (캐시 만료 직후), `_lastFetchTime`이 7분 전이지만 마지막 데이터는 화면에 그대로 떠 있음. | 사용자가 명시적으로 갱신해 최신 데이터 확인 완료. |
| S2 | (캐시 hit이지만 강제 새로고침) 1분 전 진입 후 즉시 풀투리프레시 | `_lastFetchTime`이 1분 전 (5분 이내 → 캐시 유효). 화면에는 1분 전 데이터. | 사용자가 "최신 상태"임을 시각적으로 확인. 데이터 변화는 없음. |
| S3 | (네트워크 끊김 중 새로고침) 풀투리프레시 후 전체 실패 | 정상 진입 → 잠시 후 모바일 데이터 끊김. | 사용자가 명시적 재시도로 복구. |
| S4 | (부분 실패) 풀투리프레시 후 인기 클럽만 실패 | 정상 운영. | 다른 섹션은 새로고침 효과를 받고, 실패 섹션만 사용자 액션으로 복구. |
| S5 | (스크롤 위치 보존) 새로고침 후 스크롤 위치 | `CustomScrollView`가 4번째 섹션(최신 플랜)까지 내려간 상태. | 새 데이터 적용 후 화면 위치 유지. |
| S6 | (반복 풀투리프레시) 짧은 시간 내 반복 트리거 | 정상 운영. | 동일 데이터를 반복 가져오지만 사용자 흐름은 막히지 않음. (필요 시 향후 클라이언트 측 minimum-interval 추가 검토 사항.) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 새로 고침 부하 | 당겨서 새로 고침만 따로 막지는 않는다. 서버의 공용 요청 제한이 로그인 회원은 회원별로, 비로그인은 접속 주소별로 센다 | 없음 |

## 9. 수용 기준

- **AC-01. (Happy Path) 사용자가 새 콘텐츠를 보려 풀투리프레시한다**: Given 홈 피드 진입 후 7분 경과 (캐시 만료 직후), `_lastFetchTime`이 7분 전이지만 마지막 데이터는 화면에 그대로 떠 있음. When 사용자가 해당 흐름을 실행하면 Then 사용자가 명시적으로 갱신해 최신 데이터 확인 완료.
- **AC-02. (캐시 hit이지만 강제 새로고침) 1분 전 진입 후 즉시 풀투리프레시**: Given `_lastFetchTime`이 1분 전 (5분 이내 → 캐시 유효). 화면에는 1분 전 데이터. When 사용자가 해당 흐름을 실행하면 Then 사용자가 "최신 상태"임을 시각적으로 확인. 데이터 변화는 없음.
- **AC-03. (네트워크 끊김 중 새로고침) 풀투리프레시 후 전체 실패**: Given 정상 진입 → 잠시 후 모바일 데이터 끊김. When 사용자가 해당 흐름을 실행하면 Then 사용자가 명시적 재시도로 복구.
- **AC-04. (부분 실패) 풀투리프레시 후 인기 클럽만 실패**: Given 정상 운영. When 사용자가 해당 흐름을 실행하면 Then 다른 섹션은 새로고침 효과를 받고, 실패 섹션만 사용자 액션으로 복구.
- **AC-05. (스크롤 위치 보존) 새로고침 후 스크롤 위치**: Given `CustomScrollView`가 4번째 섹션(최신 플랜)까지 내려간 상태. When 사용자가 해당 흐름을 실행하면 Then 새 데이터 적용 후 화면 위치 유지.
- **AC-06. (반복 풀투리프레시) 짧은 시간 내 반복 트리거**: Given 정상 운영. When 사용자가 해당 흐름을 실행하면 Then 동일 데이터를 반복 가져오지만 사용자 흐름은 막히지 않음. (필요 시 향후 클라이언트 측 minimum-interval 추가 검토 사항.)
