import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const page=path.resolve('docs/qa/feature-status.html'),html=fs.readFileSync(page,'utf8');
const nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],{value:'',checked:false,textContent:'',innerHTML:'',children:[],handlers:{},appendChild(n){this.children.push(n)},addEventListener(n,f){this.handlers[n]=f},scrollIntoView(){}}]));
const node=id=>nodes.get(id);
const ctx={window:{},document:{readyState:'complete',body:{getAttribute:()=>'../'},getElementById:id=>nodes.get(id)||null,createElement:()=>({value:'',textContent:''}),addEventListener(){}},location:{pathname:'/qa/feature-status.html'},console};vm.createContext(ctx);
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 const src=/src="([^"]+)"/.exec(m[1])?.[1];
 if(src){const clean=src.split('?')[0];if(!['features.js','mileage-feature-status.js','launch-status.js'].includes(path.basename(clean)))continue;vm.runInContext(fs.readFileSync(path.resolve(path.dirname(page),clean),'utf8'),ctx,{filename:clean});}
 else vm.runInContext(m[2],ctx);
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const shown=()=>[...node('rows').innerHTML.matchAll(/class="feature-name" href="\.\.\/features\/(F\d{2}-\d{2})\.html"/g)].map(m=>m[1]);
const data=ctx.window.PRD_FEATURES;
const L=ctx.window.LAUNCH_STATUS;
const seen=[],rendered=[];
while(true){seen.push(...shown());rendered.push(node('rows').innerHTML);if(node('next-page').disabled)break;node('next-page').handlers.click()}
assert.equal(seen.length,175);assert.equal(new Set(seen).size,175);assert.deepEqual(seen,Array.from(data,f=>f.id));assert.equal(rendered.length,7);
const all=rendered.join('\n');for(const f of data)assert.ok(all.includes(esc(f.checks)),f.id+' current scope');
assert.equal((all.match(/과거 구현·검사·환경 기록/g)||[]).length,175);assert.equal((all.match(/당시 후속 계획/g)||[]).length,175);
function filter(id,value){node(id).value=value;node(id).handlers[id==='q'?'input':'change']()}
filter('q','F10-05');assert.deepEqual(shown(),['F10-05']);filter('q','no-matching-feature-xyz');assert.equal(shown().length,0);filter('q','');
for(const option of node('domain-filter').children){filter('domain-filter',option.value);assert.equal(shown().length,data.filter(f=>f.domain.replace(/^\d+[.·\s-]*/,'')===option.value).length)}filter('domain-filter','');
for(const scope of ['included','sealed','retired']){filter('scope-filter',scope);const expected=data.filter(f=>scope==='included'?['open','partial'].includes(L.forFeature(f.id).scope):L.forFeature(f.id).scope===scope).length;assert.ok(node('count').textContent.includes('검색 결과 '+expected+'개'),scope)}filter('scope-filter','');
for(const proof of ['real','local','auto']){filter('proof-filter',proof);const expected=data.filter(f=>L.forFeature(f.id).proof===proof).length;assert.ok(node('count').textContent.includes(expected?'검색 결과 '+expected+'개':'검색 결과 없음'),proof)}filter('proof-filter','');
for(const work of ['development','environment']){filter('work-filter',work);assert.ok(node('count').textContent.includes('검색 결과'))}filter('work-filter','');
node('f-gap').checked=true;node('f-gap').handlers.change();const expected=data.filter(f=>L.forFeature(f.id).openItems.some(o=>o.impact!=='doc'&&!/-20261122$/.test(o.id))).length;assert.ok(node('count').textContent.includes(expected?'검색 결과 '+expected+'개':'검색 결과 없음'));node('f-gap').checked=false;node('f-gap').handlers.change();assert.equal(shown().length,25);
const links=[...new Set([...all.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))];
for(const link of links){const [rel,fragment]=link.split('#'),target=path.resolve(path.dirname(page),rel);assert.ok(fs.existsSync(target),link);if(fragment){if(rel==='launch-status.html'&&fragment.startsWith('item-'))assert.ok(data.some(f=>L.forFeature(f.id).openItems.some(x=>'item-'+x.id===fragment)),link);else assert.ok(fs.readFileSync(target,'utf8').includes('id="'+fragment+'"'),link)}}
console.log(JSON.stringify({features:seen.length,pages:rendered.length,domains:node('domain-filter').children.length,renderedLinks:links.length,checks:['current scopes','historical labels','pagination','ID and empty search','domain/scope/proof/work/preparation filters','reset'],scope:'document VM only; no product/browser execution'}));
