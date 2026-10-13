# business_logic 문서 진입점

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../docs/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.


> 문서 진입점 확인일: 2026-10-13

이 폴더의 루트는 더 이상 과거 진행 로그를 읽는 곳이 아니다. 루트에는 현재 기준 문서로 들어가는 최소 진입점만 둔다.

## 먼저 볼 문서

| 목적 | 위치 | 읽는 이유 |
| --- | --- | --- |
| PRD 전체 진입점 | [`prd/START_HERE.md`](prd/START_HERE.md) | 사람이 기능 PRD를 읽을 때 어디서 시작해야 하는지 안내한다. |
| PRD 문서 상태 | [`prd/PRD_MIGRATION_STATUS.md`](prd/PRD_MIGRATION_STATUS.md) | 어떤 PRD가 실제 소스/단위 산출물/source-first 기준으로 작성됐는지 확인한다. |
| 기능 PRD 작성 기준 | [`prd/FEATURE_PRD_STANDARD.md`](prd/FEATURE_PRD_STANDARD.md) | 추측 기반 문서를 막기 위한 필수 품질 기준이다. |
| 지원 문서 인덱스 | [`prd/SUPPORTING_DOCS_INDEX.md`](prd/SUPPORTING_DOCS_INDEX.md) | PRD를 보조하는 정책/QA/기획 문서의 현재 역할을 확인한다. |
| 현재 소스 실측 노트 | [`prd/05_planning_artifacts/current_source_update_2026-07-29.md`](prd/05_planning_artifacts/current_source_update_2026-07-29.md) | API·App·Realtime·Admin의 2026-07-27 기준 소스를 다시 재어 50개 기능의 실제 계약·UI 도달성·Gap을 교정한 범위를 확인한다. |
| 기능별 근거 문서 | [`units/`](units/) | backend/frontend/scenarios/diagrams 원천 근거를 확인한다. |
| 검증 자료 | [`verification/`](verification/) | 문서/코드 동기화와 라운드 검증 결과를 확인한다. |
| 출시 완료 판정 | [출시 완료 기준과 승인 기록](docs/qa/completion-criteria.html) | 175개 기능과 별도 기능의 확인 결과·실패/권한 조건, 현재 출시 범위·증거·승인 절차를 확인한다. |
| 외부 서비스 준비 | [외부 서비스 가입·계약과 출시 준비](docs/qa/external-readiness.html) | 첫 출시·후속 기능의 가입, API 키 발급, iOS·Android 배포와 실연동 완료 조건을 확인한다. |
| 10월 12일 외부 연동 변경 추적 | [2026년 10월 12일 외부 연동·정산 송금 편의 반영과 문서 검증 기록](verification/document-sync-2026-10-12.json) | Android 시험 앱의 실제 외부 연동과 정산 계좌·송금 신고의 소스, 확인 범위·지문·제품 문서 반영 위치를 확인한다. 앞선 전체 문서 대조는 [2026년 10월 7일 원본 변경·반영 위치·검증 기록](verification/document-sync-2026-10-07.json)에 보존한다. |
| 출시 완료 기준 상세 검증 | [2026년 10월 13일 출시 정보·완료 기준 상세 갱신 기록](verification/document-release-detail-2026-10-13.json) | 175개 기능 기준·30개 준비 항목·302개 소스 참조 대조와 HTML·모바일 화면 검사 결과를 확인한다. |
| HTML 문서의 최신 변경 추적 | [2026년 10월 13일 구현·출시 상태 대조 기록](verification/document-sync-2026-10-13.json) | 프로필 출시 기능·클럽 폐쇄·운영자 환불·제재·탈퇴·홈페이지 준비의 현재 소스와 문서 검사 결과를 확인한다. |
| 과거 문서 보관·복원 | [문서 정리와 보관 위치](../docs/DOCUMENTATION_MAINTENANCE_REPORT.md#완료-문서-정리-원칙) | 참조가 끝난 과거 문서의 삭제 기준과 Git 이력 복원 방법을 확인한다. 이전 외부 백업은 삭제됐다. |

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
2. 재검토할 근거가 남은 과거 검증 기록은 `archive/`에 보관하고 기본 검색에서 제외한다. 대체된 진행표·체크리스트는 Git 이력 보존과 참조 정리를 확인한 뒤 제거한다. 절차는 [문서 정리와 보관 위치](../docs/DOCUMENTATION_MAINTENANCE_REPORT.md#완료-문서-정리-원칙)를 따른다.
3. 실제 판단 근거는 `units/`와 `prd/` 안의 현재 문서에서 확인한다.
4. 기능 상세를 갱신할 때는 `prd/FEATURE_PRD_STANDARD.md`와 `units/<domain>/<feature>/`의 원천 산출물을 함께 확인한다.
