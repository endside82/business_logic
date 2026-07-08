# 릴리즈 준비 체크리스트

<!-- supporting-doc-status: 2026-05-18 -->

> 문서 상태: **보조 문서**. 기능별 현재 계약, source trace, Gap/Risk 판단은 [PRD_MIGRATION_STATUS.md](../PRD_MIGRATION_STATUS.md)와 각 기능 PRD를 우선한다. 이 문서는 인벤토리, 정책, QA, 기획 운영 기준을 보조하며, 기능 세부 판단은 [FEATURE_PRD_STANDARD.md](../FEATURE_PRD_STANDARD.md) 기준으로 재확인한다.
>
> 2026-07-08 current QA 기준: `community_app/docs/testing/SCENARIO_TEST_STATUS_CURRENT.md` 기준 canonical 53개 scenario는 53/53 close, active pending-run/merge/gap은 0이다. P83 communication runner는 별도 존재하지만 current 53/53 canonical에는 아직 포함하지 않는다.

## 1. 기능 범위

- [ ] 이번 릴리즈에 포함되는 기능 ID를 175개 인벤토리 기준으로 표시했다.
- [ ] 제외되는 기능과 이유를 명시했다.
- [ ] P0/P1/P2 우선순위를 정했다.

## 2. 사용자 흐름

- [ ] 신규 사용자 가입/온보딩 흐름이 깨지지 않는다.
- [ ] 홈/검색에서 핵심 콘텐츠로 진입할 수 있다.
- [ ] 이벤트 신청, 클럽 가입, 플랜 구매, 데이팅 매칭 중 릴리즈 대상 흐름이 QA됐다.
- [ ] 게스트 동반 예매 대상 릴리즈라면 신청/체크인/노쇼/환불에서 owner와 guest attendance row가 구분된다.

## 3. 상태와 권한

- [ ] 권한 없는 사용자의 버튼 노출/비활성/에러 정책이 정해졌다.
- [ ] 취소, 만료, 삭제, 차단 상태의 fallback이 정해졌다.
- [ ] 멀티 디바이스와 중복 클릭 케이스가 QA됐다.

## 4. 돈과 알림

- [ ] 결제 성공/실패/환불/거래내역이 일관된다.
- [ ] 정산 DRAFT/ACTIVE/COMPLETED/CANCELLED 상태가 분리되어 보인다.
- [ ] 알림 수신자, 딥링크, 카테고리 설정, 방해금지 정책이 QA됐다.

## 5. 개인정보와 안전

- [ ] 위치 공유 opt-in/out이 명확하다.
- [ ] 위치 공유의 실제 GPS 주기 업로드 완료, live 지도 키 readiness, staging 실증 완료를 검증 없이 완료로 쓰지 않는다.
- [ ] 데이팅 차단과 신고가 관련 화면에 즉시 반영된다.
- [ ] 데이터 내보내기, 계정 삭제, 비활성화 문구가 검토됐다.
