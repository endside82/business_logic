# Notion 업로드용 Markdown 가이드

<!-- supporting-doc-status: 2026-05-18 -->

> 문서 상태: **보조 문서**. 기능별 현재 계약, source trace, Gap/Risk 판단은 [PRD_MIGRATION_STATUS.md](../PRD_MIGRATION_STATUS.md)와 각 기능 PRD를 우선한다. 이 문서는 인벤토리, 정책, QA, 기획 운영 기준을 보조하며, 기능 세부 판단은 [FEATURE_PRD_STANDARD.md](../FEATURE_PRD_STANDARD.md) 기준으로 재확인한다.

## 문서 설명

| 항목 | 내용 |
|---|---|
| 목적 | Markdown 산출물을 Notion 페이지와 데이터베이스로 옮길 때 구조, 속성, Mermaid 처리 기준을 맞춘다. |
| 보는 시점 | 문서 업로드, Notion DB 생성, 문서 운영 규칙 정리 시점 |
| 이 문서로 정할 것 | 업로드 순서, DB 속성, Mermaid 규칙, 붙여넣기 전 체크리스트 |
| 같이 볼 문서 | 05_planning_artifacts/notion_import_order.md, 00_prd_items/README.md |

## 1. 권장 구조

| 순서 | 문서 | 목적 |
|---:|---|---|
| 1 | README | 전체 묶음의 입구 |
| 2 | 00_product_prd | 제품 전체 방향과 범위 합의 |
| 3 | 00_prd_items | PRD 항목별로 무엇을 어디서 봐야 하는지 확인 |
| 4 | 01_domain_prds | 업무 영역별 책임과 기능 경계 확인 |
| 5 | 03_policy_prds | 상태, 권한, 돈, 알림, 안전 정책을 먼저 고정 |
| 6 | 02_feature_prds | 117개 기능 상세 검토 |
| 7 | 04_qa_acceptance | QA 범위와 릴리즈 기준 확정 |
| 8 | 05_planning_artifacts | 미결정 사항과 MVP 범위 운영 |

## 2. Notion 데이터베이스 필드 제안

| 필드 | 타입 | 예시 |
|---|---|---|
| 문서 유형 | Select | 제품 PRD, 영역 PRD, 기능 PRD, 정책 PRD, QA |
| 영역 | Select | 이벤트, 클럽, 결제 & 지갑 |
| 기능 ID | Text | F03-05 |
| 주 사용자 | Select/Multi-select | 참가자, 호스트 |
| 상태 | Select | 초안, 검토중, 확정, 보류 |
| 우선순위 | Select | P0, P1, P2, 미정 |
| 결정 필요 | Checkbox | true |
| 리뷰 담당 | Person | 기획/디자인/개발/운영 |

## 3. 운영 방식

- 정책 PRD가 바뀌면 관련 기능 PRD를 함께 재검토한다.
- 기능 PRD의 시나리오가 추가되면 QA 수용 기준에도 반영한다.
- 사업 KPI, 법무 문구, 운영 SLA는 확정 전까지 결정 등록부에서 추적한다.

## 4. Mermaid 사용 규칙

- 복잡한 기능 관계는 `flowchart`로 표현한다.
- 상태 전이는 `stateDiagram-v2` 또는 상태 표를 함께 사용한다.
- 비개발자 문서에서는 내부 시스템 경로, 클래스명, 내부 패키지명을 쓰지 않는다.
- 노드 문구에는 사용자가 이해하는 업무 용어를 쓴다.

## 5. Notion 데이터베이스 권장 속성

| 속성 | 타입 |
|---|---|
| 문서 유형 | Select |
| 도메인 | Select |
| 기능 ID | Text |
| 주 사용자 | Multi-select |
| 우선순위 | Select |
| 상태 | Select |
| 결정 필요 | Checkbox |
| 리뷰 담당 | Person |

## 6. 붙여넣기 전 확인

- 표가 너무 길면 도메인별로 분리한다.
- Mermaid가 깨지는 경우 코드 블록 언어를 `mermaid`로 유지한다.
- 기능 PRD는 한 페이지당 하나의 기능 ID만 가진다.
- 결정이 필요한 내용은 결정 등록부에 따로 남긴다.
