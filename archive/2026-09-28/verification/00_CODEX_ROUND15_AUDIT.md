# Codex ROUND15 외부 감사 보고서 — 24차-A/B/C/D 후 (정형 9회차)

> 시점: 2026-05-11
> 호출: `mcp__codex__codex` (gpt-5.2 기본 — high reasoning effort, read-only sandbox)
> 입력: `audit_input_stats.sh --prompt` 사전 통계 자동 주입 + `audit_prompt_guard.sh` (19차-A wrapper) **2회 실전 사용 (1차 NG `markdown 715` → 714 정정 → 2차 OK)**
> 검증 baseline (호출 직전): 7 검증 스크립트 + `audit_input_stats` + `audit_prompt_guard` + `run_round_audit` 모두 호스트 환경에서 exit 0

---

## 1. 호출 컨텍스트

### 1.1 정형 워크플로 9회차

| 라운드 | 발견 | A 코드 | B 산출물 | C 도구 | D 검증 | E 메타·confab |
|---|---:|---:|---:|---:|---:|---:|
| 7차 | 8 | 2 | 12 | 1 | — | 0 |
| 8차 | 8 | 2 | 6 | 0 | — | 1 |
| 9차 | 4 | **0** | 4 | 0 | — | 2 |
| 10차 | 4 | **0** | 5 | 0 | — | 2 |
| 11차 | 3 + confab 2 | **0** | 2 | 1 | — | 4 |
| 12차 | 8 | **0** | 3 | 2 | 0 | 3 |
| 13차 | 7 | **0** | 5 | 0 | 1 | 1 |
| 14차 | 6 | **0** | 0 | 3 | 2 | 1 |
| **15차** | **6** | **0** | **4** | **0** | **1** | **1** |

**A 코드 결함 0건 — 7회 연속 (9·10·11·12·13·14·15차)**. **7회 연속 0 가설 TRUE 재검증 완료**.

### 1.2 15차 감사 대상 (24차-A/B/C/D)

호출 컨텍스트 prompt 는 24차 종료 snapshot 으로 작성. 호스트 baseline 호출 직전 8/8 PASS (`run_round_audit.sh`).

- **24차-A**: B5 옵션 C 적용 (F11-01 review 본문 클라 `maxLength: 500` → `1000`). 코드 1줄 + baseline 1행. 서버 변경 0.
- **24차-B**: C3 옵션 B 적용 (F03-03 다중 요일 BYDAY). 서버 Param 1 필드 + Service 헬퍼 3개 + 클라 Param + UI ChoiceChip. DB 변경 0 (RRULE 문자열에 직렬화).
- **24차-C**: F09-06 SOS 영구 스펙아웃 확정 (사용자 명시). 5 산출물 라벨 정정 (코드/서버/시드/E2E 변경 0).
- **24차-D**: 24차-B 의 코드 주석 라벨 변형 회수 등재 (silent drift 회수, 코드 변경 0).

### 1.3 wrapper 2회 실전 (1차 NG → 2차 OK)

```
[1회차] /tmp/codex_round15_prompt.md 송신 시도
  NG  /tmp/codex_round15_prompt.md:30 — markdown 715 인용 ≠ 실제 714 파일
  → "1~24차 누적 통계 markdown 715" 자연어 stale (15회차 시점 14차 보고서의 715 표기를 그대로 사용했음)
[guard] ❌ prompt 송신 차단

[2회차] markdown 714 로 정정 후 재시도
  OK 1 / NG 0 / SKIP 3
[guard] OK — prompt 송신 가능
```

→ 14차에서 도입된 wrapper 의 자연어 토큰 차단이 15차에서도 유효. 14차 보고서 자체 인용 (715) 의 stale 까지 자동 차단.

---

## 2. 발견 분류 및 적용

### 2.1 확정 발견 (6건)

| ID | 카테고리 | 발견 | 검증 결과 | 적용 |
|---|---|---|---|---|
| 15차-B-1 | B 산출물 | `PRODUCT_DECISIONS.md:7` "메타 인벤토리상 제품 결정 잔여는 PR1 (B5 옵션 C — 24차-A 적용 완료) / PR2 (C3 RRULE) 2건" — PR1 은 적용 완료 표기 있으나 "잔여 2건" 카운트에 PR1 포함시켜 모순 + PR2 C3 도 24차-B 로 적용 완료인데 미반영 → 실제 잔여 0건 | `grep -n "잔여" PRODUCT_DECISIONS.md` line 7 / `AUTONOMOUS_PROGRESS_TERMINUS.md` "0건" 정합. 본 행만 stale. | ✅ 즉시 정정 — "**제품 결정 잔여는 0건** (PR1 B5 — 24차-A 옵션 C 적용 완료 / PR2 C3 — 24차-B 옵션 B 적용 완료 / PR3 F09-06 — 24차-C 영구 스펙아웃 격상)" 로 갱신. 15차 Codex 외부 감사 정정 명시. |
| 15차-B-2 | B 산출물 | `PRODUCT_DECISIONS.md:284` "AUTONOMOUS_PROGRESS_TERMINUS 제품 결정 3건 → 2건" — 24차-C 시점 사실이지만 24차-B 적용 후 최종 0건이라 readers 가 혼란 | `AUTONOMOUS_PROGRESS_TERMINUS.md` "PR1 24차-A 적용 종료 / PR2 24차-B 적용 종료 / PR3 24차-C 영구 스펙아웃 격상". | ✅ 즉시 정정 — "24차-C 시점 3건 → 2건 → 이후 24차-B 적용으로 최종 0건" 으로 명시 (historical 24차-C 시점 표기는 보존, 최종 상태 추가). |
| 15차-B-3 | B 산출물 | `STATUS_AND_REMAINING.md:175` LOW 표 "B5 description maxLength" 행 "옵션 C(F11-01 클라 500→1000 확장)는 별도 결정 대기" — 24차-A 옵션 C 적용 완료 미반영 | `maxlength_baseline.txt:48` 1000 정합 + `review_write_screen.dart:290` 1000. | ✅ 즉시 정정 — strikethrough + "**24차-A 옵션 C 적용 완료**" 명시 + B5 시리즈 종결 표기. |
| 15차-B-4 | B 산출물 | `STATUS_AND_REMAINING.md:176` LOW 표 "C3 RRULE 확장" 행 "별도 결정" — 24차-B 옵션 B 적용 완료 미반영. line 195/225/244 도 동일 stale (C3 잔여 표기). | `recurring_event_create_param.dart:15 + RecurringEventCreateParam.java:19` 정합. | ✅ 즉시 정정 — 4개 라인 모두 갱신. line 176 strikethrough + 24차-B 옵션 B 적용 완료 명시 / line 195 "제품 결정 영역 종결 ✅" / line 225 "제품 결정 영역 전부 종결" + 25차 옵션 A 권장 명시 / line 244 strikethrough. |
| 15차-D-5 | D 검증 | Codex 가 read-only sandbox 에서 `check_round_sync.sh` mktemp 실패 + `check_meta_sync.sh` here-doc 오류 출력 후 exit 0 (sandbox-only false-green 가능성) | 본 호스트 환경에서 `run_round_audit.sh` 8/8 PASS exit 0 + `check_round_sync.sh` 기본 + STRICT 모두 OK 21 / NG 0. | ⚠️ Informational — sandbox 환경 의존. 호스트 baseline 정확. `SANDBOX_BASELINE.md` (23차-A 신설) 와 정합. 본 라운드 추가 조치 없음 (sandbox baseline 명세는 이미 23차-A 에서 처리). |
| 15차-E-6 | E 메타 | RRULE 옵션 B 의 `MAX_CHILD_EVENTS=52` 의미 — "occurrence 리스트 상한". 시작 요일이 BYDAY 에 포함되면 템플릿 occurrence 가 리스트에 들어간 후 child 생성 루프 (`for (LocalDateTime startTime : occurrences) { if (startTime.equals(template.getStartTime())) continue; ... }`) 에서 skip → 실제 child 최대 51개 가능. 레거시 단일 요일 경로도 동일 의미라 회귀 아님 | `RecurringEventCreateService.java:99-103` 템플릿 skip 분기 확인. backward compat 가 정확하지만 "child 52개 보장" 으로 문서화하면 오해. | ⚠️ Documentation contextualize — 본 행은 별도 라운드 후보로 등재 (16차-B 후보). 본 라운드는 라벨 정확화만 (CHECKLIST 본 행에 명시) — 코드/문서 변경 0. |

### 2.2 가정 오류 / Codex 자체 confabulation

본 라운드는 **0건** — Codex 가 stale 발견 시 정확한 file:line 인용 + sandbox 환경 차이도 명시적으로 다룸. 자체 confab 0.

### 2.3 정상 확인 (Codex 가 정확히 검증)

- **A 코드 0 finding** — 7회 연속 안정화 가설 TRUE 재검증
- **24차-A maxLength 1000 정합 정확** — 클라/서버/baseline 3-way 정합
- **24차-B RRULE 옵션 B 정합 정확** — 서버 Param + Service 헬퍼 + 클라 Param + UI ChoiceChip + DB 변경 0 + backward compat (null/empty → 단일 요일 분기) 모두 정확
- **24차-B `event_recurrence.recurrence_rule varchar(500)` 충분 용량 확인** — 7요일 BYDAY+UNTIL max ~30자
- **24차-C F09-06 영구 스펙아웃 라벨 격상 정확** — 단위 디렉토리 4 파일 보존 + 5 산출물 정정 정합
- **24차-D 라벨 silent drift 회수 등재 정확** — 14차 STRICT 모드 통과
- **P21/P72 multi-day BYDAY 미커버 정확** — 후속 라운드 후보 (25차-A 권장 우선순위)
- **review_card.dart truncate 미설정 정확** — 후속 sprint 후보 (25차-B 권장 우선순위)

---

## 3. 임무별 신뢰도 평가

| 임무 | 신뢰도 | 발견 | 즉시 정정 |
|---|---|---:|---:|
| 임무 1 (24차 옵션 B 정확성) | **높음** | 2 (15차-B-1, B-2 — PRODUCT_DECISIONS stale) | 2 |
| 임무 2 (1~24차 누적 무결성) | **보통** | 2 (15차-B-3, B-4 — STATUS_AND_REMAINING stale; 15차-D-5 — sandbox 환경) | 2 + 1 informational |
| 임무 3 (RRULE backward compat) | **높음** | 1 (15차-E-6 — MAX_CHILD_EVENTS=52 의미 문서화 정합) | 라벨 명시만 |
| 임무 4 (24차 미커버 영역) | **높음** | 0 (모두 정확 식별) | 25차 후보 등재 |
| 임무 5 (옵션 A/C ROI 비교) | **보통-높음** | 0 (사용자 결정 보조 의견) | 사용자 결정 대기 |

→ 6건 발견 모두 코드 결함 외 (B 산출물 stale 4건 + D 검증 sandbox 1건 + E 메타 문서화 1건). A 코드 7회 연속 0.

---

## 4. 7~15차 비교 표 (9회차 추세)

| 라운드 | 발견 | A 코드 | B 산출물 | C 도구 | D 검증 | E 메타·confab |
|---|---:|---:|---:|---:|---:|---:|
| 7차 | 8 | 2 | 12 | 1 | — | 0 |
| 8차 | 8 | 2 | 6 | 0 | — | 1 |
| 9차 | 4 | **0** | 4 | 0 | — | 2 |
| 10차 | 4 | **0** | 5 | 0 | — | 2 |
| 11차 | 3 + confab 2 | **0** | 2 | 1 | — | 4 |
| 12차 | 8 | **0** | 3 | 2 | 0 | 3 |
| 13차 | 7 | **0** | 5 | 0 | 1 | 1 |
| 14차 | 6 | **0** | 0 | 3 | 2 | 1 |
| **15차** | **6** | **0** | **4** | **0** | **1** | **1** |

**누적 외부 발견**: 14차 종료 68+ → 15차 종료 **74+ 외부 발견**.

**누적 가정/confabulation 검출**: 14차 종료 14건 → 15차 종료 **14건** (15차 자체 confab 0, 사실 기반).

### 4.1 9회차 추세 평가

- **A 코드**: 7~8차 (각 2건) → 9~15차 (7회 연속 0). 사전 확인 절차 안정화 가설 TRUE 재검증.
- **B 산출물**: 7차 12 → 8차 6 → 9~14차 (4~5 변동) → 14차 **0** → 15차 **4** (24차 sprint 후 PRODUCT_DECISIONS/STATUS_AND_REMAINING 인벤토리 갱신 누락 패턴 — sprint 종료 시 산출물 정합화 단계가 별도 필요함을 시사).
- **C 도구**: 7차 1 → 8~10차 0 → 11차 1 → 12차 2 → 13차 0 → 14차 **3** → 15차 0. 14차 도구 robustness 영역 보강 (mktemp fail-fast / regex 토큰 경계) 후 안정.
- **D 검증**: 12차 0 → 13차 1 → 14차 2 → 15차 1 (sandbox 환경 의존, 23차-A SANDBOX_BASELINE 이미 처리).
- **E 메타·confab**: 7차 0 → 11차 4 → 14차 1 → 15차 1 (감소 추세 유지).

### 4.2 본 라운드 의미

24차 sprint 가 제품 결정 영역 3건 모두 종결 (PR1 24차-A / PR2 24차-B / PR3 24차-C) — **제품 결정 영역 인벤토리 0건** 도달. 본 라운드 발견 4건 B 산출물 stale 은 sprint 종료 후 인벤토리 갱신 단계의 정합화 누락 — 코드는 정확하지만 메타 산출물 라벨이 sprint 진행 중 시점에서 멈춤. 25차 이후는 발견 무게중심이 외부 의존 mock seam 도입 영역으로 이동 권장.

---

## 5. 24차 옵션 B 검증 결과

### 5.1 24차-A (B5 옵션 C — F11-01 review 본문)

- ✅ 클라/서버/baseline 3-way 정합 정확
- ✅ 동일 화면 내 다른 maxLength 인스턴스 (report_screen.dart:341 `maxLength: 500`) 분리 의도 정확 (B5 옵션 A vs 옵션 C 짝)
- ⚠️ `review_card.dart:134-142` truncate 미설정 — 25차-B 후속 후보 (maxLines: 5 + ellipsis + "더 보기" 토글 권장)

### 5.2 24차-B (C3 옵션 B — F03-03 다중 요일 BYDAY)

- ✅ `daysOfWeek: List<String>?` Param 정합 (서버/클라)
- ✅ `parseMultiDays` MONTHLY+daysOfWeek 거부 + 잘못된 요일 코드 거부 (`INVALID_INPUT`)
- ✅ `buildRRule` multiDays.isEmpty() → 단일 요일 분기 backward compat 정확
- ✅ `calculateOccurrencesMultiDay` MAX_CHILD_EVENTS=52 + endDate + 시작 시각 이전 제외 + 안전 가드 무한 루프 차단
- ✅ `toByDayCode` DayOfWeek → BYDAY 2-letter (MO/TU/WE/TH/FR/SA/SU) 정확
- ✅ `event_recurrence.recurrence_rule varchar(500)` 7요일 BYDAY+UNTIL 충분
- ✅ ChoiceChip MONTHLY 전환 시 자동 clear 정확 (서버 검증과 일치)
- ⚠️ MAX_CHILD_EVENTS=52 의미 — "occurrence 리스트 상한", 시작 요일 BYDAY 포함 시 실제 child 51개 가능 (회귀 아님, 레거시 동일 의미). 25차-D 후속 문서화 후보.
- ⚠️ P21/P72 multi-day BYDAY mode 미커버 — 25차-A 후속 최우선 후보 (서버 신규 동작, 회귀 범위 클라/API/DB 가로지름)

### 5.3 24차-C (F09-06 SOS 영구 스펙아웃)

- ✅ 5 산출물 일관 정정 + 단위 디렉토리 4 파일 보존
- ❌ PRODUCT_DECISIONS.md line 7 "잔여 2건" stale (15차-B-1) — 즉시 정정
- ❌ PRODUCT_DECISIONS.md line 284 "3 → 2건" stale (15차-B-2) — 즉시 정정
- ❌ STATUS_AND_REMAINING.md line 175-176/195/225/244 stale (15차-B-3/B-4) — 즉시 정정

### 5.4 24차-D (라벨 변형 회수)

- ✅ check_round_sync STRICT 통과 (메타 양쪽 라벨 24차-B + 24차-D 모두 등재)
- ✅ silent drift 자동 회수 절차 정상 동작

---

## 6. 옵션 A vs 옵션 C ROI 비교 (Codex 의견 종합)

### 6.1 옵션 A — 외부 의존 mock seam 도입 (6 도메인)

**ROI**: **높음** (Codex 권장 우선순위 1)

| 도메인 | 차단 영역 | 진입 비용 | 권장 우선순위 (Codex) |
|---|---|---|---|
| S3 업로드 | event/club/date/market/profile 이미지 경로 (5+ 도메인 광범위) | 중간 (mock seam factory + 환경 변수 분기) | 1 |
| Toss WebView | 지갑/결제 UX 핵심 (F06-02 결제수단 등록) | 중간 (PgPaymentFactory 정적 → Provider 리팩터링 필요 — 11차-C 평가 기반) | 1 |
| FCM 푸시 | 알림 도메인 (P68 패턴 이미 존재 — 증분 ROI 낮음) | 낮음 (기존 패턴 재사용) | 3 |
| WebSocket 실시간 | F09-03~05 candidate/match/chat | 낮음 (P3 socket 계열 이미 존재 — 증분 ROI 낮음) | 3 |
| OAuth 소셜로그인 | 인증 도메인 (4 provider — Apple/Google/Kakao/Naver) | 높음 (provider 정책/SDK 제약) | 2 |
| 지도 (Naver Map) | F14 location/directions | 높음 (provider 정책/SDK 제약) | 2 |

**Codex 권장**: 25차 = "옵션 A 우선, **S3 또는 Toss WebView pilot 1개**". 6 도메인 동시 착수는 비용 큼.

### 6.2 옵션 C — 카테고리 A 14 mid-ROI 후속

**ROI**: **낮음-중간** (Codex 권장 우선순위 2 이하)

- 시드 결정성 cumulative drift 위험 (23차-C 인벤토리 기준 핵심 리스크)
- 9~15차 흐름상 A 코드 결함 발견 기대값 낮음 (7회 연속 0)
- 정형 외부 감사로 충분히 커버되는 영역 (12차 D-1, 14차 D-1/D-2 등 sandbox 환경 차이는 도구 robustness 영역)
- **Codex 권장**: 보조로 카테고리 A 중 **seed 강한 토글형 1개** (A8 auto-charge 또는 A12 quiet-hours) 정도가 적절

### 6.3 종합 권장

**옵션 A 우선 (1 pilot)**:
- 우선순위 1: **S3 업로드 seam** (광범위 차단 영역 — event/club/date/market/profile) 또는 **Toss WebView seam** (지갑/결제 UX 핵심)
- 우선순위 2: OAuth / 지도 (provider 정책 제약)
- 우선순위 3: FCM / WebSocket (기존 패턴 재사용으로 증분 ROI 낮음)

**병행 비추천**: 옵션 A 6 도메인 동시 착수는 비용 큼. 1 pilot 우선 + (여유 시) 카테고리 A 토글형 1개 보조.

**사용자 결정 영역**:
1. 25차 sprint 옵션 A pilot 1개 선택 (S3 vs Toss WebView)
2. 동시 진행 여부 (단일 pilot vs A8/A12 보조)
3. 옵션 C 카테고리 A 14건 처리 시점 (옵션 A pilot 종료 후 후속 vs 영구 보류)

---

## 7. 25차 후속 후보 (사용자 결정 대기)

| 후보 | 카테고리 | 우선순위 | Codex 의견 |
|---|---|---|---|
| 25차-A: P21 / P72 multi-day BYDAY mode 신설 | E2E 매트릭스 | **최우선** (Codex 권장) | 24차-B 서버 신규 동작 회귀 가드 — review_card 보다 우선. 단, 시드 라이프사이클 (template 이벤트 사전 생성 필요) 결정성 위험 검토. |
| 25차-B: review_card.dart truncate (maxLines: 5 + ellipsis + "더 보기") | UI | 중간 | 24차-A B5 옵션 C 1000자 입력 시 카드 높이 ~2배 영향. UX 후속이지만 치명도 중간 이하. |
| 25차-C: 옵션 A pilot — S3 또는 Toss WebView mock seam | 외부 의존 인프라 | **사용자 결정** | Codex 권장 옵션 A 우선. 6 도메인 중 1 pilot 시작. |
| 25차-D: MAX_CHILD_EVENTS=52 의미 문서화 (occurrence 리스트 vs child 수) | 문서화 | 낮음 | 회귀 아님, 라벨 정확화만. units/03_event/F03-03 backend.md 보강 후보. |
| 25차-E: PRODUCT_DECISIONS.md "결정 결과" 절 갱신 (3 결정 모두 종결 후 본문 재정리) | 산출물 정리 | 낮음 | 본 라운드 즉시 정정으로 line 7 + 284 정합화. 본문 전체 재정리는 별도 라운드. |

---

## 8. 자체 점검 (메타-감사)

본 라운드 보고서 작성 시 인용한 file:line / 통계 / 사실 모두 직접 명령 또는 Read 도구로 확인. 추측 인용 없음.

- ✅ `audit_input_stats.sh --prompt` 출력 markdown 714 / traces 393 / P64-73 modes / 222 단위 테스트 / 85 seed
- ✅ `audit_prompt_guard.sh` 2회 실전 (1차 NG markdown 715 → 정정 → 2차 OK)
- ✅ `run_round_audit.sh` 8/8 PASS exit 0 (라운드 시작 + 정정 후 모두 동일)
- ✅ `check_round_sync.sh` 기본 + STRICT 모두 OK 21 / NG 0
- ✅ `RecurringEventCreateParam.java:19` daysOfWeek 필드 / `RecurringEventCreateService.java` 헬퍼 3개 직접 확인
- ✅ `review_write_screen.dart:290` maxLength: 1000 직접 확인
- ✅ `ReviewParam.java:10` `@Size(max = 1000)` 직접 확인
- ✅ `maxlength_baseline.txt:48` F11-01 client 1000 정합 확인
- ✅ Codex 호출 응답에서 file:line 인용 모두 직접 재확인 (PRODUCT_DECISIONS.md:7, :284 / STATUS_AND_REMAINING.md:175, :176 / IMPROVEMENT_PLAN.md:278, :280)

**A 코드 7회 연속 0 가설**: **TRUE** — 본 라운드 발견 6건 모두 B 산출물 / D 검증 / E 메타 영역. 코드 결함 0.

**15차 핵심 발견**:
- 15차-B-1 ~ B-4 (B 산출물): 24차 sprint 후 PRODUCT_DECISIONS / STATUS_AND_REMAINING 인벤토리 갱신 누락 패턴 — 4건 즉시 정정. sprint 종료 시 산출물 정합화 단계가 별도 필요함을 시사.
- 15차-E-6 (E 메타): MAX_CHILD_EVENTS=52 의미 문서화 정합 — 25차-D 후속.

**옵션 A vs 옵션 C 결론**: **옵션 A 우선 (1 pilot)** — Codex 권장 S3 또는 Toss WebView. 옵션 C 는 보조 1개 토글형 정도.

---

## 9. 누적 자동화 인프라 (15차 종료 시점)

- **검증 도구 7종**: check_format / check_enum_sync / check_traces / check_field_size_sync / check_meta_sync / check_prompt_stale / check_round_sync
- **정보 추출 1종**: audit_input_stats.sh
- **운영 가드 wrapper 2종**: audit_prompt_guard.sh (19차-A) + run_round_audit.sh (22차-C)
- **baseline 명세 1종**: SANDBOX_BASELINE.md (23차-A)
- **총 10 도구 + 1 baseline 명세** (14차 시점 동일, 본 라운드 도구 추가 0)
