import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createExternalSources} from './automation-sources.js';
import {createContent} from './content.js';

const today='2026-11-19', prior='2026-11-18', now=()=>new Date(today+'T12:00:00Z');
async function fixture(t){
  const home=await mkdtemp(path.join(os.tmpdir(),'workbench-evidence-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const dir=path.join(home,'issues');
  await mkdir(dir);
  const external=createExternalSources({home,env:{DSH_WORKBENCH_BRIEF_DIR:dir},now});
  let saved={editions:[],notes:{}};
  const content=createContent({external,now,read:async()=>structuredClone(saved),write:async value=>{saved=structuredClone(value);},projectExists:async id=>id==='test-project'});
  const issue=date=>writeFile(path.join(dir,date+'.json'),JSON.stringify({date,items:[['Headline '+date,'body','https://example.com/article','','summary']]}));
  const status=(date,fields)=>writeFile(path.join(dir,date+'.status.json'),JSON.stringify({date,...fields}));
  return {home,dir,external,content,issue,status};
}
test('a new draft never claims the previous edition or channel receipt',async t=>{
  const {content,issue,status}=await fixture(t);
  await issue(prior);await issue(today);
  await status(prior,{publication_complete:true,published_at:prior+'T06:00:00Z',verified_reader_url:'https://example.com/previous'});
  const brief=await content.readBrief();
  assert.equal(brief.date,today);
  assert.equal(brief.publicationComplete,false);
  assert.equal(brief.review,null);
  assert.equal(brief.previousReview.title,'Headline '+prior);
  assert.equal((await content.archive(today)).edition,null);
  assert.equal((await content.archive()).edition.date,prior);
  await status(today,{publication_complete:true,published_at:today+'T06:00:00Z',verified_reader_url:'https://example.com/current',wechat:'发送失败'});
  const updated=await content.readBrief();
  assert.equal(updated.publicationComplete,true);
  assert.equal(updated.review.url,'https://example.com/current');
  assert.equal(updated.channels.wechat,'发送失败');
  assert.equal(updated.submissionComplete,false);
});
test('a local tool delivery is distinct from confirmed external publication',async t=>{
  const {content}=await fixture(t);
  await content.change({action:'publish',expectedRevision:0,edition:{date:today,title:'个人日报',items:[{title:'今日头条',url:'https://example.com/source'}]}});
  const brief=await content.readBrief();
  assert.equal(brief.publicationComplete,false);
  assert.equal(brief.deliveryScope,'workbench');
  assert.equal(brief.review.title,'今日头条');
  assert.equal(brief.review.url,null);
  assert.equal((await content.archive(today)).edition.revision,1);
});
test('discovery uses this home, labels daily jobs explicitly and never returns a private prompt',async t=>{
  const {home}=await fixture(t);
  const cron=path.join(home,'.hermes','profiles','mine','cron');
  const codex=path.join(home,'.codex','automations','example');
  await Promise.all([mkdir(cron,{recursive:true}),mkdir(codex,{recursive:true})]);
  await writeFile(path.join(cron,'jobs.json'),JSON.stringify({jobs:[
    {id:'daily',name:'我的日报',schedule:{expr:'0 9,14 * * *'},next_run_at:'2026-11-20T01:00:00Z',prompt:'PRIVATE PROMPT'},
    {id:'other',name:'清理任务',enabled:false}
  ]}));
  await writeFile(path.join(codex,'automation.toml'),'id = "local"\nname = "每周整理"\nstatus = "ACTIVE"\nrrule = "FREQ=WEEKLY;BYDAY=MO;BYHOUR=12"\nprompt = "PRIVATE PROMPT"');
  const reader=createExternalSources({home,env:{},executions:async()=>[
    {id:'r1',job_id:'daily',status:'failed',error:'微信：发送失败。',finished_at:today+'T07:00:00Z'}
  ]});
  const {items}=await reader.readExternalAutomations();
  const daily=items.find(item=>item.sourceId==='daily');
  assert.equal(daily.isDailyBrief,true);assert.equal(daily.status,'failed');
  assert.equal(daily.scheduleLabel,'每天 09:00、14:00');assert.match(daily.lastRun.failure.channels.wechat,/失败/);
  assert.equal(items.find(item=>item.sourceId==='other').isDailyBrief,false);
  assert.equal(items.find(item=>item.source==='codex').status,'scheduled');
  assert.ok(!JSON.stringify(items).includes('PRIVATE PROMPT'));
});
test('external archive rejects linked outside files and ill-formed receipts',async t=>{
  const {dir,home,content,issue,status}=await fixture(t);
  await writeFile(path.join(home,'outside.json'),JSON.stringify({date:prior,items:[['Private issue']]}));
  await symlink(path.join(home,'outside.json'),path.join(dir,prior+'.json'));
  await issue(today);
  await status(today,{publication_complete:true,verified_reader_url:'https://example.com/untimed'});
  assert.equal((await content.readBrief()).publicationComplete,false);
  await status(today,{publication_complete:true,published_at:today+'T04:00:00Z',verified_reader_url:'https://u:p@example.com/private'});
  assert.equal((await content.archive()).edition,null);
});
test('project notes migrate once and preserve independent progress, requirements and stale revisions',async t=>{
  const {content}=await fixture(t);
  const row={id:'00000000-0000-4000-8000-000000000001',title:'初始需求',done:false,createdAt:0};
  await content.change({action:'saveNotes',projectId:'test-project',expectedRevision:0,requirements:[row]});
  const incoming={action:'import',notes:{'test-project':{progress:'开发中',requirements:[row]}}};
  const first=await content.changeProjectNotes(incoming);
  const twice=await content.changeProjectNotes(incoming);
  assert.equal(twice.notes['test-project'].revision,first.notes['test-project'].revision);
  await content.changeProjectNotes({action:'addRequirement',projectId:'test-project',expectedRevision:2,title:'第二条'});
  await assert.rejects(content.changeProjectNotes({action:'save',projectId:'test-project',expectedRevision:2,patch:{progress:'过期信息'}}));
  await content.change({action:'saveNotes',projectId:'test-project',expectedRevision:3,requirements:[row]});
  assert.equal((await content.projectNotes())['test-project'].progress,'开发中');
});
test('project appearance reads only the exact linked manifest and confines its icon to that directory',async t=>{
  const {readProjectAppearance}=await import('./project-repository.js');
  const {home,dir}=await fixture(t);
  const png=Buffer.from([137,80,78,71,13,10,26,10]);
  await writeFile(path.join(home,'outside.png'),png);
  await symlink(path.join(home,'outside.png'),path.join(dir,'icon.png'));
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({version:'1.2.3',icons:{'128':'icon.png'}}));
  assert.deepEqual(await readProjectAppearance(dir),{version:'1.2.3',versionLabel:'开发版本'});
  await writeFile(path.join(dir,'owned.png'),png);
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify({version:'1.3.0',icons:{'128':'owned.png'}}));
  const next=await readProjectAppearance(dir);
  assert.equal(next.version,'1.3.0');assert.match(next.icon,/^data:image\/png;base64,/);
});
test('Hermes can open only its connected daily job and the unique existing conversation',async t=>{
  const {home}=await fixture(t),profile=path.join(home,'.hermes','profiles','mine');
  await mkdir(path.join(profile,'cron'),{recursive:true});
  await writeFile(path.join(profile,'cron','jobs.json'),JSON.stringify({jobs:[{id:'mine',name:'日报'},{id:'other',name:'发布视频'}]}));
  await writeFile(path.join(profile,'state.db'),'fixture');
  const opened=[];let result='thread_1\n';
  const reader=createExternalSources({home,env:{},platform:'darwin',executions:async()=>[],run:async(cmd,args)=>{
    if(cmd.endsWith('sqlite3')){assert.ok(args.includes('-readonly'));assert.equal(args[1],path.join(profile,'state.db'));return {stdout:result};}
    assert.equal(cmd,'/usr/bin/open');opened.push(args);return {};
  }});
  const {items}=await reader.readExternalAutomations();
  await assert.rejects(reader.openHermesDaily({id:items[1].id}));assert.equal(opened.length,0);
  const [one,two]=await Promise.all([reader.openHermesDaily({id:items[0].id}),reader.openHermesDaily({id:items[0].id})]);
  assert.deepEqual(one,two);assert.deepEqual(opened,[['-a','Hermes','hermes://open/thread_1']]);
  result='thread_1\nthread_2\n';
  await assert.rejects(reader.openHermesDaily({id:items[0].id}));assert.equal(opened.length,1);
});
test('a runtime without node:sqlite reads only bounded execution metadata through the CLI',async t=>{
  const {readHermesExecutions}=await import('./automation-sources.js');
  const {dir}=await fixture(t);
  const db=path.join(dir,'executions.db');
  await writeFile(db,'test fixture');
  const row={job_id:'mine',id:'run-1',status:'completed'};
  const records=await readHermesExecutions(dir,{loadSQLite:async()=>{throw Error('unsupported runtime');},run:async(bin,args,opts)=>{
    assert.equal(bin,'sqlite3');assert.deepEqual(args.slice(0,3),['-readonly','-json',db]);assert.equal(opts.shell,false);
    assert.match(args[3],/FROM executions ORDER BY claimed_at DESC LIMIT 200$/);assert.ok(!args[3].includes('SELECT *'));
    return {stdout:JSON.stringify([row])};
  }});
  assert.deepEqual(records,[row]);
});
