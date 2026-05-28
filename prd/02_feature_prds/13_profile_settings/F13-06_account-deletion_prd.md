# F13-06. 계정 삭제 요청 (30일 유예) PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-27 (member.mbti null 처리 추가); unit: business_logic/units/13_profile_settings/F13-06_account-deletion -->

> 문서 상태: **실사 기반 전환본**. 이 문서는 기존 키워드형 PRD를 폐기하고 `business_logic/units/13_profile_settings/F13-06_account-deletion`의 backend/frontend/scenario 근거를 제품 판단용 구조로 재배치한 것이다. 코드 수정이나 QA 착수 전에는 아래 trace의 실제 서버/Flutter 소스를 다시 열어 최종 확인한다.

## 1. 결론

계정 삭제 요청은 즉시 탈퇴와 별도로 30일 유예 기간을 둔 데이터 삭제 예약 기능이다. 서버는 삭제 요청을 `PENDING` 상태와 `scheduledAt = now + 30일`로 저장하고, 스케줄러가 매일 새벽 4시에 만료된 요청을 처리한다. UI 스펙의 비밀번호 재확인 body는 실제 컨트롤러와 Param에서 확인되지 않는다.

**2026-05-27 변경**: `DataDeletionService`가 Member 익명화 시 `mbti`도 null 처리(기존 name/birthDate/gender/bio/profileImageUrl + mbti). [[F13-02]]의 MBTI 필드가 삭제 범위에 포함된다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브의 `데이터 프라이버시` 메뉴에서 진입한다.
- 마이페이지 상단 삭제 진행 배너의 `관리` 버튼에서도 같은 화면으로 진입한다.

현재 이 PRD에서 바로 봐야 할 것은 세 가지다. 첫째, 서버가 실제로 제공하는 endpoint/상태/side effect다. 둘째, Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지다. 셋째, 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것이다.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Backend | [backend.md](../../../units/13_profile_settings/F13-06_account-deletion/backend.md) | 있음 | Controller, Service, VO/DTO, enum, DB/side effect 근거 |
| Frontend | [frontend.md](../../../units/13_profile_settings/F13-06_account-deletion/frontend.md) | 있음 | Route, Screen, Provider, Repository, API, CTA 근거 |
| Scenario | [scenarios.md](../../../units/13_profile_settings/F13-06_account-deletion/scenarios.md) | 있음 | 상태/권한/실패/수용 기준 근거 |
| Diagram | [diagrams.md](../../../units/13_profile_settings/F13-06_account-deletion/diagrams.md) | 있음 | 상태 전이와 흐름 검증 보조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/account/controller/DataPrivacyController.java:39` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/DataPrivacyController.java:46` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/controller/DataPrivacyController.java:52` | 확인됨 |

## 3. 전체 동작 흐름

아래 흐름은 원천 frontend 문서의 Provider/Repository/API 호출 순서와 backend 문서의 endpoint 계약을 합쳐 읽는다. 화면이 먼저 상태를 결정하는 것처럼 보여도 최종 기준은 서버 Controller/Service/VO/enum이다.

1. 데이터 프라이버시 진입: `deletionStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-deletion/status`.
2. 요청 버튼: 확인 다이얼로그 승인 ▶ `requestDeletion()` ▶ `POST /api/v1/users/me/data-deletion`.
3. 요청 성공: provider 상태 갱신 후 D-day 카드 노출.
4. 마이페이지 진입: `DeletionInProgressBanner`도 같은 `deletionStatusNotifierProvider`를 구독한다.
5. 취소 버튼: `cancelDeletion()` ▶ `DELETE /api/v1/users/me/data-deletion`.
6. provider 내부 repository/Retrofit 메서드명은 허용 탐색 범위 밖이라 `(미확인)`.

## 4. 서버 계약

### 개요

계정 삭제 요청은 즉시 탈퇴와 별도로 30일 유예 기간을 둔 데이터 삭제 예약 기능이다. 서버는 삭제 요청을 `PENDING` 상태와 `scheduledAt = now + 30일`로 저장하고, 스케줄러가 매일 새벽 4시에 만료된 요청을 처리한다. UI 스펙의 비밀번호 재확인 body는 실제 컨트롤러와 Param에서 확인되지 않는다.

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| POST | `/api/v1/users/me/data-deletion` | `DataPrivacyController#requestDeletion` | required | 30일 후 데이터 삭제 예약 |
| GET | `/api/v1/users/me/data-deletion/status` | `DataPrivacyController#getDeletionStatus` | required | 진행 중 삭제 요청 상태 조회 |
| DELETE | `/api/v1/users/me/data-deletion` | `DataPrivacyController#cancelDeletion` | required | 진행 중 삭제 요청 취소 |

### 도메인 모델 / Enum (이 기능 관련)

- **Enum** `DataDeletionStatus`: `PENDING`, `APPROVED`, `COMPLETED`, `CANCELLED`
- **Entity** `DataDeletionRequest`: 테이블 `data_deletion_request`
  - `id`, `userId`, `status`, `scheduledAt`, `createdAt`
  - `user_id` unique
- **VO** `DataDeletionRequestVo`: `id`, `userId`, `status`, `scheduledAt`, `createdAt`
- **상수** `GRACE_PERIOD_DAYS = 30`

### 의존 단위 / 외부 시스템

- 다른 Unit 의존:
  - 알림/기기/검색, 결제 자격증명, 데이팅, 캘린더 데이터 삭제에 각 repository를 호출한다.
  - 거래 기록 보존 정책은 payment/accounting 영역과 연결된다.
  - 소셜 unlink API 자체는 Unit 01 영역이므로 여기서 다루지 않는다.
- 외부 시스템: 별도 외부 API 호출은 account 코드에서 확인되지 않음.

## 5. 프론트 계약

### 진입 경로

- 마이페이지 허브의 `데이터 프라이버시` 메뉴에서 진입한다.
- 마이페이지 상단 삭제 진행 배너의 `관리` 버튼에서도 같은 화면으로 진입한다.

### 사용 라우트 & 화면 파일

| 라우트 (GoRouter) | Screen 파일 (lib/presentation/...) | 역할 |
|---|---|---|
| `/profile/privacy` | `profile/screens/data_privacy_screen.dart` | 삭제 요청, 남은 기간 표시, 삭제 취소 |
| 하단 탭 마이페이지 (`/profile` 추정, 실제 등록 미확인) | `profile/widgets/deletion_in_progress_banner.dart` | 진행 중 삭제 요청 배너 |

### 화면별 구성 요소 & 액션

### 데이터 프라이버시 - 계정 삭제 섹션 (`data_privacy_screen.dart`)
- **사용자가 보는 것**:
  - 섹션 제목 `계정 삭제`
  - 경고 박스 `계정 삭제를 요청하면 30일 유예 기간 후 모든 데이터가 영구 삭제됩니다.`
  - 요청이 없거나 `CANCELLED`/`COMPLETED`이면 `계정 삭제 요청` danger 버튼
  - 진행 중이면 `삭제까지 N일 남음` 카드
  - `유예 기간 중 로그인하면 삭제 요청이 취소됩니다.` 안내 문구
  - 진행 중이면 `삭제 취소` outline 버튼
- **사용자가 할 수 있는 액션**:
  - 계정 삭제 요청 탭 ▶ 확인 `AlertDialog` ▶ `deletionStatusNotifierProvider.notifier.requestDeletion()`
  - 삭제 취소 탭 ▶ `deletionStatusNotifierProvider.notifier.cancelDeletion()`
- **상태 분기**:
  - loading: 중앙 `CircularProgressIndicator`
  - error: `계정 삭제 요청` 버튼 표시
  - data null, `CANCELLED`, `COMPLETED`: 신규 요청 버튼
  - `PENDING`, `APPROVED`: D-day 카드와 취소 버튼
  - 기타 상태: `SizedBox.shrink`
- **모달/시트/네비게이션**:
  - 요청 전 `정말 삭제하시겠습니까?...` AlertDialog
  - 비밀번호 재확인 다이얼로그는 현재 코드에 없음.
  - 요청 성공 토스트 `계정 삭제가 요청되었습니다`
  - 취소 성공 토스트 `계정 삭제가 취소되었습니다`

### 삭제 진행 배너 (`deletion_in_progress_banner.dart`)
- **사용자가 보는 것**:
  - `계정 삭제 요청 진행 중`
  - D-day 또는 삭제 일정 안내
  - `관리` 버튼
- **사용자가 할 수 있는 액션**:
  - `관리` 탭 ▶ `/profile/privacy`
- **상태 분기**:
  - `PENDING`/`APPROVED`만 배너 표시
  - 그 외 상태 또는 null은 배너 숨김

### API 호출 순서 (Provider/Repository 관점)

1. 데이터 프라이버시 진입: `deletionStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-deletion/status`.
2. 요청 버튼: 확인 다이얼로그 승인 ▶ `requestDeletion()` ▶ `POST /api/v1/users/me/data-deletion`.
3. 요청 성공: provider 상태 갱신 후 D-day 카드 노출.
4. 마이페이지 진입: `DeletionInProgressBanner`도 같은 `deletionStatusNotifierProvider`를 구독한다.
5. 취소 버튼: `cancelDeletion()` ▶ `DELETE /api/v1/users/me/data-deletion`.
6. provider 내부 repository/Retrofit 메서드명은 허용 탐색 범위 밖이라 `(미확인)`.

### 백엔드만으로는 알 수 없는 정보 (이 화면에서만 결정되는 것)

- 삭제 요청은 danger 버튼과 확인 다이얼로그를 통해 실행한다.
- UI 스펙의 비밀번호 재확인은 현재 화면에 없다.
- `scheduledAt`이 null이면 남은 일수 기본값을 30으로 표시한다.
- 남은 일수가 음수면 0일로 보정해 표시한다.
- "유예 기간 중 로그인하면 삭제 요청이 취소됩니다" 문구는 UI에 있으나 account 서버 코드에서 자동 취소 로직은 확인되지 않는다.
- 삭제 진행 배너는 별도 취소 버튼이 아니라 관리 화면 진입만 제공한다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 사용자가 30일 유예 삭제를 요청한다 | 로그인됨, 진행 중 삭제 요청 없음 | `data_deletion_request`에 `PENDING` 삭제 예약이 존재한다. |
| S2 | 사용자가 마이페이지에서 삭제 진행 배너를 확인한다 | 삭제 요청 status가 `PENDING` 또는 `APPROVED` | 사용자는 삭제 상태와 취소 버튼을 볼 수 있다. |
| S3 | 유예 기간 중 삭제 요청을 취소한다 | 삭제 요청 status가 `PENDING` | 삭제 진행 배너는 사라지고 신규 삭제 요청 버튼 상태로 돌아간다. |
| S4 | 이미 삭제 요청이 있어 중복 요청이 실패한다 | 서버에 `PENDING` 삭제 요청 존재 | 기존 삭제 요청은 유지된다. |
| S5 | 30일이 지나 스케줄러가 개인정보를 삭제한다 | `PENDING`, `scheduledAt`이 현재보다 과거 | 사용자의 개인정보는 삭제/익명화되고 계정 status는 `EXIT`가 된다. |

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
| 후보 | backend.md:38 | - 기존 `CANCELLED`/`COMPLETED` 행이 unique 제약에 미치는 영향은 `(미확인)` | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:11 | \| 하단 탭 마이페이지 (`/profile` 추정, 실제 등록 미확인) \| `profile/widgets/deletion_in_progress_banner.dart` \| 진행 중 삭제 요청 배너 \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:34 | - 비밀번호 재확인 다이얼로그는 현재 코드에 없음. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:55 | 6. provider 내부 repository/Retrofit 메서드명은 허용 탐색 범위 밖이라 `(미확인)`. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 사용자가 30일 유예 삭제를 요청한다**: Given 로그인됨, 진행 중 삭제 요청 없음 When 사용자가 해당 흐름을 실행하면 Then `data_deletion_request`에 `PENDING` 삭제 예약이 존재한다.
- **AC-02. 사용자가 마이페이지에서 삭제 진행 배너를 확인한다**: Given 삭제 요청 status가 `PENDING` 또는 `APPROVED` When 사용자가 해당 흐름을 실행하면 Then 사용자는 삭제 상태와 취소 버튼을 볼 수 있다.
- **AC-03. 유예 기간 중 삭제 요청을 취소한다**: Given 삭제 요청 status가 `PENDING` When 사용자가 해당 흐름을 실행하면 Then 삭제 진행 배너는 사라지고 신규 삭제 요청 버튼 상태로 돌아간다.
- **AC-04. 이미 삭제 요청이 있어 중복 요청이 실패한다**: Given 서버에 `PENDING` 삭제 요청 존재 When 사용자가 해당 흐름을 실행하면 Then 기존 삭제 요청은 유지된다.
- **AC-05. 30일이 지나 스케줄러가 개인정보를 삭제한다**: Given `PENDING`, `scheduledAt`이 현재보다 과거 When 사용자가 해당 흐름을 실행하면 Then 사용자의 개인정보는 삭제/익명화되고 계정 status는 `EXIT`가 된다.

## 10. 미결정 / 후속

- 이 문서는 원천 unit 문서의 실사 내용을 PRD 구조로 옮긴 전환본이다. 최종 구현 판단 전에는 trace source를 직접 열어 backend/frontend 계약을 다시 대조한다.
- Gap/Risk 후보가 있는 경우, 후보 문장을 그대로 믿지 말고 실제 Controller/Service/VO/Flutter model/provider/screen에서 재현 여부를 확인한다.
- QA는 위 시나리오 매트릭스의 종료 상태를 기준으로 E2E 또는 integration test가 있는지 확인하고, 없으면 검증 공백으로 등록한다.
