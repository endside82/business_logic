# F10-02. 일정 항목 라우팅 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/10_calendar/F10-02_calendar-item-routing -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/10_calendar/F10-02_calendar-item-routing`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

이 기능 자체는 "프론트가 사용자 탭 제스처를 받아 어떤 라우트로 push할지" 결정하는 라우팅 흐름이다. 따라서 신규 백엔드 엔드포인트는 없으며, F10-01이 반환한 `CalendarEventVo` 한 항목을 그대로 사용해 다음 화면이 호출할 도메인별 상세 API로 위임한다. 본 문서는 라우팅 결정에 사용되는 응답 필드(`itemType`, `referenceId`)와, 위임 대상 도메인의 상세 API 시그니처(요약)를 정리한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **월간 캘린더 일자 셀 탭** (마커가 있는/없는 모든 일자) → 일간 캘린더로 진입.
- **일간 캘린더 일정 블록 탭** → itemType별로 다른 도메인 화면으로 진입.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/10_calendar/F10-02_calendar-item-routing/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/10_calendar/F10-02_calendar-item-routing/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/10_calendar/F10-02_calendar-item-routing/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/10_calendar/F10-02_calendar-item-routing/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

> `backend.md`/`frontend.md`에 `<!-- traces: ... -->` 주석이 없다. 구현 작업 전 실제 Controller/API/Provider 파일을 직접 확인해야 한다.

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

이 기능은 **새 API 호출이 없다**. F10-01의 `CalendarEventVo` 응답에 이미 라우팅에 필요한 모든 정보(`referenceId`, `itemType`)가 포함되어 있다.

1. 사용자가 캘린더 진입 → F10-01의 GET이 한 번 호출되어 `CalendarEventVo[]` 캐시.
2. 사용자가 항목 탭 → 위 분기에 따라 라우터 push만 발생. 추가 GET 없음.
3. 위임된 화면(이벤트 상세 / 가용성 편집 / 만남 상세)이 push 후 자체 Provider로 상세 GET을 발사.

## 4. 서버 계약

### 개요

이 기능 자체는 "프론트가 사용자 탭 제스처를 받아 어떤 라우트로 push할지" 결정하는 라우팅 흐름이다. 따라서 신규 백엔드 엔드포인트는 없으며, F10-01이 반환한 `CalendarEventVo` 한 항목을 그대로 사용해 다음 화면이 호출할 도메인별 상세 API로 위임한다. 본 문서는 라우팅 결정에 사용되는 응답 필드(`itemType`, `referenceId`)와, 위임 대상 도메인의 상세 API 시그니처(요약)를 정리한다.

### 도메인 모델 / Enum (이 기능 관련)

- **`CalendarItemType` enum** (4값) — 라우팅 분기의 단일 진실 공급원.
- `CalendarEventVo.referenceId` (`Long?`) — 라우팅에 필수.

### 의존 단위 / 외부 시스템

- **Unit 03 이벤트**: 이벤트 상세 화면 + 상세 API.
- **Unit 09 프라이빗 데이팅**: 만남 상세 화면.
- **F10-03 (자기 유닛)**: 가용성 상세/편집/삭제.
- 외부 시스템(PG/FCM/S3/소셜) 호출 없음.

## 5. 프론트 계약

### 진입 경로

- **월간 캘린더 일자 셀 탭** (마커가 있는/없는 모든 일자) → 일간 캘린더로 진입.
- **일간 캘린더 일정 블록 탭** → itemType별로 다른 도메인 화면으로 진입.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 | 역할 |
|---|---|---|
| `/profile/calendar` | `monthly_calendar_screen.dart` | 라우팅의 시작점 — 일자 셀 탭 (`_onDateSelected`) |
| `/profile/calendar/day?date=YYYY-MM-DD` | `daily_calendar_screen.dart` | 블록 탭 시 `_onTap(event)` 분기 |
| `/home/events/{eventId}` | (이벤트 상세, Unit 03) | HOSTING / ATTENDING 위임 대상 |
| `/profile/calendar/availability?id={id}` | `availability_screen.dart` (F10-03) | AVAILABILITY 위임 대상 (편집 모드) |
| 데이팅 만남 상세 라우트 | (Unit 09) | HOSTING_PRIVATE 위임 대상 — 본 코드에는 라우팅 미구현 (TODO) |

### 화면별 구성 요소 & 액션

### 월간 → 일간 (`monthly_calendar_screen.dart`)
- **사용자가 보는 것**: 일자 셀에 마커 점이 있을 수도, 없을 수도. 셀 자체가 탭 가능 영역.
- **사용자가 할 수 있는 액션**:
  - 임의 일자 셀 탭 ▶ `_onDateSelected(DateTime date)` 실행:
    1. `setState(_selectedDate = date)` — 즉시 그리드 아래 카드 영역 갱신.
    2. `final dateStr = 'YYYY-MM-DD' (zero-padded)` 포맷팅.
    3. `context.push('/profile/calendar/day?date=$dateStr')` — 일간 화면 push.
- **상태 분기**: 별도 분기 없음. 현재 월 외 셀(빈 칸)은 `SizedBox(height: 48)`로 비활성.
- **모달/시트/네비게이션**: 푸시 only, 모달 사용 안 함.

### 일간 블록 탭 분기 (`daily_calendar_screen.dart` `_onTap`)
- **사용자가 보는 것**: 시간 타임라인 위 색상별 블록 (`HOSTING/ATTENDING`=파랑, `AVAILABILITY`=초록 30%, `HOSTING_PRIVATE`=핑크).
- **사용자가 할 수 있는 액션**:
  - 블록 탭 ▶ `_onTap(BuildContext, CalendarEventVo event)` 분기:
    - `itemType ∈ {HOSTING, ATTENDING}` 그리고 `referenceId != null` ▶ `context.push('/home/events/${event.referenceId}')`.
    - `itemType == 'AVAILABILITY'` 그리고 `referenceId != null` ▶ `context.push('/profile/calendar/availability?id=${event.referenceId}')`.
    - `itemType == 'HOSTING_PRIVATE'` ▶ 현재 코드상 별도 라우팅이 없음(주석 `// HOSTING_PRIVATE → dating detail (if needed)`). 사용자 입장에서는 탭이 무시됨. (UI/UX 스펙 SCR-PD-006 연동은 향후 작업.)
    - `referenceId == null` ▶ 분기 진입 자체가 차단되어 무시.
- **상태 분기**: 라우팅 자체는 동기 작업. 위임된 화면이 자체 로딩/에러 처리.
- **모달/시트/네비게이션**: 모두 `context.push` (스택 push). 일간 화면 자체는 그대로 보존되어 뒤로가기 시 동일 위치로 복귀.

### API 호출 순서 (Provider/Repository 관점)

이 기능은 **새 API 호출이 없다**. F10-01의 `CalendarEventVo` 응답에 이미 라우팅에 필요한 모든 정보(`referenceId`, `itemType`)가 포함되어 있다.

1. 사용자가 캘린더 진입 → F10-01의 GET이 한 번 호출되어 `CalendarEventVo[]` 캐시.
2. 사용자가 항목 탭 → 위 분기에 따라 라우터 push만 발생. 추가 GET 없음.
3. 위임된 화면(이벤트 상세 / 가용성 편집 / 만남 상세)이 push 후 자체 Provider로 상세 GET을 발사.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **라우팅 매핑 테이블**: 어떤 itemType이 어떤 라우트로 가는지는 프론트 결정. `_onTap` 함수 안에 하드코딩.
- **`referenceId == null` 무시 정책**: UI/UX 스펙에는 명시 없으나, 프론트가 안전하게 처리(탭 무시).
- **`HOSTING_PRIVATE` 미라우팅**: 백엔드는 분기 가능한 데이터를 주고 있으나, 프론트가 대응 화면을 아직 연결하지 않음. 사용자 입장에서는 탭이 무시되는 죽은 영역.
- **월간에서 일간으로 가는 `selectedDate` 보존**: 일자 탭 후 일간 화면 push, 뒤로가기로 돌아오면 selectedDate가 그대로 유지(state는 `_MonthlyCalendarScreenState`에 보관).
- **빈 일자도 일간 진입 가능**: 마커 없는 셀도 탭 가능, 빈 일정 화면이 보임 (FAB로 가용성 등록 자연 유도).
- **딥링크 매핑**: 푸시 알림 등에서 직접 일정 항목으로 들어오는 경로는 본 유닛 코드 범위 외. 알림 라우터의 별도 정책 책임.
- **무한스크롤/가로 스와이프 제스처**: 코드상 가로 스와이프 제스처 핸들러는 없음 (좌/우 화살표 버튼만). UI/UX 스펙의 "스와이프" 표현은 향후 구현 가능성으로 보류.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path) 캘린더에서 이벤트 상세로 1탭 진입 | 월간 캘린더 진입, 5/12 셀에 파란 점. | 사용자가 이벤트 상세에서 "참여자/체크인/공지" 등 후속 액션 가능. |
| S2 | 가용성 블록 탭 → 편집 모드 | 본인 가용성 #77 (5/12 09:00~12:00, PUBLIC). | 사용자가 가용성 편집 가능 (F10-03 흐름). |
| S3 | 참석 이벤트 탭 → 호스트 화면이 아닌 참석자 뷰 | 일반 사용자, 5/14에 신청 승인된 이벤트 #2222. | 동일 라우트지만 권한 컨텍스트에 따라 다른 화면 — 라우팅 측면에서는 HOSTING과 동일하게 처리. |
| S4 | (엣지) `referenceId == null`인 항목 | 데이터 결손으로 referenceId가 누락된 항목이 응답에 섞임. | 화면 변화 없음. (운영 관점에서는 referenceId 누락은 백엔드 버그로 분류해야 함.) |
| S5 | (엣지) `HOSTING_PRIVATE` 탭 | 월간 그리드에 핑크 점, 일간에 핑크 블록. | 화면 변화 없음. (Unit 09 만남 상세 화면 연결이 후속 과제.) |
| S6 | (네비게이션) 뒤로가기 시 selectedDate 보존 | 5/12 셀을 선택해 일간으로 진입, 다시 뒤로가기. | 컨텍스트가 끊기지 않고 자연스럽게 이어짐. |
| S7 | (네비게이션) 가용성 편집 후 뒤로가기 → 캘린더 자동 갱신 정책 | 사용자가 5/12 가용성 블록을 탭해 편집 화면으로 진입, 시간 수정 후 저장하고 뒤로 돌아옴. | 라우팅 자체는 정상이지만, 캐시 무효화 정책에 따라 즉시 일관된 표시는 보장되지 않음(개선 여지). 본 유닛에서는 라우팅만 책임. |

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
| 후보 | backend.md:30 | - 데이팅 만남 상세 — Unit 09 화면(SCR-PD-006)에서 정의되는 별도 API (본 유닛에서 시그니처 미확인) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:14 | \| 데이팅 만남 상세 라우트 \| (Unit 09) \| HOSTING_PRIVATE 위임 대상 — 본 코드에는 라우팅 미구현 (TODO) \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:34 | - `itemType == 'HOSTING_PRIVATE'` ▶ 현재 코드상 별도 라우팅이 없음(주석 `// HOSTING_PRIVATE → dating detail (if needed)`). 사용자 입장에서는 탭이 무시됨. (UI/UX 스펙 SCR-PD-006 연동은 향후 작업.) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:43 | 2. 코드상 주석으로 남겨진 TODO("HOSTING_PRIVATE → dating detail (if needed)")로 인해 아무 동작 없음. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:18 | D -->\|블록 탭<br/>itemType=HOSTING_PRIVATE\| TODO[🔴 미구현 - 탭 무시] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:24 | class TODO,IGN error | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:34 | B -->\|HOSTING_PRIVATE\| E[🔴 처리 없음<br/>TODO 주석] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:77 | \| HOSTING_PRIVATE \| — \| (현재 미구현) \| — \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. (Happy Path) 캘린더에서 이벤트 상세로 1탭 진입**: Given 월간 캘린더 진입, 5/12 셀에 파란 점. When 사용자가 해당 흐름을 실행하면 Then 사용자가 이벤트 상세에서 "참여자/체크인/공지" 등 후속 액션 가능.
- **AC-02. 가용성 블록 탭 → 편집 모드**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 가용성 편집 가능 (F10-03 흐름).
- **AC-03. 참석 이벤트 탭 → 호스트 화면이 아닌 참석자 뷰**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 동일 라우트지만 권한 컨텍스트에 따라 다른 화면 — 라우팅 측면에서는 HOSTING과 동일하게 처리.
- **AC-04. (엣지) `referenceId == null`인 항목**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 화면 변화 없음. (운영 관점에서는 referenceId 누락은 백엔드 버그로 분류해야 함.)
- **AC-05. (엣지) `HOSTING_PRIVATE` 탭**: Given 월간 그리드에 핑크 점, 일간에 핑크 블록. When 사용자가 해당 흐름을 실행하면 Then 화면 변화 없음. (Unit 09 만남 상세 화면 연결이 후속 과제.)
- **AC-06. (네비게이션) 뒤로가기 시 selectedDate 보존**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 컨텍스트가 끊기지 않고 자연스럽게 이어짐.
- **AC-07. (네비게이션) 가용성 편집 후 뒤로가기 → 캘린더 자동 갱신 정책**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 라우팅 자체는 정상이지만, 캐시 무효화 정책에 따라 즉시 일관된 표시는 보장되지 않음(개선 여지). 본 유닛에서는 라우팅만 책임.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
