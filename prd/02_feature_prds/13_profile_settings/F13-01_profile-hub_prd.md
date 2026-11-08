# F13-01. 내 프로필 조회 (마이페이지 허브) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

마이페이지 허브의 백엔드 핵심은 로그인 사용자의 기본 프로필을 조회하는 것이다. 사용자는 닉네임, 이름, 자기소개, 프로필 이미지, 언어, 역할, 가입일을 한 번에 받아 자기 프로필 카드의 기준 데이터를 확인한다. 지갑/이벤트/클럽/신뢰점수 요약은 이 컨트롤러가 제공하지 않으며 각 외부 도메인 의존으로 분리된다.

### 2026-07-29 소스 재실측 — 허브의 연결성·성향 진입점

#### 만난 사람

- 마이페이지 `만난 사람` 메뉴는 `/my/met-people`로 이동하고 `GET /api/v1/users/me/met-people?page&size`의 Spring `Page<MetPersonVo>`를 Flutter `PageResponse`로 소비한다.
- 항목은 `userId`, `nickname`, `avatarUrl`, `coAttendedCount`, `lastMetEventTitle`, `lastMetAt`이다. 사람별로 접어 최근 만남 내림차순으로 정렬한다.
- 후보는 증거등급 공동참석자다. 매 조회 시 현재 `NORMAL` 사용자, 양방향 비차단, `hideFromSearch=false`를 다시 적용하므로 삭제·차단·검색 숨김 사용자는 과거에 실제로 만났더라도 목록에서 사라질 수 있다. 이 화면은 불변 감사 원장이 아니라 **현재 표시 가능한 공동참석자 목록**이다.
- 카드 탭은 공용 `PersonSheet`를 연다.

#### 성향 검사와 리포트

| HTTP | 경로 | 현재 응답 |
|---|---|---|
| GET | `/api/v1/traits/questions` | 활성 문항 `List<TraitQuestionVo>` |
| POST | `/api/v1/traits/sessions` | 201 `TraitSessionVo { id, status, startedAt }` |
| POST | `/api/v1/traits/sessions/{sessionId}/submit` | 200 `TraitSessionResultVo` |
| GET | `/api/v1/traits/me` | 최신 제출 결과. 없으면 `sessionId/submittedAt=null`, `scores=[]` |

- V1에는 11개 활성 축과 24개 활성 문항이 있다. 문항 format은 `FORCED_CHOICE`와 `LIKERT`, 세션 상태는 `IN_PROGRESS`/`SUBMITTED`다.
- 제출 body는 필수 `clientRequestId`(nonblank, 최대 64)와 `{ questionId, value }[]`다. 서버는 세션 snapshot 문항·중복 없음·LIKERT 1~5·forced choice 0/1을 검증하고 축당 최소 2개 응답이 있는 축만 0~100 점수로 산출한다. 서버는 부분 제출을 허용하지만 현재 Flutter 화면은 모든 문항에 답해야 제출 CTA가 활성화된다.
- 동일 세션·동일 `clientRequestId` 재제출은 같은 결과를 반환한다. 제출 완료 뒤 다른 키로 다시 제출하면 중복 오류다.
- 마이페이지 성향 메뉴는 활성 문항 또는 기존 본인 점수가 있을 때만 보인다. `/profile/trait-report`에서 결과를 보고 미제출이면 `/profile/trait-assessment`로 이동한다.
- 타인의 원 trait 축점수 조회 endpoint는 없다. 이벤트/클럽 fit preview는 최신 제출 점수를 비율·버킷으로만 집계한다.

#### 공용 PersonSheet 관계·연락 경계

- `RelationshipSummary.commonGround`는 공통 관심 태그 최대 5개, 선언 선호 카테고리 최대 3개, 선언 선호 시간대 최대 3개만 반환한다. 세 축이 모두 비면 객체가 null이고 숫자 궁합 점수는 없다.
- 커뮤니티 관계 chip에서 데이팅 `MATCHED`는 제거됐다. 데이팅 페르소나와 커뮤니티 실신원을 역연결하지 않는다.
- 커뮤니티 메시지 자격은 같은 클럽, 진행 중/종료 후 72시간 이내 공동참석, 또는 미결 금융·제공자 의무 중 하나와 양방향 비차단·상대 `NORMAL`을 매 전송마다 재평가한다. 채널 응답은 `sendableBasis=UNLIMITED|EVENT_GRACE|OBLIGATION`과 nullable `sendableUntil`로 앱이 무기한·종료 유예·의무 종료 조건을 구분하게 한다.

실측 근거: `MetPeopleController/Service`, `TraitController/Service`, `RelationshipService`, `MessageEligibilityService`, `MessageChannelService`, Flutter `my_profile_screen.dart`, `met_people_screen.dart`, trait screens/providers 및 `person_sheet.dart`.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 하단 탭의 마이페이지 진입점에서 `MyProfileScreen`을 표시한다.
- 삭제 요청이 진행 중이면 같은 화면 상단의 배너에서 데이터 프라이버시 화면으로 이동할 수 있다.
- 앱 설정, 고객센터, 찜 목록, 캘린더, 리뷰, 정산 계좌, 기기 관리 등은 허브의 하위 메뉴 진입점으로만 다룬다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `UserController`, `AuthController`. 앱: `my_profile_screen.dart`, `data_privacy_screen.dart`, `app_settings_screen.dart`, `support_screen.dart`, `profile_wishlist_screen.dart`, `deletion_in_progress_banner.dart`.

## 3. 전체 동작 흐름

1. 인증 상태: `authNotifierProvider`의 authenticated user를 화면에서 직접 사용한다. `GET /api/v1/users/me` 호출 자체는 인증 provider/repository 내부 구현으로 보이며 profile 화면 범위 밖이라 `(미확인)`.
2. 지갑 카드: `walletNotifierProvider` ▶ payment 도메인 API `(본 Unit 범위 밖)`.
3. 내 이벤트 카드: `upcomingEventsNotifierProvider` ▶ event 도메인 API `(본 Unit 범위 밖)`.
4. 내 클럽 카드: `myClubsNotifierProvider` ▶ club 도메인 API `(본 Unit 범위 밖)`.
5. 신뢰점수 카드: `myTrustScoreNotifierProvider` ▶ review 도메인 API `(본 Unit 범위 밖)`.
6. 삭제 배너: `deletionStatusNotifierProvider` ▶ `GET /api/v1/users/me/data-deletion/status`.
7. 로그아웃: `authNotifierProvider.notifier.logout()` ▶ Unit 01 인증 흐름.

## 4. 제품 규칙

- 허브는 프로필 카드와 메뉴 모음만 맡는다. 지갑, 내 이벤트, 내 클럽, 신뢰점수 요약은 각 도메인이 값을 주고 허브는 카드 2x2로 배치만 한다. 요약 값이 아직 없으면 카드 전체를 로딩 표시로 바꾸지 않고 값만 비운 채 라벨을 보인다.
- 자기소개는 프로필 카드에서 2줄까지만 보이고 넘치면 말줄임으로 줄인다.
- 로그아웃은 바로 실행하지 않고 확인 창을 거친다. 취소하면 로그인 상태와 화면이 그대로다.
- 삭제 요청이 진행 중(`PENDING`, `APPROVED`)일 때만 카드 위에 배너가 고정으로 보이고, 배너의 `관리` 는 데이터 프라이버시 화면으로 보낸다. 삭제 예정일이 없거나 이미 지났으면 남은 일수 대신 일정 안내 문구를 보인다. 배너에는 취소 버튼이 없다.
- 앱 설정, 고객센터, 찜 목록은 허브의 외부 진입점이고 이 기능의 규칙은 없다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 마이페이지에서 내 정체성과 활동 요약을 확인한다 | 로그인됨, 인증 provider에 사용자 정보가 있음 | 사용자는 현재 프로필과 주요 활동 요약을 한 화면에서 확인하고 다음 설정 작업으로 이동할 수 있다. |
| S2 | 삭제 요청이 진행 중인 사용자가 배너를 보고 관리 화면으로 이동한다 | 로그인됨, 삭제 요청 상태가 `PENDING` 또는 `APPROVED` | 사용자는 데이터 프라이버시 화면에서 삭제 취소 또는 상태 확인을 이어갈 수 있다. |
| S3 | 로그아웃을 실수로 누른 사용자가 취소한다 | 로그인됨, 마이페이지 표시 중 | 인증 상태는 유지되고 마이페이지에 그대로 머문다. |
| S4 | 인증 사용자 정보가 아직 준비되지 않은 상태 | 인증 상태 확인 중이거나 authenticated user가 null | 사용자 정보가 준비되면 허브가 표시된다. 인증 실패 리다이렉트는 라우터/인증 가드 영역이라 `(미확인)`. |
| S5 | 외부 도메인 메뉴로 이동한다 | 로그인됨, 마이페이지 표시 중 | 본 기능은 메뉴 허브 역할을 완료하고, 이후 동작은 해당 Unit으로 위임된다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 해소됨 | 로그인 없을 때 | 로그인 정보 없이 부르면 서버가 401 과 로그인 필요 번호를 공용 오류 형식으로 돌려준다. 앱은 401 을 받으면 한 번 토큰 갱신을 시도하고, 거절되면 세션을 끝낸다. 로그인이 없으면 앱 관문이 마이페이지 대신 로그인 화면으로 보내고 로그인 뒤 원래 화면으로 돌려보낸다 | 없음 |
| 해소됨 | 원문 조각 | 원문 표·그림의 줄바꿈 조각이라 판정할 내용이 없다 | 없음 |
| 해소됨 | 내 정보 조회 | 앱을 켤 때, 로그인할 때, 내 정보를 다시 받을 때 인증 상태 관리가 내 정보 조회를 부르고, 마이페이지 허브는 그 값을 그대로 쓴다 | 없음 |

## 9. 수용 기준

- **AC-01. 마이페이지에서 내 정체성과 활동 요약을 확인한다**: Given 로그인됨, 인증 provider에 사용자 정보가 있음 When 사용자가 해당 흐름을 실행하면 Then 사용자는 현재 프로필과 주요 활동 요약을 한 화면에서 확인하고 다음 설정 작업으로 이동할 수 있다.
- **AC-02. 삭제 요청이 진행 중인 사용자가 배너를 보고 관리 화면으로 이동한다**: Given 로그인됨, 삭제 요청 상태가 `PENDING` 또는 `APPROVED` When 사용자가 해당 흐름을 실행하면 Then 사용자는 데이터 프라이버시 화면에서 삭제 취소 또는 상태 확인을 이어갈 수 있다.
- **AC-03. 로그아웃을 실수로 누른 사용자가 취소한다**: Given 로그인됨, 마이페이지 표시 중 When 사용자가 해당 흐름을 실행하면 Then 인증 상태는 유지되고 마이페이지에 그대로 머문다.
- **AC-04. 인증 사용자 정보가 아직 준비되지 않은 상태**: Given 인증 상태 확인 중이거나 authenticated user가 null When 사용자가 해당 흐름을 실행하면 Then 사용자 정보가 준비되면 허브가 표시된다. 인증 실패 리다이렉트는 라우터/인증 가드 영역이라 `(미확인)`.
- **AC-05. 외부 도메인 메뉴로 이동한다**: Given 로그인됨, 마이페이지 표시 중 When 사용자가 해당 흐름을 실행하면 Then 본 기능은 메뉴 허브 역할을 완료하고, 이후 동작은 해당 Unit으로 위임된다.
