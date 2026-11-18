import assert from 'node:assert/strict';
import test from 'node:test';
import {attachQuotaConnections} from './quota-connections.js';

function setup({getBalance,usage,stored}={}) {
  const client = {version:'0.2.2',locale:'zh-CN',timezoneOffsetSeconds:28800};
  let data = stored;
  let tool;
  let schema;
  const ctx = {
    inject(_deps, callback) {if (getBalance) callback({deepseekAccount:{getBalance},effect: fn=>fn()});},
    storageDomain:{async open({global}) {
      schema=global.schema;
      data ??= structuredClone(global.initial);
      return {global:{get:async()=>structuredClone(data),set:async v=>{data=schema.parse(v);}},close:async()=>{}};
    }},
    effect: fn=>fn(),tools:{register:entry=>{tool=entry;return ()=>{};}},
  };
  const service = attachQuotaConnections(ctx,{readUsage:()=>usage??{quotas:[]},clientInfo:()=>client});
  return {service,tool,stored:()=>structuredClone(data),client};
}
const wallet = (currency,balance) => ({currency,balance});
const harness = {provider:'harness'};

test('Harness is explicitly linked, forwards client metadata and filters private fields, separate wallets and currencies', async () => {
  const calls=[];
  const {service,stored,client} = setup({getBalance:async metadata => {
    calls.push(metadata);
    return {accountId:'private-id',status:'ready',value:[wallet('CNY','9.89'),wallet('USD','12.500')],
      bonusWallets:[wallet('CNY','0'),wallet('USD','0.025')]};
  }});
  assert.equal((await service.status()).canConnectHarness,true);
  assert.equal(calls.length,0);
  const linked = await service.connect(harness);
  assert.deepEqual(calls,[client]);
  assert.deepEqual(linked.accounts.map(a=>a.id),['codex','harness']);
  const account = linked.accounts[1];
  assert.deepEqual(account.entries,[
    {label:'充值余额',value:'9.89',unit:'CNY'},{label:'充值余额',value:'12.500',unit:'USD'},
    {label:'赠金',value:'0',unit:'CNY'},{label:'赠金',value:'0.025',unit:'USD'},
  ]);
  assert.equal(account.state,'ready');
  assert.ok(Number.isFinite(Date.parse(account.observedAt)));
  assert.ok(!JSON.stringify(account).includes('private-id'));
  assert.deepEqual(stored(),{harness:true,manual:[]});
  await service.disconnect({id:'harness'});
  await service.status();
  assert.equal(calls.length,1);
});

test('signed-out, empty, failed and malformed wallet responses never become a zero balance', async () => {
  let response=null;
  const {service}=setup({getBalance:async()=>response});
  assert.equal((await service.connect(harness)).accounts[1].state,'signed-out');
  for (const [value,state] of [
    [{status:'failed'},'unavailable'],[{status:'ready',value:[wallet('CNY','bad')],bonusWallets:[]},'unavailable'],
    [{status:'ready',value:[],bonusWallets:[]},'empty'],
  ]) {
    response=value;
    const account=(await service.status()).accounts[1];
    assert.deepEqual(account.entries,[]);
    assert.equal(account.state,state);
  }
  const noHost=setup().service;
  assert.equal((await noHost.status()).canConnectHarness,false);
  await assert.rejects(noHost.connect(harness),/宿主/);
});

test('simultaneous status reads share an in-flight query yet the next read observes a switched account', async () => {
  let release, calls=0;
  const {service}=setup({stored:{harness:true,manual:[]},getBalance:async()=>{
    calls++;
    return new Promise(resolve=>{release=resolve;});
  }});
  const ready=Promise.all([service.status(),service.status()]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1);
  release({status:'ready',value:[wallet('CNY','12')],bonusWallets:[]});
  assert.equal((await ready)[0].accounts[1].entries[0].value,'12');
  const switched=service.status();
  await new Promise(resolve=>setImmediate(resolve));
  release(null);
  assert.deepEqual((await switched).accounts[1].entries,[]);
});

test('assistant can create, list, edit and remove a labeled manual quota across sessions', async () => {
  const {tool,stored}=setup();
  const input={provider:'manual',label:'运营助手',unit:'token',value:200};
  const created=await tool.execute({action:'connect',input});
  const manual=created.accounts.find(a=>a.provider==='manual');
  assert.equal(tool.name,'personal_quota');
  assert.equal(manual.detail,'手动记录');
  assert.equal(manual.entries[0].value,200);
  assert.ok(Number.isFinite(Date.parse(manual.observedAt)));
  const reopened=setup({stored:stored()});
  const edited=await reopened.tool.execute({action:'connect',input:{...input,id:manual.id,unit:'%',value:35}});
  assert.equal(edited.accounts.filter(a=>a.provider==='manual').length,1);
  assert.deepEqual(edited.accounts[1].entries[0],{label:'剩余额度',value:35,unit:'%'});
  assert.deepEqual((await reopened.tool.execute({action:'list'})).accounts,edited.accounts);
  assert.equal((await reopened.tool.execute({action:'disconnect',input:{id:manual.id}})).accounts.length,1);
});

test('manual quotas validate values and units, bound source count under concurrent writes', async () => {
  const {service}=setup();
  const manual={provider:'manual',label:'编辑助手',value:0,unit:'次'};
  for (const patch of [
    {unit:'%',value:101},{unit:'次',value:0.5},{value:-1},{value:Infinity},{unit:'credits'},
    {value:'3'},{label:' '},{apiKey:'not-needed'}
  ]) await assert.rejects(service.connect({...manual,...patch}),{code:'QUOTA_CONNECTION'});
  await Promise.all(Array.from({length:12},(_,i)=>service.connect({...manual,label:'助手 '+i})));
  assert.equal((await service.status()).accounts.length,13);
  await assert.rejects(service.connect(manual),/12/);
  await assert.rejects(service.disconnect({id:'codex'}),/来源/);
});

test('automatic Codex only displays a valid unexpired window; stale or missing snapshots remain distinguishable', async () => {
  const resetAt=new Date(Date.now()+60000).toISOString();
  const observedAt=new Date().toISOString();
  const raw={provider:'Codex',observedAt,stale:true,windows:[
    {id:'primary',remaining:34.7,minutes:300,expired:false,resetAt},
    {id:'secondary',remaining:60,minutes:10080,resetAt:'2020-01-01T00:00:00Z',expired:false}
  ]};
  const {service}=setup({usage:{quotas:[raw]}});
  const codex=(await service.status()).accounts[0];
  assert.equal(codex.observedAt,observedAt);
  assert.equal(codex.state,'stale');
  assert.deepEqual(codex.entries,[{label:'5 小时额度',value:34.7,unit:'%',resetAt}]);
  assert.equal((await setup().service.status()).accounts[0].state,'empty');
});
