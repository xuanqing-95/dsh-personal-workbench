import path from 'node:path';
import {readdir,realpath} from 'node:fs/promises';
import {z} from 'zod';
import {dates} from './planning.js';
import {createExternalSources} from './automation-sources.js';

const schema=z.object({directory:z.string().nullable()}).strict();
const fail=message=>Object.assign(new Error(message),{code:'BRIEF_CONNECTION'});

export function attachBriefConnection(ctx){
  const envPath=process.env.DSH_WORKBENCH_BRIEF_DIR||'';
  const configured=path.isAbsolute(envPath)?envPath:null;
  const defaults=createExternalSources({briefDirectory:configured});
  let pending,activePath,activeReader,changes=Promise.resolve();
  function store(){
    if(!pending){
      const opening=ctx.storageDomain.open({name:'dsh_personal_workbench_brief_connection',version:1,tables:{},global:{schema,initial:{directory:null}}});
      pending=opening;
      opening.catch(()=>{if(pending===opening)pending=undefined;});
    }
    return pending;
  }
  ctx.effect(()=>async()=>{if(pending)await (await pending.catch(()=>null))?.close();});
  function change(action){const result=changes.then(action);changes=result.catch(()=>{});return result;}
  async function directory(){return configured||(await (await store()).global.get()).directory;}
  function summary(dir){return {provider:dir?'brief':null,detail:dir?path.basename(dir):'',managed:Boolean(configured),canPick:process.platform==='darwin'};}
  async function reader(){
    const dir=await directory();
    if(!dir||configured)return defaults;
    if(dir!==activePath){
      activeReader=createExternalSources({briefDirectory:dir});activePath=dir;
    }
    return activeReader;
  }
  async function connect(input){
    if(configured)throw fail('这个日报文件夹由 Harness 配置管理。');
    const selected=typeof input?.location==='string'?input.location.trim():'';
    if(!path.isAbsolute(selected)||selected.length>4096)throw fail('请选择本机的日报归档文件夹，或粘贴完整路径。');
    let dir,entries;
    try{dir=await realpath(selected);entries=await readdir(dir,{withFileTypes:true});}
    catch{throw fail('无法读取这个文件夹，请检查位置和读取权限。');}
    const visible=entries.filter(entry=>!entry.name.startsWith('.'));
    if(visible.length){
      const candidates=visible.filter(entry=>entry.isFile()).map(entry=>entry.name).filter(name=>name.endsWith('.json')&&dates.day(name.slice(0,-5))).sort().reverse();
      const probe=createExternalSources({briefDirectory:dir});
      let readable=false;
      for(const name of candidates.slice(0,366)){
        if(await probe.hasBriefIssue(name.slice(0,-5))){readable=true;break;}
      }
      if(!readable)throw fail('没有找到可读取的日报。请选择已有日报归档的文件夹，或选择空文件夹等待助手写入。');
    }
    await (await store()).global.set({directory:dir});
    return summary(dir);
  }
  async function disconnect(){
    if(configured)throw fail('这个日报文件夹由 Harness 配置管理。');
    await (await store()).global.set({directory:null});return summary(null);
  }
  return {
    status:async()=>summary(await directory()),connect:input=>change(()=>connect(input)),disconnect:()=>change(disconnect),
    external:{...defaults,
      readBrief:async()=>(await reader()).readBrief(),
      readBriefArchive:async date=>(await reader()).readBriefArchive(date),
      readBriefImage:async(...args)=>(await reader()).readBriefImage(...args)},
  };
}
