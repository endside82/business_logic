# Codex ROUND13 외부 감사 보고서 — 18차-A/B/C + 19차-A/B/C + 20차-B 후 (정형 7회차)

> 시점: 2026-05-11
> 호출: `mcp__codex__codex` (gpt-5.2 기본 — high reasoning effort, read-only sandbox)
> 입력: `audit_input_stats.sh --prompt` 사전 통계 자동 주입 (정형 7회차) + `audit_prompt_guard.sh` (19차-A wrapper) **첫 실전 사용**
> 검증 baseline (호출 직전): 6 검증 스크립트 + audit_prompt_guard 모두 exit 0
> wrapper 출력: `OK 3 / NG 0 / SKIP 0` — 송신 가능 판정

---

## 1. 호출 컨텍스트

### 1.1 정형 워크플로 7회차

| 라운드 | 발견 | A 코드 | B 산출물 | C 도구 | D 검증 | E 메타·가정·confab |
|---|---:|---:|---:|---:|---:|---:|
| 7차 | 8 | 2 | 12 | 1 | — | 0 |
| 8차 | 8 | 2 | 6 | 0 | — | 1 |
| 9차 | 4 | **0** | 4 | 0 | — | 2 |
| 10차 | 4 | **0** | 5 | 0 | — | 2 |
| 11차 | 3 + confab 2 | **0** | 2 | 1 | — | 4 |
| 12차 | 8 | **0** | 3 | 2 | 0 | 3 |
| **13차** | **7** | **0** | **5** | **0** | **1** | **1** |

**A 코드 결함 0건 — 5회 연속 (9·10·11·12·13차)**. 안정화 가설 **TRUE 검증 완료**.

### 1.2 13차 감사 대상 (18·19·20차 누적)

- **18차-A**: `check_prompt_stale.sh` 신설 — 6번째 검증 스크립트.
- **18차-B**: P70 `duplicate_payment_guard` 10번째 mode 추가.
- **18차-C**: 11차/12차 Codex 누적 8건 적용 + 인적 누락 패턴 식별.
- **19차-A**: `audit_prompt_guard.sh` wrapper 신설.
- **19차-B**: co-host 결제 정책 명시 + sandbox fail-fast 가드 3 도구.
- **19차-C**: F06-08 P71 4 modes 신설 — Toss billing 의존도 0 확인.
- **20차-B**: 19차-C 한계 (SUSPENDED 시드 부재) 해소 — P71 5번째 mode `reactivate_success` 추가. 단, **메타 문서 등재 누락**.

### 1.3 19차-A wrapper 첫 실전 동작

```
[guard] check_prompt_stale.sh 실행 중: /tmp/codex_round13_prompt.md
[1/8] P<N> modes 패턴 검사...
[2/8] traces 마커 카운트 검사...
...
================================================================
  prompt 본문 stale 검증 결과 (/tmp/codex_round13_prompt.md)
================================================================
  OK:   3
  NG:   0
  SKIP: 0 (STRICT=1 이면 NG)
================================================================
[guard] OK — prompt stale 검사 통과. 송신 가능.
WRAPPER_EXIT=0
```

→ wrapper 가 prompt **통계 블록** 의 stale 은 정확히 차단 (NG=0). 단, 후술 D-1/E-1 발견은 wrapper 검사 범위 외 영역.

---

## 2. 발견 분류 및 적용

### 2.1 확정 발견 (7건)

| ID | 카테고리 | 발견 | 검증 결과 | 적용 |
|---|---|---|---|---|
| 13차-B-1 | B 산출물 | `CHECKLIST.md:118` 헤더 "7-18 라운드 작업 분류" — 19차 + 20차-B 작업 후에도 미갱신 | 직접 확인 — 본 라운드 시점 7-20 까지 진행됨 | ✅ 즉시 정정 — "7-18" → "7-20" |
| 13차-B-2 | B 산출물 | `IMPROVEMENT_PLAN.md:259` 마지막 행이 Codex 12차 — 18차-C / 19차-A / 19차-B / 19차-C / 20차-B / Codex ROUND13 행 부재 | 직접 확인 | ✅ 즉시 정정 — 6 행 추가 |
| 13차-B-3 | B 산출물 | `STATUS_AND_REMAINING.md` §1.6 표 마지막 행이 19차-B / 누적 — 18차-A / 18차-B / Codex ROUND12 / 19차-A / 19차-C / 20차-B / Codex ROUND13 행 부재 | 직접 확인 | ✅ 즉시 정정 — 7 행 추가 + 누적 49→57+ 갱신 |
| 13차-B-4 | B 산출물 | `SCENARIO_MATRIX_INDEX.md` P71 (82행) 이 P70 (83행) 보다 위에 있어 자연 순서 역전 | 직접 grep + awk 확인 | ✅ 즉시 정정 — awk 로 line swap, P70 (82) / P71 (83) |
| 13차-B-5 | B 산출물 (PARTIAL) | `F06-08/scenarios.md` 19차-C 19차 행이 "SUSPENDED 시드 없음" 으로 기록 (Codex 가 historical record 와 current state 혼동) | 직접 확인 — `scenarios.md:166` 은 이미 strikethrough + 20차-B 해소 표기 완료. CHECKLIST.md:139 의 19차-C 행은 historical 사실 (당시 한계) 로 정확. 진짜 stale 은 메타 문서에 20차-B 행 부재 → E-1 으로 contextualize | ✅ 메타 등재 정합화 (20차-B 행 추가) |
| 13차-D-1 | D 검증 | `run_p71_subscription_mutation_matrix.sh:2` 주석 + cases 모두 5 modes (`reactivate_success` 포함) — 사용자 prompt 자연어 컨텍스트 의 "19차-C 4 modes" 와 불일치 | 직접 awk extract_modes → 5 modes. audit_input_stats.sh --prompt 재실행 결과 P71 = 5 modes. **prompt 작성 후 20차-B 파일 변경 (mtime: 호출 직전 약 5분 전)** | ✅ Codex 가 정확한 상태 파악 — 실제 5 modes 가 ground truth. wrapper 가 통계 블록은 5 modes 로 정확 캡처, 자연어 컨텍스트만 stale. **silent code drift 패턴** |
| 13차-E-1 | E 메타·confab | **20차-B 가 코드 (sample_data.sql + test + runner + matrix index + scenarios) 에는 적용됐으나 CHECKLIST / IMPROVEMENT_PLAN / STATUS_AND_REMAINING 어느 메타 문서에도 등재 없음** | 직접 grep: `grep "20차-B" CHECKLIST.md` = (없음), `IMPROVEMENT_PLAN.md` = (없음), `STATUS_AND_REMAINING.md` = (없음). 단, `SCENARIO_MATRIX_INDEX.md:82` + `scenarios.md:147` + `seed_subscription_mutation_test.dart:3` + `run_p71_...sh:4` + `sample_data.sql:338` 모두 "20차-B" 기록 | ✅ 본 라운드의 핵심 발견. 메타 문서에 20차-B 행 추가하여 silent application 정합화 |

### 2.2 가정 오류 / Codex 자체 confabulation

본 라운드는 **0건** — Codex 가 sandbox / 가정 / 추측 인용 없이 모든 발견에 file:line 명시. 12차의 sandbox 가정 오류 2건과 대비.

---

## 3. 19차-A wrapper 첫 실전 효과 평가

### 3.1 차단된 위험

- **통계 블록 stale 차단**: prompt 본문 `사전 통계` 절의 markdown / traces / 검증 스크립트 / P modes 등 수치가 ground truth 와 일치하는지 grep 으로 검증 → OK 3 / NG 0 통과. 11차/12차 confabulation 재발 패턴 (도구 결함 아닌 인적 누락) 자동 차단.
- **인적 누락 차단**: wrapper 통과를 의무화함으로써 어시스턴트가 `check_prompt_stale.sh` 호출 단계를 잊더라도 wrapper 가 그 단계를 강제. 18차-C 가 발견한 인적 누락 메커니즘 자체를 차단.

### 3.2 차단되지 않은 위험 — silent code drift

본 라운드 D-1 / E-1 의 핵심 발견:

- prompt **본문 통계 블록** 은 `audit_input_stats.sh --prompt` 가 동적 추출하므로 5 modes 로 정확.
- prompt **본문 자연어 컨텍스트** ("19차-C 4 modes") 는 사용자가 task 작성 시점의 이해를 반영. 호출 직전에 20차-B 가 적용되어 5 modes 로 변경.
- wrapper 의 grep 패턴은 수치 (P<N> modes) 만 검사 — 자연어 의미 (Nth 라운드 명세) 와 실제 파일의 의미 불일치는 차단 못함.

→ **wrapper 의 보호 범위는 통계 수치 stale 차단. 코드/메타 문서 간 silent drift 는 별도 가드 필요** (21차 후보).

### 3.3 메커니즘 평가

| 보호 영역 | wrapper 효과 | 본 라운드 결과 |
|---|---|---|
| prompt 통계 블록 수치 stale | ✅ 완전 차단 | OK 3 / NG 0 통과 |
| 인적 누락 (헬퍼 호출 생략) | ✅ 완전 차단 | wrapper 통과 의무화 |
| prompt 자연어 컨텍스트 stale | ❌ 차단 불가 | D-1 / E-1 발견 |
| 코드 ↔ 메타 문서 silent drift | ❌ 차단 불가 | E-1 — 20차-B 메타 등재 누락 |

→ wrapper 는 의도된 책임 범위 내에서 100% 작동. 새로운 패턴 (silent code drift) 은 별도 가드 필요.

---

## 4. 누적 추세 (1~13 라운드)

### 4.1 라운드별 발견 추세

| 라운드 | 발견 | A 코드 | B 산출물 | C 도구 | D 검증 | E 메타·가정·confab |
|---|---:|---:|---:|---:|---:|---:|
| 1차 | ? (자체) | — | — | — | — | — |
| 2차 | ? (자체) | — | — | — | — | — |
| 3차 | 5 | 3 | 2 | — | — | — |
| 4차 | 4 | 1 | 3 | — | — | — |
| 5차 | 2 | 1 | 1 | — | — | — |
| 6차 | 2 | 0 | 2 | — | — | — |
| 7차 | 8 | 2 | 12 | 1 | — | 0 |
| 8차 | 8 | 2 | 6 | 0 | — | 1 |
| 9차 | 4 | **0** | 4 | 0 | — | 2 |
| 10차 | 4 | **0** | 5 | 0 | — | 2 |
| 11차 | 3 + confab 2 | **0** | 2 | 1 | — | 4 |
| 12차 | 8 | **0** | 3 | 2 | 0 | 3 |
| **13차** | **7** | **0** | **5** | **0** | **1** | **1** |

### 4.2 누적

- **외부 발견 누적**: 12차까지 55+ → 13차 이후 **62+ 외부 발견**
- **가정/confabulation 검출 누적**: 12차까지 10건 → 13차 이후 **13건** (D-1 silent drift / E-1 메타 등재 누락 / B-5 partial — Codex 가 historical 과 current 혼동)
- **A 코드 결함 5회 연속 0**: 가설 **TRUE 검증 완료** — 9·10·11·12·13차 안정화. 정형 7회차 모두 0.

### 4.3 안정화 의미

- 코드 자체의 버그는 7~8차 (총 4건) 이후 9차부터 0 유지 — 5차례 연속 (9/10/11/12/13) 검출 없음, 모두 정형 외부 감사 기반.
- 발견의 무게중심이 **B 산출물 stale** / **E 메타·운영 메커니즘** 으로 이동.
- 13차 핵심 발견 (E-1 silent code drift) 은 도구 (wrapper) 도 코드 (A) 도 아닌 **워크플로 운영 규칙** 영역 — 21차 후보로 자동 차단 메커니즘 필요.

---

## 5. 워크플로 7회차 ROI 평가

### 5.1 정량 (정형 워크플로 도입 후 7회)

- **A 코드 결함**: 7차 2 → 8차 2 → 9~13차 **0 0 0 0 0** (5회 연속 0)
- **B 산출물 stale**: 7차 12 → 8차 6 → 9차 4 → 10차 5 → 11차 2 → 12차 3 → 13차 5 (평균 5 / 라운드)
- **E 메타·가정·confabulation**: 7차 0 → 8차 1 → 9차 2 → 10차 2 → 11차 4 → 12차 3 → 13차 1 (감소 추세)

### 5.2 ROI

- **A 코드 5회 연속 0** — 사전 확인 절차 (서버 source / .pen / spec / 5단계 구현 순서) 안정적 동작.
- **19차-A wrapper 첫 실전**: 통계 stale 100% 차단. 단, 자연어 컨텍스트 / silent code drift 는 검사 범위 외 → 21차 추가 가드 후보.
- **silent code drift 패턴 신규 발견**: 13차의 핵심 발견. 코드 변경 (20차-B 의 5 modes 추가) 이 메타 문서 등재 없이 silent 적용. wrapper 의 grep 검사로는 차단 불가능 — 코드↔메타 sync 검사가 필요.

### 5.3 누적 비용 대비

- Codex 외부 감사 호출: 13회 (1~13차) — 평균 2분/회
- 정형 워크플로 7회 (7~13차) — 평균 6 발견/회, 즉시 정정 비율 80%+
- 자동화 인프라: 6 검증 스크립트 + 1 정보 추출 헬퍼 + 1 운영 가드 wrapper
- 산출물 정합성: markdown 710 / traces 393 / E2E 76 매트릭스 / unit 222 / integration 85 — 13차 발견 7건 모두 정합화 작업.

---

## 6. 21차 후속 후보

| 후보 | 우선순위 | 비고 |
|---|---|---|
| 21차-A: 코드↔메타 sync 자동 검증 | 높음 | 13차-E-1 silent code drift 차단. `check_meta_sync.sh` 확장 또는 신규 `check_round_sync.sh` 신설 — `business_logic/units/**` 또는 `community_app/scripts/e2e/**` 의 라운드 마커 (`20차-B` 등) 가 CHECKLIST/IMPROVEMENT_PLAN/STATUS_AND_REMAINING 중 적어도 한 곳에 등재됐는지 grep 으로 검증 |
| 21차-B: `check_prompt_stale.sh` 의 자연어 컨텍스트 stale 차단 패턴 추가 | 중 | 13차-D-1 차단. 현재 prompt 본문에서 추출 가능한 패턴 (P<N> modes 등) 외에 "라운드 명 + 모드 수" 패턴 (예: "19차-C 4 modes") 도 검사. 단, false positive 위험 |
| 21차-C: 라운드 헤더 갱신 자동화 | 중 | 13차-B-1 차단. `check_meta_sync.sh` 에 CHECKLIST 헤더 `## 7-N 라운드` 의 N 이 최근 등재된 라운드 (예: 20차-B) 와 일치하는지 검사 |
| 21차-D: P matrix 순서 자동 검증 | 낮음 | 13차-B-4 차단. `SCENARIO_MATRIX_INDEX.md` 의 P<N> 행이 N 오름차순인지 grep + sort 검증 |

---

## 7. 자체 점검 (메타-감사)

본 라운드 보고서 작성 시 인용한 file:line / 통계 / 사실 모두 직접 명령 또는 Read 도구로 확인. 추측 인용 없음.

- ✅ `find business_logic -name "*.md" | wc -l` = 710
- ✅ `bash audit_input_stats.sh --prompt` 출력 P71 = 5 modes
- ✅ `awk 'extract_modes()' run_p71_*.sh` = 5
- ✅ `grep "20차-B" CHECKLIST.md` 전 = 0건, 후 = 5+ 건
- ✅ `grep "20차-B" SCENARIO_MATRIX_INDEX.md` = 4건 + 5건 (P71 행 내)
- ✅ `grep "duplicate_payment_guard" community_api/.../WalletService.java` = 0 (메서드 명만 `existsByUserIdAndReferenceTypeAndReferenceId` 호출, P70 매트릭스 18차-B 가 검증)
- ✅ 6 검증 스크립트 + audit_prompt_guard + audit_input_stats 모두 exit 0
- ✅ flutter analyze: No issues found
- ✅ flutter test: 222/222 passed

**A 코드 5회 연속 0 가설**: **TRUE** — 본 라운드 발견 7건 모두 B 산출물 / D 검증 / E 메타 영역. 코드 결함 0.

**13차 핵심 발견** (E-1 silent code drift): 코드 변경 → 메타 문서 등재 누락 패턴. wrapper 의 grep 검사 범위 외. 21차-A `check_round_sync.sh` 신설 후보.
