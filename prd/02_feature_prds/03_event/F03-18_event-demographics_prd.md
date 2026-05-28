# F03-18. 이벤트 구성인원 인구통계 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-27; unit: business_logic/units/03_event/F03-18_event-demographics (신규) -->

> 문서 상태: **2026-05-27 신규 기능.** 이벤트 상세 화면 내 "구성 통계" 섹션 — 참석 확정자(host + cohost + ATTENDING)의 성별·나이대·MBTI I·E 비율을 가로 비율 바로 표시한다. 데이터 원천은 `Member.gender/birthDate/mbti`이며 본인인증 동기화([[F09-01]])로 검증값이 반영된다. 프라이버시 3단계 게이트(전체 인원 / 차원 응답수 / 버킷 최소셀)로 소수 셀(개인) 식별을 차단한다.

## 1. 결론

이벤트 상세에서 가입(참가) 전 사용자가 이벤트 구성을 가늠할 수 있게 하고, 참가자는 자기 모임의 인구통계 분포를 확인할 수 있게 한다. 핵심 가치는 **검증된 데이터(본인인증)** 기반 분포 + **k-익명성 보호**다.

- **대상**: host + cohost + EventAttendance(status=ATTENDING) — distinct.
- **차원**: 성별(남/여) · 나이대(10대 이하/20대/30대/40대/50대 이상) · MBTI I·E(내향/외향).
- **표시**: 가로 비율 바(`LinearProgressIndicator`) — 비율(%)만, 원시 카운트 미노출.
- **프라이버시 3단계 게이트**: (1) 전체 인원<5 → 전체 숨김, (2) 차원 응답수<5 → 해당 차원 숨김, (3) 0이 아닌 모든 버킷 count≥5 → 차원 표시(그렇지 않으면 차원 숨김). 노출 카운트는 항상 ≥5라 비율로부터 역산해도 개인 식별 불가(k-익명성, k=5).
- **접근권한**: `PUBLIC` 가시성이면서 `OPEN/CLOSED` 상태는 인증 사용자 누구나 / 그 외(PRIVATE, LINK, APPROVAL, DRAFT, CANCELED, HIDDEN)는 host·cohost·ATTENDING만.

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Plan | `community/docs/plan/DEMOGRAPHICS_STATS_PLAN.md` | 있음(v2, Codex sign-off) | 게이트/접근권한/대상 정의 |
| Backend | (신규 — units 미생성, 본 PRD가 임시 origin) | — | 아래 trace 참조 |
| Frontend | (신규 — units 미생성, 본 PRD가 임시 origin) | — | 아래 trace 참조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/event/controller/EventController.java#getEventDemographics` (`GET /api/v1/events/{eventId}/demographics`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/event/service/EventDemographicsService.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/service/DemographicsService.java` (공용 집계 + 3단계 게이트) | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/vo/{DemographicsStatsVo,RatioItemVo,IeRatioVo}.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/constants/{AgeGroup,Mbti}.java` | 확인됨 |
| `community_app/lib/data/api/event_api.dart#getEventDemographics` | 확인됨 |
| `community_app/lib/data/models/common/demographics_stats_vo.dart` | 확인됨 |
| `community_app/lib/presentation/common/data/demographics_section.dart` (`DemographicsSection`, `_RatioBar`) | 확인됨 |
| `community_app/lib/presentation/event/widgets/event_demographics_section.dart` (Consumer wrapper) | 확인됨 |
| `community_app/lib/domain/providers/event/event_detail_provider.dart#eventDemographicsProvider` | 확인됨 |

## 3. 전체 동작 흐름

1. 이벤트 상세 진입 시 `EventDetailScreen` 내 참석 섹션 직후 `EventDemographicsSection(eventId)` 위젯이 렌더된다.
2. 위젯이 `eventDemographicsProvider(eventId)` 구독 → `EventRepository.getEventDemographics(eventId)` → `GET /api/v1/events/{eventId}/demographics`.
3. 서버 `EventDemographicsService.getDemographics(eventId, userId)`:
   - `eventService.getEvent(eventId, userId)`로 EventVo 조회(my* 컨텍스트 채움).
   - `canView(event, userId)` 검증 — 실패 시 `FORBIDDEN(10003)`.
   - userId 수집: `event.hostUserId` + `event.coHostUserIds` + `attendanceRepository.findByEventIdAndStatus(eventId, ATTENDING).userId` — distinct는 `DemographicsService.aggregate`에서 수행.
   - `DemographicsService.aggregate(userIds, referenceDate)` — 기준일은 `event.timezone` 기반(없으면 `Asia/Seoul`).
4. 응답 `DemographicsStatsVo` → 앱이 게이트 결과에 따라 차원별 비율 바 렌더(또는 "구성원이 적어 통계를 표시하지 않습니다" 안내).

## 4. 서버 계약

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/events/{eventId}/demographics | EventController#getEventDemographics | required | host+cohost+ATTENDING 대상 인구통계 집계(공개+OPEN/CLOSED는 모두, 그 외는 참가자만) |

### 응답 VO `DemographicsStatsVo`

| 필드 | 타입 | 설명 |
|---|---|---|
| totalCount | int | 대상 인원(host+cohost+ATTENDING distinct) |
| visible | bool | 전체 게이트 통과 여부(>=5) |
| threshold | int | 임계값(=5) |
| genderVisible / ageVisible / ieVisible | bool | 차원별 게이트 결과 |
| genderDistribution | List&lt;RatioItemVo&gt; | `{code: '1'\|'2', label: '남성'\|'여성', ratio: double}` (게이트 미통과 시 빈 배열) |
| ageGroupDistribution | List&lt;RatioItemVo&gt; | `{code: UNDER_TEENS/TWENTIES/.../FIFTIES_AND_OVER, label, ratio}` (UNKNOWN 제외) |
| ieDistribution | IeRatioVo? | `{ratioI, ratioE, coverageRatio}` (게이트 미통과 시 null) |
| mbtiCoverageRatio | double | MBTI 입력률(=MBTI 입력자/전체) |

**원시 카운트는 응답에 포함되지 않는다.** 게이트로 노출 버킷 count는 항상 ≥threshold이므로 비율·총수로 역산해도 개인 식별 불가(k-익명성, k=5).

### 접근권한 (EventDemographicsService#canView)

```
PUBLIC + (OPEN | CLOSED)  → 인증 사용자 누구나
otherwise                 → event.hostUserId == userId
                          OR event.coHostUserIds.contains(userId)
                          OR event.myAttendanceStatus == "ATTENDING"
```

### 도메인 모델

- **공용 `DemographicsService.aggregate(List<Long> userIds, LocalDate referenceDate)`** (`account.service`):
  - userIds distinct → `MemberRepository.findByUserIdIn` → userId당 1 row 보장.
  - 카운트: gender ∈ {1,2}, birthDate non-null(만나이 → AgeGroup), mbti non-null(I/E).
  - 게이트: 전체<5 → hidden / 차원응답<5 → 차원 숨김 / 0아닌 모든 버킷<threshold → 차원 숨김.
- **`AgeGroup` enum**: `UNDER_TEENS(10대 이하), TWENTIES, THIRTIES, FORTIES, FIFTIES_AND_OVER, UNKNOWN`.
- **나이 계산**: `Period.between(birthDate, referenceDate).getYears()`. referenceDate는 `LocalDate.now(zone)` — 이벤트는 `event.timezone` 기반(파싱 실패 시 `Asia/Seoul`).

### 의존 단위

- **[[F09-01 verification]]** — Member.gender/birthDate의 검증 신뢰도 원천(afterCommit 동기화).
- **[[F13-02 profile-edit]]** — Member.mbti의 입력 원천(I·E 분포 데이터).
- **F03-05 event-attendance / F03-06 application-review** — ATTENDING 상태가 대상에 포함되는 기준.
- **F03-02 event-detail** — 이 섹션이 호스팅되는 화면.

## 5. 프론트 계약

### 라우트 & 화면

- 별도 라우트 없음. 이벤트 상세 화면 내부 섹션이다.
- `presentation/event/widgets/event_demographics_section.dart` (ConsumerWidget) → `presentation/common/data/demographics_section.dart` (`DemographicsSection`, `_DimensionBlock`, `_RatioBar`).

### 화면 구성 요소

- **헤더**: "구성 통계" 텍스트.
- **차원 블록** × 최대 3개(성별/나이대/MBTI 성향) — 게이트 통과한 차원만 표시.
- **비율 바**: 라벨(64w) + `LinearProgressIndicator(value, minHeight 6, gray200 배경, 토큰 색상 valueColor)` + `${(ratio*100).round()}%` (40w 우측).
- **색상**:
  - 성별: 남=`AppColors.linkBlue`, 여=`AppColors.datingPink`.
  - 나이대: `AppColors.primary500`.
  - I/E: I=`AppColors.primary500`, E=`AppColors.warning500`.
- **빈 상태**: 전체 게이트 미통과 또는 모든 차원 숨김 시 `surfaceSunken` 카드 + info 아이콘 + "구성원이 적어 통계를 표시하지 않습니다."
- **MBTI 차원 보조 캡션**: "MBTI 입력 N%" (coverageRatio).

### 로딩/에러 처리

- 보조 정보이므로 로딩 시 `SizedBox.shrink()`(공백), 에러 시도 동일. 화면 본문 렌더를 막지 않는다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 공개+진행/종료 이벤트의 비참가자 조회 | event.visibility=PUBLIC + status∈{OPEN,CLOSED}, userId ∉ 참가자 | 200 + DemographicsStatsVo |
| S2 | 비공개 이벤트의 비참가자 조회 | visibility=PRIVATE, userId ∉ host/cohost/ATTENDING | FORBIDDEN(10003) |
| S3 | 비공개 이벤트의 host 조회 | visibility=PRIVATE, userId == hostUserId | 200 + 집계 결과 |
| S4 | 참석자 5명 미만 | totalCount < 5 | visible=false, 분포 빈 배열, 앱은 안내 메시지 |
| S5 | 성별 한쪽 4명+5명 | 남 4, 여 5 (총 9) | totalCount 9, genderVisible=false(버킷 최소셀 4<5), 다른 차원은 게이트 따로 |
| S6 | MBTI 입력자 4명 | mbti 입력자 4 / 총 10 | ieVisible=false, mbtiCoverageRatio=0.4 노출, 다른 차원은 정상 |
| S7 | MBTI I/E 한쪽 0 | I 8, E 0 (총 8 입력) | ieVisible=true(0은 비영 버킷 아님), I 100%, E 0% — 게이트 정상 |
| S8 | DRAFT 이벤트 조회 | event 상태 DRAFT | (상위 getEvent 게이트에서) 비참가자라면 차단. host는 통과 가능. |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | EventDemographicsService + DemographicsService 단위 테스트 | 신규 18개 테스트(Verification 8 / Demographics 4 / Event 3 / Club 2 / Backfill 1) 통과 |
| 프론트 계약 | 모델·API·Repo·Provider·Widget이 서버 VO 필드와 1:1 | freezed 모델 / build_runner 재생성 / flutter analyze 클린 |
| 접근권한 | EventDemographicsServiceTest(3) — PUBLIC+OPEN 허용 / PRIVATE 비참가자 거부 / host 허용 | 통과 |
| 게이트 | DemographicsServiceTest(4) — 전체/차원응답/버킷최소셀 | 통과 |

## 8. Gap / Risk

- ⚠️ **나이대 버킷 경계** — `Period.between` 기준 만나이. 시간대(timezone) 경계일 처리 미세 차이는 `event.timezone` 기반으로 보정. 사용자 거주지 시간대와 다를 수 있음(허용 범위).
- ⚠️ **APPROVED→ATTENDING 매핑** — `getEvent(eventId, userId)`가 `myAttendanceStatus`에 APPROVED를 ATTENDING으로 표현하는지는 EventService 구현 의존(Codex 확인). 추후 EventService 리팩터 시 정합 재확인.
- ⚠️ **UI/UX 스펙 부재** — 본 기능은 `docs/ui-ux/screens/13-event.md`에 명시 없음(net-new). 디자인 토큰만 사용해 일관성 유지.

## 9. 수용 기준

- **AC-01**: PUBLIC+OPEN 이벤트 demographics는 인증 사용자가 조회 가능.
- **AC-02**: PRIVATE 이벤트 비참가자는 FORBIDDEN.
- **AC-03**: host/cohost/ATTENDING 사용자는 모든 visibility에서 조회 가능.
- **AC-04**: 대상 인원<5 → visible=false, 분포 빈 배열, 앱은 "구성원이 적어 통계를 표시하지 않습니다" 표시.
- **AC-05**: 차원의 응답수<5 → 해당 차원 숨김(다른 차원은 별도 평가).
- **AC-06**: 0이 아닌 어떤 버킷이 <5 → 해당 차원 숨김(전체 노출은 유지하되 그 차원만 빈 배열).
- **AC-07**: 응답에 원시 카운트가 포함되지 않는다(ratio·총수만).
- **AC-08**: 나이 계산은 `event.timezone` 기준 만나이.
- **AC-09**: 대상 = host + cohost + EventAttendance(ATTENDING).userId distinct.

## 10. 미결정 / 후속

- **본인인증 backfill 실행** — Phase 0 이전 인증자의 검증 birthDate/gender가 Member에 반영되기 전까지는 가입값 폴백.
- **나이대 버킷 경계 정책 확정**(미성년 노출 정책 등) — UI/UX 스펙 부재.
- **순수 함수 컴포넌트 분리** — 향후 차원별 색상 토큰화/테마.
- **차원별 정렬·정밀도** — 현재 ratio는 double 그대로. UI에서 round → 합계 100% 미세 어긋남 가능(허용).
