# F04-03. 클럽 생성/수정/삭제/소유권 이전 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

## 1. 결론

클럽 메타정보(이름·카테고리·소개·규칙·가입방식·커버 이미지)를 OWNER가 만들고, 정보 수정은 OWNER·ADMIN이 한다. 생성 시 OWNER 멤버 자동 등록 + 기본 게시판 3개(공지/자유/가입인사) + ClubFund가 자동 생성된다. 삭제는 단순 행 제거가 아니라 활성 구독 일할 환불, 진행 중 이벤트 취소, 멤버 가입비 환불, 기금 잔여분 일괄 환불, 알림 발송까지 묶이는 복합 처리다. 소유권 이전은 받는 회원이 7일 안에 수락해야 효력이 생기고, 그때 두 멤버의 역할이 OWNER↔ADMIN으로 바뀐다.

프론트 진입과 사용자 조작은 다음 원천 흐름을 기준으로 판단한다.

- 생성: 클럽 목록 (`/clubs`) FAB(+) — F04-01에서 push.
- 수정: 클럽 상세(`/clubs/:id`) > 설정 톱니 > "클럽 정보 수정" (OWNER·ADMIN).
- 삭제: 클럽 수정 화면 하단 위험 영역 → 다이얼로그 → 호출.
- 소유권 이전: 클럽 설정 메뉴 (별도 화면 — 본 단위 명시 컴포넌트 없음. 멤버 목록 길게 누르기 등에서 진입 가능).

## 2. 코드 위치

계약의 정본은 코드다. 서버: `ClubController`, `ClubService`, `AccountingLedgerService`, `ClubFundService`, `ClubDonationService`, `ClubBoardService`, `NotificationService`. 앱: `club_create_screen.dart`, `club_edit_screen.dart`, `club_form.dart`, `club_delete_dialog.dart`.

<!-- source-references:start -->
서버 창구: `ClubController#createClub`, `ClubController#updateClub`, `ClubController#deleteClub`, `ClubController#transferOwnership`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. **생성**:
   - 진입: `clubFormNotifierProvider.build()` → 빈 폼.
   - 사용자 입력 → notifier 업데이트.
   - 제출: `validate()` → 통과 시 (썸네일 파일이면 `fileRepository.generatePresignedUrl` → `uploadFile`) → `clubRepository.createClub(ClubAddParam)` → `POST /api/v1/clubs` → `Result<ClubDetail>`.
   - 성공: `context.go('/clubs/${club.id}')` + `clubListNotifier` invalidate.
2. **수정**:
   - 진입: `clubFormNotifier.initFromClub(detail)` 호출.
   - 제출: `updateClub(clubId)` → `PATCH /api/v1/clubs/:id` → 성공 시 `clubDetailNotifier.refresh()` + pop.
3. **삭제**:
   - 다이얼로그 → `clubDetailNotifier.deleteClub()` → `DELETE /api/v1/clubs/:id` → 성공 시 `context.go('/clubs')` + `myClubsNotifier.refresh()` + `clubListNotifier` invalidate.
4. **소유권 이전** (스펙 SCR-CL-004 위험영역 또는 별도 메뉴):
   - 제안: 클럽장이 재인증한 뒤 `POST /api/v1/clubs/:id/transfer-ownership` → 201 과 승계 행(`PROPOSED`, 7일 유효). 이때 역할은 바뀌지 않는다.
   - 받는 회원: `GET /api/v1/clubs/ownership-transfers/me`·`/{transferId}` 로 받은 제안을 보고, 책임 내용을 확인하고 재인증해 `POST .../{transferId}/accept` 로 수락한다. 수락한 처리 안에서 바로 효력이 생겨(`EFFECTIVE`) 두 멤버의 역할이 OWNER↔ADMIN 으로 바뀌고 응답의 새로 읽기 표지가 켜진다. 거절은 `.../decline`, 클럽장의 취소는 `.../cancel` 이다.
   - 7일 안에 수락하지 않으면 만료 작업이 `EXPIRED` 로 닫는다. 상태는 `PROPOSED`·`EFFECTIVE`·`DECLINED`·`EXPIRED`·`CANCELLED` 이고, `ACCEPTED` 는 수락 처리 안의 중간 단계라 저장되지 않는다. 운영자 비상 승계는 바로 `EFFECTIVE` 행을 남긴다.

## 4. 제품 규칙

- 소유 한도: 한 사람이 소유하는 클럽은 기본 5개(설정값)다.
- 입력: 이름 2~30자, 소개 10~500자는 화면이 막는다(서버 상한은 이름 100자, 소개 500자). 커버 이미지는 5MB 이하다.
- 권한: 정보 수정은 OWNER·ADMIN, 삭제와 소유권 이전은 OWNER만 한다.
- 소유권 이전은 즉시 바뀌지 않는다. 클럽장이 재인증하고 제안하면 받는 회원이 7일 안에 책임 내용을 확인하고 재인증해 수락해야 효력이 생긴다. 받는 회원은 거절, 클럽장은 취소할 수 있고, 7일이 지나면 만료된다. 클럽당 진행 중 제안은 하나다.
- 받는 회원은 이 클럽 회원이고 활성 계정이며 서로 차단이 없어야 한다.
- 진행 중 인출, 미정산, 기금으로 상계하고도 남는 미수금이 있으면 수락할 수 없다. 신고·분쟁·제재·예정 모임은 막지 않고 책임 내용으로 보여 준다.
- 수락하면 같은 통화의 기금으로 미수금을 먼저 상계하고, 옛 클럽장은 ADMIN 이 되며 위임 권한 비트를 잃고, 옛 클럽장 구독은 환불 없이 끝난다.
- 받는 회원의 갱신은 수락 때 고른다. 자동 갱신은 남은 기간이 있으면 잇고 결제하지 않으며, 없으면 고른 요금제로 바로 첫 기간을 결제한다. 수동 갱신은 결제 없이 넘겨받는다.
- 운영자 비상 승계는 받는 회원의 동의·재인증·청구 없이 하고 보류 조건은 같다. 진행 중 제안을 닫고 두 회원에게 알린다.
- 폐쇄 불가: 진행 중 강퇴·차단 분쟁, 끝나지 않은 인출. 미수금이 있으면 금액을 맞춰 확인해야 한다.
- 폐쇄의 돈 순서(통화마다): 구독 잔여 환불, 가입비 환불, 기부 반환, 남은 기금 상계, 클럽장 납부, 몰수. 앞 클럽장의 지갑 몫은 돌려주지 않는다. 진행 중 소유권 제안은 끝나고 받는 회원에게 알린다.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 클럽 신규 생성 (Happy Path) | 운영 클럽 0개. | 본인 OWNER. 기본 게시판 3개 자동 생성. ClubFund 0원으로 시작. |
| S2 | 이름 중복 / 운영 클럽 한도 초과 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S3 | 클럽 정보 수정 (Happy Path) | OWNER. | 변경 반영, ownerId 불변. |
| S4 | OWNER 아닌 사용자가 수정 시도 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S5 | 클럽 삭제 (Happy Path, 활성 클럽 정리) | OWNER, 활성 멤버 18명, 활성 구독자 3명, 진행 OPEN 이벤트 2개, 기금 잔액 50,000원. | 클럽은 INACTIVE(레코드는 남음). 멤버 모두 빠짐. 진행 이벤트 모두 취소. |
| S6 | 소유권 이전 | OWNER가 직장 사정으로 ADMIN 박민수에게 이전. | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S7 | 자기 자신에게 이전 시도 / 비멤버 이전 | 시나리오 본문 참조 | 종료 상태는 시나리오 본문/QA 기준으로 확인 |
| S8 | 비활성 클럽 이전 시도 | 시드 클럽(`Seoul Weekend Boardgamers`, clubId=1201). | 사용자는 클럽 상세에 머무르며 OWNER/ADMIN 전용 surface(`screen.club.settings`)에 접근할 수 없다. |

## 8. Gap / Risk

| 분류 | 근거 | 내용 | 다음 조치 |
|---|---|---|---|
| 후보 | frontend.md:7 | - 삭제: 클럽 수정 화면 하단 위험 영역 → 다이얼로그 → 호출. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:15 | \| `/clubs/:id/settings` (또는 edit) \| `screens/club_edit_screen.dart` \| 수정 + 위험 영역 \| | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:47 | - 위험 영역: "🔴 클럽 삭제" 카드, 텍스트 빨강. | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:69 | 4. **소유권 이전** (스펙 SCR-CL-004 위험영역 또는 별도 메뉴): | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | frontend.md:80 | - **위험 영역 색상**: 빨강 텍스트, 경고 카드 | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:40 | 1. 수정 화면 위험 영역 → "클럽 삭제" → 다이얼로그 → 클럽명 정확 입력 → "삭제하기". | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:80 | ### S1 보강 — 생성 폼 라벨 / 가입 방식 옵션 / 검증 카피 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:93 | ### S3 보강 — 설정 화면 필드 라벨 + 위험 영역 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:101 | - 위험 영역에 `'🔴 클럽 삭제'` 텍스트 1개 + `'삭제 시 모든 데이터가 복구 불가능합니다'` 안내 1개. (이모지 `🔴` 포함 — 디자인 토큰화 시 동기 갱신 필요) | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | scenarios.md:104 | ### S5 보강 — 삭제 확인 다이얼로그 카피 surface | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |
| 후보 | diagrams.md:15 | Edit -->\|위험영역\| DelDialog[🔵 클럽 삭제 다이얼로그<br/>클럽명 입력 가드] | 실제 소스 대조 후 Gap/Risk/Decision Needed 중 하나로 확정 |

## 9. 수용 기준

- **AC-01. 클럽 신규 생성 (Happy Path)**: Given 운영 클럽 0개. When 사용자가 해당 흐름을 실행하면 Then 본인 OWNER. 기본 게시판 3개 자동 생성. ClubFund 0원으로 시작.
- **AC-02. 이름 중복 / 운영 클럽 한도 초과**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-03. 클럽 정보 수정 (Happy Path)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 변경 반영, ownerId 불변.
- **AC-04. OWNER 아닌 사용자가 수정 시도**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-05. 클럽 삭제 (Happy Path, 활성 클럽 정리)**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 클럽은 INACTIVE(레코드는 남음). 멤버 모두 빠짐. 진행 이벤트 모두 취소.
- **AC-06. 소유권 이전**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-07. 자기 자신에게 이전 시도 / 비멤버 이전**: Given 원천 시나리오의 시작 조건 When 사용자가 해당 흐름을 실행하면 Then 원천 시나리오의 종료 상태와 화면/API 결과
- **AC-08. 비활성 클럽 이전 시도**: Given 시드 클럽(`Seoul Weekend Boardgamers`, clubId=1201). When 사용자가 해당 흐름을 실행하면 Then 사용자는 클럽 상세에 머무르며 OWNER/ADMIN 전용 surface(`screen.club.settings`)에 접근할 수 없다.
