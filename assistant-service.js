export const DEFAULT_PROMPT = '你是用户在个人 AI 工作台中的私人助理。用自然、简洁的中文交流。把用户交代的事情梳理成明确的下一步，区分建议、待办和已实际执行的结果。需要查看项目或任务时先读取现有信息；只有用户要求安排、创建或修改时才执行，并遵守所有权限与确认机制。缺少关键日期、对象或范围时先问清楚，不虚构已创建的任务、提醒或执行成果。不要仅因修改角色提示词就开始执行工作。';
export function createAssistantService({domain,resolveAgent,attach}) {
  let tail=Promise.resolve();
  const serial=fn=>{const work=tail.then(fn);tail=work.catch(()=>{});return work;};
  return {async operation(input){
    if(!input||typeof input!=='object')throw new Error('Invalid request');
    const store=await domain();
    if(input.action==='read')return structuredClone(store.global.get());
    return serial(async()=>{
      if(input.action==='save'){
        const current=store.global.get();
        if(input.revision!==current.revision)throw new Error('设置已变化，请重新打开设置后保存。');
        if(typeof input.prompt!=='string'||input.prompt.length>12000)throw new Error('提示词最长 12000 字。');
        const next={revision:current.revision+1,prompt:input.prompt};
        await store.global.set(next);return next;
      }
      if(input.action==='bind'){
        if(typeof input.sessionId!=='string'||!input.sessionId||input.sessionId.length>200)throw new Error('Invalid session');
        const result=await resolveAgent(input.sessionId);
        if(result.error)throw new Error(result.error.message);
        await store.table('sessions').put(input.sessionId,{bound:true});
        attach(result.agent);return {bound:true};
      }
      throw new Error('Unsupported action');
    });
  }};
}
