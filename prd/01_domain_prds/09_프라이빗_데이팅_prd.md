# 09. 프라이빗 데이팅 PRD

<!-- generated: domain-source-first-rollup; updated: 2026-05-18; unit: business_logic/units/09_private_date -->

> 문서 상태: **도메인 전환본**. 이 문서는 `business_logic/units/09_private_date/00_overview.md`와 기능 PRD 전환 상태표를 묶어, 도메인 담당자가 어떤 기능 문서를 어떤 순서로 확인해야 하는지 보여준다.

## 1. 결론

1:1 데이트 매칭 비즈니스 단위. 본인 인증 → 데이팅 프로필 작성 → 후보자 스와이프/매칭 → 매칭 목록 → 채팅 → 만남 제안/체크인/SOS → 차단 관리. 모든 흐름은 안전(본인 인증·SOS·긴급 연락처)을 전제로 한다.

이 도메인은 기능 PRD 8개로 구성된다. 현재 기능별 trace source는 총 24개이고, risk 후보는 총 19개다. 도메인 수준의 판단은 아래 기능별 PRD와 unit 근거를 따라가며 확정한다.

## 2. 실사 근거 맵

| ID | 기능 | PRD | Unit 근거 | 상태 | Trace | Risk 후보 |
|---|---|---|---|---|---:|---:|
| F09-01 | F09-01. 본인 인증 (Toss) | [F09-01_verification_prd.md](../02_feature_prds/09_private_date/F09-01_verification_prd.md) | [F09-01_verification](../../units/09_private_date/F09-01_verification) | 전환 완료 | 3 | 0 |
| F09-02 | F09-02. 데이팅 프로필 관리 | [F09-02_profile_prd.md](../02_feature_prds/09_private_date/F09-02_profile_prd.md) | [F09-02_profile](../../units/09_private_date/F09-02_profile) | 전환 완료 | 6 | 2 |
| F09-03 | F09-03. 후보자 스와이프 & 매칭 액션 | [F09-03_candidate_swipe_prd.md](../02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | [F09-03_candidate_swipe](../../units/09_private_date/F09-03_candidate_swipe) | 전환 완료 | 2 | 4 |
| F09-04 | F09-04. 매칭 목록 조회 | [F09-04_match_list_prd.md](../02_feature_prds/09_private_date/F09-04_match_list_prd.md) | [F09-04_match_list](../../units/09_private_date/F09-04_match_list) | 전환 완료 | 2 | 0 |
| F09-05 | F09-05. 채팅 (방 목록 + 메시지) | [F09-05_chat_prd.md](../02_feature_prds/09_private_date/F09-05_chat_prd.md) | [F09-05_chat](../../units/09_private_date/F09-05_chat) | 전환 완료 | 4 | 1 |
| F09-06 | F09-06. 만남 제안 & 안전 흐름 | [F09-06_meeting_proposal_prd.md](../02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | [F09-06_meeting_proposal](../../units/09_private_date/F09-06_meeting_proposal) | 전환 완료 | 3 | 8 |
| F09-07 | F09-07. 사용자 차단/해제 | [F09-07_block_prd.md](../02_feature_prds/09_private_date/F09-07_block_prd.md) | [F09-07_block](../../units/09_private_date/F09-07_block) | 전환 완료 | 3 | 1 |
| F09-08 | F09-08. 내 프로필 조회 이력 | [F09-08_profile_views_prd.md](../02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | [F09-08_profile_views](../../units/09_private_date/F09-08_profile_views) | 전환 완료 | 1 | 3 |

## 3. 먼저 볼 기능

| 먼저 볼 기능 | 기능 | 이유 |
|---|---|---|
| [F09-06](../02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | F09-06. 만남 제안 & 안전 흐름 | Risk 후보 8 |
| [F09-03](../02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | F09-03. 후보자 스와이프 & 매칭 액션 | Risk 후보 4 |
| [F09-08](../02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | F09-08. 내 프로필 조회 이력 | Risk 후보 3 |
| [F09-02](../02_feature_prds/09_private_date/F09-02_profile_prd.md) | F09-02. 데이팅 프로필 관리 | Risk 후보 2 |
| [F09-07](../02_feature_prds/09_private_date/F09-07_block_prd.md) | F09-07. 사용자 차단/해제 | Risk 후보 1 |
| [F09-05](../02_feature_prds/09_private_date/F09-05_chat_prd.md) | F09-05. 채팅 (방 목록 + 메시지) | Risk 후보 1 |

## 4. 도메인 기능 목록

### 핵심 기능 목록 (M = 8)

| Prefix | 기능명 | 단계 | 진입 화면(Screen ID) | 주요 API |
|--------|------|------|----------------------|----------|
| **F09-01** | 본인 인증 (Toss) | 게이트 | SCR-PD-007 `verification_screen.dart` | `POST /api/v1/date/verification/request`, `POST /api/v1/date/verification/verify`, `GET /api/v1/date/verification/status` |
| **F09-02** | 데이팅 프로필 관리 | 자기 표현 | SCR-PD-001 `date_profile_screen.dart`, `date_profile_edit_screen.dart` | `POST/GET/PATCH /api/v1/date/profile`, `PATCH /api/v1/date/profile/active`, `POST /api/v1/date/profile/photos`, `DELETE /api/v1/date/profile/photos/{photoId}` |
| **F09-03** | 후보자 스와이프 & 매칭 액션 | 상호 발견 | SCR-PD-002 `candidate_card_screen.dart` | `GET /api/v1/date/profile/candidates`, `POST /api/v1/date/matches/action` |
| **F09-04** | 매칭 목록 조회 | 관계 보관 | SCR-PD-003 `match_list_screen.dart` | `GET /api/v1/date/matches`, `GET /api/v1/date/matches/{matchId}` |
| **F09-05** | 채팅 (방 목록 + 메시지) | 소통 | SCR-PD-004 `chat_room_list_screen.dart`, SCR-PD-005 `chat_screen.dart` | `GET /api/v1/date/chats`, `GET /api/v1/date/chats/{roomId}/messages`, `POST /api/v1/date/chats/{roomId}/messages`, `PATCH /api/v1/date/chats/{roomId}/read` |
| **F09-06** | 만남 제안 & 안전 흐름 | 오프라인 약속 | SCR-PD-006 `meeting_proposal_screen.dart` | `POST /api/v1/date/meetings`, `PATCH /api/v1/date/meetings/{meetingId}`, `GET /api/v1/date/meetings/match/{matchId}` (체크인/SOS — `POST .../check-in`, `POST .../sos`는 **의도적 미운영**: 이전 결정으로 삭제됨, 향후 재도입 시 별도 작업) |
| **F09-07** | 사용자 차단/해제 | 안전 보호 | `date_blocks_screen.dart` (+ 후보자/매칭/채팅 어디서든 발동) | `GET /api/v1/date/blocks`, `POST /api/v1/date/blocks/{targetUserId}`, `DELETE /api/v1/date/blocks/{targetUserId}` |
| **F09-08** | 내 프로필 조회 이력 | 부가 동기 부여 | `profile_viewers_screen.dart` | `GET /api/v1/date/profile/views` |

## 5. 상태/권한/의존성

### 단위 분할 근거

매칭 비즈니스의 사용자 경험은 **단계별로 화면·심리·서버 호출이 모두 다르다.** 한 단위로 묶으면 기능 단위 분석이 어려워지므로 흐름의 마디마다 분리한다.

1. **진입 게이트**: 본인 인증(SCR-PD-007)이 데이팅 진입의 필수 조건. Toss SDK 외부 의존이 있어 별도 기능으로 격리.
2. **자기 표현**: 데이팅 프로필(SCR-PD-001) — 사진/자기소개/관심사/기본정보 입력 + active 토글. 매칭 노출 ON/OFF의 시작점.
3. **상호 발견**: 후보자 카드(SCR-PD-002) — 스와이프, LIKE/PASS 액션. 일일 LIKE 한도, 매칭 성사 모달.
4. **관계 보관**: 매칭 목록(SCR-PD-003) — 매칭된 사용자 리스트, 새매칭/대화중 탭, 단건 조회.
5. **소통**: 채팅방 목록(SCR-PD-004) + 채팅(SCR-PD-005) — 메시지 송수신, 읽음 처리. 한 번에 동선이 같아 한 기능으로 묶음.
6. **오프라인 약속**: 만남 제안(SCR-PD-006) — 일시/장소 제안, 수락/거절, 체크인, SOS 긴급 알림. 안전 흐름의 중심.
7. **안전 보호**: 차단(`/api/v1/date/blocks`) — 어디서든 발동 가능한 횡단 보호 기능. 활성 매칭 BLOCKED 처리.
8. **부가**: 프로필 조회 이력(`/api/v1/date/profile/views`) — "내 프로필을 본 사람" 화면(`profile_viewers_screen.dart`). 사용자 동기 부여 기능.

긴급 연락처(SCR-PD-008), SOS, 체크인은 **의도적 미운영** 상태이다. 이전 제품 결정으로 서버·클라이언트 양측에서 모두 삭제되었으며(`/api/v1/date/emergency-contacts`, `POST .../check-in`, `POST .../sos` 모두 부재), 본 단위 산출물에 별도 기능으로 도출하지 않는다. 스펙 문서(SCR-PD-006/008)에 흔적이 남아 있으나 이는 deprecated 항목으로 간주한다. 향후 재도입 시 별도 작업으로 다룬다.

### 단계별 사용자 경험 요약

```
[F09-01 본인 인증] (게이트 통과 안되면 모든 기능 차단)
       ↓
[F09-02 프로필] (사진≥1장, 자기소개≥10자, 관심사≥1개, active=true)
       ↓
[F09-03 후보자 스와이프] ─── 매칭 미성사 → 다음 카드
       │ (매칭 성사)
       ↓
[F09-04 매칭 목록] ─── (탭) ───→ [F09-05 채팅]
                                    │
                                    ↓
                              [F09-06 만남 제안]
                                    │
                                    ├─ 수락 → 만남 당일 체크인 / SOS
                                    └─ 거절 → 채팅으로 복귀

[F09-07 차단] — 후보자/매칭/채팅 어느 단계에서나 발동 가능 (횡단)
[F09-08 조회 이력] — 프로필 진입 측면 동선 (마이페이지)
```

## 6. 화면/API 매핑

> 이 overview에는 별도 요약 섹션이 없다. 이 도메인의 세부 판단은 위 실사 근거 맵의 기능 PRD와 unit 문서를 기준으로 확인한다.

## 7. Gap / Risk Rollup

| 기능 | 제목 | 후보 수 | 처리 기준 |
|---|---|---:|---|
| [F09-06](../02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md) | F09-06. 만남 제안 & 안전 흐름 | 8 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-03](../02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md) | F09-03. 후보자 스와이프 & 매칭 액션 | 4 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-08](../02_feature_prds/09_private_date/F09-08_profile_views_prd.md) | F09-08. 내 프로필 조회 이력 | 3 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-02](../02_feature_prds/09_private_date/F09-02_profile_prd.md) | F09-02. 데이팅 프로필 관리 | 2 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-05](../02_feature_prds/09_private_date/F09-05_chat_prd.md) | F09-05. 채팅 (방 목록 + 메시지) | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |
| [F09-07](../02_feature_prds/09_private_date/F09-07_block_prd.md) | F09-07. 사용자 차단/해제 | 1 | 기능 PRD의 `Gap / Risk` 섹션에서 후보를 source 대조로 확정 |

## 8. 운영 방법

1. 새 구현이나 QA 착수 전 `PRD_MIGRATION_STATUS.md`에서 담당 기능의 trace/risk 수를 확인한다.
2. 담당 기능 PRD의 `실사 근거`, `서버 계약`, `프론트 계약`, `상태/권한/시나리오 매트릭스`, `Gap / Risk`를 먼저 읽는다.
3. PRD가 인용한 `units` 문서와 실제 source trace를 열어 endpoint, DTO, enum, provider, screen이 현재 코드와 맞는지 확인한다.
4. 도메인 정책은 이 문서에서 확정하지 않는다. 기능 PRD와 정책 PRD의 Gap/Risk가 충돌하면 `05_planning_artifacts/decision_register.md`에 결정 항목으로 올린다.
