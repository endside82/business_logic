import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { API_REPO, Kind, loadApiModules } from './api_modules.mjs';

// 공개 자바 도우미 SourceModules 와 같은 계약을 임시 저장소 모양으로 본다.
function repo(t, { list, folders = [], files = [], rootSrc = false, settings = true }) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'api-modules-test-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, API_REPO);
  fs.mkdirSync(root, { recursive: true });
  if (settings) fs.writeFileSync(path.join(root, 'settings.gradle'), '');
  if (list !== undefined) fs.writeFileSync(path.join(root, 'modules.txt'), list);
  for (const folder of folders) fs.mkdirSync(path.join(root, folder), { recursive: true });
  if (rootSrc) fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), '');
  }
  return { workspace, root };
}

test('목록이 없으면 저장소 뿌리 `.` 하나가 boot 이고, 위로 settings.gradle 을 찾는다', (t) => {
  const { workspace, root } = repo(t, { files: ['src/main/java/a/A.java'] });
  const modules = loadApiModules(path.join(root, 'src'));
  assert.deepEqual(modules.modules.map((m) => [m.name, m.boot]), [['.', true]]);
  assert.equal(modules.root, root);
  assert.equal(loadApiModules(workspace).root, root);
  assert.equal(modules.repoPath(modules.file('a/A.java', Kind.MAIN_JAVA)), 'community_api/src/main/java/a/A.java');
});

test('두 모듈 목록에서 한 파일 찾기는 어느 모듈이든 하나만 허락하고 저장소 상대 경로로 되돌린다', (t) => {
  const { root } = repo(t, {
    list: '# 설명\n\napi-app\tboot\ndomain\n',
    folders: ['api-app', 'domain'],
    files: ['domain/src/main/java/a/A.java', 'api-app/src/main/java/a/B.java', 'api-app/src/test/java/a/BTest.java', 'domain/src/testFixtures/java/a/F.java'],
  });
  const modules = loadApiModules(root);
  assert.equal(modules.bootModule().name, 'api-app');
  assert.equal(modules.repoPath(modules.file('a/A.java', Kind.MAIN_JAVA)), 'community_api/domain/src/main/java/a/A.java');
  assert.equal(modules.fromRepoPath('community_api/domain/src/main/java/a/A.java'), path.join(root, 'domain/src/main/java/a/A.java'));
  assert.throws(() => modules.file('a/A.java', Kind.TEST_JAVA), /정확히 하나 찾아야 하는데 0 개다/);
  assert.throws(() => modules.fromRepoPath('community_api/../x'), /공개 저장소 상대 경로가 아니다/);
  assert.throws(() => modules.file('a/A.java'), /종류\(Kind\)를 하나 이상/);
  const tests = modules.walk((file) => file.endsWith('.java'), [modules.bootModule()], Kind.TEST_JAVA, Kind.TEST_FIXTURES_JAVA);
  assert.deepEqual(tests.map((file) => modules.repoPath(file)), ['community_api/api-app/src/test/java/a/BTest.java', 'community_api/domain/src/testFixtures/java/a/F.java']);
});

test('같은 파일이 두 모듈에 있으면 실패한다', (t) => {
  const { root } = repo(t, { list: 'api-app\tboot\ndomain\n', folders: ['api-app', 'domain'], files: ['domain/src/main/java/a/A.java', 'api-app/src/main/java/a/A.java'] });
  assert.throws(() => loadApiModules(root).file('a/A.java', Kind.MAIN_JAVA), /정확히 하나 찾아야 하는데 2 개다/);
});

test('훑기는 비면 안 되는 모듈이 비면 실패하고 목록 밖 모듈은 거부한다', (t) => {
  const { root } = repo(t, { list: 'api-app\tboot\ndomain\n', folders: ['api-app', 'domain'], files: ['domain/src/test/java/a/ATest.java'] });
  const modules = loadApiModules(root);
  const [app, domain] = modules.modules;
  assert.throws(() => modules.walk(() => true, [app], Kind.TEST_JAVA), /\[api-app\] 에 맞는 파일이 하나도 없다/);
  assert.equal(modules.walk(() => true, [domain], Kind.TEST_JAVA).length, 1);
  assert.throws(() => modules.walk(() => true, [], Kind.TEST_JAVA), /비면 안 되는 모듈을 하나 이상/);
  assert.throws(() => modules.walk(() => true, [{ name: 'x' }], Kind.TEST_JAVA), /모듈 목록에 없는 모듈이다: x/);
});

// 음성 표본: 각각 자바 도우미와 같은 이유로 실패한다.
const negatives = [
  ['빈 목록', { list: '# 설명뿐\n' }, /에 설명 말고 모듈 줄이 없다/],
  ['없는 폴더', { list: '.\tboot\nghost\n' }, /적힌 모듈 폴더가 없다: .*ghost/],
  ['중복', { list: '.\tboot\n.\n' }, /같은 모듈이 두 줄이다: \./],
  ['boot 없음', { list: '.\n' }, /boot 줄은 정확히 하나여야 하는데 0 개다/],
  ['boot 둘', { list: 'a\tboot\nb\tboot\n', folders: ['a', 'b'] }, /boot 줄은 정확히 하나여야 하는데 2 개다/],
  ['줄 꼴', { list: '.\tmain\n' }, /줄 꼴은 `<폴더>`, `<폴더><탭>boot`, `<폴더><탭>admin` 가운데 하나다/],
  ['셋 칸', { list: '.\tboot\textra\n' }, /줄 꼴은/],
  ['`.` 없는데 뿌리 src 남음', { list: 'api-app\tboot\n', folders: ['api-app'], rootSrc: true }, /에 `\.` 이 없는데 저장소 뿌리에 옛 소스 .* 가 남아 있다/],
  ['settings.gradle 없음', { settings: false }, /settings\.gradle 이 있는 저장소 뿌리를 .* 위로 찾지 못했다/],
];
for (const [name, spec, message] of negatives) {
  test(`음성 표본: ${name}`, (t) => {
    const { root } = repo(t, spec);
    assert.throws(() => loadApiModules(root), message);
  });
}

test('N4h 옆 공개 저장소가 있으면 실제 모듈 목록을 읽고 main 자바와 boot 모듈을 찾는다', (t) => {
  const workspace = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  if (!fs.existsSync(path.join(workspace, API_REPO, 'settings.gradle'))) return t.skip('옆 공개 저장소가 없다');
  const modules = loadApiModules(workspace);
  assert.equal(modules.modules.filter((m) => m.boot).length, 1);
  const main = modules.walk((file) => file.endsWith('Controller.java'), [modules.bootModule()], Kind.MAIN_JAVA);
  assert.ok(main.length > 0);
});

test('admin 줄을 받는다: 찾기에는 들고 훑기에서는 뺀다(AM11·AM13)', (t) => {
  const { root } = repo(t, {
    list: 'domain\napi-app\tboot\nadmin-app\tadmin\n',
    folders: ['domain', 'api-app', 'admin-app'],
    files: ['domain/src/main/java/a/A.java', 'admin-app/src/main/java/a/Adm.java', 'api-app/src/main/java/a/B.java'],
  });
  const modules = loadApiModules(root);
  assert.equal(modules.adminModule().name, 'admin-app');
  assert.equal(modules.bootModule().name, 'api-app');
  assert.deepEqual(modules.modules.map((m) => m.name), ['domain', 'api-app', 'admin-app']);
  assert.equal(modules.repoPath(modules.file('a/Adm.java', Kind.MAIN_JAVA)), 'community_api/admin-app/src/main/java/a/Adm.java');
  const all = modules.walk((file) => file.endsWith('.java'), modules.modules, Kind.MAIN_JAVA);
  assert.deepEqual(all.map((file) => modules.repoPath(file)), ['community_api/domain/src/main/java/a/A.java', 'community_api/api-app/src/main/java/a/B.java']);
  assert.throws(() => modules.walk(() => true, [modules.adminModule()], Kind.MAIN_JAVA), /관리자 모듈 \[admin-app\] 을 보지 않는다/);
});

test('admin 줄이 없으면 adminModule 은 없고, 둘이거나 모르는 값이면 오류다(AM11)', (t) => {
  const none = repo(t, { list: 'api-app\tboot\n', folders: ['api-app'] });
  assert.equal(loadApiModules(none.root).adminModule(), undefined);
  assert.equal(loadApiModules(repo(t, {}).root).adminModule(), undefined);
  const two = repo(t, { list: 'api-app\tboot\na\tadmin\nb\tadmin\n', folders: ['api-app', 'a', 'b'] });
  assert.throws(() => loadApiModules(two.root), /admin 줄은 많아야 하나인데 2 개다/);
  const unknown = repo(t, { list: 'api-app\tboot\na\tadmim\n', folders: ['api-app', 'a'] });
  assert.throws(() => loadApiModules(unknown.root), /줄 꼴은/);
});
