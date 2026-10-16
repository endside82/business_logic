# 9차 라운드 — 메타 리뷰 (E1 다중 모델 교차 검증 표준화)

7~8 라운드 동안 누적된 "Claude 작성 + 외부 감사 모델 검증" 패턴이 22+ 외부 발견을 도출했지만, 호출 시점/형식/정정 절차가 정형화되지 않아 신규 라운드마다 재발견되는 비효율이 있었다. 9차 라운드는 이 워크플로를 표준 문서로 정형화하는 메타 개선 라운드 (IMPROVEMENT_PLAN E1).

> **본 라운드의 산출물**: 본 메타 리뷰 + [`CROSS_MODEL_VERIFICATION_WORKFLOW.md`](../../../verification/CROSS_MODEL_VERIFICATION_WORKFLOW.md) + SPEC_TEMPLATE.md 보강.

## 1. 7~8 라운드 외부 발견 22+ 분류

### 1.1 발견 유형 × 라운드 분포

| 유형 | 1차 (검증) | 2차 (E2E) | 3차 (잔여) | 4차 (enum) | 6차 (D 카테고리) | 합계 |
|---|---:|---:|---:|---:|---:|---:|
| **거짓 진술** ("수정 완료" 표기 vs 실제 미수정) | 2 | 1 | 0 | 0 | 0 | **3** |
| **라벨/지목 오류** (잘못된 단위 번호, 잘못된 파일 지목) | 3 | 1 | 0 | 0 | 0 | **4** |
| **환영 파일명** (존재하지 않는 파일 인용) | 0 | 3 | 0 | 0 | 0 | **3** |
| **Build_runner 부작용** (`.g.dart`/`.freezed.dart` stale) | 0 | 0 | 2 | 0 | 0 | **2** |
| **가정 오류** (host bypass / mode 의미 오해 / 회귀 가드 단정) | 0 | 1 | 0 | 0 | 2 | **3** |
| **형식 위반** (E2E 5필드 미준수, 4-file 누락) | 0 | 1 | 0 | 0 | 1 | **2 묶음** (4 + 26 섹션) |
| **통계 오류** (test/script 카운트 ±1) | 0 | 2 | 0 | 0 | 0 | **2** |
| **문서 결론 vs 과거 판정 충돌** (archival 처리 미흡) | 0 | 0 | 1 | 0 | 0 | **1** |
| **도구 false positive** (자체 작성 스크립트의 FP/실 버그 분류) | 0 | 0 | 0 | 1 (38 FP) | 0 | **1** (38 FP / 7 진짜) |
| **API 시그니처 가정 오류** (host gate / nickname maxLength) | 0 | 0 | 0 | 0 | 2 | **2** |
| **합계** | **5** | **9** | **3** | **1** (45건 분류) | **5** | **22+** |

### 1.2 카테고리 × 정정 방식

| 카테고리 | 발견 | 정정 방식 | 재검증 도구 |
|---|---:|---|---|
| A. 코드 버그 (Flutter) | 11 (B1~B9 + 진짜 7 중 일부) | Edit + build_runner + flutter analyze | `flutter analyze` |
| B. 산출물 (markdown) | 9 (라벨 / 지목 / 환영 파일명 / 거짓 진술) | Edit + grep | `bash check_format.sh` |
| C. 도구 (스크립트) | 1 (45건 FP/진짜 분류) | 화이트리스트 5 카테고리 | 스크립트 직접 실행 + 의도적 위반 corpus |
| D. 형식 (E2E-derived 등) | 2 묶음 (4 + 26 섹션) | 5필드 정렬 또는 "보강 메모" 헤더 | `bash check_format.sh` |
| E. 메타 (워크플로) | 본 라운드 자체 | 본 워크플로 문서 신설 | 사용자 검토 |

## 2. 라운드별 핵심 교훈

### 2.1 1차 라운드 (검증 단계 직후 외부 감사)
- **교훈**: Claude 의 자체 verifier 가 자기 산출물 변경 사실을 정확히 추적하지 못한다.
- **사례**: F03-12 CANCELLED 잔여를 "수정 완료"로 거짓 보고 + Unit 12 파일 지목 오류 (00_overview 가 진짜 오류 위치인데 F12-05 로 지목).
- **반영**: 본 워크플로 §4.2 거짓 진술 방지 룰 ("수정 완료" 표기 직전 grep 검증).

### 2.2 2차 라운드 (E2E 추적 직후 외부 감사)
- **교훈**: 통계 ±1 부정확 + 환영 파일명 + 분류 표현 오해 소지가 동시 발생.
- **사례**: 73→74 / 66→65 / 존재하지 않는 3개 파일명 / Unit 11 +29 표현 오해.
- **반영**: 본 워크플로 §6 라운드 종료 체크리스트 (`find ... | wc -l` 통계 재계산).

### 2.3 3차 라운드 (코드 수정 직후 외부 감사)
- **교훈**: Freezed/Retrofit 원본만 수정하면 `.g.dart` `.freezed.dart` 재생성이 빠져 analyze 가 깨진다.
- **사례**: B1 calendar_event_vo (int → String?), B8 dead code 제거 후 stale `.g.dart`.
- **반영**: 본 워크플로 §5 A 카테고리 정정 가이드 (Freezed/Retrofit 수정 후 build_runner 필수).

### 2.4 4차 라운드 (자동화 도구 작성 후 외부 감사)
- **교훈**: 자체 작성 도구가 출력하는 위반 목록은 Claude 자신이 분류하면 보수적으로 모두 진짜 버그로 처리하기 쉽다. 외부 감사로 FP 분리 필요.
- **사례**: check_enum_sync.sh 45건 → 7 진짜 / 38 FP. WAITLIST/WAITLISTED 같은 토큰은 위치별 컨텍스트 다름 (ClubJoinResultType vs AttendanceStatus).
- **반영**: 본 워크플로 §5 C 카테고리 정정 가이드 (5 카테고리 화이트리스트 분리).

### 2.5 6차 라운드 (D 카테고리 신규 E2E 직후 외부 감사)
- **교훈**: 신규 매트릭스 작성 시 서버 시그니처 가정이 잘못되거나 mode 의미가 실제 호출 동작과 어긋난다.
- **사례**: F14 host gate 가정 오류 (LocationService.updateLocation 은 host 도 시간 게이트 통과 필요), F10 delete_recurring_scope 가 surface 검증만 함.
- **반영**: 본 워크플로 §7.5/7.6 알려진 함정.

## 3. 9차 라운드 표준화 결과

### 3.1 신규 산출물

#### 3.1.1 [`CROSS_MODEL_VERIFICATION_WORKFLOW.md`](../../../verification/CROSS_MODEL_VERIFICATION_WORKFLOW.md)
표준 워크플로 정의서. 9개 절:
1. 목적과 ROI (22+ 외부 발견 통계 인용)
2. 호출 트리거 (T1~T5, 라운드별 사례 매핑)
3. 호출 형식 (임무 분리 패턴, 검증된 양식, 본 프로젝트 도구)
4. 응답 처리 사이클 (발견→정정→재검증, 거짓 진술 방지 룰)
5. 유형별 정정 가이드 (A 코드 / B 산출물 / C 도구 / D 형식 / E 메타)
6. 라운드 종료 체크리스트
7. 알려진 함정 9건 (1~6 라운드 사례 인용)
8. 본 워크플로의 한계
9. 관련 문서

#### 3.1.2 본 메타 리뷰 (00_ROUND9_META_REVIEW.md)
22+ 발견 유형별 분류 표 + 라운드별 교훈 + 9차 표준화 결과.

### 3.2 기존 산출물 갱신

#### 3.2.1 `SPEC_TEMPLATE.md`

과거 원문의 보관 위치는 [2026-09-28 문서 정리](../../../../docs/development/DOCUMENTATION_GUIDE.md#2026-09-28-문서-정리)를 참고한다.
"## 다중 모델 교차 검증 (Codex)" 절 신설. 산출물 작성 후 호출 권장 시점 / 형식 / 정정 절차의 짧은 요약 + CROSS_MODEL_VERIFICATION_WORKFLOW.md 링크.

#### 3.2.2 [`../00_README.md`](../../../00_README.md)
"검증" 섹션에 본 워크플로 문서 링크 1줄 추가.

#### 3.2.3 `../CHECKLIST.md`

과거 원문의 보관 위치는 [2026-09-28 문서 정리](../../../../docs/development/DOCUMENTATION_GUIDE.md#2026-09-28-문서-정리)를 참고한다.
"7-8 라운드 작업 분류" 표에 9차-C "교차 검증 워크플로 표준화" 행 ✅ 마킹.

## 4. 본 라운드 검증

- `bash business_logic/verification/check_format.sh` — exit 0 (신규 verification/ 하위 문서는 4-file 검사 대상이 아님).
- 신규 산출물 2건은 verification/ 하위에 위치 → check_format.sh 가 검사하는 `units/<NN>_<unit>/F<NN>-<MM>_<slug>/` 4-file 구조와 무관.
- E2E-derived 5필드 검사는 `units/**/scenarios.md` 한정이라 본 라운드 산출물에 영향 없음.

## 5. 9차 라운드 이후 권장

본 워크플로 문서가 정형화되었으므로, 다음 라운드부터 다음을 강제한다:
1. 신규 작업 (산출물/코드/도구) 시 §2 호출 트리거 표를 먼저 확인하고 외부 감사 호출 여부를 결정.
2. 외부 감사 결과는 항상 `verification/00_CODEX_<라운드>_AUDIT.md` 로 보존.
3. 라운드 종료 시 §6 체크리스트 전체 통과를 확인.
4. 자체 보고에 "수정 완료" 를 쓰기 전에 §4.2 거짓 진술 방지 룰 적용.

## 6. 미해결 메타 항목

본 라운드는 E1 (다중 모델 교차 검증 표준화) 만 다룬다. IMPROVEMENT_PLAN 의 잔여 메타 항목:
- **E4 traces 마커 117 backend.md 전수 적용** — 점진적/자동화 작업 필요. 본 라운드 범위 외.

## 7. 한 줄 요약

9차 라운드 메타 개선 완료: 7~8 라운드 22+ 외부 발견을 10 유형 × 5 카테고리로 정형화 + CROSS_MODEL_VERIFICATION_WORKFLOW.md 신설 + SPEC_TEMPLATE/README/CHECKLIST 인덱스 갱신 / check_format.sh exit 0 유지 / E1 ✅
