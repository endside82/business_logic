"""Refresh only the public dashboard from the workspace's canonical work tables.
Run from business_logic. Separately reviewed reference pages are never generated here.
"""
from pathlib import Path
import argparse, collections, hashlib, json, re, subprocess, sys, types
arg=argparse.ArgumentParser();arg.add_argument('--check',action='store_true');opt=arg.parse_args()
base=Path(__file__).resolve().parents[1];root=base.parent
sys.path.insert(0,str(root/'scripts'))
script=root/'scripts/build-work-overview.py';code=script.read_text()
old="r'^\\| (공개 API|관리자 API|앱|관리자 웹|실시간) \\| `([a-f0-9]+)`'"
new="r'^\\| (공개 API|관리자 API|앱|관리자 웹|실시간) \\| [^`\\n]*`([a-f0-9]+)`'"
assert code.count(old)==1 or code.count(new)==1, 'WORKLIST version parser changed; review before generation'
module=types.ModuleType('canonical_work_builder');module.__file__=str(script)
exec(compile(code.replace(old,new),str(script),'exec'),module.__dict__)
import work_overview_site as site
page=base/'docs/index.html';snapshot=base/'docs/assets/work-overview.snapshot.json'
previous=json.loads(snapshot.read_text());data=module.collect()
data['sourceDeclaredDate']=data['date'];data['date']='2026-11-23'
# Keep reviewed explanatory prose; identifiers, work conditions and relationships come from the current canonical table.
for key in ['resources','stages','plans']:
 before={x['id']:x for x in previous[key]}
 for row in data[key]:
  fields={'resources':['state','current','need'],'stages':['state','action','exit','input','summary'],'plans':['summary']}[key]
  for field in fields:
   if row['id'] in before and field in before[row['id']]:row[field]=before[row['id']][field]
summary=previous['summary'];n=len(data['tasks']);counts=collections.Counter(t['section'].split('.')[0] for t in data['tasks'])
summary['lead']='현재 작업 정본의 추적 항목과 배포 기록을 구분합니다. 공개·관리자 API는 11월 15일, MCP 허용 설정과 소개 웹 분석은 11월 22일의 반영 기록입니다. 그 뒤 소스 변경과 남은 실제 이용 확인은 작업별 조건을 따릅니다.'
summary['updates']=[
'서버: 공개·관리자 API와 관리자 웹은 prd-20261115a 기록입니다. 11월 22일 MCP 서버 67d6d47과 허용 AI 클라이언트 넷을 운영에 반영했습니다. 네 서비스의 로그인·동의·읽기·연결 해제와 개인정보 검토 후 가이드 공개는 남아 있습니다.',
'Android: 11월 12일 내부 테스트 1.0.0 (16) 기록입니다. iOS는 10월 27일 서명 IPA 1까지의 기록이며 업로드·설치·APNs·정식 공개를 따로 확인합니다.',
'임시 결제: 실제 돈이 오가지 않는 시험입니다. 배포된 대사 판정으로 11월 9일 대사를 다시 만드는 H-659와 참가자·정산·출금 준비 조건을 구분합니다.',
'긴 목록: 새 창구를 쓰는 앱·AI 연결 서버는 공개 API의 선행 배포를 기다립니다(H-579). 차단 출처 표시 변경은 앱을 먼저 낸 뒤 서버를 반영하며, 기존 차단 쌍의 운영 보정은 H-664입니다.',
'방문 분석: 11월 22일 소개 웹 GA4 연결·운영 반영과 지정 로컬 검증 세션의 실제 수신을 확인한 기록이 있습니다. 운영 일반 방문자의 수신 검증은 별도이며, H-590에는 원격 관측 수집처·최소 대시보드가 남습니다.',
'관리자: 11월 22일 로컬 실제 서버 6개 여정과 모의 응답 2개 UI 흐름의 네이티브 브라우저 확인 기록이 있습니다. 그 결과를 운영 배포나 모든 관리자 기능의 통과로 확대하지 않습니다.']
summary['inventory']=f'현재 정본의 추적 항목 {n}개입니다. 조건부·제품 후보·외부 확인을 포함하므로 미완료 개발 수나 완료율이 아닙니다.'
summary['categoryCounts']={str(k):counts[str(k)] for k in range(2,10)}
summary['evidenceRows']=[['서버','11월 15일 배포 범위','docs/release-gate/evidence/API-RELEASE-20261115a.json'],['AI 연결','11월 22일 허용 목록·MCP 이미지와 남은 시험','docs/release-gate/evidence/MCP-RELEASE-20261115m.json'],['방문 분석','지정 검증 세션 수신과 일반 운영 방문 구분','docs/release-gate/evidence/GA4-CONNECTION-20261122.json'],['관리자','실제 서버 6개·모의 UI 2개 범위','docs/release-gate/evidence/ADMIN-GAPS-20261122.json'],['현재 작업',f'{n}개 작업과 착수 조건','docs/plan/NEXT_WORK.md']]
summary['progressRows']=[['서버','11월 15일 API 배포','main의 후속 변경·실제 화면은 별도'],['AI 연결','11월 22일 MCP 67d6d47·클라이언트 넷','로그인·동의·도구 이용·해제와 가이드 공개 조건은 별도'],['소개 웹 분석','11월 22일 연결·운영 반영','지정 로컬 세션 수신 확인; 일반 운영 방문 수신은 별도'],['Android','내부 테스트 16','실기기·정식 공개 별도'],['iOS','서명 IPA 1 기록','업로드·설치·APNs·기기 여정·심사 별도']]
data['summary']=summary
pub=previous['publication'];pub.update(sourceCommit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip(),sourceSha256=hashlib.sha256(module.SOURCE.read_bytes()).hexdigest(),worklistSha256=hashlib.sha256(module.WORKLIST.read_bytes()).hexdigest(),regenerate='python3 verification/refresh_work_overview.py',check='python3 verification/refresh_work_overview.py --check; node --test verification/work_overview.test.mjs',method='2026-11-23 현재 작업 정본·11월22일 후속 실행 기록 대조. 문서 갱신 세션의 새 제품 시험·브라우저·배포 없음.')
files=['docs/plan/NEXT_WORK.md','docs/plan/WORKLIST.md','docs/release-gate/evidence/API-RELEASE-20261115a.json','docs/release-gate/evidence/MCP-RELEASE-20261115m.json','docs/release-gate/evidence/GA4-CONNECTION-20261122.json','docs/release-gate/evidence/ADMIN-GAPS-20261122.json']
pub['evidenceSha256']={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files};data['publication']=pub
site.validate_snapshot(data);outputs=site.build_site(root,module.render_template(data),data)
history=re.search(r'<details class="panel status-summary" id="historical-dashboard-summary">[\s\S]*?</details>',page.read_text())
assert history, 'Dated dashboard summary must be preserved'
writes={snapshot:json.dumps(data,ensure_ascii=False,indent=2)+'\n'}
for p,s in outputs.items():
 if p.name not in ['index.html','work-overview.css','work-overview.js']:continue
 if p.name=='index.html':
  s=s.replace('qa/launch-status.html#development-current','qa/launch-status.html#release-record-current').replace('<div id="scope-map"',history[0]+'\n<div id="scope-map"',1).replace('실제 앱 화면</a>','과거 앱 화면 기록</a>')
 writes[p]=s
for p,s in writes.items():
 if opt.check: assert p.read_text()==s, f'{p.name}: regenerate dashboard'
 else:p.write_text(s)
print(json.dumps({'tasks':n,'resources':len(data['resources']),'writtenPages':['docs/index.html'],'check':opt.check},ensure_ascii=False))
