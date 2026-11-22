# 개인정보·안전 정책 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.


<!-- supporting-doc-status: 2026-09-02 -->

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

> 아래 섹션은 2026-06-05 추가분. 근거: 2026-06-04 델타 실사. 원문은 [문서 정리와 보관 위치](../../../docs/development/DOCUMENTATION_GUIDE.md#2026-09-28-문서-정리)의 외부 백업에 보관한다.

## 4. 신고 유형 (ReportType) 전체 13종

> 소스: `community_api`의 `ReportType.java`

| 값 (순번) | 설명 | 비고 |
|---|---|---|
| `USER(0)` | 사용자 신고 | 제재 자동화 대상 (USER 전용) |
| `EVENT(1)` | 이벤트 신고 | — |
| `REVIEW(2)` | 리뷰 신고 | legal hold 매칭 |
| `EVENT_PHOTO(3)` | 이벤트 사진 신고 | legal hold 매칭, UNDER_REPORT 상태 |
| `EVENT_MESSAGE(4)` | 이벤트 메시지 신고 | legal hold 매칭. soft-delete 중 신고 진행 시 unhide 차단 |
| `DATE_USER(5)` | 데이트 사용자 안전 신고 | RS-002 P3-A: 차단(`DateBlockParam.fileReport=true`) 시 자동 동시 생성. DateBlock.reportId 백필. |
| `CARPOOL(6)` | 승용차 주인 안전 신고 | `POST /api/v1/events/{eventId}/vehicles/{vehicleId}/report`. 서버가 차량 주인을 대상자로 정하고 `contextId=vehicleId`를 기록한다. |
| `CLUB(7)` | 클럽 신고 | 2026-06-04 추가. v1 집행 서버 수동, 자동제재 USER 전용 유지. |
| `COMMUNITY_MESSAGE(8)` | 커뮤니티 1:1 메시지 신고 | targetId=messageId, contextId=channelId. |
| `COMMUNITY_POST(9)` | 클럽 커뮤니티 게시글 신고 | targetId=postId. |
| `COMMUNITY_COMMENT(10)` | 클럽 커뮤니티 댓글 신고 | targetId=commentId, contextId=postId. |
| `DATE_PROFILE_PHOTO(11)` | 데이트 프로필 사진 신고 | 서로 다른 유효 사용자 5명의 신고가 모이면 사진을 즉시 숨긴다. |
| `BUS(12)` | 차량 자리 점유자 안전 신고 | `POST /api/v1/events/{eventId}/vehicles/{vehicleId}/seats/{seatNo}/report`. 서버가 현재 점유자를 대상자로 정하고 `contextId=seatId`를 기록한다. |

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
| 차단 출처 | 차단 행마다 건 곳(`DATING` 데이트에서 건 차단, `COMMUNITY` 커뮤니티 차단이 함께 만든 것)을 둔다. 차단은 건 곳에서 푼다 — 아래 11-1. |
| 안전신고 동시 생성 | `DateBlockParam.fileReport=true` 시 `ReportType.DATE_USER` 안전신고 자동 생성 + `DateBlock.reportId` 백필. |
| evidence 첨부 | `DateBlockParam.evidenceFileIds` (max 5) → `DateBlock.evidence_file_ids(json)` 저장 → dispute(SAFETY) evidence 사용 가능. |
| legal hold | 연결 report가 OPEN/IN_REVIEW/ESCALATED이면 DATE_BLOCK source에 legal hold 적용 (데이터 삭제 차단). |
| retention | RESOLVED/CLOSED 후 1년 경과 시 evidence 정리 (DisputeCaseRetentionScheduler 대상). |

## 8. 익명 표적 제보 방어 (USER_DISPUTE anti-abuse)

> (아래 9번 섹션은 2026-07-02 추가분)

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

## 10. 개인정보 발견·추천·데이팅 유입 정책 재실측 (2026-07-29)

### 10-1. 프로필 숨김과 발견 숨김은 별도 동의

`hideFromStrangers`는 무맥락 직접 프로필 열람을 제한하고, `hideFromSearch`는 사람 검색·만난 사람·추천 후보에서 제외한다. 검색 숨김만 켜도 직접 URL은 열릴 수 있고, 낯선 사람 숨김만 켜도 같은 클럽/증거등급 모임/MATCHED 맥락에는 프로필이 보일 수 있다. 두 값을 하나의 “계정 비공개”로 표현하지 않는다.

### 10-2. 사람 발견의 증거·차단 경계

사람 검색/만난 사람/추천의 공동참석은 체크인 운영 이벤트에서 양쪽 체크인, 무체크인 이벤트에서 양쪽 `ATTENDING` 및 확정/이의중 노쇼 아님을 요구한다. 만난 사람은 여기에 더해 무체크인 이벤트를 끝났고(`CLOSED`) 시작 시각이 지난 이벤트만 센다(2026-11-22) — 함께 참석 예정인 것과, 호스트가 열리기 전에 닫은 이벤트는 만난 증거가 아니다. 추천은 만난 사람과 같은 조회로 후보를 고르므로 후보에도 이 조건이 걸린다. 화면에 「함께한 모임 n회」 로 나가는 횟수(프로필의 관계 표시, 사람 검색, 추천 카드)도 만난 사람과 같은 조회로 세어 같은 두 사람이면 값이 같다 — 체크인한 이벤트와, 무체크인이면 끝났고 시작 시각이 지난 이벤트만 세고, 다가올 이벤트에 함께 신청만 한 것은 세지 않는다. 프로필의 「함께 참석」 칩(`CO_ATTENDED`)은 그 횟수가 1 이상일 때 붙고, 추천의 정렬 점수에 드는 공동참석 가산도 같은 횟수로 센다. 사람 검색에는 다가올 이벤트에만 함께 신청한 사람도 나오되 횟수는 0 이다. 만난 사람 목록은 검색 숨김·차단·활동하지 않는 회원을 빼므로 프로필에는 횟수가 있는데 목록에는 없는 사람이 있을 수 있다. 이 조건은 횟수와 칩에만 걸리며, 프로필이 열리는 조건·사람 검색의 후보 범위·1:1 메시지 자격은 각자의 규칙으로 따로 판정한다. 양방향 차단과 비정상 사용자 상태는 항상 제외한다. 받은 “다시 만나기” 선택은 후보 이유나 점수에 사용하지 않는다.

### 10-3. 데이팅 커뮤니티 데이터 옵트인

관심사 태그와 신뢰점수 유사도는 두 데이팅 프로필이 모두 `communityDataOptIn=true`일 때만 후보 점수에 포함한다. 미동의자를 0점 처리하지 않고 남은 데이팅 고유 성분을 재정규화한다. 종교 저장은 별도 명시 동의와 동의 시각이 필요하며 결격 필터 용도에 한정한다.

### 10-4. 본인 데이터 export/delete

Export는 받은 선택/상대 피드백을 제외하고 내가 작성한 이벤트 선택·인상 태그, 데이트 만남 피드백, trait 세션/응답/점수, 선언 선호와 behavior estimate를 포함한다. 현재 사용자 작성 `vibeTags` 누락은 정책 Gap이다. 삭제는 trait 개인 데이터와 취향/피드백/데이트 데이터를 지우되 법정 거래·active legal hold 증거를 보존한다.

## 11. 차단 출처와 차단 반영 표면 (2026-11-22 사용자 결정)

### 11-1. 차단은 건 곳에서 푼다

커뮤니티 차단은 데이트 쪽에도 차단을 함께 걸고(출처 `COMMUNITY`), 커뮤니티 화면의 차단 판정은 커뮤니티 차단과 데이트 차단을 함께 본다. 그래서 어느 쪽에서 차단해도 두 쪽 화면이 모두 막힌다. 푸는 것은 건 곳에서만 한다.

| 경우 | 결과 |
|---|---|
| 데이트 차단 목록(`GET /api/v1/date/blocks`) | 데이트에서 건 차단만 싣는다 |
| 커뮤니티 차단 목록(`GET /api/v1/users/me/blocks`) | 커뮤니티에서 건 차단과 데이트에서만 건 차단을 사람마다 한 줄로 싣고 줄마다 건 곳(`source`)을 단다. 양쪽에서 차단한 사람은 커뮤니티 줄 하나. 데이트에서만 건 줄에는 커뮤니티 프로필 사진 주소를 싣지 않고, 앱은 이름 첫 글자로 그린다(데이트에서 만난 사람의 커뮤니티 사진을 드러내지 않는다) |
| 커뮤니티 해제 | 커뮤니티 차단과 그것이 데이트 쪽에 함께 만든 차단을 푼다. 데이트에서 건 차단은 남는다 |
| 데이트 해제 | 데이트에서 건 차단만 푼다. 커뮤니티에서 건 차단이면 없는 차단과 같은 404 `NOT_FOUND` |
| 커뮤니티에서 차단한 사람을 데이트에서 또 차단 | 성공. 데이트에서 건 차단으로 올려 적고, 그 뒤 커뮤니티에서 풀어도 데이트 차단은 남는다 |
| 이미 데이트에서 차단한 사람을 안전신고 없이 다시 차단 | 서버는 409 `CONFLICT`(이미 차단됨). 앱은 실패로 안내하지 않고 차단된 상태로 다룬다 |
| 이미 데이트에서 차단한 사람을 안전신고와 함께 다시 차단 | 신고와 증빙을 기존 차단에 붙여 받는다(201). 차단 사유는 이번 요청의 것으로 바뀌고 차단 시각과 목록의 줄은 그대로다. 그 사람을 데이트 안전신고로 이미 신고한 적이 있으면 요청 전체를 거절한다(409 `REPORT_ALREADY_EXISTS`) — 차단은 그대로 살아 있고 이번 신고·증빙은 접수되지 않으며, 앱은 「이미 신고한 대상입니다」 를 보이고 사유 시트를 열어 둔다 |
| 양쪽에서 차단한 사람을 데이트에서 해제 | 204 이지만 풀지 않고 커뮤니티 차단으로 내려 적는다. 데이트 목록에서 빠지고 두 쪽 화면은 계속 막힌다. 커뮤니티에서 풀어야 다 풀린다 |

해제가 한 사람을 다른 목록으로 옮길 수 있으므로 앱은 어느 쪽에서 풀든 두 목록을 다시 읽는다. 다시 읽은 커뮤니티 차단 목록에 그 사람이 남아 있으면 해제했다고 안내하지 않고, 남은 줄이 건 곳에 따라 「데이트에서 건 차단이 남아 있어 계속 차단됩니다」 또는 「커뮤니티에서 건 차단이 남아 있어 계속 차단됩니다」 로 알린다(주의 토스트. 다시 읽기가 끝날 때 뜨고, 그사이 화면을 떠났으면 띄우지 않는다). 다시 읽기에 실패하면 평소의 해제 안내만 보인다.

### 11-2. 차단 반영 표면

| 표면 | 보는 사람과 차단 관계(어느 쪽이든, 커뮤니티·데이트 차단 모두)일 때 |
|---|---|
| 모임 후기 목록·받은 후기 목록 (`GET /api/v1/events/{eventId}/reviews`, `GET /api/v1/users/{userId}/reviews`) | 그 사람이 쓴 후기를 뺀다 |
| 위 두 목록과 모임 결과 카드의 주최자 답 | 답을 단 주최자와 차단 관계면 답(`reply`)을 싣지 않는다. 답 하나 조회는 없는 답과 같은 404 `REVIEW_REPLY_NOT_FOUND` |
| 데이트 매칭 목록·단건의 상대 이름·사진 | 이름·사진·사진 번호를 싣지 않는다(줄과 상대 번호는 그대로) |

후기 총계·모임 결과 카드의 후기 수·평균은 보는 사람마다 다시 세지 않는다.

데이트 매칭 목록·단건의 상대 이름·사진은 차단 관계가 아닐 때도 줄의 상태에 따라 싣는다. 매칭된(`MATCHED`) 줄은 대화방 목록과 같이 상대에게 데이트 프로필이 있으면 싣고, 매칭되지 않은 줄(응답 대기·거절·만료·차단)은 상대 데이트 프로필이 활성이고 전체 공개(`PUBLIC`)이며 본인확인이 지금 유효할 때만(후보 카드와 같은 조건) 싣는다. 그 밖이면 비워 보내고 앱은 「상대방」 으로 그린다.
