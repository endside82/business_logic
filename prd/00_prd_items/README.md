# PRD 항목별 문서

<!-- release-document: reference -->
> **문서 구분: 항목별 읽기 안내.** 2026-11-22 저장소 문서 구조를 대조했다. 이 인덱스의 정리는 연결된 모든 문서의 검수·제품 구현·출시 완료를 뜻하지 않는다. 현재 작업 순서는 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)을 따른다.

## 읽는 기준

기능의 현재 설명은 [기능별 PRD](../02_feature_prds/), 공통 규칙은 [공통 정책](../03_policy_prds/)을 먼저 읽는다. 이 폴더는 여러 기능을 가로지르는 읽기 안내와 요약이다. [문서 전환·대조 상태](../PRD_MIGRATION_STATUS.md)와 [문서별 대조 기록](../../verification/document-refresh-2026-11-22.json)에서 실제 확인 범위를 구분한다.

새 문서는 [기능 PRD 작성·검수 기준](../FEATURE_PRD_STANDARD.md)을 따른다. 아래의 검토 질문을 곧바로 확정된 정책이나 출시 약속으로 옮기지 않는다.

## 항목별 진입점

| 항목 | 문서 | 검토할 질문 | 함께 볼 근거 |
|---|---|---|---|
| 서비스 개요 | [서비스 개요](01_service_overview.md) | 어떤 문제와 제품 범위를 설명하는가? | [제품 전체 PRD](../00_product_prd.md) |
| 사용자 유형 | [사용자 유형과 페르소나](02_user_personas.md) | 누가 어떤 역할로 행동하는가? | [역할별 행동 표](07_role_action_matrix.md) |
| 정보구조 | [전체 정보구조](03_information_architecture.md) | 업무 영역과 기능을 어떻게 찾아가는가? | [업무 영역별 목적](04_domain_purposes.md) |
| 도메인 목적 | [21개 업무 영역의 목적](04_domain_purposes.md) | 각 영역이 맡는 책임과 의존 관계는 무엇인가? | [업무 영역별 PRD](../01_domain_prds/) |
| 기능 정의 | [175개 기능 목록](05_feature_definitions.md) | 기능 ID와 정본이 빠짐없이 연결되는가? | [기능별 PRD](../02_feature_prds/) |
| 사용자 여정 | [핵심 사용자 여정](06_user_journeys.md) | 실제 입구·행동·결과·복귀가 이어지는가? | [예외와 경계 사례](09_exceptions_edge_cases.md) |
| 역할과 권한 | [역할별 행동 표](07_role_action_matrix.md) | 어떤 역할·상태에서 허용하거나 차단하는가? | [권한 정책](../03_policy_prds/permission_policy_prd.md) |
| 상태 | [상태 전이 요약](08_state_transitions.md) | 상태 변화가 행동·표시·돈에 어떤 영향을 주는가? | [상태 정책](../03_policy_prds/state_policy_prd.md) |
| 예외 | [예외와 경계 사례](09_exceptions_edge_cases.md) | 실패·중복·권한 상실·결과 불명에서 어떻게 복구하는가? | [공통 QA 수용 기준](11_qa_acceptance_criteria.md) |
| 부수 효과 | [기능 변경 영향 표](10_impact_matrix.md) | 함께 바뀌는 알림·결제·정산·위치 규칙은 무엇인가? | [공통 정책](../03_policy_prds/) |
| QA | [공통 QA 수용 기준](11_qa_acceptance_criteria.md) | 시작 조건·조작·관찰 결과와 실행 근거가 있는가? | [기능별 수용 기준 표](../04_qa_acceptance/acceptance_criteria_matrix.md) |
| 외부 문서 전달 | [Notion용 Markdown 작성 가이드](12_notion_markdown_guide.md) | 정본·검토 상태·근거·연결을 어떻게 보존하는가? | [Notion 업로드 준비 순서](../05_planning_artifacts/notion_import_order.md) |

기능 목록의 수량은 문서 인벤토리다. 시험 통과 수나 공개 기능 수로 해석하지 않는다. 세부 규칙을 바꾸면 관련 기능 정본과 공통 정책을 먼저 대조하고, 이 요약·QA·HTML의 같은 설명을 함께 갱신한다.
