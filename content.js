import {z} from 'zod';
import {dates, todayLabel} from './planning.js';

const day = z.string().refine(dates.day);
const https = z.string().max(2048).refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Use an HTTPS URL without credentials');
const story = z.object({title:z.string().trim().min(1).max(180),summary:z.string().max(2000).default(''),url:https.optional()}).strict();
const edition = z.object({date:day,revision:z.number().int().positive(),title:z.string().trim().min(1).max(180),
  url:https.optional(),imageUrl:https.optional(),items:z.array(story).min(1).max(6),updatedAt:z.string().datetime()}).strict();
const note = z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(400),done:z.boolean(),createdAt:z.number().int()}).strict();
const notes = z.object({revision:z.number().int().positive(),requirements:z.array(note).max(100)}).strict();
export const contentSchema = z.object({editions:z.array(edition).max(366),notes:z.record(z.string().max(160),notes)}).strict();
export function createContent({read,write,projectExists,now=()=>new Date()}) {
  let tail=Promise.resolve(),blocked=false;
  async function snapshot(){return contentSchema.parse(await read());}
  const serial=fn=>{const job=tail.then(fn);tail=job.catch(()=>{});return job;};
  return {
    async archive(date) {
      if(date!==undefined&&!dates.day(date))throw new Error('日期无效');
      const today=todayLabel(now()),{editions}=await snapshot();
      const published=editions.filter(item=>item.date<=today).sort((a,b)=>b.date.localeCompare(a.date));
      const found=date?published.find(item=>item.date===date):published[0];
      return {today,dates:published.map(item=>item.date),edition:found||null};
    },
    async projectNotes(){return (await snapshot()).notes;},
    async export(){return snapshot();},
    change(input) { return serial(async()=>{
      if(blocked)throw new Error('上次保存结果待核对，请重新加载插件后再操作，避免重复记录。');
      const state=await snapshot();let result;
      if(input?.action==='publish'){
        const value=z.object({action:z.literal('publish'),expectedRevision:z.number().int().min(0),
          edition:edition.omit({revision:true,updatedAt:true})}).strict().parse(input);
        if(value.edition.date>todayLabel(now()))throw new Error('未来日期不能标记为已发布。');
        const previous=state.editions.find(item=>item.date===value.edition.date);
        if((previous?.revision||0)!==value.expectedRevision)throw new Error('这期日报已有变化，请先读取最新版本。');
        result={...value.edition,revision:value.expectedRevision+1,updatedAt:now().toISOString()};
        state.editions=state.editions.filter(item=>item.date!==result.date).concat(result);
      }else if(input?.action==='saveNotes'){
        const value=z.object({action:z.literal('saveNotes'),projectId:z.string().min(1).max(160),
          expectedRevision:z.number().int().min(0),requirements:z.array(note).max(100)}).strict().parse(input);
        if(!await projectExists(value.projectId))throw new Error('项目不存在，请先收录项目。');
        if((state.notes[value.projectId]?.revision||0)!==value.expectedRevision)throw new Error('项目记录已有变化，请先读取最新内容。');
        if(new Set(value.requirements.map(item=>item.id)).size!==value.requirements.length)throw new Error('记录编号不能重复。');
        result={revision:value.expectedRevision+1,requirements:value.requirements};
        state.notes[value.projectId]=result;
      }else throw new Error('未知内容操作');
      contentSchema.parse(state);
      try{await write(state);}catch{blocked=true;throw new Error('保存结果尚未确认，请先重新读取，不要重复提交。');}
      return result;
    });}
  };
}

export function attachContent(ctx,projects){
  let pending;
  const store=()=>pending||=(ctx.storageDomain.open({name:'dsh_personal_workbench_content',version:1,tables:{},
    global:{schema:contentSchema,initial:{editions:[],notes:{}}}}).catch(error=>{pending=undefined;throw error;}));
  const service=createContent({read:async()=>(await store()).global.get(),write:async value=>(await store()).global.set(value),
    projectExists:async id=>(await projects.read()).shortcuts.some(item=>item.id===id)});
  ctx.effect(()=>async()=>{if(pending)await(await pending.catch(()=>null))?.close();});
  ctx.effect(()=>ctx.tools.register({
    name:'personal_daily_brief',description:'读取或保存当前用户自己的每日 AI 日报。publish 只在用户要求将已完成的日报放到主控台时调用，不负责搜索或定时制作。先 read 相同日期取得 revision（没有时用 0）。items 第一条为头条，其余最多五条简讯；引用可信原文，不编造新闻、图片和链接。图片仅接受可公开读取的 HTTPS 地址，不上传本地文件。定时制作请使用 Harness 自身的定时任务，并在其任务说明中调用本工具交付。',
    parameters:{type:'object',properties:{action:{enum:['read','publish']},date:{type:'string'},expectedRevision:{type:'integer',minimum:0},
      edition:{type:'object',properties:{date:{type:'string'},title:{type:'string'},url:{type:'string'},imageUrl:{type:'string'},items:{type:'array',minItems:1,maxItems:6,items:{type:'object',properties:{title:{type:'string'},summary:{type:'string'},url:{type:'string'}},required:['title'],additionalProperties:false}}},required:['date','title','items'],additionalProperties:false}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    execute:args=>args.action==='read'?service.archive(args.date):service.change({action:args.action,expectedRevision:args.expectedRevision,edition:args.edition}),isConcurrencySafe:()=>false
  }));
  ctx.effect(()=>ctx.tools.register({
    name:'personal_project_notes',description:'通过聊天为主控台的项目记录需求。先 list 取得项目 ID 与记录 revision。save 需要完整保留未被用户要求修改的记录，每条包含 uuid、title、done、createdAt。不要把想法标为已完成或自动开始开发。没有记录的项目不显示空的记录区。',
    parameters:{type:'object',properties:{action:{enum:['list','save']},projectId:{type:'string'},expectedRevision:{type:'integer',minimum:0},requirements:{type:'array',maxItems:100,items:{type:'object',properties:{id:{type:'string'},title:{type:'string'},done:{type:'boolean'},createdAt:{type:'integer'}},required:['id','title','done','createdAt'],additionalProperties:false}}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    execute:async args=>args.action==='list'?{projects:(await projects.read()).shortcuts,notes:await service.projectNotes()}:
      service.change({action:'saveNotes',projectId:args.projectId,expectedRevision:args.expectedRevision,requirements:args.requirements}),isConcurrencySafe:()=>false
  }));
  return service;
}
