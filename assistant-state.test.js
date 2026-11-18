import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
const sandbox={Date,URL,URLSearchParams,Intl,window:{__ModuleLoader__:{load:m=>m.factory(()=>({createElement(){}}))}}};
vm.runInNewContext(source.replace("return {inject:['slots'","globalThis.api={assistantOperations,assistantOverview,assistantTimeline,dailyFollowup,dailyJobFor,dailyDestination,attentionItems};return {inject:['slots'"),sandbox);
const {assistantOperations}=sandbox.api;
test('database polling cannot keep an abandoned task running',()=>{
 const now=Date.parse('2026-11-16T01:00:00Z');
 const monitor={availability:'connected',checkedAt:new Date(now).toISOString(),items:[{id:'old',status:'running',updated_at:'2026-11-10T00:00:00Z'}]};
 assert.equal(assistantOperations(monitor,'2026-11-16',now).operation[0].label,'状态待更新');
 monitor.items[0].heartbeat_at=new Date(now-1000).toISOString();
 assert.equal(assistantOperations(monitor,'2026-11-16',now).operation[0].state,'active');
 monitor.items[0].heartbeat_at=new Date(now+3600000).toISOString();
 assert.equal(assistantOperations(monitor,'2026-11-16',now).operation[0].state,'unknown');
});

test('old failure does not remain current; today failure and stale live flags remain visible',()=>{
 const now=Date.parse('2026-11-16T12:00:00Z'),today='2026-11-16';
 const items=[{id:'old',status:'error',updated_at:'2026-11-11T00:00:00Z'},{id:'invalid',status:'error',updated_at:'invalid'}];
 const monitor={availability:'connected',checkedAt:new Date(now).toISOString(),items};
 assert.equal(assistantOperations(monitor,today,now).operation.length,0);
 items.push({id:'new',status:'error',updated_at:new Date(now-1000).toISOString()});
 assert.equal(assistantOperations(monitor,today,now).operation[0].state,'failed');
});

test('content progress links to the active publication and keeps the earlier independent result',()=>{
  const now=Date.parse('2026-05-20T12:00:00Z'), at=new Date(now-1000).toISOString();
  const prior={key:'original:previous',contentKey:'original:previous',runId:'previous',title:'上一条文章',url:'https://example.org/posts/previous',deliveredAt:'2026-05-19T12:00:00Z'};
  const current={key:'original:current',contentKey:'original:current',runId:'text',title:'本次撰写的文章',url:'https://example.org/posts/current',progress:'文案已生成，尚未生成配图',deliveredAt:at};
  const monitor={availability:'connected',checkedAt:at,items:[{id:'text',status:'done',action_id:'xhs.original.text.generate',original_id:'current',updated_at:at}],results:[current,prior]};
  let operations=assistantOperations(monitor,'2026-05-20',now).operation;
  assert.equal(operations[0].label,'文案已生成');
  assert.equal(operations[0].contentURL,current.url);
  assert.match(operations[0].completedDetail,/本次撰写的文章.*尚未生成配图/);
  monitor.items.unshift({id:'image',status:'running',action_id:'xhs.original.image.generate',original_id:'current',started_at:at,updated_at:at});
  monitor.contexts=[{...current,runId:'image'}];
  operations=assistantOperations(monitor,'2026-05-20',now).operation;
  const timeline=sandbox.api.assistantTimeline(operations,{latest:current,results:[current,prior]},true);
  assert.equal(timeline.current.title,current.title);
  assert.equal(timeline.current.contentURL,current.url);
  assert.equal(timeline.current.label,'进行中');
  assert.equal(timeline.previous.key,prior.key);
});

test('the report card and attention menu agree on publication, delivery failures and schedule time zone',()=>{
  const {dailyJobFor,dailyFollowup,assistantOverview,attentionItems,dailyDestination}=sandbox.api;
  const now=Date.parse('2026-05-20T12:00:00Z');
  const localDay=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const unrelated={id:'other',source:'hermes',name:'备份任务',status:'error'};
  const job={id:'daily',source:'hermes',isDailyBrief:true,name:'日报助手',scheduleLabel:'每天 09:00、14:00',timeZone:'Asia/Tokyo'};
  const data={automations:{items:[unrelated,job]},brief:{date:localDay,availability:'connected',deliveryScope:'workbench',review:{date:localDay,title:'本地日报'}}};
  assert.equal(dailyJobFor(data),job);
  assert.equal(assistantOverview(data,null,now).daily.label,'已更新');
  assert.equal(attentionItems(data,null,now).length,0);
  assert.equal(dailyDestination(job,data.brief).briefDate,localDay);
  data.brief={...data.brief,submissionComplete:false,publicationComplete:true,readerVerified:true,channels:{wechat:'发送失败：发送通道暂时不可用'}};
  assert.equal(assistantOverview(data,null,now).daily.label,'已发布 · 分发异常');
  assert.equal(attentionItems(data,null,now)[0].status,assistantOverview(data,null,now).daily.label);
  data.brief.channels.wechat='已送达';data.brief.submissionComplete=true;
  assert.equal(assistantOverview(data,null,now).daily.label,'已发布');
  assert.equal(attentionItems(data,null,now).length,0);
  assert.equal(dailyFollowup(null,job,Date.parse('2026-05-20T00:04:00Z')),null);
  assert.equal(dailyFollowup(null,job,Date.parse('2026-05-20T00:06:00Z')).label,'今日未确认发布');
  assert.equal(dailyDestination({...job,hermesNavigation:true},data.brief).hermesDaily,job.id);
  assert.equal(dailyJobFor({automations:{items:[unrelated]}}),undefined);
});
