# F08-13. 구매 플랜으로 모임 만들기·후기 작성 PRD

<!-- release-document: reference -->
> 2026-11-22 소스 대조. 모임 초안 생성·재시도와 상품 후기 작성·수정·삭제의 현재 계약이다. 새 실행 통과 기록이 아니며 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 실제 입구와 종료 지점

구매한 [플랜 상세](F08-02_plan-detail_prd.md)에서 호스트 자격이 있으면 **이 플랜으로 이벤트 만들기**, 없으면 **이벤트 열기 신청하기**를 제공한다. [보관함](F08-12_my-collection_prd.md)의 이벤트 패키지 전달 결과도 모임 작성으로 연결된다. 경로는 `/plan/{planId}/create-event`, 이름은 planCreateEvent이며 호스트 라우트 가드를 적용한 전체 화면 대화상자다.

생성이 성공하면 `/home/events/{eventId}`의 **DRAFT 모임 상세**로 이동한다. 모집 공개·참가비 수납·반복 일정 설정까지 이 동작 하나로 완료하지 않는다. 후기 입구는 [마켓 상품 상세](F08-10_market-item-detail_prd.md)의 작성 단추와 본인 후기 카드의 수정·삭제 메뉴다. 후기 성공은 상품 상세 안에서 결과를 확인한다.

## 코드 위치

서버 모임 생성은 `PlanController`, `PlanService`, `PlanEventAddParam`, `PlanEventDraftAdapter`, `PlanEventResponseVo`, `MarketAbilityPolicy`, `MemberCommandReceiptExecutor`를 따른다. 후기는 `MarketItemReviewController`, `MarketItemReviewService`, 상세 집계는 `MarketItemService`와 `ItemReviewQueryRepository`가 근거다.

앱은 `plan_event_create_screen.dart`, `plan_event_draft_storage.dart`, `plan_detail_provider.dart`, `plan_detail_screen.dart`, `plan_market_routes.dart`, 플랜 API·Repository를 대조했다. 후기 작성 대화상자·상품 상세·후기 공급자는 F08-10의 입구 근거를 재사용하고 변경·실패·목록 갱신을 추가 확인했다.

<!-- source-references:start -->
서버 창구: `PlanController#createEventFromPlan`, `MarketItemReviewController#createReview`, `MarketItemReviewController#updateReview`, `MarketItemReviewController#deleteReview`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 모임 초안의 입력과 초기값

작성 화면은 계정·플랜별 저장된 내용을 먼저 복원한다. 저장 내용이 없을 때 플랜으로 인원·주소를 한 번 채운다. 인원은 기본 10에서 플랜 maxParticipants가 양수이면 바꾸고, 주소가 비어 있고 좌표가 없을 때 플랜 주소를 사용한다. 플랜 좌표는 위도·경도가 함께 있어야 가져온다. 복원하거나 사용자가 바꾼 값을 뒤늦은 플랜 응답으로 덮어쓰지 않는다.

일시는 필수다. 날짜 선택기는 서울 날짜 기준 오늘부터 365일 뒤까지이며 날짜·시간을 서버 벽시계 값으로 만든다. UI의 날짜 선택 범위를 모든 직접 API 요청의 서버 허용 범위라고 확대하지 않는다. 오프라인은 주소·상세 주소·좌표, 온라인은 URL을 보내며 반대 유형의 필드는 보내지 않는다. 장소 이름은 CONTENT_PLACE가 열려 있고 오프라인일 때만 보낸다.

앱 공개 범위 선택은 PUBLIC/PRIVATE 두 개다. **서버 EventVisibility는 PUBLIC·LINK·APPROVAL·PRIVATE 네 값**이며 장소 유형은 OFFLINE/ONLINE이다. 서버 enum 파서는 앞뒤 공백과 대소문자를 정규화하고 빈 값·미정의 값을 INVALID_INPUT으로 거절한다. 앱의 선택지 수와 서버 enum 전체를 동일하게 적지 않는다.

요청은 startTime, baseCapacity, 선택 price, visibility, locationType, placeName, address, addressDetail, latitude, longitude, onlineUrl이다. 앱은 이 경로에 참가비를 보내지 않는다. 서버도 양수 price를 EVENT_REQUIRES_PREPAYMENT로 거절한다. 반복 주기·종료일은 이 요청 모델에 없다.

## 플랜 권한과 생성 결과

서버는 장소 공개 범위·필수 일시·주소 길이/좌표 등을 확인하고 HOST 또는 ADMIN 역할을 요구한다. 이후 플랜 가시성과 작성자/구매 권리, 호스팅 제재를 확인한다.

| 상태·권리 | 현재 모임 생성 판단 |
| --- | --- |
| 플랜 없음·DELETED | PLAN_NOT_FOUND |
| DRAFT·HIDDEN의 작성자 | 가시성 및 작성자 권리로 허용, 호스트·제재 등 다른 조건은 별도 |
| HIDDEN의 유효 구매자 | 구매 권리가 있으면 허용 |
| 비공개 플랜의 작성자·허용 구매자가 아님 | FORBIDDEN |
| PUBLISHED지만 작성자도 유효 구매자도 아님 | PLAN_NOT_PURCHASED |
| 호스트 역할 없음 | HOST_ROLE_REQUIRED |
| 호스팅 제재 중 | USER_RESTRICTED_FROM_HOSTING |

무료 플랜 본문 열람만으로 구매 권리가 생기지는 않는다. 구매 권리는 직접 구매의 ACTIVE·환불 잠금 여부 또는 활성 PLAN/EVENT_PACKAGE 권리를 따른다. 권리 만료·환불 뒤의 재사용은 이 조건을 다시 판정한다.

생성 시 **현재 플랜**의 제목·설명·썸네일·durationHours를 사용하고, 종료 시각은 요청 시작 시각에 durationHours를 더한다. 호스트는 요청 회원, planId는 원플랜이며 category=OTHER, eventType=INDEPENDENT, status=DRAFT로 생성한다. 과거 상품 스냅샷 전체를 새 모임에 복사하는 계약으로 설명하지 않는다.

응답은 eventId·planId·title·startTime·status를 가진 PlanEventResponseVo이며 HTTP 201이다. 생성 성공 뒤 앱은 호스팅 목록과 해당 이벤트 카드를 갱신한다. 응답 불명이나 기존 결과를 읽을 수 없는 오류에서도 관련 목록을 다시 읽는다.

## 생성 요청의 저장·재시도·복귀

생성 POST에는 필수 Idempotency-Key가 있다. 서버 영수증은 회원·PLAN_EVENT_CREATE·키·대상 plan:{planId}·요청 본문을 결박해 같은 요청을 재생한다. 같은 키의 다른 본문을 새 생성으로 처리하지 않는다. 저장된 결과 재생과 새 업무 실행의 차이는 [구매 문서의 요청 재시도](F08-11_purchase_prd.md#돈-처리의-재시도와-현재-정산-규칙)에서 다룬 공통 영수증 규칙과 연결된다.

앱은 전송 전에 계정·플랜별 디스크 초안에 **키와 요청 본문을 함께 저장**한다. 저장 실패에는 전송하지 않는다. 결과를 모르면 편집을 잠그고 원래 키·본문으로 다시 확인한다. 새 화면·컨테이너에서도 저장된 요청을 복원하며 계정·세션·초안 세대가 바뀐 화면은 이전 요청의 저장·전송·이동을 계속하지 않는다.

BadRequest/Unprocessable, 또는 영수증 내부의 Forbidden/NotFound는 확정 거절로 보고 미확정 요청을 해제한 뒤 입력을 고칠 수 있게 한다. 해제 저장에 실패하면 원래 요청을 보존한다. 그 밖의 오류를 임의로 새 키 생성의 근거로 삼지 않는다. 구매 화면과 모임 작성 화면의 모든 오류별 키 처리까지 동일하다고 일반화하지 않는다.

생성 응답을 받으면 해당 키의 초안을 지운 뒤 성공 안내와 모임 상세 이동을 실행한다. 정리에 실패하면 만든 결과를 메모리에 보관하고 **만든 이벤트 열기**로 정리를 다시 시도한다. 같은 화면에서는 생성 POST를 다시 보내지 않는다. 재시작 후에는 남은 원래 키로 서버 결과를 재생한다. 입력 내용이 있는 화면을 벗어날 때는 저장·전송 상태에 맞는 이탈 가드를 사용한다.

## 후기 자격과 한 사람 한 후기

후기 API는 MARKET 공개 범위를 적용한다. 새 후기는 입력 검증 뒤 상품의 가시성·판매 유형 공개·현재 구매 접근·기존 살아 있는 후기 유무를 판단한다. `actions.review.allowed`가 허용하는 상세에서 작성한다. 상품 소유자라는 이유만으로 구매 접근 검사를 생략하지 않는다.

평점은 1~5의 필수 정수, 본문은 선택이며 서버 기준 최대 500자다. 미구매/권리 없음은 MARKET_REVIEW_PURCHASE_REQUIRED, 이미 살아 있는 후기가 있으면 MARKET_REVIEW_ALREADY_EXISTS다. 상품이 없거나 가시성·판매 범위에 걸리는 오류가 이들보다 먼저 나올 수 있다. 후기 쓰기 자격에 ‘모임 개최 완료’나 ‘플랜 이용 횟수’ 검사가 있다고 추가하지 않는다.

삭제한 뒤 다시 작성할 때는 기존 행을 잠가 되살리고 같은 후기 번호를 사용한다. 평점·본문·작성 시각을 갱신하고 삭제 표지·수정됨 표지를 초기화한다. 잠금 시 이미 다른 요청이 되살린 행이면 중복 오류로 거절하여 내용을 덮어쓰지 않는다.

## 후기 수정·삭제와 실패 복구

수정·삭제는 살아 있는 후기의 작성자와 URL의 itemId를 함께 확인한다. 남의 후기 또는 다른 상품의 후기 번호면 FORBIDDEN, 없거나 이미 삭제됐으면 NOT_FOUND다. 수정은 edited=true로 저장하고 삭제는 deletedAt을 기록한다. 새 후기 작성의 구매 자격 검사를 수정·삭제에도 다시 실행한다고 설명하지 않는다.

대화상자는 새 후기 평점 5, 수정은 기존 평점·본문으로 시작한다. 본문 앞뒤 공백을 제거하고 빈 값은 null로 전송한다. 저장 중 입력·재전송·이탈을 잠그며, 변경 후 취소는 이탈 가드를 따른다. 실패하면 내용을 유지하고 다시 쓸 수 있다. 등록 실패의 권한 판정은 상품 상세를 새로 읽는 공통 처리와 연결된다. 삭제는 별도 확인에서 취소하면 요청하지 않는다.

등록·수정·삭제 성공은 모두 후기 목록 첫 페이지를 다시 읽는다. 등록·삭제는 상품 상세도 무효화하여 작성 가능 여부와 평점 집계를 갱신한다. **수정은 상세를 바로 무효화하지 않으므로 평균 평점은 이후 상세 재조회 때 바뀔 수 있다.** 서버는 상세를 읽을 때 후기 집계를 조회하며, 후기 변경 메서드에서 상품 평균 값을 직접 업데이트하지 않는다.

화면은 변경 중 플래그로 같은 화면의 중복 요청을 막는다. 후기 요청에는 모임 생성과 같은 영구 영수증 키를 보내지 않는다. 서버가 성공한 뒤 응답을 잃으면 화면의 실패 안내만으로 서버 롤백을 확정할 수 없다. 목록·상세를 다시 확인하고 중복 후기 오류와 구분해야 한다.

## 요청과 응답

| 요청 | 현재 계약 |
| --- | --- |
| POST /api/v1/plans/{planId}/create-event | 필수 Idempotency-Key, PlanEventAddParam → 201 PlanEventResponseVo |
| POST /api/v1/market/items/{itemId}/reviews | rating·content → 201 ItemReviewVo |
| PUT /api/v1/market/items/{itemId}/reviews/{reviewId} | rating·content → 200 ItemReviewVo |
| DELETE /api/v1/market/items/{itemId}/reviews/{reviewId} | 204, 응답 본문 없음 |

## 현재 제한과 확인 범위

| 구분 | 경계와 후속 확인 |
| --- | --- |
| 미검증 | 이번 갱신은 소스·선택된 기존 단언 대조다. 새 모임 생성·실제 서버 재시작·디스크 장애·후기 경합 시험을 실행하지 않았다 |
| Gap | 후기 수정 뒤 목록은 갱신하지만 상품 상세의 평균은 즉시 갱신하지 않는다 |
| Risk | 생성 결과 불명은 저장된 요청을 유지한다. 후기 응답 불명은 같은 영수증 기반 복구가 없으므로 두 흐름을 동일한 재시도 보장으로 적지 않는다 |
| 기준 | 앱 공개 범위 두 선택지와 서버 enum 네 값, 무료 본문 읽기와 구매 권리, 모임 초안 생성과 모집 공개를 구분한다 |

## 수용 기준과 검증 근거

- **AC-01 입구와 권한:** 구매 플랜 상세·패키지 전달에서 모임 작성으로 이동하고 호스트 자격 및 서버 플랜 권리를 확인한다. 라우터·플랜 상세·MarketAbilityPolicy를 대조했다.
- **AC-02 입력 보존:** 저장 초안을 먼저 복원하고 초기 플랜 값은 한 번만 채운다. 사용자 수정과 미확정 요청 본문을 덮어쓰지 않는다. 화면·디스크 저장 구현이 근거다.
- **AC-03 모임 결과:** 요청 회원의 DRAFT·INDEPENDENT 모임을 만들고 상세로 이동한다. 양수 참가비는 거절한다. PlanServiceTest의 호스트/planId/DRAFT 및 참가비 거절 단언을 읽었다.
- **AC-04 저장 선행:** 키·본문 저장 실패는 전송하지 않고 저장 복구 뒤 한 번 전송한다. plan_event_draft_recovery_test의 해당 단언을 읽었다.
- **AC-05 결과 불명 복구:** 재시작 후에도 원래 키·본문을 복원하고 계정 경계를 확인한다. 기존 복구 시험의 재시작 키·본문 일치 단언과 현재 세션 가드를 대조했다.
- **AC-06 성공 정리 실패:** 생성 결과를 받은 뒤 초안 삭제가 실패하면 생성 요청을 반복하지 않고 만든 결과를 연다. 기존 복구 시험의 요청 1회·모임 77 이동·저장 제거 단언을 읽었다.
- **AC-07 후기 자격:** 현재 구매 접근, 상품 가시성, 미작성 조건과 평점·본문 범위를 확인한다. 후기 서비스·능력 정책·작성 대화상자를 대조했다.
- **AC-08 삭제 후 재작성:** 기존 행을 잠가 같은 ID로 되살리고 이미 되살아난 행은 덮어쓰지 않는다. MarketItemReviewServiceTest의 두 단언을 읽었다.
- **AC-09 수정과 삭제 권한:** 본인·같은 상품·살아 있는 후기 조건을 적용하며 삭제는 소프트 삭제다. 후기 서비스가 근거다.
- **AC-10 갱신과 실패:** 후기 작업은 목록을 다시 읽고 등록/삭제만 상세를 무효화한다. 실패 시 입력 유지·삭제 취소·변경 중 중복 차단을 화면과 공급자에서 대조했다.

위 10개는 문서 수용 항목 수다. 기존 시나리오의 반복 모임·401 권한 오류 설명을 현재 계약으로 유지하지 않으며, 시험 소스 열람을 신규 통과 기록으로 세지 않는다.
