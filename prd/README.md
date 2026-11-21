# community PRD 문서 묶음

<!-- release-document: reference -->
> **문서 구분: 제품 명세 진입점.** 현재 작업 순서는 [앞으로 할 일](../../docs/plan/NEXT_WORK.md), 구현·검증 상태는 [구현 현황판](../../docs/development/IMPLEMENTATION_WORKBOARD.md)을 따른다.

## 처음 읽는 순서

1. [사람용 PRD 읽는 법](START_HERE.md)에서 역할별 진입점을 찾는다.
2. [제품 전체 PRD](00_product_prd.md)와 [업무 영역별 PRD](01_domain_prds/)로 제품 범위를 확인한다.
3. [기능별 PRD](02_feature_prds/)에서 실제 입구·행동·결과·상태·권한·실패 복구를 읽는다.
4. [공통 정책](03_policy_prds/)과 [QA 수용 기준](04_qa_acceptance/)에서 횡단 규칙과 확인 조건을 확인한다.
5. [작성·검수 기준](FEATURE_PRD_STANDARD.md)과 [문서 전환·대조 상태](PRD_MIGRATION_STATUS.md)로 근거와 검수 범위를 확인한다.

## 정본과 갱신 방식

제품 정책은 승인된 결정과 명세가, 실제 계약과 구현은 해당 버전의 코드가 정본이다. 둘이 다르면 차이를 기록한다. 코드가 있다는 이유로 정책을 바꾸거나 실기기·외부 연동·공개를 완료 처리하지 않는다.

서버는 `community_api/modules.txt`에 적힌 모듈에서 실제 Controller·Service·DTO/VO·enum을 읽는다. 관리자 서버도 `community_api/admin-app`에 있다. 앱은 실제 입구부터 API·Repository·Provider·Screen/Widget까지 대조한다. 여러 저장소가 걸친 기능은 [구현 교차표](../../docs/development/IMPLEMENTATION_CROSSWALK.md)를 출발점으로 삼는다.

기능 본문은 제품 동작을 설명한다. 기술 계약을 복사해 또 하나의 정본으로 만들지 않는다. 코드 위치 블록은 `node verification/sync_source_reference_docs.mjs`로 검사하고, 소스를 확인한 뒤에만 `--write`로 갱신한다. 이 명령의 통과는 제품 설명 전체나 실행 시험의 통과를 뜻하지 않는다.

기능 Markdown을 고치면 관련 HTML, 도메인 요약, 정책과 QA의 같은 설명도 대조한다. 현재 현황 사이트는 검토한 정본 스냅샷을 따르며, 구현 버전과 실제 배포 버전을 구분한다.

## 구성

| 위치 | 역할 |
|---|---|
| [제품 전체 PRD](00_product_prd.md) | 제품 범위·사용자 유형·전체 여정 |
| [PRD 항목별 문서](00_prd_items/README.md) | 서비스 개요·정보구조·기능 정의·역할·상태·QA |
| [21개 업무 영역](01_domain_prds/) | 기능 묶음별 목적과 범위 |
| [175개 기능 PRD](02_feature_prds/) | 기능별 사용자 흐름·규칙·수용 기준 |
| [공통 정책 6개](03_policy_prds/) | 상태·권한·알림·결제·개인정보·기획 QA |
| [QA 문서](04_qa_acceptance/) | 수용 기준·시나리오·출시 확인 조건 |
| [기획 보조 자료](05_planning_artifacts/) | 결정 기록·소개 자료·워크숍·과거 조사 |
| [보조 문서 인덱스](SUPPORTING_DOCS_INDEX.md) | 보조 자료의 역할과 읽는 순서 |
| [전체 문서 대조 기록](../verification/document-refresh-2026-11-22.json) | 문서별 근거·대조 여부·처리 결과 |

## 로컬 원천 자료와 과거 조사

기능 175개 중 117개는 `units/` 원천 메모가 있고, 나머지 58개는 코드·제품 결정·구현 기록에서 출발했다. 이 숫자는 문서의 생성 계보다. 117개만 현재 기능이라는 뜻도, 175개 모두 실기기 검증을 마쳤다는 뜻도 아니다.

`units/`와 `prd_tools/`는 로컬에 존재하지만 Git에서는 제외한다. 옛 `generate_prd.mjs`·`rebuild_feature_prds_from_units.mjs`는 초기 초안의 생성 도구다. 이후 교정한 현재 PRD에 일괄 실행하지 않는다.

[2026년 7월 29일 소스 실측 노트](05_planning_artifacts/current_source_update_2026-07-29.md)와 [2026년 7월 8일 계약 노트](05_planning_artifacts/current_source_update_2026-07-08.md)는 당시 변경의 근거다. 현행 여부는 현재 코드와 [문서별 대조 기록](../verification/document-refresh-2026-11-22.json)에서 확인한다. 날짜가 오래됐다는 이유만으로 유효한 제품 결정을 삭제하지 않는다.

시나리오 등록 수와 상세 시나리오 수가 다를 수 있으며 어느 쪽도 자동으로 시험 통과율의 분모가 되지 않는다. [시나리오 완성도 대조](04_qa_acceptance/scenario_completeness_audit_2026-08-30.md)에서 원천과 확인 범위를 구분한다.
