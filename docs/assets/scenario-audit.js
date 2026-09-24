/* 이 파일은 verification/build_scenario_audit_data.mjs가 현재 저장소에서 생성한다. */
window.SCENARIO_AUDIT = {
  "asOf": "2026-09-24",
  "sourceReferenceCheck": {
    "method": "exact-controller-method-and-http-route",
    "endpointIdentityChecked": true,
    "sourceRevision": "19e968a1aa128d3cf8b980413e87c397fffe91b3"
  },
  "countingNote": "1,403은 기존 기능 목록에 적힌 숫자의 합이다. 상세 시나리오 문서 117개에서 실제로 식별한 제목은 1,086개이며 49개 기능은 등록 숫자와 제목 수가 다르다. 어느 숫자도 테스트 통과율의 분모로 쓰지 않는다.",
  "totals": {
    "features": 175,
    "documentedScenarioItems": 1403,
    "definedFeatures": 175,
    "automatedTestFilesScanned": 2083,
    "journeyFilesScanned": 247,
    "unitScenarioDocuments": 117,
    "unitScenarioHeadings": 1086,
    "unitRegisteredScenarioItems": 1011,
    "unitScenarioCountMismatches": 49,
    "directlyLinkedAutomatedTests": 59,
    "automatedFeatureMarkers": 75,
    "automatedScenarioReferences": 59,
    "directlyLinkedJourneys": 56,
    "journeyFeatureMarkers": 45,
    "journeyScenarioReferences": 56,
    "featureLevelAutomatedProof": 130,
    "localServerE2eProof": 7,
    "localRealAccountProof": 37,
    "featureLevelChecked": 174,
    "completeEvidenceChain": 57,
    "partialEvidenceChain": 28,
    "definitionOnlyEvidence": 90,
    "traceMarkers": 302,
    "verifiedTraceRecords": 300,
    "unresolvedTraceRecords": 0,
    "retiredTraceMarkers": 2
  },
  "features": [
    {
      "id": "F01-01",
      "domain": "인증 & 온보딩",
      "name": "이메일 회원가입 & 로그인",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/01_auth_onboarding/F01-01_email-signup-login/scenarios.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-01_email-signup-login_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-01_email-signup-login/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F01-01:1",
            "label": "POST /api/v1/auth/signup — 이메일 회원가입",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "signup",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/signup",
                "targetLine": 41,
                "methodLine": 42
              }
            ]
          },
          {
            "id": "F01-01:2",
            "label": "POST /api/v1/auth/login — 이메일 로그인",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "login",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/login",
                "targetLine": 47,
                "methodLine": 48
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-02_social-login_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-02_social-login/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F01-02:1",
            "label": "POST /api/v1/auth/social — 소셜 로그인/가입",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "socialLogin",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/social",
                "targetLine": 66,
                "methodLine": 67
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-03_email-verification_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-03_email-verification/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F01-03:1",
            "label": "POST /api/v1/auth/send-verification-email — 인증 메일 발송",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "sendVerificationEmail",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/send-verification-email",
                "targetLine": 113,
                "methodLine": 114
              }
            ]
          },
          {
            "id": "F01-03:2",
            "label": "GET /api/v1/auth/verify-email?token={token} — 토큰 인증",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "verifyEmail",
                "httpMethod": "GET",
                "httpPath": "/api/v1/auth/verify-email",
                "targetLine": 119,
                "methodLine": 120
              }
            ]
          },
          {
            "id": "F01-03:3",
            "label": "POST /api/v1/users/me/email/verify/send",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AccountController.java",
                "controller": "AccountController",
                "method": "sendVerificationEmail",
                "httpMethod": "POST",
                "httpPath": "/api/v1/users/me/email/verify/send",
                "targetLine": 28,
                "methodLine": 29
              }
            ]
          },
          {
            "id": "F01-03:4",
            "label": "POST /api/v1/users/me/email/verify/confirm?token={token}",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AccountController.java",
                "controller": "AccountController",
                "method": "confirmEmailVerification",
                "httpMethod": "POST",
                "httpPath": "/api/v1/users/me/email/verify/confirm",
                "targetLine": 38,
                "methodLine": 39
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-04_password-reset_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-04_password-reset/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F01-04:1",
            "label": "POST /api/v1/auth/password-reset/request — 재설정 요청",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "requestPasswordReset",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/password-reset/request",
                "targetLine": 100,
                "methodLine": 101
              }
            ]
          },
          {
            "id": "F01-04:2",
            "label": "POST /api/v1/auth/password-reset/confirm — 새 비밀번호 설정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "confirmPasswordReset",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/password-reset/confirm",
                "targetLine": 107,
                "methodLine": 108
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-05_token-refresh-logout_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 15,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-05_token-refresh-logout/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F01-05:1",
            "label": "POST /api/v1/auth/refresh — 토큰 갱신",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "refreshToken",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/refresh",
                "targetLine": 53,
                "methodLine": 54
              }
            ]
          },
          {
            "id": "F01-05:2",
            "label": "POST /api/v1/auth/logout — 로그아웃",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "logout",
                "httpMethod": "POST",
                "httpPath": "/api/v1/auth/logout",
                "targetLine": 59,
                "methodLine": 60
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-06_onboarding_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-06_onboarding/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-07_preference-tags_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-07_preference-tags/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/01_auth_onboarding/F01-08_social-unlink_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/01_auth_onboarding/F01-08_social-unlink/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F01-08:1",
            "label": "DELETE /api/v1/auth/social/{providerType} — 소셜 연결 해제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/AuthController.java",
                "controller": "AuthController",
                "method": "unlinkSocial",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/auth/social/{providerType}",
                "targetLine": 77,
                "methodLine": 78
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/02_home_feed/F02-01_home-feed-main_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-01_home-feed-main/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/02_home_feed/F02-02_home-feed-refresh_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-02_home-feed-refresh/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/02_home_feed/F02-03_section-card-entry_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-03_section-card-entry/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/02_home_feed/F02-04_recommend-events-more_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-04_recommend-events-more/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F02-04:1",
            "label": "GET /api/v1/events/recommend — 페이지네이션 호출 (▶ Unit 03)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "getRecommendations",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/recommend",
                "targetLine": 186,
                "methodLine": 187
              }
            ]
          },
          {
            "id": "F02-04:2",
            "label": "GET /api/v1/search/trending — 트렌딩 시그널 (보강)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/TrendingController.java",
                "controller": "TrendingController",
                "method": "getTrending",
                "httpMethod": "GET",
                "httpPath": "/api/v1/search/trending",
                "targetLine": 25,
                "methodLine": 26
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/02_home_feed/F02-05_search-notification-entry_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/02_home_feed/F02-05_search-notification-entry/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-01_event-discovery_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-01_event-discovery/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F03-01:1",
            "label": "GET /api/v1/events — 이벤트 검색 & 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "listOpenEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events",
                "targetLine": 141,
                "methodLine": 142
              }
            ]
          },
          {
            "id": "F03-01:2",
            "label": "GET /api/v1/events/recommend — 개인화 추천",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "getRecommendations",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/recommend",
                "targetLine": 186,
                "methodLine": 187
              }
            ]
          },
          {
            "id": "F03-01:3",
            "label": "GET /api/v1/events/{eventId}/similar — 유사 이벤트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "getSimilarEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/similar",
                "targetLine": 329,
                "methodLine": 330
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-02_event-detail_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 15,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-02_event-detail/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-03_event-creation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-03_event-creation/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F03-03:1",
            "label": "POST /api/v1/events — 이벤트 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "createEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events",
                "targetLine": 80,
                "methodLine": 81
              }
            ]
          },
          {
            "id": "F03-03:2",
            "label": "POST /api/v1/events/{eventId}/publish — DRAFT → OPEN",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "publishEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/publish",
                "targetLine": 216,
                "methodLine": 217
              }
            ]
          },
          {
            "id": "F03-03:3",
            "label": "POST /api/v1/events/{eventId}/recurring — 반복 자식 일괄 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "createRecurringEvents",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/recurring",
                "targetLine": 340,
                "methodLine": 341
              }
            ]
          },
          {
            "id": "F03-03:4",
            "label": "GET /api/v1/events/{eventId}/recurring — 반복 그룹 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "getRecurringGroup",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/recurring",
                "targetLine": 371,
                "methodLine": 372
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-04_event-lifecycle_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-04_event-lifecycle/backend.md",
        "total": 9,
        "verified": 9,
        "retired": 0,
        "entries": [
          {
            "id": "F03-04:1",
            "label": "PATCH /api/v1/events/{eventId} — 메타 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "updateEvent",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}",
                "targetLine": 197,
                "methodLine": 198
              }
            ]
          },
          {
            "id": "F03-04:2",
            "label": "DELETE /api/v1/events/{eventId} — 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "deleteEvent",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}",
                "targetLine": 206,
                "methodLine": 207
              }
            ]
          },
          {
            "id": "F03-04:3",
            "label": "POST /api/v1/events/{eventId}/publish — DRAFT → OPEN",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "publishEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/publish",
                "targetLine": 216,
                "methodLine": 217
              }
            ]
          },
          {
            "id": "F03-04:4",
            "label": "POST /api/v1/events/{eventId}/close — OPEN → CLOSED",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "closeEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/close",
                "targetLine": 224,
                "methodLine": 225
              }
            ]
          },
          {
            "id": "F03-04:5",
            "label": "POST /api/v1/events/{eventId}/cancel — 취소 (환불 + 알림)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "cancelEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/cancel",
                "targetLine": 232,
                "methodLine": 233
              }
            ]
          },
          {
            "id": "F03-04:6",
            "label": "PATCH /api/v1/events/{eventId}/reschedule — 일정 변경",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "rescheduleEvent",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/reschedule",
                "targetLine": 250,
                "methodLine": 251
              }
            ]
          },
          {
            "id": "F03-04:7",
            "label": "POST /api/v1/events/{eventId}/announce — 참석자 공지 fanout (C-03)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "announceToAttendees",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/announce",
                "targetLine": 400,
                "methodLine": 401
              }
            ]
          },
          {
            "id": "F03-04:8",
            "label": "반복 모임 이후 회차 수정",
            "status": "verified",
            "note": "같은 절에 함께 적힌 수정·취소 위치를 각각 연결했다.",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "updateFutureEvents",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/recurring",
                "targetLine": 350,
                "methodLine": 351
              }
            ]
          },
          {
            "id": "F03-04:9",
            "label": "반복 모임 이후 회차 취소",
            "status": "verified",
            "note": "같은 절에 함께 적힌 수정·취소 위치를 각각 연결했다.",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "cancelAllFutureEvents",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}/recurring",
                "targetLine": 362,
                "methodLine": 363
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-05_event-attendance_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 13,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-05_event-attendance/backend.md",
        "total": 6,
        "verified": 6,
        "retired": 0,
        "entries": [
          {
            "id": "F03-05:1",
            "label": "POST /api/v1/events/{eventId}/capacity — 참석 등록 (대기열 자동 분기)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java",
                "controller": "CapacityController",
                "method": "attend",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/capacity",
                "targetLine": 37,
                "methodLine": 38
              }
            ]
          },
          {
            "id": "F03-05:2",
            "label": "DELETE /api/v1/events/{eventId}/capacity — 참석/대기 취소",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java",
                "controller": "CapacityController",
                "method": "cancel",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}/capacity",
                "targetLine": 47,
                "methodLine": 48
              }
            ]
          },
          {
            "id": "F03-05:3",
            "label": "GET /api/v1/events/{eventId}/capacity/me — 내 참석 상태",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java",
                "controller": "CapacityController",
                "method": "getMyAttendance",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/capacity/me",
                "targetLine": 152,
                "methodLine": 153
              }
            ]
          },
          {
            "id": "F03-05:4",
            "label": "POST /api/v1/events/{eventId}/apply — 신청서 제출 (승인 필요)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "applyToEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/apply",
                "targetLine": 260,
                "methodLine": 261
              }
            ]
          },
          {
            "id": "F03-05:5",
            "label": "DELETE /api/v1/events/{eventId}/apply — 신청 취소",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "cancelApplication",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}/apply",
                "targetLine": 269,
                "methodLine": 270
              }
            ]
          },
          {
            "id": "F03-05:6",
            "label": "GET /api/v1/events/users/me/applications — 내 신청 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "getMyApplications",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/users/me/applications",
                "targetLine": 287,
                "methodLine": 288
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-06_application-review_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-06_application-review/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F03-06:1",
            "label": "GET /api/v1/events/{eventId}/applications — 신청서 목록 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "getApplications",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/applications",
                "targetLine": 279,
                "methodLine": 280
              }
            ]
          },
          {
            "id": "F03-06:2",
            "label": "POST /api/v1/events/{eventId}/applications/{applicationId}/approve — 승인",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "approveApplication",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/applications/{applicationId}/approve",
                "targetLine": 294,
                "methodLine": 295
              }
            ]
          },
          {
            "id": "F03-06:3",
            "label": "POST /api/v1/events/{eventId}/applications/{applicationId}/reject — 거절",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "rejectApplication",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/applications/{applicationId}/reject",
                "targetLine": 305,
                "methodLine": 306
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-07_capacity-and-waitlist_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-07_capacity-and-waitlist/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-08_qr-checkin_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-08_qr-checkin/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F03-08:1",
            "label": "GET /api/v1/events/{eventId}/check-in/qr — QR/단축코드 발급",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java",
                "controller": "CheckInController",
                "method": "generateQrToken",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/check-in/qr",
                "targetLine": 29,
                "methodLine": 30
              }
            ]
          },
          {
            "id": "F03-08:2",
            "label": "POST /api/v1/events/{eventId}/check-in — QR 토큰으로 체크인",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java",
                "controller": "CheckInController",
                "method": "checkIn",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/check-in",
                "targetLine": 36,
                "methodLine": 37
              }
            ]
          },
          {
            "id": "F03-08:3",
            "label": "POST /api/v1/events/{eventId}/check-in/short-code — 6자리 코드 체크인",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java",
                "controller": "CheckInController",
                "method": "checkInByShortCode",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/check-in/short-code",
                "targetLine": 46,
                "methodLine": 47
              }
            ]
          },
          {
            "id": "F03-08:4",
            "label": "POST /api/v1/events/{eventId}/check-in/{userId} — 수동 체크인 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java",
                "controller": "CheckInController",
                "method": "manualCheckIn",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/check-in/{userId}",
                "targetLine": 56,
                "methodLine": 57
              }
            ]
          },
          {
            "id": "F03-08:5",
            "label": "GET /api/v1/events/{eventId}/check-in/stats — 체크인 통계",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CheckInController.java",
                "controller": "CheckInController",
                "method": "getCheckInStats",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/check-in/stats",
                "targetLine": 90,
                "methodLine": 91
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-09_event-photos_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-09_event-photos/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F03-09:1",
            "label": "GET /api/v1/events/{eventId}/photos — 앨범 + 사진 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPhotoController.java",
                "controller": "EventPhotoController",
                "method": "getPhotos",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/photos",
                "targetLine": 54,
                "methodLine": 55
              }
            ]
          },
          {
            "id": "F03-09:2",
            "label": "POST /api/v1/events/{eventId}/photos — 사진 등록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPhotoController.java",
                "controller": "EventPhotoController",
                "method": "uploadPhoto",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/photos",
                "targetLine": 62,
                "methodLine": 63
              }
            ]
          },
          {
            "id": "F03-09:3",
            "label": "DELETE /api/v1/events/{eventId}/photos/{photoId} — 사진 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPhotoController.java",
                "controller": "EventPhotoController",
                "method": "deletePhoto",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}/photos/{photoId}",
                "targetLine": 82,
                "methodLine": 83
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-10_event-plan-link_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-10_event-plan-link/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F03-10:1",
            "label": "GET /api/v1/events/{eventId}/plans — 매핑 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java",
                "controller": "EventPlanMapController",
                "method": "getEventPlans",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/plans",
                "targetLine": 30,
                "methodLine": 31
              }
            ]
          },
          {
            "id": "F03-10:2",
            "label": "POST /api/v1/events/{eventId}/plans — 매핑 추가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java",
                "controller": "EventPlanMapController",
                "method": "addPlanToEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/plans",
                "targetLine": 37,
                "methodLine": 38
              }
            ]
          },
          {
            "id": "F03-10:3",
            "label": "PATCH /api/v1/events/{eventId}/plans/{mapId} — 매핑 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java",
                "controller": "EventPlanMapController",
                "method": "updateMapping",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/plans/{mapId}",
                "targetLine": 46,
                "methodLine": 47
              }
            ]
          },
          {
            "id": "F03-10:4",
            "label": "DELETE /api/v1/events/{eventId}/plans/{mapId} — 매핑 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java",
                "controller": "EventPlanMapController",
                "method": "removePlanFromEvent",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}/plans/{mapId}",
                "targetLine": 55,
                "methodLine": 56
              }
            ]
          },
          {
            "id": "F03-10:5",
            "label": "POST /api/v1/events/{eventId}/plans/{mapId}/toggle-active — 활성 토글",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventPlanMapController.java",
                "controller": "EventPlanMapController",
                "method": "toggleActive",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/plans/{mapId}/toggle-active",
                "targetLine": 64,
                "methodLine": 65
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-11_wishlist_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-11_wishlist/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F03-11:1",
            "label": "POST /api/v1/events/{eventId}/wishlist — 추가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/WishlistController.java",
                "controller": "WishlistController",
                "method": "add",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/wishlist",
                "targetLine": 36,
                "methodLine": 37
              }
            ]
          },
          {
            "id": "F03-11:2",
            "label": "DELETE /api/v1/events/{eventId}/wishlist — 제거",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/WishlistController.java",
                "controller": "WishlistController",
                "method": "remove",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}/wishlist",
                "targetLine": 44,
                "methodLine": 45
              }
            ]
          },
          {
            "id": "F03-11:3",
            "label": "GET /api/v1/users/me/wishlist — 내 찜 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/WishlistController.java",
                "controller": "WishlistController",
                "method": "getMyWishlist",
                "httpMethod": "GET",
                "httpPath": "/api/v1/users/me/wishlist",
                "targetLine": 52,
                "methodLine": 53
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-12_my-events_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/03_event/F03-12_my-events/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F03-12:1",
            "label": "GET /api/v1/events/my — 내가 호스트인 이벤트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "listMyEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/my",
                "targetLine": 150,
                "methodLine": 151
              }
            ]
          },
          {
            "id": "F03-12:2",
            "label": "GET /api/v1/events/users/me/applications — 내 신청 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/event/controller/EventController.java",
                "controller": "EventController",
                "method": "getMyApplications",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/users/me/applications",
                "targetLine": 287,
                "methodLine": 288
              }
            ]
          },
          {
            "id": "F03-12:3",
            "label": "GET /api/v1/events/{eventId}/capacity/logs — 참석 변경 로그",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/capacity/controller/CapacityController.java",
                "controller": "CapacityController",
                "method": "getLogs",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/capacity/logs",
                "targetLine": 127,
                "methodLine": 128
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-13_event-prepayment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "launchScope": "partial",
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-14_event-transport-mode_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "launchScope": "open",
      "proof": "local",
      "knownIssues": 0,
      "pendingReview": 0
    },
    {
      "id": "F03-15",
      "domain": "이벤트",
      "name": "카풀·개별 이동",
      "scenarioCount": 8,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/03_event/F03-15_event-carpool_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-15_event-carpool_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "local",
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-16_event-bus-charter_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "evidenceStage": 3,
      "launchScope": "open",
      "proof": "local",
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-17_vehicle-layout-catalog_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "launchScope": "open",
      "proof": "local",
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-18_event-demographics_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-19_event-reschedule-consent_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/03_event/F03-20_event-no-show_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-01_club-discovery_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-01_club-discovery/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F04-01:1",
            "label": "GET /api/v1/clubs — 클럽 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getClubs",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs",
                "targetLine": 73,
                "methodLine": 74
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-02_club-detail-join_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-02_club-detail-join/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-03_club-crud-transfer_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-03_club-crud-transfer/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F04-03:1",
            "label": "POST /api/v1/clubs — 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "createClub",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs",
                "targetLine": 61,
                "methodLine": 62
              }
            ]
          },
          {
            "id": "F04-03:2",
            "label": "PATCH /api/v1/clubs/{id} — 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "updateClub",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/clubs/{id}",
                "targetLine": 101,
                "methodLine": 102
              }
            ]
          },
          {
            "id": "F04-03:3",
            "label": "DELETE /api/v1/clubs/{id} — 폐쇄",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "deleteClub",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{id}",
                "targetLine": 110,
                "methodLine": 111
              }
            ]
          },
          {
            "id": "F04-03:4",
            "label": "POST /api/v1/clubs/{id}/transfer-ownership — 소유권 이전",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "transferOwnership",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/transfer-ownership",
                "targetLine": 200,
                "methodLine": 201
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-04_member-management_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-04_member-management/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F04-04:1",
            "label": "GET /api/v1/clubs/{id}/members — 멤버 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getMembers",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/members",
                "targetLine": 152,
                "methodLine": 153
              }
            ]
          },
          {
            "id": "F04-04:2",
            "label": "POST /api/v1/clubs/{id}/members/{userId}/role — 역할 변경",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "changeRole",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/members/{userId}/role",
                "targetLine": 160,
                "methodLine": 161
              }
            ]
          },
          {
            "id": "F04-04:3",
            "label": "회원 추방 — 현재 요청과 기존 호환 요청",
            "status": "verified",
            "note": "POST /kick이 현재 요청이며, 옛 DELETE 주소는 kickMemberLegacy로 남아 있다. 두 경로 모두 사유를 전달해야 한다.",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "kickMember",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/members/{userId}/kick",
                "targetLine": 177,
                "methodLine": 178
              },
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "kickMemberLegacy",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{id}/members/{userId}",
                "targetLine": 190,
                "methodLine": 191
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-05_waitlist-invitation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-05_waitlist-invitation/backend.md",
        "total": 6,
        "verified": 6,
        "retired": 0,
        "entries": [
          {
            "id": "F04-05:1",
            "label": "GET /api/v1/clubs/{id}/waitlist",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getWaitlist",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/waitlist",
                "targetLine": 272,
                "methodLine": 273
              }
            ]
          },
          {
            "id": "F04-05:2",
            "label": "POST /api/v1/clubs/{id}/waitlist/{waitId}/approve",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "approveApplication",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/waitlist/{waitId}/approve",
                "targetLine": 280,
                "methodLine": 281
              }
            ]
          },
          {
            "id": "F04-05:3",
            "label": "POST /api/v1/clubs/{id}/waitlist/{waitId}/reject",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "rejectApplication",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/waitlist/{waitId}/reject",
                "targetLine": 289,
                "methodLine": 290
              }
            ]
          },
          {
            "id": "F04-05:4",
            "label": "POST /api/v1/clubs/{id}/invitations",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "inviteMember",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/invitations",
                "targetLine": 300,
                "methodLine": 301
              }
            ]
          },
          {
            "id": "F04-05:5",
            "label": "POST /api/v1/clubs/{id}/invitations/{invitationId}/accept",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "acceptInvite",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/invitations/{invitationId}/accept",
                "targetLine": 309,
                "methodLine": 310
              }
            ]
          },
          {
            "id": "F04-05:6",
            "label": "POST /api/v1/clubs/{id}/invitations/{invitationId}/decline",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "declineInvite",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/invitations/{invitationId}/decline",
                "targetLine": 320,
                "methodLine": 321
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-06_ban-management_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-06_ban-management/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F04-06:1",
            "label": "POST /api/v1/clubs/{id}/members/{userId}/ban — 차단",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "banMember",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/members/{userId}/ban",
                "targetLine": 335,
                "methodLine": 336
              }
            ]
          },
          {
            "id": "F04-06:2",
            "label": "DELETE /api/v1/clubs/{id}/members/{userId}/ban — 차단 해제 (멤버 경로)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "unbanMember",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{id}/members/{userId}/ban",
                "targetLine": 345,
                "methodLine": 346
              }
            ]
          },
          {
            "id": "F04-06:3",
            "label": "GET /api/v1/clubs/{id}/bans — 차단 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getBanList",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/bans",
                "targetLine": 360,
                "methodLine": 361
              }
            ]
          },
          {
            "id": "F04-06:4",
            "label": "DELETE /api/v1/clubs/{id}/bans/{userId} — 차단 해제 (전용 경로)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "unbanMemberByBanPath",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{id}/bans/{userId}",
                "targetLine": 373,
                "methodLine": 374
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-07_my-clubs-stats_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-07_my-clubs-stats/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F04-07:1",
            "label": "GET /api/v1/clubs/my — 내 클럽 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getMyClubs",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/my",
                "targetLine": 118,
                "methodLine": 119
              }
            ]
          },
          {
            "id": "F04-07:2",
            "label": "GET /api/v1/clubs/{id}/members/stats — 멤버 통계",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getMemberStats",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/members/stats",
                "targetLine": 384,
                "methodLine": 385
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-08_board-post-crud_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 17,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-08_board-post-crud/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-09_post-comments_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-09_post-comments/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-10_announcements_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-10_announcements/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F04-10:1",
            "label": "POST /api/v1/clubs/{id}/announcements — 공지 작성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "createAnnouncement",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/announcements",
                "targetLine": 394,
                "methodLine": 395
              }
            ]
          },
          {
            "id": "F04-10:2",
            "label": "GET /api/v1/clubs/{id}/announcements — 공지 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getAnnouncements",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/announcements",
                "targetLine": 403,
                "methodLine": 404
              }
            ]
          },
          {
            "id": "F04-10:3",
            "label": "DELETE /api/v1/clubs/{id}/announcements/{announcementId} — 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "deleteAnnouncement",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{id}/announcements/{announcementId}",
                "targetLine": 422,
                "methodLine": 423
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-11_photo-album_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-11_photo-album/backend.md",
        "total": 9,
        "verified": 9,
        "retired": 0,
        "entries": [
          {
            "id": "F04-11:1",
            "label": "GET /clubs/{clubId}/photo-albums — 앨범 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "getAlbums",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums",
                "targetLine": 33,
                "methodLine": 34
              }
            ]
          },
          {
            "id": "F04-11:2",
            "label": "POST /clubs/{clubId}/photo-albums — 앨범 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "createAlbum",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums",
                "targetLine": 49,
                "methodLine": 50
              }
            ]
          },
          {
            "id": "F04-11:3",
            "label": "PUT /clubs/{clubId}/photo-albums/{albumId} — 앨범 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "updateAlbum",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums/{albumId}",
                "targetLine": 58,
                "methodLine": 59
              }
            ]
          },
          {
            "id": "F04-11:4",
            "label": "DELETE /clubs/{clubId}/photo-albums/{albumId} — 앨범 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "deleteAlbum",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums/{albumId}",
                "targetLine": 68,
                "methodLine": 69
              }
            ]
          },
          {
            "id": "F04-11:5",
            "label": "GET /clubs/{clubId}/photo-albums/{albumId}/photos — 사진 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "getPhotos",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos",
                "targetLine": 77,
                "methodLine": 78
              }
            ]
          },
          {
            "id": "F04-11:6",
            "label": "POST /clubs/{clubId}/photo-albums/{albumId}/photos — 사진 메타 등록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "uploadPhoto",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos",
                "targetLine": 86,
                "methodLine": 87
              }
            ]
          },
          {
            "id": "F04-11:7",
            "label": "DELETE /clubs/{clubId}/photo-albums/{albumId}/photos/{photoId} — 사진 단건 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "deletePhoto",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos/{photoId}",
                "targetLine": 96,
                "methodLine": 97
              }
            ]
          },
          {
            "id": "F04-11:8",
            "label": "POST .../photos/batch-delete — 일괄 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "batchDeletePhotos",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos/batch-delete",
                "targetLine": 106,
                "methodLine": 107
              }
            ]
          },
          {
            "id": "F04-11:9",
            "label": "POST .../photos/batch-delete — 일괄 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubPhotoAlbumController.java",
                "controller": "ClubPhotoAlbumController",
                "method": "batchDeletePhotos",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/photo-albums/{albumId}/photos/batch-delete",
                "targetLine": 106,
                "methodLine": 107
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-12_club-events-calendar_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-12_club-events-calendar/backend.md",
        "total": 29,
        "verified": 29,
        "retired": 0,
        "entries": [
          {
            "id": "F04-12:1",
            "label": "POST /clubs/{clubId}/events — 클럽 이벤트 생성 (DRAFT)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "createClubEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events",
                "targetLine": 52,
                "methodLine": 53
              }
            ]
          },
          {
            "id": "F04-12:2",
            "label": "POST .../events/{eventId}/publish — DRAFT → OPEN + 자동 참가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "publishClubEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/publish",
                "targetLine": 136,
                "methodLine": 137
              }
            ]
          },
          {
            "id": "F04-12:3",
            "label": "POST .../events/{eventId}/publish — DRAFT → OPEN + 자동 참가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "publishClubEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/publish",
                "targetLine": 136,
                "methodLine": 137
              }
            ]
          },
          {
            "id": "F04-12:4",
            "label": "POST .../events/{eventId}/cancel — OPEN → CANCELED + 환불",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "cancelClubEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/cancel",
                "targetLine": 150,
                "methodLine": 151
              }
            ]
          },
          {
            "id": "F04-12:5",
            "label": "POST .../events/{eventId}/cancel — OPEN → CANCELED + 환불",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "cancelClubEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/cancel",
                "targetLine": 150,
                "methodLine": 151
              }
            ]
          },
          {
            "id": "F04-12:6",
            "label": "PATCH .../events/{eventId} — 수정 (DRAFT 상태에서만)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "updateClubEvent",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}",
                "targetLine": 106,
                "methodLine": 107
              }
            ]
          },
          {
            "id": "F04-12:7",
            "label": "PATCH .../events/{eventId} — 수정 (DRAFT 상태에서만)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "updateClubEvent",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}",
                "targetLine": 106,
                "methodLine": 107
              }
            ]
          },
          {
            "id": "F04-12:8",
            "label": "DELETE .../events/{eventId} — 삭제 (DRAFT 상태에서만)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "deleteClubEvent",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}",
                "targetLine": 120,
                "methodLine": 121
              }
            ]
          },
          {
            "id": "F04-12:9",
            "label": "DELETE .../events/{eventId} — 삭제 (DRAFT 상태에서만)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "deleteClubEvent",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}",
                "targetLine": 120,
                "methodLine": 121
              }
            ]
          },
          {
            "id": "F04-12:10",
            "label": "GET .../events — 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events",
                "targetLine": 66,
                "methodLine": 67
              }
            ]
          },
          {
            "id": "F04-12:11",
            "label": "GET .../events — 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events",
                "targetLine": 66,
                "methodLine": 67
              }
            ]
          },
          {
            "id": "F04-12:12",
            "label": "GET .../events/upcoming",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getUpcomingClubEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/upcoming",
                "targetLine": 80,
                "methodLine": 81
              }
            ]
          },
          {
            "id": "F04-12:13",
            "label": "GET .../events/upcoming",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getUpcomingClubEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/upcoming",
                "targetLine": 80,
                "methodLine": 81
              }
            ]
          },
          {
            "id": "F04-12:14",
            "label": "GET .../events/{eventId} — 상세",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEvent",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}",
                "targetLine": 93,
                "methodLine": 94
              }
            ]
          },
          {
            "id": "F04-12:15",
            "label": "GET .../events/{eventId} — 상세",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEvent",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}",
                "targetLine": 93,
                "methodLine": 94
              }
            ]
          },
          {
            "id": "F04-12:16",
            "label": "POST .../attendees — 참가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "joinClubEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/attendees",
                "targetLine": 165,
                "methodLine": 166
              }
            ]
          },
          {
            "id": "F04-12:17",
            "label": "POST .../attendees — 참가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "joinClubEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/attendees",
                "targetLine": 165,
                "methodLine": 166
              }
            ]
          },
          {
            "id": "F04-12:18",
            "label": "DELETE .../attendees/me — 참가 취소 + 대기 승격",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "leaveClubEvent",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/attendees/me",
                "targetLine": 177,
                "methodLine": 178
              }
            ]
          },
          {
            "id": "F04-12:19",
            "label": "DELETE .../attendees/me — 참가 취소 + 대기 승격",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "leaveClubEvent",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/attendees/me",
                "targetLine": 177,
                "methodLine": 178
              }
            ]
          },
          {
            "id": "F04-12:20",
            "label": "GET .../attendees — 참가자 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEventAttendees",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/attendees",
                "targetLine": 189,
                "methodLine": 190
              }
            ]
          },
          {
            "id": "F04-12:21",
            "label": "GET .../attendees — 참가자 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEventAttendees",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/{eventId}/attendees",
                "targetLine": 189,
                "methodLine": 190
              }
            ]
          },
          {
            "id": "F04-12:22",
            "label": "GET .../events/calendar?year=&month=",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEventCalendar",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/calendar",
                "targetLine": 205,
                "methodLine": 206
              }
            ]
          },
          {
            "id": "F04-12:23",
            "label": "GET .../events/calendar?year=&month=",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEventCalendar",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/calendar",
                "targetLine": 205,
                "methodLine": 206
              }
            ]
          },
          {
            "id": "F04-12:24",
            "label": "GET .../events/statistics",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEventStatistics",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/statistics",
                "targetLine": 220,
                "methodLine": 221
              }
            ]
          },
          {
            "id": "F04-12:25",
            "label": "GET .../events/statistics",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getClubEventStatistics",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/statistics",
                "targetLine": 220,
                "methodLine": 221
              }
            ]
          },
          {
            "id": "F04-12:26",
            "label": "POST .../events/recurring — 반복 이벤트 일괄 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "createRecurringEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/recurring",
                "targetLine": 235,
                "methodLine": 236
              }
            ]
          },
          {
            "id": "F04-12:27",
            "label": "POST .../events/recurring — 반복 이벤트 일괄 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "createRecurringEvent",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{clubId}/events/recurring",
                "targetLine": 235,
                "methodLine": 236
              }
            ]
          },
          {
            "id": "F04-12:28",
            "label": "GET .../events/recurring — 템플릿 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getRecurringEventTemplates",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/recurring",
                "targetLine": 249,
                "methodLine": 250
              }
            ]
          },
          {
            "id": "F04-12:29",
            "label": "GET .../events/recurring — 템플릿 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubEventController.java",
                "controller": "ClubEventController",
                "method": "getRecurringEventTemplates",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{clubId}/events/recurring",
                "targetLine": 249,
                "methodLine": 250
              }
            ]
          }
        ]
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
      "name": "기금 현황",
      "scenarioCount": 10,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/04_club/F04-13_fund-overview/scenarios.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-13_fund-overview_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-13_fund-overview/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F04-13:1",
            "label": "GET /api/v1/clubs/{id}/fund — 기금 요약",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getFund",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/fund",
                "targetLine": 467,
                "methodLine": 468
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-14_donation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 15,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-14_donation/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F04-14:1",
            "label": "POST /clubs/{id}/donations — 기부",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "donate",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/donations",
                "targetLine": 433,
                "methodLine": 434
              }
            ]
          },
          {
            "id": "F04-14:2",
            "label": "GET /clubs/{id}/donations — 기부 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getDonations",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/donations",
                "targetLine": 449,
                "methodLine": 450
              }
            ]
          },
          {
            "id": "F04-14:3",
            "label": "GET /clubs/{id}/donations/summary — 요약",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getDonationSummary",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/donations/summary",
                "targetLine": 442,
                "methodLine": 443
              }
            ]
          },
          {
            "id": "F04-14:4",
            "label": "POST /clubs/{id}/donations/{donationId}/cancel — 본인 기부 취소",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "cancelDonation",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/donations/{donationId}/cancel",
                "targetLine": 457,
                "methodLine": 458
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-15_fund-withdrawal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-15_fund-withdrawal/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F04-15:1",
            "label": "POST /clubs/{id}/fund/withdraw — 인출 신청",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "requestWithdrawal",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/fund/withdraw",
                "targetLine": 489,
                "methodLine": 490
              }
            ]
          },
          {
            "id": "F04-15:2",
            "label": "GET /clubs/{id}/fund/withdrawals — 인출 이력",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getWithdrawalHistory",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/fund/withdrawals",
                "targetLine": 498,
                "methodLine": 499
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-16_subscription_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/04_club/F04-16_subscription/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F04-16:1",
            "label": "GET /clubs/{id}/subscription/plans — 플랜 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getSubscriptionPlans",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/subscription/plans",
                "targetLine": 508,
                "methodLine": 509
              }
            ]
          },
          {
            "id": "F04-16:2",
            "label": "POST /clubs/{id}/subscription — 구독/갱신",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "subscribe",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/subscription",
                "targetLine": 516,
                "methodLine": 517
              }
            ]
          },
          {
            "id": "F04-16:3",
            "label": "GET /clubs/{id}/subscription — 상태 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "getSubscription",
                "httpMethod": "GET",
                "httpPath": "/api/v1/clubs/{id}/subscription",
                "targetLine": 528,
                "methodLine": 529
              }
            ]
          },
          {
            "id": "F04-16:4",
            "label": "DELETE /clubs/{id}/subscription — 자동 갱신 취소 (해지 예약)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "cancelSubscription",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/clubs/{id}/subscription",
                "targetLine": 536,
                "methodLine": 537
              }
            ]
          },
          {
            "id": "F04-16:5",
            "label": "POST /clubs/{id}/subscription/reactivate — 재활성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/club/controller/ClubController.java",
                "controller": "ClubController",
                "method": "reactivateSubscription",
                "httpMethod": "POST",
                "httpPath": "/api/v1/clubs/{id}/subscription/reactivate",
                "targetLine": 544,
                "methodLine": 545
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-17_club-demographics_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/04_club/F04-18_club-reputation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/05_search/F05-01_keyword-search_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-01_keyword-search/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/05_search/F05-02_autocomplete-suggest_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-02_autocomplete-suggest/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F05-02:1",
            "label": "GET /api/v1/search/suggest — 자동완성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SearchController.java",
                "controller": "SearchController",
                "method": "suggest",
                "httpMethod": "GET",
                "httpPath": "/api/v1/search/suggest",
                "targetLine": 109,
                "methodLine": 110
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/05_search/F05-03_search-filter_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-03_search-filter/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F05-03:1",
            "label": "GET /api/v1/search 의 필터 파라미터 (재정리)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SearchController.java",
                "controller": "SearchController",
                "method": "searchEvents",
                "httpMethod": "GET",
                "httpPath": "/api/v1/search",
                "targetLine": 49,
                "methodLine": 50
              }
            ]
          },
          {
            "id": "F05-03:2",
            "label": "GET /api/v1/search/filter-hints — 지역 기반 필터 힌트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SearchController.java",
                "controller": "SearchController",
                "method": "getFilterHints",
                "httpMethod": "GET",
                "httpPath": "/api/v1/search/filter-hints",
                "targetLine": 103,
                "methodLine": 104
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/05_search/F05-04_search-history_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-04_search-history/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/05_search/F05-05_saved-search_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/05_search/F05-05_saved-search/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F05-05:1",
            "label": "GET /api/v1/search/saved — 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java",
                "controller": "SavedSearchController",
                "method": "getSavedSearches",
                "httpMethod": "GET",
                "httpPath": "/api/v1/search/saved",
                "targetLine": 31,
                "methodLine": 32
              }
            ]
          },
          {
            "id": "F05-05:2",
            "label": "POST /api/v1/search/saved — 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java",
                "controller": "SavedSearchController",
                "method": "createSavedSearch",
                "httpMethod": "POST",
                "httpPath": "/api/v1/search/saved",
                "targetLine": 41,
                "methodLine": 42
              }
            ]
          },
          {
            "id": "F05-05:3",
            "label": "PUT /api/v1/search/saved/{id} — 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java",
                "controller": "SavedSearchController",
                "method": "updateSavedSearch",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/search/saved/{id}",
                "targetLine": 53,
                "methodLine": 54
              }
            ]
          },
          {
            "id": "F05-05:4",
            "label": "DELETE /api/v1/search/saved/{id} — 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java",
                "controller": "SavedSearchController",
                "method": "deleteSavedSearch",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/search/saved/{id}",
                "targetLine": 65,
                "methodLine": 66
              }
            ]
          },
          {
            "id": "F05-05:5",
            "label": "POST /api/v1/search/saved/{id}/execute — 실행",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/search/controller/SavedSearchController.java",
                "controller": "SavedSearchController",
                "method": "executeSavedSearch",
                "httpMethod": "POST",
                "httpPath": "/api/v1/search/saved/{id}/execute",
                "targetLine": 77,
                "methodLine": 78
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-01_wallet-main_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-01_wallet-main/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F06-01:1",
            "label": "GET /api/v1/wallet — 지갑 단건 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getWallet",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet",
                "targetLine": 62,
                "methodLine": 63
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-02_point-charge_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-02_point-charge/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F06-02:1",
            "label": "GET /api/v1/wallet/charge/presets — 프리셋 + 최근 금액",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java",
                "controller": "AutoChargeController",
                "method": "getChargePresets",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/charge/presets",
                "targetLine": 27,
                "methodLine": 28
              }
            ]
          },
          {
            "id": "F06-02:2",
            "label": "POST /api/v1/wallet/charge — 충전 시작",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "charge",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/charge",
                "targetLine": 73,
                "methodLine": 74
              }
            ]
          },
          {
            "id": "F06-02:3",
            "label": "POST /api/v1/wallet/charge/client-confirm — 클라이언트 PG 승인",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "clientConfirmCharge",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/charge/client-confirm",
                "targetLine": 99,
                "methodLine": 100
              }
            ]
          },
          {
            "id": "F06-02:4",
            "label": "POST /api/v1/wallet/charge/confirm — PG Webhook 승인",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "confirmCharge",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/charge/confirm",
                "targetLine": 85,
                "methodLine": 86
              }
            ]
          },
          {
            "id": "F06-02:5",
            "label": "POST /api/v1/wallet/charge/cancel — 충전 취소",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "cancelCharge",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/charge/cancel",
                "targetLine": 111,
                "methodLine": 112
              }
            ]
          }
        ]
      },
      "automated": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 1,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_notification_permission_test.dart",
          "community_app/integration_test/seed_wallet_payment_visibility_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/test/presentation/payment/point_charge_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 2,
        "featureMarkerCount": 0,
        "scenarioReferenceCount": 2,
        "files": [
          "community_app/integration_test/seed_notification_permission_test.dart",
          "community_app/integration_test/seed_wallet_payment_visibility_test.dart"
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
      "id": "F06-03",
      "domain": "결제 & 지갑",
      "name": "거래 내역 조회·필터·내보내기",
      "scenarioCount": 7,
      "scenarioSource": "상세 시나리오 문서",
      "scenarioPath": "business_logic/units/06_payment/F06-03_transaction-history/scenarios.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-03_transaction-history_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-03_transaction-history/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F06-03:1",
            "label": "GET /api/v1/wallet/transactions — 거래 내역 페이지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getTransactions",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/transactions",
                "targetLine": 152,
                "methodLine": 153
              }
            ]
          },
          {
            "id": "F06-03:2",
            "label": "GET /api/v1/wallet/transactions/{id} — 거래 상세",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getTransaction",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/transactions/{id}",
                "targetLine": 164,
                "methodLine": 165
              }
            ]
          },
          {
            "id": "F06-03:3",
            "label": "GET /api/v1/wallet/transactions/export — CSV/TXT 내보내기",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/TransactionExportController.java",
                "controller": "TransactionExportController",
                "method": "exportTransactions",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/transactions/export",
                "targetLine": 28,
                "methodLine": 29
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-04_payment-method_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-04_payment-method/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F06-04:1",
            "label": "GET /api/v1/wallet/payment-methods — 결제수단 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java",
                "controller": "PaymentMethodController",
                "method": "getPaymentMethods",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/payment-methods",
                "targetLine": 29,
                "methodLine": 30
              }
            ]
          },
          {
            "id": "F06-04:2",
            "label": "POST /api/v1/wallet/payment-methods — 결제수단 등록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java",
                "controller": "PaymentMethodController",
                "method": "createPaymentMethod",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/payment-methods",
                "targetLine": 42,
                "methodLine": 43
              }
            ]
          },
          {
            "id": "F06-04:3",
            "label": "DELETE /api/v1/wallet/payment-methods/{id} — 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java",
                "controller": "PaymentMethodController",
                "method": "deletePaymentMethod",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/wallet/payment-methods/{id}",
                "targetLine": 50,
                "methodLine": 51
              }
            ]
          },
          {
            "id": "F06-04:4",
            "label": "PATCH /api/v1/wallet/payment-methods/{id}/default — 기본 전환",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/PaymentMethodController.java",
                "controller": "PaymentMethodController",
                "method": "setDefault",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/wallet/payment-methods/{id}/default",
                "targetLine": 58,
                "methodLine": 59
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-05_auto-charge_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-05_auto-charge/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F06-05:1",
            "label": "GET /api/v1/wallet/auto-charge — 설정 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java",
                "controller": "AutoChargeController",
                "method": "getAutoChargeConfig",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/auto-charge",
                "targetLine": 33,
                "methodLine": 34
              }
            ]
          },
          {
            "id": "F06-05:2",
            "label": "PUT /api/v1/wallet/auto-charge — 설정 저장",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java",
                "controller": "AutoChargeController",
                "method": "updateAutoChargeConfig",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/wallet/auto-charge",
                "targetLine": 39,
                "methodLine": 40
              }
            ]
          },
          {
            "id": "F06-05:3",
            "label": "DELETE /api/v1/wallet/auto-charge — 비활성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java",
                "controller": "AutoChargeController",
                "method": "disableAutoCharge",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/wallet/auto-charge",
                "targetLine": 46,
                "methodLine": 47
              }
            ]
          },
          {
            "id": "F06-05:4",
            "label": "GET /api/v1/wallet/charge/presets — 자주 쓴 충전 금액",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/AutoChargeController.java",
                "controller": "AutoChargeController",
                "method": "getChargePresets",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/charge/presets",
                "targetLine": 27,
                "methodLine": 28
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-06_point-pay-refund_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 20,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-06_point-pay-refund/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F06-06:1",
            "label": "POST /api/v1/wallet/pay — 포인트 결제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "pay",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/pay",
                "targetLine": 128,
                "methodLine": 129
              }
            ]
          },
          {
            "id": "F06-06:2",
            "label": "POST /api/v1/wallet/refund — 이벤트 환불",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "refund",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/refund",
                "targetLine": 140,
                "methodLine": 141
              }
            ]
          },
          {
            "id": "F06-06:3",
            "label": "GET /api/v1/wallet/refund/policy — 환불 정책 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getRefundPolicy",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/refund/policy",
                "targetLine": 176,
                "methodLine": 177
              }
            ]
          }
        ]
      },
      "automated": {
        "directlyLinked": true,
        "count": 3,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 3,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/integration_test/seed_report_mutation_test.dart"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_subscription_mutation_test.dart",
          "community_app/test/presentation/payment/transaction_history_guidance_card_test.dart"
        ]
      },
      "journey": {
        "directlyLinked": true,
        "count": 4,
        "featureMarkerCount": 2,
        "scenarioReferenceCount": 4,
        "files": [
          "community_app/integration_test/seed_calendar_availability_mutation_test.dart",
          "community_app/integration_test/seed_payment_refund_test.dart",
          "community_app/integration_test/seed_report_mutation_test.dart",
          "community_app/scripts/e2e/run_p70_payment_refund_matrix.sh"
        ],
        "markerCandidateFiles": [
          "community_app/integration_test/seed_subscription_mutation_test.dart",
          "community_app/scripts/e2e/run_p71_subscription_mutation_matrix.sh"
        ]
      },
      "evidenceStage": 3,
      "launchScope": "partial",
      "proof": "local",
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-07_hosting-ticket_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-07_hosting-ticket/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F06-07:1",
            "label": "GET /api/v1/hosting-tickets — 보유 티켓 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/HostingTicketController.java",
                "controller": "HostingTicketController",
                "method": "getAvailableTickets",
                "httpMethod": "GET",
                "httpPath": "/api/v1/hosting-tickets",
                "targetLine": 29,
                "methodLine": 30
              }
            ]
          },
          {
            "id": "F06-07:2",
            "label": "POST /api/v1/hosting-tickets/purchase — 티켓 구매",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/HostingTicketController.java",
                "controller": "HostingTicketController",
                "method": "purchaseTicket",
                "httpMethod": "POST",
                "httpPath": "/api/v1/hosting-tickets/purchase",
                "targetLine": 35,
                "methodLine": 36
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-08_personal-subscription_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-08_personal-subscription/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F06-08:1",
            "label": "GET /api/v1/subscriptions/plans — 플랜 카탈로그",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java",
                "controller": "SubscriptionController",
                "method": "getPlans",
                "httpMethod": "GET",
                "httpPath": "/api/v1/subscriptions/plans",
                "targetLine": 33,
                "methodLine": 34
              }
            ]
          },
          {
            "id": "F06-08:2",
            "label": "GET /api/v1/subscriptions/me — 내 구독 단건",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java",
                "controller": "SubscriptionController",
                "method": "getMySubscription",
                "httpMethod": "GET",
                "httpPath": "/api/v1/subscriptions/me",
                "targetLine": 49,
                "methodLine": 52
              }
            ]
          },
          {
            "id": "F06-08:3",
            "label": "POST /api/v1/subscriptions/subscribe — 구독 시작",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java",
                "controller": "SubscriptionController",
                "method": "subscribe",
                "httpMethod": "POST",
                "httpPath": "/api/v1/subscriptions/subscribe",
                "targetLine": 57,
                "methodLine": 58
              }
            ]
          },
          {
            "id": "F06-08:4",
            "label": "POST /api/v1/subscriptions/cancel — 자동갱신 해제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java",
                "controller": "SubscriptionController",
                "method": "cancelAutoRenew",
                "httpMethod": "POST",
                "httpPath": "/api/v1/subscriptions/cancel",
                "targetLine": 65,
                "methodLine": 68
              }
            ]
          },
          {
            "id": "F06-08:5",
            "label": "POST /api/v1/subscriptions/reactivate — 재활성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/SubscriptionController.java",
                "controller": "SubscriptionController",
                "method": "reactivate",
                "httpMethod": "POST",
                "httpPath": "/api/v1/subscriptions/reactivate",
                "targetLine": 73,
                "methodLine": 74
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-09_earnings-dashboard_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-09_earnings-dashboard/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F06-09:1",
            "label": "GET /api/v1/wallet/earnings/dashboard — 수익 대시보드",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getEarningsDashboard",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/earnings/dashboard",
                "targetLine": 185,
                "methodLine": 186
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/06_payment/F06-10_settlement-appeal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/06_payment/F06-10_settlement-appeal/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F06-10:1",
            "label": "GET /api/v1/wallet/settlements — 내 정산 페이지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getMySettlements",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/settlements",
                "targetLine": 196,
                "methodLine": 197
              }
            ]
          },
          {
            "id": "F06-10:2",
            "label": "GET /api/v1/wallet/settlements/summary — 합계/건수",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getMySettlementSummary",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/settlements/summary",
                "targetLine": 210,
                "methodLine": 211
              }
            ]
          },
          {
            "id": "F06-10:3",
            "label": "GET /api/v1/wallet/settlements/{id} — 단건 상세",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/WalletController.java",
                "controller": "WalletController",
                "method": "getSettlementDetail",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/settlements/{id}",
                "targetLine": 220,
                "methodLine": 221
              }
            ]
          },
          {
            "id": "F06-10:4",
            "label": "POST /api/v1/wallet/settlements/{settlementId}/appeal — 이의 제기",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/SettlementAppealController.java",
                "controller": "SettlementAppealController",
                "method": "createAppeal",
                "httpMethod": "POST",
                "httpPath": "/api/v1/wallet/settlements/{settlementId}/appeal",
                "targetLine": 27,
                "methodLine": 28
              }
            ]
          },
          {
            "id": "F06-10:5",
            "label": "GET /api/v1/wallet/settlements/{settlementId}/appeal — 이의 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/controller/SettlementAppealController.java",
                "controller": "SettlementAppealController",
                "method": "getAppeal",
                "httpMethod": "GET",
                "httpPath": "/api/v1/wallet/settlements/{settlementId}/appeal",
                "targetLine": 36,
                "methodLine": 37
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-01_create-settlement_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-01_create-settlement/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F07-01:1",
            "label": "POST /api/v1/events/{eventId}/settlement — 정산 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "createSettlement",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement",
                "targetLine": 64,
                "methodLine": 65
              }
            ]
          },
          {
            "id": "F07-01:2",
            "label": "POST /api/v1/events/{eventId}/settlement/clone — 과거 정산 복제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "cloneSettlement",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/clone",
                "targetLine": 83,
                "methodLine": 84
              }
            ]
          },
          {
            "id": "F07-01:3",
            "label": "GET /api/v1/events/{eventId}/settlement/participant-suggestions — 참여자 추천",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getParticipantSuggestions",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/participant-suggestions",
                "targetLine": 128,
                "methodLine": 129
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-02_settlement-items_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-02_settlement-items/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F07-02:1",
            "label": "POST /api/v1/events/{eventId}/settlement/items — 항목 추가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "addItem",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/items",
                "targetLine": 152,
                "methodLine": 153
              }
            ]
          },
          {
            "id": "F07-02:2",
            "label": "PUT /api/v1/events/{eventId}/settlement/items/{itemId} — 항목 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "updateItem",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/events/{eventId}/settlement/items/{itemId}",
                "targetLine": 189,
                "methodLine": 190
              }
            ]
          },
          {
            "id": "F07-02:3",
            "label": "DELETE /api/v1/events/{eventId}/settlement/items/{itemId} — 항목 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "deleteItem",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/events/{eventId}/settlement/items/{itemId}",
                "targetLine": 199,
                "methodLine": 200
              }
            ]
          },
          {
            "id": "F07-02:4",
            "label": "GET /api/v1/users/me/settlement-items/recent — 최근 항목 자동완성 (E-01 옵션 D)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/RecentSettlementItemController.java",
                "controller": "RecentSettlementItemController",
                "method": "getRecentSettlementItems",
                "httpMethod": "GET",
                "httpPath": "/api/v1/users/me/settlement-items/recent",
                "targetLine": 36,
                "methodLine": 37
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-03_activate-cancel_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-03_activate-cancel/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F07-03:1",
            "label": "PATCH /api/v1/events/{eventId}/settlement/activate — 정산 활성화",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "activateSettlement",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/activate",
                "targetLine": 109,
                "methodLine": 110
              }
            ]
          },
          {
            "id": "F07-03:2",
            "label": "PATCH /api/v1/events/{eventId}/settlement/cancel — 정산 취소",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "cancelSettlement",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/cancel",
                "targetLine": 119,
                "methodLine": 120
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-04_status-summary-receipt_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-04_status-summary-receipt/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F07-04:1",
            "label": "GET /api/v1/events/{eventId}/settlement — 정산 본체 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getSettlement",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement",
                "targetLine": 101,
                "methodLine": 102
              }
            ]
          },
          {
            "id": "F07-04:2",
            "label": "GET /api/v1/events/{eventId}/settlement/summary — 정산 요약 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getSettlementSummary",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/summary",
                "targetLine": 143,
                "methodLine": 144
              }
            ]
          },
          {
            "id": "F07-04:3",
            "label": "GET /api/v1/events/{eventId}/settlement/receipts/{fileId}/download-url — 영수증 presigned URL",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getReceiptDownloadUrl",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/receipts/{fileId}/download-url",
                "targetLine": 74,
                "methodLine": 75
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-05_pay-share_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-05_pay-share/backend.md",
        "total": 7,
        "verified": 7,
        "retired": 0,
        "entries": [
          {
            "id": "F07-05:1",
            "label": "GET .../settlement/my-shares — 본인 분담 리스트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getMyShares",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/my-shares",
                "targetLine": 136,
                "methodLine": 137
              }
            ]
          },
          {
            "id": "F07-05:2",
            "label": "GET .../settlement/transfers/me — 본인 이체 리스트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getMyTransfers",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/me",
                "targetLine": 238,
                "methodLine": 239
              }
            ]
          },
          {
            "id": "F07-05:3",
            "label": "POST .../settlement/shares/{shareId}/pay — Share를 POINT로 결제 (참가자)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "payShare",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/shares/{shareId}/pay",
                "targetLine": 209,
                "methodLine": 210
              }
            ]
          },
          {
            "id": "F07-05:4",
            "label": "PATCH .../settlement/shares/{shareId}/confirm — Share 계좌이체 확인 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "confirmBankTransfer",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/shares/{shareId}/confirm",
                "targetLine": 218,
                "methodLine": 219
              }
            ]
          },
          {
            "id": "F07-05:5",
            "label": "POST .../settlement/transfers/{transferId}/pay — Transfer POINT 결제 (참가자)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "payTransferByPoint",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/{transferId}/pay",
                "targetLine": 259,
                "methodLine": 260
              }
            ]
          },
          {
            "id": "F07-05:6",
            "label": "POST .../settlement/transfers/{transferId}/pay-mixed — Transfer 혼합 결제 (참가자)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "payTransferMixed",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/{transferId}/pay-mixed",
                "targetLine": 335,
                "methodLine": 336
              }
            ]
          },
          {
            "id": "F07-05:7",
            "label": "POST .../settlement/transfers/{transferId}/self-refund — 수취자 self-refund (참가자)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "selfRefundTransfer",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/{transferId}/self-refund",
                "targetLine": 359,
                "methodLine": 360
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-06_host-confirm-transfers_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 13,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-06_host-confirm-transfers/backend.md",
        "total": 6,
        "verified": 6,
        "retired": 0,
        "entries": [
          {
            "id": "F07-06:1",
            "label": "GET .../settlement/transfers — 전체 이체 리스트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getTransfers",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers",
                "targetLine": 229,
                "methodLine": 230
              }
            ]
          },
          {
            "id": "F07-06:2",
            "label": "PATCH .../settlement/shares/{shareId}/confirm — Share 계좌이체 확인 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "confirmBankTransfer",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/shares/{shareId}/confirm",
                "targetLine": 218,
                "methodLine": 219
              }
            ]
          },
          {
            "id": "F07-06:3",
            "label": "PATCH .../settlement/transfers/{transferId}/confirm — Transfer 확인 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "confirmTransferBankTransfer",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/{transferId}/confirm",
                "targetLine": 268,
                "methodLine": 269
              }
            ]
          },
          {
            "id": "F07-06:4",
            "label": "PATCH .../settlement/transfers/bulk-confirm — 일괄 확인",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "bulkConfirmTransfers",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/bulk-confirm",
                "targetLine": 286,
                "methodLine": 287
              }
            ]
          },
          {
            "id": "F07-06:5",
            "label": "POST .../settlement/transfers/{transferId}/reissue — EXPIRED 재발행",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "reissueTransfer",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/{transferId}/reissue",
                "targetLine": 277,
                "methodLine": 278
              }
            ]
          },
          {
            "id": "F07-06:6",
            "label": "POST .../settlement/transfers/{transferId}/writeoff — 상각",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "writeoffTransfer",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/transfers/{transferId}/writeoff",
                "targetLine": 368,
                "methodLine": 369
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-07_remind-extend_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-07_remind-extend/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F07-07:1",
            "label": "POST /api/v1/events/{eventId}/settlement/remind — 미납자 리마인드",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "remindUnpaid",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/remind",
                "targetLine": 380,
                "methodLine": 381
              }
            ]
          },
          {
            "id": "F07-07:2",
            "label": "PATCH /api/v1/events/{eventId}/settlement/extend-deadline — 마감 연장",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "extendDeadline",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/extend-deadline",
                "targetLine": 389,
                "methodLine": 390
              }
            ]
          },
          {
            "id": "F07-07:3",
            "label": "GET /api/v1/events/{eventId}/settlement/remind-history — 리마인드 이력",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getRemindHistory",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/remind-history",
                "targetLine": 397,
                "methodLine": 398
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-08_appeal-audit_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-08_appeal-audit/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F07-08:1",
            "label": "POST /api/v1/events/{eventId}/settlement/appeals — 이의 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "createAppeal",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/settlement/appeals",
                "targetLine": 295,
                "methodLine": 296
              }
            ]
          },
          {
            "id": "F07-08:2",
            "label": "GET /api/v1/events/{eventId}/settlement/appeals — 이의 리스트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getAppeals",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/appeals",
                "targetLine": 306,
                "methodLine": 307
              }
            ]
          },
          {
            "id": "F07-08:3",
            "label": "PATCH /api/v1/events/{eventId}/settlement/appeals/{appealId}/resolve — 이의 처리 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "resolveAppeal",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/settlement/appeals/{appealId}/resolve",
                "targetLine": 317,
                "methodLine": 318
              }
            ]
          },
          {
            "id": "F07-08:4",
            "label": "GET /api/v1/events/{eventId}/settlement/audit-log — 감사 로그",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingSettlementController.java",
                "controller": "MeetingSettlementController",
                "method": "getAuditLog",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/settlement/audit-log",
                "targetLine": 326,
                "methodLine": 327
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-09_prepayment-refund_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-09_prepayment-refund/backend.md",
        "total": 7,
        "verified": 7,
        "retired": 0,
        "entries": [
          {
            "id": "F07-09:1",
            "label": "GET /api/v1/events/{eventId}/prepayments — 선입금 리스트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java",
                "controller": "MeetingPrepaymentController",
                "method": "getPrepayments",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/prepayments",
                "targetLine": 44,
                "methodLine": 45
              }
            ]
          },
          {
            "id": "F07-09:2",
            "label": "POST /api/v1/events/{eventId}/prepayments/pay — 선입금 결제 (참가자)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java",
                "controller": "MeetingPrepaymentController",
                "method": "payPrepayment",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/prepayments/pay",
                "targetLine": 61,
                "methodLine": 62
              }
            ]
          },
          {
            "id": "F07-09:3",
            "label": "PATCH /api/v1/events/{eventId}/prepayments/{id}/confirm — BANK 수동 확인 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java",
                "controller": "MeetingPrepaymentController",
                "method": "confirmBankPrepayment",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/events/{eventId}/prepayments/{id}/confirm",
                "targetLine": 71,
                "methodLine": 72
              }
            ]
          },
          {
            "id": "F07-09:4",
            "label": "POST /api/v1/events/{eventId}/prepayments/{id}/refund — 환불 (참가자 본인)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java",
                "controller": "MeetingPrepaymentController",
                "method": "refundPrepayment",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/prepayments/{id}/refund",
                "targetLine": 79,
                "methodLine": 80
              }
            ]
          },
          {
            "id": "F07-09:5",
            "label": "GET /api/v1/events/{eventId}/prepayments/refund-rules — 환불 규정 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java",
                "controller": "MeetingPrepaymentController",
                "method": "getRefundRules",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/prepayments/refund-rules",
                "targetLine": 92,
                "methodLine": 93
              }
            ]
          },
          {
            "id": "F07-09:6",
            "label": "POST /api/v1/events/{eventId}/prepayments/refund-rules — 환불 규정 저장 (호스트)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/controller/MeetingPrepaymentController.java",
                "controller": "MeetingPrepaymentController",
                "method": "saveRefundRules",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/prepayments/refund-rules",
                "targetLine": 100,
                "methodLine": 101
              }
            ]
          },
          {
            "id": "F07-09:7",
            "label": "가상계좌 입금 통지 — 공급자별 요청과 기존 호환 요청",
            "status": "verified",
            "note": "공급자 코드가 있는 경로는 onDeposit, 옛 고정 주소는 onDepositLegacy가 처리한다. 처리 함수가 없다는 옛 설명도 정정했다.",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/virtualaccount/VirtualAccountWebhookController.java",
                "controller": "VirtualAccountWebhookController",
                "method": "onDeposit",
                "httpMethod": "POST",
                "httpPath": "/webhooks/meeting-settlement/{providerCode}/virtual-account/deposit",
                "targetLine": 52,
                "methodLine": 53
              },
              {
                "targetPath": "community_api/src/main/java/com/endside/community/payment/meeting/virtualaccount/VirtualAccountWebhookController.java",
                "controller": "VirtualAccountWebhookController",
                "method": "onDepositLegacy",
                "httpMethod": "POST",
                "httpPath": "/webhooks/meeting-settlement/virtual-account/deposit",
                "targetLine": 70,
                "methodLine": 71
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/07_meeting_settlement/F07-10_account-history-reputation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/07_meeting_settlement/F07-10_account-history-reputation/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-01_my-plan-list_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-01_my-plan-list/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F08-01:1",
            "label": "GET /api/v1/plans/my/created — 내가 만든 플랜 페이지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/PlanController.java",
                "controller": "PlanController",
                "method": "getMyCreatedPlans",
                "httpMethod": "GET",
                "httpPath": "/api/v1/plans/my/created",
                "targetLine": 164,
                "methodLine": 165
              }
            ]
          },
          {
            "id": "F08-01:2",
            "label": "GET /api/v1/plans/my/purchased — 구매한 플랜 페이지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/PlanController.java",
                "controller": "PlanController",
                "method": "getMyPurchasedPlans",
                "httpMethod": "GET",
                "httpPath": "/api/v1/plans/my/purchased",
                "targetLine": 156,
                "methodLine": 157
              }
            ]
          },
          {
            "id": "F08-01:3",
            "label": "POST /api/v1/plans — DRAFT 플랜 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/PlanController.java",
                "controller": "PlanController",
                "method": "createPlan",
                "httpMethod": "POST",
                "httpPath": "/api/v1/plans",
                "targetLine": 42,
                "methodLine": 43
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-02_plan-detail_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-02_plan-detail/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-03_block-editor_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-03_block-editor/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-04_block-reorder_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-04_block-reorder/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-05_plan-publish_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-05_plan-publish/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-06_market-item-management_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-06_market-item-management/backend.md",
        "total": 6,
        "verified": 6,
        "retired": 0,
        "entries": [
          {
            "id": "F08-06:1",
            "label": "POST /api/v1/market/items — 아이템 등록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java",
                "controller": "MarketItemController",
                "method": "createItem",
                "httpMethod": "POST",
                "httpPath": "/api/v1/market/items",
                "targetLine": 61,
                "methodLine": 62
              }
            ]
          },
          {
            "id": "F08-06:2",
            "label": "PUT /api/v1/market/items/{itemId} — 메타 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java",
                "controller": "MarketItemController",
                "method": "updateItem",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/market/items/{itemId}",
                "targetLine": 69,
                "methodLine": 70
              }
            ]
          },
          {
            "id": "F08-06:3",
            "label": "POST /api/v1/market/items/{itemId}/publish — 판매 시작",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java",
                "controller": "MarketItemController",
                "method": "publishItem",
                "httpMethod": "POST",
                "httpPath": "/api/v1/market/items/{itemId}/publish",
                "targetLine": 77,
                "methodLine": 78
              }
            ]
          },
          {
            "id": "F08-06:4",
            "label": "POST /api/v1/market/items/{itemId}/stop — 판매 중지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java",
                "controller": "MarketItemController",
                "method": "stopSelling",
                "httpMethod": "POST",
                "httpPath": "/api/v1/market/items/{itemId}/stop",
                "targetLine": 91,
                "methodLine": 92
              }
            ]
          },
          {
            "id": "F08-06:5",
            "label": "DELETE /api/v1/market/items/{itemId} — Soft Remove",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java",
                "controller": "MarketItemController",
                "method": "removeItem",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/market/items/{itemId}",
                "targetLine": 111,
                "methodLine": 112
              }
            ]
          },
          {
            "id": "F08-06:6",
            "label": "GET /api/v1/market/items/my — 내 아이템 페이지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java",
                "controller": "MarketItemController",
                "method": "getMyItems",
                "httpMethod": "GET",
                "httpPath": "/api/v1/market/items/my",
                "targetLine": 54,
                "methodLine": 55
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-07_creator-profile-stats_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-07_creator-profile-stats/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F08-07:1",
            "label": "GET /api/v1/creators/{creatorId} — 공개 프로필",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/CreatorController.java",
                "controller": "CreatorController",
                "method": "getCreatorProfile",
                "httpMethod": "GET",
                "httpPath": "/api/v1/creators/{creatorId}",
                "targetLine": 26,
                "methodLine": 27
              }
            ]
          },
          {
            "id": "F08-07:2",
            "label": "GET /api/v1/creators/me/stats — 내 판매 통계",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/CreatorController.java",
                "controller": "CreatorController",
                "method": "getMyStats",
                "httpMethod": "GET",
                "httpPath": "/api/v1/creators/me/stats",
                "targetLine": 33,
                "methodLine": 34
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-08_market-main-browse_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-08_market-main-browse/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F08-08:1",
            "label": "GET /api/v1/market/categories — 카테고리 트리",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketCategoryController.java",
                "controller": "MarketCategoryController",
                "method": "getCategories",
                "httpMethod": "GET",
                "httpPath": "/api/v1/market/categories",
                "targetLine": 25,
                "methodLine": 26
              }
            ]
          },
          {
            "id": "F08-08:2",
            "label": "GET /api/v1/market/items/popular — 인기 아이템",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketSearchController.java",
                "controller": "MarketSearchController",
                "method": "getPopularItems",
                "httpMethod": "GET",
                "httpPath": "/api/v1/market/items/popular",
                "targetLine": 32,
                "methodLine": 33
              }
            ]
          },
          {
            "id": "F08-08:3",
            "label": "GET /api/v1/market/items — 마켓 아이템 목록 (페이지)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemController.java",
                "controller": "MarketItemController",
                "method": "getMarketItems",
                "httpMethod": "GET",
                "httpPath": "/api/v1/market/items",
                "targetLine": 33,
                "methodLine": 34
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-09_market-search_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-09_market-search/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F08-09:1",
            "label": "GET /api/v1/market/search — 마켓 아이템 검색",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketSearchController.java",
                "controller": "MarketSearchController",
                "method": "searchItems",
                "httpMethod": "GET",
                "httpPath": "/api/v1/market/search",
                "targetLine": 27,
                "methodLine": 28
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-10_market-item-detail_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-10_market-item-detail/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-11_purchase_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-11_purchase/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-12_my-collection_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-12_my-collection/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F08-12:1",
            "label": "GET /api/v1/market/collection — 보유함 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/CollectionController.java",
                "controller": "CollectionController",
                "method": "getMyCollection",
                "httpMethod": "GET",
                "httpPath": "/api/v1/market/collection",
                "targetLine": 28,
                "methodLine": 29
              }
            ]
          },
          {
            "id": "F08-12:2",
            "label": "POST /api/v1/market/collection/{id}/activate — 아이템 활성화",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/CollectionController.java",
                "controller": "CollectionController",
                "method": "activateItem",
                "httpMethod": "POST",
                "httpPath": "/api/v1/market/collection/{id}/activate",
                "targetLine": 38,
                "methodLine": 39
              }
            ]
          },
          {
            "id": "F08-12:3",
            "label": "GET /api/v1/market/collection/expiring — 만료 예정 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/CollectionController.java",
                "controller": "CollectionController",
                "method": "getExpiringItems",
                "httpMethod": "GET",
                "httpPath": "/api/v1/market/collection/expiring",
                "targetLine": 46,
                "methodLine": 47
              }
            ]
          },
          {
            "id": "F08-12:4",
            "label": "GET /api/v1/plans/{planId}/preview — 플랜 미리보기",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/PlanController.java",
                "controller": "PlanController",
                "method": "getPreview",
                "httpMethod": "GET",
                "httpPath": "/api/v1/plans/{planId}/preview",
                "targetLine": 67,
                "methodLine": 68
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-13_plan-event-and-review_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 12,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/08_plan_market/F08-13_plan-event-and-review/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F08-13:1",
            "label": "POST /api/v1/plans/{planId}/create-event — 플랜으로 이벤트 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/PlanController.java",
                "controller": "PlanController",
                "method": "createEventFromPlan",
                "httpMethod": "POST",
                "httpPath": "/api/v1/plans/{planId}/create-event",
                "targetLine": 144,
                "methodLine": 145
              }
            ]
          },
          {
            "id": "F08-13:2",
            "label": "POST /api/v1/market/items/{itemId}/reviews — 리뷰 작성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemReviewController.java",
                "controller": "MarketItemReviewController",
                "method": "createReview",
                "httpMethod": "POST",
                "httpPath": "/api/v1/market/items/{itemId}/reviews",
                "targetLine": 29,
                "methodLine": 30
              }
            ]
          },
          {
            "id": "F08-13:3",
            "label": "PUT /api/v1/market/items/{itemId}/reviews/{reviewId} — 리뷰 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemReviewController.java",
                "controller": "MarketItemReviewController",
                "method": "updateReview",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/market/items/{itemId}/reviews/{reviewId}",
                "targetLine": 47,
                "methodLine": 48
              }
            ]
          },
          {
            "id": "F08-13:4",
            "label": "DELETE /api/v1/market/items/{itemId}/reviews/{reviewId} — 리뷰 삭제 (soft)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/plan/controller/MarketItemReviewController.java",
                "controller": "MarketItemReviewController",
                "method": "deleteReview",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/market/items/{itemId}/reviews/{reviewId}",
                "targetLine": 56,
                "methodLine": 57
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-14_purchase-refund_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/08_plan_market/F08-15_creator-earning-coverage_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-01_verification_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-01_verification/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F09-01:1",
            "label": "POST /api/v1/date/verification/request — 인증 URL 발급",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateVerificationController.java",
                "controller": "DateVerificationController",
                "method": "requestVerification",
                "httpMethod": "POST",
                "httpPath": "/api/v1/date/verification/request",
                "targetLine": 39,
                "methodLine": 40
              }
            ]
          },
          {
            "id": "F09-01:2",
            "label": "POST /api/v1/date/verification/verify — 인증 결과 회신",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateVerificationController.java",
                "controller": "DateVerificationController",
                "method": "verify",
                "httpMethod": "POST",
                "httpPath": "/api/v1/date/verification/verify",
                "targetLine": 99,
                "methodLine": 100
              }
            ]
          },
          {
            "id": "F09-01:3",
            "label": "GET /api/v1/date/verification/status — 단건 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateVerificationController.java",
                "controller": "DateVerificationController",
                "method": "getStatus",
                "httpMethod": "GET",
                "httpPath": "/api/v1/date/verification/status",
                "targetLine": 110,
                "methodLine": 111
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-02_profile_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-02_profile/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-03_candidate_swipe_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-03_candidate_swipe/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-04_match_list_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-04_match_list/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F09-04:1",
            "label": "GET /api/v1/date/matches — 매칭 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateMatchController.java",
                "controller": "DateMatchController",
                "method": "getMatches",
                "httpMethod": "GET",
                "httpPath": "/api/v1/date/matches",
                "targetLine": 37,
                "methodLine": 38
              }
            ]
          },
          {
            "id": "F09-04:2",
            "label": "GET /api/v1/date/matches/{matchId} — 매칭 단건",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateMatchController.java",
                "controller": "DateMatchController",
                "method": "getMatch",
                "httpMethod": "GET",
                "httpPath": "/api/v1/date/matches/{matchId}",
                "targetLine": 45,
                "methodLine": 46
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-05_chat_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-05_chat/backend.md",
        "total": 4,
        "verified": 4,
        "retired": 0,
        "entries": [
          {
            "id": "F09-05:1",
            "label": "GET /api/v1/date/chats — 채팅방 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java",
                "controller": "DateChatController",
                "method": "getChatRooms",
                "httpMethod": "GET",
                "httpPath": "/api/v1/date/chats",
                "targetLine": 33,
                "methodLine": 34
              }
            ]
          },
          {
            "id": "F09-05:2",
            "label": "GET /api/v1/date/chats/{roomId}/messages — 메시지 페이지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java",
                "controller": "DateChatController",
                "method": "getMessages",
                "httpMethod": "GET",
                "httpPath": "/api/v1/date/chats/{roomId}/messages",
                "targetLine": 40,
                "methodLine": 41
              }
            ]
          },
          {
            "id": "F09-05:3",
            "label": "POST /api/v1/date/chats/{roomId}/messages — 메시지 전송",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java",
                "controller": "DateChatController",
                "method": "sendMessage",
                "httpMethod": "POST",
                "httpPath": "/api/v1/date/chats/{roomId}/messages",
                "targetLine": 49,
                "methodLine": 50
              }
            ]
          },
          {
            "id": "F09-05:4",
            "label": "PATCH /api/v1/date/chats/{roomId}/read — 읽음 처리",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateChatController.java",
                "controller": "DateChatController",
                "method": "markAsRead",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/date/chats/{roomId}/read",
                "targetLine": 58,
                "methodLine": 59
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-06_meeting_proposal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-06_meeting_proposal/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-07_block_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-07_block/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F09-07:1",
            "label": "GET /api/v1/date/blocks — 차단 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateBlockController.java",
                "controller": "DateBlockController",
                "method": "listBlocks",
                "httpMethod": "GET",
                "httpPath": "/api/v1/date/blocks",
                "targetLine": 29,
                "methodLine": 30
              }
            ]
          },
          {
            "id": "F09-07:2",
            "label": "POST /api/v1/date/blocks/{targetUserId} — 차단",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateBlockController.java",
                "controller": "DateBlockController",
                "method": "blockUser",
                "httpMethod": "POST",
                "httpPath": "/api/v1/date/blocks/{targetUserId}",
                "targetLine": 50,
                "methodLine": 51
              }
            ]
          },
          {
            "id": "F09-07:3",
            "label": "DELETE /api/v1/date/blocks/{targetUserId} — 차단 해제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateBlockController.java",
                "controller": "DateBlockController",
                "method": "unblockUser",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/date/blocks/{targetUserId}",
                "targetLine": 69,
                "methodLine": 70
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/09_private_date/F09-08_profile_views_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/09_private_date/F09-08_profile_views/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F09-08:1",
            "label": "GET /api/v1/date/profile/views — 조회 이력 페이지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/privatedate/controller/DateProfileController.java",
                "controller": "DateProfileController",
                "method": "getProfileViews",
                "httpMethod": "GET",
                "httpPath": "/api/v1/date/profile/views",
                "targetLine": 86,
                "methodLine": 87
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/10_calendar/F10-01_unified-calendar-view_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-01_unified-calendar-view/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F10-01:1",
            "label": "GET /api/v1/calendar/monthly — 월간 통합 캘린더",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/CalendarIntegrationController.java",
                "controller": "CalendarIntegrationController",
                "method": "getMonthlyCalendar",
                "httpMethod": "GET",
                "httpPath": "/api/v1/calendar/monthly",
                "targetLine": 33,
                "methodLine": 34
              }
            ]
          },
          {
            "id": "F10-01:2",
            "label": "GET /api/v1/calendar/daily — 일간 통합 캘린더",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/CalendarIntegrationController.java",
                "controller": "CalendarIntegrationController",
                "method": "getDailyCalendar",
                "httpMethod": "GET",
                "httpPath": "/api/v1/calendar/daily",
                "targetLine": 42,
                "methodLine": 43
              }
            ]
          },
          {
            "id": "F10-01:3",
            "label": "GET /api/v1/calendar/range — 임의 기간 통합 캘린더",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/CalendarIntegrationController.java",
                "controller": "CalendarIntegrationController",
                "method": "getRangeCalendar",
                "httpMethod": "GET",
                "httpPath": "/api/v1/calendar/range",
                "targetLine": 50,
                "methodLine": 51
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/10_calendar/F10-02_calendar-item-routing_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-02_calendar-item-routing/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/10_calendar/F10-03_single-availability-crud_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-03_single-availability-crud/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F10-03:1",
            "label": "POST /api/v1/availability — 단일 가용성 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "createAvailability",
                "httpMethod": "POST",
                "httpPath": "/api/v1/availability",
                "targetLine": 39,
                "methodLine": 40
              }
            ]
          },
          {
            "id": "F10-03:2",
            "label": "GET /api/v1/availability — 본인 가용성 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "getAvailabilities",
                "httpMethod": "GET",
                "httpPath": "/api/v1/availability",
                "targetLine": 50,
                "methodLine": 51
              }
            ]
          },
          {
            "id": "F10-03:3",
            "label": "GET /api/v1/availability/{id} — 단건 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "getAvailability",
                "httpMethod": "GET",
                "httpPath": "/api/v1/availability/{id}",
                "targetLine": 69,
                "methodLine": 70
              }
            ]
          },
          {
            "id": "F10-03:4",
            "label": "PATCH /api/v1/availability/{id} — 단건 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "updateAvailability",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/availability/{id}",
                "targetLine": 88,
                "methodLine": 89
              }
            ]
          },
          {
            "id": "F10-03:5",
            "label": "DELETE /api/v1/availability/{id}?force= — 단건 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "deleteAvailability",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/availability/{id}",
                "targetLine": 97,
                "methodLine": 98
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/10_calendar/F10-04_recurring-availability-rule_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-04_recurring-availability-rule/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F10-04:1",
            "label": "POST /api/v1/availability/recurring — 반복 규칙 생성",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "createRecurringAvailability",
                "httpMethod": "POST",
                "httpPath": "/api/v1/availability/recurring",
                "targetLine": 106,
                "methodLine": 107
              }
            ]
          },
          {
            "id": "F10-04:2",
            "label": "GET /api/v1/availability/recurring/{ruleId} — 규칙 단건 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "getRecurrenceRule",
                "httpMethod": "GET",
                "httpPath": "/api/v1/availability/recurring/{ruleId}",
                "targetLine": 114,
                "methodLine": 115
              }
            ]
          },
          {
            "id": "F10-04:3",
            "label": "PATCH /api/v1/availability/recurring/{ruleId} — 규칙 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "updateRecurrenceRule",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/availability/recurring/{ruleId}",
                "targetLine": 122,
                "methodLine": 123
              }
            ]
          },
          {
            "id": "F10-04:4",
            "label": "DELETE /api/v1/availability/recurring/{ruleId} — 규칙 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "deleteRecurrenceRule",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/availability/recurring/{ruleId}",
                "targetLine": 131,
                "methodLine": 132
              }
            ]
          },
          {
            "id": "F10-04:5",
            "label": "GET /api/v1/availability/expand?ruleId=&from=&to= — 펼침 미리보기",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/calendar/controller/AvailabilityController.java",
                "controller": "AvailabilityController",
                "method": "expandRecurrence",
                "httpMethod": "GET",
                "httpPath": "/api/v1/availability/expand",
                "targetLine": 142,
                "methodLine": 143
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/10_calendar/F10-05_other-user-availability_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/10_calendar/F10-05_other-user-availability/backend.md",
        "total": 2,
        "verified": 0,
        "retired": 2,
        "entries": [
          {
            "id": "F10-05:1",
            "label": "GET /api/v1/users/{userId}/availabilities/public — 공개 가용성 조회",
            "status": "retired",
            "note": "개인 가용시간은 본인만 관리하기로 결정해 타인 조회 기능과 서버 파일을 제거했다. 복구 대상이 아니다.",
            "endpoints": []
          },
          {
            "id": "F10-05:2",
            "label": "GET /api/v1/users/{userId}/availabilities/friends — 친구 가용성 조회",
            "status": "retired",
            "note": "개인 가용시간은 본인만 관리하기로 결정해 타인 조회 기능과 서버 파일을 제거했다. 복구 대상이 아니다.",
            "endpoints": []
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/11_review_report/F11-01_event-review-write_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-01_event-review-write/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/11_review_report/F11-02_review-list_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-02_review-list/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F11-02:1",
            "label": "GET /api/v1/events/{eventId}/reviews — 이벤트 리뷰 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/review/controller/ReviewController.java",
                "controller": "ReviewController",
                "method": "getReviewsByEvent",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/reviews",
                "targetLine": 44,
                "methodLine": 45
              }
            ]
          },
          {
            "id": "F11-02:2",
            "label": "GET /api/v1/users/{userId}/reviews — 사용자가 받은 리뷰 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/review/controller/ReviewController.java",
                "controller": "ReviewController",
                "method": "getReviewsByUser",
                "httpMethod": "GET",
                "httpPath": "/api/v1/users/{userId}/reviews",
                "targetLine": 52,
                "methodLine": 53
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/11_review_report/F11-03_review-edit-delete_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-03_review-edit-delete/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F11-03:1",
            "label": "PATCH /api/v1/reviews/{id} — 리뷰 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/review/controller/ReviewController.java",
                "controller": "ReviewController",
                "method": "updateReview",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/reviews/{id}",
                "targetLine": 60,
                "methodLine": 61
              }
            ]
          },
          {
            "id": "F11-03:2",
            "label": "DELETE /api/v1/reviews/{reviewId} — 리뷰 삭제 (soft)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/review/controller/ReviewController.java",
                "controller": "ReviewController",
                "method": "deleteReview",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/reviews/{reviewId}",
                "targetLine": 69,
                "methodLine": 70
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/11_review_report/F11-04_report_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-04_report/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F11-04:1",
            "label": "POST /api/v1/reports — 신고 접수",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/review/controller/ReportController.java",
                "controller": "ReportController",
                "method": "createReport",
                "httpMethod": "POST",
                "httpPath": "/api/v1/reports",
                "targetLine": 38,
                "methodLine": 39
              }
            ]
          },
          {
            "id": "F11-04:2",
            "label": "GET /api/v1/reports/my — 내가 접수한 신고 목록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/review/controller/ReportController.java",
                "controller": "ReportController",
                "method": "getMyReports",
                "httpMethod": "GET",
                "httpPath": "/api/v1/reports/my",
                "targetLine": 46,
                "methodLine": 47
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/11_review_report/F11-05_trust-score_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-05_trust-score/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/11_review_report/F11-06_taste-profile_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 11,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/11_review_report/F11-06_taste-profile/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/11_review_report/F11-07_review-moderation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/12_notification/F12-01_notification-list-read_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-01_notification-list-read/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F12-01:1",
            "label": "GET /api/v1/notifications — 알림 목록 페이지 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "getNotifications",
                "httpMethod": "GET",
                "httpPath": "/api/v1/notifications",
                "targetLine": 35,
                "methodLine": 36
              }
            ]
          },
          {
            "id": "F12-01:2",
            "label": "GET /api/v1/notifications/unread-count — 미읽음 수 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "getUnreadCount",
                "httpMethod": "GET",
                "httpPath": "/api/v1/notifications/unread-count",
                "targetLine": 52,
                "methodLine": 53
              }
            ]
          },
          {
            "id": "F12-01:3",
            "label": "PATCH /api/v1/notifications/{notificationId}/read — 개별 읽음 처리",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "markAsRead",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/notifications/{notificationId}/read",
                "targetLine": 58,
                "methodLine": 59
              }
            ]
          },
          {
            "id": "F12-01:4",
            "label": "PATCH /api/v1/notifications/read-all — 전체 읽음 처리",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "markAllAsRead",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/notifications/read-all",
                "targetLine": 66,
                "methodLine": 67
              }
            ]
          },
          {
            "id": "F12-01:5",
            "label": "DELETE /api/v1/notifications/{notificationId} — 개별 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "deleteNotification",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/notifications/{notificationId}",
                "targetLine": 73,
                "methodLine": 74
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/12_notification/F12-02_notification-grouped-badge_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-02_notification-grouped-badge/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F12-02:1",
            "label": "GET /api/v1/notifications/grouped — 그룹 카드 리스트",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "getGroupedNotifications",
                "httpMethod": "GET",
                "httpPath": "/api/v1/notifications/grouped",
                "targetLine": 43,
                "methodLine": 44
              }
            ]
          },
          {
            "id": "F12-02:2",
            "label": "GET /api/v1/notifications/unread-count — 하단 탭 배지 데이터원",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "getUnreadCount",
                "httpMethod": "GET",
                "httpPath": "/api/v1/notifications/unread-count",
                "targetLine": 52,
                "methodLine": 53
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/12_notification/F12-03_category-settings_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-03_category-settings/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F12-03:1",
            "label": "GET /api/v1/notifications/settings — 전체 설정 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "getSettings",
                "httpMethod": "GET",
                "httpPath": "/api/v1/notifications/settings",
                "targetLine": 81,
                "methodLine": 82
              }
            ]
          },
          {
            "id": "F12-03:2",
            "label": "PATCH /api/v1/notifications/settings — 단일 type 토글 변경",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "updateSettings",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/notifications/settings",
                "targetLine": 99,
                "methodLine": 100
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/12_notification/F12-04_quiet-hours_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-04_quiet-hours/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F12-04:1",
            "label": "GET /api/v1/notifications/settings/quiet-hours — 방해금지 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "getQuietHours",
                "httpMethod": "GET",
                "httpPath": "/api/v1/notifications/settings/quiet-hours",
                "targetLine": 107,
                "methodLine": 108
              }
            ]
          },
          {
            "id": "F12-04:2",
            "label": "PUT /api/v1/notifications/settings/quiet-hours — 방해금지 저장 (upsert)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/NotificationController.java",
                "controller": "NotificationController",
                "method": "updateQuietHours",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/notifications/settings/quiet-hours",
                "targetLine": 113,
                "methodLine": 114
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/12_notification/F12-05_device-token-management_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-05_device-token-management/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F12-05:1",
            "label": "GET /api/v1/device-tokens — 내 기기 목록 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java",
                "controller": "DeviceTokenController",
                "method": "getMyDevices",
                "httpMethod": "GET",
                "httpPath": "/api/v1/device-tokens",
                "targetLine": 29,
                "methodLine": 30
              }
            ]
          },
          {
            "id": "F12-05:2",
            "label": "POST /api/v1/device-tokens — 신규 토큰 등록",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java",
                "controller": "DeviceTokenController",
                "method": "registerToken",
                "httpMethod": "POST",
                "httpPath": "/api/v1/device-tokens",
                "targetLine": 35,
                "methodLine": 36
              }
            ]
          },
          {
            "id": "F12-05:3",
            "label": "PUT /api/v1/device-tokens/token — 토큰 갱신 (atomic 교체)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java",
                "controller": "DeviceTokenController",
                "method": "refreshToken",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/device-tokens/token",
                "targetLine": 43,
                "methodLine": 44
              }
            ]
          },
          {
            "id": "F12-05:4",
            "label": "DELETE /api/v1/device-tokens/{deviceId} — 기기 ID로 비활성화",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java",
                "controller": "DeviceTokenController",
                "method": "removeDevice",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/device-tokens/{deviceId}",
                "targetLine": 51,
                "methodLine": 52
              }
            ]
          },
          {
            "id": "F12-05:5",
            "label": "DELETE /api/v1/device-tokens?token=xxx — 토큰 문자열로 비활성화 (로그아웃 시)",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/notification/controller/DeviceTokenController.java",
                "controller": "DeviceTokenController",
                "method": "removeToken",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/device-tokens",
                "targetLine": 59,
                "methodLine": 60
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/12_notification/F12-06_permission-banner_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 6,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/12_notification/F12-06_permission-banner/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/13_profile_settings/F13-01_profile-hub_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-01_profile-hub/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/13_profile_settings/F13-02_profile-edit_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-02_profile-edit/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F13-02:1",
            "label": "PATCH /api/v1/users/me — 내 프로필 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserController.java",
                "controller": "UserController",
                "method": "updateMyProfile",
                "httpMethod": "PATCH",
                "httpPath": "/api/v1/users/me",
                "targetLine": 66,
                "methodLine": 67
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/13_profile_settings/F13-03_address-management_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-03_address-management/backend.md",
        "total": 5,
        "verified": 5,
        "retired": 0,
        "entries": [
          {
            "id": "F13-03:1",
            "label": "GET /api/v1/users/me/addresses — 내 주소 목록 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java",
                "controller": "UserAddressController",
                "method": "getAddresses",
                "httpMethod": "GET",
                "httpPath": "/api/v1/users/me/addresses",
                "targetLine": 30,
                "methodLine": 31
              }
            ]
          },
          {
            "id": "F13-03:2",
            "label": "GET /api/v1/users/me/addresses/{addressId} — 주소 단건 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java",
                "controller": "UserAddressController",
                "method": "getAddress",
                "httpMethod": "GET",
                "httpPath": "/api/v1/users/me/addresses/{addressId}",
                "targetLine": 36,
                "methodLine": 37
              }
            ]
          },
          {
            "id": "F13-03:3",
            "label": "POST /api/v1/users/me/addresses — 주소 추가",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java",
                "controller": "UserAddressController",
                "method": "createAddress",
                "httpMethod": "POST",
                "httpPath": "/api/v1/users/me/addresses",
                "targetLine": 43,
                "methodLine": 44
              }
            ]
          },
          {
            "id": "F13-03:4",
            "label": "PUT /api/v1/users/me/addresses/{addressId} — 주소 수정",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java",
                "controller": "UserAddressController",
                "method": "updateAddress",
                "httpMethod": "PUT",
                "httpPath": "/api/v1/users/me/addresses/{addressId}",
                "targetLine": 51,
                "methodLine": 52
              }
            ]
          },
          {
            "id": "F13-03:5",
            "label": "DELETE /api/v1/users/me/addresses/{addressId} — 주소 삭제",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserAddressController.java",
                "controller": "UserAddressController",
                "method": "deleteAddress",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/users/me/addresses/{addressId}",
                "targetLine": 59,
                "methodLine": 60
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/13_profile_settings/F13-04_preference-tags_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-04_preference-tags/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/13_profile_settings/F13-05_data-export_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-05_data-export/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/13_profile_settings/F13-06_account-deletion_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 13,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-06_account-deletion/backend.md",
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/13_profile_settings/F13-07_account-deactivation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 5,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/13_profile_settings/F13-07_account-deactivation/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F13-07:1",
            "label": "GET /api/v1/users/me/deactivation-check — 탈퇴 가능 여부 점검",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserController.java",
                "controller": "UserController",
                "method": "checkDeactivation",
                "httpMethod": "GET",
                "httpPath": "/api/v1/users/me/deactivation-check",
                "targetLine": 74,
                "methodLine": 75
              }
            ]
          },
          {
            "id": "F13-07:2",
            "label": "DELETE /api/v1/users/me — 계정 즉시 비활성화",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/account/controller/UserController.java",
                "controller": "UserController",
                "method": "deleteMyAccount",
                "httpMethod": "DELETE",
                "httpPath": "/api/v1/users/me",
                "targetLine": 80,
                "methodLine": 81
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/14_location_directions/F14-01_event-location-share_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 7,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-01_event-location-share/backend.md",
        "total": 3,
        "verified": 3,
        "retired": 0,
        "entries": [
          {
            "id": "F14-01:1",
            "label": "POST /api/v1/events/{eventId}/location/opt-in — 위치 공유 시작",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/LocationController.java",
                "controller": "LocationController",
                "method": "optIn",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/location/opt-in",
                "targetLine": 31,
                "methodLine": 32
              }
            ]
          },
          {
            "id": "F14-01:2",
            "label": "POST /api/v1/events/{eventId}/location/update — 내 위치 좌표 갱신",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/LocationController.java",
                "controller": "LocationController",
                "method": "updateLocation",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/location/update",
                "targetLine": 47,
                "methodLine": 48
              }
            ]
          },
          {
            "id": "F14-01:3",
            "label": "GET /api/v1/events/{eventId}/location — 이벤트 참석자 위치 목록 조회",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/LocationController.java",
                "controller": "LocationController",
                "method": "getEventLocations",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/location",
                "targetLine": 56,
                "methodLine": 57
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/14_location_directions/F14-02_location-opt-out_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-02_location-opt-out/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F14-02:1",
            "label": "POST /api/v1/events/{eventId}/location/opt-out — 위치 공유 중지",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/LocationController.java",
                "controller": "LocationController",
                "method": "optOut",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/location/opt-out",
                "targetLine": 39,
                "methodLine": 40
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/14_location_directions/F14-03_location-extend_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-03_location-extend/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F14-03:1",
            "label": "POST /api/v1/events/{eventId}/location/extend — 위치 공유 만료 연장",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/LocationController.java",
                "controller": "LocationController",
                "method": "extendShare",
                "httpMethod": "POST",
                "httpPath": "/api/v1/events/{eventId}/location/extend",
                "targetLine": 75,
                "methodLine": 76
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/14_location_directions/F14-04_location-privacy-dashboard_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 10,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-04_location-privacy-dashboard/backend.md",
        "total": 1,
        "verified": 1,
        "retired": 0,
        "entries": [
          {
            "id": "F14-04:1",
            "label": "GET /api/v1/events/{eventId}/location/privacy — 위치 프라이버시 대시보드",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/LocationController.java",
                "controller": "LocationController",
                "method": "getPrivacyDashboard",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/location/privacy",
                "targetLine": 64,
                "methodLine": 65
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/14_location_directions/F14-05_event-directions_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 9,
        "registeredCountMatches": true
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-05_event-directions/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F14-05:1",
            "label": "GET /api/v1/events/{eventId}/directions — 길찾기",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/directions/controller/DirectionsController.java",
                "controller": "DirectionsController",
                "method": "getDirections",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/directions",
                "targetLine": 29,
                "methodLine": 30
              }
            ]
          },
          {
            "id": "F14-05:2",
            "label": "GET /api/v1/events/{eventId}/attendees/distances — 참석자별 거리",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/directions/controller/DirectionsController.java",
                "controller": "DirectionsController",
                "method": "getAttendeeDistances",
                "httpMethod": "GET",
                "httpPath": "/api/v1/events/{eventId}/attendees/distances",
                "targetLine": 37,
                "methodLine": 38
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/14_location_directions/F14-06_reverse-geocoding_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": 8,
        "registeredCountMatches": false
      },
      "trace": {
        "backendPath": "business_logic/units/14_location_directions/F14-06_reverse-geocoding/backend.md",
        "total": 2,
        "verified": 2,
        "retired": 0,
        "entries": [
          {
            "id": "F14-06:1",
            "label": "GET /api/v1/location/reverse-geocode — 좌표 → 주소",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/GeocodingController.java",
                "controller": "GeocodingController",
                "method": "reverseGeocode",
                "httpMethod": "GET",
                "httpPath": "/api/v1/location/reverse-geocode",
                "targetLine": 27,
                "methodLine": 28
              }
            ]
          },
          {
            "id": "F14-06:2",
            "label": "GET /api/v1/location/geocode — 주소 → 좌표",
            "status": "verified",
            "note": "",
            "endpoints": [
              {
                "targetPath": "community_api/src/main/java/com/endside/community/location/controller/GeocodingController.java",
                "controller": "GeocodingController",
                "method": "geocode",
                "httpMethod": "GET",
                "httpPath": "/api/v1/location/geocode",
                "targetLine": 34,
                "methodLine": 35
              }
            ]
          }
        ]
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-01_warning-overview-ledger_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-02_report-submit-manage_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-03_appeal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-04_policy-penalty-types_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-05_report-review_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-06_grant-ledger-adjust_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-07_appeal-resolve_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-08_sanction-enforcement_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/15_warning/F15-09_queue-dashboard-audit_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-01_my-mileage-main_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "id": "F16-02",
      "domain": "마일리지",
      "name": "등급·배지·랭킹·프로필 카드",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-02_grade-badge-ranking_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "id": "F16-03",
      "domain": "마일리지",
      "name": "시즌 (목록·과거 랭킹·내 스냅샷)",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-03_season_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-03_season_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "proof": "local",
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-04_policy-config_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "id": "F16-05",
      "domain": "마일리지",
      "name": "적립규칙·등급·배지·교환 프리셋 관리",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-05_policy-presets_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-05_policy-presets_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "id": "F16-06",
      "domain": "마일리지",
      "name": "적립/차감/정정 집행",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-06_grant-redeem-reverse_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "id": "F16-07",
      "domain": "마일리지",
      "name": "호스트 제안",
      "scenarioCount": 6,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-07_host-proposal_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-07_host-proposal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "id": "F16-08",
      "domain": "마일리지",
      "name": "검토 큐 & 대시보드/감사로그",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/16_mileage/F16-08_review-queue-dashboard_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "id": "F17-01",
      "domain": "정기모임",
      "name": "정기모임 발견·탐색",
      "scenarioCount": 5,
      "scenarioSource": "기능 PRD 수용 시나리오",
      "scenarioPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md",
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-01_regular-meeting-discovery_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-02_regular-meeting-detail_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-03_regular-meeting-creation_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-04_regular-meeting-lifecycle_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-05_regular-meeting-sessions_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-06_regular-meeting-enrollment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-07_regular-meeting-payment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-08_regular-meeting-refund_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-09_regular-meeting-attendance_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/17_regular_meeting/F17-10_regular-meeting-settlement_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-01_unified-dispute-case_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-02_dispute-create_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-03_dispute-appeal_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-04_evidence-visibility_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/18_dispute_resolution/F18-05_host-inbox_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/19_favorite/F19-01_favorite-manage_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/19_favorite/F19-02_favorite-calendar_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/19_favorite/F19-03_privacy-visibility-settings_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/20_support/F20-01_inquiry_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/20_support/F20-02_operational-issue_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/20_support/F20-03_support-faq_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/21_curated/F21-01_provider-assignment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "launchScope": "sealed",
      "proof": "local",
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/21_curated/F21-02_participant-fee-charge_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/21_curated/F21-03_provider-settlement_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/21_curated/F21-04_free-invite-host-subsidy_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/21_curated/F21-05_refund-clawback_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/21_curated/F21-06_engagement-prepayment_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
      "publishedDocumentPath": "business_logic/prd/02_feature_prds/21_curated/F21-07_regular-meeting-bulk_prd.md",
      "scenarioDefinition": {
        "formal": true,
        "documentScenarioCount": null,
        "registeredCountMatches": null
      },
      "trace": {
        "backendPath": null,
        "total": 0,
        "verified": 0,
        "retired": 0,
        "entries": []
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
