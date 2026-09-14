// Highlight active sidebar link based on the page URL
(function highlightActive() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const dir = location.pathname.split('/').slice(-2, -1)[0] || '';
  document.querySelectorAll('.sidebar nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const target = href.split('/').pop();
    const targetDir = href.includes('/') ? href.split('/').slice(-2, -1)[0] : '';
    if (target === here && (targetDir === dir || targetDir === '')) {
      a.classList.add('active');
    }
  });
})();

// Render mermaid diagrams once the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const kind = document.body.dataset.documentKind;
  const head = document.querySelector('main .page-head');
  if (head && kind && kind !== 'current') {
    const notice = document.createElement('p');
    notice.className = 'document-purpose';
    const label = document.createElement('strong');
    label.textContent = kind === 'history' ? '변경 기록' : '기능·설계 참고 문서';
    notice.append(label, ' — 본문의 요구사항·과거 확인은 현재 미구현 목록이 아닙니다. ');
    const link = document.createElement('a');
    link.href = (document.body.dataset.base || './') + 'qa/feature-status.html';
    link.textContent = '현재 구현·자동 테스트·실제 환경과 다음 행동';
    notice.append(link);
    head.after(notice);
  }
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#e6f2ee',
        primaryTextColor: '#1c1f24',
        primaryBorderColor: '#1f6f60',
        lineColor: '#5f6671',
        secondaryColor: '#fbeeda',
        tertiaryColor: '#fbf0dc',
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontSize: '13px',
      },
      flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
      sequence: { useMaxWidth: true, mirrorActors: false },
    });
  }
});
