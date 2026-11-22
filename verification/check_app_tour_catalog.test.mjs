import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { checkCatalog, jpegDimensions } from './check_app_tour_catalog.mjs';

// Only frame metadata is needed for these tests; no screenshot is generated or edited.
function jpegHeader(width = 390, height = 844, marker = 0xc0) {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, marker, 0, 8, 8, 0, 0, 0, 0, 0, 0xff, 0xd9]);
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
}
function fixture() {
  return {
    environment: '로컬 시험 화면',
    groups: [{ id: 'stamp', title: '스탬프', purpose: '활동 기록', scenes: '회원 카드', next: '휴대전화에서 확인합니다.' }],
    shots: [{ id: 'stamp-card', group: 'stamp', title: '내 카드', role: '회원', action: '카드를 엽니다.', result: '진행 상황을 봅니다.', kind: 'read', showcase: true }],
    findings: [{ group: 'stamp', title: '가독성', severity: '검토', image: 'stamp-card', detail: '글자가 작습니다.', next: '큰 글자로 확인합니다.' }],
  };
}
const check = (data = fixture(), files = ['stamp-card.jpg'], bytes = jpegHeader()) => checkCatalog(data, files, () => bytes);

test('counts registered images and reports work still awaiting registration', () => {
  const result = check(fixture(), ['stamp-card.jpg', 'new-capture.jpg']);
  assert.equal(result.registeredShots, 1);
  assert.equal(result.showcaseShots, 1);
  assert.deepEqual(result.unregisteredImages, ['new-capture.jpg']);
});
test('rejects duplicate image identifiers', () => {
  const data = fixture(); data.shots.push({ ...data.shots[0] });
  assert.throws(() => check(data), /중복 사진/);
});
test('rejects duplicate feature identifiers', () => {
  const data = fixture(); data.groups.push({ ...data.groups[0] });
  assert.throws(() => check(data), /중복 기능/);
});
test('rejects missing image files', () => assert.throws(() => check(fixture(), []), /사진 파일 누락/));
test('rejects missing action descriptions', () => {
  const data = fixture(); data.shots[0].action = ' ';
  assert.throws(() => check(data), /action 설명 누락/);
});
test('rejects invalid evidence categories and unknown features', () => {
  const data = fixture(); data.shots[0].kind = 'complete';
  assert.throws(() => check(data), /확인 범위 누락/);
  data.shots[0].kind = 'read'; data.shots[0].group = 'unknown';
  assert.throws(() => check(data), /알 수 없는 기능/);
});
test('rejects references to a screenshot that does not exist in the catalog', () => {
  const data = fixture(); data.findings[0].image = 'missing';
  assert.throws(() => check(data), /사진 참조 오류/);
});
test('rejects path traversal in screenshot identifiers', () => {
  const data = fixture(); data.shots[0].id = '../private';
  assert.throws(() => check(data), /잘못된 사진 식별자/);
});
test('reports review-only feature groups without treating them as guide coverage', () => {
  const data = fixture(); data.shots[0].showcase = false;
  assert.deepEqual(check(data).groupsWithoutShowcase, ['스탬프']);
});
test('reads baseline and progressive JPEG frame sizes', () => {
  assert.deepEqual(jpegDimensions(jpegHeader()), { width: 390, height: 844 });
  assert.deepEqual(jpegDimensions(jpegHeader(390, 844, 0xc2)), { width: 390, height: 844 });
});
test('rejects incorrect screenshot dimensions', () => {
  assert.throws(() => check(fixture(), ['stamp-card.jpg'], jpegHeader(1, 1)), /촬영 크기 불일치/);
});
test('rejects non-JPEG and truncated frame metadata', () => {
  assert.throws(() => jpegDimensions(Buffer.from('not an image')), /JPEG 파일이 아닙니다/);
  assert.throws(() => jpegDimensions(jpegHeader().subarray(0, 9)), /잘린 JPEG 구간/);
});

// Exercises generated markup and filter callbacks, not browser layout or visual QA.
function renderFixture(view = 'guide') {
  const data = fixture();
  data.groups.push({ ...data.groups[0], id: 'profile-support', title: '내 정보·고객지원' });
  data.shots.push({ ...data.shots[0], id: 'profile-summary', group: 'profile-support', showcase: false });
  data.guideOrder = ['stamp', 'profile-support'];
  data.currentDocuments = { stamp: ['features/F04-35.html'] };
  function element() {
    return {
      innerHTML: '', children: [], attributes: {}, events: {},
      append(child) { this.children.push(child); },
      setAttribute(name, value) { this.attributes[name] = value; },
      querySelectorAll() { return this.children; },
      closest() { return this; },
      addEventListener(name, callback) { this.events[name] = callback; },
    };
  }
  const ids = ['tour-summary', 'tour-content', 'tour-filter', 'tour-pending', 'tour-coverage', 'tour-findings'];
  const elements = Object.fromEntries(ids.map(id => [id, element()]));
  vm.runInNewContext(fs.readFileSync(new URL('../docs/assets/app-tour.js', import.meta.url), 'utf8'), {
    window: { APP_TOUR: data, addEventListener() {} },
    location: { hash: '' },
    document: {
      body: { dataset: { tourView: view, base: '../' } },
      getElementById: id => elements[id], createElement: element, addEventListener() {},
    },
  }, { timeout: 1000 });
  return elements;
}
test('guide filters include only features with an introduction image', () => {
  const elements = renderFixture();
  const buttons = elements['tour-filter'].children;
  assert.deepEqual(buttons.map(button => button.textContent), ['전체 보기', '스탬프']);
  buttons[1].events.click();
  assert.equal(buttons[1].attributes['aria-pressed'], 'true');
  assert.equal(buttons[0].attributes['aria-pressed'], 'false');
  assert.ok(elements['tour-content'].innerHTML.includes('id="shot-stamp-card"'));
  assert.ok(elements['tour-pending'].innerHTML.includes('내 정보·고객지원'));
});
test('review retains screenshots that are excluded from the introduction', () => {
  const elements = renderFixture('review');
  assert.ok(elements['tour-content'].innerHTML.includes('id="shot-profile-summary"'));
  assert.ok(elements['tour-findings'].innerHTML.includes('href="#shot-stamp-card"'));
});
