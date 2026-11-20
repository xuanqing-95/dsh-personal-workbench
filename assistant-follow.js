import {z} from 'zod';
import {isHarnessSession} from './request.js';

export const followedLimit=20;

export function attachAssistantFollowing(ctx){
  let opened,queue=Promise.resolve();
  const store=()=>opened??=ctx.storageDomain.open({
    name:'dsh_personal_workbench_followed_assistants',version:1,tables:{},
    global:{schema:z.object({ids:z.array(z.string().refine(isHarnessSession)).max(followedLimit)}).strict(),initial:{ids:[]}},
  }).catch(error=>{opened=undefined;throw error;});
  ctx.effect(()=>async()=>{if(opened)await (await opened.catch(()=>null))?.close();});
  async function list(){return (await (await store()).global.get()).ids;}
  function change(id,checked){
    if(!isHarnessSession(id))throw Error('请在要收录的 DeepSeek 助手会话中提出这个请求。');
    const update=queue.then(async()=>{
      const ids=await list();
      if(checked!==ids.includes(id)){
        if(checked&&ids.length>=followedLimit)throw Error('已收录 20 个助手，请先移除一个。');
        await (await store()).global.set({ids:checked?[...ids,id]:ids.filter(other=>other!==id)});
      }
      return {followed:checked};
    });
    queue=update.catch(()=>{});
    return update;
  }
  ctx.effect(()=>ctx.tools.register({
    name:'personal_workbench_assistant',
    description:'用户在当前 DeepSeek 助手的聊天里要求“把这个助手加入个人 AI 工作台”或移除时使用。仅收录或移除发起请求的会话，显示在「AI 助手任务进展」。',
    parameters:{type:'object',properties:{action:{type:'string',enum:['follow','unfollow']}},required:['action'],additionalProperties:false},
    output:{schema:{type:'object'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
    execute({action},exec){
      if(!['follow','unfollow'].includes(action))throw Error('请选择加入或移除助手。');
      return change(exec?.agent?.session?.id,action==='follow');
    },isConcurrencySafe:()=>false,
  }));
  return {list,change};
}
