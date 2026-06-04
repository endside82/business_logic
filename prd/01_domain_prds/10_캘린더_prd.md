# 10. 캘린더 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/10_calendar -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/10_calendar/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

캘린더는 사용자가 자신이 주최/참석하는 이벤트, 등록한 가용 시간(availability), 데이팅 만남(소개팅) 일정을 단일 시간 축 위에서 통합 조회·편집할 수 있도록 제공하는 도메인이다. 핵심 비즈니스 가치는 두 갈래다. 첫째, 흩어져 있는 모임/만남 일정을 월·일 단위로 모아 보여주는 "통합 캘린더 뷰"이고, 둘째, 본인이 비어 있는 시간대를 미리 등록해 두면 다른 사용자가 그 시간을 보고 이벤트를 제안할 수 있게 하는 "가용 시간(Availability) 공유" 기능이다.

이 도메인은 기능 PRD 5개로 구성된다. 현재 기능별 trace source는 총 15개이고, risk 후보는 총 22개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F10-01 | F10-01. 월간/일간 통합 캘린더 조회 | [F10-01_unified-calendar-view_prd.md](../02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | [F10-01_unified-calendar-view](../../units/10_calendar/F10-01_unified-calendar-view) | 전환 완료 | 3 | 1 |
| F10-02 | F10-02. 일정 항목 라우팅 | [F10-02_calendar-item-routing_prd.md](../02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | [F10-02_calendar-item-routing](../../units/10_calendar/F10-02_calendar-item-routing) | 전환 완료 | 0 | 8 |
| F10-03 | F10-03. 단일 가용 시간 등록·수정·삭제 | [F10-03_single-availability-crud_prd.md](../02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | [F10-03_single-availability-crud](../../units/10_calendar/F10-03_single-availability-crud) | 전환 완료 | 5 | 3 |
| F10-04 | F10-04. 반복 가용 시간 규칙 관리 | [F10-04_recurring-availability-rule_prd.md](../02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | [F10-04_recurring-availability-rule](../../units/10_calendar/F10-04_recurring-availability-rule) | 전환 완료 | 5 | 8 |
| F10-05 | F10-05. 타 사용자 가용성 공개 조회 | [F10-05_other-user-availability_prd.md](../02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | [F10-05_other-user-availability](../../units/10_calendar/F10-05_other-user-availability) | 전환 완료 | 2 | 2 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F10-02](../02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | F10-02. 일정 항목 라우팅 | Risk 후보 8, trace 없음 |
| [F10-04](../02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | F10-04. 반복 가용 시간 규칙 관리 | Risk 후보 8 |
| [F10-03](../02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | F10-03. 단일 가용 시간 등록·수정·삭제 | Risk 후보 3 |
| [F10-05](../02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | F10-05. 타 사용자 가용성 공개 조회 | Risk 후보 2 |
| [F10-01](../02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | F10-01. 월간/일간 통합 캘린더 조회 | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (5개)

| ID | 기능명 | 한 줄 설명 | 주요 사용자 액션 |
|----|---|---|---|
| F10-01 | 월간/일간 통합 캘린더 조회 | 본인의 이벤트(주최/참석) + 가용성 + 데이팅 만남을 월/일/임의 기간 단위로 합산해 단일 타임라인으로 보여준다 | 캘린더 탭 진입, 월/일 전환, "오늘" 탭, 좌/우 스와이프 |
| F10-02 | 일정 항목 라우팅 | 캘린더 위 각 일정 블록을 itemType별로 이벤트 상세 / 가용성 편집 / 만남 상세로 라우팅한다 | 이벤트·가용성·만남 블록 탭, 월간 뷰 일자 셀 탭 |
| F10-03 | 단일 가용 시간 등록·수정·삭제 | 특정 날짜의 시작·종료 시간과 공개 범위를 지정해 가용 시간을 CRUD하며, 삭제 시 충돌 이벤트 수를 확인한 뒤 강제 삭제 여부를 결정한다 | "+" 버튼 / 가용성 블록 탭 / FAB 탭, 저장, 삭제(force 재시도) |
| F10-04 | 반복 가용 시간 규칙 관리 | 매주/격주/매월 주기·요일·시간대·기간을 묶어 반복 가용성 규칙을 생성·수정·삭제하고 펼친 인스턴스를 미리 본다 | 반복 토글 ON, 주기/요일 선택, "미리보기", "저장", 규칙 삭제 |
| F10-05 | 타 사용자 가용성 공개 조회 | 다른 사용자의 공개(public) 또는 친구(friends) 범위 가용성을 조회해 이벤트 제안 타이밍을 잡는 데 활용한다 | 사용자 프로필에서 "가용 시간 보기" 진입, 기간 지정 |

## 5. 상태/권한/의존성

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 6. 화면/API 매핑

### 기능별 상세

### F10-01 월간/일간 통합 캘린더 조회
- **사용자 가치**: 모임/소개팅/내 가용 시간을 앱 어디에 들어가지 않고도 한 화면에서 시간 축 기준으로 비교·계획할 수 있다.
- **주요 화면**: `SCR-CA-001 월간 캘린더`(6주×7일 그리드 + itemType별 점 마커 + "오늘" 버튼), `SCR-CA-002 일간 캘린더`(시간대 타임라인 + 이벤트/가용성/만남 블록).
- **백엔드 엔드포인트**:
  - `GET /api/v1/calendar/monthly?year=&month=` → `List<CalendarEventVo>`
  - `GET /api/v1/calendar/daily?date=` → `List<CalendarEventVo>`
  - `GET /api/v1/calendar/range?from=&to=` → `List<CalendarEventVo>` (임의 기간, 위젯·통계용)
- **선결 조건/상태**: 인증 필수(`@AuthenticationPrincipal`). 월간/일간 응답은 본인 기준의 이벤트(HOSTING/ATTENDING) + 가용성(AVAILABILITY) + 데이팅 만남(HOSTING_PRIVATE) 합집합.
- **결과 상태 변화**: 프론트가 `monthlyCalendarNotifierProvider(year, month)` / `dailyCalendarNotifierProvider(date)`로 캐시. 좌/우 네비게이션 시 새로운 (year, month) 또는 date로 재호출. "오늘" 버튼은 현재 시각 기준 (year, month) / date로 점프하고 selectedDate를 갱신.

### F10-02 일정 항목 라우팅
- **사용자 가치**: 캘린더에서 본 항목을 한 번의 탭으로 해당 도메인의 깊은 흐름(이벤트 상세, 가용성 편집, 만남 상세)으로 자연스럽게 잇는다.
- **주요 화면**:
  - 월간 뷰 일자 셀 탭 → `SCR-CA-002 일간 캘린더` (해당 날짜)
  - 일간 뷰 이벤트 블록(`itemType IN {HOSTING, ATTENDING}`) 탭 → 이벤트 상세 (`/home/events/{referenceId}`)
  - 일간 뷰 가용성 블록(`itemType = AVAILABILITY`) 탭 → `SCR-CA-003 가용성 관리` 편집 모드 (`?id={referenceId}`)
  - 일간 뷰 만남 블록(`itemType = HOSTING_PRIVATE`) 탭 → 데이팅 만남 상세 화면 (UI 스펙: SCR-PD-006)
- **백엔드 엔드포인트**: 진입 자체는 라우팅이며, 상세 데이터 로드는 각 도메인 유닛(이벤트/만남)의 책임. 가용성 편집은 F10-03이 담당.
- **선결 조건/상태**: 캘린더 응답 항목에 `referenceId`가 존재해야 라우팅 가능(없으면 무시). itemType은 서버 정의된 4종 외 값이 들어오면 회색 fallback으로 표시.
- **결과 상태 변화**: 라우터 스택에 상세 화면 push, 캘린더 화면 자체 상태(year/month/selectedDate)는 그대로 보존되어 복귀 시 동일 위치 유지.

### F10-03 단일 가용 시간 등록·수정·삭제
- **사용자 가치**: 비어 있는 시간 슬롯을 일·시 단위로 명확하게 등록해 두어 본인 일정 관리는 물론, 공개로 설정한 시간에는 다른 사용자가 이벤트를 제안할 수 있도록 한다.
- **주요 화면**: `SCR-CA-003 가용성 관리` (제목·날짜·시작/종료 시간·공개 토글 + 편집 모드의 "삭제" 액션 + 충돌 경고 배너).
- **백엔드 엔드포인트**:
  - `POST /api/v1/availability` — 단일 가용성 생성 (`AvailabilityParam: title, startTime, endTime, timezone, visibility` → `AvailabilityVo` 201)
  - `GET /api/v1/availability` — 본인 가용성 목록 (`from, to, includeRecurring`) → `AvailabilitySimpleVo`
  - `GET /api/v1/availability/{id}` — 단일 조회
  - `PATCH /api/v1/availability/{id}` — 단일 수정 (동일 `AvailabilityParam`)
  - `DELETE /api/v1/availability/{id}?force={bool}` — 삭제. `AvailabilityDeleteCheckVo`(deleted, conflictingEventCount) 반환
- **선결 조건/상태**: 인증 필수. 시작·종료 시간 차이 최소 30분(프론트 검증). `from`/`to` 조회 파라미터는 `LocalDate`이며 서버에서 시작/종료 시각으로 확장. `includeRecurring=false`면 컨트롤러 측에서 반복 규칙 인스턴스를 제거해 응답.
- **결과 상태 변화**:
  - 생성 성공 → "가용 시간이 등록되었습니다" 토스트 후 캘린더 복귀, 해당 일자 마커/블록에 즉시 반영.
  - 수정 성공 → "가용 시간이 수정되었습니다" 토스트.
  - 삭제: `force=false` 1차 호출 결과 `deleted=true`면 즉시 종료, `deleted=false` + `conflictingEventCount > 0`이면 충돌 다이얼로그를 띄워 사용자 확인 후 `force=true`로 재호출. 최종 성공 시 토스트 후 복귀.
  - 시간 충돌(서버 OVERLAP 메시지 포함 400) 발생 시 "선택한 시간이 기존 가용 시간과 겹칩니다" 경고 배너 표시.

### F10-04 반복 가용 시간 규칙 관리
- **사용자 가치**: "매주 평일 점심", "격주 토요일 오전"처럼 반복되는 가용 시간을 한 번의 규칙 설정으로 묶어 관리한다.
- **주요 화면**: `SCR-CA-004 반복 일정` (주기 SegmentedControl: 매주/격주/매월, 요일 ChipGroup, 시작·종료 시간, 시작일, 종료일/무기한 토글, 공개 토글, 미리보기 카운트, 저장/삭제).
- **백엔드 엔드포인트**:
  - `POST /api/v1/availability/recurring` — 반복 규칙 생성 (`RecurringParam: frequency, daysOfWeek[], startTime, endTime, timezone, effectiveFrom, effectiveUntil, visibility`) → `RecurrenceRuleVo` 201
  - `GET /api/v1/availability/recurring/{ruleId}` — 단일 규칙 조회 → `RecurrenceRuleVo`
  - `PATCH /api/v1/availability/recurring/{ruleId}` — 규칙 수정 (`RecurringParam`)
  - `DELETE /api/v1/availability/recurring/{ruleId}` — 규칙 전체 삭제 (현재 컨트롤러 시그니처에는 `scope` 파라미터 없음)
  - `GET /api/v1/availability/expand?ruleId=&from=&to=` — 규칙을 실제 날짜로 펼친 인스턴스 미리보기 (`ExpandedAvailabilityVo`)
- **선결 조건/상태**: 인증 필수. 요일 1개 이상 선택 필요(프론트 검증). 종료일 미설정 시 `effectiveUntil=null`로 무기한. 미리보기는 `ruleId`가 필요하므로 신규 생성 시점에는 프론트가 추정 카운트만 표시하고, 편집 모드에서만 실제 expand API 호출.
- **결과 상태 변화**: 생성 성공 → "반복 일정이 등록되었습니다" 토스트, 캘린더 월/일 뷰 응답에 펼쳐진 인스턴스가 `AVAILABILITY` 마커로 누적 반영. 수정 성공 → "반복 일정이 수정되었습니다". 삭제 성공 → "반복 일정이 삭제되었습니다" 후 복귀. (UI 스펙의 "이 일정만 / 이후 모든 일정 / 모든 반복 일정" scope 분기는 현재 백엔드 시그니처상 미지원 — 프론트도 단일 DELETE만 호출.)

### F10-05 타 사용자 가용성 공개 조회
- **사용자 가치**: 다른 사용자가 공개해 둔 가용 시간을 보고 이벤트나 만남을 자연스럽게 제안할 수 있다(소셜·매칭 기능의 사전 신호).
- **주요 화면**: 본 유닛 범위에서는 진입점만 정의(타 사용자 프로필 또는 데이팅·이벤트 제안 흐름에서 호출). 결과는 다른 도메인(이벤트 제안, 데이팅 만남 신청)에서 활용된다.
- **백엔드 엔드포인트**:
  - `GET /api/v1/users/{userId}/availabilities/public?from=&to=` → `AvailabilitySimpleVo` (비인증 진입 가능)
  - `GET /api/v1/users/{userId}/availabilities/friends?from=&to=` → `AvailabilitySimpleVo` (`@AuthenticationPrincipal` 필수, principal 본인을 기준으로 친구 관계 검증)
- **선결 조건/상태**: 대상 사용자가 가용성을 `PUBLIC` / 친구 공개로 설정해 두어야 응답에 포함. friends API는 호출자(principal)와 대상(userId) 사이의 친구 관계 충족 시에만 응답 데이터가 제공됨.
- **결과 상태 변화**: 응답을 호출 도메인(이벤트 제안 폼, 데이팅 만남 일정 조율 등)에 그대로 전달. 캘린더 도메인 자체 상태는 변경되지 않는다(읽기 전용 조회).

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F10-02](../02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | F10-02. 일정 항목 라우팅 | 8 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F10-04](../02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | F10-04. 반복 가용 시간 규칙 관리 | 8 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F10-03](../02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | F10-03. 단일 가용 시간 등록·수정·삭제 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F10-05](../02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | F10-05. 타 사용자 가용성 공개 조회 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F10-01](../02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | F10-01. 월간/일간 통합 캘린더 조회 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
