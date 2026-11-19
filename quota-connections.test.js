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
  assert.deepEqual(stored(),{harness:true});
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

test('older saved notes are not exposed as quota or erased by linking a real account',async()=>{
  const manual=[{id:'manual-abab0000-abab-4000-8000-000000000001',label:'旧记录',unit:'次',value:23,
    observedAt:'2026-11-18T11:00:00Z'}];
  const {tool,service,stored}=setup({stored:{harness:false,manual},getBalance:async()=>null});
  assert.deepEqual((await service.status()).accounts.map(row=>row.id),['codex']);
  const linked=await tool.execute({action:'connect',input:harness});
  assert.deepEqual(linked.accounts.map(row=>row.id),['codex','harness']);
  assert.equal(linked.accounts[1].state,'signed-out');
  assert.equal(JSON.stringify(await tool.execute({action:'list'})).includes('旧记录'),false);
  assert.deepEqual(stored(),{harness:true,manual});
  await tool.execute({action:'disconnect',input:{id:'harness'}});
  assert.deepEqual(stored(),{harness:false,manual});
});

test('the account tool and service reject invented balances and unsupported sources',async()=>{
  const {tool,service,stored}=setup({getBalance:async()=>null});
  const unsupported={provider:'manual',label:'用户输入',value:12,unit:'次'};
  await assert.rejects(service.connect(unsupported),{code:'QUOTA_CONNECTION'});
  await assert.rejects(tool.execute({action:'connect',input:unsupported}),{code:'QUOTA_CONNECTION'});
  await assert.rejects(service.connect({...harness,value:30}),{code:'QUOTA_CONNECTION'});
  await assert.rejects(service.disconnect({id:'codex'}),{code:'QUOTA_CONNECTION'});
  assert.deepEqual((await service.status()).accounts.map(row=>row.id),['codex']);
  assert.deepEqual(stored(),{harness:false});
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
