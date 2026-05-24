// Shared sidebar markup. The data-base attribute on <body> tells us how deep we
// are so the links resolve correctly (root = "./", inside one folder = "../").
(function injectSidebar() {
  const base = document.body.getAttribute('data-base') || './';
  const placeholder = document.getElementById('sidebar');
  if (!placeholder) return;

  // Feature children for each domain. Code + concise label.
  const FEATURES = {
    '01-auth': [
      ['F01-01', '이메일 가입·로그인'],
      ['F01-02', '소셜 로그인'],
      ['F01-03', '이메일 인증'],
      ['F01-04', '비밀번호 재설정'],
      ['F01-05', '토큰 갱신·로그아웃'],
      ['F01-06', '온보딩'],
      ['F01-07', '관심사 태그'],
      ['F01-08', '소셜 연결 해제'],
    ],
    '02-home': [
      ['F02-01', '홈 메인 조회'],
      ['F02-02', '새로고침'],
      ['F02-03', '섹션 카드 진입'],
      ['F02-04', '추천 이벤트 더보기'],
      ['F02-05', '검색·알림 진입점'],
    ],
    '03-event': [
      ['F03-01', '발견·탐색'],
      ['F03-02', '상세 조회'],
      ['F03-03', '이벤트 생성'],
      ['F03-04', '수정·생명주기'],
      ['F03-05', '신청·참석'],
      ['F03-06', '신청서 승인·거절'],
      ['F03-07', '정원·대기열'],
      ['F03-08', 'QR 체크인'],
      ['F03-09', '이벤트 사진첩'],
      ['F03-10', '이벤트-플랜 연결'],
      ['F03-11', '위시리스트'],
      ['F03-12', '내 이벤트·로그'],
      ['F03-13', '참가 선입금'],
      ['F03-14', '이동수단 설정'],
      ['F03-15', '카풀'],
      ['F03-16', '버스대절'],
      ['F03-17', '차량 레이아웃'],
    ],
    '04-club': [
      ['F04-01', '발견·탐색'],
      ['F04-02', '상세·가입'],
      ['F04-03', '생성·수정·이전'],
      ['F04-04', '멤버 관리'],
      ['F04-05', '대기열·초대'],
      ['F04-06', '차단 관리'],
      ['F04-07', '내 클럽·통계'],
      ['F04-08', '게시판'],
      ['F04-09', '댓글·대댓글'],
      ['F04-10', '공지사항'],
      ['F04-11', '사진첩'],
      ['F04-12', '클럽 이벤트·캘린더'],
      ['F04-13', '기금 현황'],
      ['F04-14', '기부하기'],
      ['F04-15', '기금 인출'],
      ['F04-16', '클럽 구독'],
    ],
    '05-search': [
      ['F05-01', '키워드 검색'],
      ['F05-02', '자동완성'],
      ['F05-03', '검색 필터'],
      ['F05-04', '최근 검색어'],
      ['F05-05', '저장된 검색'],
    ],
    '06-payment': [
      ['F06-01', '지갑 메인'],
      ['F06-02', '포인트 충전'],
      ['F06-03', '거래 내역'],
      ['F06-04', '결제 수단'],
      ['F06-05', '자동 충전'],
      ['F06-06', '결제·환불'],
      ['F06-07', '호스팅 티켓'],
      ['F06-08', '개인 구독'],
      ['F06-09', '수익 대시보드'],
      ['F06-10', '정산·이의'],
    ],
    '07-settlement': [
      ['F07-01', '정산 생성'],
      ['F07-02', '항목 관리'],
      ['F07-03', '활성화·취소'],
      ['F07-04', '현황·영수증'],
      ['F07-05', '분담금 납부'],
      ['F07-06', '이체 확인·상각'],
      ['F07-07', '리마인드·연장'],
      ['F07-08', '이의·감사로그'],
      ['F07-09', '선입금·환불규정'],
      ['F07-10', '계좌·이력·신뢰도'],
    ],
    '08-plan-market': [
      ['F08-01', '내 플랜 목록'],
      ['F08-02', '플랜 상세'],
      ['F08-03', '블록 에디터'],
      ['F08-04', '블록 재정렬'],
      ['F08-05', '플랜 발행'],
      ['F08-06', '마켓 아이템 관리'],
      ['F08-07', '크리에이터 프로필'],
      ['F08-08', '마켓 메인'],
      ['F08-09', '마켓 검색'],
      ['F08-10', '아이템 상세'],
      ['F08-11', '구매'],
      ['F08-12', '내 컬렉션'],
      ['F08-13', '이벤트·리뷰'],
    ],
    '09-dating': [
      ['F09-01', '본인 인증'],
      ['F09-02', '프로필 관리'],
      ['F09-03', '스와이프·매칭'],
      ['F09-04', '매칭 목록'],
      ['F09-05', '채팅'],
      ['F09-06', '만남 제안'],
      ['F09-07', '차단·해제'],
      ['F09-08', '프로필 조회 이력'],
    ],
    '10-calendar': [
      ['F10-01', '통합 캘린더'],
      ['F10-02', '항목 라우팅'],
      ['F10-03', '단일 가용 시간'],
      ['F10-04', '반복 가용 규칙'],
      ['F10-05', '타 사용자 가용성'],
    ],
    '11-review': [
      ['F11-01', '리뷰 작성'],
      ['F11-02', '리뷰 목록'],
      ['F11-03', '리뷰 수정·삭제'],
      ['F11-04', '신고'],
      ['F11-05', '신뢰점수'],
      ['F11-06', '취향 프로필'],
    ],
    '12-notification': [
      ['F12-01', '목록·읽음'],
      ['F12-02', '그룹·배지'],
      ['F12-03', '카테고리 설정'],
      ['F12-04', '방해금지 시간'],
      ['F12-05', '디바이스 토큰'],
      ['F12-06', '권한 안내 배너'],
    ],
    '13-profile': [
      ['F13-01', '마이페이지 허브'],
      ['F13-02', '프로필 수정'],
      ['F13-03', '주소 관리'],
      ['F13-04', '선호 태그'],
      ['F13-05', '데이터 내보내기'],
      ['F13-06', '계정 삭제(유예)'],
      ['F13-07', '즉시 탈퇴'],
    ],
    '14-location': [
      ['F14-01', '위치 공유'],
      ['F14-02', '공유 중지'],
      ['F14-03', '만료 연장'],
      ['F14-04', '프라이버시 대시보드'],
      ['F14-05', '이벤트 길찾기'],
      ['F14-06', '역지오코딩'],
    ],
    '15-warning': [
      ['F15-01', '내 경고 현황'],
      ['F15-02', '신고 제출·관리'],
      ['F15-03', '이의제기'],
      ['F15-04', '정책·페널티 유형'],
      ['F15-05', '신고 심사'],
      ['F15-06', '경고 부여·조정'],
      ['F15-07', '이의제기 처리'],
      ['F15-08', '제재 집행'],
      ['F15-09', '검토 큐·대시보드'],
    ],
    '16-mileage': [
      ['F16-01', '내 마일리지·영수증'],
      ['F16-02', '등급·배지·랭킹'],
      ['F16-03', '시즌'],
      ['F16-04', '마일리지 정책'],
      ['F16-05', '적립규칙·교환 관리'],
      ['F16-06', '적립·차감·정정'],
      ['F16-07', '호스트 제안'],
      ['F16-08', '검토 큐·대시보드'],
    ],
  };

  const NAV = [
    {
      heading: '시작점',
      links: [
        { href: 'index.html', label: '서비스 개관' },
      ],
    },
    {
      heading: '제품 이해',
      links: [
        { href: 'overview/service.html', label: '서비스 정의' },
        { href: 'overview/personas.html', label: '사용자 유형' },
        { href: 'overview/architecture.html', label: '정보구조 14도메인' },
        { href: 'overview/journeys.html', label: '7대 사용자 여정' },
        { href: 'overview/operating-model.html', label: 'PRD 운영 모델' },
        { href: 'overview/changelog.html', label: '변경 기록' },
      ],
    },
    {
      heading: '16개 도메인',
      domainGroup: true,
      links: [
        { href: 'domains/01-auth.html',         num: '01', label: '인증·온보딩',      slug: '01-auth' },
        { href: 'domains/02-home.html',         num: '02', label: '홈 피드',          slug: '02-home' },
        { href: 'domains/03-event.html',        num: '03', label: '이벤트',           slug: '03-event' },
        { href: 'domains/04-club.html',         num: '04', label: '클럽',             slug: '04-club' },
        { href: 'domains/05-search.html',       num: '05', label: '검색',             slug: '05-search' },
        { href: 'domains/06-payment.html',      num: '06', label: '결제·지갑',       slug: '06-payment' },
        { href: 'domains/07-settlement.html',   num: '07', label: '모임 정산',       slug: '07-settlement' },
        { href: 'domains/08-plan-market.html',  num: '08', label: '플랜 마켓',       slug: '08-plan-market' },
        { href: 'domains/09-dating.html',       num: '09', label: '프라이빗 데이팅', slug: '09-dating' },
        { href: 'domains/10-calendar.html',     num: '10', label: '캘린더',           slug: '10-calendar' },
        { href: 'domains/11-review.html',       num: '11', label: '리뷰·신고',       slug: '11-review' },
        { href: 'domains/12-notification.html', num: '12', label: '알림',             slug: '12-notification' },
        { href: 'domains/13-profile.html',      num: '13', label: '프로필·설정',     slug: '13-profile' },
        { href: 'domains/14-location.html',     num: '14', label: '위치·길찾기',     slug: '14-location' },
        { href: 'domains/15-warning.html',      num: '15', label: '경고·징계',       slug: '15-warning' },
        { href: 'domains/16-mileage.html',      num: '16', label: '마일리지',         slug: '16-mileage' },
      ],
    },
    {
      heading: '기능 인벤토리',
      links: [
        { href: 'features/catalog.html', label: '139개 기능 카탈로그' },
        { href: 'features/impact.html', label: '부수효과 매트릭스' },
        { href: 'reference/numbers.html', label: '비즈니스 수치 레퍼런스' },
      ],
    },
    {
      heading: '횡단 정책',
      links: [
        { href: 'policies/state.html',         label: '상태 정책' },
        { href: 'policies/permission.html',    label: '권한·역할' },
        { href: 'policies/payment.html',       label: '결제·정산 정책' },
        { href: 'policies/notification.html',  label: '알림 정책' },
        { href: 'policies/privacy.html',       label: '개인정보·안전' },
        { href: 'policies/planning-qa.html',   label: '기획 QA 정책' },
      ],
    },
    {
      heading: 'QA & 릴리즈',
      links: [
        { href: 'qa/migration-status.html', label: 'PRD 전환 상태' },
        { href: 'qa/acceptance.html', label: '전체 수용 기준' },
        { href: 'qa/coverage.html',   label: '시나리오 커버리지' },
        { href: 'qa/exceptions.html', label: '예외·엣지 케이스' },
        { href: 'qa/release.html',    label: '릴리즈 체크리스트' },
      ],
    },
  ];

  // Figure out which domain (if any) the current page belongs to so we can
  // auto-expand its child list.
  const currentPath = location.pathname.replace(/\\/g, '/');
  let activeDomainSlug = null;
  const domainMatch = currentPath.match(/domains\/([\w-]+)\.html$/);
  if (domainMatch) activeDomainSlug = domainMatch[1];
  const featureMatch = currentPath.match(/features\/(F(\d{2})-\d{2})\.html$/);
  let activeFeatureCode = null;
  if (featureMatch) {
    activeFeatureCode = featureMatch[1];
    const domainNum = featureMatch[2];
    const domainEntry = NAV.find((g) => g.domainGroup);
    if (domainEntry) {
      const match = domainEntry.links.find((l) => l.num === domainNum);
      if (match) activeDomainSlug = match.slug;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const navHtml = NAV.map((group) => {
    const links = group.links.map((link) => {
      const num = link.num ? `<span class="num">${link.num}</span>` : '';
      const linkHtml = `<a href="${base}${link.href}">${num}${escapeHtml(link.label)}</a>`;

      if (group.domainGroup && link.slug && FEATURES[link.slug]) {
        const isOpen = link.slug === activeDomainSlug;
        const subLinks = FEATURES[link.slug].map(([code, label]) => {
          return `<a class="sub" href="${base}features/${code}.html"><span class="code">${code}</span>${escapeHtml(label)}</a>`;
        }).join('');
        return `<div class="dom${isOpen ? ' is-open' : ''}">
          <div class="dom-row">
            ${linkHtml}
            <button class="dom-toggle" type="button" aria-expanded="${isOpen}" aria-label="${escapeHtml(link.label)} 하위 기능 펼치기">
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <div class="dom-children">${subLinks}</div>
        </div>`;
      }
      return linkHtml;
    }).join('');
    return `<h4>${group.heading}</h4>${links}`;
  }).join('');

  placeholder.innerHTML = `
    <a href="${base}index.html" class="brand">community PRD</a>
    <span class="brand-sub">오프라인 모임·커뮤니티 플랫폼<br/>제품 기획·운영 문서</span>
    <nav aria-label="문서 탐색">${navHtml}</nav>
  `;

  // Mark the active link (works for domain pages and feature pages)
  placeholder.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const target = href.split('/').slice(-2).join('/');
    if (currentPath.endsWith(target) || currentPath.endsWith('/' + target)) {
      a.classList.add('active');
    }
  });

  // Wire up domain expand/collapse toggles
  placeholder.querySelectorAll('.dom .dom-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dom = btn.closest('.dom');
      const open = dom.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // ---------- Mobile topbar with hamburger toggle ----------
  let topbar = document.querySelector('.mobile-topbar');
  if (!topbar) {
    topbar = document.createElement('header');
    topbar.className = 'mobile-topbar';
    topbar.innerHTML = `
      <button class="hamburger" type="button" aria-label="문서 메뉴 열기" aria-expanded="false" aria-controls="sidebar">
        <span></span><span></span><span></span>
      </button>
      <a class="topbar-brand" href="${base}index.html">community PRD</a>
      <span class="topbar-spacer"></span>
    `;
    const layout = document.querySelector('.layout');
    if (layout && layout.parentNode) {
      layout.parentNode.insertBefore(topbar, layout);
    } else {
      document.body.insertBefore(topbar, document.body.firstChild);
    }
  }

  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  const sidebarEl = placeholder;
  sidebarEl.id = sidebarEl.id || 'sidebar';

  function openDrawer() {
    document.body.classList.add('drawer-open');
    sidebarEl.classList.add('is-open');
    backdrop.classList.add('is-visible');
    topbar.querySelector('.hamburger').setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    sidebarEl.classList.remove('is-open');
    backdrop.classList.remove('is-visible');
    topbar.querySelector('.hamburger').setAttribute('aria-expanded', 'false');
  }
  function toggleDrawer() {
    if (sidebarEl.classList.contains('is-open')) closeDrawer();
    else openDrawer();
  }

  topbar.querySelector('.hamburger').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDrawer();
  });
  backdrop.addEventListener('click', closeDrawer);

  // Close drawer on link tap so content is visible immediately. Toggle buttons
  // (inside .dom-row) must not close the drawer — they only expand/collapse.
  sidebarEl.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 1100px)').matches) closeDrawer();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarEl.classList.contains('is-open')) closeDrawer();
  });

  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 1100px)').matches) closeDrawer();
  });

  // Scroll the active link into view inside the sidebar so deep feature pages
  // don't require manual scrolling to confirm location.
  const active = sidebarEl.querySelector('a.active');
  if (active && typeof active.scrollIntoView === 'function') {
    // Use a microtask so layout has settled.
    setTimeout(() => {
      try {
        active.scrollIntoView({ block: 'center', behavior: 'instant' });
      } catch (_) {
        active.scrollIntoView();
      }
    }, 0);
  }
})();
