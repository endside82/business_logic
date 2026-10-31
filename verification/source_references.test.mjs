import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseController, resolveReferences } from './source_references.mjs';
import { API_REPO, loadApiModules } from './api_modules.mjs';

const target = 'example/AuthController.java';
const file = `${API_REPO}/src/main/java/${target}`;
const source = `@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    // @GetMapping("/not-a-real-api")
    @PostMapping("/signup")
    public ResponseEntity<LoginVo> signup(@RequestBody SignupParam body) { return null; }

    @PostMapping(path = "/login", consumes = "application/json")
    public ResponseEntity<LoginVo> login(@RequestBody LoginParam body) { return null; }
}`;
const login = { targetPath: target, controller: 'AuthController', method: 'login', httpMethod: 'POST', httpPath: '/api/v1/auth/login' };
const reference = { id: 'example:1', status: 'active', bindings: [login] };
// 작업 공간 뿌리에 공개 저장소 모양을 만든다. modules 가 있으면 modules.txt 로 쓰고, file 은 그 모듈 폴더 아래 main 자바 뿌리에 둔다.
function fixture(t, text, { modules, dir = '.' } = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'source-reference-test-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, API_REPO);
  fs.mkdirSync(path.join(root, dir, 'src/main/java/example'), { recursive: true });
  fs.writeFileSync(path.join(root, 'settings.gradle'), '');
  if (modules) {
    for (const line of modules.split('\n')) fs.mkdirSync(path.join(root, line.split('\t')[0]), { recursive: true });
    fs.writeFileSync(path.join(root, 'modules.txt'), modules + '\n');
  }
  fs.writeFileSync(path.join(root, dir, 'src/main/java', target), text);
  return loadApiModules(workspace);
}

test('주석은 제외하고 클래스 주소·전체 경로·함수·정확한 선언 줄을 얻는다', () => {
  const endpoints = parseController(source, file);
  assert.equal(endpoints.length, 2);
  assert.deepEqual(endpoints[1], { ...login, targetPath: file, targetLine: 8, methodLine: 9 });
});
test('줄이 이동하면 같은 로그인 함수를 다시 찾아 새 위치를 연결한다', (t) => {
  const root = fixture(t, '\n\n' + source);
  const result = resolveReferences(root, [reference])[0];
  assert.equal(result.endpoints[0].targetLine, 10);
  assert.equal(result.endpoints[0].method, 'login');
});
test('근처의 회원가입 함수를 로그인 근거로 통과시키지 않는다', (t) => {
  const root = fixture(t, source);
  assert.throws(() => resolveReferences(root, [{ ...reference, bindings: [{ ...login, method: 'signup' }] }]), /재확인 필요/);
});
test('호출 방식·전체 주소·함수 변경과 파일 삭제는 생성을 중단한다', (t) => {
  const root = fixture(t, source);
  for (const changed of [{ httpMethod: 'GET' }, { httpPath: '/api/v1/auth/changed' }, { method: 'removed' }]) {
    assert.throws(() => resolveReferences(root, [{ ...reference, bindings: [{ ...login, ...changed }] }]), /재확인 필요/);
  }
  assert.throws(() => resolveReferences(root, [{ ...reference, bindings: [{ ...login, targetPath: target.replace('Auth', 'Missing') }] }]), /정확히 하나 찾아야 하는데 0 개다/);
});
test('클래스 경로가 없는 컨트롤러와 줄을 나눈 함수도 처리한다', () => {
  const text = `public class AuthController {
    @GetMapping("/api/v1/items/{id}")
    public ResponseEntity<Page<Item>>
        getItems(@PathVariable long id) { return null; }
  }`;
  const [endpoint] = parseController(text, file);
  assert.equal(endpoint.httpPath, '/api/v1/items/{id}');
  assert.equal(endpoint.method, 'getItems');
});
test('정의하지 않은 상수·복수 경로를 추측해서 연결하지 않는다', () => {
  for (const value of ['Routes.LOGIN', '{"/login", "/sign-in"}']) {
    assert.throws(() => parseController(source.replace('path = "/login", consumes = "application/json"', value), file));
  }
});
test('철회 기록은 코드로 연결하지 않고 사유를 보존한다', () => {
  const [retired] = resolveReferences(null, [{ id: 'retired:1', status: 'retired', bindings: [], note: '제품 결정으로 제거' }]);
  assert.deepEqual(retired.endpoints, []);
  assert.equal(retired.status, 'retired');
});
test('한 기록의 두 API를 구분하고 중복 기록 ID는 거부한다', (t) => {
  const root = fixture(t, source);
  const signup = { ...login, method: 'signup', httpPath: '/api/v1/auth/signup' };
  const [result] = resolveReferences(root, [{ ...reference, bindings: [signup, login] }]);
  assert.deepEqual(result.endpoints.map((endpoint) => endpoint.method), ['signup', 'login']);
  assert.throws(() => resolveReferences(root, [reference, reference]), /중복/);
});
test('모듈 목록이 둘이어도 어느 모듈의 파일이든 같은 모듈과 무관한 경로로 찾고 저장소 상대 경로를 낸다', (t) => {
  const root = fixture(t, source, { modules: 'api-app\tboot\ndomain', dir: 'domain' });
  const [result] = resolveReferences(root, [reference]);
  assert.equal(result.endpoints[0].targetPath, `${API_REPO}/domain/src/main/java/${target}`);
  assert.equal(result.endpoints[0].method, 'login');
});
test('같은 경로가 두 모듈에 있거나 뿌리 밖 경로면 거부한다', (t) => {
  const root = fixture(t, source, { modules: 'api-app\tboot\ndomain', dir: 'domain' });
  fs.mkdirSync(path.join(root.root, 'api-app/src/main/java/example'), { recursive: true });
  fs.writeFileSync(path.join(root.root, 'api-app/src/main/java', target), source);
  assert.throws(() => resolveReferences(root, [reference]), /정확히 하나 찾아야 하는데 2 개다/);
  for (const bad of ['../example/AuthController.java', '/example/AuthController.java']) {
    assert.throws(() => resolveReferences(root, [{ ...reference, bindings: [{ ...login, targetPath: bad }] }]), /검사 대상 밖의 서버 경로/);
  }
});
test('N4i 자료의 창구 파일 302 는 모듈과 무관한 꼴이고, 옆 공개 저장소가 있으면 같은 302 를 찾는다', (t) => {
  const targets = JSON.parse(fs.readFileSync(new URL('./source_reference_targets.json', import.meta.url), 'utf8')).references;
  const bindings = targets.flatMap((entry) => entry.bindings);
  assert.equal(bindings.length, 302);
  for (const binding of bindings) assert.match(binding.targetPath, /^com\/[\w/]+\.java$/, binding.targetPath);
  const workspace = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  if (!fs.existsSync(path.join(workspace, API_REPO, 'settings.gradle'))) return t.skip('옆 공개 저장소가 없다');
  const resolved = resolveReferences(loadApiModules(workspace), targets);
  const endpoints = resolved.flatMap((entry) => entry.endpoints);
  assert.equal(endpoints.length, 302);
  for (const endpoint of endpoints) assert.match(endpoint.targetPath, /^community_api\/(?:[\w-]+\/)?src\/main\/java\/com\//);
});
