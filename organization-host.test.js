import test from 'node:test';
import assert from 'node:assert/strict';
import {attachPersonalOrganization} from './organization-host.js';
import {createTasks} from './tasks.js';
import {planTool} from './plan-tools.js';

function setup({saved=new Map(),env={},platform='darwin',run=async()=>{throw Error('unexpected launch');}}={}){
  const registry=new Map();
  const ctx={tools:{register(tool){assert.ok(!registry.has(tool.name));registry.set(tool.name,tool);return ()=>{};}},
    effect(fn){fn();},storageDomain:{async open({name,global}){
      if(!saved.has(name))saved.set(name,global.schema.parse(global.initial));
      return {global:{get:()=>structuredClone(saved.get(name)),set:async value=>{saved.set(name,global.schema.parse(value));}},close:async()=>{}};
    }}};
  const tasks=createTasks({store:{read:async()=>structuredClone(saved.get('tasks')),
    write:async value=>{saved.set('tasks',structuredClone(value));return {ok:true};}}});
  ctx.tools.register(planTool(tasks));
  const organization=attachPersonalOrganization(ctx,tasks,{env,platform,run});
  return {organization,saved,registry};
}
test('dsh_personal_tasks and personal_plan manage one revision-controlled list with exact task links',async()=>{
  const {registry}=setup();
  assert.deepEqual([...registry.keys()],['personal_plan','dsh_personal_tasks','dsh_personal_organization']);
  const tasks=registry.get('dsh_personal_tasks'),plan=registry.get('personal_plan');
  const link={kind:'redflow-run',id:'00000000-0000-4000-8000-000000000001'};
  const task=await tasks.execute({action:'create',input:{title:'查看这条配图',priority:'normal',link}});
  assert.deepEqual((await plan.execute({action:'list'})).items[0].link,link);
  await plan.execute({action:'update',input:{id:task.id,expectedRevision:1,patch:{status:'waiting',link:null}}});
  assert.equal((await tasks.execute({action:'list',view:'waiting'})).items[0].link,null);
  await assert.rejects(tasks.execute({action:'archive',input:{id:task.id,expectedRevision:1}}));
});
test('organization is empty for a fresh profile and stores only its own project and references',async()=>{
  const {registry,organization,saved}=setup();
  assert.deepEqual((await organization.list()).projects,[]);
  const tool=registry.get('dsh_personal_organization');
  const project=await tool.execute({action:'createProject',input:{title:'准备工作展',area:'longterm',status:'active'}});
  const sourceRef={kind:'plan',id:'2026-11-19'};
  await tool.execute({action:'setItemMeta',input:{sourceRef,expectedRevision:0,patch:{projectId:project.id,intent:'review'}}});
  await tool.execute({action:'updateProject',input:{id:project.id,expectedRevision:1,patch:{goal:'提交成果'}}});
  await assert.rejects(tool.execute({action:'updateProject',input:{id:project.id,expectedRevision:1,patch:{goal:'过期'}}}));
  const restored=await setup({saved}).organization.list();
  assert.equal(restored.projects[0].goal,'提交成果');assert.deepEqual(restored.itemMeta[0].sourceRef,sourceRef);
  await tool.execute({action:'archiveProject',input:{id:project.id,expectedRevision:2}});
  assert.equal((await organization.list()).projects[0].archived,true);
});
test('Today Plan opens only a configured macOS native target and rejects injected arguments',async()=>{
  const calls=[],run=async(...args)=>{calls.push(args);};
  const {organization}=setup({env:{DSH_WORKBENCH_LOCAL_PLAN_FILE:'/example/plan.json'},run});
  assert.equal((await organization.list()).canOpenTodayPlan,true);
  await assert.rejects(organization.openTodayPlan({path:'/unexpected'}));assert.equal(calls.length,0);
  await Promise.all([organization.openTodayPlan({}),organization.openTodayPlan({})]);
  assert.equal(calls.length,1);assert.deepEqual(calls[0][1],['-b','com.mz.todayplan']);assert.equal(calls[0][2].shell,false);
  await assert.rejects(setup({env:{},run}).organization.openTodayPlan());
});
