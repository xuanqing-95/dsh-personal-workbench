import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {zstdCompressSync} from 'node:zlib';
import {createUsageReader} from './usage.js';
import {createWeeklyPlanReader} from './weekly-plan.js';
import {createPlanReader} from './notion-plans.js';
import {createWeixinSender,initialNotificationState,createNotificationQueue} from './weixin-notifications.js';
import {installWeixinNotifications} from './weixin-notification-host.js';
import {readMeetings,enqueueDueMeetings} from './weixin-meetings.js';

const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const DS=uuid(1),P=uuid(2),B=uuid(3),OUTSIDE=uuid(4),today='2026-11-19',week='2026-11-16';
const env={DSH_WORKBENCH_NOTION_TOKEN:'fixture',DSH_WORKBENCH_NOTION_DAILY_SOURCE_ID:DS,DSH_WORKBENCH_NOTION_DATA_SOURCE_ID:DS};
const listTasks=async()=>({items:[{id:uuid(9),title:'本机任务',status:'todo',dueDate:today,revision:1}]});
const res=value=>Response.json(value);
const lf=results=>({results,has_more:false,next_cursor:null});
const rich=plain_text=>[{plain_text}];
const page=(id,title,start,end=null)=>({object:'page',id,parent:{data_source_id:DS},properties:{Title:{type:'title',title:rich(title)},Date:{type:'date',date:start?{start,end}:null},State:{type:'status',status:{name:'Done',id:'complete'}}}});
const schema={object:'data_source',id:DS,parent:{database_id:uuid(10)},properties:{Date:{type:'date'},Title:{type:'title'},State:{type:'status',status:{groups:[{name:'Complete',option_ids:['complete']}]}}}};
const block=(id,type,title,extra={})=>({object:'block',id,type,[type]:{rich_text:rich(title),...extra}});

test('first install uses profile tasks, no remote calls or notification listeners',async()=>{
  const options={env:{},listTasks,fetchImpl(){throw Error('unexpected external request');}};
  const local=createPlanReader(options);
  assert.equal((await local.readPlan(today)).items[0].title,'本机任务');
  assert.equal((await local.readCalendar('2026-11',week)).days[today].count,1);
  const reader=createWeeklyPlanReader(options);
  assert.equal((await reader(week)).days[today][0].revision,1);
  await assert.rejects(reader(today));
  const off=installWeixinNotifications({on(){throw Error('listener installed');}},{env:{DSH_WORKBENCH_WEIXIN_TARGET:'weixin:test'}});
  assert.equal((await off.status()).enabled,false);
});

test('optional weekly data source reads paged date ranges and backlog; cached reads preserve current local tasks',async()=>{
  let requests=0;
  const fetchImpl=async(url,request)=>{
    assert.equal(new URL(url).origin,'https://api.notion.com');
    assert.equal(request.redirect,'error');requests++;
    if(url.endsWith(DS))return res(schema);
    const body=JSON.parse(request.body);
    if(body.start_cursor)return res(lf([page(uuid(7),'待排期',null)]));
    return res({results:[page(P,'跨周','2026-11-14','2026-11-19')],has_more:true,next_cursor:'next'});
  };
  const read=createWeeklyPlanReader({env,listTasks,fetchImpl});
  const result=await read(week);
  assert.equal(result.availability,'connected');assert.ok(result.sourceURL.endsWith(uuid(10).replaceAll('-','')));
  assert.equal(result.days['2026-11-16'][0].title,'跨周');
  assert.equal(result.days['2026-11-19'].length,2);
  assert.equal(result.days['2026-11-20'].length,0);
  assert.equal(result.days['2026-11-16'][0].checked,true);
  assert.equal(result.unscheduled[0].title,'待排期');
  assert.equal((await read('2026-11-23')).unscheduled.length,1);assert.equal(requests,3);
  const failure=await createWeeklyPlanReader({env,listTasks,fetchImpl:async()=>new Response('',{status:403})})(week);
  assert.equal(failure.availability,'partial');assert.equal(failure.days[today][0].source,'profile');
  assert.notEqual(failure.dayPlanFallback,true);
});

test('a daily-only Notion setup can supply the week, while an empty weekly source stays authoritative',async()=>{
  const dailyOnly={DSH_WORKBENCH_NOTION_DAILY_SOURCE_ID:DS};
  const emptyTasks=async()=>[];
  const read=(options)=>createWeeklyPlanReader({env:dailyOnly,listTasks:emptyTasks,...options})(week);
  assert.equal((await read({})).dayPlanFallback,true);
  const emptyWeek=await read({env,fetchImpl:async url=>res(url.endsWith(DS)?schema:lf([]))});
  assert.equal(emptyWeek.source,'notion');
  assert.deepEqual(emptyWeek.days[today],[]);
  assert.notEqual(emptyWeek.dayPlanFallback,true);
  const connected=await read({readConnection:async()=>({rows:[]})});
  assert.equal(connected.source,'connection');
  assert.notEqual(connected.dayPlanFallback,true);
  assert.notEqual((await read({env:{}})).dayPlanFallback,true);
});

test('Notion day and past month honor section boundaries; check only a freshly read, user-enabled checkbox',async()=>{
  let checked=false,patches=0;
  const fetchImpl=async(url,r)=>{
    if(url.endsWith(DS))return res(schema);
    if(url.endsWith('/query'))return res(lf([page(P,'计划',today)]));
    if(url.includes('/children?'))return res(lf([
      block(uuid(5),'heading_2','今日计划'),block(uuid(6),'heading_3','下午'),block(B,'to_do','当日待办',{checked}),
      block(uuid(7),'heading_2','私人记录'),block(OUTSIDE,'to_do','不在计划中',{checked:false})]));
    assert.equal(r.method,'PATCH');assert.ok(url.endsWith('/'+B));patches++;
    checked=JSON.parse(r.body).to_do.checked;return res(block(B,'to_do','当日待办',{checked}));
  };
  const options={env,listTasks,fetchImpl},read=createPlanReader(options),change={date:today,id:B,expectedChecked:false,checked:true};
  const day=await read.readPlan(today);
  assert.equal(day.canCheck,false);assert.deepEqual(day.items.map(t=>t.title),['当日待办','本机任务']);
  assert.equal(day.source,'mixed');
  assert.equal((await read.readCalendar('2026-11',week)).days[today].count,2);
  await assert.rejects(read.checkPlanTask(change),{code:'PLAN_CHECK_PERMISSION'});
  const writable=createPlanReader({...options,env:{...env,DSH_WORKBENCH_NOTION_CHECKBOX_WRITE:'1'}});
  await assert.rejects(writable.checkPlanTask({...change,id:OUTSIDE}),{code:'PLAN_TASK_NOT_FOUND'});assert.equal(patches,0);
  assert.equal((await writable.checkPlanTask(change)).items[0].checked,true);
  await writable.checkPlanTask(change);assert.equal(patches,1);
  const failed=await createPlanReader({...options,fetchImpl:async()=>new Response('',{status:403})}).readPlan(today);
  assert.equal(failed.source,'profile');assert.match(failed.reason,/Notion/);
});

async function collectHome(t,home){
  const reader=createUsageReader({home,env:{}});t.after(()=>reader.close());
  const deadline=Date.now()+10000;
  do{
    const data=reader.read();
    if(data.state==='ready')return data;
    await new Promise(resolve=>setTimeout(resolve,20));
  }while(Date.now()<deadline);
  assert.fail('usage worker failed to return');
}
test('missing local ledgers yield unknown day totals and no quota',async t=>{
  const home=await mkdtemp(path.join(os.tmpdir(),'dsh-no-usage-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const result=await collectHome(t,home);
  assert.ok(result.day.sources.every(s=>s.total===null));assert.deepEqual(result.quotas,[]);
});
test('real temporary Harness and Codex ledgers count tokens and quota units without returning chat content',async t=>{
  const {DatabaseSync}=await import('node:sqlite');
  const home=await mkdtemp(path.join(os.tmpdir(),'dsh-local-usage-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const harness=path.join(home,'.dsh','sessions','workspace','session'),codex=path.join(home,'.codex');
  await Promise.all([mkdir(harness,{recursive:true}),mkdir(codex,{recursive:true})]);
  const at=Date.now(), stamp=new Date(at).toISOString();
  const log=[
    {type:'session',cwd:'/local/project',createdAt:at-1000},
    {type:'assistant/message',surfaceOp:'append',seq:1,time:at,data:{message:{id:'stable',content:'USER_CONTENT_MUST_NOT_LEAK',source:{model:'harness-model'}},usage:{outputTokens:10,totalTokens:50,cacheReadTokens:20}}}
  ];
  await writeFile(path.join(harness,'session.v4.jsonl.zstd'),zstdCompressSync(Buffer.from(log.map(v=>JSON.stringify(v)).join('\n')+'\n')));
  const rollout=path.join(codex,'rollout.jsonl'),state=new DatabaseSync(path.join(codex,'state_5.sqlite'));
  state.exec('CREATE TABLE threads(id TEXT, rollout_path TEXT,created_at_ms INTEGER)');
  state.prepare('INSERT INTO threads VALUES(?,?,?)').run('thread',rollout,at-2000);state.close();
  const rate={primary:{used_percent:16,window_minutes:300,resets_at:Math.floor(at/1000)+86400}};
  const msg={type:'event_msg',timestamp:stamp,payload:{type:'token_count',info:{total_token_usage:{total_tokens:17},last_token_usage:{input_tokens:13,output_tokens:4,cached_input_tokens:6}},rate_limits:rate}};
  await writeFile(rollout,[{type:'turn_context',timestamp:stamp,payload:{model:'codex-model'}},msg,msg].map(v=>JSON.stringify(v)).join('\n')+'\n');
  const hermes=path.join(home,'.hermes');await mkdir(hermes);
  const ledger=new DatabaseSync(path.join(hermes,'state.db'));
  ledger.exec('CREATE TABLE sessions(id TEXT,cwd TEXT,git_repo_root TEXT,parent_session_id TEXT); CREATE TABLE session_model_usage(session_id TEXT,model TEXT,billing_provider TEXT,billing_mode TEXT,task TEXT,input_tokens INTEGER,output_tokens INTEGER,cache_read_tokens INTEGER,cache_write_tokens INTEGER,api_call_count INTEGER,last_seen INTEGER)');
  ledger.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run('h','/tmp/project',null,null);
  ledger.prepare('INSERT INTO session_model_usage VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('h','hermes-model','fixture','fixture','fixture',6,2,3,1,1,at);ledger.close();
  const data=await collectHome(t,home);
  assert.equal(data.models.find(m=>m.name==='hermes-model').total,12);
  assert.ok(!data.day.sources.some(s=>s.source==='Hermes'));
  assert.equal(data.day.sources.find(s=>s.source==='Harness').total,50);
  assert.equal(data.day.sources.find(s=>s.source==='Codex').total,17);
  assert.equal(data.models.find(m=>m.name==='harness-model').cached,20);
  assert.equal(data.quotas[0].windows[0].remaining,84);
  assert.equal(data.quotas[0].windows[0].resetAt,new Date(rate.primary.resets_at*1000).toISOString());
  assert.ok(!JSON.stringify(data).includes('USER_CONTENT_MUST_NOT_LEAK'));
});

test('only opted-in reminders are sent, with fake transport, safe meeting links and persistent deduplication',async t=>{
  const home=await mkdtemp(path.join(os.tmpdir(),'dsh-calendar-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const at=Date.now(),file=path.join(home,'meetings.json'),start=at+200000;
  await writeFile(file,JSON.stringify({meetings:[{id:'fixture',start:new Date(start).toISOString(),url:'https://vc.feishu.cn/j/1234'}]}));
  const meetings=await readMeetings(file);assert.equal(meetings[0].start,start);
  let calls=0,state=initialNotificationState();
  const env={DSH_WORKBENCH_WEIXIN_ENABLED:'1',DSH_WORKBENCH_WEIXIN_TARGET:'weixin:test'};
  const send=createWeixinSender(env,async(bin,args,opts)=>{
    calls++;assert.equal(bin,'hermes');assert.equal(opts.shell,false);assert.match(args.at(-1),/https:\/\/vc.feishu.cn\/j\/1234/);return {stdout:'{"success":true}'};
  });
  const q=createNotificationQueue({now:()=>at,readState:async()=>state,writeState:async s=>{state=s;},send});
  await enqueueDueMeetings(q,meetings,at);await enqueueDueMeetings(q,meetings,at);await q.drain();await q.drain();
  const status=await q.status();assert.equal(calls,1);assert.equal(status.entries[0].state,'accepted');assert.ok(!JSON.stringify(status).includes('weixin:test'));
  await writeFile(file,JSON.stringify([{id:'invalid',start,url:'https://example.org/j/1234'}]));
  await assert.rejects(readMeetings(file));
});

test('selected Today Plan v1 file merges notes and groups with profile tasks, retaining distinct edit permissions',async t=>{
  const home=await mkdtemp(path.join(os.tmpdir(),'dsh-local-plan-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const file=path.join(home,'plans.json');
  const snapshot={format:'today-plan-local',version:1,tasks:[{id:'local-a',date:today,text:'已有安排',checked:true,group:'下午',note:'说明'}]};
  await writeFile(file,JSON.stringify(snapshot));
  const params={env:{DSH_WORKBENCH_LOCAL_PLAN_FILE:file},listTasks};
  const read=createPlanReader(params),plan=await read.readPlan(today);
  assert.equal(plan.items.length,2);
  assert.equal(plan.items.find(t=>t.source==='local').canCheck,false);
  assert.equal(plan.items.find(t=>t.source==='profile').canCheck,true);
  assert.equal(plan.groups.find(g=>g.title==='下午').items[0].children[0].text,'说明');
  assert.equal((await read.readCalendar('2026-11')).days[today].count,2);
  assert.equal((await createWeeklyPlanReader(params)(week)).days[today].length,2);
  assert.deepEqual(JSON.parse(await (await import('node:fs/promises')).readFile(file)),snapshot);
});
