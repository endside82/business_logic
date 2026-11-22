(function () {
  'use strict';
  const data = window.APP_TOUR_COVERAGE;
  const tour = window.APP_TOUR;
  const base = document.body.dataset.base || '../';
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const statuses = { complete: '당시 소개 장면 확보', partial: '일부 촬영 기록', missing: '연결된 기록 없음', blocked: '당시 막힌 단계 기록', unavailable: '폐기된 기능' };
  const plain = text => text.replaceAll(' & ', '·').replaceAll(' / ', '·').replaceAll('/', '·')
    .replaceAll('호스트', '주최자').replaceAll('이벤트', '모임').replaceAll('멤버', '회원')
    .replaceAll('소유자', '클럽장').replaceAll('비로그인 사용자', '로그인하지 않은 이용자')
    .replaceAll('로그인 사용자', '회원').replaceAll('플랜', '진행 안내');
  const features = window.PRD_FEATURES.map(feature => {
    const shots = data.evidence[feature.id] || [];
    return { ...feature, name: feature.name, actor: feature.id === 'F20-01' ? '회원·문의 응대 권한이 있는 운영자' : plain(feature.actor), area: feature.id.slice(1, 3), plan: data.scenes[feature.id], currentScope: feature.checks, shots,
      state: feature.id === 'F10-05' ? 'unavailable' : data.blocked.includes(feature.id) ? 'blocked' : data.complete.includes(feature.id) ? 'complete' : shots.length ? 'partial' : 'missing',
      note: data.notes[feature.id] || (data.complete.includes(feature.id) ? '당시 소개 구상의 장면을 갖췄다고 기록했습니다. 현재 기능·실행 완료 판정이 아닙니다.' : shots.length ? '일부 촬영 기록만 연결되어 있습니다. 현재 화면 일치나 기능 전체 검증을 뜻하지 않습니다.' : '연결된 기록이 없다는 사실은 미구현이나 필수 재촬영 판정이 아닙니다.') };
  });
  const extras = data.supplemental.map(item => ({ ...item,
    ...(item.id === 'private-meeting' ? { name: '한 명을 선정하는 사적 모임', actor: '호스트·선정된 참가자·결제 운영자', currentScope: '전용 상세 권한, 개설·선정과 참가비 보관, 종료 후 완료 확인, 분쟁 보류, 자동 재시도와 운영 수동 복구. 과거 초대 중심 촬영 구상은 현재 계약이 아닙니다.' } : {}),
    shots: item.group ? tour.shots.filter(shot => shot.group === item.group).map(shot => shot.id) : item.shots,
    supplemental: true,
  })).map(item => ({ ...item, state: item.shots.length ? 'partial' : 'missing', note: '기존 등재 번호와 별도로 추적하는 소개 여정입니다. 175개 등재 기능 수에 합산하지 않습니다.' }));
  const all = [...features, ...extras];
  const count = state => features.filter(feature => feature.state === state).length;
  document.getElementById('coverage-summary').innerHTML = [
    ['21개', '전체 업무 영역'], [features.length + '개', '현재 기능 정본 연결'],
    [extras.length + '개', '별도로 추적하는 소개 여정'],
    [features.filter(feature => feature.shots.length).length + '개', '사진이 일부 연결된 등재 기능'],
  ].map(([value, label]) => '<div><strong>' + value + '</strong>' + label + '</div>').join('');
  document.getElementById('coverage-status-summary').textContent = '과거 촬영 기록 분류: 당시 장면 확보 ' + count('complete') + '개 · 일부 기록 ' + count('partial') + '개 · 당시 막힘 ' + count('blocked') + '개 · 연결 기록 없음 ' + count('missing') + '개 · 폐기된 기능 ' + count('unavailable') + '개. 과거 기록 분류는 현재 결함·필수 촬영 목록·기능 검증 완료가 아닙니다.';
  const menu = document.getElementById('coverage-area');
  data.areas.forEach(area => { const option = document.createElement('option'); option.value = area.id; option.textContent = area.title; menu.append(option); });
  const sourceLink = feature => base + (feature.doc || 'features/' + feature.id + '.html');
  function shotLinks(feature) {
    if (!feature.shots.length) return '<p class="coverage-missing">아직 연결된 사진이 없습니다.</p>';
    return '<details><summary>과거 촬영 기록 ' + feature.shots.length + '장 보기</summary><ul>' + feature.shots.map(id => {
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
      (!query || [item.id, item.name, item.actor, item.currentScope, item.plan, item.note].join(' ').toLowerCase().includes(query)));
    document.getElementById('coverage-result-count').textContent = '현재 ' + matched.length + '개 업무 표시';
    document.getElementById('coverage-content').innerHTML = data.areas.map(area => {
      const rows = matched.filter(item => item.area === area.id);
      if (!rows.length) return '';
      return '<section class="coverage-area" id="area-' + area.id + '"><h2>' + esc(area.title) + '</h2><p class="tour-chapter-lead">' + esc(area.purpose) + '</p><p class="coverage-flow">' + esc(area.flow) + '</p>' +
        rows.map(feature => '<article class="coverage-feature" id="feature-' + esc(feature.id) + '"><div class="coverage-feature-head"><h3>' + esc(feature.name.replaceAll(' & ', '·').replaceAll(' -> ', ' → ')) + '</h3><span class="coverage-state coverage-' + feature.state + '">' + statuses[feature.state] + '</span></div><p><strong>누가 사용하나요?</strong> ' + esc(feature.actor.replaceAll('/', '·')) + '</p><p><strong>현재 정본의 확인 범위:</strong> ' + esc(feature.currentScope || '아래 별도 기능 정본을 확인합니다.') + '</p><details><summary>이전 촬영 구상과 당시 기록</summary><p>' + esc(feature.plan) + '</p><p>' + esc(feature.note) + '</p></details>' + shotLinks(feature) + '<p class="coverage-reference"><a href="' + sourceLink(feature) + '">' + esc(feature.name) + ' 기능 설명</a> · ' + launchText(feature) + '</p></article>').join('') + '</section>';
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
