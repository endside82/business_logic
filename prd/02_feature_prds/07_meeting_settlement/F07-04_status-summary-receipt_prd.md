# F07-04. 정산 현황 / 요약 / 영수증 (Status & Summary & Receipt) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

정산 본체 조회, 정산 요약(참가자별 net 포지션 + transfer 리스트), 항목 영수증의 settlement-scope presigned 다운로드 URL 발급. 호스트와 참가자 모두 접근 가능 — 열람 자격은 2026-06-05부터 **ATTENDING 참가자 ∪ 해당 정산 share/transfer 당사자 ∪ 호스트**(`validateSettlementReadAccess`, DEC-V7)로 확장됐다. 모든 상태(DRAFT/ACTIVE/COMPLETED/CANCELLED)에서 호출되며, **DRAFT && 비호스트 요청에는 차등 노출(DEC-V6)이 서버에서 강제**된다: 본체 note 마스킹, summary 본인 행만, items 빈 목록, 영수증 다운로드 URL 발급 거부.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 이벤트 상세 → "모임 정산" 메뉴(호스트‖ATTENDING에게 항상 노출, 2026-06-05 신설 — DEC-V8) → status 화면. 정산이 없으면 참가자는 "아직 정산이 없어요" 빈 상태, 호스트는 "정산 만들기" CTA
- 정산 활성화 알림 푸시 → 딥링크 → status 화면
- 정산 완료/취소 알림 → 딥링크 → status 화면
- 본인 정산 이력 화면(F07-10) → 카드 탭 → status 화면

## 2. 코드 위치

계약의 정본은 코드다. 서버: `MeetingSettlementController`, `UserService`, `FileStorageService`. 앱: `event_detail_screen.dart`, `settlement_status_screen.dart`, `settlement_receipt_viewer_screen.dart`, `settlement_summary_card_widget.dart`, `participant_status_list_widget.dart`, `participant_share_card_widget.dart`, `settlement_receipt_gallery_widget.dart`.

<!-- source-references:start -->
서버 창구: `MeetingSettlementController#getSettlement`, `MeetingSettlementController#getSettlementSummary`, `MeetingSettlementController#getReceiptDownloadUrl`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

status 화면 진입 시:
1. `settlementDetailProvider(eventId)` ▶ `MeetingSettlementRepository.getSettlement` ▶ `GET /api/v1/events/:id/settlement`
2. `settlementSummaryProvider(eventId)` ▶ `GET /api/v1/events/:id/settlement/summary`
3. `eventDetailNotifierProvider(eventId)` ▶ host/staff 권한 판정 (myRole)
4. `authNotifierProvider` ▶ currentUserId 확보
5. (manager + ACTIVE) `appealsProvider(eventId)` ▶ PENDING appeal 카운트로 차단 UI 표시 가능
6. (manager) `auditLogProvider(eventId)` ▶ 감사 로그 진입 시

영수증 뷰어 진입 시:
1. `meetingSettlementRepository.getReceiptDownloadUrl(eventId, fileId)` ▶ `GET .../receipts/{fileId}/download-url`
2. 응답 `PresignedUrlVo.downloadUrl` 받아 `CachedNetworkImage`에 전달

## 4. 제품 규칙

- 납부 진척률은 완료 금액을 분담 합계로 나눈 값이고, 미납자만 보기를 켤 수 있다.
- 끝난 정산에는 버튼이 없고 「정산이 완료되었습니다」 또는 취소 라벨만 보인다.
- 영수증을 못 받으면 「영수증을 불러올 수 없습니다」와 다시 시도를 보인다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | (Happy Path · 호스트) 활성화된 정산의 진행률 모니터링 | settlement ACTIVE, 5명 분담, 2명 결제 완료 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S2 | (Happy Path · 참가자) 본인 분담 확인 + 영수증 열람 | 본인은 ATTENDING, settlement ACTIVE | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | (엣지 · 비참가자 차단) 다른 모임 사용자가 settlement summary 호출 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | (엣지 · 우회 fileId 차단) 임의 fileId로 영수증 URL 요청 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | (참가자 · DRAFT 단계 조회) 정산이 아직 활성화되지 않음 | 본인 ATTENDING(또는 share 당사자), settlement DRAFT | 미리보기 배너("정산자가 작성 중이에요") + 총액·상태·내 분담금만 노출. note 마스킹, items 빈 목록, 영수증 URL 발급 거부, summary 본인 행만 (2026-06-05 차등 노출) |
| S6 | (호스트 · COMPLETED 상태) 정산 완료 후 회고 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | (호스트 · CANCELLED 상태) 취소된 정산 회고 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | (UX · 풀투리프레시) 호스트가 결제 진행률을 1초 단위로 갱신 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 현황 화면 입구 | 정산 현황 화면은 실제로 주고받을 돈 목록과 내 몫 화면으로 가는 입구를 둔다. 내 몫은 따로 보인다 | 없음 |
| ~~Gap (P2)~~ 해소 (2026-06-05) | `app_router.dart` 정산 read 게이트 재구성 | ~~비ATTENDING share/transfer 당사자 앱 진입 불가~~ → read 게이트가 **캐시된 이벤트 상세로만 빠른 통과**(게이트의 이벤트 상세 fetch 부작용 — 조회수 기록·DRAFT 이벤트 404 차단 — 제거) + **부작용 없는 BE 판정 폴백**(`getMyShares` → `validateSettlementReadAccess`)으로 변경. 지갑 모임정산 목록(SCR-PA-005)이 해당 사용자의 진입 경로 | 완료 — hostOnly 분기는 보수적 통과 유지 |
| ~~Gap (P3)~~ 해소 (2026-06-06) | `MeetingSettlementDraftCleanupScheduler` (신규) | ~~오래된 DRAFT 자동 정리 없음~~ → DRAFT 30일 방치 시 `CANCELLED` 전이(삭제 아님 — 복구 여지 보존, audit + 호스트 알림)+PENDING 수동 transfer 동반 취소. D-3=30일. 상세는 F07-03 §4 | 완료 |

## 9. 수용 기준

- **AC-01. (Happy Path · 호스트) 활성화된 정산의 진행률 모니터링**: Given settlement ACTIVE, 5명 분담, 2명 결제 완료 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-02. (Happy Path · 참가자) 본인 분담 확인 + 영수증 열람**: Given 본인은 ATTENDING, settlement ACTIVE When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. (엣지 · 비참가자 차단) 다른 모임 사용자가 settlement summary 호출**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. (엣지 · 우회 fileId 차단) 임의 fileId로 영수증 URL 요청**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. (참가자 · DRAFT 단계 조회) 정산이 아직 활성화되지 않음**: Given 본인 ATTENDING(또는 해당 정산 share 당사자), settlement DRAFT When 참가자가 정산 화면을 열면 Then 미리보기 배너와 총액·상태·내 분담금만 보이고, note는 null, items는 빈 목록, 영수증 URL 발급은 FORBIDDEN, summary는 본인 행만 반환된다 (서버 강제 차등 노출 — 2026-06-05)
- **AC-06. (호스트 · COMPLETED 상태) 정산 완료 후 회고**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. (호스트 · CANCELLED 상태) 취소된 정산 회고**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. (UX · 풀투리프레시) 호스트가 결제 진행률을 1초 단위로 갱신**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
