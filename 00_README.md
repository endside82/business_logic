# business_logic 문서 진입점

> 정리 기준일: 2026-05-20

이 폴더의 루트는 더 이상 과거 진행 로그를 읽는 곳이 아니다. 루트에는 현재 기준 문서로 들어가는 최소 진입점만 둔다.

## 먼저 볼 문서

| 목적 | 위치 | 읽는 이유 |
|---|---|---|
| PRD 전체 진입점 | [`prd/START_HERE.md`](prd/START_HERE.md) | 사람이 기능 PRD를 읽을 때 어디서 시작해야 하는지 안내한다. |
| PRD 전환 현황 | [`prd/PRD_MIGRATION_STATUS.md`](prd/PRD_MIGRATION_STATUS.md) | 어떤 PRD가 실제 소스/단위 산출물 기반으로 재작성됐는지 확인한다. |
| 기능 PRD 작성 기준 | [`prd/FEATURE_PRD_STANDARD.md`](prd/FEATURE_PRD_STANDARD.md) | 추측 기반 문서를 막기 위한 필수 품질 기준이다. |
| 지원 문서 인덱스 | [`prd/SUPPORTING_DOCS_INDEX.md`](prd/SUPPORTING_DOCS_INDEX.md) | PRD를 보조하는 정책/QA/기획 문서의 현재 역할을 확인한다. |
| 기능별 근거 문서 | [`units/`](units/) | backend/frontend/scenarios/diagrams 원천 근거를 확인한다. |
| 검증 자료 | [`verification/`](verification/) | 문서/코드 동기화와 라운드 검증 결과를 확인한다. |
| 루트 레거시 문서 | [`archive/root_legacy/`](archive/root_legacy/) | 루트에서 제거한 과거 체크리스트, 진행 로그, 의사결정 로그를 보존한다. |

## 현재 문서 체계

- `prd/01_domain_prds/`: 도메인 단위 PRD 요약과 범위.
- `prd/02_feature_prds/`: 기능 단위 PRD. 실제 `units/` 산출물과 소스 근거를 기반으로 읽어야 한다.
- `prd/03_policy_prds/`: 상태, 권한, 개인정보, 결제, 알림 같은 횡단 정책.
- `prd/04_qa_acceptance/`: QA, 수용 기준, 커버리지, 예외 흐름.
- `prd/05_planning_artifacts/`: 의사결정 기록과 실행 계획 보조 문서.
- `prd_tools/`: PRD 재생성/마킹 스크립트.
- `docs/`: PRD 시각화 HTML 산출물.
- `planner_onboarding/`: 플래너 온보딩 산출물.

## 정리 원칙

1. 루트에는 최신 기준을 찾는 데 필요한 문서만 둔다.
2. 과거 라운드별 진행표, 체크리스트, 핸드오버, 종료 평가 문서는 `archive/root_legacy/`로 이동한다.
3. 실제 판단 근거는 `units/`와 `prd/` 안의 현재 문서에서 확인한다.
4. 기능 상세를 갱신할 때는 `prd/FEATURE_PRD_STANDARD.md`와 `units/<domain>/<feature>/`의 원천 산출물을 함께 확인한다.
