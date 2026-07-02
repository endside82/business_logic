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

> (아래 9절은 2026-07-02 추가분)

> 소스: `UserDisputeCase` 엔티티, `user_dispute_case.active_dedup_key`

| 항목 | 정책 |
|---|---|
| 일일 rate-limit | POST /me/dispute-cases 429 반환으로 일일 생성 한도 제한 |
| 중복 제보 방지 | `active_dedup_key` GENERATED STORED 컬럼: 활성 케이스(OPEN/IN_REVIEW/ESCALATED) + 특정 target 존재 시 `{reporter}:{target}` UNIQUE 제약 → 동일 상대 중복 활성 분쟁 생성 차단 |
| 자기 분쟁 방지 | CHECK 제약: `target_user_id IS NULL OR target_user_id <> reporter_user_id` |
| legal hold 연동 | FK NO CASCADE — legal hold safety (date_block과 동일 정책) |

## 9. 접근권한 감사 교정 (2026-07-02) — 정보노출·차단 정책 변경

> 2026-06-30~07-02 전수 감사(21개 도메인·4개 웨이브)에서 확정·교정한 개인정보·안전 관련 정책 변경. 상세 근거는 `docs/audit/access-control-2026-06-30/` 참조.

### 9-1. 제재·경고·마일리지 self-view 스태프 신원 은닉

경고 및 마일리지 도메인의 멤버 대면 조회 응답에서 처리 스태프 신원을 은닉했다.

| 표면 | 은닉 필드 | 운영자(admin) 뷰 |
|---|---|---|
| 경고 원장·overview·내 신고·내 이의 | actorId, actorRole, revokedBy, assignedTo, processedBy, resubmitAllowedBy | 신원 유지 |
| 마일리지 원장·프로필카드·영수증 | actorId(지급/차감 처리자) | 신원 유지 |
| 배지 부여·회수 (self·타 멤버 프로필카드 포함) | awardedBy, revokedBy | 신원 유지 |

**의도**: 플랫폼 제재 self-view 선례(플랫폼 제재 VO의 처리자 은닉 패턴)와 일관. 제재한 스태프 신원이 피제재 멤버에게 노출되면 보복 벡터가 된다.

### 9-2. 신고자 익명성 (호스트 인박스)

이벤트 신고 알림(호스트 인박스)에서 신고자 ID를 제거했다. 교정 전에는 EVENT 유형 신고 카드에 `actorUserId=reporterId`가 포함되어 피신고 이벤트 호스트가 신고자 신원을 파악할 수 있었다.

**교정 후**: 호스트 인박스의 신고 카드에는 신고 내용·상태만 포함되며 신고자 신원은 미탑재. 운영팀 처리 큐에서는 신고자 ID 유지.

**불변식**: 앱 약속("신고 내용은 운영팀 검토에만 사용됩니다")과 정합. 신고자 익명성이 신고 파이프라인(신고→경고검토→제재) 진입 신뢰의 척추.

### 9-3. 차단 커버리지 확장

차단 관계가 반영되지 않던 두 표면을 교정했다.

| 표면 | 교정 전 | 교정 후 |
|---|---|---|
| 이벤트 실시간 위치 공유 (`getEventLocations`, `getAttendeeDistances`) | opt-in만 필터, 차단·현재 참석 미확인 | 현재 ATTENDING + 양방향 차단 제외 필터 추가 |
| 친구공개 가용성 (`getFriendsAvailabilities`) | 친구(isFriend) 여부만 확인, 차단 미검사 | 차단(isBlockedEither) 선차단 추가 |

**의도**: 차단한 상대방의 실시간 위치·일정 가용성이 노출되지 않아야 한다. 참석을 취소한 사용자의 마지막 좌표도 위치 read 시 현재 참석 재확인으로 제거된다.

**비변경(의도)**: 홈피드·검색·추천의 공개 이벤트는 차단 상대도 계속 노출(설계 범위 = 프로필·메시지·알림). 공개 콘텐츠 차단 적용 여부는 별도 제품 결정 대상.

### 9-4. 데이팅 사진 모더레이션 — APPROVED만 외부 노출

데이팅 사진 read 경로에 `deletedAtIsNull` + `moderationStatus=APPROVED` 필터를 추가했다.

| 경로 | 교정 전 | 교정 후 |
|---|---|---|
| 디스커버리 피드 | 삭제 포함 전체 | APPROVED + 미삭제만 |
| 채팅 아바타 | 동일 | 동일 |
| 타인 프로필 뷰어 아바타 | 동일 | 동일 |
| 자기 프로필 | 무필터(본인이 자기 사진 관리용) | 변경 없음 |

대상 상태: PENDING(검수 대기)·REJECTED(반려)·UNDER_REPORT(신고 접수 중) 사진은 외부에 노출되지 않는다.

### 9-5. 임시숨김 리뷰 본문·사유 마스킹

임시 숨김(temporarilyHidden) 처리된 리뷰의 본문과 호스트 사유가 모든 뷰어에게 전송되던 것을 교정했다.

| 필드 | 열람 가능자 |
|---|---|
| 리뷰 본문 (`content`) | 작성자·호스트 (임시숨김 시 타 뷰어에게 blank) |
| 숨김 사유 (`hiddenReasonText`) | 호스트만 (임시숨김 시 작성자 포함 타 뷰어에게 blank) |
| 상태·사유코드 | 모든 뷰어 (마스킹 없음, 상태 표시용) |

### 9-6. 신뢰점수 차단 게이트

`getTrustScore` 조회에 차단(isBlockedEither) 게이트를 추가했다. 형제 API인 `getScoreHistory`에는 이미 차단 게이트가 있었으며, 이번 교정으로 두 API가 일관된 정책을 갖게 됐다. 차단 관계에 있는 사용자의 신뢰점수는 USER_NOT_FOUND로 응답한다.

### 9-7. 타인 프로필 관계유형 티어 노출

타인 프로필 조회는 `ProfileRelationType`(SELF / MATCHED / SAME_CLUB / THIRD_PARTY)에 따라 노출 필드를 차등 투영한다.

| 관계 | 노출 수준 |
|---|---|
| SELF | 본인 전체 필드 |
| MATCHED (데이팅 매칭) | 확장 프로필 (데이팅 페르소나 범위, 원본 신원 미포함) |
| SAME_CLUB | 닉네임·사진·클럽 공개 필드 |
| THIRD_PARTY | 닉네임·사진만 |

이메일·생년 등 PII는 SELF(본인)만 수신. 차단 관계에서는 FORBIDDEN으로 선차단. 감사에서 이 티어링이 정확히 구현됐음이 검증됐다(PII 누수·IDOR 0).

### 9-8. 정산 이체 매트릭스 — 전체 투명성(의도)

ACTIVE/COMPLETED 상태의 모임 정산 이체 매트릭스(who-owes-whom, 참가자 전원의 분담 내역)는 **참가자 전원에게 공개**한다. 이는 n빵 정산의 의도적 설계다. 감사에서 검토됐으나 결함이 아님이 확인됐다.

정산 이의 목록(appeals 목록)은 타인 이의 내용이 포함되므로 **모임 생성자·호스트만** 열람 가능으로 교정됐다(위 정책과 별개).
