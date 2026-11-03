// 공개 API 소스 읽기 도우미. 공개 저장소 뿌리의 모듈 목록(modules.txt)을 읽어 소스 파일을 찾는다.
// 계약과 실패 문구 꼴은 공개 자바 도우미 com.endside.community.common.testsupport.SourceModules 를 따른다.
// 소스 경로(com/…/X.java 처럼 종류 뿌리 기준)로 파일 하나를 찾거나 종류 뿌리를 훑을 때 쓰고,
// community_api/src/main/java/… 같은 모듈 앞 경로를 대본에 적지 않는다.
import fs from 'node:fs';
import path from 'node:path';

export const API_REPO = 'community_api';
export const LIST_FILE = 'modules.txt';

export const Kind = Object.freeze({
  MAIN_JAVA: 'src/main/java',
  MAIN_RESOURCES: 'src/main/resources',
  TEST_JAVA: 'src/test/java',
  TEST_RESOURCES: 'src/test/resources',
  TEST_FIXTURES_JAVA: 'src/testFixtures/java',
  TEST_FIXTURES_RESOURCES: 'src/testFixtures/resources',
});

const kindNames = (kinds) => `[${kinds.map((kind) => Object.keys(Kind).find((name) => Kind[name] === kind) ?? kind).join(', ')}]`;
const exists = (target) => fs.existsSync(target);
const isFile = (target) => fs.statSync(target, { throwIfNoEntry: false })?.isFile() ?? false;
const isDirectory = (target) => fs.statSync(target, { throwIfNoEntry: false })?.isDirectory() ?? false;

function requireKinds(kinds) {
  if (!kinds.length) throw new Error('찾을 종류(Kind)를 하나 이상 넘긴다');
  for (const kind of kinds) {
    if (!Object.values(Kind).includes(kind)) throw new Error('알 수 없는 종류(Kind)다: ' + kind);
  }
}

function parse(root, list) {
  const lines = fs.readFileSync(list, 'utf8').split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  const modules = [];
  const names = new Set();
  lines.forEach((line, index) => {
    if (!line.trim() || line.startsWith('#')) return;
    const where = `${list}:${index + 1} `;
    const cells = line.split('\t');
    const role = cells.length === 2 ? cells[1] : null;
    if (cells.length > 2 || ![null, 'boot', 'admin'].includes(role)) {
      throw new Error(`${where}줄 꼴은 \`<폴더>\`, \`<폴더><탭>boot\`, \`<폴더><탭>admin\` 가운데 하나다: ${line}`);
    }
    const boot = role === 'boot';
    const admin = role === 'admin';
    const name = cells[0];
    if (names.has(name)) throw new Error(`${where}같은 모듈이 두 줄이다: ${name}`);
    names.add(name);
    const dir = name === '.' ? root : path.resolve(root, name);
    if (!isDirectory(dir)) throw new Error(`${where}적힌 모듈 폴더가 없다: ${dir}`);
    modules.push({ name, dir, boot, admin });
  });
  if (!modules.length) throw new Error(`${list} 에 설명 말고 모듈 줄이 없다`);
  const boots = modules.filter((module) => module.boot).length;
  if (boots !== 1) throw new Error(`${list} 의 boot 줄은 정확히 하나여야 하는데 ${boots} 개다`);
  const admins = modules.filter((module) => module.admin).map((module) => module.name);
  if (admins.length > 1) throw new Error(`${list} 의 admin 줄은 많아야 하나인데 ${admins.length} 개다: [${admins.join(', ')}]`);
  if (!names.has('.') && exists(path.join(root, 'src'))) {
    throw new Error(`${list} 에 \`.\` 이 없는데 저장소 뿌리에 옛 소스 ${path.join(root, 'src')} 가 남아 있다`);
  }
  return modules;
}

function visit(base, relative, filter, found) {
  for (const entry of fs.readdirSync(path.join(base, relative), { withFileTypes: true })) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) visit(base, child, filter, found);
    else if (entry.isFile() && filter(child)) found.push(path.join(base, child));
  }
}

// start 는 공개 저장소 안의 폴더이거나 작업 공간 뿌리다. settings.gradle 이 있는 저장소 뿌리를 위로 찾는다.
export function loadApiModules(start) {
  const from = path.resolve(start);
  let root = isDirectory(path.join(from, API_REPO)) ? path.join(from, API_REPO) : from;
  while (!isFile(path.join(root, 'settings.gradle'))) {
    const parent = path.dirname(root);
    if (parent === root) throw new Error(`settings.gradle 이 있는 저장소 뿌리를 ${from} 에서 위로 찾지 못했다`);
    root = parent;
  }
  const list = path.join(root, LIST_FILE);
  const modules = exists(list) ? parse(root, list) : [{ name: '.', dir: root, boot: true, admin: false }];
  return new ApiModules(root, modules);
}

export class ApiModules {
  constructor(root, modules) {
    this.root = root;
    this.modules = modules;
  }

  bootModule() {
    return this.modules.find((module) => module.boot);
  }

  // admin 줄의 관리자 모듈. 그 줄이 없으면(목록 파일이 없을 때도) undefined.
  adminModule() {
    return this.modules.find((module) => module.admin);
  }

  kindRoot(module, kind) {
    return path.join(module.dir, kind);
  }

  // 종류 뿌리 기준 상대 경로로 파일 하나를 모든 모듈에서 찾는다. 정확히 하나가 아니면 실패한다.
  file(relativePath, ...kinds) {
    requireKinds(kinds);
    const found = [];
    for (const module of this.modules) {
      for (const kind of kinds) {
        const candidate = path.join(this.kindRoot(module, kind), relativePath);
        if (isFile(candidate)) found.push(candidate);
      }
    }
    if (found.length !== 1) {
      throw new Error(`${relativePath} 을 ${kindNames(kinds)} 에서 정확히 하나 찾아야 하는데 ${found.length} 개다: `
        + `[${found.map((file) => path.relative(this.root, file)).join(', ')}] (모듈 목록 `
        + `[${this.modules.map((module) => module.name).join(', ')}], 저장소 뿌리 ${this.root})`);
    }
    return found[0];
  }

  // 공개 소스 훑기: 관리자 모듈(admin 줄)을 뺀 모든 모듈의 종류 뿌리를 훑는다(불변식 AM13). 관리자 소스는 adminModule() 의 종류 뿌리로 읽는다. filter 는 종류 뿌리 기준 상대 경로를 받는다. mustFind 모듈에 맞는 파일이 없으면 실패한다.
  walk(filter, mustFind, ...kinds) {
    requireKinds(kinds);
    if (!mustFind.length) throw new Error('비면 안 되는 모듈을 하나 이상 밝힌다(모든 모듈이면 modules)');
    for (const module of mustFind) {
      if (!this.modules.includes(module)) throw new Error('모듈 목록에 없는 모듈이다: ' + module.name);
    }
    const scanned = this.modules.filter((module) => !module.admin);
    if (!mustFind.some((module) => scanned.includes(module))) {
      throw new Error(`훑기는 관리자 모듈 [${mustFind.map((module) => module.name).join(', ')}] 을 보지 않는다. 공개 모듈을 하나 이상 밝히고, `
        + '관리자 소스는 adminModule() 의 종류 뿌리로 읽는다');
    }
    const result = [];
    const empty = [];
    for (const module of scanned) {
      const before = result.length;
      for (const kind of kinds) {
        const base = this.kindRoot(module, kind);
        if (!isDirectory(base)) continue;
        const found = [];
        visit(base, '', filter, found);
        result.push(...found.sort());
      }
      if (result.length === before && mustFind.includes(module)) empty.push(module.name);
    }
    if (empty.length) {
      throw new Error(`${kindNames(kinds)} 훑기에서 비면 안 되는 모듈 [${empty.join(', ')}] 에 맞는 파일이 하나도 없다(모듈 목록 `
        + `[${this.modules.map((module) => module.name).join(', ')}])`);
    }
    return result;
  }

  // 찾은 파일의 작업 공간 기준 저장소 상대 경로(community_api/…). 링크와 감사 자료가 쓴다.
  repoPath(file) {
    const relative = path.relative(this.root, path.resolve(file)).split(path.sep).join('/');
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(file + ' 은 공개 저장소 밖이다');
    return `${API_REPO}/${relative}`;
  }

  // repoPath 의 거꾸로. community_api/… 꼴을 실제 파일 경로로 푼다.
  fromRepoPath(repoPath) {
    const prefix = `${API_REPO}/`;
    if (!repoPath.startsWith(prefix) || repoPath.split('/').includes('..')) {
      throw new Error('공개 저장소 상대 경로가 아니다: ' + repoPath);
    }
    return path.join(this.root, repoPath.slice(prefix.length));
  }
}
