import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=process.cwd(),page=path.join(root,'docs/features/impact.html'),html=fs.readFileSync(page,'utf8');
const nodes=new Map();
const node=key=>{if(!nodes.has(key))nodes.set(key,{value:'',textContent:'',innerHTML:'',children:[],addEventListener(){},appendChild(x){this.children.push(x);}});return nodes.get(key);};
const keys=['notification','money','calendar','location','review'];
const checks=[...html.matchAll(/type="checkbox" data-impact="([^"]+)"/g)].map(m=>({checked:false,dataset:{impact:m[1]},addEventListener(){}}));
assert.deepEqual(checks.map(x=>x.dataset.impact),keys);
const ctx={window:{},document:{querySelector:node,querySelectorAll:()=>checks,createElement:()=>({value:'',textContent:''})},console};
vm.createContext(ctx);
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 const src=/src="([^"]+)"/.exec(m[1])?.[1];
 if(src){if(!['features.js','mileage-feature-status.js'].includes(path.basename(src)))continue;vm.runInContext(fs.readFileSync(path.resolve(path.dirname(page),src),'utf8'),ctx,{filename:src});}
 else vm.runInContext(m[2],ctx);
}
const data=ctx.window.PRD_FEATURES;
assert.equal(data.length,175);
assert.equal((node('#rows').innerHTML.match(/<tr>/g)||[]).length,175);
assert.equal((node('#heatmap-body').innerHTML.match(/<tr>/g)||[]).length,21);
const md=fs.readFileSync('prd/00_prd_items/10_impact_matrix.md','utf8');
const rows=md.split('\n').filter(l=>/^\| \[F\d\d-\d\d /.test(l));
assert.equal(rows.length,175);
for(const f of data){
 const row=rows.find(l=>l.startsWith(`| [${f.id} `));assert.ok(row,f.id);
 const columns=row.split('|').map(s=>s.trim());
 assert.deepEqual(columns.slice(2,7),keys.map(k=>f.impacts[k]?'●':'·'),f.id);
 assert.equal(columns[7],f.impactReason,f.id);
 assert.ok(row.includes(f.name),f.id);
 assert.ok(fs.existsSync(path.resolve(root,'prd',f.prdPath)),f.prdPath);
 assert.ok(node('#rows').innerHTML.includes(`href="${f.id}.html"`),f.id);
}
for(let mask=0;mask<32;mask++){
 checks.forEach((c,i)=>c.checked=!!(mask&(1<<i)));vm.runInContext('renderRows()',ctx);
 const expected=data.filter(f=>checks.every(c=>!c.checked||f.impacts[c.dataset.impact]));
 assert.equal((node('#rows').innerHTML.match(/<tr>/g)||[]).length,expected.length,`filter ${mask}`);
}
checks.forEach(c=>c.checked=false);
node('#search').value='F12-04';vm.runInContext('renderRows()',ctx);assert.equal((node('#rows').innerHTML.match(/<tr>/g)||[]).length,1);assert.ok(node('#rows').innerHTML.includes('방해금지'));
node('#search').value='';node('#domain-filter').value='마일리지';vm.runInContext('renderRows()',ctx);assert.equal((node('#rows').innerHTML.match(/<tr>/g)||[]).length,8);
node('#search').value='F06-03';vm.runInContext('renderRows()',ctx);assert.equal((node('#rows').innerHTML.match(/<tr>/g)||[]).length,0);
console.log(JSON.stringify({features:175,domains:21,canonicalFlagReasonLinkRows:175,impactFilterCombinations:32,otherChecks:['ID search','domain filter','empty combined filter'],scope:'static/VM documents only, no browser/product execution'}));
