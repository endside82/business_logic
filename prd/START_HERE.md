# PRD를 처음 보는 사람을 위한 읽는 법

## 결론

사람은 `02_feature_prds/` 전체를 처음부터 읽으면 안 된다. 먼저 상태표에서 담당
기능의 위치, trace 수, risk 후보 수를 확인하고 필요한 기능 문서만 들어간다.

먼저 아래 순서로 본다.

1. 제품 전체를 알고 싶으면 `00_product_prd.md`
2. 전체 기능 PRD 전환 상태를 알고 싶으면 `PRD_MIGRATION_STATUS.md`
3. 보조 문서의 역할을 알고 싶으면 `SUPPORTING_DOCS_INDEX.md`
4. 지금 PRD 작성 기준을 알고 싶으면 `FEATURE_PRD_STANDARD.md`
5. 제대로 된 기능 PRD 예시를 보고 싶으면 `02_feature_prds/03_event/F03-02_event-detail_prd.md`
6. 특정 기능을 실제로 파악하려면 `business_logic/units/<domain>/<feature>/`의
   `backend.md`, `frontend.md`, `scenarios.md`, `diagrams.md`
7. 구현 우선순위와 현재 위험도를 보려면 `../../docs/IMPLEMENTATION_CROSSWALK.md`와
   `../../docs/IMPLEMENTATION_WORKBOARD.md`
8. 기능 175개의 제품 시나리오 정의·자동 테스트·사용자 여정 연결 상태는
   [기능별 제품 시나리오 완성도 감사](04_qa_acceptance/scenario_completeness_audit_2026-08-30.md)
9. v4.5 이벤트 확장(W1~W7)의 현재 계약은 F03-13~17 기능 PRD와
   `community_api` 실제 소스에서 본다. 과거 `docs/plan/event-extensions/` 계획 산출물 3개는
   실코드 병합 뒤 2026-06-05 폐기됐다.
10. **현재 소스를 우선 확인하는 58개 기능은 `units/` 폴더 없이 운영된다.**
   2026-06-05까지 51개였고, 이후 제공자 배정·정산 F21-01~07이 7개 추가됐다.
   정본 위치와 정확한 기능 목록은 `PRD_MIGRATION_STATUS.md` 상단 운영 원칙에서 확인한다.
11. 2026-07-29 실제 소스 기준점과 재실측 Gap은 `05_planning_artifacts/current_source_update_2026-07-29.md`에서 확인한다.

## v4.5 W1~W7 이벤트 확장 계보 (2026-05-22)

이벤트 도메인 5개 PRD는 W1~W7 계획을 거쳐 추가됐다. 당시 계획 파일은 폐기됐으므로,
아래 기능 PRD와 실제 Controller/Service/DTO/enum을 현재 근거로 사용한다.

| ID | 기능 | 현재 기능 PRD | Wave |
|---|---|---|---|
| F03-13 | 참가 선입금 (WALLET/BANK_TRANSFER) | `02_feature_prds/03_event/F03-13_event-prepayment_prd.md` | W2a/W2b/W3 |
| F03-14 | 이동수단 공통 설정 | `02_feature_prds/03_event/F03-14_event-transport-mode_prd.md` | W4에서 시작, 2026-09-02 통합 완료 |
| F03-15 | 카풀·자차 | `02_feature_prds/03_event/F03-15_event-carpool_prd.md` | W5에서 시작, 2026-09-02 통합 완료 |
| F03-16 | 대절 버스와 자리 배정 | `02_feature_prds/03_event/F03-16_event-bus-charter_prd.md` | W7에서 시작, 2026-09-02 통합 완료 |
| F03-17 | 차량 좌석 배치도 운영 | `02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md` | W6에서 시작, 2026-09-02 운영 화면 완료 |

enum 번호와 충돌은
`community_api/src/test/java/com/endside/community/EnumReservationTest.java`가 회귀 검증한다.

## 역할별로 뭘 보면 되나

| 사람 | 먼저 볼 것 | 이유 |
|---|---|---|
| 신규 기획자 | `00_product_prd.md` -> `00_prd_items/05_feature_definitions.md` | 제품 구조와 175개 기능 이름을 빠르게 잡는다. |
| 기능 담당 기획자 | `PRD_MIGRATION_STATUS.md` -> 담당 기능 PRD -> 담당 기능의 `units/*` 4개 문서 | 전환 상태와 risk 후보를 먼저 보고 실제 source 기반 근거를 확인한다. |
| 개발자 | `../../docs/IMPLEMENTATION_CROSSWALK.md` -> 담당 기능의 `units/*/backend.md` -> 실제 서버 소스 | 패키지가 아니라 서버부터 앱까지 이어지는 기능 단위로 구현 범위를 잡는다. |
| Flutter 개발자 | 담당 기능의 `units/*/frontend.md` -> 실제 API/Repository/Provider/Screen | 서버 계약과 화면 분기 사이의 불일치를 찾는다. |
| QA | 현재 소스 우선 기능 PRD의 `상태·권한 표`, `남은 문제와 위험`, `검증 현황` | 어떤 시나리오가 닫혔고 어디가 미검증인지 본다. |
| PO/운영 | `05_planning_artifacts/decision_register.md`와 각 기능 PRD의 `미결정 / 후속` | 코드로 닫을 수 없는 정책/운영 결정을 본다. |

## 현재 믿어도 되는 문서

| 문서 | 신뢰도 | 이유 |
|---|---|---|
| `PRD_MIGRATION_STATUS.md` | 운영 기준 | 175개 기능 PRD의 전환 상태, trace 수, risk 후보 수를 한 번에 보여준다. |
| `SUPPORTING_DOCS_INDEX.md` | 보조 문서 안내 | 인벤토리, 정책, QA, Notion/운영 산출물의 역할을 구분한다. |
| `FEATURE_PRD_STANDARD.md` | 기준 문서 | 앞으로 기능 PRD를 어떻게 써야 하는지 정의한다. |
| `02_feature_prds/03_event/F03-02_event-detail_prd.md` | golden sample | 실제 서버/Flutter 소스를 다시 대조해서 Gap/Risk까지 남긴 첫 샘플이다. |
| `02_feature_prds/*` 전환본 | 기능 판단 출발점 | 116개 기능 PRD가 `units` 실사 자료를 기준으로 재배치됐다. 구현 착수 전 trace source 재확인이 필요하다. |
| `business_logic/units/*/*/{backend,frontend,scenarios,diagrams}.md` | 원천 실사 자료 | 기존 절차에서 실제 소스 확인을 강제하기 위해 만든 자료다. 다만 stale 가능성이 있으므로 실제 소스로 재확인한다. |
| `00_product_prd.md`, `00_prd_items/*`, `01_domain_prds/*` | 개요/인벤토리 | 제품 구조를 훑는 용도다. 세부 판단 근거로 단독 사용하면 안 된다. |

## 특정 기능을 파악하는 실제 순서

예를 들어 `F03-05 이벤트 신청 & 참석`을 본다면:

1. `PRD_MIGRATION_STATUS.md`에서 `F03-05`의 PRD, unit 근거, trace/risk 후보 수를 확인한다.
2. `02_feature_prds/03_event/F03-05_event-attendance_prd.md`의 `결론`, `실사 근거`, `Gap/Risk`를 먼저 본다.
3. `business_logic/units/03_event/F03-05_event-attendance/backend.md`를 읽는다.
4. `business_logic/units/03_event/F03-05_event-attendance/frontend.md`를 읽는다.
5. 실제 서버 Controller/Service/VO/Enum을 확인한다.
6. 실제 Flutter API/Repository/Provider/Screen/Widget을 확인한다.
7. `scenarios.md`에서 사용자 흐름을 확인한다.
8. 서버 응답 필드와 Flutter 소비 필드를 비교한다.

## 독자가 얻어야 하는 답

좋은 기능 PRD를 읽고 나면 아래 질문에 답할 수 있어야 한다.

- 이 기능은 현재 실제로 어디까지 동작하는가?
- 서버가 주는 계약과 Flutter가 기대하는 계약이 맞는가?
- 상태/권한별로 버튼과 화면이 어떻게 달라지는가?
- 사용자가 피해를 볼 수 있는 Gap/Risk는 무엇인가?
- 어떤 테스트가 이 판단을 뒷받침하는가?
- 제품/운영/법무 결정 없이는 못 닫는 항목은 무엇인가?

이 질문에 답하지 못하는 문서는 PRD가 아니라 인벤토리 또는 초안으로 취급한다.
