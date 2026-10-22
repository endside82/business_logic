import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('../docs/assets/work-overview.js', import.meta.url), 'utf8');
const data = JSON.parse(html.match(/<script type="application\/json" id="work-data">([\s\S]*?)<\/script>/)[1]);

// Test the published artifact without depending on the parent workspace or a browser.
function open(hash = '') {
  const elements = new Map(), clicks = new Map(), windowEvents = new Map();
  let document;
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const node = { id, attrs: {}, dataset: {}, listeners: new Map(), _html: '', open: false, value: '',
      get innerHTML() { return this._html; },
      set innerHTML(markup) { this._html = markup; for (const m of markup.matchAll(/id="([^"]+)"/g)) element(m[1]); },
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
      hasAttribute(k) { return k in this.attrs; }, addEventListener(k, fn) { this.listeners.set(k, fn); },
      insertAdjacentHTML(_where, markup) { this.innerHTML += markup; },
      focus() { document.activeElement = this; }, closest() { return this; },
      showModal() { this.open = true; }, close() { this.open = false; },
    };
    elements.set(id, node); return node;
  }
  for (const m of html.matchAll(/id="([^"]+)"/g)) element(m[1]);
  const tabs = ['overview', 'resources', 'work'].map(name => element('tab-' + name));
  tabs.forEach(tab => { tab.attrs.role = 'tab'; });
  const panels = ['overview', 'resources', 'work'].map(name => element('view-' + name));
  element('work-data').textContent = JSON.stringify(data);
  document = { activeElement: tabs[0], getElementById: id => elements.get(id) ?? null,
    addEventListener: (name, fn) => clicks.set(name, fn),
    querySelectorAll: query => query === '[role="tab"]' ? tabs : panels,
    querySelector: () => element('tablist'),
  };
  const window = { location: { hash }, addEventListener: (name, fn) => windowEvents.set(name, fn), print() {} };
  vm.runInNewContext(script, { document, window, Map, Set, JSON, String, decodeURIComponent });
  return { element, route(value) { window.location.hash = value; windowEvents.get('hashchange')(); },
    click(dataset) { const target = element('test-action'); target.dataset = dataset; clicks.get('click')({ target }); },
    ids() { return [...element('work-list').innerHTML.matchAll(/class="work-row" data-task="([^"]+)"/g)].map(m => m[1]); },
  };
}

test('the site can open shared task and view URLs directly', () => {
  const page = open('#task-H-433');
  assert.equal(page.element('task-dialog').open, true);
  assert.match(page.element('dialog-content').innerHTML, /브랜딩 방향과 최종 로고/);
  assert.match(page.element('dialog-content').innerHTML, /index.html#task-H-433/);
  page.route('#view-resources');
  assert.equal(page.element('task-dialog').open, false);
  assert.equal(page.element('view-resources').hidden, false);
  page.route('#view-work');
  assert.equal(page.ids().length, data.tasks.length);
});

test('scopes, dependency paths and resources work in the published script', () => {
  const page = open();
  page.click({ scope: 'conditional' });
  assert.ok(page.ids().includes('H-418'));
  assert.ok(!page.ids().includes('H-186'));
  assert.ok(!page.ids().includes('H-433'));
  page.click({ scope: 'payment' });
  assert.ok(page.ids().includes('H-186'));
  page.click({ scope: 'completed' });
  assert.deepEqual(page.ids(), ['H-497']);
  page.click({ dependency: data.dependencies.find(d => d.title.includes('Calendar')).id });
  assert.deepEqual(page.ids().sort(), ['H-426', 'H-427'].sort());
  page.click({ resource: 'sharing' });
  assert.equal(page.element('plan-work').hidden, false);
  assert.match(page.element('plan-work').innerHTML, /qa\/sharing-plan.html/);
});

test('published links stay inside the website and workspace sources are plain text', () => {
  for (const task of data.tasks) {
    assert.match(task.source, /^index.html#task-/);
    assert.ok(task.sourceNotes.length);
    for (const link of task.evidenceLinks) assert.doesNotMatch(link.href, /\.md(?:#|$)|\.\.\//);
  }
  assert.doesNotMatch(html + script, /href="(?:[^"$]*\.md(?:#|"|\?)|\.\.\/\.\.\/|file:)/);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /assets\/sidebar.js/);
  assert.match(html, /assets\/app.js/);
});

test('the navigation has one status entry and keeps distinct detailed references', () => {
  const sidebar = fs.readFileSync(new URL('../docs/assets/sidebar.js', import.meta.url), 'utf8');
  assert.match(sidebar, /href: 'index.html', label: '전체 현황·다음 할 일'/);
  for (const path of ['launch-status', 'migration-status', 'acceptance', 'coverage', 'exceptions', 'release']) {
    assert.ok(!sidebar.includes(`href: 'qa/${path}.html'`));
  }
  for (const path of ['feature-status', 'external-readiness', 'completion-criteria']) {
    assert.ok(sidebar.includes(`href: 'qa/${path}.html'`));
  }
  const css = fs.readFileSync(new URL('../docs/assets/work-overview.css', import.meta.url), 'utf8');
  assert.match(css, /--blue:#1f6f60/);
  assert.match(css, /--bg:#fbfaf7/);
});
