# F20-03. 지원 FAQ 제안 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. 현재 할 일은 [출시 실행 계획표](../../../../docs/development/IMPLEMENTATION_WORKBOARD.md)를 따릅니다.

<!-- source-first: community_api/src/main/java/com/endside/community/support/controller/SupportFaqController.java + SupportFaqSuggestionService.java; updated: 2026-06-05 -->

## 1. 결론

지원 FAQ 제안은 운영 이슈 작성 화면 진입 시 **sourceType별 자주 묻는 질문 2개를 최대 5개까지** 제공하는 경량 기능이다. DB 테이블이 없다. `SupportFaqSuggestionService`의 코드 하드코딩 제안 목록을 keyword로 필터해 반환한다.

서버는 `GET /api/v1/support/faq/suggestions` 1개 endpoint를 제공하며 인증 불필요다. Flutter `SupportIssueApi.getFaqSuggestions()`로 호출하고, `SupportIssueCreateScreen`에서 `_FaqSuggestionsSection` 위젯이 문의 작성 폼 위에 도움말 카드 형태로 표시한다.

**관리자가 FAQ를 추가하거나 편집하는 어드민 CRUD 기능은 구현되어 있지 않다.** FAQ 문구를 바꾸려면 서버 코드를 직접 수정해야 한다.

## 2. 코드 위치

계약의 정본은 코드다. 서버: `SupportFaqController`, `SupportFaqSuggestionService`, `SupportFaqSuggestionVo`. 앱: `support_issue_api.dart`, `support_faq_suggestion.dart`, `support_issue_screens.dart`, `support_issue_provider.dart`.

## 3. 전체 동작 흐름

1. `SupportIssueCreateScreen(sourceType, sourceId)` 빌드 시 `_FaqSuggestionsSection` 구독.
2. `supportFaqSuggestionsProvider(sourceType, sourceId, null)` → `SupportIssueRepository.getFaqSuggestions()` → `GET /api/v1/support/faq/suggestions?sourceType=PAYMENT&sourceId=123`.
3. 서버 `SupportFaqSuggestionService.getSuggestions()` → `baseSuggestions(sourceType)` → keyword 필터(비어 있으면 전체 통과) → priority 오름차순 → 최대 5개 반환.
4. Flutter가 결과가 있으면 "추천 도움말" 섹션 카드 표시. 없거나 오류이면 `SizedBox.shrink()`.

## 6. 상태/권한 매트릭스

| 사용자/상태 | 서버 결과 | Flutter 처리 | 판단 |
|---|---|---|---|
| 비로그인 + 유효한 sourceType | 정상 응답 (인증 불필요) | 도움말 카드 표시 | 일치 |
| 로그인 + 유효한 sourceType | 정상 응답 | 도움말 카드 표시 | 일치 |
| 제안 없음 (query 불일치) | `[]` 반환 | `SizedBox.shrink()` (섹션 숨김) | 일치 |
| API 오류 | 오류 응답 | `orElse: SizedBox.shrink()` (조용히 숨김) | 기능 저하는 있으나 UX 안전 |
| REGULAR_MEETING_PAYMENT sourceType | 서버 응답 가능 | Flutter enum 없어 query string 직접 전달 필요 | Gap (enum 불일치) |

## 7. 정합성 판단

| 항목 | Backend | Frontend | 판단 |
|---|---|---|---|
| endpoint 경로 | `/api/v1/support/faq/suggestions` | `SupportIssueApi.getFaqSuggestions()` 동일 경로 | 일치 |
| sourceType 파라미터 | `OperationalIssueSourceType` | `sourceType.value` (string) 전달 | 일치 |
| 응답 필드 | `{ id, title, answer, sourceType, priority }` | `SupportFaqSuggestion.fromJson` 동일 구조 | 일치 |
| REGULAR_MEETING_* 제안 | 서버 하드코딩 있음 | Flutter enum 미포함 | Gap (enum 추가 시 해소) |

## 8. Gap / Risk

| 등급 | 항목 | 근거 | 영향 | 다음 조치 |
|---|---|---|---|---|
| P1 | 하드코딩 FAQ — 운영 변경 어려움 | `SupportFaqSuggestionService` — DB 없음, 코드 직접 수정 필요 | FAQ 내용 변경 시 서버 재배포 필요 | DB 테이블 `support_faq` 신설 + admin CRUD endpoint 추가 검토 |
| P2 | REGULAR_MEETING_* sourceType 제안 접근 불가 | Flutter enum에 두 값 없어 by-source 화면 진입 어려움 | 정기모임 관련 이슈 작성 화면에서 FAQ 표시 안 됨 | F20-02 Gap 해소(enum 추가)와 동시 해소 |
| P3 | query 파라미터 실시간 검색 미구현 | Flutter가 항상 `null` query 전달 | 키워드로 FAQ를 좁히는 기능 사용 불가 | 텍스트 검색 입력 추가 여부 결정 |

## 9. 수용 기준

### AC-01. sourceType=PAYMENT 제안 조회

Given 비로그인 상태에서 sourceType=PAYMENT로 제안을 요청한다.  
When `GET /api/v1/support/faq/suggestions?sourceType=PAYMENT` 를 호출한다.  
Then 서버는 priority 1("결제 실패 확인"), priority 2("거래 기록 보존") 2개를 반환한다.

### AC-02. keyword 필터

Given sourceType=REFUND, query="환불" 로 요청한다.  
When API 를 호출한다.  
Then title/answer에 "환불"이 포함된 항목만 반환한다.

### AC-03. 빈 결과 처리

Given sourceType=REFUND, query="존재하지않는키워드" 로 요청한다.  
When API를 호출한다.  
Then 서버는 `[]`를 반환하고 Flutter는 섹션을 표시하지 않는다.

### AC-04. CreateScreen FAQ 표시

Given `SupportIssueCreateScreen(sourceType=OperationalIssueSourceType.refund, sourceId=123)` 이 빌드된다.  
When `supportFaqSuggestionsProvider`가 성공 응답을 받는다.  
Then "추천 도움말" 섹션과 제안 카드가 문의 폼 위에 표시된다.

## 10. 미결정 / 후속

| 분류 | 항목 | 결정/작업 |
|---|---|---|
| 운영 | DB 기반 FAQ CRUD | 운영팀이 FAQ를 직접 편집할 필요가 있는지 결정. 필요 시 `support_faq` 테이블 + admin endpoint 신설 |
| 구현 | query 실시간 검색 | CreateScreen에 검색 입력 추가 여부 결정 |
| 구현 | REGULAR_MEETING_* FAQ 접근 | F20-02 Flutter enum 추가 후 자동 해소 |
