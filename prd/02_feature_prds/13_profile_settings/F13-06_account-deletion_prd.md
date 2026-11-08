# F13-06. 계정 삭제 요청 (30일 유예) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

계정 삭제 요청은 즉시 탈퇴와 별도로 30일 유예 기간을 둔 데이터 삭제 예약 기능이다. 서버는 삭제 요청을 `PENDING` 상태와 `scheduledAt = now + 30일`로 저장하고, 스케줄러가 매일 새벽 4시에 만료된 요청을 처리한다. UI 스펙의 비밀번호 재확인 body는 실제 컨트롤러와 Param에서 확인되지 않는다.

**2026-05-27 변경**: `DataDeletionService`가 Member 익명화 시 `mbti`도 null 처리(기존 name/birthDate/gender/bio/profileImageUrl + mbti). [[F13-02]]의 MBTI 필드가 삭제 범위에 포함된다.

### 2026-07-29 소스 재실측 — 게이트·삭제 범위·보존

- `POST /api/v1/users/me/data-deletion`은 body/비밀번호 없이 202를 반환하고 `PENDING`, `scheduledAt=now+30일`을 만든다. 취소는 PENDING에서만 `DELETE` 204다. `GET status`는 최신 `PENDING`/`APPROVED`만 조회하고 취소·완료 후에는 NOT_FOUND다.
- 요청 시점과 실제 실행 직전에 `AccountDeactivationService.checkDeactivation`을 모두 수행한다. 미정산·미수령 earning·진행 중 제공자 배정 등 미해결 금융 의무가 있으면 `DEACTIVATION_BLOCKED`와 상세를 반환하고 삭제를 보류한다.
- 스케줄러는 매일 04:00에 만료된 `PENDING`을 처리한다. 로그인 자체가 요청을 자동 취소하는 서버 로직은 없다.
- 계정은 `EXIT`로 익명화하고 Member 이름·생년·성별·bio·MBTI·프로필 이미지 포인터를 지운다. bare fileKey 프로필 이미지는 FileStorage에서 best-effort 삭제한다.
- 주소·관심태그·인증/소셜/토큰·알림/기기/검색 설정·결제 자격증명/정산계좌·데이팅 프로필/매치/미팅/피드백/차단/인증·캘린더·취향 프로필·이벤트 선택 피드백·trait 개인 세션을 삭제한다. trait 응답/점수는 session cascade이고 전역 축/문항은 유지한다.
- 거래/정산 기록은 5년 보존한다. active legal hold에서는 분쟁 증거가 될 알림·데이트 채팅과 분쟁 원천/evidence를 보존하며, 종결 분쟁 retention은 별도 `closedAt+1년` 정책이다.
- 파기 때 다른 표에 남은 닉네임 사본을 「알 수 없는 사용자」 로 바꾼다(2026-11-08). 범위는 클럽 게시글·사진첩 댓글 언급 표 둘의 표시 닉네임과 그 댓글 본문의 @표기(파기 회원 것만), 행위자가 파기 회원인 알림·예약 알림·발송 기록의 제목·글, 푸시 영수증 미리보기다. 즉시 탈퇴 확정 때 「탈퇴한 사용자」 로 바꾼 닉네임은 닉네임 이력 한 줄로 남겨 파기가 실제 이름을 찾게 하고, 파기 때 이력과 함께 지운다.
- 남는 사본(한계): 행위자 칸이 생기기 전의 옛 알림·영수증, 이 변경 전에 이미 즉시 탈퇴한 계정, 확산 알림 대기열의 내용, 남이 행위자인 알림 속 댓글 발췌, 미리보기 자름 끝에 남은 닉네임 앞부분, 파기와 같은 순간 발송 중이던 푸시.

확정 Gap/Risk:

1. (해소) 앱은 `DEACTIVATION_BLOCKED` 응답의 점검 내용을 읽어 걸린 항목을 차단 창으로 보인다.
2. (해소) 데이트 사진은 행을 지우기 전에 사진마다 파일 소거 표시를 같은 트랜잭션에 남기고, 파일 번호 없는 옛 키는 재시도 티켓으로 지운다(파기 실행기 8단계, 2026-11-08 확인).
3. (해소) 진행 중 요청은 회원당 하나다. V1 의 생성열 `active_key` 와 유일 키 `uk_deletion_request_user_active` 가 지키고, 엔티티는 `unique` 를 선언하지 않는다. 유일 키에 진 요청은 「이미 요청됨」 으로 답한다(2026-11-08 확인, 시험 더함).

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 마이페이지 허브의 `데이터 프라이버시` 메뉴에서 진입한다.
- 마이페이지 상단 삭제 진행 배너의 `관리` 버튼에서도 같은 화면으로 진입한다.

정지·차단된 계정의 제한 세션에서는 계정 삭제 요청을 받지 않는다. 제한 세션은 제재 확인·이의·문의·로그아웃만 연다(F15-08 4-C).

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DataPrivacyController`. 앱: `data_privacy_screen.dart`, `deletion_in_progress_banner.dart`.

## 3. 전체 동작 흐름

1. 데이터 프라이버시 진입: `deletionStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-deletion/status`.
2. 요청 버튼: 확인 다이얼로그 승인 ▶ `requestDeletion()` ▶ `POST /api/v1/users/me/data-deletion`.
3. 요청 성공: provider 상태 갱신 후 D-day 카드 노출.
4. 마이페이지 진입: `DeletionInProgressBanner`도 같은 `deletionStatusNotifierProvider`를 구독한다.
5. 취소 버튼: `cancelDeletion()` ▶ `DELETE /api/v1/users/me/data-deletion`.
6. `DeletionStatusNotifier` → `ProfileRepository` → `DataPrivacyApi` 체인이 조회·요청·취소를 수행한다.

## 4. 제품 규칙

- 삭제는 요청 뒤 30일 유예를 두고, 그 사이에는 `PENDING` 상태에서만 취소할 수 있다. 취소하거나 끝나면 다시 요청할 수 있다. 승인(`APPROVED`) 상태에서는 취소 버튼이 없고 새로고침만 있다.
- 요청 버튼은 확인 창(`정말 삭제하시겠습니까?`)을 거치고 비밀번호 재확인은 없다. 성공하면 `계정 삭제가 요청되었습니다`, 취소하면 `계정 삭제가 취소되었습니다` 안내가 뜬다.
- 진행 중에는 `삭제까지 N일 남음` 카드를 보인다. 예정일이 없으면 30일로, 남은 일수가 음수면 0일로 보인다.
- 경고 문구는 유예 뒤 개인정보가 삭제되거나 익명화되고 법적 의무에 따라 일부 기록은 보존될 수 있다고 안내한다. 로그인만으로 요청이 자동 취소되지는 않는다.
- 상태 조회가 실패하면 요청 버튼을 보인다. 요청이 없거나 취소, 완료된 상태에서도 요청 버튼이 보인다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 사용자가 30일 유예 삭제를 요청한다 | 로그인됨, 진행 중 삭제 요청 없음 | `data_deletion_request`에 `PENDING` 삭제 예약이 존재한다. |
| S2 | 사용자가 마이페이지에서 삭제 진행 배너를 확인한다 | 삭제 요청 status가 `PENDING` 또는 `APPROVED` | 두 상태 모두 배너는 보인다. 프라이버시 화면의 취소 버튼은 PENDING에만 있고 APPROVED에는 없다. |
| S3 | 유예 기간 중 삭제 요청을 취소한다 | 삭제 요청 status가 `PENDING` | 삭제 진행 배너는 사라지고 신규 삭제 요청 버튼 상태로 돌아간다. |
| S4 | 이미 삭제 요청이 있어 중복 요청이 실패한다 | 서버에 `PENDING` 삭제 요청 존재 | 기존 삭제 요청은 유지된다. |
| S5 | 30일이 지나 스케줄러가 개인정보를 삭제한다 | `PENDING`, `scheduledAt`이 현재보다 과거 | 사용자의 개인정보는 삭제/익명화되고 계정 status는 `EXIT`가 된다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소 | `DataDeletionRequest` vs `V1__init.sql` | 진행 중 요청 회원당 하나를 생성열과 유일 키가 지키고 엔티티는 unique 를 선언하지 않는다. | 없음(2026-11-08 시험 더함) |
| 해소 | `DataDeletionService` | 데이팅 사진 행을 지우기 전에 파일 소거 표시·옛 키 재시도 티켓을 남긴다. | 없음 |
| 해소 | admin `process` → internal execute | 취소된 요청은 세 겹에서 막힌다: 관리자 사전 판정(원격 호출 전), 공개 셸(정리 전), 러너의 잠금 뒤 재판정. | 없음(2026-11-08 러너 재판정 시험 더함) |
| 후보 | frontend.md:34 | - 비밀번호 재확인 다이얼로그는 현재 코드에 없음. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 사용자가 30일 유예 삭제를 요청한다**: Given 로그인됨, 진행 중 삭제 요청 없음 When 사용자가 해당 흐름을 실행하면 Then `data_deletion_request`에 `PENDING` 삭제 예약이 존재한다.
- **AC-02. 사용자가 마이페이지에서 삭제 진행 배너를 확인한다**: Given 삭제 요청 status가 PENDING 또는 APPROVED When 마이페이지와 프라이버시 화면을 열면 Then 두 상태 모두 배너는 보이지만 취소 CTA는 PENDING에만 보인다.
- **AC-03. 유예 기간 중 삭제 요청을 취소한다**: Given 삭제 요청 status가 `PENDING` When 사용자가 해당 흐름을 실행하면 Then 삭제 진행 배너는 사라지고 신규 삭제 요청 버튼 상태로 돌아간다.
- **AC-04. 이미 삭제 요청이 있어 중복 요청이 실패한다**: Given 서버에 `PENDING` 삭제 요청 존재 When 사용자가 해당 흐름을 실행하면 Then 기존 삭제 요청은 유지된다.
- **AC-05. 30일이 지나 스케줄러가 개인정보를 삭제한다**: Given `PENDING`, `scheduledAt`이 현재보다 과거 When 사용자가 해당 흐름을 실행하면 Then 사용자의 개인정보는 삭제/익명화되고 계정 status는 `EXIT`가 된다.
