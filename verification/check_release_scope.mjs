#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const context = { window: {}, document: { readyState: 'loading', addEventListener() {} } };
for (const name of ['features.js', 'launch-status.js', 'app-tour-data.js', 'app-tour-coverage-data.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(docs, 'assets', name), 'utf8'), context);
}
const launch = context.window.LAUNCH_STATUS;
const features = context.window.PRD_FEATURES;
const tour = context.window.APP_TOUR;
const tourCoverage = context.window.APP_TOUR_COVERAGE;
// These anchors are generated from the same registries as the actual pages.
// Do not accept arbitrary shot-/feature- prefixes: typos must still fail.
const renderedAnchors = new Map([
  [path.join(docs, 'qa/launch-status.html'), new Set(launch.openItems.map(item => `item-${item.id}`))],
  [path.join(docs, 'qa/screen-review.html'), new Set([
    ...tour.shots.map(shot => `shot-${shot.id}`),
    ...tour.groups.filter(group => tour.shots.some(shot => shot.group === group.id)).map(group => `feature-${group.id}`),
  ])],
  [path.join(docs, 'tour/index.html'), new Set([
    ...tour.shots.filter(shot => shot.showcase).map(shot => `shot-${shot.id}`),
    ...tour.groups.filter(group => tour.shots.some(shot => shot.group === group.id && shot.showcase)).map(group => `feature-${group.id}`),
  ])],
  [path.join(docs, 'tour/coverage.html'), new Set([
    ...features.map(feature => `feature-${feature.id}`),
    ...tourCoverage.supplemental.map(item => `feature-${item.id}`),
    ...tourCoverage.areas.map(area => `area-${area.id}`),
  ])],
]);
assert.ok(renderedAnchors.get(path.join(docs, 'qa/screen-review.html')).has('shot-carpool-passenger-my-seat'));
assert.ok(!renderedAnchors.get(path.join(docs, 'tour/index.html')).has('shot-carpool-passenger-approved-blank-seats'), '검수 전용 사진은 소개 페이지의 링크 대상으로 허용하지 않음');
assert.ok(!renderedAnchors.get(path.join(docs, 'qa/screen-review.html')).has('shot-does-not-exist'), '없는 사진 링크는 거부');
assert.equal(features.length, 175);
const scopes = {};
for (const feature of features) {
  const entry = launch.forFeature(feature.id);
  assert.ok(launch.SCOPE[entry.scope], feature.id);
  assert.ok(entry.implementation && entry.automation && entry.environment, feature.id);
  scopes[entry.scope] = (scopes[entry.scope] || 0) + 1;
}
for (const id of ['N-00', 'N-07', 'N-11-POLL', 'N-08-SEASON', 'N-08-PHOTO', 'N-08-REVIEW', 'N-08-STAMP', 'N-08-EVENT-RULE']) {
  const item = launch.openItems.find(value => value.id === id);
  assert.equal(item?.impact, 'included', id);
  assert.equal(item.owner, '운영자', id);
  assert.ok(item.nextAction && item.doneWhen, id);
  assert.equal(item.readiness.work, 'environment', id);
}
assert.equal(new Set(launch.openItems.map(item => item.id)).size, launch.openItems.length, '중복 작업 식별자');
for (const item of launch.openItems) {
  assert.equal(item.owner, '운영자', item.id);
  for (const field of ['implementation', 'automation', 'environment', 'input', 'work']) {
    assert.ok(item.readiness?.[field]?.trim(), `${item.id}: ${field}`);
  }
  assert.ok(launch.WORK[item.readiness.work], item.id);
  assert.ok(item.nextAction?.trim() && item.doneWhen?.trim(), item.id);
  if (item.readiness.work === 'development') {
    assert.equal(item.implementationReady, false, `${item.id}: 미구현을 구현 완료로 표시하면 안 됨`);
    assert.equal(item.impact, item.id === 'N-07' ? 'included' : 'next', `${item.id}: 기존 출시 범위와 추가 개발 상태를 따로 유지`);
  }
}
assert.equal(launch.openItems.find(item => item.id === 'N-12-CALENDAR').readiness.work, 'environment');
for (const id of ['N-03', 'N-10', 'N-13-BANK']) {
  assert.equal(launch.openItems.find(item => item.id === id).readiness.work, 'development', id);
}
assert.equal(launch.forFeature('F08-06').developmentItems.length, 1, '기간권 편성·판매 시작은 상품 관리의 추가 개발');
assert.equal(launch.forFeature('F01-02').developmentItems.length, 1, '추가 로그인 실패 집계·화면');
for (const id of ['F03-14', 'F03-15', 'F03-16', 'F03-17']) {
  assert.equal(launch.forFeature(id).developmentItems.length, 0, `${id}: 연결한 차량 조율의 실제 이용 미확인을 미구현으로 표시하지 않음`);
}
for (const id of ['F03-14', 'F03-15', 'F03-16', 'F03-17']) {
  assert.equal(launch.forFeature(id).proof, 'local', `${id}: 시험 세션의 웹 검사를 일반 가입·휴대전화 검사로 확대하지 않음`);
  assert.match(launch.forFeature(id).environment, /휴대전화·실제 푸시 미확인/);
}
const transport = launch.openItems.find(item => item.id === 'N-07');
assert.equal(transport.implementationReady, true, '신규 조율의 코드 연결과 실제 이용 확인을 구분');
assert.equal(transport.operationsReady, false, '실제 이용·실차 대조를 완료로 올리지 않음');
assert.equal(transport.readiness.work, 'environment');
assert.match(transport.readiness.implementation, /서버와 앱 연결/, '연결한 명단·배정·조정 요청을 미구현으로 되돌리지 않음');
assert.match(transport.readiness.automation, /소스 검수 24개 통과/, '소스 판정을 실제 이용 판정과 구분');
assert.match(transport.readiness.automation, /추가 웹 시나리오 6개.*실제 앱·관리자 화면과 서버·데이터베이스.*통과/, '새 여섯 경로의 확인 방법과 결과');
assert.match(transport.readiness.automation, /통합 전 전체 자동 검사를 실행했고.*실패 항목은 수정 후.*재검사해 통과/, '최초 전체 실행과 실패 수정 뒤 재검사를 구분');
assert.match(transport.readiness.implementation, /의견·처리 사유 소거와 분쟁 보존·재처리 연결/, '구현한 문구 소거·분쟁 보존·재처리를 미구현으로 되돌리지 않음');
assert.match(transport.readiness.implementation, /탈퇴자 신규 배정·지원 확정 차단 연결/, '신규 대상 계정 검사를 미구현으로 되돌리지 않음');
assert.match(transport.readiness.automation, /합성 도면은 실차 검증이 아니다/, '합성 도면을 실차 사용 승인으로 올리지 않음');
assert.match(transport.readiness.implementation, /교체/, '서버·화면에 연결한 교체 기능을 미구현으로 되돌리지 않음');
assert.doesNotMatch(transport.nextAction, /이관|백필|백업/, '기존 데이터 작업을 차량 조율의 남은 행동으로 다시 만들지 않음');
assert.match(transport.nextAction, /도면 후보 4종.*실제 차량/);
assert.match(transport.readiness.implementation, /제조사 도면 후보 4종 준비/, '좌표 데이터 준비와 실제 차량 확인을 구분');
assert.doesNotMatch(transport.nextAction, /배정 해제|참가 종료|모임 종료/, '통과한 웹 경로를 남은 행동에 다시 넣지 않음');
assert.match(transport.doneWhen, /개별 검사 전체 통과 뒤 변경 범위 전체 시나리오를 한 번/);
assert.match(transport.doneWhen, /최종 커밋 직전/);
assert.equal(tour.shots.filter(shot => shot.group === 'transport' && shot.showcase).length, 0, '예전 직접 선택·자동 자차 복귀 사진은 현재 기능 소개에서 제외');
assert.ok(!tourCoverage.blocked.includes('F03-15'), '고친 카풀 화면을 계속 촬영 차단으로 표시하지 않음');
for (const id of ['F08-09', 'F08-12', 'F08-14']) {
  assert.equal(launch.forFeature(id).developmentItems.length, 0, '기간권 판매 개발을 기존 검색·보유함·환불의 미구현으로 확대하지 않음');
}
assert.ok(!launch.gates.some(gate => /투표.*열지 않는다/.test(gate.detail)), '투표는 첫 출시 포함');
assert.ok(!/첫 출시 범위가 아니/.test(launch.forFeature('F03-03').proofNote), '직접 송금은 첫 출시 포함');
for (const id of ['F03-14', 'F03-15', 'F03-16', 'F03-17']) {
  assert.equal(launch.forFeature(id).scope, 'open', id);
}
assert.equal(launch.forFeature('F03-13').scope, 'partial', '직접 송금만 제공하고 지갑 결제는 닫는다');
for (const id of ['F06-02', 'F08-07', 'F09-03', 'F21-01']) {
  assert.equal(launch.forFeature(id).scope, 'sealed', id);
}

// 이 페이지들은 방문 기록이 아니라 현재 상태를 설명한다. 로컬 파일과 실제 절을 확인한다.
const pages = execFileSync('git', ['ls-files', '-z', '--', 'docs/*.html'], { cwd: path.dirname(docs), encoding: 'utf8' })
  .split('\0').filter(Boolean).map(file => file.replace(/^docs\//, ''));
let checkedLinks = 0;
for (const page of pages) {
  const source = fs.readFileSync(path.join(docs, page), 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const hrefs = Array.from(source.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g), match => match[1]);
  if (page === 'qa/launch-status.html') {
    launch.openItems.forEach(item => {
      if (item.docPath) hrefs.push('../' + item.docPath);
      (item.features || []).forEach(id => hrefs.push('../features/' + id + '.html'));
    });
  }
  for (const href of hrefs) {
    if (/^(https?:|mailto:|javascript:)/.test(href)) continue;
    const [relative, fragment] = href.split('#');
    const destination = relative.split('?')[0];
    const target = destination ? path.resolve(docs, path.dirname(page), destination) : path.join(docs, page);
    assert.ok(target.startsWith(docs), `${page} → ${href}: 공개 문서 폴더 밖은 사이트에서 열리지 않음`);
    assert.ok(fs.existsSync(target), `${page} → ${href}`);
    if (fragment && target.endsWith('.html')) {
      const anchor = decodeURIComponent(fragment);
      const targetSource = fs.readFileSync(target, 'utf8');
      assert.ok(renderedAnchors.get(target)?.has(anchor) || targetSource.includes(`id="${anchor}"`), `${page} → ${href}`);
    }
    checkedLinks++;
  }
}
console.log(JSON.stringify({ scopes, included: scopes.open + scopes.partial, classifiedTasks: launch.openItems.length, pages: pages.length, checkedLinks }, null, 2));
