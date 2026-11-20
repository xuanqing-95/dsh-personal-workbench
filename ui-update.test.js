import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {createUIReleaseReader} from './ui-update-host.js';
import {updateBlockReason} from './ui-update-client.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('release is withheld until the published hash and embedded build agree',async()=>{
 const code='const WORKBENCH_UI_BUILD = "ui-test";';
 let bytes='partial',count=0;
 const marker={protocol:1,moduleId:'test',build:'ui-test',sha256:sha(code)};
 const reader=createUIReleaseReader({directory:new URL('file:///unused/'),moduleId:'test',modules:()=>({rebuilt:()=>{count++;return 'revision-2';}}),read:async url=>url.pathname.endsWith('json')?JSON.stringify(marker):Buffer.from(bytes)});
 assert.deepEqual(await reader(),{available:false});assert.equal(count,0);
 bytes=code;assert.equal((await reader()).rev,'revision-2');assert.equal(count,1);
 await reader();assert.equal(count,1);
});
test('missing marker does not opt an installation into updates',async()=>{
 const reader=createUIReleaseReader({directory:new URL('file:///unused/'),moduleId:'test',modules:()=>null,read:async()=>{throw Object.assign(Error(),{code:'ENOENT'});}});
 assert.deepEqual(await reader(),{available:false});
});
test('running, waiting, unknown, drafts and current interaction all defer a swap',()=>{
 const base={active:true,quiet:true,sessionKnown:true};assert.equal(updateBlockReason(base),'');
 for(const patch of [{active:false},{quiet:false},{sessionKnown:false},{running:true},{interaction:true},{draft:true},{composing:true},{editing:true},{pending:true},{dialog:true}])assert.notEqual(updateBlockReason({...base,...patch}),'');
});
async function fixture({running=false,draft=false,navigateDuring=false,fail=false,focused=false}={}) {
 const source=await readFile(new URL('./ui-update-client.js',import.meta.url),'utf8');
 let tick,reloads=0,selected='dsh-personal-workbench',subscriber,cleanups=[],restores=0,focusRestored=0;
 const runtimeWindow={},events=new Map();
 const input={value:draft?'unsent message':'',disabled:false,tagName:'TEXTAREA',focus(){focusRestored++;}};
 const document={hidden:false,activeElement:focused?input:null,querySelector:selector=>selector.includes('data-ui-build')?{getAttribute:()=> 'new'}:({querySelectorAll:()=>[input],contains:el=>el===input,querySelector:()=>input}),addEventListener:(e,f)=>events.set(e,f),removeEventListener(){}};
 const sandbox={window:runtimeWindow,document,Date:class extends Date{static now(){return 60000;}},localStorage:{getItem:()=> 'pet-session'},setInterval:f=>(tick=f,1),clearInterval(){},setTimeout,console,
  fetch:async()=>({ok:true,json:async()=>({value:{available:true,build:'new',rev:'r2',moduleId:'test'}})})};
 const ctx={effect:f=>cleanups.push(f()),layout:{panelInfo:{getSnapshot:()=>({activePanelId:selected}),subscribe:f=>(subscriber=f,()=>{})},selectPanel:id=>{selected=id;restores++;}},inject:(_deps,cb)=>cb({effect:f=>cleanups.push(f()),uiSession:{sessionStatus:{getSnapshot:()=>new Map([['pet-session',{running}]])}},modules:{entries:{state:{getSnapshot:()=>({failures:fail?[{id:'test',message:'failed'}]:[]})},reload:async()=>{reloads++;runtimeWindow.__dshPersonalWorkbenchSafeUpdateV1.activeBuild='new';selected=null;subscriber();if(navigateDuring){selected='other';subscriber();}}}}})};
 vm.runInNewContext(source.replaceAll('export function ','function ')+'\ninstallWorkbenchUpdates(ctx,{moduleId:"test",endpoint:"/release",petNamespace:"pet",build:"old"});',vm.createContext({...sandbox,ctx}));
 await new Promise(setImmediate);
 const runtime=runtimeWindow.__dshPersonalWorkbenchSafeUpdateV1;runtime.lastInput=0;runtime.capture=()=>({selectedDate:'2026-11-15',calendarMode:'week',boardScroll:240});
 await tick();
 return {get reloads(){return reloads;},restores,selected,runtime,tick,setRunning:value=>{running=value;},clearDraft:()=>{input.value="";},get focusRestored(){return focusRestored;},emit:type=>events.get(type)?.({type})};
}
test('only the workbench entry reloads, then its view snapshot and panel are restored',async()=>{
 const f=await fixture();assert.equal(f.reloads,1);assert.equal(f.restores,1);assert.equal(f.runtime.snapshot.calendarMode,'week');assert.equal(f.runtime.snapshot.boardScroll,240);assert.equal(f.runtime.loaded,'new');assert.equal(f.runtime.inFlight,false);
});
test('busy chat and unsent drafts prevent actual reload calls',async()=>{
 assert.equal((await fixture({running:true})).reloads,0);assert.equal((await fixture({draft:true})).reloads,0);
});
test('navigation during a swap is never overwritten',async()=>{
 const f=await fixture({navigateDuring:true});assert.equal(f.restores,0);assert.equal(f.selected,'other');
});
test('failed activation is not marked loaded or retried forever',async()=>{
 const f=await fixture({fail:true});assert.equal(f.runtime.loaded,undefined);assert.ok(f.runtime.error);await f.tick();assert.equal(f.reloads,1);
});

test('publisher installs a complete marked bundle and retains one rollback',async()=>{
 const {mkdtemp,mkdir,writeFile,rm,readdir}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {execFileSync}=await import('node:child_process');
 const dir=await mkdtemp(join(tmpdir(),'pwb-publish-test-'));
 try{
  const pkg=JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8'));
  await writeFile(join(dir,'package.json'),JSON.stringify({name:pkg.name,type:'module'}));await writeFile(join(dir,'client.js'),'// old UI');
  execFileSync(process.execPath,[new URL('./publish-ui.mjs',import.meta.url).pathname,dir,sha('// old UI')]);
  const marker=JSON.parse(await readFile(join(dir,'ui-release.json'),'utf8'));const code=await readFile(join(dir,'client.js'),'utf8');
  assert.equal(marker.sha256,sha(code));assert.ok(code.includes('const WORKBENCH_UI_BUILD = '+JSON.stringify(marker.build)+';'));
  assert.equal(await readFile(join(dir,'.ui-rollback/client.js'),'utf8'),'// old UI');
  assert.equal((await readdir(dir)).some(f=>f.startsWith('.client-publish-')||f.startsWith('.ui-release-')),false);
  assert.throws(()=>execFileSync(process.execPath,[new URL('./publish-ui.mjs',import.meta.url).pathname,dir,sha('// wrong')],{stdio:'pipe'}));
  assert.equal(await readFile(join(dir,'client.js'),'utf8'),code);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('a deferred update resumes after the chat completes or draft clears',async()=>{
 const busy=await fixture({running:true});assert.equal(busy.reloads,0);busy.setRunning(false);await busy.tick();assert.equal(busy.reloads,1);assert.equal(busy.runtime.loaded,'new');
 const draft=await fixture({draft:true});assert.equal(draft.reloads,0);draft.clearDraft();await draft.tick();assert.equal(draft.reloads,1);
});

test('empty focused composer updates when idle and recovers focus',async()=>{
 const f=await fixture({focused:true});assert.equal(f.reloads,1);assert.equal(f.focusRestored,1);assert.equal(f.runtime.loaded,'new');
 assert.equal((await fixture({focused:true,draft:true})).reloads,0);
});
test('active IME composition continues blocking even after the idle interval',async()=>{
 const f=await fixture({running:true,focused:true});f.setRunning(false);f.emit('compositionstart');f.runtime.lastInput=0;await f.tick();assert.equal(f.reloads,0);
 f.emit('compositionend');f.runtime.lastInput=0;await f.tick();assert.equal(f.reloads,1);
});
