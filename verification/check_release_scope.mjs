#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const context = { window: {}, document: { readyState: 'loading', addEventListener() {} } };
for (const name of ['features.js', 'launch-status.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(docs, 'assets', name), 'utf8'), context);
}
const launch = context.window.LAUNCH_STATUS;
const features = context.window.PRD_FEATURES;
assert.equal(features.length, 175);
const scopes = {};
for (const feature of features) {
  const entry = launch.forFeature(feature.id);
  assert.ok(launch.SCOPE[entry.scope], feature.id);
  scopes[entry.scope] = (scopes[entry.scope] || 0) + 1;
}
for (const id of ['N-00', 'N-07', 'N-11-POLL']) {
  const item = launch.openItems.find(value => value.id === id);
  assert.equal(item?.impact, 'included', id);
  assert.equal(item.owner, '운영자', id);
  assert.ok(item.workArea && item.nextAction && item.doneWhen, id);
}
for (const id of ['F03-14', 'F03-15', 'F03-16', 'F03-17']) {
  assert.equal(launch.forFeature(id).scope, 'open', id);
}
assert.equal(launch.forFeature('F03-13').scope, 'partial', '직접 송금만 제공하고 지갑 결제는 닫는다');
for (const id of ['F06-02', 'F08-07', 'F09-03', 'F21-01']) {
  assert.equal(launch.forFeature(id).scope, 'sealed', id);
}

// 이 페이지들은 방문 기록이 아니라 현재 상태를 설명한다. 로컬 파일과 실제 절을 확인한다.
const pages = [
  'qa/launch-status.html', 'qa/feature-status.html', 'features/club-poll.html',
  'features/F03-03.html', 'features/F03-13.html', 'features/F03-14.html',
  'features/F17-07.html', 'index.html', 'overview/changelog.html',
];
let checkedLinks = 0;
for (const page of pages) {
  const source = fs.readFileSync(path.join(docs, page), 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  for (const match of source.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:|javascript:)/.test(href)) continue;
    const [relative, fragment] = href.split('#');
    const destination = relative.split('?')[0];
    const target = destination ? path.resolve(docs, path.dirname(page), destination) : path.join(docs, page);
    assert.ok(fs.existsSync(target), `${page} → ${href}`);
    if (fragment && target.endsWith('.html')) {
      const anchor = decodeURIComponent(fragment);
      const targetSource = fs.readFileSync(target, 'utf8');
      const renderedTask = target.endsWith('/qa/launch-status.html') &&
        launch.openItems.some(item => `item-${item.id}` === anchor);
      assert.ok(renderedTask || targetSource.includes(`id="${anchor}"`), `${page} → ${href}`);
    }
    checkedLinks++;
  }
}
console.log(JSON.stringify({ scopes, included: scopes.open + scopes.partial, checkedLinks }, null, 2));
