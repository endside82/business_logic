# 다중 모델 교차 검증 워크플로 (Claude × 외부 감사 모델)

<!-- release-document: reference -->
> **문서 구분: 검증 절차 참고 문서.** 현재 할 일은 [출시 실행 계획표](../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

본 프로젝트의 산출물 작성·코드 수정·도구 작성 전 과정에서 **단일 모델 자체 보고를 신뢰하지 않는다**는 원칙으로 운영해 온 "Claude 작성 + 외부 모델 감사" 패턴을, 1~11 라운드 누적 결과를 바탕으로 표준 워크플로로 정형화한 문서. (정형화는 9차에서 도입, 9·10·11차에서 정형 적용 5회차로 검증.)

> **외부 감사 모델 표기**: 본 프로젝트는 `mcp__codex__codex` MCP 도구를 통해 OpenAI Codex 계열 외부 모델에 감사를 의뢰했다. 다른 환경에서는 임의의 외부 모델 (Codex / GPT / Gemini 등)로 대체 가능. 본 문서에서는 일반화 표기로 "외부 감사 모델" 을 사용하고, 본 프로젝트 호출 도구는 부속 메모로 codex 명시.

## 1. 목적과 ROI

### 1.1 누적 결과 (1~11 라운드)
- **외부 감사 9회 누적** (1차 검증 / 2차 E2E / 3차 잔여 / 4차 enum 스크립트 / 6차 D 카테고리 + 산출물 형식 / 7~10차 정형 4회차 / 11차 정형 5회차)
- **외부 발견 47+** — 1~11 라운드 누적, 거의 모두 적용 완료 (가정 오류 누적 5건 포함)
  - 거짓 진술/누락 5건 (예: F03-12 CANCELLED "수정 완료" 거짓, Master Summary fully fixed 표기 실패)
  - 라벨/지목 오류 4건 (예: Unit 02 사용자 검색 라벨, F12-05 vs 00_overview 지목 오류, 존재하지 않는 파일명 3개)
  - Build_runner 부작용 2건 (B1 calendar_event_vo / B8 event_location_api stale `.g.dart`)
  - 가정 오류 3건 (F14 host gate, F10 delete_recurring_scope mode 오해, F09-06 "회귀 가드" 오해)
  - 형식 위반 2건 묶음 (E2E-derived 5필드 4섹션 미준수 / 26건 형식 위반)
  - 통계 오류 2건 (test 73→74, script 66→65)
  - 코드 버그 11건 (Flutter B1~B9 + 진짜 7건)
  - enum 분류 7 진짜 / 38 FP (CRITICAL — 자체 작성한 도구의 FP 분리)
- **신규 E2E 5건** (P61~P65, 23 modes) 작성 시 외부 감사로 시그니처/형식 일치 검증
- **F09-06 SOS 의도적 미운영 결정**도 "코드 근거 부족" 외부 감사 발견 → 사용자 확인 → 최종 정정의 3단계 사이클로 도달

### 1.2 ROI
- 47+ 외부 발견 (1~11차 누적) = Claude 자체 보고가 47+회 부정확했음을 의미
- 외부 감사가 없었으면 산출물에 거짓 fix 표기, 환영 파일명, 잘못된 host gate 가정이 그대로 잔존
- 핵심 교훈: **단일 모델은 자기 산출물 변경 사실을 정확히 추적하지 못한다.**

## 2. 호출 트리거

다음 단계 직후에 외부 감사 호출을 권장한다. 모든 라운드에서 모든 트리거를 호출할 필요는 없으나, 산출물 또는 코드를 사용자 의사결정 입력으로 사용할 때는 최소 1회 호출한다.

| Trigger | 시점 | 1~11 라운드 사례 |
|---|---|---|
| **T1: 산출물 작성 직후** | Step 3-5 산출물 (backend/frontend/scenarios/diagrams) 일괄 작성 후, 마스터 요약 작성 후 | 1차 (Claude 14단위 검증 보고서 작성 직후), 2차 (E2E 추적 추가 99/보강 100/커버 91 정리 직후) |
| **T2: 코드 수정 직후** | Flutter/Spring 실 코드 변경 (특히 Freezed/Retrofit/Provider 수정 후) | 3차 (B1~B9 적용 직후 build_runner 부작용 검출), 6차 (P61~P65 신규 테스트 + UI/Spring 수정 직후) |
| **T3: 자동화 도구 작성 후** | check_format.sh, check_enum_sync.sh 등 검증 도구 추가 후 | 4차 (check_enum_sync.sh 45건 출력에 대해 "FP/진짜 버그" 분류 의뢰) |
| **T4: 산출물 형식 정규화 후** | 4-file 구조 변경, E2E-derived 섹션 표준화 후 | 6차 (26건 형식 위반 검출, F14/F10/F13 섹션 형식 점검) |
| **T5: 사용자 결정 입력 직전** | F09-06 SOS deprecation 결정, nickname maxLength 결정 등 사용자 판단 input 으로 활용되는 산출물 | 2차→3차 (F09-06 SOS 해석 단계적 정정), 6차 (nickname 30자 정렬 결정 입력) |

호출 안 해도 되는 경우:
- 동일 작업을 두 라운드 연속 반복할 때
- 사용자 지시 자체 보강 라운드 (8차 라운드 명시적 사례)
- 형식 위반 0건 / analyze 0건 / enum_sync 0건 모두 검증된 종료 직후의 trivial 갱신

## 3. 호출 형식

본 프로젝트에서 검증된 호출 패턴은 임무를 분리하고 각 임무에 명확한 결과 형식을 지정하는 것이다.

### 3.1 임무 분리 패턴

```
임무 1: <단일 사실 검증 1>
  - 검증 기준: 실제 파일 read / rg / flutter analyze / bash script 실행 결과만 근거로 삼는다.
  - 결과 형식: <YES|NO|PARTIAL> + 근거 코드 인용 + 차이점 설명

임무 2: <단일 사실 검증 2>
  ...

임무 N: 메타 개선 / 종합 판정
  - 신뢰도: <높음|보통|낮음>
  - Claude 가 놓친 추가 발견 N건 (가능하면 즉시 수정 권장 표기)
  - 부작용 (build_runner stale 등) N건
```

### 3.2 검증된 호출 양식 (원칙)

1. **"Claude sub-agent 보고는 신뢰하지 않고 실제 파일만 본다"** 명시 (3차 라운드 검증 원칙).
2. **임무 4~5개로 분리** (임무 단위가 너무 크면 외부 모델도 추측에 의존).
3. **각 임무마다 검증 명령(rg/flutter analyze/bash 실행) 명시 요구**.
4. **결과 형식 강제**: ✅/❌/⚠️ + 근거 코드 인용.
5. **"즉시 수정 권장" 표기 요청** — 외부 모델이 발견만 하고 가만 있으면 정정 사이클이 끊긴다.

### 3.3 본 프로젝트의 도구

```text
mcp__codex__codex (시작) / mcp__codex__codex-reply (이어서)
```

호출 시 `prompt` 인자에 위 임무 형식 + 검증 기준 + 신뢰도 등급 요구를 명시. 결과는 `verification/00_CODEX_<라운드>_AUDIT.md` 로 보존.

### 3.4 사전 통계 주입 + prompt 본문 stale 자동 차단 (필수, 19차-A 이후)

외부 감사 prompt 작성 직전 세 단계를 모두 거친다. **3단계 (audit_prompt_guard.sh)** 는 19차-A 에서 18차-C 인적 누락 패턴 차단용으로 추가된 강제 wrapper — Codex 호출 직전 반드시 통과해야 한다.

**1단계: 사전 통계 자동 추출 → prompt 상단에 주입 (16차-B 도입)**

```bash
bash business_logic/verification/audit_input_stats.sh --prompt
```

추출되는 항목:
- markdown 파일 수 / traces 마커 수 / 검증 스크립트 인벤토리
- 최근 10 개 E2E 매트릭스 P 번호 + 각 P 의 modes 수 (실제 `cases=()` 블록 파싱)
- 단위/위젯 테스트 카운트 / integration_test 파일 수
- (옵션) 최근 5 commit 변경 파일 목록

이 통계 주입을 통해 **stale 입력 기반 가정 오류 (10차 E2 패턴)** 를 사전에 차단한다. 사람이 기억으로 "P69 는 4 modes" 라고 적는 위험을 제거한다. 본 헬퍼는 검증 스크립트가 아니라 정보 추출 도구로, exit code 는 항상 0 (단, 필수 디렉토리 부재 시 1).

**2단계: prompt 본문 stale 검증 (18차-A 도입)**

prompt 본문(변경 영역 설명, 인용 통계, 라운드 표기 등) 에 수치/카운트를 직접 적은 경우, 송신 전 다음 명령을 실행한다:

```bash
bash business_logic/verification/check_prompt_stale.sh prompt.txt
# 또는 stdin
cat prompt.txt | bash business_logic/verification/check_prompt_stale.sh
```

검사 패턴 (8종):
1. `P<N> [=:]? <M> modes?` — 매트릭스 modes (17차-B 핵심 패턴)
2. `<N>[개]? 마커` / `마커 <N>` — traces 마커 카운트
3. `markdown <N>` / `<N> markdown` — markdown 파일 수
4. `<N>+? 외부 발견` / `외부 발견 <N>+?` — 누적 발견 카운트 (SKIP, STRICT 시 NG)
5. `검증 [스크립트]? <N>[종]?` — 검증 스크립트 수
6. `<N>/<N> PASS|OK` / `<N> passed <N> total` — 테스트 카운트
7. `라운드 <N>~<M>` / `<N>~<M> 라운드` — 라운드 범위 (SKIP)
8. `<N> 라운드 누적` — 라운드 누적 (SKIP)

Ground truth:
- markdown: `find business_logic -name "*.md" | wc -l`
- traces 마커: `grep -rh "<!-- traces:" business_logic/units/ | wc -l`
- 검증 스크립트: `ls business_logic/verification/check_*.sh | wc -l`
- E2E modes: `community_app/scripts/e2e/run_p<N>_*.sh` 의 `cases=()` 블록 (audit_input_stats.sh::extract_modes 와 동일 awk)
- 단위/위젯 테스트: `grep -rhE "^[[:space:]]*(test|testWidgets)\(" community_app/test/ | wc -l`

exit code: 0 (일치 또는 검사 대상 없음) / 1 (불일치 1건 이상). 환경변수: `VERBOSE=1` (OK 도 출력) / `STRICT=1` (ground truth 없는 패턴도 NG).

본 단계는 17차-B 라운드의 Codex confabulation 2건 (`SCENARIO_MATRIX_INDEX.md:82` / `scenarios.md:110` 을 "P70 5 modes" 로 인용한 stale 입력) 같은 패턴을 prompt 송신 전에 사전 차단하기 위해 18차-A 라운드에서 도입.

**3단계: wrapper 강제 호출 (19차-A 도입)**

`check_prompt_stale.sh` 가 정상 동작했음에도 18차-C 의 Codex 호출 prompt 작성 시 호출이 누락되어 11차/12차의 confabulation 패턴이 재발 (도구 결함이 아닌 **인적 누락**). 19차-A 는 이를 강제하기 위해 wrapper 를 도입:

```bash
bash business_logic/verification/audit_prompt_guard.sh /tmp/codex_audit_prompt.md
# exit 0 → 송신 가능
# exit 1 → 송신 차단 (stale 항목 수정 필수)
# exit 2 → 인자/파일 오류

# escape hatch (의도적 강제 송신 시에만):
ALLOW_STALE=1 bash business_logic/verification/audit_prompt_guard.sh /tmp/codex_audit_prompt.md
```

**Codex audit 호출 직전에 본 wrapper 통과를 의무화** 한다 (워크플로 운영 룰 — 헬퍼 1단계/2단계 직접 호출은 금지하지 않으나, 송신 전 마지막 검증은 본 wrapper 로 일원화). 본 wrapper 는 신규 검증 로직을 추가하지 않고 `check_prompt_stale.sh` 호출만 강제하므로, 검사 패턴 갱신은 `check_prompt_stale.sh` 측에서만 한다.

## 4. 응답 처리 사이클 (발견 → 정정 → 재검증)

외부 감사 결과를 받은 직후 다음 사이클을 따른다.

### 4.1 표준 사이클

```
[1] 결과 보고서 저장
    └─ verification/00_CODEX_<라운드>_AUDIT.md

[2] 발견 분류 (코드 vs 산출물 vs 도구 vs 형식 vs 메타)

[3] 즉시 수정
    ├─ 코드 버그: Edit + (필요시 build_runner) + flutter analyze
    ├─ 산출물 오류: Edit
    ├─ 도구 FP: 화이트리스트 추가 + 재실행
    └─ 형식 위반: 표준 5필드/4-file 정정

[4] 재검증
    ├─ 형식: bash check_format.sh — exit 0
    ├─ enum: bash check_enum_sync.sh — exit 0
    ├─ analyze: flutter analyze — No issues
    └─ 산출물: 수정한 파일 read 후 변경 확인 (재읽기 금지 규칙 예외)

[5] 마스터 요약 갱신
    ├─ verification/00_MASTER_SUMMARY.md "Codex 외부 감사 결과" 섹션
    └─ CHECKLIST.md 라운드 진행 표
```

### 4.2 거짓 진술 방지 룰

7-8 라운드에서 가장 비싼 실수는 **"수정 완료"라고 보고했지만 실제로는 미수정** 이었다 (1차 라운드 F03-12 CANCELLED, Master Summary 의 fully fixed 표기 실패).

방지 룰:
1. **"수정 완료" 라고 쓰기 전에 grep / re-read 로 잔여 검출**.
2. **마스터 요약에 자동 수정 N건 적용** 표기 시, 실제 grep 결과 0건을 확인하고 적는다.
3. **외부 감사 결과를 받기 전까지는 "1차 라운드 수정 완료" 표기를 금지** 하고, "1차 라운드 적용 / 2차 외부 감사 대기" 로 표기.

## 5. 유형별 정정 가이드

### A. 코드 버그 (Flutter/Spring 실 코드)
- **수정 방법**: Edit 도구로 직접 수정.
- **재검증**:
  - Freezed/Retrofit/json_serializable 모델 수정 시 반드시 `dart run build_runner build --delete-conflicting-outputs` 실행 (3차 라운드 B1/B8 부작용 사례 — 원본만 고치고 `.g.dart` `.freezed.dart` 미재생성으로 analyze fail).
  - `flutter analyze <변경 파일>` 또는 `flutter analyze` 전체 — exit code 0.
- **사례**: B1 CalendarEventVo (int → String?), B8 dead code, B3 SuggestionVo.eventId, B4 trust score, B6 padding.

### B. 산출물 오류 (markdown)
- **수정 방법**: Edit 도구. 단일 토큰(라벨, enum, 필드명) 오류는 `replace_all` 또는 `sed`.
- **재검증**:
  - `bash check_format.sh` — exit 0.
  - 잔여 grep: `rg -n "<오류 토큰>" units/`.
- **사례**: F03-12 CANCELLED → CANCELED, Unit 02 사용자 검색 → Unit 01, DeviceTokenParam (token, platform, deviceName) → (token, deviceType).

### C. 자동화 도구 (스크립트)
- **수정 방법**: 외부 감사가 분류한 카테고리(real bug vs FP)별로 화이트리스트 분리.
- **재검증**:
  - 스크립트 직접 실행 — exit code 확인.
  - 의도적 위반 corpus 로 검출 동작 확인.
- **사례**: 4차 라운드 `check_enum_sync.sh` 45건을 7 진짜 / 38 FP 로 분류 후 5 카테고리 화이트리스트 도입 (api_error classifier / audit prefix / socket realtime / WebView messages / UI-only filters).

### D. 형식 위반 (산출물 형식)
- **수정 방법**:
  - E2E-derived 섹션은 **페르소나/시작 상태/시퀀스/종료 상태/출처:** 5필드 형식 강제.
  - 5필드 못 채우는 surface 보강은 헤더에 "보강 메모" 명시 (check_format.sh 가 화이트리스트로 면제).
  - 출처 표기는 `> 출처: integration_test/<file>.dart` 한 가지로 통일 (`유래`/`E2E source`/`E2E 매핑` 금지).
- **재검증**: `bash check_format.sh` exit 0.
- **사례**: 6차 라운드 26건 형식 위반 → F14/F10/F13 scenarios.md 5필드 정렬, F04-01/07/13/16 보강 메모 헤더 변경.

### E. 메타 개선 (워크플로/문서화)
- **수정 방법**: SPEC_TEMPLATE.md / 본 워크플로 문서 / 마스터 인덱스 갱신.
- **재검증**: 사용자 검토.
- **사례**: 본 라운드 (9차) E1 메타 개선 — 본 워크플로 문서 신설.

## 6. 라운드 종료 체크리스트

> **22차-C 이후 권장**: 라운드 종료 시 종합 검증을 한 번에 실행하려면 다음 명령 하나로 7 검증 스크립트 + `audit_input_stats` + `flutter analyze` (+ `--with-tests` 시 `flutter test`) 를 순차 실행하고 markdown 표 형식 종합 결과 + 종합 exit code 를 받을 수 있다.
>
> ```bash
> bash business_logic/verification/run_round_audit.sh             # 기본 (8 검증)
> bash business_logic/verification/run_round_audit.sh --with-tests # flutter test 포함 (9 검증)
> bash business_logic/verification/run_round_audit.sh --quiet      # 결과 행만, FAIL 시 캡처 로그 인용
> bash business_logic/verification/run_round_audit.sh --fail-fast  # 첫 FAIL 발생 시 즉시 중단
> ```
>
> 본 wrapper 는 자체 검증 로직을 추가하지 않고 아래 항목을 순차 호출만 한다 — 매 라운드 사람·agent 의 단계 누락 위험 차단 (22차-C 도입). 각 항목 개별 호출도 그대로 유효.

라운드 종료 전 반드시 확인:

- [ ] `bash business_logic/verification/check_format.sh` exit 0
- [ ] `bash business_logic/verification/check_enum_sync.sh` exit 0 (enum 변경 라운드인 경우)
- [ ] `bash business_logic/verification/check_traces.sh` exit 0 (traces 마커 추가/갱신 또는 community_api 컨트롤러 변경 라운드인 경우)
- [ ] `bash business_logic/verification/check_field_size_sync.sh` exit 0 (클라 입력 위젯 maxLength 또는 서버 Param `@Size` 변경 라운드인 경우 — 11차-B/12차-D 베이스라인 36건)
- [ ] `bash business_logic/verification/check_meta_sync.sh` exit 0 (메타 문서 통계/카운트 갱신 라운드 — 16차-A 추가, markdown 수/traces 수/검증 스크립트 수/산출물 수 stale 자동 검출. 21차-B 보강: CHECKLIST `## 7-N 라운드` 헤더 stale 검사 + `SCENARIO_MATRIX_INDEX.md` P 매트릭스 순서 정렬 검사 추가 — 13차-B-1/13차-D-1 사례 후속 가드)
- [ ] `bash business_logic/verification/check_prompt_stale.sh <prompt.txt>` exit 0 (외부 감사 호출 prompt 본문에 수치/카운트 인용 시 — 18차-A 추가, prompt 송신 직전 stale 자동 차단; 17차-B confabulation 2건 회귀 가드)
- [ ] `bash business_logic/verification/audit_prompt_guard.sh <prompt.txt>` exit 0 (Codex audit 호출 직전 의무 — 19차-A 추가, 18차-C 인적 누락 패턴 차단; `check_prompt_stale.sh` 강제 호출 wrapper)
- [ ] `bash business_logic/verification/check_round_sync.sh` exit 0 (라운드 종료 직전 의무 — 21차-A 추가, 13차-E-1 silent code drift 패턴 차단; 코드/E2E/산출물에 추가된 `[0-9]+차-[A-Z][0-9]?` 형식 라운드 마커가 메타 문서 3종 — CHECKLIST / IMPROVEMENT_PLAN / STATUS_AND_REMAINING — 에 등재됐는지 검증. 19차-A wrapper 와 책임 분리: wrapper 는 prompt 송신 전 수치 stale 차단 / 본 헬퍼는 라운드 적용 후 마커 등재 누락 차단)
- [ ] `bash business_logic/verification/run_round_audit.sh` exit 0 (22차-C 추가, 위 7 검증 + `audit_input_stats` 통계 추출 + `flutter analyze` 일괄 wrapper — markdown 표 형식 종합 결과 + 종합 exit code. `--with-tests` 시 `flutter test` 추가. 검증 로직 0 — 각 검증 개별 호출도 그대로 유효, 단계 누락 위험만 차단)
- [ ] `cd community_app && flutter analyze` No issues found! (Flutter 코드 변경 라운드인 경우)
- [ ] Freezed/Retrofit/Provider 변경한 경우 `dart run build_runner build --delete-conflicting-outputs` 재실행 후 `.g.dart`/`.freezed.dart` 갱신 확인
- [ ] 신규 E2E 매트릭스 추가 시 `community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md` 행 추가 (P 번호, 스크립트명, 테스트 파일)
- [ ] scenarios.md `## E2E-derived` 섹션 추가 시 표준 5필드 + `> 출처:` 형식
- [ ] verification/00_MASTER_SUMMARY.md "Codex 외부 감사 결과" 갱신 (해당 라운드 외부 감사 실시한 경우)
- [ ] CHECKLIST.md 라운드 진행 표 ✅ 마킹 (분류 표 포함)
- [ ] IMPROVEMENT_PLAN.md 액션 아이템 상태 (✅/🔄/🟡) 갱신

## 7. 알려진 함정 (1~11 라운드 실 사례)

외부 감사가 잡아낸 실제 함정 — 동일 패턴이 반복되지 않도록 인용.

### 7.1 거짓 "수정 완료" 보고 (1차 라운드)
- **사례**: Master Summary 가 "F03-12 CANCELLED → CANCELED 수정 완료" 로 표기했으나 실제 파일에는 잔여.
- **검출**: 외부 감사가 grep 으로 직접 확인.
- **교훈**: "수정 완료" 표기 직전에 grep 으로 0건 검증.

### 7.2 파일 지목 오류 (1차 라운드)
- **사례**: Unit 12 의 DeviceTokenParam 추측 필드 오류를 F12-05 backend.md 로 잘못 지목. 실제는 00_overview.md.
- **검출**: 외부 감사가 양 파일 read 후 비교.
- **교훈**: 오류 파일 지목 시 grep 으로 확실한 hit 라인을 인용.

### 7.3 환영 파일명 (2차 라운드)
- **사례**: traceability 보고서에 존재하지 않는 테스트 파일명 3개 (`socket_app_roundtrip_test.dart` 등).
- **검출**: 외부 감사가 `find integration_test -name '*.dart'` 와 대조.
- **교훈**: 파일명 인용 전 `ls` 확인.

### 7.4 Build_runner 부작용 (3차 라운드)
- **사례**: B1 (calendar_event_vo) / B8 (event_location_api) 원본 모델만 수정하고 `.freezed.dart` `.g.dart` 미재생성 → flutter analyze fail.
- **검출**: 외부 감사가 직접 flutter analyze 실행.
- **교훈**: Freezed/Retrofit 모델 수정 직후 항상 build_runner.

### 7.5 가정 오류 — F14 host gate (6차 라운드)
- **사례**: "host 는 update 시간/opt-in gate 우회" 라고 산출물에 적었으나 실제 LocationService.updateLocation 은 host 도 시간/opt-in 검사 통과 필요. 단지 getEventLocations 조회만 host bypass.
- **검출**: 외부 감사가 LocationService 실 코드 read.
- **교훈**: "특정 역할이 우회한다" 류 가정은 실제 Service 메서드별로 분리 확인.

### 7.6 Mode 의미 오해 — F10 delete_recurring (6차 라운드)
- **사례**: P65 `delete_recurring_scope` 모드가 실제로는 ruleId 추적 없이 scope UI 부재만 검증 → 서버 mutation E2E 가 아님.
- **검출**: 외부 감사가 테스트 코드 read 후 mutation 호출 부재 확인.
- **교훈**: mutation matrix 모드명은 실제 호출 동작과 일치시키고, surface 검증만 하는 모드는 명시.

### 7.7 Enum 추측 — WAITING vs WAITLISTED (1차+4차 라운드)
- **사례**: `ClubEventAttendanceStatus.fromString` 이 서버 실제 값 `WAITING` 을 인식하지 못해 대기열을 `notAttending` 으로 떨어뜨림. 동시에 `ClubJoinResultType.waitlist('WAITLIST')` 는 서버 JoinResultVo 가 실제 반환하는 정상 값. 같은 토큰이 위치별로 다른 의미 → 일괄 변환 금지.
- **검출**: 4차 라운드 enum_sync 스크립트 + 외부 감사 분류.
- **교훈**: 같은 enum 토큰도 위치별 컨텍스트 확인. 기계적 일괄 치환 금지.

### 7.8 통계 부정확 (2차 라운드)
- **사례**: Flutter integration test 73 (실제 74) / run_p*.sh 66 (실제 65).
- **검출**: 외부 감사가 `find` 로 직접 카운트.
- **교훈**: 통계 보고 직전 `find ... | wc -l` 재계산.

### 7.9 산출물 결론 vs 과거 판정 충돌 (3차 라운드)
- **사례**: F09-06 SOS 의 최종 결론은 "의도적 미운영" 이지만 `00_CODEX_E2E_AUDIT.md` 에 과거 "미구현 positive E2E RED 상태" 표현이 잔존.
- **해결**: 과거 감사 보고서 상단에 ⚠️ "이후 사용자 확인으로 정정됨" 알림 박스 추가 + 최종 결론 링크.
- **교훈**: 과거 감사 문서를 archival 처리할 때는 정정 알림과 최종 결론 링크를 명시.

### 7.10 Audit input stale — 사람이 prompt 작성 시 기억으로 통계 인용 (10차 E2 라운드)
- **사례**: Codex 감사 prompt 작성 시 "P69 는 4 modes" 라고 사전에 명시. 그 사이에 다른 라운드 (15차-A) 가 P69 를 5 modes 로 확장. Codex 가 stale 입력 기반으로 가정 형성 → 가짜 발견 가능. 본 환경에서 직접 grep 으로 확인하여 가정 오류 차단 성공.
- **검출**: 외부 모델이 인용한 통계를 직접 grep 으로 재확인.
- **교훈**: prompt 작성 시 사람의 기억으로 통계를 인용하지 않는다. `audit_input_stats.sh --prompt` 자동 추출 블록을 prompt 에 포함시킨다 (§3.4 1단계).
- **추가 가드 (18차-A)**: 사전 통계 블록 외에 prompt 본문(변경 영역 설명·인용 수치) 에 사람이 추가한 카운트도 `check_prompt_stale.sh` 로 송신 전 자동 검증. 17차-B confabulation 2건이 본 헬퍼로 사전 차단되는 회귀 검증 (§7.11 참조).

### 7.11 외부 감사 confabulation — 옛 파일 상태 인용 (11차 라운드 B-1/B-3, 18차-A 후속 가드)
- **사례**: 11차 Codex 감사가 `SCENARIO_MATRIX_INDEX.md:82` 를 "P70 = 5 modes" 로 인용하며 9 modes 와의 불일치를 지적 (B-1). `F06-06 scenarios.md:110` 도 "5 modes" 헤더로 인용 (B-3). 실제 파일은 둘 다 이미 "9 modes" 로 갱신되어 있었음 — 17차-A/C 갱신 사항 반영 누락. 사용자 prompt 의 16차 변경 영역 기술 (`P70 5 modes`) 이 stale 였고, Codex 가 그 stale 입력을 그대로 신뢰하여 실제 파일과 다르다고 보고.
- **검출**: 발견 적용 직전 직접 grep 으로 현재 상태 확인. SCENARIO_MATRIX_INDEX.md 와 scenarios.md 모두 이미 "9 modes" 였음.
- **교훈**: §7.10 의 stale input 위험은 `audit_input_stats.sh` 자동화로 사전 통계 블록을 보호하지만, prompt **본문**(변경 영역 설명) 의 stale 까지는 통계 추출 헬퍼만으로는 자동 차단 불가. 외부 감사 응답을 적용하기 전 file:line 단위 재확인 (1차 자체 검증) — 7~10차 워크플로 §4.1 4-2 단계가 본 케이스를 차단.
- **18차-A 후속 가드 도입**: `check_prompt_stale.sh` 신설 (`§3.4` 2단계). prompt 본문에 등장하는 `P<N> <M> modes` / `<N> 마커` / `markdown <N>` / `검증 <N>종` / `<N>/<N> PASS` 등 패턴을 prompt 송신 전에 grep 추출 → ground truth 와 비교 → 불일치 시 exit 1 + NG 출력. 17차-B 의 두 confabulation 트리거 (`P70 5 modes` 두 곳) 가 본 헬퍼 회귀 시나리오로 차단 검증 완료. 향후 같은 패턴의 stale 본문은 송신 전 자동 차단.

### 7.12 인적 누락 패턴 — 헬퍼 작성됐는데 호출 누락 (18차-C → 19차-A 후속 가드)

- **사례**: 18차-A 가 `check_prompt_stale.sh` 를 정상 작성 (검증 패턴 8종 동작 확인) 했음에도, 18차-C 의 Codex 호출 prompt 작성 단계에서 본 헬퍼를 호출하지 않고 송신 → 11차/12차의 prompt 본문 stale confabulation 패턴이 재발. 본문에 P70 9 modes / 5 검증 스크립트(당시 기준) 같은 stale 표기를 그대로 둔 채 송신.
- **검출**: 본 환경 재현으로 확인 — 18차-C 가 작성한 prompt 를 `check_prompt_stale.sh` 에 통과시키면 정확히 NG 2건 (P70 9→10 / 검증 스크립트 5→6) 으로 차단됐을 것.
- **본질**: **도구 결함이 아닌 운영 룰 강제 메커니즘 부재**. 워크플로 §3.4 강조 표시만으로는 동일 사람이 반복 작업 시 누락 위험을 차단하지 못함.
- **19차-A 후속 가드 도입**: `audit_prompt_guard.sh` wrapper 신설. Codex audit 호출 prompt 송신 전 단계에서 본 wrapper 통과를 의무화 (워크플로 §3.4 3단계). wrapper 는 자체 검증 로직 없이 `check_prompt_stale.sh` 호출만 강제 — 통과(exit 0) 시에만 "송신 가능" 신호, 실패(exit 1) 시 차단 + 안내. `ALLOW_STALE=1` 환경변수로 escape hatch 제공 (의도적 강제 송신 시).
- **교훈**: 검증 헬퍼 작성 후 워크플로 문서 강조만으로 호출을 보장할 수 없다. 강제 메커니즘 (wrapper / pre-send hook / CI gate) 까지 도입해야 인적 누락 패턴 차단.

### 7.13 silent code drift — 코드 적용 후 메타 등재 누락 (13차-E-1 → 21차-A 후속 가드)

- **사례**: 20차-B 가 코드/E2E/산출물 5개 파일 (`community_api/docs/sql/sample_data.sql` SUSPENDED 시드 1510 / `seed_subscription_mutation_test.dart` `reactivate_success` case / `run_p71_subscription_mutation_matrix.sh` cases 4→5 / `SCENARIO_MATRIX_INDEX.md` P71 5 modes / `F06-08/scenarios.md` reactivate_success 시나리오) 에 적용 완료했으나, `business_logic/CHECKLIST.md` / `IMPROVEMENT_PLAN.md` / `STATUS_AND_REMAINING.md` **어느 메타 문서에도 20차-B 행 등재 없음**. 13차 Codex 외부 감사 E-1 이 본 패턴을 "silent application" 으로 명명 후 식별 — Codex 는 prompt 자연어 컨텍스트의 "19차-C 4 modes" 와 실제 파일 5 modes 의 의미 불일치를 단서로 silent drift 를 역추적.
- **검출**: 13차 Codex 호출에서 prompt **통계 블록** stale 은 19차-A wrapper 가 차단했지만 prompt **자연어 컨텍스트** ("19차-C 4 modes") 와 실제 파일 (5 modes) 의 의미 불일치는 wrapper grep 패턴 (수치 토큰 단위) 으로 차단 불가능했음. Codex 가 자연어 ↔ 파일 cross-check 로 silent drift 식별.
- **본질**: 19차-A wrapper 는 prompt **송신 직전 수치 stale** 차단에 특화 (`P<N> <M> modes` 토큰 매칭). 라운드 적용 후 메타 등재 누락은 prompt 송신 시점과 무관하게 발생 가능 — 별도 가드 필요.
- **21차-A 후속 가드 도입**: `check_round_sync.sh` 신설 (검증 7번째 스크립트). 코드/E2E/산출물 영역의 `[0-9]+차-[A-Z][0-9]?` 형식 라운드 마커를 grep 추출 → 메타 문서 3종 (CHECKLIST / IMPROVEMENT_PLAN / STATUS_AND_REMAINING) 매칭 검사 → 1+ 등재 (기본) 또는 3/3 등재 (`STRICT=1`) 가드. 라운드 종료 체크리스트 §6 에 추가 — 라운드 종료 직전 exit 0 의무. 첫 실행에서 2 silent drift 검출: `12차-A` (sub-rounds 12차-A1/A2 의 family 라벨 — 4 코드 영역 인용 vs 메타 0/3) / `20차-C` (`F06-06/scenarios.md:242` "PG 카드 환불 비동기 워커 평가 — E2E architecturally 불가, 별도 sprint 영구 등재" 라운드가 메타 0/3) — 두 마커 모두 본 라운드에서 회수 등재로 정합화.
- **교훈**: 라운드 적용은 (1) 코드/E2E/산출물 변경 + (2) 메타 문서 등재 양쪽이 모두 있어야 완성. 한쪽만 적용된 상태를 "silent" 라 부르며, prompt 송신 전 stale 가드 (`check_prompt_stale.sh` / `audit_prompt_guard.sh`) 와는 별개로 라운드 종료 시점에 마커 등재 가드 (`check_round_sync.sh`) 가 필수.

### 7.14 sandbox 환경 가정 오류 — Codex sandbox-only NG 보고 (11차/12차 누적 → 23차-A baseline 명세)

- **사례**: Codex 외부 감사 응답에 sandbox 환경 가정 기반 NG 가 누적적으로 포함. 9~13차 누적 7건 — (a) 9차 check_traces/check_enum_sync "read-only sandbox 에서 write 실패" 가정 (실제 호스트 exit 0) (b) 10차 audit 입력 "P69 4 modes" stale 가정 (실제 5 modes) + read-only write 실패 가정 (c) 11차 Codex confabulation 2건 (`P70 5 modes` 인용, 실제 9 modes) (d) 12차 mktemp / here-doc 실패 가정 2건 (실제 호스트 모두 exit 0).
- **검출**: Codex 가 보고한 정확한 명령을 호스트에서 직접 실행 → exit 0 이면 sandbox 가정 무효. 예: `bash business_logic/verification/check_meta_sync.sh && echo "host exit 0 — sandbox 가정 무효"`.
- **본질**: Codex 가 실행되는 read-only sandbox 환경의 mktemp/write/here-doc 동작이 본 프로젝트 호스트 환경과 다를 수 있음. silent fix 적용 시 호스트 baseline 이 의도치 않게 변경될 위험 — Codex 가 본 환경에서 작동하지 않는 도구를 "수정" 하면 호스트에서 회귀.
- **19차-B 부분 가드**: `set -o pipefail` + mktemp/printf 실패 시 명시 `exit 1` 가드를 3 도구 (`check_prompt_stale.sh` / `check_meta_sync.sh` / `audit_input_stats.sh`) 에 적용 — silent 0-count corruption / silent permission denied 를 명시적 fail-fast 로 전환. sandbox 환경에서도 sandbox-only NG 가 silent 가 아닌 명시적 차단으로 잡힘.
- **23차-A baseline 명세 도입**: `verification/SANDBOX_BASELINE.md` 신설. Codex sandbox vs 호스트 환경 차이 패턴 4종 (here-doc / mktemp / write permission / 도구 sandbox 동작) + 호스트 baseline 검증 결과 (모두 exit 0) + Codex sandbox-only NG 보고를 호스트에서 직접 재검증하는 절차 (`bash <tool>.sh && echo "host exit 0 — sandbox 가정 무효"`) 정형화. **운영 룰**: Codex sandbox-only NG 는 silent fix 금지 — 호스트 직접 실행으로 차단 후 라운드 메타 행에 "가정 오류 N건 검출 — 차단" 표기.
- **교훈**: 외부 감사 모델의 발견 응답을 적용하기 전, 보고된 환경 가정 (특히 "sandbox / read-only / permission" 류 어구) 을 호스트에서 직접 재검증한다. 19차-B 의 sandbox fail-fast 가드와 본 baseline 의 재검증 절차가 짝이 되어 sandbox 가정 오류 회귀를 차단.

- 외부 감사 모델도 100% 정확하지 않다. 6차 라운드에서 외부 감사가 P61 행 추가 raw diff 를 실수로 인용한 사례 (자체 정정).
- "외부 감사" 1회로 끝나지 않는 라운드도 있다. 발견이 누적적이라면 즉시 수정 후 다시 외부 감사 호출.
- 외부 모델 호출에 시간/비용이 든다. 자체 검증으로 충분한 trivial 변경에는 적용하지 않는다 (체크리스트 §2 참조).

## 9. 관련 문서

- [`SPEC_TEMPLATE.md`](../SPEC_TEMPLATE.md) — Step 3-5 산출물 형식 사양 (E2E-derived 5필드, traces 마커)
- [`00_MASTER_SUMMARY.md`](00_MASTER_SUMMARY.md) — 1차 검증 마스터 요약
- [`e2e_traceability/00_E2E_MASTER_SUMMARY.md`](e2e_traceability/00_E2E_MASTER_SUMMARY.md) — 2차 E2E 추적 마스터
- [`00_CODEX_AUDIT.md`](../archive/2026-09-28/verification/00_CODEX_AUDIT.md), [`00_CODEX_ROUND3_AUDIT.md`](../archive/2026-09-28/verification/00_CODEX_ROUND3_AUDIT.md), [`00_CODEX_ROUND4_AUDIT.md`](../archive/2026-09-28/verification/00_CODEX_ROUND4_AUDIT.md), [`00_CODEX_ROUND6_AUDIT.md`](../archive/2026-09-28/verification/00_CODEX_ROUND6_AUDIT.md) — 외부 감사 보고서
- [`e2e_traceability/00_CODEX_E2E_AUDIT.md`](e2e_traceability/00_CODEX_E2E_AUDIT.md) — 2차 라운드 E2E 감사 (archival)
- [`00_ROUND9_META_REVIEW.md`](../archive/2026-09-28/verification/00_ROUND9_META_REVIEW.md) — 9차 라운드 메타 리뷰 (본 워크플로 표준화 결과)
- [`check_format.sh`](check_format.sh), [`check_enum_sync.sh`](check_enum_sync.sh), [`check_traces.sh`](check_traces.sh), [`check_field_size_sync.sh`](check_field_size_sync.sh), [`check_meta_sync.sh`](check_meta_sync.sh), [`check_prompt_stale.sh`](check_prompt_stale.sh), [`check_round_sync.sh`](check_round_sync.sh) — 자동 검증 스크립트 (7종, baseline `maxlength_baseline.txt` 포함, 메타 stale 검출 16차-A 추가, prompt 본문 stale 18차-A 추가, silent code drift 21차-A 추가, CHECKLIST 라운드 헤더 / SCENARIO_MATRIX_INDEX P 순서 21차-B 추가)
- [`audit_input_stats.sh`](audit_input_stats.sh) — 외부 감사 prompt 사전 통계 자동 추출 헬퍼 (16차-B, §3.4 1단계)
- [`audit_prompt_guard.sh`](audit_prompt_guard.sh) — Codex audit 호출 prompt 송신 전 stale 자동 차단 wrapper (19차-A, §3.4 3단계 — 18차-C 인적 누락 패턴 후속 가드)
- [`run_round_audit.sh`](run_round_audit.sh) — 라운드 종료 종합 검증 wrapper (22차-C, §6 — 7 검증 + audit_input_stats + flutter analyze + 옵션 flutter test 일괄 실행, markdown 종합 출력 + 종합 exit code)
- [`SANDBOX_BASELINE.md`](SANDBOX_BASELINE.md) — sandbox 환경 baseline 명세 (23차-A, §7.14 — Codex read-only sandbox 와 호스트 환경 차이 패턴 4종 + 호스트 검증 결과 + Codex sandbox-only NG 보고 재검증 절차)
