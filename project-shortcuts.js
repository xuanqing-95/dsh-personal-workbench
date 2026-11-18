import path from 'node:path';
import {normalizeRepository} from './project-repository.js';
import {randomUUID} from 'node:crypto';

export function shortcutSchema(z) {
  const fields={chromeStore:z.object({publisherId:z.string().regex(/^[a-z0-9-]{1,100}$/i),itemId:z.string().regex(/^[a-p]{32}$/)}).strict().nullable().optional(),repository:z.string().transform(normalizeRepository).refine(Boolean,'请提供 GitHub 仓库地址').optional(),projectPath:z.string().max(2048).refine(v=>path.isAbsolute(v)&&!/[\u0000-\u001f]/.test(v),'项目目录须为绝对路径').optional(),title:z.string().trim().min(1).max(50),version:z.string().max(40).default(''),progress:z.string().max(120).default(''),source:z.enum(['codex','harness']),threadId:z.string().regex(/^(?:session-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).transform(v=>v.toLowerCase()),icon:z.enum(['app','code','design','writing']).default('app')};
  const association=value=>value.source==='harness'||!value.threadId.startsWith('session-');
  const record=z.object({...fields,id:z.string().uuid(),revision:z.number().int().positive()}).strict().refine(association,'Codex 对话需要原始 UUID');
  return {fields,association,record,state:z.object({items:z.array(record).max(100),retired:z.array(z.string().uuid()).max(2000)}).strict()};
}

// Both UI requests and the agent tool call this single serialized owner.
export function createProjectShortcuts({store,z,resolveRepository}) {
  const schema=shortcutSchema(z);let queue=Promise.resolve(),blocked=false;
  const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
  const serial=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
  async function commit(state){if(blocked)fail('WRITE_UNCERTAIN','上次保存结果不确定，请重启主控台后核对。');try{await store.write(state);}catch(error){blocked=true;throw error;}}
  return {
    async list(){await queue;return {...structuredClone(await store.read()),writeBlocked:blocked};},
    run(action,input){return serial(async()=>{
      const state=schema.state.parse(structuredClone(await store.read()));
      if(action==='import'){
        const items=z.array(z.object({...schema.fields,id:z.string().uuid()}).strict().refine(schema.association)).max(20).parse(input.items);
        let changed=false;
        for(const item of items){
          if(state.retired.includes(item.id)||state.items.some(row=>row.id===item.id||row.source===item.source&&row.threadId===item.threadId))continue;
          if(state.items.length>=100)fail('LIMIT','项目入口已满，旧入口仍保留在本机。');
          state.items.push({...item,revision:1});changed=true;
        }
        if(changed)await commit(state);
        return {...state,writeBlocked:blocked};
      }
      if(action==='create'){
        const fields=z.object(schema.fields).strict().refine(schema.association).parse(input);
        if(!fields.repository&&resolveRepository){
          const association=await resolveRepository(fields).catch(()=>null);
          if(association?.repository)fields.repository=association.repository;
          if(association?.projectPath)fields.projectPath=association.projectPath;
        }
        const sameConversation=state.items.find(row=>row.source===fields.source&&row.threadId===fields.threadId);
        const matching=fields.repository?state.items.filter(row=>(row.repository===fields.repository||!row.repository&&fields.projectPath&&row.projectPath===fields.projectPath)
          &&(!row.projectPath||!fields.projectPath||row.projectPath===fields.projectPath)):[];
        if(!sameConversation&&matching.length>1)fail('AMBIGUOUS_PROJECT','同一仓库有多个项目，请先查看列表并指定要继续的项目。');
        const existing=sameConversation||matching[0];
        if(existing){
          if(existing.repository&&fields.repository&&existing.repository!==fields.repository)fail('REPOSITORY_CONFLICT','该对话已关联其他仓库，请先核对项目并使用 update 修改。');
          const associationChanged=fields.repository&&!existing.repository||fields.repository===existing.repository&&(fields.threadId!==existing.threadId||fields.source!==existing.source);
          if(!associationChanged)return existing;
          const next={...existing,repository:fields.repository,source:fields.source,threadId:fields.threadId,revision:existing.revision+1,...(fields.projectPath?{projectPath:fields.projectPath}:{})};
          state.items=state.items.map(item=>item.id===existing.id?next:item);await commit(state);return next;
        }
        if(state.items.length>=100)fail('LIMIT','最多保存 100 个项目入口。');
        const row={...fields,id:randomUUID(),revision:1};state.items.push(row);await commit(state);return row;
      }
      const parsed=z.object({id:z.string().uuid(),expectedRevision:z.number().int().positive(),...(action==='update'?{patch:z.object(schema.fields).partial().strict()}: {})}).strict().parse(input);
      const row=state.items.find(item=>item.id===parsed.id);
      if(!row)fail('NOT_FOUND','项目入口不存在。');
      if(row.revision!==parsed.expectedRevision)fail('REVISION_CONFLICT','项目入口已更新，请刷新后重试。');
      if(action==='remove'){
        if(state.retired.length>=2000)fail('LIMIT','移除记录已满，请先联系维护。');
        state.items=state.items.filter(item=>item.id!==row.id);state.retired.push(row.id);await commit(state);return {removed:true,id:row.id};
      }
      if(action!=='update')fail('INVALID_INPUT','未知项目入口操作。');
      const next=schema.record.parse({...row,...parsed.patch,revision:row.revision+1});
      if(state.items.some(item=>item.id!==row.id&&item.source===next.source&&item.threadId===next.threadId))fail('DUPLICATE','该对话已有项目入口。');
      state.items=state.items.map(item=>item.id===row.id?next:item);await commit(state);return next;
    });},
    async drain(){await queue;}
  };
}
