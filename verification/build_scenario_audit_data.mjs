#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const businessRoot = path.resolve(scriptDir, '..');
const workspaceRoot = path.resolve(businessRoot, '..');
const outputPath = path.join(businessRoot, 'docs/assets/scenario-audit.js');

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

const missingScenarioFeatures = features.filter((feature) => !feature.scenarios);
if (missingScenarioFeatures.length) {
  throw new Error(`시나리오가 없는 기능: ${missingScenarioFeatures.map((feature) => feature.id).join(', ')}`);
}

const unitFiles = walk('business_logic/units');
const scenarioFiles = unitFiles.filter((file) => file.endsWith('/scenarios.md'));
const backendFiles = unitFiles.filter((file) => file.endsWith('/backend.md'));

function countUnitScenarioHeadings(documentText) {
  return [...documentText.matchAll(
    /^#{2,4}\s+(?:(?:S|SC)-?\d+\b|E2E-derived\s+시나리오|시나리오\s*\d+|\d+\.\s)/gmi,
  )].length;
}

function hasFormalPrdScenarioSection(documentText) {
  return /^#{2,4}\s+.*(?:시나리오 기준 수용 조건|상태\/권한\/시나리오 매트릭스|수용 기준)/m
    .test(documentText);
}

const automatedTestFiles = [
  ...walk('community_api/src/test'),
  ...walk('community_app/test'),
  ...walk('community_app/integration_test'),
  ...walk('community-realtime/src/test'),
  ...walk('community_admin_api/src/test'),
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
  if (!backendPath) {
    return { backendPath: null, total: 0, filesPresent: 0, valid: 0, missing: 0, state: 'not-linked' };
  }

  const markerPattern = /<!-- traces:\s+(.+):(\d+)\s+-->/g;
  const backendText = read(backendPath);
  let marker;
  let total = 0;
  let filesPresent = 0;
  let valid = 0;
  let missing = 0;

  while ((marker = markerPattern.exec(backendText)) !== null) {
    total += 1;
    const targetPath = marker[1];
    const targetLine = Number(marker[2]);
    const absoluteTarget = path.join(workspaceRoot, targetPath);
    if (!fs.existsSync(absoluteTarget)) {
      missing += 1;
      continue;
    }
    filesPresent += 1;
    const lines = fs.readFileSync(absoluteTarget, 'utf8').split(/\r?\n/);
    const mappingIsNearAnchor = [targetLine - 1, targetLine, targetLine + 1].some((lineNumber) =>
      /@(Get|Post|Put|Patch|Delete|Request)Mapping/.test(lines[lineNumber - 1] ?? ''),
    );
    if (mappingIsNearAnchor) valid += 1;
  }

  let state = 'not-linked';
  if (total > 0 && valid === total) state = 'current';
  else if (valid > 0) state = 'partial';
  else if (total > 0) state = 'stale';

  return { backendPath, total, filesPresent, valid, missing, state };
}

const auditFeatures = features.map((feature) => {
  const unitScenarioPath = scenarioFiles.find((file) => file.includes(`/${feature.id}_`)) ?? null;
  const scenarioPath = unitScenarioPath ?? `business_logic/prd/${feature.prdPath}`;
  const scenarioText = read(scenarioPath);
  const documentScenarioCount = unitScenarioPath ? countUnitScenarioHeadings(scenarioText) : null;
  const formalDefinition = unitScenarioPath
    ? documentScenarioCount > 0
    : hasFormalPrdScenarioSection(scenarioText);
  if (!formalDefinition) {
    throw new Error(`${feature.id}의 정식 시나리오 또는 수용 기준을 ${scenarioPath}에서 찾지 못했습니다.`);
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
    scenarioCount: feature.scenarios,
    scenarioSource: unitScenarioPath ? '상세 시나리오 문서' : '기능 PRD 수용 시나리오',
    scenarioPath,
    scenarioDefinition: {
      formal: formalDefinition,
      documentScenarioCount,
      registeredCountMatches: documentScenarioCount == null
        ? null
        : documentScenarioCount === feature.scenarios,
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
    valid: sum.valid + feature.trace.valid,
    missing: sum.missing + feature.trace.missing,
  }),
  { total: 0, valid: 0, missing: 0 },
);

const documentedScenarioItems = auditFeatures.reduce((sum, feature) => sum + feature.scenarioCount, 0);
const unitScenarioDocuments = auditFeatures.filter((feature) =>
  feature.scenarioDefinition.documentScenarioCount != null,
).length;
const unitScenarioHeadings = auditFeatures.reduce((sum, feature) =>
  sum + (feature.scenarioDefinition.documentScenarioCount ?? 0), 0,
);
const unitScenarioCountMismatches = auditFeatures.filter((feature) =>
  feature.scenarioDefinition.registeredCountMatches === false,
).length;

const payload = {
  asOf: '2026-09-04',
  countingNote: `${documentedScenarioItems.toLocaleString('ko-KR')}은 기존 기능 목록에 적힌 숫자의 합이다. 상세 시나리오 문서 ${unitScenarioDocuments}개에서 실제로 식별한 제목은 ${unitScenarioHeadings.toLocaleString('ko-KR')}개이며 ${unitScenarioCountMismatches}개 기능은 등록 숫자와 제목 수가 다르다. 어느 숫자도 테스트 통과율의 분모로 쓰지 않는다.`,
  totals: {
    features: auditFeatures.length,
    documentedScenarioItems,
    definedFeatures: auditFeatures.filter((feature) => feature.scenarioDefinition.formal).length,
    automatedTestFilesScanned: automatedTestFiles.length,
    journeyFilesScanned: journeyFiles.length,
    unitScenarioDocuments,
    unitScenarioHeadings,
    unitRegisteredScenarioItems: auditFeatures
      .filter((feature) => feature.scenarioDefinition.documentScenarioCount != null)
      .reduce((sum, feature) => sum + feature.scenarioCount, 0),
    unitScenarioCountMismatches,
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
    currentTraceMarkers: traceTotals.valid,
    missingTraceTargets: traceTotals.missing,
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
