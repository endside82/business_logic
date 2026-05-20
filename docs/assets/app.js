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
