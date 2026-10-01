# Codex 8차 라운드 감사 보고서 (11~13차 누적 외부 감사)

> 본 라운드는 9차-C 표준화 워크플로 (`verification/CROSS_MODEL_VERIFICATION_WORKFLOW.md`) 의 정형 적용 **2회차** 이다. 7차 라운드 (`00_CODEX_ROUND7_AUDIT.md`) 의 후속으로, 11차-A/B/C + 12차-A1/A2/D + 13차-A 누적 작업에 대해 5 임무 분리 패턴으로 의뢰했다.

## 호출 시점 및 컨텍스트

- **시점**: 13차-A 라운드 종료 직후 (12차-A1/A2 결정적 회귀 가드 적용 완료 시점)
- **누적 자체 보강 + 외부 감사 후속 범위**:
  - 11차-A: P68 FCM 권한·토큰 E2E (Riverpod Provider seam mock 패턴, 5 modes)
  - 11차-B: B5 옵션 A 적용 (F11-04 클라 1000→500)
  - 11차-C: P68 FCM mock 패턴 정립 + 5 modes
  - 12차-A1: report badRequest 분기 정확화 (3 case errorCode 스위치)
  - 12차-A2: SearchSuggest race guard (`_requestSeq` 카운터)
  - 12차-D: maxLength 잠재 위험 3건 검증 (모두 SAFE) + 36개 인스턴스 baseline
  - 13차-A: 12차-A1/A2 결정적 회귀 가드 (단위/위젯 테스트 8건)

## 임무 정의 (5종 동시 의뢰)

1. 산출물 정합성 (check_format/check_traces 직접 실행 + P66 stale_response_race 등재 + 12차-D 3 문서 일관성)
2. 코드 변경 정확성 (11차-B maxLength / 12차-A1 ErrorCode 매핑 / 12차-A2 race timing 케이스 / 11차-C P68 mock round-trip)
3. 도구 정합성 (check_traces.sh LIMIT/PROCESSED guard / P66 race 비결정성 한계 명시)
4. 통계 일관성 (704 markdown / 393 traces / 80 seed / 73 e2e / 3 검증 / IMPROVEMENT_PLAN ✅·🟡 / CHECKLIST 헤더)
5. 거짓 진술 / 가정 오류 / 라벨 오류 (12차-A1 패턴 / 12차-D 라벨 패턴 / "수정 완료" vs 실제 / P68 한계 명시)

## Codex 응답 분류

### A. 코드 (Code) — 실 코드 결함

| ID | 위치 | 발견 | 즉시 수정 | 분류 |
|---|---|---|---|---|
| A1 | `community_app/lib/domain/providers/search/search_suggest_provider.dart:32~46` | `_requestSeq` race guard 의 timing 공백: 새 키워드 입력 후 `_fetchSuggestions` 가 디바운스 만료로 호출되기 전에 이전 fetch 응답이 도착하면 `mySeq == _requestSeq` 이 되어 stale 응답이 통과. (예: ko fetch in-flight → user types kor → ko 응답 도착 → kor 디바운스 미만료 — stale ko 결과가 state 에 반영됨.) | ✅ 본 라운드 적용. `onQueryChanged` 진입 시 `_requestSeq++` 추가 (length<2 / length>=2 분기 공통 — `_debounceTimer.cancel()` 직후). 회귀 테스트 추가: `test/unit/search_suggest_provider_test.dart` 에 "stale A response arriving before B fetch dispatch is ignored" 케이스. 5/5 passing. scenarios.md / 자동완성 race guard 메모 갱신. | race 해결 |
| A2 | `business_logic/units/11_review_report/F11-04_report/frontend.md:41~45` | 서버에 존재하지 않는 ErrorCode 3개 인용: `CANNOT_REPORT_SELF`, `TARGET_NOT_FOUND`, `ALREADY_REPORTED`. 실제 서버 (`ErrorCode.java`) 는 `INVALID_INPUT(400, 600012)`, `REPORT_INVALID_TARGET(400, 700008)`, `REPORT_NOT_FOUND(404, 700006)`, `REPORT_ALREADY_EXISTS(409, 700007)`. 12차-A1 적용한 코드 분기와 어긋남. | ✅ 본 라운드 적용. 정확한 서버 ErrorCode 로 정정 + 12차-A1 default 분기 (Bean Validation) 케이스 추가 명시. | 가정 오류 정정 |

### B. 산출물 (Markdown)

| ID | 위치 | 발견 | 즉시 수정 |
|---|---|---|---|
| B1 | `community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md:78` | P66 설명에 "4 modes" 만 표기 — 12차-A2 가 추가한 `stale_response_race` mode 미반영 | ✅ 5 modes 로 갱신 + 8차 Codex 감사 race timing 보강 인용 |
| B2 | `business_logic/PRODUCT_DECISIONS.md:15,57,77,117,259` `business_logic/IMPROVEMENT_PLAN.md:75` `business_logic/STATUS_AND_REMAINING.md:13` `business_logic/units/11_review_report/F11-04_report/frontend.md:73` | `report_screen.dart:320` 잔존 — 11차-B 적용 시점 라인이지만 12차-A1 `_handleError` 분기 확장으로 현재 line 341 로 이동 | ✅ 핵심 결정/현재 상태 문서 (PRODUCT_DECISIONS/IMPROVEMENT_PLAN/STATUS/frontend.md) 는 line 341 + 라인 이동 메모. CHECKLIST/PRODUCT_DECISIONS 옵션 설명 등 일부는 적용 시점 기록 유지. |
| B3 | `business_logic/CHECKLIST.md:112` | 헤더 "7-11 라운드 작업 분류" — 12차/13차 누적 미반영 | ✅ "7-13 라운드" 로 갱신 |
| B4 | `business_logic/IMPROVEMENT_PLAN.md:222,234` | "✅23건/🟡3건" 표기 vs 매트릭스 실제 (✅ 26건 / 🟡 4건). 액션 아이템 30건 (A 5 + B 9 + C 3 + D1 4 + D2 4 + D3 3 + D4 1 + E 5) — 26 표기 부정확 | ✅ "30 액션 아이템 중 ✅ 26건 / 🟡 4건" 으로 정정 + 8차 Codex 감사 발견 인용 |
| B5 | `business_logic/PRODUCT_DECISIONS.md:22~23` | 12차-D 회귀 가드 박스 라벨 부정확: "정산 송금 사유(이의제기)" 와 "마켓 이의제기(이의 해결)" — 송금/이의제기/이의해결 의미가 섞임 | ✅ "F07-06 모임 정산 이의제기 사유" / "F08-06 모임 정산 이의 해결(호스트 응답)" 으로 정정 (table line 60-61 라벨과 일관) |
| B6 | `business_logic/units/05_search/F05-02_autocomplete-suggest/scenarios.md:144~148` | 12차-A2 race guard 구현 메모가 "_fetchSuggestions 진입 + clear/length<2" 만 sequence 증가 시점으로 명시 — 8차 발견 후 onQueryChanged 시점 추가 적용 반영 필요 | ✅ "onQueryChanged 진입 시 `_requestSeq++` 호출 (length<2 / length>=2 분기 공통)" 시점 추가 + 8차 Codex 외부 감사 인용 |

### C. 도구 (Scripts) — 신규 발견 없음
- `check_traces.sh` LIMIT/PROCESSED guard: read-only 환경에서 here-doc 임시파일 실패 시 **PROCESSED=0 → FATAL exit 1** 정상 동작 확인됨 (Codex 실 실행 결과). False-positive 차단 가드 효과 검증 완료.
- `check_format.sh`: exit 0 (위반 없음).

### D. 형식 (Format) — 신규 발견 없음

### E. 메타 (Meta) — Codex 가정 오류

| ID | 발견 | 처리 |
|---|---|---|
| E1 | Codex 8차 임무 2 보고에서 "12차-A1 회귀 테스트 실패 (`flutter test --no-pub`) — INVALID_INPUT/REPORT_INVALID_TARGET 케이스에서 ReportScreen 이 pop 되지 않음" 주장 | ❌ **Codex 가정 오류 — 본 라운드에서 `flutter test` 직접 실행 결과 9/9 PASS** (4 widget + 5 unit, regression 추가 후). Codex 의 `--no-pub` 플래그 환경에서 deps 미빌드 상태로 false negative. 12차-A1 적용은 정확하며 13차-A 회귀 가드도 통과. (7차 라운드의 "ErrorCode 가정 가짜 오류" 와 동일 함정 — 가정 오류 검증 절차 ROI 재확인.) |

## 즉시 수정 적용 결과

총 **즉시 수정 가능 항목 8건** (A1 + A2 + B1~B6) + **Codex 가정 오류 검증 1건** (E1 false alarm 확인)

### 적용된 파일

- `community_app/lib/domain/providers/search/search_suggest_provider.dart:14~46` — `onQueryChanged` 진입 시 `_requestSeq++` 추가 + 가드 메모 갱신
- `community_app/test/unit/search_suggest_provider_test.dart` — "stale A response arriving before B fetch dispatch is ignored" 회귀 테스트 추가 (5/5 PASS)
- `business_logic/units/11_review_report/F11-04_report/frontend.md:41~46,73` — fake ErrorCode 3개 → 실제 서버 코드 + line 320→341 이동 메모
- `business_logic/units/05_search/F05-02_autocomplete-suggest/scenarios.md:144~148` — race guard 메모 onQueryChanged 시점 추가
- `community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md:78` — P66 5 modes 로 갱신
- `business_logic/PRODUCT_DECISIONS.md:15,22~23,57` — 라인 이동 메모 + 라벨 정정
- `business_logic/IMPROVEMENT_PLAN.md:75,222,234` — 라인 이동 + 매트릭스 카운트 정정
- `business_logic/STATUS_AND_REMAINING.md:13` — 라인 이동 메모
- `business_logic/CHECKLIST.md:112,121` — 헤더 "7-13 라운드" + 라인 이동 메모

## 재검증 결과

| 도구 | 결과 |
|---|---|
| `bash business_logic/verification/check_format.sh` | exit 0 — OK (위반 없음) |
| `bash business_logic/verification/check_traces.sh` | exit 0 — 393/393 OK |
| `flutter test test/widget/report_screen_test.dart test/unit/search_suggest_provider_test.dart` | 9/9 PASS (4 widget + 5 unit, A1 회귀 테스트 1건 추가) |
| `flutter analyze` | No issues found |
| `find business_logic -name "*.md" \| wc -l` | **704** (8차 종료 시점) |
| `grep -rn "<!-- traces:" business_logic/units/ \| wc -l` | 393 (불변) |

## 누적 통계 (Codex 외부 감사 1~8차)

| 라운드 | 발견 | 적용 | 비고 |
|---|---|---|---|
| 1차 (검증) | 4건 | ✅ | 거짓 진술 + 라벨 오류 |
| 2차 (E2E) | 8건 | ✅ | 통계/표현/파일명 |
| 3차 (잔여) | 6건 | ✅ | build_runner 부작용 + P19 인덱스 |
| 4차 (스크립트) | enum 7 진짜 / 38 FP 분류 | ✅ | check_enum_sync.sh 화이트리스트 |
| 5차 | — | — | 통합 검증만 |
| 6차 (D 카테고리) | 4건 | ✅ | F14 host gate / F10 mode / nickname / 26 형식 |
| 7차 (7~10 누적) | 8건 | ✅ 6 + 메타 잔존 2 | 산수/stale/here-doc/race/comment |
| 8차 (11~13 누적) | **8건** + 가정 오류 1건 검출 | ✅ 8 + 가정 오류 false alarm 차단 | 본 라운드 — race timing 공백 / fake ErrorCode 3개 / 라인 이동 / 매트릭스 카운트 / 라벨 정정 / 5 modes |
| **누적 외부 발견** | **38건+** | **거의 모두 적용** | |

## 신뢰도 평가 (Codex 8차 종합)

- **종합 신뢰도**: 높음 (단, 7차/8차 두 차례 공통적으로 가정 오류 1건씩 발생 — 직접 실행 검증 절차 필수)
- **Claude 가 놓친 추가 발견**: 8건 (race timing 공백 / 가짜 ErrorCode 3개 / 라인 이동 5문서 / 헤더 stale / 매트릭스 카운트 / 라벨 / 5 modes / race 메모)
- **Codex 가정 오류**: 1건 (test 실패 false alarm — `--no-pub` 환경 문제) — 즉시 직접 실행으로 차단
- **핵심 판정**: 본 라운드의 가장 큰 발견은 **race condition timing 공백 (A1)** — 12차-A2 의 `_requestSeq` 가드가 `_fetchSuggestions` 진입 시점에만 sequence 를 증가시켜, 새 디바운스 만료 전에 이전 fetch 응답이 도착하는 timing 을 가드하지 못했다. 본 라운드에서 `onQueryChanged` 시점에 sequence 를 증가시키도록 수정. 회귀 테스트 결정적 검증 완료.
- 두 번째는 **F11-04 frontend.md 의 fake ErrorCode 3개** — 12차-A1 의 코드 변경 (실제 서버 ErrorCode 매핑) 과 산출물이 어긋남. 7차 발견의 "가정 ErrorCode" 패턴과 동일 — 산출물이 코드보다 stale.

## 워크플로 적용 평가 (E1 검증 — 정형 적용 2회차)

- ✅ §3.1 임무 분리 (5 임무 동시 의뢰)
- ✅ §3.2 호출 양식 — "실제 파일만 본다" 명시 + 검증 명령 강제 + ✅/❌/⚠️ 형식
- ✅ §3.2 신뢰도 등급 + 즉시 수정 권장 표기
- ✅ §4.1 표준 사이클 — 결과 보고서 저장 → 분류 → 즉시 수정 → 재검증 → 마스터 갱신
- ✅ §6 라운드 종료 체크리스트 — check_format 0 / check_traces 393/393 / find 704 / flutter analyze 0 / flutter test 9/9 PASS
- ✅ **신규 검증**: Codex 가정 오류 가능성 명시적 검증 절차 (E1 false alarm) — 7차 ErrorCode 가정 / 8차 test 실패 가정 — **두 라운드 모두 가정 오류 1건씩 발생 → 검증 절차 ROI 재확인**

워크플로 자체의 ROI 재검증 완료. 향후 라운드에서도 본 형식 + Codex 가정 오류 검증 단계 유지.

## 7차 vs 8차 라운드 비교 (정형 적용 1회차 vs 2회차)

| 항목 | 7차 | 8차 |
|---|---|---|
| 임무 수 | 5 | 5 |
| Codex 발견 | 8건 | 8건 |
| Code (A) | 2건 (badRequest 토스트 / SearchSuggest race) | 2건 (race timing 공백 / fake ErrorCode 3개) |
| Markdown (B) | 12건 (산수/stale/라벨) | 6건 (라인 이동/헤더/매트릭스/라벨/모드) |
| Tools (C) | 1건 (check_traces.sh here-doc) | 0건 (7차 가드 정상 작동 확인) |
| 가정 오류 검출 | 0건 | 1건 (test 실패 false alarm) |
| Claude 즉시 수정 | 8건 | 8건 |
| Claude 후속 적용 | 2건 (12차-A1/A2) | — (모두 즉시 적용) |
| 신뢰도 | 높음 | 높음 |

8차에서 발견 수는 동일하나 분포가 변화했다. 7차의 산수/stale 메타 오류가 8차에서 줄어든 대신 **코드 race timing 공백** 이라는 더 심층적 발견이 1건 등장. Codex 가정 오류도 1건 첫 검출 — 검증 절차의 신호값 입증.

## 후속 라운드 후보 (14차 영역)

- **14차-A 영역 (외부 의존 잔존)**: D1.1 PG WebView (Toss mock) / D2.8 가상계좌 webhook / D3.10 Toss billing — 모두 외부 sprint 결정 대기
- **14차-B 영역 (제품 결정)**: C3 RRULE 표준 도입 (`PRODUCT_DECISIONS.md` C3 옵션 B 권장)
- **14차-C 영역 (메타 점진)**: traces 마커 117 backend.md 전수 적용 (점진 작업)
- 외부 발견 잔존 0 — 본 라운드는 모든 발견 즉시 적용 + 가정 오류 검증 완료
