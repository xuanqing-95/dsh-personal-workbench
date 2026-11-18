import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {basename} from 'node:path';
import {z} from 'zod';
import {todayLabel} from './planning.js';
import {nextDate} from './notion-api.js';
import {readFilePlan} from './plan-file-connection.js';
import {probeServicePlan,readServicePlan} from './plan-service-connection.js';

const providers={notion:'Notion',feishu:'飞书多维表格',obsidian:'Obsidian 日记',file:'本地计划文件'};
const inputSchema=z.object({provider:z.enum(['notion','feishu','obsidian','file']),location:z.string().trim().min(1).max(4096),token:z.string().trim().max(512).optional(),dateField:z.string().trim().max(128).optional()}).strict();
const savedSchema=z.object({config:inputSchema.nullable(),detail:z.string(),lastReadAt:z.string().nullable(),itemCount:z.number().int().nonnegative()});
const local=provider=>provider==='obsidian'||provider==='file';
const initial={config:null,detail:'',lastReadAt:null,itemCount:0};
const run=promisify(execFile);
const fail=message=>Object.assign(new Error(message),{code:'PLAN_CONNECTION'});
function safeMessage(error,fallback){
  const message=String(error?.message||'');
  return /^[\p{Script=Han}]/u.test(message)&&!/(?:https?:|[\\/]|secret_|ntn_)/i.test(message)&&message.length<240?message:fallback;
}
export async function pickPlanLocation(input){
  const provider=input?.provider;
  if(!local(provider))throw fail('请选择本地计划文件或日记文件夹。');
  if(process.platform!=='darwin')throw fail('请将本机文件或文件夹的完整路径粘贴到输入框。');
  const script=provider==='obsidian'?'POSIX path of (choose folder with prompt "选择存放每日日记的文件夹")':'POSIX path of (choose file with prompt "选择 Markdown 或 JSON 计划文件")';
  try{return {location:(await run('/usr/bin/osascript',['-e',script],{timeout:120000,maxBuffer:8192})).stdout.trim()};}
  catch(error){if(error.stderr?.includes('(-128)'))return {location:''};throw fail('文件选择窗口未完成，请粘贴完整路径。');}
}
export function attachPlanConnection(ctx){
  let opening,queue=Promise.resolve(),generation=0;
  const cache=new Map();
  function store(){
    if(!opening){
      opening=ctx.storageDomain.open({name:'dsh_personal_workbench_plan_connection',version:1,tables:{},global:{schema:savedSchema,initial}});
      opening.catch(()=>{opening=undefined;});
    }
    return opening;
  }
  ctx.effect(()=>async()=>{if(opening)await (await opening.catch(()=>null))?.close();});
  const serial=fn=>{const operation=queue.then(fn);queue=operation.catch(()=>{});return operation;};
  function summary(value){
    const provider=value.config?.provider||null;
    return {provider,label:providers[provider]||'',detail:value.detail,lastReadAt:value.lastReadAt,itemCount:value.itemCount,canPick:process.platform==='darwin',hasNotionToken:Boolean(process.env.DSH_WORKBENCH_NOTION_TOKEN)};
  }
  async function status(){return summary(await (await store()).global.get());}
  const options=config=>local(config.provider)?{provider:config.provider,path:config.location}:{provider:config.provider,url:config.location,token:config.token,dateField:config.dateField};
  async function connect(input){
    const parsed=inputSchema.safeParse(input);
    if(!parsed.success)throw fail('请选择计划来源，并填写链接或本机路径。');
    const config=parsed.data;
    if(config.provider!=='notion')delete config.token;
    if(local(config.provider))delete config.dateField;
    return serial(async()=>{
      let result;
      try{
        if(local(config.provider)){
          const day=todayLabel(),value=await readFilePlan(options(config),{start:nextDate(day,-7),end:nextDate(day,7)});
          result={label:basename(config.location),count:value.items.length};
        }else result=await probeServicePlan(options(config));
      }catch(error){throw fail(safeMessage(error,'连接失败，请检查所选来源和读取权限。'));}
      const value={config,detail:result.label||providers[config.provider],itemCount:result.count,lastReadAt:new Date().toISOString()};
      await (await store()).global.set(value);generation++;cache.clear();return summary(value);
    });
  }
  async function disconnect(){return serial(async()=>{await (await store()).global.set(initial);generation++;cache.clear();return summary(initial);});}
  async function read(start,end){
    const version=generation;
    const {config}=await (await store()).global.get();
    if(!config)return null;
    const key=version+'|'+start+'|'+end,found=cache.get(key);
    if(found&&found.until>Date.now())return found.value;
    const label=providers[config.provider];
    const value=(async()=>{
      try{
        const reader=local(config.provider)?readFilePlan:readServicePlan;
        const {items}=await reader(options(config),{start,end});
        return {label,rows:items.map(row=>({...row,source:'connection',canCheck:false,group:row.group||label})),issue:null};
      }catch(error){return {label,rows:[],issue:label+' 暂未同步。'+safeMessage(error,'请检查连接后重试。')};}
    })();
    if(cache.size>=60)cache.delete(cache.keys().next().value);
    cache.set(key,{until:Date.now()+15000,value});
    const result=await value;
    return version===generation?result:read(start,end);
  }
  return {status,connect,disconnect,read};
}
