import fs from 'node:fs';
import path from 'node:path';

// 위치를 보존하면서 주석만 가린다. 문자열 안의 URL·주석 기호는 건드리지 않는다.
export function withoutComments(source) {
  return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (part) => part.startsWith('/') ? part.replace(/[^\n]/g, ' ') : part);
}

function annotationArguments(source, offset) {
  let start = offset;
  while (/\s/.test(source[start] ?? '') && start < source.length) start += 1;
  if (source[start] !== '(') return { text: '', end: offset };
  let depth = 0;
  let quoted = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quoted && character === '\\') { index += 1; continue; }
    if (character === '"') quoted = !quoted;
    if (quoted) continue;
    if (character === '(') depth += 1;
    if (character === ')' && --depth === 0) return { text: source.slice(start + 1, index), end: index + 1 };
  }
  throw new Error('닫히지 않은 API 선언');
}

function mappingPaths(argumentsText) {
  if (!argumentsText.trim()) return [''];
  if (/^\s*\{|(?:^|,)\s*(?:value|path)\s*=\s*\{/.test(argumentsText)) {
    throw new Error('복수 경로는 명시적으로 검사기를 보완한 뒤 연결하세요: ' + argumentsText);
  }
  const pathValue = argumentsText.match(/(?:^|,)\s*(?:value|path)\s*=\s*(\{[^}]*\}|"(?:\\.|[^"\\])*")/)
    ?? argumentsText.match(/^\s*(\{[^}]*\}|"(?:\\.|[^"\\])*")/);
  if (!pathValue) throw new Error('문자열 경로가 아닌 API 선언: ' + argumentsText);
  return [...pathValue[1].matchAll(/"([^"\\]*)"/g)].map((match) => match[1]);
}

export function parseController(source, sourcePath) {
  const text = withoutComments(source);
  const classMatch = /public\s+class\s+(\w+)/.exec(text);
  if (!classMatch) return [];
  const mappings = [...text.matchAll(/@(Get|Post|Put|Patch|Delete|Request)Mapping\b/g)].map((match) => ({
    kind: match[1], index: match.index, ...annotationArguments(text, match.index + match[0].length),
  }));
  const prefixes = mappings.filter((mapping) => mapping.index < classMatch.index);
  if (prefixes.length > 1 || (prefixes.length === 1 && prefixes[0].kind !== 'Request')) {
    throw new Error('클래스 경로를 확정할 수 없음: ' + sourcePath);
  }
  const basePaths = prefixes.length ? mappingPaths(prefixes[0].text) : [''];
  const methods = mappings.filter((mapping) => mapping.index > classMatch.index);
  return methods.flatMap((mapping, index) => {
    const methodText = text.slice(mapping.end, methods[index + 1]?.index ?? text.length);
    const method = /\bpublic\s+[^;{}()]+?\s+(\w+)\s*\(/.exec(methodText);
    if (!method) throw new Error('API 처리 함수를 확정할 수 없음: ' + sourcePath + ':' + mapping.index);
    const httpMethods = mapping.kind === 'Request'
      ? [...mapping.text.matchAll(/RequestMethod\.(\w+)/g)].map((match) => match[1])
      : [mapping.kind.toUpperCase()];
    if (!httpMethods.length) throw new Error('HTTP 메서드를 확정할 수 없음: ' + sourcePath);
    return basePaths.flatMap((base) => mappingPaths(mapping.text).flatMap((suffix) =>
      httpMethods.map((httpMethod) => ({
        targetPath: sourcePath,
        controller: classMatch[1],
        method: method[1],
        httpMethod,
        httpPath: (base.replace(/\/$/, '') + '/' + suffix.replace(/^\//, '')).replace(/\/$/, '') || '/',
        targetLine: text.slice(0, mapping.index).split('\n').length,
        methodLine: text.slice(0, mapping.end + method.index).split('\n').length,
      })),
    ));
  });
}

export function resolveReferences(workspaceRoot, targets) {
  const sources = new Map();
  const ids = new Set();
  return targets.map((target) => {
    if (ids.has(target.id)) throw new Error('중복 코드 위치 기록 ID: ' + target.id);
    ids.add(target.id);
    if (target.status === 'retired') {
      if (target.bindings.length || !target.note) throw new Error('철회 기록은 근거와 빈 코드 연결이 필요함: ' + target.id);
      return { ...target, endpoints: [] };
    }
    if (target.status !== 'active') throw new Error('확정되지 않은 코드 위치 기록: ' + target.id);
    const endpoints = target.bindings.map((binding) => {
      if (!binding.targetPath.startsWith('community_api/src/main/java/') || binding.targetPath.includes('..')) {
        throw new Error('검사 대상 밖의 서버 경로: ' + binding.targetPath);
      }
      if (!sources.has(binding.targetPath)) {
        const text = fs.readFileSync(path.join(workspaceRoot, binding.targetPath), 'utf8');
        sources.set(binding.targetPath, parseController(text, binding.targetPath));
      }
      const matches = sources.get(binding.targetPath).filter((endpoint) =>
        endpoint.controller === binding.controller && endpoint.method === binding.method &&
        endpoint.httpMethod === binding.httpMethod && endpoint.httpPath === binding.httpPath,
      );
      if (matches.length !== 1) throw new Error('코드 위치 재확인 필요: ' + target.id + ' ' + JSON.stringify(binding));
      return matches[0];
    });
    if (!endpoints.length) throw new Error('현행 코드 연결이 비어 있음: ' + target.id);
    return { ...target, status: 'verified', endpoints };
  });
}
