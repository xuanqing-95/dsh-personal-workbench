import test from 'node:test';
import assert from 'node:assert/strict';
import { probeServicePlan, readServicePlan } from './plan-service-connection.js';

const database = '11'.repeat(16), source = '22'.repeat(16), task = '33'.repeat(16);
const span = { start:'2026-11-17',end:'2026-11-18' };
const notion = {provider:'notion',location:'https://www.notion.so/Team-'+database+'?v='+task};
const feishu = {provider:'feishu',location:'https://team.feishu.cn/base/TEST1010?table=tblPlan&view=vewWork'};

function mockNotion(extra={}) {
  const calls = [];
  const headers = { 'Content-Type':'application/json' };
  const mapping = {
    ['/v1/databases/'+database]:{object:'database',id:database,data_sources:[{id:source}]},
    ['/v1/data_sources/'+source]:{object:'data_source',id:source,title:[{plain_text:'工作计划'}],properties:{Name:{type:'title'},日期:{type:'date'},状态:{type:'status',status:{groups:[{name:'Complete',option_ids:['delivered']}]}}}},
    ['/v1/data_sources/'+source+'/query']:{results:[{object:'page',id:task,parent:{data_source_id:source},properties:{Name:{type:'title',title:[{plain_text:'周报'}]},日期:{type:'date',date:{start:'2026-11-15',end:'2026-11-18'}},状态:{type:'status',status:{id:'delivered',name:'已交付'}}}}],has_more:false},
    ...extra
  };
  const fetchImpl = async (url,options) => {
    assert.equal(new URL(url).origin,'https://api.notion.com');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers.Authorization,'Bearer fake-test-only');
    const path = new URL(url).pathname;calls.push(path);
    return new Response(JSON.stringify(mapping[path] || {}),{status:mapping[path]?200:404,headers});
  };
  return { calls, options:{ env:{DSH_WORKBENCH_NOTION_TOKEN:'fake-test-only'},fetchImpl,now:()=>new Date('2026-11-17T12:00:00') } };
}

const fields = [{id:'fldN',name:'任务',type:'text'},{id:'fldD',name:'日期',type:'datetime'},{id:'fldS',name:'已完成',type:'checkbox'}];
function mockLark({schema=fields, pages, user=true, node={obj_type:'bitable',obj_token:'REAL1020',title:'我的表'}}={}) {
  const calls=[];
  const runLark = async args=>{
    calls.push(args);
    if(args[0]==='auth')return {identity:user?'user':'bot',identities:{user:{available:user}}};
    assert.ok(args.includes('--as') && args.includes('user'));
    const offset=Number(args[args.indexOf('--offset')+1]);
    const envelopes={
      '+node-get':node,
      '+field-list':{fields:schema,total:schema.length},
      '+record-list':pages?.[offset] || {fields:['已完成','日期','任务'],record_id_list:['rec1','rec2'],data:[[true,'2026-11-17 10:00:00','写周报'],[false,'2026-11-19','整理材料']],has_more:false}
    };
    assert.ok(Object.hasOwn(envelopes,args[1]));
    return {ok:true,identity:'user',data:envelopes[args[1]]};
  };
  return {calls,options:{runLark,now:()=>new Date('2026-11-17T12:00:00')}};
}

test('Notion resolves a copied database URL, disregards its view ID and preserves spanning/completed plans',async()=>{
  const {calls,options}=mockNotion();
  const result=await readServicePlan(notion,span,options);
  assert.deepEqual(calls,['/v1/databases/'+database,'/v1/data_sources/'+source,'/v1/data_sources/'+source+'/query']);
  assert.deepEqual(result.items.map(x=>[x.title,x.dueDate,x.status,x.canCheck]),[['周报',span.start,'done',false],['周报',span.end,'done',false]]);
  assert.equal(result.items[0].url,'https://www.notion.so/'+task);
  assert.deepEqual(await probeServicePlan(notion,options),{label:'工作计划',count:1});
});
test('Notion accepts direct source IDs and explicit local tokens and rejects ambiguous databases',async()=>{
  const {calls,options}=mockNotion();
  await readServicePlan({provider:'notion',url:source,token:'fake-test-only'},span,{...options,env:{}});
  assert.equal(calls[0],'/v1/data_sources/'+source);
  await assert.rejects(readServicePlan(notion,span,mockNotion({['/v1/databases/'+database]:{object:'database',id:database,data_sources:[{id:source},{id:task}]}}).options),/管理数据源/);
});
test('rejects invalid dates, untrusted links and credentials embedded in URLs before any network or CLI call',async()=>{
  const {calls,options}=mockNotion();
  for (const location of ['https://notion.so.example.com/'+database,'https://guest:user@notion.so/'+database,'http://www.notion.so/'+database])
    await assert.rejects(readServicePlan({...notion,location},span,options),/复制 Notion/);
  const lark = mockLark();
  for(const location of ['https://team.feishu.cn.evil.test/base/TEST1010?table=tblPlan',feishu.location.replace('tblPlan','--help')])
    await assert.rejects(readServicePlan({...feishu,location},span,lark.options),/复制带 table/);
  await assert.rejects(readServicePlan(notion,{start:span.end,end:span.start},options),/日期范围/);
  await assert.rejects(readServicePlan(notion,{start:'2026-10-01',end:'2027-01-01'},options),/日期范围/);
  assert.equal(calls.length+lark.calls.length,0);
});
test('Feishu respects the selected view, projects only required columns, and aligns matrix values by returned field names',async()=>{
  const {calls,options}=mockLark();
  const result=await readServicePlan(feishu,span,options);
  assert.deepEqual(calls[0],['auth','status']);
  assert.deepEqual(result.items.map(x=>[x.title,x.dueDate,x.status]),[['写周报',span.start,'done']]);
  assert.equal(result.items[0].canCheck,false);
  const record=calls.find(args=>args[1]==='+record-list');
  assert.equal(record[record.indexOf('--view-id')+1],'vewWork');
  assert.deepEqual(record.filter((v,i)=>record[i-1]==='--field-id'),['fldN','fldD','fldS']);
});
test('Feishu wiki resolves a Base only and bot-only accounts are rejected',async()=>{
  const cfg={...feishu,location:feishu.location.replace('/base/','/wiki/')};
  const {calls,options}=mockLark();
  assert.deepEqual(await probeServicePlan(cfg,options),{label:'我的表',count:1});
  assert.ok(calls.find(args=>args[1]==='+field-list').includes('REAL1020'));
  const blocked=mockLark({user:false});
  await assert.rejects(readServicePlan(feishu,span,blocked.options),/登录个人账号/);
  assert.equal(blocked.calls.length,1);
  await assert.rejects(readServicePlan(cfg,span,mockLark({node:{obj_type:'docx',obj_token:'TEST1020'}}).options),/多维表格/);
});
test('Feishu pages by returned count, supports schema by field ID and explicit date choice, reports ambiguous date fields',async()=>{
  const schema=[...fields,{id:'fld2',name:'复盘',type:'datetime'}];
  await assert.rejects(readServicePlan(feishu,span,mockLark({schema}).options),/日期列名/);
  const matrix={field_id_list:['fldN','fldD','fldS']};
  const pages={0:{...matrix,record_id_list:['rec1'],data:[['一',span.start,false]],has_more:true},1:{...matrix,record_id_list:['rec2'],data:[['二',span.end,true]],has_more:false}};
  const {calls,options}=mockLark({schema,pages});
  const res=await readServicePlan({...feishu,dateField:'日期'},span,options);
  assert.deepEqual(res.items.map(x=>x.title),['一','二']);
  assert.deepEqual(calls.filter(args=>args[1]==='+record-list').map(args=>args[args.indexOf('--offset')+1]),['0','1']);
});
test('Feishu never quietly reports success on incomplete matrices or incomplete pagination',async()=>{
  const bad={0:{record_id_list:['rec1'],fields:['名字'],data:[],has_more:false}};
  await assert.rejects(readServicePlan(feishu,span,mockLark({pages:bad}).options),/记录不完整/);
  const repeated={};
  for(let n=0;n<10;n++)repeated[n]={field_id_list:['fldN','fldD','fldS'],record_id_list:['rec'+n],data:[['一',span.start,false]],has_more:true};
  await assert.rejects(readServicePlan(feishu,span,mockLark({pages:repeated}).options),/读取上限/);
});
test('Notion understands a completion checkbox and an empty database counts as a successful connection',async()=>{
  const checkboxSchema={object:'data_source',id:source,properties:{标题:{type:'title'},日期:{type:'date'},已完成:{type:'checkbox'}}};
  const response={results:[{object:'page',id:task,parent:{data_source_id:source},properties:{标题:{type:'title',title:[{plain_text:'校对'}]},日期:{type:'date',date:{start:span.start}},已完成:{type:'checkbox',checkbox:true}}}],has_more:false};
  const config={provider:'notion',location:source};
  const {options}=mockNotion({['/v1/data_sources/'+source]:checkboxSchema,['/v1/data_sources/'+source+'/query']:response});
  assert.equal((await readServicePlan(config,span,options)).items[0].status,'done');
  const empty=mockNotion({['/v1/data_sources/'+source+'/query']:{results:[],has_more:false}});
  assert.equal((await probeServicePlan(config,empty.options)).count,0);
});
