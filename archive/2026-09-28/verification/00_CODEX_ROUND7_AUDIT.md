# Codex 7차 라운드 감사 보고서 (7~10차 누적 외부 감사)

> 본 라운드는 9차-C 에서 표준화된 다중 모델 교차 검증 워크플로 (`verification/CROSS_MODEL_VERIFICATION_WORKFLOW.md`) 의 첫 적용 사례이다. 7~10 라운드 자체 보강 누적 작업 (외부 감사 미실시 영역) 에 대해 5 임무 분리 패턴으로 의뢰했다.

## 호출 시점 및 컨텍스트

- **시점**: 11차-B 라운드 종료 직후 (B5 옵션 A 적용 완료 시점)
- **누적 자체 보강 범위**:
  - 7차: F09-06 SOS 의도적 미운영 정합성 (사용자 지시)
  - 8차: B.1 시드 보강 / B.3 F10 cleanup·ruleId·delete_recurring / B.4 F14 update silent / C.1·C.2 마스터 문서
  - 9차-A: traces 252 마커 (단위 04/05/07/08/09/10/12/13) → 누적 393
  - 9차-B: F05-02 자동완성 E2E (P66) — 4 modes, 이중 디바운스 패턴 정립
  - 9차-C: 다중 모델 교차 검증 워크플로 표준화
  - 10차-A: `check_traces.sh` (187줄) — file:line 자동 검증
  - 10차-B: F12 알림 mutation E2E (P67) — 4 modes
  - 10차-C: `PRODUCT_DECISIONS.md` (253줄) — F11-04 진짜 버그 식별
  - 11차-A: P68 FCM 권한·토큰 E2E (Riverpod Provider seam mock)
  - 11차-B: B5 옵션 A 적용 (F11-04 클라 1000→500)

## 임무 정의 (5종 동시 의뢰)

1. 산출물 정합성 (check_format/check_traces 실행 + 9차-A traces sample + P67 modes 일치 + markdown 카운트)
2. 코드 변경 정확성 (10차-C F11-04 / 8차 B.4 / 8차 B.3)
3. 도구 정합성 (9차-B 디바운스 / 10차-A check_traces.sh / 9차-A traces 가짜 OK 가능성)
4. 산출물 일관성 (705 산수 / STATUS·IMPROVEMENT·CHECKLIST 갱신 / 라인 카운트)
5. 거짓 진술 / 가정 오류 (7~10 보고에서 동일 함정 / F14 host gate / 엔드포인트 브리프 / F11-04 1줄 충분성)

## Codex 응답 분류

### A. 코드 (Code) — 실 코드 결함 또는 잠재 race
| ID | 위치 | 발견 | 즉시 수정 | 분류 |
|---|---|---|---|---|
| A1 | `community_app/lib/presentation/review/screens/report_screen.dart:110` | `_handleError` 가 모든 `badRequest` 를 "본인을 신고할 수 없습니다" 로 고정 토스트 — 서버 maxLength 초과 등 다른 400 메시지 잠식 | ✅ 12차-A1 적용 (errorCode 스위치 `INVALID_INPUT` / `REPORT_INVALID_TARGET` / default→server message) | UX 해결 |
| A2 | `community_app/lib/domain/providers/search/search_suggest_provider.dart:30~` | `SearchSuggestNotifier._fetchSuggestions(query)` 가 결과를 그대로 state 덮어씀 — 늦게 끝난 이전 fetch 가 새 query 결과를 덮을 수 있는 race | ✅ 12차-A2 적용 (`_requestSeq` 카운터 도입 — `_fetchSuggestions` 진입 시 `++_requestSeq`, 응답 처리 직전 `if (mySeq != _requestSeq) return`. `clear()` 와 `length<2` 가드도 sequence 증가). P66 `stale_response_race` mode 회귀 가드 추가 | race 해결 |

### B. 산출물 (Markdown) — 문서/통계/상태 갱신 오류
| ID | 위치 | 발견 | 즉시 수정 |
|---|---|---|---|
| B1 | `business_logic/00_README.md:11` `business_logic/STATUS_AND_REMAINING.md:18` | "705 markdown" 산수 오류 (실제 703 = 8차 700 + 9차-C 2 + 10차-C 1) | ✅ 703 으로 정정 + "검증/spec/로그/PRD 218 → 221" 갱신 |
| B2 | `STATUS_AND_REMAINING.md` 머리말 | 8차 종료 기준에 멈춤 — 9차/10차/11차 누적 미반영 | ✅ 7~11 누적 반영 + 1.1 표 갱신 (총 703 / 마스터 7개 / 검증 39+9차-C 2개) |
| B3 | `STATUS_AND_REMAINING.md` 1.6 Codex 감사 표 | 7차 (자체 보강) 항목 누락, 8차 B.4 진행 중 표기 잔존 | ✅ 7~11 누적 행 + Codex ROUND7 행 추가 |
| B4 | `IMPROVEMENT_PLAN.md:72` (B5) | B5 🟡 보류로 표기 — 11차-B 옵션 A 적용 후 ✅ 미갱신 | ✅ B5 → ✅ 옵션 A 적용 완료 (file:line 인용 포함) |
| B5 | `IMPROVEMENT_PLAN.md:143` (D2.5) | F12 알림 mutation 🟡 보류 표기 — 10차-B P67 + 11차-A P68 미반영 | ✅ ✅ 10차-B P67 + 11차-A P68 으로 갱신 |
| B6 | `IMPROVEMENT_PLAN.md:151` (D3.11) | F05-02 자동완성 🟡 보류 표기 — 9차-B P66 미반영 | ✅ ✅ 9차-B P66 + 디바운스 패턴 인용으로 갱신 |
| B7 | `IMPROVEMENT_PLAN.md:161` (E1) `IMPROVEMENT_PLAN.md:180` (E4) | E1 🔄 / E4 🔄 — 9차-C / 9차-A 미반영 | ✅ E1 ✅ + 9차-C 워크플로 인용, E4 ✅ + 9차-A traces + 10차-A 도구 인용 |
| B8 | `IMPROVEMENT_PLAN.md` 우선순위 매트릭스 | "8차 종료 시점" / 26 액션 산수 미갱신 | ✅ 11차 종료 시점 + ✅23 / 🟡3 으로 정정 |
| B9 | `CHECKLIST.md:98` 헤더 "7-9 라운드" | 10차/11차 작업 미반영 | ✅ "7-11 라운드" 로 갱신 + 9차-A/B/C / 10차-A/B/C / 11차-A/B / Codex ROUND7 행 추가 |
| B10 | `CHECKLIST.md:82` Step 2 합계 행 | 8차 종료 700 표기 잔존 | ✅ 10차 종료 703 으로 갱신 |
| B11 | `business_logic/verification/CROSS_MODEL_VERIFICATION_WORKFLOW.md` (실제 233줄) `00_ROUND9_META_REVIEW.md` (실제 113줄) `PRODUCT_DECISIONS.md` (실제 253줄) | 사용자 의뢰서의 라인 카운트 (232/113/248) 와 실제 (233/113/253) 차이 | — (의뢰서 메모 — 본 보고서 라인 카운트 정확히 명시) |
| B12 | `community_app/integration_test/seed_calendar_availability_mutation_test.dart:685` | 주석 "daysOfWeek set 을 정확히 비교" 주장 vs 구현(line 707) "모든 recurrenceRuleId 셋 트래킹" 불일치 | ✅ 주석을 구현 동작 (alice 잔여 규칙 모두 정리) 으로 명확화 |

### C. 도구 (Scripts) — 자동화 검증 도구 결함
| ID | 위치 | 발견 | 즉시 수정 |
|---|---|---|---|
| C1 | `business_logic/verification/check_traces.sh:160-162` | `done <<EOF\n$ALL_MARKERS\nEOF` here-doc 패턴이 read-only 임시디렉터리 환경에서 실패 → `PROCESSED=0`/`OK=0` 으로 끝나도 `NG_COUNT=0` 이라 exit 0. False-positive | ✅ 마지막에 `PROCESSED != TOTAL_MARKERS` (LIMIT=0 일 때) 또는 `PROCESSED == 0` 이면 FATAL exit 1 guard 추가 |

### D. 형식 (Format) — 신규 발견 없음
- `check_format.sh` exit 0 (validation pass)

### E. 메타 (Meta) — 향후 라운드 영역
- A1 / A2 모두 12차에서 후속 적용 완료 (A1 → 12차-A1, A2 → 12차-A2)

## 즉시 수정 적용 결과

총 **즉시 수정 가능 항목 8건** (B1/B2/B3/B4~B8/B9/B10/B12) + **도구 1건** (C1) + **메타 잔존 2건** (A1/A2 — 12차에서 후속 적용 완료)

### 적용된 파일
- `business_logic/00_README.md` — 산수 705→703, 검증 218→221 갱신
- `business_logic/STATUS_AND_REMAINING.md` — 머리말 7~11 라운드 / 1.1 통계 / 1.6 Codex 감사 표 갱신
- `business_logic/IMPROVEMENT_PLAN.md` — B5/D2.5/D3.11/E1/E4 ✅ 갱신 + 우선순위 매트릭스 (11차 종료 시점, 26 액션 ✅23 / 🟡3)
- `business_logic/CHECKLIST.md` — Step 2 합계 / 진행 단계 표 (9차-A/B/C / 10차-A/B/C / 11차-A/B / Codex ROUND7) / 헤더 7-11 라운드
- `business_logic/verification/check_traces.sh:185` — here-doc false-positive guard 추가 (`PROCESSED != TOTAL_MARKERS` → FATAL exit 1)
- `community_app/integration_test/seed_calendar_availability_mutation_test.dart:685` — `_markRecentRulesForCleanup` 주석 정정 (cleanup 안전성 의도 명시)

## 재검증 결과

| 도구 | 결과 |
|---|---|
| `bash business_logic/verification/check_format.sh` | exit 0 — OK (위반 없음) |
| `bash business_logic/verification/check_traces.sh` | exit 0 — 393/393 OK |
| `STRICT=1 bash business_logic/verification/check_traces.sh` | exit 0 — 393/393 OK |
| `find business_logic -name "*.md" \| wc -l` | **703** (보고된 705 정정) |

## 누적 통계 (Codex 외부 감사 1~7차)

| 라운드 | 발견 | 적용 | 비고 |
|---|---|---|---|
| 1차 (검증) | 4건 | ✅ | 거짓 진술 + 라벨 오류 |
| 2차 (E2E) | 8건 | ✅ | 통계/표현/파일명 |
| 3차 (잔여) | 6건 | ✅ | build_runner 부작용 + P19 인덱스 |
| 4차 (스크립트) | enum 7 진짜 / 38 FP 분류 | ✅ | check_enum_sync.sh 화이트리스트 |
| 5차 | — | — | 통합 검증만 |
| 6차 (D 카테고리) | 4건 | ✅ | F14 host gate / F10 mode / nickname / 26 형식 |
| 7차 (7~10 누적) | **8건** | ✅ 6 + 메타 잔존 2 | 본 라운드 — 산수/stale/here-doc/race/comment |
| **누적 외부 발견** | **30건+** | **거의 모두 적용** | |

## 신뢰도 평가 (Codex 종합)

- **종합 신뢰도**: 높음
- **Claude 가 놓친 추가 발견**: 8건 (B1~B12 중 즉시 수정 6 + 메타 잔존 2)
- **부작용**: 2건 (`check_traces.sh` here-doc ✅ C1 적용 / `SearchSuggestNotifier` stale race ✅ 12차-A2 적용)
- **핵심 판정**: 실제 코드 수정(F11-04/F14/F10)은 정확. 메타 문서가 9~10차 결과를 따라오지 못한 점이 가장 큰 stale 영역. 7차 외부 감사가 본 워크플로 (9차-C 정형화) 의 첫 적용 사례 — ROI 명확.

## 워크플로 적용 평가 (E1 검증)

본 라운드는 9차-C 의 표준 워크플로 (`CROSS_MODEL_VERIFICATION_WORKFLOW.md`) 의 첫 실 적용:

- ✅ §3.1 임무 분리 (5 임무 동시 의뢰)
- ✅ §3.2 호출 양식 — "실제 파일만 본다" 명시 + 검증 명령 강제 + ✅/❌/⚠️ 형식
- ✅ §3.2 신뢰도 등급 + 즉시 수정 권장 표기
- ✅ §4.1 표준 사이클 — 결과 보고서 저장 → 분류 → 즉시 수정 → 재검증 → 마스터 갱신
- ✅ §6 라운드 종료 체크리스트 — check_format 0 / check_traces 393/393 / find 703

워크플로 자체의 ROI 검증 완료. 향후 라운드에서도 본 형식 유지.

## 후속 라운드 후보 (12차 영역)

- A1: `report_screen.dart` `_handleError` 의 `badRequest` 분기를 서버 `message`/`errorCode` 기반으로 분리 (10차-C `PRODUCT_DECISIONS.md:54` S5 issue 도 해결) → ✅ 12차-A1 적용 (`report_screen.dart:110~140` errorCode 스위치: `INVALID_INPUT` / `REPORT_INVALID_TARGET` / default)
- A2: `SearchSuggestNotifier` 에 request sequence/latest query guard 추가 (race 제거) → ✅ 12차-A2 적용 (`search_suggest_provider.dart:11~` `_requestSeq` 카운터, fetch/clear/length<2 가드 시점에 sequence 증가, 응답 처리 직전 `mySeq != _requestSeq` 차단). P66 matrix `stale_response_race` mode 추가로 회귀 가드
- 외부 의존 잔여: D1.1 PG WebView (Toss mock) / D2.8 가상계좌 webhook / D3.10 Toss billing
- C3 RRULE 표준 도입 (제품팀 결정 대기 — `PRODUCT_DECISIONS.md` C3 옵션 B 권장)
