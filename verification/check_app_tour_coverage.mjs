#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';
const root = fileURLToPath(new URL('..', import.meta.url));
const context = { window: {} };
for (const file of ['features', 'app-tour-data', 'app-tour-coverage-data']) vm.runInNewContext(await readFile(resolve(root, 'docs/assets/' + file + '.js'), 'utf8'), context);
const { PRD_FEATURES: features, APP_TOUR: tour, APP_TOUR_COVERAGE: data } = context.window;
assert.equal(data.areas.length, 21);
const ids = features.map(feature => feature.id);
assert.equal(new Set(ids).size, ids.length);
assert.equal(ids.length, 175);
assert.deepEqual(Object.keys(data.scenes).sort(), [...ids].sort(), 'Every catalogue feature needs an explicit scene plan');
const areas = new Set(data.areas.map(area => area.id));
const shots = new Set(tour.shots.map(shot => shot.id));
for (const area of data.areas) {
  for (const key of ['title', 'purpose', 'flow', 'slug']) assert.ok(area[key]?.trim());
  await access(resolve(root, 'docs/domains/' + area.slug + '.html'));
}
for (const feature of features) {
  assert.ok(areas.has(feature.id.slice(1, 3)));
  assert.ok(data.scenes[feature.id].length > 10);
  await access(resolve(root, 'docs/features/' + feature.id + '.html'));
  assert.match(await readFile(resolve(root, 'docs/features/' + feature.id + '.html'), 'utf8'), /id="launch-strip"/, 'Missing feature release anchor');
}
for (const [id, linked] of Object.entries(data.evidence)) {
  assert.ok(ids.includes(id), 'Unknown feature ' + id);
  assert.equal(new Set(linked).size, linked.length);
  for (const shot of linked) assert.ok(shots.has(shot), 'Broken screenshot reference ' + shot);
}
for (const id of data.complete) assert.ok(data.evidence[id]?.length, 'Completed introduction needs screenshots');
for (const id of data.blocked) { assert.ok(data.notes[id]); assert.ok(data.evidence[id]?.length); assert.ok(!data.complete.includes(id)); }
for (const id of Object.keys(data.titles)) assert.ok(ids.includes(id));
assert.equal(new Set(data.supplemental.map(item => item.id)).size, data.supplemental.length);
for (const item of data.supplemental) {
  assert.ok(areas.has(item.area));
  await access(resolve(root, 'docs/' + item.doc));
  if (item.group) assert.ok(tour.groups.some(group => group.id === item.group));
  for (const id of item.shots || []) assert.ok(shots.has(id));
}
const html = await readFile(resolve(root, 'docs/tour/coverage.html'), 'utf8');
for (const [, id] of html.matchAll(/href="#feature-([^"]+)"/g)) assert.ok(ids.includes(id) || data.supplemental.some(item => item.id === id), 'Broken next-work feature link');
for (const [, id] of html.matchAll(/href="#area-([^"]+)"/g)) assert.ok(areas.has(id), 'Broken next-work area link');
for (const id of ['coverage-summary', 'coverage-content', 'coverage-area', 'coverage-state', 'coverage-search', 'coverage-reset']) assert.ok(html.includes('id="' + id + '"'));
for (const page of ['tour/index.html', 'qa/screen-review.html']) assert.match(await readFile(resolve(root, 'docs', page), 'utf8'), /href="(?:\.\.\/tour\/)?coverage\.html"/);
console.log(JSON.stringify({ result: 'PASS', areas: areas.size, catalogueFeatures: ids.length, explicitScenePlans: Object.keys(data.scenes).length, supplementalJourneys: data.supplemental.length, featuresWithPhotos: Object.keys(data.evidence).filter(id => data.evidence[id].length).length, introductionsWithListedScenes: data.complete.length }, null, 2));
