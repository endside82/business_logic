/*
 * 첫 출시 상태 데이터 — 단일 출처.
 *
 * 이 파일이 답하는 질문은 하나다: "이 기능은 첫 출시에 고객에게 열리는가, 그리고 그 사실을
 * 무엇으로 확인했는가."  기능이 무엇을 하는지(설계 정본)는 features/FNN-MM.html 이 담당하고,
 * 문서를 얼마나 잘 썼는지는 qa/migration-status.html 이 담당한다. 세 축을 섞지 않는다.
 *
 * 판정 근거는 전부 저장소 밖 정본에서 가져온다(추정으로 채우지 않는다).
 *   - 노출 여부  : 운영 배포 설정의 출시 범위 목록 + 결제 개통 스위치
 *   - 확인 수준  : 2026-08-19 신규 계정 재검증 20개 시나리오 + 변경 경계 재검증 2건
 *                  + 현재 출시후보 자동 회귀
 *   - 알려진 문제: 각 기능 문서가 이미 적어 둔 미구현·미연결 서술 + 출시 관문 문서
 * 개발 추적 코드(track)는 엔지니어링 작업판과 맞추기 위한 조인 키이며 제품 우선순위가 아니다.
 */
window.LAUNCH_STATUS = (function () {
  'use strict';

  var asOf = '2026-08-19';

  // ── 축 1. 첫 출시 노출 ─────────────────────────────────────────────
  var SCOPE = {
    open:    { label: '개통',       tone: 'brand',  desc: '첫 출시에 고객에게 열린다.' },
    partial: { label: '일부 개통',  tone: 'warn',   desc: '기능 안에서 일부 경로만 열리고 나머지는 닫힌다.' },
    sealed:  { label: '봉인',       tone: 'danger', desc: '첫 출시에서 제공하지 않는 후속 출시 대상이다. 서버 실행은 막고, 화면·링크의 잔존은 공개 전 필수 정리 항목에서 따로 확인한다.' },
    retired: { label: '설계 철회',  tone: '',       desc: '제품 결정으로 폐기됐다. 이 문서는 폐기된 설계의 기록이다.' },
  };

  // ── 축 2. 확인 수준 ────────────────────────────────────────────────
  var PROOF = {
    real: { label: '로컬 실계정', tone: 'brand', desc: '로컬 환경의 신규 계정으로 실제 서버 상태기계를 왕복한 기록이 있다.' },
    auto: { label: '자동 검증만', tone: 'info',  desc: '코드와 자동 테스트는 통과했다. 신규 계정 왕복·실기기·외부 서비스 확인은 없다.' },
    none: { label: '확인 없음',   tone: '',      desc: '코드가 없거나 확인 대상이 아니다.' },
  };

  // ── 현재 판정 ──────────────────────────────────────────────────────
  var verdict = [
    { label: '내부 시연', value: '가능', tone: 'brand',
      why: '로컬 신규 계정으로 이메일 제한, 무료·유료 모임, 클럽, 신고와 제재 흐름을 끝까지 통과했다.' },
    { label: '외부 비공개 테스트', value: '불가', tone: 'danger',
      why: '실제 메일·Google·푸시·지도·파일 저장과 서명 Android/iOS 앱이 준비되지 않았다.' },
    { label: '앱스토어 공개', value: '불가', tone: 'danger',
      why: '앱 표면 정리, 운영·복구 증명, 직접 송금 책임 문구와 스토어 자료가 남아 있다.' },
    { label: '플랫폼 결제', value: '후속 출시', tone: 'warn',
      why: '첫 출시의 유료 모임은 호스트 계좌 직접 송금이다. 포인트·결제대행·지급·대사는 이번 범위가 아니다.' },
  ];

  // ── 최신 검증 결과 ────────────────────────────────────────────────
  var evidence = [
    { name: '현재 소스 고정', state: '네 번째 후보', tone: 'brand',
      detail: '개인 가용시간의 공개범위 흔적 제거와 두 데이터베이스 설치 정의의 자동 대조까지 포함했다. 빈 데이터베이스 설치 결과는 양쪽 274개 테이블·3,233개 컬럼으로 차이가 없다.' },
    { name: '자동 회귀', state: '5개 저장소 실패 0', tone: 'brand',
      detail: '현재 후보에서 공개 API 6,669건, 앱 2,392건, 관리자 API 908건을 통과했다. 소스가 바뀌지 않은 관리자 웹 140건과 실시간 서버 187건은 직전 재현 결과를 이어 쓴다.' },
    { name: '신규 계정 전체 흐름', state: '20개 통과', tone: 'brand',
      detail: '직전 후보와 격리된 새 데이터베이스에서 신규 계정 3개로 이메일 제한, 무료·계좌 직접 송금 모임, 클럽·정기모임, 신고·제재, 제외 기능 차단과 웹 화면을 모두 통과했다.' },
    { name: '앱 화면 시나리오', state: '53/53 닫힘', tone: 'brand',
      detail: '현재 관리하는 화면 시나리오에는 미실행 묶음이나 구현 후 실행 대기 항목이 없다. 실제 외부 서비스와 서명 기기 검증은 별도다.' },
  ];

  // ── 사업·출시 실행 순서 ────────────────────────────────────────────
  var nextActions = [
    { name: '닫힌 기능의 앱 버튼 정리',
      detail: '포인트 충전·자동 충전·클럽 가입비·기부·기금 인출·운영 구독·정산 지갑 납부·사적 모임 호스팅비처럼 이번 출시에서 실행할 수 없는 버튼을 숨기거나, 안내 화면으로 남길 것이라면 출시 승인 기준을 명시적으로 바꾼다. 선택한 기준을 앱 회귀 테스트로 고정하면 완료다.' },
    { name: '외부 계정과 운영 환경 준비',
      detail: '소유 도메인 메일, Google 로그인, Firebase·APNs, 지도, 파일 저장·악성 파일 검사, 실시간 통신, 관리자 승인망, 원격 경보와 외부 백업을 준비한다.' },
    { name: '책임 문구와 스토어 자료 승인',
      detail: '호스트 계좌 직접 송금의 책임 범위, 개인정보·데이터 안전성, 고객지원·탈퇴 주소, 심사 설명과 단계 배포 중단 기준을 법무·운영·사업 책임자가 승인한다.' },
    { name: '같은 서명 앱으로 최종 검증',
      detail: '현재 후보를 원격 저장소와 배포 파이프라인에 고정한 뒤, 같은 서명 Android/iOS 앱과 같은 서버로 가입부터 탈퇴, 메일·로그인·푸시·채팅·지도·사진·캘린더·복구까지 통과한다.' },
  ];

  // ── 첫 출시 관문 ───────────────────────────────────────────────────
  var gates = [
    { name: '범위·정책', state: '부분 통과', tone: 'warn',
      detail: '서버 직접 요청과 주요 후속 라우트는 막혔다. 다만 앱에 실행할 수 없는 지갑·클럽 유료 기능·사적 모임 버튼 일부가 남아 있어 비노출 기준과 아직 어긋난다.' },
    { name: '기능 완성', state: '로컬 통과', tone: 'brand',
      detail: '격리된 새 데이터베이스와 신규 계정 3개로 첫 출시 20개 시나리오와 데이터 불변식을 통과했다. 실제 외부 서비스와 서명 기기 결과는 포함하지 않는다.' },
    { name: '운영 준비', state: '미완료', tone: 'danger',
      detail: '로그인 제공자·메일·푸시·지도·파일 저장·관리자 승인망·경보·백업 복구가 실제 환경에서 확인되지 않았다.' },
    { name: '출시후보 고정', state: '소스 고정', tone: 'warn',
      detail: '네 번째 후보로 소스와 최초 설치 정의를 다시 고정했다. 변경된 세 코드 저장소의 원격 반영과 서명 Android/iOS 산출물 고정은 남았다.' },
    { name: '스토어·단계 배포', state: '준비 전', tone: 'danger',
      detail: '개인정보·데이터 안전성 문서, 심사 자료, 단계 배포 중단 기준이 아직 없다.' },
  ];

  // ── 알려진 문제와 후속 범위 등록부 ────────────────────────────────────
  // impact: block(첫 출시를 막음) / limit(열리지만 제품이 불완전) / next(후속 출시로 넘김)
  var openItems = [
    // 첫 출시를 막는 것
    { id: 'L-12', impact: 'block', kind: '앱 표면 정리',
      features: ['F06-01', 'F06-02', 'F06-05', 'F06-07', 'F04-02', 'F04-14', 'F04-15', 'F04-16', 'F07-05'],
      title: '이번 출시에서 닫은 결제·사적 모임 실행 버튼이 앱에 남아 있다',
      detail: '서버는 포인트와 후속 결제를 거부하지만, 포인트 충전·자동 충전·클럽 가입비·기부·기금 인출·운영 구독·정산 지갑 납부·사적 모임 호스팅비 버튼은 화면에 보이고 누른 뒤에야 준비 중 안내로 끝난다. 결제수단 등록 버튼은 이미 제거됐다. 현재 승인 기준은 “후속 기능 비노출”이므로 나머지 버튼을 숨기거나, 안내로 남길 정책이라면 승인 기준을 바꾸고 회귀 테스트로 고정해야 한다.', src: '2026-08-19 현재 앱 소스 확인' },
    { id: 'L-03', impact: 'block', kind: '외부 준비', features: ['F01-01', 'F01-03', 'F01-04'],
      title: '실제 메일 수신을 확인하지 않았다',
      detail: '메일 발송 도메인·발신자·수신 계정이 준비되지 않아 가입 인증·비밀번호 재설정 메일이 실제로 도착하는지 확인하지 못했다.', src: '출시 관문' },
    { id: 'L-04', impact: 'block', kind: '외부 준비', features: ['F01-02', 'F01-08'],
      title: 'Google 실계정 로그인을 확인하지 않았다',
      detail: '로그인 제공자 설정과 서명 앱이 없어 신규·기존 로그인, 연결·해제를 실행하지 못했다.', src: '실계정 검증' },
    { id: 'L-05', impact: 'block', kind: '외부 준비', features: ['F12-05', 'F12-01', 'F12-06'],
      title: '모바일 푸시를 실제 기기에서 받지 못했다',
      detail: '인앱 알림은 통과했지만 전경·백그라운드·종료 상태의 실제 푸시 수신과 화면 이동은 확인하지 않았다.', src: '실계정 검증' },
    { id: 'L-06', impact: 'block', kind: '외부 준비', features: ['F14-05', 'F14-06', 'F03-09', 'F04-11'],
      title: '지도·주소 변환·파일 저장을 운영 환경에서 확인하지 않았다',
      detail: '운영 키와 실제 저장소가 없어 주소 검색·지도 표시·사진 업로드·악성 파일 거부를 실행하지 못했다.', src: '출시 관문' },
    { id: 'L-07', impact: 'block', kind: '검증 미실행', features: ['F10-01', 'F10-03', 'F10-04'],
      title: '휴대전화 캘린더로 일정 파일을 실제로 가져오지 않았다',
      detail: '파일 생성 코드는 완료됐다. Android/iOS 실기기 가져오기와 시간대·장소 표기 확인이 남았다.', src: '출시 관문' },
    { id: 'L-08', impact: 'block', kind: '검증 미실행', features: [],
      title: '서명된 모바일 앱으로 핵심 여정을 실행하지 않았다',
      detail: '설치→가입→모임→알림→채팅→캘린더→탈퇴를 같은 출시후보에서 통과시켜야 한다.', src: '출시 관문' },
    { id: 'L-09', impact: 'block', kind: '외부 준비', features: [],
      title: '운영 안전장치를 증명하지 않았다',
      detail: '관리자 승인망 밖 차단, 장애 원격 경보, 외부 백업의 실제 복구, 롤백 훈련이 남았다. 배포 시 공개·관리자 서버에 같은 내부 인증 토큰을 넣고 알림 부수효과를 감당하는 데이터베이스 연결 수를 확보해야 한다.', src: '출시 관문·신규 계정 재검증' },
    { id: 'L-10', impact: 'block', kind: '외부 승인', features: ['F03-13', 'F17-07'],
      title: '호스트 직접 송금의 책임 문구가 법무·운영 승인을 받지 않았다',
      detail: '플랫폼이 결제금을 보관·환불하지 않는다는 사실, 계좌 소유를 보증하지 않는다는 사실을 약관과 결제 화면에 승인된 문구로 고지해야 한다.', src: '출시 관문' },
    { id: 'L-11', impact: 'block', kind: '외부 준비', features: [],
      title: '스토어 제출 자료가 실제 출시 범위와 맞춰지지 않았다',
      detail: '개인정보·데이터 안전성 문서, 지원·탈퇴 주소, 심사 자료, 단계 배포 중단 기준이 준비 전이다.', src: '출시 관문' },

    // 열리지만 제품이 불완전한 것
    { id: 'G-02', impact: 'limit', kind: '화면 없음', features: ['F17-07'],
      title: '정기모임 회비의 입금 계좌를 화면에서 안내하지 않는다',
      detail: '참가자는 호스트가 따로 안내한 계좌로 송금한 뒤 입금 신고만 한다. 이벤트 쪽에는 있는 안내 화면이 정기모임에는 없다.', src: '기능 문서' },
    { id: 'G-04', impact: 'limit', kind: '알림 미연결', features: ['F17-05'],
      title: '모집 중인 정기모임에 회차를 새로 추가해도 기존 참가자에게 알림이 가지 않는다',
      detail: '대기열 승격·환불·회차 대체 알림은 배선을 확인했다. 회차 추가만 알림 종류 자체가 없어 참가자가 새로고침으로만 알 수 있다.', src: '소스 확인' },
    { id: 'G-05', impact: 'limit', kind: '동선 끊김', features: ['F18-01', 'F18-03'],
      title: '호스트의 이의 승인·거절 버튼이 눌러도 동작하지 않는다',
      detail: '앱에 버튼은 보이지만 처리되지 않는다. 현재는 운영팀만 이의를 처리할 수 있다.', src: '기능 문서' },
    { id: 'G-07', impact: 'limit', kind: '설계만', features: ['F18-04'],
      title: '증빙·기록 공개범위 4등급 중 호스트 전용 등급은 실제로 쓰이지 않는다',
      detail: '운영팀 전용 기록은 확실히 가려지고 보완 요청·응답은 그 대화의 두 사람에게만 보인다. 그러나 호스트 전용 등급은 코드 어디에서도 부여되지 않아 설계로만 남아 있고, 첨부 파일 자체에는 등급별 걸러내기가 없다.', src: '소스 확인' },
    { id: 'G-08', impact: 'limit', kind: '화면 없음', features: ['F18-04', 'F18-01'],
      title: '제출한 증빙을 삭제할 방법이 없다',
      detail: '케이스가 종결된 뒤에도 삭제 기능이 없어 증빙은 조회 전용이다.', src: '기능 문서' },
    { id: 'G-09', impact: 'limit', kind: '화면 없음', features: ['F20-02'],
      title: '운영 이슈 접수 화면에서 증빙 파일을 첨부할 수 없다',
      detail: '서버는 최대 5개 첨부를 받을 준비가 돼 있으나 앱 접수 화면에 파일 선택이 없다.', src: '기능 문서' },
    { id: 'G-11', impact: 'limit', kind: '동선 끊김', features: ['F20-01'],
      title: '모임·클럽 문의에 호스트가 직접 답변하는 경로가 동작하지 않는다',
      detail: '운영팀을 거쳐야 한다.', src: '기능 문서' },
    { id: 'G-12', impact: 'limit', kind: '동선 끊김', features: ['F11-07'],
      title: '리뷰 답변을 수정하려 하면 새 답변 작성으로 처리돼 오류가 난다',
      detail: '이미 답변이 있는 리뷰에서 수정 경로가 연결되지 않았다.', src: '기능 문서' },
    { id: 'G-13', impact: 'limit', kind: '알림 미연결', features: ['F11-07'],
      title: '호스트가 리뷰에 답변해도 작성자가 알 방법이 없다',
      detail: '답변 알림이 없다.', src: '기능 문서' },
    { id: 'G-14', impact: 'limit', kind: '화면 없음', features: ['F03-12'],
      title: '참가자가 자기 참석 이력을 보는 화면이 없다',
      detail: '현재 참석 로그는 호스트 운영 도구로만 존재한다.', src: '기능 문서' },
    { id: 'G-15', impact: 'limit', kind: '화면 없음', features: ['F03-20'],
      title: '노쇼 확정 버튼이 기한이 지난 뒤에도 그대로 보인다',
      detail: '게스트 좌석은 이제 목록에 표시되고 일괄 확정에 포함된다. 남은 문제는 7일 기한을 화면이 미리 계산하지 않아, 만료된 뒤에도 버튼이 눌리는 것처럼 보이는 점이다.', src: '소스 확인' },
    { id: 'G-16', impact: 'limit', kind: '화면 없음', features: ['F17-03'],
      title: '정기모임 생성에서 장소 주소·온라인 주소를 입력할 칸이 없다',
      detail: '온라인·오프라인 유형은 고를 수 있으나 실제 주소 입력이 비어 있다.', src: '기능 문서' },
    { id: 'G-17', impact: 'limit', kind: '동선 끊김', features: ['F19-02'],
      title: '관심인의 새 모임 카드에서 모임 상세로 바로 들어갈 수 없다',
      detail: '관심을 보인 사용자가 곧장 신청으로 이어지지 못한다.', src: '기능 문서' },
    { id: 'G-18', impact: 'limit', kind: '화면 없음', features: ['F04-18'],
      title: '클럽 신뢰 점수가 언제 왜 변했는지 볼 이력 화면이 없다',
      detail: '현재 점수만 보인다.', src: '기능 문서' },
    { id: 'G-19', impact: 'limit', kind: '스펙 불일치', features: ['F05-05'],
      title: '저장된 검색의 이름순 정렬이 화면 스펙에는 있고 구현에는 없다',
      detail: '스펙 정정 또는 구현 중 하나가 필요하다.', src: '기능 문서' },
    { id: 'G-20', impact: 'limit', kind: '부분 구현', features: ['F11-03'],
      title: '리뷰 수정 잔여 횟수를 미리 알려 주지 않는다',
      detail: '다섯 번째 수정에서 갑자기 막힌다.', src: '기능 문서' },
    { id: 'G-22', impact: 'limit', kind: '정책 미정', features: ['F01-03'],
      title: '메일 인증을 하지 않고 방치된 계정의 처리 방침이 없다',
      detail: '제한 세션에 갇힌 계정을 언제 정리할지 정해지지 않았다.', src: '기능 문서' },
    { id: 'G-24', impact: 'limit', kind: '안내 없음', features: ['F18-02'],
      title: '분쟁 접수 후 언제까지 처리되는지 알려 주지 않는다',
      detail: '“운영팀이 검토 중이에요” 상태 안내는 있다. 다만 처리 기간이 없어 기다리는 쪽은 얼마나 더 기다려야 하는지 알 수 없다.', src: '소스 확인' },
    { id: 'G-26', impact: 'limit', kind: '화면 없음', features: ['F20-03'],
      title: 'FAQ 실시간 검색 입력이 없다', detail: '목록에서 직접 찾아야 한다.', src: '기능 문서' },
    { id: 'G-27', impact: 'limit', kind: '정책 미정', features: ['F15-03', 'F20-01'],
      title: '제재 계정이 차단 화면에서 새 고객지원 건을 만들 수 있게 할지 결정되지 않았다',
      detail: '현재도 제재 이의와 기존 지원 대화는 가능하다. 출시를 막지 않으며 출시 후 문의 이탈을 보고 결정한다.', src: '제품 결정' },

    // 후속 출시로 넘긴 것
    { id: 'N-01', impact: 'next', kind: '봉인', features: ['F06-02', 'F06-05', 'F06-06', 'F06-04'],
      title: '포인트 충전·자동 충전·지갑 결제·결제수단 등록을 열지 않는다',
      detail: '실제 결제·환불·지급·대사 준비 없이 열면 결제 단계에서 막힌다. 준비가 끝나면 스위치 하나로 함께 열린다. 이미 결제된 건의 환불·회수·역분개와 탈퇴 잔액 정리는 반대로 열어 둔다.', src: '제품 결정' },
    { id: 'N-02', impact: 'next', kind: '연쇄 봉인', features: ['F04-14', 'F04-15', 'F04-16', 'F07-05', 'F06-09'],
      title: '지갑에서 돈이 나가는 모든 경로가 함께 닫힌다 — 클럽 기부·기금 인출·클럽 구독·정산 지갑 납부·수익 출금',
      detail: '이 기능들은 첫 출시 범위 안에 있지만 결제 수단이 지갑 차감이라 결제 스위치와 함께 닫힌다. 정산 분담금은 계좌이체 확인 경로만 열린다. 가입비를 받는 클럽의 가입과 사적 모임 개설도 같은 이유로 닫힌다. 환불·회수·탈퇴 잔액 정리는 막지 않는다. 다만 앱의 일부 실행 버튼은 아직 이 상태를 미리 반영하지 않아 공개 전 정리가 필요하다.', src: '결제 개통 설정' },
    { id: 'N-03', impact: 'next', kind: '봉인', features: ['F08-06', 'F08-07', 'F08-08', 'F08-09', 'F08-10', 'F08-11', 'F08-12', 'F08-13', 'F08-14', 'F08-15', 'F06-07'],
      title: '마켓 상거래와 기간권을 열지 않는다',
      detail: '플랜 저작과 열람은 열려 있다. 판매·구매·전달만 닫는다. 이미 구매한 건의 환불·분쟁 제기와 심사 반려 사유 확인은 안전 출구로 열어 둔다.', src: '제품 결정' },
    { id: 'N-04', impact: 'next', kind: '봉인', features: ['F09-02', 'F09-03', 'F09-04', 'F09-05', 'F09-06', 'F09-07', 'F09-08'],
      title: '데이트를 열지 않는다',
      detail: '성인 확인, 두 기기 채팅, 다수 신고 경쟁, 수사 협조 대응을 실제 환경에서 훈련하지 않았다. 본인 인증은 계정 기능이라 열려 있고, 차단 목록과 신고로 가려진 사진의 확인·교체도 안전 출구로 열어 둔다.', src: '제품 결정' },
    { id: 'N-05', impact: 'next', kind: '봉인', features: ['F06-08'],
      title: '개인 구독을 새로 열지 않는다', detail: '실제 결제와 혜택·환불을 연결하지 않았다. 조회와 해지 경로는 열어 둔다 — 막으면 해지할 방법이 사라진다.', src: '제품 결정' },
    { id: 'N-06', impact: 'next', kind: '봉인', features: ['F21-01', 'F21-02', 'F21-03', 'F21-04', 'F21-05', 'F21-06', 'F21-07'],
      title: '제공자 거래를 열지 않는다', detail: '지급·세무·자격·중개 책임 승인이 없다.', src: '제품 결정' },
    { id: 'N-07', impact: 'next', kind: '봉인', features: ['F03-14', 'F03-15', 'F03-16', 'F03-17'],
      title: '버스·카풀을 열지 않는다',
      detail: '실기기 좌석·알림과 자기책임 고지를 확인하지 않았다. 알림 4종과 운전자·탑승자 운영 화면도 아직 없다. 좌석·카풀 안전 신고만 열어 둔다 — 대체 신고 창구가 없기 때문이다.', src: '제품 결정' },
    { id: 'N-08', impact: 'next', kind: '봉인', features: ['F16-01', 'F16-02', 'F16-03', 'F16-04', 'F16-05', 'F16-06', 'F16-07', 'F16-08'],
      title: '마일리지를 열지 않는다', detail: '핵심 커뮤니티 출시 없이도 독립적으로 숨길 수 있다.', src: '제품 결정' },
    { id: 'N-09', impact: 'next', kind: '설계 철회', features: ['F10-05'],
      title: '다른 사용자의 가용시간 공개 조회는 폐기됐다',
      detail: '개인 기록과 캘린더 파일만 제공하기로 결정했다. 공개 조회·공개 토글은 제거됐고, 특정 사용자에게 지정 공유하는 방식은 별도 제품 승인 뒤 후속으로 판단한다. 해당 기능 문서는 폐기된 설계의 기록이다.', src: '제품 결정' },
    { id: 'N-10', impact: 'next', kind: '봉인', features: ['F01-02'],
      title: '카카오·네이버·애플 로그인은 이번 출시에 표시하지 않는다',
      detail: '이번 로그인 수단은 메일과 Google로 정했다.', src: '제품 결정' },
  ];

  // ── 개발 추적 코드 조인 ─────────────────────────────────────────────
  // 왼쪽은 제품 기능 ID, 오른쪽은 엔지니어링 작업판의 추적 코드다. 제품 우선순위가 아니다.
  var tracks = [
    { code: 'MNY-03B', name: '호스트 계좌 직접 송금', code_state: '완료', proof_state: '로컬 신규 계정 왕복 통과 / 서명 앱 미확인',
      features: ['F03-13', 'F17-07', 'F07-09'], note: '계좌 안내부터 입금 신고·확정·거절·환불·수령 확인까지 통과했다. 정기모임 회비의 계좌 안내 화면은 별도 한계로 남는다.' },
    { code: 'P0-SCOPE-01', name: '첫 출시 범위 봉인', code_state: '완료', proof_state: '직접 API 차단 통과 / 앱 버튼 일부 잔존',
      features: ['F03-14', 'F03-15', 'F03-16', 'F03-17', 'F08-06', 'F09-02', 'F16-01', 'F21-01', 'F06-08'],
      note: '후속 도메인의 신규 화면·링크·직접 요청은 닫혔다. 공통 지갑과 클럽 화면에 남은 후속 결제 버튼은 공개 전에 별도로 정리해야 한다.' },
    { code: 'ACC-LOCK-01', name: '정지 계정 권리구제', code_state: '완료', proof_state: '로컬 신규 계정 왕복 통과',
      features: ['F15-03', 'F15-08', 'F18-01', 'F20-01'], note: '정지·영구 제한 상태에서도 본인 제재 확인과 이의를 남긴다. 실계정에서 확인한 것은 제재·케이스·이의·지원·로그아웃 경로가 열려 있다는 사실까지다.' },
    { code: 'P0-E2E-01', name: '포인트 후속 이동', code_state: '완료', proof_state: '로컬 신규 계정에서 재확인',
      features: ['F03-03', 'F06-06', 'F17-07'], note: '결제할 수 없는 유료 모임이 만들어지던 막다른 흐름을 제거했다.' },
    { code: 'P0-E2E-02', name: '메일 인증 전 제한 세션', code_state: '완료', proof_state: '로컬 신규 계정에서 재확인 / 실제 메일 미확인',
      features: ['F01-01', 'F01-03', 'F13-02'], note: '주소를 증명하기 전에는 커뮤니티 활동을 할 수 없다.' },
    { code: 'DSP-01', name: '통합 분쟁 종결', code_state: '완료', proof_state: '로컬 신규 계정 왕복 미실행',
      features: ['F18-01', 'F18-02', 'F18-03', 'F18-04', 'F18-05'], note: '접수→이의→결정→보상→고지 왕복이 남았다.' },
    { code: 'CAL-01', name: '개인 가용시간·캘린더 파일', code_state: '완료', proof_state: '개인 전용 구조 확인 / 실기기 가져오기 미확인',
      features: ['F10-01', 'F10-02', 'F10-03', 'F10-04', 'F10-05'], note: '타인 공개와 공개범위 데이터 흔적을 제거했다. 실기기 가져오기가 남았다.' },
    { code: 'SAF-01', name: '신고 관할 분리와 사람 검토', code_state: '완료', proof_state: '로컬 신규 계정 왕복 통과',
      features: ['F11-04', 'F15-02', 'F15-05', 'F15-09'], note: '클럽 운영진과 플랫폼 운영진의 관할을 나눈다.' },
    { code: 'MKT-01', name: '마켓 상거래', code_state: '완료', proof_state: '실제 저장소·전달 미확인',
      features: ['F08-06', 'F08-08', 'F08-11', 'F08-13', 'F08-14'], note: '네 상품 유형의 실제 전달·회수가 남았다.' },
    { code: 'PRO-01', name: '제공자 주문·수행·지급', code_state: '완료', proof_state: '법무·세무 승인 없음',
      features: ['F21-01', 'F21-02', 'F21-03', 'F21-05', 'F21-06'], note: '' },
    { code: 'MOV-01', name: '버스·카풀', code_state: '완료', proof_state: '실기기 미확인',
      features: ['F03-14', 'F03-15', 'F03-16', 'F03-17'], note: '' },
    { code: 'MLG-01', name: '마일리지', code_state: '완료', proof_state: '별도 확인 필요',
      features: ['F16-01', 'F16-04', 'F16-05', 'F16-06'], note: '' },
    { code: 'SUB-01', name: '구독 원장 통합', code_state: '완료', proof_state: '실결제 미확인',
      features: ['F06-08', 'F04-16'], note: '' },
    { code: 'DAT-01', name: '데이트 안전 운영', code_state: '완료', proof_state: '실신원·두 기기 미확인',
      features: ['F09-01', 'F09-05', 'F09-06', 'F09-07'], note: '' },
    { code: 'AUT-01', name: '로그인 제공자·메일', code_state: '완료', proof_state: '외부 설정 없음',
      features: ['F01-01', 'F01-02', 'F01-03', 'F01-04', 'F01-08'], note: '첫 출시를 막는 외부 준비 1순위.' },
    { code: 'ADM-01', name: '관리자 접근 경계', code_state: '완료', proof_state: '운영망 미확인',
      features: ['F15-05', 'F15-09'], note: '' },
    { code: 'REL-01', name: '출시 승인·관측', code_state: '진행', proof_state: '원격 관측 없음',
      features: [], note: '출시 가능 여부를 판정하는 단일 기준.' },
  ];

  // ── 기능별 상태 ────────────────────────────────────────────────────
  // 기본값은 "개통 · 자동 검증만"이며, 아래 표에 적힌 것만 다르다.
  var scopeOverride = {
    // 첫 출시 봉인
    'F03-14': 'sealed', 'F03-15': 'partial', 'F03-16': 'partial', 'F03-17': 'sealed',
    'F04-14': 'sealed', 'F04-15': 'sealed', 'F04-16': 'sealed',
    'F06-02': 'sealed', 'F06-04': 'partial', 'F06-05': 'sealed', 'F06-06': 'partial',
    'F06-07': 'sealed', 'F06-08': 'partial',
    'F08-06': 'partial', 'F08-07': 'sealed', 'F08-08': 'sealed', 'F08-09': 'sealed',
    'F08-10': 'sealed', 'F08-11': 'sealed', 'F08-12': 'sealed', 'F08-13': 'sealed',
    'F08-14': 'partial', 'F08-15': 'sealed',
    'F09-02': 'partial', 'F09-03': 'sealed', 'F09-04': 'sealed', 'F09-05': 'sealed',
    'F09-06': 'sealed', 'F09-07': 'partial', 'F09-08': 'sealed',
    'F16-01': 'sealed', 'F16-02': 'sealed', 'F16-03': 'sealed', 'F16-04': 'sealed',
    'F16-05': 'sealed', 'F16-06': 'sealed', 'F16-07': 'sealed', 'F16-08': 'sealed',
    'F21-01': 'sealed', 'F21-02': 'sealed', 'F21-03': 'sealed', 'F21-04': 'sealed',
    'F21-05': 'sealed', 'F21-06': 'sealed', 'F21-07': 'sealed',
    // 일부만 열림
    'F01-02': 'partial', 'F03-03': 'partial', 'F03-13': 'partial',
    'F04-02': 'partial', 'F04-05': 'partial',
    'F06-01': 'partial', 'F06-09': 'partial', 'F07-05': 'partial', 'F07-09': 'partial',
    'F17-07': 'partial',
    // 설계 철회
    'F10-05': 'retired',
  };

  var scopeNote = {
    'F01-02': '메일과 Google만 연다. 카카오·네이버·애플은 이번 출시에 표시하지 않는다.',
    'F03-03': '무료 모임과 호스트 계좌 직접 송금 모임만 만들 수 있다. 포인트·혼합 결제 모임은 만들 수도, 공개할 수도 없다.',
    'F03-13': '호스트 계좌로 직접 송금하는 방식만 연다. 포인트 선입금은 닫힌다.',
    'F06-01': '잔액과 내역 조회는 열린다. 충전 실행은 막혀 있지만, 앱의 충전 버튼을 숨기는 작업이 남았다.',
    'F06-09': '수익 조회는 열린다. 실제 출금은 닫힌다.',
    'F07-05': '계좌이체 후 호스트 확인 경로만 열린다. 지갑에서 바로 내는 납부는 닫힌다.',
    'F07-09': '계좌이체 선입금·환불만 열린다. 포인트 선입금은 닫힌다.',
    'F17-07': '계좌이체만 열린다. 지갑 결제는 닫힌다.',
    'F10-05': '개인 기록만 제공하기로 결정하면서 타인 공개 조회 자체가 제거됐다.',
    'F03-15': '신규 카풀 개설·참여는 닫힌다. 안전 신고 경로만 열어 둔다 — 대체 신고 창구가 없기 때문이다.',
    'F03-16': '신규 버스 개설·좌석 배정은 닫힌다. 좌석 안전 신고 경로만 열어 둔다.',
    'F06-06': '지갑에서 새로 결제하는 경로는 닫힌다. 이미 결제된 건의 환불·회수·역분개는 열어 둔다 — 막으면 고객에게 돌아갈 돈이 묶인다.',
    'F06-08': '새 구독과 자동갱신은 닫힌다. 조회와 해지 경로는 열어 둔다 — 막으면 해지할 방법이 사라진다.',
    'F08-06': '판매용 등록·심사 신청은 닫힌다. 심사 반려 사유를 확인하는 경로만 열어 둔다.',
    'F08-14': '새 구매가 없으니 새 환불도 없다. 이미 구매한 건의 환불·분쟁 제기 경로는 열어 둔다.',
    'F09-02': '신규 프로필 생성은 닫힌다. 사진이 신고로 가려졌을 때 확인·교체하는 경로는 열어 둔다.',
    'F09-07': '데이트 기능 전체가 닫혀도 차단 목록은 열어 둔다 — 안전 기능이라 닫으면 안 된다.',
    'F04-02': '무료 클럽 가입은 열린다. 가입비를 받는 클럽은 가입 확인까지 간 뒤 결제 단계에서 막힌다.',
    'F04-05': '무료 클럽의 승인·초대는 열린다. 가입비를 받는 클럽은 승인 시점의 결제에서 막힌다.',
    'F06-04': '등록된 수단의 조회·삭제·기본 지정은 열린다. 새 수단 등록만 닫힌다.',
    'F08-13': '구매 자체가 닫혀 새 진입이 생기지 않는다. 플랜으로 모임을 만드는 동작은 내 플랜에 대해 열려 있다.',
  };

  // 로컬 환경의 신규 계정으로 확인한 기능과 확인 범위.
  // 실제 SMTP·Google·푸시·서명 앱을 확인했다는 뜻으로 확대 해석하지 않는다.
  var realProof = {
    'F01-01': '신규 가입·로그인·로그아웃·재로그인 왕복',
    'F01-03': '메일 미인증 제한 세션 왕복 — 가입, 인증 안내 이동, 허용 조회, 차단 확인, 로그아웃',
    'F01-05': '로그아웃·재로그인과 제한 계정의 갱신 허용',
    'F01-06': '온보딩 완료',
    'F02-01': '홈 화면 진입과 연결 조회',
    'F03-03': '무료 모임과 호스트 계좌 직접 송금 모임 생성·공개, 포인트·혼합 생성 거부',
    'F03-04': '생성한 무료·유료 모임 공개와 취소 종결',
    'F03-05': '무료 신청과 유료 신청의 결제 대기·좌석 확정·취소 전이',
    'F03-13': '계좌 안내·입금 신고·확정·미입금 거절·정책 환불·수령 확인 왕복',
    'F04-01': '클럽 탭 진입',
    'F04-03': '클럽 생성 — 수정·삭제·소유권 이전은 미확인',
    'F04-05': '가입 대기 → 호스트 승인 → 멤버 확정',
    'F05-01': '검색 탭 진입과 연결 조회',
    'F07-09': '호스트 직접 송금의 취소·정책 환불·수령 확인',
    'F11-04': '신고 접수',
    'F12-01': '알림 탭 진입과 신고 결과 인앱 알림 수신',
    'F13-01': '프로필 탭 진입',
    'F15-01': '제한 계정에서 본인 제재 내역 조회 허용',
    'F15-02': '신고 접수와 내 신고 확인',
    'F15-03': '정지·영구 제한 상태에서 이의 접수',
    'F15-05': '운영자 검토와 종결',
    'F15-08': '정지·영구 제한 집행과 해제',
    'F17-03': '3회차 정기모임 생성',
    'F17-05': '선언한 회차 수와 실제 생성 회차 3개 일치',
    'F17-06': '참가자 등록 — 승인·대기열 경로는 미확인',
    'F18-01': '제한 계정에서 본인 분쟁 케이스 경로 접근 허용',
    'F20-01': '정지·영구 제한 상태에서 신고 사건과 연결한 지원 접수 허용',
  };

  // 각 기능 문서에 미판정으로 남아 있는 갭 후보 수(문서 정합 지표이지 결함 수가 아니다)
  var pendingCandidates = {"F01-02":1,"F01-03":1,"F01-04":1,"F01-06":1,"F01-08":1,"F02-01":3,"F02-02":1,"F02-03":2,"F02-04":9,"F02-05":10,"F03-01":2,"F03-02":1,"F03-03":3,"F03-04":3,"F03-05":20,"F03-06":8,"F03-08":1,"F03-09":2,"F03-10":3,"F03-11":1,"F03-12":7,"F04-01":3,"F04-03":11,"F04-05":1,"F04-07":6,"F04-08":3,"F04-10":1,"F04-11":1,"F04-12":7,"F04-13":2,"F04-14":6,"F04-15":2,"F05-01":2,"F05-02":2,"F05-03":2,"F05-05":4,"F06-03":4,"F06-04":1,"F06-06":17,"F06-07":3,"F06-08":3,"F06-09":3,"F06-10":4,"F07-01":2,"F07-02":2,"F07-03":1,"F07-04":2,"F07-05":2,"F07-07":3,"F07-09":7,"F07-10":3,"F08-01":1,"F08-08":2,"F08-09":4,"F08-11":3,"F08-12":4,"F08-13":2,"F09-03":3,"F09-05":1,"F09-06":6,"F09-08":3,"F10-01":1,"F10-02":8,"F10-03":3,"F10-04":8,"F10-05":2,"F11-03":3,"F12-02":3,"F12-03":1,"F13-01":4,"F13-02":4,"F13-03":5,"F13-04":1,"F13-05":2,"F13-06":1,"F13-07":7,"F14-01":2,"F14-02":1,"F14-03":3,"F14-04":1};

  // 기능 인벤토리 175개 — 도메인 단위 집계에 쓴다(기능 목록 자체는 features.js 가 정본).
  var allFeatures = [
    'F01-01', 'F01-02', 'F01-03', 'F01-04', 'F01-05', 'F01-06', 'F01-07', 'F01-08', 'F02-01', 'F02-02',
    'F02-03', 'F02-04', 'F02-05', 'F03-01', 'F03-02', 'F03-03', 'F03-04', 'F03-05', 'F03-06', 'F03-07',
    'F03-08', 'F03-09', 'F03-10', 'F03-11', 'F03-12', 'F03-13', 'F03-14', 'F03-15', 'F03-16', 'F03-17',
    'F03-18', 'F03-19', 'F03-20', 'F04-01', 'F04-02', 'F04-03', 'F04-04', 'F04-05', 'F04-06', 'F04-07',
    'F04-08', 'F04-09', 'F04-10', 'F04-11', 'F04-12', 'F04-13', 'F04-14', 'F04-15', 'F04-16', 'F04-17',
    'F04-18', 'F05-01', 'F05-02', 'F05-03', 'F05-04', 'F05-05', 'F06-01', 'F06-02', 'F06-03', 'F06-04',
    'F06-05', 'F06-06', 'F06-07', 'F06-08', 'F06-09', 'F06-10', 'F07-01', 'F07-02', 'F07-03', 'F07-04',
    'F07-05', 'F07-06', 'F07-07', 'F07-08', 'F07-09', 'F07-10', 'F08-01', 'F08-02', 'F08-03', 'F08-04',
    'F08-05', 'F08-06', 'F08-07', 'F08-08', 'F08-09', 'F08-10', 'F08-11', 'F08-12', 'F08-13', 'F08-14',
    'F08-15', 'F09-01', 'F09-02', 'F09-03', 'F09-04', 'F09-05', 'F09-06', 'F09-07', 'F09-08', 'F10-01',
    'F10-02', 'F10-03', 'F10-04', 'F10-05', 'F11-01', 'F11-02', 'F11-03', 'F11-04', 'F11-05', 'F11-06',
    'F11-07', 'F12-01', 'F12-02', 'F12-03', 'F12-04', 'F12-05', 'F12-06', 'F13-01', 'F13-02', 'F13-03',
    'F13-04', 'F13-05', 'F13-06', 'F13-07', 'F14-01', 'F14-02', 'F14-03', 'F14-04', 'F14-05', 'F14-06',
    'F15-01', 'F15-02', 'F15-03', 'F15-04', 'F15-05', 'F15-06', 'F15-07', 'F15-08', 'F15-09', 'F16-01',
    'F16-02', 'F16-03', 'F16-04', 'F16-05', 'F16-06', 'F16-07', 'F16-08', 'F17-01', 'F17-02', 'F17-03',
    'F17-04', 'F17-05', 'F17-06', 'F17-07', 'F17-08', 'F17-09', 'F17-10', 'F18-01', 'F18-02', 'F18-03',
    'F18-04', 'F18-05', 'F19-01', 'F19-02', 'F19-03', 'F20-01', 'F20-02', 'F20-03', 'F21-01', 'F21-02',
    'F21-03', 'F21-04', 'F21-05', 'F21-06', 'F21-07',
  ];

  // 알려진 문제와 후속 범위를 기능별로 뒤집어 색인한다.
  var byFeature = {};
  openItems.forEach(function (it) {
    (it.features || []).forEach(function (f) {
      (byFeature[f] = byFeature[f] || []).push(it.id);
    });
  });

  function forFeature(id) {
    var scope = scopeOverride[id] || 'open';
    var proof = realProof[id] ? 'real' : 'auto';
    if (scope === 'retired') proof = 'none';
    var items = (byFeature[id] || []).map(function (oid) {
      return openItems.filter(function (o) { return o.id === oid; })[0];
    });
    return {
      id: id,
      scope: scope,
      scopeNote: scopeNote[id] || '',
      proof: proof,
      proofNote: realProof[id] || '',
      openItems: items,
      blocking: items.filter(function (o) { return o.impact === 'block'; }).length,
      limiting: items.filter(function (o) { return o.impact === 'limit'; }).length,
      // 미완성으로 세는 것은 막는 것과 제한하는 것뿐이다. 범위 결정으로 닫은 항목은 결함이 아니다.
      issues: items.filter(function (o) { return o.impact !== 'next'; }).length,
      pending: pendingCandidates[id] || 0,
    };
  }

  function forDomain(num) {
    var pad = ('0' + num).slice(-2);
    var list = allFeatures.filter(function (f) { return f.indexOf('F' + pad + '-') === 0; }).map(forFeature);
    return {
      total: list.length,
      open: list.filter(function (s) { return s.scope === 'open'; }).length,
      partial: list.filter(function (s) { return s.scope === 'partial'; }).length,
      sealed: list.filter(function (s) { return s.scope === 'sealed'; }).length,
      retired: list.filter(function (s) { return s.scope === 'retired'; }).length,
      real: list.filter(function (s) { return s.proof === 'real'; }).length,
      gaps: list.reduce(function (a, s) { return a + s.issues; }, 0),
      gapFeatures: list.filter(function (s) { return s.issues > 0; }).length,
    };
  }

  return {
    asOf: asOf,
    allFeatures: allFeatures,
    forDomain: forDomain,
    SCOPE: SCOPE,
    PROOF: PROOF,
    verdict: verdict,
    evidence: evidence,
    nextActions: nextActions,
    gates: gates,
    openItems: openItems,
    tracks: tracks,
    forFeature: forFeature,
    pendingTotal: Object.keys(pendingCandidates).reduce(function (a, k) { return a + pendingCandidates[k]; }, 0),
  };
})();

/*
 * 기능 문서 머리에 붙는 상태 띠. 페이지에 <div id="launch-strip"> 가 있고 주소가 기능 문서면
 * 그 기능의 두 축과 알려진 문제를 채운다. 본문은 설계 정본이고 이 띠가 현재 상태다.
 */
(function () {
  'use strict';
  function renderDomain(host, L, num, base) {
    function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function pill(t, tone) { return '<span class="pill' + (tone ? ' ' + tone : '') + '">' + esc(t) + '</span>'; }
    var d = L.forDomain(num);
    if (!d.total) { host.style.display = 'none'; return; }

    var cls = d.sealed === d.total ? 'is-sealed' : (d.sealed || d.partial ? 'is-partial' : 'is-open');
    var html = '<span class="strip-label">' + esc(L.asOf) + ' 현재</span>';
    if (d.open + d.partial) html += pill('첫 출시 개통 ' + (d.open + d.partial), 'brand');
    if (d.sealed) html += pill('봉인 ' + d.sealed, 'danger');
    if (d.retired) html += pill('설계 철회 ' + d.retired, '');
    html += pill('로컬 실계정 ' + d.real + '/' + d.total, d.real ? 'info' : '');
    if (d.gaps) html += pill('알려진 문제 ' + d.gaps + '건', 'warn');

    var note = '이 도메인 기능 ' + d.total + '개 중 ' + (d.open + d.partial) + '개가 첫 출시 범위다.';
    if (d.gapFeatures) note += ' ' + d.gapFeatures + '개 기능에 이미 알려진 미완성 항목이 있다.';
    else if (d.sealed === d.total) note += ' 알려진 미완성 항목은 없다 — 닫는 이유는 범위 결정이다.';
    html += '<span class="strip-note">' + esc(note) + '</span>';
    html += '<span class="strip-more"><a href="' + base + 'qa/feature-status.html">기능별 출시 상태</a></span>';

    host.className = 'launch-strip ' + cls;
    host.innerHTML = html;
  }

  function render() {
    var host = document.getElementById('launch-strip');
    if (!host || !window.LAUNCH_STATUS) return;
    var L = window.LAUNCH_STATUS;
    var base = (document.body.getAttribute('data-base') || '../');

    // 도메인 페이지: 그 도메인 기능들의 집계를 보여 준다.
    var dm = location.pathname.match(/domains\/(\d{2})-[\w-]+\.html$/);
    if (host.getAttribute('data-domain') && dm) {
      renderDomain(host, L, dm[1], base);
      return;
    }

    var m = location.pathname.match(/(F\d{2}-\d{2})\.html$/);
    var id = host.getAttribute('data-feature') || (m && m[1]);
    if (!id) { host.style.display = 'none'; return; }

    var s = L.forFeature(id);
    var sc = L.SCOPE[s.scope], pr = L.PROOF[s.proof];

    function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function pill(t, tone) { return '<span class="pill' + (tone ? ' ' + tone : '') + '">' + esc(t) + '</span>'; }

    var html = '<span class="strip-label">' + esc(L.asOf) + ' 현재</span>' +
      pill('첫 출시 ' + sc.label, sc.tone) + pill(pr.label, pr.tone);

    var note = s.scopeNote;
    if (!note) {
      if (s.scope === 'open') note = '첫 출시 범위에 든다.';
      else if (s.scope === 'sealed') note = '첫 출시에서 제공하지 않는 기능이다. 서버 실행은 막혀 있으며, 앱에 남은 진입 버튼은 공개 전 필수 정리 항목에서 별도로 표시한다.';
    }
    if (s.proofNote) note += (note ? ' ' : '') + '확인 범위 — ' + s.proofNote + '.';
    if (s.proof === 'auto' && s.scope !== 'sealed') note += (note ? ' ' : '') + '실계정·실기기 확인은 아직 없다.';
    if (note) html += '<span class="strip-note">' + esc(note) + '</span>';

    html += '<span class="strip-more"><a href="' + base + 'qa/launch-status.html">첫 출시 현황</a></span>';

    if (s.openItems.length) {
      html += '<ul>' + s.openItems.map(function (o) {
        return '<li><strong>' + esc(o.kind) + '</strong> — ' + esc(o.title) + '</li>';
      }).join('') + '</ul>';
    }

    host.className = 'launch-strip is-' + s.scope;
    host.innerHTML = html;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
