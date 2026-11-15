import test from 'node:test';
import assert from 'node:assert/strict';
import {attachProjects} from './project-service.js';
import {createCodexThreadOpener} from './project-navigation.js';
const threadId='01a07634-8bc1-7f00-958a-d6a52a69b313';
test('agent creation, dashboard reading, legacy migration and reload share one durable project owner',async()=>{
 const saved=new Map(),tools=new Map();
 const ctx={effect:fn=>fn(),tools:{register:tool=>{tools.set(tool.name,tool);return()=>{};}},storageDomain:{open:async spec=>{
   if(!saved.has(spec.name))saved.set(spec.name,spec.global.schema.parse(structuredClone(spec.global.initial)));
   return {global:{get:()=>saved.get(spec.name),set:async value=>saved.set(spec.name,spec.global.schema.parse(value))},close:async()=>{}};
 }}};
 const options={resolveRepository:async()=>({repository:'demo/project',repositoryState:'linked'}),readGitHub:async()=>({pull:null,history:[{id:'commit:a',date:'2026-11-15T00:00:00Z',label:'真实提交',state:'代码已更新'}]})};
 const service=attachProjects(ctx,options);
 const record=await tools.get('personal_project_shortcuts').execute({action:'create',input:{title:'项目',threadId,source:'harness'}});
 const first=await service.read();assert.equal(first.shortcuts[0].id,record.id);assert.equal(first.shortcuts[0].github.value.history[0].label,'真实提交');
 await service.change({action:'import',items:[{id:threadId,title:'旧入口',source:'harness',threadId}]});
 assert.equal((await service.read()).shortcuts.length,1);
 const restored=attachProjects(ctx,options);assert.equal((await restored.read()).shortcuts[0].id,record.id);
 await assert.rejects(service.change({action:'remove',id:record.id,expectedRevision:99}),{code:'REVISION_CONFLICT'});
 assert.equal((await service.read()).shortcuts.length,1);
});
test('Codex navigation is an exact local chat destination and rejects arbitrary launch arguments',async()=>{
 const calls=[];const open=createCodexThreadOpener({platform:'darwin',run:async(...args)=>calls.push(args)});
 await assert.rejects(open({id:threadId,url:'https://other.test'}));assert.equal(calls.length,0);
 await open({id:threadId,hostId:'local'});assert.deepEqual(calls[0][1],['-b','com.openai.codex','codex://threads/'+threadId+'?hostId=local']);
});
