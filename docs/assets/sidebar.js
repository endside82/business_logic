// Shared sidebar markup. The data-base attribute on <body> tells us how deep we
// are so the links resolve correctly (root = "./", inside one folder = "../").
(function injectSidebar() {
  const base = document.body.getAttribute('data-base') || './';
  const placeholder = document.getElementById('sidebar');
  if (!placeholder) return;

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
      heading: '14개 도메인',
      links: [
        { href: 'domains/01-auth.html',         num: '01', label: '인증·온보딩' },
        { href: 'domains/02-home.html',         num: '02', label: '홈 피드' },
        { href: 'domains/03-event.html',        num: '03', label: '이벤트' },
        { href: 'domains/04-club.html',         num: '04', label: '클럽' },
        { href: 'domains/05-search.html',       num: '05', label: '검색' },
        { href: 'domains/06-payment.html',      num: '06', label: '결제·지갑' },
        { href: 'domains/07-settlement.html',   num: '07', label: '모임 정산' },
        { href: 'domains/08-plan-market.html',  num: '08', label: '플랜 마켓' },
        { href: 'domains/09-dating.html',       num: '09', label: '프라이빗 데이팅' },
        { href: 'domains/10-calendar.html',     num: '10', label: '캘린더' },
        { href: 'domains/11-review.html',       num: '11', label: '리뷰·신고' },
        { href: 'domains/12-notification.html', num: '12', label: '알림' },
        { href: 'domains/13-profile.html',      num: '13', label: '프로필·설정' },
        { href: 'domains/14-location.html',     num: '14', label: '위치·길찾기' },
      ],
    },
    {
      heading: '기능 인벤토리',
      links: [
        { href: 'features/catalog.html', label: '117개 기능 카탈로그' },
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

  const navHtml = NAV.map((group) => {
    const links = group.links.map((link) => {
      const num = link.num ? `<span class="num">${link.num}</span>` : '';
      return `<a href="${base}${link.href}">${num}${link.label}</a>`;
    }).join('');
    return `<h4>${group.heading}</h4>${links}`;
  }).join('');

  placeholder.innerHTML = `
    <a href="${base}index.html" class="brand">community PRD</a>
    <span class="brand-sub">오프라인 모임·커뮤니티 플랫폼<br/>제품 기획·운영 문서</span>
    <nav aria-label="문서 탐색">${navHtml}</nav>
  `;

  // Mark the active link
  const path = location.pathname.replace(/\\/g, '/');
  placeholder.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const target = href.split('/').slice(-2).join('/');
    if (path.endsWith(target) || path.endsWith('/' + target)) {
      a.classList.add('active');
    }
  });

  // ---------- Mobile topbar with hamburger toggle ----------
  // Inject a sticky topbar before <main> for narrow viewports.
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

  // Backdrop for the slide-out drawer
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  const sidebarEl = placeholder; // <aside class="sidebar">
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

  // Close drawer on link tap so content is visible immediately
  sidebarEl.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 1100px)').matches) closeDrawer();
    });
  });

  // Esc closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarEl.classList.contains('is-open')) closeDrawer();
  });

  // Restore desktop state on resize up
  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 1100px)').matches) closeDrawer();
  });
})();
