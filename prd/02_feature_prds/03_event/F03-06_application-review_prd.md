# F03-06. 신청서 승인/거절 (호스트) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

호스트/공동호스트가 승인 필요(`approvalRequired=true` 또는 `visibility=APPROVAL`) 이벤트의 PENDING 신청서를 승인하거나 거절한다. 현재 구현은 승인 시 자동으로 `event_attendance` 레코드를 ATTENDING 또는 WAITING으로 만들어 currentCapacity를 증가시키며 정원 초과는 비관적 잠금으로 동시성 보호된다. 승인/거절 결과는 신청자에게 FCM 푸시(`APPLICATION_APPROVED` / `APPLICATION_REJECTED`)로 fanout된다. 본 단위는 신청 처리만 다루며, 신청서 작성·취소(참가자 시점)는 F03-05에서 다룬다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세(F03-02) ▶ 호스트 액션바 또는 더보기 ▶ "신청서 관리" ▶ `/home/events/:eventId/applications`
- 호스트 알림(F12) `NEW_APPLICATION` 푸시 ▶ 딥링크 ▶ 신청서 목록
- 마이 이벤트(F03-12) "주최 중" 카드 ▶ 상세 ▶ "신청서 관리"

## 2. 코드 위치

계약의 정본은 코드다. 서버: `EventController`, `ApplicationStatus`, `ApplicationService`, `ApplicationRejectReasonCode`, `ApplicationDecisionLog`, `ApplicationDecisionType`, `CapacityService`. 앱: `application_list_screen.dart`.

<!-- source-references:start -->
서버 창구: `EventController#getApplications`, `EventController#approveApplication`, `EventController#rejectApplication`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 진입: `applicationListNotifierProvider(eventId).build()` ▶ `ApplicationRepository.getApplications(eventId)` ▶ `GET /api/v1/events/{id}/applications` (List 반환)
2. 승인: `notifier.approve(appId)` ▶ `ApplicationRepository.approve(eventId, appId)` ▶ `POST .../approve` ▶ 성공 시 `invalidateSelf` (전체 목록 재조회)
3. 거절: `notifier.reject(appId)` ▶ `ApplicationRepository.reject(eventId, appId)` ▶ `POST .../reject` ▶ `invalidateSelf`
4. 사이드 효과: 승인 시 `eventDetailNotifier(eventId)` invalidate가 필요할 수 있음 (currentCapacity 갱신을 위해) — 코드에는 없으나 UX 권장
5. 일괄 처리: 선택된 IDs를 `for ... await notifier.approve` 순차 호출
6. 유료 승인제 승인 성공 시: 신청 목록, 이벤트 상세, 알림 카운트를 갱신하되 currentCapacity는 결제 전 reservation 정책에 따라 별도 표시

## 4. 제품 규칙

- 보기·승인·거절은 호스트와 활성 공동호스트만 한다. 클럽 운영진은 빠진다. 다른 모임의 신청은 없는 신청과 같은 답이다.

### 승인 때의 결과
| 조건 | 결과 |
|---|---|
| 선입금 모임 | `APPROVED_PENDING_PAYMENT`, 결제 뒤 참석 확정 |
| 무료, 자리 있음 | `APPROVED` + `ATTENDING` |
| 무료, 대기로 감 | `APPROVED` + `WAITING`(순번 부여) |
| 자리 없음 | `CAPACITY_FULL` |
| 유료인데 선입금 꺼짐 | `EVENT_REQUIRES_PREPAYMENT` |

- 유료 잔여석은 한도에서 참석과 결제 대기 일행 합을 뺀 값이 일행 크기 이상이어야 한다. 0 이하면 `CAPACITY_FULL`, 모자라면 `EVENT_GUEST_CAPACITY_EXCEEDED` 다.
- 결제 전 신청은 실제 참석자처럼 보이지 않는다.
- 비공개 모임은 승인이 아니라 선정이다(`EVENT_PRIVATE_MEETING_APPROVAL_NOT_ALLOWED`). 일정·장소 투표가 끝나기 전에는 승인하지 못한다(`EVENT_DECISION_PENDING`). 이미 직접 참석 중이면 `ALREADY_ATTENDING` 이다.
- 신청 뒤 부과된 제재가 승인을 우회하지 못하게 참석을 만들 때 다시 본다.

### 거절 사유
- 거절에는 사유 코드가 필수다. 없으면 `APPLICATION_REJECT_REASON_REQUIRED` 다.
- 값: `CAPACITY_FULL`(정원 부족), `ELIGIBILITY_NOT_MET`(자격 미충족), `SANCTIONED`(제재), `HOST_DISCRETION`(호스트 재량), `DUPLICATE_PROFILE`(중복·허위 프로필 의심), `PAYMENT_TIMEOUT`(결제 만료, 자동 거절에만), `OTHER`(기타).

### 결정 이력
- 모든 신청 전이를 덧붙이기로만 남기고 고치거나 지우지 않는다. 재신청은 차수가 오른다. 시스템 행위자는 번호 0 이다.
- 종류: `APPLY`, `APPROVE`, `REJECT`, `CANCEL`, `REAPPLY`, `AUTO_REJECT`(결제 기한 만료 등), `PAYMENT_CONFIRM`(결제 확정).

### 화면
- 일괄 승인·거절은 한 건씩 보내고 결과를 모아 알린다("3건 승인, 1건 실패").
- 정원이 차서 승인이 막히면 정원을 늘리거나 참석자를 뺀 뒤 다시 하라고 안내하고 정원 설정으로 보낸다.
- 오류의 뜻: `APPLICATION_NOT_FOUND` 신청 없음, `APPLICATION_INVALID_STATUS` 이미 처리됨, `EVENT_NOT_OWNER` 권한 없음.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 단건 승인 (Happy Path) | ATTENDING 5명, baseCapacity 10, PENDING 신청 3건. | 1건 APPROVED, currentCapacity 6/10. |
| S2 | 정원 초과 시 승인 시도 | ATTENDING 10명 = baseCapacity 10, PENDING 1건, waitlistEnabled=false. | 정원 확장 후 승인 완료. |
| S3 | 정원 초과 + 대기열 활성 시 승인 → WAITING 자동 등록 | ATTENDING 12=baseCapacity, PENDING 1건, waitlistEnabled=true, 대기 1명. | 정원 확장하지 않으면 승인 불가. |
| S4 | 거절 | 호스트. | 거절 처리 + 신청자 알림. |
| S5 | 일괄 승인 (C-01) | 호스트, PENDING 5건. | 부분 처리 + 사용자 안내. |
| S6 | 이미 처리된 신청 재처리 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 권한 없는 사용자 진입 | 일반 사용자. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 자가 취소된 신청 | 신청자가 PENDING 상태에서 본인이 취소(F03-05). | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S9 | eventId mismatch (path 변조) | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S10 | 동시성 — 두 호스트가 동시 승인 | 호스트 A + 공동호스트 B. | 동시성 안전 — 정원 초과 방지. |
| S11 | 유료 승인제 신청 승인 → 결제 대기 상태로 전환 | event.price=20,000, approvalRequired=true, PENDING 신청 1건, currentCapacity=8/10. | 시드 무변동, capacity 불변, 멱등. **출처: ApplicationService.java:230-233** |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | backend.md:77 | #### 유료 승인제 승인 보강 필요 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | backend.md:114 | - **반환 타입**: `getApplicationsByEvent`는 **List**. CR-04 history에서 `PageResponse`로 잘못 매핑한 사례가 있어 주의. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:28 | - 유료 승인제 보강 상태: `APPROVED_PENDING_PAYMENT` 또는 결제 대기 필드가 도입되면 "승인됨 · 결제 대기" 뱃지와 결제 기한 표시 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:46 | - 거절 시 사유 입력 (선택) — 현재 코드는 사유 없이 거절만 가능 (서버는 reason 받지 않음). UI에서 입력받아 클라이언트 노트로만 저장하는 정책은 미정. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:30 | [E2E 보강: seed_event_application_lifecycle_test.dart (E2E_EXPECT_MANAGE_CONTROLS=true) — 호스트가 상세에서 "신청서 관리" CTA 진입 후 `screenEventApplications`로 들어가면 4개 탭 헤더("전체", "심사중", "승인", "거절")가 노출되고, 각 탭에서 seed pendingNickname / approvedNickname / rejectedNickname 카드가 분류되어 보이는지 검증. (탭 구현은 `screenEventApplicationsTabPending/Approved/Rejected` semantics ID로 라우팅.) seed_event_detail_role_controls_test.dart (host) — 호스트가 신청서 관리 진입 후 "전체" 탭이 기본 활성으로 노출되는지 surface 검증.] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:155 | **현재 구현 갭**: | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:162 | - 결제 전 사용자가 체크인 대상, 리뷰 대상, 위치공유 대상에 포함되면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:163 | - 결제 기한 만료 후 결제 API가 성공하면 실패로 본다. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 단건 승인 (Happy Path)**: Given ATTENDING 5명, baseCapacity 10, PENDING 신청 3건. When 사용자가 해당 흐름을 실행하면 Then 1건 APPROVED, currentCapacity 6/10.
- **AC-02. 정원 초과 시 승인 시도**: Given ATTENDING 10명 = baseCapacity 10, PENDING 1건, waitlistEnabled=false. When 사용자가 해당 흐름을 실행하면 Then 정원 확장 후 승인 완료.
- **AC-03. 정원 초과 + 대기열 활성 시 승인 → WAITING 자동 등록**: Given ATTENDING 12=baseCapacity, PENDING 1건, waitlistEnabled=true, 대기 1명. When 사용자가 해당 흐름을 실행하면 Then 정원 확장하지 않으면 승인 불가.
- **AC-04. 거절**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 거절 처리 + 신청자 알림.
- **AC-05. 일괄 승인 (C-01)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 부분 처리 + 사용자 안내.
- **AC-06. 이미 처리된 신청 재처리 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 권한 없는 사용자 진입**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 자가 취소된 신청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-09. eventId mismatch (path 변조)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-10. 동시성 — 두 호스트가 동시 승인**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 동시성 안전 — 정원 초과 방지.
- **AC-11. 유료 승인제 신청 승인 → 결제 대기 상태로 전환**: Given event.price=20,000, approvalRequired=true, PENDING 신청 1건, currentCapacity=8/10. When 사용자가 해당 흐름을 실행하면 Then 시드 무변동, capacity 불변, 멱등. **출처: ApplicationService.java:230-233**
