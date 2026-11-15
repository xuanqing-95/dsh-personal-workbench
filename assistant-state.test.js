import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./client.js',import.meta.url),'utf8');
const sandbox={Date,URL,URLSearchParams,Intl,window:{__ModuleLoader__:{load:m=>m.factory(()=>({createElement(){}}))}}};
vm.runInNewContext(source.replace("return {inject:['slots'","globalThis.api={assistantOperations};return {inject:['slots'"),sandbox);
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
