# community — 제품 문서

### 👉 **[문서 사이트 바로 보기 — endside82.github.io/business_logic](https://endside82.github.io/business_logic/)**

이 저장소는 위 링크로 배포되는 **community 제품 문서의 소스**다.
GitHub에서 파일을 하나씩 열지 말고, **위 링크를 눌러 웹 문서로 읽는 것**을 권한다.

<br>

## 무엇을 다루는 문서인가

community는 관심사 기반의 모임을 찾고 참여한 뒤, **함께 쓴 비용까지 정리하는** 커뮤니티 앱이다.
누가 먼저 결제했는지, 각자 얼마를 부담하는지, 누구에게 얼마를 보내야 하는지부터
주최자의 입금 확인과 정산 완료까지 이어진다.

| | |
| --- | --- |
| 업무 영역 | **21개** — 모임·클럽·결제 등 기능별 책임 |
| 기능 목록 | **175개** — 기능 설명과 확인 기준 |
| 등록된 시나리오 | **1,403개** — 검사 항목 수이며 통과 건수는 아님 |
| 정책 문서 | **6개** — 상태·권한·돈·알림·안전의 공통 규칙 |

<br>

## 어디부터 볼까

| 목적 | 문서 |
| --- | --- |
| **실제 앱 화면으로 둘러보기** | [사진으로 보는 앱 기능](https://endside82.github.io/business_logic/tour/index.html) · [정산 과정 보기](https://endside82.github.io/business_logic/tour/index.html#feature-settlement) |
| 이 제품이 무엇인가 | [서비스 정의](https://endside82.github.io/business_logic/overview/service.html) |
| 무엇이 어디에 있나 | [정보구조](https://endside82.github.io/business_logic/overview/architecture.html) |
| 사용자는 어떻게 움직이나 | [사용자 여정](https://endside82.github.io/business_logic/overview/journeys.html) |
| 기능을 하나씩 찾기 | [기능 목록](https://endside82.github.io/business_logic/features/catalog.html) |
| 대표 흐름 — 비용 나누기 | [모임 비용 나누기](https://endside82.github.io/business_logic/domains/07-settlement.html) |
| 지금 어디까지 왔나 | [첫 출시 현황](https://endside82.github.io/business_logic/qa/launch-status.html) · [기능별 출시 상태](https://endside82.github.io/business_logic/qa/feature-status.html) |
| 화면을 실제로 확인했나 | [화면 검수](https://endside82.github.io/business_logic/qa/screen-review.html) |

<br>

## 읽을 때 주의할 점

- 문서는 **구현 / 자동 테스트 / 실제 환경**을 나눠 표시한다. 기능 설명이 있다는 사실만으로 지금 사용할 수 있다는 뜻은 아니다.
- 등록된 시나리오 수는 **검사 항목 수이며 통과 건수가 아니다.**
- 현재 외부 고객 공개는 보류 중이다. 공개 범위와 남은 준비는 [첫 출시 현황](https://endside82.github.io/business_logic/qa/launch-status.html)에서 확인한다.
- 문서에 실린 앱 화면은 로컬 시험 서버에 연결해 촬영한 실제 화면이며 합성하지 않았다. 등장하는 모임·회원·사진은 소개를 위해 준비한 **가상 예시**다.

<br>

## 저장소 구조

```
docs/             # 배포되는 문서 사이트 (GitHub Pages 진입점)
├── overview/     #   서비스 정의, 정보구조, 사용자 여정
├── domains/      #   업무 영역별 문서
├── features/     #   기능 단위 문서와 목록
├── policies/     #   상태·권한·결제·알림 등 횡단 정책
├── qa/           #   출시 현황, 기능별 상태, 화면 검수
├── tour/         #   실제 앱 화면으로 보는 기능 소개
└── money-flow/   #   돈의 흐름

prd/              # 기능·도메인·정책 PRD 원본
units/            # 기능별 근거 산출물 (backend / frontend / scenarios / diagrams)
verification/     # 문서-코드 동기화와 라운드 검증 결과
archive/          # 루트에서 내린 과거 진행 로그
```

문서를 직접 편집하거나 PRD 원본을 찾을 때의 진입점은 [`00_README.md`](00_README.md)에 정리했다.
GitHub Pages가 `main` 브랜치의 `/docs` 폴더를 게시한다.
