# F10-03. 단일 가용 시간 등록·수정·삭제 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

사용자가 비어 있는 시간 슬롯을 명시적으로 등록(POST)하고, 잘못 등록한 슬롯을 수정(PATCH)하거나 삭제(DELETE)할 수 있게 하는 단일 가용성 CRUD다. 등록·수정 시 같은 사용자 내 시간 겹침을 서버에서 검증하고, 삭제 시 해당 슬롯과 시간이 겹치는 OPEN/DRAFT 이벤트가 있으면 1차 호출에서는 미삭제 + 충돌 카운트만 반환해 사용자에게 강제 삭제 여부를 묻도록 설계됐다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **월간 캘린더 우상단 `+` 아이콘 탭** → `/profile/calendar/availability` (신규 등록 모드, 날짜 = 오늘 기본).
- **일간 캘린더 FAB 탭** → `/profile/calendar/availability?date=YYYY-MM-DD` (해당 일자 사전 채움).
- **일간 캘린더 가용성 블록 탭** (F10-02 라우팅) → `/profile/calendar/availability?id={id}` (편집 모드).

## 2. 코드 위치

계약의 정본은 코드다. 서버: `AvailabilityController`, `Availability`. 앱: `availability_screen.dart`.

<!-- source-references:start -->
서버 창구: `AvailabilityController#createAvailability`, `AvailabilityController#getAvailabilities`, `AvailabilityController#getAvailability`, `AvailabilityController#updateAvailability`, `AvailabilityController#deleteAvailability`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **편집 모드 진입**:
   - `_loadExisting()` → `availabilityDetailNotifierProvider(id).future` → `AvailabilityRepository.getAvailability(id)` → `GET /api/v1/availability/{id}` → 폼 사전 채움.
2. **저장 (신규, 단일)**:
   - `availabilityDetailNotifierProvider(0).notifier.createAvailability(param)` → Repository → `POST /api/v1/availability`.
3. **저장 (편집)**:
   - `.notifier.updateAvailability(id, param)` → `PATCH /api/v1/availability/{id}`.
   - 성공 시 `state = AsyncData(data)`로 자체 갱신.
4. **삭제 (1차)**:
   - `.notifier.deleteAvailability(id, force: false)` → `DELETE /api/v1/availability/{id}?force=false`.
5. **삭제 (강제, 충돌 시)**:
   - `.notifier.deleteAvailability(id, force: true)` → `DELETE /api/v1/availability/{id}?force=true`.
6. **신규 + 반복 ON**:
   - F10-04의 `recurringRuleNotifierProvider.notifier.createRule(param)` → `POST /api/v1/availability/recurring`.

## 4. 제품 규칙

- 가용 시간(앱 문구는 「가능한 시간」)은 본인만 보고 관리하는 개인 기록이다. 공개 범위 선택은 없다.
- 등록과 수정은 다음을 지켜야 한다. 시작이 지금 이후이고(과거 시각 거절), 길이는 30분 이상 480분(8시간) 이하이며 30분 단위다. 시간대는 서울 기준이다. 내 다른 가용 시간과 겹치면 거절되고 앱은 겹침 경고를 폼에 보인다.
- 삭제할 때 같은 시간대에 내가 연 이벤트가 있으면(모집 중 또는 준비 중) 먼저 겹치는 건수를 알려 주고 확인을 다시 받는다. 확인하면 가용 시간만 지워지고 이벤트는 그대로다. 삭제 실패 때는 오류 안내가 뜬다.
- 등록 폼 기본값은 시작 09:00, 종료 10:00이고 날짜는 오늘부터 365일 안에서 고른다. 길이가 30분 미만이거나 끝이 시작보다 이르면 저장 버튼이 꺼진다(30분 단위와 480분 상한은 서버가 검증한다). 반복 설정은 새로 등록할 때만 켤 수 있고 이미 만든 단일 가용 시간을 반복으로 바꿀 수는 없다. 반복을 켜고 요일을 하나도 고르지 않으면 저장할 수 없다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 신규 가용 시간 단일 등록 | 일간 캘린더 5/12 진입, FAB 탭으로 가용성 화면 진입. | DB에 `availability` 1건 INSERT, `is_recurring=false`. 가용 시간은 본인만 보며 다른 사용자에게는 공개되지 않는다. |
| S2 | (엣지) 시간 겹침 — 충돌 경고 배너 | 동일 사용자, 이미 5/12 12:00~13:00 가용성을 등록한 상태. | 폼 그대로 유지, 사용자가 시간을 조정하면 배너는 다음 저장 시도 시 다시 평가. |
| S3 | (엣지) 30분 미만 시도 | 사용자가 14:00~14:15로 입력. | 서버 호출 발생하지 않음. 사용자가 시간을 조정해야 함. |
| S4 | (엣지) 과거 시각 시도 | 어제 날짜로 등록 시도. (DatePicker는 `firstDate=today`로 막혀 있어 정상 흐름에서는 발생 어려움.) | 등록 실패. (badRequest message가 OVERLAP을 포함하지 않으면 일반 토스트 처리.) |
| S5 | 단일 가용성 수정 | 본인 가용성 #77 (12:00~13:30)을 11:30~13:00으로 변경. | DB UPDATE. 다음에 캘린더가 새로 fetch되면 변경 사항 반영. |
| S6 | 삭제 — 충돌 없음 (Happy Path) | 본인 가용성 #77 삭제, 시간이 겹치는 OPEN/DRAFT 이벤트 없음. | DB 삭제. |
| S7 | 삭제 — 충돌 있음, 강제 삭제 흐름 | 본인 가용성 #77이 5/12 12:00~13:30, 동일 시간에 본인이 호스팅 중인 OPEN 이벤트 #500이 12:30~14:00으로 존재. | DB 삭제됨. 시간이 겹치던 이벤트 #500은 그대로 존재 (가용성과 이벤트는 별도 도메인). |
| S8 | (에러) 삭제 API 실패 | 네트워크 끊김 또는 5xx 응답. | 폼 유지, 사용자가 다시 시도 가능. |
| S9 | (권한) 다른 사람 가용성 직접 URL 입력 | 본인 토큰으로 다른 사용자의 availabilityId(예: 999)에 대한 편집 화면을 강제 진입 시도. | 사용자에게 보이는 메시지가 명확하지 않음. (운영 시 확인 필요.) |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 시험 보강 기록 | 가능 시간 등록·수정·삭제의 시험 보강 기록이다. 결함이 아니다 | 없음 |

## 9. 수용 기준

- **AC-01. (Happy Path) 신규 가용 시간 단일 등록**: Given 일간 캘린더 5/12 진입, FAB 탭으로 가용성 화면 진입. When 사용자가 해당 흐름을 실행하면 Then DB에 `availability` 1건 INSERT, `is_recurring=false`. 가용 시간은 본인만 보며 다른 사용자에게는 공개되지 않는다.
- **AC-02. (엣지) 시간 겹침 — 충돌 경고 배너**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 폼 그대로 유지, 사용자가 시간을 조정하면 배너는 다음 저장 시도 시 다시 평가.
- **AC-03. (엣지) 30분 미만 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 서버 호출 발생하지 않음. 사용자가 시간을 조정해야 함.
- **AC-04. (엣지) 과거 시각 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 등록 실패. (badRequest message가 OVERLAP을 포함하지 않으면 일반 토스트 처리.)
- **AC-05. 단일 가용성 수정**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB UPDATE. 다음에 캘린더가 새로 fetch되면 변경 사항 반영.
- **AC-06. 삭제 — 충돌 없음 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB 삭제.
- **AC-07. 삭제 — 충돌 있음, 강제 삭제 흐름**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then DB 삭제됨. 시간이 겹치던 이벤트 #500은 그대로 존재 (가용성과 이벤트는 별도 도메인).
- **AC-08. (에러) 삭제 API 실패**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 폼 유지, 사용자가 다시 시도 가능.
- **AC-09. (권한) 다른 사람 가용성 직접 URL 입력**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 보이는 메시지가 명확하지 않음. (운영 시 확인 필요.)
