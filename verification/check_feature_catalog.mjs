import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=process.cwd(), page=path.join(root,'docs/features/catalog.html'), html=fs.readFileSync(page,'utf8');
const nodes=new Map();
const node=key=>{if(!nodes.has(key))nodes.set(key,{value:'',textContent:'',innerHTML:'',children:[],addEventListener(){},appendChild(x){this.children.push(x);}});return nodes.get(key);};
const checks=['notification','money','calendar','location','review'].map(impact=>({checked:false,dataset:{impact},addEventListener(){}}));
const ctx={window:{},document:{readyState:'complete',body:{getAttribute:()=>'../'},getElementById:()=>null,addEventListener(){},querySelector:node,querySelectorAll:()=>checks,createElement:()=>({value:'',textContent:''})},location:{pathname:'/features/catalog.html'},setTimeout(){},console};
vm.createContext(ctx);
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 const src=/src="([^"]+)"/.exec(m[1])?.[1];
 if(src){if(!['features.js','mileage-feature-status.js','launch-status.js'].includes(path.basename(src)))continue;vm.runInContext(fs.readFileSync(path.resolve(path.dirname(page),src),'utf8'),ctx,{filename:src});}
 else vm.runInContext(m[2],ctx);
}
const original=JSON.parse(fs.readFileSync(path.join(root,'docs/assets/features.js'),'utf8').split('=',2)[1].trim().replace(/;$/,''));
assert.equal(JSON.stringify(ctx.window.PRD_FEATURES),JSON.stringify(original),'mileage overlay changed current metadata');
assert.equal(node('#metric-total').textContent,175);assert.equal(node('#metric-scenarios').textContent,1654);assert.equal(node('#metric-diagrams').textContent,121);
const initial=node('#feature-rows').innerHTML;assert.equal((initial.match(/<tr>/g)||[]).length,175);
const urls=[...new Set([...initial.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))];
for(const url of urls){const [relative,fragment]=url.split('#');const target=path.resolve(path.dirname(page),relative);assert.ok(fs.existsSync(target),url);if(fragment)assert.ok(new RegExp('id=["\x27]'+fragment+'["\x27]').test(fs.readFileSync(target,'utf8')),url);}
node('#search').value='F16-04';vm.runInContext('render()',ctx);assert.equal((node('#feature-rows').innerHTML.match(/<tr>/g)||[]).length,1);
node('#search').value='';node('#domain-filter').value='마일리지';vm.runInContext('render()',ctx);assert.equal((node('#feature-rows').innerHTML.match(/<tr>/g)||[]).length,8);
node('#domain-filter').value='';checks[1].checked=true;checks[3].checked=true;vm.runInContext('render()',ctx);assert.equal((node('#feature-rows').innerHTML.match(/<tr>/g)||[]).length,original.filter(f=>f.impacts.money&&f.impacts.location).length);
console.log(JSON.stringify({catalogFeatures:175,domains:node('#domain-filter').children.length,registeredItems:1654,registeredDiagrams:121,renderedLinksChecked:urls.length,checks:['metadata unchanged by compatibility file','ID search','domain filter','combined impact filters'],scope:'VM document rendering only; not browser or product runtime'}));
