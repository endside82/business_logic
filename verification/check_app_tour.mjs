#!/usr/bin/env node
// Checks the screenshot registry without starting the app or contacting services.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const context = { window: {} };
vm.runInNewContext(await readFile(resolve(root, 'docs/assets/app-tour-data.js'), 'utf8'), context, { timeout: 1000 });
const data = context.window.APP_TOUR;
assert.ok(data?.groups?.length && data?.shots?.length, 'Missing tour registry');
const groups = new Set(data.groups.map(group => group.id));
const ids = new Set(data.shots.map(shot => shot.id));
assert.equal(groups.size, data.groups.length, 'Duplicate feature group');
assert.equal(ids.size, data.shots.length, 'Duplicate screenshot ID');
assert.deepEqual([...data.guideOrder].sort(), [...groups].sort(), 'Guide order must cover every feature once');
for (const group of data.groups) {
  assert.match(group.id, /^[a-z][a-z0-9-]*$/);
  for (const key of ['title', 'purpose', 'scenes', 'next']) assert.ok(group[key]?.trim(), `${group.id}: missing ${key}`);
  const intro = data.introductions[group.id];
  assert.ok(intro?.lead?.trim() && intro.details.length >= 2, `${group.id}: missing detailed introduction`);
}

function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'Not an original JPEG');
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    assert.equal(bytes[offset++], 0xff, 'Invalid JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(offset);
    assert.ok(length >= 2 && offset + length <= bytes.length, 'Invalid JPEG segment');
    if (frameMarkers.has(marker)) return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    offset += length;
  }
  throw new Error('JPEG has no supported frame header');
}

const captureRoot = resolve(root, 'docs/assets/screenshots/app-tour');
for (const date of await readdir(captureRoot)) {
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  const files = (await readdir(resolve(captureRoot, date))).filter(file => /\.(?:jpe?g|png|webp)$/i.test(file)).sort();
  const expected = [...data.shots].filter(shot => (shot.date || '2026-09-15') === date).map(shot => shot.id + '.jpg').sort();
  assert.deepEqual(files, expected, `${date}: files and captions must match exactly`);
}
let totalBytes = 0;
for (const shot of data.shots) {
  assert.match(shot.id, /^[a-z][a-z0-9-]*$/);
  assert.ok(groups.has(shot.group), `${shot.id}: unknown feature`);
  assert.ok(['form', 'read', 'saved'].includes(shot.kind), `${shot.id}: missing evidence boundary`);
  assert.equal(typeof shot.showcase, 'boolean');
  for (const key of ['title', 'role', 'action', 'result']) assert.ok(shot[key]?.trim(), `${shot.id}: missing ${key}`);
  const date = shot.date || '2026-09-15';
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  const bytes = await readFile(resolve(captureRoot, date, shot.id + '.jpg'));
  assert.deepEqual(jpegSize(bytes), { width: 390, height: 844 }, `${shot.id}: capture size changed`);
  totalBytes += bytes.length;
}
const reviewHtml = await readFile(resolve(root, 'docs/qa/screen-review.html'), 'utf8');
const followupReview = reviewHtml.match(/<section id="transport-followup-review">([\s\S]*?)<\/section>/)?.[1];
assert.ok(followupReview, '추가 웹 시나리오 결과 구분 필요');
assert.match(followupReview, /추가 검사 6개를 통과/);
assert.match(followupReview, /데스크톱 웹/);
assert.match(followupReview, /휴대전화·실제 푸시·사용할 실차 도면은 아직 확인하지 않았습니다/);
const followupPhotos = [...followupReview.matchAll(/href="\.\.\/assets\/transport-review\/(case-[a-z0-9-]+\.jpg)"/g)].map(match => match[1]);
assert.equal(followupPhotos.length, 7, '여섯 경로의 사진 일곱 장');
assert.equal(new Set(followupPhotos).size, 7, '중복 사진으로 증거 개수를 늘리지 않음');
for (const file of followupPhotos) {
  const bytes = await readFile(resolve(root, 'docs/assets/transport-review', file));
  assert.deepEqual(jpegSize(bytes), { width: 1322, height: 768 }, `${file}: 실제 데스크톱 원본 크기`);
}
const transportReview = reviewHtml.match(/<section id="transport-real-review">([\s\S]*?)<\/section>/)?.[1];
const transportPhotos = [...(transportReview || '').matchAll(/<img src="\.\.\/assets\/transport-review\/([a-z-]+\.png)"/g)].map(match => match[1]);
assert.equal(new Set(transportPhotos).size, 6, 'New transport evidence must have six distinct photos');
for (const file of transportPhotos) {
  const png = await readFile(resolve(root, 'docs/assets/transport-review', file));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', 'Transport evidence must be an original PNG');
  assert.equal(png.readUInt32BE(16), 780, 'Transport capture width changed');
  assert.equal(png.readUInt32BE(20), 1687, 'Transport capture height changed');
}
const layoutReview = reviewHtml.match(/<section id="transport-layout-real-review">([\s\S]*?)<\/section>/)?.[1];
assert.ok(layoutReview, 'Synthetic layout evidence needs a separate section');
assert.match(layoutReview, /가상 도면/);
assert.match(layoutReview, /실제 차량의 배치를 검증한 사진은 아닙니다/);
const layoutPhotos = [...layoutReview.matchAll(/<img src="\.\.\/assets\/transport-review\/([a-z-]+\.png)"/g)].map(match => match[1]);
assert.deepEqual(layoutPhotos, ['real-bus-synthetic-layout.png', 'real-participant-seat-change.png']);
for (const file of layoutPhotos) {
  const png = await readFile(resolve(root, 'docs/assets/transport-review', file));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `Not a PNG: ${file}`);
  assert.equal(png.readUInt32BE(16), 780, `Unexpected width: ${file}`);
  assert.equal(png.readUInt32BE(20), 1687, `Unexpected height: ${file}`);
}
const adminReview = reviewHtml.match(/<section id="transport-admin-real-review">([\s\S]*?)<\/section>/)?.[1];
const adminPhotos = [...(adminReview || '').matchAll(/href="\.\.\/assets\/transport-review\/([a-z-]+\.png)"/g)].map(match => match[1]);
assert.deepEqual(adminPhotos, ['real-admin-requests.png', 'real-admin-privacy-reallocation.png'], 'Administrator proof must remain separate from app captures');
for (const [index, file] of adminPhotos.entries()) {
  const png = await readFile(resolve(root, 'docs/assets/transport-review', file));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', 'Administrator evidence must be an original PNG');
  assert.equal(png.readUInt32BE(16), 2560, 'Administrator capture width changed');
  assert.equal(png.readUInt32BE(20), index === 0 ? 3000 : 4514, 'Administrator capture height changed');
}
for (const finding of data.findings) {
  assert.ok(groups.has(finding.group), 'Unknown finding group');
  assert.ok(ids.has(finding.image), `Broken finding screenshot: ${finding.image}`);
  assert.ok(['open', 'resolved'].includes(finding.status || 'open'), 'Unknown finding status');
  if (finding.status === 'resolved') {
    assert.ok(ids.has(finding.previousImage), 'Resolved finding needs its original failure screenshot');
    if (finding.verificationAnchor) {
      assert.equal(finding.verificationAnchor, 'transport-real-review', 'Unknown separate verification gallery');
      assert.ok(transportReview && transportPhotos.length === 6, 'Separate verification evidence missing');
    } else {
      assert.notEqual(finding.previousImage, finding.image, 'Resolved finding needs new verification evidence');
    }
  }
  for (const key of ['title', 'severity', 'detail', 'next']) assert.ok(finding[key]?.trim(), `Finding missing ${key}`);
}
for (const page of ['tour/index.html', 'qa/screen-review.html']) {
  const html = await readFile(resolve(root, 'docs', page), 'utf8');
  assert.match(html, /data-document-kind="reference"/);
  for (const file of ['app-tour-data.js', 'app-tour.js', 'app-tour.css']) assert.ok(html.includes(file), `${page}: missing ${file}`);
  assert.match(html, /id="tour-content"/);
  assert.match(html, /id="tour-summary"/);
  assert.ok(html.indexOf('app-tour-data.js') < html.indexOf('app-tour.js'), `${page}: renderer loaded before registry`);
  if (page === 'tour/index.html') {
    assert.match(html, /href="\.\.\/qa\/screen-review\.html#captures"/, 'Full gallery must link to the actual capture section');
    for (const [, group] of html.matchAll(/href="#feature-([a-z-]+)"/g)) assert.ok(groups.has(group), `Broken chapter link: ${group}`);
  } else {
    for (const anchor of ['captures', 'findings', 'coverage']) assert.ok(html.includes(`id="${anchor}"`), `Missing review anchor: ${anchor}`);
  }
}
console.log(JSON.stringify({ result: 'PASS', screenshots: ids.size, groupsStarted: new Set(data.shots.map(shot => shot.group)).size,
  groupsPlanned: groups.size, showcase: data.shots.filter(shot => shot.showcase).length, findings: data.findings.length,
  openFindings: data.findings.filter(item => item.status !== 'resolved').length,
  resolvedFindings: data.findings.filter(item => item.status === 'resolved').length, transportScreenshots: transportPhotos.length,
  transportAdminScreenshots: adminPhotos.length, transportFollowupScreenshots: followupPhotos.length,
  transportSyntheticLayoutScreenshots: layoutPhotos.length,
  dimensions: '390x844', bytes: totalBytes }, null, 2));
