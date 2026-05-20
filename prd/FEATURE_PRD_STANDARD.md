# 실사 기반 기능 PRD 표준

## 목적

이 문서는 `business_logic/prd/02_feature_prds`를 다시 작성할 때 적용할 기준이다.

기능 PRD는 기능명과 시나리오 수를 나열하는 문서가 아니다. `backend.md`,
`frontend.md`, 실제 서버/Flutter 소스를 대조해서 제품, 개발, QA가 같은
사실을 보고 같은 판단을 내리게 하는 문서여야 한다.

## 작성 원칙

1. **소스 확인 전 작성 금지**
   - 서버 Controller, Service, VO/DTO, enum을 직접 읽는다.
   - Flutter API, Repository, Provider, Screen, 주요 Widget을 직접 읽는다.
   - `backend.md`/`frontend.md`는 출발점이지 최종 근거가 아니다. 두 문서가
     낡았을 수 있으므로 실제 소스로 재확인한다.

2. **사실과 판단을 분리**
   - `Fact`: 실제 소스에서 확인한 사실.
   - `Derived`: backend/frontend 대조로 도출한 판단.
   - `Gap`: 서버/프론트/테스트 사이의 불일치, 미구현, 미검증.
   - `Risk`: 지금 당장 실패하지 않아도 사용자 피해나 회귀 가능성이 큰 지점.
   - `Decision Needed`: 사업, 운영, 법무, 외부 credential 없이는 닫을 수 없는 항목.

3. **추측 문장 금지**
   - "안전하게 처리해야 한다", "이해 가능한 결과를 볼 수 있어야 한다" 같은
     범용 문장은 PRD 수용 기준으로 인정하지 않는다.
   - 무엇을 보여주는지, 어떤 API가 호출되는지, 어떤 상태가 반환되는지,
     어떤 테스트가 확인하는지까지 써야 한다.

4. **서버-프론트 정합성 판단 필수**
   - 서버가 주는 필드와 프론트가 읽는 필드를 나란히 비교한다.
   - 서버 enum과 Flutter enum/string parser가 같은 값을 쓰는지 확인한다.
   - 클라이언트 기본값으로 조용히 숨겨지는 서버 누락 필드는 `Gap`으로 남긴다.

5. **테스트는 링크가 아니라 판단 근거**
   - 테스트 파일명만 적지 않는다.
   - 그 테스트가 어떤 상태/권한/CTA를 증명하는지 적는다.
   - 검증이 없으면 "검증 없음"이라고 쓴다.

## 기능 PRD 템플릿

```md
# FNN-MM. 기능명 PRD

## 1. 결론

현재 구현이 어느 범위까지 닫혀 있는지 3~5문장으로 쓴다.
겉보기 화면, 서버 계약, 비동기/외부 운영 축을 구분한다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend | Controller/Service/VO/Enum | endpoint, response, 상태, 에러 |
| Frontend | API/Repository/Provider/Screen/Widget | route, 상태 분기, CTA |
| Verification | unit/integration/E2E | 증명하는 동작 |

## 3. 전체 동작 흐름

사용자 진입부터 화면 결과까지 순서대로 쓴다.

1. 사용자가 어느 route/screen으로 들어온다.
2. 어떤 Provider/Repository/API를 호출한다.
3. 서버 Controller/Service가 무엇을 조회/검증/기록한다.
4. 어떤 response field가 내려온다.
5. Flutter가 그 field를 어떤 상태/CTA로 바꾼다.
6. 부수 효과와 실패 처리를 적는다.

## 4. 서버 계약

실제 Controller 기준 endpoint, 요청, 응답, enum, 에러, side effect를 적는다.

## 5. 프론트 계약

실제 route, provider, repository, screen, widget, CTA, toast/dialog를 적는다.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 근거 | 프론트 분기 | 사용자 결과 | 판단 |
|---|---|---|---|---|

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|

## 9. 수용 기준

Given/When/Then 또는 명확한 관찰 가능 조건으로 쓴다.

## 10. 미결정 / 후속

사업, 운영, 법무, credential, 테스트 보강을 분리한다.
```

## 품질 체크리스트

기능 PRD 하나를 완료하려면 아래 항목을 모두 통과해야 한다.

| 항목 | 통과 기준 |
|---|---|
| Backend source | Controller, Service, VO/DTO, enum 중 해당 기능 관련 파일을 직접 확인했다. |
| Frontend source | API, Repository, Provider, Screen/Widget 중 해당 기능 관련 파일을 직접 확인했다. |
| Contract comparison | 서버 응답 필드와 클라이언트 소비 필드를 비교했다. |
| State matrix | 상태/권한별 CTA 또는 차단 동작이 표로 정리되어 있다. |
| Gap/Risk | 발견된 불일치, 미구현, 미검증이 숨겨지지 않고 등급이 붙어 있다. |
| Acceptance criteria | 범용 문장이 아니라 관찰 가능한 조건으로 작성했다. |
| Verification | 현재 검증 자산과 검증 공백이 분리되어 있다. |

## 금지 패턴

아래 문장 패턴이 반복되면 PRD가 아니라 자동 생성 초안으로 본다.

- "해당 상황에서 사용자가 이해 가능한 성공/실패 결과와 다음 행동을 볼 수 있어야 한다."
- "사용자가 이 조건을 인지하거나 시스템이 자동으로 안전하게 처리해야 한다."
- "조건부/없음"만 있고 실제 영향 판단이 없는 영향 범위 표.
- source path 없이 "서버에서 처리한다", "앱에서 처리한다"라고 쓰는 문장.
- 서버 enum에 없는 상태를 제품 상태처럼 확정해서 쓰는 문장.

## 적용 순서

1. `F03-02 이벤트 상세 조회`를 golden sample로 유지한다.
2. 2026-05-18 전환본은 `business_logic/units`의 실사 자료를 PRD 구조로 재배치한
   baseline으로 본다. 전환 상태는 `PRD_MIGRATION_STATUS.md`에서 추적한다.
3. 결제/정산/데이팅 안전/위치/계정 삭제처럼 사용자 피해가 큰 기능부터 golden
   sample 수준의 직접 source comparison으로 승격한다.
4. 자동 생성은 baseline 생성까지만 허용한다. 최종 PRD는 실제 서버/Flutter 소스를
   다시 열어 source comparison과 Gap/Risk 판단이 들어간 문서만 인정한다.
