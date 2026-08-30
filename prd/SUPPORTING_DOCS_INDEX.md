# 보조 PRD 문서 인덱스

> 업데이트: 2026-08-30. 이 인덱스는 기능 PRD가 아닌 현재 존재 자료 32개
> (`business_logic` 내부 30개 + 외부 참조 2개)를 추적한다.

## 읽는 법

보조 문서는 기능별 source-of-truth가 아니다. 기능별 현재 계약, source trace, Gap/Risk는 `PRD_MIGRATION_STATUS.md`와 `02_feature_prds/`의 기능 PRD에서 확인한다. 이 문서들은 제품 구조, 정책, QA, Notion/운영 흐름을 보조한다.

## 목록

| 문서 | 제목 | 역할 |
|---|---|---|
| [00_prd_items/01_service_overview.md](00_prd_items/01_service_overview.md) | 서비스 개요 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/02_user_personas.md](00_prd_items/02_user_personas.md) | 사용자 유형과 Persona | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/03_information_architecture.md](00_prd_items/03_information_architecture.md) | 전체 정보구조와 기능구조 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/04_domain_purposes.md](00_prd_items/04_domain_purposes.md) | 21개 도메인별 목적 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/05_feature_definitions.md](00_prd_items/05_feature_definitions.md) | 175개 기능 정의 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/06_user_journeys.md](00_prd_items/06_user_journeys.md) | 사용자 여정 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/07_role_action_matrix.md](00_prd_items/07_role_action_matrix.md) | 권한/역할별 액션 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/08_state_transitions.md](00_prd_items/08_state_transitions.md) | 상태 전이 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/09_exceptions_edge_cases.md](00_prd_items/09_exceptions_edge_cases.md) | 예외와 엣지 케이스 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/10_impact_matrix.md](00_prd_items/10_impact_matrix.md) | 알림/결제/정산/위치 영향 매트릭스 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/11_qa_acceptance_criteria.md](00_prd_items/11_qa_acceptance_criteria.md) | QA Acceptance Criteria | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/12_notion_markdown_guide.md](00_prd_items/12_notion_markdown_guide.md) | Notion 업로드용 Markdown 가이드 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [00_prd_items/README.md](00_prd_items/README.md) | PRD 항목별 문서 | 제품/도메인/기능 인벤토리와 PRD 작성 항목 |
| [03_policy_prds/notification_policy_prd.md](03_policy_prds/notification_policy_prd.md) | 알림 정책 PRD | 공통 정책과 상태/권한/결제/알림/안전 판단 기준 |
| [03_policy_prds/payment_settlement_policy_prd.md](03_policy_prds/payment_settlement_policy_prd.md) | 결제·정산 정책 PRD | 공통 정책과 상태/권한/결제/알림/안전 판단 기준 |
| [03_policy_prds/permission_policy_prd.md](03_policy_prds/permission_policy_prd.md) | 권한 정책 PRD | 공통 정책과 상태/권한/결제/알림/안전 판단 기준 |
| [03_policy_prds/planning_qa_policy.md](03_policy_prds/planning_qa_policy.md) | 기획 QA 정책 | 공통 정책과 상태/권한/결제/알림/안전 판단 기준 |
| [03_policy_prds/privacy_safety_policy_prd.md](03_policy_prds/privacy_safety_policy_prd.md) | 개인정보·안전 정책 PRD | 공통 정책과 상태/권한/결제/알림/안전 판단 기준 |
| [03_policy_prds/state_policy_prd.md](03_policy_prds/state_policy_prd.md) | 상태 정책 PRD | 공통 정책과 상태/권한/결제/알림/안전 판단 기준 |
| [04_qa_acceptance/acceptance_criteria_matrix.md](04_qa_acceptance/acceptance_criteria_matrix.md) | 전체 수용 기준 매트릭스 | 수용 기준, 시나리오 커버리지, 릴리즈 체크 |
| [04_qa_acceptance/release_readiness_checklist.md](04_qa_acceptance/release_readiness_checklist.md) | 릴리즈 준비 체크리스트 | 수용 기준, 시나리오 커버리지, 릴리즈 체크 |
| [04_qa_acceptance/scenario_coverage_matrix.md](04_qa_acceptance/scenario_coverage_matrix.md) | 시나리오 커버리지 PRD | 수용 기준, 시나리오 커버리지, 릴리즈 체크 |
| [04_qa_acceptance/scenario_completeness_audit_2026-08-30.md](04_qa_acceptance/scenario_completeness_audit_2026-08-30.md) | 기능별 제품 시나리오 완성도 감사 | 기능 175개의 시나리오 정의, 자동 테스트·사용자 여정 근거 연결, 다음 확인 순서 |
| [05_planning_artifacts/decision_register.md](05_planning_artifacts/decision_register.md) | 결정 등록부 | Notion 업로드, 결정 등록부, MVP/워크숍 등 운영 산출물 |
| [05_planning_artifacts/mvp_scope_matrix.md](05_planning_artifacts/mvp_scope_matrix.md) | MVP 범위 매트릭스 | Notion 업로드, 결정 등록부, MVP/워크숍 등 운영 산출물 |
| [05_planning_artifacts/notion_import_order.md](05_planning_artifacts/notion_import_order.md) | Notion 업로드 순서 | Notion 업로드, 결정 등록부, MVP/워크숍 등 운영 산출물 |
| [05_planning_artifacts/ppt_feature_intro_outline_draft.md](05_planning_artifacts/ppt_feature_intro_outline_draft.md) | community 기능 소개 PPT 항목 초안 | Notion 업로드, 결정 등록부, MVP/워크숍 등 운영 산출물 |
| [05_planning_artifacts/prd_review_workshop.md](05_planning_artifacts/prd_review_workshop.md) | PRD 리뷰 워크숍 가이드 | Notion 업로드, 결정 등록부, MVP/워크숍 등 운영 산출물 |
| [05_planning_artifacts/current_source_update_2026-07-29.md](05_planning_artifacts/current_source_update_2026-07-29.md) | 2026-07-29 현재 소스 실측 갱신 노트 | 기준 커밋과 병렬 dirty 입력, 50개 기능의 source/UI 교차 실측, 확정 Gap/Risk, 테스트·문서 검증 결과 |
| [05_planning_artifacts/current_source_update_2026-07-08.md](05_planning_artifacts/current_source_update_2026-07-08.md) | 2026-07-08 현재 소스 갱신 노트 | 2026-06-24 이후 구현된 게스트 동반 예매·궁합/핏·플랜 에디터·위치/길찾기·커뮤니티 메시지 변경을 기존 175개 기능 체계에 흡수한 기준 |
| [../../docs/plan/regular-meeting/README.md](../../docs/plan/regular-meeting/README.md) | 정기모임 구현 계획 (16분할) | GLOSSARY · 16개 분할본(요구/결제·환불/노쇼/예외/Flutter/Phase 등) + NEXT_SESSION을 담은 2026-05-28 설계 배경. 현재 계약은 F17 PRD와 실제 API/App 소스가 우선한다. |
| [../../community_api/docs/plan/regular-meeting/IMPLEMENTATION_REPORT_2026_05_28.md](../../community_api/docs/plan/regular-meeting/IMPLEMENTATION_REPORT_2026_05_28.md) | 정기모임 구현 리포트 | Pre-1 → Phase 1~7 구현 당시의 스냅샷. 현재 endpoint·상태·Flutter 도달성 판단에는 실제 소스를 우선한다. |

> `docs/plan/event-extensions/{PLAN,ENUM_RESERVATIONS,E2E_SCENARIOS}.md` 3개는
> 2026-06-05 정리에서 폐기되어 목록과 링크에서 제외했다. 현재 이벤트 확장 계약은
> F03-13~17 기능 PRD와 `community_api` 실제 Controller/Service/DTO/enum이 기준이며,
> enum 번호·충돌은 `community_api/src/test/java/com/endside/community/EnumReservationTest.java`가
> 회귀 검증한다.
