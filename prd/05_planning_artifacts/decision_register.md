# 결정 등록부

<!-- supporting-doc-status: 2026-05-18 -->

> 문서 상태: **보조 문서**. 기능별 현재 계약, source trace, Gap/Risk 판단은 [PRD_MIGRATION_STATUS.md](../PRD_MIGRATION_STATUS.md)와 각 기능 PRD를 우선한다. 이 문서는 인벤토리, 정책, QA, 기획 운영 기준을 보조하며, 기능 세부 판단은 [FEATURE_PRD_STANDARD.md](../FEATURE_PRD_STANDARD.md) 기준으로 재확인한다.

## 1. 아직 확정이 필요한 결정

| ID | 주제 | 결정해야 할 것 | 영향 범위 | 권장 담당 |
|---|---|---|---|---|
| D-01 | MVP 범위 | 168개 기능 중 첫 출시 포함/제외 | 전체 로드맵 | PO/기획 |
| D-02 | 성공 KPI | 가입, 신청, 결제, 재방문 지표 | 제품 PRD | PO/데이터 |
| D-03 | 운영 SLA | 신고, 환불, 정산 이의 처리 시간 | 운영/CS/정책 | 운영 |
| D-04 | 환불 기준 | 이벤트 취소, 선입금, 포인트 환불 기준 | 결제/정산 | 기획/법무 |
| D-05 | 데이팅 안전 정책 | 인증, 차단, 신고, 위치 공유 제한 | 데이팅/안전 | 기획/법무 |
| D-06 | 위치 공유 문구 | 동의, 중지, 공유 범위 고지 | 위치/이벤트/데이팅 | 기획/법무 |
| D-07 | 알림 우선순위 | 푸시, 알림함, 방해금지 예외 | 알림 전체 | 기획/운영 |
| D-08 | 클럽 기금 운영 | 출금 권한, 증빙, 감사 로그 기준 | 클럽/결제 | 기획/운영 |
| D-09 | 플랜 마켓 심사 | 발행, 숨김, 구매 후 환불 기준 | 플랜 마켓 | PO/운영 |
| D-10 | 계정 삭제 유예 | 30일 유예 중 제한/복구 범위 | 계정/개인정보 | 기획/법무 |

## 2. 결정 기록 양식

| 항목 | 내용 |
|---|---|
| 결정 ID | D-00 |
| 결정일 | YYYY-MM-DD |
| 결정자 | 이름/역할 |
| 결정 내용 | 한 문장으로 작성 |
| 근거 | 사용자 피해, 운영 비용, 기술 제약, 법무 검토 등 |
| 영향을 받는 문서 | 관련 PRD 파일 또는 기능 ID |
| 재검토 조건 | 지표/정책/출시 범위 변경 시 |

## 3. 정기모임(Regular Meeting) 확정 결정 로그

> **2026-05-27 일괄 확정 완료** (A~T + J·K + 시뮬레이션 결정 C8·C11·P2·P3 + 정합성 접근 B = 미확정 0).
> Canonical: [docs/plan/regular-meeting/03-design-decisions.md](../../../docs/plan/regular-meeting/03-design-decisions.md) — 결정 식별자(A~T)는 분할 후에도 **불변**. namespace 변환(D-11 등) 안 함.
> 본 표는 요약·교차 참조 인덱스. 결정 본문/근거/검증 조건은 canonical에서 본다.

| ID | 주제 | 결정 요약 | 영향 |
|---|---|---|---|
| A | 도메인명 | 신규 first-class 도메인 `RegularMeeting` (클럽·EventRecurrence 부적합) | 패키지 명명 / 책임 경계 |
| B | event_id 다중 모임 | `regular_meeting_event.event_id` UNIQUE (한 이벤트 = 최대 1모임) | DDL 제약 |
| C | EventType 신규값 | `EventType.REGULAR_MEETING(3)` 추가 (클럽 패턴 미러) | 03_event |
| D | 사교 정산 | 1차 = 유료 참가권 + 환불. 사교 N빵 정산은 선택 후순위 | 06/07 정산 |
| E | 결제 객체 격리 | 신규 `regular_meeting_payment` (기존 `event_payment` 오버로드 회피) | 06 결제 |
| F | FIXED 중도 환불 | **진행 세션 차감(pro-rata)** — F17-08 산식 | 환불 |
| G | FIXED 결제 시점 | 승인제=승인 후 마감 / 무승인=즉시 | 등록·결제 |
| H | VARIABLE 유료·무료 혼재 | 허용 (이벤트별 가격) | 검증 |
| I | EventRecurrence 관계 | 분리 유지 (RM과 EventRecurrence는 별개) | 범위 경계 |
| J | 회계 레저 | **신규 RM 전용 메서드** `recordRegularMeetingPayment/Refund` (기존 event-id-shaped 메서드 미변경, 리스크 격리) | 회계 분개 |
| K | failed_refund 확장 | `failed_refund.regular_meeting_id` 컬럼 추가 + `event_id` nullable화. 신규 테이블 기각 | 환불 재시도 |
| L | 탈퇴 처리 | **환불 완료 전까지 탈퇴 불가**(blocking). `AccountDeactivationService` 4건 가드 추가 | 13 프로필 |
| M | 노쇼 기본 정책 | `NONE`(OFF) 기본. 호스트가 WARN/FORFEIT 선택 | UX·약관 |
| N | 노쇼 카운트 모드 | `CONSECUTIVE`(연속) 기본. 모임별 선택 | 정책 평가 |
| O | 출석 확정 방식 | **호스트 수동 승인이 기본.** 스케줄러 자동확정은 보조(기본 OFF) | 출석 |
| P | FORFEIT 무환불 적법성 | 등록 시 환불정책 + (FORFEIT 시) 무환불 약관 필수 고지·동의 | 리스크 |
| Q | 금액 표기 일관성 | 원(KRW) 정수. `BigDecimal` + 100원 floor (Event.price 미러) | 금액 타입 |
| R | RM 세션 디스커버리 | 세션을 검색·캘린더에 **노출**. FIXED는 컨텍스트화 + 직접신청 가드 + 가시성 가드 | 검색/홈/캘린더 |
| S | FIXED 출석 저장 방식 | 기존 EventAttendance **재사용** (조건부). bulk ATTENDING 금지 + ≥24h 전 materialize + post-finalize `ATTENDED` 권위 | 출석/체크인/통계 |
| T | FIXED 호스트 정산 경로 | **(B) 신규 RM 정산 전체 경로** — `Settlement.regular_meeting_id` + `recordSettlementComplete` + RM-keyed clawback. 코스 완료 경계 발화 | 호스트 수익 지급 |
| C8 (시뮬) | FORFEIT vs 호스트 비제공 | 몰수는 제공된 미참석 세션만 무환불. 호스트 미제공 세션은 몰수 멤버에게도 환불 | 06/07 정산 |
| C11/P3 (시뮬) | 리뷰 자격 | **세션마다** (코스 1회 아님). 자격 = 그 세션 ATTENDED | 11 리뷰 |
| P2 (시뮬) | 중도 등록 | 호스트 권한(허용 토글). 가격 = 잔여 세션 비례 (`price×잔여/N`) | 06 결제 |
| 정합성 접근 | Event 중앙 분류 | **B안 (공용 거름망 2개)** — 디스커버리 predicate + service 가드. RM은 Event 도메인 정리 선행 작업 | 03 이벤트 |
