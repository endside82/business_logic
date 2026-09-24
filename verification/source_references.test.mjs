import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseController, resolveReferences } from './source_references.mjs';

const file = 'community_api/src/main/java/example/AuthController.java';
const source = `@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    // @GetMapping("/not-a-real-api")
    @PostMapping("/signup")
    public ResponseEntity<LoginVo> signup(@RequestBody SignupParam body) { return null; }

    @PostMapping(path = "/login", consumes = "application/json")
    public ResponseEntity<LoginVo> login(@RequestBody LoginParam body) { return null; }
}`;
const login = { targetPath: file, controller: 'AuthController', method: 'login', httpMethod: 'POST', httpPath: '/api/v1/auth/login' };
const reference = { id: 'example:1', status: 'active', bindings: [login] };
function fixture(t, text) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-reference-test-'));
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('주석은 제외하고 클래스 주소·전체 경로·함수·정확한 선언 줄을 얻는다', () => {
  const endpoints = parseController(source, file);
  assert.equal(endpoints.length, 2);
  assert.deepEqual(endpoints[1], { ...login, targetLine: 8, methodLine: 9 });
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
  assert.throws(() => resolveReferences(root, [{ ...reference, bindings: [{ ...login, targetPath: file.replace('Auth', 'Missing') }] }]), /ENOENT/);
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
  const [retired] = resolveReferences('/missing-workspace', [{ id: 'retired:1', status: 'retired', bindings: [], note: '제품 결정으로 제거' }]);
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
