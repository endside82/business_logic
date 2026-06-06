# F18-03. 분쟁 이의제기 (DisputeAppeal) PRD

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/dispute/ -->
<!-- 갱신: 2026-06-06 (W14-S2 `07bdb38`): EVENT_NO_SHOW source 사전검증 추가 — createAppeal이 save 전 기한(confirmedAt+7일)·본인·canonical caseId를 검증하고 실패를 전파(과거 검증 실패를 삼키고 201 반환하던 BLOCKER 해소) -->

## 1. 결론

`DisputeAppeal`은 `dispute_appeal` 테이블에 저장되는 통합 이의제기 side-table이다. 사용자는 `POST /api/v1/me/dispute-cases/{caseId}/appeals`로 이의를 제기하고, `UNIQUE(case_id, appellant_user_id)` 제약으로 케이스당 본인 이의 1건이 보장된다. 이의 상태는 `PENDING` → `UPHELD`/`REJECTED` 전이는 admin API가 소유하며, 공개 API에서는 `POST .../withdraw`로 PENDING→CLOSED(철회) 전이만 가능하다.

이의제기 시 `DisputeAppealService.createAppeal`(:104-152)은 **대부분의 prefix에 대해 케이스 존재/가시성 검증 없이 `dispute_appeal` insert**를 수행한다. 사전 가시성 검증은 `CLUB_MEMBERSHIP_ACTION` prefix(`DisputeAppealService.java:119-127` — 영향받은 멤버 본인 여부 확인)와 `EVENT_NO_SHOW` prefix(W14-S2 추가)에 한해서만 수행되며, 나머지 prefix는 audit-only로 검증 없음이다. **`EVENT_NO_SHOW` source는 2026-06-06(W14-S2)부터 `dispute_appeal` insert(save) 이전에 사전검증을 수행한다** — `EventNoShowService.validateAppealable`을 공유해 ① noShowId 존재, ② 본인(row.userId), ③ 소명 기한(`confirmedAt + 7일`) 이내, ④ canonical caseId(`EVENT_NO_SHOW:{noShowId}`) 일치를 확인하고, 실패하면 그대로 전파해 appeal을 만들지 않는다(과거: 검증 실패를 삼키고 201을 반환하던 BLOCKER — Codex 적발·해소). 검증 통과 후 `EventNoShowService#appeal` sync로 노쇼 status를 APPEALED로 전이한다. `EVENT_NO_SHOW` 외 prefix는 **audit-only**다(`dispute_appeal` insert만 발생하고 원본 도메인 status는 변경되지 않음).

`DisputeAppealStatus.isClosed()` 판단은 `this != PENDING`으로 정의된다(`DisputeAppealStatus.java:17`). UPHELD/REJECTED/CLOSED 모두 종결이며, PENDING 상태에서만 철회가 가능하다.

**도메인 경계**: `WarningAppeal` (F15-03, `POST /api/v1/clubs/{clubId}/warnings/appeals`)와 본 기능은 완전히 별개다. 서버 enum, endpoint, 엔티티, 상태값 모두 다르다. `WarningAppealStatus`(SUBMITTED/IN_REVIEW/ACCEPTED/PARTIALLY_ACCEPTED/REJECTED/WITHDRAWN) vs `DisputeAppealStatus`(PENDING/UPHELD/REJECTED/CLOSED)는 이름이 유사해 혼동 위험이 높다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `host/dispute/controller/DisputeCaseController.java:getMyAppeals,createAppeal,withdrawAppeal` | 3개 endpoint, 권한 검증, 에러 코드 |
| Backend Service | `host/dispute/service/DisputeAppealService.java` | `createAppeal`, `withdrawAppeal`, `listMyAppealsForCase`, sourceType dispatcher, best-effort sync |
| Backend Entity | `host/dispute/model/DisputeAppeal.java`, `V1__init.sql:4576` | 컬럼 전체, UNIQUE(case_id, appellant_user_id) |
| Backend Enum | `DisputeAppealStatus.java` | 4값, `isClosed()` 정의 |
| Backend Param | `host/dispute/param/AppealCreateParam.java` | `reasonCode @NotBlank`, `reasonText @NotBlank` min 20 max 1000, `evidenceFileIds` |
| Backend VO | `host/dispute/vo/AppealVo.java` | id, caseId, reasonCode, reasonText, evidenceFileIds, status, createdAt |
| Backend Error | `DisputeAppealService.java:108,144,217,220,226,230` | INVALID_REQUEST, CONFLICT, NOT_FOUND, FORBIDDEN |
| Flutter Screen | `lib/presentation/dispute/screens/appeal_form_screen.dart` | SCR-DP-004, reasonCode 드롭다운 + reasonText |
| Flutter Provider | `lib/domain/providers/dispute/appeal_create_provider.dart` | 폼 상태, submit, withdraw |
| Flutter Model | `lib/data/models/dispute/appeal_vo.dart`, `appeal_create_param.dart`, `dispute_enums.dart:AppealStatus,AppealReasonCode` | Freezed 모델, 상태 enum |
| Verification | 검증 없음 | — |

## 3. 전체 동작 흐름

### 이의제기 생성 흐름

1. 사용자가 케이스 상세 화면(`DisputeCaseDetailScreen`)에서 "이의제기" 버튼을 탭한다.
2. `/me/disputes/{caseId}/appeal` 라우트 → `AppealFormScreen`으로 진입.
3. `AppealReasonCode` 5값(드롭다운) 선택 + reasonText(20~1000자) 입력.
4. 제출 → `appealCreateProvider(caseId).submit(AppealCreateParam)` → `DisputeCaseApi.createAppeal(caseId, param)` → `POST /api/v1/me/dispute-cases/{caseId}/appeals`.
5. 서버 `DisputeAppealService.createAppeal(caseId, userId, param)`:
   - sourceType dispatcher: caseId prefix 파싱.
     - `CLUB_MEMBERSHIP_ACTION` prefix → 사전 가시성 검증(영향받은 멤버 본인 여부, 비본인 403).
     - `EVENT_NO_SHOW` prefix → **insert 이전 사전검증(W14-S2)**: `validateAppealable`로 noShowId 존재·본인·기한(`confirmedAt+7일`)·canonical caseId 일치 확인. 실패 시 전파(appeal 미생성). 통과 시 `EventNoShowService#appeal`로 노쇼 status를 APPEALED로 전이.
     - 나머지 prefix → audit-only (검증 없이 insert만).
   - `UNIQUE(case_id, appellant_user_id)` 위반 → 409.
   - `DisputeAppeal` insert, status=PENDING.
   - `AppealVo` HTTP 201 반환.
6. Flutter가 케이스 상세 `disputeCaseDetailProvider` invalidate 후 화면 갱신 또는 이전 화면 pop.

### 이의 목록 조회 흐름

1. 케이스 상세 화면이 `GET /api/v1/me/dispute-cases/{caseId}/appeals` 호출.
2. `DisputeAppealService.listMyAppealsForCase(caseId, userId)` → 본인 appeal 0~1건 반환.
3. Flutter가 이의 상태 배지(PENDING/UPHELD/REJECTED/CLOSED) + reasonText 표시.

### 이의 철회 흐름

1. 사용자가 케이스 상세에서 PENDING 이의의 "철회" 버튼을 탭한다.
2. `appealCreateProvider(caseId).withdraw(appealId)` → `POST /api/v1/me/dispute-cases/{caseId}/appeals/{appealId}/withdraw`.
3. 서버: appealId 미존재 → 404, caseId 불일치 → 404, 비본인 → 403, 비PENDING → 409.
4. 성공 시 `AppealVo(status=CLOSED)` 반환.

## 4. 서버 계약

### `GET /api/v1/me/dispute-cases/{caseId}/appeals`

| 항목 | 실제 계약 |
|---|---|
| Controller | `DisputeCaseController#getMyAppeals` |
| 인증 | JWT 필수 |
| Response | `List<AppealVo>` (UNIQUE 제약상 0~1건) |

### `POST /api/v1/me/dispute-cases/{caseId}/appeals`

| 항목 | 실제 계약 |
|---|---|
| Controller | `DisputeCaseController#createAppeal` |
| 인증 | JWT 필수 |
| Request | `@Valid @RequestBody AppealCreateParam` |
| Response | `AppealVo`, HTTP 201 |
| 에러 | UNIQUE(case_id, appellantUserId) 위반 → 409 CONFLICT |

### `POST /api/v1/me/dispute-cases/{caseId}/appeals/{appealId}/withdraw`

| 항목 | 실제 계약 |
|---|---|
| Controller | `DisputeCaseController#withdrawAppeal` |
| 인증 | JWT 필수 |
| Path | `caseId: String`, `appealId: Long` |
| Response | `AppealVo(status=CLOSED)` |
| 에러 | appealId 미존재 → 404, caseId 불일치 → 404, 비본인(appellantUserId != userId) → 403, 비PENDING → 409 |

### `AppealCreateParam` 필드

| 필드 | 타입 | 필수 | 제약 |
|---|---|---|---|
| `reasonCode` | String | Y (`@NotBlank`) | max 40자. **서버는 임의 문자열(≤40자) 허용** (`AppealCreateParam.java:19-20` — @NotBlank @Size(max=40), enum whitelist 없음). 클라이언트 드롭다운 관행 5값: `FACT_INCORRECT/EVIDENCE_MISSING/PROCEDURE_UNFAIR/CIRCUMSTANCE_OVERRIDE/OTHER` (javadoc 주석) |
| `reasonText` | String | Y (`@NotBlank`) | min 20, max 1000자 |
| `evidenceFileIds` | List\<Long\> | N | 최대 5개 |

### `AppealVo` 필드

| 필드 | 타입 | nullable | 설명 |
|---|---|---|---|
| `id` | Long | N | PK |
| `caseId` | String | N | 통합 케이스 id |
| `reasonCode` | String | N | |
| `reasonText` | String | N | |
| `evidenceFileIds` | List\<Long\> | Y | |
| `status` | DisputeAppealStatus | N | |
| `createdAt` | LocalDateTime | N | |

### `dispute_appeal` 테이블

| 컬럼 | 타입 | NOT NULL | 비고 |
|---|---|---|---|
| `id` | bigint AI PK | Y | |
| `case_id` | varchar(80) | Y | `{prefix}:{sourceId}` |
| `source_type` | varchar(40) | Y | caseId prefix parsed |
| `source_id` | bigint | Y | caseId suffix |
| `appellant_user_id` | bigint | Y | |
| `reason_code` | varchar(40) | Y | |
| `reason_text` | varchar(1000) | Y | |
| `evidence_file_ids` | json | N | |
| `status` | varchar(20) DEFAULT 'PENDING' | Y | |
| `processed_by_user_id` | bigint | N | |
| `processed_at` | datetime | N | |
| `processed_note` | varchar(1000) | N | |
| `created_at`, `updated_at` | datetime | Y | |

UNIQUE: `(case_id, appellant_user_id)` — 동일 케이스 본인 이의 1건 보장
INDEX: `(case_id)`, `(appellant_user_id, status)`

### `DisputeAppealStatus` 상태기계

```
PENDING (생성)
  ↓ 본인 철회 (POST .../withdraw, 공개 API)
CLOSED

PENDING
  ↓ admin UPHELD 전이 (admin API 소유)
UPHELD

PENDING
  ↓ admin REJECTED 전이 (admin API 소유)
REJECTED
```

`isClosed() = this != PENDING` (소스: `DisputeAppealStatus.java:17`)

비가역: UPHELD/REJECTED/CLOSED → 재전이 불가.

### sourceType dispatcher 정책

| 조건 | 동작 | 소스 |
|---|---|---|
| `caseId` prefix = `CLUB_MEMBERSHIP_ACTION` | 사전 가시성 검증: 영향받은 멤버 본인(action.userId == appellant) 여부 확인. 비본인 → 403 | `DisputeAppealService.java:119-127` |
| `caseId` prefix = `EVENT_NO_SHOW` | **사전검증(W14-S2, `07bdb38`)**: insert 이전에 `validateAppealable`로 noShowId 존재·본인·기한(`confirmedAt+7일`, 초과 시 `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED` 409)·canonical caseId(`EVENT_NO_SHOW:{noShowId}`) 일치 확인 → 실패 시 전파(appeal 미생성). 통과 후 `EventNoShowService#appeal`로 노쇼 status APPEALED 전이 | `DisputeAppealService.java`(W14-S2) |
| 나머지 모든 prefix | audit-only: 케이스 존재/가시성 검증 없이 `dispute_appeal` insert만. 원본 도메인 status 변경 없음 | `DisputeAppealService.java:163-164` |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| 라우트 | `/me/disputes/:caseId/appeal` (`Routes.myDisputeAppeal`) |
| Screen | `AppealFormScreen` (SCR-DP-004) |
| Provider | `appealCreateProvider(caseId)` |
| API | `DisputeCaseApi.createAppeal(caseId, AppealCreateParam)` → `AppealVo` |
| API(조회) | `DisputeCaseApi.getMyAppeals(caseId)` → `List<AppealVo>` |
| API(철회) | `POST .../withdraw` (별도 Retrofit 메서드) |
| reasonCode 드롭다운 | `AppealReasonCode` 5값(클라 드롭다운): FACT_INCORRECT/EVIDENCE_MISSING/PROCEDURE_UNFAIR/CIRCUMSTANCE_OVERRIDE/OTHER. 서버는 임의 문자열(≤40자) 허용 |
| reasonText 제약 | 20~1000자 (UI 강제) |
| 성공 | 케이스 상세 `disputeCaseDetailProvider` invalidate 후 pop |
| 상태 배지 | `AppealStatus` Dart enum 4값. `AppealStatus.canWithdraw = this == PENDING` |

### Dart enum 정합

| 서버 | Dart | wire value | 판단 |
|---|---|---|---|
| `DisputeAppealStatus` | `AppealStatus` | `name()` (클래스명 불일치, wire 일치) | 일치 |
| `reasonCode` 값 목록 | `AppealReasonCode` 5값 (Dart 전용 enum) | `name()` → String 전송 | 일치 |

## 6. 상태/권한 매트릭스

| 시나리오 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 최초 이의제기 | `dispute_appeal` insert, status=PENDING | `AppealStatus.PENDING` 배지 | 이의 제출됨 | 일치 |
| 중복 이의제기 (PENDING 상태) | UNIQUE(case_id, appellantUserId) → 409 | AppToast 409 | "이미 이의가 접수되어 있습니다" | 일치 |
| PENDING 이의 철회 | status=CLOSED 반환 | `canWithdraw=true` → 철회 버튼 표시 | CLOSED 배지로 전환 | 일치 |
| UPHELD/REJECTED 이의 철회 시도 | `isClosed()=true` → 409 | `canWithdraw=false` → 버튼 숨김 | 철회 불가 | 일치 |
| 비본인 철회 시도 | 403 | — | 에러 toast | 일치 |
| 비PENDING 철회 시도 | 409 CONFLICT | `canWithdraw=false` | 차단됨 | 일치 |
| `EVENT_NO_SHOW` 이의 (기한 내·본인) | 사전검증 통과 → `EventNoShowVo.status=APPEALED` | `NoShowStatus.APPEALED` 반영 | 노쇼 화면에서 APPEALED 표시 | 일치(W14-S2 사전검증) |
| `EVENT_NO_SHOW` 이의 (기한 초과/타인/없는 noShowId) | `validateAppealable` 실패 전파 → appeal 미생성 (409/403/404) | 에러 toast | 소명 불가 | 일치(W14-S2 — 과거 201로 삼키던 BLOCKER 해소) |
| EVENT_NO_SHOW 외 prefix 이의 | audit-only — 원본 도메인 status 불변 | appeal 배지 표시만 | 원본 케이스 변화 없음 | Gap(의도적) |
| admin 인용/기각 | UPHELD/REJECTED — admin API | `AppealStatus.UPHELD/REJECTED` 배지 | 결과 표시 | 일치(read-only) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| `AppealCreateParam.reasonCode` | String, max 40, 서버 whitelist 없음 | `AppealReasonCode.wireValue` (5값 enum name). 서버는 임의 40자 이내 문자열 허용 | 클라 드롭다운 제약이 서버보다 강함 (의도적) |
| `AppealCreateParam.reasonText` | min 20, max 1000 | UI 20~1000자 제한 | 일치 |
| `AppealVo.status` | `DisputeAppealStatus` | Dart `AppealStatus` (클래스명 불일치, wire 일치) | 일치 |
| UNIQUE 제약 | `(case_id, appellant_user_id)` 서버 강제 | 클라이언트 중복 검사 없음 (서버 409 수신) | 정합 |
| `isClosed()` 판단 | `this != PENDING` 서버 정의 | `AppealStatus.isClosed = this != PENDING` Dart 미러 | 일치 |
| `canWithdraw` | 서버 비PENDING → 409 | Dart `canWithdraw = this == PENDING` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | **appeal 승인/거절 공개 API 부재**: `canApproveAppeal=true` flag 있으나 `DisputeAppealService`에 `approve/reject` 메서드 없음. admin API 소유. | `DisputeAppealService.java`: `withdrawAppeal`만 구현 | 호스트 앱에서 이의 결과 처리 불가. UI flag만 존재 | 호스트용 공개 전이 endpoint 추가 또는 admin API 접근 UX 설계 |
| P1 | **audit-only prefix 가시성 검증 없음**: `createAppeal`은 `CLUB_MEMBERSHIP_ACTION`·`EVENT_NO_SHOW`(W14-S2) 외 prefix에 대해 케이스 존재/본인 가시성 검증 없이 `dispute_appeal` insert. 제3자가 임의 caseId로 appeal row를 만들 수 있음. | `DisputeAppealService.java` — CLUB_MEMBERSHIP_ACTION·EVENT_NO_SHOW만 가시성/사전검증, 나머지 audit-only | 비관련 당사자의 이의 insert 가능. 현재 UNIQUE(case_id, appellant_user_id) 제약이 1차 방어이나 case 가시성 보장은 없음(EVENT_NO_SHOW는 해소) | audit-only prefix에 대해서도 case 조회 가능 여부 선검증 추가 검토 |
| P2 | **audit-only dispatcher**: EVENT_NO_SHOW 제외 모든 prefix는 이의제기 시 원본 도메인 status가 변경되지 않음. UPHELD/REJECTED 후에도 원본 케이스 status 변경은 admin이 별도로 처리해야 함. | `DisputeAppealService.java:162-164` | appeal 결과가 원본 도메인(예: 정산 이의, 차단 이의)에 자동 반영되지 않음 | 향후 도메인별 sync dispatcher 추가 wave 필요 |
| ~~P2~~ **EVENT_NO_SHOW 해소(W14-S2, `07bdb38`)** | ~~appeal 기한 미구현~~: EVENT_NO_SHOW source는 `confirmedAt + 7일`(D-2 확정) 기한을 `createAppeal` 사전검증에서 적용(초과 시 `EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED` 409). 다른 source는 여전히 source별 기한 정책 미결. | `DisputeAppealService.java`(W14-S2), `EventNoShowService.validateAppealable` | EVENT_NO_SHOW 무기한 소명 차단. 그 외 source 기한은 후속. | EVENT_NO_SHOW 완료. 그 외 source별 기한 정책 결정 |
| P2 | **TRANSPORT(RS-002 P3-B) id-space**: `DisputeLegalHoldService`가 TRANSPORT prefix를 `reportRepository.findById(id)`로 조회. source row가 report를 전제. `DisputeSourceType.TRANSPORT`와 id-space 충돌 잠재. | `DisputeLegalHoldService.java:148-151` | TRANSPORT caseId로 이의제기 시 legal hold 조회 오류 가능 | TRANSPORT source id 정책 명확화 필요 |

## 9. 수용 기준

### AC-01. 이의제기 정상 생성

Given 로그인 사용자가 본인 케이스(`OPEN` status)에서 이의제기를 선택한다.
When `reasonCode=FACT_INCORRECT`, `reasonText="사실관계가 다릅니다. 현장에 없었습니다"`(26자)로 제출한다.
Then 서버가 HTTP 201을 반환하고 `AppealVo(status=PENDING)`을 응답한다. 케이스 상세 화면이 PENDING 배지를 표시한다.

### AC-02. 중복 이의제기 차단

Given 사용자가 동일 케이스에 PENDING 이의를 이미 보유한다.
When 동일 케이스에 이의제기를 재시도한다.
Then 서버가 409를 반환하고 Flutter가 에러 toast를 표시한다.

### AC-03. PENDING 이의 철회

Given 사용자가 PENDING 이의를 보유한다.
When `POST .../withdraw`를 호출한다.
Then `AppealVo(status=CLOSED)`가 반환되고 케이스 상세 화면이 CLOSED 배지를 표시한다.

### AC-04. 비PENDING 이의 철회 차단

Given 이의 status가 UPHELD 또는 REJECTED다.
When 사용자가 철회를 시도한다.
Then 서버가 409를 반환한다. Flutter는 `canWithdraw=false`이므로 철회 버튼을 표시하지 않는다.

### AC-05. EVENT_NO_SHOW 사전검증 + sync **(W14-S2 갱신)**

Given 케이스 caseId가 canonical `EVENT_NO_SHOW:{noShowId}` 형식이고, 소명자가 본인이며 `confirmedAt + 7일` 이내다.
When 이의제기를 제출한다.
Then 사전검증(존재·본인·기한·canonical) 통과 후 `dispute_appeal` insert가 성공하고 `EventNoShow.status`가 APPEALED로 전환된다.

### AC-05-B. EVENT_NO_SHOW 사전검증 실패 차단 **(W14-S2)**

Given caseId의 noShowId가 존재하지 않거나, 소명자가 본인이 아니거나, `confirmedAt + 7일`이 경과했거나, caseId가 canonical 형식과 불일치한다.
When 이의제기를 제출한다.
Then 사전검증이 실패를 전파해 `dispute_appeal`이 생성되지 않고 404/403/409가 반환된다(과거: 검증 실패를 삼키고 201을 반환하던 BLOCKER — 해소).

### AC-06. audit-only source 이의

Given 케이스 caseId가 `WARNING_APPEAL:{id}` 형식이다.
When 이의제기를 제출한다.
Then `dispute_appeal` insert만 발생하고 원본 `WarningAppeal` status는 변경되지 않는다.

### AC-07. WarningAppeal(F15-03)과의 경계

Given 사용자가 클럽 경고(F15-03)에 대해 이의를 제기하려 한다.
When F15-03 경로 `POST /api/v1/clubs/{clubId}/warnings/appeals`를 사용한다.
Then `WarningAppeal` 엔티티에 저장되고 `WarningAppealStatus`(SUBMITTED 등)로 관리된다. 본 F18-03 `dispute_appeal` 테이블과 무관하다. 단, F18-01 union 조회 시 `WARNING_APPEAL:{id}` caseId로 통합 뷰에 나타난다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | appeal 승인/거절 공개 endpoint | 호스트용 전이 endpoint 설계 및 구현 |
| 구현 | audit-only source sync dispatcher | 정산 이의, 경고 이의 등 원본 도메인 sync 추가 wave |
| ~~정책~~ EVENT_NO_SHOW 완료(W14-S2, D-2=7일) / 그 외 후속 | 이의제기 기한 | EVENT_NO_SHOW=`confirmedAt+7일` 적용. 그 외 source별 이의 가능 기한 정의는 후속 |
| 정책 | TRANSPORT source id-space | TRANSPORT caseId가 report.id를 가리키는지 명확화 |
| 테스트 | best-effort sync 실패 시나리오 | sync 실패해도 appeal insert 유지되는지 검증 |
