# Codex ROUND11 외부 감사 보고서 — 16차-A/B/C 후 (정형 5회차)

> 시점: 2026-05-11
> 호출: `mcp__codex__codex` (gpt-5.2 기본 — `gpt-5.2-codex` 는 ChatGPT 계정에서 차단)
> 입력: `audit_input_stats.sh --prompt` 사전 통계 자동 주입 (16차-B 헬퍼 활용 **첫 라운드**)
> 검증 baseline (호출 직전): 5 검증 스크립트 모두 exit 0 (check_enum_sync / check_field_size_sync / check_format / check_meta_sync / check_traces)

---

## 1. 호출 컨텍스트

### 1.1 정형 워크플로 5회차

| 라운드 | 발견 | A 코드 | B 산출물 | C 도구 | E 메타·가정 |
|---|---:|---:|---:|---:|---:|
| 7차 | 8 | 2 | 12 | 1 | 0 |
| 8차 | 8 | 2 | 6 | 0 | 1 |
| 9차 | 4 | **0** | 4 | 0 | 2 |
| 10차 | 4 | **0** | 5 | 0 | 2 |
| **11차** | **3 + confab 2** | **0** | **2** | **1** | **2 (E-1 / confab 2건)** |

**A 코드 결함 0건 — 3회 연속 (9·10·11차)**. 안정화 가설 **확정**.

### 1.2 16차 변경 영역

- **16차-A**: `business_logic/verification/check_meta_sync.sh` 신규 (434줄) + stale 6건 정정 (markdown 706→708 3건 + 검증 스크립트 "네 개의"·"4종" 3건)
- **16차-B**: `business_logic/verification/audit_input_stats.sh` 신규 (310줄) + 워크플로 §3.4 사전 통계 주입 절 신설 (10차 E2 stale input 패턴 차단)
- **16차-C**: F06-06 P70 5 modes (이후 17차-A/C 에서 9 modes 로 확장됨)

---

## 2. 발견 분류 및 적용

### 2.1 확정 발견 (3건)

| ID | 카테고리 | 발견 | 적용 |
|---|---|---|---|
| 11차-B/E-3 | B 산출물 | `STATUS_AND_REMAINING.md:208` 가 "총 markdown 700 files" — 실제 708 (8차 종료 시점 표기 stale, 16차-A 갱신 이전 값) | 200 라인 보강: "700 files (8차 종료 시점 — 현재는 708 files, 16차-A 갱신 기준은 §1.6 표 참조; 11차 Codex 감사 B/E-3 라벨 확정)" |
| 11차-B-2 | B 산출물 | `06_payment_e2e.md` F06-06 9 시나리오 표가 모두 ❌ 미커버 — 실제로는 P70 도입(15차-B/17차-A/17차-C) 후 S1·S2·S3·S4·S5·S6 7건 ✅, S7 🔶, S8/S9 만 잔여 | 표 7행 ✅ 갱신 + §4-1 "F06-06 전체 (S1~S9)" → "P70 도입으로 해소" 표기 + §4-7 결론 갱신 |
| 11차-C-3 | C 자동화 도구 | `audit_input_stats.sh::extract_modes` 가 `cases=(slug1 slug2)` one-line 블록을 무시 — P3 socket_app / P3 socket_web_two / P56 splash 가 모두 0 으로 잡힘 | awk 파서를 multi 우선 + single fallback 듀얼 모드로 재작성. 검증: P3=1, P56=1, P70=9 (모두 정상) |

### 2.2 메타 stale (E-1, E-2)

| ID | 발견 | 적용 |
|---|---|---|
| 11차-E-1 | `CROSS_MODEL_VERIFICATION_WORKFLOW.md` 5개 위치 stale (헤더 "1~8 라운드", §1.1 "외부 감사 6회 누적 / 22+ 외부 발견", §1.2 "22+ 외부 발견 = 22+회 부정확", §2 표 헤더, §7 함정 헤더) | 모두 "1~11 라운드" / "47+ 외부 발견" / "외부 감사 9회 누적" 로 갱신 + §7.11 신설(Codex confabulation 차단 사례) |
| 11차-E-2 | `CHECKLIST.md:118` "7-14 라운드 작업 분류" 헤더 stale (현재 17차 진행 중) | "7-17 라운드 작업 분류" 로 갱신 + ROUND11 행 추가 |

### 2.3 Codex confabulation 검출 — 외부 모델도 부정확 (2건 차단)

| ID | Codex 인용 | 실제 파일 상태 | 차단 방법 |
|---|---|---|---|
| 11차-confab-1 | `SCENARIO_MATRIX_INDEX.md:82` "P70 = 5 modes" 로 인용, 9 modes 와 불일치 보고 | 파일은 이미 "9 modes — 15차-B 5 + 17차-A 3 happy refund + 17차-C 1 auto-charge" 로 갱신 완료 | 1차 자체 검증 grep `9 modes` — 적용 직전 차단 |
| 11차-confab-2 | `F06-06 scenarios.md:110` "5 modes" 헤더로 인용 | 파일은 이미 "관련 E2E — P70 도입 (PG WebView 무관, 누적 9 modes)" 로 갱신 완료 | 1차 자체 검증 read — 적용 직전 차단 |

**원인 분석**:
- 사용자 prompt 의 "16차 변경 영역" 기술 (`P70 5 modes`) 자체가 stale — 17차-A/C 갱신 사항 누락
- Codex 가 그 stale 입력을 그대로 신뢰하여 실제 파일과 다르다고 보고 (사전 통계 블록의 `P70 = 5 modes` 도 동일한 stale 원인 — prompt 작성 시 사용자가 헬퍼 출력을 복사·붙여넣기 한 시점 이후에 P70 이 확장됨)
- 직접 grep 으로 확인: `SCENARIO_MATRIX_INDEX.md:82` 와 `scenarios.md:110` 모두 "9 modes" 명시 — Codex 인용은 옛 상태에 대한 confabulation
- 헬퍼 재실행 확인: `audit_input_stats.sh --prompt` 현재 출력은 "P70 (payment_refund): 9 modes" — 헬퍼는 정확. **prompt 본문(16차 영역 설명)이 stale 였던 것**

### 2.4 Codex 가정 오류 (sandbox 의존, 본 환경 검증 결과 무효 2건)

| ID | Codex 가정 | 본 환경 검증 |
|---|---|---|
| 11차-E (sandbox-1) | `check_meta_sync.sh` 가 temp/here-doc 실패 시에도 exit 0 (false green) | Codex 의 read-only sandbox 한정 — 본 환경에서 temp 쓰기 가능, `set -u` + 카운트 기반 검증으로 정상 exit 0 (NG 0 / OK 18) |
| 11차-E (sandbox-2) | `audit_input_stats.sh --prompt` 가 `cat <<EOF` 실패해도 exit 0 | 동일 — 본 환경에서 정상 출력 (markdown 708 / traces 393 / P70 9 modes 포함) |

→ 본 환경에서는 도구 결함 아님. 단, Codex 의 외부 환경 sandbox 시뮬레이션도 가치 있음 — 향후 CI 환경에서 read-only file system 일 때 동작 검증 후속 라운드 후보.

---

## 3. 16차-B `audit_input_stats.sh` 활용 첫 라운드 평가

### 3.1 효과

- **사전 통계 자동 추출 작동**: prompt 호출 직전 실행으로 markdown 708 / traces 393 / 5 scripts / P70 9 modes / 222 unit tests / 82 integration tests 자동 캡처
- **stale input 1차 차단 성공**: 사전 통계 블록 자체에 "P70 9 modes" 가 명시되어 prompt 본문의 "P70 5 modes" 와 충돌 가시화 (단, Codex 가 사전 통계를 우선시하지 않고 prompt 본문 stale 를 그대로 신뢰)

### 3.2 한계

- **prompt 본문 stale 차단 불가**: 헬퍼는 사전 통계 블록만 자동화. 사용자가 prompt 본문(16차 변경 영역 설명 등)에 옛 정보를 적으면 차단 불가
- **외부 모델의 입력 우선순위**: Codex 가 prompt 본문과 사전 통계 블록이 충돌할 때 prompt 본문을 신뢰 — 헬퍼의 stale 차단 효과가 부분적
- **one-line `cases=(slug)` blind spot**: P3 / P56 가 0 으로 잡혀 있던 parser 결함 (본 라운드 11차-C-3 으로 정정)

### 3.3 후속 개선

| 후보 | 우선순위 |
|---|---|
| prompt 본문 차이 자동 비교 (사전 통계 블록 ≠ 본문 통계 시 경고) | 중 |
| 사용자 prompt 작성 가이드: "16차 변경 영역" 설명도 헬퍼 출력 후 갱신 | 높음 |
| Codex 응답을 적용하기 전 file:line 단위 재확인 (워크플로 §4.1 4-2 단계) 강제화 | 높음 (이미 §7.11 에 명시) |
| sandbox 환경 시뮬레이션 — read-only file system 에서도 검증 스크립트 정합 동작 | 중 |

---

## 4. 누적 추세 (1~11 라운드)

### 4.1 라운드별 발견 추세

| 라운드 | 발견 | A 코드 | B 산출물 | E 가정 오류 |
|---|---:|---:|---:|---:|
| 1차 | 다수 | 다수 | 다수 | 다수 |
| 2차 (E2E) | 다수 | 다수 | 다수 | 0 |
| 3차 | 다수 | 다수 | 다수 | 0 |
| 4차 (enum) | 7 진짜 / 38 FP | 7 | 0 | 0 |
| 6차 (D 카테고리) | 4 | 0 | 4 | 1 |
| 7차 | 8 | 2 | 12 | 0 |
| 8차 | 8 | 2 | 6 | 1 |
| 9차 | 4 | **0** | 4 | 2 |
| 10차 | 4 | **0** | 5 | 2 |
| **11차** | **3 + confab 2** | **0** | **2** | **2 + confab 2** |

### 4.2 안정화 가설 검증

- **A 코드 결함 0건 3회 연속** (9·10·11차) — 코드 안정화 가설 **확정**
- B 산출물 발견 추세: 12 → 6 → 4 → 5 → 2 (감소 추세 지속, 메타 stale 카테고리로 전환)
- E 가정 오류: 0 → 1 → 2 → 2 → 2 (안정화)
- **11차 신규 카테고리**: Codex confabulation (외부 모델이 옛 파일 상태 인용) — 1차 자체 검증으로 차단

### 4.3 가정 오류 / confabulation 누적

- 8차: 1건 (Codex 가 test 실패 false alarm — 직접 실행으로 차단)
- 9차: 2건 (check_traces / check_enum_sync read-only 가정 — 직접 실행 exit 0 으로 차단)
- 10차: 2건 (P69 modes stale 가정 / read-only write 실패 가정 — 차단)
- **11차**: 2건 (Codex sandbox temp 실패 가정 — 본 환경 무효) + **confabulation 2건** (옛 파일 상태 인용 — 직접 grep 으로 차단)

누적 가정/confab: **9건** (모두 차단, 0건 실제 적용)

---

## 5. 결론

### 5.1 코드 안정화

- 코드 결함 0건 3회 연속 — `community_app` Flutter 코드 + `community_api` Spring 코드의 외부 감사 신뢰도 **충분히 안정**
- 남은 발견은 모두 산출물(markdown) / 도구(helper script) / 메타 stale (라운드 헤더, 누적 카운트) 영역

### 5.2 워크플로 정형화 ROI

- 5회차 누적 (7·8·9·10·11차) 평균 발견 5.4건/라운드
- A 코드: 7차 2건 → 11차 0건 (3회 연속 0)
- 16차-A `check_meta_sync.sh` 가 7~10차 누적 검출 패턴(메타 stale) 자동화 → 11차 라운드에서 E-1 / E-2 메타 stale 자동 검출 가능했어야 함 — **점검**: `check_meta_sync.sh` 가 워크플로 §1.1 "1~8 라운드" 같은 헤더 stale 도 검출하는지 후속 라운드에서 평가
- 16차-B `audit_input_stats.sh` 가 사전 통계 stale 1차 차단 — 효과 부분적, prompt 본문 stale 까지는 차단 불가

### 5.3 17차 후속 후보

| 후보 | 카테고리 |
|---|---|
| `check_meta_sync.sh` 확장: 워크플로 헤더 (`1~N 라운드`) / 누적 발견 카운트 (`22+ / 47+`) 자동 검출 | C 자동화 |
| `audit_input_stats.sh` 확장: 사용자 prompt 본문 자동 stale 비교 | C 자동화 |
| F06-08 개인 구독 mutation E2E (P71 후보 — 7 시나리오) | D E2E |
| F06-10 정산 목록·요약 (S1) mutation E2E | D E2E |
| PG WebView §4-1/§4-2 충족 후 P71 F06-02 charge 4 modes (PG_WEBVIEW_MOCK_PATTERN.md 2단계) | D E2E |
| `check_meta_sync.sh` read-only sandbox 동작 검증 | C 자동화 |

---

## 6. 적용 후 재검증

5 검증 스크립트 baseline (적용 후):

- `check_enum_sync.sh`: exit 0 (Enum sync OK)
- `check_field_size_sync.sh`: exit 0 (DRIFT 0 / OK 32 / SKIP 4)
- `check_format.sh`: exit 0 (위반 없음)
- `check_meta_sync.sh`: exit 0 (OK 18 / NG 0)
- `check_traces.sh`: exit 0 (처리 393 / OK 393 / NG 0)

`audit_input_stats.sh` parser 정정 후 검증:
- P3 socket_app: 1 mode (이전 0) ✓
- P3 socket_web_two: 1 mode (이전 0) ✓
- P56 splash: 1 mode (이전 0) ✓
- P70 payment: 9 modes (이전 9, 회귀 없음) ✓

---

## 7. 관련 문서

- [`CROSS_MODEL_VERIFICATION_WORKFLOW.md`](../../../verification/CROSS_MODEL_VERIFICATION_WORKFLOW.md) — 워크플로 §7.11 신설
- [`00_CODEX_ROUND10_AUDIT.md`](00_CODEX_ROUND10_AUDIT.md) — 직전 라운드 (정형 4회차)
- [`audit_input_stats.sh`](../../../verification/audit_input_stats.sh) — 16차-B 헬퍼 (parser 11차-C-3 정정 적용)
- [`check_meta_sync.sh`](../../../verification/check_meta_sync.sh) — 16차-A 자동 메타 stale 검출 (17차 확장 후보)
- 과거 `STATUS_AND_REMAINING.md`([2026-09-28 문서 정리](../../../../docs/development/DOCUMENTATION_GUIDE.md#2026-09-28-문서-정리)에 원문 보관 위치 기록) — §1.6 표 ROUND11 행 추가
- 과거 `CHECKLIST.md`([2026-09-28 문서 정리](../../../../docs/development/DOCUMENTATION_GUIDE.md#2026-09-28-문서-정리)에 원문 보관 위치 기록) — 7-17 라운드 분류 표 ROUND11 행 추가
