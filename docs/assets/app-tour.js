(function renderAppTour() {
  'use strict';
  const data = window.APP_TOUR;
  if (!data) return;
  const review = document.body.dataset.tourView === 'review';
  const base = document.body.dataset.base || './';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const imagePath = id => {
    const shot = data.shots.find(item => item.id === id);
    return base + 'assets/screenshots/app-tour/' + (shot?.date || '2026-09-15') + '/' + id + '.jpg';
  };
  const prose = value => escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const orderedGroups = review ? data.groups : [...data.groups].sort((a, b) =>
    data.guideOrder.indexOf(a.id) - data.guideOrder.indexOf(b.id));
  const groupsWithShots = data.groups.filter(group => data.shots.some(shot => shot.group === group.id));
  const showcase = data.shots.filter(shot => shot.showcase);
  const summary = document.getElementById('tour-summary');
  summary.innerHTML = review
    ? '<div><strong>' + data.shots.length + '장</strong>전체 촬영 기록</div><div><strong>' + groupsWithShots.length + '묶음</strong>촬영을 시작한 이용 흐름</div><div><strong>' + showcase.length + '장</strong>소개에 사용하는 화면</div>'
    : '<div><strong>' + showcase.length + '장</strong>설명과 함께 보는 실제 화면</div><div><strong>' + new Set(showcase.map(shot => shot.group)).size + '묶음</strong>먼저 촬영한 이용 흐름</div><div><strong>21개 영역</strong><a href="' + base + 'tour/coverage.html">전체 업무와 미촬영 확인</a></div>';
  function figure(shot) {
    const proof = { form: '입력·선택 화면 확인', read: '조회 화면 확인', saved: '명시된 조작·저장 결과 확인' }[shot.kind];
    return '<figure class="tour-shot" id="shot-' + escape(shot.id) + '"><a class="tour-image-link" href="' + imagePath(shot.id) + '" target="_blank" rel="noopener" aria-label="' + escape(shot.title) + ' 원본 사진 열기">' +
      '<img src="' + imagePath(shot.id) + '" width="390" height="844" loading="lazy" alt="' + escape(shot.title + '. ' + shot.action) + '"></a><figcaption>' +
      '<span class="tour-role">' + escape(shot.role) + '의 화면</span><h3>' + escape(shot.title) + '</h3><p>' + prose(!review && shot.guideAction || shot.action) + '</p>' +
      '<p class="tour-result">' + prose(!review && shot.guideResult || shot.result) + '</p>' +
      (review ? '<p class="tour-boundary">' + escape(proof) + ' · 실제 휴대전화 확인 대기</p>' : '') + '</figcaption></figure>';
  }
  function render(selected) {
    const visible = orderedGroups.filter(group => selected === 'all' || group.id === selected);
    document.getElementById('tour-content').innerHTML = visible.map(group => {
      const shots = data.shots.filter(shot => shot.group === group.id && (review || shot.showcase));
      if (!shots.length) return '';
      const intro = !review && data.introductions?.[group.id];
      const description = intro ? '<p class="tour-chapter-lead">' + prose(intro.lead) + '</p><div class="tour-chapter-copy">' + intro.details.map(line => '<p>' + prose(line) + '</p>').join('') + '</div>' : '<p>' + escape(group.purpose) + '</p>';
      return '<section class="tour-section" id="feature-' + escape(group.id) + '"><h2>' + escape(group.title) + '</h2>' + description + '<div class="tour-shot-grid">' + shots.map(figure).join('') + '</div></section>';
    }).join('');
  }
  render('all');
  const groupsForView = orderedGroups.filter(group => data.shots.some(shot => shot.group === group.id && (review || shot.showcase)));
  const filters = document.getElementById('tour-filter');
  if (filters) {
    [{ id: 'all', title: '전체 보기' }, ...groupsForView].forEach(group => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = group.title;
      button.setAttribute('aria-pressed', String(group.id === 'all'));
      button.addEventListener('click', () => {
        filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true'); render(group.id);
      });
      filters.append(button);
    });
  }
  // A chapter or finding link must still work after the user filters another feature.
  function revealLinkedTarget(hash) {
    if (!/^#(?:feature-|shot-)/.test(hash)) return;
    const id = hash.slice(1);
    if (!document.getElementById(id)) {
      render('all');
      filters?.querySelectorAll('button').forEach((button, index) => button.setAttribute('aria-pressed', String(index === 0)));
    }
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', () => revealLinkedTarget(location.hash));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && /^#(?:feature-|shot-)/.test(link.hash)) {
      event.preventDefault();
      history.replaceState(null, '', link.hash);
      revealLinkedTarget(link.hash);
    }
  });
  const pending = document.getElementById('tour-pending');
  if (pending) {
    const missing = data.groups.filter(group => !groupsForView.includes(group));
    if (!missing.length) pending.closest('.tour-pending').hidden = true;
    else pending.innerHTML = '<ul>' + missing.map(group => '<li><strong>' + escape(group.title) + '</strong> — ' + escape(group.next) + '</li>').join('') + '</ul>';
  }
  const coverage = document.getElementById('tour-coverage');
  if (coverage) coverage.innerHTML = '<table class="tour-review-table"><thead><tr><th>기능</th><th>촬영</th><th>조작·저장 확인</th><th>아직 필요한 장면·행동</th></tr></thead><tbody>' + data.groups.map(group => {
    const shots = data.shots.filter(shot => shot.group === group.id);
    const saved = shots.filter(shot => shot.kind === 'saved').length;
    return '<tr><td>' + (shots.length ? '<a href="#feature-' + escape(group.id) + '">' + escape(group.title) + '</a>' : escape(group.title)) + '</td><td>' + (shots.length ? shots.length + '장 · 일부 촬영' : '촬영 준비') + '</td><td>' + (saved ? '사진별 명시 범위만 확인' : '이번 촬영의 확인 근거 없음') + '</td><td>' + escape(group.next) + '</td></tr>';
  }).join('') + '</tbody></table>';
  const findings = document.getElementById('tour-findings');
  if (findings) {
    const card = item => '<article><span class="tour-role">' + escape(item.severity) + '</span><h3>' + escape(item.title) + '</h3><p>' + prose(item.detail) + '</p><p><strong>' + (item.status === 'resolved' ? '확인 범위·다음 행동:' : '다음 행동:') + '</strong> ' + prose(item.next) + '</p><a href="#' + escape(item.verificationAnchor || 'shot-' + item.image) + '">' + (item.status === 'resolved' ? '수정 후 화면과 확인 결과 보기' : '해당 화면 원본과 설명 보기') + '</a>' + (item.previousImage ? ' · <a href="#shot-' + escape(item.previousImage) + '">수정 전 화면 보기</a>' : '') + '</article>';
    const open = data.findings.filter(item => item.status !== 'resolved');
    const resolved = data.findings.filter(item => item.status === 'resolved');
    findings.innerHTML = '<p><strong>남은 보완 ' + open.length + '건</strong></p>' + open.map(card).join('') +
      (resolved.length ? '<details class="tour-resolved"><summary>수정하고 다시 확인한 항목 ' + resolved.length + '건</summary>' + resolved.map(card).join('') + '</details>' : '');
  }
  revealLinkedTarget(location.hash);
})();
