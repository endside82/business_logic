# community PRD 문서 묶음

이 폴더는 `business_logic` 원문과 기획자 온보딩 문서를 기반으로 생성한 기능형 전체 PRD다.

## 먼저 볼 문서

처음 보는 사람은 이 README가 아니라 `START_HERE.md`부터 본다.

- 사람용 읽는 법: `START_HERE.md`
- PRD 문서 상태표: `PRD_MIGRATION_STATUS.md`
- 보조 문서 인덱스: `SUPPORTING_DOCS_INDEX.md`
- 기능 PRD 작성 표준: `FEATURE_PRD_STANDARD.md`
- 제대로 된 기능 PRD 샘플: `02_feature_prds/03_event/F03-02_event-detail_prd.md`
- 현재 소스 실측 노트: `05_planning_artifacts/current_source_update_2026-07-29.md`
- [기능별 제품 시나리오 완성도 감사](04_qa_acceptance/scenario_completeness_audit_2026-08-30.md)

## 현재 운영 원칙

`02_feature_prds/`의 기능 PRD는 단순 기능 설명서가 아니라 실사 기반 판단 문서로 운영한다.
작성자는 `backend.md`/`frontend.md`를 출발점으로 삼되, 반드시 실제 서버와 Flutter
소스를 다시 확인해야 한다.

- 사람용 시작점: `START_HERE.md`
- PRD 문서 상태표: `PRD_MIGRATION_STATUS.md`
- 보조 문서 인덱스: `SUPPORTING_DOCS_INDEX.md`
- 작성 표준: `FEATURE_PRD_STANDARD.md`
- golden sample: `02_feature_prds/03_event/F03-02_event-detail_prd.md`
- 현재 소스 실측: `05_planning_artifacts/current_source_update_2026-07-29.md`
- legacy 자동 생성기: `business_logic/prd_tools/generate_prd.mjs`
- 현재 소스 우선 방식으로 바꾸는 도구: `business_logic/prd_tools/rebuild_feature_prds_from_units.mjs`

2026-07-29 기준 `02_feature_prds/` 175개 중 117개는 `business_logic/units` 원천을
보유한다(1개 golden sample, 115개 실사 기반 전환본, 1개 실사 기반 갱신본).
나머지 58개는 `units/` 없이 실제 소스·계획·구현 리포트를 정본으로 삼는다.
구현 착수 전에는 각 문서에서 `Trace Source`, `현재 소스와의 정합성`, `남은 문제와 위험`이라는 제목을
찾아 실제 코드와 다시 대조한다.
2026-06-24 이후 구현된 게스트 동반 예매, 궁합/핏 Phase 0, 플랜 블록 에디터 후속,
위치/길찾기 보강, 연결성/커뮤니티 메시지, 재사용 경험 루프는 신규 기능 ID를 만들지 않고
기존 기능 PRD의 현재 소스 갱신으로 흡수한다.

## 구성

| 경로 | 내용 | 먼저 보는 사람 | 산출/결정 |
|---|---|---|---|
| START_HERE.md | 사람용 PRD 읽는 법 | 신규 기획자, 개발자, QA, PO | 역할별로 무엇을 먼저 봐야 하는지 |
| PRD_MIGRATION_STATUS.md | 175개 기능 PRD 문서 상태표 | 문서 운영자, 기능 담당자, QA | 기준 예시·전환본·현재 소스 우선 문서·추적 근거·위험 후보 현황 |
| SUPPORTING_DOCS_INDEX.md | 보조 PRD 문서 27개 인덱스 | 문서 운영자, PO, QA | 인벤토리/정책/QA/운영 문서의 역할 구분 |
| 05_planning_artifacts/current_source_update_2026-07-29.md | 현재 소스 실측 노트 | 문서 운영자, 기능 담당자, QA | 기준 커밋, 50개 재실측 기능, UI 미배선·권한·보안 Gap과 검증 결과 |
| 00_product_prd.md | 제품 전체 PRD | PO, 신규 기획자, 이해관계자 | 제품 범위, 사용자 유형, 전체 여정, 미결정 항목 |
| FEATURE_PRD_STANDARD.md | 실사 기반 기능 PRD 작성 표준 | PRD 작성자, 리뷰어 | 현재 소스 우선 작성 절차, 금지 패턴, 품질 체크 |
| 00_prd_items/ | PRD 작성 가능 항목별 독립 문서 12개 | 신규 기획자, 문서 운영자 | 서비스 개요, persona, 정보구조, 기능 정의, 상태/권한/QA 기준 |
| 01_domain_prds/ | 21개 업무 영역별 PRD | 도메인 담당 기획자 | 도메인 목적, 기능 목록, 영역별 수용 기준 |
| 02_feature_prds/ | 175개 기능별 PRD | 기능 담당 기획자, QA | 기능 목적, 실제 계약, 정합성 판단, Gap/Risk, 수용 기준 |
| 03_policy_prds/ | 상태, 권한, 알림, 결제/정산, 개인정보/안전 정책 | 정책/운영/기획 | 공통 정책, 상태/권한 판단, 민감 기능 기준 |
| 04_qa_acceptance/ | 수용 기준, 시나리오 커버리지, 릴리즈 체크리스트 | QA, 릴리즈 담당자 | QA 기준, 회귀 검토, 출시 차단 조건 |
| [기능별 제품 시나리오 완성도 감사](04_qa_acceptance/scenario_completeness_audit_2026-08-30.md) | 기능 175개의 시나리오·자동 테스트·사용자 여정 근거 연결 | 기획, QA, 개발 | 기능별 현재 근거와 다음 확인 순서 |
| 05_planning_artifacts/ | Notion 업로드, 결정 등록부, MVP 범위, 리뷰 워크숍 | PO, 문서 운영자 | 업로드 순서, 미결정 사항, MVP 후보, 리뷰 진행안 |

## 추천 읽기 순서

1. `START_HERE.md`에서 역할별 읽는 법을 확인한다.
2. `PRD_MIGRATION_STATUS.md`에서 담당 기능 PRD의 상태와 trace/risk 수를 확인한다.
3. `SUPPORTING_DOCS_INDEX.md`에서 보조 문서 역할을 확인한다.
4. `00_product_prd.md`로 제품 전체를 잡는다.
5. `FEATURE_PRD_STANDARD.md`에서 기능 PRD의 현재 소스 우선 작성 기준을 확인한다.
6. `02_feature_prds/03_event/F03-02_event-detail_prd.md`를 golden sample로 읽는다.
7. `00_prd_items/README.md`에서 PRD 항목별 문서 역할을 확인한다.
8. `00_prd_items/05_feature_definitions.md`로 175개 기능을 훑는다.
9. `01_domain_prds/`에서 담당 도메인의 목적과 범위를 확인한다.
10. `03_policy_prds/`로 상태, 권한, 돈, 알림, 안전 정책을 먼저 고정한다.
11. `02_feature_prds/`에서 기능별 상세 계약, 시나리오, Gap/Risk 후보를 검토한다.
12. `04_qa_acceptance/`와 `05_planning_artifacts/`로 QA와 운영 결정을 추적한다.

## 기능 PRD 갱신 절차

1. `business_logic/units/<domain>/<feature>/backend.md`와 `frontend.md`를 읽는다.
2. 실제 `community_api/src/`의 Controller, Service, VO/DTO, enum을 다시 확인한다.
3. 실제 `community_app/lib/`의 API, Repository, Provider, Screen/Widget을 다시 확인한다.
4. 서버 응답 필드와 Flutter 소비 필드를 비교한다.
5. 상태/권한별 CTA 매트릭스를 작성한다.
6. 일치, 불일치, 미구현, 미검증을 `Gap / Risk`로 남긴다.
7. 검증 파일이 무엇을 증명하는지 적고, 없는 검증은 숨기지 않는다.

## 범위

- 작성 가능: 기능 구조, 사용자 유형, 기능 요구사항, 상태/권한, 시나리오 수용 기준, QA 체크.
- 별도 결정 필요: 사업 KPI, 출시 일정, 법무 최종 문구, 운영 SLA, 최종 UX 카피.

## 생성 기준

- 21개 업무 영역
- 175개 기능 (v4.5 W1~W7 신규 5개 F03-13~17 + F03-18/F04-17 인구통계 + F08-14/F08-15 환불·매출 귀속 + F15·F16·F17 도메인 신설 + 2026-06-05 F18 분쟁 해결·F19 관심인·F20 고객지원 도메인 신설 및 F03-19/F03-20/F04-18/F11-07 신규 누적)
- 시나리오 정의 기능 175/175. 기능 목록 등록 숫자 합 1,403, 상세 문서 117개의 실제 제목 1,086, 등록값 불일치 49개. 어느 숫자도 아직 테스트 통과율의 분모로 사용하지 않음
- 552개 도식

## v4.5 이벤트 확장 계보 (2026-05-22, 계획 산출물 2026-06-05 폐기)

이벤트 도메인 확장은 처음에 `docs/plan/event-extensions/`의 3개 계획 산출물로 관리됐지만,
실코드 병합 뒤 2026-06-05 정리에서 해당 파일들이 폐기됐다. 현재 계약은 F03-13~17 기능 PRD와
`community_api`의 실제 Controller/Service/DTO/enum이 기준이다. enum 번호와 중복은
`community_api/src/test/java/com/endside/community/EnumReservationTest.java`가 회귀 검증한다.

당시 추가된 기능 PRD 5개:

| ID | 기능 | Wave |
|---|---|---|
| F03-13 | 참가 선입금 (WALLET/BANK_TRANSFER) | W2a/W2b/W3 |
| F03-14 | 이동수단 공통 설정 | W4에서 시작, 2026-09-02 통합 완료 |
| F03-15 | 카풀·자차 | W5에서 시작, 2026-09-02 통합 완료 |
| F03-16 | 대절 버스와 자리 배정 | W7에서 시작, 2026-09-02 통합 완료 |
| F03-17 | 차량 좌석 배치도 운영 | W6에서 시작, 2026-09-02 운영 화면 완료 |

영향 받는 보조 문서: `PRD_MIGRATION_STATUS.md`, `SUPPORTING_DOCS_INDEX.md`, `03_policy_prds/notification_policy_prd.md`, `03_policy_prds/permission_policy_prd.md`, `03_policy_prds/state_policy_prd.md`, `00_product_prd.md`.
