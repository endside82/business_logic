# F20-03. 지원 FAQ 제안 PRD

<!-- source-first: community_api/src/main/java/com/endside/community/support/controller/SupportFaqController.java + SupportFaqSuggestionService.java; updated: 2026-06-05 -->

## 1. 결론

지원 FAQ 제안은 운영 이슈 작성 화면 진입 시 **sourceType별 자주 묻는 질문 2개를 최대 5개까지** 제공하는 경량 기능이다. DB 테이블이 없다. `SupportFaqSuggestionService`의 코드 하드코딩 제안 목록을 keyword로 필터해 반환한다.

서버는 `GET /api/v1/support/faq/suggestions` 1개 endpoint를 제공하며 인증 불필요다. Flutter `SupportIssueApi.getFaqSuggestions()`로 호출하고, `SupportIssueCreateScreen`에서 `_FaqSuggestionsSection` 위젯이 문의 작성 폼 위에 도움말 카드 형태로 표시한다.

**관리자가 FAQ를 추가하거나 편집하는 어드민 CRUD 기능은 구현되어 있지 않다.** FAQ 문구를 바꾸려면 서버 코드를 직접 수정해야 한다.

## 2. 실사 근거

| 구분 | 확인한 소스 | 이 문서에서 쓰는 근거 |
|---|---|---|
| Backend Controller | `support/controller/SupportFaqController.java:18-30` | `GET /api/v1/support/faq/suggestions` |
| Backend Service | `support/service/SupportFaqSuggestionService.java:15-79` | `getSuggestions()`, `baseSuggestions()`, keyword 필터, 최대 5개 |
| Backend VO | `support/vo/SupportFaqSuggestionVo.java` | `{ id, title, answer, sourceType, priority }` |
| Frontend API | `data/api/support_issue_api.dart:42-48` | `getFaqSuggestions()` Retrofit |
| Frontend Model | `data/models/support/support_faq_suggestion.dart` | Freezed `SupportFaqSuggestion` |
| Frontend Widget | `presentation/support/screens/support_issue_screens.dart:304-380` | `_FaqSuggestionsSection` |
| Frontend Provider | `domain/providers/support/support_issue_provider.dart:59-77` | `supportFaqSuggestionsProvider(sourceType, sourceId, query)` |

## 3. 전체 동작 흐름

1. `SupportIssueCreateScreen(sourceType, sourceId)` 빌드 시 `_FaqSuggestionsSection` 구독.
2. `supportFaqSuggestionsProvider(sourceType, sourceId, null)` → `SupportIssueRepository.getFaqSuggestions()` → `GET /api/v1/support/faq/suggestions?sourceType=PAYMENT&sourceId=123`.
3. 서버 `SupportFaqSuggestionService.getSuggestions()` → `baseSuggestions(sourceType)` → keyword 필터(비어 있으면 전체 통과) → priority 오름차순 → 최대 5개 반환.
4. Flutter가 결과가 있으면 "추천 도움말" 섹션 카드 표시. 없거나 오류이면 `SizedBox.shrink()`.

## 4. 서버 계약

### `GET /api/v1/support/faq/suggestions`

| 항목 | 실제 계약 |
|---|---|
| Controller | `SupportFaqController#getSuggestions` (`SupportFaqController.java:22-29`) |
| 인증 | **불필요** (공개 endpoint) |
| Query | `sourceType: OperationalIssueSourceType` (required), `sourceId: Long` (optional), `query: String` (optional, keyword 필터) |
| 응답 | `List<SupportFaqSuggestionVo>` (최대 5개, priority ASC) |
| 에러 | sourceType 없거나 잘못된 경우 400 |

### SupportFaqSuggestionVo 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | `String` | 제안 식별자 (예: "refund-status") |
| `title` | `String` | 도움말 제목 |
| `answer` | `String` | 도움말 답변 텍스트 |
| `sourceType` | `String` | OperationalIssueSourceType.name() |
| `priority` | `int` | 정렬 우선순위 (낮을수록 먼저) |

### sourceType별 하드코딩 제안 목록

| sourceType | id | priority | 제목 |
|---|---|---|---|
| REFUND | refund-status | 1 | 환불 상태 확인 |
| REFUND | refund-policy | 2 | 환불 가능 조건 |
| PAYMENT/WALLET_TRANSACTION | payment-failed | 1 | 결제 실패 확인 |
| PAYMENT/WALLET_TRANSACTION | payment-record | 2 | 거래 기록 보존 |
| SETTLEMENT | settlement-appeal | 1 | 정산 이의 제기 |
| SETTLEMENT | settlement-status | 2 | 정산 처리 상태 |
| REPORT | report-status | 1 | 신고 처리 상태 |
| REPORT | report-evidence | 2 | 추가 증빙 전달 |
| REGULAR_MEETING_PAYMENT | rm-payment-bank | 1 | 계좌이체 입금 확인 |
| REGULAR_MEETING_PAYMENT | rm-payment-status | 2 | 결제↔등록 상태 점검 |
| REGULAR_MEETING_SETTLEMENT | rm-settlement-pending | 1 | 정기모임 정산 누락 |
| REGULAR_MEETING_SETTLEMENT | rm-settlement-detail | 2 | 정산 매출 분해 |

소스: `SupportFaqSuggestionService.java:28-54`

### keyword 필터 로직

- `query` 파라미터 비어 있으면 전체 통과 (`matches(suggestion, "")` = true).
- `query` 있으면 `(title + " " + answer).toLowerCase().contains(query.toLowerCase())` 체크.
- 소스: `SupportFaqSuggestionService.java:57-64`

## 5. 프론트 계약

| 항목 | 구현 상태 |
|---|---|
| API 호출 | `SupportIssueApi.getFaqSuggestions(sourceType, sourceId, query)` |
| Provider | `supportFaqSuggestionsProvider(sourceType, sourceId, query)` |
| Widget 표시 | `_FaqSuggestionsSection` — `maybeWhen(data:)` 성공 시만 표시, 실패/로딩 시 `SizedBox.shrink()` |
| 카드 구조 | 제목(`body2Medium`) + 답변(`caption/textSecondary`) 2줄 카드 |
| query 파라미터 | 현재 provider 호출 시 `null` 고정 (실시간 검색 미구현) |

Flutter `SupportFaqSuggestion` 모델:

```dart
// support_faq_suggestion.dart
@freezed
class SupportFaqSuggestion with _$SupportFaqSuggestion {
  const factory SupportFaqSuggestion({
    required String id,
    required String title,
    required String answer,
    required String sourceType,
    required int priority,
  }) = _SupportFaqSuggestion;
}
```

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
