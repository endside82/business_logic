# F15-03. 이의제기 (Appeal) PRD

> **범위 경계**: 이 PRD는 **클럽 경고 이의제기(`WarningAppeal`)** 만 다룬다. `WarningAppealStatus`는 6값(`SUBMITTED/IN_REVIEW/ACCEPTED/PARTIALLY_ACCEPTED/REJECTED/WITHDRAWN`)이다. v3 통합 분쟁 이의(`DisputeAppeal`, 4값 `PENDING/UPHELD/REJECTED/CLOSED`)는 전혀 다른 도메인이며 `../../01_domain_prds/18_분쟁_해결_prd.md`(병렬 작성 중, 링크만)를 참조한다.

## 1. 결론

이의제기는 멤버가 본인에게 부여된 **활성 GRANT 원장 항목**(`targetGrantLedgerId`)에 대해 `POST /api/v1/clubs/{clubId}/warnings/appeals`로 제출하는 흐름이다. 서버 `WarningAppealService.submit`은 (a) 대상 ledger가 GRANT 타입이고 본인(`memberId`)·해당 클럽 소유인지, (b) 이미 REVERSE/EXPIRE되지 않았는지, (c) 같은 GRANT에 진행 중(SUBMITTED/IN_REVIEW) 이의가 없는지를 검증한 뒤 `SUBMITTED`로 저장한다. 종결된 이의(REJECTED/PARTIALLY_ACCEPTED/WITHDRAWN)가 있으면 재제기를 허용한다(진행 중 1건 제한만 적용). 본인 이의 목록은 `List<WarningAppealVo>`(Page 아님)로 내려오고, 진행 중 이의는 철회할 수 있다. Flutter `appeal_submit_screen.dart`/`my_appeals_screen.dart`/`warning_appeal_dialog.dart`가 이를 구현했다.

판정: **제출/조회/철회 정합은 닫혀 있다**. Gap은 (a) 제출 시 `description`만 필수이고 reason blank가 아니라 description blank를 `@NotBlank`로 막는데, 운영진 처리(F15-07)의 reason 누락은 `WARNING_APPEAL_NOT_FOUND`로 매핑되어 오해 소지, (b) 본인 이의 목록이 List라 페이지네이션 부재, (c) 14/28일 SLA 알림 스케줄러가 placeholder인 점이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningMemberController.java#submitAppeal/getMyAppeals/withdrawAppeal` | 멤버 이의 3엔드포인트 |
| Backend Service | `WarningAppealService.java#submit/getMyAppeals/withdraw/notifyOverdueAppeals` | 활성 GRANT 검증, 진행 중 1건, 철회, outbox `WarningAppealSubmitted` |
| Backend Service | `WarningLedgerService.java#getInvalidationStatus` | REVERSE/EXPIRE 무력화 검사 |
| Backend Param | `WarningAppealAddParam.java` | `targetGrantLedgerId@NotNull`, `description@NotBlank@Size(4000)`, `attachments?` |
| Backend VO | `WarningAppealVo.java` | 응답 필드, `resubmitAllowedAt/By` |
| Backend Enum | `WarningAppealStatus.java` | SUBMITTED/IN_REVIEW/ACCEPTED/PARTIALLY_ACCEPTED/REJECTED/WITHDRAWN |
| Backend Error | `ErrorCode.java` | `WARNING_APPEAL_NO_TARGET_GRANT`, `WARNING_APPEAL_DUPLICATE`, `WARNING_APPEAL_NOT_FOUND`, `WARNING_APPEAL_ALREADY_PROCESSED`, `WARNING_LEDGER_ALREADY_REVERSED/EXPIRED` |
| Backend DDL | `V1__init.sql` `warning_appeal` | FK `target_grant_ledger_id` → `warning_ledger`, 인덱스 |
| Backend Scheduler | `warning/scheduler/WarningAppealOverdueScheduler.java` | SLA 알림 스케줄 존재 여부 |
| Frontend API | `warning_member_api.dart#submitAppeal/getMyAppeals/withdrawAppeal` | 경로/메서드/List 반환 |
| Frontend Screen | `appeal_submit_screen.dart`, `my_appeals_screen.dart`, `widgets/warning_appeal_dialog.dart` | 제출/목록/철회 |
| Frontend Provider | `warning_member_providers.dart#warningMyAppeals` | List 구독 |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

1. 멤버가 본인 원장(F15-01)에서 활성 GRANT 항목을 선택 → `appeals/submit`(`Routes.clubWarningAppealSubmit`) → `AppealSubmitScreen` 또는 `warning_appeal_dialog`로 사유 입력.
2. `WarningMemberApi.submitAppeal` → `POST /warnings/appeals`(`WarningAppealAddParam{targetGrantLedgerId, description, attachments}`).
3. 서버 `submit`: ledger 조회 → GRANT 타입·본인·클럽 일치 확인(아니면 `WARNING_APPEAL_NO_TARGET_GRANT`) → `getInvalidationStatus`로 REVERSE/EXPIRE 검사 → 진행 중 이의 있으면 `WARNING_APPEAL_DUPLICATE` → `SUBMITTED` 저장.
4. audit log `APPEAL_SUBMITTED` + outbox `WarningAppealSubmitted` 발행, 201로 `WarningAppealVo` 반환.
5. `my-appeals`(`Routes.clubWarningMyAppeals`) → `MyAppealsScreen` → `warningMyAppealsProvider(clubId)` → `GET /warnings/me/appeals` → `List<WarningAppealVo>`(생성일 내림차순).
6. 철회: `POST /warnings/appeals/{appealId}/withdraw` → 본인 + 상태 ∈ {SUBMITTED, IN_REVIEW}일 때만 `WITHDRAWN`.

## 4. 서버 계약

### `POST /api/v1/clubs/{clubId}/warnings/appeals`
| 항목 | 실제 계약 |
|---|---|
| Controller | `WarningMemberController#submitAppeal` |
| 권한 | `requireClubMember` + 대상 GRANT 본인·클럽 소유 검증 |
| Body | `WarningAppealAddParam` |
| 응답 | `WarningAppealVo`, 201 CREATED |
| 검증 | GRANT 타입 / 본인·클럽 일치 / 미-REVERSE·미-EXPIRE / 진행 중 1건 |
| 실패 | `WARNING_APPEAL_NO_TARGET_GRANT`, `WARNING_LEDGER_ALREADY_REVERSED`, `WARNING_LEDGER_ALREADY_EXPIRED`, `WARNING_APPEAL_DUPLICATE` |

### `GET /api/v1/clubs/{clubId}/warnings/me/appeals`
| 항목 | 실제 계약 |
|---|---|
| 응답 | `List<WarningAppealVo>` (**Page 아님**) — `findByClubIdAndMemberIdOrderByCreatedAtDesc` |

### `POST /api/v1/clubs/{clubId}/warnings/appeals/{appealId}/withdraw`
| 항목 | 실제 계약 |
|---|---|
| 조건 | 본인 + 상태 ∈ {SUBMITTED, IN_REVIEW} |
| 실패 | 비본인 → `WARNING_APPEAL_NOT_FOUND`, 종결 → `WARNING_APPEAL_ALREADY_PROCESSED` |

`WarningAppealVo` 핵심: `id`, `clubId`, `memberId`, `targetGrantLedgerId`, `description`, `attachments`, `status:WarningAppealStatus`, `assignedTo`, `processedBy`, `processedAt`, `processReason`, `resultingLedgerId`, `resubmitAllowedAt`, `resubmitAllowedBy`, `createdAt`, `updatedAt`.

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `appeals/submit`, `my-appeals` (클럽 하위) |
| Screen | `AppealSubmitScreen`, `MyAppealsScreen` |
| Provider | `warningMyAppealsProvider(clubId)` (List) |
| Repository | `WarningMemberRepository.submitAppeal/getMyAppeals/withdrawAppeal` |
| Retrofit | `WarningMemberApi.submitAppeal/getMyAppeals/withdrawAppeal` |
| Widget | `warning_appeal_dialog.dart` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| 본인 활성 GRANT | 검증 통과 | 제출 폼 | 이의 SUBMITTED | 일치 |
| 비-GRANT 대상 | `WARNING_APPEAL_NO_TARGET_GRANT` | 에러 | 차단 | 일치 |
| 타인 GRANT 대상 | clubId/memberId 불일치 → `NO_TARGET_GRANT` | 에러 | 차단 | 일치 |
| 이미 REVERSE/EXPIRE GRANT | `WARNING_LEDGER_ALREADY_*` | 에러 | "이미 정정/만료됨" | 일치 |
| 진행 중 이의 존재 | `WARNING_APPEAL_DUPLICATE` | 에러 | "처리 중 이의 있음" | 일치 |
| 종결 후 재제기 | 진행 중 없으면 신규 허용 | 재제출 가능 | 새 이의 생성 | 일치 |
| 종결 이의 철회 | `WARNING_APPEAL_ALREADY_PROCESSED` | 에러 | 차단 | 일치 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 제출 응답 형태 | `WarningAppealVo` | VO | 일치 |
| 내 이의 목록 형태 | `List<WarningAppealVo>` | List | 일치(Page 아님) |
| `WarningAppealStatus` | 6값 | `warning_enums.dart` 동일 | 일치 |
| `targetGrantLedgerId` | Long@NotNull | Dart int | 일치 |
| `resubmitAllowedAt/By` | VO 포함 | Dart 모델 포함 | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | 진행 중 1건 제한이 동시 제출 경합에 취약할 수 있음 | `submit`이 조회→검사→저장이며 DB UNIQUE 제약 없음 | 동시 2건 제출 시 둘 다 SUBMITTED 가능 | 동시성 테스트 + 필요 시 부분 UNIQUE 또는 락 |
| P2 | 본인 이의 목록 List(페이지네이션 부재) | 서버 전체 반환 | 이의 누적 시 응답 비대 | 페이징 전환 검토 |
| P3 | SLA 알림 스케줄러 placeholder | `notifyOverdueAppeals`가 `findByClubIdAndStatus(0L, ...)` 더미 호출 | 14/28일 미처리 알림이 실제로 안 나감 | 전체 클럽 순회 쿼리 + 스케줄러 활성화 (F15-09와 함께) |

## 9. 수용 기준

### AC-01. 활성 GRANT 이의 제출
Given 멤버가 본인 활성 GRANT에 이의를 제출한다.
When `POST /warnings/appeals`가 유효한 `targetGrantLedgerId`/`description`으로 호출된다.
Then `status=SUBMITTED` row가 생성되고 outbox `WarningAppealSubmitted`가 발행된다.

### AC-02. 진행 중 이의 중복 차단
Given 같은 GRANT에 SUBMITTED 이의가 이미 있다.
When 멤버가 다시 이의를 제출한다.
Then 서버는 `WARNING_APPEAL_DUPLICATE`로 거절한다.

### AC-03. 무력화된 GRANT 이의 차단
Given 대상 GRANT가 이미 REVERSE되었다.
When 멤버가 이의를 제출한다.
Then 서버는 `WARNING_LEDGER_ALREADY_REVERSED`로 거절한다.

### AC-04. 종결 후 재제기
Given 멤버의 이전 이의가 REJECTED로 종결되었다.
When 같은 GRANT에 새 이의를 제출한다.
Then 진행 중 이의가 없으므로 신규 SUBMITTED 이의가 생성된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | 동시 제출 경합 | 진행 중 1건 보장을 DB 제약/락으로 강화할지 결정 |
| 구현 | SLA 알림 | `notifyOverdueAppeals` 전체 클럽 순회 + 스케줄러 활성화 |
| 테스트 | 이의 제출 분기 | 비-GRANT/타인/무력화/중복/재제기 E2E |
