# Codex 9차 라운드 감사 보고서 (13차-C / 14차-A 누적 외부 감사)

> 본 라운드는 9차-C 표준화 워크플로 (`verification/CROSS_MODEL_VERIFICATION_WORKFLOW.md`) 의 정형 적용 **3회차** 이다. 7차 라운드 (`00_CODEX_ROUND7_AUDIT.md`) / 8차 라운드 (`00_CODEX_ROUND8_AUDIT.md`) 의 후속으로, 13차-C 즉시 정정 8건 + 14차-A SKIP 분류 적용 후 시점에 5 임무 분리 패턴으로 의뢰했다.

## 호출 시점 및 컨텍스트

- **시점**: 13차-C 라운드 종료 + 14차-A SKIP 분류 적용 직후
- **누적 자체 보강 + 외부 감사 후속 범위 (8차 ROUND8 이후)**:
  - 13차-C: 8차 ROUND8 발견 8건 즉시 적용 (race timing 공백 / fake ErrorCode / 라인 이동 / 매트릭스 카운트 / 라벨 정정 / 5 modes)
  - 14차-A: 13차-B `maxlength_baseline.txt` UNMAPPED 4 → SKIP 4 분류 (caller fan-out 인벤토리)
  - 검증 도구 4종 안정화: check_format / check_enum_sync / check_traces / check_field_size_sync 모두 exit 0

## 임무 정의 (5종 동시 의뢰)

1. **산출물 정합성** — 4 검증 스크립트 직접 실행 / baseline 36 entries 분류 (OK 32 / SKIP 4) / 라인 320→341 5문서 일관성
2. **코드 변경 정확성** — `search_suggest_provider.dart:36~52` `onQueryChanged` 진입 `_requestSeq++` 의 디바운스 Timer 상호작용 / 5 unit + 4 widget 케이스가 분기 전수 cover 하는지
3. **도구 정합성** — `check_field_size_sync.sh` 12라인 위 스캔 + `private ... ;` 중단 휴리스틱 / SKIP 4 분류 정확성 / `check_traces.sh` PROCESSED guard
4. **통계 일관성** — markdown 705 / traces 393 / scripts 4 / flutter test 222 / IMPROVEMENT_PLAN matrix count / CHECKLIST 헤더 / 00_README 705
5. **거짓 진술 / 가정 오류 / 라벨 오류** — "222/222 PASS" 보고 일치 / 36 baseline 실제 grep 일치 / SKIP 4 의도성 / **본 라운드 응답에서 Codex 가정 오류 가능성 명시적 검증**

## Codex 응답 분류

### A. 코드 (Code) — 신규 발견 없음

본 라운드는 13차-A/B + 14차-A 모두 검증 도구·산출물 라운드라, 신규 코드 변경이 없다. Codex 도 코드 결함 0건 보고. (8차 라운드의 `_requestSeq++` race timing 공백 발견과 비교했을 때, 8차 적용 후 race timing edge case 가 모두 cover 됨이 9차에서 재확인되었다.)

### B. 산출물 (Markdown) — 4건

| ID | 위치 | 발견 | 즉시 수정 |
|---|---|---|---|
| B1 | `business_logic/IMPROVEMENT_PLAN.md:234` | 매트릭스 카운트 부정확: "30 액션 아이템 / ✅ 26건 / 🟡 4건". 실제 매트릭스 개별 코드 단위로 풀면 A 5 + B 9 + C 3 + D1 4 + D2 4 + D3 2 + D4 1 + E 5 = **33** 개별 항목 / ✅ **29** / 🟡 **4** | ✅ 본 라운드 적용. "33 개별 액션 아이템 중 ✅ 29건 / 🟡 4건" + 카운트 정의(개별 코드 단위, D 는 sub-item 풀어 셈) 명시 |
| B2 | `business_logic/IMPROVEMENT_PLAN.md:244` `business_logic/CHECKLIST.md:57,124` | 13차-A 보고가 "flutter test 221" — 8차 ROUND8 가 추가한 race timing 회귀 테스트 1건이 누적되어 실제는 222/222 PASS. 3개 문서에서 라벨 stale | ✅ 본 라운드 적용. 222/222 + 8차 race timing 1건 추가 메모 |
| B3 | `business_logic/PRODUCT_DECISIONS.md:63` `business_logic/CHECKLIST.md:50` | bare `report_screen.dart:320` 표현 — 8차 ROUND8 에서 5 핵심 문서는 라인 이동 메모 갱신 완료했으나, 본 두 위치는 적용 시점 라인을 그대로 두면서 명확화 누락 | ✅ "11차-B 적용 시점 :320, 12차-A1 후 현재 :341" 로 명확화 |
| B4 | `business_logic/verification/maxlength_baseline.txt:128` | 14차-A 추가 fan-out 주석 "AppTextArea callers: 10 (전부 maxLength: N 명시)" 부정확. 실제는 10 callsites 중 7건만 명시, 3건(post_create / announcement_create / post_edit 의 본문) 미명시 (서버 PostParam/AnnouncementParam 도 `@Size` 없음 — passthrough widget.maxLength=null 정상 동작, SAFE) | ✅ 정확한 callsite/명시 카운트 + 미명시 3건 SAFE 사유 명시 |

### C. 도구 (Scripts) — 신규 발견 없음

- `check_format.sh` / `check_traces.sh` / `check_field_size_sync.sh` / `check_enum_sync.sh` 모두 본 환경 직접 실행 시 exit 0 확인.
- `check_field_size_sync.sh` 의 12-line 위 스캔 + `private ... ;` 중단 휴리스틱은 36 baseline 매핑에서 false positive 0 확인.
- 14차-A SKIP 4 분류 (post_form_unused 2 + common_input_passthrough 2) 모두 의도적 비검증 정확.

### D. 형식 (Format) — 신규 발견 없음

### E. 메타 (Meta) — Codex 가정 오류 2건 검출

| ID | 발견 | 처리 |
|---|---|---|
| E1 | Codex 임무 1 보고에서 "`check_traces.sh` direct exit 1 — read-only 환경에서 here-doc 임시파일 생성 실패, PROCESSED guard 가 exit 1 처리" 주장 | ❌ **Codex 가정 오류 — 본 라운드 직접 실행 결과 exit 0 (393/393 OK)**. Codex 의 read-only sandbox 에서 `<<EOF` here-doc 처리 시 임시파일 생성이 막혔으나, 본 호스트 환경에서는 `/tmp` 쓰기가 정상이라 영향 없음. 7차 ROUND7 에서 추가한 PROCESSED guard 자체는 정상 동작 (이미 검증됨). |
| E2 | Codex 임무 1 보고에서 "`check_enum_sync.sh` exit 0 이지만 캐시 파일 write 실패 로그 — `set -e` 없어 결과 신뢰도 떨어짐" 주장 | ❌ **Codex 가정 오류 — 본 라운드 직접 실행 결과 캐시 정상 작성, 출력 'OK -- Enum sync OK'**. Codex 의 read-only sandbox 환경 가정. 본 호스트는 캐시 디렉토리 (`verification/.enum_cache/`) 쓰기가 정상이라 영향 없음. 향후 read-only 환경 대응 강화는 별도 sprint 검토 후보 (CI 내 read-only mount 등). |

## 즉시 수정 적용 결과

총 **즉시 수정 가능 항목 4건** (B1~B4) + **Codex 가정 오류 검증 2건** (E1+E2 false alarm 확인)

### 적용된 파일

- `business_logic/IMPROVEMENT_PLAN.md:233~234` — 매트릭스 카운트 33/29/4 + 카운트 정의 명시
- `business_logic/IMPROVEMENT_PLAN.md:244` — flutter test 221 → 222 + 8차 race timing 회귀 메모
- `business_logic/CHECKLIST.md:57,124` — flutter test 221 → 222
- `business_logic/CHECKLIST.md:50` — `:320` bare → `:320` (적용 시점) + 현재 `:341` 명확화
- `business_logic/PRODUCT_DECISIONS.md:63` — `:320` bare → 적용 시점 + 현재 `:341` 명확화
- `business_logic/verification/maxlength_baseline.txt:126~131` — fan-out 주석 정정 (callsites 50/10 + 7/10 명시 + 3 미명시 SAFE 사유)
- `business_logic/STATUS_AND_REMAINING.md:94~95` — Codex ROUND9 행 추가 + 누적 38건+ → 42건+

## 재검증 결과

| 도구 | 결과 |
|---|---|
| `bash business_logic/verification/check_format.sh` | exit 0 — OK (위반 없음) |
| `bash business_logic/verification/check_traces.sh` | exit 0 — 393/393 OK |
| `bash business_logic/verification/check_field_size_sync.sh` | exit 0 — TOTAL 36 / OK 32 / NG 0 / DRIFT 0 / SKIP 4 |
| `bash business_logic/verification/check_enum_sync.sh` | exit 0 — Enum sync OK |
| `flutter test` (community_app) | 222/222 PASS |
| `flutter analyze` | No issues found |
| `find business_logic -name "*.md" \| wc -l` | 706 (본 ROUND9 audit 추가 후) |
| `grep -rn "<!-- traces:" business_logic/units/ \| wc -l` | 393 (불변) |

## 누적 통계 (Codex 외부 감사 1~9차)

| 라운드 | 발견 | 적용 | 비고 |
|---|---|---|---|
| 1차 (검증) | 4건 | ✅ | 거짓 진술 + 라벨 오류 |
| 2차 (E2E) | 8건 | ✅ | 통계/표현/파일명 |
| 3차 (잔여) | 6건 | ✅ | build_runner 부작용 + P19 인덱스 |
| 4차 (스크립트) | enum 7 진짜 / 38 FP 분류 | ✅ | check_enum_sync.sh 화이트리스트 |
| 5차 | — | — | 통합 검증만 |
| 6차 (D 카테고리) | 4건 | ✅ | F14 host gate / F10 mode / nickname / 26 형식 |
| 7차 (7~10 누적) | 8건 | ✅ 6 + 메타 잔존 2 | 산수/stale/here-doc/race/comment |
| 8차 (11~13 누적) | 8건 + 가정 오류 1건 | ✅ 8 + 가정 오류 차단 | race timing 공백 / fake ErrorCode / 라인 이동 / 매트릭스 |
| 9차 (13차-C / 14차-A 누적) | **4건 + 가정 오류 2건** | ✅ 4 + 가정 오류 2건 차단 | 매트릭스 33/29 / test 222 stale / bare 320 표현 / fan-out 주석 |
| **누적 외부 발견** | **42건+** | **거의 모두 적용** | |

## 신뢰도 평가 (Codex 9차 종합)

- **종합 신뢰도**: 높음 (단, 7차/8차/9차 3회 연속으로 가정 오류 발생 — 9차는 2건 — 직접 실행 검증 절차 필수성 재확인)
- **Claude 가 놓친 추가 발견**: 4건 (매트릭스 카운트 stale / test 카운트 stale 3 문서 / bare line 표현 2 문서 / fan-out 주석 부정확)
- **Codex 가정 오류**: 2건 (check_traces read-only 환경 / check_enum_sync write 실패 가정) — 즉시 직접 실행으로 차단
- **핵심 판정**: 8차 라운드 race timing 공백 적용 후 코드 결함 0 확인. 본 라운드 발견은 모두 산출물 라벨/카운트 stale (B 카테고리). 이는 8차 적용 자체가 코드 차원에서 안정적임을 의미하며, 향후 라운드는 산출물 stale 잡기에 집중되리라 예상.

## 워크플로 적용 평가 — 정형 적용 3회차 ROI

- ✅ §3.1 임무 분리 (5 임무 동시 의뢰)
- ✅ §3.2 호출 양식 — "실제 파일만 본다" 명시 + 검증 명령 강제 + ✅/❌/⚠️ 형식
- ✅ §3.2 신뢰도 등급 + 즉시 수정 권장 표기
- ✅ §4.1 표준 사이클 — 결과 보고서 저장 → 분류 → 즉시 수정 → 재검증 → 마스터 갱신
- ✅ §4.2 거짓 진술 방지 — Claude 응답 직접 grep 검증
- ✅ §6 라운드 종료 체크리스트 — check_format 0 / check_traces 393/393 / check_field_size 0 / check_enum 0 / find 706 / flutter analyze 0 / flutter test 222/222 PASS
- ✅ **신규 검증**: Codex 가정 오류 명시적 검증 절차 (E1+E2 false alarm 차단) — 7차/8차/9차 3회 라운드 연속 가정 오류 발생 → 검증 절차 ROI 누적 입증

### 7차 vs 8차 vs 9차 라운드 비교 (정형 적용 1~3회차)

| 항목 | 7차 | 8차 | 9차 |
|---|---|---|---|
| 임무 수 | 5 | 5 | 5 |
| Codex 발견 | 8건 | 8건 | **4건** |
| Code (A) | 2건 (badRequest 토스트 / SearchSuggest race) | 2건 (race timing 공백 / fake ErrorCode) | **0건** |
| Markdown (B) | 12건 (산수/stale/라벨) | 6건 (라인 이동/헤더/매트릭스/라벨) | **4건** (매트릭스/test 카운트/bare line/fan-out) |
| Tools (C) | 1건 (here-doc) | 0건 | **0건** |
| 가정 오류 검출 | 0건 | 1건 | **2건** |
| Claude 즉시 수정 | 6건 + 후속 2건 | 8건 | **4건** |
| 신뢰도 | 높음 | 높음 | 높음 |

**ROI 추세**:
- **발견 분포**: 7차 (코드 2 + 산출물 12 + 도구 1) → 8차 (코드 2 + 산출물 6) → 9차 (코드 0 + 산출물 4) — 코드 결함 0 수렴 + 산출물 발견 감소 추세. 적용 자체가 안정화됨.
- **가정 오류**: 0 → 1 → 2 — 라운드별 누적 증가. Codex 환경(read-only sandbox) 과 본 환경(workspace-write 호스트) 차이가 가정 오류 원인. 검증 절차의 신호값 누적 입증.
- **워크플로 안정성**: 3회차 정형 적용 모두 §6 체크리스트 통과. 본 워크플로 자체의 ROI 안정 입증.

## 후속 라운드 후보 (10차+ 영역)

- **10차+-A 영역 (외부 의존 잔존)**: D1.1 PG WebView (Toss mock) / D2.8 가상계좌 webhook / D3.10 Toss billing — 모두 외부 sprint 결정 대기
- **10차+-B 영역 (제품 결정)**: C3 RRULE 표준 도입 (`PRODUCT_DECISIONS.md` C3 옵션 B 권장)
- **10차+-C 영역 (메타 점진)**: traces 마커 117 backend.md 전수 적용 (점진 작업)
- **10차+-D 영역 (도구 강건화 — 9차 가정 오류 2건 후속)**: read-only 환경 대응 — `check_traces.sh` here-doc 의존 → pipe 기반 / `check_enum_sync.sh` 캐시 write 실패 hard fail. 단 본 환경에서는 모두 정상 동작이므로 우선순위 낮음.

## 한 줄 요약

9차 Codex 외부 감사 4건 즉시 수정 + 가정 오류 2건 검출/차단 완료. 정형 적용 3회차 ROI 추세 분석 — 코드 결함 0 수렴, 산출물 발견 감소(12→6→4), 가정 오류 누적(0→1→2). 워크플로 자체 안정성 재입증.
