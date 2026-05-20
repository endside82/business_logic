# F10-05. 타 사용자 가용성 공개 조회 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/10_calendar/F10-05_other-user-availability -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/10_calendar/F10-05_other-user-availability`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

다른 사용자가 공개해 둔 가용 시간을 조회해 "그 시간에 이벤트를 제안하거나 만남을 잡을 수 있는지" 사전 확인하는 읽기 전용 API다. 두 가지 공개 범위가 있다. `public`은 비로그인 진입도 가능한 단순 공개 슬롯, `friends`는 호출자가 대상의 친구일 때만 응답한다(친구 정의는 같은 이벤트에 ATTENDING으로 함께 참석한 이력 또는 상호 리뷰 존재). `PRIVATE` 가용성은 어떤 경우에도 외부에 노출되지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **다른 사용자의 프로필 / 매칭·이벤트 제안 흐름에서 "가용 시간 보기"** — 본 유닛 코드 범위에는 명시적 진입 화면이 없다. `availability_api.dart`에 `getPublicAvailabilities`, `getFriendsAvailabilities` 메서드가 정의되어 있고, `availability_repository.dart`에 동일 메서드가 래핑되어 있다. 호출 책임은 **타 도메인(이벤트 제안 폼, 데이팅 만남 일정 조율 등)**에 있다.
- 즉 본 유닛 입장에서는 "데이터 소스/Provider 미연결" 상태 — 호출자 도메인이 자체 화면에서 Repository를 주입받아 사용해야 한다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/10_calendar/F10-05_other-user-availability/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/10_calendar/F10-05_other-user-availability/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/10_calendar/F10-05_other-user-availability/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/10_calendar/F10-05_other-user-availability/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/calendar/controller/UserAvailabilityController.java:27` | 확인됨 |
| `community_api/src/main/java/com/endside/community/calendar/controller/UserAvailabilityController.java:42` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

본 유닛에는 호출용 전용 Notifier가 정의되어 있지 않다. 타 도메인이 다음 패턴으로 사용해야 한다:

1. 호출자 화면이 `ref.read(availabilityRepositoryProvider)` 획득.
2. `repo.getPublicAvailabilities(targetUserId, "YYYY-MM-DD", "YYYY-MM-DD")` 호출 → `AvailabilityApi.getPublicAvailabilities` → `GET /api/v1/users/{userId}/availabilities/public`.
3. 또는 `repo.getFriendsAvailabilities(targetUserId, from, to)` → `GET /api/v1/users/{userId}/availabilities/friends`.
4. `Result<AvailabilitySimpleVo>`를 받아 `items: List<AvailabilityVo>`를 화면에 매핑.
5. `AvailabilityVo`의 `id`는 호출자 도메인에서 그대로 노출되며, `userId`는 대상자, `visibility` 필드는 응답에 포함됨(PUBLIC만 노출).

## 4. 서버 계약

### 개요

다른 사용자가 공개해 둔 가용 시간을 조회해 "그 시간에 이벤트를 제안하거나 만남을 잡을 수 있는지" 사전 확인하는 읽기 전용 API다. 두 가지 공개 범위가 있다. `public`은 비로그인 진입도 가능한 단순 공개 슬롯, `friends`는 호출자가 대상의 친구일 때만 응답한다(친구 정의는 같은 이벤트에 ATTENDING으로 함께 참석한 이력 또는 상호 리뷰 존재). `PRIVATE` 가용성은 어떤 경우에도 외부에 노출되지 않는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/users/{userId}/availabilities/public | `UserAvailabilityController#getPublicAvailabilities` | optional | 대상 userId의 PUBLIC 가용성 (기간 내) |
| GET | /api/v1/users/{userId}/availabilities/friends | `UserAvailabilityController#getFriendsAvailabilities` | required | 대상 userId의 FRIENDS 가용성 (요청자가 친구인 경우만) |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `Visibility` (3값: `PUBLIC, FRIENDS, PRIVATE`).
- **VO** `AvailabilitySimpleVo` (items + totalCount + from + to).
- **친구 정의** (코드상 운영 정의):
  - 같은 이벤트에 둘 다 `AttendanceStatus.ATTENDING`으로 참석한 이력 있음 (Unit `capacity` 도메인의 `EventAttendance`).
  - 또는 양방향 리뷰가 모두 deletedAt=null로 존재 (`Review` 엔티티, Unit 11/12 review 도메인).
- **PRIVATE**는 어떤 외부 API에서도 응답에 포함되지 않는다 — 본인의 `GET /api/v1/availability` (F10-03)에서만 본인이 조회 가능.

### 의존 단위 / 외부 시스템

- **Unit `capacity`**: `EventAttendanceRepository#findByUserIdAndStatus`, `findByUserIdAndEventIdIn` 호출 (친구 검증).
- **Unit `review`**: `ReviewRepository#findByRevieweeId` 호출 (상호 리뷰 검증).
- **자기 도메인**: `AvailabilityRepository.findByUserIdAndVisibilityAndStartTimeBetween`.
- 외부 시스템(PG/FCM/S3/소셜) 호출 없음.

## 5. 프론트 계약

### 진입 경로

- **다른 사용자의 프로필 / 매칭·이벤트 제안 흐름에서 "가용 시간 보기"** — 본 유닛 코드 범위에는 명시적 진입 화면이 없다. `availability_api.dart`에 `getPublicAvailabilities`, `getFriendsAvailabilities` 메서드가 정의되어 있고, `availability_repository.dart`에 동일 메서드가 래핑되어 있다. 호출 책임은 **타 도메인(이벤트 제안 폼, 데이팅 만남 일정 조율 등)**에 있다.
- 즉 본 유닛 입장에서는 "데이터 소스/Provider 미연결" 상태 — 호출자 도메인이 자체 화면에서 Repository를 주입받아 사용해야 한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| (현재 캘린더 도메인 내 별도 라우트 없음) | — | 본 유닛 책임은 데이터 소스(Repository) 제공만 |
| (타 도메인 화면이 직접 사용) | `availability_repository.dart` 호출 | 이벤트 제안 / 만남 조율 폼에서 활용 가능 |

### 화면별 구성 요소 & 액션

### 본 유닛 범위 외 — 호출 흐름 정의만
- **사용자가 보는 것 (예시)**: 다른 사용자의 프로필 또는 이벤트 제안 폼에서 일정 캘린더/타임라인 위에 상대방의 PUBLIC 가용 슬롯이 초록 블록 등으로 표시. 호출자 도메인이 디자인을 결정.
- **사용자가 할 수 있는 액션 (예시)**:
  - 기간 선택(폼 상의 from/to) ▶ `availabilityRepository.getPublicAvailabilities(userId, fromStr, toStr)`.
  - 친구 한정 캘린더 보기 ▶ `getFriendsAvailabilities(userId, fromStr, toStr)`.
  - 슬롯 선택 ▶ 호출자 도메인의 폼 input(예: 이벤트 후보 시간)에 반영.
- **상태 분기**:
  - 200 빈 배열 ▶ "공개된 가용 시간이 없습니다" 빈 상태(호출자 책임).
  - 401 ▶ AuthInterceptor가 일반적인 토큰 갱신 경로 처리.
  - 403 `NOT_FRIENDS` ▶ "친구 관계가 아닐 때 가용성을 볼 수 없습니다" 안내(호출자 책임).
  - 400 `INVALID_REQUEST` (자기 자신 조회) ▶ 호출자 화면에서 본인 표시 자체를 막아야 함(예방 책임).
- **모달/시트/네비게이션**: 본 유닛 결정 사항 없음.

### API 호출 순서 (Provider/Repository 관점)

본 유닛에는 호출용 전용 Notifier가 정의되어 있지 않다. 타 도메인이 다음 패턴으로 사용해야 한다:

1. 호출자 화면이 `ref.read(availabilityRepositoryProvider)` 획득.
2. `repo.getPublicAvailabilities(targetUserId, "YYYY-MM-DD", "YYYY-MM-DD")` 호출 → `AvailabilityApi.getPublicAvailabilities` → `GET /api/v1/users/{userId}/availabilities/public`.
3. 또는 `repo.getFriendsAvailabilities(targetUserId, from, to)` → `GET /api/v1/users/{userId}/availabilities/friends`.
4. `Result<AvailabilitySimpleVo>`를 받아 `items: List<AvailabilityVo>`를 화면에 매핑.
5. `AvailabilityVo`의 `id`는 호출자 도메인에서 그대로 노출되며, `userId`는 대상자, `visibility` 필드는 응답에 포함됨(PUBLIC만 노출).

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **호출 진입점**: 어떤 화면에서 어떤 사용자 행동을 트리거로 호출할지는 호출자 도메인의 결정. 캘린더 자체 UI에는 본 기능 진입점이 없다.
- **표시 형태**: 캘린더 타임라인, 시간대 칩, 슬롯 그리드 등 어떤 UI로 보여줄지는 호출자 결정.
- **빈 상태 / 권한 거부 안내 문구**:
  - 호출자가 적절한 메시지를 결정. 본 유닛에서 권장 문구 없음.
  - 친구 거부(403): 호출자가 "이 사용자의 가용 시간은 친구만 볼 수 있어요" 등 안내.
  - 빈 결과(200, items=0): "이 기간에 공개된 가용 시간이 없습니다" 등.
- **기간 선택 UI**: from/to를 어떻게 입력받을지(주간 토글, 캘린더 위 드래그, 단순 DatePicker)는 호출자 설계.
- **호출 빈도 / 캐시 정책**: 본 유닛 범위 외. 호출자가 Riverpod family 단위로 결정.
- **PRIVATE 슬롯의 비노출**: 백엔드 측 정책으로 응답에서 자동 제외. 호출자는 별도 처리 불필요.
- **`from`/`to` 형식**: `LocalDate` (`YYYY-MM-DD`). `LocalDateTime`이 아님 — 호출자가 시간까지 지정하지 않도록 주의.
- **최대 조회 범위**: 서버에 명시적 제한 없음. 호출자가 합리적 범위(예: 4주)로 제한 권장.
- **친구 정의가 사용자에게 직접 보이지 않음**: 사용자는 "친구"가 무엇인지(같은 이벤트 참석 또는 상호 리뷰) 모를 수 있다. 호출자 화면에서 컨텍스트 안내가 필요할 수 있음.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 이벤트 제안 폼에서 상대방 공개 가용 시간 확인 | A가 이벤트 제안 폼 화면에 진입. | A가 B의 공개 슬롯에 맞춰 이벤트 시간을 채움. 본 유닛 자체 상태 변화는 없음. |
| S2 | 비로그인 사용자가 공개 가용성 조회 | 비로그인(또는 익명) 호출. | 공개 정보만 노출. PRIVATE/FRIENDS 슬롯은 절대 포함되지 않음. |
| S3 | 친구 가용성 조회 — 친구 관계 인정 | A가 B에게 만남 제안. 둘은 과거 이벤트 #100에 함께 ATTENDING으로 참석한 이력이 있음. | A가 B의 친구 가용 슬롯을 확인. |
| S4 | 친구 가용성 조회 — 친구 거부 (NOT_FRIENDS) | A가 처음 보는 사용자 C의 친구 가용성을 시도. | 응답 거부, 데이터 노출 없음. |
| S5 | 친구 가용성 조회 — 자기 자신 시도 | 사용자 A가 본인의 friends 가용성을 호출(버그 또는 디버그). | 거부. |
| S6 | 상호 리뷰 기반 친구 | A와 B는 이벤트 참석 이력은 없으나, 어떤 다른 컨텍스트에서 서로 리뷰를 작성함. | 친구로 간주됨. (소프트 정의이므로, 정의 변경 시 정책 영향 큼.) |
| S7 | 빈 결과 (대상 사용자가 가용성 등록 안 함) | 사용자 D는 가용성을 한 번도 등록하지 않음. | 정상 응답, 데이터 없음. |
| S8 | 존재하지 않는 userId 조회 | 잘못된 userId(예: 999999)로 호출. | 호출자 입장에서는 빈 결과로만 보임. (운영 관점에서는 서비스 정책에 따라 별도 검증 추가 고려 가능.) |

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
| 후보 | backend.md:31 | - **에러 분기**: 별도 도메인 에러 없음. 결과가 없으면 빈 리스트, 잘못된 LocalDate 포맷은 400. 대상 userId가 존재하지 않더라도 200 + 빈 결과가 반환된다(존재 검증 없음). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:47 | - **`from`/`to` 형식**: `LocalDate` (`YYYY-MM-DD`). `LocalDateTime`이 아님 — 호출자가 시간까지 지정하지 않도록 주의. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 이벤트 제안 폼에서 상대방 공개 가용 시간 확인**: Given A가 이벤트 제안 폼 화면에 진입. When 사용자가 해당 흐름을 실행하면 Then A가 B의 공개 슬롯에 맞춰 이벤트 시간을 채움. 본 유닛 자체 상태 변화는 없음.
- **AC-02. 비로그인 사용자가 공개 가용성 조회**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 공개 정보만 노출. PRIVATE/FRIENDS 슬롯은 절대 포함되지 않음.
- **AC-03. 친구 가용성 조회 — 친구 관계 인정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then A가 B의 친구 가용 슬롯을 확인.
- **AC-04. 친구 가용성 조회 — 친구 거부 (NOT_FRIENDS)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 응답 거부, 데이터 노출 없음.
- **AC-05. 친구 가용성 조회 — 자기 자신 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 거부.
- **AC-06. 상호 리뷰 기반 친구**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 친구로 간주됨. (소프트 정의이므로, 정의 변경 시 정책 영향 큼.)
- **AC-07. 빈 결과 (대상 사용자가 가용성 등록 안 함)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 정상 응답, 데이터 없음.
- **AC-08. 존재하지 않는 userId 조회**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 호출자 입장에서는 빈 결과로만 보임. (운영 관점에서는 서비스 정책에 따라 별도 검증 추가 고려 가능.)

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
