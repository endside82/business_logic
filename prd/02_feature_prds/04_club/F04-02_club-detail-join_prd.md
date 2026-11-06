# F04-02. 클럽 상세 보기 & 가입/탈퇴 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

클럽의 메타정보(이름/카테고리/소개/멤버수/소유자)를 조회하면서 동시에 현재 사용자의 멤버십 컨텍스트(`myRole`, `myMembershipStatus`)를 함께 내려준다. 가입은 자유가입(즉시 멤버)/승인가입(대기열) 두 결과 타입(`MEMBER`/`WAITLIST`)을 같은 엔드포인트(`POST .../join`)로 분기 처리한다. 탈퇴는 `DELETE .../leave`로 OWNER만 제외하고 가능하다. 다만 현재 `/home/clubs/:id`는 Flutter public prefix인 반면 상세 GET은 JWT 필수이고, APPROVAL 가입 화면도 메시지를 받지 않은 채 `message=null`로 신청한다.

### 2026-07-29 소스 재실측 — 멤버 전용 핏 프리뷰

- 인증된 **현재 클럽 멤버만** `GET /api/v1/clubs/{clubId}/fit-preview`를 호출할 수 있다. 비멤버는 403이며 가입 전 전환 유도 정보로 쓰지 않는다.
- 응답은 `ClubFitPreviewVo { knownMembersBucket?, similarTraitBucket?, traitAxisDistribution }`다. 인원수는 `FEW`(1~2), `SEVERAL`(3 이상) 버킷만 노출하고 0명은 필드 자체를 생략한다.
- `knownMembersBucket`은 증거등급 공동참석 이력이 있는 현재 멤버 수다. 뷰어·차단 사용자는 후보에서 제외한다.
- `similarTraitBucket`은 양쪽의 최신 제출 trait 점수에서 공통 축이 4개 이상이고 평균 절대 차이가 20 이하인 멤버 수다. trait 점수가 있는 후보가 5명 미만이면 필드를 생략한다.
- `traitAxisDistribution`은 멤버 최신 trait 점수를 축별 `LOW(0~33) / MID(34~66) / HIGH(67~100)` 비율로만 제공한다. 축 표본 5명 이상이고 0이 아닌 각 밴드가 최소 5명일 때만 노출하며 원점수·원인원은 내려가지 않는다. 표시할 축이 없으면 빈 배열이다.
- Flutter `ClubFitPreviewSection`은 `clubFitPreviewProvider`를 통해 상세에 붙고, 데이터가 전부 억제되면 섹션을 숨긴다.

실측 근거: `ClubFitPreviewController/Service`, `TraitFitPreviewService`, `ClubFitPreviewVo`, Flutter `connectivity_api.dart`, `club_fit_preview_section.dart` 및 widget test.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 클럽 목록 카드 탭 (F04-01)
- 홈 클럽 카드·공유 링크 (`/home/clubs/:id`)
- 내 클럽 카드 탭 (F04-07)
- 알림 클릭 (가입 승인/거절/초대 등 → DeepLink → `/clubs/:id`)
- 딥링크 `community://clubs/{id}`

현재 `GET /api/v1/clubs/{id}`를 공개하는 Security matcher가 없어 상세 조회 자체가 JWT 인증 필수다. 반면 Flutter의 `/home/clubs` prefix는 public route라 비로그인 사용자가 라우터를 통과한 뒤 상세 GET에서 401을 받고, 화면은 이를 `"클럽을 찾을 수 없습니다"`로 축약한다. `/clubs/:id`는 public prefix가 아니므로 비로그인 진입 시 로그인으로 이동한다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `WalletService`, `AccountingLedgerService`, `NotificationService`. 앱: `club_detail_screen.dart`.

## 3. 전체 동작 흐름

1. 화면 진입: `clubDetailNotifierProvider(clubId).build()` ▶ `clubRepository.getClubDetail` ▶ `GET /api/v1/clubs/:id`
2. 가입 액션: `clubJoinNotifierProvider.joinClub(clubId)` ▶ `clubRepository.joinClub` ▶ `POST /api/v1/clubs/:id/join`
   - 현재 화면에는 가입 메시지 입력 UI가 없어 FREE/APPROVAL 모두 `message=null`로 호출한다.
   - 성공: `clubDetailNotifier.refresh()`로 상세 재조회 + `clubListNotifier` invalidate (목록 카드 상태 동기화)
3. 탈퇴 액션: `leaveClub` ▶ `DELETE /api/v1/clubs/:id/leave` ▶ pop + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate
4. 권한 정보: `clubPermissionProvider(clubId)` (별도 provider) — myRole 기준 staff 메뉴 가시성 결정
5. 예정 이벤트 미리보기: `clubUpcomingEventsProvider(clubId)` (Unit 04 F04-12로 분리)

## 4. 제품 규칙

- 하단 버튼은 회원 상태로 갈린다. 비회원은 「가입하기」, 신청 뒤에는 누를 수 없는 「승인 대기 중」, 회원은 「클럽 홈」, 차단된 사람은 누를 수 없는 「가입할 수 없습니다」. 클럽장에게는 가입 버튼이 없다.
- 운영 중지(SUSPENDED) 클럽은 서버가 내려 줘도 앱이 상세 전체를 막고 운영 중지 안내만 보인다.
- 상세의 미리보기는 예정 이벤트 최대 3개, 멤버 아바타 5개와 남은 수다.
- 가입 신청과 회원 탈퇴는 알림을 보낸다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 자유가입 클럽 즉시 가입 (Happy Path) | `joinType=FREE`, `clubType=FREE` (가입비 없음). | ACTIVE 멤버, OWNER에게는 알림 미발송 (FREE 가입은 알림 분기 없음). |
| S2 | 승인가입 클럽 신청 → 대기열 | `joinType=APPROVAL`. | `myMembershipStatus=PENDING`. 추후 승인은 F04-05. |
| S3 | 중복 가입 시도 / 이미 신청 중 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S4 | 비멤버 탈퇴 (멤버 → 탈퇴) | ACTIVE MEMBER, 가입 30일 경과. | ACTIVE 멤버 아님. |
| S5 | OWNER 탈퇴 시도 (실패 시나리오) | 클럽 OWNER. | 여전히 OWNER. F04-03의 소유권 이전을 안내. |
| S6 | BUSINESS 클럽 자유가입 (가입비 결제, FREE join) | `clubType=BUSINESS`, `memberFee=10000`, `joinType=FREE`. | 멤버. 7일 내 탈퇴 시 가입비 환불 가능. |
| S7 | SUSPENDED 클럽 진입 (에러 시나리오) | alice 가 이미 club 1201 의 ADMIN. 시드 club_member 1222 ACTIVE. | 가입 시도 불가. |
| S8 | 비로그인 홈 상세 진입 | 인증 토큰 없이 `/home/clubs/{id}` 진입 | public route matcher는 통과하지만 상세 GET이 401이고 화면은 `"클럽을 찾을 수 없습니다"`를 표시한다. 로그인 CTA까지 도달하지 못한다. |
| S9 | APPROVAL 클럽 가입 신청 | 인증 비멤버, `joinType=APPROVAL` | 가입 메시지 입력 없이 `message=null`로 요청하고 `WAITLIST`/`PENDING` 상태가 된다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| Gap | `Routes.publicRoutes`, `SecurityConfiguration`, `club_detail_screen.dart` | Flutter `/home/clubs/:id`는 public prefix지만 상세 GET은 JWT 필수라 게스트가 401을 받고, 화면은 이를 일반 `"클럽을 찾을 수 없습니다"`로 축약한다. | 공개 상세 계약을 서버와 맞추거나 앱 public prefix/로그인 분기 및 오류 표현을 정렬 |
| Gap | `club_detail_screen.dart`, `club_join_provider.dart` | APPROVAL 가입도 메시지 입력 UI 없이 `joinClub(clubId)`를 호출해 신청 body의 `message`가 null이다. | 메시지가 제품상 필요하면 입력 UI와 검증을 연결하고, 선택 사항이면 승인 화면의 기대 계약을 명시 |

## 9. 수용 기준

- **AC-01. 자유가입 클럽 즉시 가입 (Happy Path)**: Given `joinType=FREE`, `clubType=FREE` (가입비 없음). When 사용자가 해당 흐름을 실행하면 Then ACTIVE 멤버, OWNER에게는 알림 미발송 (FREE 가입은 알림 분기 없음).
- **AC-02. 승인가입 클럽 신청 → 대기열**: Given `joinType=APPROVAL`. When 사용자가 해당 흐름을 실행하면 Then `myMembershipStatus=PENDING`. 추후 승인은 F04-05.
- **AC-03. 중복 가입 시도 / 이미 신청 중**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-04. 비멤버 탈퇴 (멤버 → 탈퇴)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then ACTIVE 멤버 아님.
- **AC-05. OWNER 탈퇴 시도 (실패 시나리오)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 여전히 OWNER. F04-03의 소유권 이전을 안내.
- **AC-06. BUSINESS 클럽 자유가입 (가입비 결제, FREE join)**: Given `clubType=BUSINESS`, `memberFee=10000`, `joinType=FREE`. When 사용자가 해당 흐름을 실행하면 Then 멤버. 7일 내 탈퇴 시 가입비 환불 가능.
- **AC-07. SUSPENDED 클럽 진입 (에러 시나리오)**: Given alice 가 이미 club 1201 의 ADMIN. 시드 club_member 1222 ACTIVE. When 사용자가 해당 흐름을 실행하면 Then 가입 시도 불가.
- **AC-08. 비로그인 홈 상세 진입**: Given 인증 토큰이 없음 When `/home/clubs/{id}`로 진입하면 Then public route matcher는 통과하지만 상세 GET은 401이고 화면은 `"클럽을 찾을 수 없습니다"`를 표시한다.
- **AC-09. APPROVAL 클럽 가입 신청**: Given 인증 비멤버이고 `joinType=APPROVAL` When 가입 신청 CTA를 탭하면 Then 메시지 입력 없이 `message=null`로 요청하고 WAITLIST/PENDING 상태가 된다.
