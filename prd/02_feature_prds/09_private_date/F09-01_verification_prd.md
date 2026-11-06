# F09-01. 본인 인증 (Toss) PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

> 문서 상태: **실사 기반 전환본 v2 — 2026-05-27 Phase 0 보안 하드닝 반영.** 시도 단위 세션 테이블 신설(txId 바인딩·일일제한·만료·실패 전이 정확화), Member 인구통계 동기화 훅, Redisson 사용자별 락, 공통 AES 코덱이 추가됐다. 코드 수정/QA 착수 전에는 `community_api/src/main/java/com/endside/community/privatedate/` 와 `community_api/src/main/java/com/endside/community/account/service/MemberService.java` 를 직접 다시 연다.

## 1. 결론

데이팅 진입의 게이트. 사용자는 Toss 본인인증 SDK를 통해 실명·생년월일·성별·CI를 검증받아야 데이팅 프로필 작성·후보자 노출·매칭 액션 등 모든 후속 기능에 접근할 수 있다. 서버는 Toss 인증 URL과 txId를 발급하고, 사용자가 Toss에서 인증을 마친 뒤 txId로 결과를 회신받아 개인정보를 AES 암호화해 저장한다.

**Phase 0(2026-05-27)에서 잠재 버그 4건을 동시 수정**했다:
- (1) `/verify`가 클라가 보낸 임의 txId를 그대로 Toss로 넘기던 미바인딩 → 발급 txId를 HMAC-SHA256으로 사용자에 바인딩(`identity_verification_session`).
- (2) 일일 5회 제한이 `IdentityVerification` 단일 row 재사용으로 무력화되던 버그 → 세션 `requested_at` 기준 카운트.
- (3) `isVerified()`가 status만 보고 `expiresAt`을 무시하던 버그 → 만료 인증도 false 반환.
- (4) provider 실패 시 row가 PENDING 잔류 → 세션 `FAILED`/`EXPIRED` 상태 전이(REQUIRES_NEW로 보존).

또한 인증 성공 시 검증값(gender/birthDate)이 `Member` 인구통계로 **afterCommit 동기화**되어 [[F03-18 event-demographics]] / [[F04-17 club-demographics]] 의 데이터 원천이 된다.

현재 이 PRD에서 바로 봐야 할 것은 다섯 가지다. 첫째 서버가 실제로 제공하는 endpoint/상태/side effect, 둘째 Flutter가 그 값을 어떤 route/provider/widget/CTA로 소비하는지, 셋째 시도 세션의 라이프사이클(PENDING→VERIFIED/FAILED/EXPIRED)과 클라 임의 txId 차단, 넷째 Member 인구통계 동기화의 트랜잭션 분리(afterCommit + REQUIRES_NEW), 다섯째 시나리오 문서가 이미 드러낸 Gap/Risk 후보를 실제 소스 대조로 확정하는 것.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `DateVerificationController`, `MemberService`, `VerificationBackfillService`, `VerificationService`, `AesEncryptionService`. 앱: `verification_screen.dart`.

<!-- source-references:start -->
서버 창구: `DateVerificationController#requestVerification`, `DateVerificationController#verify`, `DateVerificationController#getStatus`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 3. 전체 동작 흐름

1. 화면 진입 시: `dateVerificationNotifierProvider` ▶ `DateVerificationRepository.getStatus()` ▶ `GET /api/v1/date/verification/status` ▶ `VerificationVo` (IdentityVerification 단건)
2. "본인 인증하기" 탭 시: `notifier.requestVerification()` ▶ `Repository.requestVerification()` ▶ `POST /api/v1/date/verification/request`
    - 서버: Redisson 사용자 락(`verify:request:{userId}`, wait 3s/lease 10s) 획득 → 트랜잭션 내부에서 ① 오늘 세션 카운트 < 5 검증 ② 유효 인증 존재 시 거부 ③ **기존 PENDING 세션 EXPIRED 처리(best-effort)** ④ `tossVerificationService.requestAuthUrl()` ▶ ⑤ `identity_verification_session` row 생성(provider=`toss-cert`, `tx_id_hash=HMAC(txId)`, status=PENDING, requested_at=now, expires_at=now+10분)
    - 응답 `TossIdentificationVo{txId, authUrl}` ▶ WebView 호스팅
3. WebView `onSuccess(...)` 시: **안전판 — redirect의 txId 대신 발급 txId(`widget.txId`)를 사용** ▶ `notifier.verify(txId)` ▶ `Repository.verify(TossVerifyParam(txId))` ▶ `POST /api/v1/date/verification/verify`
    - 서버: HMAC(txId)로 `(userId, tx_id_hash, status=PENDING)` 세션 조회 → 미존재 시 `DATE_VERIFICATION_SESSION_INVALID(400, 1600023)`, 만료 시 `DATE_VERIFICATION_EXPIRED(400, 1600017)` + 세션 EXPIRED
    - `tossVerificationService.verifyIdentification(txId)` 호출 — 실패 시 `self.markSessionFailed(...)`(REQUIRES_NEW)로 세션 FAILED 보존 후 예외 전파
    - 성공 시 `IdentityVerification` 갱신(VERIFIED, name/birthDate/ci AES 암호화, gender 1·2·0 매핑, expiresAt=now+1년) + 세션 VERIFIED
    - **afterCommit** 콜백으로 `MemberService.syncVerifiedDemographics(userId, gender, birthDate)`(REQUIRES_NEW) — 인증 트랜잭션이 커밋된 뒤에만 실행, 실패해도 인증은 성공

## 4. 제품 규칙

- 본인 인증(Toss)을 마친 사람만 데이팅 프로필을 만들고, 후보로 노출되고, 좋아요를 보낼 수 있다. 상대의 인증이 만료되거나 운영자가 수동 승인을 취소하면 그 사람은 후보에서 빠진다.
- 인증은 1년간 유효하다. 유효한 인증이 있으면 다시 요청할 수 없고, 만료되면 다시 인증한다.
- 하루에 시도는 5번까지다. 한 사람이 동시에 여러 번 요청해도 하나씩만 처리되고, 처리 자리를 얻지 못한 요청은 하루 한도 초과와 같은 오류로 보인다.
- 한 시도는 10분 안에 마쳐야 한다. 내가 받은 시도가 아닌 인증 번호로 확인을 요청하면 거절되고, 시간이 지나면 만료 오류가 난다. 새 요청을 하면 이전의 대기 시도는 만료로 바뀐다. 앱은 이런 실패를 구분하지 않고 「인증 확인에 실패했습니다. 다시 시도해주세요.」 하나로 보여 준다.
- 이름, 생년월일, CI는 암호화해 저장하고 응답에 평문으로 내려주지 않는다. 성별은 남 1, 여 2, 기타 0으로 저장한다.
- 인증이 성공하면 회원의 성별과 생년이 이벤트·클럽 인구통계용 정보로 함께 갱신된다. 이 갱신은 인증이 확정된 뒤에만 일어난다.
- 인증 화면은 상태에 따라 네 갈래다: 미인증 또는 대기(인증 안내), 유효(인증 완료), 만료, 실패.

## 6. 상태/권한/시나리오 매트릭스

| ID | 시나리오 | 시작/조건 | 관찰 가능한 종료 상태 |
|---|---|---|---|
| S1 | 데이팅 첫 진입 → 본인 인증 → 프로필 작성 (Happy Path) | 로그인, IdentityVerification row 없음 | `IdentityVerification.status = VERIFIED`, 세션 VERIFIED, **Member.gender/birthDate 동기화**(afterCommit), 데이팅 모든 기능 사용 가능 |
| S2 | 일일 5회 한도 초과 | 오늘 세션(`identity_verification_session.requested_at`) 5건 누적 | `DATE_DAILY_LIMIT_EXCEEDED`(429), 신규 세션·인증 row 미생성 |
| S3 | Toss 인증 중도 취소 | `requestVerification` 성공, 세션 PENDING | 세션 PENDING 유지(or TTL 만료 후 EXPIRED), 다음 `/request` 시 EXPIRED로 전이 |
| S4 | Toss 결과 조회 실패 | `verifyIdentification` 예외 | `self.markSessionFailed`(REQUIRES_NEW) → 세션 FAILED + failure_code 보존, 인증 row PENDING 유지 |
| S5 | 1년 후 만료 → 재인증 | `expiresAt < now` | `isVerified=false`(만료 검증), 재요청 허용 → 신규 verifiedAt/expiresAt |
| S6 | 이미 유효 인증자의 강제 재요청 | `existsByUserIdAndStatusAndExpiresAtAfter=true` | `DATE_VERIFICATION_REQUIRED`(400), 변동 없음 |
| **S7 (신규)** | 클라가 임의/위조 txId로 `/verify` | 발급된 PENDING 세션과 HMAC 불일치 | `DATE_VERIFICATION_SESSION_INVALID`(400), Toss 호출 안 함 |
| **S8 (신규)** | 세션 TTL 초과 후 `/verify` | 세션 expires_at < now | 세션 EXPIRED 전이 + `DATE_VERIFICATION_EXPIRED`(400) |
| **S9 (신규)** | 동시 다중 요청 | 같은 userId로 동시 `/request` 다발 | Redisson 락으로 직렬화. 락 미획득은 `DATE_DAILY_LIMIT_EXCEEDED`(429) |
| **S10 (신규)** | 기존 VERIFIED 사용자 backfill | Phase 0 이전 인증 row | `VerificationBackfillService` 1회 실행 → 검증 birthDate/gender가 Member에 반영(idempotent) |

## 7. 정합성 판단

| 항목 | 확인 기준 | 현재 판단 |
|---|---|---|
| 서버 계약 | Controller/Service/VO/Enum + Phase 0 신규(세션·HMAC·락·afterCommit) | trace에 명시된 신규 파일들이 실제로 존재함(테스트 18개 통과) |
| 프론트 계약 | Route/API/Repository/Provider/Screen + txId 안전판 | `toss_verification_webview.dart`의 success 콜백이 `widget.txId` 전송으로 변경 확인 |
| 상태/권한 | 시나리오별 종료 상태(특히 S7~S10 신규) | 단위테스트로 S2/S5/S7/S8/S9 검증, S10은 backfill 서비스 단위테스트 |
| 외부 영향 | Member 인구통계 동기화 / export·삭제 / NICE 후속 | F03-18·F04-17·F13-05/06/07 PRD 참조 |

## 8. Gap / Risk

**Phase 0에서 해결됨:**
- ✅ txId 미바인딩(클라 임의 txId 통과) — HMAC 세션 바인딩
- ✅ 일일 제한 무력화(unique row 재사용) — 세션 카운트
- ✅ 서버 만료 미검증(`isVerified`) — `expiresAt > now` 추가
- ✅ FAILED 상태 전이 부재 — `markSessionFailed`(REQUIRES_NEW)
- ✅ Member 동기화 불일치 가능성 — afterCommit으로 보강

**잔존(후속):**
- ⚠️ **staging Toss 검증 필요** — txId 왕복 일치, `birthday` 실제 포맷(yyyyMMdd 가정), 세션 TTL(10분) vs Toss authUrl 유효시간 적정성
- ⚠️ **NICE 멀티 프로바이더(Phase 2)** — `docs/plan/identity/VERIFICATION_PROVIDER_PLAN.md` 참조. 현재는 Toss 단독, NICE 연동은 계약 후 마지막 단계
- ⚠️ **network-in-tx 잔존** — `requestVerification/verify`가 Toss 네트워크 호출을 트랜잭션 안에서 수행(기존부터 존재). staging 후 별도 리팩터 권장
- ⚠️ **동시성 엄격화 best-effort** — 사용자별 락은 burst 직렬화에는 충분하나, "단일 PENDING 정책"은 best-effort. `UNIQUE(user_id, provider, tx_id_hash)`는 정확한 중복행만 차단
- 후속 안내 UX(에러코드별 토스트 메시지 정교화) — 앱 측 일반 처리 중

## 9. 수용 기준

- **AC-01 (Happy Path)**: 신규 사용자 → 인증 완료 → 데이팅 진입. Member.gender(1·2)/birthDate가 검증값으로 갱신.
- **AC-02 (일일 제한)**: 오늘 세션 5건 누적 시 6번째 `/request`는 `DATE_DAILY_LIMIT_EXCEEDED`.
- **AC-03 (Toss 중도 취소)**: WebView 닫음 → 세션 PENDING. 다음 `/request` 시 직전 PENDING → EXPIRED.
- **AC-04 (Toss 결과 실패)**: `verify` 호출 후 Toss 502 → 세션 FAILED + failure_code 저장. 사용자 재시도 가능.
- **AC-05 (1년 만료 재인증)**: `expiresAt < now` → `isVerified=false` → 재요청 → 신규 expiresAt(+1년).
- **AC-06 (재요청 거부)**: 유효 인증자의 `/request` → `DATE_VERIFICATION_REQUIRED`.
- **AC-07 (txId 위조 차단, 신규)**: 클라가 발급받지 않은 txId로 `/verify` → `DATE_VERIFICATION_SESSION_INVALID`, Toss 호출 없음.
- **AC-08 (세션 만료, 신규)**: 세션 expires_at 경과 후 `/verify` → `DATE_VERIFICATION_EXPIRED` + 세션 EXPIRED.
- **AC-09 (동시 요청 직렬화, 신규)**: 같은 userId 동시 `/request` 다발 → Redisson 락으로 순차 처리, 실패는 429.
- **AC-10 (Member 동기화, 신규)**: 인증 커밋 후 `Member.gender ∈ {1,2}` + 유효 `birthDate`가 검증값으로 반영(인증 롤백 시 미반영).
- **AC-11 (backfill, 신규)**: 기존 VERIFIED 사용자에 `VerificationBackfillService` 실행 → Member 인구통계 갱신(재실행 idempotent).

## 10. 미결정 / 후속

- **NICE 연동(Phase 2)** — `docs/plan/identity/VERIFICATION_PROVIDER_PLAN.md` 잔여 결정 Q1(NICE 확정)·Q2(DI 저장 확정), Q3·Q4·Q5는 멀티 프로바이더 도입 시 닫힘.
- **staging Toss 검증** — Phase 0 가정(yyyyMMdd birthday, 10분 세션 TTL)을 실 환경으로 확인.
- **network-in-tx 분리 리팩터** — staging 확보 후 `request authUrl` / `verify 결과조회` / `DB 상태전이` 트랜잭션 경계 분리.
- **VerificationBackfillService 운영 트리거** — 1회성 배치 또는 admin 엔드포인트(`community_admin_api`). 실행 시 dry-run + 감사 로그 필수, PII 평문 로그 금지.
