# F09-06. 만남 제안 & 안전 흐름 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

>
> 2026-07-29 현재 소스 갱신: 만남 완료 이후 데이트 만남 피드백이 추가됐다. `DateMeetingFeedbackService`와 관련 VO/Param이 만남 단위의 `meetAgain`/`satisfaction`을 수집하고, 앱은 만남 제안 화면/배너에서 피드백 시트를 노출한다. 현재 소스에서 이 응답을 F11-06 취향 프로필이나 추천 점수로 전달하는 호출은 없으며, privatedate 격리 데이터와 본인 export 원본으로만 확인된다.

## 1. 결론

서버는 매칭 당사자의 만남 제안과 `PROPOSED → CONFIRMED/CANCELLED → COMPLETED` 상태 전이를 지원한다. Flutter 화면에서 새 제안과 상태 변경(수락, 거절, 취소, 완료) 단추가 연결되어 있고 단추는 서버가 허용하는 전이일 때만 보인다. 제안은 row를 누적 INSERT하고 클라이언트는 가장 최신 활성 row만 표시한다.

### 2026-07-29 소스 재실측 — 완료 후 본인 피드백

| HTTP | 경로 | 요청/응답 |
|---|---|---|
| POST | `/api/v1/date/meetings/{meetingId}/feedback` | body `{ meetAgain: Boolean(필수), satisfaction: Integer?(1~5) }` → 201 `DateMeetingFeedbackVo` |
| GET | `/api/v1/date/meetings/{meetingId}/feedback/me` | 본인 응답만 → 200 `DateMeetingFeedbackVo` |

`DateMeetingFeedbackVo`는 `meetingId`, `submitted`, `meetAgain?`, `satisfaction?`, `createdAt?`를 가진다. 미제출이면 `{ meetingId, submitted: false }`이며 상대 응답 여부·상대 내용·상호 성사 결과는 어떤 응답에도 포함하지 않는다.

제출 조건은 미팅 `COMPLETED`, 호출자가 해당 매치 당사자, 양방향 활성 DateBlock 없음, 만남/응답자당 1회다. 비당사자는 존재 누출을 막기 위해 `DATE_MEETING_NOT_FOUND`, 차단은 `DATE_USER_BLOCKED`, 중복은 `DUPLICATE_RESOURCE`다.

Flutter `meeting_proposal_screen.dart`는 완료 미팅에서 내 상태를 조회해 미제출 배너를 보여 주고, `DateMeetingFeedbackSheet`의 두 질문을 제출한다. 동시/재시도 중 409 중복이 오면 provider가 `alreadySubmitted`로 분류해 본인 상태를 invalidate·재조회하고 배너를 닫으며 `이미 응답한 만남이에요`를 안내한다.

이 피드백은 privatedate 격리 데이터다. 커뮤니티 프로필이나 추천 이유에는 노출되지 않으며 데이터 내보내기에는 **내가 작성한 응답만** 포함된다.

실측 근거: `DateMeetingFeedbackController/Service/Param/Vo`, `date_meeting_api.dart`, `date_meeting_repository.dart`, `date_meeting_provider.dart`, `meeting_proposal_screen.dart`, `date_meeting_feedback_sheet.dart` 및 focused tests.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **F09-05 채팅 화면 헤더 📅 액션** → `/dating/meeting/{matchId}?partnerName=...`
- 그 외 직접 진입 경로는 현 라우터에 없음 (단일 진입)

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DateMeetingController`. 앱: `meeting_proposal_screen.dart`.

## 3. 전체 동작 흐름

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

## 4. 제품 규칙

- 만남 제안은 매칭 당사자가 아직 살아 있는(차단되거나 만료되지 않은) 매칭에서만 할 수 있다. 제안에는 일시와 장소가 필수이고 메모는 200자까지 선택이다. 일시는 지금부터 90일 안에서 고르고 시간 기본값은 14:00이다.
- 상태 전이: 제안됨은 확정 또는 취소로, 확정은 취소 또는 완료로만 바뀐다. 취소와 완료는 끝이라 되돌릴 수 없다. 제안을 확정하는 것은 제안을 받은 쪽만 할 수 있다.
- 받은 제안의 취소는 「거절」, 제안자나 확정 뒤의 취소는 「취소」로 보인다. 거절, 취소, 완료는 되돌릴 수 없어 먼저 확인을 묻고 수락은 묻지 않는다.
- 만남이 완료되면 양쪽에 후기(만남 피드백) 요청 알림이 간다. 만남마다 한 번이다.
- 제안은 쌓이고, 화면은 제안됨이나 확정인 것 중 가장 최근 하나를 상태 카드로 보여 준다. 카드: 응답 대기, 약속 확정, 취소됨, 완료.
- 체크인, SOS, 긴급연락처는 제품 결정으로 두지 않는다. 확정 카드의 위치 공유는 「미팅 시작 1시간 전부터 종료까지 자동으로 위치가 공유됩니다」 안내만 있고 실제 공유 기능은 아직 없다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 만남 제안 (현재 UI Happy Path) | `DateMatch.MATCHED`, 진행 중 미팅 없음. | 새 `PROPOSED` row 생성 후 채팅 화면으로 복귀. 상대는 앱에서 수락 단추로 확정할 수 있다. |
| S2 | 일시 미선택 / 장소 미입력 검증 | 시나리오 본문 참조 | 송신 차단. |
| S3 | 다른 매치의 미팅을 조작 시도 (권한) | 시나리오 본문 참조 | 무변동. |
| S4 | BLOCKED/EXPIRED 매치에서 제안 시도 | 차단(F09-07)으로 매치 status=BLOCKED 또는 7일 만료로 EXPIRED. | 미팅 미생성. |
| S5 | 같은 매치에 새 제안 누적 | 1차 PROPOSED 미팅 존재 → 상대가 응답 안함. 사용자가 새 제안. | DB에 미팅 row 다수, 클라이언트는 최신만 표시. |
| S6 | CONFIRMED 후 위치 공유 (현 구현 한계) | 시나리오 본문 참조 | 사용자에게 정책 인지만. |
| S7 | SOS / 체크인 (의도적 미운영) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 차단 발동 → 미팅 흐름 중단 | 시나리오 본문 참조 | 미팅은 사실상 중단. 기존 row는 보존(분쟁 시 기록 용도). |
| S9 | 신고 (간접) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 일시 표기 형식과 시간대 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:82 | - **Enum `MeetingStatus`**: `PROPOSED, CONFIRMED, CANCELLED, COMPLETED` (4개. 스펙에 있는 `ACCEPTED/REJECTED`와 명칭 다름 — 스펙 vs 코드 불일치 주의) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:61 | - **위치 공유 정책**: 현 화면은 "안내만" — 실제 위치 공유 라우트는 미구현 (G-01 BE 의존). `AppDialog.alert`로 정적 안내만 노출 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:62 | 3. 실제 위치 공유 자체는 미구현 (G-01 BE 의존) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 만남 제안 (현재 UI Happy Path)**: Given `DateMatch.MATCHED`, 진행 중 미팅 없음 When 사용자가 제안 폼을 제출하면 Then 새 `PROPOSED` row가 생기고 채팅으로 복귀한다. 상대는 수락 단추로 확정으로 전환할 수 있다.
- **AC-02. 일시 미선택 / 장소 미입력 검증**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 송신 차단.
- **AC-03. 다른 매치의 미팅을 조작 시도 (권한)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 무변동.
- **AC-04. BLOCKED/EXPIRED 매치에서 제안 시도**: Given 차단(F09-07)으로 매치 status=BLOCKED 또는 7일 만료로 EXPIRED. When 사용자가 해당 흐름을 실행하면 Then 미팅 미생성.
- **AC-05. 같은 매치에 새 제안 누적**: Given 1차 PROPOSED 미팅 존재 → 상대가 응답 안함. 사용자가 새 제안. When 사용자가 해당 흐름을 실행하면 Then DB에 미팅 row 다수, 클라이언트는 최신만 표시.
- **AC-06. CONFIRMED 후 위치 공유 (현 구현 한계)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 정책 인지만.
- **AC-07. SOS / 체크인 (의도적 미운영)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 차단 발동 → 미팅 흐름 중단**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 미팅은 사실상 중단. 기존 row는 보존(분쟁 시 기록 용도).
- **AC-09. 신고 (간접)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 일시 표기 형식과 시간대**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
