#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveReferences } from './source_references.mjs';
import { API_REPO, Kind, loadApiModules } from './api_modules.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const businessRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(businessRoot, '..');
const outputPath = path.join(businessRoot, 'docs/assets/scenario-audit.js');
const asOf = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function walk(relativeRoot) {
  const absoluteRoot = path.join(workspaceRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files = [];
  const visit = (absolutePath) => {
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(absolutePath, entry.name);
      if (entry.isDirectory()) visit(child);
      else files.push(path.relative(workspaceRoot, child).replaceAll(path.sep, '/'));
    }
  };
  visit(absoluteRoot);
  return files;
}

function loadBrowserData(relativePath) {
  const sandbox = {
    window: {},
    location: { pathname: '' },
    document: {
      readyState: 'complete',
      getElementById: () => null,
      addEventListener: () => {},
      body: { getAttribute: () => '../' },
    },
    setTimeout: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(read(relativePath), sandbox, { filename: relativePath });
  return sandbox.window;
}

const featureWindow = loadBrowserData('business_logic/docs/assets/features.js');
const launchWindow = loadBrowserData('business_logic/docs/assets/launch-status.js');
const features = featureWindow.PRD_FEATURES;
const launchStatus = launchWindow.LAUNCH_STATUS;

if (!Array.isArray(features) || features.length !== 175) {
  throw new Error(`기능 목록이 175개가 아닙니다: ${features?.length ?? '읽기 실패'}`);
}

const unitFiles = walk('business_logic/units');
const scenarioFiles = unitFiles.filter((file) => file.endsWith('/scenarios.md'));
// 단위 문서는 이 저장소에 올리지 않는 로컬 자료다. 없는 자리에서 돌리면 모든 기능이 시나리오 0 으로 헛돌아가니 멈춘다.
if (!scenarioFiles.length) throw new Error('상세 시나리오 문서(business_logic/units/*/scenarios.md)를 하나도 읽지 못했다');
const backendFiles = unitFiles.filter((file) => file.endsWith('/backend.md'));
const referenceTargets = JSON.parse(fs.readFileSync(path.join(scriptDir, 'source_reference_targets.json'), 'utf8')).references;
const apiModules = loadApiModules(path.join(workspaceRoot, API_REPO));
const resolvedReferences = resolveReferences(apiModules, referenceTargets);

function countUnitScenarioHeadings(documentText) {
  return [...documentText.matchAll(
    /^#{2,4}\s+(?:(?:S|SC)-?\d+\b|E2E-derived\s+시나리오|시나리오\s*\d+|\d+\.\s)/gmi,
  )].length;
}

// 관리자 시험은 공개 뿌리의 관리자 모듈(modules.txt 의 admin 줄)의 시험 종류 뿌리에서 읽는다. 훑기는 관리자 모듈을 보지 않는다.
const adminModule = apiModules.adminModule();
if (!adminModule) throw new Error('모듈 목록에 관리자 모듈(admin 줄)이 없다');
const adminTestRoot = path.relative(workspaceRoot, apiModules.kindRoot(adminModule, Kind.TEST_JAVA)).split(path.sep).join('/');
if (!walk(adminTestRoot).length) throw new Error(`관리자 시험을 하나도 읽지 못했다: ${adminTestRoot} (비면 감사 자료가 관리자 시험 없이 헛돌아간다)`);

const automatedTestFiles = [
  ...apiModules.walk((file) => /(?:Test|Tests)\.java$/.test(file), [apiModules.bootModule()],
    Kind.TEST_JAVA, Kind.TEST_RESOURCES, Kind.TEST_FIXTURES_JAVA, Kind.TEST_FIXTURES_RESOURCES).map((file) => apiModules.repoPath(file)),
  ...walk('community_app/test'),
  ...walk('community_app/integration_test'),
  ...walk('community-realtime/src/test'),
  ...walk(adminTestRoot),
  ...walk('community_admin_front/e2e'),
].filter((file) =>
  /(?:Test|Tests)\.java$|_test\.dart$|\.(?:spec|test)\.[cm]?[jt]sx?$/.test(file),
);

const journeyFiles = [
  ...walk('community_app/integration_test'),
  ...walk('community_app/scripts/e2e'),
  ...walk('community_admin_front/e2e'),
].filter((file) => /_test\.dart$|\.sh$|\.md$|\.(?:spec|test)\.[cm]?[jt]sx?$/.test(file));

function buildTextIndex(files) {
  return files.map((file) => ({ file, text: read(file) }));
}

const automatedTextIndex = buildTextIndex(automatedTestFiles);
const journeyTextIndex = buildTextIndex(journeyFiles);

function filesMentioning(index, featureId) {
  return index.filter((entry) => entry.text.includes(featureId)).map((entry) => entry.file);
}

function filesReferencedByDocument(files, documentText) {
  const basenameCounts = files.reduce((counts, file) => {
    const basename = path.basename(file);
    counts.set(basename, (counts.get(basename) ?? 0) + 1);
    return counts;
  }, new Map());

  return files.filter((file) => {
    if (documentText.includes(file)) return true;
    const basename = path.basename(file);
    return basenameCounts.get(basename) === 1 && documentText.includes(basename);
  });
}

function unique(files) {
  return [...new Set(files)].sort();
}

function traceEvidence(featureId) {
  const backendPath = backendFiles.find((file) => file.includes(`/${featureId}_`));
  const entries = resolvedReferences.filter((reference) => reference.featureId === featureId)
    .map(({ id, label, status, note, endpoints }) => ({ id, label, status, note: note ?? '', endpoints }));
  return {
    backendPath: backendPath ?? null,
    total: entries.length,
    verified: entries.filter((entry) => entry.status === 'verified').length,
    retired: entries.filter((entry) => entry.status === 'retired').length,
    entries,
  };
}

// 시나리오는 단위 시나리오 문서(units/*/scenarios.md)로만 센다. 기능 PRD 는 제품 내용만 담아 시나리오 절이 없고(2026-11-07 사용자
// 결정), 기능 목록에 적힌 옛 등록 숫자도 쓰지 않는다. 단위 문서가 없는 기능은 시나리오 0 이고, 시험 연결만 기능 PRD 에 적힌 파일
// 이름으로 찾는다.
const auditFeatures = features.map((feature) => {
  const unitScenarioPath = scenarioFiles.find((file) => file.includes(`/${feature.id}_`)) ?? null;
  const scenarioPath = unitScenarioPath ?? `business_logic/prd/${feature.prdPath}`;
  const scenarioText = read(scenarioPath);
  const documentScenarioCount = unitScenarioPath ? countUnitScenarioHeadings(scenarioText) : null;
  if (documentScenarioCount === 0) {
    throw new Error(`${feature.id}의 상세 시나리오 문서 ${scenarioPath}에서 시나리오 제목을 찾지 못했습니다.`);
  }
  const automatedMarkers = filesMentioning(automatedTextIndex, feature.id);
  const automatedDocumentReferences = filesReferencedByDocument(automatedTestFiles, scenarioText);
  const journeyMarkers = filesMentioning(journeyTextIndex, feature.id);
  const journeyDocumentReferences = filesReferencedByDocument(journeyFiles, scenarioText);
  const launch = launchStatus.forFeature(feature.id);
  const journeyProof = journeyDocumentReferences.length > 0 ||
    launch.proof === 'local' || launch.proof === 'real';
  const evidenceStage = 1
    + (automatedDocumentReferences.length > 0 ? 1 : 0)
    + (journeyProof ? 1 : 0);

  return {
    id: feature.id,
    domain: feature.domain,
    name: feature.name,
    scenarioCount: documentScenarioCount ?? 0,
    scenarioSource: unitScenarioPath ? '상세 시나리오 문서' : '상세 시나리오 문서 없음',
    scenarioPath,
    publishedDocumentPath: `business_logic/prd/${feature.prdPath}`,
    scenarioDefinition: {
      formal: unitScenarioPath != null,
      documentScenarioCount,
    },
    trace: traceEvidence(feature.id),
    automated: {
      // 완료 근거에는 시나리오 문서가 직접 지목한 테스트만 사용한다. 테스트 안의 기능 번호는
      // 번호 재사용·이동 때문에 오탐이 가능하므로 별도 후보로만 제공한다.
      directlyLinked: automatedDocumentReferences.length > 0,
      count: automatedDocumentReferences.length,
      featureMarkerCount: automatedMarkers.length,
      scenarioReferenceCount: automatedDocumentReferences.length,
      files: unique(automatedDocumentReferences).slice(0, 6),
      markerCandidateFiles: unique(automatedMarkers).slice(0, 6),
    },
    journey: {
      directlyLinked: journeyDocumentReferences.length > 0,
      count: journeyDocumentReferences.length,
      featureMarkerCount: journeyMarkers.length,
      scenarioReferenceCount: journeyDocumentReferences.length,
      files: unique(journeyDocumentReferences).slice(0, 6),
      markerCandidateFiles: unique(journeyMarkers).slice(0, 6),
    },
    evidenceStage,
    launchScope: launch.scope,
    proof: launch.proof,
    knownIssues: launch.issues,
    pendingReview: launch.pending,
  };
});

const traceTotals = auditFeatures.reduce(
  (sum, feature) => ({
    total: sum.total + feature.trace.total,
    verified: sum.verified + feature.trace.verified,
    retired: sum.retired + feature.trace.retired,
  }),
  { total: 0, verified: 0, retired: 0 },
);

if (traceTotals.total !== referenceTargets.length) throw new Error('기능 목록에 연결되지 않은 코드 위치 기록이 있습니다.');
const sourceFiles = unique(resolvedReferences.flatMap((reference) => reference.endpoints).map((endpoint) => endpoint.targetPath));
if (sourceFiles.some((file) => !file.startsWith('community_api/'))) {
  throw new Error('소스 위치 검사 대상 저장소가 추가됐습니다. 버전 기록과 링크 생성을 먼저 보완하세요.');
}
const sourceRoot = apiModules.root;
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim();
const sourceChanges = execFileSync('git', [
  'status', '--porcelain', '--untracked-files=all', '--', ...sourceFiles.map((file) => file.slice('community_api/'.length)),
], { cwd: sourceRoot, encoding: 'utf8' }).trim();

const documentedScenarioItems = auditFeatures.reduce((sum, feature) => sum + feature.scenarioCount, 0);
const unitScenarioDocuments = auditFeatures.filter((feature) =>
  feature.scenarioDefinition.documentScenarioCount != null,
).length;

const payload = {
  asOf,
  sourceReferenceCheck: {
    method: 'exact-controller-method-and-http-route',
    endpointIdentityChecked: true,
    sourceRevision: sourceChanges ? null : sourceRevision,
  },
  countingNote: `시나리오 ${documentedScenarioItems.toLocaleString('ko-KR')}개는 상세 시나리오 문서 ${unitScenarioDocuments}개에서 식별한 제목 수이고, 상세 시나리오 문서가 없는 기능 ${auditFeatures.length - unitScenarioDocuments}개는 0으로 센다. 어느 숫자도 테스트 통과율의 분모로 쓰지 않는다.`,
  totals: {
    features: auditFeatures.length,
    documentedScenarioItems,
    definedFeatures: auditFeatures.filter((feature) => feature.scenarioDefinition.formal).length,
    automatedTestFilesScanned: automatedTestFiles.length,
    journeyFilesScanned: journeyFiles.length,
    unitScenarioDocuments,
    directlyLinkedAutomatedTests: auditFeatures.filter((feature) => feature.automated.directlyLinked).length,
    automatedFeatureMarkers: auditFeatures.filter((feature) => feature.automated.featureMarkerCount > 0).length,
    automatedScenarioReferences: auditFeatures.filter((feature) =>
      feature.automated.scenarioReferenceCount > 0,
    ).length,
    directlyLinkedJourneys: auditFeatures.filter((feature) => feature.journey.directlyLinked).length,
    journeyFeatureMarkers: auditFeatures.filter((feature) => feature.journey.featureMarkerCount > 0).length,
    journeyScenarioReferences: auditFeatures.filter((feature) =>
      feature.journey.scenarioReferenceCount > 0,
    ).length,
    featureLevelAutomatedProof: auditFeatures.filter((feature) => feature.proof === 'auto').length,
    localServerE2eProof: auditFeatures.filter((feature) => feature.proof === 'local').length,
    localRealAccountProof: auditFeatures.filter((feature) => feature.proof === 'real').length,
    featureLevelChecked: auditFeatures.filter((feature) =>
      feature.proof === 'auto' || feature.proof === 'local' || feature.proof === 'real',
    ).length,
    completeEvidenceChain: auditFeatures.filter((feature) => feature.evidenceStage === 3).length,
    partialEvidenceChain: auditFeatures.filter((feature) => feature.evidenceStage === 2).length,
    definitionOnlyEvidence: auditFeatures.filter((feature) => feature.evidenceStage === 1).length,
    traceMarkers: traceTotals.total,
    verifiedTraceRecords: traceTotals.verified,
    unresolvedTraceRecords: traceTotals.total - traceTotals.verified - traceTotals.retired,
    retiredTraceMarkers: traceTotals.retired,
  },
  features: auditFeatures,
};

const generated = `/* 이 파일은 verification/build_scenario_audit_data.mjs가 현재 저장소에서 생성한다. */\nwindow.SCENARIO_AUDIT = ${JSON.stringify(payload, null, 2)};\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  if (current !== generated) {
    console.error('scenario-audit.js가 현재 저장소와 다릅니다. --write로 다시 생성하세요.');
    process.exit(1);
  }
  console.log('scenario-audit.js가 현재 저장소와 일치합니다.');
} else if (process.argv.includes('--write')) {
  fs.writeFileSync(outputPath, generated);
  console.log(`생성 완료: ${path.relative(workspaceRoot, outputPath)}`);
} else {
  console.log(JSON.stringify(payload.totals, null, 2));
  console.log('파일을 갱신하려면 --write, 일치 여부만 확인하려면 --check를 사용하세요.');
}
