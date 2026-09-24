#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveReferences } from './source_references.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const workspace = path.resolve(root, '..');
const targets = JSON.parse(fs.readFileSync(new URL('./source_reference_targets.json', import.meta.url), 'utf8')).references;
const references = resolveReferences(workspace, targets);
const sourceRoot = path.join(workspace, 'community_api');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim();
const sourceFiles = [...new Set(references.flatMap((reference) => reference.endpoints.map((endpoint) =>
  endpoint.targetPath.slice('community_api/'.length),
)))];
const changedSources = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', ...sourceFiles], {
  cwd: sourceRoot, encoding: 'utf8',
}).trim();
if (changedSources) throw new Error('참조할 서버 파일에 미커밋 변경이 있습니다. 버전 고정 링크를 만들지 않습니다.');
const groups = Map.groupBy(references, (reference) => reference.documentPath);
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const updates = [];
let localUpdates = 0;
for (const [documentPath, group] of groups) {
  const absolute = path.join(workspace, documentPath);
  const text = fs.readFileSync(absolute, 'utf8');
  const unique = new Map(group.flatMap((reference) => reference.endpoints).map((endpoint) =>
    [endpoint.targetPath + '#' + endpoint.method + ' ' + endpoint.httpMethod + ' ' + endpoint.httpPath, endpoint],
  ));
  let block = '<!-- source-references:start -->\n### 확인한 서버 코드 위치\n\n';
  if (unique.size) {
    block += `${date}에 파일·처리 함수·HTTP 메서드·전체 호출 주소를 실제 서버 선언과 대조했다. ` +
      '아래 링크는 확인한 코드 버전에 고정되어 있다. 위치 확인은 동작 테스트 통과나 아래 상세 계약 전체의 검증을 뜻하지 않는다.\n\n';
    block += '| 호출 주소 | 처리 함수 | 확인한 코드 위치 |\n|---|---|---|\n';
    for (const endpoint of unique.values()) {
      const source = endpoint.targetPath.slice('community_api/'.length);
      const url = `https://github.com/endside82/community_api/blob/${revision}/${source}#L${endpoint.targetLine}`;
      block += `| \`${endpoint.httpMethod} ${endpoint.httpPath}\` | \`${endpoint.controller}#${endpoint.method}\` | [${path.basename(source)}:${endpoint.targetLine}](${url}) |\n`;
    }
    const notes = [...new Set(group.map((reference) => reference.note).filter(Boolean))];
    if (notes.length) block += '\n' + notes.map((note) => '- ' + note).join('\n') + '\n';
  } else {
    block += '**설계 철회 — 현행 코드 링크 없음.** 타 사용자 가용시간 조회의 두 옛 기록은 삭제된 같은 파일을 가리킨다. 복구 대상이 아니며 현재 구현 근거에서 제외한다.\n';
  }
  block += '<!-- source-references:end -->';
  let updated;
  if (text.includes('<!-- source-references:start -->')) {
    updated = text.replace(/<!-- source-references:start -->[\s\S]*?<!-- source-references:end -->/, block);
  } else {
    const heading = /^### (?:확인된 소스 trace|철회 전 코드 위치 기록)\s*$/m.exec(text);
    if (!heading) throw new Error('교체할 코드 위치 표를 찾지 못함: ' + documentPath);
    const afterHeading = text.slice(heading.index + heading[0].length);
    const nextHeading = /^#{1,3} /m.exec(afterHeading);
    const end = nextHeading ? heading.index + heading[0].length + nextHeading.index : text.length;
    updated = text.slice(0, heading.index) + block + '\n\n' + text.slice(end);
  }
  if (updated !== text) updates.push({ absolute, updated });
}
const identities = new Map(references.flatMap((reference) => reference.endpoints).map((endpoint) =>
  [endpoint.targetPath + ' ' + endpoint.controller + '#' + endpoint.method + ' ' + endpoint.httpMethod + ' ' + endpoint.httpPath, endpoint],
));
for (const backendPath of new Set(targets.map((target) => target.backendPath))) {
  const absolute = path.join(workspace, backendPath);
  if (!fs.existsSync(absolute)) continue; // 로컬 전용 자료는 Git 저장소에 포함되지 않는다.
  const text = fs.readFileSync(absolute, 'utf8');
  const updated = text.replace(/<!-- traces: ([^\n]+):(\d+) -->\n<!-- source-target: (\w+#\w+) (GET|POST|PATCH|PUT|DELETE) ([^\n]+) -->/g,
    (match, file, line, method, verb, route) => {
      const endpoint = identities.get(file + ' ' + method + ' ' + verb + ' ' + route);
      if (!endpoint) throw new Error('로컬 기록의 함수·주소를 확인할 수 없음: ' + backendPath);
      return match.replace(file + ':' + line, file + ':' + endpoint.targetLine);
    });
  if (updated !== text) { updates.push({ absolute, updated }); localUpdates += 1; }
}
if (process.argv.includes('--write')) {
  for (const update of updates) fs.writeFileSync(update.absolute, update.updated);
  console.log(`요구사항 문서 ${updates.length - localUpdates}개·로컬 개발 메모 ${localUpdates}개 교정 (검사한 요구사항 문서 ${groups.size}개).`);
} else if (updates.length) {
  console.error(`코드 위치 표 ${updates.length}개가 실제 소스와 다릅니다. --write로 갱신하세요.`);
  process.exitCode = 1;
} else {
  console.log(`코드 위치 표 ${groups.size}개가 실제 소스와 일치합니다.`);
}
