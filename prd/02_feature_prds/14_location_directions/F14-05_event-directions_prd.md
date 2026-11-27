# F14-05. 이벤트 길찾기와 참석자 거리 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 소스를 기준으로 갱신했다. 구현 계약의 대조이며 새 앱 실행·운영 검수 통과 기록이 아니다. 현재 할 일은 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)에 있다.

## 현재 역할과 입구

오프라인 이벤트의 「길찾기」는 전용 화면으로 이동해 출발 위치·예상 거리와 시간·이동 방식·외부 지도 링크를 보여 준다. 주소 행의 지도 앱 선택 시트는 장소를 여는 별도 입구다. 길찾기 화면은 진입 후 현재 GPS를 한 번 읽거나 저장 주소를 골라 요청한다.

## 길찾기 요청과 출발점

GET /api/v1/events/{eventId}/directions는 이벤트 상세 접근을 확인하고 오프라인 이벤트·유효한 목적지 좌표를 요구한다. 요청은 userAddressId 또는 originLatitude·originLongitude다. 저장 주소 식별자가 있으면 본인 소유를 먼저 확인하고, 없으면 명시 좌표, 둘 다 없으면 기본 주소를 사용한다. 좌표 한쪽만 전달하면 거절한다. 유한값·범위·(0,0) 제외를 적용한다.

응답은 이벤트·목적지·출발지 정보, 지도 링크, 거리·시간, 안내 단계다. 주소 소유자 불일치와 주소 없음은 별도 오류다. 앱에서 GPS 취득이 실패했다고 서버의 기본 주소 fallback이 자동 호출되는 것은 아니다.

## 예상 시간과 외부 지도 링크

현재 서버는 도로 경로·실시간 교통 API를 조회하지 않는다. Haversine 직선거리로 2km 이하 도보 5km/h, 20km 이하 대중교통 30km/h, 그 밖은 자동차 50km/h를 적용한다. 시간을 분 단위 올림하고 거리는 소수 첫째 자리로 반올림한다. 안내는 출발·이동·도착의 일반 단계다.

서버는 Kakao·Naver·Google·Apple과 자동차·대중교통·도보·자전거 조합의 링크 16개를 만든다. 링크 생성은 각 OS에서 모든 조합이 정상 실행된다는 증거가 아니다. 앱은 도보를 기본으로 응답 링크의 이동 방식과 지도별 선택지를 구성한다.

선택한 지도 링크가 canLaunchUrl에서 불가할 때 같은 방식의 Google 링크가 실행 가능하면 대체 안내와 함께 연다. launchUrl 자체의 실패·예외까지 모두 처리하는 fallback으로 설명하지 않는다. 실제 지도 앱 이동과 복귀는 별도 확인 대상이다.

## 참석자 거리의 별도 권한

GET /api/v1/events/{eventId}/attendees/distances는 호스트·활성 공동호스트·클럽 관리자만 허용하고 일반 참석자는 EVENT_NOT_OWNER다. 오프라인 이벤트만 처리하며 위치 공유 설정이 꺼져 있으면 빈 목록이다.

ATTENDING 참석자 중 본인 공유 동의·차단 제외·유효한 최신 좌표·미만료 또는 null 만료를 적용하고 목적지와 직선거리를 계산해 가까운 순으로 정렬한다. 이 메서드는 위치 목록과 같은 명시적 공유 시간 검사를 하지 않고 위치 열람 로그도 남기지 않는다. 현재 새 좌표의 종료 상한과 별개로 null 만료 등 기존 자료의 경계를 구분한다.

위치 공유 화면도 이 거리 provider를 사용하지만 실패를 빈 부가 정보로 취급한다. 일반 참석자가 위치는 보면서 거리 정보는 받지 못할 수 있다. 사람 탐색 변경 신호는 거리 조회도 갱신한다.

## 코드 위치

서버: DirectionsController, MapDirectionsService, DirectionsEventAdapter, DirectionsParam, DirectionsVo, AttendeeDistanceVo. 앱: directions_api.dart, directions_provider.dart, attendee_distance_provider.dart, directions_screen.dart, event_info_section.dart.

<!-- source-references:start -->
서버 창구: `DirectionsController#getDirections`, `DirectionsController#getAttendeeDistances`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 시간은 직선거리 기반 추정이고 외부 지도 fallback은 모든 launch 실패를 처리하지 않는다. | 실제 도로 경로·교통량 및 완전한 복구로 표현하지 않는다. |
| Risk | 관리용 거리는 위치 목록과 역할·시간 검사·열람 로그가 다르다. | 현재 접근 계약을 별도로 기록한다. |
| 미검증 | 실제 지도 앱 이동·복귀·설치 여부를 새로 확인하지 않았다. | 링크 생성과 기기 검수를 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 목적지:** 이벤트 상세 접근과 오프라인·유효 목적지를 확인한다.
- **AC-02 출발 우선순위:** 본인 저장 주소, 명시 좌표, 기본 주소 순서를 적용하고 불완전 좌표·타인 주소를 거절한다.
- **AC-03 거리와 시간:** 직선거리·거리별 고정 속도 추정임을 밝히고 실제 도로 경로로 표현하지 않는다.
- **AC-04 지도 선택:** 응답 기반 이동 방식·지도 선택과 실행 불가 시 Google 대체 조건을 구분한다.
- **AC-05 관리용 거리:** 운영 권한·ATTENDING·동의·차단·좌표·만료 조건을 적용하고 거리순으로 반환한다.
- **AC-06 다른 접근 계약:** 일반 위치 조회의 시간 조건·열람 로그가 관리용 거리에도 동일하게 적용된다고 주장하지 않는다.
