# 2026-07-08 현재 소스 갱신 노트

> 범위: 2026-06-24 도메인 21 추가 이후 `community_api`, `community_app`, `community-realtime`, `community_admin_api`, 루트 `docs/plan`에서 확인된 구현분을 `business_logic/prd`와 `business_logic/docs`의 기존 기능 체계에 반영한다. 신규 도메인·기능 ID는 만들지 않는다. 카운트는 21개 도메인, 175개 기능, 1218개 시나리오, 552개 도식으로 유지한다.

## 반영 원칙

1. 현재 소스에 존재하는 Controller/Service/VO/Flutter API/Provider/Screen 기준으로 쓴다.
2. 기존 기능 ID 안에 흡수한다. 예: 게스트 동반 예매는 F03-05/06/07/08/13/20에 걸친 현재 계약이지 신규 F03-21이 아니다.
3. 계획 문서에만 있는 항목은 "계획"으로 남기고, 소스·커밋·테스트 기록이 확인된 항목만 구현 사실로 쓴다.
4. `business_logic/prd_tools/generate_prd.mjs`는 legacy 전환 도구라 실행하지 않는다. 현재 source-first PRD를 덮어쓰면 안 된다.

## 현재 소스에서 확인한 큰 변경

| 묶음 | 현재 사실 | 반영 위치 |
| --- | --- | --- |
| 게스트 동반 예매 | 이벤트 예매 소유자가 계정 없는 동반자를 같은 예매에 묶을 수 있다. `allowGuests`, `maxGuestsPerBooking`, `partySize`, `guestNames`, `payableAmount`, 게스트 attendance row, 일행 관리/삭제/환불 preview가 서버와 앱에 들어왔다. 유료 이벤트는 잔여석 상한, 증분 결제, 라인 환불, 호스트 강제환불 경로를 사용한다. 게스트 노쇼는 소유자 패널티로 합산한다. | F03-05, F03-06, F03-07, F03-08, F03-13, F03-20, 결제 정책 |
| 게스트 동반 예매 hardening | 현재 워크트리에는 `CapacityService.removeByHost`와 `EventPartyService.removeGuest`가 event row를 먼저 lock한 뒤 attendance/application/payment row로 내려가도록 정렬한 deadlock 방지 변경이 포함되어 있다. 문서에서는 "락 순서 hardening 반영"으로 기록한다. | F03-05/F03-13 Gap/Risk, 돈·동시성 검토 |
| 궁합/핏 Phase 0 | 기존 GraphQL 추천/PreferenceRating/TasteNeighbor 기반을 걷어내고, 이벤트 피드백 후보/제출/내 통계와 데이트 만남 피드백을 라벨 인프라로 사용한다. 데이터 내보내기·삭제도 궁합 데이터를 포함한다. InterestTag 카탈로그는 서버 단일 출처로 정렬됐다. | F11-01, F11-05, F11-06, F09-06, F01-07, F13-04, 개인정보 정책 |
| 여행/플랜 블록 에디터 | 블록 분할/체크리스트/시간표/컨트롤러 정리, URL → bookmark/link card 제안, 모바일 IME Enter 분할, course map, 공개 preview teaser, 작성자 선택 sample preview, 시스템 공유와 Kakao 공유가 들어왔다. | F08-02, F08-03, F08-05, F08-10, F08-11 |
| 위치·길찾기 | 주소 → 좌표 geocode API가 추가되어 `0.0,0.0` 저장 위험을 낮췄고, 기존 reverse geocode와 함께 Kakao Local 기반 lookup이 양방향이 됐다. 위치 프라이버시 화면은 서버 access-log 대시보드를 실제 소비한다. 길찾기는 저장 주소/현재 위치 출발지와 좌표 null guard, 외부 지도 URL을 정리했다. | F14-04, F14-05, F14-06 |
| 연결성/커뮤니티 메시지 | Person access policy, block/report, 공통 맥락 한정 커뮤니티 메시지가 현재 소스에 들어왔다. 데이팅 채팅과 방/프로필/알림 payload를 공유하지 않는다. `COMMUNITY_MESSAGE(8)` 신고 mirror와 `/community-chat` realtime namespace가 사용된다. | 사람·관계/신뢰 정책 노트. 2026-07-08에는 신규 기능 ID를 만들지 않는다. |
| 재사용 경험 루프 | 이전 이벤트/정기모임/클럽 반복을 다음 실행으로 이어 주는 loop가 보강됐다. 유료 반복·정기모임 세션·클럽 recurrence에서 결제/정산/host cost type/비공개 clone 처리를 함께 본다. | F03 반복/리스케줄, F17, F04 recurrence, 결제 정책 |
| Auth/Search/Notification app surface | 비밀번호 재설정 request/confirm, 이메일 인증 재발송/검증, 검색 typed result(`/search/clubs`, `/search/plans`), 검색 history roundtrip, saved-search CRUD/execute, NotificationRouter의 reschedule/recap/feedback/date-meeting/dispute 딥링크가 Flutter에 배선되어 있다. | F01-03/04/06, F05-01/04/05, F12-01, 알림 정책 |
| QA current | Flutter current expansion QA의 단일 truth는 `community_app/docs/testing/SCENARIO_TEST_STATUS_CURRENT.md`와 `SCENARIO_COVERAGE_DASHBOARD_CURRENT.md`다. 2026-07-08 문서화 기준으로 canonical 53개 scenario는 53/53 close, active pending-run/merge/gap은 0이다. P83 communication runner는 존재하지만 current 53/53 canonical에는 아직 포함하지 않는다. | `04_qa_acceptance`, `docs/qa/*` |

## 반드시 지킬 사실

- 게스트는 계정 없는 동반 인원이며 `event_attendance`의 `GUEST` 행으로 저장된다. 돈·소명·노쇼 책임은 예매 소유자 계정에 귀속된다.
- 게스트는 리뷰, 궁합/핏, 메시지, 프로필 대상이 아니며 위치 공유·거리 계산·피드백 후보에서도 제외한다.
- 결제 후 게스트 추가/삭제는 무승인 이벤트의 WALLET 흐름을 중심으로 다룬다. 승인제 이벤트와 BANK_TRANSFER는 잠금/제한으로 설명한다.
- 커뮤니티 메시지는 `/api/v1/community/chats`와 `/community-chat` namespace의 별도 맥락 한정 1:1 메시지다. 데이팅 매치 기반 영구 DM으로 쓰지 않는다.
- 이벤트 선택 피드백은 받은 선택을 노출하지 않고, 응답자 본인 관점의 후보/제출/내 이력/내 통계만 제공한다.
- `TasteProfileService`의 현재 긍정 태그 가중치 원천은 legacy `PreferenceRating`이 아니라 `EventFeedbackChoice`의 긍정 `ImpressionTag`다.
- 정기모임 FIXED는 세션별 참가비가 0으로 강제되고, 세션별 과금은 VARIABLE 전용이다.
- 다음 회차 생성에서 `carryProviderAssignments=true`는 제공자 id와 role만 새 DRAFT 배정으로 복제한다. 결제, 계약금, 정산, 과금, plan purchase 권리는 이관하지 않는다.
- 길찾기는 현재 위치 또는 저장 주소를 출발지로 선택하고 외부 지도 앱 링크를 여는 화면이다. 실제 내장 turn-by-turn/polyline 경로 안내로 설명하지 않는다.

## 반영하지 않는 것

- 도메인 22 또는 신규 기능 ID 신설.
- "전체 GPS 자동 업로드가 완전히 검증됐다"는 표현. 위치 공유 자동 갱신은 별도 시나리오로 계속 검증해야 한다.
- 커뮤니티 메시지를 데이팅 채팅의 변형으로 설명하는 표현. 두 채널은 신원·권한·realtime namespace를 분리한다.
- legacy PreferenceRating/GraphQL 추천을 현재 추천 파이프라인의 중심으로 쓰는 표현.
- live SMTP/FCM/SMS/PG/지도 키 검증 완료, staging 실증 완료.
- 커뮤니티 채팅 알림 딥링크 구현 완료. 현재 NotificationRouter에는 community chat 전용 타입 매핑 근거가 없다.

## 후속 문서화 후보

- 커뮤니티 메시지/PersonSheet를 독립 기능 ID로 승격할지 결정.
- 게스트 동반 예매를 이벤트 도메인 대표 여정과 money-flow HTML에 더 촘촘히 연결.
- 위치 공유 자동 갱신·종료 후 삭제·access log 노출을 E2E 결과와 함께 재점검.
