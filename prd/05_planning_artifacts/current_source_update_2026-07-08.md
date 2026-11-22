# 2026-07-08 소스 조사 기록

<!-- release-document: reference -->
> **문서 구분: 과거 소스 조사 원문.** 2026-11-22 전체 원문을 읽고 과거 기록으로 분리했다. 아래의 현재 안내와 당시 기록을 구분한다. 당시의 ‘현재’, Gap/Risk, 완료·미완료와 수치는 해당 조사 시점의 표현이다.

## 지금 확인할 기준

- 제품 동작은 [기능별 PRD](../02_feature_prds/), 공통 규칙은 [공통 정책](../03_policy_prds/), 내용 대조 범위는 [문서 전환·대조 상태](../PRD_MIGRATION_STATUS.md)와 [문서별 대조 기록](../../verification/document-refresh-2026-11-22.json)을 따른다.
- 현재 작업과 승인된 답은 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)을 따른다. 이 노트의 과거 결함·후속 후보를 현재 미완료 목록으로 다시 등록하지 않는다. 반대로 과거라는 이유만으로 모두 해결됐다고 판정하지도 않는다.
- 현재 인벤토리는 [21개 영역·175개 기능 목록](../00_prd_items/05_feature_definitions.md)과 [기능별 수용 기준 표](../04_qa_acceptance/acceptance_criteria_matrix.md)를 따른다. 당시 시나리오·도식 숫자를 현재 집계나 시험 통과 수로 재사용하지 않는다.
- 관리자 서버는 현재 `community_api/admin-app` 모듈이다. 원문에 있는 옛 `community_admin_api` 명칭은 조사 이력이다. 현재 저장소 관계와 로컬 원천 자료의 역할은 [PRD 문서 입구](../README.md)를 따른다.
- 소스 대조는 실행 성공·외부 연동·실기기 확인·공개 승인이 아니다. 원천 메모나 당시 생성 절차로 교정된 현재 PRD를 일괄 덮어쓰지 않는다.

## 당시 주제의 현재 진입점

| 당시 주제 | 현재 정본 |
|---|---|
| 동반 게스트·신청·출석·노쇼 | [이벤트 영역](../01_domain_prds/03_이벤트_prd.md) |
| 선택형 피드백·취향과 본인 기록 | [리뷰·신고 영역](../01_domain_prds/11_리뷰_and_신고_prd.md) |
| 정기모임 결제·회차·배정 복제 | [정기모임 영역](../01_domain_prds/17_정기모임_prd.md), [제공자 배정·정산 영역](../01_domain_prds/21_제공자_배정_정산_prd.md) |
| 길찾기·좌표 공유·열람 기록 | [위치·길찾기 영역](../01_domain_prds/14_위치_and_길찾기_prd.md) |
| 대화와 알림 이동 | [알림 정책](../03_policy_prds/notification_policy_prd.md), [개인정보·안전 정책](../03_policy_prds/privacy_safety_policy_prd.md) |

커뮤니티 대화와 데이팅 대화를 같은 채널로 합치지 않는다. 원문의 ‘전용 알림 이동 근거 없음’ 같은 당시 판정은 현재 알림·라우터 근거로 다시 판단하며 이 노트에서 현행 결함이라고 선언하지 않는다.

## 과거 소스 조사 원문 보존

아래 원문은 수정 전 내용 그대로다. 원문의 날짜·식별자·기술 명칭·판정은 역사 기록이며 위 현재 안내와 분리한다.

<a id="현재-소스-계약-노트-2026-07-08-기준"></a>
<a id="반드시-지킬-사실"></a>
<a id="반영하지-않는-것"></a>
<a id="후속-문서화-후보"></a>

> # 현재 소스 계약 노트 (2026-07-08 기준)
>
> <!-- release-document: reference -->
> > **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 작업 순서는 [앞으로 할 일](../../../docs/plan/NEXT_WORK.md)을 따릅니다.
>
>
> > 범위: 2026-06-24 도메인 21 추가 이후 `community_api`, `community_app`, `community-realtime`, `community_admin_api`, 루트 `docs/plan`에서 확인된 구현분을 `business_logic/prd`와 `business_logic/docs`의 기존 기능 체계에 반영한다. 신규 도메인·기능 ID는 만들지 않는다. 카운트는 21개 도메인, 175개 기능, 1218개 시나리오, 552개 도식으로 유지한다.
>
> ## 반드시 지킬 사실
>
> - 게스트는 계정 없는 동반 인원이며 `event_attendance`의 `GUEST` 행으로 저장된다. 돈·소명·노쇼 책임은 예매 소유자 계정에 귀속된다.
> - 게스트는 리뷰, 궁합/핏, 메시지, 프로필 대상이 아니며 위치 공유·거리 계산·피드백 후보에서도 제외한다.
> - 결제 후 게스트 추가/삭제는 무승인 이벤트의 WALLET 흐름을 중심으로 다룬다. 승인제 이벤트와 BANK_TRANSFER는 잠금/제한으로 설명한다.
> - 커뮤니티 메시지는 `/api/v1/community/chats`와 `/community-chat` namespace의 별도 맥락 한정 1:1 메시지다. 데이팅 매치 기반 영구 DM으로 쓰지 않는다.
> - 이벤트 선택 피드백은 받은 선택을 노출하지 않고, 응답자 본인 관점의 후보/제출/내 이력/내 통계만 제공한다.
> - `TasteProfileService`의 현재 긍정 태그 가중치 원천은 legacy `PreferenceRating`이 아니라 `EventFeedbackChoice`의 긍정 `ImpressionTag`다.
> - 정기모임 FIXED는 세션별 참가비가 0으로 강제되고, 세션별 과금은 VARIABLE 전용이다.
> - 다음 회차 생성에서 `carryProviderAssignments=true`는 제공자 id와 role만 새 DRAFT 배정으로 복제한다. 결제, 계약금, 정산, 과금, plan purchase 권리는 이관하지 않는다.
> - 길찾기는 현재 위치 또는 저장 주소를 출발지로 선택하고 외부 지도 앱 링크를 여는 화면이다. 실제 내장 turn-by-turn/polyline 경로 안내로 설명하지 않는다.
>
> ## 반영하지 않는 것
>
> - 도메인 22 또는 신규 기능 ID 신설.
> - "전체 GPS 자동 업로드가 완전히 검증됐다"는 표현. 위치 공유 자동 갱신은 별도 시나리오로 계속 검증해야 한다.
> - 커뮤니티 메시지를 데이팅 채팅의 변형으로 설명하는 표현. 두 채널은 신원·권한·realtime namespace를 분리한다.
> - legacy PreferenceRating/GraphQL 추천을 현재 추천 파이프라인의 중심으로 쓰는 표현.
> - live SMTP/FCM/SMS/PG/지도 키 검증 완료, staging 실증 완료.
> - 커뮤니티 채팅 알림 딥링크 구현 완료. 현재 NotificationRouter에는 community chat 전용 타입 매핑 근거가 없다.
>
> ## 후속 문서화 후보
>
> - 커뮤니티 메시지/PersonSheet를 독립 기능 ID로 승격할지 결정.
> - 게스트 동반 예매를 이벤트 도메인 대표 여정과 money-flow HTML에 더 촘촘히 연결.
> - 위치 공유 자동 갱신·종료 후 삭제·access log 노출을 E2E 결과와 함께 재점검.
