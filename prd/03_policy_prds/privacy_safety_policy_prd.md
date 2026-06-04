# 개인정보·안전 정책 PRD

<!-- supporting-doc-status: 2026-05-18 -->

> 문서 상태: **보조 문서**. 기능별 현재 계약, source trace, Gap/Risk 판단은 [PRD_MIGRATION_STATUS.md](../PRD_MIGRATION_STATUS.md)와 각 기능 PRD를 우선한다. 이 문서는 인벤토리, 정책, QA, 기획 운영 기준을 보조하며, 기능 세부 판단은 [FEATURE_PRD_STANDARD.md](../FEATURE_PRD_STANDARD.md) 기준으로 재확인한다.

## 1. 목적

위치, 데이팅, 신고, 차단, 데이터 내보내기, 계정 삭제처럼 사용자 피해가 큰 기능은 명시적 동의와 중지 동선, 복구 가능성을 우선한다.

## 2. 민감 기능

| 기능 | 핵심 원칙 |
|---|---|
| 위치 공유 | opt-in, 즉시 opt-out, 공유 상태 가시화 |
| 데이팅 인증 | 미인증 사용자의 핵심 기능 제한 |
| 차단 | 후보자, 매칭, 채팅 전반에 즉시 반영 |
| 신고 | 자기 신고와 중복 신고 방지 |
| 데이터 내보내기 | 처리중/완료/실패/만료 상태 명확화 |
| 계정 삭제 | 30일 유예와 취소 동선 제공 |
| 계정 비활성화 | 사전 점검과 강제 로그아웃 명확화 |

## 3. 수용 기준

- 사용자가 민감 기능을 켜고 끄는 방법을 모두 이해할 수 있어야 한다.
- 타인에게 노출되는 정보와 본인에게만 보이는 정보가 구분되어야 한다.
- 삭제, 차단, 신고, 위치 공유 중지는 즉시 화면 상태에 반영되어야 한다.

---

> 아래 섹션은 2026-06-05 추가분. 소스: `.delta_2026-06-04/` dossier 전수 확인.

## 4. 신고 유형 (ReportType) 전체 8종

> 소스: `ReportType.java:7-24`

| 값 (순번) | 설명 | 비고 |
|---|---|---|
| `USER(0)` | 사용자 신고 | 제재 자동화 대상 (USER 전용) |
| `EVENT(1)` | 이벤트 신고 | — |
| `REVIEW(2)` | 리뷰 신고 | legal hold 매칭 |
| `EVENT_PHOTO(3)` | 이벤트 사진 신고 | legal hold 매칭, UNDER_REPORT 상태 |
| `EVENT_MESSAGE(4)` | 이벤트 메시지 신고 | legal hold 매칭. soft-delete 중 신고 진행 시 unhide 차단 |
| `DATE_USER(5)` | 데이트 사용자 안전 신고 | RS-002 P3-A: 차단(`DateBlockParam.fileReport=true`) 시 자동 동시 생성. DateBlock.reportId 백필. |
| `CARPOOL(6)` | 카풀 운전자 안전 신고 | RS-002 P3-B: POST /api/v1/events/{eventId}/carpool/offers/{offerId}/report. targetId=운전자 userId, contextId=offerId. |
| `CLUB(7)` | 클럽 신고 | 2026-06-04 추가(commit 2d28572). v1 집행 서버 수동, 자동제재 USER 전용 유지. |

**ReportReason 전체 7값** (`ReportReason.java:7-13`): `HARASSMENT(1), INAPPROPRIATE(2), NO_SHOW(3), FRAUD(4), OTHER(5), LATE(6), BAD_MANNER(7)`

## 5. 신고 증빙 (EvidenceFileValidator)

> 소스: `EvidenceFileValidator.java` (file/service 패키지, @Service 공통화)

| 항목 | 정책 |
|---|---|
| 최대 파일 수 | 5개 (`evidenceFileIds.size() ≤ 5`) |
| 소유권 검증 | `file_metadata.uploaderUserId == callerUserId` 검증 |
| 용도/상태 검증 | 파일 상태 ACTIVE, 목적 일치 검증 |

증빙 첨부 가능 진입점:
- `POST /me/dispute-cases` (DisputeCaseCreateParam.evidenceFileIds)
- `POST /me/dispute-cases/{caseId}/appeals` (AppealCreateParam.evidenceFileIds)
- `POST /api/v1/events/{eventId}/no-shows` (NoShowConfirmParam.evidenceFileIds)
- `POST /api/v1/date/blocks/{targetUserId}` (DateBlockParam.evidenceFileIds)
- `POST /api/v1/reviews/{reviewId}/hide` (ReviewHideParam — autoEscalate 시 Report 자동 생성)

## 6. 분쟁 evidence Visibility 4종 및 legal hold/retention

> 소스: `Visibility.java`, `DisputeLegalHoldService.java`, `DisputeCaseRetentionScheduler.java`

**정책 의도 (4종 분류)**

| Visibility | 의미 | 조회 가능 역할 (정책 목표) |
|---|---|---|
| `PARTIES` | 분쟁 당사자 모두 | 신고자, 피신고자, 호스트 |
| `HOST_ONLY` | 호스트(및 운영팀)만 | 호스트, CS |
| `CS_ONLY` | CS/운영팀만 | CS |
| `PUBLIC_SUMMARY` | 공개 요약 | 모든 열람 가능자 |

**현재 구현 (소스 확인)**

public detail 조회(`DisputeCaseDetailVo` 빌더)에서 **CS_ONLY 항목만 제거**하는 필터만 존재. HOST_ONLY·PARTIES 분기를 역할별로 생성하는 builder 로직은 미구현 — 역할 기반 게이트는 정책 의도 단계. 서버 `Visibility.java` enum 4값은 정의됨, 실제 필터는 CS_ONLY 제거만 적용.

**Legal hold 적용 조건** (`DisputeLegalHoldService.java:103-107`):
- 케이스 상태 OPEN / IN_REVIEW / ESCALATED → evidence 삭제 차단, 데이터 삭제 차단
- 터미널(RESOLVED / CLOSED) → evidence 정리 대상

**Retention 정책** (`DisputeCaseRetentionScheduler`, 매일 05:00):
- terminal 상태 후 1년 경과 시 evidence S3 파일 + `file_metadata` row 제거
- 전부 삭제 성공 시에만 `evidence_file_ids` JSON 초기화 (일부 실패 시 재시도 보장)
- 7개 소스 대상: OperationalIssue(resolved_at), WarningReport(processed_at), WarningAppeal(processed_at), DATE_BLOCK(report.processed_at + terminal status), CLUB_MEMBERSHIP_ACTION(appeal.processed_at + non-PENDING), USER_DISPUTE(resolved_at + RESOLVED/CLOSED), Report(evidence_file_ids + terminal)

## 7. DateBlock 안전신고 + 소프트 전이

> 소스: `DateBlockController.java`, `DateBlockParam.java`, `DateBlockStatus.java`

| 항목 | 정책 |
|---|---|
| 차단 해제 방식 | hard delete → soft UNBLOCKED 전이 (이력 보존). `isBlockedBetween()` 체크는 BLOCKED row만 대상. |
| 안전신고 동시 생성 | `DateBlockParam.fileReport=true` 시 `ReportType.DATE_USER` 안전신고 자동 생성 + `DateBlock.reportId` 백필. |
| evidence 첨부 | `DateBlockParam.evidenceFileIds` (max 5) → `DateBlock.evidence_file_ids(json)` 저장 → dispute(SAFETY) evidence 사용 가능. |
| legal hold | 연결 report가 OPEN/IN_REVIEW/ESCALATED이면 DATE_BLOCK source에 legal hold 적용 (데이터 삭제 차단). |
| retention | RESOLVED/CLOSED 후 1년 경과 시 evidence 정리 (DisputeCaseRetentionScheduler 대상). |

## 8. 익명 표적 제보 방어 (USER_DISPUTE anti-abuse)

> 소스: `UserDisputeCase` 엔티티, `user_dispute_case.active_dedup_key`

| 항목 | 정책 |
|---|---|
| 일일 rate-limit | POST /me/dispute-cases 429 반환으로 일일 생성 한도 제한 |
| 중복 제보 방지 | `active_dedup_key` GENERATED STORED 컬럼: 활성 케이스(OPEN/IN_REVIEW/ESCALATED) + 특정 target 존재 시 `{reporter}:{target}` UNIQUE 제약 → 동일 상대 중복 활성 분쟁 생성 차단 |
| 자기 분쟁 방지 | CHECK 제약: `target_user_id IS NULL OR target_user_id <> reporter_user_id` |
| legal hold 연동 | FK NO CASCADE — legal hold safety (date_block과 동일 정책) |
