# F08-02. 플랜 상세 / 작성자용 미리보기 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

플랜의 메타데이터(제목/설명/상태/구매수)와 블록 트리, 그리고 현재 사용자의 소유/구매 여부를 반환한다. 작성자는 추가로 수정·삭제·복사·발행·숨김(Hide) 같은 라이프사이클 액션을 호출할 수 있다.

**AUTH-08(2026-06-09)**: 플랜 상세 조회 시 **인증된 비소유자(non-owner)** 조회에 한해 `view_count` 원자 증가를 수행한다. 소유자(크리에이터) 본인과 익명(보안상 도달 불가) 조회는 카운트 대상 제외. 집계 합산은 크리에이터 대시보드(F08-07 `planViewTotal`)로 환류된다.

**AUTH-06 Slice 3(2026-06-09)**: `getPreview` **서비스 레이어**에 상태별 게이트 적용 — PUBLISHED는 익명 허용(의도), DRAFT/HIDDEN은 로그인 필수(익명 → 401 UNAUTHORIZED), DELETED는 404 PLAN_NOT_FOUND. **단 현재 preview 경로는 전역 보안 permitAll 미선언이라 익명 HTTP 요청 자체가 필터에서 차단됨 → "PUBLISHED 익명 공개"·"익명→401" 분기는 서비스 의도일 뿐 실제로는 미도달(실효 효과 = 로그인 비소유자의 DRAFT/HIDDEN 미리보기 허용). §8 Gap 참조.**

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 플랜 목록(F08-01) ▶ 만든 플랜 카드 탭 ▶ `/plan/:planId`
- 플랜 목록 ▶ 구매 플랜 카드 탭 ▶ `/plan/:planId/preview` (별도 화면)
- 마켓 아이템 상세 ▶ "구매 플랜 보기" ▶ `/plan/:planId/preview`
- 발행 화면(F08-05)에서 발행 성공 후 pop → 상세로 복귀

## 2. 코드 위치

계약의 정본은 코드다. 서버: `PlanController`, `Plan`, `PlanService`, `ViewCountIncrementService`, `PlanQueryRepository`, `SecurityConfiguration`, `PlanVo`. 앱: `plan_detail_screen.dart`, `plan_preview_screen.dart`, `block_editor_screen.dart`, `plan_publish_screen.dart`, `plan_event_create_screen.dart`.

## 3. 전체 동작 흐름

1. 화면 진입 시: `planDetailNotifierProvider(planId)` ▶ `PlanRepository.getPlanDetail(planId)` ▶ `GET /api/v1/plans/{planId}`
2. "편집" 버튼: 단순 `context.push` (편집 화면이 자체 Provider로 블록 트리 로드)
3. "발행": `context.push('/plan/$planId/publish')` — F08-05에서 실제 API 호출
4. "판매 중지": `planPublishNotifierProvider.hidePlan(planId)` ▶ `POST /api/v1/plans/{id}/hide` ▶ `ref.invalidate(myCreatedPlansNotifierProvider)` + 토스트
5. "복제": `planCreateNotifierProvider.copyPlan(planId)` ▶ `POST /api/v1/plans/{id}/copy` ▶ 토스트 + `context.push('/plan/${copied.id}')`
6. "삭제": `planCreateNotifierProvider.deletePlan(planId)` ▶ `DELETE /api/v1/plans/{id}` ▶ invalidate + `context.go('/plan')`
7. "이벤트 만들기": push로 별도 화면 (Unit 03 위임)

## 4. 제품 규칙

- 상태 전이: DRAFT → PUBLISHED, PUBLISHED → HIDDEN, HIDDEN → PUBLISHED, DRAFT → DELETED.
- 삭제는 작성자의 DRAFT 만 된다. PUBLISHED 와 HIDDEN 은 지울 수 없다. 산 사람이 계속 볼 수 있게 하기 위해서다. 화면은 "삭제된 플랜은 복구할 수 없습니다"라고 안내한다.
- 복제는 작성자라면 어느 상태에서든 되며, 삭제되지 않은 플랜 수 한도 안에서 새 DRAFT 를 만든다.
- 판매 중지는 PUBLISHED 에서만 되고 마켓 노출이 멈춘다. 언제든 다시 판매할 수 있다.
- 작성자 화면: "편집"과 함께 DRAFT, HIDDEN 은 "발행하기", PUBLISHED 는 "판매 중지"와 "복제". 통계 카드는 PUBLISHED 의 작성자에게만 보인다. 구매자는 "이 플랜으로 이벤트 만들기" 하나다.
- 오류의 뜻: PLAN_NOT_CREATOR(403) 작성자가 아님, PLAN_INVALID_STATUS_TRANSITION(400) 그 상태에서 못 하는 일, PLAN_LIMIT_EXCEEDED(400) 플랜 수 한도 초과.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 작성자가 DRAFT 플랜을 검토하고 발행 진입 (Happy Path) | 자기 소유 플랜, status=DRAFT, 블록 5개 | F08-05 발행 화면 진입 |
| S2 | PUBLISHED 작성자 본인 — 통계 + 판매 중지 / 복제 | status=PUBLISHED, purchaseCount=12 | 새 DRAFT 플랜 124가 새 화면에 표시됨 |
| S3 | PUBLISHED 작성자 — 판매 중지 → HIDDEN | 시나리오 본문 참조 | 마켓에 노출되지 않음. 다시 발행할 수 있음 |
| S4 | 비구매 비작성자가 HIDDEN 플랜 진입 | 작성자가 발행 후 HIDDEN으로 전환한 플랜 | 서버 상세/블록이 FORBIDDEN이며 앱은 접근 불가/블러 폴백 |
| S4-A | 기존 구매자가 HIDDEN 플랜 재진입 | 구매 뒤 작성자가 HIDDEN으로 전환 | 전체 본문과 이벤트 생성 권한 유지, 블러 없음 |
| S5 | 작성자가 DRAFT 플랜 삭제 | 시나리오 본문 참조 | 목록에서 사라짐 (count는 status=DELETED 제외 카운트라 한도 회복) |
| S6 | 잘못된 상태 전이 시도 — DRAFT에서 hide 호출 | 시나리오 본문 참조 | 상태 변경 없음 |
| S7 | 구매자가 미리보기 진입 | planId=123 구매 완료 | 본문 열람 가능. 하단 "이 플랜으로 이벤트 만들기" 버튼 |
| S8 | 비구매자가 미리보기 진입 | `/plan/1002` 상세, status=DRAFT, isCreatorOwned=true | 구매 유도 |
| S9 (AUTH-08) | 인증된 비소유자 상세 조회 → view_count 증가 | 타 사용자가 GET /api/v1/plans/{planId} 호출 | view_count +1 원자 증가. 조회 응답 정상 반환(증가 실패 시에도 warn 로그만, 응답 무중단) |
| S10 (AUTH-08) | 크리에이터 본인 상세 조회 → view_count 불변 | 작성자가 자기 PUBLISHED 플랜 조회 | view_count 변화 없음. 통계 부풀리기 방지 |
| S11 (AUTH-06) | 익명 사용자가 DRAFT 플랜 미리보기 진입 | GET /api/v1/plans/{planId}/preview, 비로그인, status=DRAFT | 401 UNAUTHORIZED 반환. 앱 로그인 유도 |
| S12 (AUTH-06) | 로그인 사용자가 HIDDEN 플랜 미리보기 진입 | GET /api/v1/plans/{planId}/preview, 로그인, status=HIDDEN | 미리보기 허용(sampleBlocks). 본문은 비구매자 차단 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 구현됨 (AUTH-08) | `PlanService.java:148`, `ViewCountIncrementService.java:36` | view_count 비소유자 조회 시 원자 증가. REQUIRES_NEW 격리. 실패 무중단. | QA: 소유자/비소유자/증가실패 시나리오 E2E 확인 |
| 구현됨 (AUTH-06) | `PlanService.java:159-173` | getPreview 서비스 게이트(DELETED→404, DRAFT/HIDDEN+익명→401, PUBLISHED→익명 포함 공개, DRAFT/HIDDEN+로그인→허용·person-specific 보류). | QA: 로그인 비소유자의 DRAFT 미리보기 → 허용, DELETED 미리보기 → 404 E2E 확인 |
| 의도 vs 배선 주의 (AUTH-06) | `SecurityConfiguration.java:77~88`(permitAll 목록), `PlanController.java:64` | `/api/v1/plans/*/preview`는 permitAll 목록에 없어 `anyRequest().authenticated()` 적용 → **익명 요청은 보안 레이어에서 먼저 차단**. 따라서 서비스의 "PUBLISHED 익명 공개" 의도와 "익명→401(UNAUTHORIZED)" 분기는 현재 HTTP로 도달 불가(방어적 게이트로만 작동). 실효 효과는 "로그인 비소유자의 DRAFT/HIDDEN 미리보기 허용". | 비로그인 미리보기 공유가 의도라면 preview 경로를 permitAll에 추가 필요. AUTH-08 상세 조회수의 익명 미도달과 동일 패턴. |
| 주의 | `PlanVo.java` | view_count는 PlanVo 응답 필드에 노출되지 않음 — 크리에이터 대시보드(F08-07 planViewTotal)에서만 집계 확인 가능. 앱 상세 화면에서 직접 조회수를 표시하려면 별도 필드 추가 필요(현재 미노출). | 현재 정책 유지: 상세 화면에 조회수 미표시, 대시보드 집계만 제공. |

## 9. 수용 기준

- **AC-01. 작성자가 DRAFT 플랜을 검토하고 발행 진입 (Happy Path)**: Given 자기 소유 플랜, status=DRAFT, 블록 5개 When 사용자가 해당 흐름을 실행하면 Then F08-05 발행 화면 진입
- **AC-02. PUBLISHED 작성자 본인 — 통계 + 판매 중지 / 복제**: Given status=PUBLISHED, purchaseCount=12 When 사용자가 해당 흐름을 실행하면 Then 새 DRAFT 플랜 124가 새 화면에 표시됨
- **AC-03. PUBLISHED 작성자 — 판매 중지 → HIDDEN**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 마켓에 노출되지 않음. 다시 발행할 수 있음
- **AC-04. 비구매 비작성자가 HIDDEN 플랜 진입**: Given 작성자가 발행 후 HIDDEN으로 전환한 플랜 When 비구매자가 상세/블록을 요청하면 Then FORBIDDEN이며 전체 본문은 노출되지 않음
- **AC-04-A. 기존 구매자의 HIDDEN 접근 유지**: Given 구매 완료 뒤 플랜이 HIDDEN When 구매자가 상세/블록/이벤트 생성을 요청하면 Then 기존 소유 권한이 유지되고 앱 블러가 없음
- **AC-05. 작성자가 DRAFT 플랜 삭제**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 목록에서 사라짐 (count는 status=DELETED 제외 카운트라 한도 회복)
- **AC-06. 잘못된 상태 전이 시도 — DRAFT에서 hide 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 상태 변경 없음
- **AC-07. 구매자가 미리보기 진입**: Given planId=123 구매 완료 When 사용자가 해당 흐름을 실행하면 Then 본문 열람 가능. 하단 "이 플랜으로 이벤트 만들기" 버튼
- **AC-08. 비구매자가 미리보기 진입**: Given `/plan/1002` 상세, status=DRAFT, isCreatorOwned=true When 사용자가 해당 흐름을 실행하면 Then 구매 유도
- **AC-09 (AUTH-08). 인증된 비소유자 상세 조회 → view_count 증가**: Given 타 사용자가 GET /api/v1/plans/{planId} 호출 When 조회 완료 Then view_count +1 원자 증가. 조회 응답 정상 반환. 증가 실패 시에도 응답 무중단.
- **AC-10 (AUTH-08). 크리에이터 본인 조회 → view_count 불변**: Given 작성자가 자기 PUBLISHED 플랜 조회 When 조회 완료 Then view_count 변화 없음.
- **AC-11 (AUTH-06). 익명 사용자가 DRAFT/HIDDEN 미리보기 진입 → 401**: Given GET /api/v1/plans/{planId}/preview, 비로그인, status=DRAFT When 요청 Then 서버 401 UNAUTHORIZED 반환.
- **AC-12 (AUTH-06). DELETED 플랜 미리보기 → 404**: Given GET /api/v1/plans/{planId}/preview, status=DELETED When 요청 Then 서버 404 PLAN_NOT_FOUND 반환.

## 10. 미결정 / 후속

- `PlanPreviewVo`도 `allowFreePoints`/`freePointPrice`를 직접 포함하고, 앱 preview/마켓 플랜 상세는 유료 플랜에서 무료 구매가 허용되면 PAID/FREE 선택 시트를 실제로 연다. `freePointPrice`가 null이면 기본가로 무료 결제하며, 무료 잔액 최종 판정은 서버가 담당한다.

## 11. 2026-07-29 소스 실측 보강

### 11.1 상세·preview·전체 본문은 서로 다른 계약

- `GET /plans/{id}`: DRAFT 작성자만, HIDDEN 작성자 또는 기존 구매자, DELETED 없음.
- `GET /plans/{id}/blocks`: 위 상태 게이트에 더해 PUBLISHED 유료 플랜은 작성자/구매자만. 무료 플랜은 인증 사용자 전체 읽기.
- `GET /plans/{id}/preview`: PUBLISHED 공개 의도, DRAFT/HIDDEN 로그인 사용자 preview 허용(person-specific 보류), DELETED 없음.
- `POST /plans/{id}/create-event`: 작성자 또는 구매자. HIDDEN 기존 구매자도 계속 가능하고 신규 구매만 막힌다.

### 11.2 티저 선택

- `properties.previewSample=true`인 known/non-envelope 블록이 있으면 문서 순서 최대 5.
- 없으면 텍스트 3 + 일정표 1 + 로그인 시 이미지 1 자동 폴백.
- 구매한 비작성자는 전체 본문을 쓰므로 `sampleBlocks=[]`; 작성자는 실제 판매 preview 검수용으로 티저를 받는다.
- 이미지 projection은 접근 게이트 통과 뒤 붙인다.

### 11.3 읽기 조판

상세는 별도 block provider로 전체 트리를 읽고, preview는 서버 `sampleBlocks`를 렌더링하며, 구매자는 이벤트 생성 CTA를 본다. 문서로 읽히는 표면(상세·읽기 모드)은 통독 조판을 쓴다.

- 읽기 모드는 커버·제목·작성자 머리를 세우고 본문 폭을 최대 680으로 묶는다.
- 본문은 16px, 줄간 1.65 이고 제목 위 여백이 넓다. 편집기와 같은 글자 크기·줄간을 쓴다.
- `BlockRenderer(reading:true)` 가 읽기 표면의 여백을 맡고 편집 표면과 나눈다.
- TABLE 은 표준 `rows` 와 옛 `columns + content JSON` 을 함께 읽는다. 읽을 수 없는 표는 원문 JSON 대신 「이 표를 표시할 수 없습니다.」 카드로 보인다.
- 2열 같은 작은 표는 가용 폭을 채우고, 열당 최소 96px보다 넓어지면 표 안만 가로로 넘긴다.
- 콘텐츠 역할별 색조와 링크·장소·파일·코드·영상 카드 표현을 쓴다.
