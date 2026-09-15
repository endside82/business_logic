(function () {
  'use strict';
  const data = window.APP_TOUR_COVERAGE;
  const tour = window.APP_TOUR;
  const base = document.body.dataset.base || '../';
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const statuses = { complete: '소개 장면 갖춤', partial: '부분 촬영', missing: '미촬영', blocked: '막힌 단계 있음', unavailable: '현재 제공하지 않음' };
  const plain = text => text.replaceAll(' & ', '·').replaceAll(' / ', '·').replaceAll('/', '·')
    .replaceAll('호스트', '주최자').replaceAll('이벤트', '모임').replaceAll('멤버', '회원')
    .replaceAll('소유자', '클럽장').replaceAll('비로그인 사용자', '로그인하지 않은 이용자')
    .replaceAll('로그인 사용자', '회원').replaceAll('플랜', '진행 안내');
  const features = window.PRD_FEATURES.map(feature => {
    const shots = data.evidence[feature.id] || [];
    return { ...feature, name: data.titles[feature.id] || plain(feature.name), actor: feature.id === 'F20-01' ? '회원·문의 응대 권한이 있는 운영자' : plain(feature.actor), area: feature.id.slice(1, 3), plan: data.scenes[feature.id], shots,
      state: feature.id === 'F10-05' ? 'unavailable' : data.blocked.includes(feature.id) ? 'blocked' : data.complete.includes(feature.id) ? 'complete' : shots.length ? 'partial' : 'missing',
      note: data.notes[feature.id] || (data.complete.includes(feature.id) ? '아래 소개에 필요한 장면을 갖췄습니다. 기능 전체의 자동 테스트·실제 환경 확인 완료라는 뜻은 아닙니다.' : shots.length ? '연결된 장면만 촬영했습니다. 아래 필요한 장면 전체의 완료를 뜻하지 않습니다.' : '촬영 여부는 미구현 여부와 다릅니다. 실제 화면 진입과 예시 데이터 준비부터 확인합니다.') };
  });
  const extras = data.supplemental.map(item => ({ ...item,
    shots: item.group ? tour.shots.filter(shot => shot.group === item.group).map(shot => shot.id) : item.shots,
    supplemental: true,
  })).map(item => ({ ...item, state: item.shots.length ? 'partial' : 'missing', note: '기존 등재 번호와 별도로 추적하는 소개 여정입니다. 175개 등재 기능 수에 합산하지 않습니다.' }));
  const all = [...features, ...extras];
  const count = state => features.filter(feature => feature.state === state).length;
  document.getElementById('coverage-summary').innerHTML = [
    ['21개', '전체 업무 영역'], [features.length + '개', '등재 기능 전수 대조'],
    [extras.length + '개', '별도로 추적하는 소개 여정'],
    [features.filter(feature => feature.shots.length).length + '개', '사진이 일부 연결된 등재 기능'],
  ].map(([value, label]) => '<div><strong>' + value + '</strong>' + label + '</div>').join('');
  document.getElementById('coverage-status-summary').textContent = '등재 기능 기준: 소개 장면 갖춤 ' + count('complete') + '개 · 부분 촬영 ' + count('partial') + '개 · 막힌 단계 있음 ' + count('blocked') + '개 · 미촬영 ' + count('missing') + '개 · 현재 제공하지 않음 ' + count('unavailable') + '개. 소개 장면을 갖춘 것과 기능 전체의 검증 완료는 다릅니다.';
  const menu = document.getElementById('coverage-area');
  data.areas.forEach(area => { const option = document.createElement('option'); option.value = area.id; option.textContent = area.title; menu.append(option); });
  const sourceLink = feature => base + (feature.doc || 'features/' + feature.id + '.html');
  function shotLinks(feature) {
    if (!feature.shots.length) return '<p class="coverage-missing">아직 연결된 사진이 없습니다.</p>';
    return '<details><summary>현재 화면 ' + feature.shots.length + '장 보기</summary><ul>' + feature.shots.map(id => {
      const shot = tour.shots.find(item => item.id === id);
      return '<li><a href="' + base + 'qa/screen-review.html#shot-' + esc(id) + '">' + esc(shot.title) + '</a></li>';
    }).join('') + '</ul></details>';
  }
  function launchText(feature) {
    if (feature.supplemental) return '<a href="' + sourceLink(feature) + '">해당 업무의 제공 범위 확인</a>';
    const launch = window.LAUNCH_STATUS;
    const entry = launch?.forFeature(feature.id);
    const label = entry && launch.SCOPE[entry.scope]?.label;
    return '<a href="' + sourceLink(feature) + '#launch-strip" title="해당 기능의 출시 범위로 이동합니다. 촬영 상태와는 별개입니다">' + esc(label || '출시 상태 문서 확인') + '</a>';
  }
  function render() {
    const query = document.getElementById('coverage-search').value.trim().toLowerCase();
    const areaId = menu.value;
    const state = document.getElementById('coverage-state').value;
    const matched = all.filter(item => (!areaId || item.area === areaId) && (!state || item.state === state) &&
      (!query || [item.name, item.actor, item.plan, item.note].join(' ').toLowerCase().includes(query)));
    document.getElementById('coverage-result-count').textContent = '현재 ' + matched.length + '개 업무 표시';
    document.getElementById('coverage-content').innerHTML = data.areas.map(area => {
      const rows = matched.filter(item => item.area === area.id);
      if (!rows.length) return '';
      return '<section class="coverage-area" id="area-' + area.id + '"><h2>' + esc(area.title) + '</h2><p class="tour-chapter-lead">' + esc(area.purpose) + '</p><p class="coverage-flow">' + esc(area.flow) + '</p>' +
        rows.map(feature => '<article class="coverage-feature" id="feature-' + esc(feature.id) + '"><div class="coverage-feature-head"><h3>' + esc(feature.name.replaceAll(' & ', '·').replaceAll(' -> ', ' → ')) + '</h3><span class="coverage-state coverage-' + feature.state + '">' + statuses[feature.state] + '</span></div><p><strong>누가 사용하나요?</strong> ' + esc(feature.actor.replaceAll('/', '·')) + '</p><p><strong>소개에 필요한 장면:</strong> ' + esc(feature.plan) + '</p><p>' + esc(feature.note) + '</p>' + shotLinks(feature) + '<p class="coverage-reference"><a href="' + sourceLink(feature) + '">' + esc(feature.name) + ' 기능 설명</a> · ' + launchText(feature) + '</p></article>').join('') + '</section>';
    }).join('') || '<p class="callout">해당 조건에 맞는 업무가 없습니다. 검색어 또는 필터를 바꿔 주세요.</p>';
  }
  function reveal() {
    const hash = location.hash.slice(1);
    if (!/^(area-|feature-)/.test(hash)) return;
    if (!document.getElementById(hash)) {
      document.getElementById('coverage-search').value = ''; menu.value = ''; document.getElementById('coverage-state').value = ''; render();
    }
    document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  }
  for (const id of ['coverage-search', 'coverage-area', 'coverage-state']) document.getElementById(id).addEventListener(id === 'coverage-search' ? 'input' : 'change', render);
  document.getElementById('coverage-reset').addEventListener('click', () => {
    document.getElementById('coverage-search').value = ''; menu.value = ''; document.getElementById('coverage-state').value = ''; render();
  });
  window.addEventListener('hashchange', reveal);
  // The same anchor must work again after filters hide its target.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !/^#(?:area-|feature-)/.test(link.hash)) return;
    event.preventDefault(); history.replaceState(null, '', link.hash); reveal();
  });
  render(); reveal();
})();
