import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import {apply} from './index.js';

const api='/api/dsh-personal-workbench';
const headers={'content-type':'application/json','x-personal-ui':'1','sec-fetch-site':'same-origin'};
const uuid='00000000-0000-4000-8000-000000000007';
const other='00000000-0000-4000-8000-000000000008';

function harness(data=new Map()){
  const tools=new Map(),routes=new Map(),cleanups=[];
  const ctx={
    effect(fn){const dispose=fn();if(typeof dispose==='function')cleanups.push(dispose);},
    inject(names,fn){if(names.every(name=>name in ctx))fn(ctx);},
    on(){return ()=>{};},
    agents:{list:()=>[]},sessionController:{list:async()=>({items:[]})},
    schedule:{catalog:async()=>[
      {id:'daily-local',kind:'daily',time:'09:00',timeZone:'UTC',title:'日报',status:'active',scheduledAt:'2026-11-15T09:00:00Z',prompt:'DO_NOT_EXPOSE_SCHEDULE_PROMPT'},
      {id:'ended-once',kind:'at',title:'已结束',status:'ended',scheduledAt:'2026-11-14T09:00:00Z'},
      {id:'paused',kind:'daily',title:'已暂停',status:'paused',scheduledAt:'2026-11-15T09:00:00Z'}
    ]},
    tools:{register(tool){assert.ok(!tools.has(tool.name));tools.set(tool.name,tool);return ()=>tools.delete(tool.name);}},
    connection:{fetch:{register(route){routes.set(route.path,route);return ()=>routes.delete(route.path);}}},
    storageDomain:{async open({name,global}){
      const existing=data.has(name)?data.get(name):global.initial;
      data.set(name,global.schema.parse(structuredClone(existing)));
      const table=new Map();
      return {global:{get:()=>structuredClone(data.get(name)),set:async value=>data.set(name,global.schema.parse(structuredClone(value)))},
        table:()=>({get:key=>table.get(key),put:async(key,value)=>table.set(key,value)}),close:async()=>{}};
    }}
  };
  apply(ctx);
  async function request(params={},body,endpoint=api,options={}){
    const route=routes.get(endpoint);
    assert.ok(route,'registered route '+endpoint);
    const req=new Request('http://workbench.invalid'+endpoint+'?'+new URLSearchParams(params),
      body===undefined?{}:{method:'POST',headers:{...headers,...options},body:JSON.stringify(body)});
    const response=await route.fetch(req);
    return {status:response.status,json:await response.json()};
  }
  const get=async(action,extra={})=>{const r=await request({action,...extra});assert.equal(r.status,200,JSON.stringify(r.json));return r.json.value;};
  const post=async(action,input)=>{const r=await request({},{action,input});assert.equal(r.status,200,JSON.stringify(r.json));return r.json.value;};
  return {get,post,tools,request,async close(){for(const stop of cleanups.reverse())await stop();}};
}

async function isolate(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'dsh-http-profile-'));
  const previous=process.env;
  // With no inherited tokens or provider overrides, all default sources resolve beneath this test user's directory.
  process.env={PATH:previous.PATH||'',TZ:previous.TZ||'UTC'};
  const homedir=os.homedir, fetchImpl=globalThis.fetch;
  os.homedir=()=>root;
  globalThis.fetch=async()=>{assert.fail('an offline profile attempted a remote request');};
  t.after(async()=>{process.env=previous;os.homedir=homedir;globalThis.fetch=fetchImpl;await rm(root,{recursive:true,force:true});});
}

test('installed HTTP paths load all seven dashboard cards with a fresh offline profile',async t=>{
  await isolate(t);
  const app=harness();
  try{
    const dashboard=await app.get('dashboard');
    assert.match(dashboard.today,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(dashboard.checkedAt)));
    assert.equal(dashboard.brief.availability,'unavailable');
    assert.equal(dashboard.brief.publicationComplete,false);
    assert.equal(dashboard.plan.date,dashboard.today);
    assert.deepEqual(dashboard.plan.items,[]);
    assert.deepEqual(dashboard.ai.items,[]);
    assert.equal(dashboard.automations.items[0].name,'日报');
    assert.equal(dashboard.automations.items[0].nextRunAt,'2026-11-15T09:00:00.000Z');
    assert.equal(dashboard.automations.items[0].timeZone,'UTC');
    assert.ok(dashboard.automations.items.slice(1).every(row=>row.nextRunAt===undefined));
    assert.ok(!JSON.stringify(dashboard).includes('DO_NOT_EXPOSE_SCHEDULE_PROMPT'));
    assert.equal((await app.get('assistants')).automations.items[0].id,'daily-local');
    const assistant=await app.request({},undefined,api+'/assistant');
    assert.equal(assistant.status,200);assert.ok(typeof assistant.json.prompt==='string'&&assistant.json.prompt.length>0);
    assert.deepEqual((await app.get('projects')).shortcuts,[]);
    assert.deepEqual((await app.get('briefArchive')).dates,[]);
    assert.deepEqual((await app.get('organization')).projects,[]);
    assert.equal((await app.get('notificationStatus')).enabled,false);
    assert.deepEqual((await app.get('calendar',{month:dashboard.today.slice(0,7)})).days,{});
    const monday=new Date(dashboard.today+'T12:00:00Z');
    monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
    assert.equal((await app.request({action:'weeklyPlan',week:monday.toISOString().slice(0,10)})).status,200);
    let usage=await app.get('usage');
    const deadline=Date.now()+8000;
    while(usage.state==='loading'&&Date.now()<deadline){await pause(25);usage=await app.get('usage');}
    assert.equal(usage.state,'ready');
    assert.ok(usage.day.sources.length>0);assert.ok(usage.day.sources.every(entry=>entry.total===null));
    assert.deepEqual(usage.quotas,[]);
    assert.equal((await app.request({},{action:'addPlanTask',input:{title:'忽略',date:dashboard.today}},api,{'sec-fetch-site':'cross-site'})).status,403);
  }finally{await app.close();}
});

test('beta.7 profile data, links, notes and task revisions survive an HTTP upgrade and reload',async t=>{
  await isolate(t);
  const when=Date.now(),day=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const stored=new Map([
    ['dsh_personal_workbench_tasks',{version:1,tasks:[{id:uuid,title:'旧版待办',status:'todo',priority:'normal',owner:'human',dueDate:day,link:null,revision:1,createdAt:when,updatedAt:when,archived:false}]}],
    ['dsh_personal_workbench_projects',{items:[{id:other,revision:1,title:'本地项目',version:'',progress:'',source:'harness',threadId:other,icon:'app'}],retired:[]}],
    ['dsh_personal_workbench_content',{editions:[{date:day,revision:1,title:'已有日报',items:[{title:'头条',summary:'摘要'}],updatedAt:new Date(when).toISOString()}],notes:{[other]:{revision:1,requirements:[]}}}]
  ]);
  let app=harness(stored);
  try{
    const before=await app.get('dashboard');
    assert.equal(before.plan.items[0].title,'旧版待办');
    assert.equal(before.brief.deliveryScope,'workbench');assert.equal(before.brief.publicationComplete,false);
    assert.equal((await app.post('checkPlanTask',{id:uuid,date:day,revision:1,checked:true})).status,'done');
    assert.equal((await app.get('plan',{date:day})).items[0].checked,true);
    assert.equal((await app.request({},{action:'checkPlanTask',input:{id:uuid,date:day,revision:1,checked:false}})).status,409);
    const added=await app.post('addPlanTask',{date:day,title:'新待办'});
    await app.tools.get('personal_tasks').execute({action:'update',input:{id:added.id,expectedRevision:1,patch:{link:{kind:'redflow-original',id:other}}}});
    await app.post('projectNotes',{action:'save',projectId:other,expectedRevision:1,patch:{progress:'已联调'}});
    const project=await app.tools.get('personal_organization').execute({action:'createProject',input:{title:'发布前验收',area:'software',status:'active'}});
    await app.tools.get('personal_organization').execute({action:'setItemMeta',input:{sourceRef:{kind:'task',id:added.id},expectedRevision:0,patch:{projectId:project.id}}});
    assert.equal((await app.get('organization')).itemMeta[0].projectId,project.id);
    await app.close();app=harness(stored);
    const result=await app.get('dashboard');
    assert.equal(result.tasks.items.find(row=>row.id===added.id).link.id,other);
    assert.equal((await app.get('projects')).notes[other].progress,'已联调');
    assert.equal((await app.get('projectNotes')).notes[other].revision,2);
    assert.equal((await app.get('briefArchive',{date:day})).edition.title,'已有日报');
    assert.equal((await app.get('organization')).projects[0].title,'发布前验收');
  }finally{await app.close();}
});

test('selected plan source reaches dashboard, day, week, month and assistant and survives reload',async t=>{
  await isolate(t);
  const folder=await mkdtemp(path.join(os.tmpdir(),'workbench-plan-test-'));
  t.after(()=>rm(folder,{recursive:true,force:true}));
  const data=new Map(),date='2026-11-17',week='2026-11-16';
  const file=path.join(folder,date+'.md');
  const app=harness(data);
  try{
    await writeFile(file,'- [ ] 演示外部计划');
    const today=(await app.get('dashboard')).today;
    if(today!==date)await writeFile(path.join(folder,today+'.md'),'- [ ] 今日外部计划');
    assert.equal((await app.get('planConnection')).provider,null);
    await app.post('addPlanTask',{title:'本机计划',date});
    const connected=await app.post('connectPlan',{provider:'obsidian',location:folder});
    assert.equal(connected.provider,'obsidian');
    assert.ok(!(JSON.stringify(connected).includes(folder)));
    const day=await app.get('plan',{date});
    assert.equal(day.items.length,2);
    assert.equal(day.items.find(item=>item.title==='演示外部计划').canCheck,false);
    assert.ok((await app.get('dashboard')).plan.items.some(t=>t.source==='connection'));
    assert.ok((await app.get('weeklyPlan',{week})).days[date].some(t=>t.title==='演示外部计划'));
    assert.equal((await app.get('calendar',{month:date.slice(0,7)})).days[date].count,2);
    const grid=await app.tools.get('personal_home').execute({view:'plan',date});
    assert.equal(grid.items.length,2);
    // Edit the connected file outside the workbench while this same HTTP host stays open.
    const clock=Date.now()+16000;
    t.mock.method(Date,'now',()=>clock);
    await writeFile(file,'- [x] 已在来源更新');
    const updated=items=>items.some(item=>item.title==='已在来源更新'&&item.checked);
    assert.ok(updated((await app.get('plan',{date})).items));
    assert.ok(updated((await app.get('weeklyPlan',{week})).days[date]));
    assert.ok(updated((await app.get('calendar',{month:date.slice(0,7)})).days[date].items));
    assert.ok(updated((await app.tools.get('personal_home').execute({view:'plan',date})).items));
    assert.equal((await app.request({},{action:'connectPlan',input:{provider:'file',location:path.join(folder,'missing.md')}})).status,400);
    assert.equal((await app.get('planConnection')).provider,'obsidian');
    assert.ok(!JSON.stringify(await app.get('export')).includes(folder));
  }finally{await app.close();}
  const second=harness(data);
  try{
    assert.equal((await second.get('planConnection')).provider,'obsidian');
    await second.post('disconnectPlan',{});
    assert.deepEqual((await second.get('plan',{date})).items.map(t=>t.title),['本机计划']);
  }finally{await second.close();}
});

test('connecting an archive follows its local editions, receipts and images without restarting the host',async t=>{
  await isolate(t);
  const root=os.homedir(),folder=path.join(root,'日报归档'),other=path.join(root,'其他文件');
  await Promise.all([mkdir(folder),mkdir(other)]);
  await writeFile(path.join(other,'notes.md'),' unrelated ');
  const data=new Map(),app=harness(data);
  let today,issue;
  try{
    assert.equal((await app.get('briefConnection')).provider,null);
    const picked=await app.post('connectBrief',{location:folder});
    assert.equal(picked.detail,'日报归档');
    assert.ok(!JSON.stringify(picked).includes(root));
    assert.equal((await app.get('briefArchive')).edition,null);
    const bad=await app.request({},{action:'connectBrief',input:{location:other}});
    assert.equal(bad.status,400);
    assert.match(bad.json.error,/没有找到可读取的日报/);
    assert.equal((await app.get('briefConnection')).detail,'日报归档');
    today=(await app.get('dashboard')).today;
    issue=path.join(folder,today+'.json');
    const image=path.join('assets',today,'main.png');
    await mkdir(path.join(root,'assets',today),{recursive:true});
    await writeFile(path.join(root,image),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lNWbWAAAAABJRU5ErkJggg==','base64'));
    const write=heading=>writeFile(issue,JSON.stringify({date:today,items:[[heading,'正文','https://example.org/story']],figures:[{local_image:image,caption:'当日配图'}]}));
    await write('第一篇');
    assert.equal((await app.get('assistants')).brief.publicationComplete,false);
    assert.equal((await app.get('briefArchive')).edition,null);
    await writeFile(path.join(folder,today+'.status.json'),JSON.stringify({date:today,publication_complete:true,published_at:today+'T01:00:00Z',verified_reader_url:'https://example.org/read'}));
    await write('原文件更新后的头条');
    const current=await app.get('assistants');
    assert.equal(current.brief.review.title,'原文件更新后的头条');
    const edition=(await app.get('briefArchive')).edition;
    assert.equal(edition.items[0].title,current.brief.review.title);
    assert.match(edition.leadImage.revision,/^[0-9a-f]{16}$/);
    assert.equal(edition.leadImage.alt,'当日配图');
    assert.ok(!JSON.stringify(await app.get('export')).includes(folder));
  }finally{await app.close();}
  const reopened=harness(data);
  try{
    assert.equal((await reopened.get('briefConnection')).detail,'日报归档');
    assert.equal((await reopened.get('dashboard')).brief.review.title,'原文件更新后的头条');
    await reopened.post('disconnectBrief',{});
    assert.equal((await reopened.get('briefArchive')).edition,null);
    assert.match(await readFile(issue,'utf8'),/原文件更新后的头条/);
  }finally{await reopened.close();}
});

test('existing Harness-configured daily report folders retain precedence',async t=>{
  await isolate(t);
  process.env.DSH_WORKBENCH_BRIEF_DIR=os.homedir();
  const app=harness();
  try{
    assert.equal((await app.get('briefConnection')).managed,true);
    assert.equal((await app.request({},{action:'disconnectBrief',input:{}})).status,400);
    assert.equal((await app.request({},{action:'connectBrief',input:{location:os.homedir()}})).status,400);
  }finally{await app.close();}
});
