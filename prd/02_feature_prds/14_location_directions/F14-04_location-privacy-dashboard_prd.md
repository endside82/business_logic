# F14-04. 위치 프라이버시 대시보드 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-29 현재 소스 갱신: 컨트롤러는 `eventId`를 서비스에 전달하며, 서비스는 해당 이벤트에서 최근 30일 동안 내 위치를 본 기록만 반환한다. 응답의 `userOptedIn`·`locationShareEnabled`가 토글 상태의 서버 기준이고, Flutter는 `locationPrivacyProvider(eventId)`로 이를 조회해 접근 기록·빈 상태·재시도를 실제 렌더한다. 30일 초과 접근 로그는 매일 03:30 삭제된다. 단 호스트 토글은 전용 위치 설정 API가 아니라 DRAFT-only 범용 이벤트 PATCH를 사용하므로 OPEN/진행 이벤트에서는 실패한다.

## 1. 결론

현재 이벤트에서 내 위치가 지난 30일 동안 위치 목록 응답에 포함된 기록과 내 opt-in 상태, 이벤트 위치 공유 허용 상태를 반환하는 API다. 화면은 단일 `eventId` 컨텍스트에서 토글과 접근 기록을 함께 보여 주며, 토글 자체는 F14-01/F14-02 엔드포인트 또는 호스트의 이벤트 수정 API를 재사용한다. 접근 기록은 고유 사용자나 의도적 클릭을 세지 않는다. `GET /location` 한 번마다 응답에 포함된 타인 좌표별로 행을 추가하므로 30초 자동 폴링도 반복 기록된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- `EventLocationScreen` (SCR-LD-001) AppBar 우측 톱니바퀴 → `context.push('/home/events/$eventId/location/privacy')`
- (간접) 이벤트 설정 메뉴/딥링크에서 같은 라우트로 push 가능

## 2. 코드 위치

계약의 정본은 코드다. 서버: `LocationController`, `LocationPrivacyService`, `LocationService`, `EventService`. 앱: `location_privacy_screen.dart`, `routes.dart`.

<!-- source-references:start -->
서버 창구: `LocationController#getPrivacyDashboard`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 → `eventDetailNotifierProvider(eventId)`와 `locationPrivacyProvider(eventId)`를 함께 watch
2. `locationPrivacyProvider` → Repository → `GET /api/v1/events/{eventId}/location/privacy`
3. 응답의 `locationShareEnabled`·`userOptedIn`으로 카드/결과 프리뷰 상태를 정하고, `byEvent[].accessors[]`를 최근 접근 기록으로 렌더
4. 호스트 토글 → `PATCH /api/v1/events/{eventId}`. DRAFT에서만 성공하며, 성공 뒤 event detail과 privacy provider를 invalidate한다. OPEN/진행 이벤트는 `INVALID_EVENT_STATUS`.
5. 참석자 토글 → `/opt-in` 또는 `/opt-out` 성공 뒤 privacy provider invalidate. On은 동의 행만 바꾸며 GPS 취득·`POST /update`·타이머 시작은 하지 않는다.

## 4. 제품 규칙

- 대시보드는 한 이벤트만 다룬다. 그 이벤트에서 최근 30일 동안 내 위치를 본 기록을 보여주고, 지금 내 동의 상태와 이벤트의 위치 공유 허용 여부도 함께 준다. 삭제됐거나 없는 이벤트는 `삭제된 이벤트` 로 보인다.
- 접근 횟수와 목록은 기록 한 줄 한 줄이다. 같은 사람이 반복해서 보일 수 있고 열람자는 닉네임 없이 `사용자 #번호` 와 `MM.dd HH:mm` 으로 보인다. 기록이 없으면 `위치 접근 기록이 없습니다` / `최근 30일 동안 내 위치를 조회한 기록이 없어요.` 가 뜬다.
- 토글의 기준이 호스트와 참석자가 다르다. 호스트는 이벤트의 위치 공유 허용, 참석자는 허용되어 있고 본인이 동의한 상태가 켜짐이다. 호스트에게는 `호스트로서 이벤트의 위치 공유를 관리합니다` 가 함께 보인다.
- 안내 박스는 다섯 가지를 알린다. 위치 올리기는 시작 2시간 전부터 종료 2시간 후까지, 참석자 조회는 시작 24시간 전부터, 참석 확정자만, 중단하면 더는 보이지 않음, 접근 기록은 30일 보관.
- 토스트: 호스트 켬 `위치 공유가 활성화되었습니다`, 끔 `위치 공유가 비활성화되었습니다`, 참석자 켬 `위치 공유에 참여했습니다`, 끔 `위치 공유를 중단했습니다`, 실패 `위치 공유 설정에 실패했습니다`.
- 이 화면에서 참석자가 켜면 동의만 저장되고 좌표는 올라가지 않는다. 좌표를 올리는 것은 위치 지도 화면이다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 톱니바퀴를 눌러 진입한 일반 참석자가 토글을 끈다 (Happy Path) | opt-in true, `EventLocationScreen` 위치 화면 사용 중 | 서버 `optedIn=false`·현재 좌표 삭제, privacy 재조회에서 `userOptedIn=false` |
| S2 | 운영 중 호스트가 위치 공유 자체를 비활성화 시도 | OPEN/진행 이벤트 호스트 | 범용 PATCH가 `INVALID_EVENT_STATUS`로 실패하고 서버 값은 유지되며 호스트에게 오류 토스트 표시 |
| S3 | 처리 중 스피너 표시 (UX 디테일) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 이벤트 조회 실패 (에러 분기) | 시나리오 본문 참조 | 카드 미렌더, 안내 박스도 미노출 |
| S5 | 토글 실패 — API 에러 | 호스트 또는 일반 참석자 | 서버 변화 없음. 호스트는 오류 토스트, 참석자는 notifier가 false를 반환해 별도 안내 없이 끝날 수 있음 |
| S6 | 최근 30일 이벤트별 접근 기록 확인 | 타 참석자의 위치 화면 30초 GET에 내 share가 반복 포함됨 | 해당 이벤트의 raw 로그 행 수와 `"사용자 #id"`·시각이 모두 표시된다. 같은 접근자가 반복될 수 있고 다른 이벤트 기록은 포함되지 않음 |
| S7 | 접근 기록 없음 | 최근 30일 해당 이벤트 로그 0건 | 전용 빈 상태가 표시됨 |
| S8 | 프라이버시 화면에서 토글 On | opt-out으로 share row가 삭제된 일반 참석자 | `userOptedIn=true`로 바뀌지만 GPS 취득/update/timer가 없어 실제 좌표 share는 생성되지 않음 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 사실 | `LocationPrivacyService#getPrivacyDashboard(userId,eventId)` | 응답은 현재 이벤트에서 내 위치가 목록 응답에 포함될 때 쌓인 최근 30일 raw 로그이며, 다중 이벤트 목록 API가 아니다. | "고유 열람자/의도적 조회"로 해석하지 않도록 표시 |
| Gap | `location_privacy_screen.dart` | UI/UX 스펙의 여러 이벤트 일괄 카드 목록은 없고 단일 이벤트만 제공한다. | 다중 이벤트 허브 필요 여부 결정 |
| Gap | `location_privacy_screen.dart` | 접근자를 닉네임/프로필 없이 raw 사용자 ID로 표시하고 AppBar 도움말이 잘못된 `F12-01`을 가리킨다. | 사용자 식별 VO 확장 및 guideId 교정 |
| P0 Gap | `_toggleEventLocationShare` → `EventService.updateEvent` | 화면은 운영 중 호스트 제어처럼 보이지만 범용 PATCH는 DRAFT-only다. OPEN/진행 이벤트에서는 토글이 항상 실패한다. | 운영 상태에서도 허용하는 전용 locationShareEnabled endpoint 또는 이벤트 수정 정책 분리 |
| P1 Gap | `_toggleOptIn` / `EventLocationNotifier` | 참석자 opt-in/out 실패가 false로 축약되고 UI에 false 실패 안내 분기가 없다. | 실패 원인을 보존하고 명시적 toast/상태 rollback |
| P1 Gap | `_toggleOptIn(true)` | 프라이버시 화면은 opt-in만 저장하고 GPS 취득·첫 update·타이머를 시작하지 않는다. opt-out으로 share가 삭제된 뒤 토글을 다시 켜도 좌표는 보이지 않는다. | 실제 share 생성까지 연결하거나 동의/좌표 상태를 분리 표시 |
| 분석 한계 | `LocationAccessLog` 생성부 | 30초 자동 GET마다 대상별 행을 추가하고 dedupe하지 않아 `totalAccesses`가 고유 사용자나 의도적 조회 수처럼 보일 수 있다. | 고유 접근자 집계/세션 집계 또는 raw polling hit라는 UI 설명 |
| 후보 | scenarios.md:64 | ## E2E-derived 보강 메모 (5필드 시나리오 형식 미준수, P64 매트릭스 mode=privacy_dashboard) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 톱니바퀴를 눌러 진입한 일반 참석자가 토글을 끈다 (Happy Path)**: Given opt-in true, `EventLocationScreen` 위치 화면 사용 중 When 사용자가 토글을 끄면 Then 서버 `optedIn=false`·현재 좌표 삭제 후 privacy 응답의 `userOptedIn=false`로 화면이 동기화된다
- **AC-02. 운영 중 호스트 토글의 현재 결과**: Given OPEN/진행 이벤트 호스트가 위치 공유 토글을 누를 때 When 범용 PATCH를 호출하면 Then `INVALID_EVENT_STATUS`로 실패하고 `location_share_enabled`는 바뀌지 않으며 호스트 오류 토스트가 표시된다
- **AC-03. 처리 중 스피너 표시 (UX 디테일)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 이벤트 조회 실패 (에러 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 카드 미렌더, 안내 박스도 미노출
- **AC-05. 토글 실패 — API 에러**: Given 토글 API가 실패할 때 When 호스트 분기이면 Then 오류 토스트를 표시한다. 일반 참석자 분기이면 현재 false 반환을 소비하지 않아 별도 실패 토스트가 없을 수 있다
- **AC-06. 최근 30일 이벤트별 접근 기록 확인**: Given 해당 이벤트의 위치 목록 GET에 내 share가 반복 포함됐을 때 When 화면에 진입하면 Then 해당 이벤트의 raw 로그 행 수·접근자 ID·시각을 중복 포함해 표시하고 다른 이벤트 기록은 포함하지 않는다
- **AC-07. 접근 기록 없음**: Given 최근 30일 해당 이벤트의 접근 로그가 없을 때 When 화면에 진입하면 Then `"위치 접근 기록이 없습니다"` 빈 상태를 표시한다
- **AC-08. 프라이버시 화면에서 토글 On**: Given share row가 없는 일반 참석자 When 프라이버시 화면에서 opt-in이 성공하면 Then `userOptedIn=true`만 반영되고 위치 화면에서 `POST /update`하기 전까지 실제 좌표는 노출되지 않는다
