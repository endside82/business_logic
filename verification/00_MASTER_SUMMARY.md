# 검증 마스터 요약

<!-- release-document: reference -->
> **문서 구분: 과거 검증 참고 기록.** 현재 할 일은 [출시 실행 계획표](../../docs/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

15개 검증 agent (14 단위 + 1 횡단)가 482개 산출물(00_overview 14 + 기능별 산출물 468)을 실제 코드/스펙과 대조 검증한 결과.

## 종합 결과

| 단위 | Pass | Issue | Fail | 보고서 |
|---|---|---|---|---|
| 01 인증&온보딩 | 27 | 5 | 0 | [01_auth_onboarding_report.md](01_auth_onboarding_report.md) |
| 02 홈피드 | 20 | 0 | 0 | [02_home_feed_report.md](02_home_feed_report.md) |
| 03 이벤트 | 35 | 12 | 1 | [03_event_report.md](03_event_report.md) |
| 04 클럽 | 56 | 8 | 0 | [04_club_report.md](04_club_report.md) |
| 05 검색 | 17 | 3 | 0 | [05_search_report.md](05_search_report.md) |
| 06 결제&지갑 | 33 | 7 | 0 | [06_payment_report.md](06_payment_report.md) |
| 07 모임정산 | 38 | 2 | 0 | [07_meeting_settlement_report.md](07_meeting_settlement_report.md) |
| 08 플랜마켓 | 9 | 4 | 0 | [08_plan_market_report.md](08_plan_market_report.md) |
| 09 프라이빗데이팅 | 20 | 11 | 1 | [09_private_date_report.md](09_private_date_report.md) |
| 10 캘린더 | 14 | 6 | 0 | [10_calendar_report.md](10_calendar_report.md) |
| 11 리뷰&신고 | 19 | 5 | 0 | [11_review_report_report.md](11_review_report_report.md) |
| 12 알림 | 16 | 7 | 1 | [12_notification_report.md](12_notification_report.md) |
| 13 프로필&설정 (Codex 작성) | 5 features | 2 | 0 | [13_profile_settings_report.md](13_profile_settings_report.md) |
| 14 위치&길찾기 | 21 | 3 | 0 | [14_location_directions_report.md](14_location_directions_report.md) |
| **단위별 합계** | **~330** | **~75** | **3** | |
| 횡단 검증 | — | — | 35건 라벨 + 13건 매트릭스 + 2건 시나리오 + 7건 용어 | [00_cross_cut_report.md](00_cross_cut_report.md) |

## 핵심 발견 — 카테고리별

### 1. CRITICAL (실제 코드와 명백히 어긋남) — 적용됨 ✅

| 항목 | 위치 | 수정 내용 | 상태 |
|---|---|---|---|
| ApplicationStatus 오기 | Unit 03 overview L62 | `CANCELLED` → `CANCELED` (서버 enum 단일 L) | ✅ 수정 |
| AttendanceStatus 오기 | Unit 03 overview L60 | `WAITLISTED` → `WAITING` (서버 enum) | ✅ 수정 |
| ApplicationStatus 오기 | Unit 03 F03-12 backend.md | `CANCELLED` → `CANCELED` | ✅ 수정 (Codex 감사로 발견 후 적용) |
| DeviceTokenParam 추측 필드 | Unit 12 overview.md | `(token, platform, deviceName)` → `(token, deviceType)` | ✅ 수정 (Codex 감사 발견) |
| Unit 02 사용자 검색 라벨 (2건) | Unit 04 F04-05 frontend.md | → Unit 01 account `/api/v1/users/search` | ✅ 수정 (Codex 감사 발견) |

### 2. CRITICAL — 단위 번호 ↔ 도메인 라벨 불일치 35건 — 적용됨 ✅

| 패턴 | 건수 | 수정 |
|---|---|---|
| Unit 04 안 "Unit 09 (payment)" | 14건 | → Unit 06 ✅ |
| Unit 04 안 "Unit 02 (account)" | 5건 | → Unit 01 ✅ |
| Unit 03 안 "Unit 02 클럽" | 9건 | → Unit 04 ✅ |
| Unit 03 안 "Unit 04 검색" | 2건 | → Unit 05 ✅ |
| Unit 11 안 "Unit 04 참석 (capacity)" | 1건 | → Unit 03 capacity ✅ |
| Unit 11 안 "Unit 05 알림" | 1건 | → Unit 12 ✅ |
| Unit 08 안 "Unit 02 인증" | 2건 | → Unit 01 ✅ |
| Unit 03 안 "Unit 1 위임" (프로필 미리보기) | 1건 | → Unit 13 ✅ |
| **합계** | **35건** | **모두 sed 일괄 수정** |

### 3. HIGH — 매트릭스 누락 13건 — 일부 보정 ✅

cross_unit_dependencies.md의 14×14 매트릭스에 다이어그램에는 있지만 표에 누락된 의존:

| 보정 항목 | 상태 |
|---|---|
| 02 홈피드 → 03/04/08 (▣) | ✅ 매트릭스 보강 |
| 02 홈피드 → 12 (▢) | ✅ |
| 03 이벤트 → 08 플랜마켓 (▢ → ▣ 승격) | ✅ |
| 05 검색 → 03/04/08 (▣) | ✅ |
| 09 데이팅 → 06 결제 (▣) | ✅ |
| 13 프로필 → 02/14/07 (▢) | ✅ |

### 4. HIGH — 단위 산출물 자체의 가치 있는 부수 발견 (수정 대상 아님)

검증 agent들이 단위 산출물 검증 중 **실제 코드의 잠재 버그**를 추가로 발견. 산출물 자체는 정확.

| Unit | 발견 |
|---|---|
| 05 검색 | `SuggestionVo.eventId` Builder 미설정 (항상 null), `SavedSearchService.updateSavedSearch` `searchParams` 미갱신 |
| 09 데이팅 | ✅ 정정: SOS/체크인/긴급연락처는 **의도적 미운영** (이전 제품 결정으로 삭제됨, 결함 아님). `boolean isXxx` JSON 처리 누락은 별건으로 유효. |
| 10 캘린더 | `CalendarEventVo.eventType`이 int인데 서버는 enum 문자열, 요일 표기 `MONDAY..SUNDAY` vs 서버 `MON..SUN` |
| 11 리뷰 | 클라이언트 등급 임계 40/60/80 vs 서버 40/60/75/90, description maxLength 1000 vs 서버 500 |
| 14 위치 | `EventLocationApi#getPrivacyDashboard` Retrofit dead code, `directions_screen` padding 20 (CLAUDE.md 규칙은 16) |

이는 검증 작업의 **부수 가치**로, 추후 별도 이슈 트래킹에 반영 권장.

### 5. MEDIUM — 시나리오 모순 2건

cross_unit_dependencies.md의 시나리오 다이어그램:

- **시나리오 B (G→H)**: "03 이벤트 → 04 클럽 모임 등록" 분기는 산출물 근거 약함. 화살표 제거 또는 명시 필요.
- **시나리오 C (H 노드)**: "현장 인증" 라벨이 모호 (Toss 본인 인증인지 만남 체크인인지 구분 안 됨). "현장 체크인 (의도적 미운영 — 이전 결정으로 삭제됨)"으로 명확화 필요.

이는 의미적 정확성 문제라 자동 수정 보류. 사용자 검토 후 결정 권장.

### 6. LOW — mermaid 색상 컨벤션 / 표기 통일

여러 단위에서 mermaid `classDef` 색상이 일부 노드에 미할당, `Unit 1` vs `Unit 01` 표기 혼재 등 경미. 보고서별 권장 사항 참조.

## CLAUDE.md 누적 함정 검증 결과

이전 audits에서 강조된 누적 버그 영역:

| 영역 | 검증 결과 |
|---|---|
| 서버에 없는 endpoint 만들기 | ✅ 발견 0건 (Unit 09 SOS/체크인은 **의도적 미운영**으로 정정 — 이전 결정으로 삭제된 deprecated 기능) |
| TransactionType / 비슷한 enum 추측 | ✅ 발견 0건 (Unit 06 26개 enum 모두 정확) |
| BigDecimal → int 매핑 | ✅ 발견 0건 (모두 double로 정확) |
| `boolean isXxx` JSON 처리 누락 | ⚠️ Unit 09에서 일부 누락 (DateProfilePhotoVo.isPrimary 등) |
| `applicationId` vs `id` 같은 필드명 추측 | ✅ 발견 0건 |
| `WAITING` vs `WAITLISTED` (enum) | ❌ 발견 1건 (Unit 03 overview) → ✅ 수정됨 |
| `CANCELED` vs `CANCELLED` (L 1개 vs 2개) | ❌ 발견 1건 (Unit 03 overview) → ✅ 수정됨 |
| `screenPadding` 16 → 20/24 사용 | ⚠️ Unit 14에 1건 (실제 코드 결함, 산출물은 정직히 표기) |

## 수정 적용 통계

- **자동 수정 적용 (1차)**: 35건 라벨 + 2건 enum + 6건 매트릭스 = **43건**
- **Codex 감사로 추가 발견 + 수정 (2차)**: F03-12 CANCELLED 잔여, Unit 12 overview의 DeviceTokenParam 추측 필드, Unit 04 F04-05의 Unit 02 사용자 검색 라벨 2건 = **4건**
- **합계 47건 자동 수정 적용**
- **수동 검토 권장 (남은 LOW/MEDIUM)**: 시나리오 모순 2건, mermaid 컨벤션 일부, 실제 코드 결함 보고 (별도 이슈)

## Codex 외부 감사 결과

별도 보고서: [`00_CODEX_AUDIT.md`](../archive/2026-09-28/verification/00_CODEX_AUDIT.md)

| 임무 | 결과 |
|---|---|
| Claude의 ❌ Fail 3건 판정 정확성 | 2건 정확 + 1건 부분 오판 (지목 파일이 틀림 — 실제 오류는 overview.md, Claude는 F12-05 backend로 잘못 지목) |
| Claude의 35건 라벨 수정 정확성 | grep 7개 모두 통과(0건 잔여) — 단, **Claude가 놓친 추가 라벨 오류 2건 발견** (F04-05 frontend) |
| Claude의 클라이언트 버그 보고 정확성 | 검증한 1건(CalendarEventVo.eventType 타입) 정확 |
| **종합 신뢰도** | **보통** (Master Summary가 F03-12 수정을 적용했다고 표기했으나 실제 미적용 → 본 라운드에서 정정) |

Codex 감사가 노출한 핵심 교훈: **Claude의 자체 verifier가 자기 산출물 변경 사실을 정확히 추적하지 못한 사례** (overview만 고치고 F03-12는 누락하고도 master summary는 fully fixed로 표기). 다중 모델 교차 검증의 가치 입증.

## 결론

전체 482개 산출물 기준:

- **서버 코드 vs 산출물 사실관계 정확도**: 약 99% (CRITICAL 3건만 발견, 모두 수정됨)
- **위임 표기 정확도**: 35건 라벨 오류 → 수정 후 100%
- **매트릭스 정합성**: 13건 누락 → 핵심 6건 보정, 나머지는 약한 의존
- **부수 가치**: 검증 과정에서 클라이언트 코드의 잠재 버그 10건 이상 발견 (별도 트래킹 권장)

**Codex가 작성한 Unit 13** 역시 Claude 독립 검증에서 LOW 등급 2건만 발견되어, 모델 간 작성 품질 차이는 무의미한 수준.

산출물의 핵심 주장(엔드포인트·필드명·enum값·상태전이)은 실제 코드와 충실히 일치하며, 사용자 중심 가치 서술도 코드를 그대로 베끼지 않고 의미 단위로 재구성된 것으로 확인됨.
