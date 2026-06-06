# F18-02. 분쟁 직접 접수 (USER_DISPUTE) PRD

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/dispute/ -->

## 1. 결론

`POST /api/v1/me/dispute-cases`는 사용자가 직접 분쟁을 생성하는 유일한 write endpoint다. 생성된 케이스는 `user_dispute_case` 테이블에 persistent하게 저장되며 `caseId="USER_DISPUTE:{id}"` 형태로 통합 케이스 뷰에 포함된다. 나머지 20가지 `DisputeSourceType`은 기존 도메인 테이블을 union-read만 하는 read-only source인 반면, `USER_DISPUTE`는 이 endpoint가 직접 생성하는 유일한 native source다.

status 전이(OPEN → IN_REVIEW / ESCALATED / RESOLVED / CLOSED)는 admin API가 소유하며 공개 API에는 전이 endpoint가 없다. rate-limit는 24시간 10건, 동일 상대 활성 케이스 중복은 `active_dedup_key` GENERATED STORED 컬럼의 UNIQUE 제약으로 409를 반환한다.

앱 `DisputeCaseCreateScreen`은 분쟁 유형 picker + 상세 사유(10~2000자) + 증빙 첨부 + 제출 흐름을 제공한다. 제출 활성화 조건은 `caseType 선택 + summary.trim() 길이 10~2000 + evidenceFileIds.length <= 5`이며(`dispute_case_create_provider.dart:39-44`), 별도 책임 동의 체크박스는 없다. **증빙 첨부 UI는 2026-06-06(W14 S4)에 배선 완료** — 통합 분쟁 접수 화면에 `EvidencePickerField`가 연결되어 최대 5개의 `evidenceFileIds`를 채워 전송한다(community_app `3cb12ac`).

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `host/dispute/controller/DisputeCaseController.java:createMyDispute` | `POST /api/v1/me/dispute-cases`, HTTP 201, `@Valid @RequestBody DisputeCaseCreateParam` |
| Backend Service | `host/dispute/service/DisputeCaseService.java:createUserDispute` | rate-limit 검증, dedup 검증, `UserDisputeCase` 저장, 상세 read-back |
| Backend Param | `host/dispute/param/DisputeCaseCreateParam.java` | 필드 전체, `@NotNull`/`@NotBlank`/`@Size` 제약 |
| Backend Entity | `host/dispute/model/UserDisputeCase.java`, `V1__init.sql:4605` | 컬럼 전체, `active_dedup_key` GENERATED STORED, CHECK 제약 |
| Backend Enum | `DisputeCaseType.java` | 9값 |
| Flutter Screen | `lib/presentation/dispute/screens/dispute_case_create_screen.dart` | 화면 구조, v1 evidence 제외 주석 |
| Flutter Provider | `lib/domain/providers/dispute/dispute_case_create_provider.dart` | 폼 상태, 제출 로직 |
| Flutter Model | `lib/data/models/dispute/dispute_case_create_param.dart`, `dispute_enums.dart` | Freezed 모델 필드 |
| Flutter API | `lib/data/api/dispute_case_api.dart:createCase` | `@POST`, `@Body() DisputeCaseCreateParam` |
| Verification | 검증 없음 | — |

## 3. 전체 동작 흐름

1. 사용자가 `/me/disputes/create` 라우트로 진입한다 (`Routes.myDisputeCreate`).
2. `DisputeCaseCreateScreen`이 `disputeCaseCreateProvider`를 구독한다. 호출 화면이 `targetUserId`, `eventId`, `clubId`, `sourceType`, `sourceId`를 생성자 인자로 넘기면 폼 초기값에 포함된다.
3. 사용자가 `DisputeCaseType` 9종 중 하나를 picker에서 선택한다.
4. 상세 사유를 10~2000자로 입력한다. 제출 버튼은 `caseType 선택 + summary 10~2000자 + evidenceFileIds <= 5` 조건을 만족할 때 활성화된다.
5. 제출 버튼 탭 → `disputeCaseCreateProvider.submit()` → `DisputeCaseApi.createCase(param)` → `POST /api/v1/me/dispute-cases`.
6. 서버 `DisputeCaseService.createUserDispute(userId, param)`:
   - rate-limit 검증: 24시간 내 10건 초과 시 429.
   - dedup 검증: `active_dedup_key` UNIQUE 위반(같은 상대에 활성 케이스 존재) 시 409.
   - self-dispute 검증: `targetUserId == userId`이면 400.
   - `UserDisputeCase` 저장 → `status=OPEN`.
   - 생성된 케이스 상세 read-back → `DisputeCaseDetailVo` HTTP 201 반환.
7. Flutter가 성공 응답 수신 후 `myDisputeCasesProvider` invalidate → 상세 화면(`/me/disputes/{caseId}`)으로 이동하거나 이전 화면으로 pop.
8. 에러 시: 429 → `AppToast.show("요청이 너무 많습니다. 잠시 후 다시 시도해주세요")` (`dispute_case_create_screen.dart:158`), 409 → `AppToast.show("이미 동일한 상대로 진행 중인 분쟁이 있어요")` (`:148`), 400 → 필드별 에러 메시지.

## 4. 서버 계약

### `POST /api/v1/me/dispute-cases`

| 항목 | 실제 계약 |
|---|---|
| Controller | `DisputeCaseController#createMyDispute` |
| 인증 | JWT 필수 |
| Request | `@Valid @RequestBody DisputeCaseCreateParam` |
| Response | `DisputeCaseDetailVo`, HTTP 201 |
| rate-limit | 24시간 내 10건 초과 → 429 |
| dedup | 동일 `{reporter}:{target}` active 케이스 UNIQUE → 409 |
| self-dispute | `targetUserId == userId` → 400 |

### `DisputeCaseCreateParam` 필드

| 필드 | 타입 | 필수 | 제약 | 설명 |
|---|---|---|---|---|
| `caseType` | DisputeCaseType | Y (`@NotNull`) | — | 분쟁 유형 9종 중 하나 |
| `sourceType` | DisputeSourceType | N | — | 참조 맥락 source type (어떤 기존 케이스에서 비롯됐는지) |
| `sourceId` | Long | N | — | 참조 맥락 source id |
| `eventId` | Long | N | — | 연관 이벤트 id |
| `clubId` | Long | N | — | 연관 클럽 id |
| `targetUserId` | Long | N | — | 분쟁 상대. null=특정 상대 없는 일반 분쟁 |
| `reasonCode` | String | N | max 40자 | 분쟁 사유 코드 (자유 문자열) |
| `summary` | String | Y (`@NotBlank`) | min 10, max 2000자 | 상세 사유 |
| `evidenceFileIds` | List\<Long\> | N | 최대 5개 | file_metadata.id 목록 |

### `DisputeCaseType` 9값

| 값 | 설명 |
|---|---|
| `REPORT` | 공개 신고/제보 |
| `APPEAL` | 이의 제기 |
| `REFUND_ISSUE` | 환불 분쟁 |
| `NO_SHOW_APPEAL` | 노쇼 이의 |
| `CONTENT_MODERATION` | 콘텐츠 운영 액션 |
| `SAFETY` | 안전 관련 |
| `SETTLEMENT` | 정산 이의 |
| `TRANSPORT` | 교통/카풀 관련 |
| `HOST_ACTION_REVIEW` | 호스트 액션 리뷰 (강퇴/제재 등) |

### `user_dispute_case` 테이블

| 컬럼 | 타입 | NOT NULL | 설명 |
|---|---|---|---|
| `id` | bigint AI PK | Y | |
| `reporter_user_id` | bigint FK→users | Y | |
| `target_user_id` | bigint FK→users | N | NULL 허용 |
| `case_type` | varchar(40) | Y | DisputeCaseType name |
| `ref_source_type` | varchar(40) | N | 참조 맥락 source type |
| `ref_source_id` | bigint | N | 참조 맥락 source id |
| `event_id` | bigint | N | |
| `club_id` | bigint | N | |
| `reason_code` | varchar(40) | N | |
| `summary` | varchar(2000) | Y | |
| `evidence_file_ids` | json | N | |
| `status` | varchar(20) DEFAULT 'OPEN' | Y | UnifiedDisputeStatus native |
| `active_dedup_key` | varchar(64) GENERATED STORED | — | active(OPEN/IN_REVIEW/ESCALATED) + target 존재 시 `{reporter}:{target}`, 아니면 NULL. UNIQUE 제약 |
| `handler_user_id` | bigint | N | admin API 소유 |
| `resolution_code` | varchar(30) | N | |
| `resolution_note` | varchar(2000) | N | |
| `resolved_at` | datetime | N | |
| `created_at`, `updated_at` | datetime | Y | |

CHECK: `target_user_id IS NULL OR target_user_id <> reporter_user_id` (자기 분쟁 방지)
FK: NO CASCADE (legal-hold safety)

### `user_dispute_case` 상태기계

```
OPEN(생성)
  ↓ admin IN_REVIEW 지정
IN_REVIEW
  ↓ admin ESCALATED / RESOLVED / CLOSED 전이
ESCALATED ──→ RESOLVED | CLOSED
IN_REVIEW ──→ RESOLVED | CLOSED
OPEN ──→ IN_REVIEW | ESCALATED | RESOLVED | CLOSED
```
공개 API에서는 상태 전이 endpoint 없음. admin API 소유.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| 라우트 | `/me/disputes/create` (`Routes.myDisputeCreate`) |
| Screen | `DisputeCaseCreateScreen` |
| Provider | `disputeCaseCreateProvider` |
| API | `DisputeCaseApi.createCase(DisputeCaseCreateParam)` → `DisputeCaseDetailVo` |
| 생성자 인자 | `targetUserId?`, `eventId?`, `clubId?`, `sourceType?`, `sourceId?` |
| 필수 입력 | `caseType` 선택 + `summary` 10~2000자 (evidenceFileIds<=5 포함, 책임 동의 체크박스 없음) |
| 제출 조건 | `canSubmit = !isSubmitting && caseType != null && summary 10~2000자 && evidenceFileIds.length <= 5` |
| evidence | `EvidencePickerField` 배선 완료(2026-06-06, W14 S4). 최대 5개 `evidenceFileIds` 첨부·전송 |
| 409 처리 | `AppToast.show("이미 동일한 상대로 진행 중인 분쟁이 있어요")` (`dispute_case_create_screen.dart:148`) |
| 429 처리 | `AppToast.show("요청이 너무 많습니다. 잠시 후 다시 시도해주세요")` (`:158`) |
| 성공 처리 | `myDisputeCasesProvider` invalidate 후 상세 또는 이전 화면으로 이동 |

### `DisputeCaseCreateParam` Dart 필드 (Freezed)

| 필드 | 타입 | 필수 | 서버 대응 |
|---|---|---|---|
| `caseType` | `DisputeCaseType` | required | `DisputeCaseType` JSON name |
| `sourceType` | `DisputeSourceType?` | 선택 | `sourceType` (ref_source_type) |
| `sourceId` | `int?` | 선택 | `sourceId` (ref_source_id) |
| `eventId` | `int?` | 선택 | `eventId` |
| `clubId` | `int?` | 선택 | `clubId` |
| `targetUserId` | `int?` | 선택 | `targetUserId` |
| `reasonCode` | `String?` | 선택 | `reasonCode` |
| `summary` | `String` | required | `summary` |
| `evidenceFileIds` | `List<int>` (@Default) | — | `evidenceFileIds` |

`dispute_case_create_param.dart:15-25` 직접 확인 결과 `eventId`, `clubId`, `reasonCode` 필드 모두 선언되어 있다. 제출 시 포함되며, 폼 상태(provider)에서 `setContext(eventId:, clubId:)` 메서드로 주입 가능하다. 실제로 화면에서 이 값들이 채워지는지는 호출 화면 진입 경로에 따라 다르다.

## 6. 상태/권한 매트릭스

| 시나리오 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 정상 생성 (targetUserId 있음) | `active_dedup_key={reporter}:{target}` UNIQUE | 성공 201 | 케이스 상세로 이동 | 일치 |
| 정상 생성 (targetUserId 없음) | `active_dedup_key=NULL` (UNIQUE 미적용) | 성공 201 | 케이스 상세로 이동 | 일치 |
| 같은 상대 활성 케이스 중복 | `active_dedup_key` UNIQUE 위반 → 409 | AppToast 409 "이미 동일한 상대로 진행 중인 분쟁이 있어요" | 화면 유지 | 일치 |
| 자기 신고 | CHECK 제약 위반 → 400 | AppToast 400 | 에러 처리 | 일치 |
| rate-limit 초과 | 24h 10건 → 429 | AppToast 429 "요청이 너무 많습니다. 잠시 후 다시 시도해주세요" | 화면 유지 | 일치 |
| evidence 첨부 | max 5 | `EvidencePickerField`로 최대 5개 첨부(W14 S4) | 증빙과 함께 접수됨 | 해소(2026-06-06, W14 S4) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `caseType` 9값 | `DisputeCaseType` enum | Dart `DisputeCaseType` enum 9값 일치 | 일치 |
| `summary` 제약 | min 10, max 2000 | UI 10~2000자 제한 | 일치 |
| `evidenceFileIds` | max 5 | `EvidencePickerField`로 최대 5개 첨부·전송 | 해소(2026-06-06, W14 S4) |
| `eventId`, `clubId`, `reasonCode` | `DisputeCaseCreateParam` 지원 | `dispute_case_create_param.dart:15-25` 전부 선언됨. provider `setContext`로 주입 가능 | 일치(v1은 화면에서 채워 보내는 경로가 제한적) |
| dedup key | `active_dedup_key` GENERATED STORED | 클라는 dedup 판단 없음 (서버 409 수신) | 정합 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| ~~P1~~ 해소(2026-06-06, W14 S4) | **evidence 첨부**: `DisputeCaseCreateScreen`에 `EvidencePickerField` 배선 완료. 최대 5개 `evidenceFileIds` 첨부·전송(community_app `3cb12ac`). | `dispute_case_create_screen.dart` | 증빙과 함께 분쟁 접수 가능. 서버 `EvidenceFileValidator`가 소유권/용도/상태 검증 | 완료 |
| P1 | **eventId/clubId/targetUserId 화면 주입 경로 확인 필요**: Dart 모델(`dispute_case_create_param.dart:15-25`)에 `eventId?`, `clubId?`, `reasonCode?` 필드는 모두 선언됨. provider `setContext`로 주입 가능하나, 실제 생성 화면 진입 시 어떤 호출 경로가 이 값들을 채워 보내는지 화면별로 확인 필요. | `dispute_case_create_provider.dart:113-123` 제출 param 구성 | 진입 경로에 따라 맥락 정보가 null로 전송되어 운영 추적이 어려울 수 있음 | 분쟁 접수 진입 경로별 setContext 호출 여부 확인 |
| P2 | **rate-limit 서버 구현 확인 필요**: 컨트롤러 Javadoc에 "rate limit(24h 10건) 초과는 429"로 명시되어 있으나, `DisputeCaseService.createUserDispute` 내 실제 rate-limit 로직 구현 여부를 직접 확인하지 않음 | `DisputeCaseController.java:createMyDispute` Javadoc | rate-limit 비구현 시 무제한 접수 가능 | 서비스 레이어 rate-limit 구현 검증 |
| P2 | **admin 전이 전용 구조 앱 미안내**: 생성 후 상태가 OPEN으로 고정되고 admin 처리 전까지 변화 없음. 사용자에게 "처리에 시간이 걸립니다" 안내 없음 | `DisputeCaseCreateScreen` UX | 사용자가 상태 변화 없다고 오해하고 중복 접수 가능 | 접수 완료 화면에 처리 기간 안내 추가 |

## 9. 수용 기준

### AC-01. 정상 분쟁 생성

Given 로그인 사용자가 `caseType=SAFETY`, `summary="현장에서 부적절한 행동이 있었습니다"(15자)`를 입력한다 (책임 동의 체크박스 없음 — canSubmit 조건 자동 충족).
When 제출 버튼을 탭한다.
Then 서버가 HTTP 201을 반환하고 Flutter가 생성된 케이스 상세 화면으로 이동한다. 케이스의 `status=OPEN`이고 `caseId="USER_DISPUTE:{id}"` 형식이다.

### AC-02. 중복 방지 (같은 상대 활성 케이스)

Given 사용자가 targetUserId=100에 대한 OPEN 케이스를 이미 가지고 있다.
When 동일 targetUserId=100으로 분쟁 생성을 시도한다.
Then 서버가 409를 반환하고 Flutter가 "이미 동일한 상대로 진행 중인 분쟁이 있어요" toast를 표시한다.

### AC-03. 자기 신고 방지

Given 사용자가 `targetUserId=본인`으로 분쟁 생성을 시도한다.
When `POST /api/v1/me/dispute-cases`를 호출한다.
Then 서버가 400을 반환한다. (`target_user_id IS NULL OR target_user_id <> reporter_user_id` CHECK 위반)

### AC-04. summary 유효성 검증

Given 사용자가 summary를 9자(min 10 미만)로 입력한다.
When 제출 버튼을 탭한다.
Then 서버가 400을 반환하거나, Flutter가 제출 전 클라이언트 유효성 검사로 차단한다.

### AC-05. admin 전이 전용

Given 생성된 케이스가 OPEN 상태다.
When 사용자가 앱에서 상태 변경을 시도한다.
Then 공개 API에 전이 endpoint가 없으므로 상태 변경 불가. 상세 화면에 현재 OPEN 상태만 표시된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| ~~구현~~ 해소(2026-06-06, W14 S4) | evidence 첨부 | `DisputeCaseCreateScreen`에 `EvidencePickerField` 연결 완료(최대 5). `EvidenceFileValidator` 서버 검증 |
| 구현 | 화면별 setContext 호출 확인 | 이벤트/클럽 등 각 진입 경로에서 setContext(eventId:, clubId:) 호출 여부 검증 |
| 운영 | 처리 기간 안내 UX | 접수 완료 화면에 "운영팀이 {N}일 내 처리 예정" 등 안내 문구 추가 |
| 검증 | rate-limit 구현 확인 | `DisputeCaseService.createUserDispute` 내 rate-limit 로직 소스 직접 검증 |
| 테스트 | dedup/rate-limit/self-dispute 시나리오 테스트 | 현재 검증 없음 |
