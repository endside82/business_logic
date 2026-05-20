# F09-06. 만남 제안 & 안전 흐름 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/09_private_date/F09-06_meeting_proposal -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-06_meeting_proposal`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

매칭된 두 사용자가 오프라인으로 만나기 위한 일시·장소·메모를 제안·수락·거절·완료할 수 있게 한다. 제안은 row를 누적 INSERT (수정 대신 새 제안)로 처리하며, 상태는 `PROPOSED → CONFIRMED/CANCELLED → COMPLETED` 단순 흐름이다. 같은 매치에 여러 미팅이 누적되면 클라이언트가 "최신 활성"만 표시한다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **F09-05 채팅 화면 헤더 📅 액션** → `/dating/meeting/{matchId}?partnerName=...`
- 그 외 직접 진입 경로는 현 라우터에 없음 (단일 진입)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-06_meeting_proposal/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-06_meeting_proposal/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-06_meeting_proposal/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-06_meeting_proposal/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateMeetingController.java:28` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateMeetingController.java:36` | 확인됨 |
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateMeetingController.java:45` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 만남 제안 (`meeting_proposal_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('만남 제안')`
  - 진행 중 미팅 상태 카드 `_MeetingStatusCard` (조건부) — `dateMeetingsNotifierProvider(matchId)`에서 PROPOSED/CONFIRMED 중 가장 큰 id 선택. 색상 매핑:
    - PROPOSED → 노란 "응답 대기 중" + 24시간 안내문
    - CONFIRMED → 초록(`primary500`) "약속 확정" + 위치 공유 안내
    - CANCELLED → 회색 "취소됨"
    - COMPLETED → 회색 "완료"
    - null/empty → "상태 확인 중"
    - CONFIRMED 카드 안에 "위치 공유 안내" `OutlinedButton` (탭 시 `AppDialog.alert` "미팅 시작 1시간 전부터 종료까지 자동으로 위치가 공유됩니다.")
  - 상대 정보 카드 — 핑크 fallback 아바타 + "{partnerName}님과의 만남" + (정적 텍스트) "매칭한 지 3일"
  - 일시 입력 영역 — `📅` + "날짜와 시간을 선택하세요" / 선택된 값 (`{yyyy.MM.dd ({요일}) HH:mm}` 형식)
  - 장소 입력 — `📍` + `TextField` "만남 장소를 입력하세요"
  - 메모 (선택) — 4줄 내 `TextField` + `{n} / 200` 카운터
  - 하단 CTA "💕 만남 제안하기" (`datingPink` 버튼)
- **사용자가 할 수 있는 액션**:
  - 일시 영역 탭 ▶ `showDatePicker(initialDate=tomorrow, firstDate=now, lastDate=now+90일)` ▶ `showTimePicker(14:00 default)`
  - 장소·메모 입력
  - "만남 제안하기" 탭 ▶ `notifier.proposeMeeting(DateMeetingAddParam)` ▶ `POST /api/v1/date/meetings` ▶ 성공 토스트 "만남을 제안했습니다" + `Navigator.pop` (채팅으로 복귀)
- **상태 분기**:
  - 일시 미선택 → 토스트 "일시를 선택해주세요" (error)
  - 장소 비어있음 → 토스트 "장소를 입력해주세요" (error)
  - 제출 중 `_isSaving=true` → 버튼 라벨 "제안 중...", 비활성화

## 4. 서버 계약

### 개요

매칭된 두 사용자가 오프라인으로 만나기 위한 일시·장소·메모를 제안·수락·거절·완료할 수 있게 한다. 제안은 row를 누적 INSERT (수정 대신 새 제안)로 처리하며, 상태는 `PROPOSED → CONFIRMED/CANCELLED → COMPLETED` 단순 흐름이다. 같은 매치에 여러 미팅이 누적되면 클라이언트가 "최신 활성"만 표시한다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | /api/v1/date/meetings | DateMeetingController#proposeMeeting | required | 매치 참여자가 새 만남 제안 생성 |
| PATCH | /api/v1/date/meetings/{meetingId} | DateMeetingController#updateMeetingStatus | required | 상태 변경 (수락/거절/완료) |
| GET | /api/v1/date/meetings/match/{matchId} | DateMeetingController#getMeetings | required | 매치별 미팅 목록 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum `MeetingStatus`**: `PROPOSED, CONFIRMED, CANCELLED, COMPLETED` (4개. 스펙에 있는 `ACCEPTED/REJECTED`와 명칭 다름 — 스펙 vs 코드 불일치 주의)
- **Entity `DateMeeting`**: `id, matchId, proposedBy(userId), meetingDate, meetingTime, locationName?, locationAddress?, locationLat?, locationLng?, status(MeetingStatus), note?, createdAt, updatedAt`
- **VO `DateMeetingVo`**: 위 필드 그대로 String/날짜로 직렬화 (`status`는 enum name 문자열)

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-03/04** — `DateMatch.MATCHED` 상태가 전제
  - **F09-05** — 채팅 헤더 📅 액션이 본 화면 진입점
- 외부:
  - 없음 (체크인/SOS/긴급연락처는 의도적 미운영 — 이전 결정으로 삭제됨)

## 5. 프론트 계약

### 진입 경로

- **F09-05 채팅 화면 헤더 📅 액션** → `/dating/meeting/{matchId}?partnerName=...`
- 그 외 직접 진입 경로는 현 라우터에 없음 (단일 진입)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/dating/meeting/:matchId` (`Routes.datingMeetingProposal`) | `presentation/date/screens/meeting_proposal_screen.dart` | 진행 중 미팅 상태 카드 + 신규 제안 폼 |

쿼리: `partnerName` (URL 인코딩, optional).

### 화면별 구성 요소 & 액션

### 만남 제안 (`meeting_proposal_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('만남 제안')`
  - 진행 중 미팅 상태 카드 `_MeetingStatusCard` (조건부) — `dateMeetingsNotifierProvider(matchId)`에서 PROPOSED/CONFIRMED 중 가장 큰 id 선택. 색상 매핑:
    - PROPOSED → 노란 "응답 대기 중" + 24시간 안내문
    - CONFIRMED → 초록(`primary500`) "약속 확정" + 위치 공유 안내
    - CANCELLED → 회색 "취소됨"
    - COMPLETED → 회색 "완료"
    - null/empty → "상태 확인 중"
    - CONFIRMED 카드 안에 "위치 공유 안내" `OutlinedButton` (탭 시 `AppDialog.alert` "미팅 시작 1시간 전부터 종료까지 자동으로 위치가 공유됩니다.")
  - 상대 정보 카드 — 핑크 fallback 아바타 + "{partnerName}님과의 만남" + (정적 텍스트) "매칭한 지 3일"
  - 일시 입력 영역 — `📅` + "날짜와 시간을 선택하세요" / 선택된 값 (`{yyyy.MM.dd ({요일}) HH:mm}` 형식)
  - 장소 입력 — `📍` + `TextField` "만남 장소를 입력하세요"
  - 메모 (선택) — 4줄 내 `TextField` + `{n} / 200` 카운터
  - 하단 CTA "💕 만남 제안하기" (`datingPink` 버튼)
- **사용자가 할 수 있는 액션**:
  - 일시 영역 탭 ▶ `showDatePicker(initialDate=tomorrow, firstDate=now, lastDate=now+90일)` ▶ `showTimePicker(14:00 default)`
  - 장소·메모 입력
  - "만남 제안하기" 탭 ▶ `notifier.proposeMeeting(DateMeetingAddParam)` ▶ `POST /api/v1/date/meetings` ▶ 성공 토스트 "만남을 제안했습니다" + `Navigator.pop` (채팅으로 복귀)
- **상태 분기**:
  - 일시 미선택 → 토스트 "일시를 선택해주세요" (error)
  - 장소 비어있음 → 토스트 "장소를 입력해주세요" (error)
  - 제출 중 `_isSaving=true` → 버튼 라벨 "제안 중...", 비활성화

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **"진행 중 미팅" 정의**: 클라이언트가 응답 리스트에서 status가 `PROPOSED` 또는 `CONFIRMED`인 row 중 `id` 최대값(가장 최신) 선택 — 서버는 row를 누적 INSERT만 하므로 클라이언트가 활성 미팅 결정 책임 (`_findLatestActiveMeeting`)
- **DateTimePicker 범위**: `firstDate=now`, `lastDate=now+90일`, 기본 시간 `14:00`
- **일시 표시 형식**: `2026.05.10 (수) 14:00` — 한국식, 요일 약어
- **메모 카운터**: `{length} / 200`, 11pt 회색
- **상태 카드 색상 매핑** (서버 enum `MeetingStatus` → UI):
  - PROPOSED → `warning500`
  - CONFIRMED → `primary500`
  - CANCELLED → `gray500`
  - COMPLETED → `gray600`
  - null/unknown → `gray500` "상태 확인 중"
- **위치 공유 정책**: 현 화면은 "안내만" — 실제 위치 공유 라우트는 미구현 (G-01 BE 의존). `AppDialog.alert`로 정적 안내만 노출
- **Param 직렬화**: `meetingDate = "yyyy-MM-dd"`, `meetingTime = "HH:mm:ss"` (LocalDate/LocalTime 호환)
- **빈 메모 처리**: `text.trim().isNotEmpty ? trim() : null`로 변환 후 송신
- **의도적 미운영 기능 (이전 결정으로 삭제됨)**:
  - 체크인/SOS/긴급연락처는 **의도적 미운영** 상태 — 이전 제품 결정으로 서버·클라이언트 양측에서 삭제되었다. 화면에 별도 진입점 없으며, 안전 흐름은 위치 공유 안내 메시지로만 시각화한다. 향후 재도입 시 별도 작업으로 다룬다.
- **TestId**: `screenDatingMeeting`
- **상태 변경 UI 부재**: 수락/거절/완료 버튼이 화면에 없음 — 향후 매치 단건 화면이나 알림에서 별도 처리 필요. 서버 PATCH는 존재하지만 호출 지점 미구현.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 만남 제안 → 수락 (Happy Path) | `DateMatch.MATCHED`, 진행 중 미팅 없음. | 미팅 CONFIRMED. 만남 당일 양 사용자 위치 공유 안내(현 구현은 텍스트만). |
| S2 | 일시 미선택 / 장소 미입력 검증 | 시나리오 본문 참조 | 송신 차단. |
| S3 | 다른 매치의 미팅을 조작 시도 (권한) | 시나리오 본문 참조 | 무변동. |
| S4 | BLOCKED/EXPIRED 매치에서 제안 시도 | 차단(F09-07)으로 매치 status=BLOCKED 또는 7일 만료로 EXPIRED. | 미팅 미생성. |
| S5 | 같은 매치에 새 제안 누적 | 1차 PROPOSED 미팅 존재 → 상대가 응답 안함. 사용자가 새 제안. | DB에 미팅 row 다수, 클라이언트는 최신만 표시. |
| S6 | CONFIRMED 후 위치 공유 (현 구현 한계) | 시나리오 본문 참조 | 사용자에게 정책 인지만. |
| S7 | SOS / 체크인 (의도적 미운영) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 차단 발동 → 미팅 흐름 중단 | 시나리오 본문 참조 | 미팅은 사실상 중단. 기존 row는 보존(분쟁 시 기록 용도). |
| S9 | 신고 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 일시 표기 형식과 시간대 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:82 | - **Enum `MeetingStatus`**: `PROPOSED, CONFIRMED, CANCELLED, COMPLETED` (4개. 스펙에 있는 `ACCEPTED/REJECTED`와 명칭 다름 — 스펙 vs 코드 불일치 주의) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:47 | 3. (후속) 상대 사용자가 수락/거절은 별도 흐름. 현 화면에서 PATCH 호출은 미구현 — 상태 변경 UI 별도 (스펙은 수신자에게 카드 + 수락/거절 버튼 — 본 코드에는 미연결) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:61 | - **위치 공유 정책**: 현 화면은 "안내만" — 실제 위치 공유 라우트는 미구현 (G-01 BE 의존). `AppDialog.alert`로 정적 안내만 노출 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:67 | - **상태 변경 UI 부재**: 수락/거절/완료 버튼이 화면에 없음 — 향후 매치 단건 화면이나 알림에서 별도 처리 필요. 서버 PATCH는 존재하지만 호출 지점 미구현. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:14 | 7. B가 수락 의사 표명 → 어떤 UI(현 화면 미구현)에서 `PATCH /api/v1/date/meetings/{meetingId} {status:'CONFIRMED'}` 호출 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:62 | 3. 실제 위치 공유 자체는 미구현 (G-01 BE 의존) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:36 | participant SB as 🔵 (수신자 UI 미구현) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:51 | Note over B: B는 별도 채널/푸시(미구현)로 인지 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 만남 제안 → 수락 (Happy Path)**: Given `DateMatch.MATCHED`, 진행 중 미팅 없음. When 사용자가 해당 흐름을 실행하면 Then 미팅 CONFIRMED. 만남 당일 양 사용자 위치 공유 안내(현 구현은 텍스트만).
- **AC-02. 일시 미선택 / 장소 미입력 검증**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 송신 차단.
- **AC-03. 다른 매치의 미팅을 조작 시도 (권한)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무변동.
- **AC-04. BLOCKED/EXPIRED 매치에서 제안 시도**: Given 차단(F09-07)으로 매치 status=BLOCKED 또는 7일 만료로 EXPIRED. When 사용자가 해당 흐름을 실행하면 Then 미팅 미생성.
- **AC-05. 같은 매치에 새 제안 누적**: Given 1차 PROPOSED 미팅 존재 → 상대가 응답 안함. 사용자가 새 제안. When 사용자가 해당 흐름을 실행하면 Then DB에 미팅 row 다수, 클라이언트는 최신만 표시.
- **AC-06. CONFIRMED 후 위치 공유 (현 구현 한계)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 정책 인지만.
- **AC-07. SOS / 체크인 (의도적 미운영)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 차단 발동 → 미팅 흐름 중단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 미팅은 사실상 중단. 기존 row는 보존(분쟁 시 기록 용도).
- **AC-09. 신고 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 일시 표기 형식과 시간대**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
