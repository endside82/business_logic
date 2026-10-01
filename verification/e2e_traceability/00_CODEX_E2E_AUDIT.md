# Codex E2E 외부 감사 보고서 (2차 라운드 — 아카이브)

<!-- release-document: reference -->
> **문서 구분: 과거 검증 참고 기록.** 현재 할 일은 [출시 실행 계획표](../../../docs/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

> ⚠️ **이 문서는 2차 라운드(E2E 추적 직후) 감사 보고서다.** F09-06 SOS/체크인에 대한 당시 판정("미구현 positive E2E의 RED 상태")은 이후 사용자 확인으로 **"의도적 미운영(이전 결정으로 삭제됨)"**으로 정정되었다. 최종 결론은 [`../00_MASTER_SUMMARY.md`](../00_MASTER_SUMMARY.md), [`00_E2E_MASTER_SUMMARY.md`](00_E2E_MASTER_SUMMARY.md), [`00_CODEX_ROUND3_AUDIT.md`](../../archive/2026-09-28/verification/00_CODEX_ROUND3_AUDIT.md) 참조. 본 문서의 F09-06 관련 표현(`서버 미구현`, `미구현 positive E2E`)은 그 시점의 판정 그대로 보존한다.

검증 기준: 실제 파일 시스템의 `ls`/`find`/`rg`, 원본 Flutter integration test, Spring controller, Flutter Retrofit API, `community-realtime` RUNBOOK/소스만 사용했다.

## 임무 1: 테스트 인벤토리 정확성

- 실제 dart 파일 수: `community_app/integration_test/*.dart` 75개.
- 실제 테스트 파일 수: `*_test.dart` 74개.
- 보조 파일 수: 1개, `e2e_test_utils.dart`.
- Claude 보고 정확성: 부정확. 마스터의 "73개 Flutter integration test"는 저장소 인벤토리 기준으로 맞지 않는다.

세부 대조:

| 항목 | 결과 |
|---|---:|
| 전체 `*.dart` | 75 |
| 실제 `*_test.dart` | 74 |
| 보조 dart | 1 |
| 단위 보고서에 등장하는 실제 테스트 unique | 72 |
| 횡단 보고서 포함 시 등장하는 실제 테스트 unique | 74 |
| 단위 보고서 테스트 파일 occurrence 합계 | 73 |

단위 보고서 occurrence 합계 73은 실제 테스트 총수와 같다는 뜻이 아니다. `seed_event_payment_authoring_test.dart`가 Unit 03과 Unit 06에 중복 등장하고, `bulk_screen_smoke_test.dart`/`seed_navigation_smoke_test.dart`는 단위 보고서가 아니라 횡단 보고서에만 있다.

단위 매핑 누락: 실제 `*_test.dart` 기준 0건. 단, 단위 보고서만 보면 횡단 smoke 2건은 제외되어 있다.

추가 발견: 보고서가 존재하지 않는 파일명 3개를 언급한다.

- `seed_dating_block_lifecycle_test.dart`
- `seed_dating_profile_viewers_test.dart`
- `socket_app_roundtrip_test.dart` (실제 파일은 `seed_dating_socket_app_roundtrip_test.dart`)

## 임무 2: Unit 11 +29 신규 추가 검증

- 5개 테스트에서 14개 `scenarioMode` 추출 주장은 정확하다.
- 실제 모드 수: 2 + 2 + 4 + 4 + 2 = 14.
- Unit 11 `scenarios.md` 파일에는 `## E2E-derived` 섹션이 0개다.
- 따라서 "+29 신규 추가"는 `scenarios.md`에 신규 추가된 흐름이 아니라, Unit 11 보고서의 A 분류, 즉 기존 Unit 11 시나리오 중 E2E가 아직 커버하지 못한 후보 29건으로 해석해야 한다.

의미있는 신규/보강 판단:

- 테스트 추가 후보 기준: 의미있는 신규 커버리지 갭 29건 / surface 보강 오분류 의심 0건.
- `scenarios.md` 신규 추가 기준: 의미있는 신규 0건. 실제 파일에 추가된 Unit 11 E2E-derived 섹션이 없기 때문이다.

Unit 11 보고서의 +29 자체는 단순 surface 보강을 "추가"로 잘못 센 것으로 보이지 않는다. F11-01 제출 성공/오류, F11-03 수정/삭제, F11-05 신뢰점수 이력, F11-06 취향 평가/페이지네이션 등은 대부분 실제 동작 검증 갭이다. 다만 다음 기존 커버 분류는 과대 평가되어 있다.

- F11-04 S1은 REVIEW 신고 happy path인데, 실제 `report_submit_success_surface`는 `targetType=USER` fake submit 성공만 검증한다. REVIEW 대상 submit 성공은 `report_surface`의 화면 표면 검증과 합쳐도 엄밀히 C가 아니라 B에 가깝다.
- F11-04 S4는 기타 사유 10자 미만의 에러 문구는 검증하지만 버튼 비활성 여부는 직접 검증하지 않는다. "제출 차단" 전체를 C로 보기는 어렵다.

권장 우선순위 6건은 대체로 합리적이다. 특히 F11-04 S5, F11-01 S1, F11-02 S4는 회귀 가치가 높다. 단, F11-03 전반은 현재 UI 트리거가 미구현이므로, UI E2E보다 repository/provider 또는 임시 harness 수준의 검증으로 분리하는 편이 현실적이다.

## 임무 3: F09-06 회귀 가드 주장 검증

- mock 사용 여부: mock/provider override/fake 없음. `pumpCommunityApp(tester)`를 override 없이 호출하고, seed 계정으로 로그인한 뒤 `/dating/chat/2417?matchId=2416...` 라우트에 직접 진입한다.
- 서버 핸들러 부재: 확인됨. `community_api/src/main/java/com/endside/community/privatedate/controller/`에는 check-in/SOS 핸들러가 없다.
- Flutter `check_in_api.dart`: 이벤트 전용 확인됨. 경로가 모두 `/api/v1/events/{eventId}/check-in...` 이며 dating API가 아니다.
- 앱 date 화면 문자열: `community_app/lib`에서 `"안전 체크인"`/`"안전 체크인이 완료되었습니다"` exact match 0건.

디자인 의도 판단: "의도적 FAIL 회귀 가드"라는 해석은 코드 근거가 약하다. 테스트와 `run_p19_dating_checkin_mutation.sh`에는 `skip`, `TODO`, expected-fail 격리, quarantine 표시가 없고, 실패 시 스크립트는 exit 1을 반환한다. 현 상태는 "미구현 positive E2E가 항상 실패하는 상태"에 가깝다. 미래 구현 완료 여부를 감지하는 가드로 쓸 수는 있지만, 현재 코드가 의도적 회귀 가드로 설계되었다고 단정하면 안 된다.

## 임무 4: `## E2E-derived` 섹션 형식 일관성

- 실제 파일/섹션 수: 27 파일 / 37 섹션.
- 엄격 형식 검사 결과: 33개 섹션 통과, 4개 섹션 형식 미준수.
- 허용한 source 표기: `출처`, `유래`, `E2E 매핑`, `E2E source`.

형식 미준수:

| 파일 | 누락/문제 |
|---|---|
| `F04-01_club-discovery/scenarios.md` | `페르소나`/`시작 상태`/`시퀀스` 없이 "추가 검증 포인트"만 있음 |
| `F04-07_my-clubs-stats/scenarios.md` | 여러 보강 항목을 한 섹션에 인라인으로 묶고 일부 항목에 표준 5필드 없음 |
| `F04-13_fund-overview/scenarios.md` | 표준 5필드 대신 검증 포인트 목록만 있음 |
| `F04-16_subscription/scenarios.md` | `페르소나`/`시작 상태`/`종료 상태` 없이 surface 검증 포인트 중심 |

추가 형식 차이:

- Unit 01은 각 `## E2E-derived 시나리오`가 독립 시나리오이고 `출처`를 사용한다.
- Unit 02/04는 `## E2E-derived` 아래 `### Sx`들을 묶고 `유래`를 사용한다.
- Unit 08은 각 `## E2E-derived 시나리오`가 독립 시나리오이고 `E2E 매핑`을 사용한다.

결론: 27 파일 / 37 섹션이라는 수치는 맞지만, 같은 형식이라고 보기는 어렵다. 일부는 정식 사용자 시나리오가 아니라 surface 보강 메모에 가깝다.

## 임무 5: 횡단 매핑 정확성

- `community_app/scripts/e2e/run_p*_*.sh` 실제 수: 65개.
- `community_app/scripts/e2e/run_p*.sh` 실제 수: 65개.
- `community_app/scripts/e2e/*.sh` 전체 수: 73개.
- Claude 횡단 보고서의 "총 66개"는 부정확하다.

P0~P60 자체는 모두 존재한다. 추가 파일은 P3에 socket 2개가 더 있고, P43에 bundle 2개가 더 있는 구조다.

- 기본 P0~P60: 61개
- P3 추가 socket: 2개
- P43 추가 bundle: 2개
- 합계: 65개

realtime RUNBOOK 매핑:

- 직접 매핑: Unit 09 private_date가 정확하다.
- `community-realtime/scripts/e2e/RUNBOOK.md`, `socket_chat_roundtrip.js`, `DateChatNamespaceConfig` 모두 `/date-chat` namespace만 사용한다.
- `DATE_CHAT_SOCKET_SERVER_CONTRACT.md`가 "Group chats, club chats, event chats are out of scope"라고 명시한다.
- `community_app/lib/presentation/club`, `community_api/src/main/java/.../club`, `community-realtime/src/main/java`에서 클럽 채팅 socket 구현 증거는 발견되지 않았다.

따라서 클럽 채팅 socket 가능성은 현재 코드 기준 매핑 대상이 아니다. 횡단 보고서의 Unit 04 "확장 가능성" 메모는 타당하지만, 현 RUNBOOK의 실제 커버리지는 Unit 09에 한정된다. Unit 12 notification 간접 언급은 인프라 참고로만 남겨야 하며, 알림 비즈니스 E2E 커버리지로 계산하면 안 된다.

## 종합 판정

- 신뢰도: 보통.
- 좋은 점: 실제 테스트 파일 대부분이 보고서 어딘가에는 등장하며, Unit 11의 14개 scenarioMode 추출과 많은 도메인별 qualitative gap 분석은 대체로 유효하다.
- 낮아진 이유: 핵심 총계 2건(Flutter test 73, script 66)이 실제 파일 수와 불일치하고, Unit 11 +29를 `scenarios.md` 신규 추가처럼 읽히게 만든 표현은 실제 파일 상태와 맞지 않는다. F09-06 "의도적 FAIL 회귀 가드"도 코드상 의도 근거가 부족하다.

Claude가 놓친 추가 발견:

1. 실제 테스트는 74개이고 보조 1개라서 `*.dart`는 75개다.
2. 단위 보고서 unique 테스트는 72개이며, cross-cut 2개를 합쳐야 실제 74개가 된다.
3. traceability 보고서에 존재하지 않는 테스트 파일명 3개가 남아 있다.
4. Unit 11에는 `## E2E-derived` 섹션이 0개라서 +29는 신규 시나리오 추가가 아니라 미커버 테스트 후보로 봐야 한다.
5. F11-04 S1/S4의 "이미 커버" 분류가 과대 평가되어 있다.
6. F09-06은 의도적 가드라기보다 미구현 positive E2E가 실패하는 상태다.
7. `## E2E-derived` 37섹션 중 4섹션은 표준 5필드 형식을 따르지 않는다.
8. `run_p*_*.sh`는 65개다.

권장 사항:

1. 마스터 요약의 총계를 `74 integration tests + 1 helper`, `65 run_p scripts`, `37 E2E-derived sections`로 정정한다.
2. "신규 흐름 추가"와 "기존 시나리오의 E2E 미커버 후보"를 분리해 Unit 11 +29 표현을 고친다.
3. F09-06/P19는 구현 전까지 skip/quarantine 하거나 expected-fail 매트릭스로 분리한다.
4. `## E2E-derived` 템플릿을 `페르소나/시작 상태/시퀀스/종료 상태/E2E source`로 통일하고, surface 보강은 별도 `보강 메모` 형식으로 분리한다.
5. 존재하지 않는 테스트 파일명 3개와 `socket_app_roundtrip_test.dart` 오기를 정리한다.

## 한 줄 보고

Codex E2E 감사 완료: 임무 1~5 결과 / 신뢰도 보통 / 추가 발견 8건
