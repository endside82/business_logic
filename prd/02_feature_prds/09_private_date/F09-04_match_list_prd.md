# F09-04. 매칭 목록과 대화 연결 PRD

<!-- release-document: reference -->
> 2026-11-22 현재 서버·앱 소스를 대조했다. 문서 최신화이며 새 제품 시험·운영·실기기 검수 통과 기록이 아니다.

## 공개 계약과 당사자 범위

GET /api/v1/date/matches는 status·page·size 검색으로 Page<DateMatchVo>를 반환한다. status가 없거나 빈 값이면 본인이 user1 또는 user2인 전체 상태, 있으면 해당 enum 상태만 읽는다. GET /matches/{matchId}는 존재 여부와 당사자 여부를 확인한다. 두 API는 DATING 공개 범위를 따른다.

상태는 PENDING·MATCHED·REJECTED·EXPIRED·BLOCKED다. 서버 전체 목록은 BLOCKED·REJECTED를 자체적으로 제외하지 않는다. 앱의 추가 가림을 서버 조회 정책으로 설명하지 않는다. 목록 쿼리는 offset·limit을 적용하지만 명시적인 orderBy가 없다. 최신순 또는 동점 안정 정렬이 보장된다고 쓰지 않는다.

## 응답에 붙는 대화 정보

DateMatchVo에는 매치 ID·user1Id·user2Id·각 행동·상태·matchedAt·expiresAt·createdAt과 unreadCount·lastMessage·lastMessageAt이 있다. 상대 프로필 표시 이름·사진·chatRoomId는 이 VO에 없다.

매치에 연결된 방이 있으면 상대가 보낸 읽지 않은 메시지 수와 마지막 메시지를 조회하고 미리보기 본문을 복호화한다. 이 보강 메서드는 방의 ACTIVE 상태나 양방향 차단을 추가로 검사하지 않는다. 닫히거나 차단된 매치의 서버 목록/단건에서도 이 보강을 거칠 수 있다. 앱이 해당 행을 화면에서 숨긴다고 서버가 미리보기를 내려주지 않는 것은 아니다.

목록의 페이지마다 각 매치에 방·미읽음·마지막 메시지 조회가 이어진다. 이 문서는 구조만 확인했으며 대량 자료의 응답 시간이나 조회 수 최적화 완료를 주장하지 않는다.

## 앱의 탭과 페이지 범위

현재 화면은 전체·새매칭·대화중 탭을 제공하지만 새매칭과 대화중은 모두 status=MATCHED로 같은 조회를 한다. 읽어 온 page.content에서 BLOCKED·REJECTED만 추가로 제외하고, matchedAt이 있는 항목 최대 5개를 새 매칭 가로 목록에 넣는다. 대화중 목록은 남은 목록 전체다. 최근성이나 실제 메시지 유무를 기준으로 두 탭을 구분하지 않는다.

DateMatchesNotifier는 상태별 첫 응답을 읽으며 다음 페이지를 이어 읽는 동작은 현재 화면/provider에 없다. 서버 API의 페이지 지원을 앱 무한 목록 구현으로 계산하지 않는다. 첫 페이지에서 가려진 행이 많으면 이후 페이지의 표시 가능한 항목이 있어도 빈 상태로 보일 수 있다.

계정 데이터 범위와 대화 목록 변경 신호를 구독하고, 자료가 있는 목록은 당겨서 다시 읽는다. 빈 상태의 후보자 둘러보기는 /dating/candidates로 이동한다. 최초 오류에는 재시도 입구가 있다.

## 채팅 이동과 상대 식별의 현재 차이

매칭 목록 카드의 onTap은 등록된 방 목록 경로 /dating/chat으로 이동한다. 사용자는 거기서 방을 한 번 더 선택해 /dating/chat/{roomId}로 들어간다. 따라서 이 이동은 존재하지 않는 주소로의 오류가 아니며, 선택한 매치의 대화를 바로 여는 기능과 구분한다. 후보 선택 직후의 성공 창은 chatRoomId로 개별 대화를 직접 여는 별도 입구다.

카드의 상대 표시와 차단 명령은 user2Id를 사용하며 로그인 사용자가 user1인지 비교해 상대 ID를 고르지 않는다. 본인이 user2인 매치에서는 차단 대상이 본인이 되어 서버가 거절할 수 있다. 목록 VO에 방 번호나 상대 표시용 정보가 없다는 문제와 앱의 대상 선택 문제를 함께 남긴다.

## 차단 후 갱신과 표시

카드 메뉴의 차단은 사유·선택 안전 신고 시트를 열고 성공하면 매칭·후보·차단 목록을 무효화한다. 수동 새로고침해야만 반영된다는 과거 설명은 현재와 다르다. 실패하면 시트 입력을 유지한다. 올바른 상대를 고르는 문제는 위의 현재 차이를 따른다.

PENDING은 남은 시간, EXPIRED는 만료 표시를 사용한다. 매치가 MATCHED라는 것만으로 연결된 방도 ACTIVE라고 판정하지 않는다. 무활동 정리는 매치 상태를 유지하며 방을 INACTIVE로 바꾸므로 실제 채팅·만남 명령의 방 상태 확인이 별도로 필요하다.

## 코드 위치

서버: DateMatchController, DateMatchingService#getMatches/getMatch, DateMatchQueryRepository, DateMatchVo, DateChatService#enrichMatchWithChatInfo. 앱: date_match_api.dart, date_match_repository.dart, date_match_provider.dart, match_list_screen.dart, dating_routes.dart.

<!-- source-references:start -->
서버 창구: `DateMatchController#getMatches`, `DateMatchController#getMatch`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 목록 카드는 등록된 /dating/chat 방 목록을 열어 방을 한 번 더 선택하게 한다. | 특정 매치 대화로 직접 진입하는 기능이나 잘못된 라우트로 설명하지 않는다. |
| Gap | 상대·차단 대상을 user2Id로 고정한다. | 로그인 사용자가 user2인 경우를 구분한다. |
| Gap | 첫 페이지만 읽고 새매칭/대화중이 같은 자료이며 서버 정렬도 명시되지 않았다. | 전체 목록·안정 정렬·의미 있는 탭 분리가 완성됐다고 쓰지 않는다. |
| Risk | 서버 미리보기 보강에는 방 활성·차단 추가 검사가 없다. | 클라이언트 가림과 응답 정보 제한을 구분한다. |
| 미검증 | 실제 당사자 계정·채팅 이동·대량 페이지·차단 뒤 메시지 노출을 실행하지 않았다. | 소스 결함 확인과 제품 수정/시험을 구분한다. |

## 수용 기준과 검증 근거

- **AC-01 당사자 조회:** 전체 상태/선택 상태 페이지와 단건 당사자 검사를 구분한다.
- **AC-02 응답 정보:** 미읽음·복호화 미리보기와 방/차단 검사 부재, 상대/방 ID 필드 부재를 명시한다.
- **AC-03 화면 범위:** 첫 페이지·클라이언트 가림·같은 MATCHED 탭·최대 5개 가로 목록을 실제대로 설명한다.
- **AC-04 입구와 대상:** 매칭 카드 → 방 목록 → 개별 방의 실제 이동과 user2Id 고정 차단 대상 문제를 구분한다.
- **AC-05 갱신과 상태:** 대화 목록 신호·성공 차단 갱신·오류 재시도 및 매치/방 상태 차이를 구분한다.
