# PRD 문서 상태표

> 업데이트: 2026-07-29. `business_logic/prd/02_feature_prds`에 기능 PRD 175개가 등록되어 있다. 상태 컬럼은 각 기능 PRD의 실제 `문서 상태` 문구 또는 source-first 본문을 기준으로 갱신한다. 이 표는 구현 완료표가 아니라, PRD가 어떤 원천과 어느 수준의 소스 대조로 작성됐는지 보여주는 문서 운영 인벤토리다.
>
> v4.5 W1~W7 이벤트 확장 슬라이스에서 PRD 5개(F03-13~17)가 추가됐다.
> 당시 단일 master plan 등 `docs/plan/event-extensions/` 산출물 3개는 실코드 병합 뒤
> 2026-06-05 폐기됐다. 현재 계약은 각 기능 PRD와 `community_api` 실제 소스가 기준이며,
> V1__init.sql 단일 마이그레이션 파일 원칙을 유지한다.
>
> **2026-05-28 운영 원칙 명시 — units/ 부재 = source-first.** F03-13~18 / F04-17 / F08-14~15 / F15-01~09 / F16-01~08 / F17-01~10 (총 36개 신규 PRD, 2026-06-05에 F03-19~20 / F04-18 / F11-07 / F18-01~05 / F19-01~03 / F20-01~03 15개 추가로 총 51개), 이후 F21-01~07 7개가 추가되어 현재 58개 기능은 `business_logic/units/<domain>/<feature>/` 폴더 없이 작성된다. canonical은 실제 Controller/Service/DTO/enum/DDL/test와 App/Admin 소비부이며, plan·구현 리포트는 설계 배경으로만 사용한다. F03-13~17은 `EnumReservationTest`가 enum registry만 검증하고, F15·F16은 `community_api/src/main/java/com/endside/community/{warning,mileage}/`, F21은 API/App/Admin 제공자·약관·배정·원장 소스를 직접 대조한다. units/ 새로 만들면 운영 모델이 깨진다 — 만들지 않는다.

## 요약

| 항목 | 개수 |
| --- | ---: |
| **현재 총 기능 PRD (2026-07-29)** | **175** |
| Golden sample | 1 |
| 실사 기반 전환본 | 115 |
| 실사 기반 갱신본 | 1 |
| 실사 기반 신규 작성 | 1 |
| 신규 PRD | 7 |
| source-first 구현 확인 | 42 |
| source-first PRD | 5 |
| source-first 부분 구현 | 3 |
| 누락/확인 필요 | 0 |

## 2026-07-29 — 현재 소스 직접 재실측 (기능 수 증감 없음)

`community_api be38d128b80d`, `community_app cb21bce8ef08`,
`community-realtime 2d9215e56781`, `community_admin_api e507ab96a9fe`를 기준으로
15개 도메인의 50개 기능 PRD/HTML을 다시 대조했다. API 존재와 Flutter 사용자 도달성을 분리하고,
capability·enum·nullable·상태 전이·알림 설정·비동기 side effect를 실제 caller까지 확인했다.

대표적으로 이벤트 detail/capacity/reschedule/no-show, 혼합 정산 은행분 확인, 플랜 block revision,
정기모임 enum/세션 UI, 위치 공유·privacy·directions, 사람 추천/검색/핏, 제공자 marketplace terms·fee·
fulfillment 계약을 교정했다. 미배선과 권한/path scope·보안 후보는 완료 처리하지 않고 Gap/Risk로 남겼다.
전체 기준점과 파일 범위는
`05_planning_artifacts/current_source_update_2026-07-29.md`가 canonical이다.

## 2026-07-08 — 현재 소스 동기화 (기능 수 증감 없음, 기존 PRD/Docs 갱신)

2026-06-24 도메인 21 추가 이후 구현된 소스 변경을 기존 175개 기능 체계에 흡수했다. 신규 도메인·기능 ID는 만들지 않는다. 기준 노트: `05_planning_artifacts/current_source_update_2026-07-08.md`.

| 묶음 | 영향 PRD/Docs | 반영 내용 |
| --- | --- | --- |
| 게스트 동반 예매 | F03-05/06/07/08/13/20, 이벤트/결제 문서 | 예매 소유자 기준 게스트 attendance row, `partySize`/`guestNames`/`payableAmount`, 일행 관리, 증분 결제, 라인 환불, 호스트 강제환불, 게스트 노쇼 소유자 패널티. 현재 워크트리의 event-first lock order hardening도 deadlock 방지 사실로 기록. |
| 궁합/핏 Phase 0 | F11-01/05/06, F09-06, F01-07/F13-04, 개인정보 정책 | GraphQL 추천·legacy PreferenceRating/TasteNeighbor 중심 서술을 제거하고 이벤트 피드백/데이트 만남 피드백/InterestTag 카탈로그/데이터 내보내기·삭제 포함 기준으로 갱신. |
| 플랜 블록 에디터/공유 | F08-02/03/05/10/11 | preview teaser, 작성자 선택 sample preview, Kakao/system share, URL bookmark 제안, 모바일 IME 분할, course map, 체크리스트/시간표 정리. |
| 위치·길찾기 | F14-04/05/06 | 주소→좌표 geocode 추가, reverse geocode와 함께 Kakao Local 양방향 lookup, location privacy access-log 소비, 저장 주소/현재 위치 출발지와 좌표 null guard. |
| 연결성/커뮤니티 메시지 | 정책/도메인 노트 | Person access policy, block/report, 공통 맥락 한정 커뮤니티 메시지와 `/community-chat` realtime namespace는 현재 소스에 있으나 2026-07-08에는 신규 기능 ID로 승격하지 않는다. |
| 재사용 경험 루프 | F03 반복/리스케줄, F04 recurrence, F17, 결제 정책 | 이전 이벤트/정기모임/클럽 반복을 다음 실행으로 잇는 loop와 유료 반복·정기모임 세션·host cost type·비공개 clone 안전장치 반영. |

## 2026-06-06 — EVENT 결제 표준화·무료 포인트 호스트 전달 (기능 수 증감 없음, §7 사실/§8 Gap 갱신)

이벤트 참가비 결제·환불을 표준 결제·환불 경로로 통합해 분리정산 flow-through를 완성했다(신규 PRD 없음 — 기존 followup 종결 + §7/§8 갱신). 정본: 정책 PRD §2.6 + `community_api/docs/plan/POINT_POLICY_DECOUPLING_PLAN.md` §3.5. 커밋: community_api `7d9f2cf` / community_admin_api `270b1f9`.

| 문서 | 반영 내용 |
| --- | --- |
| 정책 PRD §2.5·§2.6·§5(D8)·§6.1-B | EVENT flow-through 완성 표기, 결제 표준화·무료 매출 호스트 전달 정책 신설, D8 결제 경로 통합 갱신, 구식 통로 2개 차단 |
| 06 도메인 PRD §5.1·§6(F06-06)·§9 | 이벤트 참가비 flow-through 편입, live 결제 경로 갱신(구식 endpoint 차단 표기), 변경 이력 추가 |
| F03-13 §7·§8 | 결제 표준 차감 경로 직접 호출(충전 단위 추적·롤백), 환불 표준 경로 수렴, 구식 메서드 차단 |
| F06-06 §4·§7·§8 | 결제 split flow-through 편입(EVENT 미이관 followup 종결), 환불 통화별 누적 한도 |
| F06-10 §7·§8 | free-only 정산 생성(수수료·세금 0)·무료분 호스트 지급 분개·정산 후 무료 환불 PROMOTION_EXPENSE 흡수, admin 미러 |

잔여(이번 변경과 무관, 비-blocker): 미사용 legacy 차감 메서드 4종 cleanup, 외부 출금 시 충전 단위 소비 추적, 마켓/번들 무료 전용 가격 명시적 해제 기능, free-burn 결제 시점 PROMOTION_EXPENSE 분개.

## 2026-06-06 — 돈 흐름 무결성 (기능 수 증감 없음, 기존 §7 사실/§8 Gap 갱신)

2026-06-05 돈·포인트 흐름 전수 감사(`docs/audit/money-flow-2026-06-05/REPORT.md` — CRITICAL 6·HIGH 20·MED 11·LOW 3) → 라운드 1·2 + MED 백로그 + 납부 동시성으로 전 40건 + MED 백로그 종결. 커밋 범위: community_api `a7876aa..2e0ba2a`, community_admin_api `9eafc0e..aba730e`. 신규 FNN-MM 기능은 추가하지 않고, 기존 기능 PRD의 §7 사실/§8 Gap을 소스(현 HEAD) 직접 인용으로 갱신했다. 운영 신규 기능(원천세 납부 등)은 해당 도메인 기존 기능/정책 PRD에 운영 절차·사실로 기술.

| 문서 | 반영 내용 |
| --- | --- |
| F06-01 §8 | 외부출금 정산 크레딧 이중사용 차단(C1 — 원장 기반 출금게이트+reserve+RESTORE_RESERVE) |
| F06-02 §8 | 충전취소 PG 실패 처리(H14) + 응답유실 PG 게이트 |
| F06-06 §4.3·§8 | refundToWallet split 미보존 영구 Gap 해소(H1/H2/H7 — 7경로 refundByTransaction 전환·본체 차단) |
| F06-08 §4·§8 | 구독 자동갱신 이중과금 방지(C6)·환불 split 복원/REFUNDING(H1/H10)·만료 락(MED) |
| F06-10 §5.2·§8 | 정산 triple-entry(H0)·원천세 방향 정정+납부 액션(MED)·정산 FAILED 5일 감시(MED)·지급명세서 환불 반영·payout NOOP 게이트 |
| F07-03 §8 | EQUAL 음수 share 방지(MED)·취소 역분개 split 복원(C2/H1) |
| F07-05 §4·§8 | 모임정산 수취 회계 정식화(RECEIVABLE clearing)·출금자격 수취자 귀속(C1/C2)·역분개 split(H1) |
| F07-06 §4·§8 | 송금 제안 반올림 합 보존(H19)·POINT_COMPENSATION 실입금(H12)·BANK_AWAITING admin 전이(H13)·REVERSAL 소진 재처리+경보(MED) |
| F07-08(F17) §3.6·§8 | RM 환불 실패 실금액 기록(MED/LOW)·BANK 환불요청 SLA(MED) |
| F04-14 §8 | 기부 취소·폐쇄 환불 split 보존(H1)·기금 drain 장부 대칭(H5) |
| F04-15 §8 | 미수금 상계 장부(H6)·클럽 출금 원천세 분개 정정 |
| F04-16 §8 | 클럽구독 환불=지갑 부담분 일할 기준+internal 위임+REFUNDING(C3/C4/H1) |
| F08-11 §8 | 마켓 구매 동시성 직렬화(H16) |
| F08-14 §13.1 | 마켓 이중환불 차단(C5)·환불 split 복원/회계-지갑 일치(H1/H7)·claw-back 부분회수(H17)·무료분 장부(H3) |
| F08-15 §3.4a | 마켓 무료분 정산 장부 분개(H3) |
| F03-13 §8 | BANK 환불요청 escalation 부분 구현. non-locking/no-version 환불 경합 위험은 미해소 |
| F03-19 §4-7 | 일정변경 가격-선결제 동기(H9) |
| `00_prd_items/08_state_transitions.md` §17 | 신규 운영 상태(Subscription/ClubSubscription REFUNDING·FailedRefund PROCESSING·WithdrawalDeadLetterAction REQUEUE/RESTORE_RESERVE) + 회계/감시 부수효과 |
| `03_policy_prds/payment_settlement_policy_prd.md` §2.6·§6.1-B·§6.3 | 돈 흐름 무결성 정책 신설(환불 split/admin 위임/멱등/출금자격/원천세/대사/감시/동시성) + 기존 Known Gap 2건 해소 |

잔여(범위 밖, PG 계약 의존): 충전취소 응답유실 보정·출금 provider 멱등 검증(release-gate `05_pg.md` 등재) + 가상계좌 webhook TODO. ~~EVENT 결제 측 `spend()` 이관(flow-through화)~~ → **해소 (2026-06-06, 아래 EVENT 결제 표준화 절)**. appeal 첨부 그룹 API는 별도 followup.

## 2026-06-06 — W14 앱 슬라이스 4건 상태 반영 (기능 수 증감 없음, Gap 상태만 변경)

community_app `3cb12ac`(W14)의 앱 슬라이스 4건을 관련 PRD/도메인 HTML에 반영했다(신규 PRD 없음 — 기존 Gap → 해소). **S1 분쟁 알림 딥링크**: REFUND_DISPUTE 92/93/94가 `REFUND_DISPUTE:{id}`→`/me/disputes/:caseId`로 배선 + 앱 `NotificationType` enum에 분쟁 3종·FAVORITE_PERSON_NEW_EVENT 등재 → F12-01·F18-01·F18-05 딥링크 Gap **부분 해소**(USER_DISPUTE/CLUB_MEMBERSHIP_ACTION/DATE_BLOCK은 서버 caseId prefix로만 존재 — 사용자 알림 NotificationType[분쟁은 92~94뿐]·발송 경로가 서버에 없어[`DomainOutboxEventMapper` DISPUTE unsupported, SLA 스캐너는 운영자 경보] 클라 라우팅 누락 "잔존"이 아니라 서버 알림 신설 선행 영역), F19-02 enum 미등재 Gap **해소**. **S3 1:1 문의(F20-01)**: 앱 풀스택(목록/상세/작성 + `/profile/inquiries` 라우트 + 마이페이지 메뉴) 구현 → §1·§5·§7·§8 P0·§10 **해소**. **S4 증빙 첨부**: 통합 분쟁 접수(F18-02)에 `EvidencePickerField`(최대 5) 배선 → P1 evidence Gap **해소**. 단 마켓 환불 분쟁(F08-14)은 `evidenceFileGroupId`(그룹 생성 API 부재) **서버 계약 갭**으로 §13에 신규 등재. **S5 환불 템플릿(F03-13)**: 호스트 폼 카탈로그 6종 picker 교체(STRICT/FLEXIBLE 선택 불가 해소), 상세·신청 확인 `effectiveRulesJson`(by_time) 전환, 취소 시트 서버 preview 단일 출처 → §10 호스트 UI Gap·병렬 모순 Gap **해소**. 도메인 HTML 반영: `18-dispute.html`(딥링크·증빙), `20-support.html`(1:1 문의 앱).

## 2026-06-06 — W14 서버 슬라이스 S2·S6·S7 + S8 문서 정합화 (기능 수 증감 없음, Gap 상태/통념 정정)

community_api `07bdb38`(S2)/`6faa833`(S6)/`c7fd7e4`(S7)의 서버 3슬라이스를 관련 PRD/도메인 HTML에 반영하고(신규 PRD 없음 — 기존 Gap 해소 + 통념 정정), R-레지스터(R-8)·WORKBOARD 모순·BACKLOG 구식 티켓을 함께 정정했다. canonical: 루트 `docs/plan/REMAINING_GAPS_EXECUTION_PLAN.md` §8 Phase 결과(서버 슬라이스) + §7 확정 D-결정.

- **S2 노쇼 마감 (F03-20, F18-03)**: cohost 권한 버그 해소(`EventAttendanceManagerGuard` 단일 추출 — `canManageAttendance` 미보유 cohost 차단, G-6 해소), 소명 기한 `confirmedAt+7일`(`EVENT_NO_SHOW_APPEAL_DEADLINE_PASSED` 400036, D-2, G-3 해소), 앱 appeal/overturn/batch 배선(`NoShowManageSection` host/coHost/staff + 참가자 소명 CTA, G-1 해소). 통합 분쟁 경로 사전검증(F18-03): `DisputeAppealService.createAppeal`이 EVENT_NO_SHOW에 대해 save 전 기한·본인·canonical caseId 검증·실패 전파(과거 검증 실패를 삼키고 201 반환하던 BLOCKER 해소). → F03-20 §1·§4·§5·§6·§7·§8 G-1/G-3/G-6·§10, F18-03 §1·§3·§4·§6·§8·§10·AC, `F03-20.html`(소명 기한 미정→7일·red-flag 2건) **해소**.
- **S6 제재 집행 마감 (F15-08, 도메인 15)**: `EVENT_HOST_RESTRICT` 6경로 집행(클럽 이벤트·클럽 레거시 반복·정기모임 생성·세션 3경로·플랜 기반·일반 반복 자식), `DATE_PROFILE_BLOCK` 실집행(생성·활성 전환, 1600028), `GET /api/v1/users/me/sanctions`(`UserSanctionController`) 신설 → 해당 §8 Gap **해소**. **"강퇴 시 구독 정리" Gap은 D-6 무코드 처분으로 허구 정정**(ClubSubscription 오너 전용 — 멤버 보유 구독 부재, 가입비는 기존 전액 환불로 완결). **신규 후속 1건 등재**: 기활성 데이팅 프로필 매칭 노출(제재 부여 시 비활성화 미수행, §8 P2). → F15-08 §1·§2·§4-A·§4-B·§7·§8·§10·AC, 도메인 15 PRD, `15-warning.html`·`F15-08.html` red-flag 정정.
- **R-8 정정**: F15-08·도메인 15 PRD의 "PlatformSanction admin grant/revoke 미확인/미배선" stale 표기를 community_admin_api `PlatformSanctionAdminController` 배선 확인(2026-06-06 실측)으로 정정.
- **S7 정리성 부채 (F07-03, F07-04)**: DRAFT 정산 30일 자동 정리(신규 `MeetingSettlementDraftCleanupScheduler` — CANCELLED 전이+PENDING 수동 transfer 동반 취소, D-3), `activateSettlement` 대상자 검증(holder∪share∪manual transfer 당사자 ⊆ 실참석자∪host, `MEETING_SETTLEMENT_SUBJECT_NOT_IN_SETTLEMENT` 2000025, D-4) → F07-03 §4·§8, F07-04 §8(DRAFT 자동정리 P3 Gap)·`F07-04.html` red-flag **해소**. **D-5 무변경 처분**(user 실삭제 없음=익명화 전용·club soft-close → cascade 발화 부재, DDL 유지).
- **S8 문서 정합화(루트 docs, 본 repo 외)**: `IMPLEMENTATION_WORKBOARD.md`(W13C 내부 모순 정정 — Verification Log 완료 기준으로 Lane 2 행·Recommended Execution Order 정합화, W14 Status→In Progress S1~S7 완료/S8 마무리), `docs/todo/BACKLOG.md`(O-004 MULTI_TIER 환불 티켓 → D-1 카탈로그 6종 체계로 대체 표기), `REMAINING_GAPS_EXECUTION_PLAN.md`(§8 Phase 결과 서버 슬라이스 + §7 D-6 무코드 추기).

## 2026-06-05 (3차) — 지갑 모임정산 목록 화면 후속 슬라이스 완료 반영

D-OPEN-2의 마지막 후속(지갑 "내 모임정산 목록" 화면, api c8977c5 / app 8c60999)이 구현·커밋되어 관련 Gap을 해소 처리했다. F07-10(§4 엔드포인트 행·§7-A·§8 Gap), F07-04(§7-A 발견 경로·§8 read 게이트 Gap), 07 도메인 PRD(cross-ref ⑤⑥·API 행), 05_feature_definitions F07-10 행 갱신. 핵심: 목록 행 `eventTitle` 배치 enrich(서버), 앱 read 게이트 재구성(캐시 기반 빠른 통과 + `getMyShares` BE 판정 폴백 — 게이트의 이벤트 상세 조회 부작용 제거, 비ATTENDING share 당사자·DRAFT 이벤트 정산 당사자 진입 해소), 지갑 메인 진입 카드, UI/UX 스펙 SCR-PA-005 신설(community_api docs). Codex diff 리뷰 최종 BLOCKER/MAJOR 0.

## 2026-06-05 (2차) — DRAFT 정산 미리보기 정식화(D-OPEN-2 해소) 반영

같은 날 community_api 426c26d·94c4869 + community_app 7ba69c0으로 구현·커밋된 D-OPEN-2 해소분(준비 중 정산 노출 정식화)을 기능 PRD 5개 + 도메인 PRD 1개 + 정책/전사 문서에 반영했다. canonical: `community_api/docs/plan/DRAFT_SETTLEMENT_VISIBILITY_PLAN.md` (DEC-V1~V9, Codex 7라운드 SIGN-OFF).

| 문서 | 반영 내용 |
| --- | --- |
| F07-04 §1·§4·§5·§7-A·§8 | 열람 자격 확장(`validateSettlementReadAccess`), DRAFT && 비호스트 차등 노출(note 마스킹/summary 본인 행/items 빈 목록/영수증 거부), 미리보기 배너·404 빈 상태/생성 CTA, 잔여 Gap 2건(비ATTENDING 당사자 앱 진입 불가 P2 / DRAFT 자동 정리 없음 P3) |
| F07-05 §4·§5 | `transfers/me` 인가 누락 수정(DEC-V3), read 자격 확장, my-shares '준비 중' 뱃지+캡션, 이의 버튼 3상태 가드 |
| F07-08 §1·§4·§7-A·S10/AC-10 | DRAFT 이의 생성 서버 차단(DEC-V4 — 저장·호스트 알림 이전 가드), COMPLETED 허용 유지 |
| F07-10 §4·§7-A·§8 | 평판 activeCount DRAFT 제외(DEC-V5), 지갑 모임정산 목록 DRAFT 포함+비생성자 마스킹(DEC-V9) — **앱 소비처 0, 서버 선구현**(지갑 화면 후속 Gap P2) |
| F03-02 §3·§5 | 이벤트 상세 "모임 정산" 입구 신설(host‖ATTENDING 항상 노출, DEC-V8) — v1 참가자 발견 경로 유일 |
| 07 도메인 PRD | 상단 cross-ref 블록 + 기능별 요약·상태 다이어그램 DRAFT 미리보기 반영 |
| 정책/전사 | `permission_policy`(이의 조건부 + 열람 자격), `payment_settlement_policy` §7(미리보기 수위), `state_policy`·`08_state_transitions`(DRAFT 행 "보통 노출 없음" → 미리보기) |

## 2026-06-05 — 분쟁 해결 v3 일괄 반영 + 도메인 3개 신설 (17 → 20, 기능 153 → 168)

2026-05-28 베이스라인(community_api a1f1967 / community_app d766ede) 이후의 소스 변경 전부를 9개 영역 병렬 실사(dossier: `.delta_2026-06-04/01~09`) 후 반영했다. 모든 신규 PRD는 source-first(units/ 없음)로 작성했다.

| 구분 | 내용 | canonical |
| --- | --- | --- |
| 도메인 18 분쟁 해결 (신규) | `01_domain_prds/18_분쟁_해결_prd.md` + `02_feature_prds/18_dispute_resolution/F18-01~05` + `docs/domains/18-dispute.html` | `community_api/src/.../host/` (dispute 패키지) 실제 소스 |
| 도메인 19 관심인 (신규 — 기존 누락 등재) | `01_domain_prds/19_관심인_prd.md` + `02_feature_prds/19_favorite/F19-01~03` + `docs/domains/19-favorite.html` | `community_api/src/.../favorite/` 실제 소스 + `docs/plan/FAVORITE_PERSON_CALENDAR_PLAN.md` |
| 도메인 20 고객지원 (신규 — 기존 누락 등재) | `01_domain_prds/20_고객지원_prd.md` + `02_feature_prds/20_support/F20-01~03` + `docs/domains/20-support.html` | `community_api/src/.../inquiry/`·`support/` 실제 소스 |
| F03-19 일정 변경 제안·참가자 합의 | `02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md` | `community_api/src/.../event/reschedule/` + `community_api/docs/plan/reschedule-response/` (RS-002) |
| F03-20 이벤트 노쇼 관리 | `02_feature_prds/03_event/F03-20_event-no-show_prd.md` | `community_api/src/.../capacity/` (EventNoShow) 실제 소스 |
| F04-18 클럽 레퓨테이션 | `02_feature_prds/04_club/F04-18_club-reputation_prd.md` | `community_api/src/.../club/reputation/` 실제 소스 |
| F11-07 호스트 리뷰 모더레이션 | `02_feature_prds/11_review_report/F11-07_review-moderation_prd.md` | `community_api/src/.../review/` (ReviewReply·hide) 실제 소스 |

기능 인벤토리 153 → **168** (+15), 도메인 17 → **20** (+3).

### 기존 PRD 정밀 갱신 (약 30건)

- **환불 정책 통일 (D-1, 2026-06-02~03)**: F03-13 / F06-06 / F07-09 / `payment_settlement_policy_prd.md` — 레거시 고정 환불율("24h=100%/12h=50%/0%", "단일 deadline") 기술 전부를 `event_refund_policy` 카탈로그(템플릿 6종) + `RefundFaultCategory` 7분류 + BANK 귀책 상한 + exact-once 동시성 보장으로 교체. `meeting_refund_rule`(F07-09)은 통합 범위 제외 명기.
- **참가 신청 계약**: F03-05/06 — ApplicationStatus 7값, 거절 reasonCode 필수(7값), application_decision_log(6 decision type), stale "APPROVED_PENDING_PAYMENT 미구현" 문구 제거.
- **제재 강화**: F15-02 (익명 표적 제보 방어 — dedup_key/일일캡/정합 검증), F15-08 (FORCED_REMOVE 실효 연결·만료 스케줄러·read-time 필터 Gap 해소 + PlatformSanction·EventApplyRestrictionGuard 17개 진입점 신규 절), F15-01/03.
- **클럽 모더레이션**: F04-04/06 (kick/ban 사유코드 enum + ClubMembershipAction 이력 + 분쟁 연계), F04-03/16 (소유권 이전 구독 정리), F04 도메인 PRD.
- **리뷰·신고**: F11-04 (ReportType 3 → 8종, 증빙 첨부, 자동 플래그), F11-05 (신뢰등급 임계값 서버 단일출처 — nextGradeScore), F11-02.
- **정산·지갑**: F07-06/07 (TransferStatus 8값, limbo SLA 스케줄러), F07-08·F08-14 (통합 분쟁 union 노트), F06-01 (지갑 lazy-create), 가상계좌 webhook은 **계획(미구현)** 으로 명확화.
- **기타**: F09-02 (사진 검수 상태), F09-07 (차단 soft 전환 + 안전신고·증빙), F12-01 (NotificationType 97종 전수 + reschedule 딥링크), F03-03 (공동호스트 권한 flag 5종), F03-08/09/15, F06-08 (프리미엄 실혜택 게이팅).
- **전사 문서**: `00_prd_items/03·04·05·08·10`, `00_product_prd.md`, 정책 PRD 4종(state/notification/privacy_safety/permission).

### 주요 잔여 Gap (소스 측, 비차단 — 각 기능 PRD §8 참조)

- 분쟁: 알림 딥링크 미배선(기존 REFUND_DISPUTE 3종 포함 전부), 호스트 appeal 승인/거절 공개 API 부재, 접수 화면 증빙 첨부 v1 제외, EVENT_NO_SHOW 외 원본 status sync 없음(audit-only). *(→ 2026-06-06 W14 S1/S4: REFUND_DISPUTE 3종 딥링크 + 통합 분쟁 증빙 첨부 해소. appeal 공개 API·status sync는 잔존.)*
- 노쇼: 소명 기한 서버 미구현, Flutter 소명/번복/일괄 endpoint 미배선, cohost canManageAttendance 미체크. *(→ 2026-06-06 W14 S2 해소: 소명 기한 7일(400036), 앱 소명/번복/일괄 배선, cohost 권한 가드 추출. 통합 분쟁 경로 사전검증 BLOCKER 동반 수정.)*
- 환불: 호스트 신규 6종 템플릿 설정 UI 미구현(레거시 5종 폼), 취소 시트 preview-레거시 병렬 표시 모순 가능. *(→ 2026-06-06 W14 S5 해소: 호스트 폼 6종 picker 교체, 취소 시트 서버 preview 단일 출처.)*
- 경고: PlatformSanction listActiveByUser 공개 API 미배선, EVENT_HOST_RESTRICT/DATE_PROFILE_BLOCK 진입점 가드 없음. *(→ 2026-06-06 W14 S6 해소: `GET /api/v1/users/me/sanctions` 신설, EVENT_HOST_RESTRICT 6경로 + DATE_PROFILE_BLOCK 생성·활성 집행. admin grant/revoke 배선 확인(R-8). "강퇴 구독 정리"는 D-6 무코드 처분. 신규 후속: 기활성 데이팅 프로필 매칭 노출.)*
- 관심인/고객지원: Flutter NotificationType enum에 FAVORITE_PERSON_NEW_EVENT 미등재(라우팅은 문자열 기반으로 동작), Inquiry Flutter 전 레이어 미구현. *(→ 2026-06-06 W14 S1/S3 해소: enum 등재 + Inquiry 앱 풀스택 구현.)*

## 2026-05-28 — 정기모임 (Regular Meeting) 도메인 추가

`community_api` 신규 패키지 `regularmeeting/` (엔티티 5 · enum 9 · 서비스 17 · 컨트롤러 1 · 엔드포인트 25) + Flutter `community_app/lib/.../regular_meeting/` (VO 6 · Param 8 · API 1 · Repo 1 · Provider 5 · Screen 10 · Widget 2) 가 단일 세션(2026-05-28)에 구현·sign-off 완료됐다 (Codex 금전 영역 100% 합의). 원천 자료:

- `community_api/docs/plan/regular-meeting/IMPLEMENTATION_REPORT_2026_05_28.md`
- `docs/plan/regular-meeting/` 16개 분할본 (canonical, GLOSSARY · NEXT_SESSION 포함)
- 실제 소스 `community_api/src/main/java/com/endside/community/regularmeeting/`

| 도메인 | 도메인 PRD | 기능 PRD | docs |
| --- | --- | --- | ---: |
| 17 정기모임 | `01_domain_prds/17_정기모임_prd.md` | `02_feature_prds/17_regular_meeting/F17-01~10` | `docs/domains/17-regular-meeting.html` + `F17-01~10.html` |

신규 기능 PRD 10개 추가 → 기능 인벤토리 141 → **151** (이후 2026-05-28 후속 정합성 보정에서 F08-14·F08-15 정식 기능 ID 확정 등록 → **153**), 도메인 16 → **17**. source-first 로 직접 작성. 핵심 결정:

- FIXED(고정형, 코스 바인딩) vs VARIABLE(변동형, 세션 바인딩) — 인원·결제·정산 바인딩 레벨 전환
- 정산 후 환불 위험 0: close FIXED 가드(모든 정션 FINALIZED) + afterCommit REQUIRES_NEW + uk_settlement_rm UNIQUE + reservedRefund 게이트
- flow-through 정산: retainedPaid=호스트 수익, retainedFree=플랫폼 보조 (payout 비대상)
- BANK_TRANSFER off-ledger (isHostDirect=true), 호스트 confirm/reject 책임
- failed_refund.event_id nullable + regular_meeting_id 추가 (결정 K)

잔여 (서버 확장 필요, 비차단):

- NotificationType `REGULAR_MEETING_*` 미정의 → RM 푸시 라우팅 미구현
- 호스트 결제 list endpoint 부재 → 결제 화면 부분 구현
- finalize per-attendee override UI 부재 → MVP 일괄 확정으로 충분
- `retained ≤ 0` 종료 코스 settlement-skipped 마커 영구 재검사 후속

## 2026-05-24 — 경고·징계 / 마일리지 도메인 추가

community_api 의 `warning`·`mileage` 도메인(§30 클럽 활동)이 PRD/docs에 누락되어 있어 source-first 로 신규 작성했다. 서버 controller/service/VO/enum + Flutter `lib/.../warning|mileage/` + `V1__init.sql` 을 직접 대조했다.

| 도메인 | 도메인 PRD | 기능 PRD | docs |
| --- | --- | --- | ---: |
| 15 경고 & 징계 | `01_domain_prds/15_경고_징계_prd.md` | `02_feature_prds/15_warning/F15-01~09` | `docs/domains/15-warning.html` + `F15-01~09.html` |
| 16 마일리지 | `01_domain_prds/16_마일리지_prd.md` | `02_feature_prds/16_mileage/F16-01~08` | `docs/domains/16-mileage.html` + `F16-01~08.html` |

신규 기능 PRD 17개(F15 9 + F16 8) 추가 → 기능 인벤토리 122 → **139**, 도메인 14 → **16**. 두 도메인은 units/ 파이프라인 없이 source-first 로 직접 작성(시나리오 수는 미측정 "—"). 주요 Gap: FORCED_REMOVE 후속 미연동, mileage batch/member-detail 응답 타입(Map↔VO) 불일치, 자동적립 트리거 호출처 부재, 시즌 랭킹 basis 값 불일치 — 각 기능 PRD §8 참조.

## v4.5 W1~W7 영향 요약 (2026-05-22)

폐기된 v4.5 계획 산출물의 7개 Wave가 도입한 인프라/스키마 변경은 아래와 같다.
현재 계약은 실제 enum·service·V1 DDL로 재확인해야 한다. 모든 DDL은 단일
`community_api/src/main/resources/db/migration/V1__init.sql`에 흡수하며
(V2 이상 신규 파일 금지), 운영 환경 정합성 복구는 `community_api/docs/sql/`의 현재 절차를 따른다.

### 스키마 변경

| 대상 | 변경 종류 | 상세 | Wave |
| --- | --- | --- | --- |
| `event` 테이블 | 컬럼 2개 추가 | `overcapacity_allowed TINYINT(1) NOT NULL DEFAULT 0`, `hard_capacity_limit INT NULL` | W1 |
| `application` 테이블 | 복합 인덱스 1개 추가 | `idx_application_event_status (event_id, status)` — `countByEventIdInAndStatus` 최적화 | W2a |
| `event_payment` | 신규 테이블 | 참가 선입금 결제/환불 트래킹. FK: event/users/application/point_transaction | W2a |
| `event_transport_config` | 신규 테이블 | 이벤트별 교통 모드 (NONE/CARPOOL/BUS) | W4 |
| `event_carpool_offer` | 신규 테이블 | 운전자 offer (OFFERED→CONFIRMED/REJECTED/CANCELED) | W5 |
| `event_carpool_passenger` | 신규 테이블 | 탑승자 배정 상태 | W5 |
| `event_carpool_assignment_log` | 신규 테이블 | 스키마만 존재하며 현재 서비스 INSERT 없음 | W5 |
| `vehicle_layout` | 신규 테이블 | 관리자 카탈로그 (admin 측 마스터) | W6 |
| `vehicle_layout_seat` | 신규 테이블 | 좌석 정의 (NORMAL/DRIVER/GUIDE/FOLDABLE/DISABLED/AISLE) | W6 |
| `event_bus` | 신규 테이블 | 이벤트별 버스 인스턴스 | W7 |
| `event_bus_seat` | 신규 테이블 | 좌석 배정 (FREE/FIXED_BY_HOST/FIRST_COME) | W7 |

추가 테이블 총 **9개** (event_payment 1 + carpool 3 + vehicle_layout 2 + bus 2 + log 1). 기존 테이블 컬럼/인덱스 추가는 `event` 2 컬럼 + `application` 1 인덱스로 한정.

### Enum 변경

| 대상 enum | 종류 | 추가/신규 | Wave |
| --- | --- | --- | --- |
| `TransactionType` | 기존 enum 값 추가 | 26 = `EVENT_PREPAYMENT_REFUND` (WALLET 환불 그룹 집계 포함) | W2b |
| `NotificationType` | 기존 enum 값 추가 | 71~83 (13개 — 선입금/카풀/버스 알림) | W2~W7 |
| `ChangeType` | 기존 enum 값 추가 | 9 = `OVERCAPACITY_APPROVED`, 10 = `CAPACITY_REDUCED` | W1 |
| `EventPaymentMethod` | 신규 enum | `WALLET`, `BANK_TRANSFER` | W2a |
| `EventPaymentStatus` | 신규 enum | `PENDING`, `PAID`, `REFUND_REQUESTED`, `REFUNDED`, `CANCELED` | W2a |
| `TransportMode` | 신규 enum | `NONE`, `CARPOOL`, `BUS` | W4 |
| `CarpoolStatus` | 신규 enum | `OFFERED`, `CONFIRMED`, `REJECTED`, `CANCELED` | W5 |
| `TransportChoice` | 신규 enum | `CARPOOL_REQUESTED`, `CARPOOL_ASSIGNED`, `SELF`, `DRIVER` | W5 |
| `BusAssignmentMode` | 신규 enum | `FREE`, `FIXED_BY_HOST`, `FIRST_COME` | W7 |
| vehicle `seatType` | **enum 아님** | String whitelist `NORMAL`, `DRIVER`, `GUIDE`, `FOLDABLE`, `DISABLED`, `AISLE` | 관리자 service 검증 |

검증 테스트: `community_api/src/test/java/com/endside/community/EnumReservationTest.java` (모든 enum 번호의 unique + presence 검증).

### V1__init.sql 단일 파일 규칙

- `community_api/CLAUDE.md`에 명시된 대로 **모든 W1~W7 DDL은 `V1__init.sql` 한 파일에만 누적**. V2/V3 추가 금지.
- 신규 `CREATE TABLE` 9개와 신규 컬럼 2개 + 인덱스 1개를 `V1__init.sql`의 적절한 위치에 삽입.
- 로컬/스테이징 DB가 이미 V1 적용 후일 경우, `docs/sql/local_schema_repair_2026-05-22.sql`을 수동 실행해 동기화. (운영 절차: ① 백업 → ② repair SQL dry-run → ③ 실행 → ④ flyway info 확인). 부록은 PLAN.md §"부록 A — Repair SQL 패턴"을 참조.

### vehicle_layout 시드 실측 (2026-07-29)

- `community_api`와 `community_admin_api`의 V1, seed/sample SQL에 기본 차량 INSERT가 없다.
- 8/20/28/45인승 4종은 과거 계획값일 뿐 현재 데이터 계약이 아니다.
- 별도 vehicle layout seed JSON도 존재하지 않는다.
- 빈 DB에서는 `GET /api/v1/vehicle-layouts/active`가 빈 목록일 수 있다. 운영자가 관리자 API로 레이아웃 생성 → 좌석맵 전체 등록 → active 설정을 해야 한다.

### 현재 후속 범위

- **관리자 차량 API** — 이미 `community_admin_api`에 `MANAGE_EVENT` 목록·상세·생성·메타 수정·좌석 전체 교체·active 토글 6개가 구현됨. DELETE는 없음.
- **Flutter 교통** — transport/bus 수직 슬라이스 없음. 카풀은 신고 API·route·screen만 있으나 presentation에서 해당 route로 이동하는 caller가 없어 direct route/deep-link 수준.
- **환불 정책** — 6종 카탈로그와 귀책 기반 계산이 구현됨.
- **카풀 로그/알림** — assignment log는 쓰지 않고 77~82 알림은 enum only.
- **선입금 만료/환불** — 만료 payment 정리·75 publisher와 escalation 환불 경합 방지가 현재 Gap.

## v4.5 신규 기능 PRD (별도 등록 — `02_feature_prds/03_event/`)

| ID | 도메인 | 예상 PRD 파일 | 주요 기능 | Wave | 상태 |
| --- | --- | --- | --- | --- | --- |
| F03-13 | 이벤트 | `F03-13_event-prepayment_prd.md` | 참가 선입금 (서버 WALLET/BANK, Flutter WALLET only) | W2a/W2b/W3 | current source 실측 |
| F03-14 | 이벤트 | `F03-14_event-transport-mode_prd.md` | 교통 모드 베이스 (Flutter 없음) | W4 | current source 실측 |
| F03-15 | 이벤트 | `F03-15_event-carpool_prd.md` | 카풀 서버 운영 + 고아 신고 route | W5 | current source 실측 |
| F03-16 | 이벤트 | `F03-16_event-bus-charter_prd.md` | 이벤트 버스 서버 운영, 좌석 위젯 없음 | W7 | current source 실측 |
| F03-17 | 이벤트 | `F03-17_vehicle-layout-catalog_prd.md` | 사용자 read + 관리자 API, 무시드 | W6 | current source 실측 |

신규 PRD 5개는 모두 작성 완료 상태다. 세부 구현/클라이언트 후속 범위는 각 기능 PRD의 §8 Gap/Risk를 우선한다.

## 읽는 법

- **Golden sample**: 수작업으로 실제 서버/Flutter 소스를 직접 대조해 완성한 기준 문서다.
- **실사 기반 전환본**: `backend.md`, `frontend.md`, `scenarios.md`, `diagrams.md`의 실사 내용을 PRD 구조로 재배치한 문서다. 구현 착수 전 trace source를 다시 열어 최종 확인한다.
- **신규 PRD**: 별도 master plan 또는 신규 기능 결정을 바탕으로 작성한 기능 PRD다.
- **source-first 구현 확인**: `units/` 없이 실제 소스 또는 구현 리포트를 canonical로 삼아 서버/앱 계약을 확인한 PRD다.
- **source-first PRD**: `units/` 없이 실제 소스 또는 plan을 canonical로 작성한 PRD다. 구현 정합/후속 범위는 각 PRD §7·§8을 확인한다.
- **source-first 부분 구현**: 핵심 계약은 문서화됐지만 PRD 본문상 앱/서버 배선 후속 또는 미구현 Gap이 남아 있는 PRD다.
- **Trace 수**: 원천 문서에 남아 있는 `<!-- traces: ... -->` 소스 참조 개수다.
- **Risk 후보 수**: 원천 문서에서 Gap/Risk/주의/보강 등으로 표시된 판단 후보 수다.

## 전체 목록

| ID | 도메인 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
| --- | --- | --- | --- | --- | ---: | ---: |
| F01-01 | 인증 & 온보딩 | [F01-01_email-signup-login_prd.md](02_feature_prds/01_auth_onboarding/F01-01_email-signup-login_prd.md) | [F01-01_email-signup-login](../units/01_auth_onboarding/F01-01_email-signup-login) | 실사 기반 전환본 | 2 | 0 |
| F01-02 | 인증 & 온보딩 | [F01-02_social-login_prd.md](02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md) | [F01-02_social-login](../units/01_auth_onboarding/F01-02_social-login) | 실사 기반 전환본 | 1 | 1 |
| F01-03 | 인증 & 온보딩 | [F01-03_email-verification_prd.md](02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md) | [F01-03_email-verification](../units/01_auth_onboarding/F01-03_email-verification) | 실사 기반 전환본 | 4 | 1 |
| F01-04 | 인증 & 온보딩 | [F01-04_password-reset_prd.md](02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md) | [F01-04_password-reset](../units/01_auth_onboarding/F01-04_password-reset) | 실사 기반 전환본 | 2 | 1 |
| F01-05 | 인증 & 온보딩 | [F01-05_token-refresh-logout_prd.md](02_feature_prds/01_auth_onboarding/F01-05_token-refresh-logout_prd.md) | [F01-05_token-refresh-logout](../units/01_auth_onboarding/F01-05_token-refresh-logout) | 실사 기반 전환본 | 2 | 0 |
| F01-06 | 인증 & 온보딩 | [F01-06_onboarding_prd.md](02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md) | [F01-06_onboarding](../units/01_auth_onboarding/F01-06_onboarding) | 실사 기반 전환본 | 0 | 1 |
| F01-07 | 인증 & 온보딩 | [F01-07_preference-tags_prd.md](02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md) | [F01-07_preference-tags](../units/01_auth_onboarding/F01-07_preference-tags) | 실사 기반 전환본 | 4 | 1 |
| F01-08 | 인증 & 온보딩 | [F01-08_social-unlink_prd.md](02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md) | [F01-08_social-unlink](../units/01_auth_onboarding/F01-08_social-unlink) | 실사 기반 전환본 | 1 | 1 |
| F02-01 | 홈 피드 | [F02-01_home-feed-main_prd.md](02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md) | [F02-01_home-feed-main](../units/02_home_feed/F02-01_home-feed-main) | 실사 기반 전환본 | 4 | 3 |
| F02-02 | 홈 피드 | [F02-02_home-feed-refresh_prd.md](02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md) | [F02-02_home-feed-refresh](../units/02_home_feed/F02-02_home-feed-refresh) | 실사 기반 전환본 | 0 | 1 |
| F02-03 | 홈 피드 | [F02-03_section-card-entry_prd.md](02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md) | [F02-03_section-card-entry](../units/02_home_feed/F02-03_section-card-entry) | 실사 기반 전환본 | 0 | 2 |
| F02-04 | 홈 피드 | [F02-04_recommend-events-more_prd.md](02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md) | [F02-04_recommend-events-more](../units/02_home_feed/F02-04_recommend-events-more) | 실사 기반 전환본 | 2 | 9 |
| F02-05 | 홈 피드 | [F02-05_search-notification-entry_prd.md](02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md) | [F02-05_search-notification-entry](../units/02_home_feed/F02-05_search-notification-entry) | 실사 기반 전환본 | 0 | 10 |
| F03-01 | 이벤트 | [F03-01_event-discovery_prd.md](02_feature_prds/03_event/F03-01_event-discovery_prd.md) | [F03-01_event-discovery](../units/03_event/F03-01_event-discovery) | 실사 기반 전환본 | 3 | 2 |
| F03-02 | 이벤트 | [F03-02_event-detail_prd.md](02_feature_prds/03_event/F03-02_event-detail_prd.md) | [F03-02_event-detail](../units/03_event/F03-02_event-detail) | Golden sample | 2 | 2 |
| F03-03 | 이벤트 | [F03-03_event-creation_prd.md](02_feature_prds/03_event/F03-03_event-creation_prd.md) | [F03-03_event-creation](../units/03_event/F03-03_event-creation) | 실사 기반 전환본 | 4 | 3 |
| F03-04 | 이벤트 | [F03-04_event-lifecycle_prd.md](02_feature_prds/03_event/F03-04_event-lifecycle_prd.md) | [F03-04_event-lifecycle](../units/03_event/F03-04_event-lifecycle) | 실사 기반 전환본 | 9 | 3 |
| F03-05 | 이벤트 | [F03-05_event-attendance_prd.md](02_feature_prds/03_event/F03-05_event-attendance_prd.md) | [F03-05_event-attendance](../units/03_event/F03-05_event-attendance) | 실사 기반 전환본 | 6 | 21 |
| F03-06 | 이벤트 | [F03-06_application-review_prd.md](02_feature_prds/03_event/F03-06_application-review_prd.md) | [F03-06_application-review](../units/03_event/F03-06_application-review) | 실사 기반 전환본 | 3 | 9 |
| F03-07 | 이벤트 | [F03-07_capacity-and-waitlist_prd.md](02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md) | [F03-07_capacity-and-waitlist](../units/03_event/F03-07_capacity-and-waitlist) | 실사 기반 전환본 | 16 | 3 |
| F03-08 | 이벤트 | [F03-08_qr-checkin_prd.md](02_feature_prds/03_event/F03-08_qr-checkin_prd.md) | [F03-08_qr-checkin](../units/03_event/F03-08_qr-checkin) | 실사 기반 전환본 | 5 | 1 |
| F03-09 | 이벤트 | [F03-09_event-photos_prd.md](02_feature_prds/03_event/F03-09_event-photos_prd.md) | [F03-09_event-photos](../units/03_event/F03-09_event-photos) | 실사 기반 전환본 | 8 | 4 |
| F03-10 | 이벤트 | [F03-10_event-plan-link_prd.md](02_feature_prds/03_event/F03-10_event-plan-link_prd.md) | [F03-10_event-plan-link](../units/03_event/F03-10_event-plan-link) | 실사 기반 전환본 | 5 | 3 |
| F03-11 | 이벤트 | [F03-11_wishlist_prd.md](02_feature_prds/03_event/F03-11_wishlist_prd.md) | [F03-11_wishlist](../units/03_event/F03-11_wishlist) | 실사 기반 전환본 | 3 | 1 |
| F03-12 | 이벤트 | [F03-12_my-events_prd.md](02_feature_prds/03_event/F03-12_my-events_prd.md) | [F03-12_my-events](../units/03_event/F03-12_my-events) | 실사 기반 전환본 | 3 | 7 |
| F03-13 | 이벤트 | [F03-13_event-prepayment_prd.md](02_feature_prds/03_event/F03-13_event-prepayment_prd.md) | `source-first` | 신규 PRD | 14 | 8 |
| F03-14 | 이벤트 | [F03-14_event-transport-mode_prd.md](02_feature_prds/03_event/F03-14_event-transport-mode_prd.md) | `source-first` | 신규 PRD | 2 | 3 |
| F03-15 | 이벤트 | [F03-15_event-carpool_prd.md](02_feature_prds/03_event/F03-15_event-carpool_prd.md) | `source-first` | 신규 PRD | 7 | 6 |
| F03-16 | 이벤트 | [F03-16_event-bus-charter_prd.md](02_feature_prds/03_event/F03-16_event-bus-charter_prd.md) | `source-first` | 신규 PRD | 6 | 6 |
| F03-17 | 이벤트 | [F03-17_vehicle-layout-catalog_prd.md](02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md) | `source-first` | 신규 PRD | 2 | 2 |
| F03-18 | 이벤트 | [F03-18_event-demographics_prd.md](02_feature_prds/03_event/F03-18_event-demographics_prd.md) | `source-first` | 신규 PRD | 4 | 1 |
| F03-19 | 이벤트 | [F03-19_event-reschedule-consent_prd.md](02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md) | `source-first` | source-first 구현 확인 | 4 | 5 |
| F03-20 | 이벤트 | [F03-20_event-no-show_prd.md](02_feature_prds/03_event/F03-20_event-no-show_prd.md) | `source-first` | source-first 구현 확인 | 4 | 7 |
| F04-01 | 클럽 | [F04-01_club-discovery_prd.md](02_feature_prds/04_club/F04-01_club-discovery_prd.md) | [F04-01_club-discovery](../units/04_club/F04-01_club-discovery) | 실사 기반 전환본 | 1 | 3 |
| F04-02 | 클럽 | [F04-02_club-detail-join_prd.md](02_feature_prds/04_club/F04-02_club-detail-join_prd.md) | [F04-02_club-detail-join](../units/04_club/F04-02_club-detail-join) | 실사 기반 전환본 | 3 | 2 |
| F04-03 | 클럽 | [F04-03_club-crud-transfer_prd.md](02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md) | [F04-03_club-crud-transfer](../units/04_club/F04-03_club-crud-transfer) | 실사 기반 전환본 | 4 | 11 |
| F04-04 | 클럽 | [F04-04_member-management_prd.md](02_feature_prds/04_club/F04-04_member-management_prd.md) | [F04-04_member-management](../units/04_club/F04-04_member-management) | 실사 기반 전환본 | 3 | 0 |
| F04-05 | 클럽 | [F04-05_waitlist-invitation_prd.md](02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md) | [F04-05_waitlist-invitation](../units/04_club/F04-05_waitlist-invitation) | 실사 기반 전환본 | 6 | 1 |
| F04-06 | 클럽 | [F04-06_ban-management_prd.md](02_feature_prds/04_club/F04-06_ban-management_prd.md) | [F04-06_ban-management](../units/04_club/F04-06_ban-management) | 실사 기반 전환본 | 4 | 0 |
| F04-07 | 클럽 | [F04-07_my-clubs-stats_prd.md](02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md) | [F04-07_my-clubs-stats](../units/04_club/F04-07_my-clubs-stats) | 실사 기반 전환본 | 2 | 6 |
| F04-08 | 클럽 | [F04-08_board-post-crud_prd.md](02_feature_prds/04_club/F04-08_board-post-crud_prd.md) | [F04-08_board-post-crud](../units/04_club/F04-08_board-post-crud) | 실사 기반 전환본 | 0 | 3 |
| F04-09 | 클럽 | [F04-09_post-comments_prd.md](02_feature_prds/04_club/F04-09_post-comments_prd.md) | [F04-09_post-comments](../units/04_club/F04-09_post-comments) | 실사 기반 전환본 | 5 | 7 |
| F04-10 | 클럽 | [F04-10_announcements_prd.md](02_feature_prds/04_club/F04-10_announcements_prd.md) | [F04-10_announcements](../units/04_club/F04-10_announcements) | 실사 기반 전환본 | 3 | 2 |
| F04-11 | 클럽 | [F04-11_photo-album_prd.md](02_feature_prds/04_club/F04-11_photo-album_prd.md) | [F04-11_photo-album](../units/04_club/F04-11_photo-album) | 실사 기반 전환본 | 8 | 1 |
| F04-12 | 클럽 | [F04-12_club-events-calendar_prd.md](02_feature_prds/04_club/F04-12_club-events-calendar_prd.md) | [F04-12_club-events-calendar](../units/04_club/F04-12_club-events-calendar) | 실사 기반 전환본 | 15 | 7 |
| F04-13 | 클럽 | [F04-13_fund-overview_prd.md](02_feature_prds/04_club/F04-13_fund-overview_prd.md) | [F04-13_fund-overview](../units/04_club/F04-13_fund-overview) | 실사 기반 전환본 | 1 | 2 |
| F04-14 | 클럽 | [F04-14_donation_prd.md](02_feature_prds/04_club/F04-14_donation_prd.md) | [F04-14_donation](../units/04_club/F04-14_donation) | 실사 기반 전환본 | 4 | 6 |
| F04-15 | 클럽 | [F04-15_fund-withdrawal_prd.md](02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md) | [F04-15_fund-withdrawal](../units/04_club/F04-15_fund-withdrawal) | 실사 기반 전환본 | 2 | 2 |
| F04-16 | 클럽 | [F04-16_subscription_prd.md](02_feature_prds/04_club/F04-16_subscription_prd.md) | [F04-16_subscription](../units/04_club/F04-16_subscription) | 실사 기반 전환본 | 5 | 8 |
| F04-17 | 클럽 | [F04-17_club-demographics_prd.md](02_feature_prds/04_club/F04-17_club-demographics_prd.md) | `source-first` | 신규 PRD | 4 | 1 |
| F04-18 | 클럽 | [F04-18_club-reputation_prd.md](02_feature_prds/04_club/F04-18_club-reputation_prd.md) | `source-first` | source-first 구현 확인 | 3 | 1 |
| F05-01 | 검색 | [F05-01_keyword-search_prd.md](02_feature_prds/05_search/F05-01_keyword-search_prd.md) | [F05-01_keyword-search](../units/05_search/F05-01_keyword-search) | 실사 기반 전환본 | 3 | 2 |
| F05-02 | 검색 | [F05-02_autocomplete-suggest_prd.md](02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md) | [F05-02_autocomplete-suggest](../units/05_search/F05-02_autocomplete-suggest) | 실사 기반 전환본 | 1 | 2 |
| F05-03 | 검색 | [F05-03_search-filter_prd.md](02_feature_prds/05_search/F05-03_search-filter_prd.md) | [F05-03_search-filter](../units/05_search/F05-03_search-filter) | 실사 기반 전환본 | 2 | 2 |
| F05-04 | 검색 | [F05-04_search-history_prd.md](02_feature_prds/05_search/F05-04_search-history_prd.md) | [F05-04_search-history](../units/05_search/F05-04_search-history) | 실사 기반 전환본 | 3 | 0 |
| F05-05 | 검색 | [F05-05_saved-search_prd.md](02_feature_prds/05_search/F05-05_saved-search_prd.md) | [F05-05_saved-search](../units/05_search/F05-05_saved-search) | 실사 기반 전환본 | 5 | 4 |
| F06-01 | 결제 & 지갑 | [F06-01_wallet-main_prd.md](02_feature_prds/06_payment/F06-01_wallet-main_prd.md) | [F06-01_wallet-main](../units/06_payment/F06-01_wallet-main) | 실사 기반 전환본 | 1 | 0 |
| F06-02 | 결제 & 지갑 | [F06-02_point-charge_prd.md](02_feature_prds/06_payment/F06-02_point-charge_prd.md) | [F06-02_point-charge](../units/06_payment/F06-02_point-charge) | 실사 기반 전환본 | 5 | 0 |
| F06-03 | 결제 & 지갑 | [F06-03_transaction-history_prd.md](02_feature_prds/06_payment/F06-03_transaction-history_prd.md) | [F06-03_transaction-history](../units/06_payment/F06-03_transaction-history) | 실사 기반 전환본 | 3 | 4 |
| F06-04 | 결제 & 지갑 | [F06-04_payment-method_prd.md](02_feature_prds/06_payment/F06-04_payment-method_prd.md) | [F06-04_payment-method](../units/06_payment/F06-04_payment-method) | 실사 기반 전환본 | 4 | 1 |
| F06-05 | 결제 & 지갑 | [F06-05_auto-charge_prd.md](02_feature_prds/06_payment/F06-05_auto-charge_prd.md) | [F06-05_auto-charge](../units/06_payment/F06-05_auto-charge) | 실사 기반 전환본 | 4 | 0 |
| F06-06 | 결제 & 지갑 | [F06-06_point-pay-refund_prd.md](02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md) | [F06-06_point-pay-refund](../units/06_payment/F06-06_point-pay-refund) | 실사 기반 전환본 | 3 | 21 |
| F06-07 | 결제 & 지갑 | [F06-07_hosting-ticket_prd.md](02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md) | [F06-07_hosting-ticket](../units/06_payment/F06-07_hosting-ticket) | 실사 기반 전환본 | 2 | 3 |
| F06-08 | 결제 & 지갑 | [F06-08_personal-subscription_prd.md](02_feature_prds/06_payment/F06-08_personal-subscription_prd.md) | [F06-08_personal-subscription](../units/06_payment/F06-08_personal-subscription) | 실사 기반 전환본 | 5 | 3 |
| F06-09 | 결제 & 지갑 | [F06-09_earnings-dashboard_prd.md](02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md) | [F06-09_earnings-dashboard](../units/06_payment/F06-09_earnings-dashboard) | 실사 기반 전환본 | 1 | 3 |
| F06-10 | 결제 & 지갑 | [F06-10_settlement-appeal_prd.md](02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md) | [F06-10_settlement-appeal](../units/06_payment/F06-10_settlement-appeal) | 실사 기반 전환본 | 5 | 4 |
| F07-01 | 모임 정산 | [F07-01_create-settlement_prd.md](02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md) | [F07-01_create-settlement](../units/07_meeting_settlement/F07-01_create-settlement) | 실사 기반 전환본 | 3 | 2 |
| F07-02 | 모임 정산 | [F07-02_settlement-items_prd.md](02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md) | [F07-02_settlement-items](../units/07_meeting_settlement/F07-02_settlement-items) | 실사 기반 전환본 | 4 | 2 |
| F07-03 | 모임 정산 | [F07-03_activate-cancel_prd.md](02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md) | [F07-03_activate-cancel](../units/07_meeting_settlement/F07-03_activate-cancel) | 실사 기반 전환본 | 2 | 1 |
| F07-04 | 모임 정산 | [F07-04_status-summary-receipt_prd.md](02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md) | [F07-04_status-summary-receipt](../units/07_meeting_settlement/F07-04_status-summary-receipt) | 실사 기반 전환본 | 3 | 2 |
| F07-05 | 모임 정산 | [F07-05_pay-share_prd.md](02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md) | [F07-05_pay-share](../units/07_meeting_settlement/F07-05_pay-share) | 실사 기반 전환본 | 7 | 2 |
| F07-06 | 모임 정산 | [F07-06_host-confirm-transfers_prd.md](02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md) | [F07-06_host-confirm-transfers](../units/07_meeting_settlement/F07-06_host-confirm-transfers) | 실사 기반 전환본 | 6 | 2 |
| F07-07 | 모임 정산 | [F07-07_remind-extend_prd.md](02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md) | [F07-07_remind-extend](../units/07_meeting_settlement/F07-07_remind-extend) | 실사 기반 전환본 | 3 | 3 |
| F07-08 | 모임 정산 | [F07-08_appeal-audit_prd.md](02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md) | [F07-08_appeal-audit](../units/07_meeting_settlement/F07-08_appeal-audit) | 실사 기반 전환본 | 4 | 0 |
| F07-09 | 모임 정산 | [F07-09_prepayment-refund_prd.md](02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md) | [F07-09_prepayment-refund](../units/07_meeting_settlement/F07-09_prepayment-refund) | 실사 기반 전환본 | 7 | 7 |
| F07-10 | 모임 정산 | [F07-10_account-history-reputation_prd.md](02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md) | [F07-10_account-history-reputation](../units/07_meeting_settlement/F07-10_account-history-reputation) | 실사 기반 전환본 | 0 | 3 |
| F08-01 | 플랜 마켓 | [F08-01_my-plan-list_prd.md](02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md) | [F08-01_my-plan-list](../units/08_plan_market/F08-01_my-plan-list) | 실사 기반 전환본 | 3 | 1 |
| F08-02 | 플랜 마켓 | [F08-02_plan-detail_prd.md](02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md) | [F08-02_plan-detail](../units/08_plan_market/F08-02_plan-detail) | 실사 기반 전환본 | 6 | 1 |
| F08-03 | 플랜 마켓 | [F08-03_block-editor_prd.md](02_feature_prds/08_plan_market/F08-03_block-editor_prd.md) | [F08-03_block-editor](../units/08_plan_market/F08-03_block-editor) | 실사 기반 전환본 | 5 | 4 |
| F08-04 | 플랜 마켓 | [F08-04_block-reorder_prd.md](02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md) | [F08-04_block-reorder](../units/08_plan_market/F08-04_block-reorder) | 실사 기반 전환본 | 2 | 2 |
| F08-05 | 플랜 마켓 | [F08-05_plan-publish_prd.md](02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md) | [F08-05_plan-publish](../units/08_plan_market/F08-05_plan-publish) | 실사 기반 전환본 | 1 | 3 |
| F08-06 | 플랜 마켓 | [F08-06_market-item-management_prd.md](02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md) | [F08-06_market-item-management](../units/08_plan_market/F08-06_market-item-management) | 실사 기반 전환본 | 6 | 2 |
| F08-07 | 플랜 마켓 | [F08-07_creator-profile-stats_prd.md](02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md) | [F08-07_creator-profile-stats](../units/08_plan_market/F08-07_creator-profile-stats) | 실사 기반 전환본 | 2 | 7 |
| F08-08 | 플랜 마켓 | [F08-08_market-main-browse_prd.md](02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md) | [F08-08_market-main-browse](../units/08_plan_market/F08-08_market-main-browse) | 실사 기반 전환본 | 3 | 2 |
| F08-09 | 플랜 마켓 | [F08-09_market-search_prd.md](02_feature_prds/08_plan_market/F08-09_market-search_prd.md) | [F08-09_market-search](../units/08_plan_market/F08-09_market-search) | 실사 기반 전환본 | 1 | 4 |
| F08-10 | 플랜 마켓 | [F08-10_market-item-detail_prd.md](02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md) | [F08-10_market-item-detail](../units/08_plan_market/F08-10_market-item-detail) | 실사 기반 전환본 | 5 | 4 |
| F08-11 | 플랜 마켓 | [F08-11_purchase_prd.md](02_feature_prds/08_plan_market/F08-11_purchase_prd.md) | [F08-11_purchase](../units/08_plan_market/F08-11_purchase) | 실사 기반 전환본 | 3 | 4 |
| F08-12 | 플랜 마켓 | [F08-12_my-collection_prd.md](02_feature_prds/08_plan_market/F08-12_my-collection_prd.md) | [F08-12_my-collection](../units/08_plan_market/F08-12_my-collection) | 실사 기반 전환본 | 4 | 4 |
| F08-13 | 플랜 마켓 | [F08-13_plan-event-and-review_prd.md](02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md) | [F08-13_plan-event-and-review](../units/08_plan_market/F08-13_plan-event-and-review) | 실사 기반 전환본 | 4 | 2 |
| F08-14 | 플랜 마켓 | [F08-14_purchase-refund_prd.md](02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md) | `source-first` | source-first 구현 확인 | 6 | 2 |
| F08-15 | 플랜 마켓 | [F08-15_creator-earning-coverage_prd.md](02_feature_prds/08_plan_market/F08-15_creator-earning-coverage_prd.md) | `source-first` | source-first 구현 확인 | 4 | 1 |
| F09-01 | 프라이빗 데이팅 | [F09-01_verification_prd.md](02_feature_prds/09_private_date/F09-01_verification_prd.md) | [F09-01_verification](../units/09_private_date/F09-01_verification) | 실사 기반 전환본 | 3 | 0 |
| F09-02 | 프라이빗 데이팅 | [F09-02_profile_prd.md](02_feature_prds/09_private_date/F09-02_profile_prd.md) | [F09-02_profile](../units/09_private_date/F09-02_profile) | 실사 기반 전환본 | 6 | 2 |
| F09-03 | 프라이빗 데이팅 | [F09-03_candidate_swipe_prd.md](02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | [F09-03_candidate_swipe](../units/09_private_date/F09-03_candidate_swipe) | 실사 기반 전환본 | 2 | 4 |
| F09-04 | 프라이빗 데이팅 | [F09-04_match_list_prd.md](02_feature_prds/09_private_date/F09-04_match_list_prd.md) | [F09-04_match_list](../units/09_private_date/F09-04_match_list) | 실사 기반 전환본 | 2 | 0 |
| F09-05 | 프라이빗 데이팅 | [F09-05_chat_prd.md](02_feature_prds/09_private_date/F09-05_chat_prd.md) | [F09-05_chat](../units/09_private_date/F09-05_chat) | 실사 기반 전환본 | 4 | 1 |
| F09-06 | 프라이빗 데이팅 | [F09-06_meeting_proposal_prd.md](02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | [F09-06_meeting_proposal](../units/09_private_date/F09-06_meeting_proposal) | 실사 기반 전환본 | 3 | 8 |
| F09-07 | 프라이빗 데이팅 | [F09-07_block_prd.md](02_feature_prds/09_private_date/F09-07_block_prd.md) | [F09-07_block](../units/09_private_date/F09-07_block) | 실사 기반 전환본 | 3 | 1 |
| F09-08 | 프라이빗 데이팅 | [F09-08_profile_views_prd.md](02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | [F09-08_profile_views](../units/09_private_date/F09-08_profile_views) | 실사 기반 전환본 | 1 | 3 |
| F10-01 | 캘린더 | [F10-01_unified-calendar-view_prd.md](02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md) | [F10-01_unified-calendar-view](../units/10_calendar/F10-01_unified-calendar-view) | 실사 기반 전환본 | 3 | 1 |
| F10-02 | 캘린더 | [F10-02_calendar-item-routing_prd.md](02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md) | [F10-02_calendar-item-routing](../units/10_calendar/F10-02_calendar-item-routing) | 실사 기반 전환본 | 0 | 8 |
| F10-03 | 캘린더 | [F10-03_single-availability-crud_prd.md](02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md) | [F10-03_single-availability-crud](../units/10_calendar/F10-03_single-availability-crud) | 실사 기반 전환본 | 5 | 3 |
| F10-04 | 캘린더 | [F10-04_recurring-availability-rule_prd.md](02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md) | [F10-04_recurring-availability-rule](../units/10_calendar/F10-04_recurring-availability-rule) | 실사 기반 전환본 | 5 | 8 |
| F10-05 | 캘린더 | [F10-05_other-user-availability_prd.md](02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md) | [F10-05_other-user-availability](../units/10_calendar/F10-05_other-user-availability) | 실사 기반 전환본 | 2 | 2 |
| F11-01 | 리뷰 & 신고 | [F11-01_event-review-write_prd.md](02_feature_prds/11_review_report/F11-01_event-review-write_prd.md) | [F11-01_event-review-write](../units/11_review_report/F11-01_event-review-write) | 실사 기반 전환본 | 1 | 1 |
| F11-02 | 리뷰 & 신고 | [F11-02_review-list_prd.md](02_feature_prds/11_review_report/F11-02_review-list_prd.md) | [F11-02_review-list](../units/11_review_report/F11-02_review-list) | 실사 기반 전환본 | 2 | 2 |
| F11-03 | 리뷰 & 신고 | [F11-03_review-edit-delete_prd.md](02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md) | [F11-03_review-edit-delete](../units/11_review_report/F11-03_review-edit-delete) | 실사 기반 전환본 | 2 | 3 |
| F11-04 | 리뷰 & 신고 | [F11-04_report_prd.md](02_feature_prds/11_review_report/F11-04_report_prd.md) | [F11-04_report](../units/11_review_report/F11-04_report) | 실사 기반 갱신본 | 2 | 3 |
| F11-05 | 리뷰 & 신고 | [F11-05_trust-score_prd.md](02_feature_prds/11_review_report/F11-05_trust-score_prd.md) | [F11-05_trust-score](../units/11_review_report/F11-05_trust-score) | 실사 기반 전환본 | 3 | 1 |
| F11-06 | 리뷰 & 신고 | [F11-06_taste-profile_prd.md](02_feature_prds/11_review_report/F11-06_taste-profile_prd.md) | [F11-06_taste-profile](../units/11_review_report/F11-06_taste-profile) | 실사 기반 전환본 | 5 | 1 |
| F11-07 | 리뷰 & 신고 | [F11-07_review-moderation_prd.md](02_feature_prds/11_review_report/F11-07_review-moderation_prd.md) | `source-first` | 실사 기반 신규 작성 | 3 | 4 |
| F12-01 | 알림 | [F12-01_notification-list-read_prd.md](02_feature_prds/12_notification/F12-01_notification-list-read_prd.md) | [F12-01_notification-list-read](../units/12_notification/F12-01_notification-list-read) | 실사 기반 전환본 | 5 | 4 |
| F12-02 | 알림 | [F12-02_notification-grouped-badge_prd.md](02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md) | [F12-02_notification-grouped-badge](../units/12_notification/F12-02_notification-grouped-badge) | 실사 기반 전환본 | 2 | 3 |
| F12-03 | 알림 | [F12-03_category-settings_prd.md](02_feature_prds/12_notification/F12-03_category-settings_prd.md) | [F12-03_category-settings](../units/12_notification/F12-03_category-settings) | 실사 기반 전환본 | 2 | 1 |
| F12-04 | 알림 | [F12-04_quiet-hours_prd.md](02_feature_prds/12_notification/F12-04_quiet-hours_prd.md) | [F12-04_quiet-hours](../units/12_notification/F12-04_quiet-hours) | 실사 기반 전환본 | 2 | 1 |
| F12-05 | 알림 | [F12-05_device-token-management_prd.md](02_feature_prds/12_notification/F12-05_device-token-management_prd.md) | [F12-05_device-token-management](../units/12_notification/F12-05_device-token-management) | 실사 기반 전환본 | 5 | 0 |
| F12-06 | 알림 | [F12-06_permission-banner_prd.md](02_feature_prds/12_notification/F12-06_permission-banner_prd.md) | [F12-06_permission-banner](../units/12_notification/F12-06_permission-banner) | 실사 기반 전환본 | 0 | 0 |
| F13-01 | 프로필 & 설정 | [F13-01_profile-hub_prd.md](02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md) | [F13-01_profile-hub](../units/13_profile_settings/F13-01_profile-hub) | 실사 기반 전환본 | 1 | 4 |
| F13-02 | 프로필 & 설정 | [F13-02_profile-edit_prd.md](02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md) | [F13-02_profile-edit](../units/13_profile_settings/F13-02_profile-edit) | 실사 기반 전환본 | 1 | 4 |
| F13-03 | 프로필 & 설정 | [F13-03_address-management_prd.md](02_feature_prds/13_profile_settings/F13-03_address-management_prd.md) | [F13-03_address-management](../units/13_profile_settings/F13-03_address-management) | 실사 기반 전환본 | 5 | 5 |
| F13-04 | 프로필 & 설정 | [F13-04_preference-tags_prd.md](02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md) | [F13-04_preference-tags](../units/13_profile_settings/F13-04_preference-tags) | 실사 기반 전환본 | 4 | 7 |
| F13-05 | 프로필 & 설정 | [F13-05_data-export_prd.md](02_feature_prds/13_profile_settings/F13-05_data-export_prd.md) | [F13-05_data-export](../units/13_profile_settings/F13-05_data-export) | 실사 기반 전환본 | 2 | 6 |
| F13-06 | 프로필 & 설정 | [F13-06_account-deletion_prd.md](02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md) | [F13-06_account-deletion](../units/13_profile_settings/F13-06_account-deletion) | 실사 기반 전환본 | 3 | 4 |
| F13-07 | 프로필 & 설정 | [F13-07_account-deactivation_prd.md](02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md) | [F13-07_account-deactivation](../units/13_profile_settings/F13-07_account-deactivation) | 실사 기반 전환본 | 2 | 7 |
| F14-01 | 위치 & 길찾기 | [F14-01_event-location-share_prd.md](02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md) | [F14-01_event-location-share](../units/14_location_directions/F14-01_event-location-share) | 실사 기반 전환본 | 3 | 2 |
| F14-02 | 위치 & 길찾기 | [F14-02_location-opt-out_prd.md](02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md) | [F14-02_location-opt-out](../units/14_location_directions/F14-02_location-opt-out) | 실사 기반 전환본 | 1 | 2 |
| F14-03 | 위치 & 길찾기 | [F14-03_location-extend_prd.md](02_feature_prds/14_location_directions/F14-03_location-extend_prd.md) | [F14-03_location-extend](../units/14_location_directions/F14-03_location-extend) | 실사 기반 전환본 | 1 | 3 |
| F14-04 | 위치 & 길찾기 | [F14-04_location-privacy-dashboard_prd.md](02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md) | [F14-04_location-privacy-dashboard](../units/14_location_directions/F14-04_location-privacy-dashboard) | 실사 기반 전환본 | 1 | 4 |
| F14-05 | 위치 & 길찾기 | [F14-05_event-directions_prd.md](02_feature_prds/14_location_directions/F14-05_event-directions_prd.md) | [F14-05_event-directions](../units/14_location_directions/F14-05_event-directions) | 실사 기반 전환본 | 2 | 2 |
| F14-06 | 위치 & 길찾기 | [F14-06_reverse-geocoding_prd.md](02_feature_prds/14_location_directions/F14-06_reverse-geocoding_prd.md) | [F14-06_reverse-geocoding](../units/14_location_directions/F14-06_reverse-geocoding) | 실사 기반 전환본 | 1 | 0 |
| F15-01 | 경고 & 징계 | [F15-01_warning-overview-ledger_prd.md](02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-02 | 경고 & 징계 | [F15-02_report-submit-manage_prd.md](02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F15-03 | 경고 & 징계 | [F15-03_appeal_prd.md](02_feature_prds/15_warning/F15-03_appeal_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-04 | 경고 & 징계 | [F15-04_policy-penalty-types_prd.md](02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F15-05 | 경고 & 징계 | [F15-05_report-review_prd.md](02_feature_prds/15_warning/F15-05_report-review_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-06 | 경고 & 징계 | [F15-06_grant-ledger-adjust_prd.md](02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F15-07 | 경고 & 징계 | [F15-07_appeal-resolve_prd.md](02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md) | `source-first` | source-first 구현 확인 | 0 | 2 |
| F15-08 | 경고 & 징계 | [F15-08_sanction-enforcement_prd.md](02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F15-09 | 경고 & 징계 | [F15-09_queue-dashboard-audit_prd.md](02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F16-01 | 마일리지 | [F16-01_my-mileage-main_prd.md](02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-02 | 마일리지 | [F16-02_grade-badge-ranking_prd.md](02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-03 | 마일리지 | [F16-03_season_prd.md](02_feature_prds/16_mileage/F16-03_season_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-04 | 마일리지 | [F16-04_policy-config_prd.md](02_feature_prds/16_mileage/F16-04_policy-config_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-05 | 마일리지 | [F16-05_policy-presets_prd.md](02_feature_prds/16_mileage/F16-05_policy-presets_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-06 | 마일리지 | [F16-06_grant-redeem-reverse_prd.md](02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F16-07 | 마일리지 | [F16-07_host-proposal_prd.md](02_feature_prds/16_mileage/F16-07_host-proposal_prd.md) | `source-first` | source-first 구현 확인 | 0 | 3 |
| F16-08 | 마일리지 | [F16-08_review-queue-dashboard_prd.md](02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md) | `source-first` | source-first 구현 확인 | 0 | 5 |
| F17-01 | 정기모임 | [F17-01_regular-meeting-discovery_prd.md](02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md) | `source-first` | source-first 구현 확인 | 3 | 2 |
| F17-02 | 정기모임 | [F17-02_regular-meeting-detail_prd.md](02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md) | `source-first` | source-first 구현 확인 | 4 | 3 |
| F17-03 | 정기모임 | [F17-03_regular-meeting-creation_prd.md](02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md) | `source-first` | source-first 구현 확인 | 3 | 4 |
| F17-04 | 정기모임 | [F17-04_regular-meeting-lifecycle_prd.md](02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md) | `source-first` | source-first 구현 확인 | 5 | 4 |
| F17-05 | 정기모임 | [F17-05_regular-meeting-sessions_prd.md](02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md) | `source-first` | source-first 구현 확인 | 6 | 6 |
| F17-06 | 정기모임 | [F17-06_regular-meeting-enrollment_prd.md](02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md) | `source-first` | source-first 구현 확인 | 8 | 5 |
| F17-07 | 정기모임 | [F17-07_regular-meeting-payment_prd.md](02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md) | `source-first` | source-first 구현 확인 | 6 | 6 |
| F17-08 | 정기모임 | [F17-08_regular-meeting-refund_prd.md](02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md) | `source-first` | source-first 구현 확인 | 7 | 6 |
| F17-09 | 정기모임 | [F17-09_regular-meeting-attendance_prd.md](02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md) | `source-first` | source-first 구현 확인 | 6 | 3 |
| F17-10 | 정기모임 | [F17-10_regular-meeting-settlement_prd.md](02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md) | `source-first` | source-first 구현 확인 | 8 | 4 |
| F18-01 | 분쟁 해결 | [F18-01_unified-dispute-case_prd.md](02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md) | `source-first` | source-first PRD | 4 | 5 |
| F18-02 | 분쟁 해결 | [F18-02_dispute-create_prd.md](02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md) | `source-first` | source-first PRD | 3 | 4 |
| F18-03 | 분쟁 해결 | [F18-03_dispute-appeal_prd.md](02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md) | `source-first` | source-first PRD | 3 | 4 |
| F18-04 | 분쟁 해결 | [F18-04_evidence-visibility_prd.md](02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md) | `source-first` | source-first PRD | 3 | 5 |
| F18-05 | 분쟁 해결 | [F18-05_host-inbox_prd.md](02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md) | `source-first` | source-first PRD | 3 | 5 |
| F19-01 | 관심인 | [F19-01_favorite-manage_prd.md](02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md) | `source-first` | source-first 구현 확인 | 3 | 3 |
| F19-02 | 관심인 | [F19-02_favorite-calendar_prd.md](02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md) | `source-first` | source-first 부분 구현 | 3 | 2 |
| F19-03 | 관심인 | [F19-03_privacy-visibility-settings_prd.md](02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md) | `source-first` | source-first 구현 확인 | 3 | 2 |
| F20-01 | 고객지원 | [F20-01_inquiry_prd.md](02_feature_prds/20_support/F20-01_inquiry_prd.md) | `source-first` | source-first 부분 구현 | 2 | 3 |
| F20-02 | 고객지원 | [F20-02_operational-issue_prd.md](02_feature_prds/20_support/F20-02_operational-issue_prd.md) | `source-first` | source-first 부분 구현 | 2 | 3 |
| F20-03 | 고객지원 | [F20-03_support-faq_prd.md](02_feature_prds/20_support/F20-03_support-faq_prd.md) | `source-first` | source-first 구현 확인 | 1 | 1 |
| F21-01 | 제공자 배정·정산 | [F21-01_provider-assignment_prd.md](02_feature_prds/21_curated/F21-01_provider-assignment_prd.md) | `source-first` | source-first 구현 확인 | 4 | 6 |
| F21-02 | 제공자 배정·정산 | [F21-02_participant-fee-charge_prd.md](02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md) | `source-first` | source-first 구현 확인 | 6 | 7 |
| F21-03 | 제공자 배정·정산 | [F21-03_provider-settlement_prd.md](02_feature_prds/21_curated/F21-03_provider-settlement_prd.md) | `source-first` | source-first 구현 확인 | 5 | 7 |
| F21-04 | 제공자 배정·정산 | [F21-04_free-invite-host-subsidy_prd.md](02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md) | `source-first` | source-first 구현 확인 | 4 | 5 |
| F21-05 | 제공자 배정·정산 | [F21-05_refund-clawback_prd.md](02_feature_prds/21_curated/F21-05_refund-clawback_prd.md) | `source-first` | source-first 구현 확인 | 5 | 5 |
| F21-06 | 제공자 배정·정산 | [F21-06_engagement-prepayment_prd.md](02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md) | `source-first` | source-first 구현 확인 | 5 | 5 |
| F21-07 | 제공자 배정·정산 | [F21-07_regular-meeting-bulk_prd.md](02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md) | `source-first` | source-first 구현 확인 | 4 | 6 |

## 누락/확인 필요

누락된 기능 PRD는 없다.

## 2026-08 미반영 백로그 (이번 동기화 범위 밖 — 기록만)

> 이 저장소의 마지막 전면 동기화는 2026-07-30(HEAD `712079f`)이다. 그 이후 루트 워크스페이스에 착지한 아래 항목들은 **아직 이 저장소의 PRD/시각화에 반영되지 않았다**. 2026-08-18 동기화는 ①이메일 인증 제한 세션(F01-03 한정) ②P0 결제 태세(포인트 유예·계좌이체 개방) 두 축만 반영했다. 나머지는 다음 동기화 wave의 작업 목록이다. 각 항목의 정본 근거는 루트 `docs/` 경로를 병기한다(이 저장소 기준 `../../docs/`).
>
> 새 기능 ID를 만들지 않는다는 원칙은 유지한다 — 대부분 기존 기능(F03·F06·F13·F17·F18)의 내용 확장이며, 반영 시점에 어느 기능 PRD에 흡수할지 먼저 정한다.

| # | 미반영 항목 | 내용 요약 | 정본 근거 |
|---|---|---|---|
| 1 | 호스트 계좌 직접 수납 전체 플로우 (MNY-03B) | 호스트 수납 계좌 등록·모임 결박, 참가자 입금자명 신고, 호스트 입금 확인/거절, 수동 환불과 수령 확인, 계좌 1원 인증(실 제공자 계약 전에는 인증 없이 개통), 관리자 대행 처리까지의 사용자·운영 동선 전체. 현재 F03-13/F17-07에는 결제수단 판정만 반영돼 있고 계좌 등록·확인 화면 계약은 없다. | `docs/plan/MNY03B_HOST_DIRECT_CASH_PLAN_2026-08-17.md`, `docs/release-gate/evidence/MNY-03B/`, `docs/plan/G0_10_PAID_EVENT_PAYMENT_DECISION_2026-08-11.md` |
| 2 | 출시 범위 게이트 (P0-SCOPE-01) | 이 배포가 파는 도메인만 열고 나머지 7개 도메인은 서버·앱 양쪽에서 봉인하는 구조. 봉인된 도메인의 기존 건에 대한 조회·취소·환불 등 **안전 출구**는 유지된다는 계약을 포함한다. 앱은 서버가 주는 범위 목록으로 메뉴·라우트를 그린다. | `docs/plan/P0SCOPE_ACCLOCK_EXECUTION_PLAN_2026-08-17.md`, `docs/release-gate/evidence/P0SCOPE-ACCLOCK/` |
| 3 | 계정 정지·차단의 권리구제 (ACC-LOCK-01) | 정지·차단 계정은 로그인을 거부당하지 않고 **제한된 권한의 세션**을 받는다. 제재 안내 화면, 본인 케이스 결과 확인·이의 제기, 데이터 권리 등 허용 동선 22행이 확정됐다. 현재 인증·프로필 계열 PRD(F01·F13·F15)에는 이 제한 세션 개념 자체가 없다. | `docs/plan/P0SCOPE_ACCLOCK_EXECUTION_PLAN_2026-08-17.md`, `docs/release-gate/evidence/P0SCOPE-ACCLOCK/` |
| 4 | 분쟁 종결 완결 (DSP-01) | 분쟁 케이스의 자동/수동 종결, 보상 원장, 당사자 명령·동의 종결, 관리자 위임 확정, 종결 고지 단일화. F18-01~05 전체가 이 재설계 이전 기준이다. | `docs/plan/DSP01_DISPUTE_CLOSURE_PLAN_2026-08-16.md`, `docs/release-gate/evidence/DSP-01/` |
| 5 | 버스·카풀 이동 수단 (MOV-01) | 이벤트 이동 수단(전세버스 좌석 배정 3모드·카풀 상태 흐름)과 좌석 이동·신고 규칙. F03-14~17이 이 착지 이전 기준이다. | `docs/IMPLEMENTATION_WORKBOARD.md`, `docs/plan/FEATURE_IMPLEMENTATION_COMPLETENESS_MATRIX_2026-08-12.md` |
| 6 | 마일리지 규칙·배지 (MLG-01) | 기본 적립 규칙 3종 시딩, 규칙의 신규 적용 전용 원칙, 서버 계산 권한 게이팅, 배지·등급. F16-01~08이 이 착지 이전 기준이다. | `docs/IMPLEMENTATION_WORKBOARD.md`, `docs/club_activity/mileage/README.md` |
| 7 | 이메일 인증 제한 세션의 화면 파급 | 2026-08-18 동기화는 F01-03(및 F01-01·F01-02의 모순 서술)만 정정했다. 미인증 상태에서 각 도메인 화면이 무엇을 보여주고 어디로 안내하는지는 아직 각 기능 PRD에 반영되지 않았다. | `docs/plan/PENDING_DECISIONS_2026-08-15.md`, `docs/release-gate/evidence/P0-REAL-ACCOUNT-E2E/`, `docs/release-gate/RC_MANIFEST_2026-08-18_P0_R2.md` |
