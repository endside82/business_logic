# 현재 소스 계약 노트 (2026-07-08 기준)

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.


> 범위: 2026-06-24 도메인 21 추가 이후 `community_api`, `community_app`, `community-realtime`, `community_admin_api`, 루트 `docs/plan`에서 확인된 구현분을 `business_logic/prd`와 `business_logic/docs`의 기존 기능 체계에 반영한다. 신규 도메인·기능 ID는 만들지 않는다. 카운트는 21개 도메인, 175개 기능, 1218개 시나리오, 552개 도식으로 유지한다.

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
