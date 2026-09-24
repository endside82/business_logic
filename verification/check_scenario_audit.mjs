#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveReferences } from './source_references.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const workspace = path.resolve(root, '..');
const pagePath = path.join(root, 'docs/qa/scenario-completeness.html');
const html = fs.readFileSync(pagePath, 'utf8');
const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, {
  value: '', checked: false, textContent: '', innerHTML: '', listeners: {},
  appendChild() {},
  addEventListener(event, callback) { this.listeners[event] = callback; },
}]));
const sandbox = {
  window: {}, location: { pathname: '/qa/scenario-completeness.html' }, setTimeout() {},
  document: {
    readyState: 'loading', body: { getAttribute: () => '../' },
    getElementById: (id) => elements.get(id) ?? null,
    createElement: () => ({}), addEventListener() {}, querySelectorAll: () => [],
  },
};
vm.createContext(sandbox);
for (const name of ['features', 'mileage-feature-status', 'launch-status', 'scenario-audit']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'docs/assets', name + '.js'), 'utf8'), sandbox);
}
for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  vm.runInContext(script, sandbox, { filename: pagePath });
}
const audit = sandbox.window.SCENARIO_AUDIT;
const entries = audit.features.flatMap((feature) => feature.trace.entries);
const targets = JSON.parse(fs.readFileSync(new URL('./source_reference_targets.json', import.meta.url), 'utf8')).references;
const resolved = new Map(resolveReferences(workspace, targets).map((entry) => [entry.id, entry]));
assert.equal(audit.sourceReferenceCheck.endpointIdentityChecked, true);
assert.equal(entries.length, audit.totals.traceMarkers);
assert.equal(entries.filter((entry) => entry.status === 'verified').length, audit.totals.verifiedTraceRecords);
assert.equal(entries.filter((entry) => entry.status === 'retired').length, audit.totals.retiredTraceMarkers);
assert.equal(audit.totals.unresolvedTraceRecords, 0);
assert.ok(!('nearbyMappingMarkers' in audit.totals), '근처의 다른 API를 유효한 위치로 세지 않는다.');
for (const feature of audit.features) {
  assert.equal(feature.trace.entries.length, feature.trace.total);
  for (const entry of feature.trace.entries) {
    assert.equal(entry.status, resolved.get(entry.id).status);
    assert.equal(JSON.stringify(entry.endpoints), JSON.stringify(resolved.get(entry.id).endpoints));
    for (const endpoint of entry.endpoints) {
      const lines = fs.readFileSync(path.join(workspace, endpoint.targetPath), 'utf8').split(/\r?\n/);
      assert.match(lines[endpoint.targetLine - 1], /@(Get|Post|Put|Patch|Delete|Request)Mapping/);
      assert.ok(lines[endpoint.methodLine - 1].includes(endpoint.method + '('), '다른 함수 위치: ' + entry.id);
    }
  }
}

// 배포하지 않는 로컬 개발 메모도 존재하는 경우 현재 함수·주소·위치와 대조한다.
const endpointsByIdentity = new Map([...resolved.values()].flatMap((entry) => entry.endpoints).map((endpoint) =>
  [endpoint.targetPath + ' ' + endpoint.controller + '#' + endpoint.method + ' ' + endpoint.httpMethod + ' ' + endpoint.httpPath, endpoint],
));
let localSourceLocations = 0;
for (const backendPath of new Set(targets.map((target) => target.backendPath))) {
  const absolute = path.join(workspace, backendPath);
  if (!fs.existsSync(absolute)) continue;
  const text = fs.readFileSync(absolute, 'utf8');
  const markers = [...text.matchAll(/<!-- traces: ([^\n]+):(\d+) -->\n<!-- source-target: (\w+#\w+) (GET|POST|PATCH|PUT|DELETE) ([^\n]+) -->/g)];
  assert.equal(markers.length, [...text.matchAll(/<!-- traces:/g)].length, '함수·주소가 없는 옛 위치 기록: ' + backendPath);
  for (const [, file, line, method, verb, route] of markers) {
    const endpoint = endpointsByIdentity.get(file + ' ' + method + ' ' + verb + ' ' + route);
    assert.ok(endpoint, '확인되지 않은 코드 연결: ' + backendPath + ' ' + method);
    assert.equal(Number(line), endpoint.targetLine);
    localSourceLocations += 1;
  }
}

const rendered = elements.get('rows').innerHTML;
assert.equal((rendered.match(/<tr>/g) ?? []).length, audit.features.length);
assert.doesNotMatch(rendered, /줄 링크 최신|현재 위치|동작 증거는 있으므로/);
assert.doesNotMatch(rendered, /같은 기능인지는 미확인|문서에 적힌 옛 위치/);
assert.match(rendered, /확인한 코드 보기/);
assert.match(rendered, /철회된 기능/);

elements.get('f-trace').checked = true;
elements.get('f-trace').listeners.change();
const filtered = elements.get('rows').innerHTML;
const expected = audit.features.filter((feature) =>
  feature.trace.verified > 0,
).length;
assert.equal((filtered.match(/<tr>/g) ?? []).length, expected);
assert.doesNotMatch(filtered, /F10-05/);
elements.get('q').value = '이메일 회원가입';
elements.get('q').listeners.input();
assert.match(elements.get('rows').innerHTML, /F01-01/);
assert.equal((elements.get('rows').innerHTML.match(/<tr>/g) ?? []).length, 1);

const tracked = (repo) => new Set(execFileSync('git', ['ls-files'], {
  cwd: repo, encoding: 'utf8',
}).trim().split('\n'));
const documents = tracked(root);
const sources = tracked(path.join(workspace, 'community_api'));
const staticHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const links = new Set([...`${staticHtml}\n${rendered}`.matchAll(/href="([^"]+)"/g)]
  .map(([, href]) => href.replaceAll('&amp;', '&')));
let localLinks = 0;
let repositoryLinks = 0;
for (const href of links) {
  if (href.startsWith('https://github.com/endside82/')) {
    const url = new URL(href);
    const [, repo, , revision, ...parts] = url.pathname.slice(1).split('/');
    const file = decodeURIComponent(parts.join('/'));
    assert.ok((repo === 'business_logic' ? documents : sources).has(file), '저장소에 포함되지 않은 링크: ' + href);
    if (repo === 'community_api') assert.equal(revision, audit.sourceReferenceCheck.sourceRevision);
    repositoryLinks += 1;
  } else if (!/^https?:/.test(href)) {
    const [file, fragment] = href.split('#');
    const target = path.resolve(path.dirname(pagePath), file || path.basename(pagePath));
    assert.ok(fs.existsSync(target), '없는 문서 링크: ' + href);
    if (fragment) assert.ok(fs.readFileSync(target, 'utf8').includes('id="' + decodeURIComponent(fragment) + '"'), '없는 문단: ' + href);
    localLinks += 1;
  }
}
const retiredPage = fs.readFileSync(path.join(root, 'docs/features/F10-05.html'), 'utf8');
assert.match(retiredPage, /id="retired-status"/);
assert.match(retiredPage, /<details>\s*<summary>철회 전 설계 보기/);
assert.match(retiredPage, /파일 두 개가 아니라/);
console.log(JSON.stringify({
  result: 'PASS', features: audit.features.length, sourceRecords: entries.length,
  verifiedRecords: audit.totals.verifiedTraceRecords,
  retiredRecords: audit.totals.retiredTraceMarkers,
  filteredFeatures: expected, localSourceLocations, localLinks, repositoryLinks,
  scope: '문서 데이터·표 렌더링·필터·연결 대상 검사. 제품 기능 테스트 아님.',
}, null, 2));
