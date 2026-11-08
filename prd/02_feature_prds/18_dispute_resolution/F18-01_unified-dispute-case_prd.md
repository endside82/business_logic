# F18-01. 통합 분쟁 케이스 조회 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first; updated: 2026-06-05; source: community_api/src/main/java/com/endside/community/host/dispute/ -->

## 1. 결론

`DisputeCaseQueryRepository`가 원천 도메인 테이블을 Java-side union으로 읽어 `caseId={prefix}:{sourceId}` 형태의 통합 식별자로 단일 뷰를 제공한다. 각 원천 도메인의 고유 상태를 `UnifiedDisputeStatus` 5값으로 매핑하는 변환 헬퍼는 서버 측에서만 수행하며 클라이언트는 결과만 수신한다.

`DisputeSourceType` enum 21값은 케이스의 **컨텍스트 분류(sourceType 필드)** 용도이며, caseId prefix 집합과 1:1 대응하지 않는다. 실제 emit 범위는 아래 §4 제품 규칙의 조회 범위를 참조한다. `EVENT_NO_SHOW`는 enum에 존재하지 않는 **appeal dispatcher 전용 prefix**다.

참가자 시점(`GET /api/v1/me/dispute-cases`)과 호스트 시점(`GET /api/v1/host/dispute-cases`) 두 뷰를 제공하며, 동일 케이스도 조회 주체에 따라 다른 timeline/evidence visibility 필터가 적용된다.

SLA 스케줄러는 8개 source를 매일 06:00 KST에 독립 격리 스캔하여 7일 초과 미해결 케이스를 운영자 알림으로 발행한다. 상세 조회(`DisputeCaseDetailVo`)에는 타임라인, 증빙, `ActorPermissionFlags`(7개 boolean), `evidenceFrozen`이 포함된다.

**주의**: `DisputeCaseQueryRepository`가 caseId를 emit할 때 `OPERATIONAL_ISSUE:`, `WARNING_REPORT:`, `WARNING_APPEAL:`, `SETTLEMENT_APPEAL:`, `REFUND_DISPUTE:`, `EVENT_NO_SHOW:` 등 `DisputeSourceType` enum값과 다른 prefix도 사용된다. enum `DisputeSourceType`과 실제 caseId prefix는 1:1 대응이 아니다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DisputeCaseController`, `DisputeCaseService`, `DisputeCaseQueryRepository`, `DisputeSourceType`, `UnifiedDisputeStatus`, `DisputeCaseType`, `DisputeCaseVo`, `DisputeCaseDetailVo`, `ActorPermissionFlags`, `DisputeSlaExceededScheduler`. 앱: `my_dispute_cases_screen.dart`, `dispute_case_detail_screen.dart`, `dispute_case_api.dart`, `dispute_case_vo.dart`, `dispute_case_detail_vo.dart`, `dispute_enums.dart`, `my_dispute_cases_provider.dart`, `host_dispute_cases_provider.dart`, `dispute_case_detail_provider.dart`.

## 3. 전체 동작 흐름

1. 사용자가 `/me/disputes`(참가자) 또는 `/host/disputes`(호스트) 라우트로 진입한다.
2. `MyDisputeCasesScreen`(`asHost` flag로 분기)이 `myDisputeCasesProvider`(참가자) 또는 `hostDisputeCasesProvider`(호스트)를 구독한다.
3. Provider가 `DisputeCaseRepository.getMyCases(...)` 또는 `getHostCases(...)`를 호출하고 Retrofit이 `GET /api/v1/me/dispute-cases` 또는 `/host/dispute-cases`를 실행한다.
4. 서버 `DisputeCaseQueryRepository`가 대상 userId 기준으로 source row를 union하고, 각 row를 `DisputeCaseVo`로 변환한다. `caseId`는 `{prefix}:{sourceId}` 형태로 설정된다. 참가자 뷰는 7종 prefix + USER_DISPUTE 양측(reporter+target)을, 호스트 뷰는 SETTLEMENT_APPEAL + REFUND_DISPUTE 2종을 emit한다.
5. Flutter가 status 필터 칩(OPEN 그룹/종결 그룹) 또는 sourceType 필터로 표시 목록을 좁힌다. 무한 스크롤(`page` 증가).
6. 케이스 카드 탭 → `GET /api/v1/me(또는 host)/dispute-cases/{caseId}` → `DisputeCaseDetailVo` 수신.
7. 상세 화면이 `actorPermissions` flag를 기반으로 호스트/참가자 액션 패널을 분기하고, `evidenceFrozen=true`이면 증빙 삭제 버튼을 숨긴다. 타임라인 항목은 서버가 이미 visibility 필터링한 결과만 포함된다.

## 4. 제품 규칙

- 조회 범위(참가자): 내가 접수한 운영 문의(최근 200건), 내가 낸 경고 제보(제보 대상자는 클럽 권한이 필요해 제외), 내 경고 이의, 내가 낸 공개 신고(카풀 제외), 신고가 붙은 안전 차단, 내가 낸 카풀 신고, 클럽에서 강퇴·영구 차단된 내 건(차단 해제는 제외), 사용자 분쟁(신고자와 상대 양쪽). 정산 이의를 낸 사람 본인과 환불 분쟁의 구매자는 아직 이 목록에서 보이지 않는다.
- 조회 범위(호스트): 내 정산에 걸린 이의 전체, 내가 판매자인 환불 분쟁. 공개 신고의 호스트 쪽은 호스트 인박스가 맡는다.
- 케이스 번호가 잘못됐거나 없으면 찾을 수 없음, 권한이 없으면 접근 거절이다.
- 통합 상태는 접수, 검토 중, 상향, 해결, 종결 다섯 가지이다. 원천 상태는 대기·제출은 접수, 처리 중·추가 정보 요청은 검토 중, 승인·기각·인용·부분 인용은 해결, 철회와 운영자 마무리는 종결로 옮겨 보인다.
- 7일 넘게 해결되지 않은 케이스는 매일 오전 6시(한국 시간)에 운영자에게 알린다. 추가 정보 요청 중인 경고 제보와 상향된 공개 신고는 이 검사에서 뺀다. 한 종류의 검사가 실패해도 나머지는 계속한다.

### 종결과 보상

- 위 다섯 표시 상태와 따로, 사건마다 진행 상태가 하나 있다: 열림, 검토 중, 운영자 이관, 결정으로 종결, 처분 없이 종결(서로 동의한 종결 포함), 수동 수습으로 종결. 종결 셋은 끝 상태라 다시 열리지 않는다. 검토 중·이관에서 열림으로 돌아가지 않는다.
- 당사자 명령은 모두 같은 요청을 다시 보내면 처음 결과를 그대로 돌려준다. 모르는 사건·없는 사건·당사자가 아닌 사람은 모두 찾을 수 없음(404)으로 답한다.
  - 결과 확인: 확인했다는 기록만 남긴다. 상태도 이의 권리도 바뀌지 않는다.
  - 종결 동의: 이의 기회를 포기한다는 안내를 함께 보인다. 양쪽이 모두 동의하고 열린 이의가 없으면 사건이 처분 없이 닫힌다.
  - 운영자 이관: 사건을 운영자 이관 상태로 옮기고 운영자 대기열에 알린다.
  - 소명 대화: 메모, 보완 요청, 보완 답변을 쓴다. 쓴 사람의 역할과 보완 기한은 서버가 정한다. 운영자 내부 메모와 상대에게 간 보완 요청은 보이지 않는다.
- 운영자가 결정하면 그 결정이 낳는 보상 명령마다 보상 원장에 한 줄이 남는다(결정과 명령이 같으면 다시 실행해도 한 번만 나간다). 명령은 경고 제재 철회, 플랫폼 제재 철회, 숨긴 모임 사진 다시 보이기, 지운 모임 메시지 복원, 지운 클럽 댓글 복원, 배정 분쟁을 제공자 이행으로 확정, 보상 없음, 수동 수습이다. 노쇼 번복은 노쇼 판단이 호스트·클럽 운영진 몫이라 거절한다.
- 원장 줄의 상태는 보상 없음, 대기, 적용됨, 실패, 수동 수습이다. 대기나 실패가 하나라도 있으면 사건은 어느 종결로도 닫히지 않는다. 자동 보상 명령이 없는 일(출결 복원·강제 탈퇴 복원·정산 보류)은 운영자가 바깥에서 수습하기로 기록하고, 그 줄만 남은 사건은 수동 수습으로 종결로만 닫는다. 바깥에서 고쳤다고 해서 복구됨으로 적지 않는다.

## 6. 상태/권한 매트릭스

| 시나리오 | 서버 근거 | 프론트 분기 | 사용자 결과 |
|---|---|---|---|
| 참가자가 본인 케이스 목록 조회 | source별 finder 기준(§4 제품 규칙의 조회 범위) | `myDisputeCasesProvider` | source별 reporter/member/blocker/영향받은멤버/양측 기준으로 케이스 표시 |
| 호스트가 관련 케이스 목록 조회 | SETTLEMENT_APPEAL(creator) + REFUND_DISPUTE(seller) | `hostDisputeCasesProvider` | 자신이 creator 또는 seller인 케이스 표시 |
| `evidenceFrozen=true` 상세 | legal hold(OPEN/IN_REVIEW/ESCALATED) | 증빙 삭제 UI 숨김 | 증빙 파일 삭제 불가 |
| `canApproveAppeal=true` | 호스트/클럽 staff | 호스트 액션 패널 appeal 승인 버튼 | 서버 전이 endpoint 부재(Gap) — 버튼만 존재 |
| RESOLVED/CLOSED 케이스 | terminal status | 재접수 CTA 없음 | 조회만 가능 |
| 비권한 케이스 접근 | 서버 403 | `AppErrorState(title: '접근 권한이 없습니다')` | 차단됨 |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| caseId 형식 | `{prefix}:{sourceId}` (prefix는 enum값과 다를 수 있음) | `String caseId` 그대로 사용 | 일치 |
| Page 반환 | Spring `Page<DisputeCaseVo>` | `PageResponse<DisputeCaseVo>` | 일치 |
| actorPermissions 7 boolean | `ActorPermissionFlags` Java class | `ActorPermissionFlags` Freezed | 일치 |
| sourceTypeCounts | `Map<HostInboxSourceType, Long>` (서버) | `Map<String, int>` (Dart) | String key 사용으로 wire 일치, 타입 안전성 낮음 |
| evidenceFrozen | Java `boolean` → JSON `evidenceFrozen` | Dart `@Default(false) bool evidenceFrozen` | 일치 |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 — 부분 해소(2026-06-06) | **dispute 딥링크**: REFUND_DISPUTE_CREATED(92)/UPHELD(93)/OVERTURNED(94)는 앱 라우터에 **배선 완료** — `data.disputeId`→`REFUND_DISPUTE:{id}` caseId 조립→`/me/disputes/:caseId` 상세(앱 enum 3종 등재). **사실 정정**: USER_DISPUTE/CLUB_MEMBERSHIP_ACTION 등은 서버 caseId prefix로만 존재하고 사용자 알림 NotificationType·발송 경로가 없다(`DomainOutboxEventMapper` `case DISPUTE -> unsupported()`, SLA 스캐너는 `OperatorAlertService` 운영자 경보만) — 즉 FCM 알림 자체가 발화되지 않으며 "홈 fall-through 잔존"이 아니라 서버 알림 신설이 선행돼야 하는 영역 | `notification_router.dart`(refund 3종 배선됨) / `DomainOutboxEventMapper`(DISPUTE unsupported) | 해당 분쟁들은 사용자 알림 미발화라 라우팅만으로는 진입 불가 | (선행) 서버 분쟁 사용자 알림 타입·발송 경로 신설 → 이후 `myDisputeDetail`(`/me/disputes/:caseId`) 라우트 연결 |
| P1 | **canApproveAppeal 공개 endpoint 부재**: `ActorPermissionFlags.canApproveAppeal=true`이지만 호스트/클럽 staff가 appeal을 UPHELD/REJECTED로 전이하는 공개 API 없음. admin API 소유만. | `DisputeAppealService.java`: `withdrawAppeal`만 구현. `approve/reject` 없음 | 호스트 앱에서 이의 승인/거절 액션 불가. UI 버튼만 존재 | appeal 공개 전이 endpoint 추가 또는 admin API 경로 UX 설계 |
| P2 | **sourceTypeCounts Dart 타입 안전성**: `HostInboxStats.sourceTypeCounts`가 `Map<String, int>`로 역직렬화되어 `HostInboxSourceType` enum key 보장 없음 | `host_inbox_stats.dart` | 잘못된 key 무시됨 | `Map<HostInboxSourceType, int>` 또는 parser 추가 |
| P2 | **caseId prefix와 DisputeSourceType 비대응**: `DisputeCaseQueryRepository`가 `OPERATIONAL_ISSUE:`, `SETTLEMENT_APPEAL:`, `EVENT_NO_SHOW:` 등 enum에 없는 prefix를 emit. Dart는 `DisputeSourceType.fromWire`로 파싱 실패 시 null | 소스 Javadoc + dossier §2-A | 신규 prefix 추가 시 Dart enum 갱신 필요. 현재는 알려진 21값만 처리 | Dart fallback 처리 또는 서버-클라 prefix 동기화 문서화 |
| P3 | **SLA 알림 운영자 처리 흐름 미명시**: `DisputeSlaExceededScheduler`가 `OperatorAlertType.DISPUTE_SLA_EXCEEDED`를 발행하지만 ops 대시보드 수신/처리 흐름이 PRD에 없음 | `DisputeSlaExceededScheduler.java:scanSlaExceeded` | 운영팀이 알림 수신 경로 인지 필요 | 운영자 알림 대시보드 문서화 |

## 9. 수용 기준

### AC-01. 참가자 케이스 목록 조회

Given 로그인 사용자가 `/me/disputes`에 진입한다.
When `GET /api/v1/me/dispute-cases?page=0&size=20`을 호출한다.
Then source별 finder 기준(OPERATIONAL_ISSUE reporter·WARNING_REPORT reporter·WARNING_APPEAL member·REPORT reporter(CARPOOL 제외)·DATE_BLOCK blocker·TRANSPORT reporter·CLUB_MEMBERSHIP_ACTION 영향받은 멤버·USER_DISPUTE 양측)에 해당하는 케이스가 `DisputeCaseVo` 목록으로 반환되고, Flutter가 caseId/status/caseType을 카드로 표시한다.

### AC-02. 호스트 케이스 목록 조회

Given 호스트가 `/host/disputes`에 진입한다.
When `GET /api/v1/host/dispute-cases`를 호출한다.
Then 자신이 settlement creator인 SETTLEMENT_APPEAL 케이스와 seller인 REFUND_DISPUTE 케이스만 반환된다.

### AC-03. 상세 조회 권한

Given 참가자가 자신이 관련된 케이스의 `/me/disputes/{caseId}`에 진입한다.
When `GET /api/v1/me/dispute-cases/{caseId}`를 호출한다.
Then `DisputeCaseDetailVo`가 반환되며 timeline은 PARTIES/PUBLIC_SUMMARY visibility 항목만 포함된다. CS_ONLY 항목은 포함되지 않는다.

### AC-04. evidenceFrozen 잠금

Given 케이스 status가 OPEN, IN_REVIEW, ESCALATED 중 하나다.
When 상세 조회 시 `evidenceFrozen=true`가 반환된다.
Then Flutter 상세 화면에서 증빙 삭제 버튼이 숨겨진다.

### AC-05. SLA 스케줄러

Given 케이스가 createdAt 기준 7일 이상 경과하고 active 상태다.
When `DisputeSlaExceededScheduler.scanSlaExceeded()`가 실행된다.
Then `OperatorAlertType.DISPUTE_SLA_EXCEEDED` 알림이 idempotency_key와 함께 발행된다. 같은 케이스는 중복 발행되지 않는다.

### AC-06. status 필터

Given 사용자가 목록 화면에서 "종결" 필터를 선택한다.
When `GET /api/v1/me/dispute-cases?status=CLOSED`를 호출한다.
Then CLOSED 케이스만 반환된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 구현 | dispute 딥링크 | refund 3종(92/93/94)은 배선 완료. USER_DISPUTE/CLUB_MEMBERSHIP_ACTION은 서버 사용자 알림 타입·발송 경로 부재 — 라우팅에 앞서 서버 알림 신설 선행 필요(`DomainOutboxEventMapper` DISPUTE unsupported) |
| 구현 | appeal 승인/거절 공개 endpoint | 호스트용 `POST /host/dispute-cases/{caseId}/appeals/{appealId}/approve(reject)` 추가 여부 결정 |
| 운영 | SLA 알림 수신 경로 | 운영자 대시보드 또는 슬랙 등 알림 수신 채널 명시 필요 |
| 테스트 | union 정합성 검증 | 실제 emit source(사용자 7종+USER_DISPUTE / 호스트 2종) 각각에 대해 `caseId`, `status` 매핑, visibility 필터 시나리오 테스트 없음 |
