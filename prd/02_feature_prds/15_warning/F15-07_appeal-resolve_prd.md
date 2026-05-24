# F15-07. 이의제기 처리 PRD

## 1. 결론

이의제기 처리는 `WARNING_REVIEWER` 권한으로 `WarningAdminActionController`가 제공한다. `GET /appeals`(`Page<WarningAppealVo>`)로 이의를 검색하고, `POST /appeals/{appealId}/resolve`로 인용(`ACCEPTED`)·부분 인용(`PARTIALLY_ACCEPTED`)·기각(`REJECTED`)을 판정한다. 컨트롤러는 resolve 전에 `claimForReview`(SUBMITTED→IN_REVIEW)를 호출한다. 인용은 `WarningLedgerService.insertReverse`로 대상 GRANT를 REVERSE하고, 부분 인용은 `insertMitigate(mitigatePoints)`로 경감하며, 기각은 원장 변화 없이 상태만 바꾼다. 종결된 이의는 `POST /appeals/{appealId}/allow-resubmit`로 재제기를 허용할 수 있다(이의 row에 `resubmitAllowedAt/By`만 기록). 처리 결과는 audit + outbox `WarningAppealResolved`로 발행된다. Flutter `warning_appeal_inbox_screen.dart`가 이를 구현했다.

판정: **검색·판정·원장 연동·재제기 허용의 정합은 닫혀 있다**. Gap은 (a) resolve의 reason blank가 `WARNING_APPEAL_NOT_FOUND`로 매핑되어 오해, (b) 부분 인용 시 mitigatePoints가 null/0이면 `WARNING_MITIGATE_EXCEEDS_EFFECTIVE`로 던지는데 "초과"라는 의미와 다름, (c) allow-resubmit가 DB 컬럼만 기록하고 실제 재제기 시 이 허용을 강제 확인하지 않는 점(F15-03 submit은 진행 중 1건만 검사)이다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `WarningAdminActionController.java#searchAppeals/resolveAppeal/allowResubmit` | `WARNING_REVIEWER`, claim 선행 |
| Backend Service | `WarningAppealService.java#searchAdmin/claimForReview/resolve/allowResubmit/retrieveScoped` | 인용=REVERSE/부분=MITIGATE/기각, 재제기 추적 |
| Backend Service | `WarningLedgerService.java#insertReverse/insertMitigate` | 원장 연동 |
| Backend Param | `WarningAppealResolveParam.java` | `resolution@NotNull`, `mitigatePoints?`, `reasonCode?`, `reason?` |
| Backend VO | `WarningAppealVo.java` | `resultingLedgerId`, `resubmitAllowedAt/By` |
| Backend Enum | `WarningAppealStatus.java` | 6값(처리 가능: ACCEPTED/PARTIALLY_ACCEPTED/REJECTED) |
| Backend Error | `ErrorCode.java` | `WARNING_APPEAL_ALREADY_PROCESSED`, `WARNING_APPEAL_NOT_FOUND`, `WARNING_MITIGATE_EXCEEDS_EFFECTIVE` |
| Backend DDL | `V1__init.sql` `warning_appeal` | `resubmit_allowed_at/by`, `resulting_ledger_id` |
| Frontend API | `warning_admin_action_api.dart#searchAppeals/resolveAppeal/allowResubmit` | Page 응답 |
| Frontend Screen | `admin/warning_appeal_inbox_screen.dart` | 검토함/판정 |
| Verification | (해당 없음) | 전용 자동화 테스트 미확인 |

## 3. 전체 동작 흐름

1. WARNING_REVIEWER가 `appeals`(`Routes.adminWarningAppeals`) → `WarningAppealInboxScreen(clubId)` → `GET /appeals`(`WarningAppealSearchParam`) → `Page<WarningAppealVo>`.
2. 항목 처리 → `POST /appeals/{appealId}/resolve`(`WarningAppealResolveParam{resolution, mitigatePoints?, reasonCode?, reason}`). 컨트롤러가 `claimForReview`(SUBMITTED→IN_REVIEW) 후 `resolve` 호출.
3. `resolve`: 종결 상태면 `WARNING_APPEAL_ALREADY_PROCESSED`, resolution이 SUBMITTED/IN_REVIEW/WITHDRAWN이면 거절, reason blank면 `WARNING_APPEAL_NOT_FOUND`.
   - `ACCEPTED` → `insertReverse(targetGrantLedgerId, reasonCode||"APPEAL_GRANTED", reason)` → `resultingLedgerId` 설정.
   - `PARTIALLY_ACCEPTED` → mitigatePoints>0 필수, `insertMitigate(...)` → `resultingLedgerId` 설정.
   - `REJECTED` → 원장 변화 없음.
4. appeal `status=resolution`, `processedBy/At`, `processReason`, `resultingLedgerId` 설정 → audit `APPEAL_RESOLVED_{status}` + outbox `WarningAppealResolved`.
5. 재제기 허용: `POST /appeals/{appealId}/allow-resubmit` → 종결(REJECTED/PARTIALLY_ACCEPTED/WITHDRAWN)에서만 의미, `resubmitAllowedAt/By` 기록 + outbox `WarningAppealResubmitAllowed`.

## 4. 서버 계약

### `GET /api/v1/admin/clubs/{clubId}/warnings/appeals`
| 항목 | 실제 계약 |
|---|---|
| 권한 | `WARNING_REVIEWER` |
| Query | `WarningAppealSearchParam`(`@ModelAttribute`) |
| 응답 | `Page<WarningAppealVo>` |

### `POST .../appeals/{appealId}/resolve`
| 항목 | 실제 계약 |
|---|---|
| 선행 | `claimForReview`(SUBMITTED→IN_REVIEW; 이미 IN_REVIEW 아니면 `WARNING_APPEAL_ALREADY_PROCESSED`) |
| Body | `WarningAppealResolveParam{resolution@NotNull, mitigatePoints?, reasonCode?@Size(40), reason?@Size(4000)}` |
| 인용 | `ACCEPTED` → REVERSE 원장 생성 |
| 부분 인용 | `PARTIALLY_ACCEPTED` → mitigatePoints>0 필수, MITIGATE 원장 생성 |
| 기각 | `REJECTED` → 원장 변화 없음 |
| 실패 | 종결 → `WARNING_APPEAL_ALREADY_PROCESSED`, 잘못된 resolution → `ALREADY_PROCESSED`, reason blank → `WARNING_APPEAL_NOT_FOUND`, mitigatePoints≤0 → `WARNING_MITIGATE_EXCEEDS_EFFECTIVE` |
| 응답 | `WarningAppealVo` |

### `POST .../appeals/{appealId}/allow-resubmit`
| 항목 | 실제 계약 |
|---|---|
| 조건 | 종결 상태(SUBMITTED/IN_REVIEW면 `WARNING_APPEAL_ALREADY_PROCESSED`) |
| 부수 | `resubmit_allowed_at/by` 기록, outbox `WarningAppealResubmitAllowed`, 이의 status 자체는 불변 |
| 응답 | `WarningAppealVo`(참고용) |

## 5. 프론트 계약

| 항목 | 실제 구현 |
|---|---|
| Route | `appeals`(`Routes.adminWarningAppeals`) |
| Screen | `WarningAppealInboxScreen` |
| Repository | `WarningAdminActionRepository` |
| Retrofit | `WarningAdminActionApi.searchAppeals`(Page)/`resolveAppeal`/`allowResubmit` |

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|
| WARNING_REVIEWER | 클래스 권한 | 검토함 진입 | 판정 가능 | 일치 |
| 인용(ACCEPTED) | `insertReverse` | 인용 액션 | GRANT REVERSE + 점수 하락 | 일치 |
| 부분 인용 | `insertMitigate(mitigatePoints)` | 부분 인용 | 점수 일부 경감 | 일치 |
| 기각(REJECTED) | 원장 변화 없음 | 기각 | 점수 유지 | 일치 |
| 종결 이의 재처리 | `WARNING_APPEAL_ALREADY_PROCESSED` | 에러 | 차단 | 일치 |
| 부분 인용 mitigatePoints 누락 | `WARNING_MITIGATE_EXCEEDS_EFFECTIVE` | 에러 | 차단(의미 모호) | Risk(아래) |
| reason 누락 | `WARNING_APPEAL_NOT_FOUND` | 에러 | 차단(의미 모호) | Risk(아래) |
| 재제기 허용 | `resubmit_allowed_at/by` 기록 | 안내 | 멤버 재제기 안내 | 부분 동작 Gap |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| 검토함 응답 형태 | `Page<WarningAppealVo>` | `PageResponse` | 일치 |
| 판정 응답 형태 | `WarningAppealVo` | VO | 일치 |
| `WarningAppealStatus` | 6값 | enum 동일 | 일치 |
| 인용→원장 | REVERSE / MITIGATE | VO `resultingLedgerId` | 일치 |
| allow-resubmit 추적 | `resubmitAllowedAt/By` | VO 필드 포함 | 일치(강제는 안 함) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P2 | reason blank가 `WARNING_APPEAL_NOT_FOUND`로 매핑 | `resolve`가 reason 없으면 NOT_FOUND throw | 운영진이 "이의 없음"으로 오해 | `WARNING_REASON_REQUIRED`로 통일 |
| P2 | 부분 인용 points 누락이 `MITIGATE_EXCEEDS_EFFECTIVE`로 매핑 | mitigatePoints≤0면 해당 코드 throw | "초과" 에러로 오해 | 전용 검증 메시지/코드 분리 |
| P3 | allow-resubmit가 강제 가드 없음 | submit(F15-03)은 진행 중 1건만 검사, `resubmitAllowedAt`를 확인하지 않음 | 운영진이 허용하지 않아도 종결 후 재제기 가능 — 허용 기록의 실효성 약함 | 재제기 정책(허용 필수 여부) 확정 후 submit에 반영 |

## 9. 수용 기준

### AC-01. 이의 인용 → REVERSE
Given WARNING_REVIEWER가 이의를 `ACCEPTED`로 판정한다(reason 포함).
When `POST .../appeals/{appealId}/resolve`가 호출된다.
Then 대상 GRANT가 REVERSE되고 appeal에 `resultingLedgerId`가 연결되며 멤버 effective_score가 하락한다.

### AC-02. 부분 인용 → MITIGATE
Given WARNING_REVIEWER가 `PARTIALLY_ACCEPTED`, mitigatePoints=1로 판정한다.
When resolve가 호출된다.
Then MITIGATE 원장 1건(points=1)이 생성되고 effective_score가 1 감소한다.

### AC-03. 기각
Given WARNING_REVIEWER가 이의를 `REJECTED`로 판정한다.
When resolve가 호출된다.
Then 원장 변화 없이 appeal `status=REJECTED`, outbox `WarningAppealResolved`가 발행된다.

### AC-04. 종결 이의 재제기 허용
Given 이의가 REJECTED로 종결되었다.
When `POST .../appeals/{appealId}/allow-resubmit`가 호출된다.
Then `resubmitAllowedAt/By`가 기록되고 outbox `WarningAppealResubmitAllowed`가 발행된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| UX | 에러 매핑 | resolve reason/points 누락을 전용 코드로 분리 |
| 정책 | 재제기 허용 강제 | submit에서 `resubmitAllowedAt` 확인을 강제할지 결정 |
| 테스트 | 이의 처리 | 인용/부분/기각 원장 연동 + 종결 재처리 + allow-resubmit E2E |
