#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveReferences } from './source_references.mjs';
import { API_REPO, loadApiModules } from './api_modules.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const workspace = path.resolve(root, '..');
const targets = JSON.parse(fs.readFileSync(new URL('./source_reference_targets.json', import.meta.url), 'utf8')).references;
const apiModules = loadApiModules(path.join(workspace, API_REPO));
const references = resolveReferences(apiModules, targets);
const groups = Map.groupBy(references, (reference) => reference.documentPath);
const updates = [];
let localUpdates = 0;
for (const [documentPath, group] of groups) {
  const absolute = path.join(workspace, documentPath);
  const text = fs.readFileSync(absolute, 'utf8');
  const unique = new Map(group.flatMap((reference) => reference.endpoints).map((endpoint) =>
    [endpoint.targetPath + '#' + endpoint.method + ' ' + endpoint.httpMethod + ' ' + endpoint.httpPath, endpoint],
  ));
  // 표에 줄 번호와 고정 링크를 적으면 코드가 움직일 때마다 낡는다. 처리 함수 이름 한 줄만 적고, 함수·주소 대조는 대상 목록으로 한다.
  let block = '<!-- source-references:start -->\n';
  if (unique.size) {
    const handlers = [...new Set([...unique.values()].map((endpoint) => `\`${endpoint.controller}#${endpoint.method}\``))];
    block += `서버 창구: ${handlers.join(', ')}. 함수·주소 대조는 \`verification/source_reference_targets.json\` 이 한다.\n`;
    const notes = [...new Set(group.map((reference) => reference.note).filter(Boolean))];
    if (notes.length) block += notes.map((note) => '- ' + note).join('\n') + '\n';
  } else {
    block += '**설계 철회.** 타 사용자 가용시간 조회의 두 옛 기록은 삭제된 같은 파일을 가리킨다. 복구 대상이 아니며 현재 구현 근거에서 제외한다.\n';
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
// 파일이 같은 꾸러미 경로째 다른 모듈로 옮겨졌으면(2026-11-01 공개 API 를 domain·api-app 으로 나눔) 저장소 안 자리만 다르다.
// 같은 자바 파일(src/main/java 아래 경로)·함수·주소의 위치가 하나뿐일 때만 그 자리로 옮겨 적는다(원래 결함 K6).
const sourceRelative = (file) => file.slice(file.indexOf('/src/main/java/') + 1);
const moved = Map.groupBy(identities.values(), (endpoint) =>
  sourceRelative(endpoint.targetPath) + ' ' + endpoint.controller + '#' + endpoint.method + ' ' + endpoint.httpMethod + ' ' + endpoint.httpPath);
for (const backendPath of new Set(targets.map((target) => target.backendPath))) {
  const absolute = path.join(workspace, backendPath);
  if (!fs.existsSync(absolute)) continue; // 로컬 전용 자료는 Git 저장소에 포함되지 않는다.
  const text = fs.readFileSync(absolute, 'utf8');
  const updated = text.replace(/<!-- traces: ([^\n]+):(\d+) -->\n<!-- source-target: (\w+#\w+) (GET|POST|PATCH|PUT|DELETE) ([^\n]+) -->/g,
    (match, file, line, method, verb, route) => {
      let endpoint = identities.get(file + ' ' + method + ' ' + verb + ' ' + route);
      if (!endpoint) {
        const candidates = moved.get(sourceRelative(file) + ' ' + method + ' ' + verb + ' ' + route) ?? [];
        if (candidates.length === 1) endpoint = candidates[0];
      }
      if (!endpoint) throw new Error('로컬 기록의 함수·주소를 확인할 수 없음: ' + backendPath);
      return match.replace(file + ':' + line, endpoint.targetPath + ':' + endpoint.targetLine);
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
