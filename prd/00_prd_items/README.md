# PRD 항목별 문서

<!-- supporting-doc-status: 2026-05-18 -->

> 문서 상태: **보조 문서**. 기능별 현재 계약, source trace, Gap/Risk 판단은 [PRD_MIGRATION_STATUS.md](../PRD_MIGRATION_STATUS.md)와 각 기능 PRD를 우선한다. 이 문서는 인벤토리, 정책, QA, 기획 운영 기준을 보조하며, 기능 세부 판단은 [FEATURE_PRD_STANDARD.md](../FEATURE_PRD_STANDARD.md) 기준으로 재확인한다.

아래 문서들은 PRD 작성 가능 항목을 각각 독립 페이지로 분리한 것이다. Notion에 올릴 때 이 폴더를 먼저 올리면, 새 기획자가 "무엇이 어디에 있는지"를 바로 찾을 수 있다.

| PRD 항목 | 문서 | 언제 보는가 | 이 문서로 결정할 것 | 같이 볼 문서 |
|---|---|---|---|---|
| 서비스 개요 | 01_service_overview.md | 제품 전체를 처음 설명하거나 온보딩할 때 | 제품이 풀 문제, 전체 범위, 미결정 영역 | 00_product_prd.md |
| 사용자 유형/persona | 02_user_personas.md | 기능별 주 사용자를 정하거나 화면 권한을 나눌 때 | 사용자 유형, 기대 경험, 관계 구조 | 07_role_action_matrix.md |
| 전체 정보구조/기능구조 | 03_information_architecture.md | 서비스 구조와 도메인 경계를 잡을 때 | 17개 도메인 구조, 기능 규모, 의존 축 | 04_domain_purposes.md |
| 17개 도메인별 목적 | 04_domain_purposes.md | 기능이 어느 도메인에 속하는지 판단할 때 | 도메인 목적, 도메인 간 의존 관계 | 01_domain_prds/ |
| 153개 기능 정의 | 05_feature_definitions.md | 전체 기능 누락 여부를 전수 확인할 때 | 기능 ID, 주 사용자, 검산 포인트, 시나리오 수 | 02_feature_prds/ |
| 사용자 여정 | 06_user_journeys.md | 기능 목록을 실제 행동 흐름으로 설명할 때 | 핵심 여정, 시작/종료 상태, 복구 지점 | 09_exceptions_edge_cases.md |
| 권한/역할별 액션 | 07_role_action_matrix.md | 버튼 노출, 비활성, 접근 제한을 정할 때 | 역할별 허용 액션과 차단 방식 | 03_policy_prds/permission_policy_prd.md |
| 상태 전이 | 08_state_transitions.md | 상태값이 화면/알림/결제에 영향을 줄 때 | 상태별 문구, 허용 액션, 전이 조건 | 03_policy_prds/state_policy_prd.md |
| 예외/엣지 케이스 | 09_exceptions_edge_cases.md | QA 전 누락 시나리오를 찾을 때 | 빈 상태, 실패, 중복, 동시성, 민감 정보 | 11_qa_acceptance_criteria.md |
| 알림/결제/정산/위치 영향 | 10_impact_matrix.md | 기능 변경의 부수효과를 검토할 때 | 영향 영역, 같이 바꿔야 하는 정책/화면 | 03_policy_prds/ |
| QA acceptance criteria | 11_qa_acceptance_criteria.md | 개발/QA 전달 전 최종 점검할 때 | 공통 수용 기준과 릴리즈 차단 조건 | 04_qa_acceptance/ |
| Notion 업로드용 Markdown | 12_notion_markdown_guide.md | Notion에 문서를 옮기거나 DB화할 때 | 업로드 순서, 속성, Mermaid 규칙 | notion_import_order.md |
