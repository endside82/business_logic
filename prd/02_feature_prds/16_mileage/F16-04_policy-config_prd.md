# F16-04. 마일리지 제도 설정·변경 미리보기 PRD

<!-- release-document: reference -->
> **문서 구분: 기능·설계·절차 참고 문서.** 2026-11-22 현재 소스 계약을 대조했다. 새 제품 실행·외부 인증·실기기 확인 기록은 아니다. 실행 순서는 [앞으로 할 일](../../../../docs/plan/NEXT_WORK.md)을 따른다.

## 현재 범위와 정정

POLICY_OWNER가 제도 상태·만료 일수·랭킹 기준·시즌 사용을 조회하고 부분 변경한다. 상태는 NOT_STARTED/ACTIVE/PAUSED이며 옛 active=true/false 요청으로 설명하지 않는다. 현재 설정 조회는 저장된 행을 요구한다. 없으면 MILEAGE_PROGRAM_CONFIG_MISSING 오류와 무결성 사건을 남기며 조회 중 자동 생성하지 않는다.

새 클럽용 생성 함수의 기본값은 NOT_STARTED, expiryDays=365, rankingBasis=BALANCE, seasonEnabled=false다. 기본 적립 규칙은 **최초 NOT_STARTED → ACTIVE 전환에서** 없는 트리거만 보충한다. 설정 조회·생성 때 항상 규칙을 시딩한다는 과거 설명과 구분한다.

## 현재 서버 계약

공통 접두사는 `/api/v1/admin/clubs/{clubId}/mileage`이며 POLICY_OWNER와 MILEAGE 공개 범위를 적용한다.

| 요청 | 현재 응답·입력 |
|---|---|
| GET /config | `MileageProgramConfigVo`, 기존 설정 필요 |
| PUT /config | `MileageProgramConfigModParam`의 programStatus/expiryDays/rankingBasis/seasonEnabled/reauthentication을 받고 갱신 VO 반환 |
| GET /config/preview | changeType/value query를 받아 **MileageConfigPreviewVo** 반환 |

부분 갱신 필드는 nullable이다. 음수 expiryDays는 INVALID_INPUT이다. 상태는 NOT_STARTED → ACTIVE, ACTIVE → PAUSED, PAUSED → ACTIVE만 허용하며 NOT_STARTED로 되돌릴 수 없다. 현재와 같은 상태나 null은 실제 전이가 아니다.

명령 서비스는 상태가 바뀌는 요청에 본인 재인증을 수행한다. 실제 변경 서비스는 설정 잠금 뒤 전이를 다시 계산하고 재인증 사용자 일치를 확인한다. 일반 정책 필드 변경과 같은 상태 재요청에는 상태 전이용 재인증을 요구하지 않는다. 저장은 정책 감사 기록, 실제 상태 전이 감사 기록, PolicyChanged outbox를 남긴다.

## 기본 규칙과 상태의 의미

최초 활성화 기본 규칙은 체크인 10점 켜짐, 후기 5점 켜짐/기한 7일, 사진 승인 3점 꺼짐/자동 승인 꺼짐이다. 기존 트리거 규칙은 덮어쓰지 않는다. 규칙 중복 생성·버전 변경·사진 공개 범위는 [적립 규칙·등급·배지·차감 사유·시즌 관리](F16-05_policy-presets_prd.md)를 따른다.

새 적립·사용·제안의 활성 상태 검사는 ACTIVE만 통과시킨다. PAUSED는 기존 조회 결과를 없애지 않는다. 만료 루프와 회원별 만료 워커는 이 활성 상태 검사를 호출하지 않고 원래 만료 대상의 처리를 이어 간다. 상태를 멈췄다고 발급된 적립의 만료일이 연장되는 것은 아니다.

만료 기간 변경 안내는 새 적립에만 적용되고 기존 발급분에는 소급하지 않는다고 설명한다. UI의 시즌 사용 토글과 MILEAGE_SEASON 공개 범위는 별개다. 현재 시즌 전이 worker는 공개 범위를 확인하지만 seasonEnabled 값으로 모든 전이를 중단하는 추가 검사로 구현돼 있지는 않다. 토글 하나로 시즌 업무 전체가 차단된다고 보장하지 않는다.

## 변경 미리보기의 의미

| changeType | 현재 결과 |
|---|---|
| EXPIRY_DAYS | 현재/새 만료값과 NO_RETROACTIVE_APPLICATION, 예상 영향 0 |
| TRIGGER_OFF | 해당 조건의 앞으로 적립 중단 안내와 FUTURE_EARN_DISABLED |
| GRADE_THRESHOLD | 현재 등급 정의에 대한 요약 회원 수·등급 분포. 10만 명 이상은 분포 생략 경고 |
| BIG_BATCH_BULK | value를 인원 수로 해석. 50명 이상 경고, 잘못된 숫자는 INVALID_VALUE 경고 |
| 알 수 없는 유형 | UNKNOWN_CHANGE_TYPE 경고 |

등급 분포는 현재 기준의 threshold별 DB 집계 결과로 구성한다. ‘바꾸려는 모든 새 등급 기준을 적용한 시뮬레이션’ 응답은 아니다. 예상 인원 50명 이상과 10만 명 이상 분포 생략의 의미도 다르다.

앱·서버 모두 전용 MileageConfigPreviewVo를 사용하며 dialog → repository/API로 changeType/value를 실제 전달한다. 과거 dynamic 모델·query 전달 누락 의심은 현재 문제로 유지하지 않는다. 미리보기는 저장을 수행하지 않는다.

## 앱 행동·실패·복귀

상태 변경은 본인 재인증 dialog를 거쳐 programStatus와 reauthentication을 함께 전송한다. 설정을 보내기 직전 현재 정책 권한을 확인하고 보내는 동안 중복 동작을 제한한다. 입력 저장 실패는 오류를 표시하고 입력 창을 유지하며 성공하면 닫는다.

만료 일수 0은 ‘만료 없음’으로 표시한다. 현재 만료 입력은 정수 해석에 실패하면 기존 값을 사용하고 값이 같으면 저장 없이 닫으므로, 잘못된 입력이 명시적 오류로 안내되는 흐름과 다르다. 미리보기 입력은 반대로 숫자 범위(만료 0 이상, 일괄 인원 1 이상)를 검증한다. 규칙 끄기 미리보기는 조회된 실제 트리거를 선택해야 한다.

시즌이 공개되지 않으면 시즌 사용 스위치 대신 안내 입구를 표시한다. 공개 랭킹 기준 변경과 회원 랭킹 화면의 BALANCE 초기 선택은 별개다. 후자는 [등급·배지·랭킹·프로필 카드](F16-02_grade-badge-ranking_prd.md)의 현재 제한을 따른다.

## 코드 위치

서버: MileageAdminPolicyController, MileageProgramConfigCommandService, MileageProgramConfigService, MileageProgramStatus, MileageProgramConfigModParam, MileageEarningRuleService, MileageExpireLoop/Worker, MileageSeasonTransitionWorker. 앱: mileage_admin_policy_api.dart, mileage_config_preview_vo.dart, mileage_policy_screen.dart, mileage_config_preview_dialog.dart.

<!-- source-references:start -->
서버 창구: `MileageAdminPolicyController#getConfig`, `MileageAdminPolicyController#updateConfig`, `MileageAdminPolicyController#getConfigPreview`. 함수·주소 대조는 `verification/source_reference_targets.json` 이 한다.
<!-- source-references:end -->

## 현재 제한과 확인 범위

| 분류 | 현재 경계 | 문서 처리 |
|---|---|---|
| Risk | 설정 행 누락은 읽기 중 자동 복구되지 않고 오류다. | 정상 초기값과 무결성 장애를 구분한다. |
| Gap | 만료 일수의 정수 해석 실패가 기존 값/저장 생략으로 처리된다. | 미리보기의 명시적 입력 오류와 같다고 설명하지 않는다. |
| Risk | 미리보기는 현재 분포와 일부 정적 영향 안내이며 10만 명 이상 분포를 생략한다. | 정밀한 변경 후 결과 예측으로 보장하지 않는다. |
| Risk | seasonEnabled와 시즌 공개 범위/전이 검사는 동일 게이트가 아니다. | 토글만으로 전체 시즌 정지를 보장하지 않는다. |
| 미검증 | 재인증 공급자·권한 변경 경합·실제 저장·만료 실행은 확인하지 않았다. | 소스 대조를 외부 인증/운영 시험 통과로 확대하지 않는다. |

## 수용 기준과 검증 근거

- **AC-01 생성과 조회:** 새 클럽 기본값과 조회 중 누락 오류를 구분한다.
- **AC-02 상태 전이:** 허용된 세 전이와 동일 상태/미지정 요청을 구분한다.
- **AC-03 재인증:** 실제 상태 변경에 본인 재인증을 수행하고 잠금 뒤 다시 확인한다.
- **AC-04 기본 규칙:** 최초 활성화 때 없는 기본 트리거만 보충하고 기존 설정을 유지한다.
- **AC-05 기존 기록:** 중지와 기존 조회/만료를 구분하며 만료 기간 변경의 소급을 약속하지 않는다.
- **AC-06 미리보기:** 전용 응답과 실제 query 전달, 현재 분포·대규모 생략·정적 경고의 범위를 설명한다.
- **AC-07 입력과 복귀:** 실패 시 입력 유지와 만료 숫자 해석의 현재 차이를 명시한다.
- **AC-08 시즌 경계:** 시즌 사용 값·공개 범위·전이 worker의 검사 범위를 구분한다.

이번 확인은 소스 계약의 문서 대조다. 새 제품 시험·재인증 실행·브라우저/실기기 검수는 수행하지 않았다.
