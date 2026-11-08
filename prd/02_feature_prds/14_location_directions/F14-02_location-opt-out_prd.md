# F14-02. 위치 공유 중지 (opt-out) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-29 현재 소스 갱신: `LocationService#optOut`은 `LocationOptIn.optedIn=false` 저장과 함께 `locationShareRepository.deleteByEventIdAndUserId(eventId, userId)`를 호출한다. 따라서 기존 문서의 “LocationShare 행은 남는다”는 설명은 현재 소스와 반대이며, 성공 즉시 보관 좌표를 삭제하는 계약으로 교정한다.

## 1. 결론

참석자가 진행 중인 위치 공유를 즉시 중지하는 API. `LocationOptIn` 행의 `optedIn`을 `false`로 저장하고 해당 이벤트·사용자의 `LocationShare` 행을 삭제한다. 이후 다른 참석자의 `GET /location` 응답에서 본인이 제외된다. 위치 지도 화면에서 끄면 목록 조회와 GPS 전송 타이머를 모두 정지하지만, push로 연 프라이버시 화면에서 끄는 경로는 아래 지도 화면의 타이머를 직접 정지하지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- (1) `EventLocationScreen` (SCR-LD-001)의 시트 안 "위치 공유" 토글 Off
- (2) `LocationPrivacyScreen` (SCR-LD-003)의 이벤트 카드 토글 Off
- 종료 +2시간은 일반 참석자의 GET/update 접근창 종료일 뿐 opt-out 동작이 아니다. `LocationOptIn.optedIn`을 false로 바꾸는 자동 경로는 없다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `LocationController`. 앱: `event_location_screen.dart`, `location_privacy_screen.dart`.

<!-- source-references:start -->
서버 창구: `LocationController#optOut`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 토글 Off 액션 → 다이얼로그 → 확인
2. `EventLocationNotifier.optOut()` → `EventLocationRepository.optOut(eventId)` → POST `/api/v1/events/{eventId}/location/opt-out`
3. 성공 → notifier가 내부 `refresh()`를 fire-and-forget으로 호출한다. 일반 참석자는 이제 opt-in이 아니므로 `GET /location`이 `LOCATION_OPT_IN_REQUIRED`로 거절되고 `refresh()`가 예외를 삼켜 기존 state를 유지할 수 있다. 관리자급 조회자만 새 목록을 정상 수신한다.
4. (Privacy 화면 흐름) 같은 `EventLocationNotifier.optOut()` 성공 후 `ref.invalidate(locationPrivacyProvider(eventId))`로 대시보드를 재조회

## 4. 제품 규칙

- opt-out 은 본인 데이터를 거두는 일이라 참석 자격이 없어져도(참석 취소, 역할 제한 등) 막지 않는다. 좌표를 올리는 opt-in 과 갱신은 자격을 계속 요구한다.
- opt-out 의 결과는 항상 같다. 동의는 `false` 로 남고(행은 지우지 않는다) 내 현재 좌표는 즉시 지워지며, 만료 30분 전 알림도 더 오지 않는다.
- 위치 지도 화면의 끄기는 확인 창을 거친다(`위치 공유 중지`, `위치 공유를 중지하시겠습니까? 다른 참석자에게 내 위치가 표시되지 않습니다.`, `취소`/`중지`). 취소하면 아무것도 바뀌지 않는다. 성공하면 `위치 공유를 중지했습니다` 가 뜨고 자동 조회가 멈춘다.
- 프라이버시 화면의 끄기는 확인 창 없이 바로 처리되고 `위치 공유를 중단했습니다` 가 뜬다. 두 화면 모두 실패는 별도 안내 없이 끝난다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 목적지에 도착해서 위치 공유를 끈다 (Happy Path) | `LocationOptIn.optedIn=true`, `LocationShare` 행 존재 | 서버는 `optedIn=false`로 저장하고 `LocationShare` 행을 즉시 삭제한다. 앱은 30초 목록 조회와 60초 GPS 갱신 타이머를 모두 중지한다. |
| S2 | 다이얼로그에서 "취소"를 눌러 공유를 유지한다 (취소 분기) | 토글을 잘못 건드린 사용자 | 서버/클라이언트 모두 변화 없음. 폴링 계속 동작 |
| S3 | 프라이버시 대시보드에서 끄기 (다른 진입점) | 위치 지도에서 push한 프라이버시 화면 | 서버 좌표 삭제와 privacy 토글 Off는 동일하다. 다만 아래 위치 화면의 목록/GPS 타이머는 직접 중지되지 않아 실패 호출이 잠시 계속될 수 있다 |
| S4 | 자격 미충족 (네거티브) | 모임에서 강퇴되어 `ATTENDING` 상태가 아닌 사용자 | 서버 변화 없음 |
| S5 | `locationShareEnabled=false`인 이벤트 조회 | 일반 참석자 또는 관리자급 viewer, 기존 opt-in/share 존재 | `GET /location`은 즉시 빈 목록을 반환한다. opt-in/share 저장 행은 그대로이고 update는 차단된다. |
| S6 | 이벤트 종료 + 2h 경과 (일반 참석자 접근창 종료) | 모임이 끝났는데 화면을 켜둔 일반 참석자 | 다음 GET/update는 시간 오류로 차단되지만 opt-in은 true로 남을 수 있다. share 행은 자체 expiresAt 필터와 03:30 cleanup을 따른다. 관리자급 GET은 +2h를 우회한다. |
| S7 | 위치 지도에서 opt-out 후 다시 opt-in | 같은 위치 지도 인스턴스에서 다시 켜는 사용자 | opt-in 성공 후 첫 좌표 update를 시도하지만 그 성공 여부는 확인하지 않고 두 타이머와 성공 토스트를 시작하므로 동의 true·share row 없음 상태가 가능 |
| S8 | 프라이버시 화면에서 opt-out 후 다시 opt-in | 프라이버시 토글을 다시 켠 사용자 | opt-in 행만 true가 된다. 이 화면은 GPS 취득·`POST /update`·타이머 시작을 하지 않아 위치 화면에서 좌표를 다시 보낼 때까지 share row가 없다 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 시험 보강 기록 | 위치 공유 끄기의 시험 보강 기록이다. 결함이 아니다 | 없음 |
| Gap | `EventLocationNotifier#optOut` / `refresh` | 일반 참석자는 opt-out 직후 목록 조회 자격을 잃는데 notifier가 곧바로 GET을 재시도하고 실패를 숨긴다. 화면의 로컬 토글·타이머는 중지되지만 provider에는 이전 목록이 남을 수 있다. | opt-out 성공 시 state를 비우거나 후속 GET을 생략하는 클라이언트 정책 결정 |
| Gap | `location_privacy_screen.dart` → `EventLocationNotifier` | 프라이버시 화면의 opt-in/out 실패는 boolean false로 소실되어 사용자 안내가 없고, opt-out은 아래 위치 화면의 실행 중 타이머도 정지하지 않는다. | 실패 원인 보존과 공유 라이프사이클 제어를 한 notifier 상태로 통합 |
| P1 Gap | 프라이버시 화면 재동의 | 토글 On은 `LocationOptIn`만 true로 바꾸며 GPS update를 하지 않는다. opt-out이 share를 삭제했으므로 동의와 실제 좌표 공유가 분리된다. | opt-in 성공 뒤 좌표 확보/update 또는 위치 화면으로 명시적 이동 |
| 사실 교정 | `LocationService#getEventLocations` | `locationShareEnabled=false`이면 응답은 즉시 빈 목록이다. 저장된 opt-in/share를 자동 변경·삭제하는 것은 아니다. | “간접 opt-out/만료까지 잔존 응답” 표현 금지 |
| Gap | 종료 +2h 시간 게이트 | 일반 참석자 GET/update만 차단하며 opt-in을 false로 바꾸지 않는다. privileged viewer는 GET gate를 우회한다. | 접근창 종료와 동의 상태 종료를 UI/정책에서 명확히 구분 |

## 9. 수용 기준

- **AC-01. 목적지에 도착해서 위치 공유를 끈다 (Happy Path)**: Given `LocationOptIn.optedIn=true`, `LocationShare` 행 존재 When 사용자가 중지를 확인하면 Then 서버는 `optedIn=false`를 저장하고 현재 좌표 행을 삭제하며 앱은 두 자동 갱신 타이머를 중지한다
- **AC-02. 다이얼로그에서 "취소"를 눌러 공유를 유지한다 (취소 분기)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버/클라이언트 모두 변화 없음. 폴링 계속 동작
- **AC-03. 프라이버시 대시보드에서 끄기 (다른 진입점)**: Given 위치 화면 위에 프라이버시 화면이 push된 상태 When opt-out이 성공하면 Then 서버는 좌표를 삭제하고 privacy 토글은 Off가 되지만 아래 위치 화면의 목록/GPS 타이머는 이 경로에서 직접 중지되지 않는다
- **AC-04. 자격 미충족 (네거티브)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 변화 없음
- **AC-05. 이벤트 단위 위치 공유 비활성 조회**: Given `locationShareEnabled=false`이고 기존 opt-in/share 행이 있을 때 When GET `/location`을 호출하면 Then 즉시 빈 목록이며 저장 행과 opt-in 값은 그대로다
- **AC-06. 이벤트 종료 +2h 접근창 종료**: Given 일반 참석자의 이벤트가 종료된 지 2시간을 지났을 때 When GET/update를 호출하면 Then 시간 게이트로 차단되지만 `optedIn`은 자동으로 false가 되지 않는다. 관리자급 viewer GET은 이 게이트를 우회한다
- **AC-07. 위치 지도에서 opt-out 후 다시 opt-in**: Given 같은 위치 지도에서 다시 토글을 켤 때 When opt-in은 성공하지만 첫 좌표 update가 실패하면 Then UI는 성공 토스트와 타이머를 시작할 수 있으나 서버에는 `optedIn=true`만 있고 share row는 없을 수 있다
- **AC-08. 프라이버시 화면에서 다시 opt-in**: Given opt-out으로 share row가 삭제된 사용자가 프라이버시 토글을 다시 켤 때 When opt-in이 성공하면 Then `optedIn=true`만 저장되고, 위치 화면에서 `POST /update`하기 전까지 좌표는 노출되지 않는다
