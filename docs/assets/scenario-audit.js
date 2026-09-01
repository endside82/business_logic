/* 이 파일은 verification/build_scenario_audit_data.mjs가 현재 저장소에서 생성한다. */
window.SCENARIO_AUDIT = {
  "asOf": "2026-08-30",
  "countingNote": "1,403은 기존 기능 목록에 적힌 숫자의 합이다. 상세 시나리오 문서 117개에서 실제로 식별한 제목은 1,086개이며 49개 기능은 등록 숫자와 제목 수가 다르다. 어느 숫자도 테스트 통과율의 분모로 쓰지 않는다.",
  "totals": {
    "features": 175,
    "documentedScenarioItems": 1403,
    "definedFeatures": 175,
    "automatedTestFilesScanned": 1581,
    "journeyFilesScanned": 233,
    "unitScenarioDocuments": 117,
    "unitScenarioHeadings": 1086,
    "unitRegisteredScenarioItems": 1011,
    "unitScenarioCountMismatches": 49,
    "directlyLinkedAutomatedTests": 59,
    "automatedFeatureMarkers": 75,
    "automatedScenarioReferences": 59,
    "directlyLinkedJourneys": 56,
    "journeyFeatureMarkers": 46,
    "journeyScenarioReferences": 56,
    "featureLevelAutomatedProof": 144,
    "localRealAccountProof": 30,
    "featureLevelChecked": 174,
    "completeEvidenceChain": 55,
    "partialEvidenceChain": 21,
    "definitionOnlyEvidence": 99,
    "traceMarkers": 302,
    "currentTraceMarkers": 95,
    "missingTraceTargets": 2
  },
  "features": [
    {
      "id": "F01-01",
      "domain": "인증 & 온보딩",
      "name": "이메일 회원가입 & 로그인",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-01_email-signup-login/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-01_email-signup-login/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/auth_flow_test.dart",
          "community_app/integration_test/seed_login_flow_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/auth_flow_test.dart",
          "community_app/integration_test/seed_login_flow_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F01-02",
      "domain": "인증 & 온보딩",
      "name": "소셜 로그인",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-02_social-login/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-02_social-login/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 1
    },
    {
      "id": "F01-03",
      "domain": "인증 & 온보딩",
      "name": "이메일 인증",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-03_email-verification/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-03_email-verification/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_auth_recovery_onboarding_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_auth_recovery_onboarding_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 1,
      "pendingReview": 1
    },
    {
      "id": "F01-04",
      "domain": "인증 & 온보딩",
      "name": "비밀번호 재설정",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-04_password-reset/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-04_password-reset/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_auth_recovery_onboarding_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_auth_recovery_onboarding_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 1
    },
    {
      "id": "F01-05",
      "domain": "인증 & 온보딩",
      "name": "토큰 갱신 & 로그아웃",
      "scenarioCount": 15,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-05_token-refresh-logout/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 15,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-05_token-refresh-logout/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 2,
        "missing": 0,
        "state": "current"
      },
      "automated": {
        "directlyLinked": true,
        "count": 5,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 5,
        "files": [
          "community_app/integration_test/seed_account_deactivation_test.dart",
          "community_app/integration_test/seed_account_lifecycle_matrix_test.dart",
          "community_app/integration_test/seed_account_lifecycle_mutation_test.dart",
          "community_app/integration_test/seed_logout_roundtrip_test.dart",
          "community_app/integration_test/seed_splash_redirect_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 5,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 5,
        "files": [
          "community_app/integration_test/seed_account_deactivation_test.dart",
          "community_app/integration_test/seed_account_lifecycle_matrix_test.dart",
          "community_app/integration_test/seed_account_lifecycle_mutation_test.dart",
          "community_app/integration_test/seed_logout_roundtrip_test.dart",
          "community_app/integration_test/seed_splash_redirect_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F01-06",
      "domain": "인증 & 온보딩",
      "name": "온보딩",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-06_onboarding/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-06_onboarding/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_auth_recovery_onboarding_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_auth_recovery_onboarding_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F01-07",
      "domain": "인증 & 온보딩",
      "name": "관심사 태그 관리",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-07_preference-tags/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-07_preference-tags/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F01-08",
      "domain": "인증 & 온보딩",
      "name": "소셜 계정 연결 해제",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-08_social-unlink/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-08_social-unlink/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 1,
        "missing": 0,
        "state": "current"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 1
    },
    {
      "id": "F02-01",
      "domain": "홈 피드",
      "name": "홈 피드 메인 조회",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/02_home_feed/F02-01_home-feed-main/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-01_home-feed-main/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F02-02",
      "domain": "홈 피드",
      "name": "홈 피드 새로고침",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/02_home_feed/F02-02_home-feed-refresh/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-02_home-feed-refresh/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F02-03",
      "domain": "홈 피드",
      "name": "섹션 카드 진입",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/02_home_feed/F02-03_section-card-entry/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-03_section-card-entry/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F02-04",
      "domain": "홈 피드",
      "name": "추천 이벤트 더보기·필터·무한스크롤",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/02_home_feed/F02-04_recommend-events-more/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-04_recommend-events-more/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_home_profile_surface_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_home_profile_surface_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 9
    },
    {
      "id": "F02-05",
      "domain": "홈 피드",
      "name": "검색·알림 진입점",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/02_home_feed/F02-05_search-notification-entry/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-05_search-notification-entry/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 10
    },
    {
      "id": "F03-01",
      "domain": "이벤트",
      "name": "이벤트 발견 & 탐색",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-01_event-discovery/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-01_event-discovery/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_event_authoring_surface_test.dart",
          "community_app/integration_test/seed_event_list_badge_matrix_test.dart",
          "community_app/integration_test/seed_event_recommendation_empty_state_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_event_authoring_surface_test.dart",
          "community_app/integration_test/seed_event_list_badge_matrix_test.dart",
          "community_app/integration_test/seed_event_recommendation_empty_state_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F03-02",
      "domain": "이벤트",
      "name": "이벤트 상세 조회",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-02_event-detail/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 15,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-02_event-detail/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F03-03",
      "domain": "이벤트",
      "name": "이벤트 생성",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-03_event-creation/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-03_event-creation/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_event_authoring_surface_test.dart",
          "community_app/integration_test/seed_event_operational_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_event_authoring_surface_test.dart",
          "community_app/integration_test/seed_event_operational_surface_test.dart",
          "community_app/scripts/e2e/run_p21_event_authoring_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "partial",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F03-04",
      "domain": "이벤트",
      "name": "이벤트 수정/생명주기 관리",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-04_event-lifecycle/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-04_event-lifecycle/backend.md",
        "total": 9,
        "filesPresent": 9,
        "valid": 2,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/integration_test/seed_event_authoring_surface_test.dart",
          "community_app/integration_test/seed_event_payment_authoring_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 4,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 4,
        "files": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/integration_test/seed_event_authoring_surface_test.dart",
          "community_app/integration_test/seed_event_payment_authoring_test.dart",
          "community_app/scripts/e2e/run_p72_event_application_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/scripts/e2e/run_p72_event_application_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F03-05",
      "domain": "이벤트",
      "name": "이벤트 신청 & 참석",
      "scenarioCount": 13,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-05_event-attendance/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 13,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-05_event-attendance/backend.md",
        "total": 6,
        "filesPresent": 6,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_list_badge_matrix_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/test/presentation/event/event_attendance_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_list_badge_matrix_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 20
    },
    {
      "id": "F03-06",
      "domain": "이벤트",
      "name": "신청서 승인/거절",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-06_application-review/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-06_application-review/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_event_application_lifecycle_test.dart",
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/integration_test/seed_event_detail_role_controls_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 4,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 4,
        "files": [
          "community_app/integration_test/seed_event_application_lifecycle_test.dart",
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/integration_test/seed_event_detail_role_controls_test.dart",
          "community_app/scripts/e2e/run_p72_event_application_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/scripts/e2e/run_p72_event_application_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 8
    },
    {
      "id": "F03-07",
      "domain": "이벤트",
      "name": "정원 & 대기열 관리",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-07_capacity-and-waitlist/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-07_capacity-and-waitlist/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_operational_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_operational_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/scripts/e2e/run_p72_event_application_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-08",
      "domain": "이벤트",
      "name": "QR 체크인",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-08_qr-checkin/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-08_qr-checkin/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_event_attendance_state_test.dart",
          "community_app/integration_test/seed_event_post_attendance_surfaces_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/test/presentation/event/event_attendance_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_event_attendance_state_test.dart",
          "community_app/integration_test/seed_event_post_attendance_surfaces_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F03-09",
      "domain": "이벤트",
      "name": "이벤트 사진첩",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-09_event-photos/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-09_event-photos/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_event_access_edge_test.dart",
          "community_app/integration_test/seed_event_post_attendance_surfaces_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_event_access_edge_test.dart",
          "community_app/integration_test/seed_event_post_attendance_surfaces_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 2
    },
    {
      "id": "F03-10",
      "domain": "이벤트",
      "name": "이벤트-플랜 연결",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-10_event-plan-link/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-10_event-plan-link/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_authoring_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_authoring_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F03-11",
      "domain": "이벤트",
      "name": "위시리스트",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-11_wishlist/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-11_wishlist/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_wishlist_toggle_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/integration_test/seed_event_wishlist_toggle_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 4,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_event_wishlist_toggle_test.dart",
          "community_app/scripts/e2e/run_p61_event_wishlist_toggle_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart",
          "community_app/integration_test/seed_event_wishlist_toggle_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p61_event_wishlist_toggle_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F03-12",
      "domain": "이벤트",
      "name": "내 이벤트 관리 & 참석 로그",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/03_event/F03-12_my-events/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-12_my-events/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_operational_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_event_operational_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_event_application_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 7
    },
    {
      "id": "F03-13",
      "domain": "이벤트",
      "name": "이벤트 참가 선입금",
      "scenarioCount": 11,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-13_event-prepayment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_api/src/test/java/com/endside/community/payment/repository/query/PointTransactionQueryRepositoryDataJpaTest.java"
        ],
        "markerCandidateFiles": [
          "community_app/test/presentation/event/event_payment_policy_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "sealed",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-14",
      "domain": "이벤트",
      "name": "이동수단 공통 설정",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-14_event-transport-mode_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 4,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 4,
        "files": [
          "community_api/src/test/java/com/endside/community/event/transport/service/EventTransportParticipantFlowTest.java",
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleServiceTest.java",
          "community_app/test/data/models/event/transport_vo_wire_test.dart",
          "community_app/test/unit/transport_entry_access_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/scripts/e2e/README.md"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-15",
      "domain": "이벤트",
      "name": "카풀·자차",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-15_event-carpool_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 7,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 7,
        "files": [
          "community_api/src/test/java/com/endside/community/event/transport/service/EventTransportParticipantFlowTest.java",
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleLifecycleDataJpaTest.java",
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleReportServiceTest.java",
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleServiceTest.java",
          "community_api/src/test/java/com/endside/community/review/service/ReportServiceTest.java",
          "community_app/test/core/router/transport_report_route_gate_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-16",
      "domain": "이벤트",
      "name": "대절 버스와 자리 배정",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-16_event-bus-charter_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 6,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 6,
        "files": [
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleLifecycleE2ETest.java",
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleSeatFlowDataJpaTest.java",
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleSeatOccupantNameTest.java",
          "community_api/src/test/java/com/endside/community/event/transport/service/EventVehicleServiceTest.java",
          "community_app/test/widget/event/vehicle_seat_grid_test.dart",
          "community_app/test/widget/event/vehicle_seat_occupant_name_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-17",
      "domain": "이벤트",
      "name": "차량 좌석 배치도 운영",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_admin_api/src/test/java/com/endside/community/event/service/ManageVehicleLayoutGuardTest.java",
          "community_admin_api/src/test/java/com/endside/community/v1proof/SharedV1SchemaMirrorTest.java",
          "community_admin_front/e2e/vehicle-layouts.spec.ts"
        ],
        "markerCandidateFiles": [
          "community_app/test/presentation/event/reschedule_proposal_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_admin_front/e2e/vehicle-layouts.spec.ts"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-18",
      "domain": "이벤트",
      "name": "구성인원 인구통계",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-18_event-demographics_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/curated/service_assignment_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-19",
      "domain": "이벤트",
      "name": "일정 변경 제안·참가자 합의",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/event/event_photo_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-20",
      "domain": "이벤트",
      "name": "이벤트 노쇼 관리",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-20_event-no-show_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/event/event_message_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F04-01",
      "domain": "클럽",
      "name": "클럽 발견 & 탐색",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-01_club-discovery/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-01_club-discovery/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_list_settings_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_list_settings_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F04-02",
      "domain": "클럽",
      "name": "클럽 상세 보기 & 가입 액션",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-02_club-detail-join/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-02_club-detail-join/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/widget/club/club_fit_preview_section_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p73_club_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F04-03",
      "domain": "클럽",
      "name": "클럽 생성·수정·삭제·소유권 이전",
      "scenarioCount": 13,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-03_club-crud-transfer/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-03_club-crud-transfer/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 2,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_list_settings_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_list_settings_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 11
    },
    {
      "id": "F04-04",
      "domain": "클럽",
      "name": "멤버 관리",
      "scenarioCount": 12,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-04_member-management/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-04_member-management/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart",
          "community_app/integration_test/seed_club_list_settings_surface_test.dart",
          "community_app/integration_test/seed_club_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 4,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 4,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart",
          "community_app/integration_test/seed_club_list_settings_surface_test.dart",
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/scripts/e2e/run_p73_club_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p73_club_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F04-05",
      "domain": "클럽",
      "name": "가입 대기열 승인/거절 & 초대",
      "scenarioCount": 13,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-05_waitlist-invitation/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-05_waitlist-invitation/backend.md",
        "total": 6,
        "filesPresent": 6,
        "valid": 3,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_list_settings_surface_test.dart",
          "community_app/integration_test/seed_club_membership_controls_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_list_settings_surface_test.dart",
          "community_app/integration_test/seed_club_membership_controls_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F04-06",
      "domain": "클럽",
      "name": "차단 관리",
      "scenarioCount": 12,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-06_ban-management/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-06_ban-management/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 2,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/presentation/club/club_membership_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F04-07",
      "domain": "클럽",
      "name": "내 클럽 / 멤버 통계",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-07_my-clubs-stats/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-07_my-clubs-stats/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart",
          "community_app/integration_test/seed_club_membership_controls_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/presentation/club/club_membership_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart",
          "community_app/integration_test/seed_club_membership_controls_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 6
    },
    {
      "id": "F04-08",
      "domain": "클럽",
      "name": "게시판 & 게시글 생성/수정/삭제",
      "scenarioCount": 17,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-08_board-post-crud/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 17,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-08_board-post-crud/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_community_moderation_test.dart",
          "community_app/integration_test/seed_club_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 4,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 4,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_community_moderation_test.dart",
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/scripts/e2e/run_p73_club_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p73_club_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F04-09",
      "domain": "클럽",
      "name": "게시글 댓글 & 대댓글",
      "scenarioCount": 12,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-09_post-comments/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-09_post-comments/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/core/utils/notification_router_club_post_comment_test.dart",
          "community_app/test/widget/club/comment_mention_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p73_club_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F04-10",
      "domain": "클럽",
      "name": "공지사항",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-10_announcements/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-10_announcements/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 2,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_community_moderation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F04-11",
      "domain": "클럽",
      "name": "사진첩",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-11_photo-album/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-11_photo-album/backend.md",
        "total": 9,
        "filesPresent": 9,
        "valid": 9,
        "missing": 0,
        "state": "current"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_community_moderation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_community_moderation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 1
    },
    {
      "id": "F04-12",
      "domain": "클럽",
      "name": "클럽 이벤트 & 캘린더",
      "scenarioCount": 13,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-12_club-events-calendar/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-12_club-events-calendar/backend.md",
        "total": 29,
        "filesPresent": 29,
        "valid": 29,
        "missing": 0,
        "state": "current"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_calendar_event_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_authoring_gap_test.dart",
          "community_app/integration_test/seed_club_calendar_event_surface_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 7
    },
    {
      "id": "F04-13",
      "domain": "클럽",
      "name": "기금 현황 & 거래 차트",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-13_fund-overview/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-13_fund-overview/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_finance_route_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/presentation/club/club_fund_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_finance_route_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F04-14",
      "domain": "클럽",
      "name": "기부하기 & 기부 내역",
      "scenarioCount": 16,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-14_donation/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 15,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-14_donation/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 3,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_finance_route_test.dart",
          "community_app/integration_test/seed_club_subscription_donation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/presentation/club/donation_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_club_finance_route_test.dart",
          "community_app/integration_test/seed_club_subscription_donation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 6
    },
    {
      "id": "F04-15",
      "domain": "클럽",
      "name": "기금 인출 요청",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-15_fund-withdrawal/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-15_fund-withdrawal/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_finance_route_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/presentation/club/withdrawal_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_finance_route_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F04-16",
      "domain": "클럽",
      "name": "클럽 구독",
      "scenarioCount": 13,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-16_subscription/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-16_subscription/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 2,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_subscription_donation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart",
          "community_app/test/presentation/club/subscription_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_club_subscription_donation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_club_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F04-17",
      "domain": "클럽",
      "name": "구성인원 인구통계",
      "scenarioCount": 7,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/04_club/F04-17_club-demographics_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F04-18",
      "domain": "클럽",
      "name": "클럽 레퓨테이션",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/04_club/F04-18_club-reputation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_api/src/test/java/com/endside/community/club/reputation/service/ReputationScoreServiceTest.java"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F05-01",
      "domain": "검색",
      "name": "키워드 검색",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/05_search/F05-01_keyword-search/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-01_keyword-search/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/calendar/calendar_availability_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F05-02",
      "domain": "검색",
      "name": "자동완성 서제스트",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/05_search/F05-02_autocomplete-suggest/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-02_autocomplete-suggest/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_search_suggestion_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_search_suggestion_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_search_suggestion_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_search_suggestion_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p66_search_suggestion_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F05-03",
      "domain": "검색",
      "name": "검색 필터 적용",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/05_search/F05-03_search-filter/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-03_search-filter/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F05-04",
      "domain": "검색",
      "name": "최근 검색어",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/05_search/F05-04_search-history/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-04_search-history/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F05-05",
      "domain": "검색",
      "name": "저장된 검색",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/05_search/F05-05_saved-search/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-05_saved-search/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 4
    },
    {
      "id": "F06-01",
      "domain": "결제 & 지갑",
      "name": "지갑 메인 조회",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-01_wallet-main/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-01_wallet-main/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/payment/wallet_balance_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F06-02",
      "domain": "결제 & 지갑",
      "name": "포인트 충전",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-02_point-charge/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-02_point-charge/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_notification_permission_test.dart",
          "community_app/integration_test/seed_wallet_payment_visibility_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/test/presentation/payment/point_charge_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_notification_permission_test.dart",
          "community_app/integration_test/seed_wallet_payment_visibility_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p70_payment_refund_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F06-03",
      "domain": "결제 & 지갑",
      "name": "거래 내역 조회·필터·내보내기",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-03_transaction-history/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-03_transaction-history/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 4
    },
    {
      "id": "F06-04",
      "domain": "결제 & 지갑",
      "name": "결제 수단 관리",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-04_payment-method/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-04_payment-method/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 2,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F06-05",
      "domain": "결제 & 지갑",
      "name": "자동 충전 설정",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-05_auto-charge/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-05_auto-charge/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/payment/auto_charge_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F06-06",
      "domain": "결제 & 지갑",
      "name": "포인트 결제·환불",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-06_point-pay-refund/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 20,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-06_point-pay-refund/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/integration_test/seed_report_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/integration_test/seed_subscription_mutation_test.dart",
          "community_app/test/presentation/payment/transaction_history_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 4,
        "featureMarkerCount": 5,
        "scenarioReferenceCount": 4,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/integration_test/seed_report_mutation_test.dart",
          "community_app/scripts/e2e/run_p70_payment_refund_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/integration_test/seed_subscription_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p70_payment_refund_matrix.sh",
          "community_app/scripts/e2e/run_p71_subscription_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 17
    },
    {
      "id": "F06-07",
      "domain": "결제 & 지갑",
      "name": "호스팅 티켓 구매",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-07_hosting-ticket/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-07_hosting-ticket/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/payment/hosting_ticket_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F06-08",
      "domain": "결제 & 지갑",
      "name": "개인 구독 관리",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-08_personal-subscription/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-08_personal-subscription/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_subscription_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_subscription_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_subscription_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_subscription_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p71_subscription_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F06-09",
      "domain": "결제 & 지갑",
      "name": "수익 대시보드 조회",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-09_earnings-dashboard/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-09_earnings-dashboard/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/payment/earnings_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F06-10",
      "domain": "결제 & 지갑",
      "name": "정산 조회·요약·이의 제기",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-10_settlement-appeal/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-10_settlement-appeal/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/meeting_settlement/bank_account_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 4
    },
    {
      "id": "F07-01",
      "domain": "모임 정산",
      "name": "모임 정산 생성",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-01_create-settlement/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-01_create-settlement/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F07-02",
      "domain": "모임 정산",
      "name": "정산 항목 관리",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-02_settlement-items/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-02_settlement-items/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 2,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F07-03",
      "domain": "모임 정산",
      "name": "정산 활성화/취소",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-03_activate-cancel/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-03_activate-cancel/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F07-04",
      "domain": "모임 정산",
      "name": "정산 현황/요약/영수증 조회",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-04_status-summary-receipt/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-04_status-summary-receipt/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F07-05",
      "domain": "모임 정산",
      "name": "분담금 납부",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-05_pay-share/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-05_pay-share/backend.md",
        "total": 7,
        "filesPresent": 7,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F07-06",
      "domain": "모임 정산",
      "name": "이체 확인/일괄 확인/상각",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 13,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers/backend.md",
        "total": 6,
        "filesPresent": 6,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/data/models/support/user_guide_purpose_test.dart",
          "community_app/test/presentation/meeting_settlement/settlement_items_guidance_card_test.dart",
          "community_app/test/presentation/meeting_settlement/settlement_status_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F07-07",
      "domain": "모임 정산",
      "name": "미납자 리마인드/마감 연장",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-07_remind-extend/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-07_remind-extend/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F07-08",
      "domain": "모임 정산",
      "name": "이의제기/처리/감사로그",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-08_appeal-audit/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-08_appeal-audit/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F07-09",
      "domain": "모임 정산",
      "name": "선입금/환불/환불규정",
      "scenarioCount": 11,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-09_prepayment-refund/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-09_prepayment-refund/backend.md",
        "total": 7,
        "filesPresent": 7,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/meeting_settlement/refund_rules_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "partial",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 7
    },
    {
      "id": "F07-10",
      "domain": "모임 정산",
      "name": "정산 계좌/이력/호스트 신뢰도",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/07_meeting_settlement/F07-10_account-history-reputation/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-10_account-history-reputation/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/meeting_settlement/settlement_appeal_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F08-01",
      "domain": "플랜 마켓",
      "name": "내 플랜 목록 관리",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-01_my-plan-list/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-01_my-plan-list/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_my_plans_state_surface_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_my_plans_state_surface_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F08-02",
      "domain": "플랜 마켓",
      "name": "플랜 상세/작성자용 미리보기",
      "scenarioCount": 13,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-02_plan-detail/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-02_plan-detail/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_api/src/test/java/com/endside/community/plan/service/PlanBlockServiceTest.java"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-03",
      "domain": "플랜 마켓",
      "name": "블록 에디터",
      "scenarioCount": 12,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-03_block-editor/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-03_block-editor/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_api/src/test/java/com/endside/community/plan/service/PlanServiceTest.java"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-04",
      "domain": "플랜 마켓",
      "name": "블록 드래그 재정렬",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-04_block-reorder/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-04_block-reorder/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-05",
      "domain": "플랜 마켓",
      "name": "플랜 발행",
      "scenarioCount": 14,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-05_plan-publish/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-05_plan-publish/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-06",
      "domain": "플랜 마켓",
      "name": "마켓 아이템 관리",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-06_market-item-management/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-06_market-item-management/backend.md",
        "total": 6,
        "filesPresent": 6,
        "valid": 5,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-07",
      "domain": "플랜 마켓",
      "name": "크리에이터 프로필/통계",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-07_creator-profile-stats/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-07_creator-profile-stats/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_market_discovery_funnel_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_market_discovery_funnel_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-08",
      "domain": "플랜 마켓",
      "name": "마켓 메인 탐색",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-08_market-main-browse/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-08_market-main-browse/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F08-09",
      "domain": "플랜 마켓",
      "name": "마켓 검색",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-09_market-search/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-09_market-search/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_market_discovery_funnel_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_market_discovery_funnel_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 4
    },
    {
      "id": "F08-10",
      "domain": "플랜 마켓",
      "name": "마켓 아이템 상세",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-10_market-item-detail/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-10_market-item-detail/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-11",
      "domain": "플랜 마켓",
      "name": "아이템·번들·플랜 구매",
      "scenarioCount": 12,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-11_purchase/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-11_purchase/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F08-12",
      "domain": "플랜 마켓",
      "name": "내 컬렉션",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-12_my-collection/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-12_my-collection/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/plan/plan_publish_guidance_cards_test.dart",
          "community_app/test/presentation/support/guide_help_button_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 4
    },
    {
      "id": "F08-13",
      "domain": "플랜 마켓",
      "name": "구매 플랜 -> 이벤트 생성/리뷰",
      "scenarioCount": 12,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/08_plan_market/F08-13_plan-event-and-review/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-13_plan-event-and-review/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/market/market_moderation_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F08-14",
      "domain": "플랜 마켓",
      "name": "플랜 마켓 환불 (Purchase Refund)",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/core/utils/notification_router_dead_end_wiring_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F08-15",
      "domain": "플랜 마켓",
      "name": "크리에이터 매출 귀속 보정",
      "scenarioCount": 9,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-15_creator-earning-coverage_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_api/src/test/java/com/endside/community/plan/service/MarketPurchaseServiceTest.java",
          "community_app/test/presentation/market/market_refund_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F09-01",
      "domain": "프라이빗 데이팅",
      "name": "본인 인증",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-01_verification/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-01_verification/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/date/date_verification_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F09-02",
      "domain": "프라이빗 데이팅",
      "name": "데이팅 프로필 관리",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-02_profile/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-02_profile/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F09-03",
      "domain": "프라이빗 데이팅",
      "name": "후보자 스와이프 & 매칭 액션",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-03_candidate_swipe/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-03_candidate_swipe/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F09-04",
      "domain": "프라이빗 데이팅",
      "name": "매칭 목록 조회",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-04_match_list/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-04_match_list/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F09-05",
      "domain": "프라이빗 데이팅",
      "name": "채팅",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-05_chat/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-05_chat/backend.md",
        "total": 4,
        "filesPresent": 4,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F09-06",
      "domain": "프라이빗 데이팅",
      "name": "만남 제안 & 안전 흐름",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-06_meeting_proposal/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-06_meeting_proposal/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_dating_checkin_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 5,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_dating_checkin_mutation_test.dart",
          "community_app/scripts/e2e/README.md",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p18_dating_direct_route_matrix.sh",
          "community_app/scripts/e2e/run_p19_dating_checkin_mutation.sh"
        ]
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 6
    },
    {
      "id": "F09-07",
      "domain": "프라이빗 데이팅",
      "name": "사용자 차단/해제",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-07_block/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-07_block/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F09-08",
      "domain": "프라이빗 데이팅",
      "name": "내 프로필 조회 이력",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/09_private_date/F09-08_profile_views/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-08_profile_views/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F10-01",
      "domain": "캘린더",
      "name": "월간/일간 통합 캘린더 조회",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/10_calendar/F10-01_unified-calendar-view/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-01_unified-calendar-view/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/data/models/support/user_guide_purpose_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 1
    },
    {
      "id": "F10-02",
      "domain": "캘린더",
      "name": "일정 항목 라우팅",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/10_calendar/F10-02_calendar-item-routing/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-02_calendar-item-routing/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/data/models/support/user_guide_purpose_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 8
    },
    {
      "id": "F10-03",
      "domain": "캘린더",
      "name": "단일 가용 시간 생성/수정/삭제",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/10_calendar/F10-03_single-availability-crud/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-03_single-availability-crud/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/test/data/models/support/user_guide_purpose_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/scripts/e2e/run_p65_calendar_availability_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p65_calendar_availability_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 3
    },
    {
      "id": "F10-04",
      "domain": "캘린더",
      "name": "반복 가용 시간 규칙 관리",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/10_calendar/F10-04_recurring-availability-rule/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-04_recurring-availability-rule/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/test/data/models/support/user_guide_purpose_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/scripts/e2e/run_p65_calendar_availability_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p65_calendar_availability_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 8
    },
    {
      "id": "F10-05",
      "domain": "캘린더",
      "name": "타 사용자 가용성 공개 조회",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/10_calendar/F10-05_other-user-availability/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-05_other-user-availability/backend.md",
        "total": 2,
        "filesPresent": 0,
        "valid": 0,
        "missing": 2,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/data/models/support/user_guide_purpose_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "retired",
      "proof": "none",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F11-01",
      "domain": "리뷰 & 신고",
      "name": "이벤트 리뷰 작성",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/11_review_report/F11-01_event-review-write/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-01_event-review-write/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F11-02",
      "domain": "리뷰 & 신고",
      "name": "리뷰 목록 조회",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/11_review_report/F11-02_review-list/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-02_review-list/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F11-03",
      "domain": "리뷰 & 신고",
      "name": "리뷰 수정 & 삭제",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/11_review_report/F11-03_review-edit-delete/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-03_review-edit-delete/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 2,
        "missing": 0,
        "state": "current"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_review_edit_delete_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_review_edit_delete_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_review_edit_delete_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_review_edit_delete_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p63_review_edit_delete_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F11-04",
      "domain": "리뷰 & 신고",
      "name": "신고",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/11_review_report/F11-04_report/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-04_report/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_report_mutation_test.dart",
          "community_app/test/widget/report_screen_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_report_mutation_test.dart",
          "community_app/test/presentation/review/review_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_report_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_report_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p69_report_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F11-05",
      "domain": "리뷰 & 신고",
      "name": "신뢰점수 & 변동 이력",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/11_review_report/F11-05_trust-score/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-05_trust-score/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/review/review_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F11-06",
      "domain": "리뷰 & 신고",
      "name": "취향 평가 & 취향 프로필",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/11_review_report/F11-06_taste-profile/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-06_taste-profile/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/core/router/account_lock_router_gate_test.dart",
          "community_app/test/core/router/account_lock_routes_test.dart",
          "community_app/test/presentation/dispute/dispute_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F11-07",
      "domain": "리뷰 & 신고",
      "name": "호스트 리뷰 모더레이션",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/11_review_report/F11-07_review-moderation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/warning/warning_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F12-01",
      "domain": "알림",
      "name": "알림 목록 조회 & 읽음 관리",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/12_notification/F12-01_notification-list-read/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-01_notification-list-read/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 5,
        "missing": 0,
        "state": "current"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F12-02",
      "domain": "알림",
      "name": "알림 그룹 보기 & 미읽음 배지",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/12_notification/F12-02_notification-grouped-badge/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-02_notification-grouped-badge/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 2,
        "missing": 0,
        "state": "current"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F12-03",
      "domain": "알림",
      "name": "카테고리별 알림 설정",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/12_notification/F12-03_category-settings/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-03_category-settings/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F12-04",
      "domain": "알림",
      "name": "방해금지 시간 설정",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/12_notification/F12-04_quiet-hours/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-04_quiet-hours/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart"
        ]
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F12-05",
      "domain": "알림",
      "name": "푸시 기기 관리",
      "scenarioCount": 8,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/12_notification/F12-05_device-token-management/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-05_device-token-management/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart",
          "community_app/integration_test/seed_notification_permission_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 5,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/scripts/e2e/run_p67_notification_mutation_matrix.sh",
          "community_app/scripts/e2e/run_p68_notification_permission_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart",
          "community_app/integration_test/seed_notification_permission_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p67_notification_mutation_matrix.sh",
          "community_app/scripts/e2e/run_p68_notification_permission_matrix.sh"
        ]
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F12-06",
      "domain": "알림",
      "name": "알림 권한 인라인 안내 배너",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/12_notification/F12-06_permission-banner/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-06_permission-banner/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart",
          "community_app/integration_test/seed_notification_permission_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 5,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/scripts/e2e/run_p67_notification_mutation_matrix.sh",
          "community_app/scripts/e2e/run_p68_notification_permission_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_notification_mutation_test.dart",
          "community_app/integration_test/seed_notification_permission_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p67_notification_mutation_matrix.sh",
          "community_app/scripts/e2e/run_p68_notification_permission_matrix.sh"
        ]
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F13-01",
      "domain": "프로필 & 설정",
      "name": "내 프로필 조회",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/13_profile_settings/F13-01_profile-hub/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-01_profile-hub/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 4
    },
    {
      "id": "F13-02",
      "domain": "프로필 & 설정",
      "name": "프로필 수정",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/13_profile_settings/F13-02_profile-edit/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-02_profile-edit/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_profile_edit_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_profile_edit_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_profile_edit_mutation_test.dart",
          "community_app/scripts/e2e/run_p62_profile_edit_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_profile_edit_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p62_profile_edit_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 4
    },
    {
      "id": "F13-03",
      "domain": "프로필 & 설정",
      "name": "다중 주소 관리",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/13_profile_settings/F13-03_address-management/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-03_address-management/backend.md",
        "total": 5,
        "filesPresent": 5,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 5
    },
    {
      "id": "F13-04",
      "domain": "프로필 & 설정",
      "name": "선호 태그 관리",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/13_profile_settings/F13-04_preference-tags/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-04_preference-tags/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F13-05",
      "domain": "프로필 & 설정",
      "name": "데이터 내보내기",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/13_profile_settings/F13-05_data-export/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-05_data-export/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F13-06",
      "domain": "프로필 & 설정",
      "name": "계정 삭제 요청",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/13_profile_settings/F13-06_account-deletion/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 13,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-06_account-deletion/backend.md",
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/profile/data_privacy_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F13-07",
      "domain": "프로필 & 설정",
      "name": "계정 즉시 비활성화",
      "scenarioCount": 5,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/13_profile_settings/F13-07_account-deactivation/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-07_account-deactivation/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 7
    },
    {
      "id": "F14-01",
      "domain": "위치 & 길찾기",
      "name": "이벤트 참석자 위치 공유",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/14_location_directions/F14-01_event-location-share/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-01_event-location-share/backend.md",
        "total": 3,
        "filesPresent": 3,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_location_share_mutation_test.dart",
          "community_app/test/presentation/search/saved_search_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 3,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart",
          "community_app/scripts/e2e/run_p64_location_share_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_location_share_mutation_test.dart",
          "community_app/scripts/e2e/SCENARIO_MATRIX_INDEX.md",
          "community_app/scripts/e2e/run_p64_location_share_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 2
    },
    {
      "id": "F14-02",
      "domain": "위치 & 길찾기",
      "name": "위치 공유 중지",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/14_location_directions/F14-02_location-opt-out/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-02_location-opt-out/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart",
          "community_app/scripts/e2e/run_p64_location_share_mutation_matrix.sh"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F14-03",
      "domain": "위치 & 길찾기",
      "name": "위치 공유 만료 연장",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/14_location_directions/F14-03_location-extend/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-03_location-extend/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart",
          "community_app/scripts/e2e/run_p64_location_share_mutation_matrix.sh"
        ],
        "markerCandidateFiles": []
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 3
    },
    {
      "id": "F14-04",
      "domain": "위치 & 길찾기",
      "name": "위치 프라이버시 대시보드",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/14_location_directions/F14-04_location-privacy-dashboard/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-04_location-privacy-dashboard/backend.md",
        "total": 1,
        "filesPresent": 1,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_location_share_mutation_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_location_share_mutation_test.dart",
          "community_app/scripts/e2e/run_p64_location_share_mutation_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_location_share_mutation_test.dart"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 1
    },
    {
      "id": "F14-05",
      "domain": "위치 & 길찾기",
      "name": "이벤트 길찾기",
      "scenarioCount": 9,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/14_location_directions/F14-05_event-directions/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-05_event-directions/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 1,
        "missing": 0,
        "state": "partial"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F14-06",
      "domain": "위치 & 길찾기",
      "name": "역지오코딩",
      "scenarioCount": 6,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/14_location_directions/F14-06_reverse-geocoding/scenarios.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-06_reverse-geocoding/backend.md",
        "total": 2,
        "filesPresent": 2,
        "valid": 0,
        "missing": 0,
        "state": "stale"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F15-01",
      "domain": "경고 & 징계",
      "name": "내 경고 현황 & 원장",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": [
          "community_app/test/presentation/notification/notification_guidance_cards_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F15-02",
      "domain": "경고 & 징계",
      "name": "신고 제출 & 내 신고 관리",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F15-03",
      "domain": "경고 & 징계",
      "name": "이의제기 (Appeal)",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-03_appeal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F15-04",
      "domain": "경고 & 징계",
      "name": "경고 정책 & 패널티 유형 설정",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F15-05",
      "domain": "경고 & 징계",
      "name": "신고 심사",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-05_report-review_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F15-06",
      "domain": "경고 & 징계",
      "name": "경고 부여 & 원장 조정",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F15-07",
      "domain": "경고 & 징계",
      "name": "이의제기 처리",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F15-08",
      "domain": "경고 & 징계",
      "name": "제재 집행",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F15-09",
      "domain": "경고 & 징계",
      "name": "검토 큐 & 대시보드/통계/감사로그",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-01",
      "domain": "마일리지",
      "name": "내 마일리지 메인 & 월간 영수증 & 원장",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-02",
      "domain": "마일리지",
      "name": "등급·배지·랭킹·프로필 카드",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-03",
      "domain": "마일리지",
      "name": "시즌 (목록·과거 랭킹·내 스냅샷)",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-03_season_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-04",
      "domain": "마일리지",
      "name": "마일리지 정책 설정",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-04_policy-config_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-05",
      "domain": "마일리지",
      "name": "적립규칙·등급·배지·교환 프리셋 관리",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-05_policy-presets_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-06",
      "domain": "마일리지",
      "name": "적립/차감/정정 집행",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-07",
      "domain": "마일리지",
      "name": "호스트 제안",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-07_host-proposal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F16-08",
      "domain": "마일리지",
      "name": "검토 큐 & 대시보드/감사로그",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-01",
      "domain": "정기모임",
      "name": "정기모임 발견·탐색",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-02",
      "domain": "정기모임",
      "name": "정기모임 상세 조회",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-03",
      "domain": "정기모임",
      "name": "정기모임 생성 (호스트)",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-04",
      "domain": "정기모임",
      "name": "생명주기 (게시·종료·취소·재개)",
      "scenarioCount": 11,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-05",
      "domain": "정기모임",
      "name": "세션 관리 (추가·일괄·대체·취소)",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-06",
      "domain": "정기모임",
      "name": "고정형 등록·승인·대기열",
      "scenarioCount": 14,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-07",
      "domain": "정기모임",
      "name": "고정형 결제 (지갑·계좌이체)",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "partial",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-08",
      "domain": "정기모임",
      "name": "환불 (진행분 차감 · 사유별)",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-09",
      "domain": "정기모임",
      "name": "세션 출석 확정·노쇼",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F17-10",
      "domain": "정기모임",
      "name": "호스트 정산 (유료분 전달)",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F18-01",
      "domain": "분쟁 해결",
      "name": "통합 분쟁 케이스 조회",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F18-02",
      "domain": "분쟁 해결",
      "name": "분쟁 직접 접수",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F18-03",
      "domain": "분쟁 해결",
      "name": "분쟁 이의제기",
      "scenarioCount": 3,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F18-04",
      "domain": "분쟁 해결",
      "name": "분쟁 증빙·공개범위·보존",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F18-05",
      "domain": "분쟁 해결",
      "name": "호스트 운영 인박스",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F19-01",
      "domain": "관심인",
      "name": "관심인 등록·해제·한도",
      "scenarioCount": 3,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F19-02",
      "domain": "관심인",
      "name": "관심인 캘린더·새 이벤트 알림",
      "scenarioCount": 3,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F19-03",
      "domain": "관심인",
      "name": "공개범위(프라이버시) 설정",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F20-01",
      "domain": "고객지원",
      "name": "1:1 문의",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/20_support/F20-01_inquiry_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": true,
        "count": 1,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 1,
        "files": [
          "community_app/test/inquiry/inquiry_screens_test.dart"
        ],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 1,
      "pendingReview": 0
    },
    {
      "id": "F20-02",
      "domain": "고객지원",
      "name": "운영 이슈",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/20_support/F20-02_operational-issue_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 2,
      "launchScope": "open",
      "proof": "real",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F20-03",
      "domain": "고객지원",
      "name": "FAQ 제안",
      "scenarioCount": 4,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/20_support/F20-03_support-faq_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "open",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F21-01",
      "domain": "제공자 배정·정산",
      "name": "제공자 배정",
      "scenarioCount": 14,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/21_curated/F21-01_provider-assignment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F21-02",
      "domain": "제공자 배정·정산",
      "name": "참가자 서비스비 분담 결제",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F21-03",
      "domain": "제공자 배정·정산",
      "name": "제공자 정산",
      "scenarioCount": 11,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/21_curated/F21-03_provider-settlement_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F21-04",
      "domain": "제공자 배정·정산",
      "name": "무료초대·호스트 대납",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F21-05",
      "domain": "제공자 배정·정산",
      "name": "환불·회수",
      "scenarioCount": 10,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/21_curated/F21-05_refund-clawback_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F21-06",
      "domain": "제공자 배정·정산",
      "name": "계약금 선납",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F21-07",
      "domain": "제공자 배정·정산",
      "name": "정기모임 묶음 배정·정산",
      "scenarioCount": 7,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "filesPresent": 0,
        "valid": 0,
        "missing": 0,
        "state": "not-linked"
      },
      "automated": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "journey": {
        "directlyLinked": false,
        "count": 0,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 0,
        "files": [],
        "markerCandidateFiles": []
      },
      "evidenceStage": 1,
      "launchScope": "sealed",
      "proof": "auto",
      "knownIssues": 0,
      "pendingReview": 0
    }
  ]
};
