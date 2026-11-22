"""Verify the delivered document refresh without running product or browser tests."""
from pathlib import Path
import argparse, collections, hashlib, json, re
arg=argparse.ArgumentParser();arg.add_argument('--check-sources',action='store_true');opt=arg.parse_args()
root=Path(__file__).resolve().parents[1]
ledger=json.loads((root/'verification/document-refresh-2026-11-22.json').read_text())
report=json.loads((root/'verification/document-refresh-final-2026-11-23.json').read_text())
assert ledger['status']=='complete'
assert all(x['status']=='complete' for x in ledger['steps'])
assert not any(x['review']=='pending' for x in ledger['files'])
assert not report['unresolvedDocumentationFindings']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for item in report['artifacts']:
 p=root/item['path'];assert p.is_file(),item['path'];assert sha(p)==item['sha256'],f"Document changed: {item['path']}"
derived=0
for item in ledger['files']:
 if not item['path'].endswith('.md'):continue
 p=root/item['path']
 for source,digest in re.findall(r'<!-- derived-from: (.*?); sha256: ([a-f0-9]+) -->',p.read_text()):
  assert sha(root/source)==digest,f'{p}: canonical source changed';derived+=1
if opt.check_sources:
 for item in report['currentSourceEvidence']:
  p=root.parent/item['path'];assert p.is_file(),item['path'];assert sha(p)==item['sha256'],f"Source advanced after recorded review: {item['path']}"
print(json.dumps({'result':'PASS','documentStates':dict(collections.Counter(x['review'] for x in ledger['files'] if x.get('document'))),'artifactDigests':len(report['artifacts']),'derivedDigests':derived,'sourceDigests':len(report['currentSourceEvidence']) if opt.check_sources else 'not requested','scope':'documents and provenance only; no product tests or browser'},ensure_ascii=False))
