# F04-10. 공지 읽기·작성·수정과 예약 게시 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 현재 작업 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다. 2026-11-22 서버·앱 소스와 선택한 기존 시험 단언을 대조했다. 새 앱·사진·기기 알림·예약 실행 시험 결과가 아니다.

## 결론

회원은 ACTIVE 공지를 읽고 유효 운영진은 작성·수정·삭제한다. 작성·수정은 BUSINESS의 공지 구독 조건을 검사하지만 삭제는 같은 구독 조건으로 막지 않는다. 게시할 때 작성자를 제외한 클럽 회원 대상 알림 확산을 요청하며, 현재 앱에 푸시 전송 선택 토글은 없다.

예약 공지는 SCHEDULED로 저장되어 일반 목록에 나오지 않고 예약 실행 때 현재 권한·구독·고정 한도를 다시 검사한다. 입력 초안·전송 결과 불명확·저장 성공 후 기기 기록 정리 실패를 구분한다. 로컬 복구 장치가 서버의 중복 생성 방지 영수증을 대신하지는 않는다.

## 코드 위치

서버: ClubController#createAnnouncement·getAnnouncements·updateAnnouncement·deleteAnnouncement, ClubAnnouncementService, ClubAnnouncementParam·ClubAnnouncementModParam·ClubAnnouncementVo·AnnouncementStatus, ClubAbilityPolicy·ClubSubscriptionGateService·ClubNotificationDispatcher. 예약은 ScheduledPublishService·ScheduledPublishScheduler·ScheduledPublishItemWorker·ScheduledPublishStateWriter·ScheduledPublishAuthority의 CLUB_ANNOUNCEMENT 분기다.

앱: club_community_screen.dart, announcement_list_screen.dart·announcement_create_screen.dart·announcement_edit_screen.dart, announcement_draft.dart·announcement_draft_notice.dart, announcement_provider.dart·club_announcement_api.dart, announcement.dart·announcement_add_param.dart·announcement_mod_param.dart, club_branch_routes.dart·notification_router.dart.

<!-- source-references:start -->
서버 창구: `ClubController#createAnnouncement`, `ClubController#getAnnouncements`, `ClubController#deleteAnnouncement`, `ClubController#updateAnnouncement`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 실제 입구·목록·읽기

클럽 커뮤니티의 공지 구역 또는 /clubs/{clubId}/announcements는 회원용 공지 목록으로 연결한다. 일반 공지 알림도 이 목록으로 이동하며 announcementId가 있다는 이유로 독립 공지 상세 API를 조회하는 계약은 아니다. 작성은 /announcements/create, 수정은 /announcements/{announcementId}/edit이며 두 라우트는 운영 권한을 검사한다.

GET /api/v1/clubs/{id}/announcements는 현재 회원을 확인하고 Page<ClubAnnouncementVo>를 반환한다. ACTIVE만, 고정 먼저·생성 시각 내림차순·번호 내림차순으로 읽는다. 응답은 id·clubId·authorId/authorNickname·title/content/contentRich·contentImages·pinned·status·생성/수정 시각과 행 actions.pin을 포함한다.

앱은 20개씩 읽고 추가 실패에는 기존 목록·하단 재시도, 처음 실패에는 본문 재시도를 제공한다. 자료가 있는 목록은 당겨 새로고침하며 비어 있으면 아직 공지사항이 없다는 상태를 보여 준다. 현재 Dart Announcement 모델은 pinned를 읽지만 서버 status/actions.pin은 별도 필드로 보관하지 않는다.

카드를 누르면 전달받은 공지의 읽기 시트를 열어 제목·작성자·시각·본문을 표시한다. 행동이 있는 행만 더보기와 길게 누르기로 수정/삭제 선택을 연다. 일반 회원에게 빈 행동 메뉴를 열어 주는 것이 현재 동작은 아니다. 수정이 구독 때문에 잠기고 삭제는 허용되는 조합도 각각 유지한다.

## 본문과 첨부 사진

본문은 plain content와 선택 contentRich를 함께 사용하며 읽기 시트는 RichContentView와 ContentPhotoGallery를 배치한다. 서버 생성은 새 공지 번호에 contentImageKeys를 연결하고 수정은 해당 대상의 사진 참조를 동기화한다. 응답의 contentImages와 요청의 파일 키 목록을 같은 필드로 설명하지 않는다.

앱은 제목·본문·서식·사진 입력을 초안에 보관하고 사진 처리 중에는 제출을 막는다. 첨부 참조 연결 호출을 실제 사진 업로드·표시 품질 검수 완료로 합산하지 않는다.

## 즉시 작성과 수정 계약

POST /api/v1/clubs/{id}/announcements는 ClubAnnouncementParam을 받고 201 ClubAnnouncementVo다. title·content는 비어 있으면 안 되고 서버 제목 한도는 200자다. 선택 contentRich·contentImageKeys, pinned, scheduledAt을 받으며 서식 검증 후 저장한다. 서버 boolean isPinned의 JSON 이름은 pinned이고 앱도 JsonKey로 이를 맞춘다.

현재 앱 제목 입력 한도는 100자이며 제목/본문을 trim해 비어 있지 않은지 검사한다. 신규 제출은 title·content·서식·사진 키·scheduledAt을 보내고 pinned는 요청 모델의 기본 false를 사용한다. 생성 화면에서 고정 여부를 바꾸는 토글은 없다.

PUT /api/v1/clubs/{id}/announcements/{announcementId}는 ClubAnnouncementModParam을 받고 200 ClubAnnouncementVo다. 현재 유효 운영진·구독·제목/본문·대상 클럽을 확인하고 클럽/공지 잠금 뒤 제목·본문·서식·사진·고정을 갱신한다. 작성자 본인에게만 허용하는 기능은 아니다. 수정 분기에서는 새 공지 알림을 다시 발행하지 않는다.

앱 수정은 목록에서 넘긴 Announcement를 사용하며 기존 pinned를 보존한다. URL만으로 들어와 extra가 없으면 공지를 불러올 수 없다는 오류를 표시하고 단건 API로 자동 복구하지 않는다. 수정 요청에는 scheduledAt이나 기대 버전 필드가 없다.

## 권한과 고정 한도

작성·수정은 현재 실효 운영진과 ANNOUNCEMENT_CREATE 구독 판정을 결합한다. BUSINESS 구독 차단 오류는 CLUB_SUBSCRIPTION_FEATURE_BLOCKED다. 삭제는 운영 권한을 검사하지만 이 구독 판정을 요구하지 않는다. 역할 이름만으로 버튼 허용을 만들어내지 않고 서버의 클럽 능력값을 따른다.

고정 ACTIVE 공지는 클럽당 최대 3개다. 서버의 pinned 생성은 클럽 잠금 후 현재 ACTIVE 고정 수를 확인하며 예약 생성에도 이 검사가 적용된다. 예약 공지 자신이 아직 ACTIVE 개수에 들지 않는 것과 예약 생성 시 검사 생략은 다르다.

수정에서 pinned가 바뀌려면 대상 공지가 ACTIVE여야 한다. 새로 고정할 때는 잠금 안에서 한도를 확인하고 이미 고정된 내용 수정이나 해제는 신규 고정 한도와 구분한다. 예약 활성화 때도 ACTIVE 고정 수를 재검사한다. 서버의 고정 계약이 있다는 사실과 현재 앱의 고정 조작 제공 여부를 분리한다.

## 예약 생성과 실제 게시 결과

scheduledAt을 넣으면 공지 SCHEDULED와 별도의 예약 작업을 같은 생성 흐름에서 저장하며 일반 회원 알림은 아직 요청하지 않는다. 예약 서비스는 작성자와 대상 SCHEDULED 상태·필수 입력·PUBLISH 종류·현재부터 최소 1분 뒤 시각·중복 진행 예약을 검사한다.

앱은 예약을 켰는데 시각이 없으면 막고 서울 기준 벽시각으로 1분 뒤보다 이후인지 검사한다. 예약 성공은 게시 완료가 아니라 예약됨으로 알리며 내 예약 목록 입구를 제공한다. 서버와 앱의 시각 검사 및 폴링 간격을 고려해 지정 시각의 정확한 즉시 도달을 약속하지 않는다.

예약 폴링은 기본 60초 간격·한 번에 최대100개이며 CLUB_ANNOUNCEMENT를 지원한다. 공지 게시 분기는 클럽/공지를 잠근 뒤 현재 작성자의 운영 권한·구독을 다시 확인하고 고정 한도를 재검사한다. 성공하면 ACTIVE·회원 알림 확산 요청·예약 EXECUTED를 처리한다. 이미 ACTIVE인 대상은 다시 회원 알림을 생성하지 않고 게시된 결과로 처리한다.

대상이 사라졌으면 예약 CANCELLED, 작성자 권한이 없어졌으면 CANCELLED와 작성자 실패 알림 요청으로 처리한다. 한도 초과 등의 예외는 발행 변경을 되돌리고 해당 실행 차수가 여전히 유효할 때 FAILED·작성자 SCHEDULED_PUBLISH_FAILED 알림을 기록한다. 예전 작업이 실행 권한을 잃은 경우 SKIPPED와 구분한다. 실패한 예약 작업 상태와 여전히 SCHEDULED인 공지 상태는 별개다.

## 입력 보관·불명확 결과·복귀

초안 키는 계정·클럽·새 작성/공지 번호를 구분한다. 본문과 사진·예약 입력, 원래 값, pending/completed를 보관한다. 예전 sendPush 값은 복구 때 제거하며 푸시 선택 UI를 되살리지 않는다.

제출 전에 pending을 기기에 기록한다. 기록 실패면 API 호출 전 멈추고 입력을 남긴다. 명확한 거절이면 pending을 해제해 재시도할 수 있게 하고, 반영됐을 수 있는 실패는 pending을 유지해 화면을 다시 열어도 바로 중복 제출하지 못하게 한다. 목록/예약 목록을 확인했다는 명시적 조작 후에만 계속 작성한다. 실제로 이미 생성됐다면 새 등록으로 중복 공지가 생길 수 있다.

성공 뒤에는 completed를 기록하고 기기 초안을 지운다. 정리 실패는 이미 저장된 공지를 다시 보내는 대신 보관 기록 정리 동작으로 남긴다. 목록 공급자는 작성/수정/삭제 성공 후 일반 목록과 클럽 홈 공지 자료를 갱신한다.

수정 초안은 이전 기준값·현재 진입 때 넘겨받은 값·로컬 입력이 충돌하면 제출을 막고 확인 후 진행하도록 한다. 이 비교가 서버의 최신 값을 다시 조회하거나 기대 버전으로 동시 수정을 막는 것은 아니다. 계정 세션이 끝났거나 초안이 준비되지 않았거나 전송/사진 처리 중이면 제출을 막는다.

## 삭제와 알림의 범위

DELETE /api/v1/clubs/{id}/announcements/{announcementId}는 204, 본문 없음이다. 현재 운영 권한·경로 클럽 일치 여부를 확인하고 사진 참조 해제 뒤 공지 행을 실제 삭제한다. AnnouncementStatus에는 SCHEDULED/ACTIVE만 있고 DELETED 상태로 전환하는 방식이 아니다. ACTIVE와 SCHEDULED 대상 모두 삭제할 수 있다.

앱은 허용된 행 메뉴에서 삭제 확인을 받고 성공 후 목록을 갱신한다. 삭제가 실패하면 오류/권한 재조회로 처리한다. 예약 작업의 대상이 뒤에 없어졌을 때는 위의 예약 취소 결과와 구분해 읽는다.

즉시 생성 또는 예약 활성화는 작성자를 제외한 회원 대상 알림 확산 작업을 저장한다. 회원별 알림/기기 전달은 후속 처리이므로 members-1개의 즉시 알림 저장이나 모든 기기의 FCM 수신을 이 API 성공만으로 보장하지 않는다. 현재 요청/앱에 sendPush 선택 필드는 없다.

## 현재 제한과 확인 범위

| 판정 | 항목 | 근거·사용자 영향 | 남은 확인 |
| --- | --- | --- | --- |
| 제한 | 고정 조작 | 서버는 고정 변경·행 pin 능력을 제공하지만 현재 앱 생성 false/수정 기존값 보존 | 앱 고정 관리가 필요하면 별도 범위 결정 |
| Risk | 편집 진입과 동시 수정 | extra 없으면 단건 복구 없음·기대 버전 없음·초안 비교는 진입 스냅샷 기준 | 직접 진입 복구와 다른 운영진 수정 충돌 정책 확인 |
| Risk | 제목 한도 차이 | 앱100자/서버200자 | 다른 경로에서 만든 긴 제목을 앱에서 수정할 때 기준 확인 |
| Risk | 전송 결과 불명확 | 초안 잠금은 재전송 억제이며 서버의 동일 명령 키 계약은 없음 | 목록 확인 후 새 등록이 중복이 되는 조건 구분 |
| 미검증 | 실제 게시/알림 | 소스와 선택한 기존 시험 단언만 읽음 | 예약 실행·기기 전달·사진 품질의 새 실행 증거 없음 |

## 수용 기준과 검증 근거

- **AC-01 목록:** 현재 회원만 ACTIVE 공지를 고정/생성시각/번호 순서로 20개씩 읽는다.
- **AC-02 읽기와 행동:** 카드는 읽기 시트·행동이 있을 때만 더보기/길게 누르기 메뉴를 제공한다.
- **AC-03 목록 복구:** 추가 실패에 기존 행/재시도를 남기고 첫 실패·빈 상태를 구분한다.
- **AC-04 작성 계약:** 서버 제목200·본문 필수·pinned JSON·서식/사진 키와 앱 제목100/고정false를 구분한다.
- **AC-05 수정:** 유효 운영진/구독·대상 클럽·본문/사진 갱신을 확인하고 기존 고정을 보존한다.
- **AC-06 권한 구분:** 작성/수정의 구독 제한과 삭제의 운영 권한을 각각 적용한다.
- **AC-07 고정 한도:** 생성·신규 고정·예약 활성화의 잠금과 ACTIVE 최대3개를 확인한다.
- **AC-08 예약 생성:** SCHEDULED 저장·작성자/상태·시각·중복 검증 후 예약됨으로 안내한다.
- **AC-09 예약 결과:** 현재 작성 권한 재검사·ACTIVE/EXECUTED·대상소실/권한취소·실행차수별 실패를 구분한다.
- **AC-10 입력 복구:** 계정/클럽/작성종류별 입력·사진·예약 초안과 예전 sendPush 제거를 처리한다.
- **AC-11 불명확 전송:** 전송 전 보관 실패·명확 거절·pending 재시작·확인 뒤 계속 작성을 구분한다.
- **AC-12 성공 정리:** completed 이후 기기 정리 실패는 재등록 없이 정리만 재시도한다.
- **AC-13 수정 충돌:** 진입 스냅샷과 초안 충돌·직접 진입 extra 누락·기대 버전 부재를 구분한다.
- **AC-14 삭제:** 확인 뒤 사진 참조 해제·행 삭제·목록 갱신을 처리하며 DELETED 상태를 만들지 않는다.
- **AC-15 알림:** 즉시/예약 게시 때 작성자 제외 확산 요청을 만들고 실제 기기 수신과 구분한다.

검증 근거: announcement_options_test.dart의 일반회원 빈 메뉴 없음·수정 구독 잠금/삭제 허용 분리, announcement_recovery_test.dart의 결과 불명확 뒤 재시작 재등록 차단, announcement_draft_test.dart의 보관 실패·수정 기준값 충돌 단언을 읽었다. 새 시험·이미지 검수는 실행하지 않았다. 과거 푸시 토글/E2E 원문은 로컬 시나리오 문서에 인용 보존하며 현재 계약·현재 통과 수에 합산하지 않는다.
