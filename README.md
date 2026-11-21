# community — 제품 문서

<!-- release-document: reference -->
> **문서 구분: 제품 문서 안내.** 현재 할 일은 [앞으로 할 일](../docs/plan/NEXT_WORK.md), 구현·검증 상태는 [기능별 구현·검증 상태](../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따른다. 2026-11-22 문서 구조와 읽는 경로를 대조했다.

## 문서 사이트

[사이숲 제품 문서 사이트](https://endside82.github.io/business_logic/)에서 제품 구조·기능·정책·현황을 읽을 수 있다. 이 저장소는 그 사이트의 Markdown·HTML·자료 소스다. 작업 브랜치의 수정, 사이트 반영, 앱 배포와 고객 공개는 각각 다른 상태다.

## 무엇을 다루는 문서인가

community는 관심사에 맞는 모임을 찾고 참여하며 클럽 활동과 함께 쓴 비용 정리를 연결하는 커뮤니티 제품이다. 문서는 기능의 입구·행동·결과·권한·상태·실패 복구와 아직 확인하지 못한 범위를 설명한다.

| 범위 | 현재 구성 |
|---|---|
| 업무 영역 | 21개 도메인 PRD |
| 기능 | 175개 기능 PRD |
| 공통 정책 | 6개 정책 PRD |
| 기능별 로컬 참고 | 117개 기능의 서버·앱·시나리오·흐름도. Git이 추적하지 않는 로컬 자료 |
| 별도 로컬 참고가 없는 기능 | 58개. 기능 PRD와 실제 소스로 확인 |
| 시나리오 | 현재 목록은 [기능별 시나리오 감사](docs/qa/scenario-completeness.html)에서 확인. 등록 수는 시험 통과 수가 아님 |

## 어디부터 볼까

| 목적 | 문서 |
|---|---|
| 제품 전체 이해 | [서비스 정의](docs/overview/service.html) · [사용자 여정](docs/overview/journeys.html) |
| 기능 찾기 | [기능 목록](docs/features/catalog.html) · [사람용 PRD 읽는 법](prd/START_HERE.md) |
| 기능의 동작·수용 기준 | [기능 PRD](prd/02_feature_prds/) · [공통 정책](prd/03_policy_prds/) |
| 현재 할 일과 조건 | [전체 현황 사이트](docs/index.html) · 정본인 [앞으로 할 일](../docs/plan/NEXT_WORK.md) |
| 구현·검사 근거 확인 | [기능별 구현·검사 기록](docs/qa/feature-status.html) · [화면 검수 기록](docs/qa/screen-review.html) |
| 촬영한 앱 화면 보기 | [사진으로 보는 앱 기능](docs/tour/index.html). 촬영 시점·환경과 현재 구현을 함께 확인 |
| 문서 편집 시작 | [문서 진입점](00_README.md) · [기능 PRD 작성·검수 기준](prd/FEATURE_PRD_STANDARD.md) |

## 상태와 근거를 읽는 법

- 제품 정책과 현재 구현이 다르면 차이를 기록한다. 구현을 근거로 승인된 정책을 임의 변경하지 않는다.
- 코드가 있음, 시험이 있음, 해당 버전에서 시험이 통과함, 실제 기기·외부 연결을 확인함, 고객에게 공개함을 구분한다.
- 앱 탐색 맵·문서 HTML·과거 촬영 화면은 최신 앱 전체의 검수 완료를 증명하지 않는다.
- 현재 문서의 대조 여부와 과거 기록 보존은 [전체 문서 갱신 기록](verification/document-refresh-2026-11-22.json)에서 구분한다. 이 기록의 소스 대조 완료는 제품 시험 통과가 아니다.

## 원본과 산출물

기능 상세는 `prd/`, 사이트 산출물은 `docs/`, 기획자용 읽기 자료는 `planner_onboarding/`에 있다. 현황판은 바깥 문서 저장소의 현재 할 일·작업 목록에서 생성하며 HTML에서 별도 잔여 목록을 만들지 않는다.

로컬 `units/`와 일부 `verification/` 문서는 Git 기본 제외 대상이다. 새 체크아웃에 없다는 이유로 기능이 없다고 판단하지 않으며, 반대로 로컬 자료를 수정하고 커밋했다고 그 자료까지 전달됐다고 보지 않는다. 파일 반영 여부는 별도로 확인한다.
