# 09. 프라이빗 데이팅 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/09_private_date -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/09_private_date/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

1:1 데이트 매칭 비즈니스 단위. 본인 인증 → 데이팅 프로필 → 후보자 카드의 LIKE/PASS 버튼 → 매칭 목록 → 채팅 → 만남 제안 → 차단 관리로 이어진다. 체크인/SOS/긴급 연락처는 현재 서버·클라이언트에서 의도적 미운영이다. 서버는 만남 상태 전이를 제공하지만 앱 화면은 새 제안과 목록 확인만 연결하고 수락·취소·완료 CTA는 없다.

이 도메인은 기능 PRD 8개로 구성된다. 현재 기능별 trace source는 총 24개이고, risk 후보는 총 19개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F09-01 | F09-01. 본인 인증 (Toss) | [F09-01_verification_prd.md](../02_feature_prds/09_private_date/F09-01_verification_prd.md) | [F09-01_verification](../../units/09_private_date/F09-01_verification) | 전환 완료 | 3 | 0 |
| F09-02 | F09-02. 데이팅 프로필 관리 | [F09-02_profile_prd.md](../02_feature_prds/09_private_date/F09-02_profile_prd.md) | [F09-02_profile](../../units/09_private_date/F09-02_profile) | 갱신 완료 (2026-07-29) | 6 | 2 |
| F09-03 | F09-03. 후보자 카드 & 매칭 액션 | [F09-03_candidate_swipe_prd.md](../02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | [F09-03_candidate_swipe](../../units/09_private_date/F09-03_candidate_swipe) | 갱신 완료 (2026-07-29) | 2 | 4 |
| F09-04 | F09-04. 매칭 목록 조회 | [F09-04_match_list_prd.md](../02_feature_prds/09_private_date/F09-04_match_list_prd.md) | [F09-04_match_list](../../units/09_private_date/F09-04_match_list) | 전환 완료 | 2 | 0 |
| F09-05 | F09-05. 채팅 (방 목록 + 메시지) | [F09-05_chat_prd.md](../02_feature_prds/09_private_date/F09-05_chat_prd.md) | [F09-05_chat](../../units/09_private_date/F09-05_chat) | 전환 완료 | 4 | 1 |
| F09-06 | F09-06. 만남 제안 & 안전 흐름 | [F09-06_meeting_proposal_prd.md](../02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | [F09-06_meeting_proposal](../../units/09_private_date/F09-06_meeting_proposal) | 갱신 완료 (2026-07-29) | 3 | 8 |
| F09-07 | F09-07. 사용자 차단/해제 | [F09-07_block_prd.md](../02_feature_prds/09_private_date/F09-07_block_prd.md) | [F09-07_block](../../units/09_private_date/F09-07_block) | 전환 완료 | 3 | 1 |
| F09-08 | F09-08. 내 프로필 조회 이력 | [F09-08_profile_views_prd.md](../02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | [F09-08_profile_views](../../units/09_private_date/F09-08_profile_views) | 전환 완료 | 1 | 3 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F09-06](../02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | F09-06. 만남 제안 & 안전 흐름 | Risk 후보 8 |
| [F09-03](../02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | F09-03. 후보자 카드 & 매칭 액션 | Risk 후보 4 |
| [F09-08](../02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | F09-08. 내 프로필 조회 이력 | Risk 후보 3 |
| [F09-02](../02_feature_prds/09_private_date/F09-02_profile_prd.md) | F09-02. 데이팅 프로필 관리 | Risk 후보 2 |
| [F09-07](../02_feature_prds/09_private_date/F09-07_block_prd.md) | F09-07. 사용자 차단/해제 | Risk 후보 1 |
| [F09-05](../02_feature_prds/09_private_date/F09-05_chat_prd.md) | F09-05. 채팅 (방 목록 + 메시지) | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (M = 8)

| Prefix | 기능명 | 단계 | 진입 화면(Screen ID) | 주요 API |
|--------|------|------|----------------------|----------|
| **F09-01** | 본인 인증 (Toss) | 게이트 | SCR-PD-007 `verification_screen.dart` | `POST /api/v1/date/verification/request`, `POST /api/v1/date/verification/verify`, `GET /api/v1/date/verification/status` |
| **F09-02** | 데이팅 프로필 관리 | 자기 표현 | SCR-PD-001 `date_profile_screen.dart`, `date_profile_edit_screen.dart` | 서버는 생성·조회·수정·활성 토글·사진 API를 제공한다. 앱은 기존 프로필 조회·본문 수정·활성 토글만 연결 |
| **F09-03** | 후보자 카드 & 매칭 액션 | 상호 발견 | SCR-PD-002 `candidate_card_screen.dart` | `GET /api/v1/date/profile/candidates`, `POST /api/v1/date/matches/action`; 버튼 LIKE/PASS만 있고 swipe gesture 없음 |
| **F09-04** | 매칭 목록 조회 | 관계 보관 | SCR-PD-003 `match_list_screen.dart` | `GET /api/v1/date/matches`, `GET /api/v1/date/matches/{matchId}` |
| **F09-05** | 채팅 (방 목록 + 메시지) | 소통 | SCR-PD-004 `chat_room_list_screen.dart`, SCR-PD-005 `chat_screen.dart` | `GET /api/v1/date/chats`, `GET /api/v1/date/chats/{roomId}/messages`, `POST /api/v1/date/chats/{roomId}/messages`, `PATCH /api/v1/date/chats/{roomId}/read` |
| **F09-06** | 만남 제안 & 안전 흐름 | 오프라인 약속 | SCR-PD-006 `meeting_proposal_screen.dart` | 앱은 `POST /api/v1/date/meetings`와 목록 GET만 연결. 서버 PATCH 상태 전이는 있으나 presentation caller 없음. 체크인/SOS는 의도적 미운영 |
| **F09-07** | 사용자 차단/해제 | 안전 보호 | `date_blocks_screen.dart` (+ 후보자/매칭/채팅 어디서든 발동) | `GET /api/v1/date/blocks`, `POST /api/v1/date/blocks/{targetUserId}`, `DELETE /api/v1/date/blocks/{targetUserId}` |
| **F09-08** | 내 프로필 조회 이력 | 부가 동기 부여 | `profile_viewers_screen.dart` | `GET /api/v1/date/profile/views` |

## 5. 상태/권한/의존성

### 단위 분할 근거

매칭 비즈니스의 사용자 경험은 **단계별로 화면·심리·서버 호출이 모두 다르다.** 한 단위로 묶으면 기능 단위 분석이 어려워지므로 흐름의 마디마다 분리한다.

1. **진입 게이트**: 본인 인증(SCR-PD-007)이 데이팅 진입의 필수 조건. Toss SDK 외부 의존이 있어 별도 기능으로 격리.
2. **자기 표현**: 데이팅 프로필(SCR-PD-001) — 기존 본문 편집 + active 토글. 서버 생성·사진 API는 있지만 신규 생성 화면과 사진 추가/삭제 액션은 없다.
3. **상호 발견**: 후보자 카드(SCR-PD-002) — 버튼 LIKE/PASS 액션과 매칭 성사 모달. drag/swipe gesture나 일일 LIKE 한도는 현재 코드에서 확인되지 않는다. 과거 액션·매치 row를 후보 쿼리가 제외하지 않아 처리한 페어가 재노출될 수 있다.
4. **관계 보관**: 매칭 목록(SCR-PD-003) — 매칭된 사용자 리스트, 새매칭/대화중 탭, 단건 조회.
5. **소통**: 채팅방 목록(SCR-PD-004) + 채팅(SCR-PD-005) — 메시지 송수신, 읽음 처리. 한 번에 동선이 같아 한 기능으로 묶음.
6. **오프라인 약속**: 만남 제안(SCR-PD-006) — 앱은 일시/장소 신규 제안과 목록 확인만 연결한다. 서버의 확정·취소·완료 전이를 실행할 CTA는 없고 체크인/SOS도 미운영이다.
7. **안전 보호**: 차단(`/api/v1/date/blocks`) — 어디서든 발동 가능한 횡단 보호 기능. 활성 매칭 BLOCKED 처리.
8. **부가**: 프로필 조회 이력(`/api/v1/date/profile/views`) — "내 프로필을 본 사람" 화면(`profile_viewers_screen.dart`). 사용자 동기 부여 기능.

긴급 연락처(SCR-PD-008), SOS, 체크인은 **의도적 미운영** 상태이다. 이전 제품 결정으로 서버·클라이언트 양측에서 모두 삭제되었으며(`/api/v1/date/emergency-contacts`, `POST .../check-in`, `POST .../sos` 모두 부재), 본 단위 산출물에 별도 기능으로 도출하지 않는다. 스펙 문서(SCR-PD-006/008)에 흔적이 남아 있으나 이는 deprecated 항목으로 간주한다. 향후 재도입 시 별도 작업으로 다룬다.

### 단계별 사용자 경험 요약

```
[F09-01 본인 인증] (게이트 통과 안되면 모든 기능 차단)
       ↓
[F09-02 기존 프로필 조회·본문 편집·active 토글]
       ↓
[F09-03 후보자 카드 LIKE/PASS 버튼] ─── 매칭 미성사 → 다음 카드
       │ (매칭 성사)
       ↓
[F09-04 매칭 목록] ─── (탭) ───→ [F09-05 채팅]
                                    │
                                    ↓
                              [F09-06 만남 제안]
                                    │
                                    ├─ 앱: PROPOSED 생성·목록 확인
                                    └─ 서버: CONFIRMED/CANCELLED/COMPLETED
                                       (현재 상태 변경 CTA 없음)

[F09-07 차단] — 후보자/매칭/채팅 어느 단계에서나 발동 가능 (횡단)
[F09-08 조회 이력] — 프로필 진입 측면 동선 (마이페이지)
```

## 6. 화면/API 매핑

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F09-06](../02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | F09-06. 만남 제안 & 안전 흐름 | 8 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-03](../02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | F09-03. 후보자 카드 & 매칭 액션 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-08](../02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | F09-08. 내 프로필 조회 이력 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-02](../02_feature_prds/09_private_date/F09-02_profile_prd.md) | F09-02. 데이팅 프로필 관리 | 2 | 생성/사진 UI 부재, 사진 요청/응답 계약 불일치 — 기능 PRD 참조 |
| [F09-05](../02_feature_prds/09_private_date/F09-05_chat_prd.md) | F09-05. 채팅 (방 목록 + 메시지) | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-07](../02_feature_prds/09_private_date/F09-07_block_prd.md) | F09-07. 사용자 차단/해제 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

### 접근권한 감사 교정 (2026-07-02)

접근권한 감사(2026-06-30~07-01)에서 확정·교정된 사항이다. 서버 코드에만 적용됐다.

**프로필 사진 모더레이션 필터 (F09-1).** 디스커버리 피드와 채팅 아바타에 노출되는 사진은 검수 통과(APPROVED) 상태이며 삭제되지 않은 사진만 제공된다. 검수 대기(PENDING)·반려(REJECTED)·신고 검토 중(UNDER_REPORT)·소프트 삭제된 사진은 외부에 노출되지 않는다. 본인 프로필 조회에는 필터가 적용되지 않는다.

**만남 약속 상태 전이 제한 (F09-2).** 서버 상태머신은 역행·종료 후 재전이를 막고, 확정(CONFIRMED)은 제안자 본인이 아닌 상대방만 할 수 있다. 다만 현재 Flutter에는 이 PATCH를 호출하는 수락·취소·완료 CTA가 없어 앱 happy path는 PROPOSED 생성에서 끝난다.

**원본 신원 미노출(재확인).** 어떤 화면에서도 데이팅 참여자의 실명·전화번호·주민등록 연계 정보는 노출되지 않는다. 데이팅 프로필은 별도 퍼소나 정보만 사용하며, 원본 신원 데이터는 암호화 보관된다.

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.

## 9. 결격 선호·커뮤니티 옵트인·만남 피드백 재실측 (2026-07-29)

F09-02 프로필은 흡연·음주·만남 목적·종교와 네 결격 토글, `communityDataOptIn`을 저장한다. 종교 저장에는 같은 요청의 별도 동의가 필요하고 동의 시각을 기록한다. F09-03 후보 필터는 조회자의 `excludeSmoker`, `excludeHeavyDrinker`, `excludeCasualPurpose`, `sameReligionOnly`를 단방향으로 적용하며 후보 null 값은 통과한다.

후보 점수의 커뮤니티 성분은 관심사 태그 0.30과 신뢰점수 유사도 0.15다. 양쪽 프로필이 모두 옵트인한 경우만 사용하고, 미동의 시 지역 0.25·상호 연령 0.20·활동성 0.10을 재정규화한다. trait 점수와 behavior style estimate는 현재 데이팅 점수에 사용하지 않는다.

F09-06 완료 미팅에는 본인 피드백이 추가됐다.

- `POST /api/v1/date/meetings/{meetingId}/feedback` → 201
- `GET /api/v1/date/meetings/{meetingId}/feedback/me` → 200
- body: 필수 `meetAgain`, 선택 `satisfaction` 1~5
- 조건: `COMPLETED`, 당사자, 비차단, 1인 1회
- 상대 응답 여부·내용·상호 결과는 비노출

현재 만남 피드백을 취향 프로필이나 추천 점수에 전달하는 호출은 없고 privatedate 격리 데이터 및 본인 export 원본으로만 확인된다.
