# F04-17. 클럽 구성인원 인구통계 PRD

<!-- generated: source-first-unit-sync; updated: 2026-05-27; unit: business_logic/units/04_club/F04-17_club-demographics (신규) -->

> 문서 상태: **2026-05-27 신규 기능.** 클럽 상세 화면 내 "구성 통계" 섹션 — 클럽 멤버 전원의 성별·나이대·MBTI I·E 비율을 가로 비율 바로 표시한다. **클럽 멤버 전용 게이트.** 데이터 원천은 `Member.gender/birthDate/mbti`이며 본인인증 동기화([[F09-01]])로 검증값이 반영된다. 프라이버시 3단계 게이트(전체 인원 / 차원 응답수 / 버킷 최소셀)로 소수 셀(개인) 식별을 차단한다.

## 1. 결론

클럽 멤버가 자기 클럽의 인구통계 분포를 한눈에 볼 수 있게 한다. 비공개·멤버십 기반 커뮤니티 특성을 반영해 **멤버 전용**으로 가시성을 엄격히 제한한다(비멤버는 FORBIDDEN).

- **대상**: `ClubMember` 전원(역할 무관 — OWNER/ADMIN/MEMBER 모두).
- **차원**: 성별(남/여) · 나이대 · MBTI I·E.
- **표시**: 가로 비율 바(`LinearProgressIndicator`) — 비율만, 원시 카운트 미노출.
- **프라이버시 3단계 게이트**: F03-18과 동일. k-익명성(k=5).
- **접근권한**: `ClubMemberRepository.existsByClubIdAndUserId(clubId, userId)` 멤버만.
- **나이 기준일**: `Asia/Seoul` (클럽은 timezone 필드 없음).

## 2. 실사 근거

| 구분 | 원천 문서 | 상태 | 이 PRD에서 쓰는 근거 |
|---|---|---|---|
| Plan | `community/docs/plan/DEMOGRAPHICS_STATS_PLAN.md` | 있음(v2, Codex sign-off) | 게이트/접근권한/대상 정의 |
| Backend | (신규 — units 미생성, 본 PRD가 임시 origin) | — | 아래 trace 참조 |
| Frontend | (신규) | — | 아래 trace 참조 |

### 확인된 소스 trace

| 소스 trace | 파일 존재 |
|---|---|
| `community_api/src/main/java/com/endside/community/club/controller/ClubController.java#getClubDemographics` (`GET /api/v1/clubs/{id}/demographics`) | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/service/ClubDemographicsService.java` | 확인됨 |
| `community_api/src/main/java/com/endside/community/account/service/DemographicsService.java` (공용) | 확인됨 |
| `community_api/src/main/java/com/endside/community/club/repository/ClubMemberRepository.java` (`existsByClubIdAndUserId`, `findByClubIdOrderByJoinedAtAsc`) | 확인됨 |
| `community_app/lib/data/api/club_api.dart#getClubDemographics` | 확인됨 |
| `community_app/lib/presentation/club/widgets/club_demographics_section.dart` | 확인됨 |
| `community_app/lib/domain/providers/club/club_detail_provider.dart#clubDemographicsProvider` | 확인됨 |

## 3. 전체 동작 흐름

1. 클럽 상세 진입 시 `ClubDetailScreen` 내 `ClubMemberPreview` 다음에 `ClubDemographicsSection(clubId)` 위젯이 렌더된다.
2. 위젯이 `clubDemographicsProvider(clubId)` 구독 → `ClubRepository.getClubDemographics(clubId)` → `GET /api/v1/clubs/{id}/demographics`.
3. 서버 `ClubDemographicsService.getDemographics(clubId, userId)`:
   - `ClubMemberRepository.existsByClubIdAndUserId(clubId, userId)` 검증 — 실패 시 `FORBIDDEN(10003)`.
   - userId 수집: `ClubMemberRepository.findByClubIdOrderByJoinedAtAsc(clubId)` → `getUserId()` 매핑.
   - `DemographicsService.aggregate(userIds, LocalDate.now(Asia/Seoul))`.
4. 응답 `DemographicsStatsVo` → 앱이 게이트 결과에 따라 차원별 비율 바 렌더(또는 안내).

## 4. 서버 계약

### 엔드포인트 요약

| Method | Path | Controller#Method | 인증 | 핵심 동작 |
|---|---|---|---|---|
| GET | /api/v1/clubs/{id}/demographics | ClubController#getClubDemographics | required | 멤버 전용 — 클럽 멤버 전원 대상 인구통계 집계 |

### 응답 VO

`DemographicsStatsVo` — F03-18과 동일 구조(공용). 클럽엔 `event.timezone` 같은 zone 필드가 없어 referenceDate는 `Asia/Seoul`로 고정.

### 접근권한 (ClubDemographicsService#getDemographics)

```
clubMemberRepository.existsByClubIdAndUserId(clubId, userId) 
    || throw FORBIDDEN
```

OWNER/ADMIN/MEMBER 모두 허용(역할 무관).

### 의존 단위

- **[[F09-01 verification]]** — Member.gender/birthDate의 검증 신뢰도 원천.
- **[[F13-02 profile-edit]]** — Member.mbti의 입력 원천.
- **F04-02 club-detail-join** — 이 섹션이 호스팅되는 화면.
- **F04-04 member-management** — ClubMember 멤버십 게이트의 기준.

## 5. 프론트 계약

### 라우트 & 화면

- 별도 라우트 없음. 클럽 상세 화면 내부 섹션.
- `presentation/club/widgets/club_demographics_section.dart` (ConsumerWidget) → 공용 `presentation/common/data/demographics_section.dart`.

### 화면 구성 요소

- F03-18과 동일한 `DemographicsSection` 위젯을 공유. 헤더, 차원 블록, 비율 바, 빈 상태(`구성원이 적어 통계를 표시하지 않습니다.`), MBTI 입력률 캡션 동일.
- 로딩/에러 시 `SizedBox.shrink()`(보조 정보).

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 멤버가 자기 클럽 인구통계 조회 | userId ∈ ClubMember(clubId) | 200 + DemographicsStatsVo |
| S2 | 비멤버가 클럽 인구통계 조회 | userId ∉ ClubMember(clubId) | FORBIDDEN(10003) |
| S3 | 멤버 5명 미만 | totalCount < 5 | visible=false, 분포 빈 배열, 앱은 안내 메시지 |
| S4 | 멤버 100명, 성별 95:5 | 남 95, 여 5 (총 100) | genderVisible=true(양쪽 ≥5), 양쪽 ratio 노출 |
| S5 | MBTI 입력자 4명 | mbti 입력자 4 / 멤버 30 | ieVisible=false, mbtiCoverageRatio≈0.13 |
| S6 | 멤버는 멤버가 되어 즉시 조회 | 가입 직후 ClubMember row 생성 | 200(자기 자신 포함된 집계) |
| S7 | 탈퇴/추방 직후 비멤버 조회 | ClubMember row 삭제 | FORBIDDEN |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | ClubDemographicsService + 공용 DemographicsService 테스트 | ClubDemographicsServiceTest(2) + DemographicsServiceTest(4) 통과 |
| 프론트 계약 | API·Repo·Provider·Widget이 서버 VO와 1:1 | freezed 재생성·flutter analyze 클린 |
| 멤버십 게이트 | ClubDemographicsServiceTest — 비멤버 거부 / 멤버 허용 | 통과 |

## 8. Gap / Risk

- ⚠️ **클럽 timezone 부재** — 클럽 엔티티에 timezone 필드가 없어 `Asia/Seoul` 고정. 글로벌 사용 시 보정 필요.
- ⚠️ **member.user_id UNIQUE 가정** — Phase 0에서 UNIQUE 제약 추가됨(`uk_member_user_id`). DemographicsService도 LinkedHashMap putIfAbsent로 dedupe 방어. 운영 데이터 중복 사전 검증 필요.
- ⚠️ **UI/UX 스펙 부재** — `docs/ui-ux/screens/15-club.md`에 명시 없음(net-new).

## 9. 수용 기준

- **AC-01**: 클럽 멤버는 자기 클럽 demographics 조회 가능.
- **AC-02**: 비멤버는 FORBIDDEN.
- **AC-03**: 멤버 수<5 → visible=false, 분포 빈 배열, 앱은 안내 표시.
- **AC-04**: 차원의 응답수<5 또는 0이 아닌 어떤 버킷<5 → 해당 차원 숨김.
- **AC-05**: 응답에 원시 카운트가 포함되지 않는다.
- **AC-06**: 대상 = ClubMember.userId 전원(역할 무관, distinct).
- **AC-07**: 나이 기준일은 `Asia/Seoul` 기준 `LocalDate.now()`.

## 10. 미결정 / 후속

- **본인인증 backfill 실행** — Phase 0 이전 인증자 처리 후 데이터 정확도 향상.
- **클럽 timezone 도입** 검토(다국가 운영 시).
- **공개 클럽**의 비멤버 일부 노출 정책 — 현재는 일률 멤버 전용. 가입 유도용 부분 노출 정책 검토 가능.
- **F04-02 club-detail-join**의 진입 카드 표기(멤버 미리보기 직후 위치) 안정성.
