#!/usr/bin/env node
// Read-only catalog checks. This does not prove browser layout or app behavior.
// Run: node verification/check_app_tour_catalog.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

// Reads frame metadata only; it is not a full JPEG decoder.
export function jpegDimensions(bytes) {
  assert.ok(bytes.length >= 4 && bytes.readUInt16BE(0) === 0xffd8, 'JPEG 파일이 아닙니다');
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset++], 0xff, '잘못된 JPEG 구간');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    assert.ok(offset + 2 <= bytes.length, '잘린 JPEG 구간');
    const length = bytes.readUInt16BE(offset);
    assert.ok(length >= 2 && offset + length <= bytes.length, '잘린 JPEG 구간');
    if (frameMarkers.has(marker)) {
      assert.ok(length >= 8, '잘린 JPEG 크기 정보');
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  throw new Error('JPEG 크기 정보가 없습니다');
}

function requireText(item, fields, label) {
  for (const field of fields) {
    assert.ok(typeof item[field] === 'string' && item[field].trim(), `${label}: ${field} 설명 누락`);
  }
}

export function checkCatalog(data, files, readImage) {
  requireText(data, ['environment'], '촬영 환경');
  for (const field of ['groups', 'shots', 'findings']) assert.ok(Array.isArray(data[field]), `${field}: 목록 필요`);
  const groups = new Set();
  for (const group of data.groups) {
    requireText(group, ['id', 'title', 'purpose', 'scenes', 'next'], '기능');
    assert.match(group.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, '잘못된 기능 식별자');
    assert.ok(!groups.has(group.id), `중복 기능: ${group.id}`);
    groups.add(group.id);
  }
  const shots = new Set();
  const registeredFiles = new Set();
  for (const shot of data.shots) {
    requireText(shot, ['id', 'group', 'title', 'role', 'action', 'result'], '사진');
    assert.match(shot.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, '잘못된 사진 식별자');
    assert.ok(!shots.has(shot.id), `중복 사진: ${shot.id}`);
    assert.ok(groups.has(shot.group), `알 수 없는 기능: ${shot.group}`);
    assert.ok(['form', 'read', 'saved'].includes(shot.kind), `${shot.id}: 확인 범위 누락`);
    assert.equal(typeof shot.showcase, 'boolean', `${shot.id}: 소개용 구분 누락`);
    const format = shot.format || 'jpg';
    const ratio = shot.pixelRatio || 1;
    assert.ok(['jpg', 'png'].includes(format), `${shot.id}: 사진 형식 오류`);
    assert.ok([1, 2].includes(ratio), `${shot.id}: 촬영 배율 오류`);
    const file = `${shot.id}.${format}`;
    assert.ok(files.includes(file), `사진 파일 누락: ${file}`);
    const bytes = readImage(file);
    let dimensions;
    if (format === 'png') {
      assert.ok(bytes.length >= 24 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', `${file}: PNG 헤더 오류`);
      dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    } else dimensions = jpegDimensions(bytes);
    assert.deepEqual(dimensions, { width: 390 * ratio, height: 844 * ratio }, `${file}: 촬영 크기 불일치`);
    registeredFiles.add(file);
    shots.add(shot.id);
  }
  for (const finding of data.findings) {
    requireText(finding, ['group', 'title', 'severity', 'image', 'detail', 'next'], '개선점');
    assert.ok(groups.has(finding.group), `개선점의 기능 누락: ${finding.group}`);
    assert.ok(shots.has(finding.image), `개선점의 사진 참조 오류: ${finding.image}`);
  }
  const started = data.groups.filter(group => data.shots.some(shot => shot.group === group.id));
  return {
    registeredShots: shots.size,
    showcaseShots: data.shots.filter(shot => shot.showcase).length,
    startedGroups: started.length,
    plannedGroups: groups.size,
    findings: data.findings.length,
    // New captures may be in progress in the main session. Do not delete or register them here.
    unregisteredImages: files.filter(file => /\.(?:jpe?g|png)$/i.test(file) && !registeredFiles.has(file)),
    groupsWithoutShowcase: started.filter(group => !data.shots.some(shot => shot.group === group.id && shot.showcase))
      .map(group => group.title),
  };
}

export function checkTourDocs(docs = fileURLToPath(new URL('../docs/', import.meta.url))) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(docs, 'assets/app-tour-data.js'), 'utf8'), context, {
    timeout: 1000, contextCodeGeneration: { strings: false, wasm: false },
  });
  const data = context.window.APP_TOUR;
  const imageRoot = path.join(docs, 'assets/screenshots/app-tour');
  const images = new Map();
  for (const date of fs.readdirSync(imageRoot)) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    for (const file of fs.readdirSync(path.join(imageRoot, date))) {
      if (!/\.(jpg|png)$/.test(file)) continue;
      assert.ok(!images.has(file), `여러 촬영 날짜의 중복 파일: ${file}`);
      images.set(file, path.join(imageRoot, date, file));
    }
  }
  for (const shot of data.shots) {
    const date = shot.date || '2026-09-15';
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    const file = `${shot.id}.${shot.format || 'jpg'}`;
    assert.equal(images.get(file), path.join(imageRoot, date, file), `${shot.id}: 촬영 날짜 불일치`);
  }
  const report = checkCatalog(data, [...images.keys()], file => fs.readFileSync(images.get(file)));
  const pages = ['tour/index.html', 'qa/screen-review.html'];
  let checkedLocalReferences = 0;
  for (const page of pages) {
    const source = fs.readFileSync(path.join(docs, page), 'utf8');
    assert.ok(source.includes('data-document-kind="reference"'), `${page}: 문서 구분 누락`);
    const catalogIndex = source.search(/src="\.\.\/assets\/app-tour-data\.js(?:\?[^"]*)?"/);
    assert.ok(catalogIndex >= 0 && catalogIndex < source.search(/src="\.\.\/assets\/app-tour\.js(?:\?[^"]*)?"/), `${page}: 스크립트 순서 오류`);
    for (const [, href] of source.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      if (/^(https?:|mailto:|\/\/)/.test(href)) continue;
      const [destination, fragment] = href.split('#');
      const target = path.resolve(docs, path.dirname(page), decodeURIComponent(destination.split('?')[0] || path.basename(page)));
      assert.ok(target.startsWith(path.resolve(docs) + path.sep), `${page}: 문서 폴더 밖 참조`);
      assert.ok(fs.existsSync(target), `${page}: 참조 파일 누락 — ${href}`);
      if (fragment && target.endsWith('.html')) {
        const ids = new Set(Array.from(fs.readFileSync(target, 'utf8').matchAll(/\bid=["']([^"']+)["']/g), match => match[1]));
        const relative = path.relative(docs, target).split(path.sep).join('/');
        if (pages.includes(relative)) {
          const included = data.shots.filter(shot => relative === 'qa/screen-review.html' || shot.showcase);
          included.forEach(shot => { ids.add(`shot-${shot.id}`); ids.add(`feature-${shot.group}`); });
        }
        assert.ok(ids.has(decodeURIComponent(fragment)), `${page}: 문단 참조 오류 — ${href}`);
      }
      checkedLocalReferences++;
    }
  }
  return { ...report, checkedLocalReferences };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = checkTourDocs();
    console.log(JSON.stringify(report, null, 2));
    if (process.argv.includes('--strict-unregistered') && report.unregisteredImages.length) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
