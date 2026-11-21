# business_logic 문서 진입점

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [앞으로 할 일](../docs/plan/NEXT_WORK.md)을 따릅니다.


> 문서 진입점 확인일: 2026-11-22

이 폴더의 루트는 더 이상 과거 진행 로그를 읽는 곳이 아니다. 루트에는 현재 기준 문서로 들어가는 최소 진입점만 둔다.

## 먼저 볼 문서

| 목적 | 위치 | 읽는 이유 |
| --- | --- | --- |
| PRD 전체 진입점 | [`prd/START_HERE.md`](prd/START_HERE.md) | 사람이 기능 PRD를 읽을 때 어디서 시작해야 하는지 안내한다. |
| PRD 문서 상태 | [`prd/PRD_MIGRATION_STATUS.md`](prd/PRD_MIGRATION_STATUS.md) | 어떤 PRD가 실제 소스/단위 산출물/source-first 기준으로 작성됐는지 확인한다. |
| 기능 PRD 작성 기준 | [`prd/FEATURE_PRD_STANDARD.md`](prd/FEATURE_PRD_STANDARD.md) | 추측 기반 문서를 막기 위한 필수 품질 기준이다. |
| 지원 문서 인덱스 | [`prd/SUPPORTING_DOCS_INDEX.md`](prd/SUPPORTING_DOCS_INDEX.md) | PRD를 보조하는 정책/QA/기획 문서의 현재 역할을 확인한다. |
| 과거 소스 실측 기록 | [`prd/05_planning_artifacts/current_source_update_2026-07-29.md`](prd/05_planning_artifacts/current_source_update_2026-07-29.md) | API·App·Realtime·Admin의 2026-07-27 기준 소스를 다시 재어 50개 기능의 실제 계약·UI 도달성·Gap을 교정한 범위를 확인한다. |
| 검증 자료 | [`verification/`](verification/) | 문서와 코드가 맞는지 검사하는 스크립트와 날짜별 대조 기록(JSON)을 둔다. |
| 출시 완료 판정 | [출시 완료 기준과 승인 기록](docs/qa/completion-criteria.html) | 175개 기능과 별도 기능의 확인 결과·실패/권한 조건, 현재 출시 범위·증거·승인 절차를 확인한다. |
| 외부 서비스 준비 | [외부 서비스 가입·계약과 출시 준비](docs/qa/external-readiness.html) | 첫 출시·후속 기능의 가입, API 키 발급, iOS·Android 배포와 실연동 완료 조건을 확인한다. |
| 10월 12일 외부 연동 변경 추적 | [2026년 10월 12일 외부 연동·정산 송금 편의 반영과 문서 검증 기록](verification/document-sync-2026-10-12.json) | Android 시험 앱의 실제 외부 연동과 정산 계좌·송금 신고의 소스, 확인 범위·지문·제품 문서 반영 위치를 확인한다. 앞선 전체 문서 대조는 [2026년 10월 7일 원본 변경·반영 위치·검증 기록](verification/document-sync-2026-10-07.json)에 보존한다. |
| 출시 완료 기준 상세 검증 | [2026년 10월 13일 출시 정보·완료 기준 상세 갱신 기록](verification/document-release-detail-2026-10-13.json) | 175개 기능 기준·30개 준비 항목·302개 소스 참조 대조와 HTML·모바일 화면 검사 결과를 확인한다. |
| HTML 문서의 현재 상태 | [현재 현황 스냅샷](docs/assets/work-overview.snapshot.json) · [변경 이력](docs/overview/changelog.html) | 스냅샷의 발행 시각과 근거를 확인한다. 코드 main·배포된 서버·배포된 앱 버전은 서로 다를 수 있다. 정본 변경은 `python3 ../scripts/build-work-overview.py --check-source`로 검사한다. |
| 과거 문서 보관·복원 | [문서 정리와 보관 위치](../docs/development/DOCUMENTATION_GUIDE.md#완료-문서-정리-원칙) | 참조가 끝난 과거 문서의 삭제 기준과 Git 이력 복원 방법을 확인한다. 이전 외부 백업은 삭제됐다. |

## 전체 최신화의 범위와 근거

[2026년 11월 22일 전체 문서 대조 기록](verification/document-refresh-2026-11-22.json)은 문서별 원본 지문·소스 버전·처리 결과를 관리한다. 초기 범위는 추적 문서 485개(Markdown 249개, HTML 235개, PDF 1개)와 로컬 참고 Markdown 517개다. 기록의 `pending`은 아직 내용 검수를 끝내지 않았다는 뜻이다. 전체 최신화 완료 여부는 그 기록의 처리 결과로 판단한다.

`units/`와 로컬 감사 원문은 Git에서 제외된 참고 자료다. 공개 PRD와 혼동하거나 원문을 일괄 공개하지 않는다. 현재 작업본에서는 이 자료도 별도로 대조한다. 과거 조사일은 그대로 보존하고, 수정한 현재 설명에는 새 근거를 연결한다.

## 현재 문서 체계

- `prd/01_domain_prds/`: 도메인 단위 PRD 요약과 범위.
- `prd/02_feature_prds/`: 기능 단위 PRD. 실제 소스를 근거로 읽어야 한다.
- `prd/03_policy_prds/`: 상태, 권한, 개인정보, 결제, 알림 같은 횡단 정책.
- `prd/04_qa_acceptance/`: QA, 수용 기준, 커버리지, 예외 흐름.
- `prd/05_planning_artifacts/`: 의사결정 기록과 실행 계획 보조 문서.
- `docs/`: PRD 시각화 HTML 산출물.
- `planner_onboarding/`: 플래너 온보딩 산출물.

## 정리 원칙

1. 루트에는 최신 기준을 찾는 데 필요한 문서만 둔다.
2. 끝난 검증 기록과 진행표·체크리스트는 참조 정리를 확인한 뒤 지우고, 필요하면 Git 이력에서 읽는다. 절차는 [문서 정리와 보관 위치](../docs/development/DOCUMENTATION_GUIDE.md#완료-문서-정리-원칙)를 따른다.
3. 실제 판단 근거는 `prd/` 안의 현재 문서와 소스에서 확인한다.
4. 기능 상세를 갱신할 때는 `prd/FEATURE_PRD_STANDARD.md`와 실제 소스를 함께 확인한다.
