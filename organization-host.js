import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {z} from 'zod';
import {createOrganization,initialOrganization,organizationSchema} from './organization.js';
import {planTool} from './plan-tools.js';

const changes=['createProject','updateProject','archiveProject','setItemMeta'];
const nullableText={type:['string','null']};
const projectFields={title:{type:'string'},area:{enum:['software','longterm','routine']},
  status:{enum:['active','waiting','paused','done','review']},goal:nullableText,nextAction:nullableText,sourceLabel:nullableText,sourcePath:nullableText};
const sourceRef={type:'object',properties:{kind:{enum:['task','plan','automation']},id:{type:'string'}},required:['kind','id'],additionalProperties:false};
const metaFields={projectId:nullableText,focusDate:nullableText,intent:{enum:['build','update','review','other',null]},note:nullableText,
  executionRef:{type:['object','null'],properties:{source:{enum:['harness','hermes']},id:{type:'string'}},required:['source','id'],additionalProperties:false}};

export function attachPersonalOrganization(ctx,tasks,{env=process.env,platform=process.platform,run=promisify(execFile)}={}){
  let pending,opening;
  const canOpenTodayPlan=platform==='darwin'&&path.isAbsolute(env.DSH_WORKBENCH_LOCAL_PLAN_FILE||'');
  function domain(){
    return pending??=ctx.storageDomain.open({name:'dsh_personal_workbench_organization',version:1,tables:{},
      global:{initial:initialOrganization(),schema:organizationSchema(z)}}).catch(error=>{pending=undefined;throw error;});
  }
  const organization=createOrganization({store:{
    read:async()=>structuredClone((await domain()).global.get()),
    write:async value=>{await(await domain()).global.set(value);return {ok:true};}
  }});
  const list=async()=>({...await organization.list(),availability:'connected',canOpenTodayPlan});
  function change(action,input={}){
    if(action==='organization'||action==='list')return list();
    if(!changes.includes(action))throw new Error('未知的事务整理操作。');
    return organization[action](input);
  }
  async function openTodayPlan(input={}){
    if(!input||typeof input!=='object'||Array.isArray(input)||Reflect.ownKeys(input).length)throw new Error('打开今日计划不需要参数。');
    if(!canOpenTodayPlan)throw new Error('请先在 macOS 连接自己的今日计划文件。');
    if(!opening)opening=run('/usr/bin/open',['-b','com.mz.todayplan'],{shell:false,timeout:5000,maxBuffer:4096})
      .then(()=>({opened:true,application:'today-plan'}))
      .catch(()=>{throw new Error('无法打开今日计划，请确认电脑已安装该应用。');})
      .finally(()=>{opening=undefined;});
    return opening;
  }
  ctx.effect(()=>ctx.tools.register(planTool(tasks,'dsh_personal_tasks')));
  ctx.effect(()=>ctx.tools.register({
    name:'dsh_personal_organization',
    description:'整理自己的软件项目、长期目标和日常事务。可按来源关联已有任务、计划或自动化，记录目标、下一步和关注日期。写入前先读 organization 查看 revision。关联记录不会修改原任务或启动执行。项目开发对话入口使用 dsh_personal_project_shortcuts。',
    parameters:{type:'object',properties:{action:{enum:['organization',...changes]},input:{type:'object',properties:{
      ...projectFields,id:{type:'string'},expectedRevision:{type:'integer'},sourceRef,
      patch:{type:'object',properties:{...projectFields,...metaFields},additionalProperties:false}
    },additionalProperties:false}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    execute:args=>change(args.action,args.input),isConcurrencySafe:()=>false
  }));
  ctx.effect(()=>async()=>{if(pending)await(await pending.catch(()=>null))?.close();});
  return {list,change,openTodayPlan};
}
