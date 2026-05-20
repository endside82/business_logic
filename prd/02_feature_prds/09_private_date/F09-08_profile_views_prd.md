# F09-08. 내 프로필 조회 이력 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-18; unit: business_logic/units/09_private_date/F09-08_profile_views -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/09_private_date/F09-08_profile_views`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

내 데이팅 프로필을 누가 봤는지(조회자 닉네임·사진 1장·조회 시각)를 페이징으로 보여주는 부가 동기 부여 기능. 조회 이력은 별도 트래킹 엔드포인트가 아니라, 다른 프로필 조회 API(`getProfileByProfileIdWithView`)에서 24시간 중복 제거 규칙으로 자동 INSERT된다. 본 단위는 그 결과를 사용자에게 노출하는 GET 하나로 구성된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- **데이팅 프로필 화면(F09-02) 우상단 👁 아이콘** → `context.push('/dating/profile/viewers')`
- 그 외 진입 경로 없음 (단일 진입)

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/09_private_date/F09-08_profile_views/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/09_private_date/F09-08_profile_views/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/09_private_date/F09-08_profile_views/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/09_private_date/F09-08_profile_views/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java:84` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

### 프로필 방문자 (`profile_viewers_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('프로필 방문자')`
  - viewer 리스트 (`_ViewerItem`) — 좌측 아바타(`viewerPhotoUrl` or `datingPink` 흐릿 fallback + person 아이콘), 닉네임(`viewerDisplayName ?? '익명'`), 상대시간(`방금/{n}분 전/{n}시간 전/{n}일 전/MM/d`)
  - 우측 chevron — 상세 진입(현 구현은 탭 동작 미연결)
  - 빈 상태: "👁 아직 방문자가 없습니다" (회색 텍스트)
  - 무한 스크롤: 스크롤 바닥 200px 근접 시 `loadMore()` 호출
  - 풀투리프레시: `RefreshIndicator` → `notifier.refresh()`
- **사용자가 할 수 있는 액션**:
  - 스크롤 → 추가 페이지 로드
  - 풀투리프레시 → 첫 페이지 재호출
  - viewer 카드 탭 → (현 구현은 핸들러 없음 — 향후 viewer 프로필 상세 진입 가능)

## 4. 서버 계약

### 개요

내 데이팅 프로필을 누가 봤는지(조회자 닉네임·사진 1장·조회 시각)를 페이징으로 보여주는 부가 동기 부여 기능. 조회 이력은 별도 트래킹 엔드포인트가 아니라, 다른 프로필 조회 API(`getProfileByProfileIdWithView`)에서 24시간 중복 제거 규칙으로 자동 INSERT된다. 본 단위는 그 결과를 사용자에게 노출하는 GET 하나로 구성된다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/date/profile/views | DateProfileController#getProfileViews | required | 내 프로필을 본 viewer 목록 페이지 |

### 도메인 모델 / Enum (이 기능 관련)

- **Entity `DateProfileView`**: `id, viewerId, profileId, viewedAt`
- **VO `DateProfileViewVo`**: 위 응답 필드. viewer 정보는 service에서 후처리 주입.

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - **F09-02** — 내 프로필이 있어야 함. viewer 정보(닉네임/사진)도 viewer의 `DateProfile`에서 가져옴
  - **F09-03 (간접)** — 후보자 상세 조회 흐름이 INSERT 트리거. (현 시점 화면에는 `getProfileByProfileIdWithView`를 직접 호출하는 클라이언트 코드는 본 작업 범위에서 미확인 — 향후 후보자 상세 시트 등에서 호출 가정)
  - **F09-07 (간접)** — 차단된 사용자가 내 프로필을 보는 일은 거의 없음. 차단된 자 viewer row가 남아있을 수 있으나 노출 자체는 별도로 차단되지 않음
- 외부:
  - 없음

## 5. 프론트 계약

### 진입 경로

- **데이팅 프로필 화면(F09-02) 우상단 👁 아이콘** → `context.push('/dating/profile/viewers')`
- 그 외 진입 경로 없음 (단일 진입)

### 사용 라우트 & 화면 파일

| 라우트 | Screen 파일 | 역할 |
|---|---|---|
| `/dating/profile/viewers` (`Routes.datingProfileViewers`) | `presentation/date/screens/profile_viewers_screen.dart` | viewer 페이지 + 무한 스크롤 |

### 화면별 구성 요소 & 액션

### 프로필 방문자 (`profile_viewers_screen.dart`)

- **사용자가 보는 것**:
  - `CommunityAppBar('프로필 방문자')`
  - viewer 리스트 (`_ViewerItem`) — 좌측 아바타(`viewerPhotoUrl` or `datingPink` 흐릿 fallback + person 아이콘), 닉네임(`viewerDisplayName ?? '익명'`), 상대시간(`방금/{n}분 전/{n}시간 전/{n}일 전/MM/d`)
  - 우측 chevron — 상세 진입(현 구현은 탭 동작 미연결)
  - 빈 상태: "👁 아직 방문자가 없습니다" (회색 텍스트)
  - 무한 스크롤: 스크롤 바닥 200px 근접 시 `loadMore()` 호출
  - 풀투리프레시: `RefreshIndicator` → `notifier.refresh()`
- **사용자가 할 수 있는 액션**:
  - 스크롤 → 추가 페이지 로드
  - 풀투리프레시 → 첫 페이지 재호출
  - viewer 카드 탭 → (현 구현은 핸들러 없음 — 향후 viewer 프로필 상세 진입 가능)

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- **무한 스크롤 트리거**: `position.maxScrollExtent - 200` 근접 시 `loadMore`
- **상대 시간 표기**:
  - 1분 미만 → "방금"
  - 60분 미만 → "{n}분 전"
  - 24시간 미만 → "{n}시간 전"
  - 7일 미만 → "{n}일 전"
  - 그 외 → "M/d" (예: "5/8")
- **빈 상태 디자인**: 회색 visibility_off_outlined 아이콘 48 + 텍스트
- **아바타 fallback**: `datingPink.withValues(alpha: 0.15)` 배경 + person 아이콘
- **익명 표시**: viewer가 데이팅 프로필을 만들지 않았거나 displayName 없는 경우 "익명"으로 표기
- **타이틀 한글 인코딩**: 코드에서 `'프로필 방문자'` (= "프로필 방문자") 유니코드 이스케이프 사용 — 빌드 호환 의도
- **차단된 사용자도 viewer로 보일 수 있는가**: 서버는 차단 여부와 무관하게 row를 반환 — 해당 화면이 차단된 사용자 식별·필터링하지 않음. 운영상 보완 여지.
- **TestId**: 현 화면 코드에는 별도 TestId 미부착

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 첫 진입 — 방문자 5명 (Happy Path) | 다른 사용자 5명이 24시간 내 내 프로필 조회 → 5개 row 보유. | 사용자가 자신을 본 사람들을 인지 → 매칭 동기 강화. |
| S2 | 24시간 중복 제거 (서버 정책) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 무한 스크롤 (페이지 2 로드) | viewer 25명. | 페이지 끝 → 더 이상 호출 없음. |
| S4 | 풀투리프레시 — 새 viewer 발견 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 빈 상태 | 시나리오 본문 참조 | 사용자에게 활성 토글/프로필 보강 동기 제공 (현 화면은 액션 버튼 미제공 — 단순 안내). |
| S6 | 내 프로필이 없을 때 | 시나리오 본문 참조 | 사용자가 프로필 작성(F09-02)으로 이동. |
| S7 | viewer가 비활성/HIDDEN 상태 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 차단된 viewer | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | 신고 / 차단 액션 부재 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 성능 — 대량 viewer | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

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
| 후보 | backend.md:50 | - **F09-03 (간접)** — 후보자 상세 조회 흐름이 INSERT 트리거. (현 시점 화면에는 `getProfileByProfileIdWithView`를 직접 호출하는 클라이언트 코드는 본 작업 범위에서 미확인 — 향후 후보자 상세 시트 등에서 호출 가정) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:52 | **종료 상태**: 사용자에게 활성 토글/프로필 보강 동기 제공 (현 화면은 액션 버튼 미제공 — 단순 안내). | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:19 | Viewers -.->\|미연결\| Detail[🔵 viewer 상세 — 미구현] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 첫 진입 — 방문자 5명 (Happy Path)**: Given 다른 사용자 5명이 24시간 내 내 프로필 조회 → 5개 row 보유. When 사용자가 해당 흐름을 실행하면 Then 사용자가 자신을 본 사람들을 인지 → 매칭 동기 강화.
- **AC-02. 24시간 중복 제거 (서버 정책)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 무한 스크롤 (페이지 2 로드)**: Given viewer 25명. When 사용자가 해당 흐름을 실행하면 Then 페이지 끝 → 더 이상 호출 없음.
- **AC-04. 풀투리프레시 — 새 viewer 발견**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 빈 상태**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자에게 활성 토글/프로필 보강 동기 제공 (현 화면은 액션 버튼 미제공 — 단순 안내).
- **AC-06. 내 프로필이 없을 때**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 사용자가 프로필 작성(F09-02)으로 이동.
- **AC-07. viewer가 비활성/HIDDEN 상태**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 차단된 viewer**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. 신고 / 차단 액션 부재**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 성능 — 대량 viewer**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
