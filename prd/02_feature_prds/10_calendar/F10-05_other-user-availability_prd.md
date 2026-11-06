# F10-05. 타 사용자 가용성 공개 조회 PRD

> **현재 상태: 설계 철회·제품에서 제외.** 개인 가용시간은 본인만 관리하며 타인에게 공개 조회하는 기능은 제공하지 않습니다.
> 아래 설계·계약은 철회 전 기록입니다. 현재 구현이나 남은 개발 요구사항으로 사용하지 않습니다.
> [타 사용자 가용시간 조회의 철회 안내](../../../docs/features/F10-05.html#retired-status)를 따릅니다.

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

다른 사용자가 공개해 둔 가용 시간을 조회해 "그 시간에 이벤트를 제안하거나 만남을 잡을 수 있는지" 사전 확인하는 읽기 전용 API다. 두 가지 공개 범위가 있다. `public`은 비로그인 진입도 가능한 단순 공개 슬롯, `friends`는 호출자가 대상의 친구일 때만 응답한다(친구 정의는 같은 이벤트에 ATTENDING으로 함께 참석한 이력 또는 상호 리뷰 존재). `PRIVATE` 가용성은 어떤 경우에도 외부에 노출되지 않는다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **다른 사용자의 프로필 / 매칭·이벤트 제안 흐름에서 "가용 시간 보기"** — 본 유닛 코드 범위에는 명시적 진입 화면이 없다. `availability_api.dart`에 `getPublicAvailabilities`, `getFriendsAvailabilities` 메서드가 정의되어 있고, `availability_repository.dart`에 동일 메서드가 래핑되어 있다. 호출 책임은 **타 도메인(이벤트 제안 폼, 데이팅 만남 일정 조율 등)**에 있다.
- 즉 본 유닛 입장에서는 "데이터 소스/Provider 미연결" 상태 — 호출자 도메인이 자체 화면에서 Repository를 주입받아 사용해야 한다.

## 2. 코드 위치

계약의 정본은 코드다. 앱: `availability_api.dart`, `availability_repository.dart`.

<!-- source-references:start -->
**설계 철회.** 타 사용자 가용시간 조회의 두 옛 기록은 삭제된 같은 파일을 가리킨다. 복구 대상이 아니며 현재 구현 근거에서 제외한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

본 유닛에는 호출용 전용 Notifier가 정의되어 있지 않다. 타 도메인이 다음 패턴으로 사용해야 한다:

1. 호출자 화면이 `ref.read(availabilityRepositoryProvider)` 획득.
2. `repo.getPublicAvailabilities(targetUserId, "YYYY-MM-DD", "YYYY-MM-DD")` 호출 → `AvailabilityApi.getPublicAvailabilities` → `GET /api/v1/users/{userId}/availabilities/public`.
3. 또는 `repo.getFriendsAvailabilities(targetUserId, from, to)` → `GET /api/v1/users/{userId}/availabilities/friends`.
4. `Result<AvailabilitySimpleVo>`를 받아 `items: List<AvailabilityVo>`를 화면에 매핑.
5. `AvailabilityVo`의 `id`는 호출자 도메인에서 그대로 노출되며, `userId`는 대상자, `visibility` 필드는 응답에 포함됨(PUBLIC만 노출).

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
